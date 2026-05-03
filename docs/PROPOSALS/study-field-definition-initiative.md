# Study Field Definition Initiative — Working Document

**Status:** Active. Phase 1 (Observe) walk in progress.
**Last touched:** 2026-05-02.
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
- **SPRD** ships the spotlight + sequential-questions + persistent-prompts UX as a structural change to the Study workspace. Tracked in the SPRD planning doc as a structural backlog item, sequenced after the Implications restructure lands.

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

**Status:** Draft. Awaiting ratification of question sequence + inheritance ruling.

**Proposed question sequence (from Merida's named items):**

| # | Key | Prompt |
|---|---|---|
| 1 | `author` | Who wrote this book? |
| 2 | `date` | When was it written? |
| 3 | `audience` | Who was the original audience, and what occasion prompted the writing? |
| 4 | `genre` | What kind of literature is this? |

**Draft seven-slot entry:**

- **Name:** Background
- **Intent:** Establish the world the book was written into — the historical and literary frame the passage stands inside.
- **Question sequence:** Author → Date → Audience & Occasion → Genre.
- **What gets written:** Factual answers grounded in introductory study. Light each week when teaching consecutively through a book — the same answers carry forward.
- **Role in sub-phase:** First field. Sets the world the book was written into before locating the passage inside it.
- **Connects from:** Nothing (first field of Observe). Opens against the passage and its book.
- **Connects to:** Context — having framed the book, locate the passage inside it.

**Open: inheritance ruling.** Background is book-level, not passage-level. Three options pending pastor's decision:
- **(a) No inheritance** — pastor writes Background fresh for every sermon. Simple but high friction.
- **(b) Series-level Background** — series carries the book's Background; each sermon inherits and can override. Lower friction, matches Merida's "less needed each week."
- **(c) Defer** — capture per-sermon now; design series-level inheritance as a SPRD structural follow-up after SFDI ships into structure.

---

### Field 2 — Context

**Status:** Question sequence known (pastor's voice, 2026-05-02). Awaiting formalization under the field pattern.

**Question sequence (from pastor):**

| # | Key | Prompt |
|---|---|---|
| 1 | `before` | What happened before this passage? |
| 2 | `after` | What happens after? |
| 3 | `impact` | Do those answers impact what's happening in this passage? If so, how? |
| 4 | `holy_spirit_intent` | Why do you think the Holy Spirit led the author to write (a) this passage, (b) in this place? |

**Pending under new pattern:**
- Formalize the seven-slot entry with Connects-from = Background (was "nothing" before Background was added).
- Confirm question keys.

---

### Field 3 — Surface Questions *(new)*

**Status:** Placeholder. Not yet walked under the new pattern.

**Initial framing (from earlier in session):** stand on the surface and report — Who? What? Where? When? Why (the stated cause in the text)? How? Today's pre-pattern proposal had this as a single question with the W-battery as the hint. Under the field pattern, candidates include: a single question with all six W's; six separate questions (one per W); or the Where/When/How subset only (since Who/What/Why overlap existing fields). To be settled when walked.

---

### Fields 4–11

Not yet walked. In current `OBSERVE_FIELDS` order:

- Divisions / Thought Units
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

- **Overlap to address:** Surface Questions' Who? / What? / Why? overlaps Main Characters / Big Ideas / Obvious Point. Options at flow-pass time: leave the overlap (each field hits a different angle), tighten hints to deconflict, or merge.
- **Reshape decisions:** any rename / merge / split / move / retire surfaced during per-field walks.
- **Named outcome:** articulate the **Observation Set** — what it IS, how the 11 fields compose into it.
- **Load-bearing fields:** which fields the empty-evidence threshold rests on at the Observe → Interpret boundary.
- **Inheritance ruling for Background** (if not settled at Field 1).

---

*End of working document. Phases 2–4 (Interpret, Redemptive Thread, Implications) are not yet walked.*
