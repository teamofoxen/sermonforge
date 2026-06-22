import { bookById, GENRES } from "../data/canonicalBooks";
import { toDateString } from "./churchCalendar";

// arc — cross-series balance + gaps, the one read a single-series design can't
// have. Pure arithmetic over ALL series (aggregation, not schema): sort them on
// a timeline, compute the gap between consecutive series, and over a trailing
// window report which of the 7 Dever genres are touched vs missing, the OT:NT
// split, and how many series are still unclassified. AI-free; deterministic.

const GENRE_KEYS = Object.keys(GENRES);

// Testament from the chosen book if any, else inferred from the genre key
// prefix (ot_* / nt_*), else null (unclassified).
function testamentOf(s) {
  const book = bookById(s.book_id);
  if (book) return book.testament;
  const g = s.canon_category;
  if (typeof g === "string") {
    if (g.startsWith("ot_")) return "OT";
    if (g.startsWith("nt_")) return "NT";
  }
  return null;
}

function classifiedGenre(s) {
  return typeof s.canon_category === "string" && GENRES[s.canon_category] ? s.canon_category : null;
}

// Whole days from a to b (both "YYYY-MM-DD"), or null if either is missing.
function daysBetween(a, b) {
  if (!a || !b) return null;
  const ms = new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`);
  return Math.round(ms / 86400000);
}

function minusMonths(iso, months) {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() - months);
  return toDateString(d);
}

export function computeArc(series, { nowISO = "", windowMonths = 24 } = {}) {
  const rows = (series || [])
    .map((s) => {
      const genre = classifiedGenre(s);
      return {
        id: s.id,
        title: s.title || s.name || "Untitled series",
        bookId: s.book_id || null,
        bookName: (bookById(s.book_id) || {}).name || null,
        genre,
        genreLabel: genre ? GENRES[genre] : "Unclassified",
        testament: testamentOf(s),
        startDate: s.start_date || "",
        endDate: s.end_date || "",
        year: s.year || null,
      };
    })
    .sort((a, b) => {
      // Dated series first (by start_date asc), undated last, then by year.
      if (a.startDate && b.startDate) return a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0;
      if (a.startDate) return -1;
      if (b.startDate) return 1;
      return (a.year || 0) - (b.year || 0);
    });

  // Gap to the next series: days between this series' end and the next's start.
  for (let i = 0; i < rows.length; i++) {
    const next = rows[i + 1];
    rows[i].gapToNextDays = next ? daysBetween(rows[i].endDate, next.startDate) : null;
  }

  // Trailing window: series starting on/after (now − windowMonths). With no
  // nowISO the window is the whole list (every dated series).
  const windowStart = nowISO ? minusMonths(nowISO, windowMonths) : null;
  const inWindow = rows.filter((r) => r.startDate && (!windowStart || r.startDate >= windowStart));

  const touched = new Set(inWindow.map((r) => r.genre).filter(Boolean));
  const genresTouched = GENRE_KEYS.filter((k) => touched.has(k));
  const genresMissing = GENRE_KEYS.filter((k) => !touched.has(k));

  return {
    rows,
    windowStart,
    windowMonths,
    inWindowCount: inWindow.length,
    genresTouched,
    genresMissing,
    otCount: inWindow.filter((r) => r.testament === "OT").length,
    ntCount: inWindow.filter((r) => r.testament === "NT").length,
    unclassifiedCount: rows.filter((r) => !r.genre).length,
  };
}
