import { useEffect } from "react";
import { arcSummary } from "../utils/walkOrder";
import "./sermonStartLanding.css";

// Format a list of named outcomes into a single line attached to the stage.
// "the X" / "the X and the Y" / "the X, Y, ..., and W". Repeats "the" in the
// 2-item case (English reads "the X and Y" as a compound, "the X and the Y"
// as two named things); drops the repeat in 3+ where Oxford-comma spacing
// already does the parallelism work.
function joinOutcomes(outcomes) {
  if (outcomes.length === 0) return "";
  if (outcomes.length === 1) return `the ${outcomes[0]}`;
  if (outcomes.length === 2) return `the ${outcomes[0]} and the ${outcomes[1]}`;
  const head = outcomes.slice(0, -1).join(", ");
  const tail = outcomes[outcomes.length - 1];
  return `the ${head}, and ${tail}`;
}

export default function SermonStartLanding({ onBegin }) {
  const arc = arcSummary();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === "Escape") onBegin?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBegin]);

  return (
    <div className="ssl-overlay" role="dialog" aria-label="Sermon start">
      <article className="ssl-card">
        <p className="ssl-opener">What you're about to walk through.</p>
        {arc.map((stage) => {
          const outcomes = stage.regions
            .map((r) => r.namedOutcome)
            .filter(Boolean);
          return (
            <section key={stage.stage} className="ssl-stage">
              <h2 className="ssl-stage-label">{stage.stage}</h2>
              <ul className="ssl-region-list">
                {stage.regions.map((r) => (
                  <li key={r.subPhase} className="ssl-region">
                    {r.label}
                  </li>
                ))}
              </ul>
              {outcomes.length > 0 && (
                <p className="ssl-outcomes">
                  — produces {joinOutcomes(outcomes)}
                </p>
              )}
            </section>
          );
        })}
        <button
          type="button"
          className="ssl-dismiss"
          onClick={onBegin}
          aria-label="Close"
        >
          Close
        </button>
      </article>
    </div>
  );
}
