import { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from "../utils/hooks";
import { useTour } from "../contexts/TourContext";
import {
  getSermon, updateSermon, deleteSermon,
  getSeries, getSectionsBySeries, getSermonsBySeries,
  persistMutation, INITIAL_SAVE_STATE,
} from "../core/spine";
import { pickSermonColumns, STAGE } from "../core/contracts";
import {
  deriveCurrentPositionFromSermon,
  deriveQuestionStatesFromSermon,
  deriveStudyOutcomesFromSermon,
  deriveStudyUnfinishedFromSermon,
  serializePosition,
  hasSeenThreshold,
  nextThresholdsSeen,
  THRESHOLD_ID,
} from "../utils/sermonState";
import {
  parseStructuredField,
  setQuestionAnswer,
  setQuestionNA,
  setDivisionsCanvas,
} from "../utils/studyFields";
import SermonWritingSurface from "./SermonWritingSurface";
import SermonMap from "./SermonMap";
import SermonStartLanding from "./SermonStartLanding";
import StudyAnchorHandoff from "./StudyAnchorHandoff";
import WorkspaceNotebookDrawer from "./WorkspaceNotebookDrawer";
import { useEsvPassage } from "../utils/useEsvPassage";
import PassagePopup from "./PassagePopup";
import DeleteButton from "./DeleteButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import BackButton from "./primitives/BackButton";

// Stage + sub-phase → JSON column on the sermon record. Same mapping
// sermonState.js uses; centralizes the write side here.
const STAGE_SUBPHASE_TO_COLUMN = Object.freeze({
  "Study/Observe":           "observations",
  "Study/Interpret":         "interpretation",
  "Study/RedemptiveThread":  "redemptive_thread",
  "Study/Implications":      "implications",
  "Assembly/Anchor":         "main_point_pair",
  "Assembly/Frame":          "sermon_frame",
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
  const [saveState, setSaveState] = useState(INITIAL_SAVE_STATE);
  const { saving, saveError, lastSavedAt } = saveState;
  const [siblingIds, setSiblingIds] = useState([]);
  const [mapOpen, setMapOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const sermonRef = useRef(_fixtureSermon ?? null);

  // Tour wrapper preserved as no-op for now — tour stops have not been
  // rewired to the writing surface. Full tour cleanup goes with Phase E.
  useTour();

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

  // beforePositionChange — async; flushes any pending debounced save
  // BEFORE the position settles. The chain is: position-change trigger
  // (chevron / map jump / unmet-state door / handoff jump / required-
  // outcome go-write-it) → await beforePositionChange → write the new
  // position → handleUpdate writes last_touched_position. The flush
  // guarantees draft persistence on jump (spec open question 3).
  const beforePositionChange = useCallback(async () => {
    await persistUpdate();
  }, [persistUpdate]);

  // Passage text via the one-path ESV fetch + cache hook. Called above
  // the loading / not-found early returns so the hook order stays stable
  // across renders (rules-of-hooks). useEsvPassage handles null input.
  const { data: passageData } = useEsvPassage(sermon?.passage);
  const passageText = typeof passageData?.text === "string" ? passageData.text : "";

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
  const questionStates = deriveQuestionStatesFromSermon(sermon);
  const studyOutcomes = deriveStudyOutcomesFromSermon(sermon);
  const studyUnfinished = deriveStudyUnfinishedFromSermon(sermon);

  // Field-level answer access for the writing surface — extract
  // fieldAnswers for the current position's field from the sermon's
  // JSON column.
  const currentCol = STAGE_SUBPHASE_TO_COLUMN[`${position.stage}/${position.subPhase}`];
  const currentFieldData = currentCol ? parseStructuredField(sermon[currentCol]) : {};
  const fieldAnswers = currentFieldData[position.fieldKey] ?? {};

  // Thought units for cumulative-synthesis-table consumption.
  const observationsData = parseStructuredField(sermon.observations);
  const thoughtUnits = observationsData?.divisions?.thought_units?.value ?? [];

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

  // Writing-surface save indicator string.
  const surfaceSaveState =
    saving ? "saving…" :
    saveError ? "save failed" :
    lastSavedAt ? "saved" :
    null;

  // ── Write paths ────────────────────────────────────────────────────
  // Each handler routes through handleUpdate so save-state, debounce,
  // and persistUpdate work uniformly across every write.

  const writePositionAndThresholds = (next, extraFields = {}) => {
    handleUpdate({
      last_touched_position: serializePosition(next),
      ...extraFields,
    });
  };

  const handlePositionChange = async (next) => {
    await beforePositionChange();
    writePositionAndThresholds(next);
  };

  const handleAnswerChange = (fieldKey, questionKey, envelope) => {
    const col = STAGE_SUBPHASE_TO_COLUMN[`${position.stage}/${position.subPhase}`];
    if (!col) return;
    const parsed = parseStructuredField(sermon[col]);
    let next = setQuestionAnswer(parsed, fieldKey, questionKey, envelope?.value ?? "");
    next = setQuestionNA(next, fieldKey, questionKey, !!envelope?.na);
    handleUpdate({ [col]: JSON.stringify(next) });
  };

  const handleUnitColumnChange = (_questionKey, unitIdx, columnKey, value) => {
    // Per-unit cumulative columns write into observations.divisions.
    // thought_units — the canonical cross-phase array. The writing
    // surface doesn't care which phase's column is being updated; the
    // array IS the storage.
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
  };

  const handleCanvasChange = (_fieldKey, _questionKey, rows) => {
    // setDivisionsCanvas writes both canvas + the derived thought_units
    // array atomically (single canonical write path per ruling 8).
    const parsed = parseStructuredField(sermon.observations);
    const next = setDivisionsCanvas(parsed, rows);
    handleUpdate({ observations: JSON.stringify(next) });
  };

  const dismissThreshold = (id) => {
    handleUpdate({ thresholds_seen: nextThresholdsSeen(sermon, id) });
  };

  // Notebook column dispatch by current stage. Pre-restructure column
  // names preserved: notebook_blueprint serves the Assembly stage; the
  // column was named before the workspace restructure but is the canonical
  // store for Assembly notes.
  const NOTEBOOK_COLUMN_BY_STAGE = {
    Study: "notebook_study",
    Assembly: "notebook_blueprint",
    Manuscript: "notebook_manuscript",
  };
  const notebookColumn = NOTEBOOK_COLUMN_BY_STAGE[position.stage] ?? "notebook_study";
  const notebookValue = typeof sermon[notebookColumn] === "string" ? sermon[notebookColumn] : "";
  const handleNotebookChange = (value) => {
    handleUpdate({ [notebookColumn]: value });
  };

  // Map jump and handoff jump both share the pattern: flush, write
  // position, optionally mark a threshold seen, close any overlay.
  const handleMapJump = async (next) => {
    await beforePositionChange();
    writePositionAndThresholds(next);
    setMapOpen(false);
  };

  const handleHandoffJump = async (next) => {
    await beforePositionChange();
    writePositionAndThresholds(next, {
      thresholds_seen: nextThresholdsSeen(sermon, THRESHOLD_ID.StudyToAnchorHandoff),
    });
  };

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
                {(sermon.series_title || seriesIdx >= 0) && sermon.passage && <span> · </span>}
                {sermon.passage && (
                  <span
                    className="passage-ref"
                    onClick={() => setShowPassage((v) => !v)}
                    style={{ cursor: "pointer" }}
                    title="Show ESV text"
                  >{sermon.passage}</span>
                )}
              </div>
              <div className="topbar-title">{sermon.title}</div>
            </div>
          </div>

          <div className="topbar-right">
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

        {/* Writing surface — fills the rest of the workspace. */}
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <SermonWritingSurface
            stage={position.stage}
            subPhase={position.subPhase}
            fieldKey={position.fieldKey}
            fieldAnswers={fieldAnswers}
            thoughtUnits={thoughtUnits}
            passageRef={sermon.passage}
            passageText={passageText}
            saveState={surfaceSaveState}
            onAnswerChange={handleAnswerChange}
            onUnitColumnChange={handleUnitColumnChange}
            onCanvasChange={handleCanvasChange}
            onPositionChange={handlePositionChange}
            beforePositionChange={beforePositionChange}
            onOpenMap={() => setMapOpen(true)}
            onOpenNotebook={() => setNotebookOpen(true)}
          />
        </div>
      </div>

      {mapOpen && (
        <SermonMap
          questionStates={questionStates}
          currentPosition={position}
          onJump={handleMapJump}
          onClose={() => setMapOpen(false)}
        />
      )}
      {showSermonStart && (
        <SermonStartLanding
          onBegin={() => dismissThreshold(THRESHOLD_ID.SermonStart)}
        />
      )}
      {showHandoff && (
        <StudyAnchorHandoff
          outcomes={studyOutcomes}
          unfinished={studyUnfinished}
          onJump={handleHandoffJump}
          onClose={() => dismissThreshold(THRESHOLD_ID.StudyToAnchorHandoff)}
        />
      )}
      {notebookOpen && (
        <WorkspaceNotebookDrawer
          stage={position.stage}
          value={notebookValue}
          onChange={handleNotebookChange}
          onClose={() => setNotebookOpen(false)}
        />
      )}
      <PassagePopup
        passage={sermon?.passage}
        isOpen={showPassage}
        onClose={() => setShowPassage(false)}
      />
    </>
  );
}
