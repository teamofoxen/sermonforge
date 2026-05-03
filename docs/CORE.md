# SermonForge — Core

> **Authority:** This document, together with `docs/RULES.md` and the `docs/SYSTEMS/*` files, defines
> the system. All constraints here are binding. If code diverges from these rules, the code is wrong
> unless explicitly justified. `CLAUDE_original.md` is the original monolithic version — retained for
> historical reference only; do not use it as a working guide.

---

## Project Identity

SermonForge is a **local-first Electron desktop app** for a pastor who preaches ~42 weeks/year.
All application data lives locally on the user's machine under
`app.getPath("userData")` (typically `%APPDATA%\sermonforge\data\` on Windows;
resolved via `electron/config.js`). Sermon library files may reside in OneDrive
for backup, but application databases are stored locally and the app runs
correctly without OneDrive. There is no backend, no server, no web deployment.
The user is not a developer; all tooling decisions must prioritize simplicity.

**The series is the primary unit of pastoral work. The sermon is an instance within it.** The
Dashboard is a series planning room. The Sermon Workspace exists within the context of a series.
Every UX decision must reflect this hierarchy — the Calendar assigns sermons to Sundays, not just
displays a schedule; reference features (Illustrations, Library, Archive) are resources within
the workflow, not top-level destinations.

*One-sentence identity: SermonForge starts where sermon prep actually starts — with the series.
Plan the arc, divide the passage, then go deep on each sermon with AI assistance calibrated to
every stage.*

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

- **Stage** — one of Study, Blueprint, Manuscript, Delivery. Tracked as
  `current_stage` on every sermon.
- **Step** — within Study only: Exegesis, MPT/MPS, Outline, Functional
  Elements. Tracked as `current_step`.
- **Sub-phase** — within Exegesis only: Observe, Interpret, Redemptive Thread,
  Implications. Tracked as `current_sub_phase`.
- **Boundary** — the transition point between two adjacent values at the same
  level. *Stage boundary* (e.g., Study → Blueprint). *Step boundary* (e.g.,
  Exegesis → MPT/MPS). *Sub-phase boundary* (e.g., Observe → Interpret).
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
- **Named outcome** — the artifact each sub-phase produces, named explicitly:
  the Observation Set (Observe), the Interpretation Set (Interpret), the
  Christ-Connection Statement (Redemptive Thread), the Implications Synthesis
  (Implications). One named outcome per sub-phase.
- **Handoff** — what passes from one sub-phase's named outcome into the
  opening of the next sub-phase.
- **Throughline** — the line of deepening exegetical work that runs through a
  sub-phase's fields and across sub-phase boundaries, producing the named
  outcomes that compose into a preaching foundation strong enough to support
  the Main Preaching Thought (MPT) and Main Preaching Statement (MPS).
- **Pastoral Context (PC)** — three sermon-level fields: The Cultural Moment
  (`background_noise`), The Room (`audience_assumptions`), The Sermon's Work
  (`topic_theme`). Persistence column names follow engineering-side spelling;
  contract language uses the human names.

### 1. State Contract — what exists, and where am I in it

1. **The series is the primary planning unit. The sermon is the atomic unit of
   content work.** Both are first-class canonical state. A sermon may exist
   without a series (one-off preaching); when it has one, the series is its
   primary parent context.
2. **Every sermon has a canonical position in the process.** A sermon is at
   exactly one stage (Study → Blueprint → Manuscript → Delivery), and within
   Study at one step (1 Exegesis → 2 MPT/MPS → 3 Outline → 4 Functional
   Elements). Position is queryable from any surface that touches the sermon.
3. **No anonymous atoms.** A sermon must have a name. A series must have a
   name. The system refuses to admit a nameless atom into canonical state.
4. **Parent context is first-class.** A sermon that belongs to a series carries
   that membership as canonical state, including its position-in-series
   ("Sermon 3 of 7"). It is a property of the sermon, not a join surfaced only
   in one place.
5. **One name per concept.** "Outline" is one tab and one stage and one
   dropdown value, with one spelling, everywhere it appears. Vocabulary is part
   of state, not a UI decoration. Stage values, tab names, step names, and
   dropdown options must be the canonical names — never aliases or drifts.
6. **In-progress work is queryable from the front door.** "What sermons am I
   currently working on" has an answer the dashboard can show. There is no
   scenario where a sermon exists but the user cannot find it from the launchpad.

### 2. Process Contract — what counts as movement

1. **Movement is monotonic by default.** Forward through stages is the natural
   direction. Backward movement is allowed but explicit — the user knows they
   went back.
2. **Movement is gated by user evidence.** The system does not advance a sermon
   to the next stage unless the user has produced the artifact that stage
   requires. The constraint *is* the gate.
3. **Movement is a visible event.** "Continue" is movement, and movement is
   never silent. If movement triggers an AI summary, the user sees both the
   movement and the summary as discrete events.
4. **Pastoral Context is driven by the text, not the other way around.** The
   text speaks first. Pastoral Context is a canonical artifact of every sermon,
   but it does not precede engagement with the text and is not a prerequisite
   for entering Study. PC enters Study progressively as the pastor's
   understanding of the text deepens — introduced as awareness during Observe,
   held in marination through Interpret, gaining texture at Redemptive Thread,
   and fully integrated at Implications. The exact phase-by-phase mechanics
   are specified in `docs/SYSTEMS/sermon-workspace.md`.
5. **AI augments, never substitutes.** AI runs on user evidence. There is no AI
   operation that produces sermon content from zero user input. Compressed paths
   that bypass user evidence are forbidden under this contract. *Scope: this
   contract's enforcement (the `ai_proposal`/`ai_apply` mutation cycle,
   empty-evidence rejection in `validateAndCommit`) covers substitutive AI
   writes — operations that propose or apply content directly to sermon fields.
   Advisory AI interfaces — Review buttons that produce display-only commentary,
   and conversational Chat interfaces where any content application is a
   separate, explicit, user-confirmed gesture — are outside this contract's
   enforcement scope and are governed directly by the Principle.*
6. **The Study throughline is structural.** Each Study sub-phase produces a
   named outcome by way of a throughline that runs through its fields and
   crosses each sub-phase boundary by handoff. The throughline must be
   coherent: every field contributes; every named outcome is built from the
   field-work that precedes it; every handoff is explicit. The pedagogical
   content — number of fields, wording, exact named-outcome text — may evolve.
   The structural integrity — that the throughline exists, holds, and produces
   the named outcomes it claims — does not. The canonical articulation of
   fields, named outcomes, and handoffs lives in the Study Field Definition
   Initiative document; this clause activates when that document ships its
   first per-field entries.

### 3. Mutation Contract — what happens when something changes

1. **User typing always wins by default.** The system does not overwrite
   user-typed content without explicit, per-occurrence consent. "Draft,"
   "Suggest," "Populate" are *proposals*, never *replacements*.
2. **AI proposals live in a separate slot until accepted.** Accept is one click.
   Reject is no click. The user's existing field is never touched while a
   proposal is pending.
3. **Saves are events, not background noise.** Successful saves are visible —
   the user can answer "is my work safe" at any moment. Failed saves are visible
   and retryable. Silent saves are not allowed in either direction.
4. **Destruction requires evidence of intent proportional to reversal cost.**
   Single-click destruction is forbidden for anything irreversible or
   input-wiping. The DeleteButton's two-step inline confirm is the canonical model.
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
4. **"You are here" is always answerable.** Every top-level destination has a
   canonical sidebar entry and a canonical active-state. No nameless wandering.
5. **One re-entry convention.** Back is back. Labeled, consistent, predictable
   from any surface.

### The Test

Every proposed feature, fix, refactor, or audit response must answer four
questions before it ships:

1. **Which contracts does it touch?** Name them.
2. **Does it strengthen or weaken each one?** A change that weakens a contract
   to ship a feature fails the test.
3. **Does it preserve the Principle?** Does it preserve forced clarity, or
   does it relax it?
4. **If it conflicts with an existing clause, which is wrong?** A genuine
   conflict resolves at the contract layer, not in code. The contract changes,
   or the proposal changes. Code never decides on its own.

A change that passes all four ships. A change that fails any one of them
either reshapes to pass, or it does not ship.

---

## Non-Negotiable Architectural Boundaries

- **No backend.** Local-first only. No web API, no server process, no remote storage.
- **API key never reaches the renderer.** `ANTHROPIC_API_KEY` is loaded in the main process
  only and is never passed to the renderer via IPC or any other path.
- **All AI calls go through IPC.** Every Claude API call — without exception — must go through
  the `"ai-message"` IPC channel via `sendAIMessage()` in `src/utils/ai.js`.
- **No raw SQL in the renderer.** All database operations go through named IPC channels handled
  in `electron/main.js`. No SQL is accepted from the renderer.
- **No direct `window.electronAPI` outside wrapper modules.** Components use `src/db/database.js`
  exports; they never call `window.electronAPI` directly.
- **sql.js for sermonforge.db; better-sqlite3 + sqlite-vec for theology.db.** The main database
  uses sql.js (WASM). Theology uses better-sqlite3 (native) with the sqlite-vec extension for
  vector semantic search. Native modules must be rebuilt for Electron's ABI after install:
  `npx @electron/rebuild -m node_modules/better-sqlite3`. Both native packages are in
  `asarUnpack` in `package.json`.
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

- **`phrasePatterns` and `aiPhrasePatterns` must never be merged.**
  - `phrasePatterns` = pastor's own rhetorical patterns extracted from manuscript; used in
    adaptive hints to guide generation.
  - `aiPhrasePatterns` = patterns extracted from AI responses; for analysis only, never
    influence generation.
  - A runtime assertion in `src/utils/memory.js` `updateMemory()` throws in dev mode if
    an AI-sourced phrase is written to `phrasePatterns`. Do not remove this guard.
    If it fires, fix the call site routing AI content to the wrong key.

- **The 500ms debounce on `saveDb()`** is a deliberate trade-off. sql.js serializes the
  entire DB on every write; reducing this debounce would cause UI sluggishness on every
  keystroke. Do not reduce it or add synchronous writes.

- **The design system lives entirely in `src/styles/global.css`** as CSS variables. Never
  hardcode colors, font names, or layout dimensions outside that file. Never change the
  design system without explicit user approval.

---

## Tech Stack (summary)

Electron 31 · React 18 · Vite 5 (config: `vite.config.mjs`) · sql.js (WASM SQLite) ·
@anthropic-ai/sdk · dotenv · Node 24 · Windows 11 / OneDrive storage.

Full details: `docs/REFERENCE/project-structure.md`.
