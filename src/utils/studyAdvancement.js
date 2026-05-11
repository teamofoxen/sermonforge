// SermonForge — Study advancement helpers
//
// Shared logic for the renderer's spine routing of sub-phase, step, and stage
// transitions. SPRD Q1 (2026-05-02) introduced the per-position evidence
// builders inline in StudyTab and SermonWorkspace; SPRD Q3 (2026-05-02) lifted
// them here so the disabled-Continue UX (Q3) and the click-then-banner UX (Q1)
// share a single source of truth.
//
// SFDI hook point — `evaluateAdvance` is the function SFDI's per-boundary
// thresholds (coverage, structural completeness, synthesis presence) plug into.
// The Q3 pilot ships the empty-evidence baseline; SFDI's thresholds extend
// `evaluateAdvance` without UI changes.

import { STAGE, SUB_PHASE, STUDY_SUB_PHASE_SEQUENCE, ASSEMBLY_SUB_PHASE_SEQUENCE } from "../core/contracts";
import {
  parseStructuredField,
  answeredQuestions,
  getQuestionAnswer,
  isQuestionNA,
  flattenAnswerValue,
  DEFAULT_QUESTION_KEY,
} from "./studyFields";

// Per-stage sub-phase index lookup. `canonicalSubPhase(n, stage)` resolves
// a 1-based sub-phase index to its enum value within the named stage.
// Stage defaults to Study so single-arg call sites that predate the
// per-stage sub-phase layer keep working.
const SUB_PHASE_BY_INDEX = {
  [STAGE.Study]: STUDY_SUB_PHASE_SEQUENCE,
  [STAGE.Assembly]: ASSEMBLY_SUB_PHASE_SEQUENCE,
};

// STAGE_BY_INDEX mirrors STAGE_SEQUENCE; used by evaluateAdvance
// when kind === "stage". Indexes: 1=Study, 2=Assembly, 3=Manuscript.
const STAGE_BY_INDEX = [STAGE.Study, STAGE.Assembly, STAGE.Manuscript, STAGE.Delivery];

// "outline" here is the database column name (the JSON column that holds
// the sermon's outline data), not the pre-Pilot-B stage alias the
// `canonical-stage-name` lint rule guards against.
/* eslint-disable sermonforge/canonical-stage-name */
const SUB_PHASE_FIELD_MAP = {
  [SUB_PHASE.Observe]: "observations",
  [SUB_PHASE.Interpret]: "interpretation",
  [SUB_PHASE.RedemptiveThread]: "redemptive_thread",
  [SUB_PHASE.Implications]: "implications",
  // Assembly sub-phases map to their canonical columns. Anchor's source-
  // column is the v19 main_point_pair envelope; Outline + Equip + Frame
  // use their existing JSON columns.
  [SUB_PHASE.Anchor]: "main_point_pair",
  [SUB_PHASE.Outline]: "outline",
  [SUB_PHASE.Equip]: "functional_elements",
  [SUB_PHASE.Frame]: "sermon_frame",
};
/* eslint-enable sermonforge/canonical-stage-name */

export function canonicalSubPhase(n, stage = STAGE.Study) {
  const seq = SUB_PHASE_BY_INDEX[stage];
  return seq ? seq[n - 1] : undefined;
}

// Inverse of `canonicalSubPhase`: resolve a stored SUB_PHASE string back
// to its 1-based index within the named stage. Returns 1 when the input
// is missing or doesn't belong to the stage — both StudyTab and AssemblyTab
// derive `activeSubPhase` from `sermon.last_*_subphase` through this helper.
export function subPhaseToIndex(value, stage = STAGE.Study) {
  if (typeof value !== "string") return 1;
  const seq = SUB_PHASE_BY_INDEX[stage];
  if (!seq) return 1;
  const idx = seq.indexOf(value);
  return idx >= 0 ? idx + 1 : 1;
}

