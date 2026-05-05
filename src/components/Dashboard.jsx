import { useState, useEffect } from "react";
import { loadTourSermon, getInProgressSermons, deleteSermon } from "../core/spine";
import { useTour } from "../contexts/TourContext";
import { WORKSPACE_TOUR_STOPS } from "../tour/workspaceTourStops";
import NewSermonModal from "./NewSermonModal";
import DashboardHeader from "./DashboardHeader";
import DashboardChurchHistory from "./DashboardChurchHistory";
import PrimaryButton from "./primitives/PrimaryButton";
import TextButton from "./primitives/TextButton";
import DeleteButton from "./primitives/DeleteButton";
import { formatDate } from "../utils";

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function Dashboard({ onOpenSermon, onNewSeries, onLeaveTour }) {
  const { start: startTour } = useTour();
  const [showNewModal, setShowNewModal] = useState(false);
  const [tourLoading, setTourLoading] = useState(false);
  const [inProgress, setInProgress] = useState([]);

  // State Contract #6: in-progress work is queryable from the front door.
  // Pilot B.3 closes the surface gap by reading spine.getInProgressSermons()
  // and rendering a Resume Work panel here. Sermons whose delivery date has
  // passed but stage is still in_progress are visually flagged as a
  // return-day reminder — covers the case where the preacher delivered the
  // sermon but never came back to mark it complete.
  useEffect(() => {
    let cancelled = false;
    getInProgressSermons()
      .then((rows) => { if (!cancelled) setInProgress(rows || []); })
      .catch((e) => console.error("[Dashboard] getInProgressSermons failed:", e));
    return () => { cancelled = true; };
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = inProgress.filter((s) => s.date && s.date < today);
  const upcoming = inProgress.filter((s) => !s.date || s.date >= today).slice(0, 5);

  async function handleDeleteSermon(id) {
    await deleteSermon(id);
    setInProgress((prev) =>
      prev.some((s) => s.id === id) ? prev.filter((s) => s.id !== id) : prev,
    );
  }

  async function handleStartWorkspaceTour() {
    if (tourLoading) return;
    setTourLoading(true);
    try {
      const result = await loadTourSermon();
      if (result?.sermonId && onOpenSermon) {
        onOpenSermon(result.sermonId);
        setTimeout(() => startTour(WORKSPACE_TOUR_STOPS, {
          onLeave: onLeaveTour,
          seenKey: "sf_tour_workspace_seen",
        }), 250);
      }
    } catch (e) {
      console.error("Failed to start workspace tour:", e);
    } finally {
      setTourLoading(false);
    }
  }

  return (
    <>
      <DashboardHeader />

      <div className="page-body dash-page-body">
        <div className="dash-content">
          <div className="dash-grid">
            {/* HERO — Build a sermon */}
            <div
              className="dash-tile tile-hero"
              onClick={() => setShowNewModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowNewModal(true);
                }
              }}
            >
              <div className="tile-eyebrow">
                <span className="dot" />
                <span>Primary&nbsp;workflow</span>
              </div>
              <h2 className="tile-title tile-title-lg">
                Build a <em>sermon.</em>
              </h2>
              <p className="tile-blurb">
                Walk a single sermon from text to manuscript. Exegesis, MPT and MPS,
                outline, functional elements, and delivery — the full Sermon Workspace,
                one step at a time.
              </p>
              <div className="tile-actions">
                <PrimaryButton
                  className="btn-hero"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewModal(true);
                  }}
                >
                  Build sermon <ArrowRightIcon />
                </PrimaryButton>
                <TextButton
                  className="tile-meta tile-meta-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartWorkspaceTour();
                  }}
                  disabled={tourLoading}
                >
                  {tourLoading ? "Loading…" : "or take the guided tour →"}
                </TextButton>
              </div>
            </div>

            {/* SERIES */}
            <div
              className="dash-tile tile-secondary"
              onClick={onNewSeries}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNewSeries && onNewSeries();
                }
              }}
            >
              <div className="tile-eyebrow tile-eyebrow-soft">Plan&nbsp;ahead</div>
              <h3 className="tile-title">
                Build a <em>series.</em>
              </h3>
              <p className="tile-blurb">
                Plan a sermon series end to end. Set the passage range, big idea,
                and redemptive arc — then break it into weeks.
              </p>
              <span className="tile-link">
                Build series <ArrowRightIcon />
              </span>
            </div>

            {/* RESUME WORK — State Contract #6 surface integration. */}
            <ResumeWorkTile
              overdue={overdue}
              upcoming={upcoming}
              onOpenSermon={onOpenSermon}
              onDeleteSermon={handleDeleteSermon}
            />
          </div>

          <DashboardChurchHistory />
        </div>
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

// ── Resume Work tile ──────────────────────────────────────────────────────────
//
// State Contract #6 surface: the Dashboard's answer to "what am I currently
// working on." Two sections:
//
//   1. Return-day reminder — sermons whose delivery date has passed but
//      stage is still in_progress. Highlighted with a crimson left-border
//      so the preacher sees them first; clicking opens the workspace where
//      the Mark Complete button lives.
//   2. Resume — up to 5 in-progress sermons with future or no delivery
//      date, ordered as the spine returned them.
//
// When the preacher has nothing in flight, the tile renders an empty-state
// pointing back to the hero "Build a sermon" tile.

function ResumeWorkTile({ overdue, upcoming, onOpenSermon, onDeleteSermon }) {
  const isEmpty = overdue.length === 0 && upcoming.length === 0;

  return (
    <div className="dash-tile tile-secondary" style={{ display: "flex", flexDirection: "column" }}>
      <div className="tile-eyebrow tile-eyebrow-soft">Resume&nbsp;work</div>
      <h3 className="tile-title">Where you left off.</h3>

      {isEmpty ? (
        <p className="tile-blurb" style={{ marginTop: "8px" }}>
          Nothing in flight. Start a sermon when you're ready.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
          {overdue.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{
                fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--crimson-soft)", fontWeight: 600,
              }}>
                Delivered without marking complete
              </div>
              {overdue.map((s) => (
                <ResumeRow key={s.id} sermon={s} onOpen={onOpenSermon} onDelete={onDeleteSermon} flagged />
              ))}
            </div>
          )}
          {upcoming.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {overdue.length > 0 && (
                <div style={{
                  fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em",
                  color: "var(--ink-ghost)", fontWeight: 600, marginTop: "4px",
                }}>
                  In progress
                </div>
              )}
              {upcoming.map((s) => (
                <ResumeRow key={s.id} sermon={s} onOpen={onOpenSermon} onDelete={onDeleteSermon} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResumeRow({ sermon, onOpen, onDelete, flagged }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(sermon.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(sermon.id);
        }
      }}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        cursor: "pointer",
        padding: "8px 10px",
        borderRadius: "var(--radius)",
        background: "var(--parchment-warm)",
        borderLeft: flagged ? "3px solid var(--crimson-soft)" : "3px solid var(--gold)",
        fontFamily: "'Crimson Pro', serif",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "13px", color: "var(--ink)", fontWeight: 600,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {sermon.title || "Untitled"}
        </div>
        <div style={{ fontSize: "11px", color: "var(--ink-ghost)", marginTop: "2px" }}>
          {sermon.passage || "—"}
          {sermon.date && <> · {formatDate(sermon.date)}</>}
          {sermon.series_title && <> · {sermon.series_title}</>}
        </div>
      </div>
      {onDelete && (
        <DeleteButton small onDelete={() => onDelete(sermon.id)} />
      )}
    </div>
  );
}
