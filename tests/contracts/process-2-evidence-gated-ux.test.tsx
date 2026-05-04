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
    // SFDI Observe → Interpret threshold (B1.4): Field 8 (obvious_point) and
    // Field 9 (applications) must be filled in addition to the empty-evidence
    // baseline. Field 9's `applications` is multi-question, so we provide the
    // explicit envelope shape rather than a flat string.
    const sermonId = insertSermonRow({
      title: "Filled observe sermon",
      current_stage: STAGE.Study,
      current_step: STEP.Exegesis,
      current_sub_phase: SUB_PHASE.Observe,
      observations: JSON.stringify({
        context: "Romans 8:1 sets the believers in Christ Jesus.",
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

  // SFDI Observe → Interpret threshold (B1.4) — load-bearing field gates beyond
  // the empty-evidence baseline.
  it("returns ok=false at sub-phase 1 when Field 8 (Obvious Point) is empty", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      {
        id: "test",
        observations: JSON.stringify({
          context: "some content",
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

  it("returns ok=false for null sermon", async () => {
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(null, "sub_phase", 1);
    expect(result.ok).toBe(false);
  });

  it("returns ok=true for sub_phase=4 transition (Implications → MPT/MPS) when any Exegesis content exists", async () => {
    // Sub-phase 4 advance is actually a STEP transition; evidence is whole Exegesis step.
    const { evaluateAdvance } = await import("../../src/utils/studyAdvancement");
    const result = evaluateAdvance(
      { id: "test", observations: '{"context":"Some Observe content."}' },
      "sub_phase",
      4,
    );
    expect(result.ok).toBe(true);
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
