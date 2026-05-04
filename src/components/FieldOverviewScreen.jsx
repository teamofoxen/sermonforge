// FieldOverviewScreen — SFDI sub-element (SPRD A2.5).
//
// Heavy-lifting fields whose framing is theologically substantive enough
// that the pastor needs the framing established before the questions begin
// open with this overview screen. The screen names what the field is for,
// why it matters for the sermon, and what work the pastor is about to do.
// After reading, the pastor clicks Begin and the questions open.
//
// Field 4 (Divisions / Thought Units) walks the precedent:
//   ## Divisions / Thought Units
//   *Field 4 of 9 · Observe*
//   The point of the sermon is the point of the text. ...
//   You're not building an outline. ...
//   Three parts:
//     1. Lay the passage out so the structure shows.
//     2. Rewrite each main sentence in your own words.
//     3. Find the thought units that anchor the passage.
//   [ Begin ]
//
// The "first entry only / skip on re-entry" tracking is the parent's job
// (StudyTab knows whether a given field has been visited for the current
// sermon). This component is the rendering primitive — given a title,
// subtitle, body content, and a Begin handler, it renders the screen.
// Field-specific content (the body paragraphs and the three-parts list)
// lives in the field-wiring layer in B1.
//
// Not every field gets an overview. Most fields' framing lives in their
// question heading and the SFDI seven-slot entry. Reserve the overview
// for fields where the framing has to land before the work makes sense
// (spine-finders, synthesis fields, named-outcome fields).

import React, { useEffect, useRef } from "react";

export default function FieldOverviewScreen({
  title,
  subtitle,
  children,
  onBegin,
  beginLabel = "Begin",
  className = "",
}) {
  const beginBtnRef = useRef(null);

  // Focus the Begin button on mount so the pastor can press Enter to
  // proceed after reading. Mirrors A1.1's spotlight focus posture.
  useEffect(() => {
    if (beginBtnRef.current) beginBtnRef.current.focus();
  }, []);

  return (
    <section
      className={`field-overview-screen${className ? ` ${className}` : ""}`}
      data-testid="field-overview-screen"
      role="region"
      aria-label={title || "Field overview"}
    >
      <header className="field-overview-screen-header">
        {title && (
          <h1 className="field-overview-screen-title">{title}</h1>
        )}
        {subtitle && (
          <p className="field-overview-screen-subtitle">{subtitle}</p>
        )}
      </header>
      <div className="field-overview-screen-body">{children}</div>
      <div className="field-overview-screen-controls">
        <button
          ref={beginBtnRef}
          type="button"
          className="field-overview-screen-begin"
          onClick={onBegin}
        >
          {beginLabel}
        </button>
      </div>
    </section>
  );
}
