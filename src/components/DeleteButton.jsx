import { useState } from "react";

// Inline delete confirmation — avoids native confirm() dialogs.
// Normal state: a subtle "Delete" text button.
// Confirming state: "Delete? Yes / Cancel" inline, no popup.
// Always calls e.stopPropagation() so it works inside clickable cards.
export default function DeleteButton({ onDelete, label = "Delete", small = false }) {
  const [confirming, setConfirming] = useState(false);

  const fontSize = small ? "11px" : "12px";
  const padding  = small ? "1px 6px" : "2px 8px";

  if (confirming) {
    return (
      <span
        style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ fontSize, color: "var(--ink-soft)", fontFamily: "'Crimson Pro', serif" }}>
          Delete?
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(false); onDelete(); }}
          style={{
            background: "var(--crimson)", color: "white", border: "none",
            borderRadius: "3px", padding, fontSize, cursor: "pointer",
            fontFamily: "'Crimson Pro', serif",
          }}
        >
          Yes
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
          style={{
            background: "transparent", color: "var(--ink-ghost)",
            border: "1px solid var(--parchment-deep)", borderRadius: "3px",
            padding, fontSize, cursor: "pointer", fontFamily: "'Crimson Pro', serif",
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
        fontSize, fontFamily: "'Crimson Pro', serif", borderRadius: "3px",
      }}
      title={label}
    >
      {label}
    </button>
  );
}
