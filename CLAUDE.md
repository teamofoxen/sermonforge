# CLAUDE.md — SermonForge Project Bible

Read this file at the start of every session before touching any code.
Also read CHANGELOG.md and DECISIONS.md before making any changes.

---

## AUTHORITY

This document defines the system. All architectural constraints, patterns,
and boundaries described here are binding. Any analysis, modification, or
extension of this codebase must conform to this document. If code and this
document diverge, the code is considered incorrect unless explicitly
justified in DECISIONS.md.

---

## PROJECT OVERVIEW

SermonForge is a desktop sermon preparation workspace for a pastor who
preaches approximately 42 weeks per year with occasional guest preachers.
It is a local-first Electron app — all data lives on the user's machine,
backed up automatically via OneDrive. It is not a web app and has no backend.

The core purpose is to give the pastor a single structured environment that:
- Plans sermon series (Series → Sections → Sermon Slots hierarchy)
- Walks through a proven sermon prep guide (Steps 1–4: Exegesis, MPT/MPS
  Forge, Outline, Functional Elements)
- Provides an AI assistant (Claude) that is context-aware at each prep step
- Includes a Tune-Up Engine that audits completed manuscripts
- Manages a preaching calendar, illustration library, and sermon archive
- Connects to Logos Bible Software for passage navigation

The user is not a developer. All tooling decisions must prioritize
simplicity. Terminal usage should be minimized once the app is stable.

---

## MENTAL MODEL

SermonForge is organized around how pastors actually plan: starting with a series, dividing Scripture into preachable units, assigning them to Sundays, and then preparing each sermon within that theological context.

**The series is the primary unit of pastoral work. The sermon is an instance within it.**

This hierarchy should be reflected in every UX decision:
- Series Planning is where work begins — not the Sermon Workspace
- The Sermon Workspace exists within the context of a series; it is where the pastor goes deep on a specific week after the series has already oriented the theological direction
- The Dashboard is a series planning room — it shows where you are in the arc of current and upcoming series, not a task status board
- The Calendar is a planning tool — it exists to assign sermons to Sundays and surface liturgical context, not just to display a schedule

**The AI is calibrated to the method, not a replacement for it.**

The exegetical sequence (Observe → Interpret → Redemptive Thread → Implications) encodes a specific text-driven homiletical method. The AI panel works within that structure — its context, tone, and depth shift depending on which stage the pastor is in. It is a thinking partner for each step, not a sermon generator.

**The nav should read as a map of how a pastor works:**
1. Where you are across all active series (Dashboard)
2. Where series work begins and is planned (Series Planning)
3. Where individual sermon prep happens (Sermon Prep)
4. When things are happening (Calendar)

Reference and archive features (Illustrations, Sermon Library, Archive) are resources, not destinations. They should be accessible from within the workflow rather than as top-level navigation items.

**One-sentence identity:** SermonForge starts where sermon prep actually starts — with the series. Plan the arc, divide the passage, then go deep on each sermon with AI assistance calibrated to every stage.

---

## TECH STACK

- Electron 31 — desktop shell
- React 18 — UI framework
- Vite 5 — dev server and bundler (config: vite.config.mjs)
- sql.js — SQLite in WASM (NOT better-sqlite3 — see DECISIONS.md)
- @anthropic-ai/sdk — AI calls via Anthropic API
- dotenv — environment variable loading
- Node 24 — runtime
- Windows 11, OneDrive storage path

---

## ENVIRONMENT

.env file lives at project root (never commit this file):
  ANTHROPIC_API_KEY=sk-ant-...
  LOGOS_DATA_DIR=C:\Users\rossa\AppData\Local\Logos\Data\pktv5zta.nam

User's OneDrive path: C:\Users\rossa\OneDrive
Project root: C:\Users\rossa\OneDrive\SermonForge
Database file: C:\Users\rossa\OneDrive\SermonForge\sermonforge.db

---

## PROJECT STRUCTURE

