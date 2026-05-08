// @vitest-environment jsdom
//
// SynthesisTable component tests (SPRD A2.3).
//
// Covers default Phase 1 columns, value rendering, cell wiring, add/delete
// row, after_line datalist autocomplete from canvas line count, read-only
// column rendering for cumulative-column extensions, paste pass-through
// (synthesis allows paste; AI block is the load-bearing constraint),
// cumulative-column data preservation across renders, and disabled state.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SynthesisTable, { PHASE_1_COLUMNS } from "./SynthesisTable";

function setup(overrides = {}) {
  const onChange = vi.fn();
  const props = {
    value: overrides.value ?? [],
    onChange,
    columns: overrides.columns,
    canvas: overrides.canvas,
    disabled: overrides.disabled ?? false,
  };
  if (overrides.onChange) props.onChange = overrides.onChange;
  const utils = render(<SynthesisTable {...props} />);
  return { onChange, ...utils };
}

function getRows() {
  return Array.from(document.querySelectorAll(".synthesis-table-row"));
}

function getInputForCell(rowIdx, columnKey) {
  return document.querySelector(
    `.synthesis-table-row[data-row-index="${rowIdx}"] [data-column="${columnKey}"] .synthesis-table-input`,
  );
}

function getReadonlyDisplayForCell(rowIdx, columnKey) {
  return document.querySelector(
    `.synthesis-table-row[data-row-index="${rowIdx}"] [data-column="${columnKey}"] .synthesis-table-readonly-display`,
  );
}

// ── Default columns + rendering ────────────────────────────────────────────

describe("SynthesisTable — Phase 1 columns", () => {
  it("exports PHASE_1_COLUMNS in canonical order", () => {
    expect(PHASE_1_COLUMNS.map((c) => c.key)).toEqual([
      "thought_unit_summary",
      "after_line",
      "signal",
    ]);
  });

  it("renders Phase 1 column headers when no columns prop is passed", () => {
    setup();
    expect(screen.getByText("Thought unit")).toBeTruthy();
    expect(screen.getByText("After line")).toBeTruthy();
    expect(screen.getByText("Cue")).toBeTruthy();
  });

  it("renders one empty row when value is empty", () => {
    setup();
    expect(getRows()).toHaveLength(1);
    expect(getInputForCell(0, "thought_unit_summary").value).toBe("");
    expect(getInputForCell(0, "after_line").value).toBe("");
    expect(getInputForCell(0, "signal").value).toBe("");
  });

  it("renders all rows from value with each cell wired to its column", () => {
    setup({
      value: [
        { thought_unit_summary: "Spiritual death", after_line: "3", signal: "subject shift" },
        { thought_unit_summary: "But God's mercy",  after_line: "7", signal: "" },
      ],
    });
    expect(getRows()).toHaveLength(2);
    expect(getInputForCell(0, "thought_unit_summary").value).toBe("Spiritual death");
    expect(getInputForCell(0, "after_line").value).toBe("3");
    expect(getInputForCell(0, "signal").value).toBe("subject shift");
    expect(getInputForCell(1, "thought_unit_summary").value).toBe("But God's mercy");
    expect(getInputForCell(1, "after_line").value).toBe("7");
    expect(getInputForCell(1, "signal").value).toBe("");
  });
});

// ── Cell wiring ────────────────────────────────────────────────────────────

