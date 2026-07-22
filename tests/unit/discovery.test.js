import { describe, it, expect } from "vitest";
import {
  parseDiscovery, mergeDiscovery, decisionsOf,
  AUTHORIAL_FUNCTIONS, MAX_DIFFICULT_DECISIONS,
} from "../../src/utils/discovery.js";

// The Series Discovery envelope helpers (v34). Fail-soft parse + a shallow merge
// that can never drop a sibling sub-field — the property the flat-envelope design
// buys, and the one the Discover walk relies on when it saves one field at a time.

describe("parseDiscovery — fail-soft to {}", () => {
  it("returns {} for null / undefined / non-string", () => {
    expect(parseDiscovery(null)).toEqual({});
    expect(parseDiscovery(undefined)).toEqual({});
    expect(parseDiscovery(42)).toEqual({});
    expect(parseDiscovery({})).toEqual({}); // already-object but not a string → {}
  });
  it("returns {} for malformed JSON, arrays, and JSON primitives — never throws", () => {
    expect(parseDiscovery("{not json")).toEqual({});
    expect(parseDiscovery("[1,2,3]")).toEqual({});
    expect(parseDiscovery('"a string"')).toEqual({});
    expect(parseDiscovery("null")).toEqual({});
    expect(parseDiscovery("")).toEqual({});
  });
  it("parses a well-formed envelope", () => {
    const raw = JSON.stringify({ whyBegin: "here", subject: "grace" });
    expect(parseDiscovery(raw)).toEqual({ whyBegin: "here", subject: "grace" });
  });
});

describe("mergeDiscovery — shallow merge that preserves siblings", () => {
  it("adds a new sub-field without dropping the others", () => {
    const start = JSON.stringify({ whyBegin: "A", whyEnd: "B" });
    const merged = mergeDiscovery(start, { subject: "C" });
    expect(JSON.parse(merged)).toEqual({ whyBegin: "A", whyEnd: "B", subject: "C" });
  });
  it("overwrites only the patched sub-field (a keystroke sends the whole new value)", () => {
    const start = JSON.stringify({ whyBegin: "old", whyEnd: "keep" });
    expect(JSON.parse(mergeDiscovery(start, { whyBegin: "new" }))).toEqual({ whyBegin: "new", whyEnd: "keep" });
  });
  it("merges onto a null/empty envelope (first edit on a fresh row)", () => {
    expect(JSON.parse(mergeDiscovery(null, { readNotes: "x" }))).toEqual({ readNotes: "x" });
    expect(JSON.parse(mergeDiscovery("", { readNotes: "x" }))).toEqual({ readNotes: "x" });
  });
  it("replaces an array field (decisions) wholesale — the caller owns the array", () => {
    const start = JSON.stringify({ decisions: [{ id: "1" }, { id: "2" }], readNotes: "keep" });
    const merged = mergeDiscovery(start, { decisions: [{ id: "1" }] });
    expect(JSON.parse(merged)).toEqual({ decisions: [{ id: "1" }], readNotes: "keep" });
  });
  it("a malformed current envelope degrades to {} then takes the patch (never throws)", () => {
    expect(JSON.parse(mergeDiscovery("{broken", { subject: "s" }))).toEqual({ subject: "s" });
  });
});

describe("decisionsOf — fail-soft array read", () => {
  it("returns the decisions array when present", () => {
    const raw = JSON.stringify({ decisions: [{ id: "a" }] });
    expect(decisionsOf(raw)).toEqual([{ id: "a" }]);
  });
  it("returns [] when absent, non-array, or the envelope is malformed", () => {
    expect(decisionsOf(JSON.stringify({ readNotes: "x" }))).toEqual([]);
    expect(decisionsOf(JSON.stringify({ decisions: "nope" }))).toEqual([]);
    expect(decisionsOf(null)).toEqual([]);
    expect(decisionsOf("{broken")).toEqual([]);
  });
});

describe("fixed vocabularies (AI-free — the pastor PICKS, the system never suggests)", () => {
  it("authorial functions include the mission's list and end with Other", () => {
    for (const f of ["Commanding", "Warning", "Encouraging", "Explaining", "Correcting",
      "Comforting", "Rebuking", "Exhorting", "Defending", "Celebrating", "Other"]) {
      expect(AUTHORIAL_FUNCTIONS).toContain(f);
    }
    expect(AUTHORIAL_FUNCTIONS[AUTHORIAL_FUNCTIONS.length - 1]).toBe("Other");
  });
  it("caps difficult decisions at three", () => {
    expect(MAX_DIFFICULT_DECISIONS).toBe(3);
  });
});
