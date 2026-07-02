// sermonManuscriptFields.js — field definitions for the Manuscript doors
// (Merida Step 5 "Add an Introduction and a Conclusion" + "Writing the message").
//
// PREACHER-WALKED + RATIFIED (OEM walk, 2026-07-02; was DRAFT from 2026-06-09).
// The same walk ruled the Frame → Manuscript collapse: the Frame stage's seven
// moves are TRANSPLANTED here — each door prompt asks the decision AND the
// preached words together, at full SADI richness, written LAST against the
// finished body ("prepared near-last" preserved). Intro carries hook / bridge /
// expectations / redemptive note; Conclusion carries summation / response
// (response absorbs land-the-call + gospel-empower). Rulings of record:
// oem-walk-rulings-2026-07-01.md (agenda item 8 + Stage 3).
//
// On-disk shape: writes the native `manuscript` JSON column the Word export
// already reads (via parseManuscript):
//
//   sermon.manuscript = {
//     introduction: { opener, scripture_reading, expectation, redemptive_note },
//     transitions:  { <outlinePointId>: <string>, conclusion: <string> },
//     conclusion:   { summation, response },
//   }
//
// redemptive_note + summation are ADDITIVE keys (2026-07-02); older data
// without them parses unchanged. Legacy sermon_frame answers stay on disk
// (pastor-ruled: no one-time surfacing).
//
// These fields are the Manuscript doors sub-phase; walkOrder tags them
// `Manuscript/IntroTransitionsConclusion/<field>`. Prose questions carry a
// `section` ("introduction" | "conclusion") and write to
// manuscript[section][questionKey]; `redemptive_note`'s N/A rides a sidecar
// key `redemptive_note_na` (the manuscript column stores plain strings, not
// {value,na} envelopes). The transitions field is kind "manuscript-transitions"
// and writes manuscript.transitions, keyed by outline-point id (plus the
// into-conclusion transition).

export const SERMON_MANUSCRIPT_FIELDS = [
  {
    key: "introduction",
    label: "Introduction",
    hint: "Write the opening you'll actually preach — bring the listener from where they are into the text, the MPT, and the MPS.",
    overview: {
      title: "Introduction",
      paragraphs: [
        "The body is built. Now you write the doors. The introduction is prepared near-last, on purpose: it frames how the listener walks into a body that already exists. Not a summary of the points — the listener's posture as they enter.",
        "A good introduction incites interest for believer and unbeliever alike, introduces the text with the MPT and MPS, carries a redemptive note (the promise that makes the call good news), and names what the sermon will ask. Open with variety — Merida's own move is to address both: 'If you are a believer, here is why we need this text…'; 'If you are not a Christian, this is a great week to be here because…'.",
        "Four moves, chosen and written here as the words you'll preach: the hook (from where the listener actually is), the bridge (into the text, landing the MPT and MPS), the expectations (what the body will ask), and the redemptive note — the gospel anchor at the front door. Expectations comes before the note on purpose: name the call first, then ground it in what Christ has done. Same pattern your MPS walked.",
      ],
    },
    questions: [
      {
        key: "opener",
        kind: "manuscript-prose",
        section: "introduction",
        prompt:
          "Choose your hook and write it as the words you'll preach: a story, an image, a question, a problem from lived experience. The listener arrives distracted — this is your invitation in, from where they actually are. (Merida allows skipping the opener for a part-two sermon or a dense text — if so, go straight to the bridge below.)",
      },
      {
        key: "scripture_reading",
        kind: "manuscript-prose",
        section: "introduction",
        prompt:
          "Write the bridge from your opener into the passage — how you'll introduce and read the text, landing the MPT and MPS so the listener knows what this sermon is about.",
      },
      {
        key: "expectation",
        kind: "manuscript-prose",
        section: "introduction",
        prompt:
          "Name what this sermon will ask of the listener — what your body actually calls them to see, believe, or do — and write it as the expectation you set before the body begins, so it doesn't blindside them.",
      },
      {
        key: "redemptive_note",
        kind: "manuscript-prose",
        section: "introduction",
        prompt:
          "Before the body begins, let them hear why the ask is good news: what does Christ offer that turns the call from burden into invitation? Write the redemptive note as you'll say it — the gospel anchor at the front door.",
        // SADI semantics carried through the Frame transplant: N/A-able with
        // the strict "satisfied another way" meaning — only when the hook
        // itself was redemptive. The write-path/composite allowlist plumbing
        // moves from sermon_frame intro.redemptive_note to this key in the
        // structural sweep.
        naAllowed: true,
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
    hint: "Write the landing — the summation that gathers the through-line, and the response that calls the listener to act on it.",
    overview: {
      title: "Conclusion",
      paragraphs: [
        "Intro framed how the listener walked in; the conclusion frames how they walk out. The body has done its work and the listener has heard the through-line. Now you land it — write the words.",
        "Two moves (Merida): summation, then response. Summate the whole arc into one landing in fresh words — not a point-by-point recap. Then deliver the response: tell the listener exactly what to do, drawn from the MPS, gospel-empowered from the Christ-Connection Statement so the call rests on what Christ has done, not on what they must muster.",
        "Gospel-empower is the engine. Without it, the landed call slides into a moralistic push — even with the body's gospel work behind it. With it, the listener walks out knowing the call rests on what Christ has done.",
        "Land the ending with intention — write the conclusion's final beat so it carries the listener out cleanly, the way the sermon has shaped them.",
      ],
    },
    questions: [
      {
        key: "summation",
        kind: "manuscript-prose",
        section: "conclusion",
        prompt:
          "Write the summation — gather what your points have built into one landing, in fresh words. Not a recap: the body already walked the points. This is the through-line, spoken from where the listener now stands.",
      },
      {
        key: "response",
        kind: "manuscript-prose",
        section: "conclusion",
        prompt:
          "Write the response — tell the listener exactly what to do, drawn from the MPS and made concrete for the room you named. Gospel-empower it from your Christ-Connection Statement, so the call rests on what Christ has done, not on what they must muster.",
      },
    ],
  },
];

// Overview subtitles removed 2026-06-10 — internal scaffolding; the
// teaching layer renders the overview body only.
