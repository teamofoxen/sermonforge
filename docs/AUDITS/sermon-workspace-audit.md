# SermonForge Sermon Workspace Audit

I audited the supplied SermonForge sermon workspace bundle as a code/document review. I did not run the app. I read `README.md` first, then `docs/CORE.md` in full, then followed the hierarchy and reading order described in the README. I treated `docs/CORE.md` as the sole normative authority, used `docs/PASTORS-CHARTER.md` only as an experiential lens, and separated document drift from UX findings where documents disagree.

This audit follows the requested walk: sermon creation → Study — Observe, Interpret, Redemptive Thread, Implications → Study/Anchor handoff → Assembly — Anchor, Outline → Manuscript — Body, then Introduction, Transitions, Conclusion → Finish.

Two bundle-completeness gaps remain. `SermonWorkspace.jsx` imports `../core/spine` at `src/components/SermonWorkspace.jsx:1-9`, but no `src/core/spine` file is present in the bundle. `PassageLookup.jsx` and `passageRef.js` reference `../data/canonicalBooks`, but no `src/data/canonicalBooks.js` file is present. These are not UX findings by themselves, but they mean rendered behavior still needs live confirmation.

## Findings

### 1. The workspace promises “one question at a time,” but multi-question fields render several prompts at once.

Lens: Clarity and Cognitive Load. Severity: High.

The pastor experiences a mismatch between the promise and the work surface. He is told he will move one question at a time, but some screens present several writing prompts together, leaving him to decide which one is the active question.

CORE defines a Question as an ordered prompt the pastor answers “one at a time,” with previous answers visible while the current question is active at `docs/CORE.md:102-108`. The start screen reinforces this promise with “Next — one question at a time” and “one question at a time, in order” at `src/components/SermonStartLanding.jsx:63-84`. The actual walk model says the workspace uses a “field-level walk” where a multi-question field renders “all prompts stacked” at `src/utils/walkOrder.js:7-11`. The writing surface renders every question in the field using `field.questions.map(...)` at `src/components/SermonWritingSurface.jsx:680-690`.

CORE strain: CORE Canonical Vocabulary / Question and Answer contract, `docs/CORE.md:102-108`.

### 2. Observation Set completeness is coded against Obvious Point, not the CORE-canonical Divisions composite.

Lens: Consistency and Usability. Severity: High.

The pastor may see the Observation Set treated as complete when only the Obvious Point exists. That risks giving him a false sense that a load-bearing Study artifact is present, even if the Divisions / Thought Units work has not reached the canonical completeness standard.

CORE says the completeness foundation includes `checkField3Composite` and that `deriveSermonCompleteness` consumes all six composite checks at `docs/CORE.md:173-201`. WORKSPACE-CANON says Observation Set is complete when “the Divisions canvas has ≥1 main sentence with an indented modifier under it” at `docs/WORKSPACE-CANON.md:344-364`. The composite check exists in `src/utils/studyAdvancement.js:100-118`. But `sermonState.js` says `checkField3Composite` is deliberately not used and that Observation Set is joined to a lenient Obvious Point check at `src/utils/sermonState.js:15-24` and `src/utils/sermonState.js:314-340`. The actual artifact check reads `obvious_point` at `src/utils/sermonState.js:367-390`.

CORE strain: Process Contract #2, `docs/CORE.md:173-201`.

### 3. The Introduction redemptive-note N/A label says the opposite of its intended meaning.

Lens: Clarity and Usability. Severity: High.

The pastor sees an N/A control labeled “not applicable — this hook wasn’t redemptive.” That tells him to mark the redemptive note N/A when the hook was not redemptive, even though the field rule says the control is only for cases where the hook itself already carried the redemptive turn.

WORKSPACE-CANON says N/A means “the text genuinely doesn’t carry this” or “satisfied another way,” and specifically keeps `introduction.redemptive_note` under the stricter “satisfied another way” semantic at `docs/WORKSPACE-CANON.md:380-397`. The source comment says, “N/A is strict here: only when the hook itself was redemptive” at `src/utils/sermonManuscriptFields.js:76-80`. The visible label says `not applicable — this hook wasn't redemptive` at `src/utils/sermonManuscriptFields.js:81-87`.

CORE strain: Process Contract #2, because completeness must truthfully report load-bearing artifacts, `docs/CORE.md:173-201`; also Mutation Contract #4 because N/A toggles sit inside the field-clearing / destruction-friction area, `docs/CORE.md:294-303`.

### 4. A load failure can look like the sermon disappeared.

Lens: Usability. Severity: High.

If loading throws, the pastor may see “Sermon not found.” That sounds like his sermon is gone, not like the app had a recoverable loading problem.

The load catch logs `SermonWorkspace load error` and clears loading at `src/components/SermonWorkspace.jsx:190-201`. If no sermon object is present, the visible state is “Sermon not found.” with a Back button at `src/components/SermonWorkspace.jsx:600-608`.

