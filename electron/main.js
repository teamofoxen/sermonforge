const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { randomUUID } = require("crypto");
const { isDev, paths, legacyDbPaths, devServerUrl } = require("./config");
const { logInfo, logError, readRecent } = require("./logger");
const {
  STAGE, STAGE_SEQUENCE,
  STEP, STEP_CANONICAL_SEQUENCE,
  SUB_PHASE, SUB_PHASE_CANONICAL_SEQUENCE,
  SERMON_STATUS, SERIES_STATUS,
  MUTATION_KIND,
  SERMON_COLUMNS, SERIES_COLUMNS, SECTION_COLUMNS,
  STRUCTURED_FIELDS,
  ContractViolation,
} = require("./contracts.cjs");
let _isQuitting = false;

// Catch anything that slips through before app ready
process.on("uncaughtException", (err) => {
  logError("uncaughtException", err);
  if (isDev) throw err;
});
process.on("unhandledRejection", (reason) => {
  logError("unhandledRejection", reason instanceof Error ? reason : new Error(String(reason)));
});

require("dotenv").config({ path: paths.env, override: true });

const { registerAIHandlers } = require("./ai");
const { saveKeys, loadEsvKey, isConfigured } = require("./keystore");
const { resetClient } = require("./ai/provider");
const { initUpdater } = require("./updater");
const BetterSqlite3 = require("better-sqlite3");
const sqliteVec = require("sqlite-vec");

let db = null;
let dbPath = null;
let SQL = null;          // sql.js constructor — used for main sermonforge.db
let theologyDb = null;   // better-sqlite3 instance for theology.db (+ sqlite-vec)
let mainWindow;
let saveTimer = null;
let _pendingWrite = false; // true between saveDb() and the debounce flush; used for crash-window warn
let _flushFailureCount = 0; // consecutive flushDb failures; banner fires at >= 2 to avoid noise on a single transient lock
let _firstLaunch = false;  // true when sermonforge.db did not exist at initDatabase entry; drives the first-run OneDrive modal
let _pendingStartupWarning = null; // set in maybeWarnOneDrive; renderer fetches via app-get-startup-warning on mount

const { migrateLegacyDb } = require("./dbMigration");

// ── Database setup ──────────────────────────────────────────────────────────
async function initDatabase() {
  const initSqlJs = require("sql.js");
  SQL = await initSqlJs({ locateFile: paths.sqlWasm });

  const dataDir = paths.userData;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, "sermonforge.db");
  const bakPath = dbPath + ".bak";
  _firstLaunch = !fs.existsSync(dbPath);

  // Try the main DB first. If it's corrupt, fall back to the .bak written by
  // the previous successful flushDb. If .bak is also bad, rename the corrupt
  // original to <dbPath>.corrupt-<ts> (so manual recovery is possible) and
  // start fresh — never silently overwrite a damaged DB.
  //
  // IMPORTANT: `new SQL.Database(buf)` does NOT throw on a structurally-corrupt
  // page-level damaged file — it accepts the buffer and only throws when a
  // query touches the bad pages. The exec() probe below forces that detection
  // up front. Without it, a corrupt primary appears to load, queries fail at
  // runtime, the app limps along with broken state, and the next saveDb writes
  // serialized garbage on top of the previously-good `.bak` rotation chain.
  function tryLoad(p) {
    const buf = fs.readFileSync(p);
    const candidate = new SQL.Database(buf);
    // Read sqlite_master — works on fresh empty DBs (no rows) and any healthy
    // SQLite. Throws on page-level corruption that `new SQL.Database` misses.
    candidate.exec("SELECT name FROM sqlite_master LIMIT 1");
    return candidate;
  }

  // Counts content rows (sermons + series). Drives the legacy-migration
  // trigger below: a row-less DB at the active path means the user's real
  // library is sitting at a prior install location, so we look there before
  // letting them launch into an empty workspace. Fail-soft when tables don't
  // exist (older schemas, unrecognized SQLite files) — treats those as 0.
  function countContentRows(handle) {
    if (!handle) return 0;
    let total = 0;
    try {
      const r = handle.exec("SELECT COUNT(*) FROM sermons");
      total += Number(r[0]?.values?.[0]?.[0] ?? 0);
    } catch { /* table missing — treat as 0 */ }
    try {
      const r = handle.exec("SELECT COUNT(*) FROM series");
      total += Number(r[0]?.values?.[0]?.[0] ?? 0);
    } catch { /* table missing — treat as 0 */ }
    return total;
  }

  // ── Phase 1 — establish a working `db` handle ────────────────────────────
  // No migration logic here; this section only decides whether we have a
  // primary, fall back to a `.bak`, quarantine a corrupt file, or bootstrap
  // an empty in-memory DB. Migration runs in Phase 2 against whatever
  // emerges, so the corrupt-then-empty path also gets a recovery shot.
  if (fs.existsSync(dbPath)) {
    try {
      db = tryLoad(dbPath);
    } catch (primaryErr) {
      logError(`[DB] primary DB unreadable at ${dbPath}; trying .bak`, primaryErr);
      if (fs.existsSync(bakPath)) {
        try {
          db = tryLoad(bakPath);
          logInfo(`[DB] loaded backup from ${bakPath} after primary corruption`);
        } catch (bakErr) {
          logError(`[DB] .bak also unreadable; preserving corrupt original`, bakErr);
          db = null;
        }
      }
      if (!db) {
        // Quarantine the corrupt original so the next flushDb does not overwrite it.
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const quarantine = `${dbPath}.corrupt-${stamp}`;
        try {
          fs.renameSync(dbPath, quarantine);
          logError(`[DB] quarantined corrupt DB to ${quarantine}`, primaryErr);
        } catch (renameErr) {
          logError(`[DB] failed to quarantine corrupt DB`, renameErr);
        }
        db = new SQL.Database();
      }
    }
  } else if (fs.existsSync(bakPath)) {
    // Edge case: primary missing but backup present (a crash between rename steps).
    try {
      db = tryLoad(bakPath);
      logInfo(`[DB] loaded backup; primary missing`);
    } catch (e) {
      logError(`[DB] backup unreadable, starting fresh`, e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // ── Phase 2 — content-aware legacy migration ─────────────────────────────
  // The Phase-1 db has 0 content rows iff: the active path is missing
  // (fresh-install at a new userData location), OR exists but is just an
  // empty schema (a prior empty initialization at the new path — exactly the
  // 2026-05-02 incident), OR fell through corrupt-fallback to a fresh
  // `new SQL.Database()`. In all three cases, the user's real library may
  // be sitting at a prior install location; walk `legacyDbPaths` and pick
  // the candidate with the most content rows (mtime breaks ties).
  //
  // We back up whatever's currently at the active path BEFORE the resolver
  // copies a winner over it. The legacy source file itself is preserved
  // (the resolver does copy, not move) so there are always at least two
  // recovery paths if the migration turned out to be undesired.
  //
  // Forbidding this layer is a CORE.md violation; see "The userData path is
  // permanent."
  if (countContentRows(db) === 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(dbPath, `${dbPath}.precovery-empty-${stamp}`);
        logInfo(`[DB] backed up row-empty active DB to ${dbPath}.precovery-empty-${stamp}`);
      } catch (e) {
        logError(`[DB] failed to back up empty active DB before migration`, e);
      }
    }
    if (fs.existsSync(bakPath)) {
      try {
        fs.copyFileSync(bakPath, `${bakPath}.precovery-empty-${stamp}`);
      } catch (e) {
        logError(`[DB] failed to back up empty active .bak before migration`, e);
      }
    }
    const migrated = migrateLegacyDb({
      activePath: dbPath,
      candidatePaths: legacyDbPaths,
      tryLoad,
      countRows: countContentRows,
      logger: { info: logInfo, error: logError },
    });
    if (migrated) {
      try { db.close(); } catch { /* ignore */ }
      db = migrated.db;
      _pendingStartupWarning = {
        kind: "db_migrated",
        message: `Restored your library from a previous install location (${migrated.source}). The original file is preserved there as a backup.`,
      };
    }
  }

  // Bootstrap-only schema. All subsequent schema changes MUST go through
  // runMigrations() below — do not add or alter tables in this block.
  db.run(`
    CREATE TABLE IF NOT EXISTS series (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      color TEXT DEFAULT 'gold',
      description TEXT DEFAULT '',
      year INTEGER DEFAULT 2024,
      big_idea TEXT DEFAULT '',
      overview TEXT DEFAULT '',
      passage_range TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      structural_outline TEXT DEFAULT '',
      status TEXT DEFAULT 'planning',
      canon_category TEXT DEFAULT '',
      redemptive_context TEXT DEFAULT '',
      book_background TEXT DEFAULT '',
      book_argument TEXT DEFAULT '',
      book_structure TEXT DEFAULT '',
      series_motivation TEXT DEFAULT '',
      emerging_big_idea TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sermons (
      id TEXT PRIMARY KEY,
      series_id TEXT,
      title TEXT NOT NULL,
      passage TEXT DEFAULT '',
      date TEXT DEFAULT '',
      preacher TEXT DEFAULT '',
      stage TEXT DEFAULT 'planning',
      big_idea TEXT DEFAULT '',
      mpt TEXT DEFAULT '',
      mps TEXT DEFAULT '',
      observations TEXT DEFAULT '',
      interpretation TEXT DEFAULT '',
      redemptive_thread TEXT DEFAULT '',
      implications TEXT DEFAULT '',
      outline TEXT DEFAULT '[]',
      manuscript TEXT DEFAULT '',
      delivery_notes TEXT DEFAULT '',
      timing_notes TEXT DEFAULT '',
      post_sermon TEXT DEFAULT '',
      functional_elements TEXT DEFAULT '{}',
      checklist TEXT DEFAULT '{}',
      section_id TEXT DEFAULT NULL,
      is_one_off INTEGER DEFAULT 0,
      topic_theme TEXT DEFAULT '',
      audience_assumptions TEXT DEFAULT '',
      background_noise TEXT DEFAULT '',
      study_guide_note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS series_sections (
      id TEXT PRIMARY KEY,
      series_id TEXT NOT NULL,
      title TEXT DEFAULT '',
      passage_range TEXT DEFAULT '',
      big_idea TEXT DEFAULT '',
      overview TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calendar_notes (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT DEFAULT 'special',
      label TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

  `);

  runMigrations();

  // Schema contract guard — runs after migrations + FTS setup. Logs only.
  // See assertSchemaContract() below for rationale.
  try { assertSchemaContract(); } catch (e) { logError("[DB] assertSchemaContract threw", e); }

  saveDb();
}

// flushDb is serialized via _flushQueue. The previous implementation could
// re-enter when saveDb's setTimeout fired again before the in-flight flush had
// finished writing — both calls would race on `<dbPath>.tmp` (truncate-then-
// write under both), interleaving bytes and producing a malformed file that
// the rotation then promoted into `dbPath`. Chaining each call onto the queue
// guarantees a single in-flight writer and atomic rotation per call.
let _flushQueue = Promise.resolve({ ok: true });
function flushDb() {
  const next = _flushQueue.then(() => _flushDbImpl());
  // Swallow errors on the chain so one failed flush does not poison every
  // subsequent flush with a rejected predecessor. Each call still gets its
  // own resolved/rejected promise back via `next`.
  _flushQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function _flushDbImpl() {
  if (!db || !dbPath) return { ok: true, skipped: true };
  // If _pendingWrite is still true here, flushDb was called externally (e.g. quit handler)
  // while a debounced write was still queued. The 500ms crash window was open.
  if (isDev && _pendingWrite) {
    console.warn("[DB] flushDb: called with a pending write still queued — the 500ms crash window was open. This is expected on app quit; unexpected mid-session.");
  }
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  // Atomic write with backup preservation:
  //   1. Serialize sql.js to an in-memory buffer.
  //   2. Write to <dbPath>.tmp.
  //   3. Rename existing <dbPath> -> <dbPath>.bak (only if it exists and is non-empty).
  //   4. Rename <dbPath>.tmp -> <dbPath>.
  // A crash mid-step never produces a truncated <dbPath>: either the rename has
  // not happened yet (real DB intact) or it has (.tmp is the new real DB).
  // .bak survives one bad write — initDatabase falls back to it on next launch.
  const tmpPath = dbPath + ".tmp";
  const bakPath = dbPath + ".bak";
  try {
    const data = db.export();
    await fs.promises.writeFile(tmpPath, Buffer.from(data));

    // Promote old DB to .bak (best-effort; missing original on first save is OK).
    try {
      const stat = await fs.promises.stat(dbPath);
      if (stat.size > 0) {
        await fs.promises.rename(dbPath, bakPath);
      }
    } catch (e) {
      if (e.code !== "ENOENT") throw e; // a missing original is fine; anything else is real
    }

    await fs.promises.rename(tmpPath, dbPath);

    _pendingWrite = false;
    if (_flushFailureCount > 0) {
      _flushFailureCount = 0;
      mainWindow?.webContents?.send("db-write-ok");
    }
    return { ok: true };
  } catch (e) {
    _flushFailureCount += 1;
    console.error("Failed to save DB:", e.message);
    logError("[DB] flush failed", e);
    // Best-effort cleanup of orphan .tmp so it doesn't shadow future writes.
    try { await fs.promises.unlink(tmpPath); } catch (_) {}
    // Only emit the user-visible signal after two consecutive failures so a single
    // transient OneDrive/AV lock doesn't pop a banner that auto-recovers on the next
    // debounced write. The first failure still appears in app.log via logError above.
    if (_flushFailureCount >= 2) {
      mainWindow?.webContents?.send("db-write-error", e.message);
    }
    return { ok: false, error: e.message };
  }
}

function saveDb() {
  // ACCEPTED RISK: 500ms crash window. Any mutation between saveDb() and the
  // debounce firing could be lost if the process terminates in this window.
  // Acceptable for a single-user desktop app with local storage.
  _pendingWrite = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    _pendingWrite = false; // cleared before flush so flushDb's external-call check is correct
    await flushDb();
  }, 500);
}

