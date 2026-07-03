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
import { runRegisteredFlushes } from "../../src/utils/closeFlush";

// Track D (slice 1) — the save-spine exit flush.
//
// The workspace holds edits behind an 800ms debounce. Two exit paths must
// flush that window so the pastor's last keystrokes are never silently
// dropped (audit H3):
//   • the close-flush registry — window close / app quit / reload; main asks
//     over "app-flush-edits" and runRegisteredFlushes runs every registered
//     flusher (src/utils/closeFlush.js), and
//   • component unmount.
// This behaviour was convention-held with no test. Slice 1 relocates both exit
// effects into useWorkspaceSave, so pin them first — a test written before the
// extraction pins the real behaviour, not the refactor. This is the "close/quit
// flush behavior, if covered" pin the Gate-2 / Track-B P2 verification list
// hedged.
//
// Scope: this pins exit-flush SURVIVAL — that the relocated wiring still runs on
// both exit paths (delete the registerFlush effect → the registry test fails;
// delete the unmount effect → the unmount test fails). Because each case flushes
// with a pending timer, it does NOT discriminate persistUpdate from
// debouncedSave.flush (either would write here). The shell deliberately uses
// persistUpdate — it reads sermonRef.current and persists regardless of timer
// state (audit-blessed D7/K3); that choice is preserved verbatim by
// construction, not guarded by this test.
//
// Fake timers are installed and NEVER advanced: the debounce (800ms) can only
// fire via advanceTimersByTime, so any write observed here must come from the
// explicit flush / unmount, not the timer — that is what makes the assertion
// causal.
//
// Note: React.createElement (rolldown SSR transform) — see process-3.

function insertMptSermon(): string {
  // Land directly on the MPT field (Assembly/Anchor/mpt) with both entry
  // overlays pre-seen, so the writing surface mounts on a textarea with no
  // threshold covering it — same setup as same-column-write / c3.
  return insertSermonRow({
    title: "Exit flush",
    current_stage: STAGE.Assembly,
    current_sub_phase: SUB_PHASE.Anchor,
    last_touched_position: "Assembly/Anchor/mpt",
    thresholds_seen: JSON.stringify(["sermon-start", "study-to-anchor-handoff"]),
  });
}

async function renderWorkspace(sermonId: string) {
  const Mod = await import("../../src/components/SermonWorkspace");
  const SermonWorkspace = (Mod as any).default || (Mod as any).SermonWorkspace;
  return (await act(async () =>
    render(React.createElement(SermonWorkspace, { sermonId, onClose: () => {} })),
  )) as unknown as { container: HTMLElement; unmount: () => void };
}

describe("Track D slice 1 — save-spine exit flush", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runRegisteredFlushes persists a pending edit without advancing the debounce timer", async () => {
    const sermonId = insertMptSermon();

    // Count update-sermon writes through the bridge.
    const api = (globalThis as any).electronAPI;
    const orig = api.spine;
    let updateWrites = 0;
    api.spine = async (op: string, payload: any) => {
      if (op === "update-sermon") updateWrites += 1;
      return orig(op, payload);
    };

    try {
      const { container } = await renderWorkspace(sermonId);

      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "unsaved keystrokes" } });
      });
      // Debounce queued; nothing written yet (timer not advanced).
      expect(updateWrites).toBe(0);

      // Simulate window close / app quit / reload: run the flush registry.
      // No timer advance — the write proves the registry holds persistUpdate.
      await act(async () => {
        await runRegisteredFlushes();
      });
      expect(updateWrites).toBeGreaterThanOrEqual(1);
    } finally {
      api.spine = orig;
    }
  });

  it("unmount flushes a pending edit", async () => {
    const sermonId = insertMptSermon();

    const api = (globalThis as any).electronAPI;
    const orig = api.spine;
    let updateWrites = 0;
    api.spine = async (op: string, payload: any) => {
      if (op === "update-sermon") updateWrites += 1;
      return orig(op, payload);
    };

    try {
      const { container, unmount } = await renderWorkspace(sermonId);

      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "unsaved keystrokes" } });
      });
      expect(updateWrites).toBe(0);

      // Unmount → the unmount-flush effect fires persistUpdate. No timer advance.
      await act(async () => {
        unmount();
      });
      expect(updateWrites).toBeGreaterThanOrEqual(1);
    } finally {
      api.spine = orig;
    }
  });
});