// Evidence joins all answered (non-N/A, non-empty) text-prompt values across
// the phase's fields. Legacy free-text data still surfaces under data.legacy_notes.
export function buildSubPhaseEvidence(sermon, subPhase) {
  const fieldName = SUB_PHASE_FIELD_MAP[subPhase];
  if (!fieldName || !sermon) return "";
  // Outline + FE columns are not envelope-shaped; treat as raw JSON strings
  // with the "[]" / "{}" empty-shape sentinels.
  if (subPhase === SUB_PHASE.Outline) {
    const o = (sermon.outline || "").trim();
    return o === "" || o === "[]" ? "" : o;
  }
  if (subPhase === SUB_PHASE.Equip) {
    const fe = (sermon.functional_elements || "").trim();
    return fe === "" || fe === "{}" ? "" : fe;
  }
  const data = parseStructuredField(sermon[fieldName]);
  if (!data || typeof data !== "object") return "";
  const parts = answeredQuestions(data).map((a) => a.value);
  if (typeof data.legacy_notes === "string" && data.legacy_notes.trim()) {
    parts.push(data.legacy_notes.trim());
  }
  return parts.join("\n");
}

export function buildStageEvidence(sermon, stage) {
  if (!sermon) return "";
  const nonEmpty = (s) => {
    if (!s) return "";
    const t = String(s).trim();
    if (t === "" || t === "[]" || t === "{}") return "";
    return t;
  };
  if (stage === STAGE.Study) {
    // Study = exegesis only (Observe / Interpret / Redemptive / Implications).
    return [
      sermon.observations, sermon.interpretation,
      sermon.redemptive_thread, sermon.implications,
    ].map(nonEmpty).filter((s) => s).join("\n");
  }
  if (stage === STAGE.Assembly) {
    // Assembly = Anchor (main_point_pair + flat mpt/mps mirrors) + Outline
    // + Equip (functional_elements) + Frame (sermon_frame).
    return [
      sermon.main_point_pair, sermon.mpt, sermon.mps,
      sermon.outline, sermon.functional_elements, sermon.sermon_frame,
    ].map(nonEmpty).filter((s) => s).join("\n");
  }
  if (stage === STAGE.Manuscript) {
    return nonEmpty(sermon.manuscript);
  }
  if (stage === STAGE.Delivery) {
    return [sermon.delivery_notes, sermon.timing_notes, sermon.post_sermon].map(nonEmpty).filter((s) => s).join("\n");
  }
  return "";
}

// SPRD Q3 — evaluateAdvance returns the structural sufficiency check that the
// disabled-Continue UI consumes. Layered:
//
//   1. Empty-evidence baseline (Q3 pilot): something must be in the source
//      position. Below this, every gate fails.
//   2. SFDI per-boundary thresholds: stricter requirements at specific
//      sub-phase boundaries — load-bearing fields must be filled (or N/A).
//      The Observe → Interpret threshold ships in B1.4 (Field 7 + Field 8);
//      the Field 3 composite extends it once B1.5 wires Field 3's three
//      structured-exercise questions. Other phase boundaries remain on the
//      baseline until SFDI's per-phase walks are wired in B2/B3/B4.
//
// kind: "sub_phase" | "step"
// fromIndex: 1-4 (the source position's local index)
//
// Special case: kind="sub_phase", fromIndex=4 — advancing out of Implications
// is a STEP transition (Exegesis → MPT/MPS); evidence is the entire Exegesis
// step's content, not just Implications.

// Per-question completeness check shared with SpotlightWorksheet — a question
// counts as "answered" when it has flat-text content OR is marked N/A.
function isQuestionAnswered(data, fieldKey, questionKey) {
  if (isQuestionNA(data, fieldKey, questionKey)) return true;
  return !!flattenAnswerValue(getQuestionAnswer(data, fieldKey, questionKey));
}

// Field 3 composite-gate helpers. Phase 4 Sprint 2 (2026-05-05) collapsed
// Field 3's three legacy questions (sentence_layout / paraphrases /
// thought_units) into a single unified-canvas question. The three sub-checks
// preserve their semantics — and their pastor-facing reason strings —
// against the new canvas shape so the disabled-Continue hover-checklist UX
// reads identically.

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

// True if every main row (depth=0, non-empty text) carries a non-empty
// paraphrase string. Paraphrase lives inline on the canvas row in the
// unified shape — no positional ms-N indirection.
function everyMainHasParaphrase(canvas) {
  if (!Array.isArray(canvas) || canvas.length === 0) return false;
  let mainCount = 0;
  for (const row of canvas) {
    if (!row || typeof row !== "object") continue;
    const depth = Number.isInteger(row.depth) && row.depth >= 0 ? row.depth : 0;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (depth !== 0 || !text) continue;
    mainCount++;
    const para = typeof row.paraphrase === "string" ? row.paraphrase.trim() : "";
    if (!para) return false;
  }
  return mainCount > 0;
}

