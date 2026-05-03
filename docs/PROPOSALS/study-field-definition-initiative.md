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

**Status:** Walk in progress 2026-05-03. Awaiting ruling on shape (one question vs two) and on the label question.

**Current code state** (`OBSERVE_FIELDS[1]` in `src/utils/studyFields.js`): label `Divisions / Thought Units`, single hint "What are the main divisions or thought units of the passage?"

**Merida cross-reference:** "How does the passage break up? How many parts?"

**Two shape options under consideration:**

- **(a) One question** — keep current shape. `divisions` — "What are the main divisions or thought units of the passage? Name each part and what signals each break."
- **(b) Two questions** — split structural identification from textual evidence.
  - `divisions` — "Identify the main divisions or thought units. Name each part and where it begins/ends."
  - `signals` — "What signals each break? (transition words, change in subject, character, setting, genre marker, etc.)"

**Recommendation:** (b). Two intellectual moves: feeling where the parts fall, then naming the textual evidence for the breaks. Splitting them adds discipline without bloat.

**Label question:** "Divisions / Thought Units" is a slash-pair label. Keep as-is, or rename (e.g., "Divisions", "Structure", "Thought Units")?

**Suggested throughline → Field 5 (Notable Commands):** Having seen the shape, look at the imperatives that drive the parts.

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

---

### Open items for the end-of-Observe within-sub-phase flow pass

When all 11 Observe fields have per-field entries, the within-sub-phase flow pass takes a holistic look. Items already on the list:

- **Reshape decisions:** any rename / merge / split / move / retire surfaced during per-field walks.
- **Named outcome:** articulate the **Observation Set** — what it IS, how the 11 fields compose into it.
- **Load-bearing fields:** which fields the empty-evidence threshold rests on at the Observe → Interpret boundary.

---

*End of working document. Phases 2–4 (Interpret, Redemptive Thread, Implications) are not yet walked.*
