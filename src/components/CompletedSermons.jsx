import { useState, useEffect } from "react";
import { getAllSermons, deleteSermon } from "../core/spine";
import { exportManuscript } from "../db/database";
import { formatDate, parseManuscript, getOutline, getFunctionalElements } from "../utils";
import DeleteButton from "./DeleteButton";
import InlineError from "./InlineError";
import { SERMON_STATUS } from "../core/contracts";
import EmptyState from "./primitives/EmptyState";
import LoadingState from "./primitives/LoadingState";
import SecondaryButton from "./primitives/SecondaryButton";

// CompletedSermons — the canonical name for sermons whose lifecycle has
// reached `SERMON_STATUS.Complete`. Pilot B.2 of the audit triage renamed
// "Archive" to "Completed Sermons" because:
//
//   1. State Contract #5 (one name per concept) — "Archive" was a stale alias
//      for the post-v16-migration `complete` state value. The rename collapses
//      vocabulary and removes a Surface #4 EXPECTED_DEEP exception.
//   2. Surface Contract #4 (you-are-here always answerable) — this surface
//      now has a canonical sidebar entry under Sermon Prep.
//   3. Per-sermon re-export — completed sermons stay as a body of work; the
//      preacher can regenerate the Word doc at any time without re-walking
//      the lifecycle. Reuses the existing `sermon-export-manuscript` IPC.

export default function CompletedSermons({ onOpenSermon }) {
  const [sermons, setSermons] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [exportError, setExportError] = useState(null);

  useEffect(() => {
    getAllSermons()
      .then((data) => setSermons(data.filter((s) => s.stage === SERMON_STATUS.Complete)))
      .catch((e) => {
        console.error("[CompletedSermons] load failed:", e);
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

  async function handleReexport(sermon, e) {
    e.stopPropagation();
    if (exportingId) return;
    setExportingId(sermon.id);
    setExportError(null);
    try {
      const ms = parseManuscript(sermon.manuscript);
      const result = await exportManuscript({
        title: sermon.title || "",
        passage: sermon.passage || "",
        date: sermon.date || "",
        mpt: sermon.mpt || "",
        mps: sermon.mps || "",
        introduction: ms.introduction || {},
        transitions: ms.transitions || {},
        conclusion: ms.conclusion || {},
        outline: getOutline(sermon),
        functionalElements: getFunctionalElements(sermon),
      });
      if (!result?.success) {
        setExportError(result?.error || "Export failed.");
      }
    } catch (err) {
      setExportError(err?.message || "Export failed.");
    } finally {
      setExportingId(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Completed Sermons</h1>
        <p className="page-subtitle">{sermons.length} completed sermon{sermons.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="page-body">
        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-ghost)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            placeholder="Search completed sermons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {exportError && (
          <div style={{ marginBottom: "12px" }}>
            <InlineError onDismiss={() => setExportError(null)}>{exportError}</InlineError>
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}>
            <InlineError>Could not load completed sermons.</InlineError>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No completed sermons match your search." : "No completed sermons yet."}
          />
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
                    <SecondaryButton
                      size="sm"
                      onClick={(e) => handleReexport(sermon, e)}
                      disabled={exportingId !== null}
                      title="Re-export the manuscript as a Word document"
                      style={{ fontSize: "11px" }}
                    >
                      {exportingId === sermon.id ? "Saving…" : "Re-export"}
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
            ))}
          </div>
        )}
      </div>
    </>
  );
}
