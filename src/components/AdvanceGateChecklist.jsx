// AdvanceGateChecklist — disabled-Continue UX (SPRD A1.2 / B1.6).
//
// `evaluateAdvance` returns `{ ok, reason, gates? }`. When the source
// position is empty or only one gate is in play, the checklist falls back
// to the legacy single-line hint (data-testid="advance-hint") so the
// existing contract tests + UX continue to work. When multiple gates exist
// (Field 3 + Field 7 + Field 8 at the Observe → Interpret boundary today;
// the same shape will extend to other boundaries as B2/B3/B4 wire their
// thresholds), the component renders a structured checklist with ✓ / ✗
// per gate plus the gate's pastor-facing sub-reason for each unmet gate.
//
// SFDI walked this affordance as "a hover-checklist on the disabled
// button"; the inline rendering is the discoverable form (the button's
// `title` attribute carries the same `firstReason` for native tooltip on
// hover, so both the hovering and the looking pastor see what's missing).

import React from "react";

export default function AdvanceGateChecklist({ sufficiency }) {
  if (!sufficiency || sufficiency.ok) return null;
  const gates = Array.isArray(sufficiency.gates) ? sufficiency.gates : [];

  // Single-gate or no-gate path → preserve the legacy single-line hint
  // shape (back-compat with process-2-evidence-gated-ux's advance-hint
  // assertion + the overall pastor-facing UX for empty-evidence trips).
  if (gates.length <= 1) {
    return (
      <div data-testid="advance-hint" className="advance-hint">
        {sufficiency.reason}
      </div>
    );
  }

  return (
    <ul
      data-testid="advance-gate-checklist"
      className="advance-gate-checklist"
      aria-label="What's needed to advance"
    >
      {gates.map((gate) => (
        <li
          key={gate.key}
          className={`advance-gate-item${gate.met ? " advance-gate-item-met" : " advance-gate-item-unmet"}`}
          data-gate-key={gate.key}
          data-gate-met={gate.met ? "true" : "false"}
        >
          <span className="advance-gate-marker" aria-hidden="true">
            {gate.met ? "✓" : "✗"}
          </span>
          <span className="advance-gate-label">{gate.label}</span>
          {!gate.met && gate.reason && (
            <span className="advance-gate-reason"> — {gate.reason}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
