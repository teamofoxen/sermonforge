# Prompt for CC: SermonForge Architecture Fragility Audit and Remediation Plan

You are auditing the SermonForge sermon workspace architecture.

Context: SermonForge is a local-first desktop app for one pastor preparing expositional sermons. The workspace is not a general writing app, not a collaborative system, and not an AI sermon assistant. It is a guided sermon-preparation environment for one pastor under weekly pressure, with a passage open and a Sunday coming.

I believe the sermon workspace may be suffering from fragile architecture. I am giving you an architecture-fragility hypothesis document plus two prior UX/content audit reports. Your task is to confirm, dispute, refine, and plan remediation. Do not make code changes yet.

## Files to read first

Read these files in this order:

1. `docs/CORE.md` in full.
2. `docs/PASTORS-CHARTER.md`.
3. `docs/AUDITS/sermon-workspace-architecture-fragility-report.md`.
4. `docs/AUDITS/sermon-workspace-audit.md`.
5. `docs/AUDITS/redemptive-thread-implications-audit.md`.
6. Any workspace canon / system / reference docs that describe the sermon workspace, persistence, schema, field structure, navigation, map, completion, or threshold screens.
7. The relevant source files for:
   - sermon workspace shell
   - writing surface
   - start / handoff / finish threshold screens
   - map
   - reference pane
   - field definitions
   - walk order
   - state and completeness logic
   - persistence contracts
   - navigation and position logic
   - save / retry / error behavior
   - N/A behavior
   - destructive actions

The architecture-fragility report is a hypothesis document, not authority. Use it to guide what to inspect. Confirm, dispute, or refine it with evidence from the repo.

## Authority rules

- `docs/CORE.md` is the sole normative authority.
- `docs/PASTORS-CHARTER.md` is experiential guidance only. Use it as a lens for how the experience should feel, but do not treat it as law.
- Other docs explain, record, or implement CORE. They do not override CORE.
- If code disagrees with CORE, log that as architecture / doc / implementation drift. Do not silently let code override CORE.
- If two non-CORE docs disagree, classify the disagreement as doc drift and identify which one appears newer, more specific, or more aligned with CORE.
- Do not recommend or implement gates, blocks, locked navigation, progress requirements, or refusals of any kind. Completeness informs; it never blocks.
- Do not recommend or implement AI-generated sermon content, drafting assists, suggestions, auto-completion, or generated field answers. The system contains no author but the pastor.
- Do not recommend or implement celebration toasts, progress announcements, step narration, or noisy movement feedback. Movement should remain silent outside the three threshold screens: start, Study → Anchor handoff, and finish.
- Do not implement fixes until I approve a specific remediation batch.

## Primary question

Is the Sermon Workspace architecturally fragile? If so, how, where, and what should be remediated first?

## Working hypothesis to test

The workspace has a coherent product philosophy, but the implementation may be brittle at the seams where CORE, docs, field content, state shape, navigation, completion, persistence, and rendering meet.

The risk is not merely messy code. The risk is that small changes can cause the pastor to see the wrong vocabulary, land in the wrong place, receive a false completion signal, lose confidence that work is safe, or face prompts whose behavior no longer matches their words.

In particular, test whether the workspace relies on too many synchronized agreements:

- CORE vs Canon vs schema vs source comments
- field-level walk vs question-level contract
- multiple position columns plus `last_touched_position`
- multiple storage shapes under one writing surface
- completion rules split across composites, lenient checks, map state, handoff state, and Finish
- one large component coordinating load, save, navigation, thresholds, writing, export, and deletion
- content definitions that also carry behavioral rules

## Lens 1 — Authority and canonical source of truth

Check whether the workspace has one true source of authority for:

- stage names
- sub-phase names
- field names
- question names
- outcome names
- map state names
- completion artifacts
- threshold screens
- N/A semantics
- save/error semantics
- passage/reference-pane semantics

Look specifically for conflict among:

- `docs/CORE.md`
- `docs/PASTORS-CHARTER.md`
- workspace canon docs
- system docs
- reference/schema docs
- source comments
- runtime source code

For every conflict, classify it as one of:

- CORE/code drift
- doc/doc drift
- stale implementation comment
- stale schema/reference doc
- harmless explanatory mismatch
- pastor-facing inconsistency
- architecture concern with no current pastor-facing effect

Do not treat every drift item as a UX bug. Separate architectural drift from pastor-facing defects.

## Lens 2 — Completion architecture

Audit whether completion is centrally defined, consistently consumed, and truthful.

Inspect:

- composite check functions
- `deriveSermonCompleteness`
- map answered/partial/unanswered state
- Study → Anchor handoff completeness display
- Finish screen artifact review
- N/A handling
- field-level answered state
- synthesis-table completeness
- Observation Set / Divisions / Obvious Point relationship
- Anchor and Manuscript completion paths

Questions to answer:

- Is there one authoritative completion model?
- Do map, handoff, and finish consume the same truth?
- Are there lenient checks that contradict CORE?
- Are some completeness rules embedded in field copy or component-local logic?
- Could the pastor be told something is complete when a CORE load-bearing artifact is missing?
- Could the pastor be told something is missing when it has been satisfied another way?

