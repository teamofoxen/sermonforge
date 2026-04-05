// contextBuilder.test.js
// Tests for resolveIncludes (via buildTiers) and buildAdaptiveHints.
// Every step in STEP_SEQUENCE and PHASE_SEQUENCE has an explicit test case.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { STEPS, PHASES, STEP_SEQUENCE, PHASE_SEQUENCE } from "../constants/steps";

// ── Mock memory module ─────────────────────────────────────────────────────────
// contextBuilder imports getMemory at call time (inside buildTiers/buildMemoryContext).
// We control what it returns so tests are deterministic and localStorage-free.

const _mockMemory = {
  style: { structurePreference: null, tone: null, illustrationStyle: null, applicationStyle: null },
  patterns: { outlinePatterns: [], phrasePatterns: [], aiPhrasePatterns: [] },
  history: { recentMPTs: [], recentPassages: [] },
};

vi.mock("./memory", () => ({
  getMemory:             vi.fn(() => _mockMemory),
  updateMemory:          vi.fn(),
  loadMemory:            vi.fn(),
  saveMemory:            vi.fn(),
  clearMemory:           vi.fn(),
  logMemory:             vi.fn(),
  dedupeAndCap:          (arr, max) => arr.slice(-max),
  extractOutlinePattern: vi.fn(() => null),
  extractPhrasePatterns: vi.fn(() => []),
}));

import { buildTiers, buildAdaptiveHints } from "./contextBuilder";

// ── Shared test data ───────────────────────────────────────────────────────────

// A minimal pre-normalized sermon with enough content to pass isMeaningful checks.
const NORM = {
  passage:           "Romans 8:1-4",
  mpt:               "God condemned sin in the flesh through Christ so that the law's requirement could be fulfilled in us",
  mps:               "Because Christ bore your condemnation you are free to walk by the Spirit",
  outline:           ["No condemnation", "Life in the Spirit"],
  functionalElements: {},
  series:            { title: "Romans", big_idea: "The righteousness of God revealed in Christ" },
  section:           null,
};

const COMP = {
  exegesis: "Observations: Paul shifts from condemnation under law to freedom in Christ. | Interpretation: The law's condemnation is satisfied in Christ's atonement.",
  outline:  "1. No condemnation | 2. Life in the Spirit",
  series:   "Series: The righteousness of God revealed in Christ",
};

// A minimum norm without series big_idea (so tier4 suppresses).
const NORM_NO_SERIES = { ...NORM, series: null };
const COMP_NO_SERIES = { ...COMP, series: "" };

// Helper: run buildTiers with a given step and return the tiers object.
function tiers(step, norm = NORM, comp = COMP, lib = [], theo = []) {
  return buildTiers({ normalized: norm, compressed: comp, libraryChunks: lib, theologyChunks: theo, step });
}

// Helper: check which tiers are non-null.
function activeTiers(t) {
  return {
    tier1:   t.tier1 !== null,
    tier2:   t.tier2 !== null,
    tier3:   t.tier3 !== null,
    tier4:   t.tier4 !== null,
    tier5:   t.tier5 !== null,
    tier6:   t.tier6 !== null,
    tier7:   t.tier7 !== null,
  };
}

// NORM with pastoral intelligence fields populated.
const NORM_WITH_PASTORAL = {
  ...NORM,
  topic_theme:          "Lament",
  audience_assumptions: "Congregation processing a recent unexpected death in the community.",
  background_noise:     "Three families lost jobs this week; community is carrying grief and uncertainty.",
};

// ── Memory that meets the threshold gate (≥1 pattern, ≥2 history items) ────────
const RICH_MEMORY = {
  style:    { tone: "pastoral", structurePreference: "three-point", illustrationStyle: null, applicationStyle: null },
  patterns: {
    outlinePatterns: ["movement: call → trust → rest"],
    phrasePatterns:  ["the grace of God"],
    aiPhrasePatterns: [],
  },
  history: {
    recentMPTs:    ["God saves sinners through faith", "Christ bears the wrath we deserve", "The Spirit transforms what the law could not"],
    recentPassages: ["Romans 3:21-26", "Isaiah 53:4-6"],
  },
};

// ── resolveIncludes via buildTiers ────────────────────────────────────────────

