import { describe, it, expect } from "vitest";
import { computeArc, effectiveBookId } from "../../src/utils/arc";

// A small cross-series fixture: a recent arc (1 Peter → Daniel → Revelation),
// one unclassified series, and one old series that falls outside a 24-month
// trailing window from 2026-01-01.
const SERIES = [
  { id: "s1", title: "1 Peter", book_id: "1-peter", canon_category: "nt_general", start_date: "2025-01-05", end_date: "2025-01-26", year: 2025 },
  { id: "s2", title: "Daniel", book_id: "daniel", canon_category: "ot_prophets", start_date: "2025-04-06", end_date: "2025-06-01", year: 2025 },
  { id: "s3", title: "Revelation", book_id: "revelation", canon_category: "nt_general", start_date: "2025-09-07", end_date: "2025-11-02", year: 2025 },
  { id: "s4", title: "Genesis (old)", book_id: "genesis", canon_category: "ot_law", start_date: "2022-01-02", end_date: "2022-06-01", year: 2022 },
  { id: "s5", title: "Mystery", book_id: null, canon_category: "", start_date: "2025-02-02", end_date: "2025-02-23", year: 2025 },
];

describe("computeArc — rows, sort, gap-to-next", () => {
  it("sorts by start_date and computes gap-to-next in days", () => {
    const arc = computeArc(SERIES, [], { nowISO: "2026-01-01", windowMonths: 24 });
    expect(arc.rows.map((r) => r.id)).toEqual(["s4", "s1", "s5", "s2", "s3"]);
    // s1 ends 2025-01-26, s5 starts 2025-02-02 → 7 days.
    const s1 = arc.rows.find((r) => r.id === "s1");
    expect(s1.gapToNextDays).toBe(7);
    // The last series has no next → null.
    expect(arc.rows[arc.rows.length - 1].gapToNextDays).toBeNull();
  });

  it("resolves book name, genre label, and testament per row", () => {
    const arc = computeArc(SERIES, [], { nowISO: "2026-01-01" });
    const s2 = arc.rows.find((r) => r.id === "s2");
    expect(s2.bookName).toBe("Daniel");
    expect(s2.genreLabel).toBe("OT — Prophets");
    expect(s2.testament).toBe("OT");
    const s5 = arc.rows.find((r) => r.id === "s5");
    expect(s5.genreLabel).toBe("Unclassified");
    expect(s5.testament).toBeNull();
  });
});

describe("computeArc — windowed balance", () => {
  it("counts touched vs missing genres and OT:NT in a 24-month window", () => {
    const arc = computeArc(SERIES, [], { nowISO: "2026-01-01", windowMonths: 24 });
    // In-window: s1, s5, s2, s3 (s4 is 2022, outside).
    expect(arc.inWindowCount).toBe(4);
    expect(arc.genresTouched).toEqual(["ot_prophets", "nt_general"]);
    expect(arc.otCount).toBe(1); // Daniel
    expect(arc.ntCount).toBe(2); // 1 Peter, Revelation
    expect(arc.unclassifiedCount).toBe(1); // Mystery (all rows, not just window)
  });

  it("the window adjusts: a 6-month window only sees the most recent series", () => {
    const arc = computeArc(SERIES, [], { nowISO: "2026-01-01", windowMonths: 6 });
    // windowStart = 2025-07-01 → only Revelation (2025-09-07) qualifies.
    expect(arc.inWindowCount).toBe(1);
    expect(arc.genresTouched).toEqual(["nt_general"]);
    expect(arc.otCount).toBe(0);
    expect(arc.ntCount).toBe(1);
  });

  it("with no 'now' the window spans every dated series", () => {
    const arc = computeArc(SERIES, []);
    expect(arc.inWindowCount).toBe(5);
    expect(arc.genresTouched).toEqual(["ot_law", "ot_prophets", "nt_general"]);
  });
});

describe("computeArc — fail-soft", () => {
  it("handles empty / missing input", () => {
    expect(computeArc([]).rows).toEqual([]);
    expect(computeArc(undefined).unclassifiedCount).toBe(0);
    expect(computeArc(null).genresTouched).toEqual([]);
  });
});

