import Arc from "./Arc";

// Preview-only fixture (mirrors SeriesPlannerFixture). Mounts the real Arc view
// against mock cross-series data so the timeline table + balance sidebar can be
// verified in a browser preview without Electron/SQLite. Never used in prod.
// Route: ?arc

const SERIES = [
  { id: "a1", title: "1 Peter: A Living Hope", book_id: "1-peter", canon_category: "nt_general", kind: "book", start_date: "2025-01-05", end_date: "2025-02-23", year: 2025 },
  { id: "a2", title: "Daniel: Faithful in Exile", book_id: "daniel", canon_category: "ot_prophets", kind: "book", start_date: "2025-04-06", end_date: "2025-06-15", year: 2025 },
  { id: "a3", title: "Revelation: The Lamb Wins", book_id: "revelation", canon_category: "nt_general", kind: "book", start_date: "2025-09-07", end_date: "2025-12-21", year: 2025 },
  { id: "a4", title: "Songs of Ascent", book_id: "psalms", canon_category: "ot_writings", kind: "book", start_date: "2024-09-01", end_date: "2024-11-24", year: 2024 },
  // A topical series — one theme, passages from many books. book_id is null (no
  // single book); its genre spread lives in its sermons' own book_id (Phase 1).
  { id: "a5", title: "The Mission of God", book_id: null, canon_category: "", kind: "topical", start_date: "2025-02-23", end_date: "2025-03-30", year: 2025 },
];

// Sermons drive the sermon-grained balance (Coverage Initiative, Phase 2).
// Book-series sermons carry no book_id — they inherit the series' book. The
// topical series' sermons each carry their OWN book_id, drawn from genres the
// book series never touch (Law, Gospels, Pauline), so the Balance sidebar lights
// those up because of the topical series.
const SERMONS = [
  { id: "a1-1", series_id: "a1" }, { id: "a1-2", series_id: "a1" },
  { id: "a2-1", series_id: "a2" }, { id: "a2-2", series_id: "a2" },
  { id: "a3-1", series_id: "a3" }, { id: "a3-2", series_id: "a3" },
  { id: "a4-1", series_id: "a4" }, { id: "a4-2", series_id: "a4" },
  { id: "a5-1", series_id: "a5", book_id: "genesis", passage: "Genesis 12:1-3", title: "The Promise to Abraham" },
  { id: "a5-2", series_id: "a5", book_id: "luke", passage: "Luke 4:16-21", title: "The Year of the Lord's Favor" },
  { id: "a5-3", series_id: "a5", book_id: "romans", passage: "Romans 10:11-15", title: "Beautiful Feet" },
  // Standalone / one-off sermons — no series. Grouped by their own book in the
  // "Standalone sermons" list and counted in the balance by their own date. The
  // last one carries no book → the "No book" row (unclassified nudge).
  { id: "o1", series_id: null, book_id: "jonah", passage: "Jonah 1:1-17", date: "2025-07-13" },
  { id: "o2", series_id: null, book_id: "jonah", passage: "Jonah 2:1-10", date: "2025-07-20" },
  { id: "o3", series_id: null, book_id: "philippians", passage: "Philippians 4:4-9", date: "2025-08-03" },
  { id: "o4", series_id: null, book_id: null, passage: "Generosity (topical)", date: "2025-08-17" },
];

// Slots column mirrors getSeriesSermonCounts — keep it equal to the sermon rows.
const COUNTS = { a1: 2, a2: 2, a3: 2, a4: 2, a5: 3 };

export default function ArcFixture() {
  return <Arc onOpenPlanner={() => {}} _fixture={{ series: SERIES, sermons: SERMONS, counts: COUNTS }} />;
}
