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
  createSermonFromOutline,
  exportQuickTemplate,
  onLibraryImportProgress,
  onLibraryEmbedProgress,
} from "../db/database";
import DeleteButton from "./DeleteButton";
import { sendAIMessage } from "../utils/ai";
import {
  QUICK_OUTLINE_QUESTIONS_SYSTEM,
  QUICK_OUTLINE_GENERATE_SYSTEM,
} from "../prompts/quickOutline";

// Best-effort JSON extractor — strips markdown fences and recovers a {…} or […]
// block from the response. Returns null if nothing parses.
function extractJson(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch (_) {} }
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch (_) {} }
  return null;
}

const PI_LABELS = {
  background_noise: "The Cultural Moment",
  audience_assumptions: "The Room",
  topic_theme: "The Sermon's Work",
};

export default function Library({ onOpenSermon } = {}) {
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

  // Multi-step Quick Outline state machine
  const [quickStep, setQuickStep] = useState("input"); // "input" | "questions" | "outlines"
  const [quickPrompt, setQuickPrompt] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [piQuestions, setPiQuestions] = useState([]);     // [{field, question}]
  const [piAnswers, setPiAnswers] = useState({});         // { background_noise, audience_assumptions, topic_theme }
  const [outlinesData, setOutlinesData] = useState(null); // { suggested_title, suggested_passage, outlines: [...] }
  const [selectedOutlineIdx, setSelectedOutlineIdx] = useState(null);
  const [quickFoundCount, setQuickFoundCount] = useState(0);
  const [creatingSermon, setCreatingSermon] = useState(false);

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

  function resetQuickFlow() {
    setQuickStep("input");
    setQuickPrompt("");
    setQuickError("");
    setPiQuestions([]);
    setPiAnswers({});
    setOutlinesData(null);
    setSelectedOutlineIdx(null);
    setQuickFoundCount(0);
  }

  // Step 1 → 2: ask AI for PI follow-up questions tailored to the prompt.
  async function handleAskQuestions() {
    if (!quickPrompt.trim() || quickLoading) return;
    setQuickLoading(true);
    setQuickError("");

    try {
      const response = await sendAIMessage(
        [{ role: "user", content: quickPrompt.trim() }],
        QUICK_OUTLINE_QUESTIONS_SYSTEM
      );
      const parsed = extractJson(response);
      const questions = Array.isArray(parsed)
        ? parsed.filter(q => q && PI_LABELS[q.field] && q.question)
        : [];
      if (questions.length === 0) {
        setQuickError("Could not generate follow-up questions. Try rephrasing.");
        return;
      }
      setPiQuestions(questions);
      // Seed answers map with empty strings keyed by field
      setPiAnswers({ background_noise: "", audience_assumptions: "", topic_theme: "" });
      setQuickStep("questions");
    } catch (e) {
      setQuickError(`Error: ${e.message}`);
    } finally {
      setQuickLoading(false);
    }
  }

  // Step 2 → 3: with PI answers in hand, run hybrid library search and ask
  // AI to synthesize three outlines, PI-aware.
  async function handleGenerateOutlines() {
    if (quickLoading) return;
    setQuickLoading(true);
    setQuickError("");
    setOutlinesData(null);
    setSelectedOutlineIdx(null);
    setQuickFoundCount(0);

    try {
      const hits = await searchLibrary(quickPrompt, 8, "hybrid");
      setQuickFoundCount(hits.length);

      let excerptsText = "";
      if (hits.length > 0) {
        const topIds = hits.slice(0, 6).map(h => h.id);
        const manuscripts = await getLibraryManuscripts(topIds, true, 2000);
        excerptsText = manuscripts
          .map((m, i) => `--- Sermon ${i + 1}: "${m.title}" (${m.passage}) ---\n${m.manuscript_text}`)
          .join("\n\n");
      }

      const piBlock = [
        piAnswers.background_noise && `The Cultural Moment: ${piAnswers.background_noise.trim()}`,
        piAnswers.audience_assumptions && `The Room: ${piAnswers.audience_assumptions.trim()}`,
        piAnswers.topic_theme && `The Sermon's Work: ${piAnswers.topic_theme.trim()}`,
      ].filter(Boolean).join("\n");

      const userParts = [`Topic: ${quickPrompt.trim()}`];
      if (piBlock) userParts.push(`Pastoral context:\n${piBlock}`);
      if (excerptsText) {
        userParts.push(`Relevant sermons from my library (${hits.length}):\n\n${excerptsText}`);
      } else {
        userParts.push("No matching sermons were found in the library; suggest outlines from scratch but stay grounded in the pastoral context.");
      }

      const response = await sendAIMessage(
        [{ role: "user", content: userParts.join("\n\n") }],
        QUICK_OUTLINE_GENERATE_SYSTEM
      );
      const parsed = extractJson(response);
      if (!parsed || !Array.isArray(parsed.outlines) || parsed.outlines.length === 0) {
        setQuickError("Could not parse outlines from the response. Try regenerating.");
        return;
      }
      setOutlinesData(parsed);
      setQuickStep("outlines");
    } catch (e) {
      setQuickError(`Error: ${e.message}`);
    } finally {
      setQuickLoading(false);
    }
  }

  async function handleBuildSermon(mode) {
    if (creatingSermon || selectedOutlineIdx == null || !outlinesData) return;
    setCreatingSermon(true);
    try {
      const picked = outlinesData.outlines[selectedOutlineIdx];
      const points = (picked?.points || []).map(p => ({
        text: [p.text, p.support].filter(Boolean).join(" — "),
      }));
      const payload = {
        title: outlinesData.suggested_title || "Untitled Sermon",
        passage: outlinesData.suggested_passage || "",
        outline: points,
        piAnswers: {
          background_noise: piAnswers.background_noise || "",
          audience_assumptions: piAnswers.audience_assumptions || "",
          topic_theme: piAnswers.topic_theme || "",
        },
        mode,
      };
      const { sermonId, outlinePoints } = await createSermonFromOutline(payload);

      if (mode === "quick") {
        await exportQuickTemplate({
          title: payload.title,
          passage: payload.passage,
          outline: outlinePoints,
          piAnswers: payload.piAnswers,
        });
        // Reset the flow; pastor now works in Word.
        resetQuickFlow();
      } else {
        // Full mode: hand off to workspace.
        if (onOpenSermon && sermonId) {
          onOpenSermon(sermonId);
        }
        resetQuickFlow();
      }
    } catch (e) {
      setQuickError(`Could not create sermon: ${e.message}`);
    } finally {
      setCreatingSermon(false);
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
                        Building embeddings improves semantic matching in Quick Outline. Runs locally; no data leaves your machine.
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

            {/* Quick Outline Builder — multi-step PI-aware flow */}
            <div style={{
              background: "var(--ink)",
              borderRadius: "8px",
              padding: "20px 24px",
              marginBottom: "28px",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: "6px",
              }}>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "var(--gold)",
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}>
                  Quick Outline Builder
                </div>
                {quickStep !== "input" && (
                  <button
                    onClick={resetQuickFlow}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "rgba(255,255,255,0.55)",
                      borderRadius: "4px",
                      padding: "2px 10px",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontFamily: "'Crimson Pro', serif",
                    }}
                  >
                    Start over
                  </button>
                )}
              </div>

              {/* Step 1 — input */}
              {quickStep === "input" && (
                <>
                  <p style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: "14px",
                    fontFamily: "'Crimson Pro', serif",
                    marginBottom: "14px",
                    lineHeight: "1.5",
                  }}>
                    Describe what you want to preach. SermonForge will ask a few pastoral questions, then synthesize three outlines from your library.
                  </p>
                  <textarea
                    value={quickPrompt}
                    onChange={e => setQuickPrompt(e.target.value)}
                    placeholder="e.g. I want to preach on lament for a congregation that just lost a young father unexpectedly."
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
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAskQuestions();
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>
                      Ctrl+Enter to continue
                    </span>
                    <button
                      className="btn-primary"
                      onClick={handleAskQuestions}
                      disabled={quickLoading || !quickPrompt.trim()}
                    >
                      {quickLoading ? "Thinking…" : "Continue"}
                    </button>
                  </div>
                </>
              )}

              {/* Step 2 — pastoral context questions */}
              {quickStep === "questions" && (
                <>
                  <p style={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: "14px",
                    fontFamily: "'Crimson Pro', serif",
                    marginBottom: "16px",
                    lineHeight: "1.5",
                  }}>
                    A few questions before synthesizing. Answer briefly — the outlines will lean on your responses.
                  </p>
                  {piQuestions.map((q, i) => (
                    <div key={i} style={{ marginBottom: "14px" }}>
                      <div style={{
                        color: "var(--gold)",
                        fontFamily: "'Crimson Pro', serif",
                        fontSize: "11px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}>
                        {PI_LABELS[q.field] || q.field}
                      </div>
                      <div style={{
                        color: "white",
                        fontFamily: "'Crimson Pro', serif",
                        fontSize: "14px",
                        marginBottom: "6px",
                        lineHeight: "1.4",
                      }}>
                        {q.question}
                      </div>
                      <textarea
                        value={piAnswers[q.field] || ""}
                        onChange={e => setPiAnswers(prev => {
                          // Append answers tagged to the same field with a newline so multiple
                          // questions per field merge into one column write.
                          const existing = prev[q.field] || "";
                          // Track per-question buffer in a separate map keyed by question index
                          // is overkill — simpler: each field stores the latest combined value.
                          // For now, last-write-wins per question; merge happens at submit.
                          return { ...prev, [`__q${i}`]: e.target.value };
                        })}
                        rows={2}
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: "6px",
                          color: "white",
                          fontFamily: "'Crimson Pro', serif",
                          fontSize: "14px",
                          padding: "8px 10px",
                          resize: "vertical",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        // Merge per-question buffers (__qN) back into the three PI fields.
                        const merged = { background_noise: "", audience_assumptions: "", topic_theme: "" };
                        piQuestions.forEach((q, i) => {
                          const v = (piAnswers[`__q${i}`] || "").trim();
                          if (!v) return;
                          merged[q.field] = merged[q.field]
                            ? `${merged[q.field]} ${v}`
                            : v;
                        });
                        setPiAnswers(merged);
                        handleGenerateOutlines();
                      }}
                      disabled={quickLoading}
                    >
                      {quickLoading ? "Synthesizing…" : "Generate outlines"}
                    </button>
                  </div>
                </>
              )}

              {/* Step 3 — pick an outline + outputs */}
              {quickStep === "outlines" && outlinesData && (
                <>
                  {outlinesData.suggested_title && (
                    <div style={{ marginBottom: "8px" }}>
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontFamily: "'Crimson Pro', serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Suggested title
                      </span>
                      <div style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: 600, marginTop: "2px" }}>
                        {outlinesData.suggested_title}
                      </div>
                      {outlinesData.suggested_passage && (
                        <div style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", marginTop: "2px" }}>
                          {outlinesData.suggested_passage}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontFamily: "'Crimson Pro', serif", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "14px", marginBottom: "10px" }}>
                    Pick one — synthesized from {quickFoundCount} sermon{quickFoundCount === 1 ? "" : "s"}
                  </div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {outlinesData.outlines.map((o, idx) => {
                      const selected = selectedOutlineIdx === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedOutlineIdx(idx)}
                          style={{
                            background: selected ? "rgba(212,160,23,0.12)" : "rgba(255,255,255,0.04)",
                            border: selected ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "6px",
                            padding: "14px 16px",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <div style={{ color: "var(--gold)", fontFamily: "'Crimson Pro', serif", fontSize: "12px", fontWeight: 600, marginBottom: "8px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            {o.label || `Outline ${idx + 1}`}
                          </div>
                          <ol style={{ color: "white", fontFamily: "'Crimson Pro', serif", fontSize: "14px", lineHeight: "1.6", paddingLeft: "20px", margin: 0 }}>
                            {(o.points || []).map((p, j) => (
                              <li key={j} style={{ marginBottom: "8px" }}>
                                <div>{p.text}</div>
                                {p.support && (
                                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", fontStyle: "italic", marginTop: "2px" }}>
                                    {p.support}
                                  </div>
                                )}
                                {p.source && p.source !== "New" && (
                                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: "2px" }}>
                                    Source: {p.source}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      );
                    })}
                  </div>

                  {selectedOutlineIdx != null && (
                    <div style={{
                      marginTop: "18px",
                      paddingTop: "14px",
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}>
                      <button
                        className="btn-ghost"
                        onClick={() => handleBuildSermon("quick")}
                        disabled={creatingSermon}
                        title="Generate a Word document with placeholders for everything else"
                        style={{ color: "rgba(255,255,255,0.85)", borderColor: "rgba(255,255,255,0.3)" }}
                      >
                        {creatingSermon ? "Working…" : "Build quick sermon → Word"}
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => handleBuildSermon("full")}
                        disabled={creatingSermon}
                        title="Create a full sermon record and open it in the workspace"
                      >
                        {creatingSermon ? "Working…" : "Build full sermon → Workspace"}
                      </button>
                    </div>
                  )}
                </>
              )}

              {quickError && (
                <div style={{
                  marginTop: "12px",
                  color: "#ff9b9b",
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: "13px",
                }}>
                  {quickError}
                </div>
              )}
            </div>

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
