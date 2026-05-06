# Study Phase Re-Design (SPRD) — Planning Document

**Status:** SHIPPED. All A/B/C milestones complete by 2026-05-05. Workspace tour rewrite shipped 2026-05-05 (17 throughline-first stops). SADI Step 2 plumbing shipped 2026-05-05 (commit `0d98abd`). C4 closed by Phase 1 Background field retirement 2026-05-05. SPIP archived; per-milestone implementation history lives in git log + `CHANGELOG.md`. SFDI structural walks complete; SADI ratification + content-design walks complete.

This document is now a structural reference rather than a forward-looking plan. It preserves the load-bearing commitments and the eight design-question rulings; the rich design reasoning lives in git history and the SFDI/SADI working docs.

**Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user.
**Date drafted:** 2026-04-30. Trimmed to structural reference: 2026-05-05.

---

## Implementation milestones (A/B/C structure)

Thirteen milestones in three phases. **A** = the new Study UX shell. **B** = the four sub-phase reshapes. **C** = workspace polish.

| ID | Milestone | What shipped | Status |
|---|---|---|---|
| **A0** | Branch alignment | sub/sfdi → sub/sprd at `3a1554f` | ✅ |
| **A1** | Component 1 — spotlight foundation | per-question envelope shape; one field active at a time; "Next question" disabled-when-empty; per-question N/A toggle | ✅ |
| **A2** | Component 1 — structured-exercise sub-shapes | indented sentence canvas; paraphrase blocks; synthesis table; peripheral reference panel; pre-field overview screen; per-cell no-AI policy | ✅ |
| **B1** | Phase 1 (Observe) reshape | 8 fields after Background retirement (originally 9); Field 3 Divisions / Thought Units is the heavy-lifting field building the cumulative thought-unit table | ✅ |
| **B2** | Phase 2 (Interpret) reshape | 8 fields after Genre addition (originally 7); Field 7 Interpretation Synthesis extends cumulative table with Meaning column | ✅ |
| **B3** | Phase 3 (Redemptive Thread) reshape | 5 fields; Field 5 Christ-Connection Statement is the named outcome; cumulative table extends with Christ-Connection column | ✅ |
| **B4** | Phase 4 (Implications) reshape | 4 fields; three-way conversation (Theological / Personal / PC) at field level; Field 4 Implications Synthesis closes cumulative table at 6 columns; PC card removed | ✅ |
| **C1** | Sermon-level takeover (Component 2) | Sidebar hidden when `currentView === VIEW.Workspace`; single back affordance returns | ✅ |
| **C2** | Throughline visualization (Component 3) | `ThroughlineRail.jsx` — vertical sub-phase rail with field nodes + named-outcome callouts driven by `evaluateAdvance`; static (no animation) | ✅ |
| **C3** | Step 5 Sermon Frame elevation | new STAGE.Frame between Blueprint and Manuscript; v18 migration adds `sermon_frame` column; `FrameTab.jsx` reuses SpotlightWorksheet over Intro 4Q + Conclusion 4Q | ✅ |
| **C4** | ~~Background series-level inheritance~~ | CLOSED 2026-05-05 by Background field retirement — substance moved to series-level Book Study + Phase 2 Genre | ✅ closed |
| **C5** | AI prompt updates | per-phase Review prompts rewired to phase field arrays + flattenToText; tier 7 PC reads Phase 4 Field 3; MPS_DRAFT three per-question prompts replace WITH_PC/NO_PC pair | ✅ |
| **C6** | evaluateAdvance per-boundary thresholds | four sub-phase composite gates wired through B1–B4 cuts; renderer-side via `studyAdvancement.js`; B1.6 introduced the `{gates, firstReason}` structured shape | ✅ |
| **Tour rewrite** | Workspace tour — throughline-first reframe | 17 stops walking the cumulative thought-unit table + four named outcomes through MPT/MPS → Outline → FE → Frame → Manuscript → Delivery | ✅ |
| **SADI Step 2 plumbing** | MPT/MPS as proper SADI fields (post-SPRD follow-on) | new `sadiAnchorFields.js`; v19 `main_point_pair` envelope; SpotlightWorksheet over MPT 2Q + MPS 3Q; composite gate at Step 2 → Step 3 | ✅ |
| **Phase 1 Field 3 unified canvas** | structural revision of B1's Field 3 (post-SPRD follow-on) | three legacy questions (`sentence_layout` / `paraphrases` / `thought_units`) collapsed into one `unified-canvas` question; per-row UUIDs (`crypto.randomUUID`) carry cumulative-column attribution via `_canvas_row_id`; `deriveThoughtUnitsFromCanvas` materializes the canonical thought-unit array on save so Phase 2/3/4 cross-phase reads stay unchanged; `ParaphraseBlocks` retired; defensive read-merge in `parseStructuredField` for legacy three-question fixtures; SFDI working doc rewrite-with-historical-addendum | ✅ |

---

## Final rulings (eight design questions)

