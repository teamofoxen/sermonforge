// studyFields.js — Structured field definitions and helpers for the 4-phase exegesis worksheet.
//
// On-disk shape per JSON column (observations / interpretation / redemptive_thread / implications):
//
//   sermon[column] = {
//     [fieldKey]: {
//       [questionKey]: { value: <string|list>, na: <boolean> },
//       ...
//     },
//     ...,
//     legacy_notes?: <string>
//   }
//
// Each field is a sub-object keyed by stable question identifiers. Each
// question's answer is an envelope `{value, na}`. For text-prompt questions
// the value is a string; for structured-exercise questions the value is a
// structured list. na=true means the pastor explicitly marked the question
// as inapplicable; N/A questions are not counted as evidence.
//
// Three structured-list sub-shapes (SFDI Field 4 walked the precedent,
// settled 2026-05-03):
//
//   - Indented sentence canvas (e.g. Field 4 Q1):
//       [{text: <string>, depth: <integer>, kind: <string>}, ...]
//
//   - Paraphrase blocks (e.g. Field 4 Q2):
//       [{main_sentence_id: <string>, paraphrase: <string>}, ...]
//
//   - Synthesis table (e.g. Field 4 Q3) — extended cumulatively across phases:
//       Phase 1 builds: [{thought_unit_summary, after_line, signal}, ...]
//       Phase 2 adds:   meaning
//       Phase 3 adds:   christ_connection
//       Phase 4 adds:   implication
//       Final shape:    [{thought_unit_summary, after_line, signal,
//                         meaning, christ_connection, implication}, ...]
//
// A2.0 is data-layer-only foundation: helpers tolerate the new value types
// (parse / serialize / flatten / evidence). Per-sub-shape composite gates,
// peripheral reference panels, paste-intercept, and the canvas/paraphrase/
// table UI components land in subsequent A2.x sessions and B1+ field walks.
//
// Until SFDI's per-field question sequences land per-phase, every existing
// field has one question keyed `primary` (DEFAULT_QUESTION_KEY).
//
// A free-text-only column value is preserved under `legacy_notes`. An older
// flat string-per-field JSON shape is auto-coerced to envelope shape on read
// — a defensive read path, not a migration; no production sermons exist.

import { tryParse } from "../utils";

// ── Phase 1: Observe ─────────────────────────────────────────────────────────
//
// 7 fields. Outside-in arc through the first three fields:
//   Context → Surface Questions → Divisions / Thought Units
// Then the lens cluster reads against Field 3's spine:
//   Main Characters → Commands and Declarations → Big Ideas
// First synthesis closes the segment:
//   Obvious Point
// (Possible Implications was removed 2026-06-15, Phase 2 — a SermonForge addition cut.)
//
// Retired keys: `commands`, `statements`, `basic_outline`, `background`. The
// `background` field (author/date/audience/genre) was retired 2026-05-05 —
// the world-of-the-book layer was carrying weight better placed in series-
// level Book Study (`book_background`). (The genre slice briefly lived in an
// Interpret Genre field, itself removed 2026-06-15, Phase 2.) Old
// data carrying retired keys stays in the JSON column (parseStructuredField
// preserves them) but does not render under any current field. No production
// sermons exist, so no auto-mapping logic ships.

export const OBSERVE_FIELDS = [
  {
    key: "context",
    label: "Context",
    hint: "Where in the book is this passage, and how does that shape what's happening here?",
    overview: {
      title: "Observe — don't stop at the obvious",
      paragraphs: [
        "Observe is the 'Captain Obvious' phase — read, reread, and note what the text plainly says, before any commentary. One seasoned preacher tells his students to make twenty-five observations on a passage; they're sure it's impossible, then find it isn't. You won't count to twenty-five here — you'll make your observations in the next seven fields.",
      ],
    },
    questions: [
      { key: "before",             mapLabel: "What happened before",     prompt: "What happened before this passage?" },
      { key: "after",              mapLabel: "What happens after",       prompt: "What happens after?" },
      { key: "impact",             mapLabel: "Impact on this passage",   prompt: "Do those answers impact what's happening in this passage? If so, how?" },
    ],
  },
  {
    key: "surface_questions",
    label: "Surface Questions",
    hint: "Stand on the surface and report basic situational facts.",
    // N/A grants (canon §5, SFDI): Where + When may be N/A on passages that
    // genuinely carry neither (epistles); How is not N/A-able.
    questions: [
      { key: "where", mapLabel: "Where", prompt: "Where does this take place?", naAllowed: true },
      { key: "when",  mapLabel: "When",  prompt: "When does this take place?", naAllowed: true },
      { key: "how",   mapLabel: "What's happening, in order", prompt: "What's happening, in order? Walk the events or movement of the passage step by step." },
    ],
  },
  {
    key: "divisions",
    label: "Divisions / Thought Units",
    hint: "How is the passage built? Lay out the main sentences and indent supporting clauses so the structure shows.",
    overview: {
      title: "Divisions / Thought Units",
      paragraphs: [
        "Lay the passage out so the structure shows. This is the first step toward a sermon outline.",
      ],
    },
    // Phase 4 Sprint 2 (2026-05-05): the three legacy questions
    // (sentence_layout / paraphrases / thought_units) collapse into a single
    // unified canvas. Paraphrase renders inline beneath each main row;
    // thought-unit annotation attaches to canvas rows via thought_unit_end.
    // The materialized `thought_units` array (derived on save) is what
    // Phase 2/3/4 cross-phase reads continue to consume — load-bearing
    // invariant preserved.
    questions: [
      {
        key: "canvas",
        kind: "indented-canvas",
        mapLabel: "Lay out the passage's structure",
        prompt: "Type the passage by hand. Push each main statement to the left margin. Indent supporting words and phrases beneath what they support. When two statements run in parallel, line them up at the same level so the structure shows.",
      },
    ],
  },
  { key: "characters",            label: "Main Characters",           hint: "Who's acting in this passage? For each character, name their role." },
  { key: "commands_declarations", label: "Commands and Declarations", hint: "Go through the passage and note where it tells the hearer to do something (commands) and where it states what is true (declarations)." },
  { key: "big_ideas",             label: "Big Ideas",                 hint: "What concepts is the passage wrestling with? List them. For each, a one-line note on how it shows up." },
  { key: "obvious_point",         label: "Obvious Point",             hint: "State the plain-sense point of the passage in one sentence." },
];

