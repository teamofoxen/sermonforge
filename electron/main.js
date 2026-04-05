const { app, BrowserWindow, ipcMain, shell } = require("electron");
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

let db = null;
let dbPath = null;
let SQL = null;          // sql.js constructor — stored for lazy theology load
let theologyDb = null;
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
      canon_category TEXT DEFAULT ''
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
        } catch (_) {}
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

// ── Lazy theology loader ─────────────────────────────────────────────────────
async function ensureTheologyDbLoaded() {
  if (theologyDb) return;
  if (!SQL || !dbPath) return;
  const theologyDbFile = path.join(path.dirname(dbPath), "theology.db");
  if (!fs.existsSync(theologyDbFile)) return;
  try {
    const buf = fs.readFileSync(theologyDbFile);
    theologyDb = new SQL.Database(buf);
    console.log("Theology DB loaded (lazy)");
  } catch (e) {
    console.error("Failed to load theology DB:", e.message);
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

// ── Theology query helper ────────────────────────────────────────────────────
function queryTheology(sql, params = []) {
  const stmt = theologyDb.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
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
    "she","they","do","did","has","have","had","its","which","who","what",
    "when","how","can","will","would","could","should","may","might","put",
    "together","need","want","please","give","different","parts","sermon",
    "sermons","three","outline","outlines","based","existing","new","using"
  ]);
  const words = userQuery.toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  if (words.length === 0) return null;
  return [...new Set(words)].slice(0, 8).map(w => `"${w}"`).join(" OR ");
}

// ── Seed data ─────────────────────────────────────────────────────────────
function generateId() {
  return randomUUID();
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
  "topic_theme", "audience_assumptions", "background_noise",
]);

const SERIES_COLUMNS = new Set([
  "title", "color", "description", "year", "big_idea", "overview",
  "passage_range", "start_date", "end_date", "structural_outline", "status", "canon_category",
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
  if (!update) return;
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
  db.run("DELETE FROM library WHERE id = ?", [id]);
  db.run("DELETE FROM library_fts WHERE id = ?", [id]);
  saveDb();
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
ipcMain.handle("db-getRecentSermons", (_, limit = 3) =>
  queryAll(
    `SELECT s.*, sr.title as series_title, sr.color as series_color
     FROM sermons s
     LEFT JOIN series sr ON s.series_id = sr.id
     WHERE s.stage != 'archived' AND s.stage != 'planning'
     ORDER BY s.updated_at DESC, s.created_at DESC
     LIMIT ?`,
    [limit]
  )
);

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
  return { available: theologyDb !== null };
});

