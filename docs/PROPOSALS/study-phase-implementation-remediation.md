# Study Phase Implementation Remediation (SPIR)

**Status:** Stripped down 2026-05-04. SPIR is the running risk register: anticipated categories captured now, surfacing risks added as entries when they actually appear during a milestone.

**Audience:** The pastor-developer of SermonForge.

---

## How to use this doc

When a risk in one of the categories below surfaces during a milestone — the test suite catches it, a prep cycle exposes it, or a sub-item lands and something breaks — add an entry under "Surfacing risks" with:

- **What it is** — pastor-facing description.
- **How it showed up** — what the test suite or the pastor saw.
- **What triggered it** — which sub-item or milestone exposed it.
- **The remediation** — what was done.
- **Status** — surfaced / fixing / fixed.

The categories below are not pre-loaded entries. They are placeholders so the eight known risk shapes don't get forgotten when something in their family surfaces.

---

## Anticipated risk categories

**1. The qualitative bet on "the throughline feels earned."** SPRD's central pedagogical claim. Only verifiable by real sermon prep under the new shape. Specific risks within: the spotlight feels claustrophobic; "Next question" reads as punitive; the pre-field overview reads as a wall before work; paste-intercept frustrates when the pastor legitimately wants to bring outside notes; per-cell no-AI feels like the app policing the pastor.

**2. Habit retraining the pastor is imposing on themselves.** The MPT/MPS four-phase synthesis is retired with no replacement. The bet is that the four named outcomes plus the cumulative thought-unit table carry the substrate without it. If they don't, MPT/MPS opens unmoored — a behavior-change loss before the named-outcome substrate registers as a gain.

**3. Storage-shape edge cases.** The new per-question envelope, structured-list values, and the shape of saved data need to be robust at the edges — partial saves, mixed shapes, and unforeseen old data triggering the defensive `legacy_notes` path. The `legacy_notes` fallback exists today as preservation infrastructure; if it ever fires unexpectedly, debugging will be brutal without a real test in place.

**4. Cumulative thought-unit table data integrity.** Six columns by Phase 4, read-only upstream rendering, after-line autocomplete depends on canvas line numbers. Open questions still un-ruled: row identity across phases, deletion cascade behavior (if a row is removed in Phase 1 after Phase 2 wrote `meaning` for it, what happens?), line-number refresh propagation when canvas content changes mid-flow.

**5. AI prompts silently failing on key drift.** As B-milestones rename and reshape question keys, prompts that read those keys could receive empty data and generate vaguely-plausible output against nothing. Silent failure mode — no crash, no error, just bad output that looks fine until read critically.

**6. Composite gate UX.** Field 4's three-question composite gate is the first precedent. The hover-checklist on the disabled gate is the load-bearing affordance — if it doesn't communicate clearly which sub-gate is blocking, the gate feels like obstruction rather than guidance. Each subsequent heavy-lifting field with a composite gate inherits the same risk.

**7. Sequencing gaps making the workspace feel incomplete (closed 2026-05-04).** Originally: C3 (Step 5 elevation) was gated on SADI's Step 5 walk. Closed when SADI's Step 5 per-field walks and SPRD C3 (Sermon Frame elevation between Blueprint and Manuscript) landed atomically in commit `b2ad01e`. Kept on the list as a closed entry for traceability. Future sequencing-gap risks against C2 / C4 / workspace-tour-rewrite would be their own entries.

**8. PC card removal at B4.** The card stops rendering, but the three top-level columns (`background_noise`, `audience_assumptions`, `topic_theme`) stay in the schema. Anything else in the codebase that reads those columns — AI prompts, exports, Study Guide generation — becomes an orphan reader and needs a sweep at the B4 cut.

---

## Remediation patterns already in motion

Patterns the implementation has already adopted that pre-empt categories of risk. Captured here so they don't get treated as gaps.

- **Test discipline at sub-item granularity.** A2.0 landed with 28 new tests; 197 vitest total green. Storage-shape edges are being actively covered, not assumed safe. Blunts category 3.
- **Deferral when a sub-item is premature.** A1.2's hover-checklist was deferred when single-question fields turned out to collapse to the trivial case. Pattern: don't build UX for problems that don't yet exist; pick it up when the conditions that need it land.
- **Defensive-only migration policy.** No production sermons exist 2026-05-04, so migration logic isn't being shipped. The `legacy_notes` fallback in `parseStructuredField` handles unforeseen legacy data without per-key mapping code being written.
- **Sub-item scoping.** Each milestone breaks into numbered sub-items (A1.0, A1.1, A1.2, A1.3, A2.0, A2.1, …) with one commit per sub-item.

---

## Surfacing risks

*None yet. Entries land here as risks surface during implementation.*

---

*That's it.*
