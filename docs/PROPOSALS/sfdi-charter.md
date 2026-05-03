# Study Field Definition Initiative (SFDI) — Charter

**Status:** Active. Phase 1 (Observe) walk in progress as of 2026-05-02. Working SFDI document at [`study-field-definition-initiative.md`](./study-field-definition-initiative.md) holds the per-field entries, the Field Pattern, and walk state.
**Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Written in plain language, no engineering vocabulary required.
**Date drafted:** 2026-04-30. Walk started 2026-05-02.

---

## Why this initiative exists

The Study Phase Re-Design (SPRD) investigation surfaced that the four sub-phases of Study — Observe, Interpret, Redemptive Thread, Implications — feel like four worksheets stapled together rather than a single deepening exegetical work. SPRD set out to fix that at the architecture layer (how the pastor moves through the sub-phases, how evidence is checked, how Pastoral Context enters).

A subsequent insight, raised by the product owner: the *fields inside each sub-phase* are stapled together the same way. Each sub-phase at the time SFDI was scoped was a stack of parallel questions — nine in Observe, nine in Interpret, seven in Redemptive Thread, fourteen plus an unbeliever field in Implications. (As of the Phase 1 walk start, Observe is now 11 — Background and Surface Questions added; the other sub-phases are still at their pre-walk counts pending future walks.) There is no built-in flow from one field to the next. The pastor finishes Observe with answers in nine boxes but no "and therefore..." connecting them. By the time they reach Implications, the work has accumulated as worksheet output rather than as building exegetical understanding. The Main Preaching Thought and Main Preaching Statement do not feel earned because the fields underneath them weren't earning each other.

SFDI exists to fix that. It is content work, not code work. The walkthrough is theological and pedagogical — what each field is, what the pastor puts in it, why it sits where it sits, how it hands off to the next field, and how each sub-phase's fields together compose into the named outcome of that sub-phase.

---

## Theological anchors

SFDI's walkthrough is grounded in the Pastoral Context (PC) vision articulated by the product owner during SPRD planning and captured verbatim in `docs/SYSTEMS/sermon-workspace.md` under "The Study throughline." That vision is the canonical statement of what SFDI is producing. Two field-level commitments flow directly from it and bind the walkthrough work:

**1. Observe ends with the field that first surfaces PC into the awareness layer.** Named "Possible Implications" (renamed from "Possible Applications" in the Vocabulary cleanup pass — see below), this field is where the pastor begins to think pastorally without yet leaving the text. SFDI's walkthrough of Observe must honor that role: the field's definition, intent, and handoff into Interpret all express the awareness-layer entry of PC.

**2. Implications is a three-way conversation between Theological Significance, Personal Implications, and PC.** Not three parallel groups of fields. PC is one of the three voices, integrated, not orphaned to a top-of-workspace card. SFDI's walkthrough of Implications must concretely articulate this conversation as fields and flow. The named outcome of Implications — the Implications Synthesis — is the integrated form of that conversation. PC's substance gets resolved here, not at MPT/MPS.

The directional principle underneath both: **the text drives the sermon toward Pastoral Context, not the other way around.** Exegesis exists to keep the text speaking first; PC is what the text drives the pastor toward, not what drives the text. SFDI walks fields with this directionality in view.

---

## What SFDI will produce

Three layers of definition, walked in this order:

1. **Per-field definitions.** Every field across all four sub-phases gets a structured **seven-slot entry**: name, intent, **question sequence** (the ordered prompts inside the field — see "The Field Pattern" in `docs/PROPOSALS/study-field-definition-initiative.md`), what the pastor writes per question, role in the sub-phase, and the connections backward and forward to neighboring fields. The per-field walk also names, for each field: what counts as legitimately N/A on a given passage (the **N/A escape valve**, absorbed from SPRD Q3b); what PC content this field carries, if any (the substance the **PC modulation** question rests on, absorbed from SPRD Q6); and whether this field should rename, merge, split, move, or retire (the **reshape question**, absorbed from SPRD Q2). Discovery happens here; decisions wait for layer 2.
2. **Flow within each sub-phase.** Once all fields in a sub-phase are defined, a holistic pass that does three things. (a) Names the **named outcome** of the sub-phase (Observation Set, Interpretation Set, Christ-Connection Statement, Implications Synthesis as currently named) and articulates how the field-work composes into it (absorbed from SPRD section 2 substance). (b) Names the **load-bearing fields** for that named outcome — the determination evidence-sufficiency thresholds at the sub-phase boundary will rest on (absorbed from SPRD section 3 substance). (c) Settles any reshape decisions surfaced in layer 1.
3. **Flow between sub-phases.** At each sub-phase boundary, a pass on how this sub-phase's outputs hand off to the next, and what **evidence-sufficiency threshold** the boundary enforces — which fields must be filled, what synthesis presence looks like in practice for this specific named outcome (absorbed from SPRD section 3 substance). The Implications between-sub-phase pass also articulates how the **three-way conversation** (Theological Significance, Personal Implications, Pastoral Context) composes into the Implications Synthesis (absorbed from SPRD Q7 content half). At the end of all four, a final pass on the whole arc — from the first Observe field to the moment the pastor enters MPT/MPS — to verify the through-line feels earned.