// True if at least one canvas row carries a thought_unit_end with a non-empty
// summary. The row's position is the implicit "after line" — no separate
// after_line check needed in the new shape.
function hasOneThoughtUnitEnd(canvas) {
  if (!Array.isArray(canvas) || canvas.length === 0) return false;
  for (const row of canvas) {
    if (!row || typeof row !== "object") continue;
    const tue = row.thought_unit_end;
    if (!tue || typeof tue !== "object") continue;
    const summary = typeof tue.summary === "string" ? tue.summary.trim() : "";
    if (summary) return true;
  }
  return false;
}

// Field 3 composite gate. Returns null when satisfied or a pastor-facing
// reason string when not. SFDI N/A escape valve: the unified canvas question
// marked N/A counts as satisfied (the pastor may declare the field
// inapplicable for this passage).
function checkField3Composite(data) {
  const fieldKey = "divisions";

  // N/A short-circuit.
  if (isQuestionNA(data, fieldKey, "canvas")) return null;

  const canvas = getQuestionAnswer(data, fieldKey, "canvas");

  // Q1 — at least one main sentence (depth 0) with an indented modifier
  // (depth > 0) under it.
  if (!canvasHasMainWithModifier(canvas)) {
    return "Lay out the passage before advancing — at least one main sentence with an indented modifier under it.";
  }

  // Q2 — every main row carries a non-empty paraphrase.
  if (!everyMainHasParaphrase(canvas)) {
    return "Rewrite each main sentence in your own words before advancing.";
  }

  // Q3 — at least one row has a thought_unit_end with non-empty summary.
  if (!hasOneThoughtUnitEnd(canvas)) {
    return "Name at least one thought unit (with the line it ends after) before advancing.";
  }

  return null;
}

// Field 8 (Interpretation Synthesis) composite gate for the Interpret →
// Redemptive Thread boundary (B2.2). Q1 satisfied when every thought-unit row
// in `observations.divisions.thought_units` has a non-empty `meaning` column.
// Q2 satisfied when `interpretation.interpretation_synthesis.meaning_whole`
// is non-empty. The thought-unit array is the canonical cross-phase artifact;
// per SFDI Phase 2 Field 8 the Interpretation Synthesis cannot be N/A — it's
// the named outcome — so no escape valve at the field level.
function checkField8Composite(sermon) {
  const obsData = parseStructuredField(sermon?.observations);
  const intData = parseStructuredField(sermon?.interpretation);

  const thoughtUnits = obsData?.divisions?.thought_units?.value;
  if (!Array.isArray(thoughtUnits) || thoughtUnits.length === 0) {
    return "Name at least one thought unit in Observe Field 3 before advancing.";
  }
  const allHaveMeaning = thoughtUnits.every(
    (row) => row && typeof row.meaning === "string" && row.meaning.trim()
  );
  if (!allHaveMeaning) {
    return "Write a Meaning entry beside every thought unit before advancing.";
  }

  if (!isQuestionAnswered(intData, "interpretation_synthesis", "meaning_whole")) {
    return "Write the whole-passage meaning paragraph before advancing.";
  }

  return null;
}

// Field 4 (Implications Synthesis) composite gate for the Implications →
// MPT/MPS boundary (B4.2). Q1 satisfied when every thought-unit row in
// `observations.divisions.thought_units` has a non-empty `implication`
// column. Q2 satisfied when `implications.implications_synthesis.synthesis`
// is non-empty. Per SFDI Phase 4, the Implications Synthesis is the named
// outcome and cannot be N/A — it's the marinate-output the pastor sits
// with before MPT/MPS.
function checkPhase4Field4Composite(sermon) {
  const obsData = parseStructuredField(sermon?.observations);
  const impData = parseStructuredField(sermon?.implications);

  const thoughtUnits = obsData?.divisions?.thought_units?.value;
  if (!Array.isArray(thoughtUnits) || thoughtUnits.length === 0) {
    return "Name at least one thought unit in Observe Field 3 before advancing.";
  }
  const allHaveImplication = thoughtUnits.every(
    (row) => row && typeof row.implication === "string" && row.implication.trim()
  );
  if (!allHaveImplication) {
    return "Write an Implication entry beside every thought unit before advancing.";
  }

  if (!isQuestionAnswered(impData, "implications_synthesis", "synthesis")) {
    return "Write the Implications Synthesis paragraph before advancing.";
  }

  return null;
}

