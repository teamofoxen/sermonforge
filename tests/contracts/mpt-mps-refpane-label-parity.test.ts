import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { MAIN_POINT_PAIR_FIELDS } from "../../src/utils/sadiAnchorFields";

// DMN Vocabulary B — ReferencePane MPT/MPS label seam (owner ruling 2026-07-03).
//
// The MPT/MPS *field-definition* labels (MAIN_POINT_PAIR_FIELDS[...].label) own the
// prefixed workspace label ("MPT — Main Point of the Text" / "MPS — Main Point of
// the Sermon") — the writing surface renders field.label. Before this seam the
// reference pane re-spelled them as byte-identical string literals. This seam
// points the reference pane at the field-def owner.
//
// This is the ONLY clean subtraction in Vocabulary B. Explicitly NOT touched:
// the bare Finish/export forms ("Main Point of the Text"), which are a distinct
// context-specific vocabulary; the Anchor named outcome ("Main Point Pair"); and
// any structured owner. Those stay deferred per the Vocabulary B decision.

const REFPANE = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "src", "components", "ReferencePane.jsx"),
  "utf8",
);

function fieldLabel(key: string): string {
  const f = MAIN_POINT_PAIR_FIELDS.find((x: any) => x.key === key);
  if (!f) throw new Error(`MAIN_POINT_PAIR_FIELDS has no '${key}' field`);
  return f.label;
}

describe("MPT/MPS field-definition labels (the prefixed workspace owner)", () => {
  it("pins the exact current strings (byte-identical, em-dash U+2014)", () => {
    expect(fieldLabel("mpt")).toBe("MPT — Main Point of the Text");
    expect(fieldLabel("mps")).toBe("MPS — Main Point of the Sermon");
  });
});

describe("Reference pane derives its MPT/MPS labels from the field def", () => {
  it("re-spells neither prefixed label (sources MAIN_POINT_PAIR_FIELDS)", () => {
    // Fail-before / pass-after: red while the reference pane carries the literals,
    // green once it derives from the field-def owner. Byte-identical: the pane now
    // renders the pinned field-def string, which equals the prior literal exactly.
    expect(REFPANE.includes(`label="${fieldLabel("mpt")}"`), "reference pane still re-spells the MPT label literal").toBe(false);
    expect(REFPANE.includes(`label="${fieldLabel("mps")}"`), "reference pane still re-spells the MPS label literal").toBe(false);
    expect(REFPANE.includes("MAIN_POINT_PAIR_FIELDS"), "reference pane no longer imports the field-def owner").toBe(true);
  });

  it("keeps MPT/MPS distinct from the Anchor named outcome (not consolidated into it)", () => {
    expect(fieldLabel("mpt")).not.toBe("Main Point Pair");
    expect(fieldLabel("mps")).not.toBe("Main Point Pair");
  });
});
