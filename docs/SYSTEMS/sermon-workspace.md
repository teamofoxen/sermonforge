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
three-way conversation composes — was the work of the Study Field Definition
Initiative (`docs/PROPOSALS/sfdi-charter.md`). **As of 2026-05-04, SFDI's structural
walk is complete** across all four sub-phases — the working SFDI document at
`docs/PROPOSALS/study-field-definition-initiative.md` carries 25 field entries,
4 named outcomes, and 4 handoffs. The vision above is the canonical anchor SFDI
walked against; the working doc carries the resulting per-field substance.

---

## The Pastoral Context card (interim)

Today's `SermonWorkspace.jsx` renders an always-on **Pastoral Context** card at the
top of the workspace content area, visible at every tab and every step. It is never
a gate — the pastor can proceed without filling it.

This card is the **anti-pattern the throughline replaces.** Its always-on placement
frames PC as parallel-track orientation ("fill PC, then study"), which contradicts
the design — text is driven toward PC, not the other way around. **As of 2026-05-04
the card's removal is actionable SPRD work** — SFDI Phase 4 Field 3 (Pastoral
Context) carries the PC substance per-sermon as one voice in the three-way
Implications conversation, making the workspace-top card structurally redundant.

**Order of removal** (cross-referenced from `docs/PROPOSALS/sfdi-charter.md` and
`docs/PROPOSALS/study-phase-redesign.md`):

1. **SFDI walks the four sub-phases, with anchors at Observe-end and Implications.** *Complete 2026-05-04.*
2. **Implications gets restructured per SFDI's discoveries.** SFDI Phase 4 defined
   the four-field shape (Theological Significance, Personal Implications, Pastoral
   Context, Implications Synthesis); SPRD ships the workspace UX restructure.
3. *Then* the card comes off the workspace shell, the AI prompts shed their PC
   handling (the heaviest is the MPS Draft prompt's PC-weighting passage in
   `StudyTab.jsx`), and Tier 7 is removed from the context pipeline. PC's
   substance flows downstream through the named outcomes.

**Open design question for the card-removal pass** (raised before SFDI walks; SFDI
Phase 4 partially settled by absorbing PC content into Field 3 but did not rule on
the underlying three-field schema): do the three PC fields (`topic_theme`,
`audience_assumptions`, `background_noise`) disappear entirely (PC's substance
lives only in SFDI Field 3 per-sermon), or do they persist somewhere off the
workspace front (perhaps series-level, since The Room and The Cultural Moment are
stable across multiple sermons in a series)? The Implications for Unbeliever
question was settled by Phase 4 (folded into Field 3 Q1 — the room includes
everyone); the three PC fields' fate is the remaining design call when SPRD
ships the card removal.

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
of the AI context pipeline. Tier 7 is removed when the card is removed (now
actionable SPRD work since SFDI Phase 4 walked 2026-05-04 — Field 3 Pastoral
Context carries the substance). See `docs/SYSTEMS/context-pipeline.md` for tier
budget and gating rules.

**Save path:** All three are in the `SERMON_COLUMNS` allowlist and save through:
`handleUpdate → debouncedSave → updateSermon IPC`

---

## Cross-System Dependencies

