import { describe, it, expect } from "vitest";
import { computeCoverage, coverageFromParsed } from "../../src/utils/coverage";

// Jonah is the verse-level reference book: 4 chapters, chapterVerses
// [17, 10, 10, 11], 48 verses total. Linear indices: ch1 = 1–17, ch2 = 18–27,
// ch3 = 28–37, ch4 = 38–48.

const slot = (passage) => ({ passage });

describe("computeCoverage — verse level (Jonah)", () => {
  it("reports gaps and % for a partial partition", () => {
    const r = computeCoverage("jonah", [slot("1"), slot("2:1-5"), slot("3")]);
    expect(r.mode).toBe("verse");
    expect(r.total).toBe(48);
    expect(r.covered).toBe(32); // ch1 (17) + 2:1-5 (5) + ch3 (10)
    expect(r.percent).toBe(67); // 32/48
    expect(r.gaps).toEqual(["2:6-10", "4:1-11"]);
    expect(r.overlaps).toEqual([]);
    expect(r.outOfOrder).toEqual([]);
    expect(r.unreadable).toEqual([]);
  });

  it("100% when the slots partition the whole book", () => {
    const r = computeCoverage("jonah", [slot("1"), slot("2"), slot("3"), slot("4")]);
    expect(r.percent).toBe(100);
    expect(r.covered).toBe(48);
    expect(r.gaps).toEqual([]);
  });

  it("flags overlapping slots", () => {
    const r = computeCoverage("jonah", [slot("1:1-10"), slot("1:5-17")]);
    expect(r.overlaps).toEqual([{ a: 1, b: 2 }]);
    expect(r.covered).toBe(17); // union is just ch1
    expect(r.gaps).toEqual(["2:1-4:11"]);
  });

  it("flags an out-of-order slot (starts before the previous slot)", () => {
    const r = computeCoverage("jonah", [slot("2"), slot("1"), slot("3")]);
    expect(r.outOfOrder).toEqual([2]); // slot 2 ("1") starts before slot 1 ("2")
    expect(r.overlaps).toEqual([]);
  });

  it("excludes unreadable refs from the math but reports them", () => {
    const r = computeCoverage("jonah", [slot("1"), slot("garbage"), slot("3")]);
    expect(r.unreadable).toEqual([2]);
    expect(r.covered).toBe(27); // ch1 (17) + ch3 (10); the unreadable slot is skipped
    expect(r.gaps).toEqual(["2:1-10", "4:1-11"]);
  });

  it("no slots → 0% and the whole book is a gap", () => {
    const r = computeCoverage("jonah", []);
    expect(r.percent).toBe(0);
    expect(r.gaps).toEqual(["1:1-4:11"]);
  });
});

describe("computeCoverage — honest percent and hardened refs (adversarial review)", () => {
  it("never rounds up to 100% while a gap exists", () => {
    // Psalms 1:1–150:5 leaves exactly Psalm 150:6 uncovered (1 of 2461 verses).
    const r = computeCoverage("psalms", [{ passage: "1:1-150:5" }]);
    expect(r.gaps).toEqual(["150:6"]);
    expect(r.covered).toBe(2460);
    expect(r.percent).toBe(99); // honest: NOT 100
  });

  it("never rounds down to 0% when something is covered", () => {
    const r = computeCoverage("psalms", [{ passage: "1:1" }]); // 1 of 2461
    expect(r.covered).toBe(1);
    expect(r.percent).toBe(1); // honest: NOT 0
  });

  it("reversed / verse-overflow slot refs are unreadable, never negative or inflated", () => {
    const r = computeCoverage("jonah", [{ passage: "1" }, { passage: "4-2" }, { passage: "2:1-2:15" }]);
    expect(r.unreadable).toEqual([2, 3]); // reversed range + verse overflow both rejected
    expect(r.covered).toBe(17); // only Jonah 1 counts
    expect(r.percent).toBe(35); // 17/48 — never negative
  });
});

