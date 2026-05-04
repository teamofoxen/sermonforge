// @vitest-environment jsdom
//
// ParaphraseBlocks component tests (SPRD A2.2).
//
// Covers main-sentence grouping (groupMainSentences helper), per-block
// rendering of original head + indented modifiers, paraphrase textarea
// wiring, orphan-paraphrase preservation on canvas changes, paste/drop
// intercept, empty state, and disabled state.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ParaphraseBlocks, { groupMainSentences } from "./ParaphraseBlocks";

const CANVAS_TWO_BLOCKS = [
  { text: "And you were dead",      depth: 0, kind: "main"     },
  { text: "in your trespasses",     depth: 1, kind: "modifier" },
  { text: "in which you walked",    depth: 1, kind: "modifier" },
  { text: "But God",                depth: 0, kind: "main"     },
  { text: "being rich in mercy",    depth: 1, kind: "modifier" },
];

function setup(overrides = {}) {
  const onChange = vi.fn();
  const props = {
    canvas: overrides.canvas ?? CANVAS_TWO_BLOCKS,
    value: overrides.value ?? [],
    onChange,
    disabled: overrides.disabled ?? false,
  };
  if (overrides.onChange) props.onChange = overrides.onChange;
  const utils = render(<ParaphraseBlocks {...props} />);
  return { onChange, ...utils };
}

function getBlocks() {
  return Array.from(document.querySelectorAll(".paraphrase-block"));
}

function getTextareas() {
  return Array.from(document.querySelectorAll(".paraphrase-block-input"));
}

// ── groupMainSentences helper ──────────────────────────────────────────────

describe("groupMainSentences", () => {
  it("groups level-0 lines plus their indented modifiers into blocks", () => {
    const blocks = groupMainSentences(CANVAS_TWO_BLOCKS);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      id: "ms-0",
      head: { text: "And you were dead", depth: 0 },
      modifiers: [
        { text: "in your trespasses",  depth: 1 },
        { text: "in which you walked", depth: 1 },
      ],
    });
    expect(blocks[1]).toEqual({
      id: "ms-1",
      head: { text: "But God", depth: 0 },
      modifiers: [{ text: "being rich in mercy", depth: 1 }],
    });
  });

  it("returns an empty list for an empty or non-array canvas", () => {
    expect(groupMainSentences([])).toEqual([]);
    expect(groupMainSentences(null)).toEqual([]);
    expect(groupMainSentences(undefined)).toEqual([]);
  });

  it("skips leading depth>0 rows that have no main sentence to attach to", () => {
    const blocks = groupMainSentences([
      { text: "orphan modifier", depth: 1, kind: "modifier" },
      { text: "real head",       depth: 0, kind: "main" },
      { text: "real modifier",   depth: 1, kind: "modifier" },
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].head.text).toBe("real head");
    expect(blocks[0].modifiers).toEqual([{ text: "real modifier", depth: 1 }]);
  });

  it("supports an isolated level-0 line with no modifiers", () => {
    const blocks = groupMainSentences([
      { text: "alone", depth: 0, kind: "main" },
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].head.text).toBe("alone");
    expect(blocks[0].modifiers).toEqual([]);
  });
});

// ── Rendering ──────────────────────────────────────────────────────────────

describe("ParaphraseBlocks — rendering", () => {
  it("renders one block per main sentence with head + modifiers visible", () => {
    setup();
    const blocks = getBlocks();
    expect(blocks).toHaveLength(2);
    expect(blocks[0].textContent).toContain("And you were dead");
    expect(blocks[0].textContent).toContain("in your trespasses");
    expect(blocks[0].textContent).toContain("in which you walked");
    expect(blocks[1].textContent).toContain("But God");
    expect(blocks[1].textContent).toContain("being rich in mercy");
  });

  it("renders one paraphrase textarea per block", () => {
    setup();
    expect(getTextareas()).toHaveLength(2);
  });

  it("loads paraphrases from value, matched by main_sentence_id", () => {
    setup({
      value: [
        { main_sentence_id: "ms-0", paraphrase: "We were dead in our sins."    },
        { main_sentence_id: "ms-1", paraphrase: "But God acted on our behalf." },
      ],
    });
    const tas = getTextareas();
    expect(tas[0].value).toBe("We were dead in our sins.");
    expect(tas[1].value).toBe("But God acted on our behalf.");
  });

  it("shows empty paraphrase when value lacks an entry for a block id", () => {
    setup({
      value: [{ main_sentence_id: "ms-1", paraphrase: "Only the second one." }],
    });
    const tas = getTextareas();
    expect(tas[0].value).toBe("");
    expect(tas[1].value).toBe("Only the second one.");
  });

  it("renders modifiers with indent based on depth", () => {
    setup();
    const modifiers = document.querySelectorAll(".paraphrase-block-modifier");
    expect(modifiers).toHaveLength(3);
    // First two modifiers are depth=1 → 1.5em
    expect(modifiers[0].style.marginLeft).toBe("1.5em");
    expect(modifiers[1].style.marginLeft).toBe("1.5em");
    expect(modifiers[2].style.marginLeft).toBe("1.5em");
  });

  it("exposes data-main-sentence-id on each block", () => {
    setup();
    const blocks = getBlocks();
    expect(blocks[0].getAttribute("data-main-sentence-id")).toBe("ms-0");
    expect(blocks[1].getAttribute("data-main-sentence-id")).toBe("ms-1");
  });
});