**If modifying Pastoral Context fields** (`topic_theme`, `audience_assumptions`, `background_noise`):
also check `docs/SYSTEMS/context-pipeline.md` — the `[THIS SERMON]` tier section documents the
always-on rule, content-gating logic, and 5000-char budget that govern how these fields reach the AI.
Note: the `[THIS SERMON]` tier is the interim mechanism; it is removed when SPRD ships the
card-removal pass (now actionable since SFDI's Phase 4 walked 2026-05-04 — Field 3 Pastoral Context
carries PC's substance, which flows through the Implications Synthesis named outcome).

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

**SFDI-aligned in code as of SPRD B1.0 (2026-05-04).** `OBSERVE_FIELDS` in
`src/utils/studyFields.js` is the SFDI 9-field shape: `background` → `context`
→ `surface_questions` → `divisions` → `characters` → `commands_declarations`
→ `big_ideas` → `obvious_point` → `applications`. Five fields carry multi-
question sequences: four text-prompt (B1.2) — Background `[author, date,
audience, genre]`; Context `[before, after, impact, holy_spirit_intent]`;
Surface Questions `[where, when, how]`; Possible Implications `[pressing,
hard_and_hopeful]` — plus Field 4 Divisions / Thought Units (B1.5) which
carries three structured-exercise questions: `sentence_layout` (kind=canvas)
+ `paraphrases` (kind=paraphrase) + `thought_units` (kind=synthesis-table).
SpotlightWorksheet's multi-question rendering dispatches on `question.kind`
to mount the matching A2.x primitive (`IndentedSentenceCanvas` /
`ParaphraseBlocks` / `SynthesisTable`); paraphrase + synthesis-table
questions read the sibling canvas value via the field's `kind:"canvas"`
question. Q1 carries a structured `referencePanel` (the SFDI three rules +
genre tips for epistles / narrative / poetry) that flanks the active
question via a 72/28 flex row. Field 4 Divisions / Thought Units and Field
9 Possible Implications are flagged heavy-lifting and open with
`FieldOverviewScreen` on first per-sermon entry (B1.3).

**Phase 2 SFDI-aligned in code as of SPRD B2.0–B2.2 (2026-05-04).** `INTERPRET_FIELDS`
in `src/utils/studyFields.js` is the SFDI 7-field shape: Deeper Context →
Recurring Ideas → Character Purpose → Contrasts → Cross-References →
Commentary Notes → Interpretation Synthesis. Three new keys: `deeper_context`
(refined from `context_impact`), `character_purpose` (refined from
`characters`), `interpretation_synthesis` (merged from `summarize_parts` +
`summarize_whole`). Five keys retire from rendering: `context_impact`,
`characters`, `diagram` (cross-phase to Observe Field 4 Q1 canvas which
absorbed the structural-diagram work), `summarize_parts`, `summarize_whole`.
Field 1 Deeper Context carries a 2-question sequence (B2.1): `[unresolved,
book_argument]`. Field 7 Interpretation Synthesis is heavy-lifting (B2.2):
opens with `FieldOverviewScreen` on first per-sermon entry; Q1
`meaning_per_unit` is a new `cumulative-synthesis-table` kind that reads /
writes the canonical thought-unit array in `observations.divisions.thought_units`
— Phase 1 owns the spine, all four phases read+write this one array, with
upstream columns rendered read-only and the writable `meaning` column owned
by Phase 2. SpotlightWorksheet gains `crossPhaseRead` / `crossPhaseWrite`
props plus a `crossPhaseSource` declaration on the question to plumb the
cross-column read/write. The Interpret → Redemptive Thread composite gate
in `evaluateAdvance` (`kind=sub_phase, fromIndex=2`) checks Field 7's
composite (every thought-unit row has `meaning`; `meaning_whole` non-empty)
and returns `{ gates, firstReason }` per B1.6's structured shape.

**Phase 3 SFDI-aligned in code as of SPRD B3.0–B3.2 (2026-05-04).**
`REDEMPTIVE_FIELDS` is the SFDI 5-field shape: This Passage and Christ →
How the Passage Points to Christ → How the Gospel Makes This Possible →
Our Need and God's Character → Christ-Connection Statement. Five new keys:
`this_passage_and_christ` (merged from `speaks_of_christ` + `relation_to_christ`,
folds in NT-use-of-OT), `passage_points_to_christ` (merged from `biblical_theme`
+ `promise` + restored Merida Q5 type + Q8 predictive), `gospel_makes_possible`
(restored Merida Q4, anti-moralism move — new in SermonForge), `need_and_character`
(merged from `need_for_christ` + `nature_of_god`), `christ_connection_statement`
(elevation of former `summary` slot + absorbed `jesus_hero`). Seven keys retire
from rendering: `speaks_of_christ`, `relation_to_christ`, `biblical_theme`,
`promise`, `need_for_christ`, `nature_of_god`, `jesus_hero`. Three multi-question
sequences (B3.1): This Passage and Christ `[position, direct_speech]`; How the
Passage Points to Christ `[biblical_theme, promise, type, predictive]`; Our Need
and God's Character `[human_need, god_character]`. Two heavy-lifting fields with
`FieldOverviewScreen`: Field 2 (How the Passage Points to Christ) frames the
four pointing-mechanisms and the anti-allegory discipline; Field 5
(Christ-Connection Statement) is heavy-lifting and load-bearing (B3.2). Field 5's
2-question sequence — `christ_per_unit` (cumulative-synthesis-table extending
the canonical thought-unit array with the writable `christ_connection` column
on top of Phase 1's three columns + Phase 2's `meaning` column rendered
read-only) + `statement` (text-prompt for the whole-passage Statement) — and
the Redemptive Thread → Implications composite gate (every thought-unit row
has `christ_connection` filled + `statement` non-empty) shipped in B3.2. The
legacy "Summary of Redemptive Features" Synthesize block in StudyTab was
removed in B3.2; `REDEMPTIVE_SUMMARY_KEY` is no longer written to from any UI
surface, but `flattenToText` continues to surface any legacy `summary` data
through the context pipeline (defensive read path).

**Phase 4 SFDI-aligned in code as of SPRD B4.0 + B4.1 (2026-05-04).** New
`IMPLICATIONS_FIELDS` array in `src/utils/studyFields.js` is the SFDI 4-field
shape: Theological Significance → Personal Implications → Pastoral Context →
Implications Synthesis. The three-way conversation is structural — three
voices (Theological / Personal / PC) get dedicated fields; Field 4 integrates
them as the named outcome. Multi-question sequences: Theological Significance
`[about_god, about_ourselves, about_christ, timeless, doctrines]`; Personal
Implications `[follow, forsake, receive, settle]` (4 verb-driven questions
absorbing Merida's 8); Pastoral Context `[room_specifics, cost_and_gift]`.
Field 4 (Implications Synthesis) is heavy-lifting with `FieldOverviewScreen`,
single-primary-question at B4.0 + B4.1 — its 2-question sequence
(`implication_per_unit` cumulative-synthesis-table adding the writable
`implication` column on top of Phase 1/2/3 columns + `synthesis` text-prompt)
plus Implications → MPT/MPS composite gate land in B4.2. Old keys retire
from rendering: 5 `IMPLICATIONS_THEOLOGICAL` (now Field 1 questions — Merida's
5 preserved), 8 `IMPLICATIONS_PERSONAL` (consolidated to Field 2's 4),
`IMPLICATIONS_UNBELIEVER_KEY` (folded into Field 3 Q1 — the room includes
everyone), `IMPLICATIONS_COMPILED_KEY` (retired AI synthesis; Field 4 carries
the synthesis in pastor's voice). `IMPLICATIONS_UNBELIEVER_KEY` and
`IMPLICATIONS_COMPILED_KEY` constants retained so `flattenToText` continues
to surface any legacy data through the context pipeline (defensive read
path). StudyTab Phase 4 block refactored: dual-`SpotlightWorksheet` (theological
+ personal groups) + Implications-for-Unbeliever textarea + Compiled-Implications
block + Compile-button + ProposalPanel collapsed into a single
`SpotlightWorksheet` over `IMPLICATIONS_FIELDS`. The Phase 4 Review-button
"filled" builder switched to `flattenToText` so multi-question content
surfaces — closes the B1.0-era `getPrimaryAnswer`-only bug for Phase 4 (the
same fix is a candidate small follow-on cut for Phases 1/2/3 Review buttons).

**Note:** the `applications` field (UI label: "Possible Implications" — renamed
from "Possible Applications" in the Vocabulary cleanup pass; the JSON key stays
`applications` to avoid a data migration) is where Pastoral Context first
surfaces in the awareness layer. The pastor begins to think pastorally without
yet leaving the text. See "The Study throughline" above.

#### Phase 2: Interpret → `sermons.interpretation` (JSON)
7 fields: `deeper_context`, `recurring_ideas`, `character_purpose`, `contrasts`,
`cross_refs`, `commentary`, `interpretation_synthesis` (SPRD B2.0). Old keys
`context_impact`, `characters`, `diagram`, `summarize_parts`, `summarize_whole`
no longer render but are preserved on read for any pre-existing JSON.

#### Phase 3: Redemptive Thread → `sermons.redemptive_thread` (JSON)
5 fields: `this_passage_and_christ`, `passage_points_to_christ`,
`gospel_makes_possible`, `need_and_character`, `christ_connection_statement`
(SPRD B3.0–B3.2). Old keys `speaks_of_christ`, `relation_to_christ`,
`biblical_theme`, `promise`, `need_for_christ`, `nature_of_god`, `jesus_hero`
no longer render but are preserved on read for any pre-existing JSON. The
legacy `summary` slot (`REDEMPTIVE_SUMMARY_KEY`) is no longer written to —
the synthesis work moved into Field 5 (Christ-Connection Statement) Q2
(`statement` text-prompt) in B3.2 — but `flattenToText` continues to
surface any legacy `summary` data through the context pipeline.

#### Phase 4: Implications → `sermons.implications` (JSON)

**Vision (per "The Study throughline" above):** Implications is a three-way
conversation between Theological Significance, Personal Implications, and
Pastoral Context — not three parallel groups of fields. PC is one of the three
voices, integrated, not orphaned to a top-of-workspace card. The named outcome
of Implications is the **Implications Synthesis** — the integrated form of that
conversation, which the pastor carries into MPT/MPS as the pastoral handoff.

**SFDI restructure complete (2026-05-04).** The three-way conversation is now
defined at the field level in `docs/PROPOSALS/study-field-definition-initiative.md`
Phase 4 — four fields (Theological Significance, Personal Implications, Pastoral
Context, Implications Synthesis) consolidating the previous 15 slots. The
Compiled-list AI synthesis is retired in the new shape (the Implications Synthesis
IS the synthesis, in the pastor's own voice). Implications for Unbeliever is
folded into Pastoral Context Q1 (the room includes everyone). The cumulative
thought-unit table extends to a 6th column (Implication) in Phase 4 Field 4 Q1.
**The pre-SFDI implementation persists in `src/utils/studyFields.js` until SPRD
Component 1 ships the workspace UX.**

**Today's fields (pre-SFDI implementation, still in code):**
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
