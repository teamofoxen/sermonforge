import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";
import * as studyAdvancement from "./studyAdvancement";
import { deriveSermonCompleteness } from "./sermonState";
import { WALK_ORDER, REGION_DISPLAY, arcSummary } from "./walkOrder";
import { STUDY_NAMED_OUTCOMES } from "./sermonState";

// Track B (B3) — retired-completeness-artifact + retired-vocabulary tripwire.
//
// After the M2 ruling + Track A cleanup, checkField3Composite (and the OEM-
// retired checkIntroComposite / checkConclusionComposite) are GONE from
// studyAdvancement.js. Re-wiring any of them into the roll-up would re-open
// the false-completion asymmetry M2 closed. This test makes that regression
// loud: the retired composites must not re-appear as exports, sermonState must
// not reference them, and the roll-up must stay at exactly the nine artifacts
// backed by the five live composites + four lenient checks.

const here = path.dirname(fileURLToPath(import.meta.url));
const STATE_SRC = fs.readFileSync(path.join(here, "sermonState.js"), "utf8");

const RETIRED_COMPOSITES = ["checkField3Composite", "checkIntroComposite", "checkConclusionComposite"];
const LIVE_COMPOSITES = [
  "checkField8Composite",
  "checkField5Composite",
  "checkPhase4Field4Composite",
  "checkMPTComposite",
  "checkMPSComposite",
];

describe("B3 — retired completeness composites stay retired", () => {
  it("studyAdvancement.js no longer exports any retired composite", () => {
    for (const name of RETIRED_COMPOSITES) {
      expect(studyAdvancement[name], `${name} must not be re-exported`).toBeUndefined();
    }
  });

  it("studyAdvancement.js still exports the five live composites", () => {
    for (const name of LIVE_COMPOSITES) {
      expect(typeof studyAdvancement[name], `${name} must remain a live composite`).toBe("function");
    }
  });

  it("sermonState.js references no retired composite by name (import or call)", () => {
    for (const name of RETIRED_COMPOSITES) {
      expect(STATE_SRC.includes(name), `sermonState.js must not reference ${name}`).toBe(false);
    }
  });

  it("the completeness roll-up is exactly the nine ruled artifacts, in walk order", () => {
    const { artifacts } = deriveSermonCompleteness({});
    expect(artifacts.map((a) => a.key)).toEqual([
      "observation_set",
      "interpretation_set",
      "christ_connection",
      "implications_synthesis",
      "mpt",
      "mps",
      // eslint-disable-next-line sermonforge/canonical-stage-name -- artifact key, not a stage status
      "outline",
      "body",
      "manuscript",
    ]);
  });
});

describe("B3 — retired walk vocabulary (Equip / Frame / Blueprint) stays out of pastor-facing labels", () => {
  const RETIRED = /\b(Equip|Frame|Blueprint)\b/i;

  it("no region display name carries a retired term", () => {
    for (const label of Object.values(REGION_DISPLAY)) {
      expect(RETIRED.test(label), `region label "${label}"`).toBe(false);
    }
  });

  it("no field label carries a retired term", () => {
    for (const field of WALK_ORDER) {
      expect(RETIRED.test(String(field.label ?? "")), `field label "${field.label}"`).toBe(false);
    }
  });

  it("no named-outcome label carries a retired term", () => {
    for (const o of STUDY_NAMED_OUTCOMES) {
      expect(RETIRED.test(o.label), `outcome "${o.label}"`).toBe(false);
    }
    for (const stage of arcSummary()) {
      for (const region of stage.regions) {
        if (region.namedOutcome) {
          expect(RETIRED.test(region.namedOutcome), `namedOutcome "${region.namedOutcome}"`).toBe(false);
        }
      }
    }
  });
});
