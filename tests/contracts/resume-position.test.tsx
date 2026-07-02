// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import * as React from "react";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";
import { pickSermonColumns, SPINE_ONLY_COLUMNS } from "../../src/core/contracts";

// Track B (B6) — reopen/resume position guard.
//
// The live position model is a single field: last_touched_position drives
// session re-entry (deriveCurrentPositionFromSermon reads it). A sermon must
// reopen AT that field, not at the walk's first field. The vestigial
// current_stage/current_sub_phase + last_*_subphase columns must NOT be
// revived into live navigation — and a user-edit save must not be able to
// overwrite them (they are SPINE_ONLY, stripped from renderer writes).
//
// Note: React.createElement (rolldown SSR transform) — see process-3.

describe("B6 — a sermon reopens at its last_touched_position", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("resumes at the saved field (Interpret · Deeper Context), not the walk's first field", async () => {
    const sermonId = insertSermonRow({
      title: "Resume me",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Interpret,
      // The live position field — deep in the walk, distinct from the first
      // field (Observe · Context).
      last_touched_position: "Study/Interpret/deeper_context",
      thresholds_seen: JSON.stringify(["sermon-start"]),
    });

    const Mod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace = (Mod as any).default || (Mod as any).SermonWorkspace;
    const { container } = (await act(async () =>
      render(React.createElement(SermonWorkspace, { sermonId, onClose: () => {} })),
    )) as unknown as { container: HTMLElement };

    // Landed at the saved field — a defaulting sermon would show "Context"
    // (Observe field 1); showing "Deeper Context" (Interpret field 1) proves
    // resume read last_touched_position.
    await waitFor(() => {
      expect(screen.getByText("Deeper Context")).toBeTruthy();
    });
    // It resumed into the work, not the sermon-start landing.
    expect(container.querySelector(".ssl-overlay")).toBeFalsy();
  });
});

describe("B6 — user-edit saves cannot overwrite spine-only / legacy position columns", () => {
  it("the legacy position columns are all marked SPINE_ONLY", () => {
    for (const col of [
      "current_stage",
      "current_sub_phase",
      "last_study_subphase",
      "last_assembly_subphase",
      "last_manuscript_subphase",
    ]) {
      expect(SPINE_ONLY_COLUMNS.has(col), `${col} must be spine-only`).toBe(true);
    }
  });

  it("pickSermonColumns (the renderer write filter) strips every spine-only column, keeping real edits", () => {
    const attempted: Record<string, unknown> = { title: "keep me", last_touched_position: "Study/Observe/context" };
    for (const col of SPINE_ONLY_COLUMNS) attempted[col] = "renderer-should-not-write-this";

    const picked = pickSermonColumns(attempted);

    // Every spine-only column is dropped from the renderer write.
    for (const col of SPINE_ONLY_COLUMNS) {
      expect(Object.prototype.hasOwnProperty.call(picked, col), `${col} must be stripped`).toBe(false);
    }
    // Real user-editable columns survive (title, and the renderer-owned
    // last_touched_position which is deliberately NOT spine-only).
    expect(picked.title).toBe("keep me");
    expect(picked.last_touched_position).toBe("Study/Observe/context");
  });
});
