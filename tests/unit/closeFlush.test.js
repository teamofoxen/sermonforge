import { describe, it, expect, afterEach } from "vitest";
import { registerFlush, runRegisteredFlushes } from "../../src/utils/closeFlush";

// Correctness audit, finding 8 — the exit-flush registry must REPORT failure,
// not swallow it. Before the fix it returned a Promise.allSettled array and the
// close path proceeded regardless, so a failed final write dropped the pastor's
// last edits silently (Mutation #3 violation). Now it returns { ok } where ok is
// false if any flusher rejects OR resolves exactly `false` (persistUpdate's
// failed-write signal); the caller carries ok through the close ack so main can
// block/prompt.
describe("runRegisteredFlushes — failure is reported, never swallowed", () => {
  // registerFlush mutates a module-level Set; unregister everything between tests.
  const cleanups = [];
  const reg = (fn) => { cleanups.push(registerFlush(fn)); };
  afterEach(() => { cleanups.forEach((u) => u()); cleanups.length = 0; });

  it("ok:true with no flushers registered", async () => {
    expect(await runRegisteredFlushes()).toEqual({ ok: true });
  });

  it("ok:true when every flusher resolves truthy or undefined", async () => {
    reg(() => true);
    reg(() => undefined);       // void flusher counts as success
    reg(async () => {});        // resolves undefined
    reg(() => Promise.resolve(true));
    expect(await runRegisteredFlushes()).toEqual({ ok: true });
  });

  it("ok:false when a flusher resolves exactly false (failed-write signal)", async () => {
    reg(() => true);
    reg(async () => false);     // persistUpdate-style failure
    expect(await runRegisteredFlushes()).toEqual({ ok: false });
  });

  it("ok:false when a flusher throws synchronously (not swallowed)", async () => {
    reg(() => true);
    reg(() => { throw new Error("sync flush boom"); });
    expect(await runRegisteredFlushes()).toEqual({ ok: false });
  });

  it("ok:false when a flusher rejects asynchronously (not swallowed)", async () => {
    reg(async () => { throw new Error("async flush boom"); });
    expect(await runRegisteredFlushes()).toEqual({ ok: false });
  });

  it("runs ALL flushers even when one fails (allSettled, not fail-fast)", async () => {
    let ran = 0;
    reg(() => { ran++; return true; });
    reg(() => { ran++; return false; });
    reg(() => { ran++; return true; });
    const res = await runRegisteredFlushes();
    expect(ran).toBe(3);
    expect(res).toEqual({ ok: false });
  });
});
