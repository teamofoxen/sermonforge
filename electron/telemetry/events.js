// electron/telemetry/events.js — single registry of telemetry event types.
//
// New event types must be added here AND named in docs/REFERENCE/privacy.md
// (when Chunk 6 ships) so what we capture stays disclosed.

const EVENT_TYPES = Object.freeze({
  APP_OPEN: "app-open",
  PANEL_TIME: "panel-time",             // payload: { surface, durationMs }
  FIELD_TIME: "field-time",             // payload: { field, durationMs }
  SERMON_CREATE: "sermon-create",       // payload: { sermonId }
  SERMON_FINISH: "sermon-finish",       // payload: { sermonId }
  CRASH: "crash",                       // payload: { error: string }
});

function isKnown(eventType) {
  return Object.values(EVENT_TYPES).includes(eventType);
}

module.exports = { EVENT_TYPES, isKnown };
