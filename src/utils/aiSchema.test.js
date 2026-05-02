// aiSchema.test.js
// Structural-shape validation for AI JSON outputs. Validators only check
// shape (object vs array, keys present, value types). They do not check
// content — a well-shaped response with garbage values must still pass.

import { describe, it, expect } from "vitest";
import {
  parseAIJson,
  validateIncorporateMptMps,
  validateIncorporateStructuredField,
  validateScriptureMap,
  validateCMC,
} from "./aiSchema";

describe("parseAIJson", () => {
  it("parses bare JSON", () => {
    const r = parseAIJson('{"a":1}');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 1 });
  });

  it("strips ```json fences", () => {
    const r = parseAIJson('```json\n{"a":1}\n```');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 1 });
  });

  it("rejects empty input", () => {
    const r = parseAIJson("");
    expect(r.ok).toBe(false);
  });

  it("rejects malformed JSON with a usable reason", () => {
    const r = parseAIJson("{ not json");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/JSON/i);
  });
});

describe("validateIncorporateMptMps", () => {
  it("accepts both fields as strings", () => {
    expect(validateIncorporateMptMps({ mpt: "x", mps: "y" }).ok).toBe(true);
  });

  it("accepts empty strings (content not validated)", () => {
    expect(validateIncorporateMptMps({ mpt: "", mps: "" }).ok).toBe(true);
  });

  it("rejects missing mps", () => {
    const r = validateIncorporateMptMps({ mpt: "x" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/mps/);
  });

  it("rejects an array", () => {
    expect(validateIncorporateMptMps([]).ok).toBe(false);
  });
});

describe("validateIncorporateStructuredField", () => {
  const fieldDefs = [
    { key: "summary", label: "Summary" },
    { key: "details", label: "Details" },
  ];

  it("accepts an object with all required keys as strings", () => {
    const r = validateIncorporateStructuredField({ summary: "a", details: "b" }, fieldDefs);
    expect(r.ok).toBe(true);
  });

  it("rejects missing key", () => {
    const r = validateIncorporateStructuredField({ summary: "a" }, fieldDefs);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Details/);
  });

  it("rejects non-string value", () => {
    const r = validateIncorporateStructuredField({ summary: "a", details: 42 }, fieldDefs);
    expect(r.ok).toBe(false);
  });

  it("rejects null", () => {
    expect(validateIncorporateStructuredField(null, fieldDefs).ok).toBe(false);
  });
});

describe("validateScriptureMap", () => {
  it("accepts numeric-string keys mapping to refs", () => {
    const r = validateScriptureMap({ "1": "Romans 8:1-2", "2": "Romans 8:3" });
    expect(r.ok).toBe(true);
  });

  it("rejects empty object", () => {
    expect(validateScriptureMap({}).ok).toBe(false);
  });

  it("rejects non-numeric key", () => {
    const r = validateScriptureMap({ first: "Romans 8:1" });
    expect(r.ok).toBe(false);
  });

  it("rejects an array", () => {
    expect(validateScriptureMap(["Romans 8:1"]).ok).toBe(false);
  });
});

describe("validateCMC", () => {
  const okBlock = { id: "b1", movement: "set-up", trigger_phrase: "trigger", core_claim: "claim" };

  it("accepts spine + non-empty blocks array", () => {
    const r = validateCMC({ spine: "S", blocks: [okBlock] });
    expect(r.ok).toBe(true);
  });

  it("accepts missing spine (optional)", () => {
    expect(validateCMC({ blocks: [okBlock] }).ok).toBe(true);
  });

  it("rejects empty blocks array", () => {
    expect(validateCMC({ blocks: [] }).ok).toBe(false);
  });

  it("rejects block missing core_claim", () => {
    const bad = { id: "b1", movement: "m", trigger_phrase: "t" };
    const r = validateCMC({ blocks: [bad] });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/core_claim/);
  });

  it("rejects when blocks is not an array", () => {
    expect(validateCMC({ blocks: "x" }).ok).toBe(false);
  });
});
