// Workspace tour — 17-stop throughline-first guided tour through the Sermon
// Workspace.
//
// Locked content from docs/PROPOSALS/sermon-workspace-tour.md. Body strings
// are rendered as markdown by TourOverlay — italics (*…*) and bold (**…**)
// preserve the spec's intentional emphasis on field names, chip labels, and
// named outcomes.
//
// Each stop declares the UI state it expects via `prerequisites`. The
// orchestrator (TourContext + workspace observers) aligns SermonWorkspace
// and StudyTab state when the tour is active. Tab keys come from `STAGE` in
// `src/core/contracts.ts`.
//
// 2026-05-05 — throughline-first reframe. The pre-reframe 30-stop UI surface
// walk is retired. The new tour walks the cumulative thought-unit table from
// Phase 1 Field 3 through Phase 4 (rows → meaning → Christ-connection →
// implication), anchors on the four named outcomes (Observation Set →
// Interpretation Set → Christ-Connection Statement → Implications Synthesis),
// then bridges to MPT/MPS → Outline → Functional Elements → Frame (Intro +
// Conclusion) → Manuscript → Delivery. AI overview distributed (one ambient
// framing stop instead of four front-loaded stops); Manuscript audit tools
// collapsed (one stop with three sub-mentions instead of three dedicated
// stops); Frame and Delivery added as first-class stops. New anchors:
// `throughline-rail`, `frame-worksheet`, `delivery-overview`. Mock sermon:
// Romans 5:1-5 (`tour-romans-sermon-01`).

import { STAGE } from "../core/contracts";

const STUDY_BASE = { tab: STAGE.Study, drawerOpen: false };

