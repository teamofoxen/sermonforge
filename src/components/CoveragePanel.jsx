import { computeCoverage } from "../utils/coverage";
import { bookById } from "../data/canonicalBooks";
import TextButton from "./primitives/TextButton";

// Shared coverage readout for a BOOK series — the deterministic, AI-free picture
// of how the sermons partition the book (src/utils/coverage.js): percent covered,
// gaps, overlaps, out-of-order sermons, unreadable refs. Extracted from
// SeriesPlanner as its own file; the Schedule is its one home (the 2026-07-22
// simplification removed it from the Discover walk — Discovery carries no coverage
// or scoring surface). Purely informational — it exposes the pastor's own work; it
// never gates. Hidden for topical series by the caller (a many-book theme has no
// single book to measure).

// The coverage meter — a track with a sage fill at `percent`.
export function CoverageBar({ percent, animate = false }) {
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
// unreadable passage refs. Clamped to the declared passage_range when it parses.
// `onNavigate` (optional) powers the "pick a book" empty-state link.
export default function CoveragePanel({ series, sermons, onNavigate }) {
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
