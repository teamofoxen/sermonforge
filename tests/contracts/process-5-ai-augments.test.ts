import { describe, it, expect, beforeEach } from "vitest";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  getSermonRow,
} from "./_helpers/test-spine";

// Process Contract #5 (docs/CORE.md, ARI Phase 9 rearticulation):
//   "No AI substitution. The system contains no AI authorship surfaces. The
//   pastor authors all sermon content."
//
// Enforcement is structural-by-absence (plus the sermonforge/no-direct-ai lint
// tripwire): there is no AI mutation path. This test drives the REAL spine
// path — an ai_proposal is not a recognized kind and is refused; the pastor's
// own user_input is the only way content reaches a field.
//
// (Rewritten 2026-07-02, Track B/B4. The prior file asserted an ai_proposal
// empty-field rejection — a rule inside the deleted proposal/apply cycle — and
// only passed against dead fixture branches. Renamed intent: the AI path does
// not exist at all, not "AI needs prior evidence.")

describe("Process Contract #5: the system contains no AI authorship surface", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("ai_proposal is rejected with BAD_KIND for a simple field — no AI can author it", async () => {
    const sermonId = insertSermonRow({ title: "Test sermon", mpt: "Prior user content." });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("apply-mutation", {
      kind: "ai_proposal",
      sermonId,
      field: "mpt",
      value: "AI-generated MPT.",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("BAD_KIND");
    // Even with prior user content present, there is no proposal path at all.
    expect(getSermonRow(sermonId)!.mpt).toBe("Prior user content.");
  });

  it("ai_proposal is rejected with BAD_KIND for a structured field too", async () => {
    const sermonId = insertSermonRow({ title: "Test sermon", observations: "" });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("apply-mutation", {
      kind: "ai_proposal",
      sermonId,
      field: "observations",
      value: { op: "set", questionKey: "context", value: "AI-only suggestion" },
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("BAD_KIND");
  });

  it("the pastor's own user_input is the only authorship path, and it works", async () => {
    const sermonId = insertSermonRow({ title: "Test sermon", mpt: "" });
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("apply-mutation", {
      kind: "user_input",
      sermonId,
      field: "mpt",
      value: "The pastor's own words.",
    });
    expect(result.ok).toBe(true);
    expect(getSermonRow(sermonId)!.mpt).toBe("The pastor's own words.");
  });
});
