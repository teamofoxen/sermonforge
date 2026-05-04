# Study Field Definition Initiative — Working Document

**Status:** Active. Phase 1 (Observe) walk in progress.
**Last touched:** 2026-05-03.
**Charter:** [`sfdi-charter.md`](./sfdi-charter.md) — the why, the boundaries, the approach.
**Vision sheet:** [`sfdi-throughline-vision.md`](./sfdi-throughline-vision.md) — the throughline arc kept in view during walks.
**Merida cross-reference:** `memory/project_cce_merida_source.md` — the source SermonForge's Study structure was built from.
**Field-state source of truth (today):** `src/utils/studyFields.js` — current `OBSERVE_FIELDS`, `INTERPRET_FIELDS`, `REDEMPTIVE_FIELDS`, `IMPLICATIONS_THEOLOGICAL`, `IMPLICATIONS_PERSONAL`.

---

## The Field Pattern

A **field** is an isolated focused workspace containing one or more **questions** in an ordered sequence. The pattern below is canonical for every SermonForge Study field across all four sub-phases.

### Shape

- The field is **spotlighted** when active — expanded to the focused work area; sibling fields recede or collapse so the pastor is *in* one field at a time, not surveying an inventory.
- Questions are **sequential and progressive** — only the current question is presented for answering; prior answers in the same field stay visible (above or beside).
- A **"Next question"** affordance advances to the next question in the sequence. It is **disabled** until the current answer is non-empty (mirrors Q3 hard-gate UX one resolution down).
- A **"Question N of M"** indicator shows position within the field.
- When the last question is answered the field is **complete**. All answers stay visible and editable; the pastor moves to the next field.
- Re-entering an answered field opens it expanded with all answers visible. Clicking any answer returns to edit mode for that question without stepping through the others.

### Storage

- Same JSON columns (`observations`, `interpretation`, `redemptive_thread`, `implications`) — no schema change.
- Each field's value becomes a sub-object keyed by stable question identifiers: `{question_key_1: "answer", question_key_2: "answer", ...}`.
- For text-prompt questions, the answer is a string. For structured-exercise questions, the answer is a **structured list** — shape depends on the exercise. Field 4 establishes three shapes: `[{text, depth, kind}, ...]` for the indented sentence canvas, `[{main_sentence_id, paraphrase}, ...]` for the paraphrase blocks, and `[{thought_unit_summary, after_line, signal}, ...]` for the divisions / thought-unit table. The structured-list decision was settled 2026-05-03; downstream AI prompts read these lists as outlines, not as opaque strings.
- The existing `legacy_notes` escape pattern in `parseStructuredField` absorbs pre-migration data (free-text blobs).

### Empty-evidence gate

- **Default baseline:** "Field has any answer" satisfies today's empty-evidence rule (any one question answered counts as field-non-empty).
- **Per-field override (SFDI rules):** SFDI may declare *all* questions in a field required (the field becomes load-bearing in a structural sense), or specific questions optional. Per-question requirements extend `evaluateAdvance` in `src/utils/studyAdvancement.js` without UI changes.
- **Composite gating per question.** A question's "answered" check can be more than non-empty — it can require structural conditions on the answer. Field 4's Q1 satisfies when the canvas has at least one main sentence (level 0) with at least one indented modifier under it; Q2 satisfies when every paraphrase field is non-empty; Q3 satisfies when the thought-unit table has at least one complete row. The "Continue" button on the last question consults all questions' gates in composite. A **hover-checklist** on the disabled button surfaces which gate is unmet so the pastor isn't guessing.

### Vocabulary

- *Field* — the unit of work (existing canonical term).
- *Question* — an ordered prompt inside a field (new canonical term).
- *Answer* — what the pastor writes for each question.

### Structured-exercise questions

Most questions in a field are text prompts answered in a textarea. Some questions are **structured exercises** — a working surface the pastor operates inside rather than a textarea they write into. Three sub-shapes are walked in Field 4:

