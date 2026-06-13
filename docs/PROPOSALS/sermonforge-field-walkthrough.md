# SermonForge — Field-by-Field Walkthrough

> **Stale post-ARI (2026-05-09).** This walkthrough was authored before the AI
> Removal Initiative and the Series Planner gate. It still describes Series Planner
> tabs as live (Series Planner is gated behind a "Coming soon" placeholder per ARI
> Phase 0) and still describes "Analyze" / "Review Outline" / "Review E/A/I"
> buttons as AI affordances (the AI subsystem was deleted in ARI Phase 8). For the
> current pastor-facing field shape, see
> [`docs/SYSTEMS/sermon-workspace.md`](../SYSTEMS/sermon-workspace.md). Retained for
> historical reference; do not use as current spec.

> Every field a pastor touches in SermonForge, in the order the work actually
> happens, with how each one feeds the next. Plain English. No internals.

The product has two halves: a **Series Planner** (where you set the table for a
multi-week journey through a book) and a **Sermon Workspace** (where you go
deep on one Sunday inside that series). The Workspace knows everything the
Planner knows the moment you open a slot, so a lot of fields are quietly
borrowed downstream rather than typed twice.

---

## Half 1 — Series Planner

The Planner has five tabs. You usually move left-to-right, but Book Study is
the foundation everything else leans on.

### Tab 1 — Book Study (six fields)

This is the research you do *before* you start planning sermons. You're
sitting with the whole book.

1. **Redemptive Context.** Where this book sits in the Bible's arc from
   creation to new creation. *Carried forward into every sermon's AI
   conversation in this series.*
2. **Book Background.** Author, audience, occasion, historical setting, genre.
   *Stays at the series level — too much to repeat under every sermon.*
3. **Book Argument.** The book's controlling argument or central purpose.
   *Series-level only.*
4. **Book Structure.** Major movements, structural markers, turning points.
   *Series-level only.*
5. **Series Motivation.** Why this congregation needs this book *now*.
   *Carried forward into every sermon's AI conversation in this series.*
6. **Emerging Big Idea.** A working draft of the series' big idea, written
   *during* study. Becomes the rough draft for the Overview tab's Big Idea.

Each field has an "Analyze" button that talks to the AI panel using whatever
you've already filled in.

### Tab 2 — Overview

Where the series' identity is set.

- **Title, color, canon category, status, passage range, dates.** Identity and
  shape.
- **Big Idea.** The final-form series big idea. *The Emerging Big Idea from
  Book Study sits read-only above this field as your draft.* This is the line
  every sermon in the series aligns under.
- **Overview narrative.** A short description of the whole journey.

The Big Idea is one of the most-borrowed fields in the system. It rides along
into every sermon you open from this series.

### Tab 3 — Structure

