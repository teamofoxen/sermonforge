# Enforcement Status

**Last verified:** 2026-05-01 (Process #4 wording sharpened; PC vision captured in sermon-workspace.md)
**Verified against:** `docs/CORE.md`. The audit triage initiative is closed. All five primary pilots shipped (C / D / E / B.2 / B.3 — Surface Contract + State #6). All four post-pilot deferred-bucket items shipped: (1) `react/jsx-no-undef` + `no-undef` enabled (closes the consumer-side import-drift class), (2) view-key vocabulary completion (`VIEW.{Dashboard,Sermons,Calendar,CompletedSermons,Planning,SeriesPlanner,Workspace}` PascalCase, single source of truth in `src/core/contracts.ts`), (3) workspace tab-key vocabulary completion (`STAGE.{Study,Blueprint,Manuscript,Delivery}` with coordinated update of `contextBuilder.js` switch cases, `reviewPrompts.js`, `prompts/sermon.js`, `memory.js` capture set, and `workspaceTourStops.js`), and (4) CTA primitive set completion by adding `<TextButton>`. The `canonical-stage-name` / Surface #1 / State #5 lint forbidden set is now the full seven legacy aliases: `writing`, `ready`, `archived`, `planning`, `active`, `study`, `outline`; the rule has a CSS-class-context exemption so `className={... ? "active" : ""}` literals don't false-fire. The four CTA primitives (PrimaryButton, SecondaryButton, IconButton, TextButton) cover every Surface #2 CTA shape; the 5 residual `no-raw-button` lint hits are tab/pill navigation elements (not CTAs) — see Surface #2 row for scope distinction. **2026-04-30 update:** a Canonical Vocabulary section was added to `docs/CORE.md` defining *field*, *sub-phase*, *boundary*, *named outcome*, *handoff*, *throughline*, and *Pastoral Context*; Process Contract #6 — *The Study throughline is structural* — was added alongside, drafted but inactive pending the Study Field Definition Initiative (SFDI; charter at `docs/PROPOSALS/sfdi-charter.md`) shipping its first per-field entries. SPRD planning is paused pending SFDI; SPRD's structural findings stand and resume implementation after SFDI lands. **2026-05-01 update:** Process Contract #4's lead clause sharpened from *"Pastoral Context follows the text, not the other way around"* to *"Pastoral Context is driven by the text, not the other way around"* — wording change only; clause behavior, enforcement mechanism, and shell-level test (PC absent ≠ Study locked) unchanged. The detailed PC progressive vision — articulated by the product owner during SPRD planning — is now captured verbatim in `docs/SYSTEMS/sermon-workspace.md` under "The Study throughline." SPRD Q7 (Implications restructure) partially answered: one coherent step with PC as one of three voices, not split.

## Summary

| Layer | Count | Notes |
|---|---|---|
| Structural | 16 clauses | Impossible to violate by API shape (compile or runtime). |
| Test | 2 clauses | Caught at CI by failing tests; no structural impossibility, but test gates merge. |
| Lint | 3 clauses | Caught at editor and pre-commit by custom ESLint rules. |
| Inactive — pending initiative | 1 clause | Process #6 (Study throughline is structural). Drafted 2026-04-30; activates when SFDI ships first per-field entries. |
| Fully unenforced | 0 clauses | Every active clause in `docs/CORE.md` has a real primary enforcement mechanism. Process #6 is owner-deferred to SFDI, not unenforceable. |
| Sub-clause portions named-deferred to a specific successor | 6 portions | 3 to Phase 4 component primitives (Mutation #2 ProposalPanel generalization, Mutation #4 DestructiveAction, Mutation #5 ErrorBanner / InlineError); 1 to Phase 6 save+error pipeline (Mutation #3 SaveIndicator); 2 to SPRD (Process #2 per-stage evidence-sufficiency, Process #4 phase mechanics). The clauses themselves are enforced at primary; the deferred sub-portions are clearly-owned successor work, not gaps. |

A single clause may be enforced at multiple layers — the count above assigns each to its **primary** mechanism. Secondary layers are listed in the per-clause table.

## Per-clause status

| Clause | Layer | File / mechanism | Verification command |
|---|---|---|---|
| State #1 — series + sermon are first-class state | Structural | `src/core/spine.ts` is the only sermon/series API; integrity gate at `scripts/spine-integrity.js` blocks all bypasses | `node scripts/spine-integrity.js` |
| State #2 — every sermon has a canonical position | Structural | v17 migration added `current_stage / current_step / current_sub_phase` columns; `spine.getSermon()` derives `position: ProcessPosition` from them | `npm test -- tests/contracts/process-1-monotonic.test.ts` |
| State #3 — no anonymous atoms | Structural (renderer fast-fail + IPC re-validation) | Renderer: `src/core/spine.ts` `createSermon` / `createSeries` throw `ContractViolation`. Main: `validateAndCommit` re-rejects with `code: STATE_3_NAMELESS_*` | `npm test -- tests/contracts/state-3-no-anonymous-atoms.test.ts` |
| State #4 — parent context first-class | Structural | `spine.getSermon()` computes `parentContext: { seriesId, seriesName, positionInSeries, totalInSeries }` from sibling order at read time | `node scripts/spine-integrity.js` (the spine is the only path) |
| State #5 — one name per concept | Lint + Test | Forbidden-alias set (post-vocabulary-completion): `writing`, `ready`, `archived`, `planning`, `active`, `study`, `outline`. Lint: `sermonforge/canonical-stage-name` with CSS-class-context exemption (literals nested under a `className` JSX attribute aren't flagged — those are CSS class names, not state/status/route identifiers). Test: `tests/contracts/state-5-one-name-per-concept.test.ts`. | `npm run lint && npm test -- tests/contracts/state-5-one-name-per-concept.test.ts` |
| State #6 — in-progress queryable from front door | Structural | `spine.getInProgressSermons()` is wired into the Dashboard Resume Work tile, which renders top in-progress sermons with a return-day reminder section for sermons whose delivery date has passed but stage is still `in_progress`. Mark Complete on the Delivery tab + Mark Series Complete in the SeriesPlanner topbar provide the lifecycle close-out, with auto-suggest banners that surface the action without performing it (Principle: system suggests, user decides). | `node scripts/spine-integrity.js` (API surface present + consumed) |
| Process #1 — movement is monotonic | Structural + Test | `validateAndCommit` rejects forward-to-prior with `code: PROCESS_1_FORWARD_TO_PRIOR` | `npm test -- tests/contracts/process-1-monotonic.test.ts` |
| Process #2 — movement gated by user evidence | Structural + Test | `validateAndCommit` rejects empty evidence (non-legacy); v17 `legacy_evidence_cutoff` carve-out for sermons whose `created_at < cutoff`. **Per-stage evidence-sufficiency rules deferred to SPRD** | `npm test -- tests/contracts/process-2-evidence-gated.test.ts` |
| Process #3 — movement is a visible event | Structural + Test | `data-testid="movement-event"` element rendered in `SermonWorkspace.jsx` on tab transition; meta-test guards against silent removal | `npm test -- tests/contracts/process-3-movement-visible.test.tsx` |
| Process #4 — PC follows the text | Test (shell) | RTL test asserts brand-new sermon with empty PC + observations renders at Observe without gating. **Phase mechanics (progressive PC across Observe → Interpret → Redemptive Thread → Implications) deferred to SPRD** | `npm test -- tests/contracts/process-4-pc-follows-text.test.tsx` |
| Process #5 — AI augments, never substitutes | Structural + Test | `validateAndCommit` rejects `ai_proposal` when prior field is empty (treats `""`, `"[]"`, `"{}"` as empty); `code: PROCESS_5_AI_NO_USER_EVIDENCE` | `npm test -- tests/contracts/process-5-ai-augments.test.ts` |
| Process #6 — Study throughline is structural | Inactive (pending SFDI) | New clause introduced 2026-04-30 alongside the SFDI charter (`docs/PROPOSALS/sfdi-charter.md`). Activates when SFDI ships its first per-field entries. Future enforcement test will parse SFDI for visible scaffolding (per-field connections, per-sub-phase named outcomes, per-boundary handoffs); the throughline's substantive integrity binds the writer. | (No verification command until SFDI ships first content) |
| Mutation #1 — user typing wins | Structural + Test | `ai_apply` requires `proposalId` from a prior `ai_proposal`; in-memory `proposals` Map keyed by server-generated UUID; mismatched sermon/field also rejected | `npm test -- tests/contracts/mutation-1-user-typing-wins.test.ts` |
| Mutation #2 — AI proposals in separate slot | Structural + Component | Spine: `ai_proposal` stages value in `proposals` Map, never writes to DB until `ai_apply`. Component: `src/components/ProposalPanel.jsx` already renders the separate-slot UI. **Primitive-layer generalization deferred to Phase 4** | `npm test -- tests/contracts/mutation-1-user-typing-wins.test.ts` (covers the staging) |
| Mutation #3 — saves are events | Structural + Test | `spine.persistMutation(setSaveState, doMutation)` is the canonical save-state helper; `SermonWorkspace.jsx` consumes it. **`<SaveIndicator>` primitive deferred to Phase 6** | `npm test -- tests/contracts/mutation-3-saves-are-events.test.ts` |
| Mutation #4 — destruction proportional to reversal | Structural (Component) | `src/components/DeleteButton.jsx` is the canonical two-step inline confirm; used everywhere destructive UI lives. **`<DestructiveAction>` primitive generalization deferred to Phase 4** | (No dedicated test in Phase 5 — DeleteButton's contract is the structural artifact) |
| Mutation #5 — errors speak in one voice | Lint | `sermonforge/no-window-alert` flags `alert()` / `confirm()` / `window.alert()` / `window.confirm()`. Component pattern: `<InlineError>` for field-level, App.jsx banner for retryable. **`<ErrorBanner>` primitive deferred to Phase 4** | `npm run lint` (zero violations today) |
| Surface #1 — one vocabulary | Lint + Test | Lint: `sermonforge/canonical-stage-name` (narrowed forbidden set). Test: `tests/contracts/surface-1-one-vocabulary.test.ts` shares scan helper with State #5 | `npm run lint && npm test -- tests/contracts/surface-1-one-vocabulary.test.ts` |
| Surface #2 — one CTA system | Structural + Lint | **Surface #2 is fully enforced structurally for CTAs.** The four canonical CTA primitives — `src/components/primitives/{PrimaryButton,SecondaryButton,IconButton,TextButton}.tsx` — cover every CTA shape (primary, secondary, icon-only, tertiary text-link). `sermonforge/no-raw-button` flags every `<button>` outside `src/components/primitives/` to keep new code on the primitives. **5 residual lint hits** (down from 149 at Pilot C start → 15 post-Pilot C → 5 post-TextButton) are all **tab/pill navigation elements** — `stage-tab` (workspace), `delivery-tab-btn` (delivery), `step-pill` + `subphase-pill` (study), and the planner top-tab row. These are **navigation surfaces, not CTAs**, and are therefore outside Surface #2's scope. A future `<TabButton>` or `<NavButton>` primitive that gives them a canonical home is **sequel hygiene work, not contract-driven** — it would close the lint baseline to zero but doesn't strengthen any contract clause. The eight text-link buttons (Dashboard "guided tour", Sidebar "Send feedback", workspace + planner "How this works", planner "Study Guide", tour overlay "Leave tour") landed via `<TextButton>`; the tour overlay "Back" / "Next" landed via `<SecondaryButton>` / `<PrimaryButton>` with `.btn-ghost-dark` className overrides for the dark-theme callout (no `theme="dark"` variant prop needed — className handles it); the password-toggle "show/hide" in `SetupScreen` and the "×" dismiss in `StudyTab` landed via `<IconButton>`. | `npm run lint` (5-hit residual is navigation, not CTA — Surface #2 itself is structurally closed) |
| Surface #3 — one empty-state + loading vocabulary | Structural + Lint | `src/components/primitives/{LoadingState,EmptyState}.tsx` are the canonical loading + empty-state shapes. `LoadingState`'s `verb` prop is typed against the `LoadingVerb` union in `src/core/contracts.ts` (`"Loading…"` / `"Saving…"` / `"Thinking…"`). `<PrimaryButton loading={...}>` auto-renders the canonical verb. `sermonforge/canonical-loading-verb` zero-violations on committed code; rule now exempts JSX attribute values so placeholders aren't false positives. | `npm run lint` (zero `canonical-loading-verb` errors today) |
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
- **~~Surface #2~~** (Pilot C + TextButton follow-up — landed): `<PrimaryButton>` / `<SecondaryButton>` / `<IconButton>` / `<TextButton>` primitives in `src/components/primitives/`. 144 of 149 raw `<button>` violations migrated. The 5 lint hits that remain are tab/pill nav elements (not CTAs) and live outside Surface #2's scope; a future `<TabButton>` / `<NavButton>` primitive is sequel hygiene, not contract-driven.
- **Surface #3** (Pilot D — landed): `<EmptyState>` / `<LoadingState>` primitives in `src/components/primitives/`. 30 non-canonical loading verbs replaced (Drafting/Generating/Reviewing/Synthesizing/Compiling/Assisting/Analyzing/Running → Thinking; Submitting/Creating/Exporting/Retrying/Formatting → Saving; Fetching scripture → Loading). Three empty states migrated to `<EmptyState>` (Planning, Archive, SermonList) as the pattern demo; further empty-state surfaces opt in incrementally.

### Phase 6 — Save and error pipeline integration

- **Mutation #3** surface integration: `<SaveIndicator>` primitive renders the structured `{ ok, code?, clause?, message? }` envelope from `persistMutation`. Currently structural at the spine layer; surface rendering pattern lives ad-hoc in `SermonWorkspace.jsx`.

### Specific audit-triage pilot dependencies

- **~~Pilot B.2 (Archive → Completed Sermons)~~** — landed. Route renamed `archive` → `completed-sermons`; `tests/contracts/surface-4-you-are-here.test.ts` `EXPECTED_DEEP` no longer contains the route. Per-sermon re-export wired by reusing the existing `sermon-export-manuscript` IPC (no new IPC channel needed).
- **~~Pilot B.3 (Dashboard "Resume your work")~~** — landed. Resume Work tile + return-day reminder + Mark Complete on Delivery + Mark Series Complete in planner all wired. State #6 surface gap closed; auto-suggest banners surface actions without performing them so the Principle (Clarity through Constraint) is preserved.
- **~~Workspace tab-key PascalCase migration~~** — landed. `TABS = STAGE_SEQUENCE` from `src/core/contracts.ts`; activeTab values are `STAGE.{Study,Blueprint,Manuscript,Delivery}`; `contextBuilder.js` switch cases, `reviewPrompts.js`, `prompts/sermon.js`, `memory.js` capture set, and `workspaceTourStops.js` all updated in lockstep. localStorage migration in `SermonWorkspace.jsx` maps pre-migration lowercase values to the canonical Stage so existing sermons restore the correct tab on next mount. `study` and `outline` are now in the `canonical-stage-name` forbidden set.
- **~~View-key migration~~** — landed. Top-level routes consume `VIEW.{Dashboard,Sermons,Calendar,CompletedSermons,Planning,SeriesPlanner,Workspace}` from `src/core/contracts.ts`; App.jsx + Sidebar.jsx migrated; the Surface #4 test parser was extended to also accept `VIEW.<Name>` enum references alongside literal strings. `planning` and `active` are now in the `canonical-stage-name` forbidden set; the rule's CSS-class-context exemption keeps `nav-item.active` and similar legitimate CSS modifier usages clean.
- **~~Pilot E (re-entry convention)~~** — landed. `<BackButton>` primitive lands in `src/components/primitives/`; four back-affordance sites migrated. Surface Contract #5 closed.

### SFDI (Study Field Definition Initiative)

- **Process Contract #6 — Study throughline is structural:** new clause introduced 2026-04-30 alongside the SFDI charter (`docs/PROPOSALS/sfdi-charter.md`). The clause draws a line between binding (the throughline's integrity, per-sub-phase named outcomes, per-boundary handoffs) and pedagogical (number, wording, exact text of fields and named outcomes). Activates when SFDI ships its first per-field entries — until then, drafted but inactive. The future enforcement test parses the SFDI document for visible scaffolding (each field declares its connections; each sub-phase declares its named outcome; each boundary names its handoff). The throughline's substantive integrity — does each field actually contribute, does each named outcome follow from the field-work, does the handoff actually carry — binds the writer; the mechanical part is evidence, the spirit is the contract.

### SPRD (Study Phase Re-Design)

**Status as of 2026-04-30:** SPRD planning is paused pending SFDI. SPRD's structural findings (the spine bypass on sub-phase and step transitions, silent transitions, Mutation #2 violations on Synthesize and Compile, Pastoral Context progressive model) stand. SPRD's content-level decisions (sections 2, 3, and several open questions) were sitting on the assumption that the fields inside each sub-phase are right; they're not. SFDI fixes the field layer first; SPRD's affected sections get a revision pass after SFDI lands; then implementation. Q1 of SPRD (sub-phase and step transitions become real recorded movements through the spine) is decided.

- **Process Contract #2 — evidence semantics:** the spine currently enforces evidence-required-and-non-empty as a shell contract. SPRD defines the per-stage evidence-sufficiency rules (what artifacts must exist for `Observe → Interpret`, what's "complete enough" for `Study → Blueprint`, etc.). Until then, any non-empty string passes the gate.
- **Process Contract #4 — phase mechanics:** Pastoral Context's progressive integration through Observe → Interpret → Redemptive Thread → Implications, as specified in `docs/SYSTEMS/sermon-workspace.md`. The Phase 5 test asserts only the structural shell ("PC absent ≠ Study locked"); the deeper mechanics — when PC enters as awareness, marination, texture, integration — are SPRD's content.

## Test environment caveat

Contract tests use **Path B**: an in-memory fixture mirroring the spine boundary, not the real Electron main process. The fixture lives at `tests/contracts/_helpers/test-spine.ts` and reproduces `validateAndCommit` and `spineRead` from `electron/main.js`.

**Drift risk:** if `validateAndCommit` or `spineRead` change in `electron/main.js` and the fixture isn't updated in lockstep, contract tests will pass against stale logic.

**Mitigation today:** the fixture's clause citations (`clause: "State #3"`, etc.) and error codes (`code: PROCESS_2_EMPTY_EVIDENCE`, etc.) mirror the main process literally. Any divergence in citation strings will surface as a test failure when tests assert on `clause:` or `code:`.

**Mitigation candidate:** Path A (real Electron in tests via spectron / playwright / Electron-test-runner) would eliminate this drift surface. Out of scope for this enforcement pass; revisit if drift causes a regression. Documented in `tests/contracts/README.md`.

### Consumer-side import drift

**Status:** resolved (closed in the post-pilot deferred bucket).

The class of regression where a renderer component imports a name the spine doesn't export — for example, `getSeriesById` imported from `../core/spine` when the module only exports `getSeries` — used to pass every gate. The spine integrity gate scans for *forbidden* imports, not missing exports. `tsc` skips `.jsx` files by default. The Path B test fixture reproduces the spine API surface but doesn't exercise component imports. Pilot C silently introduced this exact bug in `SeriesPlanner.jsx` (primitives used without imports + `getSeriesById` rename missed) and it surfaced only as a runtime crash on the Series Planner page during the post-enforcement regression audit.

**Resolution:** `react/jsx-no-undef` and ESLint's built-in `no-undef` rule are now enabled at `error` in `.eslintrc.cjs`. The first catches missing-import cases on JSX components (`<Foo />` when `Foo` isn't in scope); the second catches the same on non-JSX symbols (function calls, member accesses, hook references). Both fire at editor time and at the lint-staged pre-commit hook. The Pilot C → SeriesPlanner regression class can no longer pass commit silently — `eslint-plugin-react` was already in `package.json` so the resolution was a `.eslintrc.cjs` config edit plus one fix (`BackButton.tsx` referenced `React.MouseEvent` without importing the namespace).

**Path A** (real Electron in tests) remains a candidate for a deeper class of integration bugs the lint rule can't catch (e.g., wrong-shape arguments to a real export). Still out of scope here; revisit if a regression of that class appears.

## Lint baseline accounting

| Rule | Current count | Resolved by |
|---|---|---|
| `sermonforge/no-raw-button` | 5 | Down from 149 at Pilot C start (149 → 15 → 5). Pilot C primitives landed (149 → 15). TextButton follow-up landed (15 → 5): six text-link buttons migrated to `<TextButton>`, two tour overlay buttons migrated to `<SecondaryButton>` / `<PrimaryButton>` with dark className overrides, two icon-style buttons (SetupScreen show/hide, StudyTab × dismiss) migrated to `<IconButton>`. The 5 residual hits are tab/pill nav elements (`stage-tab`, `delivery-tab-btn`, `step-pill`, `subphase-pill`, planner top-tabs) — **navigation surfaces, outside Surface #2's CTA scope**. A future `<TabButton>` / `<NavButton>` primitive is sequel hygiene, not contract-driven. |
| `sermonforge/canonical-loading-verb` | 0 | Pilot D landed (36 → 0). Rule tightened to exempt JSX attributes; 30 non-canonical verbs replaced with the three canonical ones. |
| `sermonforge/no-direct-database` | 0 | — |
| `sermonforge/canonical-stage-name` | 0 | Forbidden set expanded post-vocabulary-completion to `writing`, `ready`, `archived`, `planning`, `active`, `study`, `outline`. CSS-class-context exemption (literals nested under `className` JSX attributes) keeps the `.active` CSS modifier clean. |
| `sermonforge/no-window-alert` | 0 | — |
| `react-hooks/rules-of-hooks` | 0 | — |
| `react/jsx-no-undef` | 0 | Enabled post-audit-triage as the structural fix for the consumer-side import-drift class (see §"Consumer-side import drift" above). |
| `no-undef` | 0 | Enabled alongside `react/jsx-no-undef`; one pre-existing drift surfaced (`BackButton.tsx` referenced `React.MouseEvent` without importing the namespace) and was fixed in the same change. |

**Approach A** (lint-staged in `.husky/pre-commit`) means the residual baseline doesn't block commits on untouched files. New violations on staged files do block. The visible total is **5** (residual `no-raw-button` only — tab/pill nav buttons, outside Surface #2's CTA scope), down from 149 at Pilot C start (and from the original 185 across all rules pre-enforcement). The expanded `canonical-stage-name` forbidden set surfaces zero violations because the corresponding migrations (view keys, workspace tab keys, AI-loading state keys, DeliveryTab panel keys, step-pill status values) all landed in the same commit.

## What's NOT enforced

**Zero active clauses are unenforceable.** Every active clause in `docs/CORE.md` has a real enforcement mechanism: structural, test, lint, or named-deferred with an owner. As of audit triage close (2026-04-30), all Surface Contract clauses (#1–#5) are enforced — Surface #2, #3, #5 structurally; Surface #1 by lint+test; Surface #4 by test. **Process Contract #6 (Study throughline is structural) was added 2026-04-30 alongside the SFDI charter and is drafted but inactive pending SFDI's first per-field entries** — owner-deferred to a named initiative, not unenforceable.

## What this document is for

When a future session asks "is clause X enforced?" — read this document, not memory.

When a contract test fails — the rejection cites the clause. Trace from clause number to this document's per-clause table to confirm the test is testing the right thing.

When a deferred clause's owning pilot lands — update this document. The deferred section is a working backlog; clauses move out of it as their owners complete.

When `docs/CORE.md` changes — re-verify this document. Clauses can be added, removed, or rewritten; this document must reflect the current contract.