1. **Indented sentence canvas (Field 4 Q1).** The pastor types the passage by hand. Tab / Shift+Tab change the line's structural depth (0–N). A peripheral reference panel beside the canvas surfaces genre-specific tips. An auto-generated line-number gutter; a level-0 visual marker on left-margin lines.
2. **Paraphrase blocks (Field 4 Q2).** Each main sentence (level-0 line + its modifiers) from Q1 is presented as a read-only block, with a paraphrase field beneath it for the pastor's own-words rewrite. The original blocks stay visible while the pastor types into each paraphrase field.
3. **Synthesis table (Field 4 Q3).** A multi-column table where the pastor names the meaningful artifact directly. Field 4's table is three columns: Thought unit (pastor's own-words summary), After line (autocomplete from canvas line numbers), Signal (free text). The Thought-unit cell is hand-written by the pastor — **no AI summarization in this cell**. AI may read the result downstream; AI does not generate it.

A field's question sequence may be any mix of text-prompt and structured-exercise questions. The "Next question" gating, the persistent prior-answer visibility, and the per-field empty-evidence override apply to either kind.

**Per-question paste rules.** A question may declare paste as **blocked** or **allowed**. Field 4 establishes the precedent: Q1 (canvas) blocks paste because the typing-by-hand IS the discipline; Q2 (paraphrase blocks) blocks paste because rewriting in the pastor's own words IS the discipline; Q3 (synthesis table) allows paste because synthesis is the discipline and the pastor may legitimately bring notes from elsewhere into the work — the AI block is the load-bearing constraint here, not paste.

The structured editor itself — Tab/Shift+Tab indent behavior, line-numbered gutter, level markers, paste-intercept, peripheral reference panel, paraphrase-block layout, synthesis-table cells — is SPRD/Component-1 implementation work; SFDI declares only that the pattern *allows* each sub-shape, not how it renders.

### Field intro overview

For **heavy-lifting fields** — fields whose work is theologically substantive enough that the pastor needs the framing established before the questions begin — the field opens with a pre-question **overview screen**. The overview names what the field is for, why it matters for the sermon, and what work the pastor is about to do. After reading, the pastor clicks Begin and the questions open.

The overview is shown only on **first entry** to the field for a given sermon. On re-entry (a sermon the pastor has worked before, returning to the field), the overview is skipped — the work is already there, per the re-entry behavior in Shape above.

Not every field needs an overview. Most fields' framing lives in their question heading and the SFDI seven-slot entry. The overview is reserved for fields where the framing has to land before the work makes sense — typically the spine-finders, the synthesis fields, the load-bearing fields. Field 4 is the first walked example. Other heavy-lifting fields will be marked as the SFDI walks proceed.

### Where this lives structurally

- **SFDI** defines the question sequence per field — this document.
- **SPRD** ships the spotlight + sequential-questions + persistent-prompts UX as Component 1 of the **Isolated-World Workspace UX overhaul** (the larger SPRD structural backlog item — Components 2 and 3 are the sermon-level app-takeover and the throughline visualization). See `docs/PROPOSALS/study-phase-redesign.md` → "Isolated-World Workspace UX overhaul" for the full umbrella commitment. Sequenced after the Implications restructure lands.

---

## The SFDI walk entry — seven slots

Every per-field walk produces a structured entry with seven slots:

1. **Name** — the canonical field name.
2. **Intent** — what the field is for, in one or two sentences.
3. **Question sequence** — the ordered list of questions inside the field. Each question has a stable key (for storage) and a prompt (the text the pastor sees).
4. **What gets written** — what the pastor writes in each question's answer slot.
5. **Role in sub-phase** — where this field sits in the sub-phase's flow and what work it carries.
6. **Connects from** — what the prior field hands into this one (or "nothing" for the first field of a sub-phase).
7. **Connects to** — what this field hands into the next one.

---

## Phase 1: Observe

### Field order (revised — 11 fields)

1. **Background** *(new)*
2. **Context**
3. **Surface Questions** *(new)*
4. Divisions / Thought Units
5. Notable Commands
6. Notable Statements
7. Main Characters
8. Big Ideas
9. Obvious Point
10. Basic Outline
11. Possible Implications

The "outside-in" arc through the first four fields: world around the book (Background) → where in the book (Context) → what's in the passage at the surface (Surface Questions) → how the passage is structured (Divisions).

---

### Field 1 — Background *(new)*

**Status:** Ratified 2026-05-03.

