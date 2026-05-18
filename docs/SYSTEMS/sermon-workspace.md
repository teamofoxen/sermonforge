# SermonForge — Sermon Workspace

> Rewritten end-to-end post-sweep (2026-05-18) to describe the writing-surface
> + map + threshold-overlay + workspace-notebook-drawer architecture. The
> pre-sweep StudyTab / AssemblyTab / ManuscriptTab + trail + clearings +
> pause-clearings architecture is gone. This banner sits alongside the
> post-ARI and post-workspace-restructure banners below; together they
> record the doc's provenance across the three sweeps that produced the
> current shape.

> Rewritten post-ARI (2026-05-09). All AI surfaces are gone.
>
> **Post-workspace-restructure (2026-05-10):** Workspace collapsed from
> 4 stages (Study / Blueprint / Frame / Manuscript) to 3 (Study / Assembly /
> Manuscript). The within-Study Step layer retired. Study is now just
> Exegesis (4 sub-phases). Assembly hosts the former Step 2/3/4 work plus
> the former Frame stage's Intro/Conclusion, as four sub-phases: Anchor
> (MPT/MPS), Outline, Equip (FE), Frame. Sections below referring to
> "Step 2/3/4 / Blueprint / Frame stage" pre-rewrite map onto Assembly's
> sub-phases — field content unchanged, named outcomes preserved. See
> [`docs/PROPOSALS/workspace-restructure-charter.md`](../PROPOSALS/workspace-restructure-charter.md).

> **Components.** [`SermonWorkspace.jsx`](../../src/components/SermonWorkspace.jsx)
> is the workspace mount: it loads the sermon record, derives position from
> `last_touched_position`, derives threshold-flag state from `thresholds_seen`,
> and composes the writing surface (with the notebook drawer + threshold
> overlays + passage popup mounted alongside). Stage tabs are gone — the
> back-to-dashboard button is the only top-bar navigation. The pastor reaches
> each field through the writing-surface chevron or the summoned map.

---

## The Study throughline

The four Study sub-phases — Observe, Interpret, Redemptive Thread, Implications — compose
a single deepening exegetical arc: text says → text means → text points to Christ →
text lands on this congregation. Pastoral Context (PC) enters the arc progressively;
the text drives the sermon toward PC, not the other way around.

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
> between Theological Significance, Personal Application and PC.

**Two field-level commitments flow from this articulation:**

1. **Observe ends with the field that first surfaces PC into the awareness layer.**
   Named "Possible Implications" (renamed from "Possible Applications" in the
   Vocabulary cleanup pass), this field is where the pastor begins to think
   pastorally without yet leaving the text.
2. **Implications is a three-way conversation between Theological Significance,
   Personal Implications, and PC.** The named outcome — the **Implications Synthesis**
   — is the integrated form of that conversation.

---

## Pastoral Context — Phase 4 Field 3

The always-on Pastoral Context card at the top of `SermonWorkspace.jsx` was
**removed in SPRD B4.2 (2026-05-04)**. PC now lives in Phase 4 Field 3 of Study
(Implications) as one voice in the three-way conversation, with two questions:

| Question | Question key | Stored at |
|----------|--------------|-----------|
| The Room | `room_specifics` | `implications.pastoral_context.room_specifics.value` |
| The Cost and Gift | `cost_and_gift` | `implications.pastoral_context.cost_and_gift.value` |

The three legacy schema columns (`topic_theme`, `audience_assumptions`,
`background_noise`) were retired in the trail deletion sweep (Phase B1).

---

## The writing surface

Component: [`src/components/SermonWritingSurface.jsx`](../../src/components/SermonWritingSurface.jsx).

The writing surface is the field-walking surface — one question at a time, with
the passage on one side and the pastor's writing on the other. The field
sequence is the canonical `WALK_ORDER` exported from
[`src/utils/walkOrder.js`](../../src/utils/walkOrder.js); the chevron-next
button advances by `nextField()`. The field-level editors (unified canvas,
synthesis tables) mount inside the surface unchanged from pre-rebuild — the
data shapes they read/write are documented per stage below.

