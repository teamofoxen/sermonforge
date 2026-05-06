# Study Phase Implementation Plan (SPIP)

**Status:** SPRD has shipped. SPIP tracks remaining work only — pre-C2 stability check, C2 itself, the backlog, and qualitative concerns to watch in real sermon prep. The shipping log lives in git history and `CHANGELOG.md`.

**Audience:** The pastor-developer of SermonForge.

---

## Pre-C2 stability check — CLOSED 2026-05-05

All six items closed:

1. **Full `vitest` run** — ✅ 383 green.
2. **Orphan-reader sweep** — ✅ all PC-column / Phase 4 retired-key references confirmed defensive (allowlist, schema, browserPreviewMock, comments).
3. **Retired-key sweep in AI prompts** — ✅ `SYNTHESIZE_REDEMPTIVE_TASK` + `COMPILE_IMPLICATIONS_TASK` orphan prompts deleted; `sermon.js` PC scaffolding already updated to current Phase 4 Field 3 shape.
4. **`/sweep-the-multiverse`** — ✅ WARN findings cleaned: dead `set_unbeliever`/`set_compiled` mutation ops + matching type-union entries deleted from `electron/main.js`, `src/core/contracts.ts`, `tests/contracts/_helpers/test-spine.ts`.
5. **Real sermon-prep walk** — ✅ user-verified.
6. **Cumulative thought-unit table integrity** — ✅ Q1 documented (identity by object reference; no reorder UI today); Q2 ruled (heightened delete-confirm copy via `DeleteButton.confirmLabel` when row carries cumulative cross-phase work, replacing earlier `window.confirm`); Q3 ruled (⚠ stale flag on `after_line` when value > canvas line count). All tested.

---

## C2 — throughline visualization — SHIPPED 2026-05-04

`ThroughlineRail.jsx` (vertical sub-phase rail with field nodes + named-outcome callouts driven by `evaluateAdvance`), `ScripturePanel.jsx` (~280px ESV passage panel), and inline `StudyStepStrip` in `StudyTab.jsx` wrap StudyTab Step 1's content in a three-column shell. Static (no animated cues). Pure UX, no schema, no IPC.

---

## Backlog — CLOSED 2026-05-05

1. **Workspace tour rewrite — throughline-first reframe — SHIPPED 2026-05-05** in commit `cbb41ec`. 17 throughline-first stops walking the cumulative thought-unit table + four named outcomes through MPT/MPS → Outline → FE → Frame → Manuscript → Delivery. Replaced the 30-stop SFDI-reconciled tour shipped earlier the same day.

---

## Watch in real prep — RESOLVED 2026-05-05

Lived sermon prep ran end-to-end on the new shape; **none of the three concerns below surfaced.** Listed here for historical reference and future watching:

- **Throughline doesn't feel earned.** Spotlight feels claustrophobic; "Next question" reads as punitive; the pre-field overview reads as a wall before work; paste-intercept frustrates legitimate outside notes; per-cell no-AI feels like the app policing the pastor.
- **MPT/MPS opens unmoored.** The four-phase synthesis is retired with no replacement. The bet is that the four named outcomes plus the cumulative thought-unit table carry the substrate without it. If they don't, MPT/MPS opens with nothing under it — a behavior-change loss before the named-outcome substrate registers as a gain.
- **Composite gate UX obstructs.** Phase 1 Field 3's three-question composite gate is the precedent. The hover-checklist on the disabled gate is the load-bearing affordance — if it doesn't communicate clearly which sub-gate is blocking, the gate feels obstructive rather than guiding. Every subsequent heavy-lifting field with a composite gate inherits the same risk.

---

## How sub-items get shipped

- One commit per sub-item.
- `/sweep-the-house` runs only on commits that touch the gated paths in `CLAUDE.md`.
- `/end-session` finalizes every commit.
- A sub-item that turns out to be premature gets deferred — capture the reason, pick it up when the conditions land.

That's it.
