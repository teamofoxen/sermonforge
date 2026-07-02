// sermonEquipFields.js — field definitions for Manuscript/Body (Merida Step 4:
// "Develop the Functional Elements"; the region moved from Assembly and was
// renamed Body in the OEM restructure, 2026-07-02 — the cells ARE the
// manuscript body).
//
// PREACHER-WALKED + RATIFIED (OEM walk, 2026-07-02; was DRAFT from 2026-06-09).
// Drafted from the CCE/Merida source (memory: project_cce_merida_source, Step 4),
// then walked and ratified in the same walk that moved the region into
// Manuscript as Body and ruled the Illustration gating. Rulings of record:
// docs/handoff/oem-walk-rulings-2026-07-01.md.
//
// On-disk shape: writes the native `functional_elements` JSON column the Word
// export already reads, keyed by outline-point id:
//
//   sermon.functional_elements = {
//     <outlinePointId>: { scripture, explanation, application, illustration },
//     ...
//   }
//
// The single field below carries one question of kind "functional-elements",
// which the writing surface renders by iterating the outline points (built in
// Assembly/Outline) and showing the four elements under each. If no outline
// points exist yet, the editor surfaces a door back to Outline. SermonWorkspace
// persists via serializeFunctionalElements().

export const SERMON_EQUIP_FIELDS = [
  {
    // The storage key stays "equip" (renaming keys breaks stored
    // functional_elements-era positions for nothing); the pastor-facing
    // label is "Body" — the region name since the OEM restructure.
    key: "equip",
    label: "Body",
    hint: "Give each outline point its substance — the Scripture it rests on, the explanation that makes it clear, the application that makes it land, the illustration that makes it stick.",
    overview: {
      title: "Body",
      paragraphs: [
        "The outline is the skeleton; these cells are the muscle. Under each point you develop the same moves — Scripture, Explanation, Application, Illustration — written as the words you'll actually preach. What you write here becomes the body of your manuscript. Work point by point.",
        "Explanation makes the text clear: the key words, the context your people don't already have, the doctrine that surfaces. Application puts the truth into something to do — aimed at the heart, not just behavior. Weigh each application as you write it: necessary — the text demands it; probable — strongly suggested; possible — defensible, but never preached as a command. Illustration brings light and life; it serves explanation and application, never the star, never stretched to fit.",
        "Keep application gospel-shaped, not moralistic. The reframe runs: here is how we must live → but we simply cannot → ah, but there is One who did → now, through faith in him, we can begin. The two middle moves are what separate transformation from 'try harder.' Let your Christ-Connection Statement guard every point — name the idol your people functionally worship, then show Christ better; sin loses its grip not when it is scolded but when it is outshone. And where the text gives it, let a point say plainly what it offers the one who doesn't yet believe — without forcing it.",
      ],
    },
    questions: [
      {
        key: "elements",
        kind: "functional-elements",
        mapLabel: "The four elements under each point",
        prompt:
          "Build the four elements under each outline point. Not every point needs all four in equal measure — but every point needs its Scripture, its explanation, and its application; illustration serves them, and only where it fits naturally.",
        elements: [
          {
            key: "scripture",
            label: "Scripture",
            hint: "Which verse(s) of the text does this point rest on? Name where in the passage this lives.",
          },
          {
            key: "explanation",
            label: "Explanation",
            hint: "Make it clear. Key words, the context your people don't already know, the doctrine that surfaces. Make the text plain — don't impress with study.",
          },
          {
            key: "application",
            label: "Application",
            hint: "Make it land. What does this ask of us — in the heart, not just the behavior? Know how firmly the text holds it — necessary, probable, or possible — and never preach a possible as a command. Aim it at the room you named in Pastoral Context, prodigal and older brother both; name the idol this point confronts, and show Christ better. Keep it gospel-empowered ('One did'), not 'try harder' — and finish with a sentence that lands.",
          },
          {
            key: "illustration",
            label: "Illustration",
            hint: "Make it stick. A story, image, or example that serves the explanation and application — brief, vivid, fitting, fresh. Don't stretch it; if it doesn't fit naturally, it doesn't fit.",
            // Illustration "serves," never gates (OEM Equip ruling): the map's
            // "answered" state requires the other three, not this one. The
            // gating logic in sermonState reads this flag, so the teaching and
            // the math share one source. Absent = gates (the default).
            gating: false,
          },
        ],
      },
    ],
  },
];

// Overview subtitles removed 2026-06-10 — internal Step-number scaffolding;
// the teaching layer renders the overview body only.
