// demoData.js — Sermon on the Mount demo series for SermonForge
//
// Loaded by the db-loadDemoSeries IPC handler in main.js.
// All IDs are fixed so the handler is idempotent.
// Sermons are at varied stages (planning → writing) to demonstrate the full workflow.

"use strict";

// ── Fixed IDs ─────────────────────────────────────────────────────────────────

const SERIES_ID = "demo-sotm-series-2026";

const SERMON_IDS = {
  s1: "demo-sotm-sermon-01",
  s2: "demo-sotm-sermon-02",
  s3: "demo-sotm-sermon-03",
  s4: "demo-sotm-sermon-04",
  s5: "demo-sotm-sermon-05",
  s6: "demo-sotm-sermon-06",
};

// Outline point UUIDs — fixed so functional_elements can key off them correctly
const OP = {
  s1p1: "f47a0001-0000-0000-0000-000000000001",
  s1p2: "f47a0001-0000-0000-0000-000000000002",
  s1p3: "f47a0001-0000-0000-0000-000000000003",
  s2p1: "f47a0002-0000-0000-0000-000000000001",
  s2p2: "f47a0002-0000-0000-0000-000000000002",
  s2p3: "f47a0002-0000-0000-0000-000000000003",
  s3p1: "f47a0003-0000-0000-0000-000000000001",
  s3p2: "f47a0003-0000-0000-0000-000000000002",
  s5p1: "f47a0005-0000-0000-0000-000000000001",
  s5p2: "f47a0005-0000-0000-0000-000000000002",
  s5p3: "f47a0005-0000-0000-0000-000000000003",
};

// ── Series ─────────────────────────────────────────────────────────────────────

