import { describe, it, expect } from "vitest";
import * as sampleMod from "../../electron/sampleData.js";
import { GENRES, bookById } from "../../src/data/canonicalBooks.js";

// The sample seed is INSERTed directly (not through the v25 migration), so its
// canon_category must ALREADY be a valid 7-genre key (or empty) — a legacy 4-key
// value like "nt" would render as Unclassified and match no Overview dropdown
// option. This locks the seed against silently re-acquiring a pre-v25 value.
const sampleData = sampleMod.default || sampleMod;
const VALID_CATEGORY = new Set([...Object.keys(GENRES), "", null, undefined]);

describe("sample seed — canonical classification is valid", () => {
  it("series.canon_category is a 7-genre key or empty (never a legacy 4-key value)", () => {
    expect(VALID_CATEGORY.has(sampleData.series.canon_category)).toBe(true);
  });

  it("series.book_id, when set, resolves to a real canonical book", () => {
    const { book_id } = sampleData.series;
    if (book_id != null && book_id !== "") {
      expect(bookById(book_id)).not.toBeNull();
    }
  });
});
