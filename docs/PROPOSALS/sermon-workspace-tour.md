# Sermon Workspace Tour — Implementation Spec

> Status: design locked, implementation shipped (engine 2026-04-28; SFDI
> reconciliation 2026-05-05; throughline-first reframe 2026-05-05). The
> Series Planner tour is a separate, later effort — do not entangle the
> two.

> **Throughline-first reframe (2026-05-05):** The locked content below is
> the 17-stop throughline-anchored narrative. The tour walks the
> cumulative thought-unit table from Phase 1 Field 3 through Phase 4, then
> MPT/MPS → Outline → Functional Elements → Frame (Intro + Conclusion) →
> Manuscript → Delivery, anchoring on the four named outcomes (Observation
> Set → Interpretation Set → Christ-Connection Statement → Implications
> Synthesis). The pre-reframe 30-stop UI-surface-walk is retired — it
> taught pastors *where things lived* but not *how the discipline held
> together*. Substrate stable: tour engine (2026-04-28), mock sermon,
> per-field anchors, ThroughlineRail (SPRD C2, 2026-05-04), and SFDI
> Phase 1/2/3/4 + SADI Step 5 field shapes are all locked and shipping.
> Phase 1 carries 8 fields (Background retired 2026-05-05), Phase 2
> carries 8 fields (Genre at slot 2), Phase 3 carries 5 fields, Phase 4
> carries 4 fields with Pastoral Context as the third voice in the
> three-way conversation. The Compile button and AI-generated Implications
> Synthesis are retired — the Implications Synthesis and Christ-Connection
> Statement are pastor-written, anchored on the cumulative thought-unit
> table. The mock sermon the tour walks is "The Hope That Does Not
> Disappoint" — Romans 5:1-5 (sermon ID `tour-romans-sermon-01`).

---

## What we're building

A guided spotlight tour of the Sermon Workspace. Triggered from the Dashboard
("Take the guided tour" inside the Explore SermonForge tile). The tour opens
a tour-only sample sermon — "The Hope That Does Not Disappoint" (Romans 5:1-5,
sermon ID `tour-romans-sermon-01`) — and walks through 17 stops. Each stop =
a spotlight on a real element + a callout card explaining it. User clicks
"Next" to advance; can leave anytime.

The tour sermon is hidden from the Dashboard and Series Planner. It is seeded
on first tour launch (idempotent), opened directly by ID when the tour starts,
and excluded from every list query via an `id NOT LIKE 'tour-%'` filter so it
never appears as ordinary user content.

This is the second of two planned tours. The Series Planner tour is a separate,
later effort — do not entangle the two.

---

## Key decisions already made

- **Format:** guided spotlight tour. User-paced via Next button. Not auto-playing.
  Not a video. Not connected to a Series Planner tour.
- **Entry:** dashboard buttons in the page header — "Tour Sermon Workspace" and
  (later) "Tour Sermon Planner". The legacy "See Demo" button and the entire
  demo-mode annotation system have been removed; the tour replaces them.
