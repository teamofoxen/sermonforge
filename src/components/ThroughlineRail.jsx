// ThroughlineRail — vertical rail across the Study tab showing the four
// sub-phase exegetical arc with field nodes and named-outcome callouts.
//
// SPRD C2 (2026-05-04). Replaces the sub-phase tab row in StudyTab. Step
// navigation lives outside the rail — see StudyStepStrip in StudyTab.jsx —
// so the throughline is the rail's only job and travels parallel with field
// advancement.
//
// Props:
//   subPhases: [
//     { id, label, named_outcome, prompt,
//       fields: [{ key, label, state, preview }],
//       done: bool  // named-outcome threshold satisfied (evaluateAdvance.ok)
//     }
//   ]
//   activeSubPhaseId: string  // which sub-phase to expand with field labels
//   activeFieldKey:   string  // which field to mark "active" in the rail
//   onFieldClick:     (subPhaseId:string, fieldKey:string) => void  // optional
//
// Field state values: "empty" | "in-progress" | "current" | "complete" | "na".
// ("current" rather than "active" — the canonical-stage-name lint forbids
// raw "active" strings since it's a pre-Pilot-B sermon-status alias.)

import React, { useState } from "react";
import "./throughline.css";

function tooltipText(field) {
  if (field.state === "na") return "Marked not applicable";
  if (field.state === "empty") return "Not yet answered";
  if (field.state === "in-progress") return field.preview || "Some questions answered.";
  return field.preview || "—";
}

// Tooltip uses position: fixed (CSS) so x / y are viewport coordinates and
// the tooltip is unaffected by the rail's overflow-y scroll offset. Earlier
// code positioned it absolutely inside the scrolled rail, which made the
// tooltip drift away from the node by scrollTop pixels — descriptions
// appeared next to the wrong node (or off-screen entirely for nodes lower
// in the rail).
function Tooltip({ x, y, field }) {
  return (
    <div className="tl-tooltip" style={{ left: x, top: y }} role="tooltip">
      <div className="tl-tooltip-label">{field.label}</div>
      <div className="tl-tooltip-preview">{tooltipText(field)}</div>
    </div>
  );
}

function Node({ field, onEnter, onLeave, onClick, focusable }) {
  return (
    <div
      className={`tl-node tl-node-${field.state}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) {
          e.preventDefault();
          onClick(e);
        }
      }}
      role={focusable ? "button" : undefined}
      tabIndex={focusable ? 0 : undefined}
      aria-label={`${field.label}, ${field.state}`}
    >
      <div className="tl-node-dot" />
    </div>
  );
}

export default function ThroughlineRail({
  subPhases,
  activeSubPhaseId,
  onFieldClick,
}) {
  const [hover, setHover] = useState(null);

  return (
    <aside className="tl-rail" aria-label="Study throughline" data-tour-id="throughline-rail">
      <div className="tl-subphases">
        {subPhases.map((sp, spIdx) => {
          const isLast = spIdx === subPhases.length - 1;
          const isActive = sp.id === activeSubPhaseId;
          return (
            <React.Fragment key={sp.id}>
              <div className={`tl-segment ${isActive ? "is-active" : "is-collapsed"}`}>
                <div className="tl-header">
                  <div className="tl-header-num">{String(spIdx + 1).padStart(2, "0")}</div>
                  <div className="tl-header-label">{sp.label}</div>
                </div>

                {isActive && sp.prompt && (
                  <div className="tl-prompt">{sp.prompt}</div>
                )}

                <div className="tl-track">
                  <div className="tl-line" />
                  <div className="tl-nodes">
                    {sp.fields.map((field) => (
                      <div key={field.key} className="tl-row">
                        <Node
                          field={field}
                          focusable={isActive}
                          onClick={
                            onFieldClick
                              ? () => onFieldClick(sp.id, field.key)
                              : undefined
                          }
                          onEnter={(e) => {
                            const target = e.currentTarget;
                            if (!target) return;
                            const r = target.getBoundingClientRect();
                            // Viewport coordinates — tooltip is position:fixed.
                            setHover({
                              x: r.right,
                              y: r.top + r.height / 2,
                              field,
                            });
                          }}
                          onLeave={() => setHover(null)}
                        />
                        {isActive && (
                          <div
                            className={`tl-fieldlabel tl-fieldlabel-${field.state}`}
                            onClick={
                              onFieldClick
                                ? () => onFieldClick(sp.id, field.key)
                                : undefined
                            }
                            role={onFieldClick ? "button" : undefined}
                            tabIndex={onFieldClick ? 0 : undefined}
                            onKeyDown={(e) => {
                              if (
                                onFieldClick &&
                                (e.key === "Enter" || e.key === " ")
                              ) {
                                e.preventDefault();
                                onFieldClick(sp.id, field.key);
                              }
                            }}
                          >
                            {field.label}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`tl-callout ${sp.done ? "is-done" : "is-pending"}`}>
                  <div className="tl-callout-tick" />
                  <div className="tl-callout-text">
                    {sp.done ? (
                      sp.named_outcome
                    ) : (
                      <>
                        <div className="tl-callout-name">{sp.named_outcome}</div>
                        <div className="tl-callout-pending">(pending)</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {!isLast && (
                <div className="tl-boundary" aria-hidden="true">
                  <div className="tl-boundary-tick" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {hover && <Tooltip x={hover.x} y={hover.y} field={hover.field} />}
    </aside>
  );
}
