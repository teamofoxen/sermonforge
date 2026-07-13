import { describe, it, expect, vi, afterEach } from "vitest";
import { createRequire } from "node:module";
import { SAVE_TRANSITION, resolveSaveTransition } from "../../src/utils/saveTransition";

const requireCjs = createRequire(import.meta.url);

// The persistence-transition contract (Session-1 remediation): every
// deliberate transition away from editable work resolves to exactly one of
// "saved" / "failed" / "unknown". This file pins the renderer-side mapping
// (resolveSaveTransition) and the ESM⟷CJS constant parity with the
// main-process mirror (electron/saveTransition.cjs) — same mirror discipline
// as contracts.ts ⟷ contracts.cjs.
describe("resolveSaveTransition — the tri-state mapping", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves "saved" for a truthy resolution', async () => {
    expect(await resolveSaveTransition(() => true)).toBe(SAVE_TRANSITION.Saved);
  });

  it('resolves "saved" for an undefined resolution (void flusher, nothing pending)', async () => {
    expect(await resolveSaveTransition(async () => undefined)).toBe(SAVE_TRANSITION.Saved);
  });

  it('resolves "failed" for an exact-false resolution (persistUpdate\'s failure signal)', async () => {
    expect(await resolveSaveTransition(async () => false)).toBe(SAVE_TRANSITION.Failed);
  });

  it('resolves "failed" for a rejection', async () => {
    expect(await resolveSaveTransition(async () => { throw new Error("db locked"); }))
      .toBe(SAVE_TRANSITION.Failed);
  });

  it('resolves "failed" for a synchronous throw', async () => {
    expect(await resolveSaveTransition(() => { throw new Error("sync boom"); }))
      .toBe(SAVE_TRANSITION.Failed);
  });

  it('resolves "unknown" when the attempt does not settle inside the timeout — uncertainty is not dressed up as success OR failure', async () => {
    vi.useFakeTimers();
    const hung = resolveSaveTransition(() => new Promise(() => {}), 2000);
    await vi.advanceTimersByTimeAsync(2000);
    expect(await hung).toBe(SAVE_TRANSITION.Unknown);
  });

  it("a settle just before the timeout wins the race", async () => {
    vi.useFakeTimers();
    let settle;
    const attempt = resolveSaveTransition(() => new Promise((r) => { settle = r; }), 2000);
    await vi.advanceTimersByTimeAsync(1999);
    settle(true);
    expect(await attempt).toBe(SAVE_TRANSITION.Saved);
  });
});

describe("SAVE_TRANSITION constants — ESM ⟷ CJS mirror parity", () => {
  it("src/utils/saveTransition.js and electron/saveTransition.cjs carry identical values", () => {
    const cjs = requireCjs("../../electron/saveTransition.cjs");
    expect({ ...cjs.SAVE_TRANSITION }).toEqual({ ...SAVE_TRANSITION });
    // The three values ARE the contract — pin them literally so neither side
    // can drift to a fourth state or a respelling.
    expect(Object.values(SAVE_TRANSITION).sort()).toEqual(["failed", "saved", "unknown"]);
  });
});
