# Series Planner — Systems (how & where)

> Revived 2026-06-21; **rebuilt around the pastor's real content model
> 2026-06-24** (the four-movement workbench and the melodic-line model are gone);
> **Topical Series mode + the sermon-grained Series Arc / "What I've Preached"
> home shipped 2026-06-25** (schema v30–v32). **AI-free.** This doc is the
> *how & where* (mechanics). The *what & why* — the decision that series planning
> is a distinct macro/architect mode, and the content-model ruling — lives in
> [`docs/PROPOSALS/series-planner-revival-charter.md`](../PROPOSALS/series-planner-revival-charter.md)
> ("2026-06-24 — Content-model rebuild"); the Topical-mode + coverage rulings live
> in [`docs/PROPOSALS/coverage-initiative.md`](../PROPOSALS/coverage-initiative.md).

A series is one of **two kinds**, set at creation and stored explicitly as
`series.kind` (`'book'` | `'topical'`) — never inferred:

- **Book series** (`kind: 'book'`) — a top-down way to **understand one book at
  three levels — Book ▸ Section ▸ Sermon.** **Every level is the same unit:
  Title + range · Big idea (one line) · Overview (paragraph).** The book is the
  series' identity.
- **Topical series** (`kind: 'topical'`) — a theme-led series that gathers a
  sermon for each passage (from **any** book) that sounds one big idea. **Big
  Idea ▸ a flat, pastor-ordered list of sermons — no sections.** Each sermon
  authors its own structured **Book** (`sermons.book_id`) + chapter:verse, so a
  topical series spans many books.

Both produce the same three outputs: the sermon calendar, familiarity with the
text before preaching, and the study guide's raw material. A sermon **is** one
passage, scheduled on one Sunday (the existing series→sections→sermons spine;
topical sermons simply have no section). The whole series backend (tables, spine
CRUD, the church-calendar engine, the study-guide `.docx` exporter) was always
live; the UI is what changed.

## 1. What it is / where it mounts

Macro/architect mode — a different headspace from the per-sermon walk. Two views:

- `VIEW.Planning` — the series list / picker. Sidebar entry "Series Planning"
  (`Sidebar.jsx` `NAV_ITEMS`). Renders `Planning.jsx`.
- `VIEW.SeriesPlanner` — the planner-with-id. Reached **only** via `openPlanner(id)`
  (`App.jsx`), never from a bare sidebar click. Renders `SeriesPlanner.jsx`.

Front door: `NewSeriesModal.jsx` opens on a **Book / Topical toggle** that picks
the `kind`:

- **Book** — pick the canonical **Book** (the shared `BookSelect`, which fills
  genre + passage span), with an optional series title that defaults to the
  book's name. **The book is the series' identity.** Persists `createSeries({
  name, year })` then `updateSeries(id, { book_id, canon_category, passage_range })`.
  `kind` is left at its column **default `'book'`** — so a failed follow-up still
  reads as a book series (the recoverable state), never a stranded one.
- **Topical** — name the **theme** (required; there's no book to borrow a name
  from). Persists `createSeries({ name, year })` then `updateSeries(id, { kind:
  'topical', big_idea })`, seeding the Big Idea from the theme (refined later on
  the planner). No book at the series level — each sermon names its own.

Persistence is create-then-update in both cases — the `create-series` INSERT is
never widened (`kind`/`book_id` ride the follow-up `updateSeries`).
`onCreated(result.id)` navigates straight into the planner.

Files: `src/components/Planning.jsx`, `SeriesPlanner.jsx` (the three-screen
workbench — `CoveragePanel` is an in-file component of `SeriesPlanner.jsx`,
not a separate file), `NewSeriesModal.jsx`, `BookSelect.jsx`,
`src/utils/coverage.js` (the coverage computation),
`SeriesPlannerFixture.jsx` (preview fixture, `?planner[=schedule|study-guide]`
route, `&kind=topical` for the topical seed; default Outline; the book seed is
the real Jesus-of-Luke artifact, the topical seed is "The Mission of God").

## 2. AI-free

No Analyze / Generate / Assist / Chat / scheduling-advisor. Every field is
pastor-authored. Enforced by `sermonforge/no-direct-ai`. Do not reintroduce AI.

## 3. The three screens (`SeriesPlanner.jsx`)

The topbar reuses the workspace `.topbar` (Back · color dot · status eyebrow
showing the current screen · serif title · Saving/Saved indicator · Mark Series
Complete · How this works · feedback flag). The tab bar reuses `.stage-tabs`.
The tab id for Outline is **`book-outline`** (the bare literal `"outline"` is a
forbidden pre-Pilot-B stage alias under the `canonical-stage-name` lint rule; the
human label is "Outline"). A remembered `localStorage` tab id for a removed tab
(the old `book-study`/`design`/`calendar`/`overview`) falls back to Outline.

