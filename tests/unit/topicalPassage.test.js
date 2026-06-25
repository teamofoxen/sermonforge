import { describe, it, expect } from "vitest";
import {
  composePassage,
  refFromPassage,
  leadingBookName,
  repointPassage,
} from "../../src/utils/topicalPassage";

describe("composePassage — book_id + ref → one passage string", () => {
  it("joins a book and a ref", () => {
    expect(composePassage("genesis", "12:1-3")).toBe("Genesis 12:1-3");
  });
  it("returns just the book name when there is no ref", () => {
    expect(composePassage("genesis", "")).toBe("Genesis");
    expect(composePassage("genesis", "   ")).toBe("Genesis");
  });
  it("returns just the ref when there is no book", () => {
    expect(composePassage("", "12:1-3")).toBe("12:1-3");
    expect(composePassage(null, "John 3:16")).toBe("John 3:16");
  });
  it("trims the ref", () => {
    expect(composePassage("genesis", "  12:1  ")).toBe("Genesis 12:1");
  });
});

describe("refFromPassage — extract the bare ref, word-boundary safe", () => {
  it("strips the bound book's leading name", () => {
    expect(refFromPassage("Genesis 12:1-3", "genesis")).toBe("12:1-3");
  });
  it("handles a multi-word / numbered book name", () => {
    expect(refFromPassage("Song of Solomon 2:1", "song-of-solomon")).toBe("2:1");
    expect(refFromPassage("1 John 4:7", "1-john")).toBe("4:7");
  });
  it("returns empty when the passage is only the book name", () => {
    expect(refFromPassage("Genesis", "genesis")).toBe("");
  });
  it("does NOT split a word that merely starts with the book name (I2)", () => {
    // "Job" is bound, but the text is "Jobs ..." — must not become "s ...".
    expect(refFromPassage("Jobs of the prophets", "job")).toBe("Jobs of the prophets");
  });
  it("returns the whole string when no book is bound (legacy free text)", () => {
    expect(refFromPassage("John 3:16", null)).toBe("John 3:16");
    expect(refFromPassage("Jobs of the prophets", "")).toBe("Jobs of the prophets");
  });
});

describe("leadingBookName — the canonical book a string leads with (word boundary)", () => {
  it("matches a leading book name followed by a space", () => {
    expect(leadingBookName("John 3:16")).toBe("John");
    expect(leadingBookName("Genesis 12:1-3")).toBe("Genesis");
  });
  it("matches the whole-string case", () => {
    expect(leadingBookName("Genesis")).toBe("Genesis");
  });
  it("prefers the longest match so multi-word / numbered names win", () => {
    expect(leadingBookName("Song of Solomon 2:1")).toBe("Song of Solomon");
    expect(leadingBookName("1 John 4:7")).toBe("1 John");
  });
  it("does NOT match a longer word that only starts with a book name", () => {
    expect(leadingBookName("Jobs of the prophets")).toBe("");
    expect(leadingBookName("Johnny came home")).toBe("");
    expect(leadingBookName("Acts of kindness")).toBe("Acts"); // "Acts " IS a boundary
  });
  it("returns empty for a non-reference / ref-only string", () => {
    expect(leadingBookName("12:1-3")).toBe("");
    expect(leadingBookName("")).toBe("");
  });
});

describe("repointPassage — pick a book without doubling or splitting (I1, I2)", () => {
  it("clean migration: free text names the same book the pastor picks", () => {
    expect(repointPassage("Genesis 12:1-3", "genesis")).toBe("Genesis 12:1-3");
  });
  it("does not double when the free text names a DIFFERENT book (I1)", () => {
    // "John 3:16" + pick Genesis must NOT become "Genesis John 3:16".
    expect(repointPassage("John 3:16", "genesis")).toBe("Genesis 3:16");
  });
  it("re-points a bound passage onto a new book, carrying the ref", () => {
    expect(repointPassage("Genesis 12:1-3", "exodus")).toBe("Exodus 12:1-3");
  });
  it("does not split a word that merely starts with the picked book's name (I2)", () => {
    // "Jobs of the prophets" + pick Job: visible, not the corrupt "Job s of...".
    expect(repointPassage("Jobs of the prophets", "job")).toBe("Job Jobs of the prophets");
  });
  it("picking a book for an empty passage yields just the book name", () => {
    expect(repointPassage("", "genesis")).toBe("Genesis");
    expect(repointPassage(null, "genesis")).toBe("Genesis");
  });
});
