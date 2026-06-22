import { describe, it, expect } from "vitest";
import { computeArc } from "../../src/utils/arc";

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
    const arc = computeArc(SERIES, { nowISO: "2026-01-01", windowMonths: 24 });
    expect(arc.rows.map((r) => r.id)).toEqual(["s4", "s1", "s5", "s2", "s3"]);
    // s1 ends 2025-01-26, s5 starts 2025-02-02 → 7 days.
    const s1 = arc.rows.find((r) => r.id === "s1");
    expect(s1.gapToNextDays).toBe(7);
    // The last series has no next → null.
    expect(arc.rows[arc.rows.length - 1].gapToNextDays).toBeNull();
  });

  it("resolves book name, genre label, and testament per row", () => {
    const arc = computeArc(SERIES, { nowISO: "2026-01-01" });
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
    const arc = computeArc(SERIES, { nowISO: "2026-01-01", windowMonths: 24 });
    // In-window: s1, s5, s2, s3 (s4 is 2022, outside).
    expect(arc.inWindowCount).toBe(4);
    expect(arc.genresTouched).toEqual(["ot_prophets", "nt_general"]);
    expect(arc.genresMissing).toEqual(["ot_law", "ot_history", "ot_writings", "nt_gospels", "nt_pauline"]);
    expect(arc.otCount).toBe(1); // Daniel
    expect(arc.ntCount).toBe(2); // 1 Peter, Revelation
    expect(arc.unclassifiedCount).toBe(1); // Mystery (all rows, not just window)
  });

  it("the window adjusts: a 6-month window only sees the most recent series", () => {
    const arc = computeArc(SERIES, { nowISO: "2026-01-01", windowMonths: 6 });
    // windowStart = 2025-07-01 → only Revelation (2025-09-07) qualifies.
    expect(arc.inWindowCount).toBe(1);
    expect(arc.genresTouched).toEqual(["nt_general"]);
    expect(arc.otCount).toBe(0);
    expect(arc.ntCount).toBe(1);
  });

  it("with no 'now' the window spans every dated series", () => {
    const arc = computeArc(SERIES, {});
    expect(arc.inWindowCount).toBe(5);
    expect(arc.genresTouched).toEqual(["ot_law", "ot_prophets", "nt_general"]);
  });
});

describe("computeArc — fail-soft", () => {
  it("handles empty / missing input", () => {
    expect(computeArc([]).rows).toEqual([]);
    expect(computeArc(undefined).unclassifiedCount).toBe(0);
    expect(computeArc(null).genresMissing.length).toBe(7);
  });
});
