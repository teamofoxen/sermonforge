# Study Phase Implementation Remediation (SPIR)

**Status:** Started 2026-05-04. Initial scaffolding only. SADI's per-field content-design walks for all four anchor fields landed 2026-05-04 in commit `b2ad01e`, alongside SPRD C3 (Sermon Frame elevation) and the MPS Draft prompt rewrite — closing the sequencing gap originally captured here as anticipated risk 7. Full development still happens in tandem with SPIP, with anticipated risks captured now and surfacing risks added during implementation. SPIR keeps growing until the last milestone of the implementation ships.

**Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Written in plain language, no engineering vocabulary required.

**Date started:** 2026-05-04.

---

> **Documentation agreement is the prerequisite for smooth implementation.** SPIP and SPIR exist to lock that agreement in place before the code work begins. SPIP is the plan side — how the building happens. SPIR is the safety-net side — what could go wrong and what to do about it. Both serve the same underlying point: you don't build cleanly on top of docs that disagree with each other.

---

## What SPIR is for

The Study phase redesign is large, structurally ambitious, and bets heavily on a qualitative pedagogical claim — that the throughline will *feel earned* when the pastor walks through the redesigned Study phase. Many things will go wrong. Some are predictable now; others won't surface until real sermon prep happens under the new shape.

SPIR is the document that catches them and routes them to fixes.

For each anticipated or surfacing risk, SPIR carries:

- **What the risk is** — described in pastor-facing terms, not engineering terms.
- **How it would show up** — what the pastor or the test suite would actually see.
- **What triggers it** — which milestone or sub-item exposes the risk.
- **The remediation** — what to do when it surfaces, or before it surfaces.
- **Status** — anticipated, surfaced, fixing, or fixed.

SPIR is a living document during execution. New entries get added as friction appears.

---

## Relationship to SPIP

SPIP says *how the building happens*. SPIR says *what could go wrong with that building, and what to do about it*. The two documents are siblings — neither owns the other.

SPIP's per-milestone verification gates name the things that *must hold* before advancing. SPIR's entries name the things that *might break* and what to do when they do. The line between them is which side of "the gate is met or not" you're on.

When SPIP recommends a slower or safer path, the reason often lives in SPIR — "this risk would surface if we landed faster, and it's not cheap to fix once it's in." Conversely, when SPIR records a surfacing risk that wasn't anticipated, SPIP's plan for the next milestone may need to absorb a new verification step.

---

## Why this document is small right now

Same one reason SPIP is small (down from two).

**One — SPRD is still being written.** Risks are partly a function of what's being built. C2 (throughline visualization), C4 (Background series-level inheritance), and the workspace tour rewrite remain. Until SPRD is locked, anticipated-risk entries against those surfaces are guessing at moving targets.

