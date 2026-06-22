// canonicalBooks.js — the 66-book canonical reference for the Series Planner.
//
// PROVENANCE / VERSIFICATION ANCHOR
// ---------------------------------
// Versification: KJV/Protestant numbering. Grand total = 31,102 verses across
// 1,189 chapters. ESV (SermonForge's display translation) preserves these verse
// NUMBERS — it brackets/footnotes a handful of verses (e.g. Matt 17:21, 18:11,
// 23:14; Mark 7:16, 9:44/46, 11:26, 15:28; Luke 17:36, 23:17; John 5:4; Acts
// 8:37, 15:34, 24:7, 28:29; Rom 16:24) but keeps the numbering, so chapter:verse
// ranges align. Coverage math only needs one consistent versification; this is it.
//
// chapterVerses (verses-per-chapter) was vendored from the aruljohn/Bible-kjv
// dataset and cross-checked against a second independent KJV source (the two
// disagreed on 10 chapters; aruljohn matched the standard KJV counts and the
// 31,102 anchor, the other did not). The data passes the checksum gate in
// tests/unit/canonicalBooks.test.js (per-book chapter counts, per-book verse
// sums, the 31,102 grand total, and spot checks). Do NOT hand-edit
// chapterVerses — regenerate from a vetted source and re-run the gate.
//
// GENRE DEFAULTS follow Mark Dever's 7-genre rotation; each is the pastor-
// overridable default for a series (the series stores its own canon_category —
// this module only supplies the starting genre). JUDGMENT CALLS, flagged for
// easy override here: hebrews, revelation -> nt_general (Revelation is
// apocalyptic, not an epistle, but the 7-bucket scheme has no apocalyptic slot;
// Hebrews' authorship is uncertain); daniel -> ot_prophets (English-Bible order
// — the Hebrew canon places Daniel in the Writings). Joel (3 ch) and Malachi
// (4 ch) follow ESV/English numbering.
//
// Static reference data — no DB table, no AI, no network. Ships bundled.

export const GENRES = {
  ot_law: "OT — Law",
  ot_history: "OT — History",
  ot_writings: "OT — Writings",
  ot_prophets: "OT — Prophets",
  nt_gospels: "NT — Gospels & Acts",
  nt_pauline: "NT — Pauline Epistles",
  nt_general: "NT — General Epistles",
};

