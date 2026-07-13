import { SERMON_STATUS, LOADING_VERB } from "../core/contracts";
import { useModalA11y } from "../utils/useModalA11y";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import { TextButton } from "./primitives/TextButton";
import "./sermonFinish.css";

// SermonFinish — the sermon-completion threshold (CORE Process #3).
//
// The end of the walk is the biggest threshold there is: the work is done (or
// nearly), and the deliverable has to leave the app. Since the OEM walk
// (2026-07-02, agenda item 1) the screen opens with the BEHOLDING MOMENT —
// the Christ-Connection Statement and MPS rendered back, read-only, under
// Goldsworthy's question completed by the pastor's affections layer: did this
// sermon testify to Christ, and does it show him to be better? Completion is
// the means of the screen, not its point — the tool's last word is "behold,"
// not "done." Then the Saturday-night answer: deriveSermonCompleteness (the
// six CORE composites plus the ratified-lenient Outline/Body/Manuscript
// checks), and the two actions that belong to the moment: Export to Word
// (carrying the "pray yourself hot" send-off at the manuscript-to-pulpit
// seam), and Mark as preached.
//
// Deliberately NOT one-shot: it opens from the "Finish sermon →" button (and
// can be reopened forever), holds no thresholds_seen state, and never blocks —
// every incomplete artifact is an invitation with a "go write it" jump, not a
// wall (Process #1). The beholding moment is a return, never a gate: no
// input, nothing to check off (the mechanization trap refused).

export default function SermonFinish({
  completeness,
  beholding,
  status,
  onJump,
  onExport,
  exporting,
  exportNote,
  onMarkPreached,
  onClose,
}) {
  // The house dialog pattern (Session 6): focus enters the overlay, Tab is
  // trapped inside it (the obscured writing surface is unreachable), Escape
  // closes, focus restores to the summoning "Finish sermon →" control.
  const dialogRef = useModalA11y(onClose);

  const artifacts = completeness?.artifacts ?? [];
  const allComplete = completeness?.allComplete === true;
  const missing = artifacts.filter((a) => !a.complete);
  const preached = status === SERMON_STATUS.Complete;

  const frame = allComplete
    ? "Every part of the walk is written. The sermon is ready."
    : missing.length === 1
      ? "One thing is still open — everything else is written."
      : `Here is where the sermon stands — ${missing.length} parts are still open.`;

  return (
    <div className="sfin-overlay" role="dialog" aria-modal="true" aria-label="Finish sermon" ref={dialogRef}>
      <article className="sfin-card">
        {(beholding?.ccs || beholding?.mps) && (
          <section className="sfin-beholding">
            <p className="sfin-beholding-question">
              Did this sermon testify to Christ — and does it show him to be
              better? Read your Statement once more. This is what your people
              should walk away beholding.
            </p>
            {beholding?.ccs && (
              <p className="sfin-beholding-text">{beholding.ccs}</p>
            )}
            {beholding?.mps && (
              <p className="sfin-beholding-text sfin-beholding-mps">{beholding.mps}</p>
            )}
          </section>
        )}

        <p className="sfin-frame">{frame}</p>

        <h2 className="sfin-section-label">The work of the walk</h2>
        <div className="sfin-artifacts">
          {artifacts.map((a) => (
            <article key={a.key} className={"sfin-artifact" + (a.complete ? " is-written" : "")}>
              <h3 className="sfin-artifact-label">{a.label}</h3>
              {a.complete ? (
                <p className="sfin-artifact-state">written</p>
              ) : (
                <>
                  <p className="sfin-artifact-reason">{a.reason}</p>
                  <TextButton
                    size="sm"
                    className="sfin-artifact-write"
                    onClick={() => onJump?.(a.jump)}
                  >
                    go write it
                  </TextButton>
                </>
              )}
            </article>
          ))}
        </div>

        <div className="sfin-actions">
          <PrimaryButton onClick={onExport} disabled={!!exporting}>
            {exporting ? LOADING_VERB.Exporting : "Export to Word"}
          </PrimaryButton>
          {preached ? (
            <span className="sfin-preached-note">
              Preached — this sermon lives under Preached Sermons.
            </span>
          ) : (
            <SecondaryButton onClick={onMarkPreached}>
              Mark as preached
            </SecondaryButton>
          )}
        </div>
        {exportNote && <p className="sfin-export-note">{exportNote}</p>}
        <p className="sfin-sendoff">
          The page is ready when it&apos;s written. The preacher is ready when
          he&apos;s prayed — so pray yourself hot.
        </p>

        <TextButton
          className="sfin-dismiss"
          onClick={onClose}
          aria-label="Close"
        >
          Back to the sermon
        </TextButton>
      </article>
    </div>
  );
}
