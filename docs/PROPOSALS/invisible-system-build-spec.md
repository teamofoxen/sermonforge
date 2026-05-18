# SermonForge — Invisible System Build Spec

This is a build spec and working brief. Read it fully before writing code. It defines the
target system, what survives from the current build, what gets deleted, and what is still
open for design. Where something is open, it says so — do not invent a resolution, surface
the question.

---

## What SermonForge is

A local-first Electron app for sermon preparation, single-user (the developer, who preaches
~42 weeks/year). It walks the preacher from a Bible passage to a finished sermon manuscript
through a sequence of questions. The exegetical structure is built from Tony Merida's
Christ-Centered Exposition framework.

The workspace currently has three stages — Study, Assembly, Manuscript. Study has four
sub-phases: Observe, Interpret, Redemptive Thread, Implications. Assembly has four: Anchor,
Outline, Equip, Frame. The work produces named outcomes that hand off between phases.

## The diagnosis driving this build

The system was built in three eras layered on each other without cleanup:

- **Era 1** — the original build from Merida. A sequence of questions with free-text answers.
- **Era 2** — the constraint system. Thought units as a keyed array; a cumulative cross-phase
  table; gates; named outcomes. This is what makes the app more than a worksheet.
- **Era 3** — the trail UX. Phases, sub-phases, clearings, pause-clearings, a switchback
  trail, a rail, station marks, stage-boundary visualizations.

Era 2 is the spine and is correct. Era 1 is the curriculum the spine carries and is correct.
**Era 3 is the problem.** The trail narrates the work back to the preacher while they are
doing it — phase labels, sub-phase headers, field counters, position indicators. The work
itself is not clunky. Being told you are doing the work is clunky.

This build removes era 3 entirely. Era 1's questions and era 2's architecture stay. The trail
goes. The result is an "invisible system" — the structure does all its work behind a calm
surface that shows the preacher only their own thinking.

---

## The target system

### The writing surface

One question at a time. The passage on one side, the question and a place to write on the
other. The preacher reads, thinks, writes. When they are done with a question, the next one
arrives. Their answers accumulate into a growing document of their own thinking about the
sermon.

No phase labels. No sub-phase headers. No trail. No rail. No field counters. No "Continue"
button as trail furniture — advancing happens when the preacher finishes a question and moves
on. No stage tabs.

The only navigation chrome ever visible during the work is a single, persistent control that
opens the map. One button, same place always.

The notebook (where the preacher writes margin notes alongside the work) gets a second
persistent control — a quiet mono text link near the save indicator — as the one approved
exception. It is a separate working surface, not navigation. Two persistent controls; one
navigates, one opens a notebook.

### The map

The map is the only visible structure in the system. It does three jobs: orient the preacher
before they start, let them jump to any question to revisit work, and tell them where they
are when they return after a break. It also, as a consequence of free navigation (see below),
carries a fourth job: it is the standing answer to "what is left."

Shape:

- A vertical list of every question in the whole sermon, grouped by region, in walk order:
  Observe → Interpret → Redemptive Thread → Implications → Anchor → Outline → Equip → Frame →
  Manuscript. One column. Scrollable.
- Not a tree, not a graph. The work is linear; the map is linear. A graph would imply
  branching that does not exist.
- **The whole arc is shown from day one.** Manuscript's questions are visible while the
  preacher is still in Observe, shown faint. The preacher knows the shape of the whole work
  from the start.

Per-question state — shown by visual weight, not by badges:

- **Answered** — full weight. A short preview of the preacher's answer is shown.
- **Partial** — started, not yet complete. Present but lighter, with an unfinished mark.
- **Unanswered** — faint. Present so the whole arc is visible, clearly not yet walked.
- **Current** — the strongest mark on the map. When the map opens, the eye lands here
  without searching.

No checkmarks or status icons. A checkmark is a badge announcing completion — that is the
narration this build removes, relocated. Let weight and the presence of the preacher's own
words carry state. An answered question looks substantial because it contains their writing.

Each question entry shows the question text always, plus a short preview of the answer when
answered. When the preacher opens the map they are usually hunting their own thinking — "what
did I say about that" — so the answer preview is the findable thing. As a side effect, the
map scrolled top to bottom reads as the spine of the whole sermon's thinking.

Summon and close: one persistent control on the writing surface opens the map. It slides or
fades over the writing surface. Click a question → map closes, preacher lands in that
question. Close without clicking → back where they were.

### Navigation model — free movement, with honest hard-dependency screens

The previous build enforced strict order: you could not advance without completing the
current step, and you could not jump forward at all. This killed the UX. This build does not
do that.

**Every question on the map is clickable, including questions ahead of where the preacher
has reached.** The preacher can jump forward.

This is a deliberate softening of the contract. It is required. But it must not produce
broken screens. Distinguish two kinds of question:

- **Soft-gated questions** — questions whose answers are merely *better* if prior work is
  done. The preacher can jump there early; the question works, the answer may be thinner.
  This is the large majority of questions. Free navigation is fully fine here.
