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
> before ratification. The Merida tags (`[M] / [+] / [◆] / [⚠] / [✂]`) and the §7 open-seams are
> **Phase-2 input**: Phase 1 cut nothing, and the Phase-2 Merida question surgery will edit this
> live doc (CORE Process #6 permits the pedagogical content — question number, wording, named-
> outcome text — to evolve; the structural integrity does not). The DRAFT regions (Outline, Equip,
> Manuscript) are authorable but not yet preacher-walked — see §1 "Maturity of each region."

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

- **SFDI-walked** (Study) / **SADI-walked** (Anchor, Frame) — content-design-walked with
  the pastor; ratified.
- **DRAFT** (Outline, Equip, Manuscript) — drafted 2026-06-09 from the Merida source,
  *authorable and Merida-grounded but not yet preacher-walked.* Their pedagogy is a
  strong first draft pending an OEM content walk; their completeness uses lenient checks
  (below), not ratified composites.

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

**Three stages · eight sub-phases · eight sub-phase named outcomes · 25 Study fields + 9
Assembly/Manuscript fields (34 total).** The preacher sees the whole arc from first entry;
forward is the natural direction, but every question is reachable from the map at any time.
(The code's `REGION_NAMED_OUTCOME` also carries a ninth entry, "Manuscript," for the
terminal stage; the eight *sub-phase* outcomes are the artifacts a throughline produces.)

| Stage | Sub-phase | Named outcome | Maturity |
|---|---|---|---|
| **Study** | Observe | Observation Set | SFDI |
| | Interpret | Interpretation Set | SFDI |
| | Redemptive Thread | Christ-Connection Statement | SFDI |
| | Implications | Implications Synthesis | SFDI |
| **Assembly** | Anchor | Main Point Pair (MPT + MPS) | SADI |
| | Outline | Sermon Outline | DRAFT |
| | Equip | Sermon Body | DRAFT |
| | Frame | Sermon Frame (Intro + Conclusion) | SADI |
| **Manuscript** | *(no sub-phase)* | Manuscript | DRAFT |

**One named outcome per sub-phase.** Each sub-phase runs a throughline through its fields
and produces exactly one named artifact, which the next sub-phase opens against. Two of
the eight names — **Sermon Outline** and **Sermon Body** — are first-draft (RW1, not
SFDI/SADI-ratified); treat them as provisional until the OEM walk.

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
  region (Study and Assembly alike); it never flips away on its own. The preacher's own
  work is one tab-flip away on a "Your work" tab.
- **Completeness informs, never blocks.** "Is the sermon done?" has an answer (§5), shown
  at the Finish screen and at lower weight on the map. It never gates movement. The map
  renders three per-question states — answered, **partial** (some rows/points/cells of a
  multi-part question filled), unanswered — at low weight; the eight composites and three
  lenient checks (§5) are the artifact-level roll-up of those signals.

### How questions are shaped and stored

A field holds one or more **questions**, and a question has a **kind** that determines both
what it *is* to the preacher and how it is stored. Seven kinds, in two storage families:

