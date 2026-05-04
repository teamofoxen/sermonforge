// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import * as React from "react";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  STEP,
  SUB_PHASE,
} from "./_helpers/test-spine";

// SPRD Q3 — hard-gate UX layer on top of Q1 spine routing.
//
// Q1 wired the renderer to call transitionState on every Continue click. When
// the source position is empty, Process #2 rejects and a banner surfaces. Q3
// disables the Continue button BEFORE the click — the pastor sees the
// disabled state with an inline hint and never enters the click-fail-banner
// cycle.
//
// Stage tabs and breadcrumb pills stay on Q1's click-then-banner behavior per
// the Q3 ruling (tabs/pills are navigation; Continue is commitment).
//
// Note: uses React.createElement instead of JSX (rolldown SSR transform).

// SFDI Field 4 (Divisions / Thought Units) composite-gate substrate, used by
// the "filled Observe" fixtures below. Minimum that satisfies the B1.5 gate:
// canvas with one main + one modifier, one paraphrase, one complete thought-
// unit row.
const FIELD_4_MINIMAL_FILLED = {
  sentence_layout: {
    value: [
      { text: "There is now no condemnation",       depth: 0, kind: "main" },
      { text: "for those who are in Christ Jesus.", depth: 1, kind: "modifier" },
    ],
    na: false,
  },
  paraphrases: {
    value: [
      { main_sentence_id: "ms-0", paraphrase: "No condemnation now stands against believers in Christ." },
    ],
    na: false,
  },
  thought_units: {
    value: [
      { thought_unit_summary: "Believers stand uncondemned in Christ.", after_line: "2", signal: "" },
    ],
    na: false,
  },
};

// All-N/A escape valve form, used by tests that target a specific gate other
// than Field 4 and don't want to populate the canvas substrate.
const FIELD_4_ALL_NA = {
  sentence_layout: { value: "", na: true },
  paraphrases:     { value: "", na: true },
  thought_units:   { value: "", na: true },
};

describe("SPRD Q3 hard-gate UX: Continue button disabled when source empty", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("Continue is disabled at Observe with empty observations; inline hint visible", async () => {
    const sermonId = insertSermonRow({
      title: "Empty observe sermon",
      current_stage: STAGE.Study,
      current_step: STEP.Exegesis,
      current_sub_phase: SUB_PHASE.Observe,
      observations: "",
    });

    const SermonWorkspaceMod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace = (SermonWorkspaceMod as any).default || (SermonWorkspaceMod as any).SermonWorkspace;

    await act(async () => {
      render(
        React.createElement(SermonWorkspace, {
          sermonId,
          onClose: () => {},
        }),
      );
    });

    // The Continue button at the bottom of Observe.
    const continueBtn = await screen.findByText(/Continue to Interpret/i);
    // PrimaryButton renders a real <button>; closest('button') finds it.
    const buttonEl = continueBtn.closest("button");
    expect(buttonEl).toBeTruthy();
    expect(buttonEl?.disabled).toBe(true);
    expect(buttonEl?.getAttribute("title") || "").toMatch(/add some content/i);

    // Inline hint visible (data-testid="advance-hint" rendered alongside the button).
    const hint = await screen.findByTestId("advance-hint");
    expect(hint).toBeTruthy();
    expect(hint.textContent || "").toMatch(/add some content/i);
  });

  it("Continue is enabled at Observe when observations has content; no hint rendered", async () => {
    // SFDI Observe → Interpret threshold (B1.4 + B1.5): Field 4 composite,
    // Field 8 (obvious_point), and Field 9 (applications) must be filled in
    // addition to the empty-evidence baseline. Multi-question fields use the
    // explicit envelope shape.
    const sermonId = insertSermonRow({
      title: "Filled observe sermon",
      current_stage: STAGE.Study,
      current_step: STEP.Exegesis,
      current_sub_phase: SUB_PHASE.Observe,
      observations: JSON.stringify({
        context: "Romans 8:1 sets the believers in Christ Jesus.",
        divisions: FIELD_4_MINIMAL_FILLED,
        obvious_point: "Believers are now in Christ Jesus, no longer condemned.",
        applications: {
          pressing:         { value: "The room needs to hear that condemnation is gone.", na: false },
          hard_and_hopeful: { value: "Hard: facing felt condemnation. Hopeful: it's already lifted in Christ.", na: false },
        },
      }),
    });

    const SermonWorkspaceMod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace = (SermonWorkspaceMod as any).default || (SermonWorkspaceMod as any).SermonWorkspace;

    await act(async () => {
      render(
        React.createElement(SermonWorkspace, {
          sermonId,
          onClose: () => {},
        }),
      );
    });

    const continueBtn = await screen.findByText(/Continue to Interpret/i);
    const buttonEl = continueBtn.closest("button");
    expect(buttonEl).toBeTruthy();
    expect(buttonEl?.disabled).toBe(false);

    // No hint rendered when sufficient.
    const hints = screen.queryAllByTestId("advance-hint");
    expect(hints.length).toBe(0);
  });
});

