import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE-GUARD tests (correctness audit, Tier-1 findings 1 & 4).
//
// The migration ladder lives in electron/persistence.cjs since the Session-2
// seam extraction — and unlike the old main.js home it IS require-able, with
// behavioral coverage in tests/persistence/production-persistence.test.ts
// (the ladder executes against real SQLite there). These source-level guards
// stay as cheap tripwires for the two Tier-1 shapes; the full behavioral
// migration/recovery matrix is Session-4 work.
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const MAIN = fs.readFileSync(path.join(ROOT, "electron", "persistence.cjs"), "utf8");

// Slice the body of a `if (version < N) { ... }` migration block. Returns the
// text between the block's opener and the next migration block opener.
function migrationBlock(src, n) {
  const start = src.indexOf(`if (version < ${n}) {`);
  expect(start, `migration block v${n} should exist`).toBeGreaterThanOrEqual(0);
  const next = src.indexOf(`if (version < ${n + 1}) {`, start + 1);
  return next >= 0 ? src.slice(start, next) : src.slice(start);
}

// The set of column keys the search INDEXER writes, read from the
// SERMON_SEARCH_COLUMNS constant (the single source of truth).
function indexerColumnKeys(src) {
  const decl = src.indexOf("const SERMON_SEARCH_COLUMNS = [");
  expect(decl, "SERMON_SEARCH_COLUMNS should exist").toBeGreaterThanOrEqual(0);
  const end = src.indexOf("];", decl);
  const body = src.slice(decl, end);
  const keys = [...body.matchAll(/\bkey:\s*"([^"]+)"/g)].map((m) => m[1]);
  expect(keys.length).toBeGreaterThan(5); // sanity: we actually parsed the array
  return new Set(keys);
}

// The set of columns a `CREATE TABLE sermon_search (...)` DDL will produce.
// Handles both forms: generated from the constant (`SERMON_SEARCH_COLUMNS.map`)
// → the full indexer key set; or a hardcoded column list → parsed identifiers.
function ddlColumnSet(blockText, indexerKeys) {
  const create = blockText.match(/CREATE TABLE[^(]*sermon_search\s*\(([\s\S]*?)\)\s*`/i);
  expect(create, "v22 block should contain a CREATE TABLE sermon_search").not.toBeNull();
  const ddlBody = create[1];
  if (/SERMON_SEARCH_COLUMNS\.map/.test(ddlBody)) {
    // Generated from the constant — by construction it produces exactly the
    // indexer key set, so drift is impossible.
    return new Set(indexerKeys);
  }
  // Hardcoded list: take the first identifier on each column line.
  const cols = new Set();
  for (const line of ddlBody.split("\n")) {
    const m = line.trim().match(/^([a-z_][a-z0-9_]*)\s+TEXT/i);
    if (m && m[1] !== "sermon_id") cols.add(m[1]);
  }
  return cols;
}

describe("migration safety — Tier-1 source guards", () => {
  it("finding 1: the v22 sermon_search table covers every column the indexer writes (no schema drift → no boot-lock)", () => {
    const indexerKeys = indexerColumnKeys(MAIN);
    const v22 = migrationBlock(MAIN, 22);
    const v22Cols = ddlColumnSet(v22, indexerKeys);
    // Every column indexSermonFtsFromRow writes MUST exist in the table the v22
    // migration creates, or the backfill INSERT throws and rolls back the whole
    // migration transaction — boot-locking any pre-v22 library that has rows.
    const missing = [...indexerKeys].filter((k) => !v22Cols.has(k));
    expect(missing, `v22 sermon_search table is missing indexer columns: ${missing.join(", ")}`).toEqual([]);
  });

  it("finding 1: the v24 sermon_search rebuild also covers every indexer column", () => {
    // v24 drops and recreates the table; it must stay consistent too.
    const indexerKeys = indexerColumnKeys(MAIN);
    const v24 = migrationBlock(MAIN, 24);
    const v24Cols = ddlColumnSet(v24, indexerKeys);
    const missing = [...indexerKeys].filter((k) => !v24Cols.has(k));
    expect(missing, `v24 sermon_search table is missing indexer columns: ${missing.join(", ")}`).toEqual([]);
  });

  it("finding 4: a non-numeric schema_version throws (rolls back) — it does NOT reset to 0 and re-run non-idempotent migrations", () => {
    // Find the guard block: `if (!Number.isInteger(version)) { ... }`.
    const guardStart = MAIN.indexOf("if (!Number.isInteger(version)) {");
    expect(guardStart, "the non-numeric schema_version guard should exist").toBeGreaterThanOrEqual(0);
    // Take a generous window covering the guard body. The closer match is
    // indentation-tolerant — the ladder sits inside the createPersistence
    // factory since the Session-2 extraction.
    const guard = MAIN.slice(guardStart, guardStart + 600);
    const closeIdx = guard.search(/\n[ \t]*\}/);
    expect(closeIdx, "guard body closer should be found").toBeGreaterThan(0);
    const guardBody = guard.slice(0, closeIdx + 1);
    // Must THROW…
    expect(guardBody).toMatch(/throw\s+/);
    // …and must NOT silently reset to 0 (the old, unsafe behavior).
    expect(guardBody).not.toMatch(/version\s*=\s*0\b/);
  });
});
