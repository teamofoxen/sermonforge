// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, fireEvent, screen } from "@testing-library/react";
import * as React from "react";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Track C (C3) — the save-error chip speaks the plain mapped message.
//
// persistMutation now carries mapError(err, "save") on a failed save, and the
// topbar chip renders `saveErrorMessage || "Save failed"`. A real disk-full /
// file-locked save failure therefore surfaces the same one-voice wording the
// rest of the app uses, instead of a generic "Save failed", while Retry is
// preserved exactly.
//
// Note: React.createElement (rolldown SSR transform) — see process-3.

describe("C3 — a failed save renders the mapped message + Retry", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a disk-full save failure shows the disk-full sentence and keeps Retry", async () => {
    const sermonId = insertSermonRow({
      title: "Save error",
      current_stage: STAGE.Assembly,
      current_sub_phase: SUB_PHASE.Anchor,
      last_touched_position: "Assembly/Anchor/mpt",
      thresholds_seen: JSON.stringify(["sermon-start", "study-to-anchor-handoff"]),
    });

    // Make the save (update-sermon) fail with a disk-full error; reads delegate.
    const api = (globalThis as any).electronAPI;
    const orig = api.spine;
    api.spine = async (op: string, payload: any) => {
      if (op === "update-sermon") throw new Error("SQLITE_FULL: database or disk is full");
      return orig(op, payload);
    };

    try {
      const Mod = await import("../../src/components/SermonWorkspace");
      const SermonWorkspace = (Mod as any).default || (Mod as any).SermonWorkspace;
      const { container } = (await act(async () =>
        render(React.createElement(SermonWorkspace, { sermonId, onClose: () => {} })),
      )) as unknown as { container: HTMLElement };

      // Type → queues the debounced save.
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "an edit that fails to save" } });
      });

      // Fire the debounce → the save fails → the chip renders the mapped message.
      await act(async () => {
        vi.advanceTimersByTime(900);
      });

      // The plain one-voice disk-full sentence, not a generic "Save failed".
      expect(screen.getByText(/this computer's disk is full/i)).toBeTruthy();
      // Retry is still offered.
      const retry = Array.from(container.querySelectorAll("button")).find((b) =>
        /^retry$/i.test((b.textContent || "").trim()),
      );
      expect(retry).toBeTruthy();
    } finally {
      api.spine = orig;
    }
  });
});
