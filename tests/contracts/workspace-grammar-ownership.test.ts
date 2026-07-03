import { describe, it, expect } from "vitest";
import * as contracts from "../../src/core/contracts";
import { arcSummary, REGION_DISPLAY } from "../../src/utils/walkOrder";

// Domain Model Normalization — Slice 1, item 1 (Grammar ownership).
//
// Owner ruling (2026-07-03): src/utils/walkOrder.js owns pastor-facing region
// display labels and named-outcome labels. src/core/contracts.ts must NOT retain
// a dead SUB_PHASE_LABELS source-of-truth claim while walkOrder is the live owner.
//
// This file does two things:
//   1. CHARACTERIZES the live owner's output (arcSummary → REGION_DISPLAY +
//      REGION_NAMED_OUTCOME) so the ownership cleanup provably changes no
//      pastor-facing label.
//   2. Guards the ownership ruling: contracts.ts exports no SUB_PHASE_LABELS
//      binding (the dead claim stays deleted; re-adding it re-opens the
//      competing-source drift State #6 forbids).

describe("Region display + named-outcome labels are owned by walkOrder.js", () => {
  // Exact current pastor-facing strings, pinned. A change here is a walk-content
  // change (CORE Process #6 permits it) and must be made deliberately in
  // walkOrder.js, never as a side effect of ownership cleanup.
  const EXPECTED = [
    { stage: "Study", regions: [
      { subPhase: "Observe",          label: "Observe",          namedOutcome: "Observation Set" },
      { subPhase: "Interpret",        label: "Interpret",        namedOutcome: "Interpretation Set" },
      { subPhase: "RedemptiveThread", label: "Redemptive Thread", namedOutcome: "Christ-Connection Statement" },
      { subPhase: "Implications",     label: "Implications",     namedOutcome: "Implications Synthesis" },
    ]},
    { stage: "Assembly", regions: [
      { subPhase: "Anchor",  label: "Anchor",  namedOutcome: "Main Point Pair" },
      { subPhase: "Outline", label: "Outline", namedOutcome: "Sermon Outline" },
    ]},
    { stage: "Manuscript", regions: [
      { subPhase: "Body",                       label: "Body",                          namedOutcome: "Sermon Body" },
      { subPhase: "IntroTransitionsConclusion", label: "Intro, Transitions, Conclusion", namedOutcome: "Manuscript" },
    ]},
  ];

  it("arcSummary() renders the exact current labels + named outcomes", () => {
    expect(arcSummary()).toEqual(EXPECTED);
  });

  it("REGION_DISPLAY is the single owner of sub-phase display names", () => {
    // Every label the arc renders comes from REGION_DISPLAY — no second map.
    for (const stage of EXPECTED) {
      for (const region of stage.regions) {
        expect(REGION_DISPLAY[region.subPhase]).toBe(region.label);
      }
    }
    // REGION_DISPLAY covers exactly the eight canonical sub-phases, no more.
    expect(Object.keys(REGION_DISPLAY).sort()).toEqual(
      [...contracts.SUB_PHASE_CANONICAL_SEQUENCE].sort(),
    );
  });
});

describe("contracts.ts retains no dead SUB_PHASE_LABELS ownership claim", () => {
  // Fail-before / pass-after: red while the dead map still exists at HEAD, green
  // once Slice 1 deletes it. Re-adding a SUB_PHASE_LABELS export re-opens the
  // stale-ownership drift (a second, unconsumed definition of a truth walkOrder
  // owns) that this slice closed.
  it("exports no SUB_PHASE_LABELS binding", () => {
    expect((contracts as Record<string, unknown>).SUB_PHASE_LABELS).toBeUndefined();
  });
});
