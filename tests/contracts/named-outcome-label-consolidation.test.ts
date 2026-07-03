import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { REGION_NAMED_OUTCOME } from "../../src/utils/walkOrder";
import {
  deriveSermonCompleteness,
  deriveStudyOutcomesFromSermon,
  STUDY_NAMED_OUTCOMES,
} from "../../src/utils/sermonState";

// Domain Model Normalization — Phase 2 (Vocabulary A label-literal consolidation).
//
// The per-sub-phase named-outcome labels are owned by REGION_NAMED_OUTCOME
// (src/utils/walkOrder.js). Before Phase 2 the Finish roll-up, the Study→Anchor
// handoff outcome cards, and the reference pane re-spelled seven of these labels
// as their own string literals. This file:
//   1. CHARACTERIZES the exact current labels (byte-identical proof — these
//      assertions are green before AND after the consolidation).
//   2. Asserts each Vocabulary-A label equals REGION_NAMED_OUTCOME[subPhase]
//      (the durable single-source guard).
//   3. Holds MPT/MPS (Vocabulary B) explicitly UNCHANGED — a distinct, finer
//      vocabulary deferred to a separate future decision.

// Static labels — deriveSermonCompleteness/deriveStudyOutcomes labels do not
// depend on sermon content, so an empty sermon exercises the label path.
const EMPTY = {} as any;

// Which Finish artifacts belong to Vocabulary A (own label === the sub-phase's
// named outcome) vs Vocabulary B (MPT/MPS, deferred).
const VOCAB_B_KEYS = new Set(["mpt", "mps"]);

describe("Finish roll-up labels (deriveSermonCompleteness)", () => {
  const artifacts = deriveSermonCompleteness(EMPTY).artifacts;

  it("renders the exact nine current labels, in order (byte-identical pin)", () => {
    expect(artifacts.map((a: any) => a.label)).toEqual([
      "Observation Set",
      "Interpretation Set",
      "Christ-Connection Statement",
      "Implications Synthesis",
      "Main Point of the Text",
      "Main Point of the Sermon",
      "Sermon Outline",
      "Sermon Body",
      "Manuscript",
    ]);
  });

  it("every Vocabulary-A artifact label equals REGION_NAMED_OUTCOME for its sub-phase", () => {
    const vocabA = artifacts.filter((a: any) => !VOCAB_B_KEYS.has(a.key));
    expect(vocabA.length).toBe(7);
    for (const a of vocabA) {
      expect(REGION_NAMED_OUTCOME[a.jump.subPhase], `artifact '${a.key}' label drifted from the owner`)
        .toBe(a.label);
    }
  });

  it("MPT/MPS labels stay the deferred Vocabulary-B strings (unchanged)", () => {
    const byKey = Object.fromEntries(artifacts.map((a: any) => [a.key, a.label]));
    expect(byKey.mpt).toBe("Main Point of the Text");
    expect(byKey.mps).toBe("Main Point of the Sermon");
    // And they are deliberately NOT the Anchor named outcome.
    expect(byKey.mpt).not.toBe(REGION_NAMED_OUTCOME.Anchor);
    expect(byKey.mps).not.toBe(REGION_NAMED_OUTCOME.Anchor);
  });
});

describe("Study→Anchor handoff outcome labels (STUDY_NAMED_OUTCOMES)", () => {
  it("renders the exact four current labels (byte-identical pin)", () => {
    expect(deriveStudyOutcomesFromSermon(EMPTY).map((o: any) => o.label)).toEqual([
      "Observation Set",
      "Interpretation Set",
      "Christ-Connection Statement",
      "Implications Synthesis",
    ]);
  });

  it("every handoff outcome label equals REGION_NAMED_OUTCOME for its sub-phase", () => {
    for (const o of STUDY_NAMED_OUTCOMES) {
      expect(REGION_NAMED_OUTCOME[o.subPhase], `handoff outcome '${o.subPhase}' label drifted from the owner`)
        .toBe(o.label);
    }
  });
});

describe("Reference pane Sermon Body / Sermon Outline derive from the owner", () => {
  const REFPANE = fs.readFileSync(
    path.resolve(__dirname, "..", "..", "src", "components", "ReferencePane.jsx"),
    "utf8",
  );

  it("the owner holds the exact strings the reference pane renders", () => {
    expect(REGION_NAMED_OUTCOME.Body).toBe("Sermon Body");
    expect(REGION_NAMED_OUTCOME.Outline).toBe("Sermon Outline");
  });

  it("ReferencePane re-spells neither label (derives from REGION_NAMED_OUTCOME)", () => {
    // Fail-before / pass-after: red while the literals remain at HEAD, green once
    // Phase 2 points both sections at the owner.
    expect(REFPANE).not.toMatch(/label="Sermon Body"/);
    expect(REFPANE).not.toMatch(/label="Sermon Outline"/);
    expect(REFPANE, "ReferencePane no longer imports the named-outcome owner").toMatch(/REGION_NAMED_OUTCOME/);
  });
});
