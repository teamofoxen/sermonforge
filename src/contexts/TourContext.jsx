import { createContext, useContext, useState, useCallback, useMemo } from "react";

// TourContext — owns the tour cursor and the "desired UI state" each stop wants.
//
// Stops are plain objects (see src/tour/workspaceTourStops.js) shaped like:
//   {
//     id:        string,                 // stable identifier, used for keying
//     anchorId:  string,                 // matches data-tour-id on the target element
//     title:     string,                 // bold heading on the callout card
//     body:      string,                 // body copy below the heading
//     prerequisites?: {
//       tab?:           "study" | "outline" | "manuscript" | "delivery",
//       studyStep?:     number,
//       studySubPhase?: number,
//       drawerOpen?:    boolean,
//       piOpen?:        boolean,
//     },
//   }
//
// Components like SermonWorkspace and StudyTab observe `desiredUi` and align their
// own state when the tour is active. The orchestrator never reaches into their
// setters directly — it only declares what the next stop needs.

const TourContext = createContext(null);

const STORAGE_KEY = "sf_tour_workspace_seen";

export function TourProvider({ children, onLeave }) {
  const [active, setActive]   = useState(false);
  const [stops, setStops]     = useState([]);
  const [index, setIndex]     = useState(0);

  const start = useCallback((nextStops) => {
    if (!Array.isArray(nextStops) || nextStops.length === 0) return;
    setStops(nextStops);
    setIndex(0);
    setActive(true);
  }, []);

  const exit = useCallback(() => {
    setActive(false);
    setStops([]);
    setIndex(0);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= stops.length - 1) {
        // Last stop: complete and exit.
        try { localStorage.setItem(STORAGE_KEY, "1"); } catch (_) {}
        setActive(false);
        setStops([]);
        return 0;
      }
      return i + 1;
    });
  }, [stops.length]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Leave the tour: tear down the tour sermon and return to the dashboard.
  const leave = useCallback(() => {
    exit();
    if (typeof onLeave === "function") {
      try { onLeave(); } catch (e) { console.error("[tour leave]", e); }
    }
  }, [exit, onLeave]);

  const complete = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (_) {}
    exit();
  }, [exit]);

  const currentStop = active && stops[index] ? stops[index] : null;
  const desiredUi   = currentStop?.prerequisites || null;

  const value = useMemo(() => ({
    active,
    stops,
    index,
    currentStop,
    desiredUi,
    start,
    next,
    prev,
    leave,
    complete,
  }), [active, stops, index, currentStop, desiredUi, start, next, prev, leave, complete]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    // Outside provider — return inert defaults so consumers don't have to null-guard.
    return {
      active: false, stops: [], index: 0, currentStop: null, desiredUi: null,
      start: () => {}, next: () => {}, prev: () => {}, leave: () => {}, complete: () => {},
    };
  }
  return ctx;
}
