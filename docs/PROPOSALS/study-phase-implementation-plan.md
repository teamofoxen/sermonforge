# Study Phase Implementation Plan (SPIP)

**Status:** Started 2026-05-04. Intentionally minimal at this point. SADI's per-field content-design walks for all four anchor fields landed 2026-05-04 in commit `b2ad01e`, alongside SPRD C3 (Sermon Frame elevation) and the MPS Draft prompt rewrite — so the SADI gate that previously held back full SPIP development has lifted. Full SPIP development now waits on SPRD's remaining milestones (C2 throughline visualization, C4 Background series-level inheritance, workspace tour rewrite) and on the A2 sub-items giving SPIP a concrete pattern to recommend for B1's structured-exercise work. See "Why this document is small right now" below.

**Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Written in plain language, no engineering vocabulary required.

**Date started:** 2026-05-04.

---

## What SPIP is for

SPRD says *what* the Study phase redesign is. SFDI says *what each Study field is*. SADI will say the same for the Main Preaching Thought / Statement work and for Intro/Conclusion. Together those three documents are the source of truth for the redesign's content and structural decisions.

This document — SPIP — is the *how-to-execute* layer. It takes SPRD's thirteen A/B/C milestones and turns each one into a concrete, ordered, sized plan: what to do first, where to break the work into smaller pieces, where to stop and verify before moving on, and what shape of commit makes the work safe to land.

**SPIP makes recommendations on two axes simultaneously.**

- **Speed.** Keep the execution as compact as the work allows. Don't pad. Don't re-verify what's already verified. Don't break a sub-item into smaller pieces if the smaller pieces don't earn their own commit.
- **Safety.** Never move forward if a verification gate isn't met. Surface real risks before landing the next sub-item. Default to the slower path when the faster one would force a rollback.

When the two are in tension, safety wins — but only after a real check that the safety concern is real. Speculative caution is its own cost.

SPIP does not own *what* gets built. SPRD/SFDI/SADI own that. SPIP only owns *how the building happens*.

---

## Relationship to the other documents

| Document | What it owns | State as of 2026-05-04 |
|---|---|---|
| **SFDI** | Per-field content for the four Study sub-phases | Complete |
| **SADI** | Per-field content for Step 2 (MPT/MPS) and Step 5 (Intro/Conclusion) | Ratification walk + per-field content-design walks for all four anchor fields complete (`b2ad01e`); top-level status header in SADI lags the per-field state and is a separate cross-anchor cleanup |
| **SPRD** | Structural redesign of the Study phase, A/B/C milestone framing | Structurally settled; A0/A1/A2.0/B-series/C1/C3/C5/C6 shipped; remaining: C2 (throughline viz), C4 (Background series-level inheritance), workspace tour rewrite |
| **SPIP** (this doc) | Per-milestone execution plan | Started; full development gated on SPRD finalization |
| **SPIR** | Anticipated and surfacing risks plus remediation | Started in parallel with SPIP; grows during implementation |

**The flow is one-direction.** SFDI / SADI / SPRD inform SPIP. SPIP informs SPIR. SPIR does not feed back into the planning documents.

---

## Why this document is small right now

One reason now, where there were two.

**One — SPRD is still being written.** The structural side is settled, but the document itself is being actively updated as A2 sub-items land and as the remaining C-milestone entries pick up content. C2 (throughline visualization), C4 (Background series-level inheritance), and the workspace tour rewrite are still open. The implementation milestones table grows with sub-item progress notes. Drafting SPIP in detail against a moving SPRD risks rework that can be avoided by waiting.

