import { bookById } from "../data/canonicalBooks";
import { parsePassageRef } from "./passageRef";

// coverage — given a series' book and its sermon slots, compute a deterministic,
// purely informational picture of how the slots partition the book: percent
// covered, GAPS (verse spans no slot touches), OVERLAPS (two slots claiming the
// same verses), and OUT-OF-ORDER slots (one whose range starts before the
// previous slot's). It is a mirror, never a gate — you can intentionally skip a
// genealogy; it just shows what you're skipping.
//
// Verse-level when the book has per-chapter verse data (all 66 canonical books
// do); degrades to chapter-level (which chapters are touched / missed) when it
// doesn't. Slots whose passage won't parse are reported as "unreadable" and
// excluded from the math — never block, never throw. AI-free arithmetic.

function formatRange(sCh, sV, eCh, eV) {
  if (sCh === eCh) return sV === eV ? `${sCh}:${sV}` : `${sCh}:${sV}-${eV}`;
  return `${sCh}:${sV}-${eCh}:${eV}`;
}

// Compress a sorted list of chapter numbers into compact labels: [3,5,6,7] -> ["3","5-7"].
function compressChapters(chapters) {
  const out = [];
  let i = 0;
  while (i < chapters.length) {
    let j = i;
    while (j + 1 < chapters.length && chapters[j + 1] === chapters[j] + 1) j++;
    out.push(chapters[i] === chapters[j] ? `${chapters[i]}` : `${chapters[i]}-${chapters[j]}`);
    i = j + 1;
  }
  return out;
}

// A 1-based linear verse indexer over a book object's chapterVerses, plus the
// inverse (linear index -> {ch, v}) for turning gap spans back into labels.
function makeIndexer(book) {
  const cv = book.chapterVerses;
  const offsets = [0];
  for (let i = 0; i < cv.length; i++) offsets.push(offsets[i] + cv[i]);
  const total = offsets[offsets.length - 1];
  return {
    total,
    toIdx: (ch, v) => offsets[ch - 1] + v,
    toRef: (idx) => {
      let lo = 1;
      let hi = cv.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (offsets[mid] < idx) lo = mid + 1;
        else hi = mid;
      }
      return { ch: lo, v: idx - offsets[lo - 1] };
    },
  };
}

// Round honestly for a coverage meter: never show 100% while a gap remains, and
// never show 0% when at least one verse is covered. (The raw covered/gaps fields
// stay exact; this only guards the rounded headline from misleading.)
function honestPercent(covered, total, hasGaps) {
  if (total <= 0) return 0;
  let p = Math.round((covered / total) * 100);
  if (p >= 100 && hasGaps) p = 99;
  if (p <= 0 && covered > 0) p = 1;
  return p;
}

function emptyResult(mode, extra = {}) {
  return { mode, percent: 0, covered: 0, total: 0, gaps: [], overlaps: [], outOfOrder: [], unreadable: [], ...extra };
}

function verseLevel(book, readable, unreadable) {
  const ix = makeIndexer(book);
  const spans = readable.map((p) => ({
    index: p.index,
    start: ix.toIdx(p.ref.startCh, p.ref.startV),
    end: ix.toIdx(p.ref.endCh, p.ref.endV),
  }));

  // Out-of-order: a slot whose range starts before the previous slot's (list order).
  const outOfOrder = [];
  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start < spans[i - 1].start) outOfOrder.push(spans[i].index);
  }

  // Overlaps: any pair of slots whose verse spans intersect.
  const overlaps = [];
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      if (spans[i].start <= spans[j].end && spans[j].start <= spans[i].end) {
        overlaps.push({ a: spans[i].index, b: spans[j].index });
      }
    }
  }

  // Gaps + covered count via a forward sweep (handles overlaps correctly).
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const gapSpans = [];
  let cursor = 1;
  for (const s of sorted) {
    if (s.start > cursor) gapSpans.push([cursor, s.start - 1]);
    cursor = Math.max(cursor, s.end + 1);
  }
  if (cursor <= ix.total) gapSpans.push([cursor, ix.total]);

  const uncovered = gapSpans.reduce((sum, [a, b]) => sum + (b - a + 1), 0);
  const covered = ix.total - uncovered;
  const gaps = gapSpans.map(([a, b]) => {
    const s = ix.toRef(a);
    const e = ix.toRef(b);
    return formatRange(s.ch, s.v, e.ch, e.v);
  });

  return {
    mode: "verse",
    percent: honestPercent(covered, ix.total, gaps.length > 0),
    covered,
    total: ix.total,
    gaps,
    overlaps,
    outOfOrder,
    unreadable,
  };
}

function chapterLevel(book, readable, unreadable) {
  const total = book.chapters;
  const spans = readable.map((p) => ({ index: p.index, startCh: p.ref.startCh, endCh: p.ref.endCh }));

  const touched = new Set();
  for (const s of spans) {
    for (let c = Math.max(1, s.startCh); c <= Math.min(total, s.endCh); c++) touched.add(c);
  }

  const outOfOrder = [];
  for (let i = 1; i < spans.length; i++) {
    if (spans[i].startCh < spans[i - 1].startCh) outOfOrder.push(spans[i].index);
  }

  const overlaps = [];
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      if (spans[i].startCh <= spans[j].endCh && spans[j].startCh <= spans[i].endCh) {
        overlaps.push({ a: spans[i].index, b: spans[j].index });
      }
    }
  }

  const missing = [];
  for (let c = 1; c <= total; c++) if (!touched.has(c)) missing.push(c);

  return {
    mode: "chapter",
    percent: honestPercent(touched.size, total, missing.length > 0),
    covered: touched.size,
    total,
    gaps: compressChapters(missing),
    overlaps,
    outOfOrder,
    unreadable,
  };
}

// Core: a resolved book object + slots already parsed into refs. Exported so the
// chapter-level fallback is testable with a synthetic no-verse-data book.
export function coverageFromParsed(book, parsed) {
  if (!book) return emptyResult("none", { noBook: true });
  const unreadable = parsed.filter((p) => p.ref && p.ref.error).map((p) => p.index);
  const readable = parsed.filter((p) => p.ref && !p.ref.error);

  const hasVerseData =
    Array.isArray(book.chapterVerses) &&
    book.chapterVerses.length === book.chapters &&
    !readable.some((p) => p.ref.verseUnknown);

  return hasVerseData ? verseLevel(book, readable, unreadable) : chapterLevel(book, readable, unreadable);
}

// Public: resolve the book from its id and parse each slot's passage string.
// `slots` is an array of objects with a `.passage` field (sermon rows).
export function computeCoverage(bookId, slots = []) {
  const book = bookById(bookId);
  if (!book) return emptyResult("none", { noBook: true });
  const parsed = (slots || []).map((s, i) => ({
    index: i + 1,
    passage: (s && s.passage) || "",
    ref: parsePassageRef((s && s.passage) || "", bookId),
  }));
  return coverageFromParsed(book, parsed);
}
