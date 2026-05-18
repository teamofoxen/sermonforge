import { useCallback, useEffect, useRef, useState } from "react";
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

function ensureSeed(rows) {
  if (Array.isArray(rows) && rows.length > 0) return rows;
  return [emptyRow(0)];
}

function CanvasRow({ row, onChange, onKey, onPaste, registerRef }) {
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
  return (
    <div
      className={"pc-row" + (row.depth === 0 ? " pc-row--main" : " pc-row--modifier")}
      style={{ paddingLeft: row.depth * INDENT_PX }}
    >
      <textarea
        ref={ref}
        className="pc-input"
        value={row.text}
        onChange={(e) => onChange(row.id, e.target.value)}
        onKeyDown={(e) => onKey(e, row.id)}
        onPaste={onPaste}
        rows={1}
        spellCheck
        aria-label={
          row.depth === 0 ? "Main row" : `Modifier row, depth ${row.depth}`
        }
      />
    </div>
  );
}

export default function PassageCanvas({ rows, onChange }) {
  const safeRows = ensureSeed(rows);
  const refs = useRef(new Map());
  const focusNextRef = useRef(null);
  const [pasteHint, setPasteHint] = useState(false);
  const pasteHintTimer = useRef(null);

  useEffect(() => () => {
    if (pasteHintTimer.current) clearTimeout(pasteHintTimer.current);
  }, []);

  // Paste is blocked — typing by hand IS the discipline (ruling 8 lists this
  // under "what stays," not optional). Cut/copy stay; only paste is refused.
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    setPasteHint(true);
    if (pasteHintTimer.current) clearTimeout(pasteHintTimer.current);
    pasteHintTimer.current = setTimeout(() => setPasteHint(false), PASTE_HINT_MS);
  }, []);

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
        if (nextDepth === row.depth) return;
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
          onKey={handleKey}
          onPaste={handlePaste}
          registerRef={registerRef}
        />
      ))}
      {pasteHint && (
        <div className="pc-paste-hint" role="status" aria-live="polite">
          Type the passage by hand — paste is blocked here.
        </div>
      )}
    </div>
  );
}