// ── Lazy theology loader (better-sqlite3 + sqlite-vec) ──────────────────────
// theology.db is managed exclusively by better-sqlite3 due to sqlite-vec dependency.
// DO NOT access via sql.js.
let theologyVecAvailable = false;  // true when theology_vec table has embeddings
const embedderHost = require("./embedder/host"); // worker-backed by default (electron/embedder/host.js); kill-switch via SF_EMBED_WORKER=0

async function ensureTheologyDbLoaded() {
  if (theologyDb) return;
  if (!dbPath) return;
  const theologyDbFile = path.join(path.dirname(dbPath), "theology.db");
  console.log(`[THEOLOGY DB] Path resolved: ${theologyDbFile}`);
  if (!fs.existsSync(theologyDbFile)) {
    console.error(`[THEOLOGY DB] Missing at expected path: ${theologyDbFile}`);
    return;
  }
  try {
    theologyDb = new BetterSqlite3(theologyDbFile, { readonly: true });
    console.log("[THEOLOGY DB] Loaded successfully");
    try {
      sqliteVec.load(theologyDb);
      console.log("[VECTOR] sqlite-vec extension loaded");
    } catch (vecErr) {
      console.error(`[VECTOR] Failed to load sqlite-vec: ${vecErr.message}`);
      // theologyDb is open but vec queries will fail — FTS-only path will still work
    }
    // Check if vector embeddings have been built
    try {
      const { cnt } = theologyDb.prepare("SELECT COUNT(*) as cnt FROM theology_vec").get();
      console.log(`[VECTOR] Embeddings available: ${cnt}`);
      if (cnt > 0) {
        theologyVecAvailable = true;
      } else {
        console.warn("[VECTOR] No embeddings found — vector search disabled");
        theologyVecAvailable = false;
      }
    } catch (e) {
      console.warn("[VECTOR] theology_vec probe failed:", e.message);
      theologyVecAvailable = false;
    }
    console.log(`Theology DB loaded (better-sqlite3 + sqlite-vec, vectors: ${theologyVecAvailable})`);
  } catch (e) {
    console.error("Failed to load theology DB:", e.message);
  }
}

// Embed a single text into a 384-dim vector. Returns the array, or null on failure.
// Delegates to embedder/host.js, which dispatches to a worker_thread by default
// (Phase 6) and to a main-thread pipeline when SF_EMBED_WORKER=0.
async function embedText(text) {
  try {
    return await embedderHost.embedText(text);
  } catch (e) {
    console.error("[VECTOR] embedText failed:", e.message);
    return null;
  }
}

// ── Schema migrations ────────────────────────────────────────────────────────
// safeAlter wraps `ALTER TABLE ... ADD COLUMN` so we distinguish "column already
// exists" (benign — re-running an earlier migration) from real errors (locked DB,
// disk full, syntax error). The previous `try { ... } catch (_) {}` pattern
// swallowed everything, which let migration blocks bump schema_version even when
// the ALTER had failed for a real reason — the column was permanently missing
// while runMigrations() believed it had succeeded. safeAlter throws on real
// errors so the version bump at the end of the block is never reached.
function safeAlter(sql) {
  try {
    db.run(sql);
    return true;
  } catch (e) {
    const msg = String(e?.message || e).toLowerCase();
    if (msg.includes("duplicate column name")) return false; // column exists, skip
    throw e;
  }
}

function runMigrations() {
  db.run(`CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  const row = queryOne("SELECT value FROM meta WHERE key = 'schema_version'");
  let version = row ? parseInt(row.value, 10) : 0;

  // IMPORTANT: each block updates `version` after running so subsequent blocks
  // see the correct current version, not the original value. Blocks must stay
  // in ascending version order.

  if (version < 2) {
    // v2: add functional_elements and checklist to sermons (no-op on fresh installs)
    safeAlter("ALTER TABLE sermons ADD COLUMN functional_elements TEXT DEFAULT '{}'");
    safeAlter("ALTER TABLE sermons ADD COLUMN checklist TEXT DEFAULT '{}'");
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2')");
    version = 2;
  }

  if (version < 3) {
    // v3: previously created the sermon library table + FTS index. The library
    // feature has been removed; the migration body is empty but the version
    // bump is preserved so the migration sequence stays intact.
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '3')");
    version = 3;
  }

  if (version < 4) {
    // v4: series planning fields, sections table, calendar notes, sermon section/one-off
    safeAlter("ALTER TABLE series ADD COLUMN big_idea TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN overview TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN passage_range TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN start_date TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN end_date TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN structural_outline TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN status TEXT DEFAULT 'planning'");
    safeAlter("ALTER TABLE series ADD COLUMN canon_category TEXT DEFAULT ''");
    safeAlter("ALTER TABLE sermons ADD COLUMN section_id TEXT DEFAULT NULL");
    safeAlter("ALTER TABLE sermons ADD COLUMN is_one_off INTEGER DEFAULT 0");
    db.run(`CREATE TABLE IF NOT EXISTS series_sections (
      id TEXT PRIMARY KEY,
      series_id TEXT NOT NULL,
      title TEXT DEFAULT '',
      passage_range TEXT DEFAULT '',
      big_idea TEXT DEFAULT '',
      overview TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS calendar_notes (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT DEFAULT 'special',
      label TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '4')");
    version = 4;
  }

  if (version < 5) {
    // v5: migrate outline from string[] to {id,text}[] and functional_elements
    // from numeric-string keys to UUID keys. Idempotent: skips already-migrated records.
    const sermons = queryAll("SELECT id, outline, functional_elements FROM sermons");
    for (const sermon of sermons) {
      // ── Parse outline ──────────────────────────────────────────────────────
      let outlineRaw = null;
      try { outlineRaw = sermon.outline ? JSON.parse(sermon.outline) : null; } catch (_) {}

      if (!Array.isArray(outlineRaw) || outlineRaw.length === 0) continue;

      // Already migrated if first element is an object with an id field.
      if (typeof outlineRaw[0] === "object" && outlineRaw[0] !== null && outlineRaw[0].id) continue;

      // All items must be strings for this to be an old-format outline.
      if (!outlineRaw.every(item => typeof item === "string")) continue;

      // ── Parse functional_elements ──────────────────────────────────────────
      let feRaw = null;
      try { feRaw = sermon.functional_elements ? JSON.parse(sermon.functional_elements) : null; } catch (_) {}
      if (typeof feRaw !== "object" || feRaw === null || Array.isArray(feRaw)) feRaw = {};

      // ── Build new outline (string → {id, text}) ────────────────────────────
      const newOutline = outlineRaw.map(text => ({ id: randomUUID(), text }));

      // ── Build new functional_elements (numeric key → UUID key) ────────────
      const newFE = {};
      for (const [key, val] of Object.entries(feRaw)) {
        const idx = parseInt(key, 10);
        if (isNaN(idx)) continue; // skip non-numeric keys
        if (idx < 0 || idx >= newOutline.length) {
          console.warn(`[migration v5] sermon ${sermon.id}: functional_elements key "${key}" has no matching outline point — discarding orphan.`);
          continue;
        }
        const uuid = newOutline[idx].id;
        newFE[uuid] = {
          explanation:  typeof val?.explanation  === "string" ? val.explanation  : "",
          application:  typeof val?.application  === "string" ? val.application  : "",
          illustration: typeof val?.illustration === "string" ? val.illustration : "",
        };
      }

      db.run(
        "UPDATE sermons SET outline = ?, functional_elements = ? WHERE id = ?",
        [JSON.stringify(newOutline), JSON.stringify(newFE), sermon.id]
      );
    }

    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '5')");
    version = 5;
  }

  if (version < 6) {
    // v6: pastoral context fields — topic_theme, audience_assumptions, background_noise
    safeAlter("ALTER TABLE sermons ADD COLUMN topic_theme TEXT DEFAULT ''");
    safeAlter("ALTER TABLE sermons ADD COLUMN audience_assumptions TEXT DEFAULT ''");
    safeAlter("ALTER TABLE sermons ADD COLUMN background_noise TEXT DEFAULT ''");
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '6')");
    version = 6;
  }

  if (version < 7) {
    // v7: series study fields + sermon study guide note
    safeAlter("ALTER TABLE series ADD COLUMN redemptive_context TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN book_background TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN book_argument TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN book_structure TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN series_motivation TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN emerging_big_idea TEXT DEFAULT ''");
    safeAlter("ALTER TABLE sermons ADD COLUMN study_guide_note TEXT DEFAULT ''");
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '7')");
    version = 7;
  }

  if (version < 8) {
    // v8: preaching_blocks — CMC (Contour-Mapped Compression) without-notes output
    safeAlter("ALTER TABLE sermons ADD COLUMN preaching_blocks TEXT DEFAULT 'null'");
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '8')");
    version = 8;
  }

  if (version < 9) {
    // v9: manuscript_delivery — AI-formatted delivery manuscript
    safeAlter("ALTER TABLE sermons ADD COLUMN manuscript_delivery TEXT DEFAULT 'null'");
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '9')");
    version = 9;
  }

  if (version < 10) {
    // v10: clean up rows seeded by the removed "See Demo" feature.
    db.run("DELETE FROM sermons WHERE id LIKE 'demo-%'");
    db.run("DELETE FROM series  WHERE id LIKE 'demo-%'");
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '10')");
    version = 10;
  }

  if (version < 11) {
    // v11: drop sermons.big_idea — superseded by mpt/mps, never populated.
    try { db.run("ALTER TABLE sermons DROP COLUMN big_idea"); } catch (_) {}
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '11')");
    version = 11;
  }

  if (version < 12) {
    // v12: last_tune_up — JSON wrapper {content, ts} for the most recent Tune-Up response.
    // Persisted only after a successful Final Tune-Up run on the Manuscript tab.
    safeAlter("ALTER TABLE sermons ADD COLUMN last_tune_up TEXT DEFAULT NULL");
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '12')");
    version = 12;
  }

  if (version < 13) {
    // v13: settings table — user preferences as key/value strings.
    // Distinct from `meta` (which is for system-managed schema state).
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '13')");
    version = 13;
  }

  if (version < 14) {
    // v14: schema-contract reconciliation. Re-applies every additive ALTER
    // from v2/v4/v6/v7/v8/v9/v12 idempotently. Catches installs where a prior
    // swallowed-catch in any of those migrations skipped a column while the
    // version was bumped past it. safeAlter no-ops where the column already
    // exists; throws on any genuine error so the version bump below is
    // skipped and the migration retries on next launch.
    safeAlter("ALTER TABLE sermons ADD COLUMN functional_elements TEXT DEFAULT '{}'");
    safeAlter("ALTER TABLE sermons ADD COLUMN checklist TEXT DEFAULT '{}'");
    safeAlter("ALTER TABLE sermons ADD COLUMN section_id TEXT DEFAULT NULL");
    safeAlter("ALTER TABLE sermons ADD COLUMN is_one_off INTEGER DEFAULT 0");
    safeAlter("ALTER TABLE sermons ADD COLUMN topic_theme TEXT DEFAULT ''");
    safeAlter("ALTER TABLE sermons ADD COLUMN audience_assumptions TEXT DEFAULT ''");
    safeAlter("ALTER TABLE sermons ADD COLUMN background_noise TEXT DEFAULT ''");
    safeAlter("ALTER TABLE sermons ADD COLUMN study_guide_note TEXT DEFAULT ''");
    safeAlter("ALTER TABLE sermons ADD COLUMN preaching_blocks TEXT DEFAULT 'null'");
    safeAlter("ALTER TABLE sermons ADD COLUMN manuscript_delivery TEXT DEFAULT 'null'");
    safeAlter("ALTER TABLE sermons ADD COLUMN last_tune_up TEXT DEFAULT NULL");
    safeAlter("ALTER TABLE series ADD COLUMN big_idea TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN overview TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN passage_range TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN start_date TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN end_date TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN structural_outline TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN status TEXT DEFAULT 'planning'");
    safeAlter("ALTER TABLE series ADD COLUMN canon_category TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN redemptive_context TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN book_background TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN book_argument TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN book_structure TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN series_motivation TEXT DEFAULT ''");
    safeAlter("ALTER TABLE series ADD COLUMN emerging_big_idea TEXT DEFAULT ''");
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '14')");
    version = 14;
  }

  if (version < 15) {
    // v15: previously added content_hash to the library table. The library
    // feature has been removed; the migration body is empty but the version
    // bump is preserved so the migration sequence stays intact.
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '15')");
    version = 15;
  }

  if (version < 16) {
    // v16: collapse sermon stage + series status to a two-state lifecycle.
    // The 5 intermediate sermon stages (planning/study/outline/writing/ready)
    // and 2 intermediate series statuses (planning/active) duplicated the
    // workspace tab's in-progress position; "archived" was the only true
    // lifecycle terminus. See docs/CORE.md State Contract clauses 5 + 6.
    db.run(
      `UPDATE sermons SET stage = '${SERMON_STATUS.InProgress}'
         WHERE stage IN ('planning','study','outline','writing','ready')`
    );
    db.run(`UPDATE sermons SET stage = '${SERMON_STATUS.Complete}' WHERE stage = 'archived'`);
    db.run(
      `UPDATE series SET status = '${SERIES_STATUS.InProgress}'
         WHERE status IN ('planning','active')`
    );
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '16')");
    version = 16;
  }

  if (version < 17) {
    // v17: spine prerequisites — canonical process-position columns + legacy
    // evidence cutoff. State Contract #2 ("every sermon has a canonical
    // position in the process … queryable from any surface that touches the
    // sermon") cannot be enforced while position lives only in component
    // state and localStorage. These columns become the canonical position
    // store; the spine writes them via transitionState and reads them via
    // getSermon.
    //
    // legacy_evidence_cutoff carves out sermons created before this enforcement
    // pass — Process Contract #2 ("movement is gated by user evidence") can't
    // retroactively demand evidence trails for pre-existing sermons. Sermons
    // with created_at before the cutoff are treated as `evidence: 'legacy'`
    // when transitionState would otherwise reject for empty evidence. See
    // src/core/spine.ts header for the carve-out logic.
    const sermonInfo = queryAll("PRAGMA table_info(sermons)");
    const have = new Set(sermonInfo.map(r => r.name));
    if (!have.has("current_stage")) {
      db.run(`ALTER TABLE sermons ADD COLUMN current_stage TEXT NOT NULL DEFAULT '${STAGE.Study}'`);
    }
    if (!have.has("current_step")) {
      db.run("ALTER TABLE sermons ADD COLUMN current_step TEXT");
    }
    if (!have.has("current_sub_phase")) {
      db.run("ALTER TABLE sermons ADD COLUMN current_sub_phase TEXT");
    }
    // Backfill: any sermon currently in_progress and at Study stage
    // (the schema default) gets a starting Step+SubPhase so getSermon's
    // ProcessPosition is fully populated for new sermons too.
    db.run(
      `UPDATE sermons
         SET current_step = ?
       WHERE current_stage = ? AND current_step IS NULL`,
      [STEP.Exegesis, STAGE.Study]
    );
    db.run(
      `UPDATE sermons
         SET current_sub_phase = ?
       WHERE current_stage = ? AND current_step = ? AND current_sub_phase IS NULL`,
      [SUB_PHASE.Observe, STAGE.Study, STEP.Exegesis]
    );
    // Record the cutoff once. queryOne ensures we don't overwrite if v17
    // re-runs (idempotency for partially-applied migrations).
    const existingCutoff = queryOne("SELECT value FROM meta WHERE key = 'legacy_evidence_cutoff'");
    if (!existingCutoff) {
      const cutoff = new Date().toISOString();
      db.run(
        "INSERT INTO meta (key, value) VALUES ('legacy_evidence_cutoff', ?)",
        [cutoff]
      );
    }
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '17')");
    version = 17;
  }

  if (version < 18) {
    // v18: SPRD C3 — Sermon Frame elevation (SADI Step 5).
    // Adds a JSON column for the elevated Step 5 field-data (Intro +
    // Conclusion). Same envelope shape as the four Exegesis sub-phase
    // columns (`{[fieldKey]: {[questionKey]: {value, na}}}`); renderer
    // helpers (parseStructuredField / setQuestionAnswer / serialize)
    // manage the shape. NULL is acceptable as the empty state — sermons
    // created before this migration retain NULL until the pastor opens
    // the new Frame tab and writes content.
    const sermonInfo = queryAll("PRAGMA table_info(sermons)");
    const have = new Set(sermonInfo.map(r => r.name));
    if (!have.has("sermon_frame")) {
      db.run("ALTER TABLE sermons ADD COLUMN sermon_frame TEXT DEFAULT NULL");
    }
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '18')");
    version = 18;
  }

  if (version < 19) {
    // v19: SADI Step 2 plumbing — MPT/MPS as proper fields.
    // Adds a JSON column for the per-question envelope holding MPT (2Q:
    // draft, tighten) and MPS (3Q: translate, gospel_check, tighten),
    // mirroring v18's sermon_frame shape. The legacy flat `mpt` and `mps`
    // columns stay defensively per migration policy and are auto-synced
    // from the tighten answers on write — downstream readers (AI prompts,
    // context builder, exports) keep reading the flat columns unchanged.
    // NULL is acceptable as the empty state.
    const sermonInfo = queryAll("PRAGMA table_info(sermons)");
    const have = new Set(sermonInfo.map(r => r.name));
    if (!have.has("main_point_pair")) {
      db.run("ALTER TABLE sermons ADD COLUMN main_point_pair TEXT DEFAULT NULL");
    }
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '19')");
    version = 19;
  }
}

