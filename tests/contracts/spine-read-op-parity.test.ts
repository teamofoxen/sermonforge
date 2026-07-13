import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// Session-2 remediation — read-op parity across the three spine surfaces.
//
// The exact drift this pins: production gained `get-all-tags` (Coverage
// Initiative P3) and the fixture didn't — every workspace mount in a component
// test then logged "Unknown spine mutation op: get-all-tags" as ROUTINE stderr
// while staying green. An unexpected contract violation must fail a test, not
// survive as noise. This converts the whole drift class into a failing test:
// the op set must be identical in
//   • electron/main.js         — SPINE_READ_OPS (the IPC routing set)
//   • electron/persistence.cjs — the spineRead switch (the production reads)
//   • tests/contracts/_helpers/test-spine.ts — the fixture's set + switch

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.resolve(ROOT, rel), "utf8");

function setLiteral(src: string, marker: string): string[] {
  const start = src.indexOf(marker);
  expect(start, `marker not found: ${marker}`).toBeGreaterThanOrEqual(0);
  const end = src.indexOf("]);", start);
  const body = src.slice(start, end);
  return [...body.matchAll(/"(get-[a-z-]+)"/g)].map((m) => m[1]).sort();
}

function switchCases(src: string, fnMarker: string): string[] {
  const start = src.indexOf(fnMarker);
  expect(start, `marker not found: ${fnMarker}`).toBeGreaterThanOrEqual(0);
  // The read switch ends at its default clause.
  const end = src.indexOf("default:", start);
  const body = src.slice(start, end);
  return [...body.matchAll(/case "(get-[a-z-]+)"/g)].map((m) => m[1]).sort();
}

describe("spine read ops stay identical across routing, production reads, and the fixture", () => {
  const routing = setLiteral(read("electron/main.js"), "const SPINE_READ_OPS = new Set([");
  const production = switchCases(read("electron/persistence.cjs"), "function spineRead(op, payload) {");
  const fixtureSet = setLiteral(read("tests/contracts/_helpers/test-spine.ts"), "const SPINE_READ_OPS = new Set([");
  const fixtureCases = switchCases(read("tests/contracts/_helpers/test-spine.ts"), "function spineRead(op: string, payload: any): any {");

  it("parsed a non-trivial op set (guards against a vacuous pass)", () => {
    expect(routing.length).toBeGreaterThanOrEqual(10);
  });

  it("production spineRead implements exactly the routed op set", () => {
    expect(production).toEqual(routing);
  });

  it("the fixture routes exactly the production op set", () => {
    expect(fixtureSet).toEqual(routing);
  });

  it("the fixture spineRead implements exactly the production op set — a missing case fails HERE, not as stderr noise", () => {
    expect(fixtureCases).toEqual(routing);
  });
});
