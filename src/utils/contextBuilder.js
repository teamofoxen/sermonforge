// contextBuilder.js — multi-stage context assembly pipeline.
// Normalize → compress → tier → assemble → return structured context string.

import { STEPS, PHASES } from "../constants/steps";
import { CONTEXT_SECTIONS } from "../constants/contextSchema";
import { getOutline, getFunctionalElements } from "../utils";
import { getMemory } from "./memory";
import { flattenExegesis } from "./studyFields";

/**
 * Normalize a raw sermon record into a clean object with guaranteed shapes.
 * Safe to call with null/undefined — always returns the full structure.
 *
 * @param {object|null|undefined} sermon
 * @returns {{
 *   passage: string,
 *   mpt: string,
 *   mps: string,
 *   outline: string[],
 *   functionalElements: object,
 *   series: { title: string, big_idea: string, series_motivation: string, redemptive_context: string } | null,
 *   section: { big_idea: string } | null,
 * }}
 */
export function normalizeSermon(sermon) {
  const seriesTitle         = sermon?.series?.title            ?? null;
  const seriesBigIdea       = sermon?.series?.big_idea         ?? null;
  const seriesMotivation    = sermon?.series?.series_motivation ?? "";
  const seriesRedemptive    = sermon?.series?.redemptive_context ?? "";
  const series = (seriesTitle !== null || seriesBigIdea !== null)
    ? { title: seriesTitle ?? "", big_idea: seriesBigIdea ?? "", series_motivation: seriesMotivation, redemptive_context: seriesRedemptive }
    : null;

  const sectionBigIdea = sermon?.section?.big_idea ?? null;
  const section = sectionBigIdea !== null
    ? { big_idea: sectionBigIdea }
    : null;

  return {
    passage:             sermon?.passage             ?? "",
    mpt:                 sermon?.mpt                 ?? "",
    mps:                 sermon?.mps                 ?? "",
    outline:             getOutline(sermon),
    functionalElements:  getFunctionalElements(sermon),
    series,
    section,
    topic_theme:          sermon?.topic_theme          ?? "",
    audience_assumptions: sermon?.audience_assumptions ?? "",
    background_noise:     sermon?.background_noise     ?? "",
  };
}

/**
 * Compress exegesis fields into a single concise paragraph.
 * Skips any field that is empty. Returns "" if all fields are empty.
 *
 * @param {object} sermon — raw or normalized sermon record
 * @returns {string}
 */
export function summarizeExegesis(sermon) {
  // Detect structured JSON in any exegesis column — if found, use the
  // structured flattener which knows about per-question fields.
  const cols = [sermon?.observations, sermon?.interpretation, sermon?.redemptive_thread, sermon?.implications];
  const hasStructured = cols.some(c => typeof c === "string" && c.trim().startsWith("{"));
  if (hasStructured) return flattenExegesis(sermon);

  // Legacy plain-text path
  const parts = [
    sermon?.observations      && `Observations: ${sermon.observations.trim()}`,
    sermon?.interpretation    && `Interpretation: ${sermon.interpretation.trim()}`,
    sermon?.redemptive_thread && `Redemptive thread: ${sermon.redemptive_thread.trim()}`,
    sermon?.implications      && `Implications: ${sermon.implications.trim()}`,
  ].filter(Boolean);

  return parts.join(" | ");
}

/**
 * Reduce an outline array to one short line per point.
 * Strips leading numbering if present (e.g. "1. Point" → "Point").
 * Handles both new {id, text}[] shape and legacy string[] shape.
 * Returns "" if the outline is empty.
 *
 * @param {Array<{id: string, text: string}|string>} outline
 * @returns {string}
 */
export function summarizeOutline(outline) {
  if (!outline || outline.length === 0) return "";
  return outline
    .map((point, i) => {
      // New shape: {id, text} object
      const raw = (typeof point === "object" && point !== null) ? point.text : String(point);
      const text = String(raw ?? "").trim().replace(/^\d+\.\s*/, "");
      return `${i + 1}. ${text}`;
    })
    .join(" | ");
}

/**
 * Combine series context fields and section big idea into a single sentence.
 * Priority order (for natural trimming): big_idea, series_motivation,
 * redemptive_context, section big_idea. Fields excluded by design:
 * book_background, book_argument, book_structure, emerging_big_idea
 * (too large for per-sermon context; belong in the Series Planner only).
 * Returns "" if no fields have content.
 *
 * @param {{ title: string, big_idea: string, series_motivation: string, redemptive_context: string } | null} series
 * @param {{ big_idea: string } | null} section
 * @returns {string}
 */
export function summarizeSeries(series, section) {
  const parts = [
    series?.big_idea?.trim()           && `Series: ${series.big_idea.trim()}`,
    series?.series_motivation?.trim()  && `Motivation: ${series.series_motivation.trim()}`,
    series?.redemptive_context?.trim() && `Redemptive context: ${series.redemptive_context.trim()}`,
    section?.big_idea?.trim()          && `Section: ${section.big_idea.trim()}`,
  ].filter(Boolean);

  return parts.join("; ");
}

