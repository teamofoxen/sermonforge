# SermonForge — Sermon Workspace

> Rewritten post-ARI (2026-05-09). All AI surfaces are gone. This document
> reflects the current state of the codebase.
>
> **Post-workspace-restructure (2026-05-10):** Workspace collapsed from
> 4 stages (Study / Blueprint / Frame / Manuscript) to 3 (Study / Assembly /
> Manuscript). The within-Study Step layer retired. Study is now just
> Exegesis (4 sub-phases). Assembly hosts the former Step 2/3/4 work plus
> the former Frame stage's Intro/Conclusion, as four sub-phases: Anchor
> (MPT/MPS), Outline, Equip (FE), Frame. Sections below referring to "Step 2
> / 3 / 4 / Blueprint / Frame stage" map onto Assembly's sub-phases —
> field content unchanged, named outcomes preserved. See
> [`docs/PROPOSALS/workspace-restructure-charter.md`](../PROPOSALS/workspace-restructure-charter.md).

> Components: `src/components/SermonWorkspace.jsx` (3-tab shell), `StudyTab.jsx` (Study stage / Exegesis), `AssemblyTab.jsx` (Assembly stage / 4 sub-phases), `ManuscriptTab.jsx` (Manuscript stage).

---

## The Study throughline

The four Study sub-phases — Observe, Interpret, Redemptive Thread, Implications — compose
a single deepening exegetical arc: text says → text means → text points to Christ →
text lands on this congregation. Pastoral Context (PC) enters the arc progressively;
the text drives the sermon toward PC, not the other way around.

**Articulated by the product owner during SPRD planning (2026-04-30, verbatim):**

> The point of exegesis is engagement with the world of text itself, as much as
> possible, without influence from modern context. That's to ensure that at the
> core of a sermon, God is speaking first. My PC shouldn't be driving the sermon,
> the text should be driving the sermon toward my PC. At the end of the Observe phase is
> "Possible Applications," and this is the first time anything related to PC
> surfaces. The idea is that the pastor begins to think in terms of "how could
> this apply to my audience," but doesn't fully enter that mode. Think of it as
> introducing a new layer of thinking, but only into the awareness layer, not
> focus. That's why the pastor is immediately pulled back into the text with
> Interpret phase, where the main issue is what does the text mean (vs. what does
> it say, which the Observe phase does). By the end of Interpret, the pastor knows
> what it says and what it means, and now has a more holistic picture. So the
> possible applications are marinating in this increased understanding. By the end
> of the redemptive thread, the pastor's understanding is now robustly Gospel
> centered, and those possible applications are getting real texture. THIS is the
> moment PC begins to really pop. The implications phase SHOULD be a conversation
> between Theological Significance, Personal Application and PC.

**Two field-level commitments flow from this articulation:**

1. **Observe ends with the field that first surfaces PC into the awareness layer.**
   Named "Possible Implications" (renamed from "Possible Applications" in the
   Vocabulary cleanup pass), this field is where the pastor begins to think
   pastorally without yet leaving the text.
2. **Implications is a three-way conversation between Theological Significance,
   Personal Implications, and PC.** The named outcome — the **Implications Synthesis**
   — is the integrated form of that conversation.

---

## Pastoral Context — Phase 4 Field 3

The always-on Pastoral Context card at the top of `SermonWorkspace.jsx` was
**removed in SPRD B4.2 (2026-05-04)**. PC now lives in Phase 4 Field 3 of Study
(Implications) as one voice in the three-way conversation, with two questions:

| Question | Question key | Stored at |
|----------|--------------|-----------|
| The Room | `room_specifics` | `implications.pastoral_context.room_specifics.value` |
| The Cost and Gift | `cost_and_gift` | `implications.pastoral_context.cost_and_gift.value` |

The three legacy schema columns (`topic_theme`, `audience_assumptions`,
`background_noise`) are retained defensively but are no longer written to or rendered.

---

## Study Tab

Component: `src/components/StudyTab.jsx`. Four steps (Exegesis, MPT/MPS, Outline,
Functional Elements). Field definitions live in `src/utils/studyFields.js`.

### Step 1 — Exegesis

