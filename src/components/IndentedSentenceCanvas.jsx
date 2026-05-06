// IndentedSentenceCanvas — SFDI Field 4 Q1 sub-shape (SPRD A2.1).
//
// The pastor types the passage by hand, one main sentence per left-margin
// line, modifiers indented under what they modify. Tab / Shift+Tab change
// the active line's logical indent depth (0–N); Tab does not move focus
// out of the canvas. An auto-generated, non-editable line-number gutter
// renders on the left. A level-0 visual marker (burgundy bar) draws on
// left-margin lines and disappears when those lines indent.
//
// Paste is blocked at the canvas — typing-by-hand IS the discipline. A
// quiet inline hint surfaces briefly on a paste attempt; cut and copy
// remain available.
//
// A2.1 ships the component in isolation. Wiring into Field 4 Q1 (with the
// peripheral reference panel, paste-allow-on-Q3, and composite gating)
// is B1 work.
//
// Storage shape per row: `{text: <string>, depth: <integer>, kind: <string>}`.
// `kind` is derived from depth (depth=0 → "main"; depth>0 → "modifier")
// and emitted automatically; callers should not set it.

import React, { useRef, useState, useEffect, useCallback } from "react";
import { autoResize } from "../utils";

const MAX_DEPTH_DEFAULT = 5;
const PASTE_HINT_TIMEOUT_MS = 2200;

function deriveKind(depth) {
  return depth === 0 ? "main" : "modifier";
}

function clampDepth(d, max) {
  if (!Number.isInteger(d) || d < 0) return 0;
  return d > max ? max : d;
}

function emptyRow() {
  return { text: "", depth: 0, kind: "main" };
}

function normalizeRow(row, maxDepth) {
  const depth = clampDepth(row?.depth, maxDepth);
  return {
    text: typeof row?.text === "string" ? row.text : "",
    depth,
    kind: deriveKind(depth),
  };
}

