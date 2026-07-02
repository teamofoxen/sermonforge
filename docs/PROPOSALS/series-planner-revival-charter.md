# Series Planner Revival — Charter

**Status:** SHIPPED — revived 2026-06-21, re-leveled to four movements 2026-06-22 (`3330f35`), guided-spine flow added 2026-06-24, then the **content-model rebuild shipped 2026-06-24** (three screens — Outline · Schedule · Study guide — superseding the four-movement workbench and the melodic-line model), and **Topical Series mode shipped 2026-06-25** (schema v30, extending — not superseding — the content-model rebuild). Current shape: [`docs/SYSTEMS/series-planner.md`](../SYSTEMS/series-planner.md).

## 2026-06-24 — Content-model rebuild: the planner becomes the pastor's real series document

> **This is the current ruling. It supersedes the four-movement workbench, the "Book Study / Hear the Line / melodic line" model, and the Tier 1–3 "guided spine" — all now historical build record below.** Still holding and reaffirmed: the macro/architect **Decision**, the AI-free / stands-alone **Principles**, and the create-then-update + draft-row/commit + single-organism **Key rulings**. Full locked design + build phasing: memory `project_planner_flow_study.md`. The shape to mirror is the pastor's own artifact (`…/Sermon Library/_Series/Jesus of Luke/_Jesus of Luke - Big Picture Overview.docx`).

**Why.** The pastor's verdict: the planner's invented vocabulary ("hear the line", "melodic line", the evidence worksheet, "the hinge") did not match how he actually plans, and flow polish could not register on top of an alien content model. His real process is one nested unit repeated at three levels.

**The model.** The planner is a top-down way to **understand the book at three levels — Book ▸ Section ▸ Pericope** — yielding three outputs: (1) the sermon calendar, (2) familiarity with the text before preaching, (3) raw material for the study guide. A pericope **is** a sermon **is** the scheduled unit (the existing series→sections→sermons spine). **Every level is the same unit: Title + passage range · Big idea (one line) · Overview (paragraph).**

**Three screens (tabs): Outline · Schedule · Study guide.**
- **Outline** — the book as one live nested outline (collapse/expand; Add section / Add preaching unit; book-level Reference = the pasted commentary outline, collapsed). Replaces the Understand/Design tabs and the Overview cockpit (the outline *is* the at-a-glance). **Refined 2026-06-24b: the Outline is for outlining only — no dates.** The per-unit date field, date chip, and "Schedule" jump were removed; the unit's title field is relabeled **Working title** (the big idea expands on it); and `color`/`status`/`year`/`description` + the `CoveragePanel` left the Outline (lifecycle/cosmetics, not outlining — coverage moved to the Schedule).
- **Schedule** — kept (Suggest Sundays / seasons / pacing), and now **the one place dates live**. The date is single-source on the sermon. Each row is working title + passage + date, expandable to its big idea + overview; the undated pool sorts in **outline reading order** (section, then creation). Hosts the coverage readout.
- **Study guide** — an editable formatted booklet / "mini-commentary." An **Import from outline** button builds/refreshes it (book Overview → Introduction; section Overviews → part intros; each sermon → its own page with Big idea + Overview-as-commentary + passage + date). Per page: a **Notes** area = blank space for the listener; pastor-authored **additions** (questions / cross-refs / quotes) stored guide-local. Re-import refreshes imported content and **never wipes notes/additions** *(confirmed 2026-06-24)*. **Notes = listener blank space**; additions = pastor content *(confirmed 2026-06-24)*. Export to Word renders the booklet.

**Deleted for good.** The four book-study prompts (`book_background`, `book_argument`, `redemptive_context`, `series_motivation`); the melodic-line / hear-the-line / evidence worksheet / hinge (`melodic_evidence`, `emerging_big_idea`); Key Image (never added); the Tier 1–3 guided-spine pieces (built for the four-movement tabs); the separate per-sermon `study_guide_note` (folded into the new sermon Overview).

