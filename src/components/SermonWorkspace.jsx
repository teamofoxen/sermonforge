import { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspaceSave } from "../utils/useWorkspaceSave";
import { useWorkspaceCompletion } from "../utils/useWorkspaceCompletion";
import { useWorkspaceMutations } from "../utils/useWorkspaceMutations";
import { useWorkspaceNavigation } from "../utils/useWorkspaceNavigation";
import {
  getSermon, deleteSermon,
  getSeries, getSectionsBySeries, getSermonsBySeries,
  getAllTags,
} from "../core/spine";
import { parseTags } from "../utils/tags";
import TagInput from "./TagInput";
import { exportManuscript } from "../db/database";
import mapError from "../utils/mapError";
import { STAGE, LOADING_VERB } from "../core/contracts";
import {
  deriveCurrentPositionFromSermon,
  serializePosition,
  hasSeenThreshold,
  THRESHOLD_ID,
  fieldOverviewThresholdId,
  STAGE_SUBPHASE_TO_COLUMN,
} from "../utils/sermonState";
import { firstFieldFor } from "../utils/walkOrder";
import {
  parseStructuredField,
  getQuestionAnswer,
  getTightenedMainPoints,
  composeThoughtUnitBlocks,
} from "../utils/studyFields";
import {
  getOutline,
  getFunctionalElements,
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
import DeleteButton from "./DeleteButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import BackButton from "./primitives/BackButton";
import PassageLookup from "./PassageLookup";

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
  onDeleted,
  onOpenSermon,
  navHint,
  _fixtureSermon,
}) {
  const [sermon, setSermon] = useState(_fixtureSermon ?? null);
  const [loading, setLoading] = useState(!_fixtureSermon);
  // W4: a load failure must not read as "sermon is gone" (CORE Mutation
  // #3/#5 — failures are visible and retryable). loadNonce is bumped by the
  // Retry button to re-run the load effect below.
  const [loadError, setLoadError] = useState(false);
  const [loadNonce, setLoadNonce] = useState(0);
  const [siblingIds, setSiblingIds] = useState([]);
  // The pastor's existing topic tags across all sermons — the own-tag
  // autocomplete source for this sermon's TagInput (Coverage Initiative,
  // Phase 3). Loaded once on mount; empty in fixture mode (no disk).
  const [allTags, setAllTags] = useState([]);
  const [mapOpen, setMapOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  // Finish threshold — plain React state, deliberately NOT thresholds_seen:
  // the completion screen is re-openable forever (Process #3: dismissal ends
  // the interruption, not the access).
  const [finishOpen, setFinishOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState(null);
  const sermonRef = useRef(_fixtureSermon ?? null);
  // Search-result navigation hint, captured once at mount (App clears the
  // source state on open and on close; the ref guards against re-applying
  // on a re-run of the load effect).
  const navHintRef = useRef(navHint);

  // Persistence spine (Track D slice 1). Owns save state + every write
  // primitive; reads sermonRef.current (never the `sermon` value) so its
  // callbacks keep the identity cadence the writing surface depends on.
  const { saveState, handleUpdate, persistUpdate, debouncedSave } = useWorkspaceSave({
    sermonId,
    sermonRef,
    setSermon,
    isFixture: !!_fixtureSermon,
  });
  const { saving, saveError, saveErrorMessage, lastSavedAt } = saveState;

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
    setLoadError(false);
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
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [sermonId, _fixtureSermon, loadNonce]);

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

  // Sermon passage is set in the sermon modal and shown read-only in the
  // workspace (topbar identity for standalone sermons, and above the
  // reference-pane text). The topbar chrome carries no sermon title — but
  // since 2026-07-02 the title IS correctable inside the walk, at the
  // terminal Sermon Title field (ruled: the title is written last, with the
  // doors; handleTitleChange below). State #3 ("a sermon must have a name")
  // is satisfied at creation and can't be undone from this surface. Looking
  // up other passages is the Passage lookup's job, decoupled from the sermon.

  // Completion / read-only derivations (Track D slice 2). Pure selectors over
  // sermon state; each is gated + memoised inside the hook exactly as before.
  // Called above the loading / not-found early returns so the hook order stays
  // stable across renders (rules-of-hooks).
  const { questionStates, studyOutcomes, studyUnfinished, completeness } =
    useWorkspaceCompletion(sermon, finishOpen);

  // Field-write handlers (Track D slice 3). Every handler routes through
  // handleUpdate; names, signatures, storage columns, N/A guards, and the
  // Track-C sermonRef.current merge base are preserved exactly. handleNotebookChange
  // (notebook-drawer state) stays in the coordinator below.
  const {
    handleAnswerChange,
    handleUnitColumnChange,
    handleCanvasChange,
    handleOutlineChange,
    handleFunctionalElementChange,
    handleTitleChange,
    handleManuscriptChange,
    handleTagsChange,
    handleMarkPreached,
  } = useWorkspaceMutations({ sermon, sermonRef, handleUpdate, setAllTags });

  // Navigation + movement-write cluster (Track D slice 5). Owns position writes,
  // the six jump handlers, threshold dismissal, teaching-seen folding, and the
  // reread / return / jump state. Option A: the pure visibility reads (position,
  // showSermonStart, showHandoff, teachingId, teachingAutoOpen) stay in the shell.
  const {
    beforePositionChange,
    handlePositionChange,
    handleDoorJump,
    handleReturn,
    handleMapJump,
    handleHandoffJump,
    handleFinishJump,
    dismissThreshold,
    returnTo,
    jumpHighlight,
    clearJumpHighlight,
    rereadingStart,
    rereadingHandoff,
    setRereadThreshold,
  } = useWorkspaceNavigation({ sermon, sermonRef, handleUpdate, persistUpdate, setMapOpen, setFinishOpen });

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

  // Export to Word — shared by the topbar button and the finish screen.
  // Flushes the debounce first so the document carries the last keystrokes,
  // then builds the payload from sermonRef (always the freshest state).
  const handleExport = useCallback(async () => {
    if (exporting || _fixtureSermon) return;
    setExporting(true);
    setExportNote(null);
    try {
      // flush() (not bare persistUpdate) so the pending debounce timer is
      // CLEARED, not merely superseded — otherwise it fires ~800ms later with
      // an identical payload (a duplicate idempotent write + a spurious
      // "Saving…" flicker after export). flush runs the pending save when one
      // is queued and no-ops otherwise; the payload below still reads the
      // freshest sermonRef either way. C2 (Track C).
      await debouncedSave.flush();
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
  }, [exporting, _fixtureSermon, debouncedSave]);

  // Whole-sermon delete (audit M3). Soft delete under the hood (tombstone +
  // restoreSermon), but until now the workspace-originated path never
  // surfaced the "Deleted · Undo" affordance the list surfaces already show
  // (Dashboard's deletedIds/ResumeRow) — to the pastor the sermon just
  // vanished. onDeleted (when supplied) carries a display summary up to
  // App.jsx, which routes to the Dashboard and hands it to that same
  // deleted-row rendering. Falls back to a plain close if onDeleted isn't
  // wired (e.g. a future non-App host).
  async function handleDelete() {
    await deleteSermon(sermonId);
    if (onDeleted) {
      onDeleted({
        id: sermonId,
        title: sermon?.passage || "Untitled",
        passage: sermon?.passage || "",
      });
    } else {
      onClose();
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading sermon…</div>
      </div>
    );
  }

  // W4: distinguish a load failure (retryable, sermon likely still on disk)
  // from a genuinely absent id (the honest "Sermon not found." below).
  if (loadError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div>
          <p style={{ color: "var(--ink-ghost)" }}>
            Something went wrong loading this sermon. Your work is safe on disk — this is a loading problem, not a lost sermon.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <SecondaryButton onClick={() => { setLoading(true); setLoadNonce((n) => n + 1); }}>
              Retry
            </SecondaryButton>
            <BackButton onClick={onClose} />
          </div>
        </div>
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
  // the auto-opened block; the navigation hook's writePositionAndThresholds
  // marks it when he moves to another field. Quitting mid-read marks nothing.
  const teachingId = fieldOverviewThresholdId(position.stage, position.subPhase, position.fieldKey);
  const teachingAutoOpen = !hasSeenThreshold(sermon, teachingId);

  // Reference-pane substrate. MPT/MPS read from the v19 envelope's tighten
  // answers (the live write target), never the flat columns. Outcomes are
  // the same derivation the handoff overlay renders. Pastoral Context rides
  // along for the Body + doors regions (OEM ruling, item 2: the prompts
  // send the pastor to "the room you named," so the pane must show it —
  // no coordinates the screen doesn't show).
  const mainPointPair = parseStructuredField(sermon.main_point_pair);
  const implicationsData = parseStructuredField(sermon.implications);
  const pcRoom = String(getQuestionAnswer(implicationsData, "pastoral_context", "room_specifics") ?? "").trim();
  const pcCostGift = String(getQuestionAnswer(implicationsData, "pastoral_context", "cost_and_gift") ?? "").trim();
  const mainPoints = getTightenedMainPoints(mainPointPair);
  const reference = {
    passage: sermon.passage || "",
    outcomes: studyOutcomes,
    mpt: mainPoints.mpt.trim(),
    mps: mainPoints.mps.trim(),
    pastoralContext: [pcRoom, pcCostGift].filter(Boolean).join("\n\n"),
  };
  // Shared identity label — the composed passage reference, same substrate
  // as the reference pane heading above. The topbar carries no sermon title
  // (title editing lives in the walk's terminal Sermon Title field since
  // 2026-07-02, not in the chrome), so passage is the identifying text here.
  // Used for both the topbar identity display (M7, standalone sermons only)
  // and the delete confirm copy (M3).
  const passageLabel = reference.passage;

  // Field-level answer access for the writing surface — extract
  // fieldAnswers for the current position's field from the sermon's
  // JSON column.
  const currentCol = STAGE_SUBPHASE_TO_COLUMN[`${position.stage}/${position.subPhase}`];
  const currentFieldData = currentCol ? parseStructuredField(sermon[currentCol]) : {};
  const fieldAnswers = currentFieldData[position.fieldKey] ?? {};

  // Thought units for cumulative-synthesis-table consumption. A unit renders
  // as its BLOCK — the margin statement plus its indented lines, with verse
  // span (ruled 2026-07-02) — composed live from the canvas so a canvas edit
  // can never leave a stale block. Order-preserving 1:1 with the stored
  // array, so handleUnitColumnChange's index writes stay aligned; the
  // enrichment never reaches storage (that handler re-reads the raw column).
  const observationsData = parseStructuredField(sermon.observations);
  const thoughtUnits = composeThoughtUnitBlocks(
    observationsData?.divisions?.canvas?.value,
    observationsData?.divisions?.thought_units?.value ?? []
  );

  // Native-column data for the Outline / Equip / Manuscript editors. Cheap to
  // parse (these columns are small); only consumed when on those stages.
  const outlinePoints = getOutline(sermon);
  const functionalElements = getFunctionalElements(sermon);
  const manuscript = parseManuscript(sermon.manuscript);

  // Threshold flags. Sermon-start fires when its id is NOT in
  // thresholds_seen. Study→Anchor handoff fires on first (unacknowledged)
  // entry into the Anchor region — the subPhase check matches either Anchor
  // field (mpt or mps), which is intended: it orients any first arrival at
  // Anchor. Guarded by sermon-start having been seen and the handoff itself
  // not yet seen (hasSeenThreshold prevents any re-show).
  const showSermonStart = !hasSeenThreshold(sermon, THRESHOLD_ID.SermonStart);
  const showHandoff =
    !showSermonStart &&
    position.stage === STAGE.Assembly &&
    position.subPhase === "Anchor" &&
    !hasSeenThreshold(sermon, THRESHOLD_ID.StudyToAnchorHandoff);

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
        {/* Top bar — back, series breadcrumb or passage identity, save
            indicator, export, delete. The chrome carries no sermon title —
            title editing lives in the walk itself (the terminal Sermon Title
            field, ruled 2026-07-02: named last, with the doors) and must not
            return to the topbar. Stage tabs are gone. */}
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            {/* The only top-bar nav: it LEAVES the sermon for the dashboard
                (or the series planner, for a planner-opened sermon) — the
                labeled variant names that destination as visible text, not
                just a tooltip (Surface Contract #5 — every re-entry is
                predictable; audit M5). The primitive supplies "← Back"; a
                fixed "Back to dashboard" would be wrong for the
                planner-return case. */}
            <BackButton onClick={onClose} style={{ flexShrink: 0 }} />
            <div className="topbar-left">
              <div className="topbar-series">
                {/* Standalone sermons (no series) get no breadcrumb above —
                    show the passage reference here instead so the workspace
                    always names what's open (audit M7). Series sermons keep
                    the existing series-title + "Sermon N of M" breadcrumb;
                    that already names the sermon (its position in the
                    series), so the passage isn't duplicated here too. */}
                {!sermon.series_title && passageLabel && <span>{passageLabel}</span>}
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
                <span style={{ fontSize: "12px", color: "var(--topbar-danger)" }}>{saveErrorMessage || "Save failed"}</span>
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
            <DeleteButton
              onDelete={handleDelete}
              confirmLabel={
                passageLabel
                  ? `Delete this sermon on ${passageLabel}?`
                  : "Delete this sermon?"
              }
            />
          </div>
        </div>

        {/* Workspace passage bar. Row 1: the standalone Bible lookup launcher
            (decoupled from the sermon's preaching passage, which is set in the
            sermon modal). Row 2: sermon topics. */}
        <div className="workspace-passage-bar">
          <div className="workspace-passage-row">
            <PassageLookup />
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
            sermonTitle={sermon.title}
            onTitleChange={handleTitleChange}
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
          // The beholding moment (OEM item 1): the CCS statement + tightened
          // MPS rendered back read-only. Reads the same substrate the pane
          // carries — the outcome derivation and the v19 envelope.
          beholding={{
            ccs: String(studyOutcomes.find((o) => o.fieldKey === "christ_connection_statement")?.text ?? "").trim(),
            mps: reference.mps,
          }}
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
    </>
  );
}
