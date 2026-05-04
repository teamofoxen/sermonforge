// @vitest-environment jsdom
//
// SpotlightWorksheet component tests (SPRD B1.1).
//
// Covers the spotlight pattern across a worksheet's fields, with both
// single-question (A1.1 back-compat) and multi-question (SFDI Field Pattern)
// rendering paths.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SpotlightWorksheet, {
  SpotlightField,
  firstIncompleteQuestionKey,
} from "./SpotlightWorksheet";

const SINGLE_FIELDS = [
  { key: "context",   label: "Context",      hint: "Surrounding context note" },
  { key: "divisions", label: "Divisions",    hint: "Main thought units" },
  { key: "big_ideas", label: "Big Ideas",    hint: "Major themes" },
];

const MULTI_FIELD_BACKGROUND = {
  key: "background",
  label: "Background",
  hint: "World the book was written into",
  questions: [
    { key: "author",   prompt: "Who wrote this book?" },
    { key: "date",     prompt: "When was it written?" },
    { key: "audience", prompt: "Who was the original audience?" },
    { key: "genre",    prompt: "What kind of literature is this?" },
  ],
};

const MIXED_FIELDS = [
  MULTI_FIELD_BACKGROUND,
  { key: "context", label: "Context", hint: "Surrounding context note" },
];

function setup(overrides = {}) {
  const onChange = vi.fn();
  const onToggleNA = vi.fn();
  const props = {
    fields: overrides.fields ?? SINGLE_FIELDS,
    data: overrides.data ?? {},
    onChange,
    onToggleNA,
    legacyNotes: overrides.legacyNotes,
  };
  if (overrides.onChange) props.onChange = overrides.onChange;
  if (overrides.onToggleNA) props.onToggleNA = overrides.onToggleNA;
  const utils = render(<SpotlightWorksheet {...props} />);
  return { onChange, onToggleNA, ...utils };
}

// ── firstIncompleteQuestionKey helper ──────────────────────────────────────

describe("firstIncompleteQuestionKey", () => {
  const QUESTIONS = MULTI_FIELD_BACKGROUND.questions;

  it("returns the first question's key when no answers exist", () => {
    expect(firstIncompleteQuestionKey(QUESTIONS, {}, "background")).toBe("author");
  });

  it("skips over already-answered questions", () => {
    const data = { background: { author: { value: "Paul", na: false } } };
    expect(firstIncompleteQuestionKey(QUESTIONS, data, "background")).toBe("date");
  });

  it("treats N/A questions as complete (skips them)", () => {
    const data = {
      background: {
        author: { value: "Paul", na: false },
        date:   { value: "",     na: true  },
      },
    };
    expect(firstIncompleteQuestionKey(QUESTIONS, data, "background")).toBe("audience");
  });

  it("returns the first question key when all answers are filled (acts as fallback)", () => {
    const data = {
      background: {
        author:   { value: "Paul",       na: false },
        date:     { value: "60 AD",      na: false },
        audience: { value: "Ephesus",    na: false },
        genre:    { value: "epistle",    na: false },
      },
    };
    expect(firstIncompleteQuestionKey(QUESTIONS, data, "background")).toBe("author");
  });
});

// ── Single-question back-compat ────────────────────────────────────────────

