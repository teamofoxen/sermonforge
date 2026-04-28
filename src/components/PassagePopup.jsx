import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { fetchPassage } from "../db/database";

/**
 * PassagePopup — fixed floating scripture panel (ESV only).
 *
 * Props:
 *   passage — sermon.passage string (e.g. "Galatians 1:1-10")
 *   isOpen  — whether the panel is visible
 *   onClose — called when the close button is clicked
 */
export default function PassagePopup({ passage, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !passage) return;
    setLoading(true);
    setData(null);
    fetchPassage(passage)
      .then((res) => { setData(res); setLoading(false); })
      .catch((e) => { setData({ fetchError: e.message }); setLoading(false); });
  }, [isOpen, passage]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="passage-popup">
      <div className="passage-popup-header">
        <span className="passage-popup-ref">{passage || "Passage"}</span>
        <button className="passage-popup-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {loading && (
        <div className="passage-popup-loading">Fetching ESV…</div>
      )}

      {!loading && data?.fetchError && (
        <div className="passage-popup-loading" style={{ color: "var(--crimson-soft)" }}>
          Error: {data.fetchError}
        </div>
      )}

      {!loading && !data?.fetchError && (
        <div className="passage-popup-columns">
          <PassageColumn
            label="ESV"
            text={data?.esv}
            pending={data?.esvPending}
            error={data?.esvError}
            pendingNote="ESV API key not yet configured. Add ESV_API_KEY to .env."
          />
        </div>
      )}
    </div>,
    document.body
  );
}

function PassageColumn({ label, text, pending, error, pendingNote }) {
  return (
    <div className="passage-column">
      <div className="passage-column-label">{label}</div>
      <div className="passage-column-body">
        {pending ? (
          <span className="passage-column-note">{pendingNote || "Not yet available."}</span>
        ) : error ? (
          <span className="passage-column-note" style={{ color: "var(--crimson-soft)" }}>
            Could not load: {error}
          </span>
        ) : text ? (
          <p className="passage-column-text">{text}</p>
        ) : (
          <span className="passage-column-note">Not available for this passage.</span>
        )}
      </div>
    </div>
  );
}