describe("effectiveBookId — a sermon's book, falling back to its series'", () => {
  it("prefers the sermon's own book_id (topical), else the series' (book-series), else null", () => {
    // Topical sermon carries its own book.
    expect(effectiveBookId({ book_id: "john" }, { book_id: "luke" })).toBe("john");
    // Book-series sermon has none — inherits the series' book. "" and null both fall through.
    expect(effectiveBookId({ book_id: "" }, { book_id: "luke" })).toBe("luke");
    expect(effectiveBookId({ book_id: null }, { book_id: "luke" })).toBe("luke");
    expect(effectiveBookId({}, { book_id: "luke" })).toBe("luke");
    // Neither set → null (Unclassified on the Arc).
    expect(effectiveBookId({}, {})).toBeNull();
    expect(effectiveBookId({ book_id: "john" }, null)).toBe("john");
  });
});

describe("computeArc — trailing-window boundary (minusMonths month-overflow clamp)", () => {
  it("clamps a month-end 'now' back to the target month's last day, not forward", () => {
    // now = 2026-03-31, window = 1 month. Naive setMonth(−1) rolls Feb-31 → Mar 3
    // (a window that's too SHORT). Clamped, windowStart must be Feb 28 (2026 is
    // not a leap year), so the Mar series is in and the mid-Feb series is out.
    const series = [
      { id: "mar", canon_category: "nt_pauline", book_id: "romans", start_date: "2026-03-10", end_date: "2026-03-20" },
      { id: "feb", canon_category: "ot_law", book_id: "genesis", start_date: "2026-02-15", end_date: "2026-02-20" },
    ];
    const arc = computeArc(series, [], { nowISO: "2026-03-31", windowMonths: 1 });
    expect(arc.windowStart).toBe("2026-02-28");
    expect(arc.inWindowCount).toBe(1);
  });
});

describe("computeArc — testament inference is gated on a recognized genre", () => {
  it("an unknown ot_/nt_-shaped genre is unclassified, not counted as a testament", () => {
    const series = [
      { id: "x", canon_category: "ot_apocrypha", book_id: null, start_date: "2025-06-01", end_date: "2025-06-30" },
    ];
    const arc = computeArc(series, [], { nowISO: "2026-01-01", windowMonths: 24 });
    expect(arc.otCount).toBe(0); // NOT inferred from the bogus "ot_" prefix
    expect(arc.ntCount).toBe(0);
    expect(arc.unclassifiedCount).toBe(1);
  });
});

describe("computeArc — sermon-grained spread (Coverage Phase 2)", () => {
  // A book series (Daniel) + a topical series whose sermons range across books.
  const SERIES = [
    { id: "bk", title: "Daniel", book_id: "daniel", canon_category: "ot_prophets", kind: "book", start_date: "2025-01-05", end_date: "2025-02-23", year: 2025 },
    { id: "tp", title: "The Mission of God", book_id: null, canon_category: "", kind: "topical", start_date: "2025-03-02", end_date: "2025-04-06", year: 2025 },
  ];
  const SERMONS = [
    // Book-series sermons carry no own book_id — they inherit the series' book.
    { id: "bk-1", series_id: "bk" }, { id: "bk-2", series_id: "bk" },
    // Topical sermons carry their OWN book — across Law, Gospels, Pauline.
    { id: "tp-1", series_id: "tp", book_id: "genesis" }, // ot_law / OT
    { id: "tp-2", series_id: "tp", book_id: "luke" },    // nt_gospels / NT
    { id: "tp-3", series_id: "tp", book_id: "romans" },  // nt_pauline / NT
    { id: "tp-4", series_id: "tp", book_id: null },      // not yet booked → unclassified
  ];

  it("a topical series contributes every genre its sermons touch", () => {
    const arc = computeArc(SERIES, SERMONS, { nowISO: "2026-01-01", windowMonths: 24 });
    expect(arc.genresTouched).toEqual(["ot_law", "ot_prophets", "nt_gospels", "nt_pauline"]);
  });

  it("counts OT:NT per sermon, not per series", () => {
    const arc = computeArc(SERIES, SERMONS, { nowISO: "2026-01-01", windowMonths: 24 });
    expect(arc.otCount).toBe(3); // 2 Daniel (inherited) + Genesis
    expect(arc.ntCount).toBe(2); // Luke + Romans
    expect(arc.inWindowSermonCount).toBe(6);
  });

  it("a sermon with no effective book is the only unclassified entry", () => {
    const arc = computeArc(SERIES, SERMONS, { nowISO: "2026-01-01", windowMonths: 24 });
    expect(arc.unclassifiedCount).toBe(1); // tp-4 only
  });

  it("the topical row reads Mixed across both testaments; the book row stays single", () => {
    const arc = computeArc(SERIES, SERMONS, { nowISO: "2026-01-01", windowMonths: 24 });
    const tp = arc.rows.find((r) => r.id === "tp");
    expect(tp.genreLabel).toBe("Mixed");
    expect(tp.genres).toEqual(["ot_law", "nt_gospels", "nt_pauline"]);
    expect(tp.testament).toBe("OT · NT");
    expect(tp.bookName).toBeNull();
    const bk = arc.rows.find((r) => r.id === "bk");
    expect(bk.genreLabel).toBe("OT — Prophets");
    expect(bk.testament).toBe("OT");
    expect(bk.bookName).toBe("Daniel");
  });

  it("with no sermons loaded, the model degrades to series-grain", () => {
    const arc = computeArc(SERIES, [], { nowISO: "2026-01-01", windowMonths: 24 });
    expect(arc.genresTouched).toEqual(["ot_prophets"]); // Daniel only; topical has no book
    expect(arc.otCount).toBe(1);
    expect(arc.unclassifiedCount).toBe(1); // the bookless topical series
  });
});

