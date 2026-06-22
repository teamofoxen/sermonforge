export function tryParse(val, fallback) {
  try { return JSON.parse(val) || fallback; } catch { return fallback; }
}

// ── Typed JSON column accessors ───────────────────────────────────────────────
// Use these instead of calling tryParse() directly on sermon JSON fields.
// Each accessor validates shape and logs a warning on malformed data so
// problems surface in the console rather than silently corrupting state.

/**
 * djb2 hash — used to synthesize stable fallback IDs for legacy string outline
 * items encountered at runtime before migration has run. Returns a hex string.
 * @param {string} str
 * @returns {string}
 */
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // keep as unsigned 32-bit
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Create a new outline point object with a stable UUID.
 * This is the single place where new outline points are created.
 * @param {string} text
 * @returns {{ id: string, text: string }}
 */
export function createOutlinePoint(text) {
  return { id: crypto.randomUUID(), text: typeof text === 'string' ? text : '' };
}

/**
 * Read sermons.outline → { id: string, text: string }[]
 * Handles both new shape ({id,text}[]) and legacy shape (string[]).
 * Legacy strings get a deterministic djb2-based fallback ID so that
 * functional_elements lookups remain stable across reads.
 * Returns [] on any failure.
 */
export function getOutline(sermon) {
  const raw = sermon?.outline;
  if (!raw) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.warn(`[getOutline] JSON parse failed (sermon ${sermon?.id}):`, e.message, '| raw:', String(raw).slice(0, 120));
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.warn(`[getOutline] Expected array, got ${typeof parsed} (sermon ${sermon?.id}). Falling back to [].`);
    return [];
  }

  return parsed.map((item, i) => {
    // New shape: {id, text} object
    if (typeof item === 'object' && item !== null && typeof item.id === 'string' && item.id.length > 0) {
      return { id: item.id, text: typeof item.text === 'string' ? item.text : '' };
    }
    // Legacy shape: plain string — synthesize a stable ID from the text content
    if (typeof item === 'string') {
      return { id: `legacy-${djb2(item)}-${i}`, text: item };
    }
    console.warn(`[getOutline] outline[${i}] has unexpected shape (sermon ${sermon?.id}). Coercing.`);
    return { id: `legacy-${i}`, text: String(item ?? '') };
  });
}

/**
 * Serialize a {id, text}[] outline for storage.
 * Validates each entry has a non-empty id and a string text.
 * Returns '[]' and logs an error if the value is not a valid array.
 */
export function serializeOutline(outline) {
  if (!Array.isArray(outline)) {
    console.error(`[serializeOutline] Expected array, got ${typeof outline}. Storing [].`);
    return '[]';
  }
  for (let i = 0; i < outline.length; i++) {
    const item = outline[i];
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || item.id.length === 0 || typeof item.text !== 'string') {
      console.error(`[serializeOutline] outline[${i}] has invalid shape. Storing [].`);
      return '[]';
    }
  }
  return JSON.stringify(outline);
}

/**
 * Read sermons.functional_elements → { [uuid: string]: { explanation, application, illustration } }
 * Returns {} on any failure. Drops malformed entries with a warning.
 * Logs a warning (not error) when numeric-string keys are found — these are
 * legacy records not yet migrated; callers should not attempt runtime migration.
 */
export function getFunctionalElements(sermon) {
  const raw = sermon?.functional_elements;
  if (!raw) return {};

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.warn(`[getFunctionalElements] JSON parse failed (sermon ${sermon?.id}):`, e.message, '| raw:', String(raw).slice(0, 120));
    return {};
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    console.warn(`[getFunctionalElements] Expected plain object, got ${Array.isArray(parsed) ? 'array' : typeof parsed} (sermon ${sermon?.id}). Falling back to {}.`);
    return {};
  }

  // Detect legacy numeric-string keys — migration should have converted these.
  const keys = Object.keys(parsed);
  if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
    console.warn(`[getFunctionalElements] Numeric keys found (sermon ${sermon?.id}) — record is pre-migration. Returning as-is.`);
    return parsed;
  }

  const result = {};
  for (const [key, val] of Object.entries(parsed)) {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) {
      console.warn(`[getFunctionalElements] Entry [${key}] has invalid shape (sermon ${sermon?.id}). Skipping.`);
      continue;
    }
    result[key] = {
      explanation:  typeof val.explanation  === 'string' ? val.explanation  : '',
      application:  typeof val.application  === 'string' ? val.application  : '',
      illustration: typeof val.illustration === 'string' ? val.illustration : '',
      scripture:    typeof val.scripture    === 'string' ? val.scripture    : '',
    };
  }
  return result;
}

