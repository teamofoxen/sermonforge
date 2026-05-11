# Study Trail Charter — Switchback Rendering of Step 1

> **Status:** Drafted 2026-05-10. Prototype landed in worktree `thirsty-bell-2d469b` (branch `claude/thirsty-bell-2d469b`). Pre-execution charter — every locked decision below either reflects what the prototype already commits to, or names a deliberate constraint on what comes next. Open design questions (D1…) are unresolved and should not be silently decided in code.
>
> **Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Plain language; technical specifics where they matter.
>
> **Worktree:** `C:/Projects/SermonForge/.claude/worktrees/thirsty-bell-2d469b` on `claude/thirsty-bell-2d469b`. Forked from `main` after ARI Phase 10 (`348e438`).
>
> **Design source:** `tmp/switchback/` (HTML + JSX prototypes, design README). The HTML is reference-fidelity, not production code.

> **Build session log — 2026-05-10:** D1 (multi-Q within-field walk), D12 (cross-sub-phase look-back), D2 (N/A re-entry), D4/D16 (passage popup), D5 (keyboard nav), D6 (camera tween), D17 (gate UI typography), D19 (heavy-lifting overviews), D20 (trail exit + re-entry) all landed and verified end-to-end in browser preview. Two async-race bugs surfaced and fixed during testing. D7 (trail-line draw-on) deferred — D6's camera tween already covers most of the "felt walk" gap. D3 / D8 / D9 / D10 / D11 / D13 / D14 / D15 / D18 / D21 still per the original disposition (deferred or out of scope). The trail experiment is feel-complete enough to drive end-to-end in Electron.

---

## Orientation

The arc, in one sentence: **Step 1 stops being a worksheet you fill in and becomes a trail you walk.** The four sub-phases (Observe → Interpret → Redemptive Thread → Implications) and their twenty-five fields are the same as SFDI defined them. What changes is the rendering — one field at a time, given the whole screen, with the completed work receding behind as faded trail markers and the work ahead hidden in mist.

### What the trail actually is

A switchback trail laid out across four phase rows. Each row alternates direction (Phase I L→R, Phase II R→L, Phase III L→R, Phase IV R→L). Field stops sit along each row; a pause-point stop sits on the bend between phases. The whole trail world is panned by an invisible camera so the active stop sits at viewport (50%, 58%). A radial mist mask fades the trail near the camera so the **clearing** — the card holding the active field's UI — reads cleanly.

The metaphor is contemplative, not gamified. There is no progress bar, no XP, no badges. The trail is simply a way of *seeing* what the pastor is doing: this work has shape, the shape is a deepening walk, and the screen now shows the walk.

### Why this exists

SFDI gave Study its content shape (25 fields, 4 named outcomes, 4 sub-phase boundary handoffs). SPRD gave Study its architectural shape (per-question envelope, evidence-gated transitions, hard-disabled Continue, throughline rail). What neither gave it is a *surface* that matches the work's nature.

The current rendering is a three-column rail + worksheet + scripture layout. The fields stack vertically. The pastor's eye has to absorb the whole sub-phase at once. The pause-points are modal interruptions. The "you are walking a deepening exegesis" felt-quality the throughline was supposed to deliver doesn't quite land in a layout that looks like a form.

The trail flips that. One field. Whole screen. The previous fields are *behind you* — visible but receded. The next fields are *ahead* — implied but unshown. The pause-points are *clearings on the trail*, not popups. The named outcome of each sub-phase is what the pause is *for*.

This is a UX rendering change. Schema, save flow, IPC, gates, and contracts are unchanged.

### The non-negotiables

- **Zero data regression.** Field answers, pause-point synthesis, structured-editor state all round-trip through the existing column envelopes. No schema migration is part of this initiative.
- **Heavy-lifting editors keep their UX.** Unified canvas (Phase 1 Field 3), cumulative synthesis tables (Phases 2–4), and any future structured editors mount inside the clearing unchanged.
- **Composite gates remain binding.** `subPhaseSufficiency` still blocks advance at the last field of a sub-phase with a pastor-facing reason; the gate UI is reskinned, not removed.
- **Named outcomes flow through pause-points.** The pause-point synthesis sentence is the named outcome (Observation Set / Interpretation Set / Christ-Connection Statement / Implications Synthesis). Its storage path is the existing `_synthesis` pseudo-question-key on the column envelope — no contract change.
- **Dark mode is a first-class target.** The parchment palette flips; the trail must dissolve cleanly into the dark background, not burn as a bright spotlight halo.
- **Geometry is data-driven.** Stop positions are computed from the actual `OBSERVE_FIELDS` / `INTERPRET_FIELDS` / `REDEMPTIVE_FIELDS` / `IMPLICATIONS_FIELDS` arrays. A future field added or removed reflows automatically.
- **Pastor-authored end-to-end.** ARI's removal of the AI subsystem is preserved. Nothing in the trail brings AI back, by design or by accident.

