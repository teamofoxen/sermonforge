// Workspace tour — guided tour through the Sermon Trail.
//
// Re-authored for WTC sequel Item 6 (RW8 + DW10). Anchors target the
// trail surfaces directly: `workspace-title` rides the trail topbar;
// `trail-map-button` introduces the Trail Map (DW11); `trail-clearing`
// is the active Study clearing (camera tween + spotlight cover the
// per-phase variants); Assembly anchors live on the active Assembly
// sub-phase clearing; `manuscript-body` is the writing room.
//
// Stops within Study walk the four Exegesis sub-phases via
// `studySubPhase`; stops within Assembly walk Anchor / Outline / Equip /
// Frame via `assemblySubPhase`. Tab keys come from `STAGE` in
// `src/core/contracts.ts`. The orchestrator (TourContext + workspace
// observers) aligns SermonWorkspace + StudyTab + AssemblyTab state when
// the tour is active.

import { STAGE } from "../core/contracts";

const STUDY_BASE = { tab: STAGE.Study };
const ASSEMBLY_BASE = { tab: STAGE.Assembly };


export const WORKSPACE_TOUR_STOPS = [
  {
    id: "workspace-shell",
    anchorId: "workspace-title",
    title: "The Sermon Trail.",
    body: "This is where you walk one sermon, text to manuscript.",
    prerequisites: STUDY_BASE,
  },
  {
    id: "trail-map",
    anchorId: "trail-map-button",
    title: "The Trail Map.",
    body: "Open the map any time to see the whole journey at a glance.",
    prerequisites: { ...STUDY_BASE, studySubPhase: 1 },
  },
  {
    id: "observe",
    anchorId: "trail-clearing",
    title: "Observe.",
    body: "Anchor your sermon in the text.",
    prerequisites: { ...STUDY_BASE, studySubPhase: 1 },
  },
  {
    id: "interpret",
    anchorId: "trail-clearing",
    title: "Interpret.",
    body: "Surface the meaning of the text.",
    prerequisites: { ...STUDY_BASE, studySubPhase: 2 },
  },
  {
    id: "redemptive-thread",
    anchorId: "trail-clearing",
    title: "Redemptive Thread.",
    body: "Show how the text points to Christ.",
    prerequisites: { ...STUDY_BASE, studySubPhase: 3 },
  },
  {
    id: "implications",
    anchorId: "trail-clearing",
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
    anchorId: "manuscript-body",
    title: "The Writing Room.",
    body: "Expand the trail into prose; export when it's ready to preach.",
    prerequisites: { tab: STAGE.Manuscript },
  },
];
