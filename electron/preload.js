const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ── AI ────────────────────────────────────────────────────────────────────
  sendAIMessage: (messages, systemPrompt, step, sermonId) =>
    ipcRenderer.invoke("ai-message", { messages, systemPrompt, step, sermonId }),

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

  // ── Export ───────────────────────────────────────────────────────────────────
  exportStudyGuide: (seriesId) => ipcRenderer.invoke("series-export-study-guide", seriesId),
  exportPmb: (data) => ipcRenderer.invoke("sermon-export-pmb", data),
  exportManuscript: (data) => ipcRenderer.invoke("sermon-export-manuscript", data),

  // ── Bible passage ─────────────────────────────────────────────────────────
  fetchPassage: (passage) => ipcRenderer.invoke('passage-fetch', passage),

  // ── API key setup ─────────────────────────────────────────────────────────
  getApiKeyStatus: () => ipcRenderer.invoke("app-get-key-status"),
  saveApiKeys:     (keys) => ipcRenderer.invoke("app-save-api-key", keys),

  // ── Feedback ──────────────────────────────────────────────────────────────
  getSchemaVersion: () => ipcRenderer.invoke("db-getSchemaVersion"),
  getAppVersion:    () => ipcRenderer.invoke("app-get-version"),
  submitFeedback:   (payload) => ipcRenderer.invoke("feedback-submit", payload),

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

  // ── Pastor memory backup ──────────────────────────────────────────────────
  // Write-through copy of localStorage memory so it survives Electron major
  // upgrades and manual cache clears. See electron/main.js MEMORY_BACKUP_PATH.
  backupMemory:  (json) => ipcRenderer.invoke("db-backupMemory", json),
  restoreMemory: ()     => ipcRenderer.invoke("db-restoreMemory"),

  // ── BTI telemetry ─────────────────────────────────────────────────────────
  // Fire-and-forget event emission from renderer to the main-process bus
  // (electron/telemetry/bus.js). Returns { ok: bool } but callers can ignore.
  telemetryEmit:        (eventType, payload) => ipcRenderer.invoke("telemetry-emit", { eventType, payload }),
  telemetrySetEnabled:  (enabled)            => ipcRenderer.invoke("telemetry-set-enabled", enabled),
});
