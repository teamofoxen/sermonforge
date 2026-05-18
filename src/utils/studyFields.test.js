// studyFields.test.js
// A2.0 — structured-list value handling at the data layer.
//
// Covers flattenAnswerValue per sub-shape (canvas / paraphrase / synthesis
// table, including cumulative-column extension), and confirms that
// serializeStructuredField, parseStructuredField, answeredQuestions, and
// applyFieldValueMap all tolerate structured-list values without breaking
// text-prompt behavior. (hasAnyAnswer / flattenToText / hasMinimumSubstrate /
// flattenExegesis were retired in the trail deletion sweep, Phase A — they
// were the AI-context pipeline with zero live callers post-ARI.)

import { describe, it, expect } from "vitest";
import {
  flattenAnswerValue,
  answeredQuestions,
  applyFieldValueMap,
  serializeStructuredField,
  parseStructuredField,
  setPrimaryAnswer,
  setQuestionAnswer,
  setQuestionNA,
  getQuestionAnswer,
  generateRowId,
  deriveThoughtUnitsFromCanvas,
  setDivisionsCanvas,
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

// ── answeredQuestions with list values ────────────────────────────────────

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
  });

  it("skips list-valued questions marked N/A even when populated", () => {
    let data = setQuestionAnswer({}, "divisions", "sentence_layout", CANVAS);
    data = setQuestionNA(data, "divisions", "sentence_layout", true);
    expect(answeredQuestions(data)).toEqual([]);
  });

  it("returns string `value` for both text-prompt and structured questions in one phase", () => {
    let data = setPrimaryAnswer({}, "context", "Surrounding context note.");
    data = setQuestionAnswer(data, "divisions", "sentence_layout", CANVAS);
    const answered = answeredQuestions(data);
    expect(answered).toHaveLength(2);
    for (const a of answered) expect(typeof a.value).toBe("string");
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

// ── Phase 4 Sprint 2 — unified-canvas helpers ─────────────────────────────
//
// Field 3's three legacy questions collapse into a single canvas. Coverage:
//   - flattenAnswerValue distinguishes the unified shape from legacy paraphrase
//     blocks (no false positive on rows carrying both `paraphrase` and `text`).
//   - deriveThoughtUnitsFromCanvas: empty / basic / cumulative-merge / canvas
//     edits (insert/delete/reorder) / non-matching ids (degraded, no crash).
//   - setDivisionsCanvas: round-trip; cross-phase cumulative columns survive
//     a canvas reorder via _canvas_row_id matching.
//   - parseStructuredField: legacy three-question shape hydrates `canvas`,
//     preserves existing `thought_units` array intact.

const UNIFIED_CANVAS_FIXTURE = [
  { id: "row-1", text: "And you were dead",                  depth: 0, kind: "main",     paraphrase: "We were dead in our sins." },
  { id: "row-2", text: "in your trespasses and sins",        depth: 1, kind: "modifier", paraphrase: "" },
  { id: "row-3", text: "in which you once walked",           depth: 1, kind: "modifier", paraphrase: "",
    thought_unit_end: { summary: "Spiritual death", signal: "subject shift" } },
  { id: "row-4", text: "But God",                            depth: 0, kind: "main",     paraphrase: "But God acted on our behalf.",
    thought_unit_end: { summary: "But God's mercy", signal: "" } },
];

describe("flattenAnswerValue — unified-canvas shape", () => {
  it("renders structure with inline paraphrase and thought-unit-end annotations", () => {
    const out = flattenAnswerValue(UNIFIED_CANVAS_FIXTURE);
    expect(out).toBe(
      [
        "And you were dead — paraphrase: We were dead in our sins.",
        "  in your trespasses and sins",
        "  in which you once walked — thought unit \"Spiritual death\" ends here (signal: subject shift)",
        "But God — paraphrase: But God acted on our behalf. — thought unit \"But God's mercy\" ends here",
      ].join("\n")
    );
  });

  it("does not mistake a unified-canvas row for legacy paraphrase shape", () => {
    // Legacy paraphrase detection now keys on `main_sentence_id`. A row that
    // has `paraphrase` but no `main_sentence_id` (i.e. unified canvas) must
    // not fall through into the paraphrase branch.
    const onlyMainNoTUE = [
      { id: "x", text: "Solo main", depth: 0, kind: "main", paraphrase: "Pastor voice." },
    ];
    expect(flattenAnswerValue(onlyMainNoTUE)).toBe("Solo main — paraphrase: Pastor voice.");
  });

  it("legacy paraphrase blocks still flatten to paraphrase text only", () => {
    const out = flattenAnswerValue(PARAPHRASE);
    expect(out).toBe("We were dead in our sins.\nBut God acted on our behalf.");
  });
});

describe("generateRowId", () => {
  it("returns a non-empty string id", () => {
    const id = generateRowId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns a unique id on each call", () => {
    const ids = new Set();
    for (let i = 0; i < 50; i++) ids.add(generateRowId());
    expect(ids.size).toBe(50);
  });
});

describe("deriveThoughtUnitsFromCanvas", () => {
  it("returns [] for empty / non-array input", () => {
    expect(deriveThoughtUnitsFromCanvas([])).toEqual([]);
    expect(deriveThoughtUnitsFromCanvas(null)).toEqual([]);
    expect(deriveThoughtUnitsFromCanvas(undefined)).toEqual([]);
  });

  it("derives one row per canvas row that carries thought_unit_end", () => {
    const out = deriveThoughtUnitsFromCanvas(UNIFIED_CANVAS_FIXTURE);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      thought_unit_summary: "Spiritual death",
      after_line: 3,
      signal: "subject shift",
      _canvas_row_id: "row-3",
    });
    expect(out[1]).toMatchObject({
      thought_unit_summary: "But God's mercy",
      after_line: 4,
      signal: "",
      _canvas_row_id: "row-4",
    });
  });

  it("skips rows where thought_unit_end is missing or not an object", () => {
    const canvas = [
      { id: "a", text: "x", depth: 0, kind: "main", paraphrase: "" },
      { id: "b", text: "y", depth: 0, kind: "main", paraphrase: "", thought_unit_end: undefined },
      { id: "c", text: "z", depth: 0, kind: "main", paraphrase: "",
        thought_unit_end: { summary: "Kept", signal: "" } },
    ];
    const out = deriveThoughtUnitsFromCanvas(canvas);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ thought_unit_summary: "Kept", _canvas_row_id: "c" });
  });

  it("merges cumulative columns from existing thought_units by _canvas_row_id", () => {
    const existing = [
      { thought_unit_summary: "Spiritual death", after_line: 3, signal: "subject shift",
        _canvas_row_id: "row-3",
        meaning: "Total inability before grace.",
        christ_connection: "Christ alone makes alive.",
        implication: "Don't preach effort as the path to life." },
      { thought_unit_summary: "But God's mercy", after_line: 4, signal: "",
        _canvas_row_id: "row-4",
        meaning: "Sovereign initiative." },
    ];
    const out = deriveThoughtUnitsFromCanvas(UNIFIED_CANVAS_FIXTURE, existing);
    expect(out[0].meaning).toBe("Total inability before grace.");
    expect(out[0].christ_connection).toBe("Christ alone makes alive.");
    expect(out[0].implication).toBe("Don't preach effort as the path to life.");
    expect(out[1].meaning).toBe("Sovereign initiative.");
    expect(out[1].christ_connection).toBeUndefined();
  });

  it("preserves cumulative columns through canvas reorder (id-based merge)", () => {
    // Pastor reorders: row-4 moves before row-3. After_line shifts but ids
    // stay; meaning/cc/implication should follow the row's id, not its position.
    const reordered = [
      { id: "row-4", text: "But God", depth: 0, kind: "main", paraphrase: "But God acted.",
        thought_unit_end: { summary: "But God's mercy", signal: "" } },
      { id: "row-1", text: "And you were dead", depth: 0, kind: "main", paraphrase: "We were dead." },
      { id: "row-3", text: "in which you once walked", depth: 1, kind: "modifier", paraphrase: "",
        thought_unit_end: { summary: "Spiritual death", signal: "subject shift" } },
    ];
    const existing = [
      { thought_unit_summary: "Spiritual death", after_line: 3, _canvas_row_id: "row-3",
        meaning: "Total inability." },
      { thought_unit_summary: "But God's mercy", after_line: 4, _canvas_row_id: "row-4",
        meaning: "Sovereign initiative." },
    ];
    const out = deriveThoughtUnitsFromCanvas(reordered, existing);
    expect(out).toHaveLength(2);
    // Row-4 now at canvas index 0 → after_line 1.
    expect(out[0]).toMatchObject({ _canvas_row_id: "row-4", after_line: 1, meaning: "Sovereign initiative." });
    // Row-3 now at canvas index 2 → after_line 3.
    expect(out[1]).toMatchObject({ _canvas_row_id: "row-3", after_line: 3, meaning: "Total inability." });
  });

  it("handles canvas insert without losing cumulative columns on surviving rows", () => {
    const inserted = [
      { id: "row-new", text: "New top row", depth: 0, kind: "main", paraphrase: "Fresh." },
      ...UNIFIED_CANVAS_FIXTURE,
    ];
    const existing = [
      { thought_unit_summary: "Spiritual death", after_line: 3, _canvas_row_id: "row-3",
        meaning: "Old meaning." },
    ];
    const out = deriveThoughtUnitsFromCanvas(inserted, existing);
    const sd = out.find((r) => r._canvas_row_id === "row-3");
    expect(sd).toBeTruthy();
    expect(sd.meaning).toBe("Old meaning.");
    expect(sd.after_line).toBe(4); // shifted by one
  });

  it("handles canvas delete by dropping the deleted row's thought-unit derivation", () => {
    // Drop row-3 (the one carrying the Spiritual death thought_unit_end).
    const deleted = UNIFIED_CANVAS_FIXTURE.filter((r) => r.id !== "row-3");
    const existing = [
      { thought_unit_summary: "Spiritual death", after_line: 3, _canvas_row_id: "row-3",
        meaning: "Old." },
      { thought_unit_summary: "But God's mercy", after_line: 4, _canvas_row_id: "row-4",
        meaning: "Kept." },
    ];
    const out = deriveThoughtUnitsFromCanvas(deleted, existing);
    expect(out).toHaveLength(1);
    expect(out[0]._canvas_row_id).toBe("row-4");
    expect(out[0].meaning).toBe("Kept.");
  });

  it("falls back to after_line match when _canvas_row_id is absent (legacy data)", () => {
    // Existing thought_units carries no _canvas_row_id (legacy migration path).
    const existing = [
      { thought_unit_summary: "Spiritual death", after_line: 3, signal: "subject shift",
        meaning: "Legacy meaning." },
    ];
    const out = deriveThoughtUnitsFromCanvas(UNIFIED_CANVAS_FIXTURE, existing);
    const sd = out.find((r) => r._canvas_row_id === "row-3");
    expect(sd).toBeTruthy();
    expect(sd.meaning).toBe("Legacy meaning.");
  });

  it("does not crash when no existing rows match — cumulative columns simply absent", () => {
    const existing = [
      { thought_unit_summary: "Stale", after_line: 99, _canvas_row_id: "row-ghost",
        meaning: "Lost." },
    ];
    const out = deriveThoughtUnitsFromCanvas(UNIFIED_CANVAS_FIXTURE, existing);
    expect(out).toHaveLength(2);
    for (const r of out) {
      expect(r.meaning).toBeUndefined();
      expect(r.christ_connection).toBeUndefined();
      expect(r.implication).toBeUndefined();
    }
  });
});

