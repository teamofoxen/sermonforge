const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { randomUUID } = require("crypto");
const { isDev, paths, devServerUrl } = require("./config");
const { logInfo, logError, readRecent } = require("./logger");
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
let libraryDb = null;    // better-sqlite3 instance for library.db (+ sqlite-vec)
                         // Holds derived data (chunks + vectors); regeneratable from sermonforge.db.library
let libraryVecAvailable = false;
let mainWindow;
let saveTimer = null;
let _pendingWrite = false; // true between saveDb() and the debounce flush; used for crash-window warn
let _flushFailureCount = 0; // consecutive flushDb failures; banner fires at >= 2 to avoid noise on a single transient lock
let _firstLaunch = false;  // true when sermonforge.db did not exist at initDatabase entry; drives the first-run OneDrive modal
let _pendingStartupWarning = null; // set in maybeWarnOneDrive; renderer fetches via app-get-startup-warning on mount

const LIBRARY_PATH = path.join(os.homedir(), "OneDrive", "Ministry", "Preaching", "Sermon Library");
const MANAGED_LIBRARY_DIRNAME = "library";    // subfolder under userData for managed .docx copies
const EMBED_DIM = 384;                         // Xenova/all-MiniLM-L6-v2 dimensionality
const CHUNK_MAX_CHARS = 1500;                  // soft cap per chunk; long paragraphs split on sentences

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

    CREATE TABLE IF NOT EXISTS illustrations (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'personal',
      text TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      used_in TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  runMigrations();

  // Ensure FTS index exists. Pinned to FTS4 — historical FTS5 attempts produced
  // install-to-install drift (snippet() argument signatures differ across FTS
  // versions, and existing query paths use FTS4 syntax). FTS4 is the codified
  // baseline. Existing installs that landed on FTS5 are left untouched (this
  // block only runs when no library_fts exists yet).
  try {
    const ftsExists = queryOne("SELECT name FROM sqlite_master WHERE type='table' AND name='library_fts'");
    if (!ftsExists) {
      try {
        db.run(`CREATE VIRTUAL TABLE library_fts USING fts4(id, title, passage, manuscript_text)`);
        console.log("FTS4 index created");
      } catch (e) {
        console.error("FTS4 not available:", e.message);
        throw e;
      }
      // Rebuild index from any already-imported library rows
      const rows = queryAll("SELECT id, title, passage, manuscript_text FROM library");
      for (const row of rows) {
        try {
          db.run(
            "INSERT INTO library_fts (id, title, passage, manuscript_text) VALUES (?, ?, ?, ?)",
            [row.id, row.title, row.passage, row.manuscript_text]
          );
        } catch (e) {
          console.warn(`[FTS rebuild] Failed to index library row ${row.id}:`, e.message);
        }
      }
      if (rows.length > 0) {
        saveDb();
        console.log(`FTS index rebuilt from ${rows.length} existing sermons`);
      }
    }
  } catch (e) {
    console.log("FTS not available, search will use LIKE:", e.message);
  }

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
let embedder = null;               // lazy-loaded sentence-transformer pipeline (Xenova MiniLM L6 v2)
                                   // Shared by theology and library — model is ~40MB quantized, load once.

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

async function ensureEmbedder() {
  if (embedder) return true;
  console.log("[VECTOR] Loading embedding model...");
  try {
    const { pipeline, env } = await import("@xenova/transformers");
    env.cacheDir = paths.models;
    env.allowRemoteModels = false;
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      quantized: true,
    });
    console.log(`[VECTOR] Embedder available: ${!!embedder}`);
    return true;
  } catch (e) {
    console.error("[VECTOR] Embedding model failed to load:", e.message);
    return false;
  }
}

// Embed a single text into a 384-dim vector. Returns the array, or null on failure.
async function embedText(text) {
  const ok = await ensureEmbedder();
  if (!ok) return null;
  try {
    const output = await embedder([text], { pooling: "mean", normalize: true });
    return Array.from(output[0].data);
  } catch (e) {
    console.error("[VECTOR] embedText failed:", e.message);
    return null;
  }
}

