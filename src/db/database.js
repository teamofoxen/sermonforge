// Database helpers — named operations only. All SQL lives in electron/main.js.
// Components import these functions; nothing here knows table or column names.
const api = window.electronAPI;

// ── Sermons ───────────────────────────────────────────────────────────────────
export const getAllSermons    = ()             => api.getAllSermons();
export const getSermonById   = (id)           => api.getSermonById(id);
export const createSermon    = (data)         => api.createSermon(data);
export const updateSermon    = (id, fields)   => api.updateSermon(id, fields);
export const deleteSermon    = (id)           => api.deleteSermon(id);

// ── Series ────────────────────────────────────────────────────────────────────
export const getAllSeries        = ()          => api.getAllSeries();
export const getSeriesById       = (id)        => api.getSeriesById(id);
export const createSeries        = (data)      => api.createSeries(data);
export const updateSeries        = (id, fields) => api.updateSeries(id, fields);
export const deleteSeries        = (id)        => api.deleteSeries(id);
export const getSermonsBySeries  = (seriesId)  => api.getSermonsBySeries(seriesId);

// ── Series sections ───────────────────────────────────────────────────────────
export const getSectionsBySeries = (seriesId)  => api.getSectionsBySeries(seriesId);
export const createSection       = (data)      => api.createSection(data);
export const updateSection       = (id, fields) => api.updateSection(id, fields);
export const deleteSection       = (id)        => api.deleteSection(id);

// ── Calendar notes ────────────────────────────────────────────────────────────
export const getCalendarNotes   = ()           => api.getCalendarNotes();
export const createCalendarNote = (data)       => api.createCalendarNote(data);
export const deleteCalendarNote = (id)         => api.deleteCalendarNote(id);

// ── Illustrations ─────────────────────────────────────────────────────────────
export const getAllIllustrations = ()           => api.getAllIllustrations();
export const createIllustration  = (data)      => api.createIllustration(data);
export const deleteIllustration  = (id)        => api.deleteIllustration(id);

// ── Library ───────────────────────────────────────────────────────────────────
export const deleteLibraryItem       = (id)                      => api.deleteLibraryItem(id);
export const getLibraryStatus        = ()                        => api.getLibraryStatus();
export const searchLibrary           = (query, limit, mode)      => api.searchLibrary(query, limit, mode);
export const importLibrary           = ()                        => api.importLibrary();
export const getLibraryManuscripts   = (ids, truncate, maxChars) => api.getLibraryManuscripts(ids, truncate, maxChars);
export const onLibraryImportProgress = (callback)               => api.onLibraryImportProgress(callback);

// ── Theology library ──────────────────────────────────────────────────────────
export const getTheologyStatus      = ()                    => api.getTheologyStatus();
export const searchTheologyLibrary  = (query, limit = 5)   => api.searchTheologyLibrary(query, limit);
export const getTheologyChunks      = (ids, maxChars = 600) => api.getTheologyChunks(ids, maxChars);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getRecentSermons   = (limit = 3)  => api.getRecentSermons(limit);

// ── Bible passage viewer ──────────────────────────────────────────────────
export const fetchPassage = (passage) => api.fetchPassage(passage);

// ── Export ────────────────────────────────────────────────────────────────────
export const exportStudyGuide = (seriesId) => api.exportStudyGuide(seriesId);
export const exportPmb = (data) => api.exportPmb(data);

// ── Tour ──────────────────────────────────────────────────────────────────────
export const loadTourSermon = () => api.loadTourSermon();

// ── Feedback ──────────────────────────────────────────────────────────────────
export const getSchemaVersion = () => api.getSchemaVersion();
export const getAppVersion    = () => api.getAppVersion();
export const submitFeedback   = (payload) => api.submitFeedback(payload);
