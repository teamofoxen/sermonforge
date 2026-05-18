import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTION_WALK_ORDER, questionId } from "../utils/walkOrder";
import "./sermonMap.css";

const REGION_LABEL = {
  Observe: "Observe",
  Interpret: "Interpret",
  RedemptiveThread: "Redemptive Thread",
  Implications: "Implications",
  Anchor: "Anchor",
  Outline: "Outline",
  Equip: "Equip",
  Frame: "Frame",
};

function regionLabelFor(entry) {
  return REGION_LABEL[entry.subPhase] ?? entry.stage;
}

function buildGroups(questions) {
  const out = [];
  let currentStage = null;
  let currentRegion = null;
  let currentField = null;
  for (const q of questions) {
    if (q.stage !== currentStage) {
      if (currentStage !== null) out.push({ kind: "stage-break" });
      currentStage = q.stage;
      currentRegion = null;
      currentField = null;
    }
    const regionKey = `${q.stage}/${q.subPhase}`;
    if (regionKey !== currentRegion) {
      out.push({ kind: "region", stage: q.stage, subPhase: q.subPhase, label: regionLabelFor(q) });
      currentRegion = regionKey;
      currentField = null;
    }
    if (q.fieldKey !== currentField) {
      out.push({
        kind: "field",
        stage: q.stage,
        subPhase: q.subPhase,
        fieldKey: q.fieldKey,
        fieldLabel: q.fieldLabel,
      });
      currentField = q.fieldKey;
    }
    out.push({ kind: "question", entry: q });
  }
  return out;
}

function QuestionRow({ entry, status, onJump }) {
  const [expanded, setExpanded] = useState(false);
  const { state, preview, fullValue } = status || { state: "unanswered" };
  const showPreview = state === "answered" || state === "partial";
  // Always expandable when a preview is shown — CSS line-clamps the collapsed
  // view to two lines, so even when preview === fullValue at the string level
  // the clamp may be hiding content. Treating any preview as expandable keeps
  // the contract honest: previews expand in place, not truncation-only.
  const isExpandable = showPreview && !!fullValue;

  return (
    <div className={`sm-row sm-row--${state}`}>
      <button type="button" className="sm-jump" onClick={onJump}>
        {entry.questionPrompt}
      </button>
      {showPreview && (
        <div className="sm-preview-wrap">
          <button
            type="button"
            className={"sm-preview" + (expanded ? " is-expanded" : "") + (state === "partial" ? " is-partial" : "")}
            onClick={() => isExpandable && setExpanded((v) => !v)}
            aria-expanded={expanded}
            disabled={!isExpandable}
          >
            {expanded && fullValue ? fullValue : preview}
            {state === "partial" && !expanded && "…"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SermonMap({
  questions = QUESTION_WALK_ORDER,
  questionStates = {},
  currentPosition,
  onJump,
  onClose,
}) {
  const groups = useMemo(() => buildGroups(questions), [questions]);
  const panelRef = useRef(null);
  const currentRowRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, []);

  const isCurrentField = (stage, subPhase, fieldKey) =>
    currentPosition &&
    currentPosition.stage === stage &&
    currentPosition.subPhase === subPhase &&
    currentPosition.fieldKey === fieldKey;

  return (
    <>
      <div className="sm-backdrop" onClick={onClose} />
      <section className="sm-panel" role="dialog" aria-label="Sermon map" ref={panelRef}>
        <button
          type="button"
          className="sm-close"
          onClick={onClose}
          aria-label="Close map"
          title="Close map"
        >
          ×
        </button>
        <div className="sm-list">
          {groups.map((g, i) => {
            if (g.kind === "stage-break") {
              return <div key={`break-${i}`} className="sm-stage-break" aria-hidden="true" />;
            }
            if (g.kind === "region") {
              return (
                <h3 key={`region-${i}`} className="sm-region-label">
                  {g.label}
                </h3>
              );
            }
            if (g.kind === "field") {
              const current = isCurrentField(g.stage, g.subPhase, g.fieldKey);
              const className = "sm-field-label" + (current ? " is-current" : "");
              return current ? (
                <h4
                  key={`field-${i}`}
                  className={className}
                  ref={currentRowRef}
                >
                  {g.fieldLabel}
                </h4>
              ) : (
                <h4 key={`field-${i}`} className={className}>
                  {g.fieldLabel}
                </h4>
              );
            }
            const entry = g.entry;
            const id = questionId(entry);
            return (
              <QuestionRow
                key={id}
                entry={entry}
                status={questionStates[id]}
                onJump={() => {
                  onJump?.({
                    stage: entry.stage,
                    subPhase: entry.subPhase,
                    fieldKey: entry.fieldKey,
                  });
                }}
              />
            );
          })}
        </div>
      </section>
    </>
  );
}
