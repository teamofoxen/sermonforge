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

import { STAGE, STEP, SUB_PHASE } from "../core/contracts";
import {
  parseStructuredField,
  answeredQuestions,
  getQuestionAnswer,
  isQuestionNA,
  flattenAnswerValue,
  DEFAULT_QUESTION_KEY,
} from "./studyFields";

const SUB_PHASE_BY_INDEX = [SUB_PHASE.Observe, SUB_PHASE.Interpret, SUB_PHASE.RedemptiveThread, SUB_PHASE.Implications];
const STEP_BY_INDEX = [STEP.Exegesis, STEP.MPT_MPS, STEP.Outline, STEP.FunctionalElements];

const SUB_PHASE_FIELD_MAP = {
  [SUB_PHASE.Observe]: "observations",
  [SUB_PHASE.Interpret]: "interpretation",
  [SUB_PHASE.RedemptiveThread]: "redemptive_thread",
  [SUB_PHASE.Implications]: "implications",
};

export function canonicalSubPhase(n) {
  return SUB_PHASE_BY_INDEX[n - 1];
}

export function canonicalStep(n) {
  return STEP_BY_INDEX[n - 1];
}

// Evidence joins all answered (non-N/A, non-empty) text-prompt values across
// the phase's fields. Legacy free-text data still surfaces under data.legacy_notes.
export function buildSubPhaseEvidence(sermon, subPhase) {
  const fieldName = SUB_PHASE_FIELD_MAP[subPhase];
  if (!fieldName || !sermon) return "";
  const data = parseStructuredField(sermon[fieldName]);
  if (!data || typeof data !== "object") return "";
  const parts = answeredQuestions(data).map((a) => a.value);
  if (typeof data.legacy_notes === "string" && data.legacy_notes.trim()) {
    parts.push(data.legacy_notes.trim());
  }
  return parts.join("\n");
}

export function buildStepEvidence(sermon, step) {
  if (!sermon) return "";
  if (step === STEP.Exegesis) {
    return [
      buildSubPhaseEvidence(sermon, SUB_PHASE.Observe),
      buildSubPhaseEvidence(sermon, SUB_PHASE.Interpret),
      buildSubPhaseEvidence(sermon, SUB_PHASE.RedemptiveThread),
      buildSubPhaseEvidence(sermon, SUB_PHASE.Implications),
    ].filter((s) => s).join("\n");
  }
  if (step === STEP.MPT_MPS) {
    return [(sermon.mpt || "").trim(), (sermon.mps || "").trim()].filter((s) => s).join("\n");
  }
  if (step === STEP.Outline) {
    const o = (sermon.outline || "").trim();
    return o === "" || o === "[]" ? "" : o;
  }
  if (step === STEP.FunctionalElements) {
    const fe = (sermon.functional_elements || "").trim();
    return fe === "" || fe === "{}" ? "" : fe;
  }
  return "";
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
    return [
      sermon.observations, sermon.interpretation,
      sermon.redemptive_thread, sermon.implications,
      sermon.mpt, sermon.mps, sermon.outline, sermon.functional_elements,
    ].map(nonEmpty).filter((s) => s).join("\n");
  }
  if (stage === STAGE.Blueprint) {
    return [sermon.outline, sermon.functional_elements].map(nonEmpty).filter((s) => s).join("\n");
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
//      The Observe → Interpret threshold ships in B1.4 (Field 8 + Field 9);
//      the Field 4 composite extends it once B1.5 wires Field 4's three
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

// SFDI Observe → Interpret threshold (per `study-field-definition-initiative
// .md` § "The hard gate at the boundary"). Returns null when satisfied or a
// short pastor-facing reason string when not.
//
// Scope as of B1.4: Field 8 (Obvious Point) and Field 9 (Possible Implications)
// are wired. Field 4's composite gate (Q1 canvas + Q2 paraphrases + Q3 thought
// units) ships with B1.5 once the structured-exercise questions are mounted.
// Per-field non-empty checks for Fields 1, 2, 3, 5, 6, 7 are deferred until
// the SFDI baseline-tightening cut.
function checkObserveToInterpretThreshold(sermon) {
  const data = parseStructuredField(sermon?.observations);
  if (!data || typeof data !== "object") {
    return "Add some content before advancing.";
  }

  // Field 8 — Obvious Point. Single primary question; non-empty or N/A.
  if (!isQuestionAnswered(data, "obvious_point", DEFAULT_QUESTION_KEY)) {
    return "State the Obvious Point before advancing.";
  }

  // Field 9 — Possible Implications. Both questions (pressing,
  // hard_and_hopeful) non-empty or N/A.
  if (!isQuestionAnswered(data, "applications", "pressing")) {
    return "Answer the Possible Implications questions before advancing.";
  }
  if (!isQuestionAnswered(data, "applications", "hard_and_hopeful")) {
    return "Answer the Possible Implications questions before advancing.";
  }

  return null;
}

export function evaluateAdvance(sermon, kind, fromIndex) {
  if (!sermon) return { ok: false, reason: "" };
  let evidence = "";
  if (kind === "sub_phase") {
    if (fromIndex < 4) {
      evidence = buildSubPhaseEvidence(sermon, canonicalSubPhase(fromIndex));
    } else {
      evidence = buildStepEvidence(sermon, STEP.Exegesis);
    }
  } else if (kind === "step") {
    evidence = buildStepEvidence(sermon, canonicalStep(fromIndex));
  }
  if (!evidence) {
    return { ok: false, reason: "Add some content before advancing." };
  }

  // SFDI per-boundary thresholds layer on top of the empty-evidence baseline.
  // Currently wired: Observe → Interpret (kind=sub_phase, fromIndex=1).
  if (kind === "sub_phase" && fromIndex === 1) {
    const reason = checkObserveToInterpretThreshold(sermon);
    if (reason) return { ok: false, reason };
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
