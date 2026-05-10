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

// ── Bible passage viewer ──────────────────────────────────────────────────
export const fetchPassage = (passage) => api.fetchPassage(passage);

// ── Export ────────────────────────────────────────────────────────────────────
export const exportStudyGuide = (seriesId) => api.exportStudyGuide(seriesId);
export const exportManuscript = (data) => api.exportManuscript(data);

// ── API key setup ─────────────────────────────────────────────────────────────
export const getApiKeyStatus = () => api.getApiKeyStatus();
export const saveApiKeys     = (keys) => api.saveApiKeys(keys);

// ── Feedback ──────────────────────────────────────────────────────────────────
export const getSchemaVersion = () => api.getSchemaVersion();
export const getAppVersion    = () => api.getAppVersion();
export const submitFeedback   = (payload) => api.submitFeedback(payload);

// ── Disk-write health ─────────────────────────────────────────────────────────
export const onDbWriteError = (callback) => api.onDbWriteError(callback);
export const onDbWriteOk    = (callback) => api.onDbWriteOk(callback);
export const flushDb        = () => api.flushDb();

// ── Startup warnings ──────────────────────────────────────────────────────────
export const getStartupWarning = ()        => api.getStartupWarning();
export const openDataFolder    = ()        => api.openDataFolder();

// ── Schema contract guard ─────────────────────────────────────────────────────
export const getSermonColumns = () => api.getSermonColumns();
