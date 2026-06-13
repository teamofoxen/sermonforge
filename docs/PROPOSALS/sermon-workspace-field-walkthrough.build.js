// Generates the Sermon Workspace field walkthrough as a .docx
//
// STALE POST-ARI (2026-05-09): The body text below describes "Review Outline" and
// "Review E/A/I Balance" as AI buttons, and references Series Planner tabs as
// live. Both are wrong post-ARI (AI subsystem deleted; Series Planner gated
// behind a "Coming soon" placeholder). Retained as historical reference; do not
// run to regenerate the .docx without first rewriting the body content.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  LevelFormat, PageOrientation,
} = require("docx");

const FONT = "Calibri";

const titleStyle = (text) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 240 },
    children: [new TextRun({ text, bold: true, size: 44, font: FONT })],
  });

const subtitleStyle = (text) =>
  new Paragraph({
    spacing: { after: 360 },
    children: [new TextRun({ text, italics: true, size: 24, font: FONT, color: "555555" })],
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, bold: true, size: 32, font: FONT })],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, size: 28, font: FONT })],
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, font: FONT })],
  });

// Body paragraph that supports inline bold/italic via [["text",{bold:true}], ...]
const body = (parts, opts = {}) =>
  new Paragraph({
    spacing: { after: 140 },
    children: (Array.isArray(parts) ? parts : [[parts]]).map(([text, runOpts = {}]) =>
      new TextRun({ text, font: FONT, size: 22, ...runOpts })
    ),
    ...opts,
  });

const numbered = (parts) =>
  new Paragraph({
    numbering: { reference: "field-numbers", level: 0 },
    spacing: { after: 100 },
    children: (Array.isArray(parts) ? parts : [[parts]]).map(([text, runOpts = {}]) =>
      new TextRun({ text, font: FONT, size: 22, ...runOpts })
    ),
  });

const numberedThroughline = (parts) =>
  new Paragraph({
    numbering: { reference: "throughline-numbers", level: 0 },
    spacing: { after: 120 },
    children: (Array.isArray(parts) ? parts : [[parts]]).map(([text, runOpts = {}]) =>
      new TextRun({ text, font: FONT, size: 22, ...runOpts })
    ),
  });

// Convenience: a "Field N — Name. Description." line as a numbered list item.
const fieldEntry = (name, description) =>
  numbered([
    [`${name}. `, { bold: true }],
    [description],
  ]);

// Convenience: a numbered field whose body has multiple TextRun parts.
const fieldEntryRich = (name, parts) =>
  numbered([
    [`${name}. `, { bold: true }],
    ...parts,
  ]);

