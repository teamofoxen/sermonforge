# Series Planner — Systems (how & where)

> Revived 2026-06-21; **rebuilt around the pastor's real content model
> 2026-06-24** (the four-movement workbench and the melodic-line model are gone).
> **AI-free.** This doc is the *how & where* (mechanics). The *what & why* — the
> decision that series planning is a distinct macro/architect mode, and the
> content-model ruling — lives in
> [`docs/PROPOSALS/series-planner-revival-charter.md`](../PROPOSALS/series-planner-revival-charter.md)
> ("2026-06-24 — Content-model rebuild").

The planner is a top-down way to **understand the book at three levels —
Book ▸ Section ▸ Pericope** — producing three outputs: the sermon calendar,
familiarity with the text before preaching, and the study guide's raw material.
A pericope **is** a sermon **is** the scheduled unit (the existing
series→sections→sermons spine). **Every level is the same unit: Title + range ·
Big idea (one line) · Overview (paragraph).** The whole series backend (tables,
spine CRUD, the church-calendar engine, the study-guide `.docx` exporter) was
always live; the UI is what changed.

## 1. What it is / where it mounts

Macro/architect mode — a different headspace from the per-sermon walk. Two views:

- `VIEW.Planning` — the series list / picker. Sidebar entry "Series Planning"
  (`Sidebar.jsx` `NAV_ITEMS`). Renders `Planning.jsx`.
- `VIEW.SeriesPlanner` — the planner-with-id. Reached **only** via `openPlanner(id)`
  (`App.jsx`), never from a bare sidebar click. Renders `SeriesPlanner.jsx`.

Front door: `NewSeriesModal.jsx` → `createSeries({ name, year })` →
`onCreated(result.id)` navigates straight into the planner.

Files: `src/components/Planning.jsx`, `SeriesPlanner.jsx` (the three-screen
workbench), `NewSeriesModal.jsx`, `SeriesPlannerFixture.jsx` (preview fixture,
`?planner[=schedule|study-guide]` route, default Outline; seeded with the real
Jesus-of-Luke artifact).

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

- **Outline** (`OutlineTab`) — the book as one live nested outline.
  - *Book node* — the root: Title (`series.title`), Big idea (`series.big_idea`),
    Overview (`series.overview`); a collapsible **Book details** disclosure
    holding the canonical book picker (`book_id`, auto-fills genre + span), the
    genre override (`canon_category`), `passage_range`, `description`, `color`,
    `status`, `year`, and a read-only `CoveragePanel`
    (`src/utils/coverage.js`); and a collapsible **Reference** disclosure for the
    commentary outline (`structural_outline`).
  - *Section nodes* (`SectionNode`) — each its own Title · range · Big idea ·
    Overview unit, with reorder (↑/↓, recompacts `sort_order`) and delete, and a
    nested list of its pericopes plus "+ Add pericope".
  - *Pericope nodes* (`PericopeNode`) — each is a sermon: passage · title · big
    idea · overview, an editable **Date** field (single-source — see Schedule), a
    read-only date chip in the collapsed header, a **Schedule** jump (scrolls to
    + flashes that row on the Schedule screen), and **Open** (`onOpenSermon`).
    New pericopes use the draft-row/commit pattern (§5). "+ Add section" sits
    under the book; unsectioned pericopes render in their own group (and are the
    only home when the book has no sections yet).
- **Schedule** (`ScheduleTab`) — lays each pericope on a Sunday. The date is
  **single-source on the sermon**: per-row edits autosave through the shared
  debounced `updateSermon` path and reflect live on the Outline (and vice versa)
  — there is no separate `schedule` snapshot. "Suggest Sundays"
  (`getUpcomingSundays`) is one explicit bulk gesture that writes every date;
  `end_date` mirrors the last dated sermon on any change. Season labels
  (`getSeasonForDate`), the pacing strip (`src/utils/pacing.js`), and skip-a-week
  are kept.