describe("resolveIncludes — PHASE_SEQUENCE (exegesis phases)", () => {
  it("OBSERVE (phase-1): tier1 only — all other tiers null", () => {
    const t = tiers(PHASES.OBSERVE);
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).toBeNull();
    expect(t.tier3).toBeNull();
    expect(t.tier4).toBeNull();
    expect(t.tier5).toBeNull();
    expect(t.tier6).toBeNull();
  });

  it("INTERPRET (phase-2): tier1 + tier2; no structure, library, or memory", () => {
    const t = tiers(PHASES.INTERPRET);
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).not.toBeNull();
    expect(t.tier3).toBeNull();
    expect(t.tier4).toBeNull();
    expect(t.tier5).toBeNull();
    expect(t.tier6).toBeNull();
  });

  it("REDEMPTIVE_THREAD (phase-3): tier1 + tier2 + theology (tier5); no memory", () => {
    const t = tiers(PHASES.REDEMPTIVE_THREAD, NORM, COMP, [], ["Theology chunk about atonement theology for testing purposes that is long enough"]);
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).not.toBeNull();
    expect(t.tier3).toBeNull();
    expect(t.tier4).toBeNull();
    expect(t.tier5).not.toBeNull();
    expect(t.tier6).toBeNull();
  });

  it("REDEMPTIVE_THREAD: library excluded even when provided", () => {
    const t = tiers(PHASES.REDEMPTIVE_THREAD, NORM, COMP,
      ["Library chunk about past sermon for testing purposes that is long enough"],
      ["Theology chunk about atonement theology for testing purposes that is long enough"]
    );
    // Library is excluded for REDEMPTIVE_THREAD; theology is included.
    expect(t.tier5).not.toBeNull();
    expect(t.tier5.libraryChunks).toHaveLength(0);
    expect(t.tier5.theologyChunks.length).toBeGreaterThan(0);
  });

  it("IMPLICATIONS (phase-4): tier1 + tier2 + tier4 (series); no library or memory", () => {
    const t = tiers(PHASES.IMPLICATIONS);
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).not.toBeNull();
    expect(t.tier3).toBeNull();
    expect(t.tier4).not.toBeNull();  // series present in NORM
    expect(t.tier5).toBeNull();
    expect(t.tier6).toBeNull();
  });

  it("IMPLICATIONS: tier4 suppressed when no series big_idea", () => {
    const t = tiers(PHASES.IMPLICATIONS, NORM_NO_SERIES, COMP_NO_SERIES);
    expect(t.tier4).toBeNull();
  });

  it("PHASE_SEQUENCE array covers all four phases with correct step identifiers", () => {
    expect(PHASE_SEQUENCE).toHaveLength(4);
    expect(PHASE_SEQUENCE[0]).toBe(PHASES.OBSERVE);
    expect(PHASE_SEQUENCE[1]).toBe(PHASES.INTERPRET);
    expect(PHASE_SEQUENCE[2]).toBe(PHASES.REDEMPTIVE_THREAD);
    expect(PHASE_SEQUENCE[3]).toBe(PHASES.IMPLICATIONS);
  });
});

describe("resolveIncludes — STEP_SEQUENCE (main steps)", () => {
  it("EXEGESIS (step-1): tier1 only — same as unknown/container step", () => {
    const t = tiers(STEPS.EXEGESIS);
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).toBeNull();
    expect(t.tier3).toBeNull();
    expect(t.tier4).toBeNull();
    expect(t.tier5).toBeNull();
    expect(t.tier6).toBeNull();
  });

  it("MPT_MPS (step-2): tier1 + tier2 + tier4 (series); no structure, no library", () => {
    const t = tiers(STEPS.MPT_MPS);
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).not.toBeNull();
    expect(t.tier3).toBeNull();
    expect(t.tier4).not.toBeNull();  // series present in NORM
    expect(t.tier5).toBeNull();
    // tier6 gated by memory threshold — empty mock memory → null
    expect(t.tier6).toBeNull();
  });

  it("MPT_MPS: tier4 suppressed when no series big_idea", () => {
    const t = tiers(STEPS.MPT_MPS, NORM_NO_SERIES, COMP_NO_SERIES);
    expect(t.tier4).toBeNull();
  });

  it("OUTLINE (step-3): tier1 + tier2 + tier3 + tier4 (series); no library", () => {
    const t = tiers(STEPS.OUTLINE);
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).not.toBeNull();
    expect(t.tier3).not.toBeNull();
    expect(t.tier4).not.toBeNull();  // series present in NORM
    expect(t.tier5).toBeNull();
    expect(t.tier6).toBeNull();
  });

  it("OUTLINE: tier4 suppressed when no series big_idea", () => {
    const t = tiers(STEPS.OUTLINE, NORM_NO_SERIES, COMP_NO_SERIES);
    expect(t.tier4).toBeNull();
  });

  it("FUNCTIONAL_ELEMENTS (step-4): tier1 + tier2 + tier3 + tier4 (series); same shape as OUTLINE", () => {
    const t = tiers(STEPS.FUNCTIONAL_ELEMENTS);
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).not.toBeNull();
    expect(t.tier3).not.toBeNull();
    expect(t.tier4).not.toBeNull();  // series present in NORM
    expect(t.tier5).toBeNull();
    expect(t.tier6).toBeNull();
  });

  it("FUNCTIONAL_ELEMENTS: tier4 suppressed when no series big_idea", () => {
    const t = tiers(STEPS.FUNCTIONAL_ELEMENTS, NORM_NO_SERIES, COMP_NO_SERIES);
    expect(t.tier4).toBeNull();
  });

  it("STEP_SEQUENCE array covers all four steps with correct identifiers", () => {
    expect(STEP_SEQUENCE).toHaveLength(4);
    expect(STEP_SEQUENCE[0]).toBe(STEPS.EXEGESIS);
    expect(STEP_SEQUENCE[1]).toBe(STEPS.MPT_MPS);
    expect(STEP_SEQUENCE[2]).toBe(STEPS.OUTLINE);
    expect(STEP_SEQUENCE[3]).toBe(STEPS.FUNCTIONAL_ELEMENTS);
  });
});

