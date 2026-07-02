// SermonForge — Study advancement composites
//
// Phase F (2026-05-17) gravestone — the wall layer was deleted here. What
// used to live in this file:
//   - `evaluateAdvance(sermon, kind, fromIndex, stage)` — the renderer-side
//     advancement evaluator the disabled-Continue UX and tab-banner UX both
//     called. Replaced by free navigation in the invisible-system rebuild;
//     nothing in the new surface routes through advancement gating.
//   - `formatAdvanceRejection` / `formatTabRejection` — the click-then-banner
//     formatters paired with `evaluateAdvance`. Banner UX is gone.
//   - Seven per-boundary `check*Threshold` wrappers
//     (`checkObserveToInterpretThreshold`, `checkInterpretToRedemptiveThreshold`,
//     `checkRedemptiveToImplicationsThreshold`, `checkImplicationsToMPTMPSThreshold`,
//     `checkStep2ToOutlineThreshold`, `checkOutlineToEquipThreshold`,
//     `checkSermonFrameToManuscriptThreshold`) — each wrapped one or more
//     composites into the `{gates, firstReason}` shape `evaluateAdvance`
//     returned. Wrappers go because `evaluateAdvance` goes.
//   - `buildSubPhaseEvidence` + `buildStageEvidence` — empty-evidence
//     baseline producers for Process #2 on the renderer side. Evidence is
//     a wall concept; it goes with the walls.
//   - `canonicalSubPhase` + `subPhaseToIndex` — sub-phase index lookups the
//     deleted wall + the E-deleted tab files needed.
//
// What survives (and why): five composite gates that ask "is this load-
// bearing field complete?" against the per-question-kind dispatch. Per the
// invisible-system spec's "The contract that survives" + Phase F entry,
// these gates are the surviving completeness contract — they stop blocking
// movement and instead feed the workspace-wide "is the sermon done" answer.
// Since 2026-06-10 that answer is wired: `deriveSermonCompleteness` in
// sermonState.js consumes all five and the SermonFinish screen renders the
// result. The reason strings below are pastor-facing copy on that screen —
// keep them in plain vocabulary (no internal field numbers, no wall-era
// "before advancing" phrasing).
//
// `hasContent` is exported because `sermonState.js` consumes it for map
// state derivation (text-prompt per-question completeness check).

import {
  parseStructuredField,
  getQuestionAnswer,
  isQuestionNA,
  cumulativeCellSatisfied,
} from "./studyFields";

// hasContent — true content-presence check. Recognizes the three answer
// shapes the composites see:
//   - text-prompt: string with non-whitespace content
//   - cumulative-synthesis-table: array with at least one row carrying
//     non-empty `thought_unit_text`
//   - indented-canvas: array with at least one row carrying non-empty
//     `text` (depth doesn't matter for presence)
// Exported so the completeness contract and the map-state surface ask the
// same question through one canonical helper.
export function hasContent(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) {
    return value.some((row) => {
      if (!row || typeof row !== "object") return false;
      if (typeof row.thought_unit_text === "string" && row.thought_unit_text.trim()) return true;
      if (typeof row.text === "string" && row.text.trim()) return true;
      return false;
    });
  }
  return false;
}

// Per-question completeness check — a question counts as "answered" when it
// has content OR is marked N/A.
function isQuestionAnswered(data, fieldKey, questionKey) {
  if (isQuestionNA(data, fieldKey, questionKey)) return true;
  return hasContent(getQuestionAnswer(data, fieldKey, questionKey));
}

// (checkField3Composite + its private helper canvasHasMainWithModifier were
// removed 2026-07-02, Track A: the Observation Set completeness bar became the
// lenient Obvious Point check at the M2 audit ruling, after which this
// Divisions composite had zero live callers. History: docs/CORE-CHANGELOG.md.)

// Field 8 (Interpretation Synthesis) composite. Q1 satisfied when every
// thought-unit row in `observations.divisions.thought_units` has a non-empty
// `meaning` column. Q2 satisfied when
// `interpretation.interpretation_synthesis.meaning_whole` is non-empty. The
// thought-unit array is the canonical cross-phase artifact; per SFDI Phase
// 2 Field 8 the Interpretation Synthesis cannot be N/A — it's the named
// outcome — so no escape valve at the field level.
export function checkField8Composite(sermon) {
  const obsData = parseStructuredField(sermon?.observations);
  const intData = parseStructuredField(sermon?.interpretation);

  const thoughtUnits = obsData?.divisions?.thought_units?.value;
  if (!Array.isArray(thoughtUnits) || thoughtUnits.length === 0) {
    return "Name at least one thought unit on the Divisions canvas in Observe.";
  }
  const allHaveMeaning = thoughtUnits.every((row) => cumulativeCellSatisfied(row, "meaning"));
  if (!allHaveMeaning) {
    return "Write a Meaning entry beside every thought unit (or mark it not applicable).";
  }

  if (!isQuestionAnswered(intData, "interpretation_synthesis", "meaning_whole")) {
    return "Write the whole-passage meaning paragraph.";
  }

  return null;
}

