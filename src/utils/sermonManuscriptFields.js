// sermonManuscriptFields.js — field definitions for the Manuscript stage
// (Merida Step 5 "Add an Introduction and a Conclusion" + "Writing the message").
//
// DRAFT PEDAGOGY (2026-06-09, public-launch hardening). Drafted from the
// CCE/Merida source (memory: project_cce_merida_source, Step 5) and surrounding
// patterns; not preacher-walked. Review + refine.
//
// Manuscript is the WRITING stage: the built body (Outline + Equip) and the
// Frame's decisions (Intro/Conclusion moves, authored in Assembly/Frame) are
// turned into the actual preaching prose. Intro and Conclusion are prepared
// last — they frame what is already built.
//
// On-disk shape: writes the native `manuscript` JSON column the Word export
// already reads (via parseManuscript):
//
//   sermon.manuscript = {
//     introduction: { opener, scripture_reading, expectation },
//     transitions:  { <outlinePointId>: <string>, conclusion: <string> },
//     conclusion:   { response },
//   }
//
// The Manuscript stage has no sub-phase; walkOrder tags these with
// subPhase "Manuscript". Prose questions carry a `section` ("introduction" |
// "conclusion") and write to manuscript[section][questionKey]. The transitions
// field is kind "manuscript-transitions" and writes manuscript.transitions,
// keyed by outline-point id (plus the into-conclusion transition).

export const SERMON_MANUSCRIPT_FIELDS = [
  {
    key: "introduction",
    label: "Introduction",
    hint: "Write the opening you'll actually preach — bring the listener from where they are into the text, the MPT, and the MPS.",
    heavyLifting: true,
    overview: {
      title: "Introduction",
      paragraphs: [
        "The body is built and the Frame's decisions are made. Now you write the words. The introduction is prepared near-last, on purpose: it frames how the listener walks into a body that already exists. Not a summary of the points — the listener's posture as they enter.",
        "A good introduction incites interest for believer and unbeliever alike, introduces the text with the MPT and MPS, carries a redemptive note (the promise that makes the call good news), and names what the sermon will ask. Open with variety — Merida's own move is to address both: 'If you are a believer, here is why we need this text…'; 'If you are not a Christian, this is a great week to be here because…'.",
        "You decided your hook, your bridge, and your expectations back in Frame. Here you write them out as the actual opening lines — the opener, how you'll introduce and read the text, and the expectation you set before the body begins.",
      ],
    },
    questions: [
      {
        key: "opener",
        kind: "manuscript-prose",
        section: "introduction",
        prompt:
          "Write your opener — the actual words. A story, an image, a question, a problem from lived experience: the invitation in. (This is the hook you chose in Frame, written out to preach.) Merida allows skipping the opener for a part-two sermon or a dense text — if so, go straight to the MPT/MPS below.",
      },
      {
        key: "scripture_reading",
        kind: "manuscript-prose",
        section: "introduction",
        prompt:
          "Write the bridge from the opener into the passage — how you introduce and read the text, and land the MPT and MPS so the listener knows what this sermon is about.",
      },
      {
        key: "expectation",
        kind: "manuscript-prose",
        section: "introduction",
        prompt:
          "Write the expectation — name what this sermon will ask the listener to see, believe, or do by the end, so the body doesn't blindside them. Set the purpose now.",
      },
    ],
  },
  {
    key: "transitions",
    label: "Transitions",
    hint: "Write the bridges between movements — the brief, inconspicuous sentences that carry the listener from one point to the next, and into the conclusion.",
    overview: {
      title: "Transitions",
      paragraphs: [
        "Transitions are the connective tissue of the body. The listener should never feel a seam — a good transition is inconspicuous, simple, varied, and brief. It gathers what the last point established and opens the door to the next.",
        "Write one for each point (the bridge into it from what came before) and one into the conclusion. Vary them — don't use the same construction every time. Reiterate the MPS lightly as you go, so the through-line stays audible across the whole body.",
      ],
    },
    questions: [
      {
        key: "transitions",
        kind: "manuscript-transitions",
        prompt:
          "Write the transition into each point, and the transition into the conclusion. Keep each brief — a sentence or two that carries the listener across without a visible seam.",
      },
    ],
  },
  {
    key: "conclusion",
    label: "Conclusion",
    hint: "Write the landing — gather the through-line and deliver the response you chose in Frame.",
    heavyLifting: true,
    overview: {
      title: "Conclusion",
      paragraphs: [
        "Intro framed how the listener walked in; the conclusion frames how they walk out. The body has done its work and the listener has heard the through-line. Now you land it — write the words.",
        "Two moves (Merida): summation, then response. Summate the whole arc into one landing in fresh words — not a point-by-point recap. Then deliver the response: tell the listener exactly what to do, drawn from the MPS, gospel-empowered from the Christ-Connection Statement so the call rests on what Christ has done, not on what they must muster.",
        "You chose your closing posture in Frame — silence, song, prayer, or charge. Write the conclusion so it carries the listener to that ending naturally.",
      ],
    },
    questions: [
      {
        key: "response",
        kind: "manuscript-prose",
        section: "conclusion",
        prompt:
          "Write the conclusion — the summation that gathers the sermon into one landing, then the response that calls the listener to act on the MPS, grounded in the gospel. Carry them to the closing posture you chose in Frame.",
      },
    ],
  },
];

SERMON_MANUSCRIPT_FIELDS.forEach((field, i) => {
  if (field.overview) {
    field.overview.subtitle = `Field ${i + 1} of ${SERMON_MANUSCRIPT_FIELDS.length} · Manuscript`;
  }
});
