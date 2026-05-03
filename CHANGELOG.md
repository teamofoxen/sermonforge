# SermonForge Changelog

---

## 2026-05-02 — docs: SFDI Phase 1 walk started — field pattern locked, Observe expanded to 11 fields

- New working SFDI doc at `docs/PROPOSALS/study-field-definition-initiative.md` captures the canonical Field Pattern (spotlight + sequential questions + persistent prompts + "Next question" affordance disabled-when-empty) and Phase 1 walk state.
- Observe field order revised to 11 fields — Background and Surface Questions added as new fields; Background's draft seven-slot entry awaiting question-sequence ratification + inheritance ruling; Context's four pastor-articulated questions captured.
- CORE.md Canonical Vocabulary gained two new terms — Question (ordered prompt inside a field) and Answer (what the pastor writes per question); Field clause sharpened to name the questions-inside framing.
- SFDI charter updated — six-slot entries are now seven-slot (added Question sequence); field-pattern pointer added; "How to start a session" simplified to in-session-only path; throughline vision sheet header reframed.
- SPRD planning doc gains a new structural backlog item — field-level UX redesign (spotlight + sequential questions + persistent prompts), sequenced behind SFDI; ENFORCEMENT_STATUS Last-verified parenthetical reflects the vocabulary additions and new SPRD backlog item.

---

## 2026-05-02 — docs: SPRD Q8 — inline AI Reviews carve-out + correct SPRD backlog framing

- CORE.md Process Contract #5 — added scope note explicitly limiting the empty-evidence enforcement to the substitutive `ai_proposal`/`ai_apply` mutation cycle; advisory AI interfaces (Review buttons + Chat interfaces) are a deliberate carve-out governed by the Principle directly.
- ENFORCEMENT_STATUS.md Process #5 row — names the seven inline call sites (Observe / Interpret / Redemptive Thread / Implications Reviews + MPS Chat + Outline Suggest + FE Chat) as the scoped carve-out.
- ENFORCEMENT_STATUS.md SPRD section — Q8 closed; corrected overstatement that "SPRD is fully closed" — open questions are settled but structural backlog (Implications restructure, Step 5, PC card removal, Implications Synthesis named outcome) remains, sequenced behind SFDI.
- "Last verified" parenthetical updated to reflect Q8 alongside Q1 + Q3.

---

## 2026-05-02 — docs: SPRD planning doc reflects Q1 + Q3 landed, Q8 next

- Scope map: Q1 and Q3 marked **Landed 2026-05-02** with commit hashes (`c87c307`, `ec3f960`); Q8 marked **Next pilot**.
- Section 8 "First structural pilot" subsection retitled "Pilot landings and what's next" — captures Q1 + Q3 outcomes, names Q8 as the next pilot, and notes Step 5 + PC card removal as gated on SFDI's content half.
- Q1 and Q3 entries in section 8 rewritten in landed voice with implementation pointers (`evaluateAdvance` in `src/utils/studyAdvancement.js` is the SFDI threshold hook point).

---

## 2026-05-02 — feat: SPRD Q3 — hard-gate UX layer (disabled Continue when source empty)

- New `src/utils/studyAdvancement.js` extracted from StudyTab and SermonWorkspace; exposes `evaluateAdvance(sermon, kind, fromIndex)` as the SFDI threshold hook point alongside the Q1 evidence builders and rejection formatters.
- `StudyTab.jsx` Continue buttons (sub-phase, step 2, step 3) now `disabled` with `title` attribute and inline hint when source is empty; pastor sees the gate before the click rather than the click-then-banner cycle from Q1.
- Stage tabs and breadcrumb pills unchanged — they keep Q1's click-then-banner UX per the Q3 ruling that tabs/pills are navigation, not commitment.
- New `tests/contracts/process-2-evidence-gated-ux.test.tsx` covers the disabled-Continue UI (component) plus `evaluateAdvance` (unit). Test count 675 → 682.
- `docs/ENFORCEMENT_STATUS.md` updated — Process #2 row notes the Q3 UX layer; SPRD section reflects Q1 + Q3 both landed, Q8 still open.

---

## 2026-05-02 — feat: /release skill — gated tag-and-push with security review

- New `/release` skill at `.claude/skills/release/SKILL.md` — pre-flight gates (clean tree, on main, `npm test` pass), version proposal, mandatory `/security-review` invocation, smoke-test checklist from `docs/PROPOSALS/distribution.md` Section 12, then tag + push.
- HIGH security findings are a hard stop; MEDIUM requires explicit acknowledgement; tag format locked to `vMAJOR.MINOR.PATCH` to match `build.yml`'s `v*` trigger.
- `.gitignore` `release/` rule anchored to repo root (`/release/`) — was incorrectly matching `.claude/skills/release/`.

---

## 2026-05-02 — docs: drop dead CLAUDE_original.md reference

- `CLAUDE.md` Authority section no longer points at `CLAUDE_original.md`; that file no longer exists in the repo, so the reference was inert.

---

## 2026-05-02 — feat: SPRD Q1 — sub-phase + step transitions through the spine

- `StudyTab.jsx` — `advanceSubPhase` / `advanceStep` / `jumpToStep` / `jumpToSubPhase` route through `transitionState` with source-position content as evidence; rejection surfaces in a dismissable banner.
- `SermonWorkspace.jsx` — `handleTabChange` routes stage transitions through `transitionState`; new `onMovement` prop bubbles sub-phase + step movements to the existing Process #3 visibility marker.
- Process #1 / #2 / #3 contract tests extended to sub-phase + step resolutions (+7 new tests; existing stage-tab visibility test seeded with content so Process #2 passes).
- `docs/ENFORCEMENT_STATUS.md` updated — Q1 landed, per-clause table notes new resolution coverage; SPRD section reflects structural-only post-merge with Q3 and Q8 still open.

---

## 2026-05-02 — docs: archive ACCI tracker (initiative complete)

- Moved `docs/PROPOSALS/ai-clarity-and-constraint.md` → `docs/ARCHIVE/ai-clarity-and-constraint.md` and stripped misleading "How to resume" / "Decisions resolved" sections; the 26-item ledger is retained as a historical record.
- Left a one-paragraph forwarding stub at the old `docs/PROPOSALS/` path so existing references in `SermonWorkspace.jsx` and `beta-testing-initiative.md` still resolve.
- Memory pointer updated to the new archive location.

---

## 2026-05-02 — feat: ACCI Tier G — polish (max_tokens signal, TTL fix, confirm guard, dead code)

- `electron/ai/provider.js` surfaces `stop_reason` in the success envelope, guards `getClient()` against a falsy `apiKey` on TTL expiry, and documents retry idempotency.
- `electron/ai.js` threads `stop_reason` through the IPC success envelope.
- `src/components/AIPanel.jsx` renders an amber italic truncation note when `stop_reason === "max_tokens"`.
- `src/components/OutlineTab.jsx` "Apply to Outline" now uses the same two-step destructive-replace confirm as StudyTab.
- `src/components/SeriesPlanner.jsx` orphan `handleSlotAI` deleted; `onSlotAI` prop removed from `SlotList` and `SlotRow`.

---

## 2026-05-02 — docs: ACCI Tiers E–F — audit log disclosure, rotation fix, doc catch-up

- `electron/ai.js` rotation guard removed so large entries can't leave the file above the 5 MB cap.
- `src/components/SetupScreen.jsx` discloses the local audit log to the pastor on first run.
- `docs/SYSTEMS/ai-panel.md` documents five previously undocumented AI surfaces: theology research mode, Incorporate flow, externalMessage/persistColumn pattern, prompt-caching contract, and audit log.
- `docs/REFERENCE/ipc-channels.md` updated to remove four obsolete channels and add the `spine` channel, calendar note channels, and corrected `ai-message` payload.
- `docs/SYSTEMS/ai-model-migration.md` created as the model-bump playbook.

---

## 2026-05-02 — feat: ACCI Tier D — CI, AI-integrity lint, payload cap, token usage

- `.github/workflows/test.yml` runs `npm test` on every push to main and on every pull request.
- `eslint-plugin-sermonforge/lib/rules/no-direct-ai.js` flags `@anthropic-ai/sdk` imports outside `provider.js` and `window.electronAPI.sendAIMessage` calls outside `src/utils/ai.js`; enabled as `error` in `.eslintrc.cjs`.
- `electron/ai.js` rejects IPC payloads over 1 MB and writes a monotonic `callIndex` (process-scoped) to each audit log entry.
- `electron/ai/provider.js` passes `usage` (input/output/cache tokens) back in the success envelope; `electron/ai.js` writes it to the audit log.

---

## 2026-05-02 — feat: dedupe outline-review + challenge-MPT prompts (ACCI Item C4)

- `src/prompts/study.js` adds `OUTLINE_REVIEW_TASK` (single source for the 4 outline-review prompts) and `CHALLENGE_MPT_TASK` (single source for the 2 challenge-MPT prompts).
- `src/components/StudyTab.jsx` `outline-review` and `mpt-challenge` fetchInline call sites swap their inline prompts for the imports.
- `src/components/OutlineTab.jsx` `handleReviewOutline` swaps its inline prompt for `OUTLINE_REVIEW_TASK`.
- `src/utils/reviewPrompts.js` `STEPS.OUTLINE`, `STEPS.MPT_MPS`, and `STAGE.Blueprint` branches now use the centralized constants as their `system` value; user prompts trimmed of redundant tail questions covered by the task.
- The `mpt-mps-chain` chain-check stays separate — it tests chain integrity, not MPT challenge. ACCI Tier C complete.
- 666 tests passing; lint clean.

---

## 2026-05-02 — feat: pass step + sermonId at every sendAIMessage call site (ACCI Item C3)

- `src/components/StudyTab.jsx` (11 sites), `OutlineTab.jsx` (3), `DeliveryTab.jsx` (2), `SeriesPlanner.jsx` (12) — every `sendAIMessage` call now passes the active step (canonical `STEPS.*` / `PHASES.*` / `STAGE.*` / `SERIES_STEPS.*` value) and a `sermonId` (`sermon.id` for sermon-level calls, `slot?.id` for SlotRow assist, `null` for series-level calls). Previously these were undefined, causing the audit log to lose surface attribution and the abort registry to skip the affected sites.
- `ManuscriptTab.jsx` has no `sendAIMessage` call sites — no change.
- `OutlineTab.jsx` and `DeliveryTab.jsx` get `STAGE` import.
- 666 tests passing; lint clean.

---

## 2026-05-02 — feat: route StudyTab through buildContext (ACCI Item C2)

