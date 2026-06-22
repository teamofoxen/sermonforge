# Canonical Book Data — Series Planner Build Plan

A plan to add canonical book data to SermonForge and build the features it unlocks. Structured as scoped prompts for Claude Code. Hand them over one at a time, in order.

> **Superseded 2026-06-22 — historical build plan; do not use as current spec.** This
> canonical-book-data build shipped (`b022731`, audited/remediated `89fcc1c`). The Series
> Planner it builds on was then **re-leveled to four movements** (Understand · Design ·
> Schedule · Overview, `3330f35`), so the present-tense tab names below — "Book Study tab",
> "Overview tab", "Sermon Slots and Calendar tabs", "Structure" — no longer exist as named
> tabs. For the current planner field homes and mechanics see
> [`docs/SYSTEMS/series-planner.md`](../SYSTEMS/series-planner.md); for the schema (incl.
> `book_id` and `melodic_evidence` at v26) see [`docs/REFERENCE/schema.md`](../REFERENCE/schema.md).
> The core architectural decisions below (bundled static data, create-then-update,
> fail-soft, AI-free) all still hold; the plan is retained as the build record.

---

## Core architectural decisions (honor these throughout)

1. **Reference data is a bundled static module, not a DB table.** The 66-book dataset never changes. It lives in `src/data/canonicalBooks.js` and ships with the app. The only schema change is adding **`book_id` (TEXT, nullable)** to the `series` table. No reference data in SQLite, no migration for it.

2. **Auto-fill, overridable.** Selecting a book fills the series' genre, testament, and canonical passage span. The pastor can still override the genre. This is authorship by confirmation, not generation — it stays inside the AI-free constraint.

3. **Create-then-update stays.** Do **not** widen the `create-series` INSERT. `book_id` and the auto-filled genre persist through the existing debounced `updateSeries` path. Add `book_id` to `SERIES_COLUMNS` in `electron/contracts.cjs`; writes still gate through `buildUpdate`.

4. **Fail-soft everywhere.** A passage reference that won't parse shows a quiet "couldn't read this reference" note and is skipped from coverage math. It never blocks saving or navigation. If a book has no verse-count data, coverage degrades to chapter-level for that book.

5. **Still AI-free.** Every readout is arithmetic on pastor-authored fields — counting, date intervals, verse-range math. No generation, suggestion, or analysis. `no-direct-ai` must stay green after every phase.

6. **Discover before editing.** These docs may be stale. Each prompt starts by reading the real source and confirming the assumptions before touching anything.

---

## Decisions you need to make (3)

1. **Revelation's genre.** Default: `nt_general` (General Epistles). It's apocalyptic, not an epistle, but Dever's 7-bucket scheme has no apocalyptic slot. Option: add an optional `apocalyptic` tag alongside the genre. Your call — you're the one preaching it.
2. **Hebrews' genre.** Default: `nt_general` (Pauline authorship is uncertain). Option: `nt_pauline`.
3. **Legacy series after the 4→7 switch.** Auto-map `Wisdom → OT Writings` and `Prophetic → OT Prophets` (clean). The old `OT` and `NT` values are ambiguous → mark `unclassified` and surface a chip. Fixing one is just picking its book (which re-fills the genre). Low stakes given your series count.

---

## The dataset

### The 7 Dever genres (the enum)

```
ot_law        OT — Law
ot_history    OT — History
ot_writings   OT — Writings
ot_prophets   OT — Prophets
nt_gospels    NT — Gospels & Acts
nt_pauline    NT — Pauline Epistles
nt_general    NT — General Epistles
```

### 66-book classification + chapter counts

Grouped by genre (the grouping *is* the classification). Chapter counts are the checksum for the verse-data step — they must hold.

**ot_law (5):** Genesis 50 · Exodus 40 · Leviticus 27 · Numbers 36 · Deuteronomy 34

