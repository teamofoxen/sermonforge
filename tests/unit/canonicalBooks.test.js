import { describe, it, expect } from "vitest";
import {
  BOOKS,
  GENRES,
  bookById,
  totalVersesInBook,
  verseIndex,
  bookSpan,
} from "../../src/data/canonicalBooks";

// The checksum gate for the canonical book dataset (Prompt 1 of the
// canonical-books build). chapterVerses is the one dense, error-prone field —
// 1,189 numbers vendored from a vetted KJV source. These assertions are what
// make a bad vendor/regeneration fail loudly instead of silently corrupting
// coverage math downstream. Anchors: KJV/Protestant versification, 1,189
// chapters, 31,102 verses.

describe("canonicalBooks — structure", () => {
  it("has all 66 books in canonical order 1..66", () => {
    expect(BOOKS.length).toBe(66);
    expect(BOOKS.map((b) => b.order)).toEqual(
      Array.from({ length: 66 }, (_, i) => i + 1),
    );
  });

  it("splits 39 OT + 27 NT", () => {
    expect(BOOKS.filter((b) => b.testament === "OT").length).toBe(39);
    expect(BOOKS.filter((b) => b.testament === "NT").length).toBe(27);
  });

  it("every book's genre is one of the 7 GENRES keys", () => {
    expect(Object.keys(GENRES)).toHaveLength(7);
    for (const b of BOOKS) {
      expect(GENRES[b.genre], `${b.id} genre`).toBeTruthy();
    }
  });

  it("book ids are unique", () => {
    expect(new Set(BOOKS.map((b) => b.id)).size).toBe(66);
  });
});

describe("canonicalBooks — checksum gate", () => {
  it("each book: chapterVerses.length === chapters", () => {
    for (const b of BOOKS) {
      expect(b.chapterVerses.length, `${b.id} chapter count`).toBe(b.chapters);
    }
  });

  it("each book: sum(chapterVerses) === totalVerses", () => {
    for (const b of BOOKS) {
      const sum = b.chapterVerses.reduce((a, c) => a + c, 0);
      expect(sum, `${b.id} verse sum`).toBe(b.totalVerses);
    }
  });

  it("grand total === 1,189 chapters and 31,102 verses", () => {
    const chapters = BOOKS.reduce((s, b) => s + b.chapters, 0);
    const verses = BOOKS.reduce((s, b) => s + b.totalVerses, 0);
    expect(chapters).toBe(1189);
    expect(verses).toBe(31102);
  });

  it("spot checks (KJV/Protestant numbering)", () => {
    const ps = bookById("psalms");
    expect(ps.chapterVerses[118], "Psalm 119").toBe(176);
    expect(ps.chapterVerses[116], "Psalm 117").toBe(2);
    expect(ps.chapterVerses[99], "Psalm 100").toBe(5);
    // John 11 contains v35 ("Jesus wept"), so it has at least 35 verses.
    expect(bookById("john").chapterVerses[10], "John 11").toBeGreaterThanOrEqual(35);
    expect(bookById("genesis").chapterVerses[0], "Genesis 1").toBe(31);
    expect(bookById("revelation").chapterVerses[21], "Revelation 22").toBe(21);
  });

  it("judgment-call genres match the plan defaults", () => {
    expect(bookById("hebrews").genre).toBe("nt_general");
    expect(bookById("revelation").genre).toBe("nt_general");
    expect(bookById("daniel").genre).toBe("ot_prophets");
  });
});

describe("canonicalBooks — helpers", () => {
  it("bookById returns the record or null (fail-soft)", () => {
    expect(bookById("luke").name).toBe("Luke");
    expect(bookById("luke").totalVerses).toBe(1151);
    expect(bookById("not-a-book")).toBeNull();
  });

  it("totalVersesInBook returns the count or 0 for unknown", () => {
    expect(totalVersesInBook("genesis")).toBe(1533);
    expect(totalVersesInBook("not-a-book")).toBe(0);
  });

  it("verseIndex is a 1-based linear index across chapters", () => {
    expect(verseIndex("genesis", 1, 1)).toBe(1);
    expect(verseIndex("genesis", 1, 31)).toBe(31);
    expect(verseIndex("genesis", 2, 1)).toBe(32); // right after Genesis 1's 31
    expect(verseIndex("genesis", 2, 25)).toBe(56); // Gen 2 has 25 verses
  });

  it("verseIndex is fail-soft on bad input", () => {
    expect(verseIndex("not-a-book", 1, 1)).toBeNull();
    expect(verseIndex("genesis", 0, 1)).toBeNull();
    expect(verseIndex("genesis", 51, 1)).toBeNull(); // Genesis has 50 chapters
  });

  it("bookSpan returns the full canonical span string (the passage_range pre-fill)", () => {
    expect(bookSpan("luke")).toBe("Luke 1:1-24:53");
    expect(bookSpan("genesis")).toBe("Genesis 1:1-50:26");
    expect(bookSpan("obadiah")).toBe("Obadiah 1:1-1:21"); // single-chapter book
    expect(bookSpan("not-a-book")).toBe("");
  });
});
