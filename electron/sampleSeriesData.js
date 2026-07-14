// sampleSeriesData.js — seed for the Series Planning screen's "Open the sample
// series" door. The planner-side sibling of sampleData.js (the sample sermon):
// a complete, fully-planned BOOK series the pastor can explore and reset
// without it ever touching his real library. All IDs use the fixed
// `sample-luke-` prefix — list queries filter `sample-%` out, and the
// load-sample-series reseed deletes by THIS prefix (never the broad
// `sample-%`, which would also destroy the sample sermon's rows).
//
// Provenance: this is the pastor's real series — "The Gospel of Luke:
// Reintroducing Jesus" (C3 Denton, 2014) — from his two planning documents
// (Big Picture Overview + Series Plan). The planner was patterned on this
// series, so it seeds the three-level model on its native shape:
// Book ▸ Section ▸ Sermon, every level a Title · range · Big idea · Overview
// unit. Where the source documents were incomplete, the gaps were drafted in
// the same voice and RATIFIED BY THE PASTOR at review (2026-07-14):
//   - Section big ideas/overviews for Parts 2–4 (the docs only wrote Part 1's).
//   - Every Part 2–4 sermon big idea (the docs carried title + passage only).
//   - Part 4 extended through Luke 22–24 (the source plan stopped at 21:36;
//     titles/passages follow the pastor's own pericope pacing and title style).
//   - Two Part-1 sermons the docs left blank (Shepherds; John the Baptizer
//     pt. 1) and four Part-1 overviews (JtB pt. 2/3, Humanity, Satan).
//   - "Through the eyes of Elizabeth" (1:24-25; 39-45) and "The Prodigal God:
//     Lost Brother" (15:1-2; 25-32) carried compound references the passage
//     parser rejects (disjoint ranges are out of scope) — seeded as their core
//     spans (1:39-45 / 15:25-32); the dropped context verses are covered by
//     the Zechariah / Lost Sheep sermons, so Coverage stays gap-free.
//   - "Through the Eyes of Joseph" keeps an EMPTY passage on purpose: the
//     pastor's plan marked it "(tbd)" (the natural text is Matthew 1:18-25,
//     but a cross-book reference in a book series misparses against Luke —
//     see the coverage.js cross-book note). One honest open slot also shows
//     the Coverage panel's unreadable affordance.
//   - The intro sermon's passage is "Luke-Acts" (his artifact) — deliberately
//     not a chapter:verse reference; it reads as unreadable in Coverage, which
//     is true: it's a big-picture sermon, not a pericope.
//   - structural_outline is the pastor's own four-movement breakdown, NOT the
//     Bock commentary outline his private document carried (a commercial
//     commentary's outline doesn't ship verbatim in a public sample).
//
// Dates: every sermon is laid on consecutive Sundays from 2026-09-13 (the
// same fictional fall-2026 calendar the sample sermon uses), so the Schedule
// screen shows the finished plan — seasons, pacing strip, mirrored end_date.

"use strict";

const { SERMON_STATUS, SERIES_STATUS, STAGE, SUB_PHASE } = require("./contracts.cjs");

// ── Fixed IDs ─────────────────────────────────────────────────────────────────

const SERIES_ID = "sample-luke-2026";
const SECTION_ID = (n) => `sample-luke-sec-${n}`;
const SERMON_ID = (n) => `sample-luke-sermon-${String(n).padStart(3, "0")}`;

// ── Sunday calendar ───────────────────────────────────────────────────────────
// Consecutive Sundays from the fixed start. Pure date arithmetic in UTC so the
// seed is identical on every machine (no timezone drift, no "now").

const FIRST_SUNDAY = "2026-09-13";
function sundayAt(index) {
  const [y, m, d] = FIRST_SUNDAY.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d + index * 7);
  return new Date(t).toISOString().slice(0, 10);
}

// ── Series — the book node ────────────────────────────────────────────────────

