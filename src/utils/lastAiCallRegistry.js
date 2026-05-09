// Per-surface "most recent AI exchange" registry, keyed by surface slug.
//
// Read by FeedbackFlag when the pastor sends a flag with the
// "Include the AI exchange" checkbox on. Written by sendAIMessage
// (src/utils/ai.js) on every successful AI response.
//
// In-memory only — survives across renders within a session, dies on
// app restart. That matches the flag's semantics: "what was the AI
// just doing here." Stale data after restart is fine; getLastAiCall
// returns null when nothing has happened on a surface yet.

const _registry = new Map();

export function setLastAiCall(surface, callData) {
  if (!surface || !callData) return;
  _registry.set(surface, callData);
}

export function getLastAiCall(surface) {
  if (!surface) return null;
  return _registry.get(surface) || null;
}
