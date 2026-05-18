import { useMemo } from "react";
import SermonWorkspace from "./SermonWorkspace";

// SermonWorkspaceFixture — preview-only verification harness for D2c.
//
// Mounts the real SermonWorkspace component with mock sermon data injected
// via the `_fixtureSermon` prop seam. Three scenarios drive the populated-
// sermon verification the user specifically flagged:
//
//   ?workspace=empty       — null last-touched, empty thresholds_seen.
//                            Sermon-start landing fires.
//   ?workspace=populated   — Romans 8 seed, last_touched at CCS,
//                            sermon-start in thresholds_seen.
//                            Lands on CCS; map shows real
//                            answered/partial/unanswered distribution.
//   ?workspace=at-handoff  — populated, last_touched at Anchor MPT,
//                            sermon-start in thresholds_seen,
//                            study-to-anchor-handoff NOT seen.
//                            Handoff overlay fires.

const ROMANS_8_CANVAS = [
  { id: "tu-1", depth: 0, text: "There is therefore now no condemnation" },
  { id: "tu-1-mod", depth: 1, text: "for those who are in Christ Jesus." },
  { id: "tu-2", depth: 0, text: "For the law of the Spirit of life has set you free in Christ Jesus" },
  { id: "tu-2-mod", depth: 1, text: "from the law of sin and death." },
  { id: "tu-3", depth: 0, text: "For God has done what the law, weakened by the flesh, could not do." },
  { id: "tu-3-mod-a", depth: 1, text: "By sending his own Son in the likeness of sinful flesh and for sin," },
  { id: "tu-3-mod-b", depth: 1, text: "he condemned sin in the flesh," },
  { id: "tu-4", depth: 0, text: "in order that the righteous requirement of the law might be fulfilled in us," },
  { id: "tu-4-mod-a", depth: 1, text: "who walk not according to the flesh" },
  { id: "tu-4-mod-b", depth: 1, text: "but according to the Spirit." },
];

const ROMANS_8_THOUGHT_UNITS = [
  {
    _canvas_row_id: "tu-1",
    thought_unit_text: "There is therefore now no condemnation",
    meaning: "Paul declares the verdict for those in Christ — no condemnation, in present tense, addressed to those who have been justified.",
    christ_connection: "Christ is the one in whom there is no condemnation. The verdict isn't earned; it's announced because of who he is and what he has done.",
  },
  {
    _canvas_row_id: "tu-2",
    thought_unit_text: "For the law of the Spirit of life has set you free in Christ Jesus",
    meaning: "Two competing laws are named — the Spirit's law of life and the law of sin and death. The Spirit's law has prevailed in Christ Jesus.",
    christ_connection: "The Spirit's law of life is given through Christ. Freedom is located 'in Christ Jesus' — not in moral effort.",
  },
  {
    _canvas_row_id: "tu-3",
    thought_unit_text: "For God has done what the law, weakened by the flesh, could not do.",
    meaning: "The law could not deliver — the flesh weakened it. God did what the law could not: he condemned sin itself by sending Christ.",
  },
  {
    _canvas_row_id: "tu-4",
    thought_unit_text: "in order that the righteous requirement of the law might be fulfilled in us,",
    meaning: "The purpose: the law's righteous requirement is fulfilled IN us (not by us), as we walk according to the Spirit instead of the flesh.",
  },
];

