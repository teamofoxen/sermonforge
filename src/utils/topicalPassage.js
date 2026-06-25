import { BOOKS, bookById } from "../data/canonicalBooks";

// topicalPassage — the one place a topical sermon's structured Book (`book_id`)
// and its single free-text `passage` string convert between each other. A topical
// sermon stores ONE passage built from book_id + a chapter:verse ref, so the two
// can never disagree (no dual source of truth — charter:
// docs/PROPOSALS/coverage-initiative.md).

// Join a book + chapter:verse ref into the passage string ("genesis", "12:1-3")
// -> "Genesis 12:1-3". Either part may be empty.
export function composePassage(bookId, ref) {
  const name = (bookById(bookId) || {}).name || "";
  const r = (ref || "").trim();
  if (name && r) return `${name} ${r}`;
  return name || r;
}

// All 66 book names, longest first, so a multi-word name ("Song of Solomon",
// "1 John") is matched before any shorter name nested inside it.
const BOOK_NAMES_LONGEST_FIRST = BOOKS.map((b) => b.name).sort((a, b) => b.length - a.length);

// The canonical book name a passage leads with, on a WORD boundary (the name is
// the whole string, or is immediately followed by a space) — so "Jobs" / "Johnny"
// never match "Job" / "John". "" when the passage doesn't begin with a book name.
export function leadingBookName(passage) {
  const p = (passage || "").trim();
  for (const name of BOOK_NAMES_LONGEST_FIRST) {
    if (p === name || p.startsWith(`${name} `)) return name;
  }
  return "";
}

// Pull the bare chapter:verse ref out of a passage by dropping the bound book's
// leading name. With no book bound (a legacy free-text passage typed before the
// picker existed) the whole string is the ref. Word boundary, so a book named
// "Job" / "John" never eats into a ref that merely starts with those letters.
export function refFromPassage(passage, bookId) {
  const name = (bookById(bookId) || {}).name || "";
  const p = (passage || "").trim();
  if (name && (p === name || p.startsWith(`${name} `))) return p.slice(name.length).trim();
  return p;
}

// Re-point a passage onto a newly picked book: take whatever chapter:verse the
// current passage carries — dropping ANY leading book name, the bound one OR a
// different book named in a legacy free-text passage — and recompose it under the
// new book. This is what stops "John 3:16" + pick Genesis from becoming the
// doubled "Genesis John 3:16", and stops the old bare-prefix strip from splitting
// "Jobs of the prophets" into "Job s of the prophets".
export function repointPassage(passage, newBookId) {
  const lead = leadingBookName(passage);
  const p = (passage || "").trim();
  const ref = lead ? p.slice(lead.length).trim() : p;
  return composePassage(newBookId, ref);
}
