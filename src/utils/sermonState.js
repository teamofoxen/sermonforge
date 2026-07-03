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
// wrapper. Only the surviving composites (`checkField8Composite`,
// `checkPhase4Field4Composite`, `checkField5Composite`, `checkMPTComposite`,
// `checkMPSComposite`) and `hasContent` from studyAdvancement.js are touched.
// The Observation Set artifact uses the lenient Obvious Point check (M2
// ruling, 2026-07-02: Finish must agree with the handoff/pane/map, which all
// treat the Obvious Point text alone as sufficient). The former Divisions
// composite that once checked it was dropped from the roll-up then and
// removed 2026-07-02 (Track A).

import { STAGE } from "../core/contracts";
import { QUESTION_WALK_ORDER, WALK_ORDER, REGION_NAMED_OUTCOME, questionId } from "./walkOrder";
import { parseStructuredField, getQuestionAnswer, composeThoughtUnitBlocks } from "./studyFields";
import {
  hasContent,
  checkField8Composite,
  checkPhase4Field4Composite,
  checkField5Composite,
  checkMPTComposite,
  checkMPSComposite,
} from "./studyAdvancement";
import { getOutline, getFunctionalElements, parseManuscript, bodyHasSubstance } from "../utils";
import { cumulativeCellSatisfied } from "./studyFields";

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
  // OEM restructure (2026-07-02): Equip moved into Manuscript as Body; the
  // Frame sub-phase collapsed into the doors (its sermon_frame column stays
  // on disk as legacy data but is no longer a walk destination).
  "Manuscript/Body":         "functional_elements",
  "Manuscript/IntroTransitionsConclusion": "manuscript",
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
  // Verse spans for the partial-state "Unit N" labels — composed live from
  // the canvas (ruled 2026-07-02: a unit is its block, labeled by the verses
  // it spans). Order-preserving 1:1 with thoughtUnits, so index lookup holds.
  const unitBlocks = composeThoughtUnitBlocks(readDivisionsCanvas(sermon), thoughtUnits);
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
      // A cell counts as filled when it has text OR is marked N/A per-cell
      // (canon §5 rule 2c). The preview + full text prefer real text and show
      // "(not applicable)" for N/A'd cells.
      const filled = thoughtUnits.filter((u) => cumulativeCellSatisfied(u, editableKey));
      const cellDisplay = (u) =>
        u?.[`${editableKey}_na`] === true ? "(not applicable)" : String(u?.[editableKey] ?? "");
      const firstText =
        thoughtUnits.map((u) => String(u?.[editableKey] ?? "").trim()).find(Boolean)
        || "(not applicable)";
      if (filled.length === 0) {
        out[id] = { state: "unanswered" };
      } else if (filled.length === thoughtUnits.length) {
        const full = thoughtUnits.map(cellDisplay).join("\n\n");
        out[id] = { state: "answered", preview: firstText, fullValue: full };
      } else {
        const full = thoughtUnits
          .map((u, i) => {
            const span = unitBlocks[i]?.verse_span;
            return `Unit ${i + 1}${span ? ` (${span})` : ""}: ${cellDisplay(u) || "—"}`;
          })
          .join("\n\n");
        out[id] = { state: "partial", preview: firstText, fullValue: full };
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
      // OEM Equip ruling (2026-07-02): "answered" obeys the teaching — a point
      // is fully equipped when its GATING elements are written. Which elements
      // gate is declared in the field def: illustration carries `gating: false`
      // ("serves," never gates); every other element gates. Illustration still
      // counts toward the filled/preview signal.
      const gatingKeys = new Set(
        (entry.elements || []).filter((e) => e.gating !== false).map((e) => e.key)
      );
      if (points.length === 0 || elementKeys.length === 0) {
        out[id] = { state: "unanswered" };
        continue;
      }
      // One pass over the points × elements grid: count filled cells (for the
      // empty/preview signal) and track per-point gating in the same walk.
      let filledCells = 0;
      let firstPreview = "";
      let everyPointGated = true;
      for (const pt of points) {
        const fe = fes[pt.id] || {};
        let pointGated = true;
        for (const k of elementKeys) {
          const v = String(fe[k] ?? "").trim();
          if (v) {
            filledCells += 1;
            if (!firstPreview) firstPreview = v;
          } else if (gatingKeys.has(k)) {
            pointGated = false;
          }
        }
        if (!pointGated) everyPointGated = false;
      }
      if (filledCells === 0) out[id] = { state: "unanswered" };
      else if (everyPointGated) out[id] = { state: "answered", preview: firstPreview };
      else out[id] = { state: "partial", preview: firstPreview };
      continue;
    }
    if (entry.kind === "manuscript-prose") {
      const ms = manuscriptData;
      // N/A sidecar for native-column prose (the manuscript column stores
      // plain strings, not {value,na} envelopes): "<key>_na": true beside
      // the key. Only the allowlisted door question (introduction.
      // redemptive_note, strict "satisfied another way" semantics carried
      // through the Frame transplant) ever writes it.
      if (ms?.[entry.section]?.[`${entry.questionKey}_na`] === true) {
        out[id] = { state: "answered", preview: "(not applicable)" };
        continue;
      }
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
    if (entry.kind === "sermon-title") {
      // The terminal Title field (ruled 2026-07-02) reads the native `title`
      // column, not the region's JSON column. A sermon always has a name
      // (State #3), so this row reads answered in practice — the field is a
      // correction affordance, not a completeness gate.
      const t = String(sermon?.title ?? "").trim();
      out[id] = t
        ? { state: "answered", preview: t, fullValue: t }
        : { state: "unanswered" };
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
// Labels derive from REGION_NAMED_OUTCOME (the canonical owner) — not re-spelled
// (DMN Phase 2, 2026-07-03). Byte-identical to the prior literals; a rename in
// walkOrder.js now propagates here instead of silently diverging.
export const STUDY_NAMED_OUTCOMES = Object.freeze(
  [
    { stage: STAGE.Study, subPhase: "Observe",          fieldKey: "obvious_point",               questionKey: "primary" },
    { stage: STAGE.Study, subPhase: "Interpret",        fieldKey: "interpretation_synthesis",    questionKey: "meaning_whole" },
    { stage: STAGE.Study, subPhase: "RedemptiveThread", fieldKey: "christ_connection_statement", questionKey: "statement" },
    { stage: STAGE.Study, subPhase: "Implications",     fieldKey: "implications_synthesis",      questionKey: "synthesis" },
  ].map((o) => ({ label: REGION_NAMED_OUTCOME[o.subPhase], ...o })),
);

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
        // Unfinished only if a cell is neither written nor N/A'd (canon §5 2c).
        return thoughtUnits.some((u) => !cumulativeCellSatisfied(u, editable));
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
// CORE Process Contract #2 names the composite gates in studyAdvancement.js
// as the completeness contract; this derivation is their designed consumer
// (wired 2026-06-10; re-based 2026-07-02 when the Frame collapse retired the
// Intro/Conclusion composites). As of the M2 audit ruling (2026-07-02) this
// derivation consumes FIVE composites (`checkField8Composite`,
// `checkPhase4Field4Composite`, `checkField5Composite`, `checkMPTComposite`,
// `checkMPSComposite`) — the former Divisions composite was dropped in favor
// of the lenient Observation Set check below, so Finish agrees with the Study→
// Anchor handoff, the reference pane, and the sermon map instead of
// contradicting them. (CORE Process #2 was amended to the five-composite
// wording on 2026-07-02 — the M2 ruling is now the law's own text.)
// It returns one entry per load-bearing artifact, in walk order, each with a
// pastor-facing reason when incomplete and a jump position so the finish
// screen can offer "go write it".
//
// Observation Set / Outline / Sermon Body / Manuscript all use LENIENT
// presence checks. Outline/Body/Manuscript were RATIFIED lenient by the OEM
// walk (2026-07-02, agenda item 7): honest without nagging. The doors check
// = an opener answer + the Conclusion response; transitions are deliberately
// never counted (explicit ruling — preachable without written bridges; the
// map still tracks them honestly). Observation Set joined the lenient group
// per the M2 ruling above.
// This list is consumed by SermonFinish; it never blocks anything
// (Process #1: no walls — the answer informs, navigation stays free).
export function deriveSermonCompleteness(sermon) {
  const obsData = parseStructuredField(sermon?.observations);
  const mppData = parseStructuredField(sermon?.main_point_pair);
  const outlinePoints = getOutline(sermon);
  const functionalElements = getFunctionalElements(sermon);
  const manuscriptData = parseManuscript(sermon?.manuscript);

  // Lenient: at least one outline point with text.
  const outlineReason = outlinePoints.some((p) => String(p?.text ?? "").trim())
    ? null
    : "Lay out at least one outline point.";

  // Lenient: at least one functional element written under any point.
  const bodyHasAny = bodyHasSubstance(outlinePoints, functionalElements);
  const bodyReason = outlineReason
    ? "Build the outline first — the Sermon Body grows under its points."
    : bodyHasAny
      ? null
      : "Give at least one outline point its substance in Body.";

  // Lenient (ruled, item 7): an opener answer + the Conclusion response.
  const msOpener = String(manuscriptData?.introduction?.opener ?? "").trim();
  const msConclusion = String(manuscriptData?.conclusion?.response ?? "").trim();
  const manuscriptReason = msOpener && msConclusion
    ? null
    : "Write the manuscript — at least the opener and the closing response.";

  // Lenient (M2 ruling, 2026-07-02): the Observation Set is "done" the same
  // way everywhere else in the app — the Study→Anchor handoff, the reference
  // pane's "Your work" tab, and the sermon map's Divisions row all treat the
  // Obvious Point text as sufficient (see STUDY_NAMED_OUTCOMES above, which
  // drives all three). Finish previously asked more via a stricter Divisions
  // composite (an indented canvas modifier), which produced a contradictory verdict at
  // the walk's final review. Match the lenient check instead.
  const obviousPoint = getQuestionAnswer(obsData, "obvious_point", "primary");
  const observationSetReason = hasContent(obviousPoint)
    ? null
    : "Write the Obvious Point — the plain-sense point of the passage.";

  // Vocabulary-A labels derive from REGION_NAMED_OUTCOME (the canonical owner) —
  // not re-spelled (DMN Phase 2, 2026-07-03); byte-identical to the prior
  // literals. MPT/MPS keep their own labels: "Main Point of the Text/Sermon" is a
  // DISTINCT, finer vocabulary than the Anchor outcome "Main Point Pair" (the two
  // Main Points are separately-completable artifacts), deferred as Vocabulary B.
  const artifacts = [
    { key: "observation_set",        label: REGION_NAMED_OUTCOME.Observe,          reason: observationSetReason,                 jump: { stage: STAGE.Study, subPhase: "Observe", fieldKey: "obvious_point" } },
    { key: "interpretation_set",     label: REGION_NAMED_OUTCOME.Interpret,        reason: checkField8Composite(sermon),         jump: { stage: STAGE.Study, subPhase: "Interpret", fieldKey: "interpretation_synthesis" } },
    { key: "christ_connection",      label: REGION_NAMED_OUTCOME.RedemptiveThread, reason: checkField5Composite(sermon),         jump: { stage: STAGE.Study, subPhase: "RedemptiveThread", fieldKey: "christ_connection_statement" } },
    { key: "implications_synthesis", label: REGION_NAMED_OUTCOME.Implications,     reason: checkPhase4Field4Composite(sermon),   jump: { stage: STAGE.Study, subPhase: "Implications", fieldKey: "implications_synthesis" } },
    { key: "mpt",                    label: "Main Point of the Text",              reason: checkMPTComposite(mppData),           jump: { stage: STAGE.Assembly, subPhase: "Anchor", fieldKey: "mpt" } },
    { key: "mps",                    label: "Main Point of the Sermon",            reason: checkMPSComposite(mppData),           jump: { stage: STAGE.Assembly, subPhase: "Anchor", fieldKey: "mps" } },
    // eslint-disable-next-line sermonforge/canonical-stage-name -- field key, not a stage status
    { key: "outline",                label: REGION_NAMED_OUTCOME.Outline,          reason: outlineReason,                        jump: { stage: STAGE.Assembly, subPhase: "Outline", fieldKey: "outline" } },
    { key: "body",                   label: REGION_NAMED_OUTCOME.Body,             reason: bodyReason,                           jump: { stage: STAGE.Manuscript, subPhase: "Body", fieldKey: "equip" } },
    { key: "manuscript",             label: REGION_NAMED_OUTCOME.IntroTransitionsConclusion, reason: manuscriptReason,           jump: { stage: STAGE.Manuscript, subPhase: "IntroTransitionsConclusion", fieldKey: "introduction" } },
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