Chrome:

- **Passage column** (left) — consumes the canonical `useEsvPassage` hook (one
  ESV fetch path, shared with PassagePopup). Collapsible to a `‹` button.
- **Prompts + answers** (right) — every question in the current field rendered
  stacked; each carries an N/A toggle per the per-question N/A flag in the
  envelope shape.
- **Chrome buttons** (bottom) — notebook summon (a quiet mono text link near
  the save indicator, per the D2d option-i ruling), the chevron-next
  (`.sws-forward`), and the map summon (`.sws-map-summon`).
- **Save indicator** — string from `SermonWorkspace`'s saveState.

**`beforePositionChange` flush-await chain.** Every position-change trigger
— chevron-next, map-jump, unmet-state door, handoff jump, "go write it" —
awaits `beforePositionChange` (which flushes the renderer's pending debounced
save via `persistUpdate`) before the position settles. Draft is on disk
before the surface re-renders.

**Gap-position fallback.** When the position's stage/sub-phase has no field
def in `walkOrder.js` (the OEM gap for Assembly/Outline + Assembly/Equip +
Manuscript — see [Stage data sections](#study-stage-data) below), the surface
returns a self-contained `.sws-shell` div with the text "No field found for
X · Y · Z." Workspace-level Back-to-dashboard chrome still functions; the
within-surface chrome (chevron, map button, notebook button) is not rendered
in this fallback. Soft "not built yet" state, not a crash.

---

## The map

Component: [`src/components/SermonMap.jsx`](../../src/components/SermonMap.jsx).

Summoned via the writing-surface chrome's `.sws-map-summon` button. Renders a
vertical list of every question in `QUESTION_WALK_ORDER` (derived from
`WALK_ORDER`), grouped by region in walk order: Observe → Interpret →
Redemptive Thread → Implications → Anchor → Frame → (Outline + Equip +
Manuscript join here when their field defs are extracted — see OEM gap below).

Per-question state by visual weight:

- **Answered** — full weight; preview of the pastor's answer rendered.
- **Partial** — present but lighter; for cumulative-synthesis-table questions,
  fires when some thought-unit rows have the cumulative column filled and
  others don't.
- **Unanswered** — faint; the question text shows but no preview.
- **Current** — strongest mark; the eye lands here when the map opens.

State derivation runs through `deriveQuestionStatesFromSermon` in
[`src/utils/sermonState.js`](../../src/utils/sermonState.js) — per-question-kind
dispatch (text-prompt → `hasContent` against the answer envelope; cumulative-
synthesis-table → derive against the cross-phase thought-unit array;
indented-canvas → derive against the canvas's depth-0 rows).

Jump behavior: click any question → direct position write (via
`writePositionAndThresholds`) → map closes → writing surface re-renders at
the target. The map jump goes through the `beforePositionChange` flush chain
so any pending edit is on disk first. The full arc is visible from day one —
Manuscript's faint entries show while the preacher is still in Observe.

---

## Threshold orientation

Two threshold overlays mount on top of the writing surface, governed by the
`thresholds_seen` JSON array column.

**Sermon-start landing** — Component:
[`SermonStartLanding.jsx`](../../src/components/SermonStartLanding.jsx).
Renders the `.ssl-overlay`. Fires when `last_touched_position` is NULL and
the `THRESHOLD_ID.SermonStart` id is not in the sermon's `thresholds_seen`.
Shows the shape of the whole arc (Study sub-phases + Assembly sub-phases +
named outcomes); pastor dismisses with Close, which writes the id into
`thresholds_seen`.

**Study → Anchor handoff** — Component:
[`StudyAnchorHandoff.jsx`](../../src/components/StudyAnchorHandoff.jsx).
Renders the `.sah-overlay`. Fires when the position lands in
Assembly/Anchor's first field, sermon-start has been dismissed, and the
`THRESHOLD_ID.StudyToAnchorHandoff` id is not in `thresholds_seen`. Reads
back the four Study named outcomes (Observation Set, Interpretation Set,
Christ-Connection Statement, Implications Synthesis) and actively surfaces
any missing required outcome in prose with an inline "go write it" door per
the door pattern. Dismissal writes the id into `thresholds_seen`.

Both overlays read from and write to the same `thresholds_seen` array — one
canonical mechanism for "has this threshold been dismissed" per the spec's
hard commitment. Stable threshold ids live in `THRESHOLD_ID` in
`sermonState.js`.

Within-stage step movement (chevron-next, map-jump) is silent per CORE
[Process Contract #3](../CORE.md) ("movement is visible at thresholds, not
narrated continuously"). The meta-test in
`tests/contracts/process-3-movement-visible.test.tsx` is the no-narration
tripwire — no component under `src/components/` may carry
`data-testid="movement-event"`.

---

## The notebook drawer

Component:
[`src/components/WorkspaceNotebookDrawer.jsx`](../../src/components/WorkspaceNotebookDrawer.jsx).

Workspace-level overlay (mounted in `SermonWorkspace.jsx`, not inside the
writing surface). Summoned via the quiet mono text link in the writing-surface
chrome near the save indicator (option i per the D2d ruling — chosen because
option ii would add a second floating control competing with the map button,
and option iii would hide the affordance and fail the return-after-break test).

Column-by-stage dispatch via `NOTEBOOK_COLUMN_BY_STAGE` in `SermonWorkspace.jsx`:

| Stage | Column |
|---|---|
| Study | `notebook_study` |
| Assembly | `notebook_blueprint` |
| Manuscript | `notebook_manuscript` |

The Assembly column name `notebook_blueprint` is preserved from the
pre-restructure schema (when Blueprint was a separate stage). This is
intentional, not a drift; do not "fix" the inconsistency.

---

## Position state

Two v23 schema columns (added in Phase D1 of the trail deletion sweep) drive
session re-entry and threshold dismissal:

- **`last_touched_position`** — TEXT. Slash-composite `Stage/SubPhase/FieldKey`
  written by the writing surface on every position-change event. NULL on a
  brand-new sermon (which fires sermon-start). Non-NULL = land on that field.
- **`thresholds_seen`** — TEXT, JSON array. List of dismissed threshold ids.
  Defaults to `[]` when NULL.

Both columns sit in `SERMON_COLUMNS` but **not** in `SPINE_ONLY_COLUMNS` —
the renderer writes them through `persistUpdate`, not through
`transitionState`.

State derivations live in
[`src/utils/sermonState.js`](../../src/utils/sermonState.js):

- `deriveCurrentPositionFromSermon(sermon)` → `{stage, subPhase, fieldKey}`.
  Falls back to the first walk field when `last_touched_position` is NULL.
- `deriveQuestionStatesFromSermon(sermon)` → `{[questionId]: {state, preview?,
  fullValue?}}`. Powers the map's weighting.
- `deriveStudyOutcomesFromSermon(sermon)` → ordered list of the four Study
  named outcomes with their current text. Powers the Study → Anchor handoff's
  outcomes section.
- `deriveStudyUnfinishedFromSermon(sermon)` → Study questions that aren't
  required outcomes and aren't yet complete. Powers the handoff's "left
  behind" surface.
- `STAGE_SUBPHASE_TO_COLUMN` — the canonical stage+sub-phase → JSON column
  map. Single source of truth for which column a position's field data lives
  in.
- `serializePosition(position)` — single serialization point for
  `last_touched_position` writes.
- `parseThresholdsSeen` / `hasSeenThreshold` / `nextThresholdsSeen` — read +
  write helpers for the `thresholds_seen` JSON array.

---

## The completeness contract

Per CORE [Process Contract #2](../CORE.md) (rearticulated 2026-05-18 in
Phase G): a sermon is complete when its load-bearing artifacts exist. The
foundation is the eight composite gate functions in
[`src/utils/studyAdvancement.js`](../../src/utils/studyAdvancement.js), one
per load-bearing field:

| Composite | Load-bearing field |
|---|---|
| `checkField3Composite` *(exported as the public completeness API)* | Observe Field 3 — Divisions / Thought Units |
| `checkField8Composite` | Interpret Field 8 — Interpretation Synthesis |
| `checkField5Composite` | Redemptive Thread Field 5 — Christ-Connection Statement |
| `checkPhase4Field4Composite` | Implications Field 4 — Implications Synthesis |
| `checkMPTComposite` | Assembly/Anchor — MPT (Main Point Pair part 1) |
| `checkMPSComposite` | Assembly/Anchor — MPS (Main Point Pair part 2) |
| `checkIntroComposite` | Assembly/Frame — Sermon Frame Intro |
| `checkConclusionComposite` | Assembly/Frame — Sermon Frame Conclusion |

**8 composites, matching the count Phase F kept** when the wall layer was
deleted. If this count ever fails to reconcile against the live
`studyAdvancement.js` file, either this table or F's record is wrong and the
inconsistency must be surfaced, not silently absorbed.

The composites are currently **uncalled outside this file**. The map-weight
derivation in `sermonState.js` is the partial surface today (it powers the
Study → Anchor handoff's outcomes section). The workspace-wide "is the
sermon done" answer that would consume the composites directly is the
in-progress completeness-surfacing work named at CORE Process Contract #2's
deferred-enforcement entry in [ENFORCEMENT_STATUS.md](../ENFORCEMENT_STATUS.md).
The contract is real and its foundation is in place; the full visible
surface is opportunistic future work.

The advancement gates that used to fire at sub-phase boundaries (the seven
`check*Threshold` wrappers in `studyAdvancement.js`) were deleted in Phase F
of the trail deletion sweep. Phases that had a load-bearing-field composite
kept their check intact (Interpret Field 8, Redemptive Thread Field 5,
Implications Field 4, Anchor MPT + MPS, Frame Intro + Conclusion). Boundaries
that relied on inline checks died entirely (Observe Field 7 Obvious Point,
Observe Field 8 Possible Implications, Outline → Equip outline-points-present,
Equip → Frame empty-evidence baseline). Per-stage detail below.

---

## Study stage data

### Step layer retired (Workspace Restructure 2026-05-10)

The pre-restructure "Step 1 / Step 2 / Step 3 / Step 4" layer inside Study is
gone. Steps 2-5 became sub-phases inside Assembly (Anchor / Outline / Equip /
Frame). The `current_step` column was retired in the trail deletion sweep
(Phase B2). Study's only sub-phase walk is the four Exegesis sub-phases below.

### Phase 1: Observe → `sermons.observations` (JSON)

`OBSERVE_FIELDS` in [`src/utils/studyFields.js`](../../src/utils/studyFields.js)
— 8-field shape: `context` → `surface_questions` → `divisions` → `characters`
→ `commands_declarations` → `big_ideas` → `obvious_point` → `applications`.

- **Field 3 (Divisions / Thought Units)** — `unified-canvas` kind; the
  [`IndentedSentenceCanvas`](../../src/components/IndentedSentenceCanvas.jsx)
  component mounts inside the writing surface. Canvas rows produce the
  canonical `thought_units` array via `deriveThoughtUnitsFromCanvas` on every
  save (depth-0 rows are the thought units per era-2-primacy ruling 8).
  Phases 2/3/4 all read from this array.
- **Field 8 (Possible Implications)** — first PC awareness-layer surface
  (two questions: `pressing`, `hard_and_hopeful`).
- **Completeness foundation:** `checkField3Composite` for Field 3 — exported
  as the public completeness API for Divisions / Thought Units. The
  advancement-gate checks for Field 7 (Obvious Point) and Field 8 (both
  questions non-empty-or-N/A) were inline in the deleted
  `checkObserveToInterpretThreshold` wrapper and were removed entirely in
  Phase F — no completeness composite survives for these fields.

### Phase 2: Interpret → `sermons.interpretation` (JSON)

`INTERPRET_FIELDS` — 8-field shape: `deeper_context` → `genre` →
`recurring_ideas` → `character_purpose` → `contrasts` → `cross_refs` →
`commentary` → `interpretation_synthesis`.

- **Field 8 (Interpretation Synthesis)** — heavy-lifting, load-bearing. Q1
  (`meaning_per_unit`) is a `cumulative-synthesis-table` extending the
  canonical thought-unit array with a writable `meaning` column. Q2
  (`meaning_whole`) is the whole-passage Interpretation Set (text-prompt).
- **Completeness foundation:** `checkField8Composite` (every thought-unit
  row carries a non-empty `meaning`, and
  `interpretation_synthesis.meaning_whole` is non-empty). The advancement
  gate that used to fire at the Interpret → Redemptive Thread boundary (the
  deleted `checkInterpretToRedemptiveThreshold` wrapper) was removed in
  Phase F; the composite it called survived.

### Phase 3: Redemptive Thread → `sermons.redemptive_thread` (JSON)

`REDEMPTIVE_FIELDS` — 5-field shape: `this_passage_and_christ` →
`passage_points_to_christ` → `gospel_makes_possible` → `need_and_character`
→ `christ_connection_statement`.

- **Field 5 (Christ-Connection Statement)** — heavy-lifting, load-bearing.
  Q1 (`christ_per_unit`) extends the thought-unit array with a
  `christ_connection` column. Q2 (`statement`) is the whole-passage
  Statement.
- **Completeness foundation:** `checkField5Composite` (every row has
  `christ_connection`, `statement` is non-empty). The advancement gate at
  the Redemptive Thread → Implications boundary (the deleted
  `checkRedemptiveToImplicationsThreshold` wrapper) was removed in Phase F;
  the composite it called survived.

### Phase 4: Implications → `sermons.implications` (JSON)

`IMPLICATIONS_FIELDS` — 4-field shape: `theological_significance` →
`personal_implications` → `pastoral_context` → `implications_synthesis`.

- **Field 4 (Implications Synthesis)** — heavy-lifting, load-bearing. Q1
  (`implication_per_unit`) extends the thought-unit array with the final
  `implication` column. Q2 (`synthesis`) is the whole-passage Implications
  Synthesis.
- **Completeness foundation:** `checkPhase4Field4Composite` (every row has
  `implication`, `synthesis` is non-empty). The advancement gate at the
  Implications → Anchor stage boundary (formerly Implications → Step 2 /
  MPT-MPS) — the deleted `checkImplicationsToMPTMPSThreshold` wrapper — was
  removed in Phase F; the composite it called survived. The Study → Anchor
  threshold overlay (`.sah-overlay`) surfaces the completeness state of the
  four Study named outcomes at this crossing.

---

## Assembly stage data

### Anchor (MPT + MPS) → `sermons.main_point_pair` (JSON v19 envelope)

`MAIN_POINT_PAIR_FIELDS` in
[`src/utils/sadiAnchorFields.js`](../../src/utils/sadiAnchorFields.js) — SADI
Step 2. Two fields:

- **MPT** — 2 questions (`draft`, `tighten`), both non-empty, no N/A
- **MPS** — 3 questions (`translate`, `gospel_check`, `tighten`). Q1 + Q3
  non-empty, no N/A; Q2 non-empty or explicit N/A per the SADI "satisfied
  another way" carve-out for upstream-resolved moralism checks.

Named outcome: Main Point Pair. Flat `mpt` + `mps` columns auto-sync from
the v19 envelope's tighten answers; downstream readers keep using the flat
columns.

**Completeness foundations:** `checkMPTComposite` + `checkMPSComposite`.
The advancement gate at the Anchor → Outline boundary (the deleted
`checkStep2ToOutlineThreshold` wrapper) called both composites; both
survived Phase F.

### Outline → `sermons.outline` (JSON)

- **Currently has no field-def in `walkOrder.js`** (OEM gap, Path A — see
  [`memory/project_oem_field_defs.md`](../../../../Users/rossa/.claude/projects/C--Projects-SermonForge/memory/project_oem_field_defs.md)
  and the sweep-close inventory in the
  [invisible-system build spec](../PROPOSALS/invisible-system-build-spec.md)).
  Position landing in Assembly/Outline renders the writing surface's "No
  field found" fallback.
- The outline data column still holds the array of points the future
  field-def extraction will read. `createOutlinePoint(text)` in
  [`src/utils.js`](../../src/utils.js) is the canonical point-creator — the
  stable UUID it stamps is the key `functional_elements` depends on.
- **No completeness composite survives this boundary.** The Outline → Equip
  advancement gate's "every outline point has non-empty text" check was
  inline in the deleted `checkOutlineToEquipThreshold` wrapper and was
  removed entirely in Phase F. If the future field-def extraction needs an
  "all outline points named" completeness check, it adds one then; the spec
  does not assume one inherited from F.

### Equip → `sermons.functional_elements` (JSON)

- **Currently has no field-def in `walkOrder.js`** (OEM gap, Path A).
  Position landing in Assembly/Equip renders "No field found".
- The `functional_elements` data column still holds the per-point Scripture
  / Explanation / Application / Illustration content the future field-def
  extraction will read.
- **No completeness composite survives this boundary.** The Equip → Frame
  transition never had more than an empty-evidence baseline pre-F; nothing
  survives.

### Frame (Intro + Conclusion) → `sermons.sermon_frame` (JSON v18 envelope)

`SERMON_FRAME_FIELDS` in
[`src/utils/sermonFrameFields.js`](../../src/utils/sermonFrameFields.js) —
SADI Step 5. Two fields:

- **Intro** — 4 questions (`hook`, `bridge_to_text`, `expectations`,
  `redemptive_note`). Q1-Q3 non-empty, no N/A. Q4 non-empty or explicit N/A
  per the SADI carve-out for cases where the hook itself was redemptive.
- **Conclusion** — 4 questions (`summate`, `land_call`, `gospel_empower`,
  `closing_posture`). All non-empty, no N/A per the SADI no-carve-out
  ruling — `closing_posture` in particular forces an explicit pastoral
  choice.

Named outcome: Sermon Frame.

**Completeness foundations:** `checkIntroComposite` + `checkConclusionComposite`.
The advancement gate at the Frame → Manuscript boundary (the deleted
`checkSermonFrameToManuscriptThreshold` wrapper) called both composites;
both survived Phase F.

---

## Manuscript stage data

- **Currently has no field-def in `walkOrder.js`** (OEM gap, Path A).
  Position landing in Manuscript renders "No field found". The data column
  (`sermons.manuscript`, JSON) historically held Introduction + per-point
  Transitions + Conclusion as free-form textareas — that shape is the
  future field-def extraction's target.
- **Export to Word** — dispatches `sermon-export-manuscript` IPC. Main
  builds a `.docx` to `Documents/SermonForge/exports/Manuscripts/` and opens
  it. Still wired; Manuscript is the terminal prep stage; no Delivery tab.
- The Manuscript stage never had an advancement gate pre-F.

---

## PassagePopup (Show Text)

Component: [`src/components/PassagePopup.jsx`](../../src/components/PassagePopup.jsx).

The wider passage popout (vs the writing-surface's inline passage column).
Triggered by Show Text from the writing-surface chrome.

- Rendered via React portal to `document.body`
- Fetches via the canonical `useEsvPassage` hook in
  [`src/utils/useEsvPassage.js`](../../src/utils/useEsvPassage.js) — D2b
  extracted this as the single ESV fetch path; consumed by both PassagePopup
  AND the writing surface's passage column (no second fetch path)
- ESV API key never reaches the renderer; fetch goes through main via
  `"passage-fetch"` IPC
- Draggable by header bar; resizable from bottom-right corner
- Results cached in-memory per session

---

## Save flow

**User-edit save path:**

1. Pastor edits a field in the writing surface.
2. `onUpdate(fields)` → `SermonWorkspace.handleUpdate()`.
3. `setSermon()` merges into local state (optimistic update).
4. `sermonRef.current` updated.
5. `debouncedSave()` scheduled (800ms debounce).
6. On fire: `persistUpdate()` reads `sermonRef.current` (full current state).
7. `updateSermon(id, fields)` IPC → `electron/main.js` `apply-mutation`
   handler.
8. `buildUpdate()` validates against the `SERMON_COLUMNS` allowlist.
9. SQL UPDATE runs; `saveDb()` schedules disk write (500ms debounce).

**Position-write side path (D2c):**

- `beforePositionChange()` flushes the renderer's pending debounced save
  before any new position settles. Wired at every position-change trigger:
  chevron-next, map-jump, unmet-state door, handoff jump, "go write it" on
  missing required outcomes.
- `writePositionAndThresholds(position, extraFields?)` writes
  `last_touched_position` (and optionally `thresholds_seen` on threshold
  dismissal) via `persistUpdate`. Draft is on disk before the surface
  re-renders.
- Graceful close (Cmd-Q / Alt-F4 / menu Quit / taskbar) flushes via the
  `before-quit` handler in `electron/main.js`. Crash/kill leaves a ~1.3s
  window of pre-flush typing lost — documented as accepted risk in
  `electron/main.js`.

---

## Cross-system notes

- **Adding columns to `sermons`** requires updating `SERMON_COLUMNS` in
  *both* [`electron/contracts.cjs`](../../electron/contracts.cjs) and
  [`src/core/contracts.ts`](../../src/core/contracts.ts) — the two allowlists
  mirror each other (37 entries each post-G). `buildUpdate()` throws in dev
  if you miss this, but only if you exercise the save path. The
  `assertSchemaContract()` startup check validates the live DB against the
  allowlist.
- **Field-level editors** (`IndentedSentenceCanvas`, `SynthesisTable`) mount
  inside the writing surface unchanged from pre-rebuild; the data shapes
  they read/write are documented above per stage.
- **`FeedbackFlag` is dormant post-sweep.** The component at
  [`src/components/FeedbackFlag.jsx`](../../src/components/FeedbackFlag.jsx)
  is BTI Phase 1 infrastructure (the Tier 1 in-app flag affordance). Its
  pre-sweep mount points (StudyTab + ManuscriptTab + AIPanel + ProposalPanel
  + SeriesPlanner + DeliveryTab + OutlineTab) were all on surfaces deleted
  across ARI, Workspace Restructure, and the trail deletion sweep — leaving
  the component with no current mount. Re-wiring is BTI Phase 2+ work, not
  trail-sweep work; the component is kept (BTI owns the re-mount, not the
  delete decision). See `memory/project_bti_state.md` for the BTI app-
  readiness audit follow-up.

---

## Related docs

- [`docs/PROPOSALS/invisible-system-build-spec.md`](../PROPOSALS/invisible-system-build-spec.md)
  — the build spec for the writing-surface architecture; sweep-close
  inventory of remaining open work.
- [`docs/CORE.md`](../CORE.md) — Process Contracts #1 (monotonic in
  expectation, not enforcement), #2 (completeness contract), #3 (visible at
  thresholds, not narrated continuously).
- [`docs/ENFORCEMENT_STATUS.md`](../ENFORCEMENT_STATUS.md) — clause-by-clause
  enforcement status; the deferred-enforcement entry for Process Contract #2
  names the completeness-surfacing work.
- [`docs/PROPOSALS/workspace-restructure-charter.md`](../PROPOSALS/workspace-restructure-charter.md)
  — the 4-stage → 3-stage collapse + Step layer retirement.
- [`docs/PROPOSALS/era-2-primacy-initiative.md`](../PROPOSALS/era-2-primacy-initiative.md)
  — ruling 6 (`takeoverWhenActive` retired, rail-visible default) and ruling
  8 (Field 3 unified-canvas rework, depth-only structural layout, paraphrase
  + thought_unit_end markers retired).