// ── Phase 2: Interpret ───────────────────────────────────────────────────────
//
// 7 fields. Reshaped to 7 per SFDI Phase 2 walk (2026-05-03), shipped as SPRD
// B2.0 (2026-05-04). (Genre was added 2026-05-05 as a light optional field, then
// removed 2026-06-15 in the Phase-2 Merida surgery — a SermonForge addition cut.)
// Merida four-part arc through the seven fields:
//   Deeper Context → Recurring Ideas → Character Purpose → Contrasts
//   → Cross-References → Commentary Notes (last, to check) → Interpretation Synthesis
//
// Retired keys from the prior shape: `context_impact`, `characters`, `diagram`,
// `summarize_parts`, `summarize_whole` are no longer iterated as fields. Old
// data carrying these keys stays in the JSON column (parseStructuredField
// preserves them) but does not render. Per the defensive-only migration
// policy in SPRD § 9 (no production sermons exist 2026-05-04), no auto-mapping
// logic ships; the per-key cross-mapping in SPRD § 9 documents how it would
// land if a future test fixture or import surfaces such data:
//   - `context_impact` → `deeper_context.legacy_notes`
//   - `characters`     → `character_purpose.legacy_notes`
//   - `diagram`        → cross-phase move to Phase 1 Field 4
//                        (`observations.divisions.legacy_notes`) because Q1's
//                        canvas absorbed the structural-diagram work
//   - `summarize_parts` + `summarize_whole` → merged into
//                        `interpretation_synthesis.legacy_notes`
//
// B2.0 keeps a single primary question per field (multi-question wiring lands
// in B2.1+ as the per-field walks are wired in). Field 1 Deeper Context will
// gain its 2-question sequence (`unresolved`, `book_argument`) under B2.1;
// Field 7 Interpretation Synthesis lands in B2.2 with the heavy-lifting
// overview + 2 questions (`meaning_per_unit` extending the synthesis-table
// sub-shape with a Meaning column, `meaning_whole` text-prompt). The Field 7
// composite gate at the Interpret → Redemptive Thread threshold lands with B2.2.

export const INTERPRET_FIELDS = [
  {
    key: "deeper_context",
    label: "Deeper Context",
    hint: "Observe's Context field placed the passage in its book. Now go deeper — what unresolved questions does the passage still raise, and how does it fit the book's larger argument?",
    questions: [
      { key: "unresolved",     mapLabel: "Unresolved questions",           prompt: "What questions about this passage are still unresolved after Observe — and what can you answer about them now?" },
      { key: "book_argument",  mapLabel: "Fit in the book's argument",     prompt: "How does this passage fit the book's overall argument? What does the author intend across the whole that bears on this passage?" },
    ],
  },
  { key: "recurring_ideas",         label: "Recurring Ideas",         hint: "What ideas, words, or themes recur within this passage? For each, name what the recurrence is signaling about what the author is hammering home." },
  { key: "character_purpose",       label: "Character Purpose",       hint: "For each character you named in Observe, what are they saying, doing, or thinking — and why? What is the author signaling through their action?" },
  { key: "contrasts",               label: "Contrasts",               hint: "What contrasts has the author built into the passage? Name each — what's set against what — and say in your own words what each contrast is doing." },
  // N/A grants (canon §5, SFDI): Cross-References + Commentary Notes may be
  // field-level N/A when the pastor genuinely has no access (rare). Field-level
  // naAllowed rides onto the synthesized primary question via normalizeField.
  { key: "cross_refs",              label: "Cross-References", naAllowed: true, hint: "For the key ideas, themes, and moves you've already named in this passage, where else does Scripture speak to them? Move outward in concentric circles — same book, same author, same testament, wider canon. For each, name what it adds." },
  { key: "commentary",              label: "Commentary Notes", naAllowed: true, hint: "Now — last, to check, not to start — what do the commentaries say? Note insights that sharpen, confirm, or correct what you've worked out. Note where you disagree, and why." },
  {
    key: "interpretation_synthesis",
    label: "Interpretation Synthesis",
    hint: "Articulate what the passage MEANS — per thought unit and as a whole — in your own voice. The Interpretation Set lives here.",
    overview: {
      title: "Interpretation Synthesis",
      paragraphs: [
        "You've widened the lens, named what recurs, traced character motives, surfaced contrasts, opened the wider canon, and checked against the commentaries last. The Interpret work is mostly done.",
        "One more move closes Interpret. For each thought unit — what does it MEAN? Not what it says (Observe). Not what it sounds like in your own words (also Observe). What the author is conveying through it. Then the whole passage in one paragraph, in your own voice.",
        "What you produce here is the Interpretation Set. Redemptive Thread opens against it.",
      ],
    },
    questions: [
      {
        key: "meaning_per_unit",
        kind: "cumulative-synthesis-table",
        mapLabel: "Meaning per thought unit",
        prompt: "Beside each thought unit you named in Observe, write what it MEANS in your own voice. One or two sentences each. Not what it says — what the author is conveying through it.",
        // The cumulative thought-unit list is canonical in Phase 1's
        // observations.divisions.thought_units. Phase 2 reads + writes the
        // same array, adding a `meaning` column to each row. Phase 3 + 4
        // extend this same array with christ_connection + implication.
        crossPhaseSource: {
          column: "observations",
          fieldKey: "divisions",
          questionKey: "thought_units",
        },
        columns: [
          { key: "thought_unit_text", label: "Thought unit", kind: "textarea", readOnly: true },
          { key: "meaning",           label: "Meaning",      kind: "textarea", placeholder: "What is the author conveying through this thought unit?" },
        ],
      },
      {
        key: "meaning_whole",
        mapLabel: "The Interpretation Set — whole-passage meaning",
        prompt: "One paragraph. The whole passage's meaning, in your own voice. What is the author saying through this passage about reality? This is the Interpretation Set. Redemptive Thread opens against it.",
      },
    ],
  },
];

