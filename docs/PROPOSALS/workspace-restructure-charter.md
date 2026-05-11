# Workspace Restructure — Three-Step Sermon Arc (Study → Assembly → Manuscript)

> **Status (2026-05-10):** Shipped + merged to main. Three-stage shell (Study / Assembly / Manuscript) is the production workspace; unified Assembly trail across all four sub-phases is the production rendering. Pastor walkthrough closed. RW1 + RW2 + RW3 + RW5 + RW6 + RW7 + RW10 resolved here. RW4 + RW8 + RW9 resolved post-walkthrough; implementation queued on [`claude/workspace-trail-sequel`](https://github.com/teamofoxen/sermonforge/tree/claude/workspace-trail-sequel) (heavier step-boundary register + full tour rewrite). See [`workspace-trail-charter.md`](./workspace-trail-charter.md) for the sequel scope.
>
> **Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Plain language; technical specifics where they matter.
>
> **Relationship to other charters:**
> - [`workspace-trail-charter.md`](./workspace-trail-charter.md) — the rendering transformation. This charter changes what the trail is rendering; the trail charter's Phase B (Step 2 / MPT-MPS Forge) becomes the first sub-phase of the new Assembly step's trail.
> - [`sadi-charter.md`](./sadi-charter.md) — defines MPT/MPS + Intro/Conclusion as the two anchor *steps*. Under this proposal, they remain SADI-walked anchors but become anchor *sub-phases* of Assembly. Field content unchanged.
> - [`sfdi-charter.md`](./sfdi-charter.md) — defines Step 1 (Exegesis) content. Unchanged.
> - [`sprd-charter.md`](./sprd-charter.md) — sub-phase architecture pattern that Step 2 (Assembly) now inherits.
> - [`study-phase-redesign.md`](./study-phase-redesign.md) — sub-phase boundaries + composite gates. Pattern unchanged; just applied at one more layer.
>
> **Scope:** Sermon workspace top-level structure only. Dashboard, Calendar, Series Planner, sidebar, settings — all untouched.

---

## Orientation

The arc, in one sentence: **the pastor walks one trail from text to delivered manuscript, in three steps that match the work — Study (deepen into the text), Assembly (build the sermon), Manuscript (write it).**

### Why this exists

The current workspace has four top-level stages (Study, Blueprint, Frame, Manuscript) plus four sub-steps inside Study (Exegesis, MPT/MPS, Outline, Functional Elements). That's eight stops on an organizational map for one sermon — but the *work* doesn't have eight beats. It has three:

1. **Read the text deeply.** (Exegesis, currently Study Step 1.)
2. **Build the sermon from what the text gave.** (Currently distributed across Study Step 2 / 3 / 4 + Blueprint + Frame.)
3. **Write the manuscript.**

The current structure was inherited from Merida's CCE framework, which is a *teaching* framework — it names every distinct cognitive move the preacher makes. SermonForge keeps the cognitive moves (every field, every named outcome, every SADI walk stays) but recognizes that they don't all need top-level workspace stages. The cognitive moves of building a sermon — anchoring the meaning, structuring the body, equipping each point, framing the start and end — are all part of one continuous assembly arc.

Step 1 (Exegesis) is already shaped as one Study step with four sub-phases (Observe / Interpret / Redemptive Thread / Implications). That works because the pastor isn't really "stepping" between sub-phases — they're deepening through one larger movement. The same is true of assembly-side work. The pastor moves from MPT/MPS to Outline to FE to Frame not because they've entered a new mode, but because they're deepening a single building movement. Four sub-phases of one Assembly step matches that better than four top-level steps + a Blueprint review.

### The qualitative test

When the pastor opens a sermon, the workspace shows three steps. They walk into Study, deepen four times into the text, and arrive at an Implications Synthesis. They walk into Assembly, anchor a Main Point Pair, outline the body, equip each point, frame the start and end. They walk into Manuscript and write. Each top-level step is a real movement of the work. No step feels like an organizational artifact. If at any point the pastor thinks "why is this its own thing?", the structure hasn't shipped yet.

---

## The new structure

### Three steps, top-level

| # | Step | What it is | Sub-phases |
|---|------|-----------|------------|
| **1** | **Study** | Deepen into the text. | Observe → Interpret → Redemptive Thread → Implications |
| **2** | **Assembly** | Build the sermon from what the text gave. | Anchor → Outline → Equip → Frame |
| **3** | **Manuscript** | Write the sermon. | (one continuous writing surface) |

### Step 2 (Assembly) — four sub-phases

Each sub-phase mirrors Step 1's existing pattern: its own clearing-walk, its own composite gate, its own pause-clearing with a named outcome.

| Sub-phase | Inner work | Named outcome | Source |
|-----------|-----------|---------------|--------|
| **Anchor** | MPT (draft, tighten) + MPS (translate, gospel-check, tighten) | **Main Point Pair** | SADI Step 2 — unchanged |
| **Outline** | Build the body's outline points (N points, typically 3–5) | **Sermon Outline** | New named outcome (SFDI follow-on) |
| **Equip** | Per outline point: Scripture, Explanation, Application, Illustration | **Sermon Body** | New named outcome (SFDI follow-on) |
| **Frame** | Intro (4Q) + Conclusion (4Q) | **Sermon Frame** | SADI Step 5 — unchanged |

The pastor walks one trail through Assembly with four pause-clearings spaced through it — one after each sub-phase — naming what they just built. By the time they reach Manuscript, four named outcomes sit in their hand: Main Point Pair, Sermon Outline, Sermon Body, Sermon Frame. The manuscript is what binds them together as preachable prose.

### Step boundaries (top-level pauses)

| Boundary | What it marks |
|----------|---------------|
| Study → Assembly | "You have heard the text. Now build what you'll preach." |
| Assembly → Manuscript | "You have built the sermon's bones, body, and frame. Now write." |

Both top-level pauses are step-boundary clearings (mirroring the trail's existing Implications → MPT/MPS pause and the Frame → Manuscript pause that already exists in concept). The Study → Assembly pause carries the Implications Synthesis forward as the substrate; the Assembly → Manuscript pause displays all four named outcomes as a final review before the writing.

---

## What stays (binding from prior initiatives)

This is a structural restructure, not a content rewrite. Everything below carries forward unchanged.

| Initiative | What carries forward unchanged |
|---|---|
| **SFDI** | All 25 Exegesis field definitions, 4 sub-phase named outcomes, 4 sub-phase boundary handoffs |
| **SADI** | MPT (2Q) + MPS (3Q) — the Main Point Pair walk. Intro (4Q) + Conclusion (4Q) — the Sermon Frame walk. SADI's anchor-walk *content* is unchanged; only the *level* at which it lives changes (anchor sub-phase rather than anchor step) |
| **SPRD** | Per-question envelope, composite gates, hard-disabled Continue with pastor-facing reason, evidence-gated transitions |
| **ARI** | AI is gone. Stays gone. No new AI surface introduced |
| **Process Contract** | All six clauses unchanged |
| **Save flow / IPC** | Untouched at the field-write layer |

---

## What changes

### Contract changes ([`src/core/contracts.ts`](../../src/core/contracts.ts))

**`Stage` enum** collapses from four visible stages to three:

```ts
// Before
export type Stage = "Study" | "Blueprint" | "Frame" | "Manuscript" | "Delivery";

// After
export type Stage = "Study" | "Assembly" | "Manuscript" | "Delivery";
```

`Blueprint` and `Frame` retire as top-level stages. `Delivery` stays admissible (legacy data with `current_stage = "Delivery"` still parses) but stays off the visible tab strip — same shape as today's ARI Phase 7 handling.

**`Step` enum** retires entirely. Today's `Step` ("Exegesis" | "MPT_MPS" | "Outline" | "FunctionalElements") was Study's within-stage position. Under this proposal, Study has no inner steps — it's just Exegesis, with its four sub-phases. The within-stage layer is now the sub-phase, which already exists.

**`SubPhase` enum** extends. Today's enum covers Study's four sub-phases (Observe / Interpret / RedemptiveThread / Implications). Assembly needs its own:

```ts
export type SubPhase =
  // Study sub-phases (unchanged)
  | "Observe" | "Interpret" | "RedemptiveThread" | "Implications"
  // Assembly sub-phases (new)
  | "Anchor" | "Outline" | "Equip" | "Frame";
```

Note `Outline` and `Frame` are sub-phase names, not stage names anymore. `ProcessPosition` updates accordingly:

```ts
export interface ProcessPosition {
  stage: Stage;
  subPhase?: SubPhase;  // present whenever the pastor is inside a step that has sub-phases (Study, Assembly)
}
```

The `step?: Step` field retires from `ProcessPosition`.

### Column changes ([`src/core/contracts.ts`](../../src/core/contracts.ts) — `SERMON_COLUMNS`)

The data layer barely moves. Each Assembly sub-phase keeps its existing column:

| Sub-phase | Existing column | Status |
|-----------|----------------|--------|
| Anchor | `main_point_pair` (v19) | Unchanged |
| Outline | `outline` | Unchanged |
| Equip | `functional_elements` | Unchanged |
| Frame | `sermon_frame` (v18) | Unchanged |

The flat-column mirrors (`mpt`, `mps`) also unchanged.

No schema migration. No new columns. The `current_stage` / `current_step` / `current_sub_phase` columns from v17 stay — `current_step` becomes legacy-tolerated (parsed but ignored) the same way `Delivery` is tolerated. Or it can be repurposed for the Manuscript stage's eventual sub-phases if those land later — that's an open question (RW3 below).

### Gate changes ([`src/utils/studyAdvancement.js`](../../src/utils/studyAdvancement.js))

Today's per-step composite gates become per-sub-phase composite gates:

| Today | Tomorrow |
|-------|----------|
| `evaluateAdvance(sermon, "step", 1)` — Implications → MPT/MPS | `evaluateAdvance(sermon, "sub_phase", "Implications" → "Anchor")` — same content, sub-phase boundary |
| `evaluateAdvance(sermon, "step", 2)` — MPT/MPS → Outline | `evaluateAdvance(sermon, "sub_phase", "Anchor" → "Outline")` — same gates |
| `evaluateAdvance(sermon, "step", 3)` — Outline → FE | `evaluateAdvance(sermon, "sub_phase", "Outline" → "Equip")` — same gates |
| (Stage advance: Study → Blueprint, → Frame, → Manuscript) | `evaluateAdvance(sermon, "sub_phase", "Equip" → "Frame")` + step boundary Assembly → Manuscript |

The composite-gate *content* (MPT non-empty, MPS non-empty, outline has points, etc.) stays exactly the same. Only the routing layer (`canonicalStep` / `canonicalSubPhase` / spine) reshapes around the new sub-phase enum.

### Spine routing ([`src/core/spine.ts`](../../src/core/spine.ts), [`electron/spine.cjs`](../../electron/spine.cjs))

`transitionState({ to: STEP.MPT_MPS, ... })` becomes `transitionState({ to: SUB_PHASE.Anchor, ... })`. Process Contract clauses #1 (monotonic) and #2 (empty evidence) still apply at the new boundary — the only thing changing is the enum value passed across the IPC boundary.

### Workspace shell ([`src/components/SermonWorkspace.jsx`](../../src/components/SermonWorkspace.jsx))

The top-level tab strip drops from four tabs to three. The `OutlineTab` (currently rendered on `STAGE.Blueprint`) retires from the workspace — its review-of-outline view was a separate read-only stage between Study and Frame, and that beat now happens *inside* Assembly's Outline sub-phase. The `FrameTab` retires from the workspace as a stage and becomes Assembly's Frame sub-phase.

Per the trail charter, the tab strip itself eventually retires when the workspace trail ships everywhere; until then, three tabs replace four.

### Trail charter implications

The [`workspace-trail-charter.md`](./workspace-trail-charter.md) needs to update to reflect the new structure. Specifically:

- **Phase A** (Study Step 1 / Exegesis trail) — unchanged. Already shipped.
- **Phase B** (Step 2 / MPT-MPS Forge trail) — already shipped as `StudyTrailForge.jsx`, but its scope changes: it's no longer "the trail for a separate Step 2," it's "the Anchor sub-phase clearing inside the Assembly trail." The component itself stays valid; the parent (`StudyTab.jsx` or a new `AssemblyTab.jsx`) decides which sub-phase to render.
- **Phases C / D / E / F** (Outline / FE / Frame / Manuscript trails) — collapse. C + D + E become sub-phase renderings inside one Assembly trail. F (Manuscript writing room) stays its own thing.
- **DW1** (Step 2 geometry — horizontal single row) — re-scoped. Assembly's trail geometry becomes the canonical four-sub-phase shape, matching Step 1's switchback. The Anchor sub-phase's two-stop horizontal row becomes one row of Assembly's switchback.
- **DW2** (Main Point Pair pause shape) — preserved as-is. The pair clearing renders at the Anchor → Outline sub-phase boundary inside Assembly.

The trail charter gets a banner update + a phasing rework.

### CHANGELOG / docs

`CLAUDE.md` references `STAGE` and step numbers in a few places — drift-check passes today but will flag after this lands. SFDI / SADI charters reference "Step 2" and "Step 5" by their old top-level numbering; they get banner-tagged with the new sub-phase mapping. CHANGELOG entry per phase below.

---

## What goes away

| Surface | What | Why |
|---------|------|-----|
| **`STAGE.Blueprint`** | The outline-review top-level tab | Outline review happens inside Assembly's Outline sub-phase; no separate stage needed |
| **`STAGE.Frame`** | The Intro/Conclusion top-level tab | Becomes Assembly's Frame sub-phase |
| **`Step` enum** | The within-Study step layer (Exegesis / MPT_MPS / Outline / FunctionalElements) | Study is now one step with sub-phases; the within-Study step layer collapses into the sub-phase layer |
| **`StudyStepStrip`** ([`src/components/StudyTab.jsx`](../../src/components/StudyTab.jsx)) | The horizontal Study step strip | No within-Study step layer anymore; just sub-phases (already handled by the existing throughline rail / trail) |
| **Step 2/3/4 step-boundary pauses** | Three step-boundary transitions inside today's Study | Replaced by sub-phase-boundary pauses (same content, lighter routing) |

---

## Named outcome details (SFDI follow-on)

Two new named outcomes are introduced for sub-phases that currently don't have them — Outline and Equip. These need to be ratified at SFDI/SADI level before they ship, because they govern what the pause-clearings produce.

### Sermon Outline (Outline sub-phase named outcome)

The outline of the sermon's body — the N points that serve the MPS, in order. The pause-clearing prompt: "In one short paragraph, what is the body of your sermon? Name the points and the line that connects them."

Persists in the existing `outline` column. The pause's prose synthesis stores under a new `_synthesis` envelope key on that column, mirroring how Exegesis sub-phases store theirs.

### Sermon Body (Equip sub-phase named outcome)

The outline equipped — each point with its Scripture / Explanation / Application / Illustration. The pause-clearing prompt: "Reading your equipped body — each point with its scripture, explanation, application, illustration — does the body land? Where does it still need work?"

Persists in `functional_elements` with a `_synthesis` key.

### Sermon Frame (Frame sub-phase — already exists)

Intro framing the start + Conclusion framing the end. Already named in SADI Step 5. The pause-clearing displays both as a paired outcome (same shape as the Main Point Pair pause).

These are first-draft names. The user (developer-pastor) gets to refine before ratification — that's the open question RW1 below.

---

## Open design questions

Continuing the D-question numbering style, namespaced `RW` (restructure).

### RW1 — Named outcome wording for Outline + Equip

The "Sermon Outline" / "Sermon Body" names above are first-pass. Alternatives:
- Outline: Body Outline, Outlined Argument, Body Skeleton, Sermon Frame (no — collides with Frame), Skeleton
- Equip: Equipped Body, Furnished Body, Body Content, Loaded Body, Embodied Outline

The names need to read at the pause-clearing in the same register as Main Point Pair / Sermon Frame.

**Resolved 2026-05-10 — `Sermon Outline` (Outline sub-phase) + `Sermon Body` (Equip sub-phase).** First-pass names locked for implementation. Rationale: both names read as a noun-phrase artifact (parallel to Main Point Pair / Sermon Frame), both prefix with "Sermon" to mark them as deliverables of the sermon-prep arc rather than of the source text, and the pair maps to the work's natural sequence (outline shape → outline filled). The user-pastor reserves the right to refine on lived sermon-prep — see RW10's drift-sweep budget for re-rendering after final naming.

### RW2 — Outline → Equip sub-phase boundary gate

Currently the workspace gates Outline → FE by "outline has at least one point." That stays. The composite gate for Outline → Equip could tighten — e.g., "every outline point has non-empty text" — but that's a content-side decision that affects pastor experience. Decide before shipping.

**Resolved post-walkthrough — every outline point must have non-empty text.** Two gates fire at the Outline → Equip boundary:
1. `outline_has_points` — outline.length >= 1 (preserves the prior baseline)
2. `outline_all_named` — every point's text is non-empty after trim

A placeholder row with empty text isn't a real outline point; letting it through to Equip surfaces an FE editor for a point the pastor hasn't actually named. The composite returns `firstReason` naming the empty indices so the disabled-Continue UI is actionable. Implemented in `checkOutlineToEquipThreshold` (`src/utils/studyAdvancement.js`).

### RW3 — Manuscript sub-phases

The Manuscript step is currently treated as one continuous surface. Long-term, it might want sub-phases (Draft / Revise / Tune). Out of scope for this restructure; flag as future work. The `current_step` column gets repurposed-or-retired based on whether Manuscript ever gets sub-phases.

**Resolved post-walkthrough — Manuscript stays a single continuous surface.** The pastor's mental beat at Manuscript is "I'm writing the sermon," not "I'm in Draft mode, then Revise mode." Sub-phases would force a structure that contradicts the work's actual shape (sustained long-form writing, not a question-walk). `current_step` stays retired as legacy-tolerated; no sub-phase layer added. Revisit if lived prep over multiple sermons shows the surface needs internal beats.

### RW4 — Step-boundary pause shape (Study → Assembly)

The existing Implications → MPT/MPS pause (currently a step-boundary pause) carries Implications Synthesis as the substrate. Under the new structure it becomes a step-boundary pause from Study to Assembly. Does its visual treatment change? The trail charter's Phase B preserved this pause as part of the Exegesis trail's outbound clearing; the new structure could either keep that or elevate the step-boundary pause to a different visual register.

**Resolved post-walkthrough — heavier visual register at step boundaries.** Study → Assembly + Assembly → Manuscript are different beats from sub-phase pauses; they carry summative weight (multiple named outcomes from a whole stage's work). The visual register should reflect that — larger title, more breathing room, and the four-outcome summary card pattern (currently in `AssemblyToManuscriptPause`'s tab-strip fallback) becomes canonical. Implementation deferred to sequel branch (see workspace-trail-sequel arc).

### RW5 — Step-boundary pause shape (Assembly → Manuscript)

After Assembly's Frame sub-phase, the pastor crosses into Manuscript. Today this transition is the Frame → Manuscript advance (gated by Sermon Frame composite). Under the new structure, the step-boundary pause displays all four Assembly named outcomes — Main Point Pair, Sermon Outline, Sermon Body, Sermon Frame — as a final review.

That's a richer pause-clearing than anything that exists today. Design it deliberately.

### RW6 — Inside-Assembly sub-phase counts

Anchor has 2 fields (MPT, MPS). Frame has 2 fields (Intro, Conclusion). Outline and Equip have variable N (typically 3–5 points). The trail's switchback geometry assumes evenly-distributable field counts; Outline + Equip's variable shape needs its own visual mode (worktree experiment DW3 / DW4 already flagged this).

### RW7 — Sermon migration

No production sermons exist (per `feedback_verify_migration_concerns.md` — 2026-05-04 baseline). Confirm this is still true before locking. If still true, no migration logic is needed — the contract change just lands. If sermons exist, write a migration that maps `current_step` / `current_stage` values to the new sub-phase positions.

**Resolved 2026-05-10 — no migration needed.** Baseline holds (no production sermons exist). Contract change lands without migration scaffolding. `current_step` column gets legacy-tolerated (parsed, ignored) the same way `Delivery` stage is tolerated post-ARI; `current_stage` values `Blueprint` and `Frame` get coerced to `Assembly` on read for safety.

### RW8 — Tour rewriting

The Sermon Workspace Tour anchors stops on selectors that change with this restructure. Tour either retires (per trail charter DW10) or gets re-anchored after this lands.

**Resolved post-walkthrough — full rewrite to match the workspace trail.** The tour gets re-authored end-to-end against the trail surfaces (not just re-anchored at selectors). Tracked together with DW10. Sequel-branch work.

### RW9 — Top-level pause-clearings vs sub-phase pause-clearings (visual register)

Step 1 sub-phase pauses today look one way (paper-grain clearing, single textarea, named outcome). The Step 2 → Step 3 pause (Main Point Pair, shipped in Phase B) looks similar but stacks two values. Step-boundary pauses (Study → Assembly, Assembly → Manuscript) under the new structure carry more weight — multiple named outcomes, summative. Do they get a heavier visual register (larger title, more breathing room) or the same shape as sub-phase pauses?

**Resolved post-walkthrough — yes, heavier register at step boundaries.** Same answer as RW4. Sub-phase pauses stay light (a single named outcome, paper-grain clearing); step-boundary pauses elevate (larger title, more breathing room, multi-outcome summary card). Implementation deferred to sequel branch.

### RW10 — Vocabulary across docs

The terms "Step 2," "Step 3," "Step 4" appear in many doc references. They get re-mapped:
- Step 2 → Anchor sub-phase
- Step 3 → Outline sub-phase
- Step 4 → Equip sub-phase

A drift-sweep pass after the restructure lands cleans the docs. SADI's "Step 2 / Step 5 anchor steps" → "Anchor / Frame anchor sub-phases."

---

## Non-negotiables

- **Zero data regression.** Every field's saved state round-trips through its existing column. No schema migration is part of this restructure.
- **All SFDI / SADI / ARI commitments preserved.** Field definitions, named outcomes, anchor walks, the pastor-authored end-to-end commitment — all intact.
- **Composite gates remain binding.** Every existing gate fires at its renamed boundary; gate content unchanged.
- **No legacy fallback.** Once the restructure lands, the old `STAGE.Blueprint` / `STAGE.Frame` tabs are gone. The trail charter's trail-suppression toggle remains a separate concern.
- **Pastor-authored end-to-end.** ARI's removal of AI is preserved everywhere.

---

## Phasing

Each phase ends in a green-state worktree commit + drift-check PASS. Pastor-test gates per phase deferred per user instruction; the developer-pastor exercises lived sermon-prep through the surface before merge to main.

| Phase | Scope | Ships when |
|---|---|---|
| **0** | Charter ratified, named outcomes decided (RW1) | This proposal reviewed; RW1 + RW2 + RW9 resolved |
| **1** | Contract change — `Stage` collapses, `SubPhase` extends, `Step` retires | `src/core/contracts.ts` + `electron/contracts.cjs` updated; assertSchemaContract still passes; renderer + main side compile |
| **2** | Spine routing — `transitionState` accepts new sub-phase enum values; `canonicalStep` retires; `canonicalSubPhase` extends | Spine tests pass; cross-stage transitions still validate |
| **3** | Gate renaming — `evaluateAdvance` gate keys map to new boundaries; content unchanged | Existing gate behavior preserved across boundary renames |
| **4** | Workspace shell — three-tab top strip; `OutlineTab` + `FrameTab` retire as stages | Tabs render three values; Assembly tab routes to new `AssemblyTab.jsx` parent |
| **5** | Trail integration — Assembly trail (one trail across four sub-phases) | ✅ Shipped 2026-05-10 — [`AssemblyTrail.jsx`](../../src/components/AssemblyTrail.jsx). Switchback geometry mirrors Exegesis; row 1 (Anchor MPT/MPS → MPP pause) replaces the retired `StudyTrailForge` |
| **6** | Outline + Equip sub-phase renderings (DW3 / DW4 resolved) | ✅ Shipped 2026-05-10 — workshop-clearing for both; named outcomes Sermon Outline + Sermon Body display the structured artifact at each sub-phase boundary |
| **7** | Step-boundary pause-clearings (RW4 + RW5) | RW5 shipped (Assembly → Manuscript Sermon Frame pause displays Intro + Conclusion; AssemblyToManuscriptPause four-outcome summary lives in the tab-strip fallback). RW4 (Study → Assembly visual register) — open |
| **8** | Cross-doc drift sweep (RW10) | SFDI / SADI / SPRD / ARI / workspace-trail-charter banner-tagged or updated; CLAUDE.md updated; CHANGELOG entry |
| **9** | Tour replacement (RW8) | Tour either re-anchored to new surfaces or retired with inline guidance |
| **10** | Pastor testing — full end-to-end sermon | Dev-pastor preps at least one sermon through the restructured workspace **in the Electron app** (browser preview can't exercise the data layer; verification is lived prep, not preview clicks) |

Phases 1 → 4 are the heart of the restructure. Phases 5+ build on it. Each phase can ship as its own commit in the worktree.

---

## Process & guardrails

- **Per-phase pattern.** One phase, one branch, one commit, one CHANGELOG entry.
- **RW-question resolution.** Each open question gets a short working note appended here when decided, with date + rationale. Don't silently pick in code.
- **Non-negotiable check before each commit.** Data round-trips, dark mode dissolves, composite gates still block at their renamed boundaries, save flow untouched.
- **Coordinate with workspace-trail-charter.** This restructure invalidates the trail charter's per-step phasing. Update both charters together at Phase 5.
- **Drift-sweep after every phase that touches contracts or docs.** Phases 1, 4, 8 minimum.

---

## Pre-execution checklist

Before Phase 1 starts:

- [ ] This charter reviewed; RW1 (named outcomes) decided
- [ ] RW7 confirmed (no production sermons → no migration needed)
- [ ] Workspace-trail-charter Phase B build session log acknowledges the upcoming re-scope
- [ ] Drift-check PASS on the current worktree (so the baseline is clean)
- [ ] CHANGELOG slot reserved for the restructure entries

---

## What this charter does NOT do

- Touch Dashboard, Calendar, Series Planner, Setup, sidebar, settings, or any non-sermon-workspace surface
- Re-introduce AI in any form
- Change save flow, IPC, or schema columns
- Rewrite SFDI / SADI / ARI content — only their references
- Decide visual modes for Outline / Equip sub-phases (DW3 / DW4 in the trail charter — still open)
- Decide Manuscript sub-phases (RW3 — out of scope)
- Cut over the workspace trail to default-on (that's the trail charter's Phase L)

It surfaces the restructure, the open decisions, and the phasing. It commits to the *direction*: three steps that match the work, sub-phases that carry the existing content, no data churn.

---

## Index entries (memory + cross-refs)

When this charter lands:

- New memory: `project_workspace_restructure_state.md` — pointer to this charter, current phase, current open RW-questions
- Cross-ref from `project_workspace_trail_state.md`: trail charter's per-step phasing rescopes around the new structure
- Cross-ref from `project_sadi_state.md`: SADI's anchor *steps* become anchor *sub-phases* (Anchor + Frame)
- Cross-ref from `project_sprd_sfdi_state.md`: SPRD's sub-phase architecture pattern now applies at one more layer