// Verify the live schema matches the SERMON_COLUMNS / SERIES_COLUMNS allowlists
// used by buildUpdate(). A missing column means a prior migration silently
// skipped its ALTER and bumped the version regardless. v14 should heal this on
// the launch it fires; assertSchemaContract is the canary that confirms it did.
// Logs only — does not throw — so a degraded-but-functional install keeps booting.
function assertSchemaContract() {
  const missing = [];
  const sermonInfo = queryAll("PRAGMA table_info(sermons)");
  const actualSermons = new Set(sermonInfo.map(r => r.name));
  for (const col of SERMON_COLUMNS) {
    if (!actualSermons.has(col)) missing.push(`sermons.${col}`);
  }
  const seriesInfo = queryAll("PRAGMA table_info(series)");
  const actualSeries = new Set(seriesInfo.map(r => r.name));
  for (const col of SERIES_COLUMNS) {
    if (!actualSeries.has(col)) missing.push(`series.${col}`);
  }
  if (missing.length > 0) {
    logError(
      `[DB] schema contract violation: missing columns [${missing.join(", ")}]`,
      new Error("schema mismatch — buildUpdate writes to these columns will silently drop in production")
    );
  }
}

// ── Settings helpers ─────────────────────────────────────────────────────────
function getSetting(key) {
  const row = queryOne("SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
  saveDb();
}

// ── Query helpers ────────────────────────────────────────────────────────────
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

// ── Theology query helper (better-sqlite3) ──────────────────────────────────
// theology.db uses better-sqlite3 + sqlite-vec.
// sermonforge.db uses sql.js.
// These systems are intentionally separate.
// DO NOT mix query patterns or connections.
function queryTheology(sql, params = []) {
  return theologyDb.prepare(sql).all(...params);
}

function buildFtsQuery(userQuery) {
  const stopWords = new Set([
    "a","an","the","i","me","my","to","of","in","on","for","and","or","is",
    "are","was","be","this","that","with","from","by","not","but","we","he",
    "she","they","do","did","does","has","have","had","its","which","who","what",
    "when","how","can","will","would","could","should","may","might","put",
    "together","need","want","please","give","three","outline","outlines","based","existing","using",
    "say","says","said","about","tell","tells","think","thinks","know","knows",
    "get","got","let","per","via","yet","ago","now","too","also","just","even",
    "very","more","than","then","them","our","your","their","some","any","all",
    "each","most","such","like","into","over","after","before","between","during"
  ]);
  const words = userQuery.toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  if (words.length === 0) return null;
  return [...new Set(words)].slice(0, 8).map(w => `"${w}"`).join(" OR ");
}

// seedDatabase() removed — no longer needed (real data in place)

// ── Window creation ─────────────────────────────────────────────────────────
// Splash flow: createWindow loads electron/loading.html immediately so the user
// sees a wordmark + spinner during initDatabase (which can take seconds when
// theology.db opens at first launch). Once init is
// complete, app.whenReady calls loadAppContent() to swap the same window to
// the real renderer entry point. The window stays visible the whole time —
// no flash of unstyled second window.
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#f7f3ec",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,       // required: sql.js and other Node APIs used in preload
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, "loading.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
}

function loadAppContent() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (isDev) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// One-shot startup warning when the userData folder is inside a OneDrive root.
// Cloud sync agents can rewrite SQLite page files mid-write, which is the most
// common silent-corruption vector we've seen. First launch (no DB file yet)
// surfaces a blocking modal because the user can still relocate cheaply; later
// launches surface a dismiss-once banner — once dismissed in the renderer, it
// stays dismissed (localStorage flag) so existing users are not nagged.
//
// Stored on a module variable rather than push-emitted so we don't race the
// React mount: webContents.send drops the event if no listener is attached yet.
function maybeWarnOneDrive() {
  if (!/OneDrive/i.test(paths.userData)) return;
  const kind = _firstLaunch ? "onedrive-first-run" : "onedrive";
  logError(`[startup] userData is inside OneDrive (${paths.userData}); SQLite corruption risk`, null);
  _pendingStartupWarning = { kind, path: paths.userData };
}

// ── IPC handlers ────────────────────────────────────────────────────────────
registerAIHandlers(ipcMain);

// Column allowlists are imported from electron/contracts.cjs (single source of
// truth: src/core/contracts.ts). buildUpdate validates against them; updates
// to anything outside the allowlist throw in dev (drift surfaces loudly) and
// warn in prod (a stale build never crashes a pastor mid-save).

function buildUpdate(fields, allowedColumns) {
  const rejected = Object.keys(fields).filter((k) => !allowedColumns.has(k));
  if (rejected.length > 0) {
    const msg = `[buildUpdate] Unknown field(s) rejected: [${rejected.join(", ")}]. ` +
      `Allowed columns: [${[...allowedColumns].join(", ")}].`;
    // Dev throws so column/allowlist drift surfaces loudly during development.
    // Packaged warns so a stale build never crashes a pastor mid-save.
    if (isDev) throw new Error(msg);
    console.warn(msg);
  }

  const entries = Object.entries(fields).filter(([k]) => allowedColumns.has(k));
  if (!entries.length) return null;
  return {
    setClauses: entries.map(([k]) => `${k} = ?`).join(", "),
    values: entries.map(([, v]) => v),
  };
}

// ── Spine — the only sermon/series state surface ─────────────────────────────
//
// All renderer-side reads, creates, updates, and deletes of sermon, series,
// or series_section state route through `ipcMain.handle("spine", ...)`. The
// renderer-side companion is `src/core/spine.ts`; the integrity gate
// (`scripts/spine-integrity.js`) blocks any code path that would let a
// caller bypass this routing.
//
// validateAndCommit — single mutation gate
// ────────────────────────────────────────
// Mutations cross the boundary as discriminated envelopes; this function is
// the only place that writes sermon/series state. It cites the violated
// contract clause on every rejection so the renderer-side ContractViolation
// carries the same citation. Reads are routed through the same channel for
// uniformity but bypass the validation switch.
//
// Proposal storage
// ────────────────
// `ai_proposal` mutations stage value in the in-memory `proposals` map keyed
// by a server-generated proposalId. They are NEVER written to the DB at
// proposal time — Mutation Contract #1: "User typing always wins by default."
// Subsequent `ai_apply` mutations look up the proposal and commit. Proposals
// expire after PROPOSAL_TTL_MS to bound the map.

const proposals = new Map();
const PROPOSAL_TTL_MS = 1000 * 60 * 60; // 1h

function pruneExpiredProposals() {
  const now = Date.now();
  for (const [id, p] of proposals) {
    if (p.expiresAt < now) proposals.delete(id);
  }
}

let _legacyEvidenceCutoffCache = null;
function getLegacyEvidenceCutoff() {
  if (_legacyEvidenceCutoffCache !== null) return _legacyEvidenceCutoffCache;
  const row = queryOne("SELECT value FROM meta WHERE key = 'legacy_evidence_cutoff'");
  _legacyEvidenceCutoffCache = row ? row.value : "";
  return _legacyEvidenceCutoffCache;
}

function isLegacySermon(sermonRow) {
  const cutoff = getLegacyEvidenceCutoff();
  if (!cutoff) return false;
  return (sermonRow.created_at || "") < cutoff;
}

function rejection(code, clause, message) {
  return { ok: false, code, clause, message };
}
function success(value) {
  return { ok: true, value: value === undefined ? null : value };
}

// ── Row → canonical-shape helpers ────────────────────────────────────────────

function shapeSermon(row, parentContext) {
  if (!row) return null;
  const out = {
    // Canonical shape (per src/core/contracts.ts `Sermon`).
    id: row.id,
    name: row.title || "",
    status: row.stage || SERMON_STATUS.InProgress,
    position: {
      stage: row.current_stage || STAGE.Study,
      step: row.current_step || undefined,
      subPhase: row.current_sub_phase || undefined,
    },
    parentContext: parentContext || null,
    passage: row.passage || "",
    date: row.date || "",
    preacher: row.preacher || "",
    legacy: isLegacySermon(row),
    // Backward-compat raw row fields. Existing components read these directly;
    // migration to the canonical shape (Sermon.name, Sermon.position) is gradual.
    ...row,
  };
  return out;
}

