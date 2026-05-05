# Tunnel Mode — Linear-Reveal Workspace (Deferred)

**Status:** Designed and prototyped 2026-05-04. Reverted to pre-tunnel Alt 1 same day; held for future consideration. Captured here so the design + implementation can be revisited cleanly.

**Audience:** The pastor-developer of SermonForge.

---

## What tunnel mode is

A linear-reveal workspace UX. Instead of showing all stages, steps, sub-phases, and fields up front (with the throughline as a permanent navigational map), the workspace reveals work one layer at a time as the pastor *earns* each new layer by completing the prior.

The throughline becomes a *trail you walk* rather than a *map you stare at*. Past visible (collapsed, clickable). Active is the only fully-rendered work surface. Future hidden until earned.

## The intent (in the pastor-user's words)

> What if instead of all the stages showing, there's a blank screen on load in. It says "Start" or "Start here." Click on it, and it becomes study, and exegesis only. Only one field at a time. Next field only shows up when active. No other phases until active. No other steps until active. So it's like a trail. I want to give that a try. Bc it would truly isolate the user in the moment.

The throughline should be progressively revealed as work is completed:

> As you go down the tunnel, will the throughline be progressively revealed? And as each subphase is worked through, will that then reveal the next subphase, and then the next step?

Followed by a clarifying note that the trail of completed sub-phases should be **horizontal** (chips lining up left to right as each completes), not a vertical stack:

> When observe is finished, it doesn't disappear. It moves over. Then the next one moves next to it when its finished. And so on.

## The full tunnel shape

**On workspace open (no work yet):** blank centered "Begin" CTA. No stage tabs, no step strip, no rail. Just a quiet hint about how the tunnel works.

**After Begin:** the sermon's first sub-phase opens with field 1, question 1 active. Past = none yet. Future = hidden.

**As pastor advances within a field:** past questions collapse to clickable trail markers above the active question. Future questions hidden.

**As pastor advances across fields:** past field collapses to a single clickable trail marker (e.g. "Background — answered, click to revise"). Future fields hidden.

**As pastor advances across sub-phases:** past sub-phase becomes a horizontal chip in a trail row above the writing column. Each new completion slides in next to the previous. Click a chip → jump back to that sub-phase to revise.

**Same pattern at step level:** completed steps stack as a second horizontal chip row above the sub-phase row.

**Same pattern at stage level:** completed stages stack as a third horizontal chip row above the step row.

**The "Reveal Map" overlay (proposed companion, never built):** a deferred birds-eye view accessible via a "Reveal Map" button somewhere obvious. Re-mounts the full ThroughlineRail visualization as a popout/overlay so the pastor can see the entire arc when they want it. Tunnel = default. Map = optional.

## Decisions ratified during the prototype walk

1. **Past work as clickable trail markers** (not vanishing), so the pastor can revise.
2. **Scripture panel always-on** in the right column from Begin onward, slimmed to ~280px width. Wired to ESV via `fetchPassage` (the existing IPC). The `result.esv` string + `[N]` verse markers parse into superscripted verse numbers.
3. **Returning to an in-progress sermon lands on the active field**, not the Begin screen. Begin is a once-per-sermon gesture for truly fresh sermons.
4. **Trail granularity collapses by hierarchy:** Background's 4 questions become individual lines in the question-trail, then collapse to a single "Background — answered" line in the field-trail when the field completes, then collapse to a single "Observe" chip in the sub-phase-trail row when the sub-phase completes.
5. **Chip click → jump back into that sub-phase as active.** The chip drops out of the trail (since it's no longer "completed in the past"), the active sub-phase becomes the clicked one, and re-completing it re-adds the chip.
6. **Sub-phase chips first; cross-step and cross-stage chip rows added later.**
7. **Tagged for later:** scripture search/jump function so pastors can look up a different passage without leaving the column; linked-verse highlight per active field.

## What was built (commit-level pointers)

The prototype landed across uncommitted working-tree changes on 2026-05-04. The shape:

- **`src/components/TunnelView.jsx` + `tunnelView.css`** — the linear-reveal wrapper around `SpotlightWorksheet`. Key trick: TunnelView slices the field array to `[past, active]` before passing to SpotlightWorksheet, hiding future fields entirely. Also handles the Begin screen.
- **`src/components/SubPhaseTrail.jsx` + `subPhaseTrail.css`** — horizontal chip trail above the active TunnelView. Renders one chip per completed sub-phase. Click to jump back.
- **`hideFutureQuestions` prop chain on SpotlightWorksheet → SpotlightField → MultiQuestionActive** — when true, the multi-question active rendering hides questions after the spotlit one (in addition to the existing past-as-collapsed behavior).
- **`StudyTab.jsx` refactor** — replaced the three-column shell (`study-tab-shell`) with `tunnel-shell` (writing column + scripture, no rail, no step strip). Each Step 1 sub-phase mounted TunnelView instead of SpotlightWorksheet. SubPhaseTrail rendered above the active sub-phase block.
- **`SermonWorkspace.jsx`** — dropped "How this works" button (placeholder for future "Reveal Map"). Stage tabs CSS-clipped to 1×1 px (kept in DOM so Process Contract #3's movement-event marker test still passes when clicking tabs programmatically).
- **`ScripturePanel.jsx`** — fixed shape mismatch (read `result.esv` string, parse `[N]` verse markers, handle `esvPending` no-key state and `esvError` API errors). Slimmed to 280px.
- **`src/core/spine.ts`** — added a `browserPreviewMock` for `create-sermon` and `get-sermon` so the workspace can render under Vite-only browser preview (no Electron preload). Returns a minimal mock sermon shape.

## What stayed after revert

- ESV wiring fix in `ScripturePanel.jsx`.
- Scripture panel slimmed to 280px.
- `browserPreviewMock` in `src/core/spine.ts`.

These are pre-tunnel-applicable improvements and were kept after the revert.

## How to revisit

The component code lived at the file paths above before being deleted on revert. To rebuild:

1. `git log --all --oneline | grep -i tunnel` (or check the working-tree state preceding the revert commit) to find the implementation files.
2. Re-create `TunnelView`, `tunnelView.css`, `SubPhaseTrail`, `subPhaseTrail.css` from that history.
3. Wire `StudyTab.jsx` to mount TunnelView (with `hideFutureQuestions={true}`) in place of SpotlightWorksheet.
4. Wire SermonWorkspace.jsx to CSS-hide stage tabs and drop "How this works."
5. Add SubPhaseTrail above active sub-phase content; wire `completedSubPhases` to `evaluateAdvance(sermon, "sub_phase", idx).ok` for each index `< activeSubPhase`.
6. Build the Reveal Map overlay (this never shipped — would re-use `ThroughlineRail` as the bird's-eye component, mounted in a slide-over panel triggered from the top bar).

## Why it was held

The user asked to revert without giving a specific reason. Possible threads to pick up next time:
- The visual trade-off of hidden navigation versus discoverability.
- The Reveal Map dependency (tunnel mode without the map asks pastors to remember where they are; the map is the safety net).
- The cross-stage navigation gap (without stage tabs, jumping back to revise a past stage requires the trail or the map).
- Whether the trail's progressive reveal is actually felt as "earning" each layer, or if it just feels like missing UI.

These are open questions for whenever tunnel mode comes back.

---

*End of tunnel-mode design notes.*
