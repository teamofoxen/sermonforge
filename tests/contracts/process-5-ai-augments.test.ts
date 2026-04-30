import { describe, it, expect, beforeEach } from "vitest";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
} from "./_helpers/test-spine";

// Process Contract #5 (docs/CORE.md):
//   "AI augments, never substitutes. AI runs on user evidence. There is no
//   AI operation that produces sermon content from zero user input.
//   Compressed paths that bypass user evidence are forbidden under this
//   contract."
//
// Concrete enforcement: applyMutation with kind=ai_proposal rejects when
// the prior content of the target field is empty. The user must type
// something first; the AI then augments, never substitutes from zero.

describe("Process Contract #5: AI augments, never substitutes", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("ai_proposal on a simple field with empty prior state rejects with Process #5", async () => {
    const sermonId = insertSermonRow({
      title: "Test sermon",
      current_stage: STAGE.Study,
      mpt: "",
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("apply-mutation", {
      kind: "ai_proposal",
      sermonId,
      field: "mpt",
      value: "Synthetic AI-generated MPT with no prior user content",
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Process #5");
    expect(result.code).toBe("PROCESS_5_AI_NO_USER_EVIDENCE");
  });

  it("ai_proposal on a structured field with empty prior state rejects with Process #5", async () => {
    const sermonId = insertSermonRow({
      title: "Test sermon",
      current_stage: STAGE.Study,
      observations: "",
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("apply-mutation", {
      kind: "ai_proposal",
      sermonId,
      field: "observations",
      value: { op: "set", questionKey: "context", value: "AI-only suggestion" },
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Process #5");
  });

  it("ai_proposal succeeds (returns proposalId) when prior user content exists", async () => {
    const sermonId = insertSermonRow({
      title: "Test sermon",
      current_stage: STAGE.Study,
      mpt: "I think this passage is about humility before God.",
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("apply-mutation", {
      kind: "ai_proposal",
      sermonId,
      field: "mpt",
      value: "Suggested rewording: humility under God's reign.",
    });
    expect(result.ok).toBe(true);
    expect(typeof result.value.proposalId).toBe("string");
    expect(result.value.proposalId.length).toBeGreaterThan(0);
  });

  it("treats placeholder JSON ('[]', '{}') as empty for Process #5", async () => {
    // outline starts as '[]' for new sermons. AI proposing into an empty
    // outline should still violate Process #5 — '[]' isn't user evidence.
    const sermonId = insertSermonRow({
      title: "Test sermon",
      current_stage: STAGE.Study,
      outline: "[]",
    });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("apply-mutation", {
      kind: "ai_proposal",
      sermonId,
      field: "outline",
      value: { op: "add", text: "AI-suggested outline point" },
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("Process #5");
  });
});
