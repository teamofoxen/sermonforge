import { useState, useEffect } from "react";
import { getAllSeries, getAllSermons, getRecentSermons } from "../db/database";
import NewSermonModal from "./NewSermonModal";
import { formatDate, getOutline } from "../utils";
import { sendAIMessage } from "../utils/ai";

export default function Dashboard({ onOpenSermon, onOpenSeries, onNewSeries, onNavigate }) {
  const [series, setSeries] = useState([]);
  const [sermonsBySeries, setSermonsBySeries] = useState({});
  const [recentSermons, setRecentSermons] = useState([]);
  const [reorientSummaries, setReorientSummaries] = useState({});
  const [reorientLoading, setReorientLoading] = useState({});
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [seriesData, allSermons, recentData] = await Promise.all([
          getAllSeries(),
          getAllSermons(),
          getRecentSermons(3),
        ]);
        setSeries(seriesData);
        setRecentSermons(recentData);

        // Group sermons by series
        const bySeries = {};
        for (const sermon of allSermons) {
          if (sermon.series_id) {
            bySeries[sermon.series_id] = (bySeries[sermon.series_id] || 0) + 1;
          }
        }
        setSermonsBySeries(bySeries);
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleReorient(sermon) {
    setReorientLoading((prev) => ({ ...prev, [sermon.id]: true }));

    const parts = [];
    parts.push(`Title: ${sermon.title}`);
    if (sermon.passage) parts.push(`Passage: ${sermon.passage}`);
    parts.push(`Stage: ${sermon.stage}`);
    if (sermon.series_title) parts.push(`Series: ${sermon.series_title}`);
    if (sermon.big_idea) parts.push(`Big Idea: ${sermon.big_idea}`);
    if (sermon.mpt) parts.push(`Main Point of the Text (MPT): ${sermon.mpt}`);
    if (sermon.mps) parts.push(`Main Point of the Sermon (MPS): ${sermon.mps}`);
    if (sermon.observations) parts.push(`Observations:\n${sermon.observations}`);
    if (sermon.interpretation) parts.push(`Interpretation:\n${sermon.interpretation}`);
    if (sermon.redemptive_thread) parts.push(`Redemptive Thread:\n${sermon.redemptive_thread}`);
    if (sermon.implications) parts.push(`Implications:\n${sermon.implications}`);
    const outline = getOutline(sermon);
    if (outline.length > 0) {
      parts.push(`Outline:\n${outline.map((p, i) => `  ${i + 1}. ${p.text}`).join("\n")}`);
    }
    if (sermon.manuscript) {
      parts.push(`Manuscript (opening):\n${sermon.manuscript.slice(0, 600)}`);
    }

    const systemPrompt = `You are a brief reorientation assistant for a pastor returning to a sermon in progress. Given the sermon's current state, write a focused 3–5 sentence summary that: (1) states clearly where they are in the prep process, (2) names the key theological work done so far using their own language where possible, (3) identifies the most natural next step. Write in second person. Keep it under 100 words. Be specific — no generic encouragement.`;

    try {
      const response = await sendAIMessage(
        [{ role: "user", content: `Here is the current state of this sermon:\n\n${parts.join("\n\n")}` }],
        systemPrompt
      );
      setReorientSummaries((prev) => ({ ...prev, [sermon.id]: response }));
    } catch (e) {
      setReorientSummaries((prev) => ({ ...prev, [sermon.id]: "Unable to generate summary. Please try again." }));
    } finally {
      setReorientLoading((prev) => ({ ...prev, [sermon.id]: false }));
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading…</div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Active and upcoming series</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className="btn-primary" onClick={onNewSeries}>+ New Series</button>
            <button className="btn-ghost" onClick={() => setShowNewModal(true)}>+ New Sermon</button>
          </div>
        </div>
      </div>

      <div className="page-body">

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px", marginBottom: "28px" }}>

          {/* Series Pipeline */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Series Pipeline</h2>
              <button className="btn-ghost btn-sm" onClick={() => onNavigate("planning")}>Manage</button>
            </div>
            {series.length === 0 ? (
              <p style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontSize: "14px" }}>
                No series yet. Start one in Planning.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {[
                  { status: "active", label: "Preaching Now" },
                  { status: "planning", label: "In Planning" },
                  { status: "complete", label: "Complete" },
                ].map(({ status, label }) => {
                  const group = series.filter((s) => s.status === status);
                  if (group.length === 0) return null;
                  return (
                    <div key={status}>
                      <div style={{
                        fontSize: "10px", fontWeight: "700", letterSpacing: "0.1em",
                        textTransform: "uppercase", color: "var(--ink-ghost)", marginBottom: "8px",
                      }}>
                        {label}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {group.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => onOpenSeries && onOpenSeries(s.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: "10px",
                              padding: "9px 11px", borderRadius: "var(--radius)",
                              background: "var(--parchment-warm)",
                              border: "1px solid var(--parchment-deep)",
                              cursor: "pointer",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--parchment-deep)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "var(--parchment-warm)"}
                          >
                            {/* Color bar */}
                            <div style={{
                              width: "3px", borderRadius: "2px", alignSelf: "stretch",
                              background: `var(--${s.color || "gold"})`, flexShrink: 0,
                            }} />
                            {/* Title + passage */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontFamily: "'Playfair Display', serif", fontSize: "14px",
                                fontWeight: "600", color: "var(--ink)",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              }}>
                                {s.title}
                              </div>
                              {s.passage_range && (
                                <div style={{
                                  fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
                                  color: "var(--ink-soft)", marginTop: "2px",
                                }}>
                                  {s.passage_range}
                                </div>
                              )}
                            </div>
                            {/* Meta */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                              {s.canon_category && (
                                <span style={{
                                  fontSize: "10px", padding: "2px 7px", borderRadius: "10px",
                                  background: "var(--parchment-deep)", color: "var(--ink-soft)",
                                  fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em",
                                }}>
                                  {s.canon_category}
                                </span>
                              )}
                              <span style={{ fontSize: "12px", color: "var(--ink-ghost)", whiteSpace: "nowrap" }}>
                                {sermonsBySeries[s.id] || 0} sermons
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Biblical Coverage */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Biblical Coverage</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { key: "ot", label: "Old Testament", color: "var(--gold)" },
                { key: "nt", label: "New Testament", color: "var(--slate)" },
                { key: "wisdom", label: "Wisdom Literature", color: "var(--sage)" },
                { key: "prophetic", label: "Prophetic Books", color: "var(--crimson)" },
              ].map(({ key, label, color }) => {
                const matchingSeries = series.filter((s) => s.canon_category === key);
                const seriesCount = matchingSeries.length;
                const sermonCount = matchingSeries.reduce(
                  (sum, s) => sum + (sermonsBySeries[s.id] || 0), 0
                );
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "3px", borderRadius: "2px", height: "36px",
                      background: color, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--ink-mid)", fontFamily: "'Crimson Pro', serif" }}>
                        {label}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--ink-ghost)", marginTop: "2px" }}>
                        {seriesCount === 0
                          ? "No series"
                          : `${seriesCount} series · ${sermonCount} sermon${sermonCount !== 1 ? "s" : ""}`}
                      </div>
                    </div>
                  </div>
                );
              })}
              {series.length > 0 && (
                <div style={{
                  marginTop: "4px", paddingTop: "12px",
                  borderTop: "1px solid var(--parchment-deep)",
                  fontSize: "12px", color: "var(--ink-ghost)",
                }}>
                  {series.filter(s => !s.canon_category).length > 0 && (
                    <span>{series.filter(s => !s.canon_category).length} series uncategorized</span>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Continue Where You Left Off */}
        {recentSermons.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", fontWeight: "600", color: "var(--ink-soft)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "14px" }}>
              Continue Where You Left Off
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${recentSermons.length}, 1fr)`, gap: "16px" }}>
              {recentSermons.map((sermon) => (
                <div key={sermon.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Title + badge */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: "600", color: "var(--ink)", lineHeight: "1.3" }}>
                      {sermon.title}
                    </div>
                    <span className={`stage-badge stage-${sermon.stage}`} style={{ flexShrink: 0 }}>{sermon.stage}</span>
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
                      onClick={() => handleReorient(sermon)}
                      disabled={reorientLoading[sermon.id]}
                    >
                      {reorientLoading[sermon.id] ? "Thinking…" : "Reorient me"}
                    </button>
                  </div>

                  {/* AI summary */}
                  {reorientSummaries[sermon.id] && (
                    <div style={{
                      marginTop: "4px",
                      padding: "12px 14px",
                      background: "var(--parchment-warm)",
                      borderRadius: "var(--radius)",
                      borderLeft: "3px solid var(--gold)",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      color: "var(--ink-mid)",
                      fontStyle: "italic",
                      position: "relative",
                    }}>
                      <button
                        onClick={() => setReorientSummaries((prev) => { const next = { ...prev }; delete next[sermon.id]; return next; })}
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "8px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--ink-ghost)",
                          fontSize: "14px",
                          lineHeight: "1",
                          padding: "2px 4px",
                        }}
                        title="Dismiss"
                      >×</button>
                      {reorientSummaries[sermon.id]}
                    </div>
                  )}
                </div>
              ))}
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
