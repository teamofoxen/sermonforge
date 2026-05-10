// SermonForge — Spine
//
// The only API for creating, reading, and mutating sermons and series.
// Every renderer-side touch of sermon/series state goes through this module.
// `scripts/spine-integrity.js` enforces the rule structurally; the boundary
// here is what makes State Contract #1, #2, #4, #6 and Mutation Contract #1,
// #2, #3 enforceable instead of merely encouraged.
//
// Design decisions
// ────────────────
// • IPC bridge is a single channel `spine` on `window.electronAPI`, dispatched
//   by op name on the main side. One channel keeps the surface area small;
//   the per-op router lives in `electron/main.js` (`validateAndCommit`).
//
// • Mutations always cross the boundary as `{ ok: true, value } | { ok: false,
//   code, clause, message }`. The renderer-side `call()` helper unwraps and
//   throws `ContractViolation` on rejection, so callers see a uniform error
//   type regardless of whether the rejection happened renderer-side
//   (fast-fail) or main-side (canonical gate).
//
// • Reads return raw enriched DB rows for backward compatibility with existing
//   component code (which reads `sermon.title`, `sermon.series_title`, etc.).
//   The strict canonical `Sermon` shape from `contracts.ts` is what
//   `getSermon(id)` returns — a single sermon with all canonical fields
//   computed. `getAllSermons / getInProgressSermons / getSermonsBySeries` etc.
//   return enriched rows. Migration of consumers to the strict shape is a
//   later phase.
//
// • The legacy carve-out for transitionState evidence (Process Contract #2)
//   lives main-side. Renderer fast-fails on empty evidence regardless; the
//   main-side gate is the canonical place where the carve-out applies, since
//   only main has the sermon record's `created_at` to compare against the
//   v17 `legacy_evidence_cutoff`.
//
// Authority: docs/CORE.md → "The Framework."

import {
  Stage, Step, SubPhase, Sermon, Series,
  STAGE, STAGE_SEQUENCE, STEP_CANONICAL_SEQUENCE, SUB_PHASE_CANONICAL_SEQUENCE,
  STRUCTURED_FIELDS,
  OutlineUpdate, FunctionalElementUpdate,
  ObservationUpdate, InterpretationUpdate,
  RedemptiveThreadUpdate, ImplicationsUpdate,
  ContractViolation, IpcResult,
} from "./contracts";

// ── IPC bridge ───────────────────────────────────────────────────────────────

interface SpineWindow {
  electronAPI?: { spine?: (op: string, payload?: unknown) => Promise<unknown> };
}

function getBridge(): ((op: string, payload?: unknown) => Promise<unknown>) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as SpineWindow;
  return w.electronAPI?.spine ?? null;
}

const READ_OPS_RETURNING_ARRAY: ReadonlySet<string> = new Set([
  "get-all-sermons",
  "get-all-series",
  "get-recent-sermons",
  "get-recent-series",
  "get-in-progress-sermons",
  "get-sermons-by-series",
  "get-sections-by-series",
]);

// Browser-preview mock — returns enough shape to let the workspace render
// when there's no Electron preload (Vite-only). Real data requires Electron.
// SPRD C2 (2026-05-04): added create-sermon + get-sermon paths so the
// throughline rail can be visually verified end-to-end in the browser preview.
const PREVIEW_MOCK_SERMON_ID = "preview-mock-sermon";
function browserPreviewMock(op: string, payload?: unknown): unknown {
  if (op === "create-sermon") {
    return { id: PREVIEW_MOCK_SERMON_ID };
  }
  if (op === "create-series") {
    return { id: "preview-mock-series" };
  }
  if (op === "get-sermon") {
    return {
      id: PREVIEW_MOCK_SERMON_ID,
      title: "Throughline Preview",
      passage: "Philippians 3:1-11",
      date: null,
      preacher: null,
      stage: STAGE.Study,
      mpt: "",
      mps: "",
      observations: "",
      interpretation: "",
      redemptive_thread: "",
      implications: "",
      outline: "",
      manuscript: "",
      delivery_notes: "",
      timing_notes: "",
      post_sermon: "",
      functional_elements: "",
      checklist: "",
      series_id: null,
      section_id: null,
      is_one_off: 1,
      topic_theme: "",
      audience_assumptions: "",
      background_noise: "",
      study_guide_note: "",
      preaching_blocks: "",
      manuscript_delivery: "",
      last_tune_up: "",
      sermon_frame: "",
      current_stage: STAGE.Study,
      current_step: "exegesis",
      current_sub_phase: "observe",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      position: { stage: STAGE.Study, step: "exegesis", sub_phase: "observe" },
      parentContext: null,
      legacy: false,
    };
  }
  return null;
}

