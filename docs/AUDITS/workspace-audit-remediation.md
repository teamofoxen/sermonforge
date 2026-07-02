# Workspace Audit Remediation — state of play + the remaining (Sonnet) batch

> **Date:** 2026-07-02. **Source audits:** [`sermon-workspace-audit.md`](sermon-workspace-audit.md)
> (findings W1–W12) and [`redemptive-thread-implications-audit.md`](redemptive-thread-implications-audit.md)
> (findings R1–R10), triaged against HEAD and ruled by the pastor the same day.
>
> **This doc is the work order for the second session.** Part 1 records what already
> shipped (uncommitted, on `main`'s working tree) so the second session doesn't redo or
> contradict it. Part 2 is the remaining fix list — mechanical, fully specified, no new
> design decisions required. Part 3 is verification + close-out.

---

## Rulings of record (pastor, 2026-07-02)

1. **W1/R1** — the "one question at a time" promise moves to match the ruled field-level
   walk (CORE vocabulary amended; landing copy reworded). The walk's rendering does NOT change.
2. **W5** — sermon title editing belongs at the END of the walk, with Intro, Transitions,
   Conclusion (the CCE source places naming after everything). The earlier "no title in the
   workspace" ruling applied to the chrome/beginning, not the walk's end.
3. **R3, R4, R6** — audit accepted: prompts carry the "no is fine" permission; the
   gospel-grounding field splits into two questions; `about_christ` distinguishes itself
   from the Christ-Connection.
4. **R2, R7, R8** — audit accepted: plain language over seminary vocabulary; the
   heresy-warning lecture tone softened; the Pastoral Context prompt load reduced.
5. **Names** — Merida, Goldsworthy (and by the same logic Chapell/Robinson/Keller) are
   removed from ALL pastor-facing copy. Ideas stay; names go. Code comments and dev docs
   may keep the names (they anchor to the CCE source).
6. **W6** — FieldTeaching auto-open behavior STAYS, but the teaching blocks, the threshold
   screens, and the map get de-walled (no more walls of text).
7. **M2 / W2** — already ruled in the prior UX audit: the Observation Set completeness
   check is the lenient Obvious Point check; CORE/canon now amended to say so.
8. **Deferred, not ruled** — W9/W10/R5/R9 (density under real prep; the WATCH comment in
   `SermonWritingSurface.jsx` tracks them) and the audits' "dispute" items (W11 legend
   wording is deliberate plain vocabulary; the SYSTEMS doc's "two threshold overlays" is
   technically correct in scope).

## Part 1 — SHIPPED in the first session (do not redo)

All verified: `npm run lint` clean, `npm test` 297/297, workspace preview renders, the map
shows short labels (60 rows, longest 46 chars), the Title field edits and speaks its
empty-name refusal.

