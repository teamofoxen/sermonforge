import { createContext, useContext, useState, useCallback, useMemo } from "react";

// TourContext — owns the tour cursor and the "desired UI state" each stop wants.
//
// Each tour self-describes at launch:
//   start(stops, { onLeave, seenKey })
// The engine knows nothing about which tour is running. Tour-specific surfaces
// (e.g. SermonWorkspace, SeriesPlanner) consume `desiredUi` and align their
// own state when the tour is active. The orchestrator never reaches into their
// setters directly — it only declares what the next stop needs.
//
// Stops are plain objects shaped like:
//   {
//     id:        string,                 // stable identifier, used for keying
//     anchorId:  string,                 // matches data-tour-id on the target element
//     title:     string,                 // bold heading on the callout card
//     body:      string,                 // body copy below the heading
//     prerequisites?: { ... },           // tour-specific shape
//   }

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const [active, setActive]   = useState(false);
  const [stops, setStops]     = useState([]);
  const [index, setIndex]     = useState(0);
  const [onLeave, setOnLeave] = useState(null);
  const [seenKey, setSeenKey] = useState(null);

  const start = useCallback((nextStops, options = {}) => {
    if (!Array.isArray(nextStops) || nextStops.length === 0) return;
    const cb  = typeof options.onLeave === "function" ? options.onLeave : null;
    const key = typeof options.seenKey === "string" ? options.seenKey : null;
    setStops(nextStops);
    setIndex(0);
    setOnLeave(() => cb);
    setSeenKey(key);
    setActive(true);
  }, []);

  const exit = useCallback(() => {
    setActive(false);
    setStops([]);
    setIndex(0);
    setOnLeave(null);
    setSeenKey(null);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= stops.length - 1) {
        // Last stop: complete and exit.
        if (seenKey) {
          try { localStorage.setItem(seenKey, "1"); } catch (_) {}
        }
        setActive(false);
        setStops([]);
        setOnLeave(null);
        setSeenKey(null);
        return 0;
      }
      return i + 1;
    });
  }, [stops.length, seenKey]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Leave the tour: invoke the launcher's cleanup callback, then tear down state.
  const leave = useCallback(() => {
    const cb = onLeave;
    exit();
    if (typeof cb === "function") {
      try { cb(); } catch (e) { console.error("[tour leave]", e); }
    }
  }, [exit, onLeave]);

  const complete = useCallback(() => {
    if (seenKey) {
      try { localStorage.setItem(seenKey, "1"); } catch (_) {}
    }
    exit();
  }, [exit, seenKey]);

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
