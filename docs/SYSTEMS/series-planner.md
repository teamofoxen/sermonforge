# Series Planner — Systems (how & where)

> Revived 2026-06-21 (series-planner-revival). **AI-free.** This doc is the
> *how & where* (mechanics). The *what & why* — the decision that series
> planning is a distinct macro/architect mode, and the build rulings — lives in
> [`docs/PROPOSALS/series-planner-revival-charter.md`](../PROPOSALS/series-planner-revival-charter.md).

The Series Planner had been a "coming soon" stub since the AI-removal initiative
(ARI Phase 0). It was rebuilt from the pre-ARI component (git `4e3c42d~1`) with
every AI sidecar removed and restyled to feel like the sermon workspace. The
whole series backend (tables, spine CRUD, the church-calendar engine, the
study-guide `.docx` exporter) was always live; only the UI was rebuilt.

## 1. What it is / where it mounts

Macro/architect mode: shaping what gets preached across a book or season — a
different headspace from the per-sermon walk. Two views:

- `VIEW.Planning` — the series list / picker. Sidebar entry "Series Planning"
  (`Sidebar.jsx` `NAV_ITEMS`). Renders `Planning.jsx`.
- `VIEW.SeriesPlanner` — the planner-with-id. Reached **only** via `openPlanner(id)`
  (`App.jsx`; sets `plannerSeriesId` then navigates), never from a bare sidebar
  click. Renders `SeriesPlanner.jsx`.

Front door: `NewSeriesModal.jsx` → `createSeries({ name, year, color })` →
`onCreated(result.id)` navigates straight into the planner.

Files: `src/components/Planning.jsx`, `SeriesPlanner.jsx` (the workbench),
`NewSeriesModal.jsx`, `SeriesPlannerFixture.jsx` (preview fixture,
`?planner[=design|calendar|overview]` route; default `book-study`).

## 2. AI-free

No Analyze / Generate / Assist / Chat / scheduling-advisor. Every field is
pastor-authored. Enforced by `sermonforge/no-direct-ai`. Do not reintroduce AI.

## 3. The four-movement workflow (`SeriesPlanner.jsx`)

The topbar reuses the workspace `.topbar` (Back · series eyebrow · serif title ·
"Saved" indicator · Mark Series Complete · How this works · Study Guide ·
feedback flag). The tab bar reuses `.stage-tabs`. The body is the parchment
content area. The four tabs, in workflow order, each feed the next:

- **Understand** (tab id `book-study`) — two stacked moves:
  - *Place the book* — the canonical book picker (`book_id`, auto-fills genre +
    span), the genre override (`canon_category`), and `redemptive_context` +
    `book_background`. (Read-only passage/genre chips confirm the auto-fill; the
    title is not editable here — it lives on the cockpit masthead.)
  - *Hear the line* — `book_argument`; the **evidence worksheet** (`melodic_evidence`,
    a JSON blob of labeled slots: repeated words, top-and-tail, purpose, OT
    quotations); `structural_outline` rendered here as structural evidence; and
    `emerging_big_idea`, "The Melodic Line", the output.
- **Design** (tab id `design`) — three bands:
  - *The hinge* — `emerging_big_idea` read-only (carried from Understand) →
    `series_motivation` (editable) → `big_idea` (the decision).
  - *Divide into sermons* — `overview`, `passage_range`, the sermon slots
    (draft-row/commit, §5), and the coverage panel (`src/utils/coverage.js`
    `computeCoverage`, read-only). Slots reuse `SlotsTab` via an `embedded` flag.
  - *Group into movements* — the series sections (`series_sections` rows:
    `title`, `passage_range`, `big_idea`, `overview`, `sort_order`). Reuses
    `StructureTab` via the `embedded` flag (sections only; no `structural_outline`).
- **Schedule** (tab id `calendar`) — `suggestSundays()` via
  `src/utils/churchCalendar.js` (`getUpcomingSundays` / `getSeasonForDate` /
  `toDateString`); "Save Dates" writes each slot's `date` and derives `end_date`;
  season labels per slot; the pacing strip (`src/utils/pacing.js` `computePacing`).
