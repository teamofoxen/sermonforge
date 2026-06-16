// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import * as React from "react";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Phase F (2026-05-17) — the evaluateAdvance unit-test blocks that used to
// fill the rest of this file were deleted alongside the wall layer in
// studyAdvancement.js (evaluateAdvance, the seven check*Threshold wrappers,
// the two evidence builders, the two formatters). The composites that
// survived F have their own role in the completeness contract; if a future
// completeness surface needs unit coverage, it gets its own tests, separate
// from the deleted advancement-evaluator wrapper.
//
// What's left below is the integration check: SermonWorkspace mounts the
// writing surface (`.sws-shell`) regardless of whether observations are
// empty or populated. The surface itself carries the per-field render path;
// deeper navigation through it is covered by component-level tests, not by
// driving the workspace from this layer.
//
// Note: uses React.createElement instead of JSX (rolldown SSR transform).

// Phase 4 Sprint 2 unified-canvas substrate used by the populated render
// scenario. Minimum that hydrates Field 3 with one main + one modifier and
// the materialized thought_units array.
const FIELD_3_MINIMAL_FILLED = {
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

describe("SermonWorkspace mounts the writing surface at sub-phase 1 regardless of fill state", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("renders the writing surface when SermonWorkspace mounts at sub-phase 1 with empty observations", async () => {
    const sermonId = insertSermonRow({
      title: "Empty observe sermon",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      observations: "",
    });

    const SermonWorkspaceMod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace = (SermonWorkspaceMod as any).default || (SermonWorkspaceMod as any).SermonWorkspace;

    const { container } = await act(async () =>
      render(
        React.createElement(SermonWorkspace, {
          sermonId,
          onClose: () => {},
        }),
      ),
    ) as unknown as { container: HTMLElement };

    // Writing-surface shell mounts — the canonical signal that the new
    // surface is the active rendering. Replaces `.tw-shell` assertion
    // (trail-era) per the trail deletion sweep (Phase D2c).
    expect(container.querySelector(".sws-shell")).toBeTruthy();
  });

  it("renders the writing surface with content when observations are populated", async () => {
    const sermonId = insertSermonRow({
      title: "Filled observe sermon",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      observations: JSON.stringify({
        context: "Romans 8:1 sets the believers in Christ Jesus.",
        divisions: FIELD_3_MINIMAL_FILLED,
        obvious_point: "Believers are now in Christ Jesus, no longer condemned.",
      }),
    });

    const SermonWorkspaceMod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace = (SermonWorkspaceMod as any).default || (SermonWorkspaceMod as any).SermonWorkspace;

    const { container } = await act(async () =>
      render(
        React.createElement(SermonWorkspace, {
          sermonId,
          onClose: () => {},
        }),
      ),
    ) as unknown as { container: HTMLElement };

    expect(container.querySelector(".sws-shell")).toBeTruthy();
  });
});
