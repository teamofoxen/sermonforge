const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { randomUUID } = require("crypto");

// Load .env — project root when unpackaged, resources dir when packaged
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, ".env")
  : path.join(__dirname, "../.env");
require("dotenv").config({ path: envPath, override: true });

const { registerAIHandlers } = require("./ai");
const BetterSqlite3 = require("better-sqlite3");
const sqliteVec = require("sqlite-vec");

let db = null;
let dbPath = null;
let SQL = null;          // sql.js constructor — used for main sermonforge.db
let theologyDb = null;   // better-sqlite3 instance for theology.db (+ sqlite-vec)
let mainWindow;
let saveTimer = null;
let _pendingWrite = false; // true between saveDb() and the debounce flush; used for crash-window warn

const LIBRARY_PATH = path.join(os.homedir(), "OneDrive", "Ministry", "Preaching", "Sermon Library");

// ── Database setup ──────────────────────────────────────────────────────────
async function initDatabase() {
  const initSqlJs = require("sql.js");
  SQL = await initSqlJs({
    locateFile: (file) => app.isPackaged
      ? path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "sql.js", "dist", file)
      : path.join(__dirname, "../node_modules/sql.js/dist/", file),
  });

  // Determine DB path
  const oneDrivePath = path.join(os.homedir(), "OneDrive", "SermonForge");
  if (fs.existsSync(oneDrivePath)) {
    dbPath = path.join(oneDrivePath, "sermonforge.db");
  } else {
    const userData = app.getPath("userData");
    if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
    dbPath = path.join(userData, "sermonforge.db");
  }

  // Load existing DB or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
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

  // Ensure FTS index exists — tries FTS5 first, falls back to FTS4.
  // Runs every startup; IF NOT EXISTS makes it a no-op when already present.
  try {
    const ftsExists = queryOne("SELECT name FROM sqlite_master WHERE type='table' AND name='library_fts'");
    if (!ftsExists) {
      try {
        db.run(`CREATE VIRTUAL TABLE library_fts USING fts5(id UNINDEXED, title, passage, manuscript_text)`);
        console.log("FTS5 index created");
      } catch (_) {
        db.run(`CREATE VIRTUAL TABLE library_fts USING fts4(id, title, passage, manuscript_text)`);
        console.log("FTS4 index created");
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

  saveDb();
}

function flushDb() {
  if (!db || !dbPath) return;
  // If _pendingWrite is still true here, flushDb was called externally (e.g. quit handler)
  // while a debounced write was still queued. The 500ms crash window was open.
  if (process.env.ELECTRON_DEV === "1" && _pendingWrite) {
    console.warn("[DB] flushDb: called with a pending write still queued — the 500ms crash window was open. This is expected on app quit; unexpected mid-session.");
  }
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    _pendingWrite = false;
  } catch (e) {
    console.error("Failed to save DB:", e.message);
  }
}

function saveDb() {
  // ACCEPTED RISK: 500ms crash window. Any mutation between saveDb() and the
  // debounce firing could be lost if the process terminates in this window.
  // Acceptable for a single-user desktop app; OneDrive provides backup safety net.
  _pendingWrite = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    _pendingWrite = false; // cleared before flush so flushDb's external-call check is correct
    flushDb();
  }, 500);
}

// ── Lazy theology loader (better-sqlite3 + sqlite-vec) ──────────────────────
let theologyVecAvailable = false;  // true when theology_vec table has embeddings
let theologyEmbedder = null;       // lazy-loaded sentence-transformer pipeline

