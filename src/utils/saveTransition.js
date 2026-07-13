// saveTransition.js — the persistence-transition contract (renderer side).
//
// Every DELIBERATE transition away from editable work first flushes pending
// edits and resolves the attempt to exactly one of three results:
//
//   "saved"   — every pending edit is confirmed committed; the transition
//               proceeds silently.
//   "failed"  — a write is confirmed failed; the transition must NOT proceed
//               unless the pastor explicitly chooses to leave anyway
//               (Mutation #3 — failed saves are visible and retryable, never
//               silent). Ordinary navigation stays on the editable surface.
//   "unknown" — the attempt didn't settle inside the timeout. Uncertainty is
//               spoken as uncertainty (never dressed up as success), and the
//               surface must stay leavable through an explicit choice — the
//               app can never become permanently stuck behind a hung save.
//
// Renderer consumers: SermonWorkspace (Back, series prev/next),
// SeriesPlanner (Back, opening a sermon into the workspace), and the
// UnsavedLeaveConfirm dialog that renders the failed/unknown decision.
// The main process runs the same contract for its exit seams (window close,
// menu quit / Cmd-Q, updater restart) via electron/saveTransition.cjs — a
// CJS mirror of these constants (same pattern as contracts.cjs; parity is
// test-asserted in tests/unit/saveTransition.test.js).

export const SAVE_TRANSITION = Object.freeze({
  Saved: "saved",
  Failed: "failed",
  Unknown: "unknown",
});

// Map one flush attempt onto the contract. `attempt` is a function returning
// a promise (or plain value):
//   resolves exactly `false`  → "failed"   (persistUpdate / runRegisteredFlushes
//                                           signal failure with `false`)
//   rejects                   → "failed"
//   resolves anything else    → "saved"    (undefined counts — a void flusher
//                                           with nothing pending is a success)
//   unsettled after timeoutMs → "unknown"  (the attempt keeps running — the
//                                           write may still land; it just
//                                           can't be confirmed in time)
export async function resolveSaveTransition(attempt, timeoutMs = 2000) {
  let timer = null;
  try {
    return await Promise.race([
      Promise.resolve()
        .then(attempt)
        .then(
          (v) => (v === false ? SAVE_TRANSITION.Failed : SAVE_TRANSITION.Saved),
          () => SAVE_TRANSITION.Failed
        ),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(SAVE_TRANSITION.Unknown), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
