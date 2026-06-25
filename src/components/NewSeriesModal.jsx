import { useState } from "react";
import { createSeries, updateSeries } from "../core/spine";
import { bookById, bookSpan } from "../data/canonicalBooks";
import BookSelect from "./BookSelect";
import mapError from "../utils/mapError";
import { useModalA11y } from "../utils/useModalA11y";
import InlineError from "./InlineError";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";

// State Contract #3 (docs/CORE.md): no anonymous atoms — a series must have a
// name before any row is written. Enforced here at the renderer and again in
// the create-series IPC handler. AI-free by construction: the revived Series
// Planner carries no generate/analyze affordances (sermonforge/no-direct-ai).
//
// Two modes (Series Planner charter, "2026-06-25 — Topical Series mode"):
//  • BOOK — preaching through one book; the book IS the series' identity, so the
//    name defaults to the book's name and the book picker leads. (Unchanged.)
//  • TOPICAL — one theme gathering passages from many books; there is no book to
//    name the series, so the pastor names the THEME (required). The theme is the
//    series' identity AND its Big Idea, and the book picker moves DOWN to each
//    sermon on the planner page. Persisted create-then-update: kind + theme→
//    big_idea ride a follow-up updateSeries (the INSERT is never widened).
export default function NewSeriesModal({ onClose, onCreated }) {
  const [mode, setMode] = useState("book"); // "book" | "topical" — default book
  const [bookId, setBookId] = useState("");
  const [title, setTitle] = useState(""); // book: series title (optional); topical: the theme (required)
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Escape + focus trap + focus restore; respects the active mode's autoFocus
  // (the book select in book mode, the theme input in topical mode).
  const dialogRef = useModalA11y(onClose);

  async function handleCreate() {
    if (saving) return;
    if (mode === "topical") {
      const name = title.trim();
      if (!name) {
        setError('Name the theme this series gathers — e.g. "The Mission of God".');
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const result = await createSeries({
          name,
          year: Number(year) || new Date().getFullYear(),
        });
        // create-then-update: the INSERT stays name/year/color. kind marks the
        // topical mode; the theme is also the series' Big Idea, so seed big_idea
        // with it so the Study Guide introduction projects it. A failed write
        // leaves the default kind='book' — recoverable, not a stranded series.
        try {
          await updateSeries(result.id, { kind: "topical", big_idea: name });
        } catch (kindErr) {
          console.error("topical series kind/theme write failed (recoverable on the planner):", kindErr);
        }
        onCreated(result.id);
      } catch (e) {
        console.error(e);
        setError(mapError(e, "create"));
      } finally {
        setSaving(false);
      }
      return;
    }

    // Book mode — the book IS the series' identity, so the name defaults to the
    // book's name; picking a book is enough, a custom title is optional.
    const book = bookId ? bookById(bookId) : null;
    const name = title.trim() || book?.name || "";
    if (!name) {
      // A click always answers — inline message instead of a silently dead button.
      setError("Pick the book you're preaching, or give the series a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // create-then-update: the INSERT stays name/year/color; book_id and its
      // auto-filled genre + span persist via updateSeries, never the create INSERT.
      const result = await createSeries({
        name,
        year: Number(year) || new Date().getFullYear(),
      });
      if (book) {
        // The series row is already committed; the book is recoverable metadata
        // (re-pickable on the Outline), so a failed book-write must not strand
        // the pastor on an error with a half-made series. Log and navigate on.
        try {
          await updateSeries(result.id, {
            book_id: book.id,
            canon_category: book.genre,
            passage_range: bookSpan(book.id),
          });
        } catch (bookErr) {
          console.error("series book auto-fill failed (recoverable on Outline):", bookErr);
        }
      }
      onCreated(result.id);
    } catch (e) {
      console.error(e);
      // Raw spine/IPC strings never reach the pastor — mapError speaks instead.
      setError(mapError(e, "create"));
    } finally {
      setSaving(false);
    }
  }

  const modeBtnStyle = (active) => ({
    flex: 1,
    ...(active ? { borderColor: "var(--gold)", color: "var(--gold)", fontWeight: 600 } : {}),
  });

  // Enter submits when there's enough to create (a book or a name in book mode; a
  // theme in topical mode).
  const canQuickSubmit = mode === "topical" ? !!title.trim() : !!(bookId || title.trim());

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="new-series-title">
        <div className="modal-header">
          <h2 className="modal-title" id="new-series-title">New Series</h2>
          <IconButton aria-label="Close" className="modal-close" onClick={onClose}>×</IconButton>
        </div>

        <div className="modal-body">
          {/* Mode — Book vs Topical. Default Book keeps today's muscle memory. */}
          <div className="field-group">
            <div style={{ display: "flex", gap: "8px" }}>
              <SecondaryButton size="sm" aria-pressed={mode === "book"} onClick={() => { setMode("book"); setError(null); }} style={modeBtnStyle(mode === "book")}>
                Book series
              </SecondaryButton>
              <SecondaryButton size="sm" aria-pressed={mode === "topical"} onClick={() => { setMode("topical"); setError(null); }} style={modeBtnStyle(mode === "topical")}>
                Topical series
              </SecondaryButton>
            </div>
            <p className="field-caption">
              {mode === "book"
                ? "Preaching through one book, top to bottom."
                : "One theme, gathering passages from across many books."}
            </p>
          </div>

          {mode === "book" ? (
            <>
              <div className="field-group">
                <label className="field-label" htmlFor="new-series-book">Book</label>
                <BookSelect id="new-series-book" value={bookId} onChange={(e) => setBookId(e.target.value)} autoFocus />
                <p className="field-caption">
                  The book you're preaching through — sets the genre and passage span, both editable later.
                </p>
              </div>

              <div className="field-group">
                <label className="field-label">Series title <span style={{ color: "var(--ink-ghost)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                <input
                  className="field-input"
                  placeholder={bookId ? (bookById(bookId)?.name || "Defaults to the book name") : "e.g. Advent: The Light Has Come"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canQuickSubmit) {
                      e.preventDefault();
                      handleCreate();
                    }
                  }}
                />
                <p className="field-caption">
                  Defaults to the book's name — give it a richer title only if you want one.
                </p>
              </div>
            </>
          ) : (
            <div className="field-group">
              <label className="field-label" htmlFor="new-series-theme">Theme</label>
              <input
                id="new-series-theme"
                className="field-input"
                placeholder="e.g. The Mission of God"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canQuickSubmit) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                autoFocus
              />
              <p className="field-caption">
                The single idea this series gathers. You'll add the sermons — each its own passage, from any book — on the next screen.
              </p>
            </div>
          )}

          <div className="field-group">
            <label className="field-label">Year</label>
            <input
              className="field-input"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={{ maxWidth: "120px" }}
            />
          </div>

          {error && <InlineError onDismiss={() => setError(null)}>{error}</InlineError>}
        </div>

        <div className="modal-footer">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleCreate} disabled={saving}>
            {saving ? "Saving…" : "Create Series"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
