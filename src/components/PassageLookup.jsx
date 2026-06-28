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

export default function PassageLookup() {
  const [open, setOpen] = useState(false);
  const [testament, setTestament] = useState("OT");
  const [activeBook, setActiveBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [rangeStart, setRangeStart] = useState(null);
  const [pickedRef, setPickedRef] = useState(null);
  const rootRef = useRef(null);

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
        onClose={() => setPickedRef(null)}
      />
    </div>
  );
}