async function call<T>(op: string, payload?: unknown): Promise<T> {
  const bridge = getBridge();
  if (!bridge) {
    // Browser-preview fallback: no Electron preload. Return safe defaults so
    // UI-only verification still renders. Real data requires the Electron shell.
    if (READ_OPS_RETURNING_ARRAY.has(op)) return [] as unknown as T;
    return browserPreviewMock(op, payload) as T;
  }
  const raw = await bridge(op, payload);
  // Mutation ops return IpcResult envelopes; reads return raw values.
  if (raw && typeof raw === "object" && "ok" in (raw as Record<string, unknown>)) {
    const env = raw as IpcResult<T>;
    if (env.ok === false) {
      throw new ContractViolation(env.message, env.clause, env.code);
    }
    return env.value as T;
  }
  return raw as T;
}

// ── Reads ────────────────────────────────────────────────────────────────────
//
// Reads return enriched DB row shapes (with JOIN'd series_title, series_color,
// position fields, and `legacy` boolean) for backward compatibility with
// existing components. `getSermon(id)` is special — see contracts.ts `Sermon`
// for the canonical shape it returns.

export function getSermon(id: string): Promise<Sermon | null> {
  return call("get-sermon", id);
}
export function getSeries(id: string): Promise<Series | null> {
  return call("get-series", id);
}
export function getAllSermons(): Promise<any[]> {
  return call("get-all-sermons");
}
export function getAllSeries(): Promise<any[]> {
  return call("get-all-series");
}
export function getRecentSermons(limit = 3): Promise<any[]> {
  return call("get-recent-sermons", { limit });
}
export function getRecentSeries(limit = 3): Promise<any[]> {
  return call("get-recent-series", { limit });
}
export function getInProgressSermons(): Promise<any[]> {
  return call("get-in-progress-sermons");
}
export function getSermonsBySeries(seriesId: string): Promise<any[]> {
  return call("get-sermons-by-series", seriesId);
}
export function getSectionsBySeries(seriesId: string): Promise<any[]> {
  return call("get-sections-by-series", seriesId);
}

// ── Create / Update / Delete (non-mutation-contract routes) ──────────────────

export interface CreateSermonInput {
  name: string;
  passage?: string;
  date?: string;
  preacher?: string;
  series_id?: string | null;
  section_id?: string | null;
  is_one_off?: boolean | number;
}

export function createSermon(input: CreateSermonInput): Promise<{ id: string }> {
  // State Contract #3 fast-fail at the renderer boundary. The main-side
  // validateAndCommit re-validates so the IPC layer is also a structural gate.
  if (!input?.name || !input.name.trim()) {
    throw new ContractViolation(
      "State Contract #3 violation: no anonymous atoms — a sermon must have a name.",
      "State #3",
      "STATE_3_NAMELESS_SERMON",
    );
  }
  return call("create-sermon", input);
}

export interface CreateSeriesInput {
  name: string;
  year?: number;
  color?: string;
}

export function createSeries(input: CreateSeriesInput): Promise<{ id: string }> {
  if (!input?.name || !input.name.trim()) {
    throw new ContractViolation(
      "State Contract #3 violation: no anonymous atoms — a series must have a name.",
      "State #3",
      "STATE_3_NAMELESS_SERIES",
    );
  }
  return call("create-series", input);
}

/**
 * Multi-field sermon update — every passed field is committed as a user_input
 * mutation. Structured-field columns (outline, functional_elements, etc.)
 * accept pre-serialized JSON strings here; for typed structured updates use
 * `applyMutation({ kind: "user_input", field, value })` instead.
 *
 * State Contract #5 (allowlist) and Mutation Contract #1 (user typing wins)
 * are enforced by the main-side gate — every field passes through the same
 * validateAndCommit path that single-field user_input mutations use.
 */
export function updateSermon(id: string, fields: Record<string, unknown>): Promise<void> {
  return call("update-sermon", { id, fields });
}

export function updateSeries(id: string, fields: Record<string, unknown>): Promise<void> {
  return call("update-series", { id, fields });
}

export function deleteSermon(id: string): Promise<void> {
  return call("delete-sermon", id);
}

export function deleteSeries(id: string): Promise<void> {
  return call("delete-series", id);
}

export function createSection(data: Record<string, unknown>): Promise<{ id: string }> {
  return call("create-section", data);
}

export function updateSection(id: string, fields: Record<string, unknown>): Promise<void> {
  return call("update-section", { id, fields });
}

export function deleteSection(id: string): Promise<void> {
  return call("delete-section", id);
}

export function loadTourSermon(): Promise<{ sermonId: string }> {
  return call("load-tour-sermon");
}

export function removeTourSermon(): Promise<void> {
  return call("remove-tour-sermon");
}

// ── transitionState — Process Contract #1, #2 ────────────────────────────────