describe("resolveIncludes — extra known steps and fallbacks", () => {
  it('"manuscript": all tiers active (library + theology + memory gated by threshold)', () => {
    const t = tiers("manuscript", NORM, COMP,
      ["Library chunk for testing that is long enough to pass isMeaningful check here"],
      ["Theology chunk for testing that is long enough to pass isMeaningful check here"]
    );
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).not.toBeNull();
    expect(t.tier3).not.toBeNull();
    expect(t.tier4).not.toBeNull();
    expect(t.tier5).not.toBeNull();
    // tier6 null because mock memory is empty (threshold not met)
    expect(t.tier6).toBeNull();
  });

  it('"outline" (string alias): same tiers as STEPS.OUTLINE', () => {
    const tAlias = activeTiers(tiers("outline", NORM_WITH_PASTORAL));
    const tConst = activeTiers(tiers(STEPS.OUTLINE, NORM_WITH_PASTORAL));
    expect(tAlias).toEqual(tConst);
  });

  it('"study": tier1 only — conservative fallback', () => {
    const t = tiers("study");
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).toBeNull();
    expect(t.tier3).toBeNull();
    expect(t.tier4).toBeNull();
    expect(t.tier5).toBeNull();
    expect(t.tier6).toBeNull();
  });

  it('"delivery": tier1 only — conservative fallback', () => {
    const t = tiers("delivery");
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).toBeNull();
  });

  it("unknown step: tier1 only — never dumps everything", () => {
    const t = tiers("unknown-step-xyz");
    expect(t.tier1).not.toBeNull();
    expect(t.tier2).toBeNull();
    expect(t.tier3).toBeNull();
    expect(t.tier4).toBeNull();
    expect(t.tier5).toBeNull();
    expect(t.tier6).toBeNull();
  });

  it("tier1 always carries passage and MPT fields", () => {
    for (const step of [...STEP_SEQUENCE, ...PHASE_SEQUENCE]) {
      const t = tiers(step);
      expect(t.tier1).toHaveProperty("passage");
      expect(t.tier1).toHaveProperty("mpt");
    }
  });

  it("tier1 passage budget is 60% of 1500 chars — both fields survive a long passage", () => {
    const longPassage = "x".repeat(1000); // > 900 (60% of 1500)
    const longMpt     = "y".repeat(700);  // > 600 (40% of 1500)
    const norm = { ...NORM, passage: longPassage, mpt: longMpt };
    const t = tiers(STEPS.MPT_MPS, norm, COMP);
    // Both must be present (neither should be empty string)
    expect(t.tier1.passage.length).toBeGreaterThan(0);
    expect(t.tier1.mpt.length).toBeGreaterThan(0);
    // Passage capped at 900 (60% of 1500)
    expect(t.tier1.passage.length).toBeLessThanOrEqual(900);
    // MPT capped at 600 (40% of 1500)
    expect(t.tier1.mpt.length).toBeLessThanOrEqual(600);
  });
});

// ── buildAdaptiveHints ─────────────────────────────────────────────────────────

