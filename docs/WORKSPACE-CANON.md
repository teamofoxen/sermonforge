# WORKSPACE-CANON — the sermon walk: what & why

> **Status: LIVE — ratified 2026-06-15 (Workspace Re-Foundation Phase 1 step 5).** This is the
> binding source for the sermon walk's *what & why*: every stage, sub-phase, field, question,
> named outcome, handoff, and the completeness policy, at current truth. It is a top-level doc,
> peer to [`CORE.md`](CORE.md) (the law) and [`RULES.md`](RULES.md); the mechanics that render
> this walk live in [`SYSTEMS/sermon-workspace.md`](SYSTEMS/sermon-workspace.md). It **supersedes**
> the SFDI and SADI working docs (now banner-stamped historical records) as the live articulation
> of the walk. **Ground truth remains the code at HEAD — code wins any conflict.**
>
> **What "live" binds, and what it doesn't.** This canon binds the walk's *current shape* — the
> stages, sub-phases, fields, named outcomes, and completeness policy. It was drafted from the
> Phase-1 net-truth map + the code at HEAD and verified by a 15-agent ultracode pass (0 blockers)
> before ratification. The Merida tags (`[M] / [+] / [◆] / [⚠] / [✂]`) and the §7 open-seams were
> **Phase-2 input**; the Phase-2 surgery (2026-06-15/16) and the **OEM walk (2026-07-02,
> rulings of record: `docs/handoff/oem-walk-rulings-2026-07-01.md`) have now edited this live doc** — every
> region is preacher-walked and ratified, and the same walk ruled the Frame → Manuscript
> collapse (Assembly decides; Manuscript writes). The structural sweep that lands the collapse
> in code rides the same commit series as this amendment — see §7.

---

## Authority & boundary

This document is **the single live source for the sermon walk's *what & why***: every
stage, sub-phase, field, question, named outcome, the handoffs between them, and the
completeness policy — stated at current truth, Merida-annotated.

It is one of four layers. It owns its layer and points to the others; it never
re-documents them:

- **CORE.md = the law.** The contracts (State / Process / Mutation / Surface), the
  Principle, the Test, the persona-as-design-law, the Non-Negotiable boundaries. *Why
  the walk can't change shape.* Canon points to CORE clauses; it does not restate them.
- **WORKSPACE-CANON.md = what & why** *(this doc).* The questions, the named outcomes,
  the completeness policy, Merida fidelity.
- **`docs/SYSTEMS/sermon-workspace.md` = how & where.** Components, JSON columns,
  derivations, the save flow. *The mechanics that render this walk.*
- **Initiatives = how we got here.** SFDI, SADI, SPRD, era-2, invisible-system,
  workspace-restructure, saturation — now banner-stamped frozen history (this canon ratified
  2026-06-15).

**Out of scope for canon** (named so the boundary is explicit): the data layer
(better-sqlite3, soft-delete, search), the beta program + telemetry/privacy (BTI), and
the AI-removal *enforcement* machinery (the lint tripwire, keystore, deleted-file
inventory). Those live in CORE / RULES / SYSTEMS / REFERENCE and their own charters.
Canon states the *premises* they produced (below) and points to CORE for the binding.

### How to read the Merida tags

Each Study / Anchor / OEM question carries a fidelity tag against Tony Merida's *Christ-
Centered Expository* (CCE) — the framework this walk is the writing surface for. Tags
are **Phase-2 input only; nothing is cut or reworded in Phase 1.**

- **[M]** — faithful to Merida.
- **[+]** — a SermonForge addition (not in Merida; a deliberate choice to weigh).
- **[◆]** — gate-shaped: the structure is driven by the completeness gate (the per-unit
  table), not purely by Merida's prose method.
- **[⚠]** — drifted off Merida's intent — a Phase-2 candidate to restore or re-justify.
- **[✂]** — Merida has it; the app dropped it — a Phase-2 candidate to restore or ratify
  the drop.

### Maturity of each region

- **SFDI-walked** (Study) / **SADI-walked** (Anchor) — content-design-walked with the
  pastor; ratified.
