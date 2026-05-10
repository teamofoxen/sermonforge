# Sermon Anchor Definition Initiative — Working Document

> **Post-ARI status (2026-05-09):** SADI closed before the AI Removal Initiative. The "AI principle" ruling and every "AI Draft / AI Suggest / AI Tighten / AI Check" affordance described below are historical — the AI subsystem was deleted in ARI Phase 8 (2026-05-09). The structural commitments (the four anchor fields, the two named outcomes — Main Point Pair and Sermon Frame, the cumulative-table closure at six columns, the per-field question shapes, the seven-slot entries) remain binding. Where the document says "AI Draft button on Q1," read it as "the SpotlightWorksheet question flow at Q1." See [`ai-removal-initiative.md`](./ai-removal-initiative.md) for the full initiative.

**Status:** Ratification walk complete 2026-05-04. Eleven structural rulings landed (named outcomes for both steps; cumulative-table closure; Process Contract #6 extension; SADI-wide N/A determination; AI principle; per-field question shapes; pre-field overview assignment). Per-field content-design walks (overview body text, pastor-side question framing copy, example outputs) remain as future per-field walks.
**Charter:** [`sadi-charter.md`](./sadi-charter.md) — the why, the boundaries, the approach.
**Orientation:** [`sadi-charter.md`](./sadi-charter.md) § Orientation — the throughline arc kept in view during walks.
**Merida cross-reference:** `~/.claude/projects/C--Projects-SermonForge/memory/project_cce_merida_source.md` — the source SermonForge's structure was built from. Steps 2 and 5 sections are SADI-relevant.
**SFDI working doc:** [`study-field-definition-initiative.md`](./study-field-definition-initiative.md) — Phase 4 Field 4 (Implications Synthesis) is the upstream substrate for SADI's Step 2 walks.
**Field-state source of truth (today):** Step 2 fields (MPT/MPS) live inline in `src/components/StudyTab.jsx` (no central definitions yet); Step 5 fields (Intro/Conclusion) currently live in the Manuscript step until SPRD ships the Step 5 elevation (C3, SADI-gated).

---

## Adopted from SFDI

SADI adopts SFDI's [Field Pattern](study-field-definition-initiative.md#the-field-pattern) and [seven-slot entry structure](study-field-definition-initiative.md#the-sfdi-walk-entry--seven-slots) wholesale. Re-stated briefly:

- Each field is an isolated focused workspace with one or more questions in an ordered sequence.
- Each per-field walk produces a structured entry with seven slots: Name, Intent, Question sequence, What gets written, Role in step, Connects from, Connects to.
- Heavy-lifting fields open with a pre-field overview screen on first per-sermon entry.
- The N/A escape valve operates per-field and per-question — **but see SADI-wide commitments below for SADI's narrower N/A scope.**
- Per-question paste rules: blocked or allowed.
- Per-cell no-AI policy: certain cells declare AI-write blocked — **but see SADI-wide commitments below; SADI does not prescribe per-cell no-AI.**
- Composite per-field empty-evidence gating with hover-checklist on disabled Continue buttons.

The cumulative-column synthesis-table sub-shape (introduced in SFDI Phase 1 Field 4 Q3, extended by Phases 2/3/4) **closes at 6 columns** when Implications completes — none of SADI's four anchor fields extend it. See SADI-wide commitments § *Cumulative table closure*.

PC progression markers per field follow the SFDI convention: explicit marker for heavy-lifting and named-outcome fields; phase-level summary for steps where PC is uniform across fields.

The canonical vocabulary from CORE.md applies: *field*, *question*, *answer*, *step*, *step boundary*, *throughline*, *named outcome*, *handoff*, *Pastoral Context*. SADI introduces no new vocabulary.

---

## SADI-wide commitments (ratified 2026-05-04)

Four structural commitments that apply across all four anchor fields. Each is locked at the SADI scope; future per-field content-design walks operate inside these constraints.

### Cumulative thought-unit table closes at 6 columns

The cumulative thought-unit table — built across SFDI's four phases (Thought unit / After line / Signal from Phase 1, Meaning from Phase 2, Christ-Connection from Phase 3, Implication from Phase 4) — **closes at 6 columns when Implications completes**. Steps 2-5 (MPT, MPS, Intro, Conclusion) read the table *whole*, not per-unit. None of the four SADI anchor fields adds a writable column.

The reasoning: Steps 2-5 are unifications, not segmentations. MPT is *one* sentence about the *whole* text; MPS is *one* sentence about the *whole* sermon; Intro frames the whole listener for the whole body; Conclusion lands one call to the whole room. None of these are per-unit operations — they synthesize across the table that already exists.

The cumulative table itself was the *segmenting* discipline of Study (Step 1). By Implications close, segmentation is complete. Step 2 onward is *unification*: take the segmented work and form whole-sermon anchors from it.

**What this means for implementation:** the cumulative-synthesis-table sub-shape (B2.2/B3.2/B4.2 plumbing) is *not* invoked for any SADI field. SADI fields use text-prompt or multi-question-text-prompt sub-shapes only. The cumulative-column rendering pattern (SPRD Component 1) doesn't extend further — it's complete at six columns.

If a future initiative walks Steps 3 or 4 and surfaces a need to extend the table (e.g., Outline mapping thought units to outline points), nothing in SADI's ratifications forbids it — that's that initiative's call. SADI just commits that *the four anchor fields* don't extend it.

Resolves Open Question #1.

### Process Contract #6 extension to all workspace steps through Delivery

Process Contract #6 ("the Study throughline is structural") extends from its current Study-only scope to **all workspace steps through Delivery**. No separate Process Contract #7 is created for sermon-anchor structure.

The reasoning rests on a single observation: there's only **one throughline**, and it runs all the way from Phase 1 Field 1 (Context, after Background's retirement 2026-05-05) to Manuscript/Delivery. The arc is:

> Implications Synthesis → MPT → MPS → Outline → Functional Elements → Intro → Conclusion → Manuscript → Delivery

