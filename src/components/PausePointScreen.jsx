// PausePointScreen — discrete sub-phase boundary screen.
//
// Renders between sub-phases when `advanceSubPhase` succeeds. Two sections:
//
//   1. **What you just did** — shows the just-completed sub-phase's named
//      outcome via the existing AI-synthesized summary (summaries[p2/p3/p4]
//      for sub-phase boundaries; summaries[s2] for the Exegesis → MPT/MPS
//      step boundary). Same bullet shape as SummaryBlock.
//
//   2. **What's next** — static description of the upcoming work. For the
//      Phase 4 transition, this is where the three-voices conversation gets
//      framed (in lieu of a separate Phase 4 sub-phase intro).
//
// The pause-point is post-gate UI — it never blocks advancement. By the time
// it renders, `transitionState` has already accepted the spine move. Pastor
// clicks the Begin button → `onContinue` clears the pause-point → the new
// sub-phase / step renders normally.

import React from "react";

// "What's next" copy keyed by destination. Sub-phase numbers (2/3/4) for
// sub-phase boundaries; "step_2" for the Exegesis → MPT/MPS step boundary.
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

// Same bullet parser used by SummaryBlock — recognizes "-", "*", "•", "1.",
// "1)" line prefixes. Returns null when fewer than 2 bullets parse so the
// caller can fall back to plain-paragraph rendering.
function parseBullets(text) {
  if (!text) return null;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = [];
  for (const line of lines) {
    const m = line.match(/^[-*•]\s+(.+)$/) || line.match(/^\d+[.)]\s+(.+)$/);
    if (m) bullets.push(m[1].trim());
  }
  return bullets.length >= 2 ? bullets : null;
}

export default function PausePointScreen({
  priorSubPhase,
  nextKey,
  priorSummaryText,
  priorSummaryLoading,
  onContinue,
}) {
  const priorTitle = PRIOR_TITLES[priorSubPhase] || "Sub-phase complete";
  const next = NEXT_DESCRIPTIONS[nextKey] || { title: "What's next", body: "" };
  const buttonLabel = NEXT_BUTTON_LABELS[nextKey] || "Continue";
  const bullets = !priorSummaryLoading ? parseBullets(priorSummaryText) : null;

  return (
    <div className="pause-point-screen" data-testid="pause-point-screen">
      <div className="pause-point-header">
        <div className="pause-point-eyebrow">Pause</div>
        <h2 className="pause-point-title">{priorTitle}</h2>
      </div>

      <section className="pause-point-section">
        <div className="pause-point-section-label">What you just did</div>
        {priorSummaryLoading ? (
          <div className="pause-point-loading">
            Pulling together what you produced…
          </div>
        ) : bullets ? (
          <ul className="pause-point-bullets">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : priorSummaryText ? (
          <div className="pause-point-content">{priorSummaryText}</div>
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