// ── Phase 3: Redemptive Thread ───────────────────────────────────────────────
//
// Reshaped to 5 fields per SFDI Phase 3 walk (2026-05-04), shipped as SPRD
// B3.0 + B3.1 (2026-05-04). The Merida arc through the five fields:
//   This Passage and Christ → How the Passage Points to Christ
//   → How the Gospel Makes This Possible → Our Need and God's Character
//   → Christ-Connection Statement
//
// Aggressive consolidation paired with restoration. Three clusters merged
// (Position + Direct Christ-speech; Biblical Theme + Promise + restored Type
// + restored Predictive; Need + Character). Three Merida questions restored
// (Q4 gospel-makes-commands-possible, Q5 type-of-Christ, Q8 predictive-of-
// Christ). Q3 (NT use of OT) folded into Field 1 as positional. Summary
// slot elevated to Field 5 (Christ-Connection Statement) as the named
// outcome. *Jesus the Hero of the Passage* absorbed into Field 5.
//
// Retired keys from the prior shape: `speaks_of_christ`, `relation_to_christ`,
// `biblical_theme`, `promise`, `need_for_christ`, `nature_of_god`, `jesus_hero`
// are no longer iterated as fields. Old data on retired keys is preserved
// in the JSON column by `parseStructuredField` but no longer renders. Per
// the defensive-only migration policy in SPRD § 9 (no production sermons
// exist 2026-05-04), no auto-mapping logic ships; the per-key cross-mapping
// in § 9 documents how it would land:
//   - `speaks_of_christ` + `relation_to_christ` → `this_passage_and_christ.legacy_notes`
//   - `biblical_theme` + `promise`              → `passage_points_to_christ.legacy_notes`
//   - `need_for_christ` + `nature_of_god`       → `need_and_character.legacy_notes`
//   - `jesus_hero`                              → `christ_connection_statement.legacy_notes`
//
//
// Heavy-lifting `overview` blocks (B1.3 pattern) — formerly consumed by
// `FieldOverviewScreen.jsx` on first per-sermon entry; that component was
// deleted in the post-sweep audit Chunk 3 (2026-05-18) as an orphan. Since
// 2026-06-10 (UX overhaul T18) the blocks are LIVE again: FieldTeaching.jsx
// renders title + paragraphs on the pastor's first visit to each field.
//   - Field 2 (How the Passage Points to Christ) — overview frames the four
//     pointing-mechanisms (theme, promise, type, predictive) and the
//     anti-allegory discipline.
//   - Field 5 (Christ-Connection Statement) — overview frames the synthesis
//     work; per-unit cumulative-column extension + whole-passage Statement
//     ship in B3.2 (single primary question at B3.0 + B3.1).

export const REDEMPTIVE_FIELDS = [
  {
    key: "this_passage_and_christ",
    label: "This Passage and Christ",
    hint: "Position the text in relation to Christ. Locate it in the redemptive arc and surface any explicit content about Christ.",
    overview: {
      title: "This Passage and Christ",
      paragraphs: [
        "Redemptive Thread opens with positioning. Before tracing how the passage points to Christ, locate where it stands in relation to him.",
        "Two questions. First: where does the text sit relative to Christ — before, after, or transitional? For Old Testament passages, where does the New Testament pick this up? Second: does the text speak about Christ directly — and if so, how?",
        "Both questions can be 'no' for some passages, and that's fine. Mark what's there. The work of tracing how the passage points to Christ comes in the next field.",
      ],
    },
    questions: [
      { key: "position",      mapLabel: "Where it stands relative to Christ", prompt: "Where does this text stand in relation to Christ — before, after, or transitional? For OT passages, where does the New Testament pick this up? (If nothing picks it up directly, say so — that's a real answer.)" },
      { key: "direct_speech", mapLabel: "Does it speak directly of Christ",   prompt: "Does this text speak directly of Christ? If so, how? (A plain 'no' is a real answer for many passages — write it and move on.)" },
    ],
  },
  {
    key: "passage_points_to_christ",
    label: "How the Passage Points to Christ",
    hint: "Look for how the text points to Christ — four ways: a theme, a promise, a pattern, or a prophecy.",
    overview: {
      title: "How the Passage Points to Christ",
      paragraphs: [
        "You've placed the text in relation to Christ. Now look for how it points to him. Scripture does this four ways: a theme, a promise, a pattern, or a prophecy.",
        "A theme is a thread that runs through Scripture and finds its full weight in Christ — kingdom, sacrifice, covenant, the presence of God. A promise is a word from God that comes true in Christ. A pattern (the old word is 'type') is a person or a shape of events that Christ later fills out and exceeds — Adam, Melchizedek, Moses, David. A prophecy foretells Christ directly — his coming, his death, his return.",
        "Some passages carry all four. Some carry one. Some carry none directly — and that's fine. Where the text doesn't carry one, say so and move on. Don't insert Christ where he isn't. The text leads.",
      ],
    },
    // N/A grants (canon §5, SFDI): the four pointing-mechanisms are genre-
    // uneven — some passages carry all four, some none. Each may be N/A where
    // the text genuinely doesn't carry that kind of pointing ("don't force").
    questions: [
      { key: "biblical_theme", mapLabel: "Theme",          prompt: "Does the passage carry a theme that finds its weight in Christ? (Kingdom, the presence of God, sacrifice, covenant, the Word of God…)", naAllowed: true },
      { key: "promise",        mapLabel: "Promise",        prompt: "Does the passage hold or echo a promise of God that comes true in Christ?", naAllowed: true },
      { key: "type",           mapLabel: "Pattern (type)", prompt: "Is there a pattern here that Christ later fills out and exceeds — a person, an office, a shape of events? (Adam, Melchizedek, Moses, David…)", naAllowed: true },
      { key: "predictive",     mapLabel: "Prophecy",       prompt: "Does the passage foretell Christ directly — his coming, his death, his return?", naAllowed: true },
    ],
  },
  {
    key: "gospel_makes_possible",
    label: "How the Gospel Makes This Possible",
    hint: "The anti-moralism move — name the call of the text, then ground it in what Christ has already secured.",
    // Two moves, two questions (audit ruling 2026-07-02: the old single
    // synthesized prompt blurred diagnosis and gospel grounding). The first
    // keeps the legacy `primary` key so any answer written under the old
    // one-prompt shape stays visible under the question it best fits.
    questions: [
      { key: "primary",           mapLabel: "The call of the text",              prompt: "What is this passage calling the hearer to do, be, or trust?" },
      { key: "enabled_by_gospel", mapLabel: "How the gospel makes it possible",  prompt: "How does the gospel make that possible? (Access to God, the indwelling Spirit, continual forgiveness, union with Christ.) Every demand the text makes rests on what Christ has already secured — say how." },
    ],
  },
  {
    key: "need_and_character",
    label: "Our Need and God's Character",
    hint: "Pair what the text shows about human need for Christ with what it shows about God's character.",
    questions: [
      { key: "human_need",    mapLabel: "Our need for Christ", prompt: "How does this passage show mankind's need for Christ?" },
      { key: "god_character", mapLabel: "God's character",     prompt: "How does this passage reveal the nature of the God who provides redemption?" },
    ],
  },
  {
    key: "christ_connection_statement",
    label: "Christ-Connection Statement",
    hint: "How does the whole passage point to Christ — and how is Christ the hero of it? One paragraph, in your own voice.",
    overview: {
      title: "Christ-Connection Statement",
      paragraphs: [
        "You've placed the text in relation to Christ, traced how it points to him, grounded the gospel's enabling power, and named human need alongside God's character. One move closes Redemptive Thread: say it.",
        "For each thought unit — how does it point to Christ, find its weight in him, or get its answer from him? Then the whole passage, one paragraph: the Christ-Connection Statement. Implications opens against it.",
        "The evaluation question lives here: did this sermon testify to Christ? And more than on paper — how does Jesus, through this passage, become a safe place for sinners and a dangerous place for sin? How does it lead us to obey him not out of fear, but because he is better?",
      ],
    },
    questions: [
      {
        key: "christ_per_unit",
        kind: "cumulative-synthesis-table",
        mapLabel: "Christ-Connection per thought unit",
        prompt: "Beside each thought unit (with its Meaning from Interpret), write the Christ-connection. How does this thought unit point to Christ, find its weight in him, or get its answer from him?",
        // Phase 3 extends the same canonical thought-unit array in
        // observations.divisions.thought_units with a third writable column
        // (christ_connection). Phase 1 + Phase 2 columns render read-only;
        // Phase 4 will add `implication`.
        crossPhaseSource: {
          column: "observations",
          fieldKey: "divisions",
          questionKey: "thought_units",
        },
        columns: [
          { key: "thought_unit_text",  label: "Thought unit",       kind: "textarea", readOnly: true },
          { key: "meaning",            label: "Meaning",            kind: "textarea", readOnly: true },
          { key: "christ_connection",  label: "Christ-Connection",  kind: "textarea", placeholder: "How does this thought unit point to, find its weight in, or get its answer from Christ?" },
        ],
      },
      {
        key: "statement",
        mapLabel: "The Christ-Connection Statement",
        prompt: "One paragraph. How does the whole passage point to Christ — and how is Christ the hero of it? What does it show him to be better than — more beautiful, more worthy? Write it so a listener could not only see Christ, but want him. This is the Christ-Connection Statement. Implications opens against it.",
      },
    ],
  },
];
// REDEMPTIVE_SUMMARY_KEY removed in the trail deletion sweep — see the
// note above the flattenToText deletion site.

