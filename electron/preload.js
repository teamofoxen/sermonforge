const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ── AI ────────────────────────────────────────────────────────────────────
  sendAIMessage: (messages, systemPrompt) =>
    ipcRenderer.invoke("ai-message", { messages, systemPrompt }),

  // ── Sermons ───────────────────────────────────────────────────────────────
  getAllSermons:   ()              => ipcRenderer.invoke("db-getAllSermons"),
  getSermonById:  (id)            => ipcRenderer.invoke("db-getSermonById", id),
  createSermon:   (data)          => ipcRenderer.invoke("db-createSermon", data),
  updateSermon:   (id, fields)    => ipcRenderer.invoke("db-updateSermon", { id, fields }),
  deleteSermon:   (id)            => ipcRenderer.invoke("db-deleteSermon", id),

  // ── Series ────────────────────────────────────────────────────────────────
  getAllSeries:        ()          => ipcRenderer.invoke("db-getAllSeries"),
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
  importLibrary:            ()                      => ipcRenderer.invoke("library-import"),
  searchLibrary:            (query, limit, mode)    => ipcRenderer.invoke("library-search", { query, limit, mode }),
  getLibraryManuscripts:    (ids, truncate, maxChars) => ipcRenderer.invoke("library-get-manuscripts", { ids, truncate, maxChars }),

  // ── Theology library ──────────────────────────────────────────────────────
  getTheologyStatus:      ()                     => ipcRenderer.invoke("theology-status"),
  searchTheologyLibrary:  (query, limit)         => ipcRenderer.invoke("theology-search", { query, limit }),
  getTheologyChunks:      (ids, maxChars)        => ipcRenderer.invoke("theology-get-chunks", { ids, maxChars }),

  // ── Dashboard ─────────────────────────────────────────────────────────────
  getRecentSermons: (limit) => ipcRenderer.invoke("db-getRecentSermons", limit),

  // ── Export ───────────────────────────────────────────────────────────────────
  exportStudyGuide: (seriesId) => ipcRenderer.invoke("series-export-study-guide", seriesId),

  // ── Bible passage ─────────────────────────────────────────────────────────
  fetchPassage: (passage) => ipcRenderer.invoke('passage-fetch', passage),

  // ── Demo ──────────────────────────────────────────────────────────────────
  loadDemoSeries: () => ipcRenderer.invoke("db-loadDemoSeries"),

  // ── Feedback ──────────────────────────────────────────────────────────────
  getSchemaVersion: () => ipcRenderer.invoke("db-getSchemaVersion"),
  getAppVersion:    () => ipcRenderer.invoke("app-get-version"),
  submitFeedback:   (payload) => ipcRenderer.invoke("feedback-submit", payload),

  // ── Progress events ───────────────────────────────────────────────────────
  onLibraryImportProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("library-import-progress", handler);
    return () => ipcRenderer.removeListener("library-import-progress", handler);
  },
});
