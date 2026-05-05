// studyFields.test.js
// A2.0 — structured-list value handling at the data layer.
//
// Covers flattenAnswerValue per sub-shape (canvas / paraphrase / synthesis
// table, including cumulative-column extension), and confirms that
// serializeStructuredField, parseStructuredField, answeredQuestions,
// hasAnyAnswer, flattenToText, and applyFieldValueMap all tolerate
// structured-list values without breaking text-prompt behavior.

import { describe, it, expect } from "vitest";
import {
  flattenAnswerValue,
  answeredQuestions,
  hasAnyAnswer,
  applyFieldValueMap,
  serializeStructuredField,
  parseStructuredField,
  flattenToText,
  setPrimaryAnswer,
  setQuestionAnswer,
  setQuestionNA,
  getQuestionAnswer,
  OBSERVE_FIELDS,
  INTERPRET_FIELDS,
  DEFAULT_QUESTION_KEY,
} from "./studyFields";

// ── Sub-shape sample values ─────────────────────────────────────────────────

const CANVAS = [
  { text: "And you were dead", depth: 0, kind: "main" },
  { text: "in your trespasses and sins", depth: 1, kind: "modifier" },
  { text: "in which you once walked", depth: 1, kind: "modifier" },
  { text: "But God", depth: 0, kind: "main" },
];

const PARAPHRASE = [
  { main_sentence_id: "ms-1", paraphrase: "We were dead in our sins." },
  { main_sentence_id: "ms-2", paraphrase: "But God acted on our behalf." },
];

const TABLE_PHASE1 = [
  { thought_unit_summary: "Spiritual death", after_line: 3, signal: "subject shift" },
  { thought_unit_summary: "But God's mercy",  after_line: 7, signal: "" },
];

const TABLE_PHASE4 = [
  {
    thought_unit_summary: "Spiritual death",
    after_line: 3,
    signal: "subject shift",
    meaning: "Total inability before grace.",
    christ_connection: "Christ alone makes alive.",
    implication: "Don't preach moral effort as a path to life.",
  },
];

// ── flattenAnswerValue ──────────────────────────────────────────────────────

describe("flattenAnswerValue", () => {
  it("returns trimmed string for string input", () => {
    expect(flattenAnswerValue("  hello  ")).toBe("hello");
  });

  it("returns empty for missing or empty values", () => {
    expect(flattenAnswerValue(undefined)).toBe("");
    expect(flattenAnswerValue(null)).toBe("");
    expect(flattenAnswerValue("")).toBe("");
    expect(flattenAnswerValue("   ")).toBe("");
    expect(flattenAnswerValue([])).toBe("");
  });

  it("flattens canvas shape with indent prefixes by depth", () => {
    const out = flattenAnswerValue(CANVAS);
    expect(out).toBe(
      [
        "And you were dead",
        "  in your trespasses and sins",
        "  in which you once walked",
        "But God",
      ].join("\n")
    );
  });

  it("skips canvas entries with empty text", () => {
    const out = flattenAnswerValue([
      { text: "", depth: 0, kind: "main" },
      { text: "real line", depth: 0, kind: "main" },
    ]);
    expect(out).toBe("real line");
  });

  it("flattens paraphrase shape to paraphrase texts joined by newlines", () => {
    const out = flattenAnswerValue(PARAPHRASE);
    expect(out).toBe("We were dead in our sins.\nBut God acted on our behalf.");
  });

  it("skips paraphrase entries with empty paraphrase", () => {
    const out = flattenAnswerValue([
      { main_sentence_id: "ms-1", paraphrase: "" },
      { main_sentence_id: "ms-2", paraphrase: "Real paraphrase." },
    ]);
    expect(out).toBe("Real paraphrase.");
  });

  it("flattens Phase 1 synthesis-table rows with after-line and signal meta", () => {
    const out = flattenAnswerValue(TABLE_PHASE1);
    expect(out).toBe(
      [
        "Spiritual death (after line 3, signal: subject shift)",
        "But God's mercy (after line 7)",
      ].join("\n")
    );
  });

  it("flattens cumulative synthesis-table rows including meaning / christ_connection / implication", () => {
    const out = flattenAnswerValue(TABLE_PHASE4);
    expect(out).toBe(
      "Spiritual death (after line 3, signal: subject shift) — meaning: Total inability before grace.; christ connection: Christ alone makes alive.; implication: Don't preach moral effort as a path to life."
    );
  });

  it("skips synthesis-table rows with empty thought_unit_summary", () => {
    const out = flattenAnswerValue([
      { thought_unit_summary: "", after_line: 1, signal: "" },
      { thought_unit_summary: "Real summary", after_line: 5, signal: "" },
    ]);
    expect(out).toBe("Real summary (after line 5)");
  });

  it("returns empty when canvas/paraphrase/table values contain only empty entries", () => {
    expect(flattenAnswerValue([{ text: "", depth: 0, kind: "main" }])).toBe("");
    expect(flattenAnswerValue([{ main_sentence_id: "x", paraphrase: "" }])).toBe("");
    expect(flattenAnswerValue([{ thought_unit_summary: "", after_line: 1, signal: "" }])).toBe("");
  });

  it("falls back to JSON for unknown structured shapes", () => {
    const out = flattenAnswerValue([{ unknown_key: "foo" }]);
    expect(out).toBe('[{"unknown_key":"foo"}]');
  });
});

