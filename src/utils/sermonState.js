// sermonState.js — derives writing-surface props + map question-states +
// threshold flags from a real sermon record.
//
// The production-version of the derivations the fixture carried inline.
// The conceptual shapes match what the fixture produced; the inputs differ:
// the fixture stored answers as in-memory flat objects, this helper reads
// JSON-string columns from the sermon record via parseStructuredField.
//
// Per-question-kind dispatch (the principle logged in walkOrder.js):
//   - text-prompt: hasContent against the answer envelope
//   - cumulative-synthesis-table: derive against the cross-phase source
//     (the thought-unit array at observations.divisions.thought_units)
//   - indented-canvas: derive against the canvas's depth-0 rows
//
// Hard commitment (Phase D2): nothing in this file imports or calls
// `evaluateAdvance`, `formatAdvanceRejection`, `formatTabRejection`,
// `buildSubPhaseEvidence`, `buildStageEvidence`, or any `check*Threshold`
// wrapper. Only the surviving composites (`checkField3Composite`) and
// `hasContent` from studyAdvancement.js are touched.

import { STAGE } from "../core/contracts";
import { QUESTION_WALK_ORDER, WALK_ORDER, questionId } from "./walkOrder";
import { parseStructuredField, getQuestionAnswer } from "./studyFields";
import { hasContent } from "./studyAdvancement";

// Stage + sub-phase → the sermon-record JSON column that holds that
// region's field data. The single source of stage→column mapping for the
// whole writing-surface stack — exported so SermonWorkspace's write path
// and the fixtures use the same mapping (no second source of truth).
export const STAGE_SUBPHASE_TO_COLUMN = Object.freeze({
  "Study/Observe":           "observations",
  "Study/Interpret":         "interpretation",
  "Study/RedemptiveThread":  "redemptive_thread",
  "Study/Implications":      "implications",
  "Assembly/Anchor":         "main_point_pair",
  "Assembly/Frame":          "sermon_frame",
  // Assembly/Outline, Assembly/Equip, Manuscript join here as their
  // field defs are extracted (matching the TODO in walkOrder.js).
});

function columnFor(stage, subPhase) {
  return STAGE_SUBPHASE_TO_COLUMN[`${stage}/${subPhase}`];
}

function readFieldData(sermon, stage, subPhase) {
  const col = columnFor(stage, subPhase);
  if (!col) return {};
  return parseStructuredField(sermon?.[col]);
}

// The canonical thought-unit array — always at observations.divisions.
// thought_units.value, regardless of which phase's per-unit table is
// reading it. The crossPhaseSource on each cumulative-synthesis-table
// question def reflects this; this helper centralizes the read.
function readThoughtUnits(sermon) {
  const obs = parseStructuredField(sermon?.observations);
  const tu = obs?.divisions?.thought_units?.value;
  return Array.isArray(tu) ? tu : [];
}

function readDivisionsCanvas(sermon) {
  const obs = parseStructuredField(sermon?.observations);
  const canvas = obs?.divisions?.canvas?.value;
  return Array.isArray(canvas) ? canvas : [];
}

// Per-question state, keyed by canonical question id. Output shape
// matches the SermonMap's `questionStates` prop:
//   { [id]: { state, preview?, fullValue? } }
// where state is "answered" | "partial" | "unanswered".
export function deriveQuestionStatesFromSermon(sermon) {
  const out = {};
  const thoughtUnits = readThoughtUnits(sermon);
  for (const entry of QUESTION_WALK_ORDER) {
    const id = questionId(entry);
    if (entry.kind === "cumulative-synthesis-table") {
      const editableKey = entry.columns?.find((c) => !c.readOnly)?.key;
      if (!editableKey || thoughtUnits.length === 0) {
        out[id] = { state: "unanswered" };
        continue;
      }
      const filled = thoughtUnits.filter((u) => {
        const v = u?.[editableKey];
        return v != null && String(v).trim() !== "";
      });
      if (filled.length === 0) {
        out[id] = { state: "unanswered" };
      } else if (filled.length === thoughtUnits.length) {
        const sample = String(filled[0][editableKey]);
        const full = thoughtUnits
          .map((u) => String(u[editableKey] ?? ""))
          .join("\n\n");
        out[id] = { state: "answered", preview: sample, fullValue: full };
      } else {
        const sample = String(filled[0][editableKey]);
        const full = thoughtUnits
          .map((u, i) => `Unit ${i + 1}: ${u[editableKey] ?? "—"}`)
          .join("\n\n");
        out[id] = { state: "partial", preview: sample, fullValue: full };
      }
      continue;
    }
    if (entry.kind === "indented-canvas") {
      const canvas =
        entry.fieldKey === "divisions" ? readDivisionsCanvas(sermon) : null;
      if (!Array.isArray(canvas) || canvas.length === 0) {
        out[id] = { state: "unanswered" };
        continue;
      }
      const firstMain = canvas.find(
        (row) => row?.depth === 0 && String(row?.text ?? "").trim() !== ""
      );
      if (firstMain) {
        const sample = String(firstMain.text);
        out[id] = { state: "answered", preview: sample, fullValue: sample };
      } else {
        out[id] = { state: "unanswered" };
      }
      continue;
    }
    // Default: text-prompt
    const fieldData = readFieldData(sermon, entry.stage, entry.subPhase);
    const naFlag = fieldData?.[entry.fieldKey]?.[entry.questionKey]?.na === true;
    if (naFlag) {
      out[id] = { state: "answered", preview: "(not applicable)" };
      continue;
    }
    const v = getQuestionAnswer(fieldData, entry.fieldKey, entry.questionKey);
    if (!hasContent(v)) {
      out[id] = { state: "unanswered" };
    } else {
      const str = String(v);
      out[id] = { state: "answered", preview: str, fullValue: str };
    }
  }
  return out;
}

