// EmptyState — Surface Contract #3 ("Empty states share a layout and tone").
//
// One canonical layout for "no items yet" / "no results" displays. Replaces
// the ~4 ad-hoc empty-state aesthetics noted in the audit memory.
//
// Design (preserves existing visual language without imposing a redesign):
//   - centered, italic, ink-ghost color
//   - optional icon (SVG or glyph) above the title
//   - optional subtitle line
//   - optional action (PrimaryButton or SecondaryButton) below
//
// Pilot D builds the primitive and migrates a handful of visible empty
// states to demonstrate the pattern. A full sweep of all empty-state
// surfaces is out of Pilot D's scope; consumers can opt in incrementally.

import type { CSSProperties, ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  style,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "60px 32px",
        color: "var(--ink-ghost)",
        fontFamily: "var(--font-serif)",
        gap: "8px",
        ...style,
      }}
    >
      {icon && (
        <div style={{ fontSize: "40px", opacity: 0.35, marginBottom: "8px" }}>
          {icon}
        </div>
      )}
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "16px",
          color: "var(--ink-soft)",
          margin: 0,
        }}
      >
        {title}
      </p>
      {description && (
        <p
          style={{
            fontSize: "14px",
            color: "var(--ink-ghost)",
            margin: 0,
            maxWidth: "440px",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "16px" }}>{action}</div>}
    </div>
  );
}

export default EmptyState;
