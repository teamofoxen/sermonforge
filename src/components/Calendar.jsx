import { useState, useEffect } from "react";
import { getAllSermons } from "../core/spine";
import { SERMON_STATUS } from "../core/contracts";
import SecondaryButton from "./primitives/SecondaryButton";
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

  useEffect(() => {
    getAllSermons().then(setSermons).catch(console.error);
  }, []);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Build calendar grid (6 rows × 7 cols)
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const sermonsByDate = {};
  for (const s of sermons.filter((s) => s.stage !== SERMON_STATUS.Complete)) {
    if (!s.date) continue;
    const d = new Date(s.date + "T00:00:00");
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate();
      if (!sermonsByDate[day]) sermonsByDate[day] = [];
      sermonsByDate[day].push(s);
    }
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="page-title">Calendar</h1>
            <p className="page-subtitle">Sermon schedule</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SecondaryButton size="sm" onClick={prevMonth}>← Prev</SecondaryButton>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "18px", fontWeight: 600, minWidth: "180px", textAlign: "center" }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <SecondaryButton size="sm" onClick={nextMonth}>Next →</SecondaryButton>
          </div>
        </div>
      </div>

      <div className="page-body">
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
              >
                {day && (
                  <>
                    <div className="calendar-day-num">{day}</div>
                    {(sermonsByDate[day] || []).map((s) => (
                      <div
                        key={s.id}
                        className="calendar-event"
                        style={{ background: STAGE_COLORS[s.stage] || "var(--gold)" }}
                        onClick={() => onOpenSermon(s.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={buttonKeydown(() => onOpenSermon(s.id))}
                        title={s.title}
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
      </div>
    </>
  );
}
