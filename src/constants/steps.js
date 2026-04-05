// Step and phase identifiers shared between StudyTab (emitter) and AIPanel (consumer).
// All step-name strings live here. Never hardcode these values in components.

export const STEPS = Object.freeze({
  EXEGESIS:            "step-1",
  MPT_MPS:             "step-2",
  OUTLINE:             "step-3",
  FUNCTIONAL_ELEMENTS: "step-4",
});

export const PHASES = Object.freeze({
  OBSERVE:           "phase-1",
  INTERPRET:         "phase-2",
  REDEMPTIVE_THREAD: "phase-3",
  IMPLICATIONS:      "phase-4",
});

// Ordered arrays for numeric-indexed access in StudyTab.
// PHASE_SEQUENCE[n - 1] === the step name for sub-phase n (1–4).
// STEP_SEQUENCE[n - 1]  === the step name for step n (1–4).
export const PHASE_SEQUENCE = Object.freeze([
  PHASES.OBSERVE,           // index 0 → sub-phase 1
  PHASES.INTERPRET,         // index 1 → sub-phase 2
  PHASES.REDEMPTIVE_THREAD, // index 2 → sub-phase 3
  PHASES.IMPLICATIONS,      // index 3 → sub-phase 4
]);

export const STEP_SEQUENCE = Object.freeze([
  STEPS.EXEGESIS,            // index 0 → step 1
  STEPS.MPT_MPS,             // index 1 → step 2
  STEPS.OUTLINE,             // index 2 → step 3
  STEPS.FUNCTIONAL_ELEMENTS, // index 3 → step 4
]);