CORE strain: Mutation Contract #5 requires plainly voiced, retryable errors at `docs/CORE.md:304-306`; Mutation Contract #3 requires the pastor to be able to answer whether his work is safe at `docs/CORE.md:291-293`.

### 5. Sermon name correction is absent from the sermon workspace.

Lens: Clarity and Usability. Severity: Medium.

Inside the sermon workspace, the pastor can see passage and series position, but not the sermon name. If he notices the sermon name is wrong, the workspace gives him no visible way to correct it.

CORE says a sermon name is required at creation and “correctable afterward” at `docs/CORE.md:143-148`. The workspace comments say “There is no sermon title anywhere in this surface” at `src/components/SermonWorkspace.jsx:262-267`, repeat that title editing is not present at `src/components/SermonWorkspace.jsx:643-649`, and say title editing “must not be reintroduced” at `src/components/SermonWorkspace.jsx:703-710`.

CORE strain: State Contract #3, `docs/CORE.md:143-148`.

### 6. FieldTeaching auto-opens as a teaching layer outside the three CORE threshold screens.

Lens: Flow and Cognitive Load. Severity: Medium.

When the pastor enters a field, an “About this field” panel can automatically open before he writes. The content may be helpful, but the behavior feels like an extra mini-threshold during ordinary movement.

CORE names exactly three major transition screens: sermon start, Study → Anchor handoff, and sermon completion at `docs/CORE.md:202-220`. `FieldTeaching.jsx` auto-opens on first visit at `src/components/FieldTeaching.jsx:9-22` and renders “About this field” teaching copy at `src/components/FieldTeaching.jsx:33-59`. `SermonWorkspace.jsx` computes first-visit teaching state at `src/components/SermonWorkspace.jsx:311-342` and `src/components/SermonWorkspace.jsx:617-624`. The writing surface renders the teaching panel at `src/components/SermonWritingSurface.jsx:671-678`.

CORE strain: Process Contract #3, `docs/CORE.md:202-220`.

### 7. Old “equip” vocabulary is still pastor-facing in Body.

Lens: Consistency and Clarity. Severity: Medium.

In Manuscript Body, the pastor can see an empty state saying the points will be “ready to equip.” That reintroduces retired vocabulary exactly where the current experience is supposed to say Body.

CORE says Equip moved into Manuscript as Body, and Frame collapsed into the Manuscript door fields at `docs/CORE.md:86-92`. The Body empty state still says “the points will be ready to equip when you come back” at `src/components/SermonWritingSurface.jsx:292-300`.

CORE strain: State Contract #5 and Surface Contract #1, `docs/CORE.md:153-156` and `docs/CORE.md:310-311`.

### 8. The Main Point of the Text prompt blurs “read the passage” with “open Your work.”

Lens: Flow and Clarity. Severity: Medium.

At the Main Point of the Text step, the pastor is told to read the passage again, but the parenthetical points him toward the “Your work” tab. That weakens the intended grounding beat: the text should be first, with notes one flip away.

CORE says the reference pane keeps the passage present by default, “Your work” is one tab-flip away, and the Study → Anchor seam includes a return-to-the-text beat at `docs/CORE.md:261-279`. The MPT prompt says, “Read the passage through once more (open the reference pane's ‘Your work’ tab if it's collapsed)” at `src/utils/sadiAnchorFields.js:37-53`. The reference pane’s collapsed control is “Open Bible,” and its tabs are “Passage” and “Your work” at `src/components/ReferencePane.jsx:242-255` and `src/components/ReferencePane.jsx:353-385`.

CORE strain: Process Contract #6 saturation amendment, `docs/CORE.md:261-279`.

### 9. Body can become the heaviest screen in the workspace.

Lens: Cognitive Load. Severity: Medium.

Once the pastor has several outline points, Body shows every point and all four writing cells for each point in one long repeated surface. The Application hint carries several pastoral tasks and repeats under each point.

The Body surface renders all outline points and all element cells together at `src/components/SermonWritingSurface.jsx:315-339`. The Body field has four elements per point — Scripture, Explanation, Application, Illustration — at `src/utils/sermonEquipFields.js:47-73`. The Application hint is especially dense at `src/utils/sermonEquipFields.js:59-62`. The canvas/table comments acknowledge that real sermons can create long or noisy prep surfaces at `src/components/SermonWritingSurface.jsx:105-108`.

CORE clause: Judgment call — Charter/lens only. CORE requires the Body cells and prior work to be visible; it does not set a maximum visible density.

### 10. The Study → Anchor handoff can become a dense review report.

Lens: Cognitive Load and Flow. Severity: Medium.

At the seam into Anchor, the pastor may see the passage, all four Study outcomes, missing-outcome doors, and a list of unfinished Study questions. If much Study work is unfinished, the threshold can feel like a report to process rather than a clean grounding moment.

