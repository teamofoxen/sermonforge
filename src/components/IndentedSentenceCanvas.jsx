// IndentedSentenceCanvas — SFDI Field 3 unified-canvas component.
//
// Phase 4 Sprint 2 (2026-05-05) absorbed the three legacy questions
// (sentence_layout / paraphrases / thought_units) into a single canvas where
// each row carries its structural text plus inline paraphrase and an optional
// thought-unit-end marker. This component renders the unified shape end to
// end — structure typing, paraphrase block beneath each main row, and
// "+ Mark as thought-unit end" affordance + inline editor + filled-state cap
// line and callout.
//
// Storage shape per row (canonical):
//   {
//     id: <uuid>,                    // crypto.randomUUID() — stable merge key
//     text: <string>,
//     depth: <integer>,              // 0 = main; >0 = modifier
//     kind: "main" | "modifier",     // derived from depth
//     paraphrase: <string>,          // populated only on main rows
//     thought_unit_end?: { summary, signal },  // only on main rows
//   }
//
// UI invariants per spec ratification 3:
//   - Paraphrase block renders below each main row's subtree (after all its
//     modifiers) — modifiers don't get their own paraphrase field.
//   - "+ Mark as thought-unit end" affordance + filled-state callout render
//     on the subtree footer of a main row only — modifiers don't get them.
//
// Tab / Shift+Tab change indent depth on the active row; Enter splits, with
// the new row receiving a fresh id. Backspace at column 0 either un-indents
// (depth > 0) or merges with the previous row (depth = 0). Paste is blocked
// in canvas-row textareas — typing-by-hand IS the discipline; cut/copy stay.
// Paraphrase textareas allow paste (translation, not transcription, but the
// pastor's voice still has to do the work).

import React, { useRef, useState, useEffect, useCallback } from "react";
import { autoResize } from "../utils";
import { generateRowId } from "../utils/studyFields";

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
  return {
    id: generateRowId(),
    text: "",
    depth: 0,
    kind: "main",
    paraphrase: "",
  };
}

// Normalize a row on every emit: keep id stable, derive kind from depth,
// strip paraphrase + thought_unit_end from modifier rows (per UI invariant —
// shape stays clean if depth shifts), and shape thought_unit_end consistently.
function normalizeRow(row, maxDepth) {
  const depth = clampDepth(row?.depth, maxDepth);
  const kind = deriveKind(depth);
  const out = {
    id: typeof row?.id === "string" && row.id ? row.id : generateRowId(),
    text: typeof row?.text === "string" ? row.text : "",
    depth,
    kind,
    paraphrase:
      depth === 0 && typeof row?.paraphrase === "string" ? row.paraphrase : "",
  };
  if (
    depth === 0
    && row?.thought_unit_end
    && typeof row.thought_unit_end === "object"
  ) {
    const summary =
      typeof row.thought_unit_end.summary === "string"
        ? row.thought_unit_end.summary
        : "";
    const signal =
      typeof row.thought_unit_end.signal === "string"
        ? row.thought_unit_end.signal
        : "";
    if (summary || signal) {
      out.thought_unit_end = { summary, signal };
    }
  }
  return out;
}

// Subtree end detection — a row is the last in its main row's subtree when
// the next row is a main row (depth = 0) or no next row exists. The subtree
// footer (paraphrase + unit-end affordance/callout/editor) renders after this
// row when isLastInSubtree(idx) is true and the subtree's main row is depth=0.
function isSubtreeEnd(rows, idx) {
  if (idx >= rows.length - 1) return true;
  const next = rows[idx + 1];
  if (!next) return true;
  const nextDepth = Number.isInteger(next.depth) && next.depth >= 0 ? next.depth : 0;
  return nextDepth === 0;
}