// Stop-words excluded from keyword extraction to avoid spurious matches.
const STOP_WORDS = new Set([
  // articles / conjunctions / prepositions
  "a", "an", "the", "and", "or", "but", "nor", "yet", "so",
  "in", "on", "at", "to", "for", "of", "with", "by", "from",
  "into", "upon", "onto", "over", "under", "about", "through",
  "between", "among", "against", "within", "without", "along",
  // copulas / auxiliaries
  "is", "are", "was", "were", "be", "been", "being",
  "has", "have", "had", "do", "did", "does",
  "will", "would", "can", "could", "may", "might", "shall", "should",
  // pronouns
  "i", "me", "my", "we", "our", "us",
  "he", "him", "his", "she", "her", "it", "its",
  "they", "them", "their", "you", "your",
  // determiners / common particles
  "this", "that", "these", "those", "which", "who", "whom", "what",
  "as", "if", "not", "no", "nor", "also", "then", "when", "how",
  "all", "any", "both", "each", "more", "most", "own", "same", "than",
]);

/**
 * Extract meaningful lowercase words from a string, filtering stop-words
 * and tokens shorter than 3 characters.
 *
 * @param {string} text
 * @returns {Set<string>}
 */
function extractKeywords(text) {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  );
}

/**
 * Extract the book name from a passage string (the leading word(s) before any chapter:verse).
 * Handles multi-word books like "1 Corinthians" or "Song of Solomon".
 * Returns "" if passage is empty.
 *
 * @param {string} passage  e.g. "Galatians 1:1-10" or "1 Corinthians 13:1"
 * @returns {string}        e.g. "galatians" or "1 corinthians"
 */
function extractBookName(passage) {
  if (!passage) return "";
  // Strip the chapter:verse portion (digits, colons, hyphens at the end).
  return passage.replace(/\s*\d+:\d+[\d\-–]*\s*$/, "").trim().toLowerCase();
}

/**
 * Count how many keywords from `target` appear as whole tokens in `chunkKeywords`.
 * Both arguments are pre-extracted keyword Sets, so matching is token-exact —
 * "man" will not match "manifold" or "command".
 *
 * @param {Set<string>} chunkKeywords  — extracted from the chunk being scored
 * @param {Set<string>} targetKeywords — extracted from MPT, MPS, outline, etc.
 * @returns {number}
 */
function countMatches(chunkKeywords, targetKeywords) {
  if (chunkKeywords.size === 0 || targetKeywords.size === 0) return 0;
  let count = 0;
  for (const kw of targetKeywords) {
    if (chunkKeywords.has(kw)) count++;
  }
  return count;
}

/**
 * Score and sort chunks by relevance to the current sermon context.
 *
 * Scoring per chunk:
 *   +5 if the passage book name appears in the chunk
 *   +4 per MPT keyword match
 *   +3 per MPS keyword match
 *   +2 per outline keyword match
 *   +1 per general keyword overlap (mpt ∪ mps ∪ outline words)
 *
 * Chunks with equal scores retain their original order (stable sort).
 * Returns a new array — does not mutate the input.
 *
 * @param {string[]} chunks     — text chunks to rank
 * @param {object}   normalized — output of normalizeSermon()
 * @returns {string[]}          — same chunks, sorted by score DESC
 */
export function rankChunks(chunks, normalized) {
  if (!chunks || chunks.length === 0) return [];

  const bookName    = extractBookName(normalized.passage);
  const mptKeywords = extractKeywords(normalized.mpt);
  const mpsKeywords = extractKeywords(normalized.mps);
  const outlineKeywords = new Set(
    normalized.outline.flatMap(point => {
      const text = (typeof point === "object" && point !== null) ? point.text : String(point ?? "");
      return [...extractKeywords(text)];
    })
  );
  const generalKeywords = new Set([...mptKeywords, ...mpsKeywords, ...outlineKeywords]);

  const scored = chunks.map((chunk, originalIndex) => {
    let score = 0;

    // Book name is a phrase (possibly multi-word), so phrase-level includes is correct here.
    if (bookName && chunk.toLowerCase().includes(bookName)) score += 5;

    // All other scoring uses token-exact set intersection via countMatches.
    const chunkKeywords = extractKeywords(chunk);
    score += countMatches(chunkKeywords, mptKeywords)     * 4;
    score += countMatches(chunkKeywords, mpsKeywords)     * 3;
    score += countMatches(chunkKeywords, outlineKeywords) * 2;
    score += countMatches(chunkKeywords, generalKeywords) * 1;

    return { chunk, score, originalIndex };
  });

  scored.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);

  return scored.map(s => s.chunk);
}

