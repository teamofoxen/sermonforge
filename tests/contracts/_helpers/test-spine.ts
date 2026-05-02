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
//   • Exposes test-only getters/setters (insertSermonRow, insertSeriesRow,
//     setLegacyEvidenceCutoff) for fixture setup that needs to bypass the
//     spine (e.g. inserting a "legacy" sermon with created_at < cutoff).
//
// IMPORTANT: this is a TEST FIXTURE. It is not the spine. The renderer-side
// spine in src/core/spine.ts is unchanged and is what production code uses.

import { randomUUID } from "node:crypto";

// Mirror of the contract values from src/core/contracts.ts. Importing the
// .ts directly would pull in browser-side IPC bridge code; safer to mirror
// the small set the spine handler needs.
export const STAGE = { Study: "Study", Blueprint: "Blueprint", Manuscript: "Manuscript", Delivery: "Delivery" } as const;
export const STAGE_SEQUENCE = ["Study", "Blueprint", "Manuscript", "Delivery"] as const;
export const STEP = { Exegesis: "Exegesis", MPT_MPS: "MPT_MPS", Outline: "Outline", FunctionalElements: "FunctionalElements" } as const;
export const STEP_CANONICAL_SEQUENCE = ["Exegesis", "MPT_MPS", "Outline", "FunctionalElements"] as const;
export const SUB_PHASE = { Observe: "Observe", Interpret: "Interpret", RedemptiveThread: "RedemptiveThread", Implications: "Implications" } as const;
export const SUB_PHASE_CANONICAL_SEQUENCE = ["Observe", "Interpret", "RedemptiveThread", "Implications"] as const;
export const SERMON_STATUS = { InProgress: "in_progress", Complete: "complete" } as const;
export const SERIES_STATUS = { InProgress: "in_progress", Complete: "complete" } as const;
export const MUTATION_KIND = { UserInput: "user_input", AiProposal: "ai_proposal", AiApply: "ai_apply" } as const;

export const SERMON_COLUMNS = new Set([
  "title", "passage", "date", "preacher", "stage", "mpt", "mps",
  "observations", "interpretation", "redemptive_thread", "implications",
  "outline", "manuscript", "delivery_notes", "timing_notes", "post_sermon",
  "functional_elements", "checklist", "series_id", "section_id", "is_one_off",
  "topic_theme", "audience_assumptions", "background_noise", "study_guide_note",
  "preaching_blocks", "manuscript_delivery", "last_tune_up",
  "current_stage", "current_step", "current_sub_phase",
]);

export const STRUCTURED_FIELDS = new Set([
  "outline", "functional_elements", "observations", "interpretation",
  "redemptive_thread", "implications",
]);

// ── In-memory state ──────────────────────────────────────────────────────────

type Row = Record<string, any>;

const sermons = new Map<string, Row>();
const series = new Map<string, Row>();
const sections = new Map<string, Row>();
const proposals = new Map<string, { sermonId: string; field: string; value: any; isStructured: boolean }>();
let legacyEvidenceCutoff: string | null = null;

