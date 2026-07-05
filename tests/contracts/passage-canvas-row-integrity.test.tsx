// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import * as React from "react";
import PassageCanvas from "../../src/components/PassageCanvas";

// Correctness audit, findings 6 & 7 — the PassageCanvas must never sever a
// thought-unit's canvas row id from its text, because downstream
// Meaning/Christ-Connection/Implication work is keyed by that id (see
// canvasRowIdsWithCumulativeWork). Two gestures used to orphan that work:
//   6. emptying every line re-seeded the canvas with fresh-UUID rows, and
//   7. pressing Enter at the start of a line moved the whole text onto a new id,
//      leaving the work stranded on the now-empty original.

const firstEmitted = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.calls[0][0];

describe("PassageCanvas — row-id / downstream-work integrity", () => {
  it("finding 6: emptying a canvas that has downstream work KEEPS the existing row ids (no re-seed orphaning)", () => {
    const onChange = vi.fn();
    // One existing row, emptied of text, but carrying downstream work (its id is
    // in rowIdsWithWork). Re-seeding here would strand that work.
    const rows = [{ id: "unit-B", text: "", depth: 0 }];
    const { container } = render(
      <PassageCanvas rows={rows} onChange={onChange} rowIdsWithWork={new Set(["unit-B"])} />,
    );
    const textareas = container.querySelectorAll("textarea.pc-input");
    expect(textareas.length).toBe(1); // the existing row, NOT fresh seed rows
    // Typing must emit a row whose id is still unit-B — work stays anchored.
    fireEvent.change(textareas[0], { target: { value: "typed again" } });
    const emitted = firstEmitted(onChange);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].id).toBe("unit-B");
    expect(emitted[0].text).toBe("typed again");
  });

  it("finding 6 (control): emptying a canvas with NO downstream work still re-seeds", () => {
    const onChange = vi.fn();
    const rows = [{ id: "unit-B", text: "", depth: 0 }];
    const { container } = render(
      <PassageCanvas rows={rows} onChange={onChange} rowIdsWithWork={new Set()} />,
    );
    fireEvent.change(container.querySelector("textarea.pc-input")!, { target: { value: "typed" } });
    const emitted = firstEmitted(onChange);
    // No anchored work → the "start over" re-seed is preserved: fresh id.
    expect(emitted[0].id).not.toBe("unit-B");
  });

  it("finding 7: Enter at line start inserts a blank row ABOVE, keeping text with its original id", () => {
    const onChange = vi.fn();
    const rows = [{ id: "unit-A", text: "hello", depth: 0 }];
    const { container } = render(<PassageCanvas rows={rows} onChange={onChange} />);
    const ta = container.querySelector("textarea.pc-input") as HTMLTextAreaElement;
    ta.focus();
    ta.setSelectionRange(0, 0); // caret at the very start
    fireEvent.keyDown(ta, { key: "Enter" });
    const emitted = firstEmitted(onChange);
    expect(emitted).toHaveLength(2);
    // Blank row above; the original row keeps its id AND its text.
    expect(emitted[0].text).toBe("");
    expect(emitted[0].id).not.toBe("unit-A");
    expect(emitted[1].id).toBe("unit-A");
    expect(emitted[1].text).toBe("hello");
  });

  it("finding 7 (unchanged): Enter mid-line still splits, moving only the after-cursor text", () => {
    const onChange = vi.fn();
    const rows = [{ id: "unit-A", text: "helloworld", depth: 0 }];
    const { container } = render(<PassageCanvas rows={rows} onChange={onChange} />);
    const ta = container.querySelector("textarea.pc-input") as HTMLTextAreaElement;
    ta.focus();
    ta.setSelectionRange(5, 5); // between "hello" and "world"
    fireEvent.keyDown(ta, { key: "Enter" });
    const emitted = firstEmitted(onChange);
    expect(emitted).toHaveLength(2);
    expect(emitted[0].id).toBe("unit-A"); // original id keeps the before-text
    expect(emitted[0].text).toBe("hello");
    expect(emitted[1].text).toBe("world"); // after-text on the new row
  });

  it("finding 19: a 7+ char verse label is not truncated by the gutter's length cap", () => {
    const onChange = vi.fn();
    // Row has text so the canvas renders it (not a re-seed). Psalm 119:176.
    const rows = [{ id: "unit-A", text: "The whole of your word is truth", depth: 0, verse: "3" }];
    const { container } = render(<PassageCanvas rows={rows} onChange={onChange} />);
    const gutter = container.querySelector("input.pc-gutter") as HTMLInputElement;
    fireEvent.change(gutter, { target: { value: "119:176" } });
    const emitted = firstEmitted(onChange);
    expect(emitted[0].verse).toBe("119:176"); // NOT "119:17" (old 6-char slice)
  });

  it("finding 19: the gutter still rejects non-verse characters (prose can't leak in)", () => {
    const onChange = vi.fn();
    const rows = [{ id: "unit-A", text: "some text", depth: 0, verse: "3" }];
    const { container } = render(<PassageCanvas rows={rows} onChange={onChange} />);
    const gutter = container.querySelector("input.pc-gutter") as HTMLInputElement;
    fireEvent.change(gutter, { target: { value: "12:5-19 abc!" } });
    const emitted = firstEmitted(onChange);
    expect(emitted[0].verse).toBe("12:5-19"); // letters/space/punct stripped, range kept
  });
});
