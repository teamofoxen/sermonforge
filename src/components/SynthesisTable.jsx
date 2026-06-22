// SynthesisTable — SFDI Field 3 Q3 sub-shape (SPRD A2.3).
//
// Multi-column table where the pastor names the meaningful artifact in
// their own voice. Phase 1's three columns (Thought unit, After line,
// Signal) are extended downstream by Phase 2/3/4 with the cumulative
// column keys exported from `studyFields.js`. Each phase's column is
// writable in that phase's spotlight; upstream columns surface read-only
// via the `columns` prop (each column may set `readOnly: true`).
//
// Row identity is by object reference. Each row is a single object that
// carries every column it has ever been written with. `updateCell` spreads
// the existing row and merges the new key, so cumulative columns from
// later phases are preserved across edits. There is no reorder UI; if
// one is added, it must keep rows as units (don't rebuild rows from
// per-column arrays) or attribution breaks.
//
// Two destructive-edit guardrails:
//   - Delete on a row carrying cumulative cross-phase work surfaces a
//     longer warning in the DeleteButton confirm step. Both paths route
//     through the same Mutation #4 primitive — only the confirm copy
//     changes by reversal cost.
//   - After-line stale flag fires when the stored numeric value exceeds
//     the current canvas line count. Free-text values like "v.5" are
//     never flagged — only pure-numeric values that no longer point at
//     a real canvas line.
//
// Paste is ALLOWED — synthesis is the discipline; the no-AI block on
// the thought-unit cell is the load-bearing constraint. The component
// ships with no AI affordances.

import React, { useId } from "react";
import { CUMULATIVE_COLUMN_KEYS } from "../utils/studyFields";
import DeleteButton from "./primitives/DeleteButton";
import IconButton from "./primitives/IconButton";

// Per-cell character cap on writable textarea cells in any synthesis-table
// surface. Applies to thought_unit_summary (Phase 1) and the cumulative
// columns (`meaning` Phase 2, `christ_connection` Phase 3, `implication`
// Phase 4). Read-only cells are unaffected — the cap pre-shortens content
// at write-time so downstream synthesis tables stay readable at a glance.
// Hard limit (HTML maxLength) plus a small visible counter beneath each
// textarea.
export const TEXTAREA_CHAR_LIMIT = 200;

export const PHASE_1_COLUMNS = Object.freeze([
  { key: "thought_unit_summary", label: "Thought unit", kind: "textarea",    placeholder: "What is the author hammering home, in your own words?" },
  { key: "after_line",            label: "After line",  kind: "line-number", placeholder: "1" },
  { key: "signal",                label: "Cue",         kind: "input",       placeholder: "Subject shift, transition, scene change…" },
]);

function rowHasCumulativeContent(row) {
  if (!row || typeof row !== "object") return false;
  return CUMULATIVE_COLUMN_KEYS.some(
    (k) => typeof row[k] === "string" && row[k].trim()
  );
}

// Numeric after_line values pointing past the current canvas length are
// stale. Free-text values (e.g. "v.5") parse to NaN and are never flagged
// — the pastor has chosen a non-positional reference, which the canvas
// can't validate.
function isAfterLineStale(afterLine, canvasLineCount) {
  if (typeof afterLine !== "string") return false;
  const trimmed = afterLine.trim();
  if (!trimmed) return false;
  if (!/^\d+$/.test(trimmed)) return false;
  const n = parseInt(trimmed, 10);
  return n < 1 || n > canvasLineCount;
}

function emptyRowFor(columns) {
  const out = {};
  for (const col of columns) out[col.key] = "";
  return out;
}

function normalizeRow(row, columns) {
  const out = {};
  for (const col of columns) {
    const v = row?.[col.key];
    out[col.key] = typeof v === "string" ? v : "";
  }
  // Preserve cumulative-column data that this view doesn't own (e.g.
  // upstream columns still in the value blob even when not rendered).
  if (row && typeof row === "object") {
    for (const k of Object.keys(row)) {
      if (!(k in out) && typeof row[k] === "string") out[k] = row[k];
    }
  }
  return out;
}

