// electron/telemetry/events.js — the single registry of telemetry event
// types AND their exact payload schemas (Session-5 remediation, 2026-07-13).
//
// This file is the executable form of docs/REFERENCE/privacy.md: an event may
// carry ONLY the keys listed here, with the listed value types, capped at the
// listed lengths. Validation runs in TWO places with the same table:
//   1. electron/telemetry/bus.js emit() — before anything persists to the
//      local NDJSON buffer (so a bad emit never even lands on disk), and
//   2. transport/worker.js — before anything persists to D1 (the Worker
//      carries a hand-mirrored copy of this table; the parity is pinned by
//      tests/transport/worker-boundary.test.ts).
// Unknown event names, unknown keys, wrong value types, and over-cap strings
// are all rejected whole. The schemas are structurally incapable of carrying
// sermon content: every string field is short-capped, and no free-text field
// exists except the crash error line, which is bounded and documented below.
//
// RETIRED VOCABULARY (Session 5): panel-time, field-time, sermon-create,
// sermon-finish — defined since BTI Phase 1 but never emitted by any caller
// (grep: zero sites). Removed rather than carried as dead surface; if a
// future feature wants them back it re-adds them HERE plus privacy.md in the
// same change. The D1 `events` table happily stores whatever named types
// exist at that time (event_type is a TEXT column).
//
// CRASH SHAPE (documented sanitized form): { error: string ≤ 500 chars } —
// composed in main.js report-renderer-error as `${label}: ${detail.slice(0,
// 500)}`; the label is a fixed literal ("react-error-boundary"), the detail
// is an Error message + stack head, never sermon field content.

const MAX_SHORT_STRING = 64;   // ids / platform / version-ish fields
const MAX_CRASH_ERROR = 500;   // the one bounded free-text field

const EVENT_TYPES = Object.freeze({
  APP_OPEN: "app-open",
  CRASH: "crash",
});

// key → { type: "string" | "number", max?: chars }  (every key is required)
const EVENT_SCHEMAS = Object.freeze({
  [EVENT_TYPES.APP_OPEN]: Object.freeze({
    version: { type: "string", max: MAX_SHORT_STRING },
    platform: { type: "string", max: MAX_SHORT_STRING },
  }),
  [EVENT_TYPES.CRASH]: Object.freeze({
    error: { type: "string", max: MAX_CRASH_ERROR },
  }),
});

function isKnown(eventType) {
  return Object.prototype.hasOwnProperty.call(EVENT_SCHEMAS, eventType);
}

// validateEvent(eventType, payload) → { ok: true } | { ok: false, reason }.
// Strict on every axis (unknown name / unknown key / missing key / wrong
// type / over cap) so a payload shaped like sermon text can never fit.
function validateEvent(eventType, payload) {
  if (!isKnown(eventType)) return { ok: false, reason: `unknown event type: ${String(eventType).slice(0, 64)}` };
  const schema = EVENT_SCHEMAS[eventType];
  const p = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  if (!p) return { ok: false, reason: "payload must be a plain object" };
  for (const key of Object.keys(p)) {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      return { ok: false, reason: `unknown payload key: ${String(key).slice(0, 64)}` };
    }
  }
  for (const [key, rule] of Object.entries(schema)) {
    const value = p[key];
    if (rule.type === "string") {
      if (typeof value !== "string") return { ok: false, reason: `${key} must be a string` };
      if (rule.max && value.length > rule.max) return { ok: false, reason: `${key} exceeds ${rule.max} chars` };
    } else if (rule.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return { ok: false, reason: `${key} must be a finite number` };
      }
    }
  }
  return { ok: true };
}

module.exports = { EVENT_TYPES, EVENT_SCHEMAS, isKnown, validateEvent, MAX_SHORT_STRING, MAX_CRASH_ERROR };
