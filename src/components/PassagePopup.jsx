import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useEsvPassage } from "../utils/useEsvPassage";
import { BOOKS } from "../data/canonicalBooks";
import IconButton from "./primitives/IconButton";
import SecondaryButton from "./primitives/SecondaryButton";
import { TextButton } from "./primitives/TextButton";
import EsvKeyModal from "./EsvKeyModal";

// BiblePicker — the friendly "look up any passage" navigator. No typed
// references, no exact-format guessing. Three steps, all click/hover:
//   1. Book   — the list on the left (hover/focus reveals that book's chapters)
//   2. Chapter — the number grid on the right
//   3. Verses — a verse grid (from canonicalBooks' chapterVerses count); pick
//      "Whole chapter", a single verse, or click a start then an end for a range
// onPick receives a ready ESV reference string ("Ecclesiastes 5:8-13", "John 3",
// "Psalm 23:1").
function BiblePicker({ onPick }) {
  const [activeBook, setActiveBook] = useState(BOOKS[0]);
  const [chapter, setChapter] = useState(null);
  const [rangeStart, setRangeStart] = useState(null);

  const pickBook = (b) => {
    setActiveBook(b);
    setChapter(null);
    setRangeStart(null);
  };
  const pickChapter = (ch) => {
    setChapter(ch);
    setRangeStart(null);
  };
  const pickVerse = (v) => {
    if (rangeStart == null) {
      setRangeStart(v);
      return;
    }
    const lo = Math.min(rangeStart, v);
    const hi = Math.max(rangeStart, v);
    onPick(lo === hi ? `${activeBook.name} ${chapter}:${lo}` : `${activeBook.name} ${chapter}:${lo}-${hi}`);
  };

  const verseCount = chapter ? (activeBook?.chapterVerses?.[chapter - 1] ?? 0) : 0;

  return (
    <div className="bible-picker">
      <ul className="bible-picker-books">
        {BOOKS.map((b) => (
          <li key={b.id}>
            <IconButton
              aria-label={b.name}
              className={"bible-picker-book" + (activeBook?.id === b.id ? " is-active" : "")}
              onMouseEnter={() => setActiveBook(b)}
              onFocus={() => setActiveBook(b)}
              onClick={() => pickBook(b)}
            >
              {b.name}
            </IconButton>
          </li>
        ))}
      </ul>
      <div className="bible-picker-detail">
        {chapter == null ? (
          <>
            <div className="bible-picker-head">{activeBook?.name} — chapter</div>
            <div className="bible-picker-grid">
              {Array.from({ length: activeBook?.chapters ?? 0 }, (_, i) => i + 1).map((ch) => (
                <IconButton
                  key={ch}
                  aria-label={`${activeBook.name} chapter ${ch}`}
                  className="bible-picker-num"
                  onClick={() => pickChapter(ch)}
                >
                  {ch}
                </IconButton>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="bible-picker-head">
              <IconButton
                aria-label="Back to chapters"
                className="bible-picker-back"
                onClick={() => setChapter(null)}
              >‹</IconButton>
              {activeBook?.name} {chapter} — {rangeStart == null ? "verse" : `from v${rangeStart}, pick the end`}
            </div>
            <IconButton
              aria-label={`Whole chapter — ${activeBook.name} ${chapter}`}
              className="bible-picker-whole"
              onClick={() => onPick(`${activeBook.name} ${chapter}`)}
            >
              Whole chapter
            </IconButton>
            <div className="bible-picker-grid">
              {Array.from({ length: verseCount }, (_, i) => i + 1).map((v) => (
                <IconButton
                  key={v}
                  aria-label={`${activeBook.name} ${chapter} verse ${v}`}
                  className={"bible-picker-num" + (rangeStart === v ? " is-active" : "")}
                  onClick={() => pickVerse(v)}
                >
                  {v}
                </IconButton>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
export default function PassagePopup({ passage, isOpen, onClose, initialPosition, browser = false }) {
  // Browser mode ("look up a passage"): the popup manages its own reference,
  // decoupled from the sermon's passage. The picker drives selectedRef; the
  // sermon passage is never touched. Headings on (the reading view benefits
  // from Crossway's section markers). Non-browser mode shows the fixed
  // `passage` prop exactly as before.
  const [selectedRef, setSelectedRef] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(true);
  const effectivePassage = browser ? selectedRef : passage;

  // The fetch + cache logic lives in useEsvPassage. Empty reference parks
  // the hook; closing the popup releases the in-flight state.
  const { data, loading, refresh } = useEsvPassage(
    isOpen ? (effectivePassage || "") : "",
    { headings: browser }
  );
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
      // A fresh open of the lookup window starts back at the picker so the
      // preacher always lands on "choose a passage," not last session's text.
      if (browser) {
        setSelectedRef(null);
        setPickerOpen(true);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, browser]);

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

  const headerRef = browser ? (selectedRef || "Passage lookup") : (passage || "Passage");

  return ReactDOM.createPortal(
    <div
      ref={popupRef}
      className={"passage-popup" + (browser ? " is-browser" : "")}
      role="dialog"
      aria-label={browser ? "Look up a Bible passage" : (passage ? `Scripture passage: ${passage}` : "Scripture passage")}
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
        <span className="passage-popup-ref">{headerRef}</span>
        <IconButton
          ref={closeRef}
          className="passage-popup-close"
          onClick={onClose}
          aria-label="Close passage popup"
        >✕</IconButton>
      </div>

      {/* Browser-mode navigator — when a chapter is showing, a quiet link back
          to the picker so the preacher can jump elsewhere without reopening. */}
      {browser && !pickerOpen && (
        <div className="passage-popup-nav">
          <TextButton size="sm" onClick={() => setPickerOpen(true)}>
            ‹ Choose another passage
          </TextButton>
        </div>
      )}

      {browser && pickerOpen && (
        <BiblePicker
          onPick={(ref) => {
            setSelectedRef(ref);
            setPickerOpen(false);
          }}
        />
      )}

      {!(browser && pickerOpen) && loading && (
        <div className="passage-popup-loading">Fetching ESV…</div>
      )}

      {!(browser && pickerOpen) && !loading && data?.fetchError && (
        <PassageRecovery
          copy="Something went wrong loading the passage. Try again — if it keeps happening, close and reopen SermonForge."
          actionLabel="Try again"
          onAction={refresh}
        />
      )}

      {!(browser && pickerOpen) && !loading && !data?.fetchError && (
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
      {!(browser && pickerOpen) && !loading && !data?.fetchError && data?.esv && (
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
// strings never reach the pastor. Exported: the ReferencePane's passage
// view shares the same states and copy (one voice, two surfaces).
export const RECOVERY = {
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

export function PassageRecovery({ copy, actionLabel, onAction }) {
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