export default function SynthesisTable({
  value,
  onChange,
  columns = PHASE_1_COLUMNS,
  canvas,
  disabled = false,
}) {
  const datalistBase = useId();
  const datalistId = `synthesis-table-lines-${datalistBase}`;
  const canvasLineCount = Array.isArray(canvas) ? canvas.length : 0;

  const hasRows = Array.isArray(value) && value.length > 0;
  const rows = hasRows ? value : [emptyRowFor(columns)];
  // Stack rows as labeled cards once a phase's column count exceeds what
  // fits horizontally inside the trail's narrow clearing.
  const stack = columns.length > 3;

  const emit = (next) => {
    onChange(next.map((r) => normalizeRow(r, columns)));
  };

  const updateCell = (rowIdx, key, next) => {
    const updated = rows.slice();
    updated[rowIdx] = { ...updated[rowIdx], [key]: next };
    emit(updated);
  };

  const addRow = () => {
    emit([...rows, emptyRowFor(columns)]);
  };

  const deleteRow = (rowIdx) => {
    if (rows.length <= 1) {
      // Don't allow zero rows; reset the lone row to empty instead.
      emit([emptyRowFor(columns)]);
      return;
    }
    const next = rows.slice();
    next.splice(rowIdx, 1);
    emit(next);
  };

  return (
    <div
      className={`synthesis-table${disabled ? " synthesis-table-disabled" : ""}`}
      data-testid="synthesis-table"
      role="group"
      aria-label="Synthesis table"
    >
      <table className={`synthesis-table-grid${stack ? " synthesis-table-stack" : ""}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`synthesis-table-th synthesis-table-th-${col.key}${col.readOnly ? " synthesis-table-th-readonly" : ""}`}
                scope="col"
              >
                {col.label}
              </th>
            ))}
            <th className="synthesis-table-th synthesis-table-th-actions" scope="col" aria-label="Row actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="synthesis-table-row" data-row-index={rowIdx}>
              {columns.map((col) => {
                const v = typeof row?.[col.key] === "string" ? row[col.key] : "";
                const cellClass = `synthesis-table-cell synthesis-table-cell-${col.key}${col.readOnly ? " synthesis-table-cell-readonly" : ""}`;
                if (col.readOnly) {
                  return (
                    <td key={col.key} className={cellClass} data-column={col.key} data-label={col.label}>
                      <div className="synthesis-table-readonly-display">{v}</div>
                    </td>
                  );
                }
                if (col.kind === "textarea") {
                  const charLimit = TEXTAREA_CHAR_LIMIT;
                  const charCount = v.length;
                  return (
                    <td key={col.key} className={cellClass} data-column={col.key} data-label={col.label}>
                      <textarea
                        className="synthesis-table-input"
                        value={v}
                        onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
                        disabled={disabled}
                        placeholder={col.placeholder || ""}
                        rows={2}
                        maxLength={charLimit}
                        aria-label={`${col.label}, row ${rowIdx + 1}`}
                      />
                      <div
                        className={`synthesis-table-char-counter${charCount >= charLimit ? " synthesis-table-char-counter-full" : ""}`}
                        aria-hidden="true"
                      >
                        {charCount}/{charLimit}
                      </div>
                    </td>
                  );
                }
                if (col.kind === "line-number") {
                  const stale = isAfterLineStale(v, canvasLineCount);
                  return (
                    <td key={col.key} className={cellClass} data-column={col.key} data-label={col.label}>
                      <div className="synthesis-table-line-number-wrap">
                        <input
                          className={`synthesis-table-input synthesis-table-input-line-number${stale ? " synthesis-table-input-stale" : ""}`}
                          type="text"
                          list={canvasLineCount > 0 ? datalistId : undefined}
                          value={v}
                          onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
                          disabled={disabled}
                          placeholder={col.placeholder || ""}
                          aria-label={`${col.label}, row ${rowIdx + 1}`}
                          aria-invalid={stale ? "true" : undefined}
                        />
                        {stale && (
                          <span
                            className="synthesis-table-line-number-stale"
                            data-testid="after-line-stale"
                            title={`Line shifted — canvas now has ${canvasLineCount} line${canvasLineCount === 1 ? "" : "s"}.`}
                            aria-label={`Stale line number — canvas now has ${canvasLineCount} line${canvasLineCount === 1 ? "" : "s"}`}
                          >
                            ⚠
                          </span>
                        )}
                      </div>
                    </td>
                  );
                }
                return (
                  <td key={col.key} className={cellClass} data-column={col.key} data-label={col.label}>
                    <input
                      className="synthesis-table-input"
                      type="text"
                      value={v}
                      onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
                      disabled={disabled}
                      placeholder={col.placeholder || ""}
                      aria-label={`${col.label}, row ${rowIdx + 1}`}
                    />
                  </td>
                );
              })}
              <td className="synthesis-table-cell synthesis-table-cell-actions">
                {disabled ? (
                  <IconButton
                    type="button"
                    className="synthesis-table-delete-row"
                    disabled
                    aria-label={`Remove row ${rowIdx + 1}`}
                    title="Remove row"
                  >
                    ×
                  </IconButton>
                ) : (
                  <DeleteButton
                    small
                    label="×"
                    ariaLabel={`Remove row ${rowIdx + 1}`}
                    confirmLabel={
                      rowHasCumulativeContent(row)
                        ? "Has cross-phase work — delete?"
                        : "Delete row?"
                    }
                    onDelete={() => deleteRow(rowIdx)}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="synthesis-table-controls">
        <IconButton
          type="button"
          className="synthesis-table-add-row"
          onClick={addRow}
          disabled={disabled}
          aria-label="Add thought unit"
        >
          + Add thought unit
        </IconButton>
      </div>
      {canvasLineCount > 0 && (
        <datalist id={datalistId}>
          {Array.from({ length: canvasLineCount }, (_, i) => (
            <option key={i + 1} value={String(i + 1)} />
          ))}
        </datalist>
      )}
    </div>
  );
}
