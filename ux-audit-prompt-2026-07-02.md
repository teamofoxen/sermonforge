# Workspace UX Audit — CORE × Pastor's Charter

**To run:** start a fresh session and paste:
`ultracode — read ux-audit-prompt-2026-07-02.md at the repo root and execute it exactly as written.`

---

## Mission

Audit the sermon workspace UX — the full walk from sermon creation through the SermonFinish screen — against `docs/CORE.md` and the Pastor's Charter below, **together**. The CORE says what the system must do; the Charter says why. The question is not "does the code work" — it is: **does the lived experience, as a first-time pastor actually meets it at HEAD, deliver what the CORE promises?** A pastor with low software confidence, under weekly time pressure, forced into clarity without walls, kept in the text, never wondering where he is or whether his work is safe.

This is an audit, not a fix session. Findings only.

## Binding authority rules

1. **`docs/CORE.md` is the sole normative authority.** Load it first, in full.
2. **The Charter is explanatory only.** It is the lens for what the experience should *feel* like; it creates no requirements and must never be cited as authorization.
3. **Every finding must cite the CORE clause it strains** (contract + number, e.g. "Process #3"). A finding that can only cite the Charter is a **judgment call** — label it so and rank it below clause-cited findings.
4. **Report before fixing — fix nothing.** No code changes, no commits, no redesign proposals. The pastor approves fix scopes separately, one at a time (house audit workflow).
5. **Never recommend walls.** "Strengthen forced clarity" can never mean adding gates, blocks, or refusals — Process #1 and #2 forbid it ("informs; it never blocks").
6. Where docs disagree, the CORE governs; log doc lag in a separate appendix, not as UX findings.

## The Pastor's Charter (2026-07-02, post-fidelity-audit revision; not yet placed in docs/ — this file and memory are its only homes)

> **Standing:** This charter is explanation, not law. It adds no requirement, authorizes no behavior, and changes nothing. `docs/CORE.md` remains the sole normative authority; wherever this charter seems to say more than the CORE says, the CORE governs.

SermonForge exists for one pastor in one situation: a passage open and a Sunday coming. He preaches most weeks of the year. He is not a software person, he does not have spare hours to fight a tool, and he cannot afford to arrive at Sunday with fog where a sermon should be.

**The text comes first, and the sermon stays under it.** Preparation does not begin with what the pastor wants to say; it begins with what the passage says. His burdens for his people are welcome — but they speak third, after the text has been heard, and they are driven by the text, never the reverse. That is why the passage sits open by default wherever he works, and why, before he forges his main point, the system sends him back to read it again. Not because he forgot it — because everything he is about to forge must be supported by what the passage actually says.

**Clarity is forced, not found.** Left alone, study stays vague: read much, feel much, write mush. So the system asks its questions one at a time and requires the work to compile into named things — an Observation Set, an Interpretation Set, a Christ-Connection Statement, an Implications Synthesis, a Main Point Pair, a Sermon Outline, a Sermon Body, and at last the Manuscript itself. A sermon is not done until the load-bearing ones exist, and a named outcome either exists or it doesn't. That honesty is the point. The congregation cannot receive a clarity the pastor never reached at his desk — and the system's one job is to see that he reaches it, one answer at a time.

**The work must be his own.** The system contains no author but the pastor. It writes no sentence of his sermon, never overwrites his typing, and his sermon content never leaves his machine. This is not a missing feature; it is the foundation. The end of a sermon — Merida names it adoration, beholding Christ — belongs to the preacher, not the tool. The tool may turn him toward it; it never performs it and never measures it. A system that drafted his sermons would substitute for him at the exact point this system exists to refuse.

**The constraints discipline the work, never the worker.** The whole road is visible from the first day; nothing is hidden and nothing is locked. The system refuses no navigation, blocks no door, and narrates no step. It tells him where he is, tells the truth about what exists so far, and marks the real thresholds — start, handoff, finish — as moments worth stopping for. The pressure lives in the structure, not in walls, because the pastor is trusted with his own judgment; and the structure holds firm, because forcing clarity is the system's entire job.

