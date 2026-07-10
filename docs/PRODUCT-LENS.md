# SermonForge — Product Lens

> **Status: standing orientation for pastor-facing product work.** Load this for UI,
> user-facing copy, navigation, journey, product-planning, and UX-audit work (routed
> from `CLAUDE.md`). It is **subordinate** to [`CORE.md`](CORE.md) (the law),
> [`RULES.md`](RULES.md), [`WORKSPACE-CANON.md`](WORKSPACE-CANON.md), and the
> `SYSTEMS/` docs — where they speak, they govern. It is **not a source of new
> requirements**, not a live initiative or anchor, and not a mandatory audit
> procedure. It is the shared picture of who the user is and how to judge work he
> will see.

## 1. User and operating context

The end user is a **pastor** — often older, often low in software confidence, always
under weekly sermon-preparation pressure (CORE, Project Identity; that low confidence
is a *binding design constraint*: when a labeled control and a minimal one are
otherwise tied, the labeled one wins). He uses SermonForge as a local desktop app on
his own machine, Windows or Mac. The sermons in it are his: he authors every word,
and his sermon content never leaves the machine (`REFERENCE/privacy.md`). Trust in
that ownership — his words, saved, findable, unexported by anyone but him — is part
of the product, not a technical footnote.

## 2. Product purpose and mental model

SermonForge starts where sermon prep actually starts — **with the text** — and forces
clarity through structured questions the pastor answers in his own words (**Clarity
through Constraint**, the CORE Principle). The system asks; it never writes.

The surfaces divide by job:

- **Dashboard** — the beginning and the re-entry point, never a stats page: start a
  sermon, pick up where you left off, open the sample.
- **Series Planner** — the macro/architect headspace: shape a book or a theme across
  many Sundays (Outline · Schedule · Study guide).
- **Sermon Workspace** — the sermon-preparation walk itself: Study understands,
  Assembly decides, Manuscript writes. (The walk's content and completeness policy
  belong to WORKSPACE-CANON — do not re-derive them here.)
- **Calendar, Preached Sermons, What I've Preached** — schedule, history, and
  re-entry: when am I preaching, what have I finished, what have I covered.

## 3. Core journeys

All live at HEAD; component names in `REFERENCE/project-structure.md`.

1. **Resume an in-progress sermon** — Dashboard "Where you left off" (or the
   sidebar's recent sermons) → the workspace reopens at the last-touched field.
2. **Create and complete a standalone sermon** — "Build a sermon" → name it at
   creation → walk Study → Assembly → Manuscript → "Finish sermon →" → Export to
   Word → Mark as preached.
3. **Plan and schedule a series** — Series Planning → New Series (Book or Topical) →
   outline it → lay sermons on Sundays in Schedule → build/export the study guide.
4. **Enter a planned sermon and return to its series** — "Build this sermon" on a
   planner Outline row opens the workspace with series context ("Sermon N of M");
   the global Build-a-sermon modal's "From a series" path opens planned sermons too.
5. **Finish, export, mark preached** — the re-openable Finish screen; the sermon then
   lives under Preached Sermons (re-open and export remain available).
6. **Find previous work** — All Sermons with search; Calendar by date; What I've
   Preached by book (Series Arc) or by topic (tags); Preached Sermons for the done.
7. **Set up, and recover from empty or error states** — first-run setup (ESV key
   optional and skippable; add it later from the sidebar), passage-view recovery
   offers the key modal in place, empty states say what to do next, save failures are
   visible and retryable, and database recovery speaks in startup banners.

## 4. Product risks and settled decisions

The two project-killing risks are named in the
[BTI charter](PROPOSALS/beta-testing-initiative.md) and read together: **structural
overreach** (the question flow shaping the pastor's voice even though he types every
word) and **workflow misfit** (the tool never earning a place in the real week).
Alongside them:

- **Data-loss and trust failures** — a lost keystroke or a silent save failure costs
  more than a missing feature (CORE Mutation #3/#4; the close-flush and
  legacy-DB-path laws exist because of near-misses).
- **Loss of orientation or re-entry context** — "where am I / where was I" must
  always be answerable (CORE Surface #4/#5).
- **AI reintroduction** — architecturally banned, permanently (CORE Process #5).
- **Screens that are technically correct but require deciphering** — the planner
  Outline shipped correct and unlabeled and the pastor called it a train wreck; see
  the `feedback_verify_legibility` memory. Correctness does not confer legibility.

Settled and not to be relitigated: the Dashboard is re-entry, not statistics
(`PROPOSALS/dashboard-design-brief.md`); labeled beats minimal; plain vocabulary
("sermon", never "pericope").

## 5. Judgment for visible work

When judging pastor-facing work, look at it as the pastor's task. What good work
looks like:

- it reads **cold** — a first-time user, no remembered modal, knows what each zone is;
- the **natural first move is obvious**, and the surface is ordered by it;
- the feature is **discoverable** from where a pastor would look for it;
- hierarchy and grouping are understandable on sight, every tier labeled;
- **save / loading / error / success feedback is visible** ("is my work safe" is
  always answerable);
- failure and empty states offer a way forward;
- **re-entry and Back behave predictably** from any surface;
- the screen holds together at the app's supported desktop sizes (the Electron window
  enforces a 1024×700 minimum) and during ordinary resizing;
- keyboard focus, labels, semantics, and contrast hold up;
- the words are plain pastor-facing language.

**Passing tests and rendering successfully are necessary but do not prove user
understanding.** A screen can satisfy every contract and still leave the pastor
asking what to do.

## 6. Evidence standard

Keep the kinds of evidence distinct, and say which one a claim rests on:

- **Contracts, code, and tests** — implementation evidence: the behavior exists.
- **A rendered real route** — visual evidence: it draws. (The Vite-only browser
  preview stubs the database — it proves layout and copy, not data flows.)
- **A cold-read check** — basic legibility evidence: a first-time reading of the
  actual screen, per §5.
- **Ross's rulings and BTI findings** — product evidence: what the owner decided;
  what real pastors reported.
- **Unknowns** — where no user evidence exists (as of 2026-07, no beta cohort has
  onboarded), say so. Do not invent personas, accessibility targets, breakpoints,
  beta findings, or workflow conclusions the repo doesn't hold.
