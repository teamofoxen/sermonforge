import { useCallback } from "react";
import { deriveCurrentPositionFromSermon, STAGE_SUBPHASE_TO_COLUMN } from "./sermonState";
import { findField } from "./walkOrder";
import {
  parseStructuredField,
  setQuestionAnswer,
  setQuestionNA,
  setDivisionsCanvas,
} from "./studyFields";
import {
  serializeOutline,
  getFunctionalElements,
  serializeFunctionalElements,
  parseManuscript,
} from "../utils";
import { isManuscriptNaAllowed } from "./sermonManuscriptFields";
import { serializeTags, dedupeTags } from "./tags";
import { SERMON_STATUS } from "../core/contracts";

// useWorkspaceMutations — the sermon workspace's field-write handlers, extracted
// from SermonWorkspace.jsx verbatim (Track D slice 3, behaviour-preserving).
// Every handler routes through handleUpdate so save-state, debounce, and
// persistUpdate work uniformly across every write. Names, signatures, logic,
// storage columns, N/A guards, and the Track-C sermonRef.current merge-base
// discipline are all preserved exactly.
//
// Inputs:
//   sermon       — render-time value; the three sermon-guarded handlers
//                  (outline / title / mark-preached) keep it in their dep arrays
//                  (they re-identify per keystroke exactly as before).
//   sermonRef    — freshest state; the five ref-guarded content handlers read
//                  sermonRef.current as their merge base (Track C). It is a
//                  stable ref, so listing it in deps is cadence-neutral — and it
//                  is `sermon` (the value) that must NEVER enter a ref-guarded
//                  handler's deps, or the child prop identity would churn.
//   handleUpdate — the shared merge + debounced-save primitive (from useWorkspaceSave).
//   setAllTags   — the own-tag autocomplete source setter (stable).
//
// Deliberately NOT here: dismissThreshold (writes thresholds_seen — belongs to
// the thresholds slice) and handleNotebookChange (reads the shell's notebookStage
// value + the render-shared NOTEBOOK_COLUMN_BY_STAGE const — stays with the
// notebook-drawer cluster in the coordinator).
export function useWorkspaceMutations({ sermon, sermonRef, handleUpdate, setAllTags }) {
  const handleAnswerChange = useCallback((fieldKey, questionKey, envelope) => {
    // Read the merge base from sermonRef.current (the freshest state), not the
    // render-time `sermon` closure — same discipline writePositionAndThresholds
    // uses. Two same-column writes in one React batch would otherwise both read
    // the pre-first `sermon` and the second would clobber the first's column.
    const cur = sermonRef.current;
    if (!cur) return;
    const pos = deriveCurrentPositionFromSermon(cur);
    const col = STAGE_SUBPHASE_TO_COLUMN[`${pos.stage}/${pos.subPhase}`];
    if (!col) return;
    const parsed = parseStructuredField(cur[col]);
    let next = setQuestionAnswer(parsed, fieldKey, questionKey, envelope?.value ?? "");
    // N/A allowlist (UX-overhaul Gate-0 ruling, 2026-06-10): only questions
    // that declare naAllowed may carry na:true. On the envelope columns that
    // is exactly mps.gospel_check (the door redemptive_note moved to the
    // native manuscript column in the Frame transplant, 2026-07-02 — its
    // guard lives in handleManuscriptChange). The broader Study/per-cell
    // grants were RULED 2026-06-14 (Re-Foundation exam 1) and await their
    // scheduled code build. The UI hides the toggle everywhere else; this
    // write-path guard means no future caller can set a forbidden flag
    // either (an N/A'd mpt/mps tighten would silently blank the tightened
    // sentence the Word export derives from the envelope). Clearing na is
    // always allowed.
    let na = envelope?.na === true;
    if (na) {
      const fieldDef = findField(pos.stage, pos.subPhase, fieldKey);
      const question = fieldDef?.questions?.find((q) => q.key === questionKey);
      if (!question?.naAllowed) na = false;
    }
    next = setQuestionNA(next, fieldKey, questionKey, na);
    const fields = { [col]: JSON.stringify(next) };
    // No flat mpt/mps mirror: the v19 main_point_pair envelope is the sole store
    // for the Main Points, and the Word export derives the tightened sentences
    // from it (buildManuscriptExportPayload, E2). The legacy mirror write that
    // kept sermon.mpt / sermon.mps in sync with `*.tighten` was retired here in
    // Track E3 (2026-07-03); the flat columns stay in the schema, written only
    // by the direct apply-mutation path.
    handleUpdate(fields);
  }, [handleUpdate, sermonRef]);

  const handleUnitColumnChange = useCallback((_questionKey, unitIdx, columnKey, value) => {
    // Per-unit cumulative columns write into observations.divisions.
    // thought_units — the canonical cross-phase array. The writing
    // surface doesn't care which phase's column is being updated; the
    // array IS the storage. columnKey may be a value column (meaning /
    // christ_connection / implication) or its per-cell N/A sidecar
    // (`<column>_na`) — both write generically. INVARIANT: this path has no
    // naAllowed guard because per-cell N/A is granted on EVERY cumulative-
    // table cell unconditionally (canon §5 2c) — there is no forbidden target.
    // If a non-N/A-able editable column is ever added to a cumulative table,
    // add a guard here (as handleAnswerChange / handleManuscriptChange do).
    const cur = sermonRef.current; // freshest state — see handleAnswerChange note
    if (!cur) return;
    const parsed = parseStructuredField(cur.observations);
    const existing = parsed?.divisions?.thought_units?.value;
    const units = Array.isArray(existing) ? existing.slice() : [];
    if (unitIdx < 0 || unitIdx >= units.length) return;
    units[unitIdx] = { ...units[unitIdx], [columnKey]: value };
    const next = {
      ...parsed,
      divisions: {
        ...(parsed?.divisions || {}),
        thought_units: { value: units, na: parsed?.divisions?.thought_units?.na ?? false },
      },
    };
    handleUpdate({ observations: JSON.stringify(next) });
  }, [handleUpdate, sermonRef]);

  const handleCanvasChange = useCallback((_fieldKey, _questionKey, rows) => {
    // setDivisionsCanvas writes both canvas + the derived thought_units
    // array atomically (single canonical write path per ruling 8).
    const cur = sermonRef.current; // freshest state — see handleAnswerChange note
    if (!cur) return;
    const parsed = parseStructuredField(cur.observations);
    const next = setDivisionsCanvas(parsed, rows);
    handleUpdate({ observations: JSON.stringify(next) });
  }, [handleUpdate, sermonRef]);

  // ── Assembly/Outline, Manuscript/Body, Manuscript doors write paths ───
  // These three stages don't use the question-envelope shape. They write the
  // native `outline` / `functional_elements` / `manuscript` JSON columns the
  // Word export already reads — one source of truth, no MPT/MPS-style desync.
  const handleOutlineChange = useCallback((nextPoints) => {
    if (!sermon) return;
    handleUpdate({ outline: serializeOutline(nextPoints) });
  }, [sermon, handleUpdate]);

  const handleFunctionalElementChange = useCallback((pointId, key, value) => {
    const cur = sermonRef.current; // freshest state — see handleAnswerChange note
    if (!cur) return;
    const fes = getFunctionalElements(cur);
    const next = { ...fes, [pointId]: { ...(fes[pointId] || {}), [key]: value } };
    handleUpdate({ functional_elements: serializeFunctionalElements(next) });
  }, [handleUpdate, sermonRef]);

  // Sermon Title write path (ruled 2026-07-02: the walk's terminal Title
  // field is the workspace's one title affordance — the topbar chrome still
  // carries none). State #3 guard: an empty name is never persisted; the
  // editor keeps the draft local and speaks the refusal inline, and the
  // stored name survives until a real replacement arrives.
  const handleTitleChange = useCallback((value) => {
    if (!sermon) return;
    const v = String(value ?? "").trim();
    if (!v) return;
    handleUpdate({ title: v });
  }, [sermon, handleUpdate]);

  const handleManuscriptChange = useCallback((section, key, value) => {
    const cur = sermonRef.current; // freshest state — see handleAnswerChange note
    if (!cur) return;
    // Write-path N/A guard (T19 parity for the native manuscript column):
    // "_na" sidecar keys are accepted only for door questions the field defs
    // declare naAllowed. isManuscriptNaAllowed is the single source of truth
    // (mirrors the envelope path reading question.naAllowed), so a new N/A-able
    // door is a one-line field-def edit, not a change here too.
    if (key.endsWith("_na") && !isManuscriptNaAllowed(section, key)) {
      return;
    }
    const ms = parseManuscript(cur.manuscript);
    const next = { ...ms, [section]: { ...(ms[section] || {}), [key]: value } };
    handleUpdate({ manuscript: JSON.stringify(next) });
  }, [handleUpdate, sermonRef]);

  // Topic tags — sermon-level, optional, AI-free (Coverage Initiative, Phase 3).
  // Persist through the same autosave path as every other field, then fold any
  // new tags into the live autocomplete source so they're reusable immediately.
  const handleTagsChange = useCallback((nextTags) => {
    handleUpdate({ tags: serializeTags(nextTags) });
    setAllTags((prev) => dedupeTags([...prev, ...nextTags]).sort((a, b) => a.localeCompare(b)));
  }, [handleUpdate, setAllTags]);

  // Mark as preached — the sermon's lifecycle event, offered where the work
  // actually ends (the finish screen) instead of only on a faraway list.
  const handleMarkPreached = useCallback(() => {
    if (!sermon) return;
    handleUpdate({ stage: SERMON_STATUS.Complete });
  }, [sermon, handleUpdate]);

  return {
    handleAnswerChange,
    handleUnitColumnChange,
    handleCanvasChange,
    handleOutlineChange,
    handleFunctionalElementChange,
    handleTitleChange,
    handleManuscriptChange,
    handleTagsChange,
    handleMarkPreached,
  };
}
