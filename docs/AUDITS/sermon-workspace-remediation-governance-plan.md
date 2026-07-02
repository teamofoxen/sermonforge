# Sermon Workspace — Implementation Governance Plan

> **Status:** Governance plan — no code changed, no branch created. This document **supersedes
> Deliverables 2 and 3** ("Remediation plan" and "First approval batch") of
> [`sermon-workspace-architecture-audit-and-remediation-plan.md`](sermon-workspace-architecture-audit-and-remediation-plan.md).
> That audit remains the **evidence base**: its Deliverable 1 (findings **A–N**, disputes,
> doc-drift register) and Deliverable 4 (test strategy) are unchanged, and this plan references
> findings by their audit letter IDs. **Authority:** `docs/CORE.md` is the sole normative law.
>
> **Posture (the decision rule for every choice below):** *stabilise the seams, pin the
> invariants, then extract only where the tests make it safe.* Latent drift is treated as real
> work, because latent drift is how the next pastor-facing contradiction gets built — but the
> answer to latent drift is a scalpel, not a rewrite.

---

## Governing principles (binding on every track and gate)

These are hard constraints. A step that violates any of them does not ship; it reshapes or it stops.

1. **No giant rewrite.** Nothing here replaces a subsystem wholesale.
2. **No "new architecture" for its own sake.** No abstraction lands unless a named finding requires it.
3. **No unification of storage into one abstract mega-store** unless a *later* correctness issue proves it necessary. The eight answer stores stay eight (native columns feed the Word export by design — audit finding C).
4. **No change to sermon-walk behaviour** unless specifically approved.
5. **No change to completion-policy bars** (lenient/strict) unless specifically approved.
6. **No gates, blocks, locked navigation, progress requirements, or refusals.** Completeness informs; it never blocks.
7. **No AI-generated sermon content**, drafting assists, suggestions, or auto-completion.
8. **No celebration toasts, progress announcements, or movement narration** outside the three threshold screens (start · Study→Anchor handoff · finish).
9. **CORE remains the sole normative authority.** Docs and code align to CORE; where they diverge without a recorded rationale, CORE governs.
10. **Latent drift still matters.** "The pastor can't see it today" is never a reason to skip a fix — it is a reason to sequence it safely, not to dismiss it.

### The governing posture — conservative in implementation, directional in architecture

**The plan should be conservative in implementation but directional in architecture.** Do not
rewrite, overbuild, or change sermon-walk behaviour without approval. But also do not treat latent
architecture drift as harmless merely because it is not pastor-facing today. Latent drift matters
when it can plausibly become pastor-facing through ordinary future work.

The goal is to avoid two opposite mistakes:

1. overcorrecting into a rewrite before the tests and seams justify it;
2. treating cleanup and dead-code removal as if they already delivered the target architecture.

