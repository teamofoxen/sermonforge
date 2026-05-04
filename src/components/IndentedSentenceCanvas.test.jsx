// @vitest-environment jsdom
//
// IndentedSentenceCanvas component tests (SPRD A2.1).
//
// Covers Tab/Shift+Tab depth semantics, line-number gutter, level-0 marker
// rendering, Enter split, Backspace merge / depth-decrement, paste-intercept,
// drag-and-drop block, kind derivation, depth clamping, and disabled state.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import IndentedSentenceCanvas from "./IndentedSentenceCanvas";

function setup(overrides = {}) {
  const onChange = vi.fn();
  const props = {
    value: overrides.value ?? [],
    onChange,
    ...overrides,
    // ensure overrides can replace our default onChange explicitly
    onChange: overrides.onChange ?? onChange,
  };
  const utils = render(<IndentedSentenceCanvas {...props} />);
  return { onChange, ...utils };
}

function getInputs() {
  return Array.from(document.querySelectorAll(".indented-canvas-input"));
}

function getRows() {
  return Array.from(document.querySelectorAll(".indented-canvas-row"));
}

// ── Rendering ──────────────────────────────────────────────────────────────

describe("IndentedSentenceCanvas — rendering", () => {
  it("renders a single empty row when value is empty", () => {
    setup();
    const inputs = getInputs();
    expect(inputs).toHaveLength(1);
    expect(inputs[0].value).toBe("");
    const gutter = screen.getByText("1");
    expect(gutter.classList.contains("indented-canvas-gutter")).toBe(true);
  });

  it("renders all rows in order with sequential line numbers", () => {
    setup({
      value: [
        { text: "And you were dead", depth: 0, kind: "main" },
        { text: "in your trespasses", depth: 1, kind: "modifier" },
        { text: "But God", depth: 0, kind: "main" },
      ],
    });
    const inputs = getInputs();
    expect(inputs.map((i) => i.value)).toEqual([
      "And you were dead",
      "in your trespasses",
      "But God",
    ]);
    const gutters = document.querySelectorAll(".indented-canvas-gutter");
    expect(Array.from(gutters).map((g) => g.textContent)).toEqual(["1", "2", "3"]);
  });

  it("applies the level-0 marker class only to depth=0 rows", () => {
    setup({
      value: [
        { text: "main", depth: 0, kind: "main" },
        { text: "sub", depth: 1, kind: "modifier" },
        { text: "main2", depth: 0, kind: "main" },
      ],
    });
    const rows = getRows();
    expect(rows[0].classList.contains("indented-canvas-row-main")).toBe(true);
    expect(rows[1].classList.contains("indented-canvas-row-main")).toBe(false);
    expect(rows[2].classList.contains("indented-canvas-row-main")).toBe(true);
  });

  it("renders an em-offset margin on inputs proportional to depth", () => {
    setup({
      value: [
        { text: "a", depth: 0, kind: "main" },
        { text: "b", depth: 2, kind: "modifier" },
      ],
    });
    const inputs = getInputs();
    expect(inputs[0].style.marginLeft).toBe("0em");
    expect(inputs[1].style.marginLeft).toBe("3em");
  });

  it("exposes data attributes per row (depth + line-number)", () => {
    setup({
      value: [
        { text: "a", depth: 0, kind: "main" },
        { text: "b", depth: 1, kind: "modifier" },
      ],
    });
    const rows = getRows();
    expect(rows[0].getAttribute("data-depth")).toBe("0");
    expect(rows[0].getAttribute("data-line-number")).toBe("1");
    expect(rows[1].getAttribute("data-depth")).toBe("1");
    expect(rows[1].getAttribute("data-line-number")).toBe("2");
  });
});

// ── Typing ──────────────────────────────────────────────────────────────────

