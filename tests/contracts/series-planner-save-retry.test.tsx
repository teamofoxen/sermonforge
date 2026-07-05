// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import * as React from "react";

// Correctness audit, Slice 3 — SeriesPlanner save/retry machinery (findings 15,
// 9, 16). These pin behavior the existing suite never covered, so "all green"
// on the old code would have been a lie:
//   • A failed STRUCTURAL mutation (create/delete/move) must NOT be replayed by
//     the topbar Retry — replaying it duplicates a create or desyncs a delete
//     (findings 15/1b and the 9/16 residual). retryable:false keeps it out of
//     the retry queue.
//   • A failed retryable FIELD write is remembered even across a later, unrelated
//     successful save — the old single-slot `lastFailedRef` + clear-on-success
//     silently dropped it (finding 15/1a). Retry drains the queue.

const spine = vi.hoisted(() => ({
  getSeries: vi.fn(),
  getSectionsBySeries: vi.fn(),
  getSermonsBySeries: vi.fn(),
  createSection: vi.fn(),
  updateSection: vi.fn(),
  deleteSection: vi.fn(),
  createSermon: vi.fn(),
  updateSermon: vi.fn(),
  deleteSermon: vi.fn(),
  updateSeries: vi.fn(),
}));
vi.mock("../../src/core/spine", () => spine);
vi.mock("../../src/db/database", () => ({
  getCalendarNotes: vi.fn(() => Promise.resolve([])),
  exportStudyGuide: vi.fn(() => Promise.resolve({ success: true, filepath: "x.docx" })),
  // FeedbackFlag reads these; keep them inert in the test.
  logFeedback: vi.fn(() => Promise.resolve()),
  getFeedbackConfig: vi.fn(() => Promise.resolve({ enabled: false })),
}));

import SeriesPlanner from "../../src/components/SeriesPlanner";

const BOOK = {
  id: "sb", title: "Romans", kind: "book", status: "in_progress", color: "gold",
  start_date: "", end_date: "", big_idea: "", overview: "", passage_range: "",
  book_id: "romans", canon_category: "nt_epistles",
};
const TOPICAL = {
  id: "st", title: "Mission", kind: "topical", status: "in_progress", color: "gold",
  start_date: "", end_date: "", big_idea: "", overview: "", passage_range: "",
};

beforeEach(() => {
  cleanup(); // unmount any prior test's planner so document.body is clean
  vi.clearAllMocks();
  localStorage.clear();
  spine.getSectionsBySeries.mockResolvedValue([]);
  spine.getSermonsBySeries.mockResolvedValue([]);
  spine.updateSeries.mockResolvedValue(undefined);
  spine.updateSection.mockResolvedValue(undefined);
  spine.updateSermon.mockResolvedValue(undefined);
  spine.createSection.mockResolvedValue({ id: "sec-new" });
});

async function renderPlanner(series: Record<string, unknown>) {
  spine.getSeries.mockResolvedValue(series);
  // Suppress the first-open "How this works" auto-modal so it can't overlay clicks.
  localStorage.setItem(`sermonforge_planner_intro_${series.id}`, "1");
  await act(async () => {
    render(<SeriesPlanner seriesId={series.id as string} onBack={() => {}} onOpenSermon={() => {}} />);
  });
  // "Saved" is the topbar save indicator at rest — a unique, load-complete signal
  // (the series title can appear twice: topbar + book picker).
  await screen.findByText("Saved");
}

describe("SeriesPlanner — save-failure retry safety", () => {
  it("does NOT replay a failed structural create on topbar Retry (findings 15/9/16 — no duplicate section)", async () => {
    spine.createSection.mockRejectedValue(new Error("db locked"));
    await renderPlanner({ ...BOOK });

    await act(async () => { fireEvent.click(screen.getByText("+ Add section")); });
    await screen.findByText("Save failed");
    expect(spine.createSection).toHaveBeenCalledTimes(1);

    // The retry queue holds only idempotent field writes; the create thunk was
    // never queued, so Retry must be a no-op for it.
    await act(async () => { fireEvent.click(screen.getByText("Retry")); });
    expect(spine.createSection).toHaveBeenCalledTimes(1); // still once — no duplicate
  });

  it("keeps 'Save failed' after an unrelated successful save while an earlier field write is still unsaved, and Retry recovers it (finding 15/1a)", async () => {
    await renderPlanner({ ...TOPICAL });
    const theme = screen.getByPlaceholderText("e.g. The Mission of God") as HTMLInputElement;
    const bigIdea = screen.getByPlaceholderText(
      "The single idea this series sounds — in one sentence.",
    ) as HTMLInputElement;

    // Two field writes fail. Editing a DIFFERENT field flushes the prior field's
    // debounced write, so this sequence flushes theme (fails #1) then big idea (fails #2).
    spine.updateSeries.mockRejectedValue(new Error("db locked"));
    await act(async () => { fireEvent.change(theme, { target: { value: "T1" } }); });
    await act(async () => { fireEvent.change(bigIdea, { target: { value: "B1" } }); });
    await act(async () => { fireEvent.change(theme, { target: { value: "T2" } }); });
    await screen.findByText("Save failed");
    expect(spine.updateSeries.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Now writes succeed. One more field switch flushes the pending theme write —
    // a SUCCESSFUL save while the queue still holds the two earlier failures.
    spine.updateSeries.mockResolvedValue(undefined);
    await act(async () => { fireEvent.change(bigIdea, { target: { value: "B2" } }); });

    // The success must NOT flip the indicator to Saved — earlier work is unsaved.
    expect(screen.queryByText("Save failed")).not.toBeNull();
    expect(screen.queryByText("Saved")).toBeNull();

    // Retry drains the queued (now-succeeding) failures → back to Saved.
    await act(async () => { fireEvent.click(screen.getByText("Retry")); });
    await screen.findByText("Saved");
  });
});
