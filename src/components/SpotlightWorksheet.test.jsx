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

// ── Structured-exercise kind dispatch (B1.5) ───────────────────────────────
//
// MultiQuestionActive dispatches on `question.kind` to mount the right
// primitive. Field 4 walks the precedent: Q1 canvas, Q2 paraphrase blocks,
// Q3 synthesis table. Reference panel content (Q1's "three rules" + genre
// tips) flanks the active question when `question.referencePanel` is set.

const FIELD_4_LIKE = {
  key: "divisions",
  label: "Divisions / Thought Units",
  hint: "Spine + meaning + bones.",
  questions: [
    {
      key: "sentence_layout",
      kind: "canvas",
      prompt: "Lay the passage out.",
      referencePanel: {
        title: "The three rules",
        sections: [
          {
            type: "rules",
            items: [
              { lead: "Subject + main verb", body: "left margin." },
              { lead: "Modifiers", body: "indent under what they modify." },
              { lead: "Coordinate clauses", body: "align to coordinate." },
            ],
            footnote: "Main verb = the finite verb.",
          },
          {
            type: "genre",
            heading: "For epistles",
            paragraphs: ["Long sentences with cascading modifier chains."],
          },
          {
            type: "genre",
            heading: "For narrative",
            items: ["Each main action → left margin.", "Description indents.", "Dialogue indents."],
          },
        ],
      },
    },
    { key: "paraphrases", kind: "paraphrase", prompt: "Rewrite each main sentence." },
    { key: "thought_units", kind: "synthesis-table", prompt: "Find the thought units." },
  ],
};

describe("SpotlightWorksheet — kind dispatch", () => {
  function renderField4(data = {}, sermonId = "sermon-1") {
    if (typeof localStorage !== "undefined") localStorage.clear();
    const onChange = vi.fn();
    const onToggleNA = vi.fn();
    const utils = render(
      <SpotlightWorksheet
        fields={[FIELD_4_LIKE]}
        data={data}
        onChange={onChange}
        onToggleNA={onToggleNA}
        sermonId={sermonId}
      />,
    );
    // Heavy-lifting fields gate on an overview when first entered, but
    // FIELD_4_LIKE has no `overview` blob → no gate; primitive renders directly.
    return { onChange, onToggleNA, ...utils };
  }

  it("Q1 (kind=canvas) mounts IndentedSentenceCanvas instead of a textarea", () => {
    renderField4();
    // Canvas renders the gutter + a single empty input row by default.
    const canvas = document.querySelector(".indented-sentence-canvas") ||
                   document.querySelector('[data-testid="indented-sentence-canvas"]') ||
                   document.querySelector("textarea[data-testid='question-input-divisions-sentence_layout']");
    // The textarea-form fallback should NOT be present.
    expect(
      document.querySelector("textarea[data-testid='question-input-divisions-sentence_layout']"),
    ).toBeNull();
    // The canvas component renders inputs; at least one row input should be in the DOM.
    expect(document.querySelectorAll("input").length).toBeGreaterThan(0);
  });

  it("typing into Q1's canvas emits onChange with a structured list value", () => {
    const { onChange } = renderField4();
    // Find the first canvas line input and type into it.
    const inputs = document.querySelectorAll("input");
    expect(inputs.length).toBeGreaterThan(0);
    fireEvent.change(inputs[0], { target: { value: "Paul writes" } });
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[0]).toBe("divisions");
    expect(lastCall[1]).toBe("sentence_layout");
    expect(Array.isArray(lastCall[2])).toBe(true);
    expect(lastCall[2][0]).toMatchObject({ text: "Paul writes", depth: 0 });
  });

  it("Q1 active state renders the reference panel beside the canvas", () => {
    renderField4();
    const panel = screen.getByTestId("peripheral-reference-panel");
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain("Subject + main verb");
    expect(panel.textContent).toContain("For epistles");
    expect(panel.textContent).toContain("For narrative");
  });

  it("Q2 (kind=paraphrase) mounts ParaphraseBlocks reading sibling canvas value", () => {
    const data = {
      divisions: {
        sentence_layout: {
          value: [
            { text: "Paul writes.", depth: 0, kind: "main" },
            { text: "to the saints.", depth: 1, kind: "modifier" },
          ],
          na: false,
        },
        paraphrases: { value: [], na: false },
      },
    };
    renderField4(data);
    // Q1 is complete; firstIncompleteQuestionKey lands on paraphrases.
    const active = document.querySelector(".worksheet-question-active");
    expect(active.getAttribute("data-question-key")).toBe("paraphrases");
    // ParaphraseBlocks renders one block per main sentence; the read-only head
    // text from the canvas should appear inside the active question (the collapsed
    // Q1 row also shows the flattened text in its summary, hence getAllByText).
    expect(screen.getAllByText(/Paul writes\./).length).toBeGreaterThan(0);
    // The paraphrase textarea is in the DOM
    expect(document.querySelector(".paraphrase-block-input")).toBeTruthy();
  });

  it("Q3 (kind=synthesis-table) mounts SynthesisTable with canvas-driven autocomplete", () => {
    const data = {
      divisions: {
        sentence_layout: {
          value: [
            { text: "Line 1", depth: 0, kind: "main" },
            { text: "Line 2", depth: 0, kind: "main" },
          ],
          na: false,
        },
        paraphrases: {
          value: [
            { main_sentence_id: "ms-0", paraphrase: "P1" },
            { main_sentence_id: "ms-1", paraphrase: "P2" },
          ],
          na: false,
        },
        thought_units: { value: [], na: false },
      },
    };
    renderField4(data);
    const active = document.querySelector(".worksheet-question-active");
    expect(active.getAttribute("data-question-key")).toBe("thought_units");
    // The synthesis table primitive renders a <table> with thead Thought unit / After line / Signal.
    expect(screen.getByTestId("synthesis-table")).toBeTruthy();
    expect(screen.getByText("Thought unit")).toBeTruthy();
    expect(screen.getByText("After line")).toBeTruthy();
    expect(screen.getByText("Signal")).toBeTruthy();
  });

  it("non-active questions in a structured field still render the reference panel only on the active question", () => {
    renderField4();
    // Active is Q1 (sentence_layout). Click Q2 to make it active.
    const q2 = document.querySelector('[data-question-key="paraphrases"]');
    fireEvent.click(q2);
    // Active now Q2 — the panel should be gone (Q2 has no referencePanel).
    expect(screen.queryByTestId("peripheral-reference-panel")).toBeNull();
  });

  it("text-prompt questions without a kind continue to render textareas (back-compat)", () => {
    const TEXT_FIELD = {
      key: "background",
      label: "Background",
      hint: "World",
      questions: [
        { key: "author", prompt: "Who?" },
        { key: "date",   prompt: "When?" },
      ],
    };
    render(
      <SpotlightWorksheet
        fields={[TEXT_FIELD]}
        data={{}}
        onChange={vi.fn()}
        onToggleNA={vi.fn()}
      />,
    );
    expect(
      document.querySelector("textarea[data-testid='question-input-background-author']"),
    ).toBeTruthy();
    expect(screen.queryByTestId("peripheral-reference-panel")).toBeNull();
  });
});

