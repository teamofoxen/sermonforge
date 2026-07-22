import SeriesPlanner from "./SeriesPlanner";

// Preview-only fixture (mirrors SermonWorkspaceFixture). Mounts the real,
// AI-free SeriesPlanner against mock data so the workspace-styled planner can be
// verified in a browser preview without Electron/SQLite. Never used in prod.
//
// Routes:
//   ?planner                          book series, Outline (default)
//   ?planner=discover                 book series, the Discover walk
//   ?planner=schedule|study-guide     book series, that tab
//   ?planner&kind=topical             topical series, Outline
//   ?planner=schedule&kind=topical    topical series, that tab
//   ...&empty=1                       book series with NO sections/sermons and
//                                     blank rich fields — the first-open state
//                                     (Discover empty states, Step 4 guard)
//
// The BOOK seed mirrors the pastor's real artifact (Jesus of Luke), so the
// preview shows the three-level model on its native shape: Book ▸ Section ▸
// Sermon. The TOPICAL seed ("The Mission of God") shows the theme-led shape:
// a Big Idea root + a flat, pastor-ordered list of sermons whose passages are
// drawn from many books, with no sections (section_id null).

const SERIES = {
  id: "fixture-series",
  title: "The Gospel of Luke: Reintroducing Jesus",
  color: "crimson",
  description: "Reintroducing Jesus to people who are familiar with Him.",
  book_id: "luke",
  canon_category: "nt_gospels",
  kind: "book",
  status: "in_progress",
  year: 2026,
  passage_range: "Luke 1:1–24:53",
  start_date: "2026-01-04",
  end_date: "2026-01-18",
  big_idea: "Reintroducing Jesus to people who are familiar with Him.",
  overview:
    "Luke is the first of a two-part work (the second being Acts), an orderly, well-researched account of the things accomplished among us, written so that a man familiar with Jesus might see Him again for the first time. We are just as susceptible to the same Jesus drift — Luke reintroduces us to a Jesus glorious enough to shape everything about us around His mission.",
  structural_outline:
    "I. Seeing Jesus through Others' Eyes (1:1–4:13)\nII. Seeing Jesus with New Eyes (4:14–9:50)\nIII. Walking with Jesus: Discipleship in Real Life (9:51–19:27)\nIV. Taking the Message on Mission (19:28–24:53)",
  // Discovery-only reasoning (v34) — a JSON string, as the DB returns it. Seeds the
  // Discover walk so the preview shows populated fields.
  discovery: JSON.stringify({
    readNotes: "Repeated: 'today', 'salvation', table scenes, the Spirit. Reversal everywhere — the low lifted, the high sent away. Journey to Jerusalem from 9:51.",
    understandWhyWritten: "So Theophilus would have certainty about what he'd been taught (1:3-4).",
    understandSituation: "A believer familiar with Jesus, needing an orderly account he can stand on.",
    understandProblem: "Jesus drift — knowing about Jesus while missing who He really is.",
    understandResponse: "See Jesus again, clearly, and follow Him on His mission.",
    understandWantsReaderTo: "…see a Jesus glorious enough to reorder his whole life around the mission.",
    bigIdeaBurden: "Jesus is the center of God's mission, and to know Him is to join it.",
    bigIdeaRecurring: "Reversal, table fellowship, the Spirit, 'today'.",
    bigIdeaResponse: "Follow Jesus courageously as a witness.",
    bigIdeaUnifier: "Every sermon shows more of who Jesus really is.",
    bigIdeaCandidateA: "Reintroducing Jesus to people who are familiar with Him.",
    bigIdeaCandidateB: "The mission of God runs through the person of Jesus — and through us.",
  }),
};

const SECTIONS = [
  {
    id: "sec-1", series_id: "fixture-series", sort_order: 0,
    title: "Reintroducing Jesus: Seeing Him Through Others' Eyes",
    passage_range: "1:1–4:13",
    big_idea: "Appreciating Jesus through the power of testimony.",
    overview:
      "The first part of Luke's Gospel tells the story of God's promised redemption through a series of testimonies — some from ordinary people, others from divine beings. As we glimpse Jesus through the eyes of others, we are reminded that He is far more than we often see on our own.",
    discovery: JSON.stringify({
      whyBegin: "The formal prologue (1:1-4) opens the whole work.",
      whyEnd: "The temptation closes the preparation; 4:14 begins the Galilean ministry 'in the power of the Spirit'.",
    }),
  },
  {
    id: "sec-2", series_id: "fixture-series", sort_order: 1,
    title: "Seeing Jesus with New Eyes",
    passage_range: "4:14–9:50",
    big_idea: "Jesus' ministry confronts us with who He really is.",
    overview: "",
  },
];

