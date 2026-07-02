import { describe, it, expect } from "vitest";
import {
  deriveSermonCompleteness,
  deriveQuestionStatesFromSermon,
  deriveStudyOutcomesFromSermon,
  deriveStudyUnfinishedFromSermon,
  STUDY_NAMED_OUTCOMES,
} from "./sermonState";
import { questionId } from "./walkOrder";

// Track B (B1) — completion-consistency invariant across the three surfaces
// that report "is this done":
//   • the map / writing-surface weighting  → deriveQuestionStatesFromSermon
//   • the Study → Anchor handoff           → deriveStudyOutcomesFromSermon
//                                             + deriveStudyUnfinishedFromSermon
//   • the Finish screen                    → deriveSermonCompleteness
//
// The goal is NOT to move any bar. It is to pin that all consumers tell the
// same truth ACCORDING TO THE CURRENT RULED BARS, so a future edit cannot
// silently re-open the surface-dependent contradiction the M2 ruling closed
// (2026-07-02: Finish must agree with the handoff / reference pane / map).
//
// Ruled asymmetry deliberately protected here (NOT a defect — canon §5, the
// studyAdvancement composite comments, and CORE-CHANGELOG's M2 entry): for the
// three sibling Study outcomes the handoff CARD reads "produced" on the
// whole-passage paragraph, while Finish's composite additionally requires every
// per-unit cell. The handoff's OWN "Left behind" list surfaces those empty
// cells on the same screen, so the surfaces never disagree that work remains.
// The test encodes that relationship rather than asserting naive equality.

// {value, na} envelope shape studyFields writes (mirrors sermonCompleteness.test.js).
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

// A thought unit carrying every per-unit cumulative cell (meaning / christ /
// implication) — used for the fully-complete sermon.
const FULL_UNIT = { text: "The LORD is my shepherd", meaning: "m", christ_connection: "c", implication: "i" };
// A thought unit with NO per-unit cells — used for the sibling-asymmetry case.
const BARE_UNIT = { text: "The LORD is my shepherd" };

