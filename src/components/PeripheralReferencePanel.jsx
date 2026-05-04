// PeripheralReferencePanel — SFDI sub-element (SPRD A2.4).
//
// A content-only panel that sits beside a heavy-lifting field's primary
// work surface. The panel's job is peripheral guidance — Field 4's three
// rules + quick outline tips, future fields' equivalents — not interaction.
//
// Behavioral contract:
//   - Always visible when the field is active. No collapse / disclose.
//   - Never animates. SermonForge has no motion system; the panel won't
//     introduce one.
//   - No internal scroll. If panel content exceeds the viewport, the
//     entire field's container scrolls, not the panel in isolation —
//     pastor never loses a piece of guidance behind a hidden scroll well.
//   - Content-only: no inputs, no buttons, no AI affordances. The reference
//     panel does not participate in the AI pipeline.
//   - Sized to ~28% of the field's horizontal layout (the primary surface
//     gets ~72%) when used inside a flex row at the field level. The panel
//     itself sets its flex basis; the parent provides the row.
//
// Genre-aware static guidance is permitted (Field 4's "For epistles" /
// "For narrative" sections); the field's *shape* doesn't change by genre,
// only the content inside the panel does. Future heavy-lifting fields with
// genre-uneven application should follow the same static-sectioned pattern
// rather than reaching for a mode-switch.
//
// A2.4 ships the layout primitive. Field-specific content (the three rules,
// quick outline tips, etc.) lives in the field-wiring layer in B1.

import React from "react";

export default function PeripheralReferencePanel({
  title,
  children,
  className = "",
}) {
  return (
    <aside
      className={`peripheral-reference-panel${className ? ` ${className}` : ""}`}
      role="complementary"
      data-testid="peripheral-reference-panel"
      aria-label={title || "Reference panel"}
    >
      {title && (
        <h3 className="peripheral-reference-panel-title">{title}</h3>
      )}
      <div className="peripheral-reference-panel-body">{children}</div>
    </aside>
  );
}
