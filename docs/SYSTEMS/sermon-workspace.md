# SermonForge — Sermon Workspace

> **This doc is the *how & where*** — the mechanics that render the sermon walk:
> components, JSON columns, derivations, the save flow. The walk's *what & why* —
> every question, named outcome, the completeness policy, Merida fidelity — lives in
> [`docs/WORKSPACE-CANON.md`](../WORKSPACE-CANON.md); this doc points there and does not
> restate it. The law (the four contracts) lives in [`docs/CORE.md`](../CORE.md).
> (Thinned to this boundary 2026-06-15 in the Workspace Re-Foundation Initiative,
> Phase 1 step 4; the walk content this doc used to carry migrated to the canon.)
>
> **Changing what the pastor sees or reads, or adding/removing a question?** Also load
> [`docs/PASTORS-CHARTER.md`](../PASTORS-CHARTER.md) — explanatory lens, not law; the CORE governs.

> Rewritten end-to-end post-sweep (2026-05-18) to describe the writing-surface
> + map + threshold-overlay + workspace-notebook-drawer architecture. The
> pre-sweep StudyTab / AssemblyTab / ManuscriptTab + trail + clearings +
> pause-clearings architecture is gone. This banner sits alongside the
> post-ARI and post-workspace-restructure banners below; together they
> record the doc's provenance across the three sweeps that produced the
> current shape.

> **OEM restructure (2026-07-02) — the decide/write boundary.** Equip moved
> from Assembly into Manuscript as the **Body** sub-phase; the **Frame**
> sub-phase collapsed into the Manuscript door fields (its seven moves
> transplanted — each door prompt now asks the decision AND the preached words
> together). Assembly = Anchor, Outline (decide); Manuscript = Body, then
> Intro/Transitions/Conclusion (write). Schema v33 rewrites legacy positions;
> the `sermon_frame` column persists as legacy data (existing sermons' frame
> answers stay on disk and searchable, but the walk no longer renders them —
> pastor-ruled 2026-07-02). Rulings of record:
> [`oem-walk-rulings-2026-07-01.md`](../handoff/oem-walk-rulings-2026-07-01.md);
> the walk's what & why is [`WORKSPACE-CANON.md`](../WORKSPACE-CANON.md).

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
> **Superseded 2026-07-02 by the OEM restructure above:** Assembly now
> holds only two sub-phases, Anchor and Outline. Equip moved to Manuscript
> as Body; Frame collapsed into the Manuscript doors. The four-sub-phase
> shape described in this note is historical.

> **Components.** [`SermonWorkspace.jsx`](../../src/components/SermonWorkspace.jsx)
> is the workspace mount and **coordinator shell**: it loads the sermon record,
> derives position from `last_touched_position`, derives threshold-flag state
> from `thresholds_seen`, and composes the writing surface (with the notebook
> drawer + threshold overlays + passage popup mounted alongside). Stage tabs are
> gone — the back-to-dashboard button is the only top-bar navigation. The pastor
> reaches each field through the writing-surface chevron or the summoned map.
>
> **Post-Track-D architecture (2026-07-03).** The shell is a thin coordinator
> composing four focused hooks (in `src/utils/`); named functions throughout this
> doc live in these hooks now, and the shell consumes them under the same names:
> - **`useWorkspaceSave`** — the save spine: `saveState`, `handleUpdate`,
>   `persistUpdate`, the 800 ms `debouncedSave`, and the close/quit/unmount flush.
> - **`useWorkspaceCompletion`** — the walk-spanning derivations: `questionStates`,
>   `studyOutcomes`, `studyUnfinished`, `completeness` (gated on `finishOpen`).
> - **`useWorkspaceMutations`** — the field-write handlers (`handleAnswerChange`
>   and the cumulative-table / canvas / outline / functional-element / manuscript
>   / title / tag / mark-preached writes), carrying the N/A guards and the
>   `sermonRef.current` merge base.
> - **`useWorkspaceNavigation`** — movement + movement-writes:
>   `writePositionAndThresholds` (the `last_touched_position` write + the
>   teaching-seen fold), `beforePositionChange`, the six jump handlers,
>   `dismissThreshold`, and the reread / return / jump-highlight state.
>
> **Stays in the shell by design:** the load lifecycle, the reference-pane
> substrate derivation, the pure threshold-**visibility** reads (`position`,
> `showSermonStart`, `showHandoff`, `teachingId`, `teachingAutoOpen`), export,
> delete, the notebook cluster, and overlay rendering. A thinner coordinator, not
> an empty component.

---

## The Study throughline