- **Hard-dependency questions** — questions that are structurally a function of a specific
  upstream artifact. In practice these are the per-unit table questions in Interpret,
  Redemptive Thread, and Implications, which are row-by-row passes over the thought-unit
  array produced in Observe's Field 3. With no thought units, there is nothing to render.

For hard-dependency questions, jumping forward uses **Option A**: the question renders its
own honest unmet-state. Instead of an empty table, it shows a short message — this question
works through the passage's thought units, which have not been laid out yet — and a button
that takes the preacher directly to the question that produces them. Not a locked door. A
question that explains what it needs and provides the door in one click.

The map may show, faintly, which questions currently have unmet hard dependencies — as
information, not as a lock. The preacher can still click them. They land on the honest
unmet-state screen rather than a broken one. The map never refuses; the destination explains
itself.

### The contract that survives

The previous build's gate was a wall enforcing *order*. Order is the part that killed the
UX and is gone.

What survives is a different contract. Integration of a sermon was never produced by the
wall — it was produced by the named outcomes. A sermon is integrated because the preacher
wrote the load-bearing artifacts (e.g. the Christ-Connection Statement, the Implications
Synthesis). Free navigation lets the preacher write those out of order, thinly, and revisit
them. It does not let them never write them.

So the surviving contract is a **completeness contract, not an advancement contract**: the
sermon is not done until the load-bearing artifacts exist. The system enforces completeness,
not sequence.

Because the preacher can now skip freely, completeness must be *visible*, or they will arrive
at "is this done?" with forgotten half-finished questions. The map carries this — its
faint/partial/full weighting is the standing record of what is left. Threshold orientation
(below) should also actively surface unfinished work at key points, because with no walls,
nothing else will.

### Strategic orientation at thresholds

The system is silent during the work but orients the preacher at thresholds. A threshold is:

- **Sermon start** — after the new-sermon modal, before the first question. A landing screen:
  what the preacher is about to walk through, the shape of the whole arc, what the work
  produces. Read it, close it, first question arrives.
