// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Process Contract #3 (docs/CORE.md):
//   "Movement is a visible event. 'Continue' is movement, and movement is
//   never silent. If movement triggers an AI summary, the user sees both
//   the movement and the summary as discrete events."
//
// The canonical movement-event marker is the DOM element with
// data-testid="movement-event" rendered by SermonWorkspace when the active
// tab changes — and (Q1 spine routing) when sub-phase / step transitions
// bubble up via onMovement. The primary tests assert the marker appears on
// transition; the meta-test guards against silent removal of the marker.
//
// Note: this file uses React.createElement instead of JSX literals. Vitest
// 4's rolldown SSR transform doesn't currently parse JSX in .tsx test files;
// React.createElement is functionally identical and parses cleanly.

describe("Process Contract #3: movement is a visible event", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("changing the active tab in SermonWorkspace renders a movement-event element", async () => {
    const sermonId = insertSermonRow({
      title: "Visible movement test",
      current_stage: STAGE.Study,
      // Q1: handleTabChange now routes through transitionState. Process #2
      // requires non-empty evidence on non-legacy sermons. Seed the source
      // stage's content so the transition succeeds and the marker fires.
      observations: '{"context":"Romans 8 sets the believers in Christ Jesus."}',
    });

    const SermonWorkspaceMod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace = (SermonWorkspaceMod as any).default || (SermonWorkspaceMod as any).SermonWorkspace;

    await act(async () => {
      render(
        React.createElement(SermonWorkspace, {
          sermonId,
          onClose: () => {},
        }),
      );
    });

    // Find the Blueprint tab button and click it. handleTabChange records
    // a movement event; the canonical marker must then surface in the DOM.
    const blueprintTab = await screen.findByText(/Blueprint/i);
    await act(async () => {
      fireEvent.click(blueprintTab);
    });

    // findByTestId throws if the marker is absent — prevents vacuous pass.
    const movementEvent = await screen.findByTestId("movement-event");
    expect(movementEvent).toBeTruthy();
    expect(movementEvent.textContent || "").toMatch(/advanced/i);
  });

  it("crossing a sub-phase boundary in StudyTab renders a movement-event element (Q1)", async () => {
    // Q1 spine routing: sub-phase Continue routes through transitionState and
    // bubbles a movement event up to SermonWorkspace via onMovement.
    const sermonId = insertSermonRow({
      title: "Sub-phase visible movement test",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      // Non-empty source sub-phase content so Process #2 passes.
      observations: '{"context":"The passage situates the reader after Romans 7\'s wretched-man cry."}',
    });

    const SermonWorkspaceMod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace = (SermonWorkspaceMod as any).default || (SermonWorkspaceMod as any).SermonWorkspace;

    await act(async () => {
      render(
        React.createElement(SermonWorkspace, {
          sermonId,
          onClose: () => {},
        }),
      );
    });

    // The Continue button at the bottom of Observe advances to Interpret.
    const continueBtn = await screen.findByText(/Continue to Interpret/i);
    await act(async () => {
      fireEvent.click(continueBtn);
    });

    const movementEvent = await screen.findByTestId("movement-event");
    expect(movementEvent).toBeTruthy();
    expect(movementEvent.textContent || "").toMatch(/advanced/i);
  });
});

describe("Process Contract #3 meta: test ID presence in components", () => {
  // Without this meta-test, the primary test passes vacuously when a
  // developer removes data-testid="movement-event" from SermonWorkspace.
  it("data-testid=\"movement-event\" is referenced in src/components/", () => {
    const componentsRoot = path.resolve(__dirname, "..", "..", "src", "components");
    const stack = [componentsRoot];
    let found = false;
    while (stack.length) {
      const cur = stack.pop()!;
      if (!fs.existsSync(cur)) continue;
      const stat = fs.statSync(cur);
      if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(cur)) stack.push(path.join(cur, entry));
      } else if (/\.(jsx|tsx)$/.test(cur)) {
        const src = fs.readFileSync(cur, "utf8");
        if (src.includes('data-testid="movement-event"')) {
          found = true;
          break;
        }
      }
    }
    expect(found).toBe(true);
  });
});
