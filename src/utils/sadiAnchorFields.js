// SADI Step 2 (MPT/MPS Forge) field definitions. Question prompts + overview
// body are lifted verbatim from
// `docs/PROPOSALS/sermon-anchor-definition-initiative.md` Field 1 + Field 2.
//
// MPS Q2 (gospel_check) is the only N/A-able question. The "satisfied another
// way" semantic is strict — the pastor must have run the moralism check
// upstream against the Christ-Connection Statement; N/A is not "skip."
//
// Flat-column sync (historical): pre-sweep, writes to `mpt.tighten` /
// `mps.tighten` were mirrored into the legacy `sermon.mpt` / `sermon.mps`
// flat columns by the renderer (`StudyTab.updateMPP`) so downstream
// consumers (AI prompts, context builder, exports) kept reading the flat
// columns without rewrites. `StudyTab.updateMPP` was deleted with StudyTab
// in Phase E of the trail deletion sweep; AI prompts + context builder
// were removed in ARI Phases 8-9 (so they are no longer consumers).
// Whether the writing surface's MPP edit path has wired a replacement
// flat-column sync for the remaining consumers (manuscript export, list
// surfaces) is a follow-up question surfaced by the post-sweep audit
// Chunk 4 (2026-05-18) but not resolved there — Chunk 4 was scoped to
// comment fixes only. The flat columns above remain in `SERMON_COLUMNS`.

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
        "Your MPT is right beside you — what the text meant, in past tense. MPS turns that into the present: what the text means for *us today*. Present or future tense.",
        "Three moves: translate the MPT into present/future tense aimed at your people; check it against the Christ-Connection Statement to make sure the call rests on what Christ has done, not what the listener has to muster; tighten to one sentence.",
        "The Christ-Connection Statement is your moralism guard. Q2 (Gospel-check) reads MPS alongside CCS — if the call slips into 'try harder' or 'be better,' you rewrite. Q3 (Tighten) folds Q1's substance and Q2's gospel-power into one sentence.",
      ],
    },
    questions: [
      {
        key: "translate",
        prompt:
          "Your MPT sits right above you. Take it from past tense to present or future. Aim it at your people. As many sentences as you need to get the substance right — gospel-check and tightening come next.",
      },
      {
        key: "gospel_check",
        prompt:
          "Your Q1 draft is right above you. The Christ-Connection Statement sits to the right. Read them side by side. Does the call in your draft rest on what Christ has done, or has it slipped into 'try harder' or 'be better'? If it has, name the drift and rewrite until the gospel-power is visible.",
        // SADI: the only N/A-able MPS question — strict "satisfied another
        // way" semantic (the moralism check was run upstream against the
        // Christ-Connection Statement); N/A is not "skip."
        naAllowed: true,
      },
      {
        key: "tighten",
        prompt:
          "Fold your work into one present/future-tense sentence. The substance from Q1, the gospel-power from Q2 — both stay. It doesn't need to be short — it needs to be *one sentence*. Long is fine if it holds together. This is your MPS.",
      },
    ],
  },
];

MAIN_POINT_PAIR_FIELDS.forEach((field, i) => {
  if (field.overview) {
    field.overview.subtitle = `Field ${i + 1} of ${MAIN_POINT_PAIR_FIELDS.length} · Step 2 (MPT/MPS Forge)`;
  }
});
