// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import * as React from "react";

// Correctness audit, finding 24 — the topical Outline is the pastor's ARRANGEMENT
// (sort_order), date-independent (the Schedule owns dates). But `sermons` arrives
// from seriesSermonOrderBy DATED-FIRST, and the Outline rendered / reordered it
// raw — so a single scheduled sermon jumped to the top and, on the next reorder,
// baked that date-driven position into sort_order, scrambling the arrangement.
// The fix sorts committed topical sermons by sort_order (creation tiebreak) for
// both the render and moveSermon.

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
  exportStudyGuide: vi.fn(() => Promise.resolve({ success: true })),
}));

import SeriesPlanner from "../../src/components/SeriesPlanner";

const TOPICAL = {
  id: "st", title: "Mission", kind: "topical", status: "in_progress", color: "gold",
  start_date: "", end_date: "", big_idea: "TheBigIdea", overview: "", passage_range: "",
};
const mk = (id: string, title: string, sort_order: number, date: string, created_at: string) => ({
  id, title, sort_order, date, created_at, series_id: "st", section_id: null,
  passage: "", book_id: "", big_idea: "", overview: "", stage: "in_progress",
});

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  spine.getSeries.mockResolvedValue({ ...TOPICAL });
  spine.getSectionsBySeries.mockResolvedValue([]);
  spine.updateSermon.mockResolvedValue(undefined);
  // As the DB returns them: DATED-FIRST (seriesSermonOrderBy), i.e. the dated
  // sermon (Gamma) ahead of the undated ones — NOT arrangement order.
  spine.getSermonsBySeries.mockResolvedValue([
    mk("s3", "Gamma", 2, "2026-01-04", "2026-01-03"),
    mk("s1", "Alpha", 0, "", "2026-01-01"),
    mk("s2", "Beta", 1, "", "2026-01-02"),
  ]);
});

describe("SeriesPlanner topical Outline — arrangement order, date-independent (finding 24)", () => {
  it("renders committed sermons in sort_order, not the dated-first order the DB returns", async () => {
    localStorage.setItem("sermonforge_planner_intro_st", "1"); // suppress the auto "How this works" modal
    await act(async () => {
      render(<SeriesPlanner seriesId="st" onBack={() => {}} onOpenSermon={() => {}} />);
    });
    await screen.findByText("Saved");

    // Collapsed rows show the title as text; getAllByText returns document order.
    const titles = screen.getAllByText(/^(Alpha|Beta|Gamma)$/).map((e) => e.textContent);
    // Arrangement (sort_order 0,1,2) — NOT dated-first ["Gamma","Alpha","Beta"].
    expect(titles).toEqual(["Alpha", "Beta", "Gamma"]);
  });
});
