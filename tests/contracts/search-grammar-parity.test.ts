import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// Domain Model Normalization — Slice 1, item 4 (Search grammar parity).
//
// The search pipeline keys three hand-synced maps on the same sermon columns:
//   • SERMON_SEARCH_COLUMNS  (electron/persistence.cjs)  — what gets indexed
//     (lived in electron/main.js until the Session-2 seam extraction)
//   • HINT_MAP               (src/utils/searchHints.js)  — matched column → landing hint
//   • COLUMN_LABELS          (src/components/SearchResultSnippet.jsx) — matched column → pastor-facing label
// A column indexed with no hint lands nowhere; with no label shows a blank tag.
// The three drifted by hand across two prior restructures and had zero test
// coverage. This asserts their key sets stay equal.
//
// Behavior-preserving: it reads source text and compares key sets (the
// scan-aliases.ts pattern). No constant is moved; search output is unchanged.

const ROOT = path.resolve(__dirname, "..", "..");

function read(rel: string): string {
  return fs.readFileSync(path.resolve(ROOT, rel), "utf8");
}

// Isolate a `const NAME = <open> … <close>` block (non-greedy to the first
// line-start closer, at any indentation — SERMON_SEARCH_COLUMNS moved inside
// the createPersistence factory in the Session-2 extraction). These literals
// have no line-start braces/brackets inside.
function block(src: string, name: string, open: "{" | "["): string {
  const close = open === "{" ? "}" : "]";
  const re = new RegExp(`const ${name} = \\${open}([\\s\\S]*?)\\n[ \\t]*\\${close};`);
  const m = src.match(re);
  if (!m) throw new Error(`Could not locate const ${name} block`);
  return m[1];
}

// Keys of an object/array-of-object literal: identifiers at line start followed
// by a colon (object maps), or `key: "…"` entries (array-of-object). Lowercase +
// underscore only — column names never carry other characters.
function objectKeys(blockSrc: string): string[] {
  return [...blockSrc.matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1]);
}
function keyFieldValues(blockSrc: string): string[] {
  return [...blockSrc.matchAll(/\bkey:\s*"([a-z_]+)"/g)].map((m) => m[1]);
}

describe("Search maps stay keyed on the same columns", () => {
  const searchColumns = keyFieldValues(
    block(read("electron/persistence.cjs"), "SERMON_SEARCH_COLUMNS", "["),
  ).sort();
  const hintKeys = objectKeys(
    block(read("src/utils/searchHints.js"), "HINT_MAP", "{"),
  ).sort();
  const labelKeys = objectKeys(
    block(read("src/components/SearchResultSnippet.jsx"), "COLUMN_LABELS", "{"),
  ).sort();

  it("collects a non-empty set from each map (guards against a vacuous pass)", () => {
    expect(searchColumns.length).toBeGreaterThanOrEqual(10);
    expect(hintKeys.length).toBe(searchColumns.length);
    expect(labelKeys.length).toBe(searchColumns.length);
  });

  it("HINT_MAP keys equal the indexed SERMON_SEARCH_COLUMNS keys", () => {
    expect(hintKeys, "searchHints HINT_MAP drifted from main.js SERMON_SEARCH_COLUMNS")
      .toEqual(searchColumns);
  });

  it("COLUMN_LABELS keys equal the indexed SERMON_SEARCH_COLUMNS keys", () => {
    expect(labelKeys, "SearchResultSnippet COLUMN_LABELS drifted from main.js SERMON_SEARCH_COLUMNS")
      .toEqual(searchColumns);
  });
});
