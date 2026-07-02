// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, act, fireEvent } from "@testing-library/react";
import * as React from "react";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Track C (C1) — same-column stale-base write guard.
//
// Content handlers merge into sermonRef.current but used to read their base
// from the render-time `sermon` closure. Two writes to the SAME JSON column in
// one React batch (both firing before a re-render) then both read the pre-first
// `sermon`, and the second overwrites the whole column — the first write is
// lost. The fix reads the base from sermonRef.current (the discipline
// writePositionAndThresholds already uses).
//
// The MPT field carries two questions (draft, tighten) in ONE column
// (main_point_pair). Changing both in a single act reproduces the race.
//
// Note: React.createElement (rolldown SSR transform) — see process-3.

describe("C1 — two same-column writes in one tick both survive", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("editing MPT draft and tighten (both in main_point_pair) in one batch keeps both", async () => {
    const sermonId = insertSermonRow({
      title: "Two-question field",
      current_stage: STAGE.Assembly,
      current_sub_phase: SUB_PHASE.Anchor,
      last_touched_position: "Assembly/Anchor/mpt",
      // Suppress both entry overlays so the MPT field renders directly.
      thresholds_seen: JSON.stringify(["sermon-start", "study-to-anchor-handoff"]),
    });

    const Mod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace = (Mod as any).default || (Mod as any).SermonWorkspace;
    const { container } = (await act(async () =>
      render(React.createElement(SermonWorkspace, { sermonId, onClose: () => {} })),
    )) as unknown as { container: HTMLElement };

    const textareas = () =>
      Array.from(container.querySelectorAll("textarea")) as HTMLTextAreaElement[];
    const before = textareas();
    expect(before.length).toBeGreaterThanOrEqual(2);

    // Both onChange events run before React re-renders (one act = one batch).
    await act(async () => {
      fireEvent.change(before[0], { target: { value: "DRAFT-AAA" } });
      fireEvent.change(before[1], { target: { value: "TIGHTEN-BBB" } });
    });

    // Both contributions survive (order-independent). Before the fix the draft
    // is clobbered by the tighten write and "DRAFT-AAA" is absent.
    const values = textareas().map((t) => t.value);
    expect(values).toContain("DRAFT-AAA");
    expect(values).toContain("TIGHTEN-BBB");
  });
});