### The qualitative test

When the pastor opens Step 1, the trail metaphor *lands*. They feel like they are walking, not filling out a form. Each clearing breathes. The pause-point feels like an actual breath between phases. The named outcome at each pause feels earned. By the time they reach the Implications → Step 2 hand-off, the foundation under MPT/MPS is real, not assembled. If any of that fails — if the trail feels gimmicky, if the clearing feels cramped, if the pause feels like ceremony rather than pause — the redesign hasn't shipped yet, no matter what the code says.

---

## What stays (binding from prior initiatives)

| Initiative | What carries forward unchanged |
|---|---|
| **SFDI** | All 25 field definitions across the four sub-phases. The four named outcomes. The 4 sub-phase boundary handoffs. The Implications → MPT/MPS hand-off into Step 2. |
| **SPRD** | The 8+8+5+4 sub-phase shape. Per-question envelope. Per-question N/A flags (data layer). `evaluateAdvance` composite gates. Spine-routed sub-phase + step transitions. Hard-disabled Continue with pastor-facing reason. |
| **SADI** | Step 1 → Step 2 contract: Implications Synthesis is the substrate for MPT. Step 2's MPT/MPS Forge is unchanged by the trail. |
| **ARI** | AI is gone. Stays gone. The trail does not introduce a single AI surface. The synthesis-question-per-sub-phase pattern that ARI installed (D2 in the ARI charter) is what the pause-point clearing renders. |
| **Process Contract** | All six clauses unchanged. The trail is a rendering of the throughline, not a replacement for it. |
| **Save flow / IPC / schema** | Untouched. `updateStructured`, `applyMutation`, the per-column envelopes — all the same. |

---

## What changes

| Surface | Before | After |
|---|---|---|
| **Step 1 layout** | Three-column: throughline rail (left) + worksheet (center) + scripture panel (right). Workspace topbar + tab strip + sidebar visible. | Fixed-position takeover. Trail topbar (62px ink) replaces workspace chrome. Single clearing centered at (50%, 58%). |
| **Field walk** | All fields in the active sub-phase visible as a stack; the spotlight pattern highlights the active question. | One stop at a time. Whole screen given to that stop. Completed stops fade behind. Future stops hidden in mist. |
| **Pause-points** | Modal `PausePointScreen` opens between sub-phases. | First-class stops in the trail. Their own clearing variant (centered, breath-shaped). Same `_synthesis` storage. |
| **Sub-phase navigation** | Buttons + sub-phase ribbon. | Continue advances to next stop (within or across sub-phases via `advanceSubPhase`). Look-back routes through the spine for backward phase transitions. |
| **Visual atmosphere** | Functional / utilitarian. | Contemplative — paper grain pattern, parchment palette, gold ink trail, soft station halos, vignette around the clearing. |
| **Multi-question fields** | All questions in a field render via `SpotlightWorksheet` (one active at a time, others queued). | Currently: only Q1 renders in the clearing. **D1 is the unresolved decision** — within-field walk, split-into-stops, or single-Q (data loss). |
| **N/A toggle** | Per-question "Mark not applicable" button in the spotlight chrome. | Removed from clearing chrome by design (the trail's single-input feel doesn't fit the toggle). Data layer still respects existing N/A flags. **D2 covers re-entry path.** |

---

## Decisions (locked by prototype)

These reflect what the worktree code already commits to. Any change requires a charter update.

### Mount conditions

The trail mounts when:
- `activeStep === 1` (any sub-phase 1–4), **or**
- `pausePoint && pausePoint.nextKey === "step_2"` (the Implications → Step 2 hand-off pause)

The Implications → Step 2 pause lives in the trail because the pause's named outcome (Implications Synthesis) is what Step 2 opens against; the felt-continuity of "you walk to the last clearing, name it, then walk on" only works if the pause is the same surface as the field walk that produced it.

When the pastor leaves Step 1 (advance into Step 2 or jump to a later step), the trail unmounts and the workspace shell returns. There is no half-trail half-shell state.

### Geometry

```
ROW_GAP     = 360   // vertical distance between phase rows
ROW_SPAN    = 1700  // horizontal trail span per row
ROW_LEFT    = 200
BEND_RADIUS = 110
ROW_Y0      = 200
```

Stops along a row are evenly distributed across `ROW_SPAN - BEND_RADIUS * 1.2`. The pause-stop sits at ~85% along the row, ~42% down toward the next row's vertical position. Inter-row connectors are cubic Bézier curves with control points pulled outward by `BEND_RADIUS`.

