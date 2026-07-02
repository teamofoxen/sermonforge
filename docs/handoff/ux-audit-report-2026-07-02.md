# Workspace UX Audit — CORE × Pastor's Charter

**Run date:** 2026-07-02 · **HEAD:** `be28c1c` · **Charter:** `ux-audit-prompt-2026-07-02.md` (executed as written)
**Status:** findings only — nothing fixed, nothing committed. Each fix scope awaits the pastor's separate approval.

## How this audit ran

Four ground-truth readers built the clause inventory (CORE in full), the spec/canon picture, the rulings-of-record list, and the code region map. One agent then walked the rendered app in the browser preview — all 8 regions, all three threshold screens, the map, the reference pane in every region — using the real-component fixtures (the preview runs on the database stub, so stub failures were never recorded as findings; data-dependent behavior was verified in code instead). Five lens auditors then swept the workspace, one per lens, each combining fresh code reading at HEAD with the walk log. Their 20 raw findings merged to 16, and every one was independently attacked by two adversarial verifiers — one asking *is this real at HEAD or a preview artifact?*, the other asking *is the clause right, was this already ruled (R1–R19), already shipped, or out of scope?* All 16 survived. **CONFIRMED** means both verifiers proved the behavior and the authority in code and law; **PLAUSIBLE** means the behavior is real but part of the claim rests on interpretation or needs a live app.

Authority note: `docs/CORE.md` is the sole normative authority throughout. The Pastor's Charter is cited only as the lens for what the experience should feel like; findings that can cite only the Charter are labeled **judgment call** and ranked below clause-cited findings of the same severity. No finding recommends a wall, and none re-litigates an OEM ruling — the verifiers checked each against the rulings of record and the 2026-07-02 CHANGELOG before letting it stand.

---

## 1 · Findings

### High

#### H1. Removing an outline point destroys typed words in one click — and silently strands that point's entire Sermon Body prose

**Surface:** Assembly · Outline — the "remove" button on each outline point row.
**File/line:** [SermonWritingSurface.jsx:186](src/components/SermonWritingSurface.jsx:186) and :214; [SermonWorkspace.jsx:444](src/components/SermonWorkspace.jsx:444)-447; [electron/main.js:3497](electron/main.js:3497)-3520.

**What the first-time pastor experiences.** He clicks the small "remove" beside an outline point and the point and its typed sentence vanish instantly — no question, no undo. If he had already written that point's Scripture, Explanation, Application, and Illustration in Body, all of that preached prose disappears from the Body screen and from the Word export in the same click, and re-adding the point never brings it back.

**CORE clause strained:** Mutation #4 — verbatim: "Single-click destruction is forbidden for anything irreversible or input-wiping … a generic two-step confirm is the floor for row-level destruction."
**Charter conviction dimmed:** ¶5 "never overwrites his typing" / ¶7 "the quiet of always knowing … that his work is safe."

**Evidence.** The walk tested it live: typed words died instantly, no confirmation, no undo — the only silent destruction the walker found. Code confirms and worsens it: `removePoint` is a bare filter behind a plain `IconButton`; the repo's own `DeleteButton` primitive (whose header names it the "Mutation Contract #4 structural primitive") sits unused at this site. Worse, `handleOutlineChange` writes only the outline column, so the point's `functional_elements` and transition stay keyed to the dead UUID — which no surface renders and the docx export never reads — and `createOutlinePoint` mints a fresh UUID on re-add, so the orphaned prose is unreachable forever (migration v5 itself calls such keys "orphans" and discards them). Not foreclosed: ruling R1 ratified the builder's copy and button set on the OEM content walk, not its destruction friction — and a content ratification cannot repeal a Mutation-contract floor under CORE's hierarchy.

**Verdict:** CONFIRMED (both verifiers, code-proven at HEAD).

#### H2. Ordinary edits to the Divisions canvas silently and irreversibly destroy that thought unit's typed prose in all three cumulative tables

**Surface:** Study · Observe — the Divisions canvas; the destruction lands in the Interpret / Redemptive Thread / Implications cumulative tables.
**File/line:** [studyFields.js:630](src/utils/studyFields.js:630)-682; [PassageCanvas.jsx:182](src/components/PassageCanvas.jsx:182)-239; [SermonWorkspace.jsx:431](src/components/SermonWorkspace.jsx:431)-438.

**What the first-time pastor experiences.** Weeks into prep he goes back to Observe to tidy his passage layout — indents a line with Tab, merges two lines with Backspace, or presses Enter at the start of a line — and the Meaning, Christ-Connection, and Implication paragraphs he typed for that thought unit are gone from all three tables, permanently, without a word on screen. Undoing the gesture (Shift+Tab, retyping the line) does not bring the words back.

**CORE clause strained:** Mutation #4 — "Destruction that arrives without a Delete button — reload, restart, re-seed, field-clearing toggles — is governed by this clause too." It also strains Mutation #1's "The system does not overwrite user-typed content": a derivation triggered from one field wipes prose he typed in three others.
**Charter conviction dimmed:** ¶5 "never overwrites his typing" / ¶7 "his work is safe."

