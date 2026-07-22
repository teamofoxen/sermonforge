// SermonForge — Canonical State, Mutation, and Surface vocabulary.
//
// Single Source of Truth for every name, enum, label, shape, and column
// allowlist that the Framework binds. Every other module imports from here.
// Local re-definition of any export below is a Surface Contract #1 violation
// ("one vocabulary") and a State Contract #5 violation ("one name per concept").
//
// Authority: docs/CORE.md → "The Framework."
//
// Decision history
// ────────────────
// (Phase 1's `STEPS / PHASES / STEP_SEQUENCE / PHASE_SEQUENCE` re-export
// decision retired in post-sweep audit Chunk 3, 2026-05-18 — see the
// gravestone block below for context. The Step layer was retired in the
// Workspace Restructure; the guided-tour engine and AIPanel routing were
// deleted outright — ARI (2026-05-09) + the trail deletion sweep
// (2026-05-17) — and neither exists at HEAD.)
//
// Phase 1 cleanup chose to **subsume** `SERMON_COLUMNS / pickSermonColumns`
// (Option A in the prompt). The former renderer-side mirror at
// `src/constants/sermonColumns.js` is now a thin shim that re-exports from
// here, and `electron/main.js` no longer maintains its own column Set —
// it imports from `electron/contracts.cjs` (the runtime mirror of this file).
// Drift is therefore eliminated by construction: there is one canonical
// column list, mirrored once across the ESM/CJS boundary, and the runtime
// `assertSchemaContract()` validates the live DB matches it.
//
// `SERIES_COLUMNS` and `SECTION_COLUMNS` are subsumed under the same policy
// for symmetry — the main process previously held them as private locals.
//
// ESM/CJS boundary
// ────────────────
// `electron/contracts.cjs` is a runtime-only mirror of the value exports
// below (no types). Both files MUST be edited together — drift silently
// violates State Contract #5 because the renderer and main process would be
// naming the same concept differently.

// Post-sweep audit Chunk 3 (2026-05-18) gravestone — the re-export block
// for `STEPS`, `PHASES`, `STEP_SEQUENCE`, `PHASE_SEQUENCE` from
// `../constants/steps` was deleted here alongside `src/constants/steps.js`
// itself. The Step layer was retired in the Workspace Restructure
// (2026-05-10); a full-tree grep at execution found zero non-archive
// consumers of the re-exported values. The ergonomic-re-export decision
// from Phase 1 served no caller post-restructure.

// ── State Contract #2 — Stage (within-process position) ──────────────────────
// The sermon-prep arc is three stages: Study (understand the text),
// Assembly (decide the sermon), Manuscript (write it). Each stage carries
// its own sub-phase sequence (Study: 4 Exegesis sub-phases; Assembly:
// Anchor / Outline; Manuscript: Body / IntroTransitionsConclusion).
// The decide/write split IS the Assembly → Manuscript boundary (OEM walk,
// 2026-07-02: Equip moved into Manuscript as Body; the Frame sub-phase
// collapsed into the Manuscript door fields; v33 rewrites legacy positions).
//
// Legacy values: `Blueprint` and `Frame` (from a prior 4-stage shape) are no
// longer admitted or coerced — `current_stage` is read straight through since
// the coercion was removed in the trail deletion sweep (Phase B3); no
// production data carries them. `Delivery` was struck from
// the vocabulary entirely in the v24 migration session (2026-06-10) — its
// ARI Phase 7 "stays admissible for legacy data" tolerance retired with no
// production sermons in existence; Manuscript is the terminal stage, with
// Export to Word as the terminal action.
export type Stage = "Study" | "Assembly" | "Manuscript";

export const STAGE = {
  Study: "Study",
  Assembly: "Assembly",
  Manuscript: "Manuscript",
} as const satisfies Record<Stage, Stage>;

export const STAGE_SEQUENCE: readonly Stage[] = Object.freeze([
  "Study", "Assembly", "Manuscript",
]);

