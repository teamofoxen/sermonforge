// PROMPT_VERSION: 1.0.0
//
// Centralized task directives for SeriesPlanner AI calls (ACCI Item 8 / C1).
// Each export below is a task-shaped string suitable for
// `appendTaskDirective(buildSystemPrompt(step, sermonId), TASK)`. Call sites
// MUST NOT pass bare "You are…" strings — those bypass the layered system
// prompt defined in `./sermon.js`.
//
// SeriesPlanner is series-level work, not sermon-prep. The step argument to
// buildSystemPrompt selects the matching stepDescription clause. New
// series-* keys were added to `./sermon.js` for these surfaces.

export const PROMPT_VERSION = "1.0.0";

// Series-planner step identifiers. Match the stepDescriptions keys added to
// sermon.js for these surfaces.
export const SERIES_STEPS = Object.freeze({
  BookStudy:  "book-study",
  Overview:   "series-overview",
  Structure:  "series-structure",
  Slots:      "series-slots",
  Calendar:   "series-calendar",
});

// ── Book Study tab ─────────────────────────────────────────────────────────

export const BOOK_STUDY_FIELD_ANALYZE_TASK = `Engage seriously with the pastor's notes and give substantive, practical feedback on the field they're asking about. Reference the other populated fields when they sharpen the answer.`;

export const BOOK_STUDY_BIG_IDEA_TASK = `Crystallize a series big idea from the pastor's book study work. Return one sentence summarizing the central truth this book drives home — sharp, memorable, and theologically precise. Return only the sentence.`;

export const BOOK_STUDY_CHAT_TASK = `Engage with the pastor on their book study notes. Be concise and substantive. Treat the populated fields as the working draft and respond to questions in their light.`;

// ── Overview tab ───────────────────────────────────────────────────────────

export const SERIES_BIG_IDEA_TASK = `Write a single, compelling series Big Idea sentence — the central truth this series will hammer home. Make it sharp and memorable. Return only the sentence.`;

export const SERIES_OVERVIEW_TASK = `Write a 2-paragraph overview: (1) the historical/literary context and purpose of this passage in Scripture; (2) why this passage is urgently relevant to a contemporary congregation. Be theologically substantive. Write as if for a pastor's own notes.`;

export const SERIES_OVERVIEW_CHAT_TASK = `Answer questions about the passage, theme, structure, or anything related to planning this series. Stay grounded in the series text and big idea.`;

// ── Structure tab ──────────────────────────────────────────────────────────

export const SERIES_STRUCTURAL_OUTLINE_TASK = `Build a detailed structural/exegetical outline of the passage. Include major divisions, subdivisions, and key passage markers. Format as a traditional Roman numeral / letter / number outline. Be thorough.`;

export const SERIES_STRUCTURE_CHAT_TASK = `Help with passage divisions, thematic organization, grammatical structure, and section planning for this series.`;

// ── Slots tab ──────────────────────────────────────────────────────────────

export const SERIES_SLOTS_CHAT_TASK = `Suggest natural passage breaks, sermon titles, and big ideas for the slots. Be specific about verse ranges.`;

// Study guide note — used by SlotRow Assist (and currently also by the
// orphan SlotsTab.handleSlotAI). ACCI Item 25 dedupes both call sites onto
// this single source; ACCI Q7 deletes the orphan.
export const STUDY_GUIDE_NOTE_TASK = `Write study guide notes for the sermon series — clear, warm, and connected to the series arc. Write for a congregation member, not a scholar. One or two sentences orienting the reader to how this sermon participates in the series arc.`;

// ── Calendar tab ───────────────────────────────────────────────────────────

export const CALENDAR_CHAT_TASK = `Advise on scheduling adjustments. If the pastor asks to skip a week or rearrange slots, explain what the adjusted schedule would look like (list it out). Do not modify anything — just advise clearly.`;
