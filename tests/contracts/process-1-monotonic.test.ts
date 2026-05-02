import { describe, it, expect, beforeEach } from "vitest";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  STEP,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Process Contract #1 (docs/CORE.md):
//   "Movement is monotonic by default. Forward through stages is the natural
//   direction. Backward movement is allowed but explicit — the user knows
//   they went back."
//
// The test sets a sermon at Blueprint, attempts a FORWARD transition back
// to Study, and verifies validateAndCommit rejects with clause "Process #1".

describe("Process Contract #1: movement is monotonic by default", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("transitionState(forward, to=prior stage) rejects with clause Process #1", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Blueprint,
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
      current_stage: STAGE.Blueprint,
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
      to: STAGE.Blueprint,
      evidence: "Exegesis complete",
      direction: "forward",
      kind: "stage",
    });
    expect(result.ok).toBe(true);
  });

  // Q1 spine routing — sub-phase + step boundaries now move through the spine.
  // The monotonic rule extends to those resolutions: forward to a prior
  // sub-phase / step rejects; backward to a prior sub-phase / step is allowed.

  it("transitionState(forward, to=prior sub-phase) rejects with clause Process #1", async () => {
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

  it("transitionState(backward, to=prior sub-phase) is allowed (revisit is explicit)", async () => {
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

  it("transitionState(forward, to=next sub-phase) is allowed (the natural direction)", async () => {
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

  it("transitionState(forward, to=prior step) rejects with clause Process #1", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Study,
      current_step: STEP.Outline,
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: STEP.Exegesis,
      evidence: "I want to redo exegesis",
      direction: "forward",
      kind: "step",
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Process #1");
    expect(result.code).toBe("PROCESS_1_FORWARD_TO_PRIOR");
  });

  it("transitionState(backward, to=prior step) is allowed", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Study,
      current_step: STEP.Outline,
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: STEP.Exegesis,
      evidence: "I want to redo exegesis",
      direction: "backward",
      kind: "step",
    });
    expect(result.ok).toBe(true);
  });
});