describe("setDivisionsCanvas — materialization", () => {
  it("writes both canvas and derived thought_units into fieldData", () => {
    const next = setDivisionsCanvas({}, UNIFIED_CANVAS_FIXTURE);
    expect(getQuestionAnswer(next, "divisions", "canvas")).toEqual(UNIFIED_CANVAS_FIXTURE);
    const tus = getQuestionAnswer(next, "divisions", "thought_units");
    expect(tus).toHaveLength(2);
    expect(tus[0]._canvas_row_id).toBe("row-3");
    expect(tus[1]._canvas_row_id).toBe("row-4");
  });

  it("preserves cross-phase cumulative columns when canvas is rewritten", () => {
    // Initial canvas + materialization.
    let data = setDivisionsCanvas({}, UNIFIED_CANVAS_FIXTURE);
    // Phase 2 writes meaning into thought_units (simulating cross-phase write).
    const tus = getQuestionAnswer(data, "divisions", "thought_units");
    const phase2Tus = tus.map((r, i) => ({ ...r, meaning: `M${i}` }));
    data = setQuestionAnswer(data, "divisions", "thought_units", phase2Tus);

    // Pastor reorders canvas — row-4 to top.
    const reordered = [
      UNIFIED_CANVAS_FIXTURE[3],
      ...UNIFIED_CANVAS_FIXTURE.slice(0, 3),
    ];
    data = setDivisionsCanvas(data, reordered);

    const newTus = getQuestionAnswer(data, "divisions", "thought_units");
    const row4 = newTus.find((r) => r._canvas_row_id === "row-4");
    const row3 = newTus.find((r) => r._canvas_row_id === "row-3");
    expect(row4.meaning).toBe("M1");
    expect(row3.meaning).toBe("M0");
  });

  it("round-trips through serialize/parse without losing the canvas or materialized thought_units", () => {
    const data = setDivisionsCanvas({}, UNIFIED_CANVAS_FIXTURE);
    const json = serializeStructuredField(data);
    const back = parseStructuredField(json);
    expect(getQuestionAnswer(back, "divisions", "canvas")).toEqual(UNIFIED_CANVAS_FIXTURE);
    const tus = getQuestionAnswer(back, "divisions", "thought_units");
    expect(tus).toHaveLength(2);
  });
});