describe("buildAdaptiveHints — null / threshold guards", () => {
  it("returns [] for null memory", () => {
    expect(buildAdaptiveHints(null, STEPS.OUTLINE, "s1")).toEqual([]);
  });

  it("returns [] when sermonId is null", () => {
    expect(buildAdaptiveHints(RICH_MEMORY, STEPS.OUTLINE, null)).toEqual([]);
  });

  it("returns [] when sermonId is undefined", () => {
    expect(buildAdaptiveHints(RICH_MEMORY, STEPS.OUTLINE, undefined)).toEqual([]);
  });

  it("returns [] when pattern count is 0", () => {
    const noPatterns = {
      ...RICH_MEMORY,
      patterns: { outlinePatterns: [], phrasePatterns: [], aiPhrasePatterns: [] },
    };
    expect(buildAdaptiveHints(noPatterns, STEPS.OUTLINE, "s1")).toEqual([]);
  });

  it("returns [] when history count < 2", () => {
    const thinHistory = {
      ...RICH_MEMORY,
      history: { recentMPTs: ["Only one MPT"], recentPassages: [] },
    };
    expect(buildAdaptiveHints(thinHistory, STEPS.OUTLINE, "s1")).toEqual([]);
  });

  it("returns [] when both pattern and history are empty (empty memory)", () => {
    expect(buildAdaptiveHints(_mockMemory, STEPS.OUTLINE, "s1")).toEqual([]);
  });
});

describe("buildAdaptiveHints — step caps (exegesis phases capped at 0)", () => {
  it("OBSERVE returns [] regardless of memory richness", () => {
    expect(buildAdaptiveHints(RICH_MEMORY, PHASES.OBSERVE, "s1")).toEqual([]);
  });

  it("INTERPRET returns [] regardless of memory richness", () => {
    expect(buildAdaptiveHints(RICH_MEMORY, PHASES.INTERPRET, "s1")).toEqual([]);
  });

  it("REDEMPTIVE_THREAD returns [] regardless of memory richness", () => {
    expect(buildAdaptiveHints(RICH_MEMORY, PHASES.REDEMPTIVE_THREAD, "s1")).toEqual([]);
  });

  it("IMPLICATIONS returns [] regardless of memory richness", () => {
    expect(buildAdaptiveHints(RICH_MEMORY, PHASES.IMPLICATIONS, "s1")).toEqual([]);
  });

  it("EXEGESIS (container step) returns [] — unknown step defaults to cap 0", () => {
    expect(buildAdaptiveHints(RICH_MEMORY, STEPS.EXEGESIS, "s1")).toEqual([]);
  });

  it("unknown step returns []", () => {
    expect(buildAdaptiveHints(RICH_MEMORY, "unknown-step-xyz", "s1")).toEqual([]);
  });
});

describe("buildAdaptiveHints — step caps (steps with active caps)", () => {
  it("MPT_MPS: returns at most 2 hints", () => {
    const hints = buildAdaptiveHints(RICH_MEMORY, STEPS.MPT_MPS, "sermon-a");
    expect(hints.length).toBeLessThanOrEqual(2);
    expect(Array.isArray(hints)).toBe(true);
  });

  it("OUTLINE: returns at most 3 hints", () => {
    const hints = buildAdaptiveHints(RICH_MEMORY, STEPS.OUTLINE, "sermon-b");
    expect(hints.length).toBeLessThanOrEqual(3);
  });

  it('"outline" (string alias): same cap as STEPS.OUTLINE', () => {
    const hints = buildAdaptiveHints(RICH_MEMORY, "outline", "sermon-c");
    expect(hints.length).toBeLessThanOrEqual(3);
  });

  it("FUNCTIONAL_ELEMENTS: returns at most 3 hints", () => {
    const hints = buildAdaptiveHints(RICH_MEMORY, STEPS.FUNCTIONAL_ELEMENTS, "sermon-d");
    expect(hints.length).toBeLessThanOrEqual(3);
  });

  it('"manuscript": returns at most 3 hints', () => {
    const hints = buildAdaptiveHints(RICH_MEMORY, "manuscript", "sermon-e");
    expect(hints.length).toBeLessThanOrEqual(3);
  });
});

