# Sample series — content review (2026-07-14)

The seeded **sample series** for the Series Planner is your real series — *The Gospel of
Luke: Reintroducing Jesus* — built from your two planning documents (Big Picture
Overview + Series Plan). Where those documents were complete, the seed uses your words
(lightly copy-edited: shorthand like "b/c" spelled out, small grammar smoothing).
Where they were incomplete, content was **drafted in your voice for this review**.

**Legend:** ✓ = from your documents · ✍ = drafted, needs your eye

Everything marked ✍ ships to every SermonForge install as sample content once you
approve it. Read the ✍ lines the way you'd read a guest preacher's outline of *your*
series.

---

## 1. Decisions needing your eye (beyond the drafted lines)

1. **Joseph's passage is left empty.** Your plan marked it "(tbd)" with an open
   question to confirm the text. The natural text is Matthew 1:18-25. (The cross-book
   bug this row originally dodged is fixed on this branch, 2026-07-14: a cross-book
   reference now shows honestly under Coverage's "Couldn't read" note instead of
   miscounting as Luke 1:18-25 — so typing it is safe now, it just won't count toward
   Luke.) An empty passage shows as one "unreadable" slot the same way. **Options:**
   leave open (current) · type "Matthew 1:18-25" (safe; shows under "Couldn't read") ·
   cut the row.
2. **The intro sermon's passage is "Luke-Acts"** (your artifact). Not a chapter:verse
   reference, so Coverage lists it as unreadable — true to what it is (a big-picture
   sermon). Fine, or give it 1:1-4?
3. **Two compound references were simplified** — the passage parser rejects disjoint
   ranges: *Elizabeth* "1:24-25; 39-45" → **Luke 1:39-45** (1:24-25 stays covered by
   Zechariah's 1:5-25) and *Lost Brother* "15:1-2; 25-32" → **Luke 15:25-32** (15:1-2
   covered by Lost Sheep). No coverage gaps either way.
4. **One verse-boundary correction:** *Living from the Inside Out* 11:37-53 →
   **11:37-54** (Luke 11 ends at v54; without it Coverage shows a one-verse gap).
5. **The Reference outline is yours, not Bock's.** Your document carried Bock's
   verse-by-verse commentary outline; a commercial commentary's outline shouldn't ship
   verbatim in a public sample, so `structural_outline` is your own four-movement
   breakdown instead.
6. **Dates are fictional:** consecutive Sundays from **Sept 13, 2026** (~2 years),
   matching the sample sermon's fall-2026 calendar — not your real 2014 dates.
7. **Search now excludes sample rows.** The All Sermons search was the one surface
   that didn't filter `sample-%` — the Romans sample sermon has been findable there.
   With 109 seeded rows that becomes noise, so the filter was added, which also removes
   the Romans sample from search. Every other surface already filtered it. **Ratify or
   veto.**

---

## 2. The series node

| Field | Source | Content |
|---|---|---|
| Title | ✓ | The Gospel of Luke: Reintroducing Jesus |
| Big idea | ✓ | Reintroducing Jesus to people who are already familiar with Him. |
| Overview | ✓ | Your two paragraphs (Theophilus / "Jesus drift"), lightly edited |
| Reference outline | ✍ | Your four movements, one line each (see item 5 above) |
| Description | ✍ | "A walk through Luke's Gospel to see Jesus again, as if for the first time." |

## 3. The four sections

| # | Section (✓ titles/ranges) | Big idea | Overview |
|---|---|---|---|
| 1 | Seeing Him Through Others' Eyes · 1:1–4:13 | ✓ "Appreciating Jesus through the power of testimony." | ✓ your paragraph |
| 2 | Seeing Him with New Eyes · 4:14–9:50 | ✍ "Jesus' words and works confront us with who He really is." | ✍ Galilean ministry → "who is this?" → Peter's confession + the mountain |
| 3 | The Gospel in Real Life · 9:51–19:27 | ✍ "Walking with Jesus reshapes ordinary life from the inside out." | ✍ the travel narrative as Luke's school of discipleship |
| 4 | Taking the Message on Mission · 19:28–24:53 | ✍ "The cross and the empty tomb are the center of God's plan — and the launch of ours." | ✍ passion week → resurrection → commission, setting up Acts |