export default function IndentedSentenceCanvas({
  value,
  onChange,
  disabled = false,
  maxDepth = MAX_DEPTH_DEFAULT,
}) {
  const hasValue = Array.isArray(value) && value.length > 0;
  const rows = hasValue ? value : [emptyRow()];

  const inputRefs = useRef([]);
  const [pendingFocus, setPendingFocus] = useState(null); // {index, caret}
  const [pasteHintVisible, setPasteHintVisible] = useState(false);
  const pasteHintTimer = useRef(null);

  // Apply pending focus after a render that adds, removes, or merges rows.
  useEffect(() => {
    if (!pendingFocus) return;
    const el = inputRefs.current[pendingFocus.index];
    if (el) {
      el.focus();
      const c = pendingFocus.caret;
      if (typeof c === "number") {
        try { el.setSelectionRange(c, c); } catch { /* no-op */ }
      }
    }
    setPendingFocus(null);
  }, [pendingFocus]);

  useEffect(() => () => {
    if (pasteHintTimer.current) clearTimeout(pasteHintTimer.current);
  }, []);

  // Re-fit every textarea height when rows change (add / remove / depth shift)
  // or when the underlying value changes from outside the textarea (e.g. row
  // split). Direct typing is handled by onInput on the textarea itself.
  useEffect(() => {
    for (const el of inputRefs.current) {
      if (el) autoResize(el);
    }
  }, [rows]);

  const flashPasteHint = useCallback(() => {
    setPasteHintVisible(true);
    if (pasteHintTimer.current) clearTimeout(pasteHintTimer.current);
    pasteHintTimer.current = setTimeout(() => setPasteHintVisible(false), PASTE_HINT_TIMEOUT_MS);
  }, []);

  const emit = useCallback((next) => {
    onChange(next.map((r) => normalizeRow(r, maxDepth)));
  }, [onChange, maxDepth]);

  const updateText = (idx, text) => {
    const next = rows.slice();
    next[idx] = { ...next[idx], text };
    emit(next);
  };

  const setDepth = (idx, depth) => {
    const next = rows.slice();
    const clamped = clampDepth(depth, maxDepth);
    next[idx] = { ...next[idx], depth: clamped, kind: deriveKind(clamped) };
    emit(next);
  };

  const splitAt = (idx, caret) => {
    const row = rows[idx];
    const before = row.text.slice(0, caret);
    const after = row.text.slice(caret);
    const next = rows.slice();
    next[idx] = { ...row, text: before };
    next.splice(idx + 1, 0, { text: after, depth: row.depth, kind: deriveKind(row.depth) });
    emit(next);
    setPendingFocus({ index: idx + 1, caret: 0 });
  };

  const mergeWithPrev = (idx) => {
    if (idx <= 0) return;
    const prev = rows[idx - 1];
    const cur = rows[idx];
    const next = rows.slice();
    const mergedCaret = prev.text.length;
    next[idx - 1] = { ...prev, text: prev.text + cur.text };
    next.splice(idx, 1);
    emit(next);
    setPendingFocus({ index: idx - 1, caret: mergedCaret });
  };

  const handleKeyDown = (e, idx) => {
    if (disabled) return;

    if (e.key === "Tab") {
      e.preventDefault();
      const cur = rows[idx];
      setDepth(idx, cur.depth + (e.shiftKey ? -1 : 1));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const caret = e.target.selectionStart ?? rows[idx].text.length;
      splitAt(idx, caret);
      return;
    }

    if (e.key === "Backspace") {
      const caret = e.target.selectionStart ?? 0;
      const selEnd = e.target.selectionEnd ?? caret;
      if (caret === 0 && selEnd === 0) {
        e.preventDefault();
        const cur = rows[idx];
        if (cur.depth > 0) {
          setDepth(idx, cur.depth - 1);
        } else if (idx > 0) {
          mergeWithPrev(idx);
        }
        return;
      }
    }

    if (e.key === "ArrowUp" && idx > 0) {
      e.preventDefault();
      const caret = e.target.selectionStart ?? 0;
      setPendingFocus({ index: idx - 1, caret });
      return;
    }

    if (e.key === "ArrowDown" && idx < rows.length - 1) {
      e.preventDefault();
      const caret = e.target.selectionStart ?? 0;
      setPendingFocus({ index: idx + 1, caret });
      return;
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    flashPasteHint();
  };

  const handleDrop = (e) => {
    if (e.dataTransfer?.types?.length) {
      e.preventDefault();
      flashPasteHint();
    }
  };

  return (
    <div
      className={`indented-canvas${disabled ? " indented-canvas-disabled" : ""}`}
      data-testid="indented-canvas"
      role="group"
      aria-label="Indented sentence canvas"
    >
      <ol className="indented-canvas-rows">
        {rows.map((row, idx) => {
          const depth = clampDepth(row.depth, maxDepth);
          return (
            <li
              key={idx}
              className={`indented-canvas-row indented-canvas-row-d${depth}${depth === 0 ? " indented-canvas-row-main" : ""}`}
              data-depth={depth}
              data-line-number={idx + 1}
            >
              <span className="indented-canvas-gutter" aria-hidden="true">{idx + 1}</span>
              <span className="indented-canvas-marker" aria-hidden="true" />
              <textarea
                ref={(el) => { inputRefs.current[idx] = el; autoResize(el); }}
                className="indented-canvas-input"
                style={{ marginLeft: `${depth * 1.5}em` }}
                rows={1}
                value={row.text}
                onChange={(e) => updateText(idx, e.target.value)}
                onInput={(e) => autoResize(e.target)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onPaste={handlePaste}
                onDrop={handleDrop}
                disabled={disabled}
                aria-label={`Line ${idx + 1}, depth ${depth}`}
              />
            </li>
          );
        })}
      </ol>
      {pasteHintVisible && (
        <div
          className="indented-canvas-paste-hint"
          role="status"
          data-testid="indented-canvas-paste-hint"
        >
          Type each line by hand — paste is off here.
        </div>
      )}
    </div>
  );
}