SermonForge/
├── CLAUDE.md              — this file, project bible
├── CHANGELOG.md           — full history of all changes
├── DECISIONS.md           — architectural decisions and rationale
├── README.md              — setup and launch instructions
├── package.json           — dependencies and npm scripts
├── vite.config.mjs        — Vite configuration (ESM, renamed from .js)
├── index.html             — Electron renderer entry point
├── .env                   — API keys and paths (never commit)
├── electron/
│   ├── main.js            — Electron main process, IPC handlers,
│   │                        DB init, Logos URL builder
│   ├── ai.js              — Anthropic client + ai-message IPC handler
│   └── preload.js         — contextBridge API exposed to renderer
└── src/
    ├── main.jsx           — React entry point
    ├── App.jsx            — top-level routing and state
    ├── styles/
    │   └── global.css     — full design system, all CSS variables
    ├── db/
    │   └── database.js    — IPC-backed query helper functions
    ├── utils.js           — shared utilities: tryParse, formatDate
    └── utils/
    │   ├── ai.js             — sendAIMessage(): single AI call choke point for all renderer-side AI calls
    │   ├── churchCalendar.js — liturgical season engine (pure JS)
    │   ├── contextBuilder.js — 7-tier context assembly pipeline; buildContext, buildAdaptiveHints,
    │   │                        buildMemoryContext, resolveIncludes
    │   ├── hooks.js          — shared React hooks (useDebounce)
    │   └── memory.js         — localStorage pastor memory layer; load/save/update/extract patterns
    └── constants/
    │   └── steps.js          — STEPS, PHASES, STEP_SEQUENCE, PHASE_SEQUENCE — all step/phase name constants
    └── components/
        ├── Sidebar.jsx
        ├── Dashboard.jsx
        ├── Planning.jsx       — Series list + biblical coverage view
        ├── SeriesPlanner.jsx  — Series planning workspace (4 tabs)
        ├── SermonList.jsx
        ├── Calendar.jsx
        ├── Illustrations.jsx
        ├── Archive.jsx
        ├── Library.jsx        — Sermon library import + search
        ├── SermonWorkspace.jsx
        ├── StudyTab.jsx
        ├── OutlineTab.jsx
        ├── ManuscriptTab.jsx
        ├── DeliveryTab.jsx
        ├── AIPanel.jsx
        └── NewSermonModal.jsx

---

## DATABASE SCHEMA

Current schema version: 6

Table: series
  id                TEXT PRIMARY KEY
  title             TEXT
  color             TEXT  (gold | crimson | sage | slate)
  description       TEXT
  year              INTEGER
  big_idea          TEXT  — series-level big idea
  overview          TEXT  — extended theological narrative
  passage_range     TEXT  — e.g. "Luke 1:1–24:53"
  start_date        TEXT
  end_date          TEXT
  structural_outline TEXT  — detailed book outline (paste or AI-generated)
  status            TEXT  (planning | active | complete)
  canon_category    TEXT  (ot | nt | wisdom | prophetic)

Table: series_sections
  id            TEXT PRIMARY KEY
  series_id     TEXT  — FK to series
  title         TEXT
  passage_range TEXT
  big_idea      TEXT
  overview      TEXT
  sort_order    INTEGER
  created_at    TEXT

Table: sermons
  id                TEXT PRIMARY KEY
  series_id         TEXT  — FK to series (NULL for one-off sermons)
  section_id        TEXT  — FK to series_sections (optional)
  is_one_off        INTEGER  — 1 if standalone sermon, 0 if series sermon
  title             TEXT
  passage           TEXT
  date              TEXT
  preacher          TEXT
  stage             TEXT  (planning|study|outline|writing|ready|archived)
  big_idea          TEXT
  mpt               TEXT  — Main Point of the Text (past tense)
  mps               TEXT  — Main Point of the Sermon (present tense)
  observations      TEXT  — Step 1 Phase 1
  interpretation    TEXT  — Step 1 Phase 2
  redemptive_thread TEXT  — Step 1 Phase 3
  implications      TEXT  — Step 1 Phase 4
  outline             TEXT  — JSON array of point strings
  manuscript          TEXT
  delivery_notes      TEXT
  timing_notes        TEXT
  post_sermon         TEXT
  functional_elements TEXT  — JSON object {0:{explanation,application,illustration},...}
  checklist           TEXT  — JSON object keyed by item label {label:bool,...}
  topic_theme         TEXT  — pastoral intelligence: the doctrine, situation, or felt need
  audience_assumptions TEXT — pastoral intelligence: who is in the room and what they carry
  background_noise    TEXT  — pastoral intelligence: external context (news, events, moment)
  created_at          TEXT
  updated_at          TEXT

Table: illustrations
  id         TEXT PRIMARY KEY
  type       TEXT  (personal|historical|biblical|hypothetical)
  text       TEXT
  tags       TEXT  — JSON array
  used_in    TEXT  — JSON array of sermon ids
  created_at TEXT