async function ensureTheologyDbLoaded() {
  if (theologyDb) return;
  if (!dbPath) return;
  const theologyDbFile = path.join(path.dirname(dbPath), "theology.db");
  if (!fs.existsSync(theologyDbFile)) return;
  try {
    theologyDb = new BetterSqlite3(theologyDbFile, { readonly: true });
    sqliteVec.load(theologyDb);
    // Check if vector embeddings have been built
    try {
      const { cnt } = theologyDb.prepare("SELECT COUNT(*) as cnt FROM theology_vec").get();
      theologyVecAvailable = cnt > 0;
    } catch (_) {
      theologyVecAvailable = false;
    }
    console.log(`Theology DB loaded (better-sqlite3 + sqlite-vec, vectors: ${theologyVecAvailable})`);
  } catch (e) {
    console.error("Failed to load theology DB:", e.message);
  }
}

async function ensureTheologyEmbedder() {
  if (theologyEmbedder) return true;
  try {
    const { pipeline } = await import("@xenova/transformers");
    theologyEmbedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      quantized: true,
    });
    return true;
  } catch (e) {
    console.error("Failed to load embedding model:", e.message);
    return false;
  }
}

// ── Schema migrations ────────────────────────────────────────────────────────
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
    try { db.run("ALTER TABLE sermons ADD COLUMN functional_elements TEXT DEFAULT '{}'"); } catch (_) {}
    try { db.run("ALTER TABLE sermons ADD COLUMN checklist TEXT DEFAULT '{}'"); } catch (_) {}
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2')");
    version = 2;
  }

  if (version < 3) {
    // v3: sermon library table + FTS search index
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
      db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS library_fts USING fts5(id UNINDEXED, title, passage, manuscript_text)`);
    } catch (_) {
      try {
        db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS library_fts USING fts4(id, title, passage, manuscript_text)`);
      } catch (e) {
        console.error("FTS not available:", e.message);
      }
    }
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '3')");
    version = 3;
  }

  if (version < 4) {
    // v4: series planning fields, sections table, calendar notes, sermon section/one-off
    try { db.run("ALTER TABLE series ADD COLUMN big_idea TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN overview TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN passage_range TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN start_date TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN end_date TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN structural_outline TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN status TEXT DEFAULT 'planning'"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN canon_category TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE sermons ADD COLUMN section_id TEXT DEFAULT NULL"); } catch (_) {}
    try { db.run("ALTER TABLE sermons ADD COLUMN is_one_off INTEGER DEFAULT 0"); } catch (_) {}
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
    try { db.run("ALTER TABLE sermons ADD COLUMN topic_theme TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE sermons ADD COLUMN audience_assumptions TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE sermons ADD COLUMN background_noise TEXT DEFAULT ''"); } catch (_) {}
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '6')");
    version = 6;
  }

  if (version < 7) {
    // v7: series study fields + sermon study guide note
    try { db.run("ALTER TABLE series ADD COLUMN redemptive_context TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN book_background TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN book_argument TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN book_structure TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN series_motivation TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE series ADD COLUMN emerging_big_idea TEXT DEFAULT ''"); } catch (_) {}
    try { db.run("ALTER TABLE sermons ADD COLUMN study_guide_note TEXT DEFAULT ''"); } catch (_) {}
    db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '7')");
    version = 7;
  }
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

function parseLibraryFile(filePath) {
  const basename = path.basename(filePath, ".docx");
  const relative = path.relative(LIBRARY_PATH, filePath);
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
    "together","need","want","please","give","different","parts","sermon",
    "sermons","three","outline","outlines","based","existing","new","using",
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
      sandbox: false,
    },
    show: false,
  });

  // Always load the built dist — "npm start" runs vite build first
  // Use Vite dev server only when ELECTRON_DEV=1 (the "dev" script)
  if (process.env.ELECTRON_DEV === "1") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
}

// ── IPC handlers ────────────────────────────────────────────────────────────
registerAIHandlers(ipcMain);

