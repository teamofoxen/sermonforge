// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, fireEvent, screen, cleanup } from "@testing-library/react";
import * as React from "react";
import * as fs from "node:fs";
import * as path from "node:path";
import { installTestSpine, resetTestSpine } from "./_helpers/test-spine";

// Session-6 remediation — the workspace's blocking overlays carry the house
// dialog contract (useModalA11y): focus ENTERS the dialog on open, Escape
// closes, and focus RESTORES to the invoking control on close; while open the
// dialog is aria-modal and the only keyboard region.
//
// HONEST SCOPE (jsdom): focus entry, Escape, and restoration are asserted
// behaviorally here. The Tab-cycle half of the trap keys off offsetParent,
// which jsdom always reports null — so containment inside these tests is
// asserted as "focus landed and remains inside the dialog node" plus the
// structural facts (aria-modal + the shared hook allocates the trap); the
// cycling itself is the hook's own logic, exercised by every house modal.
// Visual checks (1024×700 no-clipping, light/dark) ran against the real
// preview — see the session report, not this file.

function focusProbe() {
  // A focusable "invoking control" to restore to.
  const btn = document.createElement("button");
  btn.textContent = "invoker";
  document.body.appendChild(btn);
  btn.focus();
  return btn;
}

async function renderOverlay(element: React.ReactElement) {
  return await act(async () => render(element));
}

function expectDialogContract(dialog: HTMLElement, invoker: HTMLElement) {
  expect(dialog).toBeTruthy();
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  // Focus ENTERED the overlay (predictable landing; background lost focus).
  expect(dialog.contains(document.activeElement)).toBe(true);
  expect(document.activeElement).not.toBe(invoker);
}

describe("workspace overlays — the house dialog contract", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    // jsdom ships no scrollIntoView; the map's center-on-current effect needs it.
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("Sermon start: focus enters, Escape dismisses (onBegin), focus restores to the invoker", async () => {
    const invoker = focusProbe();
    const onBegin = vi.fn();
    const Mod = await import("../../src/components/SermonStartLanding");
    const { unmount } = await renderOverlay(React.createElement(Mod.default, { onBegin }));

    const dialog = screen.getByRole("dialog", { name: "Sermon start" });
    expectDialogContract(dialog, invoker);

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(onBegin).toHaveBeenCalledTimes(1);

    await act(async () => { unmount(); });
    expect(document.activeElement).toBe(invoker); // restored
  });

  it("Study → Anchor handoff: same contract (focus in, Escape closes, restore out)", async () => {
    const invoker = focusProbe();
    const onClose = vi.fn();
    const Mod = await import("../../src/components/StudyAnchorHandoff");
    const outcomes = [
      { fieldKey: "obvious_point", label: "Observation Set", text: "The obvious point." },
      { fieldKey: "interpretation_synthesis", label: "Interpretation Set", text: "" },
    ];
    const { unmount } = await renderOverlay(
      React.createElement(Mod.default, { passage: "Romans 8:1-4", outcomes, unfinished: [], onJump: () => {}, onClose }),
    );

    const dialog = screen.getByRole("dialog", { name: "Study to Anchor handoff" });
    expectDialogContract(dialog, invoker);

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => { unmount(); });
    expect(document.activeElement).toBe(invoker);
  });

  it("Sermon Finish: same contract", async () => {
    const invoker = focusProbe();
    const onClose = vi.fn();
    const Mod = await import("../../src/components/SermonFinish");
    const completeness = { allComplete: false, artifacts: [{ key: "mpt", label: "MPT", complete: false, jump: null }] };
    const { unmount } = await renderOverlay(
      React.createElement(Mod.default, {
        completeness, beholding: { ccs: "", mps: "" }, status: "in_progress",
        onJump: () => {}, onExport: () => {}, exporting: false, exportNote: null,
        onMarkPreached: () => {}, onClose,
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "Finish sermon" });
    expectDialogContract(dialog, invoker);

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => { unmount(); });
    expect(document.activeElement).toBe(invoker);
  });

  it("Sermon Map: same contract", async () => {
    const invoker = focusProbe();
    const onClose = vi.fn();
    const Mod = await import("../../src/components/SermonMap");
    const { unmount } = await renderOverlay(
      React.createElement(Mod.default, { questionStates: {}, currentPosition: null, onJump: () => {}, onClose }),
    );

    const dialog = screen.getByRole("dialog", { name: "Sermon map" });
    expectDialogContract(dialog, invoker);

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => { unmount(); });
    expect(document.activeElement).toBe(invoker);
  });

  it("Notebook drawer: focus enters the drawer, Escape closes, focus restores", async () => {
    const invoker = focusProbe();
    const onClose = vi.fn();
    const Mod = await import("../../src/components/WorkspaceNotebookDrawer");
    const { unmount } = await renderOverlay(
      React.createElement(Mod.default, { stage: "Study", value: "", onChange: () => {}, onStageChange: () => {}, onClose }),
    );

    const dialog = screen.getByRole("dialog", { name: "Study notebook" });
    expectDialogContract(dialog, invoker);

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => { unmount(); });
    expect(document.activeElement).toBe(invoker);
  });

  it("typing in the notebook drawer never loses focus — parent re-renders with UNSTABLE inline callbacks must not churn the dialog lifecycle", async () => {
    // The final-integration-review regression (2026-07-13): SermonWorkspace
    // passes inline arrows (`onClose={() => …}`) to every overlay, and the
    // drawer re-renders the workspace on EVERY keystroke (handleNotebookChange
    // → setSermon). When useModalA11y keyed its lifecycle on the `onClose`
    // identity, each keystroke ran the close half (restore focus to the
    // invoker) then the open half (focus the first focusable — the Study
    // tab), so the textarea went deaf after the first character. This harness
    // reproduces the exact production wiring: state-driven value + fresh
    // callback identities per render.
    focusProbe();
    const Mod = await import("../../src/components/WorkspaceNotebookDrawer");
    function Harness() {
      const [value, setValue] = React.useState("");
      return React.createElement(Mod.default, {
        stage: "Study",
        value,
        onChange: (v: string) => setValue(v),        // fresh identity every render,
        onStageChange: () => {},                      // exactly like SermonWorkspace
        onClose: () => {},
        key: undefined,
      });
    }
    await renderOverlay(React.createElement(Harness));

    const textarea = screen.getByRole("textbox", { name: "Study notebook" }) as HTMLTextAreaElement;
    await act(async () => { textarea.focus(); });
    expect(document.activeElement).toBe(textarea);

    await act(async () => {
      fireEvent.change(textarea, { target: { value: "a" } });
    });
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "ab" } });
    });

    expect(textarea.value).toBe("ab");
    // The contract under test: focus NEVER left the textarea across the
    // re-renders the typing itself caused.
    expect(document.activeElement).toBe(textarea);
  });
});

