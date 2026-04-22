import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { getAllSeries, getAllSermons, getRecentSermons, loadDemoSeries, getTheologyStatus, searchTheologyLibrary } from "../db/database";
import { useDemo } from "../contexts/DemoContext";
import NewSermonModal from "./NewSermonModal";
import { formatDate, getOutline, assembleManuscriptText } from "../utils";
import { sendAIMessage } from "../utils/ai";
import { flattenExegesis } from "../utils/studyFields";
import { formatChunkForLLM, dedupSources } from "../utils/theologyCitation";

export default function Dashboard({ onOpenSermon, onOpenSeries, onNewSeries, onNavigate }) {
  const { enableDemoMode } = useDemo();
  const [activeSeries, setActiveSeries]   = useState([]);
  const [recentSermons, setRecentSermons] = useState([]);
  const [reorientSummaries, setReorientSummaries] = useState({});
  const [reorientLoading, setReorientLoading]     = useState({});
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [theologyAvailable, setTheologyAvailable] = useState(false);
  const [theologyQuery, setTheologyQuery] = useState("");
  const [theologyLoading, setTheologyLoading] = useState(false);
  const [theologyResult, setTheologyResult] = useState(null); // { answer, sources, noHits }
  const [theologyMessages, setTheologyMessages] = useState([]);

  useEffect(() => {
    getTheologyStatus().then(s => setTheologyAvailable(s?.available ?? false)).catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [seriesData, recentData] = await Promise.all([
          getAllSeries(),
          getRecentSermons(5),
        ]);
        // Show all non-complete series: active first, then planning
        const nonComplete = seriesData
          .filter((s) => s.status !== "complete")
          .sort((a, b) => {
            if (a.status === "active" && b.status !== "active") return -1;
            if (a.status !== "active" && b.status === "active") return  1;
            return 0;
          });
        setActiveSeries(nonComplete);
        setRecentSermons(recentData);
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleReorientSeries(s) {
    const key = `series_${s.id}`;
    setReorientLoading((prev) => ({ ...prev, [key]: true }));

    const parts = [];
    parts.push(`Series: ${s.title}`);
    if (s.passage_range)       parts.push(`Passage range: ${s.passage_range}`);
    if (s.big_idea)            parts.push(`Big Idea: ${s.big_idea}`);
    if (s.overview)            parts.push(`Overview: ${s.overview}`);
    if (s.redemptive_context)  parts.push(`Redemptive context: ${s.redemptive_context}`);
    if (s.series_motivation)   parts.push(`Why this congregation, why now: ${s.series_motivation}`);
    if (s.book_argument)       parts.push(`Controlling argument: ${s.book_argument}`);
    if (s.book_structure)      parts.push(`Book structure: ${s.book_structure}`);
    if (s.emerging_big_idea)   parts.push(`Working big idea: ${s.emerging_big_idea}`);

    const systemPrompt = `You are a brief reorientation assistant for a pastor returning to a series they are planning. Given the series' current state, write a focused 3–5 sentence summary that: (1) states clearly where they are in the planning process, (2) names the key theological work done so far using their own language where possible, (3) identifies the most natural next step. Write in second person. Keep it under 100 words. Be specific — no generic encouragement.`;

    try {
      const response = await sendAIMessage(
        [{ role: "user", content: `Here is the current state of this series:\n\n${parts.join("\n\n")}` }],
        systemPrompt
      );
      setReorientSummaries((prev) => ({ ...prev, [key]: response }));
    } catch (e) {
      setReorientSummaries((prev) => ({ ...prev, [key]: "Unable to generate summary. Please try again." }));
    } finally {
      setReorientLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleReorientSermon(sermon) {
    const key = `sermon_${sermon.id}`;
    setReorientLoading((prev) => ({ ...prev, [key]: true }));

    const parts = [];
    parts.push(`Title: ${sermon.title}`);
    if (sermon.passage)      parts.push(`Passage: ${sermon.passage}`);
    if (sermon.series_title) parts.push(`Series: ${sermon.series_title}`);
    if (sermon.mpt)          parts.push(`Main Point of the Text (MPT): ${sermon.mpt}`);
    if (sermon.mps)          parts.push(`Main Point of the Sermon (MPS): ${sermon.mps}`);
    const exegesis = flattenExegesis(sermon);
    if (exegesis) parts.push(exegesis);
    const outline = getOutline(sermon);
    if (outline.length > 0) {
      parts.push(`Outline:\n${outline.map((p, i) => `  ${i + 1}. ${p.text}`).join("\n")}`);
    }
    const manuscriptText = assembleManuscriptText(sermon);
    if (manuscriptText.replace(/[A-Z\s\-:]/g, "").length > 0) {
      parts.push(`Manuscript (opening):\n${manuscriptText.slice(0, 600)}`);
    }

    const systemPrompt = `You are a brief reorientation assistant for a pastor returning to a sermon in progress. Given the sermon's current state, write a focused 3–5 sentence summary that: (1) states clearly where they are in the prep process, (2) names the key theological work done so far using their own language where possible, (3) identifies the most natural next step. Write in second person. Keep it under 100 words. Be specific — no generic encouragement.`;

    try {
      const response = await sendAIMessage(
        [{ role: "user", content: `Here is the current state of this sermon:\n\n${parts.join("\n\n")}` }],
        systemPrompt
      );
      setReorientSummaries((prev) => ({ ...prev, [key]: response }));
    } catch (e) {
      setReorientSummaries((prev) => ({ ...prev, [key]: "Unable to generate summary. Please try again." }));
    } finally {
      setReorientLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleTheologySearch() {
    const text = theologyQuery.trim();
    if (!text || theologyLoading) return;

    setTheologyLoading(true);
    setTheologyResult(null);

    // Isolated system prompt — no sermon workflow context, no stage rules, no context tiers.
    // This is intentional: the full sermon system prompt's MESSAGE CONTEXT RULES are designed
    // for sermon prep stages and conflict with free-form theology research (they expect
    // MPT/MPS and can refuse or misbehave when absent). Theology search on the dashboard has
    // no current sermon, so the isolation is total.
    const systemPrompt = `You are a theology research assistant for a pastor. Answer the question using the sources provided.

- Ground your answer in the provided sources.
- Include at least one direct quotation with its full source attribution as given in brackets (format: [Author — Work, Locator, p. N]). Preserve the locator and page reference verbatim.
- If multiple sources speak to the question, reference more than one.
- Be concise and direct.
- If the sources do not directly address the question, say so clearly rather than substituting general knowledge.`;

    try {
      const hits = await searchTheologyLibrary(text, 8);
      const chunks = hits?.map(formatChunkForLLM) || [];

      if (chunks.length === 0) {
        setTheologyResult({ answer: null, sources: [], noHits: true });
        return;
      }

      const userContent = `SOURCES:\n${chunks.join("\n\n")}\n\nQUESTION:\n${text}`;
      const newMessages = [...theologyMessages, { role: "user", content: userContent }];
      setTheologyMessages(newMessages);

      const response = await sendAIMessage(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        systemPrompt
      );

      const sources = dedupSources(hits);
      const assistantMsg = { role: "assistant", content: response || "Something went wrong. Please try again.", sources };
      setTheologyMessages(prev => [...prev, assistantMsg]);
      setTheologyResult({ answer: response, sources, noHits: false });
    } catch (err) {
      setTheologyResult({ answer: `Error: ${err.message}`, sources: [], noHits: false });
    } finally {
      setTheologyLoading(false);
    }
  }

  function handleTheologyClear() {
    setTheologyQuery("");
    setTheologyResult(null);
    setTheologyMessages([]);
  }

  async function handleLoadDemo() {
    setDemoLoading(true);
    try {
      enableDemoMode();
      const result = await loadDemoSeries();
      if (result?.seriesId && onOpenSeries) {
        onOpenSeries(result.seriesId);
      }
    } catch (e) {
      console.error("Failed to load demo series:", e);
    } finally {
      setDemoLoading(false);
    }
  }

  function dismissSummary(key) {
    setReorientSummaries((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading…</div>
      </div>
    );
  }

  const sectionHeadingStyle = {
    fontFamily: "'Playfair Display', serif",
    fontSize: "16px",
    fontWeight: "600",
    color: "var(--ink-soft)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: "14px",
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="page-title">Pick up where you left off</h1>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="btn-ghost"
              onClick={handleLoadDemo}
              disabled={demoLoading}
              title="Load a complete sample series to explore the app"
              style={{ fontSize: "13px", color: "var(--ink-soft)" }}
            >
              {demoLoading ? "Loading…" : "See Demo"}
            </button>
            <button className="btn-primary" onClick={onNewSeries}>+ New Series</button>
            <button className="btn-ghost" onClick={() => setShowNewModal(true)}>+ New Sermon</button>
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* Continue Series Planning */}
        {activeSeries.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <h2 style={sectionHeadingStyle}>Continue Series Planning</h2>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(activeSeries.length, 3)}, 1fr)`, gap: "16px" }}>
              {activeSeries.map((s) => {
                const key = `series_${s.id}`;
                return (
                  <div key={s.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* Color bar + title */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <div style={{
                        width: "3px", borderRadius: "2px", alignSelf: "stretch",
                        background: `var(--${s.color || "gold"})`, flexShrink: 0,
                      }} />
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: "600", color: "var(--ink)", lineHeight: "1.3" }}>
                        {s.title}
                      </div>
                    </div>

                    {/* Passage range */}
                    {s.passage_range && (
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--ink-soft)" }}>
                        {s.passage_range}
                      </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => onOpenSeries && onOpenSeries(s.id)}
                      >
                        Open
                      </button>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => handleReorientSeries(s)}
                        disabled={reorientLoading[key]}
                      >
                        {reorientLoading[key] ? "Thinking…" : "Reorient me"}
                      </button>
                    </div>

                    {/* AI summary */}
                    {reorientSummaries[key] && (
                      <div style={{
                        marginTop: "4px", padding: "12px 14px",
                        background: "var(--parchment-warm)", borderRadius: "var(--radius)",
                        borderLeft: "3px solid var(--gold)", fontSize: "14px",
                        lineHeight: "1.6", color: "var(--ink-mid)", fontStyle: "italic",
                        position: "relative",
                      }}>
                        <button
                          onClick={() => dismissSummary(key)}
                          style={{ position: "absolute", top: "6px", right: "8px", background: "none", border: "none", cursor: "pointer", color: "var(--ink-ghost)", fontSize: "14px", lineHeight: "1", padding: "2px 4px" }}
                          title="Dismiss"
                        >×</button>
                        {reorientSummaries[key]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Continue Sermon Prep */}
        {recentSermons.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <h2 style={sectionHeadingStyle}>Continue Sermon Prep</h2>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(recentSermons.length, 3)}, 1fr)`, gap: "16px" }}>
              {recentSermons.map((sermon) => {
                const key = `sermon_${sermon.id}`;
                return (
                  <div key={sermon.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* Title */}
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: "600", color: "var(--ink)", lineHeight: "1.3" }}>
                      {sermon.title}
                    </div>

                    {/* Passage */}
                    {sermon.passage && (
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--ink-soft)" }}>
                        {sermon.passage}
                      </div>
                    )}

                    {/* Series + last updated */}
                    <div style={{ fontSize: "12px", color: "var(--ink-ghost)" }}>
                      {sermon.series_title && <span>{sermon.series_title} · </span>}
                      <span>Updated {sermon.updated_at ? formatDate(sermon.updated_at.split("T")[0].split(" ")[0]) : "—"}</span>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => onOpenSermon(sermon.id)}
                      >
                        Open
                      </button>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => handleReorientSermon(sermon)}
                        disabled={reorientLoading[key]}
                      >
                        {reorientLoading[key] ? "Thinking…" : "Reorient me"}
                      </button>
                    </div>

                    {/* AI summary */}
                    {reorientSummaries[key] && (
                      <div style={{
                        marginTop: "4px", padding: "12px 14px",
                        background: "var(--parchment-warm)", borderRadius: "var(--radius)",
                        borderLeft: "3px solid var(--gold)", fontSize: "14px",
                        lineHeight: "1.6", color: "var(--ink-mid)", fontStyle: "italic",
                        position: "relative",
                      }}>
                        <button
                          onClick={() => dismissSummary(key)}
                          style={{ position: "absolute", top: "6px", right: "8px", background: "none", border: "none", cursor: "pointer", color: "var(--ink-ghost)", fontSize: "14px", lineHeight: "1", padding: "2px 4px" }}
                          title="Dismiss"
                        >×</button>
                        {reorientSummaries[key]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Theology Search */}
        {theologyAvailable && (
          <div style={{ marginBottom: "28px" }}>
            <h2 style={sectionHeadingStyle}>Search Theology Library</h2>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                type="text"
                value={theologyQuery}
                onChange={e => setTheologyQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleTheologySearch(); }}
                placeholder="Search patristics, Reformed theology, commentaries…"
                style={{
                  flex: 1, padding: "8px 12px",
                  border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)",
                  fontFamily: "'Crimson Pro', serif", fontSize: "15px",
                  background: "var(--white)", color: "var(--ink)",
                  outline: "none",
                }}
              />
              <button
                className="btn-primary"
                onClick={handleTheologySearch}
                disabled={theologyLoading || !theologyQuery.trim()}
              >
                {theologyLoading ? "Searching…" : "Search"}
              </button>
              {(theologyResult || theologyMessages.length > 0) && (
                <button className="btn-ghost" onClick={handleTheologyClear}>Clear</button>
              )}
            </div>

            {theologyResult?.noHits && (
              <div style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontSize: "14px" }}>
                No matching sources found in the theology library.
              </div>
            )}

            {theologyResult?.answer && (
              <div className="card" style={{ padding: "16px 18px" }}>
                <div className="ai-markdown">
                  <ReactMarkdown>{theologyResult.answer}</ReactMarkdown>
                </div>
                {theologyResult.sources?.length > 0 && (
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--parchment-deep)", fontSize: "11px", color: "var(--ink-ghost)" }}>
                    <span style={{ fontWeight: 600 }}>Sources consulted: </span>
                    {theologyResult.sources.map((s, i) => (
                      <span key={i}>
                        {i > 0 ? " · " : ""}
                        {s.author} — <em>{s.work}</em>
                        {s.locator ? `, ${s.locator}` : ""}
                        {s.ccel_page_start
                          ? (s.ccel_page_end && s.ccel_page_end !== s.ccel_page_start
                              ? `, pp. ${s.ccel_page_start}–${s.ccel_page_end}`
                              : `, p. ${s.ccel_page_start}`)
                          : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {activeSeries.length === 0 && recentSermons.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", gap: "16px" }}>
            <p style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontSize: "15px" }}>
              Nothing in progress yet.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn-primary" onClick={onNewSeries}>Start a series</button>
              <button className="btn-ghost" onClick={() => setShowNewModal(true)}>Start a sermon</button>
            </div>
          </div>
        )}

      </div>

      {showNewModal && (
        <NewSermonModal
          onClose={() => setShowNewModal(false)}
          onCreated={(id) => {
            setShowNewModal(false);
            onOpenSermon(id);
          }}
        />
      )}
    </>
  );
}