ipcMain.handle("theology-search", async (event, { query, limit = 5 }) => {
  await ensureTheologyDbLoaded();
  if (!theologyDb) return [];
  try {
    if (!query || !query.trim()) return [];
    const terms = (query.replace(/[^a-zA-Z0-9\s]/g, " ").toLowerCase().match(/\b\w{4,}\b/g) || [])
      .filter((w, i, a) => a.indexOf(w) === i)
      .slice(0, 6);
    if (!terms.length) return [];

    // Score: author match = +5, work match = +3, text match = +1 (per term)
    const scoreExpr = terms.map(() =>
      `(CASE WHEN LOWER(author) LIKE ? THEN 5 ELSE 0 END) +
       (CASE WHEN LOWER(work)   LIKE ? THEN 3 ELSE 0 END) +
       (CASE WHEN LOWER(text)   LIKE ? THEN 1 ELSE 0 END)`
    ).join(" + ");

    const whereExpr = terms.map(() =>
      "(LOWER(author) LIKE ? OR LOWER(work) LIKE ? OR LOWER(text) LIKE ?)"
    ).join(" OR ");

    const lcTerms = terms.map(t => `%${t}%`);
    const scoreParams = lcTerms.flatMap(lc => [lc, lc, lc]);
    const whereParams = lcTerms.flatMap(lc => [lc, lc, lc]);

    return queryTheology(
      `SELECT id, author, work, substr(text, 1, 600) as text_chunk,
              (${scoreExpr}) as score
       FROM theology
       WHERE ${whereExpr}
       ORDER BY score DESC
       LIMIT ?`,
      [...scoreParams, ...whereParams, limit]
    );
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

ipcMain.handle('open-logos', async (event, passage) => {
  const { clipboard } = require('electron');
  clipboard.writeText(passage);
  try {
    await shell.openExternal('logos4:');
  } catch (e) {
    console.error("[Logos] shell.openExternal failed:", e.message);
    return { success: false };
  }
  return { success: true };
});

// ── Logos URL builder ────────────────────────────────────────────────────────
const BOOK_ABBREVS = {
  Genesis: "Gen", Exodus: "Exo", Leviticus: "Lev", Numbers: "Num",
  Deuteronomy: "Deu", Joshua: "Jos", Judges: "Jdg", Ruth: "Rut",
  "1 Samuel": "1Sa", "2 Samuel": "2Sa", "1 Kings": "1Ki", "2 Kings": "2Ki",
  "1 Chronicles": "1Ch", "2 Chronicles": "2Ch", Ezra: "Ezr", Nehemiah: "Neh",
  Esther: "Est", Job: "Job", Psalms: "Psa", Psalm: "Psa", Proverbs: "Pro",
  Ecclesiastes: "Ecc", "Song of Solomon": "Sol", Isaiah: "Isa",
  Jeremiah: "Jer", Lamentations: "Lam", Ezekiel: "Eze", Daniel: "Dan",
  Hosea: "Hos", Joel: "Joe", Amos: "Amo", Obadiah: "Oba", Jonah: "Jon",
  Micah: "Mic", Nahum: "Nah", Habakkuk: "Hab", Zephaniah: "Zep",
  Haggai: "Hag", Zechariah: "Zec", Malachi: "Mal",
  Matthew: "Mat", Mark: "Mar", Luke: "Luk", John: "Joh", Acts: "Act",
  Romans: "Rom", "1 Corinthians": "1Co", "2 Corinthians": "2Co",
  Galatians: "Gal", Ephesians: "Eph", Philippians: "Php", Colossians: "Col",
  "1 Thessalonians": "1Th", "2 Thessalonians": "2Th", "1 Timothy": "1Ti",
  "2 Timothy": "2Ti", Titus: "Tit", Philemon: "Phm", Hebrews: "Heb",
  James: "Jas", "1 Peter": "1Pe", "2 Peter": "2Pe", "1 John": "1Jo",
  "2 John": "2Jo", "3 John": "3Jo", Jude: "Jud", Revelation: "Rev",
};

function buildLogosUrl(passage) {
  try {
    const match = passage.match(
      /^([\w\s]+?)\s+(\d+):(\d+)(?:-(\d+)(?::(\d+))?)?$/
    );
    if (!match) return `logos4://bible/${encodeURIComponent(passage)}`;

    const [, book, chapter, verseStart, endChapter, verseEnd] = match;
    const abbrev = BOOK_ABBREVS[book.trim()] || book.trim();

    if (endChapter) {
      if (verseEnd) {
        // cross-chapter: e.g. Matthew 5:1-7:12 → Mat.5.1-Mat.7.12
        return `logos4://bible/esv/${abbrev}.${chapter}.${verseStart}-${abbrev}.${endChapter}.${verseEnd}`;
      }
      // single-chapter range: e.g. Galatians 1:1-10 → Gal.1.1-Gal.1.10
      return `logos4://bible/esv/${abbrev}.${chapter}.${verseStart}-${abbrev}.${chapter}.${endChapter}`;
    }
    return `logos4://bible/esv/${abbrev}.${chapter}.${verseStart}`;
  } catch {
    return `logos4://bible/${encodeURIComponent(passage)}`;
  }
}

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
  if (process.platform !== "darwin") app.quit();
});
