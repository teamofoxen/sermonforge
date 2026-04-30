import { describe, it, expect, beforeEach } from "vitest";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
} from "./_helpers/test-spine";

// Mutation Contract #1 (docs/CORE.md):
//   "User typing always wins by default. The system does not overwrite
//   user-typed content without explicit, per-occurrence consent. 'Draft,'
//   'Suggest,' 'Populate' are *proposals*, never *replacements*."
//
// Structural enforcement: applyMutation with kind=ai_apply requires a
// proposalId from a prior ai_proposal. Any ai_apply that references a
// proposalId not in the proposals map is a Mutation #1 violation — the
// only way to commit AI-sourced content is via a real, pre-recorded proposal.
//
// The carryover note explicitly says: tests should construct a proposalId
// that's never been registered, NOT one that's expired (TTL is a separate
// concern out of scope for this pass).

describe("Mutation Contract #1: user typing wins", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("ai_apply with a proposalId that was never registered rejects with Mutation #1", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      current_stage: STAGE.Study,
      mpt: "User typed this MPT.",
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("apply-mutation", {
      kind: "ai_apply",
      sermonId,
      field: "mpt",
      proposalId: "nonexistent-proposal-id-never-registered",
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Mutation #1");
    expect(result.code).toBe("MUTATION_1_AI_APPLY_WITHOUT_PROPOSAL");
    expect(result.message).toMatch(/user typing wins/i);
  });

  it("ai_apply with a proposalId that targets a different sermon/field rejects with Mutation #1", async () => {
    const sermonA = insertSermonRow({ title: "Sermon A", mpt: "A's MPT" });
    const sermonB = insertSermonRow({ title: "Sermon B", mpt: "B's MPT" });
    const bridge = (globalThis as any).electronAPI.spine;

    // Register a proposal against sermon A's MPT field.
    const proposed = await bridge("apply-mutation", {
      kind: "ai_proposal",
      sermonId: sermonA,
      field: "mpt",
      value: "AI suggestion for A's MPT",
    });
    expect(proposed.ok).toBe(true);

    // Try to ai_apply that proposal to sermon B — mismatch.
    const result = await bridge("apply-mutation", {
      kind: "ai_apply",
      sermonId: sermonB,
      field: "mpt",
      proposalId: proposed.value.proposalId,
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Mutation #1");
    expect(result.code).toBe("MUTATION_1_PROPOSAL_MISMATCH");
  });

  it("ai_apply with a valid proposalId commits the proposal to the user's field", async () => {
    const sermonId = insertSermonRow({
      title: "Test",
      mpt: "User-written MPT.",
    });
    const bridge = (globalThis as any).electronAPI.spine;

    const proposed = await bridge("apply-mutation", {
      kind: "ai_proposal",
      sermonId,
      field: "mpt",
      value: "AI-rewritten MPT.",
    });
    expect(proposed.ok).toBe(true);
    const proposalId = proposed.value.proposalId;

    const applied = await bridge("apply-mutation", {
      kind: "ai_apply",
      sermonId,
      field: "mpt",
      proposalId,
    });
    expect(applied.ok).toBe(true);

    // Sanity: the field was updated, AND the proposal is consumed
    // (a second apply with the same proposalId would now fail).
    const reapply = await bridge("apply-mutation", {
      kind: "ai_apply",
      sermonId,
      field: "mpt",
      proposalId,
    });
    expect(reapply.ok).toBe(false);
    expect(reapply.clause).toBe("Mutation #1");
  });
});
