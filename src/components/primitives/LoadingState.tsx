// LoadingState — Surface Contract #3 ("one loading vocabulary").
//
// From docs/CORE.md: "A small canonical set of loading verbs ('Loading…',
// 'Saving…', 'Thinking…') covers everything." This primitive is the
// canonical render for any standalone loading state that needs visible
// pending text — ad-hoc styling and ad-hoc verbs are forbidden.
//
// `verb` is typed against the LoadingVerb union from src/core/contracts.ts,
// so passing "Drafting…" or "Generating…" is a compile-time error.
//
// Used three ways:
//   1. Standalone:        <LoadingState verb={LOADING_VERB.Saving} />
//   2. Inside a button:   <PrimaryButton loading>...</PrimaryButton> — the
//                          PrimaryButton primitive automatically renders
//                          <LoadingState verb="Saving…" /> in place of children.
//   3. Inline as text:    <LoadingState verb="Loading…" inline />
//
// The lint rule `sermonforge/canonical-loading-verb` blocks non-canonical
// loading-verb literals at editor time; this primitive is the structural
// pair that ensures the verb chosen at the call site is type-safe.

import type { CSSProperties } from "react";
import { LOADING_VERB } from "../../core/contracts";
import type { LoadingVerb } from "../../core/contracts";

export interface LoadingStateProps {
  verb?: LoadingVerb;
  inline?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function LoadingState({
  verb = LOADING_VERB.Loading,
  inline = false,
  className,
  style,
}: LoadingStateProps) {
  const baseStyle: CSSProperties = inline
    ? {
        fontStyle: "italic",
        color: "var(--ink-ghost)",
        fontFamily: "'Crimson Pro', serif",
      }
    : {
        fontStyle: "italic",
        color: "var(--ink-ghost)",
        fontFamily: "'Crimson Pro', serif",
        padding: "8px 0",
        display: "block",
      };
  return (
    <span
      role="status"
      aria-live="polite"
      className={className}
      style={{ ...baseStyle, ...style }}
    >
      {verb}
    </span>
  );
}

export default LoadingState;