- **Outline** (`OutlineTab`) — the series as one live outline. Its shape is
  `kind`-aware (`SeriesPlanner.jsx` branches on `series.kind === 'topical'`).

  **Book series** — the book as one nested outline:
  - *Book node* — the root, **led by the book** (the book is the series' identity).
    A visible **Book details** block holds the **Book** picker (the shared
    `BookSelect` → `book_id`, auto-fills genre + span), the genre override
    (`canon_category`), and `passage_range`; below it a **demoted, optional Series
    title** (`series.title`, defaults to the book name — State #3 keeps the name
    correctable); then Big idea (`series.big_idea`), Overview (`series.overview`),
    and a collapsible **Reference** disclosure for the commentary outline
    (`structural_outline`). (The old prominent "Book Title" field is gone.)
    `color` / `status` / `year` / `description` are **no longer edited in the
    planner** (they persist from create / the topbar Complete action and still
    drive the Planning list); the `CoveragePanel` (`src/utils/coverage.js`) moved
    to the Schedule — the Outline is for outlining, not lifecycle/cosmetics.
  - *Section nodes* (`SectionNode`) — each its own Title · range · Big idea ·
    Overview unit, with reorder (↑/↓, recompacts `sort_order`) and delete, and a
    nested list of its sermons plus "+ Add sermon".
  - *Sermon nodes* (`SermonNode`) — each is a sermon: passage · **working
    title** · big idea · overview, and **Build this sermon** (`onOpenSermon` —
    opens it in the workspace for prep). **No dates live
    on the Outline** — scheduling is wholly the Schedule screen's (the old per-sermon
    Date field, date chip, and "Schedule" jump are gone, along with their
    focus/flash plumbing). The title field is labeled **Working title** — the rough
    handle the big idea expands on; the final sermon title comes during writing —
    while the book and section levels keep plain "Title". New sermons use the
    draft-row/commit pattern (§5). "+ Add section" sits under the book. **In a book
    series every sermon lives under a section — there is no "in a series but in no
    section" group.** When a book series has no sections yet, the Outline shows just
    **"+ Add section"** (the top-down first move). A sermon with no series at all is
    **standalone** and lives in the library, never in the planner.

  **Topical series** — a big idea over a flat sermon list (genuinely **no
  sections**):
  - *Big Idea node* — the root: **Theme** (`series.title`), **Big idea**
    (`series.big_idea`, one line), **Overview** (`series.overview`). No book, no
    genre, no `passage_range` — a many-book theme has none. (No `CoveragePanel`:
    it measures % of one book, which a theme doesn't have — hidden whenever
    `series.kind === 'topical'`.)
  - *Sermon nodes* — the same `SermonNode` in its `topical` layout: the passage is
    authored **structurally** as a **Book** picker (`BookSelect` → `sermons.book_id`)
    + a **chapter:verse** field, composed into the single `passage` string by
    `src/utils/topicalPassage.js` so book and passage can't disagree. A
    chapter:verse that won't parse shows an inline **"Couldn't read"** hint (the
    Coverage panel's unreadable affordance, surfaced per-row since that panel is
    hidden in topical mode). Sermons carry a pastor-authored order
    (`sermons.sort_order`) and reorder with ↑/↓ — since Session 3 (2026-07-13)
    `moveSermon` commits through the `reorder-series-sermons` spine op: ONE
    SQLite transaction over every sort_order (a mid-flight failure can't leave
    half the arrangement moved; the optimistic list reloads DB truth on
    failure). Section reorder in book mode rides the sibling
    `reorder-sections` op the same way. There is no auto-file and no
    "+ Add section" in topical mode.
- **Schedule** (`ScheduleTab`) — **the one place dates live.** Lays each sermon
  on a Sunday. Since Session 3 a date pick is ONE spine transaction
  (`bulk-date-sermons`, single entry): the sermon date and the
  `series.end_date` mirror commit together in main — no separate debounced
  series write that could fire later or fail apart from the date; the op
  resolves the mirrored `end_date` so the planner's optimistic series state
  settles on DB truth. Each row is **working title + passage +
  date**, expandable (▾) to its read-only **big idea + overview** (edited on the
  Outline). "Suggest Sundays" (`getUpcomingSundays`) is one explicit bulk gesture
  that assigns every undated Sunday via the same `bulk-date-sermons` op — all
  dates plus the mirror in one transaction, rolled back whole on failure. The **undated pool sorts in outline
  reading order** via the one shared `seriesSermonOrderBy` (`electron/main.js`) —
  dated first, then section order (`ss.sort_order`), then the sermon's own
  pastor-authored `sort_order` (the topical reorder term), then `created_at` —
  the same composite the workspace breadcrumb and study-guide export use, so the
  three never disagree. The `CoveragePanel` lives here now **for book series**
  (hidden whenever `series.kind === 'topical'`). Season labels (`getSeasonForDate`),
  the pacing strip (`src/utils/pacing.js`), and skip-a-week are kept.
