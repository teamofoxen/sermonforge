import { useEffect, useRef, useState } from "react";
import { BOOKS } from "../data/canonicalBooks";
import PassagePopup from "./PassagePopup";
import IconButton from "./primitives/IconButton";
import "./passageLookup.css";

// PassageLookup — a standalone Bible navigator, decoupled from the sermon's
// preaching passage (that is set in the sermon modal). Modeled on the ESV.org
// reference picker: a box with a caret that drops down a panel —
//   Old / New Testament tab → book → chapter → verse (whole chapter, a single
//   verse, or click a start then an end for a range).
// Picking opens a draggable reading window (PassagePopup) with the ESV text +
// section headings. Nothing here touches the sermon.

const TESTAMENTS = [
  { key: "OT", label: "Old Testament" },
  { key: "NT", label: "New Testament" },
];

// Resolve a passage reference to its book record + starting chapter, or null
// if the book name isn't recognized. Tolerates verse ranges ("Ecclesiastes
// 5:8-13") by reading only the leading "Book chapter".
function resolveChapter(ref) {
  if (!ref) return null;
  const m = ref.match(/^(.+?)\s+(\d+)/);
  if (!m) return null;
  const book = BOOKS.find((b) => b.name.toLowerCase() === m[1].trim().toLowerCase());
  if (!book) return null;
  const chapter = parseInt(m[2], 10);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return null;
  return { book, chapter };
}

// Step one chapter in `dir` (-1 / +1), rolling across book boundaries in
// canonical order. Returns a whole-chapter reference string, or null at the
// canon's edges (before Genesis 1 / after Revelation 22).
function stepChapter(ref, dir) {
  const cur = resolveChapter(ref);
  if (!cur) return null;
  const { book, chapter } = cur;
  const target = chapter + dir;
  if (target >= 1 && target <= book.chapters) return `${book.name} ${target}`;
  const idx = BOOKS.findIndex((b) => b.id === book.id);
  const nb = BOOKS[idx + dir];
  if (!nb) return null;
  return dir < 0 ? `${nb.name} ${nb.chapters}` : `${nb.name} 1`;
}

export default function PassageLookup() {
  const [open, setOpen] = useState(false);
  const [testament, setTestament] = useState("OT");
  const [activeBook, setActiveBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [rangeStart, setRangeStart] = useState(null);
  const [pickedRef, setPickedRef] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const rootRef = useRef(null);
  const boxRef = useRef(null);

  // Close the dropdown on an outside click (the reading window is a separate
  // portal and stays open on its own).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const openPanel = () => {
    setOpen((v) => !v);
  };
  const pickBook = (b) => {
    setActiveBook(b);
    setChapter(null);
    setRangeStart(null);
  };
  const pickChapter = (ch) => {
    setChapter(ch);
    setRangeStart(null);
  };
  const finalize = (ref) => {
    // Open the reading window anchored just below the lookup box (top-left),
    // where the preacher is already looking — not the CSS-default top-right.
    const el = boxRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setAnchor({ left: Math.round(r.left), top: Math.round(r.bottom + 8) });
    }
    setPickedRef(ref);
    setOpen(false);
  };
  const pickVerse = (v) => {
    if (rangeStart == null) {
      setRangeStart(v);
      return;
    }
    const lo = Math.min(rangeStart, v);
    const hi = Math.max(rangeStart, v);
    finalize(lo === hi ? `${activeBook.name} ${chapter}:${lo}` : `${activeBook.name} ${chapter}:${lo}-${hi}`);
  };

  const books = BOOKS.filter((b) => b.testament === testament);
  const verseCount = chapter ? (activeBook?.chapterVerses?.[chapter - 1] ?? 0) : 0;

  return (
    <div className="passage-lookup" ref={rootRef}>
      <IconButton
        ref={boxRef}
        aria-label="Passage lookup"
        aria-expanded={open}
        className="passage-lookup-box"
        onClick={openPanel}
      >
        <span className="passage-lookup-box-icon" aria-hidden="true">📖</span>
        <span className="passage-lookup-box-label">{pickedRef || "Passage lookup"}</span>
        <span className="passage-lookup-box-caret" aria-hidden="true">{open ? "▴" : "▾"}</span>
      </IconButton>

      {open && (
        <div className="passage-lookup-panel">
          <div className="passage-lookup-tabs">
            {TESTAMENTS.map((t) => (
              <IconButton
                key={t.key}
                aria-label={t.label}
                aria-pressed={testament === t.key}
                className={"passage-lookup-tab" + (testament === t.key ? " is-active" : "")}
                onClick={() => { setTestament(t.key); setActiveBook(null); setChapter(null); setRangeStart(null); }}
              >
                {t.label}
              </IconButton>
            ))}
          </div>

          {chapter == null ? (
            <div className="passage-lookup-cols">
              <ul className="passage-lookup-books">
                {books.map((b) => (
                  <li key={b.id}>
                    <IconButton
                      aria-label={b.name}
                      className={"passage-lookup-book" + (activeBook?.id === b.id ? " is-active" : "")}
                      onClick={() => pickBook(b)}
                    >
                      {b.name}
                    </IconButton>
                  </li>
                ))}
              </ul>
              <div className="passage-lookup-detail">
                {activeBook ? (
                  <>
                    <div className="passage-lookup-detail-head">{activeBook.name} — chapter</div>
                    <div className="passage-lookup-grid">
                      {Array.from({ length: activeBook.chapters }, (_, i) => i + 1).map((ch) => (
                        <IconButton
                          key={ch}
                          aria-label={`${activeBook.name} chapter ${ch}`}
                          className="passage-lookup-num"
                          onClick={() => pickChapter(ch)}
                        >
                          {ch}
                        </IconButton>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="passage-lookup-hint">Pick a book.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="passage-lookup-detail is-verses">
              <div className="passage-lookup-detail-head">
                <IconButton
                  aria-label="Back to chapters"
                  className="passage-lookup-back"
                  onClick={() => { setChapter(null); setRangeStart(null); }}
                >‹</IconButton>
                {activeBook.name} {chapter} — {rangeStart == null ? "verse" : `from v${rangeStart}, pick the end`}
              </div>
              <IconButton
                aria-label={`Whole chapter — ${activeBook.name} ${chapter}`}
                className="passage-lookup-whole"
                onClick={() => finalize(`${activeBook.name} ${chapter}`)}
              >
                Whole chapter
              </IconButton>
              <div className="passage-lookup-grid">
                {Array.from({ length: verseCount }, (_, i) => i + 1).map((v) => (
                  <IconButton
                    key={v}
                    aria-label={`${activeBook.name} ${chapter} verse ${v}`}
                    className={"passage-lookup-num" + (rangeStart === v ? " is-active" : "")}
                    onClick={() => pickVerse(v)}
                  >
                    {v}
                  </IconButton>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <PassagePopup
        passage={pickedRef}
        isOpen={!!pickedRef}
        headings
        initialPosition={anchor}
        onClose={() => setPickedRef(null)}
        prevRef={stepChapter(pickedRef, -1)}
        nextRef={stepChapter(pickedRef, 1)}
        onNavigate={setPickedRef}
      />
    </div>
  );
}