describe("IndentedSentenceCanvas — typing", () => {
  it("emits onChange with normalized rows when text changes", () => {
    const { onChange } = setup();
    fireEvent.change(getInputs()[0], { target: { value: "And you were dead" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      { text: "And you were dead", depth: 0, kind: "main" },
    ]);
  });

  it("treats leading spaces as content, not indent", () => {
    const { onChange } = setup();
    fireEvent.change(getInputs()[0], { target: { value: "    indented by hand" } });
    expect(onChange).toHaveBeenCalledWith([
      { text: "    indented by hand", depth: 0, kind: "main" },
    ]);
  });
});

// ── Tab / Shift+Tab depth semantics ────────────────────────────────────────

describe("IndentedSentenceCanvas — Tab / Shift+Tab depth", () => {
  it("Tab increments the active row's depth and is preventDefault'd", () => {
    const { onChange } = setup({
      value: [{ text: "subject", depth: 0, kind: "main" }],
    });
    const event = fireEvent.keyDown(getInputs()[0], { key: "Tab" });
    // jsdom's fireEvent returns true if the event was preventDefault'd
    expect(event).toBe(false);
    expect(onChange).toHaveBeenCalledWith([
      { text: "subject", depth: 1, kind: "modifier" },
    ]);
  });

  it("Shift+Tab decrements the active row's depth", () => {
    const { onChange } = setup({
      value: [{ text: "modifier", depth: 2, kind: "modifier" }],
    });
    fireEvent.keyDown(getInputs()[0], { key: "Tab", shiftKey: true });
    expect(onChange).toHaveBeenCalledWith([
      { text: "modifier", depth: 1, kind: "modifier" },
    ]);
  });

  it("Shift+Tab clamps at depth 0", () => {
    const { onChange } = setup({
      value: [{ text: "subject", depth: 0, kind: "main" }],
    });
    fireEvent.keyDown(getInputs()[0], { key: "Tab", shiftKey: true });
    expect(onChange).toHaveBeenCalledWith([
      { text: "subject", depth: 0, kind: "main" },
    ]);
  });

  it("Tab clamps at maxDepth", () => {
    const { onChange } = setup({
      value: [{ text: "deep", depth: 3, kind: "modifier" }],
      maxDepth: 3,
    });
    fireEvent.keyDown(getInputs()[0], { key: "Tab" });
    expect(onChange).toHaveBeenCalledWith([
      { text: "deep", depth: 3, kind: "modifier" },
    ]);
  });

  it("derives kind from depth on every emit (depth=0 → main, depth>0 → modifier)", () => {
    const { onChange } = setup({
      value: [{ text: "x", depth: 0, kind: "main" }],
    });
    fireEvent.keyDown(getInputs()[0], { key: "Tab" });
    const emitted = onChange.mock.calls[0][0];
    expect(emitted[0].kind).toBe("modifier");
    fireEvent.keyDown(getInputs()[0], { key: "Tab", shiftKey: true });
    // The component re-derives off the original (still depth=0) snapshot —
    // but the second emit also normalizes correctly:
    const emitted2 = onChange.mock.calls[1][0];
    expect(emitted2[0].kind).toBe("main");
  });
});

// ── Enter splits, Backspace merges / decrements depth ─────────────────────

describe("IndentedSentenceCanvas — Enter split", () => {
  it("Enter splits the active row at the caret position into two rows at the same depth", () => {
    const { onChange } = setup({
      value: [{ text: "And you were dead in your sins", depth: 0, kind: "main" }],
    });
    const input = getInputs()[0];
    input.focus();
    input.setSelectionRange(17, 17); // after "And you were dead"
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith([
      { text: "And you were dead", depth: 0, kind: "main" },
      { text: " in your sins",     depth: 0, kind: "main" },
    ]);
  });

  it("Enter on an indented row preserves the depth on the new row", () => {
    const { onChange } = setup({
      value: [{ text: "modifier text", depth: 2, kind: "modifier" }],
    });
    const input = getInputs()[0];
    input.focus();
    input.setSelectionRange(8, 8);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith([
      { text: "modifier", depth: 2, kind: "modifier" },
      { text: " text",    depth: 2, kind: "modifier" },
    ]);
  });
});

describe("IndentedSentenceCanvas — Backspace at line start", () => {
  it("Backspace at start of an indented line decrements its depth (no merge)", () => {
    const { onChange } = setup({
      value: [
        { text: "main",     depth: 0, kind: "main" },
        { text: "modifier", depth: 1, kind: "modifier" },
      ],
    });
    const input = getInputs()[1];
    input.focus();
    input.setSelectionRange(0, 0);
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith([
      { text: "main",     depth: 0, kind: "main" },
      { text: "modifier", depth: 0, kind: "main" },
    ]);
  });

  it("Backspace at start of depth=0 line merges with the previous line", () => {
    const { onChange } = setup({
      value: [
        { text: "first",  depth: 0, kind: "main" },
        { text: "second", depth: 0, kind: "main" },
      ],
    });
    const input = getInputs()[1];
    input.focus();
    input.setSelectionRange(0, 0);
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith([
      { text: "firstsecond", depth: 0, kind: "main" },
    ]);
  });

  it("Backspace at start of the first line at depth=0 is a no-op", () => {
    const { onChange } = setup({
      value: [{ text: "alone", depth: 0, kind: "main" }],
    });
    const input = getInputs()[0];
    input.focus();
    input.setSelectionRange(0, 0);
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Backspace mid-line is left to the input's default behavior", () => {
    const { onChange } = setup({
      value: [{ text: "hello", depth: 0, kind: "main" }],
    });
    const input = getInputs()[0];
    input.focus();
    input.setSelectionRange(3, 3);
    fireEvent.keyDown(input, { key: "Backspace" });
    // We don't preventDefault when caret is mid-line — the browser handles
    // the deletion, then onChange fires from the resulting input event.
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ── Paste / drop intercept ─────────────────────────────────────────────────

describe("IndentedSentenceCanvas — paste / drop intercept", () => {
  it("blocks paste, prevents default, and shows the inline hint", () => {
    const { onChange } = setup({
      value: [{ text: "subject", depth: 0, kind: "main" }],
    });
    const input = getInputs()[0];
    fireEvent.paste(input, {
      clipboardData: { getData: () => "pasted text", types: ["text/plain"] },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("indented-canvas-paste-hint")).toBeTruthy();
  });

  it("blocks drop of text/plain and shows the inline hint", () => {
    const { onChange } = setup({
      value: [{ text: "subject", depth: 0, kind: "main" }],
    });
    const input = getInputs()[0];
    fireEvent.drop(input, {
      dataTransfer: { types: ["text/plain"], getData: () => "dropped" },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("indented-canvas-paste-hint")).toBeTruthy();
  });
});

// ── Disabled state ─────────────────────────────────────────────────────────

describe("IndentedSentenceCanvas — disabled", () => {
  it("renders inputs as disabled and does not emit onChange on Tab", () => {
    const { onChange } = setup({
      value: [{ text: "x", depth: 0, kind: "main" }],
      disabled: true,
    });
    const input = getInputs()[0];
    expect(input.disabled).toBe(true);
    fireEvent.keyDown(input, { key: "Tab" });
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ── Defensive normalization ────────────────────────────────────────────────

describe("IndentedSentenceCanvas — defensive normalization", () => {
  it("clamps negative or non-integer depth to 0 on emit", () => {
    const { onChange } = setup({
      value: [{ text: "x", depth: -3, kind: "modifier" }],
    });
    fireEvent.change(getInputs()[0], { target: { value: "y" } });
    expect(onChange).toHaveBeenCalledWith([
      { text: "y", depth: 0, kind: "main" },
    ]);
  });

  it("handles missing kind on input (re-derives kind from depth on emit)", () => {
    const { onChange } = setup({
      value: [{ text: "x", depth: 1 }],
    });
    fireEvent.change(getInputs()[0], { target: { value: "y" } });
    expect(onChange).toHaveBeenCalledWith([
      { text: "y", depth: 1, kind: "modifier" },
    ]);
  });
});
