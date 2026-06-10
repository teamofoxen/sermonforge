import { useState, useEffect, useRef } from "react";
import { getAllSermons, updateSermon } from "../core/spine";
import DeletedSermonStub, { useSoftDelete } from "./DeletedSermonStub";
import { exportManuscript, searchSermons } from "../db/database";
import mapError from "../utils/mapError";
import { formatDate, buildManuscriptExportPayload } from "../utils";
import { hintFromMatchedColumn } from "../utils/searchHints";
import DeleteButton from "./DeleteButton";
import InlineError from "./InlineError";
import SearchResultSnippet from "./SearchResultSnippet";
import { SERMON_STATUS, LOADING_VERB } from "../core/contracts";
import EmptyState from "./primitives/EmptyState";
import LoadingState from "./primitives/LoadingState";
import SecondaryButton from "./primitives/SecondaryButton";
import { TextButton } from "./primitives/TextButton";

// Preached Sermons (component name CompletedSermons; the stored enum value
// stays `complete`) — the body of work whose lifecycle has reached
// `SERMON_STATUS.Complete`. The user-facing word is "Preached" everywhere
// (SERMON_STATUS_LABELS, ratified 2026-06-10): it's how a pastor actually
// talks about a finished sermon, and it makes "Mark preached" self-evident.
// History: "Archive" → "Completed Sermons" (Pilot B.2) → "Preached Sermons".
//
//   1. Export to Word regenerates the manuscript document any time without
//      re-walking the lifecycle (shared payload via buildManuscriptExportPayload).
//   2. Reopen sends a sermon back to In progress — marking preached is not a
//      one-way door (Mutation #4: reversal stays cheap).

export default function CompletedSermons({ onOpenSermon }) {
  const [sermons, setSermons] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [exportNote, setExportNote] = useState(null); // { id, text } per-card success note
  // v24 soft-delete: the card swaps to a stub with Undo instead of
  // vanishing (shared DeletedSermonStub).
  const { justDeleted, handleDelete, undoDelete } = useSoftDelete();

  useEffect(() => {
    getAllSermons()
      .then((data) => setSermons(data.filter((s) => s.stage === SERMON_STATUS.Complete)))
      .catch((e) => {
        console.error("[CompletedSermons] load failed:", e);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // Server-side full-content search (v22). Debounced 200ms; restricted to
  // Complete sermons to match the view's lifecycle scope.
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
        setSearchResults(list.filter((r) => r.stage === SERMON_STATUS.Complete));
      } catch (e) {
        console.error("[CompletedSermons] search failed:", e);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const filtered = searchResults != null ? searchResults : sermons;

  async function handleExport(sermon, e) {
    e.stopPropagation();
    if (exportingId) return;
    setExportingId(sermon.id);
    setExportError(null);
    setExportNote(null);
    try {
      const result = await exportManuscript(buildManuscriptExportPayload(sermon));
      if (result?.success) {
        setExportNote({
          id: sermon.id,
          text:
            result.opened === false
              ? "Saved to Documents › SermonForge › exports › Manuscripts."
              : "Opened in Word — saved to Documents › SermonForge › exports › Manuscripts.",
        });
      } else {
        // result.error is authored plain English in the export handler.
        setExportError(result?.error || mapError("", "export"));
      }
    } catch (err) {
      setExportError(mapError(err, "export"));
    } finally {
      setExportingId(null);
    }
  }

  // Reopen — back to In progress. Marking preached is not a one-way door;
  // the sermon reappears under All Sermons and the dashboard's Resume Work.
  async function handleReopen(sermon, e) {
    e.stopPropagation();
    await updateSermon(sermon.id, { stage: SERMON_STATUS.InProgress });
    setSermons((prev) => prev.filter((s) => s.id !== sermon.id));
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Preached Sermons</h1>
        <p className="page-subtitle">{sermons.length} preached sermon{sermons.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="page-body">
        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-ghost)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            placeholder="Search anywhere in your preached sermons — title, passage, study notes, manuscript, notebooks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {exportError && (
          <div style={{ marginBottom: "12px" }}>
            <InlineError onDismiss={() => setExportError(null)}>{exportError}</InlineError>
          </div>
        )}

        {loading || (search && searching) ? (
          <LoadingState />
        ) : loadError ? (
          <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}>
            <InlineError>Could not load preached sermons.</InlineError>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No preached sermons match your search." : "No preached sermons yet."}
          />
        ) : (
          <div className="sermon-grid">
            {filtered.map((sermon) => (
              justDeleted.has(sermon.id) ? (
                <DeletedSermonStub key={sermon.id} sermon={sermon} onUndo={undoDelete} />
              ) : (
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
                    <SecondaryButton
                      size="sm"
                      onClick={(e) => handleExport(sermon, e)}
                      disabled={exportingId !== null}
                      title="Save this sermon as a Word document"
                      style={{ fontSize: "11px" }}
                    >
                      {exportingId === sermon.id ? LOADING_VERB.Exporting : "Export to Word"}
                    </SecondaryButton>
                    <SecondaryButton
                      size="sm"
                      onClick={(e) => handleReopen(sermon, e)}
                      title="Send this sermon back to In progress"
                      style={{ fontSize: "11px" }}
                    >
                      Reopen
                    </SecondaryButton>
                    <DeleteButton
                      small
                      onDelete={() => handleDelete(sermon)}
                    />
                  </div>
                </div>
                {exportNote?.id === sermon.id && (
                  <p style={{ fontSize: "12px", color: "var(--ink-soft)", margin: "8px 0 0", fontFamily: "var(--font-serif)" }}>
                    {exportNote.text}
                  </p>
                )}
              </div>
              )
            ))}
          </div>
        )}
      </div>
    </>
  );
}
