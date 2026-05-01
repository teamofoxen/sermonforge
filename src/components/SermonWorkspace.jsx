import { useState, useEffect, useRef, useCallback } from "react";
// useRef is used for pendingMessageId — a stable counter so repeated identical
// prompts each produce a distinct object reference and always trigger the effect.
import { useDebounce } from "../utils/hooks";
import { useTour } from "../contexts/TourContext";
import {
  getSermon, updateSermon, deleteSermon,
  getSeries, getSectionsBySeries, getSermonsBySeries,
  persistMutation, INITIAL_SAVE_STATE,
} from "../core/spine";
import { pickSermonColumns, STAGE, STAGE_SEQUENCE, STAGE_LABELS } from "../core/contracts";
import { updateMemory, extractOutlinePattern, extractPhrasePatterns } from "../utils/memory";
import { autoResize } from "../utils";
import DeleteButton from "./DeleteButton";
import StudyTab from "./StudyTab";
import OutlineTab from "./OutlineTab";
import ManuscriptTab from "./ManuscriptTab";
import DeliveryTab from "./DeliveryTab";
import AIPanel from "./AIPanel";
import PassagePopup from "./PassagePopup";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import BackButton from "./primitives/BackButton";
import TextButton from "./primitives/TextButton";

// Workspace tabs are Stage values from `src/core/contracts.ts` — single
// source of truth. Pre-vocabulary-completion the keys were lowercase and
// the second key was misnamed `"outline"` (the tab itself is the Blueprint
// — `OutlineTab.jsx` is just the file that renders it). The tab keys now
// match `STAGE.{Study,Blueprint,Manuscript,Delivery}` everywhere.
const TABS = STAGE_SEQUENCE;
const TAB_LABELS = STAGE_LABELS;

// localStorage migration — pre-vocabulary-completion stored values were
// lowercase ("study"/"outline"/"manuscript"/"delivery"). Map them to the
// canonical Stage values at read time so existing sermons restore the
// correct tab on next mount.
const LEGACY_TAB_MAP = {
  study: STAGE.Study,
  outline: STAGE.Blueprint,
  manuscript: STAGE.Manuscript,
  delivery: STAGE.Delivery,
};