/**
 * Serialize a functional_elements object for storage.
 * Returns '{}' and logs an error if the value is not a plain object.
 */
export function serializeFunctionalElements(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    console.error(`[serializeFunctionalElements] Expected plain object, got ${typeof data}. Storing {}.`);
    return '{}';
  }
  return JSON.stringify(data);
}

// ── Manuscript JSON helpers ────────────────────────────────────────────────────

export function parseManuscript(raw) {
  if (!raw) return { introduction: { opener: "", scripture_reading: "", expectation: "" }, transitions: {}, conclusion: { response: "" } };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "introduction" in parsed) return parsed;
  } catch {}
  return { introduction: { opener: "", scripture_reading: "", expectation: "" }, transitions: {}, conclusion: { response: "" } };
}

// Build the payload `sermon-export-manuscript` expects from a sermon record.
// One assembly point shared by every export trigger (workspace topbar, the
// finish screen, Completed/Preached Sermons) so the Word document is the same
// no matter where the pastor asks for it.
export function buildManuscriptExportPayload(sermon) {
  const ms = parseManuscript(sermon?.manuscript);
  return {
    title: sermon?.title || "",
    passage: sermon?.passage || "",
    date: sermon?.date || "",
    mpt: sermon?.mpt || "",
    mps: sermon?.mps || "",
    introduction: ms.introduction || {},
    transitions: ms.transitions || {},
    conclusion: ms.conclusion || {},
    outline: getOutline(sermon),
    functionalElements: getFunctionalElements(sermon),
  };
}

/**
 * Reassemble manuscript sections into a single readable text string for AI prompts and exports.
 */
export function assembleManuscriptText(sermon) {
  const ms = parseManuscript(sermon.manuscript);
  const outline = getOutline(sermon);
  const fes = getFunctionalElements(sermon);
  const parts = [];

  parts.push("INTRODUCTION");
  if (sermon.title) parts.push(`Title: ${sermon.title}`);
  if (sermon.mpt) parts.push(`Main Point of the Text: ${sermon.mpt}`);
  if (sermon.mps) parts.push(`Main Point of the Sermon: ${sermon.mps}`);
  if (ms.introduction?.opener) parts.push(`\nOpener:\n${ms.introduction.opener}`);
  if (ms.introduction?.scripture_reading) parts.push(`\nScripture Reading:\n${ms.introduction.scripture_reading}`);
  if (ms.introduction?.expectation) parts.push(`\nExpectation:\n${ms.introduction.expectation}`);

  outline.forEach((pt, i) => {
    const fe = fes[pt.id] || {};
    const trans = (ms.transitions || {})[pt.id];
    if (trans) parts.push(`\n--- TRANSITION ---\n${trans}`);
    parts.push(`\nPOINT ${i + 1}: ${pt.text}`);
    if (fe.scripture) parts.push(`Scripture: ${fe.scripture}`);
    if (fe.explanation) parts.push(`\nExplanation:\n${fe.explanation}`);
    if (fe.application) parts.push(`\nApplication:\n${fe.application}`);
    if (fe.illustration) parts.push(`\nIllustration:\n${fe.illustration}`);
  });

  const concTrans = (ms.transitions || {}).conclusion;
  if (concTrans) parts.push(`\n--- TRANSITION ---\n${concTrans}`);
  parts.push("\nCONCLUSION");
  if (ms.conclusion?.response) parts.push(`Response:\n${ms.conclusion.response}`);

  return parts.join("\n");
}

/**
 * Auto-resize a textarea to fit its content, capped at 60vh.
 * Wire to both onInput and ref callbacks: onInput={(e) => autoResize(e.target)} ref={(el) => autoResize(el)}
 */
export function autoResize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.6) + "px";
}

// Parse a date-only or datetime string at LOCAL midnight, so a "YYYY-MM-DD" value
// renders as that calendar day instead of being shifted by the timezone offset.
// The shared primitive behind formatDate (here), formatPacingDate (SeriesPlanner),
// and formatMonthYear (Arc) — each appends its own toLocaleDateString options.
export function parseLocalDate(dateStr) {
  // Strip any time component so "2026-03-20 14:23:00" and "2026-03-20T14:23:00"
  // both resolve to the correct local date.
  const datePart = String(dateStr).split(/[T ]/)[0];
  return new Date(`${datePart}T00:00:00`);
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return parseLocalDate(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}