- **Question-envelope kinds** — stored as `{value, na}` envelopes inside the sub-phase's
  JSON column (Study, Anchor, Frame): the default **text-prompt**; the **indented-canvas**
  (Observe's Divisions); and the **cumulative-synthesis-table** (the three per-unit tables).
  The cumulative table is the one kind whose state derives from the shared thought-unit
  array (`observations.divisions.thought_units`), not from its own column.
- **Native-column kinds** — written to the native JSON columns the Word export reads, *not*
  the envelope shape: **outline-builder** (Outline → `outline[]`), **functional-elements**
  (Equip → `functional_elements{}`, four sub-elements per point), **manuscript-prose** and
  **manuscript-transitions** (Manuscript → `manuscript{}`).

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

### 2.1 Observe → **Observation Set**

Outside-in: locate the passage, report its surface, lay out its structure, then read the
lens cluster against that structure; close with the plain-sense point and the first
sight of the room. Eight fields.

| Field (`key`) | Asks | Merida |
|---|---|---|
| Context (`context`) | What happened before / after / does it bear on this passage / why did the Spirit lead the author to write this, here | before·after·impact **[M]**; holy_spirit_intent **[+]** |
| Surface Questions (`surface_questions`) | Where / when / what's happening, in order | **[M]** *(Phase-2: verify against the Merida source which of his surface questions are kept vs trimmed)* |
| Divisions / Thought Units (`divisions`) | Hand-type the passage; main statements to the margin, supporting clauses indented, parallels aligned — one indented canvas. The thought-unit table is derived from this. | **[M]** |
| Main Characters (`characters`) | Who acts; name each one's role | **[M]** |
| Commands and Declarations (`commands_declarations`) | For each main sentence, command vs declaration, and what it's doing | **[M]** |
| Big Ideas (`big_ideas`) | What concepts the passage wrestles with | **[M]** |
| Obvious Point (`obvious_point`) | The plain-sense point in one sentence | **[M]** — *binds the Observation Set* |
| Possible Implications (`applications`) | What the passage is starting to press on the room; what's hard, what's hopeful | **[+]** — the first surfacing of Pastoral Context; "early sight, not application" |

*Dropped from Merida here:* the 25-observations device — **ruled 2026-06-15 (Phase 2): kept as ambient posture** (the "don't stop at the obvious" framing now in Observe's entry teaching on the Context field), **not** a 25-row quota, which would re-commit the mechanization trap **[✂ → ratified with teaching]**; the
author/date/audience/genre "background" layer **[✂, split: world-of-the-book →
series-level Book Study; the genre slice → Interpret's Genre field]**.

### 2.2 Interpret → **Interpretation Set**

Widen the lens, then close with meaning. Eight fields; the Merida arc runs Deeper Context
→ Genre → Recurring Ideas → Character Purpose → Contrasts → Cross-References → Commentary
(last, to check) → Interpretation Synthesis.

| Field (`key`) | Asks | Merida |
|---|---|---|
| Deeper Context (`deeper_context`) | Unresolved questions after Observe; fit in the book's argument | **[M]** |
| Genre (`genre`) | The literary form and how it shapes interpretation | **[+]** (optional, light) |
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
| Christ-Connection Statement (`christ_connection_statement`) | **`christ_per_unit`**: Christ-connection beside each thought unit. **`statement`**: how the whole passage points to Christ and how he is its hero — *the Statement.* | statement **[M / + named-outcome]**; christ_per_unit **[⚠ / ◆ — mandatory every-row gate is in tension with "some thought units carry no direct Christ-connection, and that's fine"]** |

### 2.4 Implications → **Implications Synthesis**

The three-voice conversation — what the text **teaches**, what it **asks**, the specific
**room** it lands in — integrated into one synthesis. Four fields.

| Field (`key`) | Asks | Merida |
|---|---|---|
| Theological Significance (`theological_significance`) | 5 questions: about God / ourselves / Christ / timeless principles / particular doctrines | **[M, exact]** |
| Personal Implications (`personal_implications`) | 4 verb-slots: Follow / Forsake / Receive / Settle | **[M (Study side) — the necessary / probable / possible authority gradient is now taught here as ambient framing (2026-06-15, Phase 2), no per-row quota; the FULL application gradient lands in Equip at the OEM walk (§3.3)]** |
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

### 3.2 Outline → **Sermon Outline** *(DRAFT)*

| Field (`key`) | Asks | Merida |
|---|---|---|
| Outline (`outline`) | **`points`** — lay out the body's movements, one per movement of the text; each a sentence your people would use, building to a climax, echoing the MPS | **[M, free list]** — carries Merida's three traps (clever/imposed/predictable outlines) in its teaching |

### 3.3 Equip → **Sermon Body** *(DRAFT)*

| Field (`key`) | Asks | Merida |
|---|---|---|
| Equip (`equip`) | **`elements`** — under each outline point, the four functional elements: **Scripture · Explanation · Application · Illustration** (every point needs explanation + application; Scripture grounds; illustration serves) | hierarchy **[M]**; application **[M / ⚠ — Merida's application battery is thinner here: missing the idols-of-the-heart probe, the two-brothers address, the necessary / probable / possible authority gradient (taught ambiently in Study §2.4; the full discipline belongs here), and explicit evangelistic address]** |

### 3.4 Frame → **Sermon Frame** *(SADI-walked)*

The entry and the exit, authored as decisions (the prose is written in Manuscript). Two
fields. The redemptive note / gospel-empower carry the anti-moralism guard to the doors.

| Field (`key`) | Questions | Merida |
|---|---|---|
| Intro (`intro`) | **`hook`** — grab attention from where the listener is; **`bridge_to_text`** — hook into the text + MPT/MPS; **`expectations`** — what the sermon will ask; **`redemptive_note`** — the gospel-shape that makes the call good news *(N/A-able — see §5)* | 4 moves **[M]** |
| Conclusion (`conclusion`) | **`summate`** — gather the arc into one landing (not a recap); **`land_call`** — the call, from MPS, made concrete; **`gospel_empower`** — from the Christ-Connection Statement; **`closing_posture`** — silence / song / prayer / charge | 4 moves **[M]**; closing_posture **[+ — a forced explicit choice]** |

---

## 4. Manuscript *(DRAFT)*

The writing stage: the built body (Outline + Equip) and the Frame's decisions become
preaching prose. Intro and Conclusion are written near-last — they frame what already
exists. No sub-phase. Three fields.

| Field (`key`) | Questions | Merida |
|---|---|---|
| Introduction (`introduction`) | **`opener`** (the hook, written to preach — skippable for a part-two/dense text per Merida); **`scripture_reading`** (bridge into the text + MPT/MPS); **`expectation`** (what the sermon will ask) | **[M / + — re-asks the Frame Intro decisions as prose]** |
| Transitions (`transitions`) | **`transitions`** — one bridge into each point and one into the conclusion; brief, inconspicuous, varied; reiterate the MPS lightly | **[M]** *(the board groups it under [M/+] with Intro/Conclusion; refined to [M] here — Transitions is genuinely new prose, not a Frame re-ask)* |
| Conclusion (`conclusion`) | **`response`** — the summation (fresh words, not a recap) + the response (from MPS, gospel-empowered from the Christ-Connection Statement), carried to the chosen closing posture | **[M / + ]** |

*Phase-2 structural note:* the **Frame → Manuscript split doubles the count** — Frame
decides Intro/Conclusion moves, Manuscript re-asks them as prose. Whether that's the right
shape, or a doubling to consolidate, is a Phase-2 question **[⚠]**.

---

## 5. The completeness policy

"Is the sermon done?" is answered by **eleven load-bearing artifacts**: the four Study named
outcomes, the Main Point Pair as its two halves (MPT + MPS), the Sermon Outline, the Sermon
Body, the Sermon Frame as its two halves (Introduction + Conclusion), and the Manuscript.
(Two single named outcomes each split into two completeness artifacts; Outline and Body each
count once.) The answer **informs, never blocks** (Process #1: no walls). It is shown at the
Finish screen with per-artifact "go write it" jumps, and at lower weight on the map.

### The eight composites *(ratified — SFDI / SADI)*

An artifact is complete when its composite returns no reason:

| Named outcome | Complete when |
|---|---|
| Observation Set | The Divisions canvas has ≥1 main sentence with an indented modifier under it. |
| Interpretation Set | **Every** thought unit has a Meaning **and** the whole-passage meaning paragraph is written. |
| Christ-Connection Statement | **Every** thought unit has a Christ-Connection **and** the Statement paragraph is written. |
| Implications Synthesis | **Every** thought unit has an Implication **and** the Synthesis paragraph is written. |
| Main Point of the Text | `draft` and `tighten` both written. |
| Main Point of the Sermon | `translate` and `tighten` written; `gospel_check` written **or** marked N/A. |
| Sermon Frame — Introduction | `hook`, `bridge_to_text`, `expectations` written; `redemptive_note` written **or** marked N/A. |
| Sermon Frame — Conclusion | All four written; no N/A path. |

*One asymmetry to note:* the Observation Set is the only outcome whose **surfaced artifact**
and **done-check** live in different fields — the Study → Anchor handoff renders the **Obvious
Point** as the Observation Set, while its completeness gate checks the **Divisions canvas**.

### The three lenient checks *(DRAFT — not ratified composites)*

Outline, Body, and Manuscript use deliberately lenient presence checks — "honest without
nagging," tighten later if the OEM walk decides to:

- **Sermon Outline** — ≥1 outline point with text.
- **Sermon Body** — ≥1 functional element written under any point.
- **Manuscript** — ≥1 Introduction answer **and** the Conclusion response.

### The N/A policy *(ruled 2026-06-14 — Re-Foundation Phase 1, examination 1)*

1. **A named outcome can never be N/A.** The synthesis/statement questions that *are* the
   named outcomes — `meaning_whole`, the Christ-Connection Statement, both syntheses, and the
   MPT/MPS `tighten` questions that feed the Word export — carry no N/A escape. This is the
   hard constraint, not subject to the ruling below.
2. **An honest "nothing here / doesn't apply" counts as done.** The pastor ruled (examination
   1) that the completeness signal must never reward manufacturing a connection the text
   doesn't carry. So N/A means "the text genuinely doesn't carry this" or "satisfied another
   way" — an *active* gesture, never a silent skip — and it counts toward complete. It is
   available on: (a) the two anchor questions `mps.gospel_check` and `intro.redemptive_note`;
   (b) the **declared Study questions** SFDI grants it (Observe Where/When; Genre; Cross-
   References/Commentary; Redemptive Thread's four-ways; Implications Fields 1–2); and (c)
   **per thought-unit cell** on the three cumulative tables (Meaning / Christ-Connection /
   Implication) — a unit marked "nothing here" satisfies its column. The named-outcome
   paragraphs in rule 1 are excluded throughout.
3. **Enforcement and timing.** N/A is enforced three-deep (field-def flag · UI toggle ·
   write-path guard). **At HEAD the shipped code still allows N/A on only the two anchor
   questions** — restoring the Study-question and per-cell gesture (the SFDI grants and a
   per-cell table toggle) is a scoped code change tracked separately, not yet built. This
   section states the *ruled target*; the code follows behind it.

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
**Resolved by the examination-1 ruling:** a unit may be marked "nothing here" per cell and
still count complete (N/A policy rule 2c above), so the gate no longer forces a manufactured
entry on a unit the text leaves bare. The whole-passage synthesis paragraph still must be
written (rule 1). The per-cell toggle's build is scheduled; until it ships the code still
requires a filled cell, so this records the ruled target. The **[◆]** tags in §2 remain as
Phase-2 *Merida-fidelity* annotations on the questions themselves — a separate matter from
this completeness ruling.

---

## 6. The handoffs

Each sub-phase opens against the prior named outcome. The boundary frame is generated from
the walk order — **"X opens, against the Y"** — naming the substrate the new region builds
on, with no claim that the prior region is *closed* (free navigation means it may not be).

- **Within Study and within Assembly:** the first field of each new sub-phase carries the
  one-line frame (e.g. *"Interpret opens, against the Observation Set."*).
- **Study → Anchor (the big seam):** a discrete handoff landing screen, re-readable, which
  **renders the passage** (the marinate return-to-text) and frames the forge as opening
  **against all four Study outcomes**, not only the Implications Synthesis:
  *"Anchor opens, against your Study work."*
- **Sermon completion:** the Finish threshold — the artifact review (§5), Export to Word,
  and Mark as preached. Summoned, never automatic; re-openable forever.

---

## 7. Open seams (what Phase 2 settles)

Recorded so canon is honest about what is *not* yet frozen:

1. **The N/A code build** — the N/A *policy* is ruled and lives in §5 (an honest "doesn't
   apply" counts as done; the named-outcome paragraphs stay no-N/A). The shipped app still
   enforces the two-question allowlist, so restoring the per-question / per-cell gesture is a
   scheduled code change — not a Phase-2 Merida question.
2. **DRAFT pedagogy** — Outline / Equip / Manuscript are not preacher-walked; their
   prompts and lenient checks may tighten after the OEM content walk.
3. **Two provisional named-outcome names** — "Sermon Outline" and "Sermon Body" (RW1) were
   never SFDI/SADI-ratified.
4. **The Merida flags** (all **[+] / [◆] / [⚠] / [✂]** above) — Phase-2 surgery input.
   Lowest-cost-first order is set in the working board's Phase 2 section; the headline is
   MPS → fallen-condition-focus (the biggest drift).

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
