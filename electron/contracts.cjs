// MIRROR of `src/core/contracts.ts` runtime values.
//
// This file exists because `electron/main.js` is CommonJS (per CORE.md ESM/CJS
// boundary) and cannot import from `src/core/contracts.ts` directly. Vite
// bundles the renderer; the main process runs raw JS.
//
// Both files MUST be edited together. Drift means the renderer and main
// process name the same concept differently — a State Contract #5 violation
// at runtime ("one name per concept").
//
// Source of truth: `src/core/contracts.ts`. This file mirrors only the
// runtime values, not the TypeScript types.
'use strict';

const STAGE = Object.freeze({
  Study: "Study",
  Blueprint: "Blueprint",
  Frame: "Frame",
  Manuscript: "Manuscript",
  Delivery: "Delivery",
});

const STAGE_SEQUENCE = Object.freeze(["Study", "Blueprint", "Frame", "Manuscript", "Delivery"]);

const STEP = Object.freeze({
  Exegesis: "Exegesis",
  MPT_MPS: "MPT_MPS",
  Outline: "Outline",
  FunctionalElements: "FunctionalElements",
});

const STEP_CANONICAL_SEQUENCE = Object.freeze([
  "Exegesis", "MPT_MPS", "Outline", "FunctionalElements",
]);

const SUB_PHASE = Object.freeze({
  Observe: "Observe",
  Interpret: "Interpret",
  RedemptiveThread: "RedemptiveThread",
  Implications: "Implications",
});

const SUB_PHASE_CANONICAL_SEQUENCE = Object.freeze([
  "Observe", "Interpret", "RedemptiveThread", "Implications",
]);

const SERMON_STATUS = Object.freeze({
  InProgress: "in_progress",
  Complete: "complete",
});

const SERIES_STATUS = Object.freeze({
  InProgress: "in_progress",
  Complete: "complete",
});

const MUTATION_KIND = Object.freeze({
  UserInput: "user_input",
  AiProposal: "ai_proposal",
  AiApply: "ai_apply",
});

const LOADING_VERB = Object.freeze({
  Loading: "Loading…",
  Saving: "Saving…",
  Thinking: "Thinking…",
});

// Schema column allowlists — canonical, mirrored from contracts.ts.
// `outline` here is the database column name (the JSON column that holds
// the sermon's outline data), not the pre-Pilot-B stage alias the
// `canonical-stage-name` lint rule guards against. Same for STRUCTURED_FIELDS
// below.
/* eslint-disable sermonforge/canonical-stage-name */
const SERMON_COLUMNS = Object.freeze(new Set([
  "title", "passage", "date", "preacher", "stage", "mpt", "mps",
  "observations", "interpretation", "redemptive_thread", "implications",
  "outline", "manuscript", "delivery_notes", "timing_notes", "post_sermon",
  "functional_elements", "checklist", "series_id", "section_id", "is_one_off",
  "topic_theme", "audience_assumptions", "background_noise", "study_guide_note",
  "preaching_blocks", "manuscript_delivery", "last_tune_up",
  "current_stage", "current_step", "current_sub_phase",
  // v18 — SPRD C3 Sermon Frame.
  "sermon_frame",
  // v19 — SADI Step 2 Main Point Pair.
  "main_point_pair",
]));
/* eslint-enable sermonforge/canonical-stage-name */

const SERIES_COLUMNS = Object.freeze(new Set([
  "title", "color", "description", "year", "big_idea", "overview",
  "passage_range", "start_date", "end_date", "structural_outline",
  "status", "canon_category",
  "redemptive_context", "book_background", "book_argument", "book_structure",
  "series_motivation", "emerging_big_idea",
]));

const SECTION_COLUMNS = Object.freeze(new Set([
  "title", "passage_range", "big_idea", "overview", "sort_order",
]));

// `outline` here is the database column name, not the pre-Pilot-B stage alias.
/* eslint-disable sermonforge/canonical-stage-name */
const STRUCTURED_FIELDS = Object.freeze(new Set([
  "outline",
  "functional_elements",
  "observations",
  "interpretation",
  "redemptive_thread",
  "implications",
  // v18 — SPRD C3 Sermon Frame.
  "sermon_frame",
  // v19 — SADI Step 2 Main Point Pair.
  "main_point_pair",
]));
/* eslint-enable sermonforge/canonical-stage-name */

class ContractViolation extends Error {
  constructor(message, clause, code) {
    super(message);
    this.name = "ContractViolation";
    this.code = code;
    this.clause = clause;
  }
}

module.exports = {
  STAGE,
  STAGE_SEQUENCE,
  STEP,
  STEP_CANONICAL_SEQUENCE,
  SUB_PHASE,
  SUB_PHASE_CANONICAL_SEQUENCE,
  SERMON_STATUS,
  SERIES_STATUS,
  MUTATION_KIND,
  LOADING_VERB,
  SERMON_COLUMNS,
  SERIES_COLUMNS,
  SECTION_COLUMNS,
  STRUCTURED_FIELDS,
  ContractViolation,
};