**ot_history (12):** Joshua 24 · Judges 21 · Ruth 4 · 1 Samuel 31 · 2 Samuel 24 · 1 Kings 22 · 2 Kings 25 · 1 Chronicles 29 · 2 Chronicles 36 · Ezra 10 · Nehemiah 13 · Esther 10

**ot_writings (5):** Job 42 · Psalms 150 · Proverbs 31 · Ecclesiastes 12 · Song of Solomon 8

**ot_prophets (17):** Isaiah 66 · Jeremiah 52 · Lamentations 5 · Ezekiel 48 · Daniel 12 · Hosea 14 · Joel 3 · Amos 9 · Obadiah 1 · Jonah 4 · Micah 7 · Nahum 3 · Habakkuk 3 · Zephaniah 3 · Haggai 2 · Zechariah 14 · Malachi 4

**nt_gospels (5):** Matthew 28 · Mark 16 · Luke 24 · John 21 · Acts 28

**nt_pauline (13):** Romans 16 · 1 Corinthians 16 · 2 Corinthians 13 · Galatians 6 · Ephesians 6 · Philippians 4 · Colossians 4 · 1 Thessalonians 5 · 2 Thessalonians 3 · 1 Timothy 6 · 2 Timothy 4 · Titus 3 · Philemon 1

**nt_general (9):** Hebrews 13 · James 5 · 1 Peter 5 · 2 Peter 3 · 1 John 5 · 2 John 1 · 3 John 1 · Jude 1 · Revelation 22

Totals: 39 OT + 27 NT = **66 books**, **1,189 chapters**.

Classification judgment calls, flagged in the seed for easy override: **Hebrews** (→ general, authorship), **Revelation** (→ general, apocalyptic), **Daniel** (→ prophets, follows English-Bible order; Hebrew canon places it in the Writings). **Joel** = 3 chapters and **Malachi** = 4 chapters per ESV/English (Hebrew differs); you use ESV, so these are correct.

### Versification anchor

Use **KJV/Protestant verse numbering** (the standard for versification datasets): **31,102 verses** total. ESV preserves these verse *numbers* — it brackets/footnotes a handful of verses (e.g. Matt 17:21, 18:11, 23:14; Mark 7:16, 9:44/46, 11:26, 15:28; Luke 17:36, 23:17; John 5:4; Acts 8:37, 15:34, 24:7, 28:29; Rom 16:24) but keeps the numbering, so ranges align. Document the anchor in the module header. Coverage math only needs *one consistent* versification; this is it.

### Module shape (`src/data/canonicalBooks.js`)

```js
// Versification: KJV/Protestant numbering. Grand total = 31,102 verses, 1,189 chapters.
// Genre defaults follow Dever's 7-genre rotation; pastor-overridable per series.
// JUDGMENT CALLS (override here if you disagree): hebrews, revelation -> nt_general; daniel -> ot_prophets.
export const GENRES = { /* the 7 enum keys -> display labels */ };

export const BOOKS = [
  {
    id: "luke",              // stable key, stored on series.book_id
    name: "Luke",            // ESV display name
    testament: "OT" | "NT",
    genre: "nt_gospels",     // one of the 7 keys
    order: 42,               // canonical order, for sorting
    chapters: 24,
    chapterVerses: [80, 52, 38, /* ...24 entries... */],  // verses per chapter
    totalVerses: 1151        // === sum(chapterVerses)
  },
  // ...66 entries
];

// helpers
export const bookById = (id) => /* ... */;
export const totalVersesInBook = (id) => /* ... */;
export const verseIndex = (id, chapter, verse) => /* linear index for range math */;
```

`chapterVerses` is the one dense, error-prone field — handled with a vetted source + checksum gate in Prompt 1.

---

## Phase 0 — Discovery

### Prompt 0