(Full section overview texts are in `electron/sampleSeriesData.js` — four short paragraphs.)

## 4. Every sermon

**Part 1 — Seeing Him Through Others' Eyes** (titles, passages & most content ✓)

| # | Title | Passage | Big idea | Overview |
|---|---|---|---|---|
| 1 | Through the Eyes of Luke: Introduction | ✓ Luke-Acts | ✓ | ✓ |
| 2 | Through the Eyes of Theophilus | ✓ 1:1-4 | ✓ | ✓ |
| 3 | Through the Eyes of Skeptics | ✓ 1:1-4 | ✓ | ✓ |
| 4 | Through the Eyes of Zechariah | ✓ 1:5-25 | ✓ | ✓ |
| 5 | Through the Eyes of Mary | ✓ 1:26-38 | ✓ | ✓ |
| 6 | Through the Eyes of Joseph | ⚠ open (see §1.1) | ✓ | ✓ |
| 7 | Through the Eyes of Elizabeth | ⚠ 1:39-45 (see §1.3) | ✓ | ✓ |
| 8 | Through the Eyes of Worship | ✓ 1:46-56 | ✓ | ✓ |
| 9 | Through the Eyes of Promise | ✓ 1:57-80 | ✓ | ✓ |
| 10 | Through the Eyes of Worldly Power | ✓ 2:1-7 | ✓ | ✓ |
| 11 | Through the Eyes of Angels | ✓ 2:8-14 | ✓ | ✓ |
| 12 | Through the Eyes of Shepherds | ✓ 2:15-21 | ✍ "Good news turns ordinary people into joyful witnesses." | ✍ |
| 13 | Through the Eyes of Simeon and Anna | ✓ 2:22-38 | ✓ | ✓ |
| 14 | Through the Eyes of His Parents | ✓ 2:39-52 | ✓ | ✓ |
| 15 | Through the Eyes of John the Baptizer, pt. 1 | ✓ 3:1-6 | ✍ "God's word comes in the wilderness, preparing the way for salvation." | ✍ |
| 16 | Through the Eyes of John the Baptizer, pt. 2 | ✓ 3:7-14 | ✓ "The bad news of the Good News." | ✍ |
| 17 | Through the Eyes of John the Baptizer, pt. 3 | ✓ 3:15-20 | ✓ "We must decrease so that He might increase." | ✍ |
| 18 | Through the Eyes of God | ✓ 3:21-22 | ✓ | ✓ |
| 19 | Through the Eyes of Humanity | ✓ 3:23-38 | ✓ | ✍ |
| 20 | Through the Eyes of Satan | ✓ 4:1-13 | ✓ | ✍ |

**Part 2 — Seeing Him with New Eyes** (titles & passages ✓ · every big idea ✍ · no overviews, per the ratified depth)

