import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce, useFlushOnExit } from "../utils/hooks";
import { registerFlush, runRegisteredFlushes } from "../utils/closeFlush";
import { SAVE_TRANSITION, resolveSaveTransition } from "../utils/saveTransition";
import { useModalA11y } from "../utils/useModalA11y";
import {
  getSeries, updateSeries,
  getSectionsBySeries, createSection, updateSection, deleteSection,
  getSermonsBySeries, createSermon, updateSermon, deleteSermon,
  reorderSections, reorderSeriesSermons, bulkDateSermons,
} from "../core/spine";
import { getCalendarNotes, exportStudyGuide } from "../db/database";
import {
  SERIES_STATUS, SERIES_STATUS_LABELS,
  SERMON_STATUS, LOADING_VERB,
} from "../core/contracts";
import { getSeasonForDate, getUpcomingSundays, addWeek } from "../utils/churchCalendar";
import { computePacing } from "../utils/pacing";
import { computeCoverage } from "../utils/coverage";
import { buildStudyGuideModel } from "../utils/studyGuideModel";
import { GENRES, bookById, bookSpan } from "../data/canonicalBooks";
import { composePassage, refFromPassage, repointPassage } from "../utils/topicalPassage";
import { parsePassageRef } from "../utils/passageRef";
import BookSelect from "./BookSelect";
import { formatDate, autoResize, parseLocalDate } from "../utils";
import { buttonKeydown } from "../utils/buttonKeydown";
import DeleteButton from "./DeleteButton";
import InlineError from "./InlineError";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import BackButton from "./primitives/BackButton";
import TextButton from "./primitives/TextButton";
import FeedbackFlag from "./FeedbackFlag";
import UnsavedLeaveConfirm from "./UnsavedLeaveConfirm";

// ── The three screens ─────────────────────────────────────────────────────────
// The planner is a top-down way to understand the book at three levels —
// Book ▸ Section ▸ Sermon — yielding the sermon calendar, text-familiarity
// before preaching, and the study guide's raw material. A sermon is one passage,
// scheduled on one Sunday (the series→sections→sermons spine). Every level is the
// same unit: Title + range · Big idea · Overview. The four-movement workbench and
// the melodic-line model were retired in the 2026-06-24 content-model rebuild.
const PLANNER_TABS = [
  { id: "book-outline", label: "Outline" },
  { id: "schedule",    label: "Schedule" },
  { id: "study-guide", label: "Study guide" },
];
const PLANNER_TAB_IDS = PLANNER_TABS.map((t) => t.id);

// The "Biblical Category" dropdown — the 7 Dever genres (single source) plus an
// Unclassified state for legacy/never-set rows. Picking a book auto-fills it.
const CANON_OPTIONS = [
  { value: "", label: "Unclassified" },
  ...Object.entries(GENRES).map(([value, label]) => ({ value, label })),
];

// Study-guide page "additions" — pastor-authored extras stored guide-local on
// the sermon (study_guide_extras JSON). Adding a 4th type is ONE entry here.
const ADDITION_TYPES = [
  { value: "question",        label: "Question" },
  { value: "cross-reference", label: "Cross-reference" },
  { value: "quote",           label: "Quote" },
];
const ADDITION_LABEL = Object.fromEntries(ADDITION_TYPES.map((t) => [t.value, t.label]));
// Blank listener lines printed under each study-guide page by default.
const DEFAULT_NOTES_LINES = 8;

// Parse the study_guide_extras JSON column into { additions: [{id,type,text}],
// notesLines: int }. Fail-soft: null / non-string / malformed / wrong-shape all
// degrade to the empty default — never throws, never blocks.
function parseStudyGuideExtras(raw) {
  const empty = { additions: [], notesLines: DEFAULT_NOTES_LINES };
  if (!raw || typeof raw !== "string") return empty;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return empty;
    const additions = Array.isArray(obj.additions)
      ? obj.additions
          .filter((a) => a && typeof a === "object" && typeof a.text === "string")
          .map((a) => ({
            id: typeof a.id === "string" ? a.id : crypto.randomUUID(),
            type: ADDITION_LABEL[a.type] ? a.type : "question",
            text: a.text,
          }))
      : [];
    const notesLines = Number.isInteger(obj.notesLines) ? Math.max(0, Math.min(20, obj.notesLines)) : DEFAULT_NOTES_LINES;
    return { additions, notesLines };
  } catch {
    return empty;
  }
}

