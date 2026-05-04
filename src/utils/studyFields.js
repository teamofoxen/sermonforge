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
// Reshaped to 9 fields per SFDI Phase 1 walk (2026-05-03), shipped as SPRD
// B1.0 (2026-05-04). Outside-in arc through the first four fields:
//   Background → Context → Surface Questions → Divisions / Thought Units
// Then the lens cluster reads against Field 4's spine:
//   Main Characters → Commands and Declarations → Big Ideas
// First synthesis + bridge into Interpret close the segment:
//   Obvious Point → Possible Implications
//
// Retired keys from the prior shape: `commands`, `statements`, `basic_outline`
// are no longer iterated as fields. Old data carrying these keys stays in
// the JSON column (parseStructuredField preserves them) but does not render
// under any current field. Per the defensive-only migration policy in SPRD
// § 9 (no production sermons exist 2026-05-04), no auto-mapping logic ships.
// If a future test fixture or import surfaces such data, the per-key cross-
// mapping in SPRD § 9 documents how it would land (commands + statements →
// commands_declarations.legacy_notes; basic_outline → divisions.legacy_notes).
//
// B1.0 keeps a single primary question per field. Multi-question sequences
// (Background's 4-question Author/Date/Audience/Genre, Surface Questions's
// 3-question Where/When/How, Field 4's three structured sub-shapes, etc.)
// land in subsequent B1.x cuts as the per-field walks are wired in.

