# Workspace Trail Charter — Trail Metaphor Across the Whole Sermon Workspace

> **Sequel arc closed (2026-05-11):** All eight items shipped on `claude/workspace-trail-sequel` (6 commits, +1568/-156 across 13 files). The trail is now the sole user-facing rendering of every stage. × Exit returns to the Dashboard. Pending merge into main.
>
> | Item | Resolution(s) | Files / surfaces |
> |---|---|---|
> | 1 — Heavier step-boundary pauses | RW4 + RW9 + DW9 | `StageBoundaryPause` in `studyTrailShared.jsx`; Implications-pause (Study→Assembly) + Frame-pause (Assembly→Manuscript) read back the stage's four named outcomes with the terminal outcome editable inline. CSS `.tw-clearing-stage-pause`. |
> | 2 — Manuscript writing room | DW5 | New `ManuscriptTrail.jsx` wraps `ManuscriptTab` in the `.tw-shell-writing-room` shell — Ink topbar, scripture column on the right, 820px reading-column body, soft enter animation. |
> | 3 — Camera handoff between stages | DW7 | CSS `tw-trail-handoff` keyframe + 0.55s ease-out on `.tw-shell`. Per-stage STOPS arrays were already in code; the missing piece was the visual handoff motion. |
> | 4 — Stage-level overviews | DW12 | `StageOverview` + `useStageOverviewSeen(stageKey)` (sessionStorage). Fires once per session on first mount of Assembly + Manuscript; reads back prior-stage outcomes + previews this stage's. |
> | 5 — Per-stage notebook | DW8 | `NotebookDrawer` + `useNotebookToggle` — bottom slide-up, gold pill toggle in topbar, Cmd/Ctrl+N. Wired into all three trails; persists to `notebook_study` / `notebook_blueprint` / `notebook_manuscript`. |
> | 6 — Workspace Trail Map | DW11 | New `WorkspaceTrailMap.jsx` modal. Single-screen three-row switchback (Study → Assembly → Manuscript) with 9 sub-phase stops and named-outcome labels. Current location pinned. Clean — no checklists, no counters, no per-field labels. |
> | 7 — Tour rewrite | RW8 + DW10 | `WORKSPACE_TOUR_STOPS` re-anchored to trail surfaces. Stops 1/2/11 retitled. New `data-tour-id` attrs on TrailTopBar h1, Map button, trail clearings, Assembly sub-phase clearings, writing-room body. Spec doc banner-tagged. |
> | 8 — Trail-suppress escape hatch retired | (final cutover) | `trailSuppressed` state removed from StudyTab + AssemblyTab + ManuscriptTrail. × Exit / Esc route to `onClose` → Dashboard. `sermonforge_trail_disabled` localStorage flag retained only as a contract-test escape (the two `process-*-evidence`/`movement` tests still set it; migrating those tests onto the trail surface is the only remaining cleanup). |
>
> Pastor-test gate (Phase M) is the next user-driven step: at least one full sermon prepped from text to manuscript through the trail, validating the qualitative "feels continuous" test from this charter's Orientation section.