Four sub-phases rendered through `SpotlightWorksheet`. Each phase:
- Renders labeled fields per question from the prep guide
- Stores data as JSON in its respective DB column
- Has a sticky **"Show Text"** button that opens `PassagePopup`

Gates between sub-phases are enforced by `evaluateAdvance` in
`src/utils/studyAdvancement.js`. When a gate passes, `PausePointScreen` renders.

#### Phase 1: Observe → `sermons.observations` (JSON)

`OBSERVE_FIELDS` — 8-field shape: `context` → `surface_questions` → `divisions`
→ `characters` → `commands_declarations` → `big_ideas` → `obvious_point` → `applications`.

- **Field 3 (Divisions / Thought Units)** — `unified-canvas` kind; `IndentedSentenceCanvas`
  owns the workspace width when spotlit (`takeoverWhenActive: true`). Canvas rows
  produce the canonical `thought_units` array via `deriveThoughtUnitsFromCanvas`
  on every save. Phases 2/3/4 all read from this array.
- **Field 8 (Possible Implications)** — first PC awareness-layer surface.
- Fields 3 and 8 open with `FieldOverviewScreen` on first per-sermon entry.

#### Phase 2: Interpret → `sermons.interpretation` (JSON)

`INTERPRET_FIELDS` — 8-field shape: `deeper_context` → `genre` → `recurring_ideas`
→ `character_purpose` → `contrasts` → `cross_refs` → `commentary`
→ `interpretation_synthesis`.

- **Field 8 (Interpretation Synthesis)** — heavy-lifting, opens with `FieldOverviewScreen`.
  Q1 is a `cumulative-synthesis-table` extending the canonical thought-unit array
  with a writable `meaning` column. Q2 is the whole-passage Interpretation Set
  (text-prompt). Gate to Phase 3 requires every thought-unit row has `meaning` and
  Q2 is non-empty.

#### Phase 3: Redemptive Thread → `sermons.redemptive_thread` (JSON)

`REDEMPTIVE_FIELDS` — 5-field shape: `this_passage_and_christ` →
`passage_points_to_christ` → `gospel_makes_possible` → `need_and_character`
→ `christ_connection_statement`.

- **Field 5 (Christ-Connection Statement)** — heavy-lifting, load-bearing.
  Q1 (`christ_per_unit`) extends the thought-unit array with a `christ_connection`
  column. Q2 (`statement`) is the whole-passage Statement. Gate to Phase 4
  requires every row has `christ_connection` and `statement` is non-empty.

#### Phase 4: Implications → `sermons.implications` (JSON)

`IMPLICATIONS_FIELDS` — 4-field shape: `theological_significance` →
`personal_implications` → `pastoral_context` → `implications_synthesis`.

- **Field 4 (Implications Synthesis)** — heavy-lifting, load-bearing.
  Q1 (`implication_per_unit`) extends the thought-unit array with the final
  `implication` column. Q2 (`synthesis`) is the whole-passage Implications Synthesis.
  Gate to Step 2 requires every row has `implication` and `synthesis` is non-empty.

### PausePointScreen

Renders between sub-phases after a gate passes. Component: `src/components/PausePointScreen.jsx`.

**"What you just did"** — a single synthesis question the pastor answers in one sentence.
Their answer persists via `updateStructured` into the `_synthesis` key of the completed
sub-phase's data column. The four questions:

| Sub-phase | Question |
|-----------|----------|
| Observe (1) | "In one sentence, what does the text say?" |
| Interpret (2) | "In one sentence, what does the text mean?" |
| Redemptive Thread (3) | "In one sentence, where is Christ in this text?" |
| Implications (4) | "In one sentence, how does this text land on your people?" |

**"What's next"** — static description of the upcoming sub-phase.

The Begin button calls `onContinue`, which clears `pausePoint` state in StudyTab.

### Step 2 — MPT / MPS Forge

Two fields: `mpt` (Main Point of the Text, past tense) and `mps` (Main Point of the
Sermon, present tense). Both are plain `sermon.*` columns. SADI Step 2 question flows
are the designed path for forging these; see
`src/utils/sadiAnchorFields.js` + `MAIN_POINT_PAIR_FIELDS`.