**Evidence.** Code-verified end to end (the walk's fixtures never exercised a populated canvas edit): `deriveThoughtUnitsFromCanvas` rebuilds the thought-unit array from depth-0 rows with non-empty text only, carrying prior cells solely by `_canvas_row_id`, and `setDivisionsCanvas` **replaces** `thought_units` with the derived array on every canvas keystroke, saving immediately through the normal autosave. Any gesture that removes a row from that set — Tab indent, Backspace-at-line-start merge, Enter-at-position-0 split, or clearing a line's text — drops that unit's cells from state on that very write; reversing the gesture derives against the already-overwritten state, so the cells never return (the positional fallback was deliberately retired). The design comment's own promise — "cumulative columns survive insert/delete/reorder" — fails in exactly these cases. Not ruled: the rulings preserve only per-cell N/A across re-derivation.

**Verdict:** CONFIRMED (both verifiers, code-proven at HEAD).

### Medium

#### M1. The Study→Anchor handoff commands "read it once more" but renders nothing — no passage, no failure voice, no retry — in every non-success ESV branch

**Surface:** the Study → Anchor handoff threshold (`.sah-overlay`), the "Before you forge — read it once more" marinate section.
**File/line:** [StudyAnchorHandoff.jsx:68](src/components/StudyAnchorHandoff.jsx:68)-78 and :47; contrast [ReferencePane.jsx:161](src/components/ReferencePane.jsx:161)-227 and [PassagePopup.jsx:261](src/components/PassagePopup.jsx:261)-292.

**What the first-time pastor experiences.** At the walk's biggest threshold the system tells him to step back and read the passage through once more — and if the ESV fetch fails (no key stored, network down, or no passage set), nothing at all appears under that command: no text, no reference, no explanation, no retry. The full-screen overlay is also covering the reference pane, so the recovery voice that exists everywhere else isn't reachable until he closes the very screen that told him to read.

**CORE clause strained:** Mutation #5 — "Errors speak in one voice … a persistent retryable failure is a banner"; this retryable failure speaks in no voice at all while every other passage surface shares the RECOVERY vocabulary. Secondary: Process #6's saturation amendment — the handoff "carries the passage" (CORE's own verb), and in every non-success branch it carries nothing and says nothing.
**Charter conviction dimmed:** ¶3 "the system sends him back to read it again" — the send-back beat's middle leg goes dark exactly when the fetch fails.

**Evidence.** The component has exactly two render branches — loading, and success with ESV text — and never destructures `refresh` from `useEsvPassage`, so no branch exists for `fetchError`, the no-key/network states, an empty ESV return, or a missing passage, and no retry is even possible on the overlay. Every other passage surface (reference pane, PassagePopup) shares the one RECOVERY voice with a labeled "Try again." The walk observed the rendered omission (stub-triggered, but the missing branch is code-real regardless): heading and instruction with nothing beneath, silently.

**Verdict:** CONFIRMED.

#### M2. The Observation Set gets contradictory existence answers across the completeness surfaces

**Surface:** the Study→Anchor handoff outcome card and reference-pane "Your work" (one test) vs the SermonFinish artifact ledger (a second test) vs the map's Divisions row and the handoff's unfinished list (a third, laxer test).
**File/line:** [sermonState.js:257](src/utils/sermonState.js:257)-262, 268-274, 347, 124-139, 288-293; [studyAdvancement.js:110](src/utils/studyAdvancement.js:110)-118.

**What the first-time pastor experiences.** If he writes the Obvious Point but leaves his Divisions canvas flush-left (no indented modifiers), every surface through the handoff shows the Observation Set as written and the map shows Divisions answered — then the Finish screen alone says it isn't written and sends him back to "lay out the passage." In the reverse case (canvas done, Obvious Point skipped), the handoff announces the Observation Set isn't yet written while Finish calls it written. Same name, opposite answers — and the two "go write it" doors under that one label land in two different fields.

**CORE clause strained:** Process #2 — a named outcome either exists or it doesn't; here one named outcome exists and doesn't at the same time depending on which surface he trusts.
**Charter conviction dimmed:** ¶4 "a named outcome either exists or it doesn't. That honesty is the point."

**Evidence.** Three different existence tests for one named artifact: the handoff card and pane key on the Obvious Point's text; the Finish ledger keys on `checkField3Composite` (canvas main sentence *with* an indented modifier) and jumps to Divisions; the map's Divisions row and the handoff's unfinished list pass on any depth-0 text, no modifier needed. Canon notes the value-vs-composite split as "one asymmetry to note" but it is not a ruling of record (absent from R1–R19), and the third, laxer map test is documented nowhere. The other three Study outcomes share the duality but co-render their missing cells honestly; only the Observation Set produces flat contradiction.

**Verdict:** CONFIRMED.

#### M3. Whole-sermon Delete from the workspace topbar meets neither Mutation #4 floor on that path: the confirm is generic and no Undo is ever visible afterward

**Surface:** workspace topbar — Delete → close to dashboard.
**File/line:** [SermonWorkspace.jsx:568](src/components/SermonWorkspace.jsx:568)-571 and :748; [DeleteButton.jsx:27](src/components/primitives/DeleteButton.jsx:27)-28; [electron/main.js:2431](electron/main.js:2431)-2442; [Dashboard.jsx:57](src/components/Dashboard.jsx:57)-71.

**What the first-time pastor experiences.** He clicks Delete in the topbar, answers the generic "Delete? Yes / Cancel" (it never names which sermon he's about to destroy), and lands on a dashboard where the sermon simply does not exist — no "Deleted · Undo" note, no way back anywhere in the app. The tombstone is on disk, but to him the sermon is gone for good.

**CORE clause strained:** Mutation #4 — verbatim, whole-sermon destruction requires "a named confirm or an undo window, satisfied by the v24 soft delete (tombstone + visible Undo)." On the workspace path neither half holds.
**Charter conviction dimmed:** ¶7 "his work is safe."

**Evidence.** The topbar renders a bare `DeleteButton` on primitive defaults ("Delete" / "Delete?") — the floor the clause reserves for row-level destruction, and the primitive's own docs say to pass a longer `confirmLabel` when reversal cost is higher. The soft delete tombstones correctly, but the visible "Deleted · Undo" stubs are session-local component state on the list surfaces; a delete originating in the workspace never populates them, and the main process records "no Trash UI yet." The walk confirmed the rendered confirm is the bare generic; code shows no reachable Undo after `onClose`.

**Verdict:** CONFIRMED.

#### M4. The creation modal promises twice that he'll title the sermon "later, in prep" — no titling affordance exists anywhere for a standalone sermon

**Surface:** the sermon creation modal (caption + the spoken naming refusal); the promised titling surface (the workspace) offers none.
**File/line:** [NewSermonModal.jsx:186](src/components/NewSermonModal.jsx:186)-190 and :101; [SermonWorkspace.jsx:260](src/components/SermonWorkspace.jsx:260)-264.

**What the first-time pastor experiences.** The creation screen tells him twice — in the caption and in the naming refusal itself — that he'll give the sermon its title "later, in prep." When he goes looking for that moment, it doesn't exist: the workspace has no title control, and no other surface can rename a standalone sermon, so the promise can never be kept.

**CORE clause strained:** State #3 — "A name is required at creation and correctable afterward; requiring a name is not the same as freezing it." For standalone sermons the name *is* frozen. Plus the Test #5: if no surface renders it, it has not shipped.
**Charter conviction dimmed:** ¶7 — the quiet of trusting the signage; a front-door promise the road never keeps teaches him the tool's words can't be trusted.

**Evidence.** The refusal ("…the passage names the sermon until you title it in prep") and the caption ("You'll give the sermon its title later, in prep") are verbatim at HEAD; the modal's header comment promises "titled later in the workspace," while the workspace comment says "No inline edit here." An independent grep of every `updateSermon` call site finds no title write outside the Series Planner (which edits only planner-created series sermons); no rename affordance exists in SermonList, CompletedSermons, Calendar, or the modal. (SADI's "sermon title stays dropped" ruling covered the Anchor field, not app-wide titling — this is not a re-litigation. The topbar title editor was removed 2026-06-27 in `5d33cfc` as collateral of removing inline editing.)

**Verdict:** CONFIRMED.

#### M5. The only way out of the workspace is an unlabeled chevron — its name lives in a hover tooltip

**Surface:** workspace topbar — the icon-variant BackButton, the sole exit from the sermon workspace.
**File/line:** [SermonWorkspace.jsx:680](src/components/SermonWorkspace.jsx:680)-686; [BackButton.tsx:55](src/components/primitives/BackButton.tsx:55)-89; [App.jsx:309](src/App.jsx:309)-324.

**What the first-time pastor experiences.** When he wants to leave the sermon and get back home, nothing on the screen says how: the sole exit is a small unnamed arrow in the dark topbar, and its name — "Back to dashboard" — appears only if he hovers and waits for a tooltip, a discovery gesture low-software-confidence users don't make. Every other Back in the app speaks in words ("← Back", "Back to the sermon", "Close"); the one control that leaves the workspace is the only one that stays silent.

**CORE clause strained:** Surface #5 — "Back is back. Labeled, consistent, predictable from any surface" — plus the Project Identity binding constraint: when a labeled control and a minimal one are otherwise tied, the labeled one wins.
**Charter conviction dimmed:** ¶2 "He is not a software person" — hover-discovered exits assume a confidence the Charter says he doesn't have.

**Evidence.** `variant="icon"` renders a bare 16 px chevron whose only name is `title`/aria; the labeled "← Back" variant exists in the same primitive and is used on the workspace's own not-found screen. The sidebar does not render inside the workspace, so the chevron is the single route home. The 2026-06-26 relabel (Back → "Back to dashboard") landed only in the tooltip layer, and the workspace's own fallback copy tells the pastor to "Use the Back button" — naming a control that carries no visible name. The in-walk Back is worded "← Back": two back conventions inside one surface.

**Verdict:** CONFIRMED.

#### M6. The dashboard's "Build a sermon" card describes a walk that no longer exists — "exegesis, big idea, outline, delivery"

**Surface:** the dashboard "Build a sermon" hero card — the workspace's entry.
**File/line:** [Dashboard.jsx:124](src/components/Dashboard.jsx:124).

**What the first-time pastor experiences.** The first orienting sentence he reads at the front door promises "From text to manuscript — exegesis, big idea, outline, delivery." The walk he then enters is named Study, Assembly, Manuscript, forges an MPT and MPS, and contains no delivery step at all — the one map he was handed at the entrance doesn't match the road.

**CORE clause strained:** Surface #1 + State #5 — canonical names are the only names allowed in copy; "Delivery" is an explicitly retired non-stage in CORE's Canonical Vocabulary; RULES.md: "MPT/MPS is the canonical vocabulary, not 'Big Idea'."
**Charter conviction dimmed:** ¶2/¶7 — not a software person, no spare hours to fight the tool; the door must describe the road he's actually on.

**Evidence.** Verbatim at HEAD, unchanged since 2026-05-05 (`8f6e743`, two months pre-collapse; git confirms), never ratified against the post-collapse walk — ruling R2 makes seminary vocabulary the one valid jargon category, and "exegesis" is the category's namesake on an unratified surface. The walk confirmed it renders on the entry card.

**Verdict:** CONFIRMED.

#### M7. The workspace never names the sermon it has open — no title or passage in any fixed chrome

**Surface:** workspace topbar / whole-workspace chrome.
**File/line:** [SermonWorkspace.jsx:669](src/components/SermonWorkspace.jsx:669)-750 (the comments at :672-673 and :260-261 promise otherwise).

**What the first-time pastor experiences.** Once inside the walk, no fixed part of the screen says which sermon he has open — no title, no passage reference in the top bar. With two sermons in flight, or with the Bible pane collapsed (a collapse that persists across restarts), every screen answers "where in the walk" but never "in which sermon."

**CORE clause strained:** Surface #4 — "'You are here' is always answerable — on every surface … no nameless wandering" — with State #2 in support (position without identity is half an answer).
**Charter conviction dimmed:** ¶7 — "the quiet of always knowing where he is."

**Evidence.** The topbar block comment lists "passage ref, sermon title" as its contents and another comment says the title is "shown read-only in the workspace (title in the top bar)" — but the render contains back/series-breadcrumb/export/save-state/delete only; grep finds no `sermon.title` render anywhere in the workspace. Series sermons at least get "series title + Sermon N of M"; standalone sermons get nothing. The passage appears only as the reference pane's Passage-tab heading, and pane collapse persists globally. The title display was removed 2026-06-27 (`5d33cfc`) as collateral of removing inline editing, with no ruling covering the removal.

**Verdict:** PLAUSIBLE — the code behavior is fully confirmed; what stays interpretive is whether Surface #4's "you are here" promise includes *which sermon*, not just where in the walk. Ranked last of the Mediums for that reason.

### Low

#### L1. Downstream read-only table columns hide per-cell N/A — an honest "nothing here" renders as untouched work or as owned words

**Surface:** the writing surface — cumulative-table prior columns (Meaning in the Redemptive Thread table; Meaning + Christ-Connection in the Implications table).
**File/line:** [SermonWritingSurface.jsx:131](src/components/SermonWritingSurface.jsx:131)-142; contrast [sermonState.js:106](src/utils/sermonState.js:106)-107 and [studyFields.js:522](src/utils/studyFields.js:522)-527.

**What the first-time pastor experiences.** He marks unit 3's Meaning "not applicable" in Interpret — the active, honest gesture the build celebrates — and one region later the CCS table shows that unit's Meaning as "—", identical to a cell he never touched, so his honest answer now looks like unfinished work. If he had typed words before marking N/A, the disowned words render downstream as if they were his settled Meaning, with no marker at all.

**CORE clause strained:** Process #6 (throughline coherence — every outcome built from the preceding field-work), with Process #2's honesty language.
**Charter conviction dimmed:** ¶4 — the carried-forward substrate must tell the truth about what exists.

**Evidence.** The prior-column render reads only the cell value and tests null/empty — the `<key>_na` sidecar is never consulted — while the map's cell display for the same cells explicitly renders "(not applicable)" and the composites honor the sidecar. The N/A build's commit note says the composites, map, and handoff honor the sidecar; the read-only prior columns are the surface the honor never reached. Both affected columns are reachable and accept per-cell N/A in their editing phase.

**Verdict:** CONFIRMED.

#### L2. "Start the sample fresh" is a single-click re-seed that wipes any typing the pastor left in the sample sermon, with no confirm and no undo

**Surface:** dashboard "Look around" tile — the "Start the sample fresh" button (workspace entry).
**File/line:** [Dashboard.jsx:165](src/components/Dashboard.jsx:165)-175; [electron/main.js:2670](electron/main.js:2670)-2683.

**What the first-time pastor experiences.** The sample is deliberately a sandbox — his poking-around survives re-entry — so a pastor learning the tool may leave real typed exploration inside it. One click on "Start the sample fresh" deletes all of it and reseeds, with no question asked and no way back.

**CORE clause strained:** Mutation #4 — the clause names "re-seed" among the destruction that arrives without a Delete button; this is a hard DELETE of the sample rows (bypassing the v24 soft delete) in one click.
**Charter conviction dimmed:** ¶5 / ¶7.

**Evidence.** The button wires straight to `openSampleSermon(true)` with no confirm; the handler runs `DELETE FROM sermons/series WHERE id LIKE 'sample-%'` then reseeds. Severity capped at Low because the label states the destructive intent plainly, the surface is the worked example, and the default "Open a sample sermon" path is the preserving one. T10 shipped "sandbox + explicit reset" — the reset's existence is ruled; no record shows its single-click friction was.

**Verdict:** CONFIRMED.

#### L3. A failed sample-sermon open is completely silent — the error goes only to the console

**Surface:** dashboard "Look around" rows — "Open a sample sermon" / "Start the sample fresh".
**File/line:** [Dashboard.jsx:84](src/components/Dashboard.jsx:84)-97 (the catch at :92-94 is `console.error` only).

**What the first-time pastor experiences.** If loading the sample fails on his machine, he clicks the inviting "Open a sample sermon" door and nothing whatsoever happens — no message, no explanation; the loading state flickers off and the error lands in a developer console he will never open. For a low-software-confidence pastor exploring the tool for the first time, a dead first click reads as "this app is broken."

**CORE clause strained:** Mutation #5 ("Errors speak in one voice" — this one speaks in none), with State #3's amendment language in spirit (a refusal is spoken, not silent — the dead-click pattern that amendment retired).
**Charter conviction dimmed:** ¶2/¶7 — silent nothing on a first click is fog exactly where trust is formed.

**Evidence.** The catch logs to console only; no error state exists in the component for this path, and both rows route through the same handler, so both fail identically. The walk observed the click as a fully silent no-op under the stub and correctly withheld it as a stub artifact — the finding is the code-real absence of any failure voice, which would swallow a genuine live failure the same way. (Whether live failure is likely remains a needs-live item; the silence does not.)

**Verdict:** CONFIRMED.

#### L4. A stray Enter — caught window-wide — dismisses and permanently consumes a first-visit threshold screen

**Surface:** the sermon-start landing (`.ssl-overlay`) and the Study→Anchor handoff (`.sah-overlay`).
**File/line:** [SermonStartLanding.jsx:27](src/components/SermonStartLanding.jsx:27)-33; [StudyAnchorHandoff.jsx:48](src/components/StudyAnchorHandoff.jsx:48)-54; [SermonWorkspace.jsx:471](src/components/SermonWorkspace.jsx:471)-474, 853-874.

**What the first-time pastor experiences.** One reflexive Enter and the "read it once more" moment is gone before he saw a word of it — the handoff never offers itself again, and the way to re-read it (the map's Read-again door) was explained on the start landing, the other screen that can vanish the same way.

**CORE clause strained:** Process #3 (thresholds "surface as discrete landing screens the pastor reads and dismisses") — strained, not breached: "dismissal ends the interruption, never the access" still holds through the map's re-read doors.
**Charter conviction dimmed:** ¶6 — the real thresholds "marked as moments worth stopping for."

**Evidence.** Both overlays install window-level keydown listeners that treat Enter (and Escape) as Begin/Close regardless of focus; on first visit both routes persist `thresholds_seen`. The handoff auto-summons the instant the boundary is crossed, so a pastor advancing with Enter on the focused "Next →" control is one key-repeat from consuming the walk's heaviest threshold unread — the walk tested Enter on the at-handoff fixture: closed *and* consumed. Contrast: SermonFinish listens for Escape only and is never consumable. Keyboard-dismissal semantics were never ruled (T9 ruled only that jumps don't consume).

**Verdict:** CONFIRMED.

#### L5. The two strict-semantic N/A grants (MPS gospel-check, door redemptive note) read as generic skip permissions at the marking site

**Surface:** the "not applicable" toggle under the Anchor MPS gospel-check question and the doors' redemptive-note question.
**File/line:** [sadiAnchorFields.js:74](src/utils/sadiAnchorFields.js:74)-81; [sermonManuscriptFields.js:70](src/utils/sermonManuscriptFields.js:70)-82; [studyAdvancement.js:241](src/utils/studyAdvancement.js:241)-244; [SermonWritingSurface.jsx:60](src/components/SermonWritingSurface.jsx:60)-73.

**What the first-time pastor experiences.** Under Saturday pressure, the bare "not applicable" beneath the moralism check reads as "this check is optional for my sermon," not the ruled meaning of "I already satisfied this upstream." One toggle label carries two ruled meanings across the walk — "the text genuinely doesn't carry this" on the Study grants, where it self-explains, and "satisfied another way" on these two — and nothing on either screen distinguishes them at exactly the two anti-vagueness checkpoints where the narrower meaning governs.

**CORE clause strained:** the Principle (Clarity through Constraint) — argued from the Principle since CORE contains no N/A clause; an N/A that reads as a skip lets vagueness through at the checkpoints built to stop it.
**Charter conviction dimmed:** ¶4 "Clarity is forced, not found."

**Evidence.** The strict "satisfied another way" semantic lives only in code comments; the sole pastor-facing articulation is the Finish reason ("…or mark it not applicable if checked upstream") — rendered only after he leaves it incomplete — and the redemptive note's strict meaning is spoken nowhere on-screen. The audit charter explicitly commissions this exact question ("audit the *feel*, not the policy"), and the finding contests neither the grant list nor the ruled semantics; no wall is proposed.

**Verdict:** CONFIRMED.

#### L6. *(judgment call — Charter-only)* A persisted pane collapse silently invalidates the forge prompts' pane coordinates

**Surface:** the reference pane's collapsed state × the Anchor forge prompts and the Implications marinate send-off.
**File/line:** [ReferencePane.jsx:44](src/components/ReferencePane.jsx:44)-54, 267-280; [sadiAnchorFields.js:46](src/utils/sadiAnchorFields.js:46), :71, :76; [studyFields.js:470](src/utils/studyFields.js:470).

**What the first-time pastor experiences.** If he once minimizes the Bible pane — say, for writing room on a small laptop — it stays minimized for every region of every sermon from then on, and weeks later the forge prompts still direct him to a pane and a tab that aren't on screen ("With the passage open beside you…", "Your MPT is in the reference pane on the 'Your work' tab"). The labeled "Open Bible" tab is his way back, but nothing at the forge points him to it.

**CORE clause strained:** none cleanly — the saturation amendment binds the pane's *default* and forbids *unbidden flips*, and both hold; the collapse is user-bidden and contemplated by the 2026-06-10 ruling. This is also not a copy-quality claim against the SADI-ratified prompts — the wording is ratified; the gap is the persisted-state interaction that makes ratified coordinates point off-screen.
**Charter conviction dimmed:** ¶3 — "the passage sits open by default wherever he works" dims to a collapsed tab that ratified prompts keep describing as open.

**Evidence.** Collapse persists in a single global localStorage key with the user toggle as the only write path (grep confirms no auto-reopen anywhere; the region-change reset touches the tab mode only); collapsed render is the single "Open Bible" tab. The prompts are load-bearing navigation, not decoration.

**Verdict:** CONFIRMED (as a judgment call — ranked below clause-cited findings).

#### L7. *(judgment call — Charter-only)* The map never labels its stage tier — Study, Assembly, and Manuscript appear nowhere in the list, only unlabeled gaps

**Surface:** the sermon map list.
**File/line:** [SermonMap.jsx:190](src/components/SermonMap.jsx:190)-193.

**What the first-time pastor experiences.** Opening the map he sees all eight region names in one column separated by blank gaps — nothing on the map itself says "Study," "Assembly," or "Manuscript," so nothing tells him Anchor is a deciding step or Body a writing step unless he remembers the start screen (which one accidental Enter can dismiss). Every other surface pairs the names ("Assembly · Anchor"); the map, the one surface showing the whole walk, drops the pairing.

**CORE clause strained:** none cleanly — Surface #4 requires only "an on-demand map"; the nearest law is the Project Identity low-software-confidence constraint (labeled beats minimal) and State #2's stage-plus-sub-phase position vocabulary.
**Charter conviction dimmed:** ¶6 — "The whole road is visible from the first day" (visible, but its three acts unnamed on the surface that shows it whole).

**Evidence.** Stage transitions render as an empty `aria-hidden` hairline div — no stage text exists anywhere in the list; the here-line carries the stage for the current position only. The walk recorded eight regions with counts and no stage headers. No OEM ruling touches map stage labeling.

**Verdict:** CONFIRMED (as a judgment call — ranked below clause-cited findings).

---

## 2 · What holds up

The audit is bound to record contracts working as designed. These were verified in code at HEAD and, where the stub allowed, in the rendered walk — and the list is long, which is itself the headline: the OEM collapse shipped without breaking the walk's spine.

**The text stays present.** The reference pane defaults to Passage in every one of the eight regions, post-collapse Manuscript regions included (`defaultMode = "passage"` unconditionally), and the walk confirmed the Passage tab active on landing in all 8 regions and after every kind of jump. The tab state has exactly three write paths — the initial default, the region-cross reset, and user clicks — and the single unbidden write moves *toward* the passage, never away. The OEM additions (Pastoral Context, CCS guard, assembled body) joined the existing "Your work" tab's per-region contents rather than displacing the Passage default. The return-to-the-text beat lands in all three parts on the success path: the Implications send-off, the handoff carrying the full ESV text with the Crossway line, and the MPT draft prompt. Pastoral Context is truly absent as a surfaced field before Implications (Process #4). And the pane's own Passage tab is honest when the ESV fails — the one shared RECOVERY voice with labeled retry and key actions (the handoff, finding M1, is the sole passage surface outside that voice).

**Clarity is forced without a single wall.** One field at a time, its questions stacked in walk order with individually persisted answers that stay visible in place, and the cumulative tables carry the prior phase's work read-only beside each new cell. The seven named outcomes render as canonically named artifacts everywhere they matter — handoff cards, per-region pane substrate with "not yet written" and "go write it," the Finish ledger. The handoff is honest to the sentence: it names exactly which outcomes are missing, and its "Left behind in Study" list enumerates every unfinished question with a jump while correctly honoring per-question and per-cell N/A. Completeness informs and never blocks, verified end to end: the forward chevron is never disabled (at walk end it becomes the summoned "Finish sermon →" — `setFinishOpen(true)` exists at exactly one site, and `finishOpen` is deliberately never persisted, so the Finish screen is re-openable forever); `deriveSermonCompleteness` is consumed only by the Finish screen; no percentage or score renders anywhere. The three unmet-state doors are doors, not walls — honest copy that promises the return, and a labeled "↩ Return to…" banner that completes the round trip (the walk tested it). The map's completeness is truthful at the question grain, with a plain-word legend, and N/A shows as "answered · (not applicable)." The N/A affordance at the marking site is an honest gesture, not destruction: typed words stay visible, dimmed, under "not applicable · undo — your words are kept," and the rendered grant map matches the canon set exactly. The beholding moment turns and never measures — CCS and MPS rendered read-only under the question, no input, nothing to check off, no score.

**The work is safe — in the pipeline.** Mutation #3 holds: every write funnels through `persistMutation`, and the topbar renders Saving… / Saved (with a last-saved tooltip) / Save failed with a Retry wired straight back to the save. The flush chain is intact end to end: the 800 ms debounce is flushed on unmount and registered with the closeFlush registry for window close, quit, and reload, and `beforePositionChange` flushes before every navigation. The App mounts the workspace with `key={openSermonId}`, so a pending debounce can never write one sermon's state over another. Mutation #1 holds — no system authorship of sermon prose anywhere; the only system-shaped writes are keystroke-triggered mirrors and derivations of the pastor's own words (the destructive edge of one derivation is finding H2). Mutation #5's one voice holds everywhere except the two gaps found (M1, L3): zero raw `alert()` calls in src, one error vocabulary via `mapError`, plain-English export failures. Whole-sermon deletion is structurally soft (tombstone + restore), behind the canonical two-step DeleteButton, with a visible "Deleted · Undo" stub on the list surfaces — the workspace-path gap is finding M3. The export honors the N/A sidecar (an N/A'd redemptive note keeps the pastor's words on screen but never prints — the ruled designed state), and the sample's default door is the preserving one.

**No walls, no narration.** No disabled forward controls anywhere in the walk (the code comment at the chevron site names the retired disabled-chevron pattern "the audit's worst dead end"); the disabled controls that do exist are genuine impossibilities (reorder at list ends, series nav at series edges, Export while exporting), not enforcement. Zero toast/celebration vocabulary in src, a standing Process #3 tripwire test, and a place line that states *where* only. Threshold re-readability holds end to end: standing "Read again" doors on the map header, view-only re-reads that never touch `thresholds_seen`, and handoff jumps that deliberately do not consume the threshold. The nameless-creation refusal speaks instead of the button dying, exactly as State #3's amendment demands.

**Never lost.** One vocabulary genuinely holds across every surface checked — `REGION_DISPLAY` = contract labels = map = place line = start-landing arc = handoff = pane = Finish ledger. The "Stage · Region" place line is present and truthful in all eight regions including both post-collapse Manuscript regions. MPT, MPS, and CCS are expanded at first on-screen meeting ("MPT — Main Point of the Text") and re-expanded in the pane. The dashboard answers State #6 as the workspace's front door — in-flight sermons with overdue flagging and an honest empty state. Every in-walk movement control is a worded button ("← Back" / "Next →" / "Finish sermon →" / "☰ Map"); even the defensive no-field fallback speaks humanely and names its escape. SermonFinish's "Preached" note names a real labeled sidebar destination.

---

## 3 · Left open — needs live confirmation

Neither the preview (database stub) nor code reading could settle these; none is a finding. A short live walk on a real build would close them.

- The handoff's ESV **success** render (the missing failure branch is code-confirmed regardless), and which key-state the main process actually reports at the handoff on a no-key first run.
- The lived save strip — Saving… / Saved / Save failed + Retry — and a real failed-save retry round trip (the fixture skips writes).
- The Electron close/quit/reload flush paths (main-process behavior; not exercisable in the Vite preview).
- The post-delete-from-workspace landing (code shows no reachable Undo; live walk should confirm nothing appears).
- Sample sermon open/fresh on a live build — both the success landing (T10 shape) and whether `loadSampleSermon` can realistically fail on a healthy install (its silent catch is code-real either way).
- The workspace exit's live behavior (`closeWorkspace` → dashboard; the fixture never wires `onClose`).
- The populated Body and Transitions editors with a real outline (fixtures had no outline; carried-forward headers verified in code only), and the cumulative tables' feel at real-prep scale (15–20 thought units — the code's own WATCH note flags this as observable only in lived prep).
- Whether "Mark as preached" has a spoken way back once clicked (the Finish screen replaces the button with a static note; any reversal lives outside the workspace and neither surface points to it).
- The in-series topbar breadcrumb ("series title · Sermon N of M · ‹ ›") rendered live, and the "From a series" tab with a populated planner list.

