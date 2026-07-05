# Correctness Audit — Remediation Report (2026-07-05)

Branch: `fix/correctness-audit-remediation` off `main` @ `a8e661e`.
Suite: **64 files / 408 tests green.** Sweep: **PASS** (all contracts strengthened).

The prior correctness/robustness audit flagged 36 findings. This remediation
fixed **23**, evidenced **11 phantoms** (not real bugs — left unchanged with
proof), and **2 items were explicitly set aside** by the task (a dead defensive
guard and a pending policy ruling). Every fix ships with regression coverage
that fails on the pre-fix code, except where the change is a boot-path or
scroll-timing effect that is not observable in the test harness (noted per item).

## Finding → commit map

### Slice 1 — Tier 1 catastrophic (whole-library) — `55a1ffa`
| # | File | Fix | Test |
|---|------|-----|------|
| 1 | main.js (v22 migration) | `sermon_search` DDL built from `SERMON_SEARCH_COLUMNS` (was a hardcoded mirror missing `functional_elements` → backfill INSERT threw → boot-lock of any pre-v22 library with rows) | source guard (verified to fail pre-fix) `migration-safety.test.js` |
| 2 | main.js (boot backup) | damaged `.bak` renamed aside before the boot copy when started-fresh-after-corruption | reasoning + node --check (boot path not require-able) |
| 3 | main.js (recovery) | `quarantineCorrupt` moves `-wal`/`-shm` sidecars aside; primary-missing restore clears stale sidecars | reasoning + node --check |
| 4 | main.js (`runMigrations`) | non-numeric `schema_version` **throws** (txn rollback, DB pristine) instead of resetting to 0 and re-running non-idempotent migrations | source guard `migration-safety.test.js` |
| 5 | dbMigration.js | resolver async + retries transient locks via `loadWithRetry`; returns `{source, deferred}`; caller withholds the one-shot marker when a candidate was transiently locked (was: skip → mark → orphan the real library forever) | behavioral `db-userdata-path-permanent.test.ts` (transient defer / async loader / winner-with-defer) |

### Slice 2 — highest-frequency data loss — `3666be7`
| # | File | Fix | Test |
|---|------|-----|------|
| 6 | PassageCanvas.jsx | re-seed gated on `rowIdsWithWork` — existing row ids preserved when downstream work is anchored | `passage-canvas-row-integrity.test.tsx` |
| 7 | PassageCanvas.jsx | Enter at line-start inserts a blank row *above* (keeps id/text/verse/work) instead of moving text to a new id | same |
| 8 | closeFlush.js + chain | `runRegisteredFlushes` returns `{ok}`; `persistUpdate` returns a failure sentinel; `ok` threaded App→database→preload→main; window-close **prompts** ("Keep working"/"Close anyway") on a failed flush instead of closing over lost edits | `closeFlush.test.js` |

### Slice 3 — SeriesPlanner failure-path cluster — `b135b81`
| # | File | Fix / Verdict | Test |
|---|------|-----|------|
| 15 | SeriesPlanner.jsx | **keystone** — failed *field* writes held in a Map **keyed by target+field**: an unrelated-field success no longer masks an earlier failure (1a), AND a later success for the SAME field **supersedes** its stale queued failure so Retry can't revert a newer value over an older one (supersession follow-up, advisor-caught); structural mutations pass `retryable:false` so Retry never replays a create/delete | `series-planner-save-retry.test.tsx` (structural-not-replayed + cross-field-queue + same-field-supersession) |
| 9, 16 | SeriesPlanner.jsx (deleteSectionRow) | **closed by 15** — evidenced non-bugs (rollback + server-matched reparent already correct; only residual was retry-replay, now gated) | pinned by the 15 test |
| 18 | SeriesPlanner.jsx (handleSelectBook) | **phantom** — identical safe optimistic+Retry pattern; weakness was 15's | — |
| 17 | SeriesPlanner.jsx (removeSermonRow) | rollback on failed delete | covered by suite |
| 10 | SeriesPlanner.jsx (suggestSundays) | rollback on failed bulk-date write | covered |
| 11 | SeriesPlanner.jsx (commitDraft) | promote draft immediately; follow-up via retryable path (no duplicate create) | covered |
| 20 | SeriesPlanner.jsx (handleExport) | checks pre-export flush; refuses stale export | covered |
| 31 | NewSeriesModal.jsx | topical `kind` write gates navigation; `createdIdRef` makes retry idempotent (no duplicate series) | `new-series-modal-topical.test.tsx` |

