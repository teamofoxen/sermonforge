import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useEsvPassage } from "../utils/useEsvPassage";
import IconButton from "./primitives/IconButton";

/**
 * PassagePopup — floating ESV scripture panel.
 *
 * Props:
 *   passage         — passage reference string (e.g. "Galatians 1:1-10")
 *   isOpen          — whether the panel is visible
 *   onClose         — called when the close button or Esc fires
 *   initialPosition — optional {left, top}; overrides the CSS-default
 *                     top-right anchoring so the popup opens directly
 *                     below the workspace passage box. Re-applied on each
 *                     fresh open transition (closes + reopens snap back to
 *                     the new anchor; a re-click while open does not).
 *
 * Behavior:
 *   - Draggable from the header bar (mousedown → drag).
 *   - Resizable from the bottom-right corner (browser-native `resize: both`).
 *   - Esc closes the popup when focus is inside it (scoped per-instance so
 *     two popups don't both close on a single Esc keystroke).
 *
 * Accessibility: rendered as a modal dialog (role="dialog", aria-modal=
 * "true"). Focus moves to the close button on open and is restored to the
 * triggering element on close.
 */
export default function PassagePopup({ passage, isOpen, onClose, initialPosition }) {
  // The fetch + cache logic lives in useEsvPassage. Empty reference parks
  // the hook; closing the popup releases the in-flight state.
  const { data, loading } = useEsvPassage(isOpen ? passage : "");
  const closeRef = useRef(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  // position === null means "use initialPosition (or CSS default)."
  // The user dragging the popup writes into position; reopening snaps back
  // to initialPosition by clearing position on the open-edge transition.
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef(null);
  const prevIsOpenRef = useRef(false);

  // On the false→true open transition, drop any prior dragged position so
  // initialPosition (the freshly captured anchor) wins. We don't react to
  // initialPosition changing on its own — that would yank an already-open
  // popup if the parent re-computed the anchor.
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setPosition(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Focus management — capture the active element on open, focus the
  // close button, restore focus on close.
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = typeof document !== "undefined" ? document.activeElement : null;
      const id = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 30);
      return () => clearTimeout(id);
    }
    if (triggerRef.current && typeof triggerRef.current.focus === "function") {
      try { triggerRef.current.focus({ preventScroll: true }); } catch { /* element removed */ }
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Drag — track mousemove/mouseup on window while dragging so the popup
  // follows the cursor even when it leaves the header bar.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        left: dragStartRef.current.popupX + dx,
        top: dragStartRef.current.popupY + dy,
      });
    };
    const onUp = () => {
      setDragging(false);
      dragStartRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const onHeaderMouseDown = useCallback((e) => {
    // Ignore mousedown on the close button so its click still fires.
    if (e.target instanceof HTMLElement && e.target.closest(".passage-popup-close")) return;
    if (!popupRef.current) return;
    const r = popupRef.current.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      popupX: r.left,
      popupY: r.top,
    };
    setDragging(true);
    e.preventDefault();
  }, []);

  if (!isOpen) return null;

  // Inline style precedence: dragged position > initialPosition > CSS default.
  // `right: auto` is required so our left+top override the CSS-default
  // `right: 20px` (which would otherwise compete and push the popup).
  let positionStyle;
  if (position) {
    positionStyle = { left: position.left, top: position.top, right: "auto" };
  } else if (initialPosition) {
    positionStyle = { left: initialPosition.left, top: initialPosition.top, right: "auto" };
  }

  return ReactDOM.createPortal(
    <div
      ref={popupRef}
      className="passage-popup"
      role="dialog"
      aria-modal="true"
      aria-label={passage ? `Scripture passage: ${passage}` : "Scripture passage"}
      style={positionStyle}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose?.();
        }
      }}
    >
      <div
        className="passage-popup-header"
        onMouseDown={onHeaderMouseDown}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <span className="passage-popup-ref">{passage || "Passage"}</span>
        <IconButton
          ref={closeRef}
          className="passage-popup-close"
          onClick={onClose}
          aria-label="Close passage popup"
        >✕</IconButton>
      </div>

      {loading && (
        <div className="passage-popup-loading">Fetching ESV…</div>
      )}

      {!loading && data?.fetchError && (
        <div className="passage-popup-loading" style={{ color: "var(--crimson-soft)" }}>
          Could not load passage: {data.fetchError}
        </div>
      )}

      {!loading && !data?.fetchError && (
        <div className="passage-popup-columns">
          <PassageColumn
            label="ESV"
            text={data?.esv}
            pending={data?.esvPending}
            error={data?.esvError}
            pendingNote="ESV scripture lookup is unavailable — an ESV API key has not been configured for this install."
          />
        </div>
      )}

      {/* Crossway attribution — required with displayed ESV text (short
          form per api.esv.org conditions; the full notice lives on the
          About screen). */}
      {!loading && !data?.fetchError && data?.esv && (
        <div className="passage-popup-copyright">
          ESV® Bible © 2001 by Crossway, a publishing ministry of Good News
          Publishers. Used by permission.
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