describe("SynthesisTable — cell wiring", () => {
  it("emits onChange with the updated row when a cell changes", () => {
    const { onChange } = setup({
      value: [{ thought_unit_summary: "", after_line: "", signal: "" }],
    });
    fireEvent.change(getInputForCell(0, "thought_unit_summary"), {
      target: { value: "Spiritual death" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      { thought_unit_summary: "Spiritual death", after_line: "", signal: "" },
    ]);
  });

  it("preserves other cells in the row on a single-cell change", () => {
    const { onChange } = setup({
      value: [
        { thought_unit_summary: "Spiritual death", after_line: "3", signal: "subject shift" },
      ],
    });
    fireEvent.change(getInputForCell(0, "signal"), { target: { value: "But pivot" } });
    expect(onChange).toHaveBeenCalledWith([
      { thought_unit_summary: "Spiritual death", after_line: "3", signal: "But pivot" },
    ]);
  });
});

// ── Add / delete row ───────────────────────────────────────────────────────

describe("SynthesisTable — add / delete row", () => {
  it("appends an empty row when the add button is clicked", () => {
    const { onChange } = setup({
      value: [{ thought_unit_summary: "Spiritual death", after_line: "3", signal: "" }],
    });
    fireEvent.click(screen.getByText("+ Add thought unit"));
    expect(onChange).toHaveBeenCalledWith([
      { thought_unit_summary: "Spiritual death", after_line: "3", signal: "" },
      { thought_unit_summary: "", after_line: "", signal: "" },
    ]);
  });

  it("removes a row when the delete button is confirmed (two-step DeleteButton flow)", () => {
    const { onChange } = setup({
      value: [
        { thought_unit_summary: "First",  after_line: "3", signal: "" },
        { thought_unit_summary: "Second", after_line: "7", signal: "" },
      ],
    });
    fireEvent.click(screen.getByLabelText("Remove row 1"));
    fireEvent.click(screen.getByText("Yes"));
    expect(onChange).toHaveBeenCalledWith([
      { thought_unit_summary: "Second", after_line: "7", signal: "" },
    ]);
  });

  it("does not delete when the user cancels the confirm step", () => {
    const { onChange } = setup({
      value: [
        { thought_unit_summary: "First",  after_line: "3", signal: "" },
        { thought_unit_summary: "Second", after_line: "7", signal: "" },
      ],
    });
    fireEvent.click(screen.getByLabelText("Remove row 1"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clicking delete (and confirming) on the last remaining row resets it to empty (never zero rows)", () => {
    const { onChange } = setup({
      value: [
        { thought_unit_summary: "Only one", after_line: "3", signal: "shift" },
      ],
    });
    fireEvent.click(screen.getByLabelText("Remove row 1"));
    fireEvent.click(screen.getByText("Yes"));
    expect(onChange).toHaveBeenCalledWith([
      { thought_unit_summary: "", after_line: "", signal: "" },
    ]);
  });
});

// ── Cumulative-content delete confirm copy ────────────────────────────────

describe("SynthesisTable — delete-with-cumulative-content guardrail", () => {
  it("shows a heightened confirm label when the row carries Phase 2/3/4 work", () => {
    setup({
      value: [
        { thought_unit_summary: "First",  after_line: "3", signal: "", meaning: "Phase 2 wrote this." },
        { thought_unit_summary: "Second", after_line: "7", signal: "" },
      ],
    });
    fireEvent.click(screen.getByLabelText("Remove row 1"));
    expect(screen.getByText("Has cross-phase work — delete?")).toBeTruthy();
  });

  it("uses the standard confirm label when the row has no cumulative content", () => {
    setup({
      value: [
        { thought_unit_summary: "First",  after_line: "3", signal: "" },
        { thought_unit_summary: "Second", after_line: "7", signal: "" },
      ],
    });
    fireEvent.click(screen.getByLabelText("Remove row 1"));
    expect(screen.getByText("Delete row?")).toBeTruthy();
    expect(screen.queryByText(/cross-phase work/)).toBeNull();
  });

  it("treats whitespace-only cumulative values as empty (standard confirm)", () => {
    setup({
      value: [
        { thought_unit_summary: "First",  after_line: "3", signal: "", meaning: "   ", implication: "" },
        { thought_unit_summary: "Second", after_line: "7", signal: "" },
      ],
    });
    fireEvent.click(screen.getByLabelText("Remove row 1"));
    expect(screen.getByText("Delete row?")).toBeTruthy();
    expect(screen.queryByText(/cross-phase work/)).toBeNull();
  });

  it("cancelling the heightened confirm leaves the row in place", () => {
    const { onChange } = setup({
      value: [
        { thought_unit_summary: "First",  after_line: "3", signal: "", christ_connection: "Phase 3 wrote this." },
        { thought_unit_summary: "Second", after_line: "7", signal: "" },
      ],
    });
    fireEvent.click(screen.getByLabelText("Remove row 1"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ── After-line stale flag ─────────────────────────────────────────────────

describe("SynthesisTable — after_line stale flag", () => {
  it("renders a stale flag when the after_line value exceeds the canvas line count", () => {
    setup({
      value: [{ thought_unit_summary: "Drift unit", after_line: "9", signal: "" }],
      canvas: [
        { text: "1", depth: 0 },
        { text: "2", depth: 0 },
        { text: "3", depth: 0 },
      ],
    });
    expect(screen.getByTestId("after-line-stale")).toBeTruthy();
    const input = getInputForCell(0, "after_line");
    expect(input.classList.contains("synthesis-table-input-stale")).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("does not flag when the after_line value matches an existing canvas line", () => {
    setup({
      value: [{ thought_unit_summary: "Anchored unit", after_line: "2", signal: "" }],
      canvas: [
        { text: "1", depth: 0 },
        { text: "2", depth: 0 },
        { text: "3", depth: 0 },
      ],
    });
    expect(screen.queryByTestId("after-line-stale")).toBeNull();
    const input = getInputForCell(0, "after_line");
    expect(input.classList.contains("synthesis-table-input-stale")).toBe(false);
  });

  it("does not flag free-text after_line values (e.g. 'v.5')", () => {
    setup({
      value: [{ thought_unit_summary: "Verse-ref unit", after_line: "v.5", signal: "" }],
      canvas: [
        { text: "1", depth: 0 },
        { text: "2", depth: 0 },
      ],
    });
    expect(screen.queryByTestId("after-line-stale")).toBeNull();
  });

  it("does not flag empty after_line values", () => {
    setup({
      value: [{ thought_unit_summary: "Pending", after_line: "", signal: "" }],
      canvas: [
        { text: "1", depth: 0 },
        { text: "2", depth: 0 },
      ],
    });
    expect(screen.queryByTestId("after-line-stale")).toBeNull();
  });
});

// ── After-line datalist autocomplete ───────────────────────────────────────

describe("SynthesisTable — after_line autocomplete", () => {
  it("renders a datalist with one option per canvas line", () => {
    setup({
      canvas: [
        { text: "1", depth: 0 },
        { text: "2", depth: 1 },
        { text: "3", depth: 0 },
        { text: "4", depth: 1 },
      ],
    });
    const datalist = document.querySelector("datalist");
    expect(datalist).toBeTruthy();
    const opts = datalist.querySelectorAll("option");
    expect(opts).toHaveLength(4);
    expect(Array.from(opts).map((o) => o.value)).toEqual(["1", "2", "3", "4"]);
  });

  it("ties the after_line input to the datalist via the list attribute", () => {
    setup({
      canvas: [
        { text: "1", depth: 0 },
        { text: "2", depth: 0 },
      ],
    });
    const afterLineInput = getInputForCell(0, "after_line");
    const datalist = document.querySelector("datalist");
    expect(afterLineInput.getAttribute("list")).toBe(datalist.id);
  });

  it("does not render a datalist (or list attribute) when canvas is empty", () => {
    setup();
    expect(document.querySelector("datalist")).toBeNull();
    const afterLineInput = getInputForCell(0, "after_line");
    expect(afterLineInput.getAttribute("list")).toBeNull();
  });

  it("after_line accepts free typing not constrained to canvas lines", () => {
    const { onChange } = setup({
      canvas: [{ text: "1", depth: 0 }, { text: "2", depth: 0 }],
      value: [{ thought_unit_summary: "x", after_line: "", signal: "" }],
    });
    // Pastor types a line number larger than the canvas (e.g. they're working
    // ahead of the canvas). Component accepts the value verbatim.
    fireEvent.change(getInputForCell(0, "after_line"), { target: { value: "99" } });
    expect(onChange).toHaveBeenCalledWith([
      { thought_unit_summary: "x", after_line: "99", signal: "" },
    ]);
  });
});

// ── Cumulative columns (Phase 2-4 extension) ───────────────────────────────

describe("SynthesisTable — cumulative columns", () => {
  const PHASE_2_COLUMNS = [
    { key: "thought_unit_summary", label: "Thought unit", kind: "textarea", readOnly: true },
    { key: "after_line",            label: "After line",  kind: "line-number", readOnly: true },
    { key: "signal",                label: "Signal",      kind: "input",       readOnly: true },
    { key: "meaning",               label: "Meaning",     kind: "textarea" },
  ];

  it("renders read-only columns as a non-editable display", () => {
    setup({
      columns: PHASE_2_COLUMNS,
      value: [
        {
          thought_unit_summary: "Spiritual death",
          after_line: "3",
          signal: "subject shift",
          meaning: "",
        },
      ],
    });
    // Read-only cells render a display, not an input
    expect(getReadonlyDisplayForCell(0, "thought_unit_summary").textContent).toBe("Spiritual death");
    expect(getReadonlyDisplayForCell(0, "after_line").textContent).toBe("3");
    expect(getReadonlyDisplayForCell(0, "signal").textContent).toBe("subject shift");
    expect(getInputForCell(0, "thought_unit_summary")).toBeNull();
    // The Phase 2 column (meaning) is writable
    expect(getInputForCell(0, "meaning")).toBeTruthy();
  });

  it("emits onChange with the writable column updated and read-only columns preserved", () => {
    const { onChange } = setup({
      columns: PHASE_2_COLUMNS,
      value: [
        {
          thought_unit_summary: "Spiritual death",
          after_line: "3",
          signal: "subject shift",
          meaning: "",
        },
      ],
    });
    fireEvent.change(getInputForCell(0, "meaning"), {
      target: { value: "Total inability before grace." },
    });
    expect(onChange).toHaveBeenCalledWith([
      {
        thought_unit_summary: "Spiritual death",
        after_line: "3",
        signal: "subject shift",
        meaning: "Total inability before grace.",
      },
    ]);
  });

  it("preserves cumulative-column data on the row even when not in the columns prop", () => {
    // Phase 1 view doesn't render `meaning`, but if value carries it (e.g. on
    // re-entry into Observe from Interpret), we must not drop it.
    const { onChange } = setup({
      value: [
        {
          thought_unit_summary: "Spiritual death",
          after_line: "3",
          signal: "subject shift",
          meaning: "Old meaning value",
        },
      ],
    });
    fireEvent.change(getInputForCell(0, "thought_unit_summary"), {
      target: { value: "Spiritual death (revised)" },
    });
    expect(onChange).toHaveBeenCalledWith([
      {
        thought_unit_summary: "Spiritual death (revised)",
        after_line: "3",
        signal: "subject shift",
        meaning: "Old meaning value",
      },
    ]);
  });
});

// ── Paste pass-through ─────────────────────────────────────────────────────

describe("SynthesisTable — paste passes through (synthesis allows paste)", () => {
  it("does not preventDefault on a paste event in any cell", () => {
    setup({
      value: [{ thought_unit_summary: "", after_line: "", signal: "" }],
    });
    const input = getInputForCell(0, "thought_unit_summary");
    // fireEvent.paste returns true when the event was NOT preventDefault'd
    // (i.e. dispatchEvent() returned true). With no onPaste handler, the
    // browser default (pasting) is allowed.
    const result = fireEvent.paste(input, {
      clipboardData: { getData: () => "pasted content", types: ["text/plain"] },
    });
    expect(result).toBe(true);
  });
});

// ── Disabled state ─────────────────────────────────────────────────────────

describe("SynthesisTable — disabled", () => {
  it("disables every input, the add button, and the delete buttons", () => {
    setup({
      disabled: true,
      value: [{ thought_unit_summary: "x", after_line: "1", signal: "y" }],
    });
    expect(getInputForCell(0, "thought_unit_summary").disabled).toBe(true);
    expect(getInputForCell(0, "after_line").disabled).toBe(true);
    expect(getInputForCell(0, "signal").disabled).toBe(true);
    const addBtn = screen.getByText("+ Add thought unit");
    expect(addBtn.disabled).toBe(true);
    const deleteBtn = screen.getByLabelText("Remove row 1");
    expect(deleteBtn.disabled).toBe(true);
  });
});
