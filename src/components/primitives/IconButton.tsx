// IconButton — behavioral primitive for icon-only buttons.
//
// Surface Contract #2 governs primary/secondary CTAs; this primitive sits
// alongside as a non-CTA shape (modal close, drawer dismiss, copy, send,
// chevron nav) so the `sermonforge/no-raw-button` lint rule can drive to
// zero across the codebase without forcing dismiss-buttons through
// SecondaryButton.
//
// The primitive is intentionally behavioral, not visual: it imposes no
// canonical shape today, but it does enforce two contracts at the API:
//
// 1. `aria-label` is required (TypeScript). The × glyph and SVG icons are
//    not announced by screen readers; without an explicit label the button
//    is unreachable for assistive tech.
// 2. `type` defaults to `"button"`. Without this, browsers default to
//    `"submit"` inside a form, which causes accidental submissions.
//
// Visual styling flows through the `className` prop — the existing
// `.modal-close`, `.ai-drawer-close-btn`, `.inline-ai-dismiss`, etc.
// classes continue to drive appearance. A future pilot may collapse them
// into a single canonical icon-button shape; that's out of Pilot C.

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "aria-label"> {
  "aria-label": string;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

// forwardRef so modals (PassagePopup, drawers) can move focus to a close
// button on open.
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ type = "button", className, children, ...rest }, ref) {
    return (
      <button ref={ref} type={type} className={className} {...rest}>
        {children}
      </button>
    );
  },
);

export default IconButton;
