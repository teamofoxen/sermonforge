# SermonForge — Sermon Workspace

> The Sermon Workspace is where a pastor goes deep on a specific week within the context of
> a series. Component: `src/components/SermonWorkspace.jsx`.
> See also: `docs/SYSTEMS/series-planner.md` for how the workspace is opened.

---

## The Study throughline

The four Study sub-phases — Observe, Interpret, Redemptive Thread, Implications — are
not four parallel worksheets. They compose a single deepening exegetical arc that
drives the text into the room: text says → text means → text points to Christ → text
lands on this congregation. Pastoral Context (PC) is one of the things that arc
carries. PC enters the throughline progressively rather than sitting parallel to it.
Process Contract #6 in `docs/CORE.md` binds the throughline's integrity; this section
holds the substance.

**Articulated by the product owner during SPRD planning (2026-04-30, verbatim):**

> The point of exegesis is engagement with the world of text itself, as much as
> possible, without influence from modern context. That's to ensure that at the
> core of a sermon, God is speaking first. My PC shouldn't be driving the sermon,
> the text should be driving the sermon toward my PC. At the end of the Observe phase is
> "Possible Applications," and this is the first time anything related to PC
> surfaces. The idea is that the pastor begins to think in terms of "how could
> this apply to my audience," but doesn't fully enter that mode. Think of it as
> introducing a new layer of thinking, but only into the awareness layer, not
> focus. That's why the pastor is immediately pulled back into the text with
> Interpret phase, where the main issue is what does the text mean (vs. what does
> it say, which the Observe phase does). By the end of Interpret, the pastor knows
> what it says and what it means, and now has a more holistic picture. So the
> possible applications are marinating in this increased understanding. By the end
> of the redemptive thread, the pastor's understanding is now robustly Gospel
> centered, and those possible applications are getting real texture. THIS is the
> moment PC begins to really pop. The implications phase SHOULD be a conversation
> between Theological Significance, Personal Application and PC. It's not set up
> that way to begin with. It's random questions that don't seem to build on
> anything or lead anywhere. That could be better. And on top of that PC is
> orphaned to the top in it's own category. However the math of that conversation
> works out, PC never should've been absent from that stage in the first place.
> Nor should it have been introduced so strongly before. So the phase needs
> fixing. And part of that means positioning PC correctly, and incorporating it
> effectively, which should be a future conversation. And possibly even another
> pass at all the steps within the phases to make sure they're truly building on
> each other logically.

**Two field-level commitments flow from this articulation and bind the SFDI walkthrough:**

1. **Observe ends with the field that first surfaces PC into the awareness layer.**
   Named "Possible Implications" (renamed from "Possible Applications" in the
   Vocabulary cleanup pass — see `docs/PROPOSALS/sfdi-charter.md`), this field is
   where the pastor begins to think pastorally without yet leaving the text.
   SFDI's walkthrough of Observe must honor that role: the field's definition,
   its place in the Observe sequence, and its handoff into Interpret all express
   the awareness-layer entry of PC.
2. **Implications is a three-way conversation between Theological Significance,
   Personal Implications, and PC.** Not three parallel groups of fields. PC is
   one of the three voices, integrated, not orphaned to a top-of-workspace card.
   The named outcome of Implications — the **Implications Synthesis** — is the
   integrated form of that conversation. PC's substance gets resolved here, not
   at MPT/MPS.

The directional principle underneath both: **the text drives the sermon toward
Pastoral Context, not the other way around.** Exegesis exists to keep the text
speaking first; PC is what the text drives the pastor toward, not what drives the
text. SFDI walks fields with this directionality in view.

The detailed field-level work — which fields enact which voice in the Implications
conversation, what the Implications Synthesis named outcome looks like, how the
three-way conversation composes — is the work of the Study Field Definition
Initiative (`docs/PROPOSALS/sfdi-charter.md`). The vision above is the canonical
anchor SFDI walks against.

---

## The Pastoral Context card (interim)

Today's `SermonWorkspace.jsx` renders an always-on **Pastoral Context** card at the
top of the workspace content area, visible at every tab and every step. It is never
a gate — the pastor can proceed without filling it.

This card is the **anti-pattern the throughline replaces.** Its always-on placement
frames PC as parallel-track orientation ("fill PC, then study"), which contradicts
the design — text is driven toward PC, not the other way around. The card persists
as an interim affordance until SFDI's Implications walkthrough lands the three-way
conversation that absorbs PC's substance into the named-outcome work of the four
sub-phases.

**Order of removal** (cross-referenced from `docs/PROPOSALS/sfdi-charter.md` and
`docs/PROPOSALS/study-phase-redesign.md`):

1. SFDI walks the four sub-phases, with anchors at Observe-end and Implications.
2. Implications gets restructured per SFDI's discoveries.
3. *Then* the card comes off the workspace shell, the AI prompts shed their PC
   handling (the heaviest is the MPS Draft prompt's PC-weighting passage in
   `StudyTab.jsx`), and Tier 7 is removed from the context pipeline. PC's
   substance flows downstream through the named outcomes.

**Open design question for SFDI Implications walkthrough:** do the three PC fields
disappear entirely (PC's substance lives only in the work the pastor does within
the four sub-phases), or do they persist somewhere off the workspace front
(perhaps series-level, since The Room and The Cultural Moment are stable across
multiple sermons in a series)?