function shapeSeries(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.title || "",
    status: row.status || SERIES_STATUS.InProgress,
    year: row.year || new Date().getFullYear(),
    color: row.color || "gold",
    ...row,
  };
}

function fetchSermonRow(id) {
  const rows = queryAll(
    `SELECT s.*, sr.title as series_title, sr.color as series_color
     FROM sermons s
     LEFT JOIN series sr ON s.series_id = sr.id
     WHERE s.id = ?`,
    [id],
  );
  return rows[0] || null;
}

function computeParentContext(row) {
  if (!row || !row.series_id) return null;
  const siblings = queryAll(
    "SELECT id FROM sermons WHERE series_id = ? ORDER BY date ASC, created_at ASC",
    [row.series_id],
  );
  const idx = siblings.findIndex((s) => s.id === row.id);
  if (idx === -1) return null;
  return {
    seriesId: row.series_id,
    seriesName: row.series_title || "",
    positionInSeries: idx + 1,
    totalInSeries: siblings.length,
  };
}

// ── Read router — no validation, returns enriched shapes ─────────────────────

function spineRead(op, payload) {
  switch (op) {
    case "get-sermon": {
      const row = fetchSermonRow(payload);
      return shapeSermon(row, computeParentContext(row));
    }
    case "get-series": {
      const rows = queryAll("SELECT * FROM series WHERE id = ?", [payload]);
      return shapeSeries(rows[0]);
    }
    case "get-all-sermons":
      return queryAll(
        `SELECT s.*, sr.title as series_title, sr.color as series_color
         FROM sermons s LEFT JOIN series sr ON s.series_id = sr.id
         WHERE s.id NOT LIKE 'tour-%'
         ORDER BY s.date DESC, s.created_at DESC`,
      ).map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-all-series":
      return queryAll(
        "SELECT * FROM series WHERE id NOT LIKE 'tour-%' ORDER BY year DESC, title ASC",
      ).map(shapeSeries);
    case "get-recent-sermons":
      return queryAll(
        `SELECT s.*, sr.title as series_title, sr.color as series_color
         FROM sermons s LEFT JOIN series sr ON s.series_id = sr.id
         WHERE s.stage != ?
           AND s.id NOT LIKE 'tour-%'
         ORDER BY s.updated_at DESC, s.created_at DESC
         LIMIT ?`,
        [SERMON_STATUS.Complete, payload?.limit ?? 3],
      ).map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-recent-series":
      return queryAll(
        `SELECT * FROM series
         WHERE id NOT LIKE 'tour-%'
         ORDER BY COALESCE(updated_at, created_at) DESC
         LIMIT ?`,
        [payload?.limit ?? 3],
      ).map(shapeSeries);
    case "get-in-progress-sermons":
      // State Contract #6: in-progress work is queryable from the front door.
      return queryAll(
        `SELECT s.*, sr.title as series_title, sr.color as series_color
         FROM sermons s LEFT JOIN series sr ON s.series_id = sr.id
         WHERE s.stage = ?
           AND s.id NOT LIKE 'tour-%'
         ORDER BY s.updated_at DESC, s.created_at DESC`,
        [SERMON_STATUS.InProgress],
      ).map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-sermons-by-series":
      return queryAll(
        `SELECT s.*, ss.title as section_title FROM sermons s
         LEFT JOIN series_sections ss ON s.section_id = ss.id
         WHERE s.series_id = ? ORDER BY s.date ASC, s.created_at ASC`,
        [payload],
      );
    case "get-sections-by-series":
      return queryAll(
        "SELECT * FROM series_sections WHERE series_id = ? ORDER BY sort_order ASC, created_at ASC",
        [payload],
      );
    default:
      return null;
  }
}

// ── Mutation router — every write goes through validateAndCommit ─────────────

function applyStructuredUpdate(row, field, update) {
  const raw = row[field];
  let current;
  try {
    current = raw ? JSON.parse(raw) : (field === "outline" ? [] : {});
  } catch {
    current = field === "outline" ? [] : {};
  }

  if (field === "outline") {
    if (!Array.isArray(current)) current = [];
    if (update.op === "add") {
      current.push({ id: randomUUID(), text: String(update.text || "") });
    } else if (update.op === "edit") {
      const i = current.findIndex((p) => p.id === update.id);
      if (i >= 0) current[i] = { id: update.id, text: String(update.text || "") };
    } else if (update.op === "remove") {
      current = current.filter((p) => p.id !== update.id);
    } else if (update.op === "reorder") {
      const byId = new Map(current.map((p) => [p.id, p]));
      const ordered = (update.orderedIds || []).map((id) => byId.get(id)).filter(Boolean);
      current = ordered;
    } else {
      return rejection("STATE_5_BAD_OP", "State #5", `Unknown outline op: ${update.op}`);
    }
    return JSON.stringify(current);
  }

  if (field === "functional_elements") {
    if (typeof current !== "object" || current === null || Array.isArray(current)) current = {};
    if (update.op === "set") {
      const entry = current[update.outlinePointId] || {};
      entry[update.field] = String(update.value || "");
      current[update.outlinePointId] = entry;
      return JSON.stringify(current);
    }
    return rejection("STATE_5_BAD_OP", "State #5", `Unknown functional_elements op: ${update.op}`);
  }

  // observations / interpretation / redemptive_thread / implications: keyed JSON
  if (typeof current !== "object" || current === null || Array.isArray(current)) current = {};
  if (update.op === "set") {
    current[update.questionKey] = String(update.value || "");
    return JSON.stringify(current);
  }
  if (update.op === "set_summary") {
    current.summary = String(update.value || "");
    return JSON.stringify(current);
  }
  return rejection("STATE_5_BAD_OP", "State #5", `Unknown structured op: ${update.op}`);
}

