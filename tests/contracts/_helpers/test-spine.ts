// In-memory faithful implementation of the main-side spine handler logic.
//
// Test environment: Path B — the spine boundary is reproduced against an
// in-memory store (Map<string, row>) instead of running a real Electron main
// process and sql.js round-trip. See tests/contracts/README.md for the
// rationale and the explicit fidelity tradeoff.
//
// What this module does:
//   • Replicates validateAndCommit + spineRead from electron/main.js, against
//     in-memory record stores. Every contract-clause rejection here mirrors
//     the main-process code path, citing the same { code, clause, message }
//     envelope.
//   • Exposes installTestSpine() that mounts the bridge on window.electronAPI
//     so the renderer-side spine (src/core/spine.ts) calls into it
//     transparently.
//   • Exposes resetTestSpine() so each test starts with empty stores.
//   • Exposes test-only getters/setters (insertSermonRow, insertSeriesRow)
//     for fixture setup that needs to bypass the spine. (The prior
//     `setLegacyEvidenceCutoff` helper was deleted in Phase G alongside
//     the wall-layer Process #2 carve-out it supported.)
//
// IMPORTANT: this is a TEST FIXTURE. It is not the spine. The renderer-side
// spine in src/core/spine.ts is unchanged and is what production code uses.

import { randomUUID } from "node:crypto";

// Mirror of the contract values from src/core/contracts.ts. Importing the
// .ts directly would pull in browser-side IPC bridge code; safer to mirror
// the small set the spine handler needs.
// Workspace Restructure (2026-05-10) — Stage collapses to three (Blueprint
// + Frame retired); Step layer retires; SubPhase extends with Assembly's
// Anchor / Outline / Equip / Frame.
export const STAGE = { Study: "Study", Assembly: "Assembly", Manuscript: "Manuscript", Delivery: "Delivery" } as const;
export const STAGE_SEQUENCE = ["Study", "Assembly", "Manuscript"] as const;
export const SUB_PHASE = {
  Observe: "Observe", Interpret: "Interpret", RedemptiveThread: "RedemptiveThread", Implications: "Implications",
  Anchor: "Anchor", Outline: "Outline", Equip: "Equip", Frame: "Frame",
} as const;
export const STUDY_SUB_PHASE_SEQUENCE = ["Observe", "Interpret", "RedemptiveThread", "Implications"] as const;
export const ASSEMBLY_SUB_PHASE_SEQUENCE = ["Anchor", "Outline", "Equip", "Frame"] as const;
export const SUB_PHASE_CANONICAL_SEQUENCE = [
  ...STUDY_SUB_PHASE_SEQUENCE, ...ASSEMBLY_SUB_PHASE_SEQUENCE,
] as const;
export const SUB_PHASE_STAGE: Record<string, string> = {
  Observe: "Study", Interpret: "Study", RedemptiveThread: "Study", Implications: "Study",
  Anchor: "Assembly", Outline: "Assembly", Equip: "Assembly", Frame: "Assembly",
};
function coerceLegacyStage(stage: string | null | undefined): string {
  if (stage === "Blueprint" || stage === "Frame") return STAGE.Assembly;
  return stage || STAGE.Study;
}
export const SERMON_STATUS = { InProgress: "in_progress", Complete: "complete" } as const;
export const SERIES_STATUS = { InProgress: "in_progress", Complete: "complete" } as const;
export const MUTATION_KIND = { UserInput: "user_input", AiProposal: "ai_proposal", AiApply: "ai_apply" } as const;

export const SERMON_COLUMNS = new Set([
  "title", "passage", "date", "preacher", "stage", "mpt", "mps",
  "observations", "interpretation", "redemptive_thread", "implications",
  "outline", "manuscript", "delivery_notes", "timing_notes", "post_sermon",
  "functional_elements", "checklist", "series_id", "section_id", "is_one_off",
  // topic_theme / audience_assumptions / background_noise removed in the
  // trail deletion sweep (Phase B1) — mirrors SERMON_COLUMNS in contracts.
  "study_guide_note",
  "preaching_blocks", "manuscript_delivery", "last_tune_up",
  // current_step removed in the trail deletion sweep (Phase B2) — mirrors
  // SERMON_COLUMNS in contracts.
  "current_stage", "current_sub_phase",
  // v18 — SPRD C3 Sermon Frame.
  "sermon_frame",
  // v19 — SADI Step 2 Main Point Pair.
  "main_point_pair",
  // v23 — trail deletion sweep (Phase D1). last_touched_position drives
  // session re-entry; thresholds_seen is the dismissed-thresholds JSON array.
  "last_touched_position", "thresholds_seen",
]);