This is one coherent line. Cutting it in half — calling Step 1's portion "the Study throughline" and Steps 2-5's portion "the sermon-anchor structure" — invents a seam where there isn't one. The pastor experiences the work as continuous; the contract should match.

The contract's *structural commitments* don't change: every field contributes; every named outcome is built from field-work; every handoff is explicit. They just now apply across more steps.

**What changes in CORE.md #6's text** (downstream code-edit pass — lands once SADI ships its first per-field entries; per the charter, the clause is "accurate but vacuous" until then):

- "The Study throughline is structural" → "The workspace throughline is structural"
- "Each Study sub-phase produces a named outcome" → "Each workspace step (and each Study sub-phase) produces a named outcome"
- The canonical-articulation pointer expands: SFDI for Study, **SADI for Steps 2 and 5**, and (when future initiatives walk Steps 3 and 4) those documents too.
- Binding scope expands: structural integrity testable against SFDI + SADI together.

**What this does not change:** SFDI's four named outcomes (Observation Set, Interpretation Set, Christ-Connection Statement, Implications Synthesis) remain locked. SADI adds two more (Main Point Pair for Step 2, Sermon Frame for Step 5). Steps 3 and 4 are still unwalked — the throughline is *coherent* through them but their named outcomes are TBD by future initiatives.

**Validator scripts:** the existing `scripts/sfdi-internal-consistency.py` + `scripts/sfdi-cross-doc-consistency.py` either extend to parse SADI scaffolding too, or a sibling pair lands at `scripts/sadi-internal-consistency.py` + `scripts/sadi-cross-doc-consistency.py`. Decision deferred to the first SADI walk that produces enough content to test against (per charter line 172).

Resolves Open Question #2.

### N/A determination — none of the four anchors are field-N/A-able

**No field-level N/A applies to any of MPT, MPS, Intro, or Conclusion.** Every sermon must produce all four anchors. The SFDI N/A escape valve (per-field, per-question) is *suspended at the field level* for SADI's four anchor fields — the field-level N/A toggle does not exist on these fields.

**Per-question N/A may still apply** to specific questions inside a field; that's settled per-field below (Field 1-2 of Step 2, Field 1-2 of Step 5). The per-question N/A semantic for SADI is **strict: "satisfied another way"**, not "skipped." A pastor marking a SADI question N/A is asserting they've done the equivalent work upstream or in another cell, not opting out of the work.

The reasoning: each anchor is structurally load-bearing. Skipping any of the four breaks the throughline.

- **MPT** — the sermon has no historical anchor; MPS has nothing to derive from.
- **MPS** — the sermon doesn't know what it's *doing for this congregation*.
- **Intro** — the listener arrives mid-sermon with no posture frame.
- **Conclusion** — the sermon doesn't land; the call goes unmade.

These are different from SFDI's per-question N/A allowances inside Study fields, which respect that some texts genuinely don't have what some questions are asking about (a declarative-only psalm has no commands; a parable has no genealogy). The four SADI anchors aren't asking *of the text* — they're asking *of the sermon*. Every sermon has an MPT (the text said something), an MPS (this sermon does something), an Intro (the sermon starts somehow), a Conclusion (the sermon ends somehow). Field-level N/A on any of the four would be saying "this sermon doesn't have one of those" — which can't be true if a sermon exists at all.

**Implementation:** the N/A toggle UI from A1.3 / SFDI's per-question N/A render is suppressed at the field level on all four anchor fields (e.g., a field-def `naAllowed: false` flag, or equivalent). Per-question N/A toggles render where ratified (MPS Q2 gospel-check; Intro Q4 redemptive note).

### AI principle — clarifies the pastor's voice; does not author it

AI Draft buttons remain available on all four anchor fields using the existing advisory-AI pattern. **No per-cell no-AI policy is prescribed for SADI fields.** The pastor decides per-cell whether to invoke AI; SADI doesn't structurally block the affordance. Mutation Contract #2 (AI writes through proposal pattern, never silent overwrite) is inherited automatically from the SermonForge platform.

The principle underneath, locked SADI-wide:

> **AI's role at the SADI layer is to clarify the pastor's voice; it does not author it.**

The substrate (Implications Synthesis + the four named outcomes from Study) is the pastor's voice. The four anchors are summations and framings of that pastoral substance. AI's job at the SADI layer is to **surface what's already there** — tighter phrasing, clearer logic, exposed drift — not to inject voice the pastor didn't already provide.

The practical shape of this:

- **Earlier fields are safe-to-be-rough spaces.** The pastor types what they think, working through it. Mistakes, half-thoughts, awkward drafts — all acceptable. The pastor doesn't need to perform polish in Study because the cleanup happens later, at the anchor layer, where AI surfaces clarity *from* the rough substrate.
- **AI Draft buttons read from the substrate, not from scratch.** MPT_DRAFT pulls from the Implications Synthesis. MPS_DRAFT (post-rewrite) reads MPT + Implications Synthesis + Christ-Connection Statement. Intro/Conclusion AI affordances read from the Sermon Frame's substrate. Nothing generates from a blank cell.
- **AI Tighten / Compress preserves the pastor's substantive language.** The compression discipline operates on the pastor's draft, not on AI-synthesized prose.
- **AI Check (where it appears) surfaces drift; doesn't decide.** If an AI affordance lands on something like MPS Q2 (moralism guard), it points to where the gospel-power is thin and lets the pastor revise. The call stays the pastor's.

This is the SADI articulation of the SermonForge non-negotiable *"AI augments. AI does not substitute"* — sharpened to: at the anchor layer, "augment" specifically means *clarify what the pastor already wrote.* Not "fill in what's missing." Not "improve the pastor's prose." Specifically clarify.

The structural commitment underneath: **the rough draft is sacred; the polish is collaborative.** A pastor's tentative, unpolished, mistake-tolerant articulation in Study is the load-bearing input. The four anchors are where that articulation lands as preachable language — and AI's job is to help the *pastor's* language land, not to substitute its own.