> **Post-walkthrough status (2026-05-10):** Stages A–E shipped + pastor-tested + merged to main. Per-stage trail surfaces are the production rendering for Study + Assembly. The remaining DW-questions resolved post-walkthrough land on the sequel arc.
>
> **Sequel branch:** [`claude/workspace-trail-sequel`](https://github.com/teamofoxen/sermonforge/tree/claude/workspace-trail-sequel) — the working branch for the polish queue listed below. The trail-suppress escape hatch retires when this arc lands; everything else gets implemented incrementally without a feature-flag layer.
>
> - **Stage A** (Study Step 1 / Exegesis trail) → [`StudyTrailExegesis.jsx`](../../src/components/StudyTrailExegesis.jsx). Shipped.
> - **Stages B + C + D + E** (Anchor + Outline + Equip + Frame) → one unified [`AssemblyTrail.jsx`](../../src/components/AssemblyTrail.jsx) switchback with workshop-clearings for Outline + Equip. Shipped.
> - **Stage F** (Manuscript writing-room) → DW5 resolved (yes, writing-room mode); implementation on the sequel arc.
> - **Stage G** (workspace shell retirement) → partially shipped: tab strip collapsed 4 → 3, OutlineTab / FrameTab deleted as standalone stages. Trail-suppress falls through to the sub-phase tab strip inside AssemblyTab as a temporary escape hatch (retires on the sequel arc).
>
> Resolved through the merged arc: DW1, DW2, DW3, DW4. Resolved post-walkthrough and queued for the sequel arc: DW5, DW6, DW7, DW8, DW9, DW10, DW11, DW12, DW13, DW14, DW15. RW4 + RW8 + RW9 (workspace-restructure-charter) also queued there. See each question's resolution note below for the binding decision.
>
> See [`workspace-restructure-charter.md`](./workspace-restructure-charter.md) for the structural restructure that supersedes this charter's per-step phasing. The trail-rendering goals (single immersive walk, contemplative pause-clearings, named-outcome handoffs) remain binding.

> **Status:** Drafted 2026-05-10. Phase A (Study Step 1) shipped via [`study-trail-charter.md`](./study-trail-charter.md). **Phase B (Study Step 2 / MPT/MPS Forge) landed 2026-05-10 in worktree `thirsty-bell-2d469b`** — DW1 + DW2 resolved, `StudyTrailForge.jsx` built as parallel sibling to the Exegesis trail, mount conditions split per-step in `StudyTab.jsx`, cross-step look-back routes through the spine. Phases C–M open. After all phases land, the legacy three-column shell, the tab strip, and the throughline rail all retire from the sermon workspace.

> **Phase B build session log — 2026-05-10:** DW1 (horizontal single-row geometry) and DW2 (stacked editable Main Point Pair pause-clearing) resolved. `StudyTrailForge` walks MPT (2Q) → MPS overview → MPS (3Q) → Main Point Pair pause → Step 3. Composite step-gate (`evaluateAdvance(sermon, "step", 2)`) blocks advance at MPS Q3 until both MPT + MPS tighten answers exist. N/A link surfaces only on MPS Q2 (gospel_check) per SADI. Cross-step look-back from MPT Q1 routes `await jumpToStep(1)` so the Exegesis trail re-mounts cleanly; pause look-back routes `await jumpToStep(2)` so the Forge trail stays mounted after the pausePoint clears. Trail-suppress toggle (`× Exit` + Esc + "Trail mode →" re-entry) extended to `activeStep === 2`. Verified end-to-end in browser preview at 1440×900: walk MPT Q1 → MPS Q3 → pause → walk-on hands off to Step 3 Outline legacy; look-back from pause restores MPS Q3 with answer preserved; look-back from MPT Q1 mounts Exegesis. Drift-check PASS. Pastor-test gate (Phase M) deferred per user instruction.
>
> **Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Plain language; technical specifics where they matter.
>
> **Relationship to other charters:**
> - [`study-trail-charter.md`](./study-trail-charter.md) — Step 1 (Exegesis) trail. This charter's Phase A.
> - [`sfdi-charter.md`](./sfdi-charter.md) — Step 1 content. Unchanged.
> - [`sadi-charter.md`](./sadi-charter.md) — Step 2 + Step 5 anchor fields. Content unchanged.
> - [`ai-removal-initiative.md`](./ai-removal-initiative.md) — pastor-authored end-to-end. Preserved.
> - [`study-phase-redesign.md`](./study-phase-redesign.md) — sub-phase architecture. Preserved.
>
> **Scope clarification:** "workspace" here means the **sermon workspace** — the stages of building one sermon (Study → Frame → Manuscript). Dashboard, Calendar, Series Planner, and other higher-level surfaces are out of scope.

---

## Orientation

The arc, in one sentence: **the pastor walks one trail from text to delivered manuscript.** No tabs. No three-column shell. No separate throughline rail showing the journey alongside the work — the *trail itself* is the throughline. The pastor enters the workspace at Step 1 Field 1 (Context, Q1), walks through 25 Exegesis fields + 4 sub-phase pauses + 2 anchor steps + the body work + the Sermon Frame + the Manuscript, and exits with a sermon ready to preach.

Where the sermon-prep work changes shape across the journey — clearing-walks for Study, anchor-forging for Step 2/5, assembly for Step 3/4, sustained writing for Manuscript — the *visual mode* of the trail adapts. But the throughline metaphor holds: every step is a stop on one continuous walk.

### Why this exists

The Step 1 trail experiment showed what the legacy shell can't deliver: the felt-quality of *walking* deepening exegesis, with each beat given the whole screen, with completed work receding behind, with the throughline rendered *as the surface itself* rather than alongside it as a status panel.

Steps 2-5 and Manuscript are still in the legacy shell. The handoff from trail (Step 1) to legacy (Step 2+) is jarring — the contemplative walk dies the moment the pastor advances past the Implications pause, replaced by a tab strip, a three-column layout, and a different visual language. The throughline rail is supposed to bridge this, but it's a status display, not the work.

This charter retires the legacy shell across the sermon workspace. Every step gets the trail's contemplative single-clearing rendering, adapted for its specific work-shape. The throughline becomes the trail itself; the rail goes away.

This is not just polish. The sermon-prep work *is* a continuous deepening journey from text to delivered word. The legacy shell renders it as a stack of unrelated workspaces. The trail renders it as what it is.

### The non-negotiables

- **Zero data regression.** Every step's saved state round-trips through its existing column envelope. No schema migration is part of this initiative.
- **Heavy-lifting editors keep their UX.** Unified canvas, synthesis tables, outline builder, functional elements editor, manuscript editor — all mount inside the trail's appropriate visual mode unchanged.
- **Composite gates remain binding.** Every existing gate (sub-phase boundary, step boundary, stage boundary) still fires. The gate UI is reskinned per stage's mode, not removed.
- **All SFDI / SADI / ARI commitments preserved.** Field counts, named outcomes, anchor fields, the four named outcomes of Step 1, the Main Point Pair, the Sermon Frame — all intact.
- **Pastor-authored end-to-end.** ARI's removal of the AI subsystem is preserved. Nothing in this transformation re-introduces AI.
- **No legacy fallback in the sermon workspace.** Once the workspace trail ships across all stages, the legacy shell is *gone* from the sermon workspace. (Dashboard / Calendar etc. unaffected.)

### The qualitative test

When the pastor enters the workspace and walks through to Manuscript export, the journey *feels* continuous. The transition from Step 1's last clearing into Step 2's MPT clearing reads as the next bend of the same trail, not a tab switch. By the time they reach Manuscript, the foundation for the writing has been *walked into* — the sermon doesn't need to be reconstructed in the head because the trail held it. If at any stage transition the pastor feels like they've left one app and entered another, the transformation hasn't shipped yet.

---

## What stays (binding from prior initiatives)

Same as `study-trail-charter.md`'s "What stays" — every content commitment from SFDI, SADI, ARI, SPRD is preserved. This charter is a rendering transformation, not a content rewrite. The full list:

| Initiative | What carries forward unchanged |
|---|---|
| **SFDI** | All 25 Exegesis field definitions, 4 named outcomes, 4 sub-phase boundary handoffs, Step 1 → Step 2 hand-off |
| **SADI** | Step 2 (MPT 2Q + MPS 3Q) + Step 5 (Intro 4Q + Conclusion 4Q). Named outcomes: Main Point Pair, Sermon Frame |
| **SPRD** | Sub-phase architecture, per-question envelope, evidence-gated transitions, hard-disabled Continue, composite gates |
| **ARI** | AI is gone, stays gone |
| **Process Contract** | All six clauses unchanged |
| **Save flow / IPC / schema** | Untouched |

---

## What goes away (sermon workspace only)

| Surface | What | Why |
|---|---|---|
| **Workspace tab strip** | The horizontal strip of tabs (Study / Frame / Manuscript) | Trail is one continuous walk; tabs are an aggregation surface that doesn't belong on a walk |
| **Three-column layout** | Rail + worksheet + scripture | Already retired in Step 1 trail; extends to all stages |
| **Throughline rail (`ThroughlineRail.jsx`)** | The vertical sub-phase rail with field nodes | The trail itself IS the throughline — having a separate rail is redundant + competes for attention |
| **Step strip (`StudyStepStrip`)** | Horizontal step navigation within Study | Replaced by trail's sub-phase + step pauses |
| **Pause-point modal (`PausePointScreen`)** | Modal overlay between sub-phases | Already replaced in Step 1 trail by the pause-clearing variant; extends to all step boundaries |
| **Per-step "tab" components in workspace** | `OutlineBuilder`, `FunctionalElements`, `FrameTab`, `ManuscriptTab` as standalone tab panels | Become *modes within the trail*, not separate surfaces |
| **Trail suppression toggle** | The `× Exit` + "Trail mode →" affordances added in study-trail-charter D20 | Retire — there's no legacy shell to fall back to. Exit-from-workspace becomes "go to Dashboard" via sidebar (which is back when the trail un-takes-over the sermon workspace alone — see DW6 below). |

---

## Stage-by-stage assessment

The trail metaphor doesn't mean *one shape* — it means one *spine* with stage-appropriate visual modes. Here's the read per stage.

### Stage A — Study Step 1 (Exegesis)

**Status:** ✅ DONE in worktree `thirsty-bell-2d469b`. Charter: [`study-trail-charter.md`](./study-trail-charter.md). 25 fields × 4 sub-phases + 4 pauses = 29 stops, walked one clearing at a time with multi-Q within-field. Heavy-lifting overviews, N/A, gate UI, scripture column, keyboard nav, camera tween, exit affordance — all shipped.

**Visual mode:** *Single clearing, one Q at a time.* The canonical trail mode.

### Stage B — Study Step 2 (MPT/MPS Forge)

**Trail fit:** STRONG. Two anchor fields (MPT, MPS), each with a SADI-walked question sequence (MPT 2Q: `draft`, `tighten`; MPS 3Q: `translate`, `gospel_check`, `tighten`). Heavy-lifting outcome: Main Point Pair.

**Visual mode:** *Single clearing, one Q at a time* — same as Stage A. Two clearings + a Main Point Pair pause-clearing at the end.

**Differences from Stage A:**
- Only 2 fields, not 25 — geometry adapts (the trail compresses; maybe a single short row, no switchback)
- Main Point Pair pause-clearing: synthesis is the *paired* MPT + MPS, not a one-line synthesis question. Pause-clearing variant likely needs a two-line shape.

**Open questions:** DW1, DW2 (below).

### Stage C — Study Step 3 (Outline Builder)

**Trail fit:** WEAK as currently designed. The work is *assembly*: the pastor builds an outline of N points (typically 3-5) from the Main Point Pair. Each point has a heading + content. N is variable; points can be added, removed, reordered.

The trail's "stop per field" model doesn't fit a dynamic-length list. Three candidate visual modes:

1. **Workshop clearing.** One stop = one big clearing that holds the whole outline builder UI. Pastor stays in this clearing, builds the outline inline. The trail "rests" here. Single stop on the trail map.
2. **Point-as-stop.** Each outline point becomes a stop. Stops are added dynamically as the pastor adds points. The trail line extends. Pastor walks each point in sequence.
3. **Hybrid.** One main clearing for outline-shape (number of points + headings), then a sub-walk where each point gets its own clearing for content.

**Mode (1) is the safest start** — minimum disruption to the existing OutlineBuilder component. Mode (2) is most ambitious. Decide via DW3.

### Stage D — Study Step 4 (Functional Elements)

**Trail fit:** WEAK. Same shape as Step 3: per-outline-point, the pastor adds illustrations, applications, transitions. Nested structure (FE per point). N varies.

**Visual mode candidates:**
1. **Workshop clearing** like Step 3 — one big stop, FE editor inline.
2. **FE-per-stop, nested per point.** Walk each outline point's FE as sub-stops.
3. **FE inside outline clearings.** If Step 3 went mode (2), Step 4's FE attach to Step 3's outline-point clearings. They're not separate stops; they're additional Qs on the same point's stop.

DW4 covers this. Decide *with* Step 3's call.

### Stage E — Frame (Step 5: Intro / Conclusion)

**Trail fit:** STRONG. Two anchor fields (Intro, Conclusion), each with SADI-walked 4Q. Heavy-lifting outcome: Sermon Frame.

**Visual mode:** *Single clearing, one Q at a time* — same as Stages A and B. Two clearings + a Sermon Frame pause-clearing at the end.

**Differences from earlier stages:**
- Two clearings (Intro, Conclusion). The trail's switchback geometry doesn't really apply to two stops.
- Sermon Frame pause-clearing: like Main Point Pair, may need a two-line shape (Intro framing + Conclusion landing).

### Stage F — Manuscript

**Trail fit:** WEAK by clearing-walk shape. Manuscript drafting is sustained long-form writing. A 740px-wide clearing card is too narrow; the work is one continuous text, not a sequence of question stops.

**Visual mode candidates:**
1. **The trail arrives at "the writing room."** The clearing morphs into a full-screen manuscript editor, scripture column on the right (still useful for reference). Trail topbar stays for context (passage, title, exit). The pastor *settles in* — the trail metaphor implicitly pauses while the writing happens.
2. **Manuscript-as-trail-section** with sub-stops per section (Intro / Body Point 1 / Body Point 2 / ... / Conclusion). Each section a clearing. But this fragments the manuscript drafting which works best whole.
3. **Manuscript clearing without left/right offsets.** Full-width clearing that fills the trail area. Same trail topbar/exit. The trail SVG still in background, faint, signaling "you've walked far."

Mode (1) reads cleanest. The trail's contemplative quality survives — the pastor is at *a place* (the writing room), not on a sub-walk. The trail is *behind* them; the writing is in front.

DW5 covers this.

### Stage G — Manuscript export terminus

The current Manuscript tab includes export-to-PDF / preach mode / etc. After ARI, Delivery is gone. So Manuscript is the end-of-the-line.

**Visual mode:** A small "you have arrived" beat. Export button, "save and walk back to Dashboard," etc. The trail's terminus marker (per Step 1's pause-clearing's "Step 2 of Study — the Main Point Pair — waits beyond this last bend") becomes a "the sermon is ready to preach" beat at the end.

---

## Cross-stage concerns

### Workspace shell retirement

The current sermon workspace renders a tab strip + sidebar + step strip + page body. After this charter ships, the sermon workspace renders *only the trail*. Sidebar may stay (for Dashboard / Calendar navigation) but the trail's takeover hides it during the walk; pastor exits the trail to reach the sidebar.

### Throughline rail retirement

The throughline rail's job (visualizing the journey + named outcomes) becomes the trail's job. The rail retires from the sermon workspace. Its component code (`ThroughlineRail.jsx`) may stay on disk for reference / Trail Map (D8) reuse.

### Navigation between stages

In the trail, "Continue" advances along the trail. Inside Step 1 it advances Q→Q→field→sub-phase. Across step boundaries (Step 1 → Step 2 → Step 3 → ...), Continue still advances, but the underlying parent (workspace) needs to handle stage transitions through the spine.

The current workspace handles step transitions via `jumpToStep` / `advanceStep`. The trail needs similar — `advanceStep` at the last clearing of a step's last field. This is plumbing that doesn't yet exist for the trail.

### Pause-clearings between stages

Between Step 1 and Step 2, between Step 2 and Step 3, between Step 4 and Step 5, between Step 5 and Manuscript — there's a pause-clearing. The pause prompts the pastor to articulate the named outcome for the step they just completed (Implications Synthesis, Main Point Pair, Outline-X, FE-X, Sermon Frame).

Some of these named outcomes don't exist yet at step level — the existing spine has step boundaries but not necessarily a "named outcome" per step. That's a SADI-style content question worth surfacing.

### Look-back across stages

In Step 1 trail, look-back walks back through Qs / fields / sub-phases / pauses. Cross-step look-back (e.g., from MPT Q1 back to Implications Synthesis Q2) needs equivalent plumbing. Same async-await pattern as cross-sub-phase look-back (D12).

### The single STOPS array

The current trail computes a STOPS array of 29 stops (25 fields + 4 pauses) for Step 1. The workspace-wide trail extends this — every stage's stops, every step boundary's pause-clearings, the manuscript's writing room, the terminus. The geometry is more complex (multi-stage switchback? linear? nested?). Decide via DW7.

### Tour rewriting

Workspace tour currently anchors on legacy selectors. With workspace shell gone, the tour breaks completely. Either re-write the tour for the trail's surfaces, or retire the workspace tour and replace with stage-appropriate inline guidance.

### FeedbackFlag

Per-tab FeedbackFlag (currently Manuscript only) becomes "per-stage in-trail FeedbackFlag." Beta testers in any stage can flag friction.

### Notebook (per ARI D3)

ARI's per-tab notebook concept survives in the workspace. With tabs gone, "per-tab" becomes "per-stage" — each stage's clearing has notebook access. Decide form via DW8.

---

## Open design questions (workspace-trail-specific)

Continuing the D-question numbering from the Step 1 trail charter, but namespaced `DW` (workspace) to keep Step 1's `D` set independent.

### DW1 — Step 2 trail geometry

Step 2 has only 2 fields. The Step 1 trail's switchback (4 rows, alternating direction, 1700px row span) doesn't apply. Options:
- A single horizontal row with 2 stops + pause
- A single vertical column with 2 stops + pause
- Same switchback shape but compressed (2 bends instead of 7)

**Resolved 2026-05-10 — Option 1 (single horizontal row).** STOPS = `[mpt, mps, mainPointPair-pause]`. Fields occupy the left 62% of the row span (so they read as "the work" before the pause); the pause stop sits at 88% along the row with breathing room past MPS. Single ROW_Y constant; no Bézier needed because there's no row change — `buildPathToIndex` emits straight `L` lines.

Rationale: 2 fields + 1 pause = 3 stops, which can't carry a switchback's visual weight. Vertical column inverts the "walking forward" gesture that Step 1's horizontal rows establish. Compressed switchback (one bend) is more visual noise than 3 stops earn. A horizontal row reads as "the trail straightens out as you reach the anchor" — the serpentine exegesis deepening gives way to a direct anchor-forging walk. Camera math, station styling, recede ramp, mist mask, and tween (D6) all carry over from Phase A unchanged.

### DW2 — Main Point Pair pause-clearing shape

Step 1's pause-clearings prompt one synthesis sentence. Step 2's named outcome is the *pair* (MPT + MPS). Pause-clearing likely shows MPT and MPS side-by-side or stacked, not a single input. Define the shape.

**Resolved 2026-05-10 — stacked, editable two-row card.** The pause-clearing displays both tightened values stacked top-to-bottom (MPT above, MPS below) inside a single `.tw-pair-card`. Each row carries a small gold-mono label (`MPT — WHAT THE TEXT SAID` / `MPS — WHAT THE TEXT SAYS TO US`) plus a Playfair-italic textarea pre-filled with the saved `mpt.tighten` / `mps.tighten`. Both textareas remain editable in the pause — the pastor can refine the pair without leaving the pause-clearing. Edits route through `updateMPP(fieldKey, "tighten", value)` so they write to the v19 envelope AND mirror to the flat `sermon.mpt` / `sermon.mps` columns. The handoff strip "BECOMES YOUR MAIN POINT PAIR" sits at the bottom of the card. No new synthesis envelope key (`_synthesis`) — the pair IS the synthesis, already persisted.

Rationale: stacking reads chronologically (past tense → present tense; what the text said → what the text says to us). Side-by-side competes for narrow-viewport real estate and breaks down at <1100px. Read-only display would feel like a confirmation modal; editable display preserves the contemplative "you can still shape this" quality of the Step 1 pause-clearings while honoring the fact that Step 2's work IS sentence-shaped from the field walk forward.

### DW3 — Outline Builder visual mode

Workshop clearing (one big stop), point-as-stop (dynamic stops), or hybrid. See Stage C.

**Resolved 2026-05-10 — workshop clearing (Mode 1).** Outline renders as a single trail stop hosting `OutlineBuilder` inline. The trail rests at this stop while the pastor adds / orders / shapes outline points; the row's pause-clearing displays the named outcome (Sermon Outline) and gates advance to Equip via the existing composite (`outline.length >= 1`). Rationale: dynamic-N work doesn't fit per-stop walking — the pastor's mental beat is "I am at the outline workshop" rather than "I am at outline point 3 of 5." Mode 1 also preserves the existing `OutlineBuilder` component unchanged, which keeps the heavy-lifting editor intact.

### DW4 — Functional Elements visual mode

Pairs with DW3 — if Outline went mode (1), FE is its own clearing; if mode (2), FE attaches to outline-point stops.

**Resolved 2026-05-10 — workshop clearing (Mode 1), parallel to DW3.** Equip renders as a single trail stop hosting a stack of FE editors (one per outline point, each collapsible). The trail rests at this stop while the pastor equips Scripture / Explanation / Application / Illustration for each point. Same rationale as DW3: dynamic-N work, mental beat of "I am at the equip workshop," and the per-point FE editor pattern carries forward from the pre-trail rendering with its (E)/(A)/(I) badges and collapsed-preview affordance intact.

### DW5 — Manuscript visual mode

The "writing room" hypothesis (the clearing morphs into a full-screen manuscript editor). Confirm + design the visual handoff (trail arrives → writing settles in → trail still visible behind).

**Resolved post-walkthrough — yes, writing room mode.** Manuscript's clearing morphs into a full-screen long-form editor on arrival. Trail topbar (passage chip, title, × exit) stays for context; trail SVG fades to background. Implementation deferred to sequel branch.

### DW6 — Sidebar accessibility during trail

The Step 1 trail's `× Exit` retires (DW6 supersedes D20). Pastor exits the workspace by going to Dashboard. Options:
- Sidebar always visible (trail doesn't hide it; takes over only the workspace area)
- Sidebar hidden during walk; revealed on hover at left edge
- Sidebar accessible only via topbar back-arrow → confirms exit → Dashboard

**Resolved post-walkthrough — sidebar stays hidden during the walk (current behavior).** Full-screen takeover holds; exit via × / Esc / Dashboard. The trail's contemplative posture survives only if peripheral chrome stays out of the way.

### DW7 — Single workspace-wide STOPS array

The trail's geometry is data-driven from STOPS. Workspace-wide STOPS = Step 1's 29 + Step 2's stops + Step 3's stops + ... Decide:
- One continuous array, one continuous trail (multi-stage switchback)
- Per-stage arrays, per-stage trail visualizations (camera handoff between stages)

**Resolved post-walkthrough — per-stage arrays with camera handoff between stages.** Each stage (Study, Assembly, Manuscript) owns its own STOPS + geometry; the cross-stage transition is a handoff beat (the step-boundary pause), not a continuous switchback. Avoids one 40+ stop SVG that scrolls into oblivion. Sequel-branch work.

### DW8 — Notebook per stage

Where does the notebook drawer live in each stage's clearing? Side drawer? Bottom slide-up? Topbar toggle?

**Resolved post-walkthrough — yes, per-stage notebook.** Each stage's clearing surfaces notebook access. Exact affordance (side drawer / bottom slide / topbar toggle) decided during sequel-branch implementation.

### DW9 — Step-boundary pause-clearings

Currently only sub-phase boundaries within Step 1 have pause-clearings. Step boundaries (1→2, 2→3, 3→4, 4→5, 5→Manuscript) don't. Decide:
- Add pause-clearings at every step boundary with a synthesis prompt
- Pause-clearings only between Study sub-phases + Study→Frame + Frame→Manuscript (skip mid-step boundaries inside Study)
- No step-boundary pause-clearings; stages flow into each other directly

**Resolved post-walkthrough — yes, step-boundary pause-clearings at Study→Assembly and Assembly→Manuscript.** Heavier visual register (RW4 + RW9). Sequel-branch work.

### DW10 — Tour replacement

Re-write workspace tour for trail surfaces, or retire and replace with per-stage inline guidance, or both.

**Resolved post-walkthrough — rewrite the workspace tour end-to-end to match the trail surfaces.** Walks the pastor through the trail's three stages + four Assembly sub-phases + the writing room. Replaces the current tab-strip-anchored tour stops. Sequel-branch work.

### DW11 — Trail Map (Step 1 D8) extension

If the Trail Map view (Step 1 D8) is built, does it cover the whole workspace trail or just Step 1? Workspace-wide map likely makes more sense — pastor sees the full journey from text to manuscript at a glance.

**Resolved post-walkthrough — yes, workspace-wide Trail Map, and it needs to be clean.** "Clean" = legible at-a-glance, no clutter, no half-built indicators; ships polished or doesn't ship. Sequel-branch work.

### DW12 — Heavy-lifting overviews per stage

Step 1 trail D19 fires field-level overviews for heavy-lifting fields. What about *step-level* overviews? Each stage probably wants a "you are entering Step 2 / Forge" framing on first arrival.

**Resolved post-walkthrough — yes, stage-level overviews on first arrival.** "You are entering Assembly" framing fires once per session at the Study → Assembly handoff (and parallel for Manuscript). Sequel-branch work.

### DW13 — Cutover sequencing

Stage by stage, or all-at-once?
- Stage by stage: Step 2 lands first behind a flag; pastor tests; flag flips to default; repeat for each stage. Slower but safer.
- All at once: full workspace trail behind a feature flag; pastor tests end-to-end; flip default. Faster but riskier.

**Resolved post-walkthrough — all-at-once.** The merge to main IS the cutover: Stages A + B + C + D + E ship together on main; the sequel branch ships the remaining polish (RW4 / RW8 / DW5 / DW7 / DW8–DW12) in tighter increments without further feature flags. Trail-suppress (× / Esc) remains as a temporary escape hatch; retires once the sequel arc lands.

### DW14 — Save status + composite per stage

Step 1 D3 left save-status hardcoded. Workspace-wide trail can't ship that — every stage will surface a save indicator. Wire to real save state from each stage's parent.

**Resolved post-walkthrough — drop the indicator entirely.** Autosave runs invisibly via the 500ms debounce in `saveDb()`; a hardcoded "SAVED" badge was visual noise without information. The indicator + its CSS retired with the merge. Save errors surface through the existing error-banner path; success stays silent.

### DW15 — Mobile / narrow viewport

Trail's switchback geometry assumes ~1200px+ width. Mobile or narrow desktop will need a stacked-vertical mode. Out of scope for first cut, but flag.

**Resolved post-walkthrough — no mobile.** SermonForge is a desktop preacher's tool; the trail's switchback assumes ~1200px+ and that's the supported floor. Narrow-viewport handling retires from the roadmap.

---

## Phasing

Stage by stage. Each phase ends in a green-state worktree commit + pastor-test.

| Phase | Scope | Ships when |
|---|---|---|
| **A** | Study Step 1 (Exegesis) trail | ✅ DONE 2026-05-10 (`study-trail-charter.md`) |
| **B** | Study Step 2 (MPT/MPS Forge) trail | ✅ DONE 2026-05-10 — `StudyTrailForge.jsx` built; DW1 + DW2 resolved; pastor-test deferred per user instruction |
| **C** | Study Step 3 (Outline Builder) trail | DW3 decided + implemented; pastor-tested |
| **D** | Study Step 4 (Functional Elements) trail | DW4 decided + implemented; pastor-tested |
| **E** | Frame (Step 5: Intro/Conclusion) trail | Like Phase B; SADI Step 5 walks already done |
| **F** | Manuscript "writing room" trail mode | DW5 decided + implemented; pastor-tested |
| **G** | Workspace shell retirement | Tab strip / step strip / throughline rail removed from sermon workspace; trail is the only render path |
| **H** | Cross-stage plumbing | Look-back across stages, step-boundary pause-clearings (DW9), workspace-wide STOPS or per-stage handoff (DW7) |
| **I** | Tour replacement (DW10) | New tour covers trail surfaces or per-stage inline guidance |
| **J** | Notebook per stage (DW8) | Per-stage notebook drawer wired |
| **K** | Save status wiring (DW14) | Every stage's clearing has honest save indicator |
| **L** | Cutover (DW13) | Trail is the production sermon-workspace surface, no fallback |
| **M** | Pastor testing — full sermon end-to-end | At least one full sermon prepped from text to manuscript through the workspace trail |

Phases B, C, D, E, F can largely happen in parallel after their D-questions are decided. Phase G is the *last* of the implementation phases — only retire the legacy shell after every stage has trail support.

---

## Process & guardrails

- **Per-phase pattern.** One phase, one branch, one commit, one entry in the worktree changelog. Each phase merges to main behind a feature flag.
- **DW-question resolution.** Each DW-question gets a short working note appended to this charter when decided, with date and rationale. Don't silently pick in code.
- **Non-negotiable check before each commit.** Every commit verifies: data round-trips, dark mode dissolves, structured editors mount unchanged, composite gates still block, save flow untouched. If any fails, the change isn't ready.
- **No drift from SFDI/SADI/ARI.** This is rendering. If a phase pulls content into the trail's geometry in a way that requires content to change, stop and write a content-side follow-on instead.
- **Pastor testing per phase.** No phase ships to default without at least one round of lived sermon prep through the new surface.
- **Feature flag default.** Until Phase L (cutover), every phase ships behind a flag that defaults OFF for production but ON for the developer-pastor.

---

## Pre-execution checklist

Before Phase B starts:

- [ ] This charter reviewed and any disagreements with the locked decisions raised
- [ ] DW1 + DW2 working session scheduled (Step 2 trail geometry + Main Point Pair pause shape)
- [ ] Step 1 trail charter's pre-execution items closed (memory pointer, current with main, etc.)
- [ ] Cross-stage plumbing audit: enumerate every existing `advanceStep`, `jumpToStep`, `advanceSubPhase`, `jumpToSubPhase` so the trail's parallel paths can route through them coherently
- [ ] Workspace-shell components inventoried so retirement order is clear: which depend on which

---

## Index entries (memory + cross-refs)

When this charter lands:

- New memory: `project_workspace_trail_state.md` — pointer to this charter, current phase, current open DW-questions
- Cross-ref from `project_study_trail_state.md` (when that's added per Step 1 charter): study-trail is Phase A of workspace-trail
- Cross-ref from `project_sprd_sfdi_state.md`: workspace shell retirement is the long-term destination of the surface work SPRD started
- Cross-ref from `project_ari_state.md`: workspace-trail preserves ARI's pastor-authored end-to-end commitment across all stages

---

## What this charter does NOT do

- Decide the visual mode for Steps 3, 4, Manuscript (DW3, DW4, DW5 — open)
- Decide step-boundary pause-clearing inclusion (DW9 — open)
- Decide whether the workspace trail is one continuous STOPS or per-stage handoff (DW7 — open)
- Touch Dashboard, Calendar, Series Planner, or any non-sermon-workspace surface
- Re-introduce AI in any form
- Change save flow, IPC, schema, or any contract
- Decide the cutover sequencing (DW13 — open)

It surfaces the work, the open decisions, and the phasing. It commits to the *direction*: trail across the entire sermon workspace, legacy shell out. The shape per stage gets decided in working sessions before each phase.
