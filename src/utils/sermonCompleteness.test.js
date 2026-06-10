import { describe, it, expect } from "vitest";
import { deriveSermonCompleteness } from "./sermonState";

// Envelope helper — the {value, na} per-question shape studyFields writes.
const env = (obj) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(obj).map(([fieldKey, questions]) => [
        fieldKey,
        Object.fromEntries(
          Object.entries(questions).map(([qKey, value]) => [
            qKey,
            typeof value === "object" && value !== null && ("value" in value || "na" in value)
              ? value
              : { value, na: false },
          ])
        ),
      ])
    )
  );

const UNIT = { text: "The LORD is my shepherd", meaning: "m", implication: "i", christ_connection: "c" };

function completeSermon() {
  return {
    observations: env({
      divisions: {
        canvas: { value: [{ text: "Main sentence", depth: 0 }, { text: "modifier", depth: 1 }], na: false },
        thought_units: { value: [UNIT], na: false },
      },
      obvious_point: { primary: "Plain-sense point." },
    }),
    interpretation: env({ interpretation_synthesis: { meaning_whole: "Whole-passage meaning." } }),
    redemptive_thread: env({ christ_connection_statement: { statement: "Christ is the true shepherd." } }),
    implications: env({ implications_synthesis: { synthesis: "Trust the shepherd." } }),
    main_point_pair: env({
      mpt: { draft: "d", tighten: "God shepherded David." },
      mps: { translate: "t", gospel_check: "checked", tighten: "God shepherds you." },
    }),
    sermon_frame: env({
      intro: { hook: "h", bridge_to_text: "b", expectations: "e", redemptive_note: "r" },
      conclusion: { summate: "s", land_call: "l", gospel_empower: "g", closing_posture: "prayer" },
    }),
    outline: JSON.stringify([{ id: "p1", text: "Point one" }]),
    functional_elements: JSON.stringify({ p1: { explanation: "because" } }),
    manuscript: JSON.stringify({
      introduction: { opener: "Once..." },
      transitions: {},
      conclusion: { response: "Come to the shepherd." },
    }),
  };
}

describe("deriveSermonCompleteness — the workspace-wide done answer (Process #2)", () => {
  it("an empty sermon is incomplete on every artifact, with a reason and a jump for each", () => {
    const { artifacts, allComplete } = deriveSermonCompleteness({});
    expect(allComplete).toBe(false);
    expect(artifacts).toHaveLength(11);
    for (const a of artifacts) {
      expect(a.complete).toBe(false);
      expect(typeof a.reason).toBe("string");
      expect(a.reason.length).toBeGreaterThan(0);
      expect(a.jump.stage).toBeTruthy();
      expect(a.jump.fieldKey).toBeTruthy();
      // Pastor-facing copy: no wall-era phrasing, no internal coordinates.
      expect(a.reason).not.toMatch(/before advancing|Field \d/);
    }
  });

  it("a fully-built sermon reports allComplete", () => {
    const { artifacts, allComplete } = deriveSermonCompleteness(completeSermon());
    const incomplete = artifacts.filter((a) => !a.complete);
    expect(incomplete).toEqual([]);
    expect(allComplete).toBe(true);
  });

  it("body waits on the outline and says so", () => {
    const s = completeSermon();
    s.outline = "[]";
    const { artifacts } = deriveSermonCompleteness(s);
    const body = artifacts.find((a) => a.key === "body");
    expect(body.complete).toBe(false);
    expect(body.reason).toMatch(/outline first/i);
  });

  it("MPS gospel-check honors the explicit not-applicable carve-out", () => {
    const s = completeSermon();
    s.main_point_pair = env({
      mpt: { draft: "d", tighten: "t" },
      mps: { translate: "t", gospel_check: { value: "", na: true }, tighten: "t2" },
    });
    const { artifacts } = deriveSermonCompleteness(s);
    expect(artifacts.find((a) => a.key === "mps").complete).toBe(true);
  });

  it("manuscript needs the opening and the closing response (lenient ruling)", () => {
    const s = completeSermon();
    s.manuscript = JSON.stringify({ introduction: { opener: "Once..." }, conclusion: {} });
    const { artifacts } = deriveSermonCompleteness(s);
    expect(artifacts.find((a) => a.key === "manuscript").complete).toBe(false);
  });
});