### Step 3 — Outline Builder

Add/remove/reorder outline points. Syncs bidirectionally with the Blueprint tab.
Use only `createOutlinePoint(text)` from `src/utils.js` to create points —
the stable UUID it assigns is the key that `functional_elements` depends on.

### Step 4 — Functional Elements

Per outline point: Explanation, Application, Illustration, Scripture fields.
Component: inline `FuncElem` in `StudyTab.jsx`.

### Study Notebook

`NotebookPanel` at the bottom of the Study tab. Free-form scratchpad, scoped to
the sermon. Persists as `sermons.notebook_study`. See ARI Phase 3.

---

## Blueprint Tab (OutlineTab)

Component: `src/components/OutlineTab.jsx`.

**Outline Questions** — a collapsible `Collapsible` panel with four questions that
walk the pastor from MPS to outline structure (ARI Phase 6). Read-only; the pastor
uses the Blueprint Notebook for answers.

**Reference card** — passage, MPT, MPS displayed at top when present. If MPS ends
with `:`, a structural preview shows outline points with E/A/I fill indicators.

**Sermon Body Structure** — `OutlineBuilder` component.

**Blueprint Notebook** — `NotebookPanel`. Persists as `sermons.notebook_blueprint`.

The "Continue to Manuscript →" button is gated on `outline.length > 0`.

---

## Manuscript Tab

Component: `src/components/ManuscriptTab.jsx`.

Fields: Introduction, per-point Transition, Conclusion. Each is a free-form textarea
in `sermons.manuscript` (JSON).

**ManuscriptReview** (`src/components/ManuscriptReview.jsx`) — three collapsible
sections of structured read-only prompts:
- **Flow Check** — dynamic per-sermon: Intro, each outline-point transition, Conclusion.
- **Ear Check** — fixed scan-list (long sentences, abstract nouns, jargon, etc.).
- **Final Tune-Up** — five editorial-pass sections with prompt questions.

**Manuscript Notebook** — `NotebookPanel`. Persists as `sermons.notebook_manuscript`.

**Export to Word** — dispatches `sermon-export-manuscript` IPC. Main builds a `.docx`
to `Documents/SermonForge/exports/Manuscripts/` and opens it. Manuscript is the
terminal prep stage; there is no Delivery tab.

---

## PassagePopup (Show Text)

Component: `src/components/PassagePopup.jsx`. Triggered by "Show Text" on each
exegesis phase.

- Opens on hover; stays until click-outside or ✕
- Rendered via React portal to `document.body`
- Fetches via `fetchPassage()` → IPC `"passage-fetch"` → ESV API (key never reaches renderer)
- Draggable by header bar; resizable from bottom-right corner
- Results cached in-memory per session

---

## Save Flow

1. Pastor edits a field in any tab
2. `onUpdate(fields)` → `SermonWorkspace.handleUpdate()`
3. `setSermon()` merges into local state (optimistic update)
4. `sermonRef.current` updated
5. `debouncedSave()` scheduled (800ms debounce)
6. On fire: `persistUpdate()` reads `sermonRef.current` (full current state)
7. `updateSermon(id, fields)` IPC → `electron/main.js` `db-updateSermon`
8. `buildUpdate()` validates against `SERMON_COLUMNS` allowlist
9. SQL UPDATE runs; `saveDb()` schedules disk write (500ms debounce)

---

## Cross-System Notes

- Adding columns to `sermons` requires updating `SERMON_COLUMNS` in `electron/main.js`.
  `buildUpdate()` throws in dev if you miss this, but only if you exercise the save path.
- `SpotlightWorksheet` dispatches on `question.kind`; `unified-canvas` mounts
  `IndentedSentenceCanvas`. For `crossPhaseRead` / `crossPhaseWrite` wiring see
  `src/components/SpotlightWorksheet.jsx`.
- The `Collapsible` primitive at `src/components/primitives/Collapsible.jsx` is
  shared by `NotebookPanel`, `ManuscriptReview`, and the Blueprint Outline Questions.
- `FeedbackFlag` mounts on Study, Blueprint, and Manuscript tabs (BTI Phase 1.5).
