import { useState, useCallback, useEffect, Component, lazy, Suspense } from "react";
import { getApiKeyStatus, onDbWriteError, onDbWriteOk, flushDb, getSermonColumns } from "./db/database";
import { removeTourSermon } from "./core/spine";
import { SERMON_COLUMNS } from "./constants/sermonColumns";
import { VIEW } from "./core/contracts";
import { TourProvider } from "./contexts/TourContext";
import TourOverlay from "./components/TourOverlay";
import SetupScreen from "./components/SetupScreen";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import OneDriveWarning from "./components/OneDriveWarning";
import PrimaryButton from "./components/primitives/PrimaryButton";
import SecondaryButton from "./components/primitives/SecondaryButton";

const SermonList = lazy(() => import("./components/SermonList"));
const Calendar = lazy(() => import("./components/Calendar"));
const CompletedSermons = lazy(() => import("./components/CompletedSermons"));
const SermonWorkspace = lazy(() => import("./components/SermonWorkspace"));
const SermonWritingSurfaceFixture = lazy(() => import("./components/SermonWritingSurfaceFixture"));
const SermonWorkspaceFixture = lazy(() => import("./components/SermonWorkspaceFixture"));

function SeriesPlannerComingSoon() {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 32px" }}>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>
          Series planner — coming soon
        </h1>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ink-soft)", lineHeight: 1.6 }}>
          Series planning is in development and will return in a later release. For now, plan one sermon at a time from the Dashboard.
        </p>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("SermonForge error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100vh", background: "var(--parchment)",
          gap: "16px", fontFamily: "var(--font-serif)",
        }}>
          <h2 style={{ fontFamily: "var(--font-serif)", color: "var(--ink)", fontSize: "24px" }}>
            Something went wrong
          </h2>
          <p style={{ color: "var(--ink-ghost)", fontSize: "14px", maxWidth: "400px", textAlign: "center" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <PrimaryButton onClick={() => window.location.reload()}>
            Reload App
          </PrimaryButton>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [keyReady, setKeyReady] = useState(null); // null=loading, false=needs setup, true=ready

  useEffect(() => {
    getApiKeyStatus()
      .then(r => setKeyReady(r?.configured === true))
      .catch(() => setKeyReady(false));
  }, []);

  // Schema-contract guard: assert the renderer SERMON_COLUMNS mirror still
  // matches the main-side allowlist. Drift here re-introduces the silent-save
  // bug class — buildUpdate rejects unknown columns, the renderer's optimistic
  // setSermon makes it look saved, edits never reach disk. Logs only; the
  // main-side allowlist remains the security boundary. Skipped in browser-only
  // preview (no Electron preload) — the IPC stub returns [] and would always
  // false-flag drift.
  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    getSermonColumns()
      .then((res) => {
        const columns = Array.isArray(res?.columns) ? res.columns : null;
        if (!columns) return; // stub or unexpected shape — nothing to compare
        const main = new Set(columns);
        const missing = [...main].filter(c => !SERMON_COLUMNS.has(c));
        const extra  = [...SERMON_COLUMNS].filter(c => !main.has(c));
        if (missing.length || extra.length) {
          console.error(
            "[schema-contract] renderer SERMON_COLUMNS drifted from main allowlist.",
            { missingFromRenderer: missing, extraInRenderer: extra }
          );
        }
      })
      .catch((e) => console.error("[schema-contract] check failed:", e));
  }, []);

  const [theme, setTheme] = useState(() => localStorage.getItem("sf-theme") || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sf-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === "light" ? "dark" : "light");
  }, []);

  const [currentView, setCurrentView] = useState(VIEW.Dashboard);
  const [openSermonId, setOpenSermonId] = useState(null);
  // Optional navigation hint from a search result — { stage?, subPhase?,
  // openNotebook? }. Consumed once by SermonWorkspace on the next mount,
  // then cleared. Plain object instead of a context to keep the flow
  // explicit at every hop.
  const [openSermonHint, setOpenSermonHint] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const openSermon = useCallback((id, hint = null) => {
    setOpenSermonId(id);
    setOpenSermonHint(hint);
    setCurrentView(VIEW.Workspace);
  }, []);

  const closeWorkspace = useCallback(() => {
    setOpenSermonId(null);
    setOpenSermonHint(null);
    setRefreshKey(k => k + 1);
    setCurrentView(VIEW.Dashboard);
  }, []);

  const navigate = useCallback((view) => {
    setCurrentView(view);
    if (view !== VIEW.Workspace) {
      setOpenSermonId(null);
    }
  }, []);

  const leaveTour = useCallback(async () => {
    try { await removeTourSermon(); } catch (e) { console.error("[leaveTour]", e); }
    setOpenSermonId(null);
    setRefreshKey(k => k + 1);
    setCurrentView(VIEW.Dashboard);
  }, []);

  // Persistent disk-write banner. main emits "db-write-error" only after two
  // consecutive flushDb failures, so a single transient OneDrive/AV lock that
  // self-recovers on the next debounced write does not pop a banner.
  const [writeError, setWriteError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const unsubError = onDbWriteError((msg) => setWriteError(msg || "Unknown error"));
    const unsubOk = onDbWriteOk(() => setWriteError(null));
    return () => { unsubError?.(); unsubOk?.(); };
  }, []);

  const handleRetryFlush = useCallback(async () => {
    setRetrying(true);
    try {
      const result = await flushDb();
      if (result?.ok) setWriteError(null);
      else if (result?.error) setWriteError(result.error);
    } catch (e) {
      setWriteError(e?.message || "Retry failed");
    } finally {
      setRetrying(false);
    }
  }, []);

  // Invisible-system writing-surface preview. ?surface=writing bypasses the
  // dashboard, sidebar, and DB so the surface can be iterated in a browser
  // preview against fixture data without the real workspace shell.
  const isWritingPreview =
    typeof window !== "undefined" &&
    // eslint-disable-next-line sermonforge/canonical-stage-name -- URL route name, not a stage status
    new URLSearchParams(window.location.search).get("surface") === "writing";
  if (isWritingPreview) {
    return (
      <Suspense fallback={null}>
        <SermonWritingSurfaceFixture />
      </Suspense>
    );
  }

  // Workspace integration preview — mounts the real SermonWorkspace
  // component against mock sermon data so D2c's writing-surface +
  // map + threshold-orientation wiring can be verified across the
  // three scenarios the user flagged (empty / populated / at-handoff).
  // ?workspace=empty | populated | at-handoff
  const isWorkspaceFixture =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("workspace");
  if (isWorkspaceFixture) {
    return (
      <Suspense fallback={null}>
        <SermonWorkspaceFixture />
      </Suspense>
    );
  }

  if (keyReady === null) return null; // brief loading — avoids flash of setup screen
  if (keyReady === false) return <SetupScreen onComplete={() => setKeyReady(true)} />;

  return (
    <ErrorBoundary>
    <TourProvider>
    <OneDriveWarning />
    {writeError && (
      <div className="write-error-banner" role="alert">
        <div className="write-error-banner-text">
          <strong>Last save did not reach disk.</strong>
          <span className="write-error-banner-detail">{writeError}</span>
        </div>
        <div className="write-error-banner-actions">
          <PrimaryButton
            size="sm"
            onClick={handleRetryFlush}
            disabled={retrying}
          >
            {retrying ? "Saving…" : "Retry"}
          </PrimaryButton>
          <SecondaryButton
            size="sm"
            onClick={() => setWriteError(null)}
            disabled={retrying}
            title="Dismiss without retrying"
          >
            Dismiss
          </SecondaryButton>
        </div>
      </div>
    )}
    <div className="app-shell">
      {currentView !== VIEW.Workspace && (
        <Sidebar
          currentView={currentView}
          onNavigate={navigate}
          onOpenSermon={openSermon}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
      <div className="main-content">
        {currentView !== VIEW.Workspace && (
          <header className="topbar" aria-label="Topbar"></header>
        )}
        <Suspense fallback={null}>
        {currentView === VIEW.Dashboard && (
          <Dashboard
            key={refreshKey}
            onOpenSermon={openSermon}
            onLeaveTour={leaveTour}
          />
        )}
        {currentView === VIEW.Sermons && (
          <SermonList
            key={refreshKey}
            onOpenSermon={openSermon}
          />
        )}
        {currentView === VIEW.Calendar && (
          <Calendar onOpenSermon={openSermon} />
        )}
        {currentView === VIEW.CompletedSermons && (
          <CompletedSermons onOpenSermon={openSermon} />
        )}
        {currentView === VIEW.Planning && <SeriesPlannerComingSoon />}
        {currentView === VIEW.SeriesPlanner && <SeriesPlannerComingSoon />}
        {currentView === VIEW.Workspace && openSermonId && (
          <SermonWorkspace
            sermonId={openSermonId}
            onClose={closeWorkspace}
            onOpenSermon={openSermon}
            navHint={openSermonHint}
          />
        )}
        </Suspense>
      </div>

    </div>
    <TourOverlay />
    </TourProvider>
    </ErrorBoundary>
  );
}