- `src/components/StudyTab.jsx` — every AI call site now wraps its user request with `buildContext({ sermon, step })` envelope (`CONTEXT:\n…\n\nUSER REQUEST:\n…`), replacing 11 sites' worth of hand-rolled `Passage: … Observations: … Interpretation: …` blocks. `fetchInline` injects the envelope once for all 8 review/challenge/E-A-I callers; `generateMPT`, `generateMPS`, `sendMpsChat`, `suggestOutline`, `sendOutlineChat`, `generateSummary`, `populateScripture`, `sendFeChat`, the Synthesize Redemptive button, and the Compile Implications button each wrap their own.
- `formatPhaseText(...)` removed from StudyTab.jsx — its sole consumers were the now-replaced hand-rolled context blocks; the same data flows in via `buildContext`'s tier-2 exegesis summary.
- 4 fetchInline call sites (`mpt-challenge`, `mpt-mps-chain`, `outline-review`, `eai-review`) now pass an explicit `step`; previously they fell through to buildSystemPrompt's default.
- SeriesPlanner.jsx scope of C2 is N/A: series-level work has no `sermon` record for `buildContext` to consume; series-context blocks remain hand-rolled (already passed through `buildSystemPrompt` per C1).
- 666 tests passing; lint clean; net diff -9 lines.

---

## 2026-05-02 — fix: row-count-aware DB resolver + empty-active trigger + one-shot recovery tool

- `electron/dbMigration.js` now picks legacy DBs by content-row count (sermons + series), with mtime as the tiebreaker; 0-row schema-only DBs are skipped entirely. Regression test `tests/contracts/db-userdata-path-permanent.test.ts` codifies the 2026-05-02 incident (1-sermon dev DB beating 10-sermon real DB on mtime). Now requires a `countRows(db)` callback.
- `electron/main.js` `initDatabase()` restructured into Phase 1 (establish a working `db`) and Phase 2 (run migration whenever the resulting `db` has 0 content rows) — covers fresh-install, corrupt-then-empty fallback, AND the case where the active path exists but is just an empty schema. Empty active DB is backed up to `.precovery-empty-{ts}.db` before a successful migration overwrites it.
- New `scripts/recover-db.cjs` one-shot tool: read-only inventory + row-count-aware promotion of the right legacy DB into the active path. Useful for buddy installs where the in-app resolver hasn't shipped yet.
- 666 tests passing (+3 vs prior); resolver tests rewritten to verify row-count-primary heuristic; sweep PASS.

---

## 2026-05-02 — fix: path-aware DB resolver — stop silently orphaning user data on path moves

- New `electron/dbMigration.js` exports `migrateLegacyDb(...)` which walks `legacyDbPaths` (added to `electron/config.js`), picks the most recently-modified candidate ≥32KB that loads cleanly, copies it forward, and returns the loaded DB + source path; the legacy file is preserved (copy, not move) as a backup.
- `electron/main.js` `initDatabase()` invokes the resolver only when the active path is empty; existing installs unaffected. A non-blocking "Library restored" banner surfaces via `_pendingStartupWarning` (`kind: "db_migrated"`).
- `src/components/OneDriveWarning.jsx` extends to render the new warning kind alongside the OneDrive kinds.
- `docs/CORE.md` adds "The userData path is permanent" — `legacyDbPaths` is append-only; removing or reordering entries orphans user data and is forbidden.
- 6 new contract tests under `tests/contracts/db-userdata-path-permanent.test.ts`; 663 total passing; sweep PASS with State #2/#6 + Mutation #3 strengthened.

---

## 2026-05-02 — docs: SFDI throughline vision sheet + Merida interlocutor method

