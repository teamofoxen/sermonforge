// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, fireEvent } from "@testing-library/react";
import * as React from "react";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Track C (C2) — export flushes the debounce; no redundant timer write fires.
//
// handleExport used bare persistUpdate(), which writes but does NOT clear the
// pending 800ms debounce timer. If the pastor types then exports within the
// window, the timer fires ~800ms later with an identical payload — a duplicate
// idempotent write plus a spurious "Saving…" flicker. flush() runs the pending
// save AND clears the timer, so nothing fires afterward.
//
// Note: React.createElement (rolldown SSR transform) — see process-3.

describe("C2 — export flush leaves no queued duplicate write", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("typing then clicking Export does not produce a second (timer) write 800ms later", async () => {
    const sermonId = insertSermonRow({
      title: "Export flush",
      current_stage: STAGE.Assembly,
      current_sub_phase: SUB_PHASE.Anchor,
      last_touched_position: "Assembly/Anchor/mpt",
      thresholds_seen: JSON.stringify(["sermon-start", "study-to-anchor-handoff"]),
    });

    // Count update-sermon writes through the bridge.
    const api = (globalThis as any).electronAPI;
    const orig = api.spine;
    let updateWrites = 0;
    api.spine = async (op: string, payload: any) => {
      if (op === "update-sermon") updateWrites += 1;
      return orig(op, payload);
    };

    try {
      const Mod = await import("../../src/components/SermonWorkspace");
      const SermonWorkspace = (Mod as any).default || (Mod as any).SermonWorkspace;
      const { container } = (await act(async () =>
        render(React.createElement(SermonWorkspace, { sermonId, onClose: () => {} })),
      )) as unknown as { container: HTMLElement };

      // Type into the MPT draft → queues the 800ms debounce timer (no write yet).
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "a final edit" } });
      });

      // Click the topbar Export → handleExport flushes the pending save.
      const exportBtn = Array.from(container.querySelectorAll("button")).find((b) =>
        /export to word/i.test(b.textContent || ""),
      ) as HTMLButtonElement | undefined;
      expect(exportBtn).toBeTruthy();
      await act(async () => {
        fireEvent.click(exportBtn!);
      });
      const writesAfterExport = updateWrites;
      // The flush ran the pending edit exactly once.
      expect(writesAfterExport).toBeGreaterThanOrEqual(1);

      // Advance well past the debounce window. With flush() the timer was
      // cleared, so nothing more fires. With bare persistUpdate the un-cleared
      // timer would fire a duplicate write here.
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
      expect(updateWrites).toBe(writesAfterExport);
    } finally {
      api.spine = orig;
    }
  });
});