| Item | Where |
|---|---|
| CORE Question/Answer vocabulary amended to the field-level walk | `docs/CORE.md` (Canonical Vocabulary) + `docs/CORE-CHANGELOG.md` |
| CORE Process #2 amended: five composites + lenient Observation Set (M2) | `docs/CORE.md` + `docs/CORE-CHANGELOG.md` |
| Canon mirrors both: five composites / four lenient checks; asymmetry note resolved; 31 fields; eight question kinds; §4.2 Title row | `docs/WORKSPACE-CANON.md` |
| W3 — inverted N/A label fixed: "not applicable — the hook already carried the redemptive note" | `src/utils/sermonManuscriptFields.js` |
| W7 — "ready to equip" → "ready to write" | `src/components/SermonWritingSurface.jsx` |
| W8 + R10 — reference-pane copy corrected at both seams (Open Bible button vs 'Your work' tab) | `src/utils/sadiAnchorFields.js`, `src/utils/studyFields.js` |
| W1/R1 — landing promise reworded ("one field at a time…") | `src/components/SermonStartLanding.jsx` |
| R2 — plain-language rewrite of How the Passage Points to Christ (theme/promise/pattern/prophecy) | `src/utils/studyFields.js` |
| R3 — "no is a real answer" carried into both This Passage and Christ prompts | `src/utils/studyFields.js` |
| R4 — gospel_makes_possible split into `primary` (the call) + `enabled_by_gospel` (the grounding); legacy `primary` key kept so old answers stay visible; sample seed updated | `src/utils/studyFields.js`, `electron/sampleData.js`, `src/components/SermonWritingSurfaceFixture.jsx` |
| R6 — about_christ prompt distinguishes doctrine-about from pointing-to | `src/utils/studyFields.js` |
| R7 — gradient kept, lecture tone removed (also in the Body overview) | `src/utils/studyFields.js`, `src/utils/sermonEquipFields.js` |
| R8 — Pastoral Context: example freight moved to a new overview; prompt slimmed | `src/utils/studyFields.js` |
| Names removed from all pastor-facing copy (9 sites) | `studyFields.js`, `sermonEquipFields.js`, `sermonOutlineFields.js`, `sermonManuscriptFields.js`, `sadiAnchorFields.js`, `SermonFinish.jsx` |
| W5 — Sermon Title field built: terminal doors field, kind `sermon-title`, writes native `title`, never persists empty (spoken refusal), map row derives from `sermon.title` | `sermonManuscriptFields.js`, `SermonWritingSurface.jsx` (+ its css), `SermonWorkspace.jsx` (handleTitleChange + 3 comment updates), `sermonState.js` |
| De-walling: every question carries a short `mapLabel`; map + handoff "Left behind" list render labels, not prompts; overviews tightened (CCS 5→3 paragraphs, Body 4→3, Conclusion 4→3, Implications intro 3→2, Synthesis 4→3) | `walkOrder.js` (questionLabel + primary default), `SermonMap.jsx`, `StudyAnchorHandoff.jsx`, all field-def files |
| Stale "DRAFT PEDAGOGY / not preacher-walked" headers corrected to OEM-ratified | `sermonOutlineFields.js`, `sermonEquipFields.js` |
| sermonState comment updated (CORE no longer "pending amendment") | `src/utils/sermonState.js` |

## Part 2 — REMAINING fixes (this session's work)

Work top to bottom. Each item is self-contained; make minimal, surgical edits.

### S1. W4 — a load failure must not say "Sermon not found." *(the only code-behavior item)*

`src/components/SermonWorkspace.jsx`: the load effect's catch (`console.error("SermonWorkspace load error:", ...)`)
sets no state, so a thrown load falls through to the `!sermon` branch ("Sermon not found."),
which reads as the sermon being gone (CORE Mutation #3/#5: failures must be visible and
retryable, in plain voice).

- Add `const [loadError, setLoadError] = useState(false);` near the other state.
- In the load effect: `setLoadError(false)` at start; in the catch, `if (!cancelled) setLoadError(true);` (keep the console.error).
- Add a render branch ABOVE the `!sermon` branch:
  - Copy: `Something went wrong loading this sermon. Your work is safe on disk — this is a loading problem, not a lost sermon.`
  - A **Retry** button that re-runs the load (simplest: a `loadNonce` state incremented by Retry, added to the effect's dependency array), plus the existing `BackButton`.
- The `!sermon && !loadError` branch keeps "Sermon not found." (the honest case: id genuinely absent).
- Style with existing patterns (the loading/not-found branches' inline style is the local precedent); no new CSS required.

### S2. W12 — tuck the internal tokens in the unreachable-field fallback

`src/components/SermonWritingSurface.jsx`, the `if (!field)` fallback: the visible copy ends
with `({String(stage)} · {String(subPhase)} · {String(fieldKey)})`. Keep the humane sentence;
move the tokens out of the pastor's sentence into a `title` attribute on the hint div (hover
diagnostic, per the original L2 intent), i.e. remove the parenthetical from the text and add
`title={`${String(stage)} · ${String(subPhase)} · ${String(fieldKey)}`}` to the
`.sws-field-hint` div.

### S3. Doc drift — `docs/SYSTEMS/sermon-workspace.md`

1. The 2026-05-10 restructure note (near the top) still says Assembly hosts four sub-phases
   "Anchor (MPT/MPS), Outline, Equip (FE), Frame". Add a dated correction (or extend the
   existing OEM note above it): post-OEM (2026-07-02) Assembly = Anchor, Outline; Equip
   moved to Manuscript as Body; Frame collapsed into the doors.
2. "Threshold orientation" section ("Two threshold overlays"): add one clarifying sentence —
   the Finish screen is the third CORE threshold screen but is summoned and holds no
   `thresholds_seen` state, which is why only two overlays ride that column.
3. Document the walk additions where the doc describes fields/kinds: the doors sub-phase now
   has FOUR fields (Title last, kind `sermon-title`, writes native `title`, never persists
   empty), and `QUESTION_WALK_ORDER` entries carry `questionLabel` (short label; map + handoff
   consume it). Also note `pastoral_context` now carries an overview (first-visit teaching).
4. Grep the doc for `questionPrompt`, field counts ("30"), and "Equip/Frame" references and
   fix any stragglers.

### S4. Doc drift — `docs/REFERENCE/schema.md`

- `current_sub_phase` row: sub-phase list still "Anchor / Outline / Equip / Frame post-workspace-restructure
  2026-05-10" — correct to the OEM shape (Assembly: Anchor | Outline; Manuscript: Body |
  IntroTransitionsConclusion) with a dated note.