// ── Cumulative-synthesis-table cross-phase dispatch (B2.2) ─────────────────
//
// Phase 2 Field 7 Q1 reads/writes the canonical thought-unit array from
// `observations.divisions.thought_units` via crossPhaseRead/crossPhaseWrite.
// Q1's value is the upstream rows extended with a Meaning column (writable);
// upstream columns render read-only via SynthesisTable's `columns` prop.

const PHASE_2_FIELD_7 = {
  key: "interpretation_synthesis",
  label: "Interpretation Synthesis",
  hint: "Articulate what the passage MEANS — per thought unit and as a whole — in your own voice.",
  questions: [
    {
      key: "meaning_per_unit",
      kind: "cumulative-synthesis-table",
      prompt: "Beside each thought unit you named in Observe, write what it MEANS in your own voice.",
      crossPhaseSource: {
        column: "observations",
        fieldKey: "divisions",
        questionKey: "thought_units",
      },
      columns: [
        { key: "thought_unit_summary", label: "Thought unit", kind: "textarea",    readOnly: true },
        { key: "after_line",            label: "After line",  kind: "line-number", readOnly: true },
        { key: "signal",                label: "Signal",      kind: "input",       readOnly: true },
        { key: "meaning",               label: "Meaning",     kind: "textarea" },
      ],
    },
    { key: "meaning_whole", prompt: "One paragraph. The whole passage's meaning." },
  ],
};