// ── Library DB (derived chunks + vectors) ────────────────────────────────────
// Lazily initialized — created on first import or first hybrid search.
// Holds only derived data; can be deleted and rebuilt from sermonforge.db.library.
function ensureLibraryDb() {
  if (libraryDb) return true;
  if (!dbPath) return false;
  const libraryDbFile = path.join(path.dirname(dbPath), "library.db");
  try {
    libraryDb = new BetterSqlite3(libraryDbFile);
    try {
      sqliteVec.load(libraryDb);
      libraryVecAvailable = true;
    } catch (vecErr) {
      console.error(`[LIBRARY VEC] Failed to load sqlite-vec: ${vecErr.message}`);
      libraryVecAvailable = false;
    }
    libraryDb.exec(`
      CREATE TABLE IF NOT EXISTS library_chunks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        library_id  TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_text  TEXT NOT NULL,
        UNIQUE (library_id, chunk_index)
      );
      CREATE INDEX IF NOT EXISTS idx_library_chunks_lib ON library_chunks (library_id);

      -- Completion marker for indexLibraryManuscript. Without this, partial
      -- runs (chunks inserted but vectors never written, or process killed
      -- mid-loop) looked indexed-enough to library-build-embeddings — which
      -- then skipped them, leaving them stuck in partial state with no signal.
      -- A row exists here only when the full transactional indexLibraryManuscript
      -- completed for that library_id; absence = needs (re)indexing.
      CREATE TABLE IF NOT EXISTS library_chunks_status (
        library_id  TEXT PRIMARY KEY,
        indexed_at  TEXT NOT NULL,
        chunk_count INTEGER NOT NULL,
        embed_count INTEGER NOT NULL
      );
    `);
    if (libraryVecAvailable) {
      try {
        libraryDb.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS library_vec USING vec0(embedding float[${EMBED_DIM}])`);
      } catch (e) {
        console.error("[LIBRARY VEC] vec0 table creation failed:", e.message);
        libraryVecAvailable = false;
      }
    }
    return true;
  } catch (e) {
    console.error("[LIBRARY DB] Failed to open:", e.message);
    libraryDb = null;
    return false;
  }
}

// Split a manuscript into paragraph-aware chunks with a soft size cap.
// Long paragraphs split further on sentence boundaries; tiny paragraphs merge with neighbors.
function chunkManuscript(text) {
  if (!text || typeof text !== "string") return [];
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let buffer = "";
  for (const p of paragraphs) {
    if (p.length > CHUNK_MAX_CHARS) {
      if (buffer) { chunks.push(buffer); buffer = ""; }
      // sentence-split long paragraphs
      const sentences = p.split(/(?<=[.!?])\s+/);
      let acc = "";
      for (const s of sentences) {
        if ((acc + " " + s).length > CHUNK_MAX_CHARS && acc) {
          chunks.push(acc.trim());
          acc = s;
        } else {
          acc = acc ? `${acc} ${s}` : s;
        }
      }
      if (acc) chunks.push(acc.trim());
      continue;
    }
    if ((buffer + "\n\n" + p).length > CHUNK_MAX_CHARS && buffer) {
      chunks.push(buffer);
      buffer = p;
    } else {
      buffer = buffer ? `${buffer}\n\n${p}` : p;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.filter(c => c.length > 20); // drop fragments below noise floor
}

// Embed a manuscript and persist chunks + vectors to library.db.
// Returns { chunks: number, embeddedAll: boolean }.
//
// Two-phase shape:
//   Phase 1 (async, outside transaction): chunk + embed every chunk into an
//     in-memory array. The embedder is async; better-sqlite3 transactions
//     are sync, so embedding cannot run inside the transaction.
//   Phase 2 (sync, inside transaction): delete the prior chunks/vectors (in
//     the order that doesn't lose vec rows to orphaning — rowids first, then
//     chunks), insert the new chunks/vectors, write the completion marker.
//
// On any throw inside phase 2, the transaction rolls back atomically and the
// status marker is not written — library-build-embeddings will see the
// library_id as needing (re)indexing on its next pass. Previously, the loop
// inserted chunks one by one without a transaction; a kill mid-loop left
// partial chunks that looked complete to the backfill heuristic and never
// got re-tried.
async function indexLibraryManuscript(libraryId, manuscriptText) {
  if (!ensureLibraryDb()) return { chunks: 0, embeddedAll: false };
  const chunks = chunkManuscript(manuscriptText);
  if (chunks.length === 0) return { chunks: 0, embeddedAll: true };

  // Phase 1 — embed all chunks. Vec entries are null when embedder is unavailable
  // or fails for a single chunk; we still want the chunk text in FTS even when
  // the vector is missing, so partial vectors are tracked separately.
  const vectors = new Array(chunks.length).fill(null);
  if (libraryVecAvailable) {
    for (let i = 0; i < chunks.length; i++) {
      const vec = await embedText(chunks[i]);
      if (vec && vec.length === EMBED_DIM) vectors[i] = vec;
    }
  }
  const embedCount = vectors.filter(v => v !== null).length;

  // Phase 2 — atomic write. Order matters: capture old chunk ids before they
  // are deleted so the corresponding vec rowids can be removed (the prior
  // bug: DELETE-from-chunks-then-DELETE-from-vec-by-chunk-id always matched
  // zero vec rows and left orphans).
  const insertChunk = libraryDb.prepare(
    "INSERT INTO library_chunks (library_id, chunk_index, chunk_text) VALUES (?, ?, ?)"
  );
  const insertVec = libraryVecAvailable
    ? libraryDb.prepare("INSERT INTO library_vec (rowid, embedding) VALUES (?, ?)")
    : null;
  const upsertStatus = libraryDb.prepare(
    `INSERT INTO library_chunks_status (library_id, indexed_at, chunk_count, embed_count)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(library_id) DO UPDATE SET
       indexed_at  = excluded.indexed_at,
       chunk_count = excluded.chunk_count,
       embed_count = excluded.embed_count`
  );
  const selectOldIds = libraryDb.prepare(
    "SELECT id FROM library_chunks WHERE library_id = ?"
  );
  const deleteChunks = libraryDb.prepare(
    "DELETE FROM library_chunks WHERE library_id = ?"
  );

  const tx = libraryDb.transaction(() => {
    if (libraryVecAvailable) {
      const oldIds = selectOldIds.all(libraryId).map(r => r.id);
      if (oldIds.length > 0) {
        const placeholders = oldIds.map(() => "?").join(",");
        libraryDb.prepare(`DELETE FROM library_vec WHERE rowid IN (${placeholders})`).run(...oldIds);
      }
    }
    deleteChunks.run(libraryId);
    for (let i = 0; i < chunks.length; i++) {
      const info = insertChunk.run(libraryId, i, chunks[i]);
      const rowid = info.lastInsertRowid;
      if (insertVec && vectors[i]) {
        insertVec.run(rowid, JSON.stringify(vectors[i]));
      }
    }
    upsertStatus.run(libraryId, new Date().toISOString(), chunks.length, embedCount);
  });
  tx();

  return { chunks: chunks.length, embeddedAll: embedCount === chunks.length && libraryVecAvailable };
}

// Copy a source .docx into userData/library/ (managed copy).
// Returns { managedPath, relativePath } where relativePath is relative to the managed dir.
function copyToManagedLibrary(sourceFile, sourceLibraryRoot) {
  const managedRoot = path.join(paths.userData, MANAGED_LIBRARY_DIRNAME);
  if (!fs.existsSync(managedRoot)) fs.mkdirSync(managedRoot, { recursive: true });
  const relative = path.relative(sourceLibraryRoot, sourceFile);
  const managedPath = path.join(managedRoot, relative);
  const managedDir = path.dirname(managedPath);
  if (!fs.existsSync(managedDir)) fs.mkdirSync(managedDir, { recursive: true });
  fs.copyFileSync(sourceFile, managedPath);
  return { managedPath, relativePath: relative };
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
    // v3: sermon library table + FTS search index. Pinned to FTS4 (see initDatabase).
    db.run(`CREATE TABLE IF NOT EXISTS library (
      id TEXT PRIMARY KEY,
      filepath TEXT UNIQUE,
      filename TEXT DEFAULT '',
      title TEXT DEFAULT '',
      passage TEXT DEFAULT '',
      folder TEXT DEFAULT '',
      series_name TEXT DEFAULT '',
      manuscript_text TEXT DEFAULT '',
      word_count INTEGER DEFAULT 0,
      imported_at TEXT DEFAULT (datetime('now'))
    )`);
    try {
      db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS library_fts USING fts4(id, title, passage, manuscript_text)`);
    } catch (e) {
      console.error("FTS not available:", e.message);
    }
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
    // v6: pastoral intelligence fields — topic_theme, audience_assumptions, background_noise
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
    // v15: content_hash on library — sha256 of manuscript_text. Used to:
    //   1. detect a moved file (same hash, different filepath) → update path
    //      instead of creating a duplicate row, fixing the prior re-import bug
    //      where folder rename produced wholesale duplicates (M1).
    //   2. detect an edited file (same filepath, different hash) → re-index
    //      the chunks/vectors instead of `INSERT OR IGNORE`-skipping (M5).
    // Backfilled lazily on next import; existing rows keep empty hash until
    // touched. NULL/empty hash means "not yet computed", treated as no match.
    safeAlter("ALTER TABLE library ADD COLUMN content_hash TEXT DEFAULT ''");
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '15')");
    version = 15;
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

// Resolve the user's chosen sermon library folder, falling back to the
// legacy OneDrive default for installs that predate the setting.
function getLibraryPath() {
  const stored = getSetting("library_folder");
  return stored || LIBRARY_PATH;
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

// ── Library helpers ──────────────────────────────────────────────────────────
function getAllDocxFiles(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith("~$")) continue; // skip Word temp files
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getAllDocxFiles(fullPath));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".docx")) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    console.error(`Error reading directory ${dir}:`, e.message);
  }
  return results;
}

