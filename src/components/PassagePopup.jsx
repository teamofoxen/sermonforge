import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchPassage } from "../db/database";
import IconButton from "./primitives/IconButton";

/**
 * PassagePopup — fixed floating scripture panel (ESV only).
 *
 * Props:
 *   passage — sermon.passage string (e.g. "Galatians 1:1-10")
 *   isOpen  — whether the panel is visible
 *   onClose — called when the close button is clicked
 *
 * Accessibility: rendered as a modal dialog (role="dialog",
 * aria-modal="true") so screen readers announce it correctly. Focus moves
 * to the close button when the popup opens, and is restored to the
 * trigger element when it closes. Esc closes the popup from anywhere
 * inside it.
 */
export default function PassagePopup({ passage, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !passage) return;
    setLoading(true);
    setData(null);
    fetchPassage(passage)
      .then((res) => { setData(res); setLoading(false); })
      .catch((e) => { setData({ fetchError: e.message }); setLoading(false); });
  }, [isOpen, passage]);

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

  // Esc-close handler scoped to this modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="passage-popup"
      role="dialog"
      aria-modal="true"
      aria-label={passage ? `Scripture passage: ${passage}` : "Scripture passage"}
    >
      <div className="passage-popup-header">
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