function validateAndCommit(op, payload) {
  switch (op) {
    case "create-sermon": {
      const name = (payload?.name || "").trim();
      if (!name) {
        return rejection(
          "STATE_3_NAMELESS_SERMON",
          "State #3",
          "State Contract #3 violation: no anonymous atoms — a sermon must have a name.",
        );
      }
      const id = randomUUID();
      db.run(
        `INSERT INTO sermons
           (id, series_id, section_id, is_one_off, title, passage, date, preacher,
            stage, mpt, mps, observations, outline, manuscript,
            current_stage, current_step, current_sub_phase)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '[]', '', ?, ?, ?)`,
        [
          id,
          payload.series_id || null,
          payload.section_id || null,
          payload.is_one_off ? 1 : 0,
          name,
          payload.passage || "",
          payload.date || "",
          payload.preacher || "",
          SERMON_STATUS.InProgress,
          STAGE.Study,
          STEP.Exegesis,
          SUB_PHASE.Observe,
        ],
      );
      saveDb();
      return success({ id });
    }

    case "create-series": {
      const name = (payload?.name || "").trim();
      if (!name) {
        return rejection(
          "STATE_3_NAMELESS_SERIES",
          "State #3",
          "State Contract #3 violation: no anonymous atoms — a series must have a name.",
        );
      }
      const id = randomUUID();
      db.run(
        `INSERT INTO series
           (id, title, color, description, year, big_idea, overview,
            passage_range, start_date, end_date, structural_outline, status, canon_category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          name,
          payload.color || "gold",
          payload.description || "",
          payload.year || new Date().getFullYear(),
          payload.big_idea || "",
          payload.overview || "",
          payload.passage_range || "",
          payload.start_date || "",
          payload.end_date || "",
          payload.structural_outline || "",
          SERIES_STATUS.InProgress,
          payload.canon_category || "",
        ],
      );
      saveDb();
      return success({ id });
    }

    case "update-sermon": {
      // Multi-field user_input mutation — every supplied field is treated as
      // user typing. Structured fields are accepted as pre-serialized JSON
      // strings; for typed structured updates callers should use
      // apply-mutation with kind "user_input". Same allowlist + dev-throw
      // path as single-field updates.
      const { id, fields } = payload || {};
      const update = buildUpdate(fields || {}, SERMON_COLUMNS);
      if (!update) {
        return rejection("UPDATE_NO_FIELDS", "State #5", "No valid fields to update.");
      }
      db.run(
        `UPDATE sermons SET ${update.setClauses}, updated_at = datetime('now') WHERE id = ?`,
        [...update.values, id],
      );
      saveDb();
      return success();
    }

    case "update-series": {
      const { id, fields } = payload || {};
      if (Object.prototype.hasOwnProperty.call(fields || {}, "title")) {
        const t = (fields.title || "").trim();
        if (!t) {
          return rejection(
            "STATE_3_NAMELESS_SERIES",
            "State #3",
            "State Contract #3 violation: a series must have a name.",
          );
        }
      }
      const update = buildUpdate(fields || {}, SERIES_COLUMNS);
      if (!update) {
        return rejection("UPDATE_NO_FIELDS", "State #5", "No valid fields to update.");
      }
      db.run(`UPDATE series SET ${update.setClauses} WHERE id = ?`, [...update.values, id]);
      saveDb();
      return success();
    }

    case "delete-sermon":
      db.run("DELETE FROM sermons WHERE id = ?", [payload]);
      saveDb();
      return success();

    case "delete-series":
      db.run("BEGIN");
      try {
        db.run("DELETE FROM series_sections WHERE series_id = ?", [payload]);
        db.run("UPDATE sermons SET series_id = NULL, section_id = NULL WHERE series_id = ?", [payload]);
        db.run("DELETE FROM series WHERE id = ?", [payload]);
        db.run("COMMIT");
      } catch (e) {
        db.run("ROLLBACK");
        throw e;
      }
      saveDb();
      return success();

    case "create-section": {
      const id = randomUUID();
      db.run(
        `INSERT INTO series_sections
           (id, series_id, title, passage_range, big_idea, overview, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          payload.series_id,
          payload.title || "",
          payload.passage_range || "",
          payload.big_idea || "",
          payload.overview || "",
          payload.sort_order ?? 0,
        ],
      );
      saveDb();
      return success({ id });
    }

    case "update-section": {
      const { id, fields } = payload || {};
      const update = buildUpdate(fields || {}, SECTION_COLUMNS);
      if (!update) {
        return rejection("UPDATE_NO_FIELDS", "State #5", "No valid fields to update.");
      }
      db.run(`UPDATE series_sections SET ${update.setClauses} WHERE id = ?`, [...update.values, id]);
      saveDb();
      return success();
    }

    case "delete-section":
      db.run("BEGIN");
      try {
        db.run("UPDATE sermons SET section_id = NULL WHERE section_id = ?", [payload]);
        db.run("DELETE FROM series_sections WHERE id = ?", [payload]);
        db.run("COMMIT");
      } catch (e) {
        db.run("ROLLBACK");
        throw e;
      }
      saveDb();
      return success();

    case "transition-state": {
      const { sermonId, to, evidence, direction, kind } = payload || {};
      const row = fetchSermonRow(sermonId);
      if (!row) {
        return rejection("NOT_FOUND", "State #1", `Sermon ${sermonId} not found.`);
      }
      // Process #2 (empty-evidence gate) only fires on forward movement.
      // The constraint is "the system does not advance unless evidence
      // exists" — backward navigation is retreat, not advancement, and
      // must always be allowed so the pastor can return to fill in work.
      const evidenceTrimmed = (evidence || "").trim();
      if (direction === "forward" && !evidenceTrimmed && !isLegacySermon(row)) {
        return rejection(
          "PROCESS_2_EMPTY_EVIDENCE",
          "Process #2",
          "Process Contract #2 violation: movement is gated by user evidence — the constraint is the gate.",
        );
      }
      if (kind === "stage" && direction === "forward") {
        const fromIdx = STAGE_SEQUENCE.indexOf(row.current_stage);
        const toIdx = STAGE_SEQUENCE.indexOf(to);
        if (fromIdx >= 0 && toIdx >= 0 && toIdx <= fromIdx) {
          return rejection(
            "PROCESS_1_FORWARD_TO_PRIOR",
            "Process #1",
            "Process Contract #1 violation: forward direction cannot move to a prior stage (movement is monotonic by default).",
          );
        }
      }
      if (kind === "step" && direction === "forward") {
        const fromIdx = STEP_CANONICAL_SEQUENCE.indexOf(row.current_step);
        const toIdx = STEP_CANONICAL_SEQUENCE.indexOf(to);
        if (fromIdx >= 0 && toIdx >= 0 && toIdx <= fromIdx) {
          return rejection(
            "PROCESS_1_FORWARD_TO_PRIOR",
            "Process #1",
            "Process Contract #1 violation: forward direction cannot move to a prior step.",
          );
        }
      }
      if (kind === "sub_phase" && direction === "forward") {
        const fromIdx = SUB_PHASE_CANONICAL_SEQUENCE.indexOf(row.current_sub_phase);
        const toIdx = SUB_PHASE_CANONICAL_SEQUENCE.indexOf(to);
        if (fromIdx >= 0 && toIdx >= 0 && toIdx <= fromIdx) {
          return rejection(
            "PROCESS_1_FORWARD_TO_PRIOR",
            "Process #1",
            "Process Contract #1 violation: forward direction cannot move to a prior sub-phase.",
          );
        }
      }
      if (kind === "stage") {
        const stepDefault = to === STAGE.Study ? STEP.Exegesis : null;
        const subDefault = to === STAGE.Study ? SUB_PHASE.Observe : null;
        db.run(
          `UPDATE sermons SET current_stage = ?, current_step = ?, current_sub_phase = ?, updated_at = datetime('now') WHERE id = ?`,
          [to, stepDefault, subDefault, sermonId],
        );
      } else if (kind === "step") {
        const subDefault = to === STEP.Exegesis ? SUB_PHASE.Observe : null;
        db.run(
          `UPDATE sermons SET current_step = ?, current_sub_phase = ?, updated_at = datetime('now') WHERE id = ?`,
          [to, subDefault, sermonId],
        );
      } else if (kind === "sub_phase") {
        db.run(
          `UPDATE sermons SET current_sub_phase = ?, updated_at = datetime('now') WHERE id = ?`,
          [to, sermonId],
        );
      } else {
        return rejection(
          "STATE_5_NONCANONICAL_TO",
          "State #5",
          `'to' must be a canonical Stage/Step/SubPhase value (got '${to}').`,
        );
      }
      saveDb();
      return success();
    }

    case "apply-mutation": {
      const { kind, sermonId, field } = payload || {};
      if (!sermonId || !field) {
        return rejection("BAD_PAYLOAD", "Spine", "applyMutation requires sermonId and field.");
      }
      const row = fetchSermonRow(sermonId);
      if (!row) {
        return rejection("NOT_FOUND", "State #1", `Sermon ${sermonId} not found.`);
      }
      if (!SERMON_COLUMNS.has(field)) {
        return rejection("STATE_5_UNKNOWN_FIELD", "State #5", `Unknown sermon field '${field}'.`);
      }
      const isStructured = STRUCTURED_FIELDS.has(field);

      if (kind === MUTATION_KIND.UserInput) {
        let serialized;
        if (isStructured) {
          const r = applyStructuredUpdate(row, field, payload.value);
          if (r && typeof r === "object" && r.ok === false) return r;
          serialized = r;
        } else {
          if (typeof payload.value !== "string") {
            return rejection(
              "STATE_5_SIMPLE_FIELD_STRUCTURED",
              "State #5",
              `'${field}' is a simple field; value must be a string.`,
            );
          }
          serialized = payload.value;
        }
        db.run(
          `UPDATE sermons SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`,
          [serialized, sermonId],
        );
        saveDb();
        return success();
      }

      if (kind === MUTATION_KIND.AiProposal) {
        // Process Contract #5: AI augments user evidence — reject when prior
        // content is empty. Treat empty string, null, "[]", and "{}" as empty.
        const prior = row[field];
        const priorEmpty =
          prior == null ||
          (typeof prior === "string" &&
            (prior.trim() === "" || prior === "[]" || prior === "{}"));
        if (priorEmpty) {
          return rejection(
            "PROCESS_5_AI_NO_USER_EVIDENCE",
            "Process #5",
            "Process Contract #5 violation: AI augments, never substitutes — proposals require prior user evidence in the field.",
          );
        }
        if (isStructured) {
          if (typeof payload.value === "string") {
            return rejection(
              "STATE_5_STRUCTURED_FIELD_STRING",
              "State #5",
              `'${field}' is a structured field; pass a typed update shape.`,
            );
          }
        } else if (typeof payload.value !== "string") {
          return rejection(
            "STATE_5_SIMPLE_FIELD_STRUCTURED",
            "State #5",
            `'${field}' is a simple field; value must be a string.`,
          );
        }
        pruneExpiredProposals();
        const proposalId = randomUUID();
        proposals.set(proposalId, {
          sermonId,
          field,
          value: payload.value,
          isStructured,
          expiresAt: Date.now() + PROPOSAL_TTL_MS,
        });
        return success({ proposalId });
      }

      if (kind === MUTATION_KIND.AiApply) {
        pruneExpiredProposals();
        const { proposalId } = payload;
        if (!proposalId || !proposals.has(proposalId)) {
          return rejection(
            "MUTATION_1_AI_APPLY_WITHOUT_PROPOSAL",
            "Mutation #1",
            "Mutation Contract #1 violation: user typing wins; ai_apply requires a referenced proposalId from a prior ai_proposal.",
          );
        }
        const p = proposals.get(proposalId);
        if (p.sermonId !== sermonId || p.field !== field) {
          return rejection(
            "MUTATION_1_PROPOSAL_MISMATCH",
            "Mutation #1",
            "Mutation Contract #1 violation: proposalId references a different sermon/field than the apply call.",
          );
        }
        let serialized;
        if (p.isStructured) {
          const r = applyStructuredUpdate(row, field, p.value);
          if (r && typeof r === "object" && r.ok === false) return r;
          serialized = r;
        } else {
          serialized = p.value;
        }
        db.run(
          `UPDATE sermons SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`,
          [serialized, sermonId],
        );
        saveDb();
        proposals.delete(proposalId);
        return success();
      }

      return rejection("BAD_KIND", "Mutation", `Unknown mutation kind: ${kind}`);
    }

    case "load-tour-sermon": {
      const { SERMON_ID, series, sermon } = require("./tourData");
      // Sample sermon is regenerated on every load. The mock is for
      // exploration, not work the pastor builds on; resetting on each
      // click ensures schema/content updates take effect immediately
      // and sweeps any stale `tour-*` rows from a prior mock version.
      db.run("BEGIN");
      try {
        db.run("DELETE FROM sermons WHERE id LIKE 'tour-%'");
        db.run("DELETE FROM series  WHERE id LIKE 'tour-%'");
        db.run(
          `INSERT INTO series (
            id, title, color, description, year,
            big_idea, overview, passage_range, start_date, end_date,
            structural_outline, status, canon_category,
            redemptive_context, book_background, book_argument,
            book_structure, series_motivation, emerging_big_idea
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            series.id, series.title, series.color, series.description, series.year,
            series.big_idea, series.overview, series.passage_range, series.start_date, series.end_date,
            series.structural_outline, series.status, series.canon_category,
            series.redemptive_context, series.book_background, series.book_argument,
            series.book_structure, series.series_motivation, series.emerging_big_idea,
          ],
        );
        db.run(
          `INSERT INTO sermons (
            id, series_id, is_one_off, title, passage, date, stage,
            mpt, mps,
            observations, interpretation, redemptive_thread, implications,
            outline, functional_elements,
            manuscript, delivery_notes, timing_notes,
            study_guide_note, sermon_frame,
            current_stage, current_step, current_sub_phase
          ) VALUES (?,?,0,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            sermon.id, sermon.series_id, sermon.title, sermon.passage, sermon.date, sermon.stage,
            sermon.mpt, sermon.mps,
            sermon.observations, sermon.interpretation, sermon.redemptive_thread, sermon.implications,
            sermon.outline, sermon.functional_elements,
            sermon.manuscript, sermon.delivery_notes, sermon.timing_notes,
            sermon.study_guide_note, sermon.sermon_frame,
            STAGE.Study, STEP.Exegesis, SUB_PHASE.Observe,
          ],
        );
        db.run("COMMIT");
      } catch (e) {
        db.run("ROLLBACK");
        throw e;
      }
      saveDb();
      return success({ sermonId: SERMON_ID, created: true });
    }

    case "remove-tour-sermon":
      db.run("BEGIN");
      try {
        db.run("DELETE FROM sermons WHERE id LIKE 'tour-%'");
        db.run("DELETE FROM series  WHERE id LIKE 'tour-%'");
        db.run("COMMIT");
      } catch (e) {
        db.run("ROLLBACK");
        throw e;
      }
      saveDb();
      return success();

    default:
      return rejection("UNKNOWN_OP", "Spine", `Unknown spine mutation op: ${op}`);
  }
}

const SPINE_READ_OPS = new Set([
  "get-sermon",
  "get-series",
  "get-all-sermons",
  "get-all-series",
  "get-recent-sermons",
  "get-recent-series",
  "get-in-progress-sermons",
  "get-sermons-by-series",
  "get-sections-by-series",
]);

ipcMain.handle("spine", (_, op, payload) => {
  try {
    if (SPINE_READ_OPS.has(op)) {
      return spineRead(op, payload);
    }
    return validateAndCommit(op, payload);
  } catch (e) {
    if (e instanceof ContractViolation) {
      return rejection(e.code, e.clause, e.message);
    }
    logError(`[spine ${op}] uncaught error`, e);
    return rejection("INTERNAL", "Spine", e?.message || String(e));
  }
});

// ── Calendar note handlers ────────────────────────────────────────────────────
ipcMain.handle("db-getCalendarNotes", () =>
  queryAll("SELECT * FROM calendar_notes ORDER BY date ASC")
);

ipcMain.handle("db-createCalendarNote", (_, data) => {
  const id = randomUUID();
  db.run(
    "INSERT INTO calendar_notes (id, date, type, label, notes) VALUES (?, ?, ?, ?, ?)",
    [id, data.date, data.type || "special", data.label || "", data.notes || ""]
  );
  saveDb();
  return id;
});

ipcMain.handle("db-deleteCalendarNote", (_, id) => {
  db.run("DELETE FROM calendar_notes WHERE id = ?", [id]);
  saveDb();
});

// (db-getRecentSermons / db-loadTourSermon / db-removeTourSermon — moved into
//  the spine handler above. Sermon/series state has exactly one IPC surface.)

// ── Settings IPC ─────────────────────────────────────────────────────────────
ipcMain.handle("db-getSetting", (_, key) => getSetting(key));
ipcMain.handle("db-setSetting", (_, { key, value }) => {
  setSetting(key, value);
  return true;
});

ipcMain.handle("theology-status", async () => {
  await ensureTheologyDbLoaded();
  return { available: theologyDb !== null, semantic: theologyVecAvailable };
});