// Walk back from idx to find the main row of this row's subtree. Returns -1
// if the row is an orphan modifier (no preceding main row).
function findMainIdxFor(rows, idx) {
  for (let j = idx; j >= 0; j--) {
    const r = rows[j];
    if (!r || typeof r !== "object") continue;
    const d = Number.isInteger(r.depth) && r.depth >= 0 ? r.depth : 0;
    if (d === 0) return j;
  }
  return -1;
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
  // Editor open state by row id. A row enters open mode when "+ Mark" or the
  // filled-state callout is clicked; closes when "Done" is clicked. Data is
  // separate — thought_unit_end is only stored when summary or signal is non-
  // empty, so an opened-but-untouched editor doesn't leave dirty data.
  const [editorOpenIds, setEditorOpenIds] = useState(() => new Set());

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
    // New row inherits the source row's depth but gets a fresh id, an empty
    // paraphrase (paraphrase-per-main-row stays attached to the source main),
    // and no thought_unit_end carry-over.
    next.splice(idx + 1, 0, {
      id: generateRowId(),
      text: after,
      depth: row.depth,
      kind: deriveKind(row.depth),
      paraphrase: "",
    });
    emit(next);
    setPendingFocus({ index: idx + 1, caret: 0 });
  };

  const mergeWithPrev = (idx) => {
    if (idx <= 0) return;
    const prev = rows[idx - 1];
    const cur = rows[idx];
    const next = rows.slice();
    const mergedCaret = prev.text.length;
    // Merging keeps the previous row's id, paraphrase, and thought_unit_end
    // — the row being merged disappears entirely.
    next[idx - 1] = { ...prev, text: prev.text + cur.text };
    next.splice(idx, 1);
    emit(next);
    setPendingFocus({ index: idx - 1, caret: mergedCaret });
  };

  const updateParaphrase = (mainIdx, paraphrase) => {
    const next = rows.slice();
    next[mainIdx] = { ...next[mainIdx], paraphrase };
    emit(next);
  };

  const updateUnitField = (mainIdx, field, val) => {
    const next = rows.slice();
    const cur = next[mainIdx];
    const existing = cur.thought_unit_end || { summary: "", signal: "" };
    const updated = { ...existing, [field]: val };
    const summary = typeof updated.summary === "string" ? updated.summary : "";
    const signal = typeof updated.signal === "string" ? updated.signal : "";
    if (!summary && !signal) {
      const { thought_unit_end: _drop, ...rest } = cur;
      next[mainIdx] = rest;
    } else {
      next[mainIdx] = { ...cur, thought_unit_end: { summary, signal } };
    }
    emit(next);
  };

  const removeUnitEnd = (mainIdx) => {
    const next = rows.slice();
    const { thought_unit_end: _drop, ...rest } = next[mainIdx];
    next[mainIdx] = rest;
    emit(next);
  };

  const openEditor = (rowId) => {
    setEditorOpenIds((prev) => {
      if (prev.has(rowId)) return prev;
      const n = new Set(prev);
      n.add(rowId);
      return n;
    });
  };

  const closeEditor = (rowId) => {
    setEditorOpenIds((prev) => {
      if (!prev.has(rowId)) return prev;
      const n = new Set(prev);
      n.delete(rowId);
      return n;
    });
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

  const handleCanvasPaste = (e) => {
    e.preventDefault();
    flashPasteHint();
  };

  const handleCanvasDrop = (e) => {
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
      aria-label="Unified canvas"
    >
      <ol className="indented-canvas-rows">
        {rows.map((row, idx) => {
          const depth = clampDepth(row.depth, maxDepth);
          const subtreeEnd = isSubtreeEnd(rows, idx);
          const mainIdx = findMainIdxFor(rows, idx);
          const mainRow = mainIdx >= 0 ? rows[mainIdx] : null;
          const showFooter = subtreeEnd && mainRow && mainRow.depth === 0;
          const tue = mainRow?.thought_unit_end;
          const tueFilled = !!(tue && (tue.summary || tue.signal));
          const editorOpen = mainRow && editorOpenIds.has(mainRow.id);

          return (
            <React.Fragment key={row.id || `idx-${idx}`}>
              <li
                className={`indented-canvas-row indented-canvas-row-d${depth}${depth === 0 ? " indented-canvas-row-main" : ""}`}
                data-depth={depth}
                data-line-number={idx + 1}
                data-row-id={row.id}
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
                  onPaste={handleCanvasPaste}
                  onDrop={handleCanvasDrop}
                  disabled={disabled}
                  aria-label={`Line ${idx + 1}, depth ${depth}`}
                />
              </li>

              {showFooter && (
                <li
                  className="indented-canvas-subtree-footer"
                  data-main-row-id={mainRow.id}
                >
                  <textarea
                    className="indented-canvas-paraphrase-input"
                    rows={2}
                    value={mainRow.paraphrase || ""}
                    onChange={(e) => updateParaphrase(mainIdx, e.target.value)}
                    onInput={(e) => autoResize(e.target)}
                    placeholder="Rewrite this main sentence in your own words…"
                    aria-label={`Paraphrase for main sentence at line ${mainIdx + 1}`}
                    disabled={disabled}
                    data-testid={`indented-canvas-paraphrase-${mainIdx}`}
                  />
                  {editorOpen ? (
                    <div
                      className="indented-canvas-unit-editor"
                      data-testid={`indented-canvas-unit-editor-${mainIdx}`}
                    >
                      <div className="indented-canvas-unit-editor-label">
                        Thought unit ends after this main sentence
                      </div>
                      <input
                        type="text"
                        className="indented-canvas-unit-summary"
                        value={tue?.summary || ""}
                        onChange={(e) => updateUnitField(mainIdx, "summary", e.target.value)}
                        placeholder="What is the author hammering home? (your own words)"
                        aria-label="Thought unit summary"
                        disabled={disabled}
                      />
                      <input
                        type="text"
                        className="indented-canvas-unit-signal-input"
                        value={tue?.signal || ""}
                        onChange={(e) => updateUnitField(mainIdx, "signal", e.target.value)}
                        placeholder="What signals the seam? (subject shift, contrastive 'But', scene change…)"
                        aria-label="Thought unit signal"
                        disabled={disabled}
                      />
                      <div className="indented-canvas-unit-editor-actions">
                        <button
                          type="button"
                          className="indented-canvas-unit-remove"
                          onClick={() => {
                            removeUnitEnd(mainIdx);
                            closeEditor(mainRow.id);
                          }}
                          disabled={disabled}
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          className="indented-canvas-unit-done"
                          onClick={() => closeEditor(mainRow.id)}
                          disabled={disabled}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : tueFilled ? (
                    <div
                      className="indented-canvas-unit-cap"
                      onClick={() => openEditor(mainRow.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openEditor(mainRow.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label="Edit thought-unit end"
                      data-testid={`indented-canvas-unit-cap-${mainIdx}`}
                    >
                      <div className="indented-canvas-unit-cap-line" aria-hidden="true" />
                      <div className="indented-canvas-unit-cap-text">
                        {tue.summary}
                        {tue.signal && (
                          <span className="indented-canvas-unit-signal">
                            {" "}— {tue.signal}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    !disabled && (
                      <button
                        type="button"
                        className="indented-canvas-mark-unit"
                        onClick={() => openEditor(mainRow.id)}
                        data-testid={`indented-canvas-mark-unit-${mainIdx}`}
                      >
                        + Mark as thought-unit end
                      </button>
                    )
                  )}
                </li>
              )}
            </React.Fragment>
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