export default function SermonWorkspace({ sermonId, onClose, onOpenSeries, onOpenSermon }) {
  const [sermon, setSermon] = useState(null);
  const [activeTab, setActiveTab] = useState(STAGE.Study);
  const [activeStep, setActiveStep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [studySummaries, setStudySummaries] = useState({});
  const [showPassage, setShowPassage] = useState(false);
  // Save visibility — Mutation Contract #3 lives in spine.persistMutation.
  // "Saving…" while in flight, "Saved" when at rest, "Save failed · Retry" on error.
  const [saveState, setSaveState] = useState(INITIAL_SAVE_STATE);
  const { saving, saveError, lastSavedAt } = saveState;
  // Movement-event marker — Process Contract #3 ("movement is a visible event").
  // Set when handleTabChange advances the canonical position; auto-clears on
  // dismiss or next movement. The data-testid="movement-event" lets the
  // contract test (and future surfaces) locate this canonical marker.
  const [lastMovement, setLastMovement] = useState(null);
  // Position-in-series — State Contract #4: parent context is first-class.
  // siblingIds is the ordered list of sermon IDs in the current sermon's
  // series. Empty array when the sermon has no series.
  const [siblingIds, setSiblingIds] = useState([]);
  // Pastoral Context card — open when empty, collapsed when filled
  const [pcOpen, setPcOpen] = useState(true);
  const { active: tourActive, desiredUi } = useTour();
  const pendingIdRef = useRef(0);

  // When the tour is active, align workspace state with the current stop's
  // declared prerequisites. Only writes when there's a real change so we don't
  // fight the user mid-step.
  useEffect(() => {
    if (!tourActive || !desiredUi) return;
    if (desiredUi.tab && desiredUi.tab !== activeTab) {
      setActiveTab(desiredUi.tab);
    }
    if (typeof desiredUi.drawerOpen === "boolean" && desiredUi.drawerOpen !== drawerOpen) {
      setDrawerOpen(desiredUi.drawerOpen);
    }
    if (typeof desiredUi.pcOpen === "boolean" && desiredUi.pcOpen !== pcOpen) {
      setPcOpen(desiredUi.pcOpen);
    }
  }, [tourActive, desiredUi, activeTab, drawerOpen, pcOpen]);
  // Mirrors sermon state synchronously so captureMemory never reads a stale closure.
  const sermonRef = useRef(null);
  // Last hash captured — prevents duplicate memory writes when content hasn't changed.
  const lastCapturedHashRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSermon(sermonId);
        if (!data) {
          setLoading(false);
          return;
        }

        // Fetch series, sections, and sibling sermons in parallel — only what's needed.
        // Sections are fetched only when both ids are present so we can
        // pluck the matching section without an extra IPC call. Siblings
        // are fetched whenever the sermon belongs to a series so the topbar
        // can show position and prev/next navigation (State Contract #4).
        const [series, sections, siblings] = await Promise.all([
          data.series_id
            ? getSeries(data.series_id).catch((e) => { console.error("Series fetch failed:", e); return null; })
            : Promise.resolve(null),
          data.series_id && data.section_id
            ? getSectionsBySeries(data.series_id).catch((e) => { console.error("Sections fetch failed:", e); return []; })
            : Promise.resolve([]),
          data.series_id
            ? getSermonsBySeries(data.series_id).catch((e) => { console.error("Siblings fetch failed:", e); return []; })
            : Promise.resolve([]),
        ]);

        data.series  = series ?? null;
        data.section = data.section_id
          ? (sections.find((s) => s.id === data.section_id) ?? null)
          : null;

        setSermon(data);
        sermonRef.current = data;
        setSiblingIds(Array.isArray(siblings) ? siblings.map(s => s.id) : []);
        // Auto-collapse PC card if any field already has content
        if (data.topic_theme?.trim() || data.audience_assumptions?.trim() || data.background_noise?.trim()) {
          setPcOpen(false);
        }
        // Restore last active tab across restarts
        const savedTab = localStorage.getItem(`sermonforge_sermon_tab_${sermonId}`);
        const migratedTab = savedTab && (LEGACY_TAB_MAP[savedTab] || savedTab);
        if (migratedTab && TABS.includes(migratedTab)) setActiveTab(migratedTab);
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
      // sermonRef.current carries JOIN fields, position fields, and
      // attached series/section objects that are not in SERMON_COLUMNS.
      // Filter to the writable allowlist before sending — buildUpdate
      // throws in dev / drops in prod when an unknown column appears.
      const payload = pickSermonColumns(sermonRef.current);
      await persistMutation(setSaveState, async () => {
        await updateSermon(sermonId, payload);
        captureMemory(sermonRef.current);
      });
    },
    [sermonId]
  );

  const debouncedSave = useDebounce(persistUpdate, 800);

  // Flush any pending debounced save when navigating away.
  useEffect(() => {
    return () => { persistUpdate(); };
  }, [persistUpdate]);

  function handleUpdate(fields) {
    const merged = { ...sermonRef.current, ...fields };
    sermonRef.current = merged;
    setSermon(merged);
    debouncedSave();
  }

  function handleTabChange(tab) {
    const previousTab = activeTab;
    captureMemory(sermonRef.current, { scanPhrases: true });
    setActiveTab(tab);
    setActiveStep(null);
    localStorage.setItem(`sermonforge_sermon_tab_${sermonId}`, tab);
    if (previousTab && previousTab !== tab) {
      setLastMovement({ from: previousTab, to: tab, at: Date.now() });
    }
  }

  async function handleDelete() {
    await deleteSermon(sermonId);
    onClose();
  }

  function handleAI(prompt, systemPrompt, options = {}) {
    if (options.openDrawer) setDrawerOpen(true);
    pendingIdRef.current += 1;
    setPendingMessage({
      prompt,
      systemPrompt,
      step: activeStep || activeTab,
      id: pendingIdRef.current,
      persistColumn: options.persistColumn,
    });
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
          <BackButton onClick={onClose} />
        </div>
      </div>
    );
  }

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Movement-event marker — Process Contract #3.
          Surfaces a transient "advanced from X to Y" banner when the
          canonical position changes. data-testid is the marker contract
          tests look for; future surfaces inherit this element. */}
      {lastMovement && (
        <div
          data-testid="movement-event"
          role="status"
          aria-live="polite"
          onClick={() => setLastMovement(null)}
          style={{
            background: "var(--parchment-warm)",
            borderLeft: "3px solid var(--gold)",
            padding: "8px 16px",
            fontSize: "13px",
            color: "var(--ink-mid)",
            fontFamily: "'Crimson Pro', serif",
            cursor: "pointer",
          }}
          title="Click to dismiss"
        >
          Advanced from {TAB_LABELS[lastMovement.from] || lastMovement.from} to{" "}
          {TAB_LABELS[lastMovement.to] || lastMovement.to}.
        </div>
      )}
      {/* Top bar */}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
          <BackButton
            variant="icon"
            onClick={onClose}
            title="Back"
            className="btn-icon"
            style={{ flexShrink: 0 }}
          />
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
              {/* Position-in-series chip + prev/next chevrons. State Contract #4:
                  parent context is first-class — the user can answer "which
                  sermon of how many am I on" without leaving the workspace. */}
              {(() => {
                const idx = sermon.series_id && siblingIds.length > 0
                  ? siblingIds.indexOf(sermonId)
                  : -1;
                if (idx < 0) return null;
                const total = siblingIds.length;
                const position = idx + 1;
                const prevId = idx > 0 ? siblingIds[idx - 1] : null;
                const nextId = idx < total - 1 ? siblingIds[idx + 1] : null;
                const navStyle = {
                  background: "transparent",
                  border: "none",
                  padding: "0 4px",
                  cursor: "pointer",
                  color: "var(--ink-ghost)",
                  fontSize: "14px",
                  lineHeight: 1,
                };
                const navStyleDisabled = { ...navStyle, cursor: "default", opacity: 0.3 };
                return (
                  <>
                    {sermon.series_title && <span> · </span>}
                    <span
                      style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}
                      title={`Sermon ${position} of ${total} in this series`}
                    >
                      <IconButton
                        style={prevId && onOpenSermon ? navStyle : navStyleDisabled}
                        onClick={() => prevId && onOpenSermon && onOpenSermon(prevId)}
                        disabled={!prevId || !onOpenSermon}
                        aria-label="Previous sermon in series"
                      >‹</IconButton>
                      <span>Sermon {position} of {total}</span>
                      <IconButton
                        style={nextId && onOpenSermon ? navStyle : navStyleDisabled}
                        onClick={() => nextId && onOpenSermon && onOpenSermon(nextId)}
                        disabled={!nextId || !onOpenSermon}
                        aria-label="Next sermon in series"
                      >›</IconButton>
                    </span>
                  </>
                );
              })()}
              {(sermon.series_title || (sermon.series_id && siblingIds.length > 0)) && sermon.passage && <span> · </span>}
              {sermon.passage && (
                <span
                  className="passage-ref"
                  onClick={() => setShowPassage(v => !v)}
                  style={{ cursor: "pointer" }}
                  title="Show ESV text"
                >{sermon.passage}</span>
              )}
            </div>
            <div className="topbar-title" data-tour-id="workspace-title">{sermon.title}</div>
          </div>
        </div>

        <div className="topbar-right">
          {saving && (
            <span
              style={{ fontSize: "12px", color: "var(--ink-ghost)", fontStyle: "italic", padding: "0 6px" }}
            >
              Saving…
            </span>
          )}
          {!saving && saveError && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0 6px" }}>
              <span style={{ fontSize: "12px", color: "var(--crimson-soft)" }}>Save failed</span>
              <SecondaryButton
                size="sm"
                style={{ fontSize: "12px", padding: "2px 8px" }}
                onClick={persistUpdate}
              >
                Retry
              </SecondaryButton>
            </span>
          )}
          {!saving && !saveError && lastSavedAt && (
            <span
              style={{ fontSize: "12px", color: "var(--ink-ghost)", padding: "0 6px" }}
              title={`Last saved ${new Date(lastSavedAt).toLocaleString()}`}
            >
              Saved
            </span>
          )}

          <DeleteButton onDelete={handleDelete} />

          <TextButton onClick={() => setShowHowItWorks(true)}>
            How this works
          </TextButton>
          <SecondaryButton
            size="sm"
            data-tour-id="chat-with-ai-button"
            onClick={() => setDrawerOpen(v => !v)}
            style={{ fontSize: "13px", color: drawerOpen ? "var(--gold)" : "var(--ink-ghost)", borderColor: drawerOpen ? "var(--gold)" : undefined }}
          >
            Chat with AI
          </SecondaryButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="stage-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            data-tour-id={`stage-tab-${tab}`}
            className={`stage-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => handleTabChange(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="workspace-body">
        <div className="workspace-main">

          {/* Pastoral Context orientation card — collapsible */}
          <div className="card" data-tour-id="pastoral-context-card" style={{ margin: "16px 20px 0", padding: "0" }}>
            {/* Header — always visible, click to toggle */}
            <div
              onClick={() => setPcOpen(v => !v)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", cursor: "pointer", userSelect: "none", gap: "12px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-ghost)", flexShrink: 0 }}>
                  Pastoral Context
                </span>
                {!pcOpen && (
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
                style={{ transform: pcOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0, color: "var(--ink-ghost)" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {/* Expanded body */}
            {pcOpen && (
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

                {/* Three editable fields — ordered outside in: Cultural Moment → The Room → The Sermon's Work */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" }}>
                  <div data-tour-id="pi-cultural-moment">
                    <label className="field-label">The Cultural Moment</label>
                    <textarea
                      className="field-textarea"
                      value={sermon.background_noise || ""}
                      onChange={e => handleUpdate({ background_noise: e.target.value })}
                      onInput={(e) => autoResize(e.target)}
                      ref={(el) => autoResize(el)}
                      placeholder="What world is this congregation walking in from? What does culture believe, distort, or weaponize about this topic?"
                      rows={1}
                    />
                  </div>
                  <div data-tour-id="pi-the-room">
                    <label className="field-label">The Room</label>
                    <textarea
                      className="field-textarea"
                      value={sermon.audience_assumptions || ""}
                      onChange={e => handleUpdate({ audience_assumptions: e.target.value })}
                      onInput={(e) => autoResize(e.target)}
                      ref={(el) => autoResize(el)}
                      placeholder="Who's in the room and where are they? Where has this congregation drifted, and what do they currently believe?"
                      rows={1}
                    />
                  </div>
                  <div data-tour-id="pi-sermons-work">
                    <label className="field-label">The Sermon's Work</label>
                    <textarea
                      className="field-textarea"
                      value={sermon.topic_theme || ""}
                      onChange={e => handleUpdate({ topic_theme: e.target.value })}
                      onInput={(e) => autoResize(e.target)}
                      ref={(el) => autoResize(el)}
                      placeholder="What is this sermon trying to accomplish? What is the big claim, and where does the Gospel enter?"
                      rows={1}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeTab === STAGE.Study && (
            <StudyTab
              sermon={sermon}
              onUpdate={handleUpdate}
              onAI={handleAI}
              aiLoading={aiLoading}
              onStepChange={setActiveStep}
              onTabChange={handleTabChange}
              onSummaryGenerated={(key, text) => setStudySummaries(prev => ({ ...prev, [key]: text }))}
            />
          )}
          {activeTab === STAGE.Blueprint && (
            <OutlineTab sermon={sermon} onUpdate={handleUpdate} onTabChange={handleTabChange} studySummaries={studySummaries} />
          )}
          {activeTab === STAGE.Manuscript && (
            <ManuscriptTab
              sermon={sermon}
              onUpdate={handleUpdate}
              onAI={handleAI}
              aiLoading={aiLoading}
              onOpenDrawer={() => setDrawerOpen(true)}
              onTabChange={handleTabChange}
            />
          )}
          {activeTab === STAGE.Delivery && (
            <DeliveryTab sermon={sermon} onUpdate={handleUpdate} />
          )}
        </div>

      </div>
    </div>

    {/* AI drawer — slides in from right, overlays content */}
    <div className={`ai-drawer ${drawerOpen ? "open" : ""}`}>
      <div className="ai-drawer-close-bar">
        <IconButton aria-label="Close AI drawer" className="ai-drawer-close-btn" onClick={() => setDrawerOpen(false)}>✕</IconButton>
      </div>
      <AIPanel
        sermon={sermon}
        activeTab={activeTab}
        activeStep={activeStep}
        externalMessage={pendingMessage}
        onLoadingChange={setAiLoading}
        loading={aiLoading}
        onUpdate={handleUpdate}
      />
    </div>
    {showHowItWorks && <SermonHowItWorksModal onClose={() => setShowHowItWorks(false)} />}
    <PassagePopup
      passage={sermon?.passage}
      isOpen={showPassage}
      onClose={() => setShowPassage(false)}
    />
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
        <IconButton
          aria-label="Close how-this-works modal"
          onClick={onClose}
          style={{
            position: "absolute", top: "14px", right: "16px",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ink-ghost)", fontSize: "18px", lineHeight: 1,
          }}
        >✕</IconButton>
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
            <text x="320" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "'Crimson Pro', serif", fontWeight: 600 }}>Blueprint</text>

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
