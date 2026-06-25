# Coverage Initiative — Charter

**Status:** PROPOSED 2026-06-25 — **not yet built.** The *what & why* + locked
decisions for a **"Coverage" home** that answers *"what have I been feeding my
people?"* across two lenses: the canon (the Series Arc, reworked) and topics
(new, sermon-level tags). Build mechanics land per phase. Baseline: the topical
Series Planner mode shipped 2026-06-25 (`a6a95f0`, schema **v30** — see
[`series-planner-revival-charter.md`](series-planner-revival-charter.md)
"2026-06-25 — Topical Series mode").

## Why

The Series Planner now plans two kinds of series — **book** and **topical**. A
topical series gathers passages from many books, but each sermon's book lives
only in its **free-text passage string**, so topical series are invisible to the
**Series Arc** (`src/utils/arc.js` + `src/components/Arc.jsx`) — the cross-series
canon-balance view, which counts one book *per series*. The one series type that
deliberately ranges across the whole Bible is the blind spot on the very screen
built to show range across the Bible. The pastor will lean on the Arc, so this
makes coverage whole — and adds the second lens he asked for: coverage **by
topic**, not just by book.

## Decision

A **"Coverage" home** with two complementary lenses:

1. **By the Bible** — the Arc, reworked to count per *sermon* so it includes
   topical series and their full genre spread.
2. **By topic** — a new, **tag-driven** view that shows what themes have been
   preached, cutting across book series, topical series, AND standalone sermons.

Macro/architect work (the series-planning headspace), **AI-free**, and a
read/reflection surface — it shows what the pastor has done; it does not direct
him.

## Locked decisions (from the 2026-06-25 design conversation — do not re-litigate)

- **Topics lens = "SHOW WHAT I'VE COVERED," never "warn what I'm missing."** A
  missing tag is ambiguous (forgotten vs. never-preached), so the lens must never
  be a scorecard or gap-finder. Browse-what-you've-touched only. **This is the
  load-bearing constraint** — it's what keeps tagging honest and cheap.
- **Tags are SERMON-LEVEL**, free-form, reusable. Sermon-level is the point: a
  book series is topically diverse sermon-by-sermon (Luke touches money at
  Zacchaeus, prayer elsewhere), so per-sermon tags let the Topic lens reach *into*
  book series, not just topical ones. Tags span book, topical, and standalone.