describe("SPRD Q3 hard-gate UX: evaluateAdvance unit test", () => {
  it("returns ok=false with reason for empty Observe sermon at sub-phase 1", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      { id: "test", observations: "" },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/add some content/i);
  });

  it("returns ok=true for non-empty Observe sermon at sub-phase 1 once SFDI threshold is met", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: FIELD_4_MINIMAL_FILLED,
          obvious_point: "Plain-sense point.",
          applications: {
            pressing:         { value: "Pressing.",  na: false },
            hard_and_hopeful: { value: "Hard/hope.", na: false },
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(true);
  });

  // SFDI Observe → Interpret threshold (B1.4 + B1.5) — load-bearing field gates
  // beyond the empty-evidence baseline.
  it("returns ok=false at sub-phase 1 when Field 8 (Obvious Point) is empty", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: FIELD_4_ALL_NA,
          // obvious_point intentionally missing
          applications: {
            pressing:         { value: "Pressing.",  na: false },
            hard_and_hopeful: { value: "Hard/hope.", na: false },
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Obvious Point/i);
  });

  it("returns ok=false at sub-phase 1 when Field 9 (Possible Implications) has only one question filled", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: FIELD_4_ALL_NA,
          obvious_point: "Plain-sense point.",
          applications: {
            pressing: { value: "Pressing.", na: false },
            // hard_and_hopeful intentionally missing
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Possible Implications/i);
  });

  it("treats N/A on Field 8 as satisfied", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: FIELD_4_ALL_NA,
          obvious_point: { primary: { value: "", na: true } },
          applications: {
            pressing:         { value: "Pressing.",  na: false },
            hard_and_hopeful: { value: "Hard/hope.", na: false },
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(true);
  });

  it("treats N/A on both Field 9 questions as satisfied", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: FIELD_4_ALL_NA,
          obvious_point: "Plain-sense point.",
          applications: {
            pressing:         { value: "", na: true },
            hard_and_hopeful: { value: "", na: true },
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(true);
  });

  // SFDI Field 4 composite gate (B1.5) — Q1 canvas + Q2 paraphrases + Q3
  // thought-unit table. All three required (or N/A) to advance.
  it("returns ok=false at sub-phase 1 when Field 4 Q1 canvas has no main+modifier pair", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: {
            // Canvas with only main sentences, no indented modifiers
            sentence_layout: {
              value: [{ text: "Just a main sentence.", depth: 0, kind: "main" }],
              na: false,
            },
            paraphrases: { value: [{ main_sentence_id: "ms-0", paraphrase: "P." }], na: false },
            thought_units: { value: [{ thought_unit_summary: "T.", after_line: "1", signal: "" }], na: false },
          },
          obvious_point: "Plain-sense point.",
          applications: {
            pressing:         { value: "Pressing.",  na: false },
            hard_and_hopeful: { value: "Hard/hope.", na: false },
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Lay out the passage/i);
  });

  it("returns ok=false at sub-phase 1 when Field 4 Q2 has a missing paraphrase for an existing main sentence", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: {
            sentence_layout: {
              value: [
                { text: "Main A", depth: 0, kind: "main" },
                { text: "modifier", depth: 1, kind: "modifier" },
                { text: "Main B", depth: 0, kind: "main" },
              ],
              na: false,
            },
            // Only ms-0 paraphrased; ms-1 is missing
            paraphrases: { value: [{ main_sentence_id: "ms-0", paraphrase: "Paraphrase A." }], na: false },
            thought_units: { value: [{ thought_unit_summary: "T.", after_line: "1", signal: "" }], na: false },
          },
          obvious_point: "Plain-sense point.",
          applications: {
            pressing:         { value: "Pressing.",  na: false },
            hard_and_hopeful: { value: "Hard/hope.", na: false },
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Rewrite each main sentence/i);
  });

  it("returns ok=false at sub-phase 1 when Field 4 Q3 has no complete row", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: {
            sentence_layout: {
              value: [
                { text: "Main A", depth: 0, kind: "main" },
                { text: "modifier", depth: 1, kind: "modifier" },
              ],
              na: false,
            },
            paraphrases: { value: [{ main_sentence_id: "ms-0", paraphrase: "P." }], na: false },
            // Row missing after_line
            thought_units: { value: [{ thought_unit_summary: "T.", after_line: "", signal: "" }], na: false },
          },
          obvious_point: "Plain-sense point.",
          applications: {
            pressing:         { value: "Pressing.",  na: false },
            hard_and_hopeful: { value: "Hard/hope.", na: false },
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/thought unit/i);
  });

  it("Field 4 Q3 with at least one complete row is sufficient (Signal allowed empty for final unit)", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: FIELD_4_MINIMAL_FILLED,  // signal is "" in the substrate; still satisfies
          obvious_point: "Plain-sense point.",
          applications: {
            pressing:         { value: "Pressing.",  na: false },
            hard_and_hopeful: { value: "Hard/hope.", na: false },
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(true);
  });

  it("Field 4 all-N/A satisfies the composite (escape valve)", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: FIELD_4_ALL_NA,
          obvious_point: "Plain-sense point.",
          applications: {
            pressing:         { value: "Pressing.",  na: false },
            hard_and_hopeful: { value: "Hard/hope.", na: false },
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(true);
  });

  it("returns ok=false for null sermon", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(null, "sub_phase", 1);
    expect(result.ok).toBe(false);
  });

  it("returns ok=false for sub_phase=4 transition (Implications → MPT/MPS) when only Exegesis content exists but Field 4 composite isn't satisfied", async () => {
    // Sub-phase 4 advance is a STEP transition (out of Study). B4.2 added the
    // Field 4 (Implications Synthesis) composite gate at this boundary —
    // bare "any Exegesis content" no longer satisfies it.
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      { id: "test", observations: '{"context":"Some Observe content."}' },
      "sub_phase",
      4,
    );
    expect(result.ok).toBe(false);
  });

  it("returns ok=false for step transition when source step has no content", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      { id: "test", mpt: "", mps: "" },
      "step",
      2,
    );
    expect(result.ok).toBe(false);
  });
});

