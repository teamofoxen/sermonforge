// SPRD C3 — Sermon Frame elevation (Phase 3 Item 3, 2026-05-04).
//
// Covers the new STAGE.Frame and the Frame → Manuscript boundary composite
// gate. Per SADI Step 5 ratification:
//   - Intro requires Q1+Q2+Q3 non-empty + Q4 (redemptive_note) non-empty or N/A
//   - Conclusion requires Q1+Q2+Q3+Q4 all non-empty (no N/A path)
//
// The composite gate lives in `src/utils/studyAdvancement.js`
// (`evaluateAdvance(sermon, "stage", 3)`). Returns `{ok, reason?, gates?}`.

import { describe, it, expect } from "vitest";
import { evaluateAdvance } from "../../src/utils/studyAdvancement";

// Minimal helper — produces a sermon record with `sermon_frame` populated to
// the given envelope shape. Other fields default to enough that the empty-
// evidence baseline is satisfied; the composite gate is what we're testing.
function frameSermon(frameData: any) {
  return {
    id: "test",
    sermon_frame: frameData ? JSON.stringify(frameData) : "",
  };
}

const FILLED_INTRO = {
  intro: {
    hook:            { value: "A story about being not-good-enough.", na: false },
    bridge_to_text:  { value: "Open your Bibles to Ephesians 2.",     na: false },
    expectations:    { value: "Stop trying to earn what God gave.",    na: false },
    redemptive_note: { value: "Christ raised the dead — receive it.",  na: false },
  },
};

const FILLED_CONCLUSION = {
  conclusion: {
    summate:         { value: "But God — that's the word the sermon turns on.", na: false },
    land_call:       { value: "Lay down the striving. Receive the gift.",       na: false },
    gospel_empower:  { value: "Christ has already done it.",                     na: false },
    closing_posture: { value: "Posture: Prayer. Three-beat extempore.",          na: false },
  },
};

const FILLED_BOTH = { ...FILLED_INTRO, ...FILLED_CONCLUSION };

describe("SPRD C3 — Sermon Frame composite gate (Frame → Manuscript)", () => {
  it("rejects when sermon_frame is entirely empty", () => {
    const sermon = frameSermon(null);
    const result = evaluateAdvance(sermon, "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("rejects when Intro is filled but Conclusion is empty", () => {
    const sermon = frameSermon(FILLED_INTRO);
    const result = evaluateAdvance(sermon, "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.gates).toBeDefined();
    const conclGate = result.gates!.find((g: any) => g.key === "conclusion");
    expect(conclGate?.met).toBe(false);
    expect(conclGate?.reason).toMatch(/Conclusion/i);
  });

  it("rejects when Conclusion is filled but Intro is empty", () => {
    const sermon = frameSermon(FILLED_CONCLUSION);
    const result = evaluateAdvance(sermon, "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.gates).toBeDefined();
    const introGate = result.gates!.find((g: any) => g.key === "intro");
    expect(introGate?.met).toBe(false);
  });

  it("allows advance when both Intro and Conclusion composites are met", () => {
    const sermon = frameSermon(FILLED_BOTH);
    const result = evaluateAdvance(sermon, "stage", 3);
    expect(result.ok).toBe(true);
    expect(result.gates).toBeDefined();
    expect(result.gates!.every((g: any) => g.met)).toBe(true);
  });

  it("rejects when Intro Q1 (hook) is empty", () => {
    const data = {
      intro: {
        ...FILLED_INTRO.intro,
        hook: { value: "", na: false },
      },
      ...FILLED_CONCLUSION,
    };
    const sermon = frameSermon(data);
    const result = evaluateAdvance(sermon, "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Intro/i);
  });

  it("rejects when Intro Q2 (bridge_to_text) is empty", () => {
    const data = {
      intro: { ...FILLED_INTRO.intro, bridge_to_text: { value: "", na: false } },
      ...FILLED_CONCLUSION,
    };
    const result = evaluateAdvance(frameSermon(data), "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Intro/i);
  });

  it("rejects when Intro Q3 (expectations) is empty", () => {
    const data = {
      intro: { ...FILLED_INTRO.intro, expectations: { value: "", na: false } },
      ...FILLED_CONCLUSION,
    };
    const result = evaluateAdvance(frameSermon(data), "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Intro/i);
  });

  it("allows advance when Intro Q4 (redemptive_note) is empty but marked N/A", () => {
    const data = {
      intro: { ...FILLED_INTRO.intro, redemptive_note: { value: "", na: true } },
      ...FILLED_CONCLUSION,
    };
    const result = evaluateAdvance(frameSermon(data), "stage", 3);
    expect(result.ok).toBe(true);
  });

  it("rejects when Intro Q4 is empty AND not marked N/A", () => {
    const data = {
      intro: { ...FILLED_INTRO.intro, redemptive_note: { value: "", na: false } },
      ...FILLED_CONCLUSION,
    };
    const result = evaluateAdvance(frameSermon(data), "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/redemptive note/i);
  });

  it("rejects when Conclusion Q1 (summate) is empty", () => {
    const data = {
      ...FILLED_INTRO,
      conclusion: { ...FILLED_CONCLUSION.conclusion, summate: { value: "", na: false } },
    };
    const result = evaluateAdvance(frameSermon(data), "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Conclusion/i);
  });

  it("rejects when Conclusion Q4 (closing_posture) is empty", () => {
    const data = {
      ...FILLED_INTRO,
      conclusion: { ...FILLED_CONCLUSION.conclusion, closing_posture: { value: "", na: false } },
    };
    const result = evaluateAdvance(frameSermon(data), "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/closing posture/i);
  });

  it("rejects when Conclusion Q4 is N/A — N/A does NOT satisfy Conclusion (no carve-out)", () => {
    // Per SADI ratification, all four Conclusion questions are required;
    // closing_posture in particular forces an explicit pastoral choice.
    const data = {
      ...FILLED_INTRO,
      conclusion: { ...FILLED_CONCLUSION.conclusion, closing_posture: { value: "", na: true } },
    };
    const result = evaluateAdvance(frameSermon(data), "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/closing posture/i);
  });

  it("rejects when Conclusion Q3 (gospel_empower) is empty", () => {
    const data = {
      ...FILLED_INTRO,
      conclusion: { ...FILLED_CONCLUSION.conclusion, gospel_empower: { value: "", na: false } },
    };
    const result = evaluateAdvance(frameSermon(data), "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/gospel empower/i);
  });
});

describe("SPRD C3 — STAGE_BY_INDEX positioning (Frame at index 3, 1-indexed)", () => {
  it("evaluateAdvance routes fromIndex=3 (Frame) through the composite gate", () => {
    // The all-empty case should reject — confirms the gate fires at index 3.
    const sermon = frameSermon(null);
    const result = evaluateAdvance(sermon, "stage", 3);
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("evaluateAdvance does NOT route fromIndex=2 (Blueprint) through Sermon Frame gate", () => {
    // Blueprint at index 2 with non-empty outline should pass the empty-
    // evidence baseline; the Frame-specific composite gate must NOT fire here.
    const sermon = {
      id: "test",
      outline: '[{"id":"p1","text":"point one"}]',
      functional_elements: "{}",
    };
    const result = evaluateAdvance(sermon as any, "stage", 2);
    expect(result.ok).toBe(true);
  });
});
