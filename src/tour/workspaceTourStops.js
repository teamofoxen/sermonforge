// Workspace tour — 12-stop plain-prose guided tour through the Sermon
// Workspace.
//
// Locked content from docs/PROPOSALS/sermon-workspace-tour.md. Each stop
// is one short imperative sentence naming the move at that surface. The
// spotlight + title carry the naming work; the body says only what you do
// here.
//
// Each stop declares the UI state it expects via `prerequisites`. The
// orchestrator (TourContext + workspace observers) aligns SermonWorkspace
// and StudyTab state when the tour is active. Tab keys come from `STAGE` in
// `src/core/contracts.ts`.
//
// Plain-prose tour, surface by surface: workspace shell → study rail →
// Observe → Interpret → Redemptive Thread → Implications → Sermon Spine
// (MPT/MPS) → Outline → Functional Elements → Frame → Manuscript. Mock
// sermon: Romans 5:1-5 (`tour-romans-sermon-01`).

import { STAGE } from "../core/contracts";

const STUDY_BASE = { tab: STAGE.Study };


export const WORKSPACE_TOUR_STOPS = [
  {
    id: "workspace-shell",
    anchorId: "workspace-title",
    title: "The Sermon Workspace.",
    body: "This is where you build one sermon, start to finish.",
    prerequisites: STUDY_BASE,
  },
  {
    id: "study-rail",
    anchorId: "throughline-rail",
    title: "Your Study at a Glance.",
    body: "Watch your study come together here.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 1 },
  },
  {
    id: "observe",
    anchorId: "rail-phase-1",
    title: "Observe.",
    body: "Anchor your sermon in the text.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 1 },
  },
  {
    id: "interpret",
    anchorId: "rail-phase-2",
    title: "Interpret.",
    body: "Surface the meaning of the text.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 2 },
  },
  {
    id: "redemptive-thread",
    anchorId: "rail-phase-3",
    title: "Redemptive Thread.",
    body: "Show how the text points to Christ.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 3 },
  },
  {
    id: "implications",
    anchorId: "rail-phase-4",
    title: "Implications.",
    body: "Show what the text asks of us.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },
  {
    id: "sermon-spine",
    anchorId: "mpt-field",
    title: "Sermon Spine.",
    body: "Develop the spine of your outline.",
    prerequisites: { ...STUDY_BASE, studyStep: 2 },
  },
  {
    id: "outline-step",
    anchorId: "outline-builder",
    title: "Outline.",
    body: "Shape the sermon into points.",
    prerequisites: { ...STUDY_BASE, studyStep: 3 },
  },
  {
    id: "functional-elements",
    anchorId: "functional-elements",
    title: "Functional Elements.",
    body: "Support your points with explanations from the text, applications, and illustrations.",
    prerequisites: { ...STUDY_BASE, studyStep: 4 },
  },
  {
    id: "frame",
    anchorId: "frame-worksheet",
    title: "Frame.",
    body: "Write your intro and conclusion.",
    prerequisites: { tab: STAGE.Frame },
  },
  {
    id: "manuscript",
    anchorId: "stage-tab-Manuscript",
    title: "Manuscript.",
    body: "Write your sermon.",
    prerequisites: { tab: STAGE.Manuscript },
  },
];
