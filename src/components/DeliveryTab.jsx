import { useState } from "react";
import { tryParse, getOutline } from "../utils";

const DEFAULT_CHECKLIST = [
  "Review manuscript or notes",
  "Pray through the message",
  "Check passage is memorized or marked",
  "Review outline points",
  "Test microphone / audio",
  "Water on the pulpit",
  "Silence phone",
  "Time the message",
];

function DeliveryOverlay({ sermon, onClose }) {
  const outline = getOutline(sermon);

  return (
    <div className="delivery-overlay">
      <button className="delivery-close" onClick={onClose}>
        Close ✕
      </button>
      <div className="delivery-overlay-header">
        {sermon?.passage && (
          <div className="delivery-passage-ref">{sermon.passage}</div>
        )}
        <div className="delivery-title">{sermon?.title || "Untitled Sermon"}</div>
        {sermon?.big_idea && (
          <div className="delivery-big-idea">{sermon.big_idea}</div>
        )}
      </div>
      {outline.length > 0 && (
        <ol className="delivery-points">
          {outline.map((pt, i) => (
            <li key={i} className="delivery-point">
              <span className="delivery-point-num">{i + 1}</span>
              <span className="delivery-point-text">{pt.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function DeliveryTab({ sermon, onUpdate }) {
  const [checked, setChecked] = useState(() => tryParse(sermon.checklist, {}));
  const [showDelivery, setShowDelivery] = useState(false);

  function toggleCheck(item) {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    onUpdate({ checklist: JSON.stringify(next) });
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Pre-sermon checklist */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pre-Sermon Checklist</h3>
          </div>
          <ul className="checklist">
            {DEFAULT_CHECKLIST.map((item) => (
              <li
                key={item}
                className={`checklist-item ${checked[item] ? "checked" : ""}`}
                onClick={() => toggleCheck(item)}
              >
                <input
                  type="checkbox"
                  checked={!!checked[item]}
                  onChange={() => {}}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          {/* Timing notes */}
          <div className="card" style={{ marginBottom: "16px" }}>
            <div className="card-header">
              <h3 className="card-title">Timing Notes</h3>
            </div>
            <textarea
              className="field-textarea"
              style={{ minHeight: "100px" }}
              value={sermon.timing_notes || ""}
              onChange={(e) => onUpdate({ timing_notes: e.target.value })}
              placeholder="Target length, per-section timing, areas to cut if running long…"
            />
          </div>

          {/* Post-sermon reflection */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Post-Sermon Reflection</h3>
            </div>
            <textarea
              className="field-textarea"
              style={{ minHeight: "120px" }}
              value={sermon.post_sermon || ""}
              onChange={(e) => onUpdate({ post_sermon: e.target.value })}
              placeholder="What landed? What fell flat? What would you change? What feedback did you receive?"
            />
          </div>
        </div>
      </div>

      {/* Delivery notes */}
      <div className="card" style={{ marginTop: "20px" }}>
        <div className="card-header">
          <h3 className="card-title">Delivery Notes</h3>
        </div>
        <textarea
          className="field-textarea large"
          value={sermon.delivery_notes || ""}
          onChange={(e) => onUpdate({ delivery_notes: e.target.value })}
          placeholder="Emphasis points, transitions, emotional register, pauses, illustrations to gesture…"
        />
      </div>

      {/* Open Delivery View */}
      <div style={{ marginTop: "24px", display: "flex", justifyContent: "center" }}>
        <button
          className="btn-deliver"
          style={{ padding: "12px 32px", fontSize: "16px" }}
          onClick={() => setShowDelivery(true)}
        >
          Open Delivery View
        </button>
      </div>

      {showDelivery && (
        <DeliveryOverlay sermon={sermon} onClose={() => setShowDelivery(false)} />
      )}
    </>
  );
}
