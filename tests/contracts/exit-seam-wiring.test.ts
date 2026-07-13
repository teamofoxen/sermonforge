import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// Exit-seam WIRING tripwire — electron/main.js.
//
// HONEST SCOPE: electron/main.js is not require-able outside Electron, so
// this file scans its SOURCE. It proves the three exit seams are WIRED to the
// production decision module (electron/saveTransition.cjs — whose behavior is
// executed for real in exit-transition-decision.test.ts); it does not execute
// the Electron lifecycle. Do not read these as lifecycle-execution tests —
// extracting an executable main-process seam is Session 2's work, and until
// then a packaged build-and-run smoke covers the live events.
//
// What must hold (the persistence-transition contract at the exit seams):
//   • flushRendererEdits resolves the contract tri-state, not ad-hoc strings.
//   • window close consults confirmExitOverSaveResult ("Close anyway").
//   • before-quit captures the flush result, consults the decision
//     ("Quit anyway"), and can ABORT the quit (re-arming _isQuitting) —
//     it used to await the flush and ignore the result.
//   • updater-restart consults the decision ("Restart anyway") BEFORE
//     restartAndInstall and can return without restarting — it used to
//     flush, ignore the result, and restart unconditionally.

const mainSrc = fs.readFileSync(
  path.resolve(__dirname, "../../electron/main.js"),
  "utf8"
);

function sliceBetween(src: string, startMarker: string, endMarker: string): string {
  const start = src.indexOf(startMarker);
  expect(start, `marker not found: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = src.indexOf(endMarker, start);
  expect(end, `end marker not found after ${startMarker}: ${endMarker}`).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("exit-seam wiring (source tripwire, NOT lifecycle execution)", () => {
  it("main.js requires the production decision module", () => {
    expect(mainSrc).toMatch(/require\("\.\/saveTransition\.cjs"\)/);
    expect(mainSrc).toContain("confirmExitOverSaveResult");
  });

  it("flushRendererEdits resolves the contract tri-state (saved/failed/unknown)", () => {
    const block = sliceBetween(mainSrc, "function flushRendererEdits", "function createWindow");
    expect(block).toContain("SAVE_TRANSITION.Unknown");
    expect(block).toContain("SAVE_TRANSITION.Failed");
    expect(block).toContain("SAVE_TRANSITION.Saved");
  });

  it("window close consults the shared exit decision with the Close-anyway choice", () => {
    const block = sliceBetween(mainSrc, 'mainWindow.on("close"', "function loadAppContent");
    expect(block).toContain("confirmExitOverSaveResult");
    expect(block).toContain('anywayLabel: "Close anyway"');
    // The stay path exists: a non-proceed decision returns without closing.
    expect(block).toMatch(/if \(!proceed\) return/);
  });

  it("before-quit captures the flush result, consults the decision, and can ABORT the quit", () => {
    const block = sliceBetween(mainSrc, 'app.on("before-quit"', 'app.on("window-all-closed"');
    // The result is captured, not discarded (the old `try { await ... } catch`
    // shape awaited and ignored it).
    expect(block).toMatch(/flushResult = await flushRendererEdits\(/);
    expect(block).toContain("confirmExitOverSaveResult");
    expect(block).toContain('anywayLabel: "Quit anyway"');
    // The abort path re-arms the quit guard so the next quit re-runs the flush.
    expect(block).toMatch(/_isQuitting = false/);
  });

  it("updater-restart consults the decision BEFORE restartAndInstall and can return without restarting", () => {
    const block = sliceBetween(mainSrc, 'ipcMain.handle("updater-restart"', 'ipcMain.handle("app-get-key-status"');
    expect(block).toContain("confirmExitOverSaveResult");
    expect(block).toContain('anywayLabel: "Restart anyway"');
    const decisionAt = block.indexOf("confirmExitOverSaveResult");
    const restartAt = block.indexOf("restartAndInstall()");
    expect(restartAt, "restartAndInstall() missing from the handler").toBeGreaterThanOrEqual(0);
    expect(decisionAt, "decision must run BEFORE restartAndInstall").toBeLessThan(restartAt);
    // The keep-working path returns before the restart.
    expect(block.slice(0, restartAt)).toMatch(/if \(!proceed\) return/);
  });
});