These numbers come from the design prototype and are tuned for current viewport widths. They are computed values, not magic — adjust if a future viewport-mode change demands it, but a recalculation of the camera math has to land at the same time.

### Recede & camera

- **Recede math:** `opacity = max(0.32, 1 - distance * 0.08)`. Station radius shrinks slightly with distance behind. The exact ramp is what gives the trail its "footprints behind you" quality — preserve it unless changing it deliberately.
- **Camera transform:** the SVG world is translated by `(viewport.w/2 - active.x, viewport.h*0.58 - active.y)`. The clearing card is positioned at (50%, 58%) over this. Both must move together; the mist mask sits *outside* the camera group at fixed viewport coords so it stays anchored to the clearing.
- **Camera transitions:** currently instant. **D6 covers tweening** (likely 400–500ms ease-out on the SVG transform).
- **Maximum-visited-stop floor:** the trail line and visible stations track the *furthest* stop reached this session, not the current stop. Looking back never retracts the visible trail. This is intentional — the pastor sees what they have walked, even when they revisit an earlier clearing.

### Dark mode

The mist gradient and paper grain pattern flow their colors through CSS classes (`.tw-mist-stop`, `.tw-grain-stroke`) that resolve to `var(--parchment)` and `var(--parchment-deep)`. The `::after` vignette uses `color-mix(in srgb, var(--parchment-deep) X%, transparent)`. The clearing card body uses `var(--parchment-warm)` so it sits one notch above the page in either palette. The whole effect must dissolve into dark mode without producing a bright halo on the active clearing.

### Storage contracts

- **Field answers** persist via `updateStructured(column, data, fieldKey, value, questionKey)` exactly as they do in the existing layout.
- **Pause-point synthesis** persists via `updateStructured(column, data, "_synthesis", value)` — matching the existing `PausePointScreen` contract — so the value round-trips through the same column without schema churn.
- **N/A flags** continue to live on the per-question envelope. The trail does not surface a toggle, but `isQuestionNA(...)` reads still work and disable structured editors where applicable.

### Look-back routing

Backward navigation across a sub-phase boundary routes through `jumpToSubPhase(...)` so the spine handles the transition (mirrors how the rest of the workspace handles backward sub-phase moves). Forward navigation past the last field of a sub-phase routes through `advanceSubPhase(...)` so composite-gate enforcement and the existing forward-transition logic stay binding.

---

## Open design questions

These are unresolved. The prototype either picks a placeholder or leaves the surface absent. Each has to be decided before the trail can replace the existing Step 1 layout.

### D1 — Multi-question field handling

Several fields define multiple questions (e.g. Observe Field 7 has multiple sub-prompts; Interpret Field 4 has multiple sub-prompts). The current trail clearing renders only **Q1** of any field. The other questions persist in the schema but have no editable surface in the trail.

Three candidate directions:
1. **Within-field question walk.** Continue advances to Q2, Q3, … of the same field before crossing to the next field. The clearing's prompt swaps; the textarea swaps. The position label becomes `FIELD 06 OF 08 · Q 02 OF 03`.
2. **Split each Q into its own stop.** The STOPS array expands; a field with 3 questions becomes 3 trail stations. Geometry adapts (more dots per row).
3. **Single-Q with explicit deprecation of Q2-N.** Acknowledge data loss; restructure SFDI multi-Q fields into single-Q fields. This is content work and would need an SFDI follow-on.

Default lean: **(1) within-field walk** — preserves SFDI content commitments, keeps the trail's visual rhythm (one clearing per field), uses a small position label increment to communicate sub-Q position. But this needs a working session before it lands.

**Resolved 2026-05-10 — Option 1 (within-field walk) locked.**

