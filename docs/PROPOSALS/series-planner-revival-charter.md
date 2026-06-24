# Series Planner Revival — Charter

**Status:** SHIPPED then UNDER REBUILD — revived 2026-06-21, re-leveled to four movements 2026-06-22 (`3330f35`), guided-spine flow added 2026-06-24. **⚠ CONTENT-MODEL REBUILD ruled 2026-06-24 — see the next section; it supersedes the four-movement workbench and the melodic-line model.** Current shape (until the rebuild lands): [`docs/SYSTEMS/series-planner.md`](../SYSTEMS/series-planner.md).

## 2026-06-24 — Content-model rebuild: the planner becomes the pastor's real series document

> **This is the current ruling. It supersedes the four-movement workbench, the "Book Study / Hear the Line / melodic line" model, and the Tier 1–3 "guided spine" — all now historical build record below.** Still holding and reaffirmed: the macro/architect **Decision**, the AI-free / stands-alone **Principles**, and the create-then-update + draft-row/commit + single-organism **Key rulings**. Full locked design + build phasing: memory `project_planner_flow_study.md`. The shape to mirror is the pastor's own artifact (`…/Sermon Library/_Series/Jesus of Luke/_Jesus of Luke - Big Picture Overview.docx`).

**Why.** The pastor's verdict: the planner's invented vocabulary ("hear the line", "melodic line", the evidence worksheet, "the hinge") did not match how he actually plans, and flow polish could not register on top of an alien content model. His real process is one nested unit repeated at three levels.

**The model.** The planner is a top-down way to **understand the book at three levels — Book ▸ Section ▸ Pericope** — yielding three outputs: (1) the sermon calendar, (2) familiarity with the text before preaching, (3) raw material for the study guide. A pericope **is** a sermon **is** the scheduled unit (the existing series→sections→sermons spine). **Every level is the same unit: Title + passage range · Big idea (one line) · Overview (paragraph).**

**Three screens (tabs): Outline · Schedule · Study guide.**
- **Outline** — the book as one live nested outline (collapse/expand; Add section / Add pericope; book-level Reference = the pasted commentary outline, collapsed; a date chip per pericope; a "Schedule" jump button). Replaces the Understand/Design tabs and the Overview cockpit (the outline *is* the at-a-glance).
- **Schedule** — kept (Suggest Sundays / seasons / pacing). The date is single-source on the sermon, so it reflects **two-way** with the Outline.
- **Study guide** — an editable formatted booklet / "mini-commentary." An **Import from outline** button builds/refreshes it (book Overview → Introduction; section Overviews → part intros; each sermon → its own page with Big idea + Overview-as-commentary + passage + date). Per page: a **Notes** area = blank space for the listener; pastor-authored **additions** (questions / cross-refs / quotes) stored guide-local. Re-import refreshes imported content and **never wipes notes/additions** *(confirmed 2026-06-24)*. **Notes = listener blank space**; additions = pastor content *(confirmed 2026-06-24)*. Export to Word renders the booklet.

**Deleted for good.** The four book-study prompts (`book_background`, `book_argument`, `redemptive_context`, `series_motivation`); the melodic-line / hear-the-line / evidence worksheet / hinge (`melodic_evidence`, `emerging_big_idea`); Key Image (never added); the Tier 1–3 guided-spine pieces (built for the four-movement tabs); the separate per-sermon `study_guide_note` (folded into the new sermon Overview).

**Schema** (migration + both `electron/contracts.cjs` / `src/core/contracts.ts` mirrors, via `runMigrations` + version bump): add `big_idea` + `overview` to `sermons` (pericope level; migrate any existing `study_guide_note` → `overview`, then retire it); add guide-local study-guide storage (notes + additions); drop the deleted `series` columns from the writable set (retain columns as backup per house pattern); `sections` unchanged (already Title/range/Big idea/Overview).

**Build.** End-to-end, phased (schema → Outline → Schedule two-way → Study guide), committing + pushing per phase; verification gates per the build prompt / memory. The mechanics doc `docs/SYSTEMS/series-planner.md` is rewritten as part of the build.

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
- **Nav:** `VIEW.Planning` = the list/picker (sidebar-reachable); `VIEW.SeriesPlanner` =
  planner-with-id, reached only via `openPlanner(id)`.

## Out of scope (v1)

Re-skin to the invisible-system idiom; any AI-era "book-understanding feeds the sermon
walk" pipeline; return-to-planner after opening a slot.

> **Update 2026-06-22:** the planner was re-leveled to **four movements** (a structural
> reshape — see the supersession note above), which goes beyond v1's "keep the 5-tab
> bones." It is not a full invisible-system re-skin; the AI-era pipeline and
> return-to-planner remain out of scope.

> **Update 2026-06-24:** a "guided spine" of sermon-walk *connective tissue* (seam frames,
> a per-movement forward affordance, a topbar place-line, an Overview arc-rail map +
> arrival framing, first-open orientation) was added over the four-movement workbench —
> see `docs/SYSTEMS/series-planner.md` + CHANGELOG. The deeper **full-walk conversion**
> (a shared `flowOrder.js` / `PLANNER_WALK_ORDER` engine re-driving the planner from the
> sermon walk's writing-surface/map/threshold machinery) was **considered and deliberately
> deferred — kept in the back pocket, not ruled out.** It stays out of scope unless the
> planner is judged to need to become a walk (it is breadth-first macro work today).
