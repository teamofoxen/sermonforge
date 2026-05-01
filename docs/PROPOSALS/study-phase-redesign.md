# Study Phase Re-Design (SPRD) — Planning Document

**Status:** **Paused as of 2026-04-30**, pending the **Study Field Definition Initiative (SFDI)**. SPRD's structural findings (the spine bypass, silent transitions, Mutation #2 violations on Synthesize and Compile, the Pastoral Context progressive model) stand. But several content-level decisions — section 2 (canonical artifacts per sub-phase), section 3 (evidence sufficiency), Q3 (hard gates), Q7 (Implications restructure) — were sitting on the assumption that the fields *inside* each sub-phase are right. They aren't. The fields are stapled together the same way the sub-phases are: nine parallel questions in Observe, nine parallel questions in Interpret, and so on, with no built-in flow from one field to the next. SFDI fixes that. After SFDI lands, SPRD's affected sections get a revision pass against the new field definitions. Then implementation. See [docs/PROPOSALS/sfdi-charter.md](sfdi-charter.md).

**Question state at pause:** Q1 decided (sub-phase and step transitions become real recorded movements). Q3 partially worked (consensus on hard gates; full coverage as the primary check; synthesis presence layered on top at the boundaries that produce a named synthesis). Q3b open (how to handle fields that genuinely don't apply — the N/A escape valve question). Q2, Q4, Q5, Q6, Q7, Q8, Q9 open.

**Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Written so that every term and phrase lands without needing engineering vocabulary.
**Date drafted:** 2026-04-30.

---

## How to read this document

Inside the Study tab, the pastor moves through four sub-phases — **Observe**, **Interpret**, **Redemptive Thread**, **Implications** — before drafting the main point of the sermon. The four are right in spirit (text → meaning → Christ → application) but broken in feel: each one looks like a separate worksheet, the pastor advances silently, the last one (Implications) crams three different jobs into one screen, and the part that should deepen progressively (Pastoral Context) sits as a permanent card at the top of the screen instead.

This document covers eight sections in fixed order:
1. What's broken today.
2. What each sub-phase should produce after the redesign.
3. What "enough" should mean at each boundary.
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
- **A migration** — a one-time, planned change to the schema that runs automatically the next time the app starts. SermonForge has 17 migrations already; each one made a structural change. Section 8, Q2 mentions migrations because the redesign *could* take that opportunity if you want to reshape some fields, but isn't forced to.
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

## 2. What each sub-phase should produce after the redesign

The through-line, in one sentence: **each sub-phase produces a named piece of work that the next sub-phase deepens, and the four together compose a preaching foundation strong enough that MPT and MPS can be drafted without reaching back into raw worksheet content.** The data shapes don't need to change. What needs to change is the *named intent* of each sub-phase, and the discipline that the sub-phase isn't finished until that intent is satisfied.

| Sub-phase | What it exists to do | What the pastor walks away with | Role in the through-line |
|---|---|---|---|
| **Observe** | Hold the pastor in the text long enough to see what it actually says before guessing what it means. | An **Observation Set** — a worked-through reading of the passage's surface: who, what, structure, repeated language, plain-sense ideas. | The raw material the next three sub-phases stand on. |
| **Interpret** | Move from what the text says to what the text means in its own context, before moving to Christ. | An **Interpretation Set** — the passage's meaning in the pastor's own words, anchored to the observations. | The bridge from text to theology. |
| **Redemptive Thread** | Locate this passage on the redemptive-historical line — not as a moralism, not as a free association. | A **Christ-Connection Statement** — a short, named synthesis of how this passage speaks of, points to, or proceeds from Christ. | The theological lens that the application step must pass through. |
| **Implications** | Translate what the text means and how it points to Christ into how it lands on this congregation. | An **Implications Synthesis** — a single coherent reflection that names what this passage demands of the room: of believers, of unbelievers, of the pastor preaching it. | The pastoral handoff into MPT/MPS — where the sermon's "so what" becomes legible. |

Two notes on shape:
- The Christ-Connection Statement and the Implications Synthesis already exist as save-slots inside their parent fields (`summary` inside `redemptive_thread`; `compiled` inside `implications`). Today they're populated by the two AI buttons that silently overwrite the pastor's writing. The redesign does not need to add new slots — it needs to make those slots **the named outcome of their sub-phase** rather than an optional add-on.
- Implications today carries a hidden second outcome: the four-phase synthesis that fires on Continue. That synthesis is doing a job (briefing the pastor before MPT/MPS) but doing it in the wrong place — it shows up *after* the pastor has already left Implications, and there is no Implications-only summary in between. Section 7 surfaces the resulting placement question.

---

## 3. What "enough" should mean at each boundary

Every check carries the same tension: **a strict check forces clarity but risks busy-work and gaming; a loose check honors pastoral freedom but lets weak work slip through and pushes the consequence into the next step.** This document does not set the actual numbers (how many fields, how many words). It commits to the **kinds of checks** each boundary will use, so the rule about evidence-gated movement (Process Contract #2 — the "you must have something to show" rule) has something concrete to enforce at the sub-phase level.

| Boundary | Candidate checks | The trade-off |
|---|---|---|
| Observe → Interpret | Coverage (a portion of the nine fields completed); structural completeness (the fields that anchor structure — divisions, big ideas, outline — must be filled). | Strict: forces the pastor to actually read the passage before interpreting it. Risk: penalizes a passage where some Observe questions don't apply. Loose: pastor advances on partial work; Interpret gets done first and Observe becomes a backfill. |
| Interpret → Redemptive Thread | Coverage of the interpret fields; the "Summarize Whole" field has substantive content (not a fragment). | Strict synthesis check: forces the pastor to *say what the passage means* before being asked to find Christ in it. Loose: pastor moves to Christ-talk without ever naming the text's plain meaning. |
| Redemptive Thread → Implications | The Christ-Connection Statement is non-empty and is the result of synthesis (not pasted from one of the seven question fields); optional coverage across the seven fields. | Strict: protects the synthesis from becoming a moralism or a single proof-text. Loose: lets an underdeveloped Christ-connection drive application. |
| Implications → MPT/MPS | The Implications Synthesis is non-empty; the three groups (theological, personal, unbeliever) aren't all empty; optional length floor on the synthesis. | This is the check the pastor will most feel — it crosses out of Study. Strict: MPT/MPS arrive after a real handoff. Loose: MPT/MPS arrive having to repair an underdeveloped Implications. |

**Cross-cutting choices the product owner should rule once, not per phase:**

- **Count vs. coverage.** Counting filled fields ("4 of 9") is mechanical and easy to game. Coverage ("a *named* subset of fields must be filled") is more meaningful but requires the design to declare which fields are load-bearing. Today no such designation exists.
- **Length floor.** Setting a minimum length on synthesis fields is the cheapest check that resists single-word stubs. It's also the easiest to game (a long sentence of empty filler clears it). Useful as a backstop, not a primary check.
- **Structural completeness.** The most theologically defensible check — "you can't interpret what you haven't observed" — but it requires the design to name which Observe fields are *structural* (always required) and which are optional.
- **Synthesis presence.** The check most aligned with the artifact framing in section 2. Recommended as the primary check at the two boundaries that produce a named synthesis (RT → Implications, and Implications → MPT/MPS).

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

**What it should say:** The check fires at three resolutions — sub-phase, step, and stage. At each resolution, the rule names *what counts as enough* (using the categories in section 3 above: coverage, structural completeness, synthesis presence, optional length). The old-sermon exemption remains for the original empty-evidence rule and is not extended to the new sub-phase categories unless the product owner rules otherwise (Q4 in section 8).

**Why.** Today the check is binary (something / nothing) at one level (stage). The whole redesign — fixing Implications, gating sub-phase advancement, preventing weak work from reaching MPT/MPS — depends on this rule having something to say at the sub-phase level.

### Process Contract #3 — the "movement must be visible" rule

**Today it says:** When a pastor crosses a stage boundary, the screen acknowledges it (a visible toast, plus an invisible marker so the safety-net tests can confirm it happened, plus a record in the sermon's audit trail). Sub-phase movement is not in scope.

**What it should say:** Sub-phase movement also gets acknowledged. The form of acknowledgement (a marker, a toast, a small banner) is a screen-design detail, but the *fact* of acknowledgement is binding.

**Why.** If sub-phase advancement is silent but new evidence checks fire, the pastor encounters a rejection without context. They know the check fired, but not that they crossed a boundary. The rule should not be silent on this.

### Process Contract #4 — the "Pastoral Context follows the text" rule

**Today it says:** PC is optional. PC absence does not lock Study. The progressive model (awareness → marination → texture → integration) is named in `sermon-workspace.md` (one of the system spec documents) but is not enforced by the rule itself.

**What it should say:** Either (a) the progressive model becomes a binding rule — `CORE.md` specifies, per sub-phase, what PC content is read by AI prompts and what affordance is visible; *or* (b) the progressive model stays as descriptive guidance, and the rule names only the existing "PC absence does not lock Study" guarantee as binding. The product owner must rule which (Q6 in section 8).

**Why.** Today the rule under-specifies. Section 4's progressive model either becomes a guarantee (binding) or stays a design vocabulary (descriptive). Either is internally consistent; ambiguity is not.

### Process Contract #5 — the "AI augments, doesn't substitute" rule

**Today it says:** When the AI proposes a write into a field, the proposal is rejected if the field is empty. The check fires through the central save-and-check logic.

**What it should say:** Either (a) the rule extends to cover the inline Review buttons (Observe Review, Interpret Review, RT Review, Implications Review), which today bypass the central save-and-check logic and are unchecked; *or* (b) the rule explicitly names inline reviews as advisory and out of scope — a documented carve-out (Q8 in section 8).

**Why.** Today the rule speaks loudly about one class of AI write (the Draft buttons) and is silent about the seven inline AI calls. The silence is functioning as an implicit carve-out without saying so.

### Mutation Contract #2 — the "AI writes go through the proposal pattern" rule

**Today it says:** Writes to sermon fields go through the central save-and-check logic, which enforces three things: the user's edits are never silently overwritten by the AI ("user typing wins"); the pastor sees a clear indication when a save happens or fails; and the AI cannot propose a write into an empty field.

**What it should say:** The rule must address two AI write paths that currently bypass the central save-and-check logic entirely — the **Synthesize** button on Redemptive Thread and the **Compile** button on Implications. They write directly into the sermon record without proposing first. Either (a) classify these as violations the redesign fixes by routing them through the proposal pattern (matching the Draft buttons — proposal panel, accept or discard), *or* (b) document them as a deliberate carve-out for in-Study synthesis writes, with stated rationale (Q5 in section 8).

**Why.** This is the most consequential rule edit. Today neither path is documented — the violation is invisible to the safety-net tests, because those tests check the central save-and-check logic, which neither button uses. Whichever way the product owner rules, the rule should stop being silent.

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
| `process-2-evidence-gated.test.ts` | No check today for the old-sermon exemption applied to sub-phase rules. Depends on Q4. | New | Process #2 | No |
| `process-3-movement-visible.test.tsx` | A new check asserts the visibility marker fires when a sub-phase boundary is crossed. | New | Process #3 | **Yes** |
| `process-3-movement-visible.test.tsx` | An existing check that scans the codebase for the visibility marker may go stale if a new marker variant is introduced for sub-phase. | Expand | Process #3 | No |
| `process-4-pc-follows-text.test.tsx` | Existing check (PC absence does not lock Study) remains valid in either fork of Q6. | Unchanged | Process #4 | No |
| `process-4-pc-follows-text.test.tsx` | If Q6 = (a), new checks assert the per-sub-phase PC progression. If Q6 = (b), no new check. | New (conditional on Q6) | Process #4 | Conditional |
| `process-5-ai-augments.test.ts` | Existing check (AI proposal on empty field rejects) remains valid. | Unchanged | Process #5 | No |
| `process-5-ai-augments.test.ts` | If Q8 = (a), new check asserts inline AI reviews route through the central save-and-check logic. If Q8 = (b), no new check. | New (conditional on Q8) | Process #5 | Conditional |

**Standing fixture-parity rule.** Any change to the central save-and-check logic must update the test fixture in the same code change. The redesign's most invasive shape — making sub-phase movement a real recorded boundary, returning per-sub-phase rejection codes, returning a visibility flag for sub-phase boundaries, optionally adding a save path for AI Reviews — implicates the test fixture in three of the rows above. Any redesign work that touches the central logic carries a fixture-update obligation in the same code change.

---

## 7. What changes on screen and in the AI

The screen, prompts, and navigation surfaces all see knock-on changes from sections 2–4. This section names *what changes* per surface and *why*; it does not design any surface. Items that should hand off to a separate cleanup pass are listed for handoff only.

### The workspace shell (the always-on parts of the screen)

| Change | Reason |
|---|---|
| Replace the always-on Pastoral Context card at the top of the workspace with an affordance whose visibility tracks the section 4 progressive model. | The current placement frames PC as parallel-track orientation, contradicting "follows the text." |
| Sub-phase movement becomes a visible event — some form of marker, toast, or banner so the pastor sees they crossed a boundary. | Today sub-phase advancement is silent. With new evidence checks firing, the pastor needs to see the boundary they crossed. |
| The Continue button at each sub-phase is enabled or disabled based on the section 3 evidence checks. | Today Continue is always enabled. Without this binding, section 3 is decorative. |

### The Study tab (the four worksheets)

| Change | Reason |
|---|---|
| Disambiguate **Synthesize** (Redemptive Thread) and **Compile** (Implications) so they don't present as the same affordance for different operations. | Today both are AI write buttons that look and act alike but mean different things. This violates Surface Contract #2 — the rule that buttons of the same shape do the same thing. |
| Add an **Implications-only summary moment** between Implications completion and the four-phase synthesis. | Today the four-phase synthesis fires on Continue and substitutes for any reflection on Implications alone. The pastor never sees an Implications-only handoff. |
| Optionally make earlier-phase content (Observe, Interpret) reachable from later sub-phases — not just the AI bullet summary. | Today the only back-reference at later sub-phases is the AI summary; the actual question fields are hidden. The spec calls for "deepening," which requires being able to look back. |
| Implications restructure question. Today three concerns (Theological, Personal, Unbeliever) are conflated into one sub-phase. The product owner must rule whether Implications stays as one step or splits — Q7 in section 8. | Implications today carries three concerns at once with no internal structure. |

### AI prompts

| Change | Reason |
|---|---|
| Each inline review prompt (Observe Review, Interpret Review, RT Review, Implications Review) must phrase any PC reference as conditional ("if available, consider; if not, evaluate from a general perspective"). | Section 4 introduces PC at later sub-phases, and that introduction must not propagate the heavy MPS-style PC weighting. |
| Synthesize and Compile, if reclassified as proposal-then-apply (Q5 = (a)), need prompt edits to produce a *proposed* synthesis the user accepts/discards rather than a directly-written synthesis. | Today both write directly. Reclassification changes the prompt's contract with the screen. |
| The MPS Draft prompt — already the heaviest PC-leaning prompt in SermonForge — should be re-read against the section 4 rule that PC must remain optional input. | The prompt is the cleanest example of one teetering on "PC is prerequisite." The redesign does not need to rewrite it but must verify it passes the rule. |

### Sub-phase navigation

| Change | Reason |
|---|---|
| Sub-phase transitions route through the central save-and-check logic. They inherit the visibility marker, evidence checks, and the sermon's audit trail. | This follows from Q1 = (a). |
| The Continue label asymmetry at Implications ("Continue to MPT / MPS →" rather than plain "Continue") is consistent with the step transition being meaningfully different. The redesign does not need to change the label, but should confirm it's intentional. | Noted for completeness — not a redesign target. |

### Items to hand off to a separate cleanup pass (no design here)

| Item | Why hand off |
|---|---|
| Three database fields (`study_guide_note`, `preaching_blocks`, `manuscript_delivery`) that exist in the schema and are listed as fields the central save-and-check logic is willing to write to, but **are not referenced anywhere in current Study or Exegesis code**. | Likely artifacts of older content models. Cleanup is mechanical and unrelated to the redesign's behavioral work. |
| Sub-phase visibility marker naming conventions. | An infrastructure detail for whoever implements the markers, not a redesign question. |

---

## 8. What's still open

Each item below is a ruling the product owner needs to make for the redesign to proceed past planning. They are listed in roughly the order they affect downstream work.

**Q1 — Sub-phase and step transitions: real recorded movements with checks and announcements, or silent screen-changes? — DECIDED: real recorded movements (scope (a)).** Today's StudyTab advances sub-phases by incrementing a counter on screen, and SermonWorkspace advances steps the same way; neither calls the central save-and-check logic. The product owner has ruled that the redesign **routes both through the central logic.** Sections 3, 5, and 6 of this document carry through under that ruling. The implementation reach is meaningfully larger than the redesign's original framing assumed: new save-path rules, new rejection codes, fixture updates, visibility markers. That reach is accepted.

**Q2 — Reshape the data, or work within the current shapes?** *(open)*
The investigation confirmed every Study sub-phase saves a JSON bundle inside its parent field, and that **no schema change is forced by the redesign.** Adding new pieces inside a JSON bundle, adding a new Implications-only summary slot, even adding new sub-fields to an existing field — all of this can be done without a schema change. The question is whether the redesign takes that freedom and reshapes (for example, splitting the Implications three-group structure into clearer named pieces, or splitting the Redemptive Thread summary slot into "synthesis" plus "Christ-Connection Statement") or holds the shapes constant and changes only behavior. Reshape is more honest to the artifact framing in section 2 but invites the implementation to run wider. Behavior-only is tighter scope but leaves field names that don't quite match what the redesign says they produce.

**Q3 — At sub-phase boundaries: hard gates or soft guidance?** *(open)*
With Q1 settled, sub-phase movement is now structural. The remaining choice is whether the section 3 evidence checks *block* the pastor when the work is insufficient (Continue is hard-disabled with a clear "you can't advance until X" message) or *guide* (Continue is greyed out with a soft tooltip, or shows a warning the pastor can override). Strong gate has a punch-in-the-face quality that some pastors will find clarifying and some will find paternalistic. Soft guidance reads gentler but lets the pastor advance with weak evidence and pushes the consequence downstream into MPT/MPS.

**Q4 — Old sermons and the new evidence rules: free pass forever, or only on the original rule?** *(open)*
Today the old-sermon exemption (for sermons created before April 2026) covers the original empty-evidence rule. The redesign adds new categories of check (coverage, structural completeness, synthesis presence). Does the exemption extend to the new categories, so old sermons remain frictionless forever? Or does the exemption stay scoped to the original rule, so a pastor returning to a 2025 sermon hits the new gates retroactively? Free pass forever is kinder to existing work but creates a permanent two-tier system. Scoped exemption is cleaner long-term but means surprise gates on old work.

**Q5 — Synthesize and Compile direct-writes: violation to fix, or carve-out to document?** *(open)*
Both buttons silently overwrite whatever is in the summary or compiled box, with no chance to review or reject. The redesign can either (a) make them work like the Draft buttons — proposal appears in a panel, the pastor accepts or discards; or (b) keep them as quick syntheses and document the carve-out with a stated rationale. Option (a) respects the rule and gives the safety net coverage but adds friction to two AI writes that currently feel quick. Option (b) keeps the quick feel but leaves an undocumented bypass in production code.

**Q6 — Pastoral Context in AI prompts: modulated per sub-phase, or uniformly available?** *(open)*
Today the part of the code that assembles what the AI sees before each response sends Pastoral Context as the same block of text at every sub-phase, but only the MPS Draft prompt actually leans on PC heavily; the other prompts ignore it. The progressive model in section 4 proposes PC be modulated — minimal at Observe, marination at Interpret, texture at RT, fully integrated at Implications. Modulation is more honest to Process Contract #4 but makes the AI's behavior across sub-phases harder to predict. Uniform availability is what we have today and is simpler, but Process Contract #4's "follows the text" language stays unenforced at the prompt layer. This question pairs with the fork in section 5 — whether Process Contract #4 becomes binding or descriptive.

**Q7 — Implications after the redesign: one coherent step, or split into separate sub-phases?** *(partially answered — restructure as one step, with PC as one of three voices; SFDI's walkthrough of Implications resolves the rest)*
"Three concerns into one screen" is Implications' core design problem. The redesign can either rebuild Implications as one coherent step that produces the unified Implications Synthesis (section 2's framing) or split Implications into two or three sub-phases.

**Partial answer (2026-05-01):** the product owner's PC articulation (captured verbatim in `docs/SYSTEMS/sermon-workspace.md` under "The Study throughline") points toward **restructure, not split**: Implications stays as one sub-phase, but its internal shape becomes a three-way conversation between Theological Significance, Personal Implications, and Pastoral Context. PC moves from orphaned-to-the-top-of-the-workspace into the conversation as one of three voices. The detailed field-level work — which fields enact which voice, how the conversation composes into the Implications Synthesis — is the work of SFDI's Implications walkthrough.

Single coherent step keeps the four-sub-phase shape intact and forces the synthesis to do the unifying work. Split honors that the three concerns are different and gives each its own check, but adds sub-phases (which touches navigation, the position-tracking columns added in v17, and tests). Splitting is the more invasive option.

**Q8 — Inline AI Review buttons: route through the central save-and-check logic, or stay as advisory?** *(open)*
Seven inline AI calls (Observe Review, Interpret Review, RT Review, Implications Review, MPS Chat, Outline Suggest, FE Chat) bypass the central save-and-check logic and live in screen-only state. None are subject to Process Contract #5 — the "AI augments, doesn't substitute" rule. Routing them through a new save path specifically for AI Reviews brings the rule to bear and gives the safety net coverage; staying as-is keeps inline AI feeling lightweight and disposable. The harder version of this question is whether Process Contract #5 *should* cover advisory AI at all — the rule was written about substitutive AI writes, and inline reviews are read-only by design.

**Q9 — Three unused fields: clean up in the redesign or in a separate pass?** *(open)*
`study_guide_note`, `preaching_blocks`, and `manuscript_delivery` exist in the schema and are listed as fields the central save-and-check logic is willing to write to, but they are not referenced anywhere in current Study or Exegesis code. They appear to be artifacts of older content models. Including them in the redesign widens scope unnecessarily — they are mechanical cleanup, not behavioral redesign. The recommendation is to hand off to a separate cleanup pass (already noted in section 7). The product owner should confirm.

---

*End of SPRD planning document.*
