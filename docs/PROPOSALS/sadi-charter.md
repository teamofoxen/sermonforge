# Sermon Anchor Definition Initiative (SADI) — Charter

> **Post-ARI status (2026-05-09):** SADI closed before the AI Removal Initiative. The "AI augments. AI does not substitute" non-negotiable below is now structural-by-absence — the AI subsystem was deleted in ARI Phase 8 (2026-05-09). The four anchor fields (MPT, MPS, Intro, Conclusion), the two named outcomes (Main Point Pair, Sermon Frame), and the step-boundary handoffs remain binding. See [`ai-removal-initiative.md`](./ai-removal-initiative.md) for the full initiative.
>
> **Post-workspace-restructure status (2026-05-10):** SADI's anchor *steps* (Step 2 — MPT/MPS, Step 5 — Intro/Conclusion) became anchor *sub-phases* inside the new Assembly stage when the Workspace Restructure collapsed the 4-stage shell to 3 stages (Study / Assembly / Manuscript). Anchor = MPT/MPS sub-phase; Frame = Intro/Conclusion sub-phase. Field content, named outcomes, and per-field walks are unchanged — only the level at which the anchors live changed. See [`workspace-restructure-charter.md`](./workspace-restructure-charter.md).

**Status:** Drafted 2026-05-04; **ratification walk complete 2026-05-04** (eleven structural rulings landed). Per-field content-design walks remain (overview body text, Q1-Q4 pastor-side framing copy, example outputs). Working SADI document at [`sermon-anchor-definition-initiative.md`](./sermon-anchor-definition-initiative.md) carries seven-slot entries for all four anchor fields, named-outcome declarations for both steps, handoff articulations, and a SADI-wide commitments section consolidating the cross-field rulings.
**Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Written in plain language, no engineering vocabulary required.
**Date drafted:** 2026-05-04. Modeled after SFDI (charter at [`sfdi-charter.md`](./sfdi-charter.md)) and SPRD (planning doc at [`study-phase-redesign.md`](./study-phase-redesign.md)).
**Worktree:** `C:/Projects/SermonForge-sadi` on branch `sub/sadi` (forked from `sub/sfdi` so the SFDI completion is present locally).

---

## Orientation

