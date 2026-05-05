import { describe, it, expect, beforeEach } from "vitest";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  setLegacyEvidenceCutoff,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Process Contract #2 (docs/CORE.md):
//   "Movement is gated by user evidence. The system does not advance a
//   sermon to the next stage unless the user has produced the artifact
//   that stage requires. The constraint *is* the gate."
//
// Carve-out: sermons whose created_at < legacy_evidence_cutoff (the v17
// meta entry) are treated as legacy — empty-evidence transitionState
// succeeds for them. Cf. spine.ts header + electron/main.js v17.

describe("Process Contract #2: movement gated by user evidence (non-legacy sermon)", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    // Cutoff in the past, sermon created after — non-legacy.
    setLegacyEvidenceCutoff("2025-01-01T00:00:00.000Z");
  });

  it("transitionState with empty evidence rejects with clause Process #2", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Study,
      created_at: new Date().toISOString(),
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: STAGE.Blueprint,
      evidence: "",
      direction: "forward",
      kind: "stage",
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Process #2");
    expect(result.code).toBe("PROCESS_2_EMPTY_EVIDENCE");
    expect(result.message).toMatch(/movement is gated by user evidence/i);
  });

  it("transitionState with whitespace-only evidence rejects too", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Study,
      created_at: new Date().toISOString(),
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: STAGE.Blueprint,
      evidence: "   ",
      direction: "forward",
      kind: "stage",
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Process #2");
  });
});

describe("Process Contract #2: backward direction is not gated", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    setLegacyEvidenceCutoff("2025-01-01T00:00:00.000Z");
  });

  // Backward movement is retreat, not advancement. The pastor must always
  // be able to step back to add or revise content — the empty-evidence
  // gate would otherwise trap a newly created sermon on the position it
  // first navigated to. See SermonWorkspace.handleTabChange.
  it("backward transition with empty evidence succeeds on a non-legacy sermon", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Frame,
      created_at: new Date().toISOString(),
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: STAGE.Study,
      evidence: "",
      direction: "backward",
      kind: "stage",
    });
    expect(result.ok).toBe(true);
  });
});

describe("Process Contract #2: legacy carve-out", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    // Cutoff "now"; sermon created before it qualifies as legacy.
    setLegacyEvidenceCutoff("2026-04-29T00:00:00.000Z");
  });

  it("legacy sermon (created_at < cutoff) accepts empty-evidence transition", async () => {
    const sermonId = insertSermonRow({
      title: "Old sermon",
      current_stage: STAGE.Study,
      // Way before the cutoff above.
      created_at: "2025-06-01T00:00:00.000Z",
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: STAGE.Blueprint,
      evidence: "",
      direction: "forward",
      kind: "stage",
    });
    expect(result.ok).toBe(true);
  });
});

// Q1 spine routing — sub-phase boundaries now fire Process #2 too. The
// empty-evidence rule is a single rule that applies at all three resolutions
// (stage, step, sub-phase). The legacy carve-out applies uniformly to the
// existing rule. (Q4 ruling: the carve-out stays scoped to the original
// empty-evidence rule; new categories from Q3 will not extend the carve-out.)

describe("Process Contract #2: sub-phase boundaries (Q1 spine routing)", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    setLegacyEvidenceCutoff("2025-01-01T00:00:00.000Z");
  });

  it("sub-phase transition with empty evidence rejects on a non-legacy sermon", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      created_at: new Date().toISOString(),
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: SUB_PHASE.Interpret,
      evidence: "",
      direction: "forward",
      kind: "sub_phase",
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Process #2");
    expect(result.code).toBe("PROCESS_2_EMPTY_EVIDENCE");
  });

  it("sub-phase transition with non-empty evidence succeeds on a non-legacy sermon", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      created_at: new Date().toISOString(),
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: SUB_PHASE.Interpret,
      evidence: "Observed: Romans 8 sets believers in Christ Jesus.",
      direction: "forward",
      kind: "sub_phase",
    });
    expect(result.ok).toBe(true);
  });
});

describe("Process Contract #2: sub-phase boundaries — legacy carve-out", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
    setLegacyEvidenceCutoff("2026-04-29T00:00:00.000Z");
  });

  it("legacy sermon at sub-phase boundary accepts empty-evidence transition", async () => {
    // Q4 ruling: the legacy carve-out applies to the original empty-evidence
    // rule at every resolution including sub-phase.
    const sermonId = insertSermonRow({
      title: "Old sermon",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      created_at: "2025-06-01T00:00:00.000Z",
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("transition-state", {
      sermonId,
      to: SUB_PHASE.Interpret,
      evidence: "",
      direction: "forward",
      kind: "sub_phase",
    });
    expect(result.ok).toBe(true);
  });
});
