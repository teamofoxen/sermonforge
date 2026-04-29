import { STEPS } from "../constants/steps";
import { backupMemory, restoreMemory } from "../db/database";

const STORAGE_KEY = 'sermonforge_memory';

const EMPTY_MEMORY = {
  style: {
    structurePreference: null,
    tone: null,
    illustrationStyle: null,
    applicationStyle: null,
  },
  patterns: {
    outlinePatterns: [],
    phrasePatterns: [],    // pastor's own rhetorical patterns (from manuscript)
    // AI patterns are for analysis only. Never influence generation.
    aiPhrasePatterns: [],
  },
  history: {
    recentMPTs: [],
    recentPassages: [],
  },
};

let _memory = null;

export function loadMemory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _memory = raw ? JSON.parse(raw) : structuredClone(EMPTY_MEMORY);
  } catch (e) {
    console.error('[memory] Failed to load memory from localStorage:', e);
    _memory = structuredClone(EMPTY_MEMORY);
  }
  return _memory;
}

export function saveMemory(memory) {
  try {
    const json = JSON.stringify(memory);
    localStorage.setItem(STORAGE_KEY, json);
    _memory = memory;
    // Write-through backup to userData/memory-backup.json. Fire-and-forget — a
    // failed backup never blocks or surfaces to the user; the in-renderer hot
    // path stays at localStorage speed. Browser preview's stub IPC no-ops here.
    backupMemory(json).catch(() => {});
  } catch (e) {
    console.error('[memory] Failed to save memory to localStorage:', e);
  }
}

// One-shot restore from the userData backup file. Called by App.jsx on mount
// when localStorage is empty (post-Electron-upgrade, fresh install on a machine
// the pastor has used before via OneDrive sync of userData, or manual cache
// clear). No-op when localStorage already has memory or when the backup file
// doesn't exist. Returns the restored memory object, or null when nothing was
// restored.
export async function restoreMemoryFromBackup() {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return null; // already populated, leave it
    const result = await restoreMemory();
    if (!result?.ok || !result.json) return null;
    // Validate before writing — a malformed backup file should not poison localStorage.
    let parsed;
    try { parsed = JSON.parse(result.json); } catch { return null; }
    if (typeof parsed !== "object" || parsed === null) return null;
    localStorage.setItem(STORAGE_KEY, result.json);
    _memory = parsed;
    return parsed;
  } catch (e) {
    console.error('[memory] restoreMemoryFromBackup failed:', e);
    return null;
  }
}

export function getMemory() {
  if (_memory === null) {
    loadMemory();
  }
  return _memory;
}

// Words skipped when extracting outline concepts — subjects, articles, prepositions,
// auxiliaries, and common theological nouns that are agents rather than actions.
const OUTLINE_SKIP_WORDS = new Set([
  // common sermon-outline subjects (agents, not actions)
  'god', 'lord', 'jesus', 'christ', 'he', 'she', 'we', 'they', 'you', 'i',
  // articles / prepositions / conjunctions
  'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'into', 'unto', 'upon', 'and', 'or', 'but', 'yet', 'so', 'nor',
  // auxiliaries / modals
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'will', 'would', 'can', 'could', 'may', 'might', 'shall', 'should',
  'has', 'have', 'had', 'do', 'did', 'does',
  // pronouns / determiners
  'us', 'our', 'his', 'her', 'its', 'their', 'my', 'your',
  'this', 'that', 'these', 'those', 'who', 'whom', 'which',
  // common particles
  'not', 'no', 'all', 'as', 'if', 'when', 'what', 'how', 'then', 'than', 'also',
]);

// Strip common English verb suffixes to reach an approximate base form.
// "calls" → "call", "calling" → "call", "restores" → "restore",
// "restored" → "restore". Not a full stemmer — handles the common cases.
function normalizeVerb(word) {
  if (word.length <= 3) return word;
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed')  && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s')   && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

// Takes an outline (JSON string or array of point strings) and returns a
// verb-normalized abstract pattern: "movement: call → resist → restore".
// Returns null if fewer than 2 points yield a valid concept.
export function extractOutlinePattern(outline) {
  let points;
  if (typeof outline === 'string') {
    try { points = JSON.parse(outline); } catch { return null; }
  } else {
    points = outline;
  }
  if (!Array.isArray(points) || points.length === 0) return null;

  const concepts = points
    .map((p) => {
      const raw = (typeof p === 'object' && p !== null) ? p.text : String(p);
      const words = String(raw ?? '')
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !OUTLINE_SKIP_WORDS.has(w))
        .map(normalizeVerb)
        .filter((w) => w.length >= 3);

      if (words.length === 0) return null;
      // Prefer a single concept word; allow 2 if the first is short (< 4 chars).
      return words[0].length >= 4 ? words[0] : words.slice(0, 2).join(' ');
    })
    .filter(Boolean);

  if (concepts.length < 2) return null;
  return `movement: ${concepts.join(' → ')}`;
}

