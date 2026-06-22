# Series Planner Revival — Charter

**Status:** SHIPPED — revived 2026-06-21, re-leveled to four movements 2026-06-22 (`3330f35`), audited + cleaned up since · opened 2026-06-21 · supersedes the ARI Phase-0 "coming soon" stub. Current shape: [`docs/SYSTEMS/series-planner.md`](../SYSTEMS/series-planner.md) (see the four-movement supersession note below).

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
