// tags.js — sermon-level topic tags (Coverage Initiative, Phase 3).
//
// The `sermons.tags` column is a JSON array of free-form topic strings, stored
// like `thresholds_seen` (TEXT NOT NULL DEFAULT '[]'). These helpers convert
// between the stored string and a clean string[] — fail-soft, so a malformed
// value (hand-edited DB, older row) degrades to an empty list rather than
// throwing. AI-free: tags are the pastor's own words, never machine-suggested.

// Parse a stored `tags` value into a trimmed, non-empty string[]. Accepts the
// JSON string, an already-parsed array, or null/garbage (→ []).
export function parseTags(raw) {
  let arr = raw;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try { arr = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim());
}

// Trim + drop blanks + de-duplicate a tag list case-insensitively (first-seen
// casing wins), preserving order, so a sermon never carries "Money" beside
// "money". Shared by serializeTags and the workspace's live autocomplete merge
// — one de-dupe spec for the renderer. (The main-process get-all-tags scan
// repeats this inline because it's CommonJS and can't import this ES module,
// the same module-boundary reason SERMON_COLUMNS is mirrored rather than shared.)
export function dedupeTags(tags) {
  const byLower = new Map();
  for (const t of Array.isArray(tags) ? tags : []) {
    if (typeof t !== "string") continue;
    const trimmed = t.trim();
    if (trimmed && !byLower.has(trimmed.toLowerCase())) byLower.set(trimmed.toLowerCase(), trimmed);
  }
  return [...byLower.values()];
}

// Serialize a string[] back to the stored JSON form (trimmed, de-duped).
export function serializeTags(tags) {
  return JSON.stringify(dedupeTags(tags));
}
