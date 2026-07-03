// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, fireEvent } from "@testing-library/react";
import * as React from "react";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  getSermonRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Track D slice 5 pin — save-before-move + last_touched_position write.
//
// Every navigation handler awaits beforePositionChange() (= persistUpdate())
// BEFORE writing the new position, so a pending debounced edit is flushed on
// jump — draft persistence on jump. writePositionAndThresholds then writes
// last_touched_position. These are the fused behaviors slice ⑤ relocates into
// useWorkspaceNavigation, so pin them first.
//
// THE BITE (the reason these tests are meaningful): fake timers are installed
// and, for the flush assertions, NEVER advanced. The 800ms debounce can only
// fire via advanceTimersByTime, so a write observed immediately after a jump
// proves beforePositionChange flushed it NOW — not the debounce firing ~800ms
// later. A test that merely jumped and asserted "a write happened" would
// false-green even with beforePositionChange removed (the queued debounce fires
// eventually). Removing/breaking beforePositionChange yields 0 writes here.
//
// Note: React.createElement (rolldown SSR transform) — see process-3.

function countUpdateWrites() {
  const api = (globalThis as any).electronAPI;
  const orig = api.spine;
  const state = {
    n: 0,
    restore: () => {
      api.spine = orig;
    },
  };
  api.spine = async (op: string, payload: any) => {
    if (op === "update-sermon") state.n += 1;
    return orig(op, payload);
  };
  return state;
}

async function renderWorkspace(sermonId: string) {
  const Mod = await import("../../src/components/SermonWorkspace");
  const SermonWorkspace = (Mod as any).default || (Mod as any).SermonWorkspace;
  return (await act(async () =>
    render(React.createElement(SermonWorkspace, { sermonId, onClose: () => {} })),
  )) as unknown as { container: HTMLElement; unmount: () => void };
}

describe("Track D ⑤ pin — save before movement (bite: no timer advance)", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    // jsdom lacks scrollIntoView; SermonMap calls it on mount.
    if (typeof (Element.prototype as any).scrollIntoView !== "function") {
      (Element.prototype as any).scrollIntoView = function () {};
    }
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Next flushes a pending edit immediately, before the debounce (#7)", async () => {
    const sermonId = insertSermonRow({
      title: "Next save-before-move",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      last_touched_position: "Study/Observe/context",
      thresholds_seen: JSON.stringify(["sermon-start"]),
    });
    const writes = countUpdateWrites();
    try {
      const { container } = await renderWorkspace(sermonId);
      const ta = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(ta).toBeTruthy();
      await act(async () => {
        fireEvent.change(ta, { target: { value: "an unsaved edit" } });
      });
      expect(writes.n).toBe(0); // debounce pending; nothing written yet

      const next = container.querySelector(".sws-forward") as HTMLButtonElement;
      expect(next).toBeTruthy();
      await act(async () => {
        fireEvent.click(next);
      });
      // The jump flushed the pending edit NOW — timers were not advanced.
      expect(writes.n).toBeGreaterThanOrEqual(1);
    } finally {
      writes.restore();
    }
  });

  it("Map jump flushes a pending edit immediately, before the debounce (#8)", async () => {
    const sermonId = insertSermonRow({
      title: "Map save-before-move",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      last_touched_position: "Study/Observe/context",
      thresholds_seen: JSON.stringify(["sermon-start"]),
    });
    const writes = countUpdateWrites();
    try {
      const { container } = await renderWorkspace(sermonId);
      const ta = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(ta).toBeTruthy();
      await act(async () => {
        fireEvent.change(ta, { target: { value: "an unsaved edit" } });
      });
      expect(writes.n).toBe(0);

      const mapBtn = container.querySelector(".sws-map-summon") as HTMLButtonElement;
      expect(mapBtn).toBeTruthy();
      await act(async () => {
        fireEvent.click(mapBtn);
      });
      const jumps = Array.from(container.querySelectorAll(".sm-jump")) as HTMLButtonElement[];
      expect(jumps.length).toBeGreaterThan(4);
      await act(async () => {
        fireEvent.click(jumps[4]); // a within-Study jump (see process-3)
      });
      expect(writes.n).toBeGreaterThanOrEqual(1);
    } finally {
      writes.restore();
    }
  });

  it("Handoff jump flushes a pending edit immediately, before the debounce (#9)", async () => {
    // Seed at Anchor with the handoff unacknowledged so it renders; empty Study
    // means its outcomes show "go write it" jump buttons. The mps textarea sits
    // in the DOM under the overlay — fireEvent reaches it to queue a debounce.
    const sermonId = insertSermonRow({
      title: "Handoff save-before-move",
      current_stage: STAGE.Assembly,
      current_sub_phase: SUB_PHASE.Anchor,
      last_touched_position: "Assembly/Anchor/mps",
      thresholds_seen: JSON.stringify(["sermon-start"]),
    });
    const writes = countUpdateWrites();
    try {
      const { container } = await renderWorkspace(sermonId);
      expect(container.querySelector(".sah-overlay")).toBeTruthy();
      const ta = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(ta).toBeTruthy();
      await act(async () => {
        fireEvent.change(ta, { target: { value: "an unsaved anchor edit" } });
      });
      expect(writes.n).toBe(0);

      const goWrite = container.querySelector(".sah-outcome-write, .sah-unfinished-btn") as HTMLButtonElement;
      expect(goWrite).toBeTruthy();
      await act(async () => {
        fireEvent.click(goWrite);
      });
      expect(writes.n).toBeGreaterThanOrEqual(1);
    } finally {
      writes.restore();
    }
  });

  it("a position move persists last_touched_position to the new field (#10)", async () => {
    const sermonId = insertSermonRow({
      title: "Position write",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      last_touched_position: "Study/Observe/context",
      thresholds_seen: JSON.stringify(["sermon-start"]),
    });
    const { container } = await renderWorkspace(sermonId);
    const next = container.querySelector(".sws-forward") as HTMLButtonElement;
    expect(next).toBeTruthy();
    await act(async () => {
      fireEvent.click(next);
    });
    // last_touched_position is written through the debounce — flush it.
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    const row = getSermonRow(sermonId)!;
    expect(row.last_touched_position).toBeTruthy();
    // The write moved us off the seeded field. A broken last_touched_position
    // write in writePositionAndThresholds would leave it pinned at context.
    expect(row.last_touched_position).not.toBe("Study/Observe/context");
    expect(String(row.last_touched_position)).toContain("Study/Observe/");
  });
});