// Character budget per tier.
const TIER_LIMITS = Object.freeze({
  tier1: 1500,
  tier2: 2500,
  tier3: 2500,
  tier4: 1200,
  tier5: 3000,
});

/**
 * Truncate a string to at most `max` characters. Returns the original string
 * if it is already within the limit (including null/undefined → "").
 *
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
function trimStr(str, max) {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max);
}

/**
 * Trim the string values inside a functionalElements object to fit within
 * `budget` characters (measured as JSON serialization length).
 * If it already fits, the original object is returned unchanged.
 * If trimming is needed, each string field across all entries is scaled
 * proportionally so no single field is penalised more than another.
 *
 * @param {object} obj     — { [index]: { explanation, application, illustration } }
 * @param {number} budget
 * @returns {object}
 */
function trimFunctionalElements(obj, budget) {
  if (!obj || typeof obj !== "object") return {};
  if (JSON.stringify(obj).length <= budget) return obj;

  // Collect all (entryKey, fieldKey, value) triples that are strings.
  const entries = Object.entries(obj);
  let totalLen = 0;
  const fields = [];
  for (const [entryKey, entry] of entries) {
    if (!entry || typeof entry !== "object") continue;
    for (const [fieldKey, val] of Object.entries(entry)) {
      if (typeof val === "string") {
        fields.push({ entryKey, fieldKey, val });
        totalLen += val.length;
      }
    }
  }

  // Scale factor: how much of each string we can keep.
  const scale = totalLen > 0 ? Math.min(1, budget / totalLen) : 1;

  // Rebuild with trimmed values.
  const result = {};
  for (const [entryKey, entry] of entries) {
    if (!entry || typeof entry !== "object") {
      result[entryKey] = entry;
      continue;
    }
    const trimmedEntry = {};
    for (const [fieldKey, val] of Object.entries(entry)) {
      trimmedEntry[fieldKey] = typeof val === "string"
        ? val.slice(0, Math.floor(val.length * scale))
        : val;
    }
    result[entryKey] = trimmedEntry;
  }
  return result;
}

// Maximum characters a single tier-5 chunk may contribute.
// Enforces source diversity — no one chunk can dominate the 3000-char budget.
const TIER5_CHUNK_CAP = 1200;

/**
 * Greedily pick chunks from two pre-ranked arrays until the combined
 * character total reaches `limit`. Each chunk is capped at TIER5_CHUNK_CAP
 * before counting toward the total, ensuring no single source dominates.
 * Library chunks are drawn first (the pastor's own prior work); theology fills
 * the remainder.
 *
 * @param {string[]} library   — already ranked by rankChunks()
 * @param {string[]} theology  — already ranked by rankChunks()
 * @param {number}   limit     — combined character budget
 * @returns {{ libraryChunks: string[], theologyChunks: string[] }}
 */
function pickTier5Chunks(library, theology, limit) {
  let remaining = limit;
  const pickedLibrary  = [];
  const pickedTheology = [];

  for (const chunk of library) {
    if (remaining <= 0) break;
    const capped = trimStr(chunk, TIER5_CHUNK_CAP);
    if (capped.length <= remaining) {
      pickedLibrary.push(capped);
      remaining -= capped.length;
    }
  }

  for (const chunk of theology) {
    if (remaining <= 0) break;
    const capped = trimStr(chunk, TIER5_CHUNK_CAP);
    if (capped.length <= remaining) {
      pickedTheology.push(capped);
      remaining -= capped.length;
    }
  }

  return { libraryChunks: pickedLibrary, theologyChunks: pickedTheology };
}

/**
 * Determine which tiers and chunk sources to include for a given step.
 * Tier 1 is always included and not listed here.
 * Every known step is mapped explicitly — there is no default/catch-all.
 * Unknown steps get tier1 only (safest fallback, no accidental over-inclusion).
 *
 * @param {string} step
 * @returns {{ tier2: bool, tier3: bool, tier4: bool, library: bool, theology: bool, memory: bool, pastoralContext: bool }}
 */
function resolveIncludes(step) {
  //                                       tier2   tier3   tier4   library theology memory  pastoralContext
  switch (step) {
    case PHASES.OBSERVE:
      return { tier2: false, tier3: false, tier4: false, library: false, theology: false, memory: false, pastoralContext: true };

    case PHASES.INTERPRET:
      return { tier2: true,  tier3: false, tier4: false, library: false, theology: false, memory: false, pastoralContext: true };

    case PHASES.REDEMPTIVE_THREAD:
      return { tier2: true,  tier3: false, tier4: false, library: false, theology: true,  memory: false, pastoralContext: true };

    case PHASES.IMPLICATIONS:
      return { tier2: true,  tier3: false, tier4: true,  library: false, theology: false, memory: false, pastoralContext: true };

    case STEPS.MPT_MPS:
      return { tier2: true,  tier3: false, tier4: true,  library: false, theology: false, memory: true,  pastoralContext: true };

    case STEPS.OUTLINE:
    case "outline":
      return { tier2: true,  tier3: true,  tier4: true,  library: false, theology: false, memory: true,  pastoralContext: true };

    case STEPS.FUNCTIONAL_ELEMENTS:
      return { tier2: true,  tier3: true,  tier4: true,  library: false, theology: false, memory: true,  pastoralContext: true };

    case "manuscript":
      return { tier2: true,  tier3: true,  tier4: true,  library: true,  theology: true,  memory: true,  pastoralContext: true };

    case STEPS.EXEGESIS:
    case "study":
    case "delivery":
    default:
      // Unknown or top-level step — tier1 only. Callers should use a phase-level
      // or tab-level step; this branch signals a missing mapping, not a feature.
      return { tier2: false, tier3: false, tier4: false, library: false, theology: false, memory: false, pastoralContext: true };
  }
}

