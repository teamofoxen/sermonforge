# Study Phase Implementation Plan (SPIP)

**Status:** Stripped down 2026-05-04. SPIP is the running implementation log plus the next-up list. No more meta-process.

**Audience:** The pastor-developer of SermonForge.

---

## What's shipped

- **A0** — branch fold `sub/sfdi → sub/sprd`. Commit `3a1554f`.
- **A1.0** — per-question envelope shape (`{value, na}` per question), helpers and auto-coerce on read, no migration logic. Commit `43877ca`.
- **A1.1** — spotlight rendering, one field active at a time, "Next question →" disabled when empty, click-to-edit collapsed fields. Commit `fb7b7e8`.
- **A1.3** — per-question N/A toggle UI alongside Next question, distinct collapsed and active visuals. Commit `87dab7c`.
- **A2.0** — structured-list value foundation in study helpers. Canvas, paraphrase, and synthesis-table sub-shapes tolerated; new `flattenAnswerValue` helper produces evidence text per sub-shape; the answered-questions, flatten-to-text, and field-value-map paths are threaded through it so structured-list questions count as evidence and surface in context flatten. 28 new unit tests; 197 vitest total green. Commit `c1e7fcd`.
- **C5** — Review prompts + PC tier rewire to Phase 4 Field 3. Commit `9daffff`.
- **C1 + C6** — sermon-level takeover + threshold parity. Commit `d6258ec`.
- **C3** — Sermon Frame elevation. STAGE.Frame between Blueprint and Manuscript; v18 migration adds `sermon_frame` JSON column; new `SERMON_FRAME_FIELDS` + `FrameTab` + composite gate at Frame → Manuscript boundary. 15 new contract tests. Commit `b2ad01e`. Followup `71bc74a` dropped a dead helper export and narrowed the FrameTab `useMemo` dep to `[sermon.sermon_frame]`.
- **C5 (MPS Draft prompt rewrite)** — three per-question prompts (Q1 Translate / Q2 Drift / Q3 Tighten) replaced the WITH_PC/NO_PC pair; PC scaffolding fully retired from the MPS draft path. Shipped in `b2ad01e`.
- **CORE.md Process Contract #6 extension** — extended from "Study throughline" to "workspace throughline" per SADI Ruling 4. Shipped in `b2ad01e`.
- **SADI per-field content-design walks** — overview blockquotes plus Q-framings plus Eph 2:1–5 worked outputs in pastor-to-people voice for MPT, MPS, Intro, and Conclusion. Shipped in `b2ad01e`.

---

## Deferred

- **A1.2** — hover-checklist on disabled gates. Picks up when B1 introduces multi-question fields (Field 4's three-question composite gate is the precedent in SFDI). Currently degenerate: with single-question fields the gate collapses to the trivial empty-evidence case, and a hover-checklist on a single gate has nothing useful to show.

---

## Next up — A2.1

**A2.1 — indented sentence canvas component.** Lands against A2.0's stable storage shape. Scope: Tab/Shift+Tab indent semantics, line-number gutter, level-0 visual marker. One commit. Standard verification: `node --check` on electron files if any are touched, vitest green, manual click-through in the workspace.

---

## Backlog — in order

After A2.x finishes:

1. **B1 — Observe sub-phase reshape.** Sub-phase walked end-to-end into the new shape. First multi-question composite gate lands here; A1.2 picks up alongside.
2. **B2 — Interpret sub-phase reshape.**
3. **B3 — Redemptive Thread sub-phase reshape.**
4. **B4 — Implications sub-phase reshape.** PC card removed at this point. Schema columns stay; orphan-reader sweep at the cut.

After B-series finishes:

5. **C2 — throughline visualization.**
6. **C4 — Background series-level inheritance.**
7. **Workspace tour rewrite.**

---

## How sub-items get shipped

- One commit per sub-item. Sub-item is a focused unit of work small enough to verify and revert safely.
- `/sweep-the-house` runs only on commits that touch the gated paths in CLAUDE.md.
- `/end-session` finalizes every commit (changelog plus push).
- A sub-item that turns out to be premature (the A1.2 precedent) gets deferred — capture the reason in the Deferred section, pick it up when the conditions that need it land.

That's it.