- New `docs/PROPOSALS/sfdi-throughline-vision.md` — single-page vision sheet for offline field drafting, capturing the throughline arc, the four named outcomes per sub-phase (Observation Set / Interpretation Set / Christ-Connection Statement / Implications Synthesis), PC progressive entry, non-negotiables, and the "feels earned" qualitative test.
- `docs/PROPOSALS/sfdi-charter.md` Approach section revised: "No external source material" replaced with "Merida as conversation partner, not script — interlocutor for every field," every field walk opening through a Merida-anchored question while the pastor remains source-of-truth.
- `docs/SYSTEMS/sermon-workspace.md` — clarified the verbatim PC articulation in "The Study throughline": "without influence from context" → "without influence from modern context" so biblical-literary engagement (Observe's whole point) isn't excluded by phrasing.

---

## 2026-05-01 — feat: centralize StudyTab + SeriesPlanner system prompts (ACCI Item C1)

- `src/prompts/study.js` extended with 14 new task-directive constants (review prompts, MPT/MPS draft, MPS chat, populate-scripture, synthesize-redemptive, compile-implications, six advance-step briefings); `src/prompts/sermon.js` adds four `series-*` step descriptions; new `src/prompts/seriesPlanner.js` exports 11 task constants + `SERIES_STEPS`.
- StudyTab.jsx: every inline `You are…` system prompt at ~12 call sites replaced with `layerTask(TASK, step)` → `appendTaskDirective(buildSystemPrompt(step, sermon.id), TASK)`.
- SeriesPlanner.jsx: same pattern across BookStudy / Overview / Structure / Slots / Calendar tabs and SlotRow Assist (~12 sites) via module-level `layerSeriesTask`.
- User message content and sendAIMessage signature unchanged in this commit (C2 + C3 follow); 657 tests passing; sweep PASS with Surface #1 + Principle strengthened.
- Q3–Q7 resolutions recorded in `docs/PROPOSALS/ai-clarity-and-constraint.md`; Tier B (Items 5–7) marked shipped.

---

## 2026-05-01 — feat: AI panel constraint visibility (ACCI Tier B, Items 5–7)

- `src/prompts/sermon.js` adds `getActiveRole(step, theologyMode)` mapping every step/stage to a posture label; `src/components/AIPanel.jsx` renders it under the panel title (B1).
- `src/utils/contextBuilder.js` adds `describeContext({ sermon, step, theologyMode })` and exports `resolveIncludes`; `AIPanel.jsx` adds a collapsible "What I can see" surface above the input that lists active tiers, loaded fields, and history turn count (B2).
- `AIPanel.jsx` adds a transient persist-write flash banner using `PERSIST_SAVED_LABELS` and a "history trimmed" notice when conversation exceeds `MAX_HISTORY_TURNS * 2` (B3).
- `docs/PROPOSALS/ai-clarity-and-constraint.md` marks Tier A shipped (Items 1–4) with commit refs and resolves Q1/Q2 by execution; SPRD Q5 cross-reference closed.
- 657 tests passing; lint clean; sweep PASS with Surface #4 + Mutation #3 strengthened.

---

## 2026-05-01 — Thread Framework contract enforcement into sweep skills

- `.claude/skills/sweep-the-multiverse/SKILL.md` adds a CONTRACT MAP linking each audited area to specific clauses in `docs/CORE.md` → "The Framework", threads `Contract check:` lines into every per-area rule block, adds a CONTRACT POSTURE block plus a `CONTRACTS:` field to the output template, raises the word cap from 800 to 1000, and adds a HARD RULE that any contract weakening or Principle violation forces overall FAIL.
- `.claude/skills/sweep-the-universe/SKILL.md` applies the same enforcement layer to the per-area variant with a smaller CONTRACT MAP, per-area `Contract check:` lines, a `CONTRACTS:` block in the per-area output template, word cap raised 350 to 400, and the same FAIL-on-weakening rule.

---

## 2026-05-01 — feat: differentiate AI failure modes (ACCI Item A4)

- `electron/ai/provider.js` classifies thrown SDK/transport errors into eight kinds (auth, rate_limit, network, server, timeout, format, empty, unknown) and returns an `{ ok, kind, message }` envelope instead of throwing.
- `electron/ai.js` IPC handler now resolves with the envelope on every classified failure (rejected IPC promises drop custom error properties); audit log records `error.kind` for each failure.
- `src/utils/ai.js` `sendAIMessage` returns the envelope to renderers; sermon-switch abort surfaces as internal-only `kind: "aborted"` so UI sites can skip rendering.
- Five UI files (`AIPanel.jsx`, `StudyTab.jsx`, `OutlineTab.jsx`, `DeliveryTab.jsx`, `SeriesPlanner.jsx`) replace the unified "Something went wrong" with kind-specific messages at ~31 call sites.
- Test stub at `tests/contracts/_helpers/test-spine.ts` updated for the new envelope contract; full suite 144 passing.

---

## 2026-05-01 — feat: JSON-output validator at AI parse boundaries (ACCI Item A3)

- New `src/utils/aiSchema.js`: `parseAIJson` plus four structural-shape validators (Incorporate `mpt_mps`, Incorporate structured-field, Scripture map, CMC blocks).
- Wired at three JSON parse boundaries — `AIPanel.jsx` Incorporate, `StudyTab.jsx` Populate Scripture, `DeliveryTab.jsx` CMC — replacing silent `null` fallbacks and leaked `SyntaxError` toasts with kind-specific messages.
- Shape-only validation (no content checks) to avoid rejecting imperfect-but-usable AI output.
- `outlineChat.js` (text-shape, regex-based) and Final Tune-Up (prose) deferred per scope ruling and Q1.
- Tests: `src/utils/aiSchema.test.js` (18 cases); full suite 144 passing.

---

## 2026-05-01 — feat: proposal pattern for six direct-write AI paths (ACCI Item A2)

- Five direct-write paths (Synthesize Redemptive, Compile Implications, Populate Scripture, Manuscript Delivery, Preaching Blocks) now route AI output through `ProposalPanel` — no field write without an explicit click.
- Final Tune-Up converts to a persistColumn-confirm variant: `AIPanel.jsx` attaches `persistColumn` to the assistant message and renders Save/Discard buttons, replacing the silent auto-save into `last_tune_up`.
- Aborted or empty responses (sermon switch via A1) deliberately do not attach `persistColumn`, so phantom Save buttons cannot appear on placeholder messages.
- Files: `StudyTab.jsx`, `DeliveryTab.jsx`, `AIPanel.jsx`. Builds on Item A1 (in-flight abort registry).

---

## 2026-05-01 — feat: AbortController on sermon switch (ACCI Item A1)

- Added module-level in-flight registry in `src/utils/ai.js` keyed by `sermonId` plus exported `abortInFlightForSermon(sermonId)`.
- `sendAIMessage` now races the IPC promise against an abort signal and returns `""` on abort — backwards-compatible no-op for all existing call sites.
- `SermonWorkspace.jsx` aborts the previous sermon's in-flight calls in a `useEffect` cleanup keyed on `sermonId`, preventing stale responses from landing on a different sermon.
- Renderer-side only: IPC handler still completes; calls without a `sermonId` are unchanged. AIPanel's three sermon-tagged call sites are now abortable; tab-side callers wait on Item C3.
- Unblocks Item A2 (proposal pattern for the six direct-write AI paths).

---

## 2026-05-01 — chore: bundle /simplify in /sweep-the-house + permission allowlist

- Bundle `/simplify` into `/sweep-the-house` as a report-only Part 2 — no fixes applied without explicit user approval.
- Add Contract Test (four questions tied to The Framework in `docs/CORE.md`) and `CONTRACTS:` output block to the sweep skill.
- Add 9-entry permission allowlist to `.claude/settings.json` — Claude Preview MCP read tools (`preview_console_logs`, `preview_snapshot`, `preview_list`, `preview_screenshot`, `preview_logs`, `preview_start`, `preview_stop`) plus exact-form `Bash(npm run lint)` and `Bash(npm test)`.

---

## 2026-05-01 — docs: Beta Testing Initiative (BTI) charter

- Added `docs/PROPOSALS/beta-testing-initiative.md` as the authoritative testing strategy for the closed pastor-friend beta.
- Two co-equal failure-mode anchors (AI invasiveness and workflow-fit), each with felt/behavioral/theological-or-integration layers.
- Three feedback tiers (in-app flag, pop-out form, async interview) plus continuous Layer 0 telemetry; theological frame check method via opt-in pre/mid/close writing samples.
- Names friend-cohort downsides (pulled punches, loyalty over-engagement, soft-pedaled invasiveness) with explicit design responses; commits cohort-reading rules pre-data.
- Q1/Q2/Q5/Q9 set as Phase 0 → Phase 1 gate; Q7 reframed as cohort-feasibility ruling spanning scale, cadence, and active-cohort floor; tester attrition policy and feedback-to-action pathway promoted into the body.

---

## 2026-05-01 — docs: AI Clarity & Constraint task tracker

- Added 26-item AI remediation tracker at `docs/PROPOSALS/ai-clarity-and-constraint.md` from a 17-agent audit of the AI subsystem.
- Tier A leads with sermon-switch cancellation, proposal-pattern coverage for six direct-write paths, JSON output validation, and differentiated error messages.
- Seven items blocked on product-owner rulings (Q1–Q7); Items 16 and 26 cannot start without rulings.
- Item 2 is the umbrella for SPRD Q5 (Synthesize and Compile direct writes) plus four more direct-write paths.
- No implementation has begun; doc is operational tracker, not charter.

---

## 2026-05-01 — fix: Vocabulary cleanup follow-up (two missed references)

- AI Compile button's user-message header in `StudyTab.jsx` updated: "Personal application:" → "Personal implications:" (lowercase grep miss in the prior pass).
- Tour stop ID `personal-application` → `personal-implications` in `workspaceTourStops.js` for vocabulary consistency; tour iterates by index, not by ID, so no persistence breakage.

---

## 2026-05-01 — feat: Vocabulary cleanup pass (PI → PC, Applications → Implications)

- UI labels renamed: "Possible Applications" → "Possible Implications" in `studyFields.js`; "Personal Application" → "Personal Implications" in StudyTab group header and tour stops; tour stop "Pastoral Intelligence." → "Pastoral Context."
- AI-facing prompt strings updated: `src/prompts/sermon.js` THIS_SERMON section header → "Pastoral Context"; `contextBuilder.js` new-sermon marker string → "pastoral context."
- Internal variables renamed for consistency across `StudyTab.jsx`, `AIPanel.jsx`, `SermonWorkspace.jsx`, `workspaceTourStops.js`: `piBlock`/`piParts`/`piLines`/`piOpen`/`setPiOpen` → `pcBlock`/`pcParts`/`pcLines`/`pcOpen`/`setPcOpen`.
- Doc layer aligned (sermon-workspace.md, context-pipeline.md, schema.md, project-structure.md, CLAUDE.md, sermon-workspace-tour.md, sfdi-charter.md, study-phase-redesign.md): "Pastoral Intelligence" → "Pastoral Context"; "Personal Application" → "Personal Implications"; "Possible Applications" → "Possible Implications" outside the verbatim user articulation. JSON keys, database columns, and migrations unchanged. Lint clean (5-error baseline holds), 123/123 tests pass, spine integrity OK.

---

## 2026-05-01 — feat: PC vision verbatim + Process #4 sharpening + SFDI anchors

- Captured PC vision verbatim in `docs/SYSTEMS/sermon-workspace.md` under new "The Study throughline" section; "Pastoral Intelligence Card" section replaced with "The Pastoral Context card (interim)" naming the always-on card as the anti-pattern the throughline replaces.
- Process Contract #4 sharpened in `docs/CORE.md`: "follows the text" → "is driven by the text" matching PC vision's directional language.
- SFDI charter gains "Theological anchors" (Possible Applications as PC's first surfacing; Implications as three-way conversation), "What completion looks like" (experiential / artifact / enforcement / downstream tests), and "Pre-walkthrough cleanup pass" (PI→PC and Applications→Implications).
- SPRD Q7 partially answered: restructure Implications as one step with PC as one of three voices, not split; details resolve through SFDI's Implications walkthrough.
- `docs/ENFORCEMENT_STATUS.md` updated for the Process #4 wording sharpening; Last-verified date 2026-05-01.

---

## 2026-04-30 — feat: SFDI initiative + Process #6 (Study throughline is structural)

- SPRD planning document landed; Q1 ruled sub-phase and step transitions become real recorded movements through the spine.
- SPRD paused pending SFDI after surfacing that the fields inside each sub-phase need definitions and flow before SPRD's content-level questions resolve.
- New initiative scoped: Study Field Definition Initiative (SFDI); charter at `docs/PROPOSALS/sfdi-charter.md`.
- New Process Contract #6 in `docs/CORE.md`: "The Study throughline is structural" — binds integrity, not field count; activates when SFDI ships first entries.
- New Canonical Vocabulary section in `docs/CORE.md`; `docs/ENFORCEMENT_STATUS.md` updated with Process #6 row, SFDI deferred section, Summary "Inactive" layer.

---

## 2026-04-30 — feat: TextButton primitive — CTA primitive set complete + audit triage closed

- New `<TextButton>` primitive at `src/components/primitives/TextButton.tsx` with `.btn-text` CSS class; six tertiary text-link buttons migrated (Dashboard guided-tour, Sidebar Send-feedback, workspace + planner "How this works", planner Study Guide, tour overlay "Leave tour").
- TourOverlay "Back" / "Next" migrated to `<SecondaryButton>` / `<PrimaryButton>` with new `.btn-ghost-dark` className override; password-toggle (`SetupScreen`) and × dismiss (`StudyTab`) migrated to `<IconButton>`.
- Lint `no-raw-button` baseline drops 15 → 5; the residual 5 are tab/pill navigation elements (not CTAs) and are outside Surface #2's scope — a future `<TabButton>`/`<NavButton>` is sequel hygiene, not contract-driven.
- `docs/ENFORCEMENT_STATUS.md` updated: Surface #2 + #3 promoted to structural-primary, Summary table re-tallied to 16 structural / 2 test / 3 lint / 0 unenforced + 6 sub-clause portions named-deferred to specific successors (Phase 4, Phase 6, SPRD).
- Audit triage initiative closed; 5 primary pilots (C/D/E/B.2/B.3) + 4 deferred-bucket items shipped; system documented as ready for ~30-tester onboarding.

---

## 2026-04-30 — feat: vocabulary completion — view-keys + tab-keys to canonical PascalCase

- New `VIEW.*` enum in `src/core/contracts.ts`; App.jsx + Sidebar.jsx migrated; Surface #4 test parser accepts `VIEW.<Name>` references alongside literal strings.
- Workspace tab keys → `STAGE.*` end-to-end (SermonWorkspace, tab callers, tour data, contextBuilder, reviewPrompts, sermon prompts, memory capture set); localStorage migration handles legacy lowercase values.
- `canonical-stage-name` forbidden set expanded to `writing/ready/archived/planning/active/study/outline`; rule gained a CSS-class-context exemption so `nav-item.active` and similar don't false-fire.
- Companion renames clear the expanded forbidden set: `.step-pill-active`/`.subphase-pill-active` → `-current` (CSS + JS), DeliveryTab panel `"outline"` → `"preaching-outline"`, AI-loading state keys.
- Verified: lint at the 15-error residual baseline (`no-raw-button` only), 29/29 contract tests pass, spine integrity OK.

---

## 2026-04-30 — feat: enable react/jsx-no-undef + no-undef (close import-drift class)

- `.eslintrc.cjs` registers `eslint-plugin-react` (already in `package.json`) and enables `react/jsx-no-undef` + `no-undef` — closes the consumer-side import-drift class that hit `SeriesPlanner.jsx` during Pilot C and surfaced only at runtime.
- One pre-existing drift surfaced and fixed: `src/components/primitives/BackButton.tsx` referenced `React.MouseEvent<HTMLButtonElement>` without importing the namespace; switched to the named-type import.
- `docs/ENFORCEMENT_STATUS.md` — moved the "Consumer-side import drift" caveat from mitigation-candidate to active enforcement; lint baseline accounting lists the new rules at zero.
- Verified: lint clean at the 15-error residual baseline, 29/29 contract tests pass, spine integrity gate passes (75 files).

---

## 2026-04-30 — feat: Resume Work + Mark Complete UX (State Contract #6)

- Dashboard Resume Work tile consumes `spine.getInProgressSermons()`; sermons whose delivery date has passed get a return-day reminder section with crimson highlighting.
- Delivery tab gains explicit "Mark sermon complete" + an auto-suggest banner when delivery date is past and manuscript exists; the banner suggests, the user clicks.
- SeriesPlanner topbar gains "Mark Series Complete" + an auto-suggest banner when every committed child sermon is complete.
- Mark Complete writes `stage` / `status` through `spine.updateSermon` / `updateSeries` — no new IPC channels.
- `docs/ENFORCEMENT_STATUS.md` updated; State #6 fully closed. **Audit triage initiative complete.**

---

## 2026-04-30 — feat: Archive → Completed Sermons rename + per-sermon re-export (Surface Contract #4)

- New `src/components/CompletedSermons.jsx` with renamed copy and per-sermon "Re-export" button — reuses existing `sermon-export-manuscript` IPC, no new IPC channel.
- `src/components/Archive.jsx` reduced to a re-export shim pointing to `CompletedSermons`; existing imports keep compiling.
- App.jsx routing renamed `archive` → `completed-sermons`; Sidebar gains a canonical "Completed Sermons" entry under Sermon Prep.
- `tests/contracts/surface-4-you-are-here.test.ts` `EXPECTED_DEEP` no longer contains `archive`; the route's Surface #4 exception is closed.
- `docs/ENFORCEMENT_STATUS.md` updated; view-key + workspace tab-key PascalCase migrations deliberately deferred (both require coordinated `contextBuilder.js` changes).

---

## 2026-04-30 — feat: BackButton primitive (Surface Contract #5)

- New `src/components/primitives/BackButton.tsx` — canonical back-affordance with `labeled` and `icon` variants; the `←` prefix is structural so consumers can't drift it via copy.
- Migrated 4 back-affordance sites: SermonWorkspace topbar chevron + sermon-not-found error case, SeriesPlanner topbar, OutlineTab "Return to Study".
- Fixed a Pilot C regression in `SeriesPlanner.jsx`: `<PrimaryButton>` / `<SecondaryButton>` / `<IconButton>` were used without imports since `f061c12`; passed lint silently because no `react/jsx-no-undef` rule is configured and would have crashed at mount.
- `docs/ENFORCEMENT_STATUS.md` updated — Surface #5 moved from "Deferred" to "Structural"; all five Surface Contract clauses now have an enforcement layer.
- Workspace tab-key PascalCase migration deferred to Pilot B.2; `contextBuilder.js`'s lowercase switch cases need coordinated migration.

---

## 2026-04-30 — feat: empty-state + loading primitives (Surface Contract #3)

- New `src/components/primitives/{EmptyState,LoadingState}.tsx` — canonical empty-state layout and loading-verb shape; `LoadingState`'s `verb` prop is typed against the `LoadingVerb` union (`Loading…` / `Saving…` / `Thinking…`).
- `<PrimaryButton loading={LoadingVerb}>` now auto-renders the canonical verb in place of children; prop type changed from `boolean` to `LoadingVerb` (no existing callers).
- Replaced 30 non-canonical loading verbs across 11 components — Drafting/Generating/Reviewing/Synthesizing/Compiling/Assisting/Analyzing/Running → Thinking…; Submitting/Creating/Exporting/Retrying/Formatting → Saving…; Fetching scripture → Loading…
- Tightened `sermonforge/canonical-loading-verb` to exempt JSX attribute values so placeholders like `placeholder="Sermon title…"` no longer false-fire; `canonical-loading-verb` baseline drops 36 → 0.
- Three empty states migrated to `<EmptyState>` (Planning, Archive, SermonList) as the pattern demo; `docs/ENFORCEMENT_STATUS.md` updated — Surface #3 moved from "Lint (deferred)" to "Lint + Structural"; total lint baseline now 15 (down from 185).

---

## 2026-04-30 — feat: CTA primitive layer (Surface Contract #2)

- New `src/components/primitives/{PrimaryButton,SecondaryButton,IconButton}.tsx` — solid gold pill, ghost outline, and behavioral icon-button shapes wrapping the existing `.btn-primary` / `.btn-ghost` / `.btn-sm` classes.
- Migrated 134 of 149 raw `<button>` elements across 25 component files; lint baseline `sermonforge/no-raw-button` drops 149 → 15.
- `DeleteButton.jsx` relocated to `src/components/primitives/` with a re-export shim at the old path; 5 importers unchanged.
- 15 residuals are scoped: workspace tab / sub-phase / sidebar nav buttons (Pilot E territory), tertiary text-link buttons, dark-theme tour overlay.
- `docs/ENFORCEMENT_STATUS.md` updated — Surface #2 moved from "Lint (deferred)" to "Lint + Structural"; lint baseline accounting reflects the drop.

---

## 2026-04-30 — fix: collapse stage CSS classes to canonical two-class set

- Replaced legacy 6-class `.stage-*` rule set with canonical `.stage-in_progress` and `.stage-complete` pair in `src/styles/global.css`.
- Removed now-unreferenced `--stage-study` and `--stage-ready` CSS vars.
- Restores badge styling for the `'in_progress'` / `'complete'` vocabulary produced by the v16 migration; closes the Pilot B.1 visual regression where `Archive` and `SermonList` badges rendered unstyled.

---

## 2026-04-30 — fix: defer slot creation until user names it

- `+ Add Slot` in `SeriesPlanner` now creates a UI-only draft row keyed `draft-<uuid>`; no IPC `create-sermon` fires until the user types a non-empty title.
- Title input shows the canonical `placeholder` attribute instead of leaking the literal "Untitled sermon" string into sidebar recents, calendar labels, and workspace topbars.
- `commitDraft` runs on title blur / Enter / Open click, surfaces inline errors on commit failure, and follows up with `updateSermon` for fields not accepted by `create-sermon` (e.g. `study_guide_note`).
- Deleting a draft before commit removes it from local state with no spine call; navigating away discards uncommitted drafts.

---

## 2026-04-30 — fix: post-enforcement audit regressions

- Renamed `getSeriesById` → `getSeries` import + call site in `SeriesPlanner.jsx` so opening a series no longer hangs on "Loading…".
- Rewrote `Planning.jsx` `statusColor` map with `SERIES_STATUS` keys so in-progress series render in sage instead of gray.
- Added "Consumer-side import drift" caveat + JSDoc/checkJs mitigation note to `docs/ENFORCEMENT_STATUS.md`.

---

## 2026-04-30 — feat: pre-SPRD contract enforcement layer

- New `src/core/contracts.ts` + `src/core/spine.ts` make the spine the only sermon/series API; v17 migration adds `current_*` position columns + `legacy_evidence_cutoff`.
- `scripts/spine-integrity.js` (wired into `.husky/pre-commit`) blocks renderer-side bypasses — raw SQL, `db.run`, `electronAPI.spine`, or `database.js` imports of spine-only names outside `src/core/`.
- Local `eslint-plugin-sermonforge` lands five rules; 11 contract tests cover State #3/#5, Process #1–#5, Mutation #1/#3, Surface #1/#4 against a Path-B in-memory fixture.
- Migrated 11 renderer components to `spine.*`; extracted `SermonWorkspace`'s save-state into `spine.persistMutation` and added `data-testid="movement-event"` on tab transitions.
- `docs/ENFORCEMENT_STATUS.md` is the canonical per-clause map: 13 structural / 2 test / 3 lint / 3 deferred / 0 unenforceable.

---

## 2026-04-30 — chore: add enforcement-status check to end-session skill

- Added STEP 2 — ENFORCEMENT STATUS CHECK to `.claude/skills/end-session/SKILL.md` listing the seven contract-enforcement trigger paths.
- When any trigger path is touched, the skill now requires updating `docs/ENFORCEMENT_STATUS.md` (deferred-clause moves, per-clause table sync, test fixture confirmation, "Last verified" date) before proceeding.
- Renumbered subsequent steps: CHANGELOG → STEP 3, COMMIT → STEP 4, PUSH → STEP 5, CONFIRM → STEP 6.

---

## 2026-04-30 — feat: mac build pipeline scaffolding

- New `mac` + `dmg` targets in `package.json`: universal arch, hardened runtime, notarize via `APPLE_*` + `MAC_CSC_*` env, stable `SermonForge-Setup.dmg` artifact name matching the Windows pattern.
- New `.github/workflows/build.yml` `build-macos` job runs `iconutil` over `brand/icons/sermonforge.iconset/` to generate `build/icon.icns`, then electron-builder signs, notarizes, and publishes.
- New `build/entitlements.mac.plist` declares hardened-runtime requirements (JIT, unsigned exec memory, library validation off, dyld env vars, network client).
- New `brand/` folder holds the designer-prepared icon kit: 1024 master, SVG masters, Apple iconset (10 sizes with `@2x` naming), Windows PNGs, and horizontal + stacked wordmark lockups carrying the "Clarity through Constraint" tagline.
- `build/icon.ico` regenerated via ImageMagick from `brand/icons/win/` (7 sizes incl. new 24×24 entry); `build/icon.icns` is gitignored as a CI-generated artifact.

---

## 2026-04-29 — chore: remove dormant Library + Illustrations dead code

- Removed 11 dormant IPC handlers from `electron/main.js`: `library-status`, `library-build-embeddings`, `library-get-folder`, `library-set-folder`, `library-import`, `library-search`, `library-get-manuscripts`, `db-deleteLibraryItem`, `db-getAllIllustrations`, `db-createIllustration`, `db-deleteIllustration`.
- Removed library helpers (`ensureLibraryDb`, `chunkManuscript`, `indexLibraryManuscript`, `getLibraryPath`, `getAllDocxFiles`, `parseLibraryFile`, `copyToManagedLibrary`, `libraryContentHash`), globals (`libraryDb`, `libraryVecAvailable`), constants (`MANAGED_LIBRARY_DIRNAME`, `EMBED_DIM`, `CHUNK_MAX_CHARS`, `LIBRARY_PATH`), and the `illustrations` CREATE TABLE.
- v3 and v15 migration bodies are now no-op version bumps; fresh installs skip creating `library` + `library_fts` + the `content_hash` column. Existing installs retain those tables as orphan data; theology + embedder + buildFtsQuery preserved.
- `docs/REFERENCE/ipc-channels.md`, `docs/REFERENCE/schema.md`, and `docs/SYSTEMS/database.md` cleaned to match removed surfaces.

---

## 2026-04-29 — chore: remove Library and Illustrations features

- Deleted `src/components/Library.jsx` and `src/components/Illustrations.jsx` user-facing pages.
- Removed `library` + `illustrations` routes and lazy imports from `src/App.jsx`.
- Removed library + illustration IPC channel exposures from `electron/preload.js` and matching wrapper exports from `src/db/database.js`; main-process IPC handlers + library DB infrastructure remain dormant pending a follow-up dead-code sweep.
- `FeedbackModal` UX_PARTS dropped "Illustrations" and "Sermon Library"; `CLAUDE.md` routing table dropped its Library entry; `README.md` dropped the library sidecar mention.

---

## 2026-04-29 — feat: State #4 position-in-series; Surface #4 All Sermons; vocabulary sweep

- State Contract #4: `SermonWorkspace.jsx` topbar shows "‹ Sermon X of Y ›" with prev/next chevrons; siblings fetched via existing `getSermonsBySeries`; new `onOpenSermon` prop wired through `App.jsx`.
- Surface Contract #4 (partial): added "All Sermons" entry to the Sermon Prep sidebar dropdown (mirrors "All Series"); Sermon Prep active state extended to highlight when `currentView === "sermons"`.
- Naming drift sweep (State #5 + Surface #1): `Continue to Outline Tab →` → `Continue to Blueprint →` in StudyTab; Planning page title "Planning" → "All Series"; FeedbackModal "Outline Tab" → "Blueprint Tab"; Dashboard hero CTA "Create sermon" → "Build sermon"; SermonWorkspace "How this works" diagram stage 2 label "Outline" → "Blueprint".

---

## 2026-04-29 — feat: complete Mutation Contract; State #3 no anonymous series

- Mutation Contract #3: workspace topbar shows "Saving…" / "Saved" / "Save failed · Retry" via new `saving`/`saveError`/`lastSavedAt` state in `SermonWorkspace.jsx`.
- State Contract #3: new `NewSeriesModal.jsx` collects title before any record is written; `db-createSeries` IPC rejects empty titles; sidebar "Untitled Series" filter band-aid removed; `App.jsx` `handleNewSeries` opens the modal instead of writing a silent stub.
- Mutation Contract #5: new `InlineError.jsx` canonical inline pattern; raw `alert()` removed from `NewSermonModal.jsx`; bespoke crimson treatments in Archive, FeedbackModal, SetupScreen, Library import error, and NewSeriesModal swapped to InlineError.
- `PassagePopup.jsx` rephrased ESV-key error from "Add ESV_API_KEY to .env" to user language; `SeriesPlanner.jsx` stripped "— check console" from "Save failed" indicators.

---

## 2026-04-29 — feat: Mutation Contract — AI proposals reviewed before apply

- New `src/components/ProposalPanel.jsx` component implements the review-then-apply pattern that enforces Mutation Contract clauses #1 and #2 from `docs/CORE.md`.
- Study Step 2 `Draft → MPT` and `Draft → MPS` no longer overwrite the field; the AI draft appears in a parchment-and-gold proposal panel below the textarea with "Use this" / "Discard" buttons.
- Study Step 3 `Apply to Outline` uses a two-step inline confirm (`Replace N existing points` + Cancel) when the outline already has user content; single-click apply still works when the outline is empty.
- Study Step 4 `Populate Scripture (ESV)` is now opt-out — it fills only empty Scripture rows, leaves filled rows untouched, and reports populated/skipped counts via a dismissable inline message.

---

## 2026-04-29 — feat: four-contract framework canon; remove Quick Outline

- Added "The Framework" section to `docs/CORE.md`: Principle (Clarity through Constraint), hierarchy, four contracts (State / Process / Mutation / Surface), and the four-question Test for evaluating any change.
- Removed Quick Outline UI: dashboard tile in `Dashboard.jsx`, multi-step dark panel + state machine + helpers in `Library.jsx`, and the now-unused `onNavigate` prop wiring on Dashboard.
- Removed Quick Outline IPC: `library-create-sermon-from-outline` and `sermon-export-quick-template` handlers in `electron/main.js`, matching wrappers in `electron/preload.js` and `src/db/database.js`, the `src/prompts/quickOutline.js` prompts file, and IPC channel docs.
- Updated `/agents` and `/run-agent` skill definitions to remove the arbitrary 3–5 agent cap and the one-agent-per-invocation constraint.

---

## 2026-04-29 — chore: ignore design-context bundles, drop diag scripts

- `design-context/` and `sermonforge-design-context.md` added to `.gitignore` (regeneratable design-tool snapshots that duplicate `src/styles` and `src/components`).
- Removed one-shot `scripts/diag-db-diff.js` and `scripts/diag-recent-sermons.js` from the db-corruption and save-payload hotfix sessions.

---

## 2026-04-29 — fix: post-fragility audit follow-ups

- `library-build-embeddings` now filters `library_chunks_status` by `embed_count = chunk_count`, so manuscripts left partial by a worker crash are retried instead of marked complete.
- `electron/embedder/host.js` clears the idle timer before awaiting `ensureWorker()` and re-spawns if the worker reference goes stale during the yield, closing the idle-TTL race against in-flight embed requests.
- New `app-get-sermon-columns` IPC + `App.jsx` mount assertion logs when the renderer `SERMON_COLUMNS` mirror drifts from the main allowlist; skipped under the browser-preview stub.
- Documented `db-backupMemory` and `db-restoreMemory` in `docs/REFERENCE/ipc-channels.md` (Phase 4 channels that had been missing).

---

## 2026-04-29 — fix: phase 6 — embedder worker_thread

- `@xenova/transformers` pipeline now runs in a worker (`electron/embedder/worker.js`) driven from main by `electron/embedder/host.js`; model load and per-query embedding no longer block the main process.
- Host owns lifecycle: spawn-on-demand, 10-min idle TTL, crash respawn, 60 s per-request timeout.
- Kill switch: `SF_EMBED_WORKER=0` falls back to the pre-Phase-6 main-thread pipeline (preserved verbatim) for one release.
- `onnxruntime-node` added to `asarUnpack` so packaged builds load the native binaries from outside `app.asar`.
- `scripts/smoke-embedder-worker.js` verified Xenova + onnxruntime-node embed inside a worker_thread (555 ms cold).

---

## 2026-04-29 — fix: phase 7 + 8 renderer hygiene and cleanups

- Splash: `electron/loading.html` loads immediately and swaps to the real renderer after `initDatabase`, replacing the blank window during slow starts.
- OneDrive guard: first launch in a OneDrive-synced userData shows a blocking modal; later launches show a localStorage-sticky banner. New `app-get-startup-warning` + `app-open-data-folder` IPC.
- Cleanups: `window.memoryDebug` gated to dev only; `buildFtsQuery` drops `sermon`/`sermons`/`different`/`parts` from stop-words; audit-log append failures route through `logError`; Anthropic 401/403 errors stamp the app version.
- Regression test `tests/markdown-xss.test.jsx` confirms `ReactMarkdown` escapes raw `<script>` and `<img onerror>` in assistant output.
- `SetupScreen` carries a permanent OneDrive caution; new IPC channels documented.

---

## 2026-04-29 — fix: save-payload hotfix (H1 pulled forward from Phase 7)

- `SermonWorkspace.persistUpdate` now filters `sermonRef.current` through a renderer-side `SERMON_COLUMNS` mirror (`src/constants/sermonColumns.js`) before sending to `updateSermon`, stripping JOIN fields (`series_title`, `series_color`), the attached `series`/`section` objects, and primary-key/timestamp columns.
- Without this, `buildUpdate`'s dev-throw guard rejected every save in dev mode, the throw was caught silently in the renderer's `try/catch`, and edits to MPT, MPS, observations, manuscript, etc. never reached the DB despite the optimistic `setSermon` making the UI look correct.
- The main-side `SERMON_COLUMNS` allowlist + `buildUpdate` remain the security boundary; the renderer filter is a layered UX fix.

---

## 2026-04-29 — fix: db-corruption hotfix (Phase 2 follow-up)

- `tryLoad` now validates the loaded DB via `SELECT name FROM sqlite_master LIMIT 1` — `new SQL.Database(buf)` does not throw on page-level corruption, so the prior recovery code missed corrupt primaries and let queries fail at runtime instead of falling back to `.bak`.
- `flushDb` is now serialized via a promise chain so two concurrent calls cannot race on the shared `<dbPath>.tmp` file (the prior race interleaved bytes from two flushes and produced a malformed file that the rotation then promoted into `dbPath`).
- No IPC, schema, or external contract changes.

---

## 2026-04-29 — fix: phase 5 library + theology consistency

- Library import now identity-resolves by content-hash → filepath → new: a moved file updates filepath instead of creating a duplicate row, and an edited file is detected and re-indexed instead of `INSERT OR IGNORE`-skipped (v15 adds `content_hash` column).
- `indexLibraryManuscript` is now two-phase: async embed-all-chunks then a single sync transaction that deletes vec rows in the correct order (capture chunk ids first), inserts new chunks/vectors, and writes a `library_chunks_status` completion marker; partial runs roll back.
- `library-build-embeddings` now filters by `library_chunks_status` instead of mere chunk presence, so partially-indexed rows correctly need re-indexing.
- FTS pinned to FTS4 — drops the FTS5-first attempt that produced install-to-install drift; existing FTS5 installs are left untouched.
- `build_theology_vectors.js` now purges orphan `theology_vec` rows on each run, fixing the silent shrinkage caused by `load.py` deleting theology rows without cascading to vec.

---

## 2026-04-29 — fix: phase 4 ai pipeline hardening

- Anthropic SDK now has a 60s per-attempt timeout, one retry on 429/529/abort, and a 24h client TTL so out-of-band key rotations eventually pick up.
- Pastor memory now write-throughs to `userData/memory-backup.json` via new `db-backupMemory`/`db-restoreMemory` IPC; `App.jsx` restores on mount when localStorage is empty (survives Electron major upgrades and cache clears).
- `buildAdaptiveHints` shuffle is now deterministic via mulberry32 seeded on `sermonId+step`, replacing `Math.random()`; same sermon, same step, same hints across retries.
- Theology toggle label changes to "Search Theology Library (keyword only)" when `theology-status.semantic` is false; PI tier (Cultural Moment / Room / Sermon's Work) now prepends to the theology research user message.
- `buildContext` for a brand-new sermon (no passage/MPT/PI) now returns an explicit `[THIS SERMON]` "this sermon is new" marker instead of an empty string.

---

## 2026-04-29 — fix: phase 3 migrations + doc reconciliation

- All migration `ALTER TABLE … ADD COLUMN` calls now go through `safeAlter()` which throws on real errors and only swallows "duplicate column name"; the version bump after each migration block is no longer reached when a real failure occurs.
- Added migration v14 — schema-contract reconciliation that re-applies every additive ALTER from v2/v4/v6/v7/v8/v9/v12 idempotently, healing installs where a prior swallowed-catch left a column missing while the version was bumped.
- Added `assertSchemaContract()` — runs after `runMigrations()`, compares live schema to `SERMON_COLUMNS`/`SERIES_COLUMNS`, logs ERROR on mismatch.
- Reconciled `docs/SYSTEMS/database.md`, `docs/CORE.md`, `README.md`, and `docs/REFERENCE/ipc-channels.md` with current paths (`%APPDATA%\sermonforge\data\`), schema version 14, the FTS4 + sqlite-vec hybrid theology-search algorithm, and 5 previously-undocumented IPC channels.
- Added `Library import + sidecar library.db` and expanded distribution-area routing to `CLAUDE.md`.

---

## 2026-04-29 — fix: phase 2 durability (atomic flush + .bak fallback + await on quit)

- `flushDb` now writes atomically: blob → `.tmp` → rename old DB to `.bak` → rename `.tmp` to `dbPath`; a crash mid-step never produces a truncated `sermonforge.db`.
- `initDatabase` falls back to `.bak` when the primary is corrupt; if both fail, the corrupt original is renamed to `sermonforge.db.corrupt-<timestamp>` before a fresh DB is created so no data is silently overwritten.
- Added `before-quit` handler that `e.preventDefault()`s, awaits `flushDb`, closes native DBs, then `app.exit(0)`; replaces the prior race between async `flushDb` and synchronous `app.quit()` in `window-all-closed`.
- `_isQuitting` re-entry flag prevents the preventDefault loop on second-pass quit.

---

## 2026-04-29 — fix: phase 1 visibility (errors + db-write banner + log redaction)

- AI errors now throw from main instead of returning friendly strings; renderer's empty-string fallback handles failure paths uniformly so error text no longer reaches chat, pastor memory, or `last_tune_up`.
- Added `db-write-error` IPC subscriber and persistent banner with retry; `flushDb` emits only on the second consecutive failure, with `db-write-ok` clearing it on recovery.
- Added `db-flush` IPC for the banner's retry button; preload exposes `onDbWriteError`, `onDbWriteOk`, `flushDb`.
- AI audit log now records structured `error: {kind, message}` for configuration, format, and api failures.
- Feedback submissions now redact `sk-ant-…`, `github_pat_…`, `ghp_…`, and `Token <key>` shapes from the attached log tail.

---

## 2026-04-29 — chore: remove stale gate-reminder hooks

- Dropped the PostToolUse echo hook that injected `"GATE: Run /sweep-the-room..."` after every Edit/Write — referenced the deleted skill and added latency.
- Dropped the Stop hook entirely; it was firing an `echo` after every assistant response close, including read-only chat turns.
- Kept the PostToolUse `node --check` hook for `electron/*.js` edits — still catches syntax errors and aligns with the electron-verification rule.

---

## 2026-04-29 — chore: trim agent loop overhead

- Replaced the mandatory dual-sweep gate in `CLAUDE.md` with a scoped trigger list — `/sweep-the-house` runs only when the diff touches `electron/main.js`, `electron/preload.js`, `src/utils/contextBuilder.js`, `src/utils/ai.js`, `src/prompts/`, `src/db/database.js` exports, or the `sermons` schema.
- Slimmed `/end-session` to: precheck → CHANGELOG → commit → push, dropping the duplicated 5-section pre-commit report and invariant checklist.
- Removed `/sweep-the-room` skill (its checks were a strict subset of `/sweep-the-house`).
- Archived 4009 lines of CHANGELOG entries (pre-2026-04-15) to `CHANGELOG-archive.md`; active `CHANGELOG.md` shrunk from 4523 to 518 lines.

---

## 2026-04-29 — chore: tour engine parameterization + browser-preview boot fallback

- `TourContext.start()` now takes `(stops, { onLeave, seenKey })`; provider-level `onLeave` prop and hardcoded `sf_tour_workspace_seen` localStorage key removed from the engine.
- Workspace tour wired through Dashboard with its own `onLeave: onLeaveTour` and `seenKey: "sf_tour_workspace_seen"`, leaving the engine tour-agnostic.
- `src/db/database.js` falls back to a Proxy stub when `window.electronAPI` is undefined, so the Vite-only browser preview boots into the dashboard instead of crashing on first IPC call.
- Stub returns `{configured: true}` for `getApiKeyStatus`, no-op unsubscribe for `on*` subscribers, and `Promise.resolve([])` for everything else; production Electron path is untouched.

---

## [Unreleased] — feat: dashboard illuminated header + 2×2 grid + church history footer

- Empty page-header band replaced with an "illuminated" preacher-quote rotator (random pick on load, manual prev/next, stencil portrait + citation) drawing from a curated 21-quote / 7-preacher dataset.
- Dashboard body restructured to a 2×2 grid with content-driven tile heights and a hero treatment on "Build a sermon" via gold rule and ornament.
- "This Day in Church History" footer added with an 80+ entry curated MM-DD dataset (liturgical-feast support included) that walks back up to 30 days when today has no entry.
- Sidebar Sermon Prep dropdown now surfaces all titled in-progress sermons, not just non-planning, and shows up to 5 (was 3).
- 7 stencil portrait PNGs added under `src/assets/portraits/` and resolved via `import.meta.glob`.

---

## 2026-04-28 — feat: dashboard reimagining + Library 2.0 + PI-aware Quick Outline

- Dashboard rewritten to a 4-section layout; "Pick up where you left off" moved to expandable left-nav headers.
- New `settings` table (v13) + Library folder picker replace the hardcoded OneDrive path (backward-compat fallback).
- Separate `library.db` (better-sqlite3 + sqlite-vec) holds chunks/vectors; imports are copied into `userData/library/` and embedded via the shared Xenova MiniLM model; backfill via `library-build-embeddings`.
- `library-search` adds `"hybrid"` mode (Reciprocal Rank Fusion of FTS rank + vector cosine); Quick Outline uses it.
- Quick Outline rebuilt as a 3-step PI-aware flow: AI elicits Cultural Moment / Room / Sermon's Work follow-ups, synthesizes 3 outlines, and outputs to either the Sermon Workspace (full) or a placeholder Word doc (`stage = "quick"`).

---

## 2026-04-28 — feat: manuscript tab — full AI context, Tune-Up persistence, DOCX export

- Manuscript tab modes (Flow Coach, Ear Check, Final Tune-Up) now run `buildContext` on the initial fire, so Pastoral Intelligence, exegesis, structure, series context, theology, and memory tiers reach the AI.
- Raised `TIER_LIMITS.tier7` from 800 to 5000 chars so substantive Pastoral Intelligence input is no longer truncated when the three fields are combined.
- Final Tune-Up responses are persisted to a new `sermons.last_tune_up` column (v12 migration) and surfaced as a collapsible "Last Tune-Up" panel on the Manuscript tab so a careful read isn't lost on workspace close.
- Added `sermon-export-manuscript` IPC channel and an "Export to Word" button on the Manuscript tab; saves a `.docx` to `Documents/SermonForge/exports/Manuscripts/` and opens it.

---

## 2026-04-28 — feat: workspace tour adjustments

- Replaced "Skip tour" with "Leave tour" — discards tour sermon/series via new `db-removeTourSermon` IPC handler and returns to dashboard.
- `TourOverlay` now scrolls the active anchor into view on stop change.
- Re-anchored phase-intro stops (Observe, Interpret, Redemptive, Implications) from subphase pills onto their worksheets.
- Split former "Unbeliever. Compile." stop into two steps; added `data-tour-id="implications-compile"`.
- Softened Step 2 (MPT → MPS) wording.

---

## 2026-04-28 — chore: post-launch hardening from multiverse audit

- `logger.js` now routes through `paths.logs` from `config.js`, isolating dev (`logs-dev/`) from packaged (`logs/`) on the same machine.
- `buildUpdate()` in `main.js` throws in dev and warns in packaged, surfacing column/allowlist drift loudly during development.
- AI audit log in `electron/ai.js` rotates at 5MB and keeps the last 500 entries, matching the `logger.js` rotation pattern.
- Added a 5-step Release Smoke Test (Section 12) to `docs/PROPOSALS/distribution.md` to gate every tagged release.

---

## 2026-04-28 — chore: schema cleanup and architectural housekeeping

- v11 migration drops `sermons.big_idea` column (dead since mpt/mps replaced it).
- Export paths changed from hardcoded `C:\SermonForge\exports\` to `app.getPath("documents")`.
- `THEOLOGY_RESEARCH_PROMPT` and `INCORPORATE_REVISION_PROMPT` extracted from `AIPanel.jsx` to `src/prompts/sermon.js`.
- Added explanatory comments for non-obvious `assembleContext` tier ordering and `sandbox: false`.

---

## 2026-04-28 — feat: setup screen — Claude + ESV key collection

- Expanded `keystore.js` to named-key storage; `loadEsvKey()` reads safeStorage in packaged builds, `.env` in unpackaged.
- Updated `fetchEsvText()` in `main.js` to use keystore instead of `process.env.ESV_API_KEY`.
- `app-save-api-key` IPC handler now accepts `{ anthropic, esv }` object; ESV is optional.
- Redesigned `SetupScreen.jsx` with inline step-by-step instructions for both keys.

---

## 2026-04-28 — feat: distribution phase 3 — auto-updater

- Added `electron/updater.js` using `electron-updater`; checks GitHub Releases 3s after launch, downloads silently, prompts restart on completion.
- Added `publish` GitHub config to `package.json` build section pointing at `teamofoxen/sermonforge`.
- `.env` remains in `extraResources` for Bible/feedback tokens; `ANTHROPIC_API_KEY` inside it is ignored in packaged builds (keystore skips `.env` when packaged).

---

## 2026-04-28 — feat: distribution phase 2 — crash logging

- Added `electron/logger.js` with `logInfo`, `logError`, `readRecent`; rotates at 1MB, safe before app ready.
- Hooked `uncaughtException` and `unhandledRejection` in `main.js`; re-throws in dev so errors stay visible.
- Bug feedback reports now auto-attach the last 50 log lines as a collapsible section in the GitHub issue.

---

## 2026-04-28 — feat: distribution phase 1 — first-run API key setup

- Added `electron/keystore.js` using Electron safeStorage to store the user's Claude API key; dev always reads from `.env`.
- Updated `electron/ai/provider.js` to load the key via keystore instead of directly from `process.env`.
- Added `app-get-key-status` and `app-save-api-key` IPC handlers; preload and database.js wrappers wired up.
- Built `SetupScreen.jsx` (design-system-compliant first-run screen) and gated `App.jsx` behind key status check.

---

## 2026-04-28 — feat: distribution scaffolding phase 0

- Added `electron/config.js` as the single dev/prod gatekeeper exporting `isDev`, `isPackaged`, `paths`, and `devServerUrl`.
- Updated `electron/main.js` to replace all scattered `app.isPackaged` and `ELECTRON_DEV` checks with imports from `config.js`.
- Added `docs/PROPOSALS/distribution.md` capturing the full plan for public distribution (Windows first, Mac pending Apple Developer account).

---

## 2026-04-28 — feat: sermon workspace tour — 34-stop guided spotlight

- Added tour-only sermon seed (electron/tourData.js + db-loadTourSermon IPC) with id NOT LIKE 'tour-%' filters on list queries so the sermon stays hidden from dashboard and planner.
- Built TourContext + TourOverlay (radial-gradient spotlight, gold-glow ring, dark-ink callout card with markdown body) mounted at the App root.
- Wired SermonWorkspace and StudyTab to observe each stop's UI prerequisites (tab, studyStep, studySubPhase, drawerOpen, piOpen) via equality-guarded setters.
- Added data-tour-id anchors across SermonWorkspace, StudyTab, ManuscriptTab, and AIPanel for all 34 stops.
- Dashboard "Tour Sermon Workspace" button now seeds, opens, and starts the tour with the locked 34-stop content from the spec.

---

## 2026-04-28 — refactor: remove demo mode in favor of tour scaffolding

- Deleted DemoContext, DemoSplash, TierBadge, ContextPreview, and electron/demoData.js along with all demo-mode toggles, completeness bar, pipeline map, and Preview Context button.
- Removed db-loadDemoSeries IPC handler, preload exposure, and renderer wrapper.
- Added schema v10 migration that deletes orphan demo-% rows from sermons and series.
- Replaced dashboard "See Demo" button with disabled "Tour Sermon Workspace" and "Tour Sermon Planner" placeholders.
- Updated sermon-workspace-tour proposal to a tour- ID scheme with the tour sermon hidden from list queries.

---

## 2026-04-28 — docs: sermon workspace tour implementation spec

- Added docs/PROPOSALS/sermon-workspace-tour.md with locked 34-stop guided tour design and verbatim callout content.
- Captured key decisions: format, dashboard entry, demo data dependency, visual language, voice, and concentric Pastoral Intelligence ordering.
- Listed codebase touchpoints and five implementation questions to settle in the build session.

---

## 2026-04-27 — feat: floating passage panel; fix TDZ crash; unify DB path

- PassagePopup converted from centered modal to fixed floating panel; clicking the passage ref in the topbar toggles it open.
- Sidebar "Show Text" button removed; popup state ownership moved into SermonWorkspace.
- Fixed production crash: flush-pending-save useEffect moved to after persistUpdate declaration (TDZ violation in minified bundle).
- DB path unified to app.getPath("userData") for both dev and production — no more split databases on install.

---

## 2026-04-27 — fix: flush pending save on workspace unmount; fix cross-platform db path

- SermonWorkspace now calls persistUpdate() on unmount, preventing edits made within the 800ms debounce window from being silently dropped on navigation.
- Replaced hardcoded Windows db path with path.join(__dirname, '../data') so the database persists correctly on Mac.

---

## 2026-04-27 — refactor: resolve all sweep-the-universe architectural findings

- Extracted prompt construction and incorporate helpers from AIPanel into reviewPrompts.js and incorporateHelpers.js.
- Moved captureResponsePatterns to memory.js where its dependencies already live.
- Threaded step and sermonId through sendAIMessage and preload so audit log entries are no longer null.
- Added tier6 and tier7 to TIER_LIMITS; removed redundant per-field trim in pastoral intelligence block.
- Updated schema.md to reflect v8/v9 migration columns and mark big_idea as legacy.

---

## 2026-04-26 — feat(flow): surface study summaries and E/A/I depth in Blueprint

- StudyTab fires onSummaryGenerated when s3/s4 summaries are produced; SermonWorkspace lifts this state.
- OutlineTab renders the s4 summary (fallback s3) as a 'From your study work' card.
- OutlineTab shows E/A/I fill indicators per outline point in the reference card.

---

## 2026-04-26 — feat(flow): reduce inter-stage friction across sermon prep flow

- OutlineTab: forward-facing orientation text; Return to Study button when outline is empty; Continue to Manuscript always visible but disabled until outline exists.
- ManuscriptTab: purpose statement on arrival; Continue to Delivery button at bottom of page.
- DeliveryTab: orientation statement above panel tabs; Next: Preaching Outline nudge after Format Manuscript generates.
- SermonWorkspace: pass onTabChange to ManuscriptTab.

---

## 2026-04-26 — refactor(ai): remove all AI quick-action chips

- Removed `getSuggestions`, `howChip`, and `HOW_CHIP_MESSAGES` from `AIPanel.jsx`.
- Removed `handleLibrarySearch` and its dead imports (`getLibraryStatus`, `searchLibrary`, `getLibraryManuscripts`).
- Removed chip rendering block and `libraryCount` state; `getLibraryStatus` call dropped from startup effect.

---

## 2026-04-26 — fix(ui): dark mode header contrast for AI panel and passage popup

- Added `--dark-header-bg` CSS token (`#1e1a16` in dark mode, `var(--ink)` in light mode).
- Applied to `.ai-panel-header`, `.ai-drawer-close-bar`, `.passage-popup-header` so headers stay dark in dark mode.
- Fixes white text and Clear/X buttons being unreadable when `--ink` inverted to light tan.
- Expanded `run.py` and `scaffold_manifest.py` usage notes in theology corpus proposal.

---

## 2026-04-21 — docs(theology): paperclip legacy-row inventory to proposal

- Added legacy `work_id=NULL` inventory pass to proposal §8 as next-session work.
- Scoped it as a read-only investigation covering author/work distribution, size histogram, duplicate detection, MiniLM-L6 truncation share, and `section` parseability.
- Framed as retrieval-precision work (dedupe / dejunk / resize affect search; metadata backfill does not).

---

## 2026-04-21 — feat(theology): ingest Augustine City of God + make pipeline manifest-driven

- Ingested Augustine's *City of God* (Dods tr.) as 780 chunks with Book.Chapter locators and CCEL page refs.
- Refactored `parse_ccel_thml.py` to read structure config from the manifest so works with different ThML layouts plug in without code changes.
- Parameterized `chunk.py` for soft/hard boundary and locator style (Roman vs arabic book, sections vs none).
- Fixed pre-existing parser bug that dropped paragraphs starting before the first `<pb>` marker.
- Paperclipped `run.py` wrapper, manifest scaffolder, Westminster Standards, and legacy-row cleanup to proposal §8.

---

## 2026-04-21 — feat(theology): surface locator + CCEL page refs in retrieval UI

- Added `work_id`, `locator`, `ccel_page_start`, `ccel_page_end` to all theology SELECTs in `electron/main.js` and the `theology-get-chunks` handler.
- New `src/utils/theologyCitation.js` centralizes chunk formatting and source dedup for Dashboard + AIPanel.
- LLM chunk tags and system-prompt format hint now carry `[Author — Work, Locator, p. N]` with verbatim-preservation instruction.
- "Sources consulted" rows in Dashboard and AIPanel render locator and page (or page-range) when present.

---

## 2026-04-21 — feat(theology): manifest-driven ingest pipeline + Calvin Institutes

- Added curated-corpus proposal at `docs/PROPOSALS/theology-corpus.md`.
- Built 5-stage ingest pipeline under `scripts/theology/ingest/` (parse_ccel_thml, chunk, migrate_schema, load, smoke_check).
- Ingested Calvin's Institutes (Beveridge) as 712 chunks with Book.Chapter.Section locators and CCEL deep-link page refs.
- Added 13 metadata columns to `theology` table; pre-existing rows tagged `corpus_version='legacy'`.
- Fixed `build_theology_fts.py` and `build_theology_vectors.js` to target canonical `data/theology.db`.

---

## 2026-04-20 — perf(ai): cache static system prompt and trim chat history per call

- `buildSystemPrompt` now returns a content-block array with `cache_control: ephemeral` on the static role + TOOL CONTEXT + MESSAGE CONTEXT RULES prefix so it's processed once per session.
- Added `appendTaskDirective` so chip/review TASK directives attach as a trailing block without breaking cache reuse.
- `AIPanel` trims conversation history to the last `MAX_HISTORY_TURNS` (6) turns before each send.
- `sendAIMessage` validator now accepts either a string or a content-block array for `systemPrompt`.

---

## 2026-04-20 — refactor: lazy-init Anthropic client and return structured error on missing key

- Anthropic client is now instantiated on the first `generate()` call instead of at module load.
- Missing or empty `ANTHROPIC_API_KEY` returns `{ error: true, message }` instead of throwing.
- `isAvailable()` reads the env at call time.
- IPC handler in `electron/ai.js` forwards the structured error as a user-visible message.

---

## 2026-04-20 — refactor: extract system prompts into src/prompts/ and make AI audit log async

- Relocated `buildSystemPrompt`, `OUTLINE_SYSTEM`, and `FE_CHAT_SYSTEM` to `src/prompts/` with `PROMPT_VERSION` headers.
- Replaced inline prompt definitions in `AIPanel`, `StudyTab`, and `outlineChat` with imports; content unchanged.
- Dropped now-unused `CONTEXT_SECTIONS` and `buildAdaptiveHints` imports in `AIPanel`.
- Switched the `ai-message` audit log from `fs.appendFileSync` to `fs.promises.appendFile` (fire-and-forget).

---

## 2026-04-20 — build: exclude better-sqlite3 MSBuild intermediates from asar input

- Added negation globs under `build.files` for `Release/obj`, `*.iobj`, `*.ipdb`, `*.pdb`, `*.exp`, `*.lib`, and `test_extension.node`.
- Cuts ~10s off the NSIS phase; overall `electron-builder --win` drops from 62s to 47s.
- Packaging-only; no functional change.

---

## 2026-04-19 — perf: split renderer bundle via React.lazy + manualChunks

- Lazy-loaded 8 non-critical views in `App.jsx` under a single `Suspense` boundary.
- Added `rollupOptions.manualChunks` for `react-vendor` and `markdown`.
- Main entry chunk dropped from 542 KB to 49.6 KB (no chunk-size warning).
- Installed `/agents` and `/run-agent` skills.

---

## 2026-04-19 — chore: remove orphaned .show-text-btn CSS

- Removed the `.show-text-btn` rule, unreferenced after Show Text moved to the sidebar.

---

## 2026-04-19 — feat: move Show Text to sidebar, ESV-only modal

- Removed 4 per-sub-phase Show Text buttons and `passageAnchor` state from `StudyTab`.
- Added a sidebar nav item that appears only when a sermon passage is loaded.
- Lifted passage and modal state to `App`; `SermonWorkspace` surfaces `sermon.passage` via `onPassageChange`.
- Rewrote `PassagePopup` as a centered modal (Escape to close) with ESV-only rendering.
- Simplified the `passage-fetch` IPC to ESV-only while preserving the response shape.

---

## 2026-04-19 — chore: add Execution Gates, end-session skill, hook reminders

- Added an Execution Gates section to `CLAUDE.md` mandating the sweep sequence.
- Installed the `/end-session` skill for safe session finalization.
- Added `Stop` and `PostToolUse` GATE reminder hooks in `settings.json`.
- Tracked the previously untracked `/interrogate` and `/sweep-the-multiverse` skills.

---

## 2026-04-19 — chore: remove inline Write with AI panel from Manuscript tab

- Deleted the bottom-of-page Write with AI chat in [ManuscriptTab.jsx](src/components/ManuscriptTab.jsx), along with its state, send handler, system prompt, and now-unused imports (`useState`, `useEffect`, `useRef`, `ReactMarkdown`, `sendAIMessage`).

---

## 2026-04-19 — fix: remove volatile model cache from build package

- Moved `@xenova/transformers` model weights to `resources/models/` so they ship as a stable `extraResources` bundle instead of from the volatile `.cache` inside `node_modules`.
- `ensureTheologyEmbedder()` now sets `env.cacheDir` and `env.allowRemoteModels = false` to load from the committed model path (dev or packaged).
- Excluded `node_modules/@xenova/transformers/.cache/**` from the electron-builder files glob to stop build size growing with each ingestion run.

---

## 2026-04-19 — chore: sweep-the-multiverse audit fixes

- Both docx export handlers in `electron/main.js` now use `fs.promises.writeFile` instead of `fs.writeFileSync`, eliminating main-process blocking during Study Guide and PMB exports.
- Moved `build_theology_fts.py` and `build_theology_vectors.js` into `scripts/theology/` with a README documenting the ~600-word chunk invariant and the 384-dim embedding contract.
- Added a comment above the bootstrap `CREATE TABLE` block in `main.js` stating that all further schema changes must go through `runMigrations()`.
- Added `StudyGuides/` to `.gitignore`.
- Installed the `sweep-the-multiverse` skill under `.claude/skills/`.

---

## 2026-04-19 — feat: Sectioned manuscript editor

- Replaced monolithic manuscript textarea with structured section cards: Introduction, one card per outline point, Transitions, and Conclusion.
- Manuscript JSON stores only new connective tissue (opener, scripture reading, expectation, transitions, response); E/A/I and outline point text edit their source fields directly and sync back.
- Flow Coach, Ear Check, and Tune-Up now use `assembleManuscriptText()` to reconstruct the full manuscript for AI prompts.
- FC and Ear Check both use stepped worklists — brief bullets, one item at a time, reversible.

---

## 2026-04-19 — feat: Ear Check routed to inline chat with Implement Suggestions

- Ear Check now runs in the Write with AI panel (tagged `isEarCheck`) instead of the drawer.
- Ear Check responses show "Implement Suggestions" instead of "Apply to manuscript" — triggers a second AI call that applies only the flagged edits to the manuscript.

---

## 2026-04-19 — feat: inline Write with AI chat on Manuscript tab

- Added always-visible chat panel below the manuscript textarea with passage, MPS, outline, and functional elements sent as context on every turn.
- System prompt allows writing (introductions, transitions, sections, illustrations) unlike the coaching-only Flow Coach.

---

## 2026-04-19 — feat: Manuscript framework pre-fills from functional elements

- `buildTemplate` now reads scripture, explanation, application, and illustration from each point's FE data so "Build Manuscript Framework" seeds the manuscript with the pastor's existing work.

---

## 2026-04-19 — feat: Populate Scripture button auto-fetches ESV text per outline point

- Added "Populate Scripture (ESV)" button to Step 4; AI maps each outline point to its verse range, then ESV text is fetched and written into each card automatically.

---

## 2026-04-19 — fix+feat: Functional Elements — editable titles, scripture field, because-clause fix

- Fixed stale `funcData` state so because-clauses from outline chat now carry through to Step 4 immediately.
- Removed redundant "Outline Point" body field; point title in card header is now a direct editable input.
- Added Scripture (ESV) textarea to each FuncElem card, stored in `functional_elements` JSON.
- Blueprint tab now renders scripture text under each outline point in the MPS card.

---

## 2026-04-19 — feat: Functional Elements step — auto-open cards and AI chat

- `FuncElem` cards now auto-open when they have pre-filled content (e.g. because-clauses seeded from outline chat).
- Collapsed `FuncElem` header shows a truncated explanation preview so pre-filled content is visible at a glance.
- Added persistent AI chat to Step 4 with `FE_CHAT_SYSTEM` prompt focused on developing Explanation, Application, and Illustration per point.

---

## 2026-04-15 — feat: Delivery tab — Manuscript and Outline panels

**`src/components/DeliveryTab.jsx`** (expanded), **`src/styles/global.css`**, **`electron/main.js`**

Added Manuscript and Outline delivery panels alongside the existing Without Notes (CMC) panel. Delivery tab now has three panels navigated by a tab switcher.

**Manuscript panel:**
- Two-phase AI prompt: Flow Coach rhetorical analysis informs where lines break and bullets land; delivery editor formats prose for spoken delivery
- Bullets are the default; non-bulleted flowing lines reserved for rhetorical weight only
- Scripture in italic stacked lines; section labels from the actual outline record
- Stored in new `manuscript_delivery` field (schema v9); Regenerate button if manuscript changes

**Outline panel:**
- Template render from existing outline + functional elements — no AI, no storage
- Shows passage, title, MPS header; each point with Explanation/Illustration/Application beneath

**Shared:**
- Three-tab switcher (Manuscript | Outline | Without Notes) replaces single-panel layout
- Shared `delivery-panel-*` CSS classes replace duplicated PMB header styles

---

## 2026-04-15 — feat: Contour-Mapped Compression (CMC) — Preaching Without Notes

**`src/components/DeliveryTab.jsx`** (rewritten), **`src/styles/global.css`**, **`src/components/SermonWorkspace.jsx`**, **`electron/main.js`**

Replaced the placeholder delivery tab with the CMC engine — a Spurgeon/MLJ-tradition without-notes preparation tool that compresses a completed manuscript into Preaching Memory Blocks (PMBs).

**Architecture:**
- Three-phase AI prompt: Structural Analysis (Tune-Up lens) → Movement Mapping (Flow Coach lens) → Danger Zone Identification (Ear Check lens) → compression into PMBs
- Segments the manuscript by rhetorical movement, not paragraphs or headings
- Compression constraints are non-negotiable: `trigger_phrase` ≤5 words, `core_claim` ≤1 sentence, `memory_hooks` exactly 2 phrases, `imagery` 1 image, `transition_out` 1 sentence (verbatim)
- `trigger_phrase` and `transition_out` are verbatim memory items; all other fields are internalized, not recited

**Schema (v8):**
- New `preaching_blocks TEXT DEFAULT 'null'` column on `sermons` table (migration v8)
- Added `preaching_blocks` to `SERMON_COLUMNS` allowlist
- Top-level `spine` field holds the MPS — the one sentence the preacher returns to when lost

**UI:**
- Generate button builds context from passage, MPT, MPS, exegesis, outline, and full manuscript
- Generated PMBs are immediately editable; blocks persist to DB
- `Regenerate` button replaces blocks if manuscript changes
- Danger zones rendered in crimson; trigger phrase prominent with underline

**Removed:**
- `DeliveryOverlay` component and all delivery overlay CSS — delivery view removed as impractical for pulpit use
- `.btn-deliver` CSS (no longer referenced)
- Pre-sermon checklist, timing notes, post-sermon reflection, delivery notes UI panels

---

## 2026-04-15 — fix: prevent duplicate outline points on repeated Suggest Outline clicks

**`src/components/OutlineTab.jsx`**, **`src/components/StudyTab.jsx`**
- `handleSuggestOutline()` and `suggestOutline()` both appended AI-generated points to the existing outline unconditionally. A second click would stack duplicates. Both now replace the outline with the new suggestion instead of appending. Behaviour on an empty outline is unchanged.

---

## 2026-04-15 — feat: Study workflow logic and handoff improvements

Five fixes to tighten the Study → Outline → Manuscript logic chain:

**`src/components/StudyTab.jsx`**
- `generateMPS()` now includes redemptive thread and implications in the prompt. The MPS is the present-tense congregational claim — it should be informed by the theological and applicational weight the pastor surfaced, not just the MPT in isolation.
- Big Idea banner added to Steps 3 and 4: when `sermon.big_idea` is set, it displays as a persistent dark reference bar above the outline/functional elements so the controlling idea stays visible while working.

**`src/components/OutlineTab.jsx`**
- Added `handleSuggestOutline()` — parses all four exegesis columns from the `sermon` prop and generates a draft outline, matching the capability already in Study Step 3.
- `onTabChange` prop accepted; "Continue to Manuscript →" button added when outline has points, completing the Study → Outline Tab → Manuscript path.
- "Suggest Outline" button now shows alongside "Review Outline".

**`src/components/SermonWorkspace.jsx`**
- Passes `onTabChange={handleTabChange}` to `OutlineTab`.

**`src/utils/studyFields.js`**
- `basic_outline` field hint updated to explicitly name it as a text outline and connect it forward: "It will later inform your sermon outline in Step 3."

---

## 2026-04-15 — feat: outline builder intelligence upgrade

Four improvements to the Quick Outline Builder (Study tab Step 3 and standalone Outline tab):

**`src/components/StudyTab.jsx`**
- Added `suggestOutline()` — generates a draft outline from passage + MPT/MPS + all four exegesis phases. Parses the numbered list response and appends points to the outline via `createOutlinePoint()`. "Suggest Outline" button appears alongside "Review Outline" in Step 3.
- Added `createOutlinePoint` to imports from `../utils`.
- Enriched "Review Outline" prompt — now sends observations, interpretation, redemptive thread, and implications alongside passage/MPT/MPS so the AI can evaluate text-logic derivation, not just MPS ladder.
- Improved s3 summary (`generateSummary("s3", ...)`) — previously only synthesized MPT/MPS in 2–3 sentences. Now passes the full exegetical work and returns 3–5 specific bullets covering textual logic, theological moves, Christ-connection, and application pressures the outline must account for.

**`src/components/OutlineTab.jsx`**
- Added local `reviewResponse`/`reviewLoading` state plus `handleReviewOutline()` function.
- Added `sendAIMessage` and `InlineAIResponse` imports.
- "Review Outline" button appears in the card when outline has points; response renders via `InlineAIResponse`. Evaluation uses passage + MPT/MPS + outline (exegesis data not available in this component).

---

## 2026-04-15 — chore: move database location into project directory

**`electron/main.js`**
- Changed `dataDir` from `C:\SermonForge\data` to `C:\Projects\SermonForge\data` — databases now live alongside the codebase.

**`.gitignore`**
- Updated comment on `*.db` exclusion to reflect new data location.

---

## 2026-04-15 — feat: rename Tune-Up button and add toolbar tooltips

**`src/components/ManuscriptTab.jsx`**
- Renamed "Run Tune-Up Engine" button label → "Final Tune-Up" (function and system prompt unchanged).
- Added `has-tooltip` class and `data-tooltip` attribute to all four toolbar buttons: Build Manuscript Framework, Flow Coach, Ear Check, Final Tune-Up. Each tooltip is 2–3 sentences describing what the tool does and when to use it.

**`src/styles/global.css`**
- Added `.has-tooltip` / `.has-tooltip::after` CSS tooltip rules. Tooltip appears above the button on hover, fades in at 0.15s, uses `var(--ink)` background with `var(--parchment-warm)` text, wraps at 260px. No JavaScript or new dependencies.

---

## 2026-04-15 — feat: Flow Coach and Ear Check on Manuscript tab

Replaced the earlier Transition Coach with **Flow Coach** (renamed and expanded) and added **Ear Check** as a new diagnostic tool. Toolbar order is now: Build Manuscript Framework → Flow Coach → Ear Check → Run Tune-Up Engine.

**`src/components/ManuscriptTab.jsx`**

**Flow Coach** (replaces Transition Coach):
- Renamed `TRANSITION_COACH_SYSTEM` → `FLOW_COACH_SYSTEM` with expanded scope: now coaches intro → each point-to-point gap → conclusion landing, conversationally at the pastor's pace.
- Renamed `runTransitionCoach()` → `runFlowCoach()`; updated initial prompt directive to begin with the Introduction rather than the first point gap.
- Removed the `outline.length < 2` disable guard — Flow Coach is valid even without outline points since intro and conclusion are always coachable moments.

**Ear Check** (new):
- Added `EAR_CHECK_SYSTEM`: two-phase diagnostic. Phase 1 flags structural orphans (passages disconnected from their outline point, causing listener disorientation). Phase 2 flags up to 5 speakability offenders with diagnosis and direction — no rewrites, no replacement language.
- Added `runEarCheck()` function; sends title, passage, MPT, MPS, outline, and manuscript.
- Button disabled when manuscript is empty.

**Why:** Flow Coach needed to cover the intro and conclusion — the gaps at either end of the sermon are as important as the gaps between points. Ear Check fills a gap neither Tune-Up nor Flow Coach covers: listener-hostile phrasing (sentence nesting, abstract noun density, verbal signposting). Ear Check is deliberately diagnostic-only to preserve the author's voice while flagging what will lose the room.

