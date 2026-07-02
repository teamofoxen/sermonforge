import { describe, it, expect } from "vitest";
import * as sampleMod from "../../electron/sampleData.js";
import { GENRES, bookById } from "../../src/data/canonicalBooks.js";
import { deriveSermonCompleteness, deriveQuestionStatesFromSermon } from "../../src/utils/sermonState.js";
import { QUESTION_WALK_ORDER, questionId } from "../../src/utils/walkOrder.js";
import { parseStructuredField, composeThoughtUnitBlocks } from "../../src/utils/studyFields.js";
import { buildManuscriptExportPayload } from "../../src/utils.js";

// The sample seed is INSERTed directly (not through the v25 migration), so its
// canon_category must ALREADY be a valid 7-genre key (or empty) — a legacy 4-key
// value like "nt" would render as Unclassified and match no Overview dropdown
// option. This locks the seed against silently re-acquiring a pre-v25 value.
const sampleData = sampleMod.default || sampleMod;
const VALID_CATEGORY = new Set([...Object.keys(GENRES), "", null, undefined]);

describe("sample seed — canonical classification is valid", () => {
  it("series.canon_category is a 7-genre key or empty (never a legacy 4-key value)", () => {
    expect(VALID_CATEGORY.has(sampleData.series.canon_category)).toBe(true);
  });

  it("series.book_id, when set, resolves to a real canonical book", () => {
    const { book_id } = sampleData.series;
    if (book_id != null && book_id !== "") {
      expect(bookById(book_id)).not.toBeNull();
    }
  });
});

// The sample is the pastor's smoke test of the whole walk (ruled 2026-07-02,
// after the seed silently drifted stale twice: the old thought_unit_summary
// shape, then the un-seeded main_point_pair). These tests lock the seed to
// live completeness: if a field is added to the walk or a shape changes, the
// seed must be re-authored before this suite goes green again — the drift
// surfaces here, not in the pastor's app.
describe("sample seed — completes the entire walk", () => {
  it("every load-bearing artifact derives complete", () => {
    const { artifacts, allComplete } = deriveSermonCompleteness(sampleData.sermon);
    const incomplete = artifacts.filter((a) => !a.complete).map((a) => `${a.label}: ${a.reason}`);
    expect(incomplete).toEqual([]);
    expect(allComplete).toBe(true);
  });

  it("every question in the walk order derives 'answered' — no partials, no gaps", () => {
    const states = deriveQuestionStatesFromSermon(sampleData.sermon);
    const notAnswered = QUESTION_WALK_ORDER
      .map((entry) => ({ id: questionId(entry), state: states[questionId(entry)]?.state }))
      .filter((q) => q.state !== "answered");
    expect(notAnswered).toEqual([]);
  });

  it("every thought unit composes a real block (margin row + indented lines) with a verse span", () => {
    const obs = parseStructuredField(sampleData.sermon.observations);
    const canvas = obs?.divisions?.canvas?.value;
    const units = obs?.divisions?.thought_units?.value;
    const composed = composeThoughtUnitBlocks(canvas, units);
    expect(composed.length).toBeGreaterThan(0);
    for (const u of composed) {
      // A single-line block with no verse span is the fallback shape — it means
      // the unit's _canvas_row_id no longer matches a margin row on the canvas.
      expect(u.block.length).toBeGreaterThan(1);
      expect(u.verse_span).not.toBe("");
    }
    expect(composed.map((u) => u.verse_span)).toEqual(["v. 1", "v. 2", "v. 2", "vv. 3–4", "v. 5"]);
  });

  it("every thought unit carries all three cumulative columns", () => {
    const obs = parseStructuredField(sampleData.sermon.observations);
    const units = obs?.divisions?.thought_units?.value;
    for (const u of units) {
      for (const col of ["meaning", "christ_connection", "implication"]) {
        expect(u[col], `${u.thought_unit_text} — ${col}`).toBeTruthy();
      }
    }
  });

  // Export to Word must produce the ACTUAL sample sermon — every slot the
  // docx builder prints (sermon-export-manuscript in electron/main.js) must
  // be non-empty in the payload the renderer assembles. This is the same
  // buildManuscriptExportPayload every export trigger uses (workspace topbar,
  // Finish screen, Preached Sermons), so green here means the export is whole.
  it("the Word-export payload is fully populated — the export IS the sample sermon", () => {
    const p = buildManuscriptExportPayload(sampleData.sermon);

    expect(p.title).toBeTruthy();
    expect(p.passage).toBeTruthy();
    expect(p.date).toBeTruthy();
    expect(p.mpt).toBeTruthy();
    expect(p.mps).toBeTruthy();

    // Introduction — all four door moves print (redemptive_note only when
    // not N/A'd; the sample writes it outright).
    for (const key of ["opener", "scripture_reading", "expectation", "redemptive_note"]) {
      expect(String(p.introduction[key] ?? "").trim(), `introduction.${key}`).toBeTruthy();
    }
    expect(p.introduction.redemptive_note_na).not.toBe(true);

    // Body — every outline point has its transition and all four functional
    // elements (illustration doesn't gate completeness, but the sample models
    // the full shape).
    expect(p.outline.length).toBeGreaterThan(0);
    for (const pt of p.outline) {
      expect(String(pt.text ?? "").trim(), `outline point ${pt.id}`).toBeTruthy();
      expect(String(p.transitions[pt.id] ?? "").trim(), `transition into ${pt.id}`).toBeTruthy();
      const fe = p.functionalElements[pt.id] || {};
      for (const key of ["scripture", "explanation", "application", "illustration"]) {
        expect(String(fe[key] ?? "").trim(), `functional element ${key} on ${pt.id}`).toBeTruthy();
      }
    }
    expect(String(p.transitions.conclusion ?? "").trim(), "transition into conclusion").toBeTruthy();

    // Conclusion — summation + response.
    expect(String(p.conclusion.summation ?? "").trim()).toBeTruthy();
    expect(String(p.conclusion.response ?? "").trim()).toBeTruthy();
  });

  it("the per-stage notebooks are seeded — the margin scratchpad reads lived-in", () => {
    for (const col of ["notebook_study", "notebook_blueprint", "notebook_manuscript"]) {
      expect(String(sampleData.sermon[col] ?? "").trim(), col).toBeTruthy();
    }
  });
});