export const SERIES_COLUMNS = new Set([
  "title", "color", "description", "year", "big_idea", "overview",
  "passage_range", "start_date", "end_date", "structural_outline",
  "status", "canon_category",
  "redemptive_context", "book_background", "book_argument", "book_structure",
  "series_motivation", "emerging_big_idea",
]);

export const SECTION_COLUMNS = new Set([
  "title", "passage_range", "big_idea", "overview", "sort_order",
]);

export const STRUCTURED_FIELDS = new Set([
  "outline", "functional_elements", "observations", "interpretation",
  "redemptive_thread", "implications",
  // v18 — SPRD C3 Sermon Frame.
  "sermon_frame",
  // v19 — SADI Step 2 Main Point Pair.
  "main_point_pair",
]);

// Mirrors electron/main.js buildUpdate: silently filter unknown columns and
// return null when nothing valid remains. main.js additionally throws in dev
// for unknown fields; the fixture keeps that behavior optional via this flag,
// but contract tests today exercise only the valid-or-empty paths.
function buildUpdate(fields: Record<string, any>, allowed: Set<string>): Array<[string, any]> | null {
  const entries = Object.entries(fields).filter(([k]) => allowed.has(k));
  return entries.length ? entries : null;
}

// ── In-memory state ──────────────────────────────────────────────────────────

type Row = Record<string, any>;

const sermons = new Map<string, Row>();
const series = new Map<string, Row>();
const sections = new Map<string, Row>();
const proposals = new Map<string, { sermonId: string; field: string; value: any; isStructured: boolean }>();
// `legacyEvidenceCutoff` mirror deleted in Phase G (2026-05-18) — see
// shapeSermon below for the matching `legacy:` field removal.

function reset() {
  sermons.clear();
  series.clear();
  sections.clear();
  proposals.clear();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rejection(code: string, clause: string, message: string) {
  return { ok: false as const, code, clause, message };
}
function success(value?: unknown) {
  return { ok: true as const, value: value === undefined ? null : value };
}
// `isLegacy` mirror deleted in Phase G (2026-05-18) alongside the wall-
// layer Process #2 empty-evidence rejection it supported.

function shapeSermon(row: Row | undefined, parentContext: any) {
  if (!row) return null;
  // Workspace Restructure (2026-05-10) — legacy stage coercion mirrors
  // electron/main.js's shapeSermon path.
  const stage = coerceLegacyStage(row.current_stage);
  return {
    id: row.id,
    name: row.title || "",
    status: row.stage || SERMON_STATUS.InProgress,
    position: {
      stage,
      subPhase: row.current_sub_phase || undefined,
    },
    parentContext,
    passage: row.passage || "",
    date: row.date || "",
    preacher: row.preacher || "",
    // `legacy: isLegacy(row)` field deleted in Phase G (2026-05-18) — see
    // src/core/contracts.ts Sermon interface for the matching field
    // removal in the main-side shape.
    ...row,
    current_stage: stage,
  };
}

function shapeSeries(row: Row | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.title || "",
    status: row.status || SERIES_STATUS.InProgress,
    year: row.year || new Date().getFullYear(),
    color: row.color || "gold",
    ...row,
  };
}

function computeParentContext(row: Row | undefined) {
  if (!row || !row.series_id) return null;
  const seriesRow = series.get(row.series_id);
  const siblings = [...sermons.values()]
    .filter((s) => s.series_id === row.series_id)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const idx = siblings.findIndex((s) => s.id === row.id);
  if (idx === -1) return null;
  return {
    seriesId: row.series_id,
    seriesName: seriesRow?.title || "",
    positionInSeries: idx + 1,
    totalInSeries: siblings.length,
  };
}

// ── applyStructuredUpdate (mirrors main.js) ──────────────────────────────────

