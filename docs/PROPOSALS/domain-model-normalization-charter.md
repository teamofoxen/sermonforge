# Domain Model Normalization — Charter

> **✅ APPROVED PLANNING CHARTER — planning authorized 2026-07-03 (owner ruling). Live anchor, not historical.**
> This is a **planning-only** governance document. It authorizes planning for evidence-based
> architectural normalization of SermonForge's canonical workspace grammar. **It is not approval to
> implement.** Each seam is planned and then separately approved before any code moves. Authority is
> `docs/CORE.md` (Architecture Direction `:78-98`; State Contract #6 `:184-191`; normalization Test
> questions Q6–Q8 `:386-404`), disciplined by `docs/RULES.md` Normalization Discipline (`:75-91`).

**Status:** APPROVED for planning 2026-07-03. **Slice 1 — Phase 1 + Phase 6 + Phase 8 bundled
(Grammar Ownership, Boundary Parity, and Structural Doc/Code Enforcement) — was approved and
implemented 2026-07-03** (owner ruling; see CHANGELOG). The §4 evidence basis and the §8 Phase 1
packet below record the **pre-slice** state that justified the work; several citations (the dead
`SUB_PHASE_LABELS` at `contracts.ts:129-138`, the `coerceLegacyStage` fixture at `test-spine.ts`)
now point to code the slice has since **removed**, and are retained as the planning record, not as
current fact. Later phases (2, 3, 4, 5, 7) remain planning-only; **each still requires separate
approval.** The A–E remediation initiative is COMPLETE and on HOLD (`b5da14e`) — this charter does
not reopen or extend it.

**Provenance:** Converts the prior Domain Model Normalization planning review (16-agent evidence +
adversarial verification fleet, 2026-07-03) and its charter draft into a durable governance
document. The two spine citations (`src/core/contracts.ts:1-6` and `:129-138`) were re-read directly
at approval time; the remaining citations were reproduced at HEAD by the verification fleet.

---

## 1. Status

- **Planning: APPROVED** (owner ruling, 2026-07-03). Do not re-litigate justification.
- **Implementation: approved per-phase only.** Slice 1 (Phases 1 + 6 + 8) was approved and shipped
  2026-07-03 (see CHANGELOG). Phases 2, 3, 4, 5, and 7 still require separate sign-off before any
  code moves.
- **Posture:** conservative in implementation, directional in architecture.
- **Shape:** one seam at a time. **Phase 1 = Grammar Ownership & Boundary Parity.** No later seam
  opens without its own named evidence and approval.
- **This charter authorizes planning only. It is NOT permission for:** a rewrite · a global store ·
  a mega-hook · a mega-domain object · a broad new "domain layer" · a schema migration · any
  pastor-facing behavior change.
- **Pastor-facing behavior must remain unchanged** unless a change is separately approved.

---

## 2. Owner ruling

> **Domain Model Normalization planning is approved.** (2026-07-03)

The prior planning review and charter established sufficient evidence — dead source-of-truth
claims, unasserted mirrors, stale ownership, export/search parity gaps, doc/code drift, and manual
coordination around canonical workspace grammar. That evidence is not re-litigated here. The ruling
authorizes **planning**, proceeding **one seam at a time**, beginning with Phase 1. It does **not**
authorize implementation, a rewrite, a global store, a mega-hook, a mega-domain object, or any
pastor-facing behavior change.

---

## 3. Initiative thesis

