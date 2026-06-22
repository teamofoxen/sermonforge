import { describe, it, expect } from "vitest";
import { parsePassageRef } from "../../src/utils/passageRef";

// The passage parser is the load-bearing, risk-carrying piece of the coverage
// engine, so it gets a thorough table. Luke (24 ch; ch1=80, ch2=52, ch4=44,
// ch24=53) is the reference book for verse-bound resolution; 1 Samuel (ch20=42)
// exercises a digit-containing book name in the ignored prefix.

describe("parsePassageRef — in-scope forms (bookId 'luke')", () => {
  const cases = [
    ["1:1-4:13", { startCh: 1, startV: 1, endCh: 4, endV: 13 }], // cross-chapter
    ["1:1-4",    { startCh: 1, startV: 1, endCh: 1, endV: 4 }],  // same-chapter range
    ["2",        { startCh: 2, startV: 1, endCh: 2, endV: 52 }], // whole chapter
    ["2:9",      { startCh: 2, startV: 9, endCh: 2, endV: 9 }],  // single verse
    ["24",       { startCh: 24, startV: 1, endCh: 24, endV: 53 }], // last chapter
    ["1:80",     { startCh: 1, startV: 80, endCh: 1, endV: 80 }],  // last verse of ch1
    ["1-4",      { startCh: 1, startV: 1, endCh: 4, endV: 44 }],   // whole-chapter range
    ["1-4:13",   { startCh: 1, startV: 1, endCh: 4, endV: 13 }],   // bare start ch → verse 1
    ["1:1–4:13", { startCh: 1, startV: 1, endCh: 4, endV: 13 }], // en-dash
    ["  3:5 - 3:9  ", { startCh: 3, startV: 5, endCh: 3, endV: 9 }],  // spaces around dash/colon
    ["Luke 1:1-24:53", { startCh: 1, startV: 1, endCh: 24, endV: 53 }], // leading book name
  ];
  for (const [input, expected] of cases) {
    it(`parses ${JSON.stringify(input)}`, () => {
      expect(parsePassageRef(input, "luke")).toEqual(expected);
    });
  }
});

describe("parsePassageRef — digit-containing book name in the ignored prefix", () => {
  it("parses '1 Samuel 2:3-5' (the leading '1' is not the chapter)", () => {
    expect(parsePassageRef("1 Samuel 2:3-5", "1-samuel")).toEqual({
      startCh: 2, startV: 3, endCh: 2, endV: 5,
    });
  });
  it("parses '1 Samuel 20' as whole chapter 20 (42 verses)", () => {
    expect(parsePassageRef("1 Samuel 20", "1-samuel")).toEqual({
      startCh: 20, startV: 1, endCh: 20, endV: 42,
    });
  });
});

describe("parsePassageRef — fail-soft verse-bound resolution", () => {
  it("whole chapter with explicit verses needs no book data (no verseUnknown)", () => {
    expect(parsePassageRef("2:9", "not-a-book")).toEqual({
      startCh: 2, startV: 9, endCh: 2, endV: 9,
    });
  });
  it("whole chapter with unknown book → chapter-level (verseUnknown)", () => {
    expect(parsePassageRef("2", "not-a-book")).toEqual({
      startCh: 2, startV: 1, endCh: 2, endV: null, verseUnknown: true,
    });
  });
  it("whole-chapter range with null book → chapter-level (verseUnknown)", () => {
    expect(parsePassageRef("1-3", null)).toEqual({
      startCh: 1, startV: 1, endCh: 3, endV: null, verseUnknown: true,
    });
  });
  it("chapter beyond a KNOWN book's range → error (a typo for this book)", () => {
    // Luke has 24 chapters; chapter 25+ is invalid for Luke (verseUnknown is
    // reserved for genuinely unknown books).
    expect(parsePassageRef("25", "luke")).toEqual({ error: true });
    expect(parsePassageRef("99:1-99:5", "luke")).toEqual({ error: true });
  });

  it("a bare end number after a verse start is a VERSE, not a chapter (no chapter bound)", () => {
    // "1:1-80" = verses 1–80 of Luke 1 (80 verses); 80 is NOT a chapter here.
    expect(parsePassageRef("1:1-80", "luke")).toEqual({
      startCh: 1, startV: 1, endCh: 1, endV: 80,
    });
  });
});

describe("parsePassageRef — hardening (adversarial review)", () => {
  it("accepts em-dash / minus as range separators", () => {
    expect(parsePassageRef("1—4", "luke")).toEqual({ startCh: 1, startV: 1, endCh: 4, endV: 44 }); // em-dash
    expect(parsePassageRef("1:1−4", "luke")).toEqual({ startCh: 1, startV: 1, endCh: 1, endV: 4 }); // minus
  });
  it("rejects disjoint / multi-passage citations rather than keeping the trailing token", () => {
    expect(parsePassageRef("Romans 8:1, 28", "romans")).toEqual({ error: true });
    expect(parsePassageRef("Luke 1:1-4; 2:1-20", "luke")).toEqual({ error: true });
  });
  it("rejects a leading REAL reference + trailing token (no silent mis-parse)", () => {
    expect(parsePassageRef("John 3.16", "john")).toEqual({ error: true });       // dot, not colon
    expect(parsePassageRef("John 3 vv.16-17", "john")).toEqual({ error: true }); // "vv." shorthand
    expect(parsePassageRef(":5", "luke")).toEqual({ error: true });              // leading colon
  });
  it("rejects verse 0 (verses are 1-based)", () => {
    expect(parsePassageRef("3:0", "luke")).toEqual({ error: true });
    expect(parsePassageRef("1:1-0", "luke")).toEqual({ error: true });
  });

  it("rejects reversed ranges (so coverage never sees start > end)", () => {
    expect(parsePassageRef("4-2", "jonah")).toEqual({ error: true });
    expect(parsePassageRef("5:1-3:1", "luke")).toEqual({ error: true });
    expect(parsePassageRef("1:10-1:3", "luke")).toEqual({ error: true });
    expect(parsePassageRef("4-2", null)).toEqual({ error: true }); // ordering holds w/o verse data
  });

  it("rejects a verse past its chapter's actual length", () => {
    expect(parsePassageRef("1:999", "jonah")).toEqual({ error: true });   // Jonah 1 has 17 verses
    expect(parsePassageRef("2:1-2:15", "jonah")).toEqual({ error: true }); // Jonah 2 has 10 verses
  });

  it("still accepts a range ending on the chapter's exact last verse", () => {
    expect(parsePassageRef("1:1-1:17", "jonah")).toEqual({ startCh: 1, startV: 1, endCh: 1, endV: 17 });
  });
});

describe("parsePassageRef — malformed inputs never throw, return { error: true }", () => {
  const bad = ["", "   ", "abc", "Romans", "1 John", "1:", "1:1-", "-", "chapter two"];
  for (const input of bad) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      expect(parsePassageRef(input, "luke")).toEqual({ error: true });
    });
  }
  it("rejects non-string input", () => {
    expect(parsePassageRef(null, "luke")).toEqual({ error: true });
    expect(parsePassageRef(undefined, "luke")).toEqual({ error: true });
    expect(parsePassageRef(42, "luke")).toEqual({ error: true });
  });
});
