// PausePointScreen — discrete sub-phase boundary screen.
//
// Renders between sub-phases when `advanceSubPhase` succeeds. Two sections:
//
//   1. **What you just did** — a synthesis question the pastor answers in one
//      sentence. Their answer is the named outcome for the sub-phase (Observation
//      Set / Interpretation Set / Christ-Connection / Implications Synthesis).
//      Persists through the standard onUpdate pipeline via the `_synthesis` key.
//
//   2. **What's next** — static description of the upcoming work.
//
// The pause-point is post-gate UI — it never blocks advancement. By the time
// it renders, `transitionState` has already accepted the spine move. Pastor
// clicks the Begin button → `onContinue` clears the pause-point → the new
// sub-phase / step renders normally.

import React from "react";

const SYNTHESIS_QUESTIONS = {
  1: "In one sentence, what does the text say?",
  2: "In one sentence, what does the text mean?",
  3: "In one sentence, where is Christ in this text?",
  4: "In one sentence, how does this text land on your people?",
};

// "What's next" copy keyed by destination.
const NEXT_DESCRIPTIONS = {
  2: {
    title: "What's next: Interpret",
    body:
      "You'll move from observation to meaning. What does the text MEAN? Widen the lens, dissect what recurs, trace character motives, surface contrasts, open the wider canon, check the commentaries last, and synthesize the Interpretation Set.",
  },
  3: {
    title: "What's next: Redemptive Thread",
    body:
      "Now connect the passage to Christ. Position the text, trace how it points to him, ground the gospel's enabling power, name human need with God's character, and synthesize the Christ-Connection Statement.",
  },
  4: {
    title: "What's next: Implications — the three-voice conversation",
    body:
      "Three voices: what the text TEACHES (Theological Significance), what the text ASKS of the hearer (Personal Implications), and the SPECIFIC ROOM the text is landing in (Pastoral Context). Each voice gets its own field; the Implications Synthesis weaves them together in your own voice. Doctrine grounds the personal call; the personal call grounds the room-specific landing.",
  },
  step_2: {
    title: "What's next: MPT and MPS",
    body:
      "Now forge the main point. The MPT names what the text was saying to its original audience (past tense). The MPS turns that into present/future tense, aimed at your people. The Implications Synthesis is your foundation — MPT and MPS open against it, not against raw worksheet content.",
  },
};

const PRIOR_TITLES = {
  1: "Observe complete",
  2: "Interpret complete",
  3: "Redemptive Thread complete",
  4: "Implications complete",
};

const NEXT_BUTTON_LABELS = {
  2: "Begin Interpret",
  3: "Begin Redemptive Thread",
  4: "Begin Implications",
  step_2: "Begin MPT and MPS",
};

export default function PausePointScreen({
  priorSubPhase,
  nextKey,
  synthesisValue,
  onSynthesisChange,
  onContinue,
}) {
  const priorTitle = PRIOR_TITLES[priorSubPhase] || "Sub-phase complete";
  const next = NEXT_DESCRIPTIONS[nextKey] || { title: "What's next", body: "" };
  const buttonLabel = NEXT_BUTTON_LABELS[nextKey] || "Continue";
  const synthQuestion = SYNTHESIS_QUESTIONS[priorSubPhase];

  return (
    <div className="pause-point-screen" data-testid="pause-point-screen">
      <div className="pause-point-header">
        <div className="pause-point-eyebrow">Pause</div>
        <h2 className="pause-point-title">{priorTitle}</h2>
      </div>

      <section className="pause-point-section">
        <div className="pause-point-section-label">What you just did</div>
        {synthQuestion ? (
          <>
            <p className="pause-point-content" style={{ marginBottom: "10px" }}>
              {synthQuestion}
            </p>
            <textarea
              className="field-textarea"
              value={synthesisValue || ""}
              onChange={(e) => onSynthesisChange?.(e.target.value)}
              placeholder="One sentence."
              rows={2}
              style={{
                width: "100%",
                fontSize: "14px",
                lineHeight: "1.6",
                fontFamily: "var(--font-serif)",
                resize: "vertical",
              }}
            />
          </>
        ) : (
          <div className="pause-point-content pause-point-content-empty">
            Your work in this sub-phase is complete.
          </div>
        )}
      </section>

      <section className="pause-point-section">
        <div className="pause-point-section-label">{next.title}</div>
        <p className="pause-point-content">{next.body}</p>
      </section>

      <div className="pause-point-footer">
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button
          type="button"
          className="pause-point-continue"
          onClick={onContinue}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