Specifics:
- STOPS array unchanged at 29 (25 field + 4 pause). Geometry untouched.
- `activeQKey` lives local to the trail (not lifted to StudyTab). Derived from first-incomplete Q on field entry; explicit overrides in `advance` / `lookBack` survive the reset because the new value is valid for the new field.
- Within-field Continue: Q1 → Q2 → … → last Q, then cross to next field's first-incomplete Q.
- Within-field look-back mirrors. Cross-field look-back lands on prior field's last Q. Cross-sub-phase look-back routes through `jumpToSubPhase` (D12 verification still pending) and lands on the prior phase's last field's last Q.
- Clearing title stays the field label across all Qs. Clearing prompt becomes the active Q's prompt (falls back to `field.hint` for single-Q fields, which is what `fieldQuestions` already returns by default).
- Eyebrow + ribbon gain `· Q 02 OF 04` segment for multi-Q fields only.
- Trail station stays active across all Qs of a field — the walk happens *on the page* (prompt + textarea swap), not on the trail map. The clearing bloom keyframe fires on field change only, not Q change.
- Composite gate fires only at the last Q of the last field of the sub-phase. Within a field, advance never fires the gate, even at the last field of the phase.
- N/A handling deferred to D2 — for now, N/A Qs are not auto-skipped (the existing trail body still renders them; nothing changes from today's behavior).

Rationale: 60% of fields are multi-Q (15 of 25, 49 Qs total). Option 2 blows geometry to 53 stops, orphans heavy-lifting overview screens that describe whole fields, and breaks sequential-Q cohesion (Pastoral Context Q2 wants Q1's room context on screen). Option 3 is a content rewrite of every SFDI walk. Option 1 mirrors SpotlightWorksheet's existing within-field walk dressed in clearing chrome — lowest friction, lowest risk.

### D2 — N/A handling

The "Mark not applicable" button is removed from the clearing chrome by design (the per-question toggle doesn't fit the contemplative single-input feel). But the data layer still respects N/A flags, and the existing layout exposes the toggle. Re-entry options:

- A small overflow control on the clearing (e.g. a `…` menu with "Mark this question not applicable for this passage").
- A keyboard shortcut (e.g. `Cmd/Ctrl + .`) with no visual chrome — discoverable through tour or shortcut list.
- Accept that the trail does not expose N/A; pastors who need it use the legacy view (kept available behind a "classic view" toggle for fallback).

Decision blocks Phase 11 (cutover).

**Resolved 2026-05-10.** Both visible link + keyboard shortcut land:
- Quiet mono link in the clearing actions row, next to "← look back": `mark not applicable` (toggles to `↺ restore this question` when N/A is on)
- Keyboard shortcut: `Cmd/Ctrl + .`
- When N/A is on, the editor (textarea / unified-canvas / synthesis-table) is replaced by a quiet message: "Marked not applicable for this passage. — Some questions don't carry weight for every text. The trail advances past this one." The link in the actions row reverts the state.

### D3 — Save status

Currently hardcoded to read `SAVED` with a green dot. Real save state lives in the workspace (debounced `onUpdate` calls). Wiring options: pass a save-status prop down from `StudyTab`, or read directly from the same source the existing top-right indicator uses. Cosmetic but small.

### D4 — Topbar passage chip → PassagePopup

The trail topbar's passage chip is `cursor: pointer` but has no `onClick`. The existing `PassagePopup` should mount on click so the pastor can read scripture without leaving the trail. Question: does the popup overlay the clearing (anchored to the topbar) or take over the screen the way the trail itself does?

**Resolved 2026-05-10.** Passage chip is now a real `<button class="tw-meta-passage">` that toggles a `passageOpen` state in `StudyTrailExegesis`. `PassagePopup` (the existing component) renders as an overlay above the trail when open. The popup carries its own × close button. Esc handling is gated by `passageOpen` in the trail's keyboard effect — Esc closes the popup, doesn't exit the trail. (Note: the existing `PassagePopup` doesn't itself bind Esc-to-close; the close button works. If desired later, add Esc-to-close in `PassagePopup`.)

### D5 — Keyboard navigation

Currently mouse-only. The contemplative single-input feel benefits from quiet keyboard control:
- `Enter` (or `Cmd/Ctrl + Enter`) → Continue
- `Cmd/Ctrl + ←` → look back
- `Esc` → exit trail back to workspace shell

Decide which of these to wire and what feedback they produce.

**Resolved 2026-05-10.** Window-level keydown listener added in the trail. Bindings:
- `Cmd/Ctrl + Enter` → advance (respects `advanceDisabled` so the gate still blocks)
- `Cmd/Ctrl + ←` → look-back
- `Esc` → exit trail (no-op when passage popup is open; popup owns its own close)
- `Cmd/Ctrl + .` → toggle N/A on active question (paired with D2)

Bare `Enter` is reserved for textarea newlines; bare `Esc` outside editors triggers exit. Listener placed after `advance`/`lookBack`/`advanceDisabled` declarations so the dep array sees live closures (TDZ-safe).

### D6 — Camera tween

Currently instant. The design calls for a 400–500ms ease-out tween on the SVG `<g transform>` group. This is the difference between "the world snaps" and "the world walks." Consider also whether the clearing's `tw-bloom` keyframe should fire only after the camera arrives.

**Resolved 2026-05-10.** SVG `<g>` switched from SVG `transform=` attribute to inline CSS `style.transform = translate(${tx}px, ${ty}px)` and given class `tw-camera`. CSS rule: `transition: transform 0.55s cubic-bezier(0.22, 0.61, 0.36, 1)`. Within-field Q advance does NOT change tx/ty (the trail station holds across Qs), so within-field stays still while cross-field + cross-sub-phase movements glide. The `tw-bloom` keyframe still fires on the clearing on field change — the simultaneous bloom-as-camera-arrives reads as one motion rather than two.

### D7 — Trail-line draw-on animation

On first reveal of a stop the user has not visited before, the new segment of the gold ink line should ideally animate-draw (stroke-dashoffset trick). Not implemented in prototype. Aesthetic, not functional — but the difference between "the trail extends as you walk" and "the trail just appears" is the difference between a felt walk and a teleport.

**Deferred 2026-05-10.** With D6 (camera tween) shipped, the cross-field motion already feels like walking — the camera glides into the new clearing while the trail line extends in place. The marginal gain from animating the trail line itself is small for the implementation cost (per-render `getTotalLength()` tracking + segment delta math + dashoffset transition that survives path-d updates). Revisit if pastor testing flags the trail line as feeling like a teleport.

### D8 — Trail Map (the second screen)

The design package includes a second view: an at-a-glance map of all 25 fields, 4 pause-points, and 4 sub-phases, with pan/zoom, phase titles in outer gutters, a terminus pointer to Step 2, and a compass-rose ornament. **Not built.**

Questions:
- Build it as part of this initiative, or defer?
- Where does the entry point live? (The design says "TBD"; the topbar's "stop counter" chip is one candidate; a header ornament is another.)
- Is the map a navigation surface (click a station to jump there), a contemplative overview, or both?

### D9 — Step 2–5 trail extension

Steps 2 (MPT/MPS Forge), 3 (Outline), 4 (Functional Elements), 5 (Intro/Conclusion) currently render in the existing workspace shell. The trail metaphor *could* extend — each step its own trail row, or one mega-trail across all five steps — but the design does not propose this and the felt-quality of a trail across heterogeneous steps (some are field walks, some are structured tables, some are intro/conclusion drafting) is unproven.

Default: **Trail is Step 1 only.** Steps 2–5 keep the workspace shell. Re-evaluate after Step 1 is in lived sermon-prep use.

### D10 — Trail exit

When the pastor advances out of the Implications pause into Step 2, the trail unmounts and the workspace shell returns. The transition needs design care — a hard cut feels jarring after a contemplative trail. Options: a brief fade, a "you have arrived at Step 2" affordance, or a dedicated terminus clearing (the design prototype's pause-point clearing already gestures at this with `Step 2 of Study — the Main Point Pair — waits beyond this last bend`).

### D11 — Throughline rail during the trail

The existing throughline rail (`ThroughlineRail.jsx`) is hidden during the trail because the trail itself *is* the throughline visualization. But this loses the at-a-glance sub-phase-and-named-outcome view. Reconcile with D8 (Trail Map) — the map may be the canonical "see the whole shape" surface, with the rail retired during Step 1.

### D12 — Look-back across phase boundaries

The current `lookBack()` function routes through `jumpToSubPhase(stop.phase)` for backward phase transitions. The phase-index math (`stop.phase` is 0-indexed; `jumpToSubPhase` wants the new sub-phase number which is also `stop.phase` since you're moving back one phase) needs verification — there's a subtle off-by-one risk noted inline. Confirm with a manual walk before cutover.

**Resolved 2026-05-10 — verified clean after async fix.**

Walk-test from Interpret Field 1 Q1 (Deeper Context Q1) → look-back lands cleanly on Observe Field 8 Q2 (Possible Implications Q2). The phase-index math is correct: `stop.phase = 1` (Interpret 0-indexed) → `jumpToSubPhase(1)` → 1-indexed sub-phase 1 (Observe). Symmetric: from the Observe → Interpret pause clearing, look-back lands on Possible Implications Q2 via `jumpToSubPhase(stop.phase + 1)` (pause's `stop.phase` is the index of the phase that just completed, so +1 gives its 1-indexed number).

**Fix required during verification:** both cross-sub-phase look-back (from field) and pause look-back originally fired `jumpToSubPhase` synchronously *and then* called `setCurrentActiveFieldKey` / `setActiveQKey`. Because `jumpToSubPhase` awaits `transitionState` (IPC), the synchronous setters landed in a transient render where `activeSubPhase` was still the old phase — the field-key sync effect then overwrote the explicit set with first-incomplete-of-wrong-phase. Fix: `lookBack` is now `async`; both branches `await jumpToSubPhase(...)` before setting field/Q so React 18 batches all three updates into one coherent render.

This pattern (`await jumpToSubPhase` before manually setting field/Q) is the canonical shape for cross-spine-transition navigation in the trail. Anything that combines a spine call with manual field/Q overrides should follow it.

### D13 — Tour integration

The Sermon Workspace Tour (12-stop plain-prose flow shipped in SPRD) currently walks the existing layout. The trail changes the layout. Tour stops that point at the throughline rail, the worksheet column, the scripture column, etc. need re-anchoring or rewriting. Defer until the trail's surface stabilizes.

### D14 — FeedbackFlag

`FeedbackFlag` is currently mounted on the Manuscript tab (BTI Phase 1.5). If beta testers will encounter the trail, they need a way to flag friction. Decide: mount on the trail (where? The clearing's actions row? The topbar? The bottom-right near save status?), or accept that trail feedback comes through a different channel during the prototype phase.

### D15 — Notebook integration

ARI introduced per-tab notebooks ("a scratchpad for thinking about the outline" etc.). The trail surface has no notebook. Question: does Step 1 get a notebook (a small drawer the pastor can open at any clearing), or is the trail's contemplative single-input nature reason enough to keep notes off the surface? If yes, decide where the drawer lives (right edge? bottom? slide-out from the topbar?).

### D16 — Scripture access

The three-column layout exposed scripture in a dedicated panel always-on-screen. The trail does not. Scripture access is intended to come through the topbar passage chip popup (D4) — but the design does not yet describe what reading scripture *during* a clearing looks like. Does the popup overlay the clearing? Move it? Pop a side reader?

### D17 — Sufficiency-gate UI in the clearing

The current prototype renders `AdvanceGateChecklist` below the actions row when the gate blocks advance. This works but the visual treatment is not yet design-tuned for the trail's typography. A short Playfair-italic line with a quiet checklist underneath, or an inline list of unmet conditions, may read better than the existing checklist component.

**Resolved 2026-05-10.** CSS-only treatment in `studyTrail.css` — no JSX changes. `.tw-clearing-gate` carries:
- A mono eyebrow injected via `::before { content: 'BEFORE YOU CROSS THE BEND' }` in gold
- The legacy single-line `.advance-hint` rendered in Playfair Display italic 16px
- The multi-gate `.advance-gate-checklist` styled as a quiet list:
  - Met items: line-through label, sage-soft ✓ marker, ink-ghost text
  - Unmet items: Playfair italic label, gold ✗ marker, Crimson Pro reason text
- Top dotted border separates the gate from the actions row above

No need to touch `AdvanceGateChecklist.jsx` — it already emits the right structure.

### D18 — Word-count meter copy

The clearing's meter currently reads `awaiting your hand` when empty and `N words` when typed. Tone is right; specific copy may want a working session. (Pause-point clearing meter is "BECOMES YOUR — OBSERVATION SET" etc., which is locked.)

---

## Mock reconciliation (worktree-exploration findings, 2026-05-10)

> **Clearly experimental.** This section formed during the 2026-05-10 live walk-through of the prototype after D1 + D12 landed. It reconciles what the design package (`tmp/switchback/`) actually contains against what the production codebase carries. If the trail experiment doesn't ship, this whole section can be lifted out with no holes in the rest of the charter — **D19/D20/D21 live here, not in the original Open Design Questions list, precisely so the canonical D1–D18 set stays intact under either outcome.**
>
> Treat the two tables below as a working scratch — not commitments. The framing is real (the mock is incomplete in both directions), but the *specific* items are subject to revision as we walk further.

### In the mock that probably doesn't belong (or needs decision)

| Mock element | Status / call needed |
|---|---|
| **Tweaks panel** (atmosphere / trail-style / path-tension) | README itself says "implement as power-user view or remove" — currently scoped OUT |
| **Trail Map** (second view) | D8 deferred — open question whether the throughline rail already does this work; may be redundant rather than additive |
| **Compass-rose ornament** (Trail Map only) | Pure decoration; cut unless it earns its place |
| **Multiple trail styles** (ink / footpath / thread) | "Ink" picked; the others are dev-only |
| **Designer's seed field text** (Mark 4:35-41 placeholder content) | Already replaced by real SFDI fields — non-issue |
| **Single-textarea-per-stop assumption** | Already broken by D1 (within-field walk) — non-issue |
| **Pause-point as a single-line input** | Real pause-point produces the named outcome (Observation Set / Interpretation Set / Christ-Connection Statement / Implications Synthesis). May warrant more than one line — needs design call |

### In the codebase that the mock doesn't account for

| Item | Currently | Trail status |
|---|---|---|
| **Heavy-lifting overview screens** (Phase 1 F3, Phase 2 F8, Phase 3 F2/F5, Phase 4 F1/F4) | Fire on first per-sermon entry to frame the field | Not rendered in trail (gap) — see D19 |
| **Multi-Q fields** | 15 of 25 fields are multi-Q | Landed via D1 |
| **N/A toggle** | Per-question applicability flag | Open — D2 |
| **Save status** | Debounced writes from parent | Hardcoded "SAVED" — D3 |
| **AdvanceGateChecklist** | Per-boundary composite-gate UI | Mounts unstyled — D17 |
| **PassagePopup** (scripture access) | Modal on passage-chip click in legacy | Chip is `cursor:pointer` with no handler — D4 / D16 |
| **"Restore panels" affordance** | Legacy Field 3 (Divisions) `takeoverWhenActive` mode has it | Trail has no equivalent because trail IS the takeover — likely non-issue |
| **FeedbackFlag** | Currently Manuscript tab only | D14 |
| **Per-tab notebook** (post-ARI) | Per-tab scratchpad | D15 deferred |
| **Tour anchoring** | Workspace tour stops anchor on legacy selectors | Trail breaks them — D13 deferred |
| **Tab strip / workspace chrome exit path** | Legacy workspace shell holds tabs + sidebar | Trail covers everything via fixed-position takeover — see D20 |
| **Series-level metadata** | Legacy shows series + calendar context | Mock explicitly says "no series information" — see D21 |
| **Step 2 → 5 transition / terminus** | Pastor advances out of Implications pause to MPT/MPS | Trail unmounts; workspace shell returns. D9 / D10 cover scope; the *visual* of leaving the trail still needs care |
| **Old-sermon exemption** (empty-evidence escape) | Legacy gate has an old-sermon escape | No surface in trail; needs decision before legacy cutover |
| **Cross-phase reads** (Phase 2/3/4 synthesis tables read Phase 1's `thought_units`) | Already wired in shared helpers | Working in trail — verified during walk |
| **Pastoral Context awareness layer** (Phase 1 Field 8) | First PC surfacing per SFDI | Walks correctly via D1 |

### D19 — Heavy-lifting overview screens in the trail

Phase 1 Field 3 (Divisions), Phase 2 Field 8 (Interpretation Synthesis), Phase 3 Fields 2 + 5, Phase 4 Fields 1 + 4 carry an `overview` block that fires on first per-sermon entry in the legacy layout. The trail goes straight into the questions and skips the overview entirely.

Direction (not yet decided): a "pre-clearing" variant of the clearing card that renders the overview text + a "Continue to begin" button, fires once on first arrival at the field's first Q when the field is empty, suppressed on subsequent visits. Or inline above the prompt as a quiet first-Q-only banner.

**Resolved 2026-05-10 — pre-clearing variant.** New `OverviewClearing` component renders in place of `FieldClearing` when:
- Field has an `overview` block
- Field has zero answered (non-N/A) questions
- Field key is not in the session-scoped `dismissedOverviews` Set

Eyebrow reads `PHASE X · LABEL · OVERVIEW`. Title is the field label (or `overview.title`). Body lays out `overview.paragraphs[]` in Crimson Pro 18px / line-height 1.55. Actions row: `← look back` + `Continue to begin →`. Continue dismisses the overview for this session (look-back / re-entry won't re-fire it). The clearing's bloom keyframe doesn't fire on dismiss → continue feels like a soft fade into the work, not a hard cut.

### D20 — Trail exit without finishing Step 1

The trail covers the workspace shell via fixed-position takeover. The pastor has Continue (forward) and Look-back (within-trail). What if they want to switch to another workspace tab (Manuscript, Delivery, etc.) without finishing Step 1? Or back to the Dashboard? Currently no surface for it.

Options:
- A small "exit trail" affordance in the trail topbar (the back arrow currently does within-trail look-back; it could instead exit to workspace shell on first-press-from-Step-1-Field-1)
- A keyboard shortcut (Esc, paired with D5)
- The sidebar remains accessible (de-takeover the sidebar layer)

**Resolved 2026-05-10.** Two affordances:
- `× Exit` button in the trail topbar's right area (left of stop counter). Calls a new `onExit` prop.
- `Esc` key (per D5) when not in editor and popup not open → same `onExit`.

`StudyTab` owns the suppression state: `const [trailSuppressed, setTrailSuppressed] = useState(false)`. `onExit` flips it true; the `showTrail` calculation now checks `!trailSuppressed`. When suppressed, the legacy three-column shell renders. A "Trail mode →" button appears in the legacy view's top-right (visible only when `trailSuppressed && activeStep === 1`) to flip back. Refresh resets — no persistence.

### D21 — Series-level metadata visibility

The mock README says explicitly: "No series information — series-level metadata is NOT shown here." The legacy layout shows series context. Real design call: is the trail's stripped-down topbar a deliberate focus move (you're walking THIS text, not the whole series), or a mock omission?

Default lean: trust the mock — the contemplative single-passage focus is the point of the trail. But pastors preaching a series may want quick context. Decide before cutover.

**Resolved 2026-05-10 — no series metadata.** Trust the mock. Series concerns are not a beta concern; the workspace trail is for one-sermon prep, and series-level coordination lives elsewhere (Series Planner, currently gated per ARI Phase 0). If series context becomes a real need post-beta, revisit.

---

## Scope boundaries

**IN scope (this initiative will ship):**
- Step 1 (Observe / Interpret / Redemptive Thread / Implications) trail rendering
- Pause-point clearing variant (4 between-phase stops + Implications → Step 2 hand-off)
- Mount/unmount integration with `StudyTab` (`activeStep === 1` takeover)
- Dark-mode support
- Composite-gate UI in the clearing
- Multi-question handling (D1)
- N/A handling (D2)
- Save-status wiring (D3)
- Topbar passage chip → PassagePopup (D4)
- Keyboard nav (D5)
- Camera tween (D6) and trail-line draw-on (D7)
- Look-back boundary verification (D12)
- Sufficiency-gate UI design (D17)

**OUT of scope (deferred or excluded):**
- **Trail Map (D8)** — design exists; build deferred unless explicitly added to this initiative
- **Step 2–5 trail extension (D9)** — keeps workspace shell; re-evaluate later
- **Tour rewrite (D13)** — defer until trail surface stabilizes
- **Notebook integration (D15)** — defer to ARI follow-on
- **Tweaks panel** (atmospheres, trail style, path tension) — design notes these are dev-only; not shipped
- **Schema migration / new columns** — none required
- **AI re-introduction** — categorically excluded (ARI binding)

---

## Phasing (proposed; confirm before executing)

Numbered phases to give the work a spine. Each phase ends in a green-state worktree commit. No phase combines two open D-questions; each gets its own working session and resolution.

| Phase | Scope | Ships when |
|---|---|---|
| **0** | Prototype landed in worktree (already done) | ✅ pre-charter |
| **1** | Visual polish + dark-mode parchment-token flow | ✅ in flight (the change you flagged this session) |
| **2** | D1 — multi-question handling | One direction picked + implemented; all 25 fields editable in the trail |
| **3** | D2 — N/A handling re-entry | Pastor can mark a question N/A from inside the trail |
| **4** | D3, D4 — save status + passage popup wiring | Trail topbar feels alive |
| **5** | D5 — keyboard nav | `Enter`/`Cmd+←`/`Esc` wired |
| **6** | D6, D7 — camera tween + line draw-on | The walk *feels* like a walk |
| **7** | D12, D17 — look-back verification + gate UI design | All boundary cases verified manually |
| **8** | D16 — scripture access pattern | Pastor can read scripture without leaving the trail |
| **9** | Pastor testing in lived sermon prep | At least one full sermon prepped end-to-end through the trail |
| **10** | Cutover — remove three-column legacy layout from Step 1 path | Legacy `study-tab-shell` Step 1 branch deleted; trail is the only Step 1 surface |
| **D8 (parallel or post)** | Trail Map view | Decided in its own working session — not blocking core trail ship |
| **D9, D10 (post)** | Step 2–5 trail extension or terminus design | Decided after Step 1 is in lived use |

---

## Process & guardrails

- **Per-phase pattern.** One phase, one commit, one entry in the worktree changelog. No phase merges to `main` until pastor-test (Phase 9) signs off — the worktree is the home for the whole initiative.
- **D-question resolution.** Each D-question gets a short working note appended to this charter when decided, with date and rationale. Don't silently pick in code.
- **Non-negotiable check before each commit.** Before any commit, verify: data round-trips, dark mode dissolves, structured editors mount unchanged, composite gate still blocks. If any fails, the change isn't ready.
- **No drift from SFDI/SADI/ARI.** The trail is a rendering. If a phase pulls SFDI content into the trail's geometry in a way that requires SFDI to change, stop and write a SFDI follow-on instead.
- **Pastor testing is the real test.** The qualitative test (above) is the only acceptance criterion that matters. Type-checks and rendering verification confirm the surface works; only lived sermon prep confirms the surface *lands*.

---

## Pre-execution checklist

Before Phase 2 starts:

- [ ] Charter reviewed and any disagreements with the locked decisions raised
- [ ] D1 working session scheduled (multi-question handling — single biggest open shape)
- [ ] Phase 1 dark-mode change verified visually in both light and dark palette
- [ ] Worktree is current with `main` (no merge conflicts pending)
- [ ] Memory pointer added (`project_study_trail_state.md`) so future sessions enter via the charter

---

## Index entries (memory + cross-refs)

Once this charter lands:

- New memory: `project_study_trail_state.md` — pointer to this charter, current phase, current open D-questions
- Cross-ref from `project_sprd_sfdi_state.md`: trail is the new Step 1 surface; SFDI content commitments unchanged
- Cross-ref from `project_ari_state.md`: trail preserves ARI's pastor-authored end-to-end commitment
- (When D8 decided) cross-ref from this charter to a Trail Map sub-charter or section
