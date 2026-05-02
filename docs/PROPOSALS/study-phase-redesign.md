# Study Phase Re-Design (SPRD) — Planning Document

**Status:** **Active (revised 2026-05-02). Structural-only — content work merged into SFDI.** This document owns the structural layer of the Study redesign: spine routing, sub-phase + step transitions, evidence-gate firing mechanics, the Implications restructure shape, Step 5 as its own workspace step, PC card removal, movement visibility, and the screen + AI-prompt surfaces SPRD names. The content layer — what each named outcome IS, what 'enough' looks like at each specific boundary, which fields enact which voice in Implications, what PC content each field carries — moved into SFDI. Sections 2 and 3 below now carry only the structural framing; the substance lives in SFDI. Q2, Q3b, Q6, and Q7 content half retired from this document's open questions. SFDI moves offline (user drafts fields in their own time using `docs/PROPOSALS/sfdi-throughline-vision.md`); Claude shapes drafts when brought in. The first structural pilot (proposed in section 8) is **Q1 spine routing** — the foundation everything else stands on.

**Question state after revision:** Q1 decided (sub-phase and step transitions become real recorded movements). Q3 decided (hard gates with synthesis presence at the synthesis-producing boundaries; coverage and structural completeness elsewhere). Q4 settled this revision (old-sermon exemption stays scoped to the original empty-evidence rule). Q5 shipped 2026-05-01 via ACCI Item A2 (`2b0fa66`) — Synthesize and Compile now route through the proposal pattern alongside four other previously-bypassed AI write paths. Q7 structural half decided (Implications stays as one step with three voices); content half merged into SFDI. Q9 closed and handed off to audit triage. Q2, Q3b, Q6 merged into SFDI. Q8 open and structural.

**Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Written so that every term and phrase lands without needing engineering vocabulary.
**Date drafted:** 2026-04-30. Revised 2026-05-02.

---

## Scope map — structural ownership

Read this before the sections below. SPRD owns the structural layer of the redesign. The content layer has merged into SFDI.

| Item | Disposition |
|---|---|
| Q1 — spine-routed sub-phase + step transitions | Structural — decided. **First structural pilot.** |
| Q3 — hard gates with synthesis presence | Structural — decided |
| Q5 — Synthesize and Compile through proposal pattern | Shipped 2026-05-01 (ACCI Item A2, `2b0fa66`) |
| Q7 — Implications as one step with three voices | Structural half: decided. Content half: merged into SFDI. |
| Q4 — old-sermon exemption scope | Structural — settled this revision (scope to original rule) |
| Q9 — three vestigial fields cleanup | Closed (handed off to audit triage) |
| Q8 — inline AI Reviews through the spine | Structural — open |
| Step 5 (Intro/Conclusion) as its own workspace step | Structural — scope extension (see section 7) |
| PC card removal | Structural — sequenced after Q7 structural half lands |

**Content work merged into SFDI.** Section 2 (canonical artifacts per sub-phase), section 3 (evidence sufficiency thresholds), Q2 (reshape), Q3b (N/A escape valve), Q6 (PC modulation in AI prompts), and Q7 content half (which fields enact which voice in Implications) all moved to SFDI's scope. Sections 2 and 3 in this document now carry only the structural framing, with pointers to SFDI for substance. The merged Q's are retired from this document's open-questions list (section 8). See [docs/PROPOSALS/sfdi-charter.md](sfdi-charter.md) for the absorbed scope and the boundary articulation.

Items tagged *Structural — decided*, *Shipped*, *Structural — settled*, and *Closed* are ready to plan into implementation in any order; section 8's "First structural pilot" subsection names which one to start with. Items tagged *Structural — open* still need a small ruling but don't depend on SFDI. The content layer of the redesign now lives entirely in SFDI.

---

## How to read this document

Inside the Study tab, the pastor moves through four sub-phases — **Observe**, **Interpret**, **Redemptive Thread**, **Implications** — before drafting the main point of the sermon. The four are right in spirit (text → meaning → Christ → application) but broken in feel: each one looks like a separate worksheet, the pastor advances silently, the last one (Implications) crams three different jobs into one screen, and the part that should deepen progressively (Pastoral Context) sits as a permanent card at the top of the screen instead.

This document covers eight sections in fixed order:
1. What's broken today (diagnostic snapshot from when SPRD was drafted; current state of each item lives in the scope map and section 8).
2. Named outcomes per sub-phase — structural framing (substance lives in SFDI).
3. Evidence at each boundary — structural framing (substance lives in SFDI).
4. How Pastoral Context should enter Study.
5. What the rules document needs to say.
6. What the automated checks need to change.
7. What changes on screen and in the AI.
8. What's still open for the product owner to rule on.

A note on scope, settled before this document was written. The four sub-phases of Study, and the step out of Study into the main-point work, do not currently flow through the system that records, checks, and announces the pastor's movement through their sermon. They are silent screen-changes. The product owner has ruled that the redesign **routes them through that system** — they become real, recorded movements with checks and announcements. Every section of this document carries through assuming that scope.

---

## Vocabulary you'll see throughout

These terms recur. Defined once here, then used freely in the sections that follow.

