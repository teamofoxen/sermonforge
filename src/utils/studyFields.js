// studyFields.js — Structured field definitions and helpers for the 4-phase exegesis worksheet.
//
// Each phase stores its data as JSON in the existing sermon column
// (observations, interpretation, redemptive_thread, implications).
// Legacy plain-text data is preserved in a "legacy_notes" key when detected.

import { tryParse } from "../utils";

// ── Phase 1: Observe ─────────────────────────────────────────────────────────

export const OBSERVE_FIELDS = [
  { key: "context",       label: "Context",                    hint: "What comes before and after this passage? How does the surrounding context set up or follow from it?" },
  { key: "divisions",     label: "Divisions / Thought Units",  hint: "What are the main divisions or thought units of the passage?" },
  { key: "commands",      label: "Notable Commands",           hint: "What imperatives appear in the text? What is the author commanding?" },
  { key: "statements",    label: "Notable Statements",         hint: "What indicatives stand out? What is the author declaring or asserting?" },
  { key: "characters",    label: "Main Characters",            hint: "Who are the main characters? What roles do they play?" },
  { key: "big_ideas",     label: "Big Ideas",                  hint: "What are the major themes or ideas surfacing in this passage?" },
  { key: "obvious_point", label: "Obvious Point",              hint: "Is there an obvious point to the story or passage? State it plainly." },
  { key: "basic_outline", label: "Basic Outline",              hint: "Begin forming a basic outline based on the text. This is a text outline — the argument structure of the passage itself. It will later inform your sermon outline in Step 3." },
  { key: "applications",  label: "Possible Implications",      hint: "Write down any possible implications that surface from your study here." },
];

// ── Phase 2: Interpret ───────────────────────────────────────────────────────

export const INTERPRET_FIELDS = [
  { key: "context_impact",  label: "Context Impact",              hint: "How does the surrounding context shape the meaning of this passage? Note any unresolved questions from background study." },
  { key: "recurring_ideas", label: "Recurring Ideas",             hint: "What ideas, words, or themes recur within this passage?" },
  { key: "characters",      label: "Characters: Saying, Doing, Thinking", hint: "What are the characters saying, doing, thinking — and why?" },
  { key: "contrasts",       label: "Contrasts",                   hint: "Are there any contrasts being made within the text? (e.g., wise vs. foolish, light vs. dark)" },
  { key: "diagram",         label: "Diagram / Relationships",     hint: "Show the relationship between ideas or scenes in graphic or written form." },
  { key: "cross_refs",      label: "Cross-References",            hint: "Write down notable cross-references here." },
  { key: "commentary",      label: "Commentary Notes",            hint: "What do the commentaries say? Note key insights." },
  { key: "summarize_parts", label: "Summarize the Parts",         hint: "Summarize each verse or paragraph in your own words." },
  { key: "summarize_whole", label: "Summarize the Whole",         hint: "Summarize the entire text in your own words." },
];

// ── Phase 3: Redemptive Thread ───────────────────────────────────────────────

export const REDEMPTIVE_FIELDS = [
  { key: "speaks_of_christ",  label: "Does this text speak directly of Christ?",                          hint: "" },
  { key: "relation_to_christ", label: "Where does it stand in relation to Christ?",                       hint: "Before, after, or transitional?" },
  { key: "biblical_theme",    label: "Does the passage reveal a biblical theme that points to Christ?",    hint: "" },
  { key: "promise",           label: "Does this passage show a promise that points to Christ?",            hint: "" },
  { key: "need_for_christ",   label: "How does this passage show mankind's need for Christ?",              hint: "" },
  { key: "nature_of_god",     label: "How does this passage reveal the nature of the God who provides redemption?", hint: "" },
  { key: "jesus_hero",        label: "How is Jesus the hero of this passage?",                             hint: "" },
];
export const REDEMPTIVE_SUMMARY_KEY = "summary";

// ── Phase 4: Implications ────────────────────────────────────────────────────

export const IMPLICATIONS_THEOLOGICAL = [
  { key: "about_god",       label: "What does this text teach us about God?" },
  { key: "about_ourselves", label: "What does it teach us about ourselves?" },
  { key: "about_christ",    label: "What does it teach us about Christ?" },
  { key: "timeless",        label: "What principles are timeless for us?" },
  { key: "doctrines",       label: "What does the passage teach us about particular doctrines?" },
];

