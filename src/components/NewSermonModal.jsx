import { useState, useEffect } from "react";
import { createSermon, updateSermon, getAllSeries, getSermonsBySeries } from "../core/spine";
import { bookById } from "../data/canonicalBooks";
import { composePassage, refFromPassage, repointPassage } from "../utils/topicalPassage";
import { parsePassageRef } from "../utils/passageRef";
import BookSelect from "./BookSelect";
import mapError from "../utils/mapError";
import { useModalA11y } from "../utils/useModalA11y";
import { buttonKeydown } from "../utils/buttonKeydown";
import { formatDate } from "../utils";
import InlineError from "./InlineError";
import { SERIES_STATUS } from "../core/contracts";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";

// Two ways to start work on a sermon:
//  • "standalone" — forge a brand-new one-off sermon. It's anchored on the
//    PASSAGE, not a title: pick the Book (the tracked book_id, mirroring the New
//    Series book picker) + a chapter:verse, set the Sunday. No title is asked —
//    the workspace has no titling moment for a standalone sermon, so it stays
//    named by its passage permanently, by design.
//  • "series" — open a sermon already PLANNED in the Series Planner. Those units
//    are real sermon rows; clicking one OPENS it for prep. Nothing is created
//    here, so the planner stays the single place series sermons are born — no
//    duplicate rows. onCreated(id) is the shared "close + open this sermon in the
//    workspace" callback every launch site passes; "series" mode reuses it to
//    open an existing unit (same navigation, no new prop across the call sites).
// initialDate (optional, "YYYY-MM-DD") pre-fills the standalone Date — the
// Calendar's day-click passes the clicked day.
export default function NewSermonModal({ onClose, onCreated, initialDate = "" }) {
  const [mode, setMode] = useState("standalone");

  // Standalone fields. The passage is authored STRUCTURALLY — a Book picker + a
  // chapter:verse ref compose the single `passage` string (composePassage),
  // exactly like the Series Planner's topical sermon rows, so book_id and passage
  // can't disagree. There is no title field on purpose (see the header comment):
  // State Contract #3 ("no anonymous atoms") is still satisfied because the
  // composed passage becomes the sermon's name.
  const [bookId, setBookId] = useState("");
  const [passage, setPassage] = useState("");
  const [date, setDate] = useState(initialDate);

  // Series mode.
  const [seriesId, setSeriesId] = useState("");
  const [seriesList, setSeriesList] = useState([]);
  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load series once; pre-select when exactly one is in progress so "From a
  // series" lands on the obvious one.
  useEffect(() => {
    getAllSeries()
      .then((list) => {
        setSeriesList(list);
        const inProgress = list.filter((s) => s.status === SERIES_STATUS.InProgress);
        if (inProgress.length === 1) setSeriesId(inProgress[0].id);
      })
      .catch(console.error)
      .finally(() => setSeriesLoaded(true));
  }, []);

  // Load a series' planned units whenever one is chosen in "From a series".
  useEffect(() => {
    if (mode !== "series" || !seriesId) { setUnits([]); return; }
    let live = true;
    setUnitsLoading(true);
    getSermonsBySeries(seriesId)
      .then((list) => { if (live) setUnits(list); })
      .catch((e) => { console.error(e); if (live) setUnits([]); })
      .finally(() => { if (live) setUnitsLoading(false); });
    return () => { live = false; };
  }, [mode, seriesId]);

  // Escape + focus trap + focus restore + dialog ARIA — same as every sibling
  // overlay. Respects the book select's autoFocus in standalone mode.
  const dialogRef = useModalA11y(onClose);

  // Structured passage authoring (mirrors the topical sermon rows): the Book and
  // the chapter:verse field both recompose the single `passage` string, so book_id
  // and passage can never drift apart. repointPassage drops ANY leading book name
  // before recomposing, so re-picking a book never doubles the name.
  function onPickBook(newBookId) {
    setBookId(newBookId);
    setPassage((prev) => repointPassage(prev, newBookId));
  }
  function onRefChange(ref) {
    setPassage(composePassage(bookId, ref));
  }
  const refText = refFromPassage(passage, bookId);
  const refUnreadable =
    !!bookId && refText.trim() !== "" && parsePassageRef(passage, bookId).error === true;

  async function handleForge() {
    if (saving) return;
    if (!bookId) {
      setError("Pick the book you're preaching — the passage names the sermon.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Standalone only: a one-off sermon, no series. Series sermons are planned
      // in the Series Planner and OPENED here — never created in this modal. The
      // composed passage IS the sermon's name (State #3) — permanently, there's
      // no later titling moment. book_id rides a create-then-update follow-up (the
      // create-sermon INSERT is never widened), mirroring the planner's commitDraft;
      // a failed book write is recoverable in the workspace, so it never strands
      // the pastor on an error with a half-made sermon.
      const name = passage.trim() || bookById(bookId)?.name || "";
      const result = await createSermon({ name, passage, date, series_id: null, is_one_off: 1 });
      try {
        await updateSermon(result.id, { book_id: bookId });
      } catch (bookErr) {
        console.error("standalone sermon book_id write failed (recoverable in workspace):", bookErr);
      }
      onCreated(result.id);
    } catch (e) {
      console.error(e);
      // Raw spine/IPC strings ("UNIQUE constraint failed", "Error invoking
      // remote method…") never reach the pastor — mapError speaks instead.
      setError(mapError(e, "create"));
    } finally {
      setSaving(false);
    }
  }

  // Schedule order: dated units first (ascending), then undated in reading order.
  const orderedUnits = [...units].sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });

  const modeBtnStyle = (active) => ({
    flex: 1,
    ...(active ? { borderColor: "var(--gold)", color: "var(--gold)", fontWeight: 600 } : {}),
  });

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="new-sermon-title">
        <div className="modal-header">
          <h2 className="modal-title" id="new-sermon-title">Build a sermon</h2>
          <IconButton aria-label="Close" className="modal-close" onClick={onClose}>×</IconButton>
        </div>

        <div className="modal-body">
          <div className="field-group">
            <div style={{ display: "flex", gap: "8px" }}>
              <SecondaryButton size="sm" aria-pressed={mode === "standalone"} onClick={() => { setMode("standalone"); setError(null); }} style={modeBtnStyle(mode === "standalone")}>
                New sermon
              </SecondaryButton>
              <SecondaryButton size="sm" aria-pressed={mode === "series"} onClick={() => { setMode("series"); setError(null); }} style={modeBtnStyle(mode === "series")}>
                From a series
              </SecondaryButton>
            </div>
          </div>

          {mode === "standalone" ? (
            <>
              <div className="field-group">
                <label className="field-label" htmlFor="new-sermon-book">Book *</label>
                <BookSelect id="new-sermon-book" value={bookId} onChange={(e) => onPickBook(e.target.value)} autoFocus />
              </div>

              <div className="field-group">
                <label className="field-label">Chapter:verse</label>
                <input
                  className="field-input"
                  style={{ fontFamily: "var(--font-mono)" }}
                  placeholder="e.g. 8:1-17"
                  value={refText}
                  onChange={(e) => onRefChange(e.target.value)}
                />
                {refUnreadable && (
                  <div style={{ marginTop: "5px", fontSize: "12px", color: "var(--crimson-soft)", fontFamily: "var(--font-mono)" }}>
                    Couldn't read this reference — check the chapter:verse.
                  </div>
                )}
                <p className="field-caption">
                  The book and chapter:verse are the passage you're preaching —
                  the passage names the sermon, and that's how it stays named.
                </p>
              </div>

              <div className="field-group">
                <label className="field-label">Date</label>
                <input
                  className="field-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <p className="field-caption">
                  The Sunday you plan to preach it. SermonForge uses this to sort
                  your sermons and nudge you on the dashboard once the date passes.
                </p>
              </div>
            </>
          ) : (
            <>
              {seriesLoaded && seriesList.length === 0 ? (
                <div style={{ padding: "16px", background: "var(--parchment-warm)", borderRadius: "var(--radius)", textAlign: "center", color: "var(--ink-ghost)", fontSize: "13px", fontFamily: "var(--font-serif)" }}>
                  No series yet. Create one in the Series Planner to plan a book or season of sermons.
                </div>
              ) : (
                <>
                  <div className="field-group">
                    <label className="field-label" htmlFor="new-sermon-series">Series</label>
                    <select
                      id="new-sermon-series"
                      className="field-input"
                      value={seriesId}
                      onChange={(e) => setSeriesId(e.target.value)}
                    >
                      <option value="">— Select series —</option>
                      {seriesList.map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                    <p className="field-caption">
                      Pick a planned sermon below to open it for prep. Plan or re-order sermons in the Series Planner.
                    </p>
                  </div>

                  {seriesId && (
                    unitsLoading ? (
                      <p className="field-caption">Loading…</p>
                    ) : orderedUnits.length === 0 ? (
                      <div style={{ padding: "16px", background: "var(--parchment-warm)", borderRadius: "var(--radius)", textAlign: "center", color: "var(--ink-ghost)", fontSize: "13px", fontFamily: "var(--font-serif)" }}>
                        No sermons planned in this series yet. Plan them in the Series Planner first.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {orderedUnits.map((u) => (
                          <div
                            key={u.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onCreated(u.id)}
                            onKeyDown={buttonKeydown(() => onCreated(u.id))}
                            title="Open this sermon for prep"
                            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)", background: "var(--white)", cursor: "pointer" }}
                          >
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink-soft)", minWidth: "92px" }}>
                              {u.passage || <span style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>No passage</span>}
                            </span>
                            <span style={{ flex: 1, fontSize: "14px", color: u.title ? "var(--ink)" : "var(--ink-ghost)", fontStyle: u.title ? "normal" : "italic" }}>
                              {u.title || "Untitled"}
                            </span>
                            <span style={{ fontSize: "12px", color: "var(--ink-ghost)", whiteSpace: "nowrap" }}>
                              {u.date ? formatDate(u.date) : "Undated"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </>
              )}
            </>
          )}

          {error && <InlineError onDismiss={() => setError(null)}>{error}</InlineError>}
        </div>

        <div className="modal-footer">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          {/* Forge only in standalone mode — "From a series" opens an existing
              planned unit by clicking it (no create), so it has no submit. */}
          {mode === "standalone" && (
            <PrimaryButton onClick={handleForge} disabled={saving}>
              {saving ? "Saving…" : "Forge Sermon"}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
