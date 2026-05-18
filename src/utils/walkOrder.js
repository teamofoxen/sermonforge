// walkOrder.js — the canonical sequence of every field in the sermon.
//
// One source. Two consumers — the writing surface's forward chevron
// (advances by field) and the map (lists every question). If sequence
// derivation lives in two places, the surfaces drift; this is the place.
//
// Field-level WALK_ORDER is the unit the chevron advances by. The field
// is the unit of work: a multi-question field renders all its prompts
// stacked, and "next" moves field-to-field. QUESTION_WALK_ORDER is
// derived for surfaces that need question granularity (the map shows every
// question, even though the chevron never advances one prompt at a time).
//
// Per-question state for surfaces that derive answered/partial/unanswered
// signals (the map's weighting, the writing surface's chevron-disabled
// state, the unmet-state check) — dispatch by question.kind:
//
//   - Text-prompt questions (default): read state from the nominal field
//     column at sermon[column][fieldKey][questionKey].
//   - cumulative-synthesis-table questions: derive state from the
//     question's crossPhaseSource — currently the thought-unit array at
//     observations.divisions.thought_units.value — NOT from the nominal
//     field column. The cumulative table extends the upstream array; that
//     is where the cell values live.
//
// A map that reads only the nominal column will show every per-unit
// question as unanswered even after the preacher has filled every row.
// Per-question-kind dispatch is load-bearing for correct map state.
//
// Stages with field defs already extracted: Study (4 sub-phases), Assembly
// Anchor (MPT/MPS), Assembly Frame (Intro/Conclusion). Outline, Equip, and
// Manuscript join here as their field definitions are extracted.

import { STAGE, SUB_PHASE } from "../core/contracts";
import {
  OBSERVE_FIELDS,
  INTERPRET_FIELDS,
  REDEMPTIVE_FIELDS,
  IMPLICATIONS_FIELDS,
} from "./studyFields";
import { MAIN_POINT_PAIR_FIELDS } from "./sadiAnchorFields";
import { SERMON_FRAME_FIELDS } from "./sermonFrameFields";

// TRACKED DEBT — legacy single-prompt field shape.
//
// Many fields still use `{key, label, hint}` with no `questions` array — per
// the studyFields.js comment, "every existing field has one question keyed
// `primary`." This shim normalizes at the boundary so every consumer can
// iterate `field.questions` uniformly. It is scaffolding, not the resting
// shape. The owed work: the field definitions in studyFields.js (and any
// sibling field-def files) commit to one shape — every field carries an
// explicit `questions` array. When that lands, this shim deletes; consumers
// already iterate `questions` and need no change.
function normalizeField(field) {
  if (Array.isArray(field.questions) && field.questions.length > 0) return field;
  return {
    ...field,
    hint: undefined,
    questions: [{ key: "primary", prompt: field.hint || field.label }],
  };
}

function tag(stage, subPhase, fields) {
  return fields.map((f) => normalizeField({ stage, subPhase, ...f }));
}

export const WALK_ORDER = Object.freeze([
  ...tag(STAGE.Study, SUB_PHASE.Observe, OBSERVE_FIELDS),
  ...tag(STAGE.Study, SUB_PHASE.Interpret, INTERPRET_FIELDS),
  ...tag(STAGE.Study, SUB_PHASE.RedemptiveThread, REDEMPTIVE_FIELDS),
  ...tag(STAGE.Study, SUB_PHASE.Implications, IMPLICATIONS_FIELDS),
  ...tag(STAGE.Assembly, SUB_PHASE.Anchor, MAIN_POINT_PAIR_FIELDS),
  // Assembly Outline and Equip field defs are not yet extracted into a
  // shared source — they join here when they are.
  ...tag(STAGE.Assembly, SUB_PHASE.Frame, SERMON_FRAME_FIELDS),
  // Manuscript stage joins here when its field defs land.
]);

export const QUESTION_WALK_ORDER = Object.freeze(
  WALK_ORDER.flatMap((field) =>
    field.questions.map((q) => ({
      stage: field.stage,
      subPhase: field.subPhase,
      fieldKey: field.key,
      fieldLabel: field.label,
      questionKey: q.key,
      questionPrompt: q.prompt,
      kind: q.kind,
      columns: q.columns,
      crossPhaseSource: q.crossPhaseSource,
    }))
  )
);

