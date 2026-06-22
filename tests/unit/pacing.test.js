import { describe, it, expect } from "vitest";
import { computePacing, lengthBand } from "../../src/utils/pacing";
import { getUpcomingSundays } from "../../src/utils/churchCalendar";

// The pacing readout is pure arithmetic over pastor-authored data. These tests
// lock the neutral length bands, the projected end date (which must match how
// "Suggest Sundays" steps — getUpcomingSundays, not naive start + slots*7), the
// special-date push-out, and fail-soft behavior on missing inputs.

describe("lengthBand — neutral, by slot count", () => {
  it("names the bands at and around the boundaries", () => {
    expect(lengthBand(1)).toBe("Short");
    expect(lengthBand(6)).toBe("Short");
    expect(lengthBand(7)).toBe("Standard");
    expect(lengthBand(12)).toBe("Standard");
    expect(lengthBand(13)).toBe("Long");
    expect(lengthBand(20)).toBe("Long");
    expect(lengthBand(21)).toBe("Extended");
    expect(lengthBand(60)).toBe("Extended");
  });
  it("returns null for no slots", () => {
    expect(lengthBand(0)).toBeNull();
    expect(lengthBand(undefined)).toBeNull();
  });
});

describe("computePacing — weeks / months / band", () => {
  it("derives weeks, months, and band from the slot count", () => {
    const p = computePacing({ slotCount: 16, startDate: "2026-01-04" });
    expect(p.weeks).toBe(16);
    expect(p.months).toBeCloseTo(16 / 4.345, 4); // ~3.68
    expect(p.band).toBe("Long");
  });
});

describe("computePacing — projected end date (matches Suggest Sundays)", () => {
  it("ends on the last projected Sunday, NOT naive start + slots*7", () => {
    const startDate = "2026-01-04"; // a Sunday
    const p = computePacing({ slotCount: 16, startDate });
    // Contract: identical to how Suggest Sundays steps.
    expect(p.endDate).toBe(getUpcomingSundays(startDate, 16, []).at(-1));
    // And the concrete value (16 Sundays from Jan 4 → Apr 19).
    expect(p.endDate).toBe("2026-04-19");
  });

  it("a special-date note inside the run pushes the end LATER and is reported as crossed", () => {
    const startDate = "2026-01-04";
    const calNotes = [{ date: "2026-01-11", label: "VBS week" }]; // the 2nd Sunday
    const without = computePacing({ slotCount: 4, startDate });
    const withNote = computePacing({ slotCount: 4, startDate, calNotes });

    expect(without.endDate).toBe("2026-01-25"); // 01-04, 11, 18, 25
    expect(withNote.endDate).toBe("2026-02-01"); // 01-11 skipped → pushed one week
    expect(withNote.crossedNotes.map((n) => n.label)).toEqual(["VBS week"]);
  });

  it("reports the distinct liturgical seasons the run spans", () => {
    // Jan 4 → mid-April 2026 crosses Christmastide/Epiphany/Lent/Easter.
    const p = computePacing({ slotCount: 16, startDate: "2026-01-04" });
    expect(Array.isArray(p.seasons)).toBe(true);
    expect(p.seasons.length).toBeGreaterThanOrEqual(2);
    expect(p.seasons.every((s) => s.name && s.shortName)).toBe(true);
  });
});

describe("computePacing — fail-soft", () => {
  it("no start date → no end date, no seasons, but still counts/band", () => {
    const p = computePacing({ slotCount: 5, startDate: "" });
    expect(p.endDate).toBeNull();
    expect(p.seasons).toEqual([]);
    expect(p.crossedNotes).toEqual([]);
    expect(p.band).toBe("Short");
    expect(p.weeks).toBe(5);
  });
  it("zero slots → zeros and nulls, no throw", () => {
    const p = computePacing({ slotCount: 0, startDate: "2026-01-04" });
    expect(p.weeks).toBe(0);
    expect(p.months).toBe(0);
    expect(p.band).toBeNull();
    expect(p.endDate).toBeNull();
  });
  it("no args at all → defaults, no throw", () => {
    const p = computePacing();
    expect(p.slotCount).toBe(0);
    expect(p.endDate).toBeNull();
  });
});
