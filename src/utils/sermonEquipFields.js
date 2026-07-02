// sermonEquipFields.js — field definitions for Manuscript/Body (Merida Step 4:
// "Develop the Functional Elements"; the region moved from Assembly and was
// renamed Body in the OEM restructure, 2026-07-02 — the cells ARE the
// manuscript body).
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
    // The storage key stays "equip" (renaming keys breaks stored
    // functional_elements-era positions for nothing); the pastor-facing
    // label is "Body" — the region name since the OEM restructure.
    key: "equip",
    label: "Body",
    hint: "Give each outline point its substance — the Scripture it rests on, the explanation that makes it clear, the application that makes it land, the illustration that makes it stick.",
    overview: {
      title: "Body",
      paragraphs: [
        "The outline is the skeleton; the functional elements are the muscle. Under each point you develop the same moves — Scripture, Explanation, Application, Illustration. This is where the sermon body gets its weight, and where most of your preaching time is actually spent. Work point by point. Write each cell as the words you'll actually preach — what you write here becomes the body of your manuscript.",
        "Explanation makes the text clear: the key words, the context your people don't already have, the 'hot verses,' the doctrine that surfaces. Application puts the truth into something to do — aimed at the heart and the affections, not just behavior. Illustration brings light and life; it is a servant of explanation and application, never the star, and never stretched to fit.",
        "Weigh each application as you write it. Merida, after Robinson, grades them: necessary — the text demands it, and you can preach it 'thus saith the Lord'; probable — strongly suggested; possible — defensible, but never preached as a command. More heresy is preached in application than in exegesis; this gradient is the guard. And remember who is listening: where the text gives it, let a point say plainly what it offers the one who doesn't yet believe — but don't force it. Not every point carries that word, and stretching one is how applications go wrong.",
        "Keep application gospel-shaped, not moralistic. Merida's reframe, after Keller: here is how we must live → but we simply cannot → ah, but there is One who did → now, through faith in him, we can begin. The two middle moves — we cannot, and One did — are what separate transformation from 'try harder.' Let your Christ-Connection Statement guard every point against the moralism drift. And the 'we cannot' usually has a name: the idol — the thing your people functionally worship instead. Expose it, then show Christ better; sin loses its grip not when it is scolded but when it is outshone.",
      ],
    },
    questions: [
      {
        key: "elements",
        kind: "functional-elements",
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
          },
        ],
      },
    ],
  },
];

// Overview subtitles removed 2026-06-10 — internal Step-number scaffolding;
// the teaching layer renders the overview body only.
