import { bookById, GENRES } from "../data/canonicalBooks";
import { toDateString } from "./churchCalendar";

// arc — cross-series balance + gaps, the one read a single-series design can't
// have. Pure arithmetic over ALL series + their sermons (aggregation, not
// schema): sort the series on a timeline, compute the gap between consecutive
// series, and over a trailing window report which of the 7 Dever genres are
// touched vs missing, the OT:NT split, and how many entries are still
// unclassified. The balance is SERMON-GRAINED (Coverage Initiative, Phase 2):
// each sermon counts its effective book's genre + testament, so a topical
// series — many books under one theme — shows its full spread rather than one
// row. AI-free; deterministic.

const GENRE_KEYS = Object.keys(GENRES);

function classifiedGenre(s) {
  return s && typeof s.canon_category === "string" && GENRES[s.canon_category] ? s.canon_category : null;
}

// One classification UNIT's genre + testament. A sermon with its OWN book is a
// topical pick — genre + testament come straight from that book. An inherited
// sermon (a book-series sermon, or a not-yet-booked topical sermon) carries the
// series' classification: its overridable canon_category for genre, the series'
// book for testament (the genre's ot_/nt_ prefix as the last resort). Gating
// genre on the recognized canon_category keeps an unknown value from counting
// as both a genre AND unclassified, which would stop the sidebar reconciling.
function unitOf(sermon, series) {
  const ownBook = sermon && sermon.book_id ? bookById(sermon.book_id) : null;
  if (ownBook) return { genre: ownBook.genre, testament: ownBook.testament };
  const effBook = bookById(effectiveBookId(sermon, series));
  const genre = classifiedGenre(series) || (effBook ? effBook.genre : null);
  const testament = effBook ? effBook.testament : (genre ? (genre.startsWith("ot_") ? "OT" : "NT") : null);
  return { genre, testament };
}

// The book a sermon effectively belongs to for canon-balance views. A topical
// sermon picks its own book per-sermon (`sermon.book_id`); a book-series sermon
// has none and inherits the series' book (`series.book_id`). "" and null both
// mean "unset" and fall through; returns null when neither is set. Consumed by
// the sermon-grained Arc (Coverage Initiative, Phase 2).
export function effectiveBookId(sermon, series) {
  return (sermon && sermon.book_id) || (series && series.book_id) || null;
}

