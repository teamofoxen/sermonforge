// sampleData.js — seed for the Dashboard's "Open a sample sermon" button.
// All IDs use a fixed `sample-` prefix so list queries filter them out
// (keeps the sample sermon out of Dashboard's Resume Work tile).
//
// Shape of the four exegesis JSON columns mirrors the per-question envelope
// defined in src/utils/studyFields.js:
//
//   sermon[column] = {
//     [fieldKey]: {
//       [questionKey]: { value: <string|list>, na: <boolean> },
//       ...
//     },
//     ...
//   }
//
// Step 5 (Sermon Frame) lives in `sermon_frame`, shaped per
// src/utils/sermonFrameFields.js (intro / conclusion).
//
// The throughline pattern is canonical: observations.divisions.thought_units
// holds a single cumulative array. Each row carries thought_unit_summary +
// after_line + signal (Phase 1), then is extended in place with `meaning`
// (Phase 2), `christ_connection` (Phase 3), and `implication` (Phase 4).

"use strict";

const { SERMON_STATUS, SERIES_STATUS, STAGE } = require("./contracts.cjs");

// ── Fixed IDs ─────────────────────────────────────────────────────────────────

const SERIES_ID = "sample-romans-2026";
const SERMON_ID = "sample-romans-sermon-01";

// Outline point UUIDs — fixed so functional_elements can key off them correctly.
const OP = {
  p1: "c0a1b2c3-0000-0000-0000-000000000001",
  p2: "c0a1b2c3-0000-0000-0000-000000000002",
  p3: "c0a1b2c3-0000-0000-0000-000000000003",
};

// ── Canvas row IDs (canonical throughline) ───────────────────────────────────
//
// Phase 4 Sprint 2 unified-canvas shape: each canvas row carries a stable id
// that doubles as the cross-phase merge key. Rows that carry a
// `thought_unit_end` marker are reflected in the materialized
// `divisions.thought_units` array via `_canvas_row_id` matching that id;
// Phases 2/3/4 extend those rows with meaning / christ_connection /
// implication. Stable strings (not random UUIDs) so the seed loads
// deterministically — random UUIDs are fine in production where the canvas
// is hand-typed, but a fixture wants reproducibility.

const ROW_ID = (n) => `sample-rom5-row-${n}`;

// ── Series ─────────────────────────────────────────────────────────────────────

const series = {
  id: SERIES_ID,
  title: "Romans: The Gospel That Roots Us",
  color: "crimson",
  description: "A series through key passages in Romans on the gospel as the ground of the believer's life under pressure.",
  year: 2026,
  big_idea: "The gospel is not the entrance ramp to Christian living — it is the ground we stand on, the air we breathe, and the love that holds us through every season the world throws at us.",
  overview: "Romans is Paul's most sustained articulation of the gospel and what it does to a human life. This series moves through the letter's hinge passages — justification (3–4), peace and hope under pressure (5), life in the Spirit (8), the cost of belonging (12) — and asks the question Paul keeps pressing: if this is true, what does it look like to actually live here? Not as people striving toward the gospel, but as people standing in it.",
  passage_range: "Romans 5–8 (with hinge texts from 3, 4, and 12)",
  start_date: "2026-09-06",
  end_date: "2026-11-22",
  structural_outline: `I. The Gospel Stated (Rom 1–4) — God's righteousness revealed; justification by faith
II. The Gospel That Roots Us (Rom 5) — peace, suffering, and the love poured in
III. The Gospel That Frees Us (Rom 6–7) — the new self, the failure of law, the cry "who will deliver me?"
IV. The Gospel That Holds Us (Rom 8) — Spirit, suffering, glory, and a love nothing can sever
V. The Gospel That Sends Us (Rom 12–15) — the body, the world, the weak`,
  status: SERIES_STATUS.InProgress,
  canon_category: "nt",
  redemptive_context: "Romans stands at the apex of New Testament theology. Paul writes to a church he has not founded, planning a westward mission, gathering up the gospel he has preached for two decades. Within Scripture's arc, Romans is where the cross's logic gets articulated for the church's life under pressure — Abraham's God justifies the ungodly (Rom 4), peace is already secured (Rom 5), the Spirit groans with creation (Rom 8), and nothing in heaven or earth severs the love. Every pericope reaches back to the cross and forward to the new creation.",
  book_background: "Romans was likely written from Corinth around AD 57, on the eve of Paul's planned trip to Jerusalem with the collection. The Roman church was a mixed Jewish-Gentile community, probably meeting in several house churches. Paul writes to introduce his gospel before visiting (Rom 15:23–24) and to repair fault lines between Jewish and Gentile believers in light of Claudius's earlier expulsion and return.",
  book_argument: "Paul's controlling argument is that the gospel is the power of God for salvation (1:16) — and that this gospel reshapes the entire frame of human life: justification, sanctification, Israel's place, and the body's daily ethics. The gospel is not a doctrine you hold; it is the ground you stand on.",
  book_structure: "Romans moves in three large arcs: (1) the gospel stated and defended (1–4), (2) the gospel applied to the believer's life — peace, freedom, hope (5–8), (3) the gospel applied to Israel's history and the body's ethics (9–16). Romans 5 is the hinge: the doctrinal foundation laid in 1–4 turns into the lived ground of 6–8.",
  series_motivation: "This congregation has heard the gospel preached as the front door of Christianity — the prayer you prayed, the moment of decision. What they have not heard with the same clarity is the gospel as the floor they stand on every day. Many are exhausted from trying to maintain Christian life as if it were a moral project. Romans is the book that says: the gospel that justified you is the same gospel that holds you, frees you, and sends you. This series gives them ground.",
  emerging_big_idea: "You cannot graduate from the gospel into the Christian life — the gospel IS the Christian life. Every chapter of Romans is a different way of saying the same thing: stand here, breathe this, walk on this ground.",
};

// ── Sermon: "The Hope That Does Not Disappoint" — Romans 5:1-5 ────────────────

