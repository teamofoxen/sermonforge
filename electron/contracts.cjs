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

// Three-stage sermon arc: Study → Assembly → Manuscript. Assembly carries
// two sub-phases (Anchor / Outline); Manuscript carries two (Body /
// IntroTransitionsConclusion) — the decide/write boundary (OEM walk,
// 2026-07-02; v33 rewrites legacy Equip/Frame positions). Legacy
// "Blueprint" / "Frame" current_stage values are no longer admitted or
// coerced — read straight through since the coercion was removed in the
// trail deletion sweep (Phase B3); no production data carries them.
const STAGE = Object.freeze({
  Study: "Study",
  Assembly: "Assembly",
  Manuscript: "Manuscript",
});

// "Delivery" struck from the vocabulary in the v24 migration session
// (2026-06-10) — the ARI Phase 7 legacy tolerance retired with no
// production sermons in existence.
const STAGE_SEQUENCE = Object.freeze(["Study", "Assembly", "Manuscript"]);

const SUB_PHASE = Object.freeze({
  Observe: "Observe",
  Interpret: "Interpret",
  RedemptiveThread: "RedemptiveThread",
  Implications: "Implications",
  Anchor: "Anchor",
  Outline: "Outline",
  Body: "Body",
  IntroTransitionsConclusion: "IntroTransitionsConclusion",
});

const STUDY_SUB_PHASE_SEQUENCE = Object.freeze([
  "Observe", "Interpret", "RedemptiveThread", "Implications",
]);

const ASSEMBLY_SUB_PHASE_SEQUENCE = Object.freeze([
  "Anchor", "Outline",
]);

const MANUSCRIPT_SUB_PHASE_SEQUENCE = Object.freeze([
  "Body", "IntroTransitionsConclusion",
]);

const SUB_PHASE_CANONICAL_SEQUENCE = Object.freeze([
  ...STUDY_SUB_PHASE_SEQUENCE,
  ...ASSEMBLY_SUB_PHASE_SEQUENCE,
  ...MANUSCRIPT_SUB_PHASE_SEQUENCE,
]);

const SUB_PHASE_STAGE = Object.freeze({
  Observe: "Study",
  Interpret: "Study",
  RedemptiveThread: "Study",
  Implications: "Study",
  Anchor: "Assembly",
  Outline: "Assembly",
  Body: "Manuscript",
  IntroTransitionsConclusion: "Manuscript",
});

const SERMON_STATUS = Object.freeze({
  InProgress: "in_progress",
  Complete: "complete",
});

const SERIES_STATUS = Object.freeze({
  InProgress: "in_progress",
  Complete: "complete",
});

// ARI Phase 9 — collapsed to UserInput only.
const MUTATION_KIND = Object.freeze({
  UserInput: "user_input",
});

const LOADING_VERB = Object.freeze({
  Loading: "Loading…",
  Saving: "Saving…",
  Thinking: "Thinking…",
  // Word export in flight — generating a document, not saving app state.
  Exporting: "Exporting…",
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
  // delivery_notes / timing_notes struck in the v24 migration session
  // (2026-06-10) — Delivery UI gone, nothing writes them; DB columns remain.
  "outline", "manuscript", "post_sermon",
  "functional_elements", "checklist", "series_id", "section_id", "is_one_off",
  // topic_theme / audience_assumptions / background_noise removed in the
  // trail deletion sweep (Phase B1) — legacy PC columns, zero readers, zero
  // writers; PC content lives in implications.pastoral_context now.
  // study_guide_note retired from the writable set in the Series Planner
  // content-model rebuild (v27) — its content folded into the new sermon
  // `overview`; the DB column remains as backup but is no longer writable.
  "preaching_blocks", "manuscript_delivery", "last_tune_up",
  // current_step removed in the trail deletion sweep (Phase B2) — position
  // is now (stage, sub_phase) only; the field-level last-touched concept
  // moves to last_touched_position (distinct field, lands in Phase D).
  "current_stage", "current_sub_phase",
  // v21 — per-stage sub-phase memory; renderer derives initial sub-phase
  // from these so tabbing across stages restores per-stage position.
  // v33 adds the Manuscript slot (the stage gained sub-phases in the OEM
  // restructure).
  "last_study_subphase", "last_assembly_subphase", "last_manuscript_subphase",
  // v18 — SPRD C3 Sermon Frame.
  "sermon_frame",
  // v19 — SADI Step 2 Main Point Pair.
  "main_point_pair",
  // v20 — ARI Phase 3 per-tab notebooks. Free-form pastor-typed notes,
  // sermon-scoped, one column per workspace tab where AI used to live.
  "notebook_study", "notebook_blueprint", "notebook_manuscript",
  // v23 — trail deletion sweep (Phase D1). last_touched_position drives
  // session re-entry (NULL = first session, sermon-start fires; non-NULL
  // = land on that field). thresholds_seen is the JSON array of dismissed
  // threshold ids (sermon-start, study-to-anchor-handoff, etc.) — one
  // mechanism for "has this threshold been dismissed" across all of them.
  "last_touched_position", "thresholds_seen",
  // v27 — Series Planner content-model rebuild. Sermon-level big idea +
  // overview (the same Title/range · Big idea · Overview unit the book and
  // sections carry), and the guide-local study-guide extras JSON
  // ({ additions, notesLines }). All three ride create-then-update — the
  // create-sermon INSERT is never widened (slot draft/commit ruling).
  "big_idea", "overview", "study_guide_extras",
  // v30 — Topical Series mode (mirrors contracts): pastor-authored per-sermon
  // order for a topical series' flat sermon list; nullable, create-then-update.
  "sort_order",
  // v31 — Coverage Initiative (Phase 1) (mirrors contracts): structured
  // per-sermon canonical book for the topical planner; nullable.
  "book_id",
  // v32 — Coverage Initiative (Phase 3) (mirrors contracts): sermon-level topic
  // tags, a JSON array of free-form topic strings (thresholds_seen pattern).
  "tags",
  // v34 — Series Discovery (mirrors contracts): the preaching-text's Discovery-only
  // reasoning envelope ({ whyBegin, whyEnd, subject, complement, authorialFunction }).
  // Nullable JSON, fail-soft parse; rides create-then-update (the create-sermon
  // INSERT is never widened).
  "discovery",
]));
/* eslint-enable sermonforge/canonical-stage-name */