**Three fields** (stored in `sermons` table, schema version 6):

| Field | Purpose |
|-------|---------|
| `topic_theme` | The territory this sermon enters: a doctrine, life situation, question, or felt need (e.g. grief, doubt, parenting, the problem of evil, union with Christ). |
| `audience_assumptions` | What the pastor knows about who's in the room — their posture, context, what they're carrying. Situational awareness, not demographics. |
| `background_noise` | External context only: news, cultural moment, community events, what's on everyone's mind before the sermon begins. |

**UI behaviour (interim):**
- Auto-collapses on load when any of the three fields has content (shows truncated snippets in header)
- Expands on click
- Collapse state is UI-only — the underlying data and context pipeline are unaffected

**For series sermons** (`sermon.series_id` not null), the card displays read-only series context
above the editable fields: series title, series big idea (only if present), section big idea (only if present).

**Context pipeline (interim):** These three fields feed the `[THIS SERMON]` Tier 7
of the AI context pipeline. Tier 7 is removed when the card is removed (post-SFDI
Implications restructure). See `docs/SYSTEMS/context-pipeline.md` for tier budget
and gating rules.

**Save path:** All three are in the `SERMON_COLUMNS` allowlist and save through:
`handleUpdate → debouncedSave → updateSermon IPC`

---

## Cross-System Dependencies

**If modifying Pastoral Context fields** (`topic_theme`, `audience_assumptions`, `background_noise`):
also check `docs/SYSTEMS/context-pipeline.md` — the `[THIS SERMON]` tier section documents the
always-on rule, content-gating logic, and 5000-char budget that govern how these fields reach the AI.
Note: the `[THIS SERMON]` tier is the interim mechanism; it is removed when SFDI's Implications
work lands and PC's substance flows through named outcomes instead.

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
`obvious_point`, `basic_outline`, `applications`.

**Note:** the `applications` field (UI label: "Possible Implications" — renamed
from "Possible Applications" in the Vocabulary cleanup pass; the JSON key stays
`applications` to avoid a data migration) is where Pastoral Context first
surfaces in the awareness layer. The pastor begins to think pastorally without
yet leaving the text. See "The Study throughline" above.

#### Phase 2: Interpret → `sermons.interpretation` (JSON)
9 fields: `context_impact`, `recurring_ideas`, `characters`, `contrasts`, `diagram`,
`cross_refs`, `commentary`, `summarize_parts`, `summarize_whole`

#### Phase 3: Redemptive Thread → `sermons.redemptive_thread` (JSON)
7 question fields + 1 summary field (key: `"summary"`)
- **"Synthesize →"** button: AI compiles all 7 answers into a cohesive redemptive summary.
  Routes through the proposal pattern (since SPRD Q5, shipped 2026-05-01 via ACCI
  Item A2 `2b0fa66`) — proposal panel, accept or discard. Summary is also
  hand-editable.

#### Phase 4: Implications → `sermons.implications` (JSON)

**Vision (per "The Study throughline" above):** Implications is a three-way
conversation between Theological Significance, Personal Implications, and
Pastoral Context — not three parallel groups of fields. PC is one of the three
voices, integrated, not orphaned to a top-of-workspace card. The named outcome
of Implications is the **Implications Synthesis** — the integrated form of that
conversation, which the pastor carries into MPT/MPS as the pastoral handoff.

**Current state (pending SFDI restructure):** today's implementation has three
parallel groups of fields and a Compiled-list AI button. The walkthrough work in
SFDI is where the three-way conversation gets concretely articulated as fields
and flow.

**Today's fields:**
- **Theological Significance** (5 fields): `about_god`, `about_ourselves`, `about_christ`,
  `timeless`, `doctrines`
- **Personal Implications** (8 fields — renamed from "Personal Application" in the Vocabulary cleanup pass; JSON keys stay): `examples`, `commands`, `errors`, `sins`, `promises`,
  `new_thoughts`, `explore`, `convictions`
- **Unbeliever Implications** (1 field): key `"unbeliever"`
- **Compiled list** (key: `"compiled"`)
- **"Compile →"** button: AI consolidates all answers into a master list. Routes
  through the proposal pattern — proposal panel, accept or discard, central
  save-and-check logic. The previous direct-write was resolved by SPRD Q5,
  shipped 2026-05-01 via ACCI Item A2 (`2b0fa66`) alongside four other
  previously-bypassed AI write paths.

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
- Shows the sermon passage in ESV
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

The most recent Tune-Up response is persisted to `sermons.last_tune_up` as JSON
`{ content, ts }` so the pastor can return to it after closing the workspace.
The Manuscript tab renders a collapsible "Last Tune-Up" panel above the Introduction
card whenever this column has content. Flow Coach and Ear Check are not persisted —
their cadence is conversational and only the in-drawer history matters.

## Manuscript Export

A "Export to Word" button on the Manuscript tab toolbar dispatches the
`sermon-export-manuscript` IPC channel. The renderer passes the parsed manuscript JSON
(intro/transitions/conclusion), outline `[{id,text}]`, and `functional_elements` map.
Main builds the `.docx` and saves to `Documents/SermonForge/exports/Manuscripts/`,
then opens it. See `docs/REFERENCE/ipc-channels.md` for the channel spec.

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
