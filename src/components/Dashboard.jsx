import { useState } from "react";
import { loadTourSermon } from "../db/database";
import { useTour } from "../contexts/TourContext";
import { WORKSPACE_TOUR_STOPS } from "../tour/workspaceTourStops";
import NewSermonModal from "./NewSermonModal";

export default function Dashboard({ onOpenSermon, onNewSeries, onNavigate }) {
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
        setTimeout(() => startTour(WORKSPACE_TOUR_STOPS), 250);
      }
    } catch (e) {
      console.error("Failed to start workspace tour:", e);
    } finally {
      setTourLoading(false);
    }
  }

  const cardStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "22px 24px",
  };

  const titleStyle = {
    fontFamily: "'Playfair Display', serif",
    fontSize: "22px",
    fontWeight: "600",
    color: "var(--ink)",
    lineHeight: "1.2",
    margin: 0,
  };

  const blurbStyle = {
    fontFamily: "'Crimson Pro', serif",
    fontSize: "15px",
    lineHeight: "1.5",
    color: "var(--ink-mid)",
    margin: 0,
    flex: 1,
  };

  const actionRowStyle = {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: "4px",
  };

  return (
    <>
      {/* Top section — reserved for future use */}
      <div className="page-header" style={{ minHeight: "120px" }} />

      <div className="page-body">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "20px",
          }}
        >
          {/* Section 1 — Build a series */}
          <div className="card" style={cardStyle}>
            <h2 style={titleStyle}>Build a series.</h2>
            <p style={blurbStyle}>
              Plan a sermon series end to end. Set the passage range, big idea, and
              redemptive arc, then break it into weeks. Start fresh or build from a
              book study.
            </p>
            <div style={actionRowStyle}>
              <button
                className="btn-ghost"
                disabled
                title="Coming soon"
                style={{ fontSize: "13px", color: "var(--ink-soft)" }}
              >
                Take the tour
              </button>
              <button className="btn-primary" onClick={onNewSeries}>
                Build series
              </button>
            </div>
          </div>

          {/* Section 2 — Build a sermon */}
          <div className="card" style={cardStyle}>
            <h2 style={titleStyle}>Build a sermon.</h2>
            <p style={blurbStyle}>
              Walk a single sermon from text to manuscript. Exegesis, MPT and MPS,
              outline, functional elements, and delivery — the full Sermon Workspace,
              one step at a time.
            </p>
            <div style={actionRowStyle}>
              <button
                className="btn-ghost"
                onClick={handleStartWorkspaceTour}
                disabled={tourLoading}
                title="Open the guided tour of the Sermon Workspace"
                style={{ fontSize: "13px", color: "var(--ink-soft)" }}
              >
                {tourLoading ? "Loading…" : "Take the tour"}
              </button>
              <button className="btn-primary" onClick={() => setShowNewModal(true)}>
                Create sermon
              </button>
            </div>
          </div>

          {/* Section 3 — Quick outline builder */}
          <div className="card" style={cardStyle}>
            <h2 style={titleStyle}>Quick outline builder.</h2>
            <p style={blurbStyle}>
              Pull from your past sermons. Describe what you want to preach, and
              SermonForge synthesizes outline options grounded in your own voice.
            </p>
            <div style={actionRowStyle}>
              <button
                className="btn-primary"
                onClick={() => onNavigate && onNavigate("library")}
              >
                Open the Library
              </button>
            </div>
          </div>

          {/* Section 4 — Theology search */}
          <div className="card" style={cardStyle}>
            <h2 style={titleStyle}>Theology search.</h2>
            <p style={blurbStyle}>
              Search a curated theological library — Patristics, Reformed, Puritan —
              with citation per chunk.
            </p>
            <div style={actionRowStyle}>
              <button
                className="btn-ghost"
                disabled
                title="Coming soon"
                style={{ fontSize: "13px", color: "var(--ink-soft)" }}
              >
                Coming soon
              </button>
            </div>
          </div>
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