describe("computeCoverage — clamped to the series' passage_range", () => {
  // Jonah scoped to "1-2" (verses 1–27): coverage is measured against THAT span,
  // not all 48 verses — so the slots aren't dinged for chapters 3–4.
  it("measures % and gaps against the declared span, not the whole book", () => {
    const r = computeCoverage("jonah", [slot("1")], "1-2");
    expect(r.total).toBe(27); // ch1 (17) + ch2 (10), not 48
    expect(r.covered).toBe(17); // ch1
    expect(r.percent).toBe(63); // 17/27, not 35 (17/48)
    expect(r.gaps).toEqual(["2:1-10"]); // only the uncovered tail WITHIN the span
    expect(r.scopeLabel).toBe("1:1-2:10");
  });

  it("ignores a slot that falls outside the declared span (clipped, not flagged)", () => {
    const r = computeCoverage("jonah", [slot("1"), slot("3")], "1-2");
    expect(r.covered).toBe(17); // the ch3 slot is outside 1–2 and contributes nothing
    expect(r.gaps).toEqual(["2:1-10"]);
    expect(r.unreadable).toEqual([]); // out-of-scope ≠ unreadable
  });

  it("a whole-book passage_range is NOT a clamp (same as no range)", () => {
    const full = computeCoverage("jonah", [slot("1"), slot("2"), slot("3"), slot("4")], "Jonah 1:1-4:11");
    expect(full.percent).toBe(100);
    expect(full.total).toBe(48);
    expect(full.scopeLabel).toBeNull();
  });

  it("free-text / unparseable passage_range falls back to the whole book", () => {
    const r = computeCoverage("jonah", [slot("1")], "selected highlights");
    expect(r.total).toBe(48);
    expect(r.scopeLabel).toBeNull();
  });
});

describe("coverageFromParsed — self-defends against out-of-range hand-built refs", () => {
  // A real verse-data book reached directly with a bad ref must NOT NaN-poison the
  // sweep into a false 100%; the bad span is routed to `unreadable`.
  const JONAH = { id: "jonah", name: "Jonah", chapters: 4, chapterVerses: [17, 10, 10, 11] };
  it("routes a non-existent-chapter ref to unreadable, never inflating coverage", () => {
    const r = coverageFromParsed(JONAH, [
      { index: 1, ref: { startCh: 1, startV: 1, endCh: 1, endV: 17 } },
      { index: 2, ref: { startCh: 9, startV: 1, endCh: 9, endV: 5 } }, // Jonah has no ch9
    ]);
    expect(r.unreadable).toEqual([2]);
    expect(r.covered).toBe(17);
    expect(r.percent).toBe(35); // 17/48 — not a false 100
  });
});

describe("computeCoverage — no book", () => {
  it("null / unknown book → mode 'none' with noBook flag", () => {
    expect(computeCoverage(null, [slot("1")]).noBook).toBe(true);
    expect(computeCoverage("not-a-book", []).mode).toBe("none");
  });
});

describe("coverageFromParsed — chapter-level fallback (synthetic no-verse-data book)", () => {
  // A book with chapters but NO chapterVerses forces chapter-level coverage.
  const noData = { id: "x", name: "X", chapters: 5 };
  const ref = (startCh, endCh) => ({ startCh, startV: 1, endCh, endV: null, verseUnknown: true });

  it("counts touched vs missed chapters and labels the gaps", () => {
    const r = coverageFromParsed(noData, [
      { index: 1, ref: ref(1, 2) },
      { index: 2, ref: ref(4, 4) },
    ]);
    expect(r.mode).toBe("chapter");
    expect(r.total).toBe(5);
    expect(r.covered).toBe(3); // chapters 1, 2, 4
    expect(r.percent).toBe(60);
    expect(r.gaps).toEqual(["3", "5"]);
  });

  it("compresses consecutive missing chapters into a range", () => {
    const book = { id: "y", name: "Y", chapters: 7 };
    const r = coverageFromParsed(book, [{ index: 1, ref: { startCh: 1, startV: 1, endCh: 1, endV: null, verseUnknown: true } }]);
    expect(r.gaps).toEqual(["2-7"]);
    expect(r.percent).toBe(14); // 1/7
  });

  it("flags chapter-level overlaps and out-of-order", () => {
    const r = coverageFromParsed(noData, [
      { index: 1, ref: ref(3, 4) },
      { index: 2, ref: ref(1, 3) }, // overlaps ch3, and starts before slot 1
    ]);
    expect(r.overlaps).toEqual([{ a: 1, b: 2 }]);
    expect(r.outOfOrder).toEqual([2]);
  });
});