// SPRD C3 — Sermon Frame composite gate (Frame → Manuscript boundary).
// Per SADI Step 5 ratification: Intro requires Q1+Q2+Q3 non-empty (no N/A)
// and Q4 non-empty-or-N/A; Conclusion requires Q1+Q2+Q3+Q4 all non-empty
// (no N/A path). Returns null when satisfied or a pastor-facing reason.
function checkIntroComposite(frameData) {
  if (!frameData || typeof frameData !== "object") {
    return "Write the Intro fields before advancing.";
  }
  const fieldKey = "intro";
  const required = ["hook", "bridge_to_text", "expectations"];
  for (const qKey of required) {
    if (!isQuestionAnswered(frameData, fieldKey, qKey)) {
      return `Write the Intro ${qKey.replace(/_/g, " ")} answer before advancing.`;
    }
  }
  // Q4 (redemptive_note) — non-empty OR explicit N/A (the SADI "satisfied
  // another way" carve-out for redemptive hooks).
  if (!isQuestionAnswered(frameData, fieldKey, "redemptive_note")) {
    return "Write the Intro redemptive note (or mark it N/A if the hook itself was redemptive) before advancing.";
  }
  return null;
}

function checkConclusionComposite(frameData) {
  if (!frameData || typeof frameData !== "object") {
    return "Write the Conclusion fields before advancing.";
  }
  const fieldKey = "conclusion";
  const required = ["summate", "land_call", "gospel_empower", "closing_posture"];
  for (const qKey of required) {
    // Conclusion is no-N/A across the board — N/A doesn't satisfy these.
    const answered = !isQuestionNA(frameData, fieldKey, qKey)
      && !!flattenAnswerValue(getQuestionAnswer(frameData, fieldKey, qKey));
    if (!answered) {
      return `Write the Conclusion ${qKey.replace(/_/g, " ")} answer before advancing.`;
    }
  }
  return null;
}

function checkSermonFrameToManuscriptThreshold(sermon) {
  const frameData = parseStructuredField(sermon?.sermon_frame);

  const introReason = checkIntroComposite(frameData);
  const conclusionReason = checkConclusionComposite(frameData);

  const gates = [
    {
      key: "intro",
      label: "Intro",
      met: !introReason,
      reason: introReason || undefined,
    },
    {
      key: "conclusion",
      label: "Conclusion",
      met: !conclusionReason,
      reason: conclusionReason || undefined,
    },
  ];

  const firstFailing = gates.find((g) => !g.met);
  return {
    gates,
    firstReason: firstFailing ? firstFailing.reason : null,
  };
}

// SADI Step 2 — MPT composite gate (Step 2 → Step 3 / Outline boundary).
// Per SADI ratification: MPT Q1 (draft) and Q2 (tighten) both non-empty,
// neither N/A-able. Q2 carries an advisory single-sentence check that
// surfaces a hint but does not block — pastor judgment wins.
function checkMPTComposite(mppData) {
  if (!mppData || typeof mppData !== "object") {
    return "Write the MPT (draft and tighten) before advancing.";
  }
  const fieldKey = "mpt";
  for (const qKey of ["draft", "tighten"]) {
    const answered = !isQuestionNA(mppData, fieldKey, qKey)
      && !!flattenAnswerValue(getQuestionAnswer(mppData, fieldKey, qKey));
    if (!answered) {
      return `Write the MPT ${qKey} answer before advancing.`;
    }
  }
  return null;
}

