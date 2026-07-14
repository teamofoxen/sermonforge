import { useState, useEffect } from "react";
import { getAllSeries, deleteSeries, getSeriesSermonCounts, loadSampleSeries } from "../core/spine";
import { SERIES_STATUS, SERIES_STATUS_LABELS } from "../core/contracts";
import { GENRES } from "../data/canonicalBooks";
import { useModalA11y } from "../utils/useModalA11y";
import { buttonKeydown } from "../utils/buttonKeydown";
import mapError from "../utils/mapError";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import DeleteButton from "./primitives/DeleteButton";
import EmptyState from "./primitives/EmptyState";
import InlineError from "./InlineError";
import NewSeriesModal from "./NewSeriesModal";

// Series Planning landing — the front door restored after the ARI Phase-0 stub.
// Lists the pastor's series and opens any one into the planner. The whole
// series backend (getAllSeries / createSeries / deleteSeries) is live; this is
// the UI that finally calls it again.

// The 7 Dever genres (labels from the canonical module — single source of truth)
// plus an Unclassified state for null/never-set rows. GENRE_KEYS drives the
// coverage tally + grid so a migrated series can't silently fall out of the count.
const GENRE_KEYS = Object.keys(GENRES);
const CANON_LABELS = { ...GENRES, "": "Unclassified" };
// Palette per genre. Built off GENRE_KEYS (+ the "" Unclassified state) so a new
// genre key can't fall through to `3px solid undefined` in the coverage grid — an
// unmapped key gets the neutral ghost color. Single-sources off GENRES the same
// way CANON_LABELS does, instead of a hand-keyed literal that can drift.
const GENRE_PALETTE = {
  ot_law: "var(--gold)", ot_history: "var(--crimson)", ot_writings: "var(--sage)",
  ot_prophets: "var(--slate)", nt_gospels: "var(--gold)", nt_pauline: "var(--sage)",
  nt_general: "var(--crimson)",
};
const CANON_COLORS = Object.fromEntries(
  [...GENRE_KEYS, ""].map((k) => [k, GENRE_PALETTE[k] || "var(--ink-ghost)"]),
);

