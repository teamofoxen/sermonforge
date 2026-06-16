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
// What survives (and why): eight composite gates that ask "is this load-
// bearing field complete?" against the per-question-kind dispatch. Per the
// invisible-system spec's "The contract that survives" + Phase F entry,
// these gates are the surviving completeness contract — they stop blocking
// movement and instead feed the workspace-wide "is the sermon done" answer.
// Since 2026-06-10 that answer is wired: `deriveSermonCompleteness` in
// sermonState.js consumes all eight and the SermonFinish screen renders the
// result. The reason strings below are pastor-facing copy on that screen —
// keep them in plain vocabulary (no internal field numbers, no wall-era
// "before advancing" phrasing).
//
// `hasContent` is exported because `sermonState.js` consumes it for map
// state derivation (text-prompt per-question completeness check).
// `checkField3Composite` is exported because it was meant as a public
// completeness API for the Divisions field — the question "is Divisions
// complete?" is one the map's state derivation and any future completeness
// audit will legitimately ask.

import {
  parseStructuredField,
  getQuestionAnswer,
  isQuestionNA,
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

// True if the canvas value carries at least one main sentence (depth=0) that
// has at least one indented modifier (depth>0) under it before the next
// main sentence. Works against both the legacy canvas array and the unified-
// canvas array — both carry `text` + `depth` at the row level.
function canvasHasMainWithModifier(canvas) {
  if (!Array.isArray(canvas) || canvas.length === 0) return false;
  let inMain = false;
  for (const row of canvas) {
    if (!row || typeof row !== "object") continue;
    const depth = Number.isInteger(row.depth) && row.depth >= 0 ? row.depth : 0;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text) continue;
    if (depth === 0) {
      inMain = true;
    } else if (inMain && depth > 0) {
      return true;
    }
  }
  return false;
}

// Field 3 (Divisions / Thought Units) composite. Returns null when complete
// or a pastor-facing reason string when not. Per ruling 8 the single check
// is canvas-has-main-with-modifier — paraphrase + thought-unit-end markers
// are retired with the unified canvas, so the structural shape (at least
// one indented modifier under at least one main sentence) is what carries
// the completeness signal. The N/A short-circuit below honors LEGACY data
// only: since the T19 N/A allowlist (2026-06-10) no UI or write path can
// set na on the canvas question. Whether Study-side N/A returns is the
// pending SFDI ruling (see the SFDI doc's 2026-06-10 banner); the
// short-circuit stays so any stored flag remains honest either way.
export function checkField3Composite(data) {
  const fieldKey = "divisions";
  if (isQuestionNA(data, fieldKey, "canvas")) return null;
  const canvas = getQuestionAnswer(data, fieldKey, "canvas");
  if (!canvasHasMainWithModifier(canvas)) {
    return "Lay out the passage — at least one main sentence with an indented modifier under it.";
  }
  return null;
}

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
  const allHaveMeaning = thoughtUnits.every(
    (row) => row && typeof row.meaning === "string" && row.meaning.trim()
  );
  if (!allHaveMeaning) {
    return "Write a Meaning entry beside every thought unit.";
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
  const allHaveImplication = thoughtUnits.every(
    (row) => row && typeof row.implication === "string" && row.implication.trim()
  );
  if (!allHaveImplication) {
    return "Write an Implication entry beside every thought unit.";
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
  const allHaveChristConnection = thoughtUnits.every(
    (row) =>
      row && typeof row.christ_connection === "string" && row.christ_connection.trim()
  );
  if (!allHaveChristConnection) {
    return "Write a Christ-Connection entry beside every thought unit.";
  }

  if (!isQuestionAnswered(redData, "christ_connection_statement", "statement")) {
    return "Write the Christ-Connection Statement paragraph.";
  }

  return null;
}

// Sermon Frame Intro composite. Per SADI Step 5 ratification: Intro requires
// Q1+Q2+Q3 non-empty (no N/A) and Q4 (redemptive_note) non-empty or N/A
// (the "satisfied another way" carve-out for redemptive hooks).
export function checkIntroComposite(frameData) {
  if (!frameData || typeof frameData !== "object") {
    return "Write the Introduction answers in Frame.";
  }
  const fieldKey = "intro";
  const required = ["hook", "bridge_to_text", "expectations"];
  for (const qKey of required) {
    if (!isQuestionAnswered(frameData, fieldKey, qKey)) {
      return `Write the Intro ${qKey.replace(/_/g, " ")} answer.`;
    }
  }
  if (!isQuestionAnswered(frameData, fieldKey, "redemptive_note")) {
    return "Write the Intro redemptive note (or mark it not applicable if the hook itself was redemptive).";
  }
  return null;
}

// Sermon Frame Conclusion composite. Per SADI Step 5 ratification (closing_posture
// Q4 removed 2026-06-15, Phase-2 Merida surgery): Conclusion requires Q1+Q2+Q3
// (summate, land_call, gospel_empower) all non-empty (no N/A path).
export function checkConclusionComposite(frameData) {
  if (!frameData || typeof frameData !== "object") {
    return "Write the Conclusion answers in Frame.";
  }
  const fieldKey = "conclusion";
  const required = ["summate", "land_call", "gospel_empower"];
  for (const qKey of required) {
    // Conclusion is no-N/A across the board — N/A doesn't satisfy these.
    const answered = !isQuestionNA(frameData, fieldKey, qKey)
      && hasContent(getQuestionAnswer(frameData, fieldKey, qKey));
    if (!answered) {
      return `Write the Conclusion ${qKey.replace(/_/g, " ")} answer.`;
    }
  }
  return null;
}

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