describe("programmatic labels — every visible label owns its control", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("New Sermon controls have accessible names (Book, Chapter:verse, Date)", async () => {
    const Mod = await import("../../src/components/NewSermonModal");
    await renderOverlay(React.createElement(Mod.default, { onClose: () => {}, onCreated: () => {} }));
    expect(screen.getByLabelText(/Book \*/)).toBeTruthy();
    expect(screen.getByLabelText("Chapter:verse")).toBeTruthy();
    expect(screen.getByLabelText("Date")).toBeTruthy();
  });

  it("New Series controls have accessible names (Book, Series title, Theme, Year)", async () => {
    const Mod = await import("../../src/components/NewSeriesModal");
    await renderOverlay(React.createElement(Mod.default, { onClose: () => {}, onCreated: () => {} }));
    // Book-mode fields:
    expect(screen.getByLabelText("Book")).toBeTruthy();
    expect(screen.getByLabelText(/Series title/)).toBeTruthy();
    expect(screen.getByLabelText("Year")).toBeTruthy();
  });

  it("Setup API-key control has an accessible name", async () => {
    const Mod = await import("../../src/components/SetupScreen");
    await renderOverlay(React.createElement(Mod.default, { onComplete: () => {} }));
    const input = screen.getByLabelText(/Your ESV API key/);
    expect(input.tagName).toBe("INPUT");
  });
});

describe("fixture fidelity — the writing fixture derives through production", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
  });

  it("SermonWritingSurfaceFixture consumes deriveQuestionStatesFromSermon and carries NO local reimplementation", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../src/components/SermonWritingSurfaceFixture.jsx"),
      "utf8",
    );
    expect(src).toContain("deriveQuestionStatesFromSermon");
    expect(src).not.toMatch(/function deriveQuestionStates\(/);
  });

  it("the fixture's map renders real previews — no [object Object] canvas rendering", async () => {
    installTestSpine();
    resetTestSpine();
    const Mod = await import("../../src/components/SermonWritingSurfaceFixture");
    // Default fixture boot shows the sermon-start overlay; dismiss it, then
    // open the map and check the Divisions preview.
    const { container } = await renderOverlay(React.createElement(Mod.default));
    const begin = screen.queryByText("Begin →");
    if (begin) {
      await act(async () => { fireEvent.click(begin); });
    }
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Open map"));
    });
    expect(screen.getByRole("dialog", { name: "Sermon map" })).toBeTruthy();
    expect(container.textContent).not.toContain("[object Object]");
    expect(document.body.textContent).not.toContain("[object Object]");
    cleanup();
  });
});