**Downstream consumer:** the MPS_DRAFT prompt rewrite (the SADI-Step-2-gated SPRD work). The new prompt reads from MPS Q1 / Q2 / Q3 outputs (or assists each cell individually) rather than running ~400 words of PC weighting through one AI generation. SADI doesn't write the prompt; SADI defines what the prompt *reads*.

Resolves Open Question #5.

---

## Step 2 — MPT/MPS Forge

### Field order

1. **MPT** *(Main Point of the Text — past tense, single sentence, anchored in author's intended meaning)*
2. **MPS** *(Main Point of the Sermon — present/future tense, single sentence, derived from MPT, redemptive)*

Two fields. Step 2's named outcome is the **Main Point Pair** (see *Within-step flow pass for Step 2* below).

---

### Field 1 — MPT

**Status:** Ratified 2026-05-04 in SADI ratification walk; pastor-side content-design walk landed 2026-05-04 (Q1/Q2 framings + Eph 2:1–5 example output).

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `draft` | Drawing from your Implications Synthesis and the four named outcomes from Study, draft what this text was saying to its original audience. Past tense. Author-intended. As many sentences as you need to get the substance right. |
| 2 | `tighten` | Now tighten that draft to a single past-tense sentence. Compress without losing the substance. The MPT must be one sentence. |

**Seven-slot entry:**

- **Name:** MPT (Main Point of the Text)
- **Intent:** Articulate what the text was saying to its original audience, in past tense, in a single sentence. The historical anchor of the sermon — what the human author *meant* in their own moment, before any application work. The substrate from which MPS derives.
- **Question sequence:** Draft (generative — pull from Implications Synthesis in past tense; as many sentences as needed) → Tighten (compression — single past-tense sentence preserving the draft's substance).
- **What gets written:** Q1 — the pastor's draft articulation of what the text meant historically, in past tense, drawn from the four named outcomes from Study (especially the Implications Synthesis paragraph and the Interpretation Set); 2-3 sentences acceptable for substance generation. Q2 — single past-tense sentence compressing Q1; advisory structural-sentence check (terminal punctuation, no internal sentence breaks) surfaces a hint when Q2 looks like multiple sentences but does not block — pastor judgment wins.
- **Role in step:** First field of Step 2. The historical anchor. Load-bearing for MPS — MPS derives from MPT and cannot stand without it. Composes with MPS into the Main Point Pair (Step 2's named outcome).
- **Connects from:** Implications Synthesis (Phase 4 Field 4 Q2 — the synthesis paragraph) primarily. The four named outcomes from Study visible alongside as substrate. The 6-column cumulative thought-unit table visible as reference (read whole, not per-unit — see SADI-wide § *Cumulative table closure*).
- **Connects to:** MPS — MPS Q1 reads MPT Q2 (just-tightened) as primary substrate.

**Per-question N/A:** Neither Q1 nor Q2 is N/A-able. Both are load-bearing within the field, and the field itself is not N/A-able per SADI-wide § *N/A determination*.

**Pre-field overview:** None. MPT is light enough to enter directly — two questions, both in cognitive registers the pastor has rehearsed in SFDI Phase 3 Field 3 (Gospel Makes This Possible) and Phase 4 Field 1 (Theological Significance). The substrate is fresh from just-completed Implications. An overview here would be ceremonial rather than load-bearing.

**Q1 framing (above the question):**

> ## Question 1 of 2 — Draft
>
> You've looked at this text closely, worked out what it meant, traced where Christ shows up, and named what it asks of your people. Your synthesis paragraph sits right beside you, with all the work behind it.
>
> What did this text mean to its first hearers? Past tense. Author-intended.
>
> As many sentences as you need to get the substance right. Tightening is next.

**Q2 framing (above the question):**

> ## Question 2 of 2 — Tighten
>
> Take your Q1 draft (right above you) and fold it into one past-tense sentence. It doesn't need to be short — it needs to be *one sentence*. Long is fine if it holds together.
>
> This is your MPT. MPS will derive from it next.

**Example output (Eph 2:1–5):**

*Q1 Draft:*

> Paul reminded the Ephesians that they had been dead in their sins — walking according to the world, driven by the desires of the flesh, by nature children of wrath. But God, rich in mercy and out of his great love, made them alive together with Christ even while they were still dead. Their salvation was God's act, not their work — by grace.

*Q2 Tighten:*

> Paul reminded the Ephesians that they had been dead in their sins, but God in his great love made them alive with Christ — purely by grace.

**Per-field empty-evidence override:** composite gate over Q1 + Q2.

- **Q1:** non-empty.
- **Q2:** non-empty AND structurally a single sentence (advisory check; pastor judgment wins).

The "Continue to MPS" button activates only when both gates are met. (Unless the workspace UX surfaces MPT and MPS as one screen with internal advancement; in that case the gate is at the MPS Q3 → Step 3 boundary, with MPT's gate as a sub-gate. That's an implementation choice, not a structural commitment.)

**AI affordance (per SADI-wide § *AI principle*):** MPT_DRAFT button on Q1 (existing — reads from Implications Synthesis). Tighten/Compress affordance on Q2 may land in implementation; reads Q1's output. Both go through the proposal pattern (Mutation Contract #2 inherited).

---

### Field 2 — MPS

**Status:** Ratified 2026-05-04 in SADI ratification walk; pastor-side content-design walk landed 2026-05-04 (pre-field overview + Q1/Q2/Q3 framings + Eph 2:1–5 example output).

**Heavy-lifting field — opens with a pre-field overview** on first per-sermon entry.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `translate` | Take the MPT (just-written, in past tense) and translate it to present/future tense. What is *this sermon* doing for *this congregation* with this passage? As many sentences as you need. |
| 2 | `gospel_check` | Read your draft alongside the Christ-Connection Statement (visible to the right). Does this MPS rest on what God has done in Christ, or has it slipped into "try harder" / "be better" moralism? Note any drift; rewrite where needed. |
| 3 | `tighten` | Tighten to a single present/future-tense sentence. Compress without losing the substance — and without losing the gospel-power. |

**Seven-slot entry:**

- **Name:** MPS (Main Point of the Sermon)
- **Intent:** Articulate what *this sermon* is doing for *this congregation* with this passage. Present/future tense, derived from MPT, gospel-empowered (not moralistic), single sentence. The bridge from text-anchor (MPT) to room-call. Composes with MPT into the Main Point Pair — Step 2's named outcome.
- **Question sequence:** Translate (MPT past tense → present/future tense, generative; aim at this congregation) → Gospel-check (read alongside Christ-Connection Statement; moralism guard; rewrite where the call slips into "try harder" / "be better") → Tighten (compression to single sentence preserving gospel-power).
- **What gets written:** Q1 — pastor's draft translation of MPT to present/future tense, aimed at this congregation; 2-3 sentences acceptable. Q2 — drift notes and rewrite where moralism appears, with CCS as the canonical comparator; per-question N/A allowed with strict "satisfied another way" semantic. Q3 — single present/future-tense sentence preserving gospel-power; advisory structural-sentence check.
- **Role in step:** Second field of Step 2. The room-facing call. Composes with MPT into the Main Point Pair (Step 2's named outcome).
- **Connects from:** MPT (Q2 just-tightened) primarily. Implications Synthesis (Phase 4 Field 4 Q2) for room-context. Christ-Connection Statement (Phase 3 Field 5 Q2) — the moralism guard comparator, rendered to the side as a peripheral reference panel during Q2 (A2.4's primitive).
- **Connects to:** Step 3 (Outline) — the body unfolds toward MPS's call. The Main Point Pair (MPT + MPS) is what Outline reads as the message anchor.

**Per-question N/A:** Q1 and Q3 not N/A-able. **Q2 is N/A-able** with strict "satisfied another way" semantic — for texts where the Christ-Connection Statement was itself complicated (e.g., wisdom literature, OT prophetic texts where the Christ-connection works through different mechanisms than direct fulfillment), the pastor may have already ensured gospel-power upstream and the cross-comparison may surface nothing. Marking Q2 N/A means "I've done this check upstream and it didn't surface drift." It does NOT mean "I'm skipping the moralism guard."

**Pre-field overview (pastor-side copy):**

> ## MPS
> *Field 2 of 2 · Step 2 (MPT/MPS Forge)*
>
> Your MPT is right beside you — what the text meant, in past tense. MPS turns that into the present: what the text means for *us today*. Present or future tense.
>
> Three moves: translate the MPT into present/future tense aimed at your people; check it against the Christ-Connection Statement to make sure the call rests on what Christ has done, not what the listener has to muster; tighten to one sentence.
>
> [ Begin ]

**Q1 framing (above the question):**

> ## Question 1 of 3 — Translate
>
> Your MPT sits right above you. Take it from past tense to present or future. Aim it at your people.
>
> As many sentences as you need to get the substance right. Gospel-check and tightening come next.

**Q2 framing (above the question):**

> ## Question 2 of 3 — Gospel-check
>
> Your Q1 draft is right above you. The Christ-Connection Statement sits to the right.
>
> Read them side by side. Does the call in your draft rest on what Christ has done, or has it slipped into "try harder" or "be better"? If it has, name the drift and rewrite until the gospel-power is visible.

**Q3 framing (above the question):**

> ## Question 3 of 3 — Tighten
>
> Fold your work into one present/future-tense sentence. The substance from Q1, the gospel-power from Q2 — both stay. It doesn't need to be short — it needs to be *one sentence*. Long is fine if it holds together.
>
> This is your MPS. Together with MPT, it forms the Main Point Pair — what Outline reads next.

**Example output (Eph 2:1–5):**

Drawing from the MPT above: *"Paul reminded the Ephesians that they had been dead in their sins, but God in his great love made them alive with Christ — purely by grace."*

*Q1 Translate:*

> We were dead in our sins. We need to wake up to that deadness and come alive in Christ by faith. We must step out of self-reliance and embrace what Christ has done for us — that's where life is.

*Q2 Gospel-check:*

> **Drift:** "We need to wake up" and "We must step out" and "embrace what Christ has done" all put the listener as the one mustering the response — but Eph 2:1–5 is precisely about people who CAN'T (dead people don't wake themselves up). The CCS for this passage names God as the one who raises the dead in his rich mercy. The MPS needs to land on God's action, with our reception as response, not initiation.
>
> **Rewrite:** We were dead in our sins. But God in his rich mercy has made us alive in Christ — and our part is to receive what God has already done, not muster it ourselves.

*Q3 Tighten:*

> We were dead in our sins, but God in his rich mercy has made us alive in Christ — and we receive by grace what we could never earn.

**Per-field empty-evidence override:** composite gate over Q1 + Q2 + Q3.

- **Q1:** non-empty.
- **Q2:** non-empty OR marked N/A (with the strict "satisfied another way" semantic).
- **Q3:** non-empty AND structurally a single sentence (advisory check; pastor judgment wins).

The "Continue to Outline" button (the boundary out of Step 2) activates only when all three gates are met. A hover-checklist on the disabled button surfaces which gate is unmet (per B1.6 pattern).

**AI affordance (per SADI-wide § *AI principle*):** MPS_DRAFT button on Q1 (existing, post-rewrite reads MPT + Implications Synthesis directly — drops the ~400 words of PC weighting). Optional drift-surfacing AI on Q2 (advisory; surfaces moralism candidates; pastor decides). Optional Tighten/Compress affordance on Q3 (preserves Q1's substantive language). All go through the proposal pattern.

**Downstream consumer note:** SPRD's MPS_DRAFT prompt rewrite is gated on this ratification. Once SADI's MPS field def is locked (now), SPRD-side work can rewrite `MPS_DRAFT_WITH_PC_TASK` to read from this field's structure. SADI does not write the prompt; SADI defines what the prompt reads.

---

## Within-step flow pass for Step 2

### The Main Point Pair — Step 2's named outcome

The Main Point Pair is what the pastor walks away from Step 2 holding. It's two sentences, structurally bound:

- **MPT** (past tense, single sentence) — the historical anchor; what the text meant.
- **MPS** (present/future tense, single sentence) — the room-facing call; what *this sermon* does for *this congregation* with this passage.

The "Pair" naming is intentional. MPS is *not* a standalone main point — it derives from MPT and cannot stand without it. The pair travels together: MPT supplies the historical anchor; MPS bridges that anchor to the listener's call. Both are required; neither is sufficient.

This parallels SFDI's named-outcome naming pattern:

- "Observation Set" (Phase 1) — names the *form* (a set of observations).
- "Interpretation Set" (Phase 2) — names the *form* (a set of interpretations).
- "Christ-Connection Statement" (Phase 3) — names the *form* (a single statement).
- "Implications Synthesis" (Phase 4) — names the *form* (a synthesis).
- **"Main Point Pair" (Step 2)** — names the *form* (two sentences, structurally paired).

When Step 2 completes, the throughline visualization shows two earned nodes for the Step 2 segment, with the Main Point Pair sitting at the end as a synthesizing callout. Process Contract #6 (extended to all workspace steps per SADI-wide § *Process Contract #6 extension*) activates for Step 2 here.

### Load-bearing fields for the Step 2 → Step 3 boundary

Both fields are load-bearing. The hard gate at the boundary checks:

- **MPT** — composite gate over Q1 (non-empty) + Q2 (non-empty + advisory single-sentence check).
- **MPS** — composite gate over Q1 (non-empty) + Q2 (non-empty or N/A with "satisfied another way" semantic) + Q3 (non-empty + advisory single-sentence check).

Without both anchors filled, Outline (Step 3) has no message anchor to build the body against. The "Continue to Outline" button activates only when both fields' composite gates are met.

---

## The MPT/MPS → Outline handoff

*(Lands as part of Step 3 walks if a future Outline initiative walks Step 3. SADI articulates the upstream side: the Main Point Pair is what Outline reads. The downstream side — what specifically Outline does with MPT/MPS — belongs to a future Outline-focused initiative or to SPRD if it surfaces structural questions.)*

What's locked from SADI's side: Outline reads the Main Point Pair as the message anchor that the body unfolds toward. MPS's call is what FE (Step 4) Application sub-questions ladder up to. MPT's historical anchor keeps Outline grounded in the text's own argument. The Christ-Connection Statement (Phase 3 Field 5 Q2) carries forward as the gospel-power source for FE Application work.

---

## Step 5 — Intro / Conclusion

### Field order

1. **Intro** *(Frames the listener for the body — hook + bridge to text + expectations + redemptive note)*
2. **Conclusion** *(Lands the body's call — summation + landed call + gospel-empowerment + closing posture)*

Two fields. Step 5's named outcome is the **Sermon Frame** (see *Within-step flow pass for Step 5* below).

**Step 5 elevation note:** Step 5 is currently bundled into the Manuscript step per SPRD's structural backlog; the SPRD C3 milestone elevates it to its own workspace step and is SADI-gated. SADI's Field 1 / Field 2 ratifications below define Intro and Conclusion *for the elevated Step 5*. Until Step 5 ships as its own workspace step, the canonical 4-question shapes apply wherever Intro and Conclusion live in the existing UI. SPRD's C3 work consumes these field defs.

---

### Field 1 — Intro

**Status:** Ratified 2026-05-04 in SADI ratification walk; pastor-side content-design walk landed 2026-05-04 (pre-field overview + Q1/Q2/Q3/Q4 framings + Eph 2:1–5 example output).

**Heavy-lifting field — opens with a pre-field overview** on first per-sermon entry.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `hook` | Open with something that grabs attention. A story, an image, a question, a problem from lived experience. The listener arrives distracted; the hook is your invitation in. What is your opener? |
| 2 | `bridge_to_text` | Bridge from the hook into the passage. Introduce the text. Land the MPT and MPS so the listener knows what this sermon is about. |
| 3 | `expectations` | Name what this sermon will ask of the listener. What will they be called to see, believe, or do by the end? Set the expectation now so the body doesn't blindside them. |
| 4 | `redemptive_note` | Name the gospel-shape that makes the expectation good news. What does Christ offer that turns the call from burden into invitation? This is the redemptive promise — the listener should hear, before the body begins, that the call is gospel-empowered. |

**Seven-slot entry:**

- **Name:** Intro
- **Intent:** Frame the listener for the body. The opener that grabs attention, the bridge that lands the text + MPT/MPS, the expectations that name what's coming, and the redemptive note that turns the call from burden into invitation. The first half of the Sermon Frame; the listener's *entry* into the body.
- **Question sequence:** Hook (open with attention-grabbing material — story / image / question / problem from lived experience or room context) → Bridge to text (transition + introduce passage + land MPT/MPS) → Expectations (name what the body will ask of the listener) → Redemptive note (gospel-shape that makes the call good news).
- **What gets written:** Q1 — opener content from pastor's choice (story, image, question, problem) drawn from room context. Q2 — bridging text introducing the passage and landing MPT + MPS. Q3 — explicit naming of what the body will ask the listener to see / believe / do / become. Q4 — gospel-empowerment of the call drawn from CCS, with per-question N/A allowed with strict "satisfied another way" semantic if the hook itself was redemptive.
- **Role in step:** First field of Step 5. The body's listener-entry. Composes with Conclusion into the Sermon Frame (Step 5's named outcome).
- **Connects from:** Functional Elements (the body's named outcome — Step 4) for what the body has prepared. MPS for the call to be telegraphed. Christ-Connection Statement (Phase 3 Field 5 Q2) — gospel-power source for Q4. Implications Synthesis (Phase 4 Field 4 Q2) + Pastoral Context (Phase 4 Field 3) for room context informing Q1's hook.
- **Connects to:** Conclusion — the matched listener-exit frame. Together they compose the Sermon Frame.

**Per-question N/A:** Q1, Q2, Q3 not N/A-able. **Q4 is N/A-able** with strict "satisfied another way" semantic — for instance, if the hook itself was redemptive (a story that lands the gospel-shape directly), Q4 may be N/A because the redemptive note is already in Q1. Pastor's call.

**The order rationale (non-obvious):** Expectations comes *before* redemptive note. This matters and is not arbitrary. The redemptive note answers a question the listener doesn't have until expectations has been set. Q3 names what the sermon will ask ("here's what's coming, and it's not nothing"). Q4 names how the gospel makes the asking good news ("and here's why this isn't burden — Christ has done X, so the call rests on grace"). If Q4 came before Q3, the redemptive note would float — there'd be nothing for the gospel-power to be against. The listener experiences the natural arc: tension named (expectations), then resolution offered (redemptive note). The body opens with the listener already inside that arc.

This also parallels MPS's structure: name the call, then gospel-empower the call. Q3 + Q4 here matches MPS Q1 + Q2 (translate, gospel_check) and Conclusion Q2 + Q3 (land_call, gospel_empower). **The "name the call, then gospel-empower it" pattern runs through all three anchors that touch listener-call.** That's the structural commitment against moralism, applied at every layer.

**Pre-field overview (pastor-side copy):**

> ## Intro
> *Field 1 of 2 · Step 5 (Intro / Conclusion)*
>
> The body is built — your outline, your functional elements, your MPT and MPS right beside you. Intro is how the listener walks into the body. Not a summary, not a preview of the points — the listener's posture as they enter.
>
> Four moves: hook (grab attention from where the listener actually is); bridge (get from the hook into the text + MPT and MPS); expectations (name what the body will ask of them, so they're not blindsided); redemptive note (gospel-power that turns the call from burden into invitation).
>
> The redemptive note is the gospel anchor at the front door of the sermon. Expectations comes before it on purpose — name the call first, then ground it in what Christ has done. Same pattern MPS just walked.
>
> [ Begin ]

**Q1 framing (above the question):**

> ## Question 1 of 4 — Hook
>
> Your listener just walked in distracted — kids, traffic, the week behind them. The hook is your invitation in.
>
> Open with something that grabs attention from where they actually are. A story, an image, a question, a problem from lived experience. Let the room context inform it — the people, the moment, what's pressing in their lives.

**Q2 framing (above the question):**

> ## Question 2 of 4 — Bridge to text
>
> You've got their attention. Now bring them to the text.
>
> Transition from your hook into the passage. Land the MPT and MPS so the listener knows what this sermon is about. Both are right beside you.

**Q3 framing (above the question):**

> ## Question 3 of 4 — Expectations
>
> Tell the listener what's coming. Not the points — the *call*. What will the body ask them to see, believe, do, or become?
>
> Set this now so the body doesn't blindside them. The call comes from MPS; you're naming it up front so the listener can lean in.

**Q4 framing (above the question):**

> ## Question 4 of 4 — Redemptive note
>
> The expectation you just named could land as burden — "here's what you have to do." Name the gospel-shape that turns it into invitation instead. What has Christ done that makes this call good news?
>
> The Christ-Connection Statement sits to the right as your source. The listener should hear, before the body opens, that the call rests on grace.

**Example output (Eph 2:1–5):**

Drawing from the MPS above: *"We were dead in our sins, but God in his rich mercy has made us alive in Christ — and we receive by grace what we could never earn."*

*Q1 Hook:*

> Have you ever met someone who works hard at being good — really hard, all the time — and still walks around carrying the weight of not being enough? Maybe that someone is you. The harder they try, the heavier it gets. The bar always moves.

*Q2 Bridge to text:*

> Open your Bible to Ephesians chapter 2. Paul writes to the Christians in Ephesus and starts with a hard sentence: *"You were dead in your trespasses and sins."* Not weak. Not struggling. Dead. And then four words that change everything: *"But God."* This morning we're going to see that we were dead in our sins, but God in his rich mercy has made us alive in Christ — and we receive by grace what we could never earn.

*Q3 Expectations:*

> Here's what this sermon will ask of you: stop trying to earn what God has already given. The body will walk through Paul's argument — what we were, what God did, and what it means to receive resurrection-life as gift.

*Q4 Redemptive note:*

> If you hear "stop trying to earn" as one more thing you have to do, you've missed the gift. What Christ has done is the foundation: he has already made the dead alive. The call this morning isn't burden — it's invitation. You don't muster resurrection. You receive it.

**Per-field empty-evidence override:** composite gate over Q1 + Q2 + Q3 + Q4.

- **Q1:** non-empty.
- **Q2:** non-empty.
- **Q3:** non-empty.
- **Q4:** non-empty OR marked N/A (with the strict "satisfied another way" semantic).

**AI affordance (per SADI-wide § *AI principle*):** AI Draft / AI Suggest affordances may land on each question; all go through the proposal pattern. No per-cell no-AI prescription. Where Q1 (hook) is concerned, AI surfaces hooks the *substrate* suggests (PC + Implications Synthesis grounded), not generic AI-generated illustration — the AI principle holds especially here since hook is the most generative-feeling cell.

---

### Field 2 — Conclusion

**Status:** Ratified 2026-05-04 in SADI ratification walk; pastor-side content-design walk landed 2026-05-04 (pre-field overview + Q1/Q2/Q3/Q4 framings + Eph 2:1–5 example output).

**Heavy-lifting field — opens with a pre-field overview** on first per-sermon entry.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `summate` | Summate the through-line of this sermon. **Not** a point-by-point recap. One unified landing — what the sermon has said, in the voice of where the listener now is. The body has done its work; this is the through-line in summary form. |
| 2 | `land_call` | Land the call. Drawing from the MPS — what is this sermon asking the listener to do, see, believe, or become? Make it concrete. The body opened with expectations (Intro Q3); the conclusion delivers the call those expectations led toward. |
| 3 | `gospel_empower` | Gospel-empower the call. Drawing from the Christ-Connection Statement — name the gospel-shape that makes the call good news, not burden. The listener should leave knowing the call rests on what Christ has done, not on what they must muster. |
| 4 | `closing_posture` | Choose the closing posture. How does this sermon end physically and spiritually? Silence (let the gospel weight settle) / song (corporate response) / prayer (pastoral landing) / charge (formal commission or blessing). The choice is pastoral; name it so the manuscript and delivery are prepared. |

**Seven-slot entry:**

- **Name:** Conclusion
- **Intent:** Land the body's call. Summate the through-line (NOT point-recap), name the call from MPS, gospel-empower the call, and choose the closing posture. The second half of the Sermon Frame; the listener's *exit* from the sermon.
- **Question sequence:** Summate (through-line summary in voice-of-where-listener-now-is — anti-recap discipline) → Land call (concrete from MPS) → Gospel-empower (CCS comparator; moralism guard) → Closing posture (silence / song / prayer / charge — pastoral choice with substantive content).
- **What gets written:** Q1 — unified through-line summation, NOT point-by-point recap, in the voice meeting the listener where they now are after the body has done its work. Q2 — concrete call drawn from MPS, named in terms of see / believe / do / become. Q3 — gospel-empowerment from CCS turning the call from burden to invitation. Q4 — explicit choice of closing posture (silence / song / prayer / charge) with the substantive content of the chosen posture (silence cue, song choice + transition cue, prayer text or extempore cue, charge text).
- **Role in step:** Second field of Step 5. The body's listener-exit. Completes the Sermon Frame with Intro.
- **Connects from:** All four named outcomes from Study (the through-line is built from them). Outline (body structure). Functional Elements (body content per outline point). MPS (the call). Intro Q3 (the expectations the call delivers on). Christ-Connection Statement (Phase 3 Field 5 Q2) — gospel-power source for Q3.
- **Connects to:** Manuscript / Delivery. Manuscript step reads the Sermon Frame for opening and closing prose. Delivery uses Q4's closing posture choice for its physical close.

**Per-question N/A:** All four required. None N/A-able. Conclusion is the listener's *exit* — every component is structurally necessary. Even Q4 — there's no sermon that doesn't have a closing posture; if the pastor "doesn't choose," they've defaulted to one of the four implicitly. SADI forces the choice to be explicit.

**The anti-recap discipline at Q1:** Q1's prompt explicitly contrasts summation with recap. Recap is mechanical (walk back through the points in order); summation is unifying (pull the whole arc into one landing). The phrase "in the voice of where the listener now is" is intentional — by the time Conclusion runs, the listener has been through the body. Their interior state is different from when Intro opened. Q1's summation should *meet them where they now are* — not where they started.

**The parallel structure with Intro and MPS:** Q2 + Q3 ("land the call" then "gospel-empower the call") mirrors MPS Q1 + Q2 (translate, gospel_check) and Intro Q3 + Q4 (expectations, redemptive_note). The "name the call, then gospel-empower it" pattern is the structural commitment against moralism applied at all three call-touching layers — the message anchor (MPS), the listener-entry frame (Intro Q3+Q4), and the listener-exit frame (Conclusion Q2+Q3).

**The Christ-Connection Statement is referenced from MPS Q2, Intro Q4, AND Conclusion Q3** — three times across SADI's four fields. The CCS is the load-bearing gospel-power source for the whole listener-contact arc. SFDI's elevation of the CCS as a named outcome was structurally necessary for SADI's anti-moralism discipline to work.

**Pre-field overview (pastor-side copy):**

> ## Conclusion
> *Field 2 of 2 · Step 5 (Intro / Conclusion)*
>
> Intro framed how the listener walked into the body. Conclusion frames how they walk out. The body has done its work; the listener has heard the through-line. Now you land it.
>
> Four moves: summate (gather the whole arc into one landing — *not* a point-by-point recap; the body already walked the points); land the call (drawn from MPS, made concrete); gospel-empower (drawn from CCS); choose the closing posture (silence, song, prayer, or charge — a required pastoral choice).
>
> Gospel-empower is the engine. Without it, the landed call slides into a moralistic push — even with the body's gospel work behind it. With it, the listener walks out knowing the call rests on what Christ has done.
>
> [ Begin ]

**Q1 framing (above the question):**

> ## Question 1 of 4 — Summate
>
> The body just walked the listener through your points. They don't need them recapped — they just heard them.
>
> Pull the whole arc into one landing. What did the sermon say, all together? Speak from where the listener now is, after the body has done its work — not where they started.

**Q2 framing (above the question):**

> ## Question 2 of 4 — Land the call
>
> Intro Q3 set the expectation. The body delivered. Now land the call.
>
> Drawing from MPS — what is this sermon asking the listener to do, see, believe, or become? Make it concrete. Not abstract, not deferred. The listener should know exactly what they're being called to.

**Q3 framing (above the question):**

> ## Question 3 of 4 — Gospel-empower
>
> At MPS you checked your message anchor for moralism. Here you do the matched move at the listener's exit: build the gospel anchor that carries the call out the door with them.
>
> Name what Christ has done that makes the call possible — drawing from the Christ-Connection Statement to the right. The listener should walk out holding the gift, not a new burden to muster.

**Q4 framing (above the question):**

> ## Question 4 of 4 — Closing posture
>
> Every sermon ends in a posture, whether you choose it or not. Choose it explicitly.
>
> Four options: silence (let the gospel weight settle); song (corporate response); prayer (pastoral landing); charge (formal commission or blessing). Pick one and name what it specifically is — the silence cue, the song choice, the prayer text, the charge wording. Manuscript and delivery read this.

**Example output (Eph 2:1–5):**

Drawing from MPS, Intro Q3, and Intro Q4 above (pastor-to-people voice continues throughout):

*Q1 Summate:*

> Look at where you are. You arrived this morning maybe carrying that weight — the tireless work of being good enough. And here, in five short verses, Paul has shown you what God has done while you were dead. While you were powerless. While you couldn't lift a finger. *But God.* That's the word the whole sermon turns on — and the word the rest of your life turns on too.

*Q2 Land the call:*

> So here is what this morning calls you to: stop trying to earn what God has already given. Not someday. Today. Lay down the striving. The God who raised you from death is the God who holds you now. Receive that as gift.

*Q3 Gospel-empower:*

> Hear me clearly: this isn't another to-do. You're not being asked to muster anything. Christ has done it. He went into death for dead people and rose with them. The call to receive isn't a new burden — it's the gift you've already been given, made visible. Walk out of here today knowing the work is done.

*Q4 Closing posture:*

> **Posture: Prayer.**
>
> Pastoral closing prayer, extempore but anchored on three beats: (1) thanksgiving for what God has done while we were dead, (2) confession of our continued striving and surrender of it now, (3) commitment to receive the resurrection-life he has given. Approximately 90 seconds. Hold the silence after "Amen" for a beat before benediction.

**Per-field empty-evidence override:** composite gate over Q1 + Q2 + Q3 + Q4. All four non-empty required (no N/A path). Q4 may carry an advisory structural check that the answer names one of silence/song/prayer/charge — surfaces a hint if not, but doesn't block. Pastor judgment wins if they describe a hybrid or innovate.

**AI affordance (per SADI-wide § *AI principle*):** AI Draft / AI Suggest affordances may land on each question; all go through the proposal pattern. AI on Q1 surfaces summation candidates from the substrate (the four named outcomes + body content). AI on Q3 surfaces moralism drift; pastor decides. AI on Q4 surfaces posture-choice options grounded in the sermon's emotional/theological landing.

---

## Within-step flow pass for Step 5

### The Sermon Frame — Step 5's named outcome

The Sermon Frame is what the pastor walks away from Step 5 holding. It's two complementary halves:

- **Intro** (4 questions: hook → bridge → expectations → redemptive note) — frames the listener's *entry* into the body. Sets posture; lands MPT/MPS; names what's coming; gospel-empowers what's coming.
- **Conclusion** (4 questions: summate → land_call → gospel_empower → closing_posture) — frames the listener's *exit*. Summates the through-line in voice-of-where-listener-now-is; lands the call; gospel-empowers the call; chooses how the room responds.

The "Frame" naming is intentional. Intro and Conclusion bracket the body — Intro is the picture frame's left edge, Conclusion the right edge. Without both, the body has no edges and the sermon doesn't land in the room.

This parallels SFDI's named-outcome pattern and SADI's Step 2 pattern:

- "Observation Set" / "Interpretation Set" / "Christ-Connection Statement" / "Implications Synthesis" (Phases 1-4) — name *forms* (set, statement, synthesis).
- "Main Point Pair" (Step 2) — names a *binding* (two sentences structurally paired).
- **"Sermon Frame" (Step 5)** — names a *containing* (two halves bracketing the body).

Step 2 binds; Step 5 contains. Different verbs for different anchor functions — message anchor binds, listener-contact anchor frames.

When Step 5 completes, the throughline visualization shows two earned nodes for the Step 5 segment, with the Sermon Frame sitting at the end as a synthesizing callout. Process Contract #6 activates for Step 5 here, completing the workspace throughline through Delivery.

### Load-bearing fields for the Step 5 → Manuscript boundary

Both fields are load-bearing. The hard gate at the boundary checks:

- **Intro** — composite gate over Q1 + Q2 + Q3 (all non-empty) + Q4 (non-empty or N/A with "satisfied another way" semantic).
- **Conclusion** — composite gate over Q1 + Q2 + Q3 + Q4 (all non-empty; no N/A path).

Without both Frame halves filled, Manuscript has no opener/closer prose to build from and Delivery has no closing-posture cue. The "Continue to Manuscript" button activates only when both fields' composite gates are met.

---

## The Step 5 → Manuscript / Delivery handoff

What's locked from SADI's side: Manuscript reads the Sermon Frame for opening and closing prose. Intro Q1-Q4 supply the opener content. Conclusion Q1-Q4 supply the closing content. Delivery reads Conclusion Q4 (closing posture) for its physical close — silence/song/prayer/charge each requires different delivery preparation (silence needs explicit "leave space" instruction; song needs the song choice + transition cue; prayer needs the text drafted or extempore cue; charge needs the actual benediction text).

What's deferred to future initiatives or SPRD work: the manuscript-step UX for consuming the Sermon Frame (does manuscript open with Intro Q1-Q4 + body + Conclusion Q1-Q4 pre-stitched? does it leave the pastor to compose between sections?); the delivery-mode UX for surfacing the closing posture cue. Those belong to a future Manuscript-focused initiative or to SPRD if it surfaces structural questions.

---

## Open questions — resolution status

The five open questions from the original draft, with current status:

1. **Does the cumulative thought-unit table extend into Steps 2 and 5?** **RESOLVED 2026-05-04** — see SADI-wide § *Cumulative table closure*. Table closes at 6 columns; Steps 2-5 read it whole, not per-unit.
2. **Process Contract #6 extension or new Process #7?** **RESOLVED 2026-05-04** — see SADI-wide § *Process Contract #6 extension*. Extends #6 to all workspace steps through Delivery; no separate #7.
3. **MPS Draft prompt rewrite scope.** **STILL OPEN** — downstream-enabled now that SADI's MPS field def is locked. SPRD ships the rewrite; SADI defines what the prompt reads. See SADI-wide § *AI principle* and Field 2 — MPS for what the new prompt consumes.
4. **Step 5 elevation timing.** **STILL OPEN** — depends on SPRD C3 milestone scheduling. SADI-gated work that consumes SADI's Intro / Conclusion field defs (now locked). Either order works; document which lands first when known.
5. **Per-cell no-AI policy on MPT.** **RESOLVED 2026-05-04** — see SADI-wide § *AI principle*. No per-cell no-AI prescription for SADI fields; AI clarifies the pastor's voice but doesn't author it. The proposal pattern (Mutation Contract #2) provides the pastor-voice safeguard.

---

*Ratification walk complete 2026-05-04. Eleven structural rulings locked; per-field content-design walks (overview body text, Q1-Q4 pastor-side framing copy, example outputs, in-workspace behavior fine details, full implementation pattern) remain. Next walks proceed in-session per the charter's "How to start a session." Implementation work (MPT/MPS rendering, Step 5 elevation, MPS Draft prompt rewrite, validator extensions) is downstream of these walks and is SPRD/future-initiative territory.*