// Known author keywords for theology-search author detection.
// Maps a lowercase keyword to the author value stored in theology.db.
const THEOLOGY_AUTHORS = {
  augustine: "Augustine",
  athanasius: "Athanasius",
  basil: "Basil",
  chrysostom: "John Chrysostom",
  calvin: "John Calvin",
  luther: "Martin Luther",
  aquinas: "Thomas Aquinas",
  jerome: "Jerome",
  eusebius: "Eusebius",
  gregory: "Gregory",
  cyril: "Cyril",
  hilary: "Hilary",
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Score a result chunk by counting how many distinct search terms appear in it.
// Used to rerank FTS4 results by relevance after fetching a larger candidate set.
function scoreTheologyChunk(chunk, terms) {
  const haystack = `${chunk.author} ${chunk.work} ${chunk.full_text || chunk.text_chunk}`.toLowerCase();
  return terms.reduce((score, term) => {
    const bare = term.replace(/"/g, "");
    const hits = (haystack.match(new RegExp(escapeRegex(bare), "g")) || []).length;
    return score + hits;
  }, 0);
}

ipcMain.handle("theology-search", async (event, { query, limit = 5 }) => {
  await ensureTheologyDbLoaded();
  if (!theologyDb) {
    console.warn("[THEOLOGY DB] Not loaded at query time");
    return [];
  }
  console.log(`[VECTOR] Available at query start: ${theologyVecAvailable}`);
  try {
    if (!query || !query.trim()) return [];

    const lower = query.toLowerCase();

    // Detect author names in the query
    const detectedAuthors = [];
    let scrubbed = lower;
    for (const [keyword] of Object.entries(THEOLOGY_AUTHORS)) {
      if (new RegExp(`\\b${keyword}\\b`).test(lower)) {
        detectedAuthors.push(keyword);
        scrubbed = scrubbed.replace(new RegExp(`\\b${keyword}\\b`, "g"), " ");
      }
    }

    // ── Build FTS query parts (used by both semantic hybrid and pure FTS path) ──
    // Extract user-quoted phrases as FTS4 phrase terms
    let phraseTerms = [];
    const quoted = scrubbed.match(/"([^"]+)"/g);
    if (quoted) {
      quoted.forEach(p => {
        phraseTerms.push(p);
        scrubbed = scrubbed.replace(p, " ");
      });
    }

    // Strip stop words and build individual content terms
    const contentTermsStr = buildFtsQuery(scrubbed);
    const contentTerms = contentTermsStr ? contentTermsStr.split(" OR ") : [];

    // Detect content-word pairs separated by up to 3 stop words as implicit phrases.
    // Bridges gaps like "fear of the lord" → "fear of the lord" (not just "fear" OR "lord").
    if (contentTerms.length >= 2) {
      const rawWords = scrubbed.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
      const contentSet = new Set(contentTerms.map(t => t.replace(/"/g, "")));
      for (let i = 0; i < rawWords.length - 1; i++) {
        if (!contentSet.has(rawWords[i])) continue;
        for (let j = i + 1; j <= Math.min(i + 4, rawWords.length - 1); j++) {
          if (contentSet.has(rawWords[j])) {
            phraseTerms.push(`"${rawWords.slice(i, j + 1).join(" ")}"`);
            break;
          }
        }
      }
    }

    phraseTerms = [...new Set(phraseTerms)];

    const contentParts = [...phraseTerms, ...contentTerms];

    // ── Semantic search path (vec0) ────────────────────────────────────
    // When vectors are available, run semantic search AND FTS in parallel,
    // then merge results. FTS finds exact phrase matches the vector model may miss.
    // Wrapped in its own try/catch so any failure falls through to the FTS-only
    // path below rather than propagating to the outer catch and returning [].

    if (theologyVecAvailable) {
      console.log("[VECTOR] Semantic search activated");
      try {
        const qVecArr = await embedText(query);
        if (qVecArr) {
          const qVec = JSON.stringify(qVecArr);
          const fetchLimit = detectedAuthors.length > 0 ? limit * 10 : limit * 4;

          console.log("[VECTOR] Running KNN query");
          const _vecStart = Date.now();
          let vecResults = queryTheology(
            `SELECT t.id, t.author, t.work, t.work_id,
                    t.locator, t.ccel_page_start, t.ccel_page_end,
                    substr(t.text, 1, 2000) as text_chunk
             FROM (
               SELECT rowid, distance FROM theology_vec
               WHERE embedding MATCH ?
               ORDER BY distance LIMIT ?
             ) nn
             JOIN theology t ON nn.rowid = t.rowid`,
            [qVec, fetchLimit]
          );
          console.log(`[VECTOR] Query time: ${Date.now() - _vecStart} ms`);
          console.log(`[VECTOR] Results returned: ${vecResults.length}`);

          // Run FTS alongside semantic to catch exact phrase matches
          let ftsResults = [];
          if (contentParts.length > 0) {
            try {
              const authorName = detectedAuthors.length > 0 ? THEOLOGY_AUTHORS[detectedAuthors[0]] : null;
              const ftsQuery = authorName
                ? `SELECT t.id, t.author, t.work, t.work_id,
                          t.locator, t.ccel_page_start, t.ccel_page_end,
                          substr(t.text, 1, 2000) as text_chunk,
                          substr(t.text, 1, 2000) as full_text
                   FROM theology_fts
                   JOIN theology t ON theology_fts.rowid = t.rowid
                   WHERE theology_fts MATCH ?
                   AND t.author = ?
                   LIMIT ?`
                : `SELECT t.id, t.author, t.work, t.work_id,
                          t.locator, t.ccel_page_start, t.ccel_page_end,
                          substr(t.text, 1, 2000) as text_chunk,
                          substr(t.text, 1, 2000) as full_text
                   FROM theology_fts
                   JOIN theology t ON theology_fts.rowid = t.rowid
                   WHERE theology_fts MATCH ?
                   LIMIT ?`;
              const ftsParams = authorName
                ? [contentParts.join(" "), authorName, limit * 10]
                : [contentParts.join(" "), limit * 10];
              const scoringTerms = [...phraseTerms, ...contentTerms];
              ftsResults = queryTheology(ftsQuery, ftsParams)
                .map(c => ({ ...c, _score: scoreTheologyChunk(c, scoringTerms) }))
                .sort((a, b) => b._score - a._score)
                .slice(0, limit)
                // eslint-disable-next-line no-unused-vars
                .map(({ _score, full_text, ...c }) => c);
            } catch (err) {
              console.warn("Inner FTS query failed during semantic search:", err.message);
            }
          }

          // Post-filter semantic results by author if specified
          if (detectedAuthors.length > 0) {
            const authorName = THEOLOGY_AUTHORS[detectedAuthors[0]];
            vecResults = vecResults.filter(r => r.author === authorName);
          }

          // FTS phrase matches rank first — exact phrase hits beat semantic approximations.
          // Semantic results fill remaining slots. This ensures "fear of the lord" verbatim
          // in the text wins over a semantically adjacent passage that doesn't say it.
          const seen = new Set(ftsResults.map(r => r.id));
          const merged = [...ftsResults];
          for (const r of vecResults) {
            if (!seen.has(r.id)) {
              merged.push(r);
              seen.add(r.id);
            }
            if (merged.length >= limit) break;
          }

          return merged.slice(0, limit);
        }
      } catch (semanticErr) {
        console.error("Theology semantic search failed, falling back to FTS:", semanticErr.message);
        // fall through to FTS-only path below
      }
    }

    // ── FTS4 fallback path ─────────────────────────────────────────────
    // Used when no vector embeddings exist or embedding model failed to load.
    if (!theologyVecAvailable) {
      console.warn("[VECTOR] Skipping semantic search — not available");
    }
    console.log("[FTS] Fallback search activated");
    let candidates = [];

    if (detectedAuthors.length > 0 && contentParts.length > 0) {
      const authorName = THEOLOGY_AUTHORS[detectedAuthors[0]];
      candidates = queryTheology(
        `SELECT t.id, t.author, t.work, t.work_id,
                t.locator, t.ccel_page_start, t.ccel_page_end,
                snippet(theology_fts, '', '', '…', 3, 50) as text_chunk,
                substr(t.text, 1, 2000) as full_text
         FROM theology_fts
         JOIN theology t ON theology_fts.rowid = t.rowid
         WHERE theology_fts MATCH ?
         AND t.author = ?
         LIMIT ?`,
        [contentParts.join(" "), authorName, limit * 30]
      );
    } else if (contentParts.length > 0) {
      candidates = queryTheology(
        `SELECT t.id, t.author, t.work, t.work_id,
                t.locator, t.ccel_page_start, t.ccel_page_end,
                snippet(theology_fts, '', '', '…', 3, 50) as text_chunk,
                substr(t.text, 1, 2000) as full_text
         FROM theology_fts
         JOIN theology t ON theology_fts.rowid = t.rowid
         WHERE theology_fts MATCH ?
         LIMIT ?`,
        [contentParts.join(" "), limit * 30]
      );
    } else {
      return [];
    }

    const scoringTerms = [
      ...detectedAuthors.map(a => `"${a}"`),
      ...phraseTerms,
      ...contentTerms,
    ];
    const results = candidates
      .map(c => ({ ...c, _score: scoreTheologyChunk(c, scoringTerms) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      // eslint-disable-next-line no-unused-vars
      .map(({ _score, full_text, ...c }) => c);
    return results;
  } catch (e) {
    console.error("Theology search error:", e.message, e.stack);
    return [];
  }
});

ipcMain.handle("theology-get-chunks", async (event, { ids, maxChars = 600 }) => {
  await ensureTheologyDbLoaded();
  if (!theologyDb || !ids || !ids.length) return [];
  try {
    const safeMax = Math.min(Math.max(parseInt(maxChars, 10) || 600, 100), 2000);
    const placeholders = ids.map(() => "?").join(",");
    return queryTheology(
      `SELECT id, author, work, work_id, locator, ccel_page_start, ccel_page_end,
              substr(text, 1, ?) as text_chunk
       FROM theology WHERE id IN (${placeholders})`,
      [safeMax, ...ids]
    );
  } catch (e) {
    console.error("Theology get chunks error:", e.message);
    return [];
  }
});

// ── Study Guide Export ────────────────────────────────────────────────────────
const SERIES_COLOR_HEX = {
  gold:    "b8860b",
  crimson: "8b1a1a",
  sage:    "4a6741",
  slate:   "2c3e50",
};

// Inline season name helper — churchCalendar.js is ESM and cannot be required here.
function getSeasonNameForExport(dateStr) {
  if (!dateStr) return null;
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const year = date.getFullYear();
    // Gregorian Easter computus
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const dd = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - dd - g + 15) % 30;
    const ii = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * ii - h - k) % 7;
    const m2 = Math.floor((a + 11 * h + 22 * l) / 451);
    const eMonth = Math.floor((h + l - 7 * m2 + 114) / 31);
    const eDay   = ((h + l - 7 * m2 + 114) % 31) + 1;
    const easter = new Date(year, eMonth - 1, eDay);
    const shift = (n) => { const r = new Date(easter); r.setDate(r.getDate() + n); return r; };
    const ashWed     = shift(-46);
    const palmSun    = shift(-7);
    const pentecost  = shift(49);
    const christmas  = new Date(year, 11, 25);
    const dec25Day   = christmas.getDay();
    const daysBack   = dec25Day === 0 ? 28 : dec25Day + 21;
    const adventStart = new Date(christmas);
    adventStart.setDate(adventStart.getDate() - daysBack);
    const epiphany = new Date(year, 0, 6);
    if (date < epiphany)     return "Christmas";
    if (date < ashWed)       return "Epiphany";
    if (date < palmSun)      return "Lent";
    if (date < easter)       return "Holy Week";
    if (date <= pentecost)   return "Easter";
    if (date < adventStart)  return "Ordinary Time";
    if (date < christmas)    return "Advent";
    return "Christmas";
  } catch { return null; }
}

function buildStudyGuideDoc(series, sections, sermons) {
  const { Document, Paragraph, TextRun, HeadingLevel } = require("docx");
  const accentHex = SERIES_COLOR_HEX[series.color] || SERIES_COLOR_HEX.gold;

  function hasContent(val) {
    return val != null && val.trim().length > 0;
  }

  function bodyParas(text) {
    return (text || "").split(/\n+/).filter(l => l.trim()).map(line =>
      new Paragraph({
        children: [new TextRun({ text: line.trim() })],
        spacing: { after: 100 },
      })
    );
  }

  function partHeading(text) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 160 },
      children: [new TextRun({ text, color: accentHex, bold: true })],
    });
  }

  function subHead(text) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text })],
    });
  }

  function secHead(text) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 80 },
      children: [new TextRun({ text, color: accentHex })],
    });
  }

  function spacer() {
    return new Paragraph({ text: "", spacing: { after: 60 } });
  }

  function sermonRows(list) {
    const rows = [];
    list.forEach((sermon, i) => {
      const labelParts = [];
      if (sermon.passage) labelParts.push(sermon.passage);
      if (sermon.title)   labelParts.push(sermon.title);
      const labelText = `${i + 1}. ${labelParts.join(" — ") || "Untitled"}`;
      const headerRuns = [new TextRun({ text: labelText, bold: true })];
      if (sermon.date) {
        const seasonName = getSeasonNameForExport(sermon.date);
        try {
          const [ys, ms, ds] = sermon.date.split("-").map(Number);
          const formatted = new Date(ys, ms - 1, ds)
            .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const dateText = seasonName ? `  ${formatted} (${seasonName})` : `  ${formatted}`;
          headerRuns.push(new TextRun({ text: dateText, color: "888888" }));
        } catch {}
      }
      rows.push(new Paragraph({
        children: headerRuns,
        spacing: { before: 160, after: 60 },
      }));
      if (hasContent(sermon.study_guide_note)) {
        sermon.study_guide_note.trim().split(/\n+/).filter(l => l.trim()).forEach(line => {
          rows.push(new Paragraph({
            children: [new TextRun({ text: line.trim() })],
            indent: { left: 360 },
            spacing: { after: 80 },
          }));
        });
      }
    });
    return rows;
  }

  const children = [];

  // Title block
  children.push(new Paragraph({
    children: [new TextRun({ text: series.title || "Study Guide", bold: true, color: accentHex, size: 48 })],
    spacing: { after: 120 },
  }));
  if (hasContent(series.passage_range)) {
    children.push(new Paragraph({
      children: [new TextRun({ text: series.passage_range, italics: true, size: 28 })],
      spacing: { after: 80 },
    }));
  }
  const dates = [series.start_date, series.end_date].filter(Boolean);
  if (dates.length > 0) {
    const dateRange = dates.map(d => {
      try {
        const [ys, ms, ds] = d.split("-").map(Number);
        return new Date(ys, ms - 1, ds).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      } catch { return d; }
    }).join(" — ");
    children.push(new Paragraph({
      children: [new TextRun({ text: dateRange, color: "888888", size: 22 })],
      spacing: { after: 480 },
    }));
  } else {
    children.push(spacer());
  }

  // PART 1 — THE WORLD OF THIS BOOK
  if (hasContent(series.book_background) || hasContent(series.book_argument) || hasContent(series.book_structure)) {
    children.push(partHeading("PART 1 — THE WORLD OF THIS BOOK"));
    if (hasContent(series.book_background)) {
      children.push(subHead("Then"));
      children.push(...bodyParas(series.book_background));
    }
    if (hasContent(series.book_argument) || hasContent(series.book_structure)) {
      children.push(subHead("The Argument"));
      if (hasContent(series.book_argument)) children.push(...bodyParas(series.book_argument));
      if (hasContent(series.book_structure)) {
        if (hasContent(series.book_argument)) children.push(spacer());
        children.push(...bodyParas(series.book_structure));
      }
    }
  }

  // PART 2 — WHY WE'RE HERE
  if (hasContent(series.redemptive_context) || hasContent(series.series_motivation)) {
    children.push(partHeading("PART 2 — WHY WE'RE HERE"));
    if (hasContent(series.redemptive_context)) {
      children.push(subHead("Where It Sits in the Story"));
      children.push(...bodyParas(series.redemptive_context));
    }
    if (hasContent(series.series_motivation)) {
      children.push(subHead("Why This Congregation, Why Now"));
      children.push(...bodyParas(series.series_motivation));
    }
  }

  // PART 3 — THE BIG IDEA
  if (hasContent(series.emerging_big_idea) || hasContent(series.big_idea) || hasContent(series.overview)) {
    children.push(partHeading("PART 3 — THE BIG IDEA"));
    if (hasContent(series.emerging_big_idea)) {
      children.push(subHead("Working Hypothesis"));
      children.push(...bodyParas(series.emerging_big_idea));
    }
    if (hasContent(series.big_idea)) {
      children.push(subHead("Series Big Idea"));
      children.push(...bodyParas(series.big_idea));
    }
    if (hasContent(series.overview)) {
      children.push(subHead("Overview"));
      children.push(...bodyParas(series.overview));
    }
  }

  // PART 4 — THE JOURNEY
  if (sermons.length > 0) {
    children.push(partHeading("PART 4 — THE JOURNEY"));
    const assignedIds = new Set();
    for (const section of sections) {
      const sectionSermons = sermons.filter(s => s.section_id === section.id);
      sectionSermons.forEach(s => assignedIds.add(s.id));
      if (!hasContent(section.title) && !hasContent(section.passage_range) &&
          !hasContent(section.big_idea) && !hasContent(section.overview) &&
          sectionSermons.length === 0) continue;
      if (hasContent(section.title)) children.push(secHead(section.title));
      if (hasContent(section.passage_range)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: section.passage_range, italics: true, size: 20 })],
          spacing: { after: 80 },
        }));
      }
      if (hasContent(section.big_idea)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: section.big_idea, italics: true })],
          spacing: { after: 80 },
        }));
      }
      if (hasContent(section.overview)) children.push(...bodyParas(section.overview));
      if (sectionSermons.length > 0) children.push(...sermonRows(sectionSermons));
    }
    const unsectioned = sermons.filter(s => !assignedIds.has(s.id));
    if (unsectioned.length > 0) {
      if (sections.length > 0) children.push(secHead("Remaining Sermons"));
      children.push(...sermonRows(unsectioned));
    }
  }

  // PART 5 — REFERENCE
  if (hasContent(series.structural_outline)) {
    children.push(partHeading("PART 5 — REFERENCE"));
    children.push(subHead("How the Book Is Built"));
    children.push(...bodyParas(series.structural_outline));
  }

  return new Document({ sections: [{ properties: {}, children }] });
}