// Stable retry-queue key for a field write: "<target>:<sorted field names>". A
// later write to the SAME target+field supersedes a queued failure for it, so
// Retry never replays a stale value over a newer one (see runSave's failed-writes
// map). Sorted so {a,b} and {b,a} key identically.
function saveKey(target, fields) {
  return `${target}:${Object.keys(fields || {}).sort().join(",")}`;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SeriesPlanner({ seriesId, onBack, onOpenSermon, _fixture }) {
  // _fixture — preview seam (mirrors SermonWorkspace's _fixtureSermon). When set,
  // skip the spine reads and seed from the fixture so the planner renders in a
  // browser preview without Electron/SQLite. Never set in production.
  const [series, setSeries]     = useState(_fixture?.series ?? null);
  const [sections, setSections] = useState(_fixture?.sections ?? []);
  const [sermons, setSermons]   = useState(_fixture?.sermons ?? []);
  const [calNotes, setCalNotes] = useState(_fixture?.calNotes ?? []);
  const [activeTab, setActiveTab] = useState(_fixture?.activeTab ?? "book-outline");
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loading, setLoading]   = useState(!_fixture);
  const [loadError, setLoadError] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  // Outline draft state lives HERE, not inside OutlineTab, so an unfinished,
  // not-yet-titled sermon isn't wiped when the pastor switches tabs — OutlineTab
  // unmounts on tab change, but the parent stays mounted. expandedSermons rides
  // along so a draft stays open across the switch too.
  const [drafts, setDrafts] = useState([]);
  const [draftErrors, setDraftErrors] = useState({});
  const [expandedSermons, setExpandedSermons] = useState(() => new Set());
  // Failed RETRYABLE writes (idempotent field edits — updateSeries/Section/
  // Sermon), keyed by target+field, so the topbar Retry re-runs the real writes.
  // A MAP keyed by target, not a single slot and not a plain list:
  //   • a single slot lost an earlier failed edit whenever any later save
  //     succeeded (and flipped the indicator back to "Saved"), and
  //   • an unkeyed list let a stale failed write for a field survive a LATER
  //     SUCCESSFUL write to that SAME field — Retry would then replay the stale
  //     value over the newer one, silently reverting the pastor's work.
  // Keying by target means: a success for a field DROPS any queued failure for it
  // (supersession), while a failure for a DIFFERENT field is still remembered
  // (Mutation #3 — every failed edit stays visible and retryable). Structural
  // mutations (create/delete/move/bulk) are NEVER queued — re-running them would
  // duplicate a create or desync a locally-reconciled delete; they surface the
  // failure via saveError and roll back their own optimistic state.
  const failedWritesRef = useRef(new Map());

  useEffect(() => {
    if (_fixture) return; // preview fixture — no DB reads
    load();
    // Drafts / expanded state are per-series — clear them when the series changes
    // so a stale draft from a previous series can't render against this one (these
    // now live on the always-mounted parent, so they don't reset on their own).
    setDrafts([]);
    setDraftErrors({});
    setExpandedSermons(new Set());
    const saved = localStorage.getItem(`sermonforge_planner_tab_${seriesId}`);
    // A remembered id for a since-removed tab (the old book-study / design /
    // calendar / overview) must not stick — fall back to Outline.
    setActiveTab(PLANNER_TAB_IDS.includes(saved) ? saved : "book-outline");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId]);

  // Front door: the first time a given series is opened, auto-show the short
  // "How this works" orientation once (the macro analog of the sermon-start
  // landing). It stays re-readable forever via the topbar button. The seen-flag
  // is write-only localStorage (set once on first open, read on mount) — NEVER
  // a schema column, so the create-then-update INSERT is untouched.
  useEffect(() => {
    const introKey = `sermonforge_planner_intro_${seriesId}`;
    if (!localStorage.getItem(introKey)) {
      localStorage.setItem(introKey, "1");
      setShowHowItWorks(true);
    }
  }, [seriesId]);

  // Auto-suggest series complete — visibility only; the user's click on Mark
  // Series Complete is the evidence (Process #2 + the Principle).
  const committedSermons = sermons.filter((s) => !s._draft && !s.id?.startsWith?.("draft-"));
  const allChildrenComplete =
    committedSermons.length > 0 &&
    committedSermons.every((s) => s.stage === SERMON_STATUS.Complete);
  const suggestSeriesComplete =
    allChildrenComplete && series?.status !== SERIES_STATUS.Complete;

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    localStorage.setItem(`sermonforge_planner_tab_${seriesId}`, tabId);
  }

  async function load() {
    setLoadError(false);
    try {
      const [s, sects, serms, notes] = await Promise.all([
        getSeries(seriesId),
        getSectionsBySeries(seriesId),
        getSermonsBySeries(seriesId),
        getCalendarNotes(),
      ]);
      if (!s) { setLoadError(true); return; }
      setSeries(s);
      setSections(sects);
      setSermons(serms);
      setCalNotes(notes);
    } catch (e) {
      console.error("SeriesPlanner load error:", e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  // One save path for every planner write — series, section, and sermon — so the
  // topbar Saving/Saved/Save-failed indicator reflects them all and no write is
  // silent. runSave remembers the failed thunk so Retry re-runs the real write.
  const runSave = useCallback(async (doMutation, { retryable = true, key = null } = {}) => {
    if (_fixture) return true; // preview fixture — no DB writes
    setSaving(true);
    try {
      await doMutation();
      // A success for `key` SUPERSEDES any queued failure for the same target+
      // field — drop it, or Retry would replay the stale value over this newer
      // one. A success for a DIFFERENT key leaves other failures queued, so an
      // unrelated success never masks (or strands) an earlier failed edit.
      if (key) failedWritesRef.current.delete(key);
      setSaveError(failedWritesRef.current.size > 0);
      return true;
    } catch (e) {
      console.error("[SeriesPlanner save]", e);
      // Only idempotent field writes are safe for topbar Retry to replay, and
      // only keyed ones (so a re-failure REPLACES the stale thunk, never stacks).
      // Structural mutations (retryable:false) surface the error but reconcile
      // their own optimistic state; re-running them would duplicate/desync.
      if (retryable && key) failedWritesRef.current.set(key, doMutation);
      setSaveError(true);
      return false;
    } finally {
      setSaving(false);
    }
  }, [_fixture]);

  // ── Series (book-level) field persistence — debounced updateSeries ──────────
  const persistSeries = useCallback((fields) => {
    setSeries((prev) => ({ ...prev, ...fields }));
    return runSave(() => updateSeries(seriesId, fields), { key: saveKey("series", fields) });
  }, [runSave, seriesId]);
  const debouncedSeries = useDebounce(persistSeries, 800);
  useFlushOnExit(debouncedSeries);
  const lastSeriesEditField = useRef(null);

  function handleSeriesField(field, value) {
    setSeries((prev) => ({ ...prev, [field]: value }));
    // Flush a pending write for a DIFFERENT series field before starting this one
    // (same single-timer clobber the section/sermon handlers guard against — e.g.
    // the book's big idea then its overview inside 800ms). Flush BEFORE the
    // title-empty branch so clearing the title can't strand a pending big-idea write.
    if (lastSeriesEditField.current && lastSeriesEditField.current !== field) debouncedSeries.flush();
    // An empty title would be rejected by update-series (State #3) and flash a
    // transient "Save failed" each time the pastor clears it to retype. Keep the
    // local edit, but don't persist until there's a name again.
    if (field === "title" && !String(value).trim()) {
      debouncedSeries.cancel();
      lastSeriesEditField.current = null;
      return;
    }
    lastSeriesEditField.current = field;
    debouncedSeries({ [field]: value });
  }

  // Selecting a canonical book fills several fields at once, so it persists as a
  // single multi-field write. Genre is (re)filled every time (the explicit act
  // the override rule hangs on); passage_range is only pre-filled when empty.
  const handleSelectBook = useCallback((bookId) => {
    const book = bookById(bookId);
    if (!book) { persistSeries({ book_id: null }); return; }
    const fields = { book_id: book.id, canon_category: book.genre };
    if (!String(series?.passage_range || "").trim()) {
      fields.passage_range = bookSpan(book.id);
    }
    persistSeries(fields);
  }, [series?.passage_range, persistSeries]);

  // ── Section field persistence — debounced updateSection ─────────────────────
  const persistSection = useCallback((id, fields) => runSave(() => updateSection(id, fields), { key: saveKey(`section:${id}`, fields) }), [runSave]);
  const debouncedSectionSave = useDebounce(persistSection, 800);
  useFlushOnExit(debouncedSectionSave);
  const lastSectionEdit = useRef({ id: null, field: null });
  const handleSectionField = useCallback((id, fields) => {
    // Flush a pending write before starting a DIFFERENT section OR a different
    // field of the SAME section. The single debounced timer keeps only the last
    // args, so without the field check a title→overview hop inside 800ms on one
    // section would drop the title write (the cross-id check alone misses it).
    const field = Object.keys(fields)[0];
    const prev = lastSectionEdit.current;
    if (prev.id && (prev.id !== id || prev.field !== field)) debouncedSectionSave.flush();
    lastSectionEdit.current = { id, field };
    setSections((prevSecs) => prevSecs.map((s) => (s.id === id ? { ...s, ...fields } : s)));
    debouncedSectionSave(id, fields);
  }, [debouncedSectionSave]);

  // ── Sermon (sermon) field persistence — debounced + immediate paths ───────
  const persistSermon = useCallback((id, fields) => runSave(() => updateSermon(id, fields), { key: saveKey(`sermon:${id}`, fields) }), [runSave]);
  const debouncedSermonSave = useDebounce(persistSermon, 800);
  useFlushOnExit(debouncedSermonSave);
  const lastSermonEdit = useRef({ id: null, field: null });
  // Debounced edit — for keystroke fields (title, passage, big idea, overview,
  // dates). Flushes on a sermon-id OR field change so the single trailing-args
  // timer never drops an earlier field's write (e.g. title then overview on the
  // SAME sermon inside 800ms).
  const handleSermonField = useCallback((id, fields) => {
    const field = Object.keys(fields)[0];
    const prev = lastSermonEdit.current;
    if (prev.id && (prev.id !== id || prev.field !== field)) debouncedSermonSave.flush();
    lastSermonEdit.current = { id, field };
    setSermons((prevSermons) => prevSermons.map((s) => (s.id === id ? { ...s, ...fields } : s)));
    debouncedSermonSave(id, fields);
  }, [debouncedSermonSave]);
  // Immediate write — for discrete (button-driven) changes: study-guide
  // additions, notes sizing, Suggest-Sundays bulk dating.
  const persistSermonNow = useCallback((id, fields) => {
    setSermons((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)));
    return runSave(() => updateSermon(id, fields), { key: saveKey(`sermon:${id}`, fields) });
  }, [runSave]);

  // The series end_date mirrors the LAST dated sermon. Recompute it from a list
  // and persist when it moves. No `last &&` truthiness gate — clearing every date
  // must clear end_date too, not leave a phantom end date on the booklet/Arc.
  const syncSeriesEndDate = useCallback((list) => {
    const last = [...list].filter((s) => s.date).sort((a, b) => (a.date > b.date ? 1 : -1)).pop()?.date || "";
    if (last !== (series?.end_date || "")) handleSeriesField("end_date", last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series?.end_date]);
  // Reload sermons + series from DB truth — the rollback for a failed
  // planner-gesture op (Session-3: optimistic state may remain, but failure
  // must settle on what the database actually holds).
  const reloadPlannerTruth = useCallback(async () => {
    try {
      const [s, serms] = await Promise.all([getSeries(seriesId), getSermonsBySeries(seriesId)]);
      if (s) setSeries(s);
      setSermons(serms);
    } catch (e) {
      console.error("[SeriesPlanner] truth reload after failed gesture", e);
    }
  }, [seriesId]);

  // Single-source date write for the Schedule screen — the one place dates
  // live (the Outline carries none since the outlining-only rebuild). Since
  // Session 3 the visible gesture "this sermon preaches on this Sunday" is ONE
  // spine transaction (`bulk-date-sermons`, one entry): the sermon date and
  // the series end_date mirror commit together in main — no separate debounced
  // series write that could fire later or fail apart from the date. Optimistic
  // locally; the resolved mirror settles series state; failure reloads truth.
  // Keyed retryable — replaying the same date + mirror is idempotent.
  const handleSermonDate = useCallback((id, date) => {
    const nextSermons = sermons.map((s) => (s.id === id ? { ...s, date } : s));
    setSermons(nextSermons);
    const localEnd = [...nextSermons].filter((s) => s.date).sort((a, b) => (a.date > b.date ? 1 : -1)).pop()?.date || "";
    setSeries((prev) => ({ ...prev, end_date: localEnd }));
    runSave(async () => {
      const { end_date } = await bulkDateSermons(seriesId, [{ id, date }]);
      setSeries((prev) => ({ ...prev, end_date }));
    }, { key: saveKey(`sermon:${id}`, { date }) }).then((ok) => {
      if (!ok) reloadPlannerTruth();
    });
  }, [sermons, runSave, seriesId, reloadPlannerTruth]);

  // Suggest Sundays lands here from ScheduleTab: entries = [{ id, date }] for
  // every undated sermon — one gesture, one transaction in main (all dates +
  // the end_date mirror). retryable:false like the sibling structural bulks:
  // the pastor re-runs the visible gesture rather than a blind replay.
  const handleBulkDates = useCallback(async (entries) => {
    const byId = new Map(entries.map((e) => [e.id, e.date]));
    setSermons((prev) => prev.map((s) => (byId.has(s.id) ? { ...s, date: byId.get(s.id) } : s)));
    let mirrored = null;
    const ok = await runSave(async () => {
      const { end_date } = await bulkDateSermons(seriesId, entries);
      mirrored = end_date;
    }, { retryable: false });
    if (!ok) {
      await reloadPlannerTruth();
      return false;
    }
    setSeries((prev) => ({ ...prev, end_date: mirrored ?? prev.end_date }));
    return true;
  }, [runSave, seriesId, reloadPlannerTruth]);

  // Drain the failed-write queue. Each entry is an idempotent field write, safe
  // to replay; the queued key is removed before replay and re-added only if it
  // fails again — so a fresh edit to that field arriving mid-retry (which sets
  // its own key) is never clobbered. The indicator reflects only what remains.
  // useCallback (stable deps: refs + setters) so the parked-failure flusher
  // below can hold it across renders.
  const retryLastSave = useCallback(async () => {
    const pending = [...failedWritesRef.current.entries()];
    if (pending.length === 0) return;
    for (const [key] of pending) failedWritesRef.current.delete(key);
    setSaving(true);
    for (const [key, thunk] of pending) {
      try { await thunk(); }
      catch (e) { console.error("[SeriesPlanner retry]", e); failedWritesRef.current.set(key, thunk); }
    }
    setSaving(false);
    setSaveError(failedWritesRef.current.size > 0);
  }, []);

  // The three useFlushOnExit registrations above only cover writes still
  // WAITING on a debounce timer. A write whose debounce already fired and
  // FAILED is parked in failedWritesRef with no timer left — without this,
  // the global flush (runRegisteredFlushes: window close / quit / study-guide
  // export / planner Back) would report every flusher clean and proceed over
  // stale library truth. Register the parked queue as its own flusher: try it
  // once more, then report honestly — unresolved failed writes make the
  // global flush a FAILED transition (persistence-transition contract).
  useEffect(() => registerFlush(async () => {
    if (failedWritesRef.current.size === 0) return true;
    await retryLastSave();
    return failedWritesRef.current.size === 0;
  }), [retryLastSave]);

  // Deliberate exits — Back and opening a sermon into the workspace — run the
  // persistence-transition contract: flush everything (pending timers AND the
  // parked failed-write queue, via the registry) and leave only on "saved".
  // On "failed"/"unknown" the planner stays and UnsavedLeaveConfirm puts the
  // choice to the pastor; only his explicit "Leave anyway" discards. The
  // unmount flush in useFlushOnExit stays as a backstop, never the guarantee.
  const [leaveBlocked, setLeaveBlocked] = useState(null);
  const leaveInFlightRef = useRef(false);
  const requestLeave = useCallback(async (proceed) => {
    if (leaveInFlightRef.current) return; // one transition at a time
    leaveInFlightRef.current = true;
    try {
      const result = await resolveSaveTransition(async () => (await runRegisteredFlushes()).ok);
      if (result === SAVE_TRANSITION.Saved) {
        proceed();
        return;
      }
      setLeaveBlocked({ result, proceed });
    } finally {
      leaveInFlightRef.current = false;
    }
  }, []);
  const openSermonGuarded = useCallback((id) => {
    requestLeave(() => onOpenSermon(id));
  }, [requestLeave, onOpenSermon]);

  // A load failure (throw, or a series id that no longer resolves) gets its own
  // voice + Retry instead of the perpetual "Loading…" spinner.
  if (loadError && !series) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", gap: "14px",
        padding: "32px", textAlign: "center",
      }}>
        <div style={{ color: "var(--ink-soft)", fontFamily: "var(--font-serif)", fontSize: "15px", maxWidth: "420px" }}>
          This series couldn't be opened. It may have been deleted, or the save
          file was busy. You can try again or go back to your series.
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <SecondaryButton size="sm" onClick={onBack}>Back to Series</SecondaryButton>
          <PrimaryButton size="sm" onClick={() => { setLoading(true); load(); }}>Try Again</PrimaryButton>
        </div>
      </div>
    );
  }

  if (loading || !series) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>{LOADING_VERB.Loading}</div>
      </div>
    );
  }

  const activeTabLabel = (PLANNER_TABS.find((t) => t.id === activeTab) || {}).label;

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Topbar — always-dark .topbar frame, mirroring SermonWorkspace.
          Left: BackButton → series color dot → eyebrow (status · current screen)
          + serif title. Right: save indicator → Mark Series Complete → How this
          works → FeedbackFlag. */}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
          {/* Routed through requestLeave: Back leaves only when every pending
              write — debounced or parked-failed — is confirmed saved. */}
          <BackButton variant="icon" onClick={() => requestLeave(onBack)} title="Back" className="btn-icon" style={{ flexShrink: 0 }} />
          <div style={{
            width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
            background: `var(--${series.color || "gold"})`,
          }} />
          <div className="topbar-left">
            <div className="topbar-series">
              {SERIES_STATUS_LABELS[series.status] || SERIES_STATUS_LABELS[SERIES_STATUS.InProgress]}
              {activeTabLabel && <> · {activeTabLabel}</>}
            </div>
            <div className="topbar-title">{series.title}</div>
          </div>
        </div>

        <div className="topbar-right">
          {saving && (
            <span style={{ fontSize: "12px", color: "var(--topbar-fg-muted)", fontStyle: "italic", padding: "0 6px" }}>
              {LOADING_VERB.Saving}
            </span>
          )}
          {!saving && saveError && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0 6px" }}>
              <span style={{ fontSize: "12px", color: "var(--topbar-danger)" }}>Save failed</span>
              <SecondaryButton size="sm" style={{ fontSize: "12px", padding: "2px 8px" }} onClick={retryLastSave}>Retry</SecondaryButton>
            </span>
          )}
          {!saving && !saveError && (
            <span style={{ fontSize: "12px", color: "var(--topbar-fg-muted)", padding: "0 6px" }}>Saved</span>
          )}
          {series.status !== SERIES_STATUS.Complete && !suggestSeriesComplete && (
            <SecondaryButton
              size="sm"
              onClick={() => persistSeries({ status: SERIES_STATUS.Complete })}
              title="Mark this series complete"
              style={{ fontSize: "12px" }}
            >
              Mark Series Complete
            </SecondaryButton>
          )}
          <TextButton onClick={() => setShowHowItWorks(true)}>How this works</TextButton>
          <FeedbackFlag surface="series-planner" sermonId={null} step={null} />
        </div>
      </div>

      {/* Auto-suggest Mark Series Complete — fires when every committed child
          sermon has reached SERMON_STATUS.Complete. */}
      {suggestSeriesComplete && (
        <div role="status" style={{
          background: "var(--parchment-warm)", borderBottom: "1px solid var(--parchment-deep)",
          borderLeft: "3px solid var(--gold)", padding: "10px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          fontFamily: "var(--font-serif)", fontSize: "13px", color: "var(--ink-mid)",
        }}>
          <span>All sermons in this series are complete. Mark the series complete?</span>
          <PrimaryButton size="sm" onClick={() => persistSeries({ status: SERIES_STATUS.Complete })}>
            Mark Series Complete
          </PrimaryButton>
        </div>
      )}

      {/* Tab bar — the app's .stage-tabs idiom (white bar, gold active underline). */}
      <div className="stage-tabs">
        {PLANNER_TABS.map((tab) => (
          <div
            key={tab.id}
            role="button"
            tabIndex={0}
            onClick={() => handleTabChange(tab.id)}
            onKeyDown={buttonKeydown(() => handleTabChange(tab.id))}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={`stage-tab${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Tab content — the parchment body. Each tab renders its own .page-body
          scaffolding, which carries flex:1; overflow-y:auto and IS the scroll
          region. This wrapper must be a bounded column flex container so that
          engages. */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--parchment)" }}>
        {activeTab === "book-outline" && (
          <OutlineTab
            series={series}
            sections={sections}
            sermons={sermons}
            seriesId={seriesId}
            onSeriesField={handleSeriesField}
            onSelectBook={handleSelectBook}
            onSectionField={handleSectionField}
            onSermonField={handleSermonField}
            onSectionsChange={setSections}
            onSermonsChange={setSermons}
            onOpenSermon={openSermonGuarded}
            onSyncEndDate={syncSeriesEndDate}
            drafts={drafts}
            setDrafts={setDrafts}
            draftErrors={draftErrors}
            setDraftErrors={setDraftErrors}
            expandedSermons={expandedSermons}
            setExpandedSermons={setExpandedSermons}
            runSave={runSave}
          />
        )}
        {activeTab === "schedule" && (
          <ScheduleTab
            series={series}
            sermons={sermons}
            calNotes={calNotes}
            onSeriesField={handleSeriesField}
            onSermonDate={handleSermonDate}
            onBulkDates={handleBulkDates}
            onNavigate={handleTabChange}
          />
        )}
        {activeTab === "study-guide" && (
          <StudyGuideTab
            series={series}
            sections={sections}
            sermons={sermons}
            seriesId={seriesId}
            onSermonExtras={persistSermonNow}
            onNavigate={handleTabChange}
          />
        )}
      </div>
    </div>
    {showHowItWorks && <SeriesHowItWorksModal kind={series.kind} onClose={() => setShowHowItWorks(false)} />}
    {leaveBlocked && (
      <UnsavedLeaveConfirm
        result={leaveBlocked.result}
        onStay={() => setLeaveBlocked(null)}
        onLeave={() => {
          const go = leaveBlocked.proceed;
          setLeaveBlocked(null);
          go();
        }}
      />
    )}
    </>
  );
}

// ── Shared readouts ───────────────────────────────────────────────────────────

// The coverage meter — a track with a sage fill at `percent`.
function CoverageBar({ percent, animate = false }) {
  return (
    <div style={{ height: "8px", borderRadius: "4px", background: "var(--parchment-deep)", overflow: "hidden" }}>
      <div style={{
        width: `${percent}%`, height: "100%", background: "var(--sage)",
        ...(animate ? { transition: "width 200ms" } : {}),
      }} />
    </div>
  );
}

// A read-only picture of how the sermons partition the series' book: a
// proportional bar + plain notes on gaps, overlaps, out-of-order sermons, and any
// unreadable passage refs. Purely informational (src/utils/coverage.js) — never
// a gate. Clamped to the declared passage_range when it parses.
function CoveragePanel({ series, sermons, onNavigate }) {
  const cov = computeCoverage(series?.book_id, sermons, series?.passage_range);
  const book = bookById(series?.book_id);

  if (cov.noBook || !book) {
    return (
      <div style={{
        padding: "10px 14px",
        background: "var(--parchment-warm)", border: "1px dashed var(--parchment-deep)",
        borderRadius: "var(--radius)", fontSize: "12.5px", color: "var(--ink-ghost)",
      }}>
        Pick a canonical book in <strong>Book details</strong> on the{" "}
        <TextButton onClick={() => onNavigate?.("book-outline")} style={{ fontSize: "inherit", padding: 0, verticalAlign: "baseline" }}>Outline</TextButton>{" "}
        to see how your sermons cover it.
      </div>
    );
  }

  const notes = [];
  if (cov.gaps.length) notes.push({ key: "gaps", label: "Uncovered", text: cov.gaps.join(", ") });
  if (cov.overlaps.length) notes.push({ key: "overlaps", label: "Overlap", text: cov.overlaps.map((o) => `sermons ${o.a} & ${o.b}`).join(", ") });
  if (cov.outOfOrder.length) notes.push({ key: "order", label: "Out of order", text: cov.outOfOrder.map((n) => `sermon ${n}`).join(", ") });
  if (cov.unreadable.length) {
    notes.push({
      key: "unreadable", label: "Couldn't read",
      text: cov.unreadable.map((n) => {
        const p = sermons[n - 1] && sermons[n - 1].passage;
        return p ? `sermon ${n} ("${p}")` : `sermon ${n}`;
      }).join(", "),
    });
  }

  return (
    <div style={{
      padding: "12px 14px", background: "var(--white)",
      border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span className="field-label" style={{ marginBottom: 0 }}>Coverage</span>
        <span style={{ fontSize: "13px", color: "var(--ink-soft)" }}>
          {cov.percent}% of {book.name}{cov.scopeLabel ? ` ${cov.scopeLabel}` : ""}{cov.mode === "chapter" ? " (by chapter)" : ""}
        </span>
      </div>
      <CoverageBar percent={cov.percent} animate />
      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "5px" }}>
        {notes.length === 0 ? (
          <div style={{ fontSize: "12.5px", color: "var(--sage)" }}>Every verse covered exactly once, in order.</div>
        ) : notes.map((n) => (
          <div key={n.key} style={{ fontSize: "12.5px", color: "var(--ink-soft)" }}>
            <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "10.5px", marginRight: "8px", color: "var(--ink-ghost)" }}>{n.label}</span>
            {n.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// A compact, read-only mirror of the series' shape — sermon count, approximate
// weeks/months, projected end date, a neutral length band, liturgical seasons,
// and any special-date notes the run spans. Pure arithmetic (src/utils/pacing.js).
function PacingStrip({ sermons, series, calNotes }) {
  const p = computePacing({
    slotCount: sermons.length,
    startDate: series?.start_date || "",
    calNotes: calNotes || [],
  });
  if (!p.slotCount) return null;

  const parts = [
    `${p.slotCount} sermon${p.slotCount === 1 ? "" : "s"}`,
    `~${p.weeks} week${p.weeks === 1 ? "" : "s"}`,
    `~${p.months.toFixed(1)} months`,
  ];
  if (p.endDate) parts.push(`ends ~${formatPacingDate(p.endDate)}`);
  if (p.band) parts.push(p.band);
  if (p.seasons.length > 1) parts.push(`spans ${p.seasons.map((s) => s.shortName).join(" → ")}`);
  for (const n of p.crossedNotes) parts.push(`crosses "${n.label}"`);

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px",
      padding: "9px 14px", marginBottom: "16px",
      background: "var(--parchment-warm)", border: "1px solid var(--parchment-deep)",
      borderRadius: "var(--radius)", fontSize: "12.5px", color: "var(--ink-soft)",
    }}>
      <span aria-hidden="true" style={{ opacity: 0.7 }}>⏱</span>
      {parts.map((part, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {i > 0 && <span style={{ color: "var(--ink-ghost)" }}>·</span>}
          {part}
        </span>
      ))}
    </div>
  );
}

// "2026-10-11" -> "Oct 11" (a date-only string, parsed in local time).
function formatPacingDate(iso) {
  return parseLocalDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// A topical series' Outline is the pastor's ARRANGEMENT (sort_order), and the
// Schedule owns dates — so the Outline must NOT reshuffle when a sermon is dated.
// But `sermons` arrives from seriesSermonOrderBy DATED-FIRST, so rendering it raw
// (or reordering over it) let a single scheduled sermon jump to the top and bake
// that date-driven position into sort_order on the next reorder — scrambling the
// arrangement (audit finding 24). Sort by sort_order here, date-independent, with
// a creation-order tiebreak for never-arranged (NULL) sermons (matching
// seriesSermonOrderBy's undated tiebreak). The render AND moveSermon share this
// one order so the up/down arrows can't desync from what's on screen.
function arrangedTopicalSermons(sermons) {
  return [...(sermons || [])].sort((a, b) => {
    const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return String(a.created_at || "").localeCompare(String(b.created_at || ""));
  });
}

// ── Outline Tab ───────────────────────────────────────────────────────────────
// The book as ONE live nested outline: Book ▸ Section ▸ Sermon, each rung the
// same unit (Title + range · Big idea · Overview). Replaces the old
// Understand/Design tabs AND the Overview cockpit — the outline IS the
// at-a-glance. Draft-row/commit is preserved for new sermons (createSermon
// throws on an empty name, State #3). AI-free throughout.
function OutlineTab({
  series, sections, sermons, seriesId,
  onSeriesField, onSelectBook, onSectionField, onSermonField,
  onSectionsChange, onSermonsChange, onOpenSermon, onSyncEndDate,
  drafts, setDrafts, draftErrors, setDraftErrors, expandedSermons, setExpandedSermons,
  runSave,
}) {
  const [referenceOpen, setReferenceOpen] = useState(false);
  // Sections default expanded; collapse state is OutlineTab-local (resets on a
  // tab switch — fine). drafts / draftErrors / expandedSermons are lifted to the
  // parent so an unfinished, not-yet-titled draft survives a tab switch.
  const [collapsedSections, setCollapsedSections] = useState(() => new Set());
  // Mirror the latest drafts for async commit re-reads (see commitDraft): the
  // pastor can keep typing into a draft during its createSermon round-trip.
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const inFlightRef = useRef(new Map());
  const [justCreatedSectionId, setJustCreatedSectionId] = useState(null);

  const isDraftId = (id) => typeof id === "string" && id.startsWith("draft-");

  function toggleSection(id) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSermon(id) {
    setExpandedSermons((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Section CRUD ──────────────────────────────────────────────────────────
  async function addSection() {
    const nextOrder = sections.length ? Math.max(...sections.map((s) => s.sort_order ?? 0)) + 1 : 0;
    // Route through runSave like the sibling section mutations (delete/move) so a
    // DB-busy / file-lock failure surfaces the topbar Save-failed + Retry instead
    // of a silent no-op. State is only touched after the writes resolve.
    await runSave(async () => {
      const result = await createSection({ series_id: seriesId, sort_order: nextOrder });
      const updated = await getSectionsBySeries(seriesId);
      onSectionsChange(updated);
      if (result?.id) {
        setCollapsedSections((prev) => { const n = new Set(prev); n.delete(result.id); return n; });
        setJustCreatedSectionId(result.id);
      }
    }, { retryable: false }); // create thunk — never queue for topbar Retry (would duplicate the section)
  }
  async function deleteSectionRow(id) {
    // Mirror the server (no section-less limbo): the deleted section's sermons
    // move to the first remaining section; if it was the LAST section they leave
    // the series (become standalone) and drop out of the planner.
    const target = sections
      .filter((s) => s.id !== id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
    onSectionsChange((prev) => prev.filter((s) => s.id !== id));
    if (target) {
      onSermonsChange((prev) => prev.map((s) => (s.section_id === id ? { ...s, section_id: target.id } : s)));
    } else {
      onSermonsChange((prev) => prev.filter((s) => s.section_id !== id));
    }
    const ok = await runSave(() => deleteSection(id), { retryable: false });
    if (!ok) {
      const [secs, serms] = await Promise.all([getSectionsBySeries(seriesId), getSermonsBySeries(seriesId)]);
      onSectionsChange(secs);
      onSermonsChange(serms);
    } else if (!target) {
      // Last section deleted — its sermons left the series (standalone), so the
      // series end_date must recompute over what remains (usually nothing).
      onSyncEndDate(sermons.filter((s) => s.section_id !== id));
    }
  }
  async function moveSection(id, direction) {
    const idx = sections.findIndex((s) => s.id === id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const reordered = [...sections];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    onSectionsChange(reordered);
    // One gesture, one transaction (Session-3): the fan-out of per-section
    // sort_order writes moved into the `reorder-sections` spine op — a failure
    // mid-reorder can no longer leave half the sections moved.
    const ok = await runSave(() => reorderSections(seriesId, reordered.map((s) => s.id)), { retryable: false });
    if (!ok) onSectionsChange(await getSectionsBySeries(seriesId));
  }

  // Topical reorder — the pastor-authored sequence over the flat sermon list
  // (a theme has no book reading order). Only committed sermons carry a
  // sort_order; reassign it = index and persist. Drafts (no DB row) aren't
  // reorderable and live at the end until committed. The Schedule + breadcrumb
  // read the same sort_order via seriesSermonOrderBy, so this one write reorders
  // everywhere.
  async function moveSermon(id, direction) {
    // Reorder over the ARRANGEMENT order the pastor sees (sort_order), NOT the raw
    // dated-first `sermons` — otherwise a move rewrites sort_order from date-driven
    // positions and scrambles the arrangement (audit finding 24).
    const ordered = arrangedTopicalSermons(sermons);
    const idx = ordered.findIndex((s) => s.id === id);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= ordered.length) return;
    const reordered = [...ordered];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const withOrder = reordered.map((s, i) => ({ ...s, sort_order: i }));
    onSermonsChange(withOrder);
    // One gesture, one transaction (Session-3): the per-sermon sort_order
    // fan-out moved into the `reorder-series-sermons` spine op.
    const ok = await runSave(() => reorderSeriesSermons(seriesId, withOrder.map((s) => s.id)), { retryable: false });
    if (!ok) onSermonsChange(await getSermonsBySeries(seriesId));
  }

  // ── Sermon draft / commit ──────────────────────────────────────────────
  function addSermon(sectionId) {
    const id = `draft-${crypto.randomUUID()}`;
    setDrafts((prev) => [...prev, {
      id, _draft: true, series_id: seriesId, section_id: sectionId,
      title: "", passage: "", book_id: "", big_idea: "", overview: "", date: "",
      stage: SERMON_STATUS.InProgress,
    }]);
    setExpandedSermons((prev) => new Set(prev).add(id));
  }
  function clearDraftError(id) {
    setDraftErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev }; delete next[id]; return next;
    });
  }
  // Commit a draft to the spine. The create-sermon INSERT is never widened —
  // big_idea / overview (if typed before commit) follow with an updateSermon,
  // exactly the create-then-update shape the old study_guide_note follow-up used.
  function commitDraft(draftId) {
    if (inFlightRef.current.has(draftId)) return inFlightRef.current.get(draftId);
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return Promise.resolve(null);
    const name = draft.title?.trim();
    if (!name) return Promise.resolve(null);
    clearDraftError(draftId);
    const promise = (async () => {
      try {
        const result = await createSermon({
          name, series_id: draft.series_id, section_id: draft.section_id,
          passage: draft.passage || "", date: draft.date || "", is_one_off: 0,
        });
        const newId = result.id;
        // Re-read the draft as it stands NOW — the pastor may have kept typing big
        // idea / overview / passage during the createSermon round-trip, so the
        // snapshot taken before the await is stale. Persist + render the latest.
        const latest = draftsRef.current.find((d) => d.id === draftId) || draft;
        const followUp = {};
        if (latest.big_idea?.trim?.()) followUp.big_idea = latest.big_idea;
        if (latest.overview?.trim?.()) followUp.overview = latest.overview;
        if ((latest.passage || "") !== (draft.passage || "")) followUp.passage = latest.passage || "";
        // book_id rides the same create-then-update follow-up (the create-sermon
        // INSERT is never widened) — a topical draft may carry a picked book.
        if (latest.book_id) followUp.book_id = latest.book_id;
        const realSlot = {
          id: newId, series_id: draft.series_id, section_id: draft.section_id,
          title: name, passage: latest.passage || "", date: latest.date || "",
          book_id: latest.book_id || null,
          big_idea: latest.big_idea || "", overview: latest.overview || "",
          stage: SERMON_STATUS.InProgress,
        };
        // The sermon row is COMMITTED — promote the draft to it now. The follow-up
        // fields are an idempotent field write on an existing row, so route it
        // through the retryable save path rather than awaiting it here. Awaiting
        // let a failed follow-up throw to the catch below, which left the draft in
        // place under a misleading "could not create" error — and re-committing
        // created a SECOND sermon. Now a follow-up failure is a visible, retryable
        // field save on the real row; the create is never re-run.
        onSermonsChange((prev) => [...prev, realSlot]);
        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
        if (Object.keys(followUp).length) runSave(() => updateSermon(newId, followUp), { key: saveKey(`sermon:${newId}`, followUp) });
        // Carry the expanded state from the draft row to the committed row.
        setExpandedSermons((prev) => {
          const n = new Set(prev); n.delete(draftId); n.add(newId); return n;
        });
        return newId;
      } catch (e) {
        console.error("[commitDraft]", e);
        setDraftErrors((prev) => ({ ...prev, [draftId]: e?.message || "Could not create the sermon." }));
        return null;
      } finally {
        inFlightRef.current.delete(draftId);
      }
    })();
    inFlightRef.current.set(draftId, promise);
    return promise;
  }
  // Accepts either a single (field, value) — the keystroke fields — or an object
  // of fields, so a topical Book pick can write book_id + the recomposed passage
  // in one go (and one DB write) without the two ever landing out of step.
  function handleSermonRowField(id, fieldOrFields, value) {
    const fields = typeof fieldOrFields === "string" ? { [fieldOrFields]: value } : fieldOrFields;
    if (isDraftId(id)) {
      setDrafts((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)));
      return;
    }
    onSermonField(id, fields);
  }
  async function removeSermonRow(id) {
    if (isDraftId(id)) { setDrafts((prev) => prev.filter((s) => s.id !== id)); clearDraftError(id); return; }
    onSermonsChange((prev) => prev.filter((s) => s.id !== id));
    const ok = await runSave(() => deleteSermon(id), { retryable: false });
    if (!ok) {
      // The delete failed but the row was optimistically removed — reload so the
      // "deleted" sermon doesn't silently reappear on the next load (it never
      // left the DB). Mirrors deleteSectionRow's rollback.
      onSermonsChange(await getSermonsBySeries(seriesId));
      return;
    }
    // end_date mirrors the LAST dated sermon — recompute once this one is gone, or
    // deleting the latest-dated sermon strands a phantom end date on the booklet/Arc.
    onSyncEndDate(sermons.filter((s) => s.id !== id));
  }

  // Group committed sermons + drafts by section. Drafts merge in so they render
  // in the right place; downstream tabs read `sermons` directly so drafts never
  // leak past the Outline. There is no section-less group: every series sermon
  // lives under a section (the v28/v29 migrations + the create/add/delete flows
  // guarantee it — create-sermon auto-files a section-less in-series sermon under
  // the series' first section, so the New Sermon modal can't hand the Outline an
  // invisible row); a sermon with no series is standalone and lives in the
  // library, not here.
  const allSermons = [...sermons, ...drafts];
  const bySection = {};
  for (const p of allSermons) {
    if (p.section_id) (bySection[p.section_id] ||= []).push(p);
  }

  // ── Topical series — a different page: a Big Idea root + a flat, pastor-ordered
  // list of sermons (no section tier; passages come from many books). Charter:
  // series-planner-revival-charter.md "2026-06-25 — Topical Series mode".
  if (series.kind === "topical") {
    // Committed sermons render in the pastor's ARRANGEMENT (sort_order), date-
    // independent — `sermons` itself arrives dated-first from seriesSermonOrderBy,
    // so it must be re-sorted here (and identically in moveSermon). Drafts append
    // at the end. Reorder acts on the committed list only.
    const rows = [...arrangedTopicalSermons(sermons), ...drafts];
    return (
      <div className="page-body" style={{ background: "var(--parchment)" }}>
        <div className="page-header" style={{ padding: "0 0 4px" }}>
          <div className="page-title">Outline</div>
          <div className="page-subtitle">
            Build the series from one big idea down to its sermons. Name the theme, then gather a sermon
            for each passage — from any book — that sounds it. Order them into the sequence you'll preach.
          </div>
        </div>

        {/* ── BIG IDEA — the root of a topical series ───────────────────────── */}
        <TierBand step={1} label="Big idea">
          Start here. Name the theme this series gathers, say it in one line, and write a short overview.
          Everything below hangs on it.
        </TierBand>
        <div className="card" style={{ borderLeft: "3px solid var(--gold)" }}>
          <div className="field-group">
            <label className="field-label" htmlFor="outline-theme">Theme</label>
            <input
              id="outline-theme"
              className="field-input"
              value={series.title || ""}
              onChange={(e) => onSeriesField("title", e.target.value)}
              placeholder="e.g. The Mission of God"
            />
            <div style={{ fontSize: "12px", color: "var(--ink-ghost)", marginTop: "6px" }}>
              The series' name — the single idea it gathers.
            </div>
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="outline-topical-big-idea">Big Idea <span style={{ color: "var(--ink-ghost)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(one line)</span></label>
            <input
              id="outline-topical-big-idea"
              className="field-input"
              value={series.big_idea || ""}
              onChange={(e) => onSeriesField("big_idea", e.target.value)}
              placeholder="The single idea this series sounds — in one sentence."
            />
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="outline-topical-overview">Overview <span style={{ color: "var(--ink-ghost)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(a paragraph)</span></label>
            <textarea
              id="outline-topical-overview"
              className="field-textarea large"
              value={series.overview || ""}
              onChange={(e) => onSeriesField("overview", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="What is this theme, and why this congregation, now? The arc you want the series to travel."
            />
          </div>
        </div>

        {/* ── SERMONS — a flat, pastor-ordered list ──────────────────────────── */}
        <TierBand step={2} label="Sermons">
          Gather the passages that sound this theme — one sermon each, drawn from any book (type the book into
          the passage, e.g. "Genesis 12:1-3"). Put them in the order you'll preach; date them on the Schedule.
        </TierBand>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {rows.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "28px 24px" }}>
              <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink-soft)", fontSize: "14px", margin: "0 auto 14px", maxWidth: "520px", lineHeight: 1.6 }}>
                No sermons yet. Add the first passage that sounds this theme — its working title, big idea, and
                overview. You can reorder them any time.
              </p>
              <SecondaryButton size="sm" onClick={() => addSermon(null)}>+ Add sermon</SecondaryButton>
            </div>
          ) : (
            <>
              {rows.map((p, i) => (
                <SermonNode
                  key={p.id}
                  sermon={p}
                  expanded={expandedSermons.has(p.id)}
                  onToggle={() => toggleSermon(p.id)}
                  onField={handleSermonRowField}
                  onCommit={commitDraft}
                  onDelete={removeSermonRow}
                  commitError={draftErrors[p.id]}
                  onClearError={clearDraftError}
                  onOpenSermon={onOpenSermon}
                  topical
                  index={p._draft ? null : i}
                  total={sermons.length}
                  onMove={p._draft ? null : (dir) => moveSermon(p.id, dir)}
                />
              ))}
              <SecondaryButton size="sm" onClick={() => addSermon(null)} style={{ alignSelf: "flex-start", marginTop: "2px" }}>+ Add sermon</SecondaryButton>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-body" style={{ background: "var(--parchment)" }}>
      <div className="page-header" style={{ padding: "0 0 4px" }}>
        <div className="page-title">Outline</div>
        <div className="page-subtitle">
          Plan the book from the top down in three levels — the book, its sections, and the sermons inside them.
          Each level holds the same three things: a title and passage range, a one-line big idea, and a short overview.
        </div>
      </div>

      {/* ── BOOK LEVEL — the root of the outline ───────────────────────────── */}
      <TierBand step={1} label="Book level">
        Start here. Choose the book you're preaching and set how much of it you'll cover, then write the one big idea
        of the whole book and a short overview. This frames everything below.
      </TierBand>
      <div className="card" style={{ borderLeft: "3px solid var(--gold)" }}>
        {/* The book IS the series' identity, so the book picker leads the card —
            it's the first move, and it fills the genre + passage span. The series
            title is a demoted, optional display name further down. */}
        <div className="field-group">
          <label className="field-label">Book details</label>
          <p className="field-caption" style={{ margin: "0 0 10px" }}>
            Which book, and how much of it. Pick a book to fill in the genre and passage span — both stay editable.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor="outline-book">Book</label>
              <BookSelect id="outline-book" value={series.book_id || ""} onChange={(e) => onSelectBook(e.target.value)} />
              <div style={{ fontSize: "12px", color: "var(--ink-ghost)", marginTop: "6px" }}>
                Sets the genre and fills the passage span; both stay editable.
              </div>
            </div>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor="outline-category">Biblical Category</label>
              <select id="outline-category" className="field-input" value={series.canon_category || ""} onChange={(e) => onSeriesField("canon_category", e.target.value)}>
                {CANON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field-group" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
              <label className="field-label" htmlFor="outline-range">Passage Range</label>
              <input id="outline-range" className="field-input" style={{ fontFamily: "var(--font-mono)" }} value={series.passage_range || ""} onChange={(e) => onSeriesField("passage_range", e.target.value)} placeholder="e.g. Luke 1:1–24:53" />
            </div>
          </div>
        </div>

        {/* Series title — a demoted, optional display name. State #3 keeps the
            series name correctable; it defaults to the book, edited here. */}
        <div className="field-group">
          <label className="field-label" htmlFor="outline-series-title">Series title <span style={{ color: "var(--ink-ghost)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
          <input
            id="outline-series-title"
            className="field-input"
            value={series.title || ""}
            onChange={(e) => onSeriesField("title", e.target.value)}
            placeholder={bookById(series.book_id)?.name || "Defaults to the book name"}
          />
          <div style={{ fontSize: "12px", color: "var(--ink-ghost)", marginTop: "6px" }}>
            Defaults to the book — give it a richer title only if you want one.
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="outline-book-big-idea">Big Idea <span style={{ color: "var(--ink-ghost)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(one line)</span></label>
          <input
            id="outline-book-big-idea"
            className="field-input"
            value={series.big_idea || ""}
            onChange={(e) => onSeriesField("big_idea", e.target.value)}
            placeholder="The single idea the whole book sounds — in one sentence."
          />
        </div>
        <div className="field-group" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="outline-book-overview">Overview <span style={{ color: "var(--ink-ghost)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(a paragraph)</span></label>
          <textarea
            id="outline-book-overview"
            className="field-textarea large"
            value={series.overview || ""}
            onChange={(e) => onSeriesField("overview", e.target.value)}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
            placeholder="What is this book, and why does it matter for this congregation? The arc of the whole."
          />
        </div>

        {/* Reference — the pasted commentary outline (structural_outline),
            collapsed. The book's literary shape, kept for reference. */}
        <Disclosure open={referenceOpen} onToggle={() => setReferenceOpen((o) => !o)} label="Reference (commentary outline)">
          <div className="field-group" style={{ marginTop: "12px", marginBottom: 0 }}>
            <p className="field-caption" style={{ margin: "0 0 8px" }}>
              The book's outline — its movements and turning points. Build it yourself, or paste from a commentary.
            </p>
            <textarea
              className="field-textarea large" rows={5}
              aria-label="Book structural outline (commentary reference)"
              value={series.structural_outline || ""}
              onChange={(e) => onSeriesField("structural_outline", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder={"I. Major Division (1:1–4:13)\n   A. Sub-section (1:1-25)\n   B. Sub-section (1:26-38)"}
            />
          </div>
        </Disclosure>
      </div>

      {/* ── SECTION LEVEL — the book's major movements ─────────────────────── */}
      <TierBand step={2} label="Section level">
        Divide the book into its major movements. Give each section a title and passage range, its one-line big idea,
        and a short overview. Your sermons live inside these sections — that's the next level down.
      </TierBand>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {sections.map((section, idx) => (
          <SectionNode
            key={section.id}
            section={section}
            index={idx}
            total={sections.length}
            collapsed={collapsedSections.has(section.id)}
            justCreated={justCreatedSectionId === section.id}
            sermons={bySection[section.id] || []}
            expandedSermons={expandedSermons}
            onToggle={() => toggleSection(section.id)}
            onField={(field, value) => onSectionField(section.id, { [field]: value })}
            onDelete={() => deleteSectionRow(section.id)}
            onMove={(dir) => moveSection(section.id, dir)}
            onAddSermon={() => addSermon(section.id)}
            onToggleSermon={toggleSermon}
            onSermonRowField={handleSermonRowField}
            onCommitSermon={commitDraft}
            onDeleteSermon={removeSermonRow}
            draftErrors={draftErrors}
            onClearDraftError={clearDraftError}
            onOpenSermon={onOpenSermon}
          />
        ))}

        {sections.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "28px 24px" }}>
            <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink-soft)", fontSize: "14px", margin: "0 auto 14px", maxWidth: "520px", lineHeight: 1.6 }}>
              No sections yet. Start by dividing the book into its major movements — each section holds a title and
              passage range, a one-line big idea, and the sermons inside it. Add your first section to begin.
            </p>
            <SecondaryButton size="sm" onClick={addSection}>+ Add section</SecondaryButton>
          </div>
        ) : (
          <div>
            <SecondaryButton size="sm" onClick={addSection}>+ Add section</SecondaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

// A labeled tier band — the on-screen signpost for each level of the outline
// (Book ▸ Section ▸ Sermon). The numbered label + a plain "what to do here" line
// make the screen teach itself, instead of leaving the model to the
// How-this-works modal (low software confidence is a binding CORE constraint —
// labeled beats minimal).
function TierBand({ step, label, children }) {
  return (
    <div style={{ marginTop: "26px", marginBottom: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
          background: "var(--gold)", color: "var(--white)",
          fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "12px",
        }}>{step}</span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink)",
        }}>{label}</span>
      </div>
      <p style={{
        margin: "6px 0 0 32px", fontFamily: "var(--font-serif)", fontSize: "13.5px",
        color: "var(--ink-soft)", lineHeight: 1.55, maxWidth: "820px",
      }}>{children}</p>
    </div>
  );
}

// A labeled collapse/expand disclosure used inside the book node.
function Disclosure({ open, onToggle, label, children }) {
  return (
    <div style={{ marginTop: "16px", borderTop: "1px solid var(--parchment-deep)", paddingTop: "12px" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={buttonKeydown(onToggle)}
        aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
      >
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px" }}>{open ? "▲" : "▼"}</span>
        <span className="field-label" style={{ marginBottom: 0 }}>{label}</span>
      </div>
      {open && children}
    </div>
  );
}

// ── Section node ──────────────────────────────────────────────────────────────
// One collapsible card per section, indented under the book. Header shows the
// number, title, and range with reorder/delete; expanding reveals the section's
// own Title · range · Big idea · Overview unit AND its nested sermons.
function SectionNode({
  section, index, total, collapsed, justCreated, sermons, expandedSermons,
  onToggle, onField, onDelete, onMove, onAddSermon, onToggleSermon,
  onSermonRowField, onCommitSermon, onDeleteSermon, draftErrors,
  onClearDraftError, onOpenSermon,
}) {
  const cardRef = useRef(null);
  const titleRef = useRef(null);
  useEffect(() => {
    if (justCreated) {
      cardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      titleRef.current?.focus();
    }
  }, [justCreated]);

  const chevronBtnStyle = { background: "none", border: "none", cursor: "pointer", color: "var(--ink-ghost)", fontSize: "13px", padding: "2px 4px" };

  return (
    <div ref={cardRef} className="card" style={{ borderLeft: "3px solid var(--parchment-deep)" }}>
      {/* Section header */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={buttonKeydown(onToggle)}
        aria-expanded={!collapsed}
        style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
      >
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px", width: "16px", textAlign: "center" }}>{index + 1}</span>
        <span style={{
          flex: 1, fontFamily: "var(--font-serif)", fontSize: "15px", fontWeight: 600,
          color: section.title ? "var(--ink)" : "var(--ink-ghost)",
          fontStyle: section.title ? "normal" : "italic",
        }}>
          {section.title || "Untitled section"}
        </span>
        {section.passage_range && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-soft)" }}>{section.passage_range}</span>
        )}
        <span style={{ fontSize: "11px", color: "var(--ink-ghost)" }}>
          {sermons.length} sermon{sermons.length === 1 ? "" : "s"}
        </span>
        <div style={{ display: "flex", gap: "2px" }}>
          {index > 0 && <IconButton aria-label="Move section up" onClick={(e) => { e.stopPropagation(); onMove(-1); }} style={chevronBtnStyle} title="Move up">↑</IconButton>}
          {index < total - 1 && <IconButton aria-label="Move section down" onClick={(e) => { e.stopPropagation(); onMove(1); }} style={chevronBtnStyle} title="Move down">↓</IconButton>}
          <DeleteButton small onDelete={onDelete} />
        </div>
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px" }}>{collapsed ? "▼" : "▲"}</span>
      </div>

      {!collapsed && (
        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Section's own unit */}
          {/* Repeated per-row controls: ids are scoped by section.id so every
              visible label owns its control programmatically (Session 6). */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor={`sec-${section.id}-title`}>Section Title</label>
              <input id={`sec-${section.id}-title`} ref={titleRef} className="field-input" value={section.title || ""} onChange={(e) => onField("title", e.target.value)} placeholder="e.g. Seeing Jesus Through Others' Eyes" />
            </div>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor={`sec-${section.id}-range`}>Passage Range</label>
              <input id={`sec-${section.id}-range`} className="field-input" style={{ fontFamily: "var(--font-mono)" }} value={section.passage_range || ""} onChange={(e) => onField("passage_range", e.target.value)} placeholder="e.g. 1:1–4:13" />
            </div>
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor={`sec-${section.id}-big-idea`}>Big Idea</label>
            <input id={`sec-${section.id}-big-idea`} className="field-input" value={section.big_idea || ""} onChange={(e) => onField("big_idea", e.target.value)} placeholder="The central truth of this section, in one line." />
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor={`sec-${section.id}-overview`}>Overview</label>
            <textarea
              id={`sec-${section.id}-overview`}
              className="field-textarea" rows={3}
              value={section.overview || ""}
              onChange={(e) => onField("overview", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="What does this section accomplish? What shift happens here?"
            />
          </div>

          {/* Nested sermons — the SERMON LEVEL, kept inside its section. */}
          <div style={{ borderTop: "1px solid var(--parchment-deep)", paddingTop: "12px", marginLeft: "12px", borderLeft: "2px solid var(--parchment-deep)", paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
                Sermon level · sermons in this section
              </div>
              <p className="field-caption" style={{ margin: "2px 0 0" }}>
                One sermon per passage — its working title, big idea, and overview. Date it on the Schedule; open it to write the sermon.
              </p>
            </div>
            {sermons.length === 0 && (
              <div style={{ padding: "12px", background: "var(--parchment-warm)", borderRadius: "var(--radius)", textAlign: "center", color: "var(--ink-ghost)", fontSize: "13px", fontFamily: "var(--font-serif)" }}>
                No sermons in this section yet.
              </div>
            )}
            {sermons.map((p) => (
              <SermonNode
                key={p.id}
                sermon={p}
                expanded={expandedSermons.has(p.id)}
                onToggle={() => onToggleSermon(p.id)}
                onField={onSermonRowField}
                onCommit={onCommitSermon}
                onDelete={onDeleteSermon}
                commitError={draftErrors[p.id]}
                onClearError={onClearDraftError}
                onOpenSermon={onOpenSermon}
              />
            ))}
            <SecondaryButton size="sm" onClick={onAddSermon} style={{ alignSelf: "flex-start", marginTop: "2px" }}>+ Add sermon</SecondaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sermon node ─────────────────────────────────────────────────────────────
// Topical sermons author their passage as a structured Book (`book_id`) + a
// chapter:verse ref, composed into the single `passage` display string so the
// book and the passage string can't disagree (no dual source of truth — charter:
// docs/PROPOSALS/coverage-initiative.md). The compose / extract / re-point
// helpers live in src/utils/topicalPassage.js.

// One sermon = one passage = one scheduled Sunday. The Outline is pure
// outlining — no dates live here; scheduling is wholly the Schedule screen's.
// Collapsed: passage · working title · Open. Expanded: passage · working title ·
// big idea · overview. Draft rows commit on title blur/Enter (State #3 deferral).
// Topical rows author the passage structurally (Book picker + chapter:verse);
// book-series rows keep the single free-text passage field.
function SermonNode({ sermon: p, expanded, onToggle, onField, onCommit, onDelete, commitError, onClearError, onOpenSermon, topical = false, index = null, total = 0, onMove = null }) {
  const isDraft = !!p._draft;
  const rowRef = useRef(null);
  const titleRef = useRef(null);
  const chevronBtnStyle = { background: "none", border: "none", cursor: "pointer", color: "var(--ink-ghost)", fontSize: "13px", padding: "2px 4px" };

  // A freshly-added draft is auto-expanded; reveal + focus it so the add never
  // reads as a no-op below the fold.
  useEffect(() => {
    if (p._draft) {
      rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      // preventScroll: focus()'s default synchronous scroll otherwise fights the
      // queued smooth scrollIntoView above, so a draft added far below the fold
      // wasn't reliably centered (audit finding 34).
      titleRef.current?.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpen(e) {
    e.stopPropagation();
    const id = isDraft ? await onCommit?.(p.id) : p.id;
    if (id) onOpenSermon(id);
  }

  // Topical authoring: the Book picker and the chapter:verse field both recompose
  // the single `passage` string, writing book_id + passage together so they can't
  // disagree.
  function onPickBook(newBookId) {
    // repointPassage drops ANY leading book name (the bound one, or a different
    // book named in a legacy free-text passage) before recomposing under the new
    // book — so the name is never doubled or concatenated. See topicalPassage.js.
    onField(p.id, { book_id: newBookId, passage: repointPassage(p.passage, newBookId) });
  }
  function onRefChange(ref) {
    onField(p.id, { passage: composePassage(p.book_id, ref) });
  }

  // The working-title input is identical in both modes (draft-commit behavior +
  // inline commit error) — share one copy so the two layouts can't drift.
  const titleField = (
    <>
      <input
        id={`sermon-${p.id}-title`}
        ref={titleRef} className="field-input" style={{ fontSize: "14px" }}
        value={p.title || ""}
        onChange={(e) => onField(p.id, "title", e.target.value)}
        onBlur={() => { if (isDraft && p.title?.trim()) onCommit?.(p.id); }}
        onKeyDown={(e) => { if (e.key === "Enter" && isDraft && p.title?.trim()) { e.preventDefault(); onCommit?.(p.id); } }}
        placeholder="A rough handle for this passage — the big idea expands on it."
        onClick={(e) => e.stopPropagation()}
      />
      {commitError && <div style={{ marginTop: "6px" }}><InlineError onDismiss={() => onClearError?.(p.id)}>{commitError}</InlineError></div>}
    </>
  );

  // Topical only: flag a chapter:verse that won't parse ("12:1--3", "12:") so a
  // broken reference is caught here instead of slipping silently into the booklet
  // — the Coverage panel that flags these for a book series is hidden for topical.
  // Only once a book is picked and a ref has actually been typed.
  const refText = topical ? refFromPassage(p.passage, p.book_id) : "";
  const refUnreadable =
    topical && !!p.book_id && refText.trim() !== "" && parsePassageRef(p.passage, p.book_id).error === true;

  return (
    <div ref={rowRef} style={{ border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)", background: "var(--white)", overflow: "hidden" }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={buttonKeydown(onToggle)}
        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", cursor: "pointer" }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink-soft)", minWidth: "84px" }}>
          {p.passage || <span style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>No passage</span>}
        </span>
        <span style={{ flex: 1, fontSize: "14px", color: p.title ? "var(--ink)" : "var(--ink-ghost)", fontStyle: p.title ? "normal" : "italic" }}>
          {p.title || "Untitled"}
        </span>
        {onOpenSermon && (
          <SecondaryButton
            size="sm"
            onClick={handleOpen}
            disabled={isDraft && !p.title?.trim()}
            title={isDraft && !p.title?.trim() ? "Type a title first" : "Open this sermon to start prepping it"}
            style={{ fontSize: "12px", padding: "3px 10px" }}
          >
            Build this sermon
          </SecondaryButton>
        )}
        {onMove && index != null && (
          <div style={{ display: "flex", gap: "2px" }}>
            {index > 0 && <IconButton aria-label="Move sermon up" onClick={(e) => { e.stopPropagation(); onMove(-1); }} style={chevronBtnStyle} title="Move up">↑</IconButton>}
            {index < total - 1 && <IconButton aria-label="Move sermon down" onClick={(e) => { e.stopPropagation(); onMove(1); }} style={chevronBtnStyle} title="Move down">↓</IconButton>}
          </div>
        )}
        <DeleteButton small onDelete={() => onDelete(p.id)} />
        <span style={{ color: "var(--ink-ghost)", fontSize: "12px" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "14px", borderTop: "1px solid var(--parchment-deep)", background: "var(--parchment-warm)", display: "flex", flexDirection: "column", gap: "12px" }}>
          {topical ? (
            // Structured Book + chapter:verse compose the passage; title sits full-width below.
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor={`sermon-${p.id}-book`}>Book</label>
                  <BookSelect id={`sermon-${p.id}-book`} value={p.book_id || ""} onChange={(e) => onPickBook(e.target.value)} />
                </div>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor={`sermon-${p.id}-ref`}>Chapter:verse</label>
                  <input
                    id={`sermon-${p.id}-ref`}
                    className="field-input" style={{ fontFamily: "var(--font-mono)", fontSize: "14px" }}
                    value={refText}
                    onChange={(e) => onRefChange(e.target.value)}
                    placeholder="e.g. 12:1-3"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {refUnreadable && (
                    <div style={{ marginTop: "5px", fontSize: "12px", color: "var(--crimson-soft)", fontFamily: "var(--font-mono)" }}>
                      Couldn't read this reference — check the chapter:verse.
                    </div>
                  )}
                </div>
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor={`sermon-${p.id}-title`}>Working title</label>
                {titleField}
              </div>
            </>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor={`sermon-${p.id}-passage`}>Passage</label>
                <input
                  id={`sermon-${p.id}-passage`}
                  className="field-input" style={{ fontFamily: "var(--font-mono)", fontSize: "14px" }}
                  value={p.passage || ""}
                  onChange={(e) => onField(p.id, "passage", e.target.value)}
                  placeholder="e.g. Luke 1:1-4"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor={`sermon-${p.id}-title`}>Working title</label>
                {titleField}
              </div>
            </div>
          )}
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Big Idea</label>
            <input
              className="field-input"
              value={p.big_idea || ""}
              onChange={(e) => onField(p.id, "big_idea", e.target.value)}
              placeholder="The one thing this passage says, in a sentence."
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Overview</label>
            <textarea
              className="field-textarea" rows={3}
              value={p.overview || ""}
              onChange={(e) => onField(p.id, "overview", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="A paragraph on this passage — what it shows and where it lands. Becomes the study-guide commentary."
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Schedule Tab ──────────────────────────────────────────────────────────────
// Lays each sermon on a Sunday. The date is SINGLE-SOURCE on the sermon;
// the Outline carries no dates at all, so this screen wholly owns scheduling.
// Undated sermons arrive in outline reading order (section, then creation) from the
// spine, so the pool — and Suggest Sundays' assignment — follows the book. Suggest
// Sundays is one explicit bulk gesture; manual edits autosave like any other field.
// Each row expands to show the sermon's big idea + overview (read-only — edited on
// the Outline). AI scheduling advisor stays removed (no-direct-ai); the
// church-calendar engine is preserved verbatim.
function ScheduleTab({ series, sermons, calNotes, onSeriesField, onSermonDate, onBulkDates, onNavigate }) {
  const [suggesting, setSuggesting] = useState(false);
  const excludeDates = calNotes.map((n) => n.date);
  // Suggest Sundays fills ONLY the undated sermons (preserves hand-set dates).
  const undatedCount = sermons.filter((s) => !s.date).length;
  // Per-row expand — reveals the sermon's big idea + overview. The Schedule row
  // itself stays passage + date; the rest lives one click down.
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  function toggleRow(id) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Date writes go through the parent's single-source onSermonDate handler, which
  // persists the date AND re-mirrors series end_date. The Schedule is the only
  // surface that dates.
  function skipSunday(sermonId) {
    const entry = sermons.find((s) => s.id === sermonId);
    if (!entry?.date) return;
    onSermonDate(sermonId, addWeek(entry.date));
  }

  // Suggest Sundays — one explicit bulk gesture that fills ONLY the undated sermons,
  // preserving any date the pastor set by hand. The new dates continue after the
  // last already-scheduled Sunday (or the series start if nothing is dated yet),
  // skipping the pastor's special-date notes. Immediate writes (not debounced),
  // then end_date re-syncs.
  async function suggestSundays() {
    const undated = sermons.filter((s) => !s.date);
    if (!series.start_date || undated.length === 0) return;
    setSuggesting(true);
    // Flush any pending debounced date edit first, or a date the pastor just typed
    // could fire ~800ms later and revert this assignment (the export path guards
    // the same way before it reads the dates).
    await runRegisteredFlushes();
    // Continue after the latest already-scheduled Sunday, but never before the
    // declared start date.
    const lastDated = sermons.reduce((max, s) => (s.date && s.date > max ? s.date : max), "");
    let startFrom = series.start_date;
    if (lastDated) {
      const after = addWeek(lastDated);
      if (after > startFrom) startFrom = after;
    }
    const fill = getUpcomingSundays(startFrom, undated.length, excludeDates);
    // One gesture, one transaction (Session-3): every assigned date AND the
    // series end_date mirror commit together in main (`bulk-date-sermons`).
    // The parent (handleBulkDates) owns the optimistic state and reloads DB
    // truth on failure — a mid-flight failure can no longer leave half the
    // Sundays assigned.
    await onBulkDates(undated.map((s, i) => ({ id: s.id, date: fill[i] })));
    setSuggesting(false);
  }

  return (
    <div className="page-body">
      <div className="page-header" style={{ padding: "0 0 4px" }}>
        <div className="page-title">Schedule</div>
        <div className="page-subtitle">
          Lay each sermon on a Sunday. Seasons and your special-date notes ride along so nothing lands where it shouldn't.
          Dates save as you go; expand any sermon to see its big idea and overview.
        </div>
      </div>

      <PacingStrip sermons={sermons} series={series} calNotes={calNotes} />

      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="series-start-date">Series Start Date</label>
            <input
              id="series-start-date" type="date" className="field-input"
              style={{ width: "auto", fontSize: "14px", padding: "8px 12px" }}
              value={series.start_date || ""}
              onChange={(e) => onSeriesField("start_date", e.target.value)}
            />
          </div>
          <PrimaryButton
            size="sm"
            onClick={suggestSundays}
            disabled={!series.start_date || undatedCount === 0 || suggesting}
            title="Dates only the sermons that don't have a date yet, continuing after your last scheduled Sunday"
          >
            {suggesting ? LOADING_VERB.Saving
              : sermons.length > 0 && undatedCount === 0 ? "All sermons dated"
              : `Suggest Sundays (${undatedCount} sermon${undatedCount === 1 ? "" : "s"})`}
          </PrimaryButton>
        </div>
      </div>

      {/* Coverage moved here from the Outline — it measures how the sermons cover
          the book, which is a scheduling-side readout, not outlining. Hidden for a
          topical series: it measures % of ONE book, which a many-book theme has
          none of (its empty state would wrongly say "pick a canonical book"). */}
      {series.kind !== "topical" && (
        <div style={{ marginBottom: "20px" }}>
          <CoveragePanel series={series} sermons={sermons} onNavigate={onNavigate} />
        </div>
      )}

      {sermons.length === 0 ? (
        <div style={{
          padding: "32px", background: "var(--parchment-warm)", border: "1px solid var(--parchment-deep)",
          borderRadius: "var(--radius-lg)", textAlign: "center", color: "var(--ink-ghost)", fontSize: "14px",
        }}>
          Add sermons in{" "}
          <TextButton onClick={() => onNavigate?.("book-outline")} style={{ fontSize: "inherit", padding: 0, verticalAlign: "baseline" }}>Outline</TextButton>{" "}
          first.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sermons.map((sermon, idx) => {
            const date = sermon.date || "";
            const season = date ? getSeasonForDate(date) : null;
            const note = calNotes.find((n) => n.date === date);
            const isOpen = expandedRows.has(sermon.id);
            const hasDetail = !!(sermon.big_idea?.trim() || sermon.overview?.trim());
            return (
              <div
                key={sermon.id}
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--parchment-deep)",
                  boxShadow: "var(--shadow-soft)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div style={{
                  display: "grid", gridTemplateColumns: "52px 1fr 150px minmax(84px, auto) auto auto",
                  alignItems: "center", gap: "14px", padding: "12px 16px",
                }}>
                  <span
                    style={{ fontSize: "12px", color: "var(--ink-ghost)", textAlign: "center", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}
                    aria-label={`Sermon ${idx + 1} of ${sermons.length} in this series`}
                  >
                    {idx + 1}<span style={{ opacity: 0.55 }}> of {sermons.length}</span>
                  </span>
                  <div>
                    <div style={{ fontSize: "14px", color: "var(--ink)", fontFamily: "var(--font-serif)", lineHeight: "1.3" }}>
                      {sermon.title || <span style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Untitled</span>}
                    </div>
                    {sermon.passage && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-soft)", marginTop: "3px" }}>{sermon.passage}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <input
                      type="date" className="field-input" style={{ fontSize: "13px", padding: "6px 10px" }}
                      value={date}
                      onChange={(e) => onSermonDate(sermon.id, e.target.value)}
                      aria-label={`Date for sermon ${idx + 1}`}
                    />
                    {note && <span style={{ fontSize: "11px", color: "var(--crimson)" }}>⚠ {note.label}</span>}
                  </div>
                  <div>
                    {season && (
                      <span style={{
                        fontSize: "11px", padding: "3px 9px", borderRadius: "10px",
                        background: `color-mix(in srgb, var(${season.token}) 13%, transparent)`,
                        color: `var(${season.token})`,
                        border: `1px solid color-mix(in srgb, var(${season.token}) 28%, transparent)`,
                        whiteSpace: "nowrap",
                      }}>
                        {season.shortName}
                      </span>
                    )}
                  </div>
                  <IconButton
                    aria-label="Skip one week" className="btn-icon"
                    onClick={() => skipSunday(sermon.id)}
                    title="Skip one week" disabled={!date}
                    style={{ fontSize: "12px", padding: "5px 9px" }}
                  >
                    +1wk
                  </IconButton>
                  <IconButton
                    aria-label={isOpen ? "Hide big idea and overview" : "Show big idea and overview"}
                    aria-expanded={isOpen}
                    className="btn-icon"
                    onClick={() => toggleRow(sermon.id)}
                    title={isOpen ? "Hide big idea & overview" : "Show big idea & overview"}
                    style={{ fontSize: "12px", padding: "5px 9px" }}
                  >
                    {isOpen ? "▲" : "▼"}
                  </IconButton>
                </div>
                {isOpen && (
                  <div style={{ padding: "12px 16px 14px 54px", borderTop: "1px solid var(--parchment-deep)", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {hasDetail ? (
                      <>
                        {sermon.big_idea?.trim() && (
                          <div>
                            <div className="field-label" style={{ marginBottom: "3px" }}>Big idea</div>
                            <div style={{ fontFamily: "var(--font-serif)", fontSize: "14px", color: "var(--ink)", lineHeight: 1.5 }}>{sermon.big_idea}</div>
                          </div>
                        )}
                        {sermon.overview?.trim() && (
                          <div>
                            <div className="field-label" style={{ marginBottom: "3px" }}>Overview</div>
                            <div style={{ fontFamily: "var(--font-serif)", fontSize: "13.5px", color: "var(--ink-soft)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{sermon.overview}</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: "12.5px", color: "var(--ink-ghost)", fontStyle: "italic" }}>
                        No big idea or overview yet — add them in the{" "}
                        <TextButton onClick={() => onNavigate?.("book-outline")} style={{ fontSize: "inherit", padding: 0, verticalAlign: "baseline" }}>Outline</TextButton>.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Study Guide Tab ───────────────────────────────────────────────────────────
// An editable formatted booklet ("mini-commentary"). "Import from outline" builds
// it: book Overview → Introduction; each section → a part (its Overview opens it);
// each sermon → its own page (Big idea + Overview-as-commentary + passage + date).
// The imported content is a LIVE projection of the Outline — single-source, never
// snapshotted — so re-importing can never drift and never wipes the guide-local
// additions/notes (which live in study_guide_extras, untouched by Import).
// Export to Word renders the booklet (electron/main.js buildStudyGuideDoc).
function StudyGuideTab({ series, sections, sermons, seriesId, onSermonExtras, onNavigate }) {
  const isTopical = series.kind === "topical";
  const builtKey = `sermonforge_planner_guide_built_${seriesId}`;
  const [built, setBuilt] = useState(() => !!localStorage.getItem(builtKey));
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  const model = buildStudyGuideModel(series, sections, sermons);

  function importFromOutline() {
    // Build/refresh gesture. Content is already a live projection of the
    // Outline, so this just gates the empty-state → booklet and confirms the
    // refresh; it NEVER writes study_guide_extras, so additions/notes survive.
    localStorage.setItem(builtKey, "1");
    setBuilt(true);
    setJustRefreshed(true);
    setTimeout(() => setJustRefreshed(false), 2200);
  }

  async function handleExport() {
    setExporting(true);
    setExportResult(null);
    try {
      const { ok } = await runRegisteredFlushes(); // flush any pending Outline edits first
      if (!ok) {
        // A pending edit failed to persist — exporting now would bake a stale,
        // out-of-date booklet while reporting success. Stop and say so instead.
        setExportResult({ ok: false, error: "Couldn't save your latest edits, so the export was stopped to avoid an out-of-date booklet. Please try again in a moment." });
        return;
      }
      const result = await exportStudyGuide(series.id);
      setExportResult(result.success ? { ok: true, filepath: result.filepath } : { ok: false, error: result.error || "Export failed" });
    } catch (e) {
      setExportResult({ ok: false, error: e.message });
    } finally {
      setExporting(false);
    }
  }

  if (!built) {
    return (
      <div className="page-body">
        <div className="page-header" style={{ padding: "0 0 4px" }}>
          <div className="page-title">Study guide</div>
          <div className="page-subtitle">A congregational booklet built from your outline — an introduction{isTopical ? "" : ", a part per section"}, and a page per sermon.</div>
        </div>
        <div style={{
          marginTop: "20px", padding: "40px 32px", textAlign: "center",
          background: "var(--white)", border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius-lg)",
        }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "16px", color: "var(--ink)", marginBottom: "8px" }}>
            Build your study guide
          </div>
          <p style={{ fontSize: "14px", color: "var(--ink-soft)", maxWidth: "52ch", margin: "0 auto 20px", lineHeight: 1.6 }}>
            Import your outline to lay it out as a booklet. Your {isTopical ? "theme overview" : "book overview"} becomes
            the introduction{isTopical ? "" : ", each section a part"}, and each sermon its own page. You can add questions,
            cross-references, and quotes to any page afterward — re-importing refreshes the text but never touches your additions.
          </p>
          <PrimaryButton onClick={importFromOutline}>Import from outline</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body">
      <div className="page-header" style={{ padding: "0 0 4px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <div className="page-title">Study guide</div>
            <div className="page-subtitle">A booklet built from your outline. Add to any page; re-import refreshes the text, never your additions.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {justRefreshed && <span style={{ fontSize: "12px", color: "var(--sage)" }}>Refreshed from outline</span>}
            <SecondaryButton size="sm" onClick={importFromOutline}>Refresh from outline</SecondaryButton>
          </div>
        </div>
      </div>

      {/* The booklet — a live projection of the outline + guide-local additions.
          NOTE: the preview intentionally has no cover/Title block (series title ·
          passage range · date range) — that block is .docx-ONLY because this
          preview renders under the planner's page chrome which already names the
          series. The exported booklet adds the cover; everything else matches. */}
      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Introduction — gated on content to match the exported .docx, which omits
            the Introduction part entirely when the book has no big idea/overview. */}
        {(series.big_idea?.trim() || series.overview?.trim()) && (
          <div className="card">
            <SgPartLabel>Introduction</SgPartLabel>
            {series.big_idea?.trim() && (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "15px", color: "var(--ink)", margin: "0 0 10px", lineHeight: 1.6 }}>{series.big_idea}</p>
            )}
            {series.overview?.trim() && <SgBody text={series.overview} />}
          </div>
        )}

        {sermons.length === 0 && (
          <SgEmptyHint>Add sermons in <TextButton onClick={() => onNavigate?.("book-outline")} style={{ fontSize: "inherit", padding: 0, verticalAlign: "baseline" }}>Outline</TextButton> to build the booklet's pages.</SgEmptyHint>
        )}

        {/* Section parts + their sermon pages */}
        {model.sectionGroups.map(({ section, sermons: inSection }) => (
          <div key={section.id} className="card">
            <SgPartLabel>{section.title?.trim() || "Untitled section"}</SgPartLabel>
            {section.passage_range?.trim() && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink-soft)", marginBottom: "6px" }}>{section.passage_range}</div>
            )}
            {section.big_idea?.trim() && (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "14px", color: "var(--ink-soft)", margin: "0 0 8px" }}>{section.big_idea}</p>
            )}
            {section.overview?.trim() && <SgBody text={section.overview} />}
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {inSection.map((sermon) => (
                <StudyGuidePage key={sermon.id} sermon={sermon} onSermonExtras={onSermonExtras} />
              ))}
            </div>
          </div>
        ))}

        {/* Unsectioned sermons */}
        {model.remainingSermons.length > 0 && (
          <div className="card">
            {model.hasSections && <SgPartLabel>Remaining</SgPartLabel>}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {model.remainingSermons.map((sermon) => (
                <StudyGuidePage key={sermon.id} sermon={sermon} onSermonExtras={onSermonExtras} />
              ))}
            </div>
          </div>
        )}

        {/* Reference — the book's commentary outline. */}
        {series.structural_outline?.trim() && (
          <div className="card">
            <SgPartLabel>Reference</SgPartLabel>
            <SgBody text={series.structural_outline} />
          </div>
        )}
      </div>

      {/* Export */}
      <div className="card" style={{ marginTop: "20px", borderTop: "3px solid var(--gold)", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <div className="card-title">Export the booklet</div>
            <p className="field-caption" style={{ marginTop: "4px", maxWidth: "60ch" }}>
              Save a formatted Word document — the introduction, each part, and a page per sermon with room for the congregation's notes.
            </p>
          </div>
          <PrimaryButton onClick={handleExport} disabled={exporting}>
            {exporting ? LOADING_VERB.Exporting : "Export to Word"}
          </PrimaryButton>
        </div>
        {exportResult?.ok && (
          <div style={{ fontSize: "12px", color: "var(--sage)", fontFamily: "var(--font-serif)", overflowWrap: "anywhere", wordBreak: "break-word" }}>Saved to: {exportResult.filepath}</div>
        )}
        {exportResult && !exportResult.ok && (
          <div style={{ fontSize: "12px", color: "var(--crimson)", fontFamily: "var(--font-serif)", overflowWrap: "anywhere", wordBreak: "break-word" }}>Export failed: {exportResult.error}</div>
        )}
      </div>
    </div>
  );
}

function SgPartLabel({ children }) {
  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--gold-bright)", marginBottom: "8px" }}>
      {children}
    </div>
  );
}
function SgBody({ text }) {
  return (
    <>
      {text.split(/\n+/).filter((p) => p.trim()).map((para, i) => (
        <p key={i} style={{ fontSize: "14px", fontFamily: "var(--font-serif)", color: "var(--ink)", lineHeight: 1.7, margin: "0 0 8px" }}>{para}</p>
      ))}
    </>
  );
}
function SgEmptyHint({ children }) {
  return <div style={{ fontSize: "13px", fontStyle: "italic", color: "var(--ink-ghost)" }}>{children}</div>;
}

// One sermon's page in the booklet: title · passage · date · big idea ·
// overview-as-commentary, then blank listener Notes lines and the pastor's
// guide-local additions. Additions + notes sizing persist in study_guide_extras.
function StudyGuidePage({ sermon, onSermonExtras }) {
  const extras = parseStudyGuideExtras(sermon.study_guide_extras);
  const [composerType, setComposerType] = useState("question");
  const [composerText, setComposerText] = useState("");
  const season = sermon.date ? getSeasonForDate(sermon.date) : null;

  function persistExtras(next) {
    onSermonExtras(sermon.id, { study_guide_extras: JSON.stringify(next) });
  }
  function addAddition() {
    const text = composerText.trim();
    if (!text) return;
    persistExtras({ ...extras, additions: [...extras.additions, { id: crypto.randomUUID(), type: composerType, text }] });
    setComposerText("");
  }
  function removeAddition(id) {
    persistExtras({ ...extras, additions: extras.additions.filter((a) => a.id !== id) });
  }
  function setNotesLines(n) {
    persistExtras({ ...extras, notesLines: Math.max(0, Math.min(20, n)) });
  }

  return (
    <div style={{ border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)", background: "var(--white)", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
        {sermon.passage && <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink-soft)" }}>{sermon.passage}</span>}
        <span style={{ fontFamily: "var(--font-serif)", fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>{sermon.title || "Untitled"}</span>
        {sermon.date && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--ink-ghost)" }}>
            {formatDate(sermon.date)}
            {season && (
              <span style={{
                fontSize: "11px", padding: "1px 6px", borderRadius: "10px",
                background: `color-mix(in srgb, var(${season.token}) 13%, transparent)`,
                color: `var(${season.token})`, border: `1px solid color-mix(in srgb, var(${season.token}) 28%, transparent)`,
              }}>{season.shortName}</span>
            )}
          </span>
        )}
      </div>
      {sermon.big_idea?.trim() && (
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "14px", color: "var(--ink-mid)", margin: "0 0 8px" }}>{sermon.big_idea}</p>
      )}
      {sermon.overview?.trim()
        ? <SgBody text={sermon.overview} />
        : <SgEmptyHint>No overview yet — add it on this sermon in Outline.</SgEmptyHint>}

      {/* Pastor-authored additions */}
      {extras.additions.length > 0 && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {extras.additions.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "8px 10px", background: "var(--parchment-warm)", borderRadius: "var(--radius)", borderLeft: "3px solid var(--sage)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-ghost)", whiteSpace: "nowrap", marginTop: "2px" }}>{ADDITION_LABEL[a.type]}</span>
              <span style={{ flex: 1, fontSize: "13.5px", fontFamily: "var(--font-serif)", color: "var(--ink)", lineHeight: 1.5 }}>{a.text}</span>
              <DeleteButton small onDelete={() => removeAddition(a.id)} />
            </div>
          ))}
        </div>
      )}

      {/* Add-to-this-page composer */}
      <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <select className="field-input" style={{ width: "auto", fontSize: "12px", padding: "6px 10px" }} value={composerType} onChange={(e) => setComposerType(e.target.value)} aria-label="Addition type">
          {ADDITION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          className="field-input" style={{ flex: 1, minWidth: "180px", fontSize: "13px", padding: "6px 10px" }}
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && composerText.trim()) { e.preventDefault(); addAddition(); } }}
          placeholder="A question, a cross-reference, a quote…"
        />
        <SecondaryButton size="sm" onClick={addAddition} disabled={!composerText.trim()}>Add to this page</SecondaryButton>
      </div>

      {/* Notes — blank space for the listener (prints as blank lines). */}
      <div style={{ marginTop: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <span className="field-label" style={{ marginBottom: 0 }}>Notes</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <IconButton aria-label="Fewer note lines" onClick={() => setNotesLines(extras.notesLines - 1)} disabled={extras.notesLines <= 0} style={{ fontSize: "12px", padding: "2px 8px" }}>−</IconButton>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-ghost)", minWidth: "56px", textAlign: "center" }}>{extras.notesLines} line{extras.notesLines === 1 ? "" : "s"}</span>
            <IconButton aria-label="More note lines" onClick={() => setNotesLines(extras.notesLines + 1)} disabled={extras.notesLines >= 20} style={{ fontSize: "12px", padding: "2px 8px" }}>+</IconButton>
          </span>
        </div>
        <div aria-hidden="true">
          {Array.from({ length: extras.notesLines }).map((_, i) => (
            <div key={i} style={{ borderBottom: "1px solid var(--parchment-deep)", height: "22px" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── "How this works" front door ───────────────────────────────────────────────
// Pure copy — no AI, no DB. Orients the three screens (Outline · Schedule ·
// Study guide). Auto-opens once per series (write-only localStorage flag) and
// stays re-readable forever via the topbar button.
function SeriesHowItWorksModal({ onClose, kind }) {
  const dialogRef = useModalA11y(onClose);
  const isTopical = kind === "topical";
  const screens = isTopical ? [
    { name: "Outline", body: "Name the theme this series gathers, then add a sermon for each passage — from any book — that sounds it. Put them in the order you'll preach. Every sermon holds a passage, a working title, a one-line big idea, and a short overview." },
    { name: "Schedule", body: "Lay each sermon on a Sunday. Liturgical seasons and your special-date notes ride along. Dates save as you go — the Schedule is the one place they live." },
    { name: "Study guide", body: "Build a congregational booklet from your outline — an introduction and a page per sermon. Add questions, cross-references, and quotes; export to Word." },
  ] : [
    { name: "Outline", body: "Plan the book from the top down in three labeled levels — Book, Section, and the Sermons inside each section. Every level holds a title and passage range, a one-line big idea, and a short overview." },
    { name: "Schedule", body: "Lay each sermon on a Sunday. Liturgical seasons and your special-date notes ride along. Dates save as you go — the Schedule is the one place they live." },
    { name: "Study guide", body: "Build a congregational booklet from your outline — an introduction, a part per section, and a page per sermon. Add questions, cross-references, and quotes; export to Word." },
  ];
  const intro = isTopical
    ? "Gather a theme into one series — a Big Idea, then a sermon for each passage (from any book) that sounds it. A sermon is one passage on one Sunday. Three screens:"
    : "Plan a book as one nested outline at three levels — Book ▸ Section ▸ Sermon — where every level is the same unit: a title and range, a one-line big idea, and an overview. A sermon is one passage on one Sunday. Three screens:";
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "640px" }} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="series-how-title">
        <div className="modal-header">
          <h2 className="modal-title" id="series-how-title">How the Series Planner works</h2>
          <IconButton aria-label="Close how-this-works modal" className="modal-close" onClick={onClose}>×</IconButton>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: "14px", color: "var(--ink-soft)", marginBottom: "20px", fontFamily: "var(--font-serif)", lineHeight: 1.6 }}>
            {intro}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {screens.map((s, i) => (
              <div key={s.name} style={{ display: "flex", gap: "12px" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
                  background: "var(--gold)", color: "var(--white)",
                  fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "13px",
                }}>{i + 1}</span>
                <div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "15px", fontWeight: 600, color: "var(--ink)" }}>{s.name}</div>
                  <div style={{ fontSize: "13.5px", color: "var(--ink-soft)", marginTop: "2px", lineHeight: 1.55 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