const children = [
  titleStyle("Sermon Workspace — Field Walkthrough"),
  subtitleStyle(
    "Every field a pastor touches inside a single sermon, in the order the work happens, with how each one feeds the next. Plain English. No internals."
  ),

  body([
    ["You open a sermon slot from the Series Planner and the Sermon Workspace mounts. The series' Big Idea, Series Motivation, Redemptive Context, and the section's Big Idea all come along for the ride — every AI conversation about this sermon already knows the series frame before you type a word."],
  ]),
  body([
    ["The Workspace has six tabs: "],
    ["Study → MPT/MPS → Outline → Functional Elements → Manuscript → Delivery", { bold: true }],
    ["."],
  ]),

  // ── STUDY TAB ─────────────────────────────────────────────────────────
  h1("Study tab"),
  body(
    "The whole exegetical arc. Four sub-phases that build on each other in a strict order — say → mean → points-to-Christ → lands. The text drives the sermon toward Pastoral Context, not the other way around. The text speaks first; the room enters late."
  ),

  h2("Phase 1 — Observe (eight fields). What does the text say?"),
  fieldEntry("Context", "What happened before this passage, what happens after, what that does to this passage, and why the Holy Spirit led the author to write this here."),
  fieldEntry("Surface Questions", "Where, when, how — situational facts on the surface."),
  fieldEntryRich("Divisions / Thought Units", [
    ["The spine of the entire Study tab. ", { bold: true }],
    ["You type the passage by hand, pull subjects and main verbs to the left margin, indent modifiers under what they modify, paraphrase each main sentence in your own words, and mark where each thought unit ends. "],
    ["The thought units you name here become rows in a table that grows across all four phases.", { italics: true }],
    [" This is the single biggest place where one field populates many downstream."],
  ]),
  fieldEntry("Main Characters", "Who's acting and what role each plays."),
  fieldEntry("Commands and Declarations", "For each main sentence, name what it's doing — calling action or naming reality — and say what it's doing in your own words."),
  fieldEntry("Big Ideas", "What concepts the passage is wrestling with."),
  fieldEntry("Obvious Point", "The plain-sense point in one sentence."),
  fieldEntryRich("Possible Implications", [
    ["First, gentle surfacing of the room. ", { bold: true }],
    ["What's the passage starting to press on for your people? What's hard? What's hopeful? You're not drafting application yet — just letting the room enter awareness while the text still leads."],
  ]),

  h2("Phase 2 — Interpret (eight fields). What does the text mean?"),
  fieldEntry("Deeper Context", "Pick up Observe's Context with commentaries and tools in hand. Resolve what was open. Widen to the whole book's argument."),
  fieldEntry("Genre", "Name the literary form and let it set the lens. Optional — only when genre is doing real interpretive work here."),
  fieldEntry("Recurring Ideas", "Words, themes, motifs the author keeps hitting."),
  fieldEntry("Character Purpose", "For each character you named in Observe, why are they doing what they're doing — what is the author signaling through them."),
  fieldEntry("Contrasts", "What is set against what. What each contrast is doing."),
  fieldEntry("Cross-References", "Where else Scripture speaks to this. Concentric circles outward."),
  fieldEntry("Commentary Notes", "Last, to check — not to start. Where the commentaries sharpen, confirm, correct, or where you push back."),
  fieldEntryRich("Interpretation Synthesis", [
    ["The named output of Interpret. ", { bold: true }],
    ["Two parts. (a) A "],
    ["table", { bold: true }],
    [" that pulls in the thought units you named in Observe — read-only — and asks you to fill a single new column: "],
    ["Meaning", { italics: true }],
    [". (b) A "],
    ["one-paragraph", { bold: true }],
    [" synthesis of the whole passage's meaning, in your own voice. This paragraph is what Phase 3 opens against."],
  ]),

  h2("Phase 3 — Redemptive Thread (five fields). How does the text point to Christ?"),
  fieldEntry("This Passage and Christ", "Where the text stands relative to Christ — before, after, transitional. Whether it speaks directly of Christ."),
  fieldEntry("How the Passage Points to Christ", "Four distinct ways: biblical theme, promise, type, predictive prophecy. Some passages carry all four; some carry one; some carry none directly — and that's allowed."),
  fieldEntry("How the Gospel Makes This Possible", "If this text calls the hearer to do, be, or trust something — how do the implications of the gospel make that possible?"),
  fieldEntry("Our Need and God's Character", "Pair what the passage shows about human need for Christ with what it shows about God's character."),
  fieldEntryRich("Christ-Connection Statement", [
    ["The named output of Redemptive Thread. ", { bold: true }],
    ["Two parts again. (a) The "],
    ["same table", { bold: true }],
    [" from Phase 2 reappears — Phase 1 and Phase 2 columns now read-only — with a new column: "],
    ["Christ-Connection", { italics: true }],
    [" per thought unit. (b) A "],
    ["one-paragraph", { bold: true }],
    [" Christ-Connection Statement for the whole passage. Phase 4 opens against this paragraph."],
  ]),

  h2("Phase 4 — Implications (four fields). How does the text land?"),
  body("This phase is a three-way conversation: theology, personal application, and the room. Three voices. One synthesis."),
  fieldEntry("Theological Significance", "What the text teaches about God, about us, about Christ, timeless principles, doctrines."),
  fieldEntry("Personal Implications", "What the text asks of the hearer: Follow, Forsake, Receive, Settle."),
  fieldEntryRich("Pastoral Context", [
    ["The room. ", { bold: true }],
    ["(a) Who specifically in your room is this text speaking into — believers and unbelievers, the wearied, the doubting, the new, the long-faithful. (b) For those specific people, what's the cost and what's the gift. "],
    ["This is the field whose contents ride into every AI conversation about this sermon, alongside the series frame.", { bold: true }],
  ]),
  fieldEntryRich("Implications Synthesis", [
    ["The named output of Implications and the final close on the Study tab. ", { bold: true }],
    ["Two parts. (a) The "],
    ["same table", { bold: true }],
    [" appears one last time — three columns now read-only (Meaning, Christ-Connection, plus the Phase 1 spine) — with the final new column: "],
    ["Implication", { italics: true }],
    [" per thought unit, drawing on all three voices. (b) A "],
    ["one-paragraph", { bold: true }],
    [" Implications Synthesis: what does this text teach, what does it ask, how does it land in this room — all in one voice. "],
    ["This paragraph is what you carry into MPT/MPS.", { italics: true }],
  ]),

  // ── MPT / MPS ─────────────────────────────────────────────────────────
  h1("MPT / MPS Forge (two fields)"),
  body("After Implications, you state the sermon's spine in two lines."),
  body([
    ["MPT — Main Point of the Text", { bold: true }],
    [" (past tense). What the text was saying or doing in its original setting."],
  ]),
  body([
    ["MPS — Main Point of the Sermon", { bold: true }],
    [" (present tense). What this sermon will land on this week, in this room."],
  ]),
  body("The Implications Synthesis paragraph is the substrate MPT/MPS draws from. The AI's role here shifts to challenger — testing whether your MPS actually flows from your MPT or has drifted."),

  // ── OUTLINE ──────────────────────────────────────────────────────────
  h1("Outline Builder"),
  body("You add and reorder outline points for the sermon's structure. The outline syncs to the Outline tab so you can shape it in either place. A Review Outline button asks the AI to check the shape against your MPS."),

  // ── FUNCTIONAL ELEMENTS ──────────────────────────────────────────────
  h1("Functional Elements (per outline point)"),
  body("For each outline point you wrote, three small fields:"),
  body([
    ["Explanation", { bold: true }],
    [" — what the point teaches."],
  ]),
  body([
    ["Application", { bold: true }],
    [" — what it asks of the hearer."],
  ]),
  body([
    ["Illustration", { bold: true }],
    [" — how it lands."],
  ]),
  body("A Review E/A/I Balance button asks the AI whether your sermon is leaning too hard on one of the three across the whole outline."),

  // ── MANUSCRIPT ──────────────────────────────────────────────────────
  h1("Manuscript tab"),
  body([
    ["Free-form writing space organized by Introduction, Transitions (between outline points), and Conclusion. The "],
    ["Tune-Up", { bold: true }],
    [" engine audits a finished manuscript; its most recent reply is saved on the sermon and shown above the Introduction so you can come back to it later. "],
    ["Export to Word", { bold: true }],
    [" drops the whole manuscript out as a .docx."],
  ]),

  // ── DELIVERY ────────────────────────────────────────────────────────
  h1("Delivery tab"),
  body("Pulpit-mode view of the manuscript and outline for use while preaching."),

  // ── THROUGHLINE ─────────────────────────────────────────────────────
  h1("How it all comes together — the throughline"),
  body("Read the whole thing top to bottom and the logic shows up:"),

  numberedThroughline([
    ["The series rides along. ", { bold: true }],
    ["Open a sermon and the series' Big Idea, Series Motivation, Redemptive Context, and section big idea follow you in. Every AI conversation already knows the series."],
  ]),
  numberedThroughline([
    ["Study walks the text in one direction: say → mean → Christ → land. ", { bold: true }],
    ["Observe before Interpret before Redemptive before Implications. The ordering is the discipline. The text speaks first; the room enters last."],
  ]),
  numberedThroughline([
    ["Phase 1 Field 3 is the spine. ", { bold: true }],
    ["The thought units you name in Observe's Divisions / Thought Units don't stay in Phase 1. The same table reappears in Phase 2 (you add Meaning), Phase 3 (you add Christ-Connection), Phase 4 (you add Implication). One row per thought unit. Six columns by the end. You never retype the spine."],
  ]),
  numberedThroughline([
    ["Each phase closes with a synthesis in your own voice. ", { bold: true }],
    ["Interpretation Synthesis, Christ-Connection Statement, Implications Synthesis. These paragraphs are what the next phase opens against — not raw worksheet content. Each phase earns the right to the next."],
  ]),
  numberedThroughline([
    ["Pastoral Context arrives twice — gently, then fully. ", { bold: true }],
    ["Once in Observe Field 8 (Possible Implications) as awareness. Once in Implications Field 3 (Pastoral Context) as the integrated voice. The room enters when the text has done its work, not before."],
  ]),
  numberedThroughline([
    ["Then marinate — return to the passage before you forge. ", { bold: true }],
    ["The Implications Synthesis is the named outcome of Phase 4, and it (with the four named outcomes) is the content substrate MPT/MPS draws from — no AI re-summary, no reaching back into the scattered worksheet answers. But before you forge the Main Point the system sends you back to read the passage through once more: the Implications send-off, the Study→Anchor handoff which now carries the passage, and the MPT draft prompt all point you into the text. The reference pane keeps the passage present beside your work by default the whole way. The foundation has been earned; the saturation is in the text. (Note, 2026-06-10 — pastor's saturation ruling: this item previously read \"Implications Synthesis is the marinate-output\" and called the synthesis the thing you sit with. That conflation is struck — marinate is a return to the PASSAGE, a separate beat, not a relabeling of the synthesis. See CORE Process Contract #6 saturation amendment.)"],
  ]),
  numberedThroughline([
    ["MPT → MPS is the bridge. ", { bold: true }],
    ["Past tense (what the text said) becomes present tense (what this sermon lands)."],
  ]),
  numberedThroughline([
    ["MPS shapes the Outline; the Outline shapes the Functional Elements; the Functional Elements shape the Manuscript. ", { bold: true }],
    ["Each step is a tightening of focus from Big Idea to Sunday morning."],
  ]),
  numberedThroughline([
    ["Underneath all of it, the AI conversation always knows two things: ", { bold: true }],
    ["the series frame (Big Idea, Series Motivation, Redemptive Context) and the room (Phase 4 Field 3 — Pastoral Context). Other context comes and goes depending on what step you're on; those two are always present when there's content in them."],
  ]),

  body([
    ["The sermon, in one line: "],
    ["the text drives the sermon toward the room. Every field in the Sermon Workspace exists to keep that direction honest.", { bold: true }],
  ]),
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
  },
  numbering: {
    config: [
      {
        reference: "field-numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "throughline-numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // US Letter
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    },
  ],
});

const outPath = path.resolve(
  "C:/Projects/SermonForge/docs/PROPOSALS/sermon-workspace-field-walkthrough.docx"
);

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath} (${buffer.length} bytes)`);
});
