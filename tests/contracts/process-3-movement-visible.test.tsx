// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
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
//   "Movement is visible at thresholds, not narrated continuously."
//
// Major transitions — sermon start and the Study → Anchor handoff — surface
// as discrete landing screens (`.ssl-overlay`, `.sah-overlay`). Within-stage
// step movement (chevron-next, map-jump) is silent by design.
//
// Authority for the retired always-on banner:
//   - Invisible-system build spec, "Strategic orientation at thresholds":
//     "Orientation is discrete and lives at thresholds. It is never
//     continuous and never present during the work."
//   - Era-2 primacy charter, "Constraint without ceremony":
//     "It is not the system's job to announce that work happened, mark
//     that a boundary was crossed, or instruct the pastor's interior
//     practice around the work."
//
// History: pre-invisible-system the contract's surface was a tab-change
// banner with `data-testid="movement-event"` fired on every stage
// transition. The trail deletion sweep (Phase D2c, 2026-05-17) removed
// that surface; the trail deletion sweep (Phase D2e, 2026-05-17) rewrote
// this test against the new threshold vocabulary. The meta describe at
// the bottom now guards against the banner's return.
//
// Note: this file uses React.createElement instead of JSX literals. Vitest
// 4's rolldown SSR transform doesn't currently parse JSX in .tsx test
// files; React.createElement is functionally identical and parses cleanly.

describe("Process Contract #3: movement is visible at thresholds, silent at within-stage steps", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    // jsdom doesn't implement scrollIntoView; SermonMap calls it on mount
    // to scroll the current row into view. Stub it to a no-op so the
    // map-jump test can render the panel without crashing.
    if (typeof (Element.prototype as any).scrollIntoView !== "function") {
      (Element.prototype as any).scrollIntoView = function () {};
    }
  });

  it("sermon-start fires .ssl-overlay when last_touched_position is null", async () => {
    // Brand-new sermon: no last_touched_position, no thresholds_seen.
    // deriveCurrentPositionFromSermon returns the first walk field;
    // hasSeenThreshold(sermon-start) is false → SermonStartLanding mounts.
    const sermonId = insertSermonRow({
      title: "Brand-new sermon",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
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

    expect(container.querySelector(".ssl-overlay")).toBeTruthy();
    // Handoff overlay does not piggyback on sermon-start.
    expect(container.querySelector(".sah-overlay")).toBeFalsy();
  });

  it("Study → Anchor crossing fires .sah-overlay when the preacher has landed in Anchor with sermon-start dismissed", async () => {
    const sermonId = insertSermonRow({
      title: "Handoff threshold",
      current_stage: STAGE.Assembly,
      current_sub_phase: SUB_PHASE.Anchor,
      last_touched_position: "Assembly/Anchor/mpt",
      // Sermon-start dismissed; handoff not yet seen.
      thresholds_seen: JSON.stringify(["sermon-start"]),
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

    expect(container.querySelector(".sah-overlay")).toBeTruthy();
    expect(container.querySelector(".ssl-overlay")).toBeFalsy();
  });

  it("within-stage chevron-next produces NO threshold overlay and NO data-testid='movement-event'", async () => {
    // Sermon parked at the first Study field with sermon-start dismissed.
    // Clicking the chevron advances from Study/Observe/context to
    // Study/Observe/surface_questions — a within-stage step.
    const sermonId = insertSermonRow({
      title: "Within-stage step",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      last_touched_position: "Study/Observe/context",
      thresholds_seen: JSON.stringify(["sermon-start"]),
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

    // Baseline at mount: no overlay, no banner.
    expect(container.querySelector(".ssl-overlay")).toBeFalsy();
    expect(container.querySelector(".sah-overlay")).toBeFalsy();
    expect(container.querySelector('[data-testid="movement-event"]')).toBeFalsy();

    const forward = container.querySelector(".sws-forward") as HTMLButtonElement | null;
    expect(forward).toBeTruthy();
    await act(async () => {
      fireEvent.click(forward!);
    });

    // Confirm the advance landed — waitFor lets the async chevron→flush→
    // setSermon chain settle before the negative assertions below run.
    await waitFor(() => {
      expect(screen.queryByText(/Surface Questions/i)).not.toBeNull();
    });

    // Movement happened; nothing announced it.
    expect(container.querySelector(".ssl-overlay")).toBeFalsy();
    expect(container.querySelector(".sah-overlay")).toBeFalsy();
    expect(container.querySelector('[data-testid="movement-event"]')).toBeFalsy();
  });

  it("within-stage map-jump produces NO threshold overlay and NO data-testid='movement-event'", async () => {
    // Same parked state. Open the map, jump to a different Study question
    // (a within-stage jump). No overlay should appear.
    const sermonId = insertSermonRow({
      title: "Map-jump within stage",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      last_touched_position: "Study/Observe/context",
      thresholds_seen: JSON.stringify(["sermon-start"]),
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

    const mapBtn = container.querySelector(".sws-map-summon") as HTMLButtonElement | null;
    expect(mapBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(mapBtn!);
    });

    // The map renders one .sm-jump button per question. The first Study
    // field (context) has 4 questions, so .sm-jump[4] is the first
    // question of the second Study field (surface_questions). Jumping
    // there moves within Study — no Anchor crossing.
    const jumpBtns = Array.from(container.querySelectorAll(".sm-jump")) as HTMLButtonElement[];
    expect(jumpBtns.length).toBeGreaterThan(4);
    await act(async () => {
      fireEvent.click(jumpBtns[4]);
    });

    // Wait for the jump to settle. Map closes (no .sm-panel) and the
    // writing surface re-renders at the new field.
    await waitFor(() => {
      expect(container.querySelector(".sm-panel")).toBeNull();
    });

    expect(container.querySelector(".ssl-overlay")).toBeFalsy();
    expect(container.querySelector(".sah-overlay")).toBeFalsy();
    expect(container.querySelector('[data-testid="movement-event"]')).toBeFalsy();
  });
});

describe("Process Contract #3 meta: the retired always-on movement banner does not return", () => {
  // Pre-rewrite, this meta-test asserted the testid was PRESENT in
  // src/components/ — the always-on banner was the contract's surface.
  // Post-rewrite (Phase D2e), the assertion inverts: no component may
  // carry `data-testid="movement-event"`. A regression that re-adds
  // always-on narration — anywhere under src/components/ — trips this
  // test. The era-2 charter's "constraint without ceremony" clause and
  // the build spec's "orientation is discrete and lives at thresholds"
  // line are the authority for the inversion.
  it("no component under src/components/ references data-testid=\"movement-event\"", () => {
    const componentsRoot = path.resolve(__dirname, "..", "..", "src", "components");
    const stack = [componentsRoot];
    const hits: string[] = [];
    while (stack.length) {
      const cur = stack.pop()!;
      if (!fs.existsSync(cur)) continue;
      const stat = fs.statSync(cur);
      if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(cur)) stack.push(path.join(cur, entry));
      } else if (/\.(jsx|tsx)$/.test(cur)) {
        const src = fs.readFileSync(cur, "utf8");
        if (src.includes('data-testid="movement-event"')) {
          hits.push(cur);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
