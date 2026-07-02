# OEM Walk Packet — 2026-07-01

**What this is.** The working document for the Outline / Equip / Manuscript content walk — the walk the canon has been deferring decisions to since Phase 2. You will read every prompt and teaching paragraph these three stages put in front of a preacher, judge each one field by field (ratify, reword, or restructure), and then make the deferred rulings collected in the decision agenda at the end.

**Status of what you're walking.** All three stages carry DRAFT pedagogy: drafted in one sitting on 2026-06-09 (commit `059bfce`) from Merida's *Christ-Centered Exposition* material, during launch hardening. Merida-grounded, but never preacher-walked. Every other region of the walk (Study, Anchor, Frame) got a ratification walk; these three never did.

**Ground truth.** Everything below was verified against the code at HEAD by adversarial passes on 2026-07-01. Every string quoted as RENDERS was confirmed live on screen. No authored string in these three stages is hidden.

---

## Part 1 — Findings to know (or fix) before and during the walk

Most important first. File paths are allowed in this section only.

### 1. The good news, first: everything you're about to review is actually on screen.

The 2026-06-09 suspicion that the overview teaching blocks "render nowhere" is stale at HEAD. Every authored string in all three stages — labels, hints, overview titles, all 14 overview paragraphs, all 9 question prompts — renders. The teaching blocks are mounted by `FieldTeaching.jsx` (via `SermonWritingSurface.jsx:582-589`): they auto-open the first time you visit a field in each sermon, then collapse behind an "About this field" toggle that stays available forever. **Zero authored strings are never-shown.** So this walk is reviewing live copy, not dead copy — every word you ratify or reword is a word your users see.

### 2. Equip's teaching contradicts its own arithmetic. (Rule on this during the walk.)

The Equip prompt says, in so many words: *"Not every point needs all four in equal measure."* But the sermon map only marks the Equip question "answered" when **every** outline point has **all four** cells filled (`sermonState.js:162-186` — answered requires points × 4 filled cells), and there is no N/A escape for an equip cell (the N/A toggle exists only on ordinary question blocks, not this editor). A pastor who follows the pedagogy — say, skipping an illustration on one point — sits at "started" forever on the map. Either the teaching or the math has to move. This feeds directly into agenda item 7 (the lenient checks) — note that the Finish screen's *artifact* check is separately lenient (one element anywhere counts), so the contradiction lives specifically in the map's per-question state.

### 3. The Word export strips Equip's labels. (Know this while judging Equip's shape.)

In the exported manuscript, each outline point becomes a bold "Point N." heading; the Scripture cell prints beneath it in italic gray; but Explanation, Application, and Illustration print as **plain, unlabeled prose paragraphs**, in that order (`electron/main.js:3450-3458`). On screen the four elements are strongly labeled; on paper a filled illustration is indistinguishable from application prose. If the four-cell structure is doing pedagogical work, decide whether that work should survive into the printed page — or whether unlabeled flowing prose is exactly right for a preaching manuscript.

### 4. The Manuscript "done" check ignores Transitions entirely.

The Finish screen counts the Manuscript artifact as written when there is at least one Introduction answer AND the Conclusion response (`sermonState.js:320-328`). Transitions are never consulted — a sermon with zero transitions still reads "written." Deliberate leniency, but worth an explicit yes/no while ruling on agenda item 7.

### 5. If you reword the drafts, some of what you see on screen will not move with them.

A meaningful slice of pastor-facing copy in these stages is hardcoded in components, not in the field-definition files the walk will edit. If the walk rewords a field, these strings need separate edits or they drift:

