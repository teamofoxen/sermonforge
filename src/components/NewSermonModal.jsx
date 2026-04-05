import { useState, useEffect } from "react";
import { createSermon, getAllSeries } from "../db/database";

const STAGES = ["planning", "study", "outline", "writing", "ready"];

export default function NewSermonModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState("");
  const [date, setDate] = useState("");
  const [preacher, setPreacher] = useState("");
  const [stage, setStage] = useState("planning");
  const [seriesId, setSeriesId] = useState("");
  const [seriesList, setSeriesList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllSeries()
      .then((list) => {
        setSeriesList(list);
        const active = list.filter((s) => s.status === "active");
        if (active.length === 1) setSeriesId(active[0].id);
      })
      .catch(console.error);
  }, []);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const id = await createSermon({ title, passage, date, preacher, stage, series_id: seriesId || null, is_one_off: seriesId ? 0 : 1 });
      onCreated(id);
    } catch (e) {
      console.error(e);
      alert("Failed to create sermon: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Sermon</h2>
          <button className="modal-close" onClick={onClose}>×</button>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
              <label className="field-label">Stage</label>
              <select
                className="field-input"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
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
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={!title.trim() || saving}
          >
            {saving ? "Creating…" : "Create Sermon"}
          </button>
        </div>
      </div>
    </div>
  );
}
