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

// Run every registered flusher and report whether they all SUCCEEDED. Never
// rejects (close paths must always be able to proceed), but it no longer hides
// failure: a flusher that rejects, or that resolves `false` to signal a failed
// write (see useWorkspaceSave's persistUpdate), makes `ok` false. The caller
// carries `ok` through the close ack so main can block/prompt instead of
// silently dropping the pastor's last edits (Mutation #3 — failed saves are
// visible and retryable, never silent). Flushers that resolve any non-`false`
// value (including undefined) count as success — only an explicit failure gates
// the close.
export async function runRegisteredFlushes() {
  const results = await Promise.allSettled(
    [...flushers].map((fn) => Promise.resolve().then(fn))
  );
  const ok = results.every((r) => r.status === "fulfilled" && r.value !== false);
  return { ok };
}