- Outline builder chrome (`SermonWritingSurface.jsx:179-199`): the per-point placeholder *"What does this movement of the text say to us?"*, the buttons *"↑ up"*, *"↓ down"*, *"remove"*, *"+ Add point"*.
- Equip's no-outline door (`SermonWritingSurface.jsx:217-229`): *"Each section here is one of your outline points — but you haven't built the outline yet. Start there, and the points will be ready to equip when you come back."* + *"Build the outline →"*; per-point headers *"Point N"* / *"(untitled point)"* (`:242-243`).
- Transitions chrome (`SermonWritingSurface.jsx:274-315`): the no-outline message, its door, and the row labels *"Into Point N — …"* / *"Into the Conclusion"*.
- The teaching-block toggle *"About this field"* (`FieldTeaching.jsx:46`) — the only door back to the overview paragraphs after first visit.
- Finish-screen artifact reasons (`sermonState.js:305, 315, 318, 328`) and the reference-pane outline copy (`ReferencePane.jsx:99-115`).

During the walk, when you reword something, note whether the reword touches component copy too.

### 6. One inventory claim was inverted — the region frame lines are permanent, not first-visit.

Lines like *"Manuscript opens, against the Sermon Frame."* render on **every** visit to a region's first field, as standing chrome (`SermonWritingSurface.jsx:577-580`) — they are not one-time welcomes. Judge their wording accordingly: you will read them hundreds of times.

### 7. Renaming "Sermon Outline" or "Sermon Body" travels further than the walk screens.

Those two names (agenda item 5) also appear: in the region frame lines ("Equip opens, against the Sermon Outline." / "Frame opens, against the Sermon Body."), on the sermon-start landing's arc summary, on the Finish screen's artifact review, in the reference pane's outline header, and in the search-result eyebrow *"EQUIP · SERMON BODY"* (`SearchResultSnippet.jsx:26`). A rename is a multi-surface edit; the sources are `walkOrder.js:164-165` plus the hardcoded search eyebrow.

### 8. Housekeeping (not walk-blocking, fix any time).

- `heavyLifting: true` is declared across six field-def files (including `sermonOutlineFields.js:27`, `sermonEquipFields.js:27`, `sermonManuscriptFields.js:33/90`) and consumed by **nothing**. Dead metadata — wire it or drop it.
- `assembleManuscriptText` (`src/utils.js:185`) has zero call sites; its consumers were the removed AI features. Dead code — its "POINT N:" text never reaches anyone.
- `FieldTeaching.jsx:6` still describes the overview blocks as "dead data" in its header comment while being the very component that renders them. Stale comment.

---

## Part 2 — The stages, in walk order

Each stage section: how the stage opens, then each field — its label, the Merida tag the canon gives it, every authored string verbatim (all marked RENDERS; nothing here is hidden), what it feeds in the Word export, and drift notes.

---

## Stage 1 of 3 — Outline

**Where it sits.** Sixth region of the walk, right after the Main Point Pair is set in Anchor. One field. Its named outcome is **"Sermon Outline"** — a provisional, first-draft name (see agenda item 5).

**How it opens.** The place line reads **"Assembly · Outline."** Beneath it, the standing frame line: **"Outline opens, against the Main Point Pair."** The map shows this stage as one row; it reads "answered" only when *every* point has text — one blank point among five shows "started."

### Field: Outline

**Canon tag:** §3.2 outline.points — **[M, free list]**. Straight Merida: lay out the body's movements, one per movement of the text, each a sentence your people would use, building to a climax, echoing the MPS. Carries Merida's three traps in its teaching.

**What you see on screen — all RENDERS:**

