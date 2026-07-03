import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { SERMON_MANUSCRIPT_FIELDS } from "../../src/utils/sermonManuscriptFields";
import { FUNCTIONAL_ELEMENT_KEYS } from "../../src/utils";

// Domain Model Normalization — Slice 1, item 3 (Export grammar parity).
//
// The Word docx builder in electron/main.js hand-mirrors the manuscript door
// keys and the functional-element keys across the ESM/CJS wall — it prints from
// `introduction.<key>` / `conclusion.<key>` / `fe.<key>` string references it
// re-spells by memory, because CJS main.js cannot import the ESM field defs.
// This exact seam already missed once (the redemptive_note door failed to
// export after the Frame transplant — see the "(Was missed…)" comment in the
// builder). No test asserted field-def ↔ builder parity. This is that test.
//
// It does NOT change export output; it pins that every prose door the field defs
// declare is referenced by the builder, and that the naAllowed door's `_na`
// sidecar suppression is honored. main.js is not importable (Electron side
// effects), so its source is scanned — the established scan-aliases.ts pattern.

const MAIN_JS = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "electron", "main.js"),
  "utf8",
);

// The prose doors the builder prints from manuscript[section][key].
type ProseDoor = { section: string; key: string; naAllowed: boolean };
const PROSE_DOORS: ProseDoor[] = SERMON_MANUSCRIPT_FIELDS.flatMap((field: any) =>
  (field.questions || [])
    .filter((q: any) => q.kind === "manuscript-prose")
    .map((q: any) => ({ section: q.section, key: q.key, naAllowed: q.naAllowed === true })),
);

describe("Word export references every manuscript prose door the field defs declare", () => {
  it("has at least the expected prose doors (guards against an empty scan)", () => {
    // Sanity floor — if the field-def shape changes so this collects nothing,
    // the parity assertions below would vacuously pass; this prevents that.
    const keys = PROSE_DOORS.map((d) => `${d.section}.${d.key}`).sort();
    expect(keys).toEqual([
      "conclusion.response",
      "conclusion.summation",
      "introduction.expectation",
      "introduction.opener",
      "introduction.redemptive_note",
      "introduction.scripture_reading",
    ]);
  });

  it("the docx builder prints every declared prose door", () => {
    for (const door of PROSE_DOORS) {
      expect(
        MAIN_JS.includes(`${door.section}.${door.key}`),
        `Word export builder (electron/main.js) never references ${door.section}.${door.key} — ` +
          `a door declared in sermonManuscriptFields.js would silently not print.`,
      ).toBe(true);
    }
  });

  it("honors the _na sidecar suppression for every naAllowed door", () => {
    const naDoors = PROSE_DOORS.filter((d) => d.naAllowed);
    expect(naDoors.length, "expected at least one naAllowed prose door (redemptive_note)").toBeGreaterThan(0);
    for (const door of naDoors) {
      expect(
        MAIN_JS.includes(`${door.key}_na`),
        `Word export builder never checks ${door.key}_na — a door the pastor marked ` +
          `not-applicable would print anyway (the surface keeps the struck-through text).`,
      ).toBe(true);
    }
  });
});

describe("Word export references the single-source functional-element keys", () => {
  it("the builder prints fe.<key> for every FUNCTIONAL_ELEMENT_KEYS entry", () => {
    expect(FUNCTIONAL_ELEMENT_KEYS).toEqual(["scripture", "explanation", "application", "illustration"]);
    for (const key of FUNCTIONAL_ELEMENT_KEYS) {
      expect(
        MAIN_JS.includes(`fe.${key}`),
        `Word export builder never references fe.${key} — the functional-element key list ` +
          `in src/utils.js (FUNCTIONAL_ELEMENT_KEYS) drifted from the builder's hand-spelled keys.`,
      ).toBe(true);
    }
  });
});