function reset() {
  sermons.clear();
  series.clear();
  sections.clear();
  proposals.clear();
  legacyEvidenceCutoff = null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rejection(code: string, clause: string, message: string) {
  return { ok: false as const, code, clause, message };
}
function success(value?: unknown) {
  return { ok: true as const, value: value === undefined ? null : value };
}
function isLegacy(row: Row): boolean {
  if (!legacyEvidenceCutoff) return false;
  return (row.created_at || "") < legacyEvidenceCutoff;
}

function shapeSermon(row: Row | undefined, parentContext: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.title || "",
    status: row.stage || SERMON_STATUS.InProgress,
    position: {
      stage: row.current_stage || STAGE.Study,
      step: row.current_step || undefined,
      subPhase: row.current_sub_phase || undefined,
    },
    parentContext,
    passage: row.passage || "",
    date: row.date || "",
    preacher: row.preacher || "",
    legacy: isLegacy(row),
    ...row,
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
  if (update.op === "set_unbeliever") { current.unbeliever = String(update.value || ""); return JSON.stringify(current); }
  if (update.op === "set_compiled") { current.compiled = String(update.value || ""); return JSON.stringify(current); }
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
        current_stage: STAGE.Study, current_step: STEP.Exegesis, current_sub_phase: SUB_PHASE.Observe,
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
      const row = sermons.get(id);
      if (!row) return rejection("NOT_FOUND", "State #1", `Sermon ${id} not found.`);
      for (const k of Object.keys(fields || {})) {
        if (!SERMON_COLUMNS.has(k)) {
          return rejection("STATE_5_UNKNOWN_FIELD", "State #5",
            `Unknown sermon field '${k}'.`);
        }
      }
      Object.assign(row, fields);
      return success();
    }
    case "update-series": {
      const { id, fields } = payload || {};
      const row = series.get(id);
      if (!row) return rejection("NOT_FOUND", "State #1", `Series ${id} not found.`);
      if (Object.prototype.hasOwnProperty.call(fields || {}, "title")) {
        const t = (fields.title || "").trim();
        if (!t) return rejection("STATE_3_NAMELESS_SERIES", "State #3",
          "State Contract #3 violation: a series must have a name.");
      }
      Object.assign(row, fields);
      return success();
    }
    case "delete-sermon": sermons.delete(payload); return success();
    case "delete-series": series.delete(payload); return success();
    case "create-section": {
      const id = randomUUID();
      sections.set(id, { id, ...payload, sort_order: payload.sort_order ?? 0 });
      return success({ id });
    }
    case "update-section": {
      const { id, fields } = payload || {};
      const row = sections.get(id);
      if (!row) return rejection("NOT_FOUND", "State #1", `Section ${id} not found.`);
      Object.assign(row, fields);
      return success();
    }
    case "delete-section": sections.delete(payload); return success();
    case "transition-state": {
      const { sermonId, to, evidence, direction, kind } = payload || {};
      const row = sermons.get(sermonId);
      if (!row) return rejection("NOT_FOUND", "State #1", `Sermon ${sermonId} not found.`);
      const evidenceTrimmed = (evidence || "").trim();
      if (!evidenceTrimmed && !isLegacy(row)) {
        return rejection("PROCESS_2_EMPTY_EVIDENCE", "Process #2",
          "Process Contract #2 violation: movement is gated by user evidence — the constraint is the gate.");
      }
      if (kind === "stage" && direction === "forward") {
        const fromIdx = STAGE_SEQUENCE.indexOf(row.current_stage);
        const toIdx = STAGE_SEQUENCE.indexOf(to);
        if (fromIdx >= 0 && toIdx >= 0 && toIdx <= fromIdx) {
          return rejection("PROCESS_1_FORWARD_TO_PRIOR", "Process #1",
            "Process Contract #1 violation: forward direction cannot move to a prior stage (movement is monotonic by default).");
        }
      }
      if (kind === "step" && direction === "forward") {
        const fromIdx = STEP_CANONICAL_SEQUENCE.indexOf(row.current_step);
        const toIdx = STEP_CANONICAL_SEQUENCE.indexOf(to);
        if (fromIdx >= 0 && toIdx >= 0 && toIdx <= fromIdx) {
          return rejection("PROCESS_1_FORWARD_TO_PRIOR", "Process #1",
            "Process Contract #1 violation: forward direction cannot move to a prior step.");
        }
      }
      if (kind === "sub_phase" && direction === "forward") {
        const fromIdx = SUB_PHASE_CANONICAL_SEQUENCE.indexOf(row.current_sub_phase);
        const toIdx = SUB_PHASE_CANONICAL_SEQUENCE.indexOf(to);
        if (fromIdx >= 0 && toIdx >= 0 && toIdx <= fromIdx) {
          return rejection("PROCESS_1_FORWARD_TO_PRIOR", "Process #1",
            "Process Contract #1 violation: forward direction cannot move to a prior sub-phase.");
        }
      }
      if (kind === "stage") {
        row.current_stage = to;
        row.current_step = to === STAGE.Study ? STEP.Exegesis : null;
        row.current_sub_phase = to === STAGE.Study ? SUB_PHASE.Observe : null;
      } else if (kind === "step") {
        row.current_step = to;
        row.current_sub_phase = to === STEP.Exegesis ? SUB_PHASE.Observe : null;
      } else if (kind === "sub_phase") {
        row.current_sub_phase = to;
      } else {
        return rejection("STATE_5_NONCANONICAL_TO", "State #5",
          `'to' must be a canonical Stage/Step/SubPhase value (got '${to}').`);
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
    case "load-tour-sermon": {
      const id = "tour-test-sermon";
      sermons.set(id, {
        id, title: "Tour sermon", stage: SERMON_STATUS.InProgress,
        current_stage: STAGE.Study, current_step: STEP.Exegesis, current_sub_phase: SUB_PHASE.Observe,
        outline: "[]", functional_elements: "{}", observations: "", created_at: new Date().toISOString(),
      });
      return success({ sermonId: id, created: true });
    }
    case "remove-tour-sermon": {
      for (const id of [...sermons.keys()]) if (id.startsWith("tour-")) sermons.delete(id);
      for (const id of [...series.keys()]) if (id.startsWith("tour-")) series.delete(id);
      return success();
    }
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
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-all-series":
      return [...series.values()]
        .filter((s) => !s.id.startsWith("tour-"))
        .map(shapeSeries);
    case "get-recent-sermons":
      return [...sermons.values()]
        .filter((s) => s.stage !== SERMON_STATUS.Complete && !s.id.startsWith("tour-"))
        .slice(0, payload?.limit ?? 3)
        .map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-recent-series":
      return [...series.values()]
        .filter((s) => !s.id.startsWith("tour-"))
        .slice(0, payload?.limit ?? 3)
        .map(shapeSeries);
    case "get-in-progress-sermons":
      return [...sermons.values()]
        .filter((s) => s.stage === SERMON_STATUS.InProgress && !s.id.startsWith("tour-"))
        .map((r) => shapeSermon(r, computeParentContext(r)));
    case "get-sermons-by-series":
      return [...sermons.values()]
        .filter((s) => s.series_id === payload)
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
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

export function setLegacyEvidenceCutoff(iso: string): void {
  legacyEvidenceCutoff = iso;
}

export function insertSermonRow(row: Partial<Row>): string {
  const id = row.id || randomUUID();
  sermons.set(id, {
    id, title: row.title ?? "fixture",
    stage: row.stage ?? SERMON_STATUS.InProgress,
    current_stage: row.current_stage ?? STAGE.Study,
    current_step: row.current_step ?? STEP.Exegesis,
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
