// Workspace tour — guided tour through the Sermon Workspace.
//
// Stops within Study walk the four Exegesis sub-phases via studySubPhase;
// stops within Assembly walk Anchor / Outline / Equip / Frame via
// assemblySubPhase. Tab keys come from `STAGE` in `src/core/contracts.ts`.
// The orchestrator (TourContext + workspace observers) aligns
// SermonWorkspace + StudyTab + AssemblyTab state when the tour is active.

import { STAGE } from "../core/contracts";

const STUDY_BASE = { tab: STAGE.Study };
const ASSEMBLY_BASE = { tab: STAGE.Assembly };


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
    prerequisites: { ...STUDY_BASE, studySubPhase: 1 },
  },
  {
    id: "observe",
    anchorId: "rail-phase-1",
    title: "Observe.",
    body: "Anchor your sermon in the text.",
    prerequisites: { ...STUDY_BASE, studySubPhase: 1 },
  },
  {
    id: "interpret",
    anchorId: "rail-phase-2",
    title: "Interpret.",
    body: "Surface the meaning of the text.",
    prerequisites: { ...STUDY_BASE, studySubPhase: 2 },
  },
  {
    id: "redemptive-thread",
    anchorId: "rail-phase-3",
    title: "Redemptive Thread.",
    body: "Show how the text points to Christ.",
    prerequisites: { ...STUDY_BASE, studySubPhase: 3 },
  },
  {
    id: "implications",
    anchorId: "rail-phase-4",
    title: "Implications.",
    body: "Show what the text asks of us.",
    prerequisites: { ...STUDY_BASE, studySubPhase: 4 },
  },
  {
    id: "anchor",
    anchorId: "mpt-field",
    title: "Anchor.",
    body: "Forge the Main Point Pair — what the text said, then what it says to your people.",
    prerequisites: { ...ASSEMBLY_BASE, assemblySubPhase: 1 },
  },
  {
    id: "outline-step",
    anchorId: "outline-builder",
    title: "Outline.",
    body: "Shape the sermon into points that serve your Main Point Pair.",
    prerequisites: { ...ASSEMBLY_BASE, assemblySubPhase: 2 },
  },
  {
    id: "equip",
    anchorId: "functional-elements",
    title: "Equip.",
    body: "Equip each outline point with Scripture, Explanation, Application, Illustration.",
    prerequisites: { ...ASSEMBLY_BASE, assemblySubPhase: 3 },
  },
  {
    id: "frame",
    anchorId: "frame-worksheet",
    title: "Frame.",
    body: "Bracket the body — write your intro and conclusion.",
    prerequisites: { ...ASSEMBLY_BASE, assemblySubPhase: 4 },
  },
  {
    id: "manuscript",
    anchorId: "stage-tab-Manuscript",
    title: "Manuscript.",
    body: "Write your sermon.",
    prerequisites: { tab: STAGE.Manuscript },
  },
];