const series = {
  id: SERIES_ID,
  title: "The Gospel of Luke: Reintroducing Jesus",
  color: "crimson",
  description: "A walk through Luke's Gospel to see Jesus again, as if for the first time.",
  year: 2026,
  kind: "book",
  book_id: "luke",
  canon_category: "nt_gospels",
  passage_range: "Luke 1:1–24:53",
  big_idea: "Reintroducing Jesus to people who are already familiar with Him.",
  overview:
    "The Gospel of Luke is the first of a two-part work (the second being Acts) written by Luke, a Gentile doctor who traveled extensively with the Apostle Paul. Luke's purpose is to give an orderly, well-researched account of “the things that have been accomplished among us” (1:1) to Theophilus — a man who was familiar with Jesus, but might have begun to doubt his association with Him. Given the many struggles of the early church, perhaps his focus had drifted from the unique beauty of the Jesus he'd first met to the ever-present difficulties of following Him. He needed to see Jesus again for the first time, and Luke provides him that fresh look.\n\nChristians today are just as susceptible to the same kind of “Jesus drift,” where difficulties and distractions push Him to the margins of our thinking and other things take center stage. Jesus is familiar to us, but too often He is not compelling. Christianity becomes a brand that includes Jesus instead of a movement defined by Him. In either case, we need the grace of a fresh look, and Luke's Gospel provides it: a Jesus glorious enough to shape everything about us around His mission — God's plan of redemption.",
  structural_outline:
    "Luke walks through the career of Jesus in four movements, following the text itself:\n" +
    "I. Seeing Him Through Others' Eyes (1:1–4:13) — God's promised redemption told through a series of testimonies, from ordinary people and divine beings.\n" +
    "II. Seeing Him with New Eyes (4:14–9:50) — the Galilean ministry: preaching, healing, calling — every episode pressing the question “who is this?” toward Peter's confession and the mountain.\n" +
    "III. The Gospel in Real Life (9:51–19:27) — the road to Jerusalem: discipleship where we actually live — prayer, money, neighbors, humility, lostness.\n" +
    "IV. Taking the Message on Mission (19:28–24:53) — the week that changed everything: cross, empty tomb, commission — setting the stage for Acts.",
  start_date: sundayAt(0),
  // end_date is computed below, after the sermon list — the mirror the
  // Schedule's bulk-date op maintains (last dated Sunday of the plan).
  status: SERIES_STATUS.InProgress,
};

// ── Sections — the four movements ────────────────────────────────────────────

const sections = [
  {
    id: SECTION_ID(1),
    series_id: SERIES_ID,
    sort_order: 0,
    title: "Seeing Him Through Others' Eyes",
    passage_range: "1:1–4:13",
    big_idea: "Appreciating Jesus through the power of testimony.",
    overview:
      "The first part of Luke's Gospel tells the story of God's promised redemption through a series of testimonies — some from ordinary people, others from divine beings. As we glimpse Jesus through the eyes of others, we are reminded that He is far more than we often see with our eyes alone. This speaks to the power of both the testimony of others and ultimately the testimony of God's word: a robust picture of Jesus to remind us who it is we worship.",
  },
  {
    id: SECTION_ID(2),
    series_id: SERIES_ID,
    sort_order: 1,
    title: "Seeing Him with New Eyes",
    passage_range: "4:14–9:50",
    big_idea: "Jesus' words and works confront us with who He really is.",
    overview:
      "From the synagogue in Nazareth to the mount of transfiguration, Luke walks us through Jesus' Galilean ministry — preaching, healing, calling, teaching — and every episode presses the same question: who is this? The crowds are astonished, the religious are offended, the disciples are slow — and the section builds to Peter's confession and the Father's own answer: “This is my Son, my Chosen One; listen to him.”",
  },
  {
    id: SECTION_ID(3),
    series_id: SERIES_ID,
    sort_order: 2,
    title: "The Gospel in Real Life",
    passage_range: "9:51–19:27",
    big_idea: "Walking with Jesus reshapes ordinary life from the inside out.",
    overview:
      "Jesus sets His face toward Jerusalem, and the long road there becomes Luke's school of discipleship. Prayer, money, neighbors, meals, humility, lostness, forgiveness — the Gospel leaves no corner of real life untouched. This is the section where following Jesus stops being a Sunday idea and starts rearranging the week.",
  },
  {
    id: SECTION_ID(4),
    series_id: SERIES_ID,
    sort_order: 3,
    title: "Taking the Message on Mission",
    passage_range: "19:28–24:53",
    big_idea: "The cross and the empty tomb are the center of God's plan — and the launch of ours.",
    overview:
      "From the triumphal entry to the ascension, Luke slows down to walk the week that changed everything. The King arrives on a colt, weeps over the city, is betrayed, tried, and crucified — and then the tomb is empty, the Scriptures are opened, and witnesses are commissioned to all nations. God's ultimate purpose is accomplished and handed to the church, setting the stage for Acts.",
  },
];