export const OBSERVE_FIELDS = [
  {
    key: "background",
    label: "Background",
    hint: "World the book was written into.",
    questions: [
      { key: "author",   prompt: "Who wrote this book?" },
      { key: "date",     prompt: "When was it written?" },
      { key: "audience", prompt: "Who was the original audience, and what occasion prompted the writing?" },
      { key: "genre",    prompt: "What kind of literature is this?" },
    ],
  },
  {
    key: "context",
    label: "Context",
    hint: "Where in the book is this passage, and how does that shape what's happening here?",
    questions: [
      { key: "before",             prompt: "What happened before this passage?" },
      { key: "after",              prompt: "What happens after?" },
      { key: "impact",             prompt: "Do those answers impact what's happening in this passage? If so, how?" },
      { key: "holy_spirit_intent", prompt: "Why do you think the Holy Spirit led the author to write (a) this passage, (b) in this place?" },
    ],
  },
  {
    key: "surface_questions",
    label: "Surface Questions",
    hint: "Stand on the surface and report basic situational facts.",
    questions: [
      { key: "where", prompt: "Where does this take place?" },
      { key: "when",  prompt: "When does this take place?" },
      { key: "how",   prompt: "How does this unfold?" },
    ],
  },
  {
    key: "divisions",
    label: "Divisions / Thought Units",
    hint: "How is the passage built? Lay out the main sentences, paraphrase them, and find the thought units that anchor it.",
    heavyLifting: true,
    overview: {
      title: "Divisions / Thought Units",
      subtitle: "Field 4 of 9 · Observe",
      paragraphs: [
        "The point of the sermon is the point of the text. The work of seeing what that point is starts here.",
        "Before you can preach the passage, you have to see how it's built. Which sentences carry the main weight. What's supporting them. Where one move ends and the next begins. How the passage flows.",
        "You're not building an outline. You're laying the foundation any outline will rest on. The bones of the passage are already there. Your job in this field is to make them visible.",
      ],
      list: {
        intro: "Three parts:",
        items: [
          "Lay the passage out so the structure shows.",
          "Rewrite each main sentence in your own words.",
          "Find the thought units that anchor the passage.",
        ],
      },
    },
    questions: [
      {
        key: "sentence_layout",
        kind: "canvas",
        prompt: "Type the passage by hand. Pull each subject and main verb to the left margin. Indent modifiers under what they modify. Re-align coordinate clauses to the column of their coordinate.",
        referencePanel: {
          title: "The three rules",
          sections: [
            {
              type: "rules",
              items: [
                { lead: "Subject + main verb", body: "pulled to the left margin. The spine of the clause." },
                { lead: "Modifiers", body: "(adjectives, adverbs, prepositional phrases, subordinate clauses) — indent under what they modify." },
                { lead: "Coordinate clauses", body: "(“and,” “but,” “or”) — re-align to the column of their coordinate. Same indent level as their peer." },
              ],
              footnote: "Main verb = the finite verb (carries tense, head of the clause). Participles, infinitives, and gerunds are modifiers.",
            },
            {
              type: "heading",
              heading: "Quick outline tips",
              paragraphs: ["The three rules above are the operation across all genre. Here's how they apply by genre."],
            },
            {
              type: "genre",
              heading: "For epistles",
              paragraphs: ["The three rules above, applied as written. Long sentences with cascading modifier chains; coordinate clauses joined by “and,” “but,” “or.”"],
            },
            {
              type: "genre",
              heading: "For narrative",
              items: [
                "Each main action → left margin. Most narrative clauses are actions; expect many lines at the margin.",
                "Description and character info (“who was a Pharisee,” “now there was a famine”) → indent under what they describe.",
                "Dialogue → indent under the speech verb. “He said” stays at the margin; the words spoken indent under it.",
              ],
            },
            {
              type: "genre",
              heading: "For poetry",
              paragraphs: ["Deferred for a future iteration."],
            },
          ],
        },
      },
      {
        key: "paraphrases",
        kind: "paraphrase",
        prompt: "Take each main sentence — every left-margin line you laid out above — and rewrite it in your own words. Translation, not summary.",
      },
      {
        key: "thought_units",
        kind: "synthesis-table",
        prompt: "Look at the main sentences above. For each thought unit you find, write what the author is hammering home (in your own words), mark the line where it ends, and name what makes the seam — a subject shift, a “But…” that pivots, a scene change.",
      },
    ],
  },
  { key: "characters",            label: "Main Characters",           hint: "Who's acting in this passage? For each character, name their role." },
  { key: "commands_declarations", label: "Commands and Declarations", hint: "For each main sentence, name what kind of action it carries — a command (asking the hearer to do something) or a declaration (naming reality). Then say in your own words what the sentence is doing." },
  { key: "big_ideas",             label: "Big Ideas",                 hint: "What concepts is the passage wrestling with? List them. For each, a one-line note on how it shows up." },
  { key: "obvious_point",         label: "Obvious Point",             hint: "State the plain-sense point of the passage in one sentence." },
  {
    key: "applications",
    label: "Possible Implications",
    hint: "First surfacing of Pastoral Context — early sight, not full application.",
    questions: [
      { key: "pressing",          prompt: "What is the passage starting to press on for the people you're preaching to?" },
      { key: "hard_and_hopeful",  prompt: "What's hard here for the hearer? What's hopeful?" },
    ],
    heavyLifting: true,
    overview: {
      title: "Possible Implications",
      subtitle: "Field 9 of 9 · Observe",
      paragraphs: [
        "You've worked your way through what the text says — its world, its location, its surface, its spine, its actors, its actions, its concepts, and its plain-sense point. The Observation Set is almost done.",
        "Before we leave Observe and step into Interpret, one more move. Look at the passage and ask: what is it starting to suggest about the room you're preaching to? What's it pressing on? What's hard? What's hopeful?",
        "Not full application yet. Application is its own work, later. Here we're naming early sight — the moments where the passage starts to feel weighty for the people in the pews. The first time pastoral context enters, while the text is still doing the leading.",
        "If you find yourself drafting application or making sermon points, ease back. This is awareness, not exhortation. The text is still ahead of you here.",
      ],
    },
  },
];

