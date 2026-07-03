# SermonForge Changelog

---

## 2026-07-03 — Architecture-normalization governance (docs-only)

- Updated governance docs (`docs/CORE.md`, `docs/RULES.md`, `CLAUDE.md`) to distinguish speculative refactoring / aesthetic cleanup / rewrites from evidence-based architecture-normalization planning — conservative in implementation, directional in architecture.
- CORE gained an Architecture Direction subsection, State Contract clause 6 "One source for each canonical truth" (old clause 6 → 7), and three planning-only Test questions (evidenced drift, future pastor-facing trust risk, smallest seam); latent drift is contract-relevant before a visible UI break. Dated per-clause provenance in `docs/CORE-CHANGELOG.md`.
- RULES/CLAUDE operating guidance requires named evidence, planning-only authorization (implementation separately approved), test-before-move, one seam at a time, explicit non-goals, and stopping when the evidenced drift is removed.
- No source code, schema, migrations, product behavior, or pastor-facing copy changed.

---

## 2026-07-03 — getTightenedMainPoints DRY helper (Track E follow-up)

- Extracted `getTightenedMainPoints(mppData)` in `src/utils/studyFields.js` — the single accessor for the two tightened Main Point outcomes.
- Rewired both read sites onto it: the Word export (`buildManuscriptExportPayload`, raw) and the reference pane (`SermonWorkspace.jsx`, `.trim()`ed), so the field/question-key spelling lives in one place.
- Behaviour-preserving — export payload + reference-pane output byte-identical (E2 export pin + sampleData export test green); suite 347, lint 0.

---

## 2026-07-03 — Workspace architecture Track E complete: Main Point single-sourced, transitionState removed

- E2 — the Word manuscript export derives MPT/MPS from the `main_point_pair` envelope (`buildManuscriptExportPayload`), not the flat `mpt`/`mps` columns.
- E3 — retired the live flat `mpt`/`mps` mirror write from `useWorkspaceMutations`; schema columns kept, no migration, direct `apply-mutation(field=mpt/mps)` preserved.
- E4 — removed the vestigial `transitionState` writer, its `transition-state` IPC handler, the test-spine fixture mirror, and two `SPINE_ONLY_NAMES` allowlist entries.
- Strengthened the no-caller tripwire to guard `transition-state` op-literal reintroduction (fixed a CRLF comment-strip bug); reconciled the now-stale auto-sync / spine-written doc + comment sites.
- Behaviour-preserving; position stays in `last_touched_position`; suite 347, lint 0, spine-integrity OK, drift-check PASS.

---

## 2026-07-03 — Workspace architecture Track D complete + Track E/E1 tripwire

- Extracted the 995-line `SermonWorkspace` god component (finding A) into four behaviour-preserving hooks — `useWorkspaceSave`, `useWorkspaceCompletion`, `useWorkspaceMutations`, `useWorkspaceNavigation` — leaving a 687-line coordinator shell.
- Added regression pins for the relocated seams: close/quit flush (`exit-flush-persist`), the save-before-move timer-bite, threshold lifecycle, and Finish open/close.
- Track E/E1 — `transition-state-no-caller` tripwire locks the vestigial position path (static `src/` scan, red-tested against an injected caller).
- Doc-ownership sync: `docs/SYSTEMS/sermon-workspace.md` now describes the four-hook coordinator shell; pure threshold-visibility reads stay in the shell by design.
- Behaviour-preserving throughout; suite 330 → 344, lint 0, spine-integrity OK, drift-check PASS.

---

## 2026-07-02 — Workspace architecture Track C/Gate 3: three correctness seams closed

- C1 — six content handlers now read their merge base from `sermonRef.current`, so two same-column writes in one React batch no longer drop the first.
- C2 — `handleExport` flushes via `debouncedSave.flush()` instead of bare `persistUpdate`, clearing the debounce timer so no duplicate write / "Saving…" flicker fires after export.
- C3 — `SaveState` gains an optional `saveErrorMessage`; `persistMutation` carries `mapError(err,"save")` and the save chip renders it (falling back to "Save failed"), so a failed save speaks the app's one voice.
- Added same-column-write, flush-no-redundant-write, and c3-save-error-message tests + extended mutation-3; each verified fail-before / pass-after.
- No sermon-walk / completion / navigation / schema / export / close-quit change; retry + success + debounce semantics unchanged; suite 328 → 330, lint 0, spine-integrity OK, drift-check PASS.

---

## 2026-07-02 — Workspace architecture Track B/Gate 2: invariant tests pin the seams

- Added 7 invariant-test files: completion-consistency across map/handoff/Finish (with the M2 regression pin), question-kind parity across field defs / renderer / state derivation, and a retired-composite/vocabulary tripwire.
- Added load-failure-vs-not-found, resume-position (+ spine-only write guard), and standing-prohibition guards (no gates / AI authorship / movement narration).
- Fixed the stale AI-mutation tests: rewrote `mutation-1` / `process-5` onto the real one-kind path and removed the fixture's dead `ai_proposal` / `ai_apply` branches to match production.
- Corrected the `ENFORCEMENT_STATUS.md` Mutation #1 row and added a mutation-kind parity test.
- Suite 297 → 326; no production code changed; lint 0, spine-integrity OK, drift-check PASS.

---

## 2026-07-02 — Workspace architecture audit + governance plan; Track A/Gate 1 drift & dead-code cleanup

- Added the sermon-workspace architecture-fragility audit (7-lens, adversarially verified — mostly latent, 0 High) and a gated Track A–E remediation governance plan under `docs/AUDITS/`.
- Track A cleanup: deleted zero-caller dead code — `checkField3Composite` + `canvasHasMainWithModifier` and the dead public `fieldQuestions` normalizer.
- Replaced hard-coded search-hint stage/sub-phase literals with the canonical `STAGE`/`SUB_PHASE` enums; trimmed inert `current_stage`/`current_sub_phase` from the FTS result payload.
- Corrected stale docs/comments: schema v32→v33 (+ `last_manuscript_subphase` row), Blueprint/Frame coercion comments, composite-count comments, "one field at a time".
- No sermon-walk / completion-policy / navigation / persistence / shell / UX behavior change; lint 0, tests 297/297, spine-integrity OK, drift-check PASS.

---

## 2026-07-02 — Workspace audit remediation closed: rulings shipped, W4 fixed, doc drift resolved

- Content rulings shipped: field-level walk vocabulary, gospel-grounding split, scholar names removed from pastor-facing copy, and the terminal Sermon Title field (never persists empty).
- W4 fixed: a sermon load failure now shows a retryable message instead of silently reading as "Sermon not found."
- Completeness re-based to five composites + four lenient checks (M2 ruling); the stale six/three count fixed across canon, the workspace spec, ENFORCEMENT_STATUS, and schema.md.
- Pastor's Charter reworded to match the field-level walk language.
- WORKSPACE-CANON authority line harmonized with CLAUDE.md's code-vs-CORE precedence.

---

## 2026-07-02 — Thought unit = block: Divisions↔Synthesis seam ruled and built; sample sermon rebuilt end-to-end

- Pastor ruled a thought unit is the block — the margin statement plus every line indented beneath it, spanning its verses; `composeThoughtUnitBlocks` (studyFields.js) composes blocks and verse spans live from the canvas at read time, stored shape unchanged, no migration.
- The three cumulative tables render each unit as its full indented block labeled "vv. X–Y"; map partial labels gain verse spans; WORKSPACE-CANON §2 and sermon-workspace.md amended with the ruling.
- Sample sermon Divisions rebuilt to the ruled shape: five ESV block-units with verse gutter, all three cumulative columns authored per unit.
- Fixed `load-sample-sermon` INSERT silently dropping `main_point_pair` (Anchor rendered empty in-app) and seeded `tags` plus the three per-stage notebooks.
- Seed-lock tests added: every walk question must derive "answered" and the Word-export payload must be fully populated — 297/297 tests, lint clean, sweep PASS.

---

## 2026-07-02 — Repo-root document sweep: five handoff docs relocated to docs/handoff/

- Moved five dated, spent session artifacts from the repo root into `docs/handoff/` (its existing home for this doc shape): `doc-drift-report-2026-07-01.md`, `oem-walk-packet-2026-07-01.md`, `oem-walk-rulings-2026-07-01.md`, `ux-audit-prompt-2026-07-02.md`, `ux-audit-report-2026-07-02.md`.
- Updated every live pointer to the old repo-root paths (CORE.md, CORE-CHANGELOG.md, WORKSPACE-CANON.md, sermon-workspace.md, refoundation-initiative.md, and four code comments) — CHANGELOG entries and the moved docs' own frozen bodies were left untouched as historical record.
- `sermonforge-design-context.md`, also loose at the root, turned out to be deliberately gitignored (not tracked, not part of the shared repo) — left alone; it's stale local scratch, not sprawl in the shared corpus.
- Verified: drift-check PASS (zero broken references), the touched test file's 24 tests pass, `node --check` clean on every touched JS/Electron file.

---

## 2026-07-02 — Workspace UX audit (CORE × Pastor's Charter): executed, remediated, verified

- Ran the chartered workspace UX audit (ground truth → rendered walk → five lens sweeps → adversarial verification) to 16 confirmed findings, 2 High; report at `ux-audit-report-2026-07-02.md`.
- Remediated all 16: confirm-gated outline-point removal and canvas-edit data loss (live-fire tested in preview), a missing ESV-failure voice on the Study→Anchor handoff, a Finish-vs-rest-of-app completeness contradiction, labeled Back, topbar sermon identity, map stage labels, and stale-copy fixes.
- Extracted `src/components/EsvRecovery.jsx` to de-duplicate ESV-recovery logic across the reference pane, passage popup, and handoff — the mandatory `/simplify` pass's one real finding.
- 282/282 tests pass, lint clean, `/sweep-the-house` → PASS; no contract weakened, no IPC/schema changes.

## 2026-07-02 — Pastor's Charter: extraction, fidelity audit, revised draft (placement open)

- Synthesized the five pastoral convictions beneath docs/CORE.md; analysis-only session — no code or docs changed.
- Drafted a one-page explanatory Pastor's Charter; CORE remains the sole normative authority and the Charter creates no requirements.
- Paragraph-level fidelity audit classified five sentences speculative (doctrine supplied where CORE stays tool-scoped); all five corrected plus three minor wordings.
- Revised Charter passed per-paragraph adversarial verification; placement (docs/PASTORS-CHARTER.md vs CORE preamble) and pronoun register await the pastor's ruling.
- Charter text preserved in memory and in the untracked repo-root handoff ux-audit-prompt-2026-07-02.md for the next session's workspace UX audit.

## 2026-07-02 — N/A code build: Study-question grants + per-cell cumulative-table N/A

- Built the ruled-but-unbuilt N/A policy (canon §5, ruled 2026-06-14): declared Study questions may now be marked "nothing here / doesn't apply" and count as done — Observe Where/When, Cross-References/Commentary (field-level), Redemptive Thread's four ways, and Implications Fields 1–2.
- Per thought-unit *cell* on the three cumulative tables (Meaning / Christ-Connection / Implication) may be marked N/A via a `<column>_na` sidecar on the row; the three composites, the map, and the handoff's unfinished list all honor it, and it is preserved across canvas re-derivation.
- The grant list is bound to the canon's (narrower-than-SFDI) named set to avoid weakening the completeness signal; widening to the fuller SFDI set is a future pastor decision, not drift.
- `normalizeField` now propagates a field-level `naAllowed` onto a single-question field's synthesized question; the named-outcome paragraphs stay no-N/A.
- Focused adversarial review returned SOUND (no bugs); added `sermonNaPolicy.test.js` (8 tests) covering the grant list, per-cell honoring, and canvas preservation; lint clean, 276 tests green.

## 2026-07-02 — OEM-walk quality cleanup (reuse + altitude, no behavior change)