export const IMPLICATIONS_PERSONAL = [
  { key: "examples",    label: "Are there examples to follow?" },
  { key: "commands",    label: "Are there commands to keep?" },
  { key: "errors",      label: "Are there errors to avoid?" },
  { key: "sins",        label: "Are there sins to forsake?" },
  { key: "promises",    label: "Are there gospel promises to claim?" },
  { key: "new_thoughts", label: "Are there new thoughts about God to gain?" },
  { key: "explore",     label: "Are there truths or doctrines to further explore?" },
  { key: "convictions", label: "Are there convictions to be lived by?" },
];

export const IMPLICATIONS_UNBELIEVER_KEY = "unbeliever";
export const IMPLICATIONS_COMPILED_KEY = "compiled";

// ── Parsing / Serializing ────────────────────────────────────────────────────

/**
 * Parse a column value that may be structured JSON or legacy plain text.
 * Returns { ...fields } with string values.  Legacy plain text is stored
 * under the "legacy_notes" key so it's never lost.
 */
export function parseStructuredField(raw) {
  if (!raw || typeof raw !== "string") return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};

  // Try JSON first
  if (trimmed.startsWith("{")) {
    const parsed = tryParse(trimmed, null);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  }

  // Legacy plain text — preserve it
  return { legacy_notes: trimmed };
}

/**
 * Serialize a structured field object to JSON string for storage.
 * Strips empty-string values to keep storage lean.
 */
export function serializeStructuredField(data) {
  if (!data || typeof data !== "object") return "";
  const cleaned = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string" && v.trim()) {
      cleaned[k] = v;
    }
  }
  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : "";
}

/**
 * Flatten a structured field object to plain text for the context pipeline.
 * Joins all non-empty values with labels derived from the field definitions.
 * Falls back to legacy_notes if present.
 */
export function flattenToText(data, fieldDefs) {
  if (!data || typeof data !== "object") return "";

  const parts = [];

  // Legacy notes first
  if (data.legacy_notes?.trim()) {
    parts.push(data.legacy_notes.trim());
  }

  // Structured fields
  for (const def of fieldDefs) {
    const val = data[def.key];
    if (val?.trim()) {
      parts.push(`${def.label}: ${val.trim()}`);
    }
  }

  // Summary/compiled fields (Phase 3 & 4)
  if (data[REDEMPTIVE_SUMMARY_KEY]?.trim()) {
    parts.push(`Summary: ${data[REDEMPTIVE_SUMMARY_KEY].trim()}`);
  }
  if (data[IMPLICATIONS_COMPILED_KEY]?.trim()) {
    parts.push(`Compiled implications: ${data[IMPLICATIONS_COMPILED_KEY].trim()}`);
  }
  if (data[IMPLICATIONS_UNBELIEVER_KEY]?.trim()) {
    parts.push(`Implications for unbelievers: ${data[IMPLICATIONS_UNBELIEVER_KEY].trim()}`);
  }

  return parts.join("\n");
}

/**
 * Flatten all 4 exegesis columns from structured JSON to plain text.
 * Drop-in replacement for summarizeExegesis when columns contain JSON.
 */
export function flattenExegesis(sermon) {
  const obs  = flattenToText(parseStructuredField(sermon?.observations),      OBSERVE_FIELDS);
  const int  = flattenToText(parseStructuredField(sermon?.interpretation),    INTERPRET_FIELDS);
  const red  = flattenToText(parseStructuredField(sermon?.redemptive_thread), [...REDEMPTIVE_FIELDS]);
  const imp  = flattenToText(parseStructuredField(sermon?.implications),      [...IMPLICATIONS_THEOLOGICAL, ...IMPLICATIONS_PERSONAL]);

  const parts = [
    obs && `Observations: ${obs}`,
    int && `Interpretation: ${int}`,
    red && `Redemptive thread: ${red}`,
    imp && `Implications: ${imp}`,
  ].filter(Boolean);

  return parts.join(" | ");
}
