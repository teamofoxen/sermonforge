// TextButton — Surface Contract #2 ("one CTA system").
//
// The canonical tertiary text-link action shape. Wraps `.btn-text` —
// no background, no border, ink-ghost color, underline on hover.
// Same migration rules as `PrimaryButton` / `SecondaryButton`:
// structural, no visual redesign.
//
// Used for tertiary text-link actions: "Send feedback…" and "Add or
// update ESV key…" in the sidebar footer, the map header's "Read
// again" doors, "How this works" in the planner topbar, and the
// notebook drawer's stage tabs.
//
// `className` extends the canonical class — a dark-surface site can
// override colors that way (no `theme="dark"` variant prop; Surface
// #2's "one shape" rule keeps the primitive simple).

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