function parseLibraryFile(filePath, libraryPath) {
  const basename = path.basename(filePath, ".docx");
  const relative = path.relative(libraryPath, filePath);
  const parts = relative.split(path.sep);

  let title = basename;
  let passage = "";
  const dashIdx = basename.indexOf(" - ");
  if (dashIdx !== -1) {
    passage = basename.substring(0, dashIdx).trim();
    title = basename.substring(dashIdx + 3).trim();
  }

  const folder = parts[0] || "";
  let seriesName = "";
  if (folder === "_Series" && parts.length > 2) {
    seriesName = parts[1];
  }

  return { title, passage, folder, seriesName };
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
// theology.db opens or library indexing runs at first launch). Once init is
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

// ── Column allowlists — only these field names are accepted in update operations ─
const SERMON_COLUMNS = new Set([
  "title", "passage", "date", "preacher", "stage", "mpt", "mps",
  "observations", "interpretation", "redemptive_thread", "implications",
  "outline", "manuscript", "delivery_notes", "timing_notes", "post_sermon",
  "functional_elements", "checklist", "series_id", "section_id", "is_one_off",
  "topic_theme", "audience_assumptions", "background_noise", "study_guide_note",
  "preaching_blocks", "manuscript_delivery", "last_tune_up",
]);

const SERIES_COLUMNS = new Set([
  "title", "color", "description", "year", "big_idea", "overview",
  "passage_range", "start_date", "end_date", "structural_outline", "status", "canon_category",
  "redemptive_context", "book_background", "book_argument", "book_structure",
  "series_motivation", "emerging_big_idea",
]);

const SECTION_COLUMNS = new Set([
  "title", "passage_range", "big_idea", "overview", "sort_order",
]);

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

// ── Sermon handlers ───────────────────────────────────────────────────────────
ipcMain.handle("db-getAllSermons", () =>
  queryAll(`SELECT s.*, sr.title as series_title, sr.color as series_color
            FROM sermons s
            LEFT JOIN series sr ON s.series_id = sr.id
            WHERE s.id NOT LIKE 'tour-%'
            ORDER BY s.date DESC, s.created_at DESC`)
);

ipcMain.handle("db-getSermonById", (_, id) => {
  const rows = queryAll(
    `SELECT s.*, sr.title as series_title, sr.color as series_color
     FROM sermons s
     LEFT JOIN series sr ON s.series_id = sr.id
     WHERE s.id = ?`, [id]
  );
  return rows[0] || null;
});

ipcMain.handle("db-createSermon", (_, data) => {
  const id = randomUUID();
  db.run(
    `INSERT INTO sermons
       (id, series_id, section_id, is_one_off, title, passage, date, preacher,
        stage, mpt, mps, observations, outline, manuscript)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '[]', '')`,
    [id, data.series_id || null, data.section_id || null, data.is_one_off ? 1 : 0,
     data.title, data.passage || "", data.date || "", data.preacher || "",
     data.stage || "planning"]
  );
  saveDb();
  return id;
});

ipcMain.handle("db-updateSermon", (_, { id, fields }) => {
  const update = buildUpdate(fields, SERMON_COLUMNS);
  if (!update) {
    console.error("[db-updateSermon] No valid fields to update", { id, attempted: Object.keys(fields) });
    return { error: "No valid fields to update", attempted: Object.keys(fields) };
  }
  db.run(
    `UPDATE sermons SET ${update.setClauses}, updated_at = datetime('now') WHERE id = ?`,
    [...update.values, id]
  );
  saveDb();
});

ipcMain.handle("db-deleteSermon", (_, id) => {
  db.run("DELETE FROM sermons WHERE id = ?", [id]);
  saveDb();
});

// ── Series handlers ───────────────────────────────────────────────────────────
ipcMain.handle("db-getAllSeries", () =>
  queryAll("SELECT * FROM series WHERE id NOT LIKE 'tour-%' ORDER BY year DESC, title ASC")
);

ipcMain.handle("db-getRecentSeries", (_, limit = 3) =>
  queryAll(
    `SELECT * FROM series
     WHERE id NOT LIKE 'tour-%'
     ORDER BY COALESCE(updated_at, created_at) DESC
     LIMIT ?`,
    [limit]
  )
);

ipcMain.handle("db-getSeriesById", (_, id) => {
  const rows = queryAll("SELECT * FROM series WHERE id = ?", [id]);
  return rows[0] || null;
});

ipcMain.handle("db-createSeries", (_, data) => {
  const id = randomUUID();
  db.run(
    `INSERT INTO series
       (id, title, color, description, year, big_idea, overview,
        passage_range, start_date, end_date, structural_outline, status, canon_category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.title || "Untitled Series", data.color || "gold",
     data.description || "", data.year || new Date().getFullYear(),
     data.big_idea || "", data.overview || "", data.passage_range || "",
     data.start_date || "", data.end_date || "", data.structural_outline || "",
     data.status || "planning", data.canon_category || ""]
  );
  saveDb();
  return id;
});

ipcMain.handle("db-updateSeries", (_, { id, fields }) => {
  const update = buildUpdate(fields, SERIES_COLUMNS);
  if (!update) {
    console.error("[db-updateSeries] No valid fields to update", { id, attempted: Object.keys(fields) });
    return { error: "No valid fields to update", attempted: Object.keys(fields) };
  }
  db.run(`UPDATE series SET ${update.setClauses} WHERE id = ?`, [...update.values, id]);
  saveDb();
});

ipcMain.handle("db-deleteSeries", (_, id) => {
  db.run("BEGIN");
  try {
    db.run("DELETE FROM series_sections WHERE series_id = ?", [id]);
    db.run("UPDATE sermons SET series_id = NULL, section_id = NULL WHERE series_id = ?", [id]);
    db.run("DELETE FROM series WHERE id = ?", [id]);
    db.run("COMMIT");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }
  saveDb();
});

ipcMain.handle("db-getSermonsBySeries", (_, seriesId) =>
  queryAll(
    `SELECT s.*, ss.title as section_title FROM sermons s
     LEFT JOIN series_sections ss ON s.section_id = ss.id
     WHERE s.series_id = ? ORDER BY s.date ASC, s.created_at ASC`,
    [seriesId]
  )
);

// ── Section handlers ──────────────────────────────────────────────────────────
ipcMain.handle("db-getSectionsBySeries", (_, seriesId) =>
  queryAll(
    "SELECT * FROM series_sections WHERE series_id = ? ORDER BY sort_order ASC, created_at ASC",
    [seriesId]
  )
);

ipcMain.handle("db-createSection", (_, data) => {
  const id = randomUUID();
  db.run(
    `INSERT INTO series_sections
       (id, series_id, title, passage_range, big_idea, overview, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.series_id, data.title || "", data.passage_range || "",
     data.big_idea || "", data.overview || "", data.sort_order ?? 0]
  );
  saveDb();
  return id;
});

ipcMain.handle("db-updateSection", (_, { id, fields }) => {
  const update = buildUpdate(fields, SECTION_COLUMNS);
  if (!update) {
    console.error("[db-updateSection] No valid fields to update", { id, attempted: Object.keys(fields) });
    return { error: "No valid fields to update", attempted: Object.keys(fields) };
  }
  db.run(`UPDATE series_sections SET ${update.setClauses} WHERE id = ?`, [...update.values, id]);
  saveDb();
});

ipcMain.handle("db-deleteSection", (_, id) => {
  db.run("BEGIN");
  try {
    db.run("UPDATE sermons SET section_id = NULL WHERE section_id = ?", [id]);
    db.run("DELETE FROM series_sections WHERE id = ?", [id]);
    db.run("COMMIT");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }
  saveDb();
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

// ── Illustration handlers ─────────────────────────────────────────────────────
ipcMain.handle("db-getAllIllustrations", () =>
  queryAll("SELECT * FROM illustrations ORDER BY created_at DESC")
);

ipcMain.handle("db-createIllustration", (_, data) => {
  const id = randomUUID();
  db.run(
    `INSERT INTO illustrations (id, type, text, tags, used_in) VALUES (?, ?, ?, ?, '[]')`,
    [id, data.type || "personal", data.text, JSON.stringify(data.tags || [])]
  );
  saveDb();
  return id;
});

ipcMain.handle("db-deleteIllustration", (_, id) => {
  db.run("DELETE FROM illustrations WHERE id = ?", [id]);
  saveDb();
});

// ── Library item deletion ─────────────────────────────────────────────────────
ipcMain.handle("db-deleteLibraryItem", (_, id) => {
  db.run("BEGIN");
  try {
    db.run("DELETE FROM library WHERE id = ?", [id]);
    db.run("DELETE FROM library_fts WHERE id = ?", [id]);
    db.run("COMMIT");
    // Best-effort: also drop any chunks + vectors from library.db (derived data,
    // safe to retry; not part of the sermonforge.db transaction).
    if (ensureLibraryDb()) {
      try {
        // Order matters: vec rows must be looked up by chunk id BEFORE the
        // chunks themselves are deleted (the prior `DELETE library_chunks
        // … then DELETE library_vec WHERE rowid IN (SELECT id FROM library_chunks)`
        // pattern always matched zero, leaving orphans).
        if (libraryVecAvailable) {
          const oldIds = libraryDb.prepare(
            "SELECT id FROM library_chunks WHERE library_id = ?"
          ).all(id).map(r => r.id);
          if (oldIds.length > 0) {
            const placeholders = oldIds.map(() => "?").join(",");
            libraryDb.prepare(`DELETE FROM library_vec WHERE rowid IN (${placeholders})`).run(...oldIds);
          }
        }
        libraryDb.prepare("DELETE FROM library_chunks WHERE library_id = ?").run(id);
        libraryDb.prepare("DELETE FROM library_chunks_status WHERE library_id = ?").run(id);
      } catch (vecErr) {
        console.warn("[library deleteItem] failed to clean library.db chunks:", vecErr.message);
      }
    }
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }
  saveDb();
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
ipcMain.handle("db-getRecentSermons", (_, limit = 3) =>
  queryAll(
    `SELECT s.*, sr.title as series_title, sr.color as series_color
     FROM sermons s
     LEFT JOIN series sr ON s.series_id = sr.id
     WHERE s.stage != 'archived'
       AND s.id NOT LIKE 'tour-%'
     ORDER BY s.updated_at DESC, s.created_at DESC
     LIMIT ?`,
    [limit]
  )
);

// ── Tour sermon seed ──────────────────────────────────────────────────────────
ipcMain.handle("db-loadTourSermon", () => {
  const { SERIES_ID, SERMON_ID, series, sermon } = require("./tourData");

  const seriesExists = queryOne("SELECT id FROM series  WHERE id = ?", [SERIES_ID]);
  const sermonExists = queryOne("SELECT id FROM sermons WHERE id = ?", [SERMON_ID]);
  if (seriesExists && sermonExists) return { sermonId: SERMON_ID, created: false };

  db.run("BEGIN");
  try {
    if (!seriesExists) {
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
        ]
      );
    }

    if (!sermonExists) {
      db.run(
        `INSERT INTO sermons (
          id, series_id, is_one_off, title, passage, date, stage,
          mpt, mps,
          observations, interpretation, redemptive_thread, implications,
          outline, functional_elements,
          manuscript, delivery_notes, timing_notes,
          topic_theme, audience_assumptions, background_noise, study_guide_note
        ) VALUES (?,?,0,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          sermon.id, sermon.series_id, sermon.title, sermon.passage, sermon.date, sermon.stage,
          sermon.mpt, sermon.mps,
          sermon.observations, sermon.interpretation, sermon.redemptive_thread, sermon.implications,
          sermon.outline, sermon.functional_elements,
          sermon.manuscript, sermon.delivery_notes, sermon.timing_notes,
          sermon.topic_theme, sermon.audience_assumptions, sermon.background_noise, sermon.study_guide_note,
        ]
      );
    }

    db.run("COMMIT");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }
  saveDb();
  return { sermonId: SERMON_ID, created: true };
});

ipcMain.handle("db-removeTourSermon", () => {
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
});

ipcMain.handle("library-status", () => {
  try {
    const row = queryOne("SELECT COUNT(*) as count, MAX(imported_at) as last_imported FROM library");
    const count = row?.count || 0;

    // Embedding coverage — how many library rows have at least one chunk in library.db
    let embeddedCount = 0;
    if (count > 0 && ensureLibraryDb()) {
      try {
        const r = libraryDb.prepare("SELECT COUNT(DISTINCT library_id) as n FROM library_chunks").get();
        embeddedCount = r?.n || 0;
      } catch (_) {}
    }

    return {
      count,
      lastImported: row?.last_imported || null,
      embeddedCount,
      vecAvailable: libraryVecAvailable,
    };
  } catch (e) {
    console.error('[library-status]', e);
    return { count: 0, lastImported: null, embeddedCount: 0, vecAvailable: false };
  }
});

// Backfill embeddings for any library rows that don't yet have a completion
// marker. Filtering by library_chunks_status (rather than DISTINCT library_id
// in library_chunks) means partially-indexed rows correctly need re-indexing —
// the prior heuristic treated any chunk presence as "indexed" and silently
// stranded rows that crashed mid-run.
// Sends "library-embed-progress" events: { done, total, complete }.
ipcMain.handle("library-build-embeddings", async () => {
  if (!ensureLibraryDb()) {
    return { error: "library.db could not be opened", total: 0, embedded: 0, errors: 0 };
  }

  const all = queryAll("SELECT id, manuscript_text FROM library");
  const completed = new Set(
    libraryDb.prepare("SELECT library_id FROM library_chunks_status").all().map(r => r.library_id)
  );
  const todo = all.filter(r => !completed.has(r.id) && r.manuscript_text);
  const total = todo.length;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("library-embed-progress", { done: 0, total, complete: false });
  }

  let embedded = 0;
  let errors = 0;
  for (const row of todo) {
    try {
      await indexLibraryManuscript(row.id, row.manuscript_text);
      embedded++;
    } catch (e) {
      console.warn("[library-build-embeddings] failed for", row.id, e.message);
      errors++;
    }
    if ((embedded + errors) % 5 === 0 && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("library-embed-progress", { done: embedded, total, complete: false });
    }
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("library-embed-progress", { done: embedded, total, complete: true });
  }

  return { total, embedded, errors };
});

// ── Settings IPC ─────────────────────────────────────────────────────────────
ipcMain.handle("db-getSetting", (_, key) => getSetting(key));
ipcMain.handle("db-setSetting", (_, { key, value }) => {
  setSetting(key, value);
  return true;
});

// ── Library folder selection ─────────────────────────────────────────────────
ipcMain.handle("library-get-folder", () => ({
  path: getLibraryPath(),
  isExplicit: !!getSetting("library_folder"),
}));

ipcMain.handle("library-set-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose your sermon folder",
    properties: ["openDirectory"],
    defaultPath: getLibraryPath(),
  });
  if (result.canceled || !result.filePaths?.length) {
    return { canceled: true, path: null };
  }
  const chosen = result.filePaths[0];
  setSetting("library_folder", chosen);
  return { canceled: false, path: chosen };
});

// Compute a stable identity hash for a manuscript. sha256 of the trimmed text;
// invariant under filepath changes, sensitive to actual content edits.
function libraryContentHash(text) {
  const { createHash } = require("crypto");
  return createHash("sha256").update(text || "").digest("hex");
}

ipcMain.handle("library-import", async (event) => {
  const libraryPath = getLibraryPath();
  if (!libraryPath || !fs.existsSync(libraryPath)) {
    return { error: "Library path not set or not found", total: 0, imported: 0, errors: 0 };
  }

  const mammoth = require("mammoth");
  const allFiles = getAllDocxFiles(libraryPath);
  const total = allFiles.length;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("library-import-progress", { done: 0, total, complete: false });
  }

  let imported = 0; // newly inserted rows
  let moved = 0;    // existing row, same hash, filepath updated
  let updated = 0;  // existing row, same filepath, content changed → re-indexed
  let skipped = 0;  // already imported, no change
  let errors = 0;

  for (const filePath of allFiles) {
    try {
      const relativePath = path.relative(libraryPath, filePath);
      const { title, passage, folder, seriesName } = parseLibraryFile(filePath, libraryPath);

      // Managed copy under userData/library/ — SermonForge owns the working set.
      try {
        copyToManagedLibrary(filePath, libraryPath);
      } catch (copyErr) {
        console.warn("[library-import] managed copy failed for", relativePath, copyErr.message);
      }

      const result = await mammoth.extractRawText({ path: filePath });
      const manuscriptText = result.value.trim();
      const wordCount = manuscriptText.split(/\s+/).filter(Boolean).length;
      const contentHash = libraryContentHash(manuscriptText);

      // Identity resolution order:
      //   1. Match by content_hash (file moved / renamed → reuse the row).
      //   2. Match by filepath (file edited → re-index).
      //   3. New file → INSERT + index.
      const byHash = contentHash
        ? queryAll("SELECT id, filepath FROM library WHERE content_hash = ? LIMIT 1", [contentHash])[0]
        : null;
      const byPath = byHash ? null : queryAll(
        "SELECT id, content_hash FROM library WHERE filepath = ? LIMIT 1",
        [relativePath]
      )[0];

      if (byHash) {
        if (byHash.filepath !== relativePath) {
          db.run("UPDATE library SET filepath = ? WHERE id = ?", [relativePath, byHash.id]);
          moved++;
        } else {
          skipped++;
        }
      } else if (byPath) {
        if (byPath.content_hash === contentHash) {
          // Same path, same content (existing row predates content_hash backfill or
          // hashing failed). Backfill the hash so future moves are detectable; no
          // re-index required since the content didn't change.
          db.run("UPDATE library SET content_hash = ? WHERE id = ?", [contentHash, byPath.id]);
          skipped++;
        } else {
          // Same path, different content → file edited.
          db.run(
            "UPDATE library SET manuscript_text = ?, word_count = ?, content_hash = ? WHERE id = ?",
            [manuscriptText, wordCount, contentHash, byPath.id]
          );
          // Drop FTS row + status marker; re-add below so FTS and status reflect new content.
          db.run("DELETE FROM library_fts WHERE id = ?", [byPath.id]);
          if (ensureLibraryDb()) {
            try {
              libraryDb.prepare("DELETE FROM library_chunks_status WHERE library_id = ?").run(byPath.id);
            } catch (_) {}
          }
          try {
            db.run(
              "INSERT INTO library_fts (id, title, passage, manuscript_text) VALUES (?, ?, ?, ?)",
              [byPath.id, title, passage, manuscriptText]
            );
          } catch (e) {
            console.warn("[library-import] FTS reinsert failed for", relativePath, e.message);
          }
          try {
            await indexLibraryManuscript(byPath.id, manuscriptText);
          } catch (e) {
            console.warn("[library-import] re-embed failed for", relativePath, e.message);
          }
          updated++;
        }
      } else {
        // Brand-new file.
        const id = randomUUID();
        db.run(
          `INSERT INTO library (id, filepath, filename, title, passage, folder, series_name, manuscript_text, word_count, content_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, relativePath, path.basename(filePath, ".docx"), title, passage, folder, seriesName, manuscriptText, wordCount, contentHash]
        );
        try {
          db.run(
            "INSERT INTO library_fts (id, title, passage, manuscript_text) VALUES (?, ?, ?, ?)",
            [id, title, passage, manuscriptText]
          );
        } catch (e) {
          console.warn("[library-import] FTS insert failed for", relativePath, e.message);
        }
        try {
          await indexLibraryManuscript(id, manuscriptText);
        } catch (e) {
          console.warn("[library-import] embedding failed for", relativePath, e.message);
        }
        imported++;
      }
    } catch (e) {
      console.error(`Import error for ${filePath}:`, e.message);
      errors++;
    }

    const done = imported + moved + updated + skipped + errors;
    if (done % 10 === 0 && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("library-import-progress", { done, total, complete: false });
    }
    if (done % 50 === 0) saveDb();
  }

  saveDb();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("library-import-progress", {
      done: imported + moved + updated + skipped + errors, total, complete: true,
    });
  }

  return { total, imported, moved, updated, skipped, errors };
});

ipcMain.handle("library-search", async (event, { query, limit = 100, mode = "browse" }) => {
  // mode "browse" — title/passage/series only (search bar filtering)
  // mode "ai"     — includes manuscript_text (Quick Outline, AIPanel contextual search)
  // mode "hybrid" — FTS rank + vector cosine via Reciprocal Rank Fusion
  try {
    if (!query || !query.trim()) {
      return queryAll(
        `SELECT id, title, passage, folder, series_name, word_count,
                substr(manuscript_text, 1, 250) as excerpt
         FROM library ORDER BY title LIMIT ?`,
        [limit]
      );
    }

    // Hybrid path — combines FTS (manuscript-level keyword) with vector cosine
    // (chunk-level semantic, aggregated to manuscript via best-chunk score).
    // Falls back to FTS-only if the vector store is unavailable.
    if (mode === "hybrid") {
      const RRF_K = 60;
      const fanout = Math.max(limit * 4, 40);

      // FTS ranks
      const ftsRanks = new Map(); // library_id -> rank (1-based)
      const ftsQuery = buildFtsQuery(query);
      if (ftsQuery) {
        try {
          const ftsHits = queryAll(
            "SELECT id FROM library_fts WHERE library_fts MATCH ? LIMIT ?",
            [ftsQuery, fanout]
          );
          ftsHits.forEach((h, i) => ftsRanks.set(h.id, i + 1));
        } catch (_) {}
      }

      // Vector ranks
      const vecRanks = new Map();
      if (libraryVecAvailable && ensureLibraryDb()) {
        const qVecArr = await embedText(query);
        if (qVecArr && qVecArr.length === EMBED_DIM) {
          try {
            const qVec = JSON.stringify(qVecArr);
            // Inner: KNN over chunks (the only place MATCH is allowed on a vec0 table).
            // Outer: aggregate to manuscript level via best (smallest-distance) chunk.
            const vecHits = libraryDb.prepare(
              `SELECT lc.library_id as id, MIN(nn.distance) as d
               FROM (
                 SELECT rowid, distance FROM library_vec
                 WHERE embedding MATCH ?
                 ORDER BY distance LIMIT ?
               ) nn
               JOIN library_chunks lc ON lc.id = nn.rowid
               GROUP BY lc.library_id
               ORDER BY d ASC
               LIMIT ?`
            ).all(qVec, fanout * 2, fanout);
            vecHits.forEach((h, i) => vecRanks.set(h.id, i + 1));
          } catch (e) {
            console.warn("[library-search hybrid] vec query failed:", e.message);
          }
        }
      }

      // RRF score = sum of 1 / (k + rank) across methods
      const scores = new Map();
      for (const [id, rank] of ftsRanks) scores.set(id, (scores.get(id) || 0) + 1 / (RRF_K + rank));
      for (const [id, rank] of vecRanks) scores.set(id, (scores.get(id) || 0) + 1 / (RRF_K + rank));

      if (scores.size === 0) {
        // fall through to AI-mode FTS+LIKE for graceful behavior
      } else {
        const ranked = [...scores.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([id]) => id);
        const placeholders = ranked.map(() => "?").join(",");
        const rows = queryAll(
          `SELECT id, title, passage, folder, series_name, word_count,
                  substr(manuscript_text, 1, 250) as excerpt
           FROM library WHERE id IN (${placeholders})`,
          ranked
        );
        const rowMap = Object.fromEntries(rows.map(r => [r.id, r]));
        return ranked.map(id => rowMap[id]).filter(Boolean);
      }
    }

    // FTS path (when available) — AI mode only; browse mode always uses LIKE
    // (browse intentionally limits to title/passage/series and skips full-text index)
    if (mode === "ai" || mode === "hybrid") {
      const ftsQuery = buildFtsQuery(query);
      if (ftsQuery) {
        try {
          const ftsHits = queryAll(
            "SELECT id FROM library_fts WHERE library_fts MATCH ? LIMIT ?",
            [ftsQuery, limit]
          );
          if (ftsHits.length > 0) {
            const ids = ftsHits.map(r => r.id);
            const placeholders = ids.map(() => "?").join(",");
            const rows = queryAll(
              `SELECT id, title, passage, folder, series_name, word_count,
                      substr(manuscript_text, 1, 250) as excerpt
               FROM library WHERE id IN (${placeholders})`,
              ids
            );
            const rowMap = Object.fromEntries(rows.map(r => [r.id, r]));
            return ids.map(id => rowMap[id]).filter(Boolean);
          }
        } catch (e) {
          // fall through to LIKE
        }
      }
    }

    // LIKE search
    const terms = (query.match(/\b\w{3,}\b/g) || []).slice(0, 5);
    if (terms.length === 0) return [];

    let conditions, params;
    if (mode === "ai" || mode === "hybrid") {
      // Include manuscript body for broader topical matching
      conditions = terms.map(() =>
        "(LOWER(title) LIKE ? OR LOWER(passage) LIKE ? OR LOWER(series_name) LIKE ? OR LOWER(manuscript_text) LIKE ?)"
      ).join(" OR ");
      params = terms.flatMap(t => { const t2 = `%${t.toLowerCase()}%`; return [t2, t2, t2, t2]; });
    } else {
      // Browse mode: title, passage, series only — no false positives from body text
      conditions = terms.map(() =>
        "(LOWER(title) LIKE ? OR LOWER(passage) LIKE ? OR LOWER(series_name) LIKE ?)"
      ).join(" OR ");
      params = terms.flatMap(t => { const t2 = `%${t.toLowerCase()}%`; return [t2, t2, t2]; });
    }

    return queryAll(
      `SELECT id, title, passage, folder, series_name, word_count,
              substr(manuscript_text, 1, 250) as excerpt
       FROM library WHERE ${conditions} ORDER BY title LIMIT ?`,
      [...params, limit]
    );
  } catch (e) {
    console.error("Library search error:", e.message);
    return [];
  }
});

// ── Quick Outline: create sermon from outline + PI ───────────────────────────
// Creates a full sermons row with the picked outline JSON-encoded into
// `outline` and PI answers persisted to their matching columns. Mode "full"
// writes stage="planning" and is intended to land in the workspace; mode
// "quick" writes stage="quick" and (caller) typically follows with a
// placeholder DOCX export.
ipcMain.handle("library-create-sermon-from-outline", (_, payload) => {
  const {
    title = "",
    passage = "",
    outline = [],            // [{ text, support?, source? }, ...]
    piAnswers = {},          // { background_noise, audience_assumptions, topic_theme }
    mode = "full",           // "full" | "quick"
    seriesId = null,
    sectionId = null,
  } = payload || {};

  const id = randomUUID();
  const stage = mode === "quick" ? "quick" : "planning";

  // Normalize outline points to the {id, text} schema used by the workspace.
  const normalizedOutline = (Array.isArray(outline) ? outline : [])
    .filter(p => p && typeof p.text === "string" && p.text.trim())
    .map(p => ({ id: randomUUID(), text: p.text.trim() }));

  db.run(
    `INSERT INTO sermons
       (id, series_id, section_id, is_one_off, title, passage, date, preacher,
        stage, mpt, mps, observations, outline, manuscript,
        topic_theme, audience_assumptions, background_noise)
     VALUES (?, ?, ?, ?, ?, ?, '', '', ?, '', '', '', ?, '', ?, ?, ?)`,
    [
      id,
      seriesId,
      sectionId,
      seriesId ? 0 : 1,
      title || "Untitled Sermon",
      passage || "",
      stage,
      JSON.stringify(normalizedOutline),
      (piAnswers.topic_theme || "").trim(),
      (piAnswers.audience_assumptions || "").trim(),
      (piAnswers.background_noise || "").trim(),
    ]
  );
  saveDb();
  return { sermonId: id, outlinePoints: normalizedOutline };
});

// Quick-sermon DOCX template — outline points filled, every other category
// rendered as an italic grey placeholder so the pastor can fill it in Word.
ipcMain.handle("sermon-export-quick-template", async (_, payload) => {
  try {
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = require("docx");

    const {
      title = "Untitled Sermon",
      passage = "",
      outline = [],   // [{ id, text }, ...]
      piAnswers = {},
    } = payload || {};

    const children = [];

    function placeholder(text) {
      return new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text, italics: true, color: "888888" })],
      });
    }
    function prosePara(text, opts = {}) {
      return new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text, ...opts })],
      });
    }
    function divider() {
      return new Paragraph({
        spacing: { before: 200, after: 200 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "————————————————————", color: "AAAAAA" })],
      });
    }
    function h2(text) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 120 },
        children: [new TextRun({ text, bold: true })],
      });
    }

    // Title block
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
      children: [new TextRun({ text: title, bold: true })],
    }));
    if (passage) {
      children.push(prosePara(passage, { color: "666666" }));
    } else {
      children.push(placeholder("[Passage of departure — fill in.]"));
    }

    children.push(divider());

    // Pastoral Intelligence
    const hasPI = ["background_noise", "audience_assumptions", "topic_theme"]
      .some(k => (piAnswers[k] || "").trim());
    if (hasPI) {
      children.push(h2("Pastoral Context"));
      if ((piAnswers.background_noise || "").trim()) {
        children.push(prosePara(`The Cultural Moment: ${piAnswers.background_noise.trim()}`));
      }
      if ((piAnswers.audience_assumptions || "").trim()) {
        children.push(prosePara(`The Room: ${piAnswers.audience_assumptions.trim()}`));
      }
      if ((piAnswers.topic_theme || "").trim()) {
        children.push(prosePara(`The Sermon's Work: ${piAnswers.topic_theme.trim()}`));
      }
      children.push(divider());
    }

    // Introduction (placeholder)
    children.push(h2("Introduction"));
    children.push(placeholder("[Open with the pastoral entry point.]"));
    children.push(placeholder("[Read the passage.]"));
    children.push(placeholder("[Set up what this sermon will do.]"));

    // Per-point sections
    const points = Array.isArray(outline) ? outline : [];
    points.forEach((pt, i) => {
      children.push(divider());
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 120 },
        children: [
          new TextRun({ text: `Point ${i + 1}.  `, bold: true }),
          new TextRun({ text: pt.text || "", bold: true }),
        ],
      }));
      children.push(prosePara("Explanation:", { bold: true }));
      children.push(placeholder("[Develop the theological ground.]"));
      children.push(prosePara("Application:", { bold: true }));
      children.push(placeholder("[Press the implication onto the listener.]"));
      children.push(prosePara("Illustration:", { bold: true }));
      children.push(placeholder("[An image, story, or analogy that lands the point.]"));
    });

    // Conclusion
    children.push(divider());
    children.push(h2("Conclusion"));
    children.push(placeholder("[The charge or response. Where does the Gospel land?]"));

    const doc = new Document({
      styles: { default: { document: { run: { size: 24 } } } },
      sections: [{ properties: {}, children }],
    });

    const exportDir = path.join(app.getPath("documents"), "SermonForge", "exports", "Manuscripts");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const safeTitle = (title || passage || "Sermon").replace(/[<>:"/\\|?*\n\r\t]/g, "—").trim();
    const filepath = path.join(exportDir, `${safeTitle} — Quick Sermon.docx`);

    const buffer = await Packer.toBuffer(doc);
    await fs.promises.writeFile(filepath, buffer);
    shell.openPath(filepath);

    return { success: true, filepath };
  } catch (e) {
    console.error("[sermon-export-quick-template]", e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle("library-get-manuscripts", (event, { ids, truncate = false, maxChars = 600 }) => {
  if (!ids || !ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = queryAll(
    `SELECT id, title, passage, series_name, manuscript_text FROM library WHERE id IN (${placeholders})`,
    ids
  );
  if (truncate) {
    return rows.map(r => ({ ...r, manuscript_text: (r.manuscript_text || "").substring(0, maxChars) }));
  }
  return rows;
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
        const ok = await ensureEmbedder();
        if (ok) {
          const output = await embedder([query], { pooling: "mean", normalize: true });
          const qVec = JSON.stringify(Array.from(output[0].data));
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
//   3. Native DBs close after the flush (theology is read-only; library may have
//      pending vec writes from a background embed, so close after the flush settles).
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
  embedder = null;
  if (libraryDb) {
    try { libraryDb.close(); } catch (_) {}
    libraryDb = null;
  }
  app.exit(0);
});

// Keep the macOS dock-quit semantics: closing all windows on Win/Linux quits;
// macOS keeps the app alive until before-quit. before-quit handles the flush.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