export const STAGE_LABELS: Readonly<Record<Stage, string>> = Object.freeze({
  Study: "Study",
  Assembly: "Assembly",
  Manuscript: "Manuscript",
});

// ── Process Contract #4 — SubPhase (within-Stage progression) ────────────────
// SubPhase spans all three stages:
//   Study sub-phases:      Observe → Interpret → RedemptiveThread → Implications
//   Assembly sub-phases:   Anchor → Outline
//   Manuscript sub-phases: Body → IntroTransitionsConclusion
// The Stage value disambiguates which set applies. The stored value
// "IntroTransitionsConclusion" is identifier-shaped for position composites;
// its display name is the pastor's literal "Intro, Transitions, Conclusion"
// (owned by REGION_DISPLAY in src/utils/walkOrder.js).
export type SubPhase =
  | "Observe" | "Interpret" | "RedemptiveThread" | "Implications"
  | "Anchor" | "Outline" | "Body" | "IntroTransitionsConclusion";

export const SUB_PHASE = {
  Observe: "Observe",
  Interpret: "Interpret",
  RedemptiveThread: "RedemptiveThread",
  Implications: "Implications",
  Anchor: "Anchor",
  Outline: "Outline",
  Body: "Body",
  IntroTransitionsConclusion: "IntroTransitionsConclusion",
} as const satisfies Record<SubPhase, SubPhase>;

// Sub-phase sequence per stage. The spine uses these to map kind="sub_phase"
// transitions; the renderer uses them via walkOrder.js to compose the
// writing surface's field walk. (Pre-D2c, StudyTab + AssemblyTab consumed
// these to derive position from a 1-based index; those tab files were
// deleted in Phase E of the trail deletion sweep.)
export const STUDY_SUB_PHASE_SEQUENCE: readonly SubPhase[] = Object.freeze([
  "Observe", "Interpret", "RedemptiveThread", "Implications",
]);

export const ASSEMBLY_SUB_PHASE_SEQUENCE: readonly SubPhase[] = Object.freeze([
  "Anchor", "Outline",
]);

export const MANUSCRIPT_SUB_PHASE_SEQUENCE: readonly SubPhase[] = Object.freeze([
  "Body", "IntroTransitionsConclusion",
]);

// Combined canonical sequence — Study, then Assembly, then Manuscript. Used
// by validators that need a single ordered list across the whole spine.
export const SUB_PHASE_CANONICAL_SEQUENCE: readonly SubPhase[] = Object.freeze([
  ...STUDY_SUB_PHASE_SEQUENCE,
  ...ASSEMBLY_SUB_PHASE_SEQUENCE,
  ...MANUSCRIPT_SUB_PHASE_SEQUENCE,
]);

// Sub-phase DISPLAY labels are owned by REGION_DISPLAY in src/utils/walkOrder.js
// (the live consumers are SermonMap + SermonWritingSurface). A former
// SUB_PHASE_LABELS map lived here but had ZERO consumers — a dead source-of-truth
// claim inside the file that declares itself SSoT "for every label." It was
// deleted in the Domain Model Normalization Grammar-Ownership slice (2026-07-03);
// do not re-add it. A second definition of labels walkOrder already owns re-opens
// the competing-source drift State Contract #6 forbids. (STAGE_LABELS above stays:
// it IS the live owner of stage display names, consumed by SermonMap.)

// Maps each SubPhase back to its parent Stage. The spine uses this to know
// which stage a SubPhase belongs to without threading the stage everywhere.
export const SUB_PHASE_STAGE: Readonly<Record<SubPhase, Stage>> = Object.freeze({
  Observe: "Study",
  Interpret: "Study",
  RedemptiveThread: "Study",
  Implications: "Study",
  Anchor: "Assembly",
  Outline: "Assembly",
  Body: "Manuscript",
  IntroTransitionsConclusion: "Manuscript",
});

// ── Lifecycle status — sermons + series ──────────────────────────────────────
export type SermonStatus = "in_progress" | "complete";

