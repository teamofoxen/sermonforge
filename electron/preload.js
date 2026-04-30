const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ── AI ────────────────────────────────────────────────────────────────────
  sendAIMessage: (messages, systemPrompt, step, sermonId) =>
    ipcRenderer.invoke("ai-message", { messages, systemPrompt, step, sermonId }),

  // ── Sermons ───────────────────────────────────────────────────────────────
  getAllSermons:   ()              => ipcRenderer.invoke("db-getAllSermons"),
  getSermonById:  (id)            => ipcRenderer.invoke("db-getSermonById", id),
  createSermon:   (data)          => ipcRenderer.invoke("db-createSermon", data),
  updateSermon:   (id, fields)    => ipcRenderer.invoke("db-updateSermon", { id, fields }),
  deleteSermon:   (id)            => ipcRenderer.invoke("db-deleteSermon", id),

  // ── Series ────────────────────────────────────────────────────────────────
  getAllSeries:        ()          => ipcRenderer.invoke("db-getAllSeries"),
  getRecentSeries:     (limit)     => ipcRenderer.invoke("db-getRecentSeries", limit),
  getSeriesById:       (id)        => ipcRenderer.invoke("db-getSeriesById", id),
  createSeries:        (data)      => ipcRenderer.invoke("db-createSeries", data),
  updateSeries:        (id, fields) => ipcRenderer.invoke("db-updateSeries", { id, fields }),
  deleteSeries:        (id)        => ipcRenderer.invoke("db-deleteSeries", id),
  getSermonsBySeries:  (seriesId)  => ipcRenderer.invoke("db-getSermonsBySeries", seriesId),

  // ── Series sections ───────────────────────────────────────────────────────
  getSectionsBySeries: (seriesId)  => ipcRenderer.invoke("db-getSectionsBySeries", seriesId),
  createSection:       (data)      => ipcRenderer.invoke("db-createSection", data),
  updateSection:       (id, fields) => ipcRenderer.invoke("db-updateSection", { id, fields }),
  deleteSection:       (id)        => ipcRenderer.invoke("db-deleteSection", id),

  // ── Calendar notes ────────────────────────────────────────────────────────
  getCalendarNotes:    ()          => ipcRenderer.invoke("db-getCalendarNotes"),
  createCalendarNote:  (data)      => ipcRenderer.invoke("db-createCalendarNote", data),
  deleteCalendarNote:  (id)        => ipcRenderer.invoke("db-deleteCalendarNote", id),

  // ── Illustrations ─────────────────────────────────────────────────────────
  getAllIllustrations:  ()          => ipcRenderer.invoke("db-getAllIllustrations"),
  createIllustration:   (data)      => ipcRenderer.invoke("db-createIllustration", data),
  deleteIllustration:   (id)        => ipcRenderer.invoke("db-deleteIllustration", id),

  // ── Library ───────────────────────────────────────────────────────────────
  deleteLibraryItem:        (id)                    => ipcRenderer.invoke("db-deleteLibraryItem", id),
  getLibraryStatus:         ()                      => ipcRenderer.invoke("library-status"),
  getLibraryFolder:         ()                      => ipcRenderer.invoke("library-get-folder"),
  setLibraryFolder:         ()                      => ipcRenderer.invoke("library-set-folder"),
  importLibrary:            ()                      => ipcRenderer.invoke("library-import"),
  buildLibraryEmbeddings:   ()                      => ipcRenderer.invoke("library-build-embeddings"),
  searchLibrary:            (query, limit, mode)    => ipcRenderer.invoke("library-search", { query, limit, mode }),
  getLibraryManuscripts:    (ids, truncate, maxChars) => ipcRenderer.invoke("library-get-manuscripts", { ids, truncate, maxChars }),

  // ── Settings ──────────────────────────────────────────────────────────────
  getSetting:               (key)                   => ipcRenderer.invoke("db-getSetting", key),
  setSetting:               (key, value)            => ipcRenderer.invoke("db-setSetting", { key, value }),

  // ── Theology library ──────────────────────────────────────────────────────
  getTheologyStatus:      ()                     => ipcRenderer.invoke("theology-status"),
  searchTheologyLibrary:  (query, limit)         => ipcRenderer.invoke("theology-search", { query, limit }),
  getTheologyChunks:      (ids, maxChars)        => ipcRenderer.invoke("theology-get-chunks", { ids, maxChars }),

  // ── Dashboard ─────────────────────────────────────────────────────────────
  getRecentSermons: (limit) => ipcRenderer.invoke("db-getRecentSermons", limit),

  // ── Export ───────────────────────────────────────────────────────────────────
  exportStudyGuide: (seriesId) => ipcRenderer.invoke("series-export-study-guide", seriesId),
  exportPmb: (data) => ipcRenderer.invoke("sermon-export-pmb", data),
  exportManuscript: (data) => ipcRenderer.invoke("sermon-export-manuscript", data),

  // ── Bible passage ─────────────────────────────────────────────────────────
  fetchPassage: (passage) => ipcRenderer.invoke('passage-fetch', passage),

  // ── Tour ──────────────────────────────────────────────────────────────────
  loadTourSermon:   () => ipcRenderer.invoke("db-loadTourSermon"),
  removeTourSermon: () => ipcRenderer.invoke("db-removeTourSermon"),

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

  // ── Progress events ───────────────────────────────────────────────────────
  onLibraryImportProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("library-import-progress", handler);
    return () => ipcRenderer.removeListener("library-import-progress", handler);
  },
  onLibraryEmbedProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("library-embed-progress", handler);
    return () => ipcRenderer.removeListener("library-embed-progress", handler);
  },

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
});
