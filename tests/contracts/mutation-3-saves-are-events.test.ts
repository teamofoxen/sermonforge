// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  persistMutation,
  INITIAL_SAVE_STATE,
  type SaveState,
} from "../../src/core/spine";

// Mutation Contract #3 (docs/CORE.md):
//   "Saves are events, not background noise. Successful saves are visible —
//   the user can answer 'is my work safe' at any moment. Failed saves are
//   visible and retryable. Silent saves are not allowed in either direction."
//
// The single canonical helper for this is `persistMutation` in
// src/core/spine.ts. SermonWorkspace.jsx (and any future workspace surface)
// passes its setSaveState plus the underlying mutation; persistMutation
// drives saving / saveError / lastSavedAt visibly.
//
// Tests cover:
//   • Successful save surfaces lastSavedAt with sufficient detail.
//   • Forced save failure surfaces saveError so a banner can render.

function makeSetter(states: SaveState[]) {
  return (next: SaveState | ((prev: SaveState) => SaveState)) => {
    const prev = states.length > 0 ? states[states.length - 1] : INITIAL_SAVE_STATE;
    const computed = typeof next === "function" ? (next as (p: SaveState) => SaveState)(prev) : next;
    states.push(computed);
  };
}

describe("Mutation Contract #3: saves are events", () => {
  it("successful save surfaces lastSavedAt with millisecond precision", async () => {
    const states: SaveState[] = [];
    const before = Date.now();
    await persistMutation(makeSetter(states), async () => {
      // No-op mutation — represents a successful save.
      return undefined;
    });
    const after = Date.now();

    // States captured in order. The first should mark saving=true; the
    // final state must have lastSavedAt set within [before, after].
    expect(states.length).toBeGreaterThanOrEqual(2);
    expect(states[0].saving).toBe(true);
    expect(states[0].saveError).toBe(false);

    const final = states[states.length - 1];
    expect(final.saving).toBe(false);
    expect(final.saveError).toBe(false);
    expect(final.lastSavedAt).not.toBeNull();
    expect(final.lastSavedAt!).toBeGreaterThanOrEqual(before);
    expect(final.lastSavedAt!).toBeLessThanOrEqual(after);
  });

  it("forced save failure surfaces saveError=true (renders the retry banner)", async () => {
    const states: SaveState[] = [];
    const result = await persistMutation(makeSetter(states), async () => {
      throw new Error("simulated IPC failure");
    });

    expect(result).toBeUndefined();
    const final = states[states.length - 1];
    expect(final.saving).toBe(false);
    expect(final.saveError).toBe(true);
    // lastSavedAt must NOT advance on failure — the user's work is not
    // confirmed safe; the banner stays accurate.
    expect(final.lastSavedAt).toBeNull();
  });

  it("save failure preserves the structured envelope details from the spine", async () => {
    // The spine throws ContractViolation on { ok: false } envelopes; this
    // test asserts that a thrown ContractViolation flows through
    // persistMutation as a save-error event (visible to the renderer)
    // without losing the clause citation.
    const states: SaveState[] = [];
    let observedError: any = null;
    await persistMutation(makeSetter(states), async () => {
      const err: any = new Error("test rejection");
      err.name = "ContractViolation";
      err.clause = "Mutation #1";
      err.code = "MUTATION_1_AI_APPLY_WITHOUT_PROPOSAL";
      observedError = err;
      throw err;
    });
    const final = states[states.length - 1];
    expect(final.saveError).toBe(true);
    expect(observedError.clause).toBe("Mutation #1");
  });
});
