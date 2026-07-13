import { describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";

const requireCjs = createRequire(import.meta.url);
const { SAVE_TRANSITION, confirmExitOverSaveResult } = requireCjs("../../electron/saveTransition.cjs");

// The shared exit decision every main-process exit seam runs — window close,
// menu Quit / Cmd-Q (before-quit), and updater restart all call
// confirmExitOverSaveResult on the flushRendererEdits result (the wiring is
// tripwire-scanned in exit-seam-wiring.test.ts).
//
// HONEST SCOPE: these tests execute the REAL production decision module
// (electron/saveTransition.cjs — required verbatim, no mirror), driving it
// with a stub Electron `dialog` and window handle. They do NOT boot Electron:
// the lifecycle events themselves (close / before-quit firing) have no
// harness-executable seam yet (that extraction is Session 2's work), so
// nothing here claims full Electron lifecycle coverage.
//
// The decision table (the persistence-transition contract):
//   saved            → proceed silently, no dialog.
//   failed + window  → ask; "Keep working" stays, "<verb> anyway" proceeds.
//   unknown + window → ask with DISTINCT uncertainty wording (never dressed
//                      up as success); same two choices — explicitly closable.
//   no live window   → proceed (nobody to ask, nothing still holding edits —
//                      the app can never become unclosable).
//   dialog throws    → proceed (a broken dialog must never trap the exit).

function fakeWin({ destroyed = false } = {}) {
  return { isDestroyed: () => destroyed };
}

function fakeDialog(choice: number) {
  const calls: any[] = [];
  return {
    calls,
    showMessageBoxSync: (_win: unknown, opts: any) => {
      calls.push(opts);
      return choice;
    },
  };
}

describe("confirmExitOverSaveResult — the shared exit decision (production module)", () => {
  it('"saved" proceeds silently — no dialog (successful transitions behave as before)', () => {
    const dialog = fakeDialog(0);
    const proceed = confirmExitOverSaveResult({
      result: SAVE_TRANSITION.Saved,
      win: fakeWin(),
      dialog,
      anywayLabel: "Close anyway",
      verbPhrase: "close",
    });
    expect(proceed).toBe(true);
    expect(dialog.calls).toHaveLength(0);
  });

  it('"failed" + live window asks; "Keep working" (0) stays', () => {
    const dialog = fakeDialog(0);
    const proceed = confirmExitOverSaveResult({
      result: SAVE_TRANSITION.Failed,
      win: fakeWin(),
      dialog,
      anywayLabel: "Quit anyway",
      verbPhrase: "quit",
    });
    expect(proceed).toBe(false);
    expect(dialog.calls).toHaveLength(1);
    // Failed wording: a confirmed-failed write IS lost work if he leaves.
    expect(dialog.calls[0].title).toBe("Your last changes didn't save");
    expect(dialog.calls[0].buttons).toEqual(["Keep working", "Quit anyway"]);
    // Staying is the default AND the escape-key answer.
    expect(dialog.calls[0].defaultId).toBe(0);
    expect(dialog.calls[0].cancelId).toBe(0);
  });

  it('"failed" + live window: the explicit "anyway" choice (1) proceeds — the window stays closable', () => {
    const dialog = fakeDialog(1);
    const proceed = confirmExitOverSaveResult({
      result: SAVE_TRANSITION.Failed,
      win: fakeWin(),
      dialog,
      anywayLabel: "Close anyway",
      verbPhrase: "close",
    });
    expect(proceed).toBe(true);
  });

  it('"unknown" + live window asks with DISTINCT uncertainty wording — a timeout must not masquerade as success', () => {
    const dialog = fakeDialog(0);
    const proceed = confirmExitOverSaveResult({
      result: SAVE_TRANSITION.Unknown,
      win: fakeWin(),
      dialog,
      anywayLabel: "Close anyway",
      verbPhrase: "close",
    });
    expect(proceed).toBe(false); // pastor chose to keep working
    expect(dialog.calls).toHaveLength(1);
    expect(dialog.calls[0].title).toBe("Couldn't confirm your last changes saved");
    // Uncertainty is spoken as uncertainty — neither the failed wording nor silence.
    expect(dialog.calls[0].message).toMatch(/couldn't confirm/i);
    expect(dialog.calls[0].detail).toMatch(/may have saved/i);
  });

  it('"unknown" remains explicitly closable through the "anyway" choice', () => {
    const dialog = fakeDialog(1);
    const proceed = confirmExitOverSaveResult({
      result: SAVE_TRANSITION.Unknown,
      win: fakeWin(),
      dialog,
      anywayLabel: "Close anyway",
      verbPhrase: "close",
    });
    expect(proceed).toBe(true);
  });

  it("no window / destroyed window proceeds without asking — shutdown can never be trapped", () => {
    const dialog = fakeDialog(0); // would answer "stay" if it were ever shown
    expect(confirmExitOverSaveResult({
      result: SAVE_TRANSITION.Failed, win: null, dialog,
      anywayLabel: "Quit anyway", verbPhrase: "quit",
    })).toBe(true);
    expect(confirmExitOverSaveResult({
      result: SAVE_TRANSITION.Unknown, win: fakeWin({ destroyed: true }), dialog,
      anywayLabel: "Quit anyway", verbPhrase: "quit",
    })).toBe(true);
    expect(dialog.calls).toHaveLength(0);
  });

  it("a throwing dialog proceeds (spoken to the log, never trapping the exit)", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const proceed = confirmExitOverSaveResult({
        result: SAVE_TRANSITION.Failed,
        win: fakeWin(),
        dialog: { showMessageBoxSync: () => { throw new Error("dialog gone"); } },
        anywayLabel: "Close anyway",
        verbPhrase: "close",
      });
      expect(proceed).toBe(true);
      expect(errSpy).toHaveBeenCalled(); // not swallowed silently
    } finally {
      errSpy.mockRestore();
    }
  });
});
