// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import * as React from "react";

// Correctness audit, finding 22 — SermonList (All Sermons / in-progress view).
// A failed load used to be swallowed (.catch(console.error)) and rendered as the
// empty state "No sermons found." — a false empty that makes the pastor's whole
// in-progress library look gone. The fix surfaces the failure distinctly.

const spine = vi.hoisted(() => ({
  getAllSermons: vi.fn(),
  updateSermon: vi.fn(),
}));
const db = vi.hoisted(() => ({ searchSermons: vi.fn() }));
vi.mock("../../src/core/spine", () => spine);
vi.mock("../../src/db/database", () => db);

import SermonList from "../../src/components/SermonList";

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  db.searchSermons.mockResolvedValue([]);
});

describe("SermonList — load failure is surfaced, not shown as empty (finding 22)", () => {
  it("shows a load error instead of the 'No sermons found.' empty state when the load fails", async () => {
    spine.getAllSermons.mockRejectedValue(new Error("db locked"));
    await act(async () => { render(<SermonList onOpenSermon={() => {}} />); });

    await screen.findByText(/Could not load your sermons/i);
    // Must NOT read as an empty library.
    expect(screen.queryByText("No sermons found.")).toBeNull();
  });

  it("still shows the empty state when the load succeeds with zero sermons", async () => {
    spine.getAllSermons.mockResolvedValue([]);
    await act(async () => { render(<SermonList onOpenSermon={() => {}} />); });

    await screen.findByText("No sermons found.");
    expect(screen.queryByText(/Could not load your sermons/i)).toBeNull();
  });
});
