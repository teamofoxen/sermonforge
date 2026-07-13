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
// • Phase G (2026-05-18) gravestone — the legacy carve-out for transitionState
//   evidence (the original Process Contract #2 enforcement) was deleted with
//   the wall layer in this sweep. The renderer no longer sends evidence; the
//   main-side rejection is gone; the cutoff machinery is gone. CORE Process
//   Contracts #1 + #2 are rearticulated against the new free-navigation +
//   completeness-contract surface.
//
// Authority: docs/CORE.md → "The Framework."

import {
  Stage, SubPhase, Sermon, Series,
  STAGE,
  STRUCTURED_FIELDS,
  OutlineUpdate, FunctionalElementUpdate,
  ObservationUpdate, InterpretationUpdate,
  RedemptiveThreadUpdate, ImplicationsUpdate,
  ContractViolation, IpcResult,
} from "./contracts";
import mapError from "../utils/mapError";

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
  "get-all-tags",
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
  if (op === "get-series-sermon-counts") {
    return {};
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
      // topic_theme / audience_assumptions / background_noise removed in the
      // trail deletion sweep (Phase B1) — see SERMON_COLUMNS comment.
      study_guide_note: "",
      preaching_blocks: "",
      manuscript_delivery: "",
      last_tune_up: "",
      sermon_frame: "",
      current_stage: STAGE.Study,
      // current_step removed in the trail deletion sweep (Phase B2).
      current_sub_phase: "Observe",
      // v23 — trail deletion sweep (Phase D1). last_touched_position is NULL
      // on a brand-new sermon — the sermon-start landing reads this and
      // fires. thresholds_seen starts as an empty JSON array.
      last_touched_position: null,
      thresholds_seen: "[]",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      position: { stage: STAGE.Study, sub_phase: "Observe" },
      parentContext: null,
      // `legacy: false` field removed in Phase G (2026-05-18) alongside the
      // wall layer that consumed it.
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
// Single grouped read of per-series sermon counts — replaces the Planning
// list's N+1 fan-out of getSermonsBySeries (audit perf). Returns a plain
// { [seriesId]: count } map.
export function getSeriesSermonCounts(): Promise<Record<string, number>> {
  return call("get-series-sermon-counts");
}
// Distinct sorted topic tags across all live sermons — feeds the workspace's
// own-tag autocomplete and the Topics lens (Coverage Initiative, Phase 3).
export function getAllTags(): Promise<string[]> {
  return call("get-all-tags");
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

// Soft delete (v24) — the row stays in the DB with a deleted_at tombstone
// and stops appearing everywhere; restoreSermon is its undo.
export function deleteSermon(id: string): Promise<void> {
  return call("delete-sermon", id);
}

export function restoreSermon(id: string): Promise<void> {
  return call("restore-sermon", id);
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

// ── Bounded planner-gesture ops (Session-3 Part B) ───────────────────────────
// Each of these is ONE visible human gesture that used to fan out as N
// independent writes from the renderer (Promise.all) — a mid-flight failure
// left half the rows changed. Main commits each gesture in one SQLite
// transaction and validates the parent relationships; the renderer keeps its
// optimistic state and reloads DB truth on failure.

// Section reorder: orderedIds must name every section of the series exactly
// once; sort_order becomes the array index.
export function reorderSections(seriesId: string, orderedIds: string[]): Promise<void> {
  return call("reorder-sections", { series_id: seriesId, orderedIds });
}

// Topical-arrangement reorder: orderedIds must name every live sermon of the
// series exactly once; sort_order becomes the array index.
export function reorderSeriesSermons(seriesId: string, orderedIds: string[]): Promise<void> {
  return call("reorder-series-sermons", { series_id: seriesId, orderedIds });
}

// Date assignment (single pick or Suggest Sundays) + the series.end_date
// mirror in the same transaction. Resolves with the mirrored end_date so the
// renderer's optimistic series state can settle on DB truth without a refetch.
export function bulkDateSermons(
  seriesId: string,
  dates: Array<{ id: string; date: string }>,
): Promise<{ end_date: string }> {
  return call("bulk-date-sermons", { series_id: seriesId, dates });
}

// Sandbox semantics: without `fresh`, an existing sample is returned as-is
// (the pastor's exploration survives re-entry); `fresh: true` deletes and
// reseeds — the dashboard's explicit "Start the sample fresh".
export function loadSampleSermon(opts?: { fresh?: boolean }): Promise<{ sermonId: string; created: boolean }> {
  return call("load-sample-sermon", opts?.fresh ? { fresh: true } : undefined);
}

// ── transitionState (position-writer) — REMOVED in Track E4 (2026-07-03) ─────
//
// The vestigial legacy position subsystem (audit finding D): a renderer wrapper
// that classified a target Stage/SubPhase and dispatched the `transition-state`
// IPC op to an electron handler which wrote current_stage / current_sub_phase /
// last_*_subphase. It had no live caller — the workspace stores position solely
// in `last_touched_position` (via `update-sermon`). E1 locked out a live caller
// while the definition stood; E4 removed the whole path: this wrapper + its
// `TransitionInput` / `classify` helpers, the electron `case "transition-state"`
// handler, and the test-spine fixture mirror. The current_stage / current_sub_phase
// / last_*_subphase columns stay in the schema (no migration) with no live
// updater — they retain their create-INSERT or DEFAULT value. Reintroduction is
// guarded by
// tests/contracts/transition-state-no-caller.test.ts.

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
  // Optional plain mapped message for a failed save (mapError(err, "save") —
  // disk full / file locked / generic). The topbar chip renders it when
  // present, else falls back to "Save failed". Cleared on a successful save.
  saveErrorMessage?: string;
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
    // Carry the same plain mapped message the rest of the app already uses so
    // the save chip can speak it (Mutation #5, one voice). This only ADDS the
    // message string — saveError stays true, lastSavedAt is not advanced, and
    // the caller still gets undefined, so retry behavior is unchanged.
    setSaveState((prev) => ({ ...prev, saving: false, saveError: true, saveErrorMessage: mapError(e, "save") }));
    return undefined;
  }
}
