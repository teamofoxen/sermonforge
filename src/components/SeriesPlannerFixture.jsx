import SeriesPlanner from "./SeriesPlanner";

// Preview-only fixture (mirrors SermonWorkspaceFixture). Mounts the real,
// AI-free SeriesPlanner against mock data so the workspace-styled planner can
// be verified in a browser preview without Electron/SQLite. Never used in prod.
// Route: ?planner  (optionally ?planner=overview|structure|slots|calendar)

const SERIES = {
  id: "fixture-series",
  title: "Romans: The Gospel Unveiled",
  color: "crimson",
  description: "A walk through Paul's letter to the church in Rome.",
  canon_category: "nt",
  status: "in_progress",
  year: 2026,
  passage_range: "Romans 1–8",
  start_date: "2026-01-04",
  end_date: "2026-03-01",
  big_idea: "The righteousness of God is revealed in the gospel — from faith for faith.",
  overview:
    "Romans moves from humanity's guilt under sin, to justification by faith, to life in the Spirit and the security of those God has called.",
  structural_outline:
    "I. The gospel and God's righteousness (1–4)\nII. Life in the Spirit (5–8)",
  redemptive_context:
    "Romans stands at the center of the New Testament's exposition of the gospel — the fullest account of how a holy God justifies the ungodly through Christ.",
  book_background:
    "Written by Paul c. AD 57 from Corinth, to a church he had not yet visited, ahead of his hoped-for mission to Spain.",
  book_argument:
    "The gospel is the power of God for salvation to everyone who believes — Jew first and also Greek.",
  book_structure:
    "Doctrine (1–11) then exhortation (12–16); a tight logical argument built on rhetorical questions and answers.",
  series_motivation:
    "This congregation needs a clear, unhurried account of the gospel itself — not assumed, but laid out from the ground up.",
  emerging_big_idea: "We are justified by faith and kept by the Spirit.",
};

const SECTIONS = [
  { id: "sec-1", series_id: "fixture-series", title: "The Gospel and God's Righteousness", passage_range: "Romans 1–4", big_idea: "All are guilty; all are justified by faith.", overview: "", sort_order: 0 },
  { id: "sec-2", series_id: "fixture-series", title: "Life in the Spirit", passage_range: "Romans 5–8", big_idea: "Justified, we now live by the Spirit.", overview: "", sort_order: 1 },
];

const SERMONS = [
  { id: "serm-1", series_id: "fixture-series", section_id: "sec-1", title: "The Power of God for Salvation", passage: "Romans 1:1-17", date: "2026-01-04", stage: "in_progress", study_guide_note: "Paul's thesis statement for the whole letter." },
  { id: "serm-2", series_id: "fixture-series", section_id: "sec-1", title: "None Righteous", passage: "Romans 3:9-20", date: "2026-01-11", stage: "in_progress", study_guide_note: "" },
  { id: "serm-3", series_id: "fixture-series", section_id: "sec-2", title: "Peace with God", passage: "Romans 5:1-11", date: "2026-01-18", stage: "in_progress", study_guide_note: "" },
];

export default function SeriesPlannerFixture() {
  const tab = new URLSearchParams(window.location.search).get("planner");
  const activeTab = ["overview", "structure", "slots", "calendar"].includes(tab) ? tab : "book-study";
  return (
    <SeriesPlanner
      seriesId="fixture-series"
      onBack={() => {}}
      onOpenSermon={() => {}}
      _fixture={{ series: SERIES, sections: SECTIONS, sermons: SERMONS, calNotes: [], activeTab }}
    />
  );
}