function applyStructuredUpdate(row: Row, field: string, update: any): string | { ok: false; code: string; clause: string; message: string } {
  const raw = row[field];
  let current: any;
  try { current = raw ? JSON.parse(raw) : (field === "outline" ? [] : {}); }
  catch { current = field === "outline" ? [] : {}; }

  if (field === "outline") {
    if (!Array.isArray(current)) current = [];
    if (update.op === "add") current.push({ id: randomUUID(), text: String(update.text || "") });
    else if (update.op === "edit") {
      const i = current.findIndex((p: any) => p.id === update.id);
      if (i >= 0) current[i] = { id: update.id, text: String(update.text || "") };
    } else if (update.op === "remove") current = current.filter((p: any) => p.id !== update.id);
    else if (update.op === "reorder") {
      const byId = new Map(current.map((p: any) => [p.id, p]));
      current = (update.orderedIds || []).map((id: string) => byId.get(id)).filter(Boolean);
    } else return rejection("STATE_5_BAD_OP", "State #5", `Unknown outline op: ${update.op}`);
    return JSON.stringify(current);
  }
  if (field === "functional_elements") {
    if (typeof current !== "object" || current === null || Array.isArray(current)) current = {};
    if (update.op === "set") {
      const entry = current[update.outlinePointId] || {};
      entry[update.field] = String(update.value || "");
      current[update.outlinePointId] = entry;
      return JSON.stringify(current);
    }
    return rejection("STATE_5_BAD_OP", "State #5", `Unknown functional_elements op: ${update.op}`);
  }
  if (typeof current !== "object" || current === null || Array.isArray(current)) current = {};
  if (update.op === "set") { current[update.questionKey] = String(update.value || ""); return JSON.stringify(current); }
  if (update.op === "set_summary") { current.summary = String(update.value || ""); return JSON.stringify(current); }
  return rejection("STATE_5_BAD_OP", "State #5", `Unknown structured op: ${update.op}`);
}

// ── validateAndCommit (mirrors main.js) ──────────────────────────────────────