---

## 4 · Doc-drift appendix

Doc lag, kept separate from UX findings per the audit's authority rules. Scope: only drift still present at HEAD and post-dating the 2026-07-01 sweep (all 98 of that sweep's findings were applied in `e60a7f0`/`887d29e`/`1d49335`; its adjudicated-clean list is not re-reported). Every item below was verified against the file at HEAD with the stale text quoted. RULES.md was checked and carries no collapse drift.

**docs/SYSTEMS/sermon-workspace.md** (the known-remaining infra-doc pass owns most of these):

1. **(High)** Lines 178–179 say the wider Study-question and per-cell N/A is "not yet built," and lines 164–165 say the envelope `naAllowed` grant is only `mps.gospel_check` — both contradict the build that shipped 2026-07-02 (`be83a50`), whose lockstep amendments covered canon and ENFORCEMENT_STATUS but not this file.
2. **(High)** Lines 525–526 still call Outline "DRAFT pedagogy… not yet preacher-walked"; the OEM walk ratified it as-is, zero edits (canon §3.2; CORE Process #6). Companion at lines 192–193: the gap-position-fallback paragraph repeats "draft pedagogy" and the retired Equip region name.
3. **(Medium)** Lines 246–247 describe the sermon-start overlay arc as "Study sub-phases + Assembly sub-phases," omitting Manuscript. The rendered overlay was cross-checked and is correct (it derives from `walkOrder.arcSummary()`, which emits every stage) — doc-only drift, not a UX finding.
4. **(Low)** Lines 36–40: the 2026-05-10 provenance banner's live-reader instruction routes former Equip/Frame content to Assembly — two generations stale post-collapse (not covered by the sweep's banner adjudication, which handled the frozen initiative docs).
5. **(Low)** Lines 406–407: the "Step layer retired" subsection hands a reader the pre-collapse Assembly shape (Anchor / Outline / Equip / Frame) with no "(since moved)" pointer, at the head of a live section.
6. **(Low)** Lines 224–227: the map state-derivation dispatch enumeration omits the four native-column kinds the code now dispatches on (outline-builder, functional-elements, and the manuscript door kinds in `deriveQuestionStatesFromSermon`).

