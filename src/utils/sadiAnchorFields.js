// SADI Step 2 (MPT/MPS Forge) field definitions. Question prompts + overview
// body are lifted verbatim from
// `docs/PROPOSALS/sermon-anchor-definition-initiative.md` Field 1 + Field 2.
//
// MPS Q2 (gospel_check) is the only N/A-able question. The "satisfied another
// way" semantic is strict — the pastor must have run the moralism check
// upstream against the Christ-Connection Statement; N/A is not "skip."
//
// Flat-column sync: writes to `mpt.tighten` / `mps.tighten` are mirrored
// into the flat `sermon.mpt` / `sermon.mps` columns by
// SermonWorkspace.handleAnswerChange (wired 2026-06-09, commit d3da7e8 —
// replacing StudyTab.updateMPP, deleted in trail-deletion Phase E). The
// T19 N/A allowlist closed the last hazard (an N/A'd tighten can no
// longer blank the flat columns the Word export reads).
//
// Prompt copy de-fossiled 2026-06-10 (UX overhaul T18) under the ratified
// rule "no coordinates the screen doesn't show": the cross-field
// references now point at the reference pane, which renders the MPT and
// Christ-Connection Statement beside the MPS field — restoring the SADI
// side-by-side pedagogy the deleted SpotlightWorksheet carried.

export const MAIN_POINT_PAIR_FIELDS = [
  {
    key: "mpt",
    label: "MPT — Main Point of the Text",
    hint: "Past tense. Author-intended. Single sentence after tightening. The historical anchor MPS derives from.",
    heavyLifting: false,
    questions: [
      {
        key: "draft",
        prompt:
          "Drawing from your Implications Synthesis and the four named outcomes from Study, draft what this text was saying to its original audience. Past tense. Author-intended. As many sentences as you need to get the substance right — tightening is next.",
      },
      {
        key: "tighten",
        prompt:
          "Now tighten that draft to a single past-tense sentence. Compress without losing the substance. The MPT must be one sentence — long is fine if it holds together.",
      },
    ],
  },
  {
    key: "mps",
    label: "MPS — Main Point of the Sermon",
    hint: "Present/future tense. Derived from MPT. Gospel-empowered, not moralistic. Single sentence after tightening.",
    heavyLifting: true,
    overview: {
      title: "MPS",
      paragraphs: [
        "Your MPT is in the reference pane beside you — what the text meant, in past tense. MPS turns that into the present: what the text means for *us today*. Present or future tense.",
        "Three moves: translate the MPT into present/future tense aimed at your people; check it against the Christ-Connection Statement to make sure the call rests on what Christ has done, not what the listener has to muster; tighten to one sentence.",
        "The Christ-Connection Statement is your moralism guard. The gospel-check reads your draft alongside it — if the call slips into 'try harder' or 'be better,' you rewrite. The tighten folds your draft's substance and the gospel-check's gospel-power into one sentence.",
      ],
    },
    questions: [
      {
        key: "translate",
        prompt:
          "Your MPT is in the reference pane beside you. Take it from past tense to present or future. Aim it at your people. As many sentences as you need to get the substance right — gospel-check and tightening come next.",
      },
      {
        key: "gospel_check",
        prompt:
          "Your first draft is right above you. Your Christ-Connection Statement is in the reference pane beside you. Read them side by side. Does the call in your draft rest on what Christ has done, or has it slipped into 'try harder' or 'be better'? If it has, name the drift and rewrite until the gospel-power is visible.",
        // SADI: the only N/A-able MPS question — strict "satisfied another
        // way" semantic (the moralism check was run upstream against the
        // Christ-Connection Statement); N/A is not "skip."
        naAllowed: true,
      },
      {
        key: "tighten",
        prompt:
          "Fold your work into one present/future-tense sentence. The substance from your first draft, the gospel-power from your gospel-check — both stay. It doesn't need to be short — it needs to be *one sentence*. Long is fine if it holds together. This is your MPS.",
      },
    ],
  },
];

// Overview subtitles ("Field N of M · Step 2 (MPT/MPS Forge)") removed
// 2026-06-10 — internal SADI scaffolding vocabulary; the teaching layer
// renders the overview body only.