- **Region transitions (within-stage)** — when the questions shift from one region to the
  next within Study or within Assembly. **In-question framing** (Q1 resolved): the first
  question of the new region carries a single quiet line above the field name. Pattern:
  "X opens, against the Y." (Y = the prior region's named outcome.) No closure assertion —
  free navigation means the prior region may not actually be closed; the load-bearing half
  is naming the substrate the new region builds on.
- **The Study → Anchor handoff** — heavier weight; cross-stage; a real landing screen. Study
  sub-phases close out, sermon-shaping begins. Surfaces the four Study named outcomes
  (Observation Set, Interpretation Set, Christ-Connection Statement, Implications Synthesis)
  and any unfinished Study questions left behind. **Missing required outcomes are actively
  surfaced in prose** ("Three of the four are written. The Implications Synthesis isn't yet
  — Anchor opens against all four.") with an inline "go write it" door per missing one. The
  active surfacing is load-bearing — passive "not yet written" placeholders are too quiet for
  a load-bearing artifact that's missing.
- **Session re-entry** — when the preacher opens the app after a break. Lightweight
  orientation. Lands on **last-touched** (not last-answered — different concept; last-answered
  is walk-frontier and re-imports the wall). The thin "glance at recent work" card is a
  forward-flag; landing alone may suffice in lived prep.

Orientation is discrete and lives at thresholds. It is never continuous and never present
during the work. This is the line between orientation (helpful, at boundaries) and narration
(clunky, always-on) — keep it.

**One mechanism for "has this threshold been dismissed":** all threshold-orientation surfaces
read from and write to a single per-sermon list of dismissed thresholds, rather than one
boolean per threshold. Same source of truth across sermon-start, Study → Anchor handoff, and
any future threshold. Prevents the boolean-per-threshold proliferation; also keeps the "seen"
state distinct from `last_touched_position` (which tracks navigation, not threshold dismissal).

---

## What survives from the current build (do not break)

The era 2 architecture is load-bearing and stays. The data layer barely changes.

- **Thought units as a keyed array.** Observe's Field 3 produces a UUID-keyed array of
  thought units. Every later per-unit question indexes against this array. Do not re-derive
  thought units anywhere else.
- **Cumulative cross-phase data.** Interpret writes a meaning per thought unit; Redemptive
  Thread writes a Christ-connection per unit; Implications writes an implication per unit.
  All keyed to the same array. The preacher never sees a "cumulative table" as a labeled
  object — they see the current per-unit question, with relevant prior columns visible as
  context. The persistence is invisible; the data structure is unchanged.
- **Named outcomes.** Each region produces a named outcome (a paragraph-level artifact).
  These are the substrate the next region opens against. In the new surface they are not
  labeled "named outcome" while being written — they are simply the question at the end of a
  region. But they still must be produced for the sermon to be complete.
- **Gates as completeness checks.** The gate logic stays, but its role changes from
  refusing advancement to recording completeness. A question is complete or not; the map
  reflects it; the completeness contract depends on it. Gates no longer block movement.

## What gets deleted

Era 3 rendering and dead residue. None of this is load-bearing. **Status as of the trail
deletion sweep** is annotated below; see the sweep state section at the bottom of this spec
for phase-by-phase detail.

- The trail rendering in its entirety — switchback trail, clearings, station marks.
  *(Shipped Phase E, 2026-05-17.)*
- Pause-clearings — all of them, including the stage-boundary pauses. *(Shipped Phase E, 2026-05-17.)*
- The rail and any rail-collapse / `takeoverWhenActive` logic. *(takeoverWhenActive
  retired in C; rail goes with E.)*
- Sub-phase headers, phase labels, and field-of-N counters in working views. *(Gone from
  the writing surface; the trail files still carry them until E.)*
- Stage tabs as the navigation model (replaced by the writing surface + map).
  *(Removed from `SermonWorkspace.jsx` in D2c.)*
- "Continue" buttons that exist as trail furniture. *(Gone from the writing surface; trail
  files still carry them until E.)*
- The `_synthesis` keys and the pause-clearing synthesis-question storage and write paths —
  nothing reads them. *(Will be deleted with the trail files in E.)*
- The three legacy Pastoral Context columns (`topic_theme`, `audience_assumptions`,
  `background_noise`) — retained defensively, no role, no production data. **Deleted in
  Phase B1.**
- `current_step` — retired column, parsed but ignored. **Deleted in Phase B2.** Distinct
  from `last_touched_position`, which is the NEW field added in D1 to drive session re-entry
  routing. Same conceptual role, opposite fates — distinguish by name and caller, not by
  association.
- The AI-context text-flattening pipeline (`flattenToText` + `flattenExegesis` +
  `hasMinimumSubstrate` + `hasAnyAnswer` + retired key constants). **Deleted in Phase A.**
  Gates that previously rode along on `!!flattenAnswerValue(...)` for truthiness were
  refactored to a true content-presence `hasContent` helper in Phase C — same logic, honest
  semantics.
- Dead exports kept "so the context pipeline can surface legacy data" — the pipeline is gone.
  *(Gone with Phase A.)*
- Pre-restructure stage aliases and coercion logic (`Blueprint` / `Frame` coerced to
  `Assembly` on read). **Deleted in Phase B3** — `coerceLegacyStage`, `LEGACY_TAB_MAP`, and
  the legacy values in the `Stage` enum's admitted set. **`Delivery` stays** — separate
  ARI-era defensive-tolerance, out of scope for this sweep; decide by name and origin, not
  by association with Blueprint/Frame.
- The wall layer in `studyAdvancement.js` — `evaluateAdvance`, `formatAdvanceRejection`,
  `formatTabRejection`, the seven `check*Threshold` wrappers (the original spec said
  "five"; grep against the live file at F's execution found seven — the four Study-
  internal boundary checks + `checkStep2ToOutlineThreshold` +
  `checkOutlineToEquipThreshold` + `checkSermonFrameToManuscriptThreshold`),
  `buildSubPhaseEvidence`, `buildStageEvidence`, plus `canonicalSubPhase` +
  `subPhaseToIndex` (both orphaned with the wrappers — the former only called by
  `evaluateAdvance`, the latter only by the E-deleted tab files). `answeredQuestions`
  in `studyFields.js` went with the same chunk (sole caller was
  `buildSubPhaseEvidence`; map state and completeness use `hasContent` per the
  per-question-kind dispatch). *(Shipped Phase F, 2026-05-17.)* **Kept:** the
  eight composite gate functions (the original spec said "nine"; the live file
  carries eight — `checkField3Composite`, `checkField8Composite`,
  `checkPhase4Field4Composite`, `checkField5Composite`, `checkIntroComposite`,
  `checkConclusionComposite`, `checkMPTComposite`, `checkMPSComposite`). They
  are the surviving completeness contract — uncalled today, kept anyway because
  the spec assigns them a future role feeding map state and the "is the sermon
  done" check.
- The spine-side Process #1 (forward-to-prior rejection) and Process #2 (empty-evidence
  rejection) in `electron/main.js` `transitionState`. *(Pending Phase G.)*

There is no production data and no other user. Defensive retention preserves nothing.
Delete rather than legacy-tolerate. But verify before each deletion that nothing
load-bearing is tangled in — especially around gate logic and content-presence primitives,
which historically reused flattening helpers.

**`answeredQuestions` per-caller classification (resolved Phase F, 2026-05-17).**
The original instruction was "preserve if any non-wall caller exists." Grep
against the live `src/` tree at F's execution found zero non-wall callers — the
only production call site was `studyAdvancement.js`'s `buildSubPhaseEvidence`,
which went with the wall. The map state derivation and completeness audits
use `hasContent` against individual answer envelopes, not phase-wide
iteration. The condition for preservation failed, so `answeredQuestions` was
deleted alongside `buildSubPhaseEvidence` as an atomic chunk. Same name-
discipline as `current_step` vs `last_touched_position` was applied — same-
looking, different fates, decided by name and caller.

## Working method — five questions per decision

This build is a long sequence of design and code decisions. Run each non-trivial decision
through these five questions before committing it:

1. **What is this — era 2 architecture, era 1 curriculum, or era 3 ceremony?** Era 2 and
   era 1 survive. If a decision re-imports era 3 (a label, a position indicator, a
   ceremony surface), stop.
2. **Does this announce work, or produce work?** Question prompts, the act of writing, the
   completeness record — produce work. Position labels, progress indicators, completion
   badges — announce work. Announcing work does not ship.
3. **What is the minimum surface that does the job?** Default to the smallest surface.
   Each addition past the minimum must defend itself against a real need, not "it would be
   nice" or "it parallels something else."
4. **What happens on re-entry after days away?** Every surface is tested against the
   preacher returning after a break. If it relies on momentum or short-term memory, redesign.
5. **Does this conflict with anything in this spec?** If a decision conflicts with the spec,
   either the decision is wrong or the spec is wrong. Do not silently override the spec.
   Surface the conflict.

---

## Open questions — do not invent answers, surface these

Status as of the current sweep state is annotated per question. Resolved questions stay in
the list (with their answer) so the rationale survives across sessions.

1. **Region-transition orientation: separate screen or in-question framing?** *(Resolved.)*
   Split by boundary kind. Within-stage transitions (Observe→Interpret, Interpret→RedThread,
   RedThread→Implications, Anchor→Outline, Outline→Equip, Equip→Frame, Frame→Manuscript) use
   in-question framing — a single quiet "X opens, against the Y." line above the first field
   of the new region. Cross-stage transitions get separate screens, but per the spec only
   Study→Anchor is named as a heavy threshold; Frame→Manuscript stays in-question framing
   unless lived prep shows otherwise. Closure-asserting language ("X closes") is forbidden —
   free navigation means closure cannot be asserted as fact.
2. **The accumulating document — how much prior work is visible during the current
   question?** *(Resolved.)* Single-question style with three categories of prior work
   distinguished: (a) cross-phase structural reads (render in-question — e.g. synthesis
   tables read the thought-unit array as their row spine); (b) immediately-prior columns in
   per-unit cumulative questions (render in-question, by design — the per-unit cumulative
   table is one question; single-question means one question at a time, not one column of a
   table at a time); (c) general recall (the map's job, not the writing surface's).
3. **Work-in-progress on a map jump.** *(Resolved for graceful close.)* The
   `beforePositionChange → flush → await → settle` chain (wired in D2c at every
   position-change trigger: chevron, map jump, unmet-state door, handoff jump, "go write
   it") flushes the renderer's pending debounced save before the position settles. Graceful
   app close (Cmd-Q / Alt-F4 / menu Quit / taskbar) is handled by the existing
   `before-quit` handler in `electron/main.js` which awaits `flushDb`. Crash/kill leaves
   a ~1.3s window of pre-flush typing lost — documented as accepted risk in
   `electron/main.js:370`, separate from re-entry design.
4. **What makes a question "complete" for the completeness contract.** *(Resolved.)*
   Per-question-kind dispatch via the surviving composite gate functions plus the
   `hasContent` helper. text-prompt: `hasContent` against the answer envelope (true if
   non-empty string or N/A flag). cumulative-synthesis-table: every thought-unit row has
   non-empty editable column. indented-canvas: `canvasHasMainWithModifier`. Same dispatch
   feeds map state (answered/partial/unanswered) and the completeness audit; one source of
   truth.
5. **The map's representation of hard-dependency unmet state.** *(Resolved.)* No fifth state.
   Unmet-dependency questions show as plain unanswered (faint). Clicking lands on the
   Option A unmet-state screen with the door. The map never refuses; the destination
   explains itself.
6. **Felt accomplishment.** *(Observation point, deferred.)* Threshold orientation at
   region boundaries and the Study→Anchor handoff are intended to preserve this. If lived
   prep shows otherwise, something else may be needed. Watch for this; do not pre-build a
   solution.
7. **Process Contract #3 surface — "movement is a visible event."** *(Resolved, D2e, 2026-05-17.)*
   Option B chosen and shipped. Process Contract #3 was rearticulated in
   [`docs/CORE.md`](../CORE.md) from "movement is a visible event; 'Continue' is movement,
   and movement is never silent" to "Movement is visible at thresholds, not narrated
   continuously" — citing this spec's *Strategic orientation at thresholds* section and
   the era-2 primacy charter's *Constraint without ceremony* clause. The contract-3 test
   (`tests/contracts/process-3-movement-visible.test.tsx`) was rewritten to assert the new
   vocabulary: sermon-start fires `.ssl-overlay` on null `last_touched_position`, the
   Study→Anchor crossing fires `.sah-overlay`, and within-stage chevron-next + map-jump
   produce no overlay and no `data-testid="movement-event"`. The meta-test was inverted:
   no component under `src/components/` may carry `data-testid="movement-event"` — a
   regression that re-adds always-on narration trips the test. The intent (movement gets
   visibility) holds; its rendering shifted from an always-on banner to discrete threshold
   surfaces. Original Open/A/B/C exposition preserved below so the rationale survives:

   The contract's old surface was the tab-change banner with `data-testid=
   "movement-event"`, fired on every stage transition. The new design retires tab changes
   and makes within-stage movement silent per the calm-surface principle; movement is
   visible at thresholds (sermon-start, Study→Anchor handoff, in-question region frame).
   The contract's intent (movement gets visibility) holds — its rendering shifted. The
   contract-3 test (`tests/contracts/process-3-movement-visible.test.tsx`) asserts the old
   surface and needs to be retired or rewritten against threshold orientation. Three options
   surfaced in D2e:
   - **(A) Retire the test.** Threshold orientation gets tested separately (sermon-start
     fires, handoff fires); drop process-3 as a stale contract test. Loses tripwire.
   - **(B) Rewrite against thresholds.** Assert that Study→Anchor crossing fires
     `.sah-overlay`, sermon-start fires `.ssl-overlay`. Preserves the contract intent in new
     vocabulary. Recommended.
   - **(C) Defer to F.** Leave the test stale until F deletes related wall functions.
     Violates the "no knowingly-broken state between chunks" discipline.

---

## Original build order (history)

The build proceeded in this order, mostly as planned. Each step is now complete or rolled
into the trail deletion sweep (next section). Preserved here for historical context — the
sweep state section is the live tracker.

1. **Inventory and verify deletions.** Before deleting, trace the flattening pipeline and
   gate logic to confirm what is tangled. Produce a short list of "delete outright" vs
   "replace with simple check." *(Step 1 audit, complete.)*
2. **The writing surface.** *(Complete.)*
3. **The map.** *(Complete.)*
4. **Hard-dependency unmet-state screens (Option A).** *(Complete, wired alongside the
   per-unit table build.)*
5. **Threshold orientation.** *(Complete: sermon-start, region transitions, Study→Anchor
   handoff, session re-entry all wired in step 5 of the original order; D2e contains the
   final test work.)*
6. **Completeness surfacing.** *(Complete — the map carries it; the Study→Anchor handoff
   actively surfaces missing required outcomes in prose.)*
7. **Delete era 3.** *(In progress as the trail deletion sweep, A–G — see next section.)*

Build the new surfaces first where possible, so there is always a working path, then remove
the old. Do not delete the trail before the writing surface and map can carry the work.

*Acknowledgment (Phase E, 2026-05-17):* the rule above was knowingly under-met when E
shipped. The writing surface carries Study + Assembly/Anchor + Assembly/Frame; Assembly/
Outline, Assembly/Equip, and Manuscript have zero registered field defs in `walkOrder.js`.
Position landing in those stages renders "No field found." The regression was already
live in production as of D2c (the writing surface stopped mounting the tab-routed trails
then); E deleted the dead code that previously rendered those stages but did not introduce
the user-facing gap. Path A chosen: accept the gap as temporary and schedule the field-def
extraction as its own tracked initiative. The discipline rule above is preserved as the
rule — its under-met state is named, not silently overridden.

---

## Trail deletion sweep — state and commitments

**Sweep status (2026-05-18): CLOSED.** All phases A through G shipped between
2026-05-17 and 2026-05-18. Era 3 is gone — trail UI, advancement-wall layer
in `studyAdvancement.js`, spine-side advancement rejections in
`transitionState`, the cutoff-carve-out machinery, and all wall-shaped
fragments across the renderer-side spine wrapper. Era 2 (the constraint
system: thought-unit array, cumulative cross-phase table, named outcomes,
composite gates) survives intact and is now invisible — the writing surface
+ map + threshold orientation carry it. Era 1 (Merida's curriculum: the
field prompts, question text, hint copy) survives intact as the content
the spine carries. The result is the "invisible system" the spec named on
day one: the structure does all its work behind a calm surface that shows
the preacher only their own thinking.

**Known open work carried out of the sweep** (each tracked as its own
initiative, preacher-prioritized — none gated by the sweep):

- **Completeness-contract surfacing.** CORE Process #2 was rearticulated
  in G to "a sermon is complete when its load-bearing artifacts exist."
  The 8 composite gate functions in `studyAdvancement.js` are the
  foundation. The map's weighting (answered / partial / unanswered) uses
  the same per-question-kind dispatch and powers the Study → Anchor
  handoff. The remaining surface — a workspace-wide "is the sermon done"
  answer that consumes the composites; broader completeness reporting on
  the map; the preacher-facing read of the eight composite gates — is in
  progress, not finished. The composites are currently uncalled because
  their full consumer is not yet wired.
- **Field-def extraction (Path A).** Assembly/Outline, Assembly/Equip,
  and Manuscript have zero registered field defs in `walkOrder.js`;
  position landing in those stages renders "No field found." Pre-existing
  since D2c (the writing surface stopped mounting the tab-routed trails
  then); not caused by E or anything later.
- **D2c/D2d lint debt.** 23 `sermonforge/no-raw-button` violations across
  9 files in the post-D2c writing-surface + notebook-drawer stack —
  scheduled Surface #2 catch-up pass.
- **BTI tour-step impact.** `TOUR_STEP` telemetry constant deleted in tour
  cleanup; BTI charter + privacy doc still commit to tracking the event.
- **Sample-sermon landing UX.** Dashboard's "Open a sample sermon" lands
  the curious pastor on the sermon-start `.ssl-overlay` because the seed
  lacks `last_touched_position` + `thresholds_seen`.
- **SAMPLE_ID_PREFIX extraction.** `'sample-'` / `'sample-%'` literal
  repeats across electron/main.js + sampleData.js + tests; self-contained
  micro-refactor.

These items are the legitimate residue of opportunistic execution; the
sweep was the cut, these are what didn't fit cleanly inside it.

---

The era 3 deletion was done as a phased sweep with per-phase authorization. The sweep was
the preacher's call to sequence — phases were not self-authorized. Each phase was atomic, with
in-chunk test updates and verification before close. No knowingly-broken state between
phases.

### Phase state

| Phase | Scope | Status |
|---|---|---|
| **A** | Dead AI residue in `studyFields.js` (`flattenToText`, `flattenExegesis`, `hasMinimumSubstrate`, `hasAnyAnswer`, retired key constants) + matching test cleanup | ✅ Complete |
| **B1** | Legacy PC columns (`topic_theme`, `audience_assumptions`, `background_noise`) — removed from `SERMON_COLUMNS` (cjs + ts + test-spine), spine init, CREATE TABLE DDL, v6 migration, defensive backfill, docs | ✅ Complete |
| **B2** | `current_step` column — removed from both allowlists, spine init, main.js migration / parse / write sites (4 places), 5 test fixtures, 4 doc updates. Distinct from `last_touched_position` (the new field added in D1) | ✅ Complete |
| **B3** | Stage aliases — `coerceLegacyStage` + 3 main.js call sites, `LEGACY_TAB_MAP` + its call site, `"Blueprint"` and `"Frame"` from `STAGE_VALUES`. `"Delivery"` stays (separate ARI-era defensive-tolerance) | ✅ Complete |
| **C** | `hasContent` helper added to `studyAdvancement.js`; 4 `!!flattenAnswerValue(...)` truthiness sites swapped; `flattenAnswerValue` import dropped. Semantically verified vs `!!flattenAnswerValue` across 17 inputs — 16/16 reachable cases match | ✅ Complete |
| **D1** | Schema chunk — `last_touched_position` and `thresholds_seen` columns added (v23 migration, both in `SERMON_COLUMNS`, NOT in `SPINE_ONLY_COLUMNS` — renderer-written via `persistUpdate`). Schema docs updated | ✅ Complete |
| **D2a** | `sermonState.js` helper — derivation helpers for question states, study outcomes, study unfinished, current position, thresholds-seen | ✅ Complete |
| **D2b** | `useEsvPassage` hook extracted to `src/utils/useEsvPassage.js`; PassagePopup refactored to consume it. One fetch path | ✅ Complete |
| **D2c** | `SermonWorkspace.jsx` render rewrite — replaced tab/trail render with writing surface + map + threshold overlays. `SermonWorkspaceFixture.jsx` added with three scenarios (empty / populated / at-handoff) all verified through the real render path. `beforePositionChange` async hook added to `SermonWritingSurface` | ✅ Complete |
| **D2d** | Notebook drawer — `WorkspaceNotebookDrawer.jsx` + CSS, mounted in `SermonWorkspace` as overlay, summon control in writing-surface chrome (quiet mono text link near save indicator per option i), stage→column dispatch (`notebook_study` / `notebook_blueprint` / `notebook_manuscript`) | ✅ Complete |
| **D2e** | Contract test updates — `process-2-evidence-gated-ux.test.tsx` updated (selector swap `.tw-shell` → `.sws-shell`, test names refreshed). `process-3-movement-visible.test.tsx` rewritten against the threshold vocabulary (`.ssl-overlay`, `.sah-overlay`, no `movement-event` testid) with the meta-test inverted as the no-narration tripwire; Process Contract #3 rearticulated in `docs/CORE.md` per open question 7 option B. `trail-layer-integration.test.tsx` leaves intact; dies with E | ✅ Complete |
| **E** | Delete trail UI files (`StudyTrailExegesis.jsx`, `AssemblyTrail.jsx`, `ManuscriptTrail.jsx`, `WorkspaceTrailMap.jsx`, `studyTrail.css`, `AdvanceGateChecklist.jsx` + test). Shipped 2026-05-17 as an atomic 12-file delete: the listed 6 trail UI files + `studyTrailShared.jsx` (full-deleted, no extract — grep proved zero external callers for the 3 candidate era-2 helpers) + 3 tab orphans (`StudyTab.jsx`, `AssemblyTab.jsx`, `ManuscriptTab.jsx` — unmounted since D2c) + `trail-layer-integration.test.tsx`. **Tour cleanup was pulled out of E as its own separate phase** (touches IPC + spine + allowlists; entangled with E only because the trail was the tour's caller) — now shipped, see the Tour-cleanup row below. **Known open gap (Path A):** Assembly/Outline, Assembly/Equip, Manuscript stages have no registered field defs in the writing surface; field-def extraction tracked as a separate initiative | ✅ Complete |
| **Tour cleanup** (post-E rider) | Atomic chunk shipped 2026-05-17. Deleted the tour engine — `TourContext.jsx`, `TourOverlay.jsx`, `workspaceTourStops.js` — and renamed `electron/tourData.js` → `electron/sampleData.js` with record-ID prefix rename `tour-*` → `sample-*` (5 list-query SQL filters + 3 in-handler filters all aligned with the new prefix). IPC `load-tour-sermon` → `load-sample-sermon` (handler + spine export `loadSampleSermon` + Dashboard caller + test-spine fixture + 2 allowlists in `scripts/spine-integrity.js` and `eslint-plugin-sermonforge/lib/rules/no-direct-database.js` all aligned). `remove-tour-sermon` IPC + `removeTourSermon` spine export retired (per-caller classification: purely tour-teardown — `App.jsx`'s `leaveTour` callback was the only caller; sample-sermon path is self-cleaning via delete-then-insert inside `load-sample-sermon`). `TOUR_STEP` telemetry constant retired (no source emitter). `fieldKeyToTourId` retired (no callers post-trail-deletion). `SermonWorkspace.jsx` no-op `useTour()` call deleted, closing the D2c debt. Dashboard's "Take the guided tour" ExploreRow removed; **"Open a sample sermon" Dashboard feature survives end-to-end** via the renamed plumbing. Two tracked follow-ups recorded as separate initiatives: BTI `tour-step` impact (`beta-testing-initiative.md` + `privacy.md` carry commitments to the deleted event), sample-sermon-landing UX (seed currently lands the curious pastor on `.ssl-overlay` because it has no `thresholds_seen`) | ✅ Complete |
| **F** | Wall layer deleted from `studyAdvancement.js` — `evaluateAdvance`, `formatAdvanceRejection`, `formatTabRejection`, the **7** `check*Threshold` wrappers (spec originally said 5; grep confirmed 7 — corrected here), `buildSubPhaseEvidence`, `buildStageEvidence`, plus orphans `canonicalSubPhase` + `subPhaseToIndex`. `answeredQuestions` in `studyFields.js` deleted alongside (zero non-wall callers — see resumption note below). **Kept:** the **8** composite gate functions (spec originally said 9; live count is 8 — corrected here) as the surviving completeness contract per the spec's deliberate decision. **Atomic test changes:** `process-2-evidence-gated-ux.test.tsx` dropped its `evaluateAdvance` unit-test blocks (kept the writing-surface render tests at the top); `sprd-c3-sermon-frame.test.tsx` deleted entirely. **Verification:** lint baseline holds at 23 `no-raw-button` (D2c/D2d debt unchanged); 41/41 contract test files pass / 262/262 tests pass; preview clean on `/`, `?workspace=populated`, `?workspace=empty`; grep `src/` for deleted symbols → zero callsites | ✅ Complete |
| **G** | Spine relaxation closed — `electron/main.js transitionState` had its three rejection blocks deleted (Process #2 empty-evidence; Process #1 stage forward-to-prior; Process #1 sub-phase forward-to-prior). The `isLegacySermon` + `getLegacyEvidenceCutoff` + `_legacyEvidenceCutoffCache` machinery deleted with them (sole consumer was the deleted rejection plus a `legacy:` field on sermon responses with zero readers). The renderer-side spine.ts wall fragments deleted in lockstep: `PROCESS_1_INVALID_DIRECTION` throw, dead no-op empty-evidence block, `evidence` + `direction` fields on `TransitionInput`. `Sermon.legacy: boolean` field removed from `src/core/contracts.ts` (zero readers). v17 migration's `legacy_evidence_cutoff` meta-insertion gravestoned — deployed databases retain the meta row as orphaned residue (no runtime code reads it). Test-spine fixture stripped of the rejection-mirror blocks + `setLegacyEvidenceCutoff` + `isLegacy` + the `legacy:` field. Two contract test files deleted entirely (`process-1-monotonic.test.ts`, `process-2-evidence-gated.test.ts`) atomically with their source. CORE Process Contracts #1 + #2 rearticulated in the docs anchor-update: #1 to "monotonic in expectation, not enforcement"; #2 to "a sermon is complete when its load-bearing artifacts exist" — the composites kept across F become CORE-canonical here. Honest acknowledgment in CORE: completeness *surfacing* is in progress, not finished — composites are uncalled today because the workspace-wide "is the sermon done" surface is opportunistic future work. Verification: lint baseline holds at 23 raw-button violations (D2c/D2d debt unchanged); 39/39 contract test files pass / 247/247 tests pass; preview clean on `?workspace=populated` (writing surface unaffected — it never called transitionState); grep src/ + tests/ + electron/ for deleted symbols → zero live callsites | ✅ Complete |

### Hard commitments locked through D2 (must survive into E/F/G)

These are load-bearing across the remaining sweep phases. Drift on any of them re-imports
the era 3 walls or undoes the calm-surface work.

- **No wall-function imports from the new surface.** Nothing in `SermonWorkspace.jsx`, the
  writing surface, the map, the threshold overlays, the notebook drawer, or `sermonState.js`
  imports or calls `evaluateAdvance`, `formatAdvanceRejection`, `formatTabRejection`,
  `buildSubPhaseEvidence`, `buildStageEvidence`, or any `check*Threshold` wrapper.
  Chevron-next is pure `walkOrder.nextField()` traversal. Map jumps are direct position
  writes. The new surface inherits free navigation from day one; F's wall deletion has
  nothing to disconnect from new code.

- **`thresholds_seen` is the single mechanism for "has this threshold been dismissed."**
  Both sermon-start and the Study→Anchor handoff read from and write to the same
  `thresholds_seen` JSON array column. No boolean-per-threshold proliferation. No
  position-string proxy. Stable threshold ids defined in `sermonState.THRESHOLD_ID`.

- **`beforePositionChange → flush → await → settle` chain at every position-change
  trigger.** The chain is wired in D2c for chevron-advance, map-jump, unmet-state door,
  handoff jump-to-unfinished, and "go write it" on missing required outcomes. Each trigger
  calls `beforePositionChange` (which calls `persistUpdate` directly to flush the renderer's
  debounced save), awaits it, then updates position. Draft is on disk before the surface
  re-renders.

- **Notebook drawer wired with stage→column dispatch.** `notebook_study` for Study,
  `notebook_blueprint` for Assembly (column name preserved from pre-restructure schema),
  `notebook_manuscript` for Manuscript. Summon control is a quiet mono text link near the
  save indicator in the writing-surface chrome (option i — chosen because option ii adds a
  second floating control competing with the map button, and option iii hides the affordance
  and fails the return-after-break test).

- **`useEsvPassage` is the one-path ESV fetch + cache.** Both `PassagePopup` and the
  writing surface's passage column consume the same hook. No second fetch path.

- **`current_step` deleted (B2) vs `last_touched_position` added (D1) — distinguish by name
  and caller.** Same conceptual role (position state), opposite fates. The sweep's
  inventory step grepped both by name. Do not delete by association or spare by association.

- **`answeredQuestions` per-caller classification (resolved Phase F, 2026-05-17).**
  Grep against the live `src/` tree at F's execution found zero non-wall callers
  (the only production call site was `buildSubPhaseEvidence`, deleted with the
  wall). Map state derivation in `sermonState.js` uses `hasContent` directly,
  not phase-wide iteration. Per the spec's pre-F instruction ("preserve if any
  non-wall caller exists"), the condition for preservation failed, so the
  function was deleted as part of F's atomic chunk.

- **`"Delivery"` stays in `STAGE_VALUES`.** Separate ARI-era defensive-tolerance, out of
  scope for the trail deletion sweep. Decide by name and origin, not by association with
  `Blueprint` / `Frame` (which DID go in B3).

- **`hasContent` is a true content-presence check, not a wrapper.** Independent
  implementation in `studyAdvancement.js`, semantically verified vs `!!flattenAnswerValue`
  across 17 input cases — 16/16 reachable shapes match; the 1 unreachable edge case
  (`[{}]` bare-empty-object array) is the JSON.stringify fallback path no composite call
  site produces.

### Discipline rules carried forward

- **Per-phase authorization.** Each phase gets its own go-ahead from the preacher.
  Self-authorization of destructive phases is forbidden.
- **Atomic chunks.** Source + tests + docs touched together. No knowingly-broken state
  between phases — if a chunk deletes a function, the tests for it die in the same chunk.
- **Per-phase verification.** Preview boots clean after each phase; the relevant surface
  renders unchanged or as intended; tests updated in-chunk.
- **Name-discipline.** When two columns / functions / surfaces have the same conceptual
  role but opposite fates (delete vs keep), distinguish by name and caller — not by
  association. Grep both. Verify each caller.
- **Surface design questions, don't resolve silently.** If a phase surfaces something that
  needs a real decision (not a bug, a design call), stop and surface it. The Process
  Contract #3 question in D2e was surfaced rather than silently resolved (open question 7
  above), and was resolved by the preacher choosing option B — a worked example of the
  discipline in action.
- **Gravestone comments.** Every deletion site carries a one-line comment naming its phase
  (B1/B2/B3/C/D1/D2c/etc.) so future readers can grep by name and see what went where and
  why.

### Resumption notes

**The sweep is closed (2026-05-18).** When future sessions look back at this
document:

1. Read the "Sweep status" + closed-state block above before reading the
   phase table — the table is now historical record, not a tracker.
2. F shipped 2026-05-17 (`f7da591`); G shipped 2026-05-18 (`6dc605b`).
   The trail is gone, the wall layer is gone, the spine-side advancement
   gates are gone. The eight composites kept across F are the surviving
   completeness contract per CORE Process #2 (rearticulated 2026-05-18).
3. No phase is "next." If new invisible-system work surfaces, it gets its
   own charter — this sweep does not extend.
4. Open work that came out of the sweep — completeness-contract surfacing,
   field-def extraction, lint debt, BTI tour-step impact, sample-sermon
   landing UX, SAMPLE_ID_PREFIX extraction — is tracked in memory under
   its own initiative entries. None of it is gated by the sweep.
5. Memory file at `~/.claude/projects/C--Projects-SermonForge/memory/MEMORY.md`
   indexes project state; the entry pointing to this initiative was
   updated when G closed.