describe("SpotlightWorksheet — cumulative-synthesis-table cross-phase dispatch", () => {
  function renderField7({ phase2Data = {}, observations = {}, onChange = vi.fn(), onCrossPhaseWrite = vi.fn() } = {}) {
    const onToggleNA = vi.fn();
    const utils = render(
      <SpotlightWorksheet
        fields={[PHASE_2_FIELD_7]}
        data={phase2Data}
        onChange={onChange}
        onToggleNA={onToggleNA}
        crossPhaseRead={(column) => (column === "observations" ? observations : null)}
        crossPhaseWrite={onCrossPhaseWrite}
      />,
    );
    return { onChange, onCrossPhaseWrite, ...utils };
  }

  it("Q1 mounts SynthesisTable reading thought_units from the upstream observations column", () => {
    const observations = {
      divisions: {
        thought_units: {
          value: [
            { thought_unit_summary: "Believers stand uncondemned in Christ.", after_line: "2", signal: "" },
            { thought_unit_summary: "The Spirit's law sets them free.", after_line: "5", signal: "But" },
          ],
          na: false,
        },
      },
    };
    renderField7({ observations });
    // Active question is meaning_per_unit (cumulative-synthesis-table).
    const active = document.querySelector(".worksheet-question-active");
    expect(active.getAttribute("data-question-key")).toBe("meaning_per_unit");
    // SynthesisTable rendered, with Meaning column visible
    expect(screen.getByTestId("synthesis-table")).toBeTruthy();
    expect(screen.getByText("Meaning")).toBeTruthy();
    // Upstream rows visible read-only
    expect(screen.getByText("Believers stand uncondemned in Christ.")).toBeTruthy();
    expect(screen.getByText("The Spirit's law sets them free.")).toBeTruthy();
  });

  it("editing the Meaning column writes back to observations via crossPhaseWrite (not local onChange)", () => {
    const observations = {
      divisions: {
        thought_units: {
          value: [
            { thought_unit_summary: "Row 1", after_line: "1", signal: "" },
          ],
          na: false,
        },
      },
    };
    const { onChange, onCrossPhaseWrite } = renderField7({ observations });
    // Find the writable Meaning textarea (the only non-readonly cell)
    const meaningCell = document.querySelector(".synthesis-table-cell-meaning");
    expect(meaningCell).toBeTruthy();
    const textarea = meaningCell.querySelector("textarea");
    fireEvent.change(textarea, { target: { value: "The author conveys God's mercy." } });
    // crossPhaseWrite called with observations column targeting divisions.thought_units
    expect(onCrossPhaseWrite).toHaveBeenCalled();
    const lastCall = onCrossPhaseWrite.mock.calls[onCrossPhaseWrite.mock.calls.length - 1];
    expect(lastCall[0]).toBe("observations");
    expect(lastCall[1]).toBe("divisions");
    expect(lastCall[2]).toBe("thought_units");
    expect(Array.isArray(lastCall[3])).toBe(true);
    expect(lastCall[3][0].meaning).toBe("The author conveys God's mercy.");
    // Local onChange not called for cross-phase writes
    expect(onChange).not.toHaveBeenCalled();
  });

  it("NA toggle is hidden on cumulative-synthesis-table questions (NA semantics live upstream)", () => {
    const observations = {
      divisions: {
        thought_units: {
          value: [{ thought_unit_summary: "X", after_line: "1", signal: "" }],
          na: false,
        },
      },
    };
    renderField7({ observations });
    // Q1 active — no Mark not applicable button
    expect(screen.queryByText("Mark not applicable")).toBeNull();
  });

  it("Next-question is disabled when no thought unit has a meaning entry yet", () => {
    const observations = {
      divisions: {
        thought_units: {
          value: [
            { thought_unit_summary: "Row 1", after_line: "1", signal: "" },
            { thought_unit_summary: "Row 2", after_line: "5", signal: "" },
          ],
          na: false,
        },
      },
    };
    renderField7({ observations });
    const nextBtn = screen.getByText(/Next question →/).closest("button");
    expect(nextBtn.disabled).toBe(true);
  });

  it("Next-question enables once at least one thought unit has a meaning entry (Q1 spotlight)", () => {
    const observations = {
      divisions: {
        thought_units: {
          value: [
            { thought_unit_summary: "Row 1", after_line: "1", signal: "", meaning: "Author conveys mercy." },
            { thought_unit_summary: "Row 2", after_line: "5", signal: "" },
          ],
          na: false,
        },
      },
    };
    renderField7({ observations });
    // Q1 counts as "complete" (any meaning filled) so the spotlight starts
    // on Q2. Click Q1 to make it active, then check Next is enabled.
    const q1Row = document.querySelector('[data-question-key="meaning_per_unit"]');
    fireEvent.click(q1Row);
    const active = document.querySelector(".worksheet-question-active");
    expect(active.getAttribute("data-question-key")).toBe("meaning_per_unit");
    const nextBtn = screen.getByText(/Next question →/).closest("button");
    expect(nextBtn.disabled).toBe(false);
  });

  it("first-incomplete spotlight skips Q1 when every thought unit already has meaning, lands on Q2", () => {
    const observations = {
      divisions: {
        thought_units: {
          value: [
            { thought_unit_summary: "Row 1", after_line: "1", signal: "", meaning: "M1" },
            { thought_unit_summary: "Row 2", after_line: "5", signal: "", meaning: "M2" },
          ],
          na: false,
        },
      },
    };
    renderField7({ observations });
    const active = document.querySelector(".worksheet-question-active");
    expect(active.getAttribute("data-question-key")).toBe("meaning_whole");
  });
});
