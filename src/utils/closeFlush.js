// closeFlush.js — registry of pending-edit flushers.
//
// Surfaces that hold edits behind a debounce (the workspace's 800ms autosave)
// register their flush function here while mounted. Three exit paths run the
// registry so the debounce window can never silently eat the last keystrokes:
//   1. main's window-close interception (ask/ack over "app-flush-edits" —
//      see flushRendererEdits in electron/main.js)
//   2. main's before-quit handler (same channel; covers menu quit / Cmd-Q,
//      where app.exit() skips window close events entirely)
//   3. window beforeunload (reload: fire-and-forget — the queued IPC write
//      still reaches main even though the promise never resolves before
//      navigation)
// Wiring for all three lives in src/App.jsx.

const flushers = new Set();

// Register a flush function. Returns the unregister function (usable directly
// as a useEffect cleanup).
export function registerFlush(fn) {
  flushers.add(fn);
  return () => flushers.delete(fn);
}

// Run every registered flusher. Never rejects — close paths must proceed
// whether or not a flush succeeded (failures are main's flushDb problem to
// report, not a reason to trap the window).
export function runRegisteredFlushes() {
  return Promise.allSettled(
    [...flushers].map((fn) => {
      try {
        return Promise.resolve(fn());
      } catch (e) {
        return Promise.reject(e);
      }
    })
  );
}