// Canonical order (1–66). chapterVerses[i] = number of verses in chapter i+1.
export const BOOKS = [
  { id: "genesis", name: "Genesis", testament: "OT", genre: "ot_law", order: 1, chapters: 50, totalVerses: 1533, chapterVerses: [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26] },
  { id: "exodus", name: "Exodus", testament: "OT", genre: "ot_law", order: 2, chapters: 40, totalVerses: 1213, chapterVerses: [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38] },
  { id: "leviticus", name: "Leviticus", testament: "OT", genre: "ot_law", order: 3, chapters: 27, totalVerses: 859, chapterVerses: [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34] },
  { id: "numbers", name: "Numbers", testament: "OT", genre: "ot_law", order: 4, chapters: 36, totalVerses: 1288, chapterVerses: [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13] },
  { id: "deuteronomy", name: "Deuteronomy", testament: "OT", genre: "ot_law", order: 5, chapters: 34, totalVerses: 959, chapterVerses: [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12] },
  { id: "joshua", name: "Joshua", testament: "OT", genre: "ot_history", order: 6, chapters: 24, totalVerses: 658, chapterVerses: [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33] },
  { id: "judges", name: "Judges", testament: "OT", genre: "ot_history", order: 7, chapters: 21, totalVerses: 618, chapterVerses: [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25] },
  { id: "ruth", name: "Ruth", testament: "OT", genre: "ot_history", order: 8, chapters: 4, totalVerses: 85, chapterVerses: [22, 23, 18, 22] },
  { id: "1-samuel", name: "1 Samuel", testament: "OT", genre: "ot_history", order: 9, chapters: 31, totalVerses: 810, chapterVerses: [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13] },
  { id: "2-samuel", name: "2 Samuel", testament: "OT", genre: "ot_history", order: 10, chapters: 24, totalVerses: 695, chapterVerses: [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25] },
  { id: "1-kings", name: "1 Kings", testament: "OT", genre: "ot_history", order: 11, chapters: 22, totalVerses: 816, chapterVerses: [53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53] },
  { id: "2-kings", name: "2 Kings", testament: "OT", genre: "ot_history", order: 12, chapters: 25, totalVerses: 719, chapterVerses: [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30] },
  { id: "1-chronicles", name: "1 Chronicles", testament: "OT", genre: "ot_history", order: 13, chapters: 29, totalVerses: 942, chapterVerses: [54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30] },
  { id: "2-chronicles", name: "2 Chronicles", testament: "OT", genre: "ot_history", order: 14, chapters: 36, totalVerses: 822, chapterVerses: [17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23] },
  { id: "ezra", name: "Ezra", testament: "OT", genre: "ot_history", order: 15, chapters: 10, totalVerses: 280, chapterVerses: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44] },
  { id: "nehemiah", name: "Nehemiah", testament: "OT", genre: "ot_history", order: 16, chapters: 13, totalVerses: 406, chapterVerses: [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31] },
  { id: "esther", name: "Esther", testament: "OT", genre: "ot_history", order: 17, chapters: 10, totalVerses: 167, chapterVerses: [22, 23, 15, 17, 14, 14, 10, 17, 32, 3] },
  { id: "job", name: "Job", testament: "OT", genre: "ot_writings", order: 18, chapters: 42, totalVerses: 1070, chapterVerses: [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17] },
  { id: "psalms", name: "Psalms", testament: "OT", genre: "ot_writings", order: 19, chapters: 150, totalVerses: 2461, chapterVerses: [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11, 9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 13, 20, 7, 35, 36, 5, 24, 20, 28, 23, 10, 12, 20, 72, 13, 19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 15, 5, 23, 11, 13, 12, 9, 9, 5, 8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6] },
  { id: "proverbs", name: "Proverbs", testament: "OT", genre: "ot_writings", order: 20, chapters: 31, totalVerses: 915, chapterVerses: [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31] },
  { id: "ecclesiastes", name: "Ecclesiastes", testament: "OT", genre: "ot_writings", order: 21, chapters: 12, totalVerses: 222, chapterVerses: [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14] },
  { id: "song-of-solomon", name: "Song of Solomon", testament: "OT", genre: "ot_writings", order: 22, chapters: 8, totalVerses: 117, chapterVerses: [17, 17, 11, 16, 16, 13, 13, 14] },
  { id: "isaiah", name: "Isaiah", testament: "OT", genre: "ot_prophets", order: 23, chapters: 66, totalVerses: 1292, chapterVerses: [31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24] },
  { id: "jeremiah", name: "Jeremiah", testament: "OT", genre: "ot_prophets", order: 24, chapters: 52, totalVerses: 1364, chapterVerses: [19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34] },
  { id: "lamentations", name: "Lamentations", testament: "OT", genre: "ot_prophets", order: 25, chapters: 5, totalVerses: 154, chapterVerses: [22, 22, 66, 22, 22] },
  { id: "ezekiel", name: "Ezekiel", testament: "OT", genre: "ot_prophets", order: 26, chapters: 48, totalVerses: 1273, chapterVerses: [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35] },
  { id: "daniel", name: "Daniel", testament: "OT", genre: "ot_prophets", order: 27, chapters: 12, totalVerses: 357, chapterVerses: [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13] },
  { id: "hosea", name: "Hosea", testament: "OT", genre: "ot_prophets", order: 28, chapters: 14, totalVerses: 197, chapterVerses: [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9] },
  { id: "joel", name: "Joel", testament: "OT", genre: "ot_prophets", order: 29, chapters: 3, totalVerses: 73, chapterVerses: [20, 32, 21] },
  { id: "amos", name: "Amos", testament: "OT", genre: "ot_prophets", order: 30, chapters: 9, totalVerses: 146, chapterVerses: [15, 16, 15, 13, 27, 14, 17, 14, 15] },
  { id: "obadiah", name: "Obadiah", testament: "OT", genre: "ot_prophets", order: 31, chapters: 1, totalVerses: 21, chapterVerses: [21] },
  { id: "jonah", name: "Jonah", testament: "OT", genre: "ot_prophets", order: 32, chapters: 4, totalVerses: 48, chapterVerses: [17, 10, 10, 11] },
  { id: "micah", name: "Micah", testament: "OT", genre: "ot_prophets", order: 33, chapters: 7, totalVerses: 105, chapterVerses: [16, 13, 12, 13, 15, 16, 20] },
  { id: "nahum", name: "Nahum", testament: "OT", genre: "ot_prophets", order: 34, chapters: 3, totalVerses: 47, chapterVerses: [15, 13, 19] },
  { id: "habakkuk", name: "Habakkuk", testament: "OT", genre: "ot_prophets", order: 35, chapters: 3, totalVerses: 56, chapterVerses: [17, 20, 19] },
  { id: "zephaniah", name: "Zephaniah", testament: "OT", genre: "ot_prophets", order: 36, chapters: 3, totalVerses: 53, chapterVerses: [18, 15, 20] },
  { id: "haggai", name: "Haggai", testament: "OT", genre: "ot_prophets", order: 37, chapters: 2, totalVerses: 38, chapterVerses: [15, 23] },
  { id: "zechariah", name: "Zechariah", testament: "OT", genre: "ot_prophets", order: 38, chapters: 14, totalVerses: 211, chapterVerses: [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21] },
  { id: "malachi", name: "Malachi", testament: "OT", genre: "ot_prophets", order: 39, chapters: 4, totalVerses: 55, chapterVerses: [14, 17, 18, 6] },
  { id: "matthew", name: "Matthew", testament: "NT", genre: "nt_gospels", order: 40, chapters: 28, totalVerses: 1071, chapterVerses: [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20] },
  { id: "mark", name: "Mark", testament: "NT", genre: "nt_gospels", order: 41, chapters: 16, totalVerses: 678, chapterVerses: [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20] },
  { id: "luke", name: "Luke", testament: "NT", genre: "nt_gospels", order: 42, chapters: 24, totalVerses: 1151, chapterVerses: [80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56, 53] },
  { id: "john", name: "John", testament: "NT", genre: "nt_gospels", order: 43, chapters: 21, totalVerses: 879, chapterVerses: [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25] },
  { id: "acts", name: "Acts", testament: "NT", genre: "nt_gospels", order: 44, chapters: 28, totalVerses: 1007, chapterVerses: [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31] },
  { id: "romans", name: "Romans", testament: "NT", genre: "nt_pauline", order: 45, chapters: 16, totalVerses: 433, chapterVerses: [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27] },
  { id: "1-corinthians", name: "1 Corinthians", testament: "NT", genre: "nt_pauline", order: 46, chapters: 16, totalVerses: 437, chapterVerses: [31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24] },
  { id: "2-corinthians", name: "2 Corinthians", testament: "NT", genre: "nt_pauline", order: 47, chapters: 13, totalVerses: 257, chapterVerses: [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14] },
  { id: "galatians", name: "Galatians", testament: "NT", genre: "nt_pauline", order: 48, chapters: 6, totalVerses: 149, chapterVerses: [24, 21, 29, 31, 26, 18] },
  { id: "ephesians", name: "Ephesians", testament: "NT", genre: "nt_pauline", order: 49, chapters: 6, totalVerses: 155, chapterVerses: [23, 22, 21, 32, 33, 24] },
  { id: "philippians", name: "Philippians", testament: "NT", genre: "nt_pauline", order: 50, chapters: 4, totalVerses: 104, chapterVerses: [30, 30, 21, 23] },
  { id: "colossians", name: "Colossians", testament: "NT", genre: "nt_pauline", order: 51, chapters: 4, totalVerses: 95, chapterVerses: [29, 23, 25, 18] },
  { id: "1-thessalonians", name: "1 Thessalonians", testament: "NT", genre: "nt_pauline", order: 52, chapters: 5, totalVerses: 89, chapterVerses: [10, 20, 13, 18, 28] },
  { id: "2-thessalonians", name: "2 Thessalonians", testament: "NT", genre: "nt_pauline", order: 53, chapters: 3, totalVerses: 47, chapterVerses: [12, 17, 18] },
  { id: "1-timothy", name: "1 Timothy", testament: "NT", genre: "nt_pauline", order: 54, chapters: 6, totalVerses: 113, chapterVerses: [20, 15, 16, 16, 25, 21] },
  { id: "2-timothy", name: "2 Timothy", testament: "NT", genre: "nt_pauline", order: 55, chapters: 4, totalVerses: 83, chapterVerses: [18, 26, 17, 22] },
  { id: "titus", name: "Titus", testament: "NT", genre: "nt_pauline", order: 56, chapters: 3, totalVerses: 46, chapterVerses: [16, 15, 15] },
  { id: "philemon", name: "Philemon", testament: "NT", genre: "nt_pauline", order: 57, chapters: 1, totalVerses: 25, chapterVerses: [25] },
  { id: "hebrews", name: "Hebrews", testament: "NT", genre: "nt_general", order: 58, chapters: 13, totalVerses: 303, chapterVerses: [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25] },
  { id: "james", name: "James", testament: "NT", genre: "nt_general", order: 59, chapters: 5, totalVerses: 108, chapterVerses: [27, 26, 18, 17, 20] },
  { id: "1-peter", name: "1 Peter", testament: "NT", genre: "nt_general", order: 60, chapters: 5, totalVerses: 105, chapterVerses: [25, 25, 22, 19, 14] },
  { id: "2-peter", name: "2 Peter", testament: "NT", genre: "nt_general", order: 61, chapters: 3, totalVerses: 61, chapterVerses: [21, 22, 18] },
  { id: "1-john", name: "1 John", testament: "NT", genre: "nt_general", order: 62, chapters: 5, totalVerses: 105, chapterVerses: [10, 29, 24, 21, 21] },
  { id: "2-john", name: "2 John", testament: "NT", genre: "nt_general", order: 63, chapters: 1, totalVerses: 13, chapterVerses: [13] },
  { id: "3-john", name: "3 John", testament: "NT", genre: "nt_general", order: 64, chapters: 1, totalVerses: 14, chapterVerses: [14] },
  { id: "jude", name: "Jude", testament: "NT", genre: "nt_general", order: 65, chapters: 1, totalVerses: 25, chapterVerses: [25] },
  { id: "revelation", name: "Revelation", testament: "NT", genre: "nt_general", order: 66, chapters: 22, totalVerses: 404, chapterVerses: [20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21] },
];

// --- lookups & range math (all derived from the static data above) ---

const _byId = new Map(BOOKS.map((b) => [b.id, b]));

// The book record for a stored book_id, or null if unknown (fail-soft).
export const bookById = (id) => _byId.get(id) || null;

// The full canonical span of a book as a display/parse string, e.g.
// "Luke 1:1-24:53" — used to pre-fill a series' passage_range. Hyphen (not
// en-dash) so it round-trips cleanly through the passage parser. "" if unknown.
export const bookSpan = (id) => {
  const b = _byId.get(id);
  if (!b) return "";
  return `${b.name} 1:1-${b.chapters}:${b.chapterVerses[b.chapters - 1]}`;
};
