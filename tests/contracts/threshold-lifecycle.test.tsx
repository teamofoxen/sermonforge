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
import { fieldOverviewThresholdId, THRESHOLD_ID } from "../../src/utils/sermonState";

// Track D slice 5 pins — the threshold-seen mechanism fused into the position
// write. These pin the behaviors a mis-move of writePositionAndThresholds /
// dismissThreshold would silently break, BEFORE the extraction.
//
// The teaching-seen mark has one read (teachingAutoOpen) and two write-ends:
// collapsing the auto-opened block (dismissThreshold) and leaving the field
// (the fold inside writePositionAndThresholds). Both are pinned here.
//
// thresholds_seen writes route through handleUpdate → the 800ms debounce, so a
// getSermonRow assertion advances fake timers first to flush the disk write.
//
// Note: React.createElement (rolldown SSR transform) — see process-3.

const CCS_TEACHING_ID = fieldOverviewThresholdId("Study", "RedemptiveThread", "christ_connection_statement");
const MPS_TEACHING_ID = fieldOverviewThresholdId("Assembly", "Anchor", "mps");

async function renderWorkspace(sermonId: string) {
  const Mod = await import("../../src/components/SermonWorkspace");
  const SermonWorkspace = (Mod as any).default || (Mod as any).SermonWorkspace;
  return (await act(async () =>
    render(React.createElement(SermonWorkspace, { sermonId, onClose: () => {} })),
  )) as unknown as { container: HTMLElement; unmount: () => void };
}

function seen(sermonId: string): string[] {
  const raw = getSermonRow(sermonId)?.thresholds_seen;
  return raw ? JSON.parse(raw) : [];
}