// ── serialize / parse round-trip with structured-list values ───────────────

describe("serializeStructuredField + parseStructuredField round-trip", () => {
  it("preserves canvas list value", () => {
    const data = setQuestionAnswer({}, "divisions", "sentence_layout", CANVAS);
    const json = serializeStructuredField(data);
    const back = parseStructuredField(json);
    expect(getQuestionAnswer(back, "divisions", "sentence_layout")).toEqual(CANVAS);
  });

  it("preserves paraphrase list value", () => {
    const data = setQuestionAnswer({}, "divisions", "paraphrases", PARAPHRASE);
    const json = serializeStructuredField(data);
    const back = parseStructuredField(json);
    expect(getQuestionAnswer(back, "divisions", "paraphrases")).toEqual(PARAPHRASE);
  });

  it("preserves synthesis-table list value with cumulative columns", () => {
    const data = setQuestionAnswer({}, "divisions", "thought_units", TABLE_PHASE4);
    const json = serializeStructuredField(data);
    const back = parseStructuredField(json);
    expect(getQuestionAnswer(back, "divisions", "thought_units")).toEqual(TABLE_PHASE4);
  });

  it("strips an empty list value from output", () => {
    const data = setQuestionAnswer({}, "divisions", "sentence_layout", []);
    expect(serializeStructuredField(data)).toBe("");
  });

  it("preserves a list value alongside an N/A flag", () => {
    let data = setQuestionAnswer({}, "divisions", "sentence_layout", CANVAS);
    data = setQuestionNA(data, "divisions", "sentence_layout", true);
    const json = serializeStructuredField(data);
    const back = parseStructuredField(json);
    expect(getQuestionAnswer(back, "divisions", "sentence_layout")).toBe(""); // N/A masks reads
    expect(back.divisions.sentence_layout.na).toBe(true);
    expect(back.divisions.sentence_layout.value).toEqual(CANVAS);
  });

  it("co-exists with text-prompt envelope shape on sibling fields", () => {
    let data = setPrimaryAnswer({}, "context", "Surrounding context note.");
    data = setQuestionAnswer(data, "divisions", "sentence_layout", CANVAS);
    const json = serializeStructuredField(data);
    const back = parseStructuredField(json);
    expect(getQuestionAnswer(back, "context", DEFAULT_QUESTION_KEY)).toBe("Surrounding context note.");
    expect(getQuestionAnswer(back, "divisions", "sentence_layout")).toEqual(CANVAS);
  });
});

// ── answeredQuestions / hasAnyAnswer with list values ──────────────────────

describe("answeredQuestions with structured-list values", () => {
  it("counts a non-empty canvas as answered", () => {
    const data = setQuestionAnswer({}, "divisions", "sentence_layout", CANVAS);
    expect(answeredQuestions(data)).toEqual([
      {
        fieldKey: "divisions",
        questionKey: "sentence_layout",
        value: flattenAnswerValue(CANVAS),
      },
    ]);
    expect(hasAnyAnswer(data)).toBe(true);
  });

  it("counts a non-empty synthesis table as answered", () => {
    const data = setQuestionAnswer({}, "divisions", "thought_units", TABLE_PHASE1);
    const answered = answeredQuestions(data);
    expect(answered).toHaveLength(1);
    expect(answered[0]).toMatchObject({ fieldKey: "divisions", questionKey: "thought_units" });
    expect(answered[0].value).toContain("Spiritual death");
  });

  it("does not count an all-empty list as answered", () => {
    const blank = [{ text: "", depth: 0, kind: "main" }];
    const data = setQuestionAnswer({}, "divisions", "sentence_layout", blank);
    expect(answeredQuestions(data)).toEqual([]);
    expect(hasAnyAnswer(data)).toBe(false);
  });

  it("skips list-valued questions marked N/A even when populated", () => {
    let data = setQuestionAnswer({}, "divisions", "sentence_layout", CANVAS);
    data = setQuestionNA(data, "divisions", "sentence_layout", true);
    expect(answeredQuestions(data)).toEqual([]);
    expect(hasAnyAnswer(data)).toBe(false);
  });

  it("returns string `value` for both text-prompt and structured questions in one phase", () => {
    let data = setPrimaryAnswer({}, "context", "Surrounding context note.");
    data = setQuestionAnswer(data, "divisions", "sentence_layout", CANVAS);
    const answered = answeredQuestions(data);
    expect(answered).toHaveLength(2);
    for (const a of answered) expect(typeof a.value).toBe("string");
  });
});

// ── flattenToText with list values ─────────────────────────────────────────