// ── Column allowlists — only these field names are accepted in update operations ─
const SERMON_COLUMNS = new Set([
  "title", "passage", "date", "preacher", "stage", "big_idea", "mpt", "mps",
  "observations", "interpretation", "redemptive_thread", "implications",
  "outline", "manuscript", "delivery_notes", "timing_notes", "post_sermon",
  "functional_elements", "checklist", "series_id", "section_id", "is_one_off",
  "topic_theme", "audience_assumptions", "background_noise", "study_guide_note",
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
    if (app.isPackaged) {
      console.warn(msg);
    } else {
      throw new Error(msg);
    }
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
        stage, big_idea, mpt, mps, observations, outline, manuscript)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '', '[]', '')`,
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
  queryAll("SELECT * FROM series ORDER BY year DESC, title ASC")
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
       AND (sr.id IS NULL OR sr.id NOT LIKE 'demo-%')
     ORDER BY s.updated_at DESC, s.created_at DESC
     LIMIT ?`,
    [limit]
  )
);

// ── Demo series seed ──────────────────────────────────────────────────────────
ipcMain.handle("db-loadDemoSeries", () => {
  const { SERIES_ID, series, sermons } = require("./demoData");

  // Idempotent: return existing series if already loaded
  const existing = queryOne("SELECT id FROM series WHERE id = ?", [SERIES_ID]);
  if (existing) return { seriesId: SERIES_ID, created: false };

  db.run("BEGIN");
  try {
    // Insert series
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

    // Insert sermons
    for (const s of sermons) {
      db.run(
        `INSERT INTO sermons (
          id, series_id, is_one_off, title, passage, date, stage,
          big_idea, mpt, mps,
          observations, interpretation, redemptive_thread, implications,
          outline, functional_elements,
          manuscript, delivery_notes, timing_notes,
          topic_theme, audience_assumptions, background_noise, study_guide_note
        ) VALUES (?,?,0,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          s.id, s.series_id, s.title, s.passage || "", s.date || "", s.stage || "planning",
          s.big_idea || "", s.mpt || "", s.mps || "",
          s.observations || "", s.interpretation || "", s.redemptive_thread || "", s.implications || "",
          s.outline || "[]", s.functional_elements || "{}",
          s.manuscript || "", s.delivery_notes || "", s.timing_notes || "",
          s.topic_theme || "", s.audience_assumptions || "", s.background_noise || "", s.study_guide_note || "",
        ]
      );
    }

    db.run("COMMIT");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }
  saveDb();
  return { seriesId: SERIES_ID, created: true };
});

ipcMain.handle("library-status", () => {
  try {
    const row = queryOne("SELECT COUNT(*) as count, MAX(imported_at) as last_imported FROM library");
    return { count: row?.count || 0, lastImported: row?.last_imported || null };
  } catch (e) {
    console.error('[library-status]', e);
    return { count: 0, lastImported: null };
  }
});

ipcMain.handle("library-import", async (event) => {
  if (!fs.existsSync(LIBRARY_PATH)) {
    return { error: "Library path not found", total: 0, imported: 0, errors: 0 };
  }

  const mammoth = require("mammoth");
  const allFiles = getAllDocxFiles(LIBRARY_PATH);

  const existingRows = queryAll("SELECT filepath FROM library");
  const existingPaths = new Set(existingRows.map(r => r.filepath));

  const toImport = allFiles.filter(f => !existingPaths.has(path.relative(LIBRARY_PATH, f)));
  const total = toImport.length;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("library-import-progress", { done: 0, total, complete: false });
  }

  let imported = 0;
  let errors = 0;

  for (const filePath of toImport) {
    try {
      const relativePath = path.relative(LIBRARY_PATH, filePath);
      const { title, passage, folder, seriesName } = parseLibraryFile(filePath);
      const result = await mammoth.extractRawText({ path: filePath });
      const manuscriptText = result.value.trim();
      const wordCount = manuscriptText.split(/\s+/).filter(Boolean).length;
      const id = randomUUID();

      // NOTE: UNIQUE constraint is on filepath (relative path). Moving a file within
      // LIBRARY_PATH changes its relative path, causing re-import to create a duplicate
      // record. The old record becomes an orphan in search results. A future
      // "clean orphans" function would resolve this.
      db.run(
        `INSERT OR IGNORE INTO library (id, filepath, filename, title, passage, folder, series_name, manuscript_text, word_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, relativePath, path.basename(filePath, ".docx"), title, passage, folder, seriesName, manuscriptText, wordCount]
      );

      // Only insert into FTS when a new row was actually created (not an IGNORE no-op).
      // An IGNORE no-op means the file was already imported; inserting FTS for it
      // would create an orphan entry with a new UUID that matches nothing in library.
      if (db.getRowsModified() > 0) {
        try {
          db.run(
            `INSERT INTO library_fts (id, title, passage, manuscript_text) VALUES (?, ?, ?, ?)`,
            [id, title, passage, manuscriptText]
          );
        } catch (e) {
          console.warn("[library-import] FTS insert failed for", path.basename(filePath, ".docx"), e.message);
        }
      }

      imported++;
    } catch (e) {
      console.error(`Import error for ${filePath}:`, e.message);
      errors++;
    }

    if ((imported + errors) % 10 === 0) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("library-import-progress", { done: imported, total, complete: false });
      }
    }

    if ((imported + errors) % 50 === 0) {
      saveDb();
    }
  }

  saveDb();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("library-import-progress", { done: imported, total, complete: true });
  }

  return { total: allFiles.length, imported, errors, skipped: existingPaths.size };
});

