// Workspace tour — 35-stop guided tour through the Sermon Workspace.
//
// Locked content from docs/PROPOSALS/sermon-workspace-tour.md. Body strings are
// rendered as markdown by TourOverlay — italics (*…*) preserve the spec's
// intentional emphasis on field names and chip labels.
//
// Each stop declares the UI state it expects via `prerequisites`. The
// orchestrator (TourContext + workspace observers) aligns SermonWorkspace and
// StudyTab state when the tour is active. Tab keys come from `STAGE` in
// `src/core/contracts.ts` (post-vocabulary-completion canonical names).

import { STAGE } from "../core/contracts";

const STUDY_BASE = { tab: STAGE.Study, drawerOpen: false };

export const WORKSPACE_TOUR_STOPS = [
  // ── Stops 1–5: workspace + AI overview ────────────────────────────────────
  // SPRD B4.2 — the previous Pastoral Context tour stops (always-in-the-room,
  // pastoral-intelligence, cultural-moment, the-room, sermons-work) were
  // removed when the PC card was lifted out of SermonWorkspace into Phase 4
  // Field 3. The PC arc is now part of the Study walkthrough; tour rewrite
  // is SPRD structural backlog (Component 3 · Throughline visualization).
  {
    id: "workspace-intro",
    anchorId: "workspace-title",
    title: "The Sermon Workspace.",
    body: "Where you go deep on one sermon. If a series is already in place, its big idea and context come with you here automatically. If not, the workspace stands on its own — start where you are.",
    prerequisites: STUDY_BASE,
  },
  {
    id: "ai-philosophy",
    // No anchor — ambient stop. The vignette dims everything.
    anchorId: null,
    title: "SermonForge doesn't write your sermons. It forces them.",
    body: "Through a method. Against the text. Into the pastoral moment. The AI works inside those constraints — it challenges, audits, synthesizes. It doesn't replace the discipline; it stress-tests it. Every response is shaped by what you've actually done.",
    prerequisites: STUDY_BASE,
  },
  {
    id: "the-assistant",
    anchorId: "ai-panel-header",
    title: "The Assistant.",
    body: "Chat anytime, at any step. The AI's posture shifts with where you are — collaborator during exegesis, challenger at the main points, structural reviewer at the outline, auditor at the manuscript. You're not talking to one assistant; you're talking to the right one for the moment.",
    prerequisites: { tab: STAGE.Study, drawerOpen: true },
  },
  {
    id: "what-it-knows",
    anchorId: "ai-panel",
    title: "What it already knows.",
    body: "Before any response, the AI has the passage, your main points, your full study, your outline, the series big idea and section, the pastoral situation, and supporting material. Seven layers of context, assembled fresh every time. You never have to re-explain.",
    prerequisites: { tab: STAGE.Study, drawerOpen: true },
  },
  {
    id: "tuned-to-you",
    anchorId: "ai-panel",
    title: "Tuned to you.",
    body: "Over time, the AI surfaces your own rhetorical patterns — how you build outlines, what your MPTs tend to look like, the way you turn applications. Adaptive guidance, tuned to you specifically. Not a model being trained; your past work, surfaced when relevant.",
    prerequisites: { tab: STAGE.Study, drawerOpen: true },
  },

  // ── Stops 11–25: Study tab — Step 1 (Exegesis, four phases) ────────────────
  {
    id: "study-tab",
    anchorId: "stage-tab-study",
    title: "Study.",
    body: "Four steps from text to sermon. Exegesis first, then the main points, then the outline, then the elements that make each point land.",
    prerequisites: STUDY_BASE,
  },
  {
    id: "phase-1-observe",
    anchorId: "phase-1-worksheet",
    title: "Phase 1 — Observe.",
    body: "Before you interpret, you observe. Nine questions take you through the passage systematically. Resist the urge to jump to meaning.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 1 },
  },
  {
    id: "phase-1-surface",
    anchorId: "phase-1-worksheet",
    title: "What the text says.",
    body: "Context. Divisions. Commands. Statements. The surface of the passage — what surrounds it, where it breaks into units, what's commanded and what's declared. Get these right and the rest follows.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 1 },
  },
  {
    id: "phase-1-substance",
    anchorId: "phase-1-worksheet",
    title: "What the text shows.",
    body: "Characters. Big Ideas. The Obvious Point. Basic Outline. Possible Implications. Who's in the passage, what themes surface, and the question most pastors skip — is there an obvious point? State it plainly. Don't talk yourself out of it.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 1 },
  },
  {
    id: "phase-2-interpret",
    anchorId: "phase-2-worksheet",
    title: "Phase 2 — Interpret.",
    body: "Beneath the surface. Nine questions push from what the text says to what it means. This is where most of the work happens.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 2 },
  },
  {
    id: "phase-2-shaping",
    anchorId: "phase-2-worksheet",
    title: "How meaning takes shape.",
    body: "Context Impact. Recurring Ideas. Characters. Contrasts. Diagram. How surrounding context shapes meaning here. Words and ideas that recur — repetition in Scripture is rarely accidental. What characters are doing and why. The oppositions the author is setting up. The relationships between ideas, sketched out.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 2 },
  },
  {
    id: "phase-2-voices",
    anchorId: "phase-2-worksheet",
    title: "Outside voices and your own.",
    body: "Cross-References. Commentary. Summarize the Parts. Summarize the Whole. What the rest of Scripture says. What the commentaries say. Then verse by verse in your own words, and the whole passage in your own words. If you can't do the last two, interpretation isn't finished yet.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 2 },
  },
  {
    id: "phase-3-redemptive",
    anchorId: "phase-3-worksheet",
    title: "Phase 3 — Redemptive Thread.",
    body: "Every text points somewhere. Seven questions ask how this one points to Christ — directly or indirectly, by promise, by need, by the nature of the God who saves.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 3 },
  },
  {
    id: "seven-questions",
    anchorId: "phase-3-worksheet",
    title: "Seven ways to find Christ.",
    body: "*Speaks of Christ directly. Stands before, after, or transitional to him. Reveals a biblical theme that points to him. Shows a promise. Shows mankind's need for him. Reveals the God who provides redemption. How is Jesus the hero of this passage?* Answer what you can. Leave the rest.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 3 },
  },
  {
    id: "synthesize",
    anchorId: "redemptive-synthesize",
    title: "Synthesize.",
    body: "When you've answered, the AI reads all seven and writes a cohesive redemptive summary. It's a draft — edit it, rework it, replace it. The goal isn't a perfect summary; it's a clear thread to pull through the sermon.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 3 },
  },
  {
    id: "phase-4-implications",
    anchorId: "phase-4-worksheet",
    title: "Phase 4 — Implications.",
    body: "What does this text demand of the people in the room? Three categories follow — theological, personal, and what it means for someone who doesn't believe.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },
  {
    id: "theological-significance",
    anchorId: "implications-theological",
    title: "Theological Significance.",
    body: "What this passage teaches about God, about ourselves, about Christ. Timeless principles. Particular doctrines. What's true here that would be true anywhere?",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },
  {
    id: "personal-implications",
    anchorId: "implications-personal",
    title: "Personal Implications.",
    body: "Eight angles — examples to follow, commands to keep, errors to avoid, sins to forsake, gospel promises to claim, new thoughts about God, doctrines to explore, convictions to live by. Most sermons go thin at application; this is where you get ahead of that.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },
  {
    id: "unbeliever",
    anchorId: "implications-unbeliever",
    title: "Implications for Unbelievers.",
    body: "What does this text mean for someone who doesn't believe? Don't skip it — this is where the gospel meets the room from the outside in.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },
  {
    id: "compile",
    anchorId: "implications-compile",
    title: "Compile.",
    body: "Click Compile — the AI consolidates every implication into a master list. You'll prune it, but nothing will get lost.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },

  // ── Stops 26–30: Study tab — Steps 2, 3, 4 ─────────────────────────────────
  {
    id: "step-2-mpt-mps",
    anchorId: "study-step-pill-2",
    title: "Step 2 — MPT → MPS.",
    body: "The two most important sentences in the sermon — they anchor everything else. Get these right and the outline largely writes itself.",
    prerequisites: { ...STUDY_BASE, studyStep: 2 },
  },
  {
    id: "mpt",
    anchorId: "mpt-field",
    title: "Main Point of the Text.",
    body: "Past tense. What the author meant, in their context, for their original audience. Not yet about your congregation. Stay in the text.",
    prerequisites: { ...STUDY_BASE, studyStep: 2 },
  },
  {
    id: "mps",
    anchorId: "mps-field",
    title: "Main Point of the Sermon.",
    body: "Present tense. What this text means for your congregation today. The bridge from then to now. The MPS must grow from the MPT — not invent a new claim. The AI here is a challenger, not a collaborator. *Challenge My MPT* and *Check MPT→MPS Chain* are the chips you'll use most.",
    prerequisites: { ...STUDY_BASE, studyStep: 2 },
  },
  {
    id: "step-3-outline",
    anchorId: "outline-builder",
    title: "Step 3 — Outline.",
    body: "Structure should emerge from exegesis, not be imposed on it. Add and reorder points until the argument moves cleanly from your MPT to your MPS. *Review Outline* sends it to the AI for structural feedback — whether each point derives from the text, whether the progression actually moves, whether the structure serves the MPS.",
    prerequisites: { ...STUDY_BASE, studyStep: 3 },
  },
  {
    id: "step-4-functional-elements",
    anchorId: "functional-elements",
    title: "Step 4 — Functional Elements.",
    body: "For each outline point: Explanation, Application, Illustration. Every point needs all three to land. *Review E/A/I Balance* asks the AI to audit each point — whether the explanation is sufficient, whether the application is gospel-rooted, whether the illustration clarifies or distracts. Worth running before the manuscript.",
    prerequisites: { ...STUDY_BASE, studyStep: 4 },
  },

  // ── Stops 31–35: Manuscript tab + finish ───────────────────────────────────
  {
    id: "manuscript",
    anchorId: "stage-tab-manuscript",
    title: "Manuscript.",
    body: "Where the sermon becomes prose. Sections, transitions, full text. Three audit tools live here, each doing something different. Use them after the manuscript is drafted, not before.",
    prerequisites: { tab: STAGE.Manuscript, drawerOpen: false },
  },
  {
    id: "flow-coach",
    anchorId: "flow-coach-button",
    title: "Flow Coach.",
    body: "Walks you through every transition in the manuscript, one at a time. *Does this section land? Does the next one pick up cleanly? Is there a gap?* One step per response, so the feedback stays manageable. Use it when the sermon reads in pieces instead of moving.",
    prerequisites: { tab: STAGE.Manuscript, drawerOpen: false },
  },
  {
    id: "ear-check",
    anchorId: "ear-check-button",
    title: "Ear Check.",
    body: "Reads the manuscript for what will be heard, not just read. It scans for two things: *structural orphans* — passages that have drifted from the argument — and *speakability flags* — sentences that will lose the room when spoken aloud. Theological precision is fine; unintelligibility isn't.",
    prerequisites: { tab: STAGE.Manuscript, drawerOpen: false },
  },
  {
    id: "tune-up",
    anchorId: "tune-up-button",
    title: "Tune-Up.",
    body: "A full audit in three phases. *Snapshot* describes what the sermon is actually doing. *Alignment Map* grades how well it serves the MPT and MPS. *Patch Plan* gives specific edits, marked inline. It preserves your voice and stays within 10% of your original length. Use it when the sermon is ready for a hard look.",
    prerequisites: { tab: STAGE.Manuscript, drawerOpen: false },
  },
  {
    id: "finish",
    anchorId: null,
    title: "That's the workspace.",
    body: "This is one sermon. The Series Planner holds many. Both tours are available from the dashboard whenever you want to revisit.",
    prerequisites: { tab: STAGE.Manuscript, drawerOpen: false },
  },
];
