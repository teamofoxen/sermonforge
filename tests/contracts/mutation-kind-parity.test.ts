import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { MUTATION_KIND } from "./_helpers/test-spine";

// Track B (B4) — fixture-vs-production mutation-kind parity.
//
// The Path B fixture reproduces the spine's mutation handling in memory. When
// it drifts from production, contract tests pass green against behavior the
// real spine no longer has (finding M: the fixture kept ai_proposal/ai_apply
// alive after ARI Phase 9 removed them). This test pins the invariant that the
// fixture and production agree the ONLY live mutation kind is `user_input`.

const ROOT = path.resolve(__dirname, "..", "..");
const mainSrc = fs.readFileSync(path.join(ROOT, "electron", "main.js"), "utf8");
const cjsSrc = fs.readFileSync(path.join(ROOT, "electron", "contracts.cjs"), "utf8");

// Isolate the production apply-mutation case so assertions don't match
// unrelated (historical) mentions elsewhere in the 4k-line main.js.
function applyMutationCase(src: string): string {
  const start = src.indexOf('case "apply-mutation":');
  expect(start).toBeGreaterThan(-1);
  const rest = src.slice(start + 1);
  const next = rest.indexOf('\n    case "');
  return next === -1 ? rest : rest.slice(0, next);
}

describe("B4 — mutation-kind parity (fixture ⇔ production: user_input only)", () => {
  it("the fixture exposes only the user_input mutation kind", () => {
    expect(Object.values(MUTATION_KIND)).toEqual(["user_input"]);
  });

  it("production contracts.cjs defines only the user_input mutation kind", () => {
    expect(cjsSrc).toMatch(/MUTATION_KIND = Object\.freeze\(\{\s*UserInput:\s*"user_input",?\s*\}\)/);
    expect(cjsSrc).not.toMatch(/ai_proposal|ai_apply|AiProposal|AiApply/);
  });

  it("production apply-mutation accepts user_input and BAD_KINDs every other kind — no ai_* branch", () => {
    const block = applyMutationCase(mainSrc);
    expect(block).toMatch(/MUTATION_KIND\.UserInput/);
    expect(block).toMatch(/BAD_KIND/);
    expect(block).not.toMatch(/ai_proposal|ai_apply|AiProposal|AiApply/);
  });

  it("the fixture apply-mutation likewise carries no ai_* branch (parity with production)", () => {
    const fixtureSrc = fs.readFileSync(
      path.join(__dirname, "_helpers", "test-spine.ts"), "utf8"
    );
    const block = applyMutationCase(fixtureSrc);
    expect(block).toMatch(/MUTATION_KIND\.UserInput/);
    expect(block).toMatch(/BAD_KIND/);
    // Only tolerated mentions are in the removal-note comment; assert no live
    // AiProposal/AiApply dispatch remains.
    expect(block).not.toMatch(/kind === MUTATION_KIND\.AiProposal|kind === MUTATION_KIND\.AiApply/);
  });
});
