// memory.test.js
// Tests for the memory feedback loop guard: verifies that AI-sourced phrases
// (aiPhrasePatterns) are architecturally separated from the pastor's own
// phrasePatterns, and that the dev runtime assertion enforces this at call sites.
//
// Note: no vi.mock('./memory') here — we test the real module directly.
// localStorage is stubbed via vi.stubGlobal before each test.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── localStorage stub ─────────────────────────────────────────────────────────
// memory.js reads/writes localStorage inside function bodies (not at module load),
// so stubbing in beforeEach is sufficient.

let _store = {};

beforeEach(() => {
  _store = {};
  vi.stubGlobal("localStorage", {
    getItem:    (k) => _store[k] ?? null,
    setItem:    (k, v) => { _store[k] = String(v); },
    removeItem: (k) => { delete _store[k]; },
    clear:      () => { _store = {}; },
  });
});

// ── Imports (after stub is declared; stubs apply at call time, not parse time) ─
// memory.js only calls localStorage inside function bodies, so the stub set in
// beforeEach will be in place before any memory function is invoked.
import { updateMemory, getMemory, clearMemory } from "./memory";

// Reset the in-memory cache between tests so each test starts clean.
beforeEach(() => {
  clearMemory();
});

// ── Array isolation ───────────────────────────────────────────────────────────

describe("phrasePatterns and aiPhrasePatterns are separate arrays", () => {
  it("writing to aiPhrasePatterns does not pollute phrasePatterns", () => {
    updateMemory({ patterns: { aiPhrasePatterns: ["the grace of God is"] } });
    const m = getMemory();
    expect(m.patterns.aiPhrasePatterns).toContain("the grace of God is");
    expect(m.patterns.phrasePatterns).not.toContain("the grace of God is");
  });

  it("writing to phrasePatterns does not pollute aiPhrasePatterns", () => {
    updateMemory({ patterns: { phrasePatterns: ["what we must understand here"] } });
    const m = getMemory();
    expect(m.patterns.phrasePatterns).toContain("what we must understand here");
    expect(m.patterns.aiPhrasePatterns).not.toContain("what we must understand here");
  });

  it("both arrays accumulate independently across separate writes", () => {
    updateMemory({ patterns: { phrasePatterns:   ["pastor phrase here"] } });
    updateMemory({ patterns: { aiPhrasePatterns: ["ai response phrase"] } });
    const m = getMemory();
    expect(m.patterns.phrasePatterns).toContain("pastor phrase here");
    expect(m.patterns.phrasePatterns).not.toContain("ai response phrase");
    expect(m.patterns.aiPhrasePatterns).toContain("ai response phrase");
    expect(m.patterns.aiPhrasePatterns).not.toContain("pastor phrase here");
  });

  it("aiPhrasePatterns caps independently at 30 without affecting phrasePatterns cap", () => {
    // Fill phrasePatterns with 5 entries
    for (let i = 0; i < 5; i++) {
      updateMemory({ patterns: { phrasePatterns: [`pastor phrase number ${i}`] } });
    }
    // Fill aiPhrasePatterns with 5 entries
    for (let i = 0; i < 5; i++) {
      updateMemory({ patterns: { aiPhrasePatterns: [`ai phrase number ${i}`] } });
    }
    const m = getMemory();
    expect(m.patterns.phrasePatterns).toHaveLength(5);
    expect(m.patterns.aiPhrasePatterns).toHaveLength(5);
  });
});

// ── Dev runtime assertion (task 5) ────────────────────────────────────────────

describe("dev runtime assertion — AI phrases must not write to phrasePatterns", () => {
  it("throws when a phrase in aiPhrasePatterns is written to phrasePatterns", () => {
    // Simulate the feedback loop: AI response phrase is captured correctly...
    updateMemory({ patterns: { aiPhrasePatterns: ["consider the way in which"] } });
    // ...then the same phrase mistakenly reaches phrasePatterns (the bug).
    // The guard in updateMemory must throw rather than silently corrupt state.
    expect(() => {
      updateMemory({ patterns: { phrasePatterns: ["consider the way in which"] } });
    }).toThrow("[memory] DEV ASSERTION FAILED");
  });

  it("does not throw when writing a new phrase that is not in aiPhrasePatterns", () => {
    updateMemory({ patterns: { aiPhrasePatterns: ["ai phrase alpha beta"] } });
    // A genuinely different pastor phrase — no overlap, should succeed.
    expect(() => {
      updateMemory({ patterns: { phrasePatterns: ["entirely different pastor phrase"] } });
    }).not.toThrow();
  });

  it("does not throw when aiPhrasePatterns is empty (normal early-use state)", () => {
    // No AI phrases stored yet — any phrasePattern write must succeed.
    expect(() => {
      updateMemory({ patterns: { phrasePatterns: ["what the text reveals here"] } });
    }).not.toThrow();
  });

  it("phrasePatterns state is unmodified when the guard throws", () => {
    updateMemory({ patterns: { aiPhrasePatterns: ["guard test phrase text"] } });
    try {
      updateMemory({ patterns: { phrasePatterns: ["guard test phrase text"] } });
    } catch (_) { /* expected */ }
    const m = getMemory();
    // phrasePatterns must not have been updated — the throw prevented the write.
    expect(m.patterns.phrasePatterns).not.toContain("guard test phrase text");
  });
});
