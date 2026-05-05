# Sermon Workspace Tour — Implementation Spec

> Status: design locked, implementation shipped (engine 2026-04-28; SFDI
> reconciliation 2026-05-05). The Series Planner tour is a separate, later
> effort — do not entangle the two.

> **Reconciliation note (2026-05-05):** The locked content below has been
> rewritten to match the post-SPRD Study shape. Pastoral Context is no longer
> a parallel-track card at the top of the workspace — it is Phase 4 Field 3
> (`room_specifics` + `cost_and_gift`), the third voice in the three-way
> conversation. Phase 1 carries 8 fields (SFDI shape), Phase 2 carries 8
> fields (Genre added 2026-05-05), Phase 3 carries 5 fields, Phase 4 carries
> 4 fields. The Compile button and the AI-generated Implications Synthesis
> are retired — the Implications Synthesis and the Christ-Connection
> Statement are pastor-written, anchored on the cumulative thought-unit
> table. Tour count: 30 stops (was 34 in the original design; 5 PC-card
> stops dropped; Unbeliever and Compile retired; Pastoral Context and
> Implications Synthesis added; one Phase 3 stop renamed). The mock sermon
> the tour walks is "The Hope That Does Not Disappoint" — Romans 5:1-5
> (sermon ID `tour-romans-sermon-01`).

---

## What we're building

A guided spotlight tour of the Sermon Workspace. Triggered from the Dashboard
("Take the guided tour" inside the Explore SermonForge tile). The tour opens
a tour-only sample sermon — "The Hope That Does Not Disappoint" (Romans 5:1-5,
sermon ID `tour-romans-sermon-01`) — and walks through 30 stops. Each stop =
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

- `src/components/Dashboard.jsx` — "Tour Sermon Workspace" button (already
  present, currently disabled) needs to be wired up to launch the tour
- `src/components/SermonWorkspace.jsx` — top-level workspace; tab orchestration;
  the tour needs to drive tab switches
- `src/components/StudyTab.jsx` — exegesis phases, MPT/MPS, outline, functional
  elements steps
- `src/components/ManuscriptTab.jsx` — Flow Coach, Ear Check, Tune-Up
- `src/components/AIPanel.jsx` — must be openable from tour state
- New: a `TourContext` (or similar) to own the cursor and prerequisite-driven
  navigation; a `tourData.js` module under `electron/` for the tour sermon
  content; a `db-loadTourSermon` IPC handler + preload exposure; list-query
  filters (`id NOT LIKE 'tour-%'`) on series and sermon list queries
- `src/styles/global.css` — design system tokens (use only these; no new colors,
  no new fonts)

---

## The 30 stops (locked content)

> Heading is bold. Body follows. Italic phrases are intentional emphasis on
> field names or chip labels — preserve them in implementation.

### Stop 1 — Workspace intro
**The Sermon Workspace.** Where you go deep on one sermon. If a series is
already in place, its big idea and context come with you here automatically.
If not, the workspace stands on its own — start where you are.

### Stop 2 — AI philosophy
**SermonForge doesn't write your sermons. It forces them.** Through a method.
Against the text. Into the pastoral moment. The AI works inside those
constraints — it challenges, audits, synthesizes. It doesn't replace the
discipline; it stress-tests it. Every response is shaped by what you've actually
done.

### Stop 3 — The Assistant
**The Assistant.** Chat anytime, at any step. The AI's posture shifts with
where you are — collaborator during exegesis, challenger at the main points,
structural reviewer at the outline, auditor at the manuscript. You're not
talking to one assistant; you're talking to the right one for the moment.

### Stop 4 — What it already knows
**What it already knows.** Before any response, the AI has the passage, your
main points, your full study, your outline, the series big idea and section,
the pastoral situation, and supporting material. Seven layers of context,
assembled fresh every time. You never have to re-explain.

### Stop 5 — Tuned to you
**Tuned to you.** Over time, the AI surfaces your own rhetorical patterns —
how you build outlines, what your MPTs tend to look like, the way you turn
applications. Adaptive guidance, tuned to you specifically. Not a model being
trained; your past work, surfaced when relevant.

### Stop 6 — Study tab
**Study.** Four steps from text to sermon. Exegesis first, then the main
points, then the outline, then the elements that make each point land.

