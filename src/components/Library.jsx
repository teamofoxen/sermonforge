import { useState, useEffect } from "react";
import {
  deleteLibraryItem,
  getLibraryStatus,
  getLibraryFolder,
  setLibraryFolder,
  searchLibrary,
  importLibrary,
  buildLibraryEmbeddings,
  getLibraryManuscripts,
  onLibraryImportProgress,
  onLibraryEmbedProgress,
} from "../db/database";
import DeleteButton from "./DeleteButton";

export default function Library() {
  const [status, setStatus] = useState({ count: 0, lastImported: null, embeddedCount: 0, vecAvailable: false });
  const [embedding, setEmbedding] = useState(false);
  const [embedProgress, setEmbedProgress] = useState({ done: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importResult, setImportResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [browsing, setBrowsing] = useState(false);
  const [searching, setSearching] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedManuscript, setSelectedManuscript] = useState(null);
  const [manuscriptLoading, setManuscriptLoading] = useState(false);
  const [libraryFolder, setLibraryFolderState] = useState({ path: null, isExplicit: false });

  useEffect(() => {
    loadStatus();
    loadFolder();
    const unsubscribeImport = onLibraryImportProgress(handleProgress);
    const unsubscribeEmbed = onLibraryEmbedProgress(handleEmbedProgress);
    return () => {
      unsubscribeImport && unsubscribeImport();
      unsubscribeEmbed && unsubscribeEmbed();
    };
  }, []);

  function handleEmbedProgress(data) {
    setEmbedProgress(data);
    if (data.complete) {
      setEmbedding(false);
      loadStatus();
    }
  }

  async function handleBuildEmbeddings() {
    if (embedding) return;
    setEmbedding(true);
    setEmbedProgress({ done: 0, total: 0 });
    try {
      await buildLibraryEmbeddings();
    } catch (e) {
      console.error("[Library] embedding build failed:", e);
      setEmbedding(false);
    }
  }

  async function loadStatus() {
    const s = await getLibraryStatus();
    setStatus(s);
    if (s.count > 0) {
      browseAll();
    }
  }

  async function loadFolder() {
    try {
      const f = await getLibraryFolder();
      setLibraryFolderState(f || { path: null, isExplicit: false });
    } catch (e) {
      console.error("[Library] Failed to load folder setting:", e);
    }
  }

  async function handleChooseFolder() {
    try {
      const result = await setLibraryFolder();
      if (!result.canceled && result.path) {
        setLibraryFolderState({ path: result.path, isExplicit: true });
      }
    } catch (e) {
      console.error("[Library] Folder picker failed:", e);
    }
  }

  async function browseAll() {
    setBrowsing(true);
    const results = await searchLibrary("", 500);
    setSearchResults(results);
    setBrowsing(false);
  }

  function handleProgress(data) {
    setImportProgress(data);
    if (data.complete) {
      setImporting(false);
      loadStatus();
    }
  }

  async function startImport() {
    setImporting(true);
    setImportResult(null);
    setImportProgress({ done: 0, total: 0 });
    const result = await importLibrary();
    setImportResult(result);
  }

  async function handleSearch(q) {
    setSearchQuery(q);
    if (!q.trim()) {
      browseAll();
      return;
    }
    setSearching(true);
    const results = await searchLibrary(q, 100);
    setSearchResults(results);
    setSearching(false);
  }

  async function openLibraryItem(item) {
    setSelectedItem(item);
    setSelectedManuscript(null);
    setManuscriptLoading(true);
    try {
      const results = await getLibraryManuscripts([item.id], false);
      setSelectedManuscript(results[0]?.manuscript_text || "");
    } catch (e) {
      setSelectedManuscript("Could not load manuscript text.");
    } finally {
      setManuscriptLoading(false);
    }
  }

  function closeLibraryItem() {
    setSelectedItem(null);
    setSelectedManuscript(null);
  }

  const folderLabel = (s) => s.series_name || s.folder || "";

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="page-title">Sermon Library</h1>
            <p className="page-subtitle">
              {status.count > 0
                ? `${status.count} sermons indexed from your library`
                : "Choose a sermon folder to enable AI-powered search and synthesis"}
            </p>
          </div>
          <button
            className="btn-ghost btn-sm"
            onClick={startImport}
            disabled={importing || !libraryFolder.path}
            title={!libraryFolder.path ? "Choose a sermon folder first" : ""}
          >
            {importing ? "Importing…" : status.count > 0 ? "Import New Sermons" : "Import Library"}
          </button>
        </div>

        <div style={{
          marginTop: "10px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          fontSize: "13px",
          color: "var(--ink-soft)",
          fontFamily: "'Crimson Pro', serif",
        }}>
          <span style={{ color: "var(--ink-ghost)", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "11px", fontWeight: 600 }}>
            Folder:
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
            color: libraryFolder.isExplicit ? "var(--ink-mid)" : "var(--ink-ghost)",
            wordBreak: "break-all",
          }}>
            {libraryFolder.path || "Not set"}
          </span>
          <button
            className="btn-ghost btn-sm"
            onClick={handleChooseFolder}
            style={{ fontSize: "12px", padding: "2px 10px" }}
          >
            {libraryFolder.isExplicit ? "Change…" : "Choose folder…"}
          </button>
        </div>

        {importing && (
          <div style={{ marginTop: "14px" }}>
            <div style={{ fontSize: "13px", color: "var(--ink-soft)", marginBottom: "6px", fontFamily: "'Crimson Pro', serif" }}>
              {importProgress.total > 0
                ? `Processing ${importProgress.done} of ${importProgress.total} sermons…`
                : "Scanning library folder…"}
            </div>
            <div style={{ height: "4px", background: "var(--parchment-deep)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: importProgress.total > 0
                  ? `${Math.round((importProgress.done / importProgress.total) * 100)}%`
                  : "0%",
                background: "var(--gold)",
                transition: "width 0.4s ease",
                borderRadius: "2px",
              }} />
            </div>
          </div>
        )}

        {importResult && !importing && (
          <div style={{ marginTop: "10px", fontSize: "13px", color: "var(--ink-soft)", fontFamily: "'Crimson Pro', serif" }}>
            {importResult.error
              ? `Error: ${importResult.error}`
              : `Done — ${importResult.imported} new sermon${importResult.imported !== 1 ? "s" : ""} imported${importResult.skipped > 0 ? `, ${importResult.skipped} already in library` : ""}.${importResult.errors > 0 ? ` (${importResult.errors} failed)` : ""}`}
          </div>
        )}
      </div>

      <div className="page-body">
        {status.count === 0 && !importing ? (
          <div style={{
            textAlign: "center", padding: "80px 0",
            color: "var(--ink-ghost)", fontStyle: "italic",
            fontFamily: "'Crimson Pro', serif", fontSize: "16px",
          }}>
            {libraryFolder.path
              ? <>Your sermon library hasn't been imported yet.<br />
                  <span style={{ fontSize: "14px" }}>Click "Import Library" above to index your sermons for search and AI synthesis.</span>
                </>
              : <>Choose a sermon folder to get started.<br />
                  <span style={{ fontSize: "14px" }}>SermonForge will index the .docx files in that folder for search and AI synthesis.</span>
                </>}
          </div>
        ) : (
          <>
            {/* Embedding backfill banner */}
            {(() => {
              const unembedded = Math.max(0, (status.count || 0) - (status.embeddedCount || 0));
              if (!status.vecAvailable && status.count > 0) {
                return (
                  <div style={{
                    background: "var(--parchment-warm)",
                    border: "1px solid var(--parchment-deep)",
                    borderLeft: "3px solid var(--ink-ghost)",
                    borderRadius: "6px",
                    padding: "12px 16px",
                    marginBottom: "20px",
                    fontSize: "13px",
                    color: "var(--ink-soft)",
                    fontFamily: "'Crimson Pro', serif",
                  }}>
                    Semantic search is unavailable on this install (vector extension not loaded).
                    Search will use keyword matching only.
                  </div>
                );
              }
              if (unembedded > 0 || embedding) {
                const pct = embedProgress.total > 0
                  ? Math.round((embedProgress.done / embedProgress.total) * 100)
                  : 0;
                return (
                  <div style={{
                    background: "var(--parchment-warm)",
                    border: "1px solid var(--parchment-deep)",
                    borderLeft: "3px solid var(--gold)",
                    borderRadius: "6px",
                    padding: "12px 16px",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    fontFamily: "'Crimson Pro', serif",
                  }}>
                    <div>
                      <div style={{ fontSize: "13px", color: "var(--ink-mid)", fontWeight: 600 }}>
                        {embedding
                          ? `Indexing for AI search… ${embedProgress.done}/${embedProgress.total}`
                          : `${unembedded} sermon${unembedded === 1 ? "" : "s"} not yet indexed for AI search.`}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--ink-ghost)", marginTop: "3px" }}>
                        Building embeddings improves semantic matching for AI-assisted search. Runs locally; no data leaves your machine.
                      </div>
                      {embedding && embedProgress.total > 0 && (
                        <div style={{ height: "3px", background: "var(--parchment-deep)", borderRadius: "2px", overflow: "hidden", marginTop: "8px" }}>
                          <div style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: "var(--gold)",
                            transition: "width 0.4s ease",
                            borderRadius: "2px",
                          }} />
                        </div>
                      )}
                    </div>
                    {!embedding && (
                      <button
                        className="btn-primary btn-sm"
                        onClick={handleBuildEmbeddings}
                        style={{ flexShrink: 0 }}
                      >
                        Build index
                      </button>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            {/* Search + Browse */}
            <div style={{ marginBottom: "8px" }}>
              <div className="search-bar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-ghost)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="search-input"
                  placeholder="Search by title, passage, series, or topic…"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                />
                {searching && (
                  <span style={{ color: "var(--ink-ghost)", fontSize: "12px", fontFamily: "'Crimson Pro', serif", whiteSpace: "nowrap" }}>
                    Searching…
                  </span>
                )}
                {searchQuery && !searching && (
                  <button
                    onClick={() => handleSearch("")}
                    style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      color: "var(--ink-ghost)", fontSize: "18px", lineHeight: 1, padding: "0 2px",
                    }}
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              {searchQuery && !searching && (
                <div style={{ fontSize: "13px", color: "var(--ink-soft)", fontFamily: "'Crimson Pro', serif", marginTop: "6px", paddingLeft: "2px" }}>
                  {searchResults.length === 0
                    ? "No sermons match your search."
                    : `${searchResults.length} sermon${searchResults.length !== 1 ? "s" : ""} found`}
                </div>
              )}
            </div>

            {browsing ? (
              <div style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontFamily: "'Crimson Pro', serif" }}>Loading…</div>
            ) : searchResults.length === 0 ? null : (
              <div className="sermon-grid">
                {searchResults.map(s => (
                  <div key={s.id} className="sermon-card" style={{ cursor: "pointer" }} onClick={() => openLibraryItem(s)}>
                    <div className="sermon-card-header">
                      <div className="sermon-card-title">{s.title}</div>
                      {s.passage && (
                        <span className="sermon-card-passage">{s.passage}</span>
                      )}
                    </div>
                    {folderLabel(s) && (
                      <div className="sermon-card-series">{folderLabel(s)}</div>
                    )}
                    {s.excerpt && (
                      <div style={{
                        fontSize: "13px",
                        color: "var(--ink-soft)",
                        fontFamily: "'Crimson Pro', serif",
                        lineHeight: "1.5",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}>
                        {s.excerpt}
                      </div>
                    )}
                    <div className="sermon-card-footer">
                      <span>{s.word_count?.toLocaleString()} words</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "var(--ink-ghost)" }}>{s.folder}</span>
                        <DeleteButton
                          small
                          onDelete={async () => {
                            await deleteLibraryItem(s.id);
                            setSearchResults((prev) => prev.filter((r) => r.id !== s.id));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {selectedItem && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(26,20,16,0.55)",
            zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "40px 24px", overflowY: "auto",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeLibraryItem(); }}
        >
          <div style={{
            background: "var(--parchment)", borderRadius: "8px",
            width: "100%", maxWidth: "760px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
            display: "flex", flexDirection: "column",
          }}>
            {/* Modal header */}
            <div style={{
              padding: "22px 28px 18px",
              borderBottom: "1px solid var(--parchment-deep)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px",
            }}>
              <div>
                <h2 style={{
                  fontFamily: "'Playfair Display', serif", fontSize: "20px",
                  fontWeight: "700", color: "var(--ink)", margin: 0, lineHeight: "1.3",
                }}>
                  {selectedItem.title}
                </h2>
                <div style={{ display: "flex", gap: "16px", marginTop: "6px", flexWrap: "wrap" }}>
                  {selectedItem.passage && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--ink-soft)" }}>
                      {selectedItem.passage}
                    </span>
                  )}
                  {folderLabel(selectedItem) && (
                    <span style={{ fontSize: "13px", color: "var(--ink-ghost)", fontFamily: "'Crimson Pro', serif" }}>
                      {folderLabel(selectedItem)}
                    </span>
                  )}
                  {selectedItem.word_count > 0 && (
                    <span style={{ fontSize: "13px", color: "var(--ink-ghost)", fontFamily: "'Crimson Pro', serif" }}>
                      {selectedItem.word_count?.toLocaleString()} words
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <DeleteButton
                  onDelete={async () => {
                    await deleteLibraryItem(selectedItem.id);
                    setSearchResults((prev) => prev.filter((r) => r.id !== selectedItem.id));
                    closeLibraryItem();
                  }}
                />
                <button
                  onClick={closeLibraryItem}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--ink-ghost)", fontSize: "22px", lineHeight: 1,
                    padding: "2px 6px",
                  }}
                  title="Close"
                >×</button>
              </div>
            </div>
            {/* Manuscript body */}
            <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "70vh" }}>
              {manuscriptLoading ? (
                <div style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontFamily: "'Crimson Pro', serif" }}>
                  Loading manuscript…
                </div>
              ) : (
                <div style={{
                  fontFamily: "'Crimson Pro', serif", fontSize: "16px",
                  color: "var(--ink)", lineHeight: "1.8", whiteSpace: "pre-wrap",
                }}>
                  {selectedManuscript || <span style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>No manuscript text available.</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
