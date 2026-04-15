import { useState, useEffect } from "react";
import { getAllSermons, deleteSermon, updateSermon } from "../db/database";
import { formatDate } from "../utils";
import NewSermonModal from "./NewSermonModal";
import DeleteButton from "./DeleteButton";

const FILTER_STAGES = ["all", "planning", "study", "outline", "writing", "ready"];
const SERMON_STAGES = ["planning", "study", "outline", "writing", "ready", "archived"];

export default function SermonList({ onOpenSermon }) {
  const [sermons, setSermons] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllSermons()
      .then((data) => setSermons(data.filter((s) => s.stage !== "archived")))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = sermons.filter((s) => {
    if (filter !== "all" && s.stage !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.title?.toLowerCase().includes(q) ||
        s.passage?.toLowerCase().includes(q) ||
        s.series_title?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="page-title">All Sermons</h1>
            <p className="page-subtitle">{sermons.length} active sermon{sermons.length !== 1 ? "s" : ""}</p>
          </div>
          <button className="btn-primary" onClick={() => setShowNewModal(true)}>
            + New Sermon
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-ghost)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            placeholder="Search by title, passage, or series…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-row">
          {FILTER_STAGES.map((s) => (
            <button
              key={s}
              className={`filter-btn ${filter === s ? "active" : ""}`}
              onClick={() => setFilter(s)}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "var(--ink-ghost)", fontStyle: "italic", padding: "40px 0", textAlign: "center" }}>
            No sermons found.
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
                    <select
                      className={`stage-select stage-${sermon.stage}`}
                      value={sermon.stage}
                      onClick={(e) => e.stopPropagation()}
                      onChange={async (e) => {
                        e.stopPropagation();
                        const newStage = e.target.value;
                        await updateSermon(sermon.id, { stage: newStage });
                        if (newStage === "archived") {
                          setSermons((prev) => prev.filter((s) => s.id !== sermon.id));
                        } else {
                          setSermons((prev) => prev.map((s) => s.id === sermon.id ? { ...s, stage: newStage } : s));
                        }
                      }}
                      style={{ fontSize: "11px", padding: "2px 6px" }}
                    >
                      {SERMON_STAGES.map((st) => (
                        <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
                      ))}
                    </select>
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
