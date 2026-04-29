import { useState } from "react";
import { findEventForDate } from "../datasets/churchHistory";

export default function DashboardChurchHistory() {
  // Compute once on mount — date won't change during a session.
  const [event] = useState(() => findEventForDate(new Date()));

  if (!event) return null;

  const isFeast = !event.year;
  const yearsAgo = isFeast ? null : new Date().getFullYear() - event.year;

  return (
    <div className="dash-history">
      <div className="history-eyebrow">
        <span className="rule" />
        <span>This Day in Church History</span>
        <span className="rule" />
      </div>

      <div className="history-body">
        <div className="history-date">
          <span className="day">{event.label}</span>
          {!isFeast && (
            <>
              <span className="dot" />
              <span className="year">{event.year}</span>
              <span className="ago">{yearsAgo} years ago</span>
            </>
          )}
        </div>
        <p className="history-event">{event.event}</p>
        {event.offset > 0 && (
          <p className="history-note">
            Nothing recorded for today — the nearest preceding date is shown.
          </p>
        )}
      </div>
    </div>
  );
}
