// saveTransition.cjs — the persistence-transition contract (main-process side).
//
// CJS mirror of src/utils/saveTransition.js's SAVE_TRANSITION constants (the
// ESM/CJS boundary — same pattern as contracts.cjs; parity is test-asserted
// in tests/unit/saveTransition.test.js). flushRendererEdits in main.js
// resolves a renderer flush to exactly one of:
//   "saved"   — the renderer acked with every registered flush committed
//   "failed"  — the renderer acked but a flush write failed
//   "unknown" — timeout / dead window / send failure: cannot be determined
//
// confirmExitOverSaveResult is the ONE decision every app-exit transition
// (window close, menu quit / Cmd-Q, updater restart) runs on that result:
//   saved          → proceed silently.
//   failed/unknown → if a live window remains to ask on, put the choice to
//                    the pastor: "Keep working" stays; the explicit
//                    "<verb> anyway" proceeds. Failure and uncertainty get
//                    distinct wording — a confirmed-failed write IS lost work
//                    if he leaves; an unconfirmed one may not be.
//   no live window → proceed. There is no renderer still holding edits and
//                    nobody to ask; the app can never become unclosable.
//
// `dialog` and `win` arrive as parameters so this decision is directly
// executable in tests (electron/main.js is not require-able outside Electron;
// main.js requires THIS module and runs it at all three seams — the wiring
// itself is tripwire-scanned, not executed, by the test suite).
const SAVE_TRANSITION = Object.freeze({
  Saved: "saved",
  Failed: "failed",
  Unknown: "unknown",
});

function confirmExitOverSaveResult({ result, win, dialog, anywayLabel, verbPhrase }) {
  if (result === SAVE_TRANSITION.Saved) return true;
  if (!win || win.isDestroyed()) return true;
  const failed = result === SAVE_TRANSITION.Failed;
  // If the dialog itself fails, proceed — a broken dialog must never make the
  // app unclosable. Spoken to the terminal/log, not swallowed.
  let choice = 1;
  try {
    choice = dialog.showMessageBoxSync(win, {
      type: "warning",
      buttons: ["Keep working", anywayLabel],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
      title: failed
        ? "Your last changes didn't save"
        : "Couldn't confirm your last changes saved",
      message: failed
        ? "SermonForge couldn't save your most recent edits."
        : "SermonForge couldn't confirm whether your most recent edits finished saving.",
      detail: failed
        ? `If you ${verbPhrase} now, those edits will be lost. Choose “Keep working” to stay and try again — the save indicator in the corner will keep retrying.`
        : `They may have saved — SermonForge just couldn't confirm it in time. Choose “Keep working” to stay and check the save indicator in the corner before you ${verbPhrase}.`,
    });
  } catch (err) {
    console.error("[save-transition] exit confirm dialog failed; proceeding", err);
    choice = 1;
  }
  return choice === 1;
}

module.exports = { SAVE_TRANSITION, confirmExitOverSaveResult };