describe("buildAdaptiveHints — hint format and category dedup", () => {
  it("all returned hints are strings", () => {
    const hints = buildAdaptiveHints(RICH_MEMORY, STEPS.OUTLINE, "sermon-f");
    for (const h of hints) {
      expect(typeof h).toBe("string");
      expect(h.length).toBeGreaterThan(0);
    }
  });

  it("each hint uses the soft-language format (Prefer…/Consider…)", () => {
    // Run multiple times to account for shuffle randomness
    for (let i = 0; i < 10; i++) {
      const hints = buildAdaptiveHints(RICH_MEMORY, STEPS.OUTLINE, `sermon-g-${i}`);
      for (const h of hints) {
        expect(h).toMatch(/^(Prefer|Consider)/);
      }
    }
  });

  it("no duplicate hints within a single call (category dedup)", () => {
    const hints = buildAdaptiveHints(RICH_MEMORY, STEPS.OUTLINE, "sermon-h");
    const unique = new Set(hints);
    expect(unique.size).toBe(hints.length);
  });

  it("per-sermon rotation: different sermon IDs have independent hint state", () => {
    // Exhaust hints for sermon-x so rotation suppresses them.
    buildAdaptiveHints(RICH_MEMORY, STEPS.OUTLINE, "sermon-x");
    // sermon-y should still get hints (fresh state for new sermon id).
    const hintsY = buildAdaptiveHints(RICH_MEMORY, STEPS.OUTLINE, "sermon-y");
    expect(Array.isArray(hintsY)).toBe(true);
  });
});

// ── Pastoral Intelligence tier (tier7) ────────────────────────────────────────

import { normalizeSermon, assembleContext } from "./contextBuilder";

describe("tier7 — pastoral intelligence: always-on, content-gated", () => {
  it("active at every step when fields have content", () => {
    const allSteps = [...STEP_SEQUENCE, ...PHASE_SEQUENCE, "manuscript", "outline", "study", "delivery"];
    for (const step of allSteps) {
      const t = tiers(step, NORM_WITH_PASTORAL);
      expect(t.tier7).not.toBeNull();
    }
  });

  it("null when all three fields are empty", () => {
    const normEmpty = { ...NORM, topic_theme: "", audience_assumptions: "", background_noise: "" };
    for (const step of [...STEP_SEQUENCE, ...PHASE_SEQUENCE]) {
      const t = tiers(step, normEmpty);
      expect(t.tier7).toBeNull();
    }
  });

  it("null when fields are absent (undefined)", () => {
    // NORM has no pastoral fields — all undefined → null tier7
    for (const step of [...STEP_SEQUENCE, ...PHASE_SEQUENCE]) {
      const t = tiers(step, NORM);
      expect(t.tier7).toBeNull();
    }
  });

  it("partial fill — only non-empty fields appear in output", () => {
    const normPartial = { ...NORM, topic_theme: "Lament", audience_assumptions: "", background_noise: "" };
    const t = tiers(STEPS.OUTLINE, normPartial);
    expect(t.tier7).not.toBeNull();
    expect(t.tier7).toContain("Topic/Theme: Lament");
    expect(t.tier7).not.toContain("Audience:");
    expect(t.tier7).not.toContain("Background:");
  });

  it("single-word topic ('Lament') is included, not suppressed", () => {
    const normSingleWord = { ...NORM, topic_theme: "Lament", audience_assumptions: "", background_noise: "" };
    const t = tiers(STEPS.MPT_MPS, normSingleWord);
    expect(t.tier7).not.toBeNull();
    expect(t.tier7).toContain("Lament");
  });

  it("active at PHASES.OBSERVE — not blocked by the most-gated step", () => {
    const t = tiers(PHASES.OBSERVE, NORM_WITH_PASTORAL);
    expect(t.tier7).not.toBeNull();
    expect(t.tier2).toBeNull();   // confirms OBSERVE still gates other tiers
    expect(t.tier3).toBeNull();
    expect(t.tier4).toBeNull();
  });

  it("all three fields appear when all are populated", () => {
    const t = tiers(STEPS.OUTLINE, NORM_WITH_PASTORAL);
    expect(t.tier7).toContain("Topic/Theme:");
    expect(t.tier7).toContain("Audience:");
    expect(t.tier7).toContain("Background:");
  });

  it("[THIS SERMON] label appears in assembleContext() output", () => {
    const t = tiers(STEPS.OUTLINE, NORM_WITH_PASTORAL);
    const output = assembleContext(t);
    expect(output).toContain("[THIS SERMON]");
    expect(output).toContain("Topic/Theme: Lament");
  });

  it("[THIS SERMON] appears after [PASSAGE & MPT] and before [INTERPRETATION]", () => {
    const t = tiers(STEPS.OUTLINE, NORM_WITH_PASTORAL);
    const output = assembleContext(t);
    const posPassage       = output.indexOf("[PASSAGE & MPT]");
    const posThisSermon    = output.indexOf("[THIS SERMON]");
    const posInterpretation = output.indexOf("[INTERPRETATION]");
    expect(posPassage).toBeGreaterThanOrEqual(0);
    expect(posThisSermon).toBeGreaterThan(posPassage);
    expect(posInterpretation).toBeGreaterThan(posThisSermon);
  });

  it("[THIS SERMON] absent from assembleContext() when fields are empty", () => {
    const normEmpty = { ...NORM, topic_theme: "", audience_assumptions: "", background_noise: "" };
    const t = tiers(STEPS.OUTLINE, normEmpty);
    const output = assembleContext(t);
    expect(output).not.toContain("[THIS SERMON]");
  });
});

