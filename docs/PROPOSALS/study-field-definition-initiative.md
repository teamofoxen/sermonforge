# Study Field Definition Initiative — Working Document

> **Post-ARI status (2026-05-09):** SFDI closed before the AI Removal Initiative. Any AI-prompt / AI-affordance commitments in this document are historical — the AI subsystem was deleted in ARI Phase 8 (2026-05-09). The structural commitments (field shapes, named outcomes, handoffs, the seven-slot entry pattern, Process Contract #6) remain binding. Where the document says "AI prompts read X" or "AI may assist," read it as "the SpotlightWorksheet question flow surfaces X." See [`ai-removal-initiative.md`](./ai-removal-initiative.md) for the full initiative.
>
> **Post-workspace-restructure status (2026-05-10):** Study sub-phase content (the 25 fields, 4 named outcomes, 4 sub-phase boundary handoffs) is unchanged by the Workspace Restructure. The pre-restructure framing of "Step 1 (Exegesis)" inside a 4-step Study stage now maps directly to the entire Study top-level stage (Study is just Exegesis, with the same four sub-phases). Where the document says "Step 2 (MPT/MPS)" as the downstream consumer of Implications Synthesis, read it as "Assembly's Anchor sub-phase." See [`workspace-restructure-charter.md`](./workspace-restructure-charter.md).
>
> **Post-era-2 / post-invisible-system status (banner committed by the era-2 charter 2026-05-12; executed 2026-06-10 with invisible-system supersessions added):** Era-2 primacy rulings supersede the named SFDI rulings (see the era-2 charter's supersession list); all other rulings stand. The invisible-system rebuild (closed 2026-05-18) then replaced the Field Pattern's RENDERING mechanics: the "Question N of M" counter, the disabled-until-non-empty Next, the spotlight/collapse choreography, and pre-field overview screens are deleted surfaces — the writing surface (one field at a time, free Next/Back) and the map now carry what they carried. The Field Pattern's CONTENT commitments (question sequences, what gets written, the seven-slot entries, named outcomes, handoffs) remain binding. Do not rebuild the deleted mechanics from this document.
>
> **PENDING PASTOR RULING — N/A escape valve vs the 2026-06-10 allowlist (Test Q4 conflict, surfaced not resolved):** This document grants question- and field-level N/A across Study (Observe Where/When; Genre field-level; Cross-References/Commentary; RT's four ways-questions "Mark N/A where the text genuinely doesn't carry that kind of pointing"; Implications Fields 1–2; the Field 3 canvas short-circuit; "the composite gate respects per-question N/A flags"). The UX-overhaul Gate-0 ruling (2026-06-10) allowlisted N/A to exactly TWO questions — `intro.redemptive_note` and `mps.gospel_check` — and the shipped app now suppresses the toggle and drops `na:true` everywhere else. The two rulings conflict for Study. Code currently follows the newer ruling (legacy stored flags stay honored everywhere); this document's N/A grants are SUSPENDED for Study until the pastor rules: extend the allowlist to SFDI's declared questions, or amend the SFDI entries to match the two-question scope. Note the suppression also closed a real hole this document never intended: the old everywhere-toggle let named outcomes themselves (CCS statement, both syntheses) be N/A'd while still counting as answered.

**Status:** All four sub-phase walks complete (2026-05-03 → 2026-05-04). SFDI's structural completion test is satisfied: every field has a seven-slot entry, every sub-phase has a named outcome, every sub-phase boundary has a handoff articulation. Experiential completion is qualitative and tested in real sermon-prep use once SPRD Component 1 ships.
**Last touched:** 2026-05-03.
**Charter:** [`sfdi-charter.md`](./sfdi-charter.md) — the why, the boundaries, the approach.
**Orientation:** [`sfdi-charter.md`](./sfdi-charter.md) § Orientation — the throughline arc kept in view during walks.
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
- **Per-field override (SFDI rules):** SFDI may declare *all* questions in a field required (the field becomes load-bearing in a structural sense), or specific questions optional. Per-question requirements live in the surviving composite gate functions in `src/utils/studyAdvancement.js` (`checkField3Composite`, `checkField8Composite`, etc.). *(Note: the original SFDI articulation pointed at `evaluateAdvance`, the renderer-side advancement evaluator. That evaluator was deleted in the trail deletion sweep Phase F (2026-05-17) along with its `check*Threshold` wrappers; the composites it called survived as the completeness contract. The substantive rule — per-question requirements live in the composites — is unchanged.)*
- **Composite gating per question.** A question's "answered" check can be more than non-empty — it can require structural conditions on the answer. Field 3's unified canvas satisfies in three sub-checks: at least one main sentence (level 0) with at least one indented modifier under it; every main row carries a non-empty paraphrase; at least one row carries a `thought_unit_end` with a non-empty summary. The "Continue" button consults all sub-checks in composite. A **hover-checklist** on the disabled button surfaces which gate is unmet so the pastor isn't guessing.

### Vocabulary

- *Field* — the unit of work (existing canonical term).
- *Question* — an ordered prompt inside a field (new canonical term).
- *Answer* — what the pastor writes for each question.

### Structured-exercise questions

Most questions in a field are text prompts answered in a textarea. Some questions are **structured exercises** — a working surface the pastor operates inside rather than a textarea they write into. Two sub-shapes are walked in the SFDI as of 2026-05-05:

1. **Unified canvas (Field 3).** A single canvas where each row carries its structural text (depth 0–N), an inline paraphrase (per main row), and an optional thought-unit-end marker. Tab / Shift+Tab change the line's structural depth; an auto-generated line-number gutter and a level-0 visual marker mark left-margin lines. Beneath each main row's subtree the canvas renders an inline paraphrase textarea; to the right of each main subtree footer sits a "+ Mark as thought-unit end" affordance whose inline editor takes a summary + signal. When the summary is non-empty, the editor collapses to a soft cap line spanning the canvas footer with the summary in italic on the right margin. Per-row UUIDs (`crypto.randomUUID()`) are the merge key for cross-phase columns.
2. **Cumulative synthesis table (Phase 2 Field 8, Phase 3 Field 5, Phase 4 Field 4).** A multi-column table that extends the canonical thought-unit array Field 3 produced — read-only on the upstream columns (Thought unit | After line | Signal), writable on the cumulative column the current phase contributes (Meaning at Phase 2; Christ-Connection at Phase 3; Implication at Phase 4). The writable cell is hand-written by the pastor — **no AI summarization in any of these cells**. AI may read the result downstream; AI does not generate it.

A field's question sequence may be any mix of text-prompt and structured-exercise questions. The "Next question" gating, the persistent prior-answer visibility, and the per-field empty-evidence override apply to either kind.

**Per-question paste rules.** A question may declare paste as **blocked** or **allowed**. Phase 1 Field 3 (Divisions / Thought Units) establishes the precedent: paste is blocked in canvas-row textareas because the typing-by-hand IS the structural-layout discipline; paste is allowed in the inline paraphrase textareas because translation in the pastor's own voice can legitimately surface from elsewhere; paste is allowed in the thought-unit-end summary because synthesis is the discipline — the AI block on summary content is the load-bearing constraint here, not paste.

The structured editor itself — Tab/Shift+Tab indent behavior, line-numbered gutter, level markers, paste-intercept, inline paraphrase layout, thought-unit-end affordance + editor + filled-state cap line, synthesis-table cells — is SPRD/Component-1 implementation work; SFDI declares only that the pattern *allows* each sub-shape, not how it renders.

### Field intro overview

For **heavy-lifting fields** — fields whose work is theologically substantive enough that the pastor needs the framing established before the questions begin — the field opens with a pre-question **overview screen**. The overview names what the field is for, why it matters for the sermon, and what work the pastor is about to do. After reading, the pastor clicks Begin and the questions open.

The overview is shown only on **first entry** to the field for a given sermon. On re-entry (a sermon the pastor has worked before, returning to the field), the overview is skipped — the work is already there, per the re-entry behavior in Shape above.

Not every field needs an overview. Most fields' framing lives in their question heading and the SFDI seven-slot entry. The overview is reserved for fields where the framing has to land before the work makes sense — typically the spine-finders, the synthesis fields, the load-bearing fields. Phase 1 Field 3 (Divisions / Thought Units) is the first walked example. Other heavy-lifting fields will be marked as the SFDI walks proceed.

### PC progression markers

Each field in Phases 3 and 4 carries an explicit PC progression marker (e.g., **PC dormant** / **PC enters here** / **PC at full integration**) because PC's substance is progressing field-by-field in those phases. Phases 1 and 2 use phase-level PC progression articulated in their respective within-sub-phase flow passes, not per-field markers — most fields in those phases share a uniform PC state (Phase 1 fields are dormant except Field 9's awareness entry; Phase 2 fields are all marinating). The asymmetry reflects PC's actual progression shape, not field-level oversight. Heavy-lifting fields and named-outcome fields in any phase carry an explicit PC marker regardless, naming the field's PC role even if it's "dormant" or "marinating."

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

### Field order (revised — 8 fields)

1. **Context**
2. **Surface Questions** *(new — added 2026-05-03)*
3. Divisions / Thought Units *(unified-canvas shape, 2026-05-05)*
4. Main Characters *(reordered ahead of Commands and Declarations, 2026-05-03)*
5. Commands and Declarations *(merged from former Notable Commands + Notable Statements, 2026-05-03)*
6. Big Ideas
7. Obvious Point
8. Possible Implications

**Reshape from 11 to 9 to 8 fields:** Notable Commands + Notable Statements merged into Commands and Declarations (one binary classification, one synthesis table). Basic Outline retired; Field 3's thought units carry the proto-outline work into MPT/MPS and Step 3 (Construct an Outline). Main Characters reordered ahead of Commands and Declarations because pastoral attention notices subjects before classifying verbs. **Background field retired 2026-05-05** — the world-of-the-book layer (author / date / audience / genre) was carrying weight better placed in series-level Book Study (`book_background`, inheritable across a series) and in Phase 2's Genre field; making the pastor re-enter it per sermon was friction without proportionate exegetical gain.

The "outside-in" arc through the first three fields: where in the book (Context) → what's in the passage at the surface (Surface Questions) → how the passage is structured (Divisions). The lens cluster that follows (Main Characters → Commands and Declarations → Big Ideas) reads against Field 3's spine. Then the first synthesis (Obvious Point) and the bridge into Interpret (Possible Implications) close the segment.

---

### Field 1 — Background *(RETIRED 2026-05-05)*

**Status:** Ratified 2026-05-03; **retired 2026-05-05.**

This field was originally added as the first field of Observe, carrying the world-of-the-book layer (author / date / audience / genre) per Merida's "Background matters" note in Phase 1. The 2026-05-03 inheritance ruling (option b — series-level with per-sermon override) recognized that re-entering this content per sermon was friction; that ruling logically completed itself 2026-05-05 with the field's retirement. The substance now lives in two places that already exist:

- **Series-level Book Study** — the `book_background` column on series carries author / audience / occasion / historical setting / genre and is inheritable across every sermon in the series.
- **Phase 2 Genre field** — the literary-form lens that does interpretive work moves into Interpret as a light, optional field (`genre`) where it actually shapes how the dissection proceeds.

The retirement closes SPRD C4 (Background series-level inheritance) by obviating it. No production sermons exist 2026-05-05; old data carrying the `background` key stays in the JSON column (parseStructuredField preserves it) but no longer renders.

---

### Field 1 — Context *(formerly Field 2)*

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
- **Role in sub-phase:** First field. Locates the passage inside the book it sits in.
- **Connects from:** Nothing (first field of Observe). Opens against the passage and the book it sits in. Series-level Book Study (book_background) and any inherited series context provide ambient frame.
- **Connects to:** Surface Questions — having located the passage, stand on its surface and report what's there.

---

### Field 2 — Surface Questions *(formerly Field 3, new field 2026-05-03)*

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

### Field 3 — Divisions / Thought Units *(formerly Field 4)*

**Status:** Ratified 2026-05-05 in **unified-canvas shape**. Replaces the 2026-05-03 three-question shape (sentence_layout / paraphrases / thought_units) with a single canvas where each row carries its structural text plus inline paraphrase and an optional thought-unit-end marker. Implementation: Phase 4 Sprint 2 Sessions 1–5 (data layer + UI rebuild + cross-phase verification + tests + this rewrite).

**Heavy-lifting field — opens with a pre-field overview** (see Field intro overview in the Field Pattern).

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `canvas` | Type the passage by hand. Pull each subject and main verb to the left margin. Indent modifiers under what they modify. Re-align coordinate clauses to the column of their coordinate. |

**Seven-slot entry:**

- **Name:** Divisions / Thought Units. The slash-pair earns its place — *Thought Units* names the groups, *Divisions* names the boundaries between them. Two sides of the same operation.
- **Intent:** The spine-finding-and-meaning field. The pastor lays the passage out so its structure shows; rewrites each main sentence in their own voice inline beneath it; marks where each thought unit ends and what makes the seam. Three operations in one continuous canvas. The expository commitment underneath: **the point of the text is the point of the sermon**. The work toward MPT and MPS starts here.
- **Question sequence:** Single canvas — structure + paraphrase + thought-unit boundaries entered in one continuous flow.
- **What gets written:** A list of canvas rows. Each row carries its text, structural depth (level 0–N), and an id (UUID). Main rows (depth 0) additionally carry a paraphrase string in the pastor's own voice. Any main row may also carry a `thought_unit_end` marker — a `{ summary, signal }` pair naming the thought unit that ends after this main sentence and its modifiers. The materialized `thought_units` array (derived from canvas on save) is what Phase 2/3/4 cumulative-synthesis-tables consume cross-phase.
- **Role in sub-phase:** Third field. The spine-finding-and-meaning field — load-bearing work that turns the surface report into a propositional skeleton with the meaning of each main sentence held in the pastor's own voice. Load-bearing at the Observe → Interpret threshold.
- **Connects from:** Surface Questions — having reported the passage's surface (where, when, how), now find the spine that holds it up.
- **Connects to:** Main Characters — having found the spine and named the thought units, see who's acting in them.

**Pre-field overview (pastor-side copy):**

> ## Divisions / Thought Units
> *Field 3 of 8 · Observe*
>
> The point of the sermon is the point of the text. The work of seeing what that point is starts here.
>
> Lay the passage out so the structure shows. Rewrite each main sentence in your own words. Find the thought units that anchor it. The bones are already there — your job is to make them visible.
>
> [ Begin ]

**Field framing (above the canvas):**

> Type the passage by hand. Pull each subject and main verb to the left margin. Indent modifiers under what they modify. Re-align coordinate clauses to the column of their coordinate.
>
> Beneath each main sentence, rewrite it in your own voice. Translation, not summary. One sentence in your voice for each one in the text.
>
> Wherever a thought unit ends — a single thing the author wants the hearer to receive — mark the line and name it. A subject shift, a "But..." that pivots, a scene change. Your own words for what's hammering home.

**The three rules (the operation the canvas performs):**

1. **Subject + main verb** → pulled to the left margin. The spine of the clause.
2. **Modifiers** (adjectives, adverbs, prepositional phrases, subordinate clauses) → indent under what they modify.
3. **Coordinate clauses** ("and," "but," "or") → re-align to the column of their coordinate. Same indent level as their peer.

Clarifier: *main verb* = the finite verb (carries tense, head of the clause). Participles, infinitives, and gerunds are modifiers.

**Genre-specific application of the three rules:**

The three rules are the operation across all genres.

*For epistles* — the three rules above, applied as written. Long sentences with cascading modifier chains; coordinate clauses joined by "and," "but," "or."

*For narrative* —

1. Each main action → left margin. Most narrative clauses are actions; expect many lines at the margin.
2. Description and character info ("who was a Pharisee," "now there was a famine") → indent under what they describe.
3. Dialogue → indent under the speech verb. "He said" stays at the margin; the words spoken indent under it.

*For poetry* — deferred for a future iteration.

**Canvas mechanics:**

Each canvas row carries a stable id (`crypto.randomUUID()`). The id is the merge key for cross-phase columns: when the pastor edits the canvas — insert, delete, reorder — Phase 2/3/4 cumulative columns (Meaning, Christ-Connection, Implication) survive the edit by following the row's id, not its position.

Beneath each main row's subtree (the level-0 line + any modifiers indented under it) the canvas renders an inline paraphrase textarea. One paraphrase per main sentence; modifiers don't get their own. Paste is allowed in the paraphrase (translation work, not transcription).

To the right of each main row's subtree footer sits a "+ Mark as thought-unit end" affordance. Click expands an inline editor with two fields — summary (the pastor's own-words sentence for what the unit is hammering home) and signal (what makes the seam). When the summary is non-empty, the editor collapses to a filled state: a soft cap line spanning the canvas footer with the summary in italic on the right margin. Click the filled state to re-edit; click Remove inside the editor to clear the marker.

Paste is blocked in canvas-row textareas — typing-by-hand IS the structural-layout discipline. The paraphrase and unit-end summary fields allow paste; the AI block on summary content is the load-bearing constraint there, not paste.

**Vocabulary inside the field:** plain language ("main sentence," "supporting sentence," "thought unit") carries the user-facing surface; precise grammatical terms (subject, main verb, modifiers, coordinate clauses) live in the field framing where precision is the framing's job. The field label "Divisions / Thought Units" is preserved.

**Per-field empty-evidence override (composite over the canvas):** three sub-checks, all required to advance.

- **Structure sub-check:** the canvas has at least one main sentence (level 0) with at least one indented modifier under it.
- **Paraphrase sub-check:** every main row carries a non-empty paraphrase.
- **Thought-unit-end sub-check:** at least one row carries a `thought_unit_end` with a non-empty summary.

The "Continue to Main Characters" button activates only when all three sub-checks are met. A hover-checklist on the disabled button surfaces which one is unmet. Field-level N/A (canvas marked N/A) short-circuits the composite — the pastor may declare Field 3 inapplicable for this passage.

**In-workspace behavior:**

- **Single continuous canvas.** Pastor types structure, paraphrases, and thought-unit endings in one flow. No question-by-question gating; the work feeds itself in real time — laying out the structure surfaces seam candidates; rewriting paraphrases surfaces refinements to the structure.
- **Throughline-rail takeover when active.** The workspace shell collapses the throughline rail + AI panel and reduces write-column padding so the canvas gets the room. Pastor can restore the panels via the "Restore panels" button (resets on field change). Suppressed while the workspace tour is active.
- **Continue button label:** "Continue to Main Characters" — names the throughline at the moment of commit.
- **Throughline node summary on completion:** the pastor's own-words thought-unit summaries listed in canvas order. Example for Eph 2:1–5 — "(1) Without Christ, we were spiritually dead. / (2) The death wasn't isolated — every one of us was under wrath. / (3) But God acted. He made us alive in Christ." The number of items equals the number of `thought_unit_end` markers the pastor placed.

**Implementation pattern:** Single structured-exercise question with `kind: "unified-canvas"` (see "Structured-exercise questions" in the Field Pattern). The `IndentedSentenceCanvas` component renders the canvas + inline paraphrase + unit-end affordance + editor + filled-state cap line. Tab/Shift+Tab structural indent, Enter split, Backspace merge / depth-decrement, paste-block on canvas-row textareas, line-number gutter, level-0 visual marker, composite gating, and the field intro overview pattern are all delivered. Cross-phase consumers (Phase 2/3/4 cumulative-synthesis-tables) read the materialized `observations.divisions.thought_units` array; `setDivisionsCanvas` keeps that array in lockstep with the canvas on every save, with `_canvas_row_id` matching preserving cumulative columns through edits.

**PC dormant.** The work is structural spine-finding; PC enters later in Field 8.

**Structural revision history:**

The 2026-05-03 ratification shipped this field as three discrete questions — `sentence_layout` (canvas), `paraphrases` (per-main-sentence rewrites), `thought_units` (synthesis table). The pastor moved between three primitives, and the data layer kept three parallel arrays. Paraphrases and thought-unit endings were structurally tied to specific canvas rows but lived elsewhere, so reordering the canvas didn't carry its annotations along. The 2026-05-05 unification collapsed the three into one canvas where paraphrase and thought-unit-end attach inline to their rows; a stable per-row UUID became the merge key for cross-phase Phase 2/3/4 work. The legacy three-question shape is preserved in `parseStructuredField` as a defensive read-merge — no production sermons existed at the unification, so migration is defensive-only.

---

### Field 4 — Main Characters *(formerly Field 5)*

**Status:** Ratified 2026-05-03 in the reshape pass.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `characters` | Who's acting in this passage? For each character, name their role. |

**Seven-slot entry:**

- **Name:** Main Characters
- **Intent:** Name who's acting in the passage. Without this, the sermon's address is unclear — the pastor doesn't yet know whose story they're telling and whose ear they're pitching it to.
- **Question sequence:** Identify Main Characters.
- **What gets written:** A small list (or two-column table) of characters with their role in the passage in the pastor's own words. For Eph 2:1–5: *You/We* (the audience, once dead); *God* (rich in mercy, the actor of life); *Christ* (the means — God made us alive together with him).
- **Role in sub-phase:** Fourth field. First lens on Field 3's spine — *who* is doing the work the spine surfaces.
- **Connects from:** Divisions / Thought Units — having found the spine and named the bones, see who's acting in them.
- **Connects to:** Commands and Declarations — having seen the actors, name what kind of action they're carrying.

**Behavior:** Light field. No pre-field overview. Paste allowed. No AI in the role-naming cell — pastor's noticing is the discipline. N/A allowed when the passage genuinely has no distinct characters (rare; God or the speaker usually appears).

---

### Field 5 — Commands and Declarations *(formerly Field 6)*

**Status:** Ratified 2026-05-03 in the reshape pass. Merge from former Notable Commands + Notable Statements; new field name **Commands and Declarations** (chosen over the more grammatical "Verb Tenses" and the Merida-leaning "Imperatives and Indicatives" because it lands in pastor-language without losing precision).

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `commands_and_declarations` | For each main sentence above, name what kind of action it carries — a command (the author is asking the hearer to do something) or a declaration (the author is naming reality). Then say in your own words what the sentence is doing. |

**Seven-slot entry:**

- **Name:** Commands and Declarations
- **Intent:** Name what kind of action each main sentence in the spine carries. Imperatives drive (call to obedience). Indicatives declare (proclaim reality). The mix shapes how the passage preaches — gospel proclamation, ethical exhortation, narrative declaration, or a blend.
- **Question sequence:** Identify Commands and Declarations.
- **What gets written:** A row per main sentence with line, type (command or declaration), and what the sentence is doing in pastor's own words. For Eph 2:1–5, every main sentence is a declaration; the passage preaches as proclamation. For an exhortation passage like Eph 4:1–6, the mix shifts.
- **Role in sub-phase:** Fifth field. Second lens on Field 3's spine — *what kind of action* the main sentences carry.
- **Connects from:** Main Characters — having seen the actors, name what kind of action they're carrying.
- **Connects to:** Big Ideas — having named the actions, surface the concepts the passage is wrestling with.

**Behavior:** Light field. No overview. Paste allowed. No AI in the action-naming cell. N/A: rare. A borderline case (a command resting on a declaration, like "Be imitators of God, *as beloved children*") gets tagged with Type "Command (resting on declaration)" and a brief note. The pastor's call.

---

### Field 6 — Big Ideas *(formerly Field 7)*

**Status:** Ratified 2026-05-03 in the reshape pass. (Reordered from former position #8.)

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `big_ideas` | What concepts is the passage wrestling with? List them. For each, a one-line note on how it shows up. |

**Seven-slot entry:**

- **Name:** Big Ideas
- **Intent:** Surface the conceptual weight of the passage — the ideas the author is working with that connect to larger biblical theology. Without this, Interpret's "what does this mean?" reaches back into raw text instead of building on a named conceptual inventory.
- **Question sequence:** List the big ideas.
- **What gets written:** A list of concepts, each with a short one-line note. For Eph 2:1–5: spiritual death, wrath (cosmic and individual), mercy and love, union with Christ, grace as the means.
- **Role in sub-phase:** Sixth field. Third lens on Field 3's spine — *what concepts* are at stake.
- **Connects from:** Commands and Declarations — having named the actions, surface the concepts the passage is wrestling with.
- **Connects to:** Obvious Point — having surfaced the concepts, state the plain-sense point.

**Behavior:** Light field. No overview. Paste allowed. No AI in the cells. Distinct from Interpret's "Recurring Ideas" (themes recurring across the book) — Big Ideas is concepts of *this passage*. N/A: very rare; almost every passage carries concepts.

---

### Field 7 — Obvious Point *(formerly Field 8)*

**Status:** Ratified 2026-05-03 in the reshape pass. (Reordered from former position #9.)

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `obvious_point` | State the plain-sense point of the passage in one sentence. |

**Seven-slot entry:**

- **Name:** Obvious Point
- **Intent:** State the plain-sense point of the passage in one sentence. The pastor's first articulation of "what is this passage about?" — the proto-MPT. Catching the simple read before complexity layers in. If this is wrong, MPT will be wrong.
- **Question sequence:** State the obvious point.
- **What gets written:** One sentence in the pastor's own voice. Not a paraphrase of any single line — the synthesizing point of the whole passage. For Eph 2:1–5: "Even when we were spiritually dead and under God's wrath, God in his mercy made us alive together with Christ."
- **Role in sub-phase:** Seventh field. The first synthesis move. Pulls together Field 3 (structure, meaning, bones) and the lens cluster (4–6) into a single articulation.
- **Connects from:** Big Ideas — having surfaced the concepts, state the plain-sense point.
- **Connects to:** Possible Implications — having stated the point, surface what it's starting to suggest about the room.

**Behavior:** Light but pivotal. No overview needed. **Paste blocked. No AI.** The pastor's own voice is the discipline — same posture as Field 3's thought-unit-end summaries. One sentence preferred; a short two-sentence answer allowed if the passage's point genuinely needs it. **Required-non-empty for the Observe → Interpret threshold.**

---

### Field 8 — Possible Implications *(formerly Field 9)*

**Status:** Ratified 2026-05-03 in the reshape pass. (Reordered from former position #11. Naming preserved for continuity; rename flagged as candidate during the Implications-phase walks.)

**Heavy-lifting field — opens with a pre-field overview.**

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `pressing` | What is the passage starting to press on for the people you're preaching to? |
| 2 | `hard_and_hopeful` | What's hard here for the hearer? What's hopeful? |

**Seven-slot entry:**

- **Name:** Possible Implications
- **Intent:** First surfacing of Pastoral Context into the awareness layer. The bridge into Interpret. The pastor names early sight — what the passage is starting to press on, what's hard, what's hopeful — without crossing into full application. The text is still leading.
- **Question sequence:** Pressing → Hard / Hopeful.
- **What gets written:** Short paragraphs or bullets in the pastor's own voice. Awareness-level. Not sermon points, not application lists. Early sight.
- **Role in sub-phase:** Eighth and final field of Observe. The bridge into Interpret. Carries Pastoral Context into the next sub-phase as awareness, not as a precondition.
- **Connects from:** Obvious Point — having stated the point, surface what it's starting to suggest about the room.
- **Connects to:** Interpret (Phase 2) — opens against this awareness; Interpret deepens the work of seeing what the passage means with the room already in view.

**Pre-field overview (pastor-side copy):**

> ## Possible Implications
> *Field 8 of 8 · Observe*
>
> You've worked your way through what the text says — its location, its surface, its spine, its actors, its actions, its concepts, and its plain-sense point. The Observation Set is almost done.
>
> Before we leave Observe and step into Interpret, one more move. Look at the passage and ask: what is it starting to suggest about the room you're preaching to? What's it pressing on? What's hard? What's hopeful?
>
> Not full application yet. Application is its own work, later. Here we're naming early sight — the moments where the passage starts to feel weighty for the people in the pews. The first time pastoral context enters, while the text is still doing the leading.
>
> If you find yourself drafting application or making sermon points, ease back. This is awareness, not exhortation. The text is still ahead of you here.
>
> [ Begin ]

**Q1 framing (above the pressing question):**

> ## Question 1 of 2 — What's the passage pressing on?
>
> Look at the passage and the work you've done. What is it starting to suggest about the people you're preaching to? Where does it press in? What does it ask the hearer to face, embrace, or reckon with?

**Q2 framing (above the hard/hopeful pair):**

> ## Question 2 of 2 — What's hard? What's hopeful?
>
> Two early-sight questions, side by side.
>
> *What's hard here?* Where will the passage cut against the hearer? What might be uncomfortable, costly, or counter-intuitive?
>
> *What's hopeful?* Where's the gospel ground? What's the comfort, the promise, the invitation the passage holds out?

**Behavior:** Heavy-lifting. Pre-field overview shown on first entry, skipped on re-entry. **Paste allowed; AI blocked.** The pastor's articulation is what carries the awareness layer; AI is a downstream reader. The discipline is *awareness, not application* — guardrail against pre-empting the Implications sub-phase. **Required-non-empty (both questions) for the Observe → Interpret threshold.**

**Continue button label at completion:** "Continue to Interpret" — names the next sub-phase at the moment of commit. Distinct from the within-sub-phase Continue buttons (which name the next field): this button crosses the sub-phase boundary, so it names the boundary.

**PC awareness entry.** The first surfacing of PC into the awareness layer; the bridge that carries PC into Interpret.

---

## Within-sub-phase flow pass for Observe

### The Observation Set — Observe's named outcome

The Observation Set is what the pastor walks away from Observe holding. It's not a single artifact; it's the layered understanding that lives in eight field entries plus the throughline node summaries.

Composed:

1. A located passage *(Context)*
2. A surface report *(Surface Questions)*
3. The spine, its meaning held in the pastor's own voice, and named thought units *(Divisions / Thought Units)*
4. The actors named *(Main Characters)*
5. The kind of action each main sentence carries *(Commands and Declarations)*
6. The concepts at work *(Big Ideas)*
7. The plain-sense point in one sentence *(Obvious Point)*
8. Early sight of what the passage is pressing on, with hard and hopeful named *(Possible Implications)*

When Observe completes, the throughline visualization shows eight earned nodes for the Phase 1 segment, with the Observation Set sitting at the end of the segment as a synthesizing callout. Process Contract #6 ("the Study throughline is structural") activates for Phase 1 here.

### Load-bearing fields for the Observe → Interpret threshold

Three fields are load-bearing. The hard gate at the boundary checks:

- **Field 3 (Divisions / Thought Units)** — composite gate over the unified canvas's three sub-checks (structure + paraphrase per main row + at least one thought-unit-end). Without the spine + meaning + bones, the rest of Observe is loose.
- **Field 7 (Obvious Point)** — single-sentence answer required. The plain-sense point is what Interpret deepens.
- **Field 8 (Possible Implications)** — both questions required. The bridge has to actually exist before Interpret opens.

Other fields (1, 2, 4, 5, 6) are required-non-empty per the existing baseline rule, with per-field N/A escape valves where genuinely inapplicable.

### Reshape decisions surfaced and locked 2026-05-03

- **Merged:** Notable Commands + Notable Statements → Commands and Declarations. One binary classification, one synthesis table.
- **Retired:** Basic Outline. Field 3's thought units carry the proto-outline work into MPT/MPS and Step 3.
- **Reordered:** Main Characters moved ahead of Commands and Declarations. Subjects-first reading. Pastor notices who before classifying verbs.
- **Field count:** 11 → 9 → 8 (Background retired 2026-05-05; substance moved to series-level Book Study and Phase 2 Genre).
- **Possible Implications renaming:** flagged as candidate, deferred to Implications-phase walks (where the parallel "Implications" naming gets settled). Rename if needed then.

### N/A escape valve pattern (locked 2026-05-03)

A field declares N/A handling per question. Two patterns:

- **Field-level N/A** — the entire field is allowed to be empty when the passage genuinely doesn't carry that kind of content (Surface Questions may legitimately have no Where/When in epistles; Phase 2's Genre may be left empty when literary form isn't doing real interpretive work for the passage). The pastor explicitly marks the field N/A; the throughline visualization shows the node as deferred rather than missed.
- **Question-level N/A** — within a field, a specific question may be N/A while others have content (Surface Questions Q1 Where may be N/A on an epistle while Q3 How is filled). The composite gate respects per-question N/A flags.

In both cases, marking N/A is a deliberate gesture, not an absence. The pastor has to actively say "this doesn't apply" — they can't pass through silently. The discipline is preserved. The throughline shows the deferred mark; if the pastor returns later and finds the field does apply after all, they remove the N/A and fill it.

---

## The Observe → Interpret handoff

Interpret opens not against the raw passage but against the Observation Set. What the next sub-phase reads:

- **Field 3's unified canvas — structure, inline paraphrases, and thought-unit boundaries** — Interpret deepens the meaning the pastor has already begun to hold. The inline paraphrase under each main row becomes a touchstone; Interpret asks "what did the author mean by this?" with the pastor's own articulation already in voice.
- **Fields 4–6 (Main Characters, Commands and Declarations, Big Ideas)** — Interpret asks "what does this mean?" with the actors, action types, and concepts already named. Interpret doesn't reidentify them; it deepens.
- **Field 7 (Obvious Point)** — Interpret pressure-tests the plain-sense point and refines it. The point is allowed to evolve through Interpret (and again through MPT) as understanding deepens; Field 7's role is to anchor the first articulation so the deepening can be felt.
- **Field 8 (Possible Implications)** — Interpret carries the awareness layer forward. PC is no longer parallel-track or always-on; it's already in view as the pastor enters Interpret. The text is leading, the room is in awareness.

Interpret's named outcome (the Interpretation Set) builds on the Observation Set — it doesn't replicate it. The pastor doesn't restart at Interpret; they deepen.

### The hard gate at the boundary

Process Contract #2 fires at the Observe → Interpret transition. The check:

- Field 3's composite gate — structure (main+modifier present), paraphrase on every main row, at least one thought-unit-end with a summary.
- Field 7 (Obvious Point) — non-empty.
- Field 8 (Possible Implications) — both questions non-empty.

If any are unmet, the Continue button (label: **"Continue to Interpret"**) is disabled with a hover-checklist surfacing which gate is missing. Other fields (1, 2, 4, 5, 6) are required-non-empty with per-field N/A allowed.

### What's preserved across the boundary

The throughline visualization shows the line continuing — Observe's eight nodes light up in sequence as the pastor worked through them; the line then arcs into Interpret's first node (Deeper Context). The Observation Set sits at the end of the Observe segment as a callout the pastor can re-read at any time.

The pastor doesn't lose the work. They carry it.

---

---

## Phase 2: Interpret

### Field order (revised — 8 fields)

1. **Deeper Context** *(refined from former Context Impact)*
2. **Genre** *(new — added 2026-05-05)*
3. **Recurring Ideas**
4. **Character Purpose** *(refined from former Characters: Saying / Doing / Thinking; name locked 2026-05-04 at Phase 3 walk start)*
5. **Contrasts**
6. **Cross-References**
7. **Commentary Notes**
8. **Interpretation Synthesis** *(merged from former Summarize the Parts + Summarize the Whole; heavy-lifting, opens with overview)*

**Reshape from 9 to 7 to 8 fields:** Diagram / Relationships retired (absorbed by Observe Field 3 Q1's indented sentence canvas — re-asking for the structural diagram in Interpret was rerunning Phase 1). Summarize the Parts + Summarize the Whole merged into Interpretation Synthesis (two halves of one operation; one named outcome). Context Impact refined into Deeper Context (no longer duplicating Observe Field 1 Q3 Impact). Characters: Saying / Doing / Thinking refined into Character Purpose (deepens Observe Field 4 from *who* to *why* and *what the author signals through them*). **Genre added 2026-05-05** as a light, optional second-position field — the literary-form lens that does interpretive work belongs in Interpret, not as an Observe-level fact. Pastor leaves it empty when genre isn't doing real work for the passage.

The Merida four-part arc through the eight fields: pick up open questions and widen the lens (Deeper Context → Genre) → dissect what's inside the passage (Recurring Ideas → Character Purpose → Contrasts) → open the wider canon (Cross-References) → check against trusted readers, last (Commentary Notes) → synthesize the meaning (Interpretation Synthesis).

---

### Field 1 — Deeper Context *(refined)*

**Status:** Ratified 2026-05-03 in Phase 2 reshape pass.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `unresolved` | What questions did Observe's Context leave open that you can now answer with study tools in hand? |
| 2 | `book_argument` | How does this passage fit the book's overall argument? What does the author intend across the whole that bears on this passage? |

**Seven-slot entry:**

- **Name:** Deeper Context
- **Intent:** Pick up Observe's Context with research tools available. Resolve open questions; widen the lens from before/after to book-wide literary context and authorial purpose.
- **Question sequence:** Unresolved Questions → Book-Wide Argument.
- **What gets written:** Q1 — answers to questions the pastor noticed during Observe's Context that needed study tools to resolve (background details, word usage, cultural references, the Holy Spirit Intent question that pointed forward). Q2 — a paragraph or short list naming how this passage sits inside the book's argument and what the author intends across the whole that bears on the passage's meaning.
- **Role in sub-phase:** First field. The bridge from Observe into Interpret. Picks up where Observe Field 1 (Context) and Field 8 (Possible Implications) left questions hanging.
- **Connects from:** Observation Set — particularly the open ends in Observe Field 1's Holy Spirit Intent question and any unresolved background flagged during Observe.
- **Connects to:** Genre — having widened the lens, name the literary form that sets the lens for the dissection work.

**Behavior:** Light field. No overview. Paste allowed. AI allowed (commentary lookup, background research). N/A allowed at the question level — Q1 may legitimately N/A if Observe's Context closed cleanly with no open questions; Q2 cannot N/A (every passage sits inside a book's argument, even if briefly).

---

### Field 2 — Genre *(new — 2026-05-05)*

**Status:** Added 2026-05-05.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `genre` | What is the genre of this passage? |
| 2 | `impact` | How might its genre impact interpretation? |

**Seven-slot entry:**

- **Name:** Genre
- **Intent:** Name the literary form and let it set the lens. Genre is interpretive — narrative reads differently than epistle, wisdom differently than apocalyptic. Naming the form before dissection sets which moves are appropriate.
- **Question sequence:** Genre → Impact.
- **What gets written:** Q1 — a short label or phrase naming the form (epistle, narrative, wisdom, prophetic, apocalyptic, gospel-narrative, hymn, etc.). Q2 — a brief note on how that form should shape what the pastor looks for and how the passage gets read.
- **Role in sub-phase:** Second field. Sits between Deeper Context (the broader lens) and Recurring Ideas (the first dissection move). Sets the lens before dissection.
- **Connects from:** Deeper Context — having widened the lens, name the form.
- **Connects to:** Recurring Ideas — with the form named, look at what surfaces over and over inside the passage.

**Behavior:** Light, optional field. No overview. Paste allowed. AI allowed (genre lookup if needed). **Field-level N/A** allowed — when genre isn't doing real interpretive work for the passage (or the form is sufficiently obvious that naming it wouldn't sharpen the dissection), the pastor leaves it empty. Not load-bearing for the Interpret → Redemptive Thread threshold.

---

### Field 3 — Recurring Ideas *(formerly Field 2)*

**Status:** Ratified 2026-05-03 in Phase 2 reshape pass.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `recurring` | What ideas, words, or themes recur within this passage? For each, name what the recurrence is signaling about what the author is hammering home. |

**Seven-slot entry:**

- **Name:** Recurring Ideas
- **Intent:** Notice what surfaces over and over — words, motifs, themes — and name what the recurrence signals about authorial emphasis.
- **Question sequence:** Identify Recurring Ideas (with what each signals).
- **What gets written:** A list of recurring elements with a short note on each — what recurs, where, and what the recurrence is doing. For Eph 2:1–5: "dead" / "death" recurs (vv. 1, 5) — frames the human condition; "trespasses and sins" recurs (vv. 1, 5) — names the cause of the deadness; the passive "us / we / you" voice recurs throughout — signals utter human passivity in the salvation narrative.
- **Role in sub-phase:** Third field. First dissection lens — patterns of repetition surface authorial emphasis. Distinct from Observe's Big Ideas (which named the *concepts* the passage wrestles with); Recurring Ideas is the *patterns of repetition* that signal which concepts carry the weight.
- **Connects from:** Genre — with the form named, look at what surfaces over and over inside the passage.
- **Connects to:** Character Purpose — having seen what recurs, look at why the actors are acting as they are.

**Behavior:** Light field. No overview. Paste allowed. **No AI in the cell — the noticing is the discipline.** N/A: rare; almost every passage carries some recurrence. Distinction from Observe's Big Ideas lands in the question framing ("what *recurs*" not "what concepts").

---

### Field 4 — Character Purpose *(refined; formerly Field 3)*

**Status:** Ratified 2026-05-03 in Phase 2 reshape pass. Name locked 2026-05-04 at Phase 3 walk start: **Character Purpose**. Alternates considered and ruled out: *Character Function* (engineering-flavored), *Character Movement* (could read as physical movement), *What the Characters Reveal* (too long for a field name). *Character Roles* ruled out earlier — *role* is taken by Observe Field 4.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `character_function` | For each character you named in Observe, what are they saying, doing, or thinking — and why? What is the author signaling through their action? |

**Seven-slot entry:**

- **Name:** Character Purpose
- **Intent:** Deepen Observe's Main Characters from naming (who's acting) to authorial signal (what the author conveys through what they say, do, and think).
- **Question sequence:** Character Purpose (per character).
- **What gets written:** A list (or table) per character: what they say / do / think, and what the author signals through it. For Eph 2:1–5: God acts (rich in mercy; loved us with great love; made us alive together with Christ) — the author signals divine initiative against human deadness. We / you (the audience) is acted upon (was dead; was by nature children of wrath; was made alive with Christ) — the author signals utter passivity in salvation. Christ is the means of God's act, not an agent in the passage's foreground.
- **Role in sub-phase:** Third field. Second dissection lens — character motives and authorial intent through them.
- **Connects from:** Recurring Ideas — having seen the patterns of repetition, look at the actors moving inside them.
- **Connects to:** Contrasts — having seen the actors, surface the pivots that mark meaning shifts between them.

**Behavior:** Light field. No overview. Paste allowed. **No AI in the cell — inferring authorial intent is the discipline.** N/A allowed when the passage genuinely has no distinct characters (rare; typically rules in dense epistles where God or the author is the only character). Distinct from Observe Field 4 (which named the actors); this field asks why and what the author signals.

---

### Field 5 — Contrasts *(formerly Field 4)*

**Status:** Ratified 2026-05-03 in Phase 2 reshape pass.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `contrasts` | What contrasts has the author built into the passage? Name each — what's set against what — and say in your own words what each contrast is doing. |

**Seven-slot entry:**

- **Name:** Contrasts
- **Intent:** Surface the pivots, the "But" turns, the wise-vs-foolish or light-vs-dark or death-vs-life pairings the author has built into the passage. Contrasts mark where meaning shifts.
- **Question sequence:** Identify Contrasts (with what each is doing).
- **What gets written:** A list of contrasts with a short note on each — what's set against what, and what the contrast does in the passage. For Eph 2:1–5: dead vs. alive (vv. 1, 5) — frames the entire passage; wrath vs. mercy (vv. 3, 4) — the moral axis; we (passive, dead, under wrath) vs. God (active, rich in mercy, loving) — the salvific axis. The "But God" of v. 4 is the keystone pivot that the whole passage turns on.
- **Role in sub-phase:** Fourth field. Third dissection lens — the pivots that carry meaning weight.
- **Connects from:** Character Purpose — having named the actors and motives, see the pivots between them.
- **Connects to:** Cross-References — having dissected the passage internally, open the wider canon to see if Scripture speaks to these contrasts elsewhere.

**Behavior:** Light field. No overview. Paste allowed. **No AI in the cell — the contrast-noticing is the discipline.** N/A allowed when the passage genuinely has no contrasts (rare; most passages carry at least one). Merida cites Eph 2:4's "But God" as the paradigmatic contrast — a single conjunction can be the hinge of an entire biblical theology.

---

### Field 6 — Cross-References *(formerly Field 5)*

**Status:** Ratified 2026-05-03 in Phase 2 reshape pass.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `cross_refs` | Where else does Scripture speak to what this passage is saying? Move outward in concentric circles — same book → same author → same testament → other testament. For each, name what it adds. |

**Seven-slot entry:**

- **Name:** Cross-References
- **Intent:** Let Scripture interpret Scripture. Open the wider canon to deepen the meaning surfaced through dissection. Merida's concentric-circles pattern: immediate context → same book → same author → same testament → wider canon → extrabiblical (last and sparingly).
- **Question sequence:** Cross-References (with what each adds).
- **What gets written:** A list of references with a short note on each — the reference, where it sits in the concentric circles, and what it adds to the passage's meaning. For Eph 2:1–5: Col 2:13 (same author; parallel — Paul says the same thing, "God made us alive together with him"); Rom 5:6–10 (same author; deepens the wrath/mercy dynamic); Ezek 37:1–14 (other testament, typological — dry bones brought to life by the Spirit, foreshadows Eph 2's spiritual resurrection); Luke 15:11–32 (same testament; the prodigal's father runs to him, parallel divine initiative).
- **Role in sub-phase:** Fifth field. Opens the wider canon. Carries meaning from inside the passage to outside it.
- **Connects from:** Contrasts — having dissected the pivots inside the passage, open the wider canon to see if Scripture speaks to them elsewhere.
- **Connects to:** Commentary Notes — having let Scripture interpret Scripture, check the reading against trusted human readers.

**Behavior:** Light field. No overview. Paste allowed (legitimate to bring references from study tools). AI allowed (cross-reference suggestions are useful). N/A: very rare. Some cross-references already start hinting at Christ-connection — those carry forward into Phase 3 (Redemptive Thread).

---

### Field 7 — Commentary Notes *(formerly Field 6)*

**Status:** Ratified 2026-05-03 in Phase 2 reshape pass.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `commentary_notes` | Now — *last, to check, not to start* — what do the commentaries say? Note insights that sharpen, confirm, or correct what you've worked out. Note also where you disagree, and why. |

**Seven-slot entry:**

- **Name:** Commentary Notes
- **Intent:** Check the pastor's reading against trusted readers. Merida's Part 4 — commentaries come LAST. Their job is to confirm, sharpen, or correct what the pastor has already worked out — not to start the work.
- **Question sequence:** Commentary Notes (with where each sharpens, confirms, or pushes back).
- **What gets written:** Brief notes per commentary or trusted source — the insight, and how it lands against the pastor's reading. Where the commentary disagrees, name the disagreement and the pastor's call. For Eph 2:1–5: Stott emphasizes spiritual death as an active state, not just absence of life — sharpens the dead/alive contrast. Lloyd-Jones treats "But God" as the hinge of biblical theology — confirms and sharpens the keystone pivot. Hoehner offers a structural option the pastor disagrees with — note the disagreement and the reasoning.
- **Role in sub-phase:** Sixth field. The check. Trusted readers as the final dissection lens, used last.
- **Connects from:** Cross-References — having let Scripture interpret Scripture, check against trusted human readers.
- **Connects to:** Interpretation Synthesis — having dissected, cross-referenced, and checked, articulate the meaning.

**Behavior:** Light field. The "*last, to check, not to start*" framing sits at the top of the field as a one-line prompt — it's a posture cue, not just a hint. Paste allowed. AI allowed (commentary lookup, summarization). N/A allowed if the pastor genuinely has no commentary access on a passage (rare for in-canon work; possible for unusual or oral-tradition contexts).

---

### Field 8 — Interpretation Synthesis *(merged; formerly Field 7)*

**Status:** Ratified 2026-05-03 in Phase 2 reshape pass. Merge from former Summarize the Parts + Summarize the Whole.

**Heavy-lifting field — opens with a pre-field overview** (see Field intro overview in the Field Pattern).

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `meaning_per_unit` | Take each thought unit from your Observe work. For each, write what it MEANS — what the author is conveying through it. One or two sentences in your own voice. |
| 2 | `meaning_whole` | One paragraph: what does the whole passage MEAN? In your own voice. This is the Interpretation Set. |

**Seven-slot entry:**

- **Name:** Interpretation Synthesis
- **Intent:** Articulate what the passage MEANS — not what it says (Observe), not where it stands in the canon (Cross-References), not what others say about it (Commentary). The pastor's own voice on meaning, anchored to the spine and to the dissection work. The named outcome of Interpret — the Interpretation Set — lives here.
- **Question sequence:** Meaning per Thought Unit → Meaning of the Whole.
- **What gets written:** Q1 — for each thought-unit-end the pastor placed in Observe Field 3, one or two sentences on what it MEANS. The shift from paraphrase (Field 3's inline paraphrase per main row — what the words say in the pastor's own voice) to meaning (what the author is conveying through them). Q2 — one paragraph on the whole passage's meaning, in the pastor's own voice. The Interpretation Set's primary articulation.
- **Role in sub-phase:** Seventh and final field of Interpret. The synthesis. The named outcome lives here. Load-bearing at the Interpret → Redemptive Thread threshold.
- **Connects from:** Commentary Notes — having dissected, cross-referenced, and checked, now articulate the meaning.
- **Connects to:** Redemptive Thread (Phase 3) — opens against this articulated meaning; RT asks how the meaning points to Christ.

**Pre-field overview (pastor-side copy):**

> ## Interpretation Synthesis
> *Field 8 of 8 · Interpret*
>
> You've widened the lens, dissected what recurs, named character motives, surfaced the contrasts. You've let Scripture interpret Scripture and checked your reading against trusted readers, last.
>
> One more move closes Interpret. Take what you've worked out and say it. For each thought unit you named in Observe — what does it MEAN? Not what it says (you did that in Observe). Not what it sounds like in your own words (paraphrase, also Observe). What it MEANS — what the author is conveying through it.
>
> Then, the whole passage. One paragraph. The meaning, in your own voice.
>
> What you produce here is the Interpretation Set. Phase 3 (Redemptive Thread) opens against it. Christ-connection deepens this; the meaning is the substrate.
>
> [ Begin ]

**Q1 framing (above the meaning-per-unit table):**

> ## Question 1 of 2 — Meaning per thought unit
>
> Beside each thought unit you named in Observe, write what it MEANS in your own voice. One or two sentences each. Not what it says — what the author is conveying through it.

Q1's screen shows a thought-unit table extending the rows the pastor's `thought_unit_end` markers produced in Observe Field 3 (Thought unit | After line | Signal), now extended with a fourth column: **Meaning**. The pastor fills in each Meaning cell. The original three columns are read-only — the work that produced them is upstream and shouldn't be reopened here. Paste blocked in the Meaning column; the own-voice articulation is the discipline.

**Q2 framing (above the whole-passage paragraph):**

> ## Question 2 of 2 — Meaning of the whole
>
> One paragraph. The whole passage's meaning, in your own voice. What is the author saying through this passage about reality?
>
> This is the Interpretation Set. Phase 3 opens against it.

Q2's screen shows the meaning-per-unit table from Q1 as a read-only reference above the paragraph field. The pastor writes one paragraph. Paste blocked.

**Per-field empty-evidence override (composite over two questions):** all required to advance.

- **Q1:** every thought unit from Observe Field 3 Q3 has a Meaning entry filled. (Composite check ties to upstream — if Observe Field 3 Q3 has 3 thought units, all 3 must have Meaning here.)
- **Q2:** the whole-passage meaning paragraph is non-empty.

The "Continue to Redemptive Thread" button activates only when both gates are met. A hover-checklist on the disabled button surfaces which gate is unmet.

**In-workspace behavior:**

- **Q1 → Q2 transitions** editable from when each question's gate is met. The pastor can toggle between meaning-per-unit and whole-passage at their own pace; the table feeds the paragraph.
- **Q2 visible-but-greyed at State 0.** Tells the pastor what's coming before Q1's table is filled.
- **Continue button label:** "Continue to Redemptive Thread" — names the boundary at the moment of commit.
- **Throughline node summary on completion:** the Q2 whole-passage meaning paragraph's first sentence, with thought-unit count as a sub-line. Example for Eph 2:1–5 — "Even in death under wrath, God's mercy raised us with Christ. *(3 thought units)*"

**Implementation pattern:** Q1 is a structured-exercise question that extends Field 3 Q3's synthesis-table sub-shape with a new writable column (Meaning) and read-only upstream columns. Q2 is a text-prompt question. Composite gating, read-only upstream columns, paste-intercept on Q1's Meaning column and on Q2, and the field intro overview pattern are SPRD Component-1 implementation work.

**PC marinating.** Phase 2's PC progression is phase-level — no new PC content per field; the awareness from Phase 1 deepens alongside the text-work as the synthesis is articulated.

---

## Within-sub-phase flow pass for Interpret

### The Interpretation Set — Interpret's named outcome

The Interpretation Set is what the pastor walks away from Interpret holding. It's the matured meaning of the passage — text-meaning in the pastor's own voice, anchored to the Observation Set, dissected through patterns / character / contrasts, widened through cross-references, and checked against trusted readers.

Composed:

1. A widened context with open questions resolved *(Deeper Context)*
2. Named recurring patterns with their authorial signal *(Recurring Ideas)*
3. Character motives and what the author conveys through them *(Character Purpose)*
4. The contrasts that mark meaning shifts *(Contrasts)*
5. The wider canon mapped to the passage *(Cross-References)*
6. The reading checked against trusted readers *(Commentary Notes)*
7. The meaning, per thought unit and as a whole, in the pastor's own voice *(Interpretation Synthesis)*

The Interpretation Synthesis IS the primary artifact. Fields 1–6 are dissection scaffolding the synthesis rests on.

When Interpret completes, the throughline visualization shows seven earned nodes for the Phase 2 segment, with the Interpretation Set sitting at the end of the segment as a synthesizing callout. Process Contract #6 ("the Study throughline is structural") activates for Phase 2 here, alongside its Phase 1 activation.

### Load-bearing fields for the Interpret → Redemptive Thread threshold

One field is load-bearing. The hard gate at the boundary checks:

- **Field 8 (Interpretation Synthesis)** — composite gate over its two questions (every thought unit has a Meaning entry; whole-passage paragraph non-empty). Without articulated meaning, Redemptive Thread has nothing to deepen — Christ-connection rests on what the text means.

Other fields (1–6) are required-non-empty per the existing baseline rule, with per-field N/A escape valves where genuinely inapplicable.

### Reshape decisions surfaced and locked 2026-05-03

- **Retired:** Diagram / Relationships. Absorbed by Observe Field 3 Q1's indented sentence canvas — re-asking for the structural diagram in Interpret was rerunning Phase 1.
- **Merged:** Summarize the Parts + Summarize the Whole → Interpretation Synthesis. Two halves of one operation; one named outcome. The merge mirrors Field 3's pattern of one field carrying multiple sub-shapes.
- **Refined:** Context Impact → Deeper Context. Observe Field 1's Q3 (Impact) and Q4 (Holy Spirit Intent) absorbed the surface "how does context shape meaning" question; Phase 2's first field now does what Observe couldn't — resolve open questions with study tools in hand and widen to book-wide literary context.
- **Refined:** Characters: Saying / Doing / Thinking → Character Purpose. Observe Field 4 named the actors; Phase 2 deepens to motive and what the author signals through them. Name locked 2026-05-04 at Phase 3 walk start.
- **Added:** Genre as Field 2 (2026-05-05). The literary-form lens that does interpretive work moves into Interpret as a light, optional field — formerly part of Observe's now-retired Background field.
- **Field count:** 9 → 7.

### N/A escape valve pattern

Same pattern as Phase 1 (locked 2026-05-03 in Observe walk). Field-level and question-level N/A both available; marking N/A is a deliberate gesture, not an absence; the throughline visualization shows deferred nodes rather than missed ones.

Phase 2 specifics: Genre, Recurring Ideas, Character Purpose, and Contrasts can each be field-level N/A on passages that genuinely don't carry that kind of content (Genre routinely so when literary form isn't doing real interpretive work). Cross-References and Commentary Notes can be N/A when the pastor genuinely has no access (very rare). Field 8 (Interpretation Synthesis) cannot be N/A — it's the named outcome.

---

## The Interpret → Redemptive Thread handoff

Redemptive Thread opens not against the raw passage or the Observation Set but against the Interpretation Set. What the next sub-phase reads:

- **Field 8 Q1 (Meaning per thought unit)** — RT asks Christ-connection per thought unit. The pastor enters RT with thought-unit meaning already articulated; RT deepens each into the Christological dimension.
- **Field 8 Q2 (Meaning of the whole)** — RT asks how the whole points to Christ. The pastor's articulation of the passage's meaning becomes the substrate the Christ-Connection Statement deepens.
- **Field 6 (Cross-References)** — many cross-references already start hinting at typology, NT use of OT, Christological echoes. RT carries these forward and sharpens them.
- **Field 7 (Commentary Notes)** — Christological readings flagged in commentary work feed RT directly.
- **Fields 2–4 (Recurring Ideas, Character Purpose, Contrasts)** — patterns may foreground Christ-typology (e.g., a recurring "rest" motif pointing toward Hebrews 4); contrasts may map onto law/grace, death/life, Adam/Christ structures. RT picks these up.

The pastor doesn't restart at RT; they deepen. The Interpretation Set is the substrate for Christ-connection, not raw text.

### The hard gate at the boundary

Process Contract #2 fires at the Interpret → Redemptive Thread transition. The check:

- Field 8's composite gate (Q1 meaning per thought unit, Q2 whole-passage meaning) — both filled.

If unmet, the Continue button (label: **"Continue to Redemptive Thread"**) is disabled with a hover-checklist surfacing which gate is missing. Other fields (1–6) are required-non-empty with per-field N/A allowed.

### What's preserved across the boundary

The throughline visualization shows the line continuing — Interpret's eight nodes light up after Observe's eight; the line then arcs into Redemptive Thread's first node (This Passage and Christ). The Interpretation Set sits at the end of the Interpret segment as a callout the pastor can re-read at any time, sitting alongside the Observation Set callout from Phase 1.

The pastor doesn't lose the meaning work. They carry it.

### PC progression across Phase 2

Per the throughline vision sheet: **Interpret — marination.** The PC awareness from Observe Field 8 (Possible Implications) stays in view as the pastor dissects, cross-references, and synthesizes. No new PC fields in Phase 2 — but the awareness deepens as the meaning sharpens. PC's substance still lands in Phase 4 (Implications), not here.

---

---

## Phase 3: Redemptive Thread

### Field order (revised — 5 fields)

1. **This Passage and Christ** *(merged from former Where does it stand in relation to Christ + Does this text speak directly of Christ; folds in NT-use-of-OT for OT passages)*
2. **How the Passage Points to Christ** *(merged from former Biblical Theme + Promise; restored Merida Q5 Type-of-Christ + Q8 Predictive-of-Christ; heavy-lifting, opens with overview)*
3. **How the Gospel Makes This Possible** *(restored from Merida Q4; not previously in SermonForge — the anti-moralism move)*
4. **Our Need and God's Character** *(merged from former Need for Christ + Nature of God Who Provides Redemption)*
5. **Christ-Connection Statement** *(elevation of former Summary slot to a proper synthesis field; absorbs former Jesus the Hero of the Passage; heavy-lifting, opens with overview)*

**Reshape from 7 question-fields + 1 summary slot to 5 fields, locked 2026-05-04:** Aggressive consolidation paired with restoration. Three clusters merged (Position + Direct Christ-speech; Biblical Theme + Promise + Type + Predictive; Need + Character) — each cluster is angles on one work, not separate fields. Three Merida questions restored: Q4 (gospel-makes-commands-possible — the anti-moralism move), Q5 (type-of-Christ), Q8 (predictive-of-Christ). Q3 (NT use of OT) folded into Field 1 because it's a positional question for OT passages. Summary slot elevated to Field 5 (Christ-Connection Statement) — the named outcome deserves a proper field with structured questions, not a free-text summary box. *Jesus the hero of this passage* absorbed into Field 5 as the synthesis-flavored framing.

The Merida arc through the five fields: position the text against Christ (This Passage and Christ) → trace how it points to Christ (How the Passage Points to Christ) → ground the gospel's enabling power for the text's demand (How the Gospel Makes This Possible) → see human need and divine character (Our Need and God's Character) → synthesize into the Christ-Connection Statement.

PC progression across Phase 3 — *texture*: Fields 1–2 are interpretive (the room is dormant; the work is positional and pattern-finding). Field 3 surfaces PC ("for whom is this demand impossible without Christ?"). Field 4 deepens it (human need + divine character speak into specific conditions). Field 5 synthesizes with the room in view — the Christ-Connection Statement carries pastoral weight.

---

### Field 1 — This Passage and Christ *(merged)*

**Status:** Ratified 2026-05-04 in Phase 3 reshape pass. Merge of former *Where does it stand in relation to Christ* + *Does this text speak directly of Christ*. Folds in Merida Q3 (NT use of OT) for OT passages.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `position` | Where does this text stand in relation to Christ — before, after, or transitional? For OT passages, where does the New Testament pick this up? |
| 2 | `direct_speech` | Does this text speak directly of Christ? If so, how? |

**Seven-slot entry:**

- **Name:** This Passage and Christ
- **Intent:** Position the text vis-à-vis Christ. The opening move of Redemptive Thread — Merida calls Q1 "the most natural starting question." Locates the text in the redemptive arc (positional) and surfaces explicit Christological content (content).
- **Question sequence:** Position → Direct Speech.
- **What gets written:** Q1 — for OT passages, name the position (before Christ — promise, type, prophecy; after the fall but before incarnation; transitional periods). For NT passages, name the position (Gospel — direct narrative; Acts — fulfillment unfolding; Epistles — Christ-applied; Revelation — consummation). For OT passages, also name how the NT picks this up (e.g., Isa 53 → cited in Acts 8, 1 Pet 2). Q2 — if the text speaks directly of Christ, name how (gospels show person/works/teachings; some prophecy is direct; epistles are reflection on Christ). For Eph 2:1–5: position is "after — the gospel applied to dead-in-sin people, post-resurrection" with NT positioning relative to Christ's finished work; direct speech is "yes — *made us alive together with Christ* (v. 5) is direct Christological action."
- **Role in sub-phase:** First field. The opening positional move. The Christ-connection work begins by locating the text in the arc.
- **Connects from:** Interpretation Set — having articulated what the text MEANS, ask where that meaning sits in the Christ story.
- **Connects to:** How the Passage Points to Christ — having positioned the text, look for the patterns that carry the pointing.

**Behavior:** Light-medium field. No overview. Paste allowed. AI allowed (positional reference, NT-use-of-OT lookup). Q1 cannot N/A (every text has a position in the arc). Q2 may N/A when the text has no direct Christological content (rare for NT, common for OT — "no direct speech, but pointing through pattern" is the common state for OT, which Field 2 then carries).

**PC dormant.** The work is positional; the room is not yet in view.

---

### Field 2 — How the Passage Points to Christ *(merged + restored)*

**Status:** Ratified 2026-05-04 in Phase 3 reshape pass. Merge of former *Biblical Theme* + *Promise* with two restored Merida questions: *Type of Christ* (Q5) and *Predictive of Christ* (Q8).

**Heavy-lifting field — opens with a pre-field overview** (see Field intro overview in the Field Pattern).

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `biblical_theme` | Does the passage carry a biblical theme that points to Christ? (Kingdom, presence of God, sacrificial system, covenants, Word of God, etc.) |
| 2 | `promise` | Does the passage hold or echo a promise of God that points to Christ? |
| 3 | `type` | Is there a type of Christ here? A pattern, linguistic correspondence, or interbiblical theme that finds escalation in Christ? (Adam, Melchizedek, Moses, David, etc.) |
| 4 | `predictive` | Is the passage predictive of Christ — coming, death, return? |

**Seven-slot entry:**

- **Name:** How the Passage Points to Christ
- **Intent:** Trace the four kinds of Christological pointing the text may carry. Merida distinguishes biblical theme, promise, type, and predictive — each a different way a text foreshadows or echoes Christ. Genre-uneven; some texts carry all four, some one, some none. The N/A escape valve handles unevenness.
- **Question sequence:** Biblical Theme → Promise → Type → Predictive.
- **What gets written:** Per question, one or two sentences naming the pointing if present. For Eph 2:1–5: Biblical theme — yes, the death-to-life pattern carries the resurrection theme central to NT theology; Promise — yes, echoes the new-covenant promise of inward life by the Spirit (Ezek 36, Jer 31); Type — N/A (epistolary application of Christ's work, not typological); Predictive — N/A (Christ has come and acted in this text). For Psalm 23: Biblical theme — yes, shepherd theme runs to John 10; Promise — implicit covenantal protection echoing into Christ's keeping; Type — yes, David-as-shepherd-king typifies the Greater Shepherd; Predictive — N/A in the strict sense.
- **Role in sub-phase:** Second field. The pattern-finding work. After positioning, this field traces the four Christological pointing-mechanisms.
- **Connects from:** This Passage and Christ — having positioned the text, look for the patterns that carry the pointing.
- **Connects to:** How the Gospel Makes This Possible — having traced the patterns, ground the gospel's power for the text's demand.

**Pre-field overview (pastor-side copy):**

> ## How the Passage Points to Christ
> *Field 2 of 5 · Redemptive Thread*
>
> You've positioned the text against Christ. Now look for *how* it points to him. Merida names four distinct ways a passage can point — biblical theme, promise, type, and predictive prophecy.
>
> These are different in kind:
>
> - A **biblical theme** is a recurring motif in Scripture that finds its weight in Christ (kingdom, presence, sacrifice, covenant, Word).
> - A **promise** is an explicit word from God that finds its yes-and-amen in Christ.
> - A **type** is a pattern or person in Scripture that prefigures Christ — Adam, Melchizedek, Moses, David — with linguistic and thematic correspondence and *escalation* (Christ is the better one).
> - **Predictive prophecy** explicitly foretells Christ's coming, death, or return.
>
> Some passages carry all four. Some carry one. Some carry none of these directly — and that's fine. Mark N/A where the text genuinely doesn't carry that kind of pointing. Don't force.
>
> The discipline: don't insert Christ where he isn't. Allegory makes unfounded leaps; typology requires patterns, linguistic correspondences, and interbiblical themes. The text leads.
>
> [ Begin ]

**Behavior:** Heavy-lifting field. Pre-field overview shown on first entry, skipped on re-entry. Paste allowed. AI allowed (typology and pattern-recognition cross-reference is useful — but the discernment is the pastor's). All four questions allow N/A (genre unevenness is real). **Field-non-empty requires at least one question filled** — the text must point to Christ in at least one of the four ways for RT to proceed; if literally none apply, the pastor should pause and reconsider whether they've genuinely searched, since every passage in Scripture's canon participates in the redemptive arc somehow.

**PC dormant.** The work is pattern-finding (interpretive); the room is not yet in view.

---

### Field 3 — How the Gospel Makes This Possible *(restored)*

**Status:** Ratified 2026-05-04 in Phase 3 reshape pass. Restored from Merida Q4 — not previously in SermonForge. The anti-moralism move.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `gospel_power` | If this text calls the hearer to do, be, or trust something — how do the implications of the gospel make that possible? Access to God, indwelling Spirit, continual forgiveness, union with Christ. |

**Seven-slot entry:**

- **Name:** How the Gospel Makes This Possible
- **Intent:** Ground the gospel's enabling power for the text's demand. Merida's anti-moralism move: ethical texts crumble into "try harder" preaching unless the gospel's enabling resources are named. Reminds believers what they have *in Christ* that makes obedience livable.
- **Question sequence:** Gospel Power for the Text's Demand.
- **What gets written:** A short paragraph or list naming the gospel's enabling resources for whatever the text asks of the hearer. For Eph 2:1–5: the text doesn't ask anything (it declares); but the gospel's power to raise the dead is the ground for everything Eph 4–6 will later demand — the indicative *we were made alive with Christ* is the ground for every imperative that follows in the letter. For Eph 4:1–6 (a command-text): the gospel makes unity possible because we are one body in Christ, share one Spirit, one hope, one Lord, one faith, one baptism, one God and Father — these are not aspirations but realities Christ has secured. The hearer obeys *from* gospel reality, not toward it.
- **Role in sub-phase:** Third field. The first field where PC starts to surface — the question "for whom is this demand impossible without Christ?" pulls the room into view. Still text-leading, but the room is named.
- **Connects from:** How the Passage Points to Christ — having traced the patterns, ground the gospel's power for the text's demand.
- **Connects to:** Our Need and God's Character — having grounded the power, look at the human need and divine character that make this gospel work.

**Behavior:** Light field. The "*If the text demands, what does the gospel give that makes it possible?*" framing sits at the top of the field as a one-line prompt — it's a posture cue, not just a hint. Paste allowed. AI allowed (theological cross-reference). N/A allowed when the text genuinely makes no demand — pure narrative or pure declaration. For declarative texts, the field can N/A or carry a brief note ("this text declares; the gospel's power named here grounds future demands the passage will support").

**PC enters here.** This is the first Phase 3 field where the pastor's awareness of the room sharpens — naming what the gospel makes possible necessarily implies *for whom* and *against what condition*. Foreshadows the texture that Fields 4 and 5 will carry.

---

### Field 4 — Our Need and God's Character *(merged)*

**Status:** Ratified 2026-05-04 in Phase 3 reshape pass. Merge of former *Need for Christ* + *Nature of God Who Provides Redemption*.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `human_need` | How does this passage show mankind's need for Christ? |
| 2 | `god_character` | How does this passage reveal the nature of the God who provides redemption? |

**Seven-slot entry:**

- **Name:** Our Need and God's Character
- **Intent:** The paired theological question — what the text shows about human need and what it shows about God's character. The two halves answer each other: the need names the void; the character names the One who fills it. Merida treats them as separate questions; SFDI pairs them because the answer to one is incomplete without the other.
- **Question sequence:** Human Need → God's Character.
- **What gets written:** Q1 — what the text reveals about mankind's need for Christ (especially clear in Law genre where no one keeps the law fully, and in narrative where human failure is on display). Q2 — what the text reveals about God's character that meets that need (mercy, grace, justice, power, love, faithfulness). For Eph 2:1–5: Q1 — utter need; humanity is dead, by nature children of wrath, with no capacity to raise itself. Q2 — God is rich in mercy, motivated by great love, the actor who raises the dead. The need names the impossibility; the character names the One who does the impossible.
- **Role in sub-phase:** Fourth field. Pairs the text's anthropological reading with its theological reading.
- **Connects from:** How the Gospel Makes This Possible — having grounded the power, look at the human need and divine character that make this gospel work.
- **Connects to:** Christ-Connection Statement — having seen need and character, synthesize how the whole passage points to Christ.

**Behavior:** Light field. No overview. Paste allowed. **AI allowed but used sparingly — the pastor's articulation of human need and God's character benefits from the pastor's own voice.** Q1 may N/A on texts that focus purely on God's action without naming human condition (rare). Q2 cannot N/A — every text reveals something of the God who acts in it.

**PC deepens here.** The human-need question naturally pulls the congregation into view (whose need? what condition?). God's character speaks into the specific room. Texture begins to land.

---

### Field 5 — Christ-Connection Statement *(elevated, merged)*

**Status:** Ratified 2026-05-04 in Phase 3 reshape pass. Elevation of former Summary slot to a proper synthesis field; absorbs former *How is Jesus the hero of this passage?*. The named outcome of Phase 3 lives here.

**Heavy-lifting field — opens with a pre-field overview** (see Field intro overview in the Field Pattern).

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `christ_per_unit` | For each thought unit, name the Christ-connection. How does this thought unit point to, find its weight in, or get its answer from Christ? |
| 2 | `statement` | The Christ-Connection Statement: in one paragraph, how does the whole passage point to Christ — and how is Christ the hero of it? |

**Seven-slot entry:**

- **Name:** Christ-Connection Statement
- **Intent:** Synthesize the redemptive work of Phase 3 into the Christ-Connection Statement. Per-thought-unit Christ-connection extends the Phase 1 thought-unit table and the Phase 2 Meaning column with a third writable column. The statement itself is the named outcome — one paragraph naming how the whole passage points to Christ and how Christ is the hero of it.
- **Question sequence:** Christ-Connection per Thought Unit → Christ-Connection Statement (whole).
- **What gets written:** Q1 — for each thought unit from Observe Field 4 Q3 (already carrying its Meaning from Phase 2 Field 7 Q1), one or two sentences on the Christ-connection: how does this thought unit point to, find its weight in, or get its answer from Christ. Q2 — one paragraph naming how the whole passage points to Christ. The synthesis. The Christ-Connection Statement. For Eph 2:1–5: "The whole passage turns on what Christ has done. Dead in sin, under wrath, with no capacity for life — the only hope is divine action. God in mercy raised us *with Christ* — Christ's resurrection becomes ours. Christ is the hero because in him the impossible happens: the dead live, the wrathful are loved, the children of disobedience become children of God."
- **Role in sub-phase:** Fifth and final field of Redemptive Thread. The synthesis. The named outcome — the Christ-Connection Statement — lives here. Load-bearing at the RT → Implications threshold.
- **Connects from:** Our Need and God's Character — having seen need and character, synthesize how the whole passage points to Christ.
- **Connects to:** Implications (Phase 4) — opens against the Christ-Connection Statement; Implications carries this Christological substance into the three-way conversation between Theological Significance, Personal Implications, and Pastoral Context.

**Pre-field overview (pastor-side copy):**

> ## Christ-Connection Statement
> *Field 5 of 5 · Redemptive Thread*
>
> You've positioned the text against Christ, traced how it points, grounded the gospel's enabling power, and named human need with God's character. The redemptive work is done.
>
> One more move closes Redemptive Thread. Take what you've worked out and say it. For each thought unit — how does it point to Christ? Find its weight in him? Get its answer from him?
>
> Then, the whole passage. One paragraph. The Christ-Connection Statement. How does the whole passage point to Christ — and how is Christ the hero of it?
>
> Goldsworthy's evaluation question lives here: *did this sermon testify to Christ?* The Statement is what makes that answer yes. Phase 4 (Implications) opens against it. The Christological substance you articulate here gives Implications its weight.
>
> [ Begin ]

**Q1 framing (above the per-unit table):**

> ## Question 1 of 2 — Christ-Connection per thought unit
>
> Beside each thought unit (with its Meaning from Phase 2), write the Christ-connection. How does this thought unit point to Christ, find its weight in him, or get its answer from him?

Q1's screen extends the thought-unit table further. The table now shows five columns: Thought unit, After line, Signal (read-only — from Observe), Meaning (read-only — from Interpret), and **Christ-Connection** (writable — Phase 3). The cumulative work is visible — the pastor sees each thought unit's bones, signal, meaning, and now Christ-connection in one row. Paste blocked in the Christ-Connection column; the own-voice articulation is the discipline.

**Q2 framing (above the Statement paragraph):**

> ## Question 2 of 2 — The Christ-Connection Statement
>
> One paragraph. How does the whole passage point to Christ — and how is Christ the hero of it?
>
> This is the Christ-Connection Statement. Phase 4 opens against it.

Q2's screen shows the per-unit table from Q1 as a read-only reference above the paragraph field. The pastor writes one paragraph. Paste blocked.

**Per-field empty-evidence override (composite over two questions):** all required to advance.

- **Q1:** every thought unit from Observe Field 3 Q3 has a Christ-Connection entry filled. (Composite check ties to upstream — same gating pattern as Phase 2 Field 8 Q1.)
- **Q2:** the Christ-Connection Statement paragraph is non-empty.

The "Continue to Implications" button activates only when both gates are met. A hover-checklist on the disabled button surfaces which gate is unmet.

**In-workspace behavior:**

- **Q1 → Q2 transitions** editable from when each question's gate is met.
- **Q2 visible-but-greyed at State 0.** Tells the pastor what's coming before the per-unit table is filled.
- **Continue button label:** "Continue to Implications" — names the boundary at the moment of commit.
- **Throughline node summary on completion:** the Q2 Christ-Connection Statement's first sentence, with thought-unit count as a sub-line. Example for Eph 2:1–5 — "The whole passage turns on what Christ has done. *(3 thought units, all Christologically anchored)*"

**Implementation pattern:** Q1 extends the synthesis-table sub-shape with an additional writable column (Christ-Connection) and additional read-only upstream columns (Meaning from Phase 2, the original three from Phase 1). Q2 is a text-prompt question. The cumulative-column pattern across phases is the structural through-line of the workspace — Phase 1 builds the table; each subsequent phase adds a column. SPRD Component-1 implementation work covers the cumulative-column rendering, the read-only column treatment, the paste-intercept on writable columns, and the field intro overview pattern.

**PC at full texture.** The Christ-Connection Statement is articulated with the room in view. The pastor names how *this* passage points to Christ in a way that is starting to feel weighty for *these* people. PC has acquired substance — not yet integrated (Phase 4's job), but no longer just awareness (Phase 1) or marination (Phase 2).

---

## Within-sub-phase flow pass for Redemptive Thread

### The Christ-Connection Statement — Redemptive Thread's named outcome

The Christ-Connection Statement is what the pastor walks away from RT holding. It's the matured Christological reading of the passage — text-meaning given gospel weight, pointing-mechanisms traced, gospel power grounded, human need + divine character paired, all synthesized into a paragraph naming how the whole passage points to Christ and how Christ is the hero of it.

Composed:

1. The text positioned against Christ — positional + direct speech *(This Passage and Christ)*
2. The four pointing-mechanisms traced — theme, promise, type, predictive *(How the Passage Points to Christ)*
3. The gospel's enabling power named for the text's demand *(How the Gospel Makes This Possible)*
4. Human need paired with God's character *(Our Need and God's Character)*
5. The synthesis — per-unit Christ-connection + the whole-passage statement *(Christ-Connection Statement)*

The Christ-Connection Statement IS the primary artifact. Fields 1–4 are scaffolding the statement rests on.

When RT completes, the throughline visualization shows five earned nodes for the Phase 3 segment, with the Christ-Connection Statement sitting at the end of the segment as a synthesizing callout. Process Contract #6 ("the Study throughline is structural") activates for Phase 3 here, alongside its Phase 1 and Phase 2 activations.

### Load-bearing fields for the Redemptive Thread → Implications threshold

One field is load-bearing. The hard gate at the boundary checks:

- **Field 5 (Christ-Connection Statement)** — composite gate over its two questions (every thought unit has a Christ-Connection entry; whole-passage Statement non-empty). Without articulated Christ-connection, Implications has no Christological substance to carry into the three-way conversation.

Other fields (1–4) are required-non-empty per the existing baseline rule, with per-field N/A escape valves where genuinely inapplicable (notably Field 2's per-question N/A for genre unevenness and Field 3's field-level N/A for purely declarative texts).

### Reshape decisions surfaced and locked 2026-05-04

- **Merged:** *Where does it stand in relation to Christ* + *Does this text speak directly of Christ* → This Passage and Christ. Two angles on the positional question; one field with two questions.
- **Merged + restored:** *Biblical Theme* + *Promise* + restored Merida Q5 (Type) + restored Merida Q8 (Predictive) → How the Passage Points to Christ. Four kinds of pointing in one field; SermonForge had only two of Merida's four.
- **Restored:** Merida Q4 (gospel-makes-commands-possible) → How the Gospel Makes This Possible. Not previously in SermonForge. The anti-moralism move.
- **Folded:** Merida Q3 (NT use of OT) into Field 1 (positional). For OT passages, NT use is part of positioning; doesn't need its own field.
- **Merged:** *Need for Christ* + *Nature of God Who Provides Redemption* → Our Need and God's Character. Paired theological question.
- **Elevated + merged:** Summary slot + *Jesus the Hero of the Passage* → Christ-Connection Statement. Summary box becomes a proper synthesis field with structured questions; the named outcome deserves a real field, not a free-text summary.
- **Field count:** 7 question-fields + 1 summary slot → 5 fields.

### N/A escape valve pattern

Same pattern as Phases 1 and 2. Field-level and question-level N/A both available; marking N/A is a deliberate gesture, not an absence; the throughline visualization shows deferred nodes rather than missed ones.

Phase 3 specifics: Field 1 Q2 (direct speech) commonly N/A on OT passages where pointing happens through pattern, not direct speech. Field 2 (How the Passage Points to Christ) routinely has per-question N/A — most passages don't carry all four kinds of pointing. Field 3 (How the Gospel Makes This Possible) field-level N/A allowed for purely declarative texts (with note). Field 4 Q1 may N/A on texts that focus purely on God's action without naming human condition. Field 5 (Christ-Connection Statement) cannot N/A — it's the named outcome.

### PC progression across Phase 3 — texture

Per the throughline vision sheet: **Redemptive Thread — texture. Gospel-centered understanding gives the implications real weight.**

The progression across the five fields:

- **Field 1 (This Passage and Christ):** PC dormant. The work is positional.
- **Field 2 (How the Passage Points to Christ):** PC dormant. The work is pattern-finding (interpretive).
- **Field 3 (How the Gospel Makes This Possible):** **PC surfaces.** Naming what the gospel makes possible necessarily implies for whom and against what condition. The room enters view.
- **Field 4 (Our Need and God's Character):** **PC deepens.** Human need surfaces as the room's need; God's character speaks into specific conditions.
- **Field 5 (Christ-Connection Statement):** **PC at full texture.** The synthesis is articulated with the room in view. The Christ-Connection Statement carries pastoral weight — not just "how does this point to Christ" but "how does Christ-pointing land for these people."

PC has acquired substance by the end of Phase 3. Not yet integrated (Phase 4's job), but no longer just awareness (Phase 1) or marination (Phase 2). Phase 4's Implications opens against this textured PC, ready to integrate it into the three-way conversation.

---

## The Redemptive Thread → Implications handoff

Implications opens not against the raw passage, the Observation Set, or the Interpretation Set alone — it opens against the Christ-Connection Statement, with the prior named outcomes carried forward as substrate. What Phase 4 reads:

- **Field 5 Q1 (Christ-Connection per thought unit)** — Implications can read each thought unit as text + meaning + Christ-connection. The three-way conversation (Theological Significance, Personal Implications, Pastoral Context) has rich per-unit material.
- **Field 5 Q2 (Christ-Connection Statement, whole)** — Implications opens against the synthesized Christological reading. The statement is what the three-way conversation deepens into application.
- **Field 3 (How the Gospel Makes This Possible)** — Implications uses this directly. Personal Implications can call hearers to obey *from* gospel reality, not toward it; the anti-moralism move grounds the application.
- **Field 4 (Our Need and God's Character)** — Implications uses the human-need reading to sharpen Personal Implications and PC; the divine-character reading sharpens Theological Significance.
- **Field 2 (How the Passage Points to Christ)** — Implications draws on the patterns/promises/types to enrich Theological Significance.

The pastor doesn't restart at Implications; they deepen. The Christ-Connection Statement is the substrate for the three-way conversation, not raw text or meaning alone.

### The hard gate at the boundary

Process Contract #2 fires at the Redemptive Thread → Implications transition. The check:

- Field 5's composite gate (Q1 per-unit Christ-connection, Q2 Christ-Connection Statement) — both filled.

If unmet, the Continue button (label: **"Continue to Implications"**) is disabled with a hover-checklist surfacing which gate is missing. Other fields (1–4) are required-non-empty with per-field N/A allowed.

### What's preserved across the boundary

The throughline visualization shows the line continuing — RT's five nodes light up after Interpret's eight, which lit up after Observe's eight; the line then arcs into Implications' first node (Theological Significance). The Christ-Connection Statement sits at the end of the RT segment as a callout, alongside the Interpretation Set and Observation Set callouts from Phases 2 and 1.

**The cumulative thought-unit table is the structural through-line of the workspace.** Across the three phases walked so far, the table grows by one column per phase:

- Phase 1 Field 3 Q3 builds the table: Thought unit | After line | Signal
- Phase 2 Field 8 Q1 adds: Meaning
- Phase 3 Field 5 Q1 adds: Christ-Connection
- Phase 4 Field 4 Q1 adds: Implication

By the time MPT/MPS opens, the cumulative table holds the propositional skeleton with bones, signal, meaning, Christ-connection, and (eventually) implications all in one structural artifact. The pastor doesn't lose the work. They carry it as visible structure.

The pastor doesn't lose the redemptive work. They carry it.

### PC progression handoff to Phase 4 — toward integration

By the end of Phase 3, PC has acquired texture. It enters Phase 4 ready to be one of three voices in the Implications conversation. Not orphaned to a top-of-workspace card. Not parallel-track. Integrated.

Phase 4's three-way conversation between Theological Significance, Personal Implications, and Pastoral Context will be walked when SFDI proceeds to Phase 4. The Christ-Connection Statement (this phase's named outcome) is what Implications opens against; PC's substance (built across Phases 1–3) is what Implications integrates.

---

---

## Phase 4: Implications

### Field order (revised — 4 fields)

1. **Theological Significance** *(merged from former 5 IMPLICATIONS_THEOLOGICAL fields; one voice in the three-way conversation)*
2. **Personal Implications** *(merged from former 8 IMPLICATIONS_PERSONAL fields, consolidated to 4 verb-driven questions; one voice)*
3. **Pastoral Context** *(elevation of PC from parallel-track top-of-workspace card to dedicated voice in the three-way conversation; absorbs former Implications for Unbeliever)*
4. **Implications Synthesis** *(elevation of former Compiled list slot to a proper synthesis field; the named outcome — integrated form of the three-way conversation; heavy-lifting, opens with overview)*

**Reshape from 15 slots to 4 fields, locked 2026-05-04:** Aggressive consolidation realizing the SPRD/SFDI three-way conversation commitment articulated in the charter. PC moves from parallel-track top-of-workspace card to integrated voice in the conversation. The Compiled list slot is retired — the Implications Synthesis IS the synthesis, in the pastor's own voice (not AI-generated). The Implications for Unbeliever slot is folded into Pastoral Context Q1 (the room includes everyone, including unbelievers; no separate field). Each voice gets its dedicated field; the synthesis integrates all three. The Implications Synthesis is the content substrate the pastor carries into MPT/MPS, no AI re-summary needed. *(The clause here originally read "Merida's 'marinate' moment is restored — the Implications Synthesis IS the marinate-output…"; the "marinate-output" conflation was struck 2026-06-10 per era-2 Ruling 1. Marinate is restored separately and correctly as a return to the PASSAGE before the forge — see CORE Process Contract #6 saturation amendment.)*

The arc through the four fields: doctrinal teaching of the text (Theological Significance) → application call of the text (Personal Implications) → the room concretely named (Pastoral Context) → integrated synthesis (Implications Synthesis). The text leads the first two voices; PC enters as the third voice; the synthesis integrates all three.

PC progression across Phase 4 — *integration*: Field 1 PC dormant within the field (doctrinal teaching). Field 2 PC implicit but not foregrounded (application named for the hearer in general). Field 3 PC explicit and concrete (the room is named with specific people and conditions). Field 4 PC integrated as one voice among three in the synthesis. PC's substance is resolved here, not at MPT/MPS.

---

### Field 1 — Theological Significance *(merged)*

**Status:** Ratified 2026-05-04 in Phase 4 reshape pass. Merge of former 5 IMPLICATIONS_THEOLOGICAL question-fields under one field. Merida's 5 questions preserved intact; only the field-grouping changes.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `about_god` | What does this text teach about God? |
| 2 | `about_ourselves` | What does it teach about ourselves? |
| 3 | `about_christ` | What does it teach about Christ — his person, his work, his nature? |
| 4 | `timeless` | What principles in this text are timeless for us? |
| 5 | `doctrines` | What does the passage teach about particular doctrines? |

**Seven-slot entry:**

- **Name:** Theological Significance
- **Intent:** Articulate the doctrinal content the text teaches. The first voice in the three-way Implications conversation. What is true (about God, ourselves, Christ, doctrine, timeless principles) because of this text.
- **Question sequence:** About God → About Ourselves → About Christ → Timeless → Doctrines.
- **What gets written:** Per question, one or two sentences naming what the text teaches in that lens. Q3 (About Christ) is doctrinal — Christ's person, work, and nature — distinct from Phase 3's work which traced HOW the text points to Christ. For Eph 2:1–5: About God — God is rich in mercy, motivated by great love, the actor who raises the dead. About ourselves — apart from God's mercy we are dead in sin, by nature children of wrath, with no capacity for life. About Christ — Christ's resurrection is the means of our resurrection (we are made alive *with* him); union with Christ is the doctrinal axis. Timeless — salvation is by grace through divine action; the human contribution is the deadness God overcomes. Doctrines — total depravity, monergistic regeneration, union with Christ.
- **Role in sub-phase:** First field. The first voice in the three-way conversation. The doctrinal teaching of the text.
- **Connects from:** Christ-Connection Statement — having synthesized the Christological reading, articulate what the text teaches doctrinally.
- **Connects to:** Personal Implications — having named what the text teaches, name what it asks of the hearer.

**Behavior:** Light-medium field. No overview. Paste allowed. AI allowed (doctrinal cross-reference, theological terminology). Per-question N/A allowed where genuinely inapplicable (e.g., Q3 may N/A on a passage that doesn't carry doctrinal Christology directly — though most do via the canon).

**PC dormant within this field.** The work is doctrinal teaching.

---

### Field 2 — Personal Implications *(merged)*

**Status:** Ratified 2026-05-04 in Phase 4 reshape pass. Merge of former 8 IMPLICATIONS_PERSONAL question-fields, consolidated to 4 verb-driven questions: Follow, Forsake, Receive, Settle. Merida's 8 questions preserved as Q-internal sub-prompts.

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `follow` | What does the text call the hearer to do or follow? (Examples to imitate, commands to keep.) |
| 2 | `forsake` | What does the text warn against? (Errors to avoid, sins to forsake.) |
| 3 | `receive` | What does the text invite the hearer to receive? (Gospel promises to claim, fresh thoughts about God to gain.) |
| 4 | `settle` | What does the text ask the hearer to settle into? (Truths or doctrines to explore, convictions to live by.) |

**Seven-slot entry:**

- **Name:** Personal Implications
- **Intent:** Articulate what the text asks of the hearer. The second voice in the three-way conversation. What does the text call for, warn against, invite, and settle? Anchored in the gospel-power named in Phase 3 Field 3 — so the call doesn't collapse into moralism.
- **Question sequence:** Follow → Forsake → Receive → Settle.
- **What gets written:** Per question, one or two sentences naming what the text asks in that lens. The 4 verb-driven questions absorb Merida's 8 personal-application questions: Q1 (Follow) absorbs Examples + Commands. Q2 (Forsake) absorbs Errors + Sins. Q3 (Receive) absorbs Promises + New Thoughts about God. Q4 (Settle) absorbs Truths/Doctrines to Explore + Convictions to Live By. For Eph 2:1–5: Follow — N/A (the text declares; future imperatives in Eph 4–6 will rest on this). Forsake — the temptation to add to grace; the impulse to earn life. Receive — receive resurrection-life as gift; receive God's mercy as the ground of identity. Settle — settle into the conviction that you are loved while still dead, not after you fix yourself; settle into the doctrine of monergistic salvation as your daily ground.
- **Role in sub-phase:** Second field. The second voice in the three-way conversation. The application call of the text.
- **Connects from:** Theological Significance — having named what the text teaches, name what it asks of the hearer.
- **Connects to:** Pastoral Context — having named what the text asks in general, name the specific room it lands in.

**Behavior:** Light-medium field. No overview. Paste allowed. AI allowed sparingly (the application work benefits from the pastor's own articulation). Per-question N/A allowed and common — many passages don't fill all four (declarative texts may N/A Follow + Forsake; pure narrative may N/A Settle).

**PC implicit within this field but not foregrounded.** The personal application is named for the hearer in general; Field 3 will name the specific room.

---

### Field 3 — Pastoral Context *(elevated)*

**Status:** Ratified 2026-05-04 in Phase 4 reshape pass. Elevation of PC from parallel-track top-of-workspace card to dedicated voice in the three-way conversation. Absorbs former Implications for Unbeliever (the room includes everyone, including unbelievers; no separate field).

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `room_specifics` | Who in your room is this text speaking into? Name specific people or situations the text speaks into — believers and unbelievers, the wearied, the doubting, the hungry, the new, the long-faithful. |
| 2 | `cost_and_gift` | For those specific people, what's the cost — what will be hard, costly, counter-intuitive? What's the gift — the comfort, hope, freedom, or invitation this text holds out for them? |

**Seven-slot entry:**

- **Name:** Pastoral Context
- **Intent:** Name the specific room the text is landing in, and articulate how it lands — costly and gifted — for the people in that room. The third voice in the three-way conversation. PC's substance is resolved here, not at MPT/MPS. Phase 1 Field 8 (Possible Implications) was the early-sight version of this work; this is the matured, integrated articulation.
- **Question sequence:** Room Specifics → Cost and Gift.
- **What gets written:** Q1 — concrete naming of specific people, situations, conditions in the congregation the text is speaking into. Not abstract demographics. Examples for Eph 2:1–5: the 30-something dad carrying the weight of being not-good-enough; the older woman whose adult child has walked away from faith; the teenager who thinks Christianity is a list of rules; the unbeliever who has been quietly attending for six months. Q2 — for those specific people, the cost and the gift. For Eph 2:1–5: Cost — the dad has to stop earning; the older woman has to release her child to God's mercy; the teenager has to let go of rules-Christianity; the unbeliever has to face deadness before life. Gift — the dad: relief, you cannot earn yourself out of death. The older woman: hope, God acts in mercy, deadness is not the final word. The teenager: surprise, Christianity is resurrection not rules. The unbeliever: invitation, come and live.
- **Role in sub-phase:** Third field. The third voice in the three-way conversation. The room concretely named.
- **Connects from:** Personal Implications — having named what the text asks in general, name the specific room it lands in.
- **Connects to:** Implications Synthesis — having named the room, integrate all three voices into the synthesis.

**Behavior:** Light-medium field. The "*Name the room concretely. Specific people, specific conditions.*" framing sits at the top of the field as a one-line prompt — it's a posture cue, not just a hint. Paste allowed. AI allowed sparingly (PC is the pastor's local knowledge; AI can suggest patterns but the pastor's congregational knowledge is the substance). Q1 cannot N/A — every sermon is preached to specific people. Q2 cannot N/A — the text always lands somehow; the question is how.

**PC explicit and concrete.** The room is named. This field IS PC's voice in the conversation. The PC card at the top of the workspace becomes redundant once this field carries the substance — its content is now per-field per-sermon, here. (PC card removal is SPRD structural work that activates once Field 3 ships content. SFDI's walk locks the substance; SPRD ships the UX shift.)

---

### Field 4 — Implications Synthesis *(elevated)*

**Status:** Ratified 2026-05-04 in Phase 4 reshape pass. Elevation of former Compiled list slot to a proper synthesis field. The named outcome of Phase 4 — the integrated form of the three-way conversation — lives here.

**Heavy-lifting field — opens with a pre-field overview** (see Field intro overview in the Field Pattern).

**Question sequence:**

| # | Key | Prompt |
|---|---|---|
| 1 | `implication_per_unit` | For each thought unit, name the integrated implication. Drawing on Theological Significance + Personal Implications + Pastoral Context — what does this thought unit ask of the hearer in this room? |
| 2 | `synthesis` | The Implications Synthesis: in one paragraph, integrate the three voices. What does the text teach, what does it ask, and how does it land for the people in this room — all in one voice. |

**Seven-slot entry:**

- **Name:** Implications Synthesis
- **Intent:** Integrate the three-way conversation into the named outcome. Per-thought-unit integrated implication extends the cumulative thought-unit table with a sixth column. The synthesis paragraph itself is the named outcome — one paragraph in the pastor's own voice integrating Theological Significance + Personal Implications + Pastoral Context. The content substrate MPT/MPS opens against. *(The phrase "The marinate-output Merida calls for" was struck here 2026-06-10 — era-2 Ruling 1's conflation strike, deferred until now. The synthesis is the Phase-4 named outcome, not "the marinate-output." Marinate is restored separately as a return to the PASSAGE before the forge — see CORE Process Contract #6 saturation amendment.)*
- **Question sequence:** Integrated Implication per Thought Unit → Implications Synthesis (whole).
- **What gets written:** Q1 — for each thought unit (now carrying Meaning from Phase 2 and Christ-Connection from Phase 3), one or two sentences integrating the three voices into the implication for THIS hearer in THIS room. Q2 — one paragraph integrating all three voices for the whole passage. The synthesis. The named outcome. For Eph 2:1–5: "This passage teaches that humanity is dead apart from God's mercy and that God's character is to act in love toward the unworthy. It calls the hearer to receive grace as gift — not earn it, not climb to it, not deserve it — and to settle into the conviction that life with Christ is gift. For people in our congregation who carry the deep ache of being not-good-enough, this lands as freedom: you cannot earn yourself out of death, and God's love finds you in death anyway. The wearied dad can stop trying. The unbeliever quietly listening discovers that the gospel is not 'try harder' but 'come and live.'"
- **Role in sub-phase:** Fourth and final field of Implications. The synthesis. The named outcome — the Implications Synthesis — lives here. Load-bearing at the Implications → MPT/MPS threshold.
- **Connects from:** Pastoral Context — having named the room, integrate all three voices into the synthesis.
- **Connects to:** Step 2 (MPT/MPS) — opens against the four named outcomes (Observation Set, Interpretation Set, Christ-Connection Statement, Implications Synthesis) plus the cumulative thought-unit table; the foundation MPT/MPS rests on, with no AI re-synthesis needed.

**Pre-field overview (pastor-side copy):**

> ## Implications Synthesis
> *Field 4 of 4 · Implications*
>
> You've named what the text teaches (Theological Significance), what it asks (Personal Implications), and the specific room it's landing in (Pastoral Context). Three voices.
>
> One more move closes Implications — and closes the Study work. Take what you've worked out and integrate it. For each thought unit — what does it ask of THIS hearer in THIS room? Drawing on the three voices.
>
> Then, the whole passage. One paragraph. The Implications Synthesis. What does the text teach, what does it ask, and how does it land for the people in this room — all in one voice. Not three sections. One synthesis.
>
> This is the Implications Synthesis — the named outcome of Phase 4. MPT and MPS open against this synthesis (with the prior three named outcomes carried alongside) — no AI re-summary, no reaching back into your scattered raw worksheet answers; your integrated synthesis IS the content substrate. The foundation has been earned. Then, before you forge the Main Point, you'll be sent back to read the passage through once more — the marinate beat Merida calls for. That return to the text is a separate move from the synthesis (it is not a relabeling of it), and the reference pane keeps the passage present beside your work by default the whole way through.

*(Reframed 2026-06-10, pastor's saturation ruling. This block previously read "This is the marinate-output. Merida tells the pastor to back away after Implications and ponder before crafting the sermon. What you write here is what you sit with." The era-2 primacy charter's Ruling 1 ordered that "marinate-output" conflation struck; it had not yet been removed here, so this is the deferred strike plus the saturation amendment in one move. The conflation stays gone — the synthesis is the Phase-4 named outcome and the content substrate, NOT "the marinate-output." Marinate returns as Merida means it: a return to the PASSAGE before the forge, now surfaced by the system (the reference-pane default plus the re-read beat at the Study→Anchor seam). See CORE Process Contract #6 saturation amendment (2026-06-10) and era-2 charter Rulings 1 and 4's supersession banners.)*
>
> [ Begin ]

**Q1 framing (above the per-unit table):**

> ## Question 1 of 2 — Integrated implication per thought unit
>
> Beside each thought unit (with its Meaning from Phase 2 and Christ-Connection from Phase 3), write the integrated implication. Drawing on Theological Significance + Personal Implications + Pastoral Context — what does this thought unit ask of the hearer in THIS room?

Q1's screen extends the thought-unit table further. The table now shows six columns: Thought unit, After line, Signal (read-only — from Observe), Meaning (read-only — from Interpret), Christ-Connection (read-only — from RT), and **Implication** (writable — Phase 4). The cumulative work is fully visible — the pastor sees each thought unit's bones, signal, meaning, Christ-connection, and now integrated implication in one row. Paste blocked in the Implication column; the own-voice articulation is the discipline.

**Q2 framing (above the Synthesis paragraph):**

> ## Question 2 of 2 — The Implications Synthesis
>
> One paragraph. Integrate the three voices for the whole passage. What does the text teach, what does it ask, and how does it land for the people in this room — all in one voice. Not three sections. One synthesis.
>
> This is the Implications Synthesis. MPT/MPS opens against it.

Q2's screen shows the per-unit table from Q1 as a read-only reference above the paragraph field. The pastor writes one paragraph. Paste blocked.

**Per-field empty-evidence override (composite over two questions):** all required to advance.

- **Q1:** every thought unit from Observe Field 3 Q3 has an Implication entry filled.
- **Q2:** the Implications Synthesis paragraph is non-empty.

The "Continue to MPT/MPS" button activates only when both gates are met. A hover-checklist on the disabled button surfaces which gate is unmet.

**In-workspace behavior:**

- **Q1 → Q2 transitions** editable from when each question's gate is met.
- **Q2 visible-but-greyed at State 0.**
- **Continue button label:** "Continue to MPT/MPS" — names the boundary at the moment of commit (the boundary out of Study itself, into Step 2).
- **Throughline node summary on completion:** the Q2 first sentence + thought-unit count. Example for Eph 2:1–5 — "This passage teaches that humanity is dead apart from God's mercy and that God's character is to act in love toward the unworthy. *(3 thought units, all integrated)*"

**Implementation pattern:** Q1 extends the synthesis-table sub-shape with a sixth writable column (Implication) and the full set of read-only upstream columns (Christ-Connection from Phase 3, Meaning from Phase 2, three originals from Phase 1). Q2 is a text-prompt question. The cumulative-column pattern is now complete across all four phases — six columns total, one writable per phase. SPRD Component-1 implementation work covers the cumulative-column rendering, read-only treatment per upstream column, paste-intercept on writable columns, and the field intro overview pattern.

**PC at full integration.** The Implications Synthesis carries PC as one voice among three, integrated, weighty for the room. PC's substance is resolved here.

---

## Within-sub-phase flow pass for Implications

### The Implications Synthesis — Implications' named outcome

The Implications Synthesis is what the pastor walks away from Implications holding. It's the integrated three-way conversation — text-teaching given application call, both grounded in the specific room, all in one synthesizing paragraph plus a per-thought-unit Implication column.

Composed:

1. The doctrinal teaching of the text *(Theological Significance)*
2. The application call of the text *(Personal Implications)*
3. The room concretely named *(Pastoral Context)*
4. The integrated synthesis — per-unit Implication + whole paragraph *(Implications Synthesis)*

The Implications Synthesis IS the primary artifact. Fields 1–3 are the three voices the synthesis integrates.

When Implications completes, the throughline visualization shows four earned nodes for the Phase 4 segment, with the Implications Synthesis sitting at the end as a synthesizing callout. Process Contract #6 ("the Study throughline is structural") activates for Phase 4 here — completing all four sub-phases under the contract.

### Load-bearing fields for the Implications → MPT/MPS threshold

One field is load-bearing. The hard gate at the boundary checks:

- **Field 4 (Implications Synthesis)** — composite gate over its two questions (every thought unit has an Implication entry; whole-passage Synthesis non-empty). Without the integrated synthesis, MPT/MPS has no consolidated foundation to draft from — it would be reaching back into the three voices separately, defeating the integration. The integrated synthesis (plus the four named outcomes) is the *content* substrate the Main Point draws from. The PASSAGE is a separate matter: before forging, the pastor is sent back to re-read the text once more (the restored marinate beat — see CORE Process Contract #6 saturation amendment, 2026-06-10), and the reference pane keeps the passage present beside the work by default. The synthesis is the substrate; the passage is the saturation — both true, orthogonal.

Other fields (1, 2, 3) are required-non-empty per the existing baseline rule, with per-question N/A escape valves where genuinely inapplicable (especially Field 2's questions on declarative texts).

### Reshape decisions surfaced and locked 2026-05-04

- **Merged:** 5 IMPLICATIONS_THEOLOGICAL fields → Theological Significance (one field, 5 questions; Merida's 5 preserved intact).
- **Merged + consolidated:** 8 IMPLICATIONS_PERSONAL fields → Personal Implications (one field, 4 verb-driven questions; Merida's 8 preserved as sub-prompts within the 4).
- **Elevated + folded:** PC (was parallel-track top-of-workspace card) + IMPLICATIONS_UNBELIEVER → Pastoral Context (one field, 2 questions; the room includes everyone).
- **Elevated:** Compiled list slot → Implications Synthesis (proper synthesis field with structured questions; pastor-written, not AI-generated).
- **Field count:** 15 slots → 4 fields.

The three-way conversation shape from the SPRD/SFDI commitment is now realized at the field level. Each voice has its dedicated field; the synthesis integrates them.

**PC card removal:** SPRD structural work that activates once Field 3 ships content. SFDI's walk locks the substance; SPRD ships the UX shift (removing the parallel-track card from the workspace top, since its content is now per-field per-sermon in Field 3).

**Compiled list (AI synthesis) retired:** the Implications Synthesis IS the synthesis, in the pastor's own voice. AI may assist (highlighting redundancies, suggesting integrations) but the synthesis is the pastor's articulation. No separate AI-generated compiled list at the close of Implications.

**Implications for Unbelievers retired as separate field:** folded into Pastoral Context Q1 (the room includes unbelievers explicitly). Merida's "edify while evangelizing; evangelize while edifying" pattern — Christ is needed for both saved and unsaved; the application is for the whole room.

**Content substrate is the pastor's own articulations:** SermonForge previously jumped to MPT/MPS with an AI four-phase synthesis; now the four named outcomes (the pastor's own articulations, in their own voices, accumulated across the four sub-phases) ARE the content substrate, and MPT/MPS opens against them directly — no reaching back into the scattered raw worksheet answers. *(Reframed 2026-06-10, pastor's saturation ruling. This entry originally read "**Marinate moment restored:** the Implications Synthesis IS the marinate-output…" — era-2 Ruling 1 struck that conflation, and the strike is applied here now. Marinate IS restored, but correctly: it is a return to the PASSAGE before the forge, not the synthesis under a different name. The synthesis remains the content substrate; the restored marinate beat is the re-read of the text at the Study→Anchor seam, surfaced by the reference-pane default and the send-off/handoff/MPT-prompt copy. See CORE Process Contract #6 saturation amendment and era-2 charter Rulings 1 and 4 supersession banners.)*

### N/A escape valve pattern

Same pattern as Phases 1–3. Field-level and question-level N/A both available; marking N/A is a deliberate gesture, not an absence; the throughline visualization shows deferred nodes rather than missed ones.

Phase 4 specifics: Field 1 questions can N/A per question (e.g., About Christ may N/A on rare passages). Field 2 questions routinely N/A by genre (declarative texts may N/A Follow + Forsake; pure narrative may N/A Settle). Field 3 questions cannot N/A (every sermon is preached to specific people; every text lands somehow). Field 4 cannot N/A — it's the named outcome.

### PC progression across Phase 4 — integration

Per the throughline vision sheet: **Implications — integration. The three-way conversation between Theological Significance, Personal Implications, and PC. PC is one of three voices, not orphaned to the top.**

The progression across the four fields:

- **Field 1 (Theological Significance):** PC dormant within the field. The work is doctrinal teaching.
- **Field 2 (Personal Implications):** PC implicit but not foregrounded. Application named for the hearer in general.
- **Field 3 (Pastoral Context):** **PC explicit and concrete.** The room is named with specific people and conditions. PC has its dedicated voice.
- **Field 4 (Implications Synthesis):** **PC integrated as one voice among three.** The synthesis carries PC as part of the integrated articulation.

PC's substance is resolved here. It moves from parallel-track card (current state) to integrated voice (this redesign). MPT/MPS no longer needs PC-tier-weighting in its prompt — PC's substance flows in through the Implications Synthesis as one of the four named outcomes.

The full PC arc across the four sub-phases:

- **Phase 1:** awareness (Field 8 Possible Implications — early sight)
- **Phase 2:** marination (no new fields; Phase 1 awareness deepens as text-meaning sharpens)
- **Phase 3:** texture (surfaces in Field 3, deepens in Field 4, full texture in Field 5)
- **Phase 4:** integration (Field 3 articulates concretely, Field 4 integrates as one voice in the synthesis)

The arc realizes the user's articulation: *the text drives the sermon toward PC, not the other way around.* PC enters at the end of Observe, marinates through Interpret, textures through RT, and integrates into the Implications Synthesis. By the time MPT/MPS opens, PC's substance is in the synthesis — integrated, not orphaned.

---

## The Implications → MPT/MPS handoff

MPT/MPS opens not against the raw passage, the Observation Set alone, or any single named outcome — it opens against ALL FOUR named outcomes plus the cumulative thought-unit table. The four sub-phases have built the foundation; MPT/MPS rests on it.

What MPT/MPS reads:

- **Field 4 Q2 (Implications Synthesis)** — the integrated voice of the three voices for this passage in this room. The most direct substrate for MPS (which is application-flavored, present/future tense).
- **Field 4 Q1 (Implication per thought unit)** — the cumulative table now showing six columns per thought unit. MPT can read each thought unit as text + meaning + Christ-connection + integrated implication.
- **Phase 3 Field 5 Q2 (Christ-Connection Statement)** — the Christological synthesis. Carries forward as ground for any redemptive application in MPS, and prevents moralistic drafting.
- **Phase 2 Field 8 Q2 (Interpretation Set)** — the meaning of the whole, in pastor's own voice. Carries forward as the substrate of MPT (which is text-meaning, past tense).
- **Phase 1 Observation Set callouts** — the foundation work; less direct for MPT/MPS but available for verification or deepening.

The four named outcomes plus the cumulative table are a complete *content* substrate. MPT/MPS doesn't reach back into the pastor's scattered raw worksheet answers — the integrated synthesis is what the Main Point draws from. AI re-summary at MPT/MPS is unnecessary — and actively counter to the SFDI commitment that the pastor's own articulations across four sub-phases ARE the substrate.

This "no reaching back into raw worksheet content" principle is about the *content* substrate, and it stays. It is orthogonal to the passage. The biblical TEXT is not worksheet content: at the Study→Anchor seam the pastor is sent back to re-read the passage once more before forging the Main Point (the Implications send-off, the handoff screen which now renders the passage, and the MPT draft prompt), and the reference pane keeps the passage present beside the work by default in every region. That return to the text is the restored marinate beat — a separate move from the synthesis, not a relabeling of it. *(Clarification added 2026-06-10, pastor's saturation ruling — see CORE Process Contract #6 saturation amendment and era-2 charter Rulings 1 and 4 supersession banners. The synthesis-is-substrate principle above is preserved unchanged; this only names that the passage saturation is a separate, restored beat.)*

### The hard gate at the boundary

Process Contract #2 fires at the Implications → MPT/MPS transition. The check:

- Field 4's composite gate (Q1 implication per thought unit, Q2 Implications Synthesis) — both filled.

If unmet, the Continue button (label: **"Continue to MPT/MPS"**) is disabled with a hover-checklist surfacing which gate is missing. Other fields (1, 2, 3) are required-non-empty with per-question N/A allowed.

### What's preserved across the boundary

The throughline visualization shows the line completing the Study segment — Implications' four nodes light up after RT's five (which lit up after Interpret's eight, which lit up after Observe's eight). **Total: 25 earned nodes across the Study throughline.** The Implications Synthesis sits at the end of the Implications segment as a callout, alongside the prior three named-outcome callouts (Observation Set, Interpretation Set, Christ-Connection Statement).

**The cumulative thought-unit table is now complete:**

- Phase 1 Field 3 Q3 builds: Thought unit | After line | Signal
- Phase 2 Field 8 Q1 adds: Meaning
- Phase 3 Field 5 Q1 adds: Christ-Connection
- Phase 4 Field 4 Q1 adds: Implication

Six columns. The propositional skeleton of the passage now carries bones, signal, meaning, Christ-connection, and integrated implication for THIS room. The pastor enters MPT/MPS with this complete artifact in view, alongside the four named-outcome callouts.

**Marinate moment:** the pastor finishes Phase 4 with a paragraph synthesizing the three voices — and that paragraph (plus the cumulative table, plus the prior three named outcomes) is the content substrate they carry into MPT/MPS. The marinate beat itself is a return to the PASSAGE: before forging the Main Point the pastor is sent back to read the text through once more (the Implications send-off, the Study→Anchor handoff which now renders the passage, and the MPT draft prompt), with the reference pane keeping the passage present beside the work by default. SFDI's content commitment is that the synthesis is the content substrate; the saturation commitment is that the passage is what the pastor re-reads before the forge. *(Reframed 2026-06-10, pastor's saturation ruling. This entry originally read "the Implications Synthesis IS the marinate-output… the synthesis IS the substance to marinate on" and cited SPRD's "Save and step away" downstream work — era-2 Ruling 1 struck that conflation, and the restored marinate is a return to the text, not the synthesis relabeled. See CORE Process Contract #6 saturation amendment and era-2 charter Rulings 1 and 4 supersession banners.)*

The pastor doesn't lose the Implications work. They carry it as the integrated voice, with the room in view, ready to draft the main point.

---

## SFDI structural completion — what's now in place

With Phase 4 walked, the structural completion test from the SFDI charter is satisfied:

- **Every field across all four sub-phases has a seven-slot entry** (Name, Intent, Question sequence, What gets written, Role in sub-phase, Connects from, Connects to).
- **Every sub-phase declares its named outcome** (Observation Set, Interpretation Set, Christ-Connection Statement, Implications Synthesis) and articulates how the field-work composes into it.
- **Every sub-phase boundary names its handoff** (Observe → Interpret, Interpret → RT, RT → Implications, Implications → MPT/MPS) with hard-gate specifics and what's preserved.
- **Process Contract #6 has substance to bind to** across all four sub-phases — the throughline's integrity is now testable, not just declared.

**Field count by phase:**

| Phase | Fields | Questions | Heavy-lifting fields |
|---|---|---|---|
| 1 — Observe | 8 | 16 | Field 3 (Divisions / Thought Units), Field 8 (Possible Implications) |
| 2 — Interpret | 8 | 11 | Field 8 (Interpretation Synthesis) |
| 3 — Redemptive Thread | 5 | 11 | Field 2 (How the Passage Points to Christ), Field 5 (Christ-Connection Statement) |
| 4 — Implications | 4 | 13 | Field 4 (Implications Synthesis) |
| **Total** | **25** | **51** | **6** |

**Cumulative thought-unit table across phases:** Thought unit | After line | Signal | Meaning | Christ-Connection | Implication. Six columns; one writable column added per phase after Phase 1. The structural through-line of the workspace.

**PC arc across phases:** awareness (Phase 1 Field 8) → marination (Phase 2) → texture (Phase 3 Fields 3, 4, 5) → integration (Phase 4 Fields 3 and 4). PC's substance flows through the named outcomes, never orphaned.

### What's pending

- **Experiential completion.** The charter's qualitative test — "the throughline feels earned" — is testable in real sermon prep once SPRD Component 1 (the Isolated-World Workspace UX overhaul: field-level spotlight + sermon-level takeover + throughline visualization) ships the workspace experience that surfaces the structure SFDI has now defined. Until then, the structure exists in this document but not in the workspace UX the pastor moves through.
- **SPRD downstream work.** Implications restructure shape (one step, three voices), Step 5 as its own workspace step, PC card removal, the Isolated-World Workspace UX overhaul, the cumulative-column synthesis-table rendering, the per-field overview pattern, the per-question composite gating, and the Continue-button labeling pattern are all SPRD structural work that ships against SFDI's content commitments.
- **AI prompt updates.** AI prompts that reference PC, the four named outcomes, or the per-field content can now be tuned against real per-field substance. Until SPRD ships the UX, AI prompts treat PC as enrichment never as a precondition (per Process Contract #4) and read the named outcomes as the four substrates.
- **Reshape ratifications in real use.** Field names locked during walks (Character Purpose, This Passage and Christ, How the Passage Points to Christ, How the Gospel Makes This Possible, Our Need and God's Character, Theological Significance, Personal Implications, Pastoral Context, Implications Synthesis, etc.) have not yet been used in lived sermon prep. Names may sharpen with use; the SFDI doc updates if so.

---

*End of Implications (Phase 4) walk. All four sub-phases of Study now have per-field entries, named outcomes, and handoff articulations. SFDI's structural completion test — every field declares its connections, every sub-phase declares its named outcome, every sub-phase boundary names its handoff — is satisfied as of 2026-05-04. The experiential completion test is qualitative and lives in real sermon-prep use once SPRD Component 1 ships the workspace UX that surfaces the throughline.*
