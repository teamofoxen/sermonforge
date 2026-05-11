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

// Process Contract #4 (docs/CORE.md):
//   "Pastoral Context follows the text, not the other way around. The text
//   speaks first. Pastoral Context is a canonical artifact of every sermon,
//   but it does not precede engagement with the text and is not a
//   prerequisite for entering Study."
//
// Concrete shell-level assertion for Phase 5: a brand-new sermon — with no
// PC fields filled and no observation content — must still render the
// workspace at Step 1 / Phase 1 (Observe) without erroring or gating the UI.
//
// This will need to be re-evaluated once Study Phase Re-Design (SPRD) lands
// the per-phase mechanics in docs/SYSTEMS/sermon-workspace.md. For now it
// only proves the structural shell: PC absent != Study locked.
//
// Note: uses React.createElement instead of JSX (see process-3 file header
// for the rolldown SSR transform reason).

describe("Process Contract #4: PC follows the text (text speaks first)", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("a brand-new sermon with no PC fields renders the workspace at Observe", async () => {
    const sermonId = insertSermonRow({
      title: "Brand new sermon",
      passage: "Romans 8:1",
      current_stage: STAGE.Study,
      current_step: null,
      current_sub_phase: SUB_PHASE.Observe,
      // PC fields are explicitly empty — text-first invariant.
      topic_theme: "",
      audience_assumptions: "",
      background_noise: "",
      observations: "",
    });

    const SermonWorkspaceMod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace = (SermonWorkspaceMod as any).default || (SermonWorkspaceMod as any).SermonWorkspace;

    let result: ReturnType<typeof render> | undefined;
    await act(async () => {
      result = render(
        React.createElement(SermonWorkspace, {
          sermonId,
          onClose: () => {},
        }),
      );
    });

    // The render must succeed without throwing — no "PC is required" gate.
    expect(result?.container).toBeTruthy();
    // The sermon title is rendered, indicating workspace mount succeeded.
    expect(result!.container.textContent || "").toContain("Brand new sermon");
  });
});
