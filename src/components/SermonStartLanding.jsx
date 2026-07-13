import { arcSummary } from "../utils/walkOrder";
import { useModalA11y } from "../utils/useModalA11y";
import PrimaryButton from "./primitives/PrimaryButton";
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

// FLAGGED FOR PASTOR VOICE (UX overhaul T9, 2026-06-10): the body copy below
// — the opener, the three-controls block, and the read-again line — is a
// working draft. The pastor rewrites it in his own voice before the beta
// cohort reads it; the structure (arc → controls → Begin) is settled.
export default function SermonStartLanding({ onBegin }) {
  const arc = arcSummary();

  // The house dialog pattern (Session 6): focus moves INTO the overlay on
  // open (the Begin button — the one focusable), Tab is trapped inside it so
  // keyboard focus can't reach the obscured writing surface, Escape dismisses
  // (the deliberate "get me out" gesture, same as before), and focus restores
  // to the invoking control on close. Enter is deliberately still unhandled
  // at the window level: the focused PrimaryButton activates on Enter by
  // itself, and a window-level Enter would let a stray keypress consume the
  // threshold before the pastor has read it.
  const dialogRef = useModalA11y(onBegin);

  return (
    <div className="ssl-overlay" role="dialog" aria-modal="true" aria-label="Sermon start" ref={dialogRef}>
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
        <div className="ssl-nav-note">
          <p className="ssl-nav-note-intro">Three controls carry you the whole way:</p>
          <ul className="ssl-nav-note-list">
            <li><strong>Next</strong> — one field at a time, in order. Each field is a small set of related questions.</li>
            <li><strong>Back</strong> — return to what you just wrote.</li>
            <li><strong>Map</strong> — every question at once. Click any of them to go there.</li>
          </ul>
          <p className="ssl-nav-note-reread">
            You can read this page again whenever you want — open the Map and
            look at the top.
          </p>
        </div>
        <PrimaryButton className="ssl-begin" onClick={onBegin}>
          Begin →
        </PrimaryButton>
      </article>
    </div>
  );
}
