import { useEffect } from "react";
import { SERMON_STATUS, LOADING_VERB } from "../core/contracts";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import { TextButton } from "./primitives/TextButton";
import "./sermonFinish.css";

// SermonFinish — the sermon-completion threshold (CORE Process #3).
//
// The end of the walk is the biggest threshold there is: the work is done (or
// nearly), and the deliverable has to leave the app. This screen answers the
// Saturday-night question — "is this sermon done?" — by rendering
// deriveSermonCompleteness (the eight CORE composites plus the lenient
// Outline/Body/Manuscript presence checks), and carries the two actions that
// belong to the moment: Export to Word, and Mark as preached.
//
// Deliberately NOT one-shot: it opens from the "Finish sermon →" button (and
// can be reopened forever), holds no thresholds_seen state, and never blocks —
// every incomplete artifact is an invitation with a "go write it" jump, not a
// wall (Process #1).

export default function SermonFinish({
  completeness,
  status,
  onJump,
  onExport,
  exporting,
  exportNote,
  onMarkPreached,
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div className="sfin-overlay" role="dialog" aria-label="Finish sermon">
      <article className="sfin-card">
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
