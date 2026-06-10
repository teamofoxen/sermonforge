import { useState, useEffect } from "react";
import { getRecentSermons } from "../core/spine";
import { VIEW } from "../core/contracts";
import NewSermonModal from "./NewSermonModal.jsx";
import FeedbackForm from "./FeedbackForm.jsx";
import EsvKeyModal from "./EsvKeyModal.jsx";
import IconButton from "./primitives/IconButton";
import TextButton from "./primitives/TextButton";
import Logo from "./Logo.jsx";

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

export default function Sidebar({ currentView, onNavigate, onOpenSermon, theme, onToggleTheme }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentSermons, setRecentSermons] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showEsvModal, setShowEsvModal] = useState(false);

  const visibleRecents = recentSermons.filter((s) => s.title?.trim());

  useEffect(() => {
    if (!dropdownOpen) return;
    getRecentSermons(5)
      .then(setRecentSermons)
      .catch((err) => console.error("[Sidebar] Failed to load recent sermons:", err));
  }, [dropdownOpen]);

  const [showNewModal, setShowNewModal] = useState(false);

  function handleNewSermon() {
    setDropdownOpen(false);
    setShowNewModal(true);
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
        <Logo size="md" tone="gold" />
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
              Preached Sermons
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
          Send feedback…
        </TextButton>
        <TextButton
          onClick={() => setShowEsvModal(true)}
          style={{ padding: "2px 0 0" }}
        >
          Add or update ESV key…
        </TextButton>
      </div>

      {showFeedback && (
        <FeedbackForm
          onClose={() => setShowFeedback(false)}
        />
      )}

      {showEsvModal && (
        <EsvKeyModal onClose={() => setShowEsvModal(false)} />
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
