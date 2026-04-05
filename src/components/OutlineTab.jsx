import { getOutline, serializeOutline, getFunctionalElements, serializeFunctionalElements } from "../utils";
import OutlineBuilder from "./OutlineBuilder";

export default function OutlineTab({ sermon, onUpdate }) {
  const outline = getOutline(sermon);

  function handleOutlineChange(newOutline) {
    onUpdate({ outline: serializeOutline(newOutline) });
  }

  function handleOutlineRemove(pointId) {
    const cleaned = { ...getFunctionalElements(sermon) };
    delete cleaned[pointId];
    onUpdate({ functional_elements: serializeFunctionalElements(cleaned) });
  }

  return (
    <div>
      {/* Reference — passage, MPT, MPS */}
      {(sermon.passage || sermon.mpt || sermon.mps) && (
        <div className="card" style={{ marginBottom: "20px" }}>
          {sermon.passage && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "var(--gold)", marginBottom: "8px" }}>
              {sermon.passage}
            </div>
          )}
          {sermon.mpt && (
            <div style={{ marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-ghost)", marginRight: "8px" }}>MPT</span>
              <span style={{ fontSize: "15px", color: "var(--ink-mid)" }}>{sermon.mpt}</span>
            </div>
          )}
          {sermon.mps && (
            <div>
              <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-ghost)", marginRight: "8px" }}>MPS</span>
              <span style={{ fontSize: "15px", fontStyle: "italic", color: "var(--ink)" }}>{sermon.mps}</span>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Sermon Body Structure</h3>
        </div>
        {outline.length === 0 && (
          <p style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontSize: "14px", marginBottom: "12px" }}>
            No outline points yet. Add points here or in the Study tab.
          </p>
        )}
        <OutlineBuilder outline={outline} onUpdate={handleOutlineChange} onRemove={handleOutlineRemove} />
      </div>
    </div>
  );
}