// ── Sermons ──────────────────────────────────────────────────────────────────
// Row shape: [title, passage, big_idea, overview]. Overviews exist for every
// Part-1 sermon (the fully-worked exemplar depth); Parts 2–4 carry title +
// passage + big idea — the pastor-ratified finished-plan depth.

const PART_1 = [
  [
    "Through the Eyes of Luke: Introduction",
    "Luke-Acts",
    "To be a Christian is to be on mission with Jesus as the center of God's plan.",
    "The big picture of Luke-Acts shows us that Jesus is the central figure in God's plan of redemption. The first part is seen in the Gospel of Luke in Jesus' life, death, and resurrection; the second in His ascension and sending the Holy Spirit to empower God's mission through the church. Jesus will not be satisfied with being marginalized in our lives. To follow Him is to model our lives after Him and to live courageously as His witnesses, empowered by the Holy Spirit.",
  ],
  [
    "Through the Eyes of Theophilus",
    "Luke 1:1-4",
    "Christians always need to see Jesus with fresh eyes.",
    "Because of the difficulties that come with following Jesus, we need to be reintroduced to Him on a consistent basis. When we assume Jesus, other things define us. When Jesus defines us, the difficulties of life become opportunities to be shaped by God, and a deeper experience of His goodness.",
  ],
  [
    "Through the Eyes of Skeptics",
    "Luke 1:1-4",
    "Doubt can lead to deeper faith, depending on the condition of our hearts.",
    "No one lives by evidence alone. To doubt one thing is to have faith in something else — this is unavoidable. The greatest evidence of the truth about Jesus is His life, death, and resurrection; whether we accept that evidence is a matter of the heart. We should never pretend doubt isn't there, and we should never check our brains at the door. But we must also be honest about our faith commitments.",
  ],
  [
    "Through the Eyes of Zechariah",
    "Luke 1:5-25",
    "God in His goodness uses ordinary, faithful people to do big things.",
    "Zechariah was an ordinary priest God used to bring the forerunner of Christ, John the Baptist, into the world. There was nothing spectacular about his life; he was simply faithful. It may seem that our lives are of no consequence, but faithfulness over a lifetime always produces fruit to God's glory.",
  ],
  [
    "Through the Eyes of Mary",
    "Luke 1:26-38",
    "Who God is, not who we are, forms the basis of our obedience.",
    "Mary was a teenage virgin who would face the scrutiny of being a pregnant, single mom. But because she trusted God, she joyfully accepted His plan for her life. Like Mary, we are called to trust that God is bigger than our weaknesses and fears, and to do whatever He asks us to do.",
  ],
  [
    "Through the Eyes of Joseph",
    "", // deliberately open — the pastor's plan marked this text "(tbd)"
    "Trusting God sometimes means putting our reputation on the line.",
    "Joseph was a descendant of King David engaged to a woman who mysteriously became pregnant. Instead of abandoning her, he stuck with her because he trusted God and loved her. We often find ourselves in positions where following Jesus not only makes us look like fools, but doesn't seem to make sense. God is capable and worthy of trust at all times.",
  ],
  [
    "Through the Eyes of Elizabeth",
    "Luke 1:39-45",
    "God cares about our ordinary, everyday concerns.",
    "Elizabeth was old and without a child, which was looked down upon in those days. God had given her a son to be the forerunner of the Christ — but we shouldn't miss the fact that He had given her a child. God is big enough to do grand things and ordinary things at the same time. We need to remember that God is good, and learn to see the ordinary things as blessings from Him.",
  ],
  [
    "Through the Eyes of Worship",
    "Luke 1:46-56",
    "A proper understanding of Jesus leads to a life of worship.",
    "Mary's Magnificat is a song of praise magnifying the Lord because of everything He is and is doing. It is this kind of heart that will sustain her through all the trouble to come. If Jesus is not our treasure, we will not make it through the rigors of life. We need a robust understanding of all that Jesus is and all that God is doing through Him in order to see the world rightly.",
  ],
  [
    "Through the Eyes of Promise",
    "Luke 1:57-80",
    "Our stories are wrapped up in God's story of redemption.",
    "Zechariah's prophecy details the faithfulness of God in accomplishing His purposes and fulfilling His promises. These are the words of a man who believes that God has been at work. We must always remember that God's plan has been established from eternity past, that in being Christians we are part of that plan, and that our lives are to be used in moving that plan forward.",
  ],
  [
    "Through the Eyes of Worldly Power",
    "Luke 2:1-7",
    "God makes foolish the wisdom of the world.",
    "Jesus was born during the height of the Roman Empire, the most powerful force on earth. While Caesar Augustus held the highest earthly power, God's plan was moving forward in a backwater town in Israel, born into a horse trough. The glory of God is revealed as He topples all earthly power through the weakness of a baby. The Jesus we follow rarely matches what the world knows as success and power. The Gospel is for the humble, not the mighty.",
  ],
  [
    "Through the Eyes of Angels",
    "Luke 2:8-14",
    "Jesus is more glorious than the most glorious creatures.",
    "If angels and all the host of heaven write a hymn about Jesus' birth, then there is nothing ordinary about Him. Jesus is not on the margins of angelic understanding — He is the center of their existence. If that's true, then He should be at the center of our existence as well.",
  ],
  [
    "Through the Eyes of Shepherds",
    "Luke 2:15-21",
    "Good news turns ordinary people into joyful witnesses.",
    "The first people to hear the birth announcement were night-shift shepherds, low on everyone's list. They went and saw for themselves, and they returned glorifying and praising God for all they had heard and seen. The gospel still works the same way: come and see, then go and tell.",
  ],
  [
    "Through the Eyes of Simeon and Anna",
    "Luke 2:22-38",
    "A long obedience in the same direction.",
    "Simeon and Anna are hallmarks of lifelong faithfulness to God. At the end of their lives they received the special privilege of seeing God's promises fulfilled. They finished well. God calls us to a steady faith that will last until the day we die.",
  ],
  [
    "Through the Eyes of His Parents",
    "Luke 2:39-52",
    "Jesus reserves the right to upset our lives.",
    "Mary and Joseph lost Jesus for a few days, only to find Him in the temple asking questions. This was the beginning of Jesus upsetting their apple cart for a lifetime. Jesus is about His Father's business, and He's not always going to match up with our agendas.",
  ],
  [
    "Through the Eyes of John the Baptizer, pt. 1",
    "Luke 3:1-6",
    "God's word comes in the wilderness, preparing the way for salvation.",
    "The word of God bypassed the emperors and high priests Luke carefully lists and came to John in the wilderness. Preparing the way of the Lord means repentance — valleys filled, mountains leveled, the crooked made straight — so that all flesh may see the salvation of God. God still does His deepest work in unimpressive places.",
  ],
  [
    "Through the Eyes of John the Baptizer, pt. 2",
    "Luke 3:7-14",
    "The bad news of the Good News.",
    "John's preaching sounds harsh to modern ears — “you brood of vipers” — but honesty about sin is a kindness. He calls for fruit in keeping with repentance and gets specific: share your coat, don't extort, be content with your wages. Grace that never confronts never changes anyone. The good news is only good to those who have heard the bad news.",
  ],
  [
    "Through the Eyes of John the Baptizer, pt. 3",
    "Luke 3:15-20",
    "We must decrease so that He might increase.",
    "When the crowds wondered whether John might be the Christ, he pointed away from himself: One mightier is coming, whose sandals I am unworthy to untie. John's greatness was his willingness to be small. Even prison could not stop the ministry of pointing to Jesus — and ours is the same calling.",
  ],
  [
    "Through the Eyes of God",
    "Luke 3:21-22",
    "Jesus is worth our lives because He is God.",
    "At Jesus' baptism He is approved by God as His Son, which puts Him equal with God. The rest of the New Testament shows Him to be God in further detail. The deity of Jesus is no mere academic scruple — it is the very basis of our hope.",
  ],
  [
    "Through the Eyes of Humanity",
    "Luke 3:23-38",
    "To believe in Jesus is to share in the victory of the 2nd Adam.",
    "Luke traces Jesus' line backward — not just to Abraham, but all the way to “Adam, the son of God.” Jesus stands where all humanity stands, to succeed where all humanity failed. The genealogy is a quiet gospel: the whole human story, gathered up and answered in one Man.",
  ],
  [
    "Through the Eyes of Satan",
    "Luke 4:1-13",
    "The faithfulness of Jesus is our hope.",
    "Even the enemy's eyes see who Jesus is — every test aims at “If you are the Son of God.” Where Israel failed for forty years, Jesus stands faithful through forty days, answering every temptation from the Word. His obedience is not merely our example; it is our substitute and our hope.",
  ],
];

