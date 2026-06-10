// Database helpers — named operations only. All SQL lives in electron/main.js.
// Components import these functions; nothing here knows table or column names.
//
// Sermon and series state operations are NOT exported from this module.
// They live in `src/core/spine.ts` and route through `ipcMain.handle("spine")`.
// `scripts/spine-integrity.js` blocks any component that imports a sermon or
// series helper from here. This file is now scoped to non-sermon/non-series
// resources: calendar notes, settings, theology, bible passages, exports,
// API keys, feedback, disk-write health, startup warnings, and pastor memory
// backup.

// Browser-preview fallback: when running under Vite alone (no Electron preload),
// `window.electronAPI` is undefined. Returning a permissive stub lets UI-only
// changes be verified in the browser. Real data/AI still requires the Electron shell.
function makeBrowserPreviewStub() {
  if (typeof window !== "undefined" && !window.__sfPreviewStubAnnounced) {
    window.__sfPreviewStubAnnounced = true;
    console.warn("[SermonForge] No Electron preload detected — running with empty IPC stubs (browser preview only).");
  }
  return new Proxy({}, {
    get(_, prop) {
      if (prop === "getApiKeyStatus") return () => Promise.resolve({ configured: true });
      if (typeof prop === "string" && prop.startsWith("on")) return () => () => {};
      return () => Promise.resolve([]);
    },
  });
}

const api = (typeof window !== "undefined" && window.electronAPI) || makeBrowserPreviewStub();

// ── Calendar notes ────────────────────────────────────────────────────────────
export const getCalendarNotes   = ()           => api.getCalendarNotes();
export const createCalendarNote = (data)       => api.createCalendarNote(data);
export const deleteCalendarNote = (id)         => api.deleteCalendarNote(id);

// ── Settings ──────────────────────────────────────────────────────────────────
export const getSetting              = (key)                    => api.getSetting(key);
export const setSetting              = (key, value)             => api.setSetting(key, value);

// ── Theology library ──────────────────────────────────────────────────────────
export const getTheologyStatus      = ()                    => api.getTheologyStatus();
export const searchTheologyLibrary  = (query, limit = 5)   => api.searchTheologyLibrary(query, limit);
export const getTheologyChunks      = (ids, maxChars = 600) => api.getTheologyChunks(ids, maxChars);

// ── Sermon full-content search (v22 schema, post-WTC audit follow-up) ─────
//
// Searches across every text column on every sermon — title, passage,
// series_title, manuscripts, notebooks, structured envelopes (Study sub-
// phases + Main Point Pair + Sermon Frame), outline, delivery notes.
// JSON envelope columns are indexed as their flattened leaf text so search
// hits read as natural prose. Returns an array of { id, title, passage,
// series_id, series_title, stage, date, current_stage, current_sub_phase,
// matchedColumn, snippet } sorted by sermon recency.
//
// Implementation note: the search table predates the better-sqlite3 driver
// swap (sql.js lacked FTS5), so it is a regular SQLite table with flattened
// text per column and LIKE-based matching. JS-side snippet generation marks matched ranges
// with `‹mark›…‹/mark›` (single guillemets, not HTML brackets) so the
// renderer can split on them without HTML escaping concerns.
export const searchSermons = (query, limit = 50) => api.searchSermons(query, limit);

// ── Bible passage viewer ──────────────────────────────────────────────────
export const fetchPassage = (passage) => api.fetchPassage(passage);

// ── Export ────────────────────────────────────────────────────────────────────
export const exportStudyGuide = (seriesId) => api.exportStudyGuide(seriesId);
export const exportManuscript = (data) => api.exportManuscript(data);

// ── API key setup ─────────────────────────────────────────────────────────────
export const getApiKeyStatus = () => api.getApiKeyStatus();
export const saveApiKeys     = (keys) => api.saveApiKeys(keys);

// ── External links ────────────────────────────────────────────────────────────
// Main process enforces a hard allowlist — only known URLs ever open.
export const openExternal = (url) => api.openExternal(url);

// ── Support ───────────────────────────────────────────────────────────────────
// Opens a mailto to the support address (address lives main-side).
export const emailSupport = (data) => api.emailSupport(data);

// ── Updater ───────────────────────────────────────────────────────────────────
export const getUpdaterStatus = () => api.getUpdaterStatus();
export const updaterRestart   = () => api.updaterRestart();
export const onUpdaterStatus  = (callback) => api.onUpdaterStatus(callback);

// ── Feedback ──────────────────────────────────────────────────────────────────
export const getSchemaVersion = () => api.getSchemaVersion();
export const getAppVersion    = () => api.getAppVersion();

// ── Disk-write health ─────────────────────────────────────────────────────────
export const onDbWriteError = (callback) => api.onDbWriteError(callback);
export const onDbWriteOk    = (callback) => api.onDbWriteOk(callback);
export const flushDb        = () => api.flushDb();

// ── Close-time edit flush ─────────────────────────────────────────────────────
// main asks the renderer to flush debounced edits before close/quit; the
// renderer acks with the nonce. See src/utils/closeFlush.js for the registry.
export const onFlushEdits   = (callback) => api.onFlushEdits(callback);
export const flushEditsDone = (nonce)    => api.flushEditsDone(nonce);

// ── Startup warnings ──────────────────────────────────────────────────────────
export const getStartupWarning = ()        => api.getStartupWarning();
export const openDataFolder    = ()        => api.openDataFolder();

// ── Schema contract guard ─────────────────────────────────────────────────────
export const getSermonColumns = () => api.getSermonColumns();