```
Goal: confirm the real architecture before any edits. Report findings, change nothing.

Read and summarize:
1. The series schema — find the migration mechanism. Look for a migrations dir, a
   PRAGMA user_version, schema.md, or wherever the `series` CREATE TABLE lives and how
   schema changes are applied today. I need to know the EXACT pattern to add one column.
2. electron/contracts.cjs — the SERIES_COLUMNS allowlist and how buildUpdate consumes it.
3. electron/main.js — the buildUpdate function and the create-series / update-series handlers.
4. src/components/SeriesPlanner.jsx — the Book Study tab: the "Series Text" field and the
   read-only chips for passage_range + canon_category. Where genre (canon_category) is
   currently read/written. Note the debounced persist path (handleSeriesField ->
   debouncedPersist -> updateSeries).
5. src/components/NewSeriesModal.jsx — the create flow.
6. src/utils/churchCalendar.js — exact exported functions and signatures
   (getUpcomingSundays / getSeasonForDate / toDateString and any holiday/special-date logic).
7. src/components/Planning.jsx — how it fetches and lists all series (the Arc view will
   reuse this data path).
8. The existing canon_category dropdown values and every place they're rendered
   (Overview dropdown, study-guide export, chips).

Report: the migration pattern, the allowlist mechanism, the genre read/write sites, and
the churchCalendar API. Flag anything that contradicts my assumptions.
```

---

## Phase 1 — Canonical data + 7-genre switch + book picker

**Effort: M.** The foundation. Everything else depends on it.

### Prompt 1 — the static module

```
Goal: create src/data/canonicalBooks.js with all 66 books and a checksum test. No UI yet.

Data: use the genre/chapter table I'm providing [paste the 66-book table]. Genre defaults
include the flagged judgment calls (hebrews, revelation -> nt_general; daniel -> ot_prophets).

chapterVerses (verses-per-chapter): do NOT hand-type 1,189 numbers from memory. Instead:
1. Find a reputable, vetted versification dataset — an npm package or a github-raw JSON of
   KJV/Protestant verses-per-chapter. (Network is limited to npm/github/pypi/etc., which is
   fine for this.) Vendor the verse counts into the module.
2. If no clean source is available, generate them, but they MUST pass the gate below.

Gate (write as a test, e.g. canonicalBooks.test.js):
- For each book: chapterVerses.length === chapters.
- For each book: sum(chapterVerses) === totalVerses.
- Grand total: sum of all totalVerses === 31102.
- Spot-checks: Psalm 119 = 176 verses, Psalm 117 = 2, Psalm 100 = 5, John 11 contains v35,
  Genesis 1 = 31, Revelation 22 = 21.

Also export: GENRES map, bookById, totalVersesInBook, verseIndex(id, chapter, verse)
(linear verse index across chapters, for later range math).

Test: the gate passes. no-direct-ai stays green (this is static data, no AI).
Don't: touch the DB or any component yet.
```

### Prompt 2 — schema + allowlist

```
Goal: add series.book_id and switch the genre enum to the 7 Dever genres.

Following the EXACT migration pattern you found in Prompt 0:
1. Add column `book_id TEXT` (nullable) to the series table.
2. Add book_id to SERIES_COLUMNS in electron/contracts.cjs so it's writable via updateSeries.
   Do NOT add it to the create-series INSERT — create-then-update stays (charter ruling).
3. Genre values: the canon_category column now holds the 7 keys from GENRES. Migrate existing
   rows: Wisdom -> ot_writings, Prophetic -> ot_prophets, OT/NT -> null (unclassified).

Test: a fresh series can be created (unchanged), then updateSeries({book_id}) persists.
Existing series load without error; migrated genre values are correct.
Don't: widen the create-series INSERT. Don't store testament/genre-from-book anywhere except
the existing canon_category (everything else is looked up from the static module at render).
```

### Prompt 3 — book picker + auto-fill + genre override