/**
 * Group pre-computed context data into priority tiers, filtered by step.
 * Excluded tiers are returned as null. Tier 1 is always included.
 * Tier 4 is additionally suppressed when no series big_idea exists.
 *
 * @param {object}   options
 * @param {object}   options.normalized      — output of normalizeSermon()
 * @param {object}   options.compressed      — { exegesis, outline, series } strings from summarize*()
 * @param {string[]} options.libraryChunks   — retrieved library passages
 * @param {string[]} options.theologyChunks  — retrieved theology passages
 * @param {string}   options.step            — active step/tab identifier
 * @returns {{
 *   tier1: { passage: string, mpt: string },
 *   tier2: { mps: string, exegesis: string } | null,
 *   tier3: { outline: string, functionalElements: object } | null,
 *   tier4: { series: string } | null,
 *   tier5: { libraryChunks: string[], theologyChunks: string[] } | null,
 *   tier6: string | null,
 *   tier7: string | null,
 * }}
 */
export function buildTiers({ normalized, compressed, libraryChunks = [], theologyChunks = [], step }) {
  const inc = resolveIncludes(step);

  // Theology toggle override: when chunks were fetched (user explicitly enabled
  // the theology toggle), bypass step gating so they always reach context.
  if (theologyChunks.length > 0) inc.theology = true;

  // Tier 1 — always included. Budget split 60/40 so both fields always survive.
  const t1PassageBudget = Math.floor(TIER_LIMITS.tier1 * 0.6);
  const t1MptBudget     = TIER_LIMITS.tier1 - t1PassageBudget;
  const t1passage = trimStr(normalized.passage, t1PassageBudget);
  const t1mpt     = trimStr(normalized.mpt,     t1MptBudget);

  // Tier 2 — mps priority, exegesis fills remainder.
  let tier2 = null;
  if (inc.tier2) {
    const mps      = trimStr(normalized.mps, TIER_LIMITS.tier2);
    const exegesis = trimStr(compressed.exegesis, TIER_LIMITS.tier2 - mps.length);
    tier2 = { mps, exegesis };
  }

  // Tier 3 — outline priority, functionalElements fills remainder.
  let tier3 = null;
  if (inc.tier3) {
    const outline            = trimStr(compressed.outline, TIER_LIMITS.tier3);
    const functionalElements = trimFunctionalElements(
      normalized.functionalElements,
      TIER_LIMITS.tier3 - outline.length
    );
    tier3 = { outline, functionalElements, outlineArr: normalized.outline };
  }

  // Tier 4 — suppressed when step excludes it or series has no usable context.
  // Content comes from summarizeSeries(): big_idea, series_motivation, redemptive_context, section big_idea.
  let tier4 = null;
  if (inc.tier4 && compressed.series) {
    tier4 = { series: trimStr(compressed.series, TIER_LIMITS.tier4) };
  }

  // Tier 5 — rank each source, then pick within combined budget.
  // Redemptive Thread: theology only. Manuscript/default: both.
  let tier5 = null;
  if (inc.library || inc.theology) {
    const rankedLibrary  = inc.library  ? rankChunks(libraryChunks,  normalized) : [];
    const rankedTheology = inc.theology ? rankChunks(theologyChunks, normalized) : [];
    tier5 = pickTier5Chunks(rankedLibrary, rankedTheology, TIER_LIMITS.tier5);
  }

  // Tier 6 — pastoral memory context. Gated by step; null when step excludes memory.
  let tier6 = null;
  if (inc.memory) {
    const tier6raw = buildMemoryContext(getMemory(), step);
    if (tier6raw.length > 0) tier6 = tier6raw;
  }

  // Tier 7 — pastoral intelligence. Always-on (pastoralContext: true at every step).
  // Gated by content, not step: only emits when at least one field has content.
  // Budget: 800 chars shared across the three fields.
  let tier7 = null;
  if (inc.pastoralContext) {
    const PASTORAL_BUDGET = 800;
    const fields = [
      normalized.topic_theme?.trim()          && `Topic/Theme: ${trimStr(normalized.topic_theme.trim(),          PASTORAL_BUDGET)}`,
      normalized.audience_assumptions?.trim() && `Audience: ${trimStr(normalized.audience_assumptions.trim(),   PASTORAL_BUDGET)}`,
      normalized.background_noise?.trim()     && `Background: ${trimStr(normalized.background_noise.trim(),     PASTORAL_BUDGET)}`,
    ].filter(Boolean);
    if (fields.length > 0) {
      // Apply shared budget: trim the joined string if it exceeds PASTORAL_BUDGET.
      const joined = fields.join("\n");
      tier7 = joined.length <= PASTORAL_BUDGET ? joined : joined.slice(0, PASTORAL_BUDGET).trimEnd();
    }
  }

  return {
    tier1: { passage: t1passage, mpt: t1mpt },
    tier2,
    tier3,
    tier4,
    tier5,
    tier6,
    tier7,
  };
}

