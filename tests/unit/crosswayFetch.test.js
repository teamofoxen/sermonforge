import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const requireCjs = createRequire(import.meta.url);
const { fetchCrossway } = requireCjs("../../electron/crosswayFetch.cjs");

// Session-5 Part E — the ONE bounded Crossway helper. Every ESV request ends
// as exactly one of success / controlled error / timeout / cancellation;
// nothing pends indefinitely. fetchImpl is injected, so all four endings are
// driven here without a network.
describe("fetchCrossway — bounded ESV requests", () => {
  it("success: a response comes back with the Token header attached", async () => {
    let seenHeaders = null;
    const result = await fetchCrossway("https://api.esv.org/test", {
      key: "abc123",
      fetchImpl: async (_url, opts) => {
        seenHeaders = opts.headers;
        return { ok: true, status: 200 };
      },
    });
    expect(result.kind).toBe("success");
    expect(result.res.status).toBe(200);
    expect(seenHeaders.Authorization).toBe("Token abc123");
  });

  it("controlled API error: a non-OK response is still a SUCCESS ending — status mapping stays with the caller", async () => {
    const result = await fetchCrossway("https://api.esv.org/test", {
      key: "bad",
      fetchImpl: async () => ({ ok: false, status: 401 }),
    });
    expect(result.kind).toBe("success"); // the caller maps 401 → "bad-key" plain English
    expect(result.res.status).toBe(401);
  });

  it("network failure ends as a controlled error result, never a throw", async () => {
    const result = await fetchCrossway("https://api.esv.org/test", {
      key: "k",
      fetchImpl: async () => { throw new Error("getaddrinfo ENOTFOUND"); },
    });
    expect(result.kind).toBe("error");
    expect(result.error.message).toMatch(/ENOTFOUND/);
  });

  it("timeout: a hung fetch is aborted and ends as { kind: 'timeout' } — no indefinite pend", async () => {
    const result = await fetchCrossway("https://api.esv.org/test", {
      key: "k",
      timeoutMs: 30,
      fetchImpl: (_url, opts) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () => reject(opts.signal.reason ?? new Error("aborted")));
        }),
    });
    expect(result.kind).toBe("timeout");
  });

  it("cancellation: the caller's own signal ends the request as { kind: 'cancelled' }", async () => {
    const caller = new AbortController();
    const pending = fetchCrossway("https://api.esv.org/test", {
      key: "k",
      timeoutMs: 60_000,
      signal: caller.signal,
      fetchImpl: (_url, opts) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () => reject(opts.signal.reason ?? new Error("aborted")));
        }),
    });
    caller.abort();
    expect((await pending).kind).toBe("cancelled");
  });
});
