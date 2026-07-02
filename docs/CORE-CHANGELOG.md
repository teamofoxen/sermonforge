# CORE — Amendment History

> Provenance for [`CORE.md`](CORE.md). CORE carries the **live law**; the dated
> amendment history that used to sit inline inside its clauses is preserved here so
> the contracts read as current law. Nothing is lost — relocated, not deleted.
> Extracted in the Workspace Re-Foundation Initiative, Phase 1 step 3 (2026-06-14).

---

## Authority Preamble

- **2026-07-01 (doc drift sweep):** corrected the banner, which still described the original
  monolithic `CLAUDE_original.md` as retained for historical reference — the file was deleted
  2026-04-14 (commit `498e511`); the banner now points to git history instead of a dead file.

## Project Identity

- **2026-07-01 (doc drift sweep):** "with a Calendar that assigns sermons to Sundays"
  corrected to "with a Schedule screen that assigns…" — the planner's three screens are
  Outline · Schedule · Study guide; "Calendar" is the canonical name of a separate top-level
  view (State Contract #5: one name per concept).
- **2026-06-21 (Series Planner revival, audit remediation):** the "the Series Planner is a
  stub until that work gets its own charter" clause was retired — the charter now exists
  (`docs/PROPOSALS/series-planner-revival-charter.md`) and the AI-free planner + church-calendar
  scheduling + congregational study-guide export shipped (commit `74406e5`). The Project
  Identity paragraph now describes the planner as a shipped, distinct macro/architect surface
  that stands alongside the sermon workspace, while keeping the sermon as the primary unit.
- **2026-06-10 (UX-overhaul governance batch):** the persona sentence was rearticulated —
  low software confidence made a *binding design constraint* ("when a labeled control and a
  minimal one are otherwise tied, the labeled one wins"); the wording is the pastor's to
  refine.
- **2026-06-10:** the sermon-first identity rewrite. The previous paragraph described a
  series planning room, a Calendar that assigns sermons to Sundays, and reference features
  (Illustrations / Library / Archive) that did not exist at HEAD, and it contradicted the
  ratified "dashboard is re-entry" principle. Replaced with "the sermon is the primary unit
  of the shipped product; the series is carried context." T19 (same day) shipped the
  smallest honest calendar form: clicking a day opens New Sermon with that date pre-filled.
  The planning room + reference features remain a named roadmap direction, not the shipped
  identity; the Series Planner is a stub until that work gets its own charter.

## Non-Negotiable Boundaries — No AI (outbound-call enumeration)

- **2026-07-01 (doc drift sweep):** the drift sweep surfaced that the renderer's CSS
  loaded the app's typefaces from Google Fonts on start (`src/styles/typography.css`
  `@import`) — a previously undisclosed fourth network destination alongside ESV /
  GitHub Releases / BTI, carrying no app or sermon data but not telemetry-toggle
  governed. Disclosed in `docs/REFERENCE/privacy.md`, then **removed the same day**:
  the three font families (36 woff2 files, latin + latin-ext, ~1 MB) now ship inside
  the app at `src/styles/fonts/`, loaded by `src/styles/fonts.css`. The clause's
  enumeration stays at "two other outbound calls," with the fonts episode noted
  parenthetically.

## The Principle — scope note

- **OEM walk, 2026-07-02:** "lives off the surface" refined. The sermon's telos
  (adoration, beholding Christ) still belongs to the preacher and is never measured,
  but the tool now deliberately turns the preacher toward it twice: the CCS forge's
  affections questions (the pastor's own text — "a safe place for sinners and a
  dangerous place for sin") and the Finish screen's beholding moment with the
  "pray yourself hot" send-off at export. Turning-toward is not measuring; the
  Principle's scope is unchanged.

## Canonical Vocabulary — Stage

- **v24 migration session, 2026-06-10:** "Delivery" struck from the Stage vocabulary; its
  ARI Phase 7 legacy tolerance retired (no production sermons in existence).
- **Workspace Restructure, 2026-05-10:** pre-restructure stages Blueprint and Frame retired
  (Frame became an Assembly sub-phase; Blueprint's outline-review folded into
  Assembly/Outline). A read-coercion mapping legacy Blueprint/Frame → Assembly was built,
  then later **DELETED** (Invisible-System Phase B3) — `current_stage` is now read straight
  through. The earlier "coerced to Assembly on read" wording is therefore no longer true and
  was removed from the clause (harmless — no production sermons carry those values).

## Canonical Vocabulary — Sub-phase

- **Workspace Restructure, 2026-05-10:** the within-Study Step layer (Exegesis / MPT_MPS /
  Outline / FunctionalElements) retired; Study became one stage with four sub-phases.
- **Invisible-System trail deletion sweep, Phase B2:** the `current_step` column retired;
  field-level last-touched moved to `last_touched_position`.
- **OEM walk, 2026-07-02:** the decide/write split became the stage boundary. Equip moved
  from Assembly into Manuscript as the **Body** sub-phase, and the **Frame** sub-phase was
  collapsed — its seven moves transplanted into the Manuscript door fields, each prompt
  asking the decision and the preached words together at full SADI richness. Assembly =
  Anchor, Outline (decide); Manuscript = Body, then Intro, Transitions, Conclusion (write).
  Rulings of record: `docs/handoff/oem-walk-rulings-2026-07-01.md` (agenda item 8 + the confirmed walk
  shape).

## Canonical Vocabulary — Question and Answer

- **2026-07-02 (post-audit remediation, pastor-ruled):** the Question definition's "the
  pastor answers questions one at a time" rendering language retired. The shipped,
  preacher-walked walk has always advanced FIELD by field, with a multi-question field
  presenting its prompts together (`walkOrder.js` field-level WALK_ORDER); the two
  workspace audits flagged the promise/surface mismatch, and the pastor ruled the promise
  side moves: CORE now states the field is the unit the walk advances by, and the
  sermon-start landing's "one question at a time, in order" line was reworded to match
  ("one field at a time"). The Answer clause's "while the current question is active"
  phrasing simplified for the same reason — there is no single active question on a
  stacked field.

## Canonical Vocabulary — Named outcome

- **OEM walk, 2026-07-02:** the Sermon Frame outcome retired with the Frame collapse;
  Sermon Body now belongs to the Manuscript Body sub-phase. Eight named outcomes → seven.
  The same walk ratified "Sermon Outline" and "Sermon Body" as names (agenda item 5) —
  they had been provisional first-draft names from Workspace Restructure RW1.

## Canonical Vocabulary — Pastoral Context

- **Re-Foundation Phase 1, examination 2 (2026-06-14):** the PC *mechanics* (the two
  questions The Room / The Cost and Gift, their storage keys, and the disposition of the
  three legacy columns `topic_theme` / `audience_assumptions` / `background_noise`) moved
  out of CORE to `docs/SYSTEMS/sermon-workspace.md` — keep the *principle* as law
  (Process #4), the *mechanics* as spec. SPRD B4.2 / C5 (2026-05-04) retired the standalone
  PC card; the three legacy columns were **removed** in the trail deletion sweep (Phase B1)
  — `SERMON_COLUMNS` no longer admits them and nothing reads or writes them.
  *(Corrected 2026-06-15, Re-Foundation step 4: the original step-3 wording said the columns
  were "retained defensively for legacy data and are no longer read"; the code at HEAD has
  them struck — zero readers, zero writers — so "removed" is the accurate disposition.)*

## Canonical Vocabulary — Throughline

- **2026-07-01 (doc drift sweep):** the MPT/MPS expansion corrected from "Main Preaching
  Thought / Main Preaching Statement" to the canonical **Main Point of the Text / Main
  Point of the Sermon** — the sole expansion the code uses (`sadiAnchorFields.js`,
  `sermonState.js`, `ReferencePane.jsx`, `utils.js`) and the one the rest of CORE already
  used ("Main Point Pair (MPT + MPS)").

## State #2 — Canonical position

- **OEM walk, 2026-07-02:** the position model gained Manuscript sub-phases (Body →
  Intro, Transitions, Conclusion) and lost Assembly's Equip and Frame — see Canonical
  Vocabulary — Sub-phase above for the restructure record.

## Process #1 — Movement is monotonic in expectation

- **2026-06-10:** clarified that the contract has never forbidden a Back control — the
  shipped surface renders a labeled Back beside Next. The forward-only one-control chrome
  came from the invisible-system build spec's one-control line (which the shipped surface had
  already deviated from), not from this contract.
- **Trail deletion sweep, Phase G (2026-05-18):** retired the pre-invisible-system framing
  *"movement is monotonic by default; backward movement is allowed but explicit — the user
  knows they went back."* That framing was paired with a spine-side forward-to-prior
  rejection that refused navigation; the rejection was deleted in G. The intent (a natural
  direction the work moves) holds; enforcement shifted from a refusing wall to a calm surface
  plus the map.

## Process #2 — Completeness

- **Trail deletion sweep, Phase G (2026-05-18):** retired the pre-invisible-system framing
  *"movement is gated by user evidence; the system does not advance a sermon to the next
  stage unless the user has produced the artifact that stage requires; the constraint is the
  gate."* The advancement wall it described was deleted across F + G; the deeper commitment
  (completeness depends on load-bearing artifacts) survives. The eight composites the sweep
  deliberately kept became CORE-canonical.
- **2026-06-10:** the workspace-wide "is the sermon done" answer was wired
  (`deriveSermonCompleteness` + the SermonFinish screen).
- **OEM walk, 2026-07-02:** the Intro/Conclusion composites (`checkIntroComposite` /
  `checkConclusionComposite`) retired with the Frame collapse — eight CORE-canonical
  composites → six. The three lenient presence checks (Sermon Outline, Sermon Body,
  Manuscript) were RATIFIED lenient (agenda item 7): the doors check = an opener answer +
  the response; transitions deliberately never counted (the map still tracks them
  honestly). Leniency is now the ruled bar, not a placeholder awaiting the walk.
- **M2 audit ruling, 2026-07-02:** `checkField3Composite` retired from the completeness
  roll-up — six CORE-canonical composites → five. The Observation Set joined the lenient
  group: the Obvious Point sentence is the check, because the Study→Anchor handoff, the
  reference pane, and the sermon map already treat the Obvious Point text as the
  Observation Set (`STUDY_NAMED_OUTCOMES`), and Finish contradicting all three at the
  walk's final review was the bug. The clause was amended to the five-composite wording
  on 2026-07-02 (post-audit remediation session).
- **Architecture-audit Track A, 2026-07-02:** `checkField3Composite` (and its private
  helper `canvasHasMainWithModifier`) was **deleted** from `src/utils/studyAdvancement.js`.
  It had been left exported-but-unused by the M2 ruling above; the architecture-fragility
  audit flagged the dead export + stale rationale comment as a reintroduction hazard
  (re-wiring it would re-open the false-completion asymmetry M2 closed). Zero production
  callers at deletion. No behaviour change — the five-composite roll-up is unaffected.

## Process #3 — Movement visible at thresholds

- **Several 2026-06-10 amendments:** the completion threshold added (the "Finish sermon →"
  control replacing a silently disabled forward chevron; the `.sfin-overlay` screen carries
  the artifact review + Export + Mark-as-preached); threshold screens made re-readable
  ("Read again" doors on the map header for sermon-start and handoff; a "go write it" jump off
  the handoff does not consume it); a static "Stage · Region" place line and a map "You are
  here" line permitted.
- **Trail deletion sweep, Phase D2e (2026-05-17):** retired the pre-invisible-system framing
  *"movement is a visible event; 'Continue' is movement, and movement is never silent."* The
  rendering shifted from an always-on tab-change banner to discrete threshold surfaces. (The
  AI clause came out separately in ARI Phase 9, 2026-05-09.)
- **Rationale anchors (kept for provenance):** the invisible-system build spec's *Strategic
  orientation at thresholds* section ("*Orientation is discrete and lives at thresholds. It
  is never continuous and never present during the work.*") and the era-2 primacy charter's
  *Constraint without ceremony* clause ("*It is not the system's job to announce that work
  happened, mark that a boundary was crossed...*").

## Process #4 — Pastoral Context follows the text

- **Re-Foundation Phase 2 (2026-06-15):** the PC progression model was simplified. The clause
  previously read that PC "enters Study progressively as the pastor's understanding deepens —
  introduced as awareness during Observe, held in marination through Interpret, gaining texture
  at Redemptive Thread, and fully integrated at Implications." Phase 2 removed the Observe-phase
  awareness surface — the "Possible Implications" field (`applications`) — as one of four
  SermonForge `[+]` additions the pastor ruled to cut. With no Observe PC surface, the clause now
  reads that PC enters only at Implications (the three-voice conversation), driven by the
  understanding built across Observe / Interpret / Redemptive Thread, and is not surfaced as a
  field before then. The product owner's original progressive-PC articulation is retained as dated
  historical design rationale in `docs/SYSTEMS/sermon-workspace.md`.

## Process #5 — No AI substitution

- **ARI Phase 9, 2026-05-09:** AI removed from the product entirely; the
  `ai_proposal` / `ai_apply` mutation cycle that previously enforced "AI augments, never
  substitutes" was removed alongside the AI surfaces it gated.

## Process #6 — Throughline is structural

- **Workspace Restructure, 2026-05-10:** pre-restructure language scoped SFDI to "Step 1 —
  the four sub-phases"; SADI's anchors were Step 2 and Step 5. The Step layer was collapsed so
  the anchors are sub-phases inside Assembly.
- **Saturation amendment, 2026-06-10 — rationale:** the saturation investigation found the
  walk fed the pastor only his own summaries forward from the Study→Anchor seam onward,
  producing an "equation" feel at the load-bearing moments; the amendment restores the text
  to those moments. (The amendment's live commitments remain in the clause.)
- **OEM walk, 2026-07-02:** the honesty parenthetical closed — Outline, Body, and the
  Manuscript doors are preacher-walked and ratified, so the contract is testable in full
  across the whole walk. The Frame moves live on inside the Manuscript door fields
  (the transplant, agenda item 8); SADI remains the frozen record that produced them.

## Mutation #1 — User typing always wins

- **ARI Phase 9, 2026-05-09:** pre-ARI this clause governed the AI proposal/apply cycle that
  gated AI-driven writes; with AI removed, the rule reduces to "the pastor is the only
  author."

## Mutation #2 — The proposal slot was retired

- **ARI Phase 9, 2026-05-09:** the original clause reserved a separate slot for AI proposals
  so the pastor's existing field was never touched while a proposal was pending. With AI
  removed, no system actor ever writes to a sermon field; the slot mechanism is unnecessary.
  (The numbered clause is kept as a one-line gravestone in CORE to preserve Mutation-contract
  numbering, which other docs reference.)

## Mutation #4 — Destruction proportional to reversal cost

- **2026-06-10:** amended to "friction scales with the loss" — a generic two-step confirm is
  the floor for row-level destruction, not the model for everything; whole-sermon destruction
  requires a named confirm or an undo window, satisfied by the v24 soft delete (tombstone +
  visible Undo, which makes the reversal cost near zero).

## Surface #4 — "You are here" is always answerable

- **2026-06-10:** extended to the workspace — the clause's promise was bigger than its
  sidebar mechanism, and the sidebar doesn't exist on the screen the pastor lives in. The
  workspace answers it with the persistent "Stage · Region" place line + an on-demand map.

## The Test — Q5

- **2026-06-10:** added Q5 "Where does the pastor SEE this — and what does it orphan?" The
  navHint chain built across three files and dropped in the fourth, and the dead composite
  gates with no caller, are the two failure modes Q5 exists to catch.

## Non-Negotiable Boundaries — better-sqlite3

- **2026-06-10:** sermonforge.db moved from sql.js to better-sqlite3 — durable journaled
  commits, WAL mode, no serialize-per-write pipeline.

## Non-Negotiable Boundaries — The userData path is permanent

- **2026-07-01 (doc drift sweep):** the legacy-DB resolver description corrected. The clause
  said `migrateLegacyDb` (located "in `electron/main.js`") "finds the most recent candidate
  with real content"; the code (`electron/dbMigration.js`) deliberately picks the candidate
  with the **most content rows**, mtime breaking ties only among equal-row candidates —
  recency-wins is the exact bug behind the 2026-05-02 near-data-loss (a 1-sermon dev DB
  out-mtiming a 10-sermon real library). Because CORE outranks code, the row-count rule and
  its rationale now live in the clause itself, so a future session cannot "align code to doc"
  back into the regression.

## Absolute Invariants — Database writes commit at the IPC handler

- **2026-06-10:** the prior invariant — the 500ms `saveDb()` debounce protecting sql.js's
  whole-DB serialization — retired with the driver swap. Every spine write is now a durable
  SQLite commit the moment its handler returns; no main-process save debounce exists or may
  be reintroduced.
