const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
// Packaged-smoke isolation (Session 5): scripts/packaged-smoke.cjs points the
// run at a throwaway userData dir BEFORE electron/config.js captures paths, so
// the smoke never touches a real library and never clashes with a running
// install's single-instance lock (the lock is scoped to userData). Inert
// unless the env var is set by the smoke harness.
if (process.env.SF_SMOKE_USERDATA) {
  app.setPath("userData", process.env.SF_SMOKE_USERDATA);
}
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
  SERMON_STATUS, SERIES_STATUS,
  MUTATION_KIND,
  SERMON_COLUMNS, SERIES_COLUMNS, SECTION_COLUMNS,
  STRUCTURED_FIELDS,
  ContractViolation,
} = require("./contracts.cjs");
const { buildStudyGuideModel } = require("./studyGuideModel.cjs");
const { SAVE_TRANSITION, confirmExitOverSaveResult } = require("./saveTransition.cjs");
const { createDbRecovery } = require("./dbRecovery.cjs");
const { fetchCrossway } = require("./crosswayFetch.cjs");

// coerceLegacyStage removed in the trail deletion sweep (Phase B3) —
// pre-restructure "Blueprint" / "Frame" stage values are no longer admitted
// or coerced. No production data carries them. Delivery's separate
// defensive-tolerance (ARI Phase 7) is a different concern and stays.
let _isQuitting = false;
// Set when the pastor has ALREADY answered the exit-over-unsaved-edits
// question this exit (updater "Restart anyway"), so the before-quit flush that
// immediately follows doesn't re-ask. A timestamp, not a boolean: an explicit
// choice authorizes the exit it belongs to, not a quit minutes later (e.g.
// dev-mode restartAndInstall is a no-op and the app keeps running).
let _exitDecisionAt = 0;
const EXIT_DECISION_FRESH_MS = 10_000;

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
// Production persistence seam (Session-2 extraction): the mutation
// dispatcher, query helpers, search projection, and migration ladder live in
// electron/persistence.cjs and are directly executable against a supplied
// database (tests/persistence/). main.js OWNS lifecycle + IPC wiring and
// delegates persistence here — one implementation, injected dependencies.
// getDb is a closure because `db` is reassigned across boot recovery /
// legacy resolution / quit.
const persistence = require("./persistence.cjs").createPersistence({
  getDb: () => db,
  logError,
  logInfo,
  isDev,
});
// Destructure ONLY what main.js still calls — the rest of the persistence
// surface (indexers, shapers, buildUpdate, the ladder internals) has no
// remaining caller here; it is consumed inside persistence.cjs and by
// tests/persistence/.
const {
  queryAll,
  queryOne,
  dbRun,
  bootstrapSchema,
  migrate,
  assertSchemaContract,
  SERMON_SEARCH_COLUMNS,
  seriesSermonOrderBy,
  rejection,
  spineRead,
  validateAndCommit,
} = persistence;
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

  // ── Phase 1 — establish a working `db` handle ────────────────────────────
  // The recovery logic (corruption classification, quick_check probe, .bak
  // restore, quarantine, stale-sidecar hygiene, content-row counting) lives
  // in electron/dbRecovery.cjs since the Session-4 seam extraction — moved
  // verbatim so the migration/recovery matrix can execute the REAL code
  // against real SQLite files (tests/persistence/migration-recovery.test.ts).
  // main.js stays the orchestration owner: Phase 1 open → Phase 2 legacy
  // resolver → boot backup → bootstrap + migration ladder, same order as
  // always. Recovery-point ruling: .bak is a boot-time copy, so a restore
  // recovers the library AS OF THE LAST APP START — the warnings say so
  // (see the RPO note in dbRecovery.cjs).
  const recovery = createDbRecovery({
    BetterSqlite3,
    logger: { info: logInfo, error: logError },
    supportEmail: SUPPORT_EMAIL,
  });
  const { loadWithRetry, applyConnectionPragmas, countContentRows } = recovery;
  const LOCK_MESSAGE = recovery.LOCK_MESSAGE;

  const opened = await recovery.openPrimaryWithRecovery({
    dbPath,
    bakPath,
    firstLaunch: _firstLaunch,
  });
  _pendingStartupWarnings.push(...opened.warnings);
  if (opened.initError) {
    // Boot aborts with every file untouched (locked primary/.bak) — whenReady
    // shows the message and quits, exactly as before the extraction.
    _initError = opened.initError;
    return;
  }
  db = opened.db;
  const startedFreshAfterCorruption = opened.startedFreshAfterCorruption;

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
    // migrateLegacyDb closes every candidate handle (including the winner) and
    // returns { source, deferred } — file-backed connections are path-bound, so
    // the active DB is reopened at dbPath below either way. It's given the
    // RETRYING loader (loadWithRetry) so a transiently-locked candidate is
    // retried before being deferred rather than silently skipped.
    const migrated = await migrateLegacyDb({
      activePath: dbPath,
      candidatePaths: legacyDbPaths,
      tryLoad: loadWithRetry,
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
    if (migrated.source) {
      legacyMigrated = true;
      _pendingStartupWarnings.push({
        kind: "db_migrated",
        message: `Restored your library from a previous install location (${migrated.source}). The original file is preserved there as a backup.`,
      });
    }
    // Mark this active path resolved so we don't re-run the resolver every boot —
    // UNLESS a candidate was left unread because it was transiently locked. Writing
    // the marker then would permanently orphan a real library sitting at that
    // locked legacy path; withholding it lets the next boot retry once the lock
    // clears. (A winner we DID adopt makes the active DB non-empty, so Phase 2
    // self-gates off next boot regardless.)
    if (migrated.deferred) {
      logInfo("[DB] legacy resolution deferred — a candidate was temporarily locked; not writing the checked marker so the next boot retries");
    } else {
      try {
        fs.writeFileSync(legacyMarkerPath, new Date().toISOString());
      } catch (e) {
        logError(`[DB] failed to write legacy-checked marker`, e);
      }
    }
  }

  // Boot-time backup: one good copy per launch. The open above passed
  // quick_check; the checkpoint folds any replayed WAL into the main file, and
  // the copy lands BEFORE bootstrap/migrations write anything — so .bak is
  // also the pre-migration recovery point for a shipped migration bug.
  // Skipped on a true first launch (an empty shell isn't worth backing up),
  // but a legacy-migrated-in library on a first launch at a new path is.
  if (!_firstLaunch || legacyMigrated) {
    // If recovery FAILED and we started fresh (empty/legacy-migrated), the
    // existing .bak still holds the damaged library's backup — the last
    // recovery artifact. Rename it aside BEFORE the boot copy so an empty (or
    // unrelated legacy) DB can never clobber it. If it can't be renamed, skip
    // the boot backup entirely rather than overwrite it.
    let bakSafeToOverwrite = true;
    if (startedFreshAfterCorruption && fs.existsSync(bakPath)) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const preserved = `${bakPath}.corrupt-${stamp}`;
      try {
        fs.renameSync(bakPath, preserved);
        logError(`[DB] preserved damaged .bak as ${path.basename(preserved)} before writing a fresh boot backup`);
      } catch (e) {
        logError(`[DB] could not preserve damaged .bak; skipping boot backup so it isn't clobbered`, e);
        bakSafeToOverwrite = false;
      }
    }
    if (bakSafeToOverwrite) {
      try {
        db.pragma("wal_checkpoint(TRUNCATE)");
        fs.copyFileSync(dbPath, bakPath);
      } catch (e) {
        logError(`[DB] boot-time .bak copy failed (continuing — writes are still journaled)`, e);
      }
    }
  }

  // Bootstrap-only schema + all migrations live in electron/persistence.cjs
  // (Session-2 seam extraction). bootstrapSchema() carries the CREATE TABLE
  // block verbatim; do not add or alter tables outside runMigrations().
  bootstrapSchema();

  let migrationsRan = false;
  try {
    // The whole migration pass runs inside ONE transaction: a thrown migration
    // rolls every statement back, so the on-disk DB stays pristine for a fixed
    // build. (SQLite DDL is transactional; sql.js got the same guarantee by
    // discarding the in-memory image — this is the file-backed equivalent.)
    migrationsRan = migrate();
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
// serialize-and-rotate pipeline and no debounce window. flushDb survives as an
// internal WAL checkpoint (quit path + boot-time backup): after it resolves ok,
// everything committed is folded into the main DB file. (The "db-flush" IPC
// channel and the renderer's db-write-error/db-write-ok banner plumbing were
// removed 2026-07-01 — main never emitted those events after the driver swap,
// a failed write throws at its own IPC handler and surfaces to the caller via
// persistMutation, so the push banner could never appear.)
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
// safeAlter, firstSectionIdForSeries, and the runMigrations ladder live in
// electron/persistence.cjs (Session-2 seam extraction); destructured above.

// assertSchemaContract lives in electron/persistence.cjs; destructured above.

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

// Query helpers (bindable/queryAll/queryOne/runSql/dbRun) live in
// electron/persistence.cjs; destructured above over the live db handle.

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
// "app-flush-edits-done"(nonce, ok); the renderer side lives in src/App.jsx +
// src/utils/closeFlush.js. Resolves to the persistence-transition contract
// (electron/saveTransition.cjs): "saved" when the renderer acked with every
// flush committed, "failed" when it acked but a flush WRITE failed, and
// "unknown" on timeout / dead window / send failure. Every exit seam (window
// close, before-quit, updater restart) puts a non-"saved" result through
// confirmExitOverSaveResult rather than proceeding over lost edits silently
// (Mutation #3).
let _flushNonce = 0;
function flushRendererEdits(win, timeoutMs = 2000) {
  return new Promise((resolve) => {
    if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return resolve(SAVE_TRANSITION.Unknown);
    const nonce = String(++_flushNonce);
    let settled = false;
    let timer = null;
    const onDone = (_e, ackNonce, ok) => { if (ackNonce === nonce) finish(ok === false ? SAVE_TRANSITION.Failed : SAVE_TRANSITION.Saved); };
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ipcMain.removeListener("app-flush-edits-done", onDone);
      resolve(result);
    };
    timer = setTimeout(() => {
      logError(`[close-flush] renderer ack timed out after ${timeoutMs}ms`);
      finish(SAVE_TRANSITION.Unknown);
    }, timeoutMs);
    ipcMain.on("app-flush-edits-done", onDone);
    try {
      win.webContents.send("app-flush-edits", nonce);
    } catch (err) {
      logError("[close-flush] send failed", err);
      finish(SAVE_TRANSITION.Unknown);
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
  // the second close() goes through whether or not the flush succeeded, so the
  // window can never become unclosable. Quit paths skip this — before-quit
  // runs its own renderer flush, and app.exit() there skips close events
  // anyway. A "failed" or "unknown" flush puts the choice to the pastor
  // (confirmExitOverSaveResult — the shared exit decision): closing over a
  // confirmed-failed write silently would drop his last edits (Mutation #3),
  // and an unconfirmed one must not masquerade as success. "Close anyway"
  // keeps the window closable either way — a genuine failure or a hung
  // renderer can never trap him (the dialog is native, main-process).
  let _closeFlushed = false;
  mainWindow.on("close", (e) => {
    if (_closeFlushed || _isQuitting) return;
    e.preventDefault();
    flushRendererEdits(mainWindow).then((result) => {
      const proceed = confirmExitOverSaveResult({
        result,
        win: mainWindow,
        dialog,
        anywayLabel: "Close anyway",
        verbPhrase: "close",
      });
      if (!proceed) return; // stay open; a later close re-runs the flush
      _closeFlushed = true;
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
    }).catch((err) => {
      // flushRendererEdits never rejects, but never let an unexpected throw make
      // the window unclosable — force the close through.
      logError("[close-flush] close handler threw; closing anyway", err);
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

// buildUpdate, seriesSermonOrderBy, and the sermon_search projection
// (SERMON_SEARCH_COLUMNS / flattenJsonToText / extractJsonText /
// indexSermonFtsFromRow / indexSermonFts / dropSermonFts) live in
// electron/persistence.cjs; destructured above.

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
         sr.title AS series_title,
         ${colNames.map((c) => `ss.${c} AS ${c}`).join(", ")}
       FROM sermon_search ss
       JOIN sermons s ON s.id = ss.sermon_id
       LEFT JOIN series sr ON sr.id = s.series_id
       WHERE s.deleted_at IS NULL
         AND s.id NOT LIKE 'sample-%'
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
        matchedColumn: column,
        snippet,
      };
    });
  } catch (e) {
    logError(`[searchSermonsFts] query failed: ${rawQuery}`, e);
    return [];
  }
}

// Spine read/mutation routing (rejection/success/shapeSermon/shapeSeries/
// fetchSermonRow/computeParentContext/spineRead/applyStructuredUpdate/
// validateAndCommit) lives in electron/persistence.cjs (Session-2 seam
// extraction); main.js delegates via the createPersistence instance above.

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
  "get-all-tags",
  "get-sections-by-series",
]);

// Sermon search — text search over all sermon content (v22). Separate
// IPC channel because it's a read-only auxiliary surface, not a spine
// transition. Returns up to `limit` hits (default 50). Despite the
// handler's legacy "Fts" name, matching is LIKE over the sermon_search
// table — see the "Why not FTS5" note at the sermon_search table build.
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
      `SELECT s.* FROM sermons s
        LEFT JOIN series_sections ss ON s.section_id = ss.id
        WHERE s.series_id = ? AND s.deleted_at IS NULL
        ${seriesSermonOrderBy("s.", "ss.sort_order")}`,
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
      id = "",
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
    // redemptive_note — the transplanted Frame Q4, now manuscript prose (OEM
    // walk, 2026-07-02): the gospel anchor at the front door, in preached
    // words. Prints last in the intro, after the expectation, per the field-def
    // order. (Was missed when the Conclusion split's export was added.) The
    // `_na` guard is required: the surface KEEPS the text when N/A'd ("your
    // words are kept"), so a note the pastor marked not-applicable must not
    // print — same sidecar flag the map + write path honor.
    if (introduction.redemptive_note && !introduction.redemptive_note_na) {
      children.push(prosePara(introduction.redemptive_note));
    }

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

    // Conclusion — summation first, then the response (the OEM two-prompt
    // split, 2026-07-02; both null-guarded so older sermons without a
    // summation export unchanged).
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: "Conclusion", bold: true })],
    }));
    if (conclusion.summation) children.push(prosePara(conclusion.summation));
    if (conclusion.response) children.push(prosePara(conclusion.response));

    const doc = new Document({
      styles: {
        default: { document: { run: { size: 24 } } },
      },
      sections: [{ properties: {}, children }],
    });

    const exportDir = path.join(app.getPath("documents"), "SermonForge", "exports", "Manuscripts");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const safeTitle = (title || passage || "Sermon").replace(/[<>:"/\\|?*\n\r\t]/g, "—").trim() || "Sermon";
    // Disambiguate so two sermons that share a title never overwrite each other's
    // Word document (silent data loss — writeFile below is an unconditional
    // overwrite), while re-exporting the SAME sermon stably overwrites its own
    // file. Prefer the pastor-meaningful preached date; fall back to a short id
    // fragment when undated (two undated same-title sermons would still collide).
    const disambiguator = String(date || "").trim() || (id ? String(id).slice(0, 8) : "");
    const namePart = disambiguator ? `${safeTitle} — ${disambiguator}` : safeTitle;
    const filepath = path.join(exportDir, `${namePart} — Manuscript.docx`);

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
  // Drain the renderer's debounce and put a "failed"/"unknown" result to the
  // pastor BEFORE committing to the restart (this used to flush and ignore the
  // result). Same shared exit decision + wording family as window close and
  // menu quit (confirmExitOverSaveResult).
  let result = SAVE_TRANSITION.Unknown;
  try { result = await flushRendererEdits(mainWindow); } catch (err) { logError("[updater-restart] flush threw", err); }
  const proceed = confirmExitOverSaveResult({
    result,
    win: mainWindow,
    dialog,
    anywayLabel: "Restart anyway",
    verbPhrase: "restart",
  });
  if (!proceed) return { ok: false, restarted: false }; // pastor chose to keep working
  // An explicit "Restart anyway" answers the exit question once — before-quit
  // (triggered inside restartAndInstall) flushes again but must not re-ask.
  if (result !== SAVE_TRANSITION.Saved) _exitDecisionAt = Date.now();
  restartAndInstall();
  return { ok: true, restarted: true };
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
    // Same bounded Crossway helper as passage-fetch (Session 5) — the probe
    // ends as success / controlled error / timeout, never an indefinite pend.
    const attempt = await fetchCrossway(
      "https://api.esv.org/v3/passage/text/?q=John+3:16" +
      "&include-headings=false&include-footnotes=false" +
      "&include-verse-numbers=false&include-short-copyright=false" +
      "&include-passage-references=false",
      { key: cleaned, timeoutMs: 8000 },
    );
    if (attempt.kind === "success" && (attempt.res.status === 401 || attempt.res.status === 403)) {
      return { success: false, error: "That key wasn't accepted by the ESV API — check it and try again." };
    }
    if (attempt.kind !== "success") {
      // Network unreachable / timed out — save the key anyway, but tell the
      // renderer honestly so the pastor isn't surprised when passages don't load.
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
ipcMain.handle('passage-fetch', async (_, passage, opts) => {
  // Crossway section headings — off for the tight preaching-text view, on for
  // the reference pane's "surrounding chapters" view (the headings mark the
  // pericope seams). Cached separately so the two views never collide.
  const headings = !!(opts && opts.headings);
  const result = { esv: null, esvPending: false, esvState: "ok" };

  // Cache first — a hit skips the per-call key load (fs read + decrypt in
  // packaged builds) and keeps already-fetched passages rendering even
  // through a keystore hiccup.
  const cacheKey = `esv|${headings ? 'h' : 'p'}|${passage}`;
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
    `&include-headings=${headings ? 'true' : 'false'}&include-footnotes=false&include-verse-numbers=true` +
    `&include-short-copyright=false&include-passage-references=false`;
  // One bounded Crossway helper (Session 5): the request ends as success /
  // controlled error / timeout / cancellation — never an indefinite pend.
  // Timeout and network failure both map to the existing "offline" voice
  // (the popup's plain-language wording is unchanged).
  const attempt = await fetchCrossway(url, { key });
  if (attempt.kind !== "success") {
    result.esvState = "offline";
    result.esvError = attempt.kind === "timeout"
      ? "ESV request timed out"
      : (attempt.error?.message || attempt.kind);
    return result;
  }
  const res = attempt.res;
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

      // ── Packaged release smoke (Session 5) ─────────────────────────────
      // SF_SMOKE=1 turns a normal launch into a bounded self-check driven by
      // scripts/packaged-smoke.cjs: once the real renderer finishes loading,
      // prove the schema initialized/migrated, the preload exposed the bridge,
      // and the window rendered — print one parseable line and exit cleanly.
      // Inert in every ordinary launch (the env var gates everything).
      if (process.env.SF_SMOKE === "1") {
        mainWindow.webContents.once("did-finish-load", async () => {
          try {
            const schemaRow = queryOne("SELECT value FROM meta WHERE key = 'schema_version'");
            const preloadOk = await mainWindow.webContents.executeJavaScript(
              "typeof window.electronAPI === 'object' && window.electronAPI !== null"
            );
            // did-finish-load can fire before the ready-to-show → show() path
            // makes the window visible, so a one-shot isVisible() sample flakes
            // rendered=false on a healthy fast boot (observed 2026-07-16: FAIL
            // then PASS on the identical binary). Await visibility instead —
            // bounded, so a window that genuinely never shows still fails the
            // smoke rather than hanging it (the script's own timeout is 120s).
            let visible = mainWindow.isVisible();
            if (!visible) {
              visible = await new Promise((resolve) => {
                const timer = setTimeout(() => resolve(false), 10_000);
                mainWindow.once("show", () => { clearTimeout(timer); resolve(true); });
              });
            }
            const rendered = visible && !mainWindow.webContents.isCrashed();
            console.log(
              `SF_SMOKE_RESULT ok=${Boolean(schemaRow && preloadOk && rendered)} ` +
              `schema=${schemaRow?.value ?? "none"} preload=${preloadOk} rendered=${rendered}`
            );
          } catch (err) {
            console.log(`SF_SMOKE_RESULT ok=false error=${String(err?.message || err).slice(0, 200)}`);
          } finally {
            // A clean quit exercises the full before-quit path (flush + close).
            setTimeout(() => app.quit(), 250);
          }
        });
      }
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
//   2. preventDefault holds the process open while the renderer flush runs; a
//      "failed"/"unknown" result goes through the shared exit decision — a
//      "Keep working" choice aborts the quit (_isQuitting re-armed).
//   3. flushDb checkpoints and the native DB closes after the flush settles
//      (theology is read-only).
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
  // and app.exit() below skips close events entirely. No-op (resolves
  // "unknown", fast) when the window is already gone.
  let flushResult = SAVE_TRANSITION.Unknown;
  try { flushResult = await flushRendererEdits(mainWindow); } catch (err) { logError("[quit] renderer flush threw", err); }
  // Menu Quit / Cmd-Q must HANDLE a "failed"/"unknown" flush, not discard it
  // (this used to await and ignore the result — closing over lost edits).
  // Same shared exit decision + wording family as window close
  // (confirmExitOverSaveResult): no live window → proceed (nothing left
  // holding edits, never trap shutdown); a fresh explicit "Restart anyway"
  // from the updater path already answered this question — don't re-ask.
  if (Date.now() - _exitDecisionAt >= EXIT_DECISION_FRESH_MS) {
    const proceed = confirmExitOverSaveResult({
      result: flushResult,
      win: mainWindow,
      dialog,
      anywayLabel: "Quit anyway",
      verbPhrase: "quit",
    });
    if (!proceed) {
      // Quit aborted — the pastor chose to keep working. Re-arm the guard so
      // the next quit attempt runs this handler (and its flush) again.
      _isQuitting = false;
      return;
    }
  }
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
