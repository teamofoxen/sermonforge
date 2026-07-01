import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./passageCanvas.css";

const MAX_DEPTH = 5;
const INDENT_PX = 32;
const PASTE_HINT_MS = 2400;

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "r-" + Math.random().toString(36).slice(2, 11);
}

function emptyRow(depth = 0) {
  return { id: newId(), text: "", depth };
}

// Build the seed: one row per verse, pinned to the left margin (depth 0) with
// its gutter label anchored on the row and text empty. Labels are strings —
// bare verse ("8") within a chapter, "chapter:verse" ("5:8", "6:1") at a
// cross-chapter seam. The pastor types into these named rows; rows added later
// by Enter carry NO verse, so the gutter blanks out beneath each verse-start
// and the left rail reads as verse seams, not a line count. Returns null when
// there's nothing to seed so the caller falls back to a single empty row.
// Verse labels are prepopulated, not the text — typing by hand stays the discipline.
function buildSeedRows(seedSig) {
  if (!seedSig) return null;
  const labels = seedSig.split(",").filter(Boolean);
  if (labels.length === 0) return null;
  return labels.map((label) => ({ id: newId(), text: "", depth: 0, verse: label }));
}

function CanvasRow({ row, onChange, onVerseChange, onKey, onPaste, registerRef }) {
  const ref = useRef(null);
  useEffect(() => {
    registerRef(row.id, ref.current);
    return () => registerRef(row.id, null);
  }, [row.id, registerRef]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [row.text]);
  // The verse number lives in a fixed left gutter; the depth indent rides on
  // the text alone, so the numbers stay flush-left while the structure indents.
  // The gutter is an editable cell — prefilled, but the pastor can correct any
  // number the auto-fill got wrong.
  return (
    <div
      className={"pc-row" + (row.depth === 0 ? " pc-row--main" : " pc-row--modifier")}
    >
      <input
        className="pc-gutter"
        type="text"
        value={row.verse == null ? "" : String(row.verse)}
        onChange={(e) => onVerseChange(row.id, e.target.value)}
        aria-label="Verse number"
        title="Verse number — click to correct"
      />
      <textarea
        ref={ref}
        className="pc-input"
        style={{ marginLeft: row.depth * INDENT_PX }}
        value={row.text}
        onChange={(e) => onChange(row.id, e.target.value)}
        onKeyDown={(e) => onKey(e, row.id)}
        onPaste={onPaste}
        rows={1}
        spellCheck
        aria-label={
          (row.verse ? `Verse ${row.verse}, ` : "") +
          (row.depth === 0 ? "main row" : `modifier row, depth ${row.depth}`)
        }
      />
    </div>
  );
}