// Field 4 (Implications Synthesis) composite. Q1 satisfied when every
// thought-unit row in `observations.divisions.thought_units` has a non-empty
// `implication` column. Q2 satisfied when
// `implications.implications_synthesis.synthesis` is non-empty. Per SFDI
// Phase 4 the Implications Synthesis is the named outcome — no N/A.
export function checkPhase4Field4Composite(sermon) {
  const obsData = parseStructuredField(sermon?.observations);
  const impData = parseStructuredField(sermon?.implications);

  const thoughtUnits = obsData?.divisions?.thought_units?.value;
  if (!Array.isArray(thoughtUnits) || thoughtUnits.length === 0) {
    return "Name at least one thought unit on the Divisions canvas in Observe.";
  }
  const allHaveImplication = thoughtUnits.every((row) => cumulativeCellSatisfied(row, "implication"));
  if (!allHaveImplication) {
    return "Write an Implication entry beside every thought unit (or mark it not applicable).";
  }

  if (!isQuestionAnswered(impData, "implications_synthesis", "synthesis")) {
    return "Write the Implications Synthesis paragraph.";
  }

  return null;
}

// Field 5 (Christ-Connection Statement) composite. Q1 satisfied when every
// thought-unit row in `observations.divisions.thought_units` has a non-empty
// `christ_connection` column. Q2 satisfied when
// `redemptive_thread.christ_connection_statement.statement` is non-empty.
// Per SFDI Phase 3 the Christ-Connection Statement is the named outcome and
// cannot be N/A.
export function checkField5Composite(sermon) {
  const obsData = parseStructuredField(sermon?.observations);
  const redData = parseStructuredField(sermon?.redemptive_thread);

  const thoughtUnits = obsData?.divisions?.thought_units?.value;
  if (!Array.isArray(thoughtUnits) || thoughtUnits.length === 0) {
    return "Name at least one thought unit on the Divisions canvas in Observe.";
  }
  const allHaveChristConnection = thoughtUnits.every((row) => cumulativeCellSatisfied(row, "christ_connection"));
  if (!allHaveChristConnection) {
    return "Write a Christ-Connection entry beside every thought unit (or mark it not applicable).";
  }

  if (!isQuestionAnswered(redData, "christ_connection_statement", "statement")) {
    return "Write the Christ-Connection Statement paragraph.";
  }

  return null;
}

// checkIntroComposite / checkConclusionComposite retired 2026-07-02 with the
// Frame collapse (OEM walk, agenda item 8): the Sermon Frame stage and its
// two completeness artifacts are gone; the transplanted door questions are
// covered by the ratified-lenient Manuscript check in sermonState.js
// (an opener answer + the Conclusion response — agenda item 7). The
// redemptive_note's strict "satisfied another way" N/A semantic moved with
// its key to the Manuscript doors (introduction.redemptive_note_na sidecar).
// CORE Process #2 now names FIVE composites; see docs/CORE-CHANGELOG.md.

// MPT composite. Per SADI ratification: MPT Q1 (draft) and Q2 (tighten) both
// non-empty, neither N/A-able.
export function checkMPTComposite(mppData) {
  if (!mppData || typeof mppData !== "object") {
    return "Write the Main Point of the Text (draft, then tighten).";
  }
  const fieldKey = "mpt";
  for (const qKey of ["draft", "tighten"]) {
    const answered = !isQuestionNA(mppData, fieldKey, qKey)
      && hasContent(getQuestionAnswer(mppData, fieldKey, qKey));
    if (!answered) {
      return `Write the MPT ${qKey} answer.`;
    }
  }
  return null;
}

// MPS composite. Per SADI ratification: MPS Q1 (translate) and Q3 (tighten)
// both non-empty, no N/A. Q2 (gospel_check) non-empty OR explicit N/A (the
// "satisfied another way" carve-out for passages where the moralism check
// was completed upstream and surfaced nothing).
export function checkMPSComposite(mppData) {
  if (!mppData || typeof mppData !== "object") {
    return "Write the Main Point of the Sermon (translate, gospel-check, tighten).";
  }
  const fieldKey = "mps";
  // Q1 + Q3: load-bearing, no N/A.
  for (const qKey of ["translate", "tighten"]) {
    const answered = !isQuestionNA(mppData, fieldKey, qKey)
      && hasContent(getQuestionAnswer(mppData, fieldKey, qKey));
    if (!answered) {
      return `Write the MPS ${qKey} answer.`;
    }
  }
  // Q2: non-empty OR explicit N/A.
  if (!isQuestionAnswered(mppData, fieldKey, "gospel_check")) {
    return "Complete the MPS gospel-check (or mark it not applicable if checked upstream).";
  }
  return null;
}
