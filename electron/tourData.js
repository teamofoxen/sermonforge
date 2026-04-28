// tourData.js — content for the Sermon Workspace guided tour.
//
// Loaded by the db-loadTourSermon IPC handler in main.js.
// All IDs use a fixed `tour-` prefix so list queries can filter them out.
// The handler is idempotent: it inserts only if the rows are absent.

"use strict";

// ── Fixed IDs ─────────────────────────────────────────────────────────────────

const SERIES_ID = "tour-sotm-series-2026";
const SERMON_ID = "tour-sotm-sermon-01";

// Outline point UUIDs — fixed so functional_elements can key off them correctly.
const OP = {
  p1: "c0a1b2c3-0000-0000-0000-000000000001",
  p2: "c0a1b2c3-0000-0000-0000-000000000002",
  p3: "c0a1b2c3-0000-0000-0000-000000000003",
};

// ── Series ─────────────────────────────────────────────────────────────────────

const series = {
  id: SERIES_ID,
  title: "The Upside-Down Kingdom",
  color: "gold",
  description: "A series through Matthew 5–7 on the ethics and life of the Kingdom",
  year: 2026,
  big_idea: "The kingdom life Jesus describes is not a higher moral standard to achieve but a new humanity to inhabit — formed by grace, shaped by dependence, and oriented entirely toward God.",
  overview: "Matthew 5–7 is the most concentrated body of Jesus's teaching in the Gospels. In the Sermon on the Mount, Jesus does not relax the law or intensify it for its own sake — he reveals the heart that produces kingdom living. This series traces the arc from the Beatitudes (who the kingdom people are) through kingdom ethics (how they live) to kingdom priorities (what they want). Each sermon returns to the same question: what does it look like to be fully human under God's reign?",
  passage_range: "Matthew 5–7",
  start_date: "2026-01-04",
  end_date: "2026-02-15",
  structural_outline: `I. Kingdom Character: The Beatitudes (5:1-12)
II. Kingdom Influence: Salt and Light (5:13-16)
III. Kingdom Righteousness: The Law Fulfilled (5:17-48)
IV. Kingdom Devotion: Giving, Prayer, Fasting (6:1-18)
V. Kingdom Priorities: Money and Anxiety (6:19-34)
VI. Kingdom Decision: The Two Ways (7:13-29)`,
  status: "active",
  canon_category: "nt",
  redemptive_context: "Matthew writes to a community negotiating its relationship to Jewish tradition and the wider church. Jesus appears as the new Moses — delivering his teaching from a mountain — but what he delivers is not a stricter code. It is the fulfilment of the entire covenant story: the people God always intended, formed by the Spirit, living under his reign. The Sermon on the Mount stands at the hinge between old covenant aspiration and new covenant reality, and every pericope in it reaches forward to Calvary and the resurrection.",
  book_background: "Matthew's Gospel was likely written between AD 80–90, possibly in Antioch, for a community that included both Jewish Christians and Gentile believers. Matthew draws heavily on Mark and Q, but organises the material around five major discourses — a deliberate echo of the five books of Moses. The Sermon on the Mount is the first and most foundational of these.",
  book_argument: "Matthew's controlling argument is that Jesus of Nazareth is Israel's long-awaited Messiah and the world's rightful King. The Sermon on the Mount is central to this argument: Jesus does not abolish the covenant but brings it to completion in his own person and in the community he is forming.",
  book_structure: "Matthew is organised around five major teaching discourses, each ending with the formula 'when Jesus had finished these sayings.' The Sermon on the Mount is the first discourse — the manifesto of the Kingdom.",
  series_motivation: "This congregation has absorbed the Sermon on the Mount as a moral framework — a checklist of better behaviour. But Jesus is describing a people, not a programme. Many in the room are exhausted by the gap between who they feel they should be and who they actually are. This series is an opportunity to reframe the entire discourse not as commands to obey but as a portrait of the person God is forming by grace.",
  emerging_big_idea: "You cannot perform your way into the kingdom life Jesus describes. You receive it. You inhabit it. That is the shock of the Beatitudes and the logic of everything that follows.",
};

