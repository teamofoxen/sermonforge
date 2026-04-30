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
} from "./_helpers/test-spine";

// Process Contract #3 (docs/CORE.md):
//   "Movement is a visible event. 'Continue' is movement, and movement is
//   never silent. If movement triggers an AI summary, the user sees both
//   the movement and the summary as discrete events."
//
// The canonical movement-event marker is the DOM element with
// data-testid="movement-event" rendered by SermonWorkspace when the active
// tab changes. The primary test asserts that marker appears on transition;
// the meta-test guards against silent removal of the marker.
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
