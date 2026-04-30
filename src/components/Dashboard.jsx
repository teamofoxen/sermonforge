import { useState } from "react";
import { loadTourSermon } from "../core/spine";
import { useTour } from "../contexts/TourContext";
import { WORKSPACE_TOUR_STOPS } from "../tour/workspaceTourStops";
import NewSermonModal from "./NewSermonModal";
import DashboardHeader from "./DashboardHeader";
import DashboardChurchHistory from "./DashboardChurchHistory";

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
                <button
                  className="btn-hero"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewModal(true);
                  }}
                >
                  Build sermon <ArrowRightIcon />
                </button>
                <button
                  type="button"
                  className="tile-meta tile-meta-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartWorkspaceTour();
                  }}
                  disabled={tourLoading}
                >
                  {tourLoading ? "Loading…" : "or take the guided tour →"}
                </button>
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

            {/* THEOLOGY SEARCH */}
            <div className="dash-tile is-disabled" aria-disabled="true">
              <div className="tile-eyebrow tile-eyebrow-soft">
                <span>Coming&nbsp;soon</span>
              </div>
              <h3 className="tile-title">Theology search</h3>
              <p className="tile-blurb">
                Search a curated theological library — Patristics, Reformed, Puritan —
                with citation per chunk.
              </p>
              <span className="tile-link tile-link-muted">
                Notify me <ArrowRightIcon />
              </span>
            </div>
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
