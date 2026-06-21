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

Files: `src/components/Planning.jsx`, `SeriesPlanner.jsx` (the ~1759-line
workbench), `NewSeriesModal.jsx`, `SeriesPlannerFixture.jsx` (preview fixture,
`?planner[=overview|structure|slots|calendar]` route).

## 2. AI-free

No Analyze / Generate / Assist / Chat / scheduling-advisor. Every field is
pastor-authored. Enforced by `sermonforge/no-direct-ai`. Do not reintroduce AI.

## 3. The 5-tab workflow (`SeriesPlanner.jsx`)

The topbar reuses the workspace `.topbar` (Back · series eyebrow · serif title ·
"Saved" indicator · status pill · Mark Series Complete · How this works · Study
Guide · feedback flag). The tab bar reuses `.stage-tabs`. The body is the
parchment content area.

- **Book Study** — 6 theology columns: `book_background`, `book_argument`,
  `book_structure`, `redemptive_context`, `series_motivation`, `emerging_big_idea`.
- **Overview** — `big_idea`, `overview`, `passage_range`, `color`
  (gold/crimson/sage/slate), `start_date`, `end_date`; read-only "working
  hypothesis" echo of `emerging_big_idea`.
- **Structure** — `structural_outline` + sections (`series_sections` rows:
  `title`, `passage_range`, `big_idea`, `overview`, `sort_order`).
- **Sermon Slots** — the slots; see the draft-row/commit pattern below.
- **Calendar** — `suggestSundays()` via `src/utils/churchCalendar.js`
  (`getUpcomingSundays` / `getSeasonForDate` / `toDateString`); "Save Dates"
  writes each slot's `date`; season labels rendered per slot.

## 4. Persistence — create-then-update

`createSeries` writes **only** `name`/`year`/`color` (the `create-series` INSERT
seeds the 6 theology columns empty). Every rich field persists afterward via
**debounced `updateSeries`** (`handleSeriesField` → `debouncedPersist` →
`updateSeries`); section/sermon fields via `update-section` / `update-sermon`.

**Do not widen the `create-series` INSERT** to "fix" the unwritten Book Study
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
`created_at`) and builds a 5-part document: **Part 1** World (background /
argument / structure / redemptive context), **Part 2** Why We Are Here
(`series_motivation`), **Part 3** Big Idea, **Part 4** The Journey (sections +
numbered sermon rows: passage, title, date+season, indented `study_guide_note`),
**Part 5** Reference (`structural_outline`). Heading color from the series color.

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
