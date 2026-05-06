# Overnight audit summary — 2026-05-06

**Session brief:** Field 3 Sprint 2 follow-on cleanup. Hunt for fixtures still
carrying the legacy three-question Field 3 shape (`sentence_layout` /
`paraphrases` / `thought_units`) with verse-reference `after_line` values —
the same silent-migration bug class the tour seed had at commit `98fc40e`
(`Number("v.2") === NaN` → `thought_unit_end` markers never attach during
`parseStructuredField`'s defensive read-merge).

**Result:** zero BUG candidates. Phase 4 drift-sweep ran instead and surfaced
one stale paragraph in `docs/SYSTEMS/sermon-workspace.md` for morning review.

State at session start: HEAD `98fc40e`, 403/403 vitest green, both
SFDI validators PASS, preflight PASS. Clean working tree.

---

## Phase 1 findings

Bug signature: legacy three-question shape AND `after_line` carrying a
verse-reference like `"v.2"` (parses to `NaN` via `Number()`, which the
defensive fallback at `src/utils/studyFields.js:680` and `:963` uses for
attribution against the canvas row-count).

Greps run: `sentence_layout`, `main_sentence_id`, `paraphrases`,
`thought_units`, `after_line:\s*"v\.`, `after_line:\s*"[A-Za-z]`,
`"v\.\d+"`.

| File | Classification | Notes |
|------|----------------|-------|
| [tests/contracts/process-2-evidence-gated-ux.test.tsx](../../tests/contracts/process-2-evidence-gated-ux.test.tsx) | **OK** | Legacy three-question shape, but `after_line` values are integer-strings (`"1"` / `"2"` / `"3"`). `Number("2") === 2` — defensive merge handles cleanly. |
| [tests/contracts/process-3-movement-visible.test.tsx](../../tests/contracts/process-3-movement-visible.test.tsx) | **OK** | Same — `after_line: "2"` only. |
| [src/utils/studyFields.test.js](../../src/utils/studyFields.test.js) | **OK** | Intentional defensive read-merge tests; uses integer literals (`after_line: 1`, `3`). Exactly what the defensive path is meant to hydrate. |
| [src/components/SpotlightWorksheet.test.jsx](../../src/components/SpotlightWorksheet.test.jsx) | **OK** | Cross-phase tests against the materialized `thought_units` array (post-migration shape), integer-strings only. |
| [src/components/SynthesisTable.test.jsx:256](../../src/components/SynthesisTable.test.jsx) | **OK — intentional** | Single hit for `after_line: "v.5"`. Test name: `"does not flag free-text after_line values (e.g. 'v.5')"`. Tests SynthesisTable's stale-flag tolerance for verse-ref values, not legacy three-question migration. Source code at [src/components/SynthesisTable.jsx:23-25](../../src/components/SynthesisTable.jsx) explicitly designs for this case. |
| [electron/tourData.js](../../electron/tourData.js) | **OK** | Already migrated 2026-05-06 at commit `98fc40e` — unified-canvas shape with integer literal `after_line`s on the materialized `thought_units` array. |
| [docs/PROPOSALS/study-field-definition-initiative.md](../../docs/PROPOSALS/study-field-definition-initiative.md) | **OK** | Legacy key names appear only in revision-history prose (e.g. line 175 explaining what the unified shape replaced). Not a fixture. |
| [docs/SYSTEMS/sermon-workspace.md](../../docs/SYSTEMS/sermon-workspace.md) | **REVIEW** | Doc, not a fixture — handled in Phase 4 drift-sweep below. |
| [CHANGELOG.md](../../CHANGELOG.md) | **OK** | Historical record only. |

## Phase 3 fixes committed

None. Phase 1 yielded zero BUG candidates → Phase 3 had no in-scope work.

## Deferred to morning review

- **`docs/SYSTEMS/sermon-workspace.md` lines 151–172** — Phase 1 paragraph
  describing Field 3 still carries the pre-Sprint-2 shape language. Drift
  details captured in Phase 4 below.

## Phase 4 drift-sweep results

**Targets:** `docs/SYSTEMS/sermon-workspace.md` and `docs/PROPOSALS/sfdi-charter.md`.

**Validator script:** `.drift/field-3-unified-canvas-drift.sh` (kept for
re-runnability if morning review wants to re-validate after edits).

**Criteria checklist:**
- C1: Legacy three-question key names (`sentence_layout` / `main_sentence_id`)
- C2: `ParaphraseBlocks` component reference (retired Sprint 2 Session 2)
- C3: Field 3 dispatch as `kind=paraphrase` (now `unified-canvas`)
- C4: Field 3 composite gate described as Q1+Q2+Q3
- C5: "three questions" / "three sub-shapes" descriptions applied to Field 3
- C6: Field 3 referred to as 3-question shape with explicit count

**Validator output (verbatim):**

```
=== C1: Legacy three-question key names (sentence_layout / main_sentence_id) ===
docs/SYSTEMS/sermon-workspace.md:151:carries three structured-exercise questions: `sentence_layout` (kind=canvas)

=== C2: ParaphraseBlocks component reference (retired Sprint 2 Session 2) ===
docs/SYSTEMS/sermon-workspace.md:155:`ParaphraseBlocks` / `SynthesisTable`); paraphrase + synthesis-table

=== C3: Field 3 dispatch as kind=paraphrase (now unified-canvas) ===
docs/SYSTEMS/sermon-workspace.md:151:carries three structured-exercise questions: `sentence_layout` (kind=canvas)
docs/SYSTEMS/sermon-workspace.md:152:+ `paraphrases` (kind=paraphrase) + `thought_units` (kind=synthesis-table).

=== C4: Field 3 composite gate described as Q1+Q2+Q3 ===
docs/SYSTEMS/sermon-workspace.md:151:carries three structured-exercise questions: `sentence_layout` (kind=canvas)
docs/SYSTEMS/sermon-workspace.md:172:to Observe Field 3 Q1 canvas which absorbed the structural-diagram work),

=== C5: 'three questions' / 'three sub-shapes' descriptions applied to Field 3 ===
docs/SYSTEMS/sermon-workspace.md:151:carries three structured-exercise questions: `sentence_layout` (kind=canvas)

=== C6: Field 3 referred to as 3-question shape with explicit count ===
none
Exit code: 1
```

**Convergence:** Pass A only (exit 1, 5 distinct lines flagged across criteria
C1–C5; one of those lines is also flagged by C4's second hit on line 172).
No remediation pass run — autonomous task scoped this drift-sweep to
REPORT-only ("Do NOT fix anything based on the report. The morning review
decides scope."). Per drift-sweep protocol this is **NOT CONVERGED**;
convergence requires a clean post-remediation pass.

**Findings (consolidated):**

1. **`docs/SYSTEMS/sermon-workspace.md:150–161`** — full Phase 1 description
   paragraph still claims Field 3 Divisions / Thought Units carries "three
   structured-exercise questions: `sentence_layout` (kind=canvas) +
   `paraphrases` (kind=paraphrase) + `thought_units` (kind=synthesis-table)"
   and lists `ParaphraseBlocks` as one of the three primitives the
   `SpotlightWorksheet` dispatches on. This is the pre-Sprint-2 shape across
   the board:
   - Field 3 is now ONE unified-canvas question (per-row text + depth +
     inline paraphrase + optional `thought_unit_end` marker).
   - SpotlightWorksheet dispatches on `kind=unified-canvas` for Field 3.
   - `ParaphraseBlocks` was retired in Sprint 2 Session 2 (commit `f083b22`).
   - The "Q1 carries a structured `referencePanel`" line that follows is
     still substantively correct (the unified canvas IS the spine of Field 3
     and still has the SFDI three rules + genre tips), but the Q1/Q2/Q3
     framing is stale.

2. **`docs/SYSTEMS/sermon-workspace.md:172`** — "cross-phase to Observe
   Field 3 Q1 canvas which absorbed the structural-diagram work" inside
   Phase 2's Diagram retirement clause. Substantively correct (the unified
   canvas does carry the structural-diagram work absorbed from Phase 2),
   but the "Q1 canvas" label is stale — Field 3 has no Q1 anymore. A
   minimal edit could read "the Field 3 unified canvas" without dropping
   the substance.

3. **`docs/PROPOSALS/sfdi-charter.md`** — zero hits. Charter sits above
   field-level details; nothing referenced Field 3 by question key,
   primitive name, or shape description. Genuinely clean.

## Notes for the morning

- **Mechanical fix is available** for finding 1 — rewrite the 150–161
  paragraph to match the post-Sprint-2 shape (one unified-canvas question,
  `IndentedSentenceCanvas` as the sole Field 3 primitive, retired
  `ParaphraseBlocks`, single-question composite gate). The canonical
  language already exists at [docs/PROPOSALS/study-field-definition-initiative.md:175](../../docs/PROPOSALS/study-field-definition-initiative.md)
  + Sprint 2 commits `ef393e1` / `f083b22` / `73fa7d9`.
- Finding 2 is a one-word edit (`Q1 canvas` → `unified canvas` or similar).
- This is a sermon-workspace systems doc, not part of the SFDI canonical
  spec — but the SFDI doc rewrite (Sprint 2 Session 5) explicitly did NOT
  touch this file, which is why the drift survived. Worth flagging for
  whether the SFDI Sprint 2 doc-rewrite scope should retroactively widen,
  or whether this counts as a routine downstream-doc cleanup.
- Per `feedback_audit_workflow`: report-before-fix is the default. The
  autonomous task explicitly held to that policy here — no edits applied
  to either doc, no code touched, no tests altered. Working tree carries
  only the new summary + the validator script in `.drift/`.
- Per `feedback_verify_migration_concerns`: the Field 3 unified-canvas
  refactor is defensive-only (no production sermons exist as of
  2026-05-04), so the original primary-task hunt was for hypothetical
  fixture-only bugs. Finding zero is the expected outcome and matches the
  prompt's "common case" prediction.

---

**Stop trigger:** Phase 1 yielded zero BUG candidates → Phase 4 drift-sweep
ran (per protocol) → drift-sweep returned REPORT-only output per autonomous
scope → primary task complete. No commits made beyond this summary's
`/end-session` finalization.

**Wake-up state target:** 1 summary commit only (matches the prompt's
"common case"). 403/403 vitest still green (untouched), validators still
PASS (untouched), preflight still PASS, working tree clean after commit.