function validateAndCommit(op: string, payload: any) {
  switch (op) {
    case "create-sermon": {
      const name = (payload?.name || "").trim();
      if (!name) {
        return rejection("STATE_3_NAMELESS_SERMON", "State #3",
          "State Contract #3 violation: no anonymous atoms — a sermon must have a name.");
      }
      const id = randomUUID();
      sermons.set(id, {
        id, series_id: payload.series_id || null, section_id: payload.section_id || null,
        is_one_off: payload.is_one_off ? 1 : 0, title: name,
        passage: payload.passage || "", date: payload.date || "", preacher: payload.preacher || "",
        stage: SERMON_STATUS.InProgress,
        mpt: "", mps: "", observations: "", interpretation: "", redemptive_thread: "",
        implications: "", outline: "[]", manuscript: "", functional_elements: "{}",
        current_stage: STAGE.Study, current_sub_phase: SUB_PHASE.Observe,
        created_at: new Date().toISOString(),
      });
      return success({ id });
    }
    case "create-series": {
      const name = (payload?.name || "").trim();
      if (!name) {
        return rejection("STATE_3_NAMELESS_SERIES", "State #3",
          "State Contract #3 violation: no anonymous atoms — a series must have a name.");
      }
      const id = randomUUID();
      series.set(id, {
        id, title: name, color: payload.color || "gold",
        status: SERIES_STATUS.InProgress,
        year: payload.year || new Date().getFullYear(),
        created_at: new Date().toISOString(),
      });
      return success({ id });
    }
    case "update-sermon": {
      const { id, fields } = payload || {};
      const entries = buildUpdate(fields || {}, SERMON_COLUMNS);
      if (!entries) return rejection("UPDATE_NO_FIELDS", "State #5", "No valid fields to update.");
      const row = sermons.get(id);
      if (!row) return success();
      for (const [k, v] of entries) row[k] = v;
      return success();
    }
    case "update-series": {
      const { id, fields } = payload || {};
      if (Object.prototype.hasOwnProperty.call(fields || {}, "title")) {
        const t = (fields.title || "").trim();
        if (!t) return rejection("STATE_3_NAMELESS_SERIES", "State #3",
          "State Contract #3 violation: a series must have a name.");
      }
      const entries = buildUpdate(fields || {}, SERIES_COLUMNS);
      if (!entries) return rejection("UPDATE_NO_FIELDS", "State #5", "No valid fields to update.");
      const row = series.get(id);
      if (!row) return success();
      for (const [k, v] of entries) row[k] = v;
      return success();
    }
    case "delete-sermon": sermons.delete(payload); return success();
    case "delete-series": {
      // Cascade: remove series_sections, null out sermons.series_id + section_id.
      for (const [sid, sec] of sections) {
        if (sec.series_id === payload) sections.delete(sid);
      }
      for (const sermon of sermons.values()) {
        if (sermon.series_id === payload) {
          sermon.series_id = null;
          sermon.section_id = null;
        }
      }
      series.delete(payload);
      return success();
    }
    case "create-section": {
      const id = randomUUID();
      sections.set(id, { id, ...payload, sort_order: payload.sort_order ?? 0 });
      return success({ id });
    }
    case "update-section": {
      const { id, fields } = payload || {};
      const entries = buildUpdate(fields || {}, SECTION_COLUMNS);
      if (!entries) return rejection("UPDATE_NO_FIELDS", "State #5", "No valid fields to update.");
      const row = sections.get(id);
      if (!row) return success();
      for (const [k, v] of entries) row[k] = v;
      return success();
    }
    case "delete-section": {
      // Cascade: null out sermons.section_id pointing at this section.
      for (const sermon of sermons.values()) {
        if (sermon.section_id === payload) sermon.section_id = null;
      }
      sections.delete(payload);
      return success();
    }
    case "transition-state": {
      // Phase G (2026-05-18) gravestone — the rejection-mirror blocks were
      // deleted here in lockstep with the main.js wall-layer deletion (see
      // electron/main.js transition-state case). What used to mirror:
      //   - Process #2 empty-evidence rejection (forward-only) + `isLegacy`
      //     carve-out
      //   - Process #1 stage forward-to-prior rejection
      //   - Process #1 sub-phase forward-to-prior rejection
      // What remains is the position-write mirror itself + the existence
      // guard + the noncanonical-`to` guard.
      const { sermonId, kind } = payload || {};
      let { to } = payload || {};
      const row = sermons.get(sermonId);
      if (!row) return rejection("NOT_FOUND", "State #1", `Sermon ${sermonId} not found.`);
      // Workspace Restructure (2026-05-10) — coerce legacy stage values in
      // `to` so old fixtures using STAGE.Blueprint / STAGE.Frame still
      // resolve cleanly to STAGE.Assembly.
      if (kind === "stage") to = coerceLegacyStage(to);
      const currentStage = coerceLegacyStage(row.current_stage);
      if (kind === "stage") {
        row.current_stage = to;
        // current_step removed in the trail deletion sweep (Phase B2).
        row.current_sub_phase = to === STAGE.Study ? SUB_PHASE.Observe
          : to === STAGE.Assembly ? SUB_PHASE.Anchor
          : null;
      } else if (kind === "sub_phase") {
        const targetStage = SUB_PHASE_STAGE[to];
        if (targetStage && targetStage !== currentStage) {
          row.current_stage = targetStage;
        }
        row.current_sub_phase = to;
      } else {
        return rejection("STATE_5_NONCANONICAL_TO", "State #5",
          `'to' must be a canonical Stage or SubPhase value (got '${to}').`);
      }
      return success();
    }
    case "apply-mutation": {
      const { kind, sermonId, field } = payload || {};
      if (!sermonId || !field)
        return rejection("BAD_PAYLOAD", "Spine", "applyMutation requires sermonId and field.");
      const row = sermons.get(sermonId);
      if (!row) return rejection("NOT_FOUND", "State #1", `Sermon ${sermonId} not found.`);
      if (!SERMON_COLUMNS.has(field))
        return rejection("STATE_5_UNKNOWN_FIELD", "State #5", `Unknown sermon field '${field}'.`);
      const isStructured = STRUCTURED_FIELDS.has(field);

      if (kind === MUTATION_KIND.UserInput) {
        let serialized: any;
        if (isStructured) {
          const r = applyStructuredUpdate(row, field, payload.value);
          if (typeof r === "object" && (r as any).ok === false) return r as any;
          serialized = r;
        } else {
          if (typeof payload.value !== "string")
            return rejection("STATE_5_SIMPLE_FIELD_STRUCTURED", "State #5",
              `'${field}' is a simple field; value must be a string.`);
          serialized = payload.value;
        }
        row[field] = serialized;
        return success();
      }
      if (kind === MUTATION_KIND.AiProposal) {
        const prior = row[field];
        const priorEmpty = prior == null ||
          (typeof prior === "string" && (prior.trim() === "" || prior === "[]" || prior === "{}"));
        if (priorEmpty) {
          return rejection("PROCESS_5_AI_NO_USER_EVIDENCE", "Process #5",
            "Process Contract #5 violation: AI augments, never substitutes — proposals require prior user evidence in the field.");
        }
        if (isStructured && typeof payload.value === "string")
          return rejection("STATE_5_STRUCTURED_FIELD_STRING", "State #5",
            `'${field}' is a structured field; pass a typed update shape.`);
        if (!isStructured && typeof payload.value !== "string")
          return rejection("STATE_5_SIMPLE_FIELD_STRUCTURED", "State #5",
            `'${field}' is a simple field; value must be a string.`);
        const proposalId = randomUUID();
        proposals.set(proposalId, { sermonId, field, value: payload.value, isStructured });
        return success({ proposalId });
      }
      if (kind === MUTATION_KIND.AiApply) {
        const { proposalId } = payload;
        if (!proposalId || !proposals.has(proposalId)) {
          return rejection("MUTATION_1_AI_APPLY_WITHOUT_PROPOSAL", "Mutation #1",
            "Mutation Contract #1 violation: user typing wins; ai_apply requires a referenced proposalId from a prior ai_proposal.");
        }
        const p = proposals.get(proposalId)!;
        if (p.sermonId !== sermonId || p.field !== field) {
          return rejection("MUTATION_1_PROPOSAL_MISMATCH", "Mutation #1",
            "Mutation Contract #1 violation: proposalId references a different sermon/field than the apply call.");
        }
        let serialized: any;
        if (p.isStructured) {
          const r = applyStructuredUpdate(row, field, p.value);
          if (typeof r === "object" && (r as any).ok === false) return r as any;
          serialized = r;
        } else {
          serialized = p.value;
        }
        row[field] = serialized;
        proposals.delete(proposalId);
        return success();
      }
      return rejection("BAD_KIND", "Mutation", `Unknown mutation kind: ${kind}`);
    }
    case "load-sample-sermon": {
      const id = "sample-test-sermon";
      sermons.set(id, {
        id, title: "Sample sermon", stage: SERMON_STATUS.InProgress,
        current_stage: STAGE.Study, current_sub_phase: SUB_PHASE.Observe,
        outline: "[]", functional_elements: "{}", observations: "", created_at: new Date().toISOString(),
      });
      return success({ sermonId: id, created: true });
    }
    // remove-tour-sermon retired in the tour-cleanup phase (2026-05-17).
    default:
      return rejection("UNKNOWN_OP", "Spine", `Unknown spine mutation op: ${op}`);
  }
}