// Spine-controlled columns. The `transitionState` position-writer that once
// wrote them was removed in Track E4; now with no live updater — they retain
// their create-INSERT or DEFAULT value. Never sent on user-edit saves (renderer's
// `pickSermonColumns` excludes them). Mirrors `SPINE_ONLY_COLUMNS` in
// src/core/contracts.ts.
const SPINE_ONLY_COLUMNS = Object.freeze(new Set([
  // current_step removed in the trail deletion sweep (Phase B2) — see
  // SERMON_COLUMNS comment above.
  "current_stage", "current_sub_phase",
  // All three per-stage memory columns are spine-written; keeping them out of
  // the renderer's write set is what stops a stale in-memory copy from
  // clobbering the spine's fresh position write. v33 added the Manuscript one
  // alongside its Study/Assembly siblings (OEM restructure, 2026-07-02).
  "last_study_subphase", "last_assembly_subphase", "last_manuscript_subphase",
]));

// v27 — Series Planner content-model rebuild retired the four book-study
// prompts (redemptive_context / book_background / book_argument), the folded
// book_structure, and the melodic-line worksheet fields (series_motivation /
// emerging_big_idea / melodic_evidence) from the writable set. The DB columns
// remain as backup (house pattern), but nothing writes them anymore. The
// series unit is now Title (`title`) · Big idea (`big_idea`) · Overview
// (`overview`) plus book identity + calendar metadata.
const SERIES_COLUMNS = Object.freeze(new Set([
  "title", "color", "description", "year", "big_idea", "overview",
  "passage_range", "start_date", "end_date", "structural_outline",
  "status", "canon_category", "book_id",
  // v30 — Topical Series mode (mirrors contracts): explicit planner-mode
  // discriminator ('book' | 'topical'); persisted via updateSeries.
  "kind",
  // v34 — Series Discovery (mirrors contracts): the series-level Discovery-only
  // reasoning envelope (Immerse notes, Understand answers, and the two
  // Series-Big-Idea candidates + reasoning; a retired `decisions` key may linger
  // in old envelopes — the fail-soft parse ignores it). Nullable JSON, fail-soft
  // parse; rides updateSeries — the create-series INSERT is never widened. The
  // FINAL canonical Series Big Idea stays `big_idea`; the Overview stays `overview`.
  "discovery",
]));

const SECTION_COLUMNS = Object.freeze(new Set([
  "title", "passage_range", "big_idea", "overview", "sort_order",
  // v34 — Series Discovery (mirrors contracts): the major section's Discovery-only
  // boundary reasoning ({ whyBegin, whyEnd }). Nullable JSON, fail-soft parse;
  // rides updateSection — the create-section INSERT is never widened.
  "discovery",
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
  SUB_PHASE,
  SUB_PHASE_CANONICAL_SEQUENCE,
  STUDY_SUB_PHASE_SEQUENCE,
  ASSEMBLY_SUB_PHASE_SEQUENCE,
  MANUSCRIPT_SUB_PHASE_SEQUENCE,
  SUB_PHASE_STAGE,
  SERMON_STATUS,
  SERIES_STATUS,
  MUTATION_KIND,
  LOADING_VERB,
  SERMON_COLUMNS,
  SPINE_ONLY_COLUMNS,
  SERIES_COLUMNS,
  SECTION_COLUMNS,
  STRUCTURED_FIELDS,
  ContractViolation,
};