- `last_assembly_subphase` row: same stale enum; note the current Assembly values (Anchor | Outline)
  and that legacy Equip/Frame values are rewritten by the v33 migration.
- `sermon_frame` row: "feeds Assembly's Frame sub-phase" — correct to: legacy column, Frame
  collapsed into the Manuscript doors 2026-07-02; data retained on disk, no walk destination.
- `title` row (if its description is bare): note it is editable from the walk's terminal
  Sermon Title field since 2026-07-02.

### S5. Canon authority-line harmonization — `docs/WORKSPACE-CANON.md`

The preamble ("Ground truth remains the code at HEAD — code wins any conflict") and premise 4
sit uneasily beside CLAUDE.md/README ("if code and docs diverge, the code is considered
incorrect unless an explicit rationale exists"). Harmonize with one clause added to premise 4
(and mirror in the preamble if natural): code wins conflicts **about the walk's current
shape**; where code diverges from `CORE.md` (the law) without a recorded rationale, CORE
governs and the code is the bug. Do not restructure the doc.

### S6. W11 — one-line legend alignment note in canon

In canon's "How movement works" bullet naming the three per-question states, append the
parenthetical: `(the map legend speaks them plainly: answered · started · not yet)`. No UI change —
the plain legend is deliberate.

### S7. Pastor's Charter phrase — FLAG, do not edit silently

`docs/PASTORS-CHARTER.md` says the system "asks its questions one at a time" and names Merida
("Merida names it adoration"). The charter is pastor-voiced and governed by `/anchor-update`;
propose the one-line rewording ("asks its questions in order, one field at a time" — and his
call on whether Merida's name stays in his own charter; it is a dev-facing doc, not app copy)
and make the edit only with his explicit OK in-session.

### S8. Stragglers sweep

- Grep repo docs for "six composites", "three lenient", "30 total", "one question at a time"
  and fix any file not already touched (CHANGELOG.md historical entries are history — leave them).
- `src/components/SermonWritingSurface.jsx` top-of-file N/A comment says the toggle renders on
  "exactly intro.redemptive_note and mps.gospel_check" — stale (Study grants render too); align
  the comment with the canon §5 grant list.

### S9. NOT in scope

- No gates/blocks/locked navigation; no AI anything; no toasts/step narration (standing law).
- W9/W10/R5/R9 (density) — deferred to lived prep; do not "fix" preemptively.
- FieldTeaching auto-open behavior — ruled kept; do not change.
- The two source audit docs — historical records; do not edit them.

## Part 3 — Verification + close-out

1. `npm run lint` (expect 0) and `npm test` (expect 297/297).
2. Preview: `?workspace=populated` boots; for S1, the not-found and error branches are hard to
   reach in preview — static verification + code review of the effect wiring is acceptable
   (per the standing pace ruling), but confirm the happy path still renders.
3. `/sweep-the-house` on the diff; resolve any WARN/FAIL.
4. `/end-session` — CHANGELOG entry covers BOTH sessions' work (Part 1 + Part 2; the first
   session deliberately left the tree uncommitted for this combined close).