Table: calendar_notes
  id         TEXT PRIMARY KEY
  date       TEXT  — "YYYY-MM-DD"
  type       TEXT  (holiday | guest | break | special)
  label      TEXT
  notes      TEXT
  created_at TEXT

Table: library
  id            TEXT PRIMARY KEY
  filepath      TEXT UNIQUE
  filename      TEXT
  title         TEXT
  passage       TEXT
  folder        TEXT
  series_name   TEXT
  manuscript_text TEXT
  word_count    INTEGER
  imported_at   TEXT

Table: library_fts  — FTS4 virtual table (FTS5 attempted first)
  id, title, passage, manuscript_text

Table: meta
  key   TEXT PRIMARY KEY
  value TEXT
  — stores schema_version

---

## IPC CHANNELS

All communication between renderer and main process goes through these
channels. The API key never touches the renderer.

  "ai-message"
    receives: { messages: [{role, content}], systemPrompt: string }
    returns:  string (Claude's response text)

  Database operations use named per-operation IPC channels (e.g. db-getAllSermons,
  db-getSermonById). All handlers are implemented in electron/main.js. No raw SQL
  is accepted from the renderer.

  "open-logos"
    receives: passage string (e.g. "Galatians 1:1-10")
    returns:  { success: true } — copies passage to clipboard, opens Logos

  "library-status"
    receives: nothing
    returns:  { count: number, lastImported: string|null }

  "library-import"
    receives: nothing
    returns:  { total, imported, errors, skipped }
    pushes:   "library-import-progress" events: { done, total, complete }

  "library-search"
    receives: { query: string, limit: number, mode: "browse"|"ai" }
    returns:  array of { id, title, passage, folder, series_name, word_count, excerpt }

  "library-get-manuscripts"
    receives: { ids: string[], truncate: bool, maxChars: number }
    returns:  array of { id, title, passage, series_name, manuscript_text }

---

## SERIES PLANNING SYSTEM

Three-level hierarchy: Series → Sections → Sermons

Series Planning Workspace (SeriesPlanner.jsx) has four tabs:
  Overview  — title, color, canon category, status, passage range, dates,
              big idea (AI-generate), overview narrative (AI-generate)
  Structure — structural outline (paste or AI-generate), section builder
              (each section: title, passage range, big idea, overview)
  Sermon Slots — sermon records (stage=planning) within the series,
                 organized by section if sections exist
  Calendar  — auto-suggest Sundays from start date, liturgical season
              badges, skip controls, AI scheduling advice, save dates

Church calendar engine (src/utils/churchCalendar.js):
  - Computes Easter via Gregorian computus
  - getSeasonForDate(dateStr) — returns season for any date
  - Seasons: Christmastide, Epiphany, Lent, Holy Week, Easter Season,
             Ordinary Time, Advent
  - getUpcomingSundays(start, count, excludeDates) — schedule generator

---

## DESIGN SYSTEM

Never deviate from this design system without explicit user approval.
All values live in global.css as CSS variables.

Colors:
  --ink: #1a1410
  --ink-mid: #3d3229
  --ink-soft: #6b5c4e
  --ink-ghost: #a8998a
  --parchment: #f7f3ec
  --parchment-warm: #efe9de
  --parchment-deep: #e4dace
  --gold: #b8860b
  --gold-bright: #d4a017
  --gold-pale: #f0e4b8
  --crimson: #8b1a1a
  --crimson-soft: #c0392b
  --sage: #4a6741
  --sage-soft: #6b9c60
  --slate: #2c3e50
  --white: #ffffff

Typography:
  Playfair Display — headings, sermon titles, italic accents, delivery view
  Crimson Pro      — body text, labels, nav items, all prose
  JetBrains Mono   — passage references only
  Loaded from Google Fonts.

Layout:
  Sidebar: 260px, var(--ink) background, gold gradient right border
  Content: var(--parchment) background
  AI Panel: 320px right sidebar, white background
  Topbar: white background, soft shadow

Component rules:
  - btn-primary: var(--gold) background, white text
  - btn-ghost: transparent, parchment-deep border
  - Cards: white background, parchment-deep border, shadow-soft
  - Stage badges: planning=sage, study=orange, outline=slate,
                  writing=crimson, ready=green, archived=ghost
  - Big Idea box: ink background, gold quote watermark, Playfair italic

---

## SERMON WORKSPACE — STUDY TAB STRUCTURE

The Study tab implements the full sermon prep guide in four steps:

STEP 1 — EXEGESIS (four collapsible phases):
  Phase 1: Observe      → saves to sermons.observations
  Phase 2: Interpret    → saves to sermons.interpretation
  Phase 3: Redemptive Thread → saves to sermons.redemptive_thread
  Phase 4: Implications → saves to sermons.implications
  Each phase has a textarea and a "Review" button that sends content to AI.

STEP 2 — MPT→MPS FORGE:
  Two fields: mpt (past tense) and mps (present tense)
  "Challenge My MPT" — AI pushes back on MPT accuracy
  "Check MPT→MPS Chain" — AI evaluates whether MPS grows from MPT
  AI posture: challenger, not encourager

STEP 3 — OUTLINE BUILDER:
  Add/remove/reorder points
  Syncs bidirectionally with Outline tab
  "Review Outline" button sends to AI

STEP 4 — FUNCTIONAL ELEMENTS:
  Per outline point: Explanation, Application, Illustration fields
  "Review E/A/I Balance" button

---

## AI PANEL BEHAVIOR

- Reactive by default — user asks, AI answers
- Context-aware — knows current step, passage, MPT, MPS, current field content
- "Review My Work" button triggers structured evaluation of current step
- Step-specific system prompts (see each component for exact prompts)
- All API calls go through IPC "ai-message" channel
- Tune-Up Engine on Manuscript tab uses the full 3-phase audit prompt

---

## PASTORAL INTELLIGENCE

The Pastoral Intelligence card is a persistent orientation card visible at the top of the
Sermon Workspace content area at every tab and every step. It is never a gate — the pastor
can proceed to any stage without filling it.

It captures three pastor-supplied fields:

  topic_theme          — the territory this sermon enters: a doctrine, life situation,
                          question, or felt need (e.g. grief, doubt, parenting, the problem
                          of evil, union with Christ).
  audience_assumptions — what the pastor knows about who's in the room: their posture,
                          context, and what they're carrying into the service. Not
                          demographics — situational awareness.
  background_noise     — specifically external context: news, cultural moment, community
                          events, what's on everyone's mind before the sermon begins.

These three fields feed into a new context tier labeled [THIS SERMON] which is assembled
by buildContext() in contextBuilder.js. Unlike every other context tier, [THIS SERMON] is
always-on — it is never gated by step. It is gated by content: the section is only emitted
when at least one field has content (text?.trim().length > 0, so single-word entries like
"Lament" are included). Budget: 800 chars across all three fields.

For series sermons (sermon.series_id not null), the card also displays read-only series
context above the editable fields:
  - Series title (from sermon.series.title)
  - Series big idea (only if present)
  - Section big idea (only if present)

The three new columns are stored in the sermons table (schema version 6):
  topic_theme TEXT DEFAULT ''
  audience_assumptions TEXT DEFAULT ''
  background_noise TEXT DEFAULT ''
All three are in the SERMON_COLUMNS allowlist and save through the standard
handleUpdate → debouncedSave → updateSermon IPC path.

---

## TUNE-UP ENGINE SYSTEM PROMPT

Lives on the Manuscript tab. Sends manuscript + MPT + MPS + outline to
Claude with a structured 3-phase audit: Snapshot, Alignment Map, Patch Plan.
Constraints: preserve voice, minimal edits, ±10% length, no new theology
unless gospel repair required, no new illustrations unless asked.

---

## SYSTEM FLOWS

### Flow 1: User sends a message in the AI panel

1. Pastor types a message or clicks a chip in AIPanel.jsx
2. handleSendInput() or chip onClick fires
3. buildSystemPrompt(step, sermonId) assembles the system prompt:
   - Base role + behavioral instructions
   - TOOL CONTEXT (static, always present)
   - MESSAGE CONTEXT RULES (static, always present)
   - stepDesc (dynamic, keyed to active step/tab)
   - ADAPTIVE GUIDANCE (dynamic, from buildAdaptiveHints(memory, step, sermonId))
4. buildContext({ sermon, step, libraryChunks, theologyChunks }) assembles the context payload:
   - normalizeSermon() cleans raw sermon data (includes topic_theme, audience_assumptions, background_noise)
   - buildTiers() groups data into 7 priority tiers
   - resolveIncludes(step) gates which tiers are active for this step
     (tier7 / pastoralContext is always true; gated by content, not step)
   - assembleContext() formats active tiers into labeled sections:
       [PASSAGE & MPT], [THIS SERMON], [INTERPRETATION], [STRUCTURE],
       [SERIES CONTEXT], [SUPPORTING MATERIAL], [PASTOR CONTEXT]
   - dedupeText() cleans the result
5. User message is formatted: "CONTEXT:\n{context}\n\nUSER REQUEST:\n{userInput}"
6. If a chip has a system string, it is appended: "The following task takes priority over all adaptive guidance above.\n\nTASK:\n{system}"
7. sendAIMessage(messages, systemPrompt) in src/utils/ai.js forwards via IPC
8. electron/ai.js receives the IPC call, sends to Anthropic SDK, returns response string
9. Response added to message history in AIPanel state
10. captureResponsePatterns(response, step) extracts patterns → writes to aiPhrasePatterns only

---

### Flow 2: Sermon field edit triggers a save and memory capture

1. Pastor edits a field in any tab (StudyTab, OutlineTab, ManuscriptTab, DeliveryTab)
2. onUpdate(fields) callback fires → SermonWorkspace.handleUpdate()
3. setSermon() merges fields into local sermon state immediately (optimistic update)
4. sermonRef.current is updated to match
5. debouncedSave() is scheduled (800ms debounce)
6. On debounce fire: persistUpdate() reads sermonRef.current (full current state)
7. updateSermon(id, fields) IPC call → electron/main.js db-updateSermon handler
8. buildUpdate() validates fields against SERMON_COLUMNS allowlist
9. SQL UPDATE runs, saveDb() schedules disk write (500ms debounce)
10. captureMemory(sermon, { scanPhrases: false }) runs:
    - Extracts MPT → history.recentMPTs
    - Extracts passage → history.recentPassages
    - Extracts outline pattern → patterns.outlinePatterns
    - Hash guard prevents duplicate writes
    - updateMemory() merges into localStorage under "sermonforge_memory"

---

### Flow 3: Pastor opens a sermon from the Series Planner

1. Pastor clicks "Open" on a sermon slot in SeriesPlanner Sermon Slots tab
2. onOpenSermon(sermon.id, "series-planner", series.id) fires → App.jsx openSermon()
3. App.jsx sets:
   - openSermonId = sermon.id
   - returnDestination = "series-planner"
   - returnSeriesId = series.id
   - currentView = "sermon-workspace"
4. SermonWorkspace mounts, fetches sermon by ID
5. If sermon.series_id present: fetches series and sections in parallel
6. sermon.series and sermon.section attached to sermon object before setSermon()
7. Topbar renders series title as clickable breadcrumb (onOpenSeries callback)
8. Pastor works through prep stages — series big idea flows into context via tier 4
9. On close (or breadcrumb click):
   - closeWorkspace() reads returnDestination and returnSeriesId
   - setOpenSeriesId(returnSeriesId) restores series context
   - currentView = "series-planner"
10. SeriesPlanner reopens at the correct series

---

### Flow 4: Pastor builds out a series in the Series Planner

1. Pastor creates a new series from Dashboard (+ New Series) or Planning view
2. handleNewSeries() in App.jsx: createSeries({ title, color, status, canon_category })
3. IPC → electron/main.js db-createSeries → inserts record, returns series with generated ID
4. openPlanner(series.id) sets currentView = "series-planner", openSeriesId = series.id
5. SeriesPlanner mounts, fetches series by ID + all sections via getSectionsBySeries()

Overview tab:
6. Pastor fills title, passage range, canon category, status, dates, big idea, overview
7. Each field change calls updateSeries(id, fields) via onUpdate → 800ms debounced save
8. AI Generate buttons send series context to sendAIMessage() → response populates field

Structure tab:
9. Pastor adds sections via createSection({ series_id, title, passage_range, big_idea, overview, sort_order })
10. Sections reordered via updateSection(id, { sort_order }) per drag
11. Structural outline textarea saves to series.structural_outline via updateSeries()
12. AI context for section questions includes series big idea + section data

Sermon Slots tab:
13. Pastor adds sermon slots via createSermon({ series_id, section_id, is_one_off: 0, stage: "planning" })
14. Slots are real sermon records — no separate table
15. Each slot: passage and working title saved via updateSermon()
16. "Open" button calls onOpenSermon(slot.id, "series-planner", series.id) → see Flow 3

Calendar tab:
17. Pastor sets series start date
18. getUpcomingSundays(startDate, count, excludeDates) generates Sunday suggestions
    — excludeDates pulled from calendar_notes table
    — liturgical season computed per date via getSeasonForDate()
19. Pastor adjusts dates manually or accepts suggestions
20. "Save All Dates" writes date to each sermon record via updateSermon()
    and updates series.end_date via updateSeries()
21. AI scheduling advisor receives series slot count, start date, calendar notes context

Series Booklet Export (planned — not yet implemented):
22. From the Series Planner (likely Overview or Structure tab), pastor triggers booklet export
23. Booklet assembles from series fields in a defined order:
    - Series title, passage range, canon category, dates
    - Series big idea
    - Series overview narrative
    - Structural outline
    - Per-section: title, passage range, big idea, overview
    - Per-sermon slot: title, passage, date, liturgical season
24. Output is a formatted .docx file generated via the docx library in the main process
25. File saved to a pastor-specified location or a default exports folder
26. IPC pattern: renderer requests export → main process assembles and writes file
    → returns { success, filepath } to renderer

---

## KNOWN ISSUES

1. LOGOS NAVIGATION (WORKAROUND IN PLACE — NOT FULLY RESOLVED)
   The logos4:// URL approach opens Logos but does not navigate to the
   correct passage. Root cause not determined. Workaround implemented
   2026-03-29: "Open in Logos" button now copies the passage text to the
   clipboard and opens Logos via shell.openExternal("logos4:"). User
   pastes in Logos manually. Button label confirms "✓ Copied — paste in
   Logos" for 4 seconds. buildLogosUrl() and BOOK_ABBREVS retained in
   main.js in case URL navigation is revisited.

---

## DEVELOPMENT RULES

1. Read CLAUDE.md, CHANGELOG.md, and DECISIONS.md before every session
2. Update CHANGELOG.md after every change — what changed and why
3. Never change the design system without explicit user approval
4. Never change the database schema without approval and a migration plan.
   All schema changes must go through runMigrations() with a version
   increment — never alter CREATE TABLE without also adding a migration.
5. Never expose ANTHROPIC_API_KEY to the renderer process
6. All Claude API calls must go through IPC "ai-message" channel
7. Always verify npm start works after changes
8. Never mark an issue as fixed in CLAUDE.md without verifying it works
9. This is a Windows app on OneDrive — be careful with file paths,
   always use path.join(), never hardcode separators
10. After completing any set of changes, run `npm run build` to produce an
    updated installer. Output goes to:
    C:\Users\rossa\AppData\Local\SermonForgeBuilds\
    Do not wait to be asked — build is part of finishing a task.

---

## GUARDRAILS

### Boundaries
- No direct use of `window.electronAPI` outside wrapper modules
- No raw SQL outside the database layer (electron/main.js handlers)
- All AI calls must go through `sendAIMessage` (src/utils/ai.js)

### No Silent Failures
- Do not swallow errors with empty catch blocks
- JSON parsing must validate or log failures
- No silent fallback behavior that hides real errors

### No Duplication
- Reuse existing helpers; do not duplicate shared logic or constants
- Check for an existing utility before writing a new one

### Memory / AI Feedback Loop
- `phrasePatterns` — pastor's own rhetorical patterns extracted from manuscript. Used in adaptive hints.
- `aiPhrasePatterns` — patterns extracted from AI responses. For analysis only; never influence generation.
- These two arrays must NEVER be merged. A runtime assertion in `updateMemory` (src/utils/memory.js)
  throws in dev mode if an AI-sourced phrase is written to `phrasePatterns`. Do not remove this guard.
- If the guard fires: fix the call site that is routing AI content to the wrong key.

### Change Discipline
- Make minimal, surgical changes
- Do not introduce new patterns unnecessarily

### Pre-Completion Check
Before finishing any change verify:
- No boundary violations
- No silent failure patterns introduced
- No unnecessary duplication

---

## NEXT PRIORITIES

Series planning system is live (Phase 1). Remaining planned work:

Phase 2 (series planning):
- Calendar notes UI (add/manage special dates from within the app)
- Series booklet export (Word .docx via docx library)
- Dashboard "Active Series" cards using new series fields

Possible future work:
- Illustration linking (mark an illustration as used in a specific sermon)
- Full-text search across sermon content (manuscript, notes)
- Custom app icon
- Code signing certificate (removes Smart App Control friction on new machines)