describe("flattenToText with structured-list values", () => {
  it("labels a list-valued multi-question answer with the field label and question key", () => {
    // Field 4 (`divisions`) is multi-question after B1.5 — write to the
    // `sentence_layout` (canvas-kind) question, not `primary`.
    const data = setQuestionAnswer({}, "divisions", "sentence_layout", CANVAS);
    const out = flattenToText(data, OBSERVE_FIELDS);
    expect(out).toContain("Divisions / Thought Units:");
    expect(out).toContain("sentence_layout:");
    expect(out).toContain("And you were dead");
    expect(out).toContain("in your trespasses and sins");
  });

  it("emits text-prompt and structured-list fields side by side", () => {
    // `context` is multi-question (B1.2): use a real question key.
    let data = setQuestionAnswer({}, "context", "before", "Sets up the new humanity argument.");
    data = setQuestionAnswer(data, "divisions", "sentence_layout", CANVAS);
    const out = flattenToText(data, OBSERVE_FIELDS);
    expect(out).toContain("Context:");
    expect(out).toContain("Sets up the new humanity argument.");
    expect(out).toContain("Divisions / Thought Units:");
  });

  it("preserves legacy_notes ahead of structured fields", () => {
    let data = { legacy_notes: "Old free-text observations from a 2025 sermon." };
    data = setQuestionAnswer(data, "divisions", "sentence_layout", CANVAS);
    const out = flattenToText(data, OBSERVE_FIELDS);
    expect(out.startsWith("Old free-text observations from a 2025 sermon.")).toBe(true);
    expect(out).toContain("Divisions / Thought Units:");
  });
});

// ── flattenToText multi-question support (B1.7) ────────────────────────────

describe("flattenToText surfaces multi-question fields under their field label", () => {
  it("renders each answered question on its own line under the field label", () => {
    let data = setQuestionAnswer({}, "surface_questions", "where", "Galilee");
    data = setQuestionAnswer(data, "surface_questions", "when", "After the Sabbath");
    data = setQuestionAnswer(data, "surface_questions", "how", "On a mountain, in front of disciples");
    const out = flattenToText(data, OBSERVE_FIELDS);
    expect(out).toContain("Surface Questions:");
    expect(out).toContain("where: Galilee");
    expect(out).toContain("when: After the Sabbath");
    expect(out).toContain("how: On a mountain, in front of disciples");
  });

  it("skips N/A questions in multi-question flattening", () => {
    let data = setQuestionAnswer({}, "surface_questions", "where", "Galilee");
    data = setQuestionNA(data, "surface_questions", "when", true);
    data = setQuestionAnswer(data, "surface_questions", "how", "On a mountain");
    const out = flattenToText(data, OBSERVE_FIELDS);
    expect(out).toContain("where: Galilee");
    expect(out).toContain("how: On a mountain");
    expect(out).not.toContain("when:");
  });

  it("skips a multi-question field entirely when no questions are answered", () => {
    const data = setQuestionAnswer({}, "context", "before", "");
    const out = flattenToText(data, OBSERVE_FIELDS);
    // No `Context:` block since no question carries content.
    expect(out).not.toContain("Context:");
  });

  it("preserves single-primary-question back-compat for fields without a `questions` array", () => {
    // Phase 1 Field 7 (`big_ideas`) is still single-primary in B1.0.
    const data = setPrimaryAnswer({}, "big_ideas", "Death and life; mercy and wrath.");
    const out = flattenToText(data, OBSERVE_FIELDS);
    expect(out).toContain("Big Ideas: Death and life; mercy and wrath.");
    // No multi-question block format for this field.
    expect(out).not.toMatch(/Big Ideas:\n\s+primary:/);
  });

  it("multi-question Phase 2 deeper_context surfaces both questions", () => {
    let data = setQuestionAnswer({}, "deeper_context", "unresolved", "Word usage of σάρξ in v. 3.");
    data = setQuestionAnswer(data, "deeper_context", "book_argument", "The new humanity Paul is constructing.");
    const out = flattenToText(data, INTERPRET_FIELDS);
    expect(out).toContain("Deeper Context:");
    expect(out).toContain("unresolved: Word usage of σάρξ in v. 3.");
    expect(out).toContain("book_argument: The new humanity Paul is constructing.");
  });
});

// ── applyFieldValueMap with arrays ──────────────────────────────────────────

describe("applyFieldValueMap accepts both strings and arrays", () => {
  it("writes string values to primary", () => {
    const out = applyFieldValueMap({}, { context: "Note." });
    expect(getQuestionAnswer(out, "context", DEFAULT_QUESTION_KEY)).toBe("Note.");
  });

  it("writes array values to primary", () => {
    const out = applyFieldValueMap({}, { divisions: CANVAS });
    expect(getQuestionAnswer(out, "divisions", DEFAULT_QUESTION_KEY)).toEqual(CANVAS);
  });

  it("rejects unsupported value types (numbers, plain objects, null)", () => {
    const out = applyFieldValueMap(
      {},
      { a: 42, b: { primary: "nested" }, c: null, context: "Kept." }
    );
    expect(out.a).toBeUndefined();
    expect(out.b).toBeUndefined();
    expect(out.c).toBeUndefined();
    expect(getQuestionAnswer(out, "context", DEFAULT_QUESTION_KEY)).toBe("Kept.");
  });
});