**Schema** (migration + both `electron/contracts.cjs` / `src/core/contracts.ts` mirrors, via `runMigrations` + version bump): add `big_idea` + `overview` to `sermons` (pericope level; migrate any existing `study_guide_note` → `overview`, then retire it); add guide-local study-guide storage (notes + additions); drop the deleted `series` columns from the writable set (retain columns as backup per house pattern); `sections` unchanged (already Title/range/Big idea/Overview).

**Build.** End-to-end, phased (schema → Outline → Schedule two-way → Study guide), committing + pushing per phase; verification gates per the build prompt / memory. The mechanics doc `docs/SYSTEMS/series-planner.md` is rewritten as part of the build.

## 2026-06-25 — Topical Series mode: a second, theme-led way to plan a series

> **Extends — does not supersede — the 2026-06-24 content-model rebuild.** That rebuild's Book ▸ Section ▸ Sermon model governs **book mode**; this ruling adds a **second mode** for a different kind of series. Still holding for both modes: the macro/architect **Decision**, the AI-free / stands-alone **Principles**, and the create-then-update + draft-row/commit + single-organism **Key rulings**. Full locked design + 8-angle impact map: memory `project_topical_series_mode.md`.

**Why.** Some series are not a journey through one book. A **topical series** is a single **Big Idea** (e.g. "The Mission of God") that gathers passages from *different* books under it. The book-led planner cannot express this — it leads with one book, walks it top-to-bottom, and measures coverage against it. The pastor needs a theme-led front and page for a series the canon already permits: a book-less, theme-named series is, and always was, a legal object (the New Series modal's "leave the book blank, name it yourself" path).

**The two modes.**
- **Book mode** (the 2026-06-24 model, unchanged): the **book** is the series' identity; Book ▸ Section ▸ Sermon; the Schedule walks the book's reading order.
- **Topical mode** (new): the **Big Idea** is the series' identity; **Big Idea ▸ Sermon** — a flat list, no section tier; each sermon draws its passage from any book; the order is the pastor's to set.

**Rulings.**
1. **Explicit mode discriminator.** A persisted `series.kind` (`'book' | 'topical'`, default `'book'`) names the mode — it is **not** inferred from "no book," because a book series also has a null `book_id` mid-creation (create-then-update writes the name first, the book second; "no book yet" and "topical" would be indistinguishable). Per the create-then-update / **do-not-widen-INSERT** ruling, `kind` rides a follow-up `updateSeries`, never the create INSERT; the `'book'` default makes a failed follow-up read as a book series (the recoverable state).
2. **The front door chooses the mode.** The New Series modal gains a Book / Topical choice (default Book). In topical mode the book picker is **hidden**; the pastor names the **theme** (required — there is no book to borrow a name from). The book picker **moves down** onto each sermon, on the planner page, where the passage is actually chosen.
3. **Flat, no sections — and no synthetic ones.** A topical series is Big Idea ▸ a flat list of sermons. It must **not** wrap each sermon in a hidden "Section 1" to satisfy the no-limbo rule: deleting that section would silently eject every sermon to standalone (`delete-section`'s last-section ejection). Sections stay genuinely absent in topical mode; the no-limbo handling learns a real `kind='topical'` section-optional path rather than leaning on the auto-file net.
4. **The pastor authors the order.** A theme has no built-in reading order, so the Schedule's undated order is **pastor-set** — a move-up/down control plus a per-sermon `sort_order` (mirroring today's section reorder). The dated half of the Schedule sort is book-agnostic and unchanged. Note: there are **five** consumers of sermon order — including the New-Sermon "From a series" picker's *own* hand-rolled sort that already ignores section order today — and they must move together, or the same series shows two different orders.
5. **The theme lives in `series.big_idea`** (reused, not a new field), so the Study Guide introduction projects it unchanged. The Study Guide is otherwise unaffected: a section-less series already renders as a clean flat list of pages, and the single-book Reference part and the cover's passage line self-suppress when blank.
6. **Per-sermon book = free text for v1; structured deferred.** A topical sermon's book lives in its free-text `passage` string ("Genesis 12:1-3"); there is **no** `sermons.book_id` in v1. Accepted consequence: a topical series sits **outside** the canon-balance views (Series Arc + the Planning "Biblical Coverage" tally) — it reads "Unclassified" there. **Why deferred, not the easy add:** the column is cheap, but it brings two real fragilities — (a) **dual source of truth**, a structured book beside a free passage that can silently disagree; and (b) the **Arc counts per *series*, not per *sermon*** (one genre + one testament per series; the Arc query never loads sermons), so feeding a many-book theme into it is a counting-model rework, not a bolt-on. The worst outcome is the half-built middle — a `book_id` no view consumes. Free text is the contained choice (incompleteness, not contradiction); structured book + a proper Arc aggregation is a deliberate follow-on **only if** seeing topical on the canon-balance view earns its keep.
   > **⚠ SUPERSEDED 2026-06-25 by the Coverage Initiative** ([`coverage-initiative.md`](coverage-initiative.md)). The deferred follow-on was built. `sermons.book_id` shipped (v31), and the dual-source fragility was designed out rather than accepted: `book_id` + chapter:verse **compose** the single `passage` string (`src/utils/topicalPassage.js`), so they can't disagree. The Arc was reworked to count **per sermon** (`effectiveBookId = sermon.book_id ?? series.book_id`), so a topical series' per-sermon books now appear on the canon-balance views. Only this ruling's "free text for v1 / structured deferred" deferral is overturned; the rest of the charter stands.
7. **AI-free, restated for the new surface.** The theme and every per-sermon passage are pastor-authored — **no** "suggest passages for this theme," no scheduling advisor. Built AI-free by construction (`sermonforge/no-direct-ai`).

**Build.** Schema (`series.kind` + `sermons.sort_order`, v30, both `contracts` mirrors + the allowlist-sync test) → the topical front door + page → the pastor-authored Schedule order (and the five order consumers) → verify the Study Guide flows through unchanged. The mechanics doc `docs/SYSTEMS/series-planner.md` is rewritten as part of this build.
> **⚠ SHIPPED 2026-06-25 (commit `a6a95f0`).** All of the above landed: the v30 migration, `kind` in the `SERIES_COLUMNS` writable set, the New Series modal's Book/Topical choice, the topical flat pastor-ordered sermon list with move controls in `SeriesPlanner.jsx`, and `seriesSermonOrderBy` covering the pastor-order term. Extended 2026-06-25 by the Coverage Initiative's `sermons.book_id` (v31, ruling 6 above).

## Decision

Series-level planning is a first-class **macro / architect** mode of work — deciding
and shaping what gets preached across a book or season — genuinely distinct from the
weekly per-sermon walk. It returns to SermonForge as its own surface. CORE conditioned
the planner's return on "its own charter"; this is it.

The whole series backend (tables, CRUD IPC, the church-calendar engine, the study-guide
`.docx` exporter) is already live and passing CI. What was removed in ARI was only the
AI-saturated authoring **UI**. So this is a revival of a surface onto a living spine, not
a from-scratch build.

## Principles

- **AI-free.** Rebuilt from the pre-ARI bones (`git 4e3c42d~1`) with every AI sidecar
  removed (no Analyze / Generate / Assist / Chat / scheduling-advisor). Every field is
  pastor-authored. Enforced by `sermonforge/no-direct-ai`.
- **Stands alone.** It need not feed per-sermon prep. The existing series↔sermon links
  (workspace breadcrumb, New-Sermon picker) remain, but they are not the point.
- **Keep the 5-tab bones for v1.** Book Study · Overview · Structure · Sermon Slots ·
  Calendar — ending in the congregational Study Guide export. A tabbed workbench fits
  macro work. Re-skinning to the invisible-system idiom is deferred, not promised.
  - **Superseded 2026-06-22 — four-movement re-leveling.** The five peer tabs held three
    different kinds of work — understand / design / logistics — flattened into one row: a
    process, not a workflow. Re-leveled to four movements that each feed the next:
    **Understand · Design · Schedule · Overview.** Current field homes:
    [`docs/SYSTEMS/series-planner.md`](../SYSTEMS/series-planner.md); schema changes
    (`melodic_evidence` added in v26; `book_structure` retired, folded into
    `structural_outline`): [`docs/REFERENCE/schema.md`](../REFERENCE/schema.md). The
    original v1 ruling above stays as the build record.

## Scope — 3 increments

1. **Front door** — create a series, list/open it, a sidebar entry. Closes the one
   genuinely-missing piece: `createSeries` had no UI caller, so no series could be made.
2. **The planner** — recover `SeriesPlanner.jsx`, strip the AI sidecar, convert the one
   raw button, land it in today's primitives + lint rules.
3. **Study-guide export** — rides along with #2 (already AI-free); verify end-to-end and
   fix the schema doc-drift uncovered along the way.

## Key rulings

- **Persistence: create-then-update.** `createSeries` takes only name/year/color; the
  Book Study / Overview fields persist via debounced `updateSeries`. Do **not** widen the
  create INSERT to "fix" the 6 unwritten Book Study columns — that is by design.
  - **Naming superseded 2026-06-22:** the "Book Study" and "Overview" fields now live in
    the **Understand** and **Design** movements; the create-then-update ruling itself still
    holds unchanged — audit-confirmed at `3330f35` that the INSERT writes only
    name/year/color and was not widened for `book_id`/`melodic_evidence`.
- **Slots: keep the draft-row / commit pattern verbatim.** `createSermon` throws on an
  empty name (State Contract #3), so a slot stays UI-only until its first non-empty title.
- **`onOpenSermon`: drop the 3rd (seriesId) arg for v1** — the planner stands alone;
  return is via the sidebar / Planning list. Revisit only if return-to-this-series is asked for.
  > **⚠ PARTIALLY SUPERSEDED 2026-06-21 (audit M5, commit `a04fce5`).** Return-to-this-series
  > was asked for and built: opening a sermon from the planner records
  > `{ view: VIEW.SeriesPlanner, seriesId }` in `App` state, and workspace Back returns
  > directly to that planner — no longer via the sidebar / Planning list. The mechanical
  > half still holds unchanged: `onOpenSermon(id)` itself still carries no 3rd argument;
  > the series id rides `App` state, not a function argument.
- **Nav:** `VIEW.Planning` = the list/picker (sidebar-reachable); `VIEW.SeriesPlanner` =
  planner-with-id, reached only via `openPlanner(id)`.

## Out of scope (v1)

Re-skin to the invisible-system idiom; any AI-era "book-understanding feeds the sermon
walk" pipeline; return-to-planner after opening a slot.
> **⚠ SUPERSEDED 2026-06-21 (audit M5, commit `a04fce5`)** — return-to-planner shipped;
> see the `onOpenSermon` ruling above. The re-skin and AI-era-pipeline exclusions still hold.

> **Update 2026-06-22:** the planner was re-leveled to **four movements** (a structural
> reshape — see the supersession note above), which goes beyond v1's "keep the 5-tab
> bones." It is not a full invisible-system re-skin; the AI-era pipeline remains out of
> scope. (Return-to-planner: see the 2026-06-21 supersession note above — it shipped.)

> **Update 2026-06-24:** a "guided spine" of sermon-walk *connective tissue* (seam frames,
> a per-movement forward affordance, a topbar place-line, an Overview arc-rail map +
> arrival framing, first-open orientation) was added over the four-movement workbench —
> see `docs/SYSTEMS/series-planner.md` + CHANGELOG. The deeper **full-walk conversion**
> (a shared `flowOrder.js` / `PLANNER_WALK_ORDER` engine re-driving the planner from the
> sermon walk's writing-surface/map/threshold machinery) was **considered and deliberately
> deferred — kept in the back pocket, not ruled out.** It stays out of scope unless the
> planner is judged to need to become a walk (it is breadth-first macro work today).
