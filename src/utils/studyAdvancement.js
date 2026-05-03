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
import { parseStructuredField } from "./studyFields";

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

export function buildSubPhaseEvidence(sermon, subPhase) {
  const fieldName = SUB_PHASE_FIELD_MAP[subPhase];
  if (!fieldName || !sermon) return "";
  const data = parseStructuredField(sermon[fieldName]);
  if (!data || typeof data !== "object") return "";
  return Object.values(data)
    .filter((v) => v && String(v).trim())
    .map((v) => String(v).trim())
    .join("\n");
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
// disabled-Continue UI consumes. Today (Q3 pilot) it's the empty-evidence
// baseline. SFDI's per-boundary thresholds will extend the body of this
// function with coverage / structural completeness / synthesis presence checks
// without changing its signature or UI consumers.
//
// kind: "sub_phase" | "step"
// fromIndex: 1-4 (the source position's local index)
//
// Special case: kind="sub_phase", fromIndex=4 — advancing out of Implications
// is a STEP transition (Exegesis → MPT/MPS); evidence is the entire Exegesis
// step's content, not just Implications.

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