describe("computeArc — standalone / one-off sermons (Coverage: By book lens)", () => {
  const SERIES = [
    { id: "bk", title: "Daniel", book_id: "daniel", canon_category: "ot_prophets", kind: "book", start_date: "2025-01-05", end_date: "2025-02-23", year: 2025 },
  ];
  const SERMONS = [
    { id: "bk-1", series_id: "bk" },
    // One-off sermons — no series. Two share a book (Jonah), one is a lone NT
    // book (Philippians), one carries no book at all.
    { id: "o1", series_id: null, book_id: "jonah", date: "2025-07-13" },
    { id: "o2", series_id: null, book_id: "jonah", date: "2025-07-20" },
    { id: "o3", series_id: null, book_id: "philippians", date: "2025-08-03" },
    { id: "o4", series_id: null, book_id: null, date: "2025-08-17" },
  ];

  it("groups one-off sermons by book into oneOffRows, off the series timeline", () => {
    const arc = computeArc(SERIES, SERMONS, { nowISO: "2026-01-01", windowMonths: 24 });
    // The series timeline holds only series — one-offs never appear there.
    expect(arc.rows.map((r) => r.id)).toEqual(["bk"]);
    const jonah = arc.oneOffRows.find((r) => r.bookId === "jonah");
    expect(jonah.count).toBe(2);
    expect(jonah.bookName).toBe("Jonah");
    expect(jonah.testament).toBe("OT");
    // The no-book bucket sorts last and reads as unclassified.
    const last = arc.oneOffRows[arc.oneOffRows.length - 1];
    expect(last.bookId).toBeNull();
    expect(last.genreLabel).toBe("Unclassified");
  });

  it("counts one-off sermons in the balance (genres, OT:NT, sermon count)", () => {
    const arc = computeArc(SERIES, SERMONS, { nowISO: "2026-01-01", windowMonths: 24 });
    expect(arc.genresTouched).toContain("ot_prophets"); // Daniel + Jonah
    expect(arc.genresTouched).toContain("nt_pauline");  // Philippians
    expect(arc.otCount).toBe(3); // 1 Daniel (inherited) + 2 Jonah
    expect(arc.ntCount).toBe(1); // Philippians
    expect(arc.inWindowSermonCount).toBe(5); // 1 series sermon + 4 one-offs
    expect(arc.unclassifiedCount).toBe(1);   // the bookless one-off
  });

  it("windows one-off sermons by their own date, independent of any series", () => {
    // 6-month window from 2026-01-01 → windowStart 2025-07-01. The four one-offs
    // (Jul–Aug 2025) are in; the Daniel series (Jan 2025) drops out.
    const arc = computeArc(SERIES, SERMONS, { nowISO: "2026-01-01", windowMonths: 6 });
    expect(arc.inWindowCount).toBe(0); // no series in the last 6 months
    expect(arc.inWindowSermonCount).toBe(4); // the four one-offs
    expect(arc.otCount).toBe(2); // 2 Jonah (Daniel is out of window)
    expect(arc.ntCount).toBe(1); // Philippians
  });

  it("no one-off sermons → an empty oneOffRows list, balance unchanged", () => {
    const arc = computeArc(SERIES, [{ id: "bk-1", series_id: "bk" }], { nowISO: "2026-01-01", windowMonths: 24 });
    expect(arc.oneOffRows).toEqual([]);
    expect(arc.inWindowSermonCount).toBe(1);
  });
});
