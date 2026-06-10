import { useState, useCallback, useEffect, Component, lazy, Suspense } from "react";
import { getApiKeyStatus, onDbWriteError, onDbWriteOk, flushDb, getSermonColumns, onFlushEdits, flushEditsDone, setUiTheme } from "./db/database";
import { runRegisteredFlushes } from "./utils/closeFlush";
import mapError from "./utils/mapError";
import { SERMON_COLUMNS } from "./constants/sermonColumns";
import { VIEW } from "./core/contracts";
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
    // Forward to the main-process log (app.log) so field crashes are
    // diagnosable — the console alone is closed DevTools on a user machine.
    try {
      window.electronAPI?.reportRendererError?.(
        "react-error-boundary",
        `${error?.message}\n${error?.stack || ""}\n${errorInfo?.componentStack || ""}`
      );
    } catch (_) { /* never throw from error reporting */ }
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
          {/* Never the raw JS error — it reads as alarming nonsense to a
              pastor, and the full detail already went to app.log via
              reportRendererError above. Answer the only question that matters
              in this moment: is my work safe? */}
          <p style={{ color: "var(--ink-ghost)", fontSize: "14px", maxWidth: "400px", textAlign: "center" }}>
            Your sermons are saved on this computer — nothing is lost. Reload to
            pick up where you left off.
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

// Wrap the whole app — including the loading state, SetupScreen, and the dev
// fixtures — in the ErrorBoundary. Previously the boundary only wrapped the
// post-setup tree, so a render throw on the FIRST screen a new user sees would
// unmount React to a blank window with no message. Now every path has the
// "Something went wrong / Reload App" fallback.
export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function AppInner() {
  const [keyReady, setKeyReady] = useState(null); // null=loading, false=needs setup, true=ready

  useEffect(() => {
    getApiKeyStatus()
      .then(r => setKeyReady(r?.configured === true))
      .catch(() => setKeyReady(false));
  }, []);

  // Close-time flush. main intercepts window close / app quit and asks the
  // renderer to flush debounced edits before proceeding (flushRendererEdits
  // in electron/main.js); ack with the nonce when every registered flusher
  // settles. The beforeunload listener covers reload (Ctrl+R / View > Reload):
  // fire-and-forget — the queued IPC write still reaches main even though the
  // promise never resolves before navigation. It must NOT set returnValue
  // (Electron treats that as cancel-the-close).
  useEffect(() => {
    const unsubscribe = onFlushEdits(async (nonce) => {
      try { await runRegisteredFlushes(); } finally { flushEditsDone(nonce); }
    });
    const onBeforeUnload = () => { runRegisteredFlushes(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      unsubscribe?.();
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
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
    // Fire-and-forget: main persists the theme to ui-prefs.json so the NEXT
    // launch's window + splash paint the right color from the first frame
    // (index.html's inline pre-paint script covers this process).
    try { setUiTheme(theme); } catch { /* preview stub / app quitting */ }
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

  // Persistent disk-write banner. main emits "db-write-error" only after two
  // consecutive flushDb failures, so a single transient OneDrive/AV lock that
  // self-recovers on the next debounced write does not pop a banner.
  const [writeError, setWriteError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // The event payload is the raw fs/SQLite message from main — translate it
    // before it reaches the banner (Mutation #5: errors speak in one voice).
    const unsubError = onDbWriteError((msg) => setWriteError(mapError(msg || "", "save")));
    const unsubOk = onDbWriteOk(() => setWriteError(null));
    return () => { unsubError?.(); unsubOk?.(); };
  }, []);

  const handleRetryFlush = useCallback(async () => {
    setRetrying(true);
    try {
      const result = await flushDb();
      if (result?.ok) setWriteError(null);
      else if (result?.error) setWriteError(mapError(result.error, "save"));
    } catch (e) {
      setWriteError(mapError(e, "save"));
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
    </ErrorBoundary>
  );
}