- **Tour data:** the tour ships with its own sample sermon ("The Hope That
  Does Not Disappoint", Romans 5:1-5). It uses a `tour-` ID prefix and is
  filtered out of every list query so it never appears on the dashboard. The
  `load-tour-sermon` handler is delete-then-insert, so each tour launch wipes
  any prior tour data and inserts a fresh copy — sample sermon updates take
  effect on every click; auto-sweeps stale `tour-sotm-*` rows from the prior
  Matthew 5 mock.
- **Visual language:** dark ink callout card (`var(--ink)` background) with a
  2px gold top border, IBM Plex Serif heading, IBM Plex Serif body. Spotlight is
  a soft radial-gradient vignette (not a hard mask), with a subtle gold glow on
  the highlighted element. Step counter at the top of the card, gold "Next"
  button, understated "Leave tour" link.
- **Voice:** pastoral, plain, direct. No marketing-speak. Callout text is locked
  — copy verbatim.

---

## Codebase touchpoints

- `src/components/Dashboard.jsx` — "Tour Sermon Workspace" button launches
  the tour
- `src/components/SermonWorkspace.jsx` — top-level workspace; tab
  orchestration; tour drives tab switches via `desiredUi`
- `src/components/StudyTab.jsx` — exegesis phases, MPT/MPS, outline,
  functional elements steps; consumes `desiredUi.studyStep` /
  `desiredUi.studySubPhase`
- `src/components/ThroughlineRail.jsx` — vertical rail tracking the
  cumulative thought-unit table; anchored at
  `data-tour-id="throughline-rail"` for stops 3 and 9
- `src/components/FrameTab.jsx` — Step 5 (Sermon Frame: Intro +
  Conclusion); anchored at `data-tour-id="frame-worksheet"` for stops 13
  and 14
- `src/components/DeliveryTab.jsx` — Delivery surfaces (Manuscript /
  Preaching Outline / Without Notes); anchored at
  `data-tour-id="delivery-overview"` for stop 16
- `src/components/ManuscriptTab.jsx` — Flow Coach, Ear Check, Tune-Up
- `src/components/AIPanel.jsx` — openable from tour state
- `src/tour/workspaceTourStops.js` — the 17-stop array; `TourContext`
  drives prerequisite-aligned UI state for each stop
- `electron/tourData.js` + `db-loadTourSermon` IPC handler — tour sermon
  seeding (delete-then-insert per launch); list-query filters
  (`id NOT LIKE 'tour-%'`) keep the sample out of normal lists
- `src/styles/global.css` — design system tokens (use only these; no new
  colors, no new fonts)

---

## The 17 stops (locked content)

> Heading is bold. Body follows. Italic phrases are intentional emphasis on
> field names or chip labels — preserve them in implementation.

### Stop 1 — Workspace shell
**The Sermon Workspace.** Where you go deep on one sermon. Series context
comes with you here automatically if a series is in place. If not, the
workspace stands on its own — start where you are.

### Stop 2 — AI philosophy (ambient)
**SermonForge doesn't write your sermons. It forces them.** Through a
method. Against the text. Into the pastoral moment. The AI's posture shifts
with where you are — collaborator during exegesis, challenger at the main
points, structural reviewer at the outline, auditor at the manuscript.
Every response is shaped by what you've actually done. It doesn't replace
the discipline; it stress-tests it.

### Stop 3 — The throughline
**The throughline.** Down the left of the Study tab, a vertical rail
tracks one cumulative thought-unit table. Phase 1 builds the rows. Phase 2
adds a *meaning* column. Phase 3 adds *Christ-connection*. Phase 4 adds
*implication*. By the time MPT and MPS open, the table holds the
propositional skeleton with bones, signal, meaning, Christ-connection, and
integrated implication — all in one structural artifact. Each sub-phase
ends with a **named outcome** the next opens against. You don't lose the
work. You carry it.

### Stop 4 — Phase 1 / outside-in
**Phase 1 — Observe (outside-in).** *Context. Surface Questions. Divisions
/ Thought Units.* Where the passage sits in the book; the situational
facts on the surface; then Field 3 — the heaviest cut. Lay the passage out
by hand, paraphrase each main sentence in your own voice, name the thought
units. **Field 3 builds the rows of the throughline table.** Resist the
urge to jump to meaning.

### Stop 5 — Phase 1 / lens cluster + bridge
**Phase 1 — Observe (lens cluster + bridge).** *Main Characters. Commands
and Declarations. Big Ideas. Obvious Point. Possible Implications.* The
lens cluster reads against Field 3's spine — who's acting, what each main
sentence is doing, what concepts surface. Then the question most pastors
skip — is there an obvious point? State it plainly. Possible Implications
close the segment by naming what the text is pressing on for the room.
Phase 1's named outcome: the **Observation Set**.

### Stop 6 — Phase 2 — extends the table
**Phase 2 — Interpret.** *Deeper Context. Genre. Recurring Ideas.
Character Purpose. Contrasts. Cross-References. Commentary Notes.
Interpretation Synthesis.* Pick up Observe's Context with study tools in
hand. Let genre set the lens. Dissect what's inside. Open the canon. Check
trusted readers — last, to confirm or correct, not to start. Then
articulate what the passage MEANS in your own voice, per thought unit and
as a whole. **Each thought unit gets a *meaning* column added to the
throughline table here.** Interpret's named outcome: the **Interpretation
Set**.

### Stop 7 — Phase 3 — extends the table
**Phase 3 — Redemptive Thread.** *This Passage and Christ. How the Passage
Points to Christ. How the Gospel Makes This Possible. Our Need and God's
Character. Christ-Connection Statement.* Position the text against Christ.
Trace the four pointing-mechanisms — biblical theme, promise, type,
predictive prophecy. Ground the gospel's enabling power against moralism.
Pair human need with God's character. **Each thought unit gets a
*Christ-connection* column added.** Phase 3's named outcome — written by
you, not the AI — is the **Christ-Connection Statement**.

### Stop 8 — Phase 4 — extends the table
**Phase 4 — Implications.** *Theological Significance. Personal
Implications. Pastoral Context. Implications Synthesis.* What the text
teaches. What it asks of the hearer — *follow, forsake, receive, settle.*
The room concretely named — who this text is speaking into, what's costly
and what's gift. The text leads the first two voices; the room enters as
the third. **Each thought unit gets an *implication* column — completing
the table to six columns.** Phase 4's named outcome — pastor-written, no
AI substitute — is the **Implications Synthesis**. The marinate-output.

### Stop 9 — The four named outcomes
**The four named outcomes.** Look at the rail. Four callouts mark the
hand-off arc: **Observation Set → Interpretation Set → Christ-Connection
Statement → Implications Synthesis.** Each one is what the next sub-phase
opens against — not raw worksheet content. By Phase 4's close, you're
holding four pastor-written articulations plus the six-column table.
That's the substrate MPT and MPS open against. No AI re-summary. Your
work, accumulated and visible.

### Stop 10 — Step 2: MPT → MPS
**Step 2 — MPT → MPS.** The two most important sentences in the sermon.
**MPT** in past tense — what the author meant for the original audience.
**MPS** in present or future tense — what this text means for *this*
congregation. The bridge from then to now. MPS's gospel-check reads
against the Christ-Connection Statement: does the call rest on what
Christ has done, or has it slipped into "try harder"? AI here is a
challenger — *Challenge My MPT* and *Check MPT→MPS Chain* are the chips
you'll use most. Step 2's named outcome: the **Main Point Pair**.

### Stop 11 — Step 3: Outline
**Step 3 — Outline.** Structure emerges from the throughline, not imposed
on it. Add and reorder points until the argument moves cleanly from MPT
to MPS. *Review Outline* sends it to the AI for structural feedback —
does each point derive from the text, does the progression actually move,
does the structure serve the MPS?

### Stop 12 — Step 4: Functional Elements
**Step 4 — Functional Elements.** For each outline point: Explanation,
Application, Illustration. Every point needs all three to land. *Review
E/A/I Balance* asks the AI to audit each point — is the explanation
sufficient, is the application gospel-rooted, does the illustration
clarify or distract? Worth running before the manuscript.

### Stop 13 — Step 5: Frame — Intro
**Step 5 — Frame: Intro.** Four moves to walk the listener into the body.
*Hook* — open from where the listener actually is. *Bridge to text* —
land the MPT and MPS. *Expectations* — name what the body will ask of
them, so they're not blindsided. *Redemptive note* — the gospel-shape
that turns the call from burden into invitation. The order is deliberate:
name the call first, then gospel-empower it. The same anti-moralism
pattern MPS just walked.

### Stop 14 — Step 5: Frame — Conclusion
**Step 5 — Frame: Conclusion.** Four moves to land the body's call.
*Summate* — pull the whole arc into one landing in the voice of where the
listener now is, not a point-by-point recap. *Land the call* — concrete,
drawn from MPS. *Gospel-empower* — drawn from the Christ-Connection
Statement, so the listener walks out holding the gift, not a new burden.
*Closing posture* — silence, song, prayer, or charge, named explicitly.
Step 5's named outcome: the **Sermon Frame**.

### Stop 15 — Manuscript
**Manuscript.** Where the sermon becomes prose. Three audit tools live
here — use them after the manuscript is drafted, not before. *Flow Coach*
walks every transition one at a time, asking whether each section lands
and the next picks up cleanly. *Ear Check* scans for structural orphans
and speakability flags — what will be heard, not just read. *Tune-Up*
runs a full three-phase audit — Snapshot, Alignment Map, Patch Plan —
preserving your voice and staying within 10% of length.

### Stop 16 — Delivery
**Delivery.** Three ways to stand at the pulpit. *Manuscript* formatted
for reading aloud, *Preaching Outline* for the lectern, *Without Notes*
compressed into memory blocks. The closing posture you chose at Frame:
Conclusion shapes the physical close. After the sermon is preached, this
is where you mark it complete.

### Stop 17 — Finish
**That's the workspace.** One sermon, throughline-first. The Series
Planner holds many. Both tours are available from the dashboard whenever
you want to revisit.

---

## Throughline-first reframe — what changed (2026-05-05)

The pre-reframe 30-stop tour was SFDI-reconciled but structurally a UI
surface walk — stop after stop introducing tabs, fields, and audit tools.
Pastors finished it knowing *where things lived*, not *how the discipline
held together*.

The 17-stop tour above is the throughline-anchored replacement. Five
shape-changing decisions landed in the build session:

1. **AI overview distributed.** The four front-loaded AI stops
   (`ai-philosophy`, `the-assistant`, `what-it-knows`, `tuned-to-you`)
   collapse to one ambient framing stop (Stop 2). The AI's posture-shifts
   are named inline at the relevant phase / step stops where they apply.
2. **Manuscript audit tools collapsed.** Flow Coach, Ear Check, and
   Tune-Up move from three dedicated stops to one Manuscript stop (Stop
   15) with each tool named in italics with a half-sentence each.
3. **Frame elevated to two stops.** SADI Step 5's Intro and Conclusion
   become first-class tour stops (Stops 13 and 14) — they were absent
   from the pre-reframe tour. Anchor:
   `data-tour-id="frame-worksheet"` on `FrameTab`'s outer wrapper.
4. **Delivery added as a stop.** A first-class Delivery stop (Stop 16)
   with anchor `data-tour-id="delivery-overview"` on `DeliveryTab`.
5. **Throughline rail anchored.** A single stable
   `data-tour-id="throughline-rail"` on `ThroughlineRail`'s outer
   `<aside>` carries Stops 3 and 9 (the rail itself + the four named
   outcomes).

Stop count locked at 17 (range 14-18 from the design phase). Phase 1
retains two stops (outside-in + lens cluster) because Field 3 alone
carries the heaviest cut of the tour; the other phases collapse to one
stop apiece since the rail teaches the cumulative-table mechanic and each
phase stop only needs to teach what *that* phase contributes.

---

## Implementation questions (engine-level — already resolved)

These were settled when the engine shipped 2026-04-28:

1. **Spotlight anchoring** — `data-tour-id` attributes on real DOM elements. Decoupled, simple to extend. SpotlightWorksheet emits per-field anchors via `fieldKeyToTourId`.
2. **Tab/step navigation** — prerequisite-driven. Each stop declares `prerequisites: { tab, drawerOpen, studyStep, studySubPhase, ... }`; `TourContext` exposes `desiredUi`; consumer surfaces (SermonWorkspace, StudyTab) align state when the tour is active.
3. **Persistence** — `sf_tour_workspace_seen` localStorage flag, set on `complete`, cleared on `leave`. Replayable from the dashboard at any time.
4. **Tour-sermon lifecycle** — seeded lazily by `db-loadTourSermon` on first dashboard click; delete-then-insert on every load (sample is for exploration, not persistent work); auto-sweeps stale `tour-*` rows.

---

## Out of scope for this spec

- Series Planner tour (separate, later)
- Delivery tab tour beyond the single overview stop (the Delivery screen
  still needs UX work; deeper coverage waits)
- Field-by-field tour of the Manuscript tab (only Flow Coach, Ear Check,
  Tune-Up are mentioned at the audit-tool level inside Stop 15)
