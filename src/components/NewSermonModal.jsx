import { useState, useEffect } from "react";
import { createSermon, getAllSeries } from "../core/spine";
import InlineError from "./InlineError";
import { SERIES_STATUS } from "../core/contracts";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";

export default function NewSermonModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState("");
  const [date, setDate] = useState("");
  const [preacher, setPreacher] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [seriesList, setSeriesList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAllSeries()
      .then((list) => {
        setSeriesList(list);
        const inProgress = list.filter((s) => s.status === SERIES_STATUS.InProgress);
        if (inProgress.length === 1) setSeriesId(inProgress[0].id);
      })
      .catch(console.error);
  }, []);

  async function handleCreate() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await createSermon({ name: title, passage, date, preacher, series_id: seriesId || null, is_one_off: seriesId ? 0 : 1 });
      onCreated(result.id);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Could not create the sermon.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Sermon</h2>
          <IconButton aria-label="Close" className="modal-close" onClick={onClose}>×</IconButton>
        </div>

        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Title *</label>
            <input
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
          </div>

          <div className="field-group">
            <label className="field-label">Preacher</label>
            <input
              className="field-input"
              placeholder="Preacher name…"
              value={preacher}
              onChange={(e) => setPreacher(e.target.value)}
            />
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
          </div>

          {error && <InlineError onDismiss={() => setError(null)}>{error}</InlineError>}
        </div>

        <div className="modal-footer">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton
            onClick={handleCreate}
            disabled={!title.trim() || saving}
          >
            {saving ? "Creating…" : "Create Sermon"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