- **Label:** "Outline" *(field header; also the map's group header and you-are-here line)*
- **Hint:** "Lay out the body's points — the movements your sermon walks through. Each reflects the text and carries the MPS forward."
- **Teaching block** *(auto-opens first visit; "About this field" toggle after)* — title "Outline", then:
  1. "Your Main Point Pair is set — the MPT (what the text meant) and the MPS (what it asks of your people today). The outline is the body that carries the MPS from open to close. It should reflect the structure of the text AND support the one thing you are preaching. Not four sermons — one sermon, in movements."
  2. "Strong points share a few marks: each says something the others don't (mutually exclusive); each is in plain language your people actually use, not an exegetical heading; each is shaped as the text's claim on us, not just a topic (application-shaped); they build toward a climax (progressive); and they echo the MPS so the through-line never disappears."
  3. "Three traps Merida names: a clever outline that draws attention to itself (forced alliteration — 'a little spice is fine, too much makes you sick'); an outline imposed on the text (three points where the text has two); and predictability — the same shape every week. Let the text set the number of points and the shape of the movement."
- **Question prompt:** "Lay out the points your sermon body will move through — one for each movement of the text. Reorder them as the shape settles; the final point should be the one everything has been climbing toward. Write each as a sentence your people would understand, not an exegetical label." *(also appears verbatim as this question's jump button in the map)*
- **Builder chrome** *(lives in the component, not the draft — reword separately, see Finding 5)*: each point's box carries the placeholder "What does this movement of the text say to us?"; buttons "↑ up", "↓ down", "remove", "+ Add point"; points numbered 1, 2, 3…

**What it feeds in the Word export.** Each point becomes a bold **"Point N.  {your point text}"** heading in the manuscript document. That point's transition (from Manuscript/Transitions) prints just above it; its Equip substance prints beneath it. Export runs from three places: the workspace's "Export to Word" button, the Finish screen, and the Completed Sermons list. The file lands in Documents › SermonForge › exports › Manuscripts and opens in Word.

**Worth knowing while you walk it:**

- While you're writing the outline, the side reference pane shows only the MPT and MPS — the outline is not mirrored back to you here. It appears in the pane later, during Equip and Manuscript, as "Sermon Outline" with your points as a numbered list (blank points filtered out) and a "go write it" door if empty.
- The outline's points become the skeleton everything downstream keys off: Equip builds four cells under each point, and Transitions writes one bridge into each point.
- This field has no gate — it is always writable even with no MPT/MPS set. The Finish screen counts the Sermon Outline artifact done with **one point with text** (the lenient check — agenda item 7); its nudge copy reads "Lay out at least one outline point."
- The stage's name and outcome also greet you before you ever arrive: the sermon-start landing lists "Outline" among the regions and "Sermon Outline" among what Assembly produces, and Equip's own frame line names it ("Equip opens, against the Sermon Outline.").

**Drift notes.** No Merida drift flagged for this field's content — the traps, the marks of strong points, and the movements-of-the-text framing are faithful. The open questions here are the name (agenda item 5), the lenient check (item 7), and whatever the field-by-field read surfaces.

---

## Stage 2 of 3 — Equip

**Where it sits.** Seventh region, immediately after Outline. One field. Its named outcome is **"Sermon Body"** — the other provisional name (agenda item 5).

**How it opens.** Place line **"Assembly · Equip."** Standing frame line: **"Equip opens, against the Sermon Outline."** The side reference pane switches here to show MPT + MPS + your outline points — the fullest "your work" view in the walk, since this is where you build under the points. In search results, matches from this stage carry the eyebrow "EQUIP · SERMON BODY."

### Field: Equip

**Canon tags:** §3.3 hierarchy — **[M]** (under each outline point, the four functional elements: Scripture · Explanation · Application · Illustration; every point needs explanation + application; Scripture grounds; illustration serves). §3.3 application — **[M / ⚠]**: Merida's application battery is **thinner here** — missing the idols-of-the-heart probe, the two-brothers address, the necessary/probable/possible authority gradient (taught ambiently back in Study; the full discipline belongs here), and explicit evangelistic address. That ⚠ is the heart of agenda items 2, 3, and 4.

**What you see on screen — all RENDERS:**

- **Label:** "Equip"
- **Hint:** "Give each outline point its substance — the Scripture it rests on, the explanation that makes it clear, the application that makes it land, the illustration that makes it stick."
- **Teaching block** — title "Equip", then:
  1. "The outline is the skeleton; the functional elements are the muscle. Under each point you develop the same moves — Scripture, Explanation, Application, Illustration. This is where the sermon body gets its weight, and where most of your preaching time is actually spent. Work point by point."
  2. "Explanation makes the text clear: the key words, the context your people don't already have, the 'hot verses,' the doctrine that surfaces. Application puts the truth into something to do — aimed at the heart and the affections, not just behavior. Illustration brings light and life; it is a servant of explanation and application, never the star, and never stretched to fit."
  3. "Keep application gospel-shaped, not moralistic. Merida's reframe, after Keller: here is how we must live → but we simply cannot → ah, but there is One who did → now, through faith in him, we can begin. The two middle moves — we cannot, and One did — are what separate transformation from 'try harder.' Let your Christ-Connection Statement guard every point against the moralism drift."
- **Question prompt:** "Build the four elements under each outline point. Not every point needs all four in equal measure — but every point needs explanation and application; Scripture grounds it, and illustration serves it."
- **The four cells, repeated under every outline point** (each point headed "Point N" with your point's text, or "(untitled point)"):
  - **Scripture** — "Which verse(s) of the text does this point rest on? Name where in the passage this lives."
  - **Explanation** — "Make it clear. Key words, the context your people don't already know, the doctrine that surfaces. Make the text plain — don't impress with study."
  - **Application** — "Make it land. What does this ask of us — in the heart, not just the behavior? Keep it gospel-empowered ('One did'), not 'try harder.' Use 'we'/'us'; finish with a sentence that lands."
  - **Illustration** — "Make it stick. A story, image, or example that serves the explanation and application — brief, vivid, fitting, fresh. Don't stretch it; if it doesn't fit naturally, it doesn't fit."
- **If no outline exists yet** *(component copy — see Finding 5)*: "Each section here is one of your outline points — but you haven't built the outline yet. Start there, and the points will be ready to equip when you come back." with the door "Build the outline →". The door is a round-trip: a "↩ Return to Equip" banner waits on the Outline field.

**What it feeds in the Word export.** Under each "Point N." heading: your Scripture cell in italic gray, then Explanation, Application, and Illustration as plain **unlabeled** prose paragraphs in that order. Empty cells are simply omitted. The on-screen labels and every hint vanish in the document (Finding 3).

**Worth knowing while you walk it:**

- **The contradiction from Finding 2 lives here.** The prompt blesses uneven coverage ("not every point needs all four in equal measure"), but the map only reads this question "answered" when all four cells are filled on every point, and there is no N/A for a cell. Following the pedagogy parks you at "started."
- The Finish screen counts the Sermon Body artifact done with **one filled element under any point** (agenda item 7); its nudges read "Build the outline first — the Sermon Body grows under its points." and "Give at least one outline point its substance in Equip."
- **What's missing on purpose, for you to rule on:** Study makes you name your actual room (the prodigal AND the older brother, the Pastoral Context specifics) — none of that is read by anything here. Equip's application cell speaks to a generic "us." There is no idols-of-the-heart probe, no word to the unconverted, and the necessary/probable/possible gradient is taught only back in Study. Agenda items 2, 3, and 4 are the ruling on all of this.

**Drift notes.** What exists is faithful Merida (the four elements, the Keller reframe, illustration-as-servant). The drift is by *absence*, and it was left absent deliberately because this stage is DRAFT and the ruling was reserved for you.

---

## Stage 3 of 3 — Manuscript

**Where it sits.** The terminal stage — after Frame, ending the whole walk. Three fields: Introduction, Transitions, Conclusion. The place line collapses to just **"Manuscript."** On arrival at Introduction, the standing frame line reads **"Manuscript opens, against the Sermon Frame."** — and it is there every visit, not just the first (Finding 6). The reference pane here shows MPT + MPS + Sermon Outline (deliberately not the Study outcomes) and defaults to the ESV passage tab. The stage has its own notebook, labeled "Manuscript notebook."

**Canon structural tag:** §4 — the **Frame → Manuscript split** carries **[⚠]**: Frame decides the Intro/Conclusion moves, Manuscript re-asks them as prose. Whether that two-pass shape is right is agenda item 8 — and it is the one item that could touch CORE's stage model.

**The open design question from the original record:** Manuscript is the most freeform stage — prose, not a per-question walk. Whether its three-field shape (Introduction / Transitions / Conclusion) is even right was called "the open design question" and was never pre-decided. Hold that while walking all three fields.

### Field 1: Introduction

**Canon tag:** §4 manuscript.introduction — **[M / +]**. Re-asks the Frame Intro decisions as prose: the opener written to preach (skippable for a part-two or dense text, per Merida), the bridge into reading the text, the expectation.

**What you see on screen — all RENDERS:**

- **Label:** "Introduction"
- **Hint:** "Write the opening you'll actually preach — bring the listener from where they are into the text, the MPT, and the MPS."
- **Teaching block** — title "Introduction", then:
  1. "The body is built and the Frame's decisions are made. Now you write the words. The introduction is prepared near-last, on purpose: it frames how the listener walks into a body that already exists. Not a summary of the points — the listener's posture as they enter."
  2. "A good introduction incites interest for believer and unbeliever alike, introduces the text with the MPT and MPS, carries a redemptive note (the promise that makes the call good news), and names what the sermon will ask. Open with variety — Merida's own move is to address both: 'If you are a believer, here is why we need this text…'; 'If you are not a Christian, this is a great week to be here because…'."
  3. "You decided your hook, your bridge, and your expectations back in Frame. Here you write them out as the actual opening lines — the opener, how you'll introduce and read the text, and the expectation you set before the body begins."
- **Three question prompts** (each above its own writing box; the boxes carry no placeholder text):
  1. "Write your opener — the actual words. A story, an image, a question, a problem from lived experience: the invitation in. (This is the hook you chose in Frame, written out to preach.) Merida allows skipping the opener for a part-two sermon or a dense text — if so, go straight to the MPT/MPS below."
  2. "Write the bridge from the opener into the passage — how you introduce and read the text, and land the MPT and MPS so the listener knows what this sermon is about."
  3. "Write the expectation — name what this sermon will ask the listener to see, believe, or do by the end, so the body doesn't blindside them. Set the purpose now."

**What it feeds in the Word export.** A bold "Introduction" heading, then your opener, bridge, and expectation as plain paragraphs in that order; anything blank is silently skipped. (The document also opens with your "Main Point of the Text:" and "Main Point of the Sermon:" lead lines above everything.)

**Drift notes.** Notice paragraph 2's evangelistic address ("If you are not a Christian…") — this is the **one place** in all three building stages where a direct word to the unconverted survives. Agenda items 2 and 4 ask whether that's enough.

### Field 2: Transitions

**Canon tag:** §4 manuscript.transitions — **[M]**. One bridge into each point and one into the conclusion; brief, inconspicuous, varied; reiterate the MPS lightly. (The canon deliberately refines this to [M] rather than the [M/+] family — transitions are genuinely new prose, not a Frame re-ask.)

**What you see on screen — all RENDERS:**

- **Label:** "Transitions"
- **Hint:** "Write the bridges between movements — the brief, inconspicuous sentences that carry the listener from one point to the next, and into the conclusion."
- **Teaching block** — title "Transitions", then:
  1. "Transitions are the connective tissue of the body. The listener should never feel a seam — a good transition is inconspicuous, simple, varied, and brief. It gathers what the last point established and opens the door to the next."
  2. "Write one for each point (the bridge into it from what came before) and one into the conclusion. Vary them — don't use the same construction every time. Reiterate the MPS lightly as you go, so the through-line stays audible across the whole body."
- **Question prompt:** "Write the transition into each point, and the transition into the conclusion. Keep each brief — a sentence or two that carries the listener across without a visible seam."
- **Row labels** *(component copy — see Finding 5)*: one writing box per outline point, headed "Into Point N — {your point's words}" (bare "Into Point N" if the point is untitled), plus a final box "Into the Conclusion."
- **If no outline exists** *(component copy)*: "Transitions bridge your outline points — but there's no outline yet. Build it first, then come back to write the bridges between movements." with the same round-trip door "Build the outline →".

**What it feeds in the Word export.** Each transition prints as a centered, italic, gray line immediately **before** its point's heading; the conclusion transition sits just before the "Conclusion" heading. Blank transitions are skipped entirely.

**Worth knowing.** The map reads this field "answered" only when every point's slot *and* the conclusion slot are filled — but the Finish screen's Manuscript check ignores transitions completely (Finding 4). Those two signals can disagree.

### Field 3: Conclusion

**Canon tag:** §4 manuscript.conclusion — **[M / +]**. The summation (fresh words, not a recap) + the response (from the MPS, gospel-empowered from the Christ-Connection Statement), carried to the closing posture you chose in Frame. Same re-asks-Frame-as-prose family as Introduction.

**What you see on screen — all RENDERS:**

- **Label:** "Conclusion"
- **Hint:** "Write the landing — gather the through-line and deliver the response you chose in Frame."
- **Teaching block** — title "Conclusion", then:
  1. "Intro framed how the listener walked in; the conclusion frames how they walk out. The body has done its work and the listener has heard the through-line. Now you land it — write the words."
  2. "Two moves (Merida): summation, then response. Summate the whole arc into one landing in fresh words — not a point-by-point recap. Then deliver the response: tell the listener exactly what to do, drawn from the MPS, gospel-empowered from the Christ-Connection Statement so the call rests on what Christ has done, not on what they must muster."
  3. "Land the ending with intention — write the conclusion's final beat so it carries the listener out cleanly, the way the sermon has shaped them."
- **Question prompt:** "Write the conclusion — the summation that gathers the sermon into one landing, then the response that calls the listener to act on the MPS, grounded in the gospel." *(one writing box — summation and response share it)*

**What it feeds in the Word export.** A bold "Conclusion" heading, then your response text as a plain paragraph, preceded by the conclusion transition if you wrote one.

**Worth knowing while you walk it:**

- This is the **last field of the entire walk**. Its forward button becomes **"Finish sermon →"**, opening the Finish screen — where "done" means artifacts present and the path leads straight to Export to Word. That seam is exactly where agenda item 1 (the adoration question) lives; there is also no "pray yourself hot" beat between manuscript and pulpit.
- The teaching names two moves (summation + response) but gives them one box. Is one field the right shape for two moves? Part of the field-by-field call.
- The Finish screen counts the Manuscript artifact done with one Introduction answer plus this response; the nudge reads "Write the manuscript — at least the opening and the closing response."

**Drift notes.** Faithful to Merida's two-move close. The doubling question (Frame decided the summation/call/gospel-empower moves; this field writes them) is agenda item 8.

---

## Part 3 — The decision agenda

The deferred rulings. Read the stages above first; then take these in whatever order serves. Items 1 and 2 are the deep design questions; 3–4 are Equip's application method; 5–8 are structure, names, and thresholds.

### 1. DEEP #1 — Where does the walk aim at adoration?

*Sources: docs/PROPOSALS/refoundation-initiative.md (status banner + "Merida's intent" appendix); memory project_merida_intent_audit.md DEEP #1; docs/CORE.md:58.*

The app calls a sermon "done" when every artifact exists — the Finish screen leads straight to Export to Word. Merida's actual goal is that people behold Christ and are changed ("aim for adoration, not only information"; Goldsworthy's "How did the sermon testify to Christ?"). Nothing in the walk ever turns you back toward that goal. **Where — if anywhere — should the walk put it in front of you again?** Everyone agrees the answer is NOT an adoration checkbox — that repeats the mechanization trap. This is a design question about where the unmeasurable gets a moment, the way the marinate fix returned you to the passage. The audit called completion-gravity the biggest risk: it silently redefines "finished sermon" as "completed worksheet." A related minor from the same audit: there is no "pray yourself hot" beat at the manuscript-to-pulpit seam.

### 2. DEEP #2 — Do the building stages carry your congregation?

*Sources: memory project_merida_intent_audit.md DEEP #2; docs/PROPOSALS/refoundation-initiative.md status banner + appendix; docs/WORKSPACE-CANON.md §3.3 Equip tag.*

When you build the sermon, the actual people in the room disappear. Study makes you name who the text lands on (Pastoral Context — the prodigal AND the older brother), but none of that carries into Outline, Equip, or Manuscript: Equip's application speaks to a generic "us," the only direct word to the unconverted lives in one Introduction overview paragraph, and prodigal/older-brother language has zero presence in the construction stages. The two-brothers language was restored in Study (Phase 2 item 2); the construction-stage side was explicitly left for this walk. **Should the building stages carry your named room forward — and how?**

### 3. The full application gradient lands in Equip.

*Sources: docs/WORKSPACE-CANON.md §2.4 Personal Implications tag + §3.3 Equip application tag [M/⚠]; refoundation appendix; memory project_refoundation_initiative.md.*

Merida/Robinson's guardrail — knowing whether each application is a NECESSARY implication of the text, a PROBABLE one, or merely POSSIBLE ("more heresy is preached in application than in exegesis") — is currently only ambient framing back in Study's Personal Implications. The canon says the full discipline belongs here in Equip, where applications actually get written under each point. **What should it look like — teaching copy, a per-application prompt, something else — without turning it into a labeling quota?** Phase 2 item 3 split this on purpose; the mechanization trap warning applies.

### 4. The rest of Equip's thin application battery.

*Source: docs/WORKSPACE-CANON.md §3.3 Equip application tag [M/⚠].*

Beyond the gradient, the canon names three more missing pieces of Merida's application method: the **idols-of-the-heart probe** (what do your people functionally worship that this text confronts?), the **two-brothers address at the point of application**, and an **explicit word to the unconverted**. The last two overlap item 2; the idols probe appears only here. **Which belong in Equip's prompts or teaching, and in what form?**

### 5. Ratify or rename "Sermon Outline" and "Sermon Body."

*Sources: docs/WORKSPACE-CANON.md §1 + §7.3; the names live in code in the walk-order region outcomes.*

Two of the eight artifact names your walk produces were first-draft names from the workspace restructure (RW1) and were never walked and ratified like the other six. They appear on the map, in the frame lines ("X opens, against the Y"), on the sermon-start landing, on the Finish screen's artifact review, and in search results. **Are these the right names, or should either change?** (If renaming: see Finding 7 for every surface the name touches.)

### 6. Walk the DRAFT pedagogy of Outline, Equip, and Manuscript.

*Sources: docs/WORKSPACE-CANON.md §1 "Maturity of each region" + §7.2; memory project_oem_field_defs.md; the three field files self-marked DRAFT.*

This is the walk itself: the prompts and teaching for all three building stages were drafted from Merida's book in one sitting (2026-06-09) and you have never walked them. **Field by field: does each one ask the right question, in your words, in the right order — ratify, reword, or restructure?** One flagged sub-question: Manuscript is the most freeform stage, and whether its three-field shape (Introduction / Transitions / Conclusion) is right was called "the open design question" and was never pre-decided.

### 7. Keep or tighten the three lenient done-checks.

*Sources: docs/WORKSPACE-CANON.md §5; the same deferral noted in the completeness code.*

Right now: Outline counts done with **one point written**; the Body with **one element under any point**; the Manuscript with **one Introduction answer plus the Conclusion response** (transitions never counted). Deliberately loose so the completeness signal stays honest without nagging. **After walking these stages, is that the right bar, or should any of the three get a real ratified definition of done, like the eight composites Study/Anchor/Frame have?** Completeness informs, never blocks — this is about what the Finish screen and map honestly report. Note: whatever you rule for Equip's pedagogy (items 2–4) may change what "done" should mean for the Body, and Finding 2's map-math contradiction needs resolving either way.

### 8. The Frame → Manuscript doubling.

*Sources: docs/WORKSPACE-CANON.md §4 structural note [⚠] + §7.4; refoundation appendix (constitutional tier).*

Your Intro and Conclusion are asked twice: Frame has you decide the moves (hook, bridge, expectations, redemptive note; summation, call, gospel-empower), then Manuscript asks you to write those same things as preaching prose. **Is that two-pass shape right — decide first, write later — or is it a doubling that should collapse into one place?** Frame is ratified; Manuscript is DRAFT — so the walk can only rule the split by walking the Manuscript side. Stakes: consolidating would amend CORE's stage model (constitutional tier) — this is the one OEM item that could touch CORE rather than just field content.

---

*End of packet. Everything quoted above was verified live at HEAD on 2026-07-01. Nothing you will review is invisible to your users; every ruling you make here lands on words they read.*