What does he gain by trusting this? A sermon with a foundation he can stand on — every point traceable through his own written work back to the text. The quiet of always knowing where he is and that his work is safe. And a finished manuscript that is genuinely the text's and genuinely his — which is what the whole walk exists to produce.

## Read first (repo)

- `docs/CORE.md` — the law, current at HEAD (amended 2026-07-02 for the OEM walk)
- `docs/WORKSPACE-CANON.md` — the walk's what & why
- `docs/SYSTEMS/sermon-workspace.md` — components, JSON columns, save flow
- `docs/RULES.md` — guardrails + design system
- `oem-walk-rulings-2026-07-01.md` (repo root) — rulings of record for the Frame → Manuscript collapse
- `CHANGELOG.md` top entries — what shipped 2026-07-02 (the collapse, the quality cleanup, the N/A code build)

## Current-truth notes (read before finding anything)

- **The OEM walk shipped 2026-07-02**: Frame collapsed into the Manuscript door fields (decide/write boundary — Assembly decides, Manuscript writes); Equip → Body; 8→7 named outcomes; composites 8→6; affections layer in the Christ-Connection forge; Finish screen opens with a beholding moment. CORE reflects all of it.
- **The N/A policy code build also shipped 2026-07-02** (Study-question grants + per-cell cumulative-table N/A). Check CHANGELOG before reporting anything as missing — the known-remaining work is the **infra-doc pass**, so `WORKSPACE-CANON.md` / `sermon-workspace.md` may partially lag the collapse. Where they disagree with CORE, CORE wins; log the lag in the doc-drift appendix.
- **The visual reskin is SHELVED** by the pastor's explicit decision. Palette and typography *taste* are out of scope. **Legibility is in scope** — unlabeled controls, unreadable tiers, jargon — because low software confidence is a binding CORE constraint.

## Scope

