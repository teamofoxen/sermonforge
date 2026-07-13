// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, fireEvent, screen, cleanup, within } from "@testing-library/react";
import * as React from "react";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  insertSeriesRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Session-1 remediation — the persistence-transition contract at the
// workspace's deliberate exits (src/utils/saveTransition.js):
//
//   • Back must NOT leave after a CONFIRMED failed save — the pastor stays on
//     the editable surface unless he explicitly chooses "Leave anyway"
//     (Mutation #3: a failed save is never silently discarded by navigation).
//   • Switching sermons (series prev/next) remounts the workspace keyed by
//     sermon id — the switch must not abandon the old sermon's failed save
//     to the unawaited unmount flush.
//   • Successful transitions behave exactly as before: flush, then leave,
//     no dialog.
//
// Fake timers are installed and never advanced: the 800ms debounce can't fire
// on its own, so every write observed comes from the guard's explicit flush —
// and resolveSaveTransition's 2s unknown-timer can't fire either, so a settled
// write maps deterministically to "saved"/"failed".

function insertMptSermon(extra: Record<string, unknown> = {}): string {
  // Land directly on the MPT field (Assembly/Anchor/mpt) with both entry
  // overlays pre-seen, so the writing surface mounts on a textarea with no
  // threshold covering it — same setup as exit-flush-persist.
  return insertSermonRow({
    title: "Leave guard",
    current_stage: STAGE.Assembly,
    current_sub_phase: SUB_PHASE.Anchor,
    last_touched_position: "Assembly/Anchor/mpt",
    thresholds_seen: JSON.stringify(["sermon-start", "study-to-anchor-handoff"]),
    ...extra,
  });
}

async function renderWorkspace(sermonId: string, handlers: Record<string, unknown> = {}) {
  const Mod = await import("../../src/components/SermonWorkspace");
  const SermonWorkspace = (Mod as any).default;
  return (await act(async () =>
    render(React.createElement(SermonWorkspace, { sermonId, onClose: () => {}, ...handlers })),
  )) as unknown as { container: HTMLElement; unmount: () => void };
}

// The workspace has TWO "← Back" controls: the topbar leave (under test) and
// the writing surface's previous-FIELD chevron (aria-label "Previous field",
// within-sermon movement — not a leave). Scope to the topbar.
function topbarBack(container: HTMLElement): HTMLElement {
  const topbar = container.querySelector(".topbar") as HTMLElement;
  expect(topbar).toBeTruthy();
  return within(topbar).getByText("← Back");
}

function failUpdates(api: any) {
  const orig = api.spine;
  api.spine = async (op: string, payload: unknown) => {
    if (op === "update-sermon") throw new Error("db locked");
    return orig(op, payload);
  };
  return () => { api.spine = orig; };
}

describe("workspace leave guard — deliberate exits run the persistence-transition contract", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("Back does NOT leave after a confirmed failed save; Keep working stays; a later explicit Leave anyway discards", async () => {
    const sermonId = insertMptSermon();
    const onClose = vi.fn();
    const { container } = await renderWorkspace(sermonId, { onClose });

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "unsaved keystrokes" } });
    });

    const restore = failUpdates((globalThis as any).electronAPI);
    try {
      // Back → the guard flushes, the write fails (confirmed), navigation is held.
      await act(async () => {
        fireEvent.click(topbarBack(container));
      });
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText("Your last changes didn't save")).toBeTruthy();

      // "Keep working" — the decision closes, the workspace stays put.
      await act(async () => {
        fireEvent.click(screen.getByText("Keep working"));
      });
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.queryByText("Your last changes didn't save")).toBeNull();
      expect(container.querySelector("textarea")).toBeTruthy(); // still on the editable surface

      // Back again (still failing) → same hold; the explicit choice leaves.
      await act(async () => {
        fireEvent.click(topbarBack(container));
      });
      expect(onClose).not.toHaveBeenCalled();
      await act(async () => {
        fireEvent.click(screen.getByText("Leave anyway"));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it("series prev/next does NOT abandon the current sermon after a confirmed failed save; Leave anyway proceeds to the target", async () => {
    const seriesId = insertSeriesRow({ title: "Romans" });
    const sermonA = insertMptSermon({
      series_id: seriesId, series_title: "Romans", date: "2026-01-04",
    });
    const sermonB = insertMptSermon({
      series_id: seriesId, series_title: "Romans", date: "2026-01-11",
    });
    const onOpenSermon = vi.fn();
    const { container } = await renderWorkspace(sermonA, { onOpenSermon });

    // Sanity: the series breadcrumb rendered with a live Next control.
    const next = screen.getByLabelText("Next sermon in series");
    expect((next as HTMLButtonElement).disabled).toBe(false);

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "sermon A's unsaved keystrokes" } });
    });

    const restore = failUpdates((globalThis as any).electronAPI);
    try {
      await act(async () => {
        fireEvent.click(next);
      });
      // The switch is held — sermon A is not silently abandoned to the remount.
      expect(onOpenSermon).not.toHaveBeenCalled();
      expect(screen.getByText("Your last changes didn't save")).toBeTruthy();

      // The explicit choice proceeds to sermon B.
      await act(async () => {
        fireEvent.click(screen.getByText("Leave anyway"));
      });
      expect(onOpenSermon).toHaveBeenCalledTimes(1);
      expect(onOpenSermon).toHaveBeenCalledWith(sermonB);
    } finally {
      restore();
    }
  });

  it("successful transitions behave as before: Back flushes, leaves once, and shows no dialog", async () => {
    const sermonId = insertMptSermon();
    const onClose = vi.fn();

    const api = (globalThis as any).electronAPI;
    const orig = api.spine;
    let updateWrites = 0;
    api.spine = async (op: string, payload: unknown) => {
      if (op === "update-sermon") updateWrites += 1;
      return orig(op, payload);
    };
    try {
      const { container } = await renderWorkspace(sermonId, { onClose });
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "keystrokes that will save" } });
      });
      expect(updateWrites).toBe(0); // debounce queued, timer never advanced

      await act(async () => {
        fireEvent.click(topbarBack(container));
      });
      // The guard flushed BEFORE navigating (no timer advance → the write is the guard's)…
      expect(updateWrites).toBeGreaterThanOrEqual(1);
      // …then left exactly once, with no decision dialog.
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Your last changes didn't save")).toBeNull();
      expect(screen.queryByText("Couldn't confirm your last changes saved")).toBeNull();
    } finally {
      api.spine = orig;
    }
  });

  it('a hung save resolves "unknown" — the workspace stays and speaks uncertainty, not success', async () => {
    const sermonId = insertMptSermon();
    const onClose = vi.fn();
    const { container } = await renderWorkspace(sermonId, { onClose });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "keystrokes into a hung pipe" } });
    });

    const api = (globalThis as any).electronAPI;
    const orig = api.spine;
    api.spine = (op: string, payload: unknown) => {
      if (op === "update-sermon") return new Promise(() => {}); // never settles
      return orig(op, payload);
    };
    try {
      await act(async () => {
        fireEvent.click(topbarBack(container));
      });
      expect(onClose).not.toHaveBeenCalled(); // still waiting inside the 2s window
      // The unknown-timeout fires → the decision renders with uncertainty wording.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText("Couldn't confirm your last changes saved")).toBeTruthy();
      expect(screen.queryByText("Your last changes didn't save")).toBeNull();

      // Explicitly leavable — never trapped behind a hung save.
      await act(async () => {
        fireEvent.click(screen.getByText("Leave anyway"));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      api.spine = orig;
    }
  });
});