- **The sermon record** — the bundle of data saved for one sermon. Lives in a local file on the pastor's machine; SermonForge does not store sermons in the cloud.
- **A field (or slot)** — a named place inside the sermon record. `observations` is one field; `redemptive_thread` is another. Each field holds whatever data belongs to that part of the work.
- **The schema** — the master list of which fields exist on a sermon. Changing the schema (renaming, adding, or removing fields) requires care because it affects every existing sermon. **The redesign in this document does not require a schema change** — every shape change can be done inside existing fields.
- **A migration** — a one-time, planned change to the schema that runs automatically the next time the app starts. SermonForge has 17 migrations already; each one made a structural change. The redesign in this document does not require a migration; reshape decisions (rename, merge, split, retire fields) are SFDI's territory and may or may not eventually need a migration depending on what SFDI's walks surface.
- **JSON** — a way of stuffing several pieces of structured data into a single field. The `observations` field, for example, isn't nine separate fields in the database — it's one field that holds a JSON bundle with nine named pieces inside it. This matters because adding new pieces to a JSON bundle does not require a schema change; only adding a whole new field does.
- **`CORE.md`** — the rules-of-the-app document. It lists four families of rules: Surface (what the user sees), Process (how the user moves through work), State (how data is structured and tracked), and Mutation (how changes happen). Within each family, rules are numbered. "Process Contract #2" means rule #2 inside the Process family.
- **The central save-and-check logic** — the part of the code that runs every time the pastor changes anything. Its job is two-step: first it runs the rules from `CORE.md` against the change to make sure the change is allowed, then it saves the change to the sermon record. Some AI write paths today **bypass** this logic — they save without going through the rules. That bypass is one of the load-bearing problems in section 1.
- **Test (or automated check)** — a small piece of code that exercises a part of the app and checks the result is right. Tests run every time anything in the codebase changes; if a test fails, something is broken. Tests are the safety net.
- **Test fixture** — a stand-in for the central save-and-check logic that lets tests run without needing the real database. The fixture must behave identically to the real logic, or tests pass against the fake while the real app breaks.
- **AI prompt** — the instructions sent to the AI before it generates a response. Each AI button in SermonForge has its own prompt. The prompt names what the AI should do, what context it should consider, and what shape of response to return.
- **The proposal pattern** — the design where the AI's output appears in a separate panel labeled "Proposed," and the pastor clicks **Accept** or **Discard**. The opposite is **direct-write**, where the AI silently overwrites the pastor's existing work in the field.
- **MPT / MPS** — *Main Preaching Thought* and *Main Preaching Statement*. The two short sentences the pastor drafts after Study: MPT captures what the passage *is about* in its own context; MPS captures what *this sermon* is doing for *this congregation* with this passage.
- **Pastoral Context (PC)** — three text fields the pastor fills out about *the room they're preaching to*: **The Cultural Moment** (what culture is doing with this topic), **The Room** (who's in the pews and where they are), and **The Sermon's Work** (what this sermon is trying to accomplish).
- **Toast** — a small notification that appears briefly in the corner of the screen and fades on its own. Used for movement events: "You advanced to Interpret."
- **Marker** — an invisible label embedded in the screen that automated tests can find. Tests use markers to confirm "yes, the right thing happened on screen." The pastor never sees them.

---

## 1. What's broken today

*Diagnostic snapshot from when SPRD was drafted (April 2026). Some items have shipped since — most notably Q5 (Synthesize and Compile direct-writes were converted to the proposal pattern via ACCI Item A2 on 2026-05-01). The scope map at the top and section 8's Q tagging carry current state; section 1 is preserved as the diagnostic record that motivated SPRD.*

The four sub-phases share a common pattern — a stack of question fields, a Continue button, an optional Review button — but each is supposed to be doing different theological work. Three problems compound. **Implications is under-designed**: three concerns are conflated, no check fires when the pastor advances, and there is no Implications-only summary moment. **Sub-phase advancement is silent**: the pastor crosses an invisible boundary every time. **Two AI buttons silently overwrite the pastor's writing**: Redemptive Synthesize and Implications Compile bypass the central save-and-check logic. None of this forces a schema change to fix.