export const SERMON_STATUS = {
  InProgress: "in_progress",
  Complete: "complete",
} as const satisfies Record<string, SermonStatus>;

// User-facing lifecycle vocabulary. The stored enum value stays `complete`
// (data identity); the word a pastor reads is "Preached" — how he actually
// talks about a finished sermon (ratified 2026-06-10). One name per concept
// (State #5): every surface renders these labels, never its own alias.
export const SERMON_STATUS_LABELS: Readonly<Record<SermonStatus, string>> = Object.freeze({
  in_progress: "In progress",
  complete: "Preached",
});

export type SeriesStatus = "in_progress" | "complete";

export const SERIES_STATUS = {
  InProgress: "in_progress",
  Complete: "complete",
} as const satisfies Record<string, SeriesStatus>;

export const SERIES_STATUS_LABELS: Readonly<Record<SeriesStatus, string>> = Object.freeze({
  in_progress: "In Progress",
  complete: "Complete",
});

// ── Mutation Contract — kinds of state change ────────────────────────────────
// ARI Phase 9 — collapsed to `user_input` only. The `ai_proposal` and
// `ai_apply` kinds were the contractual home for AI mutations through the
// proposal-then-apply cycle; with AI removed (Phases 1–8), the only kind
// that can flow through the spine is direct user input.
export type MutationKind = "user_input";

export const MUTATION_KIND = {
  UserInput: "user_input",
} as const satisfies Record<string, MutationKind>;

// ── Surface Contract #4 — top-level view routes ──────────────────────────────
//
// Canonical PascalCase view identifiers used by the App router and Sidebar.
// Pre-vocabulary-completion the router used lowercase strings ("dashboard",
// "planning", etc.); some of those names (notably "planning" and "active")
// collided with pre-Pilot-B series-status aliases the `canonical-stage-name`
// lint rule wanted to forbid, so the rule had to exclude them. After this
// migration the lint rule's forbidden set expands to include `planning` and
// `active` since neither appears in component logic anymore.
export type View =
  | "Dashboard"
  | "Sermons"
  | "Calendar"
  | "CompletedSermons"
  | "Planning"
  | "Arc"
  | "SeriesPlanner"
  | "Workspace";

export const VIEW = {
  Dashboard: "Dashboard",
  Sermons: "Sermons",
  Calendar: "Calendar",
  CompletedSermons: "CompletedSermons",
  Planning: "Planning",
  Arc: "Arc",
  SeriesPlanner: "SeriesPlanner",
  Workspace: "Workspace",
} as const satisfies Record<View, View>;

// ── Surface Contract #3 — loading vocabulary ─────────────────────────────────
export type LoadingVerb = "Loading…" | "Saving…" | "Thinking…" | "Exporting…";

export const LOADING_VERB = {
  Loading: "Loading…",
  Saving: "Saving…",
  Thinking: "Thinking…",
  // Word export in flight — generating a document, not saving app state.
  Exporting: "Exporting…",
} as const satisfies Record<string, LoadingVerb>;

// ── Surface Contract #2 — CTA shapes ─────────────────────────────────────────
export interface PrimaryCTA {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: LoadingVerb;
}