The arc, in one sentence: the Implications Synthesis (SFDI Phase 4 named outcome) hands off to MPT (past, what the text meant) → MPS (present/future, what this sermon does for this congregation) → Outline + FE (the body, NOT in SADI scope) → Intro (frames the listener for the body) and Conclusion (lands the body's call) → Manuscript / Delivery. The four anchor fields — MPT, MPS, Intro, Conclusion — frame the body so the sermon can be received.

### The two steps SADI walks

| Step | Fields | Anchor function | Named outcome |
|---|---|---|---|
| **Step 2 — MPT/MPS Forge** | MPT, MPS | Message anchor — what the sermon is *about* | **Main Point Pair** (MPT + MPS, derivation visible) |
| **Step 5 — Intro / Conclusion** | Intro, Conclusion | Listener-contact anchor — how the sermon *enters and exits* the room | **Sermon Frame** (Intro frames the body's listener-posture; Conclusion lands the body's call) |

Each anchor reads from upstream named outcomes and hands forward to downstream work.

### Where SADI sits in the workflow

```
Step 1 — Exegesis (SFDI: 4 sub-phases, 25 fields, 4 named outcomes)
  ↓ Implications Synthesis →
Step 2 — MPT/MPS Forge (SADI)
  ↓ Main Point Pair →
Step 3 — Outline Builder (not SADI)
  ↓
Step 4 — Functional Elements (not SADI)
  ↓
Step 5 — Intro / Conclusion (SADI)
  ↓ Sermon Frame →
Manuscript → Delivery
```

SADI's two scope-steps **bracket** the body work (Steps 3-4).

### How the cumulative table closes

SFDI's cumulative thought-unit table reaches six columns by Phase 4 (Thought unit | After line | Signal | Meaning | Christ-Connection | Implication). **The table closes there.** None of SADI's four anchor fields extends it. Steps 2-5 read the table *whole*, not per-unit, because they are unifications, not segmentations. MPT is one sentence about the *whole* text; MPS is one sentence about the *whole* sermon; Intro frames the whole listener; Conclusion lands one call to the whole room.

### How PC enters the sermon-anchor work

By the time the pastor reaches MPT/MPS, PC's substance is integrated into the Implications Synthesis as one of three voices. **MPT/MPS doesn't need separate PC handling** — the Synthesis carries the PC content. The MPS Draft prompt reads the Implications Synthesis directly; the "for this congregation" clause comes from the three-voice integration, not a separate PC tier. Intro names the listener-posture the body will need (drawn from the Synthesis's PC voice); Conclusion lands the body's call in language the room can receive.

### The non-negotiables

- **The Implications Synthesis is the substrate for MPT/MPS.** No AI re-summary; no reaching back into raw worksheet content.
- **MPT is past tense + author-intended.** Single sentence, anchored in what the text meant.
- **MPS is present/future tense + redemptive.** Single sentence, derived from MPT, gospel-driven (not moralistic — the gospel-makes-it-possible thread from SFDI Phase 3 Field 3 carries forward).
- **Intro and Conclusion frame, don't repeat.** Intro doesn't restate the body; Conclusion summates and lands a response, not a recap.
- **Each field contributes to its step's named outcome.** No filler.
- **Every step boundary has a handoff,** articulated explicitly.
- **AI augments. AI does not substitute** for the pastoral work.
- **The text and the room together shape the anchors.** MPT comes from the text; MPS bridges; Intro/Conclusion are room-facing — but always anchored back to text-meaning via the SFDI named outcomes.

### The qualitative test

When the SermonForge workflow is run end-to-end, opening Step 2 should feel like the natural close of Step 1 (the Implications Synthesis is right there). Opening Step 5 should feel like the natural close of Step 4 (the body's named outcomes are right there). MPT shouldn't reach into raw text; MPS shouldn't be moralistic; Intro shouldn't improvise; Conclusion shouldn't recap. If each anchor feels earned, the sermon is preachable. If not, the anchors aren't anchored.

---

## Why this initiative exists

SFDI defined the structural integrity of Study (Step 1 — Exegesis): 25 fields across four sub-phases, four named outcomes, four sub-phase boundary handoffs. The Implications Synthesis (Phase 4 named outcome) hands off to MPT/MPS as the substrate for the main-point work.

But MPT, MPS, Intro, and Conclusion themselves are **fields without seven-slot definitions.** They have hint text and Draft prompts, but no canonical:

- **Intent** — what each field is for
- **Question sequence** — the ordered prompts inside each field
- **What gets written** — what the pastor produces per question
- **Role in step** — how each field fits within its step
- **Connects from / Connects to** — what the field reads from upstream and hands to downstream

The MPS Draft prompt in particular is the heaviest PC-leaning prompt in SermonForge (~400 words on PC weighting). This was justified before SFDI; now that PC's substance flows through the Implications Synthesis as one of four named outcomes, the MPS prompt needs rework — and the rework should be grounded in a SADI-walked MPS field definition, not made up at prompt-edit time.

Step 5 (Intro/Conclusion) is currently bundled into Manuscript per SPRD's structural backlog; it's sequenced to become its own workspace step. SADI defines the Intro and Conclusion fields the new step will hold.

Together, SADI walks the **four anchor fields** that frame the body of the sermon:

- **Message anchor (Step 2):** MPT + MPS — what the sermon is *about*
- **Listener-contact anchor (Step 5):** Intro + Conclusion — how the sermon *enters and exits* the room

---

## Theological anchors

SADI's walkthrough is grounded in Tony Merida's *Christ-Centered Exposition* — the same source SFDI walked against. SADI walks Merida's Step 2 (Unify the Redemptive Theme) and Step 5 (Add an Introduction and a Conclusion). Cross-reference lives in `~/.claude/projects/C--Projects-SermonForge/memory/project_cce_merida_source.md`.

Three field-level commitments flow from Merida + SFDI's vision and bind SADI's walkthrough:

**1. The Implications Synthesis is the substrate for MPT/MPS.** The pastor enters Step 2 with the four named outcomes from Study (Observation Set, Interpretation Set, Christ-Connection Statement, Implications Synthesis) plus the cumulative thought-unit table (six columns by Phase 4). MPT and MPS draw from these directly — no AI re-summary, no reaching back into raw worksheet content.

**2. MPT is past tense + author-intended; MPS is present/future tense + redemptive.** Per Merida's specifics — MPT names what the text *meant* in its historical context; MPS names what *this sermon* is doing for *this congregation* with this passage. Both are single sentences. MPS is derived directly from MPT and cannot stand without it. The gospel-makes-it-possible thread from SFDI Phase 3 Field 3 carries forward into MPS so the application doesn't collapse into moralism.

**3. Intro frames the listener; Conclusion frames the response.** Per Merida — Intro incites interest, introduces the text + MPT + MPS, includes a redemptive quality, names expectations. Conclusion summates + invites response. Both anchor in the body's named outcomes (Outline, Functional Elements, Christ-Connection Statement) but speak to the listener's posture rather than the text's content.

The directional principle underneath: **the text and the room together shape the sermon's anchors.** MPT comes from the text; MPS bridges text-to-room; Intro/Conclusion are room-facing. The anchors compose into a sermon the listener can receive.

---

## What SADI will produce

Three layers, walked in order, paralleling SFDI:

1. **Per-field definitions.** Four fields total (MPT, MPS, Intro, Conclusion) get seven-slot entries (Name, Intent, Question sequence, What gets written, Role in step, Connects from, Connects to). Each field walk also names: what counts as legitimately N/A; what role it plays in its step's named outcome; whether it should rename, merge, split, move, or retire (likely no — these labels are stable).
2. **Flow within each step.** Two passes: one for Step 2 (MPT/MPS), one for Step 5 (Intro/Conclusion). Each names the step's **named outcome** (working candidates: "Main Point Pair" for Step 2, "Sermon Frame" for Step 5) and articulates how the field-work composes into it. Names the load-bearing fields for the step boundary's evidence-sufficiency threshold.
3. **Flow between steps.** Handoffs at each step boundary: Implications → MPT/MPS (already articulated by SFDI Phase 4); MPT/MPS → Outline (read by Step 3); Outline → FE (Step 4 reads outline); FE → Intro/Conclusion (Step 5 reads body); Intro/Conclusion → Manuscript/Delivery (final hand-off).

The working SADI document at [`sermon-anchor-definition-initiative.md`](./sermon-anchor-definition-initiative.md) accumulates entries as walks proceed.

---

## What completion looks like

**For the pastor.** Opening Step 2 reads as a natural extension of Implications closing — the Implications Synthesis is right there as substrate; MPT comes from it past-tense; MPS comes from MPT present-future + redemptive. Opening Step 5 reads as natural extension of FE closing — Intro frames the listener for the body, Conclusion lands the body's call. By the time the pastor reaches Manuscript/Delivery, the sermon's anchors are felt, not improvised.

**For the artifact.** SADI document holds seven-slot entries for all four fields, two named-outcome declarations (Step 2 + Step 5), and handoff articulations at the relevant boundaries. Reads narratively, not as a spec sheet.

**For the enforcement layer.** Process Contract #6 (Study throughline is structural) was activated by SFDI 2026-05-04. SADI may either extend Process #6 to cover Steps 2 + 5, or trigger a new clause (Process #7 — "the sermon-anchor structure is binding"). Decision deferred to first walk where the question naturally surfaces. The validator scripts at `scripts/sfdi-internal-consistency.py` and `scripts/sfdi-cross-doc-consistency.py` may extend to parse SADI scaffolding too, or SADI may get its own validator scripts modeled on SFDI's.

**For downstream.** The MPS Draft prompt rewrite becomes actionable (drops the heavy PC-tier-weighting; reads SFDI's Implications Synthesis directly). Step 5 elevation as its own workspace step (SPRD backlog item) becomes informed by SADI's Intro/Conclusion field definitions.

**The qualitative test.** The sermon's anchors feel earned. MPT doesn't reach into raw worksheet content because the Implications Synthesis is the substrate. MPS isn't moralistic because the gospel-power thread from Phase 3 is in the substrate. Intro and Conclusion don't feel improvised because they connect to the body's named outcomes by handoff.

---

## Approach

Same as SFDI:

- **Sequential walkthrough.** Start at MPT, walk MPS, walk Intro, walk Conclusion. Within each, walk its question sequence.
- **Existing field labels are the starting point.** MPT, MPS, Intro, Conclusion — these names are pastor-natural and unlikely to change. The work is finding what each field *means* and what its question sequence is.
- **Removal, rename, merge, split, reorder** always on the table — but only when discovered through the work.
- **Merida as cross-reference, pastor as source-of-truth.** Each field walk opens with Claude pulling the field's current state (label, hint, Draft prompt where applicable), surfacing what Merida says about it, and proposing throughline connections to the next field. The pastor responds in their own voice. Claude captures into the seven-slot entry collaboratively.
- **Discovery, not interrogation.** Generative tone — what is this field for, what does the pastor write in it, how does it set up the next — rather than skeptical or reductive.

---

## Scope reality

Smaller than SFDI. **Four fields** (vs SFDI's 25). Likely 1-2 sessions per step. Could complete in 2-4 sessions total.

The lighter scope reflects that:

- MPT/MPS/Intro/Conclusion field labels are stable
- Merida's coverage of these is concrete and well-established
- The substrate (SFDI Phase 4 named outcomes) is already defined
- Each field is a single thing the pastor writes, not a multi-question structured-exercise field

---

## Pre-walkthrough cleanup pass

None identified. Field labels are pastor-natural. No vocabulary collisions surface from a quick scan. (If the walk surfaces collisions — e.g., "Outline" used for both Step 3 the workspace step and a field-internal concept — a cleanup pass lands then.)

---

## How to start a session

**SADI walks happen in-session.** Open a working session in the SADI worktree (`C:/Projects/SermonForge-sadi`) and name a starting point:

- **First session:** "Begin SADI at MPT" or "Begin SADI Step 2 walk."
- **Subsequent sessions:** "Resume SADI at Conclusion" (or wherever the previous session ended).
- **Step-boundary session:** "SADI within-step flow pass for Step 2" (after MPT and MPS are walked).

For each field walk, Claude pulls the field's current state from the codebase (Step 2 fields live inline in `src/components/StudyTab.jsx`; Step 5 fields currently live in Manuscript step until SPRD ships the Step 5 elevation), surfaces Merida's cross-reference from `project_cce_merida_source.md`, and proposes throughline connections to the next field. The pastor responds; Claude captures into the seven-slot entry.

Use the **Orientation** section above as the in-session orientation sheet.

Entries accumulate in the working SADI document at [`sermon-anchor-definition-initiative.md`](./sermon-anchor-definition-initiative.md).

---

## Relationship to SFDI

SADI **extends** SFDI rather than paralleling it. SFDI defined Step 1 (Exegesis) per-field structure; SADI defines the per-field structure of Step 2 and Step 5.

What SFDI ships into SADI:

- The four named outcomes (Observation Set, Interpretation Set, Christ-Connection Statement, Implications Synthesis) as substrate
- The cumulative thought-unit table (six columns) as the structural through-line of the workspace
- The Field Pattern (canonical seven-slot entry shape, structured-exercise sub-shapes, paste rules, composite gating, pre-field overview, per-cell no-AI policy)
- The PC progression marker convention (per-field for fields where PC progresses field-by-field; phase-level summary otherwise)
- The vocabulary (field, question, answer, named outcome, handoff, throughline)
- The validator-script enforcement model (Process Contract #6 activated by SFDI; binding via `scripts/sfdi-internal-consistency.py` + `scripts/sfdi-cross-doc-consistency.py`)

What SADI may add to the scaffolding:

- New named outcomes for Step 2 and Step 5
- Extension of the cumulative table — does MPT/MPS read each thought unit? Does Step 5? Open question for walks. (Phase 4 Field 4 Q1 already established that the table can grow indefinitely with one writable column per phase; SADI walks decide whether Steps 2-5 add columns or read the table whole.)
- New field-pattern sub-shapes if Intro/Conclusion need them (probably not — these read closer to text-prompt fields than to structured-exercise fields)

The SFDI working doc and SADI working doc reference each other for handoff articulations. The Implications → MPT/MPS handoff (already in SFDI) is the upstream-side; SADI's MPT field carries the downstream-side articulation.

---

## Relationship to SPRD

SPRD owns the structural layer of the workspace redesign. SADI may surface structural questions during walks; those go to SPRD.

What SPRD owns that SADI walks against:

- **Step 5 as its own workspace step** — already in SPRD backlog (sequenced behind SFDI; now actionable as of 2026-05-04). Becomes informed by SADI's Intro/Conclusion field definitions.
- **MPS Draft prompt structural change** — the prompt rewrite is SPRD-flavored work; SADI's MPS field definition shapes what the prompt should read. Phase 4's PC-substance-in-Synthesis ruling makes the rewrite urgent; SADI's MPS walk produces the substantive content the rewrite implements.
- **Spine routing for Step boundaries** — Process Contract #1/#2/#3 already extended to step transitions in SPRD Q1 (landed `c87c307`). Step 2 → Step 3 boundary, Step 4 → Step 5 boundary, Step 5 → Manuscript boundary all route through `transitionState`.

What SADI surfaces that may extend SPRD:

- Step 2 evidence-sufficiency thresholds at the MPT/MPS boundary (similar to SFDI's per-boundary thresholds)
- Step 5 evidence-sufficiency thresholds at the Intro/Conclusion boundary
- Any new structural commitments specific to MPT/MPS/Intro/Conclusion (e.g., per-cell no-AI policy on MPT — should the pastor's voice be the discipline here too?)

---

## Relationship to enforcement

Process Contract #6 (Study throughline is structural) was activated 2026-05-04 by SFDI's completion. **Resolved 2026-05-04 in SADI's ratification walk:** Process #6 extends to cover all workspace steps through Delivery (no separate Process #7 is created). The reasoning rests on the observation that there's only one throughline, running from Phase 1 Field 1 (Context, after Background's retirement 2026-05-05) all the way to Delivery — cutting it in half across two contracts would invent a seam where the pastor experiences none. See working doc § SADI-wide commitments / Process Contract #6 extension for the full rationale.

The CORE.md text edit (rewording "Study throughline" → "workspace throughline" and expanding the canonical-articulation pointer to include SADI alongside SFDI) is downstream of this charter and lands as a small SPRD-side or in-place edit; the ratification walk landed the working-doc commitment, the code-edit pass to CORE.md follows.

The validator scripts at `scripts/sfdi-internal-consistency.py` and `scripts/sfdi-cross-doc-consistency.py` either extend to parse SADI scaffolding too, or SADI gets its own validator scripts modeled on SFDI's. Deferred until SADI's per-field content-design walks accumulate enough additional content to test against — the structural ratification alone is parseable by the existing SFDI-style approach but is small enough that a dedicated test pass may not yet be warranted.

---

*End of SADI charter.*
