# SermonForge — Core

> **Authority:** This document, together with `docs/RULES.md` and the `docs/SYSTEMS/*` files, defines
> the system. All constraints here are binding. If code diverges from these rules, the code is wrong
> unless explicitly justified. `CLAUDE_original.md` is the original monolithic version — retained for
> historical reference only; do not use it as a working guide.

---

## Project Identity

SermonForge is a **local-first Electron desktop app** built by a pastor who
preaches ~42 weeks/year and shipped to pastors. The end user is a pastor, not
a developer — often older, often low in software confidence, always under
weekly time pressure. **Low software confidence is a binding design
constraint:** when a labeled control and a minimal one are otherwise tied,
the labeled one wins. (Persona sentence rearticulated 2026-06-10 in the UX
overhaul governance batch; the wording is the pastor's to refine.)
All application data lives locally on the user's machine under
`app.getPath("userData")` (typically `%APPDATA%\sermonforge\data\` on Windows;
resolved via `electron/config.js`). Sermon library files may reside in OneDrive
for backup, but application databases are stored locally and the app runs
correctly without OneDrive. There is no backend, no server, no web deployment.
All tooling decisions must prioritize simplicity.

**The sermon is the primary unit of the shipped product; the series is carried
context.** (Rearticulated 2026-06-10 — the previous paragraph described a
series planning room, a Calendar that assigns sermons to Sundays, and
reference features that did not exist at HEAD, and it contradicted the
ratified "dashboard is re-entry" principle. Later the same day, T19 shipped
the smallest honest form of the calendar sentence: clicking a day opens New
Sermon with that date pre-filled. The rest — the planning room, reference
features — remains a named roadmap direction, not the shipped identity: a
sermon may belong to a series, carries that membership as first-class
state, and the Series Planner remains a stub until that work gets its own
charter.)

*One-sentence identity: SermonForge starts where sermon prep actually starts — with the text.
The system forces clarity through a structured throughline, end to end pastor-authored.
No AI substitution.*

---

## The Framework

> **Authority:** This is the behavioral law of SermonForge. All four contracts
> below are binding. When a clause conflicts with code, the code is wrong. When
> two clauses appear to conflict, the hierarchy below resolves it.

### The Principle

**Clarity through Constraint.** The system's job is to force clarity out of the
user through structured pressure. The system does not do the clarity work for
the user; it refuses to let the user proceed without it. Every contract below
derives from this. Any clause that lets the system substitute for the user is
wrong, not the principle.

### Hierarchy

When contracts appear to conflict, this resolves it:

**Principle → State → Process → Mutation → Surface**

- The Principle wins always.
- State is the foundation. If the state model doesn't admit X, no other
  contract can produce X.
- Process sits on State. It defines what state transitions are legal.
- Mutation sits on Process. It defines how transitions are committed.
- Surface derives from all three. Surfaces *express* what the contracts permit.
  Surfaces never *invent*.

### Canonical Vocabulary

Terms used by the contracts below. Code, docs, and contract clauses bind to
these names. (See State Contract clause 5: *one name per concept*.)

- **Stage** — one of Study, Assembly, Manuscript. Tracked as
  `current_stage` on every sermon. (Workspace Restructure 2026-05-10:
  pre-restructure stages `Blueprint` and `Frame` retired, both coerced to
  `Assembly` on read. `Delivery` struck from the vocabulary in the v24
  migration session, 2026-06-10 — its ARI Phase 7 legacy tolerance retired
  with no production sermons in existence.)
- **Sub-phase** — within Study: Observe, Interpret, Redemptive Thread,
  Implications. Within Assembly: Anchor, Outline, Equip, Frame. Tracked as
  `current_sub_phase`. (Workspace Restructure 2026-05-10: the within-Study
  Step layer — Exegesis / MPT_MPS / Outline / FunctionalElements — retired.
  The `current_step` column was retired in the trail deletion sweep
  (Phase B2); field-level last-touched moves to `last_touched_position`.)
- **Boundary** — the transition point between two adjacent values at the same
  level. *Stage boundary* (e.g., Study → Assembly, Assembly → Manuscript).
  *Sub-phase boundary* (e.g., Observe → Interpret inside Study, Anchor →
  Outline inside Assembly).
- **Field** — an isolated focused workspace the pastor works inside a
  sub-phase, persisted as a JSON key inside that sub-phase's database column.
  Each field contains one or more **questions** in an ordered sequence.
  Engineering-side terms (*column*, *key*, *slot*) remain available; contract
  language uses *field*.
- **Question** — an ordered prompt inside a field. The pastor answers
  questions one at a time; the field's value is the composition of the
  answers. Question keys are stable identifiers persisted as sub-keys inside
  the field's JSON value.
- **Answer** — what the pastor writes for each question. Answers persist
  individually; previous answers stay visible while the current question is
  active.
- **Named outcome** — the artifact each sub-phase produces, named explicitly.
  *Study sub-phases:* Observation Set (Observe), Interpretation Set
  (Interpret), Christ-Connection Statement (Redemptive Thread), Implications
  Synthesis (Implications). *Assembly sub-phases:* Main Point Pair (Anchor),
  Sermon Outline (Outline), Sermon Body (Equip), Sermon Frame (Frame). One
  named outcome per sub-phase.
- **Handoff** — what passes from one sub-phase's named outcome into the
  opening of the next sub-phase.
- **Throughline** — the line of deepening exegetical work that runs through a
  sub-phase's fields and across sub-phase boundaries, producing the named
  outcomes that compose into a preaching foundation strong enough to support
  the Main Preaching Thought (MPT) and Main Preaching Statement (MPS).
- **Pastoral Context (PC)** — the third voice in the Implications three-way
  conversation. PC lives in Phase 4 Field 3 of Study, with two questions:
  **The Room** (`room_specifics`) and **The Cost and Gift** (`cost_and_gift`).
  Stored inside the `implications` JSON column at
  `pastoral_context.room_specifics` / `pastoral_context.cost_and_gift`. Three
  legacy schema columns (`topic_theme`, `audience_assumptions`,
  `background_noise`) are retained for legacy data defensively but no longer
  rendered or read by the AI context tier (rewired in SPRD B4.2 / C5,
  2026-05-04).

### 1. State Contract — what exists, and where am I in it

1. **The series is the primary planning unit. The sermon is the atomic unit of
   content work.** Both are first-class canonical state. A sermon may exist
   without a series (one-off preaching); when it has one, the series is its
   primary parent context.
2. **Every sermon has a canonical position in the process.** A sermon is at
   exactly one stage (Study → Assembly → Manuscript), and within Study or
   Assembly at one sub-phase (Study: Observe → Interpret → Redemptive Thread
   → Implications; Assembly: Anchor → Outline → Equip → Frame). Position is
   queryable from any surface that touches the sermon.
3. **No anonymous atoms.** A sermon must have a name. A series must have a
   name. The system refuses to admit a nameless atom into canonical state.
   A refusal is spoken, not silent — the surface names what is missing
   (amended 2026-06-10; the empty-title "Forge Sermon" click used to do
   literally nothing). A name is required at creation and correctable
   afterward; requiring a name is not the same as freezing it.
4. **Parent context is first-class.** A sermon that belongs to a series carries
   that membership as canonical state, including its position-in-series
   ("Sermon 3 of 7"). It is a property of the sermon, not a join surfaced only
   in one place.
5. **One name per concept.** "Assembly" is one tab and one stage and one
   dropdown value, with one spelling, everywhere it appears. Vocabulary is part
   of state, not a UI decoration. Stage values, tab names, sub-phase names, and
   dropdown options must be the canonical names — never aliases or drifts.
6. **In-progress work is queryable from the front door.** "What sermons am I
   currently working on" has an answer the dashboard can show. There is no
   scenario where a sermon exists but the user cannot find it from the launchpad.

### 2. Process Contract — what counts as movement

1. **Movement is monotonic in expectation, not enforcement.** The preacher knows
   the shape of the whole work from day one — the map shows the full arc
   (Observe through Manuscript) on first entry, with what's done shown by
   visual weight. Forward through stages is the natural direction; the work
   was designed to flow that way. Revisiting earlier work is fully supported
   — the preacher clicks any question on the map and lands there. The system
   does not refuse navigation; the expectation lives in the writing surface's
   flow and the map's weighting, not in a wall. This clause has never
   forbidden a Back control — "revisiting earlier work is fully supported"
   includes a labeled Back beside Next (clarified 2026-06-10; the
   forward-only chrome came from the invisible-system build spec's
   one-control line, which the shipped surface had already deviated from,
   not from this contract). (Pre-invisible-system framing
   — "movement is monotonic by default; backward movement is allowed but
   explicit — the user knows they went back" — retired 2026-05-18 in the
   trail deletion sweep, Phase G. The earlier framing was paired with a
   spine-side forward-to-prior rejection that refused navigation; that
   rejection was deleted in G alongside Process #2's. The contract's intent
   — there is a natural direction the work moves — holds; its enforcement
   shifted from a refusing wall to a calm surface plus the map.)
2. **A sermon is complete when its load-bearing artifacts exist.** The four
   Study named outcomes (Observation Set, Interpretation Set, Christ-
   Connection Statement, Implications Synthesis), the Main Point Pair (MPT
   + MPS), the Sermon Frame (Intro + Conclusion), and the Manuscript are
   the artifacts the work produces. A sermon is not done until they exist;
   that is the contract. Completeness per load-bearing field is checked by
   the composite gate functions in `src/utils/studyAdvancement.js`
   (`checkField3Composite`, `checkField8Composite`,
   `checkPhase4Field4Composite`, `checkField5Composite`,
   `checkIntroComposite`, `checkConclusionComposite`, `checkMPTComposite`,
   `checkMPSComposite`) — these are the foundation of the completeness
   contract. The workspace-wide "is the sermon done" answer is wired
   (2026-06-10): `deriveSermonCompleteness` in `src/utils/sermonState.js`
   consumes all eight composites — plus deliberately LENIENT presence
   checks for the Sermon Outline, Sermon Body, and Manuscript, which have
   no SADI-ratified composites yet (the OEM content walk may tighten them)
   — and the SermonFinish screen renders the result at the end of the walk
   with per-artifact "go write it" jumps, Export to Word, and Mark as
   preached. The answer informs; it never blocks (Process #1 holds — no
   walls). Completeness is also visible continuously at lower weight via
   the map's per-question shading (`deriveQuestionStatesFromSermon`) and at
   the Study → Anchor handoff (`deriveStudyOutcomesFromSermon`,
   `deriveStudyUnfinishedFromSermon`). (Pre-invisible-system framing —
   "movement is gated by user evidence; the system does not advance a
   sermon to the next stage unless the user has produced the artifact
   that stage requires; the constraint *is* the gate" — retired 2026-05-18
   in the trail deletion sweep, Phase G. The advancement-wall it described
   was deleted across F + G; the deeper commitment — sermon completeness
   depends on load-bearing artifacts — survives in the completeness
   contract above. The composites the trail deletion sweep deliberately
   kept across F as "the surviving completeness contract" become CORE-
   canonical here.)
3. **Movement is visible at thresholds, not narrated continuously.** Major
   transitions — sermon start, the Study → Anchor handoff, and sermon
   completion — surface as discrete landing screens (`.ssl-overlay`,
   `.sah-overlay`, `.sfin-overlay`) the pastor reads and dismisses. The
   completion threshold (added 2026-06-10) is the end of the walk made
   visible: the "Finish sermon →" control replaces a silently disabled
   forward chevron, and its screen carries the artifact review plus the
   Export and Mark-as-preached actions — the moment the deliverable leaves
   the app is by this clause's own logic the largest threshold there is.
   It is summoned, never automatic, and re-openable forever. Every threshold
   screen is re-readable after dismissal (amended 2026-06-10): the map header
   carries standing "Read again" doors for the sermon-start and handoff
   screens, and a "go write it" jump off the handoff does not consume it —
   the screen returns on the next Anchor entry until explicitly closed.
   Dismissal ends the interruption, never the access. Within-stage
   step movement (chevron-next, map-jump) is silent by design. A static
   statement of place is permitted (amended 2026-06-10): the writing surface
   may carry a standing "Study · Interpret"-shaped place line, and the map a
   "You are here" line — these state *where*, never *that movement happened*,
   and they never change register when the pastor moves. What stays banned is
   movement narration: any surface that announces, celebrates, or comments on
   a transition outside the threshold screens above. The line between
   orientation (helpful — at boundaries, or statically present) and narration
   (clunky, always-on commentary) is load-bearing per the
   invisible-system build spec's *Strategic orientation at thresholds*
   section ("*Orientation is discrete and lives at thresholds. It is never
   continuous and never present during the work.*") and the era-2 primacy
   charter's *Constraint without ceremony* clause ("*It is not the system's
   job to announce that work happened, mark that a boundary was
   crossed...*"). (Pre-invisible-system framing — "movement is a visible
   event; 'Continue' is movement, and movement is never silent" — retired
   2026-05-17 in the trail deletion sweep, Phase D2e. The contract's
   intent — movement gets visibility — holds; its rendering shifted from
   an always-on tab-change banner to discrete threshold surfaces. The AI
   clause came out separately in ARI Phase 9, 2026-05-09.)
4. **Pastoral Context is driven by the text, not the other way around.** The
   text speaks first. Pastoral Context is a canonical artifact of every sermon,
   but it does not precede engagement with the text and is not a prerequisite
   for entering Study. PC enters Study progressively as the pastor's
   understanding of the text deepens — introduced as awareness during Observe,
   held in marination through Interpret, gaining texture at Redemptive Thread,
   and fully integrated at Implications. The exact phase-by-phase mechanics
   are specified in `docs/SYSTEMS/sermon-workspace.md`.
5. **No AI substitution.** The system contains no AI authorship surfaces. The
   pastor authors all sermon content. (ARI Phase 9, 2026-05-09: AI removed
   from the product entirely. The `ai_proposal`/`ai_apply` mutation cycle
   that previously enforced "AI augments, never substitutes" was removed
   alongside the AI surfaces it gated.)
6. **The workspace throughline is structural.** Each Study or Assembly
   sub-phase produces a named outcome by way of a throughline that runs
   through its fields and crosses each sub-phase boundary by handoff. The
   throughline must be coherent: every field contributes; every named
   outcome is built from the field-work that precedes it; every handoff
   is explicit. The pedagogical content — number of fields, wording, exact
   named-outcome text — may evolve. The structural integrity — that the
   throughline exists, holds, and produces the named outcomes it claims
   — does not. The canonical articulation lives across two documents: the
   Study Field Definition Initiative document at
   `docs/PROPOSALS/study-field-definition-initiative.md` carries Study's
   four sub-phases, and the Sermon Anchor Definition Initiative document
   at `docs/PROPOSALS/sermon-anchor-definition-initiative.md` carries
   Assembly's two SADI-walked anchor sub-phases (Anchor — MPT/MPS;
   Frame — Intro/Conclusion). As of 2026-05-04, SFDI carries seven-slot
   entries for all 25 fields across the four Study sub-phases, four
   named outcomes (Observation Set, Interpretation Set, Christ-Connection
   Statement, Implications Synthesis), and four sub-phase boundary
   handoffs (including the handoff out of Study into Assembly's Anchor
   sub-phase); SADI carries seven-slot entries for all four anchor fields
   (MPT, MPS, Intro, Conclusion), two named outcomes (Main Point Pair
   for Anchor; Sermon Frame for Frame), and sub-phase-boundary handoff
   articulations. (Pre-restructure language: SFDI was scoped to
   "Step 1 — the four sub-phases"; SADI's anchor *steps* were Step 2
   and Step 5. Workspace Restructure 2026-05-10 collapsed the Step layer
   so the anchors are sub-phases inside Assembly.) This clause is
   therefore binding in full — the throughline's structural integrity is
   testable against the SFDI document AND the SADI document together.
   (Honesty parenthetical, 2026-06-10: Assembly's Outline and Equip
   sub-phases and the Manuscript stage carry DRAFT field definitions —
   drafted 2026-06-09 from the Merida source, not yet preacher-walked;
   their canonical articulation is pending an OEM content walk. Until
   then this contract is testable in full only for Study and
   Anchor/Frame.)

### 3. Mutation Contract — what happens when something changes

1. **User typing always wins by default.** All sermon content is pastor-typed.
   The system does not overwrite user-typed content. There are no system-driven
   writes to sermon fields outside the pastor's keystrokes. (ARI Phase 9,
   2026-05-09: pre-ARI this clause governed the AI proposal/apply cycle that
   gated AI-driven writes; with AI removed, the rule reduces to "the pastor
   is the only author.")
2. **The proposal slot was retired in ARI Phase 9.** The original clause
   reserved a separate slot for AI proposals so the pastor's existing field
   was never touched while a proposal was pending. With AI removed (ARI,
   2026-05-09), no system actor ever writes to a sermon field; the slot
   mechanism is unnecessary.
3. **Saves are events, not background noise.** Successful saves are visible —
   the user can answer "is my work safe" at any moment. Failed saves are visible
   and retryable. Silent saves are not allowed in either direction.
4. **Destruction requires evidence of intent proportional to reversal cost.**
   Single-click destruction is forbidden for anything irreversible or
   input-wiping. The friction scales with the loss: a generic two-step
   confirm is the floor for row-level destruction, not the model for
   everything — whole-sermon destruction requires a named confirm or an
   undo window (amended 2026-06-10; satisfied by the v24 soft delete,
   whose tombstone + visible Undo makes the reversal cost near zero).
   Destruction that arrives without a Delete button — reload, restart,
   re-seed, field-clearing toggles — is governed by this clause too.
   The DeleteButton's two-step inline confirm remains the canonical
   confirm shape.
5. **Errors speak in one voice.** A persistent retryable failure is a banner.
   A field-level failure is inline. The system never uses a raw browser alert.
   There is one error vocabulary across the app.

### 4. Surface Contract — how the system speaks

1. **One vocabulary.** The canonical names from State Contract clause 5 are
   the only names allowed in copy, labels, tabs, dropdowns, modals, and tooltips.
2. **One CTA system.** Primary actions have one shape. Secondary actions have
   one shape. Disabled or unbuilt features do not occupy primary positions.
3. **One empty-state pattern, one loading vocabulary.** A small canonical set
   of loading verbs ("Loading…", "Saving…", "Thinking…") covers everything.
   Empty states share a layout and tone.
4. **"You are here" is always answerable — on every surface, including the
   workspace.** Top-level destinations answer it with a canonical sidebar
   entry and active-state. The workspace answers it with a persistent locus
   (the static "Stage · Region" place line) and an on-demand map (amended
   2026-06-10 — the clause's promise was bigger than its sidebar mechanism,
   and the sidebar doesn't exist on the screen the pastor lives in). No
   nameless wandering.
5. **One re-entry convention.** Back is back. Labeled, consistent, predictable
   from any surface.

### The Test

Every proposed feature, fix, refactor, or audit response must answer five
questions before it ships:

1. **Which contracts does it touch?** Name them.
2. **Does it strengthen or weaken each one?** A change that weakens a contract
   to ship a feature fails the test.
3. **Does it preserve the Principle?** Does it preserve forced clarity, or
   does it relax it?
4. **If it conflicts with an existing clause, which is wrong?** A genuine
   conflict resolves at the contract layer, not in code. The contract changes,
   or the proposal changes. Code never decides on its own.
5. **Where does the pastor SEE this — and what does it orphan?** Name the
   surface that renders the change; if no surface renders it, it has not
   shipped. If it deletes anything, name what consumed the deleted thing —
   orphans are handled in the same change or explicitly tombstoned. (Added
   2026-06-10: the navHint chain built across three files and dropped in
   the fourth, and the dead composite gates with no caller, are the two
   failure modes this question exists to catch.)

A change that passes all five ships. A change that fails any one of them
either reshapes to pass, or it does not ship.

---

## Non-Negotiable Architectural Boundaries

- **No backend.** Local-first only. No web API, no server process, no remote storage.
- **No AI.** SermonForge contains no AI surfaces (ARI, 2026-05-09). The Anthropic SDK,
  IPC `"ai-message"` channel, system prompts, and context pipeline have been removed.
  ESV passage fetching (Crossway API) is the only outbound call that carries
  sermon-derived input. Two other outbound calls exist and carry no sermon content:
  the auto-updater's launch-time GitHub Releases version check, and (unless the pastor
  opts out) BTI interaction *metadata* to a developer-run Cloudflare endpoint. The
  local-first guarantee is about sermon *content* — that never leaves the machine. See
  `docs/REFERENCE/privacy.md`.
- **No raw SQL in the renderer.** All database operations go through named IPC channels handled
  in `electron/main.js`. No SQL is accepted from the renderer.
- **No direct `window.electronAPI` outside wrapper modules.** Components use `src/db/database.js`
  exports; they never call `window.electronAPI` directly.
- **better-sqlite3 for both databases; sqlite-vec loads only on theology.db.** (Amended
  2026-06-10: sermonforge.db moved from sql.js to better-sqlite3 — writes are durable
  journaled commits, WAL mode, no serialize-per-write pipeline.) The two connections stay
  separate: theology.db loads the sqlite-vec extension for vector semantic search; the
  main DB never loads extensions. Native modules must be rebuilt for Electron's ABI after
  install: `npx @electron/rebuild -m node_modules/better-sqlite3`. Both native packages
  are in `asarUnpack` in `package.json`.
- **ESM/CJS boundary.** `src/utils/churchCalendar.js` is ESM and cannot be imported from
  `electron/main.js` (CommonJS). Any main-process feature needing liturgical season logic
  must inline it.
- **Schema changes require migrations.** Never alter `CREATE TABLE` statements directly. All
  schema changes go through `runMigrations()` with a version increment.
  See `docs/SYSTEMS/database.md`.

- **The userData path is permanent.** Once a `sermonforge.db` location has shipped in any
  release, that path stays in `legacyDbPaths` (in `electron/config.js`) forever. New active
  paths may be introduced; old ones are never abandoned. The DB resolver in
  `electron/main.js` (`migrateLegacyDb`) walks `legacyDbPaths` whenever the active path is
  empty, finds the most recent candidate with real content, and copies it forward. A commit
  that changes the active path without adding the previous path to `legacyDbPaths` in the
  same diff is wrong. Removing or reordering entries in `legacyDbPaths` orphans user data on
  every machine that still has a DB at that location and is forbidden.

---

## Absolute Invariants

- **`createOutlinePoint(text)` is the only place outline points are created.** Located in
  `src/utils.js`. It assigns the stable UUID that `functional_elements` keys depend on.
  Never construct `{id, text}` objects inline anywhere else.

- **Database writes commit at the IPC handler.** (Amended 2026-06-10; the prior invariant —
  the 500ms `saveDb()` debounce protecting sql.js's whole-DB serialization — retired with
  the driver swap.) Every spine write is a durable SQLite commit the moment its handler
  returns; there is no main-process save debounce to protect, and none may be reintroduced.
  The renderer-side 800ms autosave debounce in `SermonWorkspace` remains deliberate
  (keystroke batching), and is flushed on close/quit/reload via `src/utils/closeFlush.js`.

- **The design system lives entirely in `src/styles/global.css`** as CSS variables. Never
  hardcode colors, font names, or layout dimensions outside that file. Never change the
  design system without explicit user approval.

---

## Tech Stack (summary)

Electron 31 · React 18 · Vite 5 (config: `vite.config.mjs`) · better-sqlite3 (native
SQLite, WAL) · dotenv · Node 24 · Windows 11 / OneDrive storage.

Full details: `docs/REFERENCE/project-structure.md`.