export default function PassageCanvas({ rows, onChange, seedVerses }) {
  // Seed signature drives a STABLE memo — without it, regenerating row ids
  // every render would churn React keys and steal focus mid-type. The seed is
  // a display default only: it isn't written until the pastor's first
  // keystroke emits the array (verse fields ride along on the row spreads).
  const seedSig = Array.isArray(seedVerses) ? seedVerses.join(",") : "";
  const seedRows = useMemo(() => buildSeedRows(seedSig) || [emptyRow(0)], [seedSig]);
  // Seed fills a BLANK canvas, where blank means "no typed text AND no verse
  // label" — an empty row array OR old rows that predate the gutter. Clearing
  // every line re-seeds the numbered rail (what a preacher expects starting the
  // field over, and the path that surfaces the gutter on a sermon begun before
  // it existed). Once any line has text OR a hand-set/persisted verse label, the
  // pastor's own rows win — so an edited gutter sticks instead of being re-
  // derived from the seed.
  const hasContent = Array.isArray(rows)
    && rows.some((r) => {
      if (!r || typeof r !== "object") return false;
      const text = typeof r.text === "string" ? r.text.trim() : "";
      const verse = r.verse == null ? "" : String(r.verse).trim();
      return text !== "" || verse !== "";
    });
  const safeRows = hasContent ? rows : seedRows;
  const refs = useRef(new Map());
  const focusNextRef = useRef(null);
  // One transient hint slot — any silent refusal (blocked paste, indent
  // at the depth limit) explains itself here instead of doing nothing.
  const [hint, setHint] = useState(null);
  const hintTimer = useRef(null);

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  const showHint = useCallback((text) => {
    setHint(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), PASTE_HINT_MS);
  }, []);

  // Paste is blocked — typing by hand IS the discipline (ruling 8 lists this
  // under "what stays," not optional). Cut/copy stay; only paste is refused.
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    showHint("Type the passage by hand — paste is blocked here.");
  }, [showHint]);

  useEffect(() => {
    if (!focusNextRef.current) return;
    const el = refs.current.get(focusNextRef.current.id);
    if (el) {
      el.focus();
      const pos = focusNextRef.current.pos ?? 0;
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        /* selection ranges aren't supported on every input type */
      }
    }
    focusNextRef.current = null;
  }, [safeRows]);

  const registerRef = useCallback((id, el) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  }, []);

  const setRows = useCallback(
    (next, focus) => {
      focusNextRef.current = focus ?? null;
      onChange(next);
    },
    [onChange]
  );

  // The gutter is a verse-number cell: prefilled from the passage, but the
  // pastor owns it. Auto-numbering free-form structure can't stay perfectly
  // aligned (only the preacher knows where a verse truly begins), so any drift
  // is theirs to correct in one edit. Keep the value to verse-label characters
  // (digits, colon, hyphen) so a stray keystroke can't drop sermon text in.
  const handleVerseChange = useCallback(
    (id, value) => {
      const cleaned = value.replace(/[^0-9:-]/g, "").slice(0, 6);
      const next = safeRows.map((r) => (r.id === id ? { ...r, verse: cleaned } : r));
      setRows(next);
    },
    [safeRows, setRows]
  );

  const handleTextChange = useCallback(
    (id, value) => {
      const next = safeRows.map((r) => (r.id === id ? { ...r, text: value } : r));
      setRows(next);
    },
    [safeRows, setRows]
  );

  const handleKey = useCallback(
    (e, id) => {
      const idx = safeRows.findIndex((r) => r.id === id);
      if (idx < 0) return;
      const row = safeRows[idx];
      const el = e.target;

      if (e.key === "Tab") {
        e.preventDefault();
        const delta = e.shiftKey ? -1 : 1;
        const nextDepth = Math.max(0, Math.min(MAX_DEPTH, row.depth + delta));
        if (nextDepth === row.depth) {
          // Refusing silently reads as "broken" — say why nothing moved.
          if (delta > 0) showHint("That's as deep as the indent goes.");
          return;
        }
        const next = safeRows.map((r) =>
          r.id === id ? { ...r, depth: nextDepth } : r
        );
        setRows(next, { id, pos: el.selectionStart });
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const pos = el.selectionStart;
        const before = row.text.slice(0, pos);
        const after = row.text.slice(pos);
        const newRow = { id: newId(), text: after, depth: row.depth };
        const next = [
          ...safeRows.slice(0, idx),
          { ...row, text: before },
          newRow,
          ...safeRows.slice(idx + 1),
        ];
        setRows(next, { id: newRow.id, pos: 0 });
        return;
      }

      if (
        e.key === "Backspace" &&
        el.selectionStart === 0 &&
        el.selectionEnd === 0
      ) {
        if (row.depth > 0) {
          e.preventDefault();
          const next = safeRows.map((r) =>
            r.id === id ? { ...r, depth: row.depth - 1 } : r
          );
          setRows(next, { id, pos: 0 });
          return;
        }
        if (idx > 0) {
          e.preventDefault();
          const prev = safeRows[idx - 1];
          const mergedText = prev.text + row.text;
          const mergePos = prev.text.length;
          const next = [
            ...safeRows.slice(0, idx - 1),
            { ...prev, text: mergedText },
            ...safeRows.slice(idx + 1),
          ];
          setRows(next, { id: prev.id, pos: mergePos });
          return;
        }
      }

      if (e.key === "ArrowUp" && el.selectionStart === 0 && idx > 0) {
        e.preventDefault();
        const prev = safeRows[idx - 1];
        const prevEl = refs.current.get(prev.id);
        if (prevEl) {
          prevEl.focus();
          const len = prev.text.length;
          try {
            prevEl.setSelectionRange(len, len);
          } catch {
            /* fall through */
          }
        }
        return;
      }

      if (
        e.key === "ArrowDown" &&
        el.selectionStart === row.text.length &&
        idx < safeRows.length - 1
      ) {
        e.preventDefault();
        const next = safeRows[idx + 1];
        const nextEl = refs.current.get(next.id);
        if (nextEl) {
          nextEl.focus();
          try {
            nextEl.setSelectionRange(0, 0);
          } catch {
            /* fall through */
          }
        }
      }
    },
    [safeRows, setRows]
  );

  return (
    <div className="pc-canvas" role="textbox" aria-multiline="true">
      {safeRows.map((row) => (
        <CanvasRow
          key={row.id}
          row={row}
          onChange={handleTextChange}
          onVerseChange={handleVerseChange}
          onKey={handleKey}
          onPaste={handlePaste}
          registerRef={registerRef}
        />
      ))}
      {hint && (
        <div className="pc-paste-hint" role="status" aria-live="polite">
          {hint}
        </div>
      )}
      {/* The canvas's core gesture is invisible without this — Tab is the
          only way to indent and nothing else on screen says so. */}
      <div className="pc-legend" aria-hidden="true">
        Tab to indent · Shift+Tab to outdent · Enter for a new line
      </div>
    </div>
  );
}
