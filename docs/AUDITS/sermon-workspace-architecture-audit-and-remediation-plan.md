# Sermon Workspace — Architecture Audit & Remediation Plan

> **Status:** Audit only — no code changed, no branch created. Produced in response to
> `docs/AUDITS/cc-architecture-audit-remediation-prompt.md`, testing the hypothesis in
> `docs/AUDITS/sermon-workspace-architecture-fragility-report.md` against the code at HEAD
> (commit `6e8f013`). **Authority:** `docs/CORE.md` is the sole normative law throughout;
> `docs/PASTORS-CHARTER.md` was used only as an experiential lens. Nothing here is authorized
> to ship until a specific batch is approved.
>
> **Method:** a 7-lens evidence sweep (authority · completion · navigation · persistence ·
> field-model · component-boundaries · data-shape) read the real source at HEAD; every finding
> was then independently, adversarially re-verified against the remediation ledger
> (`workspace-audit-remediation.md`), `docs/CORE-CHANGELOG.md`, the canon, and the live code —
> 53 findings raised, **15 CONFIRMED / 28 REFINE / 10 DISPUTED**. A separate agent inventoried
> existing test coverage. Line numbers below were verified at HEAD; where the prior UX/content
> audits (`sermon-workspace-audit.md` W1–W12, `redemptive-thread-implications-audit.md` R1–R10)
> already shipped a fix in `6e8f013`, that is stated and the item is not re-raised.

---

## Deliverable 1 — Architecture audit

### 1. Executive summary

**Is the architecture fragile? Partly — but far less, and far less urgently, than the hypothesis feared.**

The product philosophy is coherent and the implementation largely honours it. The acute,
pastor-facing failures the fragility report anticipated are, at HEAD, **already closed** —
most of them by the M2 completeness ruling and the `6e8f013` remediation two days ago. Of 43
findings that survived adversarial verification (CONFIRMED + REFINE), **36 are Low severity, 6
Medium, 0 High, and exactly one is pastor-facing today** (and that one is cosmetic). The
remaining risk is real but **latent: maintainability and drift, not live malfunction.** A
developer, not the pastor, is the exposed party.

- **Where it is strongest.** Persistence and local-first safety. The report's Lens-4 worries
  are essentially all disproved at HEAD: the W4 load-failure branch shipped and is distinct
  from "Sermon not found" ([SermonWorkspace.jsx:623-650](src/components/SermonWorkspace.jsx));
  N/A disables-but-never-wipes typed content ([studyFields.js:610-619](src/utils/studyFields.js));
  delete is a soft tombstone with a two-step confirm and a dashboard Undo
  ([main.js:2429-2444](electron/main.js), [DeleteButton.jsx:25-84](src/components/primitives/DeleteButton.jsx));
  the close/quit flush chain closes the 800 ms debounce window on both authoritative exit paths
  ([main.js:1642-1650](electron/main.js), [main.js:3986-3996](electron/main.js)). Navigation is
  also sound: there is **one** live position writer and **one** read-derivation from the
  workspace's perspective. Completion truth is consolidated in one file and all four surfaces
  agree on the Observation Set after M2.

- **Where it is most fragile.** Two coupled seams, both latent:
  1. **The workspace shell is a god component** — `SermonWorkspace.jsx` is 977 lines holding
     ~16 `useState`, 4 `useEffect`, ~24 handlers, and every concern from load through delete
     ([SermonWorkspace.jsx:130-611](src/components/SermonWorkspace.jsx)).
  2. **Workspace state shape is understood in two hand-synchronised places.** One writing
     surface fronts eight incompatible answer stores via a `q.kind` switch
     ([SermonWritingSurface.jsx:583-689](src/components/SermonWritingSurface.jsx)), and
     `sermonState.js` re-implements the same eight-way switch for map/completion state
     ([sermonState.js:89-272](src/utils/sermonState.js)). N/A alone has three persisted
     representations. Add a kind and forget the second branch → the field reads "unanswered"
     forever, silently, with no error.

- **Highest-risk seam.** The **completion/state derivation layer** in `sermonState.js`
  crossed with that eight-kind lockstep. It is the load-bearing single-source, it is where the
  M2 alignment lives, and it is untested for cross-surface consistency — so a future edit can
  silently re-open the exact false-completion asymmetry M2 just closed with every suite green.

