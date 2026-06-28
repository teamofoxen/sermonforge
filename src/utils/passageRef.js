import { bookById } from "../data/canonicalBooks";

// passageRef — parse a slot's passage string into a normalized chapter:verse
// range WITHIN a known book. The series already knows its book, so this does
// NOT recognize the 66 book names; it parses the TRAILING chapter:verse pattern
// and ignores a leading book name. That's what lets digit-containing names
// ("1 Samuel 2:3", "2 John 1:5") work without a name table.
//
// Because it anchors on the trailing token, it guards against a leading REAL
// reference + trailing junk (e.g. "John 3.16", "John 3 vv.16-17") by requiring
// whatever precedes the match to be empty or genuinely book-name-shaped, and it
// rejects disjoint citations ("8:1, 28" / "1:1-4; 2:1-20") outright rather than
// silently parsing only the last token.
//
// Contract: returns { startCh, startV, endCh, endV } (all numbers), or
// { ..., endV: null, verseUnknown: true } for a whole-chapter ref whose end
// verse can't be resolved (unknown book / no verse data), or { error: true }
// for anything unparseable or out of scope. NEVER throws.
//
// In scope: "1:1-4:13" (cross-chapter), "1:1-4" (same chapter), "2" (whole
// chapter), "2:9" (single verse); hyphen / en-dash / em-dash / minus; surrounding
// spaces; optional leading book name. Out of scope (v1): disjoint ranges
// ("1:1-4, 1:46-55") and cross-book ranges.

// Trailing "C[:V][ <dash> C2[:V2] ]" — the book-name prefix (if any) is ignored.
const REF_RE = /(\d+)\s*(?::\s*(\d+))?\s*(?:[-–—−]\s*(\d+)\s*(?::\s*(\d+))?)?\s*$/;

// A valid prefix is empty, or a plain book name: an optional leading ordinal
// (1/2/3 for "1 Samuel", "2 John") then letters / spaces / periods. No stray
// digits or separators — those signal the trailing token isn't the whole ref.
const BOOK_PREFIX_RE = /^\s*(?:[1-3]\s+)?[A-Za-z][A-Za-z.\s]*$/;

export function parsePassageRef(raw, bookId) {
  if (typeof raw !== "string") return { error: true };
  const s = raw.trim();
  if (!s) return { error: true };
  // Disjoint lists / multi-passage citations are out of scope (v1) — reject
  // rather than silently keeping only the trailing token.
  if (/[,;]/.test(s)) return { error: true };

  const m = s.match(REF_RE);
  if (!m) return { error: true };

  // Guard the leading-real-reference-plus-trailing-token trap.
  const prefix = s.slice(0, m.index);
  if (prefix && !BOOK_PREFIX_RE.test(prefix)) return { error: true };

  // Sanity cap: the largest book is Psalms (150 chapters), so any chapter/verse
  // beyond this is a malformed or overflowing token — e.g. a 20-digit number that
  // parseInt turns into 1e20, or a 50000-digit one that becomes Infinity. Reject
  // it as unreadable rather than letting an unbounded value leak through for an
  // UNKNOWN book (the known-book path is already bounded by the book's own counts).
  const MAX_REF = 10000;
  const bad = (n) => !Number.isInteger(n) || n < 1 || n > MAX_REF;

  const [, c1, v1, c2, v2] = m;
  const startCh = parseInt(c1, 10);
  const startHasVerse = v1 !== undefined;
  const startV = startHasVerse ? parseInt(v1, 10) : 1;
  if (bad(startCh) || (startHasVerse && bad(startV))) return { error: true };

  const book = bookById(bookId);
  // For a KNOWN book, a chapter past its end is a typo for this book → error.
  // (startCh / endNum are already validated >= 1 by bad() above, so only the
  // upper bound is checked here.)
  const chapterOutOfRange = (ch) => book && ch > book.chapters;
  const lastVerseOf = (ch) =>
    book && ch >= 1 && ch <= book.chapters ? book.chapterVerses[ch - 1] : null;

  if (chapterOutOfRange(startCh)) return { error: true };

  // Resolve the end of the range into (endCh, endV); verseUnknown marks a
  // whole-chapter end whose verse bound can't be known (no book data).
  let endCh;
  let endV;
  let verseUnknown = false;

  if (c2 === undefined) {
    // Single verse ("2:9") or whole chapter ("2").
    endCh = startCh;
    if (startHasVerse) {
      endV = startV;
    } else {
      const last = lastVerseOf(startCh);
      if (last == null) { endV = null; verseUnknown = true; } else endV = last;
    }
  } else {
    const endNum = parseInt(c2, 10);
    if (bad(endNum)) return { error: true };
    const endHasVerse = v2 !== undefined;
    if (endHasVerse) {
      // "1:1-4:13" / "1-4:13" — endNum is a CHAPTER.
      if (chapterOutOfRange(endNum)) return { error: true };
      endCh = endNum;
      endV = parseInt(v2, 10);
      if (bad(endV)) return { error: true };
    } else if (startHasVerse) {
      // "1:1-4" — endNum is an end VERSE in the start chapter.
      endCh = startCh;
      endV = endNum;
    } else {
      // "1-4" — endNum is an end CHAPTER (whole-chapter range).
      if (chapterOutOfRange(endNum)) return { error: true };
      endCh = endNum;
      const last = lastVerseOf(endNum);
      if (last == null) { endV = null; verseUnknown = true; } else endV = last;
    }
  }

  // Verse bounds (known book): a verse past its chapter's length is a typo for
  // THIS book — reject, so the coverage engine never over-claims or shifts a gap
  // label by phantom verses.
  if (book) {
    if (startV > lastVerseOf(startCh)) return { error: true };
    if (endV != null && endV > lastVerseOf(endCh)) return { error: true };
  }
  // Ordering: the end must not precede the start. A reversed range ("5:1-3:1",
  // "4-2") is a typo, not a real span — reject so coverage never sees start > end.
  if (endCh < startCh || (endCh === startCh && endV != null && endV < startV)) {
    return { error: true };
  }

  return verseUnknown
    ? { startCh, startV, endCh, endV: null, verseUnknown: true }
    : { startCh, startV, endCh, endV };
}

// Enumerate the verse numbers a SINGLE-CHAPTER range covers, for pre-seeding
// the structure canvas's left-margin gutter. Pure data — a deterministic
// lookup off the parsed reference, no ESV fetch and no AI (the verse numbers
// for a range are a formula, not a generation). Single chapter only:
// cross-chapter ranges need per-chapter verse counts that aren't available at
// the writing-surface seam, so they (and anything unparseable / verse-unknown)
// return [] and the caller falls back to a blank canvas. NEVER throws.
export function versesForSingleChapterRange(raw, bookId) {
  const r = parsePassageRef(raw, bookId);
  if (!r || r.error || r.verseUnknown) return [];
  if (r.startCh !== r.endCh) return [];
  if (!Number.isInteger(r.startV) || !Number.isInteger(r.endV)) return [];
  if (r.endV < r.startV) return [];
  const out = [];
  for (let v = r.startV; v <= r.endV; v++) out.push(v);
  return out;
}
