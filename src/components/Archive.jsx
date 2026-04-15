import { useState, useEffect } from "react";
import { getAllSermons, deleteSermon } from "../db/database";
import { formatDate } from "../utils";
import DeleteButton from "./DeleteButton";

export default function Archive({ onOpenSermon }) {
  const [sermons, setSermons] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    getAllSermons()
      .then((data) => setSermons(data.filter((s) => s.stage === "archived")))
      .catch((e) => {
        console.error("[Archive] load failed:", e);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = sermons.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.passage?.toLowerCase().includes(q) ||
      s.series_title?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Archive</h1>
        <p className="page-subtitle">{sermons.length} archived sermon{sermons.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="page-body">
        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-ghost)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            placeholder="Search archived sermons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading…</div>
        ) : loadError ? (
          <div style={{ color: "var(--crimson-soft)", fontStyle: "italic", padding: "40px 0", textAlign: "center" }}>
            Failed to load archived sermons. Check the console for details.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "var(--ink-ghost)", fontStyle: "italic", padding: "40px 0", textAlign: "center" }}>
            {search ? "No archived sermons match your search." : "No archived sermons yet."}
          </div>
        ) : (
          <div className="sermon-grid">
            {filtered.map((sermon) => (
              <div
                key={sermon.id}
                className="sermon-card"
                onClick={() => onOpenSermon(sermon.id)}
              >
                <div className="sermon-card-header">
                  <div className="sermon-card-title">{sermon.title}</div>
                  {sermon.passage && (
                    <span className="sermon-card-passage">{sermon.passage}</span>
                  )}
                </div>
                {sermon.series_title && (
                  <div className="sermon-card-series">{sermon.series_title}</div>
                )}

                <div className="sermon-card-footer">
                  <span>{formatDate(sermon.date)}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="stage-badge stage-archived">archived</span>
                    <DeleteButton
                      small
                      onDelete={async () => {
                        await deleteSermon(sermon.id);
                        setSermons((prev) => prev.filter((s) => s.id !== sermon.id));
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