ipcMain.handle("library-search", (event, { query, limit = 100, mode = "browse" }) => {
  // mode "browse" — title/passage/series only (search bar filtering)
  // mode "ai"     — includes manuscript_text (Quick Outline, AIPanel contextual search)
  try {
    if (!query || !query.trim()) {
      return queryAll(
        `SELECT id, title, passage, folder, series_name, word_count,
                substr(manuscript_text, 1, 250) as excerpt
         FROM library ORDER BY title LIMIT ?`,
        [limit]
      );
    }

    // FTS5 path (when available) — always searches all indexed columns but ranks well
    if (mode === "ai") {
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
    if (mode === "ai") {
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

// Score a result chunk by counting how many distinct search terms appear in it.
// Used to rerank FTS4 results by relevance after fetching a larger candidate set.
function scoreTheologyChunk(chunk, terms) {
  const haystack = `${chunk.author} ${chunk.work} ${chunk.full_text || chunk.text_chunk}`.toLowerCase();
  return terms.reduce((score, term) => {
    const bare = term.replace(/"/g, "");
    const hits = (haystack.match(new RegExp(bare, "g")) || []).length;
    return score + hits;
  }, 0);
}

ipcMain.handle("theology-search", async (event, { query, limit = 5 }) => {
  await ensureTheologyDbLoaded();
  if (!theologyDb) return [];
  try {
    if (!query || !query.trim()) return [];

    const lower = query.toLowerCase();

    // Detect author names in the query
    const detectedAuthors = [];
    let scrubbed = lower;
    for (const [keyword] of Object.entries(THEOLOGY_AUTHORS)) {
      if (lower.includes(keyword)) {
        detectedAuthors.push(keyword);
        scrubbed = scrubbed.replace(new RegExp(keyword, "g"), " ");
      }
    }

    // ── Build FTS query parts (used by both semantic hybrid and pure FTS path) ──
    // Extract user-quoted phrases as FTS4 phrase terms
    const phraseTerms = [];
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

    const contentParts = [...phraseTerms, ...contentTerms];

    // ── Semantic search path (vec0) ────────────────────────────────────
    // When vectors are available, run semantic search AND FTS in parallel,
    // then merge results. FTS finds exact phrase matches the vector model may miss.
    if (theologyVecAvailable) {
      const ok = await ensureTheologyEmbedder();
      if (ok) {
        const output = await theologyEmbedder([query], { pooling: "mean", normalize: true });
        const qVec = JSON.stringify(Array.from(output[0].data));
        const fetchLimit = detectedAuthors.length > 0 ? limit * 10 : limit * 4;

        let vecResults = queryTheology(
          `SELECT t.id, t.author, t.work,
                  substr(t.text, 1, 2000) as text_chunk
           FROM (
             SELECT rowid, distance FROM theology_vec
             WHERE embedding MATCH ?
             ORDER BY distance LIMIT ?
           ) nn
           JOIN theology t ON nn.rowid = t.rowid`,
          [qVec, fetchLimit]
        );

        // Run FTS alongside semantic to catch exact phrase matches
        let ftsResults = [];
        if (contentParts.length > 0) {
          try {
            const authorName = detectedAuthors.length > 0 ? THEOLOGY_AUTHORS[detectedAuthors[0]] : null;
            const ftsQuery = authorName
              ? `SELECT t.id, t.author, t.work,
                        substr(t.text, 1, 2000) as text_chunk,
                        substr(t.text, 1, 2000) as full_text
                 FROM theology_fts
                 JOIN theology t ON theology_fts.rowid = t.rowid
                 WHERE theology_fts MATCH ?
                 AND t.author = ?
                 LIMIT ?`
              : `SELECT t.id, t.author, t.work,
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
          } catch (_) {
            // FTS unavailable or query failed — semantic results are sufficient
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
    }

    // ── FTS4 fallback path ─────────────────────────────────────────────
    // Used when no vector embeddings exist or embedding model failed to load.
    let candidates = [];

    if (detectedAuthors.length > 0 && contentParts.length > 0) {
      const authorName = THEOLOGY_AUTHORS[detectedAuthors[0]];
      candidates = queryTheology(
        `SELECT t.id, t.author, t.work,
                snippet(theology_fts, "", "", "…", 3, 50) as text_chunk,
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
        `SELECT t.id, t.author, t.work,
                snippet(theology_fts, "", "", "…", 3, 50) as text_chunk,
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
    console.error("Theology search error:", e.message);
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
      `SELECT id, author, work, substr(text, 1, ?) as text_chunk
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

    const studyGuidesDir = path.join(os.homedir(), "OneDrive", "SermonForge", "StudyGuides");
    if (!fs.existsSync(studyGuidesDir)) {
      fs.mkdirSync(studyGuidesDir, { recursive: true });
    }

    const safeTitle = (series.title || "Untitled").replace(/[<>:"/\\|?*\n\r\t]/g, "—").trim();
    const filepath = path.join(studyGuidesDir, `${safeTitle} — Study Guide.docx`);

    const { Packer } = require("docx");
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filepath, buffer);

    return { success: true, filepath };
  } catch (e) {
    console.error("[series-export-study-guide]", e);
    return { success: false, error: e.message };
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

const CATEGORY_LABELS = {
  bug:     "Bug",
  ux:      "UI/UX",
  ai:      "AI Quality",
  feature: "Missing Feature",
  copy:    "Content/Copy",
};

ipcMain.handle("feedback-submit", (_, payload) => {
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

    const feedbackDir = path.join(os.homedir(), "OneDrive", "SermonForge", "Feedback");
    if (!fs.existsSync(feedbackDir)) {
      fs.mkdirSync(feedbackDir, { recursive: true });
    }

    // Filename: YYYY-MM-DD-HH-MM-category.md
    const dt = new Date(submittedAt);
    const pad = (n) => String(n).padStart(2, "0");
    const datePart = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const timePart = `${pad(dt.getHours())}-${pad(dt.getMinutes())}`;
    const filename = `${datePart}-${timePart}-${category}.md`;
    const filepath = path.join(feedbackDir, filename);

    fs.writeFileSync(filepath, lines.join("\n"), "utf8");
    return { success: true, filepath };
  } catch (e) {
    console.error("[feedback-submit]", e);
    return { success: false, error: e.message };
  }
});

// ── Bible passage fetch ───────────────────────────────────────────────────────
// In-memory caches — keyed by `${bibleId}|${passageId}` or `esv|${passage}`
const _passageCache = new Map();
let _bibleCatalog = null; // { niv: id|null, msg: id|null } — populated on first use

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

async function getBibleCatalog() {
  if (_bibleCatalog) return _bibleCatalog;
  const apiKey = process.env.BIBLE_API_KEY;
  if (!apiKey) return { niv: null, msg: null, error: 'BIBLE_API_KEY not set in .env' };
  try {
    const res = await fetch('https://rest.api.bible/v1/bibles', {
      headers: { 'api-key': apiKey },
    });
    if (!res.ok) {
      const err = `API.Bible returned HTTP ${res.status} — check your key at scripture.api.bible`;
      console.error('[bible-catalog]', err);
      return { niv: null, msg: null, error: err };
    }
    const json = await res.json();
    let niv = null, msg = null;
    for (const b of (json.data || [])) {
      const abbr = (b.abbreviation || '').toUpperCase();
      const name = (b.name || '').toLowerCase();
      if (!niv && (abbr === 'NIV' || name.includes('new international version'))) niv = b.id;
      if (!msg && (abbr === 'MSG' || name.includes('the message'))) msg = b.id;
    }
    _bibleCatalog = { niv, msg };
    return _bibleCatalog;
  } catch (e) {
    console.error('[bible-catalog]', e.message);
    return { niv: null, msg: null, error: e.message };
  }
}

async function fetchApiBibleText(bibleId, osisId, apiKey) {
  const cacheKey = `${bibleId}|${osisId}`;
  if (_passageCache.has(cacheKey)) return _passageCache.get(cacheKey);
  const url = `https://rest.api.bible/v1/bibles/${bibleId}/passages/${encodeURIComponent(osisId)}` +
    `?content-type=text&include-notes=false&include-titles=false` +
    `&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`;
  const res = await fetch(url, { headers: { 'api-key': apiKey } });
  if (!res.ok) throw new Error(`API.Bible HTTP ${res.status}`);
  const json = await res.json();
  const raw = json.data?.content || '';
  const text = raw
    .replace(/¶\s*/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\[(\d+)\]\s*/g, '[$1] ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  _passageCache.set(cacheKey, text);
  return text;
}

async function fetchEsvText(passage) {
  const esvKey = process.env.ESV_API_KEY;
  if (!esvKey) return null; // null = key not configured yet
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
  const apiKey = process.env.BIBLE_API_KEY;
  const osisId = passageToOsisId(passage);
  const catalog = await getBibleCatalog();
  const result = { esv: null, niv: null, msg: null, esvPending: false };

  const catalogErr = catalog.error || null;

  await Promise.all([
    fetchEsvText(passage)
      .then(t => { if (t === null) result.esvPending = true; else result.esv = t; })
      .catch(e => { result.esvError = e.message; }),
    apiKey && catalog.niv && osisId
      ? fetchApiBibleText(catalog.niv, osisId, apiKey)
          .then(t => { result.niv = t; })
          .catch(e => { result.nivError = e.message; })
      : Promise.resolve().then(() => { result.nivError = catalogErr || (!osisId ? 'Could not parse passage reference' : 'NIV not in your API.Bible catalog'); }),
    apiKey && catalog.msg && osisId
      ? fetchApiBibleText(catalog.msg, osisId, apiKey)
          .then(t => { result.msg = t; })
          .catch(e => { result.msgError = e.message; })
      : Promise.resolve().then(() => { result.msgError = catalogErr || (!osisId ? 'Could not parse passage reference' : 'MSG not in your API.Bible catalog'); }),
  ]);

  return result;
});

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await initDatabase();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (db) flushDb();
  if (theologyDb) { try { theologyDb.close(); } catch (_) {} }
  theologyDb = null;
  theologyVecAvailable = false;
  theologyEmbedder = null;
  if (process.platform !== "darwin") app.quit();
});