- **Structural Outline.** How the series is shaped — major beats.
- **Sections.** Optional groupings inside the series (e.g., "Part 1 — the
  promise"; "Part 2 — the wilderness"). Each section has its own title, passage
  range, big idea, overview. *A section's big idea is also borrowed by any
  sermon inside that section.*

### Tab 4 — Sermon Slots

This is where you lay out the individual Sundays.

Each slot carries:

- **Passage** — the text for that week.
- **Working title** — placeholder until you preach it.
- **Big idea (sermon-level draft).** Optional — a stab at the sermon's main
  thrust at planning time.
- **Study Guide Note.** A short note for the congregation's study guide. The
  "Assist" button writes a draft using the slot's position in the series, the
  series' Big Idea, the section's Big Idea, and the Series Motivation. *This
  is the first place several Book Study fields visibly populate downstream.*

When the slot is ready, "Open" lifts you into the Sermon Workspace for that
specific week.

### Tab 5 — Calendar

You set a series start date. The app proposes upcoming Sundays and tells you
the liturgical season for each. You adjust, then "Save All Dates" stamps a
date onto every sermon slot. From now on, that sermon knows when it's being
preached.

### Side door — Study Guide export

The "Study Guide" button pulls together a five-part document for the
congregation, all from fields you've already filled:

- Part 1: Big Idea + Overview
- Part 2: Book Background + Book Argument + Book Structure
- Part 3: Redemptive Context + Emerging Big Idea
- Part 4: Series Motivation
- Part 5: Every slot's passage, title, date, season, and Study Guide Note

Empty fields drop out automatically. Nothing is retyped.

---

## Half 2 — Sermon Workspace

You open a slot and the Workspace mounts. Series Big Idea, Series Motivation,
Redemptive Context, the section's Big Idea — they all came along for the ride.
Every AI conversation about this sermon already knows the series frame.

The Workspace is one tab per phase of prep: **Study → MPT/MPS → Outline →
Functional Elements → Manuscript → Delivery.**

### Study tab

The whole exegetical arc. Four sub-phases that build on each other in a strict
order — say → mean → points-to-Christ → lands.

The text drives the sermon toward Pastoral Context, not the other way around.
That ordering matters: the text speaks first; the room enters late.

#### Phase 1 — Observe (eight fields). What does the text *say*?

1. **Context.** What happened before this passage, what happens after, what
   that does to this passage, why the Holy Spirit led the author to write
   this here.
2. **Surface Questions.** Where, when, how — situational facts on the surface.
3. **Divisions / Thought Units.** *The spine of the entire Study tab.* You
   type the passage by hand, pull subjects and main verbs to the left margin,
   indent modifiers under what they modify, paraphrase each main sentence in
   your own words, and mark where each thought unit ends. The thought units
   you name here become rows in a table that grows across **all four phases**.
   This is the single biggest place where one field populates many downstream.
4. **Main Characters.** Who's acting and what role each plays.
5. **Commands and Declarations.** For each main sentence, name what it's
   doing — calling action or naming reality — and say what it's doing in your
   own words.
6. **Big Ideas.** What concepts the passage is wrestling with.
7. **Obvious Point.** The plain-sense point in one sentence.
8. **Possible Implications.** *First, gentle surfacing of the room.* What's
   the passage starting to press on for your people? What's hard? What's
   hopeful? You're not drafting application yet — just letting the room enter
   awareness while the text still leads.

#### Phase 2 — Interpret (eight fields). What does the text *mean*?

1. **Deeper Context.** Pick up Observe's Context with commentaries and tools
   in hand. Resolve what was open. Widen to the whole book's argument.
2. **Genre.** Name the literary form and let it set the lens. Optional — only
   when genre is doing real interpretive work here.
3. **Recurring Ideas.** Words, themes, motifs the author keeps hitting.
4. **Character Purpose.** For each character you named in Observe, *why* are
   they doing what they're doing — what is the author signaling through them.
5. **Contrasts.** What is set against what. What each contrast is doing.
6. **Cross-References.** Where else Scripture speaks to this. Concentric
   circles outward.
7. **Commentary Notes.** Last, to check — not to start. Where the
   commentaries sharpen, confirm, correct, or where you push back.
8. **Interpretation Synthesis.** *The named output of Interpret.* This field
   has two parts. (a) A **table** that pulls in the thought units you named in
   Observe — read-only — and asks you to fill a single new column: *Meaning*.
   (b) A **one-paragraph** synthesis of the whole passage's meaning, in your
   own voice. This paragraph is what Phase 3 opens against.

#### Phase 3 — Redemptive Thread (five fields). How does the text point to *Christ*?

1. **This Passage and Christ.** Where the text stands relative to Christ —
   before, after, transitional. Whether it speaks directly of Christ.
2. **How the Passage Points to Christ.** Four distinct ways: biblical theme,
   promise, type, predictive prophecy. Some passages carry all four; some
   carry one; some carry none directly — and that's allowed.
3. **How the Gospel Makes This Possible.** If this text calls the hearer to
   do, be, or trust something — how do the implications of the gospel make
   that possible?
4. **Our Need and God's Character.** Pair what the passage shows about human
   need for Christ with what it shows about God's character.
5. **Christ-Connection Statement.** *The named output of Redemptive Thread.*
   Two parts again. (a) The **same table** from Phase 2 reappears — Phase 1
   and Phase 2 columns now read-only — with a new column: *Christ-Connection*
   per thought unit. (b) A **one-paragraph** Christ-Connection Statement for
   the whole passage. Phase 4 opens against this paragraph.

#### Phase 4 — Implications (four fields). How does the text *land*?

This phase is a three-way conversation: theology, personal application, and
the room. Three voices. One synthesis.

1. **Theological Significance.** What the text teaches about God, about us,
   about Christ, timeless principles, doctrines.
2. **Personal Implications.** What the text asks of the hearer: Follow,
   Forsake, Receive, Settle.
3. **Pastoral Context.** *The room.* (a) Who specifically in your room is
   this text speaking into — believers and unbelievers, the wearied, the
   doubting, the new, the long-faithful. (b) For those specific people,
   what's the cost and what's the gift. **This is the field whose contents
   ride into every AI conversation about this sermon, alongside the series
   frame.**
4. **Implications Synthesis.** *The named output of Implications and the
   final close on the Study tab.* Two parts. (a) The **same table** appears
   one last time — three columns now read-only (Meaning, Christ-Connection,
   plus the Phase 1 spine) — with the final new column: *Implication* per
   thought unit, drawing on all three voices. (b) A **one-paragraph**
   Implications Synthesis: what does this text teach, what does it ask, how
   does it land in this room — all in one voice. *This paragraph is what you
   carry into MPT/MPS.*

### MPT / MPS Forge (two fields)

After Implications, you state the sermon's spine in two lines.

- **MPT — Main Point of the Text** (past tense). What the text was saying or
  doing in its original setting.
- **MPS — Main Point of the Sermon** (present tense). What this sermon will
  land on this week, in this room.

The Implications Synthesis paragraph is the substrate MPT/MPS draws from. The
AI's role here shifts to challenger — testing whether your MPS actually flows
from your MPT or has drifted.

### Outline Builder

You add and reorder outline points for the sermon's structure. The outline
syncs to the Outline tab so you can shape it in either place. A "Review
Outline" button asks the AI to check the shape against your MPS.

### Functional Elements (per outline point)

For each outline point you wrote, three small fields:

- **Explanation** — what the point teaches.
- **Application** — what it asks of the hearer.
- **Illustration** — how it lands.

A "Review E/A/I Balance" button asks the AI whether your sermon is leaning
too hard on one of the three across the whole outline.

### Manuscript tab

Free-form writing space organized by Introduction, Transitions (between
outline points), and Conclusion. The **Tune-Up** engine audits a finished
manuscript; its most recent reply is saved on the sermon and shown above the
Introduction so you can come back to it later. **Export to Word** drops the
whole manuscript out as a `.docx`.

### Delivery tab

Pulpit-mode view of the manuscript and outline for use while preaching.

---

## How it all comes together — the throughline

Read the whole thing top to bottom and the logic shows up:

1. **The series sets the table.** Book Study is the deepest research; its
   Redemptive Context and Series Motivation become permanent travel companions
   for every sermon in the series. The Emerging Big Idea matures into the
   final Big Idea on the Overview tab.
2. **Sermon slots inherit the series frame.** Each slot gets a passage and a
   date. The Study Guide Note already pulls from series + section + motivation
   without you retyping.
3. **Open a sermon and the series rides along.** Big Idea, Series Motivation,
   Redemptive Context, section big idea — all of it follows you in. Every AI
   conversation about this sermon already knows the series.
4. **Study walks the text in one direction: say → mean → Christ → land.**
   Observe before Interpret before Redemptive before Implications. The
   ordering is the discipline. The text speaks first; the room enters last.
5. **Phase 1 Field 3 is the spine.** The thought units you name in Observe's
   "Divisions / Thought Units" don't stay in Phase 1. The same table reappears
   in Phase 2 (you add *Meaning*), Phase 3 (you add *Christ-Connection*),
   Phase 4 (you add *Implication*). One row per thought unit. Six columns by
   the end. You never retype the spine.
6. **Each phase closes with a synthesis in your own voice.** Interpretation
   Synthesis, Christ-Connection Statement, Implications Synthesis. These
   paragraphs are what the next phase opens against — not raw worksheet
   content. Each phase earns the right to the next.
7. **Pastoral Context arrives twice — gently, then fully.** Once in
   Observe Field 8 (Possible Implications) as awareness. Once in Implications
   Field 3 (Pastoral Context) as the integrated voice. The room enters when
   the text has done its work, not before.
8. **Then marinate — return to the passage before you forge.** The
   Implications Synthesis is the named outcome of Phase 4, and it (with the
   four named outcomes) is the content substrate MPT/MPS draws from — no AI
   re-summary, no reaching back into the scattered worksheet answers. But
   before you forge the Main Point the system sends you back to read the
   passage through once more: the Implications send-off, the Study→Anchor
   handoff (which now carries the passage), and the MPT draft prompt all point
   you into the text. The reference pane keeps the passage present beside your
   work by default the whole way. The foundation has been earned; the
   saturation is in the text.

   > **Note, 2026-06-10 — pastor's saturation ruling.** This item previously
   > read "Implications Synthesis is the marinate-output" and called the
   > synthesis the thing you sit with before crafting the sermon. That
   > conflation is struck: marinate is a return to the *passage*, a separate
   > beat, not a relabeling of the synthesis. The synthesis-is-substrate
   > principle (item 6 above) is unchanged. See CORE Process Contract #6
   > saturation amendment.
9. **MPT → MPS is the bridge.** Past tense (what the text said) becomes
   present tense (what this sermon lands).
10. **MPS shapes the Outline; the Outline shapes the Functional Elements;
    the Functional Elements shape the Manuscript.** Each step is a tightening
    of focus from Big Idea to Sunday morning.
11. **Underneath all of it, the AI conversation always knows two things:**
    the series frame (Big Idea, Series Motivation, Redemptive Context) and
    the room (Phase 4 Field 3 — Pastoral Context). The other tiers come and
    go depending on what step you're on, but those two are always present
    when there's content in them.

The product, in one line: **the text drives the sermon toward the room. Every
field in SermonForge exists to keep that direction honest.**