/**
 * Format a functionalElements object as plain text lines.
 * Iterates the outline array in order, looks up fe[point.id] for each point.
 * Each entry is rendered as "Point N (point text) — Explanation: ... | Application: ... | Illustration: ..."
 * Fields that are empty strings are omitted. Orphan fe keys (no matching outline point) are skipped.
 * Returns "" if nothing has content.
 *
 * @param {object} fe        — { [uuid]: { explanation, application, illustration } }
 * @param {Array}  outline   — { id, text }[] from getOutline()
 * @returns {string}
 */
function formatFunctionalElements(fe, outline) {
  if (!fe || typeof fe !== "object") return "";
  if (!Array.isArray(outline) || outline.length === 0) return "";
  const lines = outline
    .map((point, i) => {
      const pointId = (typeof point === "object" && point !== null) ? point.id : null;
      const pointText = (typeof point === "object" && point !== null) ? point.text : String(point ?? "");
      if (!pointId) return null;
      const entry = fe[pointId];
      if (!entry || typeof entry !== "object") return null;
      const parts = [
        entry.explanation?.trim()  && `Explanation: ${entry.explanation.trim()}`,
        entry.application?.trim()  && `Application: ${entry.application.trim()}`,
        entry.illustration?.trim() && `Illustration: ${entry.illustration.trim()}`,
      ].filter(Boolean);
      if (parts.length === 0) return null;
      return `  Point ${i + 1} (${pointText}) — ${parts.join(" | ")}`;
    })
    .filter(Boolean);
  return lines.join("\n");
}

/**
 * Return true when a string has substantive content worth including in a prompt.
 * Rejects null, undefined, empty strings, whitespace-only strings, and strings
 * too short to carry real signal (≤ 20 characters after trimming).
 *
 * @param {string} text
 * @returns {boolean}
 */
function isMeaningful(text) {
  return !!(text && text.trim().length > 20);
}

/**
 * Assemble tiers into a structured context string for inclusion in an AI system prompt.
 * Sections are only emitted when they contain meaningful content (isMeaningful).
 * dedupeText is applied to each section individually before assembly so that
 * cleanup is scoped to the section — cross-section structure is never disturbed.
 * Contains data only — no instructions or directives.
 *
 * @param {{
 *   tier1: { passage: string, mpt: string },
 *   tier2: { mps: string, exegesis: string } | null,
 *   tier3: { outline: string, functionalElements: object } | null,
 *   tier4: { series: string } | null,
 *   tier5: { libraryChunks: string[], theologyChunks: string[] } | null,
 *   tier7: string | null,
 * }} tiers
 * @returns {string}
 */
