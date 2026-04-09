import { useState } from "react";
import { tryParse, getOutline, autoResize } from "../utils";

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
              rows={3}
              value={sermon.timing_notes || ""}
              onChange={(e) => onUpdate({ timing_notes: e.target.value })}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="Target: 38 min. Intro 5 min · Point 1: 10 min · Point 2: 10 min · Conclusion: 5 min. If running long, cut the third illustration in Point 2."
            />
          </div>

          {/* Post-sermon reflection */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Post-Sermon Reflection</h3>
            </div>
            <textarea
              className="field-textarea"
              rows={3}
              value={sermon.post_sermon || ""}
              onChange={(e) => onUpdate({ post_sermon: e.target.value })}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="What landed and why? What fell flat? What would you restructure — the outline, an illustration, the application? What feedback did you receive from the congregation?"
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
          rows={3}
          value={sermon.delivery_notes || ""}
          onChange={(e) => onUpdate({ delivery_notes: e.target.value })}
          onInput={(e) => autoResize(e.target)}
          ref={(el) => autoResize(el)}
          placeholder="Pace and pauses: slow down through the opening illustration. Voice: drop volume at the moment of grace in Point 2. Transitions: signal each point shift clearly. Eye contact during the conclusion. Any gestures or movements to note."
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
