# Series Planner Content-Model Rebuild — Build Log

> Running log for the overnight autonomous build (2026-06-24). One section per
> phase: what shipped, decisions made (esp. where the spec was ambiguous and I
> chose), anything deferred, anything risky/uncertain for the morning audit.
> Spec sources: `docs/PROPOSALS/series-planner-revival-charter.md`
> ("2026-06-24 — Content-model rebuild"), memory `project_planner_flow_study.md`
> (PIVOT + UI DESIGN EXPANDED), `docs/CORE.md`, and the pastor's artifact
> `…/Sermon Library/_Series/Jesus of Luke/_Jesus of Luke - Big Picture Overview.docx`.

## The model (locked)

The planner is a top-down way to understand the book at three levels —
**Book ▸ Section ▸ Pericope** — producing three outputs: the sermon calendar,
text-familiarity before preaching, and raw material for the study guide. A
pericope **is** a sermon **is** the scheduled unit (the existing
series→sections→sermons spine). Every level is the same unit: **Title + passage
range · Big idea (one line) · Overview (paragraph).** Three screens (tabs):
**Outline · Schedule · Study guide.**

## Cross-cutting decisions (made where the spec said "your call")

- **D1 — Study-guide storage = live projection + per-sermon extras layer.**
  The booklet's imported content (book intro from series big-idea/overview,
  each section part from its overview, each sermon page's title/passage/date/
  big-idea/commentary-from-overview) is rendered **live from the Outline**, not
  snapshotted. The only guide-local stored state is `study_guide_extras` (JSON)
  on each sermon: `{ additions: [{id,type,text}], notesLines: int }`. Rationale:
  a live projection is **driftless** and avoids re-introducing the very
  double-entry the pastor asked to kill (he folded `study_guide_note` into
  `overview` precisely to "kill the double-entry"). "Import from outline refreshes
  but never wipes notes/additions" is then **structurally guaranteed** — Import
  never writes `study_guide_extras`. Trade-off: the commentary *body* is edited in
  the Outline (its single home), not independently inside the guide; the guide is
  "editable" via additions + blank-notes sizing + re-import. If the pastor wants a
  truly decoupled editable snapshot instead, that's a follow-up (would add a
  snapshot sub-object to `study_guide_extras`).
- **D2 — "Import from outline" is a build/refresh gesture gated by a write-only
  localStorage flag** `sermonforge_planner_guide_built_<seriesId>` (mirrors the
  existing front-door `sermonforge_planner_intro_<id>` pattern — no schema bump,
  no widened INSERT). Until first Import the Study-guide tab shows an empty state;
  Import builds it (and re-Import re-confirms/"refreshes", content being live).
  `notesLines` default = 8 blank listener lines, adjustable per page with a small
  stepper.
