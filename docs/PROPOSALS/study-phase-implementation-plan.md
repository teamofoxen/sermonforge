# Study Phase Implementation Plan (SPIP)

**Status:** Updated 2026-05-04 after a code-vs-docs audit. SPIP is the running implementation log plus the next-up list.

**Audience:** The pastor-developer of SermonForge.

---

## What's shipped

All entries below are wired into the running app, verified 2026-05-04 via direct read of `StudyTab.jsx`, `SpotlightWorksheet.jsx`, `App.jsx`, `SermonWorkspace.jsx`, `electron/main.js`, `studyAdvancement.js`, and `docs/CORE.md`.

**A milestones — Component 1 foundation:**

- **A0** — branch fold `sub/sfdi → sub/sprd`. Commit `3a1554f`.
- **A1.0** — per-question envelope shape (`{value, na}` per question), helpers and auto-coerce on read. Commit `43877ca`.
- **A1.1** — spotlight rendering, one field active at a time, "Next question →" disabled when empty. Commit `fb7b7e8`.
- **A1.2** — hover-checklist on disabled gates. Shipped under B1.6 once Field 4's composite gate gave it a real multi-condition shape.
- **A1.3** — per-question N/A toggle UI alongside Next question. Commit `87dab7c`.
- **A2.0** — structured-list value foundation in study helpers; canvas / paraphrase / synthesis-table sub-shapes; `flattenAnswerValue` helper threaded through evidence + flatten paths. Commit `c1e7fcd`.
- **A2.1** — `IndentedSentenceCanvas` (Tab/Shift+Tab indent, line-number gutter, level-0 burgundy marker, paste blocked).
- **A2.2** — `ParaphraseBlocks` (one block per main sentence + paraphrase textarea, orphan paraphrases preserved).
- **A2.3** — `SynthesisTable` (writable + read-only columns, autocomplete from canvas line numbers).
- **A2.4** — `PeripheralReferencePanel` (28% reference panel beside heavy-lifting fields).
- **A2.5** — `FieldOverviewScreen` (heavy-lifting field overview on first per-sermon entry).

**B milestones — the four sub-phase reshapes:**

- **B1.0–B1.7** — Observe reshape: 9 fields per SFDI; multi-question rendering; SFDI question sequences wired (Background / Context / Surface Questions / Possible Implications); heavy-lifting flag + pre-field overview wiring; Observe → Interpret composite threshold; Field 4 wire-up (canvas + paraphrase + synthesis-table); `AdvanceGateChecklist` + structured `{gates, firstReason}`; `flattenToText` multi-question fix.
- **B2.0–B2.2** — Interpret reshape: 7 fields per SFDI; Deeper Context 2-question sequence; Field 7 Interpretation Synthesis with cumulative-synthesis-table cross-phase plumbing; Interpret → Redemptive Thread composite gate.
- **B3.0–B3.2** — Redemptive Thread reshape: 5 fields per SFDI; three multi-question sequences; Field 5 Christ-Connection Statement with cumulative column + RT → Implications composite gate; legacy "Summary of Redemptive Features" Synthesize block removed.
- **B4.0–B4.2** — Implications reshape: 4 fields per SFDI (three-way conversation realized at field level); Field 4 Implications Synthesis with cumulative `implication` column + Implications → MPT/MPS composite gate; **Pastoral Context card removed** from `SermonWorkspace`; 5 PC-related tour stops removed.
- **Phases 1/2/3 Review-button** `flattenToText` follow-on fix.

**C milestones — workspace polish:**