describe("parseStructuredField — defensive read-merge of legacy three-question divisions shape", () => {
  it("hydrates canvas from sentence_layout + paraphrases + thought_units", () => {
    const legacyData = {
      divisions: {
        sentence_layout: {
          value: [
            { text: "And you were dead",         depth: 0, kind: "main" },
            { text: "in your trespasses and sins", depth: 1, kind: "modifier" },
            { text: "in which you once walked",    depth: 1, kind: "modifier" },
            { text: "But God",                     depth: 0, kind: "main" },
          ],
          na: false,
        },
        paraphrases: {
          value: [
            { main_sentence_id: "ms-0", paraphrase: "We were dead in our sins." },
            { main_sentence_id: "ms-1", paraphrase: "But God acted on our behalf." },
          ],
          na: false,
        },
        thought_units: {
          value: [
            { thought_unit_summary: "Spiritual death", after_line: 3, signal: "subject shift",
              meaning: "Total inability." },
            { thought_unit_summary: "But God's mercy",  after_line: 4, signal: "" },
          ],
          na: false,
        },
      },
    };
    const out = parseStructuredField(JSON.stringify(legacyData));
    const canvas = out.divisions.canvas.value;
    expect(canvas).toHaveLength(4);
    // Main rows hydrated with paraphrase by ms-N ordinal.
    expect(canvas[0].text).toBe("And you were dead");
    expect(canvas[0].kind).toBe("main");
    expect(canvas[0].paraphrase).toBe("We were dead in our sins.");
    expect(canvas[3].text).toBe("But God");
    expect(canvas[3].paraphrase).toBe("But God acted on our behalf.");
    // Modifier rows have empty paraphrase.
    expect(canvas[1].paraphrase).toBe("");
    expect(canvas[2].paraphrase).toBe("");
    // Every row gets a fresh id.
    for (const row of canvas) expect(typeof row.id).toBe("string");
    // Thought_unit_end attached by after_line (1-indexed).
    expect(canvas[2].thought_unit_end).toEqual({ summary: "Spiritual death", signal: "subject shift" });
    expect(canvas[3].thought_unit_end).toEqual({ summary: "But God's mercy", signal: "" });
  });

  it("preserves the legacy thought_units array intact (cumulative columns survive)", () => {
    const legacyData = {
      divisions: {
        sentence_layout: { value: [{ text: "x", depth: 0, kind: "main" }], na: false },
        paraphrases: { value: [], na: false },
        thought_units: {
          value: [
            { thought_unit_summary: "Stays", after_line: 1, signal: "",
              meaning: "Phase 2 work.",
              christ_connection: "Phase 3 work.",
              implication: "Phase 4 work." },
          ],
          na: false,
        },
      },
    };
    const out = parseStructuredField(JSON.stringify(legacyData));
    const tus = out.divisions.thought_units.value;
    expect(tus).toHaveLength(1);
    expect(tus[0].meaning).toBe("Phase 2 work.");
    expect(tus[0].christ_connection).toBe("Phase 3 work.");
    expect(tus[0].implication).toBe("Phase 4 work.");
  });

  it("is a no-op when divisions already carries a canvas key", () => {
    const alreadyMigrated = {
      divisions: {
        canvas: { value: UNIFIED_CANVAS_FIXTURE, na: false },
        thought_units: { value: [{ thought_unit_summary: "Kept", after_line: 1, signal: "" }], na: false },
      },
    };
    const out = parseStructuredField(JSON.stringify(alreadyMigrated));
    expect(out.divisions.canvas.value).toEqual(UNIFIED_CANVAS_FIXTURE);
    expect(out.divisions.thought_units.value).toHaveLength(1);
  });

  it("is a no-op for columns without a divisions field (e.g. interpretation)", () => {
    const interpretation = {
      deeper_context: { unresolved: { value: "Some question.", na: false } },
    };
    const out = parseStructuredField(JSON.stringify(interpretation));
    expect(out.divisions).toBeUndefined();
    expect(out.deeper_context.unresolved.value).toBe("Some question.");
  });
});