// ── Phase 2: Interpret ───────────────────────────────────────────────────────
//
// Reshaped to 7 fields per SFDI Phase 2 walk (2026-05-03), shipped as SPRD
// B2.0 (2026-05-04). Merida four-part arc through the seven fields:
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
    hint: "Pick up Observe's Context with study tools. Resolve open questions and widen the lens to book-wide literary context and authorial purpose.",
    questions: [
      { key: "unresolved",     prompt: "What questions did Observe's Context leave open that you can now answer with study tools in hand?" },
      { key: "book_argument",  prompt: "How does this passage fit the book's overall argument? What does the author intend across the whole that bears on this passage?" },
    ],
  },
  { key: "recurring_ideas",         label: "Recurring Ideas",         hint: "What ideas, words, or themes recur within this passage? For each, name what the recurrence is signaling about what the author is hammering home." },
  { key: "character_purpose",       label: "Character Purpose",       hint: "For each character you named in Observe, what are they saying, doing, or thinking — and why? What is the author signaling through their action?" },
  { key: "contrasts",               label: "Contrasts",               hint: "What contrasts has the author built into the passage? Name each — what's set against what — and say in your own words what each contrast is doing." },
  { key: "cross_refs",              label: "Cross-References",        hint: "Where else does Scripture speak to what this passage is saying? Move outward in concentric circles. For each, name what it adds." },
  { key: "commentary",              label: "Commentary Notes",        hint: "Now — last, to check, not to start — what do the commentaries say? Note insights that sharpen, confirm, or correct what you've worked out. Note where you disagree, and why." },
  {
    key: "interpretation_synthesis",
    label: "Interpretation Synthesis",
    hint: "Articulate what the passage MEANS — per thought unit and as a whole — in your own voice. The Interpretation Set lives here.",
    heavyLifting: true,
    overview: {
      title: "Interpretation Synthesis",
      subtitle: "Field 7 of 7 · Interpret",
      paragraphs: [
        "You've widened the lens, dissected what recurs, named character motives, surfaced the contrasts. You've let Scripture interpret Scripture and checked your reading against trusted readers, last.",
        "One more move closes Interpret. Take what you've worked out and say it. For each thought unit you named in Observe — what does it MEAN? Not what it says (you did that in Observe). Not what it sounds like in your own words (paraphrase, also Observe). What it MEANS — what the author is conveying through it.",
        "Then, the whole passage. One paragraph. The meaning, in your own voice.",
        "What you produce here is the Interpretation Set. Phase 3 (Redemptive Thread) opens against it. Christ-connection deepens this; the meaning is the substrate.",
      ],
    },
    questions: [
      {
        key: "meaning_per_unit",
        kind: "cumulative-synthesis-table",
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
          { key: "thought_unit_summary", label: "Thought unit", kind: "textarea",    readOnly: true },
          { key: "after_line",            label: "After line",  kind: "line-number", readOnly: true },
          { key: "signal",                label: "Signal",      kind: "input",       readOnly: true },
          { key: "meaning",               label: "Meaning",     kind: "textarea",    placeholder: "What is the author conveying through this thought unit?" },
        ],
      },
      {
        key: "meaning_whole",
        prompt: "One paragraph. The whole passage's meaning, in your own voice. What is the author saying through this passage about reality? This is the Interpretation Set. Phase 3 opens against it.",
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
// `REDEMPTIVE_SUMMARY_KEY` ("summary") is no longer written to from any UI
// surface as of B3.2 (the legacy "Summary of Redemptive Features" Synthesize
// block was removed when Field 5's 2-question sequence + composite gate
// shipped). The export is retained so `flattenToText` continues to surface
// any legacy summary data through the context pipeline (defensive — no
// production sermons exist 2026-05-04, but the read path stays graceful).
//
// Heavy-lifting fields with `FieldOverviewScreen` on first per-sermon entry
// (B1.3 pattern):
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
    hint: "Position the text vis-à-vis Christ. Locate it in the redemptive arc and surface explicit Christological content.",
    questions: [
      { key: "position",      prompt: "Where does this text stand in relation to Christ — before, after, or transitional? For OT passages, where does the New Testament pick this up?" },
      { key: "direct_speech", prompt: "Does this text speak directly of Christ? If so, how?" },
    ],
  },
  {
    key: "passage_points_to_christ",
    label: "How the Passage Points to Christ",
    hint: "Trace the four kinds of Christological pointing the text may carry — biblical theme, promise, type, and predictive prophecy.",
    heavyLifting: true,
    overview: {
      title: "How the Passage Points to Christ",
      subtitle: "Field 2 of 5 · Redemptive Thread",
      paragraphs: [
        "You've positioned the text against Christ. Now look for how it points to him. Merida names four distinct ways a passage can point — biblical theme, promise, type, and predictive prophecy.",
        "These are different in kind. A biblical theme is a recurring motif in Scripture that finds its weight in Christ (kingdom, presence, sacrifice, covenant, Word). A promise is an explicit word from God that finds its yes-and-amen in Christ. A type is a pattern or person that prefigures Christ — Adam, Melchizedek, Moses, David — with linguistic and thematic correspondence and escalation (Christ is the better one). Predictive prophecy explicitly foretells Christ's coming, death, or return.",
        "Some passages carry all four. Some carry one. Some carry none of these directly — and that's fine. Mark N/A where the text genuinely doesn't carry that kind of pointing. Don't force.",
        "The discipline: don't insert Christ where he isn't. Allegory makes unfounded leaps; typology requires patterns, linguistic correspondences, and interbiblical themes. The text leads.",
      ],
    },
    questions: [
      { key: "biblical_theme", prompt: "Does the passage carry a biblical theme that points to Christ? (Kingdom, presence of God, sacrificial system, covenants, Word of God, etc.)" },
      { key: "promise",        prompt: "Does the passage hold or echo a promise of God that points to Christ?" },
      { key: "type",           prompt: "Is there a type of Christ here? A pattern, linguistic correspondence, or interbiblical theme that finds escalation in Christ? (Adam, Melchizedek, Moses, David, etc.)" },
      { key: "predictive",     prompt: "Is the passage predictive of Christ — coming, death, return?" },
    ],
  },
  {
    key: "gospel_makes_possible",
    label: "How the Gospel Makes This Possible",
    hint: "If this text calls the hearer to do, be, or trust something — how do the implications of the gospel make that possible? Access to God, indwelling Spirit, continual forgiveness, union with Christ.",
  },
  {
    key: "need_and_character",
    label: "Our Need and God's Character",
    hint: "Pair what the text shows about human need for Christ with what it shows about God's character.",
    questions: [
      { key: "human_need",    prompt: "How does this passage show mankind's need for Christ?" },
      { key: "god_character", prompt: "How does this passage reveal the nature of the God who provides redemption?" },
    ],
  },
  {
    key: "christ_connection_statement",
    label: "Christ-Connection Statement",
    hint: "How does the whole passage point to Christ — and how is Christ the hero of it? One paragraph, in your own voice.",
    heavyLifting: true,
    overview: {
      title: "Christ-Connection Statement",
      subtitle: "Field 5 of 5 · Redemptive Thread",
      paragraphs: [
        "You've positioned the text against Christ, traced how it points, grounded the gospel's enabling power, and named human need with God's character. The redemptive work is done.",
        "One more move closes Redemptive Thread. Take what you've worked out and say it. For each thought unit — how does it point to Christ? Find its weight in him? Get its answer from him?",
        "Then, the whole passage. One paragraph. The Christ-Connection Statement. How does the whole passage point to Christ — and how is Christ the hero of it?",
        "Goldsworthy's evaluation question lives here: did this sermon testify to Christ? The Statement is what makes that answer yes. Phase 4 (Implications) opens against it. The Christological substance you articulate here gives Implications its weight.",
      ],
    },
    questions: [
      {
        key: "christ_per_unit",
        kind: "cumulative-synthesis-table",
        prompt: "Beside each thought unit (with its Meaning from Phase 2), write the Christ-connection. How does this thought unit point to Christ, find its weight in him, or get its answer from him?",
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
          { key: "thought_unit_summary", label: "Thought unit",       kind: "textarea",    readOnly: true },
          { key: "after_line",            label: "After line",        kind: "line-number", readOnly: true },
          { key: "signal",                label: "Signal",            kind: "input",       readOnly: true },
          { key: "meaning",               label: "Meaning",           kind: "textarea",    readOnly: true },
          { key: "christ_connection",     label: "Christ-Connection", kind: "textarea",    placeholder: "How does this thought unit point to, find its weight in, or get its answer from Christ?" },
        ],
      },
      {
        key: "statement",
        prompt: "One paragraph. How does the whole passage point to Christ — and how is Christ the hero of it? This is the Christ-Connection Statement. Phase 4 opens against it.",
      },
    ],
  },
];
export const REDEMPTIVE_SUMMARY_KEY = "summary";

