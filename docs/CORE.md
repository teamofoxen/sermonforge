# SermonForge — Core

> **Authority:** This document, together with `docs/RULES.md` and the `docs/SYSTEMS/*` files, defines
> the system. All constraints here are binding. If code diverges from these rules, the code is wrong
> unless explicitly justified. Dated amendment history lives in [`docs/CORE-CHANGELOG.md`](CORE-CHANGELOG.md)
> so these clauses read as current law. (The original monolithic `CLAUDE_original.md` was deleted
> 2026-04-14, commit `498e511`; the pre-split text lives only in git history.)

---

## Project Identity

SermonForge is a **local-first Electron desktop app** built by a pastor who
preaches ~42 weeks/year and shipped to pastors. The end user is a pastor, not
a developer — often older, often low in software confidence, always under
weekly time pressure. **Low software confidence is a binding design
constraint:** when a labeled control and a minimal one are otherwise tied,
the labeled one wins.
All application data lives locally on the user's machine under
`app.getPath("userData")` (typically `%APPDATA%\sermonforge\data\` on Windows;
resolved via `electron/config.js`). Sermon library files may reside in OneDrive
for backup, but application databases are stored locally and the app runs
correctly without OneDrive. There is no backend, no server, no web deployment.
All tooling decisions must prioritize simplicity.

**The sermon is the primary unit of the shipped product; the series is carried
context.** A sermon may belong to a series and carries that membership as
first-class state. The Series Planner — a distinct macro/architect surface for
shaping a book or season across many sermons, with a Schedule screen that
assigns sermons to Sundays and a congregational study-guide export — shipped AI-free
under its own charter (`docs/PROPOSALS/series-planner-revival-charter.md`,
2026-06-21); it stands alongside the sermon workspace without displacing the
sermon as the primary unit. Top-level reference features remain a named roadmap
direction, not the shipped identity. (History: `docs/CORE-CHANGELOG.md`.)

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

*Scope: Clarity through Constraint is the **tool's** telos — what the software's
job is. It does not name or displace the **sermon's** telos, which Merida names as
adoration and beholding Christ; that belongs to the preacher. The tool may turn
the preacher toward it — the CCS forge's affections questions and the Finish
screen's beholding moment (OEM walk, 2026-07-02) — but it never measures it.
The Principle measures the tool, not the sermon.*

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

### Architecture Direction

SermonForge is conservative in implementation but directional in architecture.

No clause in this document authorizes speculative refactoring, aesthetic cleanup,
framework-building, or rewrites. However, architectural drift is not harmless
merely because today's pastor-facing surface still appears to work. When the
current structure makes a CORE truth depend on duplicated derivations, scattered
vocabulary, stale ownership claims, manual repo-wide coordination, or defensive
tripwires around the same concept, that drift is evidence.

Evidence-based normalization is permitted when it strengthens the contract
hierarchy by reducing competing sources of truth. The preferred direction is:
canonical grammar, single derivations for pastor-facing truth, stable adapters
at storage boundaries, and thin consumers. The preferred method is subtraction,
clarification, and test-protected movement — not new frameworks or broad rewrites.

Authorization to plan a normalization initiative is not authorization to
implement it. Implementation must still be separately scoped, minimal,
reversible where possible, and tested against current pastor-facing behavior.

(Added 2026-07-03; history in `docs/CORE-CHANGELOG.md`.)

### Canonical Vocabulary

Terms used by the contracts below. Code, docs, and contract clauses bind to
these names. (See State Contract clause 5: *one name per concept*.)

- **Stage** — one of Study, Assembly, Manuscript. Tracked as
  `current_stage` on every sermon. Blueprint, Frame, and Delivery are not
  stages (retired; `current_stage` is read straight through with no legacy
  coercion — history in the changelog).
- **Sub-phase** — within Study: Observe, Interpret, Redemptive Thread,
  Implications. Within Assembly: Anchor, Outline. Within Manuscript: Body,
  then Intro, Transitions, Conclusion. Tracked as `current_sub_phase`;
  field-level last-touched is `last_touched_position`. (OEM walk, 2026-07-02:
  Equip moved into Manuscript as Body, and the Frame sub-phase collapsed into
  the Manuscript door fields — Assembly decides, Manuscript writes. The
  retired within-Study Step layer: history in the changelog.)
- **Boundary** — the transition point between two adjacent values at the same
  level. *Stage boundary* (e.g., Study → Assembly, Assembly → Manuscript).
  *Sub-phase boundary* (e.g., Observe → Interpret inside Study, Anchor →
  Outline inside Assembly).
- **Field** — an isolated focused workspace the pastor works inside a
  sub-phase, persisted as a JSON key inside that sub-phase's database column.
  Each field contains one or more **questions** in an ordered sequence.
  Engineering-side terms (*column*, *key*, *slot*) remain available; contract
  language uses *field*.
- **Question** — an ordered prompt inside a field. Questions are ordered
  within their field, but the FIELD — not the question — is the unit the walk
  advances by: a multi-question field presents its questions together on one
  writing surface, in order, each with its own answer. (Amended 2026-07-02 —
  the field-level walk, preacher-ratified by the OEM walk, supersedes the
  earlier "one at a time" rendering language; history in
  `docs/CORE-CHANGELOG.md`.) The field's value is the composition of the
  answers. Question keys are stable identifiers persisted as sub-keys inside
  the field's JSON value.
- **Answer** — what the pastor writes for each question. Answers persist
  individually; previous answers stay visible as he works.
- **Named outcome** — the artifact each sub-phase produces, named explicitly.
  *Study sub-phases:* Observation Set (Observe), Interpretation Set
  (Interpret), Christ-Connection Statement (Redemptive Thread), Implications
  Synthesis (Implications). *Assembly sub-phases:* Main Point Pair (Anchor),
  Sermon Outline (Outline). *Manuscript:* Sermon Body (Body); the terminal
  Intro, Transitions, Conclusion sub-phase produces the Manuscript itself
  rather than a separate named outcome. Seven named outcomes in all. (The
  Sermon Frame outcome retired 2026-07-02 — its seven moves transplanted into
  the Manuscript door fields; history in the changelog.)
- **Handoff** — what passes from one sub-phase's named outcome into the
  opening of the next sub-phase.
- **Throughline** — the line of deepening exegetical work that runs through a
  sub-phase's fields and across sub-phase boundaries, producing the named
  outcomes that compose into a preaching foundation strong enough to support
  the Main Point of the Text (MPT) and Main Point of the Sermon (MPS).
- **Pastoral Context (PC)** — the third voice in the Implications three-way
  conversation. That PC is *driven by the text, not the reverse* is the law
  (Process Contract #4). The mechanics — which field PC lives in, its
  questions, and its storage — are spec, in `docs/SYSTEMS/sermon-workspace.md`.
  (Moved out of CORE in Re-Foundation Phase 1, examination 2 — principle as
  law, mechanics as spec; history in the changelog.)

### 1. State Contract — what exists, and where am I in it

1. **The series is the primary planning unit. The sermon is the atomic unit of
   content work.** Both are first-class canonical state. A sermon may exist
   without a series (one-off preaching); when it has one, the series is its
   primary parent context.
2. **Every sermon has a canonical position in the process.** A sermon is at
   exactly one stage (Study → Assembly → Manuscript), and within its stage at
   one sub-phase (Study: Observe → Interpret → Redemptive Thread →
   Implications; Assembly: Anchor → Outline; Manuscript: Body → Intro,
   Transitions, Conclusion). Position is queryable from any surface that
   touches the sermon.
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
6. **One source for each canonical truth.** A canonical concept may have many
   consumers, but it may not have many independent definitions. Stage,
   sub-phase, field, question, answer, named outcome, handoff, throughline,
   position, completion, save status, and ownership rules must move toward
   a single derivation or explicitly named adapter boundary. Mirrors are
   allowed only when a storage boundary or migration need requires them, and
   the canonical side must be named. (Added 2026-07-03; history in
   `docs/CORE-CHANGELOG.md`.)
7. **In-progress work is queryable from the front door.** "What sermons am I
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
   includes a labeled Back beside Next. (History: `docs/CORE-CHANGELOG.md`.)
2. **A sermon is complete when its load-bearing artifacts exist.** The four
   Study named outcomes (Observation Set, Interpretation Set, Christ-
   Connection Statement, Implications Synthesis), the Main Point Pair (MPT
   + MPS), and the Manuscript — whose door fields carry the transplanted
   Frame moves (hook, bridge, expectations, redemptive note; summation,
   response) — are the artifacts the work produces. A sermon is not done
   until they exist; that is the contract. Completeness per load-bearing
   field is checked by the composite gate functions in
   `src/utils/studyAdvancement.js` (`checkField8Composite`,
   `checkPhase4Field4Composite`, `checkField5Composite`,
   `checkMPTComposite`, `checkMPSComposite`) — these are the foundation
   of the completeness contract. The workspace-wide "is the sermon done"
   answer is wired (2026-06-10): `deriveSermonCompleteness` in
   `src/utils/sermonState.js` consumes all five composites — plus
   deliberately LENIENT presence checks for the Observation Set (the
   Obvious Point sentence; M2 audit ruling, 2026-07-02 — Finish must
   agree with the handoff, reference pane, and map, which all treat the
   Obvious Point as the Observation Set; `checkField3Composite` retired
   from the completeness roll-up the same day), the Sermon Outline,
   Sermon Body, and Manuscript (the doors check = an opener answer + the
   response; transitions are deliberately never counted, though the map
   still tracks them honestly). The lenient Outline/Body/Manuscript
   checks were ratified lenient by the OEM walk (2026-07-02) — leniency
   is now the ruled bar, not a placeholder. The SermonFinish screen
   renders the result at the end of the walk with per-artifact "go write
   it" jumps, Export to Word, and Mark as preached. The answer informs;
   it never blocks (Process #1 holds — no walls). Completeness is also
   visible continuously at lower weight via the map's per-question
   shading (`deriveQuestionStatesFromSermon`) and at the Study → Anchor
   handoff (`deriveStudyOutcomesFromSermon`,
   `deriveStudyUnfinishedFromSermon`). The five composites are
   CORE-canonical. (The Intro/Conclusion composites retired with the
   Frame collapse, 2026-07-02; `checkField3Composite` retired by the M2
   ruling; history: `docs/CORE-CHANGELOG.md`.)
3. **Movement is visible at thresholds, not narrated continuously.** Major
   transitions — sermon start, the Study → Anchor handoff, and sermon
   completion — surface as discrete landing screens (`.ssl-overlay`,
   `.sah-overlay`, `.sfin-overlay`) the pastor reads and dismisses. The
   completion threshold is summoned (the "Finish sermon →" control, which
   replaced a silently disabled forward chevron), never automatic, and
   re-openable forever; its screen carries the artifact review plus Export and
   Mark-as-preached. Every threshold screen is re-readable after dismissal —
   standing "Read again" doors on the map header for the sermon-start and
   handoff screens, and a "go write it" jump off the handoff does not consume
   it. Dismissal ends the interruption, never the access. Within-stage step
   movement (chevron-next, map-jump) is silent by design. A static statement of
   place is permitted: the writing surface's "Study · Interpret" place line and
   the map's "You are here" line state *where*, never *that movement happened*.
   What stays banned is movement narration — any surface that announces,
   celebrates, or comments on a transition outside the threshold screens. The
   line between orientation (helpful — at boundaries, or statically present)
   and narration (clunky, always-on commentary) is load-bearing. (History +
   the invisible-system and era-2 rationale anchors: `docs/CORE-CHANGELOG.md`.)
4. **Pastoral Context is driven by the text, not the other way around.** The
   text speaks first. Pastoral Context is a canonical artifact of every sermon,
   but it does not precede engagement with the text and is not a prerequisite
   for entering Study. PC enters Study only after the text has been heard — it
   is integrated at Implications (the three-voice conversation), driven by the
   understanding built across Observe, Interpret, and Redemptive Thread; it is
   not surfaced as a field before then. The exact mechanics are specified in
   `docs/SYSTEMS/sermon-workspace.md`. (Amended 2026-06-15, Re-Foundation Phase 2:
   the Observe-phase awareness surface — the Possible Implications field — was
   removed; PC no longer enters progressively from Observe. History:
   `docs/CORE-CHANGELOG.md`.)
5. **No AI substitution.** The system contains no AI authorship surfaces. The
   pastor authors all sermon content. (History: `docs/CORE-CHANGELOG.md`.)
6. **The workspace throughline is structural.** Each Study or Assembly
   sub-phase produces a named outcome by way of a throughline that runs
   through its fields and crosses each sub-phase boundary by handoff. The
   throughline must be coherent: every field contributes; every named
   outcome is built from the field-work that precedes it; every handoff
   is explicit. The pedagogical content — number of fields, wording, exact
   named-outcome text — may evolve. The structural integrity — that the
   throughline exists, holds, and produces the named outcomes it claims
   — does not. The canonical articulation lives in
   `docs/WORKSPACE-CANON.md` (ratified 2026-06-15) — every stage, sub-phase,
   field, question, named outcome, and handoff at current truth, Merida-
   annotated. The throughline's structural integrity is testable against the
   canon: every field contributes, every named outcome is built from the
   field-work before it, and every handoff is explicit. The SFDI and SADI
   initiative documents
   (`docs/PROPOSALS/study-field-definition-initiative.md`,
   `docs/PROPOSALS/sermon-anchor-definition-initiative.md`) are the frozen
   development records that produced the Study content (23 fields, four named
   outcomes, four handoffs) and the Anchor/Frame content (four anchor fields,
   two named outcomes — the Frame moves now live on in the Manuscript door
   fields per the 2026-07-02 transplant); the `scripts/sfdi-*-consistency.py`
   validators continue to check those frozen records for internal consistency.
   (The OEM walk, 2026-07-02, completed the remaining regions: Outline, Body,
   and the Manuscript doors are preacher-walked and ratified — rulings of
   record in `docs/handoff/oem-walk-rulings-2026-07-01.md`. This contract is now testable
   in full across the whole walk.)

   (Saturation amendment, 2026-06-10 — pastor's ruling: the throughline is
   forward-compiling, but it is NOT closed to the text. Two commitments hold.
   (a) The reference pane keeps the passage present BY DEFAULT in every region,
   Study and Assembly alike — it never flips away from the passage on its own;
   the pastor's own work is always one tab-flip away but never displaces the
   text unbidden. (b) A return-to-the-text beat sits at the Study→Anchor seam:
   before forging the Main Point, the pastor is sent back to re-read the
   passage (the Implications send-off, the Study→Anchor handoff which now
   carries the passage, and the MPT draft prompt). This SUPERSEDES the era-2
   primacy charter's Ruling 1 and Ruling 4 insofar as they removed "marinate"
   from the architecture and barred "step back and read" from architectural
   copy — see those rulings' dated supersession banners. It does NOT revive the
   era-1 conflation those rulings rightly struck: the Implications Synthesis is
   the named outcome of Phase 4, not "the marinate-output," and the substrate
   the Main Point draws from is still the pastor's integrated synthesis and
   four named outcomes. Marinate is restored as what Merida means by it — a
   return to the passage before the forge — now surfaced by the system rather
   than left entirely to the pastor. (Rationale + the era-2 Ruling 1/4
   supersession detail: `docs/CORE-CHANGELOG.md`.)

### 3. Mutation Contract — what happens when something changes

1. **User typing always wins by default.** All sermon content is pastor-typed.
   The system does not overwrite user-typed content. There are no system-driven
   writes to sermon fields outside the pastor's keystrokes. (History:
   `docs/CORE-CHANGELOG.md`.)
2. **The proposal slot was retired (ARI Phase 9).** With AI removed, no system
   actor writes to a sermon field, so the slot mechanism is unnecessary. (Kept
   as a numbered gravestone to preserve Mutation-contract numbering that other
   docs reference; history in the changelog.)
3. **Saves are events, not background noise.** Successful saves are visible —
   the user can answer "is my work safe" at any moment. Failed saves are visible
   and retryable. Silent saves are not allowed in either direction.
4. **Destruction requires evidence of intent proportional to reversal cost.**
   Single-click destruction is forbidden for anything irreversible or
   input-wiping. The friction scales with the loss: a generic two-step
   confirm is the floor for row-level destruction, not the model for
   everything — whole-sermon destruction requires a named confirm or an
   undo window, satisfied by the v24 soft delete (tombstone + visible Undo).
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
   (the static "Stage · Region" place line) and an on-demand map. No
   nameless wandering. (History: `docs/CORE-CHANGELOG.md`.)
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
   orphans are handled in the same change or explicitly tombstoned.

A change that passes all five ships. A change that fails any one of them
either reshapes to pass, or it does not ship.

For architecture-normalization proposals, answer three additional questions
before implementation is approved:

6. **What drift is evidenced?** Name the duplicated derivation, stale authority,
   manual coordination burden, defensive tripwire, or competing source of truth.
7. **Which pastor-facing trust could it eventually weaken?** Name the future
   risk to vocabulary, position, completion, save safety, handoff integrity,
   local-first trust, no-AI authorship, or calm navigation.
8. **What is the smallest seam that removes the drift?** Name what will not be
   touched. If the answer requires a global store, schema migration, mega-hook,
   or broad rewrite, the proposal must prove why a smaller adapter or derivation
   is insufficient.

A normalization plan may pass this test even when it does not change today's
surface. A normalization implementation still fails if it changes pastor-facing
behavior without separate approval.

(Architecture-normalization questions added 2026-07-03; history in
`docs/CORE-CHANGELOG.md`.)

---

## Non-Negotiable Architectural Boundaries

- **No backend.** Local-first only. No web API, no server process, no remote storage.
- **No AI.** SermonForge contains no AI surfaces (ARI, 2026-05-09). The Anthropic SDK,
  IPC `"ai-message"` channel, system prompts, and context pipeline have been removed.
  ESV passage fetching (Crossway API) is the only outbound call that carries
  sermon-derived input. Two other outbound calls exist and carry no sermon content:
  the auto-updater's launch-time GitHub Releases version check, and (unless the pastor
  opts out) BTI interaction *metadata* to a developer-run Cloudflare endpoint. (A
  fourth call — the renderer's Google Fonts typeface load — was surfaced by the
  2026-07-01 drift sweep and removed the same day: the three font families now ship
  inside the app, `src/styles/fonts/`.) The local-first guarantee is about sermon
  *content* — that never leaves the machine. See `docs/REFERENCE/privacy.md`.
- **No raw SQL in the renderer.** All database operations go through named IPC channels handled
  in `electron/main.js`. No SQL is accepted from the renderer.
- **No direct `window.electronAPI` outside wrapper modules.** Components use `src/db/database.js`
  exports; they never call `window.electronAPI` directly.
- **better-sqlite3 for both databases; sqlite-vec loads only on theology.db.** Writes are
  durable journaled commits in WAL mode (no serialize-per-write pipeline). The two
  connections stay separate: theology.db loads the sqlite-vec extension for vector semantic
  search; the main DB never loads extensions. Native modules must be rebuilt for Electron's
  ABI after install: `npx @electron/rebuild -m node_modules/better-sqlite3`. Both native
  packages are in `asarUnpack` in `package.json`. (Driver-swap history: `docs/CORE-CHANGELOG.md`.)
- **ESM/CJS boundary.** `src/utils/churchCalendar.js` is ESM and cannot be imported from
  `electron/main.js` (CommonJS). Any main-process feature needing liturgical season logic
  must inline it.
- **Schema changes require migrations.** Never alter `CREATE TABLE` statements directly. All
  schema changes go through `runMigrations()` with a version increment.
  See `docs/SYSTEMS/database.md`.

- **The userData path is permanent.** Once a `sermonforge.db` location has shipped in any
  release, that path stays in `legacyDbPaths` (in `electron/config.js`) forever. New active
  paths may be introduced; old ones are never abandoned. The DB resolver (`migrateLegacyDb`
  in `electron/dbMigration.js`, invoked from `electron/main.js`) walks `legacyDbPaths`
  whenever the active path is empty, picks the candidate with the **most content rows**
  (sermons + series; file mtime breaks ties only between equal-row candidates), and copies
  — never moves — it forward. Most-rows, not most-recent, is the law: recency-wins is the
  exact bug behind the 2026-05-02 near-data-loss (a 1-sermon dev DB with a newer mtime
  beating a 10-sermon real library). A commit
  that changes the active path without adding the previous path to `legacyDbPaths` in the
  same diff is wrong. Removing or reordering entries in `legacyDbPaths` orphans user data on
  every machine that still has a DB at that location and is forbidden.

---

## Absolute Invariants

- **`createOutlinePoint(text)` is the only place outline points are created.** Located in
  `src/utils.js`. It assigns the stable UUID that `functional_elements` keys depend on.
  Never construct `{id, text}` objects inline anywhere else.

- **Database writes commit at the IPC handler.** Every spine write is a durable SQLite commit
  the moment its handler returns; there is no main-process save debounce to protect, and none
  may be reintroduced. The renderer-side 800ms autosave debounce in `SermonWorkspace` remains
  deliberate (keystroke batching), and is flushed on close/quit/reload via
  `src/utils/closeFlush.js`. (Driver-swap history: `docs/CORE-CHANGELOG.md`.)

- **The design system lives entirely in `src/styles/global.css`** as CSS variables. Never
  hardcode colors, font names, or layout dimensions outside that file. Never change the
  design system without explicit user approval.

---

## Tech Stack (summary)

Electron 31 · React 18 · Vite 5 (config: `vite.config.mjs`) · better-sqlite3 (native
SQLite, WAL) · dotenv · Node 24 · Windows 11 / OneDrive storage.

Full details: `docs/REFERENCE/project-structure.md`.
