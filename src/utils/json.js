// Fail-soft parse of a JSON string into a plain object — the shared skeleton
// behind the app's forgiving JSON-column readers (parseDiscovery,
// parseStudyGuideExtras). null / non-string / malformed / wrong-shape (an array
// or any non-object) all degrade to `fallback` — never throws, never blocks.
// Callers layer their own field validation on top of the returned object.
export function parseJsonObject(raw, fallback = {}) {
  if (!raw || typeof raw !== "string") return fallback;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return fallback;
    return obj;
  } catch {
    return fallback;
  }
}