| # | Title | Passage | Big idea (✍) |
|---|---|---|---|
| 21 | Jesus the Preacher: Gospel | 4:14-21 | Jesus doesn't just bring good news — He is the good news He announces. |
| 22 | Jesus the Preacher: Rejected Prophet | 4:22-30 | A Jesus who only confirms what we already believe is not the real Jesus. |
| 23 | Jesus the Preacher: Kingdom | 4:31-44 | The kingdom comes wherever Jesus' word lands — with authority and compassion. |
| 24 | Jesus the Visionary | 5:1-11 | Jesus calls sinful, ordinary people into something far bigger than their boats. |
| 25 | Jesus the Faith Healer | 5:12-26 | Jesus' deepest healing is the one we're most embarrassed to ask for — forgiveness. |
| 26 | Jesus the Friend of Sinners | 5:27-32 | Jesus keeps company with people who know they're sick — that is the whole point. |
| 27 | Jesus the Interpreter | 5:33-6:11 | Jesus is Lord of the very rules the religious use to keep Him out. |
| 28 | Jesus the Kingdom Builder | 6:12-16 | Jesus builds His kingdom through prayed-over, unimpressive people. |
| 29 | Jesus the Teacher: Happiness and Woe | 6:17-26 | Jesus turns the world's scoreboard upside down. |
| 30 | Jesus the Teacher: Love and Mercy | 6:27-42 | Children of the Merciful One are known by mercy the world can't explain. |
| 31 | Jesus the Teacher: Rocky Soil | 6:43-49 | Hearing Jesus without doing what He says is building on sand. |
| 32 | Jesus the Trustworthy | 7:1-10 | Faith is taking Jesus at His word — even at a distance. |
| 33 | Jesus the Giver of Life | 7:11-17 | Jesus meets the funeral procession — and death turns around. |
| 34 | Jesus the Unexpected | 7:18-23 | When Jesus disappoints our expectations, the answer is to look again at what He is doing. |
| 35 | Jesus the Admirer | 7:24-30 | The greatest life is the one that points to Jesus — and the least in the kingdom is greater still. |
| 36 | Jesus the Cultural Critic | 7:31-35 | A heart set against Jesus will always find its excuse. |
| 37 | Jesus the Worthy | 7:36-50 | Great love flows from knowing how much you've been forgiven. |
| 38 | Jesus the Friend of Women | 8:1-3 | Jesus dignifies and deploys the people His culture overlooked. |
| 39 | Jesus the Storyteller | 8:4-21 | The seed is the word — and the harvest depends on the soil that hears it. |
| 40 | Jesus the Authority: Over Nature | 8:22-25 | The storm obeys Him — the question is whether we will trust Him in ours. |
| 41 | Jesus the Authority: Over Demons | 8:26-39 | No darkness is too far gone for Jesus to send it running. |
| 42 | Jesus the Authority: Over Sickness and Death | 8:40-56 | Desperate faith finds Jesus enough — for the incurable, and even for the dead. |
| 43 | Jesus the Sender | 9:1-9 | Jesus gives His people His authority and sends them out with nothing but His word. |
| 44 | Jesus the Provider | 9:10-17 | In Jesus' hands, our not-enough feeds a multitude. |
| 45 | Jesus the Christ of God | 9:18-22 | Getting Jesus right means getting the cross right. |
| 46 | Jesus the Way | 9:23-27 | Following Jesus is a daily death that leads to real life. |
| 47 | Jesus the Glorious | 9:28-36 | A glimpse of Jesus' glory is meant to make us listen to Him. |
| 48 | Jesus the All Sufficient | 9:37-50 | Our failures don't shrink Jesus — they show how much we need Him. |

**Part 3 — The Gospel in Real Life** (titles & passages ✓, one range fix §1.4 · every big idea ✍)

