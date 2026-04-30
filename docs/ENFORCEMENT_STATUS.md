# Enforcement Status

**Last verified:** 2026-04-30 (post-triage import-drift hardening)
**Verified against:** `docs/CORE.md`, enforcement pass closed against working tree at HEAD `23a97f3` (uncommitted, see closing summary). Pilot C added the CTA primitive layer; Pilot D added the loading + empty-state primitives; Pilot E added `<BackButton>` (Surface #5 closes); Pilot B.2 renamed Archive → Completed Sermons (closes Surface #4 exception); Pilot B.3 added the Dashboard Resume Work panel + Mark Complete UX (closes State #6 surface gap). Post-triage: `react/jsx-no-undef` and `no-undef` enabled to close the consumer-side import-drift class that hit `SeriesPlanner.jsx` during Pilot C.

## Summary

| Layer | Count | Notes |
|---|---|---|
| Structural | 13 clauses | Impossible to violate by API shape (compile or runtime). |
| Test | 2 clauses | Caught at CI by failing tests; no structural impossibility, but test gates merge. |
| Lint | 3 clauses | Caught at editor and pre-commit by custom ESLint rules. |
| Deferred (Phase 4 / Phase 6 / specific pilots) | 3 clauses | Known gaps with named owners; see "Deferred enforcement" below. |
| Unenforceable | 0 clauses | Zero clauses are unenforceable. Every clause in `docs/CORE.md` has a real enforcement mechanism: structural, test, lint, or named-deferred with an owner. |

A single clause may be enforced at multiple layers — the count above assigns each to its **primary** mechanism. Secondary layers are listed in the per-clause table.

## Per-clause status

| Clause | Layer | File / mechanism | Verification command |
|---|---|---|---|
| State #1 — series + sermon are first-class state | Structural | `src/core/spine.ts` is the only sermon/series API; integrity gate at `scripts/spine-integrity.js` blocks all bypasses | `node scripts/spine-integrity.js` |
| State #2 — every sermon has a canonical position | Structural | v17 migration added `current_stage / current_step / current_sub_phase` columns; `spine.getSermon()` derives `position: ProcessPosition` from them | `npm test -- tests/contracts/process-1-monotonic.test.ts` |
| State #3 — no anonymous atoms | Structural (renderer fast-fail + IPC re-validation) | Renderer: `src/core/spine.ts` `createSermon` / `createSeries` throw `ContractViolation`. Main: `validateAndCommit` re-rejects with `code: STATE_3_NAMELESS_*` | `npm test -- tests/contracts/state-3-no-anonymous-atoms.test.ts` |
| State #4 — parent context first-class | Structural | `spine.getSermon()` computes `parentContext: { seriesId, seriesName, positionInSeries, totalInSeries }` from sibling order at read time | `node scripts/spine-integrity.js` (the spine is the only path) |
| State #5 — one name per concept | Lint + Test | Forbidden-alias set: `writing`, `ready`, `archived` (narrowed — see Deferred). Lint: `sermonforge/canonical-stage-name`. Test: `tests/contracts/state-5-one-name-per-concept.test.ts` | `npm run lint && npm test -- tests/contracts/state-5-one-name-per-concept.test.ts` |
| State #6 — in-progress queryable from front door | Structural | `spine.getInProgressSermons()` is wired into the Dashboard Resume Work tile, which renders top in-progress sermons with a return-day reminder section for sermons whose delivery date has passed but stage is still `in_progress`. Mark Complete on the Delivery tab + Mark Series Complete in the SeriesPlanner topbar provide the lifecycle close-out, with auto-suggest banners that surface the action without performing it (Principle: system suggests, user decides). | `node scripts/spine-integrity.js` (API surface present + consumed) |
| Process #1 — movement is monotonic | Structural + Test | `validateAndCommit` rejects forward-to-prior with `code: PROCESS_1_FORWARD_TO_PRIOR` | `npm test -- tests/contracts/process-1-monotonic.test.ts` |
| Process #2 — movement gated by user evidence | Structural + Test | `validateAndCommit` rejects empty evidence (non-legacy); v17 `legacy_evidence_cutoff` carve-out for sermons whose `created_at < cutoff`. **Per-stage evidence-sufficiency rules deferred to SPRD** | `npm test -- tests/contracts/process-2-evidence-gated.test.ts` |
| Process #3 — movement is a visible event | Structural + Test | `data-testid="movement-event"` element rendered in `SermonWorkspace.jsx` on tab transition; meta-test guards against silent removal | `npm test -- tests/contracts/process-3-movement-visible.test.tsx` |
| Process #4 — PC follows the text | Test (shell) | RTL test asserts brand-new sermon with empty PC + observations renders at Observe without gating. **Phase mechanics (progressive PC across Observe → Interpret → Redemptive Thread → Implications) deferred to SPRD** | `npm test -- tests/contracts/process-4-pc-follows-text.test.tsx` |
| Process #5 — AI augments, never substitutes | Structural + Test | `validateAndCommit` rejects `ai_proposal` when prior field is empty (treats `""`, `"[]"`, `"{}"` as empty); `code: PROCESS_5_AI_NO_USER_EVIDENCE` | `npm test -- tests/contracts/process-5-ai-augments.test.ts` |
| Mutation #1 — user typing wins | Structural + Test | `ai_apply` requires `proposalId` from a prior `ai_proposal`; in-memory `proposals` Map keyed by server-generated UUID; mismatched sermon/field also rejected | `npm test -- tests/contracts/mutation-1-user-typing-wins.test.ts` |
| Mutation #2 — AI proposals in separate slot | Structural + Component | Spine: `ai_proposal` stages value in `proposals` Map, never writes to DB until `ai_apply`. Component: `src/components/ProposalPanel.jsx` already renders the separate-slot UI. **Primitive-layer generalization deferred to Phase 4** | `npm test -- tests/contracts/mutation-1-user-typing-wins.test.ts` (covers the staging) |
| Mutation #3 — saves are events | Structural + Test | `spine.persistMutation(setSaveState, doMutation)` is the canonical save-state helper; `SermonWorkspace.jsx` consumes it. **`<SaveIndicator>` primitive deferred to Phase 6** | `npm test -- tests/contracts/mutation-3-saves-are-events.test.ts` |
| Mutation #4 — destruction proportional to reversal | Structural (Component) | `src/components/DeleteButton.jsx` is the canonical two-step inline confirm; used everywhere destructive UI lives. **`<DestructiveAction>` primitive generalization deferred to Phase 4** | (No dedicated test in Phase 5 — DeleteButton's contract is the structural artifact) |
| Mutation #5 — errors speak in one voice | Lint | `sermonforge/no-window-alert` flags `alert()` / `confirm()` / `window.alert()` / `window.confirm()`. Component pattern: `<InlineError>` for field-level, App.jsx banner for retryable. **`<ErrorBanner>` primitive deferred to Phase 4** | `npm run lint` (zero violations today) |
| Surface #1 — one vocabulary | Lint + Test | Lint: `sermonforge/canonical-stage-name` (narrowed forbidden set). Test: `tests/contracts/surface-1-one-vocabulary.test.ts` shares scan helper with State #5 | `npm run lint && npm test -- tests/contracts/surface-1-one-vocabulary.test.ts` |
| Surface #2 — one CTA system | Lint + Structural | `src/components/primitives/{PrimaryButton,SecondaryButton,IconButton}.tsx` are the canonical CTA + icon-button shapes. `sermonforge/no-raw-button` flags every `<button>` outside `src/components/primitives/`. **15 residual baseline errors** (down from 149) sit on shapes Pilot C deliberately doesn't cover: tertiary text-link buttons (Dashboard "guided tour", Sidebar "Send feedback", workspace "How this works"), nav/tab buttons (`stage-tab`, `delivery-tab-btn`, sub-phase pills) deferred to Pilot E, and dark-theme tour overlay buttons. | `npm run lint` (visible 15-error residual; resolved post-Pilot E + future tertiary-link decision) |
| Surface #3 — one empty-state + loading vocabulary | Lint + Structural | `src/components/primitives/{LoadingState,EmptyState}.tsx` are the canonical loading + empty-state shapes. `LoadingState`'s `verb` prop is typed against the `LoadingVerb` union in `src/core/contracts.ts` (`"Loading…"` / `"Saving…"` / `"Thinking…"`). `<PrimaryButton loading={...}>` auto-renders the canonical verb. `sermonforge/canonical-loading-verb` zero-violations on committed code; rule now exempts JSX attribute values so placeholders aren't false positives. | `npm run lint` (zero `canonical-loading-verb` errors today) |
| Surface #4 — "you are here" is always answerable | Test | `tests/contracts/surface-4-you-are-here.test.ts` parses router destinations from `App.jsx` and sidebar entries from `Sidebar.jsx`, asserts router ⊆ sidebar ∪ EXPECTED_DEEP. Pilot B.2 closed the `archive` exception by renaming the route to `completed-sermons` and adding the canonical sidebar entry; `EXPECTED_DEEP` now contains only `series-planner` and `workspace` (genuinely deep routes). | `npm test -- tests/contracts/surface-4-you-are-here.test.ts` |
| Surface #5 — one re-entry convention | Structural | `src/components/primitives/BackButton.tsx` is the canonical back-affordance shape; supplies the `←` prefix automatically. Two variants: `labeled` (default, "← Back" or custom child text like "Return to Study") and `icon` (chevron only). Four back-shape sites migrated: SermonWorkspace topbar chevron, SermonWorkspace error case, SeriesPlanner topbar, OutlineTab "Return to Study". | (No dedicated test — the primitive's existence + consumer adoption is the structural artifact; surfaces with no back affordance at all remain a UX-design decision, not a contract gap) |

## The Spine Integrity Gate

**Status:** active
**Location:** `scripts/spine-integrity.js`
**Wired into:** `.husky/pre-commit` (also runs `lint-staged`)
**Last failure-injection test:** 2026-04-30, result: pass (gate fires on injected `db.run(...)` in `src/components/Calendar.jsx`, restores cleanly)

The gate scans the codebase on every commit and CI run for four bypass classes:

1. `db.run` / `db.prepare` / `db.exec` outside `electron/main.js`
2. Raw `INSERT` / `UPDATE` / `DELETE` SQL on `sermons` / `series` / `series_sections` outside `electron/main.js`
3. `window.electronAPI.spine(...)` outside `src/core/spine.ts` (+ `electron/preload.js` which exposes the bridge)
4. Imports of any spine-only function name from `src/db/database.js` (with or without `.js` suffix) outside `src/core/`

**If this gate fails, every structural enforcement claim above is invalidated. Do not commit. Do not ship.**

## Deferred enforcement (known gaps with owners)

### Phase 4 — Component primitive layer (lands during audit triage)

- **Mutation #2** surface side: `<ProposalPanel>` is implemented; primitive-layer generalization completes structural enforcement of "AI proposals live in a separate slot" across all surfaces.
- **Mutation #4**: `<DestructiveAction>` primitive enforces "destruction proportional to reversal cost" beyond the existing `<DeleteButton>`. (Pilot C moved `DeleteButton` from `src/components/` to `src/components/primitives/` so its three internal raw `<button>`s are exempt from `no-raw-button`; the canonical-pattern role is unchanged.)
- **Mutation #5** surface side: `<ErrorBanner>` and `<InlineError>` primitives complete the lint-only enforcement currently in place.
- **Surface #2** (Pilot C — landed): `<PrimaryButton>` / `<SecondaryButton>` / `<IconButton>` primitives in `src/components/primitives/`. 134 of 149 raw `<button>` violations migrated; 15 residual (nav/tab buttons deferred to Pilot E, tertiary text-link buttons, dark-theme tour overlay).
- **Surface #3** (Pilot D — landed): `<EmptyState>` / `<LoadingState>` primitives in `src/components/primitives/`. 30 non-canonical loading verbs replaced (Drafting/Generating/Reviewing/Synthesizing/Compiling/Assisting/Analyzing/Running → Thinking; Submitting/Creating/Exporting/Retrying/Formatting → Saving; Fetching scripture → Loading). Three empty states migrated to `<EmptyState>` (Planning, Archive, SermonList) as the pattern demo; further empty-state surfaces opt in incrementally.

### Phase 6 — Save and error pipeline integration

- **Mutation #3** surface integration: `<SaveIndicator>` primitive renders the structured `{ ok, code?, clause?, message? }` envelope from `persistMutation`. Currently structural at the spine layer; surface rendering pattern lives ad-hoc in `SermonWorkspace.jsx`.

### Specific audit-triage pilot dependencies

- **~~Pilot B.2 (Archive → Completed Sermons)~~** — landed. Route renamed `archive` → `completed-sermons`; `tests/contracts/surface-4-you-are-here.test.ts` `EXPECTED_DEEP` no longer contains the route. Per-sermon re-export wired by reusing the existing `sermon-export-manuscript` IPC (no new IPC channel needed).
- **~~Pilot B.3 (Dashboard "Resume your work")~~** — landed. Resume Work tile + return-day reminder + Mark Complete on Delivery + Mark Series Complete in planner all wired. State #6 surface gap closed; auto-suggest banners surface actions without performing them so the Principle (Clarity through Constraint) is preserved.
- **Pilots B.2 / E (workspace tab key migration to PascalCase):** allows `study` and `outline` to be added to the `canonical-stage-name` forbidden set without false positives. Today they appear as legitimate URL-safe tab keys (`TABS = ["study", "outline", "manuscript", "delivery"]`) and column names (`outline` is a sermon column), so the lint rule excludes them.
- **(Pilot covering view-key migration, if scheduled):** allows `planning` and `active` to be added to the same forbidden set. Today `"planning"` is the top-level Planning view name and `"active"` is the canonical CSS class for active sidebar items.
- **~~Pilot E (re-entry convention)~~** — landed. `<BackButton>` primitive lands in `src/components/primitives/`; four back-affordance sites migrated. Surface Contract #5 closed.

### SPRD (Study Phase Re-Design)

- **Process Contract #2 — evidence semantics:** the spine currently enforces evidence-required-and-non-empty as a shell contract. SPRD defines the per-stage evidence-sufficiency rules (what artifacts must exist for `Observe → Interpret`, what's "complete enough" for `Study → Blueprint`, etc.). Until then, any non-empty string passes the gate.
- **Process Contract #4 — phase mechanics:** Pastoral Context's progressive integration through Observe → Interpret → Redemptive Thread → Implications, as specified in `docs/SYSTEMS/sermon-workspace.md`. The Phase 5 test asserts only the structural shell ("PC absent ≠ Study locked"); the deeper mechanics — when PC enters as awareness, marination, texture, integration — are SPRD's content.

## Test environment caveat

Contract tests use **Path B**: an in-memory fixture mirroring the spine boundary, not the real Electron main process. The fixture lives at `tests/contracts/_helpers/test-spine.ts` and reproduces `validateAndCommit` and `spineRead` from `electron/main.js`.

**Drift risk:** if `validateAndCommit` or `spineRead` change in `electron/main.js` and the fixture isn't updated in lockstep, contract tests will pass against stale logic.

**Mitigation today:** the fixture's clause citations (`clause: "State #3"`, etc.) and error codes (`code: PROCESS_2_EMPTY_EVIDENCE`, etc.) mirror the main process literally. Any divergence in citation strings will surface as a test failure when tests assert on `clause:` or `code:`.

**Mitigation candidate:** Path A (real Electron in tests via spectron / playwright / Electron-test-runner) would eliminate this drift surface. Out of scope for this enforcement pass; revisit if drift causes a regression. Documented in `tests/contracts/README.md`.

### Consumer-side import drift

**Status:** active (resolved post-audit-triage).

The class of regression where a renderer component imports a name the spine doesn't export — for example, `getSeriesById` imported from `../core/spine` when the module only exports `getSeries` — used to pass every gate. The spine integrity gate scans for *forbidden* imports, not missing exports. `tsc` skips `.jsx` files by default. The Path B test fixture reproduces the spine API surface but doesn't exercise component imports. Pilot C silently introduced this exact bug in `SeriesPlanner.jsx` (primitives used without imports + `getSeriesById` rename missed) and it surfaced only as a runtime crash on the Series Planner page during the post-enforcement regression audit.

**Resolution:** `react/jsx-no-undef` and ESLint's built-in `no-undef` rule are now enabled at `error` in `.eslintrc.cjs`. The first catches missing-import cases on JSX components (`<Foo />` when `Foo` isn't in scope); the second catches the same on non-JSX symbols (function calls, member accesses, hook references). Both fire at editor time and at the lint-staged pre-commit hook. The Pilot C → SeriesPlanner regression class can no longer pass commit silently — `eslint-plugin-react` was already in `package.json` so the resolution was a `.eslintrc.cjs` config edit plus one fix (`BackButton.tsx` referenced `React.MouseEvent` without importing the namespace).

