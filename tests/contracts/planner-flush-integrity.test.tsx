// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import * as React from "react";
import { runRegisteredFlushes } from "../../src/utils/closeFlush";

// Session-1 remediation — the persistence-transition contract in the Series
// Planner:
//
//   • A write whose debounce ALREADY FIRED and failed is parked in
//     failedWritesRef with no timer left. The planner's registered debounce
//     flushers alone would report clean — the global flush (window close /
//     quit / export / Back) must treat those unresolved entries as a FAILED
//     flush, not proceed over stale library truth.
//   • The study-guide export must refuse stale database state in exactly that
//     condition (the booklet is built from the DB in main, not renderer
//     memory — a failed flush means an out-of-date booklet).
//   • Planner Back runs the same leave guard as the workspace: stay on
//     "failed" unless the pastor explicitly chooses "Leave anyway".
//   • Successful transitions behave as before.
//
// Real timers: parking a failure requires the 800ms debounce to actually fire
// (that is the point — no timer remains afterward).

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
const db = vi.hoisted(() => ({
  getCalendarNotes: vi.fn(() => Promise.resolve([])),
  exportStudyGuide: vi.fn(() => Promise.resolve({ success: true, filepath: "x.docx" })),
  // FeedbackFlag reads these; keep them inert in the test.
  logFeedback: vi.fn(() => Promise.resolve()),
  getFeedbackConfig: vi.fn(() => Promise.resolve({ enabled: false })),
}));
vi.mock("../../src/db/database", () => db);

import SeriesPlanner from "../../src/components/SeriesPlanner";

const TOPICAL = {
  id: "st", title: "Mission", kind: "topical", status: "in_progress", color: "gold",
  start_date: "", end_date: "", big_idea: "", overview: "", passage_range: "",
};

beforeEach(() => {
  cleanup(); // unmount any prior planner so its flushers unregister
  vi.clearAllMocks();
  localStorage.clear();
  spine.getSectionsBySeries.mockResolvedValue([]);
  spine.getSermonsBySeries.mockResolvedValue([]);
  spine.updateSeries.mockResolvedValue(undefined);
  spine.updateSection.mockResolvedValue(undefined);
  spine.updateSermon.mockResolvedValue(undefined);
});

async function renderPlanner(series: Record<string, unknown>, handlers: Record<string, unknown> = {}) {
  spine.getSeries.mockResolvedValue(series);
  // Suppress the first-open "How this works" auto-modal so it can't overlay clicks.
  localStorage.setItem(`sermonforge_planner_intro_${series.id}`, "1");
  await act(async () => {
    render(<SeriesPlanner seriesId={series.id as string} onBack={() => {}} onOpenSermon={() => {}} {...handlers} />);
  });
  await screen.findByText("Saved");
}

// Type into the theme field and let the 800ms debounce FIRE against a
// rejecting updateSeries — afterwards no timer is pending and the failed
// write is parked in failedWritesRef (the condition under test).
async function parkFailedWrite() {
  spine.updateSeries.mockRejectedValue(new Error("db locked"));
  const theme = screen.getByPlaceholderText("e.g. The Mission of God") as HTMLInputElement;
  await act(async () => {
    fireEvent.change(theme, { target: { value: "Sent" } });
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 850)); // debounce fires → write fails → parked
  });
  await screen.findByText("Save failed");
}

describe("SeriesPlanner — unresolved failed writes fail the global flush", () => {
  it("runRegisteredFlushes reports ok:false while a parked write remains AFTER its debounce fired; a healed retry drains it back to ok:true", async () => {
    await renderPlanner({ ...TOPICAL });
    await parkFailedWrite();
    const callsAfterPark = spine.updateSeries.mock.calls.length;

    // No debounce timer is pending — only the parked failure. The global
    // flush must retry it and, still failing, report a FAILED transition.
    let res: { ok: boolean } = { ok: true };
    await act(async () => {
      res = await runRegisteredFlushes();
    });
    expect(res.ok).toBe(false);
    // The flusher actually re-attempted the parked write (one last chance to
    // save), it didn't just report.
    expect(spine.updateSeries.mock.calls.length).toBeGreaterThan(callsAfterPark);

    // Writes heal → the same global flush drains the queue and reports saved.
    spine.updateSeries.mockResolvedValue(undefined);
    await act(async () => {
      res = await runRegisteredFlushes();
    });
    expect(res.ok).toBe(true);
    await screen.findByText("Saved");
  });

  it("study-guide export refuses stale database state while a parked failed write remains", async () => {
    await renderPlanner({ ...TOPICAL });
    // Pre-mark the guide as built (its localStorage gate) so the tab mounts
    // the booklet + Export card instead of the "Import from outline" empty state.
    localStorage.setItem(`sermonforge_planner_guide_built_${TOPICAL.id}`, "1");
    await parkFailedWrite();

    // The booklet is built from the DB in main — with the parked write still
    // failing, exporting now would bake a stale booklet.
    await act(async () => {
      fireEvent.click(screen.getByText("Study guide"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Export to Word"));
    });
    expect(db.exportStudyGuide).not.toHaveBeenCalled();
    expect(await screen.findByText(/export was stopped/)).toBeTruthy();
  });

  it("planner Back stays on a failed flush until the pastor explicitly leaves anyway", async () => {
    const onBack = vi.fn();
    await renderPlanner({ ...TOPICAL }, { onBack });
    await parkFailedWrite();

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Back"));
    });
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.getByText("Your last changes didn't save")).toBeTruthy();

    // "Keep working" holds the planner open.
    await act(async () => {
      fireEvent.click(screen.getByText("Keep working"));
    });
    expect(onBack).not.toHaveBeenCalled();

    // The explicit choice leaves.
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Back"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Leave anyway"));
    });
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("successful transitions behave as before: a clean planner Back leaves once, no dialog", async () => {
    const onBack = vi.fn();
    await renderPlanner({ ...TOPICAL }, { onBack });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Back"));
    });
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Your last changes didn't save")).toBeNull();
    expect(screen.queryByText("Couldn't confirm your last changes saved")).toBeNull();
  });
});