**Question sequence (from Merida's named items):**

| # | Key | Prompt |
|---|---|---|
| 1 | `author` | Who wrote this book? |
| 2 | `date` | When was it written? |
| 3 | `audience` | Who was the original audience, and what occasion prompted the writing? |
| 4 | `genre` | What kind of literature is this? |

**Seven-slot entry:**

- **Name:** Background
- **Intent:** Establish the world the book was written into — the historical and literary frame the passage stands inside.
- **Question sequence:** Author → Date → Audience & Occasion → Genre.
- **What gets written:** Factual answers grounded in introductory study. Light each week when teaching consecutively through a book — the same answers carry forward.
- **Role in sub-phase:** First field. Sets the world the book was written into before locating the passage inside it.
- **Connects from:** Nothing (first field of Observe). Opens against the passage and its book.
- **Connects to:** Context — having framed the book, locate the passage inside it.

**Inheritance ruling (2026-05-03):** Series-level — option (b). The series carries the book's Background; each sermon inherits and can override. Matches Merida's "less needed each week" cadence. Implementation is SPRD structural work (data model for series-level Background entry + UI surface + per-sermon override mechanism) — to be added to the SPRD structural backlog.

---

### Field 2 — Context

**Status:** Ratified 2026-05-03.

**Question sequence (pastor's voice 2026-05-02; keys confirmed 2026-05-03):**

| # | Key | Prompt |
|---|---|---|
| 1 | `before` | What happened before this passage? |
| 2 | `after` | What happens after? |
| 3 | `impact` | Do those answers impact what's happening in this passage? If so, how? |
| 4 | `holy_spirit_intent` | Why do you think the Holy Spirit led the author to write (a) this passage, (b) in this place? |

**Seven-slot entry:**

- **Name:** Context
- **Intent:** Locate the passage inside the book — see what flanks it, name how that bearing shapes the passage, surface why the Holy Spirit placed it here.
- **Question sequence:** Before → After → Impact → Holy Spirit Intent.
- **What gets written:** Q1–2 describe the flanking material; Q3 names how the flanks bear on the passage; Q4 takes the synthesizing why-this-here step.
- **Role in sub-phase:** Second field. Locates the passage inside the world Background framed.
- **Connects from:** Background — having framed the world the book sits inside, Context locates the passage inside the book.
- **Connects to:** Surface Questions — having located the passage, stand on its surface and report what's there.

---

### Field 3 — Surface Questions *(new)*

**Status:** Ratified 2026-05-03 — option (c), Where/When/How subset.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `where` | Where does this take place? |
| 2 | `when` | When does this take place? |
| 3 | `how` | How does this unfold? |

**Seven-slot entry:**

- **Name:** Surface Questions
- **Intent:** Stand on the surface of the text and report basic situational facts before structural or analytical work begins.
- **Question sequence:** Where → When → How.
- **What gets written:** Brief reportorial answers grounded in what the text says, not interpretation. Genre-uneven: narrative passages fill all three cleanly; epistle/wisdom may legitimately N/A on Where/When (handled by the per-field N/A escape valve).
- **Role in sub-phase:** Third field. Surface read of the text after Context located it; the reportorial sweep before structural and analytical fields take over.
- **Connects from:** Context — having located the passage in the book, stand on its surface and report what's there.
- **Connects to:** Divisions / Thought Units — having reported the surface, now look at how the page is structured.

**Overlap resolution:** option (c) drops Who/What/Why because they overlap downstream fields (Main Characters / Big Ideas / Obvious Point). The deeper Who/What/Why work happens in those dedicated fields; Surface Questions stays reportorial. Resolves the end-of-Observe "overlap to address" open item at the field level.

---

### Field 4 — Divisions / Thought Units

**Status:** Ratified 2026-05-03 in **three-question shape**. Initial two-question ratification was expanded the same day to insert Q2 (paraphrase) between the original Q1 (sentence layout) and the original Q2 (now Q3, find thought units with summarization).

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `sentence_layout` | Type the passage by hand. Pull each subject and main verb to the left margin. Indent modifiers under what they modify. Re-align coordinate clauses to the column of their coordinate. |
| 2 | `paraphrases` | Take each main sentence — every left-margin line you laid out above — and rewrite it in your own words. Translation, not summary. |
| 3 | `thought_units` | Look at the main sentences above. For each thought unit you find, write what the author is hammering home (in your own words), mark the line where it ends, and name what makes the seam — a subject shift, a "But..." that pivots, a scene change. |

**Seven-slot entry:**

- **Name:** Divisions / Thought Units. The slash-pair earns its place — *Thought Units* names the groups, *Divisions* names the boundaries between them. Two sides of the same operation.
- **Intent:** The spine-finding field, then the meaning-translating field, then the bones-naming field. Q1 surfaces the passage's structure visually. Q2 forces the pastor to engage with each main sentence on its own terms by rewriting it in their own voice. Q3 groups the main sentences into thought units and names what each one is hammering home. The expository commitment underneath: **the point of the text is the point of the sermon**. The work toward MPT and MPS starts here.
- **Question sequence:** Sentence Layout → Rewrite each main sentence → Find the thought units.
- **What gets written:** Q1 produces an indented document — each line carries structural depth (level 0–N), with main sentences at the left margin and modifiers indented under what they modify. Q2 produces one paraphrase per main sentence in the pastor's own voice. Q3 produces a small table of thought units — for each, the pastor's own-words summary, the line where it ends, and the signal that marks the seam to the next thought unit.
- **Role in sub-phase:** Fourth field. The spine-finding-and-meaning field — the load-bearing work that turns the surface report into a propositional skeleton with the meaning of each main sentence held in the pastor's own voice. Strong candidate for load-bearing at the Observe → Interpret threshold.
- **Connects from:** Surface Questions — having reported the passage's surface (where, when, how), now find the spine that holds it up.
- **Connects to:** Notable Commands — having found the spine and named the thought units, look at the imperatives that drive each main sentence.

**Heavy-lifting field — opens with an overview** (see Field intro overview in the Field Pattern). Pastor-side copy:

> ## Divisions / Thought Units
> *Field 4 of 11 · Observe*
>
> The point of the sermon is the point of the text. The work of seeing what that point is starts here.
>
> Before you can preach the passage, you have to see how it's built. Which sentences carry the main weight. What's supporting them. Where one move ends and the next begins. How the passage flows.
>
> You're not building an outline. You're laying the foundation any outline will rest on. The bones of the passage are already there. Your job in this field is to make them visible.
>
> Three parts:
> 1. Lay the passage out so the structure shows.
> 2. Rewrite each main sentence in your own words.
> 3. Find the thought units that anchor the passage.
>
> [ Begin ]

**Q1 framing (above the canvas):**

> ## Question 1 of 3 — Lay the passage out
>
> Main sentences to the left margin. Supporting words indented under them. As the structure surfaces, the bones of the passage start to show — and with them, the foundation any outline will rest on.

**The three rules (the operation Q1 performs):**

1. **Subject + main verb** → pulled to the left margin. The spine of the clause.
2. **Modifiers** (adjectives, adverbs, prepositional phrases, subordinate clauses) → indent under what they modify.
3. **Coordinate clauses** ("and," "but," "or") → re-align to the column of their coordinate. Same indent level as their peer.

Clarifier: *main verb* = the finite verb (carries tense, head of the clause). Participles, infinitives, and gerunds are modifiers.

**Quick outline tips — genre-specific application of the three rules:**

The three rules are the operation across all genre. The reference panel beside the canvas surfaces genre-specific application tips:

*For epistles* — the three rules above, applied as written. Long sentences with cascading modifier chains; coordinate clauses joined by "and," "but," "or."

*For narrative* —

1. Each main action → left margin. Most narrative clauses are actions; expect many lines at the margin.
2. Description and character info ("who was a Pharisee," "now there was a famine") → indent under what they describe.
3. Dialogue → indent under the speech verb. "He said" stays at the margin; the words spoken indent under it.

*For poetry* — deferred for a future iteration.

**Q2 framing (above the paraphrase blocks):**

> ## Question 2 of 3 — Rewrite each main sentence
>
> Take each main sentence — every left-margin line you laid out above — and rewrite it in your own words.
>
> Translation, not summary. One sentence in your voice for each one in the text. Don't compress, don't combine, don't skip ahead. The work pulls each sentence fresh into your hearing for this sermon, even on a passage you know cold.

Q2's screen shows each main sentence (the level-0 line + its modifiers) as a read-only block, with a paraphrase field beneath each block. The pastor types their version into each. Tab moves between paraphrase fields. Paste blocked.

**Q3 framing (above the thought-unit table):**

> ## Question 3 of 3 — Find the thought units
>
> Put yourself in the original hearer's shoes. What is the author actually hammering home? If this passage were stripped to its bones, what would those bones be?
>
> Each one is a *thought unit* — a single thing the author wants the hearer to receive. The words around it are there to make it land.
>
> Look at the main sentences above. Some of them carry a thought unit; others are supporting work for one that started earlier. For each thought unit you find:
>
> - **Write what the author is hammering home, in your own words.** A short sentence. Not a phrase clipped from the passage — your own.
> - Mark the line where it ends.
> - Name what makes it a seam — a subject shift, a "But..." that pivots, a scene change.
>
> What you produce here is the foundation any outline will rest on.

Q3's screen shows the synthesis table: three columns (Thought unit | After line | Signal). The Thought-unit cell is hand-written by the pastor — **no AI summarization in this cell, ever**. Paste is allowed in this question; the AI block is the load-bearing constraint, not paste.

**Vocabulary inside the field:** plain language ("main sentence," "supporting sentence," "thought unit") carries the user-facing surface; precise grammatical terms (subject, main verb, modifiers, coordinate clauses) live in the instruction bar and reference panel where precision is the panel's job. The field label "Divisions / Thought Units" is preserved.

**Per-field empty-evidence override (composite over three questions):** all three required to advance.

- **Q1:** the canvas has at least one main sentence (level 0) with at least one indented modifier under it.
- **Q2:** every paraphrase field has content.
- **Q3:** the thought-unit table has at least one complete row (Thought unit + After line filled; Signal is allowed empty for the final thought unit of a passage, since nothing comes after it).

The "Continue to Notable Commands" button activates only when all three gates are met. A hover-checklist on the disabled button surfaces which gate is unmet.

**In-workspace behavior:**

- **Q1 → Q2 → Q3 transitions** all editable from when each question's gate is met (Option B from session walk). The pastor toggles between the canvas, the paraphrase blocks, and the thought-unit table at their own pace. The questions feed each other in real time — laying out Q1 surfaces Q3 questions; rewriting Q2 surfaces refinements to Q1.
- **Q3's table visible-but-greyed at State 0.** Tells the pastor what's coming before the canvas work satisfies Q1's gate.
- **Continue button label:** "Continue to Notable Commands" — names the throughline at the moment of commit.
- **Throughline node summary on completion:** the pastor's own-words thought-unit sentences, listed with line ranges. Example for Eph 2:1–5 — "(1) Without Christ, we were spiritually dead. *(lines 1–7)* / (2) The death wasn't isolated — every one of us was under wrath. *(lines 8–12)* / (3) But God acted. He made us alive in Christ. *(lines 13–18)*". The number of items equals the number of thought units the pastor named in Q3.

**Implementation pattern:** All three of Field 4's questions are structured-exercise questions (see "Structured-exercise questions" in the Field Pattern). Q1 uses the indented sentence canvas sub-shape; Q2 uses the paraphrase blocks sub-shape; Q3 uses the synthesis table sub-shape. Tab/Shift+Tab structural indent on Q1, auto-generated line-number gutter, level-0 visual marker, paste-intercept on Q1 and Q2 (allowed on Q3), peripheral reference panel for Q1, composite gating, line-number autocomplete in Q3's "After line" cell, and the field intro overview pattern are all SPRD Component-1 implementation work.

---

### Fields 5–11

Not yet walked. In current `OBSERVE_FIELDS` order:

- Notable Commands
- Notable Statements
- Main Characters
- Big Ideas
- Obvious Point
- Basic Outline
- Possible Implications

**Forward-looking note from Field 4's ratification:** Field 4 surfaces the propositional spine of the passage. Fields 5–8 (Notable Commands, Notable Statements, Main Characters, Big Ideas) read against that spine — each examines *what kind of work* the main sentences are doing. Notable Commands looks for the imperatives that drive them; Notable Statements for the indicatives; Main Characters for the subjects acting through them; Big Ideas for the conceptual weight they carry. When each field is walked, its connects-from line should orient against the spine Field 4 produces, not against the passage in raw form.

---

### Open items for the end-of-Observe within-sub-phase flow pass

When all 11 Observe fields have per-field entries, the within-sub-phase flow pass takes a holistic look. Items already on the list:

- **Reshape decisions:** any rename / merge / split / move / retire surfaced during per-field walks.
- **Named outcome:** articulate the **Observation Set** — what it IS, how the 11 fields compose into it.
- **Load-bearing fields:** which fields the empty-evidence threshold rests on at the Observe → Interpret boundary. **Field 4 (Divisions / Thought Units) is a strong candidate as of its 2026-05-03 ratification** — its spine-finding role makes the Observation Set without it largely incoherent.

---

*End of working document. Phases 2–4 (Interpret, Redemptive Thread, Implications) are not yet walked.*
