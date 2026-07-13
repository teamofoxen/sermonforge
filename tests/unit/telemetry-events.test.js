import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const requireCjs = createRequire(import.meta.url);
const { EVENT_TYPES, EVENT_SCHEMAS, validateEvent, MAX_CRASH_ERROR } = requireCjs("../../electron/telemetry/events.js");

// Session-5 Part C — the telemetry boundary is EXECUTABLE: exact event names,
// exact payload keys, exact value types. This is the app-side gate
// (electron/telemetry/bus.js emit() runs it before anything reaches even the
// local NDJSON buffer); the Worker mirrors the same table before D1
// (tests/transport/worker-boundary.test.ts pins the mirror in sync).
describe("telemetry event schemas — the executable privacy boundary", () => {
  it("the registry carries exactly the LIVE vocabulary (app-open, crash) — the four never-emitted types are retired", () => {
    expect(Object.values(EVENT_TYPES).sort()).toEqual(["app-open", "crash"]);
    expect(Object.keys(EVENT_SCHEMAS).sort()).toEqual(["app-open", "crash"]);
    // Retired vocabulary must not linger.
    for (const dead of ["panel-time", "field-time", "sermon-create", "sermon-finish"]) {
      expect(EVENT_SCHEMAS[dead]).toBeUndefined();
    }
  });

  it("allowed events with exact payloads succeed", () => {
    expect(validateEvent("app-open", { version: "1.1.0", platform: "win32" }).ok).toBe(true);
    expect(validateEvent("crash", { error: "react-error-boundary: boom" }).ok).toBe(true);
  });

  it("unknown event names fail", () => {
    expect(validateEvent("sermon-content-dump", { version: "1", platform: "x" }).ok).toBe(false);
    expect(validateEvent("panel-time", { surface: "x", durationMs: 1 }).ok).toBe(false); // retired = unknown
  });

  it("unknown payload fields fail — even beside valid ones", () => {
    const r = validateEvent("app-open", { version: "1.1.0", platform: "win32", extra: "nope" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/unknown payload key/);
  });

  it("wrong value types fail", () => {
    expect(validateEvent("app-open", { version: 42, platform: "win32" }).ok).toBe(false);
    expect(validateEvent("crash", { error: { message: "objects not allowed" } }).ok).toBe(false);
    expect(validateEvent("crash", { error: 123 }).ok).toBe(false);
  });

  it("a sermon-text-shaped payload cannot fit ANY allowed schema (structural exclusion)", () => {
    const sermonText = "There is therefore now no condemnation ".repeat(80); // ~3KB of prose
    // As a value on every allowed key of every allowed event:
    expect(validateEvent("app-open", { version: sermonText, platform: "win32" }).ok).toBe(false); // over 64-char cap
    expect(validateEvent("app-open", { version: "1.1.0", platform: sermonText }).ok).toBe(false);
    expect(validateEvent("crash", { error: sermonText }).ok).toBe(false); // over the bounded crash cap
    // As an extra key:
    expect(validateEvent("crash", { error: "x", manuscript: sermonText }).ok).toBe(false);
    // The one free-text field is bounded and documented:
    expect(validateEvent("crash", { error: "e".repeat(MAX_CRASH_ERROR) }).ok).toBe(true);
    expect(validateEvent("crash", { error: "e".repeat(MAX_CRASH_ERROR + 1) }).ok).toBe(false);
  });

  it("missing required keys fail (a payload must match the schema exactly)", () => {
    expect(validateEvent("app-open", { version: "1.1.0" }).ok).toBe(false);
    expect(validateEvent("crash", {}).ok).toBe(false);
  });
});
