import { describe, it, expect } from "vitest";
import { findField, questionId } from "./walkOrder";
import { deriveStudyUnfinishedFromSermon, deriveQuestionStatesFromSermon } from "./sermonState";
import { cumulativeCellSatisfied, deriveThoughtUnitsFromCanvas } from "./studyFields";
import { checkField8Composite } from "./studyAdvancement";

// The N/A policy build (ruled 2026-06-14, canon §5; built 2026-07-02):
//   2b — declared Study questions may be marked N/A ("nothing here" counts as done);
//   2c — per thought-unit CELL on the three cumulative tables may be marked N/A.
// Neither had coverage before this file.

const naAllowedOf = (subPhase, fieldKey, questionKey) =>
  findField("Study", subPhase, fieldKey)?.questions?.find((q) => q.key === questionKey)?.naAllowed === true;

describe("2b — Study-question N/A grants (canon §5 rule 2b)", () => {
  it("grants N/A on exactly the canon-named questions", () => {
    // Observe Where/When (not How)
    expect(naAllowedOf("Observe", "surface_questions", "where")).toBe(true);
    expect(naAllowedOf("Observe", "surface_questions", "when")).toBe(true);
    expect(naAllowedOf("Observe", "surface_questions", "how")).toBe(false);
    // Cross-References + Commentary — field-level, propagated to the primary question
    expect(naAllowedOf("Interpret", "cross_refs", "primary")).toBe(true);
    expect(naAllowedOf("Interpret", "commentary", "primary")).toBe(true);
    // Redemptive Thread's four ways
    for (const k of ["biblical_theme", "promise", "type", "predictive"]) {
      expect(naAllowedOf("RedemptiveThread", "passage_points_to_christ", k)).toBe(true);
    }
    // Implications Fields 1–2
    for (const k of ["about_god", "about_ourselves", "about_christ", "timeless", "doctrines"]) {
      expect(naAllowedOf("Implications", "theological_significance", k)).toBe(true);
    }
    for (const k of ["follow", "forsake", "receive", "settle"]) {
      expect(naAllowedOf("Implications", "personal_implications", k)).toBe(true);
    }
  });

  it("does NOT grant N/A outside the canon list (guards against over-granting)", () => {
    expect(naAllowedOf("Interpret", "deeper_context", "unresolved")).toBe(false);
    expect(naAllowedOf("Interpret", "recurring_ideas", "primary")).toBe(false);
    expect(naAllowedOf("Implications", "pastoral_context", "room_specifics")).toBe(false);
    expect(naAllowedOf("RedemptiveThread", "need_and_character", "human_need")).toBe(false);
  });

  it("an N/A'd Study question drops off the handoff's unfinished list", () => {
    // where is N/A'd (empty value, na true); when is simply empty.
    const sermon = {
      observations: JSON.stringify({
        surface_questions: {
          where: { value: "", na: true },
          when: { value: "", na: false },
        },
      }),
    };
    const unfinished = deriveStudyUnfinishedFromSermon(sermon);
    const keys = unfinished.map((q) => `${q.fieldKey}/${q.questionKey}`);
    expect(keys).not.toContain("surface_questions/where"); // N/A'd → satisfied
    expect(keys).toContain("surface_questions/when"); // empty, not N/A → still unfinished
  });
});

// ── 2c — per-cell N/A on the cumulative tables ──────────────────────────────

const obs = (rows, canvas) =>
  JSON.stringify({
    divisions: {
      ...(canvas ? { canvas: { value: canvas, na: false } } : {}),
      thought_units: { value: rows, na: false },
    },
  });

const MEANING_ID = questionId({
  stage: "Study",
  subPhase: "Interpret",
  fieldKey: "interpretation_synthesis",
  questionKey: "meaning_per_unit",
});

describe("2c — per-cell N/A on cumulative tables (canon §5 rule 2c)", () => {
  it("cumulativeCellSatisfied: text OR the <col>_na sidecar satisfies; neither does not", () => {
    expect(cumulativeCellSatisfied({ meaning: "something" }, "meaning")).toBe(true);
    expect(cumulativeCellSatisfied({ meaning: "", meaning_na: true }, "meaning")).toBe(true);
    expect(cumulativeCellSatisfied({ meaning: "" }, "meaning")).toBe(false);
    expect(cumulativeCellSatisfied({}, "meaning")).toBe(false);
  });

  it("a composite passes when a cell is N/A'd (nothing-here counts as done)", () => {
    const sermon = {
      observations: obs([
        { thought_unit_text: "u1", meaning: "real meaning" },
        { thought_unit_text: "u2", meaning: "", meaning_na: true },
      ]),
      interpretation: JSON.stringify({
        interpretation_synthesis: { meaning_whole: { value: "the whole", na: false } },
      }),
    };
    expect(checkField8Composite(sermon)).toBeNull();
  });

  it("a composite still fails on a genuinely empty (not N/A'd) cell", () => {
    const sermon = {
      observations: obs([
        { thought_unit_text: "u1", meaning: "real" },
        { thought_unit_text: "u2", meaning: "" },
      ]),
      interpretation: JSON.stringify({
        interpretation_synthesis: { meaning_whole: { value: "the whole", na: false } },
      }),
    };
    expect(checkField8Composite(sermon)).toMatch(/Meaning/);
  });

  it("CRITICAL: the per-cell N/A flag survives a canvas re-derivation", () => {
    const existing = [
      { thought_unit_text: "u1", _canvas_row_id: "r1", meaning: "kept text" },
      { thought_unit_text: "u2", _canvas_row_id: "r2", meaning: "", meaning_na: true },
    ];
    // The pastor edits the canvas (same rows, by _canvas_row_id).
    const canvas = [
      { id: "r1", text: "u1 edited", depth: 0 },
      { id: "r2", text: "u2 edited", depth: 0 },
    ];
    const derived = deriveThoughtUnitsFromCanvas(canvas, existing);
    expect(derived[0].meaning).toBe("kept text"); // value preserved
    expect(derived[1].meaning_na).toBe(true); // N/A flag preserved — the whole point
  });

  it("the map counts N/A'd cells: all-N/A table reads answered, mixed reads partial", () => {
    const allNa = {
      observations: obs([
        { thought_unit_text: "u1", meaning: "", meaning_na: true },
        { thought_unit_text: "u2", meaning: "", meaning_na: true },
      ]),
    };
    expect(deriveQuestionStatesFromSermon(allNa)[MEANING_ID].state).toBe("answered");

    const mixed = {
      observations: obs([
        { thought_unit_text: "u1", meaning: "", meaning_na: true },
        { thought_unit_text: "u2", meaning: "" },
      ]),
    };
    expect(deriveQuestionStatesFromSermon(mixed)[MEANING_ID].state).toBe("partial");
  });
});