const PART_2 = [
  ["Jesus the Preacher: Gospel", "Luke 4:14-21", "Jesus doesn't just bring good news — He is the good news He announces."],
  ["Jesus the Preacher: Rejected Prophet", "Luke 4:22-30", "A Jesus who only confirms what we already believe is not the real Jesus."],
  ["Jesus the Preacher: Kingdom", "Luke 4:31-44", "The kingdom comes wherever Jesus' word lands — with authority and compassion."],
  ["Jesus the Visionary", "Luke 5:1-11", "Jesus calls sinful, ordinary people into something far bigger than their boats."],
  ["Jesus the Faith Healer", "Luke 5:12-26", "Jesus' deepest healing is the one we're most embarrassed to ask for — forgiveness."],
  ["Jesus the Friend of Sinners", "Luke 5:27-32", "Jesus keeps company with people who know they're sick — that is the whole point."],
  ["Jesus the Interpreter", "Luke 5:33-6:11", "Jesus is Lord of the very rules the religious use to keep Him out."],
  ["Jesus the Kingdom Builder", "Luke 6:12-16", "Jesus builds His kingdom through prayed-over, unimpressive people."],
  ["Jesus the Teacher: Happiness and Woe", "Luke 6:17-26", "Jesus turns the world's scoreboard upside down."],
  ["Jesus the Teacher: Love and Mercy", "Luke 6:27-42", "Children of the Merciful One are known by mercy the world can't explain."],
  ["Jesus the Teacher: Rocky Soil", "Luke 6:43-49", "Hearing Jesus without doing what He says is building on sand."],
  ["Jesus the Trustworthy", "Luke 7:1-10", "Faith is taking Jesus at His word — even at a distance."],
  ["Jesus the Giver of Life", "Luke 7:11-17", "Jesus meets the funeral procession — and death turns around."],
  ["Jesus the Unexpected", "Luke 7:18-23", "When Jesus disappoints our expectations, the answer is to look again at what He is doing."],
  ["Jesus the Admirer", "Luke 7:24-30", "The greatest life is the one that points to Jesus — and the least in the kingdom is greater still."],
  ["Jesus the Cultural Critic", "Luke 7:31-35", "A heart set against Jesus will always find its excuse."],
  ["Jesus the Worthy", "Luke 7:36-50", "Great love flows from knowing how much you've been forgiven."],
  ["Jesus the Friend of Women", "Luke 8:1-3", "Jesus dignifies and deploys the people His culture overlooked."],
  ["Jesus the Storyteller", "Luke 8:4-21", "The seed is the word — and the harvest depends on the soil that hears it."],
  ["Jesus the Authority: Over Nature", "Luke 8:22-25", "The storm obeys Him — the question is whether we will trust Him in ours."],
  ["Jesus the Authority: Over Demons", "Luke 8:26-39", "No darkness is too far gone for Jesus to send it running."],
  ["Jesus the Authority: Over Sickness and Death", "Luke 8:40-56", "Desperate faith finds Jesus enough — for the incurable, and even for the dead."],
  ["Jesus the Sender", "Luke 9:1-9", "Jesus gives His people His authority and sends them out with nothing but His word."],
  ["Jesus the Provider", "Luke 9:10-17", "In Jesus' hands, our not-enough feeds a multitude."],
  ["Jesus the Christ of God", "Luke 9:18-22", "Getting Jesus right means getting the cross right."],
  ["Jesus the Way", "Luke 9:23-27", "Following Jesus is a daily death that leads to real life."],
  ["Jesus the Glorious", "Luke 9:28-36", "A glimpse of Jesus' glory is meant to make us listen to Him."],
  ["Jesus the All Sufficient", "Luke 9:37-50", "Our failures don't shrink Jesus — they show how much we need Him."],
];