function buildPopulatedSermon({ position, thresholdsSeen, title }) {
  return {
    id: "fixture-populated",
    title,
    passage: "Romans 8:1–4",
    date: "",
    preacher: "",
    stage: "in_progress",
    observations: JSON.stringify({
      context: {
        before: { value: "Romans 7 ends with 'Who will deliver me from this body of death?' — the 'therefore' of 8:1 lands directly on that despair.", na: false },
        after: { value: "Romans 8:5–11 develops the flesh/Spirit contrast; 8:12–17 turns to adoption.", na: false },
        impact: { value: "The bind between Romans 7 and 8:1 is the whole rhetorical force.", na: false },
        holy_spirit_intent: { value: "", na: false },
      },
      surface_questions: {
        where: { value: "No specific physical setting — Paul is writing doctrinally to the church in Rome.", na: false },
        when: { value: "", na: true },
        how: { value: "Paul moves from declaration (v.1) → grounding (v.2) → mechanism (v.3) → purpose (v.4).", na: false },
      },
      divisions: {
        canvas: { value: ROMANS_8_CANVAS, na: false },
        thought_units: { value: ROMANS_8_THOUGHT_UNITS, na: false },
      },
      characters: { primary: { value: "Believers in Christ Jesus; God; the Son; the Spirit; sin and the flesh.", na: false } },
      commands_declarations: { primary: { value: "Predominantly declarative — extended announcement.", na: false } },
      big_ideas: { primary: { value: "No condemnation. Two laws. The Son sent. Walking by Spirit.", na: false } },
      obvious_point: { primary: { value: "For those in Christ Jesus, the verdict is no condemnation — because God has done in Christ what the law could not do.", na: false } },
      applications: {
        examples: { value: "", na: false },
        commands: { value: "", na: false },
      },
    }),
    interpretation: JSON.stringify({
      deeper_context: { primary: { value: "Romans 5–8 forms a unit on the implications of justification; chapter 8 is the pinnacle.", na: false } },
      genre: { primary: { value: "Doctrinal epistle — tightly argued theological proposition.", na: false } },
      contrasts: { primary: { value: "Law of the Spirit of life ↔ law of sin and death. Flesh ↔ Spirit.", na: false } },
      interpretation_synthesis: {
        meaning_whole: { value: "The verdict for those in Christ Jesus is no condemnation — because God, by sending his own Son for sin, did what the law (weakened by the flesh) could not do, so the law's righteous requirement is fulfilled in us through the Spirit.", na: false },
      },
    }),
    redemptive_thread: JSON.stringify({
      this_passage_and_christ: {
        position: { value: "After Christ. Paul writes as a post-resurrection apostle.", na: false },
        direct_speech: { value: "Yes — 'in Christ Jesus' (vv. 1–2); 'his own Son' sent for sin (v. 3).", na: false },
      },
      passage_points_to_christ: {
        biblical_theme: { value: "Justification, the Spirit, sonship.", na: false },
        promise: { value: "The new-covenant promise of the Spirit (Jer 31; Ezek 36).", na: false },
        type: { value: "", na: true },
        predictive: { value: "", na: true },
      },
      need_and_character: {
        human_need: { value: "We need deliverance from condemnation we cannot escape under the law.", na: false },
        god_character: { value: "Just and the justifier (Rom 3:26) — provides the means by which the verdict is no-condemnation.", na: false },
      },
      christ_connection_statement: {
        statement: { value: "The whole passage points to Christ because the verdict (no condemnation) is located IN him, the act of God (sending his Son) is FOR sin in him, and the law's requirement is fulfilled by the Spirit in those joined to him. Christ is the hero.", na: false },
      },
    }),
    implications: JSON.stringify({
      theological_significance: {
        about_god: { value: "God is just and the justifier — he does not waive the law's requirement, he fulfils it in Christ.", na: false },
        about_christ: { value: "Christ bore the condemnation of sin and is the one in whom the no-condemnation verdict is announced.", na: false },
      },
      personal_implications: {
        follow: { value: "Walk by the Spirit, not by the flesh.", na: false },
      },
      // implications_synthesis.synthesis intentionally empty so the
      // populated handoff scenario can surface the missing required outcome.
      implications_synthesis: { synthesis: { value: "", na: false } },
    }),
    main_point_pair: JSON.stringify({
      mpt: {
        draft: { value: "Paul declared to the believers in Rome that for those in Christ Jesus there is now no condemnation, because God himself did in Christ what the law could not — condemning sin in the flesh of his own Son, so the law's righteous requirement is fulfilled in those who walk by the Spirit.", na: false },
        tighten: { value: "", na: false },
      },
    }),
    sermon_frame: "",
    notebook_study: "Quick note in margins — preacher's working scratchpad.",
    notebook_blueprint: "",
    notebook_manuscript: "",
    current_stage: "Study",
    current_sub_phase: "Observe",
    last_touched_position: serializePos(position),
    thresholds_seen: JSON.stringify(thresholdsSeen),
  };
}

function buildEmptySermon() {
  return {
    id: "fixture-empty",
    title: "Brand-new sermon",
    passage: "Romans 8:1–4",
    date: "",
    preacher: "",
    stage: "in_progress",
    observations: "",
    interpretation: "",
    redemptive_thread: "",
    implications: "",
    main_point_pair: "",
    sermon_frame: "",
    notebook_study: "",
    notebook_blueprint: "",
    notebook_manuscript: "",
    current_stage: "Study",
    current_sub_phase: "Observe",
    last_touched_position: null,
    thresholds_seen: "[]",
  };
}

function serializePos(p) {
  return `${p.stage}/${p.subPhase}/${p.fieldKey}`;
}

function readScenario() {
  if (typeof window === "undefined") return "empty";
  const v = new URLSearchParams(window.location.search).get("workspace");
  if (v === "populated" || v === "at-handoff") return v;
  return "empty";
}

export default function SermonWorkspaceFixture() {
  const scenario = readScenario();
  const fixtureSermon = useMemo(() => {
    if (scenario === "populated") {
      return buildPopulatedSermon({
        position: { stage: "Study", subPhase: "RedemptiveThread", fieldKey: "christ_connection_statement" },
        thresholdsSeen: ["sermon-start"],
        title: "Romans 8 — populated (lands on CCS)",
      });
    }
    if (scenario === "at-handoff") {
      return buildPopulatedSermon({
        position: { stage: "Assembly", subPhase: "Anchor", fieldKey: "mpt" },
        thresholdsSeen: ["sermon-start"], // sermon-start seen; handoff NOT seen
        title: "Romans 8 — at Study→Anchor handoff",
      });
    }
    return buildEmptySermon();
  }, [scenario]);

  return (
    <SermonWorkspace
      sermonId={fixtureSermon.id}
      onClose={() => { /* no dashboard in fixture mode */ }}
      onOpenSermon={() => { /* no series nav in fixture mode */ }}
      navHint={null}
      _fixtureSermon={fixtureSermon}
    />
  );
}