export function assembleContext(tiers) {
  const sections = [];

  // [PASSAGE & MPT]
  {
    const lines = [
      isMeaningful(tiers.tier1?.passage) && `Passage: ${tiers.tier1.passage}`,
      isMeaningful(tiers.tier1?.mpt)     && `MPT: ${tiers.tier1.mpt}`,
    ].filter(Boolean);
    if (lines.length > 0) {
      sections.push(dedupeText(`${CONTEXT_SECTIONS.PASSAGE}\n${lines.join("\n")}`));
    }
  }

  // [THIS SERMON] — pastoral intelligence: topic/theme, audience, background.
  // Emitted after [PASSAGE & MPT] so it is always visible above interpretive work.
  if (tiers.tier7) {
    sections.push(dedupeText(`${CONTEXT_SECTIONS.THIS_SERMON}\n${tiers.tier7}`));
  }

  // [INTERPRETATION]
  if (tiers.tier2) {
    const lines = [
      isMeaningful(tiers.tier2.mps)      && `MPS: ${tiers.tier2.mps}`,
      isMeaningful(tiers.tier2.exegesis) && `Exegesis: ${tiers.tier2.exegesis}`,
    ].filter(Boolean);
    if (lines.length > 0) {
      sections.push(dedupeText(`${CONTEXT_SECTIONS.INTERPRETATION}\n${lines.join("\n")}`));
    }
  }

  // [STRUCTURE]
  if (tiers.tier3) {
    const lines = [];
    if (isMeaningful(tiers.tier3.outline)) lines.push(`Outline: ${tiers.tier3.outline}`);
    const feText = formatFunctionalElements(tiers.tier3.functionalElements, tiers.tier3.outlineArr || []);
    if (isMeaningful(feText)) lines.push(`Functional Elements:\n${feText}`);
    if (lines.length > 0) {
      sections.push(dedupeText(`${CONTEXT_SECTIONS.STRUCTURE}\n${lines.join("\n")}`));
    }
  }

  // [SERIES CONTEXT]
  if (isMeaningful(tiers.tier4?.series)) {
    sections.push(dedupeText(`${CONTEXT_SECTIONS.SERIES}\n${tiers.tier4.series}`));
  }

  // [SUPPORTING MATERIAL]
  if (tiers.tier5) {
    const lines = [];
    let hasLibraryLabel = false;
    for (const chunk of (tiers.tier5.libraryChunks || [])) {
      if (isMeaningful(chunk)) {
        if (!hasLibraryLabel) { lines.push("Library:"); hasLibraryLabel = true; }
        lines.push(`---\n${chunk}\n---`);
      }
    }
    let hasTheologyLabel = false;
    for (const chunk of (tiers.tier5.theologyChunks || [])) {
      if (isMeaningful(chunk)) {
        if (!hasTheologyLabel) { lines.push("Theology:"); hasTheologyLabel = true; }
        lines.push(`---\n${chunk}\n---`);
      }
    }
    if (lines.length > 0) {
      sections.push(dedupeText(`${CONTEXT_SECTIONS.SUPPORTING}\n${lines.join("\n")}`));
    }
  }

  // [PASTOR CONTEXT] — memory-derived pastoral patterns, always last.
  // Placed after all content so it shapes tone without biasing interpretation.
  if (isMeaningful(tiers.tier6)) {
    sections.push(`${CONTEXT_SECTIONS.PASTOR}\n${tiers.tier6}`);
  }

  return sections.join("\n\n");
}

/**
 * Clean up assembled context text:
 *   1. Remove exact duplicate lines (first occurrence kept).
 *   2. Within long prose lines, remove duplicate sentences (first kept).
 *   3. Collapse runs of 3+ consecutive blank lines to a single blank line.
 *   4. Trim trailing whitespace per line and the whole string.
 *
 * Section headers (lines starting with "[") are never deduped so the
 * structural skeleton is always preserved.
 *
 * @param {string} text
 * @returns {string}
 */
export function dedupeText(text) {
  if (!text) return "";

  // Step 1 + 4a: trim trailing whitespace per line; dedupe non-header lines.
  const seenLines = new Set();
  const lines = text.split("\n").map(l => l.trimEnd());

  const afterLineDedupe = lines.filter(line => {
    const key = line.trim();
    if (key === "") return true;                   // preserve blank lines
    if (key.startsWith("[")) return true;          // always keep section headers
    if (key === "---") return true;                // preserve chunk delimiters
    if (seenLines.has(key)) return false;
    seenLines.add(key);
    return true;
  });

  // Step 2: within each substantial prose line, dedupe sentences.
  // A "sentence" is a fragment ending with [.!?] followed by a space.
  // Only applied to lines longer than 60 chars (avoids mangling short labels).
  const afterSentenceDedupe = afterLineDedupe.map(line => {
    if (line.trim() === "" || line.trim().startsWith("[") || line.length <= 60) return line;
    const parts = line.split(/(?<=[.!?]) +/);
    if (parts.length <= 1) return line;
    const seenSentences = new Set();
    return parts
      .filter(part => {
        const key = part.trim();
        if (key.length < 20) return true;          // too short to bother comparing
        if (seenSentences.has(key)) return false;
        seenSentences.add(key);
        return true;
      })
      .join(" ");
  });

  // Step 3: collapse runs of 3+ consecutive blank lines to a single blank line.
  const afterBlankCollapse = [];
  let blankRun = 0;
  for (const line of afterSentenceDedupe) {
    if (line.trim() === "") {
      blankRun++;
      if (blankRun <= 1) afterBlankCollapse.push(line);
    } else {
      blankRun = 0;
      afterBlankCollapse.push(line);
    }
  }

  // Step 4b: trim the whole string.
  return afterBlankCollapse.join("\n").trim();
}

/**
 * Format the persistent memory object into a compact context string for AI prompts.
 * Accepts an explicit memory object, or falls back to getMemory() if omitted.
 * Sections are only emitted when they contain real data.
 * Sections are ordered highest-to-lowest priority so trimming from the end
 * always cuts the least valuable content first:
 *   1. [PATTERN SIGNALS]  — outline movements + recurring phrases (highest)
 *   2. [RECENT THEMES]    — MPTs before passages
 *   3. [PASTORAL PATTERNS]— style fields (lowest)
 * Output is capped at 650 characters.
 *
 * @param {object} [memory]  — memory object (default: current in-memory state)
 * @param {string} [step]    — reserved for future step-level gating; unused now
 * @returns {string}
 */
