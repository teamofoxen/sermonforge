// SynthesisTable — SFDI Field 4 Q3 sub-shape (SPRD A2.3).
//
// A multi-column table where the pastor names the meaningful artifact
// directly. Field 4's Phase 1 table is three columns:
//   - Thought unit (own-words summary; no AI in this cell)
//   - After line (autocomplete from canvas line numbers)
//   - Signal (free text — the seam-marking signal)
//
// Storage shape per A2.0: `[{thought_unit_summary, after_line, signal}, ...]`.
// Cumulative-column extension across phases:
//   Phase 2 (Field 7 Q1) adds:  meaning
//   Phase 3 (Field 5 Q1) adds:  christ_connection
//   Phase 4 (Field 4 Q1) adds:  implication
// Each phase's column is writable in that phase's spotlight; upstream
// columns surface read-only. The component supports this via the
// `columns` prop (each column may set `readOnly: true`).
//
// Paste is ALLOWED in this component — synthesis is the discipline; the
// AI block (Q3 thought-unit cell, no AI generation) is the load-bearing
// constraint. The component itself ships with no AI affordances; AI may
// read these values downstream but does not write them.
//
// A2.3 ships the component in isolation. Wiring into Field 4 Q3 (with
// the composite gate that requires at least one row with thought-unit +
// after-line filled) is B1 work; later phases extend the columns prop.

import React, { useId } from "react";

export const PHASE_1_COLUMNS = Object.freeze([
  { key: "thought_unit_summary", label: "Thought unit", kind: "textarea",    placeholder: "What is the author hammering home, in your own words?" },
  { key: "after_line",            label: "After line",  kind: "line-number", placeholder: "1" },
  { key: "signal",                label: "Signal",      kind: "input",       placeholder: "Subject shift, transition, scene change…" },
]);

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
      <table className="synthesis-table-grid">
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
                    <td key={col.key} className={cellClass} data-column={col.key}>
                      <div className="synthesis-table-readonly-display">{v}</div>
                    </td>
                  );
                }
                if (col.kind === "textarea") {
                  return (
                    <td key={col.key} className={cellClass} data-column={col.key}>
                      <textarea
                        className="synthesis-table-input"
                        value={v}
                        onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
                        disabled={disabled}
                        placeholder={col.placeholder || ""}
                        rows={2}
                        aria-label={`${col.label}, row ${rowIdx + 1}`}
                      />
                    </td>
                  );
                }
                if (col.kind === "line-number") {
                  return (
                    <td key={col.key} className={cellClass} data-column={col.key}>
                      <input
                        className="synthesis-table-input synthesis-table-input-line-number"
                        type="text"
                        list={canvasLineCount > 0 ? datalistId : undefined}
                        value={v}
                        onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
                        disabled={disabled}
                        placeholder={col.placeholder || ""}
                        aria-label={`${col.label}, row ${rowIdx + 1}`}
                      />
                    </td>
                  );
                }
                return (
                  <td key={col.key} className={cellClass} data-column={col.key}>
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
                <button
                  type="button"
                  className="synthesis-table-delete-row"
                  onClick={() => deleteRow(rowIdx)}
                  disabled={disabled}
                  aria-label={`Remove row ${rowIdx + 1}`}
                  title="Remove row"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="synthesis-table-controls">
        <button
          type="button"
          className="synthesis-table-add-row"
          onClick={addRow}
          disabled={disabled}
        >
          + Add thought unit
        </button>
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