function completeSermon() {
  return {
    title: "Psalm 23 — the shepherd",
    observations: env({
      divisions: {
        canvas: { value: [{ text: "Main sentence", depth: 0 }, { text: "modifier", depth: 1 }], na: false },
        thought_units: { value: [FULL_UNIT], na: false },
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
    outline: JSON.stringify([{ id: "p1", text: "Point one" }]),
    functional_elements: JSON.stringify({
      p1: { scripture: "v.1", explanation: "because", application: "so trust" },
    }),
    manuscript: JSON.stringify({
      introduction: { opener: "Once..." },
      transitions: {},
      conclusion: { response: "Come to the shepherd." },
    }),
  };
}

// Maps a Finish artifact key to the map question id(s) that render its status,
// and (for Study outcomes) the handoff outcome label. The pairing is what the
// consistency assertions run against.
const STUDY_OUTCOME_BY_KEY = {
  observation_set: "Observation Set",
  interpretation_set: "Interpretation Set",
  christ_connection: "Christ-Connection Statement",
  implications_synthesis: "Implications Synthesis",
};

function outcomeByLabel(sermon) {
  const out = {};
  for (const o of deriveStudyOutcomesFromSermon(sermon)) out[o.label] = o;
  return out;
}

describe("B1 — completion consistency across map / handoff / Finish", () => {
  it("a fully-built sermon reads complete on Finish, produced on the handoff, and answered on the map — no surface disagrees", () => {
    const sermon = completeSermon();

    const { artifacts, allComplete } = deriveSermonCompleteness(sermon);
    expect(allComplete).toBe(true);

    const outcomes = outcomeByLabel(sermon);
    const states = deriveQuestionStatesFromSermon(sermon);

    // Every Study named outcome: Finish complete ⇒ handoff shows its paragraph produced.
    for (const [key, label] of Object.entries(STUDY_OUTCOME_BY_KEY)) {
      const artifact = artifacts.find((a) => a.key === key);
      expect(artifact.complete).toBe(true);
      expect(outcomes[label].text.length).toBeGreaterThan(0);
    }

    // The map agrees: the load-bearing named-outcome questions read "answered"
    // (never unanswered) when Finish reports complete.
    for (const o of STUDY_NAMED_OUTCOMES) {
      const id = questionId({ stage: o.stage, subPhase: o.subPhase, fieldKey: o.fieldKey, questionKey: o.questionKey });
      expect(states[id].state).toBe("answered");
    }

    // The handoff's "Left behind" list is a BROADER surface than Finish — it
    // honestly lists every incomplete non-outcome Study question, including
    // optional exegesis (e.g. Pastoral Context) a load-bearing-complete sermon
    // may not have filled. That is not a contradiction with Finish. The
    // consistency invariant is narrower: the per-unit cells that Finish counts
    // as complete must NOT still show as left behind.
    const unfinishedKeys = new Set(
      deriveStudyUnfinishedFromSermon(sermon).map((q) => `${q.fieldKey}/${q.questionKey}`)
    );
    expect(unfinishedKeys.has("interpretation_synthesis/meaning_per_unit")).toBe(false);
    expect(unfinishedKeys.has("christ_connection_statement/christ_per_unit")).toBe(false);
    expect(unfinishedKeys.has("implications_synthesis/implication_per_unit")).toBe(false);
  });

  it("an empty sermon reads incomplete on Finish, empty on the handoff, and unanswered on the map — no surface disagrees", () => {
    const sermon = {};

    const { artifacts, allComplete } = deriveSermonCompleteness(sermon);
    expect(allComplete).toBe(false);
    expect(artifacts.every((a) => !a.complete)).toBe(true);

    const outcomes = outcomeByLabel(sermon);
    const states = deriveQuestionStatesFromSermon(sermon);

    for (const label of Object.values(STUDY_OUTCOME_BY_KEY)) {
      expect(outcomes[label].text).toBe("");
    }
    for (const o of STUDY_NAMED_OUTCOMES) {
      const id = questionId({ stage: o.stage, subPhase: o.subPhase, fieldKey: o.fieldKey, questionKey: o.questionKey });
      expect(states[id].state).toBe("unanswered");
    }
  });

  it("M2 alignment: Observation Set is complete on the Obvious Point alone across Finish, handoff, and map (flush-left canvas, no modifier)", () => {
    // The exact case the M2 ruling fixed — a Divisions-composite bar on Finish
    // would report the Observation Set missing here while the other three
    // surfaces call it done. Pin that they all agree it is DONE on the sentence.
    const sermon = {
      title: "Obvious point only",
      observations: env({
        divisions: {
          canvas: { value: [{ text: "Main sentence", depth: 0 }], na: false },
          thought_units: { value: [BARE_UNIT], na: false },
        },
        obvious_point: { primary: "The plain-sense point." },
      }),
    };

    const { artifacts } = deriveSermonCompleteness(sermon);
    expect(artifacts.find((a) => a.key === "observation_set").complete).toBe(true);

    const outcomes = outcomeByLabel(sermon);
    expect(outcomes["Observation Set"].text.length).toBeGreaterThan(0);

    const id = questionId({ stage: "Study", subPhase: "Observe", fieldKey: "obvious_point", questionKey: "primary" });
    expect(deriveQuestionStatesFromSermon(sermon)[id].state).toBe("answered");
  });

  it("ruled sibling asymmetry (protected, not a defect): paragraph written but per-unit cells empty — handoff shows produced, Finish shows incomplete, and the handoff's Left-behind list surfaces the gap so nothing silently claims done", () => {
    // Three sibling paragraphs written; the shared thought unit carries NO
    // per-unit cell. This is the documented handoff-card ("produced") vs
    // Finish-composite (needs every cell) relationship — canon §5 + M2.
    const sermon = {
      title: "Paragraphs without per-unit cells",
      observations: env({
        divisions: {
          canvas: { value: [{ text: "Main sentence", depth: 0 }], na: false },
          thought_units: { value: [BARE_UNIT], na: false },
        },
        obvious_point: { primary: "pt." },
      }),
      interpretation: env({ interpretation_synthesis: { meaning_whole: "Whole-passage meaning written." } }),
      redemptive_thread: env({ christ_connection_statement: { statement: "Christ-connection written." } }),
      implications: env({ implications_synthesis: { synthesis: "Implications written." } }),
    };

    const { artifacts } = deriveSermonCompleteness(sermon);
    const outcomes = outcomeByLabel(sermon);
    const unfinishedKeys = new Set(
      deriveStudyUnfinishedFromSermon(sermon).map((q) => `${q.fieldKey}/${q.questionKey}`)
    );

    for (const [key, label] of Object.entries(STUDY_OUTCOME_BY_KEY)) {
      if (key === "observation_set") continue; // lenient artifact, complete here
      // Handoff card: produced (paragraph present).
      expect(outcomes[label].text.length).toBeGreaterThan(0);
      // Finish: incomplete (composite needs every per-unit cell).
      expect(artifacts.find((a) => a.key === key).complete).toBe(false);
    }

    // The handoff does NOT hide the gap: the per-unit cumulative questions
    // appear in the Left-behind list, so handoff-taken-whole agrees with Finish.
    expect(unfinishedKeys.has("interpretation_synthesis/meaning_per_unit")).toBe(true);
    expect(unfinishedKeys.has("christ_connection_statement/christ_per_unit")).toBe(true);
    expect(unfinishedKeys.has("implications_synthesis/implication_per_unit")).toBe(true);
  });
});