This posture governs every track below and is made concrete in
[Long-Term Target Architecture Direction](#long-term-target-architecture-direction) at the end:
the tracks are a *path toward* a target shape by subtraction and protection, never a licence to
build that shape ahead of the evidence.

---

## Track model

Five tracks, run in gated order. Each track has a strict charter — what it *may* touch and what
it *may not*. Findings map to tracks as follows (audit letter IDs in brackets):

| Track | Purpose | Audit findings | Runtime risk |
|---|---|---|---|
| **A** | Drift & dead-code cleanup | E, F (dead normaliser only), G, H, L1, N, DR1–DR4, DR6 | **None** |
| **B** | Invariant tests before any structural change | (protects C, D, E; fixes M/DR5) | None (adds tests) |
| **C** | Small, isolated correctness seams | K1, K3, K2 | Low, per-seam |
| **D** | Workspace-shell extraction (behaviour-preserving) | A | Medium, per-hook |
| **E** | Data-shape cleanup (opportunistic, last) | J, D (position subsystem) | Low–Medium |

Findings deliberately **not** scheduled as fixes: **I** (sibling completion wording) and the
Phase-4 explicit-`questions`-array migration (**F** second half) are **policy/copy decisions** —
they wait for an explicit ruling (see Gate 2 note); **L2** (handleAnswerChange position coupling)
is a **watch-item**, not a fix, until a non-current-field editor is ever proposed.

---

### Track A — Drift and dead-code cleanup

**Charter — allowed:** stale docs, stale comments, dead exports, dead public helpers, stale
schema/version references, hard-coded vocabulary literals, inert FTS payload, misleading comments.

**Forbidden in Track A:**
- No runtime sermon-walk behaviour changes.
- No completion-policy changes.
- No storage migration.
- No workspace-shell refactor.
- No pastor-facing UX change **except** confirmed stale vocabulary/copy stragglers.

**Rules:**
- Every code deletion is **grep-verified zero production callers** before it ships.
- Every doc edit states whether it aligns to **CORE**, **code reality**, or a **recorded product ruling**.
- Internal honesty: when a symbol is deleted, its doc/comment references are swept in the *same* batch so the tree never claims a deleted thing "still exists."

---

### Track B — Invariant tests before structural refactor

**Charter — allowed:** add tests that pin the current, ruled behaviour so Tracks C–E are safe.
Priority order (from the audit's Deliverable 4):

- **P1** — completion consistency across map / handoff / Finish (one sermon → both derivations agree per artifact).
- **P1** — kind-parity guard: every `q.kind` in the field defs has a branch in **both** `SermonWritingSurface.renderQuestion` **and** `sermonState.deriveQuestionStatesFromSermon` (finding C's silent-fallthrough guard).
- **P1** — fixture-vs-production mutation parity + fix the two illusory tests (finding **M**); correct the `ENFORCEMENT_STATUS` Mutation #1 row (**DR5**).
- **P2** — dead-composite / retired-vocabulary tripwire; extend the alias scan to catch stage/sub-phase string literals outside the enums.
- **P2** — load-failure vs sermon-not-found regression guard (pins the W4 fix).
- **P2** — reopen/resume position guard (assert the surface resumes *at* `last_touched_position`); `transitionState`-has-no-renderer-caller tripwire.
- **P3** — no-blocking-gates assertion; no-AI (lint already covers); no-movement-narration meta-test already exists (`process-3`) — keep and extend.

**Rules:**
- Tests may **expose** existing drift but must not silently change behaviour.
- **If a test forces a policy decision, stop and ask** — do not encode a bar or a behaviour choice unilaterally.
- **If a test fails because current behaviour is intentionally ruled, document the ruling** (cite the CORE/canon/CHANGELOG line) rather than "fixing" the behaviour.

---

### Track C — Small correctness seams

**Charter — allowed (only after Track A + Track B P1 land):** close isolated latent seams —
K1 (same-column stale-base write), K3 (redundant post-flush write), K2 (save-error message
contract, *if worth pursuing*).

**Rules:**
- Each fix is **isolated** and carries its **own regression test**.
- **Do not** combine persistence, completion, and navigation fixes in one diff.
- **Do not** change close/quit flush behaviour unless a test proves it broken (the audit found it sound — finding D7/K3).

---

### Track D — Workspace-shell extraction

**Charter — allowed (only after Track A complete + Track B P1/P2 exist):** thin
`SermonWorkspace.jsx` (finding A) by extracting hooks, **one per PR**, in this order:
save/persistence → completion selectors → mutation handlers → threshold handling → **navigation last**.

**Rules:**
- **Extract behaviour; do not redesign behaviour.**
- Preserve **flush-before-navigation** ordering exactly.
- Preserve **threshold** behaviour exactly (start / handoff / finish).
- Keep `SermonWritingSurface` **render-only** unless a specific approved finding requires otherwise (the audit disputed the "surface makes domain decisions" claim — D9 — so there is currently no such finding).
- **No broad event bus, global-state library, or architecture framework.**

---

### Track E — Data-shape cleanup

**Charter — allowed (opportunistic, last; only after tests protect export and completion):**
- Main Point export reads from the canonical `main_point_pair` envelope (finding **J**); retire the write-path mirror if safe.
- Resolve the vestigial position subsystem (finding **D**): the *doc* correction (schema "canonical" → `last_touched_position`) rides Track A; the optional *code* removal of the unused `transitionState` writer + handler waits here, guarded by the Track-B no-caller tripwire.
- Leave legacy columns in place unless migration is actually necessary.

**Rules:**
- **No migration** unless required for correctness.
- **No schema-column deletion without explicit approval.**
- No "one answer store" rewrite.
- Prefer **boundary adapters and derivation** over data churn.

---

## Revised first approval batch — **Track A only**

Every item below is **doc / comment / dead-code**. **None can affect runtime behaviour.** Deletions
are grep-verified zero-caller (evidence column). This is the recommended first batch and nothing else.

| # | File(s) | Exact change | Type | Runtime? | Zero-caller / correctness evidence | Aligns to |
|---|---|---|---|---|---|---|
| **A1** | `src/utils/studyAdvancement.js` | Delete `checkField3Composite` (:110-118) **and** its private helper `canvasHasMainWithModifier` (:83-118) and the export-rationale comment (:37-40) | code + comment | No | Only refs are the def, its rationale comment, three explanatory comments in `sermonState.js` (:21,:333,:382), and one **comment** in `sermonCompleteness.test.js:107` — **no call site** | code reality + CORE Test Q5 (orphan removed) |
| **A1-sweep** | `docs/SYSTEMS/sermon-workspace.md` (:383-385, :476-477); `docs/CORE-CHANGELOG.md` | Rewrite the two "still exists… candidate for removal, not yet acted on" passages to "removed"; add a one-line CHANGELOG entry recording the deletion | doc | No | The two SYSTEMS passages become false once A1 lands; CORE.md:194/209 + WORKSPACE-CANON:372 say "retired **from the roll-up**" which stays true → **not** edited | code reality |
| **A1-comment** | `src/utils/sermonState.js` (:21,:333,:382); `src/utils/sermonCompleteness.test.js:107` | Reword the "deliberately NOT used" / "old checkField3Composite" comments to past tense ("formerly checked via a Divisions composite; dropped by M2, since removed") | comment | No | comments only | code reality + recorded ruling (M2) |
| **A2** | `src/utils/studyAdvancement.js` (:24,:30,:205) | "eight composite gates" → "five"; "consumes all eight" → "all five"; "names SIX composites" → "five" | comment | No | After A1 the file defines exactly five composites; the live roll-up consumes five (`sermonState.js:390-401`) | CORE (Process #2, five) |
| **A3** | `src/utils/studyFields.js` (:558-563) | Delete the dead **public** `fieldQuestions` export | code | No | `git grep fieldQuestions` → **only its own definition**; zero callers in src/electron/tests | code reality (orphan; the live normaliser is `walkOrder.normalizeField`) |
| **A4** | `src/utils/searchHints.js` (:18-40) | `import { STAGE, SUB_PHASE }`; replace the 12 literal `stage:`/`subPhase:` values with enum refs | code (behaviour-preserving) | No | Literals match enum values **1:1** (`"Study"`→`STAGE.Study`, `"RedemptiveThread"`→`SUB_PHASE.RedemptiveThread`, `"IntroTransitionsConclusion"`→`SUB_PHASE.IntroTransitionsConclusion`, etc.); peers `walkOrder.js:37`/`sermonState.js:26` already import the enums | CORE State #5 (vocabulary is state) + code reality |
| **A5** | `electron/main.js` (FTS SELECT ~:1967; result envelope ~:1991-1992) | Drop `s.current_stage, s.current_sub_phase` from the FTS SELECT and the two echoed result fields | code (IPC result shape) | No | No search-result consumer reads them — `SearchResultSnippet.jsx`, `CompletedSermons.jsx`, `SermonList.jsx` derive the landing from `matchedColumn` only; the spine `get-sermon` handler that legitimately reads these columns is **untouched** | code reality (inert payload) |
| **A6** | `docs/REFERENCE/schema.md` (:3, :7-25, :118-119) | Header `32`→`33`; add the v33 row to the version table; add a `last_manuscript_subphase` column row | doc | No | Code ships v33 (`main.js:1376-1421`); the file already references v33 in its own rows | code reality |
| **A7** | `docs/SYSTEMS/sermon-workspace.md:147` | "one question at a time" → "one field at a time" | doc | No | the S8 sweep missed this how/where doc | CORE (amended Question vocabulary) + recorded ruling (W1/R1) |
| **A8** | `src/core/contracts.ts` (:56-57); `electron/contracts.cjs` (:18-20) | Correct the comment asserting a Blueprint/Frame read-coercion that no longer exists | comment | No | `current_stage` is read straight through; the coercion was deleted (CORE-CHANGELOG) | recorded ruling (CORE-CHANGELOG) + code reality |
| **A9** | `src/components/SermonWorkspace.jsx:719` | "fires when… landed on the first Anchor field" → "fires on first entry into the Anchor region" | comment | No | The code keys on `subPhase === "Anchor"` (both fields) and is *correct*; only the comment misleads (finding L1) | code reality |

**Deferred out of Track A → Track B (justified):** the `ENFORCEMENT_STATUS` Mutation #1 row
correction (DR5) and the two stale test files (finding M) are **coupled** — the doc is stale
*because* the test is stale. Fixing the doc alone would be re-worked when the test is fixed, so
both land together in Track B P1. Track A does not touch them.

**No Track B test is required to keep this batch honest.** Every change is grep-verified
zero-caller or a pure doc/comment edit; the existing 297-test suite passing after the batch is the
safety net (nothing consumed the deleted symbols). The dead-composite tripwire test is *valuable*
but belongs in Track B — deleting `checkField3Composite` already removes the reintroduction hazard;
the tripwire guards against a *future* re-add, which is Gate-2 work, not needed to make this batch safe.

### Verification commands (run after the batch)
```
npm run lint                         # expect 0
npm test                             # expect 297/297 (nothing consumed deleted symbols)
node scripts/spine-integrity.js      # expect pass
bash scripts/drift-check.sh          # expect pass
git grep -n "checkField3Composite\|canvasHasMainWithModifier\|fieldQuestions"   # only history/tombstone/CHANGELOG
```
Then boot the preview: confirm the walk renders and a search-result click still lands on the
right field (exercises the A4 enum swap and the A5 FTS change).

### Rollback plan
Land the batch as **one squashed commit on a branch**. Rollback is `git revert <sha>` — it
restores the deleted code and comments verbatim. **No schema change, no migration, no data
touched**, so rollback has zero state implications; a revert returns the tree to its exact prior
state and the 297-test suite proves parity.

---

## Roadmap — approval gates

Five gates. Each names its entry criteria, what is allowed and forbidden inside it, the evidence
that proves it complete, and the risk it retires. **No gate opens until the prior gate's completion
evidence exists.**

### Gate 1 — Drift / dead-code cleanup complete *(Track A)*
- **Enter when:** the plan is approved. (No prerequisites — this is the front door.)
- **Allowed:** exactly the Track-A batch above (docs, comments, dead-code, the enum swap, the inert FTS payload).
- **Forbidden:** any runtime walk/completion/persistence behaviour change; any storage migration; any shell refactor; any completion-bar change.
- **Complete when:** the batch is merged; `lint` 0, `npm test` 297/297, `spine-integrity` + `drift-check` pass; `git grep` of the deleted symbols returns only history; preview walk + search landing verified.
- **Pastor-facing risk reduced:** removes the one confirmed stale *copy* straggler ("one question at a time") and prevents future mis-routed search landings (A4) — but chiefly **removes the reintroduction hazard** by which a later edit could silently re-open the M2 false-completion contradiction the pastor would eventually see.
- **Developer-facing risk reduced:** eliminates the loaded traps — dead exports, the dead **public** normaliser that drops the N/A flag, the "eight/six composites" and v32 lies, and the vocabulary island — so the source stops contradicting CORE and itself.

### Gate 2 — Invariant tests added *(Track B)*
- **Enter when:** Gate 1 complete.
- **Allowed:** the P1–P3 tests; fixing the two illusory tests + the `ENFORCEMENT_STATUS` Mutation #1 row (M/DR5). Documenting a ruled behaviour a test exposes.
- **Forbidden:** changing any behaviour to make a test pass; encoding a completion-bar or walk decision without asking; "fixing" an intentionally-ruled behaviour.
- **Complete when:** P1 tests (completion-consistency, kind-parity, fixture-vs-production parity) are green and demonstrably fail against an injected regression; the two stale tests exercise the real one-kind path; the `ENFORCEMENT_STATUS` row is accurate.
- **Pastor-facing risk reduced:** the completion-consistency and kind-parity pins make it *mechanically impossible* for a future edit to silently show "complete" on one surface and "missing" on another, or to render a filled field as "unanswered forever" — the two concrete ways this architecture could produce a pastor-visible contradiction.
- **Developer-facing risk reduced:** converts the eight-store lockstep and the M2 alignment from convention-held to test-enforced; ends the illusory green coverage that currently masks the fixture-vs-production drift.

### Gate 3 — Small correctness seams closed *(Track C)*
- **Enter when:** Gate 1 complete **and** Track B P1 tests exist.
- **Allowed:** K1 (same-column stale-base), K3 (redundant post-flush write), K2 (save-error contract) — each isolated, each with its own regression test.
- **Forbidden:** combining persistence + completion + navigation in one diff; touching the close/quit flush chain (proven sound); any shell extraction (that is Gate 4).
- **Complete when:** each seam has a merged fix + a regression test that fails without it; `mutation-3-saves-are-events` still green.
- **Pastor-facing risk reduced:** removes the (currently latent) path by which a rapid same-column edit under batching could drop a write, and the "Saving…" flicker after Export/Retry — small, but they are the only persistence edges the audit found.
- **Developer-facing risk reduced:** normalises the write-base discipline (all handlers read `sermonRef.current`) so the class of ref-vs-state divergence can't recur.

### Gate 4 — Workspace-shell extraction begins *(Track D)*
- **Enter when:** Gate 1 complete **and** Track B P1 **and** P2 tests exist. (Gate 3 need not be fully closed, but K1 should land first since the mutations hook will carry it.)
- **Allowed:** one behaviour-preserving hook per PR — save → completion selectors → mutations → thresholds → **navigation last**.
- **Forbidden:** redesigning any behaviour; altering flush-before-navigation ordering, threshold behaviour, or start/handoff/finish; making `SermonWritingSurface` non-render-only; introducing an event bus / global-state library / framework.
- **Complete when:** the shell is a coordinator composing hooks, with `process-3`, `process-4`, the Gate-2 completion/reopen tests, and a full preview walk all green after each hook lands.
- **Pastor-facing risk reduced:** none directly — but each extraction lowers the odds that a *future* feature edit perturbs save, threshold, or completion behaviour the pastor depends on (the coupling that let the ref-vs-state asymmetry hide).
- **Developer-facing risk reduced:** retires the god-component (finding A) — the single largest maintainability liability — incrementally and reversibly.

### Gate 5 — Data-shape cleanup considered *(Track E)*
- **Enter when:** Gates 1–2 complete and export + completion are test-protected.
- **Allowed:** Main Point export reads the canonical envelope + retire the write-path mirror (J), guarded by an export-payload test; the optional `transitionState` dead-code removal (D), guarded by the no-caller tripwire; the schema-doc "canonical" correction (already in Track A).
- **Forbidden:** any migration not required for correctness; any schema-column deletion without explicit approval; a "one answer store" rewrite; data churn where a boundary adapter suffices.
- **Complete when:** the export renders MPT/MPS from `main_point_pair` under test; the mirror (and, if chosen, the vestigial writer) are gone with no behaviour change; legacy columns left intact unless approved.
- **Pastor-facing risk reduced:** closes the (contained) path to a "complete" completeness with a blank export; prevents a future status surface from reporting every sermon as Study/Observe.
- **Developer-facing risk reduced:** ends the last two manual mirrors/parallel-subsystems that require hand-synchronisation.

---

## What this plan deliberately does **not** do

- It does not unify the eight answer stores (principle 3; finding C — native columns feed the export).
- It does not touch completion bars, N/A grants, the walk, or any threshold behaviour (principles 4–8).
- It does not migrate schema or delete columns as part of the recommended path (only under a proven correctness need, with approval).
- It does not treat any latent finding as "harmless" — every one is scheduled into a gate; the sequencing exists so that fixing latent drift never *introduces* pastor-facing risk.

---

## Long-Term Target Architecture Direction

The near-term plan (Tracks A–E) is deliberately conservative — remove drift, delete dead traps,
pin invariants with tests, close small correctness seams, extract only where the tests make it
safe, no rewrite, no mega-store, and no change to sermon-walk behaviour unless explicitly
approved. That conservatism is correct. It is **not**, however, the whole story: it is a *path
toward* a longer-term target shape, **not a replacement for it**.

```txt
CORE
  ↓
typed workspace/domain contract
  ↓
canonical walk
  ↓
central completion derivation
  ↓
central navigation/position derivation
  ↓
stable answer/storage adapters
  ↓
thin UI consumers
```

The current tracks move toward that shape by **subtraction and protection** — removing competing
sources of truth and pinning invariants — rather than by **construction** (building new layers).
Construction happens later, only where the evidence in §5 justifies it, and only in the smallest
step that preserves the path. **The target is not a mega-store or a framework rewrite. The target
is fewer competing sources of truth:** one vocabulary source, one walk source, one completion
truth, one position/navigation truth, clear answer/storage adapters, thin UI consumers.

### 1. What the current governance plan advances

- **Track A** advances **authority hygiene** — one vocabulary (the `searchHints` literal→enum
  swap), and stale/contradictory comments and docs removed — but it is **not** full authority
  centralization; there is still no single typed `workspaceContract` module.
- **Track B** advances **invariant protection** — completion consistency, kind-parity, and
  fixture-vs-production parity pinned by tests — but a green suite is **not** a complete domain
  model; it *fences* the current shape, it does not yet *name* it.
- **Track C** closes **small correctness seams** — write-base discipline, redundant writes,
  save-error contract — but it is **not** a persistence redesign; the save spine is unchanged.
- **Track D** thins the **workspace shell** into hooks — but a set of hooks is **not** a domain
  contract; extraction relocates orchestration, it does not define canonical types.
- **Track E** may reduce **source-of-truth drift** — Main Point export reads the canonical
  envelope; the vestigial position subsystem retired — but it is **not** a data-store rewrite;
  the eight stores remain, now with fewer manual mirrors.

### 2. What the current plan deliberately does not attempt yet

- a full typed workspace/domain contract
- a full question-node model
- a unified answer store
- a rewrite of `SermonWorkspace`
- a migration-heavy schema cleanup
- a new architecture framework
- a new global state system
- any change to sermon-walk behaviour, completion policy, or pastor-facing flow without approval

### 3. Decision points that could move us closer to the target shape later

Each is a **decision to weigh**, not a commitment — taken only if the §5 evidence is present, and
only at the smallest step that preserves the path.

- **After Track B tests exist (Gate 2):** decide whether a small `workspaceContract` module should
  centralize canonical names, phases, fields, outcomes, and threshold definitions. *(toward: typed workspace/domain contract)*
- **After kind-parity tests exist (Gate 2):** decide whether field/question metadata should be
  represented as explicit `QuestionNode`s. *(toward: canonical walk / question-node model)*
- **After completion-consistency tests exist (Gate 2):** decide whether the duplicated completion
  derivations should collapse into one shared artifact-completion selector. *(toward: central completion derivation)*
- **After navigation tests exist (Gate 2/4):** decide whether position changes should move behind
  a small reducer/service. *(toward: central navigation/position derivation)*
- **After export tests exist (Gate 5):** decide whether the MPT/MPS flat mirrors should become
  derived export values. *(toward: stable answer/storage adapters)*
- **After shell extraction (Gate 4):** decide whether remaining orchestration belongs in hooks,
  selectors, or domain utilities. *(toward: thin UI consumers)*

### 4. Do-not-overbuild boundaries

- Do **not** merge the eight answer stores into a mega-store just for architectural neatness.
- Do **not** split field content into many files unless a concrete bug or maintenance pressure justifies it.
- Do **not** migrate schema columns unless correctness requires it.
- Do **not** introduce a new app-wide state framework.
- Do **not** redesign the sermon walk during architecture cleanup.
- Do **not** turn invariant tests into runtime gates — they pin behaviour at CI and never block the pastor (principle 6).
- Do **not** use the target shape as permission for a rewrite.

### 5. Evidence that would justify deeper consolidation later

Absent this evidence, prefer the smallest stabilizing step; the §3 decision points stay
"decide whether," not "build."

- repeated bugs from kind / render / completion parity drift
- repeated vocabulary drift despite Track A cleanup
- another map / handoff / Finish completion inconsistency
- position or resume bugs after tests exist
- export drift from mirrored fields
- inability to add a new question safely without touching multiple unrelated surfaces
- `SermonWorkspace` extraction revealing unavoidable domain duplication

### 6. How to label future phases

**Requirement:** every phase after Track A must carry a label — exactly one of:

- **stabilizing the current shape**
- **moving toward the target shape**
- **explicitly deferring part of the target shape** (to avoid overbuilding)

— and must briefly answer three questions: **(1) What are we protecting now? (2) What future
contradiction are we preventing? (3) Does this phase stabilize, move toward, or explicitly defer?**

Applied to the tracks already defined:

| Track | Label | (1) Protecting now | (2) Preventing |
|---|---|---|---|
| **B** | **stabilizing** — carrying the §3 *moving-toward* decisions as options, not commitments | the M2 alignment + the eight-kind lockstep | a silent "complete here / missing there," or a filled field reading "unanswered forever," reaching the pastor |
| **C** | **stabilizing** | write integrity on rapid same-column edits; one save-error voice | a dropped keystroke or a stray flicker becoming a "did my work save?" doubt |
| **D** | **stabilizing** the shell, **explicitly deferring** the domain-contract construction | the god-component's hidden coupling | a future feature edit perturbing save / threshold / completion behaviour |
| **E** | **moving toward the target shape** (fewer sources of truth), **explicitly deferring** any schema migration | export truth + one position truth | "complete" with a blank export; a status surface mislabeling every sermon as Study/Observe |

### 7. How to avoid defensive minimization

- **"No acute pastor-facing bug" does not mean "no architecture risk."**
- **"Latent" does not mean "optional"** if the drift can plausibly become pastor-facing through
  normal future development.
- **"No direct CORE violation" does not mean "do not fix."** It means the issue is handled as
  **architecture stabilization**, not product-law correction.
- **When a proposed change is rejected as overbuilding, name the smaller step** that still
  preserves the path toward the target shape (rather than dropping the concern entirely).

The target is not a mega-store or a framework rewrite. The target is **fewer competing sources of
truth**: one vocabulary source, one walk source, one completion truth, one position/navigation
truth, clear answer/storage adapters, thin UI consumers. The decision rule stands:

> **Stabilize the seams, pin the invariants, then extract only where the tests make it safe.**

---

*Prepared as a governance plan only. No code was changed and no branch was created. Awaiting
approval of the Track-A first batch (Gate 1) before any implementation.*