// SADI Step 2 — MPS composite gate. Per SADI ratification: MPS Q1
// (translate) and Q3 (tighten) both non-empty, no N/A. Q2 (gospel_check)
// non-empty OR explicit N/A (the "satisfied another way" carve-out for
// passages where the moralism check was completed upstream and surfaced
// nothing).
function checkMPSComposite(mppData) {
  if (!mppData || typeof mppData !== "object") {
    return "Write the MPS (translate, gospel-check, tighten) before advancing.";
  }
  const fieldKey = "mps";
  // Q1 + Q3: load-bearing, no N/A.
  for (const qKey of ["translate", "tighten"]) {
    const answered = !isQuestionNA(mppData, fieldKey, qKey)
      && !!flattenAnswerValue(getQuestionAnswer(mppData, fieldKey, qKey));
    if (!answered) {
      return `Write the MPS ${qKey} answer before advancing.`;
    }
  }
  // Q2: non-empty OR explicit N/A.
  if (!isQuestionAnswered(mppData, fieldKey, "gospel_check")) {
    return "Complete the MPS gospel-check (or mark it N/A if checked upstream) before advancing.";
  }
  return null;
}

// SADI Step 2 → Step 3 (Outline) composite gate. Two sub-gates: MPT
// composite + MPS composite. Returns `{ gates, firstReason }` per the
// established B1.6 shape; the disabled-Continue UI renders the
// hover-checklist when there are multiple gates.
// Anchor → Outline threshold ratification (RW2 resolved post-walkthrough):
// every outline point must carry non-empty text. The pre-restructure gate
// only checked outline.length >= 1, which let placeholder rows through.
// Same `{ gates, firstReason }` shape as the other composites.
function checkOutlineToEquipThreshold(sermon) {
  let points = [];
  try {
    const raw = sermon?.outline;
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      points = parsed.map((p, i) => ({
        idx: i,
        text: typeof p === "string" ? p : (typeof p?.text === "string" ? p.text : ""),
      }));
    }
  } catch {
    points = [];
  }
  const missing = points.filter((p) => !p.text.trim());
  const gates = [
    {
      key: "outline_has_points",
      label: "Outline points present",
      met: points.length > 0,
      reason: points.length > 0 ? undefined : "Add at least one outline point.",
    },
    {
      key: "outline_all_named",
      label: "Every point named",
      met: points.length > 0 && missing.length === 0,
      reason:
        points.length === 0
          ? undefined
          : missing.length > 0
            ? `${missing.length === 1 ? "Point" : "Points"} ${missing.map((m) => m.idx + 1).join(", ")} ${missing.length === 1 ? "is" : "are"} empty — name ${missing.length === 1 ? "it" : "them"} before equipping.`
            : undefined,
    },
  ];
  const firstFailing = gates.find((g) => !g.met);
  return {
    gates,
    firstReason: firstFailing ? firstFailing.reason : null,
  };
}

function checkStep2ToOutlineThreshold(sermon) {
  const mppData = parseStructuredField(sermon?.main_point_pair);

  const mptReason = checkMPTComposite(mppData);
  const mpsReason = checkMPSComposite(mppData);

  const gates = [
    {
      key: "mpt",
      label: "MPT",
      met: !mptReason,
      reason: mptReason || undefined,
    },
    {
      key: "mps",
      label: "MPS",
      met: !mpsReason,
      reason: mpsReason || undefined,
    },
  ];

  const firstFailing = gates.find((g) => !g.met);
  return {
    gates,
    firstReason: firstFailing ? firstFailing.reason : null,
  };
}

// SFDI Implications → MPT/MPS threshold (per `study-field-definition-
// initiative.md` § "The hard gate at the boundary" inside Phase 4). Returns
// `{ gates, firstReason }` mirroring B1.6's structured shape. One load-
// bearing field (Field 4 / Implications Synthesis); the gate carries
// Field 4's failing sub-reason when unmet.
function checkImplicationsToMPTMPSThreshold(sermon) {
  const impData = parseStructuredField(sermon?.implications);
  if (!impData || typeof impData !== "object") {
    return {
      gates: [],
      firstReason: "Add some content before advancing.",
    };
  }

  const f4Reason = checkPhase4Field4Composite(sermon);
  const gates = [
    {
      key: "field_4_implications_synthesis",
      label: "Implications Synthesis",
      met: !f4Reason,
      reason: f4Reason || undefined,
    },
  ];

  return {
    gates,
    firstReason: f4Reason,
  };
}

