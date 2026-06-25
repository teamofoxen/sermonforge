import { useState, useEffect, useRef } from "react";
import { createSermon, getAllSeries, getSermonsBySeries } from "../core/spine";
import mapError from "../utils/mapError";
import { useModalA11y } from "../utils/useModalA11y";
import { buttonKeydown } from "../utils/buttonKeydown";
import InlineError from "./InlineError";
import { SERIES_STATUS } from "../core/contracts";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";

// Readable date for a planned unit row (no Date object, no new dependency).
function shortDate(iso) {
  if (!iso) return "Undated";
  const [y, m, d] = String(iso).split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const label = months[Number(m) - 1];
  return label ? `${label} ${Number(d)}, ${y}` : iso;
}

// Two ways to start work on a sermon:
//  • "standalone" — forge a brand-new one-off sermon (title / passage / date).
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

  // Standalone fields.
  const [title, setTitle] = useState("");
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
  const titleRef = useRef(null);

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
  // overlay. Respects the title input's autoFocus in standalone mode.
  const dialogRef = useModalA11y(onClose);

  async function handleForge() {
    if (saving) return;
    if (!title.trim()) {
      setError("Give the sermon a title first — everything else can wait.");
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Standalone only: a one-off sermon, no series. Series sermons are planned
      // in the Series Planner and OPENED here — never created in this modal.
      const result = await createSermon({ name: title, passage, date, series_id: null, is_one_off: 1 });
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
                <label className="field-label">Title *</label>
                <input
                  ref={titleRef}
                  className="field-input"
                  placeholder="Sermon title…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="field-group">
                <label className="field-label">Passage</label>
                <input
                  className="field-input"
                  placeholder="e.g. Romans 8:1-17"
                  value={passage}
                  onChange={(e) => setPassage(e.target.value)}
                />
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
                              {shortDate(u.date)}
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