describe("SpotlightWorksheet — single-question back-compat", () => {
  it("activates the first field on mount when worksheet is empty", () => {
    setup();
    // The first field is "context" — its textarea is rendered.
    const activeField = document.querySelector(".worksheet-field-active");
    expect(activeField).toBeTruthy();
    expect(activeField.textContent).toContain("Context");
  });

  it("emits onChange with (fieldKey, qKey, value) when typing in the active field", () => {
    const { onChange } = setup();
    const ta = document.querySelector(".worksheet-field-active textarea");
    fireEvent.change(ta, { target: { value: "Some context" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("context", "primary", "Some context");
  });

  it("emits onToggleNA with (fieldKey, qKey) when the N/A toggle is clicked", () => {
    const { onToggleNA } = setup();
    const naToggle = screen.getByText("Mark not applicable");
    fireEvent.click(naToggle);
    expect(onToggleNA).toHaveBeenCalledWith("context", "primary");
  });

  it("Next-question button advances to the next field on a non-last field", () => {
    setup({
      data: {
        context: { primary: { value: "Some context", na: false } },
      },
    });
    const nextBtn = screen.getByText(/Next question →/);
    fireEvent.click(nextBtn);
    // After clicking, the active field should be "divisions"
    const activeField = document.querySelector(".worksheet-field-active");
    expect(activeField.textContent).toContain("Divisions");
  });

  it("hides the Next-question button on the last field", () => {
    setup({
      // Activate the last field by pre-answering everything else
      data: {
        context:   { primary: { value: "x", na: false } },
        divisions: { primary: { value: "y", na: false } },
      },
    });
    // The active field is "big_ideas" (the last incomplete one)
    const activeField = document.querySelector(".worksheet-field-active");
    expect(activeField.textContent).toContain("Big Ideas");
    expect(screen.queryByText(/Next question →/)).toBeNull();
  });

  it("renders collapsed siblings showing answer summary or 'Not yet answered'", () => {
    setup({
      data: {
        context: { primary: { value: "Already answered", na: false } },
      },
    });
    // First field "context" has content but is not active (since it's
    // complete, the spotlight moves to the first incomplete field — divisions).
    const collapsedFields = document.querySelectorAll(".worksheet-field-collapsed");
    expect(collapsedFields.length).toBeGreaterThan(0);
    const contextSummary = Array.from(collapsedFields).find((el) =>
      el.textContent.includes("Context"),
    );
    expect(contextSummary.textContent).toContain("Already answered");
  });
});

// ── Multi-question rendering ───────────────────────────────────────────────

describe("SpotlightWorksheet — multi-question fields", () => {
  it("renders the first question's textarea active on mount", () => {
    setup({ fields: [MULTI_FIELD_BACKGROUND] });
    const activeField = document.querySelector(".worksheet-field-multi");
    expect(activeField).toBeTruthy();
    // Q1 (author) is active — its textarea is in the DOM
    const activeQuestionInput = document.querySelector(
      'textarea[data-testid="question-input-background-author"]',
    );
    expect(activeQuestionInput).toBeTruthy();
  });

  it("renders 'Question N of M' indicators per question", () => {
    setup({ fields: [MULTI_FIELD_BACKGROUND] });
    expect(screen.getAllByText(/Question 1 of 4/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Question 2 of 4/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Question 3 of 4/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Question 4 of 4/i).length).toBeGreaterThanOrEqual(1);
  });

  it("emits onChange with the question's qKey when typing in the active question", () => {
    const { onChange } = setup({ fields: [MULTI_FIELD_BACKGROUND] });
    const input = document.querySelector(
      'textarea[data-testid="question-input-background-author"]',
    );
    fireEvent.change(input, { target: { value: "Paul" } });
    expect(onChange).toHaveBeenCalledWith("background", "author", "Paul");
  });

  it("Next-question advances to the next question within the field", () => {
    setup({
      fields: [MULTI_FIELD_BACKGROUND],
      // Pre-seed author + date so the spotlight starts on "date" (first
      // incomplete after author), then date is already filled so the
      // Next-question gate is satisfied without a stateful onChange.
      data: {
        background: {
          author: { value: "Paul", na: false },
          date:   { value: "60 AD", na: false },
        },
      },
    });
    // Active question is "audience" (first incomplete after author + date)?
    // Actually firstIncompleteQuestionKey skips author + date, lands on
    // audience. So the active question on mount is "audience". Click an
    // earlier completed question (date) to make it active for the test.
    const dateRow = document.querySelector('[data-question-key="date"]');
    fireEvent.click(dateRow);
    let active = document.querySelector(".worksheet-question-active");
    expect(active.getAttribute("data-question-key")).toBe("date");

    // Click Next question → advances within field to "audience"
    fireEvent.click(screen.getByText(/Next question →/));
    active = document.querySelector(".worksheet-question-active");
    expect(active.getAttribute("data-question-key")).toBe("audience");
  });

  it("on the last question of a non-last field, Next-question advances to the next field", () => {
    const { onChange } = setup({
      fields: MIXED_FIELDS, // background, then context
      data: {
        background: {
          author:   { value: "Paul",        na: false },
          date:     { value: "60 AD",       na: false },
          audience: { value: "Ephesus",     na: false },
          genre:    { value: "epistle",     na: false },
        },
      },
    });
    // First incomplete field is "context" — that's where the spotlight starts
    // when background is fully answered. Switch to background by clicking it.
    const collapsedBackground = document.querySelector(
      '[data-field-key="background"]',
    );
    fireEvent.click(collapsedBackground);

    // Background is now active. Pick the last question (genre) by clicking it.
    const genreRow = document.querySelector(
      '[data-question-key="genre"]',
    );
    // genre may or may not currently be the active row. Click it to ensure.
    fireEvent.click(genreRow);

    // Click Next question → should advance to the next field (context)
    fireEvent.click(screen.getByText(/Next question →/));

    // Active field is now "context"
    const activeField = document.querySelector(".worksheet-field-active");
    expect(activeField.textContent).toContain("Context");
  });

  it("hides Next-question on the last question of the last field", () => {
    setup({
      fields: [MULTI_FIELD_BACKGROUND],
      data: {
        background: {
          author:   { value: "Paul",     na: false },
          date:     { value: "60 AD",    na: false },
          audience: { value: "Ephesus",  na: false },
          // genre intentionally empty → genre is the active question, last in field & worksheet
        },
      },
    });
    const active = document.querySelector(".worksheet-question-active");
    expect(active.getAttribute("data-question-key")).toBe("genre");
    expect(screen.queryByText(/Next question →/)).toBeNull();
  });

  it("clicking a prior collapsed question makes it active", () => {
    setup({
      fields: [MULTI_FIELD_BACKGROUND],
      data: {
        background: { author: { value: "Paul", na: false } },
      },
    });
    // Active is "date" (first incomplete). Click "author" to edit it.
    const authorRow = document.querySelector('[data-question-key="author"]');
    fireEvent.click(authorRow);
    const active = document.querySelector(".worksheet-question-active");
    expect(active.getAttribute("data-question-key")).toBe("author");
  });

  it("emits onToggleNA with the active question's qKey", () => {
    const { onToggleNA } = setup({
      fields: [MULTI_FIELD_BACKGROUND],
    });
    fireEvent.click(screen.getByText("Mark not applicable"));
    expect(onToggleNA).toHaveBeenCalledWith("background", "author");
  });

  it("renders a collapsed multi-question field showing per-question summary lines", () => {
    setup({
      fields: MIXED_FIELDS,
      data: {
        // context is the active field (background is collapsed because all
        // questions answered? No — let me make sure context is active.)
        background: {
          author: { value: "Paul",  na: false },
          date:   { value: "60 AD", na: false },
          // audience and genre still empty
        },
      },
    });
    // Spotlight starts on the first incomplete — that's background's audience.
    // Let me click context to activate it instead, so background becomes
    // collapsed.
    const contextField = document.querySelector('[data-field-key="context"]');
    fireEvent.click(contextField);

    // Now background is collapsed. Its multi-summary should list 4 lines.
    const bgCollapsed = document.querySelector(
      '.worksheet-field-collapsed[data-field-key="background"]',
    );
    expect(bgCollapsed).toBeTruthy();
    const summaryLines = bgCollapsed.querySelectorAll(
      ".worksheet-field-multi-summary-line",
    );
    expect(summaryLines).toHaveLength(4);
  });
});

// ── N/A advance behavior ───────────────────────────────────────────────────

describe("SpotlightWorksheet — N/A advance behavior", () => {
  it("marking a single-question field N/A advances to the next field", () => {
    const onToggleNA = vi.fn();
    setup({
      fields: SINGLE_FIELDS,
      onToggleNA,
      // Pre-answer first field's "context" data so the active field starts
      // there? Actually a fresh worksheet starts with "context" active.
    });
    fireEvent.click(screen.getByText("Mark not applicable"));
    // After toggle, the active field should advance to "divisions"
    const activeField = document.querySelector(".worksheet-field-active");
    expect(activeField.textContent).toContain("Divisions");
  });

  it("marking a multi-question field's question N/A advances to the next question (not next field)", () => {
    setup({
      fields: MIXED_FIELDS,
    });
    // Active is background's author question. Mark N/A.
    fireEvent.click(screen.getByText("Mark not applicable"));
    // Active question should advance to date (next question in same field)
    const activeQ = document.querySelector(".worksheet-question-active");
    expect(activeQ.getAttribute("data-question-key")).toBe("date");
  });
});

// ── Heavy-lifting field overview gate (B1.3) ───────────────────────────────

const HEAVY_LIFTING_FIELD = {
  key: "divisions",
  label: "Divisions / Thought Units",
  hint: "Spine + meaning + bones.",
  questions: [
    { key: "sentence_layout", prompt: "Lay out the main sentences." },
    { key: "paraphrases",     prompt: "Rewrite each in your own words." },
    { key: "thought_units",   prompt: "Find the thought units." },
  ],
  heavyLifting: true,
  overview: {
    title: "Divisions / Thought Units",
    subtitle: "Field 4 of 9 · Observe",
    paragraphs: [
      "The point of the sermon is the point of the text.",
      "Make the bones visible.",
    ],
    list: {
      intro: "Three parts:",
      items: [
        "Lay out the structure.",
        "Rewrite each main sentence.",
        "Find the thought units.",
      ],
    },
  },
};

describe("SpotlightWorksheet — heavy-lifting field overview gate", () => {
  beforeEach(() => {
    // Clear localStorage between tests so the overview-seen state starts fresh.
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  it("renders FieldOverviewScreen on first entry to a heavy-lifting field for the given sermon", () => {
    render(
      <SpotlightWorksheet
        fields={[HEAVY_LIFTING_FIELD]}
        data={{}}
        onChange={vi.fn()}
        onToggleNA={vi.fn()}
        sermonId="sermon-1"
      />,
    );
    expect(screen.getByTestId("field-overview-screen")).toBeTruthy();
    expect(screen.getByText("Field 4 of 9 · Observe")).toBeTruthy();
    expect(screen.getByText(/The point of the sermon is the point of the text/)).toBeTruthy();
    // Body content includes the list intro + items
    expect(screen.getByText("Three parts:")).toBeTruthy();
    expect(screen.getByText("Lay out the structure.")).toBeTruthy();
    // Active field's textarea is NOT yet rendered — overview blocks it
    expect(document.querySelector(".worksheet-question-active")).toBeNull();
  });

  it("clicking Begin dismisses the overview and shows the active question", () => {
    render(
      <SpotlightWorksheet
        fields={[HEAVY_LIFTING_FIELD]}
        data={{}}
        onChange={vi.fn()}
        onToggleNA={vi.fn()}
        sermonId="sermon-1"
      />,
    );
    fireEvent.click(screen.getByText("Begin"));
    // Overview is gone; active question is now rendered
    expect(screen.queryByTestId("field-overview-screen")).toBeNull();
    expect(document.querySelector(".worksheet-question-active")).toBeTruthy();
  });

  it("persists 'seen' across remount for the same sermonId", () => {
    const { unmount } = render(
      <SpotlightWorksheet
        fields={[HEAVY_LIFTING_FIELD]}
        data={{}}
        onChange={vi.fn()}
        onToggleNA={vi.fn()}
        sermonId="sermon-1"
      />,
    );
    fireEvent.click(screen.getByText("Begin"));
    unmount();

    // Remount with same sermonId — overview should be skipped.
    render(
      <SpotlightWorksheet
        fields={[HEAVY_LIFTING_FIELD]}
        data={{}}
        onChange={vi.fn()}
        onToggleNA={vi.fn()}
        sermonId="sermon-1"
      />,
    );
    expect(screen.queryByTestId("field-overview-screen")).toBeNull();
    expect(document.querySelector(".worksheet-question-active")).toBeTruthy();
  });

  it("tracks 'seen' per-sermon — a different sermonId still shows the overview", () => {
    // Pre-mark sermon-1 as seen
    localStorage.setItem("sermonforge_field_overview_seen_sermon-1_divisions", "1");

    render(
      <SpotlightWorksheet
        fields={[HEAVY_LIFTING_FIELD]}
        data={{}}
        onChange={vi.fn()}
        onToggleNA={vi.fn()}
        sermonId="sermon-2"
      />,
    );
    // sermon-2 hasn't been seen — overview renders
    expect(screen.getByTestId("field-overview-screen")).toBeTruthy();
  });

  it("does not render overview when sermonId is omitted (legacy callers)", () => {
    render(
      <SpotlightWorksheet
        fields={[HEAVY_LIFTING_FIELD]}
        data={{}}
        onChange={vi.fn()}
        onToggleNA={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("field-overview-screen")).toBeNull();
    // Field renders directly into its active state
    expect(document.querySelector(".worksheet-question-active")).toBeTruthy();
  });

  it("does not render overview for fields without an overview blob even when heavyLifting=true", () => {
    const fieldNoOverview = {
      ...HEAVY_LIFTING_FIELD,
      overview: undefined,
    };
    render(
      <SpotlightWorksheet
        fields={[fieldNoOverview]}
        data={{}}
        onChange={vi.fn()}
        onToggleNA={vi.fn()}
        sermonId="sermon-1"
      />,
    );
    expect(screen.queryByTestId("field-overview-screen")).toBeNull();
    expect(document.querySelector(".worksheet-question-active")).toBeTruthy();
  });

  it("renders a non-heavy-lifting field's active state directly (no overview gate)", () => {
    const lightField = { key: "context", label: "Context", hint: "Context note" };
    render(
      <SpotlightWorksheet
        fields={[lightField]}
        data={{}}
        onChange={vi.fn()}
        onToggleNA={vi.fn()}
        sermonId="sermon-1"
      />,
    );
    expect(screen.queryByTestId("field-overview-screen")).toBeNull();
    expect(document.querySelector(".worksheet-field-active textarea")).toBeTruthy();
  });

  it("clicking Begin writes the seen flag to localStorage", () => {
    render(
      <SpotlightWorksheet
        fields={[HEAVY_LIFTING_FIELD]}
        data={{}}
        onChange={vi.fn()}
        onToggleNA={vi.fn()}
        sermonId="sermon-1"
      />,
    );
    fireEvent.click(screen.getByText("Begin"));
    expect(
      localStorage.getItem("sermonforge_field_overview_seen_sermon-1_divisions"),
    ).toBe("1");
  });
});

// ── Legacy notes ───────────────────────────────────────────────────────────

describe("SpotlightWorksheet — legacy notes", () => {
  it("renders legacy_notes block above the field list when provided", () => {
    setup({ legacyNotes: "Old free-text observations." });
    expect(screen.getByText("Old free-text observations.")).toBeTruthy();
    expect(screen.getByText(/Previous notes \(before structured fields\)/i)).toBeTruthy();
  });

  it("does not render the legacy block when legacyNotes is empty", () => {
    setup({ legacyNotes: "" });
    expect(screen.queryByText(/Previous notes/i)).toBeNull();
  });
});