// SPRD A1.2 / B1.6 — `evaluateAdvance` returns structured per-gate state
// alongside the legacy `reason` string. The hover-checklist UI consumes
// `gates` to surface every unmet condition at once; the legacy `reason`
// stays as the first failing gate's pastor-facing message.
describe("SPRD A1.2 / B1.6: evaluateAdvance returns structured per-gate state at the Observe → Interpret boundary", () => {
  it("returns gates array with three load-bearing field entries when threshold is partially failing", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: FIELD_4_ALL_NA,        // met
          // obvious_point intentionally missing → unmet
          applications: {
            pressing:         { value: "Pressing.",  na: false },
            hard_and_hopeful: { value: "Hard/hope.", na: false },
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(false);
    expect(Array.isArray(result.gates)).toBe(true);
    expect(result.gates.length).toBe(3);
    const keys = result.gates.map((g: { key: string }) => g.key);
    expect(keys).toEqual([
      "field_4_divisions",
      "field_8_obvious_point",
      "field_9_possible_implications",
    ]);
    const f4 = result.gates.find((g: { key: string }) => g.key === "field_4_divisions");
    const f8 = result.gates.find((g: { key: string }) => g.key === "field_8_obvious_point");
    const f9 = result.gates.find((g: { key: string }) => g.key === "field_9_possible_implications");
    expect(f4.met).toBe(true);
    expect(f8.met).toBe(false);
    expect(f8.reason).toMatch(/Obvious Point/i);
    expect(f9.met).toBe(true);
    // First failing reason is Field 8's
    expect(result.reason).toMatch(/Obvious Point/i);
  });

  it("returns gates with all three met when threshold is fully satisfied", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: FIELD_4_MINIMAL_FILLED,
          obvious_point: "Plain-sense point.",
          applications: {
            pressing:         { value: "Pressing.",  na: false },
            hard_and_hopeful: { value: "Hard/hope.", na: false },
          },
        }),
      },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.gates)).toBe(true);
    expect(result.gates.every((g: { met: boolean }) => g.met)).toBe(true);
  });

  it("Field 4's gate carries its sub-question reason when the composite is unmet", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
          divisions: {
            sentence_layout: { value: [{ text: "Just a main sentence.", depth: 0, kind: "main" }], na: false },
            paraphrases: { value: [{ main_sentence_id: "ms-0", paraphrase: "P." }], na: false },
            thought_units: { value: [{ thought_unit_summary: "T.", after_line: "1", signal: "" }], na: false },
          },
          obvious_point: "Plain-sense point.",
          applications: {
            pressing:         { value: "Pressing.",  na: false },
            hard_and_hopeful: { value: "Hard/hope.", na: false },
          },
        }),
      },
      "sub_phase",
      1,
    );
    const f4 = result.gates.find((g: { key: string }) => g.key === "field_4_divisions");
    expect(f4.met).toBe(false);
    expect(f4.reason).toMatch(/Lay out the passage/i);
  });

  it("empty-evidence baseline returns no `gates` (single-gate degenerate path)", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      { id: "test", observations: "" },
      "sub_phase",
      1,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/add some content/i);
    // No gates surfaced for the trivial empty-evidence path — the checklist
    // UI falls back to the legacy single-line hint when gates is missing.
    expect(result.gates).toBeUndefined();
  });
});