// ── Phase 4: Implications ────────────────────────────────────────────────────
//
// Reshaped to 4 fields per SFDI Phase 4 walk (2026-05-04), shipped as SPRD
// B4.0 + B4.1 (2026-05-04). The three-way conversation realized at field
// level (Theological Significance + Personal Implications + Pastoral Context),
// integrated by Field 4 (Implications Synthesis) as the named outcome:
//   Theological Significance → Personal Implications → Pastoral Context
//   → Implications Synthesis
//
// Aggressive consolidation realizing the SPRD/SFDI three-way conversation
// commitment articulated in the charter. PC moves from parallel-track top-of-
// workspace card to integrated voice in the conversation. The Compiled list
// AI synthesis is retired — the Implications Synthesis IS the synthesis, in
// the pastor's own voice (not AI-generated). The "Implications for Unbeliever"
// slot is folded into Pastoral Context Q1 (the room includes everyone). Each
// voice gets its dedicated field; the synthesis integrates all three.
//
// Retired keys from the prior shape: the 5 IMPLICATIONS_THEOLOGICAL keys
// (about_god, about_ourselves, about_christ, timeless, doctrines), the 8
// IMPLICATIONS_PERSONAL keys (examples, commands, errors, sins, promises,
// new_thoughts, explore, convictions), and IMPLICATIONS_UNBELIEVER_KEY +
// IMPLICATIONS_COMPILED_KEY top-level keys. Old data on retired keys is
// preserved in the JSON column by `parseStructuredField` but no longer
// renders. Per the defensive-only migration policy in SPRD § 9 (no production
// sermons exist 2026-05-04), no auto-mapping logic ships; the per-key cross-
// mapping in § 9 documents how it would land:
//   - 5 IMPLICATIONS_THEOLOGICAL keys → `theological_significance` Q1–Q5
//     (same question keys at SFDI's request — Merida's 5 questions preserved
//     intact; only the field-grouping changes)
//   - 8 IMPLICATIONS_PERSONAL keys   → `personal_implications.legacy_notes`
//     (Merida's 8 questions consolidated into 4 verb-driven questions:
//     Follow / Forsake / Receive / Settle, absorbing Examples+Commands /
//     Errors+Sins / Promises+New Thoughts / Explore+Convictions)
//   - IMPLICATIONS_UNBELIEVER_KEY    → `pastoral_context.legacy_notes`
//     (folded into Field 3 Q1 "the room includes everyone")
//   - IMPLICATIONS_COMPILED_KEY      → `implications_synthesis.legacy_notes`
//     (Compiled list AI synthesis retired; Field 4 carries the synthesis
//     in the pastor's own voice)
//
// Heavy-lifting `overview` blocks (B1.3 pattern) — formerly consumed by
// `FieldOverviewScreen.jsx` (deleted in Chunk 3, 2026-05-18; see the
// matching note above). Live again since 2026-06-10 (T18): rendered by
// FieldTeaching.jsx on first field visit.
//   - Field 4 (Implications Synthesis) — overview frames the integration
//     of the three voices and the Merida marinate moment. Per-unit
//     cumulative-column extension (`implication`) + whole-passage Synthesis
//     ship in B4.2 (single primary question at B4.0 + B4.1).

