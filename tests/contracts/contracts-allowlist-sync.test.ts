import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { installTestSpine, resetTestSpine } from "./_helpers/test-spine";

// The column allowlists exist in three hand-maintained copies that MUST stay in
// sync (audit M9): the renderer source (src/core/contracts.ts), its CommonJS
// mirror for the main process (electron/contracts.cjs), and the in-memory test
// fixture (tests/contracts/_helpers/test-spine.ts). buildUpdate gates every
// write against the .cjs copy, so drift means a field silently dropped in prod
// (or a dev throw). This test fails the moment the copies diverge.

const requireCjs = createRequire(import.meta.url);

function eq(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

describe("Column allowlists stay in sync across the three mirrors", () => {
  it("SERMON / SERIES / SECTION_COLUMNS match: contracts.ts ⟷ contracts.cjs ⟷ test-spine", async () => {
    const ts: any = await import("../../src/core/contracts");
    const cjs: any = requireCjs("../../electron/contracts.cjs");
    const fixture: any = await import("./_helpers/test-spine");

    for (const name of ["SERMON_COLUMNS", "SERIES_COLUMNS", "SECTION_COLUMNS"]) {
      const a = ts[name] as Set<string>;
      const b = cjs[name] as Set<string>;
      const c = fixture[name] as Set<string>;
      expect(a, `${name} missing from contracts.ts`).toBeInstanceOf(Set);
      expect(b, `${name} missing from contracts.cjs`).toBeInstanceOf(Set);
      expect(c, `${name} missing from test-spine`).toBeInstanceOf(Set);
      expect(eq(a, b), `${name} drift: contracts.ts vs contracts.cjs\n ts=${[...a].sort()}\n cjs=${[...b].sort()}`).toBe(true);
      expect(eq(a, c), `${name} drift: contracts.ts vs test-spine`).toBe(true);
    }
  });
});

describe("Allowlist gating: an unknown column rejects the WHOLE update (Session 3)", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  function spine() {
    return (globalThis as any).electronAPI.spine as (op: string, payload?: any) => Promise<any>;
  }

  it("an update carrying ANY unknown field is rejected whole — known siblings do NOT apply (Session-3 Part C)", async () => {
    const created = await spine()("create-series", { name: "Sync" });
    const id = created.value.id;

    // Only-unknown → rejected.
    const bad = await spine()("update-series", { id, fields: { not_a_column: "x" } });
    expect(bad.ok).toBe(false);
    expect(bad.clause).toBe("State #5");
    expect(bad.code).toBe("STATE_5_UNKNOWN_FIELD");

    // Mixed → the WHOLE update is refused; the valid sibling must not land.
    // (The pre-Session-3 behavior — save the known field, silently drop the
    // unknown one, report success — is exactly the silent partial persistence
    // this gate now forbids, identically in dev and production.)
    const mixed = await spine()("update-series", { id, fields: { big_idea: "must not land", not_a_column: "x" } });
    expect(mixed.ok).toBe(false);
    expect(mixed.code).toBe("STATE_5_UNKNOWN_FIELD");
    const row = await spine()("get-series", id);
    expect(row.big_idea ?? "").toBe("");
    expect(row.not_a_column).toBeUndefined();
  });
});