const series = {
  id: SERIES_ID,
  title: "The Sermon on the Mount",
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
   A. Jesus and the Law (5:17-20)
   B. Anger and Reconciliation (5:21-26)
   C. Lust and Purity (5:27-30)
   D. Divorce and Oaths (5:31-37)
   E. Retaliation and Love for Enemies (5:38-48)
IV. Kingdom Devotion: Giving, Prayer, Fasting (6:1-18)
V. Kingdom Priorities: Money and Anxiety (6:19-34)
VI. Kingdom Decision: The Two Ways (7:13-29)`,
  status: "active",
  canon_category: "nt",
  redemptive_context: "Matthew writes to a community negotiating its relationship to Jewish tradition and the wider church. Jesus appears as the new Moses — delivering his teaching from a mountain — but what he delivers is not a stricter code. It is the fulfilment of the entire covenant story: the people God always intended, formed by the Spirit, living under his reign. The Sermon on the Mount stands at the hinge between old covenant aspiration and new covenant reality, and every pericope in it reaches forward to Calvary and the resurrection.",
  book_background: "Matthew's Gospel was likely written between AD 80–90, possibly in Antioch, for a community that included both Jewish Christians and Gentile believers. Matthew draws heavily on Mark and Q, but organises the material around five major discourses — a deliberate echo of the five books of Moses. The Sermon on the Mount is the first and most foundational of these. Matthew's Jesus is consistently presented as the fulfilment of Israel's story: the one in whom the law and the prophets are completed.",
  book_argument: "Matthew's controlling argument is that Jesus of Nazareth is Israel's long-awaited Messiah and the world's rightful King. The Gospel traces his genealogy, birth, baptism, temptation, teaching, miracles, death, and resurrection as the fulfilment of Israel's scriptures. The Sermon on the Mount is central to this argument: Jesus does not abolish the covenant but brings it to completion in his own person and in the community he is forming.",
  book_structure: "Matthew is organised around five major teaching discourses, each ending with the formula 'when Jesus had finished these sayings' (7:28; 11:1; 13:53; 19:1; 26:1). These are bracketed by a narrative prologue (birth and preparation, chs. 1–4) and a passion narrative (chs. 26–28). The Sermon on the Mount is the first discourse — the manifesto of the Kingdom.",
  series_motivation: "This congregation has absorbed the Sermon on the Mount as a moral framework — a checklist of better behaviour. But Jesus is describing a people, not a programme. Many in the room are exhausted by the gap between who they feel they should be and who they actually are. This series is an opportunity to reframe the entire discourse not as commands to obey but as a portrait of the person God is forming by grace — and to show that kingdom living flows from identity, not effort.",
  emerging_big_idea: "You cannot perform your way into the kingdom life Jesus describes. You receive it. You inhabit it. That is the shock of the Beatitudes and the logic of everything that follows.",
};

// ── Sermon 1: "Blessed Are the Broken" — Matthew 5:1-12 — writing stage ──────

const sermon1 = {
  id: SERMON_IDS.s1,
  series_id: SERIES_ID,
  title: "Blessed Are the Broken",
  passage: "Matthew 5:1-12",
  date: "2026-01-04",
  stage: "writing",
  mpt: "Jesus declared that those utterly dependent on God — not the morally accomplished — were the ones already living under his reign.",
  mps: "The life God blesses is not the life you build; it is the life you surrender.",
  topic_theme: "Kingdom ethics, Blessed life, Dependence on God, Grace over merit",
  audience_assumptions: "A congregation that largely equates faithfulness with moral effort and confidence. Many privately feel like failures. Some have been Christians for decades and still feel they have nothing to show for it.",
  background_noise: "A cultural moment obsessed with productivity, self-improvement, and visible success. The prosperity gospel is in the background — the idea that God rewards the thriving.",
  study_guide_note: "This opening sermon sets the hermeneutical key for the whole series. Everything Jesus says in Matthew 5–7 must be read through this lens: the kingdom belongs to those who know they have nothing to bring. Read vv.3-12 slowly before the group meets.",

  observations: JSON.stringify({
    context: "The Beatitudes come immediately after Jesus's temptation (4:1-11) and his early Galilean ministry (4:12-25). The crowds have gathered (4:25), and Jesus goes up on a mountain — deliberately echoing Moses at Sinai. The Sermon is addressed primarily to disciples (5:1-2) but within earshot of the crowds. Context matters: Jesus has just called the broken and ordinary to follow him (4:18-22).",
    divisions: "The Beatitudes form a single unit (5:3-12) introduced by 'Seeing the crowds, he went up on the mountain' (v.1). There are two clusters: beatitudes naming inward dispositions (vv.3-6) and beatitudes naming outward orientations (vv.7-9), followed by a third group on persecution (vv.10-12). Verse 3 and verse 10 both contain 'for theirs is the kingdom of heaven,' forming a deliberate bracket around the whole.",
    commands: "Notably absent. Every statement is a declaration ('Blessed are...'), not a command. Jesus is not telling people what to do to become blessed — he is describing people who already are. This is the interpretive key the congregation needs.",
    statements: "Nine declarative 'blessed are' statements, each naming a quality and then a promise. The most disorienting: 'Blessed are the poor in spirit' (v.3) — not 'the spiritually mature' or 'the morally accomplished.' The Greek word for poor (ptochos) means destitute, utterly without resources.",
    characters: "Jesus as teacher-king, delivering the manifesto of his kingdom from a mountain. Disciples as primary audience. The crowds within earshot. The 'poor in spirit,' 'meek,' 'mourners' etc. are not defined groups but postures — descriptions of the posture of the kingdom person.",
    big_ideas: "The kingdom belongs to an unexpected set of people. Blessing in God's economy is not what the world calls blessing. The Beatitudes describe a people formed by grace and dependence, not achievement. There is a circularity: those who hunger and thirst for righteousness are promised they will be filled — the very desire God gives is the guarantee of the gift.",
    obvious_point: "The people God calls blessed are not who you'd expect — not the powerful, the confident, the morally accomplished. They are the broken, the dependent, the grieving, the persecuted. The kingdom is already theirs.",
    basic_outline: "I. The Unexpected Recipients (vv.3-6) — poverty of spirit, mourning, meekness, hunger\nII. The Unexpected Characteristics (vv.7-9) — mercy, purity, peacemaking\nIII. The Unexpected Cost (vv.10-12) — persecution because of righteousness",
    applications: "This passage challenges any form of Christianity that equates faithfulness with confidence, success, or moral accomplishment. It calls the congregation to examine whether they are trying to earn blessing or receive it. Specific question: what does it mean practically to be 'poor in spirit' in a culture that rewards self-confidence?",
  }),

  interpretation: JSON.stringify({
    context_impact: "The mountain setting is not incidental — it evokes Sinai, where Moses received the law. But where Moses went up to receive commands from a hidden God, Jesus himself is on the mountain, teaching with his own authority ('You have heard... but I say to you' follows in 5:21ff). The disciples are the new Israel receiving a new covenant, but the covenant is not a stricter set of rules — it is a transformed people.",
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
    promise: "The kingdom of heaven is already theirs (vv.3, 10 — present tense). The earth will be theirs. They will be comforted. They will be filled. Every Beatitude promise reaches forward to the new creation — where all mourning is ended, all hunger is satisfied.",
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
    doctrines: "Justification by grace through faith: the poor in spirit receive the kingdom — they do not earn it. Sanctification: the Beatitudes describe a process of formation, not a threshold to clear. Eschatology: the future promises (they will be comforted, they will inherit the earth) ground present suffering in coming resolution.",
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
    { id: OP.s1p1, text: "The Blessed Life Starts Where You Think It Ends" },
    { id: OP.s1p2, text: "What God Calls Blessed Is Not What the World Calls Successful" },
    { id: OP.s1p3, text: "The Kingdom Is Already Yours — and You Can't Earn It" },
  ]),

  functional_elements: JSON.stringify({
    [OP.s1p1]: {
      explanation: "The Beatitudes begin with the poor in spirit — the spiritually destitute, those with nothing to bring. The Greek ptochos (beggar) is the most extreme form of poverty. Jesus is not commending false modesty; he is describing someone who has genuinely run out of spiritual resources and knows it. This is the starting point of the kingdom — not confidence, not moral accomplishment, but the recognition that you cannot get there from here on your own.",
      application: "Most of us spend enormous energy pretending we are further along than we are — spiritually, emotionally, morally. The invitation here is to stop. To acknowledge the gap. To come to God not with a progress report but with empty hands. What would it look like this week to be honest with God about where you actually are, rather than where you think you should be?",
      illustration: "Augustine: 'Our heart is restless until it rests in thee.' The restlessness is not the problem — it is the beginning of the journey. The person who knows they are restless is closer to God than the person who has convinced themselves they are fine.",
    },
    [OP.s1p2]: {
      explanation: "The world measures blessing in visible outcomes: health, wealth, success, confidence, social standing. Jesus's list is astonishing in its inversion: mourners, meek, hungry, persecuted. The word makarios (blessed) was used in Greek culture to describe the enviable life of the gods — untouched by earthly trouble. Jesus takes that word and fills it with grief, dependence, and persecution. This is not an accident; it is the scandal of the kingdom.",
      application: "We absorb the world's metrics without realising it. In the church, this often looks like: visible spiritual confidence, leadership, growth, certainty. But Jesus says the one mourning in the back row — grieving their sin, grieving the world's brokenness — is the one who will be comforted. Ask yourself honestly: who do I believe God is blessing in this room?",
      illustration: "C.S. Lewis, A Grief Observed: In the wake of Joy's death, Lewis wrote, 'Where is God?' The honest grief of that book is itself a form of the blessing Jesus describes — the person who will not settle for a God who doesn't show up, who mourns the distance, who refuses comfortable answers. That is the mourner Jesus says God will comfort.",
    },
    [OP.s1p3]: {
      explanation: "Both the first and the eighth Beatitude end with the same phrase: 'for theirs is the kingdom of heaven.' Present tense. Not 'will be' — is. The kingdom already belongs to the poor in spirit and the persecuted. This is not a future promise contingent on good behaviour; it is a present declaration. The kingdom is given — not earned, not built, not achieved. And the evidence that you have received it is not moral accomplishment but the posture of dependence that the Beatitudes describe.",
      application: "If you have been trying to earn your way into God's blessing — by faithfulness, by discipline, by not sinning as much as you used to — the Beatitudes are the most liberating thing you will ever hear. Stop trying to deserve it. It is already yours. The question is whether you will live from that reality.",
      illustration: "Brennan Manning: 'The greatest single cause of atheism in the world today is Christians, who acknowledge Jesus with their lips, then walk out the door and deny him by their lifestyle. That is what an unbelieving world simply finds unbelievable.' What Manning is pointing to is a Christianity of performance that has lost its foundation in grace. The Beatitudes call us back.",
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

// ── Sermon 2: "You Are Salt and Light" — Matthew 5:13-16 — outline stage ──────

const sermon2 = {
  id: SERMON_IDS.s2,
  series_id: SERIES_ID,
  title: "You Are Salt and Light",
  passage: "Matthew 5:13-16",
  date: "2026-01-11",
  stage: "outline",
  mpt: "Jesus declared his disciples' identity — salt, light, a city on a hill — as a present fact, then called them to live without losing that identity.",
  mps: "You do not earn the right to influence the world by becoming more impressive; you lose it the moment you start hiding who you are.",
  topic_theme: "Christian identity, Cultural engagement, Witness, Vocation",
  audience_assumptions: "People who feel the tension between their faith and their public life — who have learned to compartmentalise. Also: people who feel invisible, as if their faithfulness does not matter.",
  background_noise: "A cultural climate where public Christian identity feels costly. Debates about whether the church is losing influence. The temptation toward either retreat or aggressive culture-war posturing.",
  study_guide_note: "This sermon follows directly from the Beatitudes: having described who kingdom people are, Jesus now says what they do in the world. Note that 'you are' precedes any command. Identity before function.",

  observations: JSON.stringify({
    context: "Immediately follows the Beatitudes. The 'you' in 'you are the salt of the earth' (v.13) is emphatic in the Greek — you, the ones I just described, the poor in spirit, the mourners, the meek. The same group of apparently powerless people is being declared the preserving agent of the earth.",
    divisions: "Two images (salt, vv.13; light, vv.14-16), each with a warning about loss of function. Salt that loses its saltiness. Light that is hidden. Both warnings point in the same direction: the danger is not opposition but self-erasure.",
    statements: "Three declarative statements: 'You are the salt of the earth' (v.13). 'You are the light of the world' (v.14). 'A city set on a hill cannot be hidden' (v.14). All present tense declarations of identity, not aspirational goals.",
    commands: "Only one imperative in the section: 'let your light shine before others, so that they may see your good works and give glory to your Father who is in heaven' (v.16). The command is not to shine but to let the light already present shine — to stop obstructing it.",
    obvious_point: "You already are what you need to be. Don't hide it. Don't dilute it. The world needs what you have been made to be.",
  }),

  interpretation: JSON.stringify({
    context_impact: "Salt in the first century was a preservative and a seasoning — essential to daily life. Light in a world without electricity was the difference between function and paralysis. Jesus is not using polite metaphors; he is saying that the community he is forming is essential to the world. The language is bold to the point of seeming arrogant — unless it is true.",
    contrasts: "Salt that has lost its taste — useless, discarded. Light that is hidden under a basket — pointless. The warnings are not about moral failure but about identity failure: becoming something other than what you were made to be. The contrast is not between good Christians and bad Christians but between Christians who are fully themselves and Christians who have diluted or hidden who they are.",
    cross_refs: "Isaiah 42:6 ('I will make you a light for the nations'); Philippians 2:15 ('shine as lights in the world'); 1 Peter 2:9 ('a chosen race... that you may proclaim the excellencies of him who called you out of darkness into his marvellous light').",
    summarize_whole: "Jesus declares that the people he has just described — the dependent, the broken, the mourning — are the salt that preserves the earth and the light that illumines the world. Their calling is not to become something else but to be this without apology or concealment.",
  }),

  outline: JSON.stringify([
    { id: OP.s2p1, text: "You Are — Not You Should Become" },
    { id: OP.s2p2, text: "The Only Way to Lose Your Saltiness Is to Pretend You Are Not Salt" },
    { id: OP.s2p3, text: "Good Works That Point Away from Themselves" },
  ]),

  functional_elements: JSON.stringify({
    [OP.s2p1]: {
      explanation: "The verbs are present tense declarations, not future goals. Jesus does not say 'you should try to be salt and light' or 'if you work hard enough, you might become a light.' He says: you are. The identity precedes the function. This is the grammar of the new creation: what God declares, is.",
      application: "Most of us live as if we need to earn the right to speak. We believe that once we have our lives together — once we are more consistent, more faithful, less complicated — then we will have something to offer. But Jesus says: you already are the thing the world needs. The question is whether you will live accordingly.",
      illustration: "",
    },
    [OP.s2p2]: {
      explanation: "Salt that has lost its saltiness is not really salt anymore — it is an imposter. Jesus's warning is not about moral failure but about identity failure. The danger for the church is not that it will be hated for what it is, but that it will cease to be anything distinct at all — that it will quietly conform to the shape of the surrounding culture until no one can tell the difference.",
      application: "",
      illustration: "G.K. Chesterton: 'The church is not a human institution that happens to believe in God. It is a divine institution that happens to be made of humans.' When it starts acting like merely the former, it loses its saltiness.",
    },
    [OP.s2p3]: {
      explanation: "The goal of good works is not the applause of the world — it is the glory of the Father. This is a crucial distinction. The church that performs goodness for its own reputation is building an audience. The church that does good because it is in the family of the Father is building the kingdom. The works should point away from themselves.",
      application: "Ask before any public act of faith or service: who will get the credit if this goes well? If the answer is 'us,' reconsider the motive.",
      illustration: "",
    },
  }),
};

// ── Sermon 3: "Beyond the Letter" — Matthew 5:17-48 — study stage ─────────────

const sermon3 = {
  id: SERMON_IDS.s3,
  series_id: SERIES_ID,
  title: "Beyond the Letter",
  passage: "Matthew 5:17-48",
  date: "2026-01-18",
  stage: "study",
  mpt: "Jesus claimed to fulfil the law by bringing its intent to light — the heart from which righteousness flows, not merely the behaviour it produces.",
  mps: "God is not satisfied with behaviour that complies while the heart rages — he is forming people whose impulses are being renewed from the inside.",
  topic_theme: "Law and gospel, Heart transformation, The higher righteousness, Sanctification",
  audience_assumptions: "People who have reduced Christianity to behaviour management. People who comply externally while struggling internally and feel like frauds. Also: people who have rejected Christianity because its ethical demands seemed impossible.",
  background_noise: "A therapeutic culture that has made 'authenticity' — acting out whatever you feel — the highest good. Also: a moralistic Christianity that evaluates people by external compliance.",
  study_guide_note: "The hardest sermon in the series to handle well. The antitheses ('You have heard... but I say') are not a stricter law — they are a diagnosis. The goal is not to make people feel worse about their anger and lust, but to drive them to the grace that transforms rather than the effort that manages.",

  observations: JSON.stringify({
    context: "v.17 is the fulcrum of the entire Sermon: 'Do not think that I have come to abolish the Law or the Prophets; I have not come to abolish them but to fulfil them.' Everything that follows in 5:18-48 is an unpacking of what 'fulfilment' means. The six antitheses ('You have heard... but I say') are not corrections of the law — they are X-rays of what the law was always reaching toward.",
    divisions: "Introduction (vv.17-20): Jesus's relationship to the law. Six antitheses: anger (vv.21-26), lust (vv.27-30), divorce (vv.31-32), oaths (vv.33-37), retaliation (vv.38-42), love for enemies (vv.43-48). The section closes with the staggering demand of v.48: 'Be perfect, therefore, as your heavenly Father is perfect.'",
    commands: "Multiple imperatives in the antitheses: be reconciled (v.24), gouge out your eye (v.29, hyperbole), let what you say be yes or no (v.37), love your enemies (v.44), pray for those who persecute you (v.44). Each one is impossible by behaviour management alone — which is the point.",
    statements: "'I have not come to abolish them but to fulfil them' (v.17). 'Unless your righteousness exceeds that of the scribes and Pharisees, you will never enter the kingdom of heaven' (v.20). 'Be perfect, therefore, as your heavenly Father is perfect' (v.48).",
    obvious_point: "The law was never just about external behaviour. It was always about the heart — the source from which action flows. Jesus is not raising the bar; he is revealing what the bar always was.",
    applications: "The antitheses cannot be preached as stricter demands without the context of grace that forms them — or the result is despair. The application must reach toward the Spirit's work of heart transformation, not just renewed effort.",
  }),

  interpretation: JSON.stringify({
    context_impact: "The Pharisees were the most rigorous law-keepers of their day. Yet Jesus says the disciples' righteousness must exceed theirs (v.20). This is either madness or a completely different definition of righteousness — and the antitheses explain which. The Pharisees pursued external compliance; Jesus is describing internal transformation. The difference is not degree but kind.",
    recurring_ideas: "The word heart (kardia) is not explicit in this passage but underlies every antithesis — lust in the heart (v.28), anger in the heart (v.22). The issue is always the interior life. 'Fulfil' (plerosai, v.17) carries the sense of bringing to full expression, not completing so it can be discarded.",
    contrasts: "You have heard vs. but I say. External compliance vs. internal transformation. Managing behaviour vs. being changed. The righteousness of the scribes vs. the righteousness of the kingdom.",
    cross_refs: "Jeremiah 31:33 ('I will put my law within them, and I will write it on their hearts'); Ezekiel 36:26-27 ('I will give you a new heart... and I will put my Spirit within you, and cause you to walk in my statutes'); Romans 8:4 ('in order that the righteous requirement of the law might be fulfilled in us, who walk not according to the flesh but according to the Spirit').",
    summarize_whole: "Jesus reveals that the law was always about the heart. He does not come to relax or intensify the external code — he comes to expose and transform the interior from which action flows. The only righteousness that exceeds the Pharisees' is the righteousness of a changed heart, which is not a product of effort but of the Spirit.",
  }),

  outline: JSON.stringify([
    { id: OP.s3p1, text: "Jesus Did Not Come to Lower the Bar — He Came to Reveal How High It Always Was" },
    { id: OP.s3p2, text: "The Problem Is Never Just the Behaviour — It Is the Heart That Produces It" },
  ]),

  functional_elements: JSON.stringify({
    [OP.s3p1]: {
      explanation: "The antitheses are not a stricter law. They are a diagnostic — an X-ray. 'You have heard it said, do not murder' — fine, most people manage that. 'But I say, whoever is angry with his brother' — suddenly, no one is righteous. This is not Jesus raising the bar arbitrarily; it is Jesus showing where the bar always was, beneath the surface of behaviour, in the depths of the heart.",
      application: "We spend enormous effort managing our behaviour while leaving the heart untouched. We stop saying the angry thing while nursing the angry thought. Jesus is saying: that is not righteousness. That is performance. The good news is that he came not to demand a better performance but to transform the performer.",
      illustration: "",
    },
    [OP.s3p2]: {
      explanation: "Lust is not a problem of the eyes; it is a problem of the heart. 'Gouge out your eye' is hyperbole (Jesus does not advocate self-mutilation — v.30 makes clear the alternative is the whole body destroyed). The point is that the solution to lust is not better content filters but a transformed desire — and that transformation is not within our power to produce.",
      application: "",
      illustration: "The alcoholic who stops drinking but spends every sober hour obsessing about alcohol has not been freed from alcohol — they have just been externally restrained. Jesus is describing a freedom deeper than restraint: renewed desire.",
    },
  }),
};

// ── Sermon 4: "The Hidden Life" — Matthew 6:1-18 — study stage ───────────────

const sermon4 = {
  id: SERMON_IDS.s4,
  series_id: SERIES_ID,
  title: "The Hidden Life",
  passage: "Matthew 6:1-18",
  date: "2026-01-25",
  stage: "study",
  mpt: "Jesus contrasted public religious performance rewarded by human approval with the private devotion rewarded by the Father who sees in secret.",
  topic_theme: "Prayer, Fasting, Giving, Spiritual disciplines, Hypocrisy, The hidden life with God",
  audience_assumptions: "People who have learned to perform their spirituality — in church, on social media, in community. Also: people who have abandoned spiritual disciplines because they feel too rote or too performative. Some who feel their private life with God is nearly non-existent.",
  study_guide_note: "The Lord's Prayer sits at the centre of this section and the centre of the whole Sermon. It is not a formula to recite but a pattern to inhabit — a portrait of the relationship with God the Sermon assumes. Have the group pray it together slowly.",

  observations: JSON.stringify({
    context: "Chapter 6 continues the teaching on kingdom righteousness from chapter 5, but shifts from the law to the devotional practices that sustain kingdom life. The three practices (giving, prayer, fasting) were the three pillars of Jewish piety. Jesus does not attack them — he purifies their motive.",
    divisions: "Three parallel sections, each following the same structure: 'when you give/pray/fast, do not be like the hypocrites who do X to be seen by others — they have received their reward. But you do Y in secret, and your Father who sees in secret will reward you.' At the centre is the Lord's Prayer (vv.9-13), which interrupts the pattern and expands the section on prayer.",
    commands: "Do not sound a trumpet when you give (v.2). Do not be like the hypocrites (v.5, 16). Go into your room and shut the door (v.6). Do not heap up empty phrases (v.7). Pray like this (v.9). Fast, anoint your head and wash your face (v.17).",
    statements: "'They have received their reward' (vv.2, 5, 16) — the aorist tense in Greek indicates a completed transaction. The human approval they sought is all the reward they will get. 'Your Father who sees in secret will reward you' (vv.4, 6, 18).",
    obvious_point: "Spiritual practices performed to impress other humans have already received their complete reward. God is not in the audience. The hidden life — unseen, unvalued by human observers — is the life God watches and rewards.",
    applications: "Social media and spiritual practices. The performance of prayer in church. Fasting as a discipline without any audience. The inner life as the real measure of spiritual health.",
  }),
};

// ── Sermon 5: "Seek First the Kingdom" — Matthew 6:19-34 — outline stage ──────

const sermon5 = {
  id: SERMON_IDS.s5,
  series_id: SERIES_ID,
  title: "Seek First the Kingdom",
  passage: "Matthew 6:19-34",
  date: "2026-02-01",
  stage: "outline",
  mpt: "Jesus diagnosed anxiety as the inevitable result of a heart trying to serve two masters — God and wealth — and called his disciples to the radical reorientation of seeking the kingdom first.",
  mps: "The antidote to anxiety is not willpower or perspective — it is the settled conviction that the God who clothes the lilies has already claimed you as his own.",
  topic_theme: "Anxiety, Money, Worry, Kingdom priorities, Trust, Single-mindedness",
  audience_assumptions: "Almost everyone in the room is anxious about something. Financial stress is real for many. The prosperity gospel and its inverse (if you worry, you lack faith) have both done damage. People need permission to bring their anxiety to God, not rebuke for having it.",
  study_guide_note: "This sermon pairs naturally with Philippians 4:6-7 for the study group. The key exegetical move is showing that 'do not be anxious' (v.25) is not a moral command to feel differently but a call to a reoriented life — seeking first the kingdom (v.33) is the actual solution.",

  outline: JSON.stringify([
    { id: OP.s5p1, text: "Your Treasure Tells You Who Your Master Is" },
    { id: OP.s5p2, text: "Anxiety Is the Symptom — Divided Loyalty Is the Disease" },
    { id: OP.s5p3, text: "Seek First — and Watch What Follows" },
  ]),

  functional_elements: JSON.stringify({
    [OP.s5p1]: {
      explanation: "'Where your treasure is, there your heart will be also' (v.21). Not: your heart determines where your treasure goes. The reverse: where you put your treasure, your heart follows. This is practical wisdom about how desire works — investment creates attachment. Jesus is not merely describing a fact about human psychology; he is issuing an invitation: put your treasure in the right place and your heart will follow.",
      application: "Where have you invested most significantly in the last six months — financially, emotionally, in terms of time? That is where your heart is. If there is a gap between where you want your heart to be and where your treasure actually is, that is where the work begins.",
      illustration: "Tim Keller: 'Idolatry is taking something that is genuinely good and making it ultimate.' Money is not the problem; making money the thing that secures your future, proves your worth, or guarantees your children's wellbeing — that is the problem. The thing that has become ultimate is the thing your heart is anxious to protect.",
    },
    [OP.s5p2]: {
      explanation: "vv.22-24 are the diagnostic section. The 'eye' (v.22) is the lamp of the body — it lets light in or keeps it out. A 'bad eye' in Jewish idiom meant a stingy or miserly person; a 'clear eye' meant generosity. If your whole orientation is toward accumulation and protection, you are living in darkness even if you think you can see. The reason you cannot serve two masters (v.24) is not that the masters are demanding but that a divided heart cannot function — it cannot commit fully to either.",
      application: "What are you trying to guarantee with your money? Security for retirement? Your children's future? The respect of your community? Each of these is good. But when any of them becomes the thing your heart is arranged around, you have a master that is competing with God — and the anxiety that produces is not a personality quirk. It is a symptom.",
      illustration: "",
    },
    [OP.s5p3]: {
      explanation: "'Seek first the kingdom of God and his righteousness, and all these things will be added to you' (v.33). This is not a prosperity formula — Jesus does not promise wealth, comfort, or the absence of hardship. 'All these things' (food, clothing, the basics of life) refers back to vv.25-32. The promise is provision, not affluence. But the logic is clear: when the kingdom is your first pursuit, the anxious scarcity that drives accumulation is replaced by the trust of a child who knows the Father.",
      application: "What would change in your daily life if you made a concrete decision this week about what you are seeking first? Not generically ('I'll pray more') but specifically: what decision about your money, your time, your ambition would look different if kingdom came first?",
      illustration: "Augustine's Confessions, opening line: 'Thou madest us for thyself, and our heart is restless, until it repose in thee.' Every anxiety is ultimately a restless heart that has not yet found what it was made for. The promise of v.33 is that there is rest — but it comes on the other side of the reorientation.",
    },
  }),
};

// ── Sermon 6: "The Two Ways" — Matthew 7:13-29 — planning stage ──────────────

const sermon6 = {
  id: SERMON_IDS.s6,
  series_id: SERIES_ID,
  title: "The Two Ways",
  passage: "Matthew 7:13-29",
  date: "2026-02-08",
  stage: "planning",
  topic_theme: "Decision, Discipleship, Obedience, Hearing and doing, False prophets, The wise and foolish builder",
  study_guide_note: "The final sermon of the series. Resist the temptation to close with comfort — Jesus deliberately makes this uncomfortable. The crowds were 'astonished' (v.28) and the note of authority is the last word. Send the group out with the question: are you hearing and doing, or only hearing?",
};

// ── Export ─────────────────────────────────────────────────────────────────────

module.exports = {
  SERIES_ID,
  SERMON_IDS,
  series,
  sermons: [sermon1, sermon2, sermon3, sermon4, sermon5, sermon6],
};