## Lens 3 — Navigation and position architecture

Audit how the workspace knows where the pastor is.

Inspect:

- current stage
- current sub-phase
- last study/assembly/manuscript sub-phase
- last touched position
- threshold seen flags
- map jumps
- Back / Next behavior
- handoff jumps
- finish jumps
- start landing behavior
- reopen / resume behavior
- save-before-navigation behavior
- any spine, reducer, route, or position contracts

Questions to answer:

- Is there one canonical position model?
- Are there multiple overlapping position systems?
- Can renderer state clobber canonical position state?
- Are threshold flags coupled to field navigation in a brittle way?
- Could a pastor reopen in the wrong place?
- Could the map and writing surface disagree?
- Is “where am I?” always derivable in pastor-facing terms?

## Lens 4 — Persistence and local-first safety

Audit whether the pastor can trust that work is safe.

Inspect:

- debounced saves
- close / flush behavior
- retry behavior
- save failed state
- load failed state
- local-first assumptions
- mutation contracts
- schema shape
- persistence adapter boundaries
- destructive operations
- delete / undo behavior
- N/A preservation behavior

Questions to answer:

- Are load failure, missing sermon, corrupt state, and permission/storage errors distinguished?
- Is error handling visible, plain, and retryable?
- Can stale state overwrite fresh state?
- Are write paths consistent across Study, Anchor, Outline, Body, Manuscript doors, notebook, and threshold flags?
- Are there manual mirror fields that can drift, such as MPT/MPS export fields?
- Are destructive operations given friction proportional to destruction?

## Lens 5 — Field and question model

Audit whether CORE’s field/question/answer model is actually represented in code.

Inspect:

- field definitions
- walk order
- field normalization
- legacy field shapes
- explicit `questions` arrays
- multi-question rendering
- field-level vs question-level advancement
- answer envelope shape
- N/A flags
- per-cell synthesis tables
- manuscript/body/outline storage differences

Questions to answer:

- Does the implementation actually support “one question at a time”?
- Are “field” and “question” cleanly separated?
- Are some prompts hidden in `hint` and normalized into fake `primary` questions?
- Are different regions using incompatible answer shapes?
- Are content edits able to accidentally change behavior?
- Is there a clear migration path to a stable question model?

## Lens 6 — Component boundaries

Audit whether responsibilities are cleanly separated.

Pay special attention to the main sermon workspace shell/component.

Questions to answer:

- Is one component coordinating too many responsibilities?
- Which responsibilities are currently concentrated together?
- Which responsibilities should be domain services, hooks, selectors, or pure utilities?
- Are rendering components making domain decisions?
- Are domain utilities depending on UI assumptions?
- Are persistence concerns mixed into navigation or field rendering?
- Are field-content definitions mixed with completion behavior?

Do not propose a giant rewrite unless absolutely necessary. Identify seams that can be stabilized incrementally.

## Lens 7 — Data shape and schema stability

Audit whether the sermon data model is stable and understandable.

Inspect:

- persistence contracts
- schema docs
- Study answer envelopes
- cumulative synthesis table
- main point pair shape
- any mirrored MPT / MPS fields
- outline shape
- functional/body element shape
- manuscript shape
- notebook shape
- tags/series metadata
- export dependencies

Questions to answer:

- Are there too many storage patterns under one writing surface?
- Are there manual mirrors that can drift?
- Are schema docs stale relative to current CORE?
- Are retired concepts like Equip/Frame still present in schema, code, comments, or pastor-facing copy?
- Is migration debt isolated or spread throughout the workspace?

## Lens 8 — Pastor-facing architectural consequences

For every architecture issue, translate the consequence into what the pastor experiences.

Examples:

- “He reopens the sermon and lands somewhere unexpected.”
- “He sees ‘complete’ even though the canonical artifact is missing.”
- “He sees old vocabulary and wonders whether Body and Equip are different.”
- “A load failure looks like his sermon disappeared.”
- “He is promised one question at a time but sees a worksheet.”

Do not report architecture problems only in engineering terms. Always connect them to the single pastor persona.

# Deliverable 1 — Architecture audit

Produce a structured audit with these sections.

## 1. Executive summary

Answer:

- Is the architecture fragile?
- Where is it strongest?
- Where is it most fragile?
- What is the highest-risk seam?
- What is the most urgent pastor-facing risk?
- What is the most urgent long-term maintainability risk?

## 2. Confirmed fragility points

For each point, include:

- Title
- Severity: High / Medium / Low
- Area: authority, completion, navigation, persistence, field model, component boundary, data shape, pastor-facing copy, etc.
- What the pastor experiences
- What the code/docs are doing
- Evidence with file paths and line numbers
- CORE clause strained, or “architecture concern — no direct CORE violation”
- Whether this is pastor-facing now or latent/future-risk
- Whether it requires live confirmation

## 3. Disputed or unsupported hypothesis items

Identify any concerns you do not find evidence for.

For each:

- Concern
- Why it is not supported
- File/line evidence
- Whether it should still be watched later

## 4. Doc drift register