// Field 5 (Christ-Connection Statement) composite gate for the Redemptive
// Thread → Implications boundary (B3.2). Q1 satisfied when every thought-
// unit row in `observations.divisions.thought_units` has a non-empty
// `christ_connection` column. Q2 satisfied when
// `redemptive_thread.christ_connection_statement.statement` is non-empty.
// Per SFDI Phase 3, the Christ-Connection Statement is the named outcome
// and cannot be N/A.
function checkField5Composite(sermon) {
  const obsData = parseStructuredField(sermon?.observations);
  const redData = parseStructuredField(sermon?.redemptive_thread);

  const thoughtUnits = obsData?.divisions?.thought_units?.value;
  if (!Array.isArray(thoughtUnits) || thoughtUnits.length === 0) {
    return "Name at least one thought unit in Observe Field 3 before advancing.";
  }
  const allHaveChristConnection = thoughtUnits.every(
    (row) =>
      row && typeof row.christ_connection === "string" && row.christ_connection.trim()
  );
  if (!allHaveChristConnection) {
    return "Write a Christ-Connection entry beside every thought unit before advancing.";
  }

  if (!isQuestionAnswered(redData, "christ_connection_statement", "statement")) {
    return "Write the Christ-Connection Statement paragraph before advancing.";
  }

  return null;
}

// SFDI Redemptive Thread → Implications threshold (per `study-field-definition-
// initiative.md` § "The hard gate at the boundary" inside Phase 3). Returns
// `{ gates, firstReason }` mirroring B1.6's structured shape. One load-bearing
// field (Field 5); the gate carries Field 5's failing sub-reason when unmet.
function checkRedemptiveToImplicationsThreshold(sermon) {
  const redData = parseStructuredField(sermon?.redemptive_thread);
  if (!redData || typeof redData !== "object") {
    return {
      gates: [],
      firstReason: "Add some content before advancing.",
    };
  }

  const f5Reason = checkField5Composite(sermon);
  const gates = [
    {
      key: "field_5_christ_connection_statement",
      label: "Christ-Connection Statement",
      met: !f5Reason,
      reason: f5Reason || undefined,
    },
  ];

  return {
    gates,
    firstReason: f5Reason,
  };
}

// SFDI Interpret → Redemptive Thread threshold (per `study-field-definition-
// initiative.md` § "The hard gate at the boundary" inside Phase 2). Returns
// `{ gates, firstReason }` mirroring the Phase 1 threshold's shape. One
// load-bearing field (Field 7); the gate carries Field 7's failing sub-reason
// when unmet.
function checkInterpretToRedemptiveThreshold(sermon) {
  const intData = parseStructuredField(sermon?.interpretation);
  if (!intData || typeof intData !== "object") {
    return {
      gates: [],
      firstReason: "Add some content before advancing.",
    };
  }

  const f8Reason = checkField8Composite(sermon);
  const gates = [
    {
      key: "field_8_interpretation_synthesis",
      label: "Interpretation Synthesis",
      met: !f8Reason,
      reason: f8Reason || undefined,
    },
  ];

  return {
    gates,
    firstReason: f8Reason,
  };
}

// SFDI Observe → Interpret threshold (per `study-field-definition-initiative
// .md` § "The hard gate at the boundary"). Returns a structured object:
//   {
//     gates: [{key, label, met, reason?}, ...],   // one entry per load-bearing field
//     firstReason: string | null,                 // first failing gate's reason, or null
//   }
// The disabled-Continue UI reads `firstReason` for the legacy single-line
// hint and `gates` for the hover-checklist (B1.6). Per SFDI, three gates:
// Field 3 (composite), Field 7 (Obvious Point), Field 8 (Possible Implications).
// SFDI N/A escape valve preserved per question.
function checkObserveToInterpretThreshold(sermon) {
  const data = parseStructuredField(sermon?.observations);
  if (!data || typeof data !== "object") {
    return {
      gates: [],
      firstReason: "Add some content before advancing.",
    };
  }

  const gates = [];

  // Field 3 — Divisions / Thought Units composite (B1.5).
  const f3Reason = checkField3Composite(data);
  gates.push({
    key: "field_3_divisions",
    label: "Divisions / Thought Units",
    met: !f3Reason,
    reason: f3Reason || undefined,
  });

  // Field 7 — Obvious Point. Single primary question; non-empty or N/A.
  const f7Met = isQuestionAnswered(data, "obvious_point", DEFAULT_QUESTION_KEY);
  gates.push({
    key: "field_7_obvious_point",
    label: "Obvious Point",
    met: f7Met,
    reason: f7Met ? undefined : "State the Obvious Point before advancing.",
  });

  // Field 8 — Possible Implications. Both questions (pressing,
  // hard_and_hopeful) non-empty or N/A.
  const f8Met =
    isQuestionAnswered(data, "applications", "pressing") &&
    isQuestionAnswered(data, "applications", "hard_and_hopeful");
  gates.push({
    key: "field_8_possible_implications",
    label: "Possible Implications",
    met: f8Met,
    reason: f8Met ? undefined : "Answer the Possible Implications questions before advancing.",
  });

  const firstFailing = gates.find((g) => !g.met);
  return {
    gates,
    firstReason: firstFailing ? firstFailing.reason : null,
  };
}

