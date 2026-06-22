import Arc from "./Arc";

// Preview-only fixture (mirrors SeriesPlannerFixture). Mounts the real Arc view
// against mock cross-series data so the timeline table + balance sidebar can be
// verified in a browser preview without Electron/SQLite. Never used in prod.
// Route: ?arc

const SERIES = [
  { id: "a1", title: "1 Peter: A Living Hope", book_id: "1-peter", canon_category: "nt_general", start_date: "2025-01-05", end_date: "2025-02-23", year: 2025 },
  { id: "a2", title: "Daniel: Faithful in Exile", book_id: "daniel", canon_category: "ot_prophets", start_date: "2025-04-06", end_date: "2025-06-15", year: 2025 },
  { id: "a3", title: "Revelation: The Lamb Wins", book_id: "revelation", canon_category: "nt_general", start_date: "2025-09-07", end_date: "2025-12-21", year: 2025 },
  { id: "a4", title: "Songs of Ascent", book_id: "psalms", canon_category: "ot_writings", start_date: "2024-09-01", end_date: "2024-11-24", year: 2024 },
  { id: "a5", title: "A Topical Detour", book_id: null, canon_category: "", start_date: "2025-02-23", end_date: "2025-03-30", year: 2025 },
];

const COUNTS = { a1: 8, a2: 10, a3: 16, a4: 12, a5: 5 };

export default function ArcFixture() {
  return <Arc onOpenPlanner={() => {}} _fixture={{ series: SERIES, counts: COUNTS }} />;
}