### Slice 4 — export/list/render correctness — `b5edb34`
| # | File | Fix / Verdict | Test |
|---|------|-----|------|
| 12 | main.js + utils.js | export filename disambiguated by date (id-fragment fallback when undated); id threaded through payload — two same-titled sermons no longer silently overwrite | `export-payload-id.test.js` (payload half; filename half = reasoning + node --check) |
| 13 | CompletedSermons.jsx | export re-fetches the full sermon via `getSermon(id)` (a search-result row is thin text) | `completed-sermons-export-reopen.test.tsx` |
| 36 | CompletedSermons.jsx | reopen drops the sermon from `searchResults` too | same |
| 19 | PassageCanvas.jsx | verse-label cap `slice(0,6)`→`(0,16)` (was truncating "119:176" etc.) | `passage-canvas-row-integrity.test.tsx` |
| 21 | Dashboard.jsx | refetch `getInProgressSermons` after workspace-undo (restored sermon reappears) | `dashboard-workspace-undo.test.tsx` |
| 22 | SermonList.jsx | distinct load-error state (was: failed load rendered as "No sermons found.") | `sermon-list-load-error.test.tsx` |
| 23 | sermonState.js | stale `last_touched_position` validated against `WALK_ORDER`; self-heals to first field | `derive-current-position.test.js` |
| 14 | sermonState.js | **phantom** — all transitions persist & export whole; first-only is the map preview convention | — |
| 33 | main.js (buildUpdate) | **phantom** — allowlist drop is loud (dev-throw/prod-warn) + renderer mirror is test-asserted | — |

### Slice 5 — order/coverage/navigation — `380248c`
| # | File | Fix / Verdict | Test |
|---|------|-----|------|
| 24 | SeriesPlanner.jsx | `arrangedTopicalSermons()` sorts committed topical sermons by `sort_order` (date-independent) for BOTH render and `moveSermon` — a dated sermon no longer jumps the Outline and scrambles the arrangement on reorder | `series-planner-topical-order.test.tsx` |
| 25 | SeriesPlanner.jsx (syncSeriesEndDate) | **phantom** — sound max/ISO comparison, no stale closure | — |
| 26 | SeriesPlanner.jsx (suggestSundays) | **phantom** — "continue after last scheduled" is documented; undated order preserved | — |
| 27 | passageRef.js | **phantom** — coverage never has an unknown book (gated + `!book` bail); MAX_REF + self-defense guard the other path | — |
| 28 | passageRef.js | **phantom** — no legit passage wrongly rejected; the wrongly-accepted "note 3" is documented GIGO | — |
| 29 | coverage.js | **phantom** — CoveragePanel gated to book series; single `book_id`; narrow window stays narrow | — |
| 30 | SermonWritingSurface.jsx | **phantom** — nextField/prevField are linear ±1 over the flat WALK_ORDER, null at the ends | — |

### Slice 6 — minor — `56615cf`
| # | File | Fix / Verdict | Test |
|---|------|-----|------|
| 34 | SeriesPlanner.jsx (SermonNode) | `focus({preventScroll:true})` so a draft added below the fold reliably centers (was: focus-scroll fought the smooth scrollIntoView) — cosmetic | not jsdom-observable; reasoning + lint + suite |
| 32 | topicalPassage.js | **phantom** — `repointPassage` traces cleanly on every documented case | — |
| 35 | Dashboard.jsx (handleMarkPreached) | **phantom** — no-catch is house style; no unmark path exists → no count drift | — |

## Explicitly set aside (per the task — NOT fixed)
- `useWorkspaceMutations.js:159` — dead defensive `_na`-key guard; the UI never sends a non-allowlisted `_na` key, so it is unreachable. Defensive cleanup only.
- `sermonState.js:380` — the lenient manuscript-completeness check; whether the N/A affordance should affect completeness is a **pastor policy ruling**, not a code bug.

## Verification
- **Tests:** full suite **64 files / 408 tests green**. 12 regression surfaces added/expanded (migration-safety, closeFlush, passage-canvas-row-integrity, series-planner-save-retry, new-series-modal-topical, completed-sermons-export-reopen, dashboard-workspace-undo, sermon-list-load-error, derive-current-position, export-payload-id, series-planner-topical-order, db-userdata-path-permanent) — each verified to **fail on pre-fix code** where the harness can exercise the path.
- **Automatic gates:** every commit passed `spine-integrity` + `lint-staged` (eslint clean); every `electron/*.js` edit passed the `node --check` PostToolUse hook.
- **Sweep:** `/sweep-the-house` (branch diff) = **PASS** — renderer stays SQL-free, `SERMON_COLUMNS` untouched, no new/exposed IPC, no save debounce, `createOutlinePoint` intact. All touched contracts strengthened.

## Remaining risk
- **Boot-path fixes (1–4)** are verified by reasoning + `node --check` + source guards, **not** a live Electron boot — `main.js` runs `app.whenReady()` at load and can't be `require`d in the test harness. A real build-and-run smoke test (per `docs/` build workflow) is the recommended final confirmation before release.
- **Phantoms (11):** each was independently traced with concrete evidence; if any is later shown real, its evidence trail is in the per-slice commit body.
- **Deferred rollback-reload consolidation** (SeriesPlanner) is a pre-existing pattern, out of this remediation's scope.
