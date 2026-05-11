import { useState, useEffect, useRef } from "react";
import { getAllSermons, deleteSermon, updateSermon } from "../core/spine";
import { searchSermons } from "../db/database";
import { formatDate } from "../utils";
import { hintFromMatchedColumn } from "../utils/searchHints";
import NewSermonModal from "./NewSermonModal";
import DeleteButton from "./DeleteButton";
import SearchResultSnippet from "./SearchResultSnippet";
import { SERMON_STATUS, SERMON_STATUS_LABELS } from "../core/contracts";
import PrimaryButton from "./primitives/PrimaryButton";
import EmptyState from "./primitives/EmptyState";
import LoadingState from "./primitives/LoadingState";

const SERMON_STATUS_VALUES = [SERMON_STATUS.InProgress, SERMON_STATUS.Complete];

export default function SermonList({ onOpenSermon }) {
  const [sermons, setSermons] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);  // null = not searching; [] = empty result
  const [searching, setSearching] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllSermons()
      .then((data) => setSermons(data.filter((s) => s.stage !== SERMON_STATUS.Complete)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Server-side full-content search (v22) — every text column on every
  // sermon, debounced 200ms so we don't fire one IPC per keystroke.
  // Empty query restores the full list (client-side filter path below).
  const searchTimer = useRef(null);
  useEffect(() => {
    if (!search) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const rows = await searchSermons(search);
        const list = Array.isArray(rows) ? rows : [];
        // Keep the in-progress view's lifecycle filter — completed
        // sermons don't appear here even if they match the query.
        setSearchResults(list.filter((r) => r.stage !== SERMON_STATUS.Complete));
      } catch (e) {
        console.error("[SermonList] search failed:", e);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const filtered = searchResults != null ? searchResults : sermons;

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="page-title">All Sermons</h1>
            <p className="page-subtitle">{sermons.length} active sermon{sermons.length !== 1 ? "s" : ""}</p>
          </div>
          <PrimaryButton onClick={() => setShowNewModal(true)}>
            + New Sermon
          </PrimaryButton>
        </div>
      </div>

      <div className="page-body">
        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-ghost)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            placeholder="Search anywhere in your sermons — title, passage, study notes, manuscript, notebooks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading || (search && searching) ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState title="No sermons found." />
        ) : (
          <div className="sermon-grid">
            {filtered.map((sermon) => (
              <div
                key={sermon.id}
                className="sermon-card"
                onClick={() => onOpenSermon(sermon.id, hintFromMatchedColumn(sermon.matchedColumn))}
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

                {sermon.snippet && (
                  <SearchResultSnippet
                    matchedColumn={sermon.matchedColumn}
                    snippet={sermon.snippet}
                  />
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
                        if (newStage === SERMON_STATUS.Complete) {
                          setSermons((prev) => prev.filter((s) => s.id !== sermon.id));
                        } else {
                          setSermons((prev) => prev.map((s) => s.id === sermon.id ? { ...s, stage: newStage } : s));
                        }
                      }}
                      style={{ fontSize: "11px", padding: "2px 6px" }}
                    >
                      {SERMON_STATUS_VALUES.map((st) => (
                        <option key={st} value={st}>{SERMON_STATUS_LABELS[st]}</option>
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
