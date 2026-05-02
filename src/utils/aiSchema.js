// aiSchema.js
// Structural-shape validators for AI JSON outputs at parse boundaries.
// Validators only check shape (object vs array, required keys present, value
// types correct). They do NOT check content (e.g. whether a verse reference is
// well-formed). This keeps the false-negative rate low — better to let an
// imperfect-but-usable response through than block valid output.
//
// Each validator returns { ok: true, value } on success, or
// { ok: false, reason } on failure. `reason` is a short user-facing string.

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Strip ```json fences and surrounding whitespace, then JSON.parse. Used at
// every wire-up site so the regex stays in one place.
export function parseAIJson(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, reason: "AI returned an empty response." };
  }
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  let parsed;
  try { parsed = JSON.parse(cleaned); }
  catch { return { ok: false, reason: "AI response was not valid JSON." }; }
  return { ok: true, value: parsed };
}

// Incorporate flow — `mpt_mps` config. Expects { mpt: string, mps: string }.
export function validateIncorporateMptMps(value) {
  if (!isPlainObject(value)) return { ok: false, reason: "Expected an object with `mpt` and `mps` fields." };
  if (typeof value.mpt !== "string") return { ok: false, reason: "`mpt` is missing or not a string." };
  if (typeof value.mps !== "string") return { ok: false, reason: "`mps` is missing or not a string." };
  return { ok: true, value };
}

// Incorporate flow — structured-field config. Expects an object whose keys
// match config.fieldDefs[].key, with string values for each. The buildIncorporatePrompt
// asks the model to "include all keys", so we enforce that.
export function validateIncorporateStructuredField(value, fieldDefs) {
  if (!isPlainObject(value)) return { ok: false, reason: "Expected an object with one entry per field." };
  if (!Array.isArray(fieldDefs)) return { ok: false, reason: "Field definitions missing — internal error." };
  for (const def of fieldDefs) {
    if (!(def.key in value)) return { ok: false, reason: `Missing field: ${def.label || def.key}.` };
    if (typeof value[def.key] !== "string") return { ok: false, reason: `Field \`${def.label || def.key}\` is not a string.` };
  }
  return { ok: true, value };
}

// Populate Scripture (StudyTab). Expects { "1": "ref", "2": "ref", ... } where
// keys are stringified numbers and values are non-empty strings. Empty/blank
// values are tolerated and skipped downstream — only structurally bad shapes
// are rejected here.
export function validateScriptureMap(value) {
  if (!isPlainObject(value)) return { ok: false, reason: "Expected an object mapping point numbers to verse references." };
  const keys = Object.keys(value);
  if (keys.length === 0) return { ok: false, reason: "AI returned no verse mappings." };
  for (const k of keys) {
    if (!/^\d+$/.test(k)) return { ok: false, reason: `Unexpected key \`${k}\` — keys must be numeric.` };
    const v = value[k];
    if (v != null && typeof v !== "string") return { ok: false, reason: `Mapping for point ${k} is not a string.` };
  }
  return { ok: true, value };
}

// CMC (DeliveryTab). Expects { spine?: string, blocks: Array<{ id, movement,
// trigger_phrase, core_claim }> }. Block fields are required strings — the
// summary preview reads each one directly, so a missing field would render
// `undefined`.
const CMC_BLOCK_FIELDS = ["id", "movement", "trigger_phrase", "core_claim"];

export function validateCMC(value) {
  if (!isPlainObject(value)) return { ok: false, reason: "Expected an object with a `blocks` array." };
  if (value.spine != null && typeof value.spine !== "string") {
    return { ok: false, reason: "`spine` must be a string when present." };
  }
  if (!Array.isArray(value.blocks)) return { ok: false, reason: "`blocks` is missing or not an array." };
  if (value.blocks.length === 0) return { ok: false, reason: "AI returned no preaching blocks." };
  for (let i = 0; i < value.blocks.length; i += 1) {
    const b = value.blocks[i];
    if (!isPlainObject(b)) return { ok: false, reason: `Block ${i + 1} is not an object.` };
    for (const f of CMC_BLOCK_FIELDS) {
      if (typeof b[f] !== "string") return { ok: false, reason: `Block ${i + 1} is missing \`${f}\`.` };
    }
  }
  return { ok: true, value };
}
