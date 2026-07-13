import { useEffect, useRef } from "react";
import { useModalA11y } from "../utils/useModalA11y";
import TextButton from "./primitives/TextButton";
import IconButton from "./primitives/IconButton";
import "./workspaceNotebookDrawer.css";

// WorkspaceNotebookDrawer — bottom-slide overlay that hosts a per-stage
// notebook column. Decision 2 (Phase D2): the production app does not
// ship without a notebook surface the preacher has today; the drawer
// preserves it across the writing-surface rewrite.
//
// Per-stage column dispatch happens in the parent (SermonWorkspace);
// this component renders the value, emits changes, and lets the pastor
// switch notebooks via the header tabs — the three notebooks used to
// switch silently with the stage, which read as "my Study notes
// vanished" the first time someone entered Assembly.

const STAGE_LABEL = {
  Study: "Study notebook",
  Assembly: "Assembly notebook",
  Manuscript: "Manuscript notebook",
};

export default function WorkspaceNotebookDrawer({ stage, value, onChange, onStageChange, onClose }) {
  const textareaRef = useRef(null);

  // The house dialog pattern (Session 6). The notebook IS a drawer visually,
  // but it must carry the same guarantees while open: keyboard focus stays
  // inside it (no accidental typing into the obscured writing surface),
  // Escape closes, and focus restores to the summoning notebook link.
  const drawerRef = useModalA11y(onClose);

  useEffect(() => {
    // Land focus in the textarea so the preacher can start writing
    // immediately. Small timeout so the slide-in animation finishes first
    // (the a11y hook lands focus on the first focusable instantly; this
    // refined landing wins right after).
    const id = setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 80);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      <div className="wnd-backdrop" onClick={onClose} aria-hidden="true" />
      <section
        className="wnd-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={STAGE_LABEL[stage] ?? "Notebook"}
        ref={drawerRef}
      >
        <div className="wnd-header">
          <div className="wnd-tabs" aria-label="Notebooks">
            {Object.keys(STAGE_LABEL).map((s) => (
              <TextButton
                key={s}
                size="sm"
                className={"wnd-tab" + (s === stage ? " is-active" : "")}
                aria-pressed={s === stage}
                onClick={() => onStageChange?.(s)}
              >
                {STAGE_LABEL[s]}
              </TextButton>
            ))}
          </div>
          <IconButton
            type="button"
            className="wnd-close"
            onClick={onClose}
            aria-label="Close notebook"
            title="Close notebook"
          >
            ×
          </IconButton>
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