export function questionId({ stage, subPhase, fieldKey, questionKey }) {
  return `${stage}/${subPhase}/${fieldKey}/${questionKey}`;
}

function indexOfField(stage, subPhase, fieldKey) {
  return WALK_ORDER.findIndex(
    (f) => f.stage === stage && f.subPhase === subPhase && f.key === fieldKey
  );
}

export function findField(stage, subPhase, fieldKey) {
  const i = indexOfField(stage, subPhase, fieldKey);
  return i < 0 ? null : WALK_ORDER[i];
}

export function nextField({ stage, subPhase, fieldKey }) {
  const i = indexOfField(stage, subPhase, fieldKey);
  if (i < 0 || i === WALK_ORDER.length - 1) return null;
  return WALK_ORDER[i + 1];
}

export function prevField({ stage, subPhase, fieldKey }) {
  const i = indexOfField(stage, subPhase, fieldKey);
  if (i <= 0) return null;
  return WALK_ORDER[i - 1];
}

export const FIRST_FIELD = WALK_ORDER[0];

// Threshold orientation — in-question region framing.
//
// At a within-stage region boundary, the first field of the new region
// carries a one-line frame naming what just closed and what is opening.
// The line is the sole carrier of the shift; no separate region-name
// eyebrow above it (per ruling against re-importing the deleted phase
// labels — the line names the region, and that is enough).
//
// Boundaries that the spec carves out as separate landing screens instead
// (today: Implications → Anchor, the Study → Anchor handoff) return null —
// the screen will carry the shift when it ships.

const REGION_NAMED_OUTCOME = {
  Observe: "Observation Set",
  Interpret: "Interpretation Set",
  RedemptiveThread: "Christ-Connection Statement",
  Implications: "Implications Synthesis",
  Anchor: "Main Point Pair",
  Outline: "Sermon Outline",
  Equip: "Functional Elements",
  Frame: "Sermon Frame",
};

const REGION_DISPLAY = {
  Observe: "Observe",
  Interpret: "Interpret",
  RedemptiveThread: "Redemptive Thread",
  Implications: "Implications",
  Anchor: "Anchor",
  Outline: "Outline",
  Equip: "Equip",
  Frame: "Frame",
};

// Region boundaries that get a separate landing screen instead of an
// in-question frame. Keyed `prior:new`.
const SCREEN_BOUNDARIES = new Set(["Implications:Anchor"]);

// arcSummary — derived from WALK_ORDER. Each entry: one stage with its
// regions in order, each region with its label and named outcome. Used by
// the sermon-start landing to show the shape of the whole arc. Regions
// without a named outcome (none currently) emit null in the outcome slot
// so the landing can render the gap honestly.
export function arcSummary() {
  const seen = new Set();
  const stageOrder = [];
  const byStage = new Map();
  for (const field of WALK_ORDER) {
    const key = `${field.stage}/${field.subPhase}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!byStage.has(field.stage)) {
      byStage.set(field.stage, []);
      stageOrder.push(field.stage);
    }
    byStage.get(field.stage).push({
      subPhase: field.subPhase,
      label: REGION_DISPLAY[field.subPhase] ?? field.subPhase,
      namedOutcome: REGION_NAMED_OUTCOME[field.subPhase] ?? null,
    });
  }
  return stageOrder.map((stage) => ({ stage, regions: byStage.get(stage) }));
}

export function regionFrameFor(stage, subPhase, fieldKey) {
  const idx = indexOfField(stage, subPhase, fieldKey);
  if (idx <= 0) return null;
  const prev = WALK_ORDER[idx - 1];
  if (prev.stage === stage && prev.subPhase === subPhase) return null;
  if (SCREEN_BOUNDARIES.has(`${prev.subPhase}:${subPhase}`)) return null;
  const newLabel = REGION_DISPLAY[subPhase] ?? subPhase;
  const priorOutcome = REGION_NAMED_OUTCOME[prev.subPhase] ?? prev.subPhase;
  // "X opens, against Y." — the load-bearing half is "against Y" (names the
  // substrate the new region builds on). No closure claim about the prior
  // region — free navigation means the preacher may have arrived with prior
  // work half-done, and asserting closure that didn't happen is narration.
  return `${newLabel} opens, against the ${priorOutcome}.`;
}