- **Study guide** (`StudyGuideTab`) — an editable congregational booklet
  ("mini-commentary"). "Import from outline" gates the empty state → booklet via
  a write-only `localStorage` flag (`sermonforge_planner_guide_built_<seriesId>`)
  — no schema bump. The booklet is a **live projection** of the Outline
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
per series via the write-only `sermonforge_planner_intro_<seriesId>` flag.

## 4. Persistence — create-then-update

`createSeries` writes **only** `name`/`year`/`color`. Every rich field persists
afterward via **debounced `updateSeries`**; section fields via debounced
`updateSection`; pericope fields via debounced `updateSermon`. Section- and
sermon-field savers flush a pending write when the edited id changes, so jumping
between rows can't drop an earlier entity's last keystrokes.

**Do not widen the `create-series` INSERT** (charter ruling). Write allowlists:
`SERMON_COLUMNS` / `SERIES_COLUMNS` / `SECTION_COLUMNS` — mirrored across
`src/core/contracts.ts`, `electron/contracts.cjs`, and the test fixture
`tests/contracts/_helpers/test-spine.ts` (the allowlist-sync test enforces it);
all writes gate through `buildUpdate` in `electron/main.js`. The pericope unit's
`big_idea` / `overview` and the guide-local `study_guide_extras` are in
`SERMON_COLUMNS` (v27); the retired book-study + melodic-line columns left
`SERIES_COLUMNS` (v27) but remain in the DB as backup.

## 5. Pericope draft / commit

A pericope stays **UI-only** (`id: "draft-…"`, no DB row) until its first
non-empty Title, because `createSermon` throws on an empty name (State Contract
#3). On commit: the `create-sermon` INSERT omits `big_idea`/`overview`; if the
pastor typed either before committing, `commitDraft` follows with an
`updateSermon` (create-then-update). Post-commit edits go through the debounced
`updateSermon`. `delete-section` nulls `section_id` on its sermons, so orphaned
pericopes fall into the unsectioned group (and "Remaining" in the export).
`onOpenSermon` takes just the sermon id — the planner stands alone for v1.

## 6. Study Guide export (`.docx`)

Chain: the StudyGuideTab "Export to Word" → `exportStudyGuide(seriesId)`
(`src/db/database.js`) → `"series-export-study-guide"` IPC (`electron/preload.js`)
→ handler (`electron/main.js`) → `buildStudyGuideDoc(series, sections, sermons)`.
The handler fetches series + sections (by `sort_order`) + undeleted sermons (by
`date`, `created_at`) and builds the booklet: title block → **Introduction**
(book big idea as an italic lead + overview) → **a part per section** → **a page
per sermon** (`pageBreakBefore`; passage — title heading, date · season,
big-idea lead, overview-as-commentary, the `study_guide_extras` additions, then
`notesLines` blank ruled lines) → unsectioned sermons under **Remaining** → a
final **Reference** part for `structural_outline`. Heading color from the series
color. The section grouping (`sectionGroups` / `remainingSermons` / `hasSections`)
lives in `src/utils/studyGuideModel.js` (mirrored to
`electron/studyGuideModel.cjs`) and is shared by the on-screen preview and the
export, so they can't drift. `study_guide_extras` is parsed fail-soft in the doc
builder (mirrors the renderer's `parseStudyGuideExtras`).

Output: `Documents/SermonForge/exports/StudyGuides/<title> — Study Guide.docx`
(via `app.getPath("documents")`); dir created recursively; filename sanitized;
a file-busy error ("close it in Word") if the doc is open. Empty parts are
omitted, so a brand-new series exports a near-empty doc by design.

## Related

- *what & why / decisions:* [`docs/PROPOSALS/series-planner-revival-charter.md`](../PROPOSALS/series-planner-revival-charter.md)
- *schema:* `series` + `series_sections` + the v27 `sermons` columns in [`docs/REFERENCE/schema.md`](../REFERENCE/schema.md)
- *IPC:* the series spine ops + `series-export-study-guide` in [`docs/REFERENCE/ipc-channels.md`](../REFERENCE/ipc-channels.md)