| Sub-phase | What the user does | What gets saved | What advances does | What's broken |
|---|---|---|---|---|
| **Observe** | Fills nine textareas (Context, Divisions, Commands, Statements, Characters, Big Ideas, Obvious Point, Outline, Applications). Optional Review button asks the AI to comment. | Each answer saves into the `observations` field of the sermon record (the field holds a JSON bundle with one piece per question). Empty answers are removed before saving. | Continue increments a counter on screen. Nothing is recorded anywhere that Observe is finished. The AI generates a bullet summary that appears at the top of Interpret. | Pastoral Context sits as a card at the top of the workspace at all times — the spec says PC should "begin to enter awareness" here, but nothing in the screen signals that. The pastor can press Continue with all nine fields blank. |
| **Interpret** | Sees the AI bullet summary of Observe at the top. Fills nine more textareas (Context Impact, Recurring Ideas, Characters, Contrasts, Diagram, Cross-Refs, Commentary, Summarize Parts, Summarize Whole). Optional Review. | Saves into the `interpretation` field, same JSON-bundle pattern as Observe. | Continue increments the counter. Silent. AI generates a bullet summary that appears at the top of Redemptive Thread. | Reads as a second worksheet, not a deepening. The actual Observe notes aren't visible — only the AI bullet summary. No PC progression. No check fires on advance. |
| **Redemptive Thread** | Sees the bullet summary of Interpret. Fills seven textareas about how this passage points to Christ. A separate **Synthesize →** button asks the AI to write a 3–5 sentence summary, which is **immediately written into the summary box** with no chance to accept or reject. Optional Review. | Saves the seven question answers, plus the AI-written summary, into the `redemptive_thread` field. | Continue increments the counter. Silent. AI generates a bullet summary that appears at the top of Implications. | The Synthesize button silently overwrites whatever was in the summary box. Same shape as Implications' Compile button but different operation. No PC texture affordance. No check fires. |
| **Implications** | Sees the bullet summary of Redemptive Thread. Fills three groups of fields: Theological Significance (5), Personal Implications (8), Implications for Unbelievers (1). A **Compile →** button asks the AI to consolidate everything into a master list, which is **immediately written into a Compiled box** without review. Continue label says "Continue to MPT / MPS →". | Saves the question answers, the unbeliever field, and the compiled list into the `implications` field. | Continue advances **out of Study**. AI generates a four-phase synthesis (covering all of Observe, Interpret, RT, and Implications) that appears at the top of MPT/MPS — there is no Implications-only summary anywhere. | Five problems compound: three concerns conflated; no check fires; Compile and Synthesize use the same UI for different jobs; no fully-integrated PC affordance; no Implications-only reflection moment. |

**Implications classification.** Most of what's broken in Implications is screen design and behavior — missing checks, missing PC affordance, ambiguous buttons. The one underlying smell: there is no slot in Implications meant to hold "an Implications-only summary." The four-phase synthesis is occupying the spot where that summary should be. Fixing this is a small change to the JSON bundle inside an existing field. **No schema change is required.**

**Through-line today.** The theology is right (text → meaning → Christ → us). The experience is four worksheets with bullet summaries between them, no visible movement, optional and silently-applied AI writes at two of the four sub-phases, and a final sub-phase that does three jobs at once and then hands off without reflection.

---

## 2. Named outcomes per sub-phase (structural framing)

The through-line, in one sentence: **each sub-phase produces a named piece of work that the next sub-phase deepens, and the four together compose a preaching foundation strong enough that MPT and MPS can be drafted without reaching back into raw worksheet content.**

Three structural commitments live in SPRD:

- **Each sub-phase has exactly one named outcome.** Not several artifacts in parallel. One. The sub-phase isn't finished until that outcome holds.
- **The named outcome sits inside the sub-phase, not after it.** It is the work of the sub-phase, produced as the field-work composes — not an interstitial step between sub-phases.
- **The handoff to the next sub-phase carries the named outcome forward.** The next sub-phase opens against it; the prior named outcome is the substrate the next work builds on.

The substance — what each named outcome IS, what fields produce it, how the field-work composes into it — lives in SFDI. The current orientation sheet at `docs/PROPOSALS/sfdi-throughline-vision.md` carries the working set of named outcomes (Observation Set, Interpretation Set, Christ-Connection Statement, Implications Synthesis) for offline drafting; SFDI's per-field walks deepen them. The names are subject to refinement during SFDI walks.

**Two structural notes on shape that SPRD owns:**

- The Christ-Connection Statement and the Implications Synthesis already exist as save-slots inside their parent fields (`summary` inside `redemptive_thread`; `compiled` inside `implications`). The redesign does not need to add new slots — it needs to make those slots **the named outcome of their sub-phase** rather than an optional add-on.
- Implications today carries a hidden second outcome: the four-phase synthesis that fires on Continue. That synthesis is doing a job (briefing the pastor before MPT/MPS) but doing it in the wrong place — it shows up *after* the pastor has already left Implications, with no Implications-only reflection inside the sub-phase. Once the Implications Synthesis sits properly inside Implications as its named outcome, the four-phase synthesis can either go away or move to MPT/MPS as briefing. Section 7 carries the screen-side disposition.

---

## 3. Evidence at each boundary (structural framing)

Two structural commitments live in SPRD:

- **Every sub-phase boundary fires a hard gate.** Continue is hard-disabled with a clear "you can't advance until X" message when the work is insufficient. Soft guidance was rejected (see Q3 in section 8) because it pushes the consequence downstream into MPT/MPS, where the substrate is already weakened.
- **The kinds of checks available are coverage, structural completeness, and synthesis presence.** *Coverage* — a portion of the fields completed. *Structural completeness* — named load-bearing fields filled. *Synthesis presence* — a non-empty named-outcome slot that is the result of synthesis, not pasted from a single question field. The synthesis-producing boundaries (RT → Implications and Implications → MPT/MPS) use synthesis presence as their primary check; the earlier boundaries use coverage and structural completeness.

What constitutes 'enough' at each specific boundary — which fields are load-bearing, what synthesis presence looks like in practice for each named outcome, how the N/A escape valve works per field — lives in SFDI. SFDI's within-sub-phase flow pass names the load-bearing fields; SFDI's between-sub-phase pass articulates the threshold's substance. The structural commitments above are what SPRD owns.

**A note on Process Contract #2.** The rule about evidence-gated movement ("you must have something to show") fires at three resolutions — sub-phase, step, and stage. SPRD names that the rule fires at each resolution and which kinds of checks are available; SFDI names what each specific boundary's check is.

