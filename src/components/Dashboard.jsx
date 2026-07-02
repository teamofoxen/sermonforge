import { useState, useEffect } from "react";
import { loadSampleSermon, getInProgressSermons, getAllSermons, deleteSermon, restoreSermon, updateSermon } from "../core/spine";
import { buttonKeydown } from "../utils/buttonKeydown";
import { SERMON_STATUS, VIEW } from "../core/contracts";
import NewSermonModal from "./NewSermonModal";
import DashboardVerseCarousel from "./DashboardVerseCarousel";
import DashboardPreacherQuote from "./DashboardPreacherQuote";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import TextButton from "./primitives/TextButton";
import DeleteButton from "./primitives/DeleteButton";
import InlineError from "./InlineError";
import mapError from "../utils/mapError";
import { formatDate } from "../utils";

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function Dashboard({ onOpenSermon, onNavigate, deletedSermonNotice, onClearDeletedSermonNotice }) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [sampleError, setSampleError] = useState(null);
  const [inProgress, setInProgress] = useState([]);
  // Preached count — finished work must stay findable from the front door
  // (State #6 in spirit): one quiet row, not a stats surface (the locked
  // dashboard principle is re-entry, not aggregates).
  const [preachedCount, setPreachedCount] = useState(0);

  // State Contract #6: in-progress work is queryable from the front door.
  // Pilot B.3 closes the surface gap by reading spine.getInProgressSermons()
  // and rendering a Resume Work panel here. Sermons whose delivery date has
  // passed but stage is still in_progress are visually flagged as a
  // return-day reminder — covers the case where the preacher delivered the
  // sermon but never came back to mark it complete.
  useEffect(() => {
    let cancelled = false;
    getInProgressSermons()
      .then((rows) => { if (!cancelled) setInProgress(rows || []); })
      .catch((e) => console.error("[Dashboard] getInProgressSermons failed:", e));
    getAllSermons()
      .then((rows) => {
        if (!cancelled) {
          setPreachedCount((rows || []).filter((s) => s.stage === SERMON_STATUS.Complete).length);
        }
      })
      .catch((e) => console.error("[Dashboard] getAllSermons failed:", e));
    return () => { cancelled = true; };
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = inProgress.filter((s) => s.date && s.date < today);
  const upcoming = inProgress.filter((s) => !s.date || s.date >= today);

  // v24 soft-delete: the row swaps to a settled "Deleted · Undo" note
  // instead of vanishing (same visibility rule as Mark preached).
  const [deletedIds, setDeletedIds] = useState(() => new Set());
  async function handleDeleteSermon(id) {
    await deleteSermon(id);
    setDeletedIds((prev) => new Set(prev).add(id));
  }
  async function handleUndoDelete(id) {
    await restoreSermon(id);
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // Undo for a workspace-originated delete (audit M3). deletedSermonNotice
  // is data the just-closed SermonWorkspace handed App.jsx — it can't be
  // recovered from deletedIds because this Dashboard instance remounted
  // fresh on close and never fetched the (now-tombstoned) sermon itself.
  async function handleUndoWorkspaceDelete(id) {
    await restoreSermon(id);
    onClearDeletedSermonNotice?.();
  }

  // Return-day reminders resolve in ONE click, right here. The row swaps to a
  // settled note instead of vanishing, so the act is visible (Mutation #3
  // spirit: lifecycle events are events, not silent disappearances).
  const [preachedIds, setPreachedIds] = useState(() => new Set());
  async function handleMarkPreached(id) {
    await updateSermon(id, { stage: SERMON_STATUS.Complete });
    setPreachedIds((prev) => new Set(prev).add(id));
    // Keep the "N preached sermons" row honest without a refetch.
    setPreachedCount((c) => c + 1);
  }

  async function openSampleSermon(fresh = false) {
    if (loadingSample) return;
    setLoadingSample(true);
    setSampleError(null);
    try {
      const result = await loadSampleSermon({ fresh });
      if (result?.sermonId && onOpenSermon) {
        onOpenSermon(result.sermonId);
      }
    } catch (e) {
      console.error("Failed to open sample sermon:", e);
      setSampleError(mapError(e, "sample"));
    } finally {
      setLoadingSample(false);
    }
  }

  return (
    <>
      <DashboardVerseCarousel />

      <div className="page-body dash-page-body">
        <div className="dash-content">
          <div className="dash-grid">
            {/* HERO — Build a sermon */}
            <div
              className="dash-tile tile-hero"
              onClick={() => setShowNewModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowNewModal(true);
                }
              }}
            >
              <div className="tile-eyebrow is-primary">Begin&nbsp;work</div>
              <h2 className="tile-title">
                Build a sermon.
              </h2>
              <p className="tile-blurb">
                Study the passage, shape the main point, and write the sermon.
              </p>
              <div className="tile-actions">
                <PrimaryButton
                  className="btn-hero"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewModal(true);
                  }}
                >
                  Build sermon <ArrowRightIcon />
                </PrimaryButton>
              </div>
            </div>

            {/* RESUME WORK — State Contract #6 surface integration. */}
            <ResumeWorkTile
              overdue={overdue}
              upcoming={upcoming}
              onOpenSermon={onOpenSermon}
              onDeleteSermon={handleDeleteSermon}
              onUndoDelete={handleUndoDelete}
              onMarkPreached={handleMarkPreached}
              preachedIds={preachedIds}
              deletedIds={deletedIds}
              preachedCount={preachedCount}
              onOpenPreached={onNavigate ? () => onNavigate(VIEW.CompletedSermons) : undefined}
              deletedSermonNotice={deletedSermonNotice}
              onUndoWorkspaceDelete={handleUndoWorkspaceDelete}
            />

            {/* EXPLORE — orientation paths for new pastors. */}
            <div className="dash-tile tile-secondary">
              <div className="tile-eyebrow">Look&nbsp;around</div>
              <h3 className="tile-title">Explore SermonForge.</h3>
              <div className="dash-rows">
                <ExploreRow
                  label="Open a sample sermon"
                  meta="Romans 5:1-5 · Worked example"
                  loading={loadingSample}
                  disabled={loadingSample}
                  onClick={() => openSampleSermon()}
                />
                {/* The sample is a sandbox — opening it again returns it as
                    the pastor left it. Resetting it is destructive (any
                    typing left in the sample is discarded), so it goes
                    through the app's canonical two-step confirm rather
                    than firing on a single click. */}
                <div className="dash-row-aux">
                  <DeleteButton
                    small
                    label="Start the sample fresh"
                    confirmLabel="Start the sample fresh? Any typing you left in the sample sermon will be gone."
                    onDelete={() => openSampleSermon(true)}
                  />
                </div>
                {sampleError && (
                  <InlineError onDismiss={() => setSampleError(null)}>
                    {sampleError}
                  </InlineError>
                )}
              </div>
            </div>
          </div>

          <DashboardPreacherQuote />
        </div>
      </div>

      {showNewModal && (
        <NewSermonModal
          onClose={() => setShowNewModal(false)}
          onCreated={(id) => {
            setShowNewModal(false);
            onOpenSermon(id);
          }}
        />
      )}
    </>
  );
}