// ── Phase 4: Implications ────────────────────────────────────────────────────

export const IMPLICATIONS_THEOLOGICAL = [
  { key: "about_god",       label: "What does this text teach us about God?" },
  { key: "about_ourselves", label: "What does it teach us about ourselves?" },
  { key: "about_christ",    label: "What does it teach us about Christ?" },
  { key: "timeless",        label: "What principles are timeless for us?" },
  { key: "doctrines",       label: "What does the passage teach us about particular doctrines?" },
];

export const IMPLICATIONS_PERSONAL = [
  { key: "examples",    label: "Are there examples to follow?" },
  { key: "commands",    label: "Are there commands to keep?" },
  { key: "errors",      label: "Are there errors to avoid?" },
  { key: "sins",        label: "Are there sins to forsake?" },
  { key: "promises",    label: "Are there gospel promises to claim?" },
  { key: "new_thoughts", label: "Are there new thoughts about God to gain?" },
  { key: "explore",     label: "Are there truths or doctrines to further explore?" },
  { key: "convictions", label: "Are there convictions to be lived by?" },
];

export const IMPLICATIONS_UNBELIEVER_KEY = "unbeliever";
export const IMPLICATIONS_COMPILED_KEY = "compiled";

// Default question key used until a field's SFDI question sequence lands.
export const DEFAULT_QUESTION_KEY = "primary";