const sermon = {
  id: SERMON_ID,
  series_id: SERIES_ID,
  title: "The Hope That Does Not Disappoint",
  passage: "Romans 5:1-5",
  date: "2026-09-13",
  stage: SERMON_STATUS.InProgress,

  // Landing state — the sample opens inside the finished work (the first
  // Manuscript field) with both entry thresholds pre-seen, so the curious
  // pastor lands on writing, not the sermon-start overlay. Threshold ids
  // mirror THRESHOLD_ID in src/utils/sermonState.js; the position string is
  // the canonical slash-composite (Manuscript doubles as its own sub-phase).
  last_touched_position: `${STAGE.Manuscript}/${STAGE.Manuscript}/introduction`,
  thresholds_seen: JSON.stringify(["sermon-start", "study-to-anchor-handoff"]),
  mpt: "Paul taught that those justified by faith already stand in unshakeable peace with God, and therefore can endure suffering as a chain that produces a hope which does not put them to shame — because that hope rests on God's love already poured into their hearts by the Spirit.",
  mps: "The hope that holds in suffering is not something you build — it is anchored in a love that has already been poured into you.",

  // SADI v19 envelope — MPT (draft + tighten) and MPS (translate + gospel_check + tighten).
  // The legacy `mpt` / `mps` flat columns above hold the tightened versions; pre-sweep
  // they were auto-synced from `*.tighten` by `StudyTab.updateMPP`, which was deleted with
  // StudyTab in Phase E of the trail deletion sweep. The envelope is what the
  // post-D2c writing surface renders at Assembly/Anchor via MAIN_POINT_PAIR_FIELDS;
  // the flat-column sync wiring post-D2c is a follow-up question (see the matching
  // comment in src/utils/sadiAnchorFields.js for context). Without the envelope,
  // those fields render empty.
  main_point_pair: JSON.stringify({
    mpt: {
      draft: { value: "In Romans 5:1-5, Paul taught the Roman believers that the justification they had received by faith was not the front door of Christian life but the floor they were already standing on. Because God had already declared them righteous through Christ, they had peace with God — settled, not pending. They had obtained access into grace and were standing in it. From that standing, they could even rejoice in suffering, because suffering did productive work: it produced endurance, endurance produced character, character produced hope. And the hope at the end of that chain would not shame them, because its weight rested not on their endurance but on God's love already poured into their hearts by the Holy Spirit. The whole passage was a declaration of what was already true of them — anchoring their hope under pressure in what God had already done, not in what they had to muster.", na: false },
      tighten: { value: "Paul taught that those justified by faith already stand in unshakeable peace with God, and therefore can endure suffering as a chain that produces a hope which does not put them to shame — because that hope rests on God's love already poured into their hearts by the Spirit.", na: false },
    },
    mps: {
      translate: { value: "We who have been justified by faith already stand in unshakeable peace with God — and so when suffering presses on us, we can rejoice even there, because suffering produces endurance, endurance produces character, character produces hope, and that hope will not shame us. Its weight does not rest on our grip on God; it rests on God's love already poured into our hearts by the Holy Spirit. Our work this week is not to manufacture hope but to remember the love already in us.", na: false },
      gospel_check: { value: "Read alongside the Christ-Connection Statement: every gift named — peace, access, standing, the love poured — is mediated 'through our Lord Jesus Christ.' The chain of suffering–endurance–character–hope is the very pattern of Christ's life now reproduced in his disciples by the Spirit. The call to rejoice and receive in v.5 rests on what Christ has already secured and what the Spirit has already poured in — not on any moral effort the listener must summon. The MPS holds: it asks for receiving, not climbing.", na: false },
      tighten: { value: "The hope that holds in suffering is not something you build — it is anchored in a love that has already been poured into you.", na: false },
    },
  }),

  study_guide_note: "This is the second sermon in our Romans series. After 'The Gospel Stated' (Rom 3–4), this passage shows what that gospel actually does in a believer's life under pressure. The sermon centres on Paul's chain — suffering produces endurance, endurance character, character hope — and lands on v.5: the hope's weight rests not on your endurance but on God's love already given.",

  observations: JSON.stringify({
    context: {
      before: { value: "Romans 1–4 has built the argument: all have sinned (3:23), justification is by faith apart from works of the law (3:28), and Abraham was the prototype — counted righteous before circumcision, on the basis of faith (Rom 4). Chapter 4 closes with the resurrection-faith of those who believe in him who raised Jesus from the dead (4:24).", na: false },
      after: { value: "Verse 6 onward grounds the love clause of v.5: while we were still weak, at the right time Christ died for the ungodly (v.6); God shows his love in this — while we were still sinners, Christ died for us (v.8). The argument continues into the Adam–Christ contrast (vv.12–21).", na: false },
      impact: { value: "Romans 5 is the hinge from doctrinal foundation (1–4) to lived implication (6–8). The 'therefore' of v.1 is not decorative — it ties everything Paul has said about justification to the believer's actual experience of pressure. Reading 5:1-5 without the foundation of 4 misses what 'having been justified by faith' is doing in v.1.", na: false },
      holy_spirit_intent: { value: "The Spirit led Paul to place this passage here so the church under Nero's shadow would not read justification as a merely forensic transaction. The doctrine of chapters 1–4 is meant to land in the body, in suffering, in the experience of waiting. Verses 1–5 anchor the gospel in the believer's interior life before Paul widens the lens to Adam, sin, slavery, Spirit, and glory.", na: false },
    },
    surface_questions: {
      where: { value: "No physical setting — Paul is mid-letter, writing from Corinth to the mixed Jewish-Gentile churches in Rome.", na: false },
      when: { value: "Likely AD 57. The Roman church is several years past Claudius's expulsion of the Jews; Jewish believers have returned to a now Gentile-majority church. Pressure on Christians in Rome is increasing but pre-Neronian persecution.", na: false },
      how: { value: "Paul opens the new section with 'therefore' (v.1), drawing a logical inference. He uses three verbs in v.1-2 that declare what is already settled (have peace, have obtained access, stand), then a verb of response in the present (rejoice — repeated in v.2 and v.3a). Verse 3b introduces a chain (knowing that…) building cause-and-effect through endurance, character, and hope. Verse 5 anchors the chain with a verb in a settled, completed form: God's love HAS BEEN poured.", na: false },
    },
    divisions: {
      // Phase 4 Sprint 2 unified-canvas shape: structure + inline paraphrase
      // (per main row) + optional thought_unit_end on main rows. The
      // materialized `thought_units` array below is what Phase 2/3/4
      // cumulative-synthesis-tables read cross-phase; it stays in lockstep
      // with the canvas via `_canvas_row_id` back-pointers.
      //
      // Thought-unit attachment notes: u1 ("Standing") attaches to the row
      // closing v.1-2 territory ("and we rejoice"). The legacy seed had two
      // distinct units inside v.3-4 ("Pivot" — the kauchaomai reuse, and
      // "Chain" — the suffering→endurance→character→hope climax) but
      // ratification 3 attaches thought_unit_end to main rows only, and the
      // chain modifiers all sit under one main row ("Not only that, but we
      // rejoice in our sufferings"). The two are merged into one unit
      // ("Pivot + chain") that attaches to that main row. u4 ("Anchor")
      // attaches to v.5's main row ("and hope does not put us to shame").
      canvas: {
        value: [
          { id: ROW_ID(1),  text: "Therefore, having been justified by faith,",                  depth: 0, kind: "main",
            paraphrase: "Because God has already declared us righteous through faith," },
          { id: ROW_ID(2),  text: "we have peace with God",                                       depth: 0, kind: "main",
            paraphrase: "we now stand in real peace with him — and that peace was secured for us by Jesus." },
          { id: ROW_ID(3),  text: "through our Lord Jesus Christ.",                               depth: 1, kind: "modifier",
            paraphrase: "" },
          { id: ROW_ID(4),  text: "Through him also we have obtained access by faith",           depth: 0, kind: "main",
            paraphrase: "Through Jesus we have also been brought into this open standing of grace, where we are now firmly planted." },
          { id: ROW_ID(5),  text: "into this grace in which we stand,",                           depth: 1, kind: "modifier",
            paraphrase: "" },
          { id: ROW_ID(6),  text: "and we rejoice",                                               depth: 0, kind: "main",
            paraphrase: "And the only fitting response is to celebrate the glory God has promised.",
            thought_unit_end: {
              summary: "Standing — what justification has already done",
              signal: "three verbs (have peace, have obtained access, stand) declare a settled state",
            } },
          { id: ROW_ID(7),  text: "in hope of the glory of God.",                                 depth: 1, kind: "modifier",
            paraphrase: "" },
          { id: ROW_ID(8),  text: "Not only that, but we rejoice in our sufferings,",             depth: 0, kind: "main",
            paraphrase: "Not only that, but even our sufferings become reasons to celebrate, because we know suffering produces endurance, endurance produces character, and character produces hope.",
            thought_unit_end: {
              summary: "Pivot + chain — rejoicing in suffering because of what it produces",
              signal: "the same word for rejoicing from v.2 reused (now applied to suffering), then a chain: suffering → endurance → character → hope",
            } },
          { id: ROW_ID(9),  text: "knowing that suffering produces endurance,",                   depth: 1, kind: "modifier",
            paraphrase: "" },
          { id: ROW_ID(10), text: "and endurance produces character,",                            depth: 1, kind: "modifier",
            paraphrase: "" },
          { id: ROW_ID(11), text: "and character produces hope,",                                 depth: 1, kind: "modifier",
            paraphrase: "" },
          { id: ROW_ID(12), text: "and hope does not put us to shame,",                           depth: 0, kind: "main",
            paraphrase: "And this hope will never shame us, because God's love has already been poured into our hearts by the Holy Spirit he gave us.",
            thought_unit_end: {
              summary: "Anchor — why this hope does not put us to shame",
              signal: "the verb 'has been poured' is in a settled, completed form — a finished action by another",
            } },
          { id: ROW_ID(13), text: "because God's love has been poured into our hearts",           depth: 1, kind: "modifier",
            paraphrase: "" },
          { id: ROW_ID(14), text: "through the Holy Spirit",                                      depth: 2, kind: "modifier",
            paraphrase: "" },
          { id: ROW_ID(15), text: "who has been given to us.",                                    depth: 2, kind: "modifier",
            paraphrase: "" },
        ],
        na: false,
      },
      thought_units: {
        value: [
          {
            thought_unit_summary: "Standing — what justification has already done",
            after_line: 6,
            signal: "three verbs (have peace, have obtained access, stand) declare a settled state",
            _canvas_row_id: ROW_ID(6),
            meaning: "Paul opens not with command but with description. The believer's life under God is already secured — peace is had, access is obtained, grace is stood in. The only response Paul names is to rejoice. Suffering does not threaten this standing; v.1-2 is the floor every later move stands on.",
            christ_connection: "Every 'we have' is mediated 'through our Lord Jesus Christ.' The believer stands in a grace they did not earn and cannot lose because Christ secured it on the cross and now lives to keep them in it.",
            implication: "Before any call to endure, anchor the listener in what is already true. The Christian under pressure is not someone who must climb back to peace; they are someone who has not yet noticed they are already standing on it.",
          },
          {
            thought_unit_summary: "Pivot + chain — rejoicing in suffering because of what it produces",
            after_line: 8,
            signal: "the same word for rejoicing from v.2 reused (now applied to suffering), then a chain: suffering → endurance → character → hope",
            _canvas_row_id: ROW_ID(8),
            meaning: "Paul reuses the same word for rejoicing from v.2 — refusing to let pain become the deepest word about the believer's life — and then builds a logical chain showing what suffering actually does: it works, slowly, through endurance and character, into hope. The boast does not change subjects when life turns hard, and the chain has no shortcuts; the slow path is the whole point.",
            christ_connection: "Christ has reframed suffering as the road of the Servant who entered glory through it — and the chain Paul names is the very pattern of Christ's own life (suffering, faithfulness, vindication). The Spirit conforms the believer to that same shape (cf. Rom 8:29); what looks like loss is the very hand of God reshaping a person into the likeness of his Son.",
            implication: "Rejoicing in suffering is not denial of pain — it is the refusal to grant suffering the final word over a life already claimed by the gospel. And honest joy means naming to the room that there are no shortcuts: the hope you long for is produced at the end of the chain you are dreading. God is not wasting your suffering; he is using it to grow the very thing you most want.",
          },
          {
            thought_unit_summary: "Anchor — why this hope does not put us to shame",
            after_line: 12,
            signal: "the verb 'has been poured' is in a settled, completed form — a finished action by another",
            _canvas_row_id: ROW_ID(12),
            meaning: "Paul does not ground hope in the strength of the believer's endurance but in a love already poured in by the Spirit. The hope's reliability is not the believer's grip on God but God's love already given. The chain of v.3-4 produces hope, but v.5 explains why that hope holds: the Spirit, the love, the One who gave them.",
            christ_connection: "The Spirit who pours God's love into hearts is the Spirit of the risen Christ. The same love that sent the Son to the cross (v.8) is the love now indwelling the believer. The cross is not behind us; it is in us, by the Spirit.",
            implication: "The believer in suffering does not have to manufacture hope. Hope is held by Someone Else; their job is to remember Whose love is already in them. This is what makes pastoral care under pressure possible — you are not asking people to summon hope. You are asking them to receive the love already poured in.",
          },
        ],
        na: false,
      },
    },
    characters: {
      primary: { value: "Paul (the speaker, with his church). The triune God — Father (the one with whom we have peace, whose love has been poured), Son (Jesus Christ, the mediator), Spirit (the giver of love). The believing 'we' — Paul deliberately includes himself with the Roman church under the same gospel.", na: false },
    },
    commands_declarations: {
      primary: { value: "Notably, no commands. Every main move is a declaration: 'we have peace,' 'we have obtained access,' 'we stand,' 'we rejoice,' 'hope does not put us to shame,' 'love has been poured.' Paul is not telling the church what to do — he is telling them what is already true. The pastoral logic: what's true comes before what to do. Romans 6 will turn to commands ('reckon yourselves dead to sin'); Romans 5 lays the floor of declared truth those commands stand on.", na: false },
    },
    big_ideas: {
      primary: { value: "Standing (the settled state of the justified — v.2). Rejoicing (the same word in v.2 and v.3 — both in glory and in suffering). The chain (suffering's productive work). Hope (eschatological, anchored in v.5). Love poured (the Spirit's interior work). The 'we' (corporate, not individualistic).", na: false },
    },
    obvious_point: {
      primary: { value: "Believers who have been justified can rejoice even in suffering, because suffering produces a hope that will not disappoint — a hope grounded not in their endurance but in God's love already poured into them by the Spirit.", na: false },
    },
    applications: {
      pressing: { value: "The passage presses on the gap between what congregants believe is true (justification, peace with God) and how they actually live under pressure (as if hope is something they must muster). Paul's language is gentle but unrelenting — you have peace; you have access; you stand. The pressure point: receive what is already true.", na: false },
      hard_and_hopeful: { value: "Hard: the path to hope runs through suffering, endurance, and character — not around them. The chain cannot be shortcut. Hopeful: the hope's reliability is not the believer's grip on God but God's love already poured in. The believer does not have to manufacture the anchor; the Spirit has already set it.", na: false },
    },
  }),

  interpretation: JSON.stringify({
    deeper_context: {
      unresolved: { value: "Observe surfaced the 'therefore' of v.1 as load-bearing. Study tools confirm: it draws the conclusion of 1–4 (especially 4:23–25). The 'we have peace' is a declaration, not an exhortation — the textual variant that reads 'let us have peace' is less likely on internal grounds and weaker on external evidence. Paul is declaring, not exhorting.", na: false },
      book_argument: { value: "The book argues that the gospel is God's power for salvation (1:16). Romans 5 turns from how that righteousness is established (1–4) to how it functions in the believer's life. The pivot is structural — most commentators (Moo, Schreiner, Wright) read 5:1 as opening a major new section running through chapter 8. Reading 5:1-5 as merely the closing of chapter 4 misses Paul's deliberate widening from doctrine to lived experience.", na: false },
    },
    genre: {
      genre: { value: "A teaching letter from Paul — Paul builds his argument step by step, with one statement leading into the next.", na: false },
      impact: { value: "The genre matters: letters argue, and Paul's argument here moves by inference ('therefore' in v.1, 'knowing that' in v.3b, 'because' in v.5). The preacher must follow the logic, not just collect verses. Genre also explains the concentration of theological language (peace, access, grace, hope) — Paul is doing pastoral theology in tightly compressed argument.", na: false },
    },
    recurring_ideas: {
      primary: { value: "Through Christ (vv.1, 2 — twice the mediatorial 'through our Lord Jesus Christ' / 'through him'). Faith (vv.1, 2). Rejoice/boast (the same word in vv.2 and 3). Hope (vv.2, 4, 5). The chain of production (suffering–endurance–character–hope, v.3-4). These are not stylistic repetitions; each layer is a structural pillar of Paul's pastoral logic: the believer stands through Christ, by faith, in joy, oriented to hope, formed by suffering's chain, anchored by the Spirit's love.", na: false },
    },
    character_purpose: {
      primary: { value: "Paul's 'we' is the central character. He deliberately includes himself among the justified, the rejoicing, the suffering — refusing the apostolic pose that places him above his hearers. The triune God acts: the Father has peace with us, the Son secures access, the Spirit pours love. Each Person of the Trinity is doing distinct work in five verses. The believing community is the recipient — passive in justification, actively rejoicing, suffering, knowing.", na: false },
    },
    contrasts: {
      primary: { value: "Implicit contrast: pre-justification vs. justified. The justified 'have peace' — implying the unjustified do not. Implicit contrast: hope that puts to shame vs. hope that does not (v.5). All other hopes — built on circumstance, performance, achievement — eventually shame their holder. The hope rooted in God's love-poured-in does not. Hidden contrast Paul will make explicit later: under law (slavery) vs. in grace (standing) — but here he simply names the standing.", na: false },
    },
    cross_refs: {
      primary: { value: "Romans 4:24-25 (immediate prior — Christ delivered for our trespasses, raised for our justification — the antecedent of 'therefore'). Romans 5:6-11 (immediate sequel — the love of v.5 is unpacked: while we were still weak, while still sinners, Christ died). Romans 8:14-17, 28-30, 35-39 (the same Spirit, the same chain of conformity to Christ, the same love nothing severs — Romans 5 in expanded form). Habakkuk 2:4 / Romans 1:17 (the just shall live by faith — the canonical anchor). James 1:2-4 (the same chain — testing produces endurance — independent attestation in another voice). 1 Peter 1:6-9 (same logic — rejoicing through trials in a hope guarded by God).", na: false },
    },
    commentary: {
      primary: { value: "Cranfield reads the 'therefore' as drawing on the entire argument of 1–4, not just 4:25. Moo emphasises the structural pivot at 5:1, opening chapters 5–8. Schreiner highlights the form of 'has been poured' — the love is not poured in instalments; it has been poured in fully, once for all. Wright reads 'rejoice' as covenant-renewal celebration, not personal feeling. Stott: 'The Christian's hope rests not on what is in him, but on what is in God.' I disagree mildly with Wright's reading of 'rejoice' purely corporately — Paul's language is corporate, but the lived implication for the individual under pressure is unmistakable.", na: false },
    },
    interpretation_synthesis: {
      meaning_per_unit: { value: [], na: false },
      meaning_whole: { value: "Paul tells a justified people what is already true of them — peace, access, standing — and then turns the same celebration toward suffering itself, naming the chain by which suffering produces hope, and anchoring that hope not in their endurance but in God's love already poured into them by the Spirit. The argument moves from settled state (v.1-2) to lived response (v.2-3a) to productive chain (v.3b-4) to interior anchor (v.5). The whole passage is a pastoral declaration: you stand on this; you can rejoice in suffering because of this; the hope holds because of this. Imperatives will come in chapter 6; here, only the indicative — and the indicative is enough.", na: false },
    },
  }),

  redemptive_thread: JSON.stringify({
    this_passage_and_christ: {
      position: { value: "The passage stands after Christ's death and resurrection, on the new-covenant side of the cross. Paul reads it as already-accomplished reality — Christ's work is done, and the believer's standing rests on it. Within Romans, this is post-3:21-26 (the propitiation passage) and post-4:25 (delivered for our trespasses, raised for our justification).", na: false },
      direct_speech: { value: "Yes, directly. The mediatorial phrases name Christ explicitly: 'through our Lord Jesus Christ' (v.1), 'through him' (v.2). Christ is not implicit here — he is the named conduit of every benefit. Verse 5's love of God is unpacked in v.6-8 as the love demonstrated at the cross; the passage names Christ's saving work as the ground of every gift.", na: false },
    },
    passage_points_to_christ: {
      biblical_theme: { value: "Peace with God — the great covenant promise, fulfilled in Christ. The Old Testament word for peace pointed at the wholeness of relationship with God restored, not just the absence of conflict; this passage names that restored wholeness as the believer's settled state. Also: glory (v.2) — the divine presence Israel longed to see and lost — now the eschatological inheritance of those in Christ. Also: love poured out — God's covenant love, now indwelling by the Spirit.", na: false },
      promise: { value: "Implicit: the Abrahamic promise (Rom 4) finds its fulfilment in the believer's standing in grace (v.2). The promise of God's presence with his people, woven through the covenants, is fulfilled in the Spirit's pouring love into hearts (v.5). The eschatological hope of glory (v.2) is the promise of the new creation, anchored in Christ's resurrection.", na: false },
      // na flags removed in the T19 N/A-allowlist (ratified: only
      // intro.redemptive_note + mps.gospel_check are N/A-able). The prose
      // answers themselves carry the "this passage isn't predictive /
      // typological" pedagogy. NOTE: SFDI's RT field entry says all four
      // ways-questions allow N/A — that conflict is flagged for the
      // pastor's ruling; if he extends the allowlist, these flags can
      // return alongside naAllowed on the question defs.
      predictive: { value: "Not directly predictive — Paul is not foretelling Christ here; he is unpacking what Christ has already accomplished. The passage is post-cross, not pre-cross.", na: false },
      type: { value: "No direct typology — Paul is in didactic mode, not figural. The passage's Christological weight is in mediation, not pattern.", na: false },
    },
    gospel_makes_possible: {
      primary: { value: "If the passage calls believers to rejoice in suffering and endure the productive chain, the gospel makes that possible in three ways: (1) Justification — they don't have to perform their way back into God's favour during suffering; their standing is settled. (2) Indwelling Spirit — the love is already poured in; they don't need to manufacture endurance from their own resources. (3) Christ's mediatorial presence — every gift comes 'through him,' so the call to endure is never a call to face suffering alone.", na: false },
    },
    need_and_character: {
      human_need: { value: "The passage exposes the believer's need to be told what is already true. We are people who, under pressure, default to performance — trying to climb back to peace, build hope, manufacture endurance. The need this passage names is the need for an external word that re-anchors us in what God has already done. We do not need a new programme; we need to be told again whose we are.", na: false },
      god_character: { value: "God is the one who pours. Whose love is settled — the verb 'has been poured' names a finished action, full stop. Whose Spirit indwells. Who keeps his Son's mediatorial work present in believers' interior lives. He is not distant; the love is in their hearts. He is not stingy; the love is poured. He is not conditional; the Spirit has been given. This is the God of the cross — the one who shows his love by Christ's death (v.8) and shows it again by the Spirit's interior gift.", na: false },
    },
    christ_connection_statement: {
      christ_per_unit: { value: [], na: false },
      statement: { value: "Christ is the hero of this passage as the mediator of every gift it names. The peace is with God 'through our Lord Jesus Christ.' The access is 'through him.' The standing is in the grace he secured. The hope of glory is the glory of his resurrection life now extended to his people. The chain of suffering–endurance–character–hope is the very pattern of his own life, now reproduced in his disciples by the Spirit. And the love poured into believers' hearts is the same love demonstrated at his cross (v.8). Paul does not mention Christ in every verse, but the whole passage breathes him. To preach Romans 5:1-5 without Christ at the centre is to preach a moral chain. To preach it with Christ at the centre is to preach the gospel itself.", na: false },
    },
  }),

  implications: JSON.stringify({
    theological_significance: {
      about_god: { value: "God justifies the ungodly (Rom 4:5) and then keeps them — peace is HAD, access is OBTAINED, the standing is SETTLED. He is the God who completes what he begins; the already-finished claims of v.1-2 are his signature. He is also the God who pours — generous, present, already at work in the interior life of the believer by his Spirit.", na: false },
      about_ourselves: { value: "We are people who already stand in grace (v.2) — and people who default to performing as if we don't. The passage exposes the gap between our position (justified, at peace) and our practice (anxious, striving). It also names a hard truth: the path to hope runs through suffering, endurance, and character. There are no shortcuts to becoming the person we long to be.", na: false },
      about_christ: { value: "Christ is the mediator of every gift named — peace, access, standing, the love poured. He is also the pattern: the chain of suffering–endurance–character–hope is the shape of his own life, now reproduced in disciples. The cross is not behind the believer; it is the ground they stand on and the love now indwelling them by the Spirit.", na: false },
      timeless: { value: "The gospel is the floor, not the front door. The Christian under pressure does not need a new programme; they need to be told again what is already true. Hope's reliability is never the believer's grip on God but God's love already given. Suffering, in God's hands, is productive — not punitive.", na: false },
      doctrines: { value: "Justification by faith (v.1). Union with Christ as the locus of every benefit (vv.1, 2). Pneumatology — the Spirit as the agent of interior love (v.5). Eschatological hope — the glory of God as the believer's inheritance (v.2). Sanctification — the Spirit's productive work through suffering (vv.3-4). The trinitarian shape of salvation: peace with the Father, through the Son, by the Spirit.", na: false },
    },
    personal_implications: {
      follow: { value: "Receive what is already true. Stop trying to climb back into peace you already have. When pressure rises, return — again — to the indicative: I have peace; I have access; I stand. Imitate Paul's deliberate inclusion of himself in the 'we' — refuse the spiritual posture that places you outside or above your church's struggle.", na: false },
      forsake: { value: "Forsake the moralistic reading of Christian life that turns suffering into a test you must pass to earn hope. Forsake the inner voice that says 'if you were really faithful, this would be easier.' Forsake the attempt to manufacture endurance from your own resources, as if the love had not already been poured.", na: false },
      receive: { value: "Receive what's already true as your present reality — the peace is had, the access is obtained, you stand. Receive the Spirit's interior witness — the love is already in you. Receive the hope as a gift held by Another, not a performance you must sustain. Receive the slow chain — endurance, character, hope — as God's actual work in you, not evidence of his absence.", na: false },
      settle: { value: "Settle into the conviction that suffering is not punitive but productive in God's hands. Settle into the Trinity-shaped understanding of salvation — the Father's peace, the Son's mediation, the Spirit's interior love. Settle into the corporate 'we' — you do not stand alone; you stand with the church Paul addresses, in the same grace, by the same Spirit.", na: false },
    },
    pastoral_context: {
      room_specifics: { value: "This room includes: (1) a couple in their late forties walking through a cancer diagnosis, who have been told too many times by well-meaning friends that 'God is in control' — and need someone to tell them why that is good news; (2) a young father exhausted by a special-needs child's medical journey, quietly resentful that his prayer life has gone dry; (3) a long-faithful widow who has carried more than her share of grief and is wondering, privately, whether her hope has actually held; (4) several younger believers absorbing the cultural message that Christianity should make life smoother, and finding that it has not; (5) seekers and unbelievers in the room who are watching how Christians actually talk about suffering. Paul's 'we' includes them all — they are the people Romans 5 is for.", na: false },
      cost_and_gift: { value: "Cost: Paul will not let the room shortcut the chain. Endurance, character, hope — there is no faster path. For people exhausted by suffering, this is hard; the sermon must not pretend otherwise. Cost too: the call to stop performing, to stop climbing back to a peace already had — for many, performing IS their faith, and the call to receive will feel like loss before it feels like gift. Gift: the hope's anchor is not their grip. The love is already in them. The God who pours is not waiting to be impressed; he is already present, already pouring, already keeping. For the cancer diagnosis, the dry prayer life, the widow's quiet fear, the exhausted young father — the gift is that hope is held by Someone Else.", na: false },
    },
    implications_synthesis: {
      implication_per_unit: { value: [], na: false },
      synthesis: { value: "The passage teaches that the justified believer already stands in unshakeable peace with God (theological) and asks them to receive that standing as the floor of life under pressure (personal), and it lands in this room as a refusal to let the cancer diagnosis, the dry prayer life, the widow's quiet fear, or the exhausted young father's resentment have the final word over a life already claimed by the gospel (pastoral). One sentence: hope holds because the love has been poured in — and Romans 5 invites THIS room to stop trying to manufacture what God has already given.", na: false },
    },
  }),

  outline: JSON.stringify([
    { id: OP.p1, text: "The Floor You Already Stand On (vv.1-2)" },
    { id: OP.p2, text: "The Same Joy, Now Turned Toward Suffering (vv.3-4)" },
    { id: OP.p3, text: "Why This Hope Will Hold (v.5)" },
  ]),

  functional_elements: JSON.stringify({
    [OP.p1]: {
      explanation: "Paul opens with three claims that name what is already settled: we HAVE peace, we HAVE OBTAINED access, we STAND. The form matters. Peace with God is not a feeling to be cultivated — it is a settled state already achieved through Christ's mediation. Access is not a privilege to be earned — it has been obtained, full stop. The standing is not a posture you assume each morning — it is the ground beneath your feet whether you notice it or not. Paul's pastoral logic: what's true comes before what to do. Before he tells the Roman church to do anything (and he will, in chapter 6), he tells them what is already true.",
      application: "Most of us spend our Christian life trying to climb back to peace we already have. We treat the gospel as the front door we walked through years ago and then act as if every day's faithfulness is what keeps us inside. Paul says: stop. The peace is had. The access is obtained. The standing is settled. The work this week is not to earn the floor — it is to notice you are already standing on it. What would it look like, this Monday morning, to walk into your office knowing your standing with God is not at stake in the meeting you're about to have?",
      illustration: "Tim Keller, in his last sermons before he died, returned again and again to this image: the gospel is not the diving board you jumped off years ago; it is the water you are now in. You don't jump again every Sunday. You swim in what is already true. Paul's settled-state claims are exactly that — the water you are already in.",
    },
    [OP.p2]: {
      explanation: "Verse 3 begins with the most disorienting sentence in the passage: 'we rejoice in our sufferings.' But notice — Paul uses the same word he just used in verse 2 for rejoicing in the hope of glory. This is not a different rejoicing. It is the SAME rejoicing, now applied to suffering itself. Paul refuses to let pain become the deepest word about the believer's life. And then he names the chain — suffering produces endurance, endurance produces character, character produces hope. It is a chain — each link is the cause of the next. There are no shortcuts. The hope you long for is the very thing produced at the end of the chain you are dreading.",
      application: "Most of us, in suffering, do one of two things. We deny the pain — slap a Bible verse on it and call it victorious. Or we let the pain become the deepest reality — the thing we wake up to, the thing we name our life by. Paul will not let us do either. He says: the pain is real (he calls it suffering, not 'opportunity'), and yet the rejoicing is the same. Whatever you are walking through this week — the diagnosis, the prodigal child, the marriage that feels far from where you hoped — Paul is telling you that you do not have to choose between pretending it doesn't hurt and letting it have the final word. There is a third option. The chain is doing real work, even when you cannot see it.",
      illustration: "Joni Eareckson Tada, paralysed at seventeen and now in her seventies: 'Suffering is the textbook that teaches me who I really am, and what I am most prone to. Through it I have come to understand a love deeper than I imagined — but only by walking the chain Paul names here.' She is one of the clearest living witnesses I know to this verse. Not because she did it perfectly. Because she let the chain do its work.",
    },
    [OP.p3]: {
      explanation: "And then verse 5: 'hope does not put us to shame, because God's love has been poured into our hearts through the Holy Spirit who has been given to us.' Watch what Paul does here. He has just built a chain — suffering produces endurance, endurance character, character hope. You might expect him to ground hope's reliability in your endurance: 'and because you've endured, your hope will hold.' But he does not. He grounds it somewhere else entirely. The hope holds because of a love already poured in. The verb is in a settled, completed form — has been poured. A finished action by another. You did not pour it; the Spirit did. And he poured it not in instalments but fully, once for all. The anchor of your hope is not your grip on God. It is God's love already inside you.",
      application: "If you have been trying to hold onto God in your suffering — gripping harder, praying more, summoning faith you do not feel — verse 5 is the most liberating sentence in the New Testament. The hope does not rest on your grip. It rests on the love already poured in. Your job is not to manufacture the anchor. Your job is to remember that Someone Else has already set it. This week, when the chest tightens and the question rises and the prayer feels dry — you do not need a stronger faith. You need to remember whose love is already in you.",
      illustration: "There is a moment in Pilgrim's Progress where Christian, beaten down in the Slough of Despond, cries out that he cannot get out. And Help — that's the character's name — comes and pulls him out, and Christian asks, 'Why is the way so bad?' And Help answers: 'It is not because God did not put steps in. It is because you forgot to look down.' The steps are there. The love is poured. The Spirit has been given. Look down. You are already standing on it.",
    },
  }),

  manuscript: `There is a kind of exhaustion that only Christians know.

It is not the exhaustion of the world — the burnout of work, the weariness of carrying too much. It is something quieter. It is the exhaustion of trying to keep yourself in a place you suspect you do not deserve to be. The exhaustion of hearing every Sunday that the gospel is good news, and walking into Monday afraid that this week, finally, you will run out of whatever it is that keeps God patient with you.

If that is you — even partly, even on your bad days — Romans 5 is for you.

Paul is writing to a church he has never met. He has spent four chapters arguing that God justifies the ungodly. That faith, not works, is how anyone is right with God. That Abraham, the founder of the people, was counted righteous before he had done a single religious thing. By the end of chapter 4, the gospel has been stated. The argument is built. The doctrine is laid down.

And then chapter 5 begins with one word: therefore.

This is the most important word in the passage. Paul is saying: now that the doctrine is built, let me tell you what it does. Let me tell you what it is like to wake up tomorrow morning in a life that has actually been changed by what I have just said.

Watch what he does. Verse 1: "Therefore, having been justified by faith, we have peace with God through our Lord Jesus Christ." Three words I want you to notice. We HAVE peace. Verse 2: we HAVE OBTAINED access. We STAND in this grace.

The verbs are doing something. They name what is already settled. Peace is not something you are going to get. Peace is something you have. Access is not a privilege you might one day earn. Access has been obtained. The standing is not a posture you assume each morning when you remember God again. The standing is the ground beneath your feet whether you noticed it this morning or not.

This is the floor.

I want you to feel the strangeness of this. Most of us spend our Christian life trying to climb back to peace we already have. We treat the gospel like a diving board we jumped off years ago, and we act as if every day's faithfulness is what keeps us in the water. But Paul says — and this is going to take the whole sermon to land — the water is what you are already in. You do not jump again. You swim in what is already true.

That is the floor. Now watch what he does next.

Verse 3. "Not only that, but we rejoice in our sufferings."

Now, this is the sentence that makes everyone in this room either suspicious or angry, depending on the kind of week you have had. Because none of us, in our actual lives, rejoice in suffering. We endure it. We pray our way through it. We white-knuckle our way out of it. But rejoice? The cancer diagnosis. The marriage that has gone cold. The child who will not return your calls. The prayer life that has gone bone dry. We do not rejoice in those things.

But notice what Paul has done. He uses the same word here that he used in verse 2 for rejoicing in the hope of glory. This is not a different kind of rejoicing. It is the SAME rejoicing, now turned toward suffering itself.

Paul is doing something here that I want you to watch carefully, because it is going to land in your week. He is refusing to let pain become the deepest word about your life.

He is not denying the pain. The word he uses is suffering, not "opportunity." He is not asking you to pretend. But he is also not letting suffering have the final word over a life that has already been claimed by the gospel.

And then he tells you why. Verses 3 and 4: "knowing that suffering produces endurance, and endurance produces character, and character produces hope."

It is a chain — each link causes the next. Suffering, in God's hands, is doing real work. It is producing endurance. The endurance is producing character. The character is producing hope. And there are no shortcuts. The hope you long for — the deep, unshakeable hope you wish you had on your worst days — is the very thing produced at the end of the chain you are dreading.

I have to be honest with you here. This is the hardest sentence in the sermon to preach, because what Paul is saying is that the slow path is the only path. There is no faster way to become the person of hope you long to be than to walk the road you are walking. The God who is forming hope in you is using the very thing you wish he would take away.

This is hard.

But now watch what Paul does in verse 5. Because if he stopped at verse 4, this would be a sermon about your endurance. And if it were a sermon about your endurance, half of you would walk out of here more defeated than when you came in.

Verse 5. "And hope does not put us to shame, because God's love has been poured into our hearts through the Holy Spirit who has been given to us."

I want you to listen to that sentence as if you have never heard it before.

Paul has just built a chain. Suffering. Endurance. Character. Hope. You might expect him to ground hope's reliability in your endurance. "And because you have endured, your hope will hold." That is what most preachers would do.

He does not.

He grounds the hope somewhere else entirely. The hope holds because of a love already poured in. The verb form is settled and finished. The action is by another, complete. You did not pour the love. The Spirit did. And he did not pour it in instalments. He poured it fully. Once. For all.

This means — and I want you to feel this — the anchor of your hope is not your grip on God.

It is God's love already inside you.

If you have been trying to hold onto God in your suffering — gripping harder, praying more, summoning faith you do not feel — verse 5 is the most liberating sentence in the New Testament. The hope does not rest on your grip. It rests on the love already poured in.

Your job is not to manufacture the anchor.

Your job is to remember that Someone Else has already set it.

So here is where I want to land. This week, when the chest tightens and the question rises and the prayer feels dry — you do not need a stronger faith. You do not need to climb back into a peace you already have. You do not need to manufacture the hope. You need to remember whose love is already in you.

Stop trying to keep yourself in a place you do not deserve to be. The standing is settled. The access is obtained. The peace is had. The Spirit is given. The love is poured. And the God who has done all of that is not waiting to be impressed by your endurance. He is already at work, by his Spirit, in your interior life, anchoring a hope that will hold when nothing else does.

Come with empty hands. The gift is already in them.`,

  delivery_notes: "Pace this sermon slowly — the settled-state verbs of v.1-2 need to land before any application. Read vv.1-5 aloud at the start, slowly, before the first point. Don't rush past 'we have peace.' Stay there. The congregation needs to feel the strangeness of the declaration before the chain in vv.3-4 makes sense. At the close, do not push for a response — the passage itself is a declaration, not an exhortation. Let the declaration do its work. Watch for the moment in v.5 — slow there. The hope-anchor is the heart of the sermon; if any sentence lands, it must be that one.",
  timing_notes: "Opening (the exhaustion that only Christians know): 4 min. Reading + 'therefore' + the settled-state verbs of v.1-2 (Point 1 explanation): 8 min. Application + Keller illustration: 4 min. Pivot to v.3 + the chain: 6 min. Joni Eareckson Tada illustration: 3 min. Verse 5 — the anchor (Point 3): 8 min. Pilgrim's Progress illustration + close: 5 min. Total: ~38 min.",

  sermon_frame: JSON.stringify({
    intro: {
      hook: { value: "There is a kind of exhaustion that only Christians know. It is not the exhaustion of work or of carrying too much. It is the quiet exhaustion of trying to keep yourself in a place you suspect you do not deserve to be — of walking into every Monday afraid that this week, finally, you will run out of whatever it is that keeps God patient with you.", na: false },
      bridge_to_text: { value: "Romans 5 begins with one word: 'therefore.' Paul has spent four chapters arguing that God justifies the ungodly — that faith, not works, is how anyone is right with God. And now he turns to what that doctrine actually does in a real life under pressure. The MPT: Paul tells the justified what is already true of them, and grounds their hope in a love already poured in. The MPS: the hope that holds in suffering is not something you build — it is anchored in a love that has already been poured into you.", na: false },
      expectations: { value: "I'm going to ask you to do something hard this morning. I'm going to ask you to stop trying to climb back to a peace you already have. To stop manufacturing hope you cannot sustain. And to receive what is already true: that the gospel is not the front door of Christian life — it is the floor you are already standing on, and the love is already poured in.", na: false },
      redemptive_note: { value: "The reason that call is good news and not another burden is this: the work has already been done. The peace is had. The access is obtained. The Spirit is given. The love is poured. You are not being asked to summon what is not there. You are being asked to receive what Christ has already secured and the Spirit has already poured in.", na: false },
    },
    conclusion: {
      summate: { value: "Three verbs in verse 1 declare what is already settled. The same word for rejoicing turns in verse 3 toward suffering itself. The chain of suffering–endurance–character–hope does its slow productive work in verse 3-4. And verse 5 anchors the whole thing not in your endurance but in a love already poured in by the Spirit. The whole passage is one declaration: you stand on this; you can rejoice in suffering because of this; the hope holds because of this.", na: false },
      land_call: { value: "So here is the call this passage lays on us: this week, when the chest tightens and the question rises and the prayer feels dry — do not try harder to hold onto God. Remember whose love is already holding you. Stop trying to keep yourself in a place you already stand. The work is to receive what is already true.", na: false },
      gospel_empower: { value: "And what makes that call good news is that Christ has done the work — every gift named in this passage flows 'through our Lord Jesus Christ.' The peace, the access, the standing, the love poured. You do not have to manufacture the anchor; he already set it. You do not have to summon hope; the Spirit has already poured the love in. The call to receive is itself enabled by the One who gave.", na: false },
      closing_posture: { value: "Silence, then a sung response. After the final line ('the gift is already in them'), 30 seconds of silence — let the gospel weight settle. Then the congregation sings 'Before the Throne of God Above' as a corporate response. No final prayer; the song is the prayer. The pastoral instinct: the sermon has done verbal work; the room now needs an embodied response without more of the pastor's voice.", na: false },
    },
  }),
};

// ── Export ─────────────────────────────────────────────────────────────────────

module.exports = {
  SERIES_ID,
  SERMON_ID,
  series,
  sermon,
};
