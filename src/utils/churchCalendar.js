/**
 * Church Calendar utility — SermonForge
 * Computes liturgical seasons and Sunday schedules.
 * Pure JS, no external dependencies.
 */

// ── Core date helpers ─────────────────────────────────────────────────────────

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateString(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ── Easter (Anonymous Gregorian computus) ─────────────────────────────────────

export function getEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m2 = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m2 + 114) / 31);
  const day = ((h + l - 7 * m2 + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// ── Season detection ──────────────────────────────────────────────────────────

/**
 * Returns the liturgical season for a given date string ("YYYY-MM-DD").
 * @returns {{ name: string, shortName: string, color: string }}
 */
export function getSeasonForDate(dateStr) {
  if (!dateStr) return null;
  const d = fromDateString(dateStr);
  const year = d.getFullYear();

  const easter = getEaster(year);
  const ashWednesday = addDays(easter, -46);
  const palmSunday  = addDays(easter, -7);
  const pentecost   = addDays(easter, 49);

  // Advent: 4th Sunday before Dec 25
  const christmas = new Date(year, 11, 25);
  const dec25Day = christmas.getDay(); // 0=Sun
  const daysBack = dec25Day === 0 ? 28 : dec25Day + 21;
  const adventStart = addDays(christmas, -daysBack);

  const epiphany = new Date(year, 0, 6); // Jan 6

  if (d < epiphany)    return { name: "Christmastide",   shortName: "Christmas",  color: "#d4a017" };
  if (d < ashWednesday) return { name: "Epiphany",        shortName: "Epiphany",   color: "#b8860b" };
  if (d < palmSunday)  return { name: "Lent",             shortName: "Lent",       color: "#6b5c4e" };
  if (d < easter)      return { name: "Holy Week",        shortName: "Holy Week",  color: "#8b1a1a" };
  if (d <= pentecost)  return { name: "Easter Season",    shortName: "Easter",     color: "#228b22" };
  if (d < adventStart) return { name: "Ordinary Time",    shortName: "Ordinary",   color: "#4a6741" };
  if (d < christmas)   return { name: "Advent",           shortName: "Advent",     color: "#2c3e50" };
  return                      { name: "Christmastide",    shortName: "Christmas",  color: "#d4a017" };
}

// ── Sunday schedule generation ────────────────────────────────────────────────

/**
 * Get the next Sunday on or after a given date.
 */
function firstSundayOnOrAfter(date) {
  const d = new Date(date);
  const day = d.getDay();
  if (day !== 0) d.setDate(d.getDate() + (7 - day));
  return d;
}

/**
 * Generate N Sundays starting from startDateStr, skipping excludeDates.
 * @param {string} startDateStr — "YYYY-MM-DD"
 * @param {number} count — number of Sundays needed
 * @param {string[]} excludeDates — "YYYY-MM-DD" strings to skip
 * @returns {string[]} — array of "YYYY-MM-DD"
 */
export function getUpcomingSundays(startDateStr, count, excludeDates = []) {
  if (!startDateStr || !count) return [];
  const excludeSet = new Set(excludeDates);
  let current = firstSundayOnOrAfter(fromDateString(startDateStr));
  const sundays = [];
  while (sundays.length < count) {
    const str = toDateString(current);
    if (!excludeSet.has(str)) sundays.push(str);
    current = addDays(current, 7);
  }
  return sundays;
}

// ── Display helpers ───────────────────────────────────────────────────────────