export interface SecondaryCTA {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

// ── State Contract #1, #3, #4 — canonical Sermon and Series shapes ───────────
// SubPhase is present whenever the stage carries sub-phases (Study or
// Assembly); Manuscript has none.
export interface ProcessPosition {
  stage: Stage;
  subPhase?: SubPhase;
}

export interface ParentContext {
  seriesId: string;
  seriesName: string;        // canonical name, not the DB `title` column
  positionInSeries: number;  // 1-indexed
  totalInSeries: number;
}

export interface Sermon {
  id: string;
  name: string;                       // State #3: required, non-empty
  status: SermonStatus;
  position: ProcessPosition;          // State #2 — derived in spine
  parentContext: ParentContext | null; // State #4 — null for one-off sermons
  passage: string;
  date: string;
  preacher: string;
  // `legacy: boolean` field deleted in Phase G (2026-05-18) alongside the
  // wall layer in `transitionState` that consumed it. It had zero readers
  // in src/; existed only to feed the Process #2 empty-evidence carve-out.
}

export interface Series {
  id: string;
  name: string;                       // State #3: required, non-empty
  status: SeriesStatus;
  year: number;
  color: string;
}

// ── Mutation Contract — structured update shapes ─────────────────────────────
export type OutlineUpdate =
  | { op: "add"; text: string }
  | { op: "edit"; id: string; text: string }
  | { op: "remove"; id: string }
  | { op: "reorder"; orderedIds: readonly string[] };

export type FunctionalElementField =
  | "scripture"
  | "explanation"
  | "application"
  | "illustration";

export type FunctionalElementUpdate = {
  op: "set";
  outlinePointId: string;
  field: FunctionalElementField;
  value: string;
};

export type ObservationUpdate    = { op: "set"; questionKey: string; value: string };
export type InterpretationUpdate = { op: "set"; questionKey: string; value: string };

export type RedemptiveThreadUpdate =
  | { op: "set"; questionKey: string; value: string }
  | { op: "set_summary"; value: string };

export type ImplicationsUpdate =
  | { op: "set"; questionKey: string; value: string };

// SPRD C3 — Sermon Frame (SADI Step 5: Intro + Conclusion). Same generic
// keyed-JSON op pattern as the Exegesis sub-phase columns; the renderer
// manages the per-field per-question envelope shape via setQuestionAnswer.
export type SermonFrameUpdate = { op: "set"; questionKey: string; value: string };

// SADI Step 2 — Main Point Pair (MPT 2Q + MPS 3Q). Same generic keyed-JSON
// op pattern as the Exegesis sub-phase columns and v18 sermon_frame.
export type MainPointPairUpdate = { op: "set"; questionKey: string; value: string };

// ── Schema column allowlists (subsumed from src/constants/sermonColumns.js) ──
//
// These were previously duplicated across the renderer mirror and the main
// process. Phase 1 cleanup made this file the single source. Drift is now
// impossible: `electron/contracts.cjs` mirrors these for the main process,
// and `assertSchemaContract()` validates the live DB matches at startup.

export const SERMON_COLUMNS: ReadonlySet<string> = Object.freeze(new Set([
  "title", "passage", "date", "preacher", "stage", "mpt", "mps",
  "observations", "interpretation", "redemptive_thread", "implications",
  // delivery_notes / timing_notes struck from the allowlist in the v24
  // migration session (2026-06-10) — the Delivery stage UI is gone, nothing
  // writes them, and removing them from the writable set means nothing can
  // resurrect them by accident. The DB columns remain (dead, harmless).
  "outline", "manuscript", "post_sermon",
  "functional_elements", "checklist", "series_id", "section_id", "is_one_off",
  // topic_theme / audience_assumptions / background_noise removed in the
  // trail deletion sweep (Phase B1) — legacy PC columns, zero readers, zero
  // writers; PC content lives in implications.pastoral_context now.
  // study_guide_note retired from the writable set in the Series Planner
  // content-model rebuild (v27) — its content folded into the new sermon
  // `overview`; the DB column remains as backup but is no longer writable.
  "preaching_blocks", "manuscript_delivery", "last_tune_up",
  // v17 — canonical process position columns added by spine layer.
  // current_step removed in the trail deletion sweep (Phase B2) — position
  // is now (stage, sub_phase) only; field-level last-touched moves to
  // last_touched_position (distinct field, lands in Phase D).
  "current_stage", "current_sub_phase",
  // v21 — per-stage sub-phase memory; renderer derives initial sub-phase
  // from these so tabbing across stages restores per-stage position.
  // v33 adds the Manuscript slot (the stage gained sub-phases in the OEM
  // restructure).
  "last_study_subphase", "last_assembly_subphase", "last_manuscript_subphase",
  // v18 — Sermon Frame JSON column (SPRD C3, 2026-05-04). Holds Intro +
  // Conclusion field-data per the SADI Step 5 ratification, in the same
  // envelope shape as the four Exegesis sub-phase columns.
  "sermon_frame",
  // v19 — Main Point Pair JSON column (SADI Step 2 plumbing, 2026-05-05).
  // Holds MPT (2Q: draft, tighten) + MPS (3Q: translate, gospel_check,
  // tighten) and is the sole store for the Main Points: the Word export derives
  // them from this envelope (Track E2). The flat `mpt` / `mps` columns above are
  // retained defensively; their auto-sync mirror write was retired in Track E3
  // (they are now written only by direct apply-mutation).
  "main_point_pair",
  // v20 — ARI Phase 3 per-tab notebooks (2026-05-09). Free-form pastor-typed
  // notes, sermon-scoped, one column per workspace tab where AI used to
  // live. Plain text; replaces the AI Panel as the docked thinking surface.
  "notebook_study", "notebook_blueprint", "notebook_manuscript",
  // v23 — trail deletion sweep (Phase D1). last_touched_position drives
  // session re-entry (NULL = first session, sermon-start fires; non-NULL
  // = land on that field). thresholds_seen is the JSON array of dismissed
  // threshold ids — one mechanism for "has this threshold been dismissed"
  // across sermon-start, Study→Anchor handoff, and any future threshold.
  "last_touched_position", "thresholds_seen",
  // v27 — Series Planner content-model rebuild. Sermon-level big idea +
  // overview (the same Title/range · Big idea · Overview unit the book and
  // sections carry), and the guide-local study-guide extras JSON
  // ({ additions, notesLines }). All three ride create-then-update — the
  // create-sermon INSERT is never widened (slot draft/commit ruling).
  "big_idea", "overview", "study_guide_extras",
  // v30 — Topical Series mode. Pastor-authored per-sermon order for a topical
  // series' flat sermon list; nullable (book-series sermons stay NULL and order
  // by section). Rides create-then-update — the create-sermon INSERT is never
  // widened.
  "sort_order",
  // v31 — Coverage Initiative (Phase 1). Structured per-sermon canonical book
  // for the topical planner (mirrors series.book_id). Nullable — book-series
  // sermons stay NULL and inherit series.book_id via the effective-book helper;
  // only topical sermons carry their own. Rides create-then-update — the
  // create-sermon INSERT is never widened.
  "book_id",
  // v32 — Coverage Initiative (Phase 3). Sermon-level topic tags: a JSON array
  // of free-form topic strings (thresholds_seen pattern; fail-soft parse) tagged
  // at prep in the workspace. Powers the Topics lens + own-tag autocomplete.
  // Rides the workspace autosave — the create-sermon INSERT is never widened.
  "tags",
  // v34 — Series Discovery. The preaching-text's Discovery-only reasoning
  // envelope: { whyBegin, whyEnd, subject, complement, authorialFunction } — the
  // boundary reasoning + subject/complement/authorial-function the pastor authors
  // in the Discover walk, none of which fit a clean planner field. Nullable JSON,
  // fail-soft parse; rides create-then-update — the create-sermon INSERT is never
  // widened. NOT in sermon_search (reasoning, not manuscript content).
  "discovery",
])) as ReadonlySet<string>;

// v27 — Series Planner content-model rebuild retired the four book-study
// prompts (redemptive_context / book_background / book_argument), the folded
// book_structure, and the melodic-line worksheet fields (series_motivation /
// emerging_big_idea / melodic_evidence) from the writable set. The DB columns
// remain as backup (house pattern), but nothing writes them anymore. The
// series unit is now Title (`title`) · Big idea (`big_idea`) · Overview
// (`overview`) plus book identity + calendar metadata.
export const SERIES_COLUMNS: ReadonlySet<string> = Object.freeze(new Set([
  "title", "color", "description", "year", "big_idea", "overview",
  "passage_range", "start_date", "end_date", "structural_outline",
  "status", "canon_category", "book_id",
  // v30 — Topical Series mode. Explicit planner-mode discriminator
  // ('book' | 'topical'); persisted via updateSeries, never the create INSERT.
  "kind",
  // v34 — Series Discovery. The series-level Discovery-only reasoning envelope, a
  // FLAT object (fail-soft parse via src/utils/discovery.js): readNotes; the five
  // understand* answers; the bigIdea* reasoning + the two candidates
  // (bigIdeaCandidateA/B). (A retired `decisions` key from the removed Difficult
  // Decisions step may linger in old envelopes; the fail-soft parse ignores it.)
  // Nullable JSON; persisted via updateSeries, never the create INSERT. The final
  // canonical Series Big Idea is `big_idea` and the Overview is `overview` — this
  // holds only the working-out.
  "discovery",
])) as ReadonlySet<string>;

export const SECTION_COLUMNS: ReadonlySet<string> = Object.freeze(new Set([
  "title", "passage_range", "big_idea", "overview", "sort_order",
  // v34 — Series Discovery. The major section's Discovery-only boundary reasoning:
  // { whyBegin, whyEnd }. Nullable JSON, fail-soft parse; persisted via
  // updateSection, never the create INSERT.
  "discovery",
])) as ReadonlySet<string>;

// Spine-controlled columns. The spine's `transitionState` position-writer that
// once wrote them was removed in Track E4 (2026-07-03); today they have no live
// updater — they retain their create-INSERT or DEFAULT value. They are
// still kept OUT of user-edit saves — `pickSermonColumns` filters them from the
// persistUpdate payload — and stay in `SERMON_COLUMNS` so reads/seeds and
// `assertSchemaContract()` still see them.
export const SPINE_ONLY_COLUMNS: ReadonlySet<string> = Object.freeze(new Set([
  // current_step removed in the trail deletion sweep (Phase B2) — see
  // SERMON_COLUMNS comment above.
  "current_stage", "current_sub_phase",
  // All three per-stage memory columns are spine-written; keeping them out of
  // the renderer's write set is what stops a stale in-memory copy from
  // clobbering the spine's fresh position write. v33 added the Manuscript one
  // alongside its Study/Assembly siblings (OEM restructure, 2026-07-02).
  "last_study_subphase", "last_assembly_subphase", "last_manuscript_subphase",
])) as ReadonlySet<string>;

export function pickSermonColumns(obj: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!obj) return out;
  for (const k of Object.keys(obj)) {
    if (SERMON_COLUMNS.has(k) && !SPINE_ONLY_COLUMNS.has(k)) out[k] = obj[k];
  }
  return out;
}