export const IMPLICATIONS_FIELDS = [
  {
    key: "theological_significance",
    label: "Theological Significance",
    hint: "The first of three voices: what the text TEACHES. Articulate the doctrinal content the passage carries.",
    overview: {
      title: "Implications — The Three-Voice Conversation",
      paragraphs: [
        "Implications closes the Study work by integrating three voices: what the text TEACHES (Theological Significance), what it ASKS of the hearer (Personal Implications), and the ROOM it lands in (Pastoral Context). The Implications Synthesis at the end weaves them together in your own voice.",
        "Theological Significance comes first: the doctrine the text carries. What does it say about God, about us, about Christ? The order matters — doctrine grounds the personal call, and the personal call grounds the room-specific landing.",
      ],
    },
    // N/A grants (canon §5, SFDI Implications Field 1): each doctrinal question
    // may be N/A where the text genuinely doesn't carry that teaching (e.g. a
    // passage that doesn't address Christ's person directly).
    questions: [
      { key: "about_god",       mapLabel: "About God",           prompt: "What does this text teach about God?", naAllowed: true },
      { key: "about_ourselves", mapLabel: "About ourselves",     prompt: "What does it teach about ourselves?", naAllowed: true },
      { key: "about_christ",    mapLabel: "About Christ",        prompt: "What does it teach about Christ — his person, his work, his nature? (This is doctrine the text teaches about him — different from the Christ-Connection you just traced, which was how the passage points to him.)", naAllowed: true },
      { key: "timeless",        mapLabel: "Timeless principles", prompt: "What principles in this text are timeless for us?", naAllowed: true },
      { key: "doctrines",       mapLabel: "Particular doctrines", prompt: "What does the passage teach about particular doctrines?", naAllowed: true },
    ],
  },
  {
    key: "personal_implications",
    label: "Personal Implications",
    hint: "The second of three voices: what the text ASKS of the hearer. Articulate what the passage calls them to do, forsake, receive, and settle into.",
    overview: {
      title: "Personal Implications — and how firmly the text holds them",
      paragraphs: [
        "The second of three voices: what the text ASKS of the hearer — to follow, forsake, receive, and settle into. Name these from the text, not from your own hobby-horses.",
        "As you name each, weigh how firmly the text holds it: necessary — the text demands it, and you can preach it as God's own word; probable — strongly suggested; possible — defensible, but never preached as a command. Application is where a sermon most easily overreaches; this gradient keeps yours honest. (You'll weigh your actual applications in Body later — here, just hold each implication against it.)",
      ],
    },
    // N/A grants (canon §5, SFDI Implications Field 2): each verb-slot may be
    // N/A where the text genuinely makes no such call (not every passage calls
    // the hearer to follow AND forsake AND receive AND settle).
    questions: [
      { key: "follow",  mapLabel: "To do or follow",  prompt: "What does the text call the hearer to do or follow? (Examples to imitate, commands to keep.)", naAllowed: true },
      { key: "forsake", mapLabel: "To forsake",       prompt: "What does the text warn against? (Errors to avoid, sins to forsake.)", naAllowed: true },
      { key: "receive", mapLabel: "To receive",       prompt: "What does the text invite the hearer to receive? (Gospel promises to claim, fresh thoughts about God to gain.)", naAllowed: true },
      { key: "settle",  mapLabel: "To settle into",   prompt: "What does the text ask the hearer to settle into? (Truths or doctrines to explore, convictions to live by.)", naAllowed: true },
    ],
  },
  {
    key: "pastoral_context",
    label: "Pastoral Context",
    hint: "The third of three voices: the SPECIFIC ROOM the text is landing in. Name the people, then articulate how the text lands for them — costly and gifted.",
    overview: {
      title: "Pastoral Context",
      paragraphs: [
        "The third voice is your room. The text has spoken and made its ask; now name the people it lands on this Sunday.",
        "Reach both kinds of listener: the prodigal — openly lost or wandering — and the older brother — faithful-looking, but quietly trusting his own performance instead of grace. A gospel word reaches both. Get specific: the wearied, the doubting, the new, the long-faithful, the one keeping score.",
      ],
    },
    questions: [
      { key: "room_specifics", mapLabel: "The people in the room", prompt: "Who in your room is this text speaking into? Name specific people and situations — both the openly wandering and the quietly self-reliant." },
      { key: "cost_and_gift",  mapLabel: "Cost and gift",          prompt: "For those specific people, what's the cost — what will be hard, costly, counter-intuitive? And what's the gift — the comfort, hope, freedom, or invitation this text holds out for them?" },
    ],
  },
  {
    key: "implications_synthesis",
    label: "Implications Synthesis",
    hint: "Integrate the three voices for the whole passage — what does the text teach, what does it ask, and how does it land for the people in this room. One paragraph in your own voice.",
    overview: {
      title: "Implications Synthesis",
      paragraphs: [
        "You've named what the text teaches (Theological Significance), what it asks (Personal Implications), and the room it lands in (Pastoral Context). One more move closes the Study work: integrate them.",
        "For each thought unit — what does it ask of THIS hearer in THIS room? Then the whole passage, one paragraph: what the text teaches, what it asks, and how it lands for your people, all in one voice. Not three sections. One synthesis.",
        "Now marinate. Before you move to the Main Point, step back and read the passage through once more — slowly, the way you read it at the start. The Main Point should rise from the text, not only from your notes. The passage is on the reference pane beside you (the Open Bible button brings it back if you've collapsed it); your four named outcomes are a flip away on its 'Your work' tab. Let the text breathe on you before you forge.",
      ],
    },
    questions: [
      {
        key: "implication_per_unit",
        kind: "cumulative-synthesis-table",
        mapLabel: "Implication per thought unit",
        prompt: "Beside each thought unit (with its Meaning from Interpret and Christ-Connection from Redemptive Thread), write the integrated implication. Drawing on Theological Significance + Personal Implications + Pastoral Context — what does this thought unit ask of the hearer in THIS room?",
        // Phase 4 extends the same canonical thought-unit array in
        // observations.divisions.thought_units with the final writable column
        // (implication). Phase 1/2/3 columns render read-only.
        crossPhaseSource: {
          column: "observations",
          fieldKey: "divisions",
          questionKey: "thought_units",
        },
        columns: [
          { key: "thought_unit_text",   label: "Thought unit",       kind: "textarea", readOnly: true },
          { key: "meaning",             label: "Meaning",            kind: "textarea", readOnly: true },
          { key: "christ_connection",   label: "Christ-Connection",  kind: "textarea", readOnly: true },
          { key: "implication",         label: "Implication",        kind: "textarea", placeholder: "What does this thought unit ask of the hearer in THIS room?" },
        ],
      },
      {
        key: "synthesis",
        mapLabel: "The Implications Synthesis",
        prompt: "One paragraph. Integrate the three voices for the whole passage. What does the text teach, what does it ask, and how does it land for the people in this room — all in one voice. Not three sections. One synthesis. This is the Implications Synthesis. Anchor — where you forge the Main Point of the Text and Main Point of the Sermon (MPT/MPS) — opens against it.",
      },
    ],
  },
];

// Overview subtitles removed 2026-06-10 — internal "Field N of M" scaffolding;
// the teaching layer renders the overview body only.

// IMPLICATIONS_UNBELIEVER_KEY and IMPLICATIONS_COMPILED_KEY removed in the
// trail deletion sweep — see the note above the flattenToText deletion site.

// Cumulative-column keys written into the canonical thought-unit array
// (`observations.divisions.thought_units`) by Phase 2 (`meaning`), Phase 3
// (`christ_connection`), and Phase 4 (`implication`). Single source of truth
// — `flattenAnswerValue` reads them when surfacing synthesis-table rows for
// evidence text; `SynthesisTable` reads them to detect rows that carry
// cross-phase work before allowing a destructive delete.
export const CUMULATIVE_COLUMN_KEYS = Object.freeze(["meaning", "christ_connection", "implication"]);

// A per-thought-unit cumulative cell (Meaning / Christ-Connection / Implication)
// is SATISFIED when it has text OR the pastor marked it N/A per-cell — the
// honest "nothing here" gesture (ruled 2026-06-14, canon §5 rule 2c). The flag
// is a `<column>_na: true` sidecar on the thought-unit row (the same shape the
// manuscript redemptive_note uses; the rows are plain objects, not {value,na}
// envelopes). The whole-passage synthesis paragraphs stay no-N/A (rule 1) —
// they're separate text-prompt questions, not table cells.
export function cumulativeCellSatisfied(row, columnKey) {
  if (!row || typeof row !== "object") return false;
  const v = row[columnKey];
  if (typeof v === "string" && v.trim()) return true;
  return row[`${columnKey}_na`] === true;
}

