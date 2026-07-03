import { useMemo } from "react";
import {
  deriveQuestionStatesFromSermon,
  deriveStudyOutcomesFromSermon,
  deriveStudyUnfinishedFromSermon,
  deriveSermonCompleteness,
} from "./sermonState";

// useWorkspaceCompletion — the sermon workspace's completion / read-only
// derivations, extracted from SermonWorkspace.jsx verbatim (Track D slice 2,
// behaviour-preserving). Pure selectors over sermon state: no writes, no
// effects, no refs. The shell composes it and destructures the returned values
// under the same names, so no downstream render prop changes.
//
//   questionStates   — per-question weighting for the map / writing surface
//   studyOutcomes    — the Study named outcomes for the handoff + reference pane
//   studyUnfinished  — the handoff's "left behind" list
//   completeness     — the Finish screen's artifact completeness
//
// The three walk-spanning derivations parse every JSON column on every call
// (~205 JSON.parse calls at the populated fixture). useMemo keyed on [sermon]
// keeps them off the hot path for re-renders driven by non-sermon state
// (saveState transitions, map open/close, notebook open/close, passage popup
// toggle). Keystrokes still re-derive because handleUpdate writes a new sermon
// ref each keystroke. Each helper tolerates a null sermon (returns {}, [], []
// respectively), so a pre-load call is safe. Must be called unconditionally,
// above the shell's loading / not-found early returns, so the hook order stays
// stable across renders (rules-of-hooks).
export function useWorkspaceCompletion(sermon, finishOpen) {
  const questionStates = useMemo(() => deriveQuestionStatesFromSermon(sermon), [sermon]);
  const studyOutcomes = useMemo(() => deriveStudyOutcomesFromSermon(sermon), [sermon]);
  const studyUnfinished = useMemo(() => deriveStudyUnfinishedFromSermon(sermon), [sermon]);
  // Gated on finishOpen: this derivation parses ~6 JSON columns and the finish
  // screen is closed during normal typing — no reason to pay that on every
  // keystroke. SermonFinish only renders while finishOpen, so the null never
  // reaches it.
  const completeness = useMemo(
    () => (finishOpen ? deriveSermonCompleteness(sermon) : null),
    [finishOpen, sermon]
  );

  return { questionStates, studyOutcomes, studyUnfinished, completeness };
}
