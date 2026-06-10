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
import {
  hasContent,
  checkField3Composite,
  checkField8Composite,
  checkPhase4Field4Composite,
  checkField5Composite,
  checkIntroComposite,
  checkConclusionComposite,
  checkMPTComposite,
  checkMPSComposite,
} from "./studyAdvancement";
import { getOutline, getFunctionalElements, parseManuscript } from "../utils";

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
  // eslint-disable-next-line sermonforge/canonical-stage-name -- DB column name, not a stage status
  "Assembly/Outline":        "outline",
  "Assembly/Equip":          "functional_elements",
  "Assembly/Frame":          "sermon_frame",
  // Manuscript stage has no sub-phase; walkOrder tags it with the stage name
  // as the sub-phase slot, so the composite key is "Manuscript/Manuscript".
  "Manuscript/Manuscript":   "manuscript",
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
  // Parse the native Outline / Equip / Manuscript columns ONCE. The new-kind
  // branches below read them; parsing inside the loop re-parsed the same
  // columns several times per call, and this runs via useMemo on every keystroke.
  const outlinePoints = getOutline(sermon);
  const functionalElements = getFunctionalElements(sermon);
  const manuscriptData = parseManuscript(sermon?.manuscript);
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
    if (entry.kind === "outline-builder") {
      const points = outlinePoints;
      const filled = points.filter((p) => String(p?.text ?? "").trim() !== "");
      if (points.length === 0 || filled.length === 0) {
        out[id] = { state: "unanswered" };
      } else if (filled.length === points.length) {
        out[id] = {
          state: "answered",
          preview: filled[0].text,
          fullValue: points.map((p, i) => `${i + 1}. ${p.text}`).join("\n"),
        };
      } else {
        out[id] = {
          state: "partial",
          preview: filled[0].text,
          fullValue: points.map((p, i) => `${i + 1}. ${p.text || "—"}`).join("\n"),
        };
      }
      continue;
    }
    if (entry.kind === "functional-elements") {
      const points = outlinePoints;
      const fes = functionalElements;
      const elementKeys = (entry.elements || []).map((e) => e.key);
      if (points.length === 0 || elementKeys.length === 0) {
        out[id] = { state: "unanswered" };
        continue;
      }
      let filledCells = 0;
      let firstPreview = "";
      for (const pt of points) {
        const fe = fes[pt.id] || {};
        for (const k of elementKeys) {
          const v = String(fe[k] ?? "").trim();
          if (v) {
            filledCells += 1;
            if (!firstPreview) firstPreview = v;
          }
        }
      }
      const totalCells = points.length * elementKeys.length;
      if (filledCells === 0) out[id] = { state: "unanswered" };
      else if (filledCells === totalCells) out[id] = { state: "answered", preview: firstPreview };
      else out[id] = { state: "partial", preview: firstPreview };
      continue;
    }
    if (entry.kind === "manuscript-prose") {
      const ms = manuscriptData;
      const v = String(ms?.[entry.section]?.[entry.questionKey] ?? "").trim();
      out[id] = v
        ? { state: "answered", preview: v, fullValue: v }
        : { state: "unanswered" };
      continue;
    }
    if (entry.kind === "manuscript-transitions") {
      const points = outlinePoints;
      const ms = manuscriptData;
      const trans = ms?.transitions || {};
      const slots = [...points.map((p) => p.id), "conclusion"];
      const filled = slots.filter((s) => String(trans?.[s] ?? "").trim() !== "");
      if (points.length === 0 || filled.length === 0) {
        out[id] = { state: "unanswered" };
      } else if (filled.length === slots.length) {
        const first = String(trans[filled[0]] ?? "");
        out[id] = { state: "answered", preview: first, fullValue: first };
      } else {
        out[id] = { state: "partial", preview: String(trans[filled[0]] ?? "") };
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

// ── Sermon completeness — the workspace-wide "is this sermon done" answer ──
//
// CORE Process Contract #2 names the eight composite gates in
// studyAdvancement.js as the completeness contract; this derivation is their
// designed consumer (wired 2026-06-10). It returns one entry per load-bearing
// artifact, in walk order, each with a pastor-facing reason when incomplete
// and a jump position so the finish screen can offer "go write it".
//
// Outline / Sermon Body / Manuscript have no SADI-ratified composites — they
// use LENIENT presence checks by explicit ruling (2026-06-10 decision batch:
// honest without nagging; tighten later if the OEM content walk decides to).
// This list is consumed by SermonFinish; it never blocks anything
// (Process #1: no walls — the answer informs, navigation stays free).
export function deriveSermonCompleteness(sermon) {
  const obsData = parseStructuredField(sermon?.observations);
  const mppData = parseStructuredField(sermon?.main_point_pair);
  const frameData = parseStructuredField(sermon?.sermon_frame);
  const outlinePoints = getOutline(sermon);
  const functionalElements = getFunctionalElements(sermon);
  const manuscriptData = parseManuscript(sermon?.manuscript);

  // Lenient: at least one outline point with text.
  const outlineReason = outlinePoints.some((p) => String(p?.text ?? "").trim())
    ? null
    : "Lay out at least one outline point.";

  // Lenient: at least one functional element written under any point.
  const bodyHasAny = outlinePoints.some((p) => {
    const fe = functionalElements?.[p.id] || {};
    return ["scripture", "explanation", "application", "illustration"].some(
      (k) => String(fe[k] ?? "").trim()
    );
  });
  const bodyReason = outlineReason
    ? "Build the outline first — the Sermon Body grows under its points."
    : bodyHasAny
      ? null
      : "Give at least one outline point its substance in Equip.";

  // Lenient: at least one Introduction answer + the Conclusion response.
  const msIntro = manuscriptData?.introduction || {};
  const msIntroAny = ["opener", "scripture_reading", "expectation"].some((k) =>
    String(msIntro[k] ?? "").trim()
  );
  const msConclusion = String(manuscriptData?.conclusion?.response ?? "").trim();
  const manuscriptReason = msIntroAny && msConclusion
    ? null
    : "Write the manuscript — at least the opening and the closing response.";

  const artifacts = [
    { key: "observation_set",        label: "Observation Set",             reason: checkField3Composite(obsData),        jump: { stage: STAGE.Study, subPhase: "Observe", fieldKey: "divisions" } },
    { key: "interpretation_set",     label: "Interpretation Set",          reason: checkField8Composite(sermon),         jump: { stage: STAGE.Study, subPhase: "Interpret", fieldKey: "interpretation_synthesis" } },
    { key: "christ_connection",      label: "Christ-Connection Statement", reason: checkField5Composite(sermon),         jump: { stage: STAGE.Study, subPhase: "RedemptiveThread", fieldKey: "christ_connection_statement" } },
    { key: "implications_synthesis", label: "Implications Synthesis",      reason: checkPhase4Field4Composite(sermon),   jump: { stage: STAGE.Study, subPhase: "Implications", fieldKey: "implications_synthesis" } },
    { key: "mpt",                    label: "Main Point of the Text",      reason: checkMPTComposite(mppData),           jump: { stage: STAGE.Assembly, subPhase: "Anchor", fieldKey: "mpt" } },
    { key: "mps",                    label: "Main Point of the Sermon",    reason: checkMPSComposite(mppData),           jump: { stage: STAGE.Assembly, subPhase: "Anchor", fieldKey: "mps" } },
    // eslint-disable-next-line sermonforge/canonical-stage-name -- field key, not a stage status
    { key: "outline",                label: "Sermon Outline",              reason: outlineReason,                        jump: { stage: STAGE.Assembly, subPhase: "Outline", fieldKey: "outline" } },
    { key: "body",                   label: "Sermon Body",                 reason: bodyReason,                           jump: { stage: STAGE.Assembly, subPhase: "Equip", fieldKey: "equip" } },
    { key: "intro",                  label: "Sermon Frame — Introduction", reason: checkIntroComposite(frameData),       jump: { stage: STAGE.Assembly, subPhase: "Frame", fieldKey: "intro" } },
    { key: "conclusion",             label: "Sermon Frame — Conclusion",   reason: checkConclusionComposite(frameData),  jump: { stage: STAGE.Assembly, subPhase: "Frame", fieldKey: "conclusion" } },
    { key: "manuscript",             label: "Manuscript",                  reason: manuscriptReason,                     jump: { stage: STAGE.Manuscript, subPhase: STAGE.Manuscript, fieldKey: "introduction" } },
  ].map((a) => ({ ...a, complete: a.reason == null }));

  return { artifacts, allComplete: artifacts.every((a) => a.complete) };
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

// Field-teaching first-visit ids ride the same thresholds_seen mechanism
// (one mechanism, per the comment above) but are position-derived rather
// than enum members — up to one per field per sermon. This helper is the
// single namespace authority so the format can't drift across call sites.
export function fieldOverviewThresholdId(stage, subPhase, fieldKey) {
  return `field-overview:${stage}/${subPhase}/${fieldKey}`;
}
