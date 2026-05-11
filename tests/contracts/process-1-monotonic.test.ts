import { describe, it, expect, beforeEach } from "vitest";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Process Contract #1 (docs/CORE.md):
//   "Movement is monotonic by default. Forward through stages is the natural
//   direction. Backward movement is allowed but explicit — the user knows
//   they went back."
//
// Workspace Restructure (2026-05-10) — Stage collapses to three (Study /
// Assembly / Manuscript) and the within-Study Step layer retires. The tests
// here cover all three boundaries (stage, study sub-phase, assembly
// sub-phase) the spine now enforces.

describe("Process Contract #1: movement is monotonic by default", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("transitionState(forward, to=prior stage) rejects with clause Process #1", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Assembly,
      current_step: null,
      current_sub_phase: null,
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: STAGE.Study,
      evidence: "I want to revise the exegesis",
      direction: "forward",
      kind: "stage",
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Process #1");
    expect(result.code).toBe("PROCESS_1_FORWARD_TO_PRIOR");
  });

  it("transitionState(backward, to=prior stage) is allowed (explicit movement)", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Assembly,
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: STAGE.Study,
      evidence: "I want to revise the exegesis",
      direction: "backward",
      kind: "stage",
    });
    expect(result.ok).toBe(true);
  });

  it("transitionState(forward, to=next stage) is allowed (the natural direction)", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Study,
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: STAGE.Assembly,
      evidence: "Exegesis complete",
      direction: "forward",
      kind: "stage",
    });
    expect(result.ok).toBe(true);
  });

  // Sub-phase boundaries — both Study and Assembly. The monotonic rule
  // applies across the combined canonical sequence so forward into a prior
  // sub-phase of EITHER stage rejects.

  it("transitionState(forward, to=prior Study sub-phase) rejects with clause Process #1", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.RedemptiveThread,
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: SUB_PHASE.Observe,
      evidence: "I want to revise observations",
      direction: "forward",
      kind: "sub_phase",
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Process #1");
    expect(result.code).toBe("PROCESS_1_FORWARD_TO_PRIOR");
  });

  it("transitionState(backward, to=prior Study sub-phase) is allowed (revisit is explicit)", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.RedemptiveThread,
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: SUB_PHASE.Observe,
      evidence: "I want to revise observations",
      direction: "backward",
      kind: "sub_phase",
    });
    expect(result.ok).toBe(true);
  });

  it("transitionState(forward, to=next Study sub-phase) is allowed (the natural direction)", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: SUB_PHASE.Interpret,
      evidence: "Observations complete; ready to interpret",
      direction: "forward",
      kind: "sub_phase",
    });
    expect(result.ok).toBe(true);
  });

  it("transitionState(forward, to=prior Assembly sub-phase) rejects with clause Process #1", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Assembly,
      current_sub_phase: SUB_PHASE.Equip,
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: SUB_PHASE.Anchor,
      evidence: "I want to revise the main point pair",
      direction: "forward",
      kind: "sub_phase",
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Process #1");
    expect(result.code).toBe("PROCESS_1_FORWARD_TO_PRIOR");
  });

  it("transitionState(backward, to=prior Assembly sub-phase) is allowed", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Assembly,
      current_sub_phase: SUB_PHASE.Equip,
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: SUB_PHASE.Anchor,
      evidence: "I want to revise the main point pair",
      direction: "backward",
      kind: "sub_phase",
    });
    expect(result.ok).toBe(true);
  });
});
