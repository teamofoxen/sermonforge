import { useState, useEffect } from "react";
import { loadTourSermon, getInProgressSermons, deleteSermon } from "../core/spine";
import { useTour } from "../contexts/TourContext";
import { WORKSPACE_TOUR_STOPS } from "../tour/workspaceTourStops";
import NewSermonModal from "./NewSermonModal";
import DashboardVerseCarousel from "./DashboardVerseCarousel";
import DashboardPreacherQuote from "./DashboardPreacherQuote";
import PrimaryButton from "./primitives/PrimaryButton";
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
  const [loadingAction, setLoadingAction] = useState(null); // null | 'tour' | 'sample'
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
  const upcoming = inProgress.filter((s) => !s.date || s.date >= today);

  async function handleDeleteSermon(id) {
    await deleteSermon(id);
    setInProgress((prev) =>
      prev.some((s) => s.id === id) ? prev.filter((s) => s.id !== id) : prev,
    );
  }

  async function openSampleSermon({ launchTour }) {
    if (loadingAction) return;
    setLoadingAction(launchTour ? "tour" : "sample");
    try {
      const result = await loadTourSermon();
      if (result?.sermonId && onOpenSermon) {
        onOpenSermon(result.sermonId);
        if (launchTour) {
          setTimeout(() => startTour(WORKSPACE_TOUR_STOPS, {
            onLeave: onLeaveTour,
            seenKey: "sf_tour_workspace_seen",
          }), 250);
        }
      }
    } catch (e) {
      console.error(launchTour ? "Failed to start workspace tour:" : "Failed to open sample sermon:", e);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <>
      <DashboardVerseCarousel />

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
              <div className="tile-eyebrow is-primary">Begin&nbsp;work</div>
              <h2 className="tile-title">
                Build a sermon.
              </h2>
              <p className="tile-blurb">
                From text to manuscript — exegesis, big idea, outline, delivery.
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
              <div className="tile-eyebrow">Plan&nbsp;ahead</div>
              <h3 className="tile-title">
                Build a series.
              </h3>
              <p className="tile-blurb">
                Plan a series end to end — passage range, arc, week-by-week.
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

            {/* EXPLORE — orientation paths for new pastors. */}
            <div className="dash-tile tile-secondary">
              <div className="tile-eyebrow">Look&nbsp;around</div>
              <h3 className="tile-title">Explore SermonForge.</h3>
              <div className="dash-rows">
                <ExploreRow
                  label="Take the guided tour"
                  meta="Five minutes · Walk-through"
                  loading={loadingAction === "tour"}
                  disabled={!!loadingAction}
                  onClick={() => openSampleSermon({ launchTour: true })}
                />
                <ExploreRow
                  label="Open a sample sermon"
                  meta="Romans 8:28–39 · Worked example"
                  loading={loadingAction === "sample"}
                  disabled={!!loadingAction}
                  onClick={() => openSampleSermon({ launchTour: false })}
                />
              </div>
            </div>
          </div>

          <DashboardPreacherQuote />
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
    <div className="dash-tile tile-secondary">
      <div className="tile-eyebrow">Resume&nbsp;work</div>
      <h3 className="tile-title">Where you left off.</h3>

      {isEmpty ? (
        <p className="tile-blurb" style={{ marginTop: "8px" }}>
          Nothing in flight. Start a sermon when you're ready.
        </p>
      ) : (
        <div className="dash-rows">
          {overdue.map((s) => (
            <ResumeRow key={s.id} sermon={s} onOpen={onOpenSermon} onDelete={onDeleteSermon} flagged />
          ))}
          {upcoming.map((s) => (
            <ResumeRow key={s.id} sermon={s} onOpen={onOpenSermon} onDelete={onDeleteSermon} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeRow({ sermon, onOpen, onDelete, flagged }) {
  return (
    <div
      className={`dash-row${flagged ? " is-overdue" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(sermon.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(sermon.id);
        }
      }}
    >
      <div className="dash-row-body">
        <div className="dash-row-title">{sermon.title || "Untitled"}</div>
        <div className="dash-row-meta">
          {flagged ? (
            <>
              <span className="flag">Delivered — mark complete</span>
              {sermon.date && <><span className="sep">·</span>{formatDate(sermon.date)}</>}
            </>
          ) : (
            <>
              {sermon.passage || "—"}
              {sermon.date && <><span className="sep">·</span>{formatDate(sermon.date)}</>}
              {sermon.series_title && <><span className="sep">·</span>{sermon.series_title}</>}
            </>
          )}
        </div>
      </div>
      <span className="dash-row-arr" aria-hidden="true">→</span>
      {onDelete && (
        <DeleteButton small onDelete={() => onDelete(sermon.id)} />
      )}
    </div>
  );
}

function ExploreRow({ label, meta, loading, disabled, onClick }) {
  return (
    <div
      className="dash-row"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onClick={() => { if (!disabled) onClick?.(); }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled && !loading ? 0.5 : 1,
      }}
    >
      <div className="dash-row-body">
        <div className="dash-row-title">{loading ? "Loading…" : label}</div>
        {meta && !loading && <div className="dash-row-meta">{meta}</div>}
      </div>
      <span className="dash-row-arr" aria-hidden="true">→</span>
    </div>
  );
}
