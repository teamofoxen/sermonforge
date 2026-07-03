// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, renderHook, act, fireEvent } from "@testing-library/react";
import * as React from "react";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";
import { QUESTION_WALK_ORDER } from "../../src/utils/walkOrder";
import { useWorkspaceCompletion } from "../../src/utils/useWorkspaceCompletion";

// Track D slice 5 pins — the Finish screen open/close and its completeness gate.
//
// #5: the finish screen is opened from the terminal field's forward control
//     (onOpenFinish → finishOpen) and closed via its dismiss. finishOpen stays
//     in the shell (it gates the completion hook); handleFinishJump moves.
// #6: `completeness` is computed only while finishOpen (perf gate): the
//     useWorkspaceCompletion(sermon, finishOpen) ternary returns null when
//     closed, an artifact set when open.
//
// Note: React.createElement (rolldown SSR transform) — see process-3.

// The walk's terminal field — seeding here makes the forward control the
// "Finish sermon" door (hasNext === false).
const LAST = QUESTION_WALK_ORDER[QUESTION_WALK_ORDER.length - 1] as any;

async function renderWorkspace(sermonId: string) {
  const Mod = await import("../../src/components/SermonWorkspace");
  const SermonWorkspace = (Mod as any).default || (Mod as any).SermonWorkspace;
  return (await act(async () =>
    render(React.createElement(SermonWorkspace, { sermonId, onClose: () => {} })),
  )) as unknown as { container: HTMLElement; unmount: () => void };
}

describe("Track D ⑤ pin — Finish screen", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens from the terminal forward control and closes via dismiss (#5)", async () => {
    const sermonId = insertSermonRow({
      title: "Finish open/close",
      current_stage: LAST.stage,
      current_sub_phase: LAST.subPhase,
      last_touched_position: `${LAST.stage}/${LAST.subPhase}/${LAST.fieldKey}`,
      thresholds_seen: JSON.stringify(["sermon-start", "study-to-anchor-handoff"]),
    });

    const { container } = await renderWorkspace(sermonId);
    // At the terminal field the forward control is the Finish door.
    const finishDoor = container.querySelector(".sws-forward.is-finish") as HTMLButtonElement;
    expect(finishDoor).toBeTruthy();
    expect(container.querySelector(".sfin-overlay")).toBeFalsy();

    await act(async () => {
      fireEvent.click(finishDoor);
    });
    expect(container.querySelector(".sfin-overlay")).toBeTruthy();
    // Gate #6, observable half: opening computed completeness → artifacts render.
    expect(container.querySelector(".sfin-artifact")).toBeTruthy();

    await act(async () => {
      fireEvent.click(container.querySelector(".sfin-dismiss") as HTMLButtonElement);
    });
    expect(container.querySelector(".sfin-overlay")).toBeFalsy();
  });

  it("completeness is gated by finishOpen — null when closed, computed when open (#6)", () => {
    const sermon = { observations: "", interpretation: "", redemptive_thread: "", implications: "" };
    const closed = renderHook(() => useWorkspaceCompletion(sermon, false));
    expect(closed.result.current.completeness).toBeNull();
    const open = renderHook(() => useWorkspaceCompletion(sermon, true));
    expect(open.result.current.completeness).not.toBeNull();
  });
});
