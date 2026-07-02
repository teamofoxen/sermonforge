# OEM Walk — Rulings Log

Started 2026-07-01. Companion to `oem-walk-packet-2026-07-01.md`.
Every ruling the pastor makes during the walk is recorded here as it happens,
then applied to code/canon per the Re-Foundation board's Phase-2 pattern
(SOLO edits + adversarial review before commit). Working file — uncommitted
until the walk's edits land.

**Walk order:** Stage 1 Outline → Stage 2 Equip → Stage 3 Manuscript → the
8-item decision agenda (packet Part 3). Finding 2 (Equip pedagogy-vs-map-math)
gets ruled inside the Equip stage.

---

## Stage 1 — Outline

**RULED (2026-07-01): fully RATIFIED, zero edits.**

- Hint — ratified.
- Teaching ¶1 (one sermon, in movements) — ratified.
- Teaching ¶2 (marks of strong points) — ratified AS-IS including the
  parentheticals ("mutually exclusive" / "application-shaped" / "progressive").
  Pastor: "These aren't seminary words." → Calibration for the whole walk:
  the jargon bar is seminary/exegetical vocabulary, not descriptive English.
- Teaching ¶3 (Merida's three traps) — ratified.
- Question prompt — ratified.
- Builder placeholder ("What does this movement of the text say to us?") —
  ratified (pastor asked for a suggestion; recommendation was keep).
- Builder buttons — ratified.

Deferred to agenda as planned: the name "Sermon Outline" (item 5), the
one-point lenient done-check (item 7).

## Stage 2 — Equip

**RULED (2026-07-01): copy fully RATIFIED; two decisions taken.**

- Hint, teaching ¶1–¶3, all four cell prompts, no-outline door, point headers —
  ratified. Application cell prompt ratified PROVISIONALLY (agenda items 3–4
  may add to it: gradient, idols probe, two-brothers, word to unconverted).
- **Finding 2 (pedagogy vs map math) — RULED: option (a), Scripture required.**
  The map's "answered" for Equip becomes: every outline point has Scripture +
  Explanation + Application filled; **Illustration never gates.** No per-cell
  N/A UI for equip cells. Teaching stays the law; the math obeys it.
  → CODE CHANGE (batched to end of walk): `sermonState.js` Equip answered
  logic (~:162-186) drops the illustration requirement.
  → RIPPLE flagged to pastor (pending his call): the question prompt's clause
  "every point needs explanation and application; Scripture grounds it" now
  undersells — with Scripture required by the math, the clause should name it,
  or we re-create the contradiction in the opposite direction.
- **Finding 3 (Word export strips labels) — RULED: keep as-is.** The exported
  manuscript stays unlabeled flowing prose (Scripture italic-gray); labels are
  build-time scaffolding, the page is for preaching. No code change.

## Stage 3 — Manuscript

**Stage-shape question — RULED (2026-07-01): shape RATIFIED, conditionally.**
No body-prose field is added to Manuscript; the body is written in Equip's
cells and that is by design. Pastor's articulation (verbatim, canon-worthy):
"The cells aren't the issue. It's not being clear on what belongs in a cell
that is. My understanding is that MPS flows to main points flows to functional
elements. If upstream is done well, there shouldn't be an issue."
→ The condition ("as long as writing prose within Equip's cells flows
naturally") puts the design burden on Equip cell clarity, not restructure.

Field-level rulings — **RULED (2026-07-01):**

- **Introduction — RATIFIED** (hint, ¶1–¶3, all three prompts). ¶3 ("You
  decided your hook… back in Frame") ratified PROVISIONALLY pending agenda
  item 8 — first casualty if the two-pass shape collapses.
- **Transitions — RATIFIED** across the board (hint, ¶1–¶2, prompt, row labels).
- **Conclusion — hint, ¶1, ¶2, ¶3 all RATIFIED** (¶3 kept as-is; my reword
  flag overruled).
- **Two-moves-one-box — RULED: SPLIT.** Conclusion becomes two prompts —
  summation, then response — like Introduction's three. → CODE CHANGE
  (batched): field def gains a `summation` question (manuscript column,
  section "conclusion"; additive key, old data unaffected); Word export
  prints summation before response (null-guarded); the Finish-screen lenient
  check stays on response alone until agenda item 7 rules. Draft prompt copy
  derives from ratified teaching ¶2 — pastor reviews wording at the batch
  review.
- **Equip manuscript-prose sentence — RULED: ADD, pastor's wording:**
  "Write each cell as the words you'll actually preach — what you write here
  becomes the body of your manuscript." Appended to Equip teaching ¶1.
  → CODE CHANGE (batched): sermonEquipFields.js overview ¶1.
- **Equip prompt Scripture clause — APPROVED as proposed** ("…but every point
  needs its Scripture, its explanation, and its application; illustration
  serves them, and only where it fits naturally").
  → CODE CHANGE (batched): sermonEquipFields.js question prompt.

**NEW BUILD ITEM (pastor-raised): the body as context in Manuscript.**
Pastor: "Why wouldn't we just export the body work done in Equip into the
next screen where intro, transitions and conclusion are added? That would
provide context for all 3." → See agenda item 8 discussion; shapes into the
reference-pane extension recorded there.

## Decision agenda

1. DEEP #1 adoration telos — *(IN DISCUSSION 2026-07-02, converging.)*
   RULED so far: the "pray yourself hot" export send-off AFFIRMED; **the CCS
   joins the reference pane in Body + doors** (the guard the copy invokes
   becomes visible where it's invoked). Finish-screen return accepted in
   principle, contingent on strengthening the forge itself.
   **Pastor's articulation of the missing layer (verbatim — canon-worthy,
   preserve in the teaching):** "A sermon can testify to Christ on paper.
   But the real magic is when Christ testifies to the people. Those are
   homiletical moves. And definitely controlled by the Spirit. But they
   start here. I'm really talking about the affections. Delight. Desire.
   … How does this sermon not only testify Christ, but show him to be
   better, more beautiful, more worthy…? How does Jesus, through this
   passage, become a safe place for sinners and a dangerous place for sin,
   because sin is shown to be what it is, and He is shown to be superior?"
   **RULED (2026-07-02) — the four-part extension adopted:**
   (1) CCS teaching gains a closing ¶ (after the Goldsworthy ¶), PASTOR'S OWN
   TEXT, adopted verbatim with one pronoun fix ("this passage" opens Q2):
   "A sermon can testify to Christ on paper; the aim is that Christ
   testifies to the people. How does Jesus, through this passage, become a
   safe place for sinners and a dangerous place for sin? How does this
   passage expose the paltry nature of sin in the light of the superiority
   of Christ? How does it lead us to obey Jesus not out of fleshly fear but
   simply because he is better?" *(amended "fear" → "fleshly fear",
   pastor, 2026-07-02)*
   (2) The CCS Statement prompt extends (existing question, second movement):
   what does the passage show Christ to be BETTER than; write the Statement
   so a listener could not only see him but want him. Per-unit table
   untouched — no per-unit affections grading.
   (3) The Body Application idols clause takes the expulsive form (idol
   named → Christ shown superior) — serves items 4.1 + 1 with one clause.
   (4) The Finish-screen mirror asks the completed question ("testify to
   Christ — and show him to be better?") + the "pray yourself hot" send-off
   at export. Study stays 23 fields; posture and prompt throughout.

**🏁 AGENDA CLOSED — ALL 8 ITEMS RULED. The walk is complete (2026-07-02).**

---

## Build state + structural-sweep checklist

**APPLIED 2026-07-02 (uncommitted; lint 0, tests green after each tranche):**
Equip/Body copy (prose sentence, gradient ¶, unconverted posture, idols/
expulsive extension, approved prompt, rebuilt Application hint) ·
CCS forge (pastor's affections ¶ incl. "fleshly fear" amendment, Statement
prompt second movement) · the door TRANSPLANT in sermonManuscriptFields.js
(header comment; Intro ¶1 rewritten minus Frame ref, ratified ¶2 kept
verbatim, new ¶3 = four moves + expectations-before-note teaching; opener/
bridge/expectation prompts merged decision+words; NEW `redemptive_note`
question with naAllowed + SADI strict semantics; Conclusion hint de-Framed,
engine ¶ transplanted, ratified "Land the ending" ¶ kept; single question →
`summation` + `response`).

**STRUCTURAL SWEEP — CODE COMPLETE 2026-07-02 (lint 0, 262/262 tests).**
Landed: contracts vocabulary (Body / IntroTransitionsConclusion) across all
three mirrors + last_manuscript_subphase column; walkOrder reorder + doors
frame-line override; v33 migration (column + full legacy-position rewrite;
thresholds_seen ids deliberately not rewritten — teaching re-shows once);
sermonState (column map, Body gating math, N/A sidecar read, 9-artifact
completeness, ruled doors check); Frame composites retired (gravestone note);
sermonFrameFields.js DELETED; N/A sidecar (redemptive_note_na) wired
three-deep (field-def flag / surface toggle mirroring PromptBlock / write
guard in handleManuscriptChange); pane passengers (PC + CCS in Body, PC +
CCS + assembled BodyRefItem at doors); Finish beholding moment + "pray
yourself hot" send-off (+ CSS); docx summation-before-response; search
hints/eyebrows; sample seed converted to the door shape (legacy plain-string
manuscript was invisible to the door fields — frame texts transplanted into
manuscript keys, sermon_frame seed emptied, landing position updated);
"Equip"-label sweep; SermonStartLanding confirmed derivation-driven (auto-new
shape). Straggler grep clean.

**ADVERSARIAL REVIEW (3 independent agents, 2026-07-02):**
- Reviewer 2 (walk logic / N/A) — **BUG-1 CONFIRMED + FIXED**: the transplanted
  `introduction.redemptive_note` was written/mapped/counted but NOT emitted by
  the docx export (the Conclusion split got its export update; the parallel
  Intro addition was missed). Fixed at electron/main.js (prosePara after
  expectation). Also fixed the stale "tags these with subPhase 'Manuscript'"
  header comment in sermonManuscriptFields.js. Everything else on that axis
  CLEARED (9 jumps resolve, column map complete, N/A sidecar consistent across
  all 4 sites, Body gating math correct, arcSummary coherent).
- Reviewer 1 (migration/data) — **BUG-2 CONFIRMED + FIXED**: `last_manuscript_subphase`
  was added to all three SERMON_COLUMNS allowlists but NOT to SPINE_ONLY_COLUMNS
  (where its Study/Assembly siblings live), so the renderer autosave would
  clobber the spine's fresh Manuscript position write → wrong sub-phase on
  re-entry. Fixed in contracts.ts + contracts.cjs. Everything else CLEAN:
  migration ordering (memory-col UPDATEs run before the current_sub_phase
  rewrites — deliberate), position rewrites land on real field keys, mirror
  vocabulary in sync, INSERT counts balanced (29/28+literal), version guard
  correct. Non-blocking note: legacy stage-level current_stage='Frame'/'Blueprint'
  untouched by v33 but degrades gracefully via coerceStage on read (no
  production sermons anyway).
- Reviewer 3 (export/seed/pane) — independently CONFIRMED BUG-1 **and caught a
  flaw in the BUG-1 fix**: the export needs `&& !introduction.redemptive_note_na`
  (the surface keeps text when N/A'd — "your words are kept" — so an N/A'd note
  would otherwise print). Guard added. Everything else CLEAN: conclusion export
  (both keys null-guarded, right order), seed transition keys match outline
  point ids (no orphans), parseManuscript accepts the seed, pane prop chain
  unbroken, beholding reads real values, no live import of the deleted
  sermonFrameFields. Seed-quality note (not a regression): the sample's 3 Body
  points had no `scripture` cell → "partial" under the ruled gating. **FIXED:
  added Romans 5:1-2 / 3-4 / 5 scripture cells so the showcase sample models
  the Scripture-grounds-it bar and reads "answered."**

**REVIEW COMPLETE — 3 bugs found + fixed (2 the writer missed, 1 flaw in a fix
the writer applied). Re-verified: lint 0, 262 tests, electron node --check clean.**

**/sweep-the-house: PASS** — no contract weakening (Process #2 6-composite
re-base is a ruled, lockstep-amended change, not covert); DB-safety/IPC clean.
Transparency note recorded: Intro/Conclusion content moved from composite-gated
to the ratified-lenient Manuscript check (ruled items 7-8).

**/simplify (report-only, 4 lenses): 7 quality findings, ZERO bugs, none applied
inline** — deferred to spawned follow-up task_3c66c93c ("Simplify OEM-walk N/A +
ref-pane duplication") so the behavior-sensitive N/A path isn't refactored
post-review, moments before commit. Findings: (A) manuscript N/A block duplicates
PromptBlock; (B) N/A allowlist hardcoded in 3 sites vs the envelope path's
field-def-driven form [highest value]; (C) BodyRefItem is 3rd copy of the
collapsible ref shell → extract RefSection; (D) bodyHasSubstance predicate
duplicated; (E) Body gating 2nd grid pass; (F) migration nits; (G) illustration-
never-gates string literal. All lenses independently CONFIRMED the sidecar
storage shape, migration ordering, and equip-key/Body-label decoupling are
correct at rest. Committing the verified functional diff now.

**REMAINING — before commit:** sermon-workspace.md mechanics rewrite +
ENFORCEMENT_STATUS rows (Process #2 = six composites; N/A rows) · the
sermon_frame legacy-data surfacing question (pastor input: in-flight sermons'
frame answers are on disk + searchable but not shown in the walk) ·
adversarial review of the whole diff · /sweep-the-house · /end-session.
*(The numbered checklist below is the original worklist, retained as the
historical record of what the sweep set out to do:)*
1. ⚠ **redemptive_note N/A persistence needs a mechanism**: the `manuscript`
   column stores plain strings, NOT {value,na} envelopes — the naAllowed
   toggle can render but na can't persist as-is. Design at sweep (envelope
   that key, or sidecar flag); keep SADI strict semantics + T19 allowlist.
2. N/A allowlist plumbing moves: sermon_frame `intro.redemptive_note` →
   manuscript `introduction.redemptive_note` (write path, PromptBlock,
   contract tests).
3. Word export: print `summation` before `response` (null-guarded).
4. Doors lenient check (item 7): opener answer + response; transitions
   exemption explicit; map math for Body = Scripture+Expl+App per point
   (illustration never gates) in sermonState.js.
5. Walk reorder: Frame region unregistered; sermonFrameFields.js retired;
   Assembly = Anchor + Outline; Manuscript = Body (equip defs) + doors;
   walkOrder.js, map regions, place/arrival lines, Finish artifact list.
6. Pane: PC + CCS + assembled body join "Your work" in Body + doors stages.
7. Finish screen: mirror (CCS + MPS under "testify to Christ — and show him
   to be better?") + "pray yourself hot" send-off at export.
8. "Equip" label sweep (incl. search eyebrow "EQUIP · SERMON BODY"; Study
   Personal Implications overview's "fully in Equip later" line).
9. sermon_frame legacy data surfacing → decision brought to pastor.
10. Constitutional docs: **CORE + CORE-CHANGELOG + canon DONE 2026-07-02**
    (stage model, 7 outcomes, 6 composites, Principle scope note, §§1–7 +
    provenance; canonical sub-phase name = the pastor's literal "Intro,
    Transitions, Conclusion"). REMAINING: sermon-workspace.md (moves WITH
    the code sweep — mechanics follow code), ENFORCEMENT rows; check
    sfdi/sadi consistency validators for SERMON_FRAME_FIELDS references.
11. **SermonStartLanding (the initial workspace overview / arc summary):
    update to the new shape** (pastor-flagged 2026-07-02 — it lists the old
    Assembly regions + outcomes).
12. Tests/fixtures/sample seed updates; adversarial review of the whole
    diff; /sweep-the-house (contract-sensitive paths touched); /end-session.

**DEFERRED FOLLOW-UP (pastor-flagged 2026-07-02, NOT this build):** the
sermon-start landing needs a content-design pass of its own — "It's just an
outline. Doesn't really explain well." The sweep only trues it up to the new
shape; the explain-it-well rewrite is a later walk.
2. DEEP #2 construction-stage congregation — **RULED (2026-07-02): YES.**
   The reference pane's "Your work" tab carries the Pastoral Context answers
   (named room, cost and gift) into the **Body stage and the doors stage**.
   Entailed by the item-4.2 prompt language + the ratified "no coordinates
   the screen doesn't show" rule. No inline per-point clutter.
3. Application gradient lands in Equip/Body — **RULED (2026-07-02): option
   (b).** The necessary/probable/possible gradient goes into the Application
   cell's PROMPT (at the moment of writing: know how firmly the text holds
   it; never preach a possible as a command) + a supporting teaching
   paragraph. No structured grading UI. Makes good on the Study overview's
   "you'll grade your actual sermon applications fully in Equip later."
4. Rest of the application battery — **RULED (2026-07-02): all three per
   recommendation.** (1) Idols-of-the-heart probe: clause in the Application
   prompt + expansion in the Keller-reframe teaching paragraph. (2)
   Two-brothers at application: the prompt sends the pastor to the room he
   named in Pastoral Context, both brothers. (3) Word to the unconverted:
   teaching-level posture in Body ("where the text gives it") — no per-point
   quota. **Pastor's governing principle, verbatim: "Posture and prompt is
   right."** Copy cost: the Application cell prompt grows ~2 → ~4 sentences.
5. Ratify/rename "Sermon Outline" / "Sermon Body" — **RULED (2026-07-02):
   both names RATIFIED.** "Sermon Body" is produced by the Manuscript "Body"
   stage; "Sermon Outline" by Assembly's Outline. Knowing consequence: the
   label "Equip" retires from the walk (the four-elements pedagogy lives on
   inside Body).
6. The field-by-field walk itself (= Stages 1–3 above) — **DONE** (all
   rulings recorded in the stage sections above).
7. The three lenient done-checks — **RULED (2026-07-02): all three KEPT
   lenient in spirit**, mechanically updated for the new shape (doors check
   = an opener answer + the response); the transitions exemption is now
   EXPLICIT and deliberate (preachable without written bridges; the map
   still tracks them honestly).
8. Frame → Manuscript doubling — **RULED + CONFIRMED (2026-07-02): THE COLLAPSE.**
   The Frame stage is retired as a separate stop; its seven moves TRANSPLANT
   into the Manuscript door fields — one surface, at the end, each prompt
   asking the decision and the preached words together. Two governing
   conditions (pastor's): (1) **no dumbing down** — SADI's ratified richness
   carries at full strength, the merge adds writing space; (2) **exploit the
   position** — prompts get explicit about the already-written body ("your
   points," "where your final point landed"). Final walk shape CONFIRMED:
   **Study → Assembly (Anchor, Outline) → Manuscript (Stage 1 "Body" = the
   Equip work, moved; Stage 2 Intro/Transitions/Conclusion = merged rich
   door fields).** Assembly = decide; Manuscript = write; doors written last
   against a finished body ("prepared near-last" preserved).
   Consequences accepted: "Sermon Frame" outcome retired (8 → 7, CORE + canon
   constitutional amendment); Intro ¶3 dies and is rewritten; conclusion
   summation/response split becomes the merge scaffold (summate → summation;
   land_call + gospel_empower → response); redemptive_note keeps a home and
   its N/A-allowlist semantics move with it; existing sermon_frame data stays
   on disk, surfacing handled at build (brought to pastor, not decided
   silently). **Pastor waived review of the transplant copy** ("no need to
   bring me the transplant copy — start working"); adversarial review before
   commit still applies per the house pattern.