**IN:** the sermon workspace end to end — sermon creation and naming (spoken refusal on namelessness), the map and place line, the writing surface (question flow, Back/Next), the reference pane (passage default, Open Bible minimized tab, the new PC/CCS/assembled-body tabs in Body and door regions), Study (Observe → Interpret → Redemptive Thread incl. the CCS forge's affections questions → Implications incl. the Pastoral Context three-voice conversation), the Study → Anchor handoff screen, Assembly (Anchor incl. the MPT/MPS forge and its return-to-the-passage beat → Outline), Manuscript (Body, then the Intro/Transitions/Conclusion doors), the three threshold screens (`.ssl-overlay`, `.sah-overlay`, `.sfin-overlay`) and their re-readability, SermonFinish (artifact review, "go write it" jumps, Export to Word, Mark as preached, beholding moment), saves/errors/N-A/destruction affordances inside the workspace, and workspace entry/exit (dashboard → workspace → back).

**OUT:** Series Planner, What I've Preached, dashboard content itself (except as workspace entry), setup/settings, distribution/updater, visual restyle.

## The five lenses

Each lens: the Charter conviction, the CORE clauses that promise it, and what to test.

**1. The text comes first and stays present** (Charter ¶3 · Process #4; Process #6 saturation amendment)
- Does the reference pane default to PASSAGE in **every** region — including the post-collapse Manuscript regions (Body and each door)? The OEM build added PC/CCS/assembled-body to the pane there: did the passage keep the default, or did the new tabs displace it?
- Does anything flip the pane away from the passage unbidden (trace the pane's active-tab write paths in code)?
- Does the return-to-the-text beat before the MPT forge still land in full post-collapse — Implications send-off, the handoff *rendering* the ESV (not merely citing it), the MPT draft prompt?
- Is Pastoral Context truly absent as a surfaced field before Implications (Process #4)?

**2. Clarity is forced, not found** (Charter ¶4 · the Principle; Process #2; Process #6; State #3)
- Questions one at a time, previous answers staying visible?
- Do the seven named outcomes render as *artifacts* — visible, canonically named, carried forward — or do they blur into more text boxes? Does the Study → Anchor handoff show the four Study outcomes and the unfinished list honestly?
- Completeness informs without blocking, everywhere: map per-question shading truthful, SermonFinish per-artifact review + "go write it" jumps, no gate anywhere.
- The fresh N/A affordances: do they read as an honest "nothing here" or as a skip button that lets vagueness through? (The grant list is canon-ruled — audit the *feel*, not the policy.)

**3. The work is his own and it is safe** (Charter ¶5 · Process #5; Mutation #1, #3, #4, #5)
- Can he answer "is my work safe" at any moment from inside the workspace? Failed saves visible and retryable? Close/quit flush intact (`src/utils/closeFlush.js`)?
- Any destruction below its friction floor — field-clearing toggles, resets, or an N/A mark that blanks typed content (Mutation #4 explicitly governs field-clearing toggles)?
- Any system-driven write path into sermon fields (Mutation #1)? One error vocabulary, no raw alerts (Mutation #5)?

**4. Discipline the work, never the worker** (Charter ¶6 · Process #1, #2, #3; Surface #5)
- Any wall that crept back: disabled forward controls, dead clicks, movement refusals? "Finish sermon →" summoned, never automatic?
- Any narration creep: toasts/banners announcing or celebrating movement outside the three thresholds? Within-stage movement silent; the place line states *where*, never *that movement happened*?
- Thresholds re-readable after dismissal ("Read again" doors on the map header; Finish re-openable forever; "go write it" doesn't consume the handoff)?
- Back labeled, consistent, predictable from every surface — including beside Next in the writing surface?

**5. Never lost, never confused** (Charter ¶2 + ¶7 · Surface #1–#5; State #3, #5, #6; the low-software-confidence binding constraint)
- The first-time-pastor test on every screenshot: *no modal, no memory — does he know where he is, what's being asked, and what to do next?* Every tier labeled on-screen; plain vocabulary ("sermon," never "pericope"); labeled beats minimal wherever tied.
- One vocabulary: canonical names only, identical across map, place line, tabs, dropdowns (State #5 / Surface #1).
- "You are here" in every region — the "Stage · Region" place line present and truthful in the new Manuscript regions too; map on-demand; the dashboard answers "what am I working on" as the workspace's front door (State #6).

## Method

- **Phase 0 — Ground truth (parallel readers):** CORE in full; canon, workspace spec, OEM rulings, CHANGELOG top entries; build the region inventory from code (field definitions, map engine, threshold components, reference pane, `studyAdvancement.js` composites, `sermonState.js` derivations). Output: the canonical region list + a promised-behavior checklist per lens.
- **Phase 1 — Rendered walk:** boot the preview (`.claude/launch.json`). Screenshot every reachable region and screen state; run the first-time-pastor question on each. **Caveats:** the preview boots on a `database.js` stub — DB calls and ESV passage fetch fail at click-time **by design**; an empty pane or failed seed in preview is NOT a finding — verify data-dependent behavior in code instead. Once a snapshot/screenshot returns content it is authoritative — do not retry. Do not build or run the installer; where neither preview nor code suffices, mark the item "needs live confirmation."
- **Phase 2 — Lens sweeps:** one agent per lens (five), each combining code reading with Phase 1 evidence. Every candidate finding names surface, clause, and evidence.
- **Phase 3 — Adversarial verification:** every finding independently attacked — real at HEAD? right clause? already ruled (check `oem-walk-rulings-2026-07-01.md`) or already shipped (check CHANGELOG)? a preview-stub artifact? Kill what fails; verdict CONFIRMED or PLAUSIBLE on what survives.
- **Phase 4 — Synthesis:** one report written to the repo root as `ux-audit-report-2026-07-02.md` (use the actual run date). Do not commit it.

Scale: this is a "thoroughly audit" request — lean toward the larger finder pool and the full adversarial pass.

## Output contract

The report contains, in order:

1. **Findings, ranked High / Medium / Low.** Each: surface + `file:line` · what the first-time pastor experiences (plain English, one or two sentences) · the CORE clause strained (or "judgment call — Charter-only") · the Charter conviction it dims · evidence (screenshot or code cite) · verdict (CONFIRMED / PLAUSIBLE).
2. **What holds up** — contracts working as designed deserve the record.
3. **Doc-drift appendix** — canon/spec lag behind the 2026-07-02 CORE, kept separate from UX findings.

Plain English throughout; explanations in prose, not fragment tables. No fixes, no redesigns, no commits — findings await the pastor's per-item approval.