---

## 4. How Pastoral Context should enter Study

Process Contract #4 — the "Pastoral Context follows the text" rule — says PC should enter Study progressively as the pastor's understanding of the text deepens: awareness in Observe, marination in Interpret, texture in Redemptive Thread, full integration in Implications. **Today PC doesn't behave that way.** It sits as a card pinned to the top of the workspace at every step. All three PC fields are always editable. The pastor can fill PC before reading the passage at all. The card's prominent placement makes it feel like parallel-track orientation — "fill PC, then study" — which is the opposite of what the rule requires.

| Sub-phase | Today | After the redesign |
|---|---|---|
| **Observe** | All three PC fields visible and editable at the top of the workspace. The AI Observe Review prompt does not mention PC. | The PC card is minimized by default. **The Cultural Moment** and **The Room** are open if the pastor wants to capture quick situational awareness. **The Sermon's Work** is greyed out — the text hasn't shaped it yet. The AI Observe Review prompt still does not mention PC. |
| **Interpret** | Same uniform PC card. The AI Interpret Review prompt does not mention PC. | The PC card surfaces actively as the pastor enters Interpret. **The Sermon's Work** becomes editable — the pastor names a working hypothesis of what the sermon may do. The AI Interpret Review prompt may consult PC as marination context, never as a precondition. |
| **Redemptive Thread** | Same uniform PC card. The AI prompts at this sub-phase do not mention PC. | All three PC fields fully active. PC adds *texture* to the redemptive logic. AI prompts at this sub-phase may consult PC to pressure-test whether the Christ-connection lands in *this room* — never as a gate. |
| **Implications** | Same uniform PC card. The AI prompts at this sub-phase do not mention PC. | PC visibly drives the implications work — the application direction, the urgency, the address to unbelievers. AI prompts at this sub-phase fully integrate PC. This is the only sub-phase where PC is *expected*, and even here PC absence does not lock the sub-phase. |

**Two non-negotiable rules the redesign must hold:**

1. **PC remains optional input.** PC absence must never lock Study or any sub-phase. The current shell-level guarantee (PC absent ≠ Study locked) is already in tests; the progressive model adds shape between the guarantees but does not weaken them.
2. **AI prompts must treat PC as enrichment, never as a precondition.** Every prompt that references PC must phrase it as conditional — "if available, consider this; if not, evaluate from a general perspective." The MPS Draft prompt — the one used when the AI drafts the Main Preaching Statement — is currently the heaviest PC-leaning prompt in SermonForge (the prompt is roughly 400 words, mostly about how to weight PC). The redesign must not let that pattern propagate to earlier sub-phases without the conditional phrasing.

**Anti-pattern being replaced:** the uniform always-on PC card.
**What replaces it (in spirit, not in screen design):** an affordance whose visibility, editability, and AI weight track the four-stage progression so the pastor can *see* PC deepening alongside the text-work, not running parallel to it.

---

## 5. What the rules document needs to say

