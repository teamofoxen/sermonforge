# Sermon Workspace Tour — Implementation Spec

> Status: design locked, implementation pending. Authored 2026-04-28.
> This spec carries forward from a design exploration session. The Series Planner
> tour is a separate, later effort — do not entangle the two.

---

## What we're building

A guided spotlight tour of the Sermon Workspace. Triggered from a "Tour Sermon
Workspace" button on the Dashboard. The tour opens a tour-only sermon "The
Upside-Down Kingdom" (Matthew 5:1–12, sermon ID `tour-sotm-sermon-01`) and walks
through 34 stops. Each stop = a spotlight on a real element + a callout card
explaining it. User clicks "Next" to advance; can skip anytime.

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
- **Tour data:** the tour ships with its own sermon ("The Upside-Down Kingdom",
  Matthew 5:1–12). It uses a `tour-` ID prefix and is filtered out of every
  list query so it never appears on the dashboard. Seed on first launch
  (idempotent); open by ID when the tour starts.
- **Visual language:** dark ink callout card (`var(--ink)` background) with a
  2px gold top border, Playfair Display heading, Crimson Pro body. Spotlight is
  a soft radial-gradient vignette (not a hard mask), with a subtle gold glow on
  the highlighted element. Step counter at the top of the card, gold "Next"
  button, understated "Skip tour" link.
- **Voice:** pastoral, plain, direct. No marketing-speak. Callout text is locked
  — copy verbatim.
- **PI fields are concentric outside-in:** The Cultural Moment
  (`background_noise`) → The Room (`audience_assumptions`) → The Sermon's Work
  (`topic_theme`). The DB column names are unchanged; only the field labels
  and ordering have been updated in the UI.

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

## The 34 stops (locked content)

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

### Stop 5 — Always in the room
**Always in the room.** One layer of that context — the cultural moment, the
room, the sermon's work — is always sent to the AI, regardless of which step
you're on. Three short fields at the top of every tab keep the AI from ever
working in the abstract. We'll get to those in step 7.

### Stop 6 — Tuned to you
**Tuned to you.** Over time, the AI surfaces your own rhetorical patterns —
how you build outlines, what your MPTs tend to look like, the way you turn
applications. Adaptive guidance, tuned to you specifically. Not a model being
trained; your past work, surfaced when relevant.

### Stop 7 — Pastoral Intelligence
**Pastoral Intelligence.** Three short fields at the top of every tab, ordered
from outside in: the cultural moment, the room, the sermon's work. They don't
shape the sermon's content. They shape how the AI talks to you about it.

### Stop 8 — The Cultural Moment
**The Cultural Moment.** What world is this congregation walking in from? What
does culture believe, distort, or weaponize about this topic? The widest ring
— what's already in the air before anyone takes a seat.

### Stop 9 — The Room
**The Room.** Who's in the room, and where are they? Where has this
congregation drifted, and what do they currently believe? Posture, not
demographics.

### Stop 10 — The Sermon's Work
**The Sermon's Work.** What is this sermon trying to accomplish? What's the
big claim, and where does the Gospel enter? The innermost ring — the pastoral
aim. The AI keeps all three in mind every time you ask it anything; you never
have to restate them.

### Stop 11 — Study tab
**Study.** Four steps from text to sermon. Exegesis first, then the main
points, then the outline, then the elements that make each point land.

### Stop 12 — Step 1, Phase 1: Observe
**Phase 1 — Observe.** Before you interpret, you observe. Nine questions take
you through the passage systematically. Resist the urge to jump to meaning.

### Stop 13 — Phase 1 / Surface
**What the text says.** Context. Divisions. Commands. Statements. The surface
of the passage — what surrounds it, where it breaks into units, what's
commanded and what's declared. Get these right and the rest follows.

### Stop 14 — Phase 1 / Substance
**What the text shows.** Characters. Big Ideas. The Obvious Point. Basic
Outline. Possible Applications. Who's in the passage, what themes surface, and
the question most pastors skip — is there an obvious point? State it plainly.
Don't talk yourself out of it.

### Stop 15 — Phase 2: Interpret
**Phase 2 — Interpret.** Beneath the surface. Nine questions push from what
the text says to what it means. This is where most of the work happens.

### Stop 16 — Phase 2 / Shaping meaning
**How meaning takes shape.** Context Impact. Recurring Ideas. Characters.
Contrasts. Diagram. How surrounding context shapes meaning here. Words and
ideas that recur — repetition in Scripture is rarely accidental. What
characters are doing and why. The oppositions the author is setting up. The
relationships between ideas, sketched out.

