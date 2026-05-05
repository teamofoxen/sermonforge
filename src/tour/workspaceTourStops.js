// Workspace tour — 30-stop guided tour through the Sermon Workspace.
//
// Locked content from docs/PROPOSALS/sermon-workspace-tour.md. Body strings are
// rendered as markdown by TourOverlay — italics (*…*) preserve the spec's
// intentional emphasis on field names and chip labels.
//
// Each stop declares the UI state it expects via `prerequisites`. The
// orchestrator (TourContext + workspace observers) aligns SermonWorkspace and
// StudyTab state when the tour is active. Tab keys come from `STAGE` in
// `src/core/contracts.ts` (post-vocabulary-completion canonical names).
//
// 2026-05-05 — content reconciled with SPRD/SFDI Study reshape: Phase 1 = 8
// fields, Phase 2 = 8 fields (Genre added), Phase 3 = 5 fields, Phase 4 = 4
// fields including Pastoral Context as the third voice. Unbeliever + Compile
// stops retired; Pastoral Context + Implications Synthesis stops added. Tour
// walks the Romans 5:1-5 sample sermon (`tour-romans-sermon-01`).

import { STAGE } from "../core/contracts";

const STUDY_BASE = { tab: STAGE.Study, drawerOpen: false };

export const WORKSPACE_TOUR_STOPS = [
  // ── Stops 1–5: workspace + AI overview ────────────────────────────────────
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

  // ── Stops 6–20: Study tab — Step 1 (Exegesis, four phases) ────────────────
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
    body: "Before you interpret, you observe. Eight fields walk you through the passage in order — outside-in, then a lens cluster, then the bridge into Interpret. Resist the urge to jump to meaning.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 1 },
  },
  {
    id: "phase-1-surface",
    anchorId: "phase-1-worksheet",
    title: "What the text says.",
    body: "*Context. Surface Questions. Divisions / Thought Units.* Outside in: where this passage sits in the book, the situational facts on the surface, and how the passage breaks into thought units that anchor the rest of the work. Field 3 is the heaviest cut — the cumulative thought-unit table you'll extend in every later phase starts here.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 1 },
  },
  {
    id: "phase-1-substance",
    anchorId: "phase-1-worksheet",
    title: "What the text shows.",
    body: "*Main Characters. Commands and Declarations. Big Ideas. Obvious Point. Possible Implications.* The lens cluster reads against Field 3's spine — who's acting, what each main sentence is doing, what concepts surface. Then the question most pastors skip — is there an obvious point? State it plainly. Possible Implications close the segment by naming what the text is starting to press on for the room.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 1 },
  },
  {
    id: "phase-2-interpret",
    anchorId: "phase-2-worksheet",
    title: "Phase 2 — Interpret.",
    body: "Beneath the surface. Eight fields push from what the text says to what it means. This is where most of the work happens.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 2 },
  },
  {
    id: "phase-2-shaping",
    anchorId: "phase-2-worksheet",
    title: "How meaning takes shape.",
    body: "*Deeper Context. Genre. Recurring Ideas. Character Purpose. Contrasts.* Pick up Observe's Context with study tools in hand. Let genre set the lens. Then the dissection — what recurs, what each character is signaling, the oppositions the author has built into the passage.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 2 },
  },
  {
    id: "phase-2-voices",
    anchorId: "phase-2-worksheet",
    title: "Outside voices, then your own.",
    body: "*Cross-References. Commentary Notes. Interpretation Synthesis.* Let Scripture interpret Scripture. Check your reading against the commentaries — last, to confirm or correct, not to start. Then articulate what the passage MEANS in your own voice, per thought unit and as a whole. The Interpretation Set is the named outcome — Phase 3 opens against it.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 2 },
  },
  {
    id: "phase-3-redemptive",
    anchorId: "phase-3-worksheet",
    title: "Phase 3 — Redemptive Thread.",
    body: "Every text points somewhere. Five fields ask how this one points to Christ — by position, by theme or promise or type or prophecy, by the gospel's enabling power, by need, by the character of the God who saves.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 3 },
  },
  {
    id: "phase-3-fields",
    anchorId: "phase-3-worksheet",
    title: "Five ways to find Christ.",
    body: "*This Passage and Christ. How the Passage Points to Christ. How the Gospel Makes This Possible. Our Need and God's Character. Christ-Connection Statement.* Position the text against Christ. Trace the four pointing-mechanisms — biblical theme, promise, type, predictive prophecy. Ground the gospel's enabling power. Pair human need with God's character. The discipline: don't insert Christ where he isn't. Mark N/A where the text genuinely doesn't carry that kind of pointing.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 3 },
  },
  {
    id: "christ-connection-statement",
    anchorId: "phase-3-worksheet",
    title: "Christ-Connection Statement.",
    body: "The named outcome of Redemptive Thread, written by you — not the AI. For each thought unit you named in Observe, write the Christ-connection in the cumulative table. Then close with one paragraph: how does the whole passage point to Christ, and how is Christ its hero? Phase 4 opens against this statement.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 3 },
  },
  {
    id: "phase-4-implications",
    anchorId: "phase-4-worksheet",
    title: "Phase 4 — Implications.",
    body: "What does this text demand of the people in the room? Four fields — what the text teaches (Theological Significance), what it asks of the hearer (Personal Implications), the room it's landing in (Pastoral Context), and the synthesis that integrates all three (Implications Synthesis).",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },
  {
    id: "theological-significance",
    anchorId: "theological-significance",
    title: "Theological Significance.",
    body: "What this passage teaches about God, about ourselves, about Christ. Timeless principles. Particular doctrines. What's true here that would be true anywhere?",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },
  {
    id: "personal-implications",
    anchorId: "personal-implications",
    title: "Personal Implications.",
    body: "Four verb-driven questions — what to *follow* (examples to imitate, commands to keep), what to *forsake* (errors to avoid, sins to leave), what to *receive* (gospel promises, fresh thoughts about God), and what to *settle* into (truths to explore, convictions to live by). Most sermons go thin at application; this is where you get ahead of that.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },
  {
    id: "pastoral-context",
    anchorId: "pastoral-context",
    title: "Pastoral Context.",
    body: "The third voice in the three-way conversation. Two questions: who in your room is this text speaking into — specific people, specific situations — and for those specific people, what's the cost (what will be hard, costly, counter-intuitive) and what's the gift (the comfort, hope, freedom, or invitation this text holds out). The text leads; the room enters here, by name.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },
  {
    id: "implications-synthesis",
    anchorId: "implications-synthesis",
    title: "Implications Synthesis.",
    body: "The Study work closes here, in your voice. For each thought unit, integrate the three voices — what the text teaches, what it asks of the hearer, how it lands in this room. Then one paragraph for the whole passage. This is the marinate-output. MPT and MPS open against it.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },

  // ── Stops 21–25: Study tab — Steps 2, 3, 4 ─────────────────────────────────
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

  // ── Stops 26–30: Manuscript tab + finish ───────────────────────────────────
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