- **OEM-walked** (Outline, Body, the Manuscript doors) — drafted 2026-06-09 from the
  Merida source, then **preacher-walked and ratified in the OEM walk (2026-07-02)**.
  The same walk collapsed the SADI-walked Frame sub-phase into the Manuscript door
  fields (the transplant — each door prompt asks the decision and the preached words
  together, at full SADI richness); SADI remains the frozen record of the transplanted
  moves. Outline/Body/Manuscript completeness stays lenient **by ruling**, no longer
  as a placeholder (§5).

---

## 0. The premises (stated here; enforced in CORE)

The walk rests on four settled premises. Canon names them so the walk reads whole;
the binding force lives in CORE.

1. **No AI substitution.** There are no AI authorship surfaces. The pastor authors every
   word; the system *asks* instead of answering. → CORE Process #5 + the "No AI"
   Non-Negotiable boundary. (ARI, 2026-05-09.)
2. **Sermon-first.** The sermon is the primary unit of the shipped product; the series is
   carried context. → CORE Project Identity.
3. **Clarity through Constraint, as a processional environment — not a wall.** The walk
   forces clarity by its shape and gravity, not by refusing navigation. → CORE Principle
   + Process #1.
4. **The code at HEAD is ground truth.** Where this doc and the code disagree, the code is
   right and this doc is stale.

---

## 1. The shape of the whole walk

**Three stages · eight sub-phases · seven named outcomes · 23 Study fields + 7
Assembly/Manuscript fields (30 total).** The stage boundary carries the walk's deepest
distinction (OEM walk, 2026-07-02): **Study understands, Assembly decides, Manuscript
writes.** The preacher sees the whole arc from first entry; forward is the natural
direction, but every question is reachable from the map at any time.

| Stage | Sub-phase | Named outcome | Maturity |
|---|---|---|---|
| **Study** | Observe | Observation Set | SFDI |
| | Interpret | Interpretation Set | SFDI |
| | Redemptive Thread | Christ-Connection Statement | SFDI |
| | Implications | Implications Synthesis | SFDI |
| **Assembly** | Anchor | Main Point Pair (MPT + MPS) | SADI |
| | Outline | Sermon Outline | OEM |
| **Manuscript** | Body | Sermon Body | OEM |
| | Intro, Transitions, Conclusion | *(the Manuscript itself — terminal)* | OEM + the Frame transplant |

**One named outcome per sub-phase** — except the terminal doors sub-phase, whose artifact
is the Manuscript itself. Each sub-phase runs a throughline through its fields and produces
its named artifact, which the next sub-phase opens against. **"Sermon Outline" and "Sermon
Body" were ratified as names by the OEM walk** (they had been provisional RW1 first-drafts).
The **Sermon Frame** outcome retired 2026-07-02: its seven moves live on inside the door
fields (§4.2), each prompt asking the decision and the preached words together.

### How movement works

- **Monotonic in expectation, not enforcement.** Forward is the designed direction, shown
  by the map's weighting. The system never refuses navigation — the preacher clicks any
  question on the map and lands there; a labeled **← Back** sits beside **Next**.
- **Visible at thresholds, not narrated.** Three discrete landing screens carry all
  movement visibility — sermon start, the **Study → Anchor handoff**, and **sermon
  completion (Finish)**. Each is re-readable forever — the sermon-start and Study → Anchor
  screens via standing "Read again" doors on the map header, and the Finish screen via the
  always-available "Finish sermon →" control (it holds no seen-state and reopens on demand).
  Within-stage movement is silent. A static **"Stage · Region"** place line and a map
  **"You are here"** state *where*, never *that movement happened*.
- **The text stays present.** The reference pane defaults to the **passage** in every
  region of every stage; it never flips away on its own. The preacher's own
  work is one tab-flip away on a "Your work" tab.
- **Completeness informs, never blocks.** "Is the sermon done?" has an answer (§5), shown
  at the Finish screen and at lower weight on the map. It never gates movement. The map
  renders three per-question states — answered, **partial** (some rows/points/cells of a
  multi-part question filled), unanswered — at low weight; the six composites and three
  lenient checks (§5) are the artifact-level roll-up of those signals.
- **The room and the guard ride along.** In the stages where the sermon is aimed at
  people — Body and the doors — the reference pane's "Your work" tab carries the
  **Pastoral Context room** (the prompts send the preacher to "the room you named") and
  the **Christ-Connection Statement** (the moralism guard the copy invokes), alongside
  the Main Point Pair, the Sermon Outline, and the assembled body prose. Ruled at the
  OEM walk (items 1–2): no prompt points at coordinates the screen doesn't show.

