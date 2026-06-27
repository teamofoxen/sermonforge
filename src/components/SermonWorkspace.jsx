import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDebounce } from "../utils/hooks";
import { registerFlush } from "../utils/closeFlush";
import {
  getSermon, updateSermon, deleteSermon,
  getSeries, getSectionsBySeries, getSermonsBySeries,
  getAllTags,
  persistMutation, INITIAL_SAVE_STATE,
} from "../core/spine";
import { parseTags, serializeTags, dedupeTags } from "../utils/tags";
import TagInput from "./TagInput";
import { exportManuscript } from "../db/database";
import mapError from "../utils/mapError";
import { pickSermonColumns, STAGE, SERMON_STATUS, LOADING_VERB } from "../core/contracts";
import {
  deriveCurrentPositionFromSermon,
  deriveQuestionStatesFromSermon,
  deriveStudyOutcomesFromSermon,
  deriveStudyUnfinishedFromSermon,
  deriveSermonCompleteness,
  serializePosition,
  hasSeenThreshold,
  nextThresholdsSeen,
  THRESHOLD_ID,
  fieldOverviewThresholdId,
  STAGE_SUBPHASE_TO_COLUMN,
} from "../utils/sermonState";
import { firstFieldFor, findField } from "../utils/walkOrder";
import {
  parseStructuredField,
  setQuestionAnswer,
  setQuestionNA,
  setDivisionsCanvas,
  getQuestionAnswer,
} from "../utils/studyFields";
import {
  getOutline,
  serializeOutline,
  getFunctionalElements,
  serializeFunctionalElements,
  parseManuscript,
  buildManuscriptExportPayload,
} from "../utils";
import SermonWritingSurface from "./SermonWritingSurface";
import SermonFinish from "./SermonFinish";
import SermonMap from "./SermonMap";
import SermonStartLanding from "./SermonStartLanding";
import StudyAnchorHandoff from "./StudyAnchorHandoff";
import WorkspaceNotebookDrawer from "./WorkspaceNotebookDrawer";
import FeedbackFlag from "./FeedbackFlag";
import PassagePopup from "./PassagePopup";
import DeleteButton from "./DeleteButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import BackButton from "./primitives/BackButton";
import { TextButton } from "./primitives/TextButton";

// Stage → notebook JSON column. Pre-restructure column names preserved:
// notebook_blueprint serves the Assembly stage; the column was named
// before the workspace restructure but is the canonical store for
// Assembly notes.
const NOTEBOOK_COLUMN_BY_STAGE = Object.freeze({
  Study: "notebook_study",
  Assembly: "notebook_blueprint",
  Manuscript: "notebook_manuscript",
});