### Stop 17 — Phase 2 / Outside voices
**Outside voices and your own.** Cross-References. Commentary. Summarize the
Parts. Summarize the Whole. What the rest of Scripture says. What the
commentaries say. Then verse by verse in your own words, and the whole passage
in your own words. If you can't do the last two, interpretation isn't finished
yet.

### Stop 18 — Phase 3: Redemptive Thread
**Phase 3 — Redemptive Thread.** Every text points somewhere. Seven questions
ask how this one points to Christ — directly or indirectly, by promise, by
need, by the nature of the God who saves.

### Stop 19 — Seven questions
**Seven ways to find Christ.** *Speaks of Christ directly. Stands before,
after, or transitional to him. Reveals a biblical theme that points to him.
Shows a promise. Shows mankind's need for him. Reveals the God who provides
redemption. How is Jesus the hero of this passage?* Answer what you can. Leave
the rest.

### Stop 20 — Synthesize
**Synthesize.** When you've answered, the AI reads all seven and writes a
cohesive redemptive summary. It's a draft — edit it, rework it, replace it.
The goal isn't a perfect summary; it's a clear thread to pull through the
sermon.

### Stop 21 — Phase 4: Implications
**Phase 4 — Implications.** What does this text demand of the people in the
room? Three categories follow — theological, personal, and what it means for
someone who doesn't believe.

### Stop 22 — Theological Significance
**Theological Significance.** What this passage teaches about God, about
ourselves, about Christ. Timeless principles. Particular doctrines. What's
true here that would be true anywhere?

### Stop 23 — Personal Application
**Personal Application.** Eight angles — examples to follow, commands to keep,
errors to avoid, sins to forsake, gospel promises to claim, new thoughts about
God, doctrines to explore, convictions to live by. Most sermons go thin at
application; this is where you get ahead of that.

### Stop 24 — Unbeliever + Compile
**Unbeliever. Compile.** What does this text mean for someone who doesn't
believe? Then click Compile — the AI consolidates every implication into a
master list. You'll prune it, but nothing will get lost.

### Stop 25 — Step 2: MPT → MPS
**Step 2 — MPT → MPS.** The two most important sentences in the sermon. Get
these right and the outline writes itself. Get them wrong and no amount of
clever structure will save it.

### Stop 26 — MPT
**Main Point of the Text.** Past tense. What the author meant, in their
context, for their original audience. Not yet about your congregation. Stay in
the text.

### Stop 27 — MPS
**Main Point of the Sermon.** Present tense. What this text means for your
congregation today. The bridge from then to now. The MPS must grow from the
MPT — not invent a new claim. The AI here is a challenger, not a collaborator.
*Challenge My MPT* and *Check MPT→MPS Chain* are the chips you'll use most.

### Stop 28 — Step 3: Outline
**Step 3 — Outline.** Structure should emerge from exegesis, not be imposed
on it. Add and reorder points until the argument moves cleanly from your MPT
to your MPS. *Review Outline* sends it to the AI for structural feedback —
whether each point derives from the text, whether the progression actually
moves, whether the structure serves the MPS.

### Stop 29 — Step 4: Functional Elements
**Step 4 — Functional Elements.** For each outline point: Explanation,
Application, Illustration. Every point needs all three to land. *Review E/A/I
Balance* asks the AI to audit each point — whether the explanation is
sufficient, whether the application is gospel-rooted, whether the illustration
clarifies or distracts. Worth running before the manuscript.

### Stop 30 — Manuscript
**Manuscript.** Where the sermon becomes prose. Sections, transitions, full
text. Three audit tools live here, each doing something different. Use them
after the manuscript is drafted, not before.

### Stop 31 — Flow Coach
**Flow Coach.** Walks you through every transition in the manuscript, one at
a time. *Does this section land? Does the next one pick up cleanly? Is there
a gap?* One step per response, so the feedback stays manageable. Use it when
the sermon reads in pieces instead of moving.

### Stop 32 — Ear Check
**Ear Check.** Reads the manuscript for what will be heard, not just read. It
scans for two things: *structural orphans* — passages that have drifted from
the argument — and *speakability flags* — sentences that will lose the room
when spoken aloud. Theological precision is fine; unintelligibility isn't.

### Stop 33 — Tune-Up
**Tune-Up.** A full audit in three phases. *Snapshot* describes what the
sermon is actually doing. *Alignment Map* grades how well it serves the MPT
and MPS. *Patch Plan* gives specific edits, marked inline. It preserves your
voice and stays within 10% of your original length. Use it when the sermon is
ready for a hard look.

### Stop 34 — Finish
**That's the workspace.** This is one sermon. The Series Planner holds many.
Both tours are available from the dashboard whenever you want to revisit.
*Buttons: Finish Tour · Take the Series Planner Tour (disabled until that tour
exists).*

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
