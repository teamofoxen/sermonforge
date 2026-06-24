import SeriesPlanner from "./SeriesPlanner";

// Preview-only fixture (mirrors SermonWorkspaceFixture). Mounts the real,
// AI-free SeriesPlanner against mock data so the workspace-styled planner can be
// verified in a browser preview without Electron/SQLite. Never used in prod.
// Route: ?planner  (optionally ?planner=schedule|study-guide; default outline)
//
// Seed mirrors the pastor's real artifact (Jesus of Luke), so the preview shows
// the three-level model on its native shape: Book ▸ Section ▸ Pericope, each
// level Title + range · Big idea · Overview.

const SERIES = {
  id: "fixture-series",
  title: "The Gospel of Luke: Reintroducing Jesus",
  color: "crimson",
  description: "Reintroducing Jesus to people who are familiar with Him.",
  book_id: "luke",
  canon_category: "nt_gospels",
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
};

const SECTIONS = [
  {
    id: "sec-1", series_id: "fixture-series", sort_order: 0,
    title: "Reintroducing Jesus: Seeing Him Through Others' Eyes",
    passage_range: "1:1–4:13",
    big_idea: "Appreciating Jesus through the power of testimony.",
    overview:
      "The first part of Luke's Gospel tells the story of God's promised redemption through a series of testimonies — some from ordinary people, others from divine beings. As we glimpse Jesus through the eyes of others, we are reminded that He is far more than we often see on our own.",
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
  },
  {
    id: "serm-3", series_id: "fixture-series", section_id: "sec-2", stage: "in_progress",
    title: "Through the Eyes of Mary", passage: "Luke 1:26-38", date: "2026-01-18",
    big_idea: "Who God is, not who we are, forms the basis of our obedience.",
    overview:
      "Mary was a teenage virgin who would face the scrutiny of being a pregnant, single mom. But because she trusted God, she joyfully accepted His plan for her life. Like Mary, we are called to trust that God is bigger than our weaknesses and fears.",
  },
];

export default function SeriesPlannerFixture() {
  const tab = new URLSearchParams(window.location.search).get("planner");
  const activeTab = ["schedule", "study-guide"].includes(tab) ? tab : "book-outline";
  return (
    <SeriesPlanner
      seriesId="fixture-series"
      onBack={() => {}}
      onOpenSermon={() => {}}
      _fixture={{ series: SERIES, sections: SECTIONS, sermons: SERMONS, calNotes: [], activeTab }}
    />
  );
}
