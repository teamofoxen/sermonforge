// studyFields.test.js
// A2.0 — structured-list value handling at the data layer.
//
// Covers flattenAnswerValue (canvas shape + JSON fallback), serialize/parse
// round-trips for structured-list values, deriveThoughtUnitsFromCanvas (the
// depth-0 row derivation per era-2-primacy ruling 8), setDivisionsCanvas
// materialization round-trip, parseStructuredField's no-op behavior on
// already-shape data, and cross-phase canvas-write JSON propagation.
//
// Retirements:
//   - hasAnyAnswer / flattenToText / hasMinimumSubstrate / flattenExegesis
//     retired in the trail deletion sweep, Phase A (zero post-ARI callers).
//   - answeredQuestions retired in Phase F (sole caller was the wall-layer
//     evidence builder).
//   - Paraphrase-block flatten path, Phase 1 synthesis-table shape
//     (thought_unit_summary + after_line + signal), thought_unit_end-based
//     canvas derivation, and parseStructuredField's legacy three-question
//     hydration shim retired by the Field 3 unified-canvas rework (era-2-
//     primacy ruling 8, 2026-05-05 → 2026-05-06). The 26 stale tests that
//     covered those paths (24 surfaced by the audit + 2 downstream
//     fixture-dependency failures) were deleted in the post-sweep audit
//     cleanup (Chunk 1, 2026-05-18) — see the post-sweep audit report.

import { describe, it, expect } from "vitest";
import {
  flattenAnswerValue,
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

// PARAPHRASE / TABLE_PHASE1 / TABLE_PHASE4 fixtures deleted in the post-sweep
// audit cleanup (Chunk 1, 2026-05-18) alongside the 24 stale tests that
// consumed them — see header comment for the era-2-primacy ruling 8 context.

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

  // "preserves paraphrase list value" + "preserves synthesis-table list
  // value with cumulative columns" tests deleted in Chunk 1 (2026-05-18) —
  // they consumed the PARAPHRASE and TABLE_PHASE4 fixtures, which were
  // deleted alongside the 24 stale tests testing ruling-8-retired shapes.
  // Round-trip robustness is still covered by the canvas-list test above
  // plus the N/A and sibling-coexistence tests below — those use the
  // current-shape CANVAS fixture.

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

// answeredQuestions test block deleted in Phase F (2026-05-17) alongside the
// function itself. The function's sole production caller was the wall-layer
// buildSubPhaseEvidence; both went together as an atomic chunk.

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

// `flattenAnswerValue — unified-canvas shape` describe deleted in Chunk 1
// (2026-05-18) — tested inline-paraphrase + thought_unit_end rendering paths
// that the Field 3 unified-canvas rework retired (era-2-primacy ruling 8).

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

  // Seven tests deleted in Chunk 1 (2026-05-18): they tested the
  // thought_unit_end-based derivation, the _canvas_row_id reorder/insert/
  // delete-preservation paths, and the after_line fallback — all retired
  // by the Field 3 unified-canvas rework (era-2-primacy ruling 8). Current
  // derive: depth-0 rows are the thought units, merge by _canvas_row_id
  // only. The two tests retained below ("returns [] for empty input"
  // above and "does not crash when no existing rows match" here) cover
  // the current shape's edge cases.

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
  // Two tests deleted in Chunk 1 (2026-05-18): they asserted derivation
  // from thought_unit_end-annotated rows (id "row-3"/"row-4") and
  // _canvas_row_id-keyed cross-phase preservation across canvas reorder.
  // Both paths retired by the Field 3 unified-canvas rework (era-2-primacy
  // ruling 8). Current derive: depth-0 rows are the thought units.

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
  // The "hydrates canvas from sentence_layout + paraphrases + thought_units"
  // test was deleted in Chunk 1 (2026-05-18) — the migration shim it tested
  // was removed by the Field 3 unified-canvas rework (era-2-primacy ruling
  // 8). No production sermons carry the legacy three-question shape; the
  // shim was retired as part of the clean cut. The remaining tests below
  // cover parseStructuredField's no-op behavior on already-shape data plus
  // legacy thought_units array preservation.

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
// Session 3's named goal: verify that canvas edits propagate through the
// observations write path (parse → setDivisionsCanvas → serialize) so
// Phase 2/3/4 cumulative-synthesis-tables read the right rows after every
// canvas operation. This is the wire-level integration the helper-only
// tests above don't exercise as a single flow.
//
// `updateObservations` mirrors the current writing-surface write path for
// `divisions/canvas` edits — the same code path SermonWorkspace.handleUpdate
// runs on every keystroke. (Pre-D2c, that path lived inside
// `StudyTab.updateStructured`; StudyTab was deleted in Phase E of the trail
// deletion sweep and the equivalent path now lives in the writing surface.)
// Every test in this block works against the sermon-level JSON contract
// (the string that lives on the `observations` column), so any drift in
// serialize/parse/materialize would surface here.

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

  // Five tests deleted in Chunk 1 (2026-05-18): they asserted the
  // thought_unit_summary + after_line + signal cross-phase row shape, the
  // _canvas_row_id-keyed reorder/insert/delete preservation, and the legacy-
  // three-question hydration + after_line fallback path — all retired by
  // the Field 3 unified-canvas rework (era-2-primacy ruling 8). The kept
  // "first canvas write" test above covers the current shape's serialize/
  // parse propagation.
});