// ── Sermon: "The Upside-Down Kingdom" — Matthew 5:1-12 ────────────────────────

const sermon = {
  id: SERMON_ID,
  series_id: SERIES_ID,
  title: "The Upside-Down Kingdom",
  passage: "Matthew 5:1-12",
  date: "2026-01-04",
  stage: "writing",
  mpt: "Jesus declared that those utterly dependent on God — not the morally accomplished — were the ones already living under his reign.",
  mps: "The life God blesses is not the life you build; it is the life you surrender.",
  topic_theme: "Kingdom ethics, Blessed life, Dependence on God, Grace over merit",
  audience_assumptions: "A congregation that largely equates faithfulness with moral effort and confidence. Many privately feel like failures. Some have been Christians for decades and still feel they have nothing to show for it.",
  background_noise: "A cultural moment obsessed with productivity, self-improvement, and visible success. The prosperity gospel is in the background — the idea that God rewards the thriving.",
  study_guide_note: "This opening sermon sets the hermeneutical key for the whole series. Everything Jesus says in Matthew 5–7 must be read through this lens: the kingdom belongs to those who know they have nothing to bring.",

  observations: JSON.stringify({
    context: "The Beatitudes come immediately after Jesus's temptation (4:1-11) and his early Galilean ministry (4:12-25). The crowds have gathered (4:25), and Jesus goes up on a mountain — deliberately echoing Moses at Sinai. The Sermon is addressed primarily to disciples (5:1-2) but within earshot of the crowds.",
    divisions: "The Beatitudes form a single unit (5:3-12) introduced by 'Seeing the crowds, he went up on the mountain' (v.1). There are two clusters: beatitudes naming inward dispositions (vv.3-6) and beatitudes naming outward orientations (vv.7-9), followed by a third group on persecution (vv.10-12). Verse 3 and verse 10 both contain 'for theirs is the kingdom of heaven,' forming a deliberate bracket around the whole.",
    commands: "Notably absent. Every statement is a declaration ('Blessed are...'), not a command. Jesus is not telling people what to do to become blessed — he is describing people who already are. This is the interpretive key the congregation needs.",
    statements: "Nine declarative 'blessed are' statements, each naming a quality and then a promise. The most disorienting: 'Blessed are the poor in spirit' (v.3) — not 'the spiritually mature' or 'the morally accomplished.' The Greek word for poor (ptochos) means destitute, utterly without resources.",
    characters: "Jesus as teacher-king, delivering the manifesto of his kingdom from a mountain. Disciples as primary audience. The crowds within earshot. The 'poor in spirit,' 'meek,' 'mourners' etc. are not defined groups but postures — descriptions of the posture of the kingdom person.",
    big_ideas: "The kingdom belongs to an unexpected set of people. Blessing in God's economy is not what the world calls blessing. The Beatitudes describe a people formed by grace and dependence, not achievement.",
    obvious_point: "The people God calls blessed are not who you'd expect — not the powerful, the confident, the morally accomplished. They are the broken, the dependent, the grieving, the persecuted. The kingdom is already theirs.",
    basic_outline: "I. The Unexpected Recipients (vv.3-6) — poverty of spirit, mourning, meekness, hunger\nII. The Unexpected Characteristics (vv.7-9) — mercy, purity, peacemaking\nIII. The Unexpected Cost (vv.10-12) — persecution because of righteousness",
    applications: "This passage challenges any form of Christianity that equates faithfulness with confidence, success, or moral accomplishment. It calls the congregation to examine whether they are trying to earn blessing or receive it.",
  }),

  interpretation: JSON.stringify({
    context_impact: "The mountain setting is not incidental — it evokes Sinai, where Moses received the law. But where Moses went up to receive commands from a hidden God, Jesus himself is on the mountain, teaching with his own authority. The disciples are the new Israel receiving a new covenant, but the covenant is not a stricter set of rules — it is a transformed people.",
    recurring_ideas: "Hunger, poverty, mourning — all images of need and dependence. Kingdom of heaven appears twice (vv.3, 10), bracketing the list. 'Righteousness' appears in vv.6 and 10 — hunger for it, and persecution because of it.",
    characters: "The disciples are not passive recipients. They are people who have already left things behind (cf. 4:20, 22). The Beatitudes describe not what they must become but what — by virtue of their following — they already are. Jesus is naming them.",
    contrasts: "The world's blessed: rich, confident, comfortable, celebrated. Jesus's blessed: poor in spirit, mourning, meek, persecuted. The contrast is not between sinners and saints — it is between the self-sufficient and the dependent.",
    cross_refs: "Luke 6:20-23 (the 'woes' parallel — explicitly about the poor and hungry, not 'in spirit'); Isaiah 61:1-3 (the Spirit-anointed one proclaims good news to the poor — Jesus is enacting this); Psalm 37:11 (the meek inherit the land); Revelation 7:17 (God will wipe every tear — mourning resolved in new creation).",
    commentary: "Stott: 'The Beatitudes are not a new law but a description of the people who will enter the kingdom.' France: 'Blessed' (makarios) is not a feeling of happiness but a declaration of status — 'to be congratulated.' Keener: The poor in spirit echoes Isaiah 61:1 and the Dead Sea Scrolls' language of the 'poor of the spirit,' the truly humble before God.",
    summarize_parts: "vv.1-2: Setting — mountain, disciples, teaching. vv.3-6: Four beatitudes of inward orientation (poor in spirit, mourning, meek, hungry for righteousness). vv.7-9: Three beatitudes of outward orientation (merciful, pure in heart, peacemakers). vv.10-12: The cost — persecution, linked to the prophets before them.",
    summarize_whole: "Jesus declares that the kingdom of God belongs to those who have nothing to offer — the spiritually destitute, the grieving, the meek, those who ache for justice. They are the blessed ones. Not the successful, the confident, or the morally accomplished — the broken, the hungry, and the persecuted.",
  }),

  redemptive_thread: JSON.stringify({
    speaks_of_christ: "Not directly — Jesus is the speaker, not the subject. But he enacts Isaiah 61:1: 'The Spirit of the Lord is upon me, because he has anointed me to proclaim good news to the poor.' Jesus is, in himself, the fulfilment of the very word he speaks.",
    relation_to_christ: "Anticipatory — the Beatitudes describe the shape of kingdom people, a shape that finds its fullest expression in Jesus himself. He is the supremely poor in spirit, the mourner over Jerusalem, the meek one who inherits the earth.",
    biblical_theme: "The great biblical reversal: God consistently chooses the weak, the barren, the overlooked (Abraham, Moses, David, the remnant of Israel). The Beatitudes are the most concentrated expression of this pattern in the New Testament.",
    promise: "The kingdom of heaven is already theirs (vv.3, 10 — present tense). The earth will be theirs. They will be comforted. They will be filled. Every Beatitude promise reaches forward to the new creation.",
    need_for_christ: "The poor in spirit are poor because they see clearly — they know they cannot produce righteousness by effort. This is exactly the person the gospel is for. The Beatitudes are a portrait of conversion: those who see their need are the ones to whom the kingdom is given.",
    nature_of_god: "God is the God who gives what cannot be earned. The kingdom is not a reward for the morally superior — it is a gift to the dependent. This is the character of the God who justifies the ungodly (Romans 4:5).",
    jesus_hero: "Jesus is the one who embodies every Beatitude perfectly. He was poor in spirit — utterly dependent on the Father. He mourned over Jerusalem. He was meek — the servant king. He hungered for righteousness — his food was to do the Father's will (John 4:34). In proclaiming the Beatitudes, he is not just teaching — he is revealing himself.",
    summary: "The Beatitudes are not a moral programme to achieve; they are a portrait of the person Jesus is forming by grace. He himself is the firstborn of this new humanity — and those who follow him find, to their astonishment, that they are already what he describes.",
  }),

  implications: JSON.stringify({
    about_god: "God's blessing is not distributed according to merit or confidence. He gives the kingdom to the poor in spirit — those with nothing to bring. This is the theology of grace embedded in the very first word of the Sermon on the Mount.",
    about_ourselves: "We are not natural candidates for the kingdom. The destitution the Beatitudes describe is not a spiritual practice we cultivate — it is an honest recognition of what we are. We cannot manufacture poverty of spirit; we can only stop pretending we are not poor.",
    about_christ: "Jesus is not simply the teacher of the Beatitudes — he is their subject. He is the one who was poor in spirit, mourned, was meek, hungered for righteousness, was persecuted. The Beatitudes are his autobiography before they are our programme.",
    timeless: "The blessed life is the received life. Every culture rewards self-sufficiency; the kingdom rewards dependence. This principle does not date.",
    doctrines: "Justification by grace through faith: the poor in spirit receive the kingdom — they do not earn it. Sanctification: the Beatitudes describe a process of formation, not a threshold to clear. Eschatology: the future promises ground present suffering in coming resolution.",
    examples: "Jesus himself — mourning over Jerusalem (Matt 23:37), meek and lowly (11:29), the persecuted Servant (Isaiah 53).",
    commands: "There are no commands in the Beatitudes — but the posture they describe (dependence, hunger, mercy) can be cultivated. Specifically: practice honesty about your spiritual poverty rather than performing confidence.",
    errors: "Avoid: using the Beatitudes as a checklist ('Am I meek enough?'). Avoid: spiritualising them so thoroughly that they lose any connection to real grief, real meekness, real persecution.",
    sins: "Self-sufficiency. The performance of spiritual confidence that masks the actual destitution we feel.",
    promises: "The kingdom is already theirs — present tense. Comfort is coming. The earth is theirs. They will be filled. These are not vague aspirations but covenant promises from the King.",
    new_thoughts: "The very desire for righteousness is itself a gift — and evidence of the Spirit's work. Hunger for God is not a problem to solve; it is a sign of life.",
    unbeliever: "The Beatitudes are an invitation, not a condemnation. If you have sat in church feeling like a fraud — if you know the gap between who you are and who you are supposed to be — this is Jesus speaking to you. The kingdom is for people who know they need it.",
    compiled: "The blessed life begins not with achievement but with poverty — the honest acknowledgment that we have nothing to bring. This is not a spiritual low point on the way to something better; it is the beginning of the kingdom. Come with empty hands.",
  }),

  outline: JSON.stringify([
    { id: OP.p1, text: "The Blessed Life Starts Where You Think It Ends" },
    { id: OP.p2, text: "What God Calls Blessed Is Not What the World Calls Successful" },
    { id: OP.p3, text: "The Kingdom Is Already Yours — and You Can't Earn It" },
  ]),

  functional_elements: JSON.stringify({
    [OP.p1]: {
      explanation: "The Beatitudes begin with the poor in spirit — the spiritually destitute, those with nothing to bring. The Greek ptochos (beggar) is the most extreme form of poverty. Jesus is not commending false modesty; he is describing someone who has genuinely run out of spiritual resources and knows it. This is the starting point of the kingdom — not confidence, not moral accomplishment, but the recognition that you cannot get there from here on your own.",
      application: "Most of us spend enormous energy pretending we are further along than we are — spiritually, emotionally, morally. The invitation here is to stop. To acknowledge the gap. To come to God not with a progress report but with empty hands. What would it look like this week to be honest with God about where you actually are, rather than where you think you should be?",
      illustration: "Augustine: 'Our heart is restless until it rests in thee.' The restlessness is not the problem — it is the beginning of the journey. The person who knows they are restless is closer to God than the person who has convinced themselves they are fine.",
    },
    [OP.p2]: {
      explanation: "The world measures blessing in visible outcomes: health, wealth, success, confidence, social standing. Jesus's list is astonishing in its inversion: mourners, meek, hungry, persecuted. The word makarios (blessed) was used in Greek culture to describe the enviable life of the gods — untouched by earthly trouble. Jesus takes that word and fills it with grief, dependence, and persecution. This is not an accident; it is the scandal of the kingdom.",
      application: "We absorb the world's metrics without realising it. In the church, this often looks like: visible spiritual confidence, leadership, growth, certainty. But Jesus says the one mourning in the back row — grieving their sin, grieving the world's brokenness — is the one who will be comforted. Ask yourself honestly: who do I believe God is blessing in this room?",
      illustration: "C.S. Lewis, A Grief Observed: In the wake of Joy's death, Lewis wrote, 'Where is God?' The honest grief of that book is itself a form of the blessing Jesus describes — the person who will not settle for a God who doesn't show up, who mourns the distance, who refuses comfortable answers. That is the mourner Jesus says God will comfort.",
    },
    [OP.p3]: {
      explanation: "Both the first and the eighth Beatitude end with the same phrase: 'for theirs is the kingdom of heaven.' Present tense. Not 'will be' — is. The kingdom already belongs to the poor in spirit and the persecuted. This is not a future promise contingent on good behaviour; it is a present declaration. The kingdom is given — not earned, not built, not achieved. And the evidence that you have received it is not moral accomplishment but the posture of dependence that the Beatitudes describe.",
      application: "If you have been trying to earn your way into God's blessing — by faithfulness, by discipline, by not sinning as much as you used to — the Beatitudes are the most liberating thing you will ever hear. Stop trying to deserve it. It is already yours. The question is whether you will live from that reality.",
      illustration: "Brennan Manning: 'The greatest single cause of atheism in the world today is Christians, who acknowledge Jesus with their lips, then walk out the door and deny him by their lifestyle.' What Manning is pointing to is a Christianity of performance that has lost its foundation in grace. The Beatitudes call us back.",
    },
  }),

  manuscript: `There is a line in the Sermon on the Mount that should stop us cold every time we read it. Not because it is unclear, but because it is perfectly clear.

"Blessed are the poor in spirit, for theirs is the kingdom of heaven."

We have heard this so many times that we no longer feel its strangeness. We smooth it over with the word humility, make it a virtue to cultivate, turn it into advice for the spiritually ambitious. But that is not what Jesus is saying. He is not commending a spiritual discipline. He is describing a category of person — the destitute, the bankrupt, those who have nothing left to bring.

The Greek word for poor here is not the word for someone who doesn't have quite enough. It is the word for someone who has nothing. The beggar at the gate. The one with empty hands. And Jesus says: that person — the one standing there with nothing — already has the kingdom of heaven.

This is not a programme. It is not a ladder. It is a declaration.

I want to suggest this morning that the Beatitudes are the key to everything Jesus says in Matthew 5 through 7. Every instruction that follows — about anger, about lust, about prayer, about money, about anxiety — must be read through this lens. Because if you start the Sermon on the Mount without understanding the Beatitudes, you will turn the whole thing into a stricter law. You will walk out of here in three weeks more defeated than when you came in.

But if you understand what Jesus is doing here — if you feel the weight of that word blessed landing on the broken and the dependent and the persecuted — then everything else becomes not a demand to fulfil but a portrait of who you already are in Christ.

So let's slow down. Let's feel the strangeness. Let's let this be as disorienting as it was meant to be.

Jesus goes up on a mountain. Matthew wants you to notice that. Moses went up a mountain to receive the law — and came back down with commands. Jesus goes up the mountain and sits down, which is the posture of a teacher with authority, and what he delivers is not a stricter set of rules. It is a description of the people who belong to him. He is naming them.`,

  delivery_notes: "Let the silences do work. Read vv.3-12 aloud before the first point — slowly. Don't rush past 'poor in spirit.' Stay there for a moment before explaining it. The congregation needs time to feel the strangeness before they can receive the explanation. Avoid triumphalism in the close — the invitation is to come with empty hands, not to feel good about being humble.",
  timing_notes: "Beatitude survey: 10 min. Point 1 (poor in spirit as entry point): 8 min. Point 2 (world vs kingdom metrics): 8 min. Point 3 (present tense kingdom): 7 min. Close/invitation: 5 min. Total: ~38 min.",
};

// ── Export ─────────────────────────────────────────────────────────────────────

module.exports = {
  SERIES_ID,
  SERMON_ID,
  series,
  sermon,
};