// Default question key used until a field's SFDI question sequence lands.
export const DEFAULT_QUESTION_KEY = "primary";

// (fieldQuestions removed 2026-07-02, Track A: dead public export with zero
// callers — its only historical caller `flattenToText` was deleted in the
// trail-deletion sweep. The live field→questions normalizer is
// `walkOrder.normalizeField`, which also carries mapLabel + naAllowed onto the
// synthesized primary question.)

// Top-level keys reserved for non-field metadata (not iterated as fields).
const RESERVED_TOP_KEYS = new Set(["legacy_notes"]);

// ── Per-question helpers ─────────────────────────────────────────────────────

// Read a question's answer value. Returns "" when missing or N/A.
export function getQuestionAnswer(fieldData, fieldKey, questionKey = DEFAULT_QUESTION_KEY) {
  const field = fieldData?.[fieldKey];
  if (!field || typeof field !== "object") return "";
  const q = field[questionKey];
  if (!q || typeof q !== "object") return "";
  if (q.na) return "";
  return q.value ?? "";
}

/**
 * Read the tightened Main Point of the Text + Main Point of the Sermon from a
 * parsed `main_point_pair` envelope — the single canonical accessor for the two
 * named Main Point outcomes. The Word export (`buildManuscriptExportPayload`)
 * and the reference pane both read through here, so the field/question keys live
 * in one place. Returns "" for a missing, N/A, or not-yet-tightened answer (via
 * `getQuestionAnswer`). The value is returned untrimmed — the export keeps it
 * verbatim so its payload shape is unchanged; display callers may `.trim()`.
 * @param {object} mppData parsed main_point_pair (from parseStructuredField)
 * @returns {{ mpt: string, mps: string }}
 */
export function getTightenedMainPoints(mppData) {
  return {
    mpt: String(getQuestionAnswer(mppData, "mpt", "tighten") ?? ""),
    mps: String(getQuestionAnswer(mppData, "mps", "tighten") ?? ""),
  };
}

// String-guarded read for textarea / pause-clearing display. Returns "" for
// missing, N/A, or non-string values (e.g., the array shapes used by
// unified-canvas fields).
export function getQuestionString(fieldData, fieldKey, questionKey = DEFAULT_QUESTION_KEY) {
  const v = getQuestionAnswer(fieldData, fieldKey, questionKey);
  return typeof v === "string" ? v : "";
}

// Read a question's N/A flag.
export function isQuestionNA(fieldData, fieldKey, questionKey = DEFAULT_QUESTION_KEY) {
  const field = fieldData?.[fieldKey];
  if (!field || typeof field !== "object") return false;
  return !!field[questionKey]?.na;
}

// Set a question's answer value. Returns a new fieldData object (immutable).
// Preserves the question's existing N/A flag.
export function setQuestionAnswer(fieldData, fieldKey, questionKey, value) {
  const next = { ...(fieldData || {}) };
  const existingField = next[fieldKey] && typeof next[fieldKey] === "object" ? next[fieldKey] : {};
  const existingQ = existingField[questionKey] && typeof existingField[questionKey] === "object" ? existingField[questionKey] : {};
  next[fieldKey] = {
    ...existingField,
    [questionKey]: { value, na: !!existingQ.na },
  };
  return next;
}

// Set a question's N/A flag. When marked N/A, the value is preserved (so the
// pastor can unmark and recover their work) but is not counted as evidence.
export function setQuestionNA(fieldData, fieldKey, questionKey, na) {
  const next = { ...(fieldData || {}) };
  const existingField = next[fieldKey] && typeof next[fieldKey] === "object" ? next[fieldKey] : {};
  const existingQ = existingField[questionKey] && typeof existingField[questionKey] === "object" ? existingField[questionKey] : {};
  next[fieldKey] = {
    ...existingField,
    [questionKey]: { value: existingQ.value ?? "", na: !!na },
  };
  return next;
}

// Convenience: set the default question's value for a field.
export function setPrimaryAnswer(fieldData, fieldKey, value) {
  return setQuestionAnswer(fieldData, fieldKey, DEFAULT_QUESTION_KEY, value);
}

// Convenience: read the default question's value for a field.
export function getPrimaryAnswer(fieldData, fieldKey) {
  return getQuestionAnswer(fieldData, fieldKey, DEFAULT_QUESTION_KEY);
}

// ── Phase 1 Field 3 unified-canvas helpers (Phase 4 Sprint 2) ──────────────
//
// Field 3's three legacy questions (sentence_layout / paraphrases /
// thought_units) collapse into a single canvas where each row carries the
// structural text plus inline paraphrase and an optional thought_unit_end
// marker. Per-row UUIDs are the merge key when the canvas changes — Phase 2/3/4
// cumulative columns survive insert/delete/reorder by matching on
// `_canvas_row_id`, with a positional `after_line` fallback for legacy data
// that predates the unification.

// True when a prior thought-unit entry carries typed synthesis work (text or
// a per-cell N/A mark) in any cumulative column — the signal that dropping
// this row would be input-wiping destruction under Mutation #4, not a no-op.
function hasCumulativeWork(entry) {
  if (!entry || typeof entry !== "object") return false;
  return CUMULATIVE_COLUMN_KEYS.some(
    (key) => (typeof entry[key] === "string" && entry[key].trim() !== "") || entry[`${key}_na`] === true
  );
}

