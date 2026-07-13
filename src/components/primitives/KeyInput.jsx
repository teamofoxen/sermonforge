// KeyInput — masked API-key field with a show/hide toggle.
//
// One implementation shared by SetupScreen (first-run) and EsvKeyModal
// (update-from-sidebar / in-popup recovery); previously each carried its
// own near-identical local copy. Surface Contract #2: the toggle is the
// IconButton primitive.

import { useState } from "react";
import IconButton from "./IconButton";

export default function KeyInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Paste your key here",
  // Forwarded to the inner <input> so a visible <label htmlFor> can own this
  // control programmatically (Session 6 — the Setup API-key field's label
  // had no association before this).
  id,
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 48px 10px 12px",
          fontSize: "13px",
          fontFamily: "'JetBrains Mono', monospace",
          border: "1px solid var(--parchment-deep)",
          borderRadius: "4px",
          background: "var(--parchment)",
          color: "var(--ink)",
          outline: "none",
        }}
      />
      <IconButton
        aria-label={show ? "Hide key" : "Show key"}
        onClick={() => setShow((v) => !v)}
        disabled={disabled}
        style={{
          position: "absolute", right: "10px", top: "50%",
          transform: "translateY(-50%)",
          background: "none", border: "none",
          color: "var(--ink-ghost)", fontSize: "12px", padding: "2px 4px",
        }}
      >
        {show ? "hide" : "show"}
      </IconButton>
    </div>
  );
}