SermonForge already has a canonical *state* vocabulary — stages, sub-phases, and column allowlists
live in `src/core/contracts.ts` and are imported, not re-spelled, by the runtime. The gap is that
the layer *above* the enums — the pastor-facing **labels**, **named outcomes**, and the
**field/question grammar** — is not owned the same way: it is hand-copied across the ESM/CJS wall,
into the search and export paths, and into the canon docs, with no assertion that the copies still
agree. The initiative's direction is to finish what `contracts.ts` started: **one owned source per
name-class, and every cross-boundary copy either imports that source or is proven equal to it by
test.** This matters for pastor-facing trust because the walk's named outcomes are *permitted to
evolve* (`CORE.md` Process #6) and did on 2026-07-02 — so the next ratified rename can silently
contradict itself on a threshold screen, drop a written door answer from the exported Word
manuscript, or surface a retired label in search, none of which any current test would catch. The
method is subtraction and protection — delete dead ownership claims, assert the live mirrors,
consume canonical definitions — never construction of a new domain layer.

---

## 4. Evidence basis

All citations were reproduced at HEAD by the verification fleet; the two spine items marked
**(re-read at approval)** were confirmed directly on 2026-07-03.

### Stale ownership / source-of-truth claim
- **`src/core/contracts.ts:1-6` declares itself "Single Source of Truth for every name, enum,
  label"** and calls local re-definition a Surface #1 violation — but **`SUB_PHASE_LABELS`
  (`:129-138`) has zero consumers repo-wide.** The live pastor-facing sub-phase display names are
  `REGION_DISPLAY` in `src/utils/walkOrder.js:182-191`. **(re-read at approval.)** *Risk:* the file
  that claims label ownership does not hold it; the dead map is currently *value-identical* to the
  live one, so editing the live map produces no signal that the "owner" has gone stale.

### Unasserted mirror (already drifted)
- **The three-way contracts mirror (`contracts.ts` / `electron/contracts.cjs` /
  `tests/contracts/_helpers/test-spine.ts`) is test-asserted only for the three column allowlists**
  (`tests/contracts/contracts-allowlist-sync.test.ts:20-37`). The **STAGE / SUB_PHASE / sequence /
  label portion is hand-synced with no assertion** — and has *already drifted*:
  `test-spine.ts:52-55,167-169` retains a `coerceLegacyStage` (Blueprint/Frame→Assembly) that
  production removed, under a comment falsely claiming it mirrors the main-process path.
- **`contracts.ts:30-35` names the burden in its own words** — "Both files MUST be edited together —
  drift silently violates State Contract #5" — the manual-coordination requirement `CORE.md:83-86`
  classifies as drift evidence. **(re-read at approval.)**

### Duplicated derivation
- **At least five independent named-outcome / label literal lists**, no cross-imports:
  `walkOrder.js:167-178` (`REGION_NAMED_OUTCOME`), `sermonState.js:280-285` and `:391-401` (two
  lists in one file), `ReferencePane.jsx` (Body/Outline/MPT/MPS label literals),
  `electron/main.js:3376,3385` (export headings). *Risk:* a ratified rename must be chased by memory
  across ESM and CJS; the walk's names are permitted to evolve.
- **Field/question grammar has one source** (`walkOrder.js` `WALK_ORDER` / `QUESTION_WALK_ORDER`,
  `:79-112`) **but two field shapes**: the legacy `{key,label,hint}` single-prompt shape is
  normalized by the `normalizeField` shim self-labeled **"TRACKED DEBT — scaffolding, not the
  resting shape"** (`walkOrder.js:49-73`), with a named end-state. Bounded and quarantined, but real.

### Doc/code drift
- **No test in the 347-suite asserts any property of `docs/WORKSPACE-CANON.md` or
  `docs/SYSTEMS/sermon-workspace.md`** (every `readFileSync` in `tests/` targets code).
  `scripts/drift-check.sh` checks link / path / symbol-name existence only — it cannot detect a
  wrong field count or a stale question-key list. The canon carries machine-checkable mirrors of the
  field defs (`WORKSPACE-CANON.md:104-121` counts + field-key tables). *Risk (recurrence-proven):*
  the S8 episode showed stale composite counts survive a dedicated remediation batch and get caught
  only by a second manual sweep.

### Export / search / persistence risk
- **Docx export hand-mirrors the manuscript door keys and the `_na` sidecar** across the CJS wall
  (`electron/main.js:3399-3411`) — and **already missed one once**: the builder's own comment reads
  "(Was missed when the Conclusion split's export was added.)" No field-def↔builder parity test.
  The renderer declares `isManuscriptNaAllowed` "the ONE source of truth"
  (`src/utils/sermonManuscriptFields.js:180-195`); the builder re-implements the check by hand.
- **Three search maps are hand-synced with zero test coverage:** `SERMON_SEARCH_COLUMNS`
  (`electron/main.js:1830-1849`), `HINT_MAP` (`src/utils/searchHints.js:14-44`), `COLUMN_LABELS`
  (`src/components/SearchResultSnippet.jsx:9-30`). Both prior restructures chased all three by
  memory; failure is fail-soft (wrong landing / blank label), so it degrades silently.
- **A caller-less main-process structured-write path** (`applyStructuredUpdate`,
  `electron/main.js:2234-2283`) writes a *retired pre-envelope shape* for six columns (incl.
  `main_point_pair`), while in-code comments **steer future callers to it**
  (`electron/main.js:2388-2390`, `src/core/spine.ts:249`) and `checkShape` forces them into the
  stale shape. The same vestigial-writer class E4 just removed; no test pins it.

### Future product-work risk (corrected)
- The N/A affordance build **shipped 2026-07-02** (`CHANGELOG.md`; `WORKSPACE-CANON.md:480-485`) and
  went through the existing declarative field-def flags cleanly. What remains is a **pastor ruling**
  (widen the Study grant list), not code. The residual future-work risk is therefore the *next*
  field-def-touching change, whichever it is — not a specific scheduled build.

---

## 5. Charter scope

**In scope for planning (this charter):**
- The stable domain grammar SermonForge should move toward (§7).
- Ownership rulings for each pastor-facing name-class (labels, named outcomes) — which module owns
  each, and which "owner" claims are stale.
- Classification of legitimate adapter boundaries vs. stale duplication (§6).
- The Phase 1 implementation seam, specified to the point of approve-and-do (§8).
- The triggers that would open a seam past Phase 1 (§9).

**Possible first implementation slice later (Phase 1 — requires separate approval, see §8):**
- Delete the dead `SUB_PHASE_LABELS` ownership claim (ruling: delete, do not wire — §8).
- Widen the contracts mirror sync test to the vocabulary/sequence portion; reconcile the
  `test-spine` fixture with production.
- Add the export-slot parity test and the search-map key-parity test; relocate `SERMON_SEARCH_COLUMNS`
  to a test-importable home.
- Add the doc-field-parity test.

**Out of scope (this initiative, at any depth):**
- Any of the seven target names as an actual **module** (`workspaceContract`, `QuestionNode`,
  `answerStore`, `completionRules`, `navigationReducer`, a serialization / document-model layer).
- Merging the eight answer stores; any global store, mega-hook, or mega-domain object.
- Schema migration or column deletion.
- Any change to the walk, labels' *wording*, copy, questions, completion *meaning*, exports'
  *output*, or persistence *behavior*.
- Semantic-prose enforcement (behavior claims in docs); doc-format migration to YAML/JSON.

The scope is broader than a parity-test chore — it settles *ownership* and *direction* for the
workspace grammar — and narrower than a rewrite: it moves existing sources by subtraction and
assertion, building no new layer.

---

## 6. Target classification

| # | Target | Class |
|---|--------|-------|
| 1 | `workspaceContract` | **Core seam** (ownership + parity, *not* a module) |
| 6 | `serialization` | **Core seam** (export/search parity, *not* a module) |
| 7 | doc/code enforcement | **Core seam** (doc-field parity test) |
| 2 | `QuestionNode` / field model | **Supporting seam** (resting shape; ruling-gated) |
| 3 | `completionRules` | **Guardrail only** |
| 4 | `answerStore` | **Explicit non-goal for now** (one guardrail retained) |
| 5 | `navigationReducer` | **Explicit non-goal for now** |

Targets 1, 6, 7 collapse into **one Phase 1 core seam** because they share a single root cause:
canonical truth hand-copied across the ESM/CJS wall or into docs, without a parity assertion.

### 1. `workspaceContract` — Core seam
- **Why this class:** the strongest at-HEAD drift lives here (dead ownership claim + already-drifted
  vocabulary mirror + five label lists), and the fix is subtraction + assertion, not a module.
- **Evidence:** `contracts.ts:1-6` SSoT claim vs. dead `SUB_PHASE_LABELS:129-138`; unasserted
  vocabulary mirror + `coerceLegacyStage` fixture drift; five named-outcome label lists (§4).
- **Must not become:** a new declarative `workspaceContract` module ingesting fields/questions/
  thresholds — the forbidden mega-domain object. The two homes already exist (`contracts.ts` for
  enums/labels; `walkOrder.js` for walk-derived structure).
- **Expansion trigger:** a ratified rename that requires editing more than the one owned source +
  its asserted mirrors.

### 6. `serialization` — Core seam (parity only)
- **Why this class:** the export and search parity gaps are the same unasserted-mirror class as #1,
  and one (export) has already missed silently.
- **Evidence:** docx door-key/`_na` hand-mirror + documented miss (`electron/main.js:3399-3411`);
  three untested search maps (§4).
- **Must not become:** a serialization module, a renderer-side document model, or moving the docx
  builder — the ESM/CJS wall makes payload-as-data into the CJS builder the *permitted* State #6
  adapter; the gap is a missing test, not a missing layer.
- **Expansion trigger:** a second export/search omission *after* the parity tests exist.

### 7. doc/code enforcement — Core seam (one parity test)
- **Why this class:** no test asserts any canon-doc property, the structural drift class has
  recurred (S8), and `WALK_ORDER` already single-sources the code side, so a test needs no module.
- **Evidence:** no doc-facing `readFileSync` in `tests/`; `drift-check.sh` structurally can't catch
  count/key drift; canon carries verbatim field-def mirrors (§4).
- **Must not become:** a markdown-spec parser, canon-as-YAML, semantic-prose enforcement, or a
  runtime gate — it is a CI tripwire over the structural subset (counts, field keys, question keys)
  only.
- **Expansion trigger:** the parity test proving too brittle against annotated tables — the response
  is to *shrink the test's scope*, not constrain the doc.

### 2. `QuestionNode` / field model — Supporting seam
- **Why this class:** the declarative grammar substantially exists (`normalizeField` +
  `QUESTION_WALK_ORDER`); the resting shape (every field an explicit `questions` array; shim
  deletes) belongs in the *direction*, but the shim deletion is gated on a pastor copy ruling
  (synthesizing prompt-from-hint is copy the pastor owns).
- **Evidence:** `walkOrder.js:49-73` TRACKED DEBT with a named end-state; the deferred Phase-4
  explicit-`questions` migration is a policy/copy decision
  ([governance plan](../AUDITS/sermon-workspace-remediation-governance-plan.md) `:64-67`).
- **Must not become:** a behavior-carrying `QuestionNode` model (render/derive/mutate per node) —
  that recreates the mega-object and collides with the eight-stores ruling.
- **Expansion trigger:** the pastor rules on prompt copy (unblocking the shim deletion), *or* a new
  question demonstrably forces edits across unrelated surfaces.

### 3. `completionRules` — Guardrail only
- **Why this class:** `CORE.md` Process #2 (`:215-221`) names the file path and the five composite
  function names *as law* — a module is a CORE amendment for zero behavior change. Derivations are
  already colocated in `sermonState.js` and consumed through one hook; the surface bars differ *by
  ruling* (Finding I).
- **Evidence:** four "is-X-done" functions in one file; B1/B3 already pin cross-surface agreement +
  the ruled asymmetry; intra-file per-kind dispatch duplicated (`sermonState.js:105-152` vs
  `:304-322`).
- **Must not become:** a `completionRules` module, or a shared selector that erases the ruled
  leniency/asymmetry. The only sanctioned artifacts are the existing tripwires plus, optionally, a
  documentation "completion ledger."
- **Expansion trigger:** a new map/handoff/Finish inconsistency reaches a surface, *or* a
  completion-meaning change must edit the two intra-file dispatches in lockstep and gets one wrong.

### 4. `answerStore` — Explicit non-goal for now (one guardrail retained)
- **Why this class:** the envelope layer already exists de facto (`studyFields.js` + `utils.js`
  accessors); the eight stores are eight *by ruling* (governance principle 3). A store/envelope
  module is the banned mega-store.
- **Evidence:** every live consumer routes through the accessors; no bypass found. The one real item
  is the caller-less pre-envelope structured writer (`electron/main.js:2234-2283`) — an E4-shaped
  micro-chore, *not* a store.
- **Guardrail retained:** the caller-less structured-write path is a watch-item; a
  no-structured-caller tripwire (modeled on `transition-state-no-caller.test.ts`) becomes due *if* a
  live structured caller is proposed.
- **Expansion trigger:** a live caller proposed for `apply-mutation` with a structured field.

### 5. `navigationReducer` — Explicit non-goal for now
- **Why this class:** State #6's "single derivation" is *already satisfied* at this seam (one
  position read, one serializer, `transitionState` gone); the impure residue is irreducibly
  side-effectful, so a "pure reducer" must grow an effects layer = construction. The seam was
  extracted **navigation-last, deliberately, because it is riskiest**, and has minimal soak.
