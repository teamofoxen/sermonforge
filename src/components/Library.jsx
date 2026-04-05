import { useState, useEffect } from "react";
import {
  deleteLibraryItem,
  getLibraryStatus,
  searchLibrary,
  importLibrary,
  getLibraryManuscripts,
  onLibraryImportProgress,
} from "../db/database";
import DeleteButton from "./DeleteButton";
import { sendAIMessage } from "../utils/ai";

export default function Library() {
  const [status, setStatus] = useState({ count: 0, lastImported: null });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importResult, setImportResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [browsing, setBrowsing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [quickPrompt, setQuickPrompt] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickResponse, setQuickResponse] = useState("");
  const [quickFoundCount, setQuickFoundCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedManuscript, setSelectedManuscript] = useState(null);
  const [manuscriptLoading, setManuscriptLoading] = useState(false);

  useEffect(() => {
    loadStatus();
    const unsubscribe = onLibraryImportProgress(handleProgress);
    return unsubscribe;
  }, []);

  async function loadStatus() {
    const s = await getLibraryStatus();
    setStatus(s);
    if (s.count > 0) {
      browseAll();
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

  async function handleQuickOutline() {
    if (!quickPrompt.trim() || quickLoading) return;
    setQuickLoading(true);
    setQuickResponse("");
    setQuickFoundCount(0);

    try {
      const hits = await searchLibrary(quickPrompt, 8, "ai");
      setQuickFoundCount(hits.length);

      if (hits.length === 0) {
        setQuickResponse(
          "No relevant sermons found in your library for this topic. Try different keywords, or make sure your library has been imported."
        );
        return;
      }

      const topIds = hits.slice(0, 6).map(h => h.id);
      // truncate: true, maxChars: 2000 — each manuscript contributes at most 2,000 chars
      // so the combined prompt stays well within a manageable token budget
      const manuscripts = await getLibraryManuscripts(topIds, true, 2000);

      const excerptsText = manuscripts
        .map((m, i) => `--- Sermon ${i + 1}: "${m.title}" (${m.passage}) ---\n${m.manuscript_text}`)
        .join("\n\n");

      const systemPrompt = `You are an expert homiletics assistant helping a pastor synthesize past sermons into new outlines.

Guidelines:
- Draw main points, transitions, illustrations, and applications directly from the provided sermon texts
- Create three genuinely different outlines (different angles, emphases, or structural approaches)
- For each outline point, note which source sermon the material comes from
- Each outline should have 3 main points with a brief supporting sentence or illustration per point
- Be specific — pull actual language and ideas from the sermons, don't be generic`;

      const userMessage = `${quickPrompt}\n\nHere are ${manuscripts.length} relevant sermons from my library:\n\n${excerptsText}`;

      const response = await sendAIMessage(
        [{ role: "user", content: userMessage }],
        systemPrompt
      );

      setQuickResponse(response);
    } catch (e) {
      setQuickResponse(`Error: ${e.message}`);
    } finally {
      setQuickLoading(false);
    }
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
                ? `${status.count} sermons indexed from your OneDrive library`
                : "Import your sermon library to enable AI-powered search and synthesis"}
            </p>
          </div>
          <button
            className="btn-ghost btn-sm"
            onClick={startImport}
            disabled={importing}
          >
            {importing ? "Importing…" : status.count > 0 ? "Import New Sermons" : "Import Library"}
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
            Your sermon library hasn't been imported yet.<br />
            <span style={{ fontSize: "14px" }}>Click "Import Library" above to index your sermons for search and AI synthesis.</span>
          </div>
        ) : (
          <>
            {/* Quick Outline Generator */}
            <div style={{
              background: "var(--ink)",
              borderRadius: "8px",
              padding: "20px 24px",
              marginBottom: "28px",
            }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                color: "var(--gold)",
                fontSize: "13px",
                fontWeight: "600",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}>
                Quick Outline Generator
              </div>
              <p style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "14px",
                fontFamily: "'Crimson Pro', serif",
                marginBottom: "14px",
                lineHeight: "1.5",
              }}>
                Describe what you need. SermonForge searches your library and asks Claude to synthesize outlines from your existing material.
              </p>
              <textarea
                value={quickPrompt}
                onChange={e => setQuickPrompt(e.target.value)}
                placeholder="e.g. I need a sermon on the meaning of the cross. Please put together 3 different sermon outlines from different parts of my existing sermons."
                rows={3}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "6px",
                  color: "white",
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: "15px",
                  padding: "10px 12px",
                  resize: "vertical",
                  boxSizing: "border-box",
                  marginBottom: "12px",
                  outline: "none",
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleQuickOutline();
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>
                    Ctrl+Enter to generate
                  </span>
                  {quickResponse && !quickLoading && (
                    <button
                      onClick={() => { setQuickResponse(""); setQuickFoundCount(0); setQuickPrompt(""); }}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "rgba(255,255,255,0.45)",
                        borderRadius: "4px",
                        padding: "2px 8px",
                        fontSize: "12px",
                        cursor: "pointer",
                        fontFamily: "'Crimson Pro', serif",
                      }}
                    >
                      Clear results
                    </button>
                  )}
                </div>
                <button
                  className="btn-primary"
                  onClick={handleQuickOutline}
                  disabled={quickLoading || !quickPrompt.trim()}
                >
                  {quickLoading ? "Generating…" : "Generate Outlines"}
                </button>
              </div>
            </div>

            {/* Quick Outline Response */}
            {(quickLoading || quickResponse) && (
              <div style={{
                background: "white",
                border: "1px solid var(--parchment-deep)",
                borderRadius: "8px",
                padding: "20px 24px",
                marginBottom: "28px",
              }}>
                {quickLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div className="ai-loading-dot" />
                    <div className="ai-loading-dot" />
                    <div className="ai-loading-dot" />
                    {quickFoundCount > 0 && (
                      <span style={{ marginLeft: "6px", color: "var(--ink-ghost)", fontSize: "13px", fontFamily: "'Crimson Pro', serif" }}>
                        Found {quickFoundCount} relevant sermon{quickFoundCount !== 1 ? "s" : ""}…
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{
                      fontSize: "11px",
                      color: "var(--ink-ghost)",
                      fontFamily: "'Crimson Pro', serif",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: "14px",
                    }}>
                      Synthesized from {quickFoundCount} sermon{quickFoundCount !== 1 ? "s" : ""} in your library
                    </div>
                    <div style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: "16px",
                      color: "var(--ink)",
                      lineHeight: "1.75",
                      whiteSpace: "pre-wrap",
                    }}>
                      {quickResponse}
                    </div>
                  </>
                )}
              </div>
            )}

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