- **Most urgent pastor-facing risk.** Effectively none is acute. The closest is cosmetic: the
  Study→Anchor handoff card labels a Study outcome "produced" (paragraph written) while Finish
  still lists the identically-named artifact as open (paragraph **plus** every per-unit cell) —
  but the same handoff screen lists the empty cells under "Left behind," so the surfaces do not
  actually contradict each other ([completion, §2 residue](#i)).

- **Most urgent long-term maintainability risk.** The cluster of **reintroduction hazards**:
  dead-but-exported completeness functions with stale rationale comments, a stale "eight/six
  composites" count in source, a dead **public** field-normaliser that silently drops the N/A
  flag, and two green-but-dead test files. None hurt today; each is a loaded trap a future
  developer can pick up and re-wire into a live regression — including re-opening M2.

**Bottom line:** consolidate the drift surfaces and pin the completion/kind invariants with
tests before layering more walk refinement on top. Do **not** rewrite; stabilise incrementally.

---

### 2. Confirmed fragility points

Ordered by leverage. Severity is the verified (post-adversarial) rating. "Latent" means no
pastor sees it today; the exposure is a future developer/edit.

---

#### A. `SermonWorkspace.jsx` is a god component — ~19 responsibilities in one 977-line shell
- **Severity:** Medium · **Area:** component boundary · **Latent** (not pastor-facing) · no live confirmation needed
- **What the pastor experiences:** Nothing today. The risk is that a change to one concern
  (say, a navigation tweak) sits inches from unrelated ones (save, thresholds, completion) and
  can perturb them — the class of accident that let the ref-vs-state save-base asymmetry (K1)
  go unnoticed.
- **What the code does:** One component co-locates load + StrictMode-race guard
  ([:130-208](src/components/SermonWorkspace.jsx)), tag/series context ([:212-219](src/components/SermonWorkspace.jsx)),
  the `persistUpdate`/`debouncedSave`/`handleUpdate` spine ([:221-259](src/components/SermonWorkspace.jsx)),
  close-flush registry ([:238-248](src/components/SermonWorkspace.jsx)), position + threshold
  writes ([:320-351](src/components/SermonWorkspace.jsx)), seven region write handlers
  ([:377-493](src/components/SermonWorkspace.jsx)), notebook ([:505-510](src/components/SermonWorkspace.jsx)),
  export ([:552-574](src/components/SermonWorkspace.jsx)), mark-preached ([:578-581](src/components/SermonWorkspace.jsx)),
  delete ([:600-611](src/components/SermonWorkspace.jsx)), and all five overlay jumps
  ([:353-590](src/components/SermonWorkspace.jsx)).
- **Mitigating (why Medium, not High):** the shell/surface boundary is *sound* — the surface
  receives fully-derived props and holds no mutations ([:863-896](src/components/SermonWorkspace.jsx));
  the heavy logic already lives in modules (`spine`, `sermonState`, `hooks`, `closeFlush`,
  `studyFields`); the save primitive is already half-extracted to
  [`spine.ts:386-421`](src/core/spine.ts). This is a coordinator that grew, not a monolith — so
  the fix is incremental hook extraction, not a redraw.
- **CORE:** architecture concern — no direct CORE violation.

---

#### B. Content definitions carry behavioural rules (storage, completion, N/A, rendering)
- **Severity:** Medium · **Area:** field-model / content-carries-behaviour · **Latent** · no live confirmation
- **What the pastor experiences:** Nothing today. The risk is a maintenance mis-edit: because
  behaviour config sits in the same object literals as pastor-facing prompt copy, a structural
  slip while editing a field def can relocate an answer, flip whether a point counts as
  answered, or add/remove an N/A toggle — with no error and no visible signal.
- **What the code does:** In the field-def files, `section` sets the storage address
  ([sermonManuscriptFields.js:54](src/utils/sermonManuscriptFields.js), read/written at
  [SermonWritingSurface.jsx:658-667](src/components/SermonWritingSurface.jsx) and
  [sermonState.js:220-224](src/utils/sermonState.js)); `gating:false` sets completion math
  ([sermonEquipFields.js:73](src/utils/sermonEquipFields.js), consumed at
  [sermonState.js:182-184](src/utils/sermonState.js)); `kind` selects the whole renderer/store
  (the 8-way dispatch, [SermonWritingSurface.jsx:583-689](src/components/SermonWritingSurface.jsx));
  `naAllowed`/`naLabel` drive the N/A affordance ([sermonManuscriptFields.js:87-95](src/utils/sermonManuscriptFields.js)).
- **Refinement (why not "catastrophic"):** the report's word *silently* is overstated — each
  flag is a **discrete object key**, not a value parsed from the prompt string, so a pure prose
  edit cannot flip behaviour; the residual risk is a structural fat-finger. Two centralisations
  already contain it: `isManuscriptNaAllowed` is the single N/A allowlist
  ([sermonManuscriptFields.js:187-195](src/utils/sermonManuscriptFields.js)) and
  `STAGE_SUBPHASE_TO_COLUMN` the single region→column map
  ([sermonState.js:44-57](src/utils/sermonState.js)). The one genuinely copy-carries-meaning
  string is `naLabel`, which encodes the ruled strict "satisfied another way" semantics.
- **CORE:** architecture concern — no direct CORE violation. (Do **not** adopt the report's §9
  "split every field into five files" remedy — for a one-pastor local-first app that is
  over-engineering.)

---

#### C. Eight incompatible answer stores under one surface, mirrored in two hand-synced places
- **Severity:** Medium · **Area:** data-shape · **Latent** · no live confirmation
- **What the pastor experiences:** Nothing today. **Concrete future failure:** a developer adds
  a new question `kind` to the field defs and wires its render branch but forgets the matching
  branch in `sermonState.deriveQuestionStatesFromSermon`. The new field then falls through the
  default text-prompt path, reads an empty region column, and shows **"unanswered" forever** on
  the map and the Study→Anchor handoff — no thrown error, no tell.
- **What the code does:** `renderQuestion` dispatches on `q.kind` across eight stores —
  text-prompt `{value,na}` envelope, cumulative-synthesis-table (thought-units array + per-cell
  `<col>_na` sidecars), indented-canvas, outline-builder (`outline`), functional-elements
  (`functional_elements`), manuscript-prose (`manuscript` plain strings + `<key>_na` sidecars),
  manuscript-transitions, sermon-title (`title`) — at
  [SermonWritingSurface.jsx:583-689](src/components/SermonWritingSurface.jsx). The same eight-way
  switch is re-implemented for map/completion state at
  [sermonState.js:89-272](src/utils/sermonState.js). N/A has three distinct persisted shapes.
- **Not a "unify everything" target:** the native columns exist deliberately to feed the Word
  export; the fix is a **kind-parity guard** (test/lint that every kind has a branch in both
  places), not a store merge.
- **CORE:** architecture concern — no direct CORE violation (all shapes pastor-authored; Mutation #1 holds).

---

#### D. Vestigial parallel position subsystem, still labelled "canonical"
- **Severity:** Low · **Area:** navigation / data-shape · **Latent** · no live confirmation
- **What the pastor experiences:** Nothing today. **Latent bug:** a future "where is this
  sermon" surface (a status badge, a richer resume card) built on `current_stage` /
  `current_sub_phase` / `sermon.position` — trusting the schema's "canonical" label — would
  render **every in-progress sermon as Study/Observe**, because nothing advances those columns
  after creation.
- **What the code does:** `transitionState` ([spine.ts:322](src/core/spine.ts)) and its
  main-side handler ([main.js:2557-2618](electron/main.js)) form a complete position-writing
  machine (writing `current_stage`/`current_sub_phase` + per-stage `last_study/assembly/manuscript_subphase`)
  that has **zero renderer callers**. The live walk writes position solely via
  `last_touched_position` ([SermonWorkspace.jsx:320-351](src/components/SermonWorkspace.jsx)) and
  reads it solely via `deriveCurrentPositionFromSermon`
  ([sermonState.js:411-421](src/utils/sermonState.js)). Yet `getSermon` still builds
  `sermon.position` from the frozen columns ([main.js:2043-2052](electron/main.js)), the FTS
  handler still ships `current_stage`/`current_sub_phase` in its result payload
  ([main.js:1991-1992](electron/main.js)) with **no consumer**, and
  [schema.md:111-112](docs/REFERENCE/schema.md) labels the frozen columns "Canonical process
  position."
- **Already known:** [refoundation-initiative.md:174](docs/PROPOSALS/refoundation-initiative.md)
  records the `last_*_subphase` columns as "spine-written / renderer-orphaned … a 'renderer
  derives' mechanism that is fiction." The drift is tracked, not novel.
- **CORE:** State #2 is **not** violated (position remains queryable). This is schema-doc-vs-code
  drift + dead exported code, not a contract breach — the report's Lens-3 "competing writers
  clobber each other" mechanism is **disproved** (see §3 below); this vestigial subsystem is the
  real, narrower residue.

---

#### E. Dead-but-exported completeness functions + stale "eight/six composites" comments
- **Severity:** Low · **Area:** completion / authority (drift surface) · **Latent** · no live confirmation
- **What the pastor experiences:** Nothing today. **Reintroduction hazard:** a developer reading
  the stale comments or the live export could re-wire `checkField3Composite` back into the
  completeness roll-up — re-imposing a stricter Observation-Set bar at Finish than the map /
  handoff / reference-pane apply, i.e. **re-opening the exact M2 false-completion asymmetry**.
- **What the code does:** `checkField3Composite` is exported ([studyAdvancement.js:110](src/utils/studyAdvancement.js))
  with **zero production callers** (the roll-up deliberately excludes it,
  [sermonState.js:21-24,333,382](src/utils/sermonState.js)); its rationale comment
  ([:37-40](src/utils/studyAdvancement.js)) claims the map "will legitimately ask" it, which is
  counterfactual — the map derives Divisions inline at
  [sermonState.js:135-152](src/utils/sermonState.js). `checkField3Composite` is the **only**
  dead-but-present composite — `checkIntroComposite`/`checkConclusionComposite` were already
  deleted with the Frame collapse (only a gravestone remains,
  [studyAdvancement.js:198-205](src/utils/studyAdvancement.js)); the file exports exactly six
  functions (Field3/Field8/Phase4Field4/Field5/MPT/MPS). Three stale count comments survive:
  [studyAdvancement.js:24](src/utils/studyAdvancement.js) ("eight composite gates"),
  [:30](src/utils/studyAdvancement.js) ("consumes all eight"), and
  [:205](src/utils/studyAdvancement.js) ("names SIX composites") — the live count is **five**
  ([CORE.md:207-208](docs/CORE.md), [sermonState.js:390-401](src/utils/sermonState.js)). The M2
  remediation swept doc phrases only ([workspace-audit-remediation.md:146](docs/AUDITS/workspace-audit-remediation.md)),
  never these source comments.
- **CORE:** strains CORE "The Test" Q5 ([CORE.md:347-350](docs/CORE.md)) — orphans must be handled
  or tombstoned; the dead exports + stale rationale are precisely what Q5 exists to catch.

---

#### F. Two field→questions normalisers that disagree — and the **public** one is the dead, wrong one
- **Severity:** Medium · **Area:** field-model · **Latent** · no live confirmation
- **What the pastor experiences:** Nothing today. **Trap:** a developer reaching for "the
  field-to-questions helper" lands on the authoritative-sounding **public export**, which
  silently drops the N/A flag and the map label.
- **What the code does:** The live normaliser `normalizeField`
  ([walkOrder.js:59-73](src/utils/walkOrder.js)) is **private**, reachable only via the pre-baked
  `WALK_ORDER`; it carries `mapLabel` and `naAllowed` onto the synthesised `primary` question.
  The second normaliser `fieldQuestions` ([studyFields.js:558-563](src/utils/studyFields.js)) is
  **public** (`export function`) with a general-purpose doc comment — but has **zero callers**
  (its only historical caller `flattenToText` was deleted, [studyFields.js:986-992](src/utils/studyFields.js))
  and **drops both** `mapLabel` and `naAllowed`. `cross_refs` and `commentary` carry the exact
  field-level `naAllowed:true` ([studyFields.js:179-180](src/utils/studyFields.js)) that
  `fieldQuestions` would discard. Related: **nine** hint-only fields still rely on the
  `normalizeField` shim rather than an explicit `questions` array (self-labelled tracked debt,
  [walkOrder.js:49-58](src/utils/walkOrder.js)).
- **CORE:** architecture concern — latent Surface #1 (N/A affordance) hazard if the dead export is rewired.

---

#### G. `schema.md` version ledger is internally self-contradictory (says v32; code ships v33)
- **Severity:** Low · **Area:** data-shape / authority (doc-drift) · **Latent** · no live confirmation
- **What the pastor experiences:** Nothing. A developer trusting the schema reference would
  believe the DB is at v32 and would not know `last_manuscript_subphase` exists as a column.
- **What the code does:** `runMigrations()` ships v33 — `if (version < 33)`, adds
  `last_manuscript_subphase`, rewrites legacy Equip/Frame positions, sets `schema_version='33'`
  ([main.js:1376-1421](electron/main.js)); the column is in `SERMON_COLUMNS`/`SPINE_ONLY_COLUMNS`
  ([contracts.ts:354,433](src/core/contracts.ts), mirrored in
  [contracts.cjs:123,166](electron/contracts.cjs)). But [schema.md:3](docs/REFERENCE/schema.md)
  reads "Current schema version: **32**", the version table [:7-25](docs/REFERENCE/schema.md) has
  no v33 row, and the sermons table [:118-119](docs/REFERENCE/schema.md) has no
  `last_manuscript_subphase` row — even though its own already-corrected rows (from remediation
  item S4) reference "the v33 migration" and "the new `last_manuscript_subphase` column." S4
  fixed four row descriptions but never the header, table, or column definition.
- **CORE:** architecture concern — no CORE violation (CORE outranks reference docs; the doc is the bug).

---

#### H. `searchHints.js` hard-codes canonical stage/sub-phase names instead of importing the enums
- **Severity:** Low · **Area:** authority (repetition surface) · **Latent** · no live confirmation
- **What the pastor experiences:** Nothing today (all literals currently match the enums).
  **Future:** if a `STAGE`/`SUB_PHASE` value is renamed in `contracts.ts`, the stale literal
  makes `firstFieldFor` find no match, the search-result landing is silently skipped, and the
  pastor lands at his last-touched position instead of the snippet's promise.
- **What the code does:** `HINT_MAP` hard-codes `{ stage:"Study", subPhase:"Observe" }` etc. as
  bare literals ([searchHints.js:11-41](src/utils/searchHints.js)) and does **not** import
  `STAGE`/`SUB_PHASE` — unlike its peers `walkOrder.js` and `sermonState.js`
  ([walkOrder.js:37](src/utils/walkOrder.js), [sermonState.js:26](src/utils/sermonState.js)).
  The literals cross the module boundary into a strict-equality match
  ([walkOrder.js:136](src/utils/walkOrder.js)) via
  [SermonWorkspace.jsx:181](src/components/SermonWorkspace.jsx), so the duplication is
  load-bearing, not an inert island. The in-file comment defending the choice is a self-authored
  tradeoff, not a governance-recorded rationale.
- **CORE:** strains State #5 (one name per concept; vocabulary is part of state) and Surface #1.

---

#### I. <a id="i"></a>Sibling completion dual-definition (the one pastor-facing item — cosmetic)
- **Severity:** Low · **Area:** completion · **Pastor-facing now** (mildly) · no live confirmation
- **What the pastor experiences:** The Study→Anchor handoff card can show a Study outcome as
  "produced" while Finish still names the identically-labelled artifact as open. The mismatch is
  **wording only** — the same handoff screen lists the still-empty per-unit cells under "Left
  behind in Study," so the two surfaces do not actually disagree that work remains.
- **What the code does:** `STUDY_NAMED_OUTCOMES` defines each named outcome as the paragraph only
  ([sermonState.js:279-284](src/utils/sermonState.js)); the handoff marks the card "produced" on
  paragraph presence ([StudyAnchorHandoff.jsx:110-141](src/components/StudyAnchorHandoff.jsx)).
  `deriveSermonCompleteness` independently wires the same three labelled artifacts to composites
  that additionally require **every** per-unit cell ([sermonState.js:390-401](src/utils/sermonState.js),
  [studyAdvancement.js:127-196](src/utils/studyAdvancement.js)). No single source binds
  label→completion-definition. The empty cells do reach "Left behind"
  ([StudyAnchorHandoff.jsx:143-175](src/components/StudyAnchorHandoff.jsx)), which is why this is
  cosmetic, not a contradiction.
- **CORE:** Process #2 — the M2 "all surfaces agree on a named artifact" principle is complete
  for the Observation Set but the three siblings share a label across two definitions. **Note:**
  the siblings' composite strictness is *deliberate and documented*
  ([studyAdvancement.js:120-126](src/utils/studyAdvancement.js)); the fix is to unify the
  label→definition source or reword the card, **not** to relax the bar (that is a pastor policy
  ruling, out of the auditor's lane).

---

#### J. The Main Point is stored twice (envelope vs flat `mpt`/`mps`) with hand-maintained sync
- **Severity:** Low · **Area:** data-shape · **Latent** · no live confirmation
- **What the pastor experiences:** Nothing today (the prior sync bug is closed). **Latent:**
  completeness reads the envelope while the Word export reads the flat columns, so any failure of
  either sync point would let Finish report MPT/MPS complete while the export ships blank Main
  Points.
- **What the code does:** Completeness parses the v19 `main_point_pair` envelope
  ([sermonState.js:353](src/utils/sermonState.js), [studyAdvancement.js:209,228](src/utils/studyAdvancement.js));
  the Word export reads flat `sermon.mpt`/`sermon.mps` ([utils.js:192-193](src/utils.js)).
  Agreement is hand-kept in **two** places: the write-path mirror inside `handleAnswerChange`,
  guarded by `col === 'main_point_pair'` ([SermonWorkspace.jsx:409-412](src/components/SermonWorkspace.jsx)),
  and the sample-seed INSERT ([main.js:2704-2723](electron/main.js), whose comment documents a
  *real past drift*). The mirror is single-writer, one-directional, and guarded, so it is
  contained today — but the two-representation split has no single source of truth.
- **Fix direction:** have the export read the envelope directly, retiring both sync points.
- **CORE:** architecture concern — no direct CORE violation.

---

#### K. Three persistence micro-seams (all Low, all latent)
- **K1 — Asymmetric write base (same-column clobber window).** Six content handlers read their
  merge-base from the render-time `sermon` state closure but merge into the always-fresh
  `sermonRef.current` ([SermonWorkspace.jsx:255,382,428,447,463,490,497](src/components/SermonWorkspace.jsx));
  `writePositionAndThresholds` already reads the ref ([:335](src/components/SermonWorkspace.jsx)).
  Under React 18 batching, two writes to the **same** JSON column between two renders would drop
  the earlier one. The sharpest instance: `dismissThreshold` and `writePositionAndThresholds`
  both write `thresholds_seen` by *different* base-read disciplines — a same-column two-writer
  seam the in-code comment already flags ([:342-347](src/components/SermonWorkspace.jsx)). No
  current UI path fires two same-column writes in one tick, so it is latent. **Fix:** read the
  base from `sermonRef.current` in the content handlers too.
- **K2 — Two save-error vocabularies.** The topbar hard-codes a static "Save failed" chip
  ([SermonWorkspace.jsx:817-824](src/components/SermonWorkspace.jsx)) because `SaveState` carries
  only a boolean `saveError` and `persistMutation` discards the error object
  ([spine.ts:388,411-418](src/core/spine.ts)) — so no surface reading `SaveState` can render
  `mapError`'s specific disk-full / file-locked sentence
  ([mapError.js:22-45](src/utils/mapError.js)). Today `mapError`'s "save" context is unreachable
  in production (only in [mapError.test.js:14](src/utils/mapError.test.js)), so the pastor sees
  one consistent chip; the seam only bites if a future path tries to give save failures the
  specific wording other surfaces already get. **Fix (if pursued):** widen the `SaveState`
  contract to optionally carry the mapped message. *(Note: the report's claim that this "bypasses
  the canonical InlineError" is wrong — per CORE #5 and
  [InlineError.jsx:3-5](src/components/InlineError.jsx), a persistent top-level failure's canonical
  home is a banner, not InlineError; the chip is a third surface.)*
- **K3 — Redundant post-flush write.** `persistUpdate` does not cancel the live `debouncedSave`
  timer, so on **mounted** paths — Export ([:557](src/components/SermonWorkspace.jsx)), Retry
  ([:820](src/components/SermonWorkspace.jsx)), a jump ([:285](src/components/SermonWorkspace.jsx)) —
  a queued keystroke timer can fire a second **idempotent** write ~800 ms later (only a brief
  "Saving…" re-flicker). *(The report's cited close/quit mechanism is disproved: those paths tear
  down the renderer right after the flush, [main.js:1643-1650](electron/main.js).)* **Fix:** use
  `debouncedSave.flush()` (which clears the timer, [hooks.js:31-44](src/utils/hooks.js)) at these
  call sites instead of bare `persistUpdate`.
- **CORE:** all three — architecture concern; K1 strains Mutation #1 (spirit), K2 strains
  Mutation #5 (one voice) at the seam level.

---

#### L. Two smaller drift/coupling items (Low, latent)
- **L1 — Handoff visibility keys on coarse position equality.** `showHandoff` fires on
  `position.subPhase === "Anchor"` ([SermonWorkspace.jsx:722-726](src/components/SermonWorkspace.jsx)),
  which matches **both** Anchor fields (`mpt`, `mps`), while the adjacent comment
  ([:719](src/components/SermonWorkspace.jsx)) claims "the first Anchor field." The code is
  actually *correct* (it orients any first entry into Anchor; `hasSeenThreshold` prevents a
  double-show) — the defect is the **misleading comment**, which invites a maintainer to "fix" it
  with a `fieldKey === 'mpt'` clause that would break the correct behaviour. **Fix:** correct the
  comment.
- **L2 — `handleAnswerChange` re-derives its column from the live position.** Its signature
  `(fieldKey, questionKey, envelope)` carries no stage/sub-phase, so it borrows the column from
  `deriveCurrentPositionFromSermon` ([:379-380](src/components/SermonWorkspace.jsx)); the N/A guard
  does the same ([:396](src/components/SermonWorkspace.jsx)). The invariant "answered field ==
  current position" holds today (single caller renders exactly the current field) but would
  misfire if a future surface adds a non-current-field editor. Native-column handlers carry no
  such coupling. **Fix (if a non-current editor is ever added):** pass stage/sub-phase explicitly.

---

#### M. Two stale test files give **illusory** green coverage (test-architecture fragility)
- **Severity:** Low–Medium · **Area:** test architecture · **Latent** · no live confirmation
- **Why it matters:** these tests pass, so they *look* like coverage, but they exercise a code
  path production deleted — a false safety signal, and one is compounded by a wrong claim in
  `ENFORCEMENT_STATUS`.
- **What the code does:** `mutation-1-user-typing-wins.test.ts` and `process-5-ai-augments.test.ts`
  drive the deleted `ai_proposal`/`ai_apply` mutation cycle; production's real handler returns
  `BAD_KIND` for any non-`user_input` kind ([main.js:2643-2667](electron/main.js)). They pass
  **only** because the Path-B test fixture still carries those dead branches
  ([test-spine.ts:501-541](tests/contracts/_helpers/test-spine.ts)). Compounding it,
  `ENFORCEMENT_STATUS.md`'s Mutation #1 row claims `mutation-1` "still passes against the
  simplified one-kind path" — but it actually still exercises the two-kind AI path (doc-vs-test
  drift on top of fixture-vs-production drift). Nothing asserts the fixture's accepted mutation
  kinds match the real spine's.
- **CORE:** strains Process #5 / Mutation #1 enforcement integrity (the tests purport to guard
  clauses whose real mechanism they no longer touch).

---

#### N. Dead FTS read-payload
- **Severity:** Low · **Area:** navigation (cleanup) · **Latent** · no live confirmation
- `searchSermonsFts` SELECTs and ships `current_stage`/`current_sub_phase`
  ([main.js:1967,1991-1992](electron/main.js)) but **no** search-result consumer reads them —
  both consumers derive the landing from the matched column name via `hintFromMatchedColumn`
  ([CompletedSermons.jsx:162](src/components/CompletedSermons.jsx),
  [SermonList.jsx:142](src/components/SermonList.jsx)). Inert dead payload (a facet of D). **Fix:**
  drop the two columns from the FTS SELECT/result shape (keep them in the spine `get` handler,
  which legitimately reads them).

---

### 3. Disputed or unsupported hypothesis items

The fragility report is a **pre-remediation hypothesis**. Its most alarming specific claims do
not hold at HEAD — largely because the M2 ruling and the `6e8f013` remediation closed them two
days ago. These are disputed with evidence:

| # | Report claim | Verdict & evidence |
|---|---|---|
| D1 | **§1:** "Canon says code wins → contradicts CORE → rival authorities" | **DISPUTED.** S5 harmonised premise 4 and the preamble — "code wins" is now scoped to the walk's current shape and subordinated to CORE where no rationale exists, matching CLAUDE.md. [WORKSPACE-CANON.md:9-11,95-98](docs/WORKSPACE-CANON.md); [workspace-audit-remediation.md:121-128](docs/AUDITS/workspace-audit-remediation.md). |
| D2 | **§2:** "clearest suspected fracture — Observation Set false completion" | **DISPUTED.** The M2 ruling closed it: Finish, handoff, reference-pane, and map all treat the Obvious Point as the Observation Set via one `STUDY_NAMED_OUTCOMES` source; `deriveSermonCompleteness` uses the lenient check, not `checkField3Composite`. CORE amended to five composites the same day. Locked by [sermonCompleteness.test.js:104-122](src/utils/sermonCompleteness.test.js). [sermonState.js:385-401](src/utils/sermonState.js); [CORE.md:190-210](docs/CORE.md). |
| D3 | **§2:** "local map logic + handoff-specific logic + Finish-specific logic" duplicated | **DISPUTED.** The three surfaces are render-only prop consumers wired once at [SermonWorkspace.jsx:298-308](src/components/SermonWorkspace.jsx); all derivations live in one file. (The real, narrower residue is three presence *implementations within* that file — see finding I.) |
| D4 | **§2:** "Body map-vs-Finish / transitions-never-counted" gaps | **DISPUTED — ruled intentional.** Map-stricter/Finish-lenient Body and transitions-never-counted are documented rulings ([WORKSPACE-CANON.md:384-390](docs/WORKSPACE-CANON.md), [CORE-CHANGELOG.md:158-163](docs/CORE-CHANGELOG.md)), not defects. |
| D5 | **§3:** "multiple overlapping position systems … can all write or infer position … pastor lands wrong / map and surface disagree" | **DISPUTED (mechanism).** One live writer (`writePositionAndThresholds`→`last_touched_position`), one read-derivation (`deriveCurrentPositionFromSermon`); the spine writer `transitionState` has **zero** renderer callers; map and surface receive the *same* position object in one render ([SermonWorkspace.jsx:656,864-866,916](src/components/SermonWorkspace.jsx)). The columns exist but are renderer-orphaned — that is finding D (latent drift), **not** a clobber. |
| D6 | **§4:** "a load failure can look like 'Sermon not found'" | **DISPUTED — already remediated (W4/S1).** Distinct `loadError` branch with Retry, ordered above the honest not-found branch. [SermonWorkspace.jsx:88-89,199-204,623-650](src/components/SermonWorkspace.jsx). |
| D7 | **§4:** N/A / destructive-action / debounce collapse of failure states | **DISPUTED.** N/A disables-but-preserves ([studyFields.js:610-619](src/utils/studyFields.js)); delete is soft tombstone + two-step confirm + dashboard Undo ([main.js:2429-2444](electron/main.js), [Dashboard.jsx:80-83,266-273](src/components/Dashboard.jsx)); close/quit flush chain closes the debounce window ([main.js:1642-1650,3986-3996](electron/main.js)). |
| D8 | **§5:** "promised one question at a time but experiences a stacked worksheet" | **DISPUTED — remediated (W1/R1).** The field-level walk is now canonical; CORE vocabulary amended and the landing reworded to "one field at a time." [CORE-CHANGELOG.md:88-99](docs/CORE-CHANGELOG.md); [SermonStartLanding.jsx:71](src/components/SermonStartLanding.jsx). *(The architecture residue — the hint→`primary` shim and the dual normalisers — is real and kept as finding F.)* |
| D9 | **§7:** "rendering components make domain decisions" (strong form) | **DISPUTED.** Completion, position, and N/A-allowlist are computed in `sermonState.js` + the shell and passed to the surface as props; a grep of `SermonWritingSurface.jsx` for `parseStructuredField`/`deriveSermonCompleteness`/`checkField*Composite` returns nothing. [SermonWorkspace.jsx:863-896](src/components/SermonWorkspace.jsx). |
| D10 | **§6:** "each region has its own persistence world / save mechanism" | **PARTLY DISPUTED.** Write handlers are region-bespoke (real — finding C/K), but they converge on one spine (`handleUpdate → persistUpdate → persistMutation → updateSermon`); `applyMutation` has zero call sites; no child bypasses `handleUpdate`. The overstated "own save mechanism" half is false. |

**Should still be watched:** D5 and D10 are disputed on *mechanism* but each leaves a genuine
latent residue (findings D and C respectively) — keep those in view even though the alarming
framing is unsupported.

---

### 4. Doc-drift register

Kept separate from code findings. All are developer-facing; none reach the pastor.

| # | Drift | Files / sections | Authority | Governs | Pastor impact | Disposition |
|---|---|---|---|---|---|---|
| DR1 | Version header "32" + no v33 row + missing `last_manuscript_subphase` row, while the file's own rows cite v33 | [schema.md:3,7-25,118-119](docs/REFERENCE/schema.md) | reference doc (below CORE & code) | **code** | none | **Update** header, add v33 row, add the column row (finding G) |
| DR2 | "eight composite gates" / "consumes all eight" / "names SIX composites" | [studyAdvancement.js:24,30,205](src/utils/studyAdvancement.js) | source comment (below CORE) | CORE (five) | none | **Update** to five; delete the dead exports (finding E) |
| DR3 | `checkField3Composite` rationale comment claims a live map consumer that does not call it | [studyAdvancement.js:37-40](src/utils/studyAdvancement.js) | source comment | CORE / M2 | none | **Delete** with the export, or annotate "retired, unwired" (finding E) |
| DR4 | "one question at a time" straggler in the how/where doc | [SYSTEMS/sermon-workspace.md:147](docs/SYSTEMS/sermon-workspace.md) | system doc (below CORE) | CORE (field-level walk) | none | **Update** to "one field at a time" (the S8 sweep missed this file) |
| DR5 | `ENFORCEMENT_STATUS` Mutation #1 row says `mutation-1` "passes against the simplified one-kind path" — it exercises the dead two-kind AI path | [ENFORCEMENT_STATUS.md](docs/ENFORCEMENT_STATUS.md) Mutation #1 row | status doc | code | none | **Correct** the row; fix/retire the test (finding M) |
| DR6 | `contracts.ts`/`.cjs` comment asserts a Blueprint/Frame read-coercion CORE records as **deleted** | [contracts.ts:56-57](src/core/contracts.ts), [contracts.cjs:18-20](electron/contracts.cjs) | source comment | CORE-CHANGELOG (deleted) | none | **Update** the comment to match the read-straight-through reality |
| DR7 *(good drift — no action, cite as precedent)* | Orphaned position columns already documented as "fiction" | [refoundation-initiative.md:174](docs/PROPOSALS/refoundation-initiative.md) | proposal doc | — | none | **Keep** — this doc is *correct* and pre-records finding D |

Which source governs, in every row above: **code** for DR1/DR5/DR6 (reference/status/comment
docs trail the code), **CORE** for DR2/DR3/DR4 (source/system docs trail the amended law). No
CORE clause is itself stale.

---

### 5. Missing context / live-confirmation list

Static review answered almost everything (the verify pass marked essentially all findings
"no live confirmation needed"). The genuinely runtime-only items are small and all latent:

1. **K1 same-column clobber window** — reachability depends on React 18 batching timing; the
   defect is static-reasoned but a live two-writes-in-one-tick repro would confirm the blast
   radius. No current UI path triggers it.
2. **K3 duplicate post-flush write** — the only observable symptom is a brief "Saving…"
   re-flicker after Export/Retry/jump while a keystroke debounce is pending; confirm live.
3. **H search-hint landing skip** — only manifests if a `STAGE`/`SUB_PHASE` value is actually
   renamed; hypothetical until then.
4. **Whole-sermon Undo round-trip** — traced fully in code (finding-adjacent, see D7), but the
   actual dashboard Undo UI round-trip was not exercised at runtime in this audit.
5. **The v33 legacy-position rewrite migration** (`Assembly/Equip`→`Manuscript/Body`,
   `Assembly/Frame`→doors) — verified in source; not executed against a real legacy DB here
   (there are no production sermons, per project memory, so this is low-stakes).

Everything else — dead exports, stale comments, schema drift, the god-component inventory, the
two-place kind switch, the normaliser split — is fully settled by static reading at HEAD.

---

## Deliverable 2 — Remediation plan

> **Superseded 2026-07-02** by the gated Track A–E structure in
> [`sermon-workspace-remediation-governance-plan.md`](sermon-workspace-remediation-governance-plan.md)
> (pastor-requested reshape). Deliverables 2 and 3 below are retained as the reasoning record; the
> governance plan is the execution contract. Deliverables 1 (findings) and 4 (test strategy) stand.

Incremental and approval-gated. Each phase is independently shippable and independently
reversible. The ordering front-loads the **zero-runtime-risk drift/dead-code cleanup** (which
also removes the reintroduction hazards), then the **test pins** that make later refactors safe,
then the **structural extraction**. Persistence/error/nav phases are deliberately light because
the audit found those areas mostly *sound*.

> **Standing constraints for every phase (do not violate):** no gates/blocks/locked-navigation/
> progress-requirements; no AI-generated content or drafting assists; no toasts/step-narration
> outside the three threshold screens; no change to the design system without approval;
> completion **informs, never blocks**.

### Phase 0 — Freeze authority & stop drift *(docs + comments only; zero code behaviour)*
- **Goal:** make it impossible for future work to justify a change from a competing or stale
  authority, and remove the comments that mis-describe the live law.
- **Why now:** cheapest, highest-safety, and it neutralises the reintroduction hazards' *rationale*
  before anyone can act on them. Nothing depends on it; everything benefits.
- **Files:** [studyAdvancement.js:24,30,205,37-40](src/utils/studyAdvancement.js) (stale counts +
  rationale comment), [schema.md:3,7-25,118-119](docs/REFERENCE/schema.md) (DR1),
  [SYSTEMS/sermon-workspace.md:147](docs/SYSTEMS/sermon-workspace.md) (DR4),
  [contracts.ts:56-57](src/core/contracts.ts)/[contracts.cjs:18-20](electron/contracts.cjs) (DR6),
  [ENFORCEMENT_STATUS.md](docs/ENFORCEMENT_STATUS.md) Mutation #1 row (DR5),
  [SermonWorkspace.jsx:719](src/components/SermonWorkspace.jsx) (L1 comment).
- **Principle restored:** CORE as sole authority; one vocabulary; The Test Q5 (no orphaned
  rationale).
- **Pastor benefit:** none directly — protects him indirectly by making the M2 alignment harder
  to reverse.
- **Risks:** near zero (comments/docs). Only risk is mis-stating a count — mitigated by copying
  the live numbers from `sermonState.js`.
- **Verify:** `drift-check.sh`; `npm test` unchanged (297/297); grep confirms no remaining
  "eight composites"/"one question at a time" strays.
- **Do NOT change:** any executable logic; any pastor-facing copy.

### Phase 1 — Delete dead code & centralise the last vocabulary literals
- **Goal:** remove the loaded traps (dead exports, dead public normaliser, dead FTS payload) and
  the last hard-coded vocabulary island.
- **Why now:** riding directly on Phase 0's comment fixes; grep proves zero callers, so deletion
  is behaviour-preserving and the test suite is the safety net.
- **Files:** delete the sole dead-but-present composite `checkField3Composite` (+ its helper
  `canvasHasMainWithModifier`) with a tombstone note ([studyAdvancement.js](src/utils/studyAdvancement.js)) —
  `checkIntroComposite`/`checkConclusionComposite` are **already gone** (gravestone at
  [:198-205](src/utils/studyAdvancement.js)); when the export is deleted, sweep its now-stale doc
  reference at [sermon-workspace.md:383-385](docs/SYSTEMS/sermon-workspace.md) ("still exists… a
  candidate for removal") — CORE.md/WORKSPACE-CANON §5 say "retired from the roll-up," which stays
  true, so confirm-no-change there. Delete or privatise `fieldQuestions`
  ([studyFields.js:558-563](src/utils/studyFields.js), finding F);
  drop `current_stage`/`current_sub_phase` from the FTS SELECT/result shape
  ([main.js:1967,1991-1992](electron/main.js), finding N); import `STAGE`/`SUB_PHASE` in
  [searchHints.js](src/utils/searchHints.js) (finding H).
- **Principle restored:** no orphans (Q5); one name per concept (State #5).
- **Pastor benefit:** none directly; eliminates the paths by which a future edit could re-open M2
  or silently mis-route a search landing.
- **Risks:** low — all deletions are grep-verified zero-caller. `searchHints` enum import is a
  1:1 literal→enum swap.
- **Verify:** `spine-integrity.js`; `npm run lint`; `npm test`; grep each deleted symbol repo-wide
  returns only history.
- **Do NOT change:** the completeness *behaviour* (five composites stays five); the walk shape.

### Phase 2 — Pin completion truth with tests *(the highest-value pin; see Deliverable 4)*
- **Goal:** one enforced completion truth consumed consistently by map, handoff, and Finish —
  so the M2 alignment cannot silently regress.
- **Why now:** must precede any refactor of `sermonState.js`; it is the load-bearing seam.
- **Files (tests, plus optional small refactor):** new `sermonCompletionConsistency.test.js`
  feeding one sermon through `deriveQuestionStatesFromSermon` **and** `deriveSermonCompleteness`
  and asserting per-artifact agreement; a kind-parity test (finding C); a dead-composite tripwire
  (finding E). Optionally introduce **one** shared per-artifact completion helper the three
  presence paths call, resolving finding I's dual-definition (unify the source, or reword the
  handoff card — a copy decision to confirm with the pastor).
- **Principle restored:** one completion engine; The Test Q5.
- **Pastor benefit:** he can never be told "complete" on one surface and "missing" on another for
  the same artifact.
- **Risks:** low (tests). The optional helper refactor is Medium — gate it behind the tests
  landing first.
- **Verify:** the new tests fail before the fix (if the helper is done) and pass after; full suite green.
- **Do NOT change:** the lenient/strict *bars* themselves (that is a pastor ruling); no blocking.

### Phase 3 — Retire or wire the vestigial position subsystem *(decide, then execute; mostly docs)*
- **Goal:** end the "canonical column that is actually frozen" contradiction (finding D).
- **Why now:** it is a standalone latent trap; doing it after Phase 1 keeps the position code
  quiet for Phase 5.
- **Files:** **Option A (recommended):** demote `current_stage`/`current_sub_phase`/`last_*_subphase`
  to documented legacy-on-disk and correct [schema.md:111-112](docs/REFERENCE/schema.md) to name
  `last_touched_position` as the live position field; optionally delete the unused `transitionState`
  writer + handler ([spine.ts:322](src/core/spine.ts), [main.js:2557-2618](electron/main.js)).
  **Option B:** wire `transitionState` into the live navigation so the "canonical" columns are
  actually maintained. Option A matches reality with less code.
- **Principle restored:** State #2 named honestly; docs describe reality.
- **Pastor benefit:** none now; prevents a future status surface from showing every sermon as
  Study/Observe.
- **Risks:** low for the doc half; Medium if deleting the spine handler (touches IPC + contract
  allowlists — keep the columns in the allowlist as legacy).
- **Verify:** `spine-integrity.js`; contract tests; a tripwire test that `transitionState` has no
  renderer caller (finding-D guard).
- **Do NOT change:** `last_touched_position` (the live field); the `userData`-path/migration rules.

### Phase 4 — Normalise the field/question/answer model *(incremental, test-guarded)*
- **Goal:** make CORE's Field→Questions→Answer model explicit where it is still shimmed.
- **Why now:** after the dead normaliser is gone (Phase 1), migrating the nine hint-only fields
  to explicit `questions` arrays is mechanical and low-risk, following the in-repo precedent
  (`gospel_makes_possible` kept `primary` as its first key, [studyFields.js:311-313](src/utils/studyFields.js)).
- **Files:** the nine hint-only fields in [studyFields.js](src/utils/studyFields.js) (Observe:
  `characters`,`commands_declarations`,`big_ideas`,`obvious_point`; Interpret: `recurring_ideas`,
  `character_purpose`,`contrasts`,`cross_refs`,`commentary`); keep `normalizeField` as the
  back-compat path until all are migrated.
- **Principle restored:** field/question separation is real in code, not synthesised.
- **Pastor benefit:** none visible; the walk renders identically. Guards against the
  `obvious_point`/`primary` completion pin breaking silently on a future key rename (finding-I
  adjacent).
- **Risks:** low **only if** each migration keeps the first key `primary` (stored positions and
  the Observation-Set completeness pin depend on it) — add a test asserting the four
  `STUDY_NAMED_OUTCOMES` field/question keys resolve to a declared question.
- **Verify:** `studyFields.test.js`; the map/handoff/Finish suites; visual parity in preview.
- **Do NOT change:** the rendered walk; N/A grants; any key that a stored position or the export reads.

### Phase 5 — Reduce shell fragility by extracting hooks *(the big one; heavily tested)*
- **Goal:** thin `SermonWorkspace.jsx` from a god component to a coordinator that composes hooks.
- **Why now:** after completion (Phase 2) and position (Phase 3) truth are pinned, extraction is
  safe. **Extract save first, navigation last** — persistence is braided into load and every
  navigation jump via the flush-before-navigate contract
  ([SermonWorkspace.jsx:284-286,320-351](src/components/SermonWorkspace.jsx)), so navigation must
  carry the save primitive and preserve ordering (finding-adjacent boundaries#18).
- **Files:** extract `useWorkspaceSave` (the `persistUpdate`/`debouncedSave`/`handleUpdate`/close-flush
  cluster; the save primitive is already half-drawn in [spine.ts:386-421](src/core/spine.ts)),
  then `useWorkspaceCompletion` (memoised selectors), `useWorkspaceThresholds`,
  `useWorkspaceMutations` (the seven write handlers), and `useWorkspaceNavigation` **last**.
- **Principle restored:** single-responsibility seams; a change to one concern stops touching others.
- **Pastor benefit:** none visible; each extraction lowers the chance a future feature edit
  perturbs save/threshold/completion behaviour.
- **Risks:** Medium — the flush-before-navigate ordering, the StrictMode-race guard, and the
  ref-vs-state base (fix K1 as part of `useWorkspaceMutations`) must be preserved exactly. Do one
  hook per PR.
- **Verify:** `process-3-movement-visible.test.tsx`; `process-4-pc-follows-text.test.tsx`; the new
  Phase-2 completion tests; a new reopen/resume test (Deliverable 4); full preview walk.
- **Do NOT change:** behaviour of any kind; this is a pure structural move. No new abstractions
  beyond the hooks.

### Phase 6 — Stabilise the persistence micro-seams *(small, targeted)*
- **Goal:** close K1/K2/K3 — the only persistence defects, all latent.
- **Why now:** cheap to do alongside or after the `useWorkspaceSave`/`useWorkspaceMutations`
  extraction (Phase 5), which touches exactly these handlers.
- **Files:** K1 — read the merge-base from `sermonRef.current` in the six content handlers +
  `dismissThreshold` ([SermonWorkspace.jsx:382-497](src/components/SermonWorkspace.jsx)); K3 —
  swap bare `persistUpdate` for `debouncedSave.flush()` at Export/Retry/jump call sites; K2
  (optional) — widen `SaveState.saveError` to optionally carry the mapped message
  ([spine.ts:388](src/core/spine.ts)) so the topbar chip can speak `mapError`'s specific sentence.
- **Principle restored:** Mutation #1 (no dropped writes), Mutation #5 (one voice at the seam).
- **Pastor benefit:** removes a theoretical dropped-keystroke edge and a "Saving…" flicker;
  enables specific disk-full/file-locked wording on save failure.
- **Risks:** low; K1 must not change cross-column merge behaviour (it already merges the ref).
- **Verify:** `mutation-3-saves-are-events.test.ts`; a new same-column-double-write test; a
  load-failure-vs-not-found test.
- **Do NOT change:** the close/quit flush chain (it is correct); the soft-delete/undo path (correct).

### Phase 7 — Data-shape cleanup *(smallest; opportunistic)*
- **Goal:** retire the Main-Point double storage and confirm no other manual mirror drifts.
- **Why now:** last, because it is the lowest risk-per-value and touches the export path.
- **Files:** make the Word export read the `main_point_pair` envelope directly
  ([utils.js:192-193](src/utils.js)), retiring the write-path mirror
  ([SermonWorkspace.jsx:409-412](src/components/SermonWorkspace.jsx)) and the seed's separate flat
  columns ([main.js:2704-2723](electron/main.js)); leave the flat columns as legacy or drop them
  via migration only if a correctness need appears.
- **Principle restored:** one source of truth per artifact.
- **Pastor benefit:** removes the (currently-contained) risk of "complete" completeness with a
  blank export.
- **Risks:** Medium — touches the export; guard with an export-payload test that MPT/MPS render
  from the envelope.
- **Do NOT change:** the schema columns without a migration; start migrations only if a
  correctness issue forces it (none does today).

---

## Deliverable 3 — Proposed first approval batch

**Recommended first batch: Phase 0 + Phase 1 (drift/dead-code cleanup).** Low-risk, high-leverage,
small, and it removes the reintroduction hazards that could silently re-open M2 — the single
best risk-reduction-per-line available.

- **Findings addressed:** E (dead composites + stale counts), F (dead public normaliser), G/DR1
  (schema v33 drift), DR2/DR3/DR4/DR5/DR6 (doc + comment drift), H (searchHints literals), L1
  (handoff comment), N (dead FTS payload).
- **Exact files:**
  - `src/utils/studyAdvancement.js` — fix counts (:24,:30,:205); delete `checkField3Composite` +
    its helper `canvasHasMainWithModifier` with a tombstone comment (the **only** dead-but-present
    composite; `checkIntroComposite`/`checkConclusionComposite` are already deleted — gravestone at
    :198-205, nothing to remove).
  - `src/utils/studyFields.js` — delete/privatise `fieldQuestions` (:558-563).
  - `src/utils/searchHints.js` — import `STAGE`/`SUB_PHASE`, replace literals.
  - `electron/main.js` — drop `current_stage`/`current_sub_phase` from the FTS SELECT + result
    shape (:1967, :1991-1992).
  - `docs/REFERENCE/schema.md` — version header, v33 row, `last_manuscript_subphase` row.
  - `docs/SYSTEMS/sermon-workspace.md` — ":147" one-field-at-a-time; and, if `checkField3Composite`
    is deleted in this batch, the now-stale ":383-385" "candidate for removal, not yet acted on" note.
  - `src/core/contracts.ts` + `electron/contracts.cjs` — correct the Blueprint/Frame coercion comment.
  - `docs/ENFORCEMENT_STATUS.md` — correct the Mutation #1 row.
  - `src/components/SermonWorkspace.jsx` — correct the `showHandoff` comment (:719) only.
- **Expected diff size:** ~120–180 lines net, mostly deletions and doc edits; no logic rewrites.
- **Rollback risk:** very low. Every code deletion is grep-verified zero-caller; the only
  executable changes are removing dead code and an FTS SELECT column, plus a literal→enum swap.
- **Verification steps:** `npm run lint` (expect 0); `npm test` (expect 297/297 — nothing consumed
  the deleted symbols); `node scripts/spine-integrity.js`; `scripts/drift-check.sh`; grep each
  deleted symbol repo-wide (only history remains); `/sweep-the-house` on the diff; boot the
  preview and confirm the walk + a search-result landing still work.
- **Why safe to do first:** it changes **no** runtime behaviour the pastor can observe, it is
  independently reversible, and it is the prerequisite that makes every later phase safer (dead
  code and stale comments removed before anyone refactors near them).
- **What NOT to touch in this batch:** the god-component extraction (Phase 5); the answer-store
  unification (never — native columns feed the export); any completion *bar* or lenient/strict
  ruling; any pastor-facing copy beyond the confirmed doc-straggler; the position write/read code
  (Phase 3 handles that separately); the two stale test files (fold into Phase 2/6 so the fix
  lands with the assertion that replaces them).

---

## Deliverable 4 — Test strategy (gap-fill, not a wishlist)

Existing coverage is **strong at the util and contract layers** and should not be duplicated:
`sermonCompleteness.test.js` (the nine-artifact roll-up incl. the M2 flush-left-canvas regression),
`sermonNaPolicy.test.js` (N/A grants, per-cell sidecar, canvas-re-derivation survival, map
counting), `sermonBodyGating.test.js` (Body map-gating), `studyFields.test.js` (canvas/cumulative
serialization, thought-unit derivation, block composition), `mapError.test.js` (one-voice error
translation), `SynthesisTable.test.jsx` (the table + two-step delete), and the `tests/contracts/*`
suite (State #3/#5, Surface #1/#4, userData-path, allowlist-sync, `process-3` no-narration
tripwire, `mutation-3` save-events). Build **only** the gaps below.

**Priority 1 — the headline gap: completion-truth consistency across surfaces.**
`deriveQuestionStatesFromSermon` (map/handoff) and `deriveSermonCompleteness` (Finish) live in
separate test files with separate fixtures; **no test feeds one sermon through both and asserts
they agree.** This is exactly the asymmetry M2 fixed — a future edit could silently re-open it
with all suites green. Add `sermonCompletionConsistency.test.js`: for a matrix of sermon states,
assert the map/handoff verdict and the Finish verdict per named artifact are mutually consistent
(finding I, D2/D3).

**Priority 1 — kind-parity guard (finding C).** Assert every `q.kind` present in the field defs
has a branch in **both** `SermonWritingSurface.renderQuestion` and
`sermonState.deriveQuestionStatesFromSermon`. This closes the silent-"unanswered-forever"
fall-through — the concrete failure mode behind the eight-store lockstep.

**Priority 1 — fix the illusory tests + fixture parity (finding M / DR5).** Retire or rewrite
`mutation-1-user-typing-wins.test.ts` and `process-5-ai-augments.test.ts` to the real one-kind
path; add an assertion that the Path-B fixture's accepted mutation kinds match production's
(`user_input` only; non-`user_input` → `BAD_KIND`), converting the fixture-vs-production drift
into a failing test; correct the `ENFORCEMENT_STATUS` Mutation #1 row.

**Priority 2 — dead-export / retired-vocabulary tripwire (finding E, H).** Assert the retired
composites stay out of the roll-up (or, after Phase 1, that they no longer exist); extend the
existing alias-scan to flag canonical stage/sub-phase **string literals** outside the
`STAGE`/`SUB_PHASE` enums (would have caught `searchHints`).

**Priority 2 — position reopen/resume (enforcement gap: State #2 has no test post-G).**
`process-3` only *sets* `last_touched_position` to pick which overlay fires; add a test that the
writing surface actually **resumes at** that field on mount. Add a `transitionState`-has-no-
renderer-caller tripwire (finding D) and an assertion that a user-edit save cannot overwrite a
spine-only column (no-competing-position-writes).

**Priority 2 — load-failure vs not-found (finding D6 guard).** Assert the `loadError` branch
renders distinctly from the not-found branch with a Retry — pinning the W4 fix against
regression, and pinning the distinction the fixture currently collapses.

**Priority 3 — persistence seams (findings K1/K3).** A same-column double-write test (two writes
to `thresholds_seen`/one JSON column in one tick preserve both contributions) for K1; a "no
duplicate write after `flush()`" assertion for K3. **N/A end-to-end wire round-trip:** the util
layer already covers the helpers in isolation; add the missing slice — the `<column>_na` sidecar
through the real save path (parse → `setDivisionsCanvas` → serialize → persist → reload).

**Priority 3 — standing-prohibition guards (partly present; complete them).** The `process-3`
no-`movement-event` meta-test is the narration tripwire — keep it. Add an explicit "completeness
never blocks" assertion (`deriveSermonCompleteness` returns a verdict and never throws/gates); the
`no-direct-ai` lint already guards "no AI-generated content." Together these lock the three
prohibitions the remediation must never cross: **no blocking gates, no AI authorship, no movement
narration outside the three threshold screens.**

---

*Prepared as an audit and remediation plan only. No code was changed and no branch was created.
Await approval of a specific batch (recommended: Phase 0 + Phase 1) before any implementation.*