- The manuscript-prose N/A block now reuses the existing `PromptBlock` component instead of re-implementing it, and the three reference-pane items (RefItem / OutlineRefItem / BodyRefItem) share a single extracted `RefSection` collapsible shell.
- The manuscript N/A allowlist is now one field-def-driven helper (`isManuscriptNaAllowed`, mirroring the envelope path's `naAllowed` read) instead of a hardcoded `section === "introduction" && key === "redemptive_note_na"` check, so adding an N/A-able door is a one-line field-def edit.
- The "illustration never gates" rule moved from a string literal in the map engine to a `gating: false` flag on the illustration element def; the Body gating check folds into the existing single grid pass; the "point has substance" predicate is a shared `bodyHasSubstance` helper.
- Added `sermonBodyGating.test.js` (6 tests) covering the Body map-gating ruling, which previously had no coverage; migration cosmetic nits (redundant `IS NULL` guards dropped, `IN` → `=`).
- Verified behavior-preserving: lint clean, 268 tests green, `node --check` clean; deferred from the OEM-walk restructure commit so the just-reviewed N/A path got its own verification.

## 2026-07-02 — OEM walk: the Frame → Manuscript collapse (decide/write boundary)

- The pastor walked the Outline/Body/Manuscript stages and ruled the stage boundary as decide-then-write: Study understands → Assembly (Anchor, Outline) decides → Manuscript (Body, then Intro/Transitions/Conclusion) writes; Equip moved into Manuscript as Body, the Frame sub-phase retired and its seven moves transplanted into the door fields (each door prompt now asks the decision and the preached words together). Schema v33 migrates every legacy position.
- Named outcomes 8→7, completeness composites 8→6 (Intro/Conclusion retired), Conclusion split into summation + response; the three lenient Outline/Body/Manuscript checks ratified lenient; CORE, CORE-CHANGELOG, WORKSPACE-CANON, ENFORCEMENT_STATUS, and sermon-workspace.md amended in lockstep.
- Merida content landed as posture+prompt (no new fields): the affections layer in the Christ-Connection forge (the pastor's own "safe place for sinners, dangerous place for sin" text), and the necessary/probable/possible gradient + idols-of-the-heart + two-brothers + word-to-the-unconverted in Body's Application prompt.
- The reference pane now carries Pastoral Context, the CCS, and the assembled body into the Body and door regions; the Finish screen opens with a beholding moment (CCS + MPS read back under "testify to Christ — and show him better?") and closes with a "pray yourself hot" export send-off.
- Three-agent adversarial review caught and fixed three bugs before commit (the transplanted redemptive note never exported; it printed even when marked N/A; `last_manuscript_subphase` missing from `SPINE_ONLY_COLUMNS`); sweep-the-house PASS, lint clean, 262 tests green.

## 2026-07-01 — OEM walk prep audit + dead-code cleanup

- Ultracode audit (8 agents) verified every pastor-facing string in the Outline/Equip/Manuscript draft stages against code at HEAD; the "overview teaching blocks render nowhere" finding from 2026-06-09 is stale — they render live via FieldTeaching.jsx. Walk prep packet + 8-item decision agenda written to `oem-walk-packet-2026-07-01.md`.
- Real findings for the walk: Equip's prompt blesses uneven point coverage while the map requires all points × 4 cells filled to read "answered"; the Word export strips Equip's on-screen element labels to unlabeled prose.
- Removed dead `heavyLifting` field-def metadata (7 files, zero consumers) and the uncalled `assembleManuscriptText` (`src/utils.js`, orphaned since ARI removed its AI callers); fixed a stale "dead data" comment in `FieldTeaching.jsx` describing the very block it renders.

---

## 2026-07-01 — Charter stamping: shipped charters get historicized automatically

- New standing rule: a charter gets its ⛔ HISTORICAL RECORD stamp the day its build ships — live-dressed shipped plans were where today's drift sweep found its staleness; banner-stamped docs had none.
- drift-check.sh gained C8, an advisory that flags PROPOSALS docs whose status reads SHIPPED with no remaining-work marker and no stamp; /end-session gained STEP 1.5 telling the session how to act on it (stamp + move the ANCHORS entry).
- Stamped three: the Series Planner revival charter and Coverage Initiative charter (moved to ANCHORS Historical record), plus the ARI charter — caught by C8 itself, its status head still said "Pre-execution" from May despite shipping fully on 2026-05-09.
- Verified both directions: C8 flagged all three before stamping, reports none after; drift-check PASS.

---

## 2026-07-01 — Fonts self-hosted; drift-sweep tail items closed

- The app's three typefaces (IBM Plex Serif/Sans, JetBrains Mono) now ship inside the app (`src/styles/fonts/`, ~1 MB woff2) instead of loading from Google Fonts — the last non-essential network call is gone and typography renders correctly offline; verified zero external font requests in preview.
- privacy.md is back to "three things talk to the network, and only these three," with the fonts episode noted; CORE/ipc/RULES/project-structure re-propagated.
- `sfdi-cross-doc-consistency.py` C3 now derives the live per-phase field counts from `studyFields.js` instead of hardcoding them, so a future field change forces the workspace doc to follow the code.
- The dead `FEEDBACK_TOKEN` repo secret was deleted from GitHub (its only consumer was removed in the public-launch hardening pass; feedback runs through the Cloudflare Worker).

---

## 2026-07-01 — Doc drift sweep: 98 corrections, dead disk-write banner deleted

- An adversarially verified drift sweep fixed 98 false present-tense claims across 19 binding/live docs plus CLAUDE.md — headline corrections: CORE's legacy-DB resolver now states the row-count-wins rule (recency-wins was the 2026-05-02 data-loss bug), RULES' layout spec matches the shipped dark topbar, and privacy.md/CORE now disclose Google Fonts as the fourth outbound network destination.
- privacy.md and both BTI cohort docs trued up: crash events carry a ≤500-char error string (never log lines), only `app-open`/`crash` actually emit, the tester ID survives reinstall, and the tester letter no longer promises the deleted tour or the retired Blueprint tab.
- Deleted the dead disk-write banner stack (App.jsx banner + `db-write-error`/`db-write-ok` events + `db-flush` channel) — main never emitted the events post-driver-swap; save failures surface via `persistMutation` save state; the shared `.write-error-banner*` CSS stays (OneDriveWarning renders with it).
- `sfdi-cross-doc-consistency.py` C3 now asserts frozen SFDI 8/8/5/4 and live 7/7/5/4 separately (both validators exit 0 again); a stale "8 fields" comment fixed in studyFields.js.
- CI no longer writes the vestigial `GITHUB_FEEDBACK_TOKEN` into a build-time `.env`; the repo secret is deletable.

---

## 2026-07-01 — Divisions verse gutter: pastor-editable verse numbers

- The verse-number gutter is now an editable field, not a read-only label — the pastor can click any auto-filled number and fix where the auto-fill misjudged a verse boundary.
- The gutter accepts only verse-label characters (digits, colon, hyphen; six max), so a stray keystroke can't drop sermon text into the numbered rail.
- The blank-canvas re-seed guard now counts a hand-set or saved verse label as content, so an edited gutter sticks instead of being re-derived from the seed.

---

## 2026-06-27 — Divisions verse gutter: seed on a blank canvas + cross-chapter ranges

- The verse-number gutter now seeds whenever the Divisions canvas has no typed text, not only when the row array is empty — so clearing the field re-fills the numbered rail (and a sermon begun before the feature can surface it this way).
- Cross-chapter passages now seed: the gutter rolls across the chapter boundary using canonicalBooks verse counts, labeling "chapter:verse" at the seam (Ecclesiastes 5:8-6:12 → 5:8 … 20, 6:1 … 12) and bare verses between.
- Replaced `versesForSingleChapterRange` with `verseLabelsForRange` (string labels) and widened the gutter to fit the chapter-prefixed labels.

---

## 2026-06-27 — Divisions canvas: prepopulated verse-number gutter; remove dead IndentedSentenceCanvas

- The Divisions structure canvas now prepopulates verse numbers in a static left gutter for single-chapter passages (deterministic lookup via new `versesForSingleChapterRange`); the pastor still types the text by hand.
- A number marks only where a verse begins — continuation/indented rows keep a blank gutter, and the indent now rides on the text so the numbers stay pinned left.
- Removed the orphaned `IndentedSentenceCanvas` component, its test, its `.indented-canvas-*` CSS, plus the now-unused `generateRowId` and `.paraphrase-blocks` dead CSS (the live canvas is `PassageCanvas`).
- Struck the confusing "rewrite each main sentence in your own words" line from the Divisions overview — that in-voice work lives downstream in Interpret's Meaning column.

---

## 2026-06-27 — Passage lookup reader: opens top-left + previous/next chapter navigation

- The reading window now opens anchored just below the Passage lookup box (top-left, where you're working) instead of the CSS-default top-right.
- Added "‹ Previous" / "Next ›" chapter buttons to the reader: steps one chapter at a time, rolls across book boundaries in canonical order, disabled at Genesis 1 and Revelation 22, and reloads in place without moving the window.
- Chapter stepping tolerates verse-range refs (e.g. Ecclesiastes 5:8-13 → next → Ecclesiastes 6).

---

## 2026-06-27 — Passage lookup as an ESV-style dropdown box; sermon title/passage shown read-only

- Rebuilt the workspace Passage lookup as a box-with-caret dropdown (ESV.org style): Old/New Testament tab → book → chapter → verse (whole chapter, single verse, or start-then-end range), opening a draggable reading window with section headings; new `PassageLookup.jsx` + `passageLookup.css`.
- Simplified `PassagePopup` back to a display-only reader with a `headings` prop (picker logic moved into PassageLookup).
- Removed all inline editing of the sermon title/passage from the workspace (set in the sermon modal): top-bar title display + pencil gone, passage now shown as a read-only label above the reference-pane text.
- Re-anchored the Process #4 shell test to the Observe region (the removed title was its old mount signal); cleaned up the orphaned title/picker CSS.

---

## 2026-06-27 — Passage lookup: top-left standalone Bible window (book → chapter → verses), decoupled from the sermon passage

- The workspace top-left is now a single "📖 Passage lookup" launcher; removed the sermon-passage chip, the edit pencil, and the redundant right-side button.
- The lookup window navigates by book → chapter → verses (whole chapter, single verse, or click start-then-end for a range), driven by canonicalBooks' per-chapter verse counts; loads with section headings.
- It never touches the sermon's preaching passage — that is set in the sermon modal now and still shows in the reference pane; removed the workspace's passage view/edit/popup machinery.
- Cleaned up the orphaned `.passage-ref*` / `passage-bar-hint` styles.

---

## 2026-06-27 — Bible lookup window: book→chapter picker, decoupled from the sermon passage

- Added a "📖 Look up a passage" launcher in the workspace passage bar that opens a standalone, draggable Bible window (PassagePopup `browser` mode) — independent of the sermon's passage, usable for the before/after fields or any lookup.
- The window navigates by a book list (hover/focus a book reveals its chapters) → click a chapter → loads that chapter's ESV with section headings; header shows the reference, "‹ Choose another passage" returns to the picker.
- Removed the confusing "← click to see passage" hint from the passage bar.
- Reverted the side-pane "Show surrounding context" toggle and the before/after question notes from earlier today (replaced by this window); kept the `headings` IPC plumbing the window uses.

---

## 2026-06-27 — Reference pane: surrounding-context view (full chapters around the preaching range, with headings)

- Renamed the passage toggle "Show surrounding chapter" → "Show surrounding context"; it now opens the full chapter before the preaching range's start through the full chapter after its end (e.g. Ecclesiastes 5:8-6:12 → Ecclesiastes 4-7), so a unit that straddles a chapter line shows both seams.
- The surrounding view includes Crossway's section headings (pericope markers); threaded an optional `headings` flag through the passage-fetch IPC chain (database → preload → main), cached separately from the tight passage view.
- Added an instructional note beside the Observe before/after questions pointing the preacher at the "Show surrounding context" toggle.
- Folded in a pre-existing Observe overview edit: the paragraph now points ahead to the seven observation fields instead of the floor/ceiling phrasing.

---

## 2026-06-27 — Reference pane: "Show surrounding chapter" toggle on the passage panel

- Added a "Show surrounding chapter" link at the top of the passage panel whenever the passage has verse numbers (e.g. "Ecclesiastes 5:8-6:12").
- Clicking it swaps the ESV panel from the specific pericope to the full chapter(s), so questions like "What happened before this passage?" can be answered without leaving the app.
- "My passage" link toggles back; ESV chapter is cached so subsequent toggles are instant.
- Toggle hidden automatically when the passage is already set to a whole chapter.

---

## 2026-06-26 — Sermon workspace: doors get a return path + the top-bar Back names its destination

- The writing surface's "upstream not built" doors (e.g. "Lay out the passage's structure") now stash where you came from and show a gold "↩ Return to [field]" banner, so the one-way jump the doors' own copy promised ("come back") finally has a way back.
- The return banner clears the moment you navigate any other way (chevron / map / handoff / finish), so a stale link never lingers.
- Top-bar Back relabeled "Back" → "Back to dashboard" so it's not mistaken for an in-walk back; both changes strengthen CORE Surface Contract #5.
- New `onDoorJump` / `returnTo` / `onReturn` wiring on `SermonWritingSurface`; the fixture mirrors it for the `?surface=writing&field=ccs&units=0` preview.
- Verified: eslint 0, 278 tests, browser preview (door → banner → return → clear-on-nav), no console errors.

---

## 2026-06-26 — Standalone sermons: passage-led modal (book tracked) + surfaced in the By-book lens

- NewSermonModal's standalone mode now leads with the shared `BookSelect` + a chapter:verse field that compose the passage (like the topical planner rows), so a one-off sermon's `book_id` is captured and book/passage can't disagree.
- Dropped the required title field — a title is a late-prep act, so a standalone sermon is born named by its passage (State #3 satisfied) and titled later in the workspace; `book_id` rides a create-then-update follow-up.
- `computeArc` now folds standalone (no-series) sermons into the "By book" lens: grouped by book in a new "Standalone sermons" card off the timeline, and counted in the Balance with per-sermon date windowing.
- Hardened `classifiedGenre` for a null series (the one-off path); `ArcFixture` seeds one-off sermons for the `?arc` / `?preached` previews.
- Verified: eslint 0, 278 tests (+4 arc), `?arc` preview shows the card + correct balance, no console errors.

---

## 2026-06-25 — Series Planner audit remediation — topical passage hardening + doc-drift fixes

- Extracted topical passage composition to `src/utils/topicalPassage.js` and fixed three flaws: picking a book no longer doubles a mismatched legacy book name, name-stripping respects word boundaries ("Jobs"≠"Job"), and a malformed chapter:verse is caught — 19 new unit tests.
- Topical sermon rows now show an inline "Couldn't read" hint for an unparseable chapter:verse (the Coverage panel that flags this is hidden for topical).
- Rewrote `docs/SYSTEMS/series-planner.md` for both Book and Topical modes, the sermon-grained Arc / "What I've Preached" reach, and schema v32.
- Stamped charter Ruling 6 superseded (per-sermon `book_id` + sermon-grained Arc shipped) with a reciprocal pointer from the Coverage charter.
- Corrected stale `sort_order`/ordering notes in `ipc-channels.md`, `schema.md`, and the `main.js` v30 comment; refreshed `Arc.jsx`. Verified: eslint 0, 274 tests, sweep + drift PASS.

---

## 2026-06-25 — Coverage Initiative Phase 4 — the "What I've Preached" two-lens home

- New "What I've Preached" home (the renamed Series Arc sidebar entry) holds two lenses behind tabs: "By book" and "By topic".
- By book — the sermon-grained Series Arc rendered embedded (the home owns the header + tabs, so the Arc drops its own).
- By topic — a new `TopicsView`: a topic rail (with counts) → the sermons under the selected topic, each clickable to open; browse-only, never a scorecard or gap-finder.
- Sidebar relabeled "Series Arc" → "What I've Preached" (the `VIEW.Arc` key is unchanged for routing stability); added a `?preached` preview fixture.
- Verified: eslint 0, 168 unit/contract tests, `/sweep-the-house` PASS, browser preview of both lenses (no console errors). Completes the Coverage Initiative.

---

## 2026-06-25 — Coverage Initiative Phase 3 — sermon-level topic tags

- Schema v32 — `sermons.tags` (JSON array, `thresholds_seen` pattern); additive, rides the workspace autosave, synced across all three allowlist mirrors + schema/database/IPC docs.
- The sermon workspace gains a "Topics" field: free-form tag chips with a native autocomplete drawn from the pastor's own prior tags (AI-free anti-drift); optional and partial.
- New read-only `get-all-tags` spine op returns the distinct, sorted topic tags across all live sermons (fail-soft scan); feeds the autocomplete and the future Topics lens.
- Added `src/utils/tags.js` (`parseTags`/`serializeTags`/`dedupeTags`, fail-soft) and `TagInput.jsx`, with unit tests.
- Verified: eslint 0, 78 unit/contract tests, `/sweep-the-house` PASS, browser preview (add/remove/de-dupe, no console errors).

---

## 2026-06-25 — Coverage Initiative Phases 1+2 — structured per-sermon book + sermon-grained Series Arc

- Schema v31 — `sermons.book_id` (nullable), the structured per-sermon canonical book for topical series; additive, create-then-update, synced across all three allowlist mirrors + schema/database docs.
- Topical Outline sermon rows now author the passage with a Book picker + a chapter:verse field that compose the `passage` string, so the book and the passage can't disagree.
- Series Arc reworked from series-grained to sermon-grained: each sermon counts its effective book (`sermon.book_id ?? series.book_id`), so a topical series shows its full genre spread (rows read "Mixed"/"OT · NT"); with no sermons loaded the model degrades to the old per-series grain.
- Added the `effectiveBookId` helper, five sermon-grained arc tests, and a topical series to the Arc fixture; updated `Arc.jsx` to load sermons and clarify the balance copy.
- Verified: eslint 0, 68 unit/contract tests, `/sweep-the-house` PASS, browser preview of both lenses (no console errors).

---

## 2026-06-25 — Topical Series mode — theme-led second planner mode (v1)

- Added a second planner mode: a topical series gathers passages from many books under one Big Idea (theme), alongside the existing book series.
- Schema v30 — `series.kind` (`book`|`topical`) + `sermons.sort_order` (pastor-authored order); both additive, create-then-update, synced across all three allowlist mirrors.
- New Series modal gains a Book/Topical toggle; the topical page is a Big Idea root + a flat, reorderable list of sermons (no sections), with `create-sermon` section-optional for topical.
- Schedule orders topical sermons by the pastor's arrangement (`seriesSermonOrderBy` reads `sort_order`, a no-op for book series); Coverage hidden and Study-guide/How-it-works copy made mode-aware.
- Verified: eslint 0, 54 contract tests, browser preview (topical Outline/Schedule/Study-guide + book regression); structured per-sermon book deferred.

---

## 2026-06-25 — docs(charter): authorize Topical Series planner mode

- Added a dated charter ruling authorizing a second, theme-led "Topical Series" planner mode (Big Idea ▸ Sermon) alongside the existing book-led mode.
- Locked the design: an explicit `series.kind` discriminator, pastor-authored per-sermon order, a flat / no-sections shape, and the theme stored in `series.big_idea`.
- Ruled per-sermon book = free text for v1, deferring structured `sermons.book_id` + Series Arc aggregation, with the fragility rationale recorded.
- Restated AI-free for the new surface; re-scoped "the book is the series' identity" to book mode.
- No code yet — the ruling authorizes the build (schema v30 → topical front door + page → pastor-authored Schedule order).

---

## 2026-06-25 — docs: series-planner.md matches the shipped book-first planner

- Updated the Series Planner system doc to the shipped UI: the book-first front door (book = series identity, create-then-update), and the Outline's "Book" picker + demoted optional "Series title" (the old "Book Title" field is gone).
- Renamed the doc's stale "preaching unit" / "Open" prose to "sermon" / "Build this sermon" to match the shipped copy.
- Documented the two planner ↔ prep doors (the Outline "Build this sermon" CTA and the New Sermon modal's "From a series" launcher) and corrected the now-defensive `create-sermon` auto-file note.

---

## 2026-06-25 — Series Planner: shared BookSelect + reuse formatDate (cleanup)

- Extracted a shared `BookSelect` component so the genre-grouped book picker's option list lives once, used by both the New Series modal and the Outline's Book details (was duplicated by this session's book-first work).
- Replaced the New Sermon modal's local date formatter with the shared, timezone-safe `formatDate` from utils.
- Behavior-preserving refactor (net −30 lines); no schema, IPC, or UI change.
- eslint 0, 239 tests, sweep PASS, preview verified (Outline picker renders identically — 67 options / 7 genre groups — no console errors).

---

## 2026-06-25 — Series Planner: connect the planner to per-sermon prep

- The New Sermon modal ("Build a sermon") now has two modes: a standalone sermon (title/passage/date), and "From a series" — pick a series and open one of its planned sermons straight into prep.
- "From a series" opens existing planned units rather than creating new ones, so the planner stays the single place series sermons are made (no duplicates); opening reuses each launch site's existing close-and-open callback.
- Each unit in the Series Planner's outline now reads "Build this sermon" instead of "Open," landing you in prep with title/passage/date already set.
- No schema, IPC, or write-path changes; reads use the existing getSermonsBySeries; eslint 0, 239 tests, sweep PASS, preview verified (both modes + the planner CTA at 1280px).

---

## 2026-06-25 — Series Planner: the canonical book is the series' identity

- New Series modal is now book-first: pick the canonical book (it fills the genre + passage span), with an optional series title that defaults to the book's name.
- A theme series spanning several books can still skip the book and supply its own name.
- The Outline's book card leads with the renamed "Book" picker; the confusing duplicate "Book Title" field is gone, replaced by a demoted optional "Series title" that keeps the name editable.
- The book persists via create-then-update (the INSERT stays name/year; book_id + auto-fill go through updateSeries); a failed book write no longer strands a half-made series.
- No schema or IPC changes; eslint 0, 239 tests, sweep PASS, preview verified (modal + Outline at 1280px).

---

## 2026-06-25 — Series Planner: one name for the scheduled unit ("sermon")

- The planner now says "sermon" everywhere in its three tabs, replacing a four-way mix of "preaching unit", "unit", and "slot" (tier band, "+ Add sermon", Suggest Sundays, coverage notes, date labels).
- Two stale "calendar" labels (the delete-series and new-series modals) now read "schedule", the current dating tab.
- Copy and code comments only across SeriesPlanner.jsx, Planning.jsx, NewSeriesModal.jsx — no logic, schema, or IPC changes.
- Left intact: the standalone Calendar feature, the global New Sermon modal, the "N sermons" series card, and code identifiers.
- eslint 0, 239 tests, sweep PASS, preview verified at 1280px.

---

## 2026-06-25 — Series Planner: new-series guidance + drafts survive tab switches

- A brand-new series now opens the Outline with a guidance card explaining sections (plus the "+ Add section" CTA) instead of a bare button — keeps the top-down, section-first model while teaching the first step.
- An unfinished, not-yet-titled preaching unit (big idea/overview typed, no title) survives switching tabs: its draft state moved up to the always-mounted planner. It's cleared on a series change so a stale draft can't leak across series.
- eslint 0, 239 tests, sweep PASS, preview verified (draft survives Outline→Schedule→Outline; guidance card at 0 sections).

---

## 2026-06-25 — docs: MEMORY.md index-hygiene note in CLAUDE.md

- Added an "Index hygiene" note to CLAUDE.md's Memory section: every `MEMORY.md` entry stays a one-line pointer, and per-session updates go in the topic file instead of being appended to the index line.
- Documents the failure mode that had grown the memory index past its session-load limit; the index itself was trimmed (26.2KB → 14.9KB) and a matching feedback memory added (both live outside the repo).

---

## 2026-06-25 — Series Planner: Suggest Sundays fills only the undated units

- "Suggest Sundays" now dates only the units that don't have a date, continuing after the last already-scheduled Sunday — dates set by hand are preserved instead of overwritten.
- The button shows how many it will fill and reads "All units dated" when none remain; the misleading dead `|| s.date` fallback (which looked like it preserved dates) is gone.
- Extracted a shared `addWeek` date helper (`churchCalendar`) used by both skip-a-week and the fill start, replacing duplicated inline date math.
- eslint 0, 239 tests, sweep PASS, preview verified at 1280px.

---

## 2026-06-25 — Series Planner: low-risk fork fixes (modal a11y + layout)

- The **New Sermon** modal now uses the shared `useModalA11y` (focus trap, focus restore, `role="dialog"` + labelled title), matching every sibling modal instead of a hand-rolled Escape listener.
- **Schedule** rows keep the date column aligned: the date track is fixed-width and the season track reserves a stable minimum, so a dated row and an undated / short-title row line up.
- Outline **Book details**: the Passage Range field spans full width instead of orphaning a half-empty cell beside it.
- eslint 0, 239 tests, sweep PASS, preview verified at 1280px.

---

## 2026-06-25 — Series Planner audit backlog: clear bug-fixes (HIGH-A + 6 more)

- **HIGH-A:** series `end_date` now recomputes when a unit (or the last section) is deleted from the Outline — deleting the latest-dated unit no longer strands a phantom date on the exported booklet cover and the Series Arc.
- **Suggest Sundays** flushes pending debounced date edits first, so a date the pastor just typed can't fire ~0.8s later and silently revert the bulk assignment on that row.
- **Draft commit** re-reads the latest draft after the `createSermon` round-trip, so big idea / overview / passage typed while the create is in flight are no longer dropped.
- **Study-guide preview** gates the Introduction part on content to match the exported `.docx` (which omits an empty Introduction); plus 3 cleanups — dead `section_title` SELECT removed (JOIN kept), the redundant `handleDate` wrapper inlined, and the test-spine `delete-section` mirror now matches production's cascade.
- These were committed bundled into the section-limbo commit by a parallel task; documenting here. eslint 0, 239 tests, preview verified.

---

## 2026-06-25 — Series Planner: close the NewSermonModal section-less limbo

- `create-sermon` now auto-files a section-less in-series sermon into the series' first section (auto-creating "Section 1"), via a shared `firstSectionIdForSeries` helper wrapped in a transaction — so the New Sermon modal can no longer hand the Outline an invisible row, whichever surface created it.
- Fixes the bug at the single data-layer chokepoint (reaching Calendar, Dashboard, library, and sidebar at once) rather than per-surface or with an Outline "Unsectioned" group, which would have contradicted the no-limbo canon.
- Added **schema v29** — an idempotent re-run of the v28 normalize that heals any limbo already on disk (v28 is version-gated and won't re-run).
- Mirrored the logic in the test-spine and added four contract tests (first-section file, auto-create "Section 1", explicit-section pass-through, standalone-no-spawn).
- eslint 0, 239 tests, sweep PASS; allowlists untouched, no contract clause weakened.

---

## 2026-06-25 — Series Planner audit remediation (mechanical fixes)

- Corrected the "How this works" modal's Schedule copy, which still claimed dates "show on the Outline" — false since the outlining-only rebuild.
- Added `aria-expanded` to the Schedule row expand toggle, bringing it to parity with the planner's three other disclosure controls.
- Removed two dead prop-passes left by the rebuild: `onNavigate` to `OutlineTab` and `seriesId` to `ScheduleTab`.
- Rewrote two stale comments that still referenced the removed Outline date field.
- From an autonomous multi-agent audit; behavior-preserving only. 17 judgment-class findings (incl. 2 HIGH) deferred to the pastor. eslint 0, 235 tests, sweep PASS, preview verified.

---

## 2026-06-25 — Series Planner: Outline is outlining-only; Schedule owns dates

- **Outline** stripped to outlining: removed the per-unit Date field, date chip, and "Schedule" jump (plus their focus/flash plumbing), and the Color / Status / Year / Description editors and Coverage panel from Book details. Those fields persist from create / the Complete action and still drive the Planning list.
- A preaching unit's title field is relabeled **Working title** (book and section levels keep "Title"); its only actions are now expand and Open.
- **Schedule** is the one place dates live: each row expands (▾) to its read-only big idea + overview, and the Coverage panel moved here.
- Undated units now sort in **outline reading order** (section, then creation) via `seriesSermonOrderBy`'s new section term — shared by the planner load, the workspace breadcrumb, and the study-guide export; the test-spine mirror matches exactly.
- eslint 0, 235 tests, sweep PASS, preview verified.

---

## 2026-06-24 — Series Planner: no section-less limbo (auto-create Section 1)

- A sermon now lives **either under a section of a series, or standalone** (no series → the library). Removed the "Sermons not yet in a section" holding area; standalone sermons were never shown in the planner and still aren't.
- A new series's "+ Add sermon" **auto-creates a renameable "Section 1"** and drops the sermon into it — no empty limbo state.
- `delete-section` now moves its sermons to the first remaining section, or makes them standalone if it was the last section (parallels `delete-series`).
- **v28 migration** (data-only) normalizes existing data: section-less in-series sermons get a section; sermons pointing at a missing/deleted series become standalone. Verified on a copy of the real dev DB (3 limbo → 0).
- eslint 0, 234 tests, drift PASS, screenshot clean.

---

## 2026-06-24 — Series Planner Outline: labeled levels + pericope→sermon rename

- The Outline now signposts itself — numbered tier bands (**Book level · Section level · Sermon level**), each with a plain "what to do here" line, instead of three identical unlabeled forms.
- **Book details** moved to the top and made visible, so you choose the book and its range before writing the book's big idea (it was collapsed in the middle).
- Sermons stay nested under their section beneath a "Sermon level" sub-label; the holding area is relabeled "Sermons not yet in a section" with an explanation.
- Renamed **"pericope" → "sermon"** across the product, code, and live reference docs (no seminary jargon in the UI); the frozen charter + buildlog are left as historical records.
- eslint 0, 234 tests, drift PASS; preview screenshots confirm the three labeled tiers render clean.

---

## 2026-06-24 — Series Planner rebuild: audit remediation

- Fixed a debounce field-clobber — a rapid two-field edit on the same pericope / section / series no longer drops the first field's saved write (flush on field-or-id change); `addSection` now routes through `runSave` so a failed create shows Save-failed + Retry.
- `end_date` now recomputes on Outline date edits (not just Schedule) and clears when all dates are cleared, so the exported booklet / Series Arc date range can't go stale.
- Sample seed carries pericope `big_idea` + `overview` (the showcase now exercises the headline fields) and drops the six retired book-study series columns.
- `.docx`: Schedule-jump ring fades, the season label and addition-type label match the on-screen preview, and a malformed date no longer prints "Invalid Date".
- Doc-drift cleanup (the missing rebuild CHANGELOG entry, CLAUDE.md, project-structure.md). From an ultracode audit: 18 findings remediated; eslint 0, 234 tests, drift + sweep PASS.

---

## 2026-06-24 — Series Planner content-model rebuild shipped (schema v27 + three-screen planner)

- Schema **v27**: added `big_idea` / `overview` / `study_guide_extras` to `sermons` (the pericope-level Title · Big idea · Overview unit + the guide-local additions/notes JSON). A run-once, version-gated backfill folds the retired `study_guide_note` into `overview` where empty. The book-study + melodic-line series columns and `study_guide_note` are retired from the writable set (kept as backup columns), in lockstep across all three allowlist mirrors (`contracts.ts` / `contracts.cjs` / `test-spine.ts`).
- `SeriesPlanner.jsx` rewritten end-to-end to three screens — **Outline · Schedule · Study guide** — replacing the four-movement workbench and the melodic-line / guided-spine machinery (all deleted). Outline is one live nested tree (Book ▸ Section ▸ Pericope; collapse/expand, add/reorder/delete, draft-row/commit, book-level Reference, date chip + Schedule jump).
- Dates are single-source on the sermon and two-way between the Outline and Schedule screens; the drift-prone `schedule` / `scheduleDirty` snapshot is gone.
- Study guide: "Import from outline" builds a live-projection booklet (book → Introduction, section → part, sermon → page) with listener Notes (blank ruled lines + stepper) and pastor additions (question / cross-reference / quote) stored in `study_guide_extras`; re-import never wipes additions/notes (Import writes no sermon column). `buildStudyGuideDoc` (.docx) rewritten to match the preview part-for-part.
- Docs brought to the three-screen model (`series-planner.md`, `schema.md`, `ipc-channels.md`). AI-free; create-then-update + draft/commit + single-organism held. Commits `f6636a9` (schema) · `54c7dd8` (planner) · `73fb88d` (dates) · `176b70f` (.docx) · `3cc3566` (docs).

---

## 2026-06-24 — Series Planner: lock the content-model rebuild into the charter

- Ruled (pastor) that the planner is rebuilt around his real series document: a top-down nested outline — Book ▸ Section ▸ Pericope — with the same unit at every level (Title + passage range · Big idea · Overview).
- Charter gains a current-truth "Content-model rebuild" section that supersedes the four-movement workbench and the melodic-line model; the macro/architect Decision, AI-free Principles, and create-then-update / draft-commit / single-organism rulings still hold.
- Three screens replace the four movements: Outline · Schedule (two-way dates) · Study guide (an editable mini-commentary built by "Import from outline", with listener Notes + pastor additions).
- Deletes the book-study prompts, the melodic-line / hear-the-line / evidence-worksheet / hinge machinery, Key Image, and the Tier-1–3 guided spine; execution is a phased schema migration + UI rebuild handed to a dedicated build session.
- Doc-only this session; no app code shipped.

---

## 2026-06-24 — Series Planner flow: a guided spine over the four-movement workbench

- Added named-outcome seam frames ("X opens, against the Y") at the Design/Schedule heads, a "Continue to <next>" forward control at each movement's foot, and a "Movement N of 4" topbar place-line — the sermon walk's handoffs and orientation, without making the planner a one-question walk.
- Made the Coverage and Schedule empty-state pointers clickable jumps.
- Promoted the Overview cockpit into a tap-to-jump arc-rail map (presence dots, "You are here") and reframed it as the arrival, with the Study Guide as the terminal door — no score or meter added.
- First open of a series now auto-shows the existing "How this works" modal once, via a write-only localStorage flag (no new component, no schema change).
- Adversarial multi-agent review (1 low confirmed, 6 refuted) led to single-sourcing the modal's movement labels off `PLANNER_MOVEMENTS`; all changes in `SeriesPlanner.jsx`, AI-free, 231 tests + lint green.

---

## 2026-06-22 — Series Planner audit follow-up: finish tab-rename copy sweep + close no-direct-ai CI gap

- Repointed three empty-state strings that still named removed/renamed tabs to their four-movement homes: the Schedule and Study-Guide "add slots" prompts now say "Design → Divide into Sermons"; the coverage panel's no-book prompt now says "Understand → Place the Book".
- Added `.cjs` to the `npm run lint` `--ext` list so the full/CI lint runs `no-direct-ai` on `contracts.cjs` and `studyGuideModel.cjs` (pre-commit's `lint-staged` glob already covered them).
- Follow-up to the read-only 8-dimension audit of `3330f35` (0 blockers / 0 critical); gates green — ESLint 0, 231 tests pass.

---

## 2026-06-22 — Series Planner: re-level five tabs into four movements (Understand · Design · Schedule · Overview)

- Re-leveled the planner from five peer tabs into four movements that each feed the next: Understand (place the book + hear the line), Design (the hinge + divide into sermons + group into movements), Schedule, and a read-mostly Overview cockpit.
- Understand adds an AI-free melodic-line evidence worksheet on a new `melodic_evidence` JSON column (schema v26); `book_structure` is folded into `structural_outline` and retired as a live field but retained as a backup column.
- The cockpit surfaces read-only, tappable echoes of every movement's work (melodic line, big idea, coverage, pacing, dates) and authors only the masthead; it never grades or scores.
- Design reuses the slot/coverage and section apparatus via an `embedded` flag (no engine touched); create-then-update preserved — `melodic_evidence`/`book_id` persist via `updateSeries`, never the create INSERT.
- Redrew the "How this works" diagram and reconciled the docs + charter (supersession note via anchor-update); lint 0, 231 tests, sweep PASS.

- Independent 12-agent audit (verse data re-verified against a third KJV source; 0 Blocker / 0 High) confirmed the build holds against all four hard constraints.
- Coverage now clamps to the series' `passage_range` when it parses, so a sub-book series is measured against its declared span instead of the whole book (falls back to whole-book otherwise).
- Fixed the sample seed (legacy `canon_category: "nt"` + no `book_id` → `nt_pauline` + `romans`), widened the seed INSERT, and added a seed-validity test.
- Hardened fail-soft: pacing null-element guard, coverage out-of-range self-defense, passage-ref numeric-overflow cap, arc month-overflow clamp and testament gating.
- Cleanups: extracted shared `parseLocalDate`, deleted dead `verseIndex`/`totalVersesInBook` exports, single-sourced `CANON_COLORS` off `GENRES`; lint 0, 231 tests, sweep PASS.

---

## 2026-06-22 — Canonical book data: book picker, pacing, coverage, and the Series Arc view

- New bundled `src/data/canonicalBooks.js` (66 books, KJV verse counts to 31,102, checksum-gated, cross-verified against two sources); the only schema change is a nullable `series.book_id` (v25), with `canon_category` migrated to Dever's 7 genres.
- Book Study gains a canonical-book picker that auto-fills genre + passage span (overridable); Overview's category dropdown and the Planning surfaces move to the 7 genres with an Unclassified state.
- Sermon Slots + Calendar show a read-only pacing strip; Sermon Slots adds a fail-soft coverage panel (gaps / overlaps / out-of-order / %).
- New Series Arc view: a cross-series timeline table + a windowed genre-balance read (touched/missing, OT:NT, unclassified).
- AI-free arithmetic throughout; +78 unit tests (223 total), lint + sweep green.

---

## 2026-06-22 — Close three deferred follow-ups: lint gate, modal scroll, study-guide model

- Removed the `SF_LINT_STAGED` downgrade so `no-raw-button` and `canonical-loading-verb` fire at full severity in pre-commit — closing the gap that let raw-button debt accumulate via new files.
- Lifted the flex scroll model onto the shared `.modal` class so every modal's header and footer pin while the body scrolls; removed the planner-local override.
- Single-sourced the study-guide view model behind the preview and the `.docx` exporter, following the `contracts.cjs`/`contracts.ts` mirror convention (`src/utils/studyGuideModel.js` + `electron/studyGuideModel.cjs`) since `src/` isn't packaged.
- Verified: lint 0, 145 tests, planner preview renders all five Study Guide parts with the footer pinned and no console errors.

---

## 2026-06-21 — Clear all lint errors: migrate raw buttons to IconButton (Surface #2)

- Migrated the 25 residual `no-raw-button` violations to `<IconButton>` across the writing-surface stack (6 files).
- Used `<IconButton>` (passthrough, not the CTA primitives) since every site had a bespoke class — Pilot C is structural-only — preserving props and adding `aria-label` where missing.
- Fixed 2 `canonical-loading-verb` false positives at the rule: extended its test exemption to the repo's colocated `*.test.*` convention (a `"Once..."` opener fixture was tripping the regex).
- `npm run lint` now fully green (0 errors, was 27); 145 tests still pass.
- Recorded zero residual `no-raw-button` in ENFORCEMENT_STATUS.md.

---

## 2026-06-21 — Series Planner: fix tab scroll + rendered-UI sweep remediation

- Fixed the reported bug — every planner tab scrolls again: the tab-content wrapper is now a bounded flex column so each `.page-body` is its own scroll region.
- Removed stacked app-chrome on the real route: `App.jsx` no longer renders the sidebar + empty topbar over the planner's own topbar (shared `isOwnChrome` guard, mirroring the Workspace).
- Study Guide modal now scrolls its body with the header and footer pinned, so the primary "Export to Word" action stays visible on open.
- Newly-added slots and sections scroll into view and focus their first input instead of mounting below the fold.
- Polish: a long export filepath wraps instead of forcing a modal scrollbar; the planner stage tabs get the gold focus-visible ring.

---

## 2026-06-21 — Series Planner: remediate the post-ship audit (38 findings)

- Closed data-safety holes: study-guide export excludes soft-deleted slots, whole-series delete uses a named consequence-confirm, debounced edits flush on exit (`useFlushOnExit`), and a `commitDraft` guard stops duplicate sermons.
- Made saves honest: section/slot writes drive the save indicator, Retry re-runs the real failed write, and load failures show an error + retry instead of a stuck spinner.
- Fixed integration/UX: undated slots sort last (shared `seriesSermonOrderBy`), Back returns to the series, the preview mirrors the `.docx`, season pills use theme tokens, cards are keyboard-reachable, modals get dialog a11y.
- Hardened enforcement: broadened `no-direct-ai`; added churchCalendar/series-spine/allowlist-sync tests; excluded `.claude/worktrees` from vitest (true suite 145).
- De-stubbed the planner in CORE.md (+ CORE-CHANGELOG, ANCHORS); cleared stale AI phrasing in schema.md.

---

## 2026-06-21 — Revive the Series Planner (AI-free) with study-guide export

- Revived the Series Planner: an AI-free 5-tab workbench (Book Study/Overview/Structure/Sermon Slots/Calendar) recovered from git, AI stripped, restyled to match the sermon workspace.
- Restored the front door (create/list/open a series + a "Series Planning" sidebar entry) and the live study-guide `.docx` export + church-calendar scheduling.
- Added a preview fixture + `?planner` route; ESLint/types clean, all tabs + export modal render, 124/124 tests, drift-check PASS.
- Fixed schema.md drift (two-state `series.status`/`sermon.stage`; removed PC columns) and stale planner refs in ipc-channels, project-structure, ENFORCEMENT_STATUS, CLAUDE.md.
- Added the revival charter + recreated `docs/SYSTEMS/series-planner.md`.

---

## 2026-06-15 — Workspace Re-Foundation Phase 2: remove the four [+] additions (item 5)

- Removed the four SermonForge-added questions the pastor ruled to cut: Possible Implications (`applications`) + Genre (Study 25→23 fields), and `holy_spirit_intent` + `closing_posture` (Context/Conclusion 4→3 questions) — from field-defs, `checkConclusionComposite`, the sample seed, fixtures, and tests.
- **CORE Process #4 amended:** Pastoral Context now enters only at Implications, not progressively from Observe (the Observe awareness surface is gone); Process #6 Study count 25→23.
- Reworked the PC narrative in `sermon-workspace.md` — the product-owner's progressive-PC articulation is kept as dated historical rationale; canon + CORE + mechanics now tell one Implications-entry story.
- 124 tests pass; a 2-agent ultracode adversarial review caught five dangling cross-references (incl. pastor-facing Manuscript/Frame copy) — all folded in.

---

## 2026-06-15 — Workspace Re-Foundation Phase 2: the cuts (item 4)

- Chapell's 3 AM test restored as a crispness self-check folded into MPS `tighten` ("woken at 3am, could you say it?") — not a new field; the sermon title stays dropped (Merida makes it optional; every sermon already has a name).
- Merida's 25-observations device kept as ambient "don't stop at the obvious" posture in Observe's entry teaching — deliberately NOT a 25-row quota (which would re-commit the mechanization trap the intent audit flags).
- Canon §2.1/§3.1 drop-notes ratified; a 1-agent ultracode review confirmed fidelity (non-mechanizing), code soundness, and passing tests (21/21 study, 13/13 anchor).

---

## 2026-06-15 — Workspace Re-Foundation Phase 2: Merida question surgery, batch 1

- MPS `translate` reworked from a bare tense-swap to Merida's full fallen-condition focus (the human problem, what hearers share with the original audience, and the grace the text holds out), keeping the tense rule — the biggest single Merida drift, now restored.
- Pastoral Context `room_specifics` now names the prodigal AND the older brother (Merida/Keller two-brothers), replacing a generic-categories list.
- Personal Implications gained an ambient teaching of Robinson's necessary/probable/possible authority gradient (no new field/quota); the full application gradient is OEM-deferred to Equip.
- Canon §2.4/§3.1/§3.3 fidelity tags updated (⚠→M); a 2-agent ultracode adversarial review confirmed fidelity, code soundness, and passing tests before commit.

---

## 2026-06-15 — Workspace Re-Foundation Phase 1: step 5 — canon ratified, initiatives historicized (Phase 1 complete)

- Ratified `docs/WORKSPACE-CANON.md` (DRAFT → LIVE): now the binding source for the sermon walk's what & why; the Merida tags stay as Phase-2 input.
- Re-pointed CORE Process #6 (+ the ENFORCEMENT_STATUS row/summary + the CLAUDE nav) from the SFDI/SADI working docs to the canon; SFDI/SADI become frozen development records.
- Banner-stamped nine old initiative docs (SFDI/SADI/SPRD/invisible-system/era-2/workspace-restructure/workspace-trail) as historical records; regrouped `ANCHORS.md` (canon = live anchor).
- A 3-agent ultracode consistency verify confirmed 0 broken refs + authority fully re-pointed, and caught five un-propagated gaps — all folded in.
- Phase 1 complete; next is Phase 2 (the Merida question surgery). Docs-only.

---

## 2026-06-15 — Workspace Re-Foundation Phase 1: step 4 — sermon-workspace.md thinned to mechanics

- Thinned `docs/SYSTEMS/sermon-workspace.md` to *how & where*; the walk's *what & why* migrated to `WORKSPACE-CANON.md` via cross-refs, with the Pastoral Context spec kept here as CORE Process #4's pointer target.
- Corrected four code-grounded drifts: Field 3 kind →`indented-canvas`, completeness composites "uncalled"→*wired*, `saveDb` 500ms debounce→better-sqlite3 handler-commit, SERMON_COLUMNS 37→34.
- Fixed the legacy-PC-column disposition (removed, zero readers/writers — not "retained defensively") in `CORE-CHANGELOG.md` + `ENFORCEMENT_STATUS.md` (per-clause rows + summary + SPRD deferred bullets).
- A 3-agent ultracode verify pass confirmed 0 orphans, all 39 mechanics claims match HEAD, 0 broken refs.
- Docs-only; board marked step 4 done (next: step 5 — historicize initiatives + register the canon). No production code changed.

---

## 2026-06-14 — Workspace Re-Foundation Phase 1: steps 1–3 shipped

- Net-truth map: two ultracode fan-outs traced all 11 live-authority sources against the code at HEAD into one 22-subject map on the working board.
- Drafted + verified `docs/WORKSPACE-CANON.md` (the walk's what & why — 3 stages / 8 sub-phases / 8 named outcomes / 34 fields, Merida-tagged); a 15-agent pass found 0 blockers.
- Ruled the per-unit gate / N-A: an honest "nothing here / doesn't apply" now counts as done (named-outcome paragraphs stay no-N/A) — written into the canon + the SFDI banner; the per-cell code build is scheduled.
- Slimmed CORE to live law (461→392 lines): dated amendment history relocated to new `docs/CORE-CHANGELOG.md`; Pastoral Context mechanics moved to spec, principle kept as Process #4 law.
- Canon stays DRAFT (binds at step 5); no production code changed this session.

---

## 2026-06-13 — Workspace Re-Foundation Initiative chartered (planning only)

- New working board `docs/PROPOSALS/refoundation-initiative.md` (rescoped from the day's `merida-fidelity-initiative.md`, now deleted). Two coupled jobs: consolidate the sprawled document authority (~15 binding docs, ~8 governing the same concern through supersession chains) into CORE + a new canonical spec, and re-examine the contracts + Study/Anchor question set through Tony Merida's intent.
- Captures the Merida fidelity findings (the question provenance map — faithful / addition / gate-shaped / drifted), the target three-layer doc structure (CORE = law · `docs/WORKSPACE-CANON.md` = what/why · sermon-workspace.md = how/where · initiatives = frozen history), the Phase-1 plan (ultracode reversal-tracing → net-truth → draft the canon → slim CORE → thin the mechanics doc → historicize), and the three contract examinations (Process #2 completeness/N-A, the CORE-elevated additions' weight, the Principle scope note).
- **Planning only — no contracts, specs, or code changed.** Phase 1 executes next session; no Study/Anchor question is cut until then.

---

## 2026-06-10 — Marinate restored: the text comes back to the forge

- A 9-agent saturation investigation (ultracode) confirmed the pastor's instinct: from the Study→Anchor seam onward the walk fed him only his own summaries, the reference pane flipped away from the passage the instant he left Study, and nothing sent him back into the text — an "equation" feel at exactly the load-bearing moments. Merida's method puts a "back away and marinate" beat right there; the app had renamed it into "write the synthesis" and pointed it at the notes.
- **Marinate is restored as a return to the passage** (not a relabeling of the synthesis — that conflation stays gone). The Implications send-off now sends the pastor back to re-read the text before the Main Point; the Study→Anchor handoff renders the passage itself under "Before you forge — read it once more"; the MPT draft prompt opens "With the passage open beside you, read it through once more."
- **The Bible no longer disappears by default.** The reference pane defaults to the Passage in every region (was: flipped to "Your work" the moment Study ended); "Your work" is always one tab-flip away but never displaces the text unbidden. The MPS gospel-check prompt now directs the flip explicitly for its side-by-side.
- **Minimize is cleaner:** the pane defaults to open (no more screen-width auto-collapse), the writing surface grows to reclaim the width, and the minimized state is a single legible "Open Bible" tab (was a sideways "Reference" sliver).
- **Constitution updated, not silently:** CORE Process #6 gains a dated saturation amendment; era-2 primacy Rulings 1 and 4 carry dated "superseded in part" banners (marinate-as-text-return restored; the synthesis-as-marinate-output conflation and the other struck pastoral-practice lines stay out). The pastor's own framework drove the reversal.

---

## 2026-06-10 — T18: the reference pane, the teaching layer, and copy that tells the truth

- A collapsible reference pane now sits on the left of the writing surface — "a Bible open beside the notepad." Study shows the ESV passage by default; from Anchor onward it shows the work the current field builds against (the ratified per-region table: MPT forges against the four Study outcomes, MPS against MPT + the Christ-Connection Statement, Outline/Frame against MPT+MPS, Equip/Manuscript add the outline). Anything not yet written says so, with a "go write it" jump.
- The authored field overviews (SFDI/SADI walks + OEM drafts — dead data since FieldOverviewScreen's deletion) are live again: each auto-opens on the pastor's FIRST visit to its field per sermon, then collapses behind a quiet "About this field" link, always re-expandable. First-visit tracking rides thresholds_seen (**Process #3 interpretation, flagged:** first arrival at a new kind of work read as a per-field threshold). Collapse or moving to another field ends the visit; quitting mid-read doesn't count as seen.
- Debugging the seen-marking surfaced two structural bugs: an unmount-cleanup approach would have marked "seen" on StrictMode's simulated remount and on workspace close (against the ratified semantics) — marking moved into the parent's position write; and the fixture seam's load effect silently reset sermonRef after child writes, desyncing ref from state (fixed).
- Fossil copy de-fossiled across six field-def files: "Phase 1/2/3/4" coordinates, "Q1/Q2/Intro Q3" numbers, "worksheet"/"AI re-summary" references, and the dead subtitle producers are gone from rendered prose; cross-field prompts now point at the real reference pane ("Your MPT is in the reference pane beside you").
- A 64-agent adversarial review (6 lenses → 2 refuters per finding) confirmed 6 findings, all fixed: a handoff-overlay jump could consume an unseen teaching auto-open (now suppressed), two missed fossils, a Frame overview promising pane contents the ratified table doesn't hold, plus split-verdict cleanups (label→fieldKey outcome lookup, render-time mode reset, pure setState updaters, CSS hover/border polish). 706 tests; lint clean.

---

## 2026-06-10 — Findability: search results land where they promised, the calendar starts sermons, titles rename, N/A tells the truth

- Search-result navigation finally works end to end (the audit's "built in three files, dropped in the fourth"): clicking a hit lands on the matched region's first field (new `firstFieldFor`), notebook hits open the right notebook drawer without touching the writing position, and the landing persists so reopen returns there. The 36-agent adversarial review caught and fixed two real races first: a StrictMode double-load that silently dropped the hint in dev (cancellation flag), and a cross-sermon write race armed by the new zero-input save (workspace now remounts per sermon, clearing pending debounce timers).
- The Calendar earns its name: clicking a day opens New Sermon with that date pre-filled; preached Sundays stay on the grid as gold chips (with a named legend and per-chip status for screen readers); Today button; honest load failure with Retry; the "sermons with a date appear here" explainer now shows for the pastor whose sermons exist but carry no date.
- The dashboard's Resume tile gains one quiet "N preached sermons →" row (live count, navigates to Preached Sermons); preached sermons stop being invisible from the front door.
- Sermon titles rename inline from the topbar (pencil, mirroring the passage pattern); an explicit empty-title Enter keeps the editor open and says "A sermon needs a name" (State #3's spoken-refusal clause, honored the day it was written).
- N/A tells the truth: the toggle renders only on the two ratified questions (intro.redemptive_note, mps.gospel_check) with a write-path guard — closing the silent path that could blank the Word export's main points — and marking N/A keeps the pastor's words visible, struck through, with "your words are kept."
- **FLAGGED FOR PASTOR RULING:** the two-question allowlist conflicts with SFDI's broader Study-side N/A escape valve (RT ways-questions, Genre, Cross-References, Implications 1–2). Surfaced as a pending-ruling banner in the SFDI doc per Test Q4 — extend the allowlist or amend SFDI. 706 tests; review fleet PASS after fixes.

---

## 2026-06-10 — Governance batch: the constitution catches up with the app

- The Test gains a fifth question — "Where does the pastor SEE this, and what does it orphan?" — encoding the two failure modes the audit kept finding (built-but-never-rendered, deleted-but-still-consumed); the sweep skill asks it too, with its stale saveDb/debounce lines fixed.
- CORE amendments: Project Identity rearticulated (built by a pastor, shipped to pastors; low software confidence is a binding design constraint; sermon-first now, series-planning as named roadmap); State #3 spoken-refusal + correctable names; Process #1 clarifies a Back control was never forbidden; Mutation #4 scales friction with loss (satisfied by the v24 undo); Surface #4 "you are here" now binds the workspace (place line + map); Process #6 honestly marks Outline/Equip/Manuscript pedagogy as draft pending the OEM walk.
- RULES fossils cleaned: the six-value stage-badge vocabulary and "Big Idea box" deleted; Rule 6 rewritten (installers come from /release; local builds only for packaging-surface changes) keeping the .env-never-in-extraResources block verbatim.
- Anchor debt paid: era-2 charter gets its post-invisible-system banner (refuse-advancement formulations superseded; threshold orientation scoped outside "constraint without ceremony"); the SFDI/SADI banners the era-2 charter ratified but never executed are in, with invisible-system supersessions; ANCHORS.md registers sadi-charter, era-2, and workspace-restructure.

---

## 2026-06-10 — The release smoke test describes the app that exists

- Canonical checklist moved to docs/REFERENCE/release-smoke.md — the old distribution.md §12 walked surfaces deleted in the invisible-system rebuild (tour, per-tab notebook, Manuscript tab).
- 14 items covering the current surface: first-run setup + key lifecycle, sample sandbox, walk/Back/Map/jump-flash, close-flush, notebook tabs, finish + export + preached cycle, soft-delete undo, sermon-body search, the packaged menu (with the macOS clipboard-roles check), the quiet updater line + Restart now, dark prepaint, v24 migration over an old library, in-popup key recovery, clean relaunch.
- /release Step 4 and distribution.md both point at the new file.

---

## 2026-06-10 — v24: deleting is undoable, search finds the sermon body, "Delivery" leaves the vocabulary

- Deleting a sermon is now a soft delete (`deleted_at` tombstone, written only by main — deliberately outside the renderer-writable allowlist) and every delete surface shows an Undo instead of vanishing the card (shared DeletedSermonStub; Dashboard rows settle to "Deleted · Undo"). The two-step confirm stays; no Trash UI yet.
- `sermon_search` rebuilt (drop + recreate from `SERMON_SEARCH_COLUMNS` + full reindex): the sermon body (`functional_elements` — per-point explanation/illustration/application) is finally searchable, and the dead `delivery_notes`/`timing_notes` index columns are gone. Search results label body hits "EQUIP · SERMON BODY" and land on Assembly/Equip.
- "Delivery" struck from the vocabulary in one commit — Stage type, runtime mirrors, test spine, ~200 lines of orphaned CSS, search labels, and the CORE vocabulary entry; the ARI Phase 7 legacy tolerance retired with no production sermons in existence.
- All list reads and search exclude tombstoned rows; schema.md updated to v24. Sweep PASS; 706 tests.

---

## 2026-06-10 — Dark launches stop flashing light

- index.html now pre-paints the stored theme (inline script + critical CSS) before React loads; the BrowserWindow background and the splash screen follow the theme too (main reads a tiny ui-prefs.json synchronously — localStorage can't serve the splash's file:// origin).
- The theme toggle persists through a new validated `set-ui-theme` IPC; every layer is defensive, so the worst case anywhere is today's behavior (one light first frame).
- The splash gained a proper dark palette. Full splash/window verification flagged for the next release smoke (Electron-only path).

---

## 2026-06-10 — Dark mode actually reads: corrected ink ramp, themed natives, keyboard reach

- The dark token palette is complete and ordered: the ink ramp's ghost/soft inversion is fixed (faint text is now actually the faintest — the map's answered/started/not-yet shading reads the right direction again, verified 208>170>124 luminance); `--gold-pale` becomes a dark amber surface (search hits and passage chips keep the gold identity with readable ink); `--sage` and `--slate` finally get dark values. The sidebar's "+ New Sermon" moved off gold-pale before the flip.
- `color-scheme` now follows the theme, so dropdown lists, date pickers, checkboxes, and scrollbars stop rendering light-mode UA chrome in dark mode; the setup checkbox checks gold instead of Windows blue.
- Contrast stragglers fixed: "Save failed"/"Saving…"/"Saved" use the topbar's own tokens (new `--topbar-danger`) instead of theme ink on the always-dark bar; all six overlay scrims share a themed `--scrim` token; the FeedbackFlag title is readable; the orphaned `.stage-select` CSS (dead since the pill replaced it) is deleted.
- Keyboard reachability: sidebar nav items (with `aria-expanded` on the dropdown), sermon cards, and calendar chips are now focusable with Enter/Space activation (shared `buttonKeydown` helper, nested-control guard) and visible gold focus rings.
- FLAGGED: before/after screenshots for the pastor's palette sign-off still owed — the preview screenshot tool is timing out; capture from the live app or just toggle dark mode and look.

---

## 2026-06-10 — Riders: feedback speaks pastor, notebooks stop vanishing, the canvas explains itself

- FeedbackForm: "Dimension" and the charter's category names ("Structural overreach"…) replaced with plain labels ("The structure got in my way", "Something broke or acted strange"…) — stored telemetry values unchanged, so analysis keys still match.
- The notebook drawer gained header tabs for all three per-stage notebooks — switching stages no longer silently swaps notebooks ("my Study notes vanished"); the drawer opens on the current stage and switches freely.
- PassageCanvas: a standing legend ("Tab to indent · Shift+Tab to outdent · Enter for a new line") makes the field's core gesture visible; the indent-at-limit refusal now explains itself through the same hint slot paste uses. The audited Backspace no-op no longer exists — the unified-canvas refactor made Backspace outdent or merge.
- BTI charter docs amended (dated notes): the dead `tour-step` telemetry commitment is dropped from beta-testing-initiative.md and bti-build-mvp.md (emitter deleted in the 2026-05-17 tour cleanup); privacy.md was already clean.

---

## 2026-06-10 — The frame stops speaking developer: real menu, quiet updates, a support address that exists

- New pastor-shaped application menu (File/Edit/View/Help) replaces Electron's stock one — Reload/DevTools/Electron-website links are gone from packaged builds (the stock Ctrl+R edit-destroyer dies with them); Edit keeps full clipboard roles; View offers plain-named text zoom; Help carries Check for Updates, Email Support, Website, Open Data Folder, and an About dialog hosting the real version + the full Crossway ESV notice.
- Updates are quiet and safe: the focus-stealing "Restart Now" dialog is gone — a downloaded update shows a dismissible sidebar line ("installs the next time you close the app") with an optional Restart now that drains edits through the before-quit flush; Help > Check for Updates always answers (up to date / downloading / couldn't check); the sidebar finally shows the real version instead of "v1.0".
- "Contact support" now means something: ross.appleton@gmail.com (one constant, flagged for a dedicated address later) is named in all six recovery/crash strings, and the corruption + OneDrive modals gained one-click "Email support" with prefilled subjects.
- Startup warnings queue by severity — a OneDrive nag can no longer overwrite the corruption-recovery message for exactly the highest-risk cohort; recovery messages name OneDrive as the likely cause when both apply.
- OneDrive copy rewritten to ask only for possible things (no more "pause sync for the data folder"); honest about the automatic backup; "Continue anyway." Sweep PASS; 706 tests.

---

## 2026-06-10 — Passage popup recovers in place: structured states, plain copy, the key modal opens where the pain is

- passage-fetch now returns structured `esvState` codes (no-key / key-unreadable / bad-key / rate-limited / offline / error); raw "ESV API HTTP 401" and "fetch failed" strings never reach the screen again — every state renders authored copy plus exactly one action.
- The popup itself offers "Add ESV key" / "Update ESV key" (opens EsvKeyModal above the popup; saving re-fetches in place) and "Try again" for network states — no more dead end pointing nowhere; the sidebar link is honestly renamed "Add or update ESV key…".
- The keystore now distinguishes "key file exists but can't be decrypted" from "no key saved" — two different problems that used to wear the same "not configured" message.
- Popup dragging is clamped (the header can never leave the screen) and the false `aria-modal` claim is dropped from a non-modal floating panel; cache check now runs before the per-call key decrypt.
- 706 tests; sweep PASS; verified in the workspace fixture (empty-reference copy, Escape layering, no aria-modal).

---

## 2026-06-10 — First-run honesty: real ESV link, honest key saves, plain setup copy, New Sermon modal answers back

- New `app-open-external` IPC with a hard exact-match allowlist (only `https://api.esv.org/`) — api.esv.org is now a real clickable link in SetupScreen and EsvKeyModal instead of bold text to retype.
- Key saves are honest: a pasted "Token " prefix is stripped before validation; an offline save returns `unverified: true` and both screens say so plainly instead of pretending the key was checked; keystore failures speak plain English (raw OS-crypto wording goes to the log only).
- Setup copy pass: "Create an API Application" steps match the real ESV site flow; "Usage reports and feedback" replaces "Telemetry"; the dead privacy.md pointer and the false "nothing leaves your device" claim are gone (self-contained disclosure); softer OneDrive caution; "Paste your key here" placeholders.
- New Sermon modal: clicking Forge with an empty title now answers (inline message + focus) instead of a silently dead button; Escape closes; the Date field explains the dashboard nudge it drives; the silent series preselect got a visible caption.
- KeyInput extracted to a shared primitive (was duplicated in both key screens). Sweep PASS; 706 tests.

---

## 2026-06-10 — Sample sermon is a sandbox that lands on writing; ESV passages carry the Crossway line

- "Open a sample sermon" no longer wipes the pastor's exploration on every click — an existing sample is returned as-is; a new "Start the sample fresh" text action under the row does the explicit reset (`{ fresh: true }` through spine → handler).
- The seed now lands inside the finished work: `last_touched_position` points at the first Manuscript field and both entry thresholds are pre-seen, so the curious pastor opens on writing instead of the sermon-start overlay. Landing state authored in sampleData.js with the rest of the seed.
- PassagePopup shows the short Crossway attribution under displayed ESV text (wording verified against api.esv.org conditions; the full notice lands on the About screen in the shell-trust batch).
- Test-spine stub mirrors the new sandbox semantics. Sweep PASS; 706 tests.

---

## 2026-06-10 — Thresholds are re-readable: map "Read again" doors, handoff returns until closed, start overlay teaches the controls

- The map header gained a "Read again" row — the sermon-start screen ("the walk ahead") and the Study → Anchor handoff re-open view-only from anywhere, without touching thresholds_seen.
- A "go write it" jump off the handoff no longer consumes the threshold: the pastor left to fix a Study outcome, not to dismiss the screen, so it returns on the next Anchor entry until explicitly closed.
- Sermon-start overlay rewritten: gold "Begin →" PrimaryButton replaces the quiet "Close" text link; a three-controls block names Next / Back / Map; a closing line points at the map's re-read door. Body copy flagged for the pastor's own voice.
- CORE Process #3 amended: every threshold screen is re-readable after dismissal — dismissal ends the interruption, never the access.

---

## 2026-06-10 — Orientation: you-are-here eyebrow, Back button, map header with counts, jump lands on the question

- The writing surface carries a static place line ("Study · Interpret") above the field name — states where, never narrates movement; CORE Process #3 amended to permit static place explicitly.
- A Back button joins Next in a `.sws-nav` pair (prevField — the walk reverses as freely as it advances); the floating ☰ is now a labeled "Map" pill.
- The map gained a fixed header (title, "You are here" line, answered/started/not-yet legend) over a scrolling list, and each region label shows "answered of total" counts.
- Map jumps now pass the full question entry: the surface scrolls to that exact question and flashes it once on landing.
- The Implications→Anchor SCREEN_BOUNDARIES carve-out is gone — revisits of MPT permanently render "Anchor opens, against your Study work." (FRAME_OVERRIDES, one voice with the handoff screen).

---

## 2026-06-10 — "Preached" is the word: labeled lifecycle, undo, reopen, resolvable reminders

- The user-facing lifecycle word is now "Preached" everywhere (SERMON_STATUS_LABELS; stored enum value unchanged): sidebar "Preached Sermons", view title, empty states, search placeholder.
- All Sermons cards: the unlabeled native status dropdown is gone — a display-only pill plus a labeled "Mark preached" button; the card swaps to a "moved to Preached Sermons · Undo" stub instead of vanishing.
- Preached Sermons cards gain "Reopen" (back to In progress — not a one-way door) and the export button is honestly labeled "Export to Word" with "Exporting…" in flight and a saved-location note on success (shared payload builder).
- Dashboard return-day reminders are resolvable in one click: "Past its date — preached?" with an inline "Mark preached" that settles the row in place; the stale comment pointing at a nonexistent workspace control is fixed.
- Verified live: mark → stub → Undo cycle and the renamed Preached view; 706 tests pass.

---

## 2026-06-10 — The ending exists: finish moment, anywhere-export, completeness wired, one error voice

- The last field's dead grey Next is now a gold "Finish sermon →" opening SermonFinish — a re-openable completion threshold listing every load-bearing artifact (written / still open, with "go write it" jumps), plus Export to Word and Mark as preached.
- Wired CORE Process #2's completeness contract: `deriveSermonCompleteness` consumes all eight composites (+ lenient Outline/Body/Manuscript presence checks); composites' reason strings rewritten in pastor vocabulary.
- "Export to Word" now lives in the workspace topbar too (flushes the debounce first, shared payload builder); the export handler checks `shell.openPath`, falls back to revealing the file, and reports the saved location.
- New `mapError` translation layer: raw EBUSY/HTTP/IPC strings never reach the screen (crash fallback, write banner, create/setup/key/export errors all speak plain English).
- CORE Process #2 + #3 amended (completion threshold canonical); 706 tests pass; finish → export → Word-opens verified live.

---

## 2026-06-10 — sermonforge.db moves to better-sqlite3: writes commit at the handler, the 500ms crash window is gone

- Ported the main DB from sql.js to better-sqlite3 (WAL mode): every spine write is a durable SQLite commit when its IPC handler returns; deleted the saveDb/flushDb serialize-and-rotate pipeline (`flushDb` survives as a WAL checkpoint, `db-flush` contract unchanged).
- `runMigrations()` now runs inside one transaction (a thrown migration rolls back to a pristine file); `.bak` is written once per launch after quick_check, before any write — also the pre-migration recovery point.
- `migrateLegacyDb` closes every candidate handle and returns `{ source }` only; the caller reopens at the active path (file-backed connections are path-bound); quit-time save-retry dialog removed (nothing pending at quit anymore).
- Removed the sql.js dependency, its wasm asarUnpack entry, and `paths.sqlWasm`; ported `scripts/recover-db.cjs`; amended CORE.md (driver boundary, the 500ms-debounce invariant → writes-commit-at-handler, stack line), RULES.md, and docs/SYSTEMS/database.md.
- Verified: 693 tests + spine gate pass; live boot on the real dev library; SIGKILL with 20KB un-checkpointed WAL replayed cleanly on relaunch.

---

## 2026-06-09 — Close-time edit flush: window close, quit, and reload no longer drop the last keystrokes

- Added a renderer flush registry (`src/utils/closeFlush.js`); SermonWorkspace registers its `persistUpdate` so every exit path can flush the 800ms autosave debounce.
- main intercepts window close, asks the renderer to flush over `app-flush-edits` (nonce ask/ack, 2s hard timeout), then re-closes — a hung renderer can never make the window unclosable.
- `before-quit` flushes the renderer before flushing the DB image, covering menu quit / Cmd-Q where no window close event fires.
- A `beforeunload` listener runs the same registry fire-and-forget so Ctrl+R / View > Reload no longer destroys in-flight edits.
- Verified live: typed text followed by an instant window close survived relaunch; 693 tests pass.

---

## 2026-06-09 — Public-launch hardening: secrets, data survival, crash recovery, Outline/Equip/Manuscript

- Removed the bundled `.env` from the installer (it shipped developer secrets); telemetry now uses a hardcoded public Worker URL with a token-free, payload-validated `/ingest`, and the dead GitHub feedback path was deleted.
- Hardened the DB boot/save path: single-instance lock, fsync-before-rotate, transient-lock-vs-corruption detection, `PRAGMA quick_check`, conditional boot-flush, legacy-resolver fixes, and user-visible recovery warnings.
- Ended eternal-splash and silent crashes: boot + macOS-reopen + renderer-crash handlers, a packaged bridge-failure screen, ErrorBoundary over first-run, and a quit-time save retry.
- Drafted Outline/Equip/Manuscript field-defs (Merida-grounded) with new writing-surface editors that author the native columns the Word export reads; synced flat `mpt`/`mps` from the v19 envelope.

---

## 2026-05-22 — Passage popup fits the empty left space; writing field nudged right for breathing room

- `.passage-popup` width changed from a fixed `360px` to `calc(50vw - 408px)` with `max-width: 360px` / `min-width: 280px` so the popup fills the empty space to the left of the centered 720px writing field without overlapping it.
- Popup `max-height` tightened from `calc(100vh - 76px)` to `calc(100vh - 148px)` so the bottom-right resize handle stays inside the viewport when the popup is at its default anchor (~128px top); resize works without first dragging the popup up.
- Briefly tried locking the popup bottom at `50vh` with `resize: horizontal` — reverted on pastor feedback (the lock made the resize feel broken).
- `.sws-writing` left padding bumped from `72px` to `96px` so the centered field sits ~12px right of dead-center; the popup-to-field gap grows from ~12px to ~24px.
- Verified in preview at 1440x900: popup right edge at 340, field left edge at 364, gap 24px, popup bottom at max stays 36px above viewport bottom.

---

## 2026-05-22 — Remove passage lookup search bar (deferred) and inline writing-surface "saved" indicator

- Removed the `.workspace-passage-lookup` search input + the second `<PassagePopup>` instance from `SermonWorkspace`; dropped the `lookupQuery`/`lookupRef`/`showLookup`/`lookupAnchor` state, `submitLookup`/`closeLookup` handlers, and the `NOMINAL_POPUP_HEIGHT` constant. Search is deferred — user will reintroduce later.
- Removed the inline `.sws-save-state` indicator from the writing surface — the topbar's `Saved` / `Saving…` / `Save failed` indicator already conveys the same status, so the inline mono "saved" tag was pure duplication.
- Dropped the `saveState` prop from `SermonWritingSurface`, the `surfaceSaveState` derivation in `SermonWorkspace`, and the fixture's `saveState`/`markSaving` simulation (all three `markSaving()` call sites trimmed from the fixture handlers).
- Kept `PassagePopup`'s anchoring + drag + scoped-Esc infrastructure so the eventual search re-add only needs a fresh state slice + second instance render.
- Verified in preview: search bar gone, inline save indicator gone, main popup still opens anchored under the trigger (28, 129) on click.

---

## 2026-05-22 — Workspace passage bar replaces drawer; draggable anchored popups; passage lookup

- Removed the `.sws-passage` inline drawer; replaced with a `.workspace-passage-bar` under the topbar — passage box + pencil + "click to see passage" hint + search input (Enter) for arbitrary-passage lookup. Writing surface expands to full width.
- `PassagePopup` rewritten — `initialPosition` prop, drag-from-header (window mousemove/mouseup), open-edge reset to anchor, per-popup Esc scope via `onKeyDown` so two popups don't both close on one keystroke.
- `SermonWorkspace` captures the passage box's bounding rect at click for the main popup anchor; the lookup popup stacks 488px further down by design — predictable spots regardless of main-popup state.
- Verified in preview: anchored popup at trigger.bottom+8, drag moved by exact delta, second popup at stacked anchor, Esc closed only the focused popup, pencil edit works at new location.

---

## 2026-05-22 — Restore workspace topbar + passage column text; add inline passage edit

- `.sws-shell` + corner chrome were `position: fixed; inset: 0` covering the workspace topbar entirely → changed to `position: absolute` so the topbar (Back, title, Delete, save) is reachable again; standalone `?surface=writing` fixture unaffected.
- `SermonWorkspace` read `passageData?.text` but the `passage-fetch` IPC carries verses on `.esv` → field-name fix restored ESV text in the writing-surface passage column (`PassagePopup` already read `.esv` correctly).
- Inline passage edit in the topbar — pencil next to the ref opens an input pre-filled with the current value; Enter/blur commits via the autosave path, Esc cancels, empty treated as cancel, so a typo'd passage no longer requires deleting the sermon to fix.
- Verified via preview (`?workspace=populated`): topbar reachable, Enter commits, Esc cancels; `?surface=writing` standalone fixture regression-checked.

---

## 2026-05-18 — Graph-view orphan cleanup: ANCHORS + BTI cross-links, theology corpus → ARCHIVE

- Graph-view audit found 22 orphan markdown files; 5 surprising (anchor + BTI cluster + privacy + dashboard brief) and 1 dead — fixed across 7 files plus a move.
- `CLAUDE.md` got rows linking `docs/ANCHORS.md` (registry) and `docs/PROPOSALS/dashboard-design-brief.md` (active handoff).
- `docs/ANCHORS.md` bare paths converted to markdown links; the 6 listed anchor charters now appear connected in graph view.
- BTI cluster cross-linked: charter ↔ build-mvp / setup-note / tester-summary, plus setup-note ↔ privacy and tester-summary → privacy.
- `docs/PROPOSALS/theology-corpus.md` → `docs/ARCHIVE/theology-corpus.md` (ORPHANED post-ARI); 3 `distribution.md` references updated to new path; memory pointer refreshed.

---

## 2026-05-18 — Re-mount FeedbackFlag on unified writing surface + fixture-pollution guard

- Hygiene scan (4 parallel agents across src/electron/docs/tests) found 7 post-rebuild issues; FeedbackFlag was the only HIGH severity — broken wiring after Phase E deleted ManuscriptTab. The other 6 (2 orphans, 2 schema-version doc-drift markers, 2 duplication observations) tracked in `project_hygiene_scan_deferred.md`.
- Re-mounted from `SermonWorkspace.jsx` in the top-right chrome cluster alongside the notebook button: `surface={writing-surface-${stage}}`, `step={stage/subPhase/fieldKey}`, sermonId from parent.
- BTI docs claim three FeedbackFlag mounts (Study/Blueprint/Manuscript); commit history shows only the Manuscript mount ever shipped (`08ca64e` closure was docs-only). The unified-surface mount is genuinely first-time per-stage coverage, not restored — both BTI docs need `/anchor-update` next session.
- Gated on `!_fixtureSermon` (same Phase D2 fixture seam as `persistUpdate`'s write-skip); both `?surface=writing` and `?workspace=...` preview routes verified flag-free, so fixture clicks cannot pollute real BTI telemetry.
- Renderer-to-IPC contract verified via stubbed `btiSubmit` (payload shape exactly as designed); IPC-to-worker network POST not exercised in Vite-only preview, data path unchanged from prior working Manuscript-tab mount (`08ca64e`).

---

## 2026-05-18 — Invisible-system rebuild: Phases F + G closed the sweep; post-sweep audit Chunks 1–5 + L2 shipped

- Phase F deleted the wall layer from `studyAdvancement.js` (`evaluateAdvance`, 2 formatters, 7 `check*Threshold` wrappers, 2 evidence builders, `canonicalSubPhase`/`subPhaseToIndex`) + `answeredQuestions` from `studyFields.js`; the 8 composite gate functions kept as the surviving completeness contract per CORE Process #2.
- Phase G closed the sweep — 3 rejection blocks deleted from `electron/main.js transitionState`; `isLegacySermon` + cutoff machinery retired; `Sermon.legacy` removed from contracts; CORE Process Contracts #1 + #2 rearticulated for the free-navigation + completeness architecture.
- Post-sweep audit Chunks 1–5 + L2: 26 stale tests removed (Chunk 1); `sermon-workspace.md` + `project-structure.md` rewritten end-to-end (Chunks 2 + 5, the latter against a fresh `ls`); 6 orphan components + `Collapsible.jsx` + `src/constants/steps.js` deleted (Chunk 3); 9 stale active-voice comments rewritten as past-tense gravestones (Chunk 4); gap-position fallback message humanized (L2).
- Discipline changes adopted on record: full-suite verification (`npm test -- --run`, not contracts-scoped per Chunk 1's H1 finding) and reference-doc reconciliation via real `ls` not grep-memory (per Chunk 5's 7 reconciliation findings including a silent `transport.js`→`config.js` rename).
- Closeout investigation: MPT/MPS flat-column sync confirmed broken post-D2c — live readers exist (Word export via `CompletedSermons` re-export, `assembleManuscriptText`) but the StudyTab.updateMPP-equivalent sync was never re-wired in D2c; filed as `bug_mpt_mps_flat_column_sync_broken_post_d2c.md`, fix decision pending.

---

## 2026-05-17 — Invisible-system rebuild: tour cleanup — tour engine deleted, sample-sermon decoupled

- Tour engine deleted: `TourContext`, `TourOverlay`, `workspaceTourStops` removed (3 files); `App.jsx` `TourProvider`/`TourOverlay`/`leaveTour` callback all dropped; `SermonWorkspace.jsx` no-op `useTour()` call retired (closing the D2c debt).
- Sample-sermon feature survives end-to-end via renamed plumbing: `electron/tourData.js` → `sampleData.js` with record-ID prefix rename `tour-*` → `sample-*` (sample-romans-2026, sample-romans-sermon-01, sample-rom5-row-N); IPC `load-tour-sermon` → `load-sample-sermon`; spine export `loadTourSermon` → `loadSampleSermon`; test-spine fixture handler matched; both allowlists updated; 5 list-query SQL filters + 3 in-handler filters all renamed to `sample-%`.
- `remove-tour-sermon` IPC + `removeTourSermon` spine export deleted (per-caller classification: purely tour-teardown — `leaveTour` was the only caller; sample-sermon path is self-cleaning via delete-then-insert in `load-sample-sermon`).
- `TOUR_STEP` telemetry constant removed (no source emitter); `fieldKeyToTourId` function removed (no callers); Dashboard's "Take the guided tour" ExploreRow removed, "Open a sample sermon" row kept and decoupled from tour vocabulary; `loadingAction` tri-state collapsed to `loadingSample` boolean.
- Reference docs refreshed (`ipc-channels.md`, `project-structure.md`, `schema.md`, `contracts.cjs` comment); `sermon-workspace-tour.md` retired-banner prepended.

---

## 2026-05-17 — Invisible-system rebuild: Phase E — trail UI deleted

- Atomic 12-file deletion: 6 trail UI files (`StudyTrailExegesis`, `AssemblyTrail`, `ManuscriptTrail`, `WorkspaceTrailMap`, `AdvanceGateChecklist` + test, `studyTrailShared`, `studyTrail.css`), 3 tab orphans (`StudyTab`, `AssemblyTab`, `ManuscriptTab` — unmounted since D2c), `tests/contracts/trail-layer-integration.test.tsx`. `studyTrailShared.jsx` full-deleted (spec anticipated 4 era-2 helpers to extract; grep proved zero external callers).
- Tour cleanup pulled out of E as its own phase — touches IPC + spine + allowlists and was only entangled with E because the trail was the tour's caller. SermonWorkspace's no-op `useTour()` call stays until that phase is authorized.
- Known open gap (Path A decision): Assembly/Outline, Assembly/Equip, Manuscript stages have no field defs in the writing surface — recorded as a separate tracked initiative. Regression already existed in production as of D2c; E only deletes the dead code that previously rendered them.
- `src/styles/global.css` comment block updated to reflect that `studyTrail.css` is deleted; sermon-workspace styling now lives in per-component CSS files.
- Lint baseline shifted: 5 pre-E tab/pill nav `no-raw-button` hits gone with the tab files; new baseline is 23 in the D2c/D2d writing-surface stack — Surface #2 catch-up pass now scheduled work. ENFORCEMENT_STATUS rows for Process #1, Process #2, Surface #2 + lint baseline updated to reflect post-E reality.

---

## 2026-05-17 — Invisible-system rebuild: D2e closes D2 — Process Contract #3 → threshold surface

- Process Contract #3 rearticulated in `docs/CORE.md` from "movement is a visible event" to "movement is visible at thresholds, not narrated continuously," citing the build spec's *Strategic orientation at thresholds* line and the era-2 charter's *Constraint without ceremony* clause.
- `tests/contracts/process-3-movement-visible.test.tsx` rewritten against the new vocabulary: sermon-start fires `.ssl-overlay` on null `last_touched_position`; Study→Anchor crossing fires `.sah-overlay`; within-stage chevron-next + map-jump produce no overlay and no `data-testid="movement-event"`. Meta-test inverted as the no-narration tripwire — no component under `src/components/` may carry that testid.
- `src/components/SermonWorkspace.jsx`: useMemo on the three sermon-derivations (above the early returns for hook-order stability); all 8 handlers + `writePositionAndThresholds` wrapped in useCallback; `NOTEBOOK_COLUMN_BY_STAGE` promoted to module scope. Verified at populated fixture: 5.4 ms/keystroke at CCS, 4.2 ms at canvas — no lag.
- Dedup: `STAGE_SUBPHASE_TO_COLUMN` exported from `sermonState.js` (was duplicated); `SermonWritingSurfaceFixture.jsx` now consumes `deriveStudyOutcomesFromSermon` + `deriveStudyUnfinishedFromSermon` via a shape adapter, replacing 4 local mirrors. Hardcoded `"Study"` strings in `sermonState.js` replaced with `STAGE.Study`.
- Phases E/F/G remain pending explicit authorization.

---

## 2026-05-17 — Invisible-system rebuild: trail deletion sweep A–C + D1 + D2a–d shipped

- Phase A (dead AI flattening pipeline) + B1 (legacy PC columns) + B2 (`current_step` retired) + B3 (Blueprint/Frame stage aliases retired; Delivery stays) + C (`hasContent` helper replaces 4 `!!flattenAnswerValue` truthiness sites in composites) closed atomically with in-chunk test + doc updates.
- D1 added v23 migration for `last_touched_position` + `thresholds_seen` columns — both renderer-written via `persistUpdate`, NOT in `SPINE_ONLY_COLUMNS`; distinct from `current_step`'s retirement (same conceptual role, opposite fates).
- D2a–c shipped the production wiring: new `sermonState.js` derivation helpers, `useEsvPassage` hook extracted from `PassagePopup`, and `SermonWorkspace.jsx` rewritten to mount writing surface + map + threshold overlays in place of the tab-trail render. `SermonWorkspaceFixture.jsx` verifies three scenarios (empty / populated / at-handoff) through the real render path.
- D2d wired `WorkspaceNotebookDrawer.jsx` + CSS with stage→column dispatch; summon control sits as a quiet mono link near the save indicator.
- D2e half-complete: `process-2-evidence-gated-ux.test.tsx` selector swap landed; `process-3-movement-visible.test.tsx` rewrite pending Process Contract #3 surface decision (spec open Q7).

---

## 2026-05-11 — Walking on from a sub-phase pause lands at the first field of the next sub-phase

- `advance()` in `StudyTrailExegesis` now sets `currentActiveFieldKey` to the first field of the next sub-phase before clearing the pause point, when `pausePoint.nextKey` is a numeric sub-phase (2 / 3 / 4).
- Fixes the bug where walking on from the Observation Set pause (end of Observe) landed the pastor directly on Interpretation Synthesis — `firstIncompleteFieldKey`'s fallback returns the last incomplete field, which on the Romans 5:1-5 worked example (every Interpret field filled except Synthesis) skips the entire sub-phase. Look-back from there then walks Interpret in reverse, which is the symptom that surfaced the bug.
- Same pattern is present in `AssemblyTrail`, left untouched — Anchor and Frame have only 2 fields each so the mid-phase landing case is much rarer. Will revisit if it surfaces.
- Preflight + drift-check PASS; preview clean.

---

## 2026-05-11 — Trail clearing: flex column so actions stay anchored, top-clamped so chrome never overlaps

- Repositioned `.tw-clearing` so it centers within the trail body (below the 106px topbar+ribbon chrome) instead of 58% of the full viewport. A tall card can no longer bleed upward into the topbar zone regardless of content height — fixes the "jumbled rats nest" overlap at the top.
- `.tw-clearing` is now a flex column with `max-height: calc(100vh - 106px - 32px)`. `.tw-clearing-body` gets `flex: 1 1 auto; min-height: 0; overflow-y: auto` so the input area absorbs excess height while eyebrow / title / prompt / actions / gate stay full-size. The "← look back" / "Continue" row is always visible at the bottom of the card — no scrolling required.
- Pause / stage variants (no `.tw-clearing-body`) fall back to whole-card scroll via `overflow-y: auto` on the clearing itself; `.tw-clearing-gate` gets `flex-shrink: 0` so the composite-gate checklist never gets squeezed.
- Removed the prior `.tw-clearing-body { max-height: 420px }` cap from the earlier session — flex now governs sizing end-to-end.
- Preflight + drift-check PASS; preview verified clean.

---

## 2026-05-11 — Study trail layout fixes: canvas panel, clearing chrome, footprint labels

- Divisions (unified-canvas) field now renders as a full-height scrollable panel below the topbar+ribbon instead of the centered clearing card. The scripture column hides while the canvas is active since the text is embedded inline. Resolves the multi-verse clipping that pushed the topbar off the top and the actions off the bottom.
- Re-stacked z-index on the regular clearing (`.tw-clearing` → 3, ribbon → 5, topbar → 6) so chrome always paints above a tall card. Added `max-height: 420px` + `overflow-y: auto` to `.tw-clearing-body` so long textareas / synthesis tables scroll inside the body instead of pushing "← look back" / "Continue" off the viewport.
- Trail station ordinal labels now only render when the station is at or behind the active stop (`isBehind` prop on `Station`). Looking back no longer surfaces higher-numbered footprints ahead of the current position. Applied symmetrically in `StudyTrailExegesis` and `AssemblyTrail`.
- Preflight + drift-check PASS; preview verified clean (no console errors, app boots).

---

## 2026-05-11 — Search-driven navigation: click a hit, land on the right surface

- New `src/utils/searchHints.js` maps each search-result `matchedColumn` to a `{ stage?, subPhase?, openNotebook? }` hint. A notebook match opens the workspace at that stage with the drawer pre-opened; a sub-phase match (Observe / Interpret / Anchor / Frame, etc.) lands at that sub-phase; a Manuscript-bucket match lands in the writing room.
- Hint plumbed through the existing open-sermon flow: `SermonList` + `CompletedSermons` compute the hint per result, `App.jsx`'s `openSermon(id, hint)` forwards it to `SermonWorkspace`, which seeds `activeTab` from the hint (overriding `current_stage`) and forwards a per-tab `navHint` to `StudyTab` / `AssemblyTab` / `ManuscriptTrail`. The notebook drawer's `useNotebookToggle` now accepts an `initialOpen` option.
- Stage-overview clearings (DW12 — "Entering Assembly" / "Entering the Writing Room") are bypassed when the pastor arrived from a search-result click. They came for the match, not the framing.
- 839/839 vitest green; preflight + drift-check PASS; preview verified the navigation path mounts.

---

## 2026-05-11 — Sermon search UI: list views wired to the new full-content search

- `SermonList.jsx` and `CompletedSermons.jsx` now call the v22 `searchSermons` IPC instead of filtering client-side on title / passage / series only. A 200ms debounce keeps the IPC traffic sane during typing; each view still constrains results to its lifecycle scope (`in_progress` for the active list, `complete` for the completed view) so the search doesn't bleed across surfaces.
- New `SearchResultSnippet.jsx` renders the backend snippet with `‹mark›…‹/mark›` markers split into `<mark>` elements. A per-column label sits in front of the snippet so the pastor sees WHERE the match landed — "STUDY NOTEBOOK · …prodigal…" or "MANUSCRIPT · …prodigal son's father…".
- Snippet card styling added to `global.css`: parchment-warm background, gold left border + gold-pale mark highlight. Matches the rest of the design system tokens.
- Placeholder updated to "Search anywhere in your sermons — title, passage, study notes, manuscript, notebooks…" so the new scope is visible without explanation.
- 839/839 vitest green; preflight + drift-check PASS; preview verified the snippet path mounts + renders cleanly with the stub returning empty results.

---

## 2026-05-11 — Sermon full-content search backend (v22 schema)

- New `sermon_search` table (v22 migration) holds flattened plain text per indexed column for every sermon. Indexed columns cover title, passage, series_title (JOINed), the four Study sub-phase JSON envelopes, Main Point Pair, Sermon Frame, outline, manuscript, all three notebooks, delivery notes, and timing notes. JSON envelopes are flattened to concatenated leaf text so search hits read as natural prose instead of tokenizing on `{`, `}`, `"`.
- Indexer (`indexSermonFts` / `indexSermonFtsFromRow` / `dropSermonFts`) wired into every sermon write path inside `validateAndCommit` — `create-sermon`, `update-sermon`, `update-series` (when title changes, re-indexes all attached sermons for series_title sync), `apply-mutation`, `delete-sermon`, `delete-series` (clears series_title from affected sermons), `load-tour-sermon`, `remove-tour-sermon`. First-launch backfill indexes every existing sermon.
- New IPC channel `db-searchSermons` with LIKE-based matching across all indexed columns, AND semantics across tokens (each query word must appear somewhere on the row, OR'd across columns). Returns sermon metadata + a JS-side snippet with `‹mark›…‹/mark›` highlighting around the first matched range. Renderer wrapper exported as `searchSermons(query, limit = 50)` from `src/db/database.js`.
- Why not FTS5: `sql.js` doesn't compile the FTS5 extension; LIKE-based matching on the flattened text is fast enough at pastor library sizes (<500 sermons).
- 839/839 vitest green; preflight + drift-check + sweep-the-house + simplify PASS. Schema reference docs the new `sermon_search` table.

---

## 2026-05-11 — Trail-layer contract tests

- New `tests/contracts/trail-layer-integration.test.tsx` — 13 tests covering the integration gap the post-WTC audit flagged: spine contracts were unit-tested in isolation, but no test asserted that the trail's advance / look-back / cross-stage paths actually route through `transitionState`.
- Three live integration tests confirm each stage's trail shell mounts (`.tw-shell` for Study + Assembly, `.tw-shell-writing-room` for Manuscript) against the test-spine fixture.
- Five source-level structural checks enforce that `SermonWorkspace.handleTabChange`, `StudyTab.advanceSubPhase` + `jumpToSubPhase`, and `AssemblyTab.advanceSubPhase` + `jumpToSubPhase` + `jumpToStudy` all `await transitionState(...)` — guards against silent removal of spine routing.
- Two structural checks lock in cross-stage pause-dismissal routing: `StudyTab`'s `setPausePoint` wrapper routes `nextKey === "assembly"` through `onTabChange`, and `AssemblyTab`'s wrapper routes `nextKey === "manuscript"` similarly. Three meta-tests guard the structural checks against vacuous-pass refactors.
- 839/839 vitest green (up from 826); preflight + drift-check PASS.

---

## 2026-05-11 — Cleanups: drawer Esc, orphan-file delete, doc-drift quieting

- Notebook drawer Esc now closes the drawer from anywhere — including inside the textarea — instead of requiring the pastor to Tab out first. The trail's own Esc handler is already gated on `modalOpen: notebook.open` so it won't also fire and exit the trail.
- Deleted orphan `src/components/NotebookPanel.jsx` and its stale mention in `Collapsible.jsx`'s header comment — no remaining imports after the 2026-05-11 manuscript dedupe.
- Doc-drift quieting: stripped backticks from historical mentions of ARI-deleted files (electron/ai.js, src/prompts/study.js, electron/ai/provider.js, src/utils/ai.js) in `ENFORCEMENT_STATUS.md` + `project-structure.md`, and reshaped `handoff/sermon-workspace-cd-brief.md`'s file list to separate deleted-by-WTC names from current pointers. `drift-check.sh` C2 now reports `none`.
- Committed pre-existing `docs/RULES.md` push-flow addition (single-dev, direct-to-main, `/end-session` flow) that had been sitting unstaged.

---

## 2026-05-11 — Post-WTC audit fixes: pastor UX, accessibility, contract repair, dark mode

- Trail keyboard + focus: Cmd/Ctrl+. now respects editor focus so it stops eating period keystrokes in textareas; the trail's Esc handler defers when the notebook drawer or trail map is open so closing a drawer no longer also exits the trail; equip-point accordion is a real `<button>` with `aria-expanded`; `PassagePopup` + `NotebookDrawer` got proper `role="dialog"` + `aria-modal="true"` + focus return on close.
- State Contract #4 — `TrailTopBar` now renders the series breadcrumb (`Series · 3 of 7`) with prev/next sibling navigation; SermonWorkspace forwards `siblingIds` through StudyTab / AssemblyTab / ManuscriptTrail. Process Contract #3 — tour-driven tab change now routes through `handleTabChange` so the `data-testid="movement-event"` marker fires.
- Dark-mode parity — six hardcoded shadow/border RGBs in `studyTrail.css` extracted to new themed `--tw-*` tokens that flip in `[data-theme="dark"]`. New `TrailLiveRegion` (sr-only `aria-live="polite"`) announces sub-phase/field changes for screen-reader users.
- Cleanups — ~350 lines of dead CSS removed (`.spotlight-*`, `.pause-point-*`, `.func-elem-*`, `.worksheet-*`); manuscript inline `NotebookPanel` deduped against the writing-room `NotebookDrawer`; unused `SUB_PHASE` import dropped from `StudyTab`; `TrailCanvas` wrapped in `React.memo`; `useViewportSize` throttled to 120ms.
- Docs drift — `sermon-workspace.md` rewritten for trail surfaces; `schema.md` bumped to v21 with migrations v14–v21 + notebook/MPP/last_*_subphase columns; `project-structure.md` file tree updated. `drift-check.sh` PASS.

---

## 2026-05-11 — Per-stage sub-phase memory in DB; sample sermon always lands at the beginning

- Schema v21 adds `last_study_subphase` + `last_assembly_subphase` columns so per-stage position lives in the canonical sermon record instead of scattered localStorage; `transitionState` writes them on every sub-phase movement, stage transitions COALESCE from them so tab-out + tab-back preserves position.
- Tour sermon seed resets both columns to first sub-phase on every reseed, so "Open a sample sermon" always lands at Study / Observe regardless of where the pastor wandered last session — replaces the patchwork tour-skip in localStorage reads from `1dd320e`.
- New `SPINE_ONLY_COLUMNS` set (mirrored in `src/core/contracts.ts` + `electron/contracts.cjs`); `pickSermonColumns` filters spine-written columns out of user-edit saves so a stale renderer view can't clobber a fresh spine write. `subPhaseToIndex` helper in `studyAdvancement.js` unifies the StudyTab + AssemblyTab init.
- `persistMutation` guards against empty payloads; six orphaned legacy files removed (`SpotlightWorksheet.jsx` + test, `ThroughlineRail`, `ThroughlineCanvas`, `PausePointScreen`, `throughline.css`) along with their dead imports in `AssemblyTab`; synthesis-table renders as labeled cards when columns exceed 3, and `.dash-row` gets `flex-shrink: 0` so the Resume Work tile scrolls instead of squashing.
- 826/826 vitest green.

---

## 2026-05-11 — Fix trail clearings overflowing at 1200px + hidden passage popup

- Stage-boundary pause and stage-overview clearings now use scripture-aware widths (`calc(100vw - 400px - 64px)`) so they fit at 1200px instead of overflowing 40px and 10px each side respectively into the scripture column and off-screen.
- Passage popup z-index raised to 1050 so it renders above the trail shell instead of hidden beneath it when opened from a trail's PASSAGE chip.
- Removed dead `.tw-clearing-workshop max-width: 900px` (always overridden by the smaller base width).
- Removed redundant `.tw-shell-writing-room .tw-notebook-drawer` override + its stale comment.
- `tw-trail-handoff` keyframe ends at `transform: none` so the shell no longer holds a residual transform that would create a containing block for fixed descendants.

---

## 2026-05-11 — WTC charter: pre-WTC rollback note

- Added a rollback callout to `workspace-trail-charter.md` recording the pre-WTC SHA (`348e438` — "Post-ARI doc-drift sweep", parent of `3090d20` "Trail experiment") and the `git checkout -b pre-wtc-restore 348e438` branch command.
- Note enumerates what a revert restores (three-column shell, Study/Frame/Manuscript tab strip, `ThroughlineRail`, standalone `OutlineBuilder` / `FunctionalElements` / `FrameTab` / `ManuscriptTab`) and what it loses (every trail surface, step-boundary pauses, per-stage notebook, Trail Map, rewritten workspace tour, writing-room mode).
- Chosen over a separate "old workspace state" doc — git already preserves the state, and a 3-line note keeps the rollback path discoverable 6 months out without a parallel description to drift.

---

## 2026-05-11 — WTC closure: contract tests migrated, legacy fallbacks retired, Phase M complete

- The two `process-*` UI contract tests (`process-2-evidence-gated-ux`, `process-3-movement-visible`) migrated off the retired `sermonforge_trail_disabled` flag onto trail surfaces — deep gate behavior stays covered by `evaluateAdvance` unit cases plus `AdvanceGateChecklist.test.jsx`, and the meta-test still guards `data-testid="movement-event"` against silent removal.
- Legacy three-column shell body + tab-strip fallback + `AssemblyToManuscriptPause` + `CollapseArrow` + `FuncElem` + the `sermonforge_trail_disabled` flag deleted from `StudyTab.jsx` / `AssemblyTab.jsx`; the trail is now the only rendering of every stage with no fallback.
- Pastor declared Phase M (full-sermon end-to-end walkthrough) complete; WTC charter banner-tagged closed.
- `ENFORCEMENT_STATUS.md` "Last verified" bumped to 2026-05-11; Process #2 (evidence-gated UX) and Process #3 (movement-is-visible) preserved through the migration.
- 873/873 vitest green; preflight PASS; `ThroughlineRail.jsx` / `ThroughlineCanvas.jsx` / `SpotlightWorksheet.jsx` / `FrameTab.jsx` / `PausePointScreen.jsx` files now imported nowhere — deletable in a future sweep.

---

## 2026-05-11 — Workspace Trail Charter sequel arc: 8 items shipped (DW5/7/8/9/10/11/12 + RW4/8/9 + escape-hatch retirement)

Closes the Workspace Trail Charter. All eight items queued for the sequel arc on `claude/workspace-trail-sequel` shipped in six commits (`d098219` → `b0adf2b`); the trail is now the sole user-facing rendering of every stage and × Exit returns to the Dashboard.

- **Item 1 (RW4 + RW9 + DW9): heavier step-boundary pauses.** New `StageBoundaryPause` in `studyTrailShared.jsx` renders Study → Assembly and Assembly → Manuscript with a gold-bright hairline marker, "A THRESHOLD" eyebrow, italic Playfair 48px title, 880px card, and a four-outcome stack. Study reads back Observation Set / Interpretation Set / Christ-Connection Statement with the Implications synthesis editable inline; Assembly reads back Main Point Pair / Sermon Outline / Sermon Body with the Sermon Frame's Intro + Conclusion pair editable inline. Sub-phase pauses stay light. AssemblyTab tab-strip fallback `AssemblyToManuscriptPause` aligned to the new register.
- **Item 2 (DW5): Manuscript writing-room.** New `ManuscriptTrail.jsx` wraps `ManuscriptTab` in a `.tw-shell-writing-room` variant — Ink topbar, scripture column on the right, 820px reading-column body, soft enter animation. Manuscript content (Intro / points / transitions / conclusion / review / notebook) keeps its UX inside the trail shell.
- **Item 3 (DW7): camera handoff.** New `tw-trail-handoff` keyframe + 0.55s ease-out on `.tw-shell`. Cross-stage trail mounts glide in from a 48px right-offset and fade up so the cut reads as a camera pan around the bend. Per-stage STOPS arrays were already in code from the prior merge.
- **Item 4 (DW12): stage-level overviews.** New `StageOverview` + `useStageOverviewSeen(stageKey)` (sessionStorage). Fires once per session on first mount of Assembly + Manuscript — Assembly's overview reads back the four Study syntheses from each phase's `_synthesis` envelope; Manuscript's reads back MPP + Outline + Frame as preview lines.
- **Item 5 (DW8): per-stage notebook.** New `NotebookDrawer` + `useNotebookToggle` — bottom slide-up sheet (55vh, 540px cap), gold pill toggle in `TrailTopBar`, Cmd/Ctrl+N. All three trails wire it; persists to `notebook_study` / `notebook_blueprint` / `notebook_manuscript` via `onUpdate` — no schema change.
- **Item 6 (DW11): Workspace Trail Map.** New `WorkspaceTrailMap.jsx` modal — single-screen three-row switchback (Study → Assembly → Manuscript), 9 sub-phase stops, named-outcome labels, current location pinned with gold glow. Visited stops fade-fill; unvisited stay outline-only. `useTrailMapToggle` (Cmd/Ctrl+M) + Map button in topbar (`.tw-map-toggle`).
- **Item 7 (RW8 + DW10): tour re-anchored.** `WORKSPACE_TOUR_STOPS` rewritten — Stops 1/2/11 retitled for the trail metaphor ("The Sermon Trail." / "The Trail Map." / "The Writing Room."); stops 3-6 share `trail-clearing` (prerequisite-driven `studySubPhase` swaps content per stop); stops 7-10 target Assembly trail's active sub-phase clearing via conditional `data-tour-id`; stop 11 targets the writing-room body. `docs/PROPOSALS/sermon-workspace-tour.md` re-anchor banner added + Codebase touchpoints rewritten.
- **Item 8: trail-suppress escape hatch retired.** User-facing `trailSuppressed` state removed from StudyTab + AssemblyTab + ManuscriptTrail; "Trail mode →" re-entry pills removed; × Exit + Esc now route through `SermonWorkspace.onClose` → Dashboard. The `sermonforge_trail_disabled` localStorage flag is retained as a test-only escape (the two `process-*` contract tests still set it); migrating those tests onto the trail surface is the only remaining cleanup before the legacy fallback bodies in StudyTab + AssemblyTab can be deleted.

All four data round-trips remain on the existing column envelopes — no schema or contract change. Composite gates still fire from the spine; this whole arc is rendering work. 291/291 vitest green; ESLint clean on the new code (12 pre-existing `no-raw-button` errors in deferred-Pilot-C files only); drift-check PASS; architectural audit PASS across all 10 contract + integrity checks.

`workspace-trail-charter.md` banner-tagged 2026-05-11 with the eight items + their resolutions in one table. `MEMORY.md` updated to reflect closure. Pastor-test gate (Phase M of the charter — "at least one full sermon prepped from text to manuscript through the trail") is the next user-driven step.

---

## 2026-05-10 — ESV key: validate on entry, add in-app update path

- `app-save-api-key` IPC handler now validates the key against the ESV API before saving; 401/403 returns a clear error, network failures save the key silently.
- New `EsvKeyModal.jsx` lets users update their ESV key from inside the app at any time.
- "Update ESV key…" link added to the sidebar footer, opening the modal.

---

## 2026-05-10 — Pastor walkthrough closure: RW2 gate tightening + DW14 save-indicator retired + 13 charter resolutions locked

- RW2: `checkOutlineToEquipThreshold` added in `studyAdvancement.js` — every outline point must have non-empty text. Placeholder rows no longer pass the Outline → Equip composite gate.
- RW3: Manuscript locked as a single continuous surface (no sub-phases). DW14: hardcoded "SAVED" indicator + `.tw-save` CSS retired from the trail; autosave runs silent via 500ms `saveDb()` debounce. DW15: no mobile / narrow-viewport support — ~1200px+ is the supported floor.
- RW4 + RW9 + DW9: step-boundary pauses (Study → Assembly, Assembly → Manuscript) get a heavier visual register; sub-phase pauses stay light. Sequel arc.
- DW5 (Manuscript writing-room mode), DW6 (sidebar stays hidden during walk — current behavior), DW7 (per-stage STOPS + camera handoff), DW8 (per-stage notebook), DW10 + RW8 (full tour rewrite to match WTC), DW11 (workspace-wide Trail Map — clean or doesn't ship), DW12 (stage-level overviews) all locked; queued for the sequel arc.
- DW13: all-at-once cutover via the merge itself. Stage-by-stage feature flagging not used. 291/291 vitest green; drift-check PASS.

---

## 2026-05-10 — Workspace Trail Charter Phases 5+6: unified Assembly trail + simplify pass

- New `AssemblyTrail.jsx` collapses Anchor / Outline / Equip / Frame into one switchback (10 stops across 4 rows); workshop-clearings host `OutlineBuilder` + per-point FE editors inline (DW3 + DW4 resolved to Mode 1). `StudyTrailForge.jsx` retired.
- Shared trail primitives extracted into `studyTrailShared.jsx` (`padNum`, first-incomplete helpers, `useViewportSize`, `useSyncActiveQuestion`, `useTrailKeyboard`, `TrailTopBar`, `TrailDefs`, `Station`, `SaveStatus`); StudyTrailExegesis + AssemblyTrail both consume them.
- Restored `FuncElem` CollapseArrow + collapsed-preview + (ESV)/(E)/(A)/(I) field-label badges in `AssemblyTab.jsx` that dropped during the move; trimmed restructure-task narration from contract files.
- New `getQuestionString` helper in `studyFields.js` replaces ~6 inline IIFE patterns + the local `getFrameValue`. Unified `MainPointPairPause` + `SermonFramePause` into a single `PairPauseClearing` parameterized by row config.
- Sermon Frame pause now fires correctly at the Frame → Manuscript boundary (the stale `nextKey === "manuscript"` exclusion was dropped). 291/291 vitest green; sweep PASS; drift-check PASS.

---

## 2026-05-10 — Workspace Restructure: three-step sermon arc (Study / Assembly / Manuscript)

Top-level workspace collapsed from four stages to three. The within-Study Step layer (Exegesis / MPT_MPS / Outline / FunctionalElements) retired entirely. Study is now just Exegesis (4 sub-phases unchanged); the new Assembly stage hosts MPT/MPS + Outline + FE + Intro/Conclusion as 4 sub-phases (Anchor / Outline / Equip / Frame). Each Assembly sub-phase produces a named outcome (Main Point Pair / Sermon Outline / Sermon Body / Sermon Frame).

Charter: [`docs/PROPOSALS/workspace-restructure-charter.md`](docs/PROPOSALS/workspace-restructure-charter.md). All content commitments preserved (SFDI fields unchanged, SADI anchor walks unchanged, ARI's no-AI binding preserved, save flow + schema unchanged).

- **Contracts (`src/core/contracts.ts` + `electron/contracts.cjs`):** `Stage` collapsed (Blueprint + Frame retired; Assembly added). `Step` type/enum + `STEP_CANONICAL_SEQUENCE` + `STEP_LABELS` retired entirely. `SubPhase` extended with Anchor / Outline / Equip / Frame. `STUDY_SUB_PHASE_SEQUENCE` + `ASSEMBLY_SUB_PHASE_SEQUENCE` + `SUB_PHASE_STAGE` added. `ProcessPosition.step?` field removed.
- **Spine (`src/core/spine.ts` + `electron/main.js`):** `transitionState` `to` parameter is now `Stage | SubPhase` (Step retired). New main-side `coerceLegacyStage()` maps `Blueprint` / `Frame` → `Assembly` on read AND on `to` payloads, so legacy DB values + older renderer payloads route cleanly. `create-sermon` and `load-tour-sermon` INSERTs set `current_step = NULL`.
- **Gates (`src/utils/studyAdvancement.js`):** `canonicalStep` + `STEP_BY_INDEX` + `buildStepEvidence` retired. `canonicalSubPhase(n, stage)` takes a stage parameter. `evaluateAdvance(sermon, kind, fromIndex, stage)` is the new shape — `kind: "stage" | "sub_phase"`; `stage` disambiguates Study sub-phases from Assembly sub-phases. Composite gates preserved by content but renamed routes: Anchor → Outline (was Step 2 → 3); Equip → Frame (was Step 4 → next); Assembly → Manuscript (was Frame → Manuscript stage at fromIndex=3, now stage at fromIndex=2).
- **Workspace shell (`src/components/SermonWorkspace.jsx`):** 3-tab strip. `OutlineTab.jsx` + `FrameTab.jsx` deleted. New `AssemblyTab.jsx` is the parent for the four Assembly sub-phases. `StudyTab.jsx` trimmed to Exegesis-only — `STUDY_STEPS` strip retired; Step 2/3/4 rendering branches deleted. "How it works" modal SVG re-drawn for 3 stages.
- **Step-boundary pause-clearings:** Study → Assembly outbound pause (Implications Synthesis) deferred tab change to pause dismissal so the pastor walks across the bend deliberately. Assembly → Manuscript outbound pause renders the four named outcomes as a summary review (Main Point Pair + Sermon Outline + Sermon Body + Sermon Frame).
- **Tests:** `tests/contracts/_helpers/test-spine.ts` mirrors new contracts + coerces legacy stage values. `process-1-monotonic.test.ts` rewritten for the 3-stage + 8-sub-phase shape. `process-2-evidence-gated.test.ts` + `process-2-evidence-gated-ux.test.tsx` + `process-3-movement-visible.test.tsx` + `process-4-pc-follows-text.test.tsx` + `sprd-c3-sermon-frame.test.tsx` migrated. New `localStorage.sermonforge_trail_disabled` flag opts tests out of the trail rendering for legacy-button assertions. 105/105 contract tests green.
- **Tour (`src/tour/workspaceTourStops.js`):** Frame tour stop re-anchored to `STAGE.Assembly`. (Tour anchor IDs `mpt-field` / `outline-builder` / `frame-worksheet` carry forward — `data-tour-id`s preserved on the new AssemblyTab sub-phase renderers.)
- **Documentation:** `docs/CORE.md` Canonical Vocabulary, State #2, State #5, Process #6 updated. `docs/REFERENCE/project-structure.md` + `schema.md` + `ipc-channels.md` + `privacy.md` migrated. `docs/SYSTEMS/sermon-workspace.md` banner-tagged. Charters banner-tagged: `workspace-trail-charter.md` (Stage A–G phasing re-mapped), `sadi-charter.md` + `sermon-anchor-definition-initiative.md` (anchor *steps* → anchor *sub-phases*), `sfdi-charter.md` (Step 1 framing maps to Study stage), `study-field-definition-initiative.md`, `study-phase-redesign.md` (SPRD C3 superseded).
- **Worktree:** Originally shipped on `thirsty-bell-2d469b`; landed on main 2026-05-10 with the unified Assembly trail (Phases 5+6) + pastor-walkthrough resolutions in the same merge. RW8 + DW5 + DW7-DW12 queued for the sequel arc.

---

## 2026-05-09 — Post-ARI doc-drift sweep: live refs corrected, charters banner-tagged

- `docs/SYSTEMS/ipc.md` and `docs/REFERENCE/project-structure.md` rewritten; `ipc-channels.md` purged of memory channels + Anthropic semantics, BTI telemetry channels added.
- `RULES.md`/`database.md` memory rules removed; `ENFORCEMENT_STATUS.md` corrected (Mutation #2 retirement, SADI AI principle, no-direct-ai allowlist, MPS_DRAFT, Process #4); `distribution.md` and ACCI stub fixed.
- Closed-initiative charters (SFDI/SADI/SPRD + working docs) and stale design briefs (sermon-workspace-tour, sermonforge-field-walkthrough, theology-corpus, dashboard-design-brief) tagged with post-ARI / stale / orphaned banners.
- `sermon-workspace-tour.md` file list cleaned; Stop 12 retired note added; 12 → 11 stops.
- New `scripts/drift-sweep-ari-bti.sh` validator (re-runnable; converged at exit 0).

---

## 2026-05-09 — ARI Phases 5+6: synthesis questions and outline questions (placeholder wording)

- `PausePointScreen` now shows a one-sentence synthesis question at each sub-phase boundary; pastor's answer persists to `_synthesis` in the sub-phase JSON column.
- Collapsible "Outline Questions" panel added to Blueprint tab with four placeholder questions walking from MPS to outline structure.
- `docs/SYSTEMS/sermon-workspace.md` fully rewritten for post-ARI state (all AI references removed).
- ARI charter updated: Phases 5+6 marked shipped; D1/D2 wording sessions remain open; Phase 11 schema cleanup deferred.

---

## 2026-05-09 — BTI Q1 closure: FeedbackFlag mounted on Manuscript tab

- `ManuscriptTab.jsx` now mounts `<FeedbackFlag surface="manuscript-tab" step={STAGE.Manuscript} />` (absolute top-right; pattern matches StudyTab and OutlineTab).
- Charter Q1 settled at three mounts (Study, Blueprint, Manuscript); Phase 1.5 marked closed.
- Tester-summary, setup note, and build-proposal delta table updated to name all three tabs; setup note adds "review checklist missed the thing you actually noticed" as a flag-worthy example.

---

## 2026-05-09 — BTI rewrite for post-ARI product + Phase 1.5 cleanup

- Charter rewritten (`beta-testing-initiative.md`): Anchor 1 recast as "structural overreach" (question flow shaping pastor voice); dimensions overhauled; telemetry trimmed of AI events; frame-check hypothesis shifted to question-driven drift.
- Privacy doc rewritten: Anthropic section removed; ESV/Crossway is the sole external service; AI exchange include dropped from flag description.
- Tester letter and setup note reframed: thesis is "system asks; pastor answers"; hard-feedback examples shifted to question-driven friction.
- Build proposal converted from forward implementation spec to historical record with pre/post-ARI delta table.
- Phase 1.5 code cleanup: `events.js` drops dead `AI_PRESS` / `AI_PROPOSAL`; `FeedbackForm.jsx` dimensions match charter (verified in preview).

---

## 2026-05-09 — ARI residue cleanup: drop dead refs + Dashboard sample passage

- Removed the `phrasePatterns` / `aiPhrasePatterns` Absolute Invariant from `docs/CORE.md` — its runtime guard lived in `src/utils/memory.js`, deleted in the ARI audit fix-pass.
- Pruned `^src/utils/ai\.js$` and `^src/prompts/` from `scripts/preflight.sh` `SWEEP_PATTERNS` — both paths were deleted in ARI Phase 8 and will never match a future diff.
- Stripped the `(see AIPanel.jsx:104)` citation from the `.eslintrc.cjs` exhaustive-deps comment — `AIPanel.jsx` was deleted in ARI Phase 1.
- Fixed the Dashboard "Open a sample sermon" passage label from `Romans 8:28-39` to `Romans 5:1-5` to match the actual tour seed in `electron/tourData.js:90`.

---

## 2026-05-09 — Fix Surface Contract #4 test: Planning placeholder added to EXPECTED_DEEP

- `tests/contracts/surface-4-you-are-here.test.ts` added `Planning` to `EXPECTED_DEEP`; ARI's `<SeriesPlannerComingSoon />` route in `App.jsx:239` was orphaning the Test workflow on `main`.
- Test 2 ("four canonical top-level destinations") rewritten to match the post-ARI sidebar surface set: `Dashboard / Sermons / CompletedSermons / Calendar` — Planning is no longer canonical, only a placeholder.
- Comment block above `EXPECTED_DEEP` rewritten to document why Planning + SeriesPlanner are deep routes (placeholder catch for legacy internal navigation, not user-reachable surfaces).
- `docs/ENFORCEMENT_STATUS.md` Surface #4 per-clause row updated with the new EXPECTED_DEEP set and PascalCase view keys; Last verified line bumped with the follow-up note.
- Full vitest suite green: 22 files, 291 tests.

---

## 2026-05-09 — ARI: AI removed from SermonForge

- Phases 0–4 + 7–10 of the AI Removal Initiative shipped (charter at `docs/PROPOSALS/ai-removal-initiative.md`); Series Planner gated, all AI surfaces cut (chat panels, Generate/Suggest/Review buttons, Flow Coach/Ear Check/Tune-Up), per-tab Notebooks added, Manuscript review reframed as static checklists, Delivery tab removed.
- Backend deleted: `electron/ai.js`, `provider.js`, `sendAIMessage`, `@anthropic-ai/sdk`, all prompts, context pipeline, memory pattern-capture system; SetupScreen rewritten as ESV-only; `app-get-key-status` repurposed for first-run gating.
- Contracts rewritten: Process #5 ("No AI substitution"), Mutation #1 (pastor-only authorship), Mutation #2 retired; `MutationKind` collapsed to `user_input`; `validateAndCommit` AI branches removed; identity sentence + architectural boundaries + tech stack updated.
- Schema v20 adds `notebook_study`/`notebook_blueprint`/`notebook_manuscript` columns (verified end-to-end against real-DB copy); `Collapsible` primitive extracted; ESLint `no-direct-ai` rewritten as no-exception tripwire; ~280 lines of dead AI CSS pruned.
- Website updated: `/sermonforge/` "Requires" row → "Optional Setup" (ESV); starter page card adds "Clarity through constraint" framing.

---

## 2026-05-08 — BTI Phase 1 Chunks 3-6: in-app feedback surfaces + Q9 disclosure

- New `FeedbackFlag` icon-button + popover mounted at all six AI surfaces (AIPanel header, StudyTab/OutlineTab/DeliveryTab tops, SeriesPlanner topbar, ProposalPanel header via threaded `flagContext`); per-surface `lastAiCallRegistry` fed by `sendAIMessage` (added `surface` arg threaded through 27 call sites in 5 components), which also emits `ai-press` telemetry.
- Main-side `bus.sendImmediate(kind, payload)` with offline-persist `<session>.immediate.ndjson` queue drained on the periodic flush; new `bti-feedback-submit` IPC + `electronAPI.btiSubmit` for flag/form payloads.
- New `FeedbackForm` modal with the charter's 10-dimension picker + free-text + Send (default dimension "What surprised you"); Sidebar's "Send feedback" TextButton repointed from the legacy `FeedbackModal` to the new BTI form.
- New `transport/inbox.html` self-contained dev page (three tabs: Flags, Forms, Telemetry) with localStorage URL+token; Worker `/inbox` gains CORS headers + OPTIONS preflight (requires `wrangler deploy` to land).
- `SetupScreen` extended with a "Telemetry and feedback" section + opt-out toggle (default on); `electron/main.js` reordered so the `bti_telemetry_enabled` setting is honored before the first emit, and the long-form privacy doc lands at `docs/REFERENCE/privacy.md`.

---

## 2026-05-08 — Tour scroll: pan anchored element to viewport center across all scrollable ancestors

- `TourOverlay.jsx` now walks every scrollable ancestor of the anchored element (`overflow-y: auto/scroll` + `scrollHeight > clientHeight`), centering the element within each, then pans the window so the element lands at viewport center. Fixes a regression where rail-phase segments nested inside the rail's own overflow-y container ended up centered within the rail but off-screen on the page (the four study phase tour stops appeared below the viewport).

---

## 2026-05-08 — Add HOW_AI_WORKS pastor-facing doc

- New `docs/HOW_AI_WORKS.md` — plain-English guide for pastors covering what AI does (Look Again, MPS refinement, Functional Elements chat, Manuscript audits, Delivery formatting), what AI does not do, what pastors will notice in normal use, and why the system is built around clarity-through-constraint.

---

## 2026-05-08 — Topbar Ink redesign + sidebar Paul-at-Areopagus watermark

- Topbar header rendered for all non-Workspace views in `App.jsx`; Logo's two decorative rule spans dropped — the sidebar/topbar L-shape now carries the chrome.
- Topbar restyled to dark Ink (Claude Design Option 2) with locally-scoped `--topbar-fg*` tokens; single gold hairline seams the bottom edge, perpendicular to the sidebar's gold right edge.
- Sidebar gets a faded Raphael "St Paul at Areopagus" watermark in the lower 58% — V&A public-domain cartoon, 0.13 opacity, sepia-toned, mask-faded into the ink.
- Sidebar logo height tuned to 62px so its inset gold divider aligns with the topbar's bottom seam — one continuous L-shape hairline.
- Dash-header tightened (min-height 170→114px, padding 22/24→15/16) to make room for the topbar.

---

## 2026-05-08 — Remove Phase 6 embedder kill switch

- `SF_EMBED_WORKER` flag retired after one-release soak (shipped 2026-04-29 in `d1beb56`); the worker_thread embedder pipeline is now the only path.
- `electron/embedder/host.js` collapsed to the worker dispatch (main-thread fallback deleted); `embedWorker` flag block + export removed from `electron/config.js`.
- `electron/main.js` and `docs/SYSTEMS/database.md` cleaned of kill-switch references.

---

## 2026-05-08 — Workspace tour plain-prose reframe (12 stops)

- `workspaceTourStops.js` rewritten as 12 plain-prose stops; one imperative sentence per stop, no insider terms, no sequential connectors.
- New "Your Study at a Glance" rail stop (Stop 2); "Sermon Spine" replaces "Step 2 — MPT → MPS" as the pastor-facing label.
- Phase tour stops re-anchored on per-phase rail nodes (`rail-phase-{1..4}`) instead of full-height `sub-phase-body`; spotlight now lands on small named nodes on the throughline rail.
- `TourOverlay.jsx` clamps spotlight radius at 220px, recenters on visible portion for anchors larger than the viewport, and suppresses the glow ring when an anchor exceeds the viewport (no more lines trailing off-screen).
- `sermon-workspace-tour.md` mirrored; `study-phase-redesign.md` drift cleaned.

---

## 2026-05-08 — Dashboard polish pass: pane + sidebar implementation from Claude Design

- Pane: hero gets 5px gold-gradient bar + new `--shadow-hero` token + 320px corner glow; eyebrows unified across all four tiles (gold ring, hero gets filled `.is-primary`); tile padding 22/28/20, fixed 240px height, dropped `grid-auto-rows: 1fr`; verse band gradient eased to 3-stop with fading 56px-inset gold seam; rows extracted from inline styles into shared `.dash-row` component (Resume + Explore unified); preacher quote gets fading parchment-deep top hairline.
- Sidebar: logo lockup left-aligned with 22/24/20 padding and inset 24px gold divider; section label and footer flipped to JetBrains Mono caps (9px/0.28em label, 9.5px/0.18em footer); nav item rhythm 11/24, gap 12; sidebar's gold right edge swapped from background-image trick to vertical-fading `::after` gradient.
- Dark-mode overrides: verse-band gradient flips to dark tokens, row background drops to 4% white wash with 8% on hover, hero shadow restated with black drop + brightened gold rim.
- Verse band gets `min-height: 170px` so 1- and 2-line verses occupy the same vertical space — dashboard content no longer shifts when the rotating verse changes length.

---

## 2026-05-08 — BTI Build MVP: transport endpoint and telemetry bus live

- Charter synced 2026-05-07 to the production-IS-the-beta ruling — Q5 retired, Phase 1 lightweight scope locked, `docs/PROPOSALS/bti-build-mvp.md` adds the Chunks 1-7 implementation plan.
- Chunk 1: Cloudflare Worker `sermonforge-bti.ross-appleton.workers.dev` with `POST /ingest` (Bearer-gated, flag/form/events kinds), `GET /inbox` (admin-token-gated), `GET /health`; D1 database with three tables keyed by tester_id; INGEST_TOKEN + ADMIN_TOKEN secrets; source at `transport/`.
- Chunk 2: `electron/telemetry/{bus.js, events.js, config.js}` — append-only NDJSON queue at `paths.telemetry`, 30s periodic flush, rotated `.pending` pattern survives flush failures, 5s fetch timeout, 500-event batch cap.
- Bus wired into `electron/main.js` (init + `app-open` emit in `whenReady`, `telemetry-emit` and `telemetry-set-enabled` IPC handlers, `flushAndExit` in `before-quit`); `electron/preload.js` exposes `telemetryEmit` + `telemetrySetEnabled`.
- End-to-end smoke verified: emit → NDJSON → Worker → D1 → inbox readback round-trips cleanly.

---

## 2026-05-07 — SetupScreen copy refresh: ESV recommended, minimal AI usage framing

- Section 2 (ESV) heading "optional" → "recommended"; description rewritten to point to the right-column passage view in the sermon workspace and to state plainly that without a key the passage column stays empty — drops the stale "Bible passage popup" wording.
- Section 2 step 2 simplified to "Get your ESV API key" — removes the Crossway-specific "Create an Application" jargon that doesn't match the current ESV site terminology consistently.
- Section 1 cost framing reworked: "fraction of a cent per click" and "$10 of credit will last weeks" replaced with a minimal-AI-usage note and "$5–$10 covers weeks of regular use" — accurate after ACC/SADI/SPRD AI-usage reductions.

---

## 2026-05-07 — Memory hygiene: startup re-read + end-session memory step

- `CLAUDE.md` adds a "Memory snapshot" section instructing a fresh Read of `MEMORY.md` at session start — the system-reminder snapshot can lag the disk if `MEMORY.md` was edited just before or during session boot.
- `end-session` SKILL.md adds STEP 3 (UPDATE MEMORY) gated to lasting-state changes only (initiative phase, feedback rule, project fact, external reference, contradicted entry); CHANGELOG/COMMIT/PUSH/CONFIRM renumbered to 4/5/6/7.
- Memory updates must ride in the same commit as the session's other changes to prevent re-introducing the snapshot/disk gap.

---

## 2026-05-07 — Pastor-facing field walkthroughs (Markdown + Workspace .docx)

- New `docs/PROPOSALS/sermonforge-field-walkthrough.md` traces every Series Planner + Sermon Workspace field in plain English, including cross-phase populations and the closing throughline.
- New Workspace-only Word doc at `docs/PROPOSALS/sermon-workspace-field-walkthrough.docx` (4 Study phases + MPT/MPS + Outline + Functional Elements + Manuscript + Delivery + 9-point throughline).
- Generator colocated at `docs/PROPOSALS/sermon-workspace-field-walkthrough.build.js` so the docx can be rebuilt; kept out of `scripts/` since it's not operational tooling.

---

## 2026-05-07 — Workspace UX overhaul + BTI charter revision

- Sample sermon scrubbed of Greek/grammar terminology; `main_point_pair` envelope filled; Merida references removed; new overviews on Phase 3 Field 1 and Phase 4 Field 1 (three-voices framing); "Signal"→"Cue", "Restore rail"→"Back to main".
- Phase 2/3/4 synthesis fields gain `takeoverWhenActive` + 200-char cap with counter; `activeFieldDef` lookup expanded across all four phase arrays so the flag fires.
- "Where you've been" auto-fires on direct sub-phase entry, reshaped to 3–5 bullets with hide/show; new AI reference card synthesizes Phase 1 Context next to Deeper Context.
- New `PausePointScreen` discrete what-you-did / what's-next screen between sub-phases; spine routing untouched.
- New `ThroughlineCanvas` parallel layer — strips + active pane + width transitions + pause-point coordination + reduced-motion respect; BTI charter revised end-to-end against ACC/SFDI/SADI/SPRD closure.

---

## 2026-05-07 — Look Again: invitational prompts, substrate gate, topical-scoped chat

- `src/prompts/study.js` v1.3.0: four `*_REVIEW_TASK` rewritten as `*_LOOK_AGAIN_TASK` — invitational opener, sermon-relevance filter, sub-phase guard, plain register, 0–3 questions with "trust it and move on" terminal output.
- `StudyTab.jsx`: buttons relabeled "Review →" → "Look Again" and gated behind ≥20 chars of substrate via new `hasMinimumSubstrate` (`studyFields.js`); four inline blocks collapsed into a `LookAgainBlock` component.
- `AIPanel.jsx`: free-form chat removed except at MPT_MPS / FUNCTIONAL_ELEMENTS; cold-open (no passage AND no MPT) hides the footer with a "Set a passage to begin" redirect; theology toggle paired with chat visibility.
- `inputText` clears on every step change so drafts don't bleed across MPS/FE; `LOOK_AGAIN_MIN_CHARS` constant introduced for the substrate threshold.
- Process Contract #5 strengthens: chat-surface carve-out narrowed to step-bound MPS/FE; new prompts permit empty-substrate refusal instead of fabricating substrate.

---

## 2026-05-07 — Mac distribution: first signed + notarized public release (v1.0.0)

- `package.json` mac config: `mergeASARs: false` (sidesteps `@electron/asar` minimatch overflow on universal builds with native modules), `notarize: true` driven by App Store Connect API key env vars.
- `.github/workflows/build.yml`: macOS job timeboxed to 30 min, `if: failure() || cancelled()` step re-runs `xcrun notarytool --verbose` directly against the signed `.app` and uploads raw output as a workflow artifact.
- Walked rc.1 → rc.13 isolating each layer — universal-ASAR merge, OpenSSL 3 vs Apple Keychain `.p12` format (regenerated with `-legacy`), notarize teamId/credentials conflict (App Store Connect API key path), and pending Apple Developer agreement that returned plaintext HTTP 403 from notarytool and crashed `@electron/notarize`'s JSON parser.
- `v1.0.0` shipped: signed Windows NSIS + signed/notarized universal macOS DMG attached, both auto-update feeds (`latest.yml` + `latest-mac.yml`) live; `known-good/mac-pipeline-pre-diagnostic` rollback tag at `c509548`.

---

## 2026-05-07 — Cap Resume rows so dashboard cards stay consistent height

- `ResumeWorkTile` rows container capped at `max-height: 120px` with `overflow-y: auto` — prevents the tile from growing with sermon count and stops the hero/series tiles from getting bumped to a taller grid row by `grid-auto-rows: 1fr`.
- `.slice(0, 5)` removed from the upcoming filter so all in-progress sermons stay reachable via scroll inside the cap.
- Verified all four dashboard tiles now lock to 225px regardless of sermon count (0, 2, or 5+).

---

## 2026-05-06 — Retire Field 3 redesign work artifacts

- Deleted `.drift/field-3-unified-canvas-drift.sh` — one-time migration validator that converged at exit 0 once the unified-canvas drift was cleared from `sermon-workspace.md`; criteria targeted retired three-question language that won't reoccur naturally, so the script's job is done.
- Deleted `docs/audit-reports/2026-05-06-overnight-summary.md` — audit report from the overnight Field 3 follow-on session; all findings addressed in commits `87e59cc` (cross-doc validator drift), `98fc40e` (tour seed migration), and `dc83890` (sermon-workspace.md drift + canvas hint + merge guard).
- Both files preserved in git history; CHANGELOG entries from the originating sessions stay untouched per "do not restate prior entries" guidance — the historical record points at the artifacts as they were when written.
- 403/403 vitest still green; SFDI validators still PASS; preflight PASS.

---

## 2026-05-06 — Field 3 redesign close: doc drift, canvas hint, merge guard

- `docs/SYSTEMS/sermon-workspace.md` Phase 1 paragraph (lines 150-161) rewritten for the unified-canvas shape — Field 3 as one canvas question, retired `ParaphraseBlocks` reference, `_canvas_row_id` attribution + `deriveThoughtUnitsFromCanvas` materialization noted, `takeoverWhenActive` flag mentioned; line 172 "Q1 canvas" → "unified canvas".
- `docs/PROPOSALS/study-phase-redesign.md` milestones table gains one row for **Phase 1 Field 3 unified canvas** — compact format matching the SADI Step 2 plumbing precedent; documents the structural revision of B1's Field 3.
- `IndentedSentenceCanvas` gets a permanent keyboard-gesture cheat sheet at the bottom (`Tab indents · Shift+Tab outdents · Enter splits · Backspace at line start outdents or merges`) — quiet styling; replaces the retired peripheral reference panel as the on-canvas hint surface.
- Blast-radius fix in `mergeWithPrev`: now `window.confirm`s before silently dropping a row that carries a `thought_unit_end` marker — guards Phase 2/3/4 cumulative-column attribution that would otherwise be lost on a single Backspace at column 0; rows with only text + paraphrase pass through silently.
- Drift validator exit 0; 403/403 vitest green; SFDI internal 7/7, cross-doc 6/6; preflight PASS.

---

## 2026-05-06 — Overnight audit summary 2026-05-06

- Field 3 Sprint 2 follow-on: hunted across all greppable fixtures for the legacy three-question shape with verse-reference `after_line` values (the `Number("v.2") === NaN` defensive-merge bug class that hit the tour seed) — zero BUG candidates found; all surviving legacy-shape fixtures carry integer-string `after_line` values that `Number()` parses cleanly.
- Phase 4 drift-sweep against `docs/SYSTEMS/sermon-workspace.md` and `docs/PROPOSALS/sfdi-charter.md` flagged the Phase 1 paragraph at sermon-workspace.md:150–172 still describing Field 3 with the pre-Sprint-2 three-question shape and listing retired `ParaphraseBlocks` as a primitive; charter doc is clean (zero hits).
- No code or fixture edits — REPORT-only run per `feedback_audit_workflow` and the autonomous task's explicit scope; per-doc fix decisions deferred to morning review.
- Validator script saved at `.drift/field-3-unified-canvas-drift.sh` (re-runnable) and full findings at `docs/audit-reports/2026-05-06-overnight-summary.md`.

---

## 2026-05-06 — Tour seed migrated to unified-canvas shape; cross-doc validator drift edits actually landed

- `electron/tourData.js` Field 3 divisions block converted from the legacy three-question shape (`sentence_layout` / `paraphrases` / `thought_units` with verse-reference `after_line`s like `"v.2"`) to the unified-canvas shape: 15 canvas rows with stable `tour-rom5-row-N` IDs, inline paraphrase per main row, three thought-unit-end markers attached to main rows (Standing on row 6, merged Pivot+Chain on row 8, Anchor on row 12) — fixes the silent migration failure where `Number("v.2")` is `NaN` so unit-ends never attached after defensive read-merge.
- Pivot (u2) and Chain (u3) merged into one thought unit because ratification 3 attaches `thought_unit_end` to main rows only and the chain modifiers sit under one main row; `meaning` / `christ_connection` / `implication` from both legacy entries combined.
- Materialized `thought_units` array in the seed now carries `_canvas_row_id` back-pointers and integer `after_line` values matching the canvas; Phase 2/3/4 cumulative-synthesis-tables read this array unchanged.
- Cross-doc validator's actual drift-remediation edits (C2/C3 narrowed, C4/C6 retired) — described in the previous commit's message but escaped the staging — now properly committed; both validators green at 7/7 + 6/6.
- Memory: Look-around UX (Idea 4) closed in `project_open_feedback.md`; `MEMORY.md` index hook updated; tour seed migration was the last piece.

---

## 2026-05-06 — Cross-doc SFDI validator drift remediation + un-archive

- `scripts/sfdi-cross-doc-consistency.py` un-archived alongside the internal-consistency validator; both now live in `scripts/` and pass against current docs (7/7 + 6/6).
- C2 narrowed to SFDI + workspace (SPRD dropped from the vocabulary doc list — the trimmed 110-line SPRD progress doc no longer carries vocabulary anchors); C3's redundant SPRD-specific `8+8+5+4` check dropped (other surfaces still verify the shape).
- C4 (status-date lock to 2026-05-04) and C6 (SPRD backlog items) retired entirely as brittle drift sources tied to a 579-line SPRD planning doc that was trimmed on 2026-05-05; criterion bodies replaced with retirement notes citing the trim and the items' shipped status.
- `docs/ENFORCEMENT_STATUS.md` Process #6 row repointed to both validators; Last verified bumped; verification command restored to chained run; archive dir removed (now empty).
- Memory refreshed: `project_sprd_sfdi_state.md` description gains Field 3 Sprint 2 closure (5 sessions, 2026-05-05 → 2026-05-06); body adds Sprint 2 implementation entry; stale `sfdi-throughline-vision.md` reference fixed (file was merged into the charter on 2026-05-05); `MEMORY.md` index hook updated.

---

## 2026-05-06 — Field 3 Sprint 2 Session 5: SFDI doc rewrite + un-archive validator

- SFDI Field 3 entry rewritten to canonical unified-canvas shape (seven-slot entry preserved, single `canvas` question, three sub-checks for the composite gate, ~110-word "Structural revision history" subsection at the bottom preserving the 2026-05-03 three-question record).
- Six cascading references repointed across the SFDI doc (Field Pattern composite-gating description, Structured-exercise questions section now lists two sub-shapes — unified canvas + cumulative synthesis table, field-order annotation, Q3-posture reference in Field 7, Observe → Interpret handoff, Phase 2 Field 8 cross-phase wording).
- `scripts/sfdi-internal-consistency.py` un-archived and passes 7/7 against the rewritten entry; `scripts/sfdi-cross-doc-consistency.py` left archived with a README note documenting four pre-existing failing criteria from the 2026-05-05 SPRD trim.
- `ENFORCEMENT_STATUS.md` Process #6 row updated from "two validators" to "one live + one archived"; "Last verified" bumped to today.
- Sweep PASS, simplify pass clean, 403 vitest green.

---

## 2026-05-05 — Field 3 Sprint 2 Session 4: tests + fixtures

- Six new contract tests in `process-2-evidence-gated-ux.test.tsx` exercise the Field 3 unified-canvas gate against new-shape fixtures directly — no migration step — covering the pass case, three failure modes (no main+modifier, missing paraphrase, no thought-unit-end), the canvas-N/A escape valve, and the per-gate `met=true` reporting at the Observe → Interpret boundary.
- Four new component tests in `SpotlightWorksheet.test.jsx` cover the unit-end editor lifecycle: `+ Mark` opens the inline editor, typing the summary emits canvas with `thought_unit_end`, Remove drops `thought_unit_end` and surfaces the affordance again, and inline paraphrase typing emits canvas with `paraphrase` set on the main row.
- `ENFORCEMENT_STATUS.md` "Last verified" line bumped to note the new-shape fixture coverage; vitest at 403 green (up from 393).

---

## 2026-05-05 — Field 3 Sprint 2 Session 3: cross-phase verification tests

- New `studyFields.test.js` block simulates the full `StudyTab.updateStructured` flow at the data layer (parse → setDivisionsCanvas → serialize → re-parse) so canvas-edit propagation through the sermon-level JSON is covered as one wire.
- First-write check: a fresh canvas write produces sermon-level JSON containing both the canvas array and the materialized `thought_units` array with `_canvas_row_id` back-pointers and numeric `after_line`.
- Survival checks: Phase 2/3/4 cumulative columns (`meaning` / `christ_connection` / `implication`) survive canvas reorder via id matching, survive canvas insert with `after_line` shifting correctly, and drop cleanly with their row on canvas delete.
- Legacy migration check: a legacy three-question sermon migrates to the unified canvas on read, and the first canvas re-write afterward preserves the legacy `meaning` column via the `after_line` fallback in `deriveThoughtUnitsFromCanvas`.
- 393 vitest green (up from 387).

---

## 2026-05-05 — Simplify /end-session governance: preflight script + thin skill + doc trim

- New `scripts/preflight.sh` orchestrates `drift-check.sh` + sweep-trigger advisory + staging hygiene as STEP 1 of `/end-session`.
- `CLAUDE.md` 99 → 61 lines: duplicated CHANGELOG rules and Execution Gates prose removed; trigger-path list now lives in `preflight.sh` only.
- `end-session` SKILL.md 102 → 64 lines: STEP 2 enforcement checklist collapsed, STEP 2.5 doc-drift table dropped (now handled by `drift-check.sh`).
- `docs/ENFORCEMENT_STATUS.md` "Last verified" run-on paragraph trimmed to one line + six-bullet current-state; six stale `scripts/sfdi-*.py` paths repointed to `scripts/archive/`.
- `drift-check.sh` skips `docs/ARCHIVE/*` and `docs/PROPOSALS/*` in C1; C7c recognizes intentional historical-retention markers.

---

## 2026-05-05 — Field 3 Sprint 2 Session 2: unified-canvas UI rebuild

- New `IndentedSentenceCanvas` renders the unified row shape — text + depth + inline paraphrase (main rows only) + "+ Mark as thought-unit end" affordance with inline editor and filled-state cap line + italic right-margin callout.
- `SpotlightWorksheet` kind dispatch gains a `unified-canvas` branch; legacy `canvas` / `paraphrase` / `synthesis-table` dead-code branches removed.
- `SingleQuestionActive` refactored to share `ActiveQuestionInput` so kind dispatch works in single-question fields (Field 3 has only one question now).
- `StudyTab.updateStructured` routes `divisions/canvas` writes through `setDivisionsCanvas` so the materialized `thought_units` array stays in sync with the canvas on every save.
- `ParaphraseBlocks` retired (component + test files deleted); 387 vitest green.

---

## 2026-05-05 — Field 3 Sprint 2 Session 1: unified-canvas data layer + helpers

- `OBSERVE_FIELDS[2]` three-question block (`sentence_layout` / `paraphrases` / `thought_units`) collapsed into a single `unified-canvas` question; per-row UUIDs are the merge key for cross-phase column attribution.
- New `deriveThoughtUnitsFromCanvas` and `setDivisionsCanvas` helpers materialize `thought_units` alongside `canvas` on save; cumulative columns survive insert / delete / reorder via `_canvas_row_id` matching with `after_line` legacy fallback.
- `parseStructuredField` defensively hydrates `canvas` from legacy three-question shape when present; existing `thought_units` array (with Phase 2/3/4 cumulative columns) preserved intact.
- `checkField3Composite` rewritten against the unified shape; pastor-facing reason strings preserved verbatim so the disabled-Continue hover-checklist reads identically.
- `flattenToText` now surfaces undeclared keys per field so materialized `thought_units` continues to flow into AI context after the field-def change.

---

## 2026-05-05 — Field 3 Sprint 1: overview cuts, canvas wrap, takeover layout

- Field 3 (Divisions / Thought Units) pre-field overview trimmed from three paragraphs + a three-item ordered list to one sentence; reference-panel content tightened (dropped poetry "deferred" section, quick-tips heading, clarifier footnote, standalone epistles paragraph; three rules compressed to one short clause each).
- `IndentedSentenceCanvas` per-row `<input>` swapped for `<textarea rows={1}>` with `autoResize` — long sentences at depth 3+ now wrap visibly instead of horizontal-scrolling out of sight; canvas row alignment shifted to flex-start so the level-0 marker bar grows with wrapped content.
- New `takeoverWhenActive` field-def flag (Field 3 only today) collapses the throughline rail and tightens write-column padding when the field is spotlit; sticky `↺ Restore rail` button restores until the active field changes.
- Takeover suppressed while the workspace tour is active — tour stops anchored on the rail (`throughline`, `four-named-outcomes`) still render correctly.
- 383 vitest green; two `SpotlightWorksheet` test fixtures migrated from `<input>` to `<textarea.indented-canvas-input>` selectors for the canvas-row element swap.

---

## 2026-05-05 — Consolidate SPRD docs: archive SPIP, trim planning doc, add doc-drift checkpoint to /end-session

- SPIP archived to `docs/ARCHIVE/study-phase-implementation-plan.md` — every section now CLOSED/SHIPPED/RESOLVED; `ANCHORS.md` row dropped.
- SPRD planning doc trimmed from 579 lines / 122 KB to 110 lines / 9.6 KB — kept implementation milestones table, eight-question rulings, four structural commitments, cross-doc relationships; dropped historical reasoning, vocabulary glossary, screen/AI knock-on detail, per-milestone log (all live in git history).
- `SynthesisTable.jsx` + test cleaned of stale `SPIP item 6` attribution comments.
- `/end-session` skill gained **STEP 2.5 — DOC-DRIFT CHECKPOINT** — a soft-prompt nudge listing doc-update obligations triggered by the staged diff (schema changes, field defs, contracts, IPC, tour stops, AI prompts, advancement gates).
- 383 vitest green.

---

## 2026-05-05 — SADI Step 2 plumbing: MPT/MPS as SpotlightWorksheet fields (v19)

- New `src/utils/sadiAnchorFields.js` defines `MAIN_POINT_PAIR_FIELDS` (MPT 2Q draft/tighten, MPS 3Q translate/gospel_check/tighten) with question prompts and overview lifted from the SADI working doc.
- v19 migration adds `main_point_pair` JSON column; SERMON_COLUMNS + STRUCTURED_FIELDS allowlists mirrored across `electron/contracts.cjs`, `src/core/contracts.ts`, and the test-spine fixture; new `MainPointPairUpdate` type.
- Composite gate at Step 2 → Step 3 boundary in `studyAdvancement.js` — `checkStep2ToOutlineThreshold` enforces MPT Q1+Q2 and MPS Q1+Q2-or-N/A+Q3 (Q2 N/A carries the strict "satisfied another way" semantic).
- `StudyTab.jsx` Step 2 inline UI replaced with `SpotlightWorksheet`; legacy flat `mpt`/`mps` columns auto-synced from the tighten answers so downstream readers (AI prompts, context builder, exports) keep working unchanged.
- Dropped Challenge MPT button + MPT→MPS chain check + MPS chat panel per user call; sweep-the-house PASS, 383 vitest green.

---

## 2026-05-05 — Retire SPRD scaffolding: merge vision sheets, mothball validators, archive SRIA

- Vision sheets merged into charters: `sfdi-throughline-vision.md` → `sfdi-charter.md` § Orientation; `sadi-throughline-vision.md` → `sadi-charter.md` § Orientation. Both standalone vision files deleted; references in SFDI working doc, SADI working doc, SPRD planning doc, and `ANCHORS.md` repointed.
- SFDI Python validators (`sfdi-internal-consistency.py` + `sfdi-cross-doc-consistency.py`) moved to `scripts/archive/` with a README — SFDI walks complete, validators idle.
- SRIA (`study-redesign-implementation-anchor.md`) archived to `docs/ARCHIVE/` — SPRD shipped, re-entry index no longer load-bearing.
- `ANCHORS.md` row count dropped from 8 to 5 (visions, SRIA removed).

---

## 2026-05-05 — Clean up orphan references to retired SPIR / tunnel-mode / sweep-the-universe

- SRIA: SPIR doc bullet dropped; "Something surfaced in real prep" navigation now points at SPIP § Watch in real prep.
- `ANCHORS.md`: SPIR row dropped; SRIA description chain shortened to SFDI / SADI / SPRD / SPIP.
- `ENFORCEMENT_STATUS.md`: dead `tunnel-mode.md` pointer trimmed from the 2026-05-04 SPRD C2 narrative; descriptive history preserved.
- `StudyTab.jsx`: two-line tunnel-mode comment block deleted — it pointed at a retired doc.
- `anchor-update` SKILL: `sweep-the-universe` removed from the no-skill-chaining list.

---

## 2026-05-05 — Ship Dashboard verse carousel + preacher quote components

- Added `DashboardVerseCarousel` — 15s rotation through `preachingVerses.js`, module-level cursor so re-entry shows the next verse.
- Added `DashboardPreacherQuote` — 15s rotation with no-consecutive-preacher shuffle, stencil portrait with SVG fallback when the PNG is missing.
- Added `src/datasets/preachingVerses.js` — ESV preaching/proclamation/Word verses with category tags and partial-clause flags.
- Retired `DashboardChurchHistory` and `DashboardHeader` — replaced by the editorial bands above; `Dashboard.jsx` imports already landed in `8f6e743`.

---

## 2026-05-05 — Doc/validator sweep for 8+8+5+4 shape + throughline polish

- Renumbered Phase 1 fields and inserted Phase 2 Genre across SFDI doc, workspace doc, SPRD doc, and anchor doc — Phase 1 carries 8 fields, Phase 2 carries 8 fields, total still 25.
- Marked SPRD C4 (Background series-level inheritance) CLOSED in SPRD + anchor doc — substance moved to series-level Book Study and Phase 2 Genre.
- Updated throughline-from references in SADI charter, sermon-anchor-definition-initiative, and ENFORCEMENT_STATUS to read "Phase 1 Field 1 (Context, after Background's retirement)".
- Updated SFDI consistency validators to the 8+8+5+4 shape — phase counts, gate-key map, RETIRED-skip in field-block parser, newline-tolerant workspace-doc regex; both scripts pass clean against current docs.
- Throughline polish — removed strikethrough on completed field labels; switched tooltip to `var(--parchment)` body + `var(--gold)` heading so dark-mode renders dark text on light bg instead of white-on-white; tooltip moved to `position: fixed` so it tracks the node regardless of rail scroll.

---

## 2026-05-05 — Dashboard demote + Explore row parity + pulpit-quote centering

- Hero "Build a sermon" tile demoted to secondary scale — plain serif (no italic/gold accent), eyebrow renamed `Begin work` to parallel `Resume work`.
- Tile typography tightened (hero 36→26, secondary 26→19, blurb 15→13.5) and padding/min-height pulled in (24/28→18/22, 200→160).
- Verse + pulpit-quote scale reduced (24→17 / 22→16) and decorative quote marks (48→32) so the editorial bands stop dominating.
- Explore tile rebuilt with `ExploreRow` mirroring Resume's gold-bar/parchment-warm layout; shared 56px min-height aligns both row cards.
- Pulpit-quote group now centers via `auto auto` + `justify-content: center` on `.hdr-illuminated` — leftward bias removed.

---

## 2026-05-05 — Retire SPIR + tunnel-mode + sweep-the-universe placeholder

- `study-phase-implementation-remediation.md` deleted — risk register served implementation phase only; the three lived-use concerns were already lifted into SPIP "Watch in real prep" in the prior commit.
- `docs/PROPOSALS/tunnel-mode.md` deleted — held design exploration with no revisit plan; prototype was reverted same-day on 2026-05-04.
- `.claude/skills/sweep-the-universe/` deleted — placeholder skill with no content; `sweep-the-multiverse` covers the comprehensive-audit role.

---

## 2026-05-05 — Workspace tour throughline-first rewrite (17 stops)

- `workspaceTourStops.js` rewritten to 17 throughline-first stops; walks the cumulative thought-unit table + four named outcomes through MPT/MPS → Outline → Functional Elements → Frame → Manuscript → Delivery.
- New anchors: `throughline-rail` on `ThroughlineRail`, `frame-worksheet` on `FrameTab`, `delivery-overview` on `DeliveryTab`.
- AI overview distributed (one ambient stop + inline mentions vs. four front-loaded); Manuscript audit tools collapsed to one stop with three sub-mentions; Frame elevated to two stops (Intro + Conclusion).
- `sermon-workspace-tour.md` mirrored — 17-stop locked content replaces 30-stop UI walk; "Next iteration (pending)" retired with closure note.
- `ThroughlineRail` tooltip position fix (viewport coordinates via `position:fixed`) bundled in; 383 vitest green.

---

## 2026-05-05 — Tour spec + SPIP next-iteration handoff

- `sermon-workspace-tour.md` gains a "Next iteration — throughline-first reframe (pending)" section sketching a ~14-18 stop rebuild that anchors on the cumulative thought-unit table + named-outcomes arc instead of a UI-surface walk; current 30-stop locked content preserved as the shipping state.
- `study-phase-implementation-plan.md` updated: pre-C2 stability check marked CLOSED, C2 throughline visualization marked SHIPPED, backlog reflects that SFDI-reconciliation of the existing tour is done and the throughline-first reframe is the remaining iteration.

---

## 2026-05-05 — Workspace tour rewrite + thought-unit guardrails + dead-code retire

- `workspaceTourStops.js` rewritten to 30 SFDI-aligned stops; spec doc (`sermon-workspace-tour.md`) mirrored; Phase 4 stops anchor on field-level `data-tour-id`s now emitted by `SpotlightWorksheet` at every field-rendering site.
- `SynthesisTable` gains two destructive-edit guardrails — heightened delete-confirm copy when a row carries cumulative cross-phase work, and ⚠ stale flag when `after_line` exceeds canvas line count.
- `DeleteButton` extended with `confirmLabel` + `ariaLabel` props so SynthesisTable's row-delete routes through the canonical Mutation #4 primitive instead of `window.confirm`.
- `studyFields.js` exports new `CUMULATIVE_COLUMN_KEYS` + `fieldKeyToTourId` — single source of truth replaces three duplicated literals across SynthesisTable + SpotlightWorksheet.
- Retired: dead `set_unbeliever`/`set_compiled` mutation ops + type-union entries; dead `SYNTHESIZE_REDEMPTIVE_TASK` + `COMPILE_IMPLICATIONS_TASK` orphan prompts; 383 vitest green.

---

## 2026-05-05 — Sample sermon Phase 1 gate fix + gate-key SFDI renumber

- `tourData.js` paraphrases: IDs corrected to `ms-0`..`ms-5` with six entries so Field 3 Q2 composite gate passes against the six canvas main sentences.
- `load-tour-sermon` handler now delete-then-insert (always fresh) so sample-sermon updates take effect on each click; auto-sweeps stale `tour-sotm-*` rows from the prior mock.
- Gate keys renumbered to current SFDI: `field_4_divisions` → `field_3_divisions`, `field_8_obvious_point` → `field_7_obvious_point`, `field_9_possible_implications` → `field_8_possible_implications`, `field_7_interpretation_synthesis` → `field_8_interpretation_synthesis`.
- Internal function/variable names + inline comments + test constants/titles aligned (`checkField4/7Composite` → `checkField3/8Composite`, `FIELD_4_*` → `FIELD_3_*`); 374 vitest green.

---

## 2026-05-05 — Explore SermonForge tile on Dashboard

- New bottom-right `Explore SermonForge` tile (eyebrow `Look around`) holds the orientation paths on their own surface alongside Resume work; the hero "Build a sermon" tile is now single-action.
- The tile holds two stacked `TextButton`s — `Take the guided tour →` and `Open a sample sermon →` — each with its own per-action loading label backed by `loadingAction`.
- 2×2 dash-grid fills cleanly: `Build a sermon / Build a series / Where you left off / Explore SermonForge`.

---

## 2026-05-05 — Open sample sermon entry + Romans 5 mock rewrite

- New Dashboard "or open a sample sermon →" button loads the mock without launching the tour overlay; `loadingAction` state gives each button its own loading label and disables both during the in-flight IPC.
- `electron/tourData.js` rewritten as Romans 5:1-5 ("The Hope That Does Not Disappoint") in the new envelope shape `{value, na}` per question across all four exegesis columns plus `sermon_frame` (intro/conclusion); IDs renamed to `tour-romans-2026` / `tour-romans-sermon-01`.
- Canonical `observations.divisions.thought_units` array carries a four-unit throughline (Standing → Pivot → Chain → Anchor) with cumulative `meaning` / `christ_connection` / `implication` columns demonstrating SFDI/SPRD cross-phase synthesis.
- `load-tour-sermon` INSERT in `electron/main.js` swaps retired legacy PC columns (`topic_theme`, `audience_assumptions`, `background_noise`) for `sermon_frame`; placeholder count adjusted from 25 to 23.

---

## 2026-05-05 — ScripturePanel in-panel Bible search

- `ScripturePanel` gains a search row under the header — input ("Bible search") + Go button — that reuses the existing `fetchPassage` IPC to load any reference without leaving the column.
- "← Back to [sermon ref]" link surfaces whenever a lookup is active and returns the panel to the sermon's text in one click; Esc inside the input does the same.
- Header reference + empty-state guard now read from the displayed reference, so the pastor always sees what's currently loaded.
- CSS adds `.scripture-search`, `.scripture-search-input`, `.scripture-search-submit`, and `.scripture-back` using existing parchment / gold / ink-soft tokens.

---

## 2026-05-05 — dark-mode --ink-ghost brightened globally

- Dark-mode `--ink-ghost` raised from `#5a4c42` to `#bfb0a0`, restoring legibility for the dashboard guided-tour link, in-progress sermon dates, Delete buttons, preacher quote dates + citations, and every other muted text site app-wide.
- Removed the now-redundant `[data-theme="dark"] .sidebar` override since the global value covers the sidebar's darker background equally well.
- Verified via preview: guided-tour link, quote dates ("354–430"), quote citation ("Confessions XII.14"), sidebar tagline, Navigation label, Send feedback, and footer all resolve to the brightened value.

---

## 2026-05-05 — dark-mode legibility: sidebar muted text + gold-pale globally

- `[data-theme="dark"] .sidebar` overrides `--ink-ghost` to `#bfb0a0` so the always-dark sidebar's tagline, "Navigation" label, "SermonForge v1.0" footer, "Send feedback" link, and theme-toggle icon read clearly.
- Dark-mode `--gold-pale` redefined from `#3a2e0a` to `#f0e4b8`, restoring visibility for the "+ New Sermon"/"+ New Series" sidebar items, the dashboard header rule + tile hover border, sermon/illustration/filter/AI-suggestion hover borders, blockquote left rule, AIPanel italic helper text, tour preview SVG fills, and passage-ref / pmb-id chip backgrounds.
- Verified via preview at boot in dark mode: all affected elements now resolve to the brightened values.

---

## 2026-05-05 — type system + rule-flanked logo

- New `src/styles/typography.css` defines `--font-serif` / `--font-mono` / `--font-sans` tokens and semantic classes (`.eyebrow`, `.scripture-ref`, `.attribution-*`, `.prose`, `.manuscript-body`, etc.); imported in `main.jsx` before `global.css`.
- IBM Plex Serif replaces Crimson Pro and Playfair Display across `global.css`, two component CSS files, the electron loading splash, four brand SVG lockups, and ~20 JSX inline styles (now `var(--font-serif)`).
- New `Logo.jsx` rule-flanked wordmark mounted in the sidebar (replaces the prior `<BrandLockup />` SVG iteration, which was untracked and is now removed).
- `docs/RULES.md` typography section + `docs/PROPOSALS/sermon-workspace-tour.md` updated to the new system; orphaned `.brand-lockup` rules pruned from `global.css`.
- Verified via preview: body computes IBM Plex Serif 16px / 1.6lh, headings IBM Plex Serif, wordmark + nav labels JetBrains Mono.

---

## 2026-05-05 — workspace UX touch-ups + process #2 forward-only gate

- New Sermon modal trimmed (Preacher field removed; CTA renamed "Forge Sermon"); Dashboard Resume Work rows gain a `<DeleteButton>`.
- Observe `background` field retired; new optional `genre` field added to Interpret with two questions (genre identification, interpretive impact).
- Process #2 empty-evidence gate scoped to `direction === "forward"` in `validateAndCommit`; backward retreat now ungated so newly created sermons aren't trapped on their first stage; `test-spine.ts` mirrored + new regression test.
- Heavy-lifting overview subtitles in `studyFields.js` + `sermonFrameFields.js` auto-derive "Field N of M · Phase" from array position, eliminating hand-edit drift across 8 sites.
- 374 vitest green; sweep-the-house PASS.

---

## 2026-05-05 — test-spine fixture aligned with main.js boundary semantics

- Scheduled weekly drift check found `tests/contracts/_helpers/test-spine.ts` diverging from `electron/main.js` on update / delete handlers and read-router sort orders.
- `update-{sermon,series,section}` now route through a shared `buildUpdate` helper, reject `UPDATE_NO_FIELDS` on empty input, and silently no-op on missing rows; fixture-only `NOT_FOUND` + `STATE_5_UNKNOWN_FIELD` rejections removed.
- `delete-series` cascade wipes child `series_sections` and NULLs `sermons.series_id` + `section_id`; `delete-section` NULLs `sermons.section_id`.
- `spineRead` sorts mirror main.js — `created_at` tiebreakers on get-all / recent / in-progress sermons, `year DESC, title ASC` on `get-all-series`, `COALESCE(updated_at, created_at) DESC` on `get-recent-series`, `section_title` join on `get-sermons-by-series`.
- Added `SERIES_COLUMNS` + `SECTION_COLUMNS` exports; 98 contract tests pass; ENFORCEMENT_STATUS Test-environment caveat updated.

---

## 2026-05-04 — sprd c2: throughline rail + scripture panel + step strip + tunnel-mode prototype held

- New `ThroughlineRail` (vertical, sub-phase nodes, named-outcome callouts via `evaluateAdvance`) + `ScripturePanel` (280px, ESV via `fetchPassage`) + inline `StudyStepStrip` (Option α — quiet centered text, dot separators, gold-only active) wrap StudyTab Step 1 in a three-column shell.
- Sermon Shape card, sub-phase tab row, step pills, and sub-phase intent paragraphs retired from StudyTab; rail + step strip replace them.
- `ScripturePanel` shape-mismatch fix — reads `result.esv` string, parses `[N]` verse markers into superscripts, handles `esvPending` and `esvError` states.
- `browserPreviewMock` added to `src/core/spine.ts` returns mock sermon shapes for browser-only Vite preview rendering; production path unchanged.
- Tunnel-mode prototype (linear-reveal UX with Begin screen + horizontal sub-phase chips + hidden future) designed, built, and held; design captured at `docs/PROPOSALS/tunnel-mode.md` for future consideration.

---

## 2026-05-04 — post-SPRD doc-drift sweep + spip/sria refreshed to actual shipped state

- `/sweep-the-multiverse` flagged a Surface #1 WARN for stale PC vocabulary in CORE.md and three system docs; this fix closes it.
- CORE.md Canonical Vocabulary PC entry rewritten to the Phase 4 Field 3 two-question shape (`room_specifics` + `cost_and_gift`); legacy `topic_theme` / `audience_assumptions` / `background_noise` columns marked retained-but-unread.
- `docs/SYSTEMS/sermon-workspace.md` "PC card (interim)" section replaced with "PC moved to Phase 4 Field 3"; cross-system dependency note updated.
- `docs/SYSTEMS/context-pipeline.md` `normalizeSermon` extract list + tier 7 row + tier 7 rules + cross-system reference updated to reflect the C5 rewire (`readPastoralContext()` reads Phase 4 Field 3, not the legacy columns).
- `docs/REFERENCE/schema.md` PC column descriptions reframed as legacy; added four missing rows (`current_stage`, `current_step`, `current_sub_phase` from v17 spine layer, `sermon_frame` from v18 SPRD C3); SPIP and SRIA refreshed to the actual A0–A2.5 / B1–B4 / C1 / C3 / C5 / C6 shipped state.

---

## 2026-05-04 — spip + spir + sria stripped to implementation-doc shape

- Stripped SPIP from 211 to ~55 lines: implementation log + A2.1 next + B/C backlog only.
- Stripped SPIR from 281 to ~50 lines: 8 risk categories + 4 remediation patterns + empty surfacing-risks section.
- Stripped SRIA from 131 to ~30 lines: pointer-only index over the four planning docs (SFDI/SADI/SPRD/SPIP).
- Removed pre-implementation audit pass, Firing 1/2/3, Standards to Build, and audit Buckets A–E.
- Framing fix: SPIP/SPIR no longer claim documentation agreement as the prerequisite for code work; they are now what their names said.

---

## 2026-05-04 — sria registered as re-entry point for the Study redesign

- New `docs/PROPOSALS/study-redesign-implementation-anchor.md` (SRIA) sits above the five planning docs (SFDI / SADI / SPRD / SPIP / SPIR) as a short re-entry point.
- Ten sections covering what this is, working rule, doc map, where things stand, the arc end-to-end, readiness gate, status table, agent leverage, skills list, and "I'm lost" pointers.
- Readiness gate section names the three Standards to Build (per-doc ownership declaration, canonical vocabulary glossary, Bucket C checklists) as the next concrete steps before Firing 1.
- `docs/ANCHORS.md` extended with the SRIA entry at the top of the registry list.
- Plain-English voicing rule bound as a callout; SPIR's Bucket E plain-language drift audit polices it.

---

## 2026-05-04 — SPIP + SPIR scaffolds officially registered, calibrated, and rounded out

- New `docs/PROPOSALS/study-phase-implementation-plan.md` (SPIP) and `docs/PROPOSALS/study-phase-implementation-remediation.md` (SPIR) added as load-bearing planning anchors for the Study redesign.
- `docs/ANCHORS.md` extended with SADI, SPIP, SPIR registry entries.
- SPIP and SPIR calibrated to current main, including Firings 2 and 3 ruled as fired-implicitly inside `b2ad01e` and SPIR risk 7 closed by the same atomic braiding.
- Both docs gained a main-point thesis callout ("documentation agreement is the prerequisite for smooth implementation").
- SPIR Bucket E (six ingestion-optimization audits) added; SPIP's pre-implementation audit pass procedure now starts with Phase 0 to run them ahead of Phases 1–3.

---

## 2026-05-04 — sprd C3 + sadi per-field content walks + CORE #6 + MPS prompt rewrite (session wrap)

- Phase 2: SADI per-field content-design walks landed for all four anchor fields — MPT, MPS, Intro, Conclusion — with overview blockquotes + Q-framings + Eph 2:1–5 worked example outputs in pastor-to-people voice.
- Phase 3 Item 1: CORE.md Process Contract #6 extended from "Study throughline" → "workspace throughline" per SADI Ruling 4; canonical-articulation pointer expanded to two documents (SFDI + SADI together).
- Phase 3 Item 2: MPS_DRAFT prompt rewrite — three per-question prompts (Q1 Translate / Q2 Drift / Q3 Tighten) replace the WITH_PC/NO_PC pair; PC scaffolding fully retired from MPS draft path.
- Phase 3 Item 3: SPRD C3 Sermon Frame elevation shipped — STAGE.Frame between Blueprint and Manuscript, v18 migration adds sermon_frame JSON column, new SERMON_FRAME_FIELDS + FrameTab + composite gate at Frame → Manuscript boundary, 15 new contract tests.
- ENFORCEMENT_STATUS.md updated (Process #6 row + SADI section); 373 vitest green; sweep-the-house PASS; node --check on electron files clean.

---

## 2026-05-04 — sprd C3: Step 5 (Sermon Frame) elevated to its own workspace stage

- New STAGE.Frame between Blueprint and Manuscript (display label "Sermon Frame"); `src/core/contracts.ts` Stage union + STAGE + STAGE_SEQUENCE + STAGE_LABELS extended; `electron/contracts.cjs` and `tests/contracts/_helpers/test-spine.ts` mirrored in lockstep; `SermonFrameUpdate` type added; `sermon_frame` added to SERMON_COLUMNS allowlist + STRUCTURED_FIELDS set.
- v18 migration in `electron/main.js` adds `sermon_frame TEXT DEFAULT NULL` column (idempotent guard via PRAGMA table_info); pre-v18 sermons retain NULL until pastor opens the new tab.
- New `src/utils/sermonFrameFields.js` exports SERMON_FRAME_FIELDS — Intro (4Q: hook/bridge_to_text/expectations/redemptive_note) + Conclusion (4Q: summate/land_call/gospel_empower/closing_posture) — with overview blockquotes and question prompts captured verbatim from SADI's per-field content-design walks.
- New `src/components/FrameTab.jsx` renders SpotlightWorksheet over SERMON_FRAME_FIELDS + AdvanceGateChecklist; `src/components/SermonWorkspace.jsx` adds the 5th tab; `src/utils/studyAdvancement.js` gains STAGE_BY_INDEX, buildStageEvidence Frame branch, checkIntroComposite + checkConclusionComposite + checkSermonFrameToManuscriptThreshold (Intro Q4 N/A-with-strict-semantic; Conclusion no-N/A across the board), and "stage" kind routing in evaluateAdvance for the Frame → Manuscript boundary.
- New `tests/contracts/sprd-c3-sermon-frame.test.tsx` (15 cases covering empty, partial, both-filled, per-question Intro Q1-Q4 and Conclusion Q1-Q4 gates, N/A semantics, and STAGE_BY_INDEX positioning). 373 vitest green; sweep-the-house PASS (State #2/#5 + Process #2/#6 + Surface #1 strengthen; no contract weakens).

---

## 2026-05-04 — sadi/sprd: MPS_DRAFT prompt rewrite — three per-question prompts replace WITH_PC/NO_PC pair

- `src/prompts/study.js` retires `MPS_DRAFT_WITH_PC_TASK` (~270 words) and `MPS_DRAFT_NO_PC_TASK` (~110 words); adds three new scoped exports — `MPS_Q1_TRANSLATE_TASK` (translate MPT → present/future, pastor-to-people voice), `MPS_Q2_DRIFT_TASK` (surface moralism candidates against CCS, no rewrite), `MPS_Q3_TIGHTEN_TASK` (compress Q1+Q2 into one sentence preserving substance + gospel-power); PROMPT_VERSION 1.1.0 → 1.2.0.
- `src/components/StudyTab.jsx` `generateMPS` simplified — removes `readPastoralContext` import + `pc`/`hasPC` dead-code lines + the WITH_PC/NO_PC ternary; existing single Draft button now wired to `MPS_Q1_TRANSLATE_TASK` until per-question MPS UI lands (SPRD work).
- PC scaffolding fully retired from MPS draft path; PC's substance now reaches MPS through the Implications Synthesis (Phase 4 Field 4 named outcome) per SADI Step 2 ratification.
- `MPS_Q2_DRIFT_TASK` and `MPS_Q3_TIGHTEN_TASK` exported for forward consumption by per-question UI; deliberate unused-export staging documented in study.js comment block.
- `/sweep-the-house` PASS (Process #5 strengthens; Process #6 strengthens; Mutation #2 neutral; Principle strengthens); 358 vitest green.

---

## 2026-05-04 — core: Process Contract #6 extended to all workspace steps (per SADI Ruling 4)

- `docs/CORE.md` Process Contract #6 retitled "The Study throughline is structural" → "The workspace throughline is structural"; outcome-scope clause widened from "Each Study sub-phase produces a named outcome" → "Each workspace step (and each Study sub-phase) produces a named outcome"; handoff language widened to "step or sub-phase boundary."
- Canonical-articulation pointer expanded to two documents: SFDI carries Study (Step 1 — four sub-phases, 25 fields, four named outcomes); SADI carries Steps 2 (MPT/MPS) and 5 (Intro/Conclusion) with two named outcomes (Main Point Pair, Sermon Frame).
- Binding scope updated: throughline's structural integrity is now testable against the SFDI document AND the SADI document together.
- 358 vitest green; doc-only; no sweep trigger (CORE.md not in sweep-the-house path list).

---

## 2026-05-04 — sadi: Conclusion overview + Q3 sharpened (gospel-empower as engine; explicit MPS parallel)

- `docs/PROPOSALS/sermon-anchor-definition-initiative.md` Conclusion overview restructured: anti-recap discipline folded into Q1's parenthetical inside the four-moves paragraph; new third paragraph elevates gospel-empower as the engine that distinguishes a closing call from a moralistic push.
- Conclusion Q3 (Gospel-empower) framing rewritten to name the explicit MPS parallel ("At MPS you checked your message anchor for moralism. Here you do the matched move at the listener's exit") and to differentiate the verb shape — MPS Q2 is diagnostic (read / check / rewrite), Conclusion Q3 is generative (build / name / ground).
- 358 vitest green; doc-only.

---

## 2026-05-04 — sadi: Conclusion content-design walk landed — all four anchor walks now complete

- `docs/PROPOSALS/sermon-anchor-definition-initiative.md` Conclusion entry gains pre-field overview blockquote (three paragraphs, names the four moves and the anti-recap discipline), Q1 Summate framing, Q2 Land-the-call framing (linking back to Intro Q3 expectations), Q3 Gospel-empower framing (CCS as the comparator visible to the right), Q4 Closing-posture framing (silence/song/prayer/charge as a required pastoral choice).
- Eph 2:1–5 worked example shows the four-move arc in pastor-to-people voice: Q1 "But God" through-line landing → Q2 "stop trying to earn" call → Q3 "the work is done" gospel-empowerment → Q4 explicit Prayer posture with three-beat content + 90-second timing + post-Amen silence cue.
- All four SADI anchor walks now have pastor-side content-design copy in the working doc (MPT, MPS, Intro, Conclusion). Per-field content-design backlog cleared.
- 358 vitest green; doc-only.

---

## 2026-05-04 — sadi: Intro content-design walk landed (overview + Q1/Q2/Q3/Q4 framings + Eph 2:1–5 example)

- `docs/PROPOSALS/sermon-anchor-definition-initiative.md` Intro entry gains pre-field overview blockquote (three paragraphs, names the four moves with the expectations-before-redemptive-note order rationale and the redemptive-note-as-gospel-anchor framing), plus Q1 Hook, Q2 Bridge to text, Q3 Expectations, and Q4 Redemptive note framings.
- Eph 2:1–5 worked example shows the four-move arc in pastor-to-people voice: Q1 carrying-the-weight hook → Q2 bridging into "But God" → Q3 stop-trying-to-earn expectation → Q4 gospel-empowerment ("you don't muster resurrection; you receive it").
- Intro Status updated to reflect content-design walk landed; bulleted overview placeholder replaced by actual blockquote; deferred-stub line removed.
- 358 vitest green; doc-only.

---

## 2026-05-04 — sadi: MPS content-design walk landed (overview + Q1/Q2/Q3 framings + Eph 2:1–5 example)

- `docs/PROPOSALS/sermon-anchor-definition-initiative.md` MPS entry gains pre-field overview blockquote (two paragraphs, names the three moves with the moralism guard threaded into Q2's mention), Q1 Translate framing, Q2 Gospel-check framing (CCS as the comparator visible to the right), Q3 Tighten framing (dual preservation: substance from Q1 + gospel-power from Q2; same "one sentence ≠ short" guard as MPT Q2).
- Eph 2:1–5 worked example shows Q1 with subtle moralism drift ("we need to wake up / we must step out") → Q2 catches the drift and rewrites in pastor-to-people voice → Q3 tightens to one preachable sentence.
- MPS Status updated to reflect content-design walk landed; bulleted "what overview will cover" replaced by actual overview blockquote; deferred-stub line removed.
- 358 vitest green; doc-only.

---

## 2026-05-04 — sadi: MPT content-design walk landed (Q1/Q2 framings + Eph 2:1–5 example)

- `docs/PROPOSALS/sermon-anchor-definition-initiative.md` MPT entry gains Q1 framing blockquote (Draft), Q2 framing blockquote (Tighten — with explicit "doesn't need to be short — it needs to be one sentence" guard), and Eph 2:1–5 worked example showing Q1 multi-sentence draft → Q2 single-sentence compression.
- MPT Status updated to reflect content-design walk landed 2026-05-04; deferred-stub line removed.
- 358 vitest green; doc-only.

---

## 2026-05-04 — sadi: ratification walk complete (11 structural rulings + doc propagation)

- Eleven rulings ratified — named outcomes Main Point Pair (Step 2) + Sermon Frame (Step 5); cumulative table closes at 6 columns; Process #6 extends through Delivery; no field-N/A on the four anchors; MPT 2Q / MPS 3Q / Intro 4Q / Conclusion 4Q with locked question shapes; AI clarifies pastor's voice (doesn't author); pre-field overviews on MPS/Intro/Conclusion.
- `sermon-anchor-definition-initiative.md` rewritten with SADI-wide commitments + seven-slot entries for all four anchors + within-step flow passes naming the outcomes + open questions Q1/Q2/Q5 RESOLVED.
- Propagation across `sadi-charter.md` (status + enforcement), `sadi-throughline-vision.md` (cumulative-table now RESOLVED), `study-phase-redesign.md` (C3 + C5-partial unblocked), `ENFORCEMENT_STATUS.md` (new SADI section).
- Sub/sadi rebased onto origin/main (CHANGELOG conflict resolved); 358 vitest green throughout; doc-only across the session.
- Downstream-enabled: CORE.md Process #6 text edit, MPS_DRAFT prompt rewrite, Step 5 elevation — all unblocked by ratified SADI field defs.

---

## 2026-05-04 — sadi: initial draft — Sermon Anchor Definition Initiative scaffolded on sub/sadi

- New initiative SADI (Sermon Anchor Definition Initiative) drafted on branch `sub/sadi` (worktree at `C:/Projects/SermonForge-sadi`, forked from `sub/sfdi`).
- Scope: 4 anchor fields — Step 2 (MPT, MPS = message anchor) + Step 5 (Intro, Conclusion = listener-contact anchor); modeled after SFDI's three-doc shape.
- Three docs created: `docs/PROPOSALS/sadi-charter.md`, `docs/PROPOSALS/sadi-throughline-vision.md`, `docs/PROPOSALS/sermon-anchor-definition-initiative.md`.
- Substrate: SFDI's Implications Synthesis is what MPT/MPS opens against; cumulative thought-unit table extension into Steps 2+5 is an open walk question.
- No field walks started yet; per-field seven-slot entries land as walks proceed.

---

## 2026-05-04 — docs: SPRD merge to main + workspace tour drift warning

- `docs/PROPOSALS/study-phase-redesign.md` Status header rewritten to reflect SPRD's substantial shipping to `main` (commit `d6258ec`); remaining work (C2 / C4 / workspace tour rewrite) explicitly listed; SADI-gated items (C3 / MPS Draft prompt rewrite) called out.
- `docs/PROPOSALS/sermon-workspace-tour.md` gains a DRIFT WARNING block at the top calling out which of the 34 locked stops reference UI that SPRD's B-series + B4.2 retired (PC card stops 7-10; Phase 1 Basic Outline at stop 14; Phase 2 Diagram + Summarize Parts/Whole at stops 16-17; Phase 3 reshape at stop 19; Phase 4 Compile/Unbeliever at stops 21-24) so the tour-rewrite build session knows what to reconcile before implementing.
- No code changes; doc-only.

---

## 2026-05-04 — sprd C1 + C6 closure: sermon-level takeover + threshold parity confirmed

- `src/App.jsx` — Sidebar no longer renders when `currentView === VIEW.Workspace`; the workspace fills the viewport (`.main-content` already `flex: 1`). The in-workspace topbar's existing `BackButton onClick={onClose}` is the single back affordance per the C1 spec; re-entry from Dashboard returns to the isolated world. Surface Contract #4 remains satisfied (Workspace is on EXPECTED_DEEP); critical write-error banner and OneDriveWarning alerts remain visible across views.
- `docs/PROPOSALS/study-phase-redesign.md` — Implementation progress section updated to mark C5 substantially COMPLETE (commit `9daffff`), C6 COMPLETE implicitly through B-cuts (all four sub-phase boundary thresholds wired in B1.4 / B1.5 / B2.2 / B3.2 / B4.2; contract test parity already in place via `process-2-evidence-gated-ux.test.tsx` describe blocks per boundary), and C1 SHIPPED. Remaining C-items called out: C2 (throughline visualization), C4 (Background series-level inheritance, schema implications), workspace tour rewrite (Component 3); C3 stays SADI-gated; MPS Draft prompt rewrite is SADI-Step-2-gated.
- 358 vitest green; Vite preview clean (Dashboard renders with Sidebar visible, confirming the conditional fires only on Workspace view); no sweep-the-house trigger.

---

## 2026-05-04 — sprd C5: Review prompts + PC tier rewire to Phase 4 Field 3

- `src/utils/reviewPrompts.js` — AIPanel "Review My Work" branches for Observe / Interpret / Redemptive Thread / Implications plus the full-study fallback rewired to use the centralized `<PHASE>_REVIEW_TASK` constants from `src/prompts/study.js` + `flattenToText(parseStructuredField(<column>), <PHASE>_FIELDS)`; drops retired-key references ("commands", "statements", "key words", "believers and unbelievers") and replaces raw JSON dumps with field-list-driven flattened text matching what StudyTab's per-phase Review buttons already use.
- `src/components/OutlineTab.jsx` — outline-builder exegesis context switched from retired Phase 4 key arrays (`IMPLICATIONS_THEOLOGICAL` + `IMPLICATIONS_PERSONAL`) to `IMPLICATIONS_FIELDS` so the outline AI sees Phase 4 work written under the new 4-field shape.
- Pastoral Context tier (tier 7) rewired in `src/utils/contextBuilder.js` to read from Phase 4 Field 3 (`implications.pastoral_context.room_specifics` + `cost_and_gift`) instead of the removed-card schema columns; new exported `readPastoralContext(sermon) → { room, costAndGift }` helper consumed by `AIPanel.jsx` theology-mode pcLines and `StudyTab.jsx` `hasPC`; `normalizeSermon` surfaces `pcRoom` / `pcCostAndGift` instead of the legacy `topic_theme` / `audience_assumptions` / `background_noise` trio; `summarizeExegesis` legacy plain-text path removed (dead code post-A1.0 envelope shape).
- `src/prompts/sermon.js` MESSAGE CONTEXT RULES THIS_SERMON line rewritten for the two-field shape — "The Room is who in this congregation the text is speaking into" / "The Sermon's Work is the cost and gift this text holds for those people" — replacing the old three-field Cultural Moment / Room / Sermon's Work framing tied to the removed PC card.
- `src/utils/contextBuilder.test.js` fixtures + normalizeSermon PC tests rewritten against the new `pcRoom` / `pcCostAndGift` shape sourced from `implications.pastoral_context` JSON envelope (with N/A handling); 358 vitest total green; Vite preview compiled clean.

---

## 2026-05-04 — sprd: Phase 1/2/3 Review-button flattenToText fix

- Phase 1 / 2 / 3 Review buttons in `StudyTab.jsx` previously built the AI-prompt "filled" string via `getPrimaryAnswer(data, f.key).trim()` per field, which silently returned `""` for multi-question fields (no `primary` question key).
- Switched all three Review buttons to `flattenToText(data, FIELDS)` — same pattern B4.0 + B4.1 already applied to Phase 4's Review path.
- Closes the B1.0-era multi-question bug across all four sub-phases — the AI now sees `[author, date, audience, genre]` for Background, `[before, after, impact, holy_spirit_intent]` for Context, `[where, when, how]` for Surface Questions, the canvas/paraphrase/synthesis-table values for Divisions, and the parallel multi-question content for Phase 2 (Deeper Context) and Phase 3 (This Passage and Christ, How the Passage Points to Christ, Our Need and God's Character).
- No new tests; existing `flattenToText` coverage (B1.7) is sufficient.
- 358 vitest total green; Vite preview compiled clean.

---

## 2026-05-04 — sprd B4.2: Field 4 Implications Synthesis + Implications→MPT/MPS gate + PC card removal

- Field 4 (Implications Synthesis) replaces its single primary question with the SFDI 2-question sequence: Q1 `implication_per_unit` is a `cumulative-synthesis-table` reusing B2.2/B3.2 cross-phase plumbing — extends `observations.divisions.thought_units` with the final writable column (`implication`) on top of Phase 1's three columns + Phase 2's `meaning` + Phase 3's `christ_connection` (all read-only), completing the four-phase cumulative table with six columns total. Q2 `synthesis` is a text-prompt stored in `implications.implications_synthesis.synthesis`.
- StudyTab plumbs `crossPhaseRead` / `crossPhaseWrite` to Phase 4's `SpotlightWorksheet`, mirroring the Phase 2/3 wire-ups.
- `evaluateAdvance` extends with the Implications → MPT/MPS threshold (`kind=sub_phase, fromIndex=4`) — Field 4 composite gate (every thought-unit row has `implication`, `synthesis` non-empty); returns `{ gates, firstReason }` per B1.6's structured shape.
- Pastoral Context card removed from `SermonWorkspace.jsx` per the SPRD binding scope decision; PC schema columns preserved defensively, 5 PC-related tour stops removed from `workspaceTourStops.js` (tour rewrite is structural backlog under Component 3).
- 5 new Field 4 composite-gate unit tests; 1 existing sub_phase=4 test rewritten as the composite tightens the baseline; 358 vitest total green; Vite preview compiled clean. **B-series field-defs reshape COMPLETE across all four sub-phases.**

---

## 2026-05-04 — sprd B4.0 + B4.1: Phase 4 Implications reshape + StudyTab refactor

- New `IMPLICATIONS_FIELDS` array realizes the SFDI 4-field shape — Theological Significance → Personal Implications → Pastoral Context → Implications Synthesis. The three-way conversation is now structural; Field 4 (Implications Synthesis) is heavy-lifting with overview, single-primary-question pending B4.2.
- Multi-question sequences: Theological Significance `[about_god, about_ourselves, about_christ, timeless, doctrines]` (Merida's 5 preserved); Personal Implications `[follow, forsake, receive, settle]` (4 verb-driven questions absorbing Merida's 8); Pastoral Context `[room_specifics, cost_and_gift]`.
- Old keys retire from rendering (`IMPLICATIONS_THEOLOGICAL` / `IMPLICATIONS_PERSONAL` arrays + `IMPLICATIONS_UNBELIEVER_KEY` + `IMPLICATIONS_COMPILED_KEY` slots); the unbeliever / compiled constants are retained so `flattenToText` continues to surface any legacy data through the context pipeline.
- StudyTab Phase 4 block refactored: dual-`SpotlightWorksheet` + Implications-for-Unbeliever textarea + Compiled-Implications block + Compile-button + ProposalPanel collapsed into a single `SpotlightWorksheet` over `IMPLICATIONS_FIELDS`; Phase 4 Review-button "filled" builder switched to `flattenToText` (closes the B1.0-era multi-question bug for Phase 4).
- 353 vitest total green (no test break); Vite preview compiled clean.

---

## 2026-05-04 — sprd B3.2: Field 5 Christ-Connection Statement + RT→Implications composite gate

- Field 5 (Christ-Connection Statement) replaces its single primary question with the SFDI 2-question sequence: Q1 `christ_per_unit` is a `cumulative-synthesis-table` reusing B2.2's cross-phase plumbing — extends `observations.divisions.thought_units` with the writable `christ_connection` column on top of Phase 1's three columns + Phase 2's `meaning` column (all read-only); Q2 `statement` is a text-prompt stored in `redemptive_thread.christ_connection_statement.statement`.
- StudyTab plumbs `crossPhaseRead` / `crossPhaseWrite` to Phase 3's SpotlightWorksheet, mirroring the Phase 2 wire-up.
- `evaluateAdvance` extends with the Redemptive Thread → Implications threshold (`kind=sub_phase, fromIndex=3`) — Field 5 composite gate (every thought-unit row has `christ_connection`, `statement` non-empty); returns `{ gates, firstReason }` per B1.6's structured shape.
- Legacy "Summary of Redemptive Features" Synthesize block removed from StudyTab; `REDEMPTIVE_SUMMARY_KEY` is no longer written to from any UI surface, but `flattenToText` continues to surface any legacy summary data through the context pipeline. Dangling state and unused imports cleaned.
- 5 new Field 5 composite-gate unit tests; 353 vitest total green; Vite preview compiled clean.

---

## 2026-05-04 — sprd B3.0 + B3.1: Phase 3 Redemptive Thread reshape + multi-question sequences

- `REDEMPTIVE_FIELDS` reordered to the SFDI 5-field shape: This Passage and Christ → How the Passage Points to Christ → How the Gospel Makes This Possible → Our Need and God's Character → Christ-Connection Statement.
- Five new keys (`this_passage_and_christ`, `passage_points_to_christ`, `gospel_makes_possible`, `need_and_character`, `christ_connection_statement`); seven keys retire from rendering (`speaks_of_christ`, `relation_to_christ`, `biblical_theme`, `promise`, `need_for_christ`, `nature_of_god`, `jesus_hero`).
- Three multi-question sequences land via existing B1.1 SpotlightField rendering: Field 1 `[position, direct_speech]`; Field 2 `[biblical_theme, promise, type, predictive]` (heavy-lifting with overview); Field 4 `[human_need, god_character]`.
- Field 5 (Christ-Connection Statement) ships heavy-lifting flag + overview blob, single-primary-question for now; its 2-question sequence (`christ_per_unit` cumulative-synthesis-table + `statement` text-prompt) and the RT → Implications composite gate land in B3.2 alongside deprecation of the legacy `summary` slot.
- 348 vitest total green (no test break); Vite preview compiled clean.

---

## 2026-05-04 — sprd B2.2: Field 7 Interpretation Synthesis + Interpret→RT composite gate

- Field 7 (Interpretation Synthesis) ships heavy-lifting overview + 2 questions: Q1 `meaning_per_unit` (new `cumulative-synthesis-table` kind reading/writing the canonical thought-unit array in `observations.divisions.thought_units`) and Q2 `meaning_whole` (text-prompt in interpretation column).
- SpotlightWorksheet gains `crossPhaseRead` / `crossPhaseWrite` props plus a `crossPhaseSource` declaration on questions; cross-phase questions resolve their value upstream instead of from local field data, completeness checks the writable column, and the NA toggle is hidden for cumulative-synthesis-table (NA semantics live upstream).
- StudyTab plumbs cross-phase props for Phase 2 only; the Phase 2 worksheet reads from observations and writes through `updateStructured` against the observations column.
- `evaluateAdvance` extends with the Interpret → Redemptive Thread threshold (`kind=sub_phase, fromIndex=2`) — Field 7 composite gate (every thought-unit row has `meaning`, `meaning_whole` non-empty); returns `{ gates, firstReason }` per B1.6's structured shape.
- 6 new SpotlightWorksheet cumulative-synthesis-table tests + 6 new Field 7 composite-gate unit tests; 348 vitest total green; Vite preview compiled clean.

---

## 2026-05-04 — sprd B1.7: flattenToText multi-question fix

- `flattenToText` now branches on `fieldQuestions(def)` — single-primary-question fields keep the legacy `Label: value` shape; multi-question fields render as a labeled block with each answered question on its own line under the field label.
- Closes a B1.5-era gap where multi-question Phase 1 fields (`background`, `context`, `surface_questions`, `divisions`, `applications`) and Phase 2's `deeper_context` produced empty flattened output, silently starving tier 4 / tier 5 AI context bodies.
- N/A questions skipped per field; continuation lines from structured-list values (canvas / paraphrase / synthesis-table) are indented for readability.
- 5 new unit tests under "flattenToText surfaces multi-question fields"; 3 existing tests rewritten to use new question keys (`divisions.sentence_layout`, `context.before`).
- 336 vitest total green; Vite preview compiled clean.

---

## 2026-05-04 — sprd B2.0 + B2.1: Phase 2 Interpret reshape + Deeper Context question sequence

- `INTERPRET_FIELDS` reordered to the SFDI 7-field shape: Deeper Context → Recurring Ideas → Character Purpose → Contrasts → Cross-References → Commentary Notes → Interpretation Synthesis.
- Three new keys: `deeper_context` (refined from `context_impact`), `character_purpose` (refined from `characters`), `interpretation_synthesis` (merged from `summarize_parts` + `summarize_whole`); five keys retire from rendering (`context_impact`, `characters`, `diagram`, `summarize_parts`, `summarize_whole`).
- Field 1 Deeper Context gains its 2-question SFDI sequence: `unresolved` ("What questions did Observe's Context leave open…") and `book_argument` ("How does this passage fit the book's overall argument…"); multi-question rendering picks up the existing B1.1 SpotlightField path automatically.
- Old data on retired keys is preserved on read but no longer renders, per the defensive-only migration policy in SPRD § 9 (no production sermons exist).
- 331 vitest total green (no test break); Vite preview compiled clean.

---

## 2026-05-04 — sprd B1.6: AdvanceGateChecklist + structured per-gate state (closes A1.2)

- `evaluateAdvance` now returns `{ ok, reason, gates? }` where `gates` is `[{key, label, met, reason?}]` per load-bearing field; the Observe → Interpret threshold surfaces three entries (Field 4 composite, Field 8 Obvious Point, Field 9 Possible Implications) with Field 4's failing sub-reason carried through.
- New `AdvanceGateChecklist` component renders below the disabled Continue button: legacy `data-testid="advance-hint"` single-line shape when `gates ≤ 1` (back-compat with empty-evidence baseline), `data-testid="advance-gate-checklist"` `<ul>` with ✓ / ✗ + label + sub-reason when `gates > 1`.
- All three Continue boundaries in `StudyTab.jsx` (sub-phase, step 2, step 3) wired through the new component; inline-style hint divs collapsed to a `.advance-hint` CSS class.
- Button `title` attribute still carries `firstReason` so SFDI's "hover-checklist on the disabled button" gets both the discoverable inline form and the native-tooltip-on-hover form.
- 4 new evaluateAdvance.gates unit tests + 6 new AdvanceGateChecklist component tests; 331 vitest total green; closes A1.2.

---

## 2026-05-04 — sprd B1.5: Field 4 wire-up + composite gate

- Field 4 `divisions` gains a 3-question array (`sentence_layout` kind=canvas, `paraphrases` kind=paraphrase, `thought_units` kind=synthesis-table) with a structured `referencePanel` blob on Q1 (three rules + epistles/narrative/poetry tips, plain data — no JSX).
- `SpotlightWorksheet` dispatches on `question.kind` to mount `IndentedSentenceCanvas` / `ParaphraseBlocks` / `SynthesisTable`; sibling canvas located via a `findCanvasValue` helper; `PeripheralReferencePanel` flanks the active question via 72/28 flex row when a `referencePanel` is present.
- `evaluateAdvance`'s Observe → Interpret threshold extends with the Field 4 composite gate (Q1 ≥1 main + ≥1 modifier; Q2 every paraphrase filled; Q3 ≥1 row with Thought unit + After line, Signal allowed empty); SFDI N/A escape valve preserved per question.
- Two contract test fixtures updated with shared `FIELD_4_MINIMAL_FILLED` / `FIELD_4_ALL_NA` substrates; 8 new SpotlightWorksheet kind-dispatch tests + 5 new composite-gate unit tests; 321 vitest total green.

---

## 2026-05-04 — sprd B1.3 + B1.4: heavy-lifting overview + Observe→Interpret threshold

- Field defs gain optional `heavyLifting` flag and `overview` blob (data-shape, not JSX); Field 4 Divisions and Field 9 Possible Implications carry SFDI verbatim overview content.
- `SpotlightWorksheet` accepts a `sermonId` prop and tracks per-sermon overview-seen state in `localStorage`; heavy-lifting active fields render the A2.5 `FieldOverviewScreen` on first entry, dismissed by Begin click.
- `evaluateAdvance` gains the SFDI Observe → Interpret threshold (Field 8 non-empty-or-N/A + Field 9 both questions non-empty-or-N/A) layered on top of the empty-evidence baseline; Field 4 composite waits for B1.5.
- Each gate carries its own pastor-facing reason ("State the Obvious Point…" / "Answer the Possible Implications questions…"); N/A counts as satisfied per SFDI's escape valve.
- Two contract test fixtures updated (process-2 + process-3) for the tighter threshold; 12 new tests; 309 vitest total green.

---

## 2026-05-04 — sprd B1: Phase 1 Observe reshape + multi-question rendering

- `OBSERVE_FIELDS` reshaped to the SFDI 9-field Phase 1 shape — Background / Surface Questions / Commands and Declarations added; Basic Outline / Notable Commands / Notable Statements retired.
- New `fieldQuestions(field)` helper resolves a field's question sequence with a single-primary fallback for back-compat.
- `SpotlightField` + `SpotlightWorksheet` extracted to `src/components/SpotlightWorksheet.jsx` and refactored to render multi-question fields (per-question spotlight, "Question N of M" indicator, click-to-edit prior answers).
- Worksheet API threads `qKey` explicitly via `onChange(fieldKey, qKey, value)` / `onToggleNA(fieldKey, qKey)`; StudyTab's `updateStructured` / `toggleStructuredNA` gain optional `qKey` parameter.
- SFDI question sequences wired for Background (4Q), Context (4Q), Surface Questions (3Q), Possible Implications (2Q); 23 new component tests; 297 vitest total green.

---

## 2026-05-04 — sprd A2: structured-exercise UI primitives complete

- `studyFields.js` helpers tolerate the three SFDI structured-list value types plus the Phase 2-4 cumulative columns; new `flattenAnswerValue` threaded through `answeredQuestions`, `flattenToText`, and `applyFieldValueMap`.
- `IndentedSentenceCanvas` renders Field 4 Q1 — Tab/Shift+Tab depth without focus shift, auto-numbered gutter, burgundy level-0 marker, Enter splits at caret, Backspace at line-start decrements depth or merges, paste blocked.
- `ParaphraseBlocks` renders Field 4 Q2 — `groupMainSentences(canvas)` produces read-only blocks (head + indented modifiers) with paraphrase textareas; orphan paraphrases preserved on canvas edits; paste blocked.
- `SynthesisTable` renders Field 4 Q3 — three Phase 1 columns with after-line `<datalist>` autocomplete; per-column `readOnly` flag and cumulative-column data preservation for B2-B4 extensions; paste passes through.
- `PeripheralReferencePanel` (28% flex-basis aside) and `FieldOverviewScreen` (autofocused Begin button) ship as the remaining Component-1 layout primitives; A2 catalog complete (item 6 hover-checklist remains A1.2, deferred to B1).

---

## 2026-05-04 — sprd A1.3: per-question N/A toggle UI

- `SpotlightField` gains a "Mark not applicable" / "Mark applicable" toggle next to "Next question →" — marking N/A advances to the next field, un-marking returns the pastor to edit.
- N/A questions render distinctly: dimmed textarea + ghost-color label when active, italic "Not applicable" placeholder when collapsed.
- The Next-question gate now passes when the question is either non-empty or marked N/A.
- New `toggleStructuredNA` callback wires through `setQuestionNA`; existing answer text is preserved across toggling so un-mark recovers the pastor's work.
- Initial-active-field detection treats N/A questions as complete; pastor lands on the first not-yet-engaged field on re-entry.

---

## 2026-05-04 — sprd A1.1: spotlight rendering for Study fields

- `SpotlightWorksheet` replaces `StructuredWorksheet`: one field active at a time (textarea + "Next question →" disabled-when-empty), others collapsed showing the answer or "Not yet answered" placeholder.
- Initial active field is the first incomplete one (or the first field when all are complete); click any collapsed field to edit it.
- Active textarea autofocuses on activation with cursor placed at the end of existing content.
- New CSS for collapsed/active states — hover affordance on collapsed fields, gold left-border + parchment-warm background on the active spotlight.
- Applies to all four sub-phases; Phase 4's two grouped worksheets render two parallel spotlights until B4's reshape collapses them to four fields.

---

## 2026-05-04 — sprd A1.0: per-question envelope shape foundation

- Storage shape inside `observations`/`interpretation`/`redemptive_thread`/`implications` JSON columns moves to per-field per-question envelopes `{value, na}` keyed by stable question identifiers; `studyFields.js` adds `getQuestionAnswer`, `setQuestionNA`, `getPrimaryAnswer`, `applyFieldValueMap`, `answeredQuestions`, `hasAnyAnswer` helpers.
- `evaluateAdvance` and `buildSubPhaseEvidence` read evidence via `answeredQuestions`, excluding N/A while preserving `legacy_notes`.
- `StudyTab` textareas, `AIPanel` DiffModal/handleAcceptDiff, and `incorporateHelpers` adapt to the envelope shape through `getPrimaryAnswer` / `applyFieldValueMap`.
- `parseStructuredField` auto-coerces older flat-string-per-field JSON on read (defensive, not a migration) and short-circuits when already envelope-shaped.
- Aligned SPRD lines 62 and 84 wording with binding decision #2 — migration mapping is defensive reference, not authoritative spec.

---

## 2026-05-04 — sprd: reframe migration spec as defensive-only

- Reframed § 9 (Per-phase migration mapping) header and intro from "binding spec for Option C" to defensive reference — no production sermons exist as of 2026-05-04, so no migration logic ships in A1 or B1–B4.
- Reframed § Binding scope decisions decision #2 to mark migration policy as defensive-only; preserved the why-C-over-A-or-B reasoning as historical note.
- Dropped legacy_notes parenthetical from A1 milestone row and migration-mapping sentence from B1 row in the implementation milestones table.

---

## 2026-05-04 — sprd: fold SFDI completion, lock binding scope, add A/B/C milestones and migration mapping

- Folded sub/sfdi into sub/sprd at 3a1554f — SFDI walk completion (25 fields, 4 named outcomes, Process #6 activation) now on the SPRD branch.
- Locked seven 2026-05-04 binding decisions in SPRD: migration policy (per-field legacy notes), PC card removal with B4, four-phase synthesis retired, SADI parallel-run, throughline without animation first, AI prompts phase-by-phase.
- Added 13-milestone A/B/C implementation structure with depends-on and SADI gating status per milestone.
- Added per-phase migration mapping tables as binding spec for Option C, covering Phases 1–4 plus PC card top-level columns.
- Only C3 (Step 5 shell) is fully gated by SADI; everything else proceeds unblocked.

---

## 2026-05-04 — sfdi: drift sweeps A+B established, remediation lands, Process #6 activated as Structural

- Two SFDI validator scripts established at `scripts/sfdi-internal-consistency.py` (7 internal-structure criteria) and `scripts/sfdi-cross-doc-consistency.py` (7 cross-doc consistency criteria); both exit 0.
- Seven SFDI doc edits remediate found drift: Phase 4 named-outcome header normalized, Phase 1 Field 4 overview marker brought to canonical pattern, PC progression markers added to three heavy-lifting fields, plus a new Field Pattern subsection codifying per-field-vs-phase-level PC marker convention.
- One SPRD edit fixes stale Component 3 design-considerations field count (`9+9+7+14` → `9+7+5+4`) and stale "Phases 2–4 not yet walked" parenthetical.
- Process Contract #6 moves from Inactive (pending SFDI) to Structural (SFDI scaffolding parsed by validator scripts); `docs/ENFORCEMENT_STATUS.md` Summary table updated to 17 structural clauses and 0 inactive.

---

## 2026-05-04 — sfdi: Phases 2–4 walked; SFDI structural completion satisfied across all four sub-phases

- Phase 2 (Interpret) walked: 9 → 7 fields, Diagram retired, Summarize Parts + Summarize Whole merged into Interpretation Synthesis, Character Purpose name locked.
- Phase 3 (Redemptive Thread) walked: 8 slots → 5 fields with three Merida questions restored (gospel-makes-possible, type-of-Christ, predictive-of-Christ), Christ-Connection Statement elevated as named outcome.
- Phase 4 (Implications) walked: 15 slots → 4 fields realizing the three-way conversation (Theological Significance, Personal Implications, Pastoral Context) plus Implications Synthesis as named outcome.
- Cumulative thought-unit table completed at 6 columns (one writable column added per phase); structural through-line of the workspace named in the Implications → MPT/MPS handoff.
- Process Contract #6 activated — every field has a seven-slot entry, every sub-phase declares its named outcome, every boundary articulates its handoff; clause is now binding rather than vacuous.

---

## 2026-05-03 — sfdi: Phase 1 (Observe) walk complete — 11 → 9 fields, Observe → Interpret handoff articulated

- Phase 1 reshape locked: 11 fields → 9 — merged former Notable Commands + Notable Statements into Commands and Declarations, retired Basic Outline (Field 4 thought units carry the proto-outline), reordered Main Characters ahead of Commands and Declarations.
- Fields 5–9 ratified with full pastor-side framing (Main Characters, Commands and Declarations, Big Ideas, Obvious Point, Possible Implications); Field 9 heavy-lifting with pre-field overview and awareness-discipline framing.
- Observation Set named as Observe's named outcome; load-bearing fields named (Field 4 composite, Field 8, Field 9); N/A escape valve pattern locked at field-level plus question-level granularity.
- Observe → Interpret handoff articulated with composite hard-gate and "Continue to Interpret" button; Process Contract #6 ready to activate for Phase 1.
- SPRD: Component 3 field count updated 11+9+7+14 → 9+9+7+14; Component 1 item 6 stale "Continue to Notable Commands" reference aligned to current state.

---

## 2026-05-03 — docs: SFDI Field 4 expanded to three-question shape, SPRD Component 1 spec sharpened

- SFDI Field 4 expanded from two to three questions: Q1 sentence layout (same), Q2 paraphrase blocks (NEW — rewrite each main sentence in own words), Q3 thought-unit synthesis table (was Q2, now three-column with pastor's own-words summary, no AI generation in the Thought-unit cell).
- SPRD Component 1 spec sharpened: structured-exercise sub-shapes catalog locked (canvas, paraphrase blocks, synthesis table), per-question paste rules replace per-field, structured-list storage DECIDED, hover-checklist required on disabled gate buttons, pre-field overview pattern for heavy-lifting fields, per-cell no-AI policy.
- Pastor-side copy for Field 4 overview and Q1/Q2/Q3 framings landed in the SFDI working doc with softened framing ("bones of the text," "foundation any outline will rest on").
- ANCHORS registry created at `docs/ANCHORS.md` listing the four SFDI/SPRD anchor docs governed by `/anchor-update`.

---

## 2026-05-03 — docs: SFDI Field 4 ratified, SPRD Component 1 extended with structured-exercise question type

- SFDI Field 4 (Divisions / Thought Units) ratified — seven-slot entry with three rules (subject + main verb → left margin; modifiers → indent; coordinates → align), Quick outline tips for epistles and narrative, and the expository commitment that "the point of the text is the point of the sermon."
- SFDI Field Pattern recognizes a new structured-exercise question type alongside the default text-prompt — a canvas the pastor works inside rather than a textarea.
- SFDI Fields 5–11 gained a forward-looking note that they read against the spine Field 4 produces; Field 4 flagged as load-bearing candidate at the Observe → Interpret threshold.
- SPRD Component 1 extended with eight concrete affordances for structured-exercise questions: Tab/Shift+Tab indent, line-number gutter, level-0 marker, peripheral reference panel, paste-intercept, composite gating, storage-shape decision, genre-aware static tips.

---

## 2026-05-03 — skill: add drift-sweep — evidence-based doc/spec drift verification with externalized validator

- New project skill at `.claude/skills/drift-sweep/SKILL.md` enforcing criteria-first → script-first → separated detection/remediation → measurable convergence workflow for any doc/spec/glossary/config drift verification request.
- Bans self-attestation ("looks clean," "no drift found") without raw validator output; requires four-component report (criteria + script + raw output + convergence statement).
- Convergence predicate: single clean post-remediation pass when nothing changed, or Pass A + Pass B both exit 0 after deferred items / script hardening absorbed.
- Hard 5-iteration ceiling forces escalation rather than indefinite re-passing; deferred findings must be promoted into the next iteration's checklist.
- Frontmatter uses only documented fields (`name`, `description`); slash command `/drift-sweep` documented in body for manual invocation.

---

## 2026-05-02 — docs: sermon-workspace.md Phase 1 Observe note — flag SFDI walk's two new fields not yet in code

- Added an SFDI walk note to the Phase 1 Observe section flagging that two fields decided in the Phase 1 walk (Background, Surface Questions) are not yet in `OBSERVE_FIELDS` code; the working order through the 11 fields is named; the code change lands with the Isolated-World Workspace UX overhaul.

---

## 2026-05-02 — docs: comprehensive SPRD/SFDI doc drift sweep — every surface reconciled to current state

- SFDI charter — status header rewritten ("walk in progress" not "scoping; no walkthrough begun"), SFDI document framing updated (working doc exists, accumulates entries), Observe-count footnote added (9 → 11 with Background + Surface Questions), Q8 closed in SPRD-owns list, Isolated-World Workspace UX overhaul added to SPRD-owns list, "downstream initiatives" paragraph rewritten to past-tense for landed pilots.
- SPRD planning doc — section 5 Process #2/#3 framing flipped from "what it should say" (future) to "what it now says" (Q1 + Q3 landed); section 6 + 7 status notes added at top of each section reflecting what landed vs. what's backlog; section 8 title renamed from "What's still open" to "Q records, pilot landings, and structural backlog" (no Q is open anymore); intro line about *Structural — open* tag corrected.
- sermon-workspace.md — Compile and Synthesize button descriptions updated to reflect Q5 shipped (proposal pattern), removing stale "currently writes directly" / "pending Q5" framings.
- ENFORCEMENT_STATUS SPRD section — Isolated-World Workspace UX overhaul added to the structural backlog list (was missing); chain note expanded.
- All canonical docs now consistent on: Q8 closed (b), Isolated-World Workspace UX overhaul as umbrella, seven-slot entry, Phase 1 walk in progress, Background/Surface Questions added to Observe.

---

## 2026-05-02 — docs: SPRD planning doc + ENFORCEMENT_STATUS drift sweep — Q8 closed everywhere, umbrella naming consistent

- SPRD planning doc — six stale "Q8 open" / "Q8 next pilot" surfaces updated to reflect Q8 closed (b) advisory carve-out (status header, question-state line, scope-map row, pilot-landings section, test-coverage row, Q8 entry itself, Process #5 redesign discussion).
- SPRD planning doc status header — "SFDI moves offline" framing replaced with "SFDI runs in-session" pointer to the working SFDI document.
- SPRD planning doc — "Remaining structural backlog after Q8 lands" qualifier dropped; backlog now reads as the ongoing list (Implications restructure, Step 5, PC card removal, Implications Synthesis named outcome, Isolated-World Workspace UX overhaul).
- ENFORCEMENT_STATUS Last-verified parenthetical — "field-level UX redesign" renamed to "Isolated-World Workspace UX overhaul" with three components named.
- Memory `project_sprd_sfdi_state.md` — description, SPRD bullet, and "where were we" guidance all aligned to the umbrella naming and Q8-closed state.

---

## 2026-05-02 — docs: Isolated-World Workspace UX overhaul added to SPRD structural backlog

- SPRD planning doc gains the **Isolated-World Workspace UX overhaul** as the umbrella structural commitment, replacing the standalone field-level UX entry; three components — (1) field-level spotlight, (2) sermon-level app-takeover with canonical BackButton return, (3) throughline visualization with field-completion summaries and animated cues to the throughline node.
- The throughline visualization makes Process Contract #6 ("the Study throughline is structural") literally visible — the throughline becomes a line on the screen the pastor watches earn its named outcomes.
- Design considerations flagged but deferred: throughline shape, animation infrastructure (new for SermonForge), panel positioning, non-disruptive escape for in-progress sermons.
- Strengthens Surface #4 (you-are-here) materially, Process #6 visually, State #6 (in-progress queryable) at re-entry depth.
- SFDI working doc's "Where this lives structurally" section updated to reflect the field pattern as Component 1 of the larger workspace UX overhaul, not a standalone item.

---

## 2026-05-02 — docs: SFDI Phase 1 walk started — field pattern locked, Observe expanded to 11 fields

- New working SFDI doc at `docs/PROPOSALS/study-field-definition-initiative.md` captures the canonical Field Pattern (spotlight + sequential questions + persistent prompts + "Next question" affordance disabled-when-empty) and Phase 1 walk state.
- Observe field order revised to 11 fields — Background and Surface Questions added as new fields; Background's draft seven-slot entry awaiting question-sequence ratification + inheritance ruling; Context's four pastor-articulated questions captured.
- CORE.md Canonical Vocabulary gained two new terms — Question (ordered prompt inside a field) and Answer (what the pastor writes per question); Field clause sharpened to name the questions-inside framing.
- SFDI charter updated — six-slot entries are now seven-slot (added Question sequence); field-pattern pointer added; "How to start a session" simplified to in-session-only path; throughline vision sheet header reframed.
- SPRD planning doc gains a new structural backlog item — field-level UX redesign (spotlight + sequential questions + persistent prompts), sequenced behind SFDI; ENFORCEMENT_STATUS Last-verified parenthetical reflects the vocabulary additions and new SPRD backlog item.

---

## 2026-05-02 — docs: SPRD Q8 — inline AI Reviews carve-out + correct SPRD backlog framing

- CORE.md Process Contract #5 — added scope note explicitly limiting the empty-evidence enforcement to the substitutive `ai_proposal`/`ai_apply` mutation cycle; advisory AI interfaces (Review buttons + Chat interfaces) are a deliberate carve-out governed by the Principle directly.
- ENFORCEMENT_STATUS.md Process #5 row — names the seven inline call sites (Observe / Interpret / Redemptive Thread / Implications Reviews + MPS Chat + Outline Suggest + FE Chat) as the scoped carve-out.
- ENFORCEMENT_STATUS.md SPRD section — Q8 closed; corrected overstatement that "SPRD is fully closed" — open questions are settled but structural backlog (Implications restructure, Step 5, PC card removal, Implications Synthesis named outcome) remains, sequenced behind SFDI.
- "Last verified" parenthetical updated to reflect Q8 alongside Q1 + Q3.

---

## 2026-05-02 — docs: SPRD planning doc reflects Q1 + Q3 landed, Q8 next

- Scope map: Q1 and Q3 marked **Landed 2026-05-02** with commit hashes (`c87c307`, `ec3f960`); Q8 marked **Next pilot**.
- Section 8 "First structural pilot" subsection retitled "Pilot landings and what's next" — captures Q1 + Q3 outcomes, names Q8 as the next pilot, and notes Step 5 + PC card removal as gated on SFDI's content half.
- Q1 and Q3 entries in section 8 rewritten in landed voice with implementation pointers (`evaluateAdvance` in `src/utils/studyAdvancement.js` is the SFDI threshold hook point).

---

## 2026-05-02 — feat: SPRD Q3 — hard-gate UX layer (disabled Continue when source empty)

- New `src/utils/studyAdvancement.js` extracted from StudyTab and SermonWorkspace; exposes `evaluateAdvance(sermon, kind, fromIndex)` as the SFDI threshold hook point alongside the Q1 evidence builders and rejection formatters.
- `StudyTab.jsx` Continue buttons (sub-phase, step 2, step 3) now `disabled` with `title` attribute and inline hint when source is empty; pastor sees the gate before the click rather than the click-then-banner cycle from Q1.
- Stage tabs and breadcrumb pills unchanged — they keep Q1's click-then-banner UX per the Q3 ruling that tabs/pills are navigation, not commitment.
- New `tests/contracts/process-2-evidence-gated-ux.test.tsx` covers the disabled-Continue UI (component) plus `evaluateAdvance` (unit). Test count 675 → 682.
- `docs/ENFORCEMENT_STATUS.md` updated — Process #2 row notes the Q3 UX layer; SPRD section reflects Q1 + Q3 both landed, Q8 still open.

---

## 2026-05-02 — feat: /release skill — gated tag-and-push with security review

- New `/release` skill at `.claude/skills/release/SKILL.md` — pre-flight gates (clean tree, on main, `npm test` pass), version proposal, mandatory `/security-review` invocation, smoke-test checklist from `docs/PROPOSALS/distribution.md` Section 12, then tag + push.
- HIGH security findings are a hard stop; MEDIUM requires explicit acknowledgement; tag format locked to `vMAJOR.MINOR.PATCH` to match `build.yml`'s `v*` trigger.
- `.gitignore` `release/` rule anchored to repo root (`/release/`) — was incorrectly matching `.claude/skills/release/`.

---

## 2026-05-02 — docs: drop dead CLAUDE_original.md reference

- `CLAUDE.md` Authority section no longer points at `CLAUDE_original.md`; that file no longer exists in the repo, so the reference was inert.

---

## 2026-05-02 — feat: SPRD Q1 — sub-phase + step transitions through the spine

- `StudyTab.jsx` — `advanceSubPhase` / `advanceStep` / `jumpToStep` / `jumpToSubPhase` route through `transitionState` with source-position content as evidence; rejection surfaces in a dismissable banner.
- `SermonWorkspace.jsx` — `handleTabChange` routes stage transitions through `transitionState`; new `onMovement` prop bubbles sub-phase + step movements to the existing Process #3 visibility marker.
- Process #1 / #2 / #3 contract tests extended to sub-phase + step resolutions (+7 new tests; existing stage-tab visibility test seeded with content so Process #2 passes).
- `docs/ENFORCEMENT_STATUS.md` updated — Q1 landed, per-clause table notes new resolution coverage; SPRD section reflects structural-only post-merge with Q3 and Q8 still open.

---

## 2026-05-02 — docs: archive ACCI tracker (initiative complete)

- Moved `docs/PROPOSALS/ai-clarity-and-constraint.md` → `docs/ARCHIVE/ai-clarity-and-constraint.md` and stripped misleading "How to resume" / "Decisions resolved" sections; the 26-item ledger is retained as a historical record.
- Left a one-paragraph forwarding stub at the old `docs/PROPOSALS/` path so existing references in `SermonWorkspace.jsx` and `beta-testing-initiative.md` still resolve.
- Memory pointer updated to the new archive location.

---

## 2026-05-02 — feat: ACCI Tier G — polish (max_tokens signal, TTL fix, confirm guard, dead code)

- `electron/ai/provider.js` surfaces `stop_reason` in the success envelope, guards `getClient()` against a falsy `apiKey` on TTL expiry, and documents retry idempotency.
- `electron/ai.js` threads `stop_reason` through the IPC success envelope.
- `src/components/AIPanel.jsx` renders an amber italic truncation note when `stop_reason === "max_tokens"`.
- `src/components/OutlineTab.jsx` "Apply to Outline" now uses the same two-step destructive-replace confirm as StudyTab.
- `src/components/SeriesPlanner.jsx` orphan `handleSlotAI` deleted; `onSlotAI` prop removed from `SlotList` and `SlotRow`.

---

## 2026-05-02 — docs: ACCI Tiers E–F — audit log disclosure, rotation fix, doc catch-up

- `electron/ai.js` rotation guard removed so large entries can't leave the file above the 5 MB cap.
- `src/components/SetupScreen.jsx` discloses the local audit log to the pastor on first run.
- `docs/SYSTEMS/ai-panel.md` documents five previously undocumented AI surfaces: theology research mode, Incorporate flow, externalMessage/persistColumn pattern, prompt-caching contract, and audit log.
- `docs/REFERENCE/ipc-channels.md` updated to remove four obsolete channels and add the `spine` channel, calendar note channels, and corrected `ai-message` payload.
- `docs/SYSTEMS/ai-model-migration.md` created as the model-bump playbook.

---

## 2026-05-02 — feat: ACCI Tier D — CI, AI-integrity lint, payload cap, token usage

- `.github/workflows/test.yml` runs `npm test` on every push to main and on every pull request.
- `eslint-plugin-sermonforge/lib/rules/no-direct-ai.js` flags `@anthropic-ai/sdk` imports outside `provider.js` and `window.electronAPI.sendAIMessage` calls outside `src/utils/ai.js`; enabled as `error` in `.eslintrc.cjs`.
- `electron/ai.js` rejects IPC payloads over 1 MB and writes a monotonic `callIndex` (process-scoped) to each audit log entry.
- `electron/ai/provider.js` passes `usage` (input/output/cache tokens) back in the success envelope; `electron/ai.js` writes it to the audit log.

---

## 2026-05-02 — feat: dedupe outline-review + challenge-MPT prompts (ACCI Item C4)

- `src/prompts/study.js` adds `OUTLINE_REVIEW_TASK` (single source for the 4 outline-review prompts) and `CHALLENGE_MPT_TASK` (single source for the 2 challenge-MPT prompts).
- `src/components/StudyTab.jsx` `outline-review` and `mpt-challenge` fetchInline call sites swap their inline prompts for the imports.
- `src/components/OutlineTab.jsx` `handleReviewOutline` swaps its inline prompt for `OUTLINE_REVIEW_TASK`.
- `src/utils/reviewPrompts.js` `STEPS.OUTLINE`, `STEPS.MPT_MPS`, and `STAGE.Blueprint` branches now use the centralized constants as their `system` value; user prompts trimmed of redundant tail questions covered by the task.
- The `mpt-mps-chain` chain-check stays separate — it tests chain integrity, not MPT challenge. ACCI Tier C complete.
- 666 tests passing; lint clean.

---

## 2026-05-02 — feat: pass step + sermonId at every sendAIMessage call site (ACCI Item C3)

- `src/components/StudyTab.jsx` (11 sites), `OutlineTab.jsx` (3), `DeliveryTab.jsx` (2), `SeriesPlanner.jsx` (12) — every `sendAIMessage` call now passes the active step (canonical `STEPS.*` / `PHASES.*` / `STAGE.*` / `SERIES_STEPS.*` value) and a `sermonId` (`sermon.id` for sermon-level calls, `slot?.id` for SlotRow assist, `null` for series-level calls). Previously these were undefined, causing the audit log to lose surface attribution and the abort registry to skip the affected sites.
- `ManuscriptTab.jsx` has no `sendAIMessage` call sites — no change.
- `OutlineTab.jsx` and `DeliveryTab.jsx` get `STAGE` import.
- 666 tests passing; lint clean.

---

## 2026-05-02 — feat: route StudyTab through buildContext (ACCI Item C2)

- `src/components/StudyTab.jsx` — every AI call site now wraps its user request with `buildContext({ sermon, step })` envelope (`CONTEXT:\n…\n\nUSER REQUEST:\n…`), replacing 11 sites' worth of hand-rolled `Passage: … Observations: … Interpretation: …` blocks. `fetchInline` injects the envelope once for all 8 review/challenge/E-A-I callers; `generateMPT`, `generateMPS`, `sendMpsChat`, `suggestOutline`, `sendOutlineChat`, `generateSummary`, `populateScripture`, `sendFeChat`, the Synthesize Redemptive button, and the Compile Implications button each wrap their own.
- `formatPhaseText(...)` removed from StudyTab.jsx — its sole consumers were the now-replaced hand-rolled context blocks; the same data flows in via `buildContext`'s tier-2 exegesis summary.
- 4 fetchInline call sites (`mpt-challenge`, `mpt-mps-chain`, `outline-review`, `eai-review`) now pass an explicit `step`; previously they fell through to buildSystemPrompt's default.
- SeriesPlanner.jsx scope of C2 is N/A: series-level work has no `sermon` record for `buildContext` to consume; series-context blocks remain hand-rolled (already passed through `buildSystemPrompt` per C1).
- 666 tests passing; lint clean; net diff -9 lines.

---

## 2026-05-02 — fix: row-count-aware DB resolver + empty-active trigger + one-shot recovery tool

- `electron/dbMigration.js` now picks legacy DBs by content-row count (sermons + series), with mtime as the tiebreaker; 0-row schema-only DBs are skipped entirely. Regression test `tests/contracts/db-userdata-path-permanent.test.ts` codifies the 2026-05-02 incident (1-sermon dev DB beating 10-sermon real DB on mtime). Now requires a `countRows(db)` callback.
- `electron/main.js` `initDatabase()` restructured into Phase 1 (establish a working `db`) and Phase 2 (run migration whenever the resulting `db` has 0 content rows) — covers fresh-install, corrupt-then-empty fallback, AND the case where the active path exists but is just an empty schema. Empty active DB is backed up to `.precovery-empty-{ts}.db` before a successful migration overwrites it.
- New `scripts/recover-db.cjs` one-shot tool: read-only inventory + row-count-aware promotion of the right legacy DB into the active path. Useful for buddy installs where the in-app resolver hasn't shipped yet.
- 666 tests passing (+3 vs prior); resolver tests rewritten to verify row-count-primary heuristic; sweep PASS.

---

## 2026-05-02 — fix: path-aware DB resolver — stop silently orphaning user data on path moves

- New `electron/dbMigration.js` exports `migrateLegacyDb(...)` which walks `legacyDbPaths` (added to `electron/config.js`), picks the most recently-modified candidate ≥32KB that loads cleanly, copies it forward, and returns the loaded DB + source path; the legacy file is preserved (copy, not move) as a backup.
- `electron/main.js` `initDatabase()` invokes the resolver only when the active path is empty; existing installs unaffected. A non-blocking "Library restored" banner surfaces via `_pendingStartupWarning` (`kind: "db_migrated"`).
- `src/components/OneDriveWarning.jsx` extends to render the new warning kind alongside the OneDrive kinds.
- `docs/CORE.md` adds "The userData path is permanent" — `legacyDbPaths` is append-only; removing or reordering entries orphans user data and is forbidden.
- 6 new contract tests under `tests/contracts/db-userdata-path-permanent.test.ts`; 663 total passing; sweep PASS with State #2/#6 + Mutation #3 strengthened.

---

## 2026-05-02 — docs: SFDI throughline vision sheet + Merida interlocutor method

- New `docs/PROPOSALS/sfdi-throughline-vision.md` — single-page vision sheet for offline field drafting, capturing the throughline arc, the four named outcomes per sub-phase (Observation Set / Interpretation Set / Christ-Connection Statement / Implications Synthesis), PC progressive entry, non-negotiables, and the "feels earned" qualitative test.
- `docs/PROPOSALS/sfdi-charter.md` Approach section revised: "No external source material" replaced with "Merida as conversation partner, not script — interlocutor for every field," every field walk opening through a Merida-anchored question while the pastor remains source-of-truth.
- `docs/SYSTEMS/sermon-workspace.md` — clarified the verbatim PC articulation in "The Study throughline": "without influence from context" → "without influence from modern context" so biblical-literary engagement (Observe's whole point) isn't excluded by phrasing.

---

## 2026-05-01 — feat: centralize StudyTab + SeriesPlanner system prompts (ACCI Item C1)

- `src/prompts/study.js` extended with 14 new task-directive constants (review prompts, MPT/MPS draft, MPS chat, populate-scripture, synthesize-redemptive, compile-implications, six advance-step briefings); `src/prompts/sermon.js` adds four `series-*` step descriptions; new `src/prompts/seriesPlanner.js` exports 11 task constants + `SERIES_STEPS`.
- StudyTab.jsx: every inline `You are…` system prompt at ~12 call sites replaced with `layerTask(TASK, step)` → `appendTaskDirective(buildSystemPrompt(step, sermon.id), TASK)`.
- SeriesPlanner.jsx: same pattern across BookStudy / Overview / Structure / Slots / Calendar tabs and SlotRow Assist (~12 sites) via module-level `layerSeriesTask`.
- User message content and sendAIMessage signature unchanged in this commit (C2 + C3 follow); 657 tests passing; sweep PASS with Surface #1 + Principle strengthened.
- Q3–Q7 resolutions recorded in `docs/PROPOSALS/ai-clarity-and-constraint.md`; Tier B (Items 5–7) marked shipped.

---

## 2026-05-01 — feat: AI panel constraint visibility (ACCI Tier B, Items 5–7)

- `src/prompts/sermon.js` adds `getActiveRole(step, theologyMode)` mapping every step/stage to a posture label; `src/components/AIPanel.jsx` renders it under the panel title (B1).
- `src/utils/contextBuilder.js` adds `describeContext({ sermon, step, theologyMode })` and exports `resolveIncludes`; `AIPanel.jsx` adds a collapsible "What I can see" surface above the input that lists active tiers, loaded fields, and history turn count (B2).
- `AIPanel.jsx` adds a transient persist-write flash banner using `PERSIST_SAVED_LABELS` and a "history trimmed" notice when conversation exceeds `MAX_HISTORY_TURNS * 2` (B3).
- `docs/PROPOSALS/ai-clarity-and-constraint.md` marks Tier A shipped (Items 1–4) with commit refs and resolves Q1/Q2 by execution; SPRD Q5 cross-reference closed.
- 657 tests passing; lint clean; sweep PASS with Surface #4 + Mutation #3 strengthened.

---

## 2026-05-01 — Thread Framework contract enforcement into sweep skills

- `.claude/skills/sweep-the-multiverse/SKILL.md` adds a CONTRACT MAP linking each audited area to specific clauses in `docs/CORE.md` → "The Framework", threads `Contract check:` lines into every per-area rule block, adds a CONTRACT POSTURE block plus a `CONTRACTS:` field to the output template, raises the word cap from 800 to 1000, and adds a HARD RULE that any contract weakening or Principle violation forces overall FAIL.
- `.claude/skills/sweep-the-universe/SKILL.md` applies the same enforcement layer to the per-area variant with a smaller CONTRACT MAP, per-area `Contract check:` lines, a `CONTRACTS:` block in the per-area output template, word cap raised 350 to 400, and the same FAIL-on-weakening rule.

---

## 2026-05-01 — feat: differentiate AI failure modes (ACCI Item A4)

- `electron/ai/provider.js` classifies thrown SDK/transport errors into eight kinds (auth, rate_limit, network, server, timeout, format, empty, unknown) and returns an `{ ok, kind, message }` envelope instead of throwing.
- `electron/ai.js` IPC handler now resolves with the envelope on every classified failure (rejected IPC promises drop custom error properties); audit log records `error.kind` for each failure.
- `src/utils/ai.js` `sendAIMessage` returns the envelope to renderers; sermon-switch abort surfaces as internal-only `kind: "aborted"` so UI sites can skip rendering.
- Five UI files (`AIPanel.jsx`, `StudyTab.jsx`, `OutlineTab.jsx`, `DeliveryTab.jsx`, `SeriesPlanner.jsx`) replace the unified "Something went wrong" with kind-specific messages at ~31 call sites.
- Test stub at `tests/contracts/_helpers/test-spine.ts` updated for the new envelope contract; full suite 144 passing.

---

## 2026-05-01 — feat: JSON-output validator at AI parse boundaries (ACCI Item A3)

- New `src/utils/aiSchema.js`: `parseAIJson` plus four structural-shape validators (Incorporate `mpt_mps`, Incorporate structured-field, Scripture map, CMC blocks).
- Wired at three JSON parse boundaries — `AIPanel.jsx` Incorporate, `StudyTab.jsx` Populate Scripture, `DeliveryTab.jsx` CMC — replacing silent `null` fallbacks and leaked `SyntaxError` toasts with kind-specific messages.
- Shape-only validation (no content checks) to avoid rejecting imperfect-but-usable AI output.
- `outlineChat.js` (text-shape, regex-based) and Final Tune-Up (prose) deferred per scope ruling and Q1.
- Tests: `src/utils/aiSchema.test.js` (18 cases); full suite 144 passing.

---

## 2026-05-01 — feat: proposal pattern for six direct-write AI paths (ACCI Item A2)

- Five direct-write paths (Synthesize Redemptive, Compile Implications, Populate Scripture, Manuscript Delivery, Preaching Blocks) now route AI output through `ProposalPanel` — no field write without an explicit click.
- Final Tune-Up converts to a persistColumn-confirm variant: `AIPanel.jsx` attaches `persistColumn` to the assistant message and renders Save/Discard buttons, replacing the silent auto-save into `last_tune_up`.
- Aborted or empty responses (sermon switch via A1) deliberately do not attach `persistColumn`, so phantom Save buttons cannot appear on placeholder messages.
- Files: `StudyTab.jsx`, `DeliveryTab.jsx`, `AIPanel.jsx`. Builds on Item A1 (in-flight abort registry).

---

## 2026-05-01 — feat: AbortController on sermon switch (ACCI Item A1)

- Added module-level in-flight registry in `src/utils/ai.js` keyed by `sermonId` plus exported `abortInFlightForSermon(sermonId)`.
- `sendAIMessage` now races the IPC promise against an abort signal and returns `""` on abort — backwards-compatible no-op for all existing call sites.
- `SermonWorkspace.jsx` aborts the previous sermon's in-flight calls in a `useEffect` cleanup keyed on `sermonId`, preventing stale responses from landing on a different sermon.
- Renderer-side only: IPC handler still completes; calls without a `sermonId` are unchanged. AIPanel's three sermon-tagged call sites are now abortable; tab-side callers wait on Item C3.
- Unblocks Item A2 (proposal pattern for the six direct-write AI paths).

---

## 2026-05-01 — chore: bundle /simplify in /sweep-the-house + permission allowlist

- Bundle `/simplify` into `/sweep-the-house` as a report-only Part 2 — no fixes applied without explicit user approval.
- Add Contract Test (four questions tied to The Framework in `docs/CORE.md`) and `CONTRACTS:` output block to the sweep skill.
- Add 9-entry permission allowlist to `.claude/settings.json` — Claude Preview MCP read tools (`preview_console_logs`, `preview_snapshot`, `preview_list`, `preview_screenshot`, `preview_logs`, `preview_start`, `preview_stop`) plus exact-form `Bash(npm run lint)` and `Bash(npm test)`.

---

## 2026-05-01 — docs: Beta Testing Initiative (BTI) charter

- Added `docs/PROPOSALS/beta-testing-initiative.md` as the authoritative testing strategy for the closed pastor-friend beta.
- Two co-equal failure-mode anchors (AI invasiveness and workflow-fit), each with felt/behavioral/theological-or-integration layers.
- Three feedback tiers (in-app flag, pop-out form, async interview) plus continuous Layer 0 telemetry; theological frame check method via opt-in pre/mid/close writing samples.
- Names friend-cohort downsides (pulled punches, loyalty over-engagement, soft-pedaled invasiveness) with explicit design responses; commits cohort-reading rules pre-data.
- Q1/Q2/Q5/Q9 set as Phase 0 → Phase 1 gate; Q7 reframed as cohort-feasibility ruling spanning scale, cadence, and active-cohort floor; tester attrition policy and feedback-to-action pathway promoted into the body.

---

## 2026-05-01 — docs: AI Clarity & Constraint task tracker

- Added 26-item AI remediation tracker at `docs/PROPOSALS/ai-clarity-and-constraint.md` from a 17-agent audit of the AI subsystem.
- Tier A leads with sermon-switch cancellation, proposal-pattern coverage for six direct-write paths, JSON output validation, and differentiated error messages.
- Seven items blocked on product-owner rulings (Q1–Q7); Items 16 and 26 cannot start without rulings.
- Item 2 is the umbrella for SPRD Q5 (Synthesize and Compile direct writes) plus four more direct-write paths.
- No implementation has begun; doc is operational tracker, not charter.

---

## 2026-05-01 — fix: Vocabulary cleanup follow-up (two missed references)

- AI Compile button's user-message header in `StudyTab.jsx` updated: "Personal application:" → "Personal implications:" (lowercase grep miss in the prior pass).
- Tour stop ID `personal-application` → `personal-implications` in `workspaceTourStops.js` for vocabulary consistency; tour iterates by index, not by ID, so no persistence breakage.

---

## 2026-05-01 — feat: Vocabulary cleanup pass (PI → PC, Applications → Implications)

- UI labels renamed: "Possible Applications" → "Possible Implications" in `studyFields.js`; "Personal Application" → "Personal Implications" in StudyTab group header and tour stops; tour stop "Pastoral Intelligence." → "Pastoral Context."
- AI-facing prompt strings updated: `src/prompts/sermon.js` THIS_SERMON section header → "Pastoral Context"; `contextBuilder.js` new-sermon marker string → "pastoral context."
- Internal variables renamed for consistency across `StudyTab.jsx`, `AIPanel.jsx`, `SermonWorkspace.jsx`, `workspaceTourStops.js`: `piBlock`/`piParts`/`piLines`/`piOpen`/`setPiOpen` → `pcBlock`/`pcParts`/`pcLines`/`pcOpen`/`setPcOpen`.
- Doc layer aligned (sermon-workspace.md, context-pipeline.md, schema.md, project-structure.md, CLAUDE.md, sermon-workspace-tour.md, sfdi-charter.md, study-phase-redesign.md): "Pastoral Intelligence" → "Pastoral Context"; "Personal Application" → "Personal Implications"; "Possible Applications" → "Possible Implications" outside the verbatim user articulation. JSON keys, database columns, and migrations unchanged. Lint clean (5-error baseline holds), 123/123 tests pass, spine integrity OK.

---

## 2026-05-01 — feat: PC vision verbatim + Process #4 sharpening + SFDI anchors

- Captured PC vision verbatim in `docs/SYSTEMS/sermon-workspace.md` under new "The Study throughline" section; "Pastoral Intelligence Card" section replaced with "The Pastoral Context card (interim)" naming the always-on card as the anti-pattern the throughline replaces.
- Process Contract #4 sharpened in `docs/CORE.md`: "follows the text" → "is driven by the text" matching PC vision's directional language.
- SFDI charter gains "Theological anchors" (Possible Applications as PC's first surfacing; Implications as three-way conversation), "What completion looks like" (experiential / artifact / enforcement / downstream tests), and "Pre-walkthrough cleanup pass" (PI→PC and Applications→Implications).
- SPRD Q7 partially answered: restructure Implications as one step with PC as one of three voices, not split; details resolve through SFDI's Implications walkthrough.
- `docs/ENFORCEMENT_STATUS.md` updated for the Process #4 wording sharpening; Last-verified date 2026-05-01.

---

## 2026-04-30 — feat: SFDI initiative + Process #6 (Study throughline is structural)

- SPRD planning document landed; Q1 ruled sub-phase and step transitions become real recorded movements through the spine.
- SPRD paused pending SFDI after surfacing that the fields inside each sub-phase need definitions and flow before SPRD's content-level questions resolve.
- New initiative scoped: Study Field Definition Initiative (SFDI); charter at `docs/PROPOSALS/sfdi-charter.md`.
- New Process Contract #6 in `docs/CORE.md`: "The Study throughline is structural" — binds integrity, not field count; activates when SFDI ships first entries.
- New Canonical Vocabulary section in `docs/CORE.md`; `docs/ENFORCEMENT_STATUS.md` updated with Process #6 row, SFDI deferred section, Summary "Inactive" layer.

---

## 2026-04-30 — feat: TextButton primitive — CTA primitive set complete + audit triage closed

- New `<TextButton>` primitive at `src/components/primitives/TextButton.tsx` with `.btn-text` CSS class; six tertiary text-link buttons migrated (Dashboard guided-tour, Sidebar Send-feedback, workspace + planner "How this works", planner Study Guide, tour overlay "Leave tour").
- TourOverlay "Back" / "Next" migrated to `<SecondaryButton>` / `<PrimaryButton>` with new `.btn-ghost-dark` className override; password-toggle (`SetupScreen`) and × dismiss (`StudyTab`) migrated to `<IconButton>`.
- Lint `no-raw-button` baseline drops 15 → 5; the residual 5 are tab/pill navigation elements (not CTAs) and are outside Surface #2's scope — a future `<TabButton>`/`<NavButton>` is sequel hygiene, not contract-driven.
- `docs/ENFORCEMENT_STATUS.md` updated: Surface #2 + #3 promoted to structural-primary, Summary table re-tallied to 16 structural / 2 test / 3 lint / 0 unenforced + 6 sub-clause portions named-deferred to specific successors (Phase 4, Phase 6, SPRD).
- Audit triage initiative closed; 5 primary pilots (C/D/E/B.2/B.3) + 4 deferred-bucket items shipped; system documented as ready for ~30-tester onboarding.

---

## 2026-04-30 — feat: vocabulary completion — view-keys + tab-keys to canonical PascalCase

- New `VIEW.*` enum in `src/core/contracts.ts`; App.jsx + Sidebar.jsx migrated; Surface #4 test parser accepts `VIEW.<Name>` references alongside literal strings.
- Workspace tab keys → `STAGE.*` end-to-end (SermonWorkspace, tab callers, tour data, contextBuilder, reviewPrompts, sermon prompts, memory capture set); localStorage migration handles legacy lowercase values.
- `canonical-stage-name` forbidden set expanded to `writing/ready/archived/planning/active/study/outline`; rule gained a CSS-class-context exemption so `nav-item.active` and similar don't false-fire.
- Companion renames clear the expanded forbidden set: `.step-pill-active`/`.subphase-pill-active` → `-current` (CSS + JS), DeliveryTab panel `"outline"` → `"preaching-outline"`, AI-loading state keys.
- Verified: lint at the 15-error residual baseline (`no-raw-button` only), 29/29 contract tests pass, spine integrity OK.

---

## 2026-04-30 — feat: enable react/jsx-no-undef + no-undef (close import-drift class)

- `.eslintrc.cjs` registers `eslint-plugin-react` (already in `package.json`) and enables `react/jsx-no-undef` + `no-undef` — closes the consumer-side import-drift class that hit `SeriesPlanner.jsx` during Pilot C and surfaced only at runtime.
- One pre-existing drift surfaced and fixed: `src/components/primitives/BackButton.tsx` referenced `React.MouseEvent<HTMLButtonElement>` without importing the namespace; switched to the named-type import.
- `docs/ENFORCEMENT_STATUS.md` — moved the "Consumer-side import drift" caveat from mitigation-candidate to active enforcement; lint baseline accounting lists the new rules at zero.
- Verified: lint clean at the 15-error residual baseline, 29/29 contract tests pass, spine integrity gate passes (75 files).

---

## 2026-04-30 — feat: Resume Work + Mark Complete UX (State Contract #6)

- Dashboard Resume Work tile consumes `spine.getInProgressSermons()`; sermons whose delivery date has passed get a return-day reminder section with crimson highlighting.
- Delivery tab gains explicit "Mark sermon complete" + an auto-suggest banner when delivery date is past and manuscript exists; the banner suggests, the user clicks.
- SeriesPlanner topbar gains "Mark Series Complete" + an auto-suggest banner when every committed child sermon is complete.
- Mark Complete writes `stage` / `status` through `spine.updateSermon` / `updateSeries` — no new IPC channels.
- `docs/ENFORCEMENT_STATUS.md` updated; State #6 fully closed. **Audit triage initiative complete.**

---

## 2026-04-30 — feat: Archive → Completed Sermons rename + per-sermon re-export (Surface Contract #4)

- New `src/components/CompletedSermons.jsx` with renamed copy and per-sermon "Re-export" button — reuses existing `sermon-export-manuscript` IPC, no new IPC channel.
- `src/components/Archive.jsx` reduced to a re-export shim pointing to `CompletedSermons`; existing imports keep compiling.
- App.jsx routing renamed `archive` → `completed-sermons`; Sidebar gains a canonical "Completed Sermons" entry under Sermon Prep.
- `tests/contracts/surface-4-you-are-here.test.ts` `EXPECTED_DEEP` no longer contains `archive`; the route's Surface #4 exception is closed.
- `docs/ENFORCEMENT_STATUS.md` updated; view-key + workspace tab-key PascalCase migrations deliberately deferred (both require coordinated `contextBuilder.js` changes).

---

## 2026-04-30 — feat: BackButton primitive (Surface Contract #5)

- New `src/components/primitives/BackButton.tsx` — canonical back-affordance with `labeled` and `icon` variants; the `←` prefix is structural so consumers can't drift it via copy.
- Migrated 4 back-affordance sites: SermonWorkspace topbar chevron + sermon-not-found error case, SeriesPlanner topbar, OutlineTab "Return to Study".
- Fixed a Pilot C regression in `SeriesPlanner.jsx`: `<PrimaryButton>` / `<SecondaryButton>` / `<IconButton>` were used without imports since `f061c12`; passed lint silently because no `react/jsx-no-undef` rule is configured and would have crashed at mount.
- `docs/ENFORCEMENT_STATUS.md` updated — Surface #5 moved from "Deferred" to "Structural"; all five Surface Contract clauses now have an enforcement layer.
- Workspace tab-key PascalCase migration deferred to Pilot B.2; `contextBuilder.js`'s lowercase switch cases need coordinated migration.

---

## 2026-04-30 — feat: empty-state + loading primitives (Surface Contract #3)

- New `src/components/primitives/{EmptyState,LoadingState}.tsx` — canonical empty-state layout and loading-verb shape; `LoadingState`'s `verb` prop is typed against the `LoadingVerb` union (`Loading…` / `Saving…` / `Thinking…`).
- `<PrimaryButton loading={LoadingVerb}>` now auto-renders the canonical verb in place of children; prop type changed from `boolean` to `LoadingVerb` (no existing callers).
- Replaced 30 non-canonical loading verbs across 11 components — Drafting/Generating/Reviewing/Synthesizing/Compiling/Assisting/Analyzing/Running → Thinking…; Submitting/Creating/Exporting/Retrying/Formatting → Saving…; Fetching scripture → Loading…
- Tightened `sermonforge/canonical-loading-verb` to exempt JSX attribute values so placeholders like `placeholder="Sermon title…"` no longer false-fire; `canonical-loading-verb` baseline drops 36 → 0.
- Three empty states migrated to `<EmptyState>` (Planning, Archive, SermonList) as the pattern demo; `docs/ENFORCEMENT_STATUS.md` updated — Surface #3 moved from "Lint (deferred)" to "Lint + Structural"; total lint baseline now 15 (down from 185).

---

## 2026-04-30 — feat: CTA primitive layer (Surface Contract #2)

- New `src/components/primitives/{PrimaryButton,SecondaryButton,IconButton}.tsx` — solid gold pill, ghost outline, and behavioral icon-button shapes wrapping the existing `.btn-primary` / `.btn-ghost` / `.btn-sm` classes.
- Migrated 134 of 149 raw `<button>` elements across 25 component files; lint baseline `sermonforge/no-raw-button` drops 149 → 15.
- `DeleteButton.jsx` relocated to `src/components/primitives/` with a re-export shim at the old path; 5 importers unchanged.
- 15 residuals are scoped: workspace tab / sub-phase / sidebar nav buttons (Pilot E territory), tertiary text-link buttons, dark-theme tour overlay.
- `docs/ENFORCEMENT_STATUS.md` updated — Surface #2 moved from "Lint (deferred)" to "Lint + Structural"; lint baseline accounting reflects the drop.

---

## 2026-04-30 — fix: collapse stage CSS classes to canonical two-class set

- Replaced legacy 6-class `.stage-*` rule set with canonical `.stage-in_progress` and `.stage-complete` pair in `src/styles/global.css`.
- Removed now-unreferenced `--stage-study` and `--stage-ready` CSS vars.
- Restores badge styling for the `'in_progress'` / `'complete'` vocabulary produced by the v16 migration; closes the Pilot B.1 visual regression where `Archive` and `SermonList` badges rendered unstyled.

---

## 2026-04-30 — fix: defer slot creation until user names it

- `+ Add Slot` in `SeriesPlanner` now creates a UI-only draft row keyed `draft-<uuid>`; no IPC `create-sermon` fires until the user types a non-empty title.
- Title input shows the canonical `placeholder` attribute instead of leaking the literal "Untitled sermon" string into sidebar recents, calendar labels, and workspace topbars.
- `commitDraft` runs on title blur / Enter / Open click, surfaces inline errors on commit failure, and follows up with `updateSermon` for fields not accepted by `create-sermon` (e.g. `study_guide_note`).
- Deleting a draft before commit removes it from local state with no spine call; navigating away discards uncommitted drafts.

---

## 2026-04-30 — fix: post-enforcement audit regressions

- Renamed `getSeriesById` → `getSeries` import + call site in `SeriesPlanner.jsx` so opening a series no longer hangs on "Loading…".
- Rewrote `Planning.jsx` `statusColor` map with `SERIES_STATUS` keys so in-progress series render in sage instead of gray.
- Added "Consumer-side import drift" caveat + JSDoc/checkJs mitigation note to `docs/ENFORCEMENT_STATUS.md`.

---

## 2026-04-30 — feat: pre-SPRD contract enforcement layer

- New `src/core/contracts.ts` + `src/core/spine.ts` make the spine the only sermon/series API; v17 migration adds `current_*` position columns + `legacy_evidence_cutoff`.
- `scripts/spine-integrity.js` (wired into `.husky/pre-commit`) blocks renderer-side bypasses — raw SQL, `db.run`, `electronAPI.spine`, or `database.js` imports of spine-only names outside `src/core/`.
- Local `eslint-plugin-sermonforge` lands five rules; 11 contract tests cover State #3/#5, Process #1–#5, Mutation #1/#3, Surface #1/#4 against a Path-B in-memory fixture.
- Migrated 11 renderer components to `spine.*`; extracted `SermonWorkspace`'s save-state into `spine.persistMutation` and added `data-testid="movement-event"` on tab transitions.
- `docs/ENFORCEMENT_STATUS.md` is the canonical per-clause map: 13 structural / 2 test / 3 lint / 3 deferred / 0 unenforceable.

---

## 2026-04-30 — chore: add enforcement-status check to end-session skill

- Added STEP 2 — ENFORCEMENT STATUS CHECK to `.claude/skills/end-session/SKILL.md` listing the seven contract-enforcement trigger paths.
- When any trigger path is touched, the skill now requires updating `docs/ENFORCEMENT_STATUS.md` (deferred-clause moves, per-clause table sync, test fixture confirmation, "Last verified" date) before proceeding.
- Renumbered subsequent steps: CHANGELOG → STEP 3, COMMIT → STEP 4, PUSH → STEP 5, CONFIRM → STEP 6.

---

## 2026-04-30 — feat: mac build pipeline scaffolding

- New `mac` + `dmg` targets in `package.json`: universal arch, hardened runtime, notarize via `APPLE_*` + `MAC_CSC_*` env, stable `SermonForge-Setup.dmg` artifact name matching the Windows pattern.
- New `.github/workflows/build.yml` `build-macos` job runs `iconutil` over `brand/icons/sermonforge.iconset/` to generate `build/icon.icns`, then electron-builder signs, notarizes, and publishes.
- New `build/entitlements.mac.plist` declares hardened-runtime requirements (JIT, unsigned exec memory, library validation off, dyld env vars, network client).
- New `brand/` folder holds the designer-prepared icon kit: 1024 master, SVG masters, Apple iconset (10 sizes with `@2x` naming), Windows PNGs, and horizontal + stacked wordmark lockups carrying the "Clarity through Constraint" tagline.
- `build/icon.ico` regenerated via ImageMagick from `brand/icons/win/` (7 sizes incl. new 24×24 entry); `build/icon.icns` is gitignored as a CI-generated artifact.

---

## 2026-04-29 — chore: remove dormant Library + Illustrations dead code

- Removed 11 dormant IPC handlers from `electron/main.js`: `library-status`, `library-build-embeddings`, `library-get-folder`, `library-set-folder`, `library-import`, `library-search`, `library-get-manuscripts`, `db-deleteLibraryItem`, `db-getAllIllustrations`, `db-createIllustration`, `db-deleteIllustration`.
- Removed library helpers (`ensureLibraryDb`, `chunkManuscript`, `indexLibraryManuscript`, `getLibraryPath`, `getAllDocxFiles`, `parseLibraryFile`, `copyToManagedLibrary`, `libraryContentHash`), globals (`libraryDb`, `libraryVecAvailable`), constants (`MANAGED_LIBRARY_DIRNAME`, `EMBED_DIM`, `CHUNK_MAX_CHARS`, `LIBRARY_PATH`), and the `illustrations` CREATE TABLE.
- v3 and v15 migration bodies are now no-op version bumps; fresh installs skip creating `library` + `library_fts` + the `content_hash` column. Existing installs retain those tables as orphan data; theology + embedder + buildFtsQuery preserved.
- `docs/REFERENCE/ipc-channels.md`, `docs/REFERENCE/schema.md`, and `docs/SYSTEMS/database.md` cleaned to match removed surfaces.

---

## 2026-04-29 — chore: remove Library and Illustrations features

- Deleted `src/components/Library.jsx` and `src/components/Illustrations.jsx` user-facing pages.
- Removed `library` + `illustrations` routes and lazy imports from `src/App.jsx`.
- Removed library + illustration IPC channel exposures from `electron/preload.js` and matching wrapper exports from `src/db/database.js`; main-process IPC handlers + library DB infrastructure remain dormant pending a follow-up dead-code sweep.
- `FeedbackModal` UX_PARTS dropped "Illustrations" and "Sermon Library"; `CLAUDE.md` routing table dropped its Library entry; `README.md` dropped the library sidecar mention.

---

## 2026-04-29 — feat: State #4 position-in-series; Surface #4 All Sermons; vocabulary sweep

- State Contract #4: `SermonWorkspace.jsx` topbar shows "‹ Sermon X of Y ›" with prev/next chevrons; siblings fetched via existing `getSermonsBySeries`; new `onOpenSermon` prop wired through `App.jsx`.
- Surface Contract #4 (partial): added "All Sermons" entry to the Sermon Prep sidebar dropdown (mirrors "All Series"); Sermon Prep active state extended to highlight when `currentView === "sermons"`.
- Naming drift sweep (State #5 + Surface #1): `Continue to Outline Tab →` → `Continue to Blueprint →` in StudyTab; Planning page title "Planning" → "All Series"; FeedbackModal "Outline Tab" → "Blueprint Tab"; Dashboard hero CTA "Create sermon" → "Build sermon"; SermonWorkspace "How this works" diagram stage 2 label "Outline" → "Blueprint".

---

## 2026-04-29 — feat: complete Mutation Contract; State #3 no anonymous series

- Mutation Contract #3: workspace topbar shows "Saving…" / "Saved" / "Save failed · Retry" via new `saving`/`saveError`/`lastSavedAt` state in `SermonWorkspace.jsx`.
- State Contract #3: new `NewSeriesModal.jsx` collects title before any record is written; `db-createSeries` IPC rejects empty titles; sidebar "Untitled Series" filter band-aid removed; `App.jsx` `handleNewSeries` opens the modal instead of writing a silent stub.
- Mutation Contract #5: new `InlineError.jsx` canonical inline pattern; raw `alert()` removed from `NewSermonModal.jsx`; bespoke crimson treatments in Archive, FeedbackModal, SetupScreen, Library import error, and NewSeriesModal swapped to InlineError.
- `PassagePopup.jsx` rephrased ESV-key error from "Add ESV_API_KEY to .env" to user language; `SeriesPlanner.jsx` stripped "— check console" from "Save failed" indicators.

---

## 2026-04-29 — feat: Mutation Contract — AI proposals reviewed before apply

- New `src/components/ProposalPanel.jsx` component implements the review-then-apply pattern that enforces Mutation Contract clauses #1 and #2 from `docs/CORE.md`.
- Study Step 2 `Draft → MPT` and `Draft → MPS` no longer overwrite the field; the AI draft appears in a parchment-and-gold proposal panel below the textarea with "Use this" / "Discard" buttons.
- Study Step 3 `Apply to Outline` uses a two-step inline confirm (`Replace N existing points` + Cancel) when the outline already has user content; single-click apply still works when the outline is empty.
- Study Step 4 `Populate Scripture (ESV)` is now opt-out — it fills only empty Scripture rows, leaves filled rows untouched, and reports populated/skipped counts via a dismissable inline message.

---

## 2026-04-29 — feat: four-contract framework canon; remove Quick Outline

- Added "The Framework" section to `docs/CORE.md`: Principle (Clarity through Constraint), hierarchy, four contracts (State / Process / Mutation / Surface), and the four-question Test for evaluating any change.
- Removed Quick Outline UI: dashboard tile in `Dashboard.jsx`, multi-step dark panel + state machine + helpers in `Library.jsx`, and the now-unused `onNavigate` prop wiring on Dashboard.
- Removed Quick Outline IPC: `library-create-sermon-from-outline` and `sermon-export-quick-template` handlers in `electron/main.js`, matching wrappers in `electron/preload.js` and `src/db/database.js`, the `src/prompts/quickOutline.js` prompts file, and IPC channel docs.
- Updated `/agents` and `/run-agent` skill definitions to remove the arbitrary 3–5 agent cap and the one-agent-per-invocation constraint.

---

## 2026-04-29 — chore: ignore design-context bundles, drop diag scripts

- `design-context/` and `sermonforge-design-context.md` added to `.gitignore` (regeneratable design-tool snapshots that duplicate `src/styles` and `src/components`).
- Removed one-shot `scripts/diag-db-diff.js` and `scripts/diag-recent-sermons.js` from the db-corruption and save-payload hotfix sessions.

---

## 2026-04-29 — fix: post-fragility audit follow-ups

- `library-build-embeddings` now filters `library_chunks_status` by `embed_count = chunk_count`, so manuscripts left partial by a worker crash are retried instead of marked complete.
- `electron/embedder/host.js` clears the idle timer before awaiting `ensureWorker()` and re-spawns if the worker reference goes stale during the yield, closing the idle-TTL race against in-flight embed requests.
- New `app-get-sermon-columns` IPC + `App.jsx` mount assertion logs when the renderer `SERMON_COLUMNS` mirror drifts from the main allowlist; skipped under the browser-preview stub.
- Documented `db-backupMemory` and `db-restoreMemory` in `docs/REFERENCE/ipc-channels.md` (Phase 4 channels that had been missing).

---

## 2026-04-29 — fix: phase 6 — embedder worker_thread

- `@xenova/transformers` pipeline now runs in a worker (`electron/embedder/worker.js`) driven from main by `electron/embedder/host.js`; model load and per-query embedding no longer block the main process.
- Host owns lifecycle: spawn-on-demand, 10-min idle TTL, crash respawn, 60 s per-request timeout.
- Kill switch: `SF_EMBED_WORKER=0` falls back to the pre-Phase-6 main-thread pipeline (preserved verbatim) for one release.
- `onnxruntime-node` added to `asarUnpack` so packaged builds load the native binaries from outside `app.asar`.
- `scripts/smoke-embedder-worker.js` verified Xenova + onnxruntime-node embed inside a worker_thread (555 ms cold).

---

## 2026-04-29 — fix: phase 7 + 8 renderer hygiene and cleanups

- Splash: `electron/loading.html` loads immediately and swaps to the real renderer after `initDatabase`, replacing the blank window during slow starts.
- OneDrive guard: first launch in a OneDrive-synced userData shows a blocking modal; later launches show a localStorage-sticky banner. New `app-get-startup-warning` + `app-open-data-folder` IPC.
- Cleanups: `window.memoryDebug` gated to dev only; `buildFtsQuery` drops `sermon`/`sermons`/`different`/`parts` from stop-words; audit-log append failures route through `logError`; Anthropic 401/403 errors stamp the app version.
- Regression test `tests/markdown-xss.test.jsx` confirms `ReactMarkdown` escapes raw `<script>` and `<img onerror>` in assistant output.
- `SetupScreen` carries a permanent OneDrive caution; new IPC channels documented.

---

## 2026-04-29 — fix: save-payload hotfix (H1 pulled forward from Phase 7)

- `SermonWorkspace.persistUpdate` now filters `sermonRef.current` through a renderer-side `SERMON_COLUMNS` mirror (`src/constants/sermonColumns.js`) before sending to `updateSermon`, stripping JOIN fields (`series_title`, `series_color`), the attached `series`/`section` objects, and primary-key/timestamp columns.
- Without this, `buildUpdate`'s dev-throw guard rejected every save in dev mode, the throw was caught silently in the renderer's `try/catch`, and edits to MPT, MPS, observations, manuscript, etc. never reached the DB despite the optimistic `setSermon` making the UI look correct.
- The main-side `SERMON_COLUMNS` allowlist + `buildUpdate` remain the security boundary; the renderer filter is a layered UX fix.

---

## 2026-04-29 — fix: db-corruption hotfix (Phase 2 follow-up)

- `tryLoad` now validates the loaded DB via `SELECT name FROM sqlite_master LIMIT 1` — `new SQL.Database(buf)` does not throw on page-level corruption, so the prior recovery code missed corrupt primaries and let queries fail at runtime instead of falling back to `.bak`.
- `flushDb` is now serialized via a promise chain so two concurrent calls cannot race on the shared `<dbPath>.tmp` file (the prior race interleaved bytes from two flushes and produced a malformed file that the rotation then promoted into `dbPath`).
- No IPC, schema, or external contract changes.

---

## 2026-04-29 — fix: phase 5 library + theology consistency

- Library import now identity-resolves by content-hash → filepath → new: a moved file updates filepath instead of creating a duplicate row, and an edited file is detected and re-indexed instead of `INSERT OR IGNORE`-skipped (v15 adds `content_hash` column).
- `indexLibraryManuscript` is now two-phase: async embed-all-chunks then a single sync transaction that deletes vec rows in the correct order (capture chunk ids first), inserts new chunks/vectors, and writes a `library_chunks_status` completion marker; partial runs roll back.
- `library-build-embeddings` now filters by `library_chunks_status` instead of mere chunk presence, so partially-indexed rows correctly need re-indexing.
- FTS pinned to FTS4 — drops the FTS5-first attempt that produced install-to-install drift; existing FTS5 installs are left untouched.
- `build_theology_vectors.js` now purges orphan `theology_vec` rows on each run, fixing the silent shrinkage caused by `load.py` deleting theology rows without cascading to vec.

---

## 2026-04-29 — fix: phase 4 ai pipeline hardening

- Anthropic SDK now has a 60s per-attempt timeout, one retry on 429/529/abort, and a 24h client TTL so out-of-band key rotations eventually pick up.
- Pastor memory now write-throughs to `userData/memory-backup.json` via new `db-backupMemory`/`db-restoreMemory` IPC; `App.jsx` restores on mount when localStorage is empty (survives Electron major upgrades and cache clears).
- `buildAdaptiveHints` shuffle is now deterministic via mulberry32 seeded on `sermonId+step`, replacing `Math.random()`; same sermon, same step, same hints across retries.
- Theology toggle label changes to "Search Theology Library (keyword only)" when `theology-status.semantic` is false; PI tier (Cultural Moment / Room / Sermon's Work) now prepends to the theology research user message.
- `buildContext` for a brand-new sermon (no passage/MPT/PI) now returns an explicit `[THIS SERMON]` "this sermon is new" marker instead of an empty string.

---

## 2026-04-29 — fix: phase 3 migrations + doc reconciliation

- All migration `ALTER TABLE … ADD COLUMN` calls now go through `safeAlter()` which throws on real errors and only swallows "duplicate column name"; the version bump after each migration block is no longer reached when a real failure occurs.
- Added migration v14 — schema-contract reconciliation that re-applies every additive ALTER from v2/v4/v6/v7/v8/v9/v12 idempotently, healing installs where a prior swallowed-catch left a column missing while the version was bumped.
- Added `assertSchemaContract()` — runs after `runMigrations()`, compares live schema to `SERMON_COLUMNS`/`SERIES_COLUMNS`, logs ERROR on mismatch.
- Reconciled `docs/SYSTEMS/database.md`, `docs/CORE.md`, `README.md`, and `docs/REFERENCE/ipc-channels.md` with current paths (`%APPDATA%\sermonforge\data\`), schema version 14, the FTS4 + sqlite-vec hybrid theology-search algorithm, and 5 previously-undocumented IPC channels.
- Added `Library import + sidecar library.db` and expanded distribution-area routing to `CLAUDE.md`.

---

## 2026-04-29 — fix: phase 2 durability (atomic flush + .bak fallback + await on quit)

- `flushDb` now writes atomically: blob → `.tmp` → rename old DB to `.bak` → rename `.tmp` to `dbPath`; a crash mid-step never produces a truncated `sermonforge.db`.
- `initDatabase` falls back to `.bak` when the primary is corrupt; if both fail, the corrupt original is renamed to `sermonforge.db.corrupt-<timestamp>` before a fresh DB is created so no data is silently overwritten.
- Added `before-quit` handler that `e.preventDefault()`s, awaits `flushDb`, closes native DBs, then `app.exit(0)`; replaces the prior race between async `flushDb` and synchronous `app.quit()` in `window-all-closed`.
- `_isQuitting` re-entry flag prevents the preventDefault loop on second-pass quit.

---

## 2026-04-29 — fix: phase 1 visibility (errors + db-write banner + log redaction)

- AI errors now throw from main instead of returning friendly strings; renderer's empty-string fallback handles failure paths uniformly so error text no longer reaches chat, pastor memory, or `last_tune_up`.
- Added `db-write-error` IPC subscriber and persistent banner with retry; `flushDb` emits only on the second consecutive failure, with `db-write-ok` clearing it on recovery.
- Added `db-flush` IPC for the banner's retry button; preload exposes `onDbWriteError`, `onDbWriteOk`, `flushDb`.
- AI audit log now records structured `error: {kind, message}` for configuration, format, and api failures.
- Feedback submissions now redact `sk-ant-…`, `github_pat_…`, `ghp_…`, and `Token <key>` shapes from the attached log tail.

---

## 2026-04-29 — chore: remove stale gate-reminder hooks

- Dropped the PostToolUse echo hook that injected `"GATE: Run /sweep-the-room..."` after every Edit/Write — referenced the deleted skill and added latency.
- Dropped the Stop hook entirely; it was firing an `echo` after every assistant response close, including read-only chat turns.
- Kept the PostToolUse `node --check` hook for `electron/*.js` edits — still catches syntax errors and aligns with the electron-verification rule.

---

## 2026-04-29 — chore: trim agent loop overhead

- Replaced the mandatory dual-sweep gate in `CLAUDE.md` with a scoped trigger list — `/sweep-the-house` runs only when the diff touches `electron/main.js`, `electron/preload.js`, `src/utils/contextBuilder.js`, `src/utils/ai.js`, `src/prompts/`, `src/db/database.js` exports, or the `sermons` schema.
- Slimmed `/end-session` to: precheck → CHANGELOG → commit → push, dropping the duplicated 5-section pre-commit report and invariant checklist.
- Removed `/sweep-the-room` skill (its checks were a strict subset of `/sweep-the-house`).
- Archived 4009 lines of CHANGELOG entries (pre-2026-04-15) to `CHANGELOG-archive.md`; active `CHANGELOG.md` shrunk from 4523 to 518 lines.

---

## 2026-04-29 — chore: tour engine parameterization + browser-preview boot fallback

- `TourContext.start()` now takes `(stops, { onLeave, seenKey })`; provider-level `onLeave` prop and hardcoded `sf_tour_workspace_seen` localStorage key removed from the engine.
- Workspace tour wired through Dashboard with its own `onLeave: onLeaveTour` and `seenKey: "sf_tour_workspace_seen"`, leaving the engine tour-agnostic.
- `src/db/database.js` falls back to a Proxy stub when `window.electronAPI` is undefined, so the Vite-only browser preview boots into the dashboard instead of crashing on first IPC call.
- Stub returns `{configured: true}` for `getApiKeyStatus`, no-op unsubscribe for `on*` subscribers, and `Promise.resolve([])` for everything else; production Electron path is untouched.

---

## [Unreleased] — feat: dashboard illuminated header + 2×2 grid + church history footer

- Empty page-header band replaced with an "illuminated" preacher-quote rotator (random pick on load, manual prev/next, stencil portrait + citation) drawing from a curated 21-quote / 7-preacher dataset.
- Dashboard body restructured to a 2×2 grid with content-driven tile heights and a hero treatment on "Build a sermon" via gold rule and ornament.
- "This Day in Church History" footer added with an 80+ entry curated MM-DD dataset (liturgical-feast support included) that walks back up to 30 days when today has no entry.
- Sidebar Sermon Prep dropdown now surfaces all titled in-progress sermons, not just non-planning, and shows up to 5 (was 3).
- 7 stencil portrait PNGs added under `src/assets/portraits/` and resolved via `import.meta.glob`.

---

## 2026-04-28 — feat: dashboard reimagining + Library 2.0 + PI-aware Quick Outline

- Dashboard rewritten to a 4-section layout; "Pick up where you left off" moved to expandable left-nav headers.
- New `settings` table (v13) + Library folder picker replace the hardcoded OneDrive path (backward-compat fallback).
- Separate `library.db` (better-sqlite3 + sqlite-vec) holds chunks/vectors; imports are copied into `userData/library/` and embedded via the shared Xenova MiniLM model; backfill via `library-build-embeddings`.
- `library-search` adds `"hybrid"` mode (Reciprocal Rank Fusion of FTS rank + vector cosine); Quick Outline uses it.
- Quick Outline rebuilt as a 3-step PI-aware flow: AI elicits Cultural Moment / Room / Sermon's Work follow-ups, synthesizes 3 outlines, and outputs to either the Sermon Workspace (full) or a placeholder Word doc (`stage = "quick"`).

---

## 2026-04-28 — feat: manuscript tab — full AI context, Tune-Up persistence, DOCX export

- Manuscript tab modes (Flow Coach, Ear Check, Final Tune-Up) now run `buildContext` on the initial fire, so Pastoral Intelligence, exegesis, structure, series context, theology, and memory tiers reach the AI.
- Raised `TIER_LIMITS.tier7` from 800 to 5000 chars so substantive Pastoral Intelligence input is no longer truncated when the three fields are combined.
- Final Tune-Up responses are persisted to a new `sermons.last_tune_up` column (v12 migration) and surfaced as a collapsible "Last Tune-Up" panel on the Manuscript tab so a careful read isn't lost on workspace close.
- Added `sermon-export-manuscript` IPC channel and an "Export to Word" button on the Manuscript tab; saves a `.docx` to `Documents/SermonForge/exports/Manuscripts/` and opens it.

---

## 2026-04-28 — feat: workspace tour adjustments

- Replaced "Skip tour" with "Leave tour" — discards tour sermon/series via new `db-removeTourSermon` IPC handler and returns to dashboard.
- `TourOverlay` now scrolls the active anchor into view on stop change.
- Re-anchored phase-intro stops (Observe, Interpret, Redemptive, Implications) from subphase pills onto their worksheets.
- Split former "Unbeliever. Compile." stop into two steps; added `data-tour-id="implications-compile"`.
- Softened Step 2 (MPT → MPS) wording.

---

## 2026-04-28 — chore: post-launch hardening from multiverse audit

- `logger.js` now routes through `paths.logs` from `config.js`, isolating dev (`logs-dev/`) from packaged (`logs/`) on the same machine.
- `buildUpdate()` in `main.js` throws in dev and warns in packaged, surfacing column/allowlist drift loudly during development.
- AI audit log in `electron/ai.js` rotates at 5MB and keeps the last 500 entries, matching the `logger.js` rotation pattern.
- Added a 5-step Release Smoke Test (Section 12) to `docs/PROPOSALS/distribution.md` to gate every tagged release.

---

## 2026-04-28 — chore: schema cleanup and architectural housekeeping

- v11 migration drops `sermons.big_idea` column (dead since mpt/mps replaced it).
- Export paths changed from hardcoded `C:\SermonForge\exports\` to `app.getPath("documents")`.
- `THEOLOGY_RESEARCH_PROMPT` and `INCORPORATE_REVISION_PROMPT` extracted from `AIPanel.jsx` to `src/prompts/sermon.js`.
- Added explanatory comments for non-obvious `assembleContext` tier ordering and `sandbox: false`.

---

## 2026-04-28 — feat: setup screen — Claude + ESV key collection

- Expanded `keystore.js` to named-key storage; `loadEsvKey()` reads safeStorage in packaged builds, `.env` in unpackaged.
- Updated `fetchEsvText()` in `main.js` to use keystore instead of `process.env.ESV_API_KEY`.
- `app-save-api-key` IPC handler now accepts `{ anthropic, esv }` object; ESV is optional.
- Redesigned `SetupScreen.jsx` with inline step-by-step instructions for both keys.

---

## 2026-04-28 — feat: distribution phase 3 — auto-updater

- Added `electron/updater.js` using `electron-updater`; checks GitHub Releases 3s after launch, downloads silently, prompts restart on completion.
- Added `publish` GitHub config to `package.json` build section pointing at `teamofoxen/sermonforge`.
- `.env` remains in `extraResources` for Bible/feedback tokens; `ANTHROPIC_API_KEY` inside it is ignored in packaged builds (keystore skips `.env` when packaged).

---

## 2026-04-28 — feat: distribution phase 2 — crash logging

- Added `electron/logger.js` with `logInfo`, `logError`, `readRecent`; rotates at 1MB, safe before app ready.
- Hooked `uncaughtException` and `unhandledRejection` in `main.js`; re-throws in dev so errors stay visible.
- Bug feedback reports now auto-attach the last 50 log lines as a collapsible section in the GitHub issue.

---

## 2026-04-28 — feat: distribution phase 1 — first-run API key setup

- Added `electron/keystore.js` using Electron safeStorage to store the user's Claude API key; dev always reads from `.env`.
- Updated `electron/ai/provider.js` to load the key via keystore instead of directly from `process.env`.
- Added `app-get-key-status` and `app-save-api-key` IPC handlers; preload and database.js wrappers wired up.
- Built `SetupScreen.jsx` (design-system-compliant first-run screen) and gated `App.jsx` behind key status check.

---

## 2026-04-28 — feat: distribution scaffolding phase 0

- Added `electron/config.js` as the single dev/prod gatekeeper exporting `isDev`, `isPackaged`, `paths`, and `devServerUrl`.
- Updated `electron/main.js` to replace all scattered `app.isPackaged` and `ELECTRON_DEV` checks with imports from `config.js`.
- Added `docs/PROPOSALS/distribution.md` capturing the full plan for public distribution (Windows first, Mac pending Apple Developer account).

---

## 2026-04-28 — feat: sermon workspace tour — 34-stop guided spotlight

- Added tour-only sermon seed (electron/tourData.js + db-loadTourSermon IPC) with id NOT LIKE 'tour-%' filters on list queries so the sermon stays hidden from dashboard and planner.
- Built TourContext + TourOverlay (radial-gradient spotlight, gold-glow ring, dark-ink callout card with markdown body) mounted at the App root.
- Wired SermonWorkspace and StudyTab to observe each stop's UI prerequisites (tab, studyStep, studySubPhase, drawerOpen, piOpen) via equality-guarded setters.
- Added data-tour-id anchors across SermonWorkspace, StudyTab, ManuscriptTab, and AIPanel for all 34 stops.
- Dashboard "Tour Sermon Workspace" button now seeds, opens, and starts the tour with the locked 34-stop content from the spec.

---

## 2026-04-28 — refactor: remove demo mode in favor of tour scaffolding

- Deleted DemoContext, DemoSplash, TierBadge, ContextPreview, and electron/demoData.js along with all demo-mode toggles, completeness bar, pipeline map, and Preview Context button.
- Removed db-loadDemoSeries IPC handler, preload exposure, and renderer wrapper.
- Added schema v10 migration that deletes orphan demo-% rows from sermons and series.
- Replaced dashboard "See Demo" button with disabled "Tour Sermon Workspace" and "Tour Sermon Planner" placeholders.
- Updated sermon-workspace-tour proposal to a tour- ID scheme with the tour sermon hidden from list queries.

---

## 2026-04-28 — docs: sermon workspace tour implementation spec

- Added docs/PROPOSALS/sermon-workspace-tour.md with locked 34-stop guided tour design and verbatim callout content.
- Captured key decisions: format, dashboard entry, demo data dependency, visual language, voice, and concentric Pastoral Intelligence ordering.
- Listed codebase touchpoints and five implementation questions to settle in the build session.

---

## 2026-04-27 — feat: floating passage panel; fix TDZ crash; unify DB path

- PassagePopup converted from centered modal to fixed floating panel; clicking the passage ref in the topbar toggles it open.
- Sidebar "Show Text" button removed; popup state ownership moved into SermonWorkspace.
- Fixed production crash: flush-pending-save useEffect moved to after persistUpdate declaration (TDZ violation in minified bundle).
- DB path unified to app.getPath("userData") for both dev and production — no more split databases on install.

---

## 2026-04-27 — fix: flush pending save on workspace unmount; fix cross-platform db path

- SermonWorkspace now calls persistUpdate() on unmount, preventing edits made within the 800ms debounce window from being silently dropped on navigation.
- Replaced hardcoded Windows db path with path.join(__dirname, '../data') so the database persists correctly on Mac.

---

## 2026-04-27 — refactor: resolve all sweep-the-universe architectural findings

- Extracted prompt construction and incorporate helpers from AIPanel into reviewPrompts.js and incorporateHelpers.js.
- Moved captureResponsePatterns to memory.js where its dependencies already live.
- Threaded step and sermonId through sendAIMessage and preload so audit log entries are no longer null.
- Added tier6 and tier7 to TIER_LIMITS; removed redundant per-field trim in pastoral intelligence block.
- Updated schema.md to reflect v8/v9 migration columns and mark big_idea as legacy.

---

## 2026-04-26 — feat(flow): surface study summaries and E/A/I depth in Blueprint

- StudyTab fires onSummaryGenerated when s3/s4 summaries are produced; SermonWorkspace lifts this state.
- OutlineTab renders the s4 summary (fallback s3) as a 'From your study work' card.
- OutlineTab shows E/A/I fill indicators per outline point in the reference card.

---

## 2026-04-26 — feat(flow): reduce inter-stage friction across sermon prep flow

- OutlineTab: forward-facing orientation text; Return to Study button when outline is empty; Continue to Manuscript always visible but disabled until outline exists.
- ManuscriptTab: purpose statement on arrival; Continue to Delivery button at bottom of page.
- DeliveryTab: orientation statement above panel tabs; Next: Preaching Outline nudge after Format Manuscript generates.
- SermonWorkspace: pass onTabChange to ManuscriptTab.

---

## 2026-04-26 — refactor(ai): remove all AI quick-action chips

- Removed `getSuggestions`, `howChip`, and `HOW_CHIP_MESSAGES` from `AIPanel.jsx`.
- Removed `handleLibrarySearch` and its dead imports (`getLibraryStatus`, `searchLibrary`, `getLibraryManuscripts`).
- Removed chip rendering block and `libraryCount` state; `getLibraryStatus` call dropped from startup effect.

---

## 2026-04-26 — fix(ui): dark mode header contrast for AI panel and passage popup

- Added `--dark-header-bg` CSS token (`#1e1a16` in dark mode, `var(--ink)` in light mode).
- Applied to `.ai-panel-header`, `.ai-drawer-close-bar`, `.passage-popup-header` so headers stay dark in dark mode.
- Fixes white text and Clear/X buttons being unreadable when `--ink` inverted to light tan.
- Expanded `run.py` and `scaffold_manifest.py` usage notes in theology corpus proposal.

---

## 2026-04-21 — docs(theology): paperclip legacy-row inventory to proposal

- Added legacy `work_id=NULL` inventory pass to proposal §8 as next-session work.
- Scoped it as a read-only investigation covering author/work distribution, size histogram, duplicate detection, MiniLM-L6 truncation share, and `section` parseability.
- Framed as retrieval-precision work (dedupe / dejunk / resize affect search; metadata backfill does not).

---

## 2026-04-21 — feat(theology): ingest Augustine City of God + make pipeline manifest-driven

- Ingested Augustine's *City of God* (Dods tr.) as 780 chunks with Book.Chapter locators and CCEL page refs.
- Refactored `parse_ccel_thml.py` to read structure config from the manifest so works with different ThML layouts plug in without code changes.
- Parameterized `chunk.py` for soft/hard boundary and locator style (Roman vs arabic book, sections vs none).
- Fixed pre-existing parser bug that dropped paragraphs starting before the first `<pb>` marker.
- Paperclipped `run.py` wrapper, manifest scaffolder, Westminster Standards, and legacy-row cleanup to proposal §8.

---

## 2026-04-21 — feat(theology): surface locator + CCEL page refs in retrieval UI

- Added `work_id`, `locator`, `ccel_page_start`, `ccel_page_end` to all theology SELECTs in `electron/main.js` and the `theology-get-chunks` handler.
- New `src/utils/theologyCitation.js` centralizes chunk formatting and source dedup for Dashboard + AIPanel.
- LLM chunk tags and system-prompt format hint now carry `[Author — Work, Locator, p. N]` with verbatim-preservation instruction.
- "Sources consulted" rows in Dashboard and AIPanel render locator and page (or page-range) when present.

---

## 2026-04-21 — feat(theology): manifest-driven ingest pipeline + Calvin Institutes

- Added curated-corpus proposal at `docs/PROPOSALS/theology-corpus.md`.
- Built 5-stage ingest pipeline under `scripts/theology/ingest/` (parse_ccel_thml, chunk, migrate_schema, load, smoke_check).
- Ingested Calvin's Institutes (Beveridge) as 712 chunks with Book.Chapter.Section locators and CCEL deep-link page refs.
- Added 13 metadata columns to `theology` table; pre-existing rows tagged `corpus_version='legacy'`.
- Fixed `build_theology_fts.py` and `build_theology_vectors.js` to target canonical `data/theology.db`.

---

## 2026-04-20 — perf(ai): cache static system prompt and trim chat history per call

- `buildSystemPrompt` now returns a content-block array with `cache_control: ephemeral` on the static role + TOOL CONTEXT + MESSAGE CONTEXT RULES prefix so it's processed once per session.
- Added `appendTaskDirective` so chip/review TASK directives attach as a trailing block without breaking cache reuse.
- `AIPanel` trims conversation history to the last `MAX_HISTORY_TURNS` (6) turns before each send.
- `sendAIMessage` validator now accepts either a string or a content-block array for `systemPrompt`.

---

## 2026-04-20 — refactor: lazy-init Anthropic client and return structured error on missing key

- Anthropic client is now instantiated on the first `generate()` call instead of at module load.
- Missing or empty `ANTHROPIC_API_KEY` returns `{ error: true, message }` instead of throwing.
- `isAvailable()` reads the env at call time.
- IPC handler in `electron/ai.js` forwards the structured error as a user-visible message.

---

## 2026-04-20 — refactor: extract system prompts into src/prompts/ and make AI audit log async

- Relocated `buildSystemPrompt`, `OUTLINE_SYSTEM`, and `FE_CHAT_SYSTEM` to `src/prompts/` with `PROMPT_VERSION` headers.
- Replaced inline prompt definitions in `AIPanel`, `StudyTab`, and `outlineChat` with imports; content unchanged.
- Dropped now-unused `CONTEXT_SECTIONS` and `buildAdaptiveHints` imports in `AIPanel`.
- Switched the `ai-message` audit log from `fs.appendFileSync` to `fs.promises.appendFile` (fire-and-forget).

---

## 2026-04-20 — build: exclude better-sqlite3 MSBuild intermediates from asar input

- Added negation globs under `build.files` for `Release/obj`, `*.iobj`, `*.ipdb`, `*.pdb`, `*.exp`, `*.lib`, and `test_extension.node`.
- Cuts ~10s off the NSIS phase; overall `electron-builder --win` drops from 62s to 47s.
- Packaging-only; no functional change.

---

## 2026-04-19 — perf: split renderer bundle via React.lazy + manualChunks

- Lazy-loaded 8 non-critical views in `App.jsx` under a single `Suspense` boundary.
- Added `rollupOptions.manualChunks` for `react-vendor` and `markdown`.
- Main entry chunk dropped from 542 KB to 49.6 KB (no chunk-size warning).
- Installed `/agents` and `/run-agent` skills.

---

## 2026-04-19 — chore: remove orphaned .show-text-btn CSS

- Removed the `.show-text-btn` rule, unreferenced after Show Text moved to the sidebar.

---

## 2026-04-19 — feat: move Show Text to sidebar, ESV-only modal

- Removed 4 per-sub-phase Show Text buttons and `passageAnchor` state from `StudyTab`.
- Added a sidebar nav item that appears only when a sermon passage is loaded.
- Lifted passage and modal state to `App`; `SermonWorkspace` surfaces `sermon.passage` via `onPassageChange`.
- Rewrote `PassagePopup` as a centered modal (Escape to close) with ESV-only rendering.
- Simplified the `passage-fetch` IPC to ESV-only while preserving the response shape.

---

## 2026-04-19 — chore: add Execution Gates, end-session skill, hook reminders

- Added an Execution Gates section to `CLAUDE.md` mandating the sweep sequence.
- Installed the `/end-session` skill for safe session finalization.
- Added `Stop` and `PostToolUse` GATE reminder hooks in `settings.json`.
- Tracked the previously untracked `/interrogate` and `/sweep-the-multiverse` skills.

---

## 2026-04-19 — chore: remove inline Write with AI panel from Manuscript tab

- Deleted the bottom-of-page Write with AI chat in [ManuscriptTab.jsx](src/components/ManuscriptTab.jsx), along with its state, send handler, system prompt, and now-unused imports (`useState`, `useEffect`, `useRef`, `ReactMarkdown`, `sendAIMessage`).

---

## 2026-04-19 — fix: remove volatile model cache from build package

- Moved `@xenova/transformers` model weights to `resources/models/` so they ship as a stable `extraResources` bundle instead of from the volatile `.cache` inside `node_modules`.
- `ensureTheologyEmbedder()` now sets `env.cacheDir` and `env.allowRemoteModels = false` to load from the committed model path (dev or packaged).
- Excluded `node_modules/@xenova/transformers/.cache/**` from the electron-builder files glob to stop build size growing with each ingestion run.

---

## 2026-04-19 — chore: sweep-the-multiverse audit fixes

- Both docx export handlers in `electron/main.js` now use `fs.promises.writeFile` instead of `fs.writeFileSync`, eliminating main-process blocking during Study Guide and PMB exports.
- Moved `build_theology_fts.py` and `build_theology_vectors.js` into `scripts/theology/` with a README documenting the ~600-word chunk invariant and the 384-dim embedding contract.
- Added a comment above the bootstrap `CREATE TABLE` block in `main.js` stating that all further schema changes must go through `runMigrations()`.
- Added `StudyGuides/` to `.gitignore`.
- Installed the `sweep-the-multiverse` skill under `.claude/skills/`.

---

## 2026-04-19 — feat: Sectioned manuscript editor

- Replaced monolithic manuscript textarea with structured section cards: Introduction, one card per outline point, Transitions, and Conclusion.
- Manuscript JSON stores only new connective tissue (opener, scripture reading, expectation, transitions, response); E/A/I and outline point text edit their source fields directly and sync back.
- Flow Coach, Ear Check, and Tune-Up now use `assembleManuscriptText()` to reconstruct the full manuscript for AI prompts.
- FC and Ear Check both use stepped worklists — brief bullets, one item at a time, reversible.

---

## 2026-04-19 — feat: Ear Check routed to inline chat with Implement Suggestions

- Ear Check now runs in the Write with AI panel (tagged `isEarCheck`) instead of the drawer.
- Ear Check responses show "Implement Suggestions" instead of "Apply to manuscript" — triggers a second AI call that applies only the flagged edits to the manuscript.

---

## 2026-04-19 — feat: inline Write with AI chat on Manuscript tab

- Added always-visible chat panel below the manuscript textarea with passage, MPS, outline, and functional elements sent as context on every turn.
- System prompt allows writing (introductions, transitions, sections, illustrations) unlike the coaching-only Flow Coach.

---

## 2026-04-19 — feat: Manuscript framework pre-fills from functional elements

- `buildTemplate` now reads scripture, explanation, application, and illustration from each point's FE data so "Build Manuscript Framework" seeds the manuscript with the pastor's existing work.

---

## 2026-04-19 — feat: Populate Scripture button auto-fetches ESV text per outline point

- Added "Populate Scripture (ESV)" button to Step 4; AI maps each outline point to its verse range, then ESV text is fetched and written into each card automatically.

---

## 2026-04-19 — fix+feat: Functional Elements — editable titles, scripture field, because-clause fix

- Fixed stale `funcData` state so because-clauses from outline chat now carry through to Step 4 immediately.
- Removed redundant "Outline Point" body field; point title in card header is now a direct editable input.
- Added Scripture (ESV) textarea to each FuncElem card, stored in `functional_elements` JSON.
- Blueprint tab now renders scripture text under each outline point in the MPS card.

---

## 2026-04-19 — feat: Functional Elements step — auto-open cards and AI chat

- `FuncElem` cards now auto-open when they have pre-filled content (e.g. because-clauses seeded from outline chat).
- Collapsed `FuncElem` header shows a truncated explanation preview so pre-filled content is visible at a glance.
- Added persistent AI chat to Step 4 with `FE_CHAT_SYSTEM` prompt focused on developing Explanation, Application, and Illustration per point.

---

## 2026-04-15 — feat: Delivery tab — Manuscript and Outline panels

**`src/components/DeliveryTab.jsx`** (expanded), **`src/styles/global.css`**, **`electron/main.js`**

Added Manuscript and Outline delivery panels alongside the existing Without Notes (CMC) panel. Delivery tab now has three panels navigated by a tab switcher.

**Manuscript panel:**
- Two-phase AI prompt: Flow Coach rhetorical analysis informs where lines break and bullets land; delivery editor formats prose for spoken delivery
- Bullets are the default; non-bulleted flowing lines reserved for rhetorical weight only
- Scripture in italic stacked lines; section labels from the actual outline record
- Stored in new `manuscript_delivery` field (schema v9); Regenerate button if manuscript changes

**Outline panel:**
- Template render from existing outline + functional elements — no AI, no storage
- Shows passage, title, MPS header; each point with Explanation/Illustration/Application beneath

**Shared:**
- Three-tab switcher (Manuscript | Outline | Without Notes) replaces single-panel layout
- Shared `delivery-panel-*` CSS classes replace duplicated PMB header styles

---

## 2026-04-15 — feat: Contour-Mapped Compression (CMC) — Preaching Without Notes

**`src/components/DeliveryTab.jsx`** (rewritten), **`src/styles/global.css`**, **`src/components/SermonWorkspace.jsx`**, **`electron/main.js`**

Replaced the placeholder delivery tab with the CMC engine — a Spurgeon/MLJ-tradition without-notes preparation tool that compresses a completed manuscript into Preaching Memory Blocks (PMBs).

**Architecture:**
- Three-phase AI prompt: Structural Analysis (Tune-Up lens) → Movement Mapping (Flow Coach lens) → Danger Zone Identification (Ear Check lens) → compression into PMBs
- Segments the manuscript by rhetorical movement, not paragraphs or headings
- Compression constraints are non-negotiable: `trigger_phrase` ≤5 words, `core_claim` ≤1 sentence, `memory_hooks` exactly 2 phrases, `imagery` 1 image, `transition_out` 1 sentence (verbatim)
- `trigger_phrase` and `transition_out` are verbatim memory items; all other fields are internalized, not recited

**Schema (v8):**
- New `preaching_blocks TEXT DEFAULT 'null'` column on `sermons` table (migration v8)
- Added `preaching_blocks` to `SERMON_COLUMNS` allowlist
- Top-level `spine` field holds the MPS — the one sentence the preacher returns to when lost

**UI:**
- Generate button builds context from passage, MPT, MPS, exegesis, outline, and full manuscript
- Generated PMBs are immediately editable; blocks persist to DB
- `Regenerate` button replaces blocks if manuscript changes
- Danger zones rendered in crimson; trigger phrase prominent with underline

**Removed:**
- `DeliveryOverlay` component and all delivery overlay CSS — delivery view removed as impractical for pulpit use
- `.btn-deliver` CSS (no longer referenced)
- Pre-sermon checklist, timing notes, post-sermon reflection, delivery notes UI panels

---

## 2026-04-15 — fix: prevent duplicate outline points on repeated Suggest Outline clicks

**`src/components/OutlineTab.jsx`**, **`src/components/StudyTab.jsx`**
- `handleSuggestOutline()` and `suggestOutline()` both appended AI-generated points to the existing outline unconditionally. A second click would stack duplicates. Both now replace the outline with the new suggestion instead of appending. Behaviour on an empty outline is unchanged.

---

## 2026-04-15 — feat: Study workflow logic and handoff improvements

Five fixes to tighten the Study → Outline → Manuscript logic chain:

**`src/components/StudyTab.jsx`**
- `generateMPS()` now includes redemptive thread and implications in the prompt. The MPS is the present-tense congregational claim — it should be informed by the theological and applicational weight the pastor surfaced, not just the MPT in isolation.
- Big Idea banner added to Steps 3 and 4: when `sermon.big_idea` is set, it displays as a persistent dark reference bar above the outline/functional elements so the controlling idea stays visible while working.

**`src/components/OutlineTab.jsx`**
- Added `handleSuggestOutline()` — parses all four exegesis columns from the `sermon` prop and generates a draft outline, matching the capability already in Study Step 3.
- `onTabChange` prop accepted; "Continue to Manuscript →" button added when outline has points, completing the Study → Outline Tab → Manuscript path.
- "Suggest Outline" button now shows alongside "Review Outline".

**`src/components/SermonWorkspace.jsx`**
- Passes `onTabChange={handleTabChange}` to `OutlineTab`.

**`src/utils/studyFields.js`**
- `basic_outline` field hint updated to explicitly name it as a text outline and connect it forward: "It will later inform your sermon outline in Step 3."

---

## 2026-04-15 — feat: outline builder intelligence upgrade

Four improvements to the Quick Outline Builder (Study tab Step 3 and standalone Outline tab):

**`src/components/StudyTab.jsx`**
- Added `suggestOutline()` — generates a draft outline from passage + MPT/MPS + all four exegesis phases. Parses the numbered list response and appends points to the outline via `createOutlinePoint()`. "Suggest Outline" button appears alongside "Review Outline" in Step 3.
- Added `createOutlinePoint` to imports from `../utils`.
- Enriched "Review Outline" prompt — now sends observations, interpretation, redemptive thread, and implications alongside passage/MPT/MPS so the AI can evaluate text-logic derivation, not just MPS ladder.
- Improved s3 summary (`generateSummary("s3", ...)`) — previously only synthesized MPT/MPS in 2–3 sentences. Now passes the full exegetical work and returns 3–5 specific bullets covering textual logic, theological moves, Christ-connection, and application pressures the outline must account for.

**`src/components/OutlineTab.jsx`**
- Added local `reviewResponse`/`reviewLoading` state plus `handleReviewOutline()` function.
- Added `sendAIMessage` and `InlineAIResponse` imports.
- "Review Outline" button appears in the card when outline has points; response renders via `InlineAIResponse`. Evaluation uses passage + MPT/MPS + outline (exegesis data not available in this component).

---

## 2026-04-15 — chore: move database location into project directory

**`electron/main.js`**
- Changed `dataDir` from `C:\SermonForge\data` to `C:\Projects\SermonForge\data` — databases now live alongside the codebase.

**`.gitignore`**
- Updated comment on `*.db` exclusion to reflect new data location.

---

## 2026-04-15 — feat: rename Tune-Up button and add toolbar tooltips

**`src/components/ManuscriptTab.jsx`**
- Renamed "Run Tune-Up Engine" button label → "Final Tune-Up" (function and system prompt unchanged).
- Added `has-tooltip` class and `data-tooltip` attribute to all four toolbar buttons: Build Manuscript Framework, Flow Coach, Ear Check, Final Tune-Up. Each tooltip is 2–3 sentences describing what the tool does and when to use it.

**`src/styles/global.css`**
- Added `.has-tooltip` / `.has-tooltip::after` CSS tooltip rules. Tooltip appears above the button on hover, fades in at 0.15s, uses `var(--ink)` background with `var(--parchment-warm)` text, wraps at 260px. No JavaScript or new dependencies.

---

## 2026-04-15 — feat: Flow Coach and Ear Check on Manuscript tab

Replaced the earlier Transition Coach with **Flow Coach** (renamed and expanded) and added **Ear Check** as a new diagnostic tool. Toolbar order is now: Build Manuscript Framework → Flow Coach → Ear Check → Run Tune-Up Engine.

**`src/components/ManuscriptTab.jsx`**

**Flow Coach** (replaces Transition Coach):
- Renamed `TRANSITION_COACH_SYSTEM` → `FLOW_COACH_SYSTEM` with expanded scope: now coaches intro → each point-to-point gap → conclusion landing, conversationally at the pastor's pace.
- Renamed `runTransitionCoach()` → `runFlowCoach()`; updated initial prompt directive to begin with the Introduction rather than the first point gap.
- Removed the `outline.length < 2` disable guard — Flow Coach is valid even without outline points since intro and conclusion are always coachable moments.

**Ear Check** (new):
- Added `EAR_CHECK_SYSTEM`: two-phase diagnostic. Phase 1 flags structural orphans (passages disconnected from their outline point, causing listener disorientation). Phase 2 flags up to 5 speakability offenders with diagnosis and direction — no rewrites, no replacement language.
- Added `runEarCheck()` function; sends title, passage, MPT, MPS, outline, and manuscript.
- Button disabled when manuscript is empty.

**Why:** Flow Coach needed to cover the intro and conclusion — the gaps at either end of the sermon are as important as the gaps between points. Ear Check fills a gap neither Tune-Up nor Flow Coach covers: listener-hostile phrasing (sentence nesting, abstract noun density, verbal signposting). Ear Check is deliberately diagnostic-only to preserve the author's voice while flagging what will lose the room.

