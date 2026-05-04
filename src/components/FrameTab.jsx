// FrameTab — SPRD C3 (Phase 3 Item 3, 2026-05-04). The elevated Step 5
// (SADI Sermon Frame). Renders the two anchor fields (Intro + Conclusion)
// using the established SpotlightWorksheet pattern; gates the boundary out
// of Frame into Manuscript via `evaluateAdvance(sermon, "stage", 3)`.
//
// Per SADI ratification, Conclusion's four questions are not N/A-able
// (every component is structurally necessary at the listener's exit). The
// SpotlightWorksheet renders N/A toggles uniformly across questions; the
// composite gate enforces the no-N/A rule at the boundary so any toggled
// N/A on Conclusion fields rejects the advance with a pastor-facing reason.
// (UX polish — hiding the toggle on no-N/A questions — is a follow-on.)

import { useCallback, useMemo } from "react";
import {
  parseStructuredField,
  serializeStructuredField,
  setQuestionAnswer,
  setQuestionNA,
  isQuestionNA,
  DEFAULT_QUESTION_KEY,
} from "../utils/studyFields";
import { SERMON_FRAME_FIELDS } from "../utils/sermonFrameFields";
import { evaluateAdvance } from "../utils/studyAdvancement";
import { STAGE } from "../core/contracts";
import SpotlightWorksheet from "./SpotlightWorksheet";
import AdvanceGateChecklist from "./AdvanceGateChecklist";
import PrimaryButton from "./primitives/PrimaryButton";

export default function FrameTab({ sermon, onUpdate, onTabChange }) {
  const frameData = useMemo(
    () => parseStructuredField(sermon.sermon_frame),
    [sermon.sermon_frame]
  );

  const updateStructured = useCallback(
    (fieldKey, qKey, value) => {
      const next = setQuestionAnswer(frameData, fieldKey, qKey || DEFAULT_QUESTION_KEY, value);
      onUpdate({ sermon_frame: serializeStructuredField(next) });
    },
    [frameData, onUpdate]
  );

  const toggleStructuredNA = useCallback(
    (fieldKey, qKey) => {
      const wasNA = isQuestionNA(frameData, fieldKey, qKey || DEFAULT_QUESTION_KEY);
      const next = setQuestionNA(frameData, fieldKey, qKey || DEFAULT_QUESTION_KEY, !wasNA);
      onUpdate({ sermon_frame: serializeStructuredField(next) });
    },
    [frameData, onUpdate]
  );

  // Frame stage is fromIndex=3 in STAGE_BY_INDEX (Study=1, Blueprint=2,
  // Frame=3, Manuscript=4, Delivery=5). evaluateAdvance returns
  // {ok, reason?, gates?} per the established pattern.
  const advance = useMemo(
    () => evaluateAdvance(sermon, "stage", 3),
    [sermon]
  );

  const handleContinue = useCallback(() => {
    if (!advance.ok) return;
    onTabChange?.(STAGE.Manuscript);
  }, [advance.ok, onTabChange]);

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      <SpotlightWorksheet
        fields={SERMON_FRAME_FIELDS}
        data={frameData}
        onChange={updateStructured}
        onToggleNA={toggleStructuredNA}
        sermonId={sermon.id}
      />

      <div style={{ marginTop: "32px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
        <PrimaryButton
          onClick={handleContinue}
          disabled={!advance.ok}
          title={advance.reason || undefined}
        >
          Continue to Manuscript
        </PrimaryButton>
        {!advance.ok && advance.gates && advance.gates.length > 0 && (
          <AdvanceGateChecklist gates={advance.gates} />
        )}
        {!advance.ok && (!advance.gates || advance.gates.length === 0) && advance.reason && (
          <div data-testid="advance-hint" className="advance-hint">{advance.reason}</div>
        )}
      </div>
    </div>
  );
}
