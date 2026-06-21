import { useState, useEffect } from "react";
import { getAllSeries, deleteSeries, getSermonsBySeries } from "../core/spine";
import { SERIES_STATUS, SERIES_STATUS_LABELS } from "../core/contracts";
import DeleteButton from "./primitives/DeleteButton";
import PrimaryButton from "./primitives/PrimaryButton";
import EmptyState from "./primitives/EmptyState";
import NewSeriesModal from "./NewSeriesModal";

// Series Planning landing — the front door restored after the ARI Phase-0 stub.
// Lists the pastor's series and opens any one into the planner. The whole
// series backend (getAllSeries / createSeries / deleteSeries) is live; this is
// the UI that finally calls it again.

const CANON_LABELS = { ot: "Old Testament", nt: "New Testament", wisdom: "Wisdom", prophetic: "Prophetic", "": "Uncategorized" };
const CANON_COLORS = { ot: "var(--gold)", nt: "var(--sage)", wisdom: "var(--crimson)", prophetic: "var(--slate)", "": "var(--ink-ghost)" };

export default function Planning({ onOpenPlanner }) {
  const [series, setSeries] = useState([]);
  const [sermonCounts, setSermonCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const all = await getAllSeries();
      setSeries(all);
      const counts = {};
      await Promise.all(
        all.map(async (s) => {
          const sermons = await getSermonsBySeries(s.id);
          counts[s.id] = sermons.length;
        })
      );
      setSermonCounts(counts);
    } catch (e) {
      console.error("Planning load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    await deleteSeries(id);
    await load();
  }

  // Canon coverage tallies — a quiet "what have I preached across the canon" read.
  const coverage = { ot: 0, nt: 0, wisdom: 0, prophetic: 0, "": 0 };
  for (const s of series) {
    const cat = s.canon_category || "";
    coverage[cat] = (coverage[cat] || 0) + 1;
  }
  const totalCategorized = coverage.ot + coverage.nt + coverage.wisdom + coverage.prophetic;

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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              {["ot", "nt", "wisdom", "prophetic"].map((cat) => (
                <div key={cat} style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius)",
                  background: "var(--parchment-warm)",
                  borderLeft: `3px solid ${CANON_COLORS[cat]}`,
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
                onDelete={() => handleDelete(s.id)}
              />
            ))}
          </div>
        )}
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
    </>
  );
}

function SeriesCard({ series: s, sermonCount, onOpen, onDelete }) {
  const cat = s.canon_category || "";
  const statusColor = { [SERIES_STATUS.InProgress]: "var(--sage)", [SERIES_STATUS.Complete]: "var(--gold)" };

  return (
    <div
      className="card"
      style={{ cursor: "pointer", position: "relative" }}
      onClick={onOpen}
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
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--ink-soft)", marginBottom: "6px" }}>
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
          {cat && (
            <span style={{ color: CANON_COLORS[cat], fontWeight: "500" }}>{CANON_LABELS[cat]}</span>
          )}
        </div>
        <DeleteButton small confirmLabel="Delete series?" ariaLabel={`Delete ${s.title || "series"}`} onDelete={onDelete} />
      </div>
    </div>
  );
}
