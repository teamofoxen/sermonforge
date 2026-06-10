// Map a search-result's matched column to a navigation hint for the
// sermon workspace. The hint tells SermonWorkspace which stage to mount
// the trail at, which sub-phase within that stage (when applicable),
// and whether the notebook drawer should open on mount.
//
// Stage + sub-phase values match the canonical STAGE / SUB_PHASE
// constants from src/core/contracts.ts. Consumers may import those if
// they want type safety; for the simple branching here we keep the
// string literals inline (one place to update if the vocabulary moves).

const HINT_MAP = {
  // Plain identifiers — no per-stage routing; let the DB decide.
  title:               null,
  passage:             null,
  series_title:        null,

  // Study sub-phases — each matches one of the four exegesis envelopes.
  observations:        { stage: "Study", subPhase: "Observe" },
  interpretation:      { stage: "Study", subPhase: "Interpret" },
  redemptive_thread:   { stage: "Study", subPhase: "RedemptiveThread" },
  implications:        { stage: "Study", subPhase: "Implications" },

  // Assembly sub-phases.
  main_point_pair:     { stage: "Assembly", subPhase: "Anchor" },
  outline:             { stage: "Assembly", subPhase: "Outline" },
  // v24 — functional_elements (the sermon body) replaced the struck
  // delivery_notes / timing_notes columns in the search index.
  functional_elements: { stage: "Assembly", subPhase: "Equip" },
  sermon_frame:        { stage: "Assembly", subPhase: "Frame" },

  // Manuscript surfaces — all land in the writing room.
  manuscript:          { stage: "Manuscript" },

  // Notebooks — open the drawer on the matching stage's trail.
  notebook_study:      { stage: "Study",     openNotebook: true },
  notebook_blueprint:  { stage: "Assembly",  openNotebook: true },
  notebook_manuscript: { stage: "Manuscript", openNotebook: true },
};

export function hintFromMatchedColumn(matchedColumn) {
  if (!matchedColumn) return null;
  return HINT_MAP[matchedColumn] || null;
}