export default function Planning({ onOpenPlanner }) {
  const [series, setSeries] = useState([]);
  const [sermonCounts, setSermonCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  // Whole-series deletion is irreversible (hard delete of the series + its
  // sections, no undo), so it gets a named, consequence-stating confirm
  // proportional to the loss (Mutation #4 / audit H2) instead of the generic
  // two-step row confirm. pendingDelete holds the series awaiting confirmation.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [sampleError, setSampleError] = useState(null);

  useEffect(() => { load(); }, []);

  // The sample series door — mirrors the Dashboard's sample-sermon flow.
  // Opening it again returns the sandbox as the pastor left it; fresh=true
  // (the two-step "Start the sample series fresh") reseeds it.
  async function openSampleSeries(fresh = false) {
    if (loadingSample) return;
    setLoadingSample(true);
    setSampleError(null);
    try {
      const result = await loadSampleSeries({ fresh });
      if (result?.seriesId) onOpenPlanner(result.seriesId);
    } catch (e) {
      console.error("Failed to open sample series:", e);
      setSampleError(mapError(e, "sampleSeries"));
    } finally {
      setLoadingSample(false);
    }
  }

  async function load() {
    try {
      // One grouped count read instead of an N+1 getSermonsBySeries fan-out.
      const [all, counts] = await Promise.all([getAllSeries(), getSeriesSermonCounts()]);
      setSeries(all);
      setSermonCounts(counts || {});
    } catch (e) {
      console.error("Planning load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    const target = pendingDelete;
    if (!target) return;
    setDeleteError(null);
    try {
      await deleteSeries(target.id);
      setPendingDelete(null);
      await load();
    } catch (e) {
      // A failed delete must speak, not vanish silently (Mutation #5 / audit L3).
      console.error("Planning delete error:", e);
      setDeleteError("That series couldn't be deleted. Try again.");
    }
  }

  // Canon coverage tallies — a quiet "what have I preached across the canon" read,
  // across the 7 genres. Series with no valid genre (null/'' unclassified) are
  // left out of the categorized total, not bucketed into a phantom key.
  const coverage = Object.fromEntries(GENRE_KEYS.map((k) => [k, 0]));
  for (const s of series) {
    const cat = s.canon_category;
    if (cat && coverage[cat] !== undefined) coverage[cat] += 1;
  }
  const totalCategorized = GENRE_KEYS.reduce((sum, k) => sum + coverage[k], 0);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading…</div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="page-title">Series Planning</h1>
            <p className="page-subtitle">Plan a book or theme across a season of sermons</p>
          </div>
          <PrimaryButton onClick={() => setShowNew(true)}>+ New Series</PrimaryButton>
        </div>
      </div>

      <div className="page-body">

        {/* Canon coverage */}
        {totalCategorized > 0 && (
          <div className="card" style={{ marginBottom: "24px" }}>
            <div className="card-header">
              <h2 className="card-title">Biblical Coverage</h2>
              <span style={{ fontSize: "13px", color: "var(--ink-ghost)" }}>{totalCategorized} categorized series</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px" }}>
              {GENRE_KEYS.map((cat) => (
                <div key={cat} style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius)",
                  background: "var(--parchment-warm)",
                  borderLeft: `3px solid ${CANON_COLORS[cat] || "var(--ink-ghost)"}`,
                }}>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: "var(--ink)", fontFamily: "var(--font-serif)" }}>
                    {coverage[cat]}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {CANON_LABELS[cat]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Series grid */}
        {series.length === 0 ? (
          <EmptyState
            icon="📖"
            title="No series yet"
            description="Create your first series to start planning a book or theme across several sermons."
            action={<PrimaryButton onClick={() => setShowNew(true)}>+ New Series</PrimaryButton>}
          />
        ) : (
          <div className="series-grid">
            {series.map((s) => (
              <SeriesCard
                key={s.id}
                series={s}
                sermonCount={sermonCounts[s.id] || 0}
                onOpen={() => onOpenPlanner(s.id)}
                onRequestDelete={() => { setDeleteError(null); setPendingDelete(s); }}
              />
            ))}
          </div>
        )}

        {/* LOOK AROUND — the sample series door (the planner-side sibling of
            the Dashboard's "Open a sample sermon"). Always present, below the
            pastor's own series: a worked example lives where he'd build his
            own, without occupying the primary position ("+ New Series"). The
            sample is seeded with sample- IDs, so it never appears in the grid
            above — this door is the only way in. */}
        <div className="card" style={{ marginTop: "24px" }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-ghost)",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px",
          }}>
            Look around
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "15px", fontWeight: "600", color: "var(--ink)", marginBottom: "4px" }}>
                See a finished plan
              </div>
              <div style={{ fontSize: "13px", color: "var(--ink-soft)", lineHeight: "1.5" }}>
                The Gospel of Luke, planned end to end — four sections, a sermon for every
                Sunday, a study guide to explore. It&rsquo;s a sandbox; it never mixes with your own series.
              </div>
            </div>
            <SecondaryButton
              onClick={() => openSampleSeries()}
              disabled={loadingSample}
              style={{ flexShrink: 0 }}
            >
              {loadingSample ? "Loading…" : "Open the sample series"}
            </SecondaryButton>
          </div>
          {/* Resetting is destructive (any changes made in the sample are
              discarded), so it goes through the app's canonical two-step
              confirm — same as the Dashboard's sample reset. */}
          <div style={{ marginTop: "10px" }}>
            <DeleteButton
              small
              label="Start the sample series fresh"
              confirmLabel="Start the sample series fresh? Any changes you made in the sample series will be gone."
              onDelete={() => openSampleSeries(true)}
            />
          </div>
          {sampleError && (
            <div style={{ marginTop: "10px" }}>
              <InlineError onDismiss={() => setSampleError(null)}>{sampleError}</InlineError>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewSeriesModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            onOpenPlanner(id);
          }}
        />
      )}

      {pendingDelete && (
        <DeleteSeriesModal
          series={pendingDelete}
          sermonCount={sermonCounts[pendingDelete.id] || 0}
          error={deleteError}
          onConfirm={confirmDelete}
          onClose={() => { setPendingDelete(null); setDeleteError(null); }}
        />
      )}
    </>
  );
}

