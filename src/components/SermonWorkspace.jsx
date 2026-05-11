import { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from "../utils/hooks";
import { useTour } from "../contexts/TourContext";
import {
  getSermon, updateSermon, deleteSermon,
  getSeries, getSectionsBySeries, getSermonsBySeries,
  persistMutation, INITIAL_SAVE_STATE,
  transitionState,
} from "../core/spine";
import { pickSermonColumns, STAGE, STAGE_SEQUENCE, STAGE_LABELS, ContractViolation } from "../core/contracts";
import { buildStageEvidence, formatTabRejection } from "../utils/studyAdvancement";
import { autoResize } from "../utils";
import DeleteButton from "./DeleteButton";
import StudyTab from "./StudyTab";
import AssemblyTab from "./AssemblyTab";
import ManuscriptTrail from "./ManuscriptTrail";
import PassagePopup from "./PassagePopup";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import BackButton from "./primitives/BackButton";
import TextButton from "./primitives/TextButton";

const TABS = STAGE_SEQUENCE;
const TAB_LABELS = STAGE_LABELS;

// Legacy tab-key aliases. "outline" + "Blueprint" + "Frame" all route to
// STAGE.Assembly (which absorbed those former stages). "delivery" routes
// to Manuscript per ARI Phase 7.
const LEGACY_TAB_MAP = {
  study: STAGE.Study,
  outline: STAGE.Assembly,
  Blueprint: STAGE.Assembly,
  Frame: STAGE.Assembly,
  manuscript: STAGE.Manuscript,
  delivery: STAGE.Manuscript,
};


export default function SermonWorkspace({ sermonId, onClose, onOpenSermon }) {
  const [sermon, setSermon] = useState(null);
  const [activeTab, setActiveTab] = useState(STAGE.Study);
  const [activeStep, setActiveStep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showPassage, setShowPassage] = useState(false);
  // Save visibility — Mutation Contract #3 lives in spine.persistMutation.
  // "Saving…" while in flight, "Saved" when at rest, "Save failed · Retry" on error.
  const [saveState, setSaveState] = useState(INITIAL_SAVE_STATE);
  const { saving, saveError, lastSavedAt } = saveState;
  // Movement-event marker — Process Contract #3 ("movement is a visible event").
  // Fires on stage transitions (handleTabChange) and on sub-phase / step
  // transitions bubbled up from StudyTab via onMovement. Auto-clears on
  // dismiss or next movement. The data-testid="movement-event" is the
  // canonical marker the contract test (and future surfaces) locate.
  const [lastMovement, setLastMovement] = useState(null);
  // Q1 spine routing — stage-level rejections (Process #1/#2 from
  // transitionState) surface here. Q3 will replace this with proper hard-gate UX.
  const [tabError, setTabError] = useState(null);
  // Position-in-series — State Contract #4: parent context is first-class.
  // siblingIds is the ordered list of sermon IDs in the current sermon's
  // series. Empty array when the sermon has no series.
  const [siblingIds, setSiblingIds] = useState([]);
  // SPRD B4.2: PC card removed from workspace; PC substance now lives in
  // Phase 4 Field 3 (Pastoral Context) per SFDI Phase 4 walk. The PC schema
  // columns (background_noise, audience_assumptions, topic_theme) are
  // preserved for legacy data; their content surfaces as Phase 4 Field 3
  // legacy_notes on first open of a sermon under the new shape.
  const { active: tourActive, desiredUi } = useTour();

  // When the tour is active, align workspace state with the current stop's
  // declared prerequisites. Only writes when there's a real change so we don't
  // fight the user mid-step.
  useEffect(() => {
    if (!tourActive || !desiredUi) return;
    if (desiredUi.tab && desiredUi.tab !== activeTab) {
      setActiveTab(desiredUi.tab);
    }
  }, [tourActive, desiredUi, activeTab]);
  const sermonRef = useRef(null);

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

  const persistUpdate = useCallback(
    async () => {
      // sermonRef.current carries JOIN fields, position fields, and
      // attached series/section objects that are not in SERMON_COLUMNS.
      // Filter to the writable allowlist before sending — buildUpdate
      // throws in dev / drops in prod when an unknown column appears.
      const payload = pickSermonColumns(sermonRef.current);
      await persistMutation(setSaveState, async () => {
        await updateSermon(sermonId, payload);
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

  async function handleTabChange(tab) {
    const previousTab = activeTab;
    if (tab === previousTab) return;
    setTabError(null);

    // Q1 spine routing — stage transitions through transitionState.
    const fromIdx = STAGE_SEQUENCE.indexOf(previousTab);
    const toIdx = STAGE_SEQUENCE.indexOf(tab);
    const direction = toIdx > fromIdx ? "forward" : "backward";
    const evidence = buildStageEvidence(sermonRef.current, previousTab);
    try {
      await transitionState({
        sermonId,
        to: tab,
        evidence,
        direction,
      });
    } catch (e) {
      if (e instanceof ContractViolation) {
        setTabError(formatTabRejection(e));
        return;
      }
      throw e;
    }

    setActiveTab(tab);
    setActiveStep(null);
    localStorage.setItem(`sermonforge_sermon_tab_${sermonId}`, tab);
    setLastMovement({ from: previousTab, to: tab, at: Date.now() });
  }

  async function handleDelete() {
    await deleteSermon(sermonId);
    onClose();
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
            fontFamily: "var(--font-serif)",
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
              {sermon.series_title && <span>{sermon.series_title}</span>}
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

      {tabError && (
        <div
          data-testid="tab-error"
          role="alert"
          aria-live="polite"
          onClick={() => setTabError(null)}
          style={{
            background: "var(--parchment-warm)",
            borderLeft: "3px solid var(--gold)",
            padding: "8px 16px",
            margin: "0 20px 8px",
            fontSize: "13px",
            color: "var(--ink-mid)",
            cursor: "pointer",
          }}
        >
          {tabError}
        </div>
      )}

      {/* Body */}
      <div className="workspace-body">
        <div className="workspace-main">

          {/* Pastoral Context card removed in SPRD B4.2 — its three text
              fields (background_noise, audience_assumptions, topic_theme)
              now surface as Phase 4 Field 3 (Pastoral Context) in the
              SFDI three-way conversation. The schema columns are preserved
              defensively so legacy data can migrate into Field 3's
              legacy_notes on first open. */}

          {activeTab === STAGE.Study && (
            <StudyTab
              sermon={sermon}
              onUpdate={handleUpdate}
              onTabChange={handleTabChange}
              onMovement={({ from, to }) => setLastMovement({ from, to, at: Date.now() })}
            />
          )}
          {activeTab === STAGE.Assembly && (
            <AssemblyTab
              sermon={sermon}
              onUpdate={handleUpdate}
              onTabChange={handleTabChange}
              onMovement={({ from, to }) => setLastMovement({ from, to, at: Date.now() })}
            />
          )}
          {activeTab === STAGE.Manuscript && (
            <ManuscriptTrail
              sermon={sermon}
              onUpdate={handleUpdate}
            />
          )}
        </div>

      </div>
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
          fontFamily: "var(--font-serif)", fontSize: "18px",
          color: "var(--ink)", marginBottom: "6px",
        }}>How the Sermon Workspace works</h3>
        <p style={{
          fontSize: "13px", color: "var(--ink-ghost)",
          marginBottom: "24px", fontFamily: "var(--font-serif)",
        }}>Each sermon moves through three stages from text to manuscript.</p>
        <div style={{ overflowX: "auto" }}>
          <svg viewBox="0 0 720 240" style={{ width: "100%", height: "auto", display: "block" }}>

            {/* Three stage chips. */}
            <rect x="20" y="16" width="200" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="120" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "var(--font-serif)", fontWeight: 600 }}>Study</text>

            <rect x="260" y="16" width="200" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="360" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "var(--font-serif)", fontWeight: 600 }}>Assembly</text>

            <rect x="500" y="16" width="200" height="40" rx="6" style={{ fill: "var(--gold-pale)", stroke: "var(--gold)", strokeWidth: "1.5" }} />
            <text x="600" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink)", fontSize: "14px", fontFamily: "var(--font-serif)", fontWeight: 600 }}>Manuscript</text>

            <text x="240" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-ghost)", fontSize: "14px" }}>→</text>
            <text x="480" y="36" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-ghost)", fontSize: "14px" }}>→</text>

            {/* Sub-phase connectors. */}
            <line x1="120" y1="56" x2="120" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <line x1="360" y1="56" x2="360" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <line x1="600" y1="56" x2="600" y2="76" style={{ stroke: "var(--parchment-deep)", strokeWidth: "1" }} />

            {/* Study sub-phases. */}
            <rect x="20" y="76" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="120" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Observe</text>

            <rect x="20" y="112" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="120" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Interpret</text>

            <rect x="20" y="148" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="120" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Redemptive Thread</text>

            <rect x="20" y="184" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="120" y="198" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Implications</text>

            {/* Assembly sub-phases. */}
            <rect x="260" y="76" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="360" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Anchor (MPT/MPS)</text>

            <rect x="260" y="112" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="360" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Outline</text>

            <rect x="260" y="148" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="360" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Equip (FE)</text>

            <rect x="260" y="184" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="360" y="198" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Frame (Intro/Conclusion)</text>

            {/* Manuscript surfaces. */}
            <rect x="500" y="76" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="600" y="90" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Manuscript Editor</text>

            <rect x="500" y="112" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="600" y="126" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Manuscript Notebook</text>

            <rect x="500" y="148" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="600" y="162" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Review Checklists</text>

            <rect x="500" y="184" width="200" height="28" rx="4" style={{ fill: "var(--white)", stroke: "var(--parchment-deep)", strokeWidth: "1" }} />
            <text x="600" y="198" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--ink-soft)", fontSize: "12px", fontFamily: "var(--font-serif)" }}>Export to Word</text>

          </svg>
        </div>
      </div>
    </div>
  );
}
