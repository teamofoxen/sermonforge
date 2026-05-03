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
- The existing `legacy_notes` escape pattern in `parseStructuredField` absorbs pre-migration data (free-text blobs).

### Empty-evidence gate

- **Default baseline:** "Field has any answer" satisfies today's empty-evidence rule (any one question answered counts as field-non-empty).
- **Per-field override (SFDI rules):** SFDI may declare *all* questions in a field required (the field becomes load-bearing in a structural sense), or specific questions optional. Per-question requirements extend `evaluateAdvance` in `src/utils/studyAdvancement.js` without UI changes.

### Vocabulary

- *Field* — the unit of work (existing canonical term).
- *Question* — an ordered prompt inside a field (new canonical term).
- *Answer* — what the pastor writes for each question.

### Structured-exercise questions

Most questions in a field are text prompts answered in a textarea. Some questions are **structured exercises** — a canvas the pastor works inside, not a textarea they write into. Field 4 (Divisions / Thought Units) is the first walked example: its Q1 is an indented sentence-layout canvas; its Q2 is a small follow-up table that references line numbers from Q1.

The Field Pattern accommodates both. A field's question sequence may be any mix of text-prompt questions and structured-exercise questions. The "Next question" gating, the persistent prior-answer visibility, and the per-field empty-evidence override apply to either kind. The structured editor itself — Tab/Shift+Tab indent behavior, line-numbered gutter, level markers, paste-intercept, peripheral reference panel — is SPRD/Component-1 implementation work; SFDI declares only that the pattern *allows* the kind, not how it renders.

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

**Status:** Ratified 2026-05-03.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `sentence_layout` | Type the passage by hand. Pull each subject and main verb to the left margin. Indent modifiers under what they modify. Re-align coordinate clauses to the column of their coordinate. |
| 2 | `divisions` | Where does one main sentence end and the next begin? What signals each break? |

**Seven-slot entry:**

- **Name:** Divisions / Thought Units. The slash-pair earns its place — *Thought Units* names the groups, *Divisions* names the boundaries between them. Two sides of the same operation.
- **Intent:** The spine-finding field. The pastor types the passage by hand and lays out its sentence-level structure. The slowness is the point — typing by hand begins the marination and forces structural attention. SermonForge removes friction from hard work; it does not make hard work easy. What surfaces here becomes the spine of the sermon's outline. The expository commitment underneath: **the point of the text is the point of the sermon**. The work toward MPT and MPS starts here.
- **Question sequence:** Sentence Layout → Divisions.
- **What gets written:** Q1 produces an indented document — each line carries structural depth (level 0–N), with main sentences at the left margin and modifiers indented under what they modify. Q2 produces a small list of break locations (referenced by Q1's line numbers) and the signals (connective, subject change, scene change, genre marker) that mark each break.
- **Role in sub-phase:** Fourth field. The spine-finding field — the load-bearing structural pass that turns the surface report into a propositional skeleton. Strong candidate for load-bearing at the Observe → Interpret threshold.
- **Connects from:** Surface Questions — having reported the passage's surface (where, when, how), now find the spine that holds it up.
- **Connects to:** Notable Commands — having found the spine, look at the imperatives that drive each main sentence.

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

**Vocabulary inside the field:** plain language ("main sentence," "supporting sentence") carries the user-facing surface; precise grammatical terms (subject, main verb, modifiers, coordinate clauses) live in the instruction bar and reference panel where precision is the panel's job. The field label "Divisions / Thought Units" is preserved.

**Per-field empty-evidence override:** Both questions required to advance. Q1 satisfied when the canvas has at least one main sentence (level 0) with at least one indented modifier under it; Q2 satisfied when the divisions table has at least one non-empty row.

**Implementation pattern:** Field 4's Q1 is a structured-exercise question (see "Structured-exercise questions" in the Field Pattern). The structured editor (Tab/Shift+Tab structural indent, auto-generated gutter, level-0 visual marker, paste-intercept, peripheral reference panel, composite gating) is SPRD Component-1 implementation work.

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