`CORE.md` is the rules-of-the-app document. Five rules need updates and one needs a fork the product owner has to settle. **The headline shift: today the rules speak only at the stage level (Study → Blueprint → Manuscript → Delivery); the redesign extends them to speak at the sub-phase level for the rules about evidence (Process #2), visibility (Process #3), and Pastoral Context (Process #4).** None of the rules are entirely new — all are extensions or clarifications.

For each edit below, the existing rule is paraphrased (the prior investigation cited but did not quote in full). The proposed replacement should be treated as a *direction*, not the final wording.

### Process Contract #2 — the "you must have something to show" rule

**Today it says:** A pastor cannot advance from one stage to the next unless they have something non-empty in the previous stage's fields. Sermons created before April 2026 are exempt (the "old-sermon exemption").

**What it should say:** The check fires at three resolutions — sub-phase, step, and stage. At each resolution, the rule names *what counts as enough* (using the categories in section 3 above: coverage, structural completeness, synthesis presence, optional length). The old-sermon exemption stays scoped to the original empty-evidence rule and does not extend to the new sub-phase categories — settled by Q4 in section 8. The new categories apply to every sermon regardless of creation date, but only fire at boundaries the pastor crosses during their session.

**Why.** Today the check is binary (something / nothing) at one level (stage). The whole redesign — fixing Implications, gating sub-phase advancement, preventing weak work from reaching MPT/MPS — depends on this rule having something to say at the sub-phase level.

### Process Contract #3 — the "movement must be visible" rule

**Today it says:** When a pastor crosses a stage boundary, the screen acknowledges it (a visible toast, plus an invisible marker so the safety-net tests can confirm it happened, plus a record in the sermon's audit trail). Sub-phase movement is not in scope.

**What it should say:** Sub-phase movement also gets acknowledged. The form of acknowledgement (a marker, a toast, a small banner) is a screen-design detail, but the *fact* of acknowledgement is binding.

**Why.** If sub-phase advancement is silent but new evidence checks fire, the pastor encounters a rejection without context. They know the check fired, but not that they crossed a boundary. The rule should not be silent on this.

### Process Contract #4 — the "Pastoral Context follows the text" rule

**Today it says:** PC is optional. PC absence does not lock Study. The progressive model (awareness → marination → texture → integration) is named in `sermon-workspace.md` (one of the system spec documents) but is not enforced by the rule itself.

**What it should say:** SPRD adds two structural commitments now: (1) **PC absence does not lock Study or any sub-phase** — already binding, now extended to sub-phase resolution; (2) **AI prompts treat PC as enrichment, never as a precondition** — binding at the prompt-contract layer. Both ship with the structural redesign.

**Deferred small ruling — wait for SFDI.** Whether the per-sub-phase PC progression itself becomes a binding rule (CORE.md specifies, per sub-phase, what PC content is read by AI prompts and what affordance is visible) or stays as descriptive guidance — that ruling depends on what PC content SFDI's per-field walks surface. If SFDI defines per-field PC content cleanly, the rule can bind that content; if PC remains diffuse across fields, descriptive is honest. The ruling is small and structural — made after SFDI lands.

**Why.** Today the rule under-specifies. The two structural commitments above can land now without waiting for SFDI. The progressive model's binding-vs-descriptive question is small enough to defer.

### Process Contract #5 — the "AI augments, doesn't substitute" rule

**Today it says:** When the AI proposes a write into a field, the proposal is rejected if the field is empty. The check fires through the central save-and-check logic.

**What it should say:** Either (a) the rule extends to cover the inline Review buttons (Observe Review, Interpret Review, RT Review, Implications Review), which today bypass the central save-and-check logic and are unchecked; *or* (b) the rule explicitly names inline reviews as advisory and out of scope — a documented carve-out (Q8 in section 8).

**Why.** Today the rule speaks loudly about one class of AI write (the Draft buttons) and is silent about the seven inline AI calls. The silence is functioning as an implicit carve-out without saying so.

### Mutation Contract #2 — the "AI writes go through the proposal pattern" rule

**Today it says:** Writes to sermon fields go through the central save-and-check logic, which enforces three things: the user's edits are never silently overwritten by the AI ("user typing wins"); the pastor sees a clear indication when a save happens or fails; and the AI cannot propose a write into an empty field.

**What it should say:** The rule's coverage is now complete in code — Synthesize (Redemptive Thread) and Compile (Implications) were converted to the proposal pattern on 2026-05-01 via ACCI Item A2 (`2b0fa66`), alongside four other previously-bypassed AI write paths (see Q5 in section 8 for the closure). The rule's text in `CORE.md` should be updated to acknowledge that all AI write paths are now under the rule, and to record the previously-tolerated direct-writes as resolved violations rather than ongoing carve-outs.

**Why.** Q5's resolution by execution closed the largest behavior gap. The CORE.md text update is bookkeeping that aligns the written rule with the now-cleaner code.

---

## 6. What the automated checks need to change

The automated checks ("tests") are the safety net. Each check enforces one of the rules in `CORE.md`. When the rules extend to the sub-phase level, the checks have to extend too — and the test fixture (the stand-in for the central save-and-check logic that lets the tests run without a real database) has to be updated in the same change so the safety net keeps working. **Six check files are affected: four go stale and need to grow, two new tests are needed for sub-phase movement, and three of those changes carry an implied test-fixture update.** The reason this section exists separately is that if the test fixture drifts out of sync with the real save-and-check logic, the entire safety net becomes unreliable.

The first column in the table below lists test file names — these are how the team refers to specific checks. The body of each row is plain language; the file names are reference labels.

| Test file (label) | What changes | Disposition | Rule it enforces | Test fixture also updates? |
|---|---|---|---|---|
| `process-1-monotonic.test.ts` | Sub-phase backward movement isn't tested today. The redesign needs to clarify whether backward sub-phase navigation is allowed; the test grows accordingly. | Clarify, then expand | Process #1 | No |
| `process-1-monotonic.test.ts` | Step backward movement (out of MPT/MPS back into Study) isn't tested today. Same clarification needed. | Clarify, then expand | Process #1 | No |
| `process-2-evidence-gated.test.ts` | Today's check accepts any non-empty answer at the stage boundary. Section 3's categories make non-empty-but-insufficient answers now fail. New rejection codes implied. | Expand | Process #2 | **Yes** |
| `process-2-evidence-gated.test.ts` | No check today for sub-phase boundaries with empty or insufficient evidence. New checks added. | New | Process #2 | **Yes** |
| `process-2-evidence-gated.test.ts` | No check today that the old-sermon exemption stays scoped to the original empty-evidence rule (i.e., that the new sub-phase categories DO fire on old sermons when the pastor crosses a new boundary). New check asserts the Q4 ruling. | New | Process #2 | No |
| `process-3-movement-visible.test.tsx` | A new check asserts the visibility marker fires when a sub-phase boundary is crossed. | New | Process #3 | **Yes** |
| `process-3-movement-visible.test.tsx` | An existing check that scans the codebase for the visibility marker may go stale if a new marker variant is introduced for sub-phase. | Expand | Process #3 | No |
| `process-4-pc-follows-text.test.tsx` | Existing check (PC absence does not lock Study) remains valid; extends to sub-phase resolution under the SPRD structural commitment. | Expand | Process #4 | No |
| `process-4-pc-follows-text.test.tsx` | New check that AI prompts treat PC as enrichment never as a precondition (the SPRD prompt-contract commitment) — fires regardless of whether per-sub-phase modulation is binding or descriptive. | New | Process #4 | No |
| `process-4-pc-follows-text.test.tsx` | Per-sub-phase PC progression checks (binding modulation) — wait for SFDI, then for the small structural ruling deferred in section 5's Process #4 fork. | Deferred | Process #4 | Conditional |
| `process-5-ai-augments.test.ts` | Existing check (AI proposal on empty field rejects) remains valid. | Unchanged | Process #5 | No |
| `process-5-ai-augments.test.ts` | If Q8 = (a), new check asserts inline AI reviews route through the central save-and-check logic. If Q8 = (b), no new check. | New (conditional on Q8) | Process #5 | Conditional |

**Standing fixture-parity rule.** Any change to the central save-and-check logic must update the test fixture in the same code change. The redesign's most invasive shape — making sub-phase movement a real recorded boundary, returning per-sub-phase rejection codes, returning a visibility flag for sub-phase boundaries, optionally adding a save path for AI Reviews — implicates the test fixture in three of the rows above. Any redesign work that touches the central logic carries a fixture-update obligation in the same code change.

---

## 7. What changes on screen and in the AI

The screen, prompts, and navigation surfaces all see knock-on changes from sections 2–4. This section names *what changes* per surface and *why*; it does not design any surface. Items that should hand off to a separate cleanup pass are listed for handoff only.

### The workspace shell (the always-on parts of the screen)

| Change | Reason |
|---|---|
| Replace the always-on Pastoral Context card at the top of the workspace with an affordance whose visibility tracks the section 4 progressive model. **Sequenced after the Implications restructure (Q7 structural half) lands** — PC needs the three-voice conversation in Implications to have a place to go before the card comes down. | The current placement frames PC as parallel-track orientation, contradicting "follows the text." |
| Sub-phase movement becomes a visible event — some form of marker, toast, or banner so the pastor sees they crossed a boundary. | Today sub-phase advancement is silent. With new evidence checks firing, the pastor needs to see the boundary they crossed. |
| The Continue button at each sub-phase is enabled or disabled based on the section 3 evidence checks. | Today Continue is always enabled. Without this binding, section 3 is decorative. |

### The Study tab (the four worksheets)

| Change | Reason |
|---|---|
| Disambiguate **Synthesize** (Redemptive Thread) and **Compile** (Implications) so they don't present as the same affordance for different operations. | Today both are AI write buttons that look and act alike but mean different things. This violates Surface Contract #2 — the rule that buttons of the same shape do the same thing. |
| Make the **Implications Synthesis** the named outcome of the Implications sub-phase — sitting inside Implications as the work that produces it, not as a separate step between Implications and MPT/MPS. The today-on-Continue four-phase synthesis is the displaced thing; once the Implications Synthesis sits properly inside Implications, the four-phase synthesis can either go away or move to MPT/MPS as briefing. | Today the four-phase synthesis fires on Continue and substitutes for any reflection on Implications alone. The pastor never sees an Implications-only handoff. Reframing the Implications Synthesis as the sub-phase's named outcome (rather than as a separate post-Implications step) closes that gap without inserting a new step. |
| Optionally make earlier-phase content (Observe, Interpret) reachable from later sub-phases — not just the AI bullet summary. | Today the only back-reference at later sub-phases is the AI summary; the actual question fields are hidden. The spec calls for "deepening," which requires being able to look back. |
| Restructure Implications as one sub-phase whose internal shape is a three-way conversation between Theological Significance, Personal Implications, and Pastoral Context. (Q7 structural half — decided. Unbeliever folds into PC because "the room" includes them.) The field-level work — which fields enact which voice — is SFDI's; this row commits only to the structural shape. | Implications today carries three orphaned groups with no internal structure. The three-way conversation is the structural form that lets the Implications Synthesis emerge as a real named outcome rather than as a compiled list. |

### AI prompts

| Change | Reason |
|---|---|
| Each inline review prompt (Observe Review, Interpret Review, RT Review, Implications Review) must phrase any PC reference as conditional ("if available, consider; if not, evaluate from a general perspective"). | Section 4 introduces PC at later sub-phases, and that introduction must not propagate the heavy MPS-style PC weighting. |
| Synthesize and Compile prompt edits — already shipped 2026-05-01 (ACCI Item A2, `2b0fa66`). Both prompts now produce a *proposed* synthesis the user accepts or discards. Recorded here for completeness. | Closed by execution. |
| The MPS Draft prompt — already the heaviest PC-leaning prompt in SermonForge — should be re-read against the section 4 rule that PC must remain optional input. | The prompt is the cleanest example of one teetering on "PC is prerequisite." The redesign does not need to rewrite it but must verify it passes the rule. |

### Sub-phase navigation

| Change | Reason |
|---|---|
| Sub-phase transitions route through the central save-and-check logic. They inherit the visibility marker, evidence checks, and the sermon's audit trail. | This follows from the Q1 ruling (route through the central logic). |
| The Continue label asymmetry at Implications ("Continue to MPT / MPS →" rather than plain "Continue") is consistent with the step transition being meaningfully different. The redesign does not need to change the label, but should confirm it's intentional. | Noted for completeness — not a redesign target. |

### Workspace step structure

Scope extension to original SPRD; surfaced during SFDI synthesis. The original SPRD framing covered the four sub-phases of Study and the step out of Study into MPT/MPS. The full sermon-prep arc that the named-outcomes framing supports has Step 5 (Intro/Conclusion) as its own work, with its own named outcome — not bundled into a later step.

| Change | Reason |
|---|---|
| **Step 5 (Intro/Conclusion) becomes its own workspace step** rather than bundled into Manuscript or another later step. Sequenced after the Implications restructure lands. | Today intro and conclusion are not first-class steps in the workspace. Bundling them into Manuscript flattens the named-outcome structure SPRD's section 2 framing supports. As its own step, Step 5 produces its own named outcome (the framed sermon — opener, MPT/MPS landing, and conclusion's response) that the rest of the manuscript work stands on. |

### Items to hand off to a separate cleanup pass (no design here)

| Item | Why hand off |
|---|---|
| Three database fields (`study_guide_note`, `preaching_blocks`, `manuscript_delivery`) that exist in the schema and are listed as fields the central save-and-check logic is willing to write to, but **are not referenced anywhere in current Study or Exegesis code**. | Likely artifacts of older content models. Cleanup is mechanical and unrelated to the redesign's behavioral work. |
| Sub-phase visibility marker naming conventions. | An infrastructure detail for whoever implements the markers, not a redesign question. |

---

## 8. What's still open

Each Q below carries a disposition tag — *Structural — decided*, *Structural — open*, *Structural — settled this revision*, *Merged into SFDI*, *Closed*, or *Shipped* — that indicates whether the Q is ready to plan into implementation, still needs a ruling, has already been answered, or has moved to SFDI's content scope. Only Q's tagged *Structural — open* still need a SPRD-side ruling; the rest are recorded for state.

### First structural pilot — Q1 spine routing

Of the structural-decided and shipped items, **Q1 spine routing is proposed as the first to ship.** Almost everything else in the structural list either depends on it or is downstream of it:

- Sub-phase visibility events (Process #3 extension) only fire at boundaries the central save-and-check logic knows about. No spine routing → no visibility events.
- Sub-phase evidence gates (Process #2 extension; the hard-gate ruling under Q3) only fire at boundaries the central logic checks. No spine routing → no evidence gates.
- The Implications restructure into one-step-with-three-voices (Q7 structural half) changes the shape of the Implications sub-phase boundary. The spine has to be ready to host that boundary's new shape.
- PC card removal (sequenced after Implications restructure) is downstream UI work that flows from the restructure landing.

Q1 is invisible-but-foundational: the pastor doesn't see "the spine now routes sub-phase transitions" as a feature, but every visible structural change downstream depends on it.

**Why not Implications restructure first.** The Implications restructure (Q7 structural half) is the most user-visible piece of the redesign — three voices replace three orphaned groups, PC stops being an always-on card. But its structural half is partly meaningless without its content half (which fields enact which voice), and the content half waits for SFDI. Shipping the structural half on its own gives the pastor a renamed shell of Implications without the field-level work that makes the renaming substantive.

**What "first pilot" means in scope.** Q1 ships as one cohesive piece: route both sub-phase transitions (StudyTab) and step transitions (SermonWorkspace) through the central save-and-check logic; add the visibility marker plumbing; carry the test-fixture updates section 6 names. The Q3 hard-gate logic and the Process #3 visibility events can ship in the same change or in a follow-up — the spine routing has to land first either way. Recommendation: ship spine routing alone, then Q3 + Process #3 in a second change so each landing is reviewable on its own.

---

**Q1 — Sub-phase and step transitions: real recorded movements with checks and announcements, or silent screen-changes? — Structural — decided. First structural pilot.**

Today's StudyTab advances sub-phases by incrementing a counter on screen, and SermonWorkspace advances steps the same way; neither calls the central save-and-check logic. The product owner has ruled that the redesign **routes both through the central logic.** Sections 3, 5, and 6 of this document carry through under that ruling. The implementation reach is meaningfully larger than the redesign's original framing assumed: new save-path rules, new rejection codes, fixture updates, visibility markers. That reach is accepted.

**Q2 — Reshape the data, or work within the current shapes? — Merged into SFDI.**

Reshape decisions need field-level evidence; SFDI's per-field walks are exactly that evidence. Rename, merge, split, move, retire are already named in the SFDI charter as outcomes the per-field walks may surface. Retired from SPRD's open-questions list. *The structural fact that no schema change is forced by the redesign — adding new pieces inside a JSON bundle, splitting a slot, adding sub-fields all work without a migration — is the part SPRD still owns.*

**Q3 — At sub-phase boundaries: hard gates or soft guidance? — Structural — decided.**

**Ruling:** hard gates with synthesis presence at the synthesis-producing boundaries (RT → Implications and Implications → MPT/MPS) and full coverage / structural completeness at the earlier boundaries (Observe → Interpret and Interpret → RT). Continue is hard-disabled with a clear "you can't advance until X" message when the work is insufficient.

**Why hard.** Soft guidance lets the pastor advance with weak evidence and pushes the consequence downstream into MPT/MPS, where the substrate is already weakened. Hard gates protect the named outcomes of each sub-phase so the next sub-phase has substance to work from. The punch-in-the-face quality of a hard block is accepted as the cost of the artifact framing in section 2 holding. The remaining N/A handling — what to do when a field is genuinely inapplicable to a passage — is split out as Q3b below.

**Q3b — N/A escape valve: how should fields that don't apply to a given passage be handled? — Merged into SFDI.**

The N/A determination is field-specific (a parable has no genealogy; a wisdom psalm has no narrative characters; an epistle has no story arc). SFDI's per-field walk is where each field's "what counts as legitimately N/A" gets named. Retired from SPRD. *The structural fact that hard gates require an escape valve to avoid forcing filler — and that the escape valve itself fires through the central save-and-check logic — is the part SPRD still owns.*

**Q4 — Old sermons and the new evidence rules: free pass forever, or only on the original rule? — Structural — settled this revision.**

**Ruling:** the old-sermon exemption stays scoped to the original empty-evidence rule. The new categories of check (coverage, structural completeness, synthesis presence) apply to every sermon regardless of creation date — but only fire at boundaries the pastor *crosses* during their session. A pastor reading a 2025 sermon they don't advance through never hits the new gates. Only when they touch a new boundary do they encounter it.

**Why scoped, not extended.** Extending the exemption to all new categories creates a permanent two-tier system: old sermons remain frictionless forever, new sermons live under the redesign's rules. That's a tax on every piece of new work and a permanent artifact in the codebase. Scoping the exemption to the original rule means the redesign's contract holds uniformly, and the pastor only encounters the new gates when they're actually working — not as a surprise on a sermon they're just opening to reread.

**Alternative considered.** Free pass forever for old sermons. Rejected because the value (frictionless re-entry into old work) is small relative to the cost (permanent two-tier rules).

**Q5 — Synthesize and Compile direct-writes: violation to fix, or carve-out to document? — Shipped 2026-05-01.**

ACCI Item A2 (`2b0fa66`) closed this question by execution. Synthesize (Redemptive Thread) and Compile (Implications) now route through the proposal pattern — proposal panel, accept or discard, central save-and-check logic. Four other previously-bypassed AI write paths were converted in the same change. The Mutation Contract #2 violation is gone from production code.

**Q6 — Pastoral Context in AI prompts: modulated per sub-phase, or uniformly available? — Merged into SFDI.**

PC modulation depends on knowing what PC content each field actually carries. SFDI's per-field walks define that content; the modulation question becomes "which fields carry PC content that the AI reads at this sub-phase," answered as a natural product of the per-field work. Retired from SPRD. *The structural fact that AI prompts must treat PC as enrichment never as a precondition — and that this rule applies whether PC ends up modulated or uniform — is the part SPRD still owns (see section 4 and Process Contract #4 in section 5).*

**Q7 — Implications after the redesign: one coherent step, or split into separate sub-phases? — Structural half: decided. Content half: merged into SFDI.**

**Structural ruling:** restructure, not split. Implications stays as one sub-phase, but its internal shape becomes a three-way conversation between Theological Significance, Personal Implications, and Pastoral Context. PC moves from orphaned-to-the-top-of-the-workspace into the conversation as one of three voices. The named outcome of the sub-phase — the Implications Synthesis — is the integrated form of that conversation.

**Content layer (which fields enact which voice; how the conversation composes into the Implications Synthesis) lives in SFDI.** Until SFDI lands those entries, the structural half is a renamed shell without the field-level work that makes the renaming substantive. That's why the Implications restructure isn't proposed as the first structural pilot.

Single coherent step keeps the four-sub-phase shape intact and forces the synthesis to do the unifying work. Splitting was rejected because adding sub-phases touches navigation, the position-tracking columns added in v17, and tests — and the three concerns are theologically related, not independent.

**Q8 — Inline AI Review buttons: route through the central save-and-check logic, or stay as advisory? — Structural — open.**

Seven inline AI calls (Observe Review, Interpret Review, RT Review, Implications Review, MPS Chat, Outline Suggest, FE Chat) bypass the central save-and-check logic and live in screen-only state. None are subject to Process Contract #5 — the "AI augments, doesn't substitute" rule. Routing them through a new save path specifically for AI Reviews brings the rule to bear and gives the safety net coverage; staying as-is keeps inline AI feeling lightweight and disposable. The harder version of this question is whether Process Contract #5 *should* cover advisory AI at all — the rule was written about substitutive AI writes, and inline reviews are read-only by design.

**Why this Q is structural-but-not-shipping-with-the-pilot.** Q8's resolution doesn't depend on field definitions, so it's structural. But it's separable from Q1's spine-routing pilot — inline reviews can be carved out or routed in a follow-up change without blocking Q1. Settle Q8 once Q1 has landed and the spine is stable.

**Q9 — Three unused fields: clean up in the redesign or in a separate pass? — Closed. Handed off to audit triage.**

`study_guide_note`, `preaching_blocks`, and `manuscript_delivery` exist in the schema and are listed as fields the central save-and-check logic is willing to write to, but they are not referenced anywhere in current Study or Exegesis code. They appear to be artifacts of older content models. Including them in the redesign would widen scope unnecessarily — they are mechanical cleanup, not behavioral redesign. The product owner has ruled that this hands off to the audit triage backlog. SPRD does not own this work.

---

*End of SPRD planning document.*
