import { useState } from "react";

// DeleteButton — Mutation Contract #4 ("destruction requires evidence of intent
// proportional to reversal cost"). This is the canonical two-step inline
// destructive confirm for the entire app; per docs/ENFORCEMENT_STATUS.md it is
// the structural artifact for Mutation #4. Pilot C moved this file from
// `src/components/` into `src/components/primitives/` so the
// `sermonforge/no-raw-button` lint rule (Surface Contract #2) exempts the
// three raw <button> elements inside — they are intentional behavioral
// shape, not CTA shape.
//
// API:
//   onDelete      — called on the user's "Yes" confirm
//   label         — visible text on the trigger button (default "Delete")
//   confirmLabel  — text shown beside Yes/Cancel in the confirming state (default "Delete?").
//                   Use a longer label when reversal cost is higher (e.g. row carries
//                   cross-phase work). Keeps Mutation #4 alignment without bypassing
//                   this primitive for warning copy.
//   ariaLabel     — accessibility name override for the trigger button. Falls back to
//                   `label`. Use when the visible label is a glyph (×) and screen
//                   readers need a verbose name ("Remove row 3").
//   small         — compact sizing for use inside cards or table rows
//
// Always calls e.stopPropagation() so it works inside clickable cards.
export default function DeleteButton({
  onDelete,
  label = "Delete",
  confirmLabel = "Delete?",
  ariaLabel,
  small = false,
}) {
  const [confirming, setConfirming] = useState(false);

  const fontSize = small ? "11px" : "12px";
  const padding  = small ? "1px 6px" : "2px 8px";
  const triggerName = ariaLabel || label;

  if (confirming) {
    return (
      <span
        style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ fontSize, color: "var(--ink-soft)", fontFamily: "var(--font-serif)" }}>
          {confirmLabel}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(false); onDelete(); }}
          style={{
            background: "var(--crimson)", color: "white", border: "none",
            borderRadius: "3px", padding, fontSize, cursor: "pointer",
            fontFamily: "var(--font-serif)",
          }}
        >
          Yes
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
          style={{
            background: "transparent", color: "var(--ink-ghost)",
            border: "1px solid var(--parchment-deep)", borderRadius: "3px",
            padding, fontSize, cursor: "pointer", fontFamily: "var(--font-serif)",
          }}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
      style={{
        background: "transparent", color: "var(--ink-ghost)", border: "none",
        cursor: "pointer", padding: small ? "1px 4px" : "2px 6px",
        fontSize, fontFamily: "var(--font-serif)", borderRadius: "3px",
      }}
      title={triggerName}
      aria-label={triggerName}
    >
      {label}
    </button>
  );
}
