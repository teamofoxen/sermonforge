import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import { useModalA11y } from "../utils/useModalA11y";
import { SAVE_TRANSITION } from "../utils/saveTransition";

// UnsavedLeaveConfirm — the renderer half of the persistence-transition
// contract's exit decision (src/utils/saveTransition.js; the main-process
// exits — window close, menu quit, updater restart — run the native-dialog
// twin in electron/saveTransition.cjs with the same wording family).
//
// Shown when a deliberate leave (workspace Back, series prev/next, planner
// Back, planner→sermon open) resolves "failed" or "unknown": staying is the
// primary action, leaving is an explicit spoken choice — ordinary navigation
// never discards silently (Mutation #3), and the surface always remains
// leavable ("Leave anyway"). "failed" and "unknown" get distinct wording: a
// confirmed-failed write IS lost work if he leaves; an unconfirmed one may
// not be, and must not be dressed up as either success or failure.
//
// Clicking the backdrop or pressing Escape counts as "Keep working" — the
// safe default; leaving requires the named button (Mutation #4 spirit:
// destruction needs evidence of intent). useModalA11y is the house dialog
// pattern: focus moves in, Tab is trapped, focus restores on close.
export default function UnsavedLeaveConfirm({ result, onStay, onLeave }) {
  const failed = result === SAVE_TRANSITION.Failed;
  const dialogRef = useModalA11y(onStay);
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onStay()}>
      <div className="modal" style={{ width: "460px" }} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="ulc-title">
        <div className="modal-header">
          <h2 className="modal-title" id="ulc-title">
            {failed ? "Your last changes didn't save" : "Couldn't confirm your last changes saved"}
          </h2>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: "14px", color: "var(--ink-soft)", fontFamily: "var(--font-serif)", lineHeight: 1.6, margin: 0 }}>
            {failed
              ? "SermonForge couldn't save your most recent edits. If you leave now, those edits will be lost. You can stay and try again — the save indicator will keep retrying."
              : "Your most recent edits may have saved — SermonForge couldn't confirm it in time. You can stay and check the save indicator before leaving."}
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
            <SecondaryButton onClick={onLeave}>Leave anyway</SecondaryButton>
            <PrimaryButton onClick={onStay}>Keep working</PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