// ── Cross-phase verification (Phase 4 Sprint 2 Session 3) ─────────────────
//
// Session 3's named goal: verify that canvas edits propagate through
// `StudyTab.updateStructured` (parse → setDivisionsCanvas → serialize) so
// Phase 2/3/4 cumulative-synthesis-tables read the right rows after every
// canvas operation. This is the wire-level integration the helper-only
// tests above don't exercise as a single flow.
//
// `updateObservations` mirrors `StudyTab.updateStructured`'s special case
// for `divisions/canvas` writes — the same code path the workspace runs on
// every keystroke. Every test in this block works against the
// sermon-level JSON contract (the string that lives on the `observations`
// column), so any drift in serialize/parse/materialize would surface here.

describe("cross-phase: canvas edits propagate through serialize/parse without losing Phase 2/3/4 cumulative columns", () => {
  const updateObservations = (observationsJson, canvas) => {
    const data = parseStructuredField(observationsJson || "{}");
    const next = setDivisionsCanvas(data, canvas);
    return serializeStructuredField(next);
  };

  it("first canvas write produces a sermon-level JSON containing both canvas and thought_units", () => {
    const json = updateObservations("", UNIFIED_CANVAS_FIXTURE);
    expect(typeof json).toBe("string");
    expect(json.length).toBeGreaterThan(0);

    const back = parseStructuredField(json);
    expect(back.divisions.canvas.value).toEqual(UNIFIED_CANVAS_FIXTURE);
    expect(Array.isArray(back.divisions.thought_units.value)).toBe(true);
    expect(back.divisions.thought_units.value).toHaveLength(2);
  });

  it("Phase 2 read of the materialized thought_units array sees the canonical cross-phase shape", () => {
    // Cumulative-synthesis-table at Phase 2 reads observations.divisions.thought_units.
    // Every row must carry the back-pointer + structural meta needed for the
    // table's read-only columns (Thought unit / After line / Signal).
    const json = updateObservations("", UNIFIED_CANVAS_FIXTURE);
    const obs = parseStructuredField(json);
    const thoughtUnits = obs.divisions.thought_units.value;
    for (const row of thoughtUnits) {
      expect(typeof row._canvas_row_id).toBe("string");
      expect(row._canvas_row_id.length).toBeGreaterThan(0);
      expect(typeof row.after_line).toBe("number");
      expect(typeof row.thought_unit_summary).toBe("string");
    }
  });

  it("Phase 2 writes meaning; canvas reorder preserves it via _canvas_row_id", () => {
    // Step 1 — pastor builds canvas in Phase 1.
    let observationsJson = updateObservations("", UNIFIED_CANVAS_FIXTURE);

    // Step 2 — pastor in Phase 2 reads thought_units, adds meaning per row.
    let obs = parseStructuredField(observationsJson);
    const tus = obs.divisions.thought_units.value;
    const tusWithMeaning = tus.map((r, i) => ({ ...r, meaning: `Phase 2 meaning ${i}` }));
    obs = setQuestionAnswer(obs, "divisions", "thought_units", tusWithMeaning);
    observationsJson = serializeStructuredField(obs);

    // Step 3 — pastor returns to Phase 1 and reorders canvas (last row to top).
    const reorderedCanvas = [
      UNIFIED_CANVAS_FIXTURE[3],
      ...UNIFIED_CANVAS_FIXTURE.slice(0, 3),
    ];
    observationsJson = updateObservations(observationsJson, reorderedCanvas);

    // Step 4 — Phase 2 reads again. Meaning must follow row ids, not positions.
    obs = parseStructuredField(observationsJson);
    const newTus = obs.divisions.thought_units.value;
    const row4 = newTus.find((r) => r._canvas_row_id === "row-4");
    const row3 = newTus.find((r) => r._canvas_row_id === "row-3");
    expect(row4?.meaning).toBe("Phase 2 meaning 1");
    expect(row3?.meaning).toBe("Phase 2 meaning 0");
  });

  it("canvas insert preserves all existing Phase 2/3/4 cumulative columns", () => {
    // Build canvas + populate cumulative columns at Phase 2 / 3 / 4.
    let observationsJson = updateObservations("", UNIFIED_CANVAS_FIXTURE);
    let obs = parseStructuredField(observationsJson);
    const tus = obs.divisions.thought_units.value;
    obs = setQuestionAnswer(
      obs,
      "divisions",
      "thought_units",
      tus.map((r, i) => ({
        ...r,
        meaning: `M${i}`,
        christ_connection: `CC${i}`,
        implication: `I${i}`,
      })),
    );
    observationsJson = serializeStructuredField(obs);

    // Insert a new top-of-canvas row (no thought_unit_end on it).
    const inserted = [
      { id: "row-new", text: "Setup line.", depth: 0, kind: "main", paraphrase: "" },
      ...UNIFIED_CANVAS_FIXTURE,
    ];
    observationsJson = updateObservations(observationsJson, inserted);

    obs = parseStructuredField(observationsJson);
    const newTus = obs.divisions.thought_units.value;
    expect(newTus).toHaveLength(2);
    const r3 = newTus.find((r) => r._canvas_row_id === "row-3");
    const r4 = newTus.find((r) => r._canvas_row_id === "row-4");
    expect(r3).toMatchObject({ meaning: "M0", christ_connection: "CC0", implication: "I0" });
    expect(r4).toMatchObject({ meaning: "M1", christ_connection: "CC1", implication: "I1" });
    // After_line shifts by one because of the prepended row.
    expect(r3.after_line).toBe(4);
    expect(r4.after_line).toBe(5);
  });

  it("canvas-delete drops the corresponding thought_units row and its Phase 2/3/4 columns", () => {
    let observationsJson = updateObservations("", UNIFIED_CANVAS_FIXTURE);
    let obs = parseStructuredField(observationsJson);
    const tus = obs.divisions.thought_units.value;
    obs = setQuestionAnswer(
      obs,
      "divisions",
      "thought_units",
      tus.map((r, i) => ({
        ...r,
        meaning: `M${i}`,
        christ_connection: `CC${i}`,
        implication: `I${i}`,
      })),
    );
    observationsJson = serializeStructuredField(obs);

    // Delete row-3 (the unit-end carrier for "Spiritual death").
    const trimmed = UNIFIED_CANVAS_FIXTURE.filter((r) => r.id !== "row-3");
    observationsJson = updateObservations(observationsJson, trimmed);

    obs = parseStructuredField(observationsJson);
    const newTus = obs.divisions.thought_units.value;
    expect(newTus).toHaveLength(1);
    expect(newTus[0]._canvas_row_id).toBe("row-4");
    expect(newTus[0].meaning).toBe("M1");
  });

  it("legacy three-question shape migrates to canvas on read; first canvas re-write keeps thought_units cumulative columns intact via after_line fallback", () => {
    // Sermon arrives with legacy shape (no production sermons exist, so this
    // is the defensive path). thought_units carries an existing meaning.
    const legacyJson = JSON.stringify({
      divisions: {
        sentence_layout: {
          value: [
            { text: "And you were dead", depth: 0, kind: "main" },
            { text: "in your trespasses and sins", depth: 1, kind: "modifier" },
          ],
          na: false,
        },
        paraphrases: {
          value: [{ main_sentence_id: "ms-0", paraphrase: "We were dead in our sins." }],
          na: false,
        },
        thought_units: {
          value: [
            {
              thought_unit_summary: "Spiritual death",
              after_line: 2,
              signal: "subject shift",
              meaning: "Total inability before grace.",
            },
          ],
          na: false,
        },
      },
    });

    // Read migrates → canvas hydrated, thought_units preserved as-is.
    let obs = parseStructuredField(legacyJson);
    expect(Array.isArray(obs.divisions.canvas.value)).toBe(true);
    expect(obs.divisions.thought_units.value[0].meaning).toBe("Total inability before grace.");

    // Pastor edits canvas (rewrites a row). The hydrated canvas has the
    // legacy thought_unit_end attached at after_line=2 (row index 1, the
    // modifier). After re-write through setDivisionsCanvas, derive uses the
    // after_line fallback (legacy thought_units row has no _canvas_row_id)
    // so the meaning survives.
    const editedCanvas = obs.divisions.canvas.value.map((r) =>
      r.depth === 0 ? { ...r, paraphrase: "Updated paraphrase." } : r,
    );
    const newJson = (() => {
      const next = setDivisionsCanvas(obs, editedCanvas);
      return serializeStructuredField(next);
    })();

    obs = parseStructuredField(newJson);
    const tus = obs.divisions.thought_units.value;
    expect(tus).toHaveLength(1);
    expect(tus[0].meaning).toBe("Total inability before grace.");
  });
});
