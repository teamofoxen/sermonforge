# Study Redesign Implementation Anchor (SRIA)

**Status:** Created 2026-05-04. Living re-entry point for the Study redesign work; updates as the work moves.

---

## What this is

The Study redesign reshapes how sermon prep flows through SermonForge. Today the four sub-phases of Study read like four worksheets stapled together — Observe, Interpret, Redemptive Thread, Implications each ending with a stack of answers but nothing carrying through to the next. After the redesign, the four flow as one deepening exegetical work: each sub-phase produces a named outcome, and the next sub-phase opens against it. MPT and MPS stop being improvised because they rest on substance the pastor wrote themselves. Intro and Conclusion become their own workspace step, not loose pieces tucked into Manuscript.

SRIA is a short re-entry point. When the five planning docs feel like a lot, start here. SRIA points into them; it does not restate them.

---

## Working rule

> **Plain English. No dev speak. Every channel — chat, docs, commits, agent prompts — for the entire implementation arc. The audience is the pastor-user.**

This is binding for the duration. SPIR's Bucket E plain-language drift audit is the formal check on this rule; it runs in Phase 0 of every pre-implementation audit pass and on any planning-doc update. Drift gets caught and rewritten before the gate clears.

---

## Doc map

Five docs sit under SRIA. Each owns a different layer of the work.

- **SFDI** ([study-field-definition-initiative.md](study-field-definition-initiative.md), charter at [sfdi-charter.md](sfdi-charter.md)) — the content of every Study field (Step 1).
- **SADI** ([sermon-anchor-definition-initiative.md](sermon-anchor-definition-initiative.md), charter at [sadi-charter.md](sadi-charter.md)) — the content of the four sermon anchor fields: MPT, MPS, Intro, Conclusion (Steps 2 and 5).
- **SPRD** ([study-phase-redesign.md](study-phase-redesign.md)) — the structural redesign of Study and the milestone framing.
- **SPIP** ([study-phase-implementation-plan.md](study-phase-implementation-plan.md)) — how the building happens.
- **SPIR** ([study-phase-implementation-remediation.md](study-phase-implementation-remediation.md)) — what could go wrong, plus the audit plan that catches it.

---

## Where things stand right now

Trust per-field content over top-level status headers. Some headers lag what's already shipped.

- **SFDI** — complete. All four sub-phase walks finished 2026-05-04. See [SFDI working doc](study-field-definition-initiative.md) for per-field content.
- **SADI** — ratified plus per-field content-design walks for all four anchor fields, all landed 2026-05-04 in commit `b2ad01e`. The top-level status headers in both SADI files lag this; the per-field entries are the truer state. See [SADI working doc](sermon-anchor-definition-initiative.md).
- **SPRD** — substantially shipped to main 2026-05-04. SPRD's "Remaining work" paragraph is stale; trust [SPIP](study-phase-implementation-plan.md)'s milestone snapshot for what's actually done. Real remaining: C2 throughline visualization, C4 Background series-level inheritance, workspace tour rewrite.
- **SPIP** — scaffold plus one developed section (Pre-implementation audit pass). Full per-milestone development waits on SPRD's remaining milestones. See [SPIP](study-phase-implementation-plan.md).
- **SPIR** — scaffold plus full audit-plan section (Buckets A through E). Eight risk categories captured. See [SPIR](study-phase-implementation-remediation.md).

---

## The arc, end-to-end

The canonical sequence, start to finish. Where we currently are within it lives in the next section.

1. **Pre-implementation readiness gate** — build the three standards (per-doc ownership declaration, canonical vocabulary glossary, Bucket C checklists). This is where things stand right now.
2. **Firing 1** — the formal pre-implementation audit pass. Runs in four phases internally: Phase 0 (Bucket E ingestion-optimization audits — get the doc set in shape), Phase 1 (gather), Phase 2 (run audits), Phase 3 (surface and route findings). Findings flow back into SFDI / SADI / SPRD, not into SPIR.
3. **A milestones** — the new Study UX foundation (spotlight rendering, structured-exercise primitives, per-question storage shape).
4. **B milestones** — the four sub-phase reshapes, one phase at a time (B1 Observe → B2 Interpret → B3 Redemptive Thread → B4 Implications).
5. **C milestones** — workspace polish (sermon-level takeover, throughline visualization, Step 5 elevation, Background series-level inheritance, AI prompt updates, per-boundary thresholds).
6. **Post-implementation prep cycles** — Bucket C qualitative retrospectives the pastor runs after real sermon prep under the new shape. The qualitative bet on "the throughline feels earned" gets tested here.

---

## Pre-implementation readiness gate

The only section here with concrete "do this next" items. Four things, in this order.

### The three Standards to Build

These can be built in any order or in parallel. Once all three land, Firing 1 runs.

**1. Per-doc ownership declaration.** A short section appended to each planning doc (SFDI, SADI, SPRD, SPIP, SPIR, SRIA) naming which topics that doc owns and which it cites from elsewhere. Without this, the Cross-doc consistency audit has no way to tell when a section is restating someone else's content vs. owning its own. Small piece of work — one short section per doc. Spec: [SPIR § Standards to build](study-phase-implementation-remediation.md#standards-to-build) #1.

