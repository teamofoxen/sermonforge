import { useRef, useCallback } from "react";
import { useEsvPassage } from "../utils/useEsvPassage";
import { usePassageRecovery } from "./EsvRecovery";
import { useModalA11y } from "../utils/useModalA11y";
import IconButton from "./primitives/IconButton";
import "./studyAnchorHandoff.css";

// The Study → Anchor handoff is the heaviest threshold the spec carves out.
// Study sub-phases close; sermon-shaping begins. The screen surfaces:
//   - the four Study named outcomes (so the substrate for Anchor is visible)
//   - any Study questions left unanswered (the completeness contract made
//     visible at the threshold — informational, not enforcing; the preacher
//     may still proceed)
//
// A missing required outcome is named in prose in the outcomes-section intro
// and carries an inline "go write it" jump on its card. The weight comes
// from being named, not from chrome — no badge, no warning color.
//
// Read it, close it, the first Anchor field appears beneath.

const COUNT_WORD = { 0: "None", 1: "One", 2: "Two", 3: "Three", 4: "Four" };

function joinMissingLabels(missing) {
  if (missing.length === 1) return `The ${missing[0].label}`;
  if (missing.length === 2) return `The ${missing[0].label} and the ${missing[1].label}`;
  const head = missing.slice(0, -1).map((m) => m.label).join(", ");
  const tail = missing[missing.length - 1].label;
  return `The ${head}, and the ${tail}`;
}

function buildOutcomesIntro(outcomes) {
  const filled = outcomes.filter((o) => o.text);
  const missing = outcomes.filter((o) => !o.text);
  if (missing.length === 0) return null;
  if (filled.length === 0) {
    return "None of the four are written yet — Anchor opens against all four.";
  }
  const filledWord = COUNT_WORD[filled.length] ?? String(filled.length);
  const verb = filled.length === 1 ? "is" : "are";
  const missingVerb = missing.length === 1 ? "isn't" : "aren't";
  return `${filledWord} of the four ${verb} written. ${joinMissingLabels(missing)} ${missingVerb} yet — Anchor opens against all four.`;
}

export default function StudyAnchorHandoff({ passage, outcomes, unfinished, onJump, onClose }) {
  const outcomesIntro = buildOutcomesIntro(outcomes);
  // The passage rides onto the handoff itself (2026-06-10 saturation ruling):
  // before forging the Main Point, the last thing the pastor sees is the text,
  // not just his own summaries. Shares the cached ESV fetch with the pane/popup.
  const { data: passageData, loading: passageLoading, refresh: refreshPassage } = useEsvPassage(passage || "");
  // Shared with PassagePopup/ReferencePane — see EsvRecovery.jsx.
  const { esvState: passageState, fetchErrorNode, recoveryNode, keyModalNode, keyModalOpen } = usePassageRecovery(passageData, refreshPassage);
  // The house dialog pattern (Session 6): focus enters the overlay, Tab is
  // trapped inside it (no background keyboard reach), Escape dismisses, and
  // focus restores to the invoking control on close. Escape stays guarded
  // while the nested ESV-key modal is open — one Escape must not close both
  // layers and, on a first visit, silently consume the threshold. The guard
  // reads a ref so the hook's callback identity stays stable across the
  // nested modal's open/close (no focus churn). Enter is deliberately still
  // unhandled at the window level: a focused button activates on Enter by
  // itself, and a stray window-level Enter could consume the "read it once
  // more" threshold before it's been read.
  const keyModalOpenRef = useRef(keyModalOpen);
  keyModalOpenRef.current = keyModalOpen;
  const escClose = useCallback(() => {
    if (!keyModalOpenRef.current) onClose?.();
  }, [onClose]);
  const dialogRef = useModalA11y(escClose);

  return (
    <div className="sah-overlay" role="dialog" aria-modal="true" aria-label="Study to Anchor handoff" ref={dialogRef}>
      <article className="sah-card">
        <p className="sah-frame">Anchor opens, against your Study work.</p>

        <section className="sah-marinate">
          <h2 className="sah-section-label">Before you forge — read it once more</h2>
          <p className="sah-marinate-note">
            Step back and read the passage through again, slowly, the way you
            read it at the start. Let it sit on you. The Main Point you're about
            to forge should rise from the text, not only from your notes.
          </p>
          {!passage && (
            <p className="sah-passage-note">
              This sermon doesn&apos;t have a passage set.
            </p>
          )}
          {passage && passageLoading && (
            <p className="sah-passage-loading">Loading the passage</p>
          )}
          {passage && !passageLoading && passageData?.fetchError && fetchErrorNode}
          {passage && !passageLoading && !passageData?.fetchError && (
            passageState === "ok" ? (
              passageData?.esv ? (
                <>
                  <p className="sah-passage-text">{passageData.esv}</p>
                  <p className="sah-passage-copyright">
                    ESV® Bible © 2001 by Crossway. Used by permission.
                  </p>
                </>
              ) : (
                <p className="sah-passage-note">
                  The ESV didn't return anything for this reference — check the
                  book name and verse numbers.
                </p>
              )
            ) : recoveryNode
          )}
          {keyModalNode}
        </section>

        <h2 className="sah-section-label">What you produced in Study</h2>
        {outcomesIntro && (
          <p className="sah-outcomes-intro">{outcomesIntro}</p>
        )}
        <div className="sah-outcomes">
          {outcomes.map((o) => (
            <article key={o.fieldKey} className="sah-outcome">
              <h3 className="sah-outcome-label">{o.label}</h3>
              {o.text ? (
                <p className="sah-outcome-text">{o.text}</p>
              ) : (
                <>
                  <p className="sah-outcome-empty">not yet written</p>
                  <IconButton
                    type="button"
                    className="sah-outcome-write"
                    aria-label="go write it"
                    onClick={() =>
                      onJump?.({
                        stage: o.stage,
                        subPhase: o.subPhase,
                        fieldKey: o.fieldKey,
                      })
                    }
                  >
                    go write it
                  </IconButton>
                </>
              )}
            </article>
          ))}
        </div>

        {unfinished.length > 0 && (
          <>
            <h2 className="sah-section-label">Left behind in Study</h2>
            <ul className="sah-unfinished-list">
              {unfinished.map((q) => (
                <li
                  key={`${q.fieldKey}/${q.questionKey}`}
                  className="sah-unfinished"
                >
                  {/* Short label, not the full prompt (de-walling ruling,
                      2026-07-02) — the jump lands on the prompt itself. */}
                  <IconButton
                    type="button"
                    className="sah-unfinished-btn"
                    aria-label={q.questionLabel}
                    onClick={() =>
                      onJump?.({
                        stage: q.stage,
                        subPhase: q.subPhase,
                        fieldKey: q.fieldKey,
                      })
                    }
                  >
                    <span className="sah-unfinished-field">{q.fieldLabel}</span>
                    <span className="sah-unfinished-prompt">
                      {q.questionLabel}
                    </span>
                  </IconButton>
                </li>
              ))}
            </ul>
          </>
        )}

        <IconButton
          type="button"
          className="sah-dismiss"
          onClick={onClose}
          aria-label="Close"
        >
          Close
        </IconButton>
      </article>
    </div>
  );
}