// SPRD B2.2 — Interpret → Redemptive Thread threshold. Field 7 (Interpretation
// Synthesis) composite: every thought unit in observations.divisions.thought_units
// has a non-empty `meaning` column AND meaning_whole paragraph is non-empty.
describe("SPRD B2.2: Interpret → Redemptive Thread threshold (Field 7 composite)", () => {
  const FILLED_THOUGHT_UNITS_NO_MEANING = {
    sentence_layout: {
      value: [
        { text: "There is now no condemnation",       depth: 0, kind: "main" },
        { text: "for those who are in Christ Jesus.", depth: 1, kind: "modifier" },
      ],
      na: false,
    },
    paraphrases: {
      value: [{ main_sentence_id: "ms-0", paraphrase: "No condemnation now." }],
      na: false,
    },
    thought_units: {
      value: [
        { thought_unit_summary: "Believers stand uncondemned.", after_line: "2", signal: "" },
      ],
      na: false,
    },
  };

  const FILLED_THOUGHT_UNITS_WITH_MEANING = {
    ...FILLED_THOUGHT_UNITS_NO_MEANING,
    thought_units: {
      value: [
        { thought_unit_summary: "Believers stand uncondemned.", after_line: "2", signal: "", meaning: "The author declares freedom from judgment for those in Christ." },
      ],
      na: false,
    },
  };

  it("returns ok=false at sub-phase 2 when no observations content (empty-evidence baseline)", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      { id: "test", interpretation: "" },
      "sub_phase",
      2,
    );
    expect(result.ok).toBe(false);
  });

  it("returns ok=false at sub-phase 2 when thought_units exist but no meaning columns filled", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({ divisions: FILLED_THOUGHT_UNITS_NO_MEANING }),
        interpretation: JSON.stringify({
          interpretation_synthesis: {
            meaning_whole: { value: "The whole-passage meaning paragraph.", na: false },
          },
        }),
      },
      "sub_phase",
      2,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Meaning entry/i);
    expect(result.gates).toHaveLength(1);
    expect(result.gates[0].key).toBe("field_7_interpretation_synthesis");
    expect(result.gates[0].met).toBe(false);
  });

  it("returns ok=false at sub-phase 2 when meanings filled but meaning_whole is empty", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({ divisions: FILLED_THOUGHT_UNITS_WITH_MEANING }),
        // Interpret has some Phase 2 content so the empty-evidence baseline
        // passes; the Field 7 composite gate is what should fire.
        interpretation: JSON.stringify({
          recurring_ideas: { primary: { value: "Death, life, mercy.", na: false } },
          interpretation_synthesis: {
            meaning_whole: { value: "", na: false },
          },
        }),
      },
      "sub_phase",
      2,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/whole-passage meaning paragraph/i);
  });

  it("returns ok=true at sub-phase 2 when every thought unit has meaning and meaning_whole is filled", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({ divisions: FILLED_THOUGHT_UNITS_WITH_MEANING }),
        interpretation: JSON.stringify({
          interpretation_synthesis: {
            meaning_whole: { value: "The whole-passage meaning paragraph in pastor's voice.", na: false },
          },
        }),
      },
      "sub_phase",
      2,
    );
    expect(result.ok).toBe(true);
    expect(result.gates).toHaveLength(1);
    expect(result.gates[0].met).toBe(true);
  });

  it("returns ok=false at sub-phase 2 when one of two thought units lacks meaning", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const partialMeanings = {
      ...FILLED_THOUGHT_UNITS_NO_MEANING,
      thought_units: {
        value: [
          { thought_unit_summary: "Row 1", after_line: "2", signal: "", meaning: "M1" },
          { thought_unit_summary: "Row 2", after_line: "5", signal: "" },  // no meaning
        ],
        na: false,
      },
    };
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({ divisions: partialMeanings }),
        interpretation: JSON.stringify({
          interpretation_synthesis: {
            meaning_whole: { value: "Whole-passage paragraph.", na: false },
          },
        }),
      },
      "sub_phase",
      2,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Meaning entry beside every thought unit/i);
  });

  it("returns ok=false at sub-phase 2 when thought_units array is empty (no spine to extend)", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          divisions: {
            ...FILLED_THOUGHT_UNITS_NO_MEANING,
            thought_units: { value: [], na: false },
          },
        }),
        interpretation: JSON.stringify({
          interpretation_synthesis: {
            meaning_whole: { value: "Whole-passage paragraph.", na: false },
          },
        }),
      },
      "sub_phase",
      2,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/at least one thought unit/i);
  });
});