**Two — SADI was upstream of two SPIP entries (now resolved).** Milestone C3 (Sermon Frame elevation, which carries Step 5's named-outcome surfaces) and the MPS Draft prompt portion of milestone C5 both required SADI's per-field content-design walks before they could be planned. Both shipped together with SADI's walks in `b2ad01e` (2026-05-04). The braiding happened atomically rather than sequentially — see the retroactive rulings on Firings 2 and 3 below.

The right move is now: capture what's knowable today in scaffolding form (this document); develop SPIP in earnest when SPRD's remaining milestones land.

---

## Current implementation snapshot (2026-05-04)

Captured here so SPIP's eventual full draft starts from the right baseline, not from a clean slate.

- **A0** done — branch fold sub/sfdi → sub/sprd at commit `3a1554f`.
- **A1.0** done — per-question envelope shape (`{value, na}` per question), helpers and auto-coerce on read, no migration logic. Commit `43877ca`.
- **A1.1** done — spotlight rendering, one field active at a time, "Next question →" disabled when empty, click-to-edit collapsed fields. Commit `fb7b7e8`.
- **A1.3** done — per-question N/A toggle UI alongside Next question, distinct collapsed and active visuals. Commit `87dab7c`.
- **A1.2** deferred to post-B1 — hover-checklist on disabled gates. Currently degenerate: with single-question fields the gate collapses to the trivial empty-evidence case, and a hover-checklist on a single gate has nothing useful to show. Picks up when B1 introduces multi-question fields (Field 4's three-question composite gate is the precedent in SFDI).
- **A2.0** done — structured-list value foundation in study helpers. Canvas, paraphrase, and synthesis-table sub-shapes tolerated; new `flattenAnswerValue` helper produces evidence text per sub-shape; the answered-questions, flatten-to-text, and field-value-map paths are threaded through it so structured-list questions count as evidence and surface in context flatten. 28 new unit tests; 197 vitest total green. Commit `c1e7fcd`.
- **C5** done — Review prompts + PC tier rewire to Phase 4 Field 3. Commit `9daffff`.
- **C1 + C6** done — sermon-level takeover + threshold parity confirmed. Commit `d6258ec`.
- **C3** done — Sermon Frame elevation. STAGE.Frame between Blueprint and Manuscript; v18 migration adds `sermon_frame` JSON column; new `SERMON_FRAME_FIELDS` + `FrameTab` + composite gate at Frame → Manuscript boundary; 15 new contract tests. Commit `b2ad01e`. Followup `71bc74a` dropped a dead helper export and narrowed the FrameTab `useMemo` dep to `[sermon.sermon_frame]`.
- **C5 (MPS Draft prompt rewrite)** done — three per-question prompts (Q1 Translate / Q2 Drift / Q3 Tighten) replaced the WITH_PC/NO_PC pair; PC scaffolding fully retired from the MPS draft path. Shipped in commit `b2ad01e` as Phase 3 Item 2.
- **CORE.md Process Contract #6 extension** done — Process Contract #6 extended from "Study throughline" to "workspace throughline" per SADI Ruling 4; canonical-articulation pointer expanded to two documents (SFDI + SADI together). Shipped in commit `b2ad01e` as Phase 3 Item 1.
- **SADI per-field content-design walks** done (cross-cutting upstream of C3 and the MPS Draft prompt) — overview blockquotes + Q-framings + Eph 2:1–5 worked example outputs in pastor-to-people voice for MPT, MPS, Intro, and Conclusion. Shipped in commit `b2ad01e` as Phase 2.
- **A2.1 next** — indented sentence canvas component (Tab/Shift+Tab indent semantics, line-number gutter, level-0 visual marker), landing against A2.0's stable storage shape.

A1's substrate (storage shape, spotlight UX, N/A escape valve) is in place across all four sub-phases. A2.0 is the data-layer foundation. The visible UX work for structured-exercise components (canvas, paraphrase blocks, synthesis table) starts at A2.1. The C-milestone landings — C1, C3, C5, C6 — and the SADI per-field walks shipped against this substrate; what remains structurally on SPRD is C2 (throughline visualization), C4 (Background series-level inheritance), and the workspace tour rewrite.

---

## What full SPIP will cover

When SPRD and SADI finish and SPIP gets developed in earnest, the document will carry:

- **Per-milestone breakdown** for every entry in SPRD's A/B/C table — what sub-items the milestone breaks into, what each one ships, what depends on what.
- **Recommended sequence** within each milestone — which sub-item to land first, which can run in parallel, which gates the next.
- **Sized-commit recommendations** — what shape of commit each sub-item produces, so that no single change is too big to verify or revert safely. The pattern already in motion (one sub-item per commit, with a sub-item being a focused unit of work) will likely become the explicit recommendation.
- **Verification gates per sub-item** — what test passes, what manual check holds, what visible behavior confirms the sub-item is real before moving on.
- **Speed/safety tradeoffs** — where the plan recommends a slower path because the faster one risks regression, and where the plan recommends a faster path because the safety concern is small.
- **Deferral and reordering protocol** — how to handle a sub-item that turns out to be premature (the A1.2 precedent), so the plan stays usable when reality diverges from what was anticipated.
- **Cross-milestone touchpoints** — places where a B-milestone's work surfaces a question that should be answered in C-milestone planning, or vice versa.
- **Real-prep-cycle scheduling** — when to stop implementation and prep an actual sermon under the new shape, so qualitative friction surfaces while it's still cheap to fix.
- **Prescriptive form** — SPIP's per-milestone breakdowns are written as action plans, not descriptions. Source docs (SFDI / SPRD / SADI) stay descriptive — that's where the *why* lives. SPIP carries the descriptive → action translation once, in writing, where it can be audited. Pre-implementation surfaces translation ambiguity as findings that route back to source docs for tightening. Pairs with SPIR's Prescriptive coverage audit (marked for addition).
- **Pre-implementation audit pass** — a deliberate "stop, integrate, look for friction" phase before each initiative-braiding moment. Runs the doc-layer audits SPIR defines (Bucket D and applicable parts of Bucket A) against the integrated document set. Findings flow back into the source documents (SFDI / SADI / SPRD) for resolution *before* any implementation work begins on that braiding. Likely fires more than once. **First-cut development of this section follows below.**

---

## Pre-implementation audit pass

This is the first concrete piece of full SPIP being written ahead of the rest. It earns priority because the failure mode it guards against — friction across SFDI, SADI, and SPRD that only surfaces when the initiatives braid together at the implementation layer — is the most expensive class of failure to catch late, and the cheapest to catch early. Everything else in SPIP can wait for SPRD finalization without compounding cost. This can't.

### What the gate does

Before a piece of work that braids two initiatives together for the first time, the pre-implementation audit pass runs a deliberate sweep across the document set looking for friction the implementation will otherwise hit. Vocabulary that drifted between initiatives. Handoffs that look right in one document but don't carry across the seam. Decisions in one initiative that quietly contradict decisions in another. Process Contracts written with one initiative in view that don't bind cleanly when another's content lands.

The gate's job is to surface this friction at the doc layer — where a fix is a doc edit — instead of at the implementation layer, where the same fix becomes a rename plus a migration plus test updates plus user-facing relabeling.

The gate is not trying to catch every possible problem. It is trying to catch the integration-class problems that no single-initiative review can see.

### When it fires

Three firing points anticipated. SPIP will bind each one to specific milestone numbers once SPRD and SADI finalize.

**Firing 1 — after SPRD and SADI both reach their own completion, before B1 starts.** This is the largest firing. SFDI content meets SPRD shell here at the implementation layer for the first time. Every Bucket D audit runs; every applicable Bucket A audit at the doc layer runs; the gate is the most demanding.

**Firing 2 — fired implicitly inside `b2ad01e` (2026-05-04).** SADI Step 5 per-field content (Intro + Conclusion overview blockquotes, Q-framings, Eph 2:1–5 worked outputs) and SPRD C3 shell (STAGE.Frame, `sermon_frame` JSON column, `FrameTab`, composite Frame → Manuscript gate) braided atomically in one commit rather than sequentially. In-author informal checks substituted for the formal doc-layer audit pass; the work shipped clean — 373 vitest green, `sweep-the-house` PASS, 15 new contract tests on the Frame surface, `node --check` clean on electron files. **Retrospective lesson for Firing 1.** When content and shell ship in one commit, formal Firing 2 isn't separable from the build itself; the audit value comes from `sweep-the-house` at the implementation layer plus the contract test suite. Firing 1, however, will not have that escape: B1 is much larger than C3 + MPS combined, the integrated scope spans every Bucket D audit, and the Standards to Build (per-doc ownership declaration; canonical vocabulary glossary; Bucket C checklists) don't yet exist. Firing 1 must be a formal, documented pass. The atomic-braiding pattern that worked for Firing 2 will not work for Firing 1.

**Firing 3 — fired implicitly inside `b2ad01e` (2026-05-04).** Same atomic-braiding shape as Firing 2. SADI Step 2 per-field content (MPT + MPS overview blockquotes, Q-framings, Eph 2:1–5 worked outputs) shipped together with the MPS Draft prompt rewrite (Phase 3 Item 2 of `b2ad01e` — three per-question prompts Q1 Translate / Q2 Drift / Q3 Tighten replacing the WITH_PC/NO_PC pair, with PC scaffolding fully retired from the MPS draft path). The "skip option" the original entry named — Step 2 small enough that integration friction is genuinely unlikely — turned out to be the operative case; the rewrite was small, well-scoped, and shipped clean alongside the content walks. The same retrospective lesson applies: this pattern does not transfer to Firing 1.

### What runs in each firing

The full audit roster lives in SPIR's audit plan section. The pre-implementation pass is a curated subset of that roster, applied to the doc layer.

| Audit | Firing 1 | Firing 2 | Firing 3 |
|---|---|---|---|
| Vocabulary alignment (Bucket D) | Across full doc set | Scoped to SADI ↔ SPRD overlap | Scoped to SADI ↔ MPS Draft overlap |
| Boundary handoff (Bucket D) | Every initiative seam in the integrated scope | Step 4 ↔ Step 5 seam | n/a |
| Decision conflict (Bucket D) | Backward-looking across all docs | Forward-looking from SADI | Forward-looking from SADI |
| Doc-set drift (Bucket D) | Full | Full | Full |
| Process Contract braiding (Bucket D) | All six contracts against integrated scope | Scoped to Step 5's contract surface | Scoped to MPS Draft's contract surface |
| Change surface accumulation (Bucket D) | Initial baseline | Re-baseline | Re-baseline |
| Question key reference (Bucket A, doc layer) | Full | Scoped to Step 5's key set | Scoped to MPS Draft's key set |
| Cross-doc consistency (Bucket A) | Full | Full | Full |
| Backlog visibility (Bucket A) | Full | Full | Full |

The mapping is first-cut. It will be refined once SADI's content is in hand and the C-milestone shapes settle.

### Prerequisites — Standards to Build

Firing 1 cannot run convergently without the standards SPIR's audit plan section names as Standards to Build. Three are required before Firing 1:

1. **Per-doc ownership declaration** — each doc names which sections it owns vs. which it cites. Required by the Cross-doc consistency audit.
2. **Canonical vocabulary glossary** — one entry per shared term across SFDI / SADI / SPRD / SPIP / SPIR / `CORE.md`. Required by the Vocabulary alignment audit.
3. **Bucket C checklists** — four short checklists, one per Bucket C audit type, so the pastor's qualitative retrospectives are bounded-subjective rather than divergent.

A fourth standard — cumulative thought-unit table invariant rules — is required before B2, not Firing 1, but the ruling work should be sequenced into the same window so it doesn't get lost.

Building the three Firing 1 standards is small work: a short ownership section appended to each doc; a glossary file with one entry per shared term; four short checklists for Bucket C. Without them in place, Firing 1's audits will diverge — the model will keep generating new findings each run because the criteria are undefined. With them in place, the audits terminate on a definite check.

### Procedure

A pre-implementation audit pass runs in three phases.

**Phase 1 — gather.** All planning documents (SFDI, SADI, SPRD) and operational documents (SPIP, SPIR, CHANGELOG, ENFORCEMENT_STATUS.md, CORE.md) are loaded as the working set. The current implementation snapshot from SPIP is included so the audit knows what has already shipped.

**Phase 2 — run.** Audits run in parallel where they don't depend on each other. The `drift-sweep` skill covers vocabulary alignment, doc-set drift, and cross-doc consistency directly. The other Bucket D audits — boundary handoff, decision conflict, Process Contract braiding, change surface accumulation — are invoked through investigation agents (the `agents` and `run-agent` skills) or run manually against the doc set. Question key reference at the doc layer is a focused search against the canonical source of question definitions. Backlog visibility is a sweep of every "deferred," "TBD," and open-ended marker across the doc set.

**Phase 3 — surface and route.** Findings are collected. Each finding names: which audit surfaced it; which document(s) the friction lives in; what the conflict or drift actually is. Findings route back to the source documents — not to SPIR. The fix is a ruling in SFDI, SADI, or SPRD as appropriate. SPIR is for what surfaces during execution, not what the gate catches before execution.

### Pass criteria

The gate clears when every finding has been ruled. *Ruled* means one of three:

1. **Fixed.** The drift, conflict, or inconsistency was real and the source document has been edited to resolve it.
2. **Accepted.** The finding was real but the resolution is to accept the difference and document why. (Vocabulary divergence that turns out to be intentional, for example.) The acceptance is recorded in the relevant doc.
3. **Deferred with a name.** The finding is real but addressing it now would expand scope unacceptably. The deferral is recorded with explicit ownership and a trigger condition for picking it up later.

The gate does not clear on unresolved findings. It also does not clear on "we'll come back to this" — every finding gets one of the three resolutions above.

### Findings flow

Pre-implementation audit findings flow back into the source documents (SFDI / SADI / SPRD) where the friction lives. SPIR is reserved for what surfaces during and after implementation. SPIR's audit plan section names this division as the one exception to the general rule that audit findings become SPIR entries.

### Tooling leverage

What's covered today, what's manual, what to build.

- **`drift-sweep` skill.** Covers vocabulary alignment, doc-set drift, and cross-doc consistency directly. Run as the first audit in every firing.
- **`agents` and `run-agent` skills.** For parallelizing boundary handoff, decision conflict, and Process Contract braiding audits when they don't share state. Each audit runs as a focused read-only agent against a defined slice of the doc set.
- **`interrogate` skill.** For surfacing findings that need root-cause investigation. Use when an audit reports "these two things disagree" and the resolution requires understanding the history.
- **`anchor-update` skill.** For applying ruling fixes back to SFDI / SADI / SPRD when the audit surfaces a real change to a load-bearing doc. Its per-section diff approval and immediate-commit discipline is exactly what the gate's "fix" resolution needs.
- **`sweep-the-house` skill.** Covers Process Contract enforcement at the implementation layer; less directly relevant pre-implementation, but a reference for what the equivalent doc-layer check needs to verify.
- **Manual sweep.** For backlog visibility (find every "deferred," "TBD," and open-ended marker across the doc set) and change surface accumulation (which is more judgment than mechanical check).
- **No new tooling required for Firing 1.** The combination of existing skills plus manual passes covers what the first firing needs. If subsequent firings reveal a recurring audit shape that would benefit from dedicated tooling, build at that point — not speculatively.

### What this section commits to

The gate's existence, its firing points, its audit roster (in first-cut form), its procedure, and its pass criteria. It does not commit to specific findings, specific remediations, or specific milestone numbers until SPRD and SADI finalize. When SPRD reaches full completion, this section gets re-read and refined: firing-point timing gets bound to specific milestone numbers; the audit roster gets sharpened against actual SADI content; the procedure gets updated if any audits turned out to need new tooling.

---

## When to develop this further

Two triggers, one of which has partially fired.

1. **SPRD reaches its own full completion.** Originally this required SADI's content walks to finish and SPRD to absorb that content into its C3 and C5 entries. The SADI portion has fired — per-field content-design walks for all four anchor fields landed in `b2ad01e`, and SPRD absorbed that content into C3 (Sermon Frame elevation) and into the MPS Draft portion of C5 in the same commit. What remains for full SPRD completion: C2 (throughline visualization), C4 (Background series-level inheritance), and the workspace tour rewrite. When those land, SPIP can be developed end-to-end without parts being guesses.
2. **A2 sub-items finish.** A2.1, A2.2, and any further sub-items SPRD spec's out give SPIP a concrete pattern to recommend for B1's structured-exercise work (Field 4's three-question composite gate is the precedent).

Either trigger by itself opens a partial SPIP development pass. Both together open the full development.

---

*End of SPIP scaffold.*
