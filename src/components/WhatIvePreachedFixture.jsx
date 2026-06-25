import WhatIvePreached from "./WhatIvePreached";

// Preview-only fixture (mirrors ArcFixture). Mounts the real two-lens home
// against mock data so BOTH lenses + the tab switch can be verified in a browser
// preview without Electron/SQLite. Never used in prod. Route: ?preached
// (?preached=topic opens straight to the By topic lens).

// By book lens — a small cross-series set (same shape as ArcFixture), including
// a topical series whose sermons spread across books.
const ARC_SERIES = [
  { id: "a1", title: "1 Peter: A Living Hope", book_id: "1-peter", canon_category: "nt_general", kind: "book", start_date: "2025-01-05", end_date: "2025-02-23", year: 2025 },
  { id: "a2", title: "Daniel: Faithful in Exile", book_id: "daniel", canon_category: "ot_prophets", kind: "book", start_date: "2025-04-06", end_date: "2025-06-15", year: 2025 },
  { id: "a3", title: "The Mission of God", book_id: null, canon_category: "", kind: "topical", start_date: "2025-09-07", end_date: "2025-10-26", year: 2025 },
];
const ARC_SERMONS = [
  { id: "a1-1", series_id: "a1" }, { id: "a1-2", series_id: "a1" },
  { id: "a2-1", series_id: "a2" }, { id: "a2-2", series_id: "a2" },
  { id: "a3-1", series_id: "a3", book_id: "genesis" },
  { id: "a3-2", series_id: "a3", book_id: "luke" },
  { id: "a3-3", series_id: "a3", book_id: "romans" },
];
const ARC_COUNTS = { a1: 2, a2: 2, a3: 3 };

// By topic lens — sermons carrying free-form topic tags (parseTags accepts the
// array form directly). Some in series, some standalone; tags overlap across
// sermons so topics gather more than one.
const TOPIC_SERMONS = [
  { id: "t1", name: "Zacchaeus the Tax Collector", passage: "Luke 19:1-10", date: "2026-01-11", series_title: "Through the Eyes of Luke", tags: ["money", "grace", "repentance"] },
  { id: "t2", name: "The Rich Young Ruler", passage: "Mark 10:17-31", date: "2026-02-08", series_title: null, tags: ["money", "discipleship"] },
  { id: "t3", name: "The Lord's Prayer", passage: "Matthew 6:5-15", date: "2025-11-02", series_title: "Sermon on the Mount", tags: ["prayer"] },
  { id: "t4", name: "Persistent Prayer", passage: "Luke 18:1-8", date: "2025-12-07", series_title: "Through the Eyes of Luke", tags: ["prayer", "faith"] },
  { id: "t5", name: "Rejoicing in Suffering", passage: "Romans 5:1-5", date: "2025-10-05", series_title: "Romans", tags: ["suffering", "hope"] },
  { id: "t6", name: "Go and Make Disciples", passage: "Matthew 28:18-20", date: "2025-10-26", series_title: "The Mission of God", tags: ["mission", "grace"] },
];

export default function WhatIvePreachedFixture() {
  const lens = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preached") === "topic"
    ? "topic"
    : "book";
  return (
    <WhatIvePreached
      onOpenPlanner={() => {}}
      onOpenSermon={() => {}}
      _fixture={{
        lens,
        arc: { series: ARC_SERIES, sermons: ARC_SERMONS, counts: ARC_COUNTS },
        topics: { sermons: TOPIC_SERMONS },
      }}
    />
  );
}