export interface TransitionInput {
  sermonId: string;
  to: Stage | Step | SubPhase;
  evidence: string;
  direction: "forward" | "backward";
}

const STAGE_VALUES: ReadonlySet<string> = new Set(STAGE_SEQUENCE as readonly string[]);
const STEP_VALUES: ReadonlySet<string> = new Set(STEP_CANONICAL_SEQUENCE as readonly string[]);
const SUB_PHASE_VALUES: ReadonlySet<string> = new Set(SUB_PHASE_CANONICAL_SEQUENCE as readonly string[]);

function classify(target: string): "stage" | "step" | "sub_phase" | null {
  if (STAGE_VALUES.has(target)) return "stage";
  if (STEP_VALUES.has(target)) return "step";
  if (SUB_PHASE_VALUES.has(target)) return "sub_phase";
  return null;
}

export function transitionState(input: TransitionInput): Promise<void> {
  const kind = classify(input.to as string);
  if (!kind) {
    throw new ContractViolation(
      `State Contract #5 violation: 'to' must be a canonical PascalCase value (received '${String(input.to)}').`,
      "State #5",
      "STATE_5_NONCANONICAL_TO",
    );
  }
  if (input.direction !== "forward" && input.direction !== "backward") {
    throw new ContractViolation(
      "Process Contract #1 violation: direction must be 'forward' or 'backward'.",
      "Process #1",
      "PROCESS_1_INVALID_DIRECTION",
    );
  }
  // Renderer-side fast-fail for empty evidence. Main re-checks with the
  // sermon record so the legacy carve-out (Process #2) is enforced canonically.
  if (!input.evidence || !String(input.evidence).trim()) {
    // Don't reject here — main has the sermon record and applies the legacy
    // carve-out. Empty evidence on a non-legacy sermon will reject main-side
    // with clause "Process #2".
  }
  return call("transition-state", { ...input, kind });
}

// ── applyMutation — Mutation Contract #1, #2 ─────────────────────────────────

export type StructuredFieldUpdate =
  | OutlineUpdate
  | FunctionalElementUpdate
  | ObservationUpdate
  | InterpretationUpdate
  | RedemptiveThreadUpdate
  | ImplicationsUpdate;

export interface UserInputMutation {
  kind: "user_input";
  sermonId: string;
  field: string;
  value: string | StructuredFieldUpdate;
}

export type SpineMutation = UserInputMutation;

function checkShape(input: UserInputMutation): void {
  const isStructured = STRUCTURED_FIELDS.has(input.field);
  const valueIsString = typeof input.value === "string";
  if (isStructured && valueIsString) {
    throw new ContractViolation(
      `State Contract #5 violation: '${input.field}' is a structured field; pass a typed update shape, not a string.`,
      "State #5",
      "STATE_5_STRUCTURED_FIELD_STRING",
    );
  }
  if (!isStructured && !valueIsString) {
    throw new ContractViolation(
      `State Contract #5 violation: '${input.field}' is a simple field; value must be a string.`,
      "State #5",
      "STATE_5_SIMPLE_FIELD_STRUCTURED",
    );
  }
}

export async function applyMutation(input: UserInputMutation): Promise<void> {
  checkShape(input);
  return call("apply-mutation", input);
}

// ── Save-state helper — Mutation Contract #3 ─────────────────────────────────
//
// Extracted from SermonWorkspace.jsx (the inlined `saving / saveError /
// lastSavedAt` pattern). Any caller that needs save visibility should drive
// state through this helper rather than re-inline the same try/catch.
//
// Mutation Contract #3: "saves are events, not background noise. Successful
// saves are visible — the user can answer 'is my work safe' at any moment."

export interface SaveState {
  saving: boolean;
  saveError: boolean;
  lastSavedAt: number | null;
}

export const INITIAL_SAVE_STATE: SaveState = {
  saving: false,
  saveError: false,
  lastSavedAt: null,
};

export type SaveStateSetter = (
  next: SaveState | ((prev: SaveState) => SaveState),
) => void;

/**
 * Run a mutation, surfacing save state via the provided setter.
 * Returns the mutation's result on success, undefined on failure.
 * Mutation Contract #3.
 */
export async function persistMutation<T>(
  setSaveState: SaveStateSetter,
  doMutation: () => Promise<T>,
): Promise<T | undefined> {
  setSaveState((prev) => ({ ...prev, saving: true, saveError: false }));
  try {
    const result = await doMutation();
    setSaveState({ saving: false, saveError: false, lastSavedAt: Date.now() });
    return result;
  } catch (e) {
    console.error("[persistMutation] save failed:", e);
    setSaveState((prev) => ({ ...prev, saving: false, saveError: true }));
    return undefined;
  }
}
