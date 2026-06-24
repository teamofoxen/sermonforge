const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { randomUUID } = require("crypto");
const { isDev, paths, legacyDbPaths, devServerUrl } = require("./config");
const { logInfo, logError } = require("./logger");
const {
  STAGE, STAGE_SEQUENCE,
  SUB_PHASE, SUB_PHASE_CANONICAL_SEQUENCE,
  STUDY_SUB_PHASE_SEQUENCE, ASSEMBLY_SUB_PHASE_SEQUENCE,
  SUB_PHASE_STAGE,
  SERMON_STATUS, SERIES_STATUS,
  MUTATION_KIND,
  SERMON_COLUMNS, SERIES_COLUMNS, SECTION_COLUMNS,
  STRUCTURED_FIELDS,
  ContractViolation,
} = require("./contracts.cjs");
const { buildStudyGuideModel } = require("./studyGuideModel.cjs");

// coerceLegacyStage removed in the trail deletion sweep (Phase B3) —
// pre-restructure "Blueprint" / "Frame" stage values are no longer admitted
// or coerced. No production data carries them. Delivery's separate
// defensive-tolerance (ARI Phase 7) is a different concern and stays.
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

const { saveKeys, loadEsvKey } = require("./keystore");
const { initUpdater, getUpdaterStatus, restartAndInstall } = require("./updater");
const { buildApplicationMenu } = require("./menu");
const { SUPPORT_EMAIL } = require("./support");
const telemetryBus = require("./telemetry/bus");
const BetterSqlite3 = require("better-sqlite3");
const sqliteVec = require("sqlite-vec");

let db = null;           // better-sqlite3 instance for sermonforge.db (file-backed, WAL)
let dbPath = null;
let theologyDb = null;   // better-sqlite3 instance for theology.db (+ sqlite-vec)
let mainWindow;
let _firstLaunch = false;  // true when sermonforge.db did not exist at initDatabase entry; drives the first-run OneDrive modal
// Startup warnings queue — initDatabase and maybeWarnOneDrive PUSH here;
// the renderer pulls one per app-get-startup-warning call in severity
// order, so a OneDrive nag can never overwrite a corruption-recovery
// message (the overlap cohort is exactly the highest-corruption-risk one).
let _pendingStartupWarnings = [];
const STARTUP_WARNING_PRIORITY = [
  "db_corrupt_quarantined",
  "db_recovered_backup",
  "db_migrated",
  "onedrive-first-run",
  "onedrive",
];
let _appOpenEmitted = false; // app-open telemetry emits exactly once per session, and only after consent
let _initError = null; // set when initDatabase aborts to protect data (locked file / failed migration); whenReady shows it and quits
let _rendererReloads = 0; // bounded auto-reloads after a renderer crash before giving up

// Emit the session's single app-open event. On first run we defer this until
// the user has seen the BTI disclosure on the SetupScreen and made a choice
// (telemetry-set-enabled), so nothing leaves the device pre-consent. Returning
// users emit it at boot. Idempotent — safe to call from both paths.
function emitAppOpenOnce() {
  if (_appOpenEmitted) return;
  _appOpenEmitted = true;
  try {
    telemetryBus.emit("app-open", { version: app.getVersion(), platform: process.platform });
  } catch (err) {
    logError("[telemetry] app-open emit failed", err);
  }
}

const { migrateLegacyDb } = require("./dbMigration");

// ── Database setup ──────────────────────────────────────────────────────────
// sermonforge.db runs on better-sqlite3 (the same native driver theology.db
// has shipped on since launch). Writes are real journaled SQLite commits —
// durable the moment each IPC write handler returns. The previous sql.js
// architecture (whole-DB serialize per write behind a 500ms debounce, with a
// tmp+fsync+rotate flush pipeline) is gone; WAL journaling plus a boot-time
// .bak copy replaces it. The quick_check probe, lock-vs-corruption
// classification, quarantine, and legacy-path resolver all survive unchanged
// in intent.
async function initDatabase() {
  const dataDir = paths.userData;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, "sermonforge.db");
  const bakPath = dbPath + ".bak";
  _firstLaunch = !fs.existsSync(dbPath);

  // Try the main DB first. If it's corrupt, fall back to the .bak written at
  // the previous successful boot. If .bak is also bad, rename the corrupt
  // original to <dbPath>.corrupt-<ts> (so manual recovery is possible) and
  // start fresh — never silently overwrite a damaged DB.
  //
  // Classify an open/probe failure. Lock / permission / IO errors are TRANSIENT —
  // the file is healthy, something else is holding it (antivirus scan, OneDrive
  // sync, backup tool). These must NEVER be treated as corruption: quarantining
  // or starting fresh on a transient lock is exactly how a healthy library gets
  // destroyed. A quick_check failure, by contrast, is real corruption.
  function classifyReadError(err) {
    const transient = new Set([
      // fs-level lock/IO codes
      "EBUSY", "EPERM", "EACCES", "EMFILE", "ENFILE", "EIO", "EAGAIN", "ETXTBSY",
      // SQLite-level lock codes (better-sqlite3 sets err.code to the constant name)
      "SQLITE_BUSY", "SQLITE_LOCKED", "SQLITE_PROTOCOL",
    ]);
    return transient.has(err?.code) ? "transient" : "corrupt";
  }

  function tryLoad(p) {
    let candidate;
    try {
      candidate = new BetterSqlite3(p, { fileMustExist: true });
    } catch (openErr) {
      openErr._sfClass = classifyReadError(openErr);
      throw openErr; // tagged so the caller can tell a lock from corruption
    }
    // PRAGMA quick_check forces a structural scan: it catches page-level damage
    // that a plain open accepts and that a shallow `sqlite_master` read would
    // pass — exactly the torn-write / sync-conflict shape. Cheap on
    // pastor-sized DBs (well under ~500 sermons).
    let verdict;
    try {
      const rows = candidate.pragma("quick_check");
      verdict = rows?.[0]?.quick_check;
    } catch (probeErr) {
      try { candidate.close(); } catch { /* ignore */ }
      probeErr._sfClass = classifyReadError(probeErr);
      throw probeErr;
    }
    if (verdict !== "ok") {
      try { candidate.close(); } catch { /* ignore */ }
      const e = new Error(`quick_check failed: ${verdict}`);
      e._sfClass = "corrupt";
      throw e;
    }
    return candidate;
  }

  // Pragmas for the ACTIVE connection only. tryLoad stays pure (read-probe) so
  // legacy candidates are never converted; the active DB gets WAL journaling
  // (crash safety: a hard kill mid-write replays cleanly on next open) and
  // NORMAL synchronous (the safe WAL pairing).
  function applyConnectionPragmas(conn) {
    conn.pragma("journal_mode = WAL");
    conn.pragma("synchronous = NORMAL");
  }

  const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Retry a load only for transient (lock) errors — give a scanner / sync agent
  // a moment to release the file. Corruption is never retried (it won't change).
  async function loadWithRetry(p, attempts = 3, delayMs = 300) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        return tryLoad(p);
      } catch (e) {
        lastErr = e;
        if (e._sfClass !== "transient" || i === attempts - 1) throw e;
        await _sleep(delayMs);
      }
    }
    throw lastErr;
  }

  function quarantineCorrupt(p) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const q = `${p}.corrupt-${stamp}`;
    try {
      fs.renameSync(p, q);
      logError(`[DB] quarantined unreadable DB to ${q}`);
      return q;
    } catch (e) {
      logError(`[DB] failed to quarantine unreadable DB at ${p}`, e);
      return null;
    }
  }

  // Counts content rows (sermons + series). Drives the legacy-migration
  // trigger below: a row-less DB at the active path means the user's real
  // library is sitting at a prior install location, so we look there before
  // letting them launch into an empty workspace. Fail-soft when tables don't
  // exist (older schemas, unrecognized SQLite files) — treats those as 0.
  function countContentRows(handle) {
    if (!handle) return 0;
    let total = 0;
    const countOf = (sql) => {
      try {
        return Number(handle.prepare(sql).pluck().get() ?? 0);
      } catch { return 0; } // table missing — treat as 0
    };
    // Sample-sermon rows (id LIKE 'sample-%') are NOT real content: every
    // user-facing query excludes them, so the user sees an empty library.
    // Counting them here would (a) suppress legacy recovery after a single
    // "Open a sample sermon" click and (b) let a sample-only legacy DB outrank a
    // real one-sermon DB in the resolver's row-count ranking.
    total += countOf("SELECT COUNT(*) FROM sermons WHERE id NOT LIKE 'sample-%'");
    total += countOf("SELECT COUNT(*) FROM series WHERE id NOT LIKE 'sample-%'");
    // Calendar planning is real user content too — a pastor who planned a
    // preaching calendar before drafting any sermon must not read as "empty"
    // (which would let a legacy DB overwrite their plan, or strand it as a
    // skipped candidate).
    total += countOf("SELECT COUNT(*) FROM calendar_notes");
    return total;
  }

  // ── Phase 1 — establish a working `db` handle ────────────────────────────
  // No migration logic here; this section only decides whether we have a
  // primary, fall back to a `.bak`, quarantine a corrupt file, or bootstrap
  // an empty in-memory DB. Migration runs in Phase 2 against whatever
  // emerges, so the corrupt-then-empty path also gets a recovery shot.
  // Reused by every "the file is healthy but held by another process" abort.
  const LOCK_MESSAGE =
    "SermonForge couldn't open your library because another program is using the " +
    "file — usually antivirus, a backup tool, or OneDrive syncing. Close those or " +
    "wait a moment, then reopen SermonForge. Your sermons are safe and untouched.";

  let recoveredFromBak = false;

  if (fs.existsSync(dbPath)) {
    try {
      db = await loadWithRetry(dbPath);
    } catch (primaryErr) {
      if (primaryErr._sfClass === "transient") {
        // Healthy-but-locked. Do NOT quarantine or start fresh — that destroys a
        // good library. Abort the boot; whenReady shows the message and quits,
        // leaving every file untouched so a relaunch (once the lock clears) works.
        logError(`[DB] primary DB temporarily unreadable (locked) at ${dbPath}; aborting boot to protect data`, primaryErr);
        _initError = { kind: "db_locked", message: LOCK_MESSAGE };
        return;
      }
      // Genuine corruption. Quarantine the primary FIRST — the connection is
      // file-backed, so a .bak restore is a file copy INTO dbPath and the
      // damaged original must be out of the way before the copy lands.
      logError(`[DB] primary DB corrupt at ${dbPath}; quarantining and trying .bak`, primaryErr);
      const q = quarantineCorrupt(dbPath);
      if (!q && fs.existsSync(dbPath)) {
        // Rename refused (typically a lock). Don't copy over the original —
        // abort and protect every file, same as the transient path.
        logError(`[DB] could not quarantine corrupt primary (likely locked); aborting boot to protect data`);
        _initError = { kind: "db_locked", message: LOCK_MESSAGE };
        return;
      }
      if (fs.existsSync(bakPath)) {
        try {
          fs.copyFileSync(bakPath, dbPath); // .bak itself stays in place as the second copy
          db = await loadWithRetry(dbPath);
          recoveredFromBak = true;
          logInfo(`[DB] restored backup from ${bakPath} after primary corruption`);
        } catch (bakErr) {
          if (bakErr._sfClass === "transient") {
            logError(`[DB] .bak temporarily unreadable (locked); aborting boot to protect data`, bakErr);
            _initError = { kind: "db_locked", message: LOCK_MESSAGE };
            return;
          }
          logError(`[DB] .bak also corrupt; starting fresh`, bakErr);
          // Remove the bad restore copy (the original .bak is preserved on disk).
          try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
          db = null;
        }
      }
      if (recoveredFromBak) {
        _pendingStartupWarnings.push({
          kind: "db_recovered_backup",
          message: `SermonForge restored your library from its automatic backup after the main file was damaged. Your most recent one or two edits may be missing. The damaged file was kept aside for recovery — email ${SUPPORT_EMAIL} if you need it.`,
        });
      } else if (!db) {
        // Both primary and .bak are corrupt. The primary is quarantined (kept
        // on disk for manual recovery); start fresh at the active path.
        db = new BetterSqlite3(dbPath);
        _pendingStartupWarnings.push({
          kind: "db_corrupt_quarantined",
          message:
            "SermonForge couldn't read your library or its backup, so it started a fresh one. Your original file was NOT deleted — it was kept aside" +
            (q ? ` as ${path.basename(q)}` : "") +
            ` in your data folder. Please email ${SUPPORT_EMAIL} before doing more work so we can try to recover it.`,
          path: q,
        });
      }
    }
  } else if (fs.existsSync(bakPath)) {
    // Primary missing but backup present (a crash between steps, or the
    // primary deleted by AV / disk cleanup). Restore by copy, then open.
    try {
      fs.copyFileSync(bakPath, dbPath);
      db = await loadWithRetry(dbPath);
      recoveredFromBak = true;
      logInfo(`[DB] restored backup; primary missing`);
      _pendingStartupWarnings.push({
        kind: "db_recovered_backup",
        message: "SermonForge restored your library from its automatic backup after the main file went missing. Your most recent one or two edits may be missing.",
      });
    } catch (e) {
      if (e._sfClass === "transient" || classifyReadError(e) === "transient") {
        logError(`[DB] .bak temporarily unreadable (locked); aborting boot to protect data`, e);
        _initError = { kind: "db_locked", message: LOCK_MESSAGE };
        return;
      }
      logError(`[DB] backup unreadable, starting fresh`, e);
      try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
      db = new BetterSqlite3(dbPath);
      _pendingStartupWarnings.push({
        kind: "db_corrupt_quarantined",
        message: `SermonForge couldn't read your library backup, so it started a fresh one. If you had sermons before, email ${SUPPORT_EMAIL} before doing more work so we can try to recover them.`,
      });
    }
  } else {
    db = new BetterSqlite3(dbPath); // genuine fresh install — creates the file
  }
  applyConnectionPragmas(db);

  // ── Phase 2 — content-aware legacy migration ─────────────────────────────
  // The Phase-1 db has 0 content rows iff: the active path is missing
  // (fresh-install at a new userData location), OR exists but is just an
  // empty schema (a prior empty initialization at the new path — exactly the
  // 2026-05-02 incident), OR fell through corrupt-fallback to a fresh
  // empty file. In all three cases, the user's real library may
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
  // Phase 2 runs at most once per active-path lifetime. The marker records "we
  // already resolved legacy data for this location." Without it, a user who
  // deliberately empties their library re-triggers the resolver on EVERY boot —
  // resurrecting deleted sermons, rolling settings/calendar back to the legacy
  // file's state, and accumulating .precovery-empty-* files without bound.
  const legacyMarkerPath = path.join(dataDir, ".sf-legacy-checked");
  let legacyMigrated = false;
  if (countContentRows(db) === 0 && !fs.existsSync(legacyMarkerPath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    // The resolver copies a winner over the active path, and the active
    // connection is file-backed — close it before any copy lands (Windows
    // will not tolerate overwriting an open database file). close() also
    // checkpoints WAL, so the file copies below are complete.
    try { db.close(); } catch { /* ignore */ }
    db = null;
    // A fresh install just created an empty shell at dbPath — nothing worth a
    // precovery copy. Existing-but-empty files keep the backup as before.
    if (!_firstLaunch && fs.existsSync(dbPath)) {
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
    // migrateLegacyDb closes every candidate handle (including the winner)
    // and returns { source } — file-backed connections are path-bound, so the
    // active DB is reopened at dbPath below either way.
    const migrated = migrateLegacyDb({
      activePath: dbPath,
      candidatePaths: legacyDbPaths,
      tryLoad,
      countRows: countContentRows,
      logger: { info: logInfo, error: logError },
    });
    try {
      db = await loadWithRetry(dbPath);
    } catch (e) {
      // The file at the active path failed to reopen after the resolver pass —
      // abort to protect data rather than improvising a fresh DB on top of it.
      logError(`[DB] could not reopen active DB after legacy resolution; aborting boot`, e);
      _initError = { kind: "db_locked", message: LOCK_MESSAGE };
      return;
    }
    applyConnectionPragmas(db);
    if (migrated) {
      legacyMigrated = true;
      _pendingStartupWarnings.push({
        kind: "db_migrated",
        message: `Restored your library from a previous install location (${migrated.source}). The original file is preserved there as a backup.`,
      });
    }
    // Mark this active path resolved whether or not a winner was found — we
    // looked once; we don't keep overwriting the active DB on later boots.
    try {
      fs.writeFileSync(legacyMarkerPath, new Date().toISOString());
    } catch (e) {
      logError(`[DB] failed to write legacy-checked marker`, e);
    }
  }

  // Boot-time backup: one good copy per launch. The open above passed
  // quick_check; the checkpoint folds any replayed WAL into the main file, and
  // the copy lands BEFORE bootstrap/migrations write anything — so .bak is
  // also the pre-migration recovery point for a shipped migration bug.
  // Skipped on a true first launch (an empty shell isn't worth backing up),
  // but a legacy-migrated-in library on a first launch at a new path is.
  if (!_firstLaunch || legacyMigrated) {
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
      fs.copyFileSync(dbPath, bakPath);
    } catch (e) {
      logError(`[DB] boot-time .bak copy failed (continuing — writes are still journaled)`, e);
    }
  }

  // Bootstrap-only schema. All subsequent schema changes MUST go through
  // runMigrations() below — do not add or alter tables in this block.
  dbRun(`
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
      -- topic_theme / audience_assumptions / background_noise removed in
      -- the trail deletion sweep (Phase B1). Legacy PC columns, retired.
      study_guide_note TEXT DEFAULT '',
      -- v23 (Phase D1): session re-entry routing.
      last_touched_position TEXT DEFAULT NULL,
      thresholds_seen TEXT NOT NULL DEFAULT '[]',
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

  let migrationsRan = false;
  try {
    // The whole migration pass runs inside ONE transaction: a thrown migration
    // rolls every statement back, so the on-disk DB stays pristine for a fixed
    // build. (SQLite DDL is transactional; sql.js got the same guarantee by
    // discarding the in-memory image — this is the file-backed equivalent.)
    migrationsRan = db.transaction(runMigrations)();
  } catch (e) {
    // A migration threw (a shipped migration bug, or a deviant restored DB).
    // The transaction rolled back — the on-disk DB is untouched. Surface a
    // clear message rather than hanging on the splash or quietly persisting a
    // half-migrated image.
    logError("[DB] runMigrations threw — transaction rolled back, on-disk DB untouched", e);
    _initError = {
      kind: "migration_failed",
      message: `SermonForge couldn't finish updating your library to this version. Your sermons are safe and were not changed. Please reopen the app; if this keeps happening, email ${SUPPORT_EMAIL} so we can fix the update.`,
    };
    try { db.close(); } catch { /* ignore */ }
    db = null; // ensure no later flush (quit handler included) persists a partial image
    return;
  }

  // Schema contract guard — runs after migrations + FTS setup. Logs only.
  // See assertSchemaContract() below for rationale.
  try { assertSchemaContract(); } catch (e) { logError("[DB] assertSchemaContract threw", e); }

}

