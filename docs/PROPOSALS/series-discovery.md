# Series Discovery — Working Design Note

> **Status: IN BUILD — `feature/series-discovery`.** The *what & why* of the
> Discovery front screen of the Series Planner, and the smallest data +
> architecture changes it requires. This is a working note, not a sprawling
> charter. The live authority remains [`docs/CORE.md`](../CORE.md), and the
> planner mechanics live in [`docs/SYSTEMS/series-planner.md`](../SYSTEMS/series-planner.md);
> where they speak, they govern. Recommended design is chosen, not surveyed.

Discovery shows the **questions behind the plan**. Outline shows the **clean
plan those answers produced**. They are two views of the *same* pastor-authored
series — never two planning systems. Discovery applies the exegetical pressure;
Outline displays and edits the resulting Book ▸ Section ▸ Sermon plan; the Sermon
Workspace prepares each sermon in it. Standalone sermons are untouched.

The system supplies the pressure. The pastor supplies the clarity. Nothing is
generated for him.

---

## 1. The pastor's job in Discovery

Discovery is a book pastor's exegetical walk from *reading the whole book* to a
*preaching map with a series big idea* — done in his own words. His job, step by
step:

1. **Read the Book** — read it whole, repeatedly; watch for repetitions,
   commands, warnings, promises, contrasts, transitions, shifts. (No sermon
   divisions yet.) A light notes space; nothing required.
2. **Understand the Book** — why it was written, what prompted it, what response
   the author seeks; and *"Through this book, the author wants the reader to
   ____."* These are **Discovery notes** that support — never replace — the
   canonical Series Overview and Big Idea he writes later.
3. **Map the Major Movements** — he *explicitly creates* each movement (a real
   Series Section). Per movement: Title · Passage · **why it begins here** · **why
   it ends here** · Big Idea · Overview.
4. **Identify the Preaching Texts** — inside each movement he *explicitly creates*
   each preaching text (a real Sermon under that Section). Per text: Passage ·
   parent movement · why it begins/ends here · what the author is *talking about*
   (subject) · what he *says about it* (complement) · what he is *doing*
   (commanding / warning / … / other) · Big Idea · Overview · Working Title.
5. **Test Every Passage** — a review that applies the passage-integrity questions
   (one coherent thought? beginning/ending make sense? command split from its
   reason? too large / too small? does the big idea cover the whole passage?)
   plus the app's own deterministic coverage findings. Pressure, not checkbox
   theater — nothing meaningless is stored.
6. **Difficult Decisions** — up to three honestly-uncertain divisions: Option A /
   Option B / evidence for each / current preference / why. Never blocks progress.
7. **Propose the Series Big Idea** — after the map exists: the burden, what keeps
   appearing, the response sought, what unifies the sermons. He writes **two**
   candidate big ideas, then *explicitly establishes the one canonical* Series
   Big Idea and authors the canonical Series Overview.
8. **Planner-Ready Review** — a clean read of what he produced (book · movements ·
   sermons), with missing material and objective coverage issues (gaps, overlaps,
   unreadable refs, out-of-range sermons) surfaced plainly. Not a gate.

At every step he can see where he is, what he is doing, and the clean result the
step is producing. He may leave for Outline at any time.

---

## 2. Screen sequence and navigation

For a **book** series the planner tabs become:

**Discover · Outline · Schedule · Study guide**

- Discover is a new first tab, rendered **only for `series.kind === 'book'`**.
  Topical series keep their exact journey (Outline · Schedule · Study guide) — no
  Topical Discovery in this initiative.
- A newly created book series (no sections yet) **opens on Discover**. A book
  series that already has sections (the sample Luke plan, any established series)
  opens on **Outline** — the clean view of finished work. Re-entry always restores
  the last tab (existing `sermonforge_planner_tab_<id>` memory).
- **Readiness informs; it never blocks.** Outline is always one click away.
- Inside Discover, the eight steps are a labeled stepper with Back / Next and
  free click-to-any-step navigation. The **current step is remembered per series**
  (`sermonforge_discover_step_<id>`, the same write-once localStorage idiom as the
  tab flag) so reload lands him where he was (sensible position, not Step 1).
- Discover says, in plain words, that **a major movement becomes an Outline
  section** and **a preaching text becomes an Outline sermon** — so the two tabs
  never read as two systems.

---

## 3. How Discovery and Outline share canonical truth

There is **one** series, with **one** set of Sections and Sermons. Discovery and
Outline are two renderings of it.

- Creating a **major movement** calls `spine.createSection` — a real
  `series_sections` row, the same call Outline's "+ Add section" makes.
