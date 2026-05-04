// ParaphraseBlocks — SFDI Field 4 Q2 sub-shape (SPRD A2.2).
//
// Each main sentence the pastor laid out in Q1 (a level-0 canvas line plus
// any modifiers indented under it) is presented here as a read-only block.
// A paraphrase field below each block captures the pastor's own-words
// rewrite. The original blocks stay visible while the pastor types — this
// is translation, not summary, and the original line is the touchstone.
//
// Tab moves focus between paraphrase fields (default browser tab order;
// the component does not intercept Tab). Paste is blocked — rewriting in
// the pastor's own words IS the discipline.
//
// A2.2 ships the component in isolation. Wiring into Field 4 Q2 (with the
// composite gate that requires every paraphrase non-empty) is B1 work.
//
// Storage shape per A2.0: `[{main_sentence_id, paraphrase}, ...]`.
// `main_sentence_id` is positional (`ms-0`, `ms-1`, ...) — paraphrases
// align to canvas main sentences by ordinal. If the pastor reorders main
// sentences in Q1, paraphrases stay attached to ordinals; the pastor sees
// any mismatch immediately because the original block is rendered above
// each input. Stable per-row ids on the canvas are a future refinement.

import React, { useRef, useState, useEffect, useCallback } from "react";

const PASTE_HINT_TIMEOUT_MS = 2200;

// Group canvas rows into main-sentence blocks. Each level-0 row starts a
// block; subsequent depth>0 rows attach as modifiers to the most recent
// block. Leading depth>0 rows (before any level-0 line) are skipped — they
// have no main sentence to attach to.
export function groupMainSentences(canvas) {
  if (!Array.isArray(canvas)) return [];
  const blocks = [];
  let current = null;
  for (const row of canvas) {
    if (!row || typeof row !== "object") continue;
    const depth = Number.isInteger(row.depth) && row.depth >= 0 ? row.depth : 0;
    const text = typeof row.text === "string" ? row.text : "";
    if (depth === 0) {
      current = { id: `ms-${blocks.length}`, head: { text, depth: 0 }, modifiers: [] };
      blocks.push(current);
    } else if (current) {
      current.modifiers.push({ text, depth });
    }
  }
  return blocks;
}

function getParaphraseFor(value, id) {
  if (!Array.isArray(value)) return "";
  const entry = value.find((e) => e && e.main_sentence_id === id);
  return entry && typeof entry.paraphrase === "string" ? entry.paraphrase : "";
}

// Set the paraphrase for a given main_sentence_id, returning the new value
// array. Preserves entries for ids that aren't currently rendered (orphans
// from a removed main sentence) so the work isn't lost on canvas edits.
function setParaphrase(value, id, paraphrase) {
  const safe = Array.isArray(value) ? value.slice() : [];
  const idx = safe.findIndex((e) => e && e.main_sentence_id === id);
  if (idx >= 0) {
    safe[idx] = { ...safe[idx], paraphrase };
  } else {
    safe.push({ main_sentence_id: id, paraphrase });
  }
  return safe;
}

export default function ParaphraseBlocks({
  canvas,
  value,
  onChange,
  disabled = false,
}) {
  const blocks = groupMainSentences(canvas);
  const [pasteHintVisible, setPasteHintVisible] = useState(false);
  const pasteHintTimer = useRef(null);

  useEffect(() => () => {
    if (pasteHintTimer.current) clearTimeout(pasteHintTimer.current);
  }, []);

  const flashPasteHint = useCallback(() => {
    setPasteHintVisible(true);
    if (pasteHintTimer.current) clearTimeout(pasteHintTimer.current);
    pasteHintTimer.current = setTimeout(() => setPasteHintVisible(false), PASTE_HINT_TIMEOUT_MS);
  }, []);

  const handleParaphraseChange = (id, next) => {
    onChange(setParaphrase(value, id, next));
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

  if (blocks.length === 0) {
    return (
      <div
        className="paraphrase-blocks paraphrase-blocks-empty"
        data-testid="paraphrase-blocks"
        role="group"
        aria-label="Paraphrase blocks"
      >
        <p className="paraphrase-blocks-empty-message">
          Lay out the main sentences in the canvas above before paraphrasing.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`paraphrase-blocks${disabled ? " paraphrase-blocks-disabled" : ""}`}
      data-testid="paraphrase-blocks"
      role="group"
      aria-label="Paraphrase blocks"
    >
      <ol className="paraphrase-blocks-list">
        {blocks.map((block) => {
          const paraphrase = getParaphraseFor(value, block.id);
          return (
            <li key={block.id} className="paraphrase-block" data-main-sentence-id={block.id}>
              <div className="paraphrase-block-original" aria-label="Original main sentence">
                <div className="paraphrase-block-head">{block.head.text}</div>
                {block.modifiers.map((m, i) => (
                  <div
                    key={i}
                    className="paraphrase-block-modifier"
                    style={{ marginLeft: `${m.depth * 1.5}em` }}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <textarea
                className="paraphrase-block-input"
                value={paraphrase}
                onChange={(e) => handleParaphraseChange(block.id, e.target.value)}
                onPaste={handlePaste}
                onDrop={handleDrop}
                disabled={disabled}
                placeholder="Rewrite this sentence in your own words…"
                aria-label={`Paraphrase for main sentence ${block.id}`}
                rows={2}
              />
            </li>
          );
        })}
      </ol>
      {pasteHintVisible && (
        <div
          className="paraphrase-blocks-paste-hint"
          role="status"
          data-testid="paraphrase-blocks-paste-hint"
        >
          Rewrite by hand — paste is off here.
        </div>
      )}
    </div>
  );
}
