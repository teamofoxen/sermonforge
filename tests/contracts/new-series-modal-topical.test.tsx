// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import * as React from "react";

// Correctness audit, finding 31 — the topical create-then-update in
// NewSeriesModal. createSeries always inserts kind='book' (the INSERT is never
// widened); a follow-up updateSeries flips it to 'topical'. That follow-up used
// to be swallowed and onCreated ran anyway — stranding the pastor with a
// book-type series reported as success, with no way to convert it on the planner
// (false-success). And re-clicking Create ran createSeries AGAIN → duplicate.

const spine = vi.hoisted(() => ({
  createSeries: vi.fn(),
  updateSeries: vi.fn(),
}));
vi.mock("../../src/core/spine", () => spine);

import NewSeriesModal from "../../src/components/NewSeriesModal";

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  spine.createSeries.mockResolvedValue({ id: "new-series-1" });
  spine.updateSeries.mockResolvedValue(undefined);
});

describe("NewSeriesModal — topical create-then-update (finding 31)", () => {
  it("does NOT navigate when the topical kind write fails, and retry updates the same row (no duplicate series)", async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    await act(async () => {
      render(<NewSeriesModal onClose={onClose} onCreated={onCreated} />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Topical series")); });
    fireEvent.change(screen.getByPlaceholderText("e.g. The Mission of God"), {
      target: { value: "The Mission of God" },
    });

    // The load-bearing kind/theme follow-up fails.
    spine.updateSeries.mockRejectedValue(new Error("db locked"));
    await act(async () => { fireEvent.click(screen.getByText("Create Series")); });

    // Row created, kind write attempted+failed → must NOT report success.
    expect(spine.createSeries).toHaveBeenCalledTimes(1);
    expect(spine.updateSeries).toHaveBeenCalledTimes(1);
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/try again/i); // error surfaced, not swallowed

    // Retry now succeeds. It must UPDATE the existing series, never create a second.
    spine.updateSeries.mockResolvedValue(undefined);
    await act(async () => { fireEvent.click(screen.getByText("Create Series")); });
    expect(spine.createSeries).toHaveBeenCalledTimes(1); // still once — no duplicate series
    expect(spine.updateSeries).toHaveBeenCalledTimes(2); // kind write retried on the same id
    expect(onCreated).toHaveBeenCalledWith("new-series-1");
  });
});