**Two — Real friction comes from real implementation.** Most of SPIR will be written *during* execution, not before. The pastor-prep cycles after each B-milestone are where the qualitative risks surface; the test suite after each sub-item is where the structural risks surface. Pre-implementation SPIR can capture categories of risk and a few obvious specifics, but the bulk of the document writes itself as the work happens. (The SADI gating reason that originally co-existed with these two has dissolved — SADI's per-field walks landed in `b2ad01e`.)

The right move is: capture the anticipated risk categories now (this document); add specifics and surfacing risks as SPRD finalizes and as implementation proceeds.

---

## Anticipated risk categories (preliminary)

Eight categories captured during the SPIP/SPIR planning conversation, 2026-05-04. Each is a placeholder for full development — when SPIR develops in earnest, each category becomes one or more entries with the full structure described above.

**1. The qualitative bet on "the throughline feels earned."** This is SPRD's central pedagogical claim. Only verifiable by real sermon prep under the new shape. Specific risks within: the spotlight feels claustrophobic; "Next question" reads as punitive; the pre-field overview reads as a wall before work; paste-intercept frustrates when the pastor legitimately wants to bring outside notes; per-cell no-AI feels like the app policing the pastor.

**2. Habit retraining the pastor is imposing on themselves.** Binding Decision 4 retires the MPT/MPS four-phase synthesis with no replacement. The bet is that the four named outcomes plus the cumulative thought-unit table carry the substrate without it. If they don't, MPT/MPS opens unmoored — a behavior-change loss before the named-outcome substrate registers as a gain.

**3. Storage-shape edge cases.** The new per-question envelope, structured-list values, and the shape of saved data need to be robust at the edges — partial saves, mixed shapes, and unforeseen old data triggering the defensive `legacy_notes` path. The `legacy_notes` fallback exists today as preservation infrastructure; if it ever fires unexpectedly, debugging will be brutal without a real test in place.

**4. Cumulative thought-unit table data integrity.** Six columns by Phase 4, read-only upstream rendering, after-line autocomplete depends on canvas line numbers. Open questions that have not yet been ruled: row identity across phases, deletion cascade behavior (if a row is removed in Phase 1 after Phase 2 wrote `meaning` for it, what happens?), line-number refresh propagation when canvas content changes mid-flow.

**5. AI prompts silently failing on key drift.** As B-milestones rename and reshape question keys, prompts that read those keys could receive empty data and generate vaguely-plausible output against nothing. Silent failure mode — no crash, no error, just bad output that looks fine until read critically.

**6. Composite gate UX.** Field 4's three-question composite gate is the first precedent. The hover-checklist on the disabled gate is the load-bearing affordance — if it doesn't communicate clearly which sub-gate is blocking, the gate feels like obstruction rather than guidance. Each subsequent heavy-lifting field with a composite gate inherits the same risk.

**7. Sequencing gaps that make the workspace feel incomplete (closed 2026-05-04).** Originally: C3 (Step 5 as its own workspace step) was gated on SADI's Step 5 walk; even after B4 shipped, intro and conclusion would remain bundled into Manuscript until SADI finished. **Closure:** SADI's Step 5 per-field walks (Intro + Conclusion) and SPRD C3 (Sermon Frame elevation between Blueprint and Manuscript) landed atomically in commit `b2ad01e` (2026-05-04). The Sermon Frame stage carries Step 5's named outcome — the Sermon Frame itself — into its own workspace step rather than leaving Intro and Conclusion bundled into Manuscript. The interval-of-incompleteness this risk anticipated never materialized. Kept on the list as a closed entry for traceability; future SPIR development may surface a *different* sequencing-gap risk against the C2 / C4 / workspace-tour-rewrite surfaces that still remain on SPRD, and that would be its own entry.

**8. PC card removal at B4.** The card stops rendering, but the three top-level columns (`background_noise`, `audience_assumptions`, `topic_theme`) stay in the schema. Anything else in the codebase that reads those columns — AI prompts, exports, Study Guide generation — becomes an orphan reader and needs a sweep at the B4 cut.

These are categories, not entries. Full SPIR development turns each category into one or more entries with the structure described in "What SPIR is for" above.

---

## Remediation already in motion

A few patterns the implementation has already adopted that pre-empt categories of risk. Captured here so SPIR doesn't double-count them as gaps.

- **Test discipline at sub-item granularity.** A2.0 landed with 28 new tests; 197 vitest total green. Storage-shape edges are being actively covered, not assumed safe. This blunts category 3 substantially.
- **Deferral when a sub-item is premature.** A1.2's hover-checklist was deferred when single-question fields turned out to collapse to the trivial case. Pattern: don't build UX for problems that don't yet exist; pick it up when the conditions that need it land. This is a remediation pattern in its own right — speculative work that doesn't apply yet is itself a risk.
- **Defensive-only migration policy.** No production sermons exist 2026-05-04, so migration logic isn't being shipped. The `legacy_notes` fallback in `parseStructuredField` is enough to handle unforeseen legacy data without per-key mapping code being written. Section 9 of SPRD documents how migration would work as defensive reference.
- **Sub-item scoping.** Each milestone breaks into numbered sub-items (A1.0, A1.1, A1.2, A1.3, A2.0, A2.1, …) with one commit per sub-item. This keeps the unit of work small enough to verify and revert safely.

These are starting examples. Full SPIR will collect them all and add new ones as patterns emerge.

---

## Audit plan

This section names the kinds of audits SPIR uses to catch risks before they ship and after they surface. The framing is verb-side — *what each audit does to the content* — without yet enumerating *what content it does it to*. Specific targets (which keys, which prompts, which milestones) get filled in when SPIP develops the per-milestone plan.

Audits cluster into five buckets. The first three catch failures inside one initiative's surface. The fourth catches failures *between* initiatives — where SFDI, SADI, and SPRD braid together and friction accumulates at the seams. The fifth catches failures of the doc set itself as a working surface — size, weight, redundancy, navigability, and voicing — so the audits in the other four buckets have a healthy substrate to run against.

**Every audit checks against a fixed external reference.** This is the discipline that keeps the audit plan from becoming a divergent loop where the model keeps generating new findings each time it runs. Each audit names: what it checks (the operation), what *standard* it checks against (the external reference), and what *done* looks like (when the check terminates).

Audits without a fixed reference are explicitly tagged as **bounded-subjective** — run by the pastor against a fixed checklist on a fixed cadence, not by the model in an open-ended loop. The two valid shapes are: *checks against [external reference], terminates when all checks pass* or *subjective judgment by the pastor against a fixed checklist, run once per firing*. Audits that fit neither shape do not belong in the audit plan.

Some standards exist already in docs we've written (the binding decisions in SPRD; the per-field walks in SFDI; the Process Contracts in `CORE.md`). A few need to be built before the audits that depend on them can run. The "Standards to build" subsection below names those.

### Bucket A — Static audits

Run against the code and the document set. Cheap, fast, often automatable. Catch silent failures that won't show up in normal use.

- **Question key reference audit.** Verifies that every question key referenced in the running system points to a key that exists in the canonical source of truth. Catches the silent-failure mode where a renamed or moved key feeds an empty value into a downstream consumer.
  *Standard:* the canonical question definitions (`src/utils/studyFields.js` for code; SFDI per-field entries for the doc layer). *Done when:* every reference in the audited surface resolves to an existing key, or every unresolved reference has been ruled.

- **Prompt assembly snapshot.** Captures what each AI prompt actually receives — resolved keys, resolved field content — at the moment of assembly. Catches drift between what the prompt is supposed to consider and what it actually sees.
  *Standard:* a baselined snapshot per prompt, captured the first time the prompt is exercised against known input. *Done when:* every prompt's current snapshot matches its baseline, or every diff has been ruled.

- **Orphan reader audit.** When a milestone retires a data surface, sweeps the codebase for any remaining readers of that surface. Catches the case where the visible removal succeeds but consumer code still depends on the removed surface.
  *Standard:* the named list of retired data surfaces for the milestone in question. *Done when:* every surface on the list returns zero remaining readers.

- **Process Contract enforcement audit.** Verifies that every state-changing path routes through the central save-and-check logic and that no AI write paths bypass it. Catches the case where a new path silently sidesteps the contracts.
  *Standard:* the Process Contracts in `CORE.md` plus current state in `ENFORCEMENT_STATUS.md`. *Done when:* every state-changing path has been checked against every relevant contract.

- **Cross-doc consistency audit.** Verifies that the planning and operational documents reflect what's actually shipped. Catches drift between recorded and real state.
  *Standard:* a per-doc declaration of which sections are owned (source of truth) vs. referenced (cite the owner). Owned sections may differ; referenced sections must match the owner's content. *Done when:* every referenced section matches its owner's current text. (The per-doc ownership declaration is a Standard to Build — see below.)

- **Backlog visibility audit.** Verifies that every deferred sub-item is tracked and findable. Catches items that quietly disappeared into the gap between "we'll come back to that" and the document of record.
  *Standard:* every "deferred," "TBD," "open question," or "later" marker across the doc set must point to an entry in a tracked backlog. *Done when:* every marker resolves; orphan markers are either deleted (resolved) or backlogged.

### Bucket B — Runtime and data audits

Run against the running app, test data, or actual sermons. More expensive than Bucket A but catch behavioral and data-shape failures that static checks can't see.

- **Storage-shape audit.** Verifies that every saved value parses to its expected envelope or structured shape. Catches partial-save corruption and shape drift.
  *Standard:* the declared envelope shapes (per-question `{value, na}`; structured-list shapes for canvas, paraphrase, synthesis table). *Done when:* every saved value parses cleanly under its declared shape.

- **Data structure integrity audit.** For data structures with cross-instance invariants — shapes that span multiple records or phases — verifies the invariants hold. Catches the integrity-failure mode where individual records look fine but the structure as a whole is incoherent.
  *Standard:* the invariant rules for each cross-instance structure. (For the cumulative thought-unit table, the rules need to be ruled — see anticipated risk 4. Until then, this audit cannot run convergently.) *Done when:* every instance of the structure satisfies every named invariant.

- **Gate behavior audit.** Verifies that gates fire when expected, that disabled-gate affordances surface the blocking reason, and that escape valves track per the unit they're scoped to. Catches gates that feel arbitrary or that don't communicate clearly when blocked.
  *Standard:* the gate specs in SFDI per-field entries plus the spotlight UX spec in SPRD. *Done when:* every named gate behaves as specified under both trigger and non-trigger conditions.

- **Defensive path audit.** Verifies that any defensive code path has at least one test that actually exercises it. Catches the case where defensive code is present but never run, then fails when finally triggered.
  *Standard:* the list of code paths tagged as defensive (e.g., the `legacy_notes` fallback in `parseStructuredField`). *Done when:* every tagged path has at least one passing test that exercises it under realistic input.

### Bucket C — Qualitative audits

Run via real sermon prep cycles. The pastor is the instrument. The most expensive audits per run, but the only ones that can catch the qualitative pedagogical risks SPRD's design bets on. **All Bucket C audits are bounded-subjective by design.**

- **Throughline-felt-earned retrospective.** After a full prep cycle through the redesigned phase, the pastor records whether the work was felt as a deepening single arc or as separate worksheets. Catches the central pedagogical risk.
  *Standard:* bounded-subjective. Pastor judgment against a fixed checklist (e.g., "did each named outcome feel produced by the field-work that preceded it? did the handoff into the next sub-phase carry the prior outcome forward?"). Run once per prep cycle; not LLM-driven. *Done when:* the pastor has recorded answers to the checklist questions. (The checklist is a Standard to Build before B1's first prep cycle.)

- **Removed-affordance retrospective.** When a milestone retires an affordance the pastor was used to, the pastor records whether the absence was felt as freedom or loss. Catches the habit-retraining risk.
  *Standard:* bounded-subjective. Pastor judgment against a fixed checklist per retired affordance. Run once per prep cycle following the retirement. *Done when:* checklist completed.

- **Gate-feel retrospective.** After a prep cycle that exercised a hard gate, the pastor records whether the gate felt like guidance or obstruction. Catches the case where a gate's intent and a gate's experience diverge.
  *Standard:* bounded-subjective. Pastor judgment against a fixed checklist per gate (clarity of blocking message, escape-valve usability, perceived legitimacy). *Done when:* checklist completed.

- **Component friction retrospective.** After a prep cycle that exercised a new structured component, the pastor records what felt smooth and what felt forced. Catches the friction risks specific to spotlight UX, structured-exercise components, paste-intercept, and per-cell no-AI policies.
  *Standard:* bounded-subjective. Pastor judgment against a fixed checklist per component. *Done when:* checklist completed.

### Bucket D — Integration audits

Run against the full document set and the integrated implementation. They catch what no single-initiative audit can catch — the friction that surfaces where SFDI, SADI, and SPRD braid together. The failure mode is delocalized (no single file is "wrong"; two initiatives don't agree) and the cost of catching it late is much higher than the cost of catching it early.

- **Vocabulary alignment audit.** Verifies that when the same concept appears in more than one initiative document, it uses the same word; when the same word appears in more than one document, it carries the same meaning. Where words differ, the difference is intentional and named. Catches drift across initiative vocabularies.
  *Standard:* a canonical vocabulary glossary covering all terms shared across SFDI / SADI / SPRD / SPIP / SPIR / `CORE.md`. Each entry: term, meaning, owning document, intentional variants (if any). *Done when:* every cross-doc use of every glossary term matches the glossary. (The glossary is a Standard to Build — see below.)

- **Boundary handoff audit.** At every seam where one initiative's ownership ends and another begins, verifies that what the upstream initiative produces is exactly what the downstream initiative expects to receive. Catches handoffs that look right in isolation but don't carry across the seam.
  *Standard:* the handoff specs in SFDI between-sub-phase passes plus SPRD/SADI step boundaries. *Done when:* every named seam's upstream output and downstream input match in shape, content, and naming.

- **Decision conflict audit.** When a later piece of work in one initiative would contradict an earlier decision in another, verifies that the conflict has surfaced and been ruled. Catches contradictions that sit silent in the docs until implementation hits them.
  *Standard:* the binding decisions list in each initiative document (SPRD's seven binding decisions; SFDI's per-walk rulings; SADI's eventual rulings). *Done when:* every later decision has been checked against every prior decision; conflicts are either reconciled or named (both decisions stand with explicit divergence).

- **Doc-set drift audit.** Across all initiative documents and operational documents, verifies that the recorded state matches. Catches drift that accumulates as the doc set grows.
  *Standard:* each doc's status section plus each doc's references to other docs. The audit checks: does the status match the content, and do all cross-references resolve? *Done when:* every status field matches the content it describes, and every cross-reference resolves to existing content.

- **Process Contract braiding audit.** Verifies that the Process Contracts continue to bind cleanly when content from all initiatives is integrated, and that no contract was silently broken by integration. Catches contracts drafted with one initiative in view that fail to cover another.
  *Standard:* the Process Contracts in `CORE.md`. *Done when:* every contract has been checked against the integrated scope; every named violation is either fixed or explicitly carved out.

- **Change surface accumulation audit.** Periodically identifies where one initiative's work is touching another initiative's territory often enough that a change in one place could break something in another. Catches integration hot spots before they bite.
  *Standard:* bounded-subjective. Pastor judgment against a fixed checklist (e.g., "which file has been touched by changes from more than one initiative this milestone? are the changes orthogonal or interleaved?"). Run once per phase-level milestone. *Done when:* checklist completed.

*Marker for full development — Prescriptive coverage audit.* To be added when SPIP develops its per-milestone prescriptive breakdowns. Verifies that every action item in SPIP traces bidirectionally to descriptive source content in SFDI / SPRD / SADI: every source section that calls for action has a corresponding SPIP action; every SPIP action traces back to a source section that justifies it. Catches both gaps (source content SPIP failed to translate) and over-prescription (SPIP making decisions no source content authorizes). *Standard:* the descriptive-to-prescriptive trace map between SPIP and the source docs. *Done when:* every entry in the trace map resolves in both directions.

### Bucket E — Ingestion optimization audits

Run against the doc set itself as a working surface. The risks Bucket E catches aren't about content correctness or content alignment — they're about whether the doc set is *shaped* in a way that the audits in Buckets A through D can actually run against efficiently. A bloated, redundant, or drifted doc set makes every audit above it more expensive and less reliable. **Bucket E runs in Phase 0 of every pre-implementation audit pass — before the audits in the other buckets begin — so they have a clean substrate to work with.**

- **Length and load-cost audit.** Verifies that each doc in the set is sized for its job — not so long that loading it dominates audit cost, not so short that it's missing load-bearing content. Catches the case where a doc grew past its useful size and now slows every downstream audit.
  *Standard:* a target size range per doc type (charter / working doc / planning doc / execution doc / remediation doc). *Done when:* every doc is within range, or every out-of-range doc has been ruled (split, condensed, or accepted with reason).

- **Section weight audit.** Verifies that every section in every doc is pulling weight — actively load-bearing for the doc's purpose, not legacy filler kept for politeness. Catches the case where a section has gone dead but lingers.
  *Standard:* bounded-subjective. Pastor judgment against a fixed checklist per doc (each section: is it referenced by something downstream? does it carry a decision, a definition, or a status that nothing else carries? would removing it break a known flow?). *Done when:* every section is either confirmed weight-bearing or removed/merged.

- **Redundancy audit.** Verifies that the same content isn't sitting in more than one doc when only one of them owns it. Catches drift where two docs carried the same idea, then one updated and the other didn't.
  *Standard:* the per-doc ownership declaration (one of the Standards to build below — once it exists, every cross-doc duplicate has a clear owner). *Done when:* every duplicated content fragment either resolves to a single owner with the others citing rather than restating, or has been flagged as intentional with reason.

- **Historical preservation audit.** Verifies that historical content kept for reference is clearly marked as such, and that nothing live is mixed into archival material. Catches the case where old context bleeds into current decisions because the boundary between "was true then" and "is true now" got blurred.
  *Standard:* explicit historical markers (status changes, dated archival sections, "as of YYYY-MM-DD" framing). *Done when:* every block of historical content carries an unambiguous "this is history" marker, and no live decisions live inside historical sections.

- **Navigation audit.** Verifies that a reader landing in any doc can find what they need without reading sequentially front-to-back. Catches the case where the doc grew but the entry points didn't keep up.
  *Standard:* bounded-subjective. Pastor judgment against a fixed checklist (table of contents present where length warrants? section headings predictable? cross-references resolve?). *Done when:* checklist completed.

- **Plain-language drift audit.** Verifies that the voicing rule — plain English, no dev speak, applicational framing for the pastor-user — has held. Catches the slow creep where a doc starts plain and ends academic, or where one section drifted into engineering vocabulary while the rest stayed plain.
  *Standard:* the voicing rule as recorded in the user's binding feedback (plain words; no academic/MBA tone; no engineering jargon as filler; no em-dash tic; applicational framing — "why does this matter for the pastor in SermonForge?"). *Done when:* every doc reads as one consistent pastor-facing voice. Failures get rewritten before the gate clears.

### Standards to build

The audits above reference standards. Most exist in docs we've already written; a small number need to be built before the audits that depend on them can run convergently.

**Required before Firing 1 of the pre-implementation audit pass:**

1. **Per-doc ownership declaration.** Each doc declares which sections it owns vs. which it cites — one short section per doc naming owned topics and referenced topics. Required by the Cross-doc consistency audit.
2. **Canonical vocabulary glossary.** One entry per shared term: term, meaning, owning document, intentional variants. Lives as its own doc (e.g., `docs/REFERENCE/vocabulary.md`). Required by the Vocabulary alignment audit.
3. **Bucket C checklists.** Four short checklists, one per Bucket C audit type. Each carries the specific questions the pastor answers in a prep retrospective. Required so Bucket C is bounded-subjective rather than divergent.

**Required before B2 (when the cumulative thought-unit table gains its second column):**

4. **Cumulative thought-unit table invariant rules.** Currently flagged as open in anticipated risk 4. Rules to define: row identity stability across phases, deletion cascade behavior, line-number refresh propagation. Required by the Data structure integrity audit.

These four are the only standards that don't already exist in some form. The other audits draw on standards already in `CORE.md`, SFDI, SPRD, or the codebase.

### When each bucket runs

A first cut at the trigger schedule. The triggers are typed; specific milestone instances get filled in when SPIP develops.

| Trigger | Audits |
|---|---|
| Per sub-item commit | Test discipline check; Bucket A audit relevant to the surface touched |
| Per main milestone finishing | Full Bucket A pass; Bucket B audits for surfaces touched |
| Per phase-level milestone finishing | Bucket A + Bucket B + Bucket E full pass + one Bucket C prep cycle |
| At a milestone that retires a data surface or an affordance | Orphan reader audit; relevant Bucket C retrospective on what was removed |
| When a planning document updates | Doc-set drift audit + Bucket E plain-language drift + length and load-cost |
| Before any sub-item that braids two initiatives' work for the first time | Vocabulary alignment + boundary handoff + decision conflict |
| Before a phase-level milestone | Process Contract braiding + change surface accumulation + Bucket E full pass |
| At any binding decision change | Decision conflict audit (forward and backward) |
| After all milestones ship | Comprehensive sweep + multiple Bucket C prep cycles |

### Findings flow

When a static, runtime, or integration audit fails — or when a qualitative retrospective surfaces friction — the finding becomes a fresh entry in SPIR with the standard structure (what / how it shows up / trigger / remediation / status). SPIR doesn't carry a separate findings log; every finding is a first-class entry, so the document remains the single place to look.

**One exception.** Pre-implementation audit findings — captured in the audit pass SPIP defines for the moments before initiative braiding begins — flow back into the source documents (SFDI / SADI / SPRD) where the friction was found, not into SPIR. SPIR catches only what the pre-implementation audit missed and surfaces during execution. Two funnels, one clean line between them.

### What's already in the toolbox vs. what we'll build

- A comprehensive sweep skill exists for the post-implementation full pass.
- A diff-focused sweep skill exists for the per-milestone backbone.
- A single-target deep-analysis skill exists for when a specific risk needs root-cause investigation.
- A doc-drift verification skill exists and covers part of the doc-set drift and cross-doc consistency audits, plus the Bucket E plain-language drift and partly the redundancy audits.
- Question key reference, prompt assembly snapshot, orphan reader, data structure integrity, gate behavior, defensive path, vocabulary alignment, boundary handoff, decision conflict, Process Contract braiding, and change surface accumulation audits don't have dedicated tooling. They'll be built as small focused checks when SPIP develops the per-milestone plan.
- Bucket E length and load-cost, section weight, historical preservation, and navigation audits are manual sweeps for now — judgment calls about doc shape that don't yet warrant dedicated tooling. Build only if the manual cadence stops being practical.
- Bucket C audits don't need tooling. They need a checklist and a habit.

### Where this section goes from here

This is a first cut, written before SPRD and SADI finalize. It captures the audit plan under current understanding. When SPRD reaches its full completion and SPIP develops in earnest, the audit plan gets refined: specific targets get filled in, pass/fail criteria get sharpened, and the schedule gets bound to specific milestones.

Until then, the four buckets, the trigger schedule, and the findings flow are the working frame. New audit types may be added as SPIP development surfaces them; existing types may be merged or refined.

---

## What full SPIR will cover

When SPIP develops in earnest and execution proceeds, SPIR will carry:

- **One entry per anticipated risk** with the full structure (what, how it shows up, trigger, remediation, status).
- **Surfacing risk entries** — risks that appear during a sub-item that weren't anticipated, captured as soon as they surface so the remediation has a record.
- **Cross-cutting patterns** — recurring risk shapes that SPIP can preempt by recommending a different sequence or a new verification step.
- **Post-prep retrospective entries** — qualitative risks the pastor surfaces after a real sermon prep cycle through the redesigned phase. These are the entries SPIR exists most centrally to catch.
- **Resolution notes** — what was done when each risk was real, so the pattern is reusable next time the same shape of risk appears.

---

## When to develop this further

In tandem with SPIP. As SPIP turns each milestone into a concrete plan, SPIR develops the corresponding risk entries. As implementation surfaces real friction, SPIR captures it.

SPIR does not finish until the final SPIP milestone ships and the post-implementation prep cycles confirm the design holds.

---

*End of SPIR scaffold.*
