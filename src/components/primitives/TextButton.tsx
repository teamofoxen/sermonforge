// TextButton — Surface Contract #2 ("one CTA system").
//
// The canonical tertiary text-link action shape. Wraps `.btn-text` —
// no background, no border, ink-ghost color, underline on hover.
// Same migration rules as `PrimaryButton` / `SecondaryButton`:
// structural, no visual redesign.
//
// Used for tertiary text-link actions: "guided tour" hint in the
// Dashboard hero, "Send feedback" in the sidebar footer, "How this
// works" links in the workspace + planner topbars, "Study Guide"
// in the planner topbar, and "Leave tour" in the tour overlay.
//
// `className` extends the canonical class — the dark-theme tour
// overlay site passes additional inline styling that way (no
// `theme="dark"` variant prop; Surface #2's "one shape" rule keeps
// the primitive simple and lets the rare dark surface override via
// className).

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonSize = "default" | "sm";

export interface TextButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

export function TextButton({
  size = "default",
  type = "button",
  className,
  children,
  ...rest
}: TextButtonProps) {
  const sizeClass = size === "sm" ? " btn-sm" : "";
  const extra = className ? ` ${className}` : "";
  const composed = `btn-text${sizeClass}${extra}`;
  return (
    <button type={type} className={composed} {...rest}>
      {children}
    </button>
  );
}

export default TextButton;