ipcMain.handle("series-export-study-guide", async (_, seriesId) => {
  try {
    const series = queryOne("SELECT * FROM series WHERE id = ?", [seriesId]);
    if (!series) return { success: false, error: "Series not found" };

    const sections = queryAll(
      "SELECT * FROM series_sections WHERE series_id = ? ORDER BY sort_order ASC",
      [seriesId]
    );
    const sermons = queryAll(
      "SELECT * FROM sermons WHERE series_id = ? ORDER BY date ASC, created_at ASC",
      [seriesId]
    );

    const doc = buildStudyGuideDoc(series, sections, sermons);

    const studyGuidesDir = path.join(app.getPath("documents"), "SermonForge", "exports", "StudyGuides");
    if (!fs.existsSync(studyGuidesDir)) {
      fs.mkdirSync(studyGuidesDir, { recursive: true });
    }

    const safeTitle = (series.title || "Untitled").replace(/[<>:"/\\|?*\n\r\t]/g, "—").trim();
    const filepath = path.join(studyGuidesDir, `${safeTitle} — Study Guide.docx`);

    const { Packer } = require("docx");
    const buffer = await Packer.toBuffer(doc);
    await fs.promises.writeFile(filepath, buffer);

    return { success: true, filepath };
  } catch (e) {
    console.error("[series-export-study-guide]", e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle("sermon-export-pmb", async (_, { blocks, spine, title, passage, mps }) => {
  try {
    const { Document, Paragraph, TextRun, HeadingLevel } = require("docx");
    const { Packer } = require("docx");

    const children = [];

    function divider() {
      return new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [new TextRun({ text: "————————————————————", color: "AAAAAA" })],
      });
    }

    // Title block
    if (title || passage) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: title || passage || "Preaching Blocks", bold: true })],
      }));
    }
    if (passage && title) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: passage, color: "666666" })],
      }));
    }
    if (mps) {
      children.push(new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({ text: `MPS: ${mps}` })],
      }));
    }

    // Spine
    if (spine) {
      children.push(new Paragraph({
        spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: "SPINE", bold: true, allCaps: true, color: "888888", size: 32 })],
      }));
      children.push(new Paragraph({
        spacing: { after: 320 },
        children: [new TextRun({ text: spine, bold: true, size: 52 })],
      }));
    }

    function bullet(text) {
      return new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text })],
      });
    }

    // Blocks
    (blocks || []).forEach((block, i) => {
      if (i > 0) children.push(divider());

      // Block header: ID + movement
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({ text: `${block.id}  `, bold: true }),
          new TextRun({ text: (block.movement || "").toUpperCase(), color: "888888", allCaps: true }),
        ],
      }));

      // Outline point + scripture — orientation anchors, no label
      if (block.outline_point) {
        children.push(new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: block.outline_point, bold: true })],
        }));
      }
      if (block.scripture) {
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: block.scripture, color: "555555" })],
        }));
      }

      // Trigger phrase — the ignition key
      children.push(new Paragraph({
        spacing: { before: 80, after: 160 },
        children: [new TextRun({ text: block.trigger_phrase || "", bold: true, size: 56 })],
      }));

      // All supporting bullets — no labels, just scan order
      children.push(bullet(block.core_claim || ""));
      (block.memory_hooks || []).forEach(h => children.push(bullet(h)));
      if (block.imagery) children.push(bullet(block.imagery));

      // Transition out — plain line at the bottom, set apart
      if (block.transition_out) {
        children.push(new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [new TextRun({ text: `→ ${block.transition_out}`, color: "555555" })],
        }));
      }
    });

    const doc = new Document({
      styles: {
        default: { document: { run: { size: 40 } } },
      },
      sections: [{ properties: {}, children }],
    });

    const exportDir = path.join(app.getPath("documents"), "SermonForge", "exports", "PreachingBlocks");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const safeTitle = (title || passage || "Sermon").replace(/[<>:"/\\|?*\n\r\t]/g, "—").trim();
    const filepath = path.join(exportDir, `${safeTitle} — Preaching Blocks.docx`);

    const buffer = await Packer.toBuffer(doc);
    await fs.promises.writeFile(filepath, buffer);
    shell.openPath(filepath);

    return { success: true, filepath };
  } catch (e) {
    console.error("[sermon-export-pmb]", e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle("sermon-export-manuscript", async (_, payload) => {
  try {
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } = require("docx");
    const { Packer } = require("docx");

    const {
      title = "",
      passage = "",
      date = "",
      mpt = "",
      mps = "",
      introduction = {},
      transitions = {},
      conclusion = {},
      outline = [],
      functionalElements = {},
    } = payload || {};

    const children = [];

    function prosePara(text) {
      return new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text })],
      });
    }
    function divider() {
      return new Paragraph({
        spacing: { before: 200, after: 200 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "————————————————————", color: "AAAAAA" })],
      });
    }
    function transitionPara(text) {
      if (!text || !text.trim()) return null;
      return new Paragraph({
        spacing: { before: 200, after: 200 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, italics: true, color: "777777" })],
      });
    }

    // Title block
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
      children: [new TextRun({ text: title || "Untitled Sermon", bold: true })],
    }));
    if (passage) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: passage, color: "666666" })],
      }));
    }
    if (date) {
      children.push(new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({ text: date, color: "888888", size: 20 })],
      }));
    }
    if (mpt) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Main Point of the Text:  ", bold: true }),
          new TextRun({ text: mpt }),
        ],
      }));
    }
    if (mps) {
      children.push(new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({ text: "Main Point of the Sermon:  ", bold: true }),
          new TextRun({ text: mps }),
        ],
      }));
    }

    children.push(divider());

    // Introduction
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 160, after: 120 },
      children: [new TextRun({ text: "Introduction", bold: true })],
    }));
    if (introduction.opener)            children.push(prosePara(introduction.opener));
    if (introduction.scripture_reading) children.push(prosePara(introduction.scripture_reading));
    if (introduction.expectation)       children.push(prosePara(introduction.expectation));

    // Per-point sections
    outline.forEach((pt, i) => {
      const t = transitionPara(transitions[pt.id]);
      if (t) children.push(t);

      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 120 },
        children: [
          new TextRun({ text: `Point ${i + 1}.  `, bold: true }),
          new TextRun({ text: pt.text || "", bold: true }),
        ],
      }));

      const fe = functionalElements[pt.id] || {};
      if (fe.scripture) {
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: fe.scripture, italics: true, color: "555555" })],
        }));
      }
      if (fe.explanation)  children.push(prosePara(fe.explanation));
      if (fe.application)  children.push(prosePara(fe.application));
      if (fe.illustration) children.push(prosePara(fe.illustration));
    });

    // Transition into conclusion
    const ct = transitionPara(transitions.conclusion);
    if (ct) children.push(ct);

    // Conclusion
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: "Conclusion", bold: true })],
    }));
    if (conclusion.response) children.push(prosePara(conclusion.response));

    const doc = new Document({
      styles: {
        default: { document: { run: { size: 24 } } },
      },
      sections: [{ properties: {}, children }],
    });

    const exportDir = path.join(app.getPath("documents"), "SermonForge", "exports", "Manuscripts");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const safeTitle = (title || passage || "Sermon").replace(/[<>:"/\\|?*\n\r\t]/g, "—").trim();
    const filepath = path.join(exportDir, `${safeTitle} — Manuscript.docx`);

    const buffer = await Packer.toBuffer(doc);
    await fs.promises.writeFile(filepath, buffer);
    shell.openPath(filepath);

    return { success: true, filepath };
  } catch (e) {
    console.error("[sermon-export-manuscript]", e);
    return { success: false, error: e.message };
  }
});

// ── Feedback ──────────────────────────────────────────────────────────────────
ipcMain.handle("db-getSchemaVersion", () => {
  const row = queryOne("SELECT value FROM meta WHERE key = 'schema_version'");
  return { version: row ? row.value : "unknown" };
});

// Manual flush — called by the write-error banner's "Retry" button. Returns the
// flushDb result shape so the renderer can either dismiss the banner or keep it.
ipcMain.handle("db-flush", async () => flushDb());

// Pastor memory backup. Memory still lives in localStorage (per CORE.md — IPC
// round-trip on every AI call is too expensive to move it server-side). This
// is a write-through copy to a JSON file in userData so the pattern survives
// localStorage wipes (Electron major version upgrades, manual cache clear,
// migrate-to-new-machine). saveMemory in the renderer fires this fire-and-forget;
// loadMemory falls back to db-restoreMemory when localStorage is empty.
const MEMORY_BACKUP_PATH = path.join(app.getPath("userData"), "memory-backup.json");

