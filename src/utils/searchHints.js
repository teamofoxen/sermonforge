// Map a search-result's matched column to a navigation hint for the
// sermon workspace. The hint tells SermonWorkspace which stage to mount
// the trail at, which sub-phase within that stage (when applicable),
// and whether the notebook drawer should open on mount.
//
// Stage + sub-phase values are the canonical STAGE / SUB_PHASE constants
// from src/core/contracts.ts, imported here (not repeated as string
// literals) so a rename in contracts.ts propagates automatically rather
// than drifting silently — these values cross into a strict-equality match
// in walkOrder.firstFieldFor.

import { STAGE, SUB_PHASE } from "../core/contracts";

const HINT_MAP = {
  // Plain identifiers — no per-stage routing; let the DB decide.
  title:               null,
  passage:             null,
  series_title:        null,

  // Study sub-phases — each matches one of the four exegesis envelopes.
  observations:        { stage: STAGE.Study, subPhase: SUB_PHASE.Observe },
  interpretation:      { stage: STAGE.Study, subPhase: SUB_PHASE.Interpret },
  redemptive_thread:   { stage: STAGE.Study, subPhase: SUB_PHASE.RedemptiveThread },
  implications:        { stage: STAGE.Study, subPhase: SUB_PHASE.Implications },

  // Assembly sub-phases.
  main_point_pair:     { stage: STAGE.Assembly, subPhase: SUB_PHASE.Anchor },
  outline:             { stage: STAGE.Assembly, subPhase: SUB_PHASE.Outline },
  // v24 — functional_elements (the sermon body) replaced the struck
  // delivery_notes / timing_notes columns in the search index. Moved to
  // Manuscript/Body in the OEM restructure (2026-07-02).
  functional_elements: { stage: STAGE.Manuscript, subPhase: SUB_PHASE.Body },
  // Legacy column post-Frame-collapse: old frame answers still index;
  // matches land at the doors (the transplanted questions' home).
  sermon_frame:        { stage: STAGE.Manuscript, subPhase: SUB_PHASE.IntroTransitionsConclusion },

  // Manuscript prose — lands at the doors.
  manuscript:          { stage: STAGE.Manuscript, subPhase: SUB_PHASE.IntroTransitionsConclusion },

  // Notebooks — open the drawer on the matching stage's trail.
  notebook_study:      { stage: STAGE.Study,      openNotebook: true },
  notebook_blueprint:  { stage: STAGE.Assembly,   openNotebook: true },
  notebook_manuscript: { stage: STAGE.Manuscript, openNotebook: true },
};

export function hintFromMatchedColumn(matchedColumn) {
  if (!matchedColumn) return null;
  return HINT_MAP[matchedColumn] || null;
}