| # | Title | Passage | Big idea (✍) |
|---|---|---|---|
| 49 | Fireworks vs. Faithfulness | 9:51-62 | Following Jesus is less about blazing moments and more about a face set toward Jerusalem. |
| 50 | Living for the Harvest | 10:1-16 | The harvest is plentiful — and Jesus sends ordinary laborers into it. |
| 51 | Celebrating the Right Thing | 10:17-24 | Our deepest joy is not what we do for God but what God has done for us. |
| 52 | Loving Your Neighbor | 10:25-37 | The question isn't "who is my neighbor?" but "will I be one?" |
| 53 | Serving out of Worship | 10:38-42 | Sitting at Jesus' feet is the one thing serving can't replace. |
| 54 | Faithful Prayer | 11:1-13 | We pray boldly because we ask a Father, not a stranger. |
| 55 | No Middle Ground | 11:14-26 | With Jesus there is no neutral: whoever is not with Him is against Him. |
| 56 | Hearing and Obeying | 11:27-36 | Blessing belongs to those who hear the word of God and keep it. |
| 57 | Living from the Inside Out | 11:37-54 ⚠ | God is not impressed by clean cups with filthy insides. |
| 58 | Unafraid and Unashamed | 12:1-12 | Fear God rightly and you'll never need to fear anyone else. |
| 59 | Generosity and the Gospel | 12:13-21 | A life measured by possessions is bankrupt toward God. |
| 60 | Seeking God over Stuff | 12:22-34 | Anxiety loses its grip on those who trust the Father's delight to give them the kingdom. |
| 61 | Being Ready | 12:35-48 | Faithful is what ready looks like: doing the Master's work while the Master seems delayed. |
| 62 | Understanding the Times | 12:49-59 | Jesus brings a division we must not dodge: settle with God while there is time. |
| 63 | Repent or Perish | 13:1-9 | Tragedy is not a calculator for other people's sins — it is a summons to our own repentance. |
| 64 | Fulltime Ministry | 13:10-21 | The kingdom frees the bent-over and grows from mustard-seed beginnings — even on the Sabbath. Especially then. |
| 65 | Through Yonder Wicket Gate | 13:22-30 | The door is narrow, but it is open — strive to enter while it stands open. |
| 66 | Mourning Unbelief | 13:31-35 | Jesus longs to gather the unwilling — and weeps over those who refuse to be gathered. |
| 67 | Humility | 14:1-11 | In the kingdom, the way up is down: everyone who exalts himself will be humbled. |
| 68 | Communicating the Master's Heart | 14:12-24 | God's table fills with the people nobody else invites. |
| 69 | The Cost of Discipleship | 14:25-35 | Jesus doesn't want fans in the crowd — He calls disciples who count the cost. |
| 70 | The Prodigal God: Lost Sheep | 15:1-7 | Heaven throws parties over the one the world writes off. |
| 71 | The Prodigal God: Lost Silver | 15:8-10 | The lost matter to God like treasure — He searches until He finds. |
| 72 | The Prodigal God: Lost Son | 15:11-24 | The father runs: God's welcome outruns our rehearsed apologies. |
| 73 | The Prodigal God: Lost Brother | 15:25-32 ⚠ | Older brothers get lost at home — grace offends the self-righteous before it saves them. |
| 74 | One Master | 16:1-13 | Money is a useful servant and a ruinous god — you cannot serve both. |
| 75 | Grace by Force | 16:14-18 | Good news this good is pressed into urgently — but never on our own terms. |
| 76 | Convinced by Hearing | 16:19-31 | If we won't hear Moses and the Prophets, a miracle won't move us either. |
| 77 | Faithful Forgiveness | 17:1-6 | Forgiving like Jesus takes faith the size of a mustard seed — and that is enough. |
| 78 | Deserving Nothing, Getting Everything | 17:7-19 | We are unworthy servants — which makes gratitude the truest mark of faith. |
| 79 | The Coming Kingdom | 17:20-37 | The kingdom is already among us — and the King's return will be unmistakable. |
| 80 | The Persistent Prayer | 18:1-8 | Keep praying: God is not a reluctant judge but a Father who will give justice. |
| 81 | The Sinner's Prayer | 18:9-14 | God justifies the one who has nothing to offer but "be merciful to me, a sinner." |
| 82 | Childlike Faith | 18:15-27 | The kingdom is received with empty hands — what is impossible with man is possible with God. |
| 83 | Grasping Jesus' Mission | 18:28-34 | The cross was no accident — Jesus walked toward it on purpose, for us. |
| 84 | Seeing Jesus | 18:35-43 | The blind man saw what the crowds missed: mercy stops for those who cry out. |
| 85 | Little People, Big Gospel | 19:1-10 | The Son of Man came to seek and save the lost — even the ones everyone loves to hate. |
| 86 | Gospel Driven Stewardship | 19:11-27 | What we do with what the King entrusts shows what we believe about the King. |

