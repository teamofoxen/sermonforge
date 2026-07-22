// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup, waitFor } from "@testing-library/react";
import * as React from "react";
import { installTestSpine, resetTestSpine, insertSeriesRow } from "./_helpers/test-spine";

// Series Discovery — the load-bearing product guarantee: Discover and Outline are
// TWO VIEWS OF ONE SERIES, not two planning systems. These render the real
// SeriesPlanner against the stateful in-memory spine (installTestSpine), so a
// movement created in the Discover walk is a REAL section the Outline then shows —
// the shared-truth acceptance criteria (#6, #16), plus the re-entry (#17), the
// preaching-text-needs-a-movement guard, and topical non-regression (#20).
//
// The spine is NOT mocked here (unlike series-planner-save-retry) — the real
// src/core/spine.ts runs against the test-spine bridge, so create/read/update
// actually mutate a shared store. Only the non-spine IPC (calendar, export,
// feedback) is stubbed.

vi.mock("../../src/db/database", () => ({
  getCalendarNotes: vi.fn(() => Promise.resolve([])),
  exportStudyGuide: vi.fn(() => Promise.resolve({ success: true, filepath: "x.docx" })),
  logFeedback: vi.fn(() => Promise.resolve()),
  getFeedbackConfig: vi.fn(() => Promise.resolve({ enabled: false })),
}));

import SeriesPlanner from "../../src/components/SeriesPlanner";

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  installTestSpine();
  resetTestSpine();
  // jsdom implements neither scrollIntoView nor focus({preventScroll}); the
  // just-created movement/text cards call scrollIntoView on mount. Stub it (it
  // works in the real browser — verified in the preview render check).
  (window.HTMLElement.prototype as any).scrollIntoView = vi.fn();
});

function seedSeries(kind: "book" | "topical", id: string) {
  insertSeriesRow({
    id, title: kind === "book" ? "Luke" : "The Mission of God",
    kind, status: "in_progress", color: "gold",
    book_id: kind === "book" ? "luke" : null,
    canon_category: kind === "book" ? "nt_gospels" : "",
    passage_range: "", big_idea: "", overview: "",
  });
  // Suppress the first-open "How this works" modal so it can't overlay clicks.
  localStorage.setItem(`sermonforge_planner_intro_${id}`, "1");
}

async function renderPlanner(id: string) {
  await act(async () => {
    render(<SeriesPlanner seriesId={id} onBack={() => {}} onOpenSermon={() => {}} />);
  });
  await screen.findByText("Saved"); // topbar at-rest indicator = load complete
}