- **Study guide** (`StudyGuideTab`) — an editable congregational booklet
  ("mini-commentary"). "Import from outline" gates the empty state → booklet via
  a client-local `localStorage` flag (`sermonforge_planner_guide_built_<seriesId>`)
  — written by Import, read on mount to choose empty-state vs booklet; no schema
  bump (the same set-once, not-a-schema-column pattern as the intro flag below).
  The booklet is a **live projection** of the Outline
  (driftless, single-source): book big idea + overview → **Introduction**; each
  section → a **part** (its overview opens it); each sermon → its own **page**
  (big idea + overview-as-commentary + passage + date/season). Per page: a
  pastor-authored **additions** composer (Question / Cross-reference / Quote) and
  a blank listener **Notes** block with a line-count stepper, both stored in
  `study_guide_extras` (§6). Re-import refreshes the projected text but never
  writes `study_guide_extras`, so additions/notes survive. **Export to Word**
  renders the same booklet (§6).

The standalone topbar "Study Guide" button is gone (it's a tab now); the old
StudyGuideModal was replaced by `StudyGuideTab`. The "How this works" front door
(`SeriesHowItWorksModal`) is rewritten to the three screens and auto-opens once
per series via the client-local `sermonforge_planner_intro_<seriesId>` flag
(set-once, read on mount; not a schema column).

## 4. Persistence — create-then-update

`createSeries` writes **only** `name`/`year`/`color`. Every rich field persists
afterward via **debounced `updateSeries`**; section fields via debounced
`updateSection`; sermon fields via debounced `updateSermon`. Section- and
sermon-field savers flush a pending write when the edited id changes, so jumping
between rows can't drop an earlier entity's last keystrokes.

**Do not widen the `create-series` INSERT** (charter ruling). Write allowlists:
`SERMON_COLUMNS` / `SERIES_COLUMNS` / `SECTION_COLUMNS` — mirrored across
`src/core/contracts.ts`, `electron/contracts.cjs`, and the test fixture
`tests/contracts/_helpers/test-spine.ts` (the allowlist-sync test enforces it);
all writes gate through `buildUpdate` in `electron/main.js`. The sermon's
`big_idea` / `overview` and the guide-local `study_guide_extras` are in
`SERMON_COLUMNS`; the retired book-study + melodic-line columns left
`SERIES_COLUMNS` but remain in the DB as backup. The two later initiatives added
columns the same create-then-update way — never on the INSERT: `series.kind`
(v30), `sermons.sort_order` (v30, the topical pastor-authored order),
`sermons.book_id` (v31, the structured per-sermon book for topical), and
`sermons.tags` (v32, free-form topic tags). The planner-owned schema additions
run through **v32**; the application schema itself is at **v33** (the
2026-07-02 OEM workspace restructure — a workspace migration, not a planner
change). All four planner columns are in the three allowlist mirrors.

## 5. Sermon draft / commit

A sermon stays **UI-only** (`id: "draft-…"`, no DB row) until its first
non-empty Title, because `createSermon` throws on an empty name (State Contract
#3). On commit: the `create-sermon` INSERT omits `big_idea`/`overview`; if the
pastor typed either before committing, `commitDraft` follows with an
`updateSermon` (create-then-update). Post-commit edits go through the debounced
`updateSermon`. **`delete-section` keeps the no-limbo invariant:** its sermons
move to the first remaining section of the series; if it was the last section
they become **standalone** (`series_id` nulled, back to the library), the same
release `delete-series` does. **`create-sermon` keeps it too (defensive net):** a
sermon created with a `series_id` but no `section_id` is auto-filed under that
series' first section, auto-creating "Section 1" when the series has none —
**book series only; the auto-file is gated on `seriesRow.kind !== 'topical'`**, so
a topical series' sermons stay section-less by design (their absence of sections
is intentional, not limbo). So the book-series Outline can't be handed an
in-series sermon it would silently drop, whichever surface created it. (`NewSermonModal` no longer *creates* in-series sermons — see
the planner ↔ prep doors below — but the guard stays as a net for any other path.) The auto-file is wrapped in a transaction with the sermon INSERT and
guarded on the series actually existing (a stale `series_id` can't spawn an
orphan section). A **v28** migration normalized existing data once: section-less
in-series sermons were placed into a first section (auto-creating "Section 1"
where a series had none), and sermons whose `series_id` pointed at a
deleted/missing series became standalone. **v29** re-ran the same normalize to
heal any limbo the pre-fix `create-sermon` path had already written (v28 is
version-gated and does not re-run). The resolve-or-create-first-section step is
shared by `create-sermon` and both migrations (`firstSectionIdForSeries` in
`electron/main.js`).
`onOpenSermon` takes just the sermon id — the planner stands alone for v1.

**Planner ↔ per-sermon prep (navigation, no data coupling).** Two doors connect
the planner to the sermon workspace: (1) each Outline sermon's **"Build this
sermon"** button opens it for prep (`onOpenSermon`); (2) the global
`NewSermonModal` ("Build a sermon") is two-mode — **New sermon** (standalone
create) and **From a series**, which lists a chosen series' planned units (read
via `getSermonsBySeries`, Schedule order) and **opens** the picked one for prep,
reusing each launch site's existing `onCreated(id)` close-and-open callback. It
creates nothing — series sermons are born in the planner, so no duplicates.