**2. Canonical vocabulary glossary.** One file at `docs/REFERENCE/vocabulary.md` with one entry per term shared across the planning docs (field, sub-phase, named outcome, handoff, throughline, Pastoral Context, and so on). Each entry names the term, its meaning, the doc that owns it, and any intentional variants. Without this, the Vocabulary alignment audit can't tell drift from intentional difference. Small piece of work — one new file. Spec: [SPIR § Standards to build](study-phase-implementation-remediation.md#standards-to-build) #2.

**3. Bucket C checklists.** Four short checklists, one per Bucket C audit (throughline-felt-earned, removed-affordance, gate-feel, component-friction). Each checklist carries the questions the pastor answers after a real sermon prep cycle. Without these, the qualitative retrospectives drift each time and don't terminate. Small piece of work — four short checklists. Spec: [SPIR § Standards to build](study-phase-implementation-remediation.md#standards-to-build) #3.

### Firing 1 — the formal pre-implementation audit pass

Once the three standards land, Firing 1 runs. It moves through four internal phases:

- **Phase 0 — optimize ingestion.** Run Bucket E audits (length, section weight, redundancy, historical preservation, navigation, plain-language drift) on the doc set. Get the substrate in shape before harder audits run on top of it. Phase 0 closes when Bucket E passes.
- **Phase 1 — gather.** Load all planning and operational docs as the working set.
- **Phase 2 — run.** Bucket D audits run in parallel where possible (vocabulary alignment, boundary handoff, decision conflict, doc-set drift, Process Contract braiding, change surface accumulation), plus the Bucket A doc-layer audits (question key reference, cross-doc consistency, backlog visibility).
- **Phase 3 — surface and route.** Findings consolidate. Each finding routes back to the source doc (SFDI / SADI / SPRD) where the friction lives, not into SPIR.

Full procedure: [SPIP § Pre-implementation audit pass](study-phase-implementation-plan.md#pre-implementation-audit-pass).

---

## What's done / in-flight / next

| Surface | State | Pointer |
|---|---|---|
| SFDI walks; SADI walks; SPRD A0 / A1 / A2 / B-series / C1 / C3 / C5 / C6; CORE.md Process #6 update; MPS prompt rewrite; SPIP/SPIR scaffolds | Done | [SPIP § Current implementation snapshot](study-phase-implementation-plan.md#current-implementation-snapshot-2026-05-04) |
| Pre-implementation readiness gate — building the three Standards | In-flight | [SPIR § Standards to build](study-phase-implementation-remediation.md#standards-to-build) |
| Firing 1 audit pass, then C2 throughline visualization + C4 Background series-level inheritance + workspace tour rewrite | Next | [SPRD § Implementation milestones](study-phase-redesign.md#implementation-milestones-abc-structure) |

---

## Where agents help

The single biggest leverage point is Firing 1 parallelization. SPIR names twelve audits that run during Firing 1 — six Bucket D plus six Bucket E in Phase 0 — and most of them can run as parallel investigation agents:

- **Bucket D (six):** vocabulary alignment, boundary handoff, decision conflict, doc-set drift, Process Contract braiding, change surface accumulation.
- **Bucket E in Phase 0 (six):** length and load-cost, section weight, redundancy, historical preservation, navigation, plain-language drift.

Each agent gets a defined slice of the doc set and reports its findings; findings consolidate into one review at Phase 3. This turns Firing 1 from a sequential read-everything-yourself pass into a parallel sweep.

The other place agents pay off: per-milestone regression investigation. When the tests pass but a Bucket C retrospective surfaces friction in real prep, an agent can dig into the surface that produced the friction without burning your context.

Reach for `/agents` to plan an investigation, `/run-agent` to execute one.

---

## Skills the implementation will lean on

- **`/anchor-update`** — every change to SFDI, SADI, SPRD, SPIP, SPIR, SRIA, or any other doc on the registry.
- **`/drift-sweep`** — periodic doc consistency checks. Covers Bucket E plain-language drift directly, plus part of the redundancy audits.
- **`/sweep-the-house`** — pre-commit gate on code-touching commits per [CLAUDE.md](../../CLAUDE.md).
- **`/sweep-the-multiverse`** — monthly comprehensive audit during this initiative.
- **`/end-session`** — every commit.
- **`/interrogate`** — deep dive on a single function or flow when something misbehaves.
- **`/agents` and `/run-agent`** — Firing 1 parallelization plus per-milestone investigations.
- **`/loop`** — recurring post-prep retrospectives if useful.

---

## I'm lost — where do I start?

- Stuck on a milestone → [SPIP](study-phase-implementation-plan.md).
- Something broke or surfaced friction → [SPIR](study-phase-implementation-remediation.md).
- Questioning content → [SFDI](study-field-definition-initiative.md) (Study fields) or [SADI](sermon-anchor-definition-initiative.md) (sermon anchor fields).
- Questioning structure → [SPRD](study-phase-redesign.md).
