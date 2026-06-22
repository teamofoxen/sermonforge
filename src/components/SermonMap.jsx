import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTION_WALK_ORDER, questionId, findField, REGION_DISPLAY } from "../utils/walkOrder";
import { THRESHOLD_ID } from "../utils/sermonState";
import TextButton from "./primitives/TextButton";
import IconButton from "./primitives/IconButton";
import "./sermonMap.css";

function regionLabelFor(entry) {
  return REGION_DISPLAY[entry.subPhase] ?? entry.stage;
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
      <IconButton type="button" className="sm-jump" onClick={() => onJump?.(entry)} aria-label={entry.questionPrompt}>
        {entry.questionPrompt}
      </IconButton>
      {showPreview && (
        <div className="sm-preview-wrap">
          <IconButton
            type="button"
            className={"sm-preview" + (expanded ? " is-expanded" : "") + (state === "partial" ? " is-partial" : "")}
            onClick={() => isExpandable && setExpanded((v) => !v)}
            aria-expanded={expanded}
            disabled={!isExpandable}
            aria-label="Toggle answer preview"
          >
            {expanded && fullValue ? fullValue : preview}
            {state === "partial" && !expanded && "…"}
          </IconButton>
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
  onReread,
  onClose,
}) {
  const groups = useMemo(() => buildGroups(questions), [questions]);
  const panelRef = useRef(null);
  const currentRowRef = useRef(null);

  // Per-region answered counts — the map's standing completeness summary
  // (Process #2: the map carries continuous low-weight visibility). Keyed
  // "stage/subPhase" → { answered, total }.
  const regionCounts = useMemo(() => {
    const counts = {};
    for (const q of questions) {
      const key = `${q.stage}/${q.subPhase}`;
      counts[key] = counts[key] || { answered: 0, total: 0 };
      counts[key].total += 1;
      if (questionStates[questionId(q)]?.state === "answered") counts[key].answered += 1;
    }
    return counts;
  }, [questions, questionStates]);

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

  // "You are here" — one line, current-position vocabulary only.
  const hereField = currentPosition
    ? findField(currentPosition.stage, currentPosition.subPhase, currentPosition.fieldKey)
    : null;
  const hereLine = currentPosition
    ? [
        currentPosition.stage,
        currentPosition.stage === currentPosition.subPhase
          ? null
          : (REGION_DISPLAY[currentPosition.subPhase] ?? currentPosition.subPhase),
        hereField?.label ?? null,
      ].filter(Boolean).join(" · ")
    : null;

  return (
    <>
      <div className="sm-backdrop" onClick={onClose} />
      <section className="sm-panel" role="dialog" aria-label="Sermon map" ref={panelRef}>
        <IconButton
          type="button"
          className="sm-close"
          onClick={onClose}
          aria-label="Close map"
          title="Close map"
        >
          ×
        </IconButton>
        <header className="sm-head">
          <h2 className="sm-title">The whole sermon, every question.</h2>
          <p className="sm-sub">Click any question to go there.</p>
          {hereLine && (
            <p className="sm-here">
              <span className="sm-here-label">You are here</span> {hereLine}
            </p>
          )}
          <p className="sm-legend" aria-hidden="true">
            <span className="sm-legend-answered">answered</span>
            <span className="sm-legend-sep">·</span>
            <span className="sm-legend-partial">started</span>
            <span className="sm-legend-sep">·</span>
            <span className="sm-legend-unanswered">not yet</span>
          </p>
          {/* Re-read doors — threshold screens are re-readable forever
              (Process #3: dismissal ends the interruption, not the access). */}
          {onReread && (
            <p className="sm-reread">
              <span className="sm-reread-label">Read again</span>
              <TextButton
                size="sm"
                className="sm-reread-link"
                onClick={() => onReread(THRESHOLD_ID.SermonStart)}
              >
                the walk ahead
              </TextButton>
              <span className="sm-legend-sep">·</span>
              <TextButton
                size="sm"
                className="sm-reread-link"
                onClick={() => onReread(THRESHOLD_ID.StudyToAnchorHandoff)}
              >
                the Study → Anchor handoff
              </TextButton>
            </p>
          )}
        </header>
        <div className="sm-scroll">
          <div className="sm-list">
            {groups.map((g, i) => {
              if (g.kind === "stage-break") {
                return <div key={`break-${i}`} className="sm-stage-break" aria-hidden="true" />;
              }
              if (g.kind === "region") {
                const count = regionCounts[`${g.stage}/${g.subPhase}`];
                return (
                  <h3 key={`region-${i}`} className="sm-region-label">
                    {g.label}
                    {count && (
                      <span className="sm-region-count">
                        {count.answered} of {count.total}
                      </span>
                    )}
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
                  onJump={onJump}
                />
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
