// SecondaryButton — Surface Contract #2 ("one CTA system").
//
// The canonical secondary action shape: ghost outline. Wraps the existing
// `.btn-ghost` class. Same migration rules as `PrimaryButton`: structural,
// no visual redesign in Pilot C.
//
// Used for Cancel, Back, Dismiss, Retry, prev/next month nav, and any
// non-primary action that isn't an icon-only dismiss (which uses
// `IconButton` instead).

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonSize = "default" | "sm";

export interface SecondaryButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

export function SecondaryButton({
  size = "default",
  type = "button",
  className,
  children,
  ...rest
}: SecondaryButtonProps) {
  const sizeClass = size === "sm" ? " btn-sm" : "";
  const extra = className ? ` ${className}` : "";
  const composed = `btn-ghost${sizeClass}${extra}`;
  return (
    <button type={type} className={composed} {...rest}>
      {children}
    </button>
  );
}

export default SecondaryButton;
