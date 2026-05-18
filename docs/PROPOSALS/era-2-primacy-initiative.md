# Era-2 Primacy Initiative — Charter

**Status:** Ratified, 2026-05-12.
**Scope:** Whole workspace (Study + Assembly + Manuscript).
**Supersedes (selectively):** SFDI and SADI rulings named explicitly below. All other rulings in those docs stand.
**Related:** [`CORE.md`](../CORE.md), [`sermon-workspace.md`](../SYSTEMS/sermon-workspace.md), [`study-field-definition-initiative.md`](./study-field-definition-initiative.md), [`sermon-anchor-definition-initiative.md`](./sermon-anchor-definition-initiative.md), [`workspace-restructure-charter.md`](./workspace-restructure-charter.md).

---

## Why this charter exists

The workspace has been built in three eras and the seams show.

**Era 1 — the original SF build.** Built directly from Merida's *Christ-Centered Exposition* framework. Free-text fields per question. AI scaffolding. PC as a parallel always-on card. Compiled list as an AI synthesis. MPS prompt heavily PC-weighted.

**Era 2 — the SFDI/SADI walks.** Per-field rationalization. Named outcomes. Cumulative thought-unit table across phases. Hard gates at sub-phase boundaries. The three-way conversation in Implications. PC moved into Phase 4 Field 3.

**Era 3 — ARI + Workspace Restructure.** AI removed entirely. Stages collapsed from 4 to 3. Step layer retired. Trail-and-clearing UX metaphor introduced (clearings, pause-clearings, switchback, stage-boundary).

Each era was internally coherent. Each layered on top of the prior without fully removing what came before. The result is a system where each piece can defend itself by pointing to its own era's logic — and the whole feels stitched. A pastor walking the workspace experiences three eras' commitments fighting for the same screen.

The fix is not another era. The fix is to pick one era as the spine, let the others serve it, and remove the residue that doesn't.

---

## The operating principle

**Era 2 is the spine, expressed invisibly.**

Two clauses, in order:

