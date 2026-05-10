# AI Removal Initiative (ARI) — Charter

> **Status:** Drafted 2026-05-09. Pre-execution. Phase 0 (Series Planner gate) shipped 2026-05-09 in advance of this charter and is folded in for completeness.

> **Audience:** The lone developer of SermonForge. Plain language; technical specifics where they matter.

---

## Why this exists

SermonForge has carried an unresolved tension since the start: the Principle says *the system does not do the clarity work for the user* (CORE.md, "The Principle"), and the identity sentence says *with AI assistance calibrated to every stage* (CORE.md:26-28). Every AI substitution — even one wearing the polite costume of a "proposal" — relaxes the constraint. Process Contract #5 ("AI augments, never substitutes") was written defensively to manage that tension, not to resolve it.

ARI resolves it by removing AI. After ARI, SermonForge is what its Principle always claimed it was: a system that forces clarity out of the pastor through structured pressure, with no escape hatch.

The throughline (Process #6) is the work. AI was a parallel rail. Removing the parallel rail returns the throughline to what it was always supposed to be — pastor-authored end to end, with the system asking instead of answering.

This is not a beta toggle. It is a product decision.

---

## What stays

The contracts that describe pastor-authored work are unchanged:
- **State Contract** in full — sermons, series, stages, steps, sub-phases, named outcomes
- **Process Contract** clauses 1, 2, 3, 4, 6 — monotonic movement, evidence-gated transitions, visible movement, Pastoral Context progression, throughline structure
- **Mutation Contract** clauses 3, 4, 5 — saves are events, destruction-requires-evidence, one error vocabulary
- **Surface Contract** in full

The **Principle** is not just preserved but strengthened: with AI gone, the system has nothing to substitute *with*.

The **throughline** (the seven-slot SFDI/SADI articulation) is unchanged. It was always pastor-authored; the AI was a sidecar.

---

## Decisions (locked)

### Phase 0 — already shipped 2026-05-09

- **Series Planner gated** behind a "Coming soon" placeholder. Three entry points removed (sidebar dropdown, Dashboard "Build a series" tile, both `VIEW.Planning` / `VIEW.SeriesPlanner` routes). Component code retained on disk; this leaves the door for later return without dictating it. NewSeriesModal mount and dead handlers removed.

### AI surface decisions

| Surface | Decision |
|---|---|
| Main AI Panel chat | Cut |
| Outline chat (StudyTab) | Cut |
| Functional Elements chat (StudyTab) | Cut |
| Outline chat (OutlineTab) | Cut |
| Generate MPT | Cut — SADI Step 2's `main_point_pair.mpt.{draft, tighten}` question flow is the path |
| Generate MPS | Cut — SADI Step 2's `main_point_pair.mps.{translate, gospel_check, tighten}` is the path |
| Suggest Outline (StudyTab + OutlineTab) | Reframe as a new prewritten question sequence (design TBD) |
| Generate Summary s1–s4 | Reframe as one synthesis question per sub-phase. The pastor's typed answer is the canonical named outcome (Observation Set / Interpretation Set / Christ-Connection Statement / Implications Synthesis). This strengthens Process #6. |
| Inline AI request per Study field | Cut |
| Review Outline | Reframe as 4–5 prewritten review questions |
| Series Coherence Check | Cut (already orphaned by Phase 0) |
| Incorporate (AI Panel) | Cut (paired with Review buttons; pastor edits themselves) |
| Flow Coach (Manuscript) | Reframe as a structured worklist checklist — Intro, each transition, Conclusion |
| Ear Check (Manuscript) | Reframe as a printed scan-list (long sentences, abstract nouns, jargon, complex clauses, words that lose meaning aloud) |
| Final Tune-Up (Manuscript) | Reframe as a structured editorial pass with sections the pastor fills (Sermon Snapshot, Alignment Map, Patch Plan) |
| Populate Scripture | **Keep** — mechanical; ESV fetch is not AI |
| Manuscript-for-Delivery formatting | Cut (lives on the Delivery tab; supersedes earlier "leave" decision) |
| Generate Preaching Blocks | Cut |
| Delivery tab entirely | Cut — manuscript export from end of Manuscript tab is the end of the line |

### Notebook replacement

The AI Panel disappears as a docked surface. In its place, SermonForge gains **per-tab notebooks**: each tab in the Sermon Workspace where AI lived gets a notebook scoped to that tab's mental mode. The pastor's outline-thinking notes don't bleed into delivery-thinking notes.

Per-tab over single-docked because *different tabs are different mental modes; mixing them is friction.* Per-tab over per-field because per-field is too granular — the pastor wants a scratchpad for "thinking about the outline," not "thinking about outline point 2's application sub-field."

Notebooks are sermon-scoped (live alongside the sermon's other state) and persist on save like any other field. They contain only what the pastor types — no AI involvement.

---

## Open design questions

### D1 — Suggest Outline question sequence

The Suggest Outline button is the only "authorship" surface where deletion alone doesn't suffice — there's no existing question flow to fall back to (unlike MPT/MPS, which inherit SADI Step 2's flow). A new prewritten sequence is needed.

Direction (not yet decided): a 3–4 question walk that pulls outline points out of the MPS by asking what listener moves are needed to land on the MPS. The questions are real homiletics design — defer to a working session before implementation.

### D2 — Synthesis-question wording

The Generate Summary s1–s4 reframe replaces AI synthesis with a single one-sentence question per sub-phase. Exact wording per sub-phase is real design — the question must force the synthesis the contract demands without becoming generic.

Candidates (placeholder):
- Observe → "In one sentence, what does the text *say*?"
- Interpret → "In one sentence, what does the text *mean*?"
- Redemptive Thread → "In one sentence, where is Christ in this text?"
- Implications → "In one sentence, how does this text land on the pastor's people?"

Wording needs a working session.

### D3 — Notebook UI shape

Per-tab is decided. Specifics to design:
- Where on each tab does the notebook surface live? (Side drawer, bottom sheet, expandable panel?)
- Auto-save behavior, save indicator
- Optional: lightweight markdown rendering, or plain text only?

### D4 — Schema cleanup pacing

After ARI ships, several DB columns become orphaned (`manuscript_delivery`, `preaching_blocks`, `last_tune_up`, `topic_theme`, `audience_assumptions`, `background_noise` if not already retired, possibly `study_guide_note`). A migration to drop them is a Phase 4 concern; orphan data sits harmless in the meantime.

### D5 — Theology corpus

`theology.db` (PD Reformed/Puritan corpus) is hybrid FTS + local-embedder search — not LLM. The corpus search itself is not AI. With chat gone, the corpus loses its UI surface. Three paths:
- (a) Build a small non-AI "Theology Library" search box that returns sourced chunks
- (b) Cut the corpus entirely
- (c) Defer — leave data on disk, no UI surface, decide later

Lean: (c) defer. Out of ARI scope unless explicitly pulled in.

---

## Phase plan

Each phase is a chunk that can ship and be committed independently. Stop after each phase to evaluate; do not auto-chain.

### Phase 0 — Series Planner gate (✅ shipped 2026-05-09)

### Phase 1 — Cut chat surfaces (✅ shipped 2026-05-09)

Removed the Main AI Panel entirely (Series Coherence Check + Incorporate died with it), the three per-tab chat panels (Outline ×2, FE), and hid the Manuscript Flow Coach / Ear Check / Final Tune-Up buttons (their response surface is gone; reintroduced as checklists in Phase 4).

Files: `AIPanel.jsx` deleted; `SermonWorkspace.jsx`, `StudyTab.jsx`, `OutlineTab.jsx`, `ManuscriptTab.jsx`, `tour/workspaceTourStops.js` edited. The Suggest Outline draft display block (StudyTab + OutlineTab) preserved — it now hosts only the AI-suggested draft, no chat input — and goes entirely in Phase 2 with the Suggest Outline button.

### Phase 2 — Cut authorship + review buttons (✅ shipped 2026-05-09)

Removed:
- Generate MPT, Generate MPS buttons + draft proposals (SADI Step 2 question flow stays — that's the path)
- Suggest Outline ×2 buttons + outlineChat draft display blocks (StudyTab + OutlineTab)
- Generate Summary s2/s3/s4 + p2/p3/p4 (auto-fired step/sub-phase entry briefings) + ref_p2_context (field reference card) — six total
- All Look Again buttons (per-sub-phase inline AI review) + LookAgainBlock component
- Review Outline + Review E/A/I Balance + InlineAIResponse displays
- SummaryBlock component, summaries state, summaryProps, onSummaryGenerated wiring (StudyTab → SermonWorkspace → OutlineTab)
- Dead `studySummaries` "From your study work" display block in OutlineTab

PausePointScreen preserved with `priorSummaryKey: null` — it falls back to "Your work in this sub-phase is complete." Phase 5 may add synthesis questions there.

Files: `StudyTab.jsx` (1763 → 1152 lines, −611), `OutlineTab.jsx` (308 → 120 lines, −188), `SermonWorkspace.jsx` (studySummaries state + onSummaryGenerated prop removed). 17+ imports cleaned.

### Phase 3 — Notebook MVP (✅ shipped 2026-05-09)

Per-tab notebook surface on Study, Blueprint, and Manuscript tabs. Plain text, sermon-scoped, auto-saves through the existing onUpdate pipeline. Default-collapsed when empty, default-open when there's content (so re-entry shows what you wrote).

Files: new `NotebookPanel.jsx` (collapsible card with autoresizing textarea); mounted in `StudyTab.jsx` (bottom of `study-write-col-body`), `OutlineTab.jsx`, `ManuscriptTab.jsx`. Schema v20 migration adds `notebook_study`, `notebook_blueprint`, `notebook_manuscript` columns to the `sermons` table; mirrored in `SERMON_COLUMNS` (both `contracts.ts` and `contracts.cjs`).

Replaces the AI Panel as the docked thinking surface — but in-flow rather than docked-right, so it doesn't reintroduce a separate panel pattern.

### Phase 4 — Manuscript review reframes (✅ shipped 2026-05-09)

New `ManuscriptReview.jsx` component. Three collapsible sections (Flow Check, Ear Check, Final Tune-Up) rendering structured prompts the pastor walks themselves. Read-only content — no persistence, no AI. Pastor captures any thoughts in the Manuscript Notebook below.

- **Flow Check** — dynamic per-sermon: Intro, each transition between outline points, Conclusion. One prompt per item.
- **Ear Check** — fixed scan-list: long sentences, abstract nouns, jargon, nested clauses, words that don't mean to listeners what they mean to you, verbal signposts that overpromise.
- **Final Tune-Up** — five fixed sections: Text→Claim Chain, Structural Alignment, Functional Balance, Redemptive Necessity, Conclusion Coherence. Each with 2–3 prompt questions.

Mounted in `ManuscriptTab.jsx` between manuscript fields and the Manuscript Notebook. Single `openReview` state — only one section open at a time.

### Phase 5 — Synthesis-question reframes (after D2 design session)

Drop the Generate Summary buttons (already in Phase 2), introduce the synthesis question into each Exegesis sub-phase's question flow.

### Phase 6 — Outline-question sequence (after D1 design session)

New prewritten question sequence for outline construction.

### Phase 7 — Cut Delivery tab (✅ shipped 2026-05-09)

`DeliveryTab.jsx` deleted. Removed from `SermonWorkspace.jsx` (import + mount), `ManuscriptTab.jsx` ("Continue to Delivery →" button + STAGE/PrimaryButton/onTabChange now-unused). `STAGE_SEQUENCE` (both `contracts.ts` and `contracts.cjs`) drops "Delivery" so the tab strip no longer shows it; the `Stage` type still admits "Delivery" so legacy data with `current_stage = "Delivery"` doesn't violate the contract. Tour stop for Delivery removed (`workspaceTourStops.js`). `sermon-export-pmb` IPC handler removed (`main.js`); `exportPmb` removed from preload + `db/database.js`.

`manuscript_delivery` and `preaching_blocks` columns retained per migration policy (defensive). `validateCMCBlocks` in `aiSchema.js` left for Phase 11 cleanup — orphaned but harmless.

Manuscript is now the terminal sermon-prep stage with Export to Word as the terminal action.

### Phase 8 — Backend cleanup (✅ shipped 2026-05-09)

User chose Path 1 — cut Populate Scripture too, removing the lone remaining AI surface.

Removed:
- `src/utils/ai.js`, `src/utils/aiSchema.js` (+ `.test.js`), `src/utils/contextBuilder.js` (+ `.test.js`), `src/utils/incorporateHelpers.js`, `src/utils/lastAiCallRegistry.js`, `src/utils/outlineChat.js`, `src/utils/reviewPrompts.js`, `src/utils/theologyCitation.js`
- `src/prompts/` directory (outline.js, seriesPlanner.js, sermon.js, study.js)
- `src/components/AIPanel.jsx` (already gone Phase 1), `src/components/InlineAIResponse.jsx`, `src/components/ProposalPanel.jsx`, `src/components/SeriesPlanner.jsx`, `src/components/Planning.jsx`, `src/components/NewSeriesModal.jsx`
- `src/constants/contextSchema.js`
- `electron/ai.js`, `electron/ai/` directory (incl. `provider.js`)
- `sendAIMessage` from preload + `ai-message` IPC handler
- `@anthropic-ai/sdk` from `package.json`
- Anthropic-key handling in `keystore.js` (loadKey removed; `saveKeys` now ESV-only)
- `app-save-api-key` IPC simplified to ESV-only (no Anthropic validation)
- `app-get-key-status` IPC repurposed: `configured` now means "user completed first-run setup" (signalled by `bti_telemetry_enabled` setting presence)

Cut from StudyTab: `populateScripture` function + button + ProposalPanel + state. SetupScreen rewritten as ESV-only + telemetry preference.

Cleanup of FeedbackFlag + SermonWorkspace: removed `lastAiCall` registry usage + `abortInFlightForSermon` import (the Process #5 stale-AI-response safeguard) — both unreachable with no AI in flight.

Theology corpus (`theology.db`, `theology-search` IPC, `theology-status` IPC) preserved per charter D5 (deferred decision). Search infrastructure orphaned but harmless.

### Phase 9 — Contract + identity rewrite (✅ shipped 2026-05-09)

- **Process Contract #5** rewritten: "No AI substitution. The system contains no AI authorship surfaces. The pastor authors all sermon content."
- **MutationKind** collapsed to `"user_input"` only (`contracts.ts` + `contracts.cjs`). `AiProposalMutation` / `AiApplyMutation` interfaces and the corresponding `applyMutation` overloads removed from `spine.ts`. The AiProposal/AiApply branches in `validateAndCommit` (and the in-memory `proposals` Map + `pruneExpiredProposals`) removed from `main.js`.
- **Architectural boundaries**: "API key never reaches the renderer" and "All AI calls go through IPC" removed. New boundary: "No AI. SermonForge contains no AI surfaces."
- **Identity sentence** rewritten: "SermonForge starts where sermon prep actually starts — with the text. The system forces clarity through a structured throughline, end to end pastor-authored. No AI substitution."
- **Tech stack** line: `@anthropic-ai/sdk` removed.

### Hanging-chads pass (✅ shipped 2026-05-09)

After the audit fix-pass, a final sweep cleared remaining low-priority artifacts:

- **ESLint `no-direct-ai` rewritten** to remove the `electron/ai/provider.js` and `src/utils/ai.js` allowlist (those files no longer exist). Rule is now no-exceptions: any `@anthropic-ai/sdk` import or `window.electronAPI.sendAIMessage` call is rejected. Lint-layer tripwire for the no-AI invariant.
- **Dead CSS pruned** from `src/styles/global.css`: the entire AI Panel block (~280 lines: `.ai-panel`, `.ai-panel-*`, `.ai-message*`, `.ai-copy-btn`, `.ai-markdown*`, `.ai-loading*`, `.ai-clear-btn`, `.ai-suggestions`, `.ai-suggestion-btn`, `.ai-input*`, `.ai-send-btn`, `@keyframes aiDotPulse`); the entire Inline AI Response block; the entire AI Drawer block (`.ai-drawer*`, `.ai-drawer .aichat-panel`); and `@keyframes inlineAIFadeIn`. From `feedbackFlag.css`: `.feedback-flag-popover-check` (the AI-include checkbox is gone).
- **`docs/PROPOSALS/distribution.md`** updated: removed Anthropic-key first-run setup section (struck-through with ARI note); short-list step #3 now describes the optional ESV key; smoke test #1 + #3 rewritten (no AI message check; notebook persistence check instead); GitHub Actions secrets line clarifies `ANTHROPIC_API_KEY` is moot now.
- **Stale notices added** to: `docs/PROPOSALS/beta-testing-initiative.md`, `docs/PROPOSALS/bti-build-mvp.md`, `docs/PROPOSALS/bti-setup-note.md`, `docs/PROPOSALS/bti-tester-summary.md`, `docs/ENFORCEMENT_STATUS.md`. These docs are archival until rewritten for a no-AI product; the notices flag the staleness so future readers don't act on the obsolete guidance.

### Audit fix-pass (✅ shipped 2026-05-09)

After `/sweep-the-house` + `/sweep-the-multiverse` + `/simplify` flagged the following, all addressed:

- **Mutation Contract #1 + #2** (`docs/CORE.md`) rewritten to match post-ARI reality. #1: "User typing always wins by default. All sermon content is pastor-typed." #2: "The proposal slot was retired in ARI Phase 9."
- **"How this works" modal SVG** (`SermonWorkspace.jsx`) updated: Delivery box → Frame; Delivery sub-items → Manuscript sub-items (Manuscript Editor / Manuscript Notebook / Review Checklists / Export to Word); "Tune-Up Engine" sub-item under Manuscript replaced; caption updated from "exegesis to delivery" to "text to manuscript."
- **Vestigial routing in `App.jsx`**: removed `openSeriesId`/`openPlanner`/`returnSeriesId`/`returnDestination` state + handlers. `closeWorkspace` now just goes to Dashboard. `openSermon` simplified.
- **Series back-link in `SermonWorkspace.jsx`** (lines 297-308): removed clickable navigation to coming-soon stub; now plain text label only. `onOpenSeries` prop dropped.
- **Memory system pruned entirely**: `src/utils/memory.js` + `memory.test.js` deleted. `captureMemory`/`updateMemory`/`extractOutlinePattern`/`extractPhrasePatterns`/`restoreMemoryFromBackup` references removed from `SermonWorkspace.jsx` and `App.jsx`. `db-backupMemory`/`db-restoreMemory` IPC handlers removed from `main.js`. `backupMemory`/`restoreMemory` removed from `preload.js` and `db/database.js`. The localStorage-backed pattern memory existed only to feed AI adaptive hints; no consumer remains.
- **Collapsible primitive extracted** (`src/components/primitives/Collapsible.jsx`). `NotebookPanel.jsx` and `ManuscriptReview.jsx` refactored to consume it — single source for the parchment-warm collapsible chrome.
- **NotebookPanel double-resize fixed**: `useEffect` deps reduced to `[open]`; per-keystroke resize is the inline `onChange` call only.
- **SetupScreen dead defensive code removed**: `result === undefined` clause stripped — `app-save-api-key` always returns the success/error envelope.
- **Stale narration comments** stripped from `StudyTab.jsx` (SPRD Q1 historical commentary), `SermonWorkspace.jsx` (workspace tabs / LEGACY_TAB_MAP duplicated commentary, SPRD Q1 import note).

### Phase 10 — Documentation sweep (✅ partial, shipped 2026-05-09)

Deleted:
- `docs/SYSTEMS/context-pipeline.md`
- `docs/SYSTEMS/ai-panel.md`
- `docs/SYSTEMS/ai-model-migration.md`
- `docs/SYSTEMS/series-planner.md`
- `docs/HOW_AI_WORKS.md`

Edited:
- `CLAUDE.md` — navigation table stripped of AI/series-planner rows; distribution row updated to ESV-only key setup
- `docs/RULES.md` — removed Anthropic/AI rules (rules 3 and 4); guardrail "All AI calls must go through `sendAIMessage`" replaced with "No AI surfaces, no AI calls"; AI-feedback-loop guardrail (`phrasePatterns`/`aiPhrasePatterns`) removed; AI-markdown design rule removed; AI Panel layout rule removed
- `docs/REFERENCE/ipc-channels.md` — AI section deleted; sermon-export-pmb section deleted; series-planner.md cross-reference reframed as a Phase 0 gate note
- `docs/SYSTEMS/sermon-workspace.md` — partial-stale notice added at top flagging AI sections as historical pending rewrite

Pending (not blocking):
- `docs/SYSTEMS/sermon-workspace.md` — full rewrite removing AI sections (notice flags it as stale until done)
- ESLint `no-direct-ai` rule repurposing to "no AI imports allowed"
- Any remaining stale references in `docs/PROPOSALS/` (most are historical/archival)

### Phase 11 — Schema migration (D4)

Drop orphaned columns via a migration with version bump. Defer until last; orphan data is harmless and a migration is the most disruptive thing in the initiative.

---

## What this initiative is not

- **Not a beta toggle.** ARI is a permanent product decision. Phase 0's "Coming soon" pattern was a beta gate; everything else here is removal.
- **Not theology corpus removal.** Out of scope unless D5 is pulled in.
- **Not a UI redesign.** The throughline doesn't change shape. Buttons disappear; questions and notebooks fill in. The seven-slot SFDI/SADI structure is untouched.
- **Not a database migration.** Schema cleanup is Phase 11, last and optional.

---

## How to use this charter

Each phase is a session's worth of work, sometimes less. Open this charter at the start of any ARI session — do not work from memory summaries. After each phase ships, update its status here in the same commit. When all phases ship, update CORE.md, RULES.md, and CLAUDE.md per Phase 9–10, and this charter moves to `docs/ARCHIVE/`.