// Derive the thought_units array from an indented-canvas array. Per ruling 8:
// every depth-0 row with non-empty text is a thought unit; childless mains
// still count; empty-text mains are skipped (no phantom units) UNLESS a prior
// entry for that same row already carries cumulative synthesis work — a line
// typed empty (Enter-split at position 0, a cleared line) is still on screen,
// so the Meaning/Christ-Connection/Implication work already attached to it
// must not vanish (Mutation #4: destruction with no Delete button is still
// destruction). Cumulative columns merge by `_canvas_row_id` only — the
// legacy after_line positional fallback is retired with the unified canvas.
// Output row shape:
//   { thought_unit_text, _canvas_row_id, ...cumulative }
export function deriveThoughtUnitsFromCanvas(canvas, existingThoughtUnits = []) {
  if (!Array.isArray(canvas) || canvas.length === 0) return [];
  const existing = Array.isArray(existingThoughtUnits) ? existingThoughtUnits : [];
  const byRowId = new Map();
  for (const e of existing) {
    if (e && typeof e === "object" && typeof e._canvas_row_id === "string" && e._canvas_row_id) {
      byRowId.set(e._canvas_row_id, e);
    }
  }
  const out = [];
  for (const row of canvas) {
    if (!row || typeof row !== "object") continue;
    const depth = Number.isInteger(row.depth) && row.depth >= 0 ? row.depth : 0;
    if (depth !== 0) continue;
    const rowId = typeof row.id === "string" ? row.id : "";
    const prior = rowId ? byRowId.get(rowId) : null;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text && !hasCumulativeWork(prior)) continue;
    const derived = {
      thought_unit_text: text || (prior?.thought_unit_text ?? ""),
      _canvas_row_id: rowId,
    };
    for (const key of CUMULATIVE_COLUMN_KEYS) {
      if (prior && typeof prior[key] === "string" && prior[key].trim()) {
        derived[key] = prior[key];
      }
      // Preserve the per-cell N/A flag across canvas re-derivation — the honest
      // "nothing here" gesture must survive a canvas edit, exactly as the cell's
      // text does (merged by _canvas_row_id).
      if (prior && prior[`${key}_na`] === true) {
        derived[`${key}_na`] = true;
      }
    }
    out.push(derived);
  }
  return out;
}

// Which canvas row ids currently carry cumulative synthesis work. The canvas
// UI consults this before applying a gesture that would drop a row out of
// the depth-0 set entirely (indent, or a Backspace merge that removes the
// row from the array) — those two cases can't be auto-preserved the way an
// emptied-but-still-present row can, so the UI gates them on a confirm
// instead (Mutation #4's two-step floor for row-level destruction).
export function canvasRowIdsWithCumulativeWork(thoughtUnits) {
  const ids = new Set();
  if (!Array.isArray(thoughtUnits)) return ids;
  for (const e of thoughtUnits) {
    if (e && typeof e === "object" && typeof e._canvas_row_id === "string" && e._canvas_row_id && hasCumulativeWork(e)) {
      ids.add(e._canvas_row_id);
    }
  }
  return ids;
}

// ── Thought-unit blocks (ruled 2026-07-02) ─────────────────────────────────
//
// A thought unit IS the block: the margin (depth-0) statement PLUS every line
// indented beneath it, spanning the verses it covers. The margin line marks
// where a unit begins — it is not the unit. (The pre-ruling code used the
// depth-0 row as both the unit's boundary marker AND its entire content,
// which amputated the supporting lines from every downstream table.)
//
// The stored thought_units array stays exactly as ruling 8 shaped it —
// identity (_canvas_row_id = the margin row) + header text + cumulative
// columns. The block is NOT materialized into storage; it is composed at
// read time from the canvas, matched by _canvas_row_id, so a canvas edit
// can never leave a stale block behind and existing sermons need no
// migration. Composition is 1:1 and order-preserving — callers that write
// cumulative cells by index (handleUnitColumnChange) stay aligned.

// Format a verse span from the labels in effect at a block's first and last
// rows. Labels are the canvas gutter's strings — bare ("8") or chaptered at
// a seam ("6:1") — treated as opaque text.
function formatVerseSpan(startVerse, endVerse) {
  const start = typeof startVerse === "string" ? startVerse.trim() : "";
  const end = typeof endVerse === "string" ? endVerse.trim() : "";
  if (!start && !end) return "";
  if (!start || !end || start === end) return `v. ${start || end}`;
  return `vv. ${start}–${end}`;
}

// Compose display blocks for the thought units. Returns a new array of
// enriched unit copies (input untouched), each carrying:
//   block:      [{text, depth, verse}, ...] — the margin row + its indented
//               children (empty-text lines dropped); falls back to a
//               single-line block from thought_unit_text when the unit's
//               canvas row is gone or was never recorded (legacy/fixture
//               data), and to [] when there is no text at all.
//   verse_span: "v. 8" / "vv. 8–9" / "" — from the gutter labels IN EFFECT
//               across the block. Labels mark verse starts only, so a block
//               opening mid-verse inherits the most recent label above it.
export function composeThoughtUnitBlocks(canvas, thoughtUnits) {
  const units = Array.isArray(thoughtUnits) ? thoughtUnits : [];
  const rows = Array.isArray(canvas) ? canvas : [];

  // One walk over the canvas: group each depth-0 row with the deeper rows
  // beneath it, tracking the verse label in effect. Rows above the first
  // margin row belong to no unit (a unit begins AT a margin line).
  const blocksById = new Map();
  let current = null;
  let lastVerse = "";
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const depth = Number.isInteger(row.depth) && row.depth > 0 ? row.depth : 0;
    const verse = typeof row.verse === "string" ? row.verse.trim() : "";
    if (verse) lastVerse = verse;
    if (depth === 0) {
      current = { lines: [], startVerse: lastVerse, endVerse: lastVerse };
      if (typeof row.id === "string" && row.id) blocksById.set(row.id, current);
    }
    if (!current) continue;
    current.endVerse = lastVerse;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (text) current.lines.push({ text, depth, verse });
  }

  return units.map((u) => {
    const rowId = u && typeof u === "object" && typeof u._canvas_row_id === "string" ? u._canvas_row_id : "";
    const entry = rowId ? blocksById.get(rowId) : null;
    if (entry && entry.lines.length > 0) {
      return { ...u, block: entry.lines, verse_span: formatVerseSpan(entry.startVerse, entry.endVerse) };
    }
    const headerText = u && typeof u.thought_unit_text === "string" ? u.thought_unit_text.trim() : "";
    return {
      ...(u && typeof u === "object" ? u : {}),
      block: headerText ? [{ text: headerText, depth: 0, verse: "" }] : [],
      verse_span: "",
    };
  });
}

// Write an indented-canvas value to the `divisions` field, materializing the
// derived thought_units array alongside. Both paths are authoritative — canvas
// for Field 3 UI, thought_units for Phase 2/3/4 cross-phase reads — so this
// helper is the single sanctioned write path that keeps them in lockstep.
//
// Reads existing thought_units off the raw JSON shape to preserve cumulative
// columns even when the question is N/A-masked at read time.
export function setDivisionsCanvas(fieldData, canvas) {
  const existing = fieldData?.divisions?.thought_units?.value;
  const existingArr = Array.isArray(existing) ? existing : [];
  const derived = deriveThoughtUnitsFromCanvas(canvas, existingArr);
  let next = setQuestionAnswer(fieldData, "divisions", "canvas", canvas);
  next = setQuestionAnswer(next, "divisions", "thought_units", derived);
  return next;
}

