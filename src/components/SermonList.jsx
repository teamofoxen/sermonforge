import { useState, useEffect, useRef } from "react";
import { getAllSermons, deleteSermon, updateSermon } from "../core/spine";
import { searchSermons } from "../db/database";
import { formatDate } from "../utils";
import { hintFromMatchedColumn } from "../utils/searchHints";
import { buttonKeydown } from "../utils/buttonKeydown";
import NewSermonModal from "./NewSermonModal";
import DeleteButton from "./DeleteButton";
import SearchResultSnippet from "./SearchResultSnippet";
import { SERMON_STATUS, SERMON_STATUS_LABELS } from "../core/contracts";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import { TextButton } from "./primitives/TextButton";
import EmptyState from "./primitives/EmptyState";
import LoadingState from "./primitives/LoadingState";

export default function SermonList({ onOpenSermon }) {
  const [sermons, setSermons] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);  // null = not searching; [] = empty result
  const [searching, setSearching] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  // Sermons marked preached THIS visit. Their cards don't vanish — they swap
  // to a confirmation stub with Undo, so the act is visible and reversible
  // instead of reading as deletion (the old select filtered the card out
  // instantly with no message).
  const [justPreached, setJustPreached] = useState(() => new Set());

  async function markPreached(sermon) {
    await updateSermon(sermon.id, { stage: SERMON_STATUS.Complete });
    setSermons((prev) => prev.map((s) => (s.id === sermon.id ? { ...s, stage: SERMON_STATUS.Complete } : s)));
    setJustPreached((prev) => new Set(prev).add(sermon.id));
  }

  async function undoPreached(sermon) {
    await updateSermon(sermon.id, { stage: SERMON_STATUS.InProgress });
    setSermons((prev) => prev.map((s) => (s.id === sermon.id ? { ...s, stage: SERMON_STATUS.InProgress } : s)));
    setJustPreached((prev) => {
      const next = new Set(prev);
      next.delete(sermon.id);
      return next;
    });
  }

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
            <p className="page-subtitle">
              {(() => {
                const n = sermons.filter((s) => s.stage !== SERMON_STATUS.Complete).length;
                return `${n} active sermon${n !== 1 ? "s" : ""}`;
              })()}
            </p>
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
              justPreached.has(sermon.id) ? (
                <div key={sermon.id} className="sermon-card">
                  <p className="sermon-card-preached-stub">
                    “{sermon.title}” moved to Preached Sermons.
                  </p>
                  <TextButton size="sm" onClick={() => undoPreached(sermon)}>
                    Undo
                  </TextButton>
                </div>
              ) : (
              <div
                key={sermon.id}
                className="sermon-card"
                onClick={() => onOpenSermon(sermon.id, hintFromMatchedColumn(sermon.matchedColumn))}
                role="button"
                tabIndex={0}
                onKeyDown={buttonKeydown(() => onOpenSermon(sermon.id, hintFromMatchedColumn(sermon.matchedColumn)))}
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
                    <span className={`stage-pill stage-${sermon.stage}`}>
                      {SERMON_STATUS_LABELS[sermon.stage]}
                    </span>
                    <SecondaryButton
                      size="sm"
                      style={{ fontSize: "11px" }}
                      title="Move this sermon to Preached Sermons"
                      onClick={(e) => {
                        e.stopPropagation();
                        markPreached(sermon);
                      }}
                    >
                      Mark preached
                    </SecondaryButton>
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
              )
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