const PART_3 = [
  ["Fireworks vs. Faithfulness", "Luke 9:51-62", "Following Jesus is less about blazing moments and more about a face set toward Jerusalem."],
  ["Living for the Harvest", "Luke 10:1-16", "The harvest is plentiful — and Jesus sends ordinary laborers into it."],
  ["Celebrating the Right Thing", "Luke 10:17-24", "Our deepest joy is not what we do for God but what God has done for us."],
  ["Loving Your Neighbor", "Luke 10:25-37", "The question isn't “who is my neighbor?” but “will I be one?”"],
  ["Serving out of Worship", "Luke 10:38-42", "Sitting at Jesus' feet is the one thing serving can't replace."],
  ["Faithful Prayer", "Luke 11:1-13", "We pray boldly because we ask a Father, not a stranger."],
  ["No Middle Ground", "Luke 11:14-26", "With Jesus there is no neutral: whoever is not with Him is against Him."],
  ["Hearing and Obeying", "Luke 11:27-36", "Blessing belongs to those who hear the word of God and keep it."],
  ["Living from the Inside Out", "Luke 11:37-54", "God is not impressed by clean cups with filthy insides."],
  ["Unafraid and Unashamed", "Luke 12:1-12", "Fear God rightly and you'll never need to fear anyone else."],
  ["Generosity and the Gospel", "Luke 12:13-21", "A life measured by possessions is bankrupt toward God."],
  ["Seeking God over Stuff", "Luke 12:22-34", "Anxiety loses its grip on those who trust the Father's delight to give them the kingdom."],
  ["Being Ready", "Luke 12:35-48", "Faithful is what ready looks like: doing the Master's work while the Master seems delayed."],
  ["Understanding the Times", "Luke 12:49-59", "Jesus brings a division we must not dodge: settle with God while there is time."],
  ["Repent or Perish", "Luke 13:1-9", "Tragedy is not a calculator for other people's sins — it is a summons to our own repentance."],
  ["Fulltime Ministry", "Luke 13:10-21", "The kingdom frees the bent-over and grows from mustard-seed beginnings — even on the Sabbath. Especially then."],
  ["Through Yonder Wicket Gate", "Luke 13:22-30", "The door is narrow, but it is open — strive to enter while it stands open."],
  ["Mourning Unbelief", "Luke 13:31-35", "Jesus longs to gather the unwilling — and weeps over those who refuse to be gathered."],
  ["Humility", "Luke 14:1-11", "In the kingdom, the way up is down: everyone who exalts himself will be humbled."],
  ["Communicating the Master's Heart", "Luke 14:12-24", "God's table fills with the people nobody else invites."],
  ["The Cost of Discipleship", "Luke 14:25-35", "Jesus doesn't want fans in the crowd — He calls disciples who count the cost."],
  ["The Prodigal God: Lost Sheep", "Luke 15:1-7", "Heaven throws parties over the one the world writes off."],
  ["The Prodigal God: Lost Silver", "Luke 15:8-10", "The lost matter to God like treasure — He searches until He finds."],
  ["The Prodigal God: Lost Son", "Luke 15:11-24", "The father runs: God's welcome outruns our rehearsed apologies."],
  ["The Prodigal God: Lost Brother", "Luke 15:25-32", "Older brothers get lost at home — grace offends the self-righteous before it saves them."],
  ["One Master", "Luke 16:1-13", "Money is a useful servant and a ruinous god — you cannot serve both."],
  ["Grace by Force", "Luke 16:14-18", "Good news this good is pressed into urgently — but never on our own terms."],
  ["Convinced by Hearing", "Luke 16:19-31", "If we won't hear Moses and the Prophets, a miracle won't move us either."],
  ["Faithful Forgiveness", "Luke 17:1-6", "Forgiving like Jesus takes faith the size of a mustard seed — and that is enough."],
  ["Deserving Nothing, Getting Everything", "Luke 17:7-19", "We are unworthy servants — which makes gratitude the truest mark of faith."],
  ["The Coming Kingdom", "Luke 17:20-37", "The kingdom is already among us — and the King's return will be unmistakable."],
  ["The Persistent Prayer", "Luke 18:1-8", "Keep praying: God is not a reluctant judge but a Father who will give justice."],
  ["The Sinner's Prayer", "Luke 18:9-14", "God justifies the one who has nothing to offer but “be merciful to me, a sinner.”"],
  ["Childlike Faith", "Luke 18:15-27", "The kingdom is received with empty hands — what is impossible with man is possible with God."],
  ["Grasping Jesus' Mission", "Luke 18:28-34", "The cross was no accident — Jesus walked toward it on purpose, for us."],
  ["Seeing Jesus", "Luke 18:35-43", "The blind man saw what the crowds missed: mercy stops for those who cry out."],
  ["Little People, Big Gospel", "Luke 19:1-10", "The Son of Man came to seek and save the lost — even the ones everyone loves to hate."],
  ["Gospel Driven Stewardship", "Luke 19:11-27", "What we do with what the King entrusts shows what we believe about the King."],
];

