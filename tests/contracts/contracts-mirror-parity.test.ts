import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as path from "node:path";

// Domain Model Normalization — Slice 1, item 2 (ESM/CJS contract mirror parity).
//
// The canonical vocabulary lives in three hand-maintained copies that MUST stay
// in sync (CORE State #5/#6, and the header of each file says so verbatim):
//   • src/core/contracts.ts            — the source of truth (renderer, ESM)
//   • electron/contracts.cjs           — the runtime mirror (main process, CJS)
//   • tests/contracts/_helpers/test-spine.ts — the in-memory fixture mirror
//
// contracts-allowlist-sync.test.ts already asserts the three COLUMN sets. This
// file widens that guard to the VOCABULARY portion — stages, sub-phases, the
// stage/sub-phase sequences, the sub-phase→stage map, statuses, mutation kind,
// loading verbs, and STRUCTURED_FIELDS — the portion that was unasserted and had
// already drifted (the fixture's retired legacy-stage coercion).

const requireCjs = createRequire(import.meta.url);

function toSorted(set: Set<string>): string[] {
  return [...set].sort();
}

describe("Canonical vocabulary stays in sync across the three mirrors", () => {
  it("stages, sub-phases, sequences, statuses, mutation kind match ts ⟷ cjs ⟷ fixture", async () => {
    const ts: any = await import("../../src/core/contracts");
    const cjs: any = requireCjs("../../electron/contracts.cjs");
    const fixture: any = await import("./_helpers/test-spine");

    // Objects mirrored in all three files — compared structurally.
    const OBJECT_KEYS = [
      "STAGE",
      "SUB_PHASE",
      "SUB_PHASE_STAGE",
      "SERMON_STATUS",
      "SERIES_STATUS",
      "MUTATION_KIND",
    ];
    for (const name of OBJECT_KEYS) {
      expect(ts[name], `${name} missing from contracts.ts`).toBeTruthy();
      expect({ ...cjs[name] }, `${name} drift: contracts.ts vs contracts.cjs`).toEqual({ ...ts[name] });
      expect({ ...fixture[name] }, `${name} drift: contracts.ts vs test-spine`).toEqual({ ...ts[name] });
    }

    // Ordered sequences — order is load-bearing (walk order), so compared as arrays.
    const SEQUENCE_KEYS = [
      "STAGE_SEQUENCE",
      "STUDY_SUB_PHASE_SEQUENCE",
      "ASSEMBLY_SUB_PHASE_SEQUENCE",
      "MANUSCRIPT_SUB_PHASE_SEQUENCE",
      "SUB_PHASE_CANONICAL_SEQUENCE",
    ];
    for (const name of SEQUENCE_KEYS) {
      expect([...ts[name]], `${name} missing from contracts.ts`).not.toHaveLength(0);
      expect([...cjs[name]], `${name} drift: contracts.ts vs contracts.cjs`).toEqual([...ts[name]]);
      expect([...fixture[name]], `${name} drift: contracts.ts vs test-spine`).toEqual([...ts[name]]);
    }

    // STRUCTURED_FIELDS set mirrored in all three.
    expect(toSorted(cjs.STRUCTURED_FIELDS), "STRUCTURED_FIELDS drift: contracts.ts vs contracts.cjs")
      .toEqual(toSorted(ts.STRUCTURED_FIELDS));
    expect(toSorted(fixture.STRUCTURED_FIELDS), "STRUCTURED_FIELDS drift: contracts.ts vs test-spine")
      .toEqual(toSorted(ts.STRUCTURED_FIELDS));
  });

  it("LOADING_VERB matches contracts.ts ⟷ contracts.cjs (not mirrored in the fixture)", async () => {
    const ts: any = await import("../../src/core/contracts");
    const cjs: any = requireCjs("../../electron/contracts.cjs");
    expect({ ...cjs.LOADING_VERB }).toEqual({ ...ts.LOADING_VERB });
  });
});

describe("The fixture carries no legacy-stage coercion that production lacks", () => {
  // Owner ruling (2026-07-03): production truth wins over test fixtures.
  // electron/main.js shapeSermon reads `const stage = row.current_stage` straight
  // through — the Blueprint/Frame coercion was removed in the trail deletion
  // sweep (Phase B3). The fixture must mirror that. Fail-before / pass-after:
  // red while test-spine still defines coerceLegacyStage, green once Slice 1
  // removes it. Do not restore the retired coercion to production to make this pass.
  it("test-spine.ts defines no coerceLegacyStage helper", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "_helpers", "test-spine.ts"), "utf8");
    expect(src).not.toMatch(/coerceLegacyStage/);
  });
});