ipcMain.handle("db-backupMemory", async (_, json) => {
  try {
    if (typeof json !== "string") return { ok: false, error: "memory must be a JSON string" };
    await fs.promises.writeFile(MEMORY_BACKUP_PATH, json, "utf8");
    return { ok: true };
  } catch (e) {
    logError("[memory-backup] write failed", e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("db-restoreMemory", async () => {
  try {
    if (!fs.existsSync(MEMORY_BACKUP_PATH)) return { ok: true, json: null };
    const json = await fs.promises.readFile(MEMORY_BACKUP_PATH, "utf8");
    return { ok: true, json };
  } catch (e) {
    logError("[memory-backup] read failed", e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("app-get-version", () => {
  return { version: app.getVersion() };
});

// Renderer compares the array it gets here to its mirror in
// src/constants/sermonColumns.js. Drift between the two re-introduces the
// silent-save bug class (renderer posts an unknown column → buildUpdate's
// dev-throw rejects the entire UPDATE). assertSchemaContract guards live
// schema vs main-side; this guards renderer mirror vs main-side.
ipcMain.handle("app-get-sermon-columns", () => {
  return { columns: [...SERMON_COLUMNS] };
});

// Opens the userData folder in the OS file manager. Wired to the OneDrive
// first-run modal so users can locate the data folder before relocating
// OneDrive sync away from it.
ipcMain.handle("app-open-data-folder", () => {
  return shell.openPath(paths.userData);
});

// Pulled by the renderer on mount to receive any one-shot startup warning
// (e.g. OneDrive). Pull-pattern avoids races against React mount that a
// webContents.send would lose. Returns null when nothing is pending; clears
// the slot on read so the next mount in the same process sees nothing.
ipcMain.handle("app-get-startup-warning", () => {
  const w = _pendingStartupWarning;
  _pendingStartupWarning = null;
  return w;
});

// ── API key setup ─────────────────────────────────────────────────────────────
ipcMain.handle("app-get-key-status", () => {
  return { configured: isConfigured() };
});

ipcMain.handle("app-save-api-key", (_, keys) => {
  const { anthropic, esv } = keys || {};
  if (typeof anthropic !== "string" || !anthropic.startsWith("sk-ant-") || anthropic.length < 20) {
    return { success: false, error: "Invalid Claude API key format." };
  }
  try {
    saveKeys({ anthropic, esv });
    resetClient();
    return { success: true };
  } catch (e) {
    console.error("[app-save-api-key]", e.message);
    return { success: false, error: e.message };
  }
});

const CATEGORY_LABELS = {
  bug:     "Bug",
  ux:      "UI/UX",
  ai:      "AI Quality",
  feature: "Missing Feature",
  copy:    "Content/Copy",
};

ipcMain.handle("feedback-submit", async (_, payload) => {
  try {
    const {
      category, currentView, schemaVersion, appVersion, submittedAt,
      // bug
      whatHappened, whatExpected,
      // ux
      whichPart, whatWrong,
      // ai
      whichStep, whatWrongAI, aiNotes,
      // feature
      whereInWorkflow, describeFeature,
      // copy
      whereIsText, whatItShouldSay,
    } = payload;

    const categoryLabel = CATEGORY_LABELS[category] || category;

    const lines = [];
    lines.push("---");
    lines.push(`Date: ${submittedAt}`);
    lines.push(`Type: ${categoryLabel}`);
    lines.push(`View: ${currentView || "unknown"}`);
    lines.push(`Schema: ${schemaVersion || "unknown"}`);
    lines.push(`App: ${appVersion || "unknown"}`);
    lines.push("---");
    lines.push("");

    if (category === "bug") {
      if (whatHappened?.trim()) {
        lines.push("## What were you doing?");
        lines.push(whatHappened.trim());
        lines.push("");
      }
      if (whatExpected?.trim()) {
        lines.push("## What did you expect?");
        lines.push(whatExpected.trim());
        lines.push("");
      }
    } else if (category === "ux") {
      if (whichPart?.trim()) {
        lines.push("## Which part of the app?");
        lines.push(whichPart.trim());
        lines.push("");
      }
      if (whatWrong?.trim()) {
        lines.push("## What felt wrong or confusing?");
        lines.push(whatWrong.trim());
        lines.push("");
      }
    } else if (category === "ai") {
      if (whichStep?.trim()) {
        lines.push("## Which step?");
        lines.push(whichStep.trim());
        lines.push("");
      }
      if (whatWrongAI?.trim()) {
        lines.push("## What was wrong with the response?");
        lines.push(whatWrongAI.trim());
        lines.push("");
      }
      if (aiNotes?.trim()) {
        lines.push("## Additional notes");
        lines.push(aiNotes.trim());
        lines.push("");
      }
    } else if (category === "feature") {
      if (whereInWorkflow?.trim()) {
        lines.push("## Where in the workflow?");
        lines.push(whereInWorkflow.trim());
        lines.push("");
      }
      if (describeFeature?.trim()) {
        lines.push("## What do you need?");
        lines.push(describeFeature.trim());
        lines.push("");
      }
    } else if (category === "copy") {
      if (whereIsText?.trim()) {
        lines.push("## Where is the text?");
        lines.push(whereIsText.trim());
        lines.push("");
      }
      if (whatItShouldSay?.trim()) {
        lines.push("## What should it say instead?");
        lines.push(whatItShouldSay.trim());
        lines.push("");
      }
    }

    if (category === "bug") {
      const recentLogs = readRecent(50);
      if (recentLogs) {
        // Redact obvious credential shapes before posting to a public-ish issue tracker.
        // sk-ant-... = Anthropic key; ghp_ / github_pat_ = GitHub PATs; "Token X" = ESV
        // Authorization header style. None of these should ever appear in app.log under
        // normal flow, but a future careless console.error on a payload would surface them.
        const redacted = recentLogs
          .replace(/sk-ant-[A-Za-z0-9_\-]+/g, "[REDACTED:anthropic]")
          .replace(/github_pat_[A-Za-z0-9_]+/g, "[REDACTED:github_pat]")
          .replace(/\bghp_[A-Za-z0-9]+/g, "[REDACTED:github_classic]")
          .replace(/Token\s+[A-Za-z0-9_\-]{16,}/g, "Token [REDACTED]");
        lines.push("## Error Log (last 50 lines)");
        lines.push("<details><summary>expand</summary>\n");
        lines.push("```");
        lines.push(redacted);
        lines.push("```");
        lines.push("\n</details>");
        lines.push("");
      }
    }

    const token = process.env.GITHUB_FEEDBACK_TOKEN;
    if (!token) {
      console.error("[feedback-submit] GITHUB_FEEDBACK_TOKEN not set in .env");
      return { success: false, error: "Feedback token not configured." };
    }

    const title = `[${categoryLabel}] ${currentView || "unknown"} — ${submittedAt.slice(0, 10)}`;
    const body = lines.join("\n");

    const response = await fetch("https://api.github.com/repos/teamofoxen/sermonforge/issues", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, labels: [category] }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[feedback-submit] GitHub API error:", response.status, text);
      return { success: false, error: `GitHub returned ${response.status}.` };
    }

    const issue = await response.json();
    console.log("[feedback-submit] Issue created:", issue.html_url);
    return { success: true, url: issue.html_url };
  } catch (e) {
    console.error("[feedback-submit]", e);
    return { success: false, error: e.message };
  }
});

// ── Bible passage fetch ───────────────────────────────────────────────────────
// In-memory caches — keyed by `esv|${passage}`
const _passageCache = new Map();

const OSIS_BOOK_IDS = {
  genesis:'GEN',gen:'GEN',exodus:'EXO',exo:'EXO',ex:'EXO',leviticus:'LEV',lev:'LEV',
  numbers:'NUM',num:'NUM',deuteronomy:'DEU',deut:'DEU',deu:'DEU',
  joshua:'JOS',josh:'JOS',jos:'JOS',judges:'JDG',judg:'JDG',jdg:'JDG',
  ruth:'RUT',rut:'RUT',
  '1 samuel':'1SA','1samuel':'1SA','1 sam':'1SA','1sam':'1SA',
  '2 samuel':'2SA','2samuel':'2SA','2 sam':'2SA','2sam':'2SA',
  '1 kings':'1KI','1kings':'1KI','1 kgs':'1KI','1kgs':'1KI',
  '2 kings':'2KI','2kings':'2KI','2 kgs':'2KI','2kgs':'2KI',
  '1 chronicles':'1CH','1chronicles':'1CH','1 chr':'1CH','1chr':'1CH','1 chron':'1CH',
  '2 chronicles':'2CH','2chronicles':'2CH','2 chr':'2CH','2chr':'2CH','2 chron':'2CH',
  ezra:'EZR',nehemiah:'NEH',neh:'NEH',esther:'EST',esth:'EST',job:'JOB',
  psalms:'PSA',psalm:'PSA',ps:'PSA',psa:'PSA',
  proverbs:'PRO',prov:'PRO',pro:'PRO',ecclesiastes:'ECC',eccl:'ECC',ecc:'ECC',
  'song of solomon':'SNG','song of songs':'SNG',song:'SNG',sos:'SNG',
  isaiah:'ISA',isa:'ISA',jeremiah:'JER',jer:'JER',lamentations:'LAM',lam:'LAM',
  ezekiel:'EZK',ezek:'EZK',ezk:'EZK',daniel:'DAN',dan:'DAN',
  hosea:'HOS',hos:'HOS',joel:'JOL',joe:'JOL',amos:'AMO',
  obadiah:'OBA',obad:'OBA',oba:'OBA',jonah:'JON',jon:'JON',
  micah:'MIC',mic:'MIC',nahum:'NAM',nah:'NAM',habakkuk:'HAB',hab:'HAB',
  zephaniah:'ZEP',zeph:'ZEP',zep:'ZEP',haggai:'HAG',hag:'HAG',
  zechariah:'ZEC',zech:'ZEC',zec:'ZEC',malachi:'MAL',mal:'MAL',
  matthew:'MAT',matt:'MAT',mat:'MAT',mark:'MRK',mrk:'MRK',mk:'MRK',
  luke:'LUK',lk:'LUK',john:'JHN',jn:'JHN',acts:'ACT',
  romans:'ROM',rom:'ROM',
  '1 corinthians':'1CO','1corinthians':'1CO','1 cor':'1CO','1cor':'1CO',
  '2 corinthians':'2CO','2corinthians':'2CO','2 cor':'2CO','2cor':'2CO',
  galatians:'GAL',gal:'GAL',ephesians:'EPH',eph:'EPH',
  philippians:'PHP',phil:'PHP',php:'PHP',colossians:'COL',col:'COL',
  '1 thessalonians':'1TH','1thessalonians':'1TH','1 thess':'1TH','1thess':'1TH',
  '2 thessalonians':'2TH','2thessalonians':'2TH','2 thess':'2TH','2thess':'2TH',
  '1 timothy':'1TI','1timothy':'1TI','1 tim':'1TI','1tim':'1TI',
  '2 timothy':'2TI','2timothy':'2TI','2 tim':'2TI','2tim':'2TI',
  titus:'TIT',tit:'TIT',philemon:'PHM',phlm:'PHM',phm:'PHM',
  hebrews:'HEB',heb:'HEB',james:'JAS',jas:'JAS',
  '1 peter':'1PE','1peter':'1PE','1 pet':'1PE','1pet':'1PE',
  '2 peter':'2PE','2peter':'2PE','2 pet':'2PE','2pet':'2PE',
  '1 john':'1JO','1john':'1JO','1 jn':'1JO','1jn':'1JO',
  '2 john':'2JO','2john':'2JO','2 jn':'2JO','2jn':'2JO',
  '3 john':'3JO','3john':'3JO','3 jn':'3JO','3jn':'3JO',
  jude:'JUD',revelation:'REV',rev:'REV',
};

function passageToOsisId(passage) {
  const p = passage.trim().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
  // Match: [optional leading number + space] book_name [space] chapter/verse_ref
  const m = p.match(/^((?:\d+\s+)?[a-zA-Z\s]+?)\s+(\d[\d:,\-]*)$/);
  if (!m) return null;
  const bookId = OSIS_BOOK_IDS[m[1].trim().toLowerCase()];
  if (!bookId) return null;
  const ref = m[2].trim();
  // "23" → whole chapter
  if (/^\d+$/.test(ref)) return `${bookId}.${ref}`;
  // "3:16" → single verse
  if (/^\d+:\d+$/.test(ref)) { const [c,v]=ref.split(':'); return `${bookId}.${c}.${v}`; }
  // "1:1-10" → range in same chapter
  if (/^\d+:\d+-\d+$/.test(ref)) {
    const [cv,ev]=ref.split('-'); const [c,vs]=cv.split(':');
    return `${bookId}.${c}.${vs}-${bookId}.${c}.${ev}`;
  }
  // "1:1-2:5" → cross-chapter range
  if (/^\d+:\d+-\d+:\d+$/.test(ref)) {
    const [s,e]=ref.split('-'); const [c1,v1]=s.split(':'); const [c2,v2]=e.split(':');
    return `${bookId}.${c1}.${v1}-${bookId}.${c2}.${v2}`;
  }
  // "1-5" → chapter range
  if (/^\d+-\d+$/.test(ref)) {
    const [c1,c2]=ref.split('-'); return `${bookId}.${c1}-${bookId}.${c2}`;
  }
  return null;
}

async function fetchEsvText(passage) {
  const esvKey = loadEsvKey();
  if (!esvKey) return null; // null = key not configured
  const cacheKey = `esv|${passage}`;
  if (_passageCache.has(cacheKey)) return _passageCache.get(cacheKey);
  const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(passage)}` +
    `&include-headings=false&include-footnotes=false&include-verse-numbers=true` +
    `&include-short-copyright=false&include-passage-references=false`;
  const res = await fetch(url, { headers: { 'Authorization': `Token ${esvKey}` } });
  if (!res.ok) throw new Error(`ESV API HTTP ${res.status}`);
  const json = await res.json();
  const text = (json.passages || []).join('\n\n').trim();
  _passageCache.set(cacheKey, text);
  return text;
}

ipcMain.handle('passage-fetch', async (_, passage) => {
  const result = { esv: null, esvPending: false };

  try {
    const t = await fetchEsvText(passage);
    if (t === null) result.esvPending = true;
    else result.esv = t;
  } catch (e) {
    result.esvError = e.message;
  }

  return result;
});

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  logInfo(`SermonForge ${app.getVersion()} starting`);
  createWindow();              // splash visible immediately
  await initDatabase();
  maybeWarnOneDrive();         // populates the startup-warning slot before renderer mounts
  loadAppContent();            // swap splash → real app
  initUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit sequence:
//   1. before-quit fires (covers menu Quit, Cmd-Q, Alt-F4, taskbar Close).
//   2. preventDefault holds the process open while flushDb completes (await).
//   3. Native DB closes after the flush (theology is read-only; close after
//      the flush settles).
//   4. app.exit(0) terminates without re-entering the handler (_isQuitting guard).
// Without this sequencing the previous code raced flushDb against app.quit() and
// could lose the in-flight write itself, not just the 500 ms debounce window.
app.on("before-quit", async (e) => {
  if (_isQuitting) return; // re-entry guard; second pass falls through to default quit
  _isQuitting = true;
  e.preventDefault();
  if (db) {
    try { await flushDb(); } catch (err) { logError("[quit] flushDb threw", err); }
  }
  if (theologyDb) { try { theologyDb.close(); } catch (_) {} }
  theologyDb = null;
  theologyVecAvailable = false;
  app.exit(0);
});

// Keep the macOS dock-quit semantics: closing all windows on Win/Linux quits;
// macOS keeps the app alive until before-quit. before-quit handles the flush.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