// Resolve a field def's question sequence. Fields with an explicit
// `questions: [...]` array carry the SFDI-walked sequence; fields without
// one collapse to a single primary-question entry whose prompt comes from
// the field's `hint` (back-compat with B1.0 single-question shape).
//
// Each returned entry: { key, prompt, kind? }. `kind` defaults to "textarea"
// at consumer level when absent; structured-exercise sub-shapes ("canvas",
// "paraphrase", "synthesis-table") land as fields are wired in B1.2+.
export function fieldQuestions(field) {
  if (field && Array.isArray(field.questions) && field.questions.length > 0) {
    return field.questions;
  }
  return [{ key: DEFAULT_QUESTION_KEY, prompt: field?.hint || "" }];
}

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

// Flatten an answer value (string or structured list) to a single string.
// Returns "" if the value is missing, empty, or otherwise has no content.
//
// Sub-shape detection inspects the first entry's keys:
//   - synthesis table:   has `thought_unit_summary` (cumulative columns appended)
//   - paraphrase blocks: has `paraphrase`
//   - indented canvas:   has `text` (with `depth`)
//   - unknown:           JSON.stringify fallback
//
// Output formats are evidence-text-oriented (consumed by AI prompts and
// empty-evidence gates) — not the rendered display. Per-sub-shape display
// rendering lands in the canvas/paraphrase/table components in later A2.x.
export function flattenAnswerValue(value) {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value) || value.length === 0) return "";

  const first = value.find((e) => e && typeof e === "object") || null;
  if (!first) return "";

  const lines = [];

  if ("thought_unit_summary" in first) {
    for (const row of value) {
      if (!row || typeof row !== "object") continue;
      const summary = typeof row.thought_unit_summary === "string" ? row.thought_unit_summary.trim() : "";
      if (!summary) continue;
      const meta = [];
      if (row.after_line !== undefined && row.after_line !== null && String(row.after_line).trim()) {
        meta.push(`after line ${String(row.after_line).trim()}`);
      }
      if (typeof row.signal === "string" && row.signal.trim()) {
        meta.push(`signal: ${row.signal.trim()}`);
      }
      const extras = [];
      for (const key of ["meaning", "christ_connection", "implication"]) {
        if (typeof row[key] === "string" && row[key].trim()) {
          extras.push(`${key.replace(/_/g, " ")}: ${row[key].trim()}`);
        }
      }
      const head = meta.length > 0 ? `${summary} (${meta.join(", ")})` : summary;
      lines.push(extras.length > 0 ? `${head} — ${extras.join("; ")}` : head);
    }
    return lines.join("\n");
  }

  if ("paraphrase" in first) {
    for (const row of value) {
      if (!row || typeof row !== "object") continue;
      const p = typeof row.paraphrase === "string" ? row.paraphrase.trim() : "";
      if (p) lines.push(p);
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

  // Unknown structured shape — defensive fallback so the data isn't silently
  // dropped from evidence. Per-sub-shape branches above are added as new
  // shapes are walked.
  try {
    const s = JSON.stringify(value);
    return s && s !== "[]" ? s : "";
  } catch {
    return "";
  }
}

// Iterate all answered (non-N/A, non-empty) questions across a phase's
// fields. Returns a flat list of {fieldKey, questionKey, value} entries
// where `value` is always a string — structured-list values are flattened
// via flattenAnswerValue so consumers (evidence-building, flattening) can
// treat all entries uniformly.
export function answeredQuestions(fieldData) {
  if (!fieldData || typeof fieldData !== "object") return [];
  const out = [];
  for (const [fieldKey, field] of Object.entries(fieldData)) {
    if (RESERVED_TOP_KEYS.has(fieldKey)) continue;
    if (!field || typeof field !== "object") continue;
    for (const [questionKey, q] of Object.entries(field)) {
      if (!q || typeof q !== "object") continue;
      if (q.na) continue;
      const flat = flattenAnswerValue(q.value);
      if (flat) {
        out.push({ fieldKey, questionKey, value: flat });
      }
    }
  }
  return out;
}

// True if the field-data has at least one answered (non-N/A, non-empty) question.
export function hasAnyAnswer(fieldData) {
  return answeredQuestions(fieldData).length > 0;
}

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

/**
 * Flatten a structured field to plain text for the context pipeline.
 * For each field def, joins all answered (non-N/A, non-empty) questions
 * with labels derived from the field def + question key. Single-primary-
 * question fields render as `Label: value` (back-compat). Multi-question
 * fields render as a labeled block:
 *
 *   Field Label:
 *     question_key_a: value
 *     question_key_b: value
 *
 * Continuation lines from structured-list values are indented for
 * readability. Falls back to legacy_notes if present.
 *
 * Closes the B1.5-era gap where multi-question fields (Phase 1's
 * background / context / surface_questions / divisions / applications and
 * Phase 2's deeper_context) produced empty flattened output because the
 * earlier implementation only read the `primary` question key per field.
 */
export function flattenToText(data, fieldDefs) {
  if (!data || typeof data !== "object") return "";

  const parts = [];

  // Legacy notes first
  if (data.legacy_notes && typeof data.legacy_notes === "string" && data.legacy_notes.trim()) {
    parts.push(data.legacy_notes.trim());
  }

  // Defined fields in order. Single-primary-question fields render as the
  // legacy `Label: value` shape; multi-question fields render as a labeled
  // block with each question's value underneath.
  for (const def of fieldDefs) {
    const questions = fieldQuestions(def);
    const isLegacySingle =
      questions.length === 1 && questions[0].key === DEFAULT_QUESTION_KEY;

    if (isLegacySingle) {
      const text = flattenAnswerValue(getPrimaryAnswer(data, def.key));
      if (text) parts.push(`${def.label}: ${text}`);
      continue;
    }

    const lines = [];
    for (const q of questions) {
      if (isQuestionNA(data, def.key, q.key)) continue;
      const text = flattenAnswerValue(getQuestionAnswer(data, def.key, q.key));
      if (!text) continue;
      // Indent continuation lines from multi-line structured values so the
      // block stays readable.
      const formatted = text.replace(/\n/g, "\n    ");
      lines.push(`  ${q.key}: ${formatted}`);
    }
    if (lines.length > 0) {
      parts.push(`${def.label}:\n${lines.join("\n")}`);
    }
  }

  // Phase 3 / Phase 4 special fields (legacy keys retained as fields with a
  // `primary` question; values surface via getPrimaryAnswer).
  const summary = flattenAnswerValue(getPrimaryAnswer(data, REDEMPTIVE_SUMMARY_KEY));
  if (summary) parts.push(`Summary: ${summary}`);
  const compiled = flattenAnswerValue(getPrimaryAnswer(data, IMPLICATIONS_COMPILED_KEY));
  if (compiled) parts.push(`Compiled implications: ${compiled}`);
  const unbeliever = flattenAnswerValue(getPrimaryAnswer(data, IMPLICATIONS_UNBELIEVER_KEY));
  if (unbeliever) parts.push(`Implications for unbelievers: ${unbeliever}`);

  return parts.join("\n");
}

/**
 * Flatten all 4 exegesis columns from structured JSON to plain text.
 * Drop-in replacement for summarizeExegesis when columns contain JSON.
 */
export function flattenExegesis(sermon) {
  const obs  = flattenToText(parseStructuredField(sermon?.observations),      OBSERVE_FIELDS);
  const int  = flattenToText(parseStructuredField(sermon?.interpretation),    INTERPRET_FIELDS);
  const red  = flattenToText(parseStructuredField(sermon?.redemptive_thread), [...REDEMPTIVE_FIELDS]);
  const imp  = flattenToText(parseStructuredField(sermon?.implications),      [...IMPLICATIONS_THEOLOGICAL, ...IMPLICATIONS_PERSONAL]);

  const parts = [
    obs && `Observations: ${obs}`,
    int && `Interpretation: ${int}`,
    red && `Redemptive thread: ${red}`,
    imp && `Implications: ${imp}`,
  ].filter(Boolean);

  return parts.join(" | ");
}