**Path A** (real Electron in tests) remains a candidate for a deeper class of integration bugs the lint rule can't catch (e.g., wrong-shape arguments to a real export). Still out of scope here; revisit if a regression of that class appears.

## Lint baseline accounting

| Rule | Current count | Resolved by |
|---|---|---|
| `sermonforge/no-raw-button` | 15 | Pilot C primitives landed (149 → 15). 15 residual: nav/tab buttons (Pilot E), tertiary text-link buttons, dark-theme tour overlay. |
| `sermonforge/canonical-loading-verb` | 0 | Pilot D landed (36 → 0). Rule tightened to exempt JSX attributes; 30 non-canonical verbs replaced with the three canonical ones. |
| `sermonforge/no-direct-database` | 0 | — |
| `sermonforge/canonical-stage-name` | 0 | — |
| `sermonforge/no-window-alert` | 0 | — |
| `react-hooks/rules-of-hooks` | 0 | — |
| `react/jsx-no-undef` | 0 | Enabled post-audit-triage as the structural fix for the consumer-side import-drift class (see §"Consumer-side import drift" above). |
| `no-undef` | 0 | Enabled alongside `react/jsx-no-undef`; one pre-existing drift surfaced (`BackButton.tsx` referenced `React.MouseEvent` without importing the namespace) and was fixed in the same change. |

**Approach A** (lint-staged in `.husky/pre-commit`) means the residual baseline doesn't block commits on untouched files. New violations on staged files do block. After Pilots C + D the visible total is **15** (residual `no-raw-button` only — nav/tab/tertiary text buttons), down from the original 185.

## What's NOT enforced

**Zero clauses are unenforceable.** Every clause in `docs/CORE.md` has a real enforcement mechanism: structural, test, lint, or named-deferred with an owner. As of Pilot E landing, all Surface Contract clauses (#1–#5) have at least one enforcement mechanism.

## What this document is for

When a future session asks "is clause X enforced?" — read this document, not memory.

When a contract test fails — the rejection cites the clause. Trace from clause number to this document's per-clause table to confirm the test is testing the right thing.

When a deferred clause's owning pilot lands — update this document. The deferred section is a working backlog; clauses move out of it as their owners complete.

When `docs/CORE.md` changes — re-verify this document. Clauses can be added, removed, or rewritten; this document must reflect the current contract.
