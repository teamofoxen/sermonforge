import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as path from "node:path";
// The Worker is a plain ESM module with a default { fetch } export — it runs
// here directly against the WHATWG Request/Response Node ships, with a stub
// D1 binding capturing what would persist. No miniflare needed.
import worker from "../../transport/worker.js";

// Session-5 Parts C + D — the Cloudflare Worker boundary:
//   • /inbox auth rides the Authorization header; a ?token= query is
//     REJECTED outright (it would land in logs/history).
//   • /ingest events persist to D1 only when they match the frozen schema
//     table (mirrored from electron/telemetry/events.js — parity pinned
//     below); unknown names/keys/types and sermon-shaped payloads never land.
//   • flag/form shapes reject unknown fields whole (lastAiCall retired).

// A stub D1 whose bind() carries its args so both .run() and batch() capture
// exactly what would persist.
function capturingEnv() {
  const rows: any[][] = [];
  return {
    rows,
    env: {
      ADMIN_TOKEN: "test-admin-token-value",
      DB: {
        prepare: () => ({
          bind: (...args: any[]) => {
            const bound = {
              __args: args,
              run: async () => { rows.push(args); },
              all: async () => ({ results: [] }),
            };
            return bound;
          },
        }),
        batch: async (bound: any[]) => {
          for (const b of bound) rows.push(b.__args);
        },
      },
    },
  };
}

const TESTER = "123e4567-e89b-42d3-a456-426614174000";

async function post(env: any, body: unknown) {
  const req = new Request("https://worker.test/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await worker.fetch(req, env);
  return { status: res.status, json: await res.json() };
}

describe("/inbox admin auth (Session-5 Part D)", () => {
  it("succeeds through the Authorization: Bearer header", async () => {
    const { env } = capturingEnv();
    const req = new Request("https://worker.test/inbox?limit=5", {
      headers: { Authorization: "Bearer test-admin-token-value" },
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data).toHaveProperty("flags");
    expect(data).toHaveProperty("forms");
    expect(data).toHaveProperty("events");
  });

  it("rejects a wrong bearer and a missing header", async () => {
    const { env } = capturingEnv();
    const wrong = await worker.fetch(
      new Request("https://worker.test/inbox", { headers: { Authorization: "Bearer nope" } }), env);
    expect(wrong.status).toBe(401);
    const missing = await worker.fetch(new Request("https://worker.test/inbox"), env);
    expect(missing.status).toBe(401);
  });

  it("REJECTS query-string token authentication outright — even with the correct token", async () => {
    const { env } = capturingEnv();
    const res = await worker.fetch(
      new Request("https://worker.test/inbox?token=test-admin-token-value"), env);
    expect(res.status).toBe(401);
    const body: any = await res.json();
    expect(body.error).toBe("token_in_query_rejected");
  });
});

describe("/ingest event schema gate (Session-5 Part C)", () => {
  it("allowed telemetry events persist", async () => {
    const { env, rows } = capturingEnv();
    const { status, json } = await post(env, {
      kind: "events",
      testerId: TESTER,
      items: [
        { eventType: "app-open", payload: { version: "1.1.0", platform: "win32" }, timestamp: "t" },
        { eventType: "crash", payload: { error: "boundary: boom" }, timestamp: "t" },
      ],
    });
    expect(status).toBe(200);
    expect(json.count).toBe(2);
    expect(json.rejected).toBe(0);
    expect(rows).toHaveLength(2);
  });

  it("unknown event names never persist", async () => {
    const { env, rows } = capturingEnv();
    const { json } = await post(env, {
      kind: "events",
      testerId: TESTER,
      items: [{ eventType: "sermon-dump", payload: {}, timestamp: "t" }],
    });
    expect(json.count).toBe(0);
    expect(json.rejected).toBe(1);
    expect(rows).toHaveLength(0);
  });

  it("unknown fields and wrong value types never persist", async () => {
    const { env, rows } = capturingEnv();
    const { json } = await post(env, {
      kind: "events",
      testerId: TESTER,
      items: [
        { eventType: "app-open", payload: { version: "1.1.0", platform: "win32", extra: "x" } },
        { eventType: "app-open", payload: { version: 42, platform: "win32" } },
        { eventType: "crash", payload: { error: ["not", "a", "string"] } },
      ],
    });
    expect(json.count).toBe(0);
    expect(json.rejected).toBe(3);
    expect(rows).toHaveLength(0);
  });

  it("a sermon-text-shaped payload cannot fit any allowed schema", async () => {
    const sermonText = "For by grace you have been saved through faith ".repeat(100);
    const { env, rows } = capturingEnv();
    const { json } = await post(env, {
      kind: "events",
      testerId: TESTER,
      items: [
        { eventType: "crash", payload: { error: sermonText } },            // over the bounded cap
        { eventType: "app-open", payload: { version: sermonText, platform: "w" } },
        { eventType: "app-open", payload: { version: "1", platform: "w", manuscript: sermonText } },
      ],
    });
    expect(json.count).toBe(0);
    expect(json.rejected).toBe(3);
    expect(rows).toHaveLength(0);
  });

  it("flag submissions reject unknown fields whole — including the retired lastAiCall", async () => {
    const { env, rows } = capturingEnv();
    const bad = await post(env, {
      kind: "flag",
      testerId: TESTER,
      surface: "writing-surface-study",
      lastAiCall: { prompt: "retired vocabulary" },
    });
    expect(bad.status).toBe(400);
    expect(bad.json.error).toBe("invalid_shape");
    expect(rows).toHaveLength(0);

    const good = await post(env, {
      kind: "flag",
      testerId: TESTER,
      surface: "writing-surface-study",
      note: "the pastor's deliberate feedback text",
      timestamp: "t",
    });
    expect(good.status).toBe(200);
    expect(rows).toHaveLength(1);
  });

  it("a bogus tester id is rejected before anything else", async () => {
    const { env, rows } = capturingEnv();
    const { status } = await post(env, { kind: "events", testerId: "not-a-uuid", items: [] });
    expect(status).toBe(400);
    expect(rows).toHaveLength(0);
  });
});

describe("schema mirror parity — worker table ⟷ electron/telemetry/events.js", () => {
  it("the Worker's hand-mirrored EVENT_SCHEMAS matches the app registry key-for-key", () => {
    const requireCjs = createRequire(import.meta.url);
    const appEvents = requireCjs("../../electron/telemetry/events.js");
    const workerSrc = fs.readFileSync(path.resolve(__dirname, "../../transport/worker.js"), "utf8");
    // Parse the worker's table: event names and their key lists.
    const block = workerSrc.slice(workerSrc.indexOf("const EVENT_SCHEMAS = {"), workerSrc.indexOf("};", workerSrc.indexOf("const EVENT_SCHEMAS = {")));
    for (const [eventType, schema] of Object.entries(appEvents.EVENT_SCHEMAS)) {
      expect(block, `worker missing event '${eventType}'`).toContain(`'${eventType}':`);
      for (const key of Object.keys(schema as object)) {
        expect(block, `worker schema for '${eventType}' missing key '${key}'`).toContain(`${key}:`);
      }
    }
    // And the worker carries no EXTRA event names beyond the app registry.
    const workerNames = [...block.matchAll(/'([a-z-]+)':\s*\{/g)].map((m) => m[1]);
    expect(workerNames.sort()).toEqual(Object.keys(appEvents.EVENT_SCHEMAS).sort());
  });
});
