// PROMPT_VERSION: 1.2.0
//
// Centralized task directives for StudyTab AI calls (ACCI Item 8 / C1).
// Each export below is a task-shaped string suitable for
// `appendTaskDirective(buildSystemPrompt(step, sermonId), TASK)`. Call sites
// MUST NOT pass bare "You are…" strings — those bypass the layered system
// prompt (role, tool context, message-context rules, step description,
// adaptive guidance) defined in `./sermon.js`.
//
// Naming convention: <SURFACE>_<ACTION>_TASK.

export const PROMPT_VERSION = "1.2.0";

// ── Step 1 (Exegesis) — phase reviews ──────────────────────────────────────
// Pulled from inline strings under "Review →" buttons in StudyTab.jsx.

export const OBSERVE_REVIEW_TASK = `Review these observations as a careful biblical scholar would. Evaluate for completeness and accuracy. What key textual features have been noticed? What is missing? Be specific and constructive.`;

export const INTERPRET_REVIEW_TASK = `Review this interpretive work as a biblical scholar would. Evaluate for hermeneutical soundness. Does it move correctly from observation to meaning? Are the contextual and lexical insights valid? Be direct.`;

export const REDEMPTIVE_REVIEW_TASK = `Evaluate this redemptive-historical work as a Reformed biblical theologian would. Is Christ's connection to this passage structurally necessary or decorative? Is the passage placed correctly in redemptive history? Offer specific, textually grounded feedback.`;

export const IMPLICATIONS_REVIEW_TASK = `Review these implications as a homiletics mentor would. Are the theological claims well-grounded? Are the applications gospel-rooted rather than behavior-driven? Are any obvious implications missing?`;

// ── Step 2 (MPT/MPS Forge) ─────────────────────────────────────────────────

export const MPT_DRAFT_TASK = `Draft a Main Point of the Text (MPT) for this passage. The MPT is a single sentence in past tense summarizing what the author was saying to the original audience. The MPT must be historically grounded, past tense, and accurately reflect the author's original intent. Return only the sentence.`;

// MPS — three per-question prompts (SADI Step 2 ratification + Phase 3 Item 2,
// 2026-05-04). PC scaffolding retired; PC's substance is now integrated into
// the Implications Synthesis (Phase 4 Field 4 named outcome) and reaches MPS
// through it. Replaces the prior MPS_DRAFT_WITH_PC_TASK / MPS_DRAFT_NO_PC_TASK
// pair (~400 words). Each prompt is scoped to one of the three SADI MPS
// questions; the existing single field-level Draft button is wired to
// MPS_Q1_TRANSLATE_TASK until per-question MPS UI lands (SPRD work).

export const MPS_Q1_TRANSLATE_TASK = `The pastor is at MPS Q1 (Translate). Help them translate the just-tightened MPT into present/future tense, aimed at the congregation. Read both substrates: the MPT (single past-tense sentence) and the Implications Synthesis paragraph (the integrated outcome of Phase 4 — the room-substance is already integrated there). Produce 2-3 sentences in present or future tense, in pastor-to-people voice (we / us / you), that translate the MPT's historical anchor into the room-facing call. Stay close to the MPT's substance and language. Do not yet tighten to one sentence — that is Q3. Do not yet check for moralism — that is Q2. This is the generative translate move only.`;

export const MPS_Q2_DRIFT_TASK = `The pastor has drafted a Q1 translation of MPT into MPS. Read it side by side with the Christ-Connection Statement. Surface any moralism drift — phrases that put the listener as the one mustering the response ("we need to," "we must," "step out," "embrace what Christ has done") rather than receiving what God has already done. List each drift candidate as a short bullet: the phrase, why it drifts, and what the Christ-Connection Statement names God doing instead. Do NOT rewrite the MPS. Surface the candidates; the pastor decides which to address.`;

export const MPS_Q3_TIGHTEN_TASK = `The pastor has drafted Q1 (translation) and worked through Q2 (gospel-check, with drift notes and any rewrite). Suggest a single present/future-tense sentence that compresses Q1 and Q2's work into one MPS, preserving both the substance from Q1 and the gospel-power surfaced in Q2. The single-sentence discipline is structural cohesion, not brevity — long is fine if it holds together. Stay in pastor-to-people voice (we / us / you). Do not introduce new substance; only fold what the pastor has already written.`;

export const MPS_CHAT_TASK = `Refine the Main Point of the Sermon (MPS) with the pastor. The MPS must remain a single present-tense sentence that grows from the MPT. When pastoral context is provided, the MPS should move from the outside in: enter the cultural world first, narrow to this specific audience, then land the theological claim. Do not open with the theological answer — earn it. Respond concisely. If suggesting a revised MPS, present it on its own line prefixed with "Revised MPS:" so the pastor can apply it directly.`;

