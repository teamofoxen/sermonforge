import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDebounce } from "../utils/hooks";
import { registerFlush } from "../utils/closeFlush";
import {
  getSermon, updateSermon, deleteSermon,
  getSeries, getSectionsBySeries, getSermonsBySeries,
  persistMutation, INITIAL_SAVE_STATE,
} from "../core/spine";
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
  STAGE_SUBPHASE_TO_COLUMN,
} from "../utils/sermonState";
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
  const [editingPassage, setEditingPassage] = useState(false);
  const [passageDraft, setPassageDraft] = useState("");
  const [saveState, setSaveState] = useState(INITIAL_SAVE_STATE);
  const { saving, saveError, lastSavedAt } = saveState;
  const [siblingIds, setSiblingIds] = useState([]);
  const [mapOpen, setMapOpen] = useState(false);
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

  // Sermon load (skipped in fixture mode).
  useEffect(() => {
    if (_fixtureSermon) {
      sermonRef.current = _fixtureSermon;
      return;
    }
    async function load() {
      try {
        const data = await getSermon(sermonId);
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
        data.series  = series ?? null;
        data.section = data.section_id ? (sections.find((s) => s.id === data.section_id) ?? null) : null;
        setSermon(data);
        sermonRef.current = data;
        setSiblingIds(Array.isArray(siblings) ? siblings.map((s) => s.id) : []);
      } catch (e) {
        console.error("SermonWorkspace load error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sermonId, _fixtureSermon]);

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

  const writePositionAndThresholds = useCallback((next, extraFields = {}) => {
    handleUpdate({
      last_touched_position: serializePosition(next),
      ...extraFields,
    });
  }, [handleUpdate]);

  const handlePositionChange = useCallback(async (next) => {
    await beforePositionChange();
    writePositionAndThresholds(next);
  }, [beforePositionChange, writePositionAndThresholds]);

  const handleAnswerChange = useCallback((fieldKey, questionKey, envelope) => {
    if (!sermon) return;
    const pos = deriveCurrentPositionFromSermon(sermon);
    const col = STAGE_SUBPHASE_TO_COLUMN[`${pos.stage}/${pos.subPhase}`];
    if (!col) return;
    const parsed = parseStructuredField(sermon[col]);
    let next = setQuestionAnswer(parsed, fieldKey, questionKey, envelope?.value ?? "");
    next = setQuestionNA(next, fieldKey, questionKey, !!envelope?.na);
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
  const handleHandoffJump = useCallback(async (next) => {
    if (!sermon) return;
    await beforePositionChange();
    writePositionAndThresholds(next);
    setRereadThreshold(null);
  }, [sermon, beforePositionChange, writePositionAndThresholds]);

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

  // Position derivation. navHint overrides if it targets a stage that
  // matches the writing-surface walk; otherwise read last_touched_position.
  const position = deriveCurrentPositionFromSermon(sermon);

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
            <BackButton
              variant="icon"
              onClick={onClose}
              title="Back"
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
              <div className="topbar-title">{sermon.title}</div>
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
            {saving && (
              <span style={{ fontSize: "12px", color: "var(--ink-ghost)", fontStyle: "italic", padding: "0 6px" }}>
                Saving…
              </span>
            )}
            {!saving && saveError && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0 6px" }}>
                <span style={{ fontSize: "12px", color: "var(--crimson-soft)" }}>Save failed</span>
                <SecondaryButton size="sm" style={{ fontSize: "12px", padding: "2px 8px" }} onClick={persistUpdate}>
                  Retry
                </SecondaryButton>
              </span>
            )}
            {!saving && !saveError && lastSavedAt && (
              <span style={{ fontSize: "12px", color: "var(--ink-ghost)", padding: "0 6px" }} title={`Last saved ${new Date(lastSavedAt).toLocaleString()}`}>
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
            {sermon.passage && !editingPassage && (
              <span className="passage-bar-hint">← click to see passage</span>
            )}
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
            beforePositionChange={beforePositionChange}
            onOpenMap={() => setMapOpen(true)}
            onOpenNotebook={() => {
              setNotebookStage(null); // open on the current stage's notebook
              setNotebookOpen(true);
            }}
            onOpenFinish={() => setFinishOpen(true)}
            highlightQuestion={jumpHighlight}
            onHighlightDone={clearJumpHighlight}
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
    </>
  );
}
