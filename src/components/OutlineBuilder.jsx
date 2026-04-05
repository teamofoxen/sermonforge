import { createOutlinePoint } from "../utils";

/**
 * Shared outline builder — used by both StudyTab (Step 3) and OutlineTab.
 * Props:
 *   outline   — { id: string, text: string }[] of point objects
 *   onUpdate  — called with new { id, text }[] whenever outline changes
 *   onRemove  — optional; called with the removed point's id so the parent
 *               can clean up functional_elements
 */
export default function OutlineBuilder({ outline, onUpdate, onRemove }) {
  function addPoint() {
    onUpdate([...outline, createOutlinePoint("")]);
  }

  function removePoint(i) {
    const removed = outline[i];
    onRemove?.(removed.id);
    onUpdate(outline.filter((_, idx) => idx !== i));
  }

  function moveUp(i) {
    if (i === 0) return;
    const next = [...outline];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onUpdate(next);
  }

  function moveDown(i) {
    if (i === outline.length - 1) return;
    const next = [...outline];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onUpdate(next);
  }

  function updatePoint(i, val) {
    const next = [...outline];
    // Preserve id — only update text
    next[i] = { ...next[i], text: val };
    onUpdate(next);
  }

  return (
    <div>
      {outline.length === 0 ? (
        <p style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontSize: "14px", marginBottom: "8px" }}>
          No outline points yet.
        </p>
      ) : (
        <ul className="outline-list">
          {outline.map((pt, i) => (
            <li key={pt.id} className="outline-item">
              <span className="outline-num">{i + 1}.</span>
              <input
                className="outline-input"
                value={pt.text}
                onChange={(e) => updatePoint(i, e.target.value)}
                placeholder={`Point ${i + 1}…`}
              />
              <div className="outline-actions">
                <button
                  className="btn-icon"
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  title="Move up"
                  style={{ fontSize: "12px" }}
                >↑</button>
                <button
                  className="btn-icon"
                  onClick={() => moveDown(i)}
                  disabled={i === outline.length - 1}
                  title="Move down"
                  style={{ fontSize: "12px" }}
                >↓</button>
                <button
                  className="btn-icon"
                  onClick={() => removePoint(i)}
                  title="Remove"
                  style={{ color: "var(--ink-ghost)" }}
                >×</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button className="btn-ghost btn-sm" onClick={addPoint} style={{ marginTop: "8px" }}>
        + Add Point
      </button>
    </div>
  );
}