The four Study sub-phases — Observe, Interpret, Redemptive Thread, Implications — compose
a single deepening exegetical arc (text says → means → points to Christ → lands on the
room). Pastoral Context enters at **Implications**, after the text has been heard. **The arc's content — what each
sub-phase asks, its named outcome, and the marinate / return-to-the-text beat — lives in
[WORKSPACE-CANON §2](../WORKSPACE-CANON.md). The law behind it is CORE
[Process #6](../CORE.md) (the throughline holds and produces named outcomes) plus its
saturation amendment (the text stays present; a re-read beat sits at the Study → Anchor
seam).** What this doc carries is the *mechanics* of that arc: where Pastoral Context
surfaces (below), and how the re-read beat is rendered — the [passage column / reference
pane](#the-writing-surface) default and the [Study → Anchor handoff](#threshold-orientation)
overlay.

Pastoral Context is the one piece of the arc's *why* that lives here rather than in canon:
CORE [Process #4](../CORE.md) makes "PC is driven by the text" the law and points to this
doc for the mechanics. The product owner's original articulation below described a
*progressive* PC entry — PC surfacing first in Observe (a "Possible Implications" field) and
marinating through the middle sub-phases. **That Observe surface was removed 2026-06-15
(Phase-2 Merida surgery), so PC now enters only at Implications.** The articulation is
**retained verbatim as historical design rationale** — it still captures the load-bearing
intent (the text drives toward PC, never the reverse), though the per-phase surfaces it names
have changed:

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

1. *(Removed 2026-06-15, Phase 2.)* Observe used to end with a field that first surfaced PC
   into the awareness layer — "Possible Implications." That field was cut as a SermonForge
   addition; Observe is now pure text-observation, and PC no longer surfaces there.
2. **Implications is a three-way conversation between Theological Significance,
   Personal Implications, and PC.** The named outcome — the **Implications Synthesis**
   — is the integrated form of that conversation.

---

## Pastoral Context — Phase 4 Field 3

This is the spec CORE [Process #4](../CORE.md) and the CORE Canonical-Vocabulary PC
entry point to. **PC surfaces as a field at exactly one point in Study — Implications
Field 3.** The text is heard first across Observe, Interpret, and Redemptive Thread; PC
enters only once that understanding is built. *(Before 2026-06-15 there was an earlier
surface — the Observe "Possible Implications" field — removed in the Phase-2 Merida surgery.)*

**Implications Field 3 — Pastoral Context** (`pastoral_context`): PC enters as one
voice in the three-way conversation, two questions. The field now carries an
`overview` (R8, 2026-07-02) — first-visit teaching that absorbed the example
freight previously loaded into the prompt text, rendered by `FieldTeaching`
same as any other field's overview.

| Question | Question key | Stored at |
|----------|--------------|-----------|
| The Room | `room_specifics` | `implications.pastoral_context.room_specifics.value` |
| The Cost and Gift | `cost_and_gift` | `implications.pastoral_context.cost_and_gift.value` |

The always-on Pastoral Context card that used to sit atop `SermonWorkspace.jsx` was
**removed in SPRD B4.2 (2026-05-04)**. The three legacy schema columns (`topic_theme`,
`audience_assumptions`, `background_noise`) were **removed** in the trail deletion sweep
(Phase B1): `SERMON_COLUMNS` no longer admits them and nothing reads or writes them
(zero readers, zero writers — see [`electron/contracts.cjs`](../../electron/contracts.cjs)).
PC content lives entirely in `implications.pastoral_context`.

---

## The writing surface

Component: [`src/components/SermonWritingSurface.jsx`](../../src/components/SermonWritingSurface.jsx).

The writing surface is the field-walking surface — one field at a time, with
the passage on one side and the pastor's writing on the other. The field
sequence is the canonical `WALK_ORDER` exported from
[`src/utils/walkOrder.js`](../../src/utils/walkOrder.js); the chevron-next
button advances by `nextField()`. The field-level editors (the indented-sentence
canvas, the synthesis tables) mount inside the surface unchanged from pre-rebuild —
the data shapes they read/write are documented per stage below. *What* each field
asks and *why* is in [WORKSPACE-CANON §2–4](../WORKSPACE-CANON.md); this section is the
rendering mechanism.

Chrome:

- **Reference pane** (left) — [`ReferencePane.jsx`](../../src/components/ReferencePane.jsx).
  Defaults to the ESV **passage** in every region (consuming the canonical
  `useEsvPassage` hook, one fetch path shared with PassagePopup); collapsible to
  an "Open Bible" button. A **"Your work"** tab is one flip away, whose contents
  are the per-region substrate the current work builds against — the ratified
  table in the component header. Post-OEM (2026-07-02) the writing regions carry:
  **Body** → MPT + MPS + Sermon Outline + **Pastoral Context** (the named room)
  + **CCS** (the moralism guard the Application prompt invokes); **doors** →
  MPT + MPS + the **assembled body** (`BodyRefItem` — each point with its prose,
  the way the export reads) + Pastoral Context + CCS. These passengers are ruled
  by OEM items 1–2 ("no coordinates the screen doesn't show"): the Body/doors
  prompts point the pastor at his room and his Statement, so the pane must show
  them. `SermonWorkspace` derives PC from `implications.pastoral_context` and
  threads it + `functionalElements` into the pane.
- **Prompts + answers** (right) — every question in the current field rendered
  stacked; the N/A toggle renders only on questions whose field def declares
  `naAllowed: true`. On the envelope columns that is `mps.gospel_check`
  (`PromptBlock` shows the toggle when `naAllowed || na`, the `na`-only branch
  existing solely so a legacy flag on a non-allowlisted question can be
  undone). The gating flag lives in the field defs, not the envelope shape —
  the envelope carries only the per-answer `na` state. Enforcement is
  three-deep: field-def flag, surface toggle, and a write-path guard in
  `handleAnswerChange` that drops `na` for non-allowlisted questions.
  **The door `introduction.redemptive_note` also carries N/A** (its strict
  SADI "satisfied another way" semantic moved with it in the Frame transplant),
  but on the native `manuscript` column, which stores plain strings, not
  `{value, na}` envelopes — so its flag is a **sidecar key** (`redemptive_note_na`
  beside the value), rendered by the `manuscript-prose` branch of the surface
  and guarded in `handleManuscriptChange` (same three-deep shape; only that one
  section+key pair is accepted). The wider Study-question and per-thought-unit-
  cell N/A is a ruled target (`WORKSPACE-CANON.md` §5) not yet built.
- **Chrome buttons** (bottom) — notebook summon (a quiet mono text link near
  the save indicator, per the D2d option-i ruling), the chevron-next
  (`.sws-forward`), and the map summon (`.sws-map-summon`).
- **Save indicator** — string from `saveState` (owned by `useWorkspaceSave`, rendered by the shell).

**`beforePositionChange` flush-await chain.** Every position-change trigger
— chevron-next, map-jump, unmet-state door, handoff jump, "go write it" —
awaits `beforePositionChange` (which flushes the renderer's pending debounced
save via `persistUpdate`) before the position settles. Draft is on disk
before the surface re-renders.

**Gap-position fallback.** Every stage/sub-phase now has a field def in
`walkOrder.js` (Outline/Equip/Manuscript landed 2026-06-09 as draft pedagogy —
see [Stage data sections](#study-stage-data) below), so this branch is
defensive-only. If a position ever resolves to a stage/sub-phase with no field
def (a corrupted `last_touched_position`, or a future regression), the surface
returns a self-contained `.sws-shell` div with a humane "this part isn't
available yet" message. Workspace-level Back-to-dashboard chrome still
functions. Soft state, not a crash.

---

## The map

Component: [`src/components/SermonMap.jsx`](../../src/components/SermonMap.jsx).

Summoned via the writing-surface chrome's `.sws-map-summon` button. Renders a
vertical list of every question in `QUESTION_WALK_ORDER` (derived from
`WALK_ORDER`), grouped by region in walk order: Observe → Interpret →
Redemptive Thread → Implications → Anchor → Outline → Body → Intro, Transitions,
Conclusion. (Body's per-question "answered" gates on Scripture + Explanation +
Application per outline point; Illustration counts toward "partial" and the
preview but never gates — the OEM Equip ruling.)

Every `QUESTION_WALK_ORDER` entry carries a `questionLabel` — the short
de-walled label (`mapLabel` on the field/question def, or the field label
when a question has none) rather than the full authored prompt. The map and
`StudyAnchorHandoff`'s "left behind" list both render `questionLabel`, not
`questionPrompt` (de-walling ruling, 2026-07-02 — the map is a scanning
surface, not a reading one).

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
`thresholds_seen` JSON array column. (The Finish screen — `SermonFinish.jsx`
— is CORE's third threshold screen, but it is summoned via the Finish
affordance and holds no `thresholds_seen` state of its own — Process #3
treats it as always re-openable, not a one-time dismissal — which is why
only two overlays ride this column.)

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
`THRESHOLD_ID.StudyToAnchorHandoff` id is not in `thresholds_seen`. Renders
the passage under a "Before you forge — read it once more" section ahead of the
outcomes — the re-read beat the CORE Process Contract #6 saturation amendment
(2026-06-10) places at this seam. Then reads back the four Study named outcomes
(Observation Set, Interpretation Set, Christ-Connection Statement, Implications
Synthesis) and actively surfaces any missing required outcome in prose with an
inline "go write it" door per the door pattern. Dismissal writes the id into
`thresholds_seen`.

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
the renderer writes them directly through `persistUpdate`. `last_touched_position`
is the sole position store; the vestigial spine `transitionState` position-writer
was removed in Track E4.

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
Phase G; re-based 2026-07-02 by the Frame collapse, then again the same day by
the M2 audit ruling): a sermon is complete when its load-bearing artifacts
exist. The foundation is five composite gate functions in
[`src/utils/studyAdvancement.js`](../../src/utils/studyAdvancement.js), one
per load-bearing field:

| Composite | Load-bearing field |
|---|---|
| `checkField8Composite` | Interpret Field 8 — Interpretation Synthesis |
| `checkField5Composite` | Redemptive Thread Field 5 — Christ-Connection Statement |
| `checkPhase4Field4Composite` | Implications Field 4 — Implications Synthesis |
| `checkMPTComposite` | Assembly/Anchor — MPT (Main Point Pair part 1) |
| `checkMPSComposite` | Assembly/Anchor — MPS (Main Point Pair part 2) |

**5 composites** since the M2 audit ruling (2026-07-02) dropped
`checkField3Composite` (Observe Field 3 — Divisions / Thought Units) from the
roll-up: the Study → Anchor handoff, the reference pane, and the sermon map
already treated the Obvious Point text as the Observation Set, so Finish
asking more via the old Divisions-canvas composite was an asymmetry, not a
stricter standard. `checkField3Composite` (and its private helper
`canvasHasMainWithModifier`) was **removed** 2026-07-02 (Track A) once it had
zero live callers after the M2 ruling. This is in addition to
the OEM walk (same day) retiring `checkIntroComposite` and
`checkConclusionComposite` with the Frame stage — the transplanted door
questions are now covered by the ratified-lenient Manuscript check below. If
this count ever fails to reconcile against the live `studyAdvancement.js` file,
either this table is wrong and the inconsistency must be surfaced, not silently
absorbed.

The composites are **wired into the workspace-wide "is the sermon done" answer**
(2026-06-10): `deriveSermonCompleteness(sermon)` in
[`src/utils/sermonState.js`](../../src/utils/sermonState.js) consumes all five — plus
four deliberately lenient presence checks for Observation Set / Sermon Outline / Sermon
Body / Manuscript (Outline/Body/Manuscript **ratified lenient** at the OEM walk, item 7;
Observation Set joined the lenient group by the M2 ruling, same day) — and returns
the per-artifact roll-up (**nine artifacts**: four Study outcomes, MPT + MPS, Outline,
Body, Manuscript). The lenient Observation Set check = the Obvious Point sentence is
written; the lenient Manuscript check = an `opener` answer **and** the Conclusion
`response`; **transitions are deliberately never counted** (a sermon is preachable
without written bridges; the map still tracks them honestly).
`SermonWorkspace.jsx` calls it for the Finish flow, and
[`SermonFinish.jsx`](../../src/components/SermonFinish.jsx) renders the result: **the
beholding moment** (the CCS + MPS read back under "did this sermon testify to Christ —
and does it show him to be better?", OEM item 1), then the artifact review with
per-artifact "go write it" jumps, Export to Word (carrying the "pray yourself hot"
send-off), and Mark-as-preached. At lower weight, the map-weight derivation
(`deriveQuestionStatesFromSermon`) is the continuous surface, and the Study → Anchor
handoff surfaces the four Study named outcomes. The answer **informs, never blocks**
(CORE Process #1 — no walls). The completeness *policy* these composites implement —
what "done" means per artifact, the N/A rules, the four lenient checks — is
[WORKSPACE-CANON §5](../WORKSPACE-CANON.md); this section is the wiring.

The advancement gates that used to fire at sub-phase boundaries (the seven
`check*Threshold` wrappers in `studyAdvancement.js`) were deleted in Phase F
of the trail deletion sweep. Phases that had a load-bearing-field composite
kept their check intact (Interpret Field 8, Redemptive Thread Field 5,
Implications Field 4, Anchor MPT + MPS). Boundaries that relied on inline checks
died entirely (Observe Field 7 Obvious Point, Observe Field 8 Possible
Implications, Outline → Equip outline-points-present, Equip → Frame
empty-evidence baseline). Per-stage detail below.

---

## Study stage data

> *What* each Study field asks and *why*, with the Merida-fidelity tags, is
> [WORKSPACE-CANON §2](../WORKSPACE-CANON.md). This section is the storage + derivation
> mechanics: which JSON column, which question kind, which composite.

### Step layer retired (Workspace Restructure 2026-05-10)

The pre-restructure "Step 1 / Step 2 / Step 3 / Step 4" layer inside Study is
gone. Steps 2-5 became sub-phases inside Assembly (Anchor / Outline / Equip /
Frame). The `current_step` column was retired in the trail deletion sweep
(Phase B2). Study's only sub-phase walk is the four Exegesis sub-phases below.

### Phase 1: Observe → `sermons.observations` (JSON)

`OBSERVE_FIELDS` in [`src/utils/studyFields.js`](../../src/utils/studyFields.js)
— 7-field shape: `context` → `surface_questions` → `divisions` → `characters`
→ `commands_declarations` → `big_ideas` → `obvious_point`. (`applications` /
Possible Implications removed 2026-06-15, Phase 2.)

- **Field 3 (Divisions / Thought Units)** — `indented-canvas` kind (the live kind
  string in [`studyFields.js`](../../src/utils/studyFields.js); "unified-canvas" survives
  only in older comments / test narration as the name of the era-2 rework, not as a kind);
  the [`PassageCanvas`](../../src/components/PassageCanvas.jsx)
  component mounts inside the writing surface. Its left gutter is pre-seeded by
  `verseLabelsForRange(raw, bookId)` in [`passageRef.js`](../../src/utils/passageRef.js)
  — a deterministic lookup, not the verse text, which the pastor still types by hand.
  It handles both single-chapter ranges (bare verse numbers) and cross-chapter ranges
  (chapter shown on the first row and at each chapter seam, e.g. Eccl 5:8–6:12 →
  `5:8, 9, …, 20, 6:1, …, 12`); an unresolvable reference falls back to a blank canvas.
  The gutter is also pastor-editable — pre-filled, but correctable
  (`PassageCanvas.jsx`; commits `15d4356` → `3334079` → `4fcc112`). A number marks only
  where a verse begins; continuation/indented rows carry none. Canvas rows produce the
  canonical `thought_units` array via `deriveThoughtUnitsFromCanvas` on every
  save (depth-0 rows mark the unit boundaries per era-2-primacy ruling 8).
  Phases 2/3/4 all read from this array. **What a unit IS was ruled 2026-07-02:
  the block** — the margin (depth-0) statement plus every line indented beneath
  it, spanning the verses it covers. The stored array keeps ruling 8's shape
  (identity + header `thought_unit_text` + cumulative columns); the block and
  its verse span are NOT materialized — `composeThoughtUnitBlocks`
  ([`studyFields.js`](../../src/utils/studyFields.js)) composes them at read
  time from the canvas, matched by `_canvas_row_id`, so a canvas edit can never
  leave a stale block and no migration was needed. Consumers: `SermonWorkspace`
  (enriches the `thoughtUnits` prop that `CumulativeSynthesisTable` renders as
  the read-only unit cell, indentation + verse span preserved) and
  `deriveQuestionStatesFromSermon` (verse spans on the map's partial "Unit N"
  labels). Composition is 1:1 and order-preserving with the stored array —
  `handleUnitColumnChange` writes cumulative cells by index against the raw
  column, and the enrichment never reaches storage.
- **Completeness foundation:** `checkField3Composite` was **removed** from
  `studyAdvancement.js` (2026-07-02, Track A) after the M2 audit ruling left it
  with zero live callers — Observation Set completeness now runs on the lenient
  Obvious Point check (Field 7) instead, [documented above](#the-completeness-contract).
  The advancement-gate checks for Field 7 and the former Field 8 (Possible
  Implications, removed 2026-06-15) were inline in the deleted
  `checkObserveToInterpretThreshold` wrapper and were removed entirely in
  Phase F.

### Phase 2: Interpret → `sermons.interpretation` (JSON)

`INTERPRET_FIELDS` — 7-field shape: `deeper_context` →
`recurring_ideas` → `character_purpose` → `contrasts` → `cross_refs` →
`commentary` → `interpretation_synthesis`. (`genre` removed 2026-06-15, Phase 2.)

- **Interpretation Synthesis** (Field 7 after the Genre cut; its composite keeps the
  legacy name `checkField8Composite`) — heavy-lifting, load-bearing. Q1
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

> *What* each Assembly field asks and *why*, with the Merida-fidelity tags, is
> [WORKSPACE-CANON §3](../WORKSPACE-CANON.md). Since the OEM walk (2026-07-02) Assembly
> holds two sub-phases — **Anchor** and **Outline** — both preacher-walked. Equip moved
> to Manuscript as Body, and Frame collapsed into the Manuscript doors (both below under
> Manuscript stage data). This section is the mechanics.

### Anchor (MPT + MPS) → `sermons.main_point_pair` (JSON v19 envelope)

`MAIN_POINT_PAIR_FIELDS` in
[`src/utils/sadiAnchorFields.js`](../../src/utils/sadiAnchorFields.js) — SADI
Step 2. Two fields:

- **MPT** — 2 questions (`draft`, `tighten`), both non-empty, no N/A
- **MPS** — 3 questions (`translate`, `gospel_check`, `tighten`). Q1 + Q3
  non-empty, no N/A; Q2 non-empty or explicit N/A per the SADI "satisfied
  another way" carve-out for upstream-resolved moralism checks.

Named outcome: Main Point Pair. The v19 `main_point_pair` envelope is the sole
store; the Word export derives MPT/MPS from its tighten answers (Track E2). The
flat `mpt` / `mps` columns are retained defensively — their auto-sync mirror
write was retired in Track E3, and they are now written only by direct
`apply-mutation`.

**Completeness foundations:** `checkMPTComposite` + `checkMPSComposite`.
The advancement gate at the Anchor → Outline boundary (the deleted
`checkStep2ToOutlineThreshold` wrapper) called both composites; both
survived Phase F.

### Outline → `sermons.outline` (JSON)

`SERMON_OUTLINE_FIELDS` in
[`src/utils/sermonOutlineFields.js`](../../src/utils/sermonOutlineFields.js) —
DRAFT pedagogy (2026-06-09, Merida Step 3; not yet preacher-walked like
SFDI/SADI). One field (`outline`) carrying a single `outline-builder` question:
the writing surface renders a reorderable point list (add / edit / remove /
move). Writes the native `outline` JSON column the Word export reads, via
`serializeOutline`. `createOutlinePoint(text)` in
[`src/utils.js`](../../src/utils.js) is the canonical point-creator — the
stable UUID it stamps is the key `functional_elements` + the manuscript
transitions depend on.

Named outcome: Sermon Outline.

- **No completeness composite survives this boundary.** The Outline → Equip
  advancement gate's "every outline point has non-empty text" check was removed
  with the deleted `checkOutlineToEquipThreshold` wrapper in Phase F; the draft
  field def does not re-add one. If a future walk needs an "all outline points
  named" check, it adds one then. Outline is the last Assembly sub-phase — the
  next field crosses the Assembly → Manuscript boundary (decide → write).

---

## Manuscript stage data

> *What* the Manuscript fields ask and *why* is
> [WORKSPACE-CANON §4](../WORKSPACE-CANON.md). Since the OEM walk (2026-07-02) Manuscript
> holds two sub-phases: **Body** (the former Assembly/Equip, moved) and **Intro,
> Transitions, Conclusion** (the doors, carrying the transplanted Frame moves). All
> preacher-walked. This section is the mechanics.

### Body → `sermons.functional_elements` (JSON)

`SERMON_EQUIP_FIELDS` in
[`src/utils/sermonEquipFields.js`](../../src/utils/sermonEquipFields.js) —
the field def keeps its `equip` key + `SERMON_EQUIP_FIELDS` export name (renaming
storage keys would strip stored positions for nothing); its pastor-facing label is
**Body**. One field carrying a single `functional-elements` question: the writing
surface iterates the outline points and renders the four elements (Scripture /
Explanation / Application / Illustration) under each, writing the native
`functional_elements` column keyed by point id, via `serializeFunctionalElements`.
When no outline points exist yet, the editor shows a door back to Outline. The cells
ARE the manuscript body (OEM ruling — cell clarity, not extra structure, is what makes
the body flow; the doors and the Word export read straight from these cells).

Named outcome: Sermon Body. Walk position: `Manuscript/Body/equip`.

- **No completeness composite** — the lenient Sermon Body presence check
  (≥1 element under any point) lives in `deriveSermonCompleteness`. The map's
  per-question "answered" gate is Scripture + Explanation + Application per point
  (Illustration never gates — OEM Equip ruling).

### Intro, Transitions, Conclusion (the doors) → `sermons.manuscript` (JSON)

`SERMON_MANUSCRIPT_FIELDS` in
[`src/utils/sermonManuscriptFields.js`](../../src/utils/sermonManuscriptFields.js)
— preacher-walked, carrying the transplanted Frame moves (each door prompt asks the
decision and the preached words together). walkOrder tags these fields
`Manuscript/IntroTransitionsConclusion/<field>`. Four fields:

- **Introduction** — 4 `manuscript-prose` questions (`opener`, `scripture_reading`,
  `expectation`, `redemptive_note`) → `manuscript.introduction`. `redemptive_note`
  is the transplanted Frame Q4 and the one N/A-able door question (sidecar flag
  `redemptive_note_na`, strict "satisfied another way" semantic — see the writing
  surface's N/A note above).
- **Transitions** — one `manuscript-transitions` question: a bridge into each
  outline point plus the bridge into the conclusion → `manuscript.transitions`
  keyed by point id. Shows a door to Outline when no points exist. Genuinely new
  prose, not a transplant.
- **Conclusion** — 2 `manuscript-prose` questions (`summation`, then `response`) →
  `manuscript.conclusion`. The OEM two-prompt split of the old single response box
  (Frame's `summate` → `summation`; `land_call` + `gospel_empower` → `response`).
- **Sermon Title** — the walk's terminal field (kind `sermon-title`, added
  2026-07-02, ruled: named last, with the doors). Writes the native `title`
  column directly, not the `manuscript` JSON; an empty submission is never
  persisted (spoken refusal instead — State #3, "a sermon must have a name,"
  is satisfied at creation and this field only ever corrects it).

These write the native `manuscript` JSON column the Word export reads via
`parseManuscript` (`{introduction, transitions, conclusion}`) — one source of
truth, no envelope/flat-column desync. Named outcome: the Manuscript itself (the
terminal doors sub-phase produces no separate named outcome).

- **Export to Word** — dispatches `sermon-export-manuscript` IPC. Main builds a
  `.docx` to `Documents/SermonForge/exports/Manuscripts/` and opens it. The body's
  four cells assemble under their points (Scripture italic-gray, then Explanation /
  Application / Illustration as unlabeled prose — OEM ruling: the manuscript page
  reads as prose, not a worksheet); the Conclusion prints `summation` then `response`.
  Manuscript is the terminal prep stage; no Delivery tab.
- **No advancement gate** — the lenient Manuscript check (opener + response) lives in
  `deriveSermonCompleteness`.

### Legacy `sermon_frame` column

The v18 `sermon_frame` column persists post-collapse: existing sermons' Intro/Conclusion
answers stay on disk and remain in the search index (surfaced as "MANUSCRIPT · INTRO /
CONCLUSION (LEGACY FRAME)"), but the walk no longer renders them — the door fields read
the `manuscript` column only (pastor-ruled 2026-07-02: leave on disk, no one-time
surfacing). The v33 migration rewrites in-flight `Assembly/Frame` positions to the doors.

---

## PassagePopup

Component: [`src/components/PassagePopup.jsx`](../../src/components/PassagePopup.jsx),
opened by [`PassageLookup`](../../src/components/PassageLookup.jsx) — an ESV.org-style
Bible reference picker (Testament tab ▸ book ▸ chapter ▸ verse/range dropdown) mounted
in the `SermonWorkspace` top bar. It is a standalone lookup decoupled from the sermon's
preaching passage; picking a reference opens this draggable/resizable reading window
with ESV text, section headings, and Previous/Next chapter navigation. There is no
"Show Text" affordance in the writing-surface chrome.

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
2. `onUpdate(fields)` → `handleUpdate()` (from `useWorkspaceSave`, consumed by the shell).
3. `setSermon()` merges into local state (optimistic update).
4. `sermonRef.current` updated.
5. `debouncedSave()` scheduled (800ms debounce).
6. On fire: `persistUpdate()` reads `sermonRef.current` (full current state).
7. `updateSermon(id, fields)` dispatches the `update-sermon` spine op →
   `electron/main.js` `case "update-sermon"` handler. (`apply-mutation` is a
   separate spine op — a single-field typed `user_input` mutation — that this
   multi-field workspace save path never touches.)
8. `buildUpdate()` validates against the `SERMON_COLUMNS` allowlist.
9. The SQL UPDATE commits durably as it runs — better-sqlite3 in WAL mode, with no
   serialize-and-rotate pipeline and no disk-write debounce. A failed write throws at
   the handler and surfaces here through `persistMutation`'s save state. (`flushDb()`
   survives only as an internal main-process WAL checkpoint — quit path + boot-time
   backup; the old `saveDb()` 500ms debounce no longer exists, and the dead disk-write
   banner + `db-flush` channel were removed 2026-07-01; see CORE Absolute Invariants
   and [`electron/main.js`](../../electron/main.js).)

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
  `before-quit` handler in `electron/main.js`. Crash/kill leaves at most the
  renderer's autosave-debounce window unflushed — the last `<800ms` of typing —
  documented as accepted risk in `electron/main.js`.

**Deliberate-exit transitions (the persistence-transition contract, 2026-07-13):**

Every deliberate transition away from editable work resolves a flush to
exactly one of `"saved"` / `"failed"` / `"unknown"`
([`src/utils/saveTransition.js`](../../src/utils/saveTransition.js); the
main process mirrors the constants in
[`electron/saveTransition.cjs`](../../electron/saveTransition.cjs)) and
handles the result explicitly — the unmount flush in `useWorkspaceSave`
remains a backstop, never the guarantee (async effect cleanup can't block a
view change on failure):

- **Workspace Back and the series prev/next switch** route through the
  shell's `requestLeave`: flush via `persistUpdate`, leave only on
  `"saved"`. On `"failed"`/`"unknown"` the workspace stays put and
  `UnsavedLeaveConfirm` puts the choice to the pastor — "Keep working"
  (primary) or the explicit "Leave anyway". Cross-sermon switching (App
  remounts the workspace keyed by sermon id) therefore never abandons the
  old sermon's failed save to the unawaited unmount flush.
- **The Series Planner** does the same for its Back and its open-sermon
  hop, flushing through the close-flush registry — which includes a
  parked-failure flusher: a write whose debounce already fired and failed
  (the `failedWritesRef` queue) fails the global flush even though no
  timer remains, after one drain-retry. The study-guide export refuses to
  run in that state (the booklet is built from the DB in main — it would
  be stale); the workspace Word export is payload-built from renderer
  memory, so it proceeds as the rescue copy but its note says the library
  save hasn't landed.
- **Window close, menu Quit / Cmd-Q, and updater restart** run the same
  decision in main (`confirmExitOverSaveResult`): `"saved"` proceeds
  silently; `"failed"`/`"unknown"` ask with the same wording family
  ("Keep working" / "Close|Quit|Restart anyway"); a dead window or a
  broken dialog always proceeds, so the app can never become unclosable.
  `"unknown"` (the 2s flush timeout) is spoken as uncertainty — distinct
  wording from failure, never dressed up as success.

---

## Cross-system notes

- **Adding columns to `sermons`** requires updating `SERMON_COLUMNS` in
  *both* [`electron/contracts.cjs`](../../electron/contracts.cjs) and
  [`src/core/contracts.ts`](../../src/core/contracts.ts) — the two allowlists
  mirror each other (and the third mirror, `tests/contracts/_helpers/test-spine.ts`,
  is test-asserted in sync). `delivery_notes` / `timing_notes`
  were struck from the writable set in the v24 migration, and the writable set has
  since gained `big_idea`, `overview`, `study_guide_extras` (v27), `sort_order` (v30),
  `book_id` (v31), `tags` (v32), and `last_manuscript_subphase` (v33 — Manuscript's
  per-stage sub-phase memory, added when the OEM restructure gave the stage sub-phases).
  `buildUpdate()` throws in dev if you miss this, but only if you exercise the save
  path. The `assertSchemaContract()` startup check validates the live DB against the
  allowlist.
- **Field-level editors** (`PassageCanvas`, `SynthesisTable`) mount
  inside the writing surface unchanged from pre-rebuild; the data shapes
  they read/write are documented above per stage.
- **`FeedbackFlag` is live-mounted.** The component at
  [`src/components/FeedbackFlag.jsx`](../../src/components/FeedbackFlag.jsx)
  is BTI Phase 1 infrastructure (the Tier 1 in-app flag affordance). Its
  pre-sweep mount points (StudyTab + ManuscriptTab + AIPanel + ProposalPanel
  + SeriesPlanner + DeliveryTab + OutlineTab) were all on surfaces deleted
  across ARI, Workspace Restructure, and the trail deletion sweep, but the
  2026-05-18 hygiene scan re-wired it onto the unified writing surface: it
  mounts from `SermonWorkspace.jsx` (top-right chrome cluster, gated on
  `!_fixtureSermon` so fixture clicks stay out of BTI telemetry) with a
  per-stage `surface` label and field-level `step`, and separately from
  `SeriesPlanner.jsx`'s topbar (`surface="series-planner"`). No re-mount
  work is pending.

---

## Related docs

- [`docs/WORKSPACE-CANON.md`](../WORKSPACE-CANON.md) — **the walk's *what & why***: every
  question, named outcome, the completeness policy, Merida fidelity. This doc renders that
  walk; canon defines it. (Ratified 2026-06-15 — the live source for the walk's what & why.)
- [`docs/PROPOSALS/invisible-system-build-spec.md`](../PROPOSALS/invisible-system-build-spec.md)
  — the build spec for the writing-surface architecture; sweep-close
  inventory of remaining open work.
- [`docs/CORE.md`](../CORE.md) — Process Contracts #1 (monotonic in
  expectation, not enforcement), #2 (completeness contract), #3 (visible at
  thresholds, not narrated continuously), #4 (PC follows the text — points here for
  mechanics).
- [`docs/ENFORCEMENT_STATUS.md`](../ENFORCEMENT_STATUS.md) — clause-by-clause
  enforcement status for the four contracts.
- [`docs/PROPOSALS/workspace-restructure-charter.md`](../PROPOSALS/workspace-restructure-charter.md)
  — the 4-stage → 3-stage collapse + Step layer retirement.
- [`docs/PROPOSALS/era-2-primacy-initiative.md`](../PROPOSALS/era-2-primacy-initiative.md)
  — ruling 6 (`takeoverWhenActive` retired, rail-visible default) and ruling
  8 (Field 3 unified-canvas rework, depth-only structural layout, paraphrase
  + thought_unit_end markers retired).
