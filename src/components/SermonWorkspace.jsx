import { useState, useEffect, useRef, useCallback } from "react";
import { useDemo } from "../contexts/DemoContext";
import TierBadge from "./TierBadge";
// useRef is used for pendingMessageId — a stable counter so repeated identical
// prompts each produce a distinct object reference and always trigger the effect.
import { useDebounce } from "../utils/hooks";
import { getSermonById, updateSermon, deleteSermon, getSeriesById, getSectionsBySeries } from "../db/database";
import { updateMemory, extractOutlinePattern, extractPhrasePatterns } from "../utils/memory";
import { autoResize } from "../utils";
import DeleteButton from "./DeleteButton";
import StudyTab from "./StudyTab";
import OutlineTab from "./OutlineTab";
import ManuscriptTab from "./ManuscriptTab";
import DeliveryTab from "./DeliveryTab";
import AIPanel from "./AIPanel";

const TABS = ["study", "outline", "manuscript", "delivery"];


export default function SermonWorkspace({ sermonId, onClose, onOpenSeries }) {
  const [sermon, setSermon] = useState(null);
  const [activeTab, setActiveTab] = useState("study");
  const [activeStep, setActiveStep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Pastoral Intelligence card — open when empty, collapsed when filled
  const [piOpen, setPiOpen] = useState(true);
  const { demoMode, enableDemoMode, disableDemoMode } = useDemo();
  const pendingIdRef = useRef(0);
  // Mirrors sermon state synchronously so captureMemory never reads a stale closure.
  const sermonRef = useRef(null);
  // Last hash captured — prevents duplicate memory writes when content hasn't changed.
  const lastCapturedHashRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSermonById(sermonId);

        // Fetch series and sections in parallel — only what's needed.
        // Sections are fetched only when both ids are present so we can
        // pluck the matching section without an extra IPC call.
        const [series, sections] = await Promise.all([
          data.series_id
            ? getSeriesById(data.series_id).catch((e) => { console.error("Series fetch failed:", e); return null; })
            : Promise.resolve(null),
          data.series_id && data.section_id
            ? getSectionsBySeries(data.series_id).catch((e) => { console.error("Sections fetch failed:", e); return []; })
            : Promise.resolve([]),
        ]);

        data.series  = series ?? null;
        data.section = data.section_id
          ? (sections.find((s) => s.id === data.section_id) ?? null)
          : null;

        setSermon(data);
        sermonRef.current = data;
        // Auto-collapse PI card if any field already has content
        if (data.topic_theme?.trim() || data.audience_assumptions?.trim() || data.background_noise?.trim()) {
          setPiOpen(false);
        }
        // Restore last active tab across restarts
        const savedTab = localStorage.getItem(`sermonforge_sermon_tab_${sermonId}`);
        if (savedTab && TABS.includes(savedTab)) setActiveTab(savedTab);
      } catch (e) {
        console.error("SermonWorkspace load error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sermonId]);

  function captureMemory(s, { scanPhrases = false } = {}) {
    if (!s) return;
    const hash = `${s.mpt ?? ""}|${s.passage ?? ""}|${s.outline ?? ""}`;
    if (hash === lastCapturedHashRef.current) return;
    const partial = {};

    const history = {};
    if (s.mpt?.trim()) history.recentMPTs = [s.mpt.trim()];
    if (s.passage?.trim()) history.recentPassages = [s.passage.trim()];
    if (Object.keys(history).length > 0) partial.history = history;

    const patterns = {};
    const outlinePattern = extractOutlinePattern(s.outline);
    if (outlinePattern) patterns.outlinePatterns = [outlinePattern];
    // Phrase extraction is expensive on long manuscripts — only run on tab change,
    // and only when the manuscript has enough content to yield a real signal.
    if (scanPhrases && (s.manuscript?.length ?? 0) >= 300) {
      const phrasePatterns = extractPhrasePatterns(s.manuscript);
      if (phrasePatterns.length > 0) patterns.phrasePatterns = phrasePatterns.slice(0, 3);
    }
    if (Object.keys(patterns).length > 0) partial.patterns = patterns;

    if (Object.keys(partial).length === 0) return;
    updateMemory(partial);
    lastCapturedHashRef.current = hash;
  }

  const persistUpdate = useCallback(
    async () => {
      try {
        await updateSermon(sermonId, sermonRef.current);
        captureMemory(sermonRef.current);
      } catch (e) {
        console.error("Save error:", e);
      }
    },
    [sermonId]
  );

  const debouncedSave = useDebounce(persistUpdate, 800);

  function handleUpdate(fields) {
    const merged = { ...sermonRef.current, ...fields };
    sermonRef.current = merged;
    setSermon(merged);
    debouncedSave();
  }

  function handleTabChange(tab) {
    captureMemory(sermonRef.current, { scanPhrases: true });
    setActiveTab(tab);
    setActiveStep(null);
    localStorage.setItem(`sermonforge_sermon_tab_${sermonId}`, tab);
  }

  async function handleDelete() {
    await deleteSermon(sermonId);
    onClose();
  }

  function handleAI(prompt, systemPrompt, options = {}) {
    if (options.openDrawer) setDrawerOpen(true);
    pendingIdRef.current += 1;
    setPendingMessage({ prompt, systemPrompt, step: activeStep || activeTab, id: pendingIdRef.current });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading sermon…</div>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div>
          <p style={{ color: "var(--ink-ghost)" }}>Sermon not found.</p>
          <button className="btn-ghost" onClick={onClose}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top bar */}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
          <button
            className="btn-icon"
            onClick={onClose}
            title="Back"
            style={{ flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="topbar-left">
            <div className="topbar-series">
              {sermon.series_title && sermon.series_id && onOpenSeries ? (
                <span
                  onClick={() => onOpenSeries(sermon.series_id)}
                  style={{ cursor: "pointer", color: "var(--gold)", textDecoration: "none" }}
                  title="Back to series"
                >
                  {sermon.series_title}
                </span>
              ) : (
                sermon.series_title && <span>{sermon.series_title}</span>
              )}
              {sermon.series_title && sermon.passage && <span> · </span>}
              {sermon.passage && (
                <span className="passage-ref">{sermon.passage}</span>
              )}
            </div>
            <div className="topbar-title">{sermon.title}</div>
          </div>
        </div>

        <div className="topbar-right">
          <DeleteButton onDelete={handleDelete} />

          <button
            onClick={() => setShowHowItWorks(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-ghost)", fontSize: "12px", padding: "4px 8px", fontFamily: "'Crimson Pro', serif" }}
          >
            How this works
          </button>
          <button
            onClick={() => demoMode ? disableDemoMode() : enableDemoMode()}
            style={{
              background: demoMode ? "var(--gold-pale)" : "none",
              border: demoMode ? "1px solid var(--gold)" : "1px solid var(--parchment-deep)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              color: demoMode ? "var(--gold)" : "var(--ink-ghost)",
              fontSize: "11px", padding: "3px 10px",
              fontFamily: "'Crimson Pro', serif", fontWeight: demoMode ? "700" : "400",
            }}
            title={demoMode ? "Turn off demo annotations" : "Turn on demo annotations"}
          >
            Demo
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setDrawerOpen(v => !v)}
            style={{ fontSize: "13px", color: drawerOpen ? "var(--gold)" : "var(--ink-ghost)", borderColor: drawerOpen ? "var(--gold)" : undefined }}
          >
            Chat with AI
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="stage-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`stage-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Demo completeness bar */}
      {demoMode && (() => {
        const hasExegesis = !!(sermon.observations || sermon.interpretation || sermon.redemptive_thread || sermon.implications);
        const hasOutline  = (() => { try { const o = JSON.parse(sermon.outline || "[]"); return Array.isArray(o) && o.length > 0; } catch { return false; } })();
        const tiers = [
          { n: 1, label: "T1 · Passage & MPT", filled: !!(sermon.passage || sermon.mpt || sermon.mps), color: "var(--gold)" },
          { n: 2, label: "T2 · Exegesis",       filled: hasExegesis, color: "var(--sage)" },
          { n: 3, label: "T3 · Structure",       filled: hasOutline, color: "var(--slate)" },
          { n: 4, label: "T4 · Series",          filled: !!(sermon.series?.big_idea || sermon.series?.series_motivation || sermon.series?.redemptive_context), color: "var(--crimson)" },
          { n: 7, label: "T7 · Pastoral",        filled: !!(sermon.topic_theme || sermon.audience_assumptions || sermon.background_noise), color: "#7b5ea7" },
        ];
        const filled = tiers.filter(t => t.filled).length;
        return (
          <div style={{ background: "var(--parchment-warm)", borderBottom: "1px solid var(--parchment-deep)", padding: "6px 20px", display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "11px", fontFamily: "'Crimson Pro', serif", color: "var(--ink-ghost)", flexShrink: 0 }}>Context: {filled}/{tiers.length} tiers</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              {tiers.map(t => (
                <span key={t.n} title={t.label} style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  fontSize: "11px", fontFamily: "'Crimson Pro', serif",
                  color: t.filled ? t.color : "var(--ink-ghost)",
                  opacity: t.filled ? 1 : 0.5,
                }}>
                  <span style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: t.filled ? t.color : "var(--parchment-deep)",
                    border: `1px solid ${t.color}`, flexShrink: 0,
                  }} />
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Body */}
      <div className="workspace-body">
        <div className="workspace-main">

          {/* Pastoral Intelligence orientation card — collapsible */}
          <div className="card" style={{ margin: "16px 20px 0", padding: "0" }}>
            {/* Header — always visible, click to toggle */}
            <div
              onClick={() => setPiOpen(v => !v)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", cursor: "pointer", userSelect: "none", gap: "12px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-ghost)", flexShrink: 0 }}>
                  Pastoral Context
                </span>
                <TierBadge tier={7} />
                {!piOpen && (
                  <span style={{ fontSize: "12px", color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[
                      sermon.topic_theme?.trim() && `${sermon.topic_theme.trim().slice(0, 40)}${sermon.topic_theme.trim().length > 40 ? "…" : ""}`,
                      sermon.audience_assumptions?.trim() && `${sermon.audience_assumptions.trim().slice(0, 40)}${sermon.audience_assumptions.trim().length > 40 ? "…" : ""}`,
                      sermon.background_noise?.trim() && `${sermon.background_noise.trim().slice(0, 40)}${sermon.background_noise.trim().length > 40 ? "…" : ""}`,
                    ].filter(Boolean).join("  ·  ") || <span style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>No context set</span>}
                  </span>
                )}
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ transform: piOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0, color: "var(--ink-ghost)" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {/* Expanded body */}
            {piOpen && (
              <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--parchment-deep)" }}>
                {/* Read-only series context — series sermons only */}
                {sermon.series_id && (sermon.series?.title || sermon.series?.big_idea || sermon.section?.big_idea) && (
                  <div style={{ marginTop: "12px", marginBottom: "12px", background: "var(--parchment-warm)", border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: "13px" }}>
                    {sermon.series?.title && (
                      <div style={{ color: "var(--ink-ghost)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", marginBottom: "4px" }}>
                        {sermon.series.title}
                      </div>
                    )}
                    {sermon.series?.big_idea && (
                      <div style={{ color: "var(--ink-mid)", marginBottom: sermon.section?.big_idea ? "6px" : "0" }}>
                        <span style={{ color: "var(--ink-ghost)", fontSize: "11px" }}>Series big idea  </span>{sermon.series.big_idea}
                      </div>
                    )}
                    {sermon.section?.big_idea && (
                      <div style={{ color: "var(--ink-mid)" }}>
                        <span style={{ color: "var(--ink-ghost)", fontSize: "11px" }}>Section big idea  </span>{sermon.section.big_idea}
                      </div>
                    )}
                  </div>
                )}

                {/* Three editable fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" }}>
                  <div>
                    <label className="field-label">Topic / Theme</label>
                    <textarea
                      className="field-textarea"
                      value={sermon.topic_theme || ""}
                      onChange={e => handleUpdate({ topic_theme: e.target.value })}
                      onInput={(e) => autoResize(e.target)}
                      ref={(el) => autoResize(el)}
                      placeholder="Topic or theme — doctrine, life situation, question, felt need..."
                      rows={1}
                    />
                  </div>
                  <div>
                    <label className="field-label">Audience</label>
                    <textarea
                      className="field-textarea"
                      value={sermon.audience_assumptions || ""}
                      onChange={e => handleUpdate({ audience_assumptions: e.target.value })}
                      onInput={(e) => autoResize(e.target)}
                      ref={(el) => autoResize(el)}
                      placeholder="What do you know about who's in the room?"
                      rows={1}
                    />
                  </div>
                  <div>
                    <label className="field-label">Background</label>
                    <textarea
                      className="field-textarea"
                      value={sermon.background_noise || ""}
                      onChange={e => handleUpdate({ background_noise: e.target.value })}
                      onInput={(e) => autoResize(e.target)}
                      ref={(el) => autoResize(el)}
                      placeholder="What's in the air — news, community events, cultural moment?"
                      rows={1}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeTab === "study" && (
            <StudyTab
              sermon={sermon}
              onUpdate={handleUpdate}
              onAI={handleAI}
              aiLoading={aiLoading}
              onStepChange={setActiveStep}
              onTabChange={handleTabChange}
            />
          )}
          {activeTab === "outline" && (
            <OutlineTab sermon={sermon} onUpdate={handleUpdate} />
          )}
          {activeTab === "manuscript" && (
            <ManuscriptTab
              sermon={sermon}
              onUpdate={handleUpdate}
              onAI={handleAI}
              aiLoading={aiLoading}
              onOpenDrawer={() => setDrawerOpen(true)}
            />
          )}
          {activeTab === "delivery" && (
            <DeliveryTab sermon={sermon} onUpdate={handleUpdate} />
          )}
        </div>

      </div>
    </div>

    {/* AI drawer — slides in from right, overlays content */}
    <div className={`ai-drawer ${drawerOpen ? "open" : ""}`}>
      <div className="ai-drawer-close-bar">
        <button className="ai-drawer-close-btn" onClick={() => setDrawerOpen(false)}>✕</button>
      </div>
      <AIPanel
        sermon={sermon}
        activeTab={activeTab}
        activeStep={activeStep}
        externalMessage={pendingMessage}
        onLoadingChange={setAiLoading}
        loading={aiLoading}
      />
    </div>
    {showHowItWorks && <SermonHowItWorksModal onClose={() => setShowHowItWorks(false)} />}
    </>
  );
}

// ── Sermon Workspace "How this works" modal ────────────────────────────────────
function SermonHowItWorksModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--white)", borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-deep)", padding: "28px 32px",
          maxWidth: "960px", width: "90vw", position: "relative",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "14px", right: "16px",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ink-ghost)", fontSize: "18px", lineHeight: 1,
          }}
        >✕</button>
        <h3 style={{
          fontFamily: "'Playfair Display', serif", fontSize: "18px",
          color: "var(--ink)", marginBottom: "6px",
        }}>How the Sermon Workspace works</h3>
        <p style={{
          fontSize: "13px", color: "var(--ink-ghost)",
          marginBottom: "24px", fontFamily: "'Crimson Pro', serif",
        }}>Each sermon moves through four stages from exegesis to delivery.</p>
        <div style={{ overflowX: "auto" }}>
          <svg viewBox="0 0 860 336" style={{ width: "100%", height: "auto", display: "block" }}>

            {/* ── Stage boxes ─────────────────────────────────────────────────── */}
            <rect x="10" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="100" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "'Crimson Pro', serif", fontWeight: 600 }}>Study</text>

            <rect x="230" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="320" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "'Crimson Pro', serif", fontWeight: 600 }}>Outline</text>

            <rect x="450" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="540" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "'Crimson Pro', serif", fontWeight: 600 }}>Manuscript</text>

            <rect x="670" y="16" width="180" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="760" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "'Crimson Pro', serif", fontWeight: 600 }}>Delivery</text>

            {/* ── Between-stage arrows ────────────────────────────────────────── */}
            <text x="210" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-ghost)", fontSize: "14px" }}>→</text>
            <text x="430" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-ghost)", fontSize: "14px" }}>→</text>
            <text x="650" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-ghost)", fontSize: "14px" }}>→</text>

            {/* ── Stage → first sub-item connectors ───────────────────────────── */}
            <line x1="100" y1="56" x2="100" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <line x1="320" y1="56" x2="320" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <line x1="540" y1="56" x2="540" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <line x1="760" y1="56" x2="760" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            {/* ── Study sub-items (7) ──────────────────────────────────────────── */}
            <rect x="10" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="100" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Observe</text>
            <line x1="100" y1="104" x2="100" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="10" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="100" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Interpret</text>
            <line x1="100" y1="140" x2="100" y2="148" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="10" y="148" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="100" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Redemptive Thread</text>
            <line x1="100" y1="176" x2="100" y2="184" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="10" y="184" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="100" y="198" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Implications</text>
            <line x1="100" y1="212" x2="100" y2="220" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="10" y="220" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="100" y="234" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>MPT / MPS</text>
            <line x1="100" y1="248" x2="100" y2="256" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="10" y="256" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="100" y="270" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Outline</text>
            <line x1="100" y1="284" x2="100" y2="292" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="10" y="292" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="100" y="306" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Functional Elements</text>

            {/* ── Outline sub-items (1) ────────────────────────────────────────── */}
            <rect x="230" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="320" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Outline Editor</text>

            {/* ── Manuscript sub-items (2) ─────────────────────────────────────── */}
            <rect x="450" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="540" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Manuscript Editor</text>
            <line x1="540" y1="104" x2="540" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="450" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="540" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Tune-Up Engine</text>

            {/* ── Delivery sub-items (4) ───────────────────────────────────────── */}
            <rect x="670" y="76" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="760" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Delivery Notes</text>
            <line x1="760" y1="104" x2="760" y2="112" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="670" y="112" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="760" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Timing Notes</text>
            <line x1="760" y1="140" x2="760" y2="148" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="670" y="148" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="760" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Post-Sermon</text>
            <line x1="760" y1="176" x2="760" y2="184" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            <rect x="670" y="184" width="180" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="760" y="198" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "'Crimson Pro', serif" }}>Checklist</text>

          </svg>
        </div>
      </div>
    </div>
  );
}