### Stop 7 — Phase 1: Observe
**Phase 1 — Observe.** Before you interpret, you observe. Eight fields walk
you through the passage in order — outside-in, then a lens cluster, then the
bridge into Interpret. Resist the urge to jump to meaning.

### Stop 8 — Phase 1 / Surface
**What the text says.** *Context. Surface Questions. Divisions / Thought
Units.* Outside in: where this passage sits in the book, the situational
facts on the surface, and how the passage breaks into thought units that
anchor the rest of the work. Field 3 is the heaviest cut — the cumulative
thought-unit table you'll extend in every later phase starts here.

### Stop 9 — Phase 1 / Substance
**What the text shows.** *Main Characters. Commands and Declarations. Big
Ideas. Obvious Point. Possible Implications.* The lens cluster reads against
Field 3's spine — who's acting, what each main sentence is doing, what
concepts surface. Then the question most pastors skip — is there an obvious
point? State it plainly. Possible Implications close the segment by naming
what the text is starting to press on for the room.

### Stop 10 — Phase 2: Interpret
**Phase 2 — Interpret.** Beneath the surface. Eight fields push from what the
text says to what it means. This is where most of the work happens.

### Stop 11 — Phase 2 / Shaping meaning
**How meaning takes shape.** *Deeper Context. Genre. Recurring Ideas.
Character Purpose. Contrasts.* Pick up Observe's Context with study tools in
hand. Let genre set the lens. Then the dissection — what recurs, what each
character is signaling, the oppositions the author has built into the passage.

### Stop 12 — Phase 2 / Outside voices, then your own
**Outside voices, then your own.** *Cross-References. Commentary Notes.
Interpretation Synthesis.* Let Scripture interpret Scripture. Check your
reading against the commentaries — last, to confirm or correct, not to start.
Then articulate what the passage MEANS in your own voice, per thought unit
and as a whole. The Interpretation Set is the named outcome — Phase 3 opens
against it.

### Stop 13 — Phase 3: Redemptive Thread
**Phase 3 — Redemptive Thread.** Every text points somewhere. Five fields ask
how this one points to Christ — by position, by theme or promise or type or
prophecy, by the gospel's enabling power, by need, by the character of the
God who saves.

### Stop 14 — Phase 3 / Five ways to find Christ
**Five ways to find Christ.** *This Passage and Christ. How the Passage
Points to Christ. How the Gospel Makes This Possible. Our Need and God's
Character. Christ-Connection Statement.* Position the text against Christ.
Trace the four pointing-mechanisms — biblical theme, promise, type, predictive
prophecy. Ground the gospel's enabling power. Pair human need with God's
character. The discipline: don't insert Christ where he isn't. Mark N/A where
the text genuinely doesn't carry that kind of pointing.

### Stop 15 — Christ-Connection Statement
**Christ-Connection Statement.** The named outcome of Redemptive Thread,
written by you — not the AI. For each thought unit you named in Observe,
write the Christ-connection in the cumulative table. Then close with one
paragraph: how does the whole passage point to Christ, and how is Christ its
hero? Phase 4 opens against this statement.

### Stop 16 — Phase 4: Implications
**Phase 4 — Implications.** What does this text demand of the people in the
room? Four fields — what the text teaches (Theological Significance), what
it asks of the hearer (Personal Implications), the room it's landing in
(Pastoral Context), and the synthesis that integrates all three (Implications
Synthesis).

### Stop 17 — Theological Significance
**Theological Significance.** What this passage teaches about God, about
ourselves, about Christ. Timeless principles. Particular doctrines. What's
true here that would be true anywhere?

### Stop 18 — Personal Implications
**Personal Implications.** Four verb-driven questions — what to *follow*
(examples to imitate, commands to keep), what to *forsake* (errors to avoid,
sins to leave), what to *receive* (gospel promises, fresh thoughts about
God), and what to *settle* into (truths to explore, convictions to live by).
Most sermons go thin at application; this is where you get ahead of that.

### Stop 19 — Pastoral Context
**Pastoral Context.** The third voice in the three-way conversation. Two
questions: who in your room is this text speaking into — specific people,
specific situations — and for those specific people, what's the cost (what
will be hard, costly, counter-intuitive) and what's the gift (the comfort,
hope, freedom, or invitation this text holds out). The text leads; the room
enters here, by name.

