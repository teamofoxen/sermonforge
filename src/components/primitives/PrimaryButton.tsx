// PrimaryButton — Surface Contract #2 ("one CTA system").
//
// The canonical primary action shape for the entire app. Solid gold pill.
// Wraps the existing `.btn-primary` class so this primitive is a structural
// migration, not a visual redesign — a separate decision will rework the
// shape if/when the design system warrants it.
//
// `loading` accepts a `LoadingVerb` from `src/core/contracts.ts`
// (`"Loading…"` / `"Saving…"` / `"Thinking…"`). When set, the button is
// disabled and the canonical verb renders in place of children — Pilot D
// wired this surface so call sites declare which verb fits their op
// (Saving for writes, Thinking for AI ops, Loading for reads).
//
// Consumers may also keep an explicit ternary in `children`
// (e.g. `{saving ? "Saving…" : "Save"}`) — both patterns are contract-
// compliant; the lint rule blocks non-canonical verbs at the literal.

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LoadingVerb } from "../../core/contracts";
import { LoadingState } from "./LoadingState";

type ButtonSize = "default" | "sm";

export interface PrimaryButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  size?: ButtonSize;
  loading?: LoadingVerb;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

export function PrimaryButton({
  size = "default",
  loading,
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
      disabled={disabled || Boolean(loading)}
      {...rest}
    >
      {loading ? <LoadingState verb={loading} inline /> : children}
    </button>
  );
}

export default PrimaryButton;