- **C1** — sermon-level takeover. `Sidebar` hidden when `currentView === VIEW.Workspace`. Commit `d6258ec`.
- **C3** — Sermon Frame stage between Blueprint and Manuscript. v18 migration adds `sermon_frame` column; `SERMON_FRAME_FIELDS` + `FrameTab` + composite Frame → Manuscript gate; 15 new contract tests. Commit `b2ad01e` (followup `71bc74a`).
- **C5** — AI prompt updates substantially complete. Review prompts rewired to `PHASE_REVIEW_TASK` constants + `flattenToText`; OutlineTab uses `IMPLICATIONS_FIELDS`; PC tier in `contextBuilder` reads Phase 4 Field 3; `sermon.js` MESSAGE CONTEXT RULES rewritten for the two-field PC shape. Commit `9daffff`.
- **C5 (MPS Draft prompt rewrite)** — three per-question prompts (Q1 Translate / Q2 Drift / Q3 Tighten) replaced the WITH_PC/NO_PC pair; PC scaffolding fully retired from the MPS draft path. Shipped in `b2ad01e`.
- **C6** — per-boundary thresholds in `studyAdvancement.js`. All four sub-phase gates return `{gates, firstReason}` per B1.6's structured shape. Closed implicitly through B1.4–B4.2.

**Cross-cutting:**

- **CORE.md Process Contract #6 extension** — extended from "Study throughline" to "workspace throughline" per SADI Ruling 4. Shipped in `b2ad01e`.
- **SADI per-field content-design walks** — overview blockquotes + Q-framings + Eph 2:1–5 worked outputs in pastor-to-people voice for MPT, MPS, Intro, Conclusion. Shipped in `b2ad01e`.

---

## Next up — pre-C2 stability check, then C2

**Stability check before adding C2.** The code base reshaped a lot in B1–B4. Before laying throughline visualization on top, verify the substrate holds. Items in cost order:

1. **Full `vitest` run** — verify all tests green.
2. **Orphan-reader sweep** — grep the codebase for any lingering readers of the removed PC card schema columns (`background_noise`, `audience_assumptions`, `topic_theme`) and the retired Phase 4 keys (the five `IMPLICATIONS_THEOLOGICAL` keys, the eight `IMPLICATIONS_PERSONAL` keys, `IMPLICATIONS_UNBELIEVER_KEY`, `IMPLICATIONS_COMPILED_KEY`). Anything that still reads them is silently failing.
3. **Retired-key sweep in AI prompts** — grep `src/prompts/` and `src/utils/reviewPrompts.js` for retired field keys (`commands`, `statements`, `basic_outline`, `context_impact`, `characters`, `diagram`, `summarize_parts`, `summarize_whole`, the eight retired Phase 4 keys). Silent-failure mode if missed.
4. **`/sweep-the-multiverse`** — comprehensive architectural audit across context pipeline, database, IPC, performance, search, AI flow.
5. **Real sermon-prep walk** — open the running app, create a fresh sermon, work Observe → Interpret → RT → Implications end-to-end. Watch for: spotlight transitions; Field 4 canvas typing; paraphrase + synthesis-table behavior; cumulative-column extension across phases; hard-gate disabled Continue + hover-checklist; Sermon Frame stage; Frame → Manuscript transition.
6. **Cumulative thought-unit table integrity** — SPIR risk #4 has three open questions still un-ruled: row identity across phases, deletion cascade behavior, line-number refresh propagation. Either rule + add tests, or test current behavior and document.

Anything surfacing here becomes a SPIR Surfacing-risks entry and gets fixed before C2 starts.

**C2 — throughline visualization.** A literal line on the screen across the Study tab. Each field is a node along the line; nodes fill in as fields complete. Named outcomes sit as callouts at the end of each sub-phase segment. Static — no animated cue from field to node. Pure UX, no schema, no IPC.

---

## Backlog — in order

1. **C4** — Background series-level inheritance. Only remaining item with potential schema implications (sweep-the-house trigger). A series carries its book's Background; each sermon inherits and can override.
2. **Workspace tour rewrite.** Current tour predates SFDI walkthrough and references retired PC anchors. Spec at [`docs/PROPOSALS/sermon-workspace-tour.md`](sermon-workspace-tour.md).

---

## How sub-items get shipped

- One commit per sub-item.
- `/sweep-the-house` runs only on commits that touch the gated paths in CLAUDE.md.
- `/end-session` finalizes every commit (changelog plus push).
- A sub-item that turns out to be premature gets deferred — capture the reason here, pick it up when the conditions that need it land.

That's it.