// ── Resume Work tile ──────────────────────────────────────────────────────────
//
// State Contract #6 surface: the Dashboard's answer to "what am I currently
// working on." Two sections:
//
//   1. Return-day reminder — sermons whose date has passed but stage is
//      still in_progress. Highlighted with a crimson left-border, and
//      resolvable RIGHT HERE with an inline "Mark preached" button (the
//      workspace's finish screen carries the same action; the old comment
//      claiming a workspace "Mark Complete button" described a control
//      that never existed — the audit's dead-end #2).
//   2. Resume — in-progress sermons with future or no date, ordered as the
//      spine returned them.
//
// When the preacher has nothing in flight, the tile renders an empty-state
// pointing back to the hero "Build a sermon" tile.

function ResumeWorkTile({ overdue, upcoming, onOpenSermon, onDeleteSermon, onUndoDelete, onMarkPreached, preachedIds, deletedIds, preachedCount, onOpenPreached, deletedSermonNotice, onUndoWorkspaceDelete }) {
  const isEmpty = overdue.length === 0 && upcoming.length === 0;

  // One quiet row — finished work stays findable from the front door
  // without turning the tile into a stats surface. Matters most when the
  // tile is otherwise empty (everything preached = nothing "in flight").
  const preachedRow = preachedCount > 0 && onOpenPreached ? (
    <div
      className="dash-row"
      role="button"
      tabIndex={0}
      onClick={onOpenPreached}
      onKeyDown={buttonKeydown(onOpenPreached)}
    >
      <div className="dash-row-body">
        <div className="dash-row-title">
          {preachedCount} preached {preachedCount === 1 ? "sermon" : "sermons"}
        </div>
      </div>
      <span className="dash-row-arr" aria-hidden="true">→</span>
    </div>
  ) : null;

  // Workspace-originated delete (audit M3): renders the same settled
  // "Deleted · Undo" row list-originated deletes get, reusing ResumeRow's
  // deleted-state markup exactly. Leads the list — it's the pastor's most
  // recent action — and must show even when the tile is otherwise empty
  // (the sermon just left "in flight," which is exactly why it's not in
  // overdue/upcoming any more).
  const deletedNoticeRow = deletedSermonNotice ? (
    <ResumeRow
      key={`deleted-notice-${deletedSermonNotice.id}`}
      sermon={deletedSermonNotice}
      onUndoDelete={onUndoWorkspaceDelete}
      deleted
    />
  ) : null;

  return (
    <div className="dash-tile tile-secondary">
      <div className="tile-eyebrow">Resume&nbsp;work</div>
      <h3 className="tile-title">Where you left off.</h3>

      {isEmpty ? (
        <>
          {!deletedNoticeRow && (
            <p className="tile-blurb" style={{ marginTop: "8px" }}>
              Nothing in flight. Start a sermon when you're ready.
            </p>
          )}
          {(deletedNoticeRow || preachedRow) && (
            <div className="dash-rows">
              {deletedNoticeRow}
              {preachedRow}
            </div>
          )}
        </>
      ) : (
        <div className="dash-rows">
          {deletedNoticeRow}
          {overdue.map((s) => (
            <ResumeRow
              key={s.id}
              sermon={s}
              onOpen={onOpenSermon}
              onDelete={onDeleteSermon}
              onUndoDelete={onUndoDelete}
              onMarkPreached={onMarkPreached}
              settled={preachedIds?.has(s.id)}
              deleted={deletedIds?.has(s.id)}
              flagged
            />
          ))}
          {upcoming.map((s) => (
            <ResumeRow
              key={s.id}
              sermon={s}
              onOpen={onOpenSermon}
              onDelete={onDeleteSermon}
              onUndoDelete={onUndoDelete}
              deleted={deletedIds?.has(s.id)}
            />
          ))}
          {preachedRow}
        </div>
      )}
    </div>
  );
}

