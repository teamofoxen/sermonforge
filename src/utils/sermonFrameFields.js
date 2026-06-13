// sermonFrameFields.js — Field definitions for SADI Step 5 (Sermon Frame).
//
// SPRD C3 (Phase 3 Item 3, 2026-05-04). Step 5 elevation: pulls Intro and
// Conclusion out of the Manuscript stage's prior bundling and gives them
// their own workspace stage (STAGE.Frame, between Blueprint and Manuscript).
// The named outcome of Step 5 is the Sermon Frame — Intro frames the
// listener's *entry* into the body; Conclusion frames the *exit*.
//
// On-disk shape lives in the `sermon_frame` JSON column on sermons
// (v18 migration). The envelope shape mirrors the four Exegesis sub-phase
// columns:
//
//   sermon.sermon_frame = {
//     intro: {
//       hook:            { value, na },
//       bridge_to_text:  { value, na },
//       expectations:    { value, na },
//       redemptive_note: { value, na },
//     },
//     conclusion: {
//       summate:         { value, na },
//       land_call:       { value, na },
//       gospel_empower:  { value, na },
//       closing_posture: { value, na },
//     },
//   }
//
// Question prompts and overview body text come from SADI's per-field
// content-design walks (2026-05-04), captured in
// `docs/PROPOSALS/sermon-anchor-definition-initiative.md` Field 1 (Intro)
// and Field 2 (Conclusion). The pastor reads the same blockquoted prompts
// and overviews here; one canonical source between the working doc and
// the rendered workspace.
//
// Per-question N/A semantics (per SADI ratification):
//   - Intro Q1/Q2/Q3: not N/A-able (load-bearing).
//   - Intro Q4 (redemptive_note): N/A-able with strict "satisfied another
//     way" semantic — only when the hook itself was redemptive.
//   - Conclusion Q1/Q2/Q3/Q4: none N/A-able. Every component is structurally
//     necessary at the listener's exit; closing_posture in particular forces
//     an explicit pastoral choice (silence / song / prayer / charge).

export const SERMON_FRAME_FIELDS = [
  {
    key: "intro",
    label: "Intro",
    hint: "Frame the listener for the body — hook, bridge to text, expectations, and the redemptive note that turns the call from burden into invitation.",
    heavyLifting: true,
    overview: {
      title: "Intro",
      paragraphs: [
        "The body is built — outline, functional elements, all of it — and your MPT and MPS are in the reference pane on the 'Your work' tab. Intro is how the listener walks into the body. Not a summary, not a preview of the points — the listener's posture as they enter.",
        "Four moves: hook (grab attention from where the listener actually is); bridge (get from the hook into the text + MPT and MPS); expectations (name what the body will ask of them, so they're not blindsided); redemptive note (gospel-power that turns the call from burden into invitation).",
        "The redemptive note is the gospel anchor at the front door of the sermon. Expectations comes before it on purpose — name the call first, then ground it in what Christ has done. Same pattern MPS just walked.",
      ],
    },
    questions: [
      {
        key: "hook",
        prompt: "Open with something that grabs attention. A story, an image, a question, a problem from lived experience. The listener arrives distracted; the hook is your invitation in. What is your opener?",
      },
      {
        key: "bridge_to_text",
        prompt: "Bridge from the hook into the passage. Introduce the text. Land the MPT and MPS so the listener knows what this sermon is about.",
      },
      {
        key: "expectations",
        prompt: "Name what this sermon will ask of the listener. What will they be called to see, believe, or do by the end? Set the expectation now so the body doesn't blindside them.",
      },
      {
        key: "redemptive_note",
        prompt: "Name the gospel-shape that makes the expectation good news. What does Christ offer that turns the call from burden into invitation? This is the redemptive promise — the listener should hear, before the body begins, that the call is gospel-empowered.",
        // SADI: N/A-able with the strict "satisfied another way" semantic —
        // only when the hook itself was redemptive.
        naAllowed: true,
      },
    ],
  },
  {
    key: "conclusion",
    label: "Conclusion",
    hint: "Land the body's call — summate the through-line, land the call from MPS, gospel-empower it, and choose the closing posture.",
    heavyLifting: true,
    overview: {
      title: "Conclusion",
      paragraphs: [
        "Intro framed how the listener walked into the body. Conclusion frames how they walk out. The body has done its work; the listener has heard the through-line. Now you land it.",
        "Four moves: summate (gather the whole arc into one landing — *not* a point-by-point recap; the body already walked the points); land the call (drawn from MPS, made concrete); gospel-empower (drawn from CCS); choose the closing posture (silence, song, prayer, or charge — a required pastoral choice).",
        "Gospel-empower is the engine. Without it, the landed call slides into a moralistic push — even with the body's gospel work behind it. With it, the listener walks out knowing the call rests on what Christ has done.",
      ],
    },
    questions: [
      {
        key: "summate",
        prompt: "Summate the through-line of this sermon. Not a point-by-point recap. One unified landing — what the sermon has said, in the voice of where the listener now is. The body has done its work; this is the through-line in summary form.",
      },
      {
        key: "land_call",
        prompt: "Land the call. Drawing from the MPS — what is this sermon asking the listener to do, see, believe, or become? Make it concrete. Your intro set expectations; the conclusion delivers the call those expectations led toward.",
      },
      {
        key: "gospel_empower",
        prompt: "Gospel-empower the call. Drawing from the Christ-Connection Statement — name the gospel-shape that makes the call good news, not burden. The listener should leave knowing the call rests on what Christ has done, not on what they must muster.",
      },
      {
        key: "closing_posture",
        prompt: "Choose the closing posture. How does this sermon end physically and spiritually? Silence (let the gospel weight settle) / song (corporate response) / prayer (pastoral landing) / charge (formal commission or blessing). The choice is pastoral; name it so the manuscript and delivery are prepared.",
      },
    ],
  },
];

// Overview subtitles ("Field N of M · Step 5 …") removed 2026-06-10 —
// internal scaffolding vocabulary (Step numbers were retired with the
// workspace restructure); the teaching layer renders the overview body only.

// Per-question N/A semantics: only `intro.redemptive_note` may be marked N/A
// by the pastor (with the strict "satisfied another way" semantic per SADI).
// All other questions are not N/A-able. Enforced three deep (UX overhaul
// T19, 2026-06-10): the composite gate (`checkConclusionComposite` rejects
// N/A on any Conclusion question), the UI (PromptBlock renders the toggle
// only on `naAllowed: true` questions — the per-question flag above IS the
// allowlist), and the write path (SermonWorkspace.handleAnswerChange drops
// na:true for non-allowlisted questions).