**Part 4 — Taking the Message on Mission** (rows 87–95: titles & passages ✓, big ideas ✍ · rows 96–109: **entirely ✍** — your plan stopped at 21:36; these extend it through the cross and resurrection at your pericope pacing)

| # | Title | Passage | Big idea (✍) |
|---|---|---|---|
| 87 | A Different Kind of King | ✓ 19:28-40 | Jesus is King — but He rides in on a colt, toward a cross. |
| 88 | Passion for the Lost | ✓ 19:41-48 | Jesus weeps over the city that will not see — and clears the house meant for prayer. |
| 89 | No Other Way | ✓ 20:1-18 | Reject the Son and there is no one left to send — the rejected stone is the cornerstone. |
| 90 | Since God Owns Everything… | ✓ 20:19-26 | Give Caesar his coin — but give God what bears His image: your whole self. |
| 91 | Living Hope | ✓ 20:27-44 | He is not God of the dead but of the living — resurrection is not a riddle; it is our future. |
| 92 | Giving Your Heart | ✓ 20:45-21:4 | God measures the gift by the heart behind it, not the amount in it. |
| 93 | Persecution is Coming | ✓ 21:5-19 | Faithful witness under pressure is not mere survival — it is testimony. |
| 94 | Things to Come | ✓ 21:20-28 | When the world shakes, the church looks up: redemption is drawing near. |
| 95 | Living Between the Times | ✓ 21:29-36 | Watchfulness is not date-setting — it is staying awake to Jesus in ordinary days. |
| 96 | The Hour of Darkness | ✍ 21:37-22:6 | While Jesus teaches openly, betrayal is bought in secret — yet even treachery serves God's plan. |
| 97 | The New Covenant | ✍ 22:7-23 | At the table, Jesus gives the meaning of His death: His body given, His blood poured out — for us. |
| 98 | Greatness at the Table | ✍ 22:24-30 | In Jesus' kingdom the greatest is the one who serves — like the King Himself. |
| 99 | Sifted Like Wheat | ✍ 22:31-38 | Satan sifts, but Jesus prays — and failed disciples are restored to strengthen others. |
| 100 | Not My Will | ✍ 22:39-46 | In the garden, Jesus chose the cup we could not drink — watch and pray. |
| 101 | Betrayed with a Kiss | ✍ 22:47-53 | The hour of darkness does its worst — and Jesus meets it without a sword. |
| 102 | The Rooster's Sermon | ✍ 22:54-62 | Peter's worst night is not his last chapter — the Lord's look is full of grace. |
| 103 | The Son of Man on Trial | ✍ 22:63-71 | Condemned by men, Jesus is enthroned by God — the trial convicts the judges. |
| 104 | The Innocent for the Guilty | ✍ 23:1-25 | Barabbas walks free because Jesus takes his place — that trade is the gospel. |
| 105 | Remember Me | ✍ 23:26-43 | A dying thief with nothing but a plea receives paradise — that is how the cross saves. |
| 106 | The Curtain Torn | ✍ 23:44-56 | At Jesus' death the curtain tears: the way to God is open. |
| 107 | Why Seek the Living Among the Dead? | ✍ 24:1-12 | The tomb is empty — everything Jesus said comes true. |
| 108 | Burning Hearts | ✍ 24:13-35 | All the Scriptures were always about Him — and hearts burn when He opens them. |
| 109 | Witnesses of These Things | ✍ 24:36-53 | The risen Jesus commissions His church: repentance and forgiveness to all nations — beginning here. |

---

## 5. What the tests lock

`tests/unit/sampleSeriesData.test.js` (13 tests, green): every ID in the
`sample-luke-` family · four complete sections · every sermon named, sectioned,
ordered, dated on an ascending Sunday · every passage parses except the two deliberate
non-references · **Coverage = 100%, zero gaps, exactly your one true overlap**
(Theophilus + Skeptics on 1:1-4).

To change any line: edit `electron/sampleSeriesData.js`, run
`npx vitest run tests/unit/sampleSeriesData.test.js`, then "Start the sample series
fresh" in the app picks it up.