**docs/WORKSPACE-CANON.md** (internal stalenesses inside an otherwise-amended doc):

7. Two "scheduled build" phrasings about the door redemptive-note persistence (lines 161–163 and 380–382) contradict canon's own §7, which records the sidecar as shipped 2026-07-02.
8. Line 229: the CCS-row Merida annotation says "the tag stays until the code build ships" — the build shipped; canon §7 item 3 already queues this as trivial cleanup (self-acknowledged).
9. Line 302: the §4.1 table presents "Equip" as the field's display name; the canonical display name is Body (label retired at OEM ruling R15; the `equip` storage key itself is adjudicated-deliberate and not flagged).

**Code-comment drift** (comments contradicting the code or the 2026-07-02 shape; two of these double as evidence for findings M4/M7):

10. [studyAdvancement.js:24](src/utils/studyAdvancement.js:24)-31 — the file header says "eight composite gates" and "consumes all eight"; six survive (the same file's retirement note lower down is correct). Surfaced independently by three lenses; recorded once.
11. [SermonWorkspace.jsx:373](src/components/SermonWorkspace.jsx:373)-378 — the N/A-guard comment says the envelope grant is "exactly mps.gospel_check" and the broader grants "await their scheduled code build"; the guard itself is generic and the build shipped. Same staleness in the PromptBlock header at [SermonWritingSurface.jsx:40](src/components/SermonWritingSurface.jsx:40)-43.
12. [walkOrder.js:155](src/utils/walkOrder.js:155)-157 — claims the Implications → Anchor boundary returns null so the handoff alone carries the shift; `FRAME_OVERRIDES` now renders "Anchor opens, against your Study work." at that boundary.
13. [SermonWorkspace.jsx:260](src/components/SermonWorkspace.jsx:260)-261 and :672-673 — comments promise a topbar sermon title that the render dropped on 2026-06-27 (evidence for finding M7).
14. [NewSermonModal.jsx:20](src/components/NewSermonModal.jsx:20)-22 — header comment promises a standalone sermon is "titled later in the workspace"; no titling affordance exists (evidence for finding M4).
15. [sermonWritingSurface.css:501](src/components/sermonWritingSurface.css:501) — section comment still says "Equip / functional elements (Assembly/Equip)" for what is now Manuscript · Body; companion retired-name usage at [SermonWritingSurface.jsx:13](src/components/SermonWritingSurface.jsx:13)-14.

---

*Method note: 44 agents across two orchestrated runs (4 ground-truth readers, 1 preview walker, 5 lens auditors, 1 dedup editor, 32 adversarial verifiers, 1 doc-drift verifier). Findings await the pastor's per-item approval; no fix scopes are proposed in this document by design.*