const SERMONS = [
  {
    id: "serm-1", series_id: "fixture-series", section_id: "sec-1", stage: "in_progress",
    title: "Through the Eyes of Luke: Introduction", passage: "Luke 1:1-4", date: "2026-01-04",
    big_idea: "To be a Christian is to be on mission with Jesus as the center of God's plan.",
    overview:
      "The big picture of Luke-Acts shows us that Jesus is the central figure in God's plan of redemption. To follow Jesus is to model our lives after Him and live courageously as His witnesses, empowered by the Holy Spirit.",
  },
  {
    id: "serm-2", series_id: "fixture-series", section_id: "sec-1", stage: "in_progress",
    title: "Through the Eyes of Zechariah", passage: "Luke 1:5-25", date: "2026-01-11",
    big_idea: "God in His goodness uses ordinary, faithful people to do big things.",
    overview:
      "Zechariah was an ordinary priest God used to bring the forerunner of Christ into the world. There was nothing spectacular about his life; he was simply faithful. Faithfulness over a lifetime always produces fruit to God's glory.",
    discovery: JSON.stringify({
      whyBegin: "A clean scene-shift to the temple and Zechariah (1:5).",
      whyEnd: "Zechariah's muteness closes the episode before Gabriel goes to Mary (1:26).",
      subject: "God's response to a faithful, childless priest.",
      complement: "He answers long prayer in His own time, and discipline can accompany doubt.",
      authorialFunction: "Encouraging",
    }),
  },
  {
    id: "serm-3", series_id: "fixture-series", section_id: "sec-2", stage: "in_progress",
    title: "Through the Eyes of Mary", passage: "Luke 1:26-38", date: "2026-01-18",
    big_idea: "Who God is, not who we are, forms the basis of our obedience.",
    overview:
      "Mary was a teenage virgin who would face the scrutiny of being a pregnant, single mom. But because she trusted God, she joyfully accepted His plan for her life. Like Mary, we are called to trust that God is bigger than our weaknesses and fears.",
  },
];

// ── Topical seed: "The Mission of God" — passages from across the canon, no
// sections (section_id null), pastor-ordered via sort_order. ────────────────────
const TOPICAL_SERIES = {
  id: "fixture-topical",
  title: "The Mission of God",
  color: "sage",
  description: "One thread through the whole canon: God on mission to redeem a people for Himself.",
  book_id: null,
  canon_category: "",
  kind: "topical",
  status: "in_progress",
  year: 2026,
  passage_range: "",
  start_date: "2026-02-01",
  end_date: "",
  big_idea: "From Eden to the New Jerusalem, God pursues a people for Himself — and sends us to join the pursuit.",
  overview:
    "Mission is not one program among many; it is the heartbeat of the whole Bible. This series gathers the moments where God's redeeming purpose breaks the surface — promise, exodus, exile, incarnation, commission — so a congregation can see the single arc and find its place in it.",
  structural_outline: "",
};

const TOPICAL_SERMONS = [
  {
    id: "t-1", series_id: "fixture-topical", section_id: null, sort_order: 0, stage: "in_progress",
    title: "The Promise to Abraham", passage: "Genesis 12:1-3", book_id: "genesis", date: "2026-02-01",
    big_idea: "God's mission begins with a promise to bless all nations through one family.",
    overview:
      "Before there is a nation, a temple, or a law, there is a promise: through Abraham, all the families of the earth will be blessed. The mission of God is global from its very first word.",
  },
  {
    id: "t-2", series_id: "fixture-topical", section_id: null, sort_order: 1, stage: "in_progress",
    title: "A Kingdom of Priests", passage: "Exodus 19:3-6", book_id: "exodus", date: "",
    big_idea: "God rescues a people to represent Him to the watching nations.",
    overview:
      "At Sinai, the rescued people learn why they were rescued: to be a kingdom of priests and a holy nation — a people who carry God's presence to the world.",
  },
  {
    id: "t-3", series_id: "fixture-topical", section_id: null, sort_order: 2, stage: "in_progress",
    title: "A Light to the Nations", passage: "Isaiah 49:6", book_id: "isaiah", date: "",
    big_idea: "The Servant's mission is too large to stop at Israel — it reaches the ends of the earth.",
    overview:
      "Through the prophet, God declares that merely restoring Israel is too small a thing; the Servant will be a light to the nations, carrying salvation to the ends of the earth.",
  },
  {
    id: "t-4", series_id: "fixture-topical", section_id: null, sort_order: 3, stage: "in_progress",
    title: "The Word Made Flesh", passage: "John 1:14", book_id: "john", date: "",
    big_idea: "God's mission takes on flesh — He comes Himself.",
    overview:
      "The mission of God is not run by proxy. In Jesus, the sending God becomes the sent One: the Word made flesh, dwelling among us, full of grace and truth.",
  },
  {
    id: "t-5", series_id: "fixture-topical", section_id: null, sort_order: 4, stage: "in_progress",
    title: "Sent As the Father Sent Me", passage: "Matthew 28:18-20", book_id: "matthew", date: "",
    big_idea: "The risen King hands His mission to the church.",
    overview:
      "The arc lands on us: all authority belongs to the risen Christ, and on that authority He sends His people to make disciples of all nations — the mission of God, now ours.",
  },
];

export default function SeriesPlannerFixture() {
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("planner");
  const isTopical = params.get("kind") === "topical";
  const isEmpty = params.get("empty") === "1";
  const activeTab = ["discover", "schedule", "study-guide"].includes(tabParam) ? tabParam : "book-outline";
  // The empty seed mirrors a just-created book series (book picked, nothing
  // authored) so the Discover walk's empty states render for cold-read checks.
  const EMPTY_SERIES = {
    ...SERIES, title: "Luke", big_idea: "", overview: "", structural_outline: "",
    discovery: null, start_date: "", end_date: "",
  };
  const fixture = isTopical
    ? { series: TOPICAL_SERIES, sections: [], sermons: TOPICAL_SERMONS, calNotes: [], activeTab }
    : isEmpty
      ? { series: EMPTY_SERIES, sections: [], sermons: [], calNotes: [], activeTab }
      : { series: SERIES, sections: SECTIONS, sermons: SERMONS, calNotes: [], activeTab };
  return (
    <SeriesPlanner
      seriesId={isTopical ? "fixture-topical" : "fixture-series"}
      onBack={() => {}}
      onOpenSermon={() => {}}
      _fixture={fixture}
    />
  );
}
