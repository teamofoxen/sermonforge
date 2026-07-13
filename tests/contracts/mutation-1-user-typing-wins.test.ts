import { describe, it, expect, beforeEach } from "vitest";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  getSermonRow,
} from "./_helpers/test-spine";

// Mutation Contract #1 (docs/CORE.md, ARI Phase 9 rearticulation):
//   "User typing always wins by default. All sermon content is pastor-typed.
//   There are no system-driven writes to sermon fields outside the pastor's
//   keystrokes."
//
// Enforcement is now structural-by-absence: MutationKind collapsed to
// `user_input` only, so the spine has NO path for a system actor to write a
// sermon field. This test drives the in-memory FIXTURE's `apply-mutation`
// (tests/contracts/_helpers/test-spine.ts — fast component-test spine), NOT
// the production dispatcher; the earlier header claimed "the REAL production
// path", which was never true of this file. The REAL production path — the
// same op through electron/persistence.cjs `validateAndCommit` against real
// SQLite — is exercised in tests/persistence/production-persistence.test.ts,
// and mutation-kind-parity.test.ts pins fixture ⇔ production agreement that
// user_input is the only live kind.
//
// (Rewritten 2026-07-02, Track B/B4. The prior file drove the deleted
// ai_proposal/ai_apply proposal-then-apply cycle and only passed because the
// test fixture still carried those dead branches — finding M. The fixture now
// mirrors production; this test asserts the live one-kind path.)

describe("Mutation Contract #1: user typing wins — no system actor writes sermon fields", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("a user_input mutation commits the pastor's typed content", async () => {
    const sermonId = insertSermonRow({ title: "Test", mpt: "" });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("apply-mutation", {
      kind: "user_input",
      sermonId,
      field: "mpt",
      value: "The pastor typed this MPT.",
    });
    expect(result.ok).toBe(true);
    expect(getSermonRow(sermonId)!.mpt).toBe("The pastor typed this MPT.");
  });

  it("ai_apply — a system-write kind — is refused with BAD_KIND, and the pastor's content is untouched", async () => {
    const sermonId = insertSermonRow({ title: "Test", mpt: "User-written MPT." });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("apply-mutation", {
      kind: "ai_apply",
      sermonId,
      field: "mpt",
      proposalId: "anything",
      value: "System-written MPT.",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("BAD_KIND");
    expect(getSermonRow(sermonId)!.mpt).toBe("User-written MPT.");
  });

  it("ai_proposal is refused too — the proposal/apply cycle no longer exists (ARI Phase 9)", async () => {
    const sermonId = insertSermonRow({ title: "Test", mpt: "User-written MPT." });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("apply-mutation", {
      kind: "ai_proposal",
      sermonId,
      field: "mpt",
      value: "AI suggestion for the MPT.",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("BAD_KIND");
    expect(getSermonRow(sermonId)!.mpt).toBe("User-written MPT.");
  });
});
