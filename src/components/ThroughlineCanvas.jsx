// ThroughlineCanvas — new visualization layer for sub-phase throughline state.
//
// Per Q1 ruling: this is a parallel layer alongside ThroughlineRail; the rail
// is not modified. The canvas surfaces the canonical thought-units array
// (observations.divisions.thought_units) at each sub-phase's level of
// completion. Cumulative columns:
//
//   Phase 1 (Observe)        — base columns only (thought_unit_summary)
//   Phase 2 (Interpret)      — + meaning
//   Phase 3 (Redemptive)     — + christ_connection
//   Phase 4 (Implications)   — + implication
//
// Architecture (Session 9 — animated):
//
//   - All sub-phases 1..displayedSubPhase render as siblings in a flex row.
//     Each is a single `ThroughlineCard` wrapper whose `data-mode` attribute
//     drives CSS width transitions ("strip" = 36px collapsed, "pane" = full).
//   - Cards persist across mode changes — when the active sub-phase advances,
//     the prior pane's wrapper element doesn't unmount; it just transitions
//     `data-mode` from "pane" to "strip" and CSS animates the width shrink.
//   - Newly-mounted pane cards (the advancing sub-phase) get a fade-in via
//     `animation: throughline-pane-enter`.
//   - Strip-click peek expands a side panel with a slide-in animation.
//
// Pause-point coordination: `displayedSubPhase` is decoupled from
// `activeSubPhase` — when a pause-point is up, the canvas continues to show
// the prior sub-phase's view. Clicking Begin clears the pause-point and the
// canvas animates to the new state. The decoupling is owned by StudyTab,
// which derives `displayedSubPhase` and passes it as `activeSubPhase` here.

import React, { useState } from "react";
import { parseStructuredField } from "../utils/studyFields";

const SUB_PHASE_LABELS = ["Observe", "Interpret", "Redemptive", "Implications"];

// Which cumulative columns (beyond the base) to render at each sub-phase.
const EXTRA_COLUMNS_BY_SUB_PHASE = {
  1: [],
  2: ["meaning"],
  3: ["meaning", "christ_connection"],
  4: ["meaning", "christ_connection", "implication"],
};

const COLUMN_LABELS = {
  meaning: "Meaning",
  christ_connection: "Christ-Connection",
  implication: "Implication",
};

function PaneContent({ subPhase, thoughtUnits, extraColumns }) {
  return (
    <>
      <div className="throughline-pane-header">
        <div className="throughline-pane-eyebrow">Throughline</div>
        <div className="throughline-pane-title">{SUB_PHASE_LABELS[subPhase - 1]}</div>
      </div>
      {!thoughtUnits || thoughtUnits.length === 0 ? (
        <div className="throughline-pane-empty">No thought units yet.</div>
      ) : (
        <ul className="throughline-pane-units">
          {thoughtUnits.map((unit, i) => (
            <li key={unit._canvas_row_id || i} className="throughline-pane-unit">
              <div className="throughline-unit-summary">
                {unit.thought_unit_summary || (
                  <span className="throughline-unit-empty">(unnamed unit)</span>
                )}
              </div>
              {extraColumns.map((colKey) => {
                const value = unit[colKey];
                if (!value || !value.trim()) return null;
                return (
                  <div
                    key={colKey}
                    className={`throughline-unit-col throughline-unit-${colKey}`}
                  >
                    <span className="throughline-unit-col-label">
                      {COLUMN_LABELS[colKey]}:
                    </span>{" "}
                    {value}
                  </div>
                );
              })}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ThroughlineCard({ subPhase, mode, peeked, onTogglePeek, thoughtUnits }) {
  const label = SUB_PHASE_LABELS[subPhase - 1];
  const extraColumns = EXTRA_COLUMNS_BY_SUB_PHASE[subPhase] || [];

  return (
    <div
      className={`throughline-card${peeked ? " throughline-card-peeked" : ""}`}
      data-mode={mode}
      data-sub-phase={subPhase}
    >
      {mode === "strip" ? (
        <button
          type="button"
          className="throughline-card-spine"
          onClick={onTogglePeek}
          aria-expanded={peeked}
          aria-label={`${peeked ? "Collapse" : "Peek at"} ${label} throughline`}
          title={`${peeked ? "Collapse" : "Peek at"} ${label}`}
        >
          <span className="throughline-card-label-vertical">{label}</span>
        </button>
      ) : (
        <div className="throughline-card-pane-content">
          <PaneContent
            subPhase={subPhase}
            thoughtUnits={thoughtUnits}
            extraColumns={extraColumns}
          />
        </div>
      )}
      {mode === "strip" && peeked && (
        <div className="throughline-card-peek">
          <PaneContent
            subPhase={subPhase}
            thoughtUnits={thoughtUnits}
            extraColumns={extraColumns}
          />
        </div>
      )}
    </div>
  );
}

export default function ThroughlineCanvas({ sermon, activeSubPhase }) {
  const [peekedSubPhase, setPeekedSubPhase] = useState(null);

  if (activeSubPhase < 1 || activeSubPhase > 4) return null;

  const obs = parseStructuredField(sermon?.observations) || {};
  const thoughtUnits = obs?.divisions?.thought_units?.value || [];

  // Render cards 1..activeSubPhase. Mode = "pane" for the active one, "strip"
  // for the rest. Wrapper persists across mode changes so CSS transitions
  // can animate the width.
  const cards = [];
  for (let sp = 1; sp <= activeSubPhase; sp++) {
    const mode = sp === activeSubPhase ? "pane" : "strip";
    cards.push(
      <ThroughlineCard
        key={sp}
        subPhase={sp}
        mode={mode}
        peeked={peekedSubPhase === sp && mode === "strip"}
        onTogglePeek={() =>
          setPeekedSubPhase((prev) => (prev === sp ? null : sp))
        }
        thoughtUnits={thoughtUnits}
      />
    );
  }

  return (
    <aside className="throughline-canvas" data-active-sub-phase={activeSubPhase}>
      {cards}
    </aside>
  );
}