export function buildMemoryContext(memory, step) {
  const m = memory ?? getMemory();
  if (!m) return "";

  // Signal gate: memory must have at least 1 pattern (outline or phrase) AND
  // at least 2 history items (passages + MPTs combined) before it is injected.
  // A pattern alone is structural noise; history alone lacks craft signal.
  // Both together mean the pastor has done enough real work to make memory useful.
  const patternCount =
    (m.patterns?.outlinePatterns?.length ?? 0) +
    (m.patterns?.phrasePatterns?.length  ?? 0);
  const historyCount =
    (m.history?.recentPassages?.length ?? 0) +
    (m.history?.recentMPTs?.length     ?? 0);
  if (patternCount < 1 || historyCount < 2) return "";

  const sections = [];

  // 1. [PATTERN SIGNALS] — highest priority: outline movements only.
  // phrasePatterns are emitted as adaptive hints in the system prompt, not here,
  // so they never appear in both channels at once.
  const signalLines = [
    m.patterns?.outlinePatterns?.length > 0 &&
      `- Common outline movements: ${m.patterns.outlinePatterns.slice(-3).join("; ")}`,
  ].filter(Boolean);
  if (signalLines.length > 0) {
    sections.push(`[PATTERN SIGNALS]\n${signalLines.join("\n")}`);
  }

  // 2. [RECENT THEMES] — MPTs before passages
  const themeLines = [
    m.history?.recentMPTs?.length > 0 &&
      `- Recent MPTs: ${m.history.recentMPTs.slice(-3).join(" | ")}`,
    m.history?.recentPassages?.length > 0 &&
      `- Recent passages: ${m.history.recentPassages.slice(-5).join(", ")}`,
  ].filter(Boolean);
  if (themeLines.length > 0) {
    sections.push(`[RECENT THEMES]\n${themeLines.join("\n")}`);
  }

  // 3. [PASTORAL PATTERNS] — lowest priority: style fields
  const patternLines = [
    m.style?.tone                && `- Preferred tone: ${m.style.tone}`,
    m.style?.structurePreference && `- Structure tendency: ${m.style.structurePreference}`,
    m.style?.illustrationStyle   && `- Illustration style: ${m.style.illustrationStyle}`,
    m.style?.applicationStyle    && `- Application style: ${m.style.applicationStyle}`,
  ].filter(Boolean);
  if (patternLines.length > 0) {
    sections.push(`[PASTORAL PATTERNS]\n${patternLines.join("\n")}`);
  }

  if (sections.length === 0) return "";

  let result = sections.join("\n\n");
  if (result.length > 650) {
    const cutAt = result.lastIndexOf("\n", 650);
    result = (cutAt > 0 ? result.slice(0, cutAt) : result.slice(0, 650)).trimEnd() + "…";
  }
  return result;
}

/**
 * Derive up to 3 short, actionable hint strings from the pastor's persistent memory.
 * Every hint uses soft language ("consider", "prefer", "if helpful", "where natural").
 * Returns an array of hint strings — never a paragraph.
 * Returns [] when memory is null or no fields carry signal.
 *
 * All fired candidates are shuffled before the cap is applied — no category has default priority.
 * Sources: outlinePatterns, phrasePatterns, recentMPTs conciseness, style fields (all four).
 *
 * These hints belong in the system prompt ONLY — they shape AI behavior, not content.
 * Never inject them into buildContext() output or any sermon data tier.
 * Mixing hints with sermon data would conflate behavior guidance with factual context.
 *
 * @param {object} memory  — memory object from getMemory()
 * @param {string} step    — active step/tab identifier; controls max hints returned
 * @returns {string[]}
 */
// Per-sermon hint rotation state — keyed by sermon id so switching sermons
// never carries over suppressed hints from a previous session.
const _lastHintsBySermon = new Map();

