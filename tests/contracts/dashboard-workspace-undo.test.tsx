// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup, waitFor } from "@testing-library/react";
import * as React from "react";

// Correctness audit, finding 21 — undoing a WORKSPACE-originated delete restored
// the row in the DB but never re-added it to the freshly-remounted Dashboard's
// in-progress list, so the "Deleted · Undo" row vanished and the sermon stayed
// invisible until a manual reload (the undo looked like it deleted the sermon).
// The fix refetches getInProgressSermons after restore.

const spine = vi.hoisted(() => ({
  loadSampleSermon: vi.fn(() => Promise.resolve({})),
  getInProgressSermons: vi.fn(),
  getAllSermons: vi.fn(() => Promise.resolve([])),
  deleteSermon: vi.fn(() => Promise.resolve()),
  restoreSermon: vi.fn(() => Promise.resolve()),
  updateSermon: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../src/core/spine", () => spine);
// These fetch external content (verses / quotes) — stub them out.
vi.mock("../../src/components/DashboardVerseCarousel", () => ({ default: () => null }));
vi.mock("../../src/components/DashboardPreacherQuote", () => ({ default: () => null }));

import Dashboard from "../../src/components/Dashboard";

const NOTICE = { id: "s1", title: "Grace Abounds", passage: "Rom 5", date: "", stage: "in_progress" };

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  // The delete happened before this Dashboard mounted, so the initial list is empty.
  spine.getInProgressSermons.mockResolvedValue([]);
});

describe("Dashboard — workspace-delete undo re-adds the restored sermon (finding 21)", () => {
  it("refetches the in-progress list after Undo (and honors the restore + clears the notice)", async () => {
    const onClearDeletedSermonNotice = vi.fn();
    await act(async () => {
      render(
        <Dashboard
          onOpenSermon={() => {}}
          onNavigate={() => {}}
          deletedSermonNotice={NOTICE}
          onClearDeletedSermonNotice={onClearDeletedSermonNotice}
        />,
      );
    });
    await waitFor(() => expect(spine.getInProgressSermons).toHaveBeenCalledTimes(1)); // mount fetch

    // After restore, the refetch returns the restored sermon.
    spine.getInProgressSermons.mockResolvedValue([NOTICE]);

    const undo = await screen.findByText("Undo");
    await act(async () => { fireEvent.click(undo); });

    expect(spine.restoreSermon).toHaveBeenCalledWith("s1");
    // The fix refetches: mount (1) + post-undo (2).
    await waitFor(() => expect(spine.getInProgressSermons).toHaveBeenCalledTimes(2));
    expect(onClearDeletedSermonNotice).toHaveBeenCalled();
  });
});
