import { getUpcomingSundays, getSeasonForDate } from "./churchCalendar";

// Pacing readout for a series — pure arithmetic over pastor-authored data (slot
// count, start date, the pastor's special-date notes). No AI, no prescription:
// a mirror, not an advisor. It states facts; it never warns or recommends.
// Everything is fail-soft — missing inputs just narrow what it can say.

// Neutral length bands by slot count — named, not judged. (Research puts the
// accessibility sweet spot around 8–12; longer is fine, just labeled.)
export const LENGTH_BANDS = [
  { max: 6, label: "Short" },
  { max: 12, label: "Standard" },
  { max: 20, label: "Long" },
  { max: Infinity, label: "Extended" },
];

// Average weeks per month, for the months approximation (52.14 / 12).
const WEEKS_PER_MONTH = 4.345;

export function lengthBand(slotCount) {
  if (!slotCount || slotCount < 1) return null;
  return (LENGTH_BANDS.find((b) => slotCount <= b.max) || {}).label || null;
}

export function computePacing({ slotCount = 0, startDate = "", calNotes = [] } = {}) {
  const weeks = slotCount;
  const months = slotCount > 0 ? slotCount / WEEKS_PER_MONTH : 0;
  const band = lengthBand(slotCount);

  const excludeDates = (calNotes || []).map((n) => n.date).filter(Boolean);
  // Project the run the SAME way "Suggest Sundays" steps: round up to the first
  // Sunday on/after the start, +7 per slot, skipping the pastor's noted dates
  // (which push the end LATER). The projected end is the last Sunday — NOT a
  // naive start + slots*7, which would ignore both the Sunday-rounding and the
  // skipped weeks.
  const sundays = startDate && slotCount > 0
    ? getUpcomingSundays(startDate, slotCount, excludeDates)
    : [];
  const endDate = sundays.length ? sundays[sundays.length - 1] : null;

  // Distinct liturgical seasons the projected run touches, in first-seen order.
  const seasons = [];
  for (const d of sundays) {
    const s = getSeasonForDate(d);
    if (s && !seasons.some((x) => x.name === s.name)) {
      seasons.push({ name: s.name, shortName: s.shortName });
    }
  }

  // The pastor's special-date notes that fall inside the projected window
  // (ISO date strings compare lexicographically, so >=/<= is correct here).
  const crossedNotes = sundays.length
    ? (calNotes || []).filter((n) => n.date && n.date >= sundays[0] && n.date <= endDate)
    : [];

  return { slotCount, weeks, months, band, endDate, seasons, crossedNotes };
}
