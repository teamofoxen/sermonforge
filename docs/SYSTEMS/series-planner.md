# SermonForge — Series Planner

> The Series Planner is where all work begins. Series are the primary unit of pastoral work;
> sermons are instances within them. Component: `src/components/SeriesPlanner.jsx`.
> See also: `docs/SYSTEMS/sermon-workspace.md` for what happens after a slot is opened.

---

## Hierarchy

```
Series
  └── Sections (optional groupings within a series)
        └── Sermon Slots (stage=planning; real sermon records, not a separate table)
```

---

## Five Tabs

### Book Study
Foundational research conducted before planning begins. Six fields:

| Field (DB column) | Purpose | Context pipeline |
|---|---|---|
| `redemptive_context` | Where this book sits in the biblical arc from creation to new creation | Feeds tier 4 |
| `book_background` | Author, audience, occasion, historical setting, genre | **Excluded from per-sermon context** |
| `book_argument` | The book's controlling argument or central purpose | **Excluded from per-sermon context** |
| `book_structure` | Major movements, structural markers, turning points | **Excluded from per-sermon context** |
| `series_motivation` | Why this congregation needs this book now | Feeds tier 4 |
| `emerging_big_idea` | Working draft of the series big idea, developed in study | **Excluded from per-sermon context** |

**Why the four Book Study fields are excluded from per-sermon context:** They are too large for
the per-sermon context budget and belong in series planning only. `redemptive_context` and
`series_motivation` are included because they are concise and directly relevant to every sermon
in the series.

Each field has an "Analyze" button that builds a context-aware AI prompt from the field content
plus other populated fields, and sends it to the AI chat panel on the right.

`emerging_big_idea` is shown read-only in the Overview tab when both it and the final `big_idea`
are present.

### Overview
- Fields: title, color, canon category, status, passage range, dates, big idea, overview narrative
- AI Generate buttons available for big idea and overview
- Shows `emerging_big_idea` from Book Study read-only above `big_idea` when both are present
- Saves via `updateSeries(id, fields)` on change with 800ms debounce

### Structure
- Structural outline textarea → saves to `series.structural_outline` via `updateSeries()`
- Section builder: add/reorder/edit sections (title, passage range, big idea, overview)
- Sections created via `createSection()`, reordered via `updateSection(id, { sort_order })`
- AI context for section-level questions includes series big idea + section data

### Sermon Slots
- Sermon slots are real `sermons` records with `stage='planning'`; no separate table
- Organized by section when sections exist
- Per-slot fields: passage, working title, big idea (saved via `updateSermon()`)
- Per-slot `study_guide_note` field with "Assist" AI button
  - "Assist" builds a prompt from slot position, series big idea, section big idea,
    `series_motivation`; sends to SlotsTab AI chat panel
- "Open" button → `onOpenSermon(slot.id, "series-planner", series.id)` → see Flow: Open Sermon below

### Calendar
- Pastor sets series start date
- `getUpcomingSundays(startDate, count, excludeDates)` generates Sunday suggestions
  - `excludeDates` pulled from `calendar_notes` table
  - Liturgical season computed per date via `getSeasonForDate()`
- Pastor adjusts dates manually or accepts suggestions
- "Save All Dates" writes `date` to each sermon record via `updateSermon()` and `end_date`
  to series via `updateSeries()`
- AI scheduling advisor receives series slot count, start date, and calendar notes context

---

## Study Guide Export

Accessible via the "Study Guide" toolbar button → `StudyGuideModal` opens (inside `SeriesPlanner.jsx`).

**5-part read-only preview:**

| Part | Source fields |
|------|---------------|
| 1. The Series | `big_idea`, `overview` |
| 2. The Book | `book_background`, `book_argument`, `book_structure` |
| 3. Where This Fits | `redemptive_context`, `emerging_big_idea` (if distinct from `big_idea`) |
| 4. Why This Series, Why Now | `series_motivation` |
| 5. The Sermons | All slots: passage, title, date, liturgical season, `study_guide_note` |

- Parts with no content are omitted from both the preview and the exported document.
- "Export to Word" calls `exportStudyGuide(series.id)` → IPC `"series-export-study-guide"`.
  See `docs/REFERENCE/ipc-channels.md` for the channel spec.
- Output: `~/OneDrive/SermonForge/StudyGuides/[title] — Study Guide.docx`

---

## Church Calendar Engine

`src/utils/churchCalendar.js` — ESM module; **cannot be imported from `electron/main.js`.**

- `getSeasonForDate(dateStr)` — returns the liturgical season for any date string
- `getUpcomingSundays(start, count, excludeDates)` — generates Sunday schedule from a start date
- Computes Easter via Gregorian computus
- Seasons: Christmastide · Epiphany · Lent · Holy Week · Easter Season · Ordinary Time · Advent

---

## Flow: Pastor Creates a Series

1. Pastor clicks "+ New Series" from Dashboard or Planning view
2. `handleNewSeries()` in `App.jsx` → `createSeries({ title, color, status, canon_category })`
3. IPC → `db-createSeries` → inserts record, returns series with generated ID
4. `openPlanner(series.id)` sets `currentView = "series-planner"`, `openSeriesId = series.id`
5. `SeriesPlanner` mounts, fetches series by ID + all sections via `getSectionsBySeries()`
6. Pastor works through tabs (Book Study → Overview → Structure → Sermon Slots → Calendar)
7. All field saves go through: `onChange → handleSeriesField → debouncedPersist → updateSeries(id, fields)`

---

## Flow: Pastor Opens a Sermon from the Planner

1. Pastor clicks "Open" on a sermon slot in the Sermon Slots tab
2. `onOpenSermon(sermon.id, "series-planner", series.id)` fires → `App.jsx openSermon()`
3. `App.jsx` sets `openSermonId`, `returnDestination = "series-planner"`, `returnSeriesId`, `currentView = "sermon-workspace"`
4. `SermonWorkspace` mounts, fetches sermon by ID
5. If `sermon.series_id` present: fetches series and sections in parallel
6. `sermon.series` and `sermon.section` attached to sermon object before `setSermon()`
7. Topbar renders series title as clickable breadcrumb (`onOpenSeries` callback)
8. On close or breadcrumb click:
   - `closeWorkspace()` reads `returnDestination` and `returnSeriesId`
   - `setOpenSeriesId(returnSeriesId)` restores series context
   - `currentView = "series-planner"`
9. `SeriesPlanner` reopens at the correct series