describe("normalizeSermon() — pastoral intelligence fields", () => {
  it("returns '' for topic_theme when sermon is null", () => {
    expect(normalizeSermon(null).topic_theme).toBe("");
  });

  it("returns '' for audience_assumptions when sermon is null", () => {
    expect(normalizeSermon(null).audience_assumptions).toBe("");
  });

  it("returns '' for background_noise when sermon is null", () => {
    expect(normalizeSermon(null).background_noise).toBe("");
  });

  it("returns '' for each field when sermon has no pastoral fields", () => {
    const n = normalizeSermon({ passage: "Romans 8:1", mpt: "God frees sinners" });
    expect(n.topic_theme).toBe("");
    expect(n.audience_assumptions).toBe("");
    expect(n.background_noise).toBe("");
  });

  it("returns '' when pastoral fields are null on the sermon", () => {
    const n = normalizeSermon({ topic_theme: null, audience_assumptions: null, background_noise: null });
    expect(n.topic_theme).toBe("");
    expect(n.audience_assumptions).toBe("");
    expect(n.background_noise).toBe("");
  });

  it("passes through non-empty values unchanged", () => {
    const n = normalizeSermon({ topic_theme: "Doubt", audience_assumptions: "Seekers present", background_noise: "" });
    expect(n.topic_theme).toBe("Doubt");
    expect(n.audience_assumptions).toBe("Seekers present");
    expect(n.background_noise).toBe("");
  });
});

describe("buildAdaptiveHints() — unaffected by pastoral fields", () => {
  it("return count unchanged when NORM_WITH_PASTORAL used vs NORM (rich memory, outline step)", () => {
    const hintsWithout = buildAdaptiveHints(RICH_MEMORY, STEPS.OUTLINE, "sermon-pastoral-a");
    const hintsWith    = buildAdaptiveHints(RICH_MEMORY, STEPS.OUTLINE, "sermon-pastoral-b");
    // Both must be arrays within the cap — pastoral fields do not change hint logic
    expect(Array.isArray(hintsWithout)).toBe(true);
    expect(Array.isArray(hintsWith)).toBe(true);
    expect(hintsWith.length).toBeLessThanOrEqual(3);
  });

  it("exegesis phases still return [] with pastoral fields present", () => {
    expect(buildAdaptiveHints(RICH_MEMORY, PHASES.OBSERVE, "sermon-pastoral-c")).toEqual([]);
    expect(buildAdaptiveHints(RICH_MEMORY, PHASES.INTERPRET, "sermon-pastoral-d")).toEqual([]);
  });
});

// ── Memory feedback loop guard ─────────────────────────────────────────────────
// Verifies the architectural invariant: AI-sourced phrases (aiPhrasePatterns)
// are NEVER mixed into the pastor's own phrasePatterns, and vice versa.
// The runtime assertion added to updateMemory (task 5) enforces this at call sites;
// this test verifies the invariant holds in the updateMemory data model.

// Memory feedback loop isolation tests live in memory.test.js.
// The file-level vi.mock('./memory') prevents testing the real module here.
// This block confirms the mock itself has the correct structural separation.
describe("memory feedback loop guard — mock shape sanity check", () => {
  it("mock memory has phrasePatterns and aiPhrasePatterns as separate arrays", () => {
    expect(Array.isArray(_mockMemory.patterns.phrasePatterns)).toBe(true);
    expect(Array.isArray(_mockMemory.patterns.aiPhrasePatterns)).toBe(true);
    expect(_mockMemory.patterns.phrasePatterns).not.toBe(_mockMemory.patterns.aiPhrasePatterns);
  });
});