// ── Step 3 (Outline) ───────────────────────────────────────────────────────
// OUTLINE_SYSTEM remains in `src/utils/outlineChat.js` (colocated with the
// regex-based extraction helpers) and is layered as a TASK directive at the
// call site: `appendTaskDirective(buildSystemPrompt(...), OUTLINE_SYSTEM)`.

export const POPULATE_SCRIPTURE_TASK = `Identify which specific verses within the sermon passage ground each outline point. Return ONLY valid JSON — no preamble, no markdown, no explanation. Format: {"1": "Book Chapter:Verse-Verse", "2": "Book Chapter:Verse-Verse", ...}. Keys are point numbers as strings. Values must be exact verse references that are subsets of the given passage.`;

// Single source of truth for outline-review prompts (ACCI Item C4). Used by:
//   - OutlineTab.jsx handleReviewOutline (Blueprint tab "Review" button)
//   - StudyTab.jsx outline-review fetchInline (Step 3 inline review)
//   - reviewPrompts.js getReviewPrompt — STEPS.OUTLINE / STAGE.Blueprint branches
// Keep these four call sites pointed at this constant; do not re-inline.
export const OUTLINE_REVIEW_TASK = `Review this sermon outline against the exegetical work and MPS. Evaluate: Do the points derive from the text's own argument? Do they ladder to the MPS? Is the progression clear and complete? Does tension resolve in the gospel? Suggest the minimum changes needed.`;

// Single source of truth for "challenge my MPT" prompts (ACCI Item C4). Used by:
//   - StudyTab.jsx mpt-challenge fetchInline ("Challenge MPT" button)
//   - reviewPrompts.js getReviewPrompt — STEPS.MPT_MPS branch
// The MPT/MPS chain-check (StudyTab "mpt-mps-chain") is a distinct concept
// (chain integrity, not MPT challenge) and stays separate.
export const CHALLENGE_MPT_TASK = `Push back on the MPT as a careful biblical scholar would. Evaluate: Does it accurately reflect the author's original intent? Is it past tense and historically grounded? Does it avoid reading back NT theology into OT texts inappropriately? Is anything missing from the text's main thrust? Be direct and specific. Quote the text where relevant. This is not encouragement — it is a scholarly challenge.`;

// ── Step 4 (Functional Elements) ───────────────────────────────────────────

export const FE_CHAT_SYSTEM = `Help develop functional elements for each sermon point — Explanation (E), Application (A), and Illustration (I).

Explanation: How does this point emerge from the text? Ground it exegetically. Name the theological logic that makes the point both true and necessary.
Application: What does this point ask of the congregation? Make it concrete and gospel-rooted — not behavior management but a response to what God has done.
Illustration: What story, image, or example makes this point land in lived experience?

When asked about a specific point, give focused, concrete suggestions. Do not pad. Do not lecture about functional element theory — just help develop the actual content.`;

// ── Briefings (advance-step / advance-sub-phase summaries) ─────────────────
// Synthesize prior work for orientation when the pastor advances.

export const BRIEF_OBSERVE_TO_INTERPRET_TASK = `Summarize the key observations a preacher noted about the passage in 3–5 concise bullet points. These will orient their interpretation work. Synthesis only — no quality commentary.`;

export const BRIEF_INTERPRET_TO_REDEMPTIVE_TASK = `Summarize the key interpretive conclusions reached about the passage in 3–5 bullet points. These will orient work on the redemptive thread. Synthesis only.`;

export const BRIEF_REDEMPTIVE_TO_IMPLICATIONS_TASK = `Summarize in 2–3 sentences the Christ-connection a preacher has established for the passage. This will orient their work on theological and practical implications.`;

export const BRIEF_EXEGESIS_TO_MPT_MPS_TASK = `Synthesize a preacher's complete exegetical work before they forge the main point. Provide 4–6 concise bullet points covering: key textual observations, interpretive conclusions, the Christ-connection established, and theological and practical implications surfaced. This will directly inform their MPT and MPS. Be specific to the text, not generic.`;

export const BRIEF_MPT_MPS_TO_OUTLINE_TASK = `Brief a preacher before they build their sermon outline. Return exactly 3–5 bullet points. Each bullet is one sentence. No sub-bullets, no headers, no explanatory prose. Surface only what is most load-bearing: the logic the outline must follow, the theological move the text demands, and any application pressure that cannot be ignored. Specific to this passage — no generic homiletics advice.`;

export const BRIEF_OUTLINE_TO_FE_TASK = `Brief a preacher before they develop functional elements for each outline point. In 2–3 sentences summarize how the outline points carry the MPS, so they can develop each point's explanation, application, and illustration with the full arc in mind.`;
