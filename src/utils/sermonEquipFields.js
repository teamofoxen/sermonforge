// sermonEquipFields.js — field definitions for Assembly/Equip (Merida Step 4:
// "Develop the Functional Elements").
//
// DRAFT PEDAGOGY (2026-06-09, public-launch hardening). Drafted from the
// CCE/Merida source (memory: project_cce_merida_source, Step 4) and surrounding
// patterns so the stage is authorable; not preacher-walked. Review + refine.
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
    key: "equip",
    label: "Equip",
    hint: "Give each outline point its substance — the Scripture it rests on, the explanation that makes it clear, the application that makes it land, the illustration that makes it stick.",
    heavyLifting: true,
    overview: {
      title: "Equip",
      paragraphs: [
        "The outline is the skeleton; the functional elements are the muscle. Under each point you develop the same moves — Scripture, Explanation, Application, Illustration. This is where the sermon body gets its weight, and where most of your preaching time is actually spent. Work point by point.",
        "Explanation makes the text clear: the key words, the context your people don't already have, the 'hot verses,' the doctrine that surfaces. Application puts the truth into something to do — aimed at the heart and the affections, not just behavior. Illustration brings light and life; it is a servant of explanation and application, never the star, and never stretched to fit.",
        "Keep application gospel-shaped, not moralistic. Merida's reframe, after Keller: here is how we must live → but we simply cannot → ah, but there is One who did → now, through faith in him, we can begin. The two middle moves — we cannot, and One did — are what separate transformation from 'try harder.' Let your Christ-Connection Statement guard every point against the moralism drift.",
      ],
    },
    questions: [
      {
        key: "elements",
        kind: "functional-elements",
        prompt:
          "Build the four elements under each outline point. Not every point needs all four in equal measure — but every point needs explanation and application; Scripture grounds it, and illustration serves it.",
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
            hint: "Make it land. What does this ask of us — in the heart, not just the behavior? Keep it gospel-empowered ('One did'), not 'try harder.' Use 'we'/'us'; finish with a sentence that lands.",
          },
          {
            key: "illustration",
            label: "Illustration",
            hint: "Make it stick. A story, image, or example that serves the explanation and application — brief, vivid, fitting, fresh. Don't stretch it; if it doesn't fit naturally, it doesn't fit.",
          },
        ],
      },
    ],
  },
];

// Overview subtitles removed 2026-06-10 — internal Step-number scaffolding;
// the teaching layer renders the overview body only.