// Whole days from a to b (both "YYYY-MM-DD"), or null if either is missing.
function daysBetween(a, b) {
  if (!a || !b) return null;
  const ms = new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`);
  return Math.round(ms / 86400000);
}

function minusMonths(iso, months) {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDate();
  d.setMonth(d.getMonth() - months);
  // setMonth rolls FORWARD when the target month is shorter (e.g. Mar 31 − 1 →
  // "Mar 3"); clamp back to the target month's last day so the window boundary
  // stays correct (and a Feb-29 `now` doesn't slip a day going back to a non-leap year).
  if (d.getDate() < day) d.setDate(0);
  return toDateString(d);
}

export function computeArc(series, sermons = [], { nowISO = "", windowMonths = 24 } = {}) {
  // Group sermons under their series so each series row can aggregate the
  // genre / testament SPREAD of its sermons' effective books. Standalone sermons
  // (no series_id) collect separately — they're the "By book" lens's one-off
  // entries (Coverage Initiative), so a sermon preached outside any series still
  // gets its book tracked instead of vanishing from the canon balance.
  const bySeries = new Map();
  const oneOff = [];
  for (const sm of Array.isArray(sermons) ? sermons : []) {
    if (!sm) continue;
    if (!sm.series_id) { oneOff.push(sm); continue; }
    const list = bySeries.get(sm.series_id);
    if (list) list.push(sm);
    else bySeries.set(sm.series_id, [sm]);
  }

  const rows = (series || [])
    .map((s) => {
      const seriesSermons = bySeries.get(s.id) || [];
      // One classification unit per sermon; a series with no sermons yet is one
      // synthetic INHERITED unit (its own book), so a planned book series still
      // classifies and — with no sermons loaded at all — the whole model
      // degrades cleanly to the old per-series grain.
      const units = seriesSermons.length
        ? seriesSermons.map((sm) => unitOf(sm, s))
        : [unitOf({}, s)];
      const genreSet = new Set(units.map((u) => u.genre).filter(Boolean));
      const genres = GENRE_KEYS.filter((k) => genreSet.has(k));
      const testaments = new Set(units.map((u) => u.testament).filter(Boolean));
      return {
        id: s.id,
        title: s.title || s.name || "Untitled series",
        units, // internal — stripped from the returned rows below
        bookId: s.book_id || null,
        // A topical series has no single book; its spread shows in the genre cell.
        bookName: (bookById(s.book_id) || {}).name || null,
        genres,
        genreLabel: genres.length === 0 ? "Unclassified" : genres.length === 1 ? GENRES[genres[0]] : "Mixed",
        testament: testaments.size === 0 ? null : testaments.size === 1 ? [...testaments][0] : "OT · NT",
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

  // One-off / standalone sermons grouped BY their own book. Each book with one-off
  // sermons is one row in a SEPARATE list — a one-off has no series span or
  // gap-to-next, so it doesn't belong on the series timeline, but its book must
  // still count. A one-off with no book picked collects under a single "no book"
  // row and counts as unclassified — a nudge to classify it.
  const oneOffBuckets = new Map();
  for (const sm of oneOff) {
    const key = sm.book_id || "__none__";
    const list = oneOffBuckets.get(key);
    if (list) list.push(sm);
    else oneOffBuckets.set(key, [sm]);
  }
  const oneOffRows = [...oneOffBuckets.entries()]
    .map(([key, group]) => {
      const book = key === "__none__" ? null : bookById(key);
      // Each one-off sermon is its own classification unit (no series to inherit
      // from); carry its date so the balance can window it per-sermon.
      const units = group.map((sm) => ({ ...unitOf(sm, null), date: sm.date || "" }));
      const genreSet = new Set(units.map((u) => u.genre).filter(Boolean));
      const genres = GENRE_KEYS.filter((k) => genreSet.has(k));
      const testaments = new Set(units.map((u) => u.testament).filter(Boolean));
      const dates = group.map((sm) => sm.date).filter(Boolean).sort();
      return {
        id: `oneoff:${key}`,
        bookId: book ? book.id : null,
        bookName: book ? book.name : null,
        title: book ? book.name : "No book",
        units,
        genres,
        genreLabel: genres.length === 0 ? "Unclassified" : genres.length === 1 ? GENRES[genres[0]] : "Mixed",
        testament: testaments.size === 0 ? null : testaments.size === 1 ? [...testaments][0] : "OT · NT",
        count: group.length,
        startDate: dates[0] || "",
        endDate: dates[dates.length - 1] || "",
      };
    })
    .sort((a, b) => {
      // Classified books first (alpha by name); the no-book bucket last.
      if (!a.bookId && b.bookId) return 1;
      if (a.bookId && !b.bookId) return -1;
      return (a.title || "").localeCompare(b.title || "");
    });

  // Trailing window: series starting on/after (now − windowMonths). With no
  // nowISO the window is the whole list (every dated series).
  const windowStart = nowISO ? minusMonths(nowISO, windowMonths) : null;
  const inWindow = rows.filter((r) => r.startDate && (!windowStart || r.startDate >= windowStart));

  // Balance is sermon-grained over ONE combined pool: every sermon in an in-window
  // series (series windowed wholesale by start_date) plus every one-off sermon
  // whose OWN date falls in the window. So a topical series shows its full spread
  // AND a standalone sermon's book counts toward the genre / testament balance.
  const oneOffUnits = oneOffRows.flatMap((r) => r.units);
  const inWindowOneOffUnits = oneOffUnits.filter((u) => u.date && (!windowStart || u.date >= windowStart));
  const inWindowUnits = [...inWindow.flatMap((r) => r.units), ...inWindowOneOffUnits];
  const touched = new Set(inWindowUnits.map((u) => u.genre).filter(Boolean));
  const genresTouched = GENRE_KEYS.filter((k) => touched.has(k));
  const allUnits = [...rows.flatMap((r) => r.units), ...oneOffUnits];

  return {
    // Strip the internal `units` from the public row shapes.
    rows: rows.map(({ units, ...r }) => r),
    oneOffRows: oneOffRows.map(({ units, ...r }) => r),
    windowStart,
    windowMonths,
    inWindowCount: inWindow.length, // series only — one-offs aren't series
    inWindowSermonCount: inWindowUnits.length, // includes in-window one-offs
    genresTouched,
    otCount: inWindowUnits.filter((u) => u.testament === "OT").length,
    ntCount: inWindowUnits.filter((u) => u.testament === "NT").length,
    unclassifiedCount: allUnits.filter((u) => !u.genre).length,
  };
}