function SeriesCard({ series: s, sermonCount, onOpen, onRequestDelete }) {
  const cat = s.canon_category || "";
  const statusColor = { [SERIES_STATUS.InProgress]: "var(--sage)", [SERIES_STATUS.Complete]: "var(--gold)" };

  return (
    <div
      className="card"
      style={{ cursor: "pointer", position: "relative" }}
      onClick={onOpen}
      // The whole card opens the series; make that reachable by keyboard, not
      // mouse-only (audit M14) — matches the app's other clickable cards.
      role="button"
      tabIndex={0}
      aria-label={`Open ${s.title || "series"}`}
      onKeyDown={buttonKeydown(onOpen)}
    >
      {/* Color accent */}
      <div style={{
        height: "4px", borderRadius: "var(--radius) var(--radius) 0 0",
        background: `var(--${s.color || "gold"})`,
        margin: "-16px -16px 14px -16px",
      }} />

      {/* Title + status */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "15px", fontWeight: "600", color: "var(--ink)", lineHeight: "1.3" }}>
          {s.title}
        </div>
        <span style={{
          fontSize: "11px", padding: "2px 7px", borderRadius: "10px", flexShrink: 0,
          background: "var(--parchment-warm)", color: statusColor[s.status] || "var(--ink-ghost)",
          border: "1px solid var(--parchment-deep)", textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          {SERIES_STATUS_LABELS[s.status] || s.status}
        </span>
      </div>

      {/* Passage range */}
      {s.passage_range && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink-soft)", marginBottom: "6px" }}>
          {s.passage_range}
        </div>
      )}

      {/* Big idea */}
      {s.big_idea && (
        <div style={{ fontSize: "13px", color: "var(--ink-soft)", fontStyle: "italic", lineHeight: "1.4", marginBottom: "10px" }}>
          "{s.big_idea}"
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "10px", borderTop: "1px solid var(--parchment-deep)" }}>
        <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--ink-ghost)" }}>
          <span>{sermonCount} sermon{sermonCount !== 1 ? "s" : ""}</span>
          {s.start_date && <span>{s.start_date.slice(0, 4)}</span>}
          <span style={{ color: s.kind === "topical" ? "var(--gold)" : (CANON_COLORS[cat] || "var(--ink-ghost)"), fontWeight: "500" }}>
            {s.kind === "topical" ? "Topical" : (CANON_LABELS[cat] || "Unclassified")}
          </span>
        </div>
        <SecondaryButton
          size="sm"
          onClick={(e) => { e.stopPropagation(); onRequestDelete(); }}
          title={`Delete ${s.title || "series"}`}
          style={{ fontSize: "12px", padding: "3px 10px", color: "var(--ink-soft)" }}
        >
          Delete
        </SecondaryButton>
      </div>
    </div>
  );
}

// Named, consequence-stating confirm for irreversible whole-series deletion
// (Mutation #4 / audit H2).
function DeleteSeriesModal({ series, sermonCount, error, onConfirm, onClose }) {
  const dialogRef = useModalA11y(onClose);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    if (deleting) return;
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-series-title">
        <div className="modal-header">
          <h2 className="modal-title" id="delete-series-title">Delete this series?</h2>
          <IconButton aria-label="Close" className="modal-close" onClick={onClose}>×</IconButton>
        </div>

        <div className="modal-body">
          <p style={{ fontFamily: "var(--font-serif)", fontSize: "15px", color: "var(--ink)", lineHeight: "1.6", margin: "0 0 10px" }}>
            This permanently deletes <strong>{series.title || "this series"}</strong> — its
            outline, sections, and schedule. <strong>This can&rsquo;t be undone.</strong>
          </p>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: "14px", color: "var(--ink-soft)", lineHeight: "1.6", margin: 0 }}>
            {sermonCount > 0
              ? `Its ${sermonCount} sermon${sermonCount === 1 ? "" : "s"} will keep their content but lose their series — they'll become stand-alone sermons in your library.`
              : "No sermons are attached to this series."}
          </p>
          {error && <div style={{ marginTop: "12px" }}><InlineError>{error}</InlineError></div>}
        </div>

        <div className="modal-footer">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton
            onClick={handleConfirm}
            disabled={deleting}
            style={{ background: "var(--crimson)" }}
          >
            Delete series
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
