import { useState, useCallback, useEffect, Component, lazy, Suspense } from "react";
import { getApiKeyStatus, getSermonColumns, onFlushEdits, flushEditsDone, setUiTheme } from "./db/database";
import { runRegisteredFlushes } from "./utils/closeFlush";
import { SERMON_COLUMNS } from "./constants/sermonColumns";
import { VIEW } from "./core/contracts";
import SetupScreen from "./components/SetupScreen";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import OneDriveWarning from "./components/OneDriveWarning";
import PrimaryButton from "./components/primitives/PrimaryButton";

const SermonList = lazy(() => import("./components/SermonList"));
const Calendar = lazy(() => import("./components/Calendar"));
const CompletedSermons = lazy(() => import("./components/CompletedSermons"));
const SermonWorkspace = lazy(() => import("./components/SermonWorkspace"));
const SermonWritingSurfaceFixture = lazy(() => import("./components/SermonWritingSurfaceFixture"));
const SermonWorkspaceFixture = lazy(() => import("./components/SermonWorkspaceFixture"));
const Planning = lazy(() => import("./components/Planning"));
const SeriesPlanner = lazy(() => import("./components/SeriesPlanner"));
const SeriesPlannerFixture = lazy(() => import("./components/SeriesPlannerFixture"));
const WhatIvePreached = lazy(() => import("./components/WhatIvePreached"));
const ArcFixture = lazy(() => import("./components/ArcFixture"));
const WhatIvePreachedFixture = lazy(() => import("./components/WhatIvePreachedFixture"));

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
  // Where Back from the workspace returns. Default (null) is the Dashboard; set
  // when a sermon is opened from the planner so Back returns to the series
  // instead of the Dashboard (audit M5).
  const [workspaceReturn, setWorkspaceReturn] = useState(null);
  // Workspace-originated delete (audit M3): the just-deleted sermon's display
  // summary, carried across the close-then-remount so Dashboard can render the
  // same "Deleted · Undo" row list-originated deletes already show. Dashboard
  // itself remounts on close (key={refreshKey}) and refetches from disk — by
  // then the sermon is tombstoned and absent from that fetch, so the notice
  // must travel as data, not as an id Dashboard could re-look-up.
  const [deletedSermonNotice, setDeletedSermonNotice] = useState(null);

  const openSermon = useCallback((id, hint = null) => {
    setOpenSermonId(id);
    setOpenSermonHint(hint);
    setCurrentView(VIEW.Workspace);
    // The delete notice is only for the dashboard the pastor lands on right
    // after a delete — opening any sermon (this one included) means he's
    // moved on, so a stale "Deleted · Undo" must not resurface on a later,
    // unrelated Dashboard visit.
    setDeletedSermonNotice(null);
  }, []);

  // Series Planner entry. The Planning list calls openPlanner(id) to open one
  // series into the planner (VIEW.SeriesPlanner). Kept separate from openSermon
  // — the planner is its own macro surface, reached only with a series id, never
  // from a bare sidebar click.
  const [plannerSeriesId, setPlannerSeriesId] = useState(null);
  const openPlanner = useCallback((id) => {
    setPlannerSeriesId(id);
    setCurrentView(VIEW.SeriesPlanner);
    setDeletedSermonNotice(null); // moved on — see openSermon
  }, []);

  // Opening a slot FROM the planner remembers the series so Back returns there
  // (audit M5). plannerSeriesId stays set across the workspace visit because
  // openSermon sets VIEW.Workspace directly (not via navigate()).
  const openSermonFromPlanner = useCallback((id) => {
    setWorkspaceReturn({ view: VIEW.SeriesPlanner, seriesId: plannerSeriesId });
    openSermon(id);
  }, [openSermon, plannerSeriesId]);

  const closeWorkspace = useCallback(() => {
    setOpenSermonId(null);
    setOpenSermonHint(null);
    setRefreshKey(k => k + 1);
    if (workspaceReturn?.view === VIEW.SeriesPlanner && workspaceReturn.seriesId) {
      setPlannerSeriesId(workspaceReturn.seriesId);
      setWorkspaceReturn(null);
      setCurrentView(VIEW.SeriesPlanner);
      return;
    }
    setWorkspaceReturn(null);
    setCurrentView(VIEW.Dashboard);
  }, [workspaceReturn]);

  // Close path for a workspace-originated delete (audit M3). Unlike an
  // ordinary Back, a delete always routes to the Dashboard — even for a
  // planner-opened sermon — because the "Deleted · Undo" notice only lives
  // there; honoring workspaceReturn here would make the affordance
  // unreachable for planner-opened sermons.
  const closeWorkspaceAfterDelete = useCallback((notice) => {
    setOpenSermonId(null);
    setOpenSermonHint(null);
    setWorkspaceReturn(null);
    setDeletedSermonNotice(notice);
    setRefreshKey(k => k + 1);
    setCurrentView(VIEW.Dashboard);
  }, []);

  const clearDeletedSermonNotice = useCallback(() => setDeletedSermonNotice(null), []);

  const navigate = useCallback((view) => {
    setCurrentView(view);
    if (view !== VIEW.Workspace) {
      setOpenSermonId(null);
      // Navigating away by any route other than workspace Back drops the
      // pending planner return target.
      setWorkspaceReturn(null);
    }
    // Leaving the planner clears the open series so re-entry from the Planning
    // list re-picks (and a bare sidebar click can't land on a stale planner).
    if (view !== VIEW.SeriesPlanner) {
      setPlannerSeriesId(null);
    }
    // A sidebar/menu navigation away from the Dashboard is also "moved on" —
    // see openSermon's comment. Without this, a delete notice shown once
    // could resurface on a later, unrelated Dashboard visit reached via
    // Sermons/Calendar/etc. and back.
    if (view !== VIEW.Dashboard) {
      setDeletedSermonNotice(null);
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

  // Series Planner preview — mounts the real SeriesPlanner against mock data
  // so the AI-free, workspace-styled planner can be verified in a browser
  // preview without Electron/SQLite. ?planner[=schedule|study-guide] (default
  // outline). Gated to dev so a packaged build never honors the query string (audit L15).
  const isPlannerFixture =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("planner");
  if (isPlannerFixture) {
    return (
      <Suspense fallback={null}>
        <SeriesPlannerFixture />
      </Suspense>
    );
  }

  // Series Arc preview — mounts the real Arc view against mock cross-series data
  // so the timeline + balance sidebar can be verified without Electron/SQLite.
  // Gated to dev so a packaged build never honors the query string. ?arc
  const isArcFixture =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("arc");
  if (isArcFixture) {
    return (
      <Suspense fallback={null}>
        <ArcFixture />
      </Suspense>
    );
  }

  // What I've Preached preview — the two-lens home (By book + By topic) against
  // mock data so both lenses + the tab switch can be verified without Electron.
  // Gated to dev so a packaged build never honors the query string. ?preached
  const isPreachedFixture =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("preached");
  if (isPreachedFixture) {
    return (
      <Suspense fallback={null}>
        <WhatIvePreachedFixture />
      </Suspense>
    );
  }

  if (keyReady === null) return null; // brief loading — avoids flash of setup screen
  if (keyReady === false) return <SetupScreen onComplete={() => setKeyReady(true)} />;

  // Views that render their OWN .topbar (and own full-bleed layout) must not
  // also get the app-chrome topbar + sidebar stacked on top of them. Both the
  // Workspace and the Series Planner own their chrome — gate both guards on
  // this one flag so adding the next own-chrome view can't reintroduce the
  // double-topbar bug that SeriesPlanner slipped through.
  const isOwnChrome =
    currentView === VIEW.Workspace || currentView === VIEW.SeriesPlanner;

  return (
    <ErrorBoundary>
    <OneDriveWarning />
    <div className="app-shell">
      {!isOwnChrome && (
        <Sidebar
          currentView={currentView}
          onNavigate={navigate}
          onOpenSermon={openSermon}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
      <div className="main-content">
        {!isOwnChrome && (
          <header className="topbar" aria-label="Topbar"></header>
        )}
        <Suspense fallback={null}>
        {currentView === VIEW.Dashboard && (
          <Dashboard
            key={refreshKey}
            onOpenSermon={openSermon}
            onNavigate={navigate}
            deletedSermonNotice={deletedSermonNotice}
            onClearDeletedSermonNotice={clearDeletedSermonNotice}
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
        {currentView === VIEW.Planning && (
          <Planning onOpenPlanner={openPlanner} />
        )}
        {currentView === VIEW.Arc && (
          <WhatIvePreached onOpenPlanner={openPlanner} onOpenSermon={openSermon} />
        )}
        {currentView === VIEW.SeriesPlanner && plannerSeriesId && (
          <SeriesPlanner
            seriesId={plannerSeriesId}
            onBack={() => navigate(VIEW.Planning)}
            onOpenSermon={openSermonFromPlanner}
          />
        )}
        {currentView === VIEW.Workspace && openSermonId && (
          // key forces a REMOUNT per sermon: the old instance's unmount
          // flush persists its own sermon and useDebounce's cleanup clears
          // any pending save timer — without it, series prev/next within
          // the 800ms debounce window could fire the old timer against the
          // newly loaded sermonRef and overwrite sermon A with B's content.
          <SermonWorkspace
            key={openSermonId}
            sermonId={openSermonId}
            onClose={closeWorkspace}
            onDeleted={closeWorkspaceAfterDelete}
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