- **Tagging is OPTIONAL and PARTIAL** — tag the salient sermons, skip the rest; a
  half-tagged library still tells the truth (it only shows what you've covered).
- **Tagging's primary home is the SERMON WORKSPACE** (`SermonWorkspace.jsx`) — tag
  at the moment of prep, while the text is fresh. Non-negotiable; a tag-everything-
  later chore would never happen. (Planner sermon row = nice-to-have secondary.)
- **Anti-drift from day one:** autocomplete the pastor's EXISTING tags as they
  type (so "money"/"finances"/"stewardship" don't fragment). This surfaces the
  pastor's own vocabulary back — **NOT AI suggestion** (stay AI-free).
- **The Arc becomes SERMON-GRAINED:** each sermon contributes one book →
  genre/testament, effective book = `sermon.book_id ?? series.book_id`. Book-series
  sermons inherit the series' book; topical sermons carry their own. Topical series
  finally show their full spread; "Unclassified" only when a sermon has no book.
- **Structured per-sermon book:** topical sermon rows get a real Book picker (reuse
  `BookSelect.jsx`) + a chapter:verse field, **composing** the display passage
  ("Genesis" + "12:1-3" → "Genesis 12:1-3") so `book_id` and the passage string
  **can't disagree** (no dual source of truth).
- **Naming:** "Coverage" collides with the existing per-book `CoveragePanel` (% of
  one book, on the Schedule) and Planning's "Biblical Coverage" tally — pick a
  non-colliding umbrella name WITH the pastor (candidates: "Coverage," "What I've
  Preached," "The Pulpit's Diet").

## Data model (additive — use the **v30 migration in `electron/main.js` as the exact template**: `safeAlter` + version bump + 3-mirror allowlist sync + `assertSchemaContract` + schema docs)

- **v31:** `sermons.book_id TEXT` (nullable) — structured per-sermon book (mirrors
  `series.book_id`). Add to `SERMON_COLUMNS` in all three mirrors (`src/core/contracts.ts`,
  `electron/contracts.cjs`, `tests/contracts/_helpers/test-spine.ts`);
  `contracts-allowlist-sync.test.ts` must stay green.
- **v32** (or fold into v31 if built in one commit): `sermons.tags TEXT DEFAULT '[]'`
  — JSON array of topic tags (mirror the `thresholds_seen` JSON-array pattern;
  fail-soft parse). Add to `SERMON_COLUMNS` (3 mirrors).
- **No new table for v1** (one-pastor scale): autocomplete + the Topics view
  aggregate by scanning sermons' tags. A normalized `tags`/`sermon_tags` table is
  the upgrade path only if tag management gets heavy — note it, don't build it.
- Update [`schema.md`](../REFERENCE/schema.md) (version, ledger, column defs) +
  [`database.md`](../SYSTEMS/database.md) (version).

## Phases (commit + verify per phase; ship via `/sweep-the-house` on contract-touching diffs, then `/end-session`)

0. **Charter** — this document. Registered in [`ANCHORS.md`](../ANCHORS.md).
1. **Structured per-sermon book** — v31 migration; topical sermon row gets
   `BookSelect` + chapter:verse composing the passage; effective-book helper
   (`sermon.book_id ?? series.book_id`). Verify each topical sermon carries a book.
2. **Arc → sermon-grain** — extend the Arc's data load to include sermons (book_id,
   series_id, dates); rework `computeArc` (`src/utils/arc.js`) to count genre/
   testament per *sermon*, aggregating to the series timeline; update `Arc.jsx` +
   `ArcFixture.jsx`. Verify topical series appear with their full genre spread.
3. **Sermon-level tags** — migration for `sermons.tags`; tag field + existing-tag
   autocomplete in the sermon workspace; optionally the planner `SermonNode`.
   Verify tags persist + autocomplete across book/topical/standalone sermons.
4. **Coverage home + Topics lens** — a home holding two lenses: the reworked Arc +
   a Topics view (all tags → the sermons/series under each; browse, not score).
   Decide the umbrella name with the pastor. Rework `VIEW.Arc` + the sidebar
   "Series Arc" entry.
5. **Verify + ship** — eslint 0, contract tests green, `node --check` on electron,
   browser preview of both lenses with a book + a topical series tagged. Legibility
   check (a first-time user, no modal — do they know what the Topics lens shows?).

## Principles / don't-break

- **AI-free** (`sermonforge/no-direct-ai`): no auto-tagging, no AI topic
  suggestions; autocomplete is the pastor's own prior tags only.
- **create-then-update / do-not-widen-INSERT:** new columns ride `update*`, never
  the create INSERT.
- Don't break the shipped topical mode (`series.kind`, `sermons.sort_order`, the
  topical planner page, section-optional `create-sermon`, `seriesSermonOrderBy`'s
  `sort_order` term); the allowlist-sync test; `assertSchemaContract`.

## Orient first (read before building)

[`CORE.md`](../CORE.md) + [`RULES.md`](../RULES.md) (always);
[`database.md`](../SYSTEMS/database.md) + [`schema.md`](../REFERENCE/schema.md)
(migration mechanics); [`series-planner-revival-charter.md`](series-planner-revival-charter.md)
("2026-06-25 — Topical Series mode") + [`series-planner.md`](../SYSTEMS/series-planner.md)
(the topical mode you're extending); `src/utils/arc.js` + `src/components/Arc.jsx`
+ `ArcFixture.jsx`; `src/data/canonicalBooks.js` (GENRES, bookById, book→genre/
testament); `src/components/BookSelect.jsx`; `src/components/SermonWorkspace.jsx`;
memory `project_topical_series_mode.md` + `project_canonical_books_build.md`. The
v30 migration (commit `a6a95f0`) is the schema-change template — it did the exact
3-mirror + docs pattern to repeat.
