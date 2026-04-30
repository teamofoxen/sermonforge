// PrimaryButton — Surface Contract #2 ("one CTA system").
//
// The canonical primary action shape for the entire app. Solid gold pill.
// Wraps the existing `.btn-primary` class so this primitive is a structural
// migration, not a visual redesign — a separate decision will rework the
// shape if/when the design system warrants it.
//
// Pilot C (audit triage) lands this primitive and migrates every primary-CTA
// `<button className="btn-primary">` to `<PrimaryButton>`. The
// `sermonforge/no-raw-button` lint rule exempts `src/components/primitives/`,
// so this file is the only place a raw `<button>` for a primary CTA is
// allowed to live.
//
// `loading` is reserved here for Pilot D, which will wire the canonical
// loading verbs (`Loading…` / `Saving…` / `Thinking…`) from
// `src/core/contracts.ts`. Today it disables the button; consumers still
// supply their own children. Once Pilot D lands, passing `loading` will
// auto-render the canonical verb in place of children.

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonSize = "default" | "sm";

export interface PrimaryButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  size?: ButtonSize;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

export function PrimaryButton({
  size = "default",
  loading = false,
  type = "button",
  className,
  disabled,
  children,
  ...rest
}: PrimaryButtonProps) {
  const sizeClass = size === "sm" ? " btn-sm" : "";
  const extra = className ? ` ${className}` : "";
  const composed = `btn-primary${sizeClass}${extra}`;
  return (
    <button
      type={type}
      className={composed}
      disabled={disabled || loading}
      {...rest}
    >
      {children}
    </button>
  );
}

export default PrimaryButton;