```
Goal: a canonical book selector on Book Study that auto-fills genre/testament/span, overridable.

On the Book Study tab, replace/augment the "Series Text" field with a searchable book picker
(the 66 books from canonicalBooks.js, grouped or ordered canonically). On selection:
- write series.book_id (debounced updateSeries path).
- auto-fill canon_category from the book's genre, and pre-fill passage_range with the book's
  full canonical span (e.g. "Luke 1:1-24:53") IF passage_range is currently empty (don't
  clobber a pastor-entered range).
- the existing read-only chips (passage_range + canon_category) now light up from this.

On the Overview tab: the Biblical Category dropdown shows the resolved genre and remains
EDITABLE — an override persists. Rule: changing the BOOK re-fills the genre (explicit act);
editing the dropdown directly overrides until the book changes again. Add an "unclassified"
display state for legacy rows.

Test: pick a book -> book_id + genre + (empty) passage_range fill -> chips show. Override genre
on Overview -> persists. Change book -> genre re-fills. no-direct-ai green.
Don't: make genre read-only. Don't auto-clobber a non-empty passage_range.
```

This phase fully delivers the Dever-genre switch (idea #1) and lays the data for everything below.

---

## Phase 2 — Pacing readout

**Effort: S.** Cheap, high-value. Hits the "doesn't facilitate a process" complaint directly — pacing is a real decision the tool is silent on today.

### Prompt 4

```
Goal: a deterministic pacing strip on the Sermon Slots and Calendar tabs. No AI — pure arithmetic.

Compute from existing data:
- slot count -> approx weeks (= slots) -> approx months (weeks / 4.345) -> projected end date
  (start_date + slots*7 days, skipping flagged special dates via churchCalendar, matching how
  "Suggest Sundays" already steps).
- a neutral LENGTH BAND by slot count, labeled, not judged:
  Short (<=6) · Standard (7-12) · Long (13-20) · Extended (21+).
  (Research sweet spot for accessibility is ~8-12; longer is fine, just named.)
- a flag if the date range crosses a liturgical season boundary or a flagged special date
  (reuse getSeasonForDate). E.g. "spans Advent" or "crosses your 'VBS week' note".

Render as a compact strip (read-only), e.g.:
  "16 slots · ~16 weeks · ~3.7 months · ends ~Oct 11 · Long · spans Advent"

Test: numbers update live as slots/dates change. Reuses churchCalendar, no new date logic.
no-direct-ai green.
Don't: prescribe or warn beyond stating facts. It's a mirror, not an advisor.
```

---

## Phase 3 — Coverage engine

**Effort: M.** The real build, and the deepest fix. Turns the slot list from free-text strings into a visible partition of the book you can check — the central craft act of expository series planning, invisible to the tool today.

### Prompt 5 — passage parser

```
Goal: a reference parser, with tests. This is the load-bearing, risk-carrying piece — scope it
tight and fail soft.

src/utils/passageRef.js — parse a slot's passage string into a normalized range WITHIN the
series' book (the book is known, so DON'T recognize 66 book names — just parse the chapter:verse
range; ignore/loosely validate any leading book name).

Handle: "1:1-4:13" (cross-chapter), "1:1-4" (same chapter), "2" (whole chapter),
"2:9" (single verse), en-dash and hyphen, surrounding spaces, optional leading book name.
Out of scope for v1: multiple disjoint ranges ("1:1-4, 1:46-55"), cross-book ranges.

Return { startCh, startV, endCh, endV } or { error: true } — never throw. Whole-chapter refs
resolve verse bounds from canonicalBooks chapterVerses (start=1, end=last verse of chapter);
if that book has no verse data, mark the range chapter-level (verseUnknown: true).

Test (a table of inputs -> expected): all the cases above plus malformed strings -> {error}.
Don't: throw. Don't try to parse book names against a 66-name list.
```

### Prompt 6 — coverage engine + UI

```
Goal: a coverage panel on the Sermon Slots tab (or Structure). Deterministic, informational,
never a gate.

Engine (src/utils/coverage.js): given the series book + all slots' parsed ranges, compute:
- a proportional coverage bar of the whole book (using verseIndex / chapterVerses).
- GAPS: verse spans no slot covers (e.g. "uncovered: 3:1-21").
- OVERLAPS: two slots claiming the same verses.
- OUT-OF-ORDER: a slot whose range starts before the previous slot's.
- % covered.
Degrade gracefully: if the book has no verse data, do chapter-level coverage (which chapters
are touched / missed) and say so.

UI: the bar + a short plain list of gaps/overlaps/order notes. Purely informational — you can
intentionally skip a genealogy; it just shows what you're skipping. Slots with {error} refs
show the quiet "couldn't read this reference" note and are excluded from the math.

Test: engine unit tests — a set of slot ranges -> expected gaps/overlaps/order/%. Verify a
no-verse-data book falls back to chapter-level. no-direct-ai green.
Don't: block, warn, or prescribe. Don't exclude a book from the feature just because it lacks
verse data — fall back.
```

---

## Phase 4 — Cross-series Arc view (v1)

**Effort: S–M.** The new sibling surface — the one view a single-series design can't have. Your planning-retreat tool. Independent of Phase 3; build it earlier if you want it sooner. This is where Dever's balance logic lives, because it can only exist *above* the series.

### Prompt 7

```
Goal: a new top-level view that reads ALL series and computes balance + gaps. v1 is a table +
a sidebar, NOT a graphical timeline (defer that to v2).

Add VIEW.Arc (name as you like) + a sidebar NAV_ITEMS entry, mirroring how VIEW.Planning /
Planning.jsx is wired. Reuse Planning.jsx's series fetch.

Table: all series sorted by start_date (then year). Columns: title · book · genre · testament ·
date range · slot count · gap-to-next (days between this series' end and the next's start).

Balance sidebar (deterministic counts across a trailing window — default last 24 months from
today, adjustable):
- the 7 genres: which are TOUCHED, which are MISSING in the window (Dever's ~2-year goal:
  every genre touched).
- OT : NT ratio.
- count of unclassified series (prompt to fix by assigning a book).

Concretely this is the view where your next arc — 1 Peter (nt_general) -> Daniel (ot_prophets)
-> Revelation (nt_general) — shows up together: the genre spread, the OT/NT skew, and the empty
Sundays between them.

Test: renders with multiple series; counts are correct; window adjusts. no-direct-ai green.
Don't: build the graphical timeline yet. Don't add inter-series foreign keys — the relationship
is in the reading (aggregation), not the schema.
```

**v2 (deferred, M–L):** a horizontal timeline of series bars on a year axis. Flag before starting — it's the one genuinely larger build here.

---

## Phase 5 — Copy deepeners (polish)

**Effort: XS–S.** Near-free sharpening of the process the tabs imply.

### Prompt 8

```
Goal: copy + read-only echoes that keep the part-to-whole discipline visible. No new fields,
no logic beyond echoing existing values.

1. Book Study #6 ("Working Big Idea"): reframe the prompt toward the melodic-line discipline —
   the ONE line every passage in this book relates to. (Copy change only.)
2. Sermon Slots: beside each slot, show a read-only echo of its section's Big Idea and the
   Series Big Idea (the same pattern Overview already uses for the working hypothesis), so
   you're always relating the sermon to the whole while slotting.

Test: echoes reflect current values; no persistence changes. no-direct-ai green.
Don't: add editable fields or any generation.
```

---

## Recommended sequence

**P1 → P2 → P3 → P4 → P5.** P1 is required by everything. P2 is an afternoon and adds depth immediately. P4 is independent of P3 — pull it forward if the cross-series retreat tool is what you want first. P3 is the real investment and the biggest hit on "hints at a process but doesn't facilitate one." P5 anytime after P1.

Run the no-direct-ai lint and the relevant tests as the gate at the end of every prompt before moving on.
