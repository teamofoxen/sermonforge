// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkspaceMutations } from "../../src/utils/useWorkspaceMutations";
import { parseStructuredField, getQuestionAnswer } from "../../src/utils/studyFields";

// Track E (E3) — the flat `mpt` / `mps` mirror write is retired.
//
// The v19 `main_point_pair` envelope is the source of truth. handleAnswerChange
// USED to derive flat `fields.mpt` / `fields.mps` from `*.tighten` and write
// them alongside the envelope column — a legacy mirror kept alive only so the
// Word export (which read the flat columns) stayed current. E2 flipped the
// export to derive MPT/MPS from the envelope directly, leaving the mirror with
// no live reader. This pin proves the mirror write is gone: an MPT/MPS envelope
// edit persists ONLY the `main_point_pair` column — no derived flat mirror keys
// ride along — while the envelope write itself stays intact.
//
// Why this harness: the mutation payload IS the `fields` object handleAnswerChange
// hands to `handleUpdate` (the sole persist primitive — useWorkspaceSave injects
// nothing of its own). A spy on that one call captures the whole write shape,
// with no DOM-order brittleness. It is RED while the mirror block still runs
// (the payload carries derived `mpt` + `mps`) and GREEN once it is removed.

// deriveCurrentPositionFromSermon reads `last_touched_position`; the
// "Assembly/Anchor/*" composite routes the write to the `main_point_pair`
// column (STAGE_SUBPHASE_TO_COLUMN), which is the only column that ever carried
// the mirror.
function makeAnchorSermon() {
  return {
    id: "s-e3",
    last_touched_position: "Assembly/Anchor/mpt",
    main_point_pair: JSON.stringify({
      mpt: { draft: { value: "a working draft", na: false }, tighten: { value: "", na: false } },
      mps: {
        translate: { value: "a translate", na: false },
        gospel_check: { value: "a check", na: false },
        tighten: { value: "an existing mps sentence", na: false },
      },
    }),
    // Distinct sentinels: if the mirror still fired, it would overwrite these
    // with the tighten answers — so their survival is the retirement proof.
    mpt: "SENTINEL-FLAT-MPT",
    mps: "SENTINEL-FLAT-MPS",
  };
}

describe("Track E (E3) — flat mpt/mps mirror write is retired", () => {
  it("an MPT tighten edit persists only main_point_pair — no derived flat mirror keys", () => {
    const sermon = makeAnchorSermon();
    const sermonRef = { current: sermon };
    const handleUpdate = vi.fn();

    const { result } = renderHook(() =>
      useWorkspaceMutations({ sermon, sermonRef, handleUpdate, setAllTags: vi.fn() }),
    );

    act(() => {
      result.current.handleAnswerChange("mpt", "tighten", { value: "The tightened MPT." });
    });

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    const fields = handleUpdate.mock.calls[0][0];

    // Envelope write intact: the tighten answer landed in the main_point_pair
    // column (this holds RED and GREEN — the envelope write is never removed).
    expect(
      getQuestionAnswer(parseStructuredField(fields.main_point_pair), "mpt", "tighten"),
    ).toBe("The tightened MPT.");

    // Mirror retired: no derived flat columns ride along with the envelope
    // write. With the mirror present, `fields` carries mpt + mps and these fail.
    expect(fields).not.toHaveProperty("mpt");
    expect(fields).not.toHaveProperty("mps");
  });
});
