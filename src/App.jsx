import { useState, useCallback, useEffect, Component } from "react";
import { createSeries } from "./db/database";
import { DemoProvider } from "./contexts/DemoContext";
import DemoSplash from "./components/DemoSplash";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import SermonList from "./components/SermonList";
import Calendar from "./components/Calendar";
import Illustrations from "./components/Illustrations";
import Archive from "./components/Archive";
import Library from "./components/Library";
import Planning from "./components/Planning";
import SeriesPlanner from "./components/SeriesPlanner";
import SermonWorkspace from "./components/SermonWorkspace";

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
    if (view !== "workspace") setOpenSermonId(null);
    if (view !== "series-planner") setOpenSeriesId(null);
  }, []);

  return (
    <ErrorBoundary>
    <DemoProvider>
    <DemoSplash />
    <div className="app-shell">
      <Sidebar currentView={currentView} onNavigate={navigate} onOpenSermon={openSermon} theme={theme} onToggleTheme={toggleTheme} />
      <div className="main-content">
        {currentView === "dashboard" && (
          <Dashboard
            key={refreshKey}
            onOpenSermon={openSermon}
            onOpenSeries={openPlanner}
            onNewSeries={handleNewSeries}
            onNavigate={navigate}
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
          <Library />
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
      </div>
    </div>
    </DemoProvider>
    </ErrorBoundary>
  );
}
