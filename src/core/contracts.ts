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
// Phase 1 chose to re-export `STEPS / PHASES / STEP_SEQUENCE / PHASE_SEQUENCE`
// from `src/constants/steps.js` rather than subsume them, because the slug
// values ("step-1" etc.) are still load-bearing for tour prerequisites and
// AIPanel routing — wholesale rename would balloon Phase 1 scope.
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

// ── Re-exports — single canonical import path ────────────────────────────────

export {
  STEPS,
  PHASES,
  STEP_SEQUENCE,
  PHASE_SEQUENCE,
} from "../constants/steps";

// ── State Contract #2 — Stage (within-process position) ──────────────────────
// SPRD C3 (Phase 3 Item 3, 2026-05-04) added "Frame" between Blueprint and
// Manuscript — the elevation of SADI Step 5 (Intro + Conclusion → Sermon
// Frame). Pre-C3, Intro/Conclusion lived bundled inside the Manuscript stage;
// the elevation gives the Sermon Frame its own workspace tab so the named
// outcome is visible in the throughline.
export type Stage = "Study" | "Blueprint" | "Frame" | "Manuscript" | "Delivery";

export const STAGE = {
  Study: "Study",
  Blueprint: "Blueprint",
  Frame: "Frame",
  Manuscript: "Manuscript",
  Delivery: "Delivery",
} as const satisfies Record<Stage, Stage>;

// ARI Phase 7 — "Delivery" removed from the visible tab sequence (the
// Delivery tab UI is gone). The Stage type still admits "Delivery" so legacy
// data with `current_stage = "Delivery"` doesn't blow up the contract; it
// just doesn't render as a tab. Manuscript is now the terminal sermon-prep
// stage, with Export to Word as the terminal action.
export const STAGE_SEQUENCE: readonly Stage[] = Object.freeze([
  "Study", "Blueprint", "Frame", "Manuscript",
]);

export const STAGE_LABELS: Readonly<Record<Stage, string>> = Object.freeze({
  Study: "Study",
  Blueprint: "Blueprint",
  Frame: "Sermon Frame",
  Manuscript: "Manuscript",
  Delivery: "Delivery",
});

// ── State Contract #2 — Step (within-Study position) ─────────────────────────
export type Step = "Exegesis" | "MPT_MPS" | "Outline" | "FunctionalElements";

export const STEP = {
  Exegesis: "Exegesis",
  MPT_MPS: "MPT_MPS",
  Outline: "Outline",
  FunctionalElements: "FunctionalElements",
} as const satisfies Record<Step, Step>;

export const STEP_CANONICAL_SEQUENCE: readonly Step[] = Object.freeze([
  "Exegesis", "MPT_MPS", "Outline", "FunctionalElements",
]);

export const STEP_LABELS: Readonly<Record<Step, string>> = Object.freeze({
  Exegesis: "Exegesis",
  MPT_MPS: "MPT / MPS",
  Outline: "Outline",
  FunctionalElements: "Functional Elements",
});

// ── Process Contract #4 — SubPhase (within-Exegesis progression) ─────────────
export type SubPhase = "Observe" | "Interpret" | "RedemptiveThread" | "Implications";

export const SUB_PHASE = {
  Observe: "Observe",
  Interpret: "Interpret",
  RedemptiveThread: "RedemptiveThread",
  Implications: "Implications",
} as const satisfies Record<SubPhase, SubPhase>;

export const SUB_PHASE_CANONICAL_SEQUENCE: readonly SubPhase[] = Object.freeze([
  "Observe", "Interpret", "RedemptiveThread", "Implications",
]);

export const SUB_PHASE_LABELS: Readonly<Record<SubPhase, string>> = Object.freeze({
  Observe: "Observe",
  Interpret: "Interpret",
  RedemptiveThread: "Redemptive Thread",
  Implications: "Implications",
});

// ── Lifecycle status — sermons + series ──────────────────────────────────────
export type SermonStatus = "in_progress" | "complete";

export const SERMON_STATUS = {
  InProgress: "in_progress",
  Complete: "complete",
} as const satisfies Record<string, SermonStatus>;

export const SERMON_STATUS_LABELS: Readonly<Record<SermonStatus, string>> = Object.freeze({
  in_progress: "In Progress",
  complete: "Complete",
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
  | "SeriesPlanner"
  | "Workspace";

export const VIEW = {
  Dashboard: "Dashboard",
  Sermons: "Sermons",
  Calendar: "Calendar",
  CompletedSermons: "CompletedSermons",
  Planning: "Planning",
  SeriesPlanner: "SeriesPlanner",
  Workspace: "Workspace",
} as const satisfies Record<View, View>;

// ── Surface Contract #3 — loading vocabulary ─────────────────────────────────
export type LoadingVerb = "Loading…" | "Saving…" | "Thinking…";

export const LOADING_VERB = {
  Loading: "Loading…",
  Saving: "Saving…",
  Thinking: "Thinking…",
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
export interface ProcessPosition {
  stage: Stage;
  step?: Step;          // present when stage === "Study"
  subPhase?: SubPhase;  // present when step === "Exegesis"
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
  legacy: boolean;                    // true if created before legacy_evidence_cutoff
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
  "outline", "manuscript", "delivery_notes", "timing_notes", "post_sermon",
  "functional_elements", "checklist", "series_id", "section_id", "is_one_off",
  "topic_theme", "audience_assumptions", "background_noise", "study_guide_note",
  "preaching_blocks", "manuscript_delivery", "last_tune_up",
  // v17 — canonical process position columns added by spine layer.
  "current_stage", "current_step", "current_sub_phase",
  // v18 — Sermon Frame JSON column (SPRD C3, 2026-05-04). Holds Intro +
  // Conclusion field-data per the SADI Step 5 ratification, in the same
  // envelope shape as the four Exegesis sub-phase columns.
  "sermon_frame",
  // v19 — Main Point Pair JSON column (SADI Step 2 plumbing, 2026-05-05).
  // Holds MPT (2Q: draft, tighten) + MPS (3Q: translate, gospel_check,
  // tighten). Flat `mpt` and `mps` columns above are auto-synced from the
  // tighten answers; downstream readers keep using the flat columns.
  "main_point_pair",
  // v20 — ARI Phase 3 per-tab notebooks (2026-05-09). Free-form pastor-typed
  // notes, sermon-scoped, one column per workspace tab where AI used to
  // live. Plain text; replaces the AI Panel as the docked thinking surface.
  "notebook_study", "notebook_blueprint", "notebook_manuscript",
])) as ReadonlySet<string>;

export const SERIES_COLUMNS: ReadonlySet<string> = Object.freeze(new Set([
  "title", "color", "description", "year", "big_idea", "overview",
  "passage_range", "start_date", "end_date", "structural_outline",
  "status", "canon_category",
  "redemptive_context", "book_background", "book_argument", "book_structure",
  "series_motivation", "emerging_big_idea",
])) as ReadonlySet<string>;

export const SECTION_COLUMNS: ReadonlySet<string> = Object.freeze(new Set([
  "title", "passage_range", "big_idea", "overview", "sort_order",
])) as ReadonlySet<string>;

export function pickSermonColumns(obj: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!obj) return out;
  for (const k of Object.keys(obj)) {
    if (SERMON_COLUMNS.has(k)) out[k] = obj[k];
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