function ResumeRow({ sermon, onOpen, onDelete, onUndoDelete, onMarkPreached, settled, deleted, flagged }) {
  if (deleted) {
    return (
      <div className="dash-row">
        <div className="dash-row-body">
          <div className="dash-row-title">{sermon.title || "Untitled"}</div>
          <div className="dash-row-meta">Deleted.</div>
        </div>
        <TextButton size="sm" onClick={(e) => { e.stopPropagation(); onUndoDelete?.(sermon.id); }}>
          Undo
        </TextButton>
      </div>
    );
  }
  if (settled) {
    return (
      <div className="dash-row">
        <div className="dash-row-body">
          <div className="dash-row-title">{sermon.title || "Untitled"}</div>
          <div className="dash-row-meta">Preached — find it under Preached Sermons.</div>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`dash-row${flagged ? " is-overdue" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(sermon.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(sermon.id);
        }
      }}
    >
      <div className="dash-row-body">
        <div className="dash-row-title">{sermon.title || "Untitled"}</div>
        <div className="dash-row-meta">
          {flagged ? (
            <>
              <span className="flag">Past its date — preached?</span>
              {sermon.date && <><span className="sep">·</span>{formatDate(sermon.date)}</>}
            </>
          ) : (
            <>
              {sermon.passage || "—"}
              {sermon.date && <><span className="sep">·</span>{formatDate(sermon.date)}</>}
              {sermon.series_title && <><span className="sep">·</span>{sermon.series_title}</>}
            </>
          )}
        </div>
      </div>
      {flagged && onMarkPreached && (
        <SecondaryButton
          size="sm"
          style={{ fontSize: "11px", flexShrink: 0 }}
          title="Move this sermon to Preached Sermons"
          onClick={(e) => {
            e.stopPropagation();
            onMarkPreached(sermon.id);
          }}
        >
          Mark preached
        </SecondaryButton>
      )}
      <span className="dash-row-arr" aria-hidden="true">→</span>
      {onDelete && (
        <DeleteButton small onDelete={() => onDelete(sermon.id)} />
      )}
    </div>
  );
}

function ExploreRow({ label, meta, loading, disabled, onClick }) {
  return (
    <div
      className="dash-row"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onClick={() => { if (!disabled) onClick?.(); }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled && !loading ? 0.5 : 1,
      }}
    >
      <div className="dash-row-body">
        <div className="dash-row-title">{loading ? "Loading…" : label}</div>
        {meta && !loading && <div className="dash-row-meta">{meta}</div>}
      </div>
      <span className="dash-row-arr" aria-hidden="true">→</span>
    </div>
  );
}