- **Evidence:** `walkOrder.js` ordering is pure/frozen; the `resume-position` guard passes; no §5
  position/resume trigger has fired.
- **Must not become:** a dispatch/action/effects reducer, or a relocation of the reviewed "Option A"
  visibility reads.
- **Expansion trigger:** a position/resume bug *after real feature work* has exercised the Track-D
  hooks, *or* a seventh navigation entry point that cannot reuse the six handlers.

---

## 7. Normalized architecture direction

The end-state is the governance plan's stated target
([Long-Term Target Architecture Direction](../AUDITS/sermon-workspace-remediation-governance-plan.md)
`:259-390`) — *fewer competing sources of truth* — reached by subtraction and parity, not
construction:

- **Canonical workspace-grammar ownership.** Each name-class has exactly one owning module: **enums**
  (Stage/SubPhase/sequences/columns) → `src/core/contracts.ts` (already true, imported not
  re-spelled); **walk-derived display** (region display names, named-outcome labels, field/question
  structure) → `src/utils/walkOrder.js` (already the live source). The correction is to make
  ownership *honest*: retire the dead `SUB_PHASE_LABELS` claim so `contracts.ts` no longer advertises
  ownership it does not hold, and have the scattered label literals import their owner rather than
  re-spell it.
- **Legitimate adapter boundaries, especially ESM/CJS.** `electron/contracts.cjs` is a *sanctioned*
  mirror (State #6, `CORE.md:184-191`) because the CJS main process cannot import ESM. The rule that
  makes a mirror legitimate rather than drift is: **it is asserted equal to its canonical side by a
  test.** Today the column portion is (`contracts-allowlist-sync`); the vocabulary/sequence portion
  is not. The direction closes that: every value the CJS side mirrors is under a parity assertion.
  The docx export and the search maps live on the same CJS side and get the same treatment —
  asserted equal to their field-def / column source, never hand-trusted.
- **Consumer pattern for walk/map/render/completion/export/search.** Consumers stay **thin**: they
  read `WALK_ORDER` / `QUESTION_WALK_ORDER` and the accessor family; they do not re-derive stage
  order, re-spell field keys, or re-parse envelope shapes. Where the wall forbids import (CJS
  export), the consumer is fed a canonical *payload* (already the pattern for
  `buildManuscriptExportPayload`) and asserted, not handed shape knowledge.
- **Source-of-truth rules for labels and named outcomes.** One owning map per class; the
  named-outcome *text* remains pastor-editable in that one place; every other surface reads it. This
  is what protects the walk's permitted-to-evolve names (`CORE.md` Process #6) from producing a
  threshold-screen contradiction.
- **Retired-vocabulary policy.** Retired terms (Blueprint/Frame/Delivery/Equip) stay policed by the
  existing lint rule + alias scans; the direction *reduces* the tripwire count over time by removing
  the duplication they guard (a term can only reappear where it is hand-typed), not by adding more
  scanners.
- **Doc/code parity expectations.** Docs *describe* the contract and, for the structural subset
  (counts, field keys, question keys), are *asserted equal* to it by one CI test — so canon can no
  longer silently claim a walk shape the code does not have. Prose/semantic claims remain
  human-reviewed; canon keeps its ranked authority ("code wins").
- **Pastor-facing behavior is unchanged throughout.** Every step is a deletion, an import, or a
  test. No label wording, no completion bar, no export output, no walk order, no save behavior moves.
  The tripwires are CI-only and never block the pastor (Process #1 holds).

No detailed APIs are proposed. The direction relocates and asserts existing truth; it introduces no
new module.

---

## 8. Phase 1 seam — Grammar Ownership & Boundary Parity

**Implementation of Phase 1 requires separate approval.** This section specifies it to the point of
approve-and-do; it does not authorize the work.

- **Purpose:** make the canonical workspace grammar's ownership *honest* and its cross-boundary
  copies *asserted*, closing the three at-HEAD mirror gaps that already carry (or have produced)
  silent drift. This is the smallest seam that is directional — it settles ownership for the whole
  name-grammar, not just one test — while touching no behavior.
- **Included canonical truths:** stage/sub-phase **display labels** and **named-outcome labels**;
  the **stage/sub-phase/sequence** portion of the three-way contracts mirror; the **manuscript door
  keys + `_na` sidecar** the export consumes; the **search column set**; the **field/question counts
  and keys** the canon docs assert.
- **Known consumers:** `SermonMap.jsx`, `SermonWritingSurface.jsx`, `ReferencePane.jsx`,
  `SermonFinish.jsx` (labels); `electron/main.js` docx builder + FTS (export/search);
  `SearchResultSnippet.jsx` (search labels); the contract test suite (mirror); future sessions + the
  pastor's own review (canon docs).
- **Known mirrors / adapters:** `electron/contracts.cjs` (sanctioned, partially asserted);
  `test-spine.ts` (fixture, currently drifted); the docx builder's hand-copied keys; the three
  search maps; the canon-doc field tables.
  - **Ruling (settled here):** `walkOrder.js` `REGION_DISPLAY` / `REGION_NAMED_OUTCOME` are canonical
    for pastor-facing display; **`contracts.ts` `SUB_PHASE_LABELS` is dead and should be deleted with
    a pointer, not wired** (wiring it creates the competing source State #6 forbids).
  - **Ruling deferred to the implementer:** whether `SERMON_SEARCH_COLUMNS` gains a `contracts.ts`
    counterpart (keeping `contracts.cjs` a true mirror) or is imported into the test from
    `electron/main.js` — a placement call, not a redesign.
- **Tests required before any implementation:** a label characterization pin (freeze the exact
  current strings before any consolidation); a widened three-way mirror parity test
  (STAGE/SUB_PHASE/sequences/labels, not just columns); a fixture-vs-production legacy-stage parity
  assertion; an export-slot parity test (door keys ↔ payload, `_na` honored); a search-map
  key-parity test; a doc-field-parity test (canon counts/keys ↔ `WALK_ORDER`). Each must **pass
  green at HEAD** (proving zero false positives on the real annotated docs/fixtures) and **fail on a
  one-character mutation** before being trusted.
- **Explicit non-goals for the seam:** no module; no schema change; no label *wording* change; no
  export *output* change; no touching completion bars, the walk, or the eight stores; no
  semantic-prose doc enforcement; no runtime gate.
- **Stop condition:** each name-class has one importable owner and every cross-boundary copy is
  asserted equal to it (or deleted); the fixture matches production; canon's structural subset is
  asserted. When the evidenced mirrors are owned + asserted, **stop** — do not proceed to
  `QuestionNode`, `answerStore`, `completionRules`, or `navigationReducer` (`RULES.md:90` — "Stop
  when the evidenced drift is removed").

*How the seam fits the larger direction:* it is the "canonical ownership + legitimate-adapter" spine
of §7. It does not merely add tests — it *decides who owns each name* and makes every adapter honest,
which is the precondition for keeping walk/map/render/export/search thin. The remaining §7 pieces
(field-def resting shape, completion ledger) are Supporting/Guardrail and wait for their own
triggers.

---

## 9. Future expansion triggers

A seam past Phase 1 opens only on named evidence, with its own approval — never a batch:

- **Field-def shape (→ Supporting seam 2):** the pastor rules on prompt copy (unblocking the
  `normalizeField` shim deletion), or a new question requires edits across unrelated surfaces despite
  the parity tests.
- **Completion (→ Guardrail 3):** a map/walk/render/Finish/export/search disagreement appears *after*
  the parity tests exist, or a completion-meaning change forces lockstep edits to the two intra-file
  dispatches.
- **Retired vocabulary:** a retired term reappears in pastor-facing copy or docs despite the lint
  rule + alias scans — evidence the scanners guard duplication that should instead be removed.
- **Answer writer (→ Guardrail 4):** a live structured answer writer is proposed for `apply-mutation`
  — the vestigial-writer retirement + no-caller tripwire becomes due before it lands.
- **Navigation (→ non-goal 5):** a navigation/resume bug recurs after real feature work exercises the
  Track-D hooks, or a new navigation entry point cannot reuse the six handlers.
- **Export/search:** a *second* silent omission after the parity tripwires exist — the tripwire
  proved insufficient and the seam needs deepening.

---

## 10. Anti-overbuild constraints (binding)

- No rewrite.
- No global store.
- No mega-hook.
- No mega-domain object.
- No broad new "domain layer" without a specific evidenced seam.
- No schema migration by default (only under a separately proven, unavoidable correctness need).
- No pastor-facing behavior change — walk, labels' wording, copy, questions, completion meaning,
  exports' output, persistence behavior all unchanged unless separately approved.
- No implementation without separate approval after this charter.
- No broad module creation (`workspaceContract` / `QuestionNode` / `answerStore` / `completionRules`
  / `navigationReducer` / serialization layer) unless the first seam *proves* it necessary and the
  evidence is named.
- Normalize one seam at a time; preserve current behavior; add the characterizing tests before
  moving logic; prefer deletion / consolidation / pure derivation / adapter boundaries before any
  abstraction.
- **Stop when the evidenced seam is normalized** (`RULES.md:90`).
- Tripwires are CI-only and never become runtime gates (Process #1 — completeness informs, never
  blocks).

---

## 11. Decision

> **Domain Model Normalization planning is approved and begins now.** The initiative proceeds **one
> seam at a time**, starting with **Phase 1 — Grammar Ownership & Boundary Parity.**

This is **not** permission for a rewrite, a global store, a mega-hook, or a mega-domain object. It is
**not** approval to implement: Phase 1 (§8) requires separate sign-off, and even then lands as
deletions, imports, and tests. **Pastor-facing behavior remains unchanged** unless separately
approved. When the Phase 1 evidenced mirrors are owned and asserted, the seam **stops**; a later seam
opens only on the named evidence in §9.

---

*Live anchor. Registered in [`docs/ANCHORS.md`](../ANCHORS.md). This charter is planning governance;
the live authority for the workspace grammar remains `docs/CORE.md`, `docs/WORKSPACE-CANON.md`, and
the code at HEAD.*