- Creating a **preaching text** calls `spine.createSermon` under an existing
  movement — a real `sermons` row, the same draft→commit path Outline uses, and
  **always with `section_id`** (never section-less: a section-less in-series book
  sermon makes the spine auto-fabricate a "Section 1" the pastor never asked for).
- The **canonical fields** — section Title / Passage / Big Idea / Overview; sermon
  Passage / parent Section / Working Title / Big Idea / Overview — are edited
  through the *same* parent savers (`handleSectionField`, `handleSermonField`,
  `commitDraft`), so an edit in Discover is instantly the value Outline shows, and
  vice versa. The final canonical **Series Big Idea** is `series.big_idea`; the
  canonical **Series Overview** is `series.overview` — the same fields Outline's
  book node edits.
- Deletes and reorders run the existing spine ops, so a movement/sermon removed in
  one view is gone in the other — no ghost copy. The Discovery-only reasoning
  lives *on the same row* (see §4), so it dies with the row automatically.

There is **no** "Generate Outline," "Build Planner," "Import," or "Convert." The
plan already exists the moment he authors it.

---

## 4. Discovery-only work that must be stored

Only the reasoning that cannot truthfully live in a clean planner field is new
state. It is stored per-entity, in one nullable JSON column named `discovery` on
each of the three tables — the house idiom (`study_guide_extras`, `sermon_frame`,
the Study sub-phase envelopes), fail-soft parsed (`src/utils/discovery.js`). Each
envelope is a **flat** object of well-known keys, so merging one edited sub-field
is a plain spread that can never drop a sibling — no opaque grab-bag, no nested
merge. Per-entity means it rides the existing `update*` create-then-update paths
and shares each row's lifecycle (no orphan cleanup, no ghost on delete).

- **`series.discovery`** — `readNotes` (1); `understandWhyWritten`,
  `understandSituation`, `understandProblem`, `understandResponse`,
  `understandWantsReaderTo` (2); `decisions:[{id, optionA, optionB, evidenceA,
  evidenceB, preference, why}]` (6, ≤3); `bigIdeaBurden`, `bigIdeaRecurring`,
  `bigIdeaResponse`, `bigIdeaUnifier`, `bigIdeaCandidateA`, `bigIdeaCandidateB` (7).
- **`series_sections.discovery`** — `{ whyBegin, whyEnd }` (Step 3 boundaries).
- **`sermons.discovery`** — `{ whyBegin, whyEnd, subject, complement,
  authorialFunction, authorialFunctionOther }` (Step 4 boundaries +
  subject/complement/function; `authorialFunction` is one of a fixed vocabulary the
  pastor *picks*, or "Other" + the free text — never a suggestion).

Steps 5 and 8 store **nothing** — they are read-only reviews over the canonical
plan and the deterministic coverage engine (`computeCoverage`).

---

## 5. Smallest data + architecture changes

**Data — migration v34 (33 → 34).** Three additive, nullable columns, using the
v30–v33 template verbatim (`safeAlter` + version bump; no backfill; columns never
dropped):

```
ALTER TABLE series          ADD COLUMN discovery TEXT DEFAULT NULL;
ALTER TABLE series_sections ADD COLUMN discovery TEXT DEFAULT NULL;
ALTER TABLE sermons         ADD COLUMN discovery TEXT DEFAULT NULL;
```

Add `"discovery"` to `SERIES_COLUMNS`, `SECTION_COLUMNS`, and `SERMON_COLUMNS`
across all three mirrors (`src/core/contracts.ts`, `electron/contracts.cjs`,
`tests/contracts/_helpers/test-spine.ts`) so `contracts-allowlist-sync` and
`contracts-mirror-parity` stay green and `buildUpdate` accepts the writes. It
rides create-then-update — **never** the `create-section` / `create-sermon` /
`create-series` INSERT. Reads are `SELECT *`, so the column surfaces on rows with
no read change. Extend `assertSchemaContract` to also check `SECTION_COLUMNS`
(today it checks only sermons + series) — a defensive canary for the new *writable*
section column, since a missing writable column silently rejects the whole save.
Docs: `schema.md` (version, ledger, three column rows) + `database.md` (version).
`discovery` is **not** added to `sermon_search` — it is reasoning, not manuscript
content.

**Architecture — one shared mutation path, one new tab file.**

- Lift the entity-mutation orchestration (`addSection`, `addSermon`/`commitDraft`,
  `moveSection`, `moveSermon`, `deleteSectionRow`, `removeSermonRow`) out of
  `OutlineTab` up to the parent `SeriesPlanner` (the state it needs — `drafts`,
  `draftErrors`, `expandedSermons`, `runSave` — already lives there). `OutlineTab`
  and the new Discover tab both consume the *same* functions as props. This is the
  seam that makes them provably one planning system; two copies of `commitDraft`
  (the re-read-latest-during-round-trip + promote-then-retryable-follow-up that
  fixed the double-create) would drift. No hook framework — colocated
  parent functions threaded as props, exactly as the tabs already receive ~20
  props each.