// ── ContractViolation — uniform error type for spine + IPC rejections ────────
//
// Carries the cited clause and stable error code. Renderer-side spine
// converts `{ ok: false, code, clause, message }` from IPC into a thrown
// ContractViolation; main-side validateAndCommit constructs the structured
// rejection from a thrown ContractViolation. Both sides use this class so
// downstream callers see a consistent error type.

export class ContractViolation extends Error {
  readonly code: string;
  readonly clause: string;
  constructor(message: string, clause: string, code: string) {
    super(message);
    this.name = "ContractViolation";
    this.code = code;
    this.clause = clause;
  }
}

// ── IPC envelope shapes (used by spine + validateAndCommit) ──────────────────

export interface ContractRejection {
  ok: false;
  code: string;
  clause: string;
  message: string;
}

export interface ContractSuccess<T = void> {
  ok: true;
  value: T;
}

export type IpcResult<T = void> = ContractSuccess<T> | ContractRejection;

// JSON-blob field names — the spine routes these through structured update
// shapes; everything else is a plain string field.
export const STRUCTURED_FIELDS: ReadonlySet<string> = Object.freeze(new Set([
  "outline",
  "functional_elements",
  "observations",
  "interpretation",
  "redemptive_thread",
  "implications",
  // v18 — SPRD C3 Sermon Frame (SADI Step 5).
  "sermon_frame",
  // v19 — SADI Step 2 Main Point Pair (MPT/MPS plumbing, 2026-05-05).
  "main_point_pair",
])) as ReadonlySet<string>;
