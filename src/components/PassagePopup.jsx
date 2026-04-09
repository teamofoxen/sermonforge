import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchPassage } from "../db/database";

/**
 * PassagePopup — floating 3-column scripture viewer (ESV | NIV | The Message).
 *
 * Opens on hover of the trigger button; stays open until the user clicks outside.
 * Rendered via portal to document.body so it escapes any overflow:hidden containers.
 *
 * Props:
 *   passage   — sermon.passage string (e.g. "Galatians 1:1-10")
 *   anchorEl  — the DOM element the popup is anchored to (for positioning)
 *   onClose   — called when the popup should close
 */
export default function PassagePopup({ passage, anchorEl, onClose }) {
  const popupRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [style, setStyle] = useState({});

  // Compute position — always above the anchor button
  useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const popupW = Math.min(860, window.innerWidth - 40);
    let left = rect.left;
    if (left + popupW > window.innerWidth - 16) left = window.innerWidth - popupW - 16;
    left = Math.max(16, left);
    // Prefer above; fall back to below only if button is near the very top of the screen
    const wantedH = Math.min(420, window.innerHeight * 0.55);
    const topAbove = rect.top - wantedH - 6;
    const topBelow = rect.bottom + 6;
    const top = topAbove >= 16 ? topAbove : topBelow;
    const maxH = top === topAbove ? wantedH : Math.min(wantedH, window.innerHeight - topBelow - 12);
    setStyle({ position: "fixed", top, left, width: popupW, maxHeight: maxH, zIndex: 2000 });
  }, [anchorEl]);

  // Click-outside handler (ignore clicks on the anchor button itself)
  useEffect(() => {
    function onMouseDown(e) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        anchorEl &&
        !anchorEl.contains(e.target)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose, anchorEl]);

  // Fetch translations
  useEffect(() => {
    if (!passage) return;
    setLoading(true);
    setData(null);
    fetchPassage(passage)
      .then((res) => { setData(res); setLoading(false); })
      .catch((e) => { setData({ fetchError: e.message }); setLoading(false); });
  }, [passage]);

  return ReactDOM.createPortal(
    <div ref={popupRef} className="passage-popup" style={style}>
      <div className="passage-popup-header">
        <span className="passage-popup-ref">{passage || "Passage"}</span>
        <button className="passage-popup-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {loading && (
        <div className="passage-popup-loading">Fetching translations…</div>
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
          <PassageColumn
            label="NIV"
            text={data?.niv}
            error={data?.nivError}
          />
          <PassageColumn
            label="The Message"
            text={data?.msg}
            error={data?.msgError}
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