// `evaluateAdvance` gates an outbound transition. The `stage` arg (4th)
// disambiguates Study sub-phases from Assembly sub-phases when
// kind === "sub_phase". For kind === "stage", stage is ignored
// (fromIndex is enough — 1=Study→Assembly, 2=Assembly→Manuscript).
// kind === "step" is not accepted — returns ok:false. Call sites that
// used the within-Study Step layer migrate to sub_phase + STAGE.Assembly:
// `evaluateAdvance(sermon, "sub_phase", 1, STAGE.Assembly)` is Anchor →
// Outline (the former MPT/MPS → Outline boundary).
export function evaluateAdvance(sermon, kind, fromIndex, stage = STAGE.Study) {
  if (!sermon) return { ok: false, reason: "" };
  let evidence = "";
  if (kind === "sub_phase") {
    if (fromIndex < 4) {
      // Mid-stage sub-phase boundary — evidence is the source sub-phase's
      // column content.
      evidence = buildSubPhaseEvidence(sermon, canonicalSubPhase(fromIndex, stage));
    } else {
      // Advancing past the last sub-phase of a stage = stage transition.
      // Evidence is the whole stage's accumulated content.
      evidence = buildStageEvidence(sermon, stage);
    }
  } else if (kind === "stage") {
    evidence = buildStageEvidence(sermon, STAGE_BY_INDEX[fromIndex - 1]);
  }
  if (!evidence) {
    return { ok: false, reason: "Add some content before advancing." };
  }

  // Study sub-phase boundary thresholds. SFDI per-boundary composites
  // layer on top of the empty-evidence baseline:
  //   - Observe → Interpret              (sub_phase, 1, Study) — B1.4 + B1.5
  //   - Interpret → Redemptive Thread    (sub_phase, 2, Study) — B2.2
  //   - Redemptive Thread → Implications (sub_phase, 3, Study) — B3.2
  //   - Implications → next stage        (sub_phase, 4, Study) — B4.2
  //     (the Study → Assembly stage boundary — fires the
  //     `checkImplicationsToMPTMPSThreshold` composite)
  // The threshold returns a structured `{gates, firstReason}` so the
  // disabled-Continue UI can render either a single-line hint
  // (firstReason) or the multi-gate hover-checklist (gates) per B1.6.
  if (kind === "sub_phase" && stage === STAGE.Study && fromIndex === 1) {
    const result = checkObserveToInterpretThreshold(sermon);
    if (result.firstReason) {
      return {
        ok: false,
        reason: result.firstReason,
        ...(result.gates.length > 0 ? { gates: result.gates } : {}),
      };
    }
    if (result.gates.length > 0) {
      return { ok: true, gates: result.gates };
    }
  }
  if (kind === "sub_phase" && stage === STAGE.Study && fromIndex === 2) {
    const result = checkInterpretToRedemptiveThreshold(sermon);
    if (result.firstReason) {
      return {
        ok: false,
        reason: result.firstReason,
        ...(result.gates.length > 0 ? { gates: result.gates } : {}),
      };
    }
    if (result.gates.length > 0) {
      return { ok: true, gates: result.gates };
    }
  }
  if (kind === "sub_phase" && stage === STAGE.Study && fromIndex === 3) {
    const result = checkRedemptiveToImplicationsThreshold(sermon);
    if (result.firstReason) {
      return {
        ok: false,
        reason: result.firstReason,
        ...(result.gates.length > 0 ? { gates: result.gates } : {}),
      };
    }
    if (result.gates.length > 0) {
      return { ok: true, gates: result.gates };
    }
  }
  // Study → Assembly stage boundary. Two equivalent call shapes resolve
  // here: sub_phase fromIndex=4 with stage=Study (the renderer advancing
  // past Implications) AND stage fromIndex=1 (an explicit stage advance).
  if (
    (kind === "sub_phase" && stage === STAGE.Study && fromIndex === 4) ||
    (kind === "stage" && fromIndex === 1)
  ) {
    const result = checkImplicationsToMPTMPSThreshold(sermon);
    if (result.firstReason) {
      return {
        ok: false,
        reason: result.firstReason,
        ...(result.gates.length > 0 ? { gates: result.gates } : {}),
      };
    }
    if (result.gates.length > 0) {
      return { ok: true, gates: result.gates };
    }
  }

  // Assembly sub-phase boundary thresholds.
  // - Anchor → Outline (sub_phase, 1, Assembly): MPT + MPS composite gate
  //   inherited from SADI Step 2 → Step 3 plumbing.
  // - Outline → Equip (sub_phase, 2, Assembly): empty-evidence baseline
  //   (outline must have at least one point) — no extra threshold today.
  // - Equip → Frame (sub_phase, 3, Assembly): empty-evidence baseline
  //   (FE must have content for at least one outline point) — no extra
  //   threshold today.
  // - Frame → next stage (sub_phase, 4, Assembly): the Assembly →
  //   Manuscript stage boundary — fires the checkSermonFrameToManuscriptThreshold
  //   composite that was previously bound to the Frame stage's outbound
  //   transition.
  if (kind === "sub_phase" && stage === STAGE.Assembly && fromIndex === 1) {
    const result = checkStep2ToOutlineThreshold(sermon);
    if (result.firstReason) {
      return {
        ok: false,
        reason: result.firstReason,
        ...(result.gates.length > 0 ? { gates: result.gates } : {}),
      };
    }
    if (result.gates.length > 0) {
      return { ok: true, gates: result.gates };
    }
  }
  // Outline → Equip — every outline point must have non-empty text (RW2).
  if (kind === "sub_phase" && stage === STAGE.Assembly && fromIndex === 2) {
    const result = checkOutlineToEquipThreshold(sermon);
    if (result.firstReason) {
      return {
        ok: false,
        reason: result.firstReason,
        ...(result.gates.length > 0 ? { gates: result.gates } : {}),
      };
    }
    if (result.gates.length > 0) {
      return { ok: true, gates: result.gates };
    }
  }
  // Assembly → Manuscript stage boundary. Same two-shape pattern as the
  // Study → Assembly boundary above.
  if (
    (kind === "sub_phase" && stage === STAGE.Assembly && fromIndex === 4) ||
    (kind === "stage" && fromIndex === 2)
  ) {
    const result = checkSermonFrameToManuscriptThreshold(sermon);
    if (result.firstReason) {
      return {
        ok: false,
        reason: result.firstReason,
        ...(result.gates.length > 0 ? { gates: result.gates } : {}),
      };
    }
    if (result.gates.length > 0) {
      return { ok: true, gates: result.gates };
    }
  }

  return { ok: true };
}

// Rejection formatters — used by Q1's click-then-banner fallback path. Q3
// disables the button before the click for the common empty-evidence case;
// these formatters still apply when a rejection slips through (e.g., a future
// SFDI rule that fires only main-side, or a race condition).

export function formatAdvanceRejection(e) {
  if (!e) return "Couldn't advance.";
  if (e.code === "PROCESS_2_EMPTY_EVIDENCE") return "Add some content before advancing.";
  if (e.code === "PROCESS_1_FORWARD_TO_PRIOR") return "Can't move forward to a prior position.";
  return e.message || "Couldn't advance.";
}

export function formatTabRejection(e) {
  if (!e) return "Couldn't change tab.";
  if (e.code === "PROCESS_2_EMPTY_EVIDENCE") return "Add some content before moving to a new stage.";
  if (e.code === "PROCESS_1_FORWARD_TO_PRIOR") return "Can't move forward to a prior stage.";
  return e.message || "Couldn't change tab.";
}