// ── Empty state ────────────────────────────────────────────────────────────

describe("ParaphraseBlocks — empty canvas", () => {
  it("renders an empty-state message when canvas has no level-0 lines", () => {
    setup({ canvas: [] });
    expect(getBlocks()).toHaveLength(0);
    expect(screen.getByText(/Lay out the main sentences/i)).toBeTruthy();
  });

  it("renders an empty-state message when canvas only has orphan modifiers", () => {
    setup({
      canvas: [
        { text: "orphan", depth: 1, kind: "modifier" },
      ],
    });
    expect(getBlocks()).toHaveLength(0);
    expect(screen.getByText(/Lay out the main sentences/i)).toBeTruthy();
  });
});

// ── Typing / paraphrase emission ──────────────────────────────────────────

describe("ParaphraseBlocks — paraphrase typing", () => {
  it("emits onChange with a new entry for an unparaphrased block", () => {
    const { onChange } = setup();
    fireEvent.change(getTextareas()[0], { target: { value: "We were dead." } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      { main_sentence_id: "ms-0", paraphrase: "We were dead." },
    ]);
  });

  it("emits onChange with the second block's paraphrase when typed", () => {
    const { onChange } = setup({
      value: [{ main_sentence_id: "ms-0", paraphrase: "First done." }],
    });
    fireEvent.change(getTextareas()[1], { target: { value: "But God acted." } });
    expect(onChange).toHaveBeenCalledWith([
      { main_sentence_id: "ms-0", paraphrase: "First done." },
      { main_sentence_id: "ms-1", paraphrase: "But God acted." },
    ]);
  });

  it("preserves orphan paraphrases when canvas drops a main sentence", () => {
    // Canvas now has only one block; value still carries paraphrases for
    // both ms-0 and ms-1 from a previous canvas state.
    const { onChange } = setup({
      canvas: [{ text: "Only this one.", depth: 0, kind: "main" }],
      value: [
        { main_sentence_id: "ms-0", paraphrase: "Old paraphrase 0." },
        { main_sentence_id: "ms-1", paraphrase: "Orphan paraphrase 1." },
      ],
    });
    fireEvent.change(getTextareas()[0], { target: { value: "New paraphrase 0." } });
    expect(onChange).toHaveBeenCalledWith([
      { main_sentence_id: "ms-0", paraphrase: "New paraphrase 0." },
      { main_sentence_id: "ms-1", paraphrase: "Orphan paraphrase 1." },
    ]);
  });
});

// ── Paste / drop intercept ─────────────────────────────────────────────────

describe("ParaphraseBlocks — paste / drop intercept", () => {
  it("blocks paste in a paraphrase input and shows the inline hint", () => {
    const { onChange } = setup();
    fireEvent.paste(getTextareas()[0], {
      clipboardData: { getData: () => "pasted", types: ["text/plain"] },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("paraphrase-blocks-paste-hint")).toBeTruthy();
  });

  it("blocks drop of text/plain in a paraphrase input", () => {
    const { onChange } = setup();
    fireEvent.drop(getTextareas()[0], {
      dataTransfer: { types: ["text/plain"], getData: () => "dropped" },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("paraphrase-blocks-paste-hint")).toBeTruthy();
  });
});

// ── Disabled state ─────────────────────────────────────────────────────────

describe("ParaphraseBlocks — disabled", () => {
  it("renders all paraphrase textareas as disabled", () => {
    setup({ disabled: true });
    for (const ta of getTextareas()) {
      expect(ta.disabled).toBe(true);
    }
  });
});
