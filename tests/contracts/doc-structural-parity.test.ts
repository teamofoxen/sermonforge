import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { WALK_ORDER, QUESTION_WALK_ORDER, REGION_DISPLAY } from "../../src/utils/walkOrder";

// Domain Model Normalization — Slice 1, item 5 (Structural doc/code parity).
//
// docs/WORKSPACE-CANON.md mirrors code-owned structure — field counts, the
// stage/sub-phase table, and field keys — with no test asserting the mirror.
// The same class of drift (stale counts) recurred and was caught only by a
// second manual sweep (the "S8" episode). This pins the MECHANICAL structural
// claims against the code (WALK_ORDER) so canon can no longer silently claim a
// walk shape the code does not have.
//
// SCOPE (owner ruling, deliberately narrow): field counts, the §1 stage/sub-phase
// display table, and field-key tokens. NOT semantic prose, Merida annotations,
// theological wording, or pastor-facing copy. If the parser turns brittle, the
// remedy is to shrink this test's scope — never to constrain the docs.

const CANON = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "docs", "WORKSPACE-CANON.md"),
  "utf8",
);

// ── Code-derived structure (the source of truth) ─────────────────────────────
const stages = [...new Set(WALK_ORDER.map((f) => f.stage))];
const subPhases = [...new Set(WALK_ORDER.map((f) => `${f.stage}/${f.subPhase}`))];
const studyFields = WALK_ORDER.filter((f) => f.stage === "Study").length;
const asmMsFields = WALK_ORDER.filter((f) => f.stage !== "Study").length;
const totalFields = WALK_ORDER.length;

describe("Canon §1 headline counts match the code (WALK_ORDER)", () => {
  it("stages and sub-phases", () => {
    expect(stages).toHaveLength(3);
    expect(subPhases).toHaveLength(8);
    expect(CANON, "canon §1 no longer says 'Three stages'").toContain("Three stages");
    expect(CANON, "canon §1 no longer says 'eight sub-phases'").toContain("eight sub-phases");
  });

  it("field counts (Study / Assembly-Manuscript / total)", () => {
    expect(CANON, `canon §1 Study-field count drifted from code (${studyFields})`)
      .toMatch(new RegExp(`${studyFields}\\s+Study fields`));
    expect(CANON, `canon §1 Assembly/Manuscript-field count drifted from code (${asmMsFields})`)
      .toMatch(new RegExp(`\\+\\s*${asmMsFields}\\s+Assembly/Manuscript`));
    expect(CANON, `canon §1 total-field count drifted from code (${totalFields})`)
      .toMatch(new RegExp(`\\(${totalFields}\\s+total`));
  });
});

describe("Canon §1 stage/sub-phase table names match REGION_DISPLAY", () => {
  it("the table's Sub-phase column equals the canonical display names", () => {
    const lines = CANON.split(/\r?\n/);
    const header = lines.findIndex((l) => /^\|\s*Stage\s*\|\s*Sub-phase\s*\|/.test(l));
    expect(header, "canon §1 stage/sub-phase table header not found").toBeGreaterThan(-1);
    const rows: string[] = [];
    for (let i = header + 2; i < lines.length; i++) {
      // header + 1 is the |---|---| separator; body rows follow until a non-row.
      if (!lines[i].trimStart().startsWith("|")) break;
      rows.push(lines[i]);
    }
    const tableSubPhases = rows
      .map((r) => r.split("|")[2]?.replace(/\*\*/g, "").trim())
      .filter((s): s is string => Boolean(s));
    expect(tableSubPhases.sort()).toEqual(Object.values(REGION_DISPLAY).sort());
  });
});

describe("Every field key the canon tabulates is a real walk key", () => {
  // Collect the `(`key`)` token from the FIRST column of each body row of every
  // "| Field (`key`) | … |" table. Anchoring to field-table body rows (not the
  // whole doc) excludes the header placeholder and prose references like
  // (`project_merida_intent_audit`) — the deliberate scope-shrink the owner
  // ruling prescribes over constraining the docs. Study tables use this header;
  // any table that adopts it is covered automatically.
  function fieldKeysFromTables(canon: string): string[] {
    const lines = canon.split(/\r?\n/);
    const keys: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes("Field (`key`)")) continue; // table header row
      for (let j = i + 2; j < lines.length; j++) {        // +1 is the |---| separator
        if (!lines[j].trimStart().startsWith("|")) break;
        const firstCell = lines[j].split("|")[1] || "";
        const m = firstCell.match(/\(`([a-z_]+)`\)/);
        if (m) keys.push(m[1]);
      }
    }
    return keys;
  }

  it("no field-table `(`key`)` names a field/question that does not exist", () => {
    const realKeys = new Set<string>([
      ...WALK_ORDER.map((f) => f.key),
      ...QUESTION_WALK_ORDER.map((q) => q.questionKey),
    ]);
    const tokens = fieldKeysFromTables(CANON);
    expect(tokens.length, "no field-key tokens found in canon field tables (parser drift)").toBeGreaterThan(10);
    const bogus = [...new Set(tokens)].filter((t) => !realKeys.has(t));
    expect(bogus, `canon field tables tabulate key(s) no field/question in WALK_ORDER owns: ${bogus.join(", ")}`)
      .toEqual([]);
  });
});
