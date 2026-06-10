import { useState, useEffect } from "react";
import { getAllSermons } from "../core/spine";
import { SERMON_STATUS, SERMON_STATUS_LABELS } from "../core/contracts";
import SecondaryButton from "./primitives/SecondaryButton";
import InlineError from "./InlineError";
import NewSermonModal from "./NewSermonModal";
import { buttonKeydown } from "../utils/buttonKeydown";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STAGE_COLORS = {
  [SERMON_STATUS.InProgress]: "var(--sage)",
  [SERMON_STATUS.Complete]: "var(--gold)",
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function Calendar({ onOpenSermon }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [sermons, setSermons] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  // Day-click → New Sermon with that date pre-filled (T19 findability,
  // Gate-0 ratified): the weekly motion is "next Sunday needs a sermon,"
  // and a date-prefilled modal is its smallest honest shape. (CORE's old
  // "Calendar assigns sermons to Sundays" identity sentence was struck in
  // the 2026-06-10 rearticulation — this feature stands on the ratified
  // overhaul decision, not on that sentence.)
  const [newSermonDate, setNewSermonDate] = useState(null);

  const loadSermons = () => {
    setLoadError(false);
    getAllSermons()
      .then(setSermons)
      .catch((e) => {
        console.error("[Calendar] load failed:", e);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSermons(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  function dateFor(day) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Build calendar grid (6 rows × 7 cols)
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Preached sermons stay on the grid (gold chips) — a pastor's preached
  // schedule must not erase itself the moment he marks a sermon preached.
  const sermonsByDate = {};
  for (const s of sermons) {
    if (!s.date) continue;
    const d = new Date(s.date + "T00:00:00");
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate();
      if (!sermonsByDate[day]) sermonsByDate[day] = [];
      sermonsByDate[day].push(s);
    }
  }
  const monthIsEmpty = Object.keys(sermonsByDate).length === 0;
  // The "dated sermons appear here" explainer must show for the pastor
  // whose sermons exist but carry no date — the one person who needs the
  // mechanism named — not just for an empty library.
  const noDatedSermons = sermons.every((s) => !s.date);

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="page-title">Calendar</h1>
            <p className="page-subtitle">
              {loadError
                ? "Sermon schedule"
                : "Sermon schedule — click a day to start a sermon for that date"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SecondaryButton size="sm" onClick={prevMonth}>← Prev</SecondaryButton>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "18px", fontWeight: 600, minWidth: "180px", textAlign: "center" }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <SecondaryButton size="sm" onClick={nextMonth}>Next →</SecondaryButton>
            <SecondaryButton size="sm" onClick={goToday}>Today</SecondaryButton>
          </div>
        </div>
        {/* Color is never the sole signal — the legend names the chips for
            sighted users, and each chip's title/aria carries its status word
            for everyone else. Hidden in the error state (no chips exist to
            describe). */}
        {!loadError && (
          <div className="calendar-legend">
            <span className="calendar-legend-item">
              <span className="calendar-legend-dot" aria-hidden="true" style={{ background: STAGE_COLORS[SERMON_STATUS.InProgress] }} />
              {SERMON_STATUS_LABELS[SERMON_STATUS.InProgress]}
            </span>
            <span className="calendar-legend-item">
              <span className="calendar-legend-dot" aria-hidden="true" style={{ background: STAGE_COLORS[SERMON_STATUS.Complete] }} />
              {SERMON_STATUS_LABELS[SERMON_STATUS.Complete]}
            </span>
          </div>
        )}
      </div>

      <div className="page-body">
        {loadError ? (
          <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}>
            <InlineError onRetry={loadSermons}>Could not load the calendar.</InlineError>
          </div>
        ) : (
          <>
            <div className="calendar-grid">
              {DAYS.map((d) => (
                <div key={d} className="calendar-day-header">{d}</div>
              ))}
              {cells.map((day, i) => {
                const isToday = day && viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
                return (
                  <div
                    key={i}
                    className={`calendar-day ${!day ? "other-month" : ""} ${isToday ? "today" : ""}`}
                    {...(day
                      ? {
                          role: "button",
                          tabIndex: 0,
                          onClick: (e) => {
                            // Chip clicks open the sermon; only a click on
                            // the day itself starts a new one.
                            if (e.target !== e.currentTarget && !e.target.classList?.contains("calendar-day-num")) return;
                            setNewSermonDate(dateFor(day));
                          },
                          onKeyDown: buttonKeydown(() => setNewSermonDate(dateFor(day))),
                          title: `Start a sermon for ${MONTHS[viewMonth]} ${day}`,
                        }
                      : {})}
                  >
                    {day && (
                      <>
                        <div className="calendar-day-num">{day}</div>
                        {(sermonsByDate[day] || []).map((s) => (
                          <div
                            key={s.id}
                            className="calendar-event"
                            style={{ background: STAGE_COLORS[s.stage] || "var(--gold)" }}
                            onClick={(e) => { e.stopPropagation(); onOpenSermon(s.id); }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={buttonKeydown(() => onOpenSermon(s.id))}
                            title={`${s.title} — ${SERMON_STATUS_LABELS[s.stage] ?? ""}`}
                            aria-label={`${s.title} — ${SERMON_STATUS_LABELS[s.stage] ?? ""}`}
                          >
                            {s.title}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {!loading && monthIsEmpty && (
              <p className="calendar-empty-note">
                Nothing scheduled this month.
                {noDatedSermons && " Sermons with a date appear here."}
              </p>
            )}
          </>
        )}
      </div>

      {newSermonDate && (
        <NewSermonModal
          initialDate={newSermonDate}
          onClose={() => setNewSermonDate(null)}
          onCreated={(id) => {
            setNewSermonDate(null);
            onOpenSermon(id);
          }}
        />
      )}
    </>
  );
}
