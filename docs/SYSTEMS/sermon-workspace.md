# SermonForge — Sermon Workspace

> The Sermon Workspace is where a pastor goes deep on a specific week within the context of
> a series. Component: `src/components/SermonWorkspace.jsx`.
> See also: `docs/SYSTEMS/series-planner.md` for how the workspace is opened.

---

## Pastoral Intelligence Card

A collapsible orientation card visible at the top of the workspace content area at **every tab
and every step**. It is never a gate — the pastor can proceed without filling it.

**Three fields** (stored in `sermons` table, schema version 6):

| Field | Purpose |
|-------|---------|
| `topic_theme` | The territory this sermon enters: a doctrine, life situation, question, or felt need (e.g. grief, doubt, parenting, the problem of evil, union with Christ) |
| `audience_assumptions` | What the pastor knows about who's in the room — their posture, context, what they're carrying. Situational awareness, not demographics. |
| `background_noise` | External context only: news, cultural moment, community events, what's on everyone's mind before the sermon begins |

**UI behaviour:**
- Auto-collapses on load when any of the three fields has content (shows truncated snippets in header)
- Expands on click
- Collapse state is UI-only — the underlying data and context pipeline are unaffected

**For series sermons** (`sermon.series_id` not null), the card displays read-only series context
above the editable fields:
- Series title
- Series big idea (only if present)
- Section big idea (only if present)

**Context pipeline:** These three fields feed the `[THIS SERMON]` context tier. See
`docs/SYSTEMS/context-pipeline.md` for tier budget and gating rules.

**Save path:** All three are in the `SERMON_COLUMNS` allowlist and save through:
`handleUpdate → debouncedSave → updateSermon IPC`

---

## Cross-System Dependencies

**If modifying Pastoral Intelligence fields** (`topic_theme`, `audience_assumptions`, `background_noise`):
also check `docs/SYSTEMS/context-pipeline.md` — the `[THIS SERMON]` tier section documents the
always-on rule, content-gating logic, and 800-char budget that govern how these fields reach the AI.

**If modifying structured exegesis JSON** (observations, interpretation, redemptive_thread, implications):
also check `docs/SYSTEMS/context-pipeline.md` — the exegesis context section documents how
`summarizeExegesis()` and `flattenExegesis()` consume this data for the context tiers.

---

## Study Tab Structure

The Study tab implements the full sermon prep guide in four steps.

### Step 1 — Exegesis

Four structured worksheet phases. Each phase:
- Renders individual labeled fields per question from the prep guide
- Stores data as JSON in the existing text column (legacy plain-text preserved under `legacy_notes` key)
- Has a sticky **"Show Text"** button that opens `PassagePopup`
- Has a **"Review"** button that assembles all filled fields for AI evaluation

Field definitions live in `src/utils/studyFields.js`.

#### Phase 1: Observe → `sermons.observations` (JSON)
9 fields: `context`, `divisions`, `commands`, `statements`, `characters`, `big_ideas`,
`obvious_point`, `basic_outline`, `applications`

#### Phase 2: Interpret → `sermons.interpretation` (JSON)
9 fields: `context_impact`, `recurring_ideas`, `characters`, `contrasts`, `diagram`,
`cross_refs`, `commentary`, `summarize_parts`, `summarize_whole`

#### Phase 3: Redemptive Thread → `sermons.redemptive_thread` (JSON)
7 question fields + 1 summary field (key: `"summary"`)
- **"Synthesize →"** button: AI compiles all 7 answers into a cohesive redemptive summary.
  Summary is also hand-editable.

#### Phase 4: Implications → `sermons.implications` (JSON)
Three grouped sections:
- **Theological Significance** (5 fields): `about_god`, `about_ourselves`, `about_christ`,
  `timeless`, `doctrines`
- **Personal Application** (8 fields): `examples`, `commands`, `errors`, `sins`, `promises`,
  `new_thoughts`, `explore`, `convictions`
- **Unbeliever Implications** (1 field): key `"unbeliever"`
- **Compiled list** (key: `"compiled"`)
- **"Compile →"** button: AI consolidates all answers into a master list

### Step 2 — MPT→MPS Forge

Two fields: `mpt` (Main Point of the Text, past tense) and `mps` (Main Point of the Sermon,
present tense). AI posture is challenger, not encourager. See `docs/SYSTEMS/ai-panel.md`.

### Step 3 — Outline Builder

- Add/remove/reorder outline points
- Syncs bidirectionally with the Outline tab
- **"Review Outline"** button sends outline to AI

**Critical:** Use only `createOutlinePoint(text)` from `src/utils.js` to create points.
The stable UUID it assigns is the key that `functional_elements` depends on. See `docs/CORE.md`.

### Step 4 — Functional Elements

Per outline point: Explanation, Application, Illustration fields.
**"Review E/A/I Balance"** button sends all elements to AI.

---

## PassagePopup (Show Text)

A floating 3-translation scripture viewer triggered by the "Show Text" button on each
exegesis phase. Component: `src/components/PassagePopup.jsx`.

- Opens on hover over the Show Text button; stays open until click-outside or ✕
- Rendered via React portal to `document.body` (escapes overflow constraints)
- Shows the sermon passage in three columns: **ESV | NIV | The Message**
- Fetched via `fetchPassage()` wrapper in `src/db/database.js` → IPC `"passage-fetch"`
  (API keys never reach the renderer)
- Position: auto-flips above the anchor button if there's insufficient room below;
  sticky-position heuristic used (if `rect.top < 120`, show below)
- Draggable by header bar; resizable from bottom-right corner
- Results cached in-memory per session

See `docs/REFERENCE/ipc-channels.md` for the `passage-fetch` channel spec.

---

## Tune-Up Engine

Lives on the Manuscript tab. Audits completed manuscripts.
See `docs/SYSTEMS/ai-panel.md` for full description.

---

## Flow: Sermon Field Edit → Save and Memory Capture

1. Pastor edits a field in any tab (StudyTab, OutlineTab, ManuscriptTab, DeliveryTab)
2. `onUpdate(fields)` callback fires → `SermonWorkspace.handleUpdate()`
3. `setSermon()` merges fields into local state immediately (optimistic update)
4. `sermonRef.current` is updated to match
5. `debouncedSave()` is scheduled (800ms debounce)
6. On debounce fire: `persistUpdate()` reads `sermonRef.current` (full current state)
7. `updateSermon(id, fields)` IPC call → `electron/main.js` `db-updateSermon` handler
8. `buildUpdate()` validates fields against `SERMON_COLUMNS` allowlist
9. SQL UPDATE runs; `saveDb()` schedules disk write (500ms debounce — see `docs/CORE.md`)
10. `captureMemory(sermon, { scanPhrases: false })` runs:
    - Extracts MPT → `history.recentMPTs`
    - Extracts passage → `history.recentPassages`
    - Extracts outline pattern → `patterns.outlinePatterns`
    - Hash guard prevents duplicate writes
    - `updateMemory()` merges into `localStorage` under `"sermonforge_memory"`
