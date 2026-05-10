// NotebookPanel — per-tab free-form scratchpad for the pastor.
//
// ARI Phase 3 surface. Replaces the AI Panel as the docked thinking space.
// Per-tab so different mental modes (study / blueprint / manuscript) don't
// bleed into each other. Plain text. Sermon-scoped. Persists via the
// standard onUpdate pipeline (Mutation Contract: saves are events).

import { useEffect, useRef, useState } from "react";
import { autoResize } from "../utils";
import Collapsible from "./primitives/Collapsible";

export default function NotebookPanel({ value, onChange, label, placeholder }) {
  const initialContent = (value || "").trim().length > 0;
  const [open, setOpen] = useState(initialContent);
  const taRef = useRef(null);

  // Resize on open so the textarea snaps to fit existing content.
  // Per-keystroke resize is handled inline in onChange.
  useEffect(() => {
    if (open && taRef.current) autoResize(taRef.current);
  }, [open]);

  return (
    <div style={{ marginTop: "20px" }}>
      <Collapsible
        label={label}
        open={open}
        onToggle={() => setOpen(o => !o)}
        bodyStyle={{ padding: "0 14px 14px" }}
      >
        <textarea
          ref={taRef}
          className="field-textarea"
          value={value || ""}
          onChange={(e) => {
            onChange(e.target.value);
            autoResize(e.target);
          }}
          placeholder={placeholder}
          style={{
            width: "100%",
            minHeight: "120px",
            fontSize: "14px",
            lineHeight: "1.6",
            fontFamily: "var(--font-serif)",
            resize: "vertical",
          }}
        />
      </Collapsible>
    </div>
  );
}
