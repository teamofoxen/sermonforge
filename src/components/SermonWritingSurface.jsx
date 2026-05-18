import { useCallback, useEffect, useRef, useState } from "react";
import { findField, nextField, regionFrameFor } from "../utils/walkOrder";
import PassageCanvas from "./PassageCanvas";
import "./sermonWritingSurface.css";

function AutoGrowTextarea({ value, onChange, disabled, ariaLabel, placeholder }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      className={"sws-textarea" + (disabled ? " is-na" : "")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder={placeholder}
      rows={3}
    />
  );
}

function PromptBlock({ prompt, answer, onValueChange, onToggleNA }) {
  const value = answer?.value ?? "";
  const na = answer?.na === true;
  return (
    <div className="sws-prompt-block">
      <div className="sws-prompt">{prompt}</div>
      <AutoGrowTextarea
        value={na ? "" : value}
        onChange={onValueChange}
        disabled={na}
        ariaLabel={prompt}
      />
      <button
        type="button"
        className={"sws-na-toggle" + (na ? " is-on" : "")}
        onClick={onToggleNA}
      >
        {na ? "not applicable · undo" : "not applicable"}
      </button>
    </div>
  );
}

function CumulativeSynthesisTable({
  question,
  thoughtUnits,
  onUnitColumnChange,
  onPositionChange,
}) {
  const editableColumn = question.columns?.find((c) => !c.readOnly);
  const priorColumns = (question.columns || []).filter((c) => c.readOnly);
  if (!editableColumn) return null;
  const units = Array.isArray(thoughtUnits) ? thoughtUnits : [];

  // WATCH (real prep): at 15–20 thought units the row stack becomes a long
  // scroll, the column-eyebrow repetition gets loud, and the rhythm question
  // — does the preacher want all rows at once, or some kind of grouping? —
  // becomes observable. 4-row fixtures don't surface this; lived prep will.

  return (
    <div className="sws-prompt-block">
      <div className="sws-prompt">{question.prompt}</div>
      {units.length === 0 ? (
        <div className="sws-unmet">
          <p className="sws-unmet-message">
            Each row of this table is one thought unit from the passage. You
            haven't laid out the passage's structure yet — start there, and this
            table will be ready when you come back.
          </p>
          <button
            type="button"
            className="sws-unmet-door"
            onClick={() =>
              onPositionChange?.({
                stage: "Study",
                subPhase: "Observe",
                fieldKey: "divisions",
              })
            }
          >
            Lay out the passage's structure →
          </button>
        </div>
      ) : (
        <div className="sws-per-unit">
          {units.map((unit, idx) => (
            <article key={unit.id ?? idx} className="sws-unit-row">
              {priorColumns.map((col) => {
                const v = unit[col.key];
                const isEmpty = v == null || v === "";
                return (
                  <div key={col.key} className="sws-unit-prior">
                    <div className="sws-unit-label">{col.label}</div>
                    <div className={"sws-unit-value" + (isEmpty ? " is-empty" : "")}>
                      {isEmpty ? "—" : v}
                    </div>
                  </div>
                );
              })}
              <div className="sws-unit-editable">
                <div className="sws-unit-label is-active">{editableColumn.label}</div>
                <AutoGrowTextarea
                  value={unit[editableColumn.key] ?? ""}
                  onChange={(v) =>
                    onUnitColumnChange?.(question.key, idx, editableColumn.key, v)
                  }
                  ariaLabel={`Row ${idx + 1} ${editableColumn.label}`}
                  placeholder={editableColumn.placeholder}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SermonWritingSurface({
  stage,
  subPhase,
  fieldKey,
  fieldAnswers,
  thoughtUnits,
  passageRef,
  passageText,
  saveState,
  onAnswerChange,
  onUnitColumnChange,
  onCanvasChange,
  onPositionChange,
  beforePositionChange,
  onOpenMap,
  onOpenNotebook,
}) {
  const field = findField(stage, subPhase, fieldKey);
  const [passageCollapsed, setPassageCollapsed] = useState(false);

  // Auto-tuck the passage when entering a heavy-lifting field — those are
  // the fields that genuinely need the writing column's full width. Per
  // ruling 6 the older takeoverWhenActive flag is retired; heavyLifting is
  // the surviving signal. The preacher can re-expand at will; leaving the
  // field doesn't auto-uncollapse so manual preferences stick.
  useEffect(() => {
    if (field?.heavyLifting) setPassageCollapsed(true);
  }, [field?.key, field?.heavyLifting]);

  // Wrap onPositionChange so every internal position-change site (chevron,
  // unmet-state door) awaits beforePositionChange first. Production wires
  // beforePositionChange to flush pending debounced saves so the preacher's
  // draft survives the jump (spec open question 3). Fixture passes no
  // beforePositionChange, so the await resolves immediately.
  const handleInternalPositionChange = useCallback(
    async (next) => {
      if (beforePositionChange) await beforePositionChange();
      onPositionChange?.(next);
    },
    [beforePositionChange, onPositionChange]
  );

  const advance = useCallback(async () => {
    const next = nextField({ stage, subPhase, fieldKey });
    if (!next) return;
    await handleInternalPositionChange({
      stage: next.stage,
      subPhase: next.subPhase,
      fieldKey: next.key,
    });
  }, [stage, subPhase, fieldKey, handleInternalPositionChange]);

  if (!field) {
    // Defensive fallback for a state the current code paths cannot produce:
    // chevron-next + map both consume WALK_ORDER, which skips Assembly/Outline
    // + Assembly/Equip + Manuscript (OEM field-def gap, Path A). If a position
    // ever lands here (corrupted last_touched_position, future bug), give the
    // pastor a humane explanation + the workspace-level Back button as the
    // escape — within-surface nav chrome is deliberately not rendered (no
    // current field to navigate from, branch dies entirely when OEM field-def
    // extraction lands). Post-sweep audit L2, 2026-05-18.
    return (
      <div className="sws-shell">
        <div className="sws-writing">
          <div className="sws-field">
            <div className="sws-field-hint">
              This part of the sermon isn't available yet. Use the Back button to return to your dashboard. ({String(stage)} · {String(subPhase)} · {String(fieldKey)})
            </div>
          </div>
        </div>
      </div>
    );
  }

  const answers = fieldAnswers ?? {};
  const hasNext = !!nextField({ stage, subPhase, fieldKey });

  return (
    <div className="sws-shell">
      <aside
        className={"sws-passage" + (passageCollapsed ? " is-collapsed" : "")}
        aria-label="Passage"
      >
        {passageCollapsed ? (
          <button
            type="button"
            className="sws-passage-expand"
            onClick={() => setPassageCollapsed(false)}
            aria-label="Show passage"
            title="Show passage"
          >
            ‹
          </button>
        ) : (
          <>
            <div className="sws-passage-header">
              <div className="sws-passage-ref">{passageRef}</div>
              <button
                type="button"
                className="sws-passage-collapse"
                onClick={() => setPassageCollapsed(true)}
                aria-label="Hide passage"
                title="Hide passage"
              >
                ›
              </button>
            </div>
            <div className="sws-passage-body">{passageText}</div>
          </>
        )}
      </aside>

      <main className="sws-writing">
        <div className="sws-field">
          {(() => {
            const frame = regionFrameFor(stage, subPhase, fieldKey);
            return frame ? <div className="sws-region-frame">{frame}</div> : null;
          })()}
          {field.label && <div className="sws-field-name">{field.label}</div>}
          {field.hint && <div className="sws-field-hint">{field.hint}</div>}
          {field.questions.map((q) => {
            if (q.kind === "cumulative-synthesis-table") {
              return (
                <CumulativeSynthesisTable
                  key={q.key}
                  question={q}
                  thoughtUnits={thoughtUnits}
                  onUnitColumnChange={onUnitColumnChange}
                  onPositionChange={handleInternalPositionChange}
                />
              );
            }
            if (q.kind === "indented-canvas") {
              const rows = answers[q.key]?.value;
              return (
                <div key={q.key} className="sws-prompt-block">
                  <div className="sws-prompt">{q.prompt}</div>
                  <PassageCanvas
                    rows={Array.isArray(rows) ? rows : []}
                    onChange={(next) => onCanvasChange?.(field.key, q.key, next)}
                  />
                </div>
              );
            }
            return (
              <PromptBlock
                key={q.key}
                prompt={q.prompt}
                answer={answers[q.key]}
                onValueChange={(v) =>
                  onAnswerChange?.(field.key, q.key, { value: v, na: false })
                }
                onToggleNA={() => {
                  const current = answers[q.key] ?? { value: "", na: false };
                  onAnswerChange?.(field.key, q.key, {
                    value: current.value ?? "",
                    na: !current.na,
                  });
                }}
              />
            );
          })}
        </div>
      </main>

      {saveState && (
        <div className="sws-save-state" aria-live="polite">
          {saveState}
        </div>
      )}

      {onOpenNotebook && (
        <button
          type="button"
          className="sws-notebook-summon"
          onClick={onOpenNotebook}
          aria-label="Open notebook"
        >
          Notebook
        </button>
      )}

      <button
        type="button"
        className="sws-forward"
        onClick={advance}
        disabled={!hasNext}
        aria-label="Next field"
      >
        Next →
      </button>

      <button
        type="button"
        className="sws-map-summon"
        onClick={onOpenMap}
        aria-label="Open map"
        title="Open map"
      >
        ☰
      </button>
    </div>
  );
}
