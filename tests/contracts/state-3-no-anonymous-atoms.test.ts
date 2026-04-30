import { describe, it, expect, beforeEach } from "vitest";
import { installTestSpine, resetTestSpine } from "./_helpers/test-spine";

// State Contract #3 (docs/CORE.md):
//   "No anonymous atoms. A sermon must have a name. A series must have a
//   name. The system refuses to admit a nameless atom into canonical state."

describe("State Contract #3: no anonymous atoms (renderer fast-fail)", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("createSermon('') rejects at the renderer boundary with clause State #3", async () => {
    const { createSermon } = await import("../../src/core/spine");
    let err: any = null;
    try {
      await createSermon({ name: "" });
    } catch (e) {
      err = e;
    }
    expect(err).not.toBeNull();
    expect(err.name).toBe("ContractViolation");
    expect(err.clause).toBe("State #3");
    expect(err.message).toMatch(/no anonymous atoms/i);
  });

  it("createSermon('   ') rejects (whitespace-only name)", async () => {
    const { createSermon } = await import("../../src/core/spine");
    let err: any = null;
    try {
      await createSermon({ name: "   " });
    } catch (e) {
      err = e;
    }
    expect(err?.clause).toBe("State #3");
  });

  it("createSeries('') rejects at the renderer boundary with clause State #3", async () => {
    const { createSeries } = await import("../../src/core/spine");
    let err: any = null;
    try {
      await createSeries({ name: "" });
    } catch (e) {
      err = e;
    }
    expect(err?.clause).toBe("State #3");
    expect(err?.message).toMatch(/series must have a name/i);
  });
});

describe("State Contract #3: no anonymous atoms (IPC validateAndCommit re-validation)", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  // Bypass the renderer fast-fail by going through the bridge directly with
  // a payload the renderer wouldn't construct. This proves State #3 is
  // enforced at the boundary (validateAndCommit), not just by spine.ts.
  it("validateAndCommit rejects nameless sermon when renderer is bypassed", async () => {
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("create-sermon", { name: "" });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("State #3");
    expect(result.code).toBe("STATE_3_NAMELESS_SERMON");
  });

  it("validateAndCommit rejects nameless series when renderer is bypassed", async () => {
    const bridge = (globalThis as any).electronAPI.spine;
    const result = await bridge("create-series", { name: "" });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("State #3");
    expect(result.code).toBe("STATE_3_NAMELESS_SERIES");
  });

  it("validateAndCommit rejects update-series that empties the title", async () => {
    const bridge = (globalThis as any).electronAPI.spine;
    const created = await bridge("create-series", { name: "Romans" });
    expect(created.ok).toBe(true);
    const result = await bridge("update-series", {
      id: created.value.id,
      fields: { title: "   " },
    });
    expect(result.ok).toBe(false);
    expect(result.clause).toBe("State #3");
  });
});