describe("Track D ⑤ pin — threshold lifecycle", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    if (typeof (Element.prototype as any).scrollIntoView !== "function") {
      (Element.prototype as any).scrollIntoView = function () {};
    }
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("field teaching auto-opens once; collapsing it persists seen; stays collapsed on remount (#1)", async () => {
    const sermonId = insertSermonRow({
      title: "Teaching auto-open",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.RedemptiveThread,
      last_touched_position: "Study/RedemptiveThread/christ_connection_statement",
      thresholds_seen: JSON.stringify(["sermon-start", "study-to-anchor-handoff"]),
    });

    const { container, unmount } = await renderWorkspace(sermonId);
    // First visit: the authored teaching is auto-open.
    expect(container.querySelector(".sws-teaching-body")).toBeTruthy();
    const toggle = container.querySelector(".sws-teaching-toggle") as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    // Collapsing the auto-opened block ends the first visit → marks seen.
    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(container.querySelector(".sws-teaching-body")).toBeFalsy(); // collapsed
    await act(async () => {
      vi.advanceTimersByTime(900); // flush the debounced thresholds_seen write
    });
    expect(seen(sermonId)).toContain(CCS_TEACHING_ID);

    // Remount the same sermon: teaching is no longer auto-open.
    await act(async () => {
      unmount();
    });
    const { container: c2 } = await renderWorkspace(sermonId);
    expect(c2.querySelector(".sws-teaching-body")).toBeFalsy();
    // The toggle still exists (re-expandable), just collapsed.
    expect(c2.querySelector(".sws-teaching-toggle")).toBeTruthy();
  });

  it("leaving a field with unseen teaching folds the teaching-seen mark (writePositionAndThresholds) (#1 leave-end)", async () => {
    const sermonId = insertSermonRow({
      title: "Teaching leave-fold",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.RedemptiveThread,
      last_touched_position: "Study/RedemptiveThread/christ_connection_statement",
      thresholds_seen: JSON.stringify(["sermon-start", "study-to-anchor-handoff"]),
    });

    const { container } = await renderWorkspace(sermonId);
    expect(container.querySelector(".sws-teaching-body")).toBeTruthy(); // auto-open, unseen
    expect(seen(sermonId)).not.toContain(CCS_TEACHING_ID);

    // Move to another field WITHOUT collapsing the block first.
    const next = container.querySelector(".sws-forward") as HTMLButtonElement;
    expect(next).toBeTruthy();
    await act(async () => {
      fireEvent.click(next);
    });
    await act(async () => {
      vi.advanceTimersByTime(900); // flush the fold write
    });
    // The left field's teaching is now marked seen by the position write's fold.
    expect(seen(sermonId)).toContain(CCS_TEACHING_ID);
  });

  it("dismissing sermon-start persists thresholds_seen and stays gone on remount (#2)", async () => {
    // Brand-new sermon: no last_touched_position, no thresholds_seen → start shows.
    const sermonId = insertSermonRow({
      title: "Sermon start dismiss",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
    });

    const { container, unmount } = await renderWorkspace(sermonId);
    expect(container.querySelector(".ssl-overlay")).toBeTruthy();
    const begin = container.querySelector(".ssl-overlay button") as HTMLButtonElement;
    expect(begin).toBeTruthy();
    await act(async () => {
      fireEvent.click(begin);
    });
    expect(container.querySelector(".ssl-overlay")).toBeFalsy();
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    expect(seen(sermonId)).toContain(THRESHOLD_ID.SermonStart);

    // Remount → start stays gone.
    await act(async () => {
      unmount();
    });
    const { container: c2 } = await renderWorkspace(sermonId);
    expect(c2.querySelector(".ssl-overlay")).toBeFalsy();
  });

  it("reread re-summons a threshold screen without persisting it seen — view-only, no write (#3)", async () => {
    const sermonId = insertSermonRow({
      title: "Reread view-only",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      last_touched_position: "Study/Observe/context",
      thresholds_seen: JSON.stringify(["sermon-start"]),
    });

    // Count any disk write across the whole reread cycle.
    const api = (globalThis as any).electronAPI;
    const orig = api.spine;
    let writes = 0;
    api.spine = async (op: string, payload: any) => {
      if (op === "update-sermon") writes += 1;
      return orig(op, payload);
    };
    try {
      const { container } = await renderWorkspace(sermonId);
      expect(container.querySelector(".ssl-overlay")).toBeFalsy(); // already seen

      // Open the map and click "Read again" for sermon-start.
      await act(async () => {
        fireEvent.click(container.querySelector(".sws-map-summon") as HTMLButtonElement);
      });
      const rereadLinks = Array.from(container.querySelectorAll(".sm-reread-link")) as HTMLButtonElement[];
      expect(rereadLinks.length).toBeGreaterThanOrEqual(1);
      await act(async () => {
        fireEvent.click(rereadLinks[0]); // sermon-start reread
      });
      // The start screen is re-summoned.
      expect(container.querySelector(".ssl-overlay")).toBeTruthy();

      // Close it (Begin in reread mode clears local state, never persists).
      await act(async () => {
        fireEvent.click(container.querySelector(".ssl-overlay button") as HTMLButtonElement);
      });
      expect(container.querySelector(".ssl-overlay")).toBeFalsy();
      await act(async () => {
        vi.advanceTimersByTime(900);
      });
      // View-only: the whole cycle wrote nothing, and thresholds_seen is intact.
      expect(writes).toBe(0);
      expect(seen(sermonId)).toEqual(["sermon-start"]);
    } finally {
      api.spine = orig;
    }
  });

  it("handoff jump preserves suppressTeachingSeen — the covered landing field is not marked seen (#4)", async () => {
    // At Anchor with the handoff unacknowledged; mps carries teaching that
    // auto-opens UNDER the overlay (never visible). Empty Study → the handoff
    // shows "go write it" jump buttons.
    const sermonId = insertSermonRow({
      title: "Handoff suppress",
      current_stage: STAGE.Assembly,
      current_sub_phase: SUB_PHASE.Anchor,
      last_touched_position: "Assembly/Anchor/mps",
      thresholds_seen: JSON.stringify(["sermon-start"]),
    });

    const { container } = await renderWorkspace(sermonId);
    expect(container.querySelector(".sah-overlay")).toBeTruthy();
    expect(seen(sermonId)).not.toContain(MPS_TEACHING_ID);

    const goWrite = container.querySelector(".sah-outcome-write, .sah-unfinished-btn") as HTMLButtonElement;
    expect(goWrite).toBeTruthy();
    await act(async () => {
      fireEvent.click(goWrite);
    });
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    const after = seen(sermonId);
    // Suppressed: leaving mps under the overlay must NOT mark its teaching seen.
    expect(after).not.toContain(MPS_TEACHING_ID);
    // The handoff jump also does not consume the handoff threshold (T9).
    expect(after).not.toContain(THRESHOLD_ID.StudyToAnchorHandoff);
  });
});