describe("Series Discovery — one series, two views", () => {
  it("a new book series opens on Discover; a movement created there is the same section Outline shows (#6, #16)", async () => {
    seedSeries("book", "sb1");
    await renderPlanner("sb1");

    // Landed on the Discover walk (book series, no sections yet).
    expect(screen.getByRole("heading", { name: "Read the Book" })).toBeTruthy();

    // Go to Step 3 and create a major movement (a REAL section via the spine).
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Step 3: Map the Major Movements" })); });
    await act(async () => { fireEvent.click(screen.getByText("+ Add major movement")); });
    const titleInput = await screen.findByPlaceholderText("e.g. Seeing Jesus Through Others' Eyes");

    // Name it — this edits the section's canonical `title` (shared with Outline).
    await act(async () => { fireEvent.change(titleInput, { target: { value: "Seeing Him Through Others' Eyes" } }); });

    // Switch to Outline: the SAME section is there, by the SAME title — no duplicate,
    // no conversion step.
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Outline" })); });
    expect(await screen.findByText("Seeing Him Through Others' Eyes")).toBeTruthy();

    // And it is one section in the store, not two (Discover didn't shadow-create).
    const sectionsRead = await (globalThis as any).electronAPI.spine("get-sections-by-series", "sb1");
    expect(sectionsRead).toHaveLength(1);
  });

  it("a preaching text created in Discover is the sermon Outline shows under its movement; reasoning typed on the draft survives commit (#8)", async () => {
    seedSeries("book", "sb5");
    await renderPlanner("sb5");

    // Step 3: create a movement (a real section to hold the text).
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Step 3: Map the Major Movements" })); });
    await act(async () => { fireEvent.click(screen.getByText("+ Add major movement")); });
    await screen.findByPlaceholderText("e.g. Seeing Jesus Through Others' Eyes");

    // Step 4: add a preaching text under it. The draft card auto-expands.
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Step 4: Identify the Preaching Texts" })); });
    await act(async () => { fireEvent.click(screen.getByText("+ Add preaching text")); });

    // Type reasoning on the DRAFT (before it commits), then the working title.
    const whyBegin = await screen.findByPlaceholderText("What opens this thought.");
    await act(async () => { fireEvent.change(whyBegin, { target: { value: "a clean scene-shift" } }); });
    const title = screen.getByPlaceholderText("A rough handle — the big idea expands on it.");
    await act(async () => { fireEvent.change(title, { target: { value: "The First Sermon" } }); });
    // Blur commits the draft: createSermon + the create-then-update follow-up that
    // carries the draft's discovery reasoning forward.
    await act(async () => { fireEvent.blur(title); });

    // Switch to Outline: the SAME sermon is there, under its section.
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Outline" })); });
    expect(await screen.findByText("The First Sermon")).toBeTruthy();

    // One real sermon row, and the reasoning typed on the draft survived the commit
    // (commitDraft's follow-up wrote `latest.discovery`).
    await waitFor(async () => {
      const serms = await (globalThis as any).electronAPI.spine("get-sermons-by-series", "sb5");
      expect(serms).toHaveLength(1);
      expect(serms[0].section_id).toBeTruthy();
      expect(JSON.parse(serms[0].discovery || "{}").whyBegin).toBe("a clean scene-shift");
    });
  });

  it("a preaching text cannot be created before a movement exists — the walk redirects (no phantom Section 1)", async () => {
    seedSeries("book", "sb2");
    await renderPlanner("sb2");

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Step 4: Identify the Preaching Texts" })); });
    // With no movements, Step 4 refuses to create and points back to Movements.
    expect(screen.getByText(/Preaching texts live inside a movement/)).toBeTruthy();
    expect(screen.getByText("← Back to Map the Major Movements")).toBeTruthy();
    expect(screen.queryByText("+ Add preaching text")).toBeNull();
  });

  it("re-entry after building movements: reload returns to Discover at the saved step, not Outline (#17 + the has-sections-is-first-open-only rule)", async () => {
    seedSeries("book", "sb3");
    await renderPlanner("sb3");
    expect(screen.getByRole("heading", { name: "Read the Book" })).toBeTruthy(); // landed on Discover

    // Create a movement — now sections EXIST, so the has-sections landing default
    // would resolve to Outline. Then move to Step 5.
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Step 3: Map the Major Movements" })); });
    await act(async () => { fireEvent.click(screen.getByText("+ Add major movement")); });
    await screen.findByPlaceholderText("e.g. Seeing Jesus Through Others' Eyes");
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Step 5: Test Every Passage" })); });
    expect(localStorage.getItem("sermonforge_discover_step_sb3")).toBe("4"); // 0-indexed step 5

    // Reload = unmount + remount. Despite sections now existing, the FIRST-OPEN
    // Discover landing was persisted, so re-entry returns to Discover — at step 5,
    // not step 1, and NOT bounced to Outline (the landing default is first-open only).
    cleanup();
    await renderPlanner("sb3");
    expect(screen.getByRole("heading", { name: "Test Every Passage" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Read the Book" })).toBeNull();
    expect(screen.getByRole("button", { name: "Discover" }).getAttribute("aria-current")).toBe("page");
  });

  it("topical series keep their journey — no Discover tab, lands on Outline (#20)", async () => {
    seedSeries("topical", "st1");
    await renderPlanner("st1");

    expect(screen.queryByRole("button", { name: "Discover" })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Map the Major Movements/ })).toBeNull();
    // The topical Outline (theme field) is what shows.
    expect(screen.getByPlaceholderText("e.g. The Mission of God")).toBeTruthy();
  });
});