| Q | Ruling | Date | Anchor |
|---|---|---|---|
| **Q1** | Spine-routed sub-phase + step transitions through `applyMutation` | 2026-05-02 | commit `c87c307` |
| **Q2** | Reshape decisions (rename / merge / split / retire) live in SFDI walks | merged | SFDI working doc |
| **Q3** | Hard-disabled Continue with pastor-facing reason; SFDI per-boundary thresholds extend `evaluateAdvance` | 2026-05-02 | commit `ec3f960` |
| **Q3b** | Per-field N/A escape valve, scoped per question; gate-aware | merged | SFDI walks |
| **Q4** | Old-sermon exemption stays scoped to the original empty-evidence rule | settled | — |
| **Q5** | Synthesize + Compile direct-writes converted to proposal pattern | 2026-05-01 | ACCI A2, commit `2b0fa66` |
| **Q6** | PC modulation in AI prompts driven by SFDI per-field PC content | merged | SFDI working doc |
| **Q7** | Implications is one step with three voices (Theological / Personal / PC); content half lives in SFDI | structural settled | — |
| **Q8** | Inline AI Reviews are advisory carve-out; CORE.md Process #5 enforcement scoped to substitutive `ai_proposal`/`ai_apply` cycle | 2026-05-02 | CORE.md |
| **Q9** | Three vestigial fields cleanup handed off to audit triage | closed | audit triage memory |

---

## Structural commitments (the load-bearing four)

### 1. Named outcomes per sub-phase

Each sub-phase produces exactly one named outcome that the next sub-phase opens against. The named outcome sits *inside* the sub-phase, not after it. The handoff to the next sub-phase carries it forward.

Current set (refined during SFDI walks):
- Observe → **Observation Set**
- Interpret → **Interpretation Set**
- Redemptive Thread → **Christ-Connection Statement**
- Implications → **Implications Synthesis**

Substance lives in SFDI. Names may refine if SFDI lived-use surfaces issues.

### 2. Evidence at each boundary

Every sub-phase boundary fires a hard gate. Continue is hard-disabled with a clear "you can't advance until X" message when the work is insufficient. Three kinds of checks: **coverage**, **structural completeness**, **synthesis presence**.

The synthesis-producing boundaries (Interpret → RT, RT → Implications, Implications → MPT/MPS) use synthesis presence as their primary check. Earlier boundaries (Observe → Interpret) use coverage + structural completeness. Per-boundary thresholds live in SFDI; renderer-side gate via `evaluateAdvance` in `src/utils/studyAdvancement.js`. Same shape now extended to Step 2 → Step 3 via SADI Step 2 plumbing.

### 3. Pastoral Context enters progressively

PC progression: **awareness** (Observe) → **marination** (Interpret) → **texture** (Redemptive Thread) → **integration** (Implications). PC is one of three voices in Implications, not a parallel always-on card.

Two non-negotiables:
1. **PC absence never locks Study or any sub-phase.** Shell-level guarantee preserved at every resolution.
2. **AI prompts treat PC as enrichment, never as a precondition.** Every prompt that references PC phrases it conditionally. Tier 7 reads Phase 4 Field 3 (`pastoral_context.room_specifics` + `cost_and_gift`); the legacy three-column card is retired.

### 4. Isolated-world workspace UX overhaul

Three components, all shipped:
1. **Field-level spotlight** — one field active at a time with sequential questions; siblings collapsed; persistent prompts; "Next question" affordance disabled-when-empty.
2. **Sermon-level app-takeover** — Sidebar hidden when in Workspace view; single back affordance.
3. **Throughline visualization** — vertical rail with field nodes, named-outcome callouts, hover-checklist on disabled gate. Static (no animation).

---

## Migration policy

**Defensive only.** No production sermons exist as of 2026-05-04, so no migration logic shipped. The new question-keyed envelope shape is used from day one for every sermon. `parseStructuredField` carries a `legacy_notes` defensive path for unforeseen old data; no per-key auto-mapping logic was written.

If migration ever becomes real, **Option C (per-field legacy_notes)** is the spec — chosen over phase-level blob (scatters work) and per-key auto-pre-fill (auto-fills questions whose meaning has drifted).

---

## Cross-doc relationships

- **SFDI** owns content of Study fields. Charter (with Orientation): [`sfdi-charter.md`](sfdi-charter.md). Working doc (the 25 fields): [`study-field-definition-initiative.md`](study-field-definition-initiative.md).
- **SADI** owns content of anchor fields. Charter (with Orientation): [`sadi-charter.md`](sadi-charter.md). Working doc (the 4 anchor fields): [`sermon-anchor-definition-initiative.md`](sermon-anchor-definition-initiative.md).
- **CORE.md Process Contract #6** binds the workspace throughline to SFDI + SADI together.
- **ENFORCEMENT_STATUS.md** records current verification of every clause.
- **Sermon workspace system doc** ([`docs/SYSTEMS/sermon-workspace.md`](../SYSTEMS/sermon-workspace.md)) carries the verbatim PC progression articulation.
- **Tour spec** ([`sermon-workspace-tour.md`](sermon-workspace-tour.md)) carries the 17 throughline-first stops.
- **Archived implementation log** ([`docs/ARCHIVE/study-phase-implementation-plan.md`](../ARCHIVE/study-phase-implementation-plan.md)) preserves the per-milestone shipping record.

---

*End of trimmed SPRD planning document. Per-milestone reasoning, decision narrative, vocabulary glossary, screen-and-AI knock-on detail, and the full Q-record reasoning chain were dropped 2026-05-05 — all live in git history and the SFDI/SADI working docs. Restore from git if a future audit needs them.*