### How questions are shaped and stored

A field holds one or more **questions**, and a question has a **kind** that determines both
what it *is* to the preacher and how it is stored. Seven kinds, in two storage families:

- **Question-envelope kinds** — stored as `{value, na}` envelopes inside the sub-phase's
  JSON column (Study, Anchor): the default **text-prompt**; the **indented-canvas**
  (Observe's Divisions); and the **cumulative-synthesis-table** (the three per-unit tables).
  The cumulative table is the one kind whose state derives from the shared thought-unit
  array (`observations.divisions.thought_units`), not from its own column.
- **Native-column kinds** — written to the native JSON columns the Word export reads, *not*
  the envelope shape: **outline-builder** (Outline → `outline[]`), **functional-elements**
  (Body → `functional_elements{}`, four sub-elements per point), **manuscript-prose** and
  **manuscript-transitions** (the doors → `manuscript{}`). The door `redemptive_note`
  carries N/A semantics on a native-column kind — its persistence mechanism is part of the
  scheduled N/A build (§7).

A field shown below with a single "Asks" cell carries one question keyed **`primary`** whose
prompt is the field's hint (the legacy single-prompt shape, normalized at the walk-order
boundary; tracked debt to give every field an explicit questions array). The exact rendering
and on-disk mechanics live in `sermon-workspace.md`; canon names the kinds because *what a
question is* — a prose box, a reorderable point list, a per-row table — is part of the walk.

---

## 2. Study *(SFDI-walked)*

Four sub-phases of deepening exegetical work. A single canonical **thought-unit table**
runs across all four: the preacher lays out the passage's thought units on the Divisions
canvas in Observe, and each later sub-phase adds one column beside them — **Meaning**
(Interpret) → **Christ-Connection** (Redemptive Thread) → **Implication** (Implications).
Upstream columns render read-only downstream. This cumulative table is load-bearing in
code (the per-unit gate, §5) and is a Phase-2 fidelity subject **[◆]**.

**What a thought unit IS** *(ruled 2026-07-02)*: the **block** — a margin (depth-0)
statement **plus every line indented beneath it**, spanning the verses it covers. The
margin line marks where a unit *begins*; it is not the unit. The derived array keys each
unit to its margin row; the tables render the whole block, indentation preserved and
labeled with its verse span, composed live from the canvas so it can never go stale.
(The pre-ruling rendering showed only the margin line — the header standing in for the
whole, amputating the supporting lines the Meaning work is about.) Parallel statements
at the margin are **two units**: the preacher echoes the shared meaning or marks the
twin's cell not applicable — both satisfy the per-unit gate (§5).

### 2.1 Observe → **Observation Set**

Outside-in: locate the passage, report its surface, lay out its structure, then read the
lens cluster against that structure; close with the plain-sense point. Seven fields.

| Field (`key`) | Asks | Merida |
|---|---|---|
| Context (`context`) | What happened before / after / does it bear on this passage | before·after·impact **[M]** |
| Surface Questions (`surface_questions`) | Where / when / what's happening, in order | **[M]** *(Phase-2: verify against the Merida source which of his surface questions are kept vs trimmed)* |
| Divisions / Thought Units (`divisions`) | Hand-type the passage; main statements to the margin, supporting clauses indented, parallels aligned — one indented canvas. The thought-unit table is derived from this: each margin statement begins a unit, and the unit is its whole block (ruled 2026-07-02, see the §2 preamble). | **[M]** |
| Main Characters (`characters`) | Who acts; name each one's role | **[M]** |
| Commands and Declarations (`commands_declarations`) | For each main sentence, command vs declaration, and what it's doing | **[M]** |
| Big Ideas (`big_ideas`) | What concepts the passage wrestles with | **[M]** |
| Obvious Point (`obvious_point`) | The plain-sense point in one sentence | **[M]** — *binds the Observation Set* |

