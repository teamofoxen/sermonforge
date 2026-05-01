# Study Field Definition Initiative (SFDI) — Charter

**Status:** Scoping. No walkthrough work has begun. The full SFDI document will be drafted later, once enough field-walkthrough entries have accumulated to show what shape the document should take.
**Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Written in plain language, no engineering vocabulary required.
**Date drafted:** 2026-04-30.

---

## Why this initiative exists

The Study Phase Re-Design (SPRD) investigation surfaced that the four sub-phases of Study — Observe, Interpret, Redemptive Thread, Implications — feel like four worksheets stapled together rather than a single deepening exegetical work. SPRD set out to fix that at the architecture layer (how the pastor moves through the sub-phases, how evidence is checked, how Pastoral Context enters).

A subsequent insight, raised by the product owner: the *fields inside each sub-phase* are stapled together the same way. Each sub-phase today is a stack of parallel questions — nine in Observe, nine in Interpret, seven in Redemptive Thread, fourteen plus an unbeliever field in Implications. There is no built-in flow from one field to the next. The pastor finishes Observe with answers in nine boxes but no "and therefore..." connecting them. By the time they reach Implications, the work has accumulated as worksheet output rather than as building exegetical understanding. The Main Preaching Thought and Main Preaching Statement do not feel earned because the fields underneath them weren't earning each other.

SFDI exists to fix that. It is content work, not code work. The walkthrough is theological and pedagogical — what each field is, what the pastor puts in it, why it sits where it sits, how it hands off to the next field, and how each sub-phase's fields together compose into the named outcome of that sub-phase.

---

## What SFDI will produce

Three layers of definition, walked in this order:

1. **Per-field definitions.** Every field across all four sub-phases gets a structured entry: name, intent, what the pastor writes in it, role in the sub-phase, and the connections backward and forward to neighboring fields.
2. **Flow within each sub-phase.** Once all fields in a sub-phase are defined, a holistic pass surfaces how those fields connect into a coherent line of work. Any field that should move, merge, split, be renamed, or be cut gets decided at this stage. Discovery happens during the per-field walkthrough; decisions happen at the sub-phase boundary, not mid-walkthrough.
3. **Flow between sub-phases.** At each sub-phase boundary, a pass on how this sub-phase's outputs hand off to the next. At the end of all four, a final pass on the whole arc — from the first Observe field to the moment the pastor enters MPT/MPS — to verify the through-line feels earned.

The final SFDI document will gather all three layers into one place. It is not pre-structured; it accumulates as the walkthrough proceeds, and the document's shape gets named when enough has been built to know what shape fits.

---

## Approach

- **Sequential walkthrough.** Start at Observe, field one. Walk every field in order until all four sub-phases are done.
- **Existing fields are the starting point.** Most of what's there now will likely stay. Field titles do not have to earn their place — it is assumed that they belong. The work is finding what each field *means* and how it connects to its neighbors, not interrogating each field's right to exist.
- **Removal, rename, merge, split, reorder are always on the table** — but only when discovered through the work, not assumed at the outset. The framing is "we arrive at answers and decide," not "why is this field here, should it be here, what's the point."
- **No external source material.** The product owner works through the definitions from theological knowledge. This means the scope is larger than it would be if the walkthrough were anchored to a single text, but the source-of-truth is the product owner's understanding rather than a pre-existing outline.
- **Discovery, not interrogation.** The tone is generative — what is this field for, what does the pastor write in it, how does it set up the next field — rather than skeptical or reductive.

---

## Scope reality

This is large. Roughly 40 fields across four sub-phases need walkthrough entries, plus four within-sub-phase flow passes and three or four between-sub-phase flow passes. There is no time pressure; SFDI proceeds at the cadence the product owner sets. A session covers however many fields make sense for that session.

---

## How to start a session

When ready, open a working session and name a starting point:

- **First session:** "Begin SFDI at Observe, field one." That kicks off the per-field walkthrough at the beginning.
- **Subsequent sessions:** "Resume SFDI at Observe, field four" (or wherever the previous session ended).
- **Sub-phase-boundary session:** "SFDI within-sub-phase flow pass for Observe" (after all Observe fields are walked).

The walkthrough produces structured per-field entries. Those entries accumulate in a working document. When the document's shape is clear, it gets formalized as the SFDI document at `docs/PROPOSALS/study-field-definition-initiative.md` (or a renamed location, if a better name surfaces).

---

## Relationship to SPRD

SPRD planning is paused at its current question state pending SFDI. Once SFDI lands:

- SPRD section 2 (canonical artifacts per sub-phase) gets a revision pass against the new field definitions.
- SPRD section 3 (evidence sufficiency) gets a revision pass — the gating categories were chosen on the assumption that the fields are right; once the fields are right, the categories may shift.
- SPRD Q3 (hard gates) gets re-confirmed against the new field structure.
- SPRD Q3b (N/A escape valve), Q7 (Implications restructure), and any other content-level question revisits as needed.

SPRD's structural findings — the spine bypass, the silent transitions, the Mutation #2 violations on Synthesize and Compile, the Pastoral Context progressive model — are independent of field rework. They stand as written. Implementation does not begin until both initiatives land.

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