// The four Study named-outcome positions — the Study → Anchor handoff
// surfaces what's been written here. REQUIRED_OUTCOME_POSITIONS is used
// to dedupe these out of the "Left behind" list (the outcomes section
// surfaces them once, with their own go-write-it affordance).
export const STUDY_NAMED_OUTCOMES = Object.freeze([
  { label: "Observation Set",             stage: STAGE.Study, subPhase: "Observe",          fieldKey: "obvious_point",               questionKey: "primary" },
  { label: "Interpretation Set",          stage: STAGE.Study, subPhase: "Interpret",        fieldKey: "interpretation_synthesis",    questionKey: "meaning_whole" },
  { label: "Christ-Connection Statement", stage: STAGE.Study, subPhase: "RedemptiveThread", fieldKey: "christ_connection_statement", questionKey: "statement" },
  { label: "Implications Synthesis",      stage: STAGE.Study, subPhase: "Implications",     fieldKey: "implications_synthesis",      questionKey: "synthesis" },
]);

const REQUIRED_OUTCOME_POSITIONS = new Set(
  STUDY_NAMED_OUTCOMES.map((o) => `${o.fieldKey}/${o.questionKey}`)
);

export function deriveStudyOutcomesFromSermon(sermon) {
  return STUDY_NAMED_OUTCOMES.map((o) => {
    const fieldData = readFieldData(sermon, o.stage, o.subPhase);
    const v = getQuestionAnswer(fieldData, o.fieldKey, o.questionKey);
    return { ...o, text: String(v ?? "").trim() };
  });
}

export function deriveStudyUnfinishedFromSermon(sermon) {
  const thoughtUnits = readThoughtUnits(sermon);
  return QUESTION_WALK_ORDER.filter((q) => q.stage === STAGE.Study)
    .filter((q) => !REQUIRED_OUTCOME_POSITIONS.has(`${q.fieldKey}/${q.questionKey}`))
    .filter((q) => {
      if (q.kind === "cumulative-synthesis-table") {
        const editable = q.columns?.find((c) => !c.readOnly)?.key;
        if (!editable) return false;
        if (thoughtUnits.length === 0) return true;
        return thoughtUnits.some(
          (u) => !String(u?.[editable] ?? "").trim()
        );
      }
      if (q.kind === "indented-canvas") {
        const canvas = q.fieldKey === "divisions" ? readDivisionsCanvas(sermon) : null;
        if (!Array.isArray(canvas) || canvas.length === 0) return true;
        return !canvas.some(
          (row) => row?.depth === 0 && String(row?.text ?? "").trim() !== ""
        );
      }
      const fieldData = readFieldData(sermon, q.stage, q.subPhase);
      const naFlag = fieldData?.[q.fieldKey]?.[q.questionKey]?.na === true;
      if (naFlag) return false;
      const v = getQuestionAnswer(fieldData, q.fieldKey, q.questionKey);
      return !hasContent(v);
    });
}

// Read the canonical writing-surface position. last_touched_position is
// the slash-composite "Stage/SubPhase/FieldKey" written by the writing
// surface on every navigation event. NULL = brand-new sermon; we return
// the first field of the walk so sermon-start has a place to land when
// dismissed.
export function deriveCurrentPositionFromSermon(sermon) {
  const ltp = sermon?.last_touched_position;
  if (typeof ltp === "string" && ltp.trim()) {
    const parts = ltp.split("/");
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return { stage: parts[0], subPhase: parts[1], fieldKey: parts[2] };
    }
  }
  const first = WALK_ORDER[0];
  return { stage: first.stage, subPhase: first.subPhase, fieldKey: first.key };
}

// Position → canonical slash-composite. Single serialization point so
// every write of last_touched_position goes through one path.
export function serializePosition(position) {
  return `${position.stage}/${position.subPhase}/${position.fieldKey}`;
}

// Thresholds-seen JSON array helpers — read/write the column's value.
// One mechanism for "has this threshold been dismissed" across all
// thresholds (sermon-start, study-to-anchor-handoff, and any future
// addition). Per Decision 1, the canonical mechanism — no per-threshold
// boolean columns, no position-string proxy.

export function parseThresholdsSeen(sermon) {
  const raw = sermon?.thresholds_seen;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasSeenThreshold(sermon, id) {
  return parseThresholdsSeen(sermon).includes(id);
}

export function nextThresholdsSeen(sermon, id) {
  const seen = parseThresholdsSeen(sermon);
  if (seen.includes(id)) return JSON.stringify(seen);
  return JSON.stringify([...seen, id]);
}

// Stable threshold ids. The set is small and named here so call sites
// can't fat-finger them; future thresholds extend this enum.
export const THRESHOLD_ID = Object.freeze({
  SermonStart: "sermon-start",
  StudyToAnchorHandoff: "study-to-anchor-handoff",
});
