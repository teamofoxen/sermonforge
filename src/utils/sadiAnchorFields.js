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
//
// Saturation ruling (2026-06-10): the reference pane now defaults to the
// PASSAGE in every region, so the forge opens with the text in front of the
// pastor. The MPT draft prompt sends him back to re-read the passage before
// forging (the restored marinate beat); the four named outcomes + MPT/CCS
// live one flip away on the pane's "Your work" tab, which the gospel-check
// prompt directs him to. The Implications Synthesis is still the content
// substrate the Main Point draws from — marinate is the re-reading of the
// text, not a relabeling of the synthesis.
//
// Phase-2 Merida surgery (2026-06-15): MPS `translate` reworked to BEGIN from the
// fallen-condition-focus — Merida's redemptive-focus questions / Chapell's FCF, "why do
// my people need this" — not a bare tense-swap. The tense rule stays; the substance now
// leads. Live source for the walk's questions = `docs/WORKSPACE-CANON.md` §3.1 (the SADI
// working doc is now a frozen historical record).

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
          "With the passage open beside you, read it through once more — then draw from your Implications Synthesis and the four named outcomes to draft what this text was saying to its original audience. Past tense. Author-intended. As many sentences as you need to get the substance right — tightening is next.",
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
    hint: "Present/future tense, starting from why your people need this text. Derived from MPT. Gospel-empowered, not moralistic. Single sentence after tightening.",
    heavyLifting: true,
    overview: {
      title: "MPS",
      paragraphs: [
        "Your MPT is in the reference pane on the 'Your work' tab — what the text meant, in past tense. MPS turns that into the present: what the text means for *us today*. Present or future tense.",
        "Three moves: translate the MPT into the present — starting from why your people need this (the fallen condition, and the grace this text holds out for it), then aimed at that need in present or future tense; check it against the Christ-Connection Statement to make sure the call rests on what Christ has done, not what the listener has to muster; tighten to one sentence.",
        "The Christ-Connection Statement is your moralism guard. The gospel-check reads your draft alongside it — if the call slips into 'try harder' or 'be better,' you rewrite. The tighten folds your draft's substance and the gospel-check's gospel-power into one sentence.",
      ],
    },
    questions: [
      {
        key: "translate",
        prompt:
          "Your MPT is in the reference pane on the 'Your work' tab. Before you change the tense, name why your people need this text: what is the fallen condition — the human problem — this passage speaks to? What do your hearers share with its original audience? And what grace does this text hold out for that condition? Then turn the MPT from past into present or future, aimed at that need and that grace — so the call rests on what God gives, not just what we must do. As many sentences as you need to get the substance right — the gospel-check and tightening come next.",
      },
      {
        key: "gospel_check",
        prompt:
          "Your first draft is right above you. Flip the reference pane to 'Your work' and set your Christ-Connection Statement beside it. Read them side by side. Does the call in your draft rest on what Christ has done, or has it slipped into 'try harder' or 'be better'? If it has, name the drift and rewrite until the gospel-power is visible.",
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