### Stop 20 — Implications Synthesis
**Implications Synthesis.** The Study work closes here, in your voice. For
each thought unit, integrate the three voices — what the text teaches, what
it asks of the hearer, how it lands in this room. Then one paragraph for the
whole passage. This is the marinate-output. MPT and MPS open against it.

### Stop 21 — Step 2: MPT → MPS
**Step 2 — MPT → MPS.** The two most important sentences in the sermon — they
anchor everything else. Get these right and the outline largely writes itself.

### Stop 22 — MPT
**Main Point of the Text.** Past tense. What the author meant, in their
context, for their original audience. Not yet about your congregation. Stay in
the text.

### Stop 23 — MPS
**Main Point of the Sermon.** Present tense. What this text means for your
congregation today. The bridge from then to now. The MPS must grow from the
MPT — not invent a new claim. The AI here is a challenger, not a collaborator.
*Challenge My MPT* and *Check MPT→MPS Chain* are the chips you'll use most.

### Stop 24 — Step 3: Outline
**Step 3 — Outline.** Structure should emerge from exegesis, not be imposed
on it. Add and reorder points until the argument moves cleanly from your MPT
to your MPS. *Review Outline* sends it to the AI for structural feedback —
whether each point derives from the text, whether the progression actually
moves, whether the structure serves the MPS.

### Stop 25 — Step 4: Functional Elements
**Step 4 — Functional Elements.** For each outline point: Explanation,
Application, Illustration. Every point needs all three to land. *Review E/A/I
Balance* asks the AI to audit each point — whether the explanation is
sufficient, whether the application is gospel-rooted, whether the illustration
clarifies or distracts. Worth running before the manuscript.

### Stop 26 — Manuscript
**Manuscript.** Where the sermon becomes prose. Sections, transitions, full
text. Three audit tools live here, each doing something different. Use them
after the manuscript is drafted, not before.

### Stop 27 — Flow Coach
**Flow Coach.** Walks you through every transition in the manuscript, one at
a time. *Does this section land? Does the next one pick up cleanly? Is there
a gap?* One step per response, so the feedback stays manageable. Use it when
the sermon reads in pieces instead of moving.

### Stop 28 — Ear Check
**Ear Check.** Reads the manuscript for what will be heard, not just read. It
scans for two things: *structural orphans* — passages that have drifted from
the argument — and *speakability flags* — sentences that will lose the room
when spoken aloud. Theological precision is fine; unintelligibility isn't.

### Stop 29 — Tune-Up
**Tune-Up.** A full audit in three phases. *Snapshot* describes what the
sermon is actually doing. *Alignment Map* grades how well it serves the MPT
and MPS. *Patch Plan* gives specific edits, marked inline. It preserves your
voice and stays within 10% of your original length. Use it when the sermon is
ready for a hard look.

### Stop 30 — Finish
**That's the workspace.** This is one sermon. The Series Planner holds many.
Both tours are available from the dashboard whenever you want to revisit.

---

## Implementation questions to settle in the build session

1. **Spotlight anchoring** — by `data-tour-id` attributes on real elements, or
   by a config that maps stop IDs to refs? `data-tour-id` is more decoupled but
   leaves DOM fingerprints; refs are tighter but need wiring through every
   touched component.
2. **Tab/step navigation** — does the tour control `SermonWorkspace.activeTab`
   and `StudyTab.step` directly, or via a tour-orchestrator hook that owns
   navigation as side effects of stop changes?
3. **Inactive-UI stops** — Stop 31 (Flow Coach), Stop 32 (Ear Check), Stop 33
   (Tune-Up) target buttons that may live behind a closed AI drawer. Decide:
   open the drawer for the tour, or point to where the button lives without
   exposing it.
4. **Persistence** — should "tour seen" be a localStorage flag? Should the
   tour be replayable from the dashboard at any time?
5. **Tour-sermon lifecycle** — seed on first tour launch (lazy) or on app
   startup via migration? Lazy is simpler and avoids seeding for users who
   never run the tour. The cleanup story (if a user wants to fully wipe tour
   data) is also worth deciding.

---

## Out of scope for this spec

- Series Planner tour (separate, later)
- Delivery tab tour (the Delivery screen needs work first; tour will be added
  after that refresh)
- Field-by-field tour of the Manuscript tab (only Flow Coach, Ear Check,
  Tune-Up are explained at the audit-tool level)