// ── Read router ──────────────────────────────────────────────────────────────

function spineRead(op: string, payload: any): any {
  switch (op) {
    case "get-sermon": {
      const row = sermons.get(payload);
      return shapeSermon(row, computeParentContext(row));
    }
    case "get-series": return shapeSeries(series.get(payload));
    case "get-all-sermons":
      return [...sermons.values()]
        .filter((s) => !s.id.startsWith("tour-"))
        .sort((a, b) => {
          const d = (b.date || "").localeCompare(a.date || "");
          return d !== 0 ? d : (b.created_at || "").localeCompare(a.created_at || "");
        })
        .map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-all-series":
      return [...series.values()]
        .filter((s) => !s.id.startsWith("tour-"))
        .sort((a, b) => {
          const y = (b.year || 0) - (a.year || 0);
          return y !== 0 ? y : (a.title || "").localeCompare(b.title || "");
        })
        .map(shapeSeries);
    case "get-recent-sermons":
      return [...sermons.values()]
        .filter((s) => s.stage !== SERMON_STATUS.Complete && !s.id.startsWith("tour-"))
        .sort((a, b) => {
          const u = (b.updated_at || "").localeCompare(a.updated_at || "");
          return u !== 0 ? u : (b.created_at || "").localeCompare(a.created_at || "");
        })
        .slice(0, payload?.limit ?? 3)
        .map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-recent-series":
      return [...series.values()]
        .filter((s) => !s.id.startsWith("tour-"))
        .sort((a, b) => {
          const ka = a.updated_at || a.created_at || "";
          const kb = b.updated_at || b.created_at || "";
          return kb.localeCompare(ka);
        })
        .slice(0, payload?.limit ?? 3)
        .map(shapeSeries);
    case "get-in-progress-sermons":
      return [...sermons.values()]
        .filter((s) => s.stage === SERMON_STATUS.InProgress && !s.id.startsWith("tour-"))
        .sort((a, b) => {
          const u = (b.updated_at || "").localeCompare(a.updated_at || "");
          return u !== 0 ? u : (b.created_at || "").localeCompare(a.created_at || "");
        })
        .map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-sermons-by-series":
      return [...sermons.values()]
        .filter((s) => s.series_id === payload)
        .sort((a, b) => {
          const d = (a.date || "").localeCompare(b.date || "");
          return d !== 0 ? d : (a.created_at || "").localeCompare(b.created_at || "");
        })
        .map((s) => {
          const sec = s.section_id ? sections.get(s.section_id) : null;
          return { ...s, section_title: sec?.title || null };
        });
    case "get-sections-by-series":
      return [...sections.values()]
        .filter((s) => s.series_id === payload)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    default: return null;
  }
}

