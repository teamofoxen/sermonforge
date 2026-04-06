import { useState, useEffect } from "react";
import { getRecentSermons, createSermon } from "../db/database.js";
import FeedbackModal from "./FeedbackModal.jsx";

const NAV_ITEMS = [
  {
    id: "calendar",
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

export default function Sidebar({ currentView, onNavigate, onOpenSermon }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentSermons, setRecentSermons] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const visibleRecents = recentSermons.filter((s) => s.title?.trim() && s.stage !== "planning");

  useEffect(() => {
    if (!dropdownOpen) return;
    getRecentSermons(3)
      .then(setRecentSermons)
      .catch((err) => console.error("[Sidebar] Failed to load recent sermons:", err));
  }, [dropdownOpen]);

  async function handleNewSermon() {
    try {
      // main.js generates the UUID internally and returns it — do not pass a local id.
      const id = await createSermon({ title: "", passage: "", stage: "planning", is_one_off: 1 });
      setDropdownOpen(false);
      onOpenSermon(id);
    } catch (err) {
      console.error("[Sidebar] Failed to create sermon:", err);
    }
  }

  function handleRecentSermon(id) {
    setDropdownOpen(false);
    onOpenSermon(id);
  }

  function handleNavigate(view) {
    setDropdownOpen(false);
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
          className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}
          onClick={() => handleNavigate("dashboard")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Dashboard
        </div>

        {/* Series Planning */}
        <div
          className={`nav-item ${currentView === "planning" || currentView === "series-planner" ? "active" : ""}`}
          onClick={() => handleNavigate("planning")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Series Planning
        </div>

        {/* Sermon Prep — inline dropdown */}
        <div
          className={`nav-item ${currentView === "workspace" ? "active" : ""}`}
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
        <div>SermonForge v1.0</div>
        <button
          onClick={() => setShowFeedback(true)}
          style={{
            background: "none",
            border: "none",
            padding: "4px 0 0",
            cursor: "pointer",
            fontFamily: "'Crimson Pro', serif",
            fontSize: 12,
            color: "var(--ink-ghost)",
            textDecoration: "none",
          }}
        >
          Send feedback
        </button>
      </div>

      {showFeedback && (
        <FeedbackModal
          currentView={currentView}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </aside>
  );
}
