import { useState } from "react";
import { createSeries } from "../core/spine";
import InlineError from "./InlineError";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";

// State Contract #3 in docs/CORE.md: no anonymous atoms — a series must have
// a name before any record is written. This modal enforces the rule at the
// renderer; the IPC handler in electron/main.js enforces it at the data layer.

export default function NewSeriesModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleCreate() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await createSeries({
        name: title.trim(),
        year: Number(year) || new Date().getFullYear(),
      });
      onCreated(result.id);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Could not create the series.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Series</h2>
          <IconButton aria-label="Close" className="modal-close" onClick={onClose}>×</IconButton>
        </div>

        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Title *</label>
            <input
              className="field-input"
              placeholder="Series title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              autoFocus
            />
          </div>

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
          <PrimaryButton
            onClick={handleCreate}
            disabled={!title.trim() || saving}
          >
            {saving ? "Saving…" : "Create Series"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
