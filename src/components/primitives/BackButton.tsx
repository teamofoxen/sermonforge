// BackButton — Surface Contract #5 ("one re-entry convention").
//
// From docs/CORE.md: "Back is back. Labeled, consistent, predictable from
// any surface."
//
// Before Pilot E, the codebase had at least four distinct "back" shapes:
//   - <button>← Back</button>                   (modal/page error case)
//   - <button>← Return to Study</button>        (workspace cross-tab)
//   - chevron icon button (no label)            (workspace topbar)
//   - breadcrumb link, no chevron               (e.g. "<series_title>")
// plus surfaces with no back affordance at all.
//
// This primitive collapses the first three to a single canonical shape.
// Breadcrumb-style navigation (e.g. clicking the series title to return
// to the planner) is a separate pattern and intentionally NOT wrapped
// here — those are link affordances, not back-buttons.
//
// API:
//   <BackButton onClick={...} />                      → "← Back"
//   <BackButton onClick={...}>Return to Study</BackButton>  → "← Return to Study"
//   <BackButton variant="icon" onClick={...} />       → chevron icon only
//
// The leading "← " is provided by the primitive; consumers do not include
// it in `children`. This is the "one spelling, everywhere" enforcement
// mechanism for back-navigation copy.

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import SecondaryButton from "./SecondaryButton";
import IconButton from "./IconButton";

type BackButtonVariant = "labeled" | "icon";
type BackButtonSize = "default" | "sm";

export interface BackButtonProps {
  onClick: (e?: MouseEvent<HTMLButtonElement>) => void;
  variant?: BackButtonVariant;
  size?: BackButtonSize;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  title?: string;
  disabled?: boolean;
}

export function BackButton({
  onClick,
  variant = "labeled",
  size = "default",
  children,
  className,
  style,
  title,
  disabled,
}: BackButtonProps) {
  if (variant === "icon") {
    return (
      <IconButton
        aria-label={title ?? "Back"}
        onClick={onClick}
        className={className}
        style={style}
        title={title ?? "Back"}
        disabled={disabled}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </IconButton>
    );
  }
  return (
    <SecondaryButton
      size={size}
      onClick={onClick}
      className={className}
      style={style}
      title={title}
      disabled={disabled}
    >
      ← {children ?? "Back"}
    </SecondaryButton>
  );
}

export default BackButton;
