import { useState, useCallback, useEffect, Component, lazy, Suspense } from "react";
import { createSeries, getApiKeyStatus, removeTourSermon, onDbWriteError, onDbWriteOk, flushDb } from "./db/database";
import { restoreMemoryFromBackup } from "./utils/memory";
import { TourProvider } from "./contexts/TourContext";
import TourOverlay from "./components/TourOverlay";
import SetupScreen from "./components/SetupScreen";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";

const SermonList = lazy(() => import("./components/SermonList"));
const Calendar = lazy(() => import("./components/Calendar"));
const Illustrations = lazy(() => import("./components/Illustrations"));
const Archive = lazy(() => import("./components/Archive"));
const Library = lazy(() => import("./components/Library"));
const Planning = lazy(() => import("./components/Planning"));
const SeriesPlanner = lazy(() => import("./components/SeriesPlanner"));
const SermonWorkspace = lazy(() => import("./components/SermonWorkspace"));

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
          gap: "16px", fontFamily: "'Crimson Pro', serif",
        }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)", fontSize: "24px" }}>
            Something went wrong
          </h2>
          <p style={{ color: "var(--ink-ghost)", fontSize: "14px", maxWidth: "400px", textAlign: "center" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload App
          </button>
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

  // One-shot restore of pastor memory from userData/memory-backup.json. No-op
  // when localStorage already has memory. Covers Electron major upgrades and
  // manual cache clears that would otherwise wipe accumulated style patterns.
  useEffect(() => {
    restoreMemoryFromBackup().catch((e) => console.error("[App] memory restore failed:", e));
  }, []);

  const [theme, setTheme] = useState(() => localStorage.getItem("sf-theme") || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sf-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === "light" ? "dark" : "light");
  }, []);

  const [currentView, setCurrentView] = useState("dashboard");
  const [openSermonId, setOpenSermonId] = useState(null);
  const [openSeriesId, setOpenSeriesId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [returnDestination, setReturnDestination] = useState("dashboard");
  const [returnSeriesId, setReturnSeriesId] = useState(null);

  const openSermon = useCallback((id, origin = "dashboard", seriesId = null) => {
    setOpenSermonId(id);
    setCurrentView("workspace");
    setReturnDestination(origin);
    setReturnSeriesId(seriesId);
  }, []);

  const closeWorkspace = useCallback(() => {
    const dest = returnDestination;
    const sid = returnSeriesId;
    setOpenSermonId(null);
    setReturnDestination("dashboard");
    setReturnSeriesId(null);
    setRefreshKey(k => k + 1);
    if (dest === "series-planner" && sid) {
      setOpenSeriesId(sid);
      setCurrentView("series-planner");
    } else {
      setCurrentView("dashboard");
    }
  }, [returnDestination, returnSeriesId]);

  const openPlanner = useCallback((id) => {
    setOpenSeriesId(id);
    setCurrentView("series-planner");
  }, []);

  const handleNewSeries = useCallback(async () => {
    const id = await createSeries({
      title: "Untitled Series",
      year: new Date().getFullYear(),
      status: "planning",
    });
    openPlanner(id);
  }, [openPlanner]);

  const closePlanner = useCallback(() => {
    setOpenSeriesId(null);
    setCurrentView("planning");
    setRefreshKey(k => k + 1);
  }, []);

  const navigate = useCallback((view) => {
    setCurrentView(view);
    if (view !== "workspace") {
      setOpenSermonId(null);
    }
    if (view !== "series-planner") setOpenSeriesId(null);
  }, []);

  // "Leave tour" — discard the tour sermon and return to the dashboard.
  const leaveTour = useCallback(async () => {
    try { await removeTourSermon(); } catch (e) { console.error("[leaveTour]", e); }
    setOpenSermonId(null);
    setOpenSeriesId(null);
    setReturnDestination("dashboard");
    setReturnSeriesId(null);
    setRefreshKey(k => k + 1);
    setCurrentView("dashboard");
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

  if (keyReady === null) return null; // brief loading — avoids flash of setup screen
  if (keyReady === false) return <SetupScreen onComplete={() => setKeyReady(true)} />;

  return (
    <ErrorBoundary>
    <TourProvider>
    {writeError && (
      <div className="write-error-banner" role="alert">
        <div className="write-error-banner-text">
          <strong>Last save did not reach disk.</strong>
          <span className="write-error-banner-detail">{writeError}</span>
        </div>
        <div className="write-error-banner-actions">
          <button
            className="btn-primary btn-sm"
            onClick={handleRetryFlush}
            disabled={retrying}
          >
            {retrying ? "Retrying…" : "Retry"}
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setWriteError(null)}
            disabled={retrying}
            title="Dismiss without retrying"
          >
            Dismiss
          </button>
        </div>
      </div>
    )}
    <div className="app-shell">
      <Sidebar
        currentView={currentView}
        onNavigate={navigate}
        onOpenSermon={openSermon}
        onOpenSeries={openPlanner}
        onNewSeries={handleNewSeries}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="main-content">
        <Suspense fallback={null}>
        {currentView === "dashboard" && (
          <Dashboard
            key={refreshKey}
            onOpenSermon={openSermon}
            onOpenSeries={openPlanner}
            onNewSeries={handleNewSeries}
            onNavigate={navigate}
            onLeaveTour={leaveTour}
          />
        )}
        {currentView === "sermons" && (
          <SermonList
            key={refreshKey}
            onOpenSermon={openSermon}
          />
        )}
        {currentView === "calendar" && (
          <Calendar onOpenSermon={openSermon} />
        )}
        {currentView === "illustrations" && (
          <Illustrations />
        )}
        {currentView === "archive" && (
          <Archive onOpenSermon={openSermon} />
        )}
        {currentView === "library" && (
          <Library onOpenSermon={openSermon} />
        )}
        {currentView === "planning" && (
          <Planning
            key={refreshKey}
            onOpenPlanner={openPlanner}
            onNewSeries={handleNewSeries}
          />
        )}
        {currentView === "series-planner" && openSeriesId && (
          <SeriesPlanner
            seriesId={openSeriesId}
            onClose={closePlanner}
            onOpenSermon={openSermon}
          />
        )}
        {currentView === "workspace" && openSermonId && (
          <SermonWorkspace
            sermonId={openSermonId}
            onClose={closeWorkspace}
            onOpenSeries={openPlanner}
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
