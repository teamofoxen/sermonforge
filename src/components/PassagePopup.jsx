import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchPassage } from "../db/database";

/**
 * PassagePopup — floating 3-column scripture viewer (ESV | NIV | The Message).
 *
 * Opens on hover of the trigger button; stays open until the user clicks outside.
 * Draggable by the header bar. Resizable via the resize handle (bottom-right corner).
 * Rendered via portal to document.body so it escapes any overflow:hidden containers.
 *
 * Props:
 *   passage   — sermon.passage string (e.g. "Galatians 1:1-10")
 *   anchorEl  — the DOM element the popup is anchored to (for initial positioning)
 *   onClose   — called when the popup should close
 */
export default function PassagePopup({ passage, anchorEl, onClose }) {
  const popupRef = useRef(null);
  const dragState = useRef(null); // { startX, startY, origLeft, origTop }
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [style, setStyle] = useState({});

  // Compute initial position relative to anchor button
  useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const popupW = Math.min(860, window.innerWidth - 40);
    let left = rect.left;
    if (left + popupW > window.innerWidth - 16) left = window.innerWidth - popupW - 16;
    left = Math.max(16, left);
    const wantedH = Math.min(420, window.innerHeight * 0.55);

    // If button is near the top of the viewport (sticky position) show below;
    // otherwise show above using available space.
    const isSticky = rect.top < 120;
    let top, maxH;
    if (isSticky) {
      top = rect.bottom + 6;
      maxH = Math.min(wantedH, window.innerHeight - top - 12);
    } else {
      maxH = Math.min(wantedH, rect.top - 10);
      top = Math.max(4, rect.top - maxH - 6);
    }
    setStyle({ position: "fixed", top, left, width: popupW, height: maxH, zIndex: 2000 });
  }, [anchorEl]);

  // Drag: mousedown on header starts drag
  function onHeaderMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const rect = popupRef.current.getBoundingClientRect();
    dragState.current = { startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top };
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragUp);
  }

  function onDragMove(e) {
    if (!dragState.current) return;
    const { startX, startY, origLeft, origTop } = dragState.current;
    const newLeft = Math.max(0, origLeft + (e.clientX - startX));
    const newTop = Math.max(0, origTop + (e.clientY - startY));
    setStyle(prev => ({ ...prev, left: newLeft, top: newTop }));
  }

  function onDragUp() {
    dragState.current = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragUp);
  }

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
      <div
        className="passage-popup-header"
        onMouseDown={onHeaderMouseDown}
        style={{ cursor: "grab" }}
      >
        <span className="passage-popup-ref">{passage || "Passage"}</span>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "'Crimson Pro', serif", userSelect: "none" }}>drag to move · resize from corner</span>
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