// Flatten an answer value (string or structured list) to a single string.
// Returns "" if the value is missing, empty, or otherwise has no content.
//
// Per ruling 8, the structured shapes are:
//   - synthesis table:  has `thought_unit_text` (cumulative columns appended)
//   - indented canvas:  has `id` + `text` + `depth` (paraphrase + TUE markers
//                       retired with the unified canvas)
//   - unknown:          JSON.stringify fallback
export function flattenAnswerValue(value) {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value) || value.length === 0) return "";

  const first = value.find((e) => e && typeof e === "object") || null;
  if (!first) return "";

  const lines = [];

  if ("thought_unit_text" in first) {
    for (const row of value) {
      if (!row || typeof row !== "object") continue;
      const text = typeof row.thought_unit_text === "string" ? row.thought_unit_text.trim() : "";
      if (!text) continue;
      const extras = [];
      for (const key of CUMULATIVE_COLUMN_KEYS) {
        if (typeof row[key] === "string" && row[key].trim()) {
          extras.push(`${key.replace(/_/g, " ")}: ${row[key].trim()}`);
        }
      }
      lines.push(extras.length > 0 ? `${text} — ${extras.join("; ")}` : text);
    }
    return lines.join("\n");
  }

  if ("text" in first) {
    for (const row of value) {
      if (!row || typeof row !== "object") continue;
      const t = typeof row.text === "string" ? row.text.trim() : "";
      if (!t) continue;
      const depth = Number.isInteger(row.depth) && row.depth > 0 ? row.depth : 0;
      lines.push("  ".repeat(depth) + t);
    }
    return lines.join("\n");
  }

  try {
    const s = JSON.stringify(value);
    return s && s !== "[]" ? s : "";
  } catch {
    return "";
  }
}

// answeredQuestions deleted in the trail deletion sweep (Phase F, 2026-05-17).
// Its only caller was studyAdvancement.js's buildSubPhaseEvidence (the wall-
// layer evidence builder), which went with F. The production map-state /
// completeness surface uses hasContent against individual answer envelopes,
// not a phase-wide iteration. If a future completeness audit needs phase-
// wide iteration, it builds against the per-question-kind dispatch in
// sermonState.js + the composites in studyAdvancement.js — not a string-
// flattening iterator inherited from the wall layer.

// Apply a flat {[fieldKey]: <string|list>} value map onto the new-shape data.
// Each entry sets the primary question's value for the corresponding field.
// Used by AI-incorporate flows that propose new values as a flat JSON object.
//
// Strings cover text-prompt fields (the AI's current shape). Arrays are
// accepted for forward-compat with structured-exercise values; in practice
// structured fields are written through their own per-question paths and
// rarely flow through this map, but accepting both keeps the data layer
// shape-agnostic.
export function applyFieldValueMap(fieldData, valueMap) {
  let next = fieldData || {};
  if (!valueMap || typeof valueMap !== "object") return next;
  for (const [fieldKey, value] of Object.entries(valueMap)) {
    if (typeof value === "string" || Array.isArray(value)) {
      next = setPrimaryAnswer(next, fieldKey, value);
    }
  }
  return next;
}

// ── Parsing / Serializing ────────────────────────────────────────────────────

/**
 * Parse a column value that may be:
 *   (a) new-shape JSON: `{[fieldKey]: {[qKey]: {value, na}}, ...}`
 *   (b) old-shape JSON: `{[fieldKey]: <string>, ...}`  ← coerced to (a)
 *   (c) plain text:     ← preserved under `legacy_notes` (free-text fallback)
 *
 * Returns the new-shape object. Old-shape values are lifted to
 * `{primary: {value: <string>, na: false}}` per field.
 *
 * Per ruling 8, legacy unified-canvas / sentence_layout / paraphrases /
 * thought_unit_end data is a clean cut — no production sermons carry it, and
 * the migration shim that used to hydrate it has been removed.
 */
export function parseStructuredField(raw) {
  if (!raw || typeof raw !== "string") return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};

  // Try JSON first
  if (trimmed.startsWith("{")) {
    const parsed = tryParse(trimmed, null);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return coerceToNewShape(parsed);
    }
  }

  // Plain text — preserve as legacy_notes
  return { legacy_notes: trimmed };
}

// Lift any old-shape (string) field values to new-shape envelopes. Preserves
// already-new-shape values and the legacy_notes key as-is.
function coerceToNewShape(parsed) {
  let needsCoercion = false;
  for (const [k, v] of Object.entries(parsed)) {
    if (RESERVED_TOP_KEYS.has(k)) continue;
    if (typeof v === "string" || typeof v !== "object" || Array.isArray(v) || v === null) {
      needsCoercion = true;
      break;
    }
  }
  if (!needsCoercion) return parsed;

  const out = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (RESERVED_TOP_KEYS.has(k)) {
      out[k] = v;
      continue;
    }
    if (typeof v === "string") {
      out[k] = { [DEFAULT_QUESTION_KEY]: { value: v, na: false } };
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Serialize the new-shape object to a JSON string. Strips empty questions
 * (value is empty AND na is false) to keep storage lean. A field whose
 * questions are all stripped is dropped. legacy_notes is preserved when
 * non-empty.
 */
export function serializeStructuredField(data) {
  if (!data || typeof data !== "object") return "";
  const cleaned = {};
  for (const [fieldKey, field] of Object.entries(data)) {
    if (RESERVED_TOP_KEYS.has(fieldKey)) {
      if (typeof field === "string" && field.trim()) cleaned[fieldKey] = field;
      continue;
    }
    if (!field || typeof field !== "object") continue;
    const cleanedField = {};
    for (const [qKey, q] of Object.entries(field)) {
      if (!q || typeof q !== "object") continue;
      const v = q.value;
      const isEmptyString = typeof v === "string" && !v.trim();
      const isEmptyList = Array.isArray(v) && v.length === 0;
      const isMissing = v === undefined || v === null;
      const isEmpty = isMissing || isEmptyString || isEmptyList;
      // Keep N/A questions even with empty values — N/A is a deliberate signal.
      if (q.na || !isEmpty) {
        cleanedField[qKey] = { value: v ?? "", na: !!q.na };
      }
    }
    if (Object.keys(cleanedField).length > 0) {
      cleaned[fieldKey] = cleanedField;
    }
  }
  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : "";
}

// flattenToText / hasMinimumSubstrate / flattenExegesis / LOOK_AGAIN_MIN_CHARS
// removed in the trail deletion sweep (Phase A). They were the AI-context
// pipeline; ARI retired the AI consumer (2026-05-09) and the Step 1 audit
// confirmed zero live callers. The three retired-key constants
// (REDEMPTIVE_SUMMARY_KEY, IMPLICATIONS_UNBELIEVER_KEY,
// IMPLICATIONS_COMPILED_KEY) were retained only to surface legacy data
// through flattenToText and went with it.