The handoff renders the passage at `src/components/StudyAnchorHandoff.jsx:74-108`, the Study outcomes at `src/components/StudyAnchorHandoff.jsx:110-141`, and every unfinished Study question at `src/components/StudyAnchorHandoff.jsx:143-171`.

CORE clause: Judgment call — Charter/lens only. CORE explicitly allows the handoff and says completeness is visible there at `docs/CORE.md:195-199` and `docs/CORE.md:202-220`; the concern is density, not the existence of the handoff.

### 11. Map status vocabulary drifts from canon vocabulary.

Lens: Consistency. Severity: Low.

The map legend says “answered · started · not yet,” while the canon names the states as answered / partial / unanswered. The meaning is understandable, but it still creates two names for the same middle and empty states.

WORKSPACE-CANON names the map states “answered / partial / unanswered” at `docs/WORKSPACE-CANON.md:136-140`. `SermonMap.jsx` renders “answered · started · not yet” at `src/components/SermonMap.jsx:151-165`.

CORE strain: State Contract #5 and Surface Contract #1, `docs/CORE.md:153-156` and `docs/CORE.md:310-311`.

### 12. The defensive missing-field fallback exposes internal tokens.

Lens: Clarity and Usability. Severity: Low.

If the pastor lands on a missing or future field, he sees raw stage, sub-phase, and field keys in parentheses. For a low-confidence user, that reads like internal software state rather than plain guidance.

The fallback prints `({String(stage)} · {String(subPhase)} · {String(fieldKey)})` at `src/components/SermonWritingSurface.jsx:498-516`.

CORE strain: Surface Contract #4, because “You are here” must be answerable in user-facing terms, `docs/CORE.md:317-321`; also Mutation Contract #5 plain error voice, `docs/CORE.md:304-306`.

## Document drift

WORKSPACE-CANON says “code wins any conflict” at `docs/WORKSPACE-CANON.md:1-10` and again at `docs/WORKSPACE-CANON.md:90-91`. That conflicts with the README and CORE authority hierarchy. Under the governing rules for this audit, CORE controls.

The systems doc still contains old Assembly language with Equip and Frame at `docs/SYSTEMS/sermon-workspace.md:34-41`, even though CORE says Assembly is Anchor and Outline, while Manuscript contains Body and the Intro / Transitions / Conclusion doors.

The systems doc says there are “Two threshold overlays” at `docs/SYSTEMS/sermon-workspace.md:237-265`. CORE says there are three threshold screens: sermon start, Study → Anchor handoff, and sermon completion at `docs/CORE.md:202-220`.

The schema reference still says `current_sub_phase` spans Assembly sub-phases Anchor / Outline / Equip / Frame and that `last_assembly_subphase` is one of Anchor / Outline / Equip / Frame at `docs/REFERENCE/schema.md:108-120`. CORE’s current vocabulary supersedes that.

The Body field source still carries an internal “DRAFT PEDAGOGY / not preacher-walked” comment at `src/utils/sermonEquipFields.js:6-8`, while WORKSPACE-CANON says the current walk is OEM-walked and ratified. This is not pastor-facing copy, but it is maintenance drift.

## What holds up

The no-blocking completion model is visible at Finish. The Finish screen reports missing artifacts with “go write it” jumps and does not block Export, Mark as preached, Close, or navigation at `src/components/SermonFinish.jsx:80-132`.

The reference pane strongly supports the passage-first design. It resets to Passage on region change at `src/components/ReferencePane.jsx:217-234`, keeps “Passage” and “Your work” as explicit tabs at `src/components/ReferencePane.jsx:353-385`, and uses “Open Bible” when collapsed at `src/components/ReferencePane.jsx:242-255`.

The Study → Anchor threshold carries the passage back onto the seam. It asks the pastor to read once more and renders the passage before the Study outcomes at `src/components/StudyAnchorHandoff.jsx:74-108`.

Save visibility is present. The topbar shows Saving, Save failed with Retry, and Saved at `src/components/SermonWorkspace.jsx:771-787`.

N/A preserves typed words instead of wiping them. The prompt-level N/A toggle says “undo — your words are kept” and disables rather than clears the textarea at `src/components/SermonWritingSurface.jsx:59-87`. Per-cell N/A follows the same pattern at `src/components/SermonWritingSurface.jsx:203-216`.

Destruction friction is present in the supplied components. Outline point deletion goes through `DeleteButton` at `src/components/SermonWritingSurface.jsx:263-269`, and the primitive uses an inline two-step confirm at `src/components/primitives/DeleteButton.jsx:1-90`. The Divisions canvas also pauses row-destroying gestures with an inline risk banner at `src/components/PassageCanvas.jsx:78-94`.

Whole-sermon undo still needs live confirmation because the dashboard / undo surface is outside this bundle.