The PC progression — minimal at Observe, deepening through Interpret, texture at RT, integrated at Implications — is articulated through the per-field PC content layer 1 names. Once SFDI is done, AI prompts that reference PC have field-level content to draw on; until then, AI prompts treat PC uniformly.

The SFDI document gathers all three layers into one place. It is not pre-structured; it accumulates as the walkthrough proceeds. The working document at `docs/PROPOSALS/study-field-definition-initiative.md` was created when the Phase 1 walk started (2026-05-02) and accumulates entries as walks finish. Its shape may be re-cut once enough has been built to know what shape fits best.

---

## What completion looks like

The test of SFDI completion isn't a length target or a parser check. It's experiential. Here's what we should see when the walkthrough is done.

**For the pastor.** Opening a sermon and working Observe → Interpret → Redemptive Thread → Implications → MPT/MPS reads as a single deepening exegetical work, not four stapled worksheets. Each sub-phase's fields read as an ordered sequence where each one sets up the next. At the end of each sub-phase, the pastor walks away with a named outcome they can trace back to the field-work that produced it. The handoff into the next sub-phase is felt — the prior outcome is the substrate the next work builds on, not just an AI bullet summary at the top. By the time MPT/MPS opens, the foundation has been earned: the main point doesn't need to reach back into raw worksheet content because the named outcomes of the four sub-phases are themselves substantive.

**For the artifact.** The SFDI document holds a seven-slot entry for every field in every sub-phase (name, intent, question sequence, what gets written per question, role in sub-phase, connects from, connects to); a flow declaration per sub-phase (named outcome + ordered field sequence + how the field-work composes into the outcome); and a handoff articulation at each sub-phase boundary. The document reads narratively, not as a spec sheet. A pastor or another developer could read it cover-to-cover and understand the entire exegetical pedagogy SermonForge encodes. The working document lives at `docs/PROPOSALS/study-field-definition-initiative.md` and accumulates as walks proceed.

**For the enforcement layer.** Process Contract #6 activates. The clause is no longer "drafted but inactive" — it has substance to bind to. An automated check parses the SFDI document and validates the visible scaffolding: every field declares its connections, every sub-phase declares its named outcome, every boundary names its handoff. The throughline's substantive integrity — does each field actually contribute, does each named outcome follow from the field-work, does the handoff actually carry — binds the writer; the mechanical part is evidence, the spirit is the contract.