1. **Era 2 primacy.** The constraint system is what makes SermonForge different from a worksheet. Thought units as a keyed array. Cumulative cross-phase table. Gates that refuse advancement. Named outcomes as substrate. Era 1 (Merida's curriculum) is the content the spine carries. Era 3 (the trail) is the UX it surfaces through. When eras conflict, era 2 wins. When pieces from era 1 or era 3 exist with no era 2 role, they come out.

2. **Invisibility.** The constraint system should not announce itself. The pastor experiences clarity emerging from work, not the system asking for proof of work. Architecture does the work; the pastor experiences the work, not the architecture. Ceremony is a tell — when a surface exists to mark that something happened rather than to make something happen, it is era 3 residue and should be removed or reduced.

Together: **constraint without ceremony.**

This principle resolves every thread in this charter. Where era 2 architecture is creating curriculum bloat, the charter rules on lighter architecture, not on copy fixes. Where era 3 surfaces are wrapping nothing, they come out. Where era 1 framing instructs pastoral practice through architectural copy, the framing is rewritten or removed.

---

## Authority and execution

This charter supersedes specific rulings in SFDI and SADI named in the relevant sections below. All other rulings in those docs stand. Each amendment is named explicitly so future authority is traceable.

**Execution is opportunistic, not sweeping.** The charter lists what should change. Each change rides along with the next era 2 work on its surface. No "delete legacy keys" sweep PR. No "rewrite all overview copy" sweep PR. When a surface is touched for any reason, the era 2 work on that surface comes with it. The charter is the durable record of what each touch should accomplish.

**SFDI and SADI reshaping.** Both docs receive a banner block at the top noting era 2 primacy, with section-level amendments marked inline. The reshaping is opportunistic — each section is rewritten when its content is next touched, not in a sweep. Until reshaped, this charter is the operative authority for any conflict.

---

## Rulings

### Ruling 1 — Marinate is curriculum, not architecture

**The change:** "Marinate" exits the architecture. It is removed from Process Contract #6's invocations, from the Implications Synthesis overview copy, from SFDI Phase 4's named-outcome framing, and from any other surface that treats it as a structural commitment.

**The reasoning:** Merida tells the pastor to step back after Implications and ponder before crafting the sermon. That is pastoral practice. SermonForge's job is to produce the substrate the pastor sits with — the Implications Synthesis paragraph plus the cumulative table plus the prior named outcomes. Whether the pastor closes the laptop after writing the Synthesis is the pastor's call, not the system's.

The current state names the Synthesis as "the marinate-output" in three places (Process Contract #6, the field's overview copy, SFDI Phase 4) and enforces marinate in none of them. That is the precise pattern this charter exists to remove: era 1 curriculum wearing era 2 architectural language with no era 2 enforcement underneath it.

**What the Implications Synthesis is, after this ruling:** the named outcome of Phase 4. The integrated form of the three-way conversation. The substrate Anchor opens against. Full stop. No marinate framing in the architectural copy.

**SFDI amendment:** Phase 4 section's references to "marinate-output" and "the marinate moment is restored" are struck. The named-outcome description retains the substantive content (what the Synthesis integrates, what it feeds, why it cannot be N/A) and removes the pastoral-practice framing.

**Implementation surfaces:** `IMPLICATIONS_FIELDS[3].overview.paragraphs` in `studyFields.js` (the fourth paragraph beginning "This is the marinate-output" is struck); CORE.md Process Contract #6 (any "marinate" language struck); SFDI Phase 4 walk entry.

---

### Ruling 2 — Pause-clearings are orientation, not output

**The change:** Pause-clearings no longer ask for content. They display what was just produced and frame what comes next. The pastor reads, clicks Walk on, moves.

**The reasoning:** The current pause-clearing pattern asks the pastor a one-sentence synthesis question after they have just written the phase's named-outcome paragraph. The one-sentence answer is stored in `_synthesis` keys. Nothing reads those keys — not `flattenToText`, not `evaluateAdvance`, not any handoff. The pause-clearing is era 3 ceremony asking for era 2-shaped storage that no era 2 mechanism consumes.

The pause's actual job is orientation: *you just produced X; next is Y*. That job is real — boundaries are real moments, the pastor benefits from being told what's behind them and what's ahead. But it does not require input. Asking the pastor to write a one-sentence version of what they just wrote in paragraph form is the system asking for proof of work, which is the inverse of invisibility.

**What the pause-clearing is, after this ruling:**

- Displays the named outcome the phase just produced (the paragraph, or in Phase 1's case, the Observation Set as the aggregate).
- Frames the next sub-phase ("Next: Interpret — what does the text mean?").
- Surfaces a Walk on affordance.
- No textarea. No question. No storage.

**Phase 1 asymmetry resolves naturally.** All four pauses now do the same thing: name what was produced, frame what comes next. Phase 1's pause reads "You just produced the Observation Set" — the aggregate is named even when it is not a single paragraph. Parallelism restored without forcing Phase 1 to produce a paragraph the throughline doesn't need.

**Stage-boundary pause (Implications → Anchor) treatment.** Heavier visual register per the Workspace Restructure RW4 ruling — larger title, more breathing room, the four named outcomes displayed together. Still no input. The four outcomes displayed in one frame IS the weight. Asking for a fifth synthesis at that boundary would re-introduce era 3 ceremony pretending to be architecture. Same rule applies to the Assembly → Manuscript stage-boundary pause.

**SFDI amendment:** the sub-phase pause-clearing table (the four one-sentence synthesis questions) is struck. SFDI's handoff sections retain their handoff articulations (what passes from phase to phase) and remove the per-pause synthesis-question column.

**Implementation surfaces:**

- `studyTrailShared.jsx` — `PauseClearing` component becomes display-only. Its synthesis-question prop, textarea, and `updateStructured` write path come out. `StageBoundaryPause` becomes display-only with named-outcome readback.
- `studyFields.js` — `_synthesis` keys are no longer written. Any read paths that look at `_synthesis` come out.
- Any data column that stored a `_synthesis` envelope (`observations._synthesis`, `interpretation._synthesis`, `redemptive_thread._synthesis`, `implications._synthesis`) — the keys come out as part of the pause-clearing rewrite. No production sermons exist; no migration needed.

---

### Ruling 3 — Era 1/era 3 residue is deleted on contact, not legacy-tolerated

**The change:** When a surface is touched for era 2 work, any era 1 or era 3 residue on that surface comes out in the same change. Defensive retention is not preserved unless an explicit era 2 role is named.

**The reasoning:** Defensive retention is era 1 thinking — data is precious, schemas must not break, legacy paths must be tolerated. With no production sermons, defensive retention preserves nothing real and obscures what is current. Every "parsed but ignored" comment is a piece of dead code the next reader has to mentally route around.

**The deletion list (opportunistic, not sweep):**

- `current_step` column — retired by Workspace Restructure; **deleted in the trail deletion sweep (Phase B2)**. Distinct from `last_touched_position` (the new field that drives re-entry routing).
- The three legacy PC columns (`topic_theme`, `audience_assumptions`, `background_noise`) — retained "defensively" with no era 2 role. Delete.
- Retired field keys in JSON columns (`background`, `commands`, `statements`, `basic_outline`, `context_impact`, `characters`, `diagram`, `summarize_parts`, `summarize_whole`, the 5 IMPLICATIONS_THEOLOGICAL keys, the 8 IMPLICATIONS_PERSONAL keys, `speaks_of_christ`, `relation_to_christ`, `biblical_theme`, `promise`, `need_for_christ`, `nature_of_god`, `jesus_hero`, `unbeliever`, `compiled`) — preserved-on-read in `parseStructuredField`. The read-path preservation comes out when `parseStructuredField` is next touched.
- `legacy_notes` escape — kept until then, but its presence in the parse path is era 1 inertia, not era 2 commitment. Audit when touched.
- Pre-restructure stage aliases (`Blueprint`, `Frame` coerced to `Assembly` on read) — coercion logic deletes when the read path is next touched.
- `IMPLICATIONS_UNBELIEVER_KEY` and `IMPLICATIONS_COMPILED_KEY` exports — retained "so `flattenToText` can surface legacy data through context pipeline." The context pipeline is gone (ARI). These exports do nothing. Delete.
- The `flattenToText` undeclared-key fallback (Phase 4 Sprint 2 addendum) — added to surface legacy data. With ruling 3 in effect, the fallback is unnecessary. Audit when touched.

**No sweep PR.** Each item on the list comes out when its file is next touched for any reason. The list is durable documentation; the deletions are opportunistic.

**Boundary on this ruling.** Deletion applies to era 1/era 3 *residue* — code or data that exists without an era 2 role. It does not apply to era 1 *curriculum* (Merida's questions, field prompts, hint text) which is the content the spine carries. Curriculum stays; residue leaves.

---

### Ruling 4 — Overview and hint copy describes architectural function, not pastoral practice

**The change:** Every overview screen, field hint, pause-clearing copy, and named-outcome description is rewritten (opportunistically, when touched) to describe what the field produces and how it composes into the throughline. Pastoral practice — "step back and marinate," "ease back when you find yourself drafting application," "make sure you're in awareness, not focus" — is removed from architectural copy.

**The reasoning:** Architectural copy that instructs pastoral practice is era 1 instruction wearing era 2 framing. It is also a tell of invisibility violation: the system is announcing how the pastor should think, not letting the work do the thinking. The field's prompt asks for what it asks for. The pastor either does the work or doesn't; the architecture's job is the gate, not the lecture.

**What stays in architectural copy:**

- What the field produces.
- How it composes into the named outcome.
- What the named outcome feeds into the next phase.
- Why the field cannot be empty (when it cannot).

**What comes out:**

- "Step back and marinate."
- "Ease back if you're drafting application."
- "Don't insert Christ where he isn't."
- "Make Jesus the hero of your sermons."
- Any framing that tells the pastor *how to be* during the work.

**Boundary.** Question prompts themselves may carry instructional shape — that is curriculum and is in scope for SFDI/SADI per-field walks, not this charter. The principle applies to the surrounding architectural copy (overviews, hints, pause readbacks, named-outcome descriptions). When a question prompt itself instructs pastoral practice, that is a per-field curriculum decision and is deferred.

**No sweep audit.** Each piece of copy is rewritten when its surface is next touched.

---

### Ruling 5 — Field 8 (Possible Implications) stays

**The change:** Field 8 retains its current architectural role as the PC awareness entry point. Its name, position, and questions are not changed by this charter.

**The reasoning:** Era 2 audit of Field 8 — does the throughline need it? The PC progression arc requires four states: dormant (Phase 1 Fields 1-7), awareness (Phase 1 Field 8), marinating (Phase 2), texture (Phase 3), integration (Phase 4). Without Field 8, the arc skips awareness and goes from dormant directly to marinating in Phase 2 — which means PC has no entry point on the page the pastor is on, only in the pastor's head.

Era 2 commitment: PC's progression is structural, not pedagogical. Process Contract #4 ("Pastoral Context is driven by the text, not the other way around") names PC's entry as a structural property of the throughline. If PC enters only as a Phase 2 internal thought, the structural commitment is unenforced.

Field 8 is the architectural entry point. It is era 1 content (no direct Merida source) made architectural by era 2 (the PC progression arc). That is era 1/era 2 snapping together — content riding on structure. Not residue.

**What this ruling does not do:** It does not address whether Field 8's two current questions are the right ones, or whether the hint copy violates ruling 4. Those are curriculum and copy questions deferred to per-field walks.

---

### Ruling 6 — `takeoverWhenActive` retires; throughline visibility is the default

**The change:** Heavy-lifting fields no longer collapse the rail and panels when active. The rail stays visible. The pastor sees the throughline at all times.

**The reasoning:** `takeoverWhenActive` is era 3 UX (focus optimization) overriding era 2 commitment (throughline visibility). Two eras fighting on the same screen. Era 2 primacy resolves it: the rail is the surface that makes the structural throughline visible. Hiding it during the most structurally important work is the inverse of what era 2 wants.

The cost: heavy-lifting fields (Field 3's canvas, the synthesis tables) get less screen width. The benefit: the pastor always knows where they are in the arc, especially on re-entry. The re-entry friction noted earlier (pastor returns Thursday, has to reconstruct where they are) is partly produced by the rail vanishing at the moments most likely to be re-entered.

**Implementation surfaces:** `takeoverWhenActive: true` flags in field definitions come out. The corresponding rail-collapse logic in the workspace shell comes out. Heavy-lifting fields render inside the standard rail-visible layout. The "Restore panels" button comes out (no panels to restore).

**Adjacent consequence — Field 3's architecture pressure.** Some of Field 3's perceived overengineering is a function of the canvas needing to fill the takeover. With the takeover gone, Field 3 renders at standard field width. Whether the canvas surface itself is still doing more than the cumulative table needs is a separate question (ruling 8).

---

### Ruling 7 — Implications Synthesis depletion is real; mitigation is invisibility, not architecture

**The change:** No architectural change to the Implications Synthesis. The friction (most important named outcome written at the moment of greatest depletion) is acknowledged and not fixed by adding architecture.

**The reasoning:** The instinct under era 1 would be "add a marinate gate," "force a save and step away," "AI-assist the synthesis." Each is ceremony. Each violates invisibility. The friction is real, but the fix is not more system.

The actual mitigation, where it exists, is invisibility-shaped:

- Heavy-lifting overviews don't repeat on re-entry (already in place). Pastor can write the Synthesis across multiple sittings without the system gating the cross-session work.
- The cumulative table sits beside the Synthesis paragraph (already in place). The pastor's per-unit work *is* the substrate for the paragraph; they are not synthesizing from memory.
- The prior three named outcomes are visible alongside (already in place per the SFDI Phase 4 handoff).

What the system does not do: prompt the pastor to take a break, surface a "you've been at this a while" banner, or auto-save with a "you can come back later" message. Those are invisibility violations.

**What this ruling does not preclude:** if at some future point a pastor reports that the Synthesis feels rushed in a way the existing mechanisms do not catch, that is curriculum-level adjustment territory (better question framing, better example outputs in the overview), not architecture territory.

---

### Ruling 8 — Field 3 is reworked; depth-marking is the discipline, everything else comes out

**The change:** Field 3's canvas is reworked to the original intent — a phrase-by-phrase indented structural layout where main statements sit at the left margin and supporting clauses indent under what they support. Depth-marking stays as the discipline that produces the thought units. Inline paraphrase, the thought-unit-end affordance and editor, the signal/cue field, the after-line marker, and the cap-line filled-state collapse all come out.

**The reasoning:** Field 3's overengineered feel was architecture pressure — the cumulative table needed UUID-keyed rows representing thought units, the canvas had to produce them, and each downstream consumer's column requirements drove a new surface element on the canvas. What started as "lay the passage out so the structure shows" became a canvas carrying depth + paraphrase + thought-unit-end markers + summary editor + signal field + cap-line UX, each one defensible in isolation, none of them serving the original intent.

The original intent: the depth-0 lines ARE the thought units. The indentation itself does the work. The pastor types the passage by hand, pushes main statements left, indents supporting phrases under them. The structure shows the structure. No separate "summary" field is needed because the depth-0 line IS the summary. No separate "after-line" marker is needed because the row's position IS the location. No paraphrase column is needed because Phase 2's Meaning column is the in-voice work and doing it twice is doing it twice.

**What stays:**

- Depth-marking — Tab/Shift+Tab adjusts a row's structural depth. The discipline of placing each phrase at its correct depth IS the discipline that surfaces the thought units. This is load-bearing curriculum riding on architecture.
- Per-row UUIDs — the merge key the cumulative table depends on. Load-bearing architecture.
- Typing-by-hand discipline — paste blocked on canvas rows, per the existing SFDI per-question paste rule. Load-bearing curriculum.
- Line-number gutter — orientation aid, not consumed downstream. Lightweight; keeps.

**What comes out:**

- Inline paraphrase per main row — Phase 2's Meaning column is the in-voice work.
- Thought-unit-end affordance, summary editor, signal/cue field, cap-line filled-state visual — the depth-0 line is the thought unit. No separate marker is needed.
- "Mark as thought-unit end" button and its inline editor.
- Per-row composite gate sub-checks that referenced paraphrase-per-main and thought-unit-end-presence — the gate's job becomes simpler (see below).

**What the gate becomes:** Field 3's composite gate currently checks three things — structure (main + modifier present), paraphrase per main row, at least one thought-unit-end. Under the rework, the gate checks one thing: at least one depth-0 row exists AND at least one row indented under a depth-0 row exists. The discipline is "you have shown the structure." Hover-checklist reflects the single gate.

**Downstream consequence — cumulative table simplifies.** A thought unit is now a depth-0 row. The cumulative table's three current read-only columns (`thought_unit_summary`, `after_line`, `signal`) collapse to one (`thought_unit_text` — the row's text itself). The 6-column closure SADI ratified becomes a 4-column closure: thought unit + meaning + christ-connection + implication. This is a real change to a SADI commitment; see SADI amendment section below.

**Implementation surfaces:** `OBSERVE_FIELDS[2]` (`divisions`) field def in `studyFields.js` — the canvas question's kind and structural-list sub-shape change; thought-unit-end editor and signal field come out. `IndentedSentenceCanvas` component — paraphrase rendering, thought-unit-end button and editor, signal field all come out. `deriveThoughtUnitsFromCanvas` simplifies to "depth-0 rows = thought units." `studyAdvancement.js` Field 3 composite — `canvasHasMainWithModifier` stays (as the single gate); `everyMainHasParaphrase` and `hasOneThoughtUnitEnd` come out. The synthesis-table column defs in `INTERPRET_FIELDS[7]`, `REDEMPTIVE_FIELDS[4]`, and `IMPLICATIONS_FIELDS[3]` simplify to a single read-only column for thought unit + the cumulative-phase column.

**Detailed shape deferred.** This ruling sets the bounds. The detailed Field 3 rework — the new canvas's exact data shape, edge cases (what happens to a depth-0 row that has no children, what counts as "showing structure"), the migration of any partially-canvas-shaped fixtures — gets its own walk after this charter ratifies. No production sermons exist; the rework is a clean cut.

---

### Ruling 9 — Trail-and-clearing vocabulary is era 3 surfacing of era 2 structure; retained but accountable

**The change:** The trail metaphor (clearings, pause-clearings, switchback, station marks, stage-boundary) stays as the UX vocabulary. It is held accountable to era 2: each trail element either surfaces a real structural beat (sub-phase entry, field, gate, boundary, named outcome) or it is decoration and comes out.

**The reasoning:** The vocabulary is era 3 and is a UX choice. Under era 2 primacy, era 3 serves era 2. The question is whether the trail vocabulary makes era 2 structure more visible or whether it adds ceremony.

It makes the structure more visible. The throughline is structural; the trail is the visual representation of the throughline. The clearings are fields; the pause-clearings are boundaries (now display-only, per ruling 2); the stage-boundary pauses are stage transitions; the rail (per ruling 6, always visible) is the throughline itself made surface.

**What stays:** the vocabulary, the switchback geometry, the clearing-per-field rendering, the rail.

**What is held accountable:** any clearing or trail element that does not correspond to a real structural beat. The overview clearing (first-entry framing) corresponds to a structural beat (the entry into a heavy-lifting field). The pause-clearing corresponds to a structural beat (the boundary). The pastor's notebook drawer (Cmd/Ctrl+N) is a workspace utility, not a trail element — it does not need accountability.

If at some point a future addition to the trail does not correspond to a real structural beat, this charter is the appeal authority.

---

### Ruling 10 — PC dormancy between Field 8 and Phase 4 Field 3 is intentional

**The change:** No architectural change. PC's absence from the surface between Phase 1 Field 8 and Phase 4 Field 3 is intentional dormancy and is preserved.

**The reasoning:** The earlier friction observation — "PC drops out of the surface for 14 fields and the pastor forgets the room" — is a real observation but the wrong fix. PC's progression arc is dormant → awareness → marinating → texture → integration. *Marinating means the pastor is not actively writing PC content.* If the system surfaces PC during Phase 2 or 3 as a field, marinating becomes active engagement, which collapses the arc.

The text-leads-PC commitment (Process Contract #4) is structural. If PC has a surface in Phase 2 or 3, the pastor will engage it. Engaged PC is not marinating PC. The architecture protects the marinating state by giving it no surface.

What the pastor experiences during Phases 2 and 3: the text is in front of them, the prior named outcomes are visible (PC awareness lives in the Observation Set), and the work is text-meaning and text-Christ-connection respectively. PC is *implicit* in the pastor's reading of the named outcomes, not *surfaced* as a current-field demand.

If the pastor forgets the room between Field 8 and Phase 4 Field 3, the named outcomes' visibility carries the awareness forward. The Implications Synthesis at Phase 4 Field 4 is where integration happens; that is the architectural commitment.

**What this ruling does not address:** whether the named outcomes are visible *enough* during Phases 2 and 3 to carry PC awareness forward. That is a UX-surfacing question (peripheral reference panel, sidebar, hover) and is deferred to implementation when next touched. The principle: PC awareness flows through named-outcome visibility, not through a re-surfaced PC field.

---

## What this charter does not rule on

The following threads were raised during the conversation that produced this charter. They are out of scope for this charter — either because they are curriculum (deferred to per-field walks), because they are mechanical (deferred to implementation passes), or because they require their own ratification walk.

- **Field 8's question wording.** Curriculum. Per-field SFDI walk.
- **Phase 3 Field 2 N/A click reduction.** Mechanical / curriculum. Per-field SFDI walk.
- **Re-entry markers inside heavy-lifting fields.** Mechanical UX. Implementation-level.
- **MPS Q2's "satisfied another way" N/A semantic.** SADI ruling stands. If the asymmetry surfaces friction in real use, a future SADI walk addresses it.
- **Robinson's necessary/probable/possible/improbable implication grid, Dever's application grid, Keller's gospel-shape, the nine outline approaches, the opener patterns.** All era 1 curriculum that plugs into existing fields. Per-field walks (SFDI or SADI) when each field is next touched for content reasons.
- **Whether Outline (Step 3) should extend the cumulative table.** SADI ruled the table closes at 6 columns (now 4 per ruling 8) and that SADI fields don't extend it. Outline is in Assembly and is not a SADI field. If a future Outline walk surfaces a need, that walk has authority.

---

## The walk protocol

Every walk that runs under this charter's authority — Field 3 rework, future SFDI per-field walks, future SADI walks, per-piece copy rewrites, any decision that touches the workspace — runs through the protocol below. The protocol is the charter's enforcement mechanism. Without it, walks default to "okay, what do you want to say here?" — and that is how era 1 inertia returns.

The protocol does not replace SFDI's seven-slot entry pattern or SADI's eleven structural rulings — those are content patterns for what a walk produces. The protocol is the *gate* every decision passes through before it enters the seven-slot entry.

### The five questions

Every decision a walk makes — every field shape, every question wording, every overview paragraph, every hint, every UX element — answers these five questions before it ships.

**1. What era authored this purpose?**

Name the era explicitly. Era 1 (Merida's curriculum), era 2 (the constraint system: thought-unit array, cumulative table, gates, named outcomes), era 3 (the trail-and-clearing UX), or era 4 (this charter and beyond).

Era 2 and era 4 decisions ship. Era 1 decisions ship only when they are curriculum the spine is carrying — never when they are pastoral practice baked into architectural surfaces. Era 3 decisions ship only when they surface a real era 2 structural beat — never when they are ceremony.

If the honest answer is "I don't know" or "all of them," the decision is not ready. Sharpen until one era is clearly authoring the purpose.

**2. Does this announce work, or does it produce work?**

Read the decision aloud and ask: is this surface, copy, or affordance making the pastor do the work, or telling the pastor that work is happening? Gates produce work (they refuse advancement). Named outcomes produce work (they are the artifact). Question prompts produce work (they demand an answer).

Pause-clearing readbacks announce work. Marinate-framing announces work. "Step back and ponder" announces work. Status indicators announce work. None of these ship as architectural commitments.

If a decision announces work, it gets one of three treatments: cut, reduce to display-only orientation, or rewrite as a constraint that actually produces work.

**3. Which prior charter rulings constrain this decision?**

List the rulings by number. A Field 3 walk decision is constrained by rulings 4 (copy describes architectural function), 6 (rail visible, no takeover), 8 (paraphrase out, thought-unit-end out, depth-marking stays). A pause-clearing implementation decision is constrained by ruling 2.

If a decision conflicts with a prior ruling, one of two things is true: the decision is wrong, or the ruling is wrong. The walk does not silently override the ruling. Either the walk reshapes to fit, or it surfaces an explicit ruling-amendment request to the charter.

**4. What is the minimum surface that produces the required artifact?**

Default to the smallest surface that does the work. Each addition past the minimum has to defend itself: what era 2 mechanism does this serve? What downstream consumer reads this? If the answer is "it makes the work feel more complete" or "it helps the pastor see what they're doing" or "it parallels the other phases" — that is era 3 ceremony or era 1 inertia, and it does not ship.

Field 3's overengineering happened because each addition (paraphrase, thought-unit-end editor, signal field, cap-line) was defensible in isolation. The minimum-surface test is what catches that pattern in advance: if the cumulative table doesn't read it, it doesn't ship.

**5. What happens when the pastor returns to this on Thursday after starting on Tuesday?**

Every decision is tested against re-entry. If the surface relies on momentum or short-term memory (the pastor "knows what they meant" by their notes, the structure "is fresh in their head"), it fails re-entry. The artifact has to stand alone — readable, editable, locatable in the trail — without the pastor reconstructing what they were thinking.

This is where era 2 invisibility meets actual sermon-prep conditions. The pastor doesn't work in a single sitting. The system has to hold the work between sittings.

### Walk output shape

A walk that has run all decisions through the five questions produces three artifacts:

1. **The seven-slot entry** (SFDI/SADI pattern) for each field or piece touched. Name, intent, question sequence, what gets written, role, connects from, connects to. Unchanged from existing practice.
2. **The protocol record** — for each decision the walk made, a one-line note recording the answers to questions 1, 3, and 4 minimum. Questions 2 and 5 are implicit checks; record them when the answer was non-obvious or the decision was a near-miss.
3. **The amendment list** — any prior ruling the walk wants to amend, with explicit ruling number and proposed change. If empty, the walk operated entirely inside the existing bounds.

The protocol record is the walk's audit trail. Future readers can trace any decision back to which era authored it, which rulings constrained it, and why the minimum surface was chosen. If a decision later feels wrong, the record shows the reasoning — and the reasoning either still holds or it doesn't.

### Anti-patterns the protocol catches

Patterns that mean a walk has drifted from the charter:

- **"What do you want to say here?"** — Question 1 isn't being asked. The walk is in era 1 free-text mode.
- **"Let's mirror what Phase X does for symmetry."** — Question 4 isn't being asked. Parallelism is era 3 ceremony; the question is what each phase needs, not whether they look alike.
- **"It would be nice if the pastor could also..."** — Question 4 isn't being asked. Addition has to defend itself; "would be nice" is not a defense.
- **"This helps the pastor remember they did the work."** — Question 2 isn't being asked. Producing the work is the architecture's job; remembering it is the pastor's.
- **"We can add a small reminder/banner/note."** — Question 2 again. Reminders announce work.
- **"The current design assumes the pastor remembers the previous session."** — Question 5 isn't being asked. Re-entry test failed; redesign before shipping.

When a walk hits any of these, the protocol stops the decision. The walk reshapes or surfaces an explicit amendment request. It does not ship the drifted decision and rationalize it.

### How walks are scheduled

Walks are opportunistic, same as ruling execution. When a surface is touched for any reason, the walk runs on that surface before the touch ships. The walk is the gate on the touch.

Small touches (one-line copy edits, single field hint rewrites) run an inline protocol — the five questions answered in the PR or commit message, not a separate document. Large touches (Field 3 rework, a new sub-phase walk, a multi-field copy sweep) produce a full walk document under `docs/PROPOSALS/`, modeled on the SFDI/SADI walk format.

The threshold between inline and full-document is judgment. A useful test: if the touch changes architecture (data shape, gate behavior, named-outcome composition), it gets a full walk. If the touch only changes copy or surface rendering inside existing architecture, inline is enough.

---

## SFDI and SADI reshaping

**Approach:** banner block at the top of each document noting this charter's authority. Section-level amendments marked inline at the affected sections (e.g., "*Amended by Era-2 Primacy Initiative ruling N — see [`era-2-primacy-initiative.md`](./era-2-primacy-initiative.md).*"). Reshaping is opportunistic — each section is rewritten when its content is next touched, not in a sweep.

**Banner text to add at top of SFDI:**

> **Post-Era-2-Primacy Initiative status (2026-05-12):** This document predates the Era-2 Primacy Initiative. Where this document carries era 1 pastoral-practice framing baked into architectural commitments (notably the "marinate" framing in Phase 4 and the pause-clearing synthesis-question table), those framings are superseded by the Era-2 Primacy Initiative charter. The structural commitments (field shapes, named outcomes, handoffs, the seven-slot entry pattern, Process Contract #6) remain binding except where the charter explicitly overturns them. See [`era-2-primacy-initiative.md`](./era-2-primacy-initiative.md) for the rulings.

**Banner text to add at top of SADI:**

> **Post-Era-2-Primacy Initiative status (2026-05-12):** This document predates the Era-2 Primacy Initiative. SADI's structural commitments (the four anchor fields, Main Point Pair and Sermon Frame named outcomes, per-field question shapes, seven-slot entries) remain binding. Two amendments: pause-clearing input affordances described in the implementation notes are superseded by the charter (ruling 2 — pause-clearings are orientation, not output); the cumulative thought-unit table closes at **4 columns** rather than 6 (per ruling 8 — Field 3 rework collapses thought_unit_summary + after_line + signal into a single thought_unit_text column). See [`era-2-primacy-initiative.md`](./era-2-primacy-initiative.md) for the rulings.

**Specific SFDI sections to amend when next touched:**

- Phase 4 named-outcome description — strike "marinate-output" framing per ruling 1.
- Sub-phase pause-clearing section (the four one-sentence synthesis questions table) — struck per ruling 2.
- Phase 1 Field 3 (Divisions / Thought Units) — rewritten per ruling 8 (canvas reworked to depth-only structural layout; paraphrase, thought-unit-end markers, signal field all come out; depth-marking and per-row UUIDs stay).
- Phase 2 Field 8, Phase 3 Field 5, Phase 4 Field 4 cumulative-table column shapes — simplified per ruling 8 (single thought_unit_text read-only column + the cumulative-phase column).

**Specific SADI sections to amend when next touched:**

- Anchor → Outline pause-clearing description — display-only per ruling 2.
- Sermon Frame pause-clearing description — display-only per ruling 2.
- *Cumulative thought-unit table closes at 6 columns* — amended to **4 columns** per ruling 8 (Field 3 rework). The thought_unit_summary + after_line + signal collapse to a single thought_unit_text column. The substantive commitment of the section stands — Steps 2-5 read the table whole, not per-unit, and none of the four SADI anchor fields extends it. Only the column count and the upstream Phase 1 production shape change.

---

## CORE.md amendments

**Process Contract #6** — current text references the throughline producing named outcomes via field-work; per ruling 1, any "marinate" language in this contract is struck. The contract's structural commitment (named outcomes, handoffs, structural integrity) is preserved.

**Canonical Vocabulary section** — no changes. Vocabulary is era 2 and stands.

**Process Contract #4 (Pastoral Context driven by text)** — preserved. Ruling 10 affirms it explicitly.

**The Principle (Clarity through Constraint)** — preserved. This charter's operating principle (era 2 primacy, expressed invisibly) is a refinement of the existing principle, not a replacement. The following corollary clause is added to CORE.md as part of this charter's ratification:

> *Constraint without ceremony.* The system's job is to produce the artifacts the work requires and refuse advancement without them. It is not the system's job to announce that work happened, mark that a boundary was crossed, or instruct the pastor's interior practice around the work. Architecture does the work; the pastor experiences the work, not the architecture.

The clause is added under "The Principle" section, immediately after the existing "Clarity through Constraint" paragraph.

---

## Execution sequence

The charter is durable; the execution is opportunistic. The expected sequence:

1. **Charter ratified.** This document moves from draft to canonical.
2. **CORE.md "constraint without ceremony" clause added.** Single edit under The Principle section.
3. **Banner blocks added to SFDI and SADI.** Single small edit per doc.
4. **Pause-clearing rewrite (ruling 2).** The most concrete piece. Touches `studyTrailShared.jsx`, `studyFields.js`, and the pause-clearing storage paths. Removes `_synthesis` keys, the synthesis-question prop, the textarea, the write paths. Becomes the model for opportunistic execution — the surface gets touched, the era 2 work comes with it.
5. **Marinate copy strike (ruling 1).** Rides along with any next touch of `IMPLICATIONS_FIELDS[3].overview`, CORE.md Process Contract #6, or SFDI Phase 4.
6. **`takeoverWhenActive` retirement (ruling 6).** Rides along with any heavy-lifting field's next touch.
7. **Field 3 rework walk (ruling 8).** Field 3's detailed rework — exact data shape, gate simplification, downstream cumulative-table column changes — gets its own walk after this charter ratifies. The walk runs through the five-question protocol for every decision. Produces a full walk document. Implementation rides on the walk's output. Touches `OBSERVE_FIELDS[2]`, `IndentedSentenceCanvas`, `deriveThoughtUnitsFromCanvas`, the Field 3 composite gate, and the synthesis-table column defs across Phases 2/3/4.
8. **Residue deletions (ruling 3).** Each item on the list comes out with its surface's next touch. No sweep.
9. **Copy rewrites (ruling 4).** Each overview/hint piece gets rewritten when its surface is next touched. No sweep.

The charter is the record. The work is opportunistic. The pastor experiences each touch as a small surface getting better, not as a system-wide remodel.

---

*End of charter. Awaiting ratification.*
