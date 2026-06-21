import { describe, it, expect } from "vitest";
import {
  getEaster,
  getSeasonForDate,
  getUpcomingSundays,
  toDateString,
  fromDateString,
} from "../../src/utils/churchCalendar";

// Pure liturgical-calendar logic behind the planner's Calendar tab — Easter
// computus, season boundaries, and Sunday generation. Untested before the
// Series Planner revival audit remediation (audit M11); these are deterministic
// and edge-prone (boundary dates, exclude handling, start-day rounding).

describe("getEaster (Anonymous Gregorian computus)", () => {
  // Known Western Easter Sundays.
  const cases = [
    [2024, 3, 31],
    [2025, 4, 20],
    [2026, 4, 5],
    [2027, 3, 28],
    [2000, 4, 23],
  ];
  for (const [year, month, day] of cases) {
    it(`${year} → ${month}/${day}`, () => {
      const e = getEaster(year);
      expect(e.getFullYear()).toBe(year);
      expect(e.getMonth() + 1).toBe(month);
      expect(e.getDate()).toBe(day);
    });
  }
});

describe("getUpcomingSundays", () => {
  it("returns N consecutive Sundays starting on a Sunday start date", () => {
    expect(getUpcomingSundays("2026-01-04", 3)).toEqual([
      "2026-01-04",
      "2026-01-11",
      "2026-01-18",
    ]);
  });

  it("rounds a non-Sunday start up to the next Sunday", () => {
    // 2026-01-01 is a Thursday → first Sunday is 2026-01-04.
    expect(getUpcomingSundays("2026-01-01", 2)).toEqual(["2026-01-04", "2026-01-11"]);
  });

  it("skips excluded dates and still returns the requested count", () => {
    expect(getUpcomingSundays("2026-01-04", 3, ["2026-01-11"])).toEqual([
      "2026-01-04",
      "2026-01-18",
      "2026-01-25",
    ]);
  });

  it("returns [] for missing inputs", () => {
    expect(getUpcomingSundays("", 3)).toEqual([]);
    expect(getUpcomingSundays("2026-01-04", 0)).toEqual([]);
  });
});

describe("getSeasonForDate", () => {
  it("returns null for empty input", () => {
    expect(getSeasonForDate("")).toBeNull();
  });

  it("classifies representative dates and returns a design-system token (not hex)", () => {
    const lent = getSeasonForDate("2026-03-01"); // between Ash Wed (Feb 18) and Palm Sun (Mar 29)
    expect(lent.name).toBe("Lent");
    expect(lent.token).toBe("--ink-soft");

    const easter = getSeasonForDate("2026-04-05"); // Easter Sunday 2026
    expect(easter.shortName).toBe("Easter");

    const ordinary = getSeasonForDate("2026-09-13");
    expect(ordinary.name).toBe("Ordinary Time");
    expect(ordinary.token).toBe("--sage");
  });

  it("every season token is a CSS variable reference, never a raw hex", () => {
    for (const d of ["2026-01-01", "2026-03-01", "2026-04-05", "2026-07-01", "2026-12-01", "2026-12-25"]) {
      const s = getSeasonForDate(d);
      expect(s).not.toBeNull();
      expect(s.token.startsWith("--")).toBe(true);
      expect(s.token).not.toMatch(/#/);
    }
  });
});

describe("date string round-trip", () => {
  it("toDateString / fromDateString are inverses (local, no TZ drift)", () => {
    const d = fromDateString("2026-02-18");
    expect(toDateString(d)).toBe("2026-02-18");
  });
});
