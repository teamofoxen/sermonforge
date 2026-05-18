import { useEffect, useRef } from "react";
import "./workspaceNotebookDrawer.css";

// WorkspaceNotebookDrawer — bottom-slide overlay that hosts the current
// stage's notebook column. Decision 2 (Phase D2): the production app does
// not ship without a notebook surface the preacher has today; the drawer
// preserves it across the writing-surface rewrite.
//
// Per-stage column dispatch happens in the parent (SermonWorkspace);
// this component just renders the value and emits changes. Same controlled-
// component pattern as the other writing-surface overlays.

const STAGE_LABEL = {
  Study: "Study notebook",
  Assembly: "Assembly notebook",
  Manuscript: "Manuscript notebook",
};

export default function WorkspaceNotebookDrawer({ stage, value, onChange, onClose }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    // Land focus in the textarea so the preacher can start writing
    // immediately. Small timeout so the slide-in animation finishes first.
    const id = setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 80);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      <div className="wnd-backdrop" onClick={onClose} aria-hidden="true" />
      <section
        className="wnd-drawer"
        role="dialog"
        aria-label={STAGE_LABEL[stage] ?? "Notebook"}
      >
        <div className="wnd-header">
          <span className="wnd-stage-label">{STAGE_LABEL[stage] ?? "Notebook"}</span>
          <button
            type="button"
            className="wnd-close"
            onClick={onClose}
            aria-label="Close notebook"
            title="Close notebook"
          >
            ×
          </button>
        </div>
        <textarea
          ref={textareaRef}
          className="wnd-textarea"
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Notes for this stage — margins of your thinking."
          aria-label={STAGE_LABEL[stage] ?? "Notebook"}
        />
      </section>
    </>
  );
}