*Dropped from Merida here:* the 25-observations device — **ruled 2026-06-15 (Phase 2): kept as ambient posture** (the "don't stop at the obvious" framing now in Observe's entry teaching on the Context field), **not** a 25-row quota, which would re-commit the mechanization trap **[✂ → ratified with teaching]**; the
author/date/audience/genre "background" layer **[✂, split: world-of-the-book →
series-level Book Study; the genre slice was carried by Interpret's Genre field, itself removed 2026-06-15 (Phase 2 — a SermonForge addition cut)]**.

### 2.2 Interpret → **Interpretation Set**

Widen the lens, then close with meaning. Seven fields; the Merida arc runs Deeper Context
→ Recurring Ideas → Character Purpose → Contrasts → Cross-References → Commentary
(last, to check) → Interpretation Synthesis.

| Field (`key`) | Asks | Merida |
|---|---|---|
| Deeper Context (`deeper_context`) | Unresolved questions after Observe; fit in the book's argument | **[M]** |
| Recurring Ideas (`recurring_ideas`) | What recurs and what it signals | **[M]** |
| Character Purpose (`character_purpose`) | For each character, what they say/do/think and why | **[M]** |
| Contrasts (`contrasts`) | What's set against what, and what each contrast does | **[M]** |
| Cross-References (`cross_refs`) | Concentric circles outward; what each adds | **[M]** |
| Commentary Notes (`commentary`) | Last, to check — sharpen / confirm / correct / disagree | **[M]** |
| Interpretation Synthesis (`interpretation_synthesis`) | **`meaning_per_unit`**: Meaning beside each thought unit. **`meaning_whole`**: the whole passage's meaning in one paragraph — *the Interpretation Set.* | meaning_whole **[M]**; meaning_per_unit **[M intent / ◆ mandatory-row grid]** |

### 2.3 Redemptive Thread → **Christ-Connection Statement**

Position the text against Christ, trace how it points, ground the gospel's enabling power,
name need + God's character; close with the Statement. Five fields. The anti-moralism and
anti-allegory disciplines live here ("don't insert Christ where he isn't; the text leads").

| Field (`key`) | Asks | Merida |
|---|---|---|
| This Passage and Christ (`this_passage_and_christ`) | Position relative to Christ (before/after/transitional; NT pickup); direct Christ-speech | **[M]** |
| How the Passage Points to Christ (`passage_points_to_christ`) | The four mechanisms: biblical theme / promise / type / predictive | **[M, near-verbatim]** |
| How the Gospel Makes This Possible (`gospel_makes_possible`) | What the text demands, and how the gospel makes *that* possible (the anti-moralism move) | **[M]** |
| Our Need and God's Character (`need_and_character`) | Human need for Christ; the character of the God who provides | **[M]** |
| Christ-Connection Statement (`christ_connection_statement`) | **`christ_per_unit`**: Christ-connection beside each thought unit. **`statement`**: how the whole passage points to Christ, how he is its hero, and **what it shows him to be better than — more beautiful, more worthy — written so a listener could not only see Christ but want him** — *the Statement.* | statement **[M / + named-outcome / + affections layer, OEM 2026-07-02]**; christ_per_unit **[⚠ / ◆ — resolved by the per-cell N/A ruling (§5); the tag stays until the code build ships]** |

**The affections layer** *(OEM walk, 2026-07-02 — pastor-authored, the deepest ruling of the
walk).* The CCS teaching closes with the pastor's own text, extending Goldsworthy's evaluation
question past testimony-on-paper: *"A sermon can testify to Christ on paper; the aim is that
Christ testifies to the people. How does Jesus, through this passage, become a safe place for
sinners and a dangerous place for sin? How does this passage expose the paltry nature of sin in
the light of the superiority of Christ? How does it lead us to obey Jesus not out of fleshly
fear but simply because he is better?"* The layer rides in teaching and prompts only — posture
and prompt, never a per-unit grade or a checkbox (the mechanization trap refused again). Its
downstream echoes: the Body application prompt's expulsive idols clause (§4.1) and the Finish
screen's beholding moment (§6).

### 2.4 Implications → **Implications Synthesis**

The three-voice conversation — what the text **teaches**, what it **asks**, the specific
**room** it lands in — integrated into one synthesis. Four fields.

| Field (`key`) | Asks | Merida |
|---|---|---|
| Theological Significance (`theological_significance`) | 5 questions: about God / ourselves / Christ / timeless principles / particular doctrines | **[M, exact]** |
| Personal Implications (`personal_implications`) | 4 verb-slots: Follow / Forsake / Receive / Settle | **[M (Study side) — the necessary / probable / possible authority gradient is taught here as ambient framing (2026-06-15, Phase 2), no per-row quota; the FULL gradient LANDED in Body at the OEM walk (2026-07-02, §4.1): it now lives in the Application cell's prompt at the moment of writing]** |
| Pastoral Context (`pastoral_context`) | **`room_specifics`**: who in the room the text speaks into — named as the prodigal AND the older brother, not a generic "everyone." **`cost_and_gift`**: for those people, the cost and the gift | **[+ — the third voice]**; **[M — two-brothers restored 2026-06-15 (Phase 2): `room_specifics` now names the prodigal AND the older brother; the prior prompt listed generic groups but lacked that axis]** |
| Implications Synthesis (`implications_synthesis`) | **`implication_per_unit`**: integrated implication beside each thought unit. **`synthesis`**: the whole passage — teach + ask + land — in one voice. *The Implications Synthesis.* | synthesis **[+ / ◆ named outcome]**; implication_per_unit **[◆ — the least-Merida of the per-unit tables]** |

**The marinate moment.** The Implications Synthesis overview closes Study by sending the
preacher **back to the passage**: *"Before you move to the Main Point, step back and read
the passage through once more… let the text breathe on you before you forge."* This is the
restored Merida marinate beat (saturation ruling, 2026-06-10) — a **return to the text**,
explicitly *not* a relabel of the synthesis. The synthesis remains the content substrate
the Main Point draws from. **[M]** (Phase-2: is re-reading the passage the full marinate
beat, or only part?)

---

## 3. Assembly

### 3.1 Anchor → **Main Point Pair** *(SADI-walked)*

Forge the pair the whole sermon hangs on. Two fields; the forge opens with the passage in
the reference pane (the marinate beat continues here).

| Field (`key`) | Questions | Merida |
|---|---|---|
| MPT — Main Point of the Text (`mpt`) | **`draft`** — re-read the passage, then draft what the text said to its original audience (past tense, author-intended); **`tighten`** — compress to one past-tense sentence | **[M]** |
| MPS — Main Point of the Sermon (`mps`) | **`translate`** — begin from the full fallen-condition focus (the human problem; what hearers share with the text's original audience; and the grace this text holds out for that condition), then turn the MPT into present/future aimed at that need and that grace; **`gospel_check`** — set it beside the Christ-Connection Statement; does the call rest on Christ's work or slip into "try harder"? *(N/A-able — see §5)*; **`tighten`** — fold into one present/future sentence | translate **[M — FCF restored 2026-06-15 (Phase 2): now begins from the fallen-condition-focus; was the biggest single drift, a bare tense-swap]**; gospel_check **[M]**; tighten **[M]** |

*Ruled 2026-06-15 (Phase 2):* the sermon **title** stays dropped — Merida makes it an optional third stage, and every sermon already carries a name (CORE State Contract clause 3); Chapell's **3 AM test** is restored as a crispness self-check folded into MPS `tighten` (not a new field). **[✂ title = ratified drop · 3 AM test = M, restored as a check]**

### 3.2 Outline → **Sermon Outline** *(OEM-walked)*

| Field (`key`) | Asks | Merida |
|---|---|---|
| Outline (`outline`) | **`points`** — lay out the body's movements, one per movement of the text; each a sentence your people would use, building to a climax, echoing the MPS | **[M, free list]** — carries Merida's three traps (clever/imposed/predictable outlines) in its teaching. Ratified as-is, zero edits (OEM Stage 1). |

Assembly ends here — everything after the Sermon Outline is writing, and writing is
Manuscript's job (the decide/write boundary, OEM item 8).

---

## 4. Manuscript *(OEM-walked; carries the Frame transplant)*

The writing stage, in two sub-phases: **Body** (the sermon's substance, written under the
outline points) and **Intro, Transitions, Conclusion** (the doors, written last against the
finished body — "prepared near-last" preserved). The pastor's governing articulation
(OEM Stage 3): *"MPS flows to main points flows to functional elements. If upstream is done
well, there shouldn't be an issue"* — the body is written in the Body cells and nowhere
else; cell clarity, not extra structure, is what makes the manuscript flow.

### 4.1 Body → **Sermon Body** *(OEM-walked; formerly Assembly/Equip)*

| Field (`key`) | Asks | Merida |
|---|---|---|
| Equip (`equip`) | **`elements`** — under each outline point, the four functional elements: **Scripture · Explanation · Application · Illustration**. Every point needs its Scripture, its explanation, and its application; illustration serves them, and only where it fits naturally. Each cell is written as the words the preacher will actually preach — the cells ARE the manuscript body. | hierarchy **[M]**; application **[M — the battery completed at the OEM walk (items 3–4): the necessary/probable/possible gradient now lives in the Application prompt at the moment of writing; the idols-of-the-heart probe takes the expulsive form ("name the idol this point confronts, and show Christ better"); the prompt sends the preacher to the Pastoral Context room (prodigal AND older brother); the word to the unconverted is taught as posture ("where the text gives it"), never a per-point quota]** |

### 4.2 Intro, Transitions, Conclusion — the doors *(OEM-walked + the Frame transplant)*

Three fields, written last. The Frame stage's seven moves live here (transplant, OEM item
8): each door prompt asks the **decision and the preached words together**, at full SADI
richness, and — because the body now exists — speaks about *your* points, not a body in
the abstract. The redemptive note and gospel-empowerment carry the anti-moralism guard to
the doors.

| Field (`key`) | Questions | Merida |
|---|---|---|
| Introduction (`introduction`) | **`opener`** — choose the hook and write it to preach (skippable for a part-two/dense text per Merida); **`scripture_reading`** — the bridge into the text, landing MPT/MPS; **`expectation`** — what the body will actually ask, named before it begins; **`redemptive_note`** — the gospel anchor at the front door *(N/A-able, strict "satisfied another way" — see §5)* | 4 moves **[M — the Frame Intro moves, transplanted]** |
| Transitions (`transitions`) | **`transitions`** — one bridge into each point and one into the conclusion; brief, inconspicuous, varied; reiterate the MPS lightly | **[M]** — genuinely new prose, not a transplant |
| Conclusion (`conclusion`) | **`summation`** — gather what the points have built into one landing, fresh words, not a recap; **`response`** — the call from the MPS made concrete for the named room, gospel-empowered from the Christ-Connection Statement | 3 moves in 2 prompts **[M — summate → summation; land_call + gospel_empower → response]** |

*The doubling, resolved:* the old Frame → Manuscript split asked the Intro/Conclusion
twice — decisions in Assembly/Frame, prose in Manuscript. The OEM walk ruled the collapse
(item 8): one door surface, at the end, decision and words together. The **[⚠]** structural
note this section used to carry is discharged.

---

## 5. The completeness policy

"Is the sermon done?" is answered by **nine load-bearing artifacts**: the four Study named
outcomes, the Main Point Pair as its two halves (MPT + MPS), the Sermon Outline, the Sermon
Body, and the Manuscript. (The Sermon Frame's two completeness halves retired with the Frame
collapse, 2026-07-02 — their substance is checked inside the Manuscript's doors check below.)
The answer **informs, never blocks** (Process #1: no walls). It is shown at the Finish screen
with per-artifact "go write it" jumps, and at lower weight on the map.

### The six composites *(ratified — SFDI / SADI)*

An artifact is complete when its composite returns no reason:

| Named outcome | Complete when |
|---|---|
| Observation Set | The Divisions canvas has ≥1 main sentence with an indented modifier under it. |
| Interpretation Set | **Every** thought unit has a Meaning **and** the whole-passage meaning paragraph is written. |
| Christ-Connection Statement | **Every** thought unit has a Christ-Connection **and** the Statement paragraph is written. |
| Implications Synthesis | **Every** thought unit has an Implication **and** the Synthesis paragraph is written. |
| Main Point of the Text | `draft` and `tighten` both written. |
| Main Point of the Sermon | `translate` and `tighten` written; `gospel_check` written **or** marked N/A. |

*(The Intro/Conclusion composites — `checkIntroComposite` / `checkConclusionComposite` —
retired with the Frame collapse; the doors are covered by the ratified-lenient Manuscript
check below.)*

*One asymmetry to note:* the Observation Set is the only outcome whose **surfaced artifact**
and **done-check** live in different fields — the Study → Anchor handoff renders the **Obvious
Point** as the Observation Set, while its completeness gate checks the **Divisions canvas**.

### The three lenient checks *(RATIFIED lenient — OEM walk, item 7)*

Outline, Body, and Manuscript use deliberately lenient presence checks — "honest without
nagging." The OEM walk ruled this the right bar, not a placeholder:

- **Sermon Outline** — ≥1 outline point with text.
- **Sermon Body** — ≥1 functional element written under any point. (The *map's* per-question
  honesty is separate and stricter, per the OEM Equip ruling: a point reads "answered" when
  its Scripture + Explanation + Application are filled; Illustration never gates.)
- **Manuscript** — an `opener` answer **and** the Conclusion `response`. **Transitions are
  deliberately never counted** (explicit ruling: a sermon is preachable without written
  bridges; the map still tracks them honestly).

### The N/A policy *(ruled 2026-06-14 — Re-Foundation Phase 1, examination 1)*

1. **A named outcome can never be N/A.** The synthesis/statement questions that *are* the
   named outcomes — `meaning_whole`, the Christ-Connection Statement, both syntheses, and the
   MPT/MPS `tighten` questions that feed the Word export — carry no N/A escape. This is the
   hard constraint, not subject to the ruling below.
2. **An honest "nothing here / doesn't apply" counts as done.** The pastor ruled (examination
   1) that the completeness signal must never reward manufacturing a connection the text
   doesn't carry. So N/A means "the text genuinely doesn't carry this" or "satisfied another
   way" — an *active* gesture, never a silent skip — and it counts toward complete. It is
   available on: (a) the two granted non-Study questions — `mps.gospel_check`, and the
   Manuscript door `introduction.redemptive_note` (the grant moved with the key in the
   Frame transplant, 2026-07-02, keeping its strict "satisfied another way" semantic; note
   it now lives on a native-column kind, so its persistence mechanism is part of the
   scheduled build); (b) the **declared Study questions** SFDI grants it (Observe
   Where/When; Cross-References/Commentary; Redemptive Thread's four-ways; Implications
   Fields 1–2); and (c) **per thought-unit cell** on the three cumulative tables (Meaning /
   Christ-Connection / Implication) — a unit marked "nothing here" satisfies its column.
   The named-outcome paragraphs in rule 1 are excluded throughout.
3. **Enforcement and timing.** N/A is enforced three-deep (field-def flag · UI toggle ·
   write-path guard). **BUILT 2026-07-02.** The Study-question grants (2b) carry `naAllowed`
   on the field defs (field-level for the two single-question fields, propagated by
   `walkOrder.normalizeField`); the per-cell gesture (2c) rides a `<column>_na` sidecar on
   each thought-unit row, honored by the three composites (`cumulativeCellSatisfied`), the
   map, and the handoff's unfinished list, and preserved across canvas re-derivation.
   *(Scope note: the grant list above is implemented exactly as this canon names it; the
   frozen SFDI doc granted N/A on a broader set of Observe/Interpret fields — this canon,
   as the live authority, is the narrower binding list. Widening to the full SFDI set is a
   future pastor ruling, not drift.)*

> **✅ RULED 2026-06-14.** The pastor settled this (examination 1): *extend* the honest-absence
> gesture to Study (above), not amend SFDI down to two questions. The SFDI "PENDING PASTOR
> RULING" banner is resolved accordingly. The legacy Divisions-canvas N/A short-circuit folds
> in — it stays honest for stored legacy data and becomes a live, intended gesture once the
> per-cell toggle ships. What the ruling does NOT relax: the named-outcome paragraphs stay
> no-N/A (rule 1).

### The per-unit gate *(ruled — the honest-blank resolution)*

The Interpretation / Christ-Connection / Implications composites require an entry on **every**
thought unit — a per-row exhaustiveness the cumulative table makes structural. This was the
clause most in tension with Merida (whose method allows that some thought units legitimately
carry no direct Christ-connection — the app's own Redemptive Thread teaching says so).
**Resolved by the examination-1 ruling, BUILT 2026-07-02:** a unit may be marked "nothing
here" per cell (the `<column>_na` sidecar) and still count complete (N/A policy rule 2c
above), so the gate no longer forces a manufactured entry on a unit the text leaves bare.
The whole-passage synthesis paragraph still must be written (rule 1 — the composites keep
checking it, no N/A). The **[◆]** tags in §2 remain as Phase-2 *Merida-fidelity* annotations
on the questions themselves — a separate matter from this completeness ruling.

---

## 6. The handoffs

Each sub-phase opens against the prior named outcome. The boundary frame is generated from
the walk order — **"X opens, against the Y"** — naming the substrate the new region builds
on, with no claim that the prior region is *closed* (free navigation means it may not be).

- **Within each stage:** the first field of each new sub-phase carries the one-line frame
  (e.g. *"Interpret opens, against the Observation Set."*). Across the ruled shape:
  Outline opens against the Main Point Pair; **Body opens against the Sermon Outline**
  (this is now also the Assembly → Manuscript stage boundary — decide → write); the
  **doors open against the Sermon Body**.
- **Study → Anchor (the big seam):** a discrete handoff landing screen, re-readable, which
  **renders the passage** (the marinate return-to-text) and frames the forge as opening
  **against all four Study outcomes**, not only the Implications Synthesis:
  *"Anchor opens, against your Study work."*
- **Sermon completion:** the Finish threshold — opened by the **beholding moment** (OEM
  item 1: the Christ-Connection Statement and MPS rendered back, read-only, under *"Did
  this sermon testify to Christ — and does it show him to be better?"*), then the artifact
  review (§5) with "go write it" jumps, Export to Word carrying the **"pray yourself hot"
  send-off** at the manuscript-to-pulpit seam, and Mark as preached. Summoned, never
  automatic; re-openable forever. Completion is the means of the screen, not its point.

---

## 7. Open seams (what remains after the OEM walk)

Recorded so canon is honest about what is *not* yet frozen. The OEM walk (2026-07-02)
closed the old seams 2–4: the DRAFT pedagogy is preacher-walked and ratified, the two
provisional names are ratified, and the OEM-deferred Merida items (adoration telos,
construction-stage congregation, the application battery) are all ruled — rulings of
record in `docs/handoff/oem-walk-rulings-2026-07-01.md`. The two remaining code seams then **shipped**:

1. ✅ **The structural sweep — SHIPPED 2026-07-02** (the Frame collapse, Equip →
   Manuscript/Body, the pane passengers, the Finish beholding moment + send-off, the
   map-math + doors-check updates, the redemptive_note `_na` sidecar). Canon and code
   are reconciled; the running app walks the ruled shape.
2. ✅ **The N/A code build — SHIPPED 2026-07-02.** Both halves landed: the Study-question
   grants (2b) and the per-cell N/A on the three cumulative tables (2c), enforced
   three-deep and preserved across canvas re-derivation (§5 rule 3). The door
   `redemptive_note` N/A shipped earlier the same day with the transplant (sidecar). What
   remains genuinely open here is only a **pastor decision, not code**: whether to widen
   the Study grant list to the fuller SFDI set (this canon binds the narrower list — §5).
3. **The remaining Merida flags** (**[◆]** on the §2 per-unit tables) — policy-resolved by
   the per-cell N/A ruling now that the build shipped; historicizing those tag annotations
   in the §2 tables is a trivial doc-cleanup follow-up, not a code or policy matter.

---

## Provenance

- Drafted from the Phase-1 net-truth map (`docs/PROPOSALS/refoundation-initiative.md`,
  "Phase 1 · Step 1 output") and the code at HEAD `320f272`.
- Walk content read at draft time from: `src/utils/studyFields.js`,
  `sadiAnchorFields.js`, `sermonOutlineFields.js`, `sermonEquipFields.js`,
  `sermonFrameFields.js`, `sermonManuscriptFields.js`, `walkOrder.js`,
  `studyAdvancement.js`, `sermonState.js`.
- Merida tags from the merida-intent audit (`project_merida_intent_audit`) + the working
  board's Merida provenance map.
- **Verified by a 15-agent ultracode pass (0 blockers) and ratified 2026-06-15 (Re-Foundation Phase 1 step 5).**
- **Amended 2026-07-02 (the OEM walk):** all regions preacher-walked; the Frame → Manuscript
  collapse + the Body move (decide/write stage boundary); the affections layer (§2.3); the
  completed application battery (§4.1); the door transplant (§4.2); completeness re-based to
  six composites + three ratified-lenient checks (§5); the beholding moment + send-off (§6).
  Rulings of record: `docs/handoff/oem-walk-rulings-2026-07-01.md`. CORE amended the same day
  (see `CORE-CHANGELOG.md`).
- **N/A code build SHIPPED 2026-07-02 (§5, §7):** the ruled N/A policy is now enforced in
  code — the Study-question grants (2b) and per-cell cumulative-table N/A (2c), with the
  grant list bound to this canon's (narrower-than-SFDI) named set.