List all document conflicts separately from UX/code findings.

For each:

- Conflict
- Files/sections involved
- Authority level
- Which source should govern
- Whether this has pastor-facing consequences
- Whether docs should be updated, archived, or annotated

## 5. Missing context / live confirmation list

List any files, runtime behavior, imports, generated code, app behavior, or platform-specific behavior that cannot be confirmed from static review.

# Deliverable 2 — Remediation plan

After the audit, propose a staged remediation plan. Do not implement it.

The plan should be incremental and approval-friendly. For each phase, include:

- Goal
- Why this phase comes now
- Exact files likely involved
- Architecture principle being restored
- Expected pastor-facing benefit
- Risks
- Tests or verification steps
- What should not be changed in this phase

Use these phases unless your audit strongly supports a better order.

## Phase 0 — Freeze authority and stop drift

Goal: Make it impossible for future work to justify changes from competing authorities.

Likely tasks:

- Ensure CORE remains the sole normative authority.
- Mark stale docs explicitly.
- Remove or revise claims that code overrides CORE.
- Create a doc drift ledger if needed.
- Do not change UX yet.

## Phase 1 — Centralize vocabulary and retired concepts

Goal: One vocabulary everywhere.

Likely tasks:

- Remove pastor-facing retired terms such as Equip/Frame where CORE has replaced them.
- Align map state labels.
- Align tab/button labels such as Passage / Your work / Open Bible.
- Make stage/sub-phase/field labels centrally derived rather than repeated.

## Phase 2 — Centralize completion truth

Goal: One completion engine consumed by map, handoff, finish, and export status.

Likely tasks:

- Reconcile CORE composite rules with current lenient checks.
- Decide how Observation Set should be computed under CORE.
- Ensure N/A semantics are included centrally.
- Remove local or duplicate completeness rules.
- Add tests for each named outcome.

Important: Do not introduce gates or blocking. Completion must inform only.

## Phase 3 — Stabilize position and navigation model

Goal: One canonical position state with safe derived views.

Likely tasks:

- Clarify responsibilities between canonical position state, renderer state, and persisted sermon state.
- Prevent stale renderer writes from clobbering canonical position.
- Ensure map jumps, Back/Next, handoff jumps, finish jumps, and reopen all use the same navigation service or reducer.
- Add tests for resume/reopen and threshold behavior.

Important: Do not add locked navigation or progress requirements.

## Phase 4 — Normalize field/question/answer model

Goal: Make CORE’s Field / Question / Answer model real in code.

Likely tasks:

- End reliance on legacy `hint` → fake `primary` question normalization where practical.
- Represent explicit question arrays consistently.
- Decide whether chevrons advance by field or by question, and align copy with actual behavior.
- Keep previous answers visible without turning current screens into worksheets.
- Preserve N/A behavior and typed-word preservation.

Important: Do not add AI writing, generated answers, or pastor-blocking validation.

## Phase 5 — Separate workspace orchestration responsibilities

Goal: Reduce main workspace shell fragility without rewriting the app.

Likely tasks:

- Extract save/persist behavior into a hook or service.
- Extract navigation/position behavior into a hook or reducer.
- Extract completion selectors.
- Extract threshold-state handling.
- Keep rendering behavior stable while moving responsibilities out.

Important: Keep changes incremental and heavily tested.

## Phase 6 — Stabilize persistence and error states

Goal: Make “is my work safe?” reliably answerable.

Likely tasks:

- Separate load failure from sermon-not-found.
- Make errors visible, plain, and retryable.
- Verify close flush behavior.
- Verify save retry behavior.
- Confirm destructive operation friction.
- Confirm undo behavior if supported elsewhere.

## Phase 7 — Data shape cleanup and migration planning

Goal: Reduce long-term schema fragility.

Likely tasks:

- Identify manual mirror fields that can drift.
- Clarify whether mirrored fields are export-only, derived, or persisted canonical fields.
- Clarify Study answer envelope vs Outline/Body/Manuscript shapes.
- Update stale schema docs.
- Propose migrations only if necessary.

Do not start with migrations unless a correctness issue requires it.

# Deliverable 3 — Proposed first approval batch

After the remediation plan, recommend the first small batch of changes I should approve.

The first batch should be low-risk but high-leverage. It should not touch everything.

Include:

- exact findings addressed
- exact files
- expected diff size
- rollback risk
- verification steps
- why it is safe to do first
- what not to touch in the first batch

# Deliverable 4 — Test strategy

Propose tests/checks for the stabilized architecture.

Include tests for:

- CORE vocabulary alignment
- no retired pastor-facing vocabulary
- completion artifact truth
- map / handoff / finish consuming the same completion model
- N/A preserving typed content
- save failure and retry states
- load failure vs sermon not found
- Back / Next / map jump consistency
- reopen / resume position
- no blocking gates
- no AI-generated sermon content
- no movement narration outside the three threshold screens

# Output format

Use clear prose with headings. Tables are okay only where they improve readability. Include file paths and line numbers wherever possible. Be explicit about uncertainty.

Do not make code changes. Do not create branches. Do not edit files. This is an audit and remediation plan only.