export const WORKSPACE_TOUR_STOPS = [
  // ── Stops 1–3: workspace shell + AI framing + throughline ────────────────
  {
    id: "workspace-shell",
    anchorId: "workspace-title",
    title: "The Sermon Workspace.",
    body: "Where you go deep on one sermon. Series context comes with you here automatically if a series is in place. If not, the workspace stands on its own — start where you are.",
    prerequisites: STUDY_BASE,
  },
  {
    id: "ai-philosophy",
    anchorId: null,
    title: "SermonForge doesn't write your sermons. It forces them.",
    body: "Through a method. Against the text. Into the pastoral moment. The AI's posture shifts with where you are — collaborator during exegesis, challenger at the main points, structural reviewer at the outline, auditor at the manuscript. Every response is shaped by what you've actually done. It doesn't replace the discipline; it stress-tests it.",
    prerequisites: STUDY_BASE,
  },
  {
    id: "throughline",
    anchorId: "throughline-rail",
    title: "The throughline.",
    body: "Down the left of the Study tab, a vertical rail tracks one cumulative thought-unit table. Phase 1 builds the rows. Phase 2 adds a *meaning* column. Phase 3 adds *Christ-connection*. Phase 4 adds *implication*. By the time MPT and MPS open, the table holds the propositional skeleton with bones, signal, meaning, Christ-connection, and integrated implication — all in one structural artifact. Each sub-phase ends with a **named outcome** the next opens against. You don't lose the work. You carry it.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 1 },
  },

  // ── Stops 4–8: Study tab — Step 1 (four sub-phases extending the table) ──
  {
    id: "phase-1-outside-in",
    anchorId: "phase-1-worksheet",
    title: "Phase 1 — Observe (outside-in).",
    body: "*Context. Surface Questions. Divisions / Thought Units.* Where the passage sits in the book; the situational facts on the surface; then Field 3 — the heaviest cut. Lay the passage out by hand, paraphrase each main sentence in your own voice, name the thought units. **Field 3 builds the rows of the throughline table.** Resist the urge to jump to meaning.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 1 },
  },
  {
    id: "phase-1-lens-cluster",
    anchorId: "phase-1-worksheet",
    title: "Phase 1 — Observe (lens cluster + bridge).",
    body: "*Main Characters. Commands and Declarations. Big Ideas. Obvious Point. Possible Implications.* The lens cluster reads against Field 3's spine — who's acting, what each main sentence is doing, what concepts surface. Then the question most pastors skip — is there an obvious point? State it plainly. Possible Implications close the segment by naming what the text is pressing on for the room. Phase 1's named outcome: the **Observation Set**.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 1 },
  },
  {
    id: "phase-2-meaning-column",
    anchorId: "phase-2-worksheet",
    title: "Phase 2 — Interpret.",
    body: "*Deeper Context. Genre. Recurring Ideas. Character Purpose. Contrasts. Cross-References. Commentary Notes. Interpretation Synthesis.* Pick up Observe's Context with study tools in hand. Let genre set the lens. Dissect what's inside. Open the canon. Check trusted readers — last, to confirm or correct, not to start. Then articulate what the passage MEANS in your own voice, per thought unit and as a whole. **Each thought unit gets a *meaning* column added to the throughline table here.** Interpret's named outcome: the **Interpretation Set**.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 2 },
  },
  {
    id: "phase-3-christ-connection-column",
    anchorId: "phase-3-worksheet",
    title: "Phase 3 — Redemptive Thread.",
    body: "*This Passage and Christ. How the Passage Points to Christ. How the Gospel Makes This Possible. Our Need and God's Character. Christ-Connection Statement.* Position the text against Christ. Trace the four pointing-mechanisms — biblical theme, promise, type, predictive prophecy. Ground the gospel's enabling power against moralism. Pair human need with God's character. **Each thought unit gets a *Christ-connection* column added.** Phase 3's named outcome — written by you, not the AI — is the **Christ-Connection Statement**.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 3 },
  },
  {
    id: "phase-4-implication-column",
    anchorId: "phase-4-worksheet",
    title: "Phase 4 — Implications.",
    body: "*Theological Significance. Personal Implications. Pastoral Context. Implications Synthesis.* What the text teaches. What it asks of the hearer — *follow, forsake, receive, settle.* The room concretely named — who this text is speaking into, what's costly and what's gift. The text leads the first two voices; the room enters as the third. **Each thought unit gets an *implication* column — completing the table to six columns.** Phase 4's named outcome — pastor-written, no AI substitute — is the **Implications Synthesis**. The marinate-output.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },
  {
    id: "four-named-outcomes",
    anchorId: "throughline-rail",
    title: "The four named outcomes.",
    body: "Look at the rail. Four callouts mark the hand-off arc: **Observation Set → Interpretation Set → Christ-Connection Statement → Implications Synthesis.** Each one is what the next sub-phase opens against — not raw worksheet content. By Phase 4's close, you're holding four pastor-written articulations plus the six-column table. That's the substrate MPT and MPS open against. No AI re-summary. Your work, accumulated and visible.",
    prerequisites: { ...STUDY_BASE, studyStep: 1, studySubPhase: 4 },
  },

  // ── Stops 10–12: Study tab — Steps 2, 3, 4 ───────────────────────────────
  {
    id: "step-2-mpt-mps",
    anchorId: "mpt-field",
    title: "Step 2 — MPT → MPS.",
    body: "The two most important sentences in the sermon. **MPT** in past tense — what the author meant for the original audience. **MPS** in present or future tense — what this text means for *this* congregation. The bridge from then to now. MPS's gospel-check reads against the Christ-Connection Statement: does the call rest on what Christ has done, or has it slipped into \"try harder\"? AI here is a challenger — *Challenge My MPT* and *Check MPT→MPS Chain* are the chips you'll use most. Step 2's named outcome: the **Main Point Pair**.",
    prerequisites: { ...STUDY_BASE, studyStep: 2 },
  },
  {
    id: "step-3-outline",
    anchorId: "outline-builder",
    title: "Step 3 — Outline.",
    body: "Structure emerges from the throughline, not imposed on it. Add and reorder points until the argument moves cleanly from MPT to MPS. *Review Outline* sends it to the AI for structural feedback — does each point derive from the text, does the progression actually move, does the structure serve the MPS?",
    prerequisites: { ...STUDY_BASE, studyStep: 3 },
  },
  {
    id: "step-4-functional-elements",
    anchorId: "functional-elements",
    title: "Step 4 — Functional Elements.",
    body: "For each outline point: Explanation, Application, Illustration. Every point needs all three to land. *Review E/A/I Balance* asks the AI to audit each point — is the explanation sufficient, is the application gospel-rooted, does the illustration clarify or distract? Worth running before the manuscript.",
    prerequisites: { ...STUDY_BASE, studyStep: 4 },
  },

  // ── Stops 13–14: Frame tab — Step 5 (Intro + Conclusion) ─────────────────
  {
    id: "frame-intro",
    anchorId: "frame-worksheet",
    title: "Step 5 — Frame: Intro.",
    body: "Four moves to walk the listener into the body. *Hook* — open from where the listener actually is. *Bridge to text* — land the MPT and MPS. *Expectations* — name what the body will ask of them, so they're not blindsided. *Redemptive note* — the gospel-shape that turns the call from burden into invitation. The order is deliberate: name the call first, then gospel-empower it. The same anti-moralism pattern MPS just walked.",
    prerequisites: { tab: STAGE.Frame, drawerOpen: false },
  },
  {
    id: "frame-conclusion",
    anchorId: "frame-worksheet",
    title: "Step 5 — Frame: Conclusion.",
    body: "Four moves to land the body's call. *Summate* — pull the whole arc into one landing in the voice of where the listener now is, not a point-by-point recap. *Land the call* — concrete, drawn from MPS. *Gospel-empower* — drawn from the Christ-Connection Statement, so the listener walks out holding the gift, not a new burden. *Closing posture* — silence, song, prayer, or charge, named explicitly. Step 5's named outcome: the **Sermon Frame**.",
    prerequisites: { tab: STAGE.Frame, drawerOpen: false },
  },

  // ── Stops 15–17: Manuscript + Delivery + finish ──────────────────────────
  {
    id: "manuscript",
    anchorId: "stage-tab-Manuscript",
    title: "Manuscript.",
    body: "Where the sermon becomes prose. Three audit tools live here — use them after the manuscript is drafted, not before. *Flow Coach* walks every transition one at a time, asking whether each section lands and the next picks up cleanly. *Ear Check* scans for structural orphans and speakability flags — what will be heard, not just read. *Tune-Up* runs a full three-phase audit — Snapshot, Alignment Map, Patch Plan — preserving your voice and staying within 10% of length.",
    prerequisites: { tab: STAGE.Manuscript, drawerOpen: false },
  },
  {
    id: "delivery",
    anchorId: "delivery-overview",
    title: "Delivery.",
    body: "Three ways to stand at the pulpit. *Manuscript* formatted for reading aloud, *Preaching Outline* for the lectern, *Without Notes* compressed into memory blocks. The closing posture you chose at Frame: Conclusion shapes the physical close. After the sermon is preached, this is where you mark it complete.",
    prerequisites: { tab: STAGE.Delivery, drawerOpen: false },
  },
  {
    id: "finish",
    anchorId: null,
    title: "That's the workspace.",
    body: "One sermon, throughline-first. The Series Planner holds many. Both tours are available from the dashboard whenever you want to revisit.",
    prerequisites: { tab: STAGE.Delivery, drawerOpen: false },
  },
];
