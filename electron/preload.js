const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Spine — the only sermon/series state surface ──────────────────────────
  // src/core/spine.ts is the renderer-side companion. Direct calls to
  // window.electronAPI.spine() outside src/core/spine.ts are flagged by
  // scripts/spine-integrity.js.
  spine: (op, payload) => ipcRenderer.invoke("spine", op, payload),

  // ── Calendar notes ────────────────────────────────────────────────────────
  getCalendarNotes:    ()          => ipcRenderer.invoke("db-getCalendarNotes"),
  createCalendarNote:  (data)      => ipcRenderer.invoke("db-createCalendarNote", data),
  deleteCalendarNote:  (id)        => ipcRenderer.invoke("db-deleteCalendarNote", id),

  // ── Settings ──────────────────────────────────────────────────────────────
  getSetting:               (key)                   => ipcRenderer.invoke("db-getSetting", key),
  setSetting:               (key, value)            => ipcRenderer.invoke("db-setSetting", { key, value }),

  // ── Theology library ──────────────────────────────────────────────────────
  getTheologyStatus:      ()                     => ipcRenderer.invoke("theology-status"),
  searchTheologyLibrary:  (query, limit)         => ipcRenderer.invoke("theology-search", { query, limit }),
  getTheologyChunks:      (ids, maxChars)        => ipcRenderer.invoke("theology-get-chunks", { ids, maxChars }),

  // ── Sermon full-text search (v22) ─────────────────────────────────────────
  searchSermons: (query, limit) => ipcRenderer.invoke("db-searchSermons", { query, limit }),

  // ── Export ───────────────────────────────────────────────────────────────────
  exportStudyGuide: (seriesId) => ipcRenderer.invoke("series-export-study-guide", seriesId),
  exportManuscript: (data) => ipcRenderer.invoke("sermon-export-manuscript", data),

  // ── Bible passage ─────────────────────────────────────────────────────────
  fetchPassage: (passage) => ipcRenderer.invoke('passage-fetch', passage),

  // ── API key setup ─────────────────────────────────────────────────────────
  getApiKeyStatus: () => ipcRenderer.invoke("app-get-key-status"),
  saveApiKeys:     (keys) => ipcRenderer.invoke("app-save-api-key", keys),

  // ── External links (hard-allowlisted in main) ─────────────────────────────
  openExternal: (url) => ipcRenderer.invoke("app-open-external", url),

  // ── Feedback ──────────────────────────────────────────────────────────────
  getSchemaVersion: () => ipcRenderer.invoke("db-getSchemaVersion"),
  getAppVersion:    () => ipcRenderer.invoke("app-get-version"),

  // ── Renderer error reporting ──────────────────────────────────────────────
  // Global error hooks + the React ErrorBoundary forward crashes here so they
  // reach app.log (and a `crash` telemetry event) instead of vanishing into a
  // closed DevTools console on a user machine. Fire-and-forget.
  reportRendererError: (label, detail) => ipcRenderer.invoke("report-renderer-error", { label, detail }),

  // ── Schema contract guard ─────────────────────────────────────────────────
  // Renderer-side SERMON_COLUMNS mirror is asserted against this on App mount.
  getSermonColumns: () => ipcRenderer.invoke("app-get-sermon-columns"),

  // ── Startup warnings (OneDrive etc.) ──────────────────────────────────────
  // Pull-pattern: main holds a one-shot warning slot, renderer fetches on mount.
  // Avoids racing the React mount that a webContents.send would lose.
  getStartupWarning: () => ipcRenderer.invoke("app-get-startup-warning"),
  openDataFolder: () => ipcRenderer.invoke("app-open-data-folder"),

  // ── Disk-write health ─────────────────────────────────────────────────────
  // Subscriber for the persistent banner. main emits "db-write-error" only on
  // the second consecutive flushDb failure; emits "db-write-ok" once writes recover.
  onDbWriteError: (callback) => {
    const handler = (event, message) => callback(message);
    ipcRenderer.on("db-write-error", handler);
    return () => ipcRenderer.removeListener("db-write-error", handler);
  },
  onDbWriteOk: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("db-write-ok", handler);
    return () => ipcRenderer.removeListener("db-write-ok", handler);
  },
  // Manual flush — banner's "Retry" button.
  flushDb: () => ipcRenderer.invoke("db-flush"),

  // ── Close-time edit flush ─────────────────────────────────────────────────
  // main asks the renderer to flush debounced edits before the window closes
  // or the app quits (flushRendererEdits in electron/main.js). The renderer
  // runs its registered flushers (src/utils/closeFlush.js) and acks with the
  // same nonce so main can match request to response.
  onFlushEdits: (callback) => {
    const handler = (_event, nonce) => callback(nonce);
    ipcRenderer.on("app-flush-edits", handler);
    return () => ipcRenderer.removeListener("app-flush-edits", handler);
  },
  flushEditsDone: (nonce) => ipcRenderer.send("app-flush-edits-done", nonce),

  // ── BTI telemetry ─────────────────────────────────────────────────────────
  // Fire-and-forget event emission from renderer to the main-process bus
  // (electron/telemetry/bus.js). Returns { ok: bool } but callers can ignore.
  telemetryEmit:        (eventType, payload) => ipcRenderer.invoke("telemetry-emit", { eventType, payload }),
  telemetrySetEnabled:  (enabled)            => ipcRenderer.invoke("telemetry-set-enabled", enabled),

  // ── BTI feedback (Tier 1 flag + Tier 2 form) ──────────────────────────────
  // kind is "flag" | "form"; payload shape per docs/PROPOSALS/bti-build-mvp.md
  // (lines 138-149 for flag, 174-181 for form). On failure the main-process
  // bus persists locally and retries on the next periodic flush.
  btiSubmit:            (kind, payload) => ipcRenderer.invoke("bti-feedback-submit", { kind, payload }),
});
