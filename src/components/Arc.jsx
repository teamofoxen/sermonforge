import { useState, useEffect } from "react";
import { getAllSeries, getAllSermons, getSeriesSermonCounts } from "../core/spine";
import { GENRES } from "../data/canonicalBooks";
import { toDateString } from "../utils/churchCalendar";
import { buttonKeydown } from "../utils/buttonKeydown";
import { computeArc } from "../utils/arc";
import { parseLocalDate } from "../utils";
import EmptyState from "./primitives/EmptyState";

// Series Arc — the cross-series planning-retreat view, and the "By book" lens of
// the "What I've Preached" home (embeddable via the `embedded` prop). Reads ALL
// series and shows them on one timeline (with the empty Sundays between them)
// plus a deterministic balance read over a trailing window: which of the 7 Dever
// genres are touched vs missing, the OT:NT split, and how many sermons are still
// unclassified. The balance is counted PER SERMON — each sermon's effective book
// is `sermon.book_id ?? series.book_id` (`computeArc`), so a topical series' many
// books all count. The one view a single-series design can't have. AI-free.

const WINDOW_OPTIONS = [12, 24, 36];

function formatMonthYear(iso) {
  if (!iso) return null;
  return parseLocalDate(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDateRange(start, end) {
  const s = formatMonthYear(start);
  const e = formatMonthYear(end);
  if (!s && !e) return "undated";
  if (s && e) return s === e ? s : `${s} – ${e}`;
  return s || e;
}

function formatGap(days) {
  if (days == null) return "—";
  if (days < 0) return `${-days}d overlap`;
  return `${days}d`;
}

// `embedded` suppresses the standalone page-header so the Arc can render as the
// "By book" lens inside the What I've Preached home (which owns the header + the
// By book / By topic tabs). Default false keeps the isolated ?arc preview intact.
export default function Arc({ onOpenPlanner, _fixture, embedded = false }) {
  const [series, setSeries] = useState(_fixture ? _fixture.series || [] : []);
  const [sermons, setSermons] = useState(_fixture ? _fixture.sermons || [] : []);
  const [counts, setCounts] = useState(_fixture ? _fixture.counts || {} : {});
  const [loading, setLoading] = useState(!_fixture);
  const [windowMonths, setWindowMonths] = useState(24);

  useEffect(() => { if (!_fixture) load(); }, []);

  async function load() {
    try {
      const [all, serms, c] = await Promise.all([getAllSeries(), getAllSermons(), getSeriesSermonCounts()]);
      setSeries(all);
      setSermons(serms || []);
      setCounts(c || {});
    } catch (e) {
      console.error("Arc load error:", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading…</div>
      </div>
    );
  }

  const arc = computeArc(series, sermons, { nowISO: toDateString(new Date()), windowMonths });

  return (
    <>
      {!embedded && (
        <div className="page-header">
          <h1 className="page-title">Series Arc</h1>
          <p className="page-subtitle">How your series balance across the canon over time</p>
        </div>
      )}

      <div className="page-body">
        {series.length === 0 ? (
          <EmptyState
            icon="🗺️"
            title="No series yet"
            description="Once you've planned a few series, this view shows them on one timeline with a balance read across the canon."
          />
        ) : (
          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Timeline table */}
            <div className="card" style={{ flex: "1 1 520px", minWidth: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--ink-ghost)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th style={{ padding: "6px 10px" }}>Series</th>
                    <th style={{ padding: "6px 10px" }}>Book</th>
                    <th style={{ padding: "6px 10px" }}>Genre</th>
                    <th style={{ padding: "6px 10px" }}>Testament</th>
                    <th style={{ padding: "6px 10px" }}>Dates</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Slots</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Gap&nbsp;to&nbsp;next</th>
                  </tr>
                </thead>
                <tbody>
                  {arc.rows.map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--parchment-deep)" }}>
                      <td style={{ padding: "9px 10px", fontFamily: "var(--font-serif)", color: "var(--ink)" }}>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => onOpenPlanner && onOpenPlanner(r.id)}
                          onKeyDown={buttonKeydown(() => onOpenPlanner && onOpenPlanner(r.id))}
                          style={{ cursor: "pointer", borderBottom: "1px dotted var(--ink-ghost)" }}
                        >
                          {r.title}
                        </span>
                      </td>
                      <td style={{ padding: "9px 10px", color: "var(--ink-soft)" }}>{r.bookName || "—"}</td>
                      <td
                        title={r.genres.length > 1 ? r.genres.map((g) => GENRES[g]).join(" · ") : undefined}
                        style={{ padding: "9px 10px", color: r.genres.length ? "var(--ink-soft)" : "var(--ink-ghost)" }}
                      >
                        {r.genreLabel}
                      </td>
                      <td style={{ padding: "9px 10px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{r.testament || "—"}</td>
                      <td style={{ padding: "9px 10px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{formatDateRange(r.startDate, r.endDate)}</td>
                      <td style={{ padding: "9px 10px", textAlign: "right", color: "var(--ink-soft)" }}>{counts[r.id] || 0}</td>
                      <td style={{ padding: "9px 10px", textAlign: "right", color: "var(--ink-ghost)", whiteSpace: "nowrap" }}>{formatGap(r.gapToNextDays)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Balance sidebar */}
            <div className="card" style={{ flex: "0 0 260px", maxWidth: "100%" }}>
              <div className="card-header" style={{ marginBottom: "12px" }}>
                <h2 className="card-title">Balance</h2>
                <select
                  className="field-input"
                  aria-label="Trailing window"
                  value={windowMonths}
                  onChange={(e) => setWindowMonths(Number(e.target.value))}
                  style={{ width: "auto", fontSize: "12px", padding: "4px 8px" }}
                >
                  {WINDOW_OPTIONS.map((m) => <option key={m} value={m}>{m} mo</option>)}
                </select>
              </div>

              <div style={{ fontSize: "11px", color: "var(--ink-ghost)", marginBottom: "10px" }}>
                {arc.inWindowCount} series · {arc.inWindowSermonCount} sermons in the last {windowMonths} months. The
                balance below counts each sermon's book, so a topical series shows its full spread. Dever's goal is
                every genre over ~2 years.
              </div>

              {/* 7-genre touched / missing */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "14px" }}>
                {Object.entries(GENRES).map(([key, label]) => {
                  const touched = arc.genresTouched.includes(key);
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: touched ? "var(--ink)" : "var(--ink-ghost)" }}>
                      <span aria-hidden="true" style={{ color: touched ? "var(--sage)" : "var(--ink-ghost)", fontWeight: 700 }}>
                        {touched ? "✓" : "○"}
                      </span>
                      {label}
                    </div>
                  );
                })}
              </div>

              {/* OT : NT */}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--parchment-deep)", fontSize: "12.5px", color: "var(--ink-soft)" }}>
                <span>OT : NT</span>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{arc.otCount} : {arc.ntCount}</span>
              </div>

              {/* Unclassified — whole-list scope (unlike the windowed rows above) */}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--parchment-deep)", fontSize: "12.5px", color: "var(--ink-soft)" }}>
                <span>Unclassified <span style={{ color: "var(--ink-ghost)", fontSize: "11px" }}>(all sermons)</span></span>
                <span style={{ fontWeight: 600, color: arc.unclassifiedCount ? "var(--crimson)" : "var(--ink)" }}>{arc.unclassifiedCount}</span>
              </div>
              {arc.unclassifiedCount > 0 && (
                <div style={{ fontSize: "11px", color: "var(--ink-ghost)", marginTop: "4px" }}>
                  Pick a book to classify — the series' book, or per sermon in a topical series.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
