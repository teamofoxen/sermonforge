import { useState, useEffect } from "react";
import { getRecentSermons, getRecentSeries } from "../core/spine";
import { VIEW } from "../core/contracts";
import NewSermonModal from "./NewSermonModal.jsx";
import FeedbackModal from "./FeedbackModal.jsx";
import IconButton from "./primitives/IconButton";
import TextButton from "./primitives/TextButton";

const NAV_ITEMS = [
  {
    id: VIEW.Calendar,
    label: "Calendar",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
];

const WORKSPACE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CHEVRON_DOWN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, marginLeft: "auto", flexShrink: 0, opacity: 0.6 }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CHEVRON_UP = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, marginLeft: "auto", flexShrink: 0, opacity: 0.6 }}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

export default function Sidebar({ currentView, onNavigate, onOpenSermon, onOpenSeries, onNewSeries, theme, onToggleTheme }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [seriesDropdownOpen, setSeriesDropdownOpen] = useState(false);
  const [recentSermons, setRecentSermons] = useState([]);
  const [recentSeries, setRecentSeries] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);

  // State Contract #3 enforced at creation; no need to filter "Untitled Series"
  // here — that name will not be created going forward. Pre-existing rows from
  // before the contract landed still surface, by design (the user sees and
  // renames them rather than the sidebar hiding them).
  const visibleRecents = recentSermons.filter((s) => s.title?.trim());
  const visibleSeries = recentSeries.filter((s) => s.title?.trim());

  useEffect(() => {
    if (!dropdownOpen) return;
    getRecentSermons(5)
      .then(setRecentSermons)
      .catch((err) => console.error("[Sidebar] Failed to load recent sermons:", err));
  }, [dropdownOpen]);

  useEffect(() => {
    if (!seriesDropdownOpen) return;
    getRecentSeries(3)
      .then(setRecentSeries)
      .catch((err) => console.error("[Sidebar] Failed to load recent series:", err));
  }, [seriesDropdownOpen]);

  const [showNewModal, setShowNewModal] = useState(false);

  function handleNewSermon() {
    setDropdownOpen(false);
    setShowNewModal(true);
  }

  function handleNewSeries() {
    setSeriesDropdownOpen(false);
    if (onNewSeries) onNewSeries();
  }

  function handleRecentSermon(id) {
    setDropdownOpen(false);
    onOpenSermon(id);
  }

  function handleRecentSeries(id) {
    setSeriesDropdownOpen(false);
    if (onOpenSeries) onOpenSeries(id);
  }

  function handleNavigate(view) {
    setDropdownOpen(false);
    setSeriesDropdownOpen(false);
    onNavigate(view);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>SermonForge</h1>
        <p>Sermon Prep Workspace</p>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>

        {/* Dashboard */}
        <div
          className={`nav-item ${currentView === VIEW.Dashboard ? "active" : ""}`}
          onClick={() => handleNavigate(VIEW.Dashboard)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Dashboard
        </div>

        {/* Series Planning — inline dropdown */}
        <div
          className={`nav-item ${currentView === VIEW.Planning || currentView === VIEW.SeriesPlanner ? "active" : ""}`}
          onClick={() => setSeriesDropdownOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Series Planning
          {seriesDropdownOpen ? CHEVRON_UP : CHEVRON_DOWN}
        </div>

        {seriesDropdownOpen && (
          <div style={{ background: "rgba(0,0,0,0.2)", borderLeft: "3px solid var(--gold)", marginLeft: 0 }}>
            <div
              className="nav-item"
              onClick={handleNewSeries}
              style={{ paddingLeft: 36, fontSize: 13, color: "var(--gold-pale)" }}
            >
              + New Series
            </div>
            <div
              className="nav-item"
              onClick={() => handleNavigate(VIEW.Planning)}
              style={{ paddingLeft: 36, fontSize: 13 }}
            >
              All Series
            </div>
            {visibleSeries.length > 0 && (
              <div style={{ borderTop: "1px solid rgba(212,160,23,0.15)", margin: "2px 0" }} />
            )}
            {visibleSeries.map((s) => (
              <div
                key={s.id}
                className="nav-item"
                onClick={() => handleRecentSeries(s.id)}
                style={{ paddingLeft: 36, fontSize: 12, overflow: "hidden" }}
                title={s.title || "Untitled"}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                  {s.title || "Untitled"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Sermon Prep — inline dropdown */}
        <div
          className={`nav-item ${currentView === VIEW.Workspace || currentView === VIEW.Sermons ? "active" : ""}`}
          onClick={() => setDropdownOpen((o) => !o)}
        >
          {WORKSPACE_ICON}
          Sermon Prep
          {dropdownOpen ? CHEVRON_UP : CHEVRON_DOWN}
        </div>

        {dropdownOpen && (
          <div style={{ background: "rgba(0,0,0,0.2)", borderLeft: "3px solid var(--gold)", marginLeft: 0 }}>
            <div
              className="nav-item"
              onClick={handleNewSermon}
              style={{ paddingLeft: 36, fontSize: 13, color: "var(--gold-pale)" }}
            >
              + New Sermon
            </div>
            <div
              className="nav-item"
              onClick={() => handleNavigate(VIEW.Sermons)}
              style={{ paddingLeft: 36, fontSize: 13 }}
            >
              All Sermons
            </div>
            <div
              className="nav-item"
              onClick={() => handleNavigate(VIEW.CompletedSermons)}
              style={{ paddingLeft: 36, fontSize: 13 }}
            >
              Completed Sermons
            </div>
            {visibleRecents.length > 0 && (
              <div style={{ borderTop: "1px solid rgba(212,160,23,0.15)", margin: "2px 0" }} />
            )}
            {visibleRecents.map((s) => (
              <div
                key={s.id}
                className="nav-item"
                onClick={() => handleRecentSermon(s.id)}
                style={{ paddingLeft: 36, fontSize: 12, overflow: "hidden" }}
                title={s.title || "Untitled"}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                  {s.title || "Untitled"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Remaining nav items */}
        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${currentView === item.id ? "active" : ""}`}
            onClick={() => handleNavigate(item.id)}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>SermonForge v1.0</span>
          <IconButton
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(212,160,23,0.2)",
              borderRadius: 4,
              padding: "3px 7px",
              cursor: "pointer",
              color: "var(--ink-ghost)",
              fontSize: 13,
              lineHeight: 1,
            }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </IconButton>
        </div>
        <TextButton
          onClick={() => setShowFeedback(true)}
          style={{ padding: "4px 0 0" }}
        >
          Send feedback
        </TextButton>
      </div>

      {showFeedback && (
        <FeedbackModal
          currentView={currentView}
          onClose={() => setShowFeedback(false)}
        />
      )}

      {showNewModal && (
        <NewSermonModal
          onClose={() => setShowNewModal(false)}
          onCreated={(id) => {
            setShowNewModal(false);
            onOpenSermon(id);
          }}
        />
      )}
    </aside>
  );
}