// With better-sqlite3 every write commits durably as it happens — there is no
// serialize-and-rotate pipeline and no debounce window. flushDb survives as a
// WAL checkpoint so its callers (the banner's Retry button via "db-flush", and
// any belt-and-braces flush sites) keep a meaningful, honest contract: after
// it resolves ok, everything committed is folded into the main DB file.
function flushDb() {
  if (!db || !dbPath) return { ok: true, skipped: true };
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
    return { ok: true };
  } catch (e) {
    logError("[DB] wal_checkpoint failed", e);
    return { ok: false, error: e.message };
  }
}

// ── Lazy theology loader (better-sqlite3 + sqlite-vec) ──────────────────────
// theology.db is managed by better-sqlite3 with the sqlite-vec extension
// loaded; sermonforge.db (also better-sqlite3 since the 2026-06-10 driver
// swap) never loads extensions. Keep the two connections separate.
let theologyVecAvailable = false;  // true when theology_vec table has embeddings
const embedderHost = require("./embedder/host"); // worker_thread-backed; see electron/embedder/host.js

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
// Delegates to embedder/host.js, which runs the @xenova/transformers pipeline
// in a worker_thread.
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
    dbRun(sql);
    return true;
  } catch (e) {
    const msg = String(e?.message || e).toLowerCase();
    if (msg.includes("duplicate column name")) return false; // column exists, skip
    throw e;
  }
}