// First words that disqualify a sentence starter as a rhetorical pattern.
// Pronouns and conjunctions produce accidental matches, not intentional rhetoric.
const PHRASE_SKIP_FIRST_WORDS = new Set([
  'this', 'that', 'these', 'those', 'it', 'its',
  'we', 'i', 'you', 'he', 'she', 'they', 'our', 'my',
  'and', 'but', 'so', 'or', 'nor', 'yet', 'for',
]);

// Returns sentence-starter phrases (first 4 words) that appear 3+ times in text.
// Only considers sentences of 8+ words. Ignores starters beginning with
// pronouns or conjunctions — these reflect grammar, not rhetorical intent.
export function extractPhrasePatterns(text) {
  if (!text?.trim()) return [];

  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 8);

  const starters = sentences
    .map((s) => {
      const words = s
        .replace(/[^a-zA-Z '\-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
      if (PHRASE_SKIP_FIRST_WORDS.has(words[0]?.toLowerCase())) return null;
      return words.slice(0, 3).join(' ').toLowerCase();
    })
    .filter(Boolean);

  const counts = {};
  for (const starter of starters) {
    counts[starter] = (counts[starter] ?? 0) + 1;
  }

  return Object.entries(counts)
    .filter(([, count]) => count >= 2)
    .map(([phrase]) => phrase);
}

export function dedupeAndCap(array, max) {
  const seen = new Set();
  const result = [];
  for (const item of array) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result.slice(-max);
}

function mergeArrayField(existing, incoming, max) {
  return dedupeAndCap([...(existing ?? []), ...(incoming ?? [])], max);
}

export function updateMemory(partial) {
  const current = getMemory();

  // Dev guard: AI-sourced phrases must never write to phrasePatterns (the pastor's own).
  // If this throws, a call site is routing AI response content through the wrong key.
  // Fix the call site — do not remove this guard.
  if (import.meta.env.DEV && partial.patterns?.phrasePatterns?.length > 0) {
    const aiPhrases = new Set(current.patterns?.aiPhrasePatterns ?? []);
    for (const phrase of partial.patterns.phrasePatterns) {
      if (aiPhrases.has(phrase)) {
        throw new Error(
          `[memory] DEV ASSERTION FAILED: phrase "${phrase}" exists in aiPhrasePatterns ` +
          `and cannot be written to phrasePatterns. Use aiPhrasePatterns for AI-sourced phrases.`
        );
      }
    }
  }

  const updated = {
    ...current,
    style: {
      ...current.style,
      ...(partial.style ?? {}),
    },
    patterns: {
      outlinePatterns: mergeArrayField(
        current.patterns.outlinePatterns,
        partial.patterns?.outlinePatterns,
        20
      ),
      phrasePatterns: mergeArrayField(
        current.patterns.phrasePatterns,
        partial.patterns?.phrasePatterns,
        30
      ),
      aiPhrasePatterns: mergeArrayField(
        current.patterns.aiPhrasePatterns,
        partial.patterns?.aiPhrasePatterns,
        30
      ),
    },
    history: {
      recentMPTs: mergeArrayField(
        current.history.recentMPTs,
        partial.history?.recentMPTs,
        10
      ),
      recentPassages: mergeArrayField(
        current.history.recentPassages,
        partial.history?.recentPassages,
        10
      ),
    },
  };

  saveMemory(updated);
  return updated;
}

export function clearMemory() {
  const empty = structuredClone(EMPTY_MEMORY);
  saveMemory(empty);
  return empty;
}

export function logMemory() {
  const m = getMemory();
  console.group('[SermonForge Memory]');
  console.log('Style:',    m.style);
  console.log('Patterns:', m.patterns);
  console.log('History:',  m.history);
  console.groupEnd();
  return m;
}

if (typeof window !== 'undefined') {
  window.memoryDebug = { getMemory, clearMemory, logMemory };
}

// Steps where AI response patterns are worth capturing.
// Exegesis phases are excluded — stylistic patterns shouldn't form during text study.
const CAPTURE_PATTERN_STEPS = new Set(['manuscript', STEPS.OUTLINE, 'outline']);

/**
 * Extract up to 2 phrase patterns from an AI response and store them in memory.
 * Only runs for manuscript and outline steps. Filters out any phrase already in
 * memory or present in the last 3 stored phrases to prevent the AI reinforcing
 * its own output endlessly.
 *
 * @param {string} response — AI response text
 * @param {string} step     — active step identifier
 */
export function captureResponsePatterns(response, step) {
  if (!CAPTURE_PATTERN_STEPS.has(step)) return;
  if (!response?.trim()) return;

  const stored = getMemory()?.patterns?.aiPhrasePatterns ?? [];
  const storedSet = new Set(stored);
  const recentSet = new Set(stored.slice(-3));

  const newPatterns = extractPhrasePatterns(response)
    .slice(0, 2)
    .filter(p => !storedSet.has(p) && !recentSet.has(p));

  if (newPatterns.length === 0) return;
  updateMemory({ patterns: { aiPhrasePatterns: newPatterns } });
}