**For downstream initiatives.** SPRD's structural pieces ship in parallel — they don't wait for SFDI. **As of 2026-05-02, Q1 spine routing landed (commit `c87c307`), Q3 hard-gate UX landed (commit `ec3f960`), Q5 Synthesize/Compile shipped via ACCI A2 (`2b0fa66`), and Q8 inline AI Reviews closed as advisory carve-out** — together these covered visibility events (Process #3 extension to sub-phase + step), evidence gates (Process #2 extension under the hard-gate ruling), and the substitutive-AI scope clarification. The Implications restructure shape, Step 5 as its own workspace step, PC card removal, the Implications Synthesis as the named outcome, and the Isolated-World Workspace UX overhaul (the umbrella commitment for the workspace experience redesign — three components: field-level spotlight, sermon-level takeover, throughline visualization) are sequenced behind SFDI's content lands. SFDI's content layer flows in as it accumulates — per-field PC content, per-boundary thresholds, Implications voice assignments, named-outcome substance — and as each layer lands, the AI prompts and the per-sub-phase progressive model sharpen against real field-level definitions. PC's substance flows downstream through the named outcomes; explicit AI-PC tier wiring becomes unnecessary.

**The qualitative test.** Each element feels earned. If we don't feel it in the doc, the pastor won't feel it in the workspace. The throughline's integrity is the contract; we're done when the throughline is real.

---

## Approach

- **Sequential walkthrough.** Start at Observe, field one. Walk every field in order until all four sub-phases are done.
- **Existing fields are the starting point.** Most of what's there now will likely stay. Field titles do not have to earn their place — it is assumed that they belong. The work is finding what each field *means* and how it connects to its neighbors, not interrogating each field's right to exist.
- **Removal, rename, merge, split, reorder are always on the table** — but only when discovered through the work, not assumed at the outset. The framing is "we arrive at answers and decide," not "why is this field here, should it be here, what's the point."
- **Merida as cross-reference, pastor as source-of-truth.** Each field walk opens with Claude pulling the field's current state (label, hint, any governing logic), then surfacing what Merida's framework says about that field from `memory/project_cce_merida_source.md`. The pastor responds in their own voice — what the field is for, what they write in it, how it sets up the next. Claude captures, sharpens with follow-up questions, and shapes the seven-slot entry (Name, Intent, Question sequence, What gets written, Role in sub-phase, Connects from, Connects to) collaboratively from the pastor's words. Where Merida and the pastor diverge, the pastor decides. SermonForge's structure is Merida-derived, not Merida-faithful.
- **Discovery, not interrogation.** The tone is generative — what is this field for, what does the pastor write in it, how does it set up the next field — rather than skeptical or reductive.

---

## Scope reality

This is large. Roughly 40 fields across four sub-phases need walkthrough entries, plus four within-sub-phase flow passes and three or four between-sub-phase flow passes. There is no time pressure; SFDI proceeds at the cadence the product owner sets. A session covers however many fields make sense for that session.

---

## Pre-walkthrough cleanup pass

**Status: landed 2026-05-01.** A one-session **Vocabulary cleanup pass** consolidated two State Contract #5 ("one name per concept") drifts surfaced during scoping. SFDI now walks under the canonical names.

**1. PI → PC.** Before the cleanup, the user-facing surface (workspace card label, AI prompt strings, the new `CORE.md` Canonical Vocabulary section) already said "Pastoral Context"; the documentation layer (`docs/SYSTEMS/sermon-workspace.md`, `docs/REFERENCE/schema.md`, `docs/REFERENCE/project-structure.md`, `docs/SYSTEMS/context-pipeline.md`, `CLAUDE.md`) and code internals (variable names `piBlock`/`piParts`/`piLines`/`piOpen`, code comments, the workspace tour stop title at `src/tour/workspaceTourStops.js`) still said "Pastoral Intelligence" or "PI." The cleanup pass aligned the doc and code-internal layers to the canonical "Pastoral Context" / "PC." Internal variable names became `pcBlock`/`pcParts`/`pcLines`/`pcOpen`.

**2. Applications → Implications.** The vocabulary collision between "Possible Applications" (Observe field label) and "Personal Application" (Implications group label) violated State #5. The cleanup pass renamed UI labels: "Possible Applications" → "Possible Implications", "Personal Application" → "Personal Implications". Internal JSON keys (`applications`, etc.) stayed; renaming them would have required a data migration to backfill existing sermons, which wasn't worth it.

**Scope of the cleanup pass:** UI labels, AI prompt strings that mentioned the labels, doc references, code comments, internal variable names. **Out of scope:** JSON keys, database column names, schema migrations.

**Why before SFDI:** the walkthrough walks fields under their canonical names, not under names pending change. Discovery during SFDI may surface further changes; this cleanup pass handled the changes already discovered.

---

## How to start a session

**SFDI walks happen in-session.** Open a working session and name a starting point:

- **First session:** "Begin SFDI at Observe, field one."
- **Subsequent sessions:** "Resume SFDI at Observe, field four" (or wherever the previous session ended).
- **Sub-phase-boundary session:** "SFDI within-sub-phase flow pass for Observe" (after all Observe fields are walked).

For each field walk, Claude pulls the field's current state from `src/utils/studyFields.js`, surfaces Merida's cross-reference from `memory/project_cce_merida_source.md`, and proposes throughline connections to the next field. The pastor responds; Claude captures into the seven-slot entry under the field pattern (see "The Field Pattern" in `docs/PROPOSALS/study-field-definition-initiative.md`). Use `docs/PROPOSALS/sfdi-throughline-vision.md` as the in-session orientation sheet.

Entries accumulate in the working SFDI document at `docs/PROPOSALS/study-field-definition-initiative.md`.

---

## Relationship to SPRD

**Boundary as of 2026-05-02 (revised — content merged into SFDI).** SPRD owns the structural layer of the redesign. SFDI owns the content layer. The earlier decomposition — where SPRD held content sections (section 2 canonical artifacts, section 3 thresholds, Q2, Q3b, Q6, Q7 content half) that "waited for SFDI" — has been collapsed. Those sections and Q's moved into SFDI's scope; SPRD's section 2 and section 3 now carry only the structural framing, with pointers here for substance. Q2, Q3b, Q6, and Q7 content half retired from SPRD's open-questions list.

**What SPRD owns (structural):**

- Spine routing (sub-phase + step transitions through `applyMutation`)
- Evidence-gate firing mechanics (Process Contract #2 fires at sub-phase, step, and stage resolutions; the kinds of checks available — coverage, structural completeness, synthesis presence)
- Movement visibility (Process Contract #3 extension to sub-phase movement)
- Hard-gate posture (Q3 ruling)
- Old-sermon exemption scope (Q4 ruling)
- The Implications restructure shape (one step, three voices)
- Step 5 (Intro/Conclusion) as its own workspace step
- PC card removal sequencing
- The structural commitment that AI prompts treat PC as enrichment never as a precondition (Process Contract #4)
- The structural fact that no schema change is forced by the redesign
- Inline AI Reviews disposition (Q8, closed 2026-05-02 as ruling (b) advisory carve-out)
- Isolated-World Workspace UX overhaul (added 2026-05-02 — three components: field-level spotlight, sermon-level takeover, throughline visualization; sequenced behind SFDI)

**What SFDI owns (content):**

- Per-field definitions across all four sub-phases (name, intent, what gets written, role, connects from, connects to)
- Per-sub-phase named outcomes — what each one IS, how the field-work produces it
- Per-boundary evidence-sufficiency thresholds — what 'enough' looks like in practice
- Per-field N/A escape valve definitions
- Per-field PC content (the substance AI prompts read when modulating PC)
- Implications voice assignments (which fields enact Theological Significance, Personal Implications, Pastoral Context)
- Reshape decisions surfaced during walks (rename, merge, split, move, retire)

**The boundary in plain language:**

- SPRD says: "Each sub-phase produces a named outcome." SFDI says what each named outcome is and how the field-work produces it.
- SPRD says: "Every boundary has a hard gate." SFDI says what 'enough' looks like at each specific boundary.
- SPRD says: "Implications has a three-way conversation." SFDI says which fields enact each voice.
- SPRD says: "AI prompts treat PC as enrichment, never as a precondition." SFDI says what PC content each field carries that the prompts read from.

SFDI runs in-session as described in "How to start a session" above. The vision sheet at `docs/PROPOSALS/sfdi-throughline-vision.md` is the live orientation sheet kept in view during walks.

---

## Relationship to enforcement

SFDI is wired into `CORE.md` via Process Contract #6 — *"The Study throughline is structural."* The clause draws a line between what's binding and what's pedagogical, and that line is the working principle of SFDI:

- **Binding (under contract):** the throughline's integrity. That it exists, holds, and produces the named outcomes it claims. That every field contributes. That every named outcome is built from the field-work that precedes it. That every sub-phase boundary's handoff is explicit.
- **Pedagogical (free to evolve within the contract):** the number of fields, their wording, the exact text of each named outcome. SFDI's *content* evolves with the work.

This means SFDI can refine, add, remove, rename, and reorder fields as the walkthrough surfaces what the work needs. The contract isn't violated by content evolution. It is violated only if the throughline breaks — if a field contributes nothing, if a named outcome doesn't follow from the field-work, if a sub-phase boundary lacks a handoff.

The metaphor that earned this framing: a circle is a circle whether drawn with eight points or eighty. What's under contract is that it's a circle. How many points it takes to make one isn't.

The clause activates when SFDI ships its first per-field entries — until then, there is nothing to bind to, and the clause is accurate but vacuous.

The canonical vocabulary used by the clause — *field*, *sub-phase*, *sub-phase boundary*, *throughline*, *named outcome*, *handoff* — lives in the Canonical Vocabulary section of `CORE.md`. SFDI sessions use these terms only; engineering-side synonyms (column, key, slot) are available in code but do not appear in SFDI entries.

A future enforcement test will parse SFDI and validate the visible scaffolding (each field has its connections named; each sub-phase declares its named outcome; each sub-phase boundary names its handoff). The deeper substance — does the throughline actually deepen the work? — is the writer's commitment, anchored by the contract's existence. The mechanical part is evidence; the spirit is the contract.

---

*End of SFDI charter.*
