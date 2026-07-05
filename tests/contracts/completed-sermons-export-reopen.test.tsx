// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup, waitFor } from "@testing-library/react";
import * as React from "react";

// Correctness audit, Slice 4 — CompletedSermons (Preached view).
//   13: Export must build its payload from the FULL sermon. During a search the
//       card is a THIN search-result row (flattened text, no manuscript JSON /
//       main_point_pair / outline / functional_elements), so exporting it made a
//       broken document. Fix re-fetches via getSermon(id).
//   36: Reopen removed the sermon only from the loaded list, not from active
//       search results — so it lingered in the Preached view while searching.

const spine = vi.hoisted(() => ({
  getAllSermons: vi.fn(),
  getSermon: vi.fn(),
  updateSermon: vi.fn(),
}));
const db = vi.hoisted(() => ({
  exportManuscript: vi.fn(),
  searchSermons: vi.fn(),
}));
vi.mock("../../src/core/spine", () => spine);
vi.mock("../../src/db/database", () => db);

import CompletedSermons from "../../src/components/CompletedSermons";

const FULL = {
  id: "s1", title: "Grace Abounds", stage: "complete", passage: "Rom 5", date: "2026-01-04",
  manuscript: JSON.stringify({ introduction: { hook: "Full intro" }, transitions: {}, conclusion: {} }),
  main_point_pair: "", outline: "[]", functional_elements: "{}",
};
// A search-result row: flattened text, NO structured manuscript JSON.
const THIN = {
  id: "s1", title: "Grace Abounds", stage: "complete", passage: "Rom 5", date: "2026-01-04",
  manuscript: "Full intro (flattened search text only)", matchedColumn: "manuscript", snippet: "…Full intro…",
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  spine.getAllSermons.mockResolvedValue([FULL]);
  spine.getSermon.mockResolvedValue(FULL);
  spine.updateSermon.mockResolvedValue(undefined);
  db.exportManuscript.mockResolvedValue({ success: true, opened: false });
  db.searchSermons.mockResolvedValue([THIN]);
});

describe("CompletedSermons — export + reopen correctness", () => {
  it("finding 13: exporting a search result re-fetches the FULL sermon (not the thin search row)", async () => {
    await act(async () => { render(<CompletedSermons onOpenSermon={() => {}} />); });
    await screen.findByText("Grace Abounds");

    // Search → the debounced search result renders.
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "grace" } });
    await waitFor(() => expect(db.searchSermons).toHaveBeenCalled());
    await screen.findByText("Export to Word");

    await act(async () => { fireEvent.click(screen.getByText("Export to Word")); });
    // The fix fetches the full row by id before building the export payload.
    expect(spine.getSermon).toHaveBeenCalledWith("s1");
    expect(db.exportManuscript).toHaveBeenCalledTimes(1);
  });

  it("finding 36: reopening during a search drops the sermon from the search results too", async () => {
    await act(async () => { render(<CompletedSermons onOpenSermon={() => {}} />); });
    await screen.findByText("Grace Abounds");

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "grace" } });
    await waitFor(() => expect(db.searchSermons).toHaveBeenCalled());
    await screen.findByText("Reopen");

    await act(async () => { fireEvent.click(screen.getByText("Reopen")); });
    expect(spine.updateSermon).toHaveBeenCalledWith("s1", { stage: "in_progress" });
    // The reopened sermon must leave the (search-filtered) Preached view.
    await screen.findByText(/No preached sermons match your search/i);
  });
});