const PART_4 = [
  ["A Different Kind of King", "Luke 19:28-40", "Jesus is King — but He rides in on a colt, toward a cross."],
  ["Passion for the Lost", "Luke 19:41-48", "Jesus weeps over the city that will not see — and clears the house meant for prayer."],
  ["No Other Way", "Luke 20:1-18", "Reject the Son and there is no one left to send — the rejected stone is the cornerstone."],
  // The trailing "…" is the pastor's own title, not a UI loading verb — the
  // canonical-loading-verb tripwire keys on the ellipsis.
  // eslint-disable-next-line sermonforge/canonical-loading-verb
  ["Since God Owns Everything…", "Luke 20:19-26", "Give Caesar his coin — but give God what bears His image: your whole self."],
  ["Living Hope", "Luke 20:27-44", "He is not God of the dead but of the living — resurrection is not a riddle; it is our future."],
  ["Giving Your Heart", "Luke 20:45-21:4", "God measures the gift by the heart behind it, not the amount in it."],
  ["Persecution is Coming", "Luke 21:5-19", "Faithful witness under pressure is not mere survival — it is testimony."],
  ["Things to Come", "Luke 21:20-28", "When the world shakes, the church looks up: redemption is drawing near."],
  ["Living Between the Times", "Luke 21:29-36", "Watchfulness is not date-setting — it is staying awake to Jesus in ordinary days."],
  ["The Hour of Darkness", "Luke 21:37-22:6", "While Jesus teaches openly, betrayal is bought in secret — yet even treachery serves God's plan."],
  ["The New Covenant", "Luke 22:7-23", "At the table, Jesus gives the meaning of His death: His body given, His blood poured out — for us."],
  ["Greatness at the Table", "Luke 22:24-30", "In Jesus' kingdom the greatest is the one who serves — like the King Himself."],
  ["Sifted Like Wheat", "Luke 22:31-38", "Satan sifts, but Jesus prays — and failed disciples are restored to strengthen others."],
  ["Not My Will", "Luke 22:39-46", "In the garden, Jesus chose the cup we could not drink — watch and pray."],
  ["Betrayed with a Kiss", "Luke 22:47-53", "The hour of darkness does its worst — and Jesus meets it without a sword."],
  ["The Rooster's Sermon", "Luke 22:54-62", "Peter's worst night is not his last chapter — the Lord's look is full of grace."],
  ["The Son of Man on Trial", "Luke 22:63-71", "Condemned by men, Jesus is enthroned by God — the trial convicts the judges."],
  ["The Innocent for the Guilty", "Luke 23:1-25", "Barabbas walks free because Jesus takes his place — that trade is the gospel."],
  ["Remember Me", "Luke 23:26-43", "A dying thief with nothing but a plea receives paradise — that is how the cross saves."],
  ["The Curtain Torn", "Luke 23:44-56", "At Jesus' death the curtain tears: the way to God is open."],
  ["Why Seek the Living Among the Dead?", "Luke 24:1-12", "The tomb is empty — everything Jesus said comes true."],
  ["Burning Hearts", "Luke 24:13-35", "All the Scriptures were always about Him — and hearts burn when He opens them."],
  ["Witnesses of These Things", "Luke 24:36-53", "The risen Jesus commissions His church: repentance and forgiveness to all nations — beginning here."],
];

// ── Expand rows into sermon objects ──────────────────────────────────────────
// Planner-born sermons mirror the create-sermon defaults (Study/Observe, empty
// prep columns) — these are PLANNED sermons awaiting "Build this sermon", not
// worked ones like the sample sermon. Dates run consecutively across the whole
// plan in outline order, matching the Schedule's reading order.

const PARTS = [PART_1, PART_2, PART_3, PART_4];

const sermons = [];
let seq = 0;
PARTS.forEach((rows, partIdx) => {
  rows.forEach(([title, passage, bigIdea, overview], rowIdx) => {
    sermons.push({
      id: SERMON_ID(seq + 1),
      series_id: SERIES_ID,
      section_id: SECTION_ID(partIdx + 1),
      title,
      passage,
      date: sundayAt(seq),
      stage: SERMON_STATUS.InProgress,
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      big_idea: bigIdea,
      overview: overview || "",
      sort_order: rowIdx,
    });
    seq += 1;
  });
});

// The Schedule keeps series.end_date mirrored to the plan's last Sunday.
series.end_date = sermons[sermons.length - 1].date;

module.exports = {
  SERIES_ID,
  series,
  sections,
  sermons,
};