const SPINE_READ_OPS = new Set([
  "get-sermon", "get-series", "get-all-sermons", "get-all-series",
  "get-recent-sermons", "get-recent-series", "get-in-progress-sermons",
  "get-sermons-by-series", "get-sections-by-series",
]);

async function dispatch(op: string, payload?: any) {
  if (SPINE_READ_OPS.has(op)) return spineRead(op, payload);
  return validateAndCommit(op, payload);
}

// ── Test harness API ─────────────────────────────────────────────────────────

export function installTestSpine(): void {
  const w: any = globalThis as any;
  // Real implementations for the methods the spine + schema-contract guard
  // need. Everything else is a permissive Proxy that returns Promise<null>
  // for any unknown method — components rendered in tests routinely touch
  // peripheral methods (theology, passage fetch, AI) that are out of scope
  // for the contract being tested; a permissive default keeps the contract
  // test focused without requiring per-method stubs.
  const explicit: Record<string, any> = {
    spine: dispatch,
    getApiKeyStatus: async () => ({ configured: true }),
    onDbWriteError: () => () => {},
    onDbWriteOk: () => () => {},
    flushDb: async () => ({ ok: true }),
    getSermonColumns: async () => ({ columns: [...SERMON_COLUMNS] }),
    getStartupWarning: async () => null,
    getTheologyStatus: async () => ({ available: false, semantic: false }),
    searchTheologyLibrary: async () => [],
    getTheologyChunks: async () => [],
    fetchPassage: async () => null,
    sendAIMessage: async () => ({ ok: true, text: "" }),
    backupMemory: async () => ({ ok: true }),
    restoreMemory: async () => null,
  };
  w.electronAPI = new Proxy(explicit, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (typeof prop !== "string") return undefined;
      if (prop.startsWith("on")) return () => () => {};
      return async () => null;
    },
  });
}

export function resetTestSpine(): void {
  reset();
}

// `setLegacyEvidenceCutoff` export deleted in Phase G (2026-05-18) — the
// fixture-side legacy-cutoff state went with the wall-layer Process #2
// carve-out it supported.

export function insertSermonRow(row: Partial<Row>): string {
  const id = row.id || randomUUID();
  sermons.set(id, {
    id, title: row.title ?? "fixture",
    stage: row.stage ?? SERMON_STATUS.InProgress,
    current_stage: row.current_stage ?? STAGE.Study,
    // current_step removed in the trail deletion sweep (Phase B2).
    current_sub_phase: row.current_sub_phase ?? SUB_PHASE.Observe,
    outline: row.outline ?? "[]",
    functional_elements: row.functional_elements ?? "{}",
    observations: row.observations ?? "",
    created_at: row.created_at ?? new Date().toISOString(),
    ...row,
  });
  return id;
}

export function insertSeriesRow(row: Partial<Row>): string {
  const id = row.id || randomUUID();
  series.set(id, {
    id, title: row.title ?? "fixture series",
    status: row.status ?? SERIES_STATUS.InProgress,
    year: row.year ?? new Date().getFullYear(),
    color: row.color ?? "gold",
    created_at: row.created_at ?? new Date().toISOString(),
    ...row,
  });
  return id;
}

export function getSermonRow(id: string): Row | undefined {
  return sermons.get(id);
}

export function listProposals(): Map<string, any> {
  return proposals;
}
