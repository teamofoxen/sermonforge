import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useEsvPassage } from "../utils/useEsvPassage";
import IconButton from "./primitives/IconButton";
import SecondaryButton from "./primitives/SecondaryButton";
import EsvKeyModal from "./EsvKeyModal";

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
 * Accessibility: a floating non-modal panel (role="dialog" without
 * aria-modal — the rest of the app stays interactive while it's open, so
 * claiming modality would misinform screen readers). Focus moves to the
 * close button on open and is restored to the triggering element on close.
 */
export default function PassagePopup({ passage, isOpen, onClose, initialPosition }) {
  // The fetch + cache logic lives in useEsvPassage. Empty reference parks
  // the hook; closing the popup releases the in-flight state.
  const { data, loading, refresh } = useEsvPassage(isOpen ? passage : "");
  const closeRef = useRef(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  // Key recovery happens where the pain is: the modal opens from inside
  // the popup, and a save re-runs the fetch without closing anything.
  const [keyModalOpen, setKeyModalOpen] = useState(false);

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
      // Clamp so the header can never leave reach: the top edge stays on
      // screen and at least a 48px sliver stays inside every other edge —
      // a popup dragged "off" the screen is otherwise unrecoverable
      // without closing and reopening. Width was captured at drag start
      // (the popup can't resize mid-drag).
      const width = dragStartRef.current.width ?? 320;
      setPosition({
        left: Math.min(
          Math.max(dragStartRef.current.popupX + dx, 48 - width),
          window.innerWidth - 48
        ),
        top: Math.min(
          Math.max(dragStartRef.current.popupY + dy, 0),
          window.innerHeight - 40
        ),
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
      width: r.width,
    };
    setDragging(true);
    e.preventDefault();
  }, []);

  if (!isOpen) return null;

  // Structured state from passage-fetch; legacy-field fallback keeps the
  // popup sane against a stale/stubbed main process.
  const rawState = data?.esvState
    ?? (data?.esvPending ? "no-key" : data?.esvError ? "error" : "ok");
  const esvState = rawState === "ok" || RECOVERY[rawState] ? rawState : "error";

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
      aria-label={passage ? `Scripture passage: ${passage}` : "Scripture passage"}
      style={positionStyle}
      onKeyDown={(e) => {
        // When the key modal is nested open, Escape belongs to the modal
        // (its own document listener closes it) — one press must not
        // close both layers.
        if (e.key === "Escape" && !keyModalOpen) {
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
        <PassageRecovery
          copy="Something went wrong loading the passage. Try again — if it keeps happening, close and reopen SermonForge."
          actionLabel="Try again"
          onAction={refresh}
        />
      )}

      {!loading && !data?.fetchError && (
        esvState === "ok" ? (
          <div className="passage-popup-columns">
            <PassageColumn label="ESV" text={data?.esv} />
          </div>
        ) : (
          <PassageRecovery
            copy={RECOVERY[esvState].copy}
            actionLabel={RECOVERY[esvState].action}
            onAction={
              RECOVERY[esvState].kind === "key"
                ? () => setKeyModalOpen(true)
                : refresh
            }
          />
        )
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

      {/* Nested key recovery — EsvKeyModal renders position:fixed at a
          higher z-index than the popup; closing it (saved or cancelled)
          re-runs the fetch so a fixed key loads in place. */}
      {keyModalOpen && (
        <EsvKeyModal
          onClose={() => {
            setKeyModalOpen(false);
            refresh();
          }}
        />
      )}
    </div>,
    document.body
  );
}

// Per-state plain English + one action. The structured esvState codes from
// passage-fetch render here — raw "ESV API HTTP 401" / "fetch failed"
// strings never reach the pastor.
const RECOVERY = {
  "no-key": {
    copy: "Seeing the Bible text here takes a free ESV key from Crossway — add it once and every passage will load.",
    action: "Add ESV key",
    kind: "key",
  },
  "key-unreadable": {
    copy: "Your saved ESV key couldn't be read back from Windows. Re-entering it once will fix this.",
    action: "Update ESV key",
    kind: "key",
  },
  "bad-key": {
    copy: "The ESV key saved on this computer wasn't accepted — it may have been mistyped or expired. Re-enter it and the passage will load.",
    action: "Update ESV key",
    kind: "key",
  },
  "offline": {
    copy: "Couldn't reach the ESV servers. Check your internet connection.",
    action: "Try again",
    kind: "retry",
  },
  "rate-limited": {
    copy: "The ESV servers are busy right now. Try again in a minute.",
    action: "Try again",
    kind: "retry",
  },
  "error": {
    copy: "The ESV servers are busy right now. Try again in a minute.",
    action: "Try again",
    kind: "retry",
  },
};

function PassageRecovery({ copy, actionLabel, onAction }) {
  return (
    <div className="passage-popup-recovery">
      <p className="passage-popup-recovery-copy">{copy}</p>
      <SecondaryButton size="sm" onClick={onAction}>
        {actionLabel}
      </SecondaryButton>
    </div>
  );
}

function PassageColumn({ label, text }) {
  return (
    <div className="passage-column">
      <div className="passage-column-label">{label}</div>
      <div className="passage-column-body">
        {text ? (
          <p className="passage-column-text">{text}</p>
        ) : (
          <span className="passage-column-note">
            The ESV didn't return anything for this reference — check the book
            name and verse numbers.
          </span>
        )}
      </div>
    </div>
  );
}
