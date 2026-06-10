// sermonOutlineFields.js — field definitions for Assembly/Outline (Merida Step 3:
// "Construct an Outline").
//
// DRAFT PEDAGOGY (2026-06-09, public-launch hardening). Outline/Equip/Manuscript
// never had a content-design walk like SFDI (Study) or SADI (Anchor/Frame). This
// content is drafted from the CCE/Merida source (memory: project_cce_merida_source,
// Step 3) and the surrounding workspace patterns so the stage is authorable, NOT
// invented from nothing — but it has not been preacher-walked. It is meant to be
// reviewed and refined. Treat the prompts/overview as a strong first draft.
//
// On-disk shape: unlike the Study/Anchor/Frame question-envelope columns, Outline
// writes the native `outline` JSON column the Word export already reads:
//
//   sermon.outline = [ { id: <uuid>, text: <string> }, ... ]
//
// The single field below carries one question of kind "outline-builder", which
// the writing surface renders as a reorderable point list (add/edit/remove/move).
// SermonWorkspace persists via serializeOutline(); functional_elements + the
// manuscript transitions key off these point ids.

export const SERMON_OUTLINE_FIELDS = [
  {
    // eslint-disable-next-line sermonforge/canonical-stage-name -- field/column key, not a stage status
    key: "outline",
    label: "Outline",
    hint: "Lay out the body's points — the movements your sermon walks through. Each reflects the text and carries the MPS forward.",
    heavyLifting: true,
    overview: {
      title: "Outline",
      paragraphs: [
        "Your Main Point Pair is set — the MPT (what the text meant) and the MPS (what it asks of your people today). The outline is the body that carries the MPS from open to close. It should reflect the structure of the text AND support the one thing you are preaching. Not four sermons — one sermon, in movements.",
        "Strong points share a few marks: each says something the others don't (mutually exclusive); each is in plain language your people actually use, not an exegetical heading; each is shaped as the text's claim on us, not just a topic (application-shaped); they build toward a climax (progressive); and they echo the MPS so the through-line never disappears.",
        "Three traps Merida names: a clever outline that draws attention to itself (forced alliteration — 'a little spice is fine, too much makes you sick'); an outline imposed on the text (three points where the text has two); and predictability — the same shape every week. Let the text set the number of points and the shape of the movement.",
      ],
    },
    questions: [
      {
        key: "points",
        kind: "outline-builder",
        prompt:
          "Lay out the points your sermon body will move through — one for each movement of the text. Reorder them as the shape settles; the final point should be the one everything has been climbing toward. Write each as a sentence your people would understand, not an exegetical label.",
      },
    ],
  },
];

SERMON_OUTLINE_FIELDS.forEach((field, i) => {
  if (field.overview) {
    field.overview.subtitle = `Field ${i + 1} of ${SERMON_OUTLINE_FIELDS.length} · Step 3 (Outline)`;
  }
});