export function buildAdaptiveHints(memory, step, sermonId) {
  if (!memory) return [];

  // Step gating — exegesis observation/interpretation phases must not be influenced.
  const STEP_CAPS = {
    [PHASES.OBSERVE]:           0,
    [PHASES.INTERPRET]:         0,
    [PHASES.REDEMPTIVE_THREAD]: 0,
    [PHASES.IMPLICATIONS]:      0,
    [STEPS.MPT_MPS]:            2,
    [STEPS.OUTLINE]:            3,
    "outline":                  3,
    [STEPS.FUNCTIONAL_ELEMENTS]: 3,
    "manuscript":               3,
  };
  const cap = STEP_CAPS[step] ?? 0;
  if (cap === 0) return [];

  // Memory threshold — same gate as buildMemoryContext.
  // Requires at least 1 pattern and 2 history items before any adaptation fires.
  const patternCount =
    (memory.patterns?.outlinePatterns?.length ?? 0) +
    (memory.patterns?.phrasePatterns?.length  ?? 0);
  const historyCount =
    (memory.history?.recentPassages?.length ?? 0) +
    (memory.history?.recentMPTs?.length     ?? 0);
  if (patternCount < 1 || historyCount < 2) return [];
  if (!sermonId) return [];

  const candidates = [];

  if ((memory.patterns?.outlinePatterns?.length ?? 0) > 0) {
    candidates.push({ hint: "Consider movement-based progression where it strengthens clarity.", category: "structure" });
  }
  if ((memory.patterns?.phrasePatterns?.length ?? 0) > 0) {
    candidates.push({ hint: "Prefer consistent rhetorical phrasing if it fits the passage.", category: "phrasing" });
  }
  const recentMPTs = memory.history?.recentMPTs ?? [];
  if (recentMPTs.length >= 3) {
    const avgLen = recentMPTs.reduce((sum, mpt) => sum + mpt.length, 0) / recentMPTs.length;
    // Clause count: split each MPT by commas, "and", "or" — count resulting segments.
    const avgClauses = recentMPTs.reduce((sum, mpt) =>
      sum + mpt.split(/,|\band\b|\bor\b/i).length, 0
    ) / recentMPTs.length;
    if (avgLen <= 60 && avgClauses <= 1.5) {
      candidates.push({ hint: "Prefer concise, declarative main points if it fits the passage.", category: "concision" });
    }
  }
  if (memory.style?.tone) {
    candidates.push({ hint: `Prefer a ${memory.style.tone} tone if it fits the passage.`, category: "style" });
  }
  if (memory.style?.structurePreference) {
    candidates.push({ hint: `Consider a ${memory.style.structurePreference} structure where it strengthens clarity.`, category: "structure" });
  }
  if (memory.style?.illustrationStyle) {
    candidates.push({ hint: `Consider ${memory.style.illustrationStyle} illustrations where it strengthens clarity.`, category: "style" });
  }
  if (memory.style?.applicationStyle) {
    candidates.push({ hint: `Prefer ${memory.style.applicationStyle} application framing if it fits the passage.`, category: "style" });
  }

  // Shuffle so no category has default priority — all hints compete equally under the cap.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // One hint per category max — keep first occurrence after shuffle, drop the rest.
  const seenCategories = new Set();
  const dedupedByCategory = candidates.filter(({ category }) => {
    if (seenCategories.has(category)) return false;
    seenCategories.add(category);
    return true;
  }).map(({ hint }) => hint);

  const lastHints = _lastHintsBySermon.get(sermonId) ?? [];
  const lastSet = new Set(lastHints);
  let fresh = dedupedByCategory.filter(h => !lastSet.has(h)).slice(0, cap);

  // Dead-cycle guard: if all candidates were filtered out, allow reuse of 1 previous hint.
  if (fresh.length === 0 && dedupedByCategory.length > 0) {
    fresh = [dedupedByCategory[0]];
  }

  if (sermonId != null) {
    _lastHintsBySermon.set(sermonId, fresh);
    if (_lastHintsBySermon.size > 200) {
      _lastHintsBySermon.delete(_lastHintsBySermon.keys().next().value);
    }
  }
  return fresh;
}

/**
 * Build the context payload for an AI message.
 * Runs the full pipeline: normalize → compress → tier → assemble.
 * dedupeText is applied per-section inside assembleContext, not to the full string.
 * Returns a structured data string (no role or instructions).
 *
 * @param {object}   options
 * @param {object}   options.sermon          — current sermon record (may be null)
 * @param {string}   options.step            — active step or tab identifier
 * @param {string[]} options.libraryChunks   — retrieved library passages
 * @param {string[]} options.theologyChunks  — retrieved theology passages
 * @returns {string} structured context string
 */
export function buildContext({ sermon, step, libraryChunks = [], theologyChunks = [] }) {
  const normalized = normalizeSermon(sermon);
  const compressed = {
    exegesis: summarizeExegesis(sermon),
    outline:  summarizeOutline(normalized.outline),
    series:   summarizeSeries(normalized.series, normalized.section),
  };
  const tiers = buildTiers({ normalized, compressed, libraryChunks, theologyChunks, step });
  const result = assembleContext(tiers);

  if (result.trim().length >= 50) return result;

  // Fallback: assembled context is empty or too sparse to be useful.
  // Return a minimal anchor so the AI always has the core theological reference.
  const fallbackLines = [
    normalized.passage && `Passage: ${normalized.passage}`,
    normalized.mpt     && `MPT: ${normalized.mpt}`,
  ].filter(Boolean);
  return fallbackLines.length > 0
    ? `${CONTEXT_SECTIONS.PASSAGE}\n${fallbackLines.join("\n")}`
    : "";
}