function runMigrations() {
  dbRun(`CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  const row = queryOne("SELECT value FROM meta WHERE key = 'schema_version'");
  let version = row ? parseInt(row.value, 10) : 0;
  // Guard against a non-numeric schema_version (corruption of just this value, or
  // hand-tampering). Left as NaN, every `version < N` guard is false and ALL
  // migrations silently skip forever — a degraded install that never heals. The
  // migration blocks are idempotent (safeAlter no-ops, CREATE IF NOT EXISTS,
  // WHERE-guarded backfills), so resetting to 0 re-runs them safely.
  if (!Number.isInteger(version)) {
    logError(`[DB] meta.schema_version is non-numeric ("${row?.value}"); resetting to 0 and re-running idempotent migrations`);
    version = 0;
  }
  const initialVersion = version;

  // IMPORTANT: each block updates `version` after running so subsequent blocks
  // see the correct current version, not the original value. Blocks must stay
  // in ascending version order.

  if (version < 2) {
    // v2: add functional_elements and checklist to sermons (no-op on fresh installs)
    safeAlter("ALTER TABLE sermons ADD COLUMN functional_elements TEXT DEFAULT '{}'");
    safeAlter("ALTER TABLE sermons ADD COLUMN checklist TEXT DEFAULT '{}'");
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2')");
    version = 2;
  }

  if (version < 3) {
    // v3: previously created the sermon library table + FTS index. The library
    // feature has been removed; the migration body is empty but the version
    // bump is preserved so the migration sequence stays intact.
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '3')");
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
    dbRun(`CREATE TABLE IF NOT EXISTS series_sections (
      id TEXT PRIMARY KEY,
      series_id TEXT NOT NULL,
      title TEXT DEFAULT '',
      passage_range TEXT DEFAULT '',
      big_idea TEXT DEFAULT '',
      overview TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    dbRun(`CREATE TABLE IF NOT EXISTS calendar_notes (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT DEFAULT 'special',
      label TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '4')");
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

      dbRun(
        "UPDATE sermons SET outline = ?, functional_elements = ? WHERE id = ?",
        [JSON.stringify(newOutline), JSON.stringify(newFE), sermon.id]
      );
    }

    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '5')");
    version = 5;
  }

  if (version < 6) {
    // v6 was the legacy PC columns (topic_theme, audience_assumptions,
    // background_noise) — retired in the trail deletion sweep (Phase B1).
    // The columns may still exist in older databases; SERMON_COLUMNS no
    // longer admits writes to them, and they're not read anywhere. Version
    // bump preserved so the migration loop progresses past v6 cleanly.
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '6')");
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
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '7')");
    version = 7;
  }

  if (version < 8) {
    // v8: preaching_blocks — CMC (Contour-Mapped Compression) without-notes output
    safeAlter("ALTER TABLE sermons ADD COLUMN preaching_blocks TEXT DEFAULT 'null'");
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '8')");
    version = 8;
  }

  if (version < 9) {
    // v9: manuscript_delivery — AI-formatted delivery manuscript
    safeAlter("ALTER TABLE sermons ADD COLUMN manuscript_delivery TEXT DEFAULT 'null'");
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '9')");
    version = 9;
  }

  if (version < 10) {
    // v10: clean up rows seeded by the removed "See Demo" feature.
    dbRun("DELETE FROM sermons WHERE id LIKE 'demo-%'");
    dbRun("DELETE FROM series  WHERE id LIKE 'demo-%'");
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '10')");
    version = 10;
  }

  if (version < 11) {
    // v11: drop sermons.big_idea — superseded by mpt/mps, never populated.
    try { dbRun("ALTER TABLE sermons DROP COLUMN big_idea"); } catch (_) {}
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '11')");
    version = 11;
  }

  if (version < 12) {
    // v12: last_tune_up — JSON wrapper {content, ts} for the most recent Tune-Up response.
    // Persisted only after a successful Final Tune-Up run on the Manuscript tab.
    safeAlter("ALTER TABLE sermons ADD COLUMN last_tune_up TEXT DEFAULT NULL");
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '12')");
    version = 12;
  }

  if (version < 13) {
    // v13: settings table — user preferences as key/value strings.
    // Distinct from `meta` (which is for system-managed schema state).
    dbRun(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '13')");
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
    // topic_theme / audience_assumptions / background_noise removed from the
    // defensive backfill in the trail deletion sweep (Phase B1). Old
    // databases with these columns keep them as orphans; new databases never
    // get them.
    safeAlter("ALTER TABLE sermons ADD COLUMN study_guide_note TEXT DEFAULT ''");
    safeAlter("ALTER TABLE sermons ADD COLUMN preaching_blocks TEXT DEFAULT 'null'");
    safeAlter("ALTER TABLE sermons ADD COLUMN manuscript_delivery TEXT DEFAULT 'null'");
    safeAlter("ALTER TABLE sermons ADD COLUMN last_tune_up TEXT DEFAULT NULL");
    // v23 columns folded into the defensive backfill — the same swallowed-
    // catch pattern as the columns above. safeAlter is a no-op when present.
    safeAlter("ALTER TABLE sermons ADD COLUMN last_touched_position TEXT DEFAULT NULL");
    safeAlter("ALTER TABLE sermons ADD COLUMN thresholds_seen TEXT NOT NULL DEFAULT '[]'");
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
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '14')");
    version = 14;
  }

  if (version < 15) {
    // v15: previously added content_hash to the library table. The library
    // feature has been removed; the migration body is empty but the version
    // bump is preserved so the migration sequence stays intact.
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '15')");
    version = 15;
  }

  if (version < 16) {
    // v16: collapse sermon stage + series status to a two-state lifecycle.
    // The 5 intermediate sermon stages (planning/study/outline/writing/ready)
    // and 2 intermediate series statuses (planning/active) duplicated the
    // workspace tab's in-progress position; "archived" was the only true
    // lifecycle terminus. See docs/CORE.md State Contract clauses 5 + 6.
    dbRun(
      `UPDATE sermons SET stage = '${SERMON_STATUS.InProgress}'
         WHERE stage IN ('planning','study','outline','writing','ready')`
    );
    dbRun(`UPDATE sermons SET stage = '${SERMON_STATUS.Complete}' WHERE stage = 'archived'`);
    dbRun(
      `UPDATE series SET status = '${SERIES_STATUS.InProgress}'
         WHERE status IN ('planning','active')`
    );
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '16')");
    version = 16;
  }

  if (version < 17) {
    // v17: spine prerequisites — canonical process-position columns. State
    // Contract #2 ("every sermon has a canonical position in the process …
    // queryable from any surface that touches the sermon") cannot be
    // enforced while position lives only in component state and localStorage.
    // These columns become the canonical position store; the spine writes
    // them via transitionState and reads them via getSermon.
    //
    // Phase G (2026-05-18) gravestone: this migration also used to insert
    // a `legacy_evidence_cutoff` meta row to carve out sermons created
    // before the Process Contract #2 enforcement pass. The empty-evidence
    // gate was deleted in Phase G; the cutoff insertion no longer runs.
    // Deployed databases that ran the original v17 retain the meta row as
    // orphaned residue — no runtime code reads it anymore. A fresh v17
    // does not write the row.
    const sermonInfo = queryAll("PRAGMA table_info(sermons)");
    const have = new Set(sermonInfo.map(r => r.name));
    if (!have.has("current_stage")) {
      dbRun(`ALTER TABLE sermons ADD COLUMN current_stage TEXT NOT NULL DEFAULT '${STAGE.Study}'`);
    }
    // current_step column add removed in the trail deletion sweep (Phase B2).
    // Position is now (stage, sub_phase) only; old databases that still
    // carry the column keep it as an orphan — SERMON_COLUMNS no longer
    // admits writes.
    if (!have.has("current_sub_phase")) {
      dbRun("ALTER TABLE sermons ADD COLUMN current_sub_phase TEXT");
    }
    // Backfill: any sermon in_progress at Study stage (the schema default)
    // gets a starting SubPhase so getSermon's ProcessPosition is fully
    // populated for new sermons too. Canonical position is (stage,
    // sub_phase) — current_step was retired in Phase B2.
    dbRun(
      `UPDATE sermons
         SET current_sub_phase = ?
       WHERE current_stage = ? AND current_sub_phase IS NULL`,
      [SUB_PHASE.Observe, STAGE.Study]
    );
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '17')");
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
      dbRun("ALTER TABLE sermons ADD COLUMN sermon_frame TEXT DEFAULT NULL");
    }
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '18')");
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
      dbRun("ALTER TABLE sermons ADD COLUMN main_point_pair TEXT DEFAULT NULL");
    }
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '19')");
    version = 19;
  }

  if (version < 20) {
    // v20: ARI Phase 3 per-tab notebooks. Free-form pastor-typed notes,
    // sermon-scoped, one column per workspace tab where AI used to live.
    // Plain text. NULL is the empty state.
    const sermonInfo = queryAll("PRAGMA table_info(sermons)");
    const have = new Set(sermonInfo.map(r => r.name));
    if (!have.has("notebook_study")) {
      dbRun("ALTER TABLE sermons ADD COLUMN notebook_study TEXT DEFAULT NULL");
    }
    if (!have.has("notebook_blueprint")) {
      dbRun("ALTER TABLE sermons ADD COLUMN notebook_blueprint TEXT DEFAULT NULL");
    }
    if (!have.has("notebook_manuscript")) {
      dbRun("ALTER TABLE sermons ADD COLUMN notebook_manuscript TEXT DEFAULT NULL");
    }
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '20')");
    version = 20;
  }

  if (version < 21) {
    // v21: Per-stage sub-phase memory. `current_sub_phase` records the one
    // active position (State Contract #2). `last_*_subphase` records the
    // pastor's last position within each stage so tabbing across stages
    // restores where they were within each one. Replaces the per-sermon
    // `sermonforge_*_subphase_*` localStorage scatter that broke for tour
    // sermons (DELETE+INSERT reseeds the row but leaves localStorage stale).
    const sermonInfo = queryAll("PRAGMA table_info(sermons)");
    const have = new Set(sermonInfo.map(r => r.name));
    if (!have.has("last_study_subphase")) {
      dbRun("ALTER TABLE sermons ADD COLUMN last_study_subphase TEXT");
    }
    if (!have.has("last_assembly_subphase")) {
      dbRun("ALTER TABLE sermons ADD COLUMN last_assembly_subphase TEXT");
    }
    // Backfill from current_sub_phase where it belongs to the matching stage.
    dbRun(
      `UPDATE sermons SET last_study_subphase = current_sub_phase
         WHERE last_study_subphase IS NULL
           AND current_sub_phase IN ('Observe', 'Interpret', 'RedemptiveThread', 'Implications')`
    );
    dbRun(
      `UPDATE sermons SET last_assembly_subphase = current_sub_phase
         WHERE last_assembly_subphase IS NULL
           AND current_sub_phase IN ('Anchor', 'Outline', 'Equip', 'Frame')`
    );
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '21')");
    version = 21;
  }

  if (version < 22) {
    // v22: Full-content sermon search across every text-bearing column.
    // Previously search filtered client-side on title / passage /
    // series_title only — the notebooks, structured envelopes (observations
    // / interpretation / redemptive_thread / implications / main_point_pair
    // / sermon_frame), outline, and manuscript were invisible to search.
    // With ~40+ sermons accumulating per year, the pastor's notes need to
    // be findable across the whole library.
    //
    // Implementation: a regular SQLite table holding flattened plain text
    // for each searchable column on each sermon, with LIKE-based matching
    // (built when the main DB ran on sql.js, which lacked FTS5; better-
    // sqlite3 has FTS5 if search is ever rebuilt). Library sizes stay in the
    // low hundreds; LIKE is plenty fast at that scale. The indexer keeps
    // this table in sync via validateAndCommit hooks; the first-launch
    // backfill below handles existing sermons.
    dbRun(`
      CREATE TABLE IF NOT EXISTS sermon_search (
        sermon_id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        passage TEXT NOT NULL DEFAULT '',
        series_title TEXT NOT NULL DEFAULT '',
        observations TEXT NOT NULL DEFAULT '',
        interpretation TEXT NOT NULL DEFAULT '',
        redemptive_thread TEXT NOT NULL DEFAULT '',
        implications TEXT NOT NULL DEFAULT '',
        main_point_pair TEXT NOT NULL DEFAULT '',
        outline TEXT NOT NULL DEFAULT '',
        manuscript TEXT NOT NULL DEFAULT '',
        sermon_frame TEXT NOT NULL DEFAULT '',
        notebook_study TEXT NOT NULL DEFAULT '',
        notebook_blueprint TEXT NOT NULL DEFAULT '',
        notebook_manuscript TEXT NOT NULL DEFAULT '',
        delivery_notes TEXT NOT NULL DEFAULT '',
        timing_notes TEXT NOT NULL DEFAULT ''
      )
    `);
    // Backfill: index every existing sermon. Cheap for typical libraries
    // (~40-100 sermons); a no-op on a fresh install with zero rows.
    const rows = queryAll(
      `SELECT s.*, sr.title AS series_title
         FROM sermons s
         LEFT JOIN series sr ON sr.id = s.series_id`
    );
    for (const row of rows) {
      indexSermonFtsFromRow(row);
    }
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '22')");
    version = 22;
  }

  if (version < 23) {
    // v23: trail deletion sweep (Phase D1). Two columns drive the new
    // workspace surfaces' session re-entry and threshold-orientation logic:
    //   - last_touched_position: TEXT, NULL = first session (sermon-start
    //     landing fires); non-NULL = land on that field on re-open. Stored
    //     as the canonical slash-composite "<stage>/<subPhase>/<fieldKey>"
    //     so it parses cleanly without a JSON round-trip.
    //   - thresholds_seen: TEXT (JSON array of dismissed threshold ids).
    //     One mechanism for "has this threshold been dismissed" across
    //     sermon-start, Study→Anchor handoff, and any future threshold —
    //     so we don't end up with one boolean per threshold over time.
    safeAlter("ALTER TABLE sermons ADD COLUMN last_touched_position TEXT DEFAULT NULL");
    safeAlter("ALTER TABLE sermons ADD COLUMN thresholds_seen TEXT NOT NULL DEFAULT '[]'");
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '23')");
    version = 23;
  }

  if (version < 24) {
    // v24 (UX overhaul, 2026-06-10), two coordinated changes:
    //
    // (a) Soft delete — deleted_at NULL = live, ISO timestamp = deleted.
    //     Deleting becomes recoverable (undo affordances on the list
    //     surfaces; no Trash UI yet). deleted_at is deliberately NOT in
    //     SERMON_COLUMNS: only main's delete-sermon / restore-sermon ops
    //     write it, never the renderer's update path.
    safeAlter("ALTER TABLE sermons ADD COLUMN deleted_at TEXT DEFAULT NULL");
    //
    // (b) sermon_search rebuild — functional_elements (the sermon body,
    //     previously invisible to search) in; delivery_notes/timing_notes
    //     out (their stage UI is gone — dead weight in the index). The
    //     table is recreated FROM SERMON_SEARCH_COLUMNS so the schema and
    //     the indexer can't drift.
    dbRun("DROP TABLE IF EXISTS sermon_search");
    dbRun(`CREATE TABLE sermon_search (
      sermon_id TEXT PRIMARY KEY,
      ${SERMON_SEARCH_COLUMNS.map((c) => `${c.key} TEXT NOT NULL DEFAULT ''`).join(",\n      ")}
    )`);
    const v24rows = queryAll(
      `SELECT s.*, sr.title AS series_title
         FROM sermons s
         LEFT JOIN series sr ON sr.id = s.series_id`
    );
    for (const row of v24rows) {
      indexSermonFtsFromRow(row);
    }
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '24')");
    version = 24;
  }

  if (version < 25) {
    // v25 (canonical-books build, Prompt 2) — two coordinated changes.
    //
    // (a) book_id: the stable key of a canonical book (e.g. "luke") from the
    //     bundled src/data/canonicalBooks.js reference module. Nullable — a
    //     series with no chosen book stays NULL. It rides the normal create-
    //     then-update path: book_id is in SERIES_COLUMNS, so the debounced
    //     update-series write gates through buildUpdate. The create-series
    //     INSERT is deliberately NOT widened (charter ruling).
    safeAlter("ALTER TABLE series ADD COLUMN book_id TEXT DEFAULT NULL");
    //
    // (b) canon_category enum switch — legacy 4-value scheme
    //     (ot|nt|wisdom|prophetic) -> Dever's 7 genre keys. Migrate the two
    //     unambiguous values; the two testament-only values are too coarse to
    //     place, so they become NULL (rendered "unclassified", fixable by
    //     picking the book). '' (never-set) is left as-is, also "unclassified".
    //       wisdom    -> ot_writings
    //       prophetic -> ot_prophets
    //       ot | nt   -> NULL
    dbRun("UPDATE series SET canon_category = 'ot_writings' WHERE canon_category = 'wisdom'");
    dbRun("UPDATE series SET canon_category = 'ot_prophets' WHERE canon_category = 'prophetic'");
    dbRun("UPDATE series SET canon_category = NULL WHERE canon_category IN ('ot', 'nt')");
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '25')");
    version = 25;
  }

  if (version < 26) {
    // v26 (Series Planner re-leveling, Step 2) — two coordinated changes.
    //
    // (a) melodic_evidence: a nullable JSON column for the forthcoming
    //     "Hear the line" worksheet (labeled evidence slots the pastor fills).
    //     Unused for now — the schema is prepped here so the next step is pure
    //     UI. It rides the create-then-update path: melodic_evidence is in
    //     SERIES_COLUMNS, so the debounced update-series write gates through
    //     buildUpdate. The create-series INSERT is deliberately NOT widened
    //     (charter ruling), exactly like book_id (v25).
    safeAlter("ALTER TABLE series ADD COLUMN melodic_evidence TEXT DEFAULT NULL");
    //
    // (b) Field collapse — book_structure ("How the Book Is Built") and
    //     structural_outline are the same thing (the book's literary shape) in
    //     two forms. Fold book_structure INTO structural_outline so structure
    //     lives in ONE place across the UI and the export. This is a run-ONCE
    //     backfill gated by the version mechanism (NOT a content check), so a
    //     restart never appends a second time. book_structure is left INTACT in
    //     the DB as a backup — we only stop reading/rendering it after this.
    const v26rows = queryAll(
      "SELECT id, structural_outline, book_structure FROM series WHERE book_structure IS NOT NULL AND TRIM(book_structure) != ''"
    );
    for (const row of v26rows) {
      const merged = (row.structural_outline || "").trim()
        ? `${row.structural_outline}\n\n${row.book_structure}`
        : row.book_structure;
      dbRun("UPDATE series SET structural_outline = ? WHERE id = ?", [merged, row.id]);
    }
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '26')");
    version = 26;
  }

  if (version < 27) {
    // v27 (Series Planner content-model rebuild) — the planner becomes the
    // pastor's real three-level series document (Book ▸ Section ▸ Sermon),
    // every level the same unit: Title + range · Big idea · Overview.
    //
    // (a) Sermon-level big idea + overview on the sermon row. `big_idea` was
    //     dropped from sermons back in v11 (superseded then by mpt/mps); it
    //     returns here with fresh semantics — the one-line big idea of a
    //     sermon, distinct from the sermon's MPT/MPS. `overview` is the
    //     sermon's paragraph (its study-guide commentary body). Both ride the
    //     create-then-update path: they are in SERMON_COLUMNS so debounced
    //     update-sermon writes gate through buildUpdate; the create-sermon
    //     INSERT is deliberately NOT widened (slot draft/commit ruling).
    safeAlter("ALTER TABLE sermons ADD COLUMN big_idea TEXT DEFAULT ''");
    safeAlter("ALTER TABLE sermons ADD COLUMN overview TEXT DEFAULT ''");
    //
    // (b) study_guide_extras: a nullable JSON column for the guide-local layer
    //     of each sermon's study-guide page — { additions: [{id,type,text}],
    //     notesLines: int }. The booklet's imported content is a live projection
    //     of the Outline; only these pastor-authored additions + blank-notes
    //     sizing are stored, so re-importing never wipes them (they live here,
    //     and Import never writes this column). Rides create-then-update.
    safeAlter("ALTER TABLE sermons ADD COLUMN study_guide_extras TEXT DEFAULT NULL");
    //
    // (c) Fold the retired per-sermon study_guide_note INTO the new overview
    //     where the pastor wrote a note and overview is still empty (the pastor
    //     asked to kill the double-entry). Run-ONCE, version-gated (NOT a content
    //     check), so a restart never folds twice. study_guide_note is left INTACT
    //     in the DB as a backup — it is simply retired from the writable set.
    const v27rows = queryAll(
      "SELECT id, study_guide_note, overview FROM sermons WHERE study_guide_note IS NOT NULL AND TRIM(study_guide_note) != ''"
    );
    for (const row of v27rows) {
      if (!(row.overview || "").trim()) {
        dbRun("UPDATE sermons SET overview = ? WHERE id = ?", [row.study_guide_note, row.id]);
      }
    }
    dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '27')");
    version = 27;
  }

  // True when at least one block actually ran. Lets initDatabase skip the
  // boot-time flush on a clean boot of an up-to-date DB — so a healthy library
  // is never re-serialized and rotated over its own backup for no reason.
  return version !== initialVersion;
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
  dbRun(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
}

// ── Query helpers ────────────────────────────────────────────────────────────
// better-sqlite3 rejects undefined/boolean bind values that sql.js coerced —
// normalize so existing call sites keep working byte-for-byte.
function bindable(params) {
  return params.map((p) =>
    p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p
  );
}

function queryAll(sql, params = []) {
  return db.prepare(sql).all(...bindable(params));
}

function queryOne(sql, params = []) {
  return db.prepare(sql).get(...bindable(params)) ?? null;
}

function runSql(sql, params = []) {
  db.prepare(sql).run(...bindable(params));
}

// Drop-in replacement for sql.js's `db.run(sql, params?)`: with params it is a
// single prepared statement; without, it executes a (possibly multi-statement)
// script — exactly the two shapes the old call sites used.
function dbRun(sql, params = []) {
  if (params.length) db.prepare(sql).run(...bindable(params));
  else db.exec(sql);
}

// ── Theology query helper (better-sqlite3) ──────────────────────────────────
// theology.db and sermonforge.db are both better-sqlite3, but they are
// separate connections with separate helpers — theology loads sqlite-vec,
// the main DB never loads extensions. DO NOT mix connections.
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

// ── Close-time renderer flush ───────────────────────────────────────────────
// The renderer holds edits behind an 800ms debounce (SermonWorkspace autosave).
// Before the window closes or the app quits, ask the renderer to flush and
// await its ack — bounded by a hard timeout so a hung renderer can never make
// the window unclosable. Ask/ack over "app-flush-edits"(nonce) /
// "app-flush-edits-done"(nonce); the renderer side lives in src/App.jsx +
// src/utils/closeFlush.js. Resolves true when the renderer acked, false on
// timeout / dead window — callers proceed either way.
let _flushNonce = 0;
function flushRendererEdits(win, timeoutMs = 2000) {
  return new Promise((resolve) => {
    if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return resolve(false);
    const nonce = String(++_flushNonce);
    let settled = false;
    let timer = null;
    const onDone = (_e, ackNonce) => { if (ackNonce === nonce) finish(true); };
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ipcMain.removeListener("app-flush-edits-done", onDone);
      resolve(ok);
    };
    timer = setTimeout(() => {
      logError(`[close-flush] renderer ack timed out after ${timeoutMs}ms`);
      finish(false);
    }, timeoutMs);
    ipcMain.on("app-flush-edits-done", onDone);
    try {
      win.webContents.send("app-flush-edits", nonce);
    } catch (err) {
      logError("[close-flush] send failed", err);
      finish(false);
    }
  });
}

// ── Window creation ─────────────────────────────────────────────────────────
// Splash flow: createWindow loads electron/loading.html immediately so the user
// sees a wordmark + spinner during initDatabase (which can take seconds when
// theology.db opens at first launch). Once init is
// complete, app.whenReady calls loadAppContent() to swap the same window to
// the real renderer entry point. The window stays visible the whole time —
// no flash of unstyled second window.
// UI prefs (currently just the theme) — persisted as a tiny JSON file so
// main can read it SYNCHRONOUSLY before constructing the BrowserWindow
// (the dark-launch light-flash fix). localStorage can't serve here: main
// has no access, and the file:// splash doesn't share the app's origin.
const uiPrefsPath = () => path.join(paths.userData, "ui-prefs.json");

function readUiTheme() {
  try {
    const prefs = JSON.parse(fs.readFileSync(uiPrefsPath(), "utf8"));
    return prefs?.theme === "dark" ? "dark" : "light";
  } catch {
    return "light"; // first run / unreadable — matches current behavior
  }
}

function createWindow() {
  const theme = readUiTheme();
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    // First frame matches the theme — mirrors --parchment in both.
    backgroundColor: theme === "dark" ? "#1a1614" : "#f7f3ec",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,       // required: Node APIs used in preload
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, "loading.html"), {
    query: { theme },
  });

  // Renderer crash recovery: the sermon DB lives in the main process, so a
  // renderer crash loses at most a few unsynced keystrokes. Reload the app a
  // bounded number of times (avoiding a crash loop) instead of leaving the user
  // on a frozen/blank window with no way back.
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    logError(`[renderer] process gone: ${details?.reason || "unknown"} (exit ${details?.exitCode})`);
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (_rendererReloads < 3) {
      _rendererReloads += 1;
      loadAppContent();
    } else {
      try {
        dialog.showErrorBox("SermonForge", `SermonForge's display kept crashing and couldn't recover. Your sermons are saved. Please reopen the app; if it keeps happening, email ${SUPPORT_EMAIL}.`);
      } catch (_) {}
      app.quit();
    }
  });

  // Surface a failed page load (damaged app.asar, AV blocking reads) instead of
  // sitting on a dead splash. -3 is ERR_ABORTED — normal during navigation.
  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    if (code === -3) return;
    logError(`[renderer] did-fail-load ${code} ${desc} ${url}`);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Close interception: flush the renderer's debounced edits before the
  // window closes (the X button / Alt-F4 path). preventDefault exactly once;
  // the second close() goes through whether or not the flush succeeded (hard
  // timeout inside flushRendererEdits), so the window can never become
  // unclosable. Quit paths skip this — before-quit runs its own renderer
  // flush, and app.exit() there skips close events anyway.
  let _closeFlushed = false;
  mainWindow.on("close", (e) => {
    if (_closeFlushed || _isQuitting) return;
    e.preventDefault();
    flushRendererEdits(mainWindow).finally(() => {
      _closeFlushed = true;
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
    });
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
  // Causal link: when a recovery warning is already queued, OneDrive is
  // the most likely cause of the damage — say so on the recovery message
  // itself, where the pastor is actually reading.
  for (const w of _pendingStartupWarnings) {
    if (w.kind === "db_recovered_backup" || w.kind === "db_corrupt_quarantined") {
      w.message += " Your data folder is inside OneDrive, which is the most likely cause of the damage.";
    }
  }
  _pendingStartupWarnings.push({ kind, path: paths.userData });
}

// ── IPC handlers ────────────────────────────────────────────────────────────

// BTI telemetry — renderer-side emits flow through here. The bus is in the
// main process (filesystem + network); renderers post events via IPC.
ipcMain.handle("telemetry-emit", (_, { eventType, payload } = {}) => {
  try {
    telemetryBus.emit(eventType, payload);
    return { ok: true };
  } catch (err) {
    logError("[telemetry-emit] handler threw", err);
    return { ok: false };
  }
});
ipcMain.handle("telemetry-set-enabled", (_, enabled) => {
  telemetryBus.setEnabled(!!enabled);
  // First-run consent: when the user opts in on the SetupScreen, emit the
  // app-open that boot deliberately deferred until a choice was made.
  if (enabled) emitAppOpenOnce();
  return { ok: true };
});

// Renderer errors (global window hooks + React ErrorBoundary) report here so
// they land in app.log and, if telemetry is on, emit the `crash` event that
// privacy.md documents. Metadata only — no sermon content, capped length.
ipcMain.handle("report-renderer-error", (_, { label, detail } = {}) => {
  try {
    logError(`[renderer] ${label || "error"}`, new Error(String(detail || "unknown").slice(0, 2000)));
    telemetryBus.emit("crash", { error: `${label || "error"}: ${String(detail || "").slice(0, 500)}` });
  } catch (_) { /* never throw from error reporting */ }
  return { ok: true };
});

// BTI flag/form submissions — single-item POST through the bus's
// sendImmediate path. Failures persist to the immediate queue and
// retry on the next periodic flush.
ipcMain.handle("bti-feedback-submit", async (_, { kind, payload } = {}) => {
  try {
    return await telemetryBus.sendImmediate(kind, payload);
  } catch (err) {
    logError("[bti-feedback-submit] handler threw", err);
    return { ok: false, reason: "threw" };
  }
});

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

// Shared ORDER BY for sermons within a series: undated slots ('' / NULL) sort
// AFTER dated ones, then by date, then created_at. One definition so the
// planner list, the workspace "Sermon N of M" breadcrumb, and the study-guide
// export stay in lockstep and can't drift (audit M4). `prefix` is a table alias
// like "s." when the query joins.
function seriesSermonOrderBy(prefix = "") {
  const d = `${prefix}date`;
  const c = `${prefix}created_at`;
  return `ORDER BY CASE WHEN ${d} IS NULL OR ${d} = '' THEN 1 ELSE 0 END, ${d} ASC, ${c} ASC`;
}

// ── Sermon search indexer (v22) ───────────────────────────────────────────────
//
// Maintains the `sermon_search` table in sync with `sermons`. Every
// create / update / delete in `validateAndCommit` calls `indexSermonFts(id)`
// so the search row reflects current state. JSON-envelope columns
// (observations / interpretation / redemptive_thread / implications /
// main_point_pair / sermon_frame / outline / manuscript) are flattened to
// concatenated text so search hits read as natural prose instead of
// tokenizing on `{`, `}`, and `"`.
//
// Why not FTS5: the search table predates the better-sqlite3 driver swap —
// sql.js didn't compile FTS5, so the search table is a regular SQLite table
// with the flattened text stored column-by-column;
// search runs as LIKE matching across the indexed columns + JS-side
// snippet generation. Fast enough at typical pastor library sizes
// (under ~500 sermons).

// Walk a parsed JSON value, concatenating every string leaf with a space.
// Returns "" for null / undefined / non-string-non-collection scalars.
function flattenJsonToText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return "";
  if (Array.isArray(value)) {
    return value.map(flattenJsonToText).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value).map(flattenJsonToText).filter(Boolean).join(" ");
  }
  return "";
}

// Parse a JSON string column (defensive — returns "" if invalid).
function extractJsonText(raw) {
  if (!raw || typeof raw !== "string") return "";
  try {
    return flattenJsonToText(JSON.parse(raw));
  } catch {
    // Legacy plain-text values get indexed as-is.
    return raw;
  }
}

// The set of columns the search row carries, paired with which sermon
// column to source from. Used by both the indexer and the snippet pass.
// Order is intentional — earlier entries take precedence in the snippet
// "which column matched" report.
const SERMON_SEARCH_COLUMNS = [
  { key: "title",               source: "title",               json: false },
  { key: "passage",             source: "passage",             json: false },
  { key: "series_title",        source: "series_title",        json: false },
  { key: "manuscript",          source: "manuscript",          json: true  },
  { key: "notebook_study",      source: "notebook_study",      json: false },
  { key: "notebook_blueprint",  source: "notebook_blueprint",  json: false },
  { key: "notebook_manuscript", source: "notebook_manuscript", json: false },
  { key: "main_point_pair",     source: "main_point_pair",     json: true  },
  { key: "sermon_frame",        source: "sermon_frame",        json: true  },
  { key: "observations",        source: "observations",        json: true  },
  { key: "interpretation",      source: "interpretation",      json: true  },
  { key: "redemptive_thread",   source: "redemptive_thread",   json: true  },
  { key: "implications",        source: "implications",        json: true  },
  { key: "outline",             source: "outline",             json: true  },
  // v24: functional_elements (the sermon body — explanation/illustration/
  // application prose under each outline point) replaced delivery_notes +
  // timing_notes, which indexed columns whose stage UI no longer exists.
  { key: "functional_elements", source: "functional_elements", json: true  },
];

// Index a sermon row (with joined series_title) into sermon_search.
// Caller passes a row object that already has the JOIN result populated.
function indexSermonFtsFromRow(row) {
  if (!row || !row.id) return;
  dbRun("DELETE FROM sermon_search WHERE sermon_id = ?", [row.id]);
  const values = [row.id];
  for (const col of SERMON_SEARCH_COLUMNS) {
    const raw = row[col.source];
    values.push(col.json ? extractJsonText(raw) : (raw || ""));
  }
  const colNames = SERMON_SEARCH_COLUMNS.map((c) => c.key).join(", ");
  const placeholders = SERMON_SEARCH_COLUMNS.map(() => "?").join(", ");
  dbRun(
    `INSERT INTO sermon_search (sermon_id, ${colNames}) VALUES (?, ${placeholders})`,
    values,
  );
}

// Look up the sermon (+ joined series title) and re-index. Used by
// validateAndCommit after every sermon write.
function indexSermonFts(sermonId) {
  if (!sermonId) return;
  const row = queryOne(
    `SELECT s.*, sr.title AS series_title
       FROM sermons s
       LEFT JOIN series sr ON sr.id = s.series_id
      WHERE s.id = ?`,
    [sermonId],
  );
  if (row) indexSermonFtsFromRow(row);
}

// Drop the sermon's search row. Used by delete-sermon.
function dropSermonFts(sermonId) {
  if (!sermonId) return;
  dbRun("DELETE FROM sermon_search WHERE sermon_id = ?", [sermonId]);
}

// Build a single-snippet string for a matched search row. Scans every
// indexed column for the first occurrence of any query token; returns
// a short window around that occurrence with the matched range marked.
// `…` ellipsis is added when the window doesn't start/end at the field
// boundary. Returns "" if no column contains any token.
function buildSearchSnippet(row, tokens) {
  if (!tokens.length) return "";
  const window = 64; // characters around the match
  for (const col of SERMON_SEARCH_COLUMNS) {
    const text = row[col.key] || "";
    if (!text) continue;
    const lower = text.toLowerCase();
    let bestStart = -1;
    let matchedToken = "";
    for (const tok of tokens) {
      const idx = lower.indexOf(tok);
      if (idx >= 0 && (bestStart < 0 || idx < bestStart)) {
        bestStart = idx;
        matchedToken = tok;
      }
    }
    if (bestStart < 0) continue;
    const start = Math.max(0, bestStart - window);
    const end = Math.min(text.length, bestStart + matchedToken.length + window);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < text.length ? "…" : "";
    // Wrap the matched token in ‹mark› markers so the renderer can
    // highlight without an extra round-trip. ‹/› (single guillemet) is
    // chosen over `<>` to avoid HTML-escaping in the render path.
    const before = text.slice(start, bestStart);
    const match  = text.slice(bestStart, bestStart + matchedToken.length);
    const after  = text.slice(bestStart + matchedToken.length, end);
    return {
      column: col.key,
      snippet: `${prefix}${before}‹mark›${match}‹/mark›${after}${suffix}`,
    };
  }
  return { column: "", snippet: "" };
}

// Search interface — runs LIKE-based queries against sermon_search +
// joins back to the sermon row so the renderer gets a small, navigation-
// ready result envelope.
//
// Tokenization: split on whitespace, drop tokens shorter than 2 chars,
// lowercase for case-insensitive matching. A row matches when ANY token
// appears in ANY indexed column (OR semantics — the looser, more
// forgiving default).
function tokenizeSearchInput(input) {
  if (!input || typeof input !== "string") return [];
  return input
    .toLowerCase()
    .replace(/[%_]/g, " ") // strip LIKE wildcards so the pastor can't bleed pattern syntax
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function searchSermonsFts(rawQuery, limit = 50) {
  const tokens = tokenizeSearchInput(rawQuery);
  if (!tokens.length) return [];

  // Build a WHERE clause that ORs each token against each indexed column.
  // Parameterized LIKE patterns — safe against injection.
  const colNames = SERMON_SEARCH_COLUMNS.map((c) => c.key);
  const tokenClauses = tokens.map(() =>
    "(" + colNames.map((c) => `LOWER(ss.${c}) LIKE ?`).join(" OR ") + ")"
  ).join(" AND ");
  // AND semantics across tokens — every token must appear somewhere on
  // the row (any column). This narrows results when the pastor types
  // more words, which matches the "more specific = fewer hits"
  // expectation. Within a token, OR across columns.
  const params = [];
  for (const tok of tokens) {
    const like = `%${tok}%`;
    for (const _col of colNames) params.push(like);
  }

  try {
    const rows = queryAll(
      `SELECT
         s.id, s.title, s.passage, s.series_id, s.stage, s.date,
         s.current_stage, s.current_sub_phase,
         sr.title AS series_title,
         ${colNames.map((c) => `ss.${c} AS ${c}`).join(", ")}
       FROM sermon_search ss
       JOIN sermons s ON s.id = ss.sermon_id
       LEFT JOIN series sr ON sr.id = s.series_id
       WHERE s.deleted_at IS NULL
         AND ${tokenClauses}
       ORDER BY s.updated_at DESC, s.created_at DESC
       LIMIT ?`,
      [...params, limit],
    );
    // Build snippets in JS — column-precedence + windowing live here so
    // the SQL stays simple and the renderer gets a ready-to-render shape.
    return rows.map((r) => {
      const { column, snippet } = buildSearchSnippet(r, tokens);
      return {
        id: r.id,
        title: r.title,
        passage: r.passage,
        series_id: r.series_id,
        series_title: r.series_title,
        stage: r.stage,
        date: r.date,
        current_stage: r.current_stage,
        current_sub_phase: r.current_sub_phase,
        matchedColumn: column,
        snippet,
      };
    });
  } catch (e) {
    logError(`[searchSermonsFts] query failed: ${rawQuery}`, e);
    return [];
  }
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

// _legacyEvidenceCutoffCache + getLegacyEvidenceCutoff + isLegacySermon
// deleted in the trail deletion sweep (Phase G, 2026-05-18). These existed
// only to feed the Process #2 empty-evidence rejection in transitionState's
// wall layer — when that rejection went, every consumer of the cutoff
// machinery went with it (shapeSermon's `legacy:` field deleted; Sermon
// interface's `legacy: boolean` field deleted from src/core/contracts.ts).
// The v17 `legacy_evidence_cutoff` meta-table row remains in deployed
// databases as orphaned residue — the migration step that inserted it has
// been gravestoned at its insertion site (~line 745). No runtime code
// reads the row anymore; it is harmless data.

function rejection(code, clause, message) {
  return { ok: false, code, clause, message };
}
function success(value) {
  return { ok: true, value: value === undefined ? null : value };
}

// ── Row → canonical-shape helpers ────────────────────────────────────────────

function shapeSermon(row, parentContext) {
  if (!row) return null;
  // Legacy Blueprint / Frame coercion removed in the trail deletion sweep
  // (Phase B3) — no production data carries those values.
  const stage = row.current_stage;
  const out = {
    // Canonical shape (per src/core/contracts.ts `Sermon`).
    id: row.id,
    name: row.title || "",
    status: row.stage || SERMON_STATUS.InProgress,
    position: {
      stage,
      subPhase: row.current_sub_phase || undefined,
    },
    parentContext: parentContext || null,
    passage: row.passage || "",
    date: row.date || "",
    preacher: row.preacher || "",
    // `legacy: isLegacySermon(row)` deleted in Phase G (2026-05-18) — the
    // field had no readers in src/; it existed only to mirror the wall-side
    // Process #2 carve-out, which itself died with G.
    // Backward-compat raw row fields. Existing components read these directly;
    // migration to the canonical shape (Sermon.name, Sermon.position) is gradual.
    ...row,
    current_stage: stage,
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
  // Soft-deleted siblings must not inflate the position-in-series count
  // (Mutation #4 / audit L6). Undated slots sort AFTER dated ones so partial
  // scheduling doesn't scramble "Sermon N of M" (audit M4) — empty-string
  // dates would otherwise sort first under BINARY collation.
  const siblings = queryAll(
    `SELECT id FROM sermons
      WHERE series_id = ? AND deleted_at IS NULL
      ${seriesSermonOrderBy()}`,
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
         WHERE s.id NOT LIKE 'sample-%'
           AND s.deleted_at IS NULL
         ORDER BY s.date DESC, s.created_at DESC`,
      ).map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-all-series":
      return queryAll(
        "SELECT * FROM series WHERE id NOT LIKE 'sample-%' ORDER BY year DESC, title ASC",
      ).map(shapeSeries);
    case "get-recent-sermons":
      return queryAll(
        `SELECT s.*, sr.title as series_title, sr.color as series_color
         FROM sermons s LEFT JOIN series sr ON s.series_id = sr.id
         WHERE s.stage != ?
           AND s.id NOT LIKE 'sample-%'
           AND s.deleted_at IS NULL
         ORDER BY s.updated_at DESC, s.created_at DESC
         LIMIT ?`,
        [SERMON_STATUS.Complete, payload?.limit ?? 3],
      ).map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-recent-series":
      // The series table has no created_at / updated_at columns, so the old
      // COALESCE(updated_at, created_at) ORDER BY threw whenever this op ran
      // (audit L7). Order by the columns that exist, matching get-all-series.
      return queryAll(
        `SELECT * FROM series
         WHERE id NOT LIKE 'sample-%'
         ORDER BY year DESC, title ASC
         LIMIT ?`,
        [payload?.limit ?? 3],
      ).map(shapeSeries);
    case "get-in-progress-sermons":
      // State Contract #6: in-progress work is queryable from the front door.
      return queryAll(
        `SELECT s.*, sr.title as series_title, sr.color as series_color
         FROM sermons s LEFT JOIN series sr ON s.series_id = sr.id
         WHERE s.stage = ?
           AND s.id NOT LIKE 'sample-%'
           AND s.deleted_at IS NULL
         ORDER BY s.updated_at DESC, s.created_at DESC`,
        [SERMON_STATUS.InProgress],
      ).map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-sermons-by-series":
      // Undated slots sort AFTER dated ones (audit M4): empty-string dates
      // sort first under BINARY collation, which scrambles the planner order
      // and the workspace "Sermon N of M" breadcrumb once only some slots are
      // dated. Keep this ORDER BY in lockstep with computeParentContext and
      // the study-guide export query.
      return queryAll(
        `SELECT s.*, ss.title as section_title FROM sermons s
         LEFT JOIN series_sections ss ON s.section_id = ss.id
         WHERE s.series_id = ? AND s.deleted_at IS NULL
         ${seriesSermonOrderBy("s.")}`,
        [payload],
      );
    case "get-series-sermon-counts": {
      // One grouped read for the Planning list's per-series counts, replacing
      // an N+1 fan-out of get-sermons-by-series (audit perf). Returns a plain
      // { [seriesId]: count } map of undeleted sermons.
      const rows = queryAll(
        `SELECT series_id, COUNT(*) AS count FROM sermons
          WHERE series_id IS NOT NULL AND deleted_at IS NULL
          GROUP BY series_id`,
      );
      const counts = {};
      for (const r of rows) counts[r.series_id] = r.count;
      return counts;
    }
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
      // Canonical position is (current_stage, current_sub_phase). current_step
      // was retired in the trail deletion sweep (Phase B2).
      dbRun(
        `INSERT INTO sermons
           (id, series_id, section_id, is_one_off, title, passage, date, preacher,
            stage, mpt, mps, observations, outline, manuscript,
            current_stage, current_sub_phase)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '[]', '', ?, ?)`,
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
          SUB_PHASE.Observe,
        ],
      );
      indexSermonFts(id);
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
      dbRun(
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
      dbRun(
        `UPDATE sermons SET ${update.setClauses}, updated_at = datetime('now') WHERE id = ?`,
        [...update.values, id],
      );
      indexSermonFts(id);
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
      dbRun(`UPDATE series SET ${update.setClauses} WHERE id = ?`, [...update.values, id]);
      // Series title is part of every sermon-FTS row; if it changed,
      // re-index every sermon attached to this series.
      if (Object.prototype.hasOwnProperty.call(fields || {}, "title")) {
        const sermonRows = queryAll("SELECT id FROM sermons WHERE series_id = ?", [id]);
        for (const r of sermonRows) indexSermonFts(r.id);
      }
      return success();
    }

    case "delete-sermon":
      // Soft delete (v24) — the row stays, stops appearing everywhere, and
      // restore-sermon brings it back. Search row drops so a deleted
      // sermon can't be found either.
      dbRun("UPDATE sermons SET deleted_at = ? WHERE id = ?", [
        new Date().toISOString(),
        payload,
      ]);
      dropSermonFts(payload);
      return success();

    case "restore-sermon":
      // Undo for delete-sermon. Clears the tombstone and re-indexes.
      dbRun("UPDATE sermons SET deleted_at = NULL WHERE id = ?", [payload]);
      indexSermonFts(payload);
      return success();

    case "delete-series": {
      // Capture the sermon ids attached to this series BEFORE the cascade
      // nullifies their series_id, so we can re-index each one with its
      // series_title cleared from the FTS row.
      const affectedSermonRows = queryAll(
        "SELECT id FROM sermons WHERE series_id = ?",
        [payload],
      );
      dbRun("BEGIN");
      try {
        dbRun("DELETE FROM series_sections WHERE series_id = ?", [payload]);
        dbRun("UPDATE sermons SET series_id = NULL, section_id = NULL WHERE series_id = ?", [payload]);
        dbRun("DELETE FROM series WHERE id = ?", [payload]);
        dbRun("COMMIT");
      } catch (e) {
        dbRun("ROLLBACK");
        throw e;
      }
      for (const r of affectedSermonRows) indexSermonFts(r.id);
      return success();
    }

    case "create-section": {
      const id = randomUUID();
      dbRun(
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
      return success({ id });
    }

    case "update-section": {
      const { id, fields } = payload || {};
      const update = buildUpdate(fields || {}, SECTION_COLUMNS);
      if (!update) {
        return rejection("UPDATE_NO_FIELDS", "State #5", "No valid fields to update.");
      }
      dbRun(`UPDATE series_sections SET ${update.setClauses} WHERE id = ?`, [...update.values, id]);
      return success();
    }

    case "delete-section":
      dbRun("BEGIN");
      try {
        dbRun("UPDATE sermons SET section_id = NULL WHERE section_id = ?", [payload]);
        dbRun("DELETE FROM series_sections WHERE id = ?", [payload]);
        dbRun("COMMIT");
      } catch (e) {
        dbRun("ROLLBACK");
        throw e;
      }
      return success();

    case "transition-state": {
      // Phase G (2026-05-18) gravestone — the wall layer was deleted here.
      // What used to live in this handler:
      //   - Process #2 empty-evidence rejection (forward-only) — gated
      //     movement on the presence of an evidence string. Removed: the
      //     invisible-system rebuild replaced advancement gating with the
      //     completeness contract; the renderer no longer sends evidence
      //     (the `evidence` + `direction` fields are gone from
      //     `TransitionInput` in src/core/spine.ts).
      //   - Process #1 stage forward-to-prior rejection — gated forward
      //     stage moves against monotonic order. Removed: the new surface
      //     has free navigation; the preacher can revisit any field/stage
      //     freely.
      //   - Process #1 sub-phase forward-to-prior rejection — same logic
      //     at the sub-phase resolution. Removed for the same reason.
      // What remains is a clean position-writer: existence guard, type-
      // canonicality guard, the per-kind UPDATE blocks. CORE Process
      // Contracts #1 and #2 are rearticulated alongside this deletion.
      const { sermonId, kind } = payload || {};
      let { to } = payload || {};
      const row = fetchSermonRow(sermonId);
      if (!row) {
        return rejection("NOT_FOUND", "State #1", `Sermon ${sermonId} not found.`);
      }
      // Legacy stage coercion removed in the trail deletion sweep (Phase B3).
      const currentStage = row.current_stage;
      if (kind === "stage") {
        // Stage entry restores the pastor's last position WITHIN the
        // destination stage (per-stage memory), so tabbing across stages
        // returns them to where they were last. COALESCE falls back to the
        // first sub-phase when last_*_subphase is NULL (never been to that
        // stage). Stage transitions do NOT write last_*_subphase — that
        // column is only updated by sub-phase transitions within its stage,
        // so a stage tab-out followed by tab-back preserves position.
        let subDefault = null;
        let lastCol = null;
        if (to === STAGE.Study) { subDefault = SUB_PHASE.Observe; lastCol = "last_study_subphase"; }
        else if (to === STAGE.Assembly) { subDefault = SUB_PHASE.Anchor; lastCol = "last_assembly_subphase"; }
        if (lastCol) {
          dbRun(
            `UPDATE sermons SET current_stage = ?,
                                current_sub_phase = COALESCE(${lastCol}, ?),
                                updated_at = datetime('now')
             WHERE id = ?`,
            [to, subDefault, sermonId],
          );
        } else {
          dbRun(
            `UPDATE sermons SET current_stage = ?, current_sub_phase = ?, updated_at = datetime('now') WHERE id = ?`,
            [to, subDefault, sermonId],
          );
        }
      } else if (kind === "sub_phase") {
        // Sub-phase transition. Update current_sub_phase, align current_stage
        // if the new sub-phase belongs to a different stage (e.g., the
        // Implications → Anchor cross would otherwise leave current_stage at
        // "Study" while sub-phase is "Anchor"). Also update the per-stage
        // memory column for the destination stage so tab-back restores cleanly.
        const targetStage = SUB_PHASE_STAGE[to];
        let lastCol = null;
        if (targetStage === STAGE.Study) lastCol = "last_study_subphase";
        else if (targetStage === STAGE.Assembly) lastCol = "last_assembly_subphase";
        const crossStage = targetStage && targetStage !== currentStage;
        if (crossStage && lastCol) {
          dbRun(
            `UPDATE sermons SET current_stage = ?, current_sub_phase = ?, ${lastCol} = ?, updated_at = datetime('now') WHERE id = ?`,
            [targetStage, to, to, sermonId],
          );
        } else if (crossStage) {
          dbRun(
            `UPDATE sermons SET current_stage = ?, current_sub_phase = ?, updated_at = datetime('now') WHERE id = ?`,
            [targetStage, to, sermonId],
          );
        } else if (lastCol) {
          dbRun(
            `UPDATE sermons SET current_sub_phase = ?, ${lastCol} = ?, updated_at = datetime('now') WHERE id = ?`,
            [to, to, sermonId],
          );
        } else {
          dbRun(
            `UPDATE sermons SET current_sub_phase = ?, updated_at = datetime('now') WHERE id = ?`,
            [to, sermonId],
          );
        }
      } else {
        return rejection(
          "STATE_5_NONCANONICAL_TO",
          "State #5",
          `'to' must be a canonical Stage or SubPhase value (got '${to}').`,
        );
      }
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
        dbRun(
          `UPDATE sermons SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`,
          [serialized, sermonId],
        );
        indexSermonFts(sermonId);
        return success();
      }

      return rejection("BAD_KIND", "Mutation", `Unknown mutation kind: ${kind}`);
    }

    case "load-sample-sermon": {
      const { SERMON_ID, series, sermon } = require("./sampleData");
      // Sandbox semantics: an existing sample is returned as-is, so the
      // pastor's poking-around survives re-entry. Passing { fresh: true }
      // (the dashboard's "Start the sample fresh") deletes and reseeds —
      // which is also how schema/content changes to the seed get picked up.
      const fresh = payload?.fresh === true;
      if (!fresh && queryOne("SELECT id FROM sermons WHERE id = ?", [SERMON_ID])) {
        return success({ sermonId: SERMON_ID, created: false });
      }
      dbRun("BEGIN");
      try {
        dbRun("DELETE FROM sermons WHERE id LIKE 'sample-%'");
        dbRun("DELETE FROM series  WHERE id LIKE 'sample-%'");
        // Full-INSERT seed path (distinct from the create-series user flow, which
        // stays create-then-update). book_id is seeded directly here so the sample
        // exercises the canonical-book path the feature exists to showcase.
        dbRun(
          // The retired book-study / melodic-line series columns (redemptive_context,
          // book_background, book_argument, book_structure, series_motivation,
          // emerging_big_idea) are no longer seeded — they were retired from the
          // writable set in the v27 content-model rebuild and nothing reads them.
          `INSERT INTO series (
            id, title, color, description, year,
            big_idea, overview, passage_range, start_date, end_date,
            structural_outline, status, canon_category, book_id
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            series.id, series.title, series.color, series.description, series.year,
            series.big_idea, series.overview, series.passage_range, series.start_date, series.end_date,
            series.structural_outline, series.status, series.canon_category, series.book_id,
          ],
        );
        dbRun(
          `INSERT INTO sermons (
            id, series_id, is_one_off, title, passage, date, stage,
            mpt, mps,
            observations, interpretation, redemptive_thread, implications,
            outline, functional_elements,
            manuscript, delivery_notes, timing_notes,
            study_guide_note, big_idea, overview, sermon_frame,
            current_stage, current_sub_phase,
            last_study_subphase, last_assembly_subphase,
            last_touched_position, thresholds_seen
          ) VALUES (?,?,0,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            sermon.id, sermon.series_id, sermon.title, sermon.passage, sermon.date, sermon.stage,
            sermon.mpt, sermon.mps,
            sermon.observations, sermon.interpretation, sermon.redemptive_thread, sermon.implications,
            sermon.outline, sermon.functional_elements,
            sermon.manuscript, sermon.delivery_notes, sermon.timing_notes,
            sermon.study_guide_note, sermon.big_idea, sermon.overview, sermon.sermon_frame,
            // current_step removed in the trail deletion sweep (Phase B2).
            STAGE.Study, SUB_PHASE.Observe,
            // Per-stage memory: sample sermon always resets to the first
            // sub-phase of each stage so re-opens land at the beginning,
            // regardless of where the pastor wandered last time.
            SUB_PHASE.Observe, SUB_PHASE.Anchor,
            // Landing state (first Manuscript field, thresholds pre-seen)
            // is seed content — authored in sampleData.js with the rest.
            sermon.last_touched_position, sermon.thresholds_seen,
          ],
        );
        dbRun("COMMIT");
      } catch (e) {
        dbRun("ROLLBACK");
        throw e;
      }
      // Search index: drop any stale sample rows + re-index the freshly-
      // inserted one. The DELETE above runs against `sermons`;
      // `sermon_search` is a separate table and needs its own cleanup.
      // Index the freshly-inserted sermon so search finds the sample
      // content immediately.
      dbRun("DELETE FROM sermon_search WHERE sermon_id LIKE 'sample-%'");
      indexSermonFts(SERMON_ID);
      return success({ sermonId: SERMON_ID, created: true });
    }

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
  "get-series-sermon-counts",
  "get-sections-by-series",
]);

// Sermon FTS — full-text search over all sermon content (v22). Separate
// IPC channel because it's a read-only auxiliary surface, not a spine
// transition. Returns up to `limit` hits (default 50) ranked by FTS5.
ipcMain.handle("db-searchSermons", (_, payload) => {
  try {
    const query = typeof payload === "string" ? payload : (payload?.query || "");
    const limit = (payload && typeof payload.limit === "number") ? payload.limit : 50;
    return searchSermonsFts(query, limit);
  } catch (e) {
    logError("[db-searchSermons] uncaught error", e);
    return [];
  }
});

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
  dbRun(
    "INSERT INTO calendar_notes (id, date, type, label, notes) VALUES (?, ?, ?, ?, ?)",
    [id, data.date, data.type || "special", data.label || "", data.notes || ""]
  );
  return id;
});

ipcMain.handle("db-deleteCalendarNote", (_, id) => {
  dbRun("DELETE FROM calendar_notes WHERE id = ?", [id]);
});

// (Sermon/series IPC moved into the spine handler above — one channel.)

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
    // "Ordinary" (not "Ordinary Time") to match the on-screen season chip's
    // shortName (churchCalendar.js) so the preview and the .docx agree (audit M6).
    if (date < adventStart)  return "Ordinary";
    if (date < christmas)    return "Advent";
    return "Christmas";
  } catch { return null; }
}

// Build the congregational study-guide booklet (.docx), mirroring the on-screen
// Study-guide tab part-for-part: an Introduction (the book's big idea +
// overview), a part per section (its overview opens it), and a PAGE PER SERMON
// (big idea + overview-as-commentary + passage + date, the pastor's guide-local
// additions, and blank listener Notes lines), then a Reference part for the
// commentary outline. AI-free — every word is the pastor's own. (Rewritten in
// the 2026-06-24 content-model rebuild; the old World/Why/Big-Idea/Journey parts
// read the retired book-study columns and are gone.)
function buildStudyGuideDoc(series, sections, sermons) {
  const { Document, Paragraph, TextRun, HeadingLevel, BorderStyle } = require("docx");
  const accentHex = SERIES_COLOR_HEX[series.color] || SERIES_COLOR_HEX.gold;

  const ADDITION_LABEL = { question: "Question", "cross-reference": "Cross-reference", quote: "Quote" };

  function hasContent(val) {
    return val != null && String(val).trim().length > 0;
  }

  // Parse study_guide_extras fail-soft — mirrors parseStudyGuideExtras in the
  // renderer. Never throws; junk degrades to the empty default.
  function parseExtras(raw) {
    const empty = { additions: [], notesLines: 8 };
    if (!raw || typeof raw !== "string") return empty;
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return empty;
      const additions = Array.isArray(obj.additions)
        ? obj.additions
            .filter((a) => a && typeof a === "object" && typeof a.text === "string")
            // Normalize an unknown/missing type to "question" — mirrors the
            // renderer's parseStudyGuideExtras so the preview chip and the .docx
            // label agree (an unknown type showed "Question" on screen but the
            // doc's `ADDITION_LABEL[a.type] || "Note"` fallback printed "Note").
            .map((a) => ({ ...a, type: ADDITION_LABEL[a.type] ? a.type : "question" }))
        : [];
      const notesLines = Number.isInteger(obj.notesLines) ? Math.max(0, Math.min(20, obj.notesLines)) : 8;
      return { additions, notesLines };
    } catch { return empty; }
  }

  function bodyParas(text) {
    return (text || "").split(/\n+/).filter((l) => l.trim()).map((line) =>
      new Paragraph({ children: [new TextRun({ text: line.trim() })], spacing: { after: 100 } })
    );
  }

  function partHeading(text, pageBreak = false) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: pageBreak,
      spacing: { before: 360, after: 140 },
      children: [new TextRun({ text, color: accentHex, bold: true })],
    });
  }

  function leadLine(text) {
    return new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text, italics: true })],
    });
  }

  function spacer() {
    return new Paragraph({ text: "", spacing: { after: 60 } });
  }

  // One sermon's page in the booklet — page-broken so each sermon starts fresh.
  function sermonPage(sermon) {
    const out = [];
    // Page heading: passage — title (+ date / season).
    const headParts = [];
    if (hasContent(sermon.passage)) headParts.push(sermon.passage);
    if (hasContent(sermon.title))   headParts.push(sermon.title);
    out.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      pageBreakBefore: true,
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: headParts.join(" — ") || "Untitled", bold: true, color: accentHex })],
    }));
    if (hasContent(sermon.date)) {
      const seasonName = getSeasonNameForExport(sermon.date);
      const [ys, ms, ds] = sermon.date.split("-").map(Number);
      const dt = new Date(ys, ms - 1, ds);
      // Guard validity explicitly: new Date(NaN,…).toLocaleDateString() returns
      // the STRING "Invalid Date" instead of throwing, so the old try/catch never
      // fired and a malformed date would have printed "Invalid Date" into the
      // booklet. Drop the date line entirely when the value can't be parsed.
      if (!Number.isNaN(dt.getTime())) {
        const formatted = dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        out.push(new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: seasonName ? `${formatted} · ${seasonName}` : formatted, color: "888888", size: 20 })],
        }));
      }
    }
    if (hasContent(sermon.big_idea)) out.push(leadLine(sermon.big_idea));
    if (hasContent(sermon.overview)) out.push(...bodyParas(sermon.overview));

    // Pastor-authored additions (questions / cross-references / quotes).
    const extras = parseExtras(sermon.study_guide_extras);
    for (const a of extras.additions) {
      out.push(new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: `${ADDITION_LABEL[a.type] || "Note"}:  `, bold: true, color: accentHex }),
          new TextRun({ text: String(a.text) }),
        ],
      }));
    }

    // Notes — blank ruled lines for the listener.
    if (extras.notesLines > 0) {
      out.push(new Paragraph({
        spacing: { before: 200, after: 40 },
        children: [new TextRun({ text: "Notes", bold: true, size: 20, color: "888888" })],
      }));
      for (let i = 0; i < extras.notesLines; i++) {
        out.push(new Paragraph({
          spacing: { before: 200, after: 0 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 1 } },
          children: [],
        }));
      }
    }
    return out;
  }

  const model = buildStudyGuideModel(series, sections, sermons);
  const children = [];

  // ── Title block ──────────────────────────────────────────────────────────
  // .docx-ONLY by design: the standalone handout needs its own cover (series
  // title · passage range · date range), but the on-screen StudyGuideTab preview
  // omits it because it renders under the planner's page chrome which already
  // names the series. Everything BELOW this block matches the preview part-for-part.
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
    const dateRange = dates.map((d) => {
      try {
        const [ys, ms, ds] = d.split("-").map(Number);
        return new Date(ys, ms - 1, ds).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      } catch { return d; }
    }).join(" — ");
    children.push(new Paragraph({
      children: [new TextRun({ text: dateRange, color: "888888", size: 22 })],
      spacing: { after: 360 },
    }));
  } else {
    children.push(spacer());
  }

  // ── Introduction — the book's big idea + overview ────────────────────────
  if (hasContent(series.big_idea) || hasContent(series.overview)) {
    children.push(partHeading("Introduction"));
    if (hasContent(series.big_idea)) children.push(leadLine(series.big_idea));
    if (hasContent(series.overview)) children.push(...bodyParas(series.overview));
  }

  // ── A part per section, a page per sermon ────────────────────────────────
  for (const { section, sermons: sectionSermons } of model.sectionGroups) {
    children.push(partHeading(hasContent(section.title) ? section.title : "Untitled section"));
    if (hasContent(section.passage_range)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: section.passage_range, italics: true, size: 20, color: "888888" })],
        spacing: { after: 80 },
      }));
    }
    if (hasContent(section.big_idea)) children.push(leadLine(section.big_idea));
    if (hasContent(section.overview)) children.push(...bodyParas(section.overview));
    for (const sermon of sectionSermons) children.push(...sermonPage(sermon));
  }

  // Unsectioned sermons.
  if (model.remainingSermons.length > 0) {
    if (model.hasSections) children.push(partHeading("Remaining"));
    for (const sermon of model.remainingSermons) children.push(...sermonPage(sermon));
  }

  // ── Reference — the book's commentary outline ────────────────────────────
  if (hasContent(series.structural_outline)) {
    children.push(partHeading("Reference", true));
    children.push(...bodyParas(series.structural_outline));
  }

  return new Document({ sections: [{ properties: {}, children }] });
}

ipcMain.handle("series-export-study-guide", async (_, seriesId) => {
  try {
    const series = queryOne("SELECT * FROM series WHERE id = ?", [seriesId]);
    if (!series) return { success: false, error: "Series not found" };

    const sections = queryAll(
      // Same tiebreaker as get-sections-by-series so the export order matches
      // what the planner shows when two sections share a sort_order (audit M24).
      "SELECT * FROM series_sections WHERE series_id = ? ORDER BY sort_order ASC, created_at ASC",
      [seriesId]
    );
    // deleted_at IS NULL: a soft-deleted slot must NOT resurface in the
    // exported study guide (audit H1) — every other series-sermon read filters
    // tombstones, and the on-screen preview is fed from the filtered
    // get-sermons-by-series, so without this the .docx silently contradicted
    // the preview. Ordering matches get-sermons-by-series / computeParentContext
    // so undated slots land last (audit M4).
    const sermons = queryAll(
      `SELECT * FROM sermons
        WHERE series_id = ? AND deleted_at IS NULL
        ${seriesSermonOrderBy()}`,
      [seriesId]
    );

    const doc = buildStudyGuideDoc(series, sections, sermons);

    const studyGuidesDir = path.join(app.getPath("documents"), "SermonForge", "exports", "StudyGuides");
    if (!fs.existsSync(studyGuidesDir)) {
      fs.mkdirSync(studyGuidesDir, { recursive: true });
    }

    // Strip path separators / illegal filename chars, then cap length so a
    // pathologically long series title can't blow past the OS path limit and
    // fail with a misleading "Try again" (audit L8).
    const safeTitle = ((series.title || "Untitled")
      .replace(/[<>:"/\\|?*\n\r\t]/g, "—")
      .trim()
      .slice(0, 120)
      .trim()) || "Untitled";
    const filepath = path.join(studyGuidesDir, `${safeTitle} — Study Guide.docx`);

    const { Packer } = require("docx");
    const buffer = await Packer.toBuffer(doc);
    await fs.promises.writeFile(filepath, buffer);

    return { success: true, filepath };
  } catch (e) {
    console.error("[series-export-study-guide]", e);
    logError("[series-export-study-guide] failed", e);
    const friendly = /\b(EBUSY|EPERM|EACCES)\b/.test(e?.message || "")
      ? "That Word document is open in another program. Close it there and export again."
      : "Could not save the Word document. Try again.";
    return { success: false, error: friendly };
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

    // openPath resolves with a non-empty error string when nothing handles
    // .docx (no Word installed, broken association). Don't let "the file was
    // written but nothing opened" read as a silent no-op — fall back to
    // revealing the file in Explorer/Finder, and tell the renderer whether
    // the document actually opened so it can show the location.
    let opened = true;
    const openErr = await shell.openPath(filepath);
    if (openErr) {
      opened = false;
      logError(`[sermon-export-manuscript] openPath failed: ${openErr}`);
      try { shell.showItemInFolder(filepath); } catch (_) { /* best-effort */ }
    }

    return { success: true, filepath, opened };
  } catch (e) {
    console.error("[sermon-export-manuscript]", e);
    logError("[sermon-export-manuscript] failed", e);
    // Authored plain English — this string renders verbatim on the card
    // (Mutation #5: one error voice). The raw detail stays in app.log.
    const friendly = /\b(EBUSY|EPERM|EACCES)\b/.test(e?.message || "")
      ? "That Word document is open in another program. Close it there and export again."
      : "Could not save the Word document. Try again.";
    return { success: false, error: friendly };
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

// Pulled by the renderer on mount to receive one-shot startup warnings.
// Pull-pattern avoids races against React mount that a webContents.send
// would lose. Pops ONE warning per call in severity order (the renderer's
// dismiss handler re-fetches, presenting warnings one at a time); returns
// null when nothing is pending. The IPC shape is unchanged from the old
// single-slot design.
ipcMain.handle("app-get-startup-warning", () => {
  if (_pendingStartupWarnings.length === 0) return null;
  _pendingStartupWarnings.sort(
    (a, b) =>
      STARTUP_WARNING_PRIORITY.indexOf(a.kind) -
      STARTUP_WARNING_PRIORITY.indexOf(b.kind)
  );
  return _pendingStartupWarnings.shift();
});

// Fire-and-forget theme persistence — the renderer's toggle writes here so
// the NEXT launch's window + splash paint the right color from frame one.
// Value is validated to the two known themes; anything else is ignored.
ipcMain.handle("set-ui-theme", (_, theme) => {
  if (theme !== "dark" && theme !== "light") return { ok: false };
  try {
    fs.writeFileSync(uiPrefsPath(), JSON.stringify({ theme }));
    return { ok: true };
  } catch (e) {
    logError("[set-ui-theme] write failed", e);
    return { ok: false };
  }
});

// Email support with a prefilled subject/body. The address lives in
// electron/support.js — main-controlled, so the renderer can never route
// "support" mail anywhere else.
ipcMain.handle("app-email-support", async (_, { subject, body } = {}) => {
  const s = encodeURIComponent(String(subject || "SermonForge"));
  const b = body ? `&body=${encodeURIComponent(String(body))}` : "";
  await shell.openExternal(`mailto:${SUPPORT_EMAIL}?subject=${s}${b}`);
  return { success: true };
});

// Updater — status pull (covers the race where the download finished
// before React subscribed) and the renderer-initiated restart.
ipcMain.handle("updater-get-status", () => getUpdaterStatus());

ipcMain.handle("updater-restart", async () => {
  // Belt and braces: drain the renderer's debounce first; before-quit
  // (triggered inside restartAndInstall) flushes again regardless.
  try { await flushRendererEdits(mainWindow); } catch (err) { logError("[updater-restart] flush threw", err); }
  restartAndInstall();
  return { ok: true };
});

// ── First-run gate ────────────────────────────────────────────────────────────
// Channel kept under its legacy name so existing renderer code continues to
// resolve. ARI Phase 8 narrowed semantics: "configured" now means "user has
// been through the one-time setup screen at least once" (signalled by the
// presence of `bti_telemetry_enabled` in settings — written on submit).
ipcMain.handle("app-get-key-status", () => {
  const row = queryOne("SELECT value FROM settings WHERE key = 'bti_telemetry_enabled'");
  return { configured: Boolean(row) };
});

ipcMain.handle("app-save-api-key", async (_, keys) => {
  const { esv } = keys || {};
  // Pastors paste what the ESV site shows them, which often includes the
  // literal word "Token" — that's the HTTP header prefix, not the key.
  // Stripping it here prevents "Token Token abc" in the Authorization header.
  const cleaned = typeof esv === "string" ? esv.trim().replace(/^token\s+/i, "") : "";
  let unverified = false;
  if (cleaned) {
    try {
      const res = await fetch(
        "https://api.esv.org/v3/passage/text/?q=John+3:16" +
        "&include-headings=false&include-footnotes=false" +
        "&include-verse-numbers=false&include-short-copyright=false" +
        "&include-passage-references=false",
        {
          headers: { Authorization: `Token ${cleaned}` },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (res.status === 401 || res.status === 403) {
        return { success: false, error: "That key wasn't accepted by the ESV API — check it and try again." };
      }
    } catch (_) {
      // Network unreachable — save the key anyway, but tell the renderer
      // honestly so the pastor isn't surprised when passages don't load.
      unverified = true;
    }
  }
  try {
    saveKeys({ esv: cleaned });
    return unverified ? { success: true, unverified: true } : { success: true };
  } catch (e) {
    // Keystore failure (safeStorage unavailable). Raw OS-crypto wording
    // never reaches the screen — author the plain version here.
    console.error("[app-save-api-key]", e.message);
    return {
      success: false,
      error:
        "Windows couldn't store the key securely on this computer, so it wasn't saved. " +
        "You can still use SermonForge — Bible passages just won't load automatically.",
    };
  }
});

// app-open-external — open a URL in the system browser. The hard allowlist
// is the whole defense: the renderer can request only these exact URLs,
// never arbitrary ones. Extend the set deliberately, one URL at a time.
const OPEN_EXTERNAL_ALLOWLIST = new Set([
  "https://api.esv.org/",
]);

ipcMain.handle("app-open-external", async (_, url) => {
  if (!OPEN_EXTERNAL_ALLOWLIST.has(url)) {
    console.error("[app-open-external] blocked non-allowlisted URL:", String(url).slice(0, 200));
    return { success: false };
  }
  await shell.openExternal(url);
  return { success: true };
});

// The legacy "feedback-submit" IPC handler was removed in the public-launch
// hardening pass. It posted user-typed feedback + a redacted app.log tail
// directly to the PUBLIC teamofoxen/sermonforge issue tracker using a shipped
// GitHub PAT (GITHUB_FEEDBACK_TOKEN). It had no caller anywhere in the renderer
// (the live feedback surfaces — FeedbackForm + FeedbackFlag — route through the
// Cloudflare Worker via bti-feedback-submit), so removing it drops the last
// consumer of the GitHub token and closes a latent "publish user content to a
// public repo" path. No replacement is needed.

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

// passage-fetch — returns { esv, esvPending, esvState, esvError? }.
//
// esvState is the structured code the popup renders plain English from:
//   "ok"             — esv carries the text (possibly empty for a reference
//                      the API didn't recognize — the popup words that case)
//   "no-key"         — no ESV key has ever been saved
//   "key-unreadable" — a key file exists but couldn't be decrypted
//                      (re-entering the key once fixes it)
//   "bad-key"        — the API rejected the saved key (401/403)
//   "rate-limited"   — 429
//   "offline"        — the fetch itself failed (no network / DNS / timeout)
//   "error"          — any other non-OK HTTP status
//
// Raw messages (esvError) are kept for the log and as a legacy field, but
// no renderer surface shows them verbatim anymore. esvPending stays
// populated with its legacy meaning (true when no usable key) so any
// stale consumer keeps working.
ipcMain.handle('passage-fetch', async (_, passage) => {
  const result = { esv: null, esvPending: false, esvState: "ok" };

  // Cache first — a hit skips the per-call key load (fs read + decrypt in
  // packaged builds) and keeps already-fetched passages rendering even
  // through a keystore hiccup.
  const cacheKey = `esv|${passage}`;
  if (_passageCache.has(cacheKey)) {
    result.esv = _passageCache.get(cacheKey);
    return result;
  }

  const { key, unreadable } = loadEsvKey();
  if (!key) {
    result.esvPending = true;
    result.esvState = unreadable ? "key-unreadable" : "no-key";
    return result;
  }

  const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(passage)}` +
    `&include-headings=false&include-footnotes=false&include-verse-numbers=true` +
    `&include-short-copyright=false&include-passage-references=false`;
  let res;
  try {
    res = await fetch(url, { headers: { 'Authorization': `Token ${key}` } });
  } catch (e) {
    result.esvState = "offline";
    result.esvError = e.message;
    return result;
  }
  if (res.status === 401 || res.status === 403) {
    result.esvState = "bad-key";
    return result;
  }
  if (res.status === 429) {
    result.esvState = "rate-limited";
    return result;
  }
  if (!res.ok) {
    result.esvState = "error";
    result.esvError = `ESV API HTTP ${res.status}`;
    return result;
  }
  try {
    const json = await res.json();
    const text = (json.passages || []).join('\n\n').trim();
    // Only successes are cached — error states always re-attempt.
    _passageCache.set(cacheKey, text);
    result.esv = text;
  } catch (e) {
    result.esvState = "error";
    result.esvError = e.message;
  }
  return result;
});

// ── App lifecycle ────────────────────────────────────────────────────────────

// Single-instance lock. better-sqlite3 holds real SQLite file locks, but two
// instances would still fight over WAL checkpoints and the boot-time .bak copy.
// The most common trigger is double-clicking the launcher during the multi-second
// splash. Redirect any second launch to focus the existing window instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      logInfo(`SermonForge ${app.getVersion()} starting`);
      createWindow();              // splash visible immediately
      await initDatabase();

      // initDatabase sets _initError instead of throwing when it deliberately
      // aborts to protect data (a locked DB file, or a migration that failed).
      // Surface it plainly and quit — never leave the user on an endless splash,
      // and never run the app against a half-initialized DB. Nothing was written.
      if (_initError) {
        logError(`[boot] init aborted: ${_initError.kind}`);
        try { dialog.showErrorBox("SermonForge", _initError.message); } catch (_) {}
        app.quit();
        return;
      }

      // Telemetry initialized AFTER the DB so we can honor the BTI opt-out before
      // any event leaves the device. Q9 default = on; explicit "false" disables.
      telemetryBus.init();
      // Consent ordering. On first run the BTI disclosure has not been shown yet —
      // it lives on the SetupScreen — so hold telemetry silent (no enable, no
      // app-open) until the user makes a choice there (telemetry-set-enabled emits
      // the deferred app-open). For returning users, honor the stored preference
      // and emit app-open now.
      let _telemetryPref = null;
      try { _telemetryPref = getSetting("bti_telemetry_enabled"); } catch (_) {}
      if (_telemetryPref == null) {
        telemetryBus.setEnabled(false); // first run — wait for SetupScreen consent
      } else {
        if (_telemetryPref === "false") telemetryBus.setEnabled(false);
        emitAppOpenOnce();
      }
      maybeWarnOneDrive();         // queues startup warnings before renderer mounts
      loadAppContent();            // swap splash → real app
      initUpdater({ getWindow: () => mainWindow });
      // Pastor-shaped menu replaces the stock Electron one — also kills the
      // stock Ctrl+R / DevTools accelerators in packaged builds.
      buildApplicationMenu({ getWindow: () => mainWindow });
    } catch (err) {
      // Any unexpected boot failure (native module unloadable, userData not
      // writable, etc.) — show a clear message and quit instead of hanging on
      // the splash forever with the error swallowed into app.log.
      logError("[boot] fatal error during startup", err);
      try {
        dialog.showErrorBox(
          "SermonForge",
          `SermonForge ran into a problem starting up and couldn't open. Your sermons are safe and were not changed. Please reopen the app; if this keeps happening, email ${SUPPORT_EMAIL}.\n\nDetails: ` + (err?.message || String(err))
        );
      } catch (_) {}
      app.quit();
    }
  });

  app.on("activate", () => {
    // macOS: closing the window keeps the app alive. On reopen, the window must
    // swap straight to the real app — the previous code recreated only the
    // splash (loadAppContent never re-ran), stranding the user on an endless
    // "Loading library…" spinner. The DB is already initialized at this point.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      loadAppContent();
    }
  });
}

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
  // Flush the renderer's debounced edits into main BEFORE flushing main's DB
  // image to disk — otherwise the final flushDb persists a state missing the
  // last <800ms of typing. The window-close interception can't cover this
  // path: menu quit / Cmd-Q reach before-quit without a window close event,
  // and app.exit() below skips close events entirely. No-op (resolves false,
  // fast) when the window is already gone.
  try { await flushRendererEdits(mainWindow); } catch (err) { logError("[quit] renderer flush threw", err); }
  // Never flush when init aborted (_initError): db may hold a half-migrated or
  // empty image, and flushing it would overwrite the pristine on-disk DB the
  // abort was protecting.
  if (db && !_initError) {
    // Every edit already committed durably at write time (better-sqlite3).
    // The old quit-time save dialog is gone with the serialize-and-rotate
    // pipeline it guarded: a failed checkpoint here is NOT data loss — the
    // WAL file persists on disk and replays on the next open. close() runs
    // its own final checkpoint as well.
    try { flushDb(); } catch (err) { logError("[quit] wal checkpoint threw", err); }
    try { db.close(); } catch (err) { logError("[quit] db close threw", err); }
    db = null;
  }
  if (theologyDb) { try { theologyDb.close(); } catch (_) {} }
  theologyDb = null;
  theologyVecAvailable = false;
  try { await telemetryBus.flushAndExit(); } catch (_) {}
  app.exit(0);
});

// Keep the macOS dock-quit semantics: closing all windows on Win/Linux quits;
// macOS keeps the app alive until before-quit. before-quit handles the flush.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