// _fixtureSermon — Phase D2 fixture seam. When set, SermonWorkspace skips
// getSermon and uses the prop value directly. Used only by
// SermonWorkspaceFixture for preview verification across multiple sermon
// shapes (empty / populated / at-handoff). Never set in production; the
// underscore prefix marks it fixture-only. Writes are also skipped in
// fixture mode (no real disk to persist to).
export default function SermonWorkspace({
  sermonId,
  onClose,
  onOpenSermon,
  navHint,
  _fixtureSermon,
}) {
  const [sermon, setSermon] = useState(_fixtureSermon ?? null);
  const [loading, setLoading] = useState(!_fixtureSermon);
  const [showPassage, setShowPassage] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [editingPassage, setEditingPassage] = useState(false);
  const [passageDraft, setPassageDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [saveState, setSaveState] = useState(INITIAL_SAVE_STATE);
  const { saving, saveError, lastSavedAt } = saveState;
  const [siblingIds, setSiblingIds] = useState([]);
  // The pastor's existing topic tags across all sermons — the own-tag
  // autocomplete source for this sermon's TagInput (Coverage Initiative,
  // Phase 3). Loaded once on mount; empty in fixture mode (no disk).
  const [allTags, setAllTags] = useState([]);
  const [mapOpen, setMapOpen] = useState(false);
  // Origin position a "door" jump came from (e.g. clicking "Lay out the
  // passage's structure" from a synthesis table). Set on a door jump, surfaced
  // as the writing surface's return banner, and cleared the moment the pastor
  // navigates any other way (chevron / map / handoff / finish) — so a stale
  // return link never lingers once they've moved on. Session-local, never
  // persisted: it's wayfinding for the current detour, not sermon state.
  const [returnTo, setReturnTo] = useState(null);
  // Question the last map jump targeted — the writing surface scrolls to it
  // and flashes it once, then clears this via onHighlightDone.
  const [jumpHighlight, setJumpHighlight] = useState(null);
  // Threshold screen re-summoned from the map's "Read again" row. Plain
  // local state, never thresholds_seen — re-reading is view-only (Process
  // #3: dismissal ends the interruption, not the access).
  const [rereadThreshold, setRereadThreshold] = useState(null);
  const [notebookOpen, setNotebookOpen] = useState(false);
  // Finish threshold — plain React state, deliberately NOT thresholds_seen:
  // the completion screen is re-openable forever (Process #3: dismissal ends
  // the interruption, not the access).
  const [finishOpen, setFinishOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState(null);
  // Anchor captured at click time so the main PassagePopup opens directly
  // below the workspace passage box rather than at the CSS-default top-right.
  const [popupAnchor, setPopupAnchor] = useState(null);
  const sermonRef = useRef(_fixtureSermon ?? null);
  const passageBoxRef = useRef(null);
  // Search-result navigation hint, captured once at mount (App clears the
  // source state on open and on close; the ref guards against re-applying
  // on a re-run of the load effect).
  const navHintRef = useRef(navHint);

  // Sermon load (skipped in fixture mode). The cancelled flag matters
  // twice: StrictMode double-invokes this effect in dev (two racing
  // load() chains — without the flag, whichever resolves second clobbers
  // the hint-rewritten position with the raw DB row), and a fast
  // sermonId change must not let a stale load commit over the new one.
  useEffect(() => {
    if (_fixtureSermon) {
      // sermonRef was already initialized to the fixture in useRef. Do NOT
      // reassign it here: child effects run before this parent effect, so a
      // mount-time child write through handleUpdate would be silently
      // clobbered back to the pristine fixture, desyncing ref from state.
      return undefined;
    }
    let cancelled = false;
    async function load() {
      try {
        const data = await getSermon(sermonId);
        if (cancelled) return;
        if (!data) {
          setLoading(false);
          return;
        }
        const [series, sections, siblings] = await Promise.all([
          data.series_id
            ? getSeries(data.series_id).catch((e) => { console.error("Series fetch failed:", e); return null; })
            : Promise.resolve(null),
          data.series_id && data.section_id
            ? getSectionsBySeries(data.series_id).catch((e) => { console.error("Sections fetch failed:", e); return []; })
            : Promise.resolve([]),
          data.series_id
            ? getSermonsBySeries(data.series_id).catch((e) => { console.error("Siblings fetch failed:", e); return []; })
            : Promise.resolve([]),
        ]);
        if (cancelled) return;
        data.series  = series ?? null;
        data.section = data.section_id ? (sections.find((s) => s.id === data.section_id) ?? null) : null;
        // Search-result landing: a navHint (built by searchHints.js from
        // the matched column) overrides the landing position once, so the
        // pastor lands where the snippet promised instead of wherever he
        // last edited. Applied to the loaded object BEFORE setSermon so
        // the surface mounts directly at the hinted field with no flash.
        //
        // Notebook hints deliberately DON'T touch the position: the
        // matched content is the notebook, and the drawer opens on the
        // hinted stage regardless — rewriting last_touched_position would
        // trade the pastor's real resume point for a stage's first field
        // he never touched.
        const hint = navHintRef.current;
        let hintLanded = false;
        if (hint) {
          navHintRef.current = null; // one application per mount
          if (hint.openNotebook) {
            setNotebookStage(hint.stage ?? null);
            setNotebookOpen(true);
          } else if (hint.stage) {
            const target = firstFieldFor(hint.stage, hint.subPhase);
            if (target) {
              data.last_touched_position = serializePosition({
                stage: target.stage,
                subPhase: target.subPhase,
                fieldKey: target.key,
              });
              hintLanded = true;
            }
          }
        }
        setSermon(data);
        sermonRef.current = data;
        // Persist the hinted position so a plain close-and-reopen lands in
        // the same place the search sent him. Only when a target actually
        // resolved — an unresolved hint must not echo-write the whole row.
        if (hintLanded) debouncedSave();
        setSiblingIds(Array.isArray(siblings) ? siblings.map((s) => s.id) : []);
      } catch (e) {
        console.error("SermonWorkspace load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [sermonId, _fixtureSermon]);

  // Load the pastor's existing tags once for the autocomplete (skipped in
  // fixture mode — no disk). Best-effort: a failure just means no suggestions.
  useEffect(() => {
    if (_fixtureSermon) return;
    let cancelled = false;
    getAllTags()
      .then((t) => { if (!cancelled) setAllTags(Array.isArray(t) ? t : []); })
      .catch((e) => console.error("SermonWorkspace tag load error:", e));
    return () => { cancelled = true; };
  }, [_fixtureSermon]);

  const persistUpdate = useCallback(
    async () => {
      const data = sermonRef.current;
      if (!data) return;
      if (_fixtureSermon) return; // fixture mode — no writes
      const payload = pickSermonColumns(data);
      if (!payload || Object.keys(payload).length === 0) return;
      await persistMutation(setSaveState, async () => {
        await updateSermon(sermonId, payload);
      });
    },
    [sermonId, _fixtureSermon]
  );

  const debouncedSave = useDebounce(persistUpdate, 800);

  // Flush pending debounced save on unmount.
  useEffect(() => {
    return () => { persistUpdate(); };
  }, [persistUpdate]);

  // Register with the close-flush registry while mounted, so window close /
  // app quit / reload flush the 800ms debounce window instead of dropping it
  // (src/utils/closeFlush.js; asked by main via "app-flush-edits").
  // persistUpdate reads sermonRef.current, so one call persists everything
  // pending regardless of debounce timer state. registerFlush returns the
  // unregister function — used directly as the effect cleanup.
  useEffect(() => registerFlush(persistUpdate), [persistUpdate]);

  // handleUpdate — applies field changes to sermonRef + setSermon, then
  // queues a debounced save. Used by every UI write path (writing-surface
  // answer change, canvas change, per-unit column change, threshold
  // dismissal, position write).
  const handleUpdate = useCallback((fields) => {
    const merged = { ...sermonRef.current, ...fields };
    sermonRef.current = merged;
    setSermon(merged);
    debouncedSave();
  }, [debouncedSave]);

  // Topic tags — sermon-level, optional, AI-free (Coverage Initiative, Phase 3).
  // Persist through the same autosave path as every other field, then fold any
  // new tags into the live autocomplete source so they're reusable immediately.
  const handleTagsChange = useCallback((nextTags) => {
    handleUpdate({ tags: serializeTags(nextTags) });
    setAllTags((prev) => dedupeTags([...prev, ...nextTags]).sort((a, b) => a.localeCompare(b)));
  }, [handleUpdate]);

  // Passage edit — small inline editor next to the topbar passage ref.
  // Commits via handleUpdate so the existing autosave path persists the
  // new reference; useEsvPassage re-fetches when sermon.passage changes,
  // so the writing-surface passage column + PassagePopup refresh on save.
  // Empty/whitespace input is treated as cancel so a user can't accidentally
  // clear the affordance by hitting Enter on an empty field.
  const startEditPassage = useCallback(() => {
    setPassageDraft(sermonRef.current?.passage || "");
    setEditingPassage(true);
  }, []);
  const commitPassageEdit = useCallback(() => {
    const next = passageDraft.trim();
    const current = sermonRef.current?.passage || "";
    if (next && next !== current) handleUpdate({ passage: next });
    setEditingPassage(false);
  }, [passageDraft, handleUpdate]);
  const cancelPassageEdit = useCallback(() => {
    setEditingPassage(false);
  }, []);

  // Title edit — mirrors the passage pattern. The title was previously
  // writable only at creation and then frozen while the passage beside it
  // was editable. State #3 (as amended): a sermon can never become
  // nameless from the UI, and the refusal is SPOKEN — an explicit
  // Enter-with-empty keeps the editor open and says so (titleRefused
  // drives the placeholder); blur-with-empty reverts to the existing
  // title, which is itself visible feedback. Persistence rides
  // handleUpdate → update-sermon, which re-indexes search on every write.
  const [titleRefused, setTitleRefused] = useState(false);
  const startEditTitle = useCallback(() => {
    setTitleDraft(sermonRef.current?.title || "");
    setTitleRefused(false);
    setEditingTitle(true);
  }, []);
  const commitTitleEdit = useCallback((explicit = false) => {
    const next = titleDraft.trim();
    const current = sermonRef.current?.title || "";
    if (!next && explicit) {
      // Spoken refusal: stay in the editor, name what's missing.
      setTitleRefused(true);
      return;
    }
    if (next && next !== current) handleUpdate({ title: next });
    setEditingTitle(false);
  }, [titleDraft, handleUpdate]);
  const cancelTitleEdit = useCallback(() => {
    setEditingTitle(false);
  }, []);

  // Popup anchoring — the PassagePopup opens at the position captured from
  // the passage box's bounding rect at click time, so it lands directly
  // below the trigger rather than at the CSS-default top-right. The popup
  // is then draggable from there.
  const openMainPassagePopup = useCallback(() => {
    const el = passageBoxRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPopupAnchor({ left: Math.round(r.left), top: Math.round(r.bottom + 8) });
    }
    setShowPassage(true);
  }, []);

  // beforePositionChange — async; flushes any pending debounced save
  // BEFORE the position settles. The chain is: position-change trigger
  // (chevron / map jump / unmet-state door / handoff jump / required-
  // outcome go-write-it) → await beforePositionChange → write the new
  // position → handleUpdate writes last_touched_position. The flush
  // guarantees draft persistence on jump (spec open question 3).
  const beforePositionChange = useCallback(async () => {
    await persistUpdate();
  }, [persistUpdate]);

  // The three walk-spanning derivations parse every JSON column on every
  // call (~205 JSON.parse calls per render at the populated fixture).
  // useMemo keyed on [sermon] keeps them off the hot path for re-renders
  // driven by non-sermon state (saveState transitions, map open/close,
  // notebook open/close, passage popup toggle). Keystrokes still
  // re-derive because handleUpdate writes a new sermon ref each keystroke.
  // Declared above the loading / not-found early returns so the hook
  // order stays stable across renders (rules-of-hooks). Each helper
  // tolerates a null sermon (returns {}, [], [] respectively) so the
  // pre-load render is safe.
  const questionStates = useMemo(() => deriveQuestionStatesFromSermon(sermon), [sermon]);
  const studyOutcomes = useMemo(() => deriveStudyOutcomesFromSermon(sermon), [sermon]);
  const studyUnfinished = useMemo(() => deriveStudyUnfinishedFromSermon(sermon), [sermon]);
  // Gated on finishOpen: this derivation parses ~6 JSON columns and the
  // finish screen is closed during normal typing — no reason to pay that on
  // every keystroke. SermonFinish only renders while finishOpen, so the null
  // never reaches it.
  const completeness = useMemo(
    () => (finishOpen ? deriveSermonCompleteness(sermon) : null),
    [finishOpen, sermon]
  );

  // ── Write paths ────────────────────────────────────────────────────
  // Each handler routes through handleUpdate so save-state, debounce,
  // and persistUpdate work uniformly across every write. Wrapped in
  // useCallback above the loading / not-found early returns so the
  // hook order stays stable AND children receive a stable reference
  // across renders that don't change the handler's deps. Each handler
  // is null-safe — the UI mounting them only renders once sermon loads,
  // so a sermon-null invocation is not a real call path, but guards
  // keep the contract honest.

  const writePositionAndThresholds = useCallback((next, extraFields = {}, { suppressTeachingSeen = false } = {}) => {
    const fields = {
      last_touched_position: serializePosition(next),
      ...extraFields,
    };
    // Leaving a field whose teaching block is still auto-open ends the
    // first visit — mark it seen in the same write. Parent-side on purpose:
    // a child unmount-cleanup would also fire on StrictMode's simulated
    // remount (dev) and on workspace close, and the ratified semantics say
    // quitting mid-read does NOT count as seen — only collapse (the child's
    // trigger) or moving to another field (this one). Same-field jumps
    // (map click on the current field) are not "leaving," and callers whose
    // jump leaves a field the pastor never actually saw (the handoff overlay
    // covers the surface from arrival) suppress the mark. Everything reads
    // from sermonRef at call time so no closure can go stale.
    const cur = sermonRef.current;
    if (cur && !suppressTeachingSeen) {
      const pos = deriveCurrentPositionFromSermon(cur);
      const overview = findField(pos.stage, pos.subPhase, pos.fieldKey)?.overview;
      const hasTeaching = !!(overview && Array.isArray(overview.paragraphs) && overview.paragraphs.length > 0);
      const curId = fieldOverviewThresholdId(pos.stage, pos.subPhase, pos.fieldKey);
      const nextId = fieldOverviewThresholdId(next.stage, next.subPhase, next.fieldKey);
      if (hasTeaching && nextId !== curId && !hasSeenThreshold(cur, curId)) {
        // Fold the mark into any caller-supplied thresholds_seen instead of
        // replacing it — a latent lost-update otherwise (no caller passes
        // one today, but the extraFields signature invites it).
        const base = "thresholds_seen" in fields ? { thresholds_seen: fields.thresholds_seen } : cur;
        fields.thresholds_seen = nextThresholdsSeen(base, curId);
      }
    }
    handleUpdate(fields);
  }, [handleUpdate]);

  const handlePositionChange = useCallback(async (next) => {
    await beforePositionChange();
    setReturnTo(null); // ordinary navigation — any pending door-return is stale
    writePositionAndThresholds(next);
  }, [beforePositionChange, writePositionAndThresholds]);

  // A door jump records where the pastor came from so the writing surface can
  // offer a return. The doors used to be one-way (the gap the pastor reported:
  // their copy says "come back" but nothing brought you back).
  const handleDoorJump = useCallback(async (next, origin) => {
    await beforePositionChange();
    setReturnTo(origin);
    writePositionAndThresholds(next);
  }, [beforePositionChange, writePositionAndThresholds]);

  // Return banner click — jump back to the stashed origin and consume it.
  const handleReturn = useCallback(async () => {
    const dest = returnTo;
    if (!dest) return;
    await beforePositionChange();
    setReturnTo(null);
    writePositionAndThresholds(dest);
  }, [returnTo, beforePositionChange, writePositionAndThresholds]);

  const handleAnswerChange = useCallback((fieldKey, questionKey, envelope) => {
    if (!sermon) return;
    const pos = deriveCurrentPositionFromSermon(sermon);
    const col = STAGE_SUBPHASE_TO_COLUMN[`${pos.stage}/${pos.subPhase}`];
    if (!col) return;
    const parsed = parseStructuredField(sermon[col]);
    let next = setQuestionAnswer(parsed, fieldKey, questionKey, envelope?.value ?? "");
    // N/A allowlist (UX-overhaul Gate-0 ruling, 2026-06-10): only questions
    // that declare naAllowed may carry na:true — exactly
    // intro.redemptive_note and mps.gospel_check. The two-question scope
    // matches SADI for the anchor fields; for Study it CONFLICTS with
    // SFDI's broader N/A escape valve — that conflict is surfaced in the
    // SFDI doc's pending-ruling banner (2026-06-10), not silently resolved
    // here. The UI hides the toggle everywhere else; this write-path guard
    // means no future caller can set a forbidden flag either (an N/A'd
    // mpt/mps tighten would silently blank the flat columns the Word
    // export reads). Clearing na is always allowed.
    let na = envelope?.na === true;
    if (na) {
      const fieldDef = findField(pos.stage, pos.subPhase, fieldKey);
      const question = fieldDef?.questions?.find((q) => q.key === questionKey);
      if (!question?.naAllowed) na = false;
    }
    next = setQuestionNA(next, fieldKey, questionKey, na);
    const fields = { [col]: JSON.stringify(next) };
    // Keep the legacy flat mpt/mps columns in sync with the v19 main_point_pair
    // envelope. The Word manuscript export reads sermon.mpt / sermon.mps (the
    // tightened single sentences); without this mirror those columns stay ''
    // forever, so a completed sermon exports with stale or missing Main Points.
    // This replaces StudyTab.updateMPP, deleted in the trail-deletion sweep
    // (Phase E) and never re-wired. The tightened answer is the canonical flat
    // value (the named outcome); a not-yet-tightened MPT/MPS stays '').
    if (col === "main_point_pair") {
      fields.mpt = String(getQuestionAnswer(next, "mpt", "tighten") ?? "");
      fields.mps = String(getQuestionAnswer(next, "mps", "tighten") ?? "");
    }
    handleUpdate(fields);
  }, [sermon, handleUpdate]);

  const handleUnitColumnChange = useCallback((_questionKey, unitIdx, columnKey, value) => {
    // Per-unit cumulative columns write into observations.divisions.
    // thought_units — the canonical cross-phase array. The writing
    // surface doesn't care which phase's column is being updated; the
    // array IS the storage.
    if (!sermon) return;
    const parsed = parseStructuredField(sermon.observations);
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
  }, [sermon, handleUpdate]);

  const handleCanvasChange = useCallback((_fieldKey, _questionKey, rows) => {
    // setDivisionsCanvas writes both canvas + the derived thought_units
    // array atomically (single canonical write path per ruling 8).
    if (!sermon) return;
    const parsed = parseStructuredField(sermon.observations);
    const next = setDivisionsCanvas(parsed, rows);
    handleUpdate({ observations: JSON.stringify(next) });
  }, [sermon, handleUpdate]);

  // ── Assembly/Outline, Assembly/Equip, Manuscript write paths ──────────
  // These three stages don't use the question-envelope shape. They write the
  // native `outline` / `functional_elements` / `manuscript` JSON columns the
  // Word export already reads — one source of truth, no MPT/MPS-style desync.
  const handleOutlineChange = useCallback((nextPoints) => {
    if (!sermon) return;
    handleUpdate({ outline: serializeOutline(nextPoints) });
  }, [sermon, handleUpdate]);

  const handleFunctionalElementChange = useCallback((pointId, key, value) => {
    if (!sermon) return;
    const fes = getFunctionalElements(sermon);
    const next = { ...fes, [pointId]: { ...(fes[pointId] || {}), [key]: value } };
    handleUpdate({ functional_elements: serializeFunctionalElements(next) });
  }, [sermon, handleUpdate]);

  const handleManuscriptChange = useCallback((section, key, value) => {
    if (!sermon) return;
    const ms = parseManuscript(sermon.manuscript);
    const next = { ...ms, [section]: { ...(ms[section] || {}), [key]: value } };
    handleUpdate({ manuscript: JSON.stringify(next) });
  }, [sermon, handleUpdate]);

  const dismissThreshold = useCallback((id) => {
    if (!sermon) return;
    handleUpdate({ thresholds_seen: nextThresholdsSeen(sermon, id) });
  }, [sermon, handleUpdate]);

  // Which notebook the drawer is viewing. null = follow the current
  // position's stage (the default on open); a value means the pastor
  // switched tabs inside the drawer.
  const [notebookStage, setNotebookStage] = useState(null);

  const handleNotebookChange = useCallback((value) => {
    if (!sermon) return;
    const stage = notebookStage ?? deriveCurrentPositionFromSermon(sermon).stage;
    const col = NOTEBOOK_COLUMN_BY_STAGE[stage] ?? "notebook_study";
    handleUpdate({ [col]: value });
  }, [sermon, notebookStage, handleUpdate]);

  // Map jump and handoff jump both share the pattern: flush, write
  // position, optionally mark a threshold seen, close any overlay.
  // The map passes the full question entry; position serialization only
  // reads stage/subPhase/fieldKey, and questionKey drives the landing flash.
  const handleMapJump = useCallback(async (next) => {
    await beforePositionChange();
    setReturnTo(null); // navigated via the map — any pending door-return is stale
    writePositionAndThresholds(next);
    setJumpHighlight(next.questionKey ?? null);
    setMapOpen(false);
  }, [beforePositionChange, writePositionAndThresholds]);

  // Stable identity — the writing surface's flash effect depends on this;
  // an inline closure would restart the flash on every workspace render.
  const clearJumpHighlight = useCallback(() => setJumpHighlight(null), []);

  // Handoff "go write it" jumps deliberately do NOT consume the threshold:
  // the pastor left to fix a Study outcome, not to dismiss the screen, so
  // the handoff returns on their next Anchor entry. Only the explicit Close
  // marks it seen. (T9, 2026-06-10 — previously a jump consumed it and the
  // screen could never be read through.)
  //
  // The REAL handoff (not re-read) covers the writing surface from the
  // moment the position lands, so a field teaching that auto-opened under
  // it was never visible — jumping away must not consume the first-visit
  // auto-open (same spirit as quit-mid-read). Re-read mode had a visible
  // surface underneath; normal marking applies.
  const handleHandoffJump = useCallback(async (next) => {
    if (!sermon) return;
    await beforePositionChange();
    setReturnTo(null); // left via the handoff — any pending door-return is stale
    writePositionAndThresholds(next, {}, {
      suppressTeachingSeen: rereadThreshold !== THRESHOLD_ID.StudyToAnchorHandoff,
    });
    setRereadThreshold(null);
  }, [sermon, beforePositionChange, writePositionAndThresholds, rereadThreshold]);

  // Export to Word — shared by the topbar button and the finish screen.
  // Flushes the debounce first so the document carries the last keystrokes,
  // then builds the payload from sermonRef (always the freshest state).
  const handleExport = useCallback(async () => {
    if (exporting || _fixtureSermon) return;
    setExporting(true);
    setExportNote(null);
    try {
      await persistUpdate();
      const result = await exportManuscript(buildManuscriptExportPayload(sermonRef.current));
      if (result?.success) {
        setExportNote(
          result.opened === false
            ? "Saved to Documents › SermonForge › exports › Manuscripts."
            : "Opened in Word — saved to Documents › SermonForge › exports › Manuscripts."
        );
      } else {
        // result.error is authored plain English in the export handler.
        setExportNote(result?.error || mapError("", "export"));
      }
    } catch (e) {
      setExportNote(mapError(e, "export"));
    } finally {
      setExporting(false);
    }
  }, [exporting, _fixtureSermon, persistUpdate]);

  // Mark as preached — the sermon's lifecycle event, offered where the work
  // actually ends (the finish screen) instead of only on a faraway list.
  const handleMarkPreached = useCallback(() => {
    if (!sermon) return;
    handleUpdate({ stage: SERMON_STATUS.Complete });
  }, [sermon, handleUpdate]);

  // Finish-screen jump — same flush-then-move shape as the map jump; closes
  // the finish screen so the pastor lands on the field they chose.
  const handleFinishJump = useCallback(async (next) => {
    await beforePositionChange();
    setReturnTo(null); // jumped from the finish screen — pending door-return is stale
    writePositionAndThresholds(next);
    setFinishOpen(false);
  }, [beforePositionChange, writePositionAndThresholds]);

  async function handleDelete() {
    await deleteSermon(sermonId);
    onClose();
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading sermon…</div>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div>
          <p style={{ color: "var(--ink-ghost)" }}>Sermon not found.</p>
          <BackButton onClick={onClose} />
        </div>
      </div>
    );
  }

  // Position derivation — reads last_touched_position. A search-result
  // navHint was already applied in the load effect (it rewrites
  // last_touched_position on the loaded object before setSermon), so by
  // the time this runs there is exactly one position mechanism.
  const position = deriveCurrentPositionFromSermon(sermon);

  // Field-teaching first visit: the authored overview auto-opens once per
  // field per sermon, then collapses behind "About this field" forever
  // after. Seen-marking rides the canonical thresholds mechanism, fed from
  // two ends: the surface fires onTeachingSeen when the pastor collapses
  // the auto-opened block; writePositionAndThresholds marks it when he
  // moves to another field. Quitting the workspace mid-read marks nothing.
  const teachingId = fieldOverviewThresholdId(position.stage, position.subPhase, position.fieldKey);
  const teachingAutoOpen = !hasSeenThreshold(sermon, teachingId);

  // Reference-pane substrate. MPT/MPS read from the v19 envelope's tighten
  // answers (the live write target), never the flat columns. Outcomes are
  // the same derivation the handoff overlay renders.
  const mainPointPair = parseStructuredField(sermon.main_point_pair);
  const reference = {
    passage: sermon.passage || "",
    outcomes: studyOutcomes,
    mpt: String(getQuestionAnswer(mainPointPair, "mpt", "tighten") ?? "").trim(),
    mps: String(getQuestionAnswer(mainPointPair, "mps", "tighten") ?? "").trim(),
  };

  // Field-level answer access for the writing surface — extract
  // fieldAnswers for the current position's field from the sermon's
  // JSON column.
  const currentCol = STAGE_SUBPHASE_TO_COLUMN[`${position.stage}/${position.subPhase}`];
  const currentFieldData = currentCol ? parseStructuredField(sermon[currentCol]) : {};
  const fieldAnswers = currentFieldData[position.fieldKey] ?? {};

  // Thought units for cumulative-synthesis-table consumption.
  const observationsData = parseStructuredField(sermon.observations);
  const thoughtUnits = observationsData?.divisions?.thought_units?.value ?? [];

  // Native-column data for the Outline / Equip / Manuscript editors. Cheap to
  // parse (these columns are small); only consumed when on those stages.
  const outlinePoints = getOutline(sermon);
  const functionalElements = getFunctionalElements(sermon);
  const manuscript = parseManuscript(sermon.manuscript);

  // Threshold flags. Sermon-start fires when its id is NOT in
  // thresholds_seen. Study→Anchor handoff fires when the preacher has
  // landed on the first Anchor field, sermon-start has been seen, and
  // the handoff itself has not been seen.
  const showSermonStart = !hasSeenThreshold(sermon, THRESHOLD_ID.SermonStart);
  const showHandoff =
    !showSermonStart &&
    position.stage === STAGE.Assembly &&
    position.subPhase === "Anchor" &&
    !hasSeenThreshold(sermon, THRESHOLD_ID.StudyToAnchorHandoff);
  // Re-read mode — summoned from the map header, closes back to the work
  // without touching thresholds_seen.
  const rereadingStart = rereadThreshold === THRESHOLD_ID.SermonStart;
  const rereadingHandoff = rereadThreshold === THRESHOLD_ID.StudyToAnchorHandoff;

  // Notebook column + value derived from the current stage. The handler
  // (handleNotebookChange) lives above with the other useCallbacks and
  // re-derives the column inside its body; here we just read for render.
  const viewedNotebookStage = notebookStage ?? position.stage;
  const notebookColumn = NOTEBOOK_COLUMN_BY_STAGE[viewedNotebookStage] ?? "notebook_study";
  const notebookValue = typeof sermon[notebookColumn] === "string" ? sermon[notebookColumn] : "";

  // Series position for the topbar.
  const seriesIdx = sermon?.series_id && siblingIds.length > 0
    ? siblingIds.indexOf(sermonId)
    : -1;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Top bar — back, series breadcrumb, passage ref, sermon title,
            save indicator, delete. Stage tabs are gone. */}
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            {/* The only top-bar nav: it LEAVES the sermon for the dashboard,
                so it names that destination (Surface Contract #5 — every
                re-entry is predictable). Previously a bare "Back", which read
                as an in-walk back and confused where it led. */}
            <BackButton
              variant="icon"
              onClick={onClose}
              title="Back to dashboard"
              className="btn-icon"
              style={{ flexShrink: 0 }}
            />
            <div className="topbar-left">
              <div className="topbar-series">
                {sermon.series_title && <span>{sermon.series_title}</span>}
                {seriesIdx >= 0 && (() => {
                  const total = siblingIds.length;
                  const pos = seriesIdx + 1;
                  const prevId = seriesIdx > 0 ? siblingIds[seriesIdx - 1] : null;
                  const nextId = seriesIdx < total - 1 ? siblingIds[seriesIdx + 1] : null;
                  const navStyle = { background: "transparent", border: "none", padding: "0 4px", cursor: "pointer", color: "var(--ink-ghost)", fontSize: "14px", lineHeight: 1 };
                  const navStyleDisabled = { ...navStyle, cursor: "default", opacity: 0.3 };
                  return (
                    <>
                      {sermon.series_title && <span> · </span>}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }} title={`Sermon ${pos} of ${total} in this series`}>
                        <IconButton style={prevId && onOpenSermon ? navStyle : navStyleDisabled} onClick={() => prevId && onOpenSermon && onOpenSermon(prevId)} disabled={!prevId || !onOpenSermon} aria-label="Previous sermon in series">‹</IconButton>
                        <span>Sermon {pos} of {total}</span>
                        <IconButton style={nextId && onOpenSermon ? navStyle : navStyleDisabled} onClick={() => nextId && onOpenSermon && onOpenSermon(nextId)} disabled={!nextId || !onOpenSermon} aria-label="Next sermon in series">›</IconButton>
                      </span>
                    </>
                  );
                })()}
              </div>
              {editingTitle ? (
                <input
                  className="topbar-title-input"
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => commitTitleEdit(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitTitleEdit(true); }
                    else if (e.key === "Escape") { e.preventDefault(); cancelTitleEdit(); }
                  }}
                  placeholder={titleRefused ? "A sermon needs a name" : "Sermon title"}
                  aria-label="Rename sermon"
                  autoFocus
                />
              ) : (
                <div className="topbar-title-row">
                  <div className="topbar-title">{sermon.title}</div>
                  <IconButton
                    className="topbar-title-edit-toggle"
                    aria-label="Rename sermon"
                    title="Rename sermon"
                    onClick={startEditTitle}
                  >
                    ✎
                  </IconButton>
                </div>
              )}
            </div>
          </div>

          <div className="topbar-right">
            {exportNote && !finishOpen && (
              <span style={{ fontSize: "12px", color: "var(--ink-ghost)", padding: "0 6px", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={exportNote}>
                {exportNote}
              </span>
            )}
            <SecondaryButton
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              title="Save this sermon as a Word document"
              style={{ fontSize: "12px" }}
            >
              {exporting ? LOADING_VERB.Exporting : "Export to Word"}
            </SecondaryButton>
            {/* These sit on the always-dark topbar — its locally-scoped
                --topbar-* tokens, never the theme ink ramp (var(--ink-ghost)
                was near-invisible here in light mode). */}
            {saving && (
              <span style={{ fontSize: "12px", color: "var(--topbar-fg-muted)", fontStyle: "italic", padding: "0 6px" }}>
                Saving…
              </span>
            )}
            {!saving && saveError && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0 6px" }}>
                <span style={{ fontSize: "12px", color: "var(--topbar-danger)" }}>Save failed</span>
                <SecondaryButton size="sm" style={{ fontSize: "12px", padding: "2px 8px" }} onClick={persistUpdate}>
                  Retry
                </SecondaryButton>
              </span>
            )}
            {!saving && !saveError && lastSavedAt && (
              <span style={{ fontSize: "12px", color: "var(--topbar-fg-muted)", padding: "0 6px" }} title={`Last saved ${new Date(lastSavedAt).toLocaleString()}`}>
                Saved
              </span>
            )}
            <DeleteButton onDelete={handleDelete} />
          </div>
        </div>

        {/* Workspace passage bar — replaces the deleted .sws-passage drawer.
            Row 1: passage box (click to popup, pencil to edit) + hint label.
            Row 2: search input for an arbitrary passage lookup. */}
        <div className="workspace-passage-bar">
          <div className="workspace-passage-row">
            {editingPassage ? (
              <input
                className="passage-ref-edit"
                type="text"
                value={passageDraft}
                onChange={(e) => setPassageDraft(e.target.value)}
                onBlur={commitPassageEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitPassageEdit(); }
                  else if (e.key === "Escape") { e.preventDefault(); cancelPassageEdit(); }
                }}
                placeholder="e.g. Romans 8:1-17"
                aria-label="Edit passage"
                autoFocus
              />
            ) : (
              <>
                {sermon.passage ? (
                  <span
                    ref={passageBoxRef}
                    className="passage-ref"
                    onClick={openMainPassagePopup}
                    title="Show ESV text"
                  >{sermon.passage}</span>
                ) : (
                  <span
                    ref={passageBoxRef}
                    className="passage-ref is-empty"
                    onClick={startEditPassage}
                    title="Set passage"
                  >Set passage</span>
                )}
                <IconButton
                  className="passage-ref-edit-toggle"
                  aria-label="Edit passage"
                  title="Edit passage"
                  onClick={startEditPassage}
                >
                  ✎
                </IconButton>
              </>
            )}
            <TextButton
              size="sm"
              className="passage-lookup-launch"
              onClick={() => setShowLookup(true)}
              title="Open a Bible window to read any passage"
            >
              📖 Look up a passage
            </TextButton>
          </div>
          {/* Topics — sermon-level tags (Coverage Initiative, Phase 3). Optional;
              browse-what-you've-preached, never a scorecard. */}
          <div className="workspace-tags-row" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
            <span
              style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-ghost)", flexShrink: 0 }}
              title="Free-form topics for this sermon — used to browse what you've preached. Optional."
            >
              Topics
            </span>
            <TagInput tags={parseTags(sermon.tags)} suggestions={allTags} onChange={handleTagsChange} />
          </div>
        </div>

        {/* Writing surface — fills the rest of the workspace. */}
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <SermonWritingSurface
            stage={position.stage}
            subPhase={position.subPhase}
            fieldKey={position.fieldKey}
            fieldAnswers={fieldAnswers}
            thoughtUnits={thoughtUnits}
            outlinePoints={outlinePoints}
            functionalElements={functionalElements}
            manuscript={manuscript}
            onAnswerChange={handleAnswerChange}
            onUnitColumnChange={handleUnitColumnChange}
            onCanvasChange={handleCanvasChange}
            onOutlineChange={handleOutlineChange}
            onFunctionalElementChange={handleFunctionalElementChange}
            onManuscriptChange={handleManuscriptChange}
            onPositionChange={handlePositionChange}
            onDoorJump={handleDoorJump}
            returnTo={returnTo}
            onReturn={handleReturn}
            beforePositionChange={beforePositionChange}
            onOpenMap={() => setMapOpen(true)}
            onOpenNotebook={() => {
              setNotebookStage(null); // open on the current stage's notebook
              setNotebookOpen(true);
            }}
            onOpenFinish={() => setFinishOpen(true)}
            highlightQuestion={jumpHighlight}
            onHighlightDone={clearJumpHighlight}
            reference={reference}
            teachingAutoOpen={teachingAutoOpen}
            onTeachingSeen={() => dismissThreshold(teachingId)}
          />
          {/* FeedbackFlag — gated on !_fixtureSermon for the same reason
              persistUpdate is: fixture interactions must not pollute real
              BTI telemetry. Same hygiene principle as "no writes in
              fixture mode" above. */}
          {!_fixtureSermon && (
            <div className="sws-feedback-flag-wrap">
              <FeedbackFlag
                surface={`writing-surface-${position.stage.toLowerCase()}`}
                sermonId={sermon?.id ?? null}
                step={`${position.stage}/${position.subPhase}/${position.fieldKey}`}
              />
            </div>
          )}
        </div>
      </div>

      {mapOpen && (
        <SermonMap
          questionStates={questionStates}
          currentPosition={position}
          onJump={handleMapJump}
          onReread={(id) => {
            setMapOpen(false);
            setRereadThreshold(id);
          }}
          onClose={() => setMapOpen(false)}
        />
      )}
      {finishOpen && (
        <SermonFinish
          completeness={completeness}
          status={sermon.stage}
          onJump={handleFinishJump}
          onExport={handleExport}
          exporting={exporting}
          exportNote={exportNote}
          onMarkPreached={handleMarkPreached}
          onClose={() => setFinishOpen(false)}
        />
      )}
      {(showSermonStart || rereadingStart) && (
        <SermonStartLanding
          onBegin={() =>
            rereadingStart
              ? setRereadThreshold(null)
              : dismissThreshold(THRESHOLD_ID.SermonStart)
          }
        />
      )}
      {(showHandoff || rereadingHandoff) && (
        <StudyAnchorHandoff
          passage={sermon.passage}
          outcomes={studyOutcomes}
          unfinished={studyUnfinished}
          onJump={handleHandoffJump}
          onClose={() =>
            rereadingHandoff
              ? setRereadThreshold(null)
              : dismissThreshold(THRESHOLD_ID.StudyToAnchorHandoff)
          }
        />
      )}
      {notebookOpen && (
        <WorkspaceNotebookDrawer
          stage={viewedNotebookStage}
          value={notebookValue}
          onChange={handleNotebookChange}
          onStageChange={setNotebookStage}
          onClose={() => setNotebookOpen(false)}
        />
      )}
      <PassagePopup
        passage={sermon?.passage}
        isOpen={showPassage}
        onClose={() => setShowPassage(false)}
        initialPosition={popupAnchor}
      />
      <PassagePopup
        browser
        isOpen={showLookup}
        onClose={() => setShowLookup(false)}
      />
    </>
  );
}