- **D3 — Schedule dates are single-source on the sermon, edited like any other
  field (no separate `schedule` snapshot).** This reconciles the two prior notes
  (the old "keep batch Save Dates / don't autosave dates" review note vs. the new
  ruling "the date lives once on the sermon … no separate snapshot that can
  drift"). The new content-model ruling wins: per-date edits autosave through the
  debounced `updateSermon` path (two-way live with the Outline date chip);
  "Suggest Sundays" remains as one explicit bulk gesture that writes every date.
  The drift-prone `schedule`/`scheduleDirty` snapshot (and its audit-M7 dirty
  guard) is deleted.
- **D4 — "How this works" front door kept but rewritten** to the three-screen
  model (Outline · Schedule · Study guide), much smaller than the old
  four-movement SVG. Once-per-series auto-open preserved via the existing
  `sermonforge_planner_intro_<id>` flag. Rationale: low-software-confidence pastor
  is a binding CORE constraint (labeled orientation wins).
- **D5 — Book-level Reference (`structural_outline`) kept** as a collapsed node in
  the Outline book header, and rendered as a final "Reference" part of the study
  guide (charter call, reaffirmed).
- **D6 — `study_guide_note` retired from the writable set** (charter); its content
  is folded into the new pericope `overview` by the v27 migration where overview
  is still empty. The column stays in the DB as backup (house pattern).

## Phase 0 — schema + contract mirrors + tests (DONE)

- **Migration v26 → v27** (`electron/main.js` `runMigrations`): `ALTER TABLE
  sermons ADD COLUMN big_idea TEXT DEFAULT ''`, `overview TEXT DEFAULT ''`,
  `study_guide_extras TEXT DEFAULT NULL`; run-once version-gated backfill folds
  `study_guide_note` → `overview` where overview is empty (study_guide_note kept
  as DB backup). `big_idea` had been dropped from sermons in v11 — re-added with
  fresh pericope semantics (noted in the migration comment).
- **All three allowlist mirrors updated in lockstep** (`src/core/contracts.ts`,
  `electron/contracts.cjs`, `tests/contracts/_helpers/test-spine.ts`):
  SERMON_COLUMNS += `big_idea, overview, study_guide_extras`, − `study_guide_note`;
  SERIES_COLUMNS − `redemptive_context, book_background, book_argument,
  book_structure, series_motivation, emerging_big_idea, melodic_evidence`.
- **Tests added** to `tests/contracts/series-spine.test.ts`: pericope big_idea +
  overview create-then-update; study_guide_extras persistence; retired series
  columns dropped from update-series. The allowlist-sync test now validates the
  new shape across all three mirrors.
- **Verify:** `node --check` main.js + contracts.cjs OK; `vitest run` = 234
  passed (was 231); `eslint` on all changed files = 0; `spine-integrity` OK.
- **Note for audit:** migration SQL itself has no vitest harness (true of every
  prior migration — main process isn't unit-tested); runtime `assertSchemaContract()`
  is the canary that the columns landed. The spine-field contract tests cover the
  testable layer.

## Phase 1 — the rebuilt planner (Outline · Schedule · Study guide) (DONE)

`src/components/SeriesPlanner.jsx` rewritten end-to-end (2647 → ~1180 lines).
Deleted: the four-movement model (PLANNER_MOVEMENTS, BookStudyTab/DesignTab/
OverviewTab/CalendarTab-as-movement, UNDERSTAND_FIELDS, MELODIC_EVIDENCE_FIELDS,
parseMelodicEvidence) and every guided-spine piece (MovementFrame,
MovementFooter, MoveHeader, PlannerArcRail, PresenceDot/EchoText/GlanceCard,
the topbar "Movement N of 4" place-line, the old four-column How-this-works SVG).

Built (all three tabs functional so the app is never broken mid-night):
- **Outline** — the book as one live nested outline. Book node (Title · Big idea ·
  Overview + collapsible "Book details" carrying the canonical-book picker /
  genre / passage range / color / status / year / description + a CoveragePanel,
  and a collapsible "Reference" = structural_outline). Section nodes (their own
  Title · range · Big idea · Overview) with reorder/delete and nested pericopes.
  Pericope nodes = sermons (passage · title · big idea · overview), a date chip
  (read-only here), a "Schedule" jump, Open, and the draft-row/commit flow
  preserved (createSermon never widened; big_idea/overview follow on commit).
- **Schedule** — single-source dates (D3): per-row edits autosave via the shared
  debounced updateSermon path and reflect live on the Outline chip; Suggest
  Sundays is one bulk gesture; end_date mirrors the last dated sermon. Pacing
  strip + seasons + skip-a-week kept. The drift-prone `schedule` snapshot is gone.
- **Study guide** — "Import from outline" builds the booklet (D2 localStorage
  flag), then a live projection (D1): Introduction (book big idea/overview),
  a part per section, a page per sermon (big idea + overview-as-commentary +
  passage + date + season), each with a pastor-authored additions composer
  (Question / Cross-reference / Quote → study_guide_extras) and a blank listener
  Notes block with a line-count stepper. Export to Word wired to the existing
  pipeline (the .docx itself is rewritten in Phase 3). Reference part renders the
  commentary outline.
- Tab id is `book-outline` (not `outline`) — the bare literal `"outline"` is a
  forbidden pre-Pilot-B stage alias under the `canonical-stage-name` lint rule;
  the human label stays "Outline". Topbar eyebrow shows "status · current screen"
  for "you are here" (Surface #4). Front-door How-this-works rewritten to the
  three screens (D4). The standalone topbar "Study Guide" button is gone (it's a
  tab now); the StudyGuideModal was replaced by the Study-guide tab.
- Multi-entity debounce safety: section + sermon field savers flush a pending
  write when the edited id changes (a single trailing-args timer would otherwise
  drop an earlier entity's last keystrokes when jumping between rows).
- Fixture (`SeriesPlannerFixture.jsx`) reseeded to the pastor's real Luke artifact
  (Book ▸ 2 sections ▸ 3 pericopes, each with big idea + overview); route accepts
  `?planner=schedule|study-guide`, default outline. Stale copy fixed in
  `Planning.jsx` (delete-modal) and `App.jsx` (fixture-route comment).
- **Verify:** eslint 0 on all changed files; vitest 234 passed; `vite build`
  compiles (SeriesPlanner 52 kB); preview render of `?planner`, `?planner=schedule`,
  and `?planner=study-guide` (after Import) all render the new model with **zero
  console errors** (Outline nested tree, Schedule single-source dates + pacing,
  Study-guide booklet with pages/notes/additions).
- **Interim note for audit:** the exported `.docx` still uses the OLD
  buildStudyGuideDoc (reads the now-unwritable book_background etc., so it exports
  mostly-empty legacy parts) until Phase 3 rewrites it to match the booklet
  preview + wire study_guide_extras. The on-screen preview is the new model now;
  the export catches up in Phase 3.

## Phase 2 — Schedule two-way + the jump button (DONE)

Phase 1 already landed single-source dates and a tab-switch "Schedule" button;
Phase 2 makes the connection tangible and genuinely two-way:
- **The date is now editable on BOTH surfaces** — added a Date field to the
  expanded pericope on the Outline, wired through the same single-source
  `handleSermonField` path the Schedule screen uses. Editing on either surface
  reflects live on the other (verified: a Schedule edit to Feb 1 showed on the
  Outline chip immediately). The collapsed chip stays a read-only summary.
- **The "Schedule" jump now lands on the row that owns the date** — it carries
  the sermon id (`goToSchedule`), and the Schedule screen scrolls that row into
  view and flashes it (gold ring, fades after ~1.6s), then consumes the focus
  once. Verified: clicking a pericope's Schedule button switches to the Schedule
  tab with exactly one row flashed.
- `end_date` continues to mirror the last dated sermon on any date change.
- **Verify:** eslint 0; vite build compiles; preview — jump+flash lands on the
  right row, two-way date reflection works, zero console errors.

(Phases below are appended as they complete.)