- **Overview** (cockpit, tab id `overview`) — read-mostly dashboard. The only
  authored fields are the masthead: `title`, `description`, `color`, plus the
  `status` + `year` identity metadata. Everything else is a read-only, tappable
  echo (melodic line → Understand; big idea / motivation / coverage → Design;
  pacing / dates → Schedule) reusing `handleTabChange`. Study Guide export
  launches from here too. **Not a progress meter** — no score, %, or next-step
  nudge; neutral presence dots only.

The standalone Structure and Sermon Slots tabs were removed at the tab collapse;
their apparatus now renders inside Design via the `embedded` flag. A remembered
`localStorage` tab id for a removed tab falls back to Understand (`PLANNER_TAB_IDS`).

## 4. Persistence — create-then-update

`createSeries` writes **only** `name`/`year`/`color` (the `create-series` INSERT
seeds the rich columns empty). Every rich field persists afterward via
**debounced `updateSeries`** (`handleSeriesField` → `debouncedPersist` →
`updateSeries`); section/sermon fields via `update-section` / `update-sermon`.
This explicitly includes `book_id` and `melodic_evidence` — both persist via
`updateSeries`, **never** the create INSERT.

**Do not widen the `create-series` INSERT** to "fix" the unwritten Understand
columns — create-then-update is the design (charter ruling). Write allowlists:
`SERIES_COLUMNS` / `SECTION_COLUMNS` / `SERMON_COLUMNS` in `electron/contracts.cjs`;
all writes gate through `buildUpdate` in `electron/main.js`.

## 5. Sermon Slots — draft-row / commit

A slot stays **UI-only** (`id: "draft-…"`, no DB row) until its first non-empty
Working Title, because `createSermon` throws on an empty name (State Contract #3).
On commit: `create-sermon` INSERT omits `study_guide_note`; `commitDraft` follows
with `updateSermon` writing `study_guide_note` when present; post-commit edits via
a debounced `updateSermon`. `delete-section` nulls `section_id` on its sermons, so
orphaned slots fall into "Remaining Sermons" in the export. `onOpenSermon` drops
its old 3rd (`seriesId`) arg — the planner stands alone for v1; return is via the
sidebar / Planning list.

## 6. Study Guide export (`.docx`)

Chain: the StudyGuideModal "Export to Word" → `exportStudyGuide(seriesId)`
(`src/db/database.js`) → `"series-export-study-guide"` IPC (`electron/preload.js`)
→ handler (`electron/main.js`) → `buildStudyGuideDoc(series, sections, sermons)`.
The handler fetches series + sections (by `sort_order`) + sermons (by `date`,
`created_at`) and builds a 5-part document: **Part 1** World (`book_background`,
`book_argument`), **Part 2** Why We're Here (`redemptive_context`,
`series_motivation`), **Part 3** Big Idea (`emerging_big_idea` de-duped against
`big_idea`, then `big_idea`, `overview`), **Part 4** The Journey (sections +
numbered sermon rows: passage, title, date+season, indented `study_guide_note`),
**Part 5** Reference (`structural_outline`). Heading color from the series color.
The book's structure appears **once**, in Part 5 — `book_structure` was retired
(v26) and is no longer read by the exporter. The Part-4 grouping + Part-3 de-dup
live in `src/utils/studyGuideModel.js` (mirrored to `electron/studyGuideModel.cjs`).

Output: `Documents/SermonForge/exports/StudyGuides/<title> — Study Guide.docx`
(via `app.getPath("documents")`); dir created recursively; filename sanitized;
a file-busy error ("close it in Word") if the doc is open. Empty parts are
omitted, so a brand-new series with no fields exports a near-empty doc by design.
Every column the exporter reads is on a write allowlist and writable from a tab —
no read-but-never-written column.

## Related

- *what & why / decisions:* [`docs/PROPOSALS/series-planner-revival-charter.md`](../PROPOSALS/series-planner-revival-charter.md)
- *schema:* `series` + `series_sections` in [`docs/REFERENCE/schema.md`](../REFERENCE/schema.md)
- *IPC:* the series spine ops + `series-export-study-guide` in [`docs/REFERENCE/ipc-channels.md`](../REFERENCE/ipc-channels.md)
