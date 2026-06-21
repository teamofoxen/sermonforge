import { useState, useEffect } from "react";
import { createSeries } from "../core/spine";
import mapError from "../utils/mapError";
import InlineError from "./InlineError";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";

// State Contract #3 (docs/CORE.md): no anonymous atoms — a series must have a
// name before any row is written. Enforced here at the renderer and again in
// the create-series IPC handler. AI-free by construction: the revived Series
// Planner carries no generate/analyze affordances (sermonforge/no-direct-ai).
export default function NewSeriesModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Escape closes — same pattern as every sibling overlay.
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCreate() {
    if (saving) return;
    if (!title.trim()) {
      // A click always answers — inline message instead of a silently dead button.
      setError("Give the series a name first — everything else can wait.");
      return;
    }
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
      // Raw spine/IPC strings never reach the pastor — mapError speaks instead.
      setError(mapError(e, "create"));
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
              placeholder="e.g. Romans: The Gospel Unveiled"
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
            <p className="field-caption">
              The book or theme you're preaching through. You'll shape the
              passages, sections, and calendar once it's created.
            </p>
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
          <PrimaryButton onClick={handleCreate} disabled={saving}>
            {saving ? "Saving…" : "Create Series"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