// SPRD B3.2 — Redemptive Thread → Implications threshold. Field 5
// (Christ-Connection Statement) composite: every thought unit row in
// observations.divisions.thought_units has a non-empty `christ_connection`
// column AND `redemptive_thread.christ_connection_statement.statement` is
// non-empty.
describe("SPRD B3.2: Redemptive Thread → Implications threshold (Field 5 composite)", () => {
  const THOUGHT_UNITS_FULL = {
    sentence_layout: {
      value: [
        { text: "There is now no condemnation",       depth: 0, kind: "main" },
        { text: "for those who are in Christ Jesus.", depth: 1, kind: "modifier" },
      ],
      na: false,
    },
    paraphrases: {
      value: [{ main_sentence_id: "ms-0", paraphrase: "No condemnation now." }],
      na: false,
    },
  };

  const tuRow = (extra: any = {}) => ({
    thought_unit_summary: "Believers stand uncondemned.",
    after_line: "2",
    signal: "",
    meaning: "The author declares freedom from judgment for those in Christ.",
    ...extra,
  });

  it("returns ok=false at sub-phase 3 when no redemptive_thread content (empty-evidence baseline)", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      { id: "test", redemptive_thread: "" },
      "sub_phase",
      3,
    );
    expect(result.ok).toBe(false);
  });

  it("returns ok=false at sub-phase 3 when thought_units lack christ_connection columns", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          divisions: {
            ...THOUGHT_UNITS_FULL,
            thought_units: { value: [tuRow()], na: false },  // no christ_connection
          },
        }),
        redemptive_thread: JSON.stringify({
          christ_connection_statement: {
            statement: { value: "Christ is the hero who acted while we were dead.", na: false },
          },
        }),
      },
      "sub_phase",
      3,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Christ-Connection entry/i);
    expect(result.gates).toHaveLength(1);
    expect(result.gates[0].key).toBe("field_5_christ_connection_statement");
    expect(result.gates[0].met).toBe(false);
  });

  it("returns ok=false at sub-phase 3 when christ_connection columns filled but statement is empty", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          divisions: {
            ...THOUGHT_UNITS_FULL,
            thought_units: { value: [tuRow({ christ_connection: "Resurrection-with-Christ." })], na: false },
          },
        }),
        // Some Phase 3 content so empty-evidence baseline passes; statement
        // empty so the Field 5 gate fires.
        redemptive_thread: JSON.stringify({
          this_passage_and_christ: {
            position: { value: "After. Christ has come.", na: false },
          },
          christ_connection_statement: {
            statement: { value: "", na: false },
          },
        }),
      },
      "sub_phase",
      3,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Christ-Connection Statement paragraph/i);
  });

  it("returns ok=true at sub-phase 3 when every thought unit has christ_connection and statement is filled", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          divisions: {
            ...THOUGHT_UNITS_FULL,
            thought_units: { value: [tuRow({ christ_connection: "Christ raises the dead." })], na: false },
          },
        }),
        redemptive_thread: JSON.stringify({
          christ_connection_statement: {
            statement: { value: "The whole passage turns on what Christ has done.", na: false },
          },
        }),
      },
      "sub_phase",
      3,
    );
    expect(result.ok).toBe(true);
    expect(result.gates).toHaveLength(1);
    expect(result.gates[0].met).toBe(true);
  });

  // B4.2 — Phase 4 Field 4 (Implications Synthesis) composite gate placed
  // here for symmetry with the other boundary tests. Tested below in its own
  // describe block.
  // (intentional placeholder — kept describe scoped above)

  it("returns ok=false at sub-phase 3 when one of two thought units lacks christ_connection", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          divisions: {
            ...THOUGHT_UNITS_FULL,
            thought_units: {
              value: [
                tuRow({ christ_connection: "Christ raises the dead." }),
                tuRow({ thought_unit_summary: "Row 2", after_line: "5" }),  // no christ_connection
              ],
              na: false,
            },
          },
        }),
        redemptive_thread: JSON.stringify({
          christ_connection_statement: {
            statement: { value: "Statement.", na: false },
          },
        }),
      },
      "sub_phase",
      3,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Christ-Connection entry beside every thought unit/i);
  });
});

