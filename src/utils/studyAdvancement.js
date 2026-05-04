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

// Field 4 composite-gate helpers (B1.5). Inlined here rather than imported
// from ParaphraseBlocks.jsx to keep the util free of UI-layer dependencies.

// True if the canvas value carries at least one main sentence (depth=0) that
// has at least one indented modifier (depth>0) under it before the next
// main sentence.
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

// Count canvas main sentences (depth=0 rows with non-empty text). Mirrors
// ParaphraseBlocks.groupMainSentences but counts only — and skips empty heads
// since an empty main-sentence line shouldn't demand a paraphrase.
function countCanvasMainSentences(canvas) {
  if (!Array.isArray(canvas)) return 0;
  let n = 0;
  for (const row of canvas) {
    if (!row || typeof row !== "object") continue;
    const depth = Number.isInteger(row.depth) && row.depth >= 0 ? row.depth : 0;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (depth === 0 && text) n++;
  }
  return n;
}

// True if every main-sentence id has a non-empty paraphrase. Paraphrase ids
// are positional `ms-0`, `ms-1`, … aligned to canvas main sentences.
function everyParaphraseFilled(paraphrases, mainSentenceCount) {
  if (mainSentenceCount === 0) return false;
  if (!Array.isArray(paraphrases)) return false;
  for (let i = 0; i < mainSentenceCount; i++) {
    const id = `ms-${i}`;
    const entry = paraphrases.find((e) => e && e.main_sentence_id === id);
    const p = entry && typeof entry.paraphrase === "string" ? entry.paraphrase.trim() : "";
    if (!p) return false;
  }
  return true;
}

// True if at least one synthesis-table row has both Thought unit and After line
// filled. Signal is allowed empty (final unit of a passage). Empty placeholder
// rows from the primitive's empty-state don't count.
function hasOneCompleteThoughtUnit(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const summary = typeof row.thought_unit_summary === "string" ? row.thought_unit_summary.trim() : "";
    const after = row.after_line === undefined || row.after_line === null
      ? ""
      : String(row.after_line).trim();
    if (summary && after) return true;
  }
  return false;
}

// Field 4 composite gate. Returns null when satisfied or a pastor-facing
// reason string when not. SFDI N/A escape valve: a question marked N/A counts
// as satisfied (the pastor may declare the sub-shape inapplicable).
function checkField4Composite(data) {
  const fieldKey = "divisions";

  // Q1 — sentence_layout (canvas).
  if (!isQuestionNA(data, fieldKey, "sentence_layout")) {
    const canvas = getQuestionAnswer(data, fieldKey, "sentence_layout");
    if (!canvasHasMainWithModifier(canvas)) {
      return "Lay out the passage before advancing — at least one main sentence with an indented modifier under it.";
    }
  }

  // Q2 — paraphrases. Every main sentence must have a non-empty paraphrase.
  if (!isQuestionNA(data, fieldKey, "paraphrases")) {
    const canvas = getQuestionAnswer(data, fieldKey, "sentence_layout");
    const paraphrases = getQuestionAnswer(data, fieldKey, "paraphrases");
    const mainCount = countCanvasMainSentences(canvas);
    if (!everyParaphraseFilled(paraphrases, mainCount)) {
      return "Rewrite each main sentence in your own words before advancing.";
    }
  }

  // Q3 — thought_units. At least one complete row.
  if (!isQuestionNA(data, fieldKey, "thought_units")) {
    const rows = getQuestionAnswer(data, fieldKey, "thought_units");
    if (!hasOneCompleteThoughtUnit(rows)) {
      return "Name at least one thought unit (with the line it ends after) before advancing.";
    }
  }

  return null;
}

// SFDI Observe → Interpret threshold (per `study-field-definition-initiative
// .md` § "The hard gate at the boundary"). Returns a structured object:
//   {
//     gates: [{key, label, met, reason?}, ...],   // one entry per load-bearing field
//     firstReason: string | null,                 // first failing gate's reason, or null
//   }
// The disabled-Continue UI reads `firstReason` for the legacy single-line
// hint and `gates` for the hover-checklist (B1.6). Per SFDI, three gates:
// Field 4 (composite), Field 8 (Obvious Point), Field 9 (Possible Implications).
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

  // Field 4 — Divisions / Thought Units composite (B1.5).
  const f4Reason = checkField4Composite(data);
  gates.push({
    key: "field_4_divisions",
    label: "Divisions / Thought Units",
    met: !f4Reason,
    reason: f4Reason || undefined,
  });

  // Field 8 — Obvious Point. Single primary question; non-empty or N/A.
  const f8Met = isQuestionAnswered(data, "obvious_point", DEFAULT_QUESTION_KEY);
  gates.push({
    key: "field_8_obvious_point",
    label: "Obvious Point",
    met: f8Met,
    reason: f8Met ? undefined : "State the Obvious Point before advancing.",
  });

  // Field 9 — Possible Implications. Both questions (pressing,
  // hard_and_hopeful) non-empty or N/A.
  const f9Met =
    isQuestionAnswered(data, "applications", "pressing") &&
    isQuestionAnswered(data, "applications", "hard_and_hopeful");
  gates.push({
    key: "field_9_possible_implications",
    label: "Possible Implications",
    met: f9Met,
    reason: f9Met ? undefined : "Answer the Possible Implications questions before advancing.",
  });

  const firstFailing = gates.find((g) => !g.met);
  return {
    gates,
    firstReason: firstFailing ? firstFailing.reason : null,
  };
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
  // The threshold returns a structured `{gates, firstReason}` so the disabled-
  // Continue UI can render either the legacy single-line hint (firstReason)
  // or the multi-gate hover-checklist (gates) per B1.6.
  if (kind === "sub_phase" && fromIndex === 1) {
    const result = checkObserveToInterpretThreshold(sermon);
    if (result.firstReason) {
      return {
        ok: false,
        reason: result.firstReason,
        ...(result.gates.length > 0 ? { gates: result.gates } : {}),
      };
    }
    // All gates met — surface the gates anyway so the UI can confirm a
    // satisfied checklist if it wants to (currently unused by consumers).
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