## 6. Study Guide export (`.docx`)

Chain: the StudyGuideTab "Export to Word" → `exportStudyGuide(seriesId)`
(`src/db/database.js`) → `"series-export-study-guide"` IPC (`electron/preload.js`)
→ handler (`electron/main.js`) → `buildStudyGuideDoc(series, sections, sermons)`.
The handler fetches series + sections (by `sort_order`) + undeleted sermons **via
the shared `seriesSermonOrderBy`** (date-aware, with section order and the topical
`sort_order` term — the same composite the Schedule and `get-sermons-by-series`
use, so the booklet order matches the on-screen order) and builds the booklet:
title block → **Introduction** (big idea as an italic lead + overview) → **a part
per section** → **a page per sermon** (`pageBreakBefore`; passage — title heading,
date · season, big-idea lead, overview-as-commentary, the `study_guide_extras`
additions, then `notesLines` blank ruled lines) → unsectioned sermons under
**Remaining** → a final **Reference** part for `structural_outline`. Heading color
from the series color. The section grouping (`sectionGroups` / `remainingSermons` /
`hasSections`) lives in `src/utils/studyGuideModel.js` (mirrored to
`electron/studyGuideModel.cjs`) and is shared by the on-screen preview and the
export, so they can't drift. For a **topical series** there are no sections, so
`buildStudyGuideModel` returns `hasSections: false` and every sermon falls into
the flat page-per-sermon list (no section parts; the Introduction still renders
from the theme's big idea + overview) — the same mode-agnostic model code drives
both kinds. `study_guide_extras` is parsed fail-soft in the doc builder (mirrors
the renderer's `parseStudyGuideExtras`).

Output: `Documents/SermonForge/exports/StudyGuides/<title> — Study Guide.docx`
(via `app.getPath("documents")`); dir created recursively; filename sanitized;
a file-busy error ("close it in Word") if the doc is open. Empty parts are
omitted, so a brand-new series exports a near-empty doc by design.

## 7. Where planner data surfaces beyond the planner (Coverage Initiative)

Two surfaces read the planner's sermon data without the planner being open;
both are AI-free and **descriptive, never a scorecard**:

- **Series Arc** (`src/utils/arc.js` → `Arc.jsx`) — a **sermon-grained** balance
  of what's been preached across genres / testaments. Each sermon's effective
  book is `sermon.book_id ?? series.book_id` (`effectiveBookId`), so a topical
  series' per-sermon books count individually.
- **"What I've Preached" home** (`WhatIvePreached.jsx`) — two lenses: **By book**
  embeds the Arc; **By topic** is `TopicsView.jsx` over `sermons.tags` (authored
  in the workspace **Topics** row, autocompleting only the pastor's own prior
  tags via `get-all-tags`). It shows what's been *covered* — no missing-topics
  list, no deficit.

## Related

- *what & why / decisions (planner):* [`docs/PROPOSALS/series-planner-revival-charter.md`](../PROPOSALS/series-planner-revival-charter.md)
- *what & why / decisions (topical mode + Arc + tags):* [`docs/PROPOSALS/coverage-initiative.md`](../PROPOSALS/coverage-initiative.md)
- *schema:* `series` (+ `kind`) + `series_sections` + the `sermons` columns through **v32** (`sort_order`, `book_id`, `tags`) in [`docs/REFERENCE/schema.md`](../REFERENCE/schema.md)
- *IPC:* the series spine ops + `series-export-study-guide` + `get-all-tags` in [`docs/REFERENCE/ipc-channels.md`](../REFERENCE/ipc-channels.md)
