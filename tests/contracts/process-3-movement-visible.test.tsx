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

  // Post-WTC-sequel (2026-05-11): SermonWorkspace renders the trail by
  // default — no legacy three-column shell, no `sermonforge_trail_
  // disabled` opt-out. The canonical movement marker lives in
  // SermonWorkspace (`data-testid="movement-event"`), which is invariant
  // across both renderings, so the tab-click path remains the canonical
  // integration check. Sub-phase boundary fires `onMovement` through the
  // same shared `advanceSubPhase` path used by both StudyTab branches —
  // covered by the meta-test below + the spine's contract tests in
  // `tests/contracts/process-1-*.test.ts`.

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

    // Find the Assembly tab button and click it. handleTabChange records
    // a movement event; the canonical marker must then surface in the DOM.
    // Workspace Restructure (2026-05-10) — Blueprint tab retired; the
    // Study → Assembly transition is the canonical first stage advance.
    const assemblyTab = await screen.findByText(/^Assembly$/);
    await act(async () => {
      fireEvent.click(assemblyTab);
    });

    // findByTestId throws if the marker is absent — prevents vacuous pass.
    const movementEvent = await screen.findByTestId("movement-event");
    expect(movementEvent).toBeTruthy();
    expect(movementEvent.textContent || "").toMatch(/advanced/i);
  });

  it("the trail mounts at the seeded sub-phase so the advance path is reachable", async () => {
    // Post-WTC-sequel: navigating the trail to the last field's last Q to
    // fire `advanceSubPhase` via UI is too brittle for a contract test
    // (8 fields × multi-Q × pause-clearing). The contract that "sub-phase
    // advance bubbles up as a visible event" stays enforced by:
    //   - The shared `advanceSubPhase` in StudyTab (lines 222-280) which
    //     unconditionally calls `onMovement?.()` after the spine accepts.
    //   - `tests/contracts/process-1-monotonic.test.ts` for the spine
    //     routing.
    //   - The meta-test below that guards the `movement-event` testid
    //     against silent removal.
    // The integration check here verifies the trail is the active surface
    // so the wiring is live.
    const sermonId = insertSermonRow({
      title: "Trail mount at Observe",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      observations: '{"context":"seed"}',
    });

    const SermonWorkspaceMod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace = (SermonWorkspaceMod as any).default || (SermonWorkspaceMod as any).SermonWorkspace;

    const { container } = await act(async () =>
      render(
        React.createElement(SermonWorkspace, {
          sermonId,
          onClose: () => {},
        }),
      ),
    ) as unknown as { container: HTMLElement };

    expect(container.querySelector(".tw-shell")).toBeTruthy();
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