// SPRD B4.2 — Implications → MPT/MPS threshold. Field 4 (Implications
// Synthesis) composite: every thought-unit row in observations.divisions
// .thought_units has a non-empty `implication` column AND
// `implications.implications_synthesis.synthesis` is non-empty.
describe("SPRD B4.2: Implications → MPT/MPS threshold (Field 4 composite)", () => {
  const TU_FULL_BASE = {
    sentence_layout: {
      value: [
        { text: "There is now no condemnation",       depth: 0, kind: "main" },
        { text: "for those who are in Christ Jesus.", depth: 1, kind: "modifier" },
      ],
      na: false,
    },
    paraphrases: {
      value: [{ main_sentence_id: "ms-0", paraphrase: "No condemnation now." }],
      na: false,
    },
  };

  const tuRowFull = (extra: any = {}) => ({
    thought_unit_summary: "Believers stand uncondemned.",
    after_line: "2",
    signal: "",
    meaning: "The author declares freedom from judgment for those in Christ.",
    christ_connection: "Christ raises the dead.",
    ...extra,
  });

  it("returns ok=false at sub-phase 4 when no implications content (empty-evidence baseline)", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      { id: "test", implications: "" },
      "sub_phase",
      4,
    );
    expect(result.ok).toBe(false);
  });

  it("returns ok=false at sub-phase 4 when thought_units lack implication columns", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          divisions: {
            ...TU_FULL_BASE,
            thought_units: { value: [tuRowFull()], na: false },  // no implication
          },
        }),
        implications: JSON.stringify({
          implications_synthesis: {
            synthesis: { value: "Synthesis paragraph in pastor's voice.", na: false },
          },
        }),
      },
      "sub_phase",
      4,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Implication entry/i);
    expect(result.gates).toHaveLength(1);
    expect(result.gates[0].key).toBe("field_4_implications_synthesis");
    expect(result.gates[0].met).toBe(false);
  });

  it("returns ok=false at sub-phase 4 when implications filled but synthesis is empty", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          divisions: {
            ...TU_FULL_BASE,
            thought_units: { value: [tuRowFull({ implication: "Receive the gift; cease earning." })], na: false },
          },
        }),
        // Some Phase 4 content so empty-evidence baseline passes; synthesis
        // empty so the Field 4 gate fires.
        implications: JSON.stringify({
          theological_significance: {
            about_god: { value: "God is rich in mercy.", na: false },
          },
          implications_synthesis: {
            synthesis: { value: "", na: false },
          },
        }),
      },
      "sub_phase",
      4,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Implications Synthesis paragraph/i);
  });

  it("returns ok=true at sub-phase 4 when every thought unit has implication and synthesis is filled", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          divisions: {
            ...TU_FULL_BASE,
            thought_units: { value: [tuRowFull({ implication: "Receive the gift; cease earning." })], na: false },
          },
        }),
        implications: JSON.stringify({
          implications_synthesis: {
            synthesis: { value: "This passage teaches that humanity is dead apart from God's mercy …", na: false },
          },
        }),
      },
      "sub_phase",
      4,
    );
    expect(result.ok).toBe(true);
    expect(result.gates).toHaveLength(1);
    expect(result.gates[0].met).toBe(true);
  });

  it("returns ok=false at sub-phase 4 when one of two thought units lacks implication", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result: any = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          divisions: {
            ...TU_FULL_BASE,
            thought_units: {
              value: [
                tuRowFull({ implication: "Receive the gift; cease earning." }),
                tuRowFull({ thought_unit_summary: "Row 2", after_line: "5" }),  // no implication
              ],
              na: false,
            },
          },
        }),
        implications: JSON.stringify({
          implications_synthesis: {
            synthesis: { value: "Synthesis.", na: false },
          },
        }),
      },
      "sub_phase",
      4,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Implication entry beside every thought unit/i);
  });
});
