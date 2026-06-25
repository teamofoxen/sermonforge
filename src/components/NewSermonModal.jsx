import { useState, useEffect, useRef } from "react";
import { createSermon, getAllSeries } from "../core/spine";
import mapError from "../utils/mapError";
import { useModalA11y } from "../utils/useModalA11y";
import InlineError from "./InlineError";
import { SERIES_STATUS } from "../core/contracts";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";

// initialDate (optional, "YYYY-MM-DD") pre-fills the Date field — the
// Calendar's day-click passes the clicked day so "next Sunday needs a
// sermon" is one click + a title.
export default function NewSermonModal({ onClose, onCreated, initialDate = "" }) {
  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState("");
  const [date, setDate] = useState(initialDate);
  const [seriesId, setSeriesId] = useState("");
  const [seriesList, setSeriesList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // Id of the series we auto-selected (exactly one in progress) — the
  // convenience stays, but it gets a visible caption instead of silence.
  const [autoSelectedId, setAutoSelectedId] = useState(null);
  const titleRef = useRef(null);

  useEffect(() => {
    getAllSeries()
      .then((list) => {
        setSeriesList(list);
        const inProgress = list.filter((s) => s.status === SERIES_STATUS.InProgress);
        if (inProgress.length === 1) {
          setSeriesId(inProgress[0].id);
          setAutoSelectedId(inProgress[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Escape + focus trap + focus restore + dialog ARIA — same as every sibling
  // overlay (NewSeriesModal / DeleteSeriesModal / SeriesHowItWorksModal). It
  // respects the title input's autoFocus.
  const dialogRef = useModalA11y(onClose);

  async function handleCreate() {
    if (saving) return;
    if (!title.trim()) {
      setError("Give the sermon a title first — everything else can wait.");
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await createSermon({ name: title, passage, date, series_id: seriesId || null, is_one_off: seriesId ? 0 : 1 });
      onCreated(result.id);
    } catch (e) {
      console.error(e);
      // Raw spine/IPC strings ("UNIQUE constraint failed", "Error invoking
      // remote method…") never reach the pastor — mapError speaks instead.
      setError(mapError(e, "create"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="new-sermon-title">
        <div className="modal-header">
          <h2 className="modal-title" id="new-sermon-title">New Sermon</h2>
          <IconButton aria-label="Close" className="modal-close" onClick={onClose}>×</IconButton>
        </div>

        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Title *</label>
            <input
              ref={titleRef}
              className="field-input"
              placeholder="Sermon title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field-group">
            <label className="field-label">Passage</label>
            <input
              className="field-input"
              placeholder="e.g. Romans 8:1-17"
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Date</label>
            <input
              className="field-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="field-caption">
              The Sunday you plan to preach it. SermonForge uses this to sort
              your sermons and nudge you on the dashboard once the date passes.
            </p>
          </div>

          <div className="field-group">
            <label className="field-label">Series</label>
            <select
              className="field-input"
              value={seriesId}
              onChange={(e) => setSeriesId(e.target.value)}
            >
              <option value="">— No series —</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            {autoSelectedId && seriesId === autoSelectedId && (
              <p className="field-caption">
                Filed under your current series. Choose "— No series —" if this
                one stands alone.
              </p>
            )}
          </div>

          {error && <InlineError onDismiss={() => setError(null)}>{error}</InlineError>}
        </div>

        <div className="modal-footer">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          {/* Not disabled on empty title — a click always answers (inline
              message + focus) instead of a silently dead button. */}
          <PrimaryButton
            onClick={handleCreate}
            disabled={saving}
          >
            {saving ? "Saving…" : "Forge Sermon"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
