// discovery — the one place the Series Discovery reasoning envelope is parsed and
// merged. Discovery and Outline are two views of ONE series: a movement IS a real
// section, a preaching text IS a real sermon, and their canonical fields
// (title/passage/big_idea/overview, section_id) live in their own columns. Only
// the exegetical REASONING the pastor authors in the Discover walk — the words
// that cannot truthfully live in a clean planner field — rides the per-entity
// nullable JSON `discovery` column (v34). AI-free: every value is pastor-typed.
//
// The envelope is a FLAT object of well-known keys per entity (below), so merging
// a single sub-field is a plain spread and can never drop a sibling. Fail-soft:
// null / non-string / malformed / wrong-shape all degrade to {} — never throws,
// never blocks (mirrors parseStudyGuideExtras).
//
//   series.discovery          — Read notes, Understand answers, Difficult
//                               Decisions (array), Series-Big-Idea reasoning +
//                               the two candidates. The FINAL canonical Series Big
//                               Idea is series.big_idea; the Overview is
//                               series.overview — this holds only the working-out.
//   series_sections.discovery — { whyBegin, whyEnd } (movement boundaries).
//   sermons.discovery         — { whyBegin, whyEnd, subject, complement,
//                               authorialFunction } (preaching-text reasoning).

// Parse a `discovery` column value into a plain object. Fail-soft to {}.
export function parseDiscovery(raw) {
  if (!raw || typeof raw !== "string") return {};
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    return obj;
  } catch {
    return {};
  }
}

// Merge a shallow patch into the parsed envelope and return the JSON string to
// persist. Each Discover field edit sends its sub-field's COMPLETE new value, so a
// spread preserves every other sub-field. An array field (series `decisions`) in
// the patch replaces wholesale — the caller owns the array.
export function mergeDiscovery(raw, patch) {
  return JSON.stringify({ ...parseDiscovery(raw), ...patch });
}

// Read the decisions array out of a series discovery envelope (fail-soft to []).
export function decisionsOf(raw) {
  const d = parseDiscovery(raw).decisions;
  return Array.isArray(d) ? d : [];
}

// Up to three honestly-uncertain passage divisions (mission: "a modest place …
// without creating a debate-management subsystem").
export const MAX_DIFFICULT_DECISIONS = 3;

// "What is the author doing here?" — plain, pastor-facing choices for a
// preaching text's authorial function, plus Other (free text). AI-free: these are
// a fixed vocabulary the pastor PICKS from, not a suggestion the system generates.
export const AUTHORIAL_FUNCTIONS = [
  "Commanding",
  "Warning",
  "Encouraging",
  "Explaining",
  "Correcting",
  "Comforting",
  "Rebuking",
  "Exhorting",
  "Defending",
  "Celebrating",
  "Other",
];