- New file **`src/components/SeriesDiscover.jsx`** — the eight-step walk. It reuses
  `computeCoverage` (`src/utils/coverage.js`) for Steps 5 and 8, the shared
  mutation functions for movement/text creation, and the parent field savers for
  every write — so Discovery inherits the topbar Saving / Saved / Save-failed +
  Retry, flush-on-exit, and leave-guard for free (Mutation #3). Any new debounced
  saver it introduces registers with `useFlushOnExit`.
- A preview seam mirrors the existing `_fixture` prop so Discover renders in the
  Vite-only browser (layout/copy/cold-read only — the DB is stubbed there).

No global store, no form-builder, no workflow engine, no parallel planner store,
no duplicated passage/coverage logic, no direct DB/IPC from components.

---

## 6. The vertical slice this build delivers

1. Create a new book series → planner opens on **Discover**, which reads cold and
   makes the first move obvious.
2. Record whole-book **Read** notes and **Understand** answers (Discovery notes).
3. **Explicitly create a major movement** → it is a real Section, visible
   immediately in **Outline**; record its boundary reasoning.
4. **Explicitly create a preaching text** under that movement → a real Sermon under
   that Section, visible immediately in Outline; record its boundary reasoning,
   subject, complement, and authorial function.
5. Author every Big Idea and Overview himself; the passage-test questions appear at
   Step 5; difficult decisions can be preserved without blocking.
6. Write two candidate Series Big Ideas and **explicitly establish** the canonical
   one (`series.big_idea`) plus the canonical Series Overview (`series.overview`).
7. **Planner-Ready Review** gives an honest read of the plan with objective gaps /
   overlaps / unreadable refs / out-of-range sermons surfaced.
8. Switching Discover ↔ Outline never creates duplicate or conflicting truth;
   reload restores his work and his step; save failures are visible and retryable;
   **Build this sermon** opens the workspace with correct series context; topical
   and standalone journeys still work.

Committed in checkpoints: (a) schema + contracts + migration + their tests green,
then (b) the shared mutation lift, then (c) the Discover UI + walk tests, then (d)
docs + CHANGELOG — so progress stays durable.

---

## 7. Non-goals

- No Topical Discovery (topical keeps its current journey).
- No shadow outline, temporary worksheet, conversion/import step, or "generate"
  action of any kind.
- No duplicate Book / Section / Sermon records; no second kind of sermon; no
  parallel planner store.
- No AI or rule-based pseudo-AI: no suggested divisions, movements, texts, big
  ideas, syntheses, or rankings. The system only surfaces objective conditions in
  the pastor's own work (missing fields, unreadable refs, uncovered spans,
  overlaps, out-of-range sermons, empty sections).
- No refactor of unrelated systems; no design-system change.

---

## 8. CORE Test

1. **Contracts touched:** State #1/#2/#4/#6 (series/section/sermon are canonical,
   position-in-series intact, one source per truth), Mutation #1/#3/#4 (pastor
   types everything, saves visible, deletes coherent), Surface #1/#4/#5 (one
   vocabulary, "you are here," one re-entry), Process #5 (no AI).
2. **Strengthen or weaken:** strengthens. Discovery makes the pressure of
   Clarity-through-Constraint explicit at the macro level without adding a wall,
   and consolidates onto one mutation path (removes the would-be duplicate).
3. **Preserves the Principle:** yes — it *forces* the exegetical questions and
   stores only the pastor's own answers; it authors nothing.
4. **Clause conflict:** none. Discovery adds a view, not a rule.
5. **Where the pastor sees it / what it orphans:** the new Discover tab. It orphans
   **nothing** — it adds three nullable columns (existing rows read them as null)
   and a new tab; no field, column, or surface is removed or repurposed.

**Normalization questions (for the OutlineTab lift):**

6. **Drift evidenced:** without the lift, `commitDraft` and the section/sermon
   create-commit logic would exist in two places (Outline + Discover) writing the
   same rows — a duplicated derivation of the same canonical mutation, exactly what
   State #6 / RULES "No Duplication" forbid.
7. **Trust it could weaken:** save-safety and no-limbo section filing (the subtle
   parts). Mitigated by moving — not rewriting — the functions, and by the existing
   series-spine tests plus a real-Electron render check before/after.
8. **Smallest seam:** relocate the seven functions from child to parent and thread
   them as props. Not touched: the spine, the IPC layer, the Schedule/Study-guide
   tabs, topical mode, standalone sermons.
