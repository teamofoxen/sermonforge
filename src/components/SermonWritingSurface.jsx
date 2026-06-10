import { useCallback, useEffect, useRef } from "react";
import { findField, nextField, regionFrameFor } from "../utils/walkOrder";
import { createOutlinePoint } from "../utils";
import PassageCanvas from "./PassageCanvas";
import "./sermonWritingSurface.css";

// The Assembly/Outline writing position. "outline" is the canonical sub-phase
// + DB column key here (not the pre-Pilot-B stage-status alias the lint rule
// guards against), so the rule is disabled with that justification. Shared by
// the Equip + Manuscript "build the outline first" doors.
// eslint-disable-next-line sermonforge/canonical-stage-name -- canonical sub-phase + column key, not a stage status
const OUTLINE_POSITION = { stage: "Assembly", subPhase: "Outline", fieldKey: "outline" };

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

// Assembly/Outline — a reorderable list of {id,text} points written to the
// native `outline` column the Word export reads. New points are created via
// createOutlinePoint so the stable UUID that functional_elements + manuscript
// transitions key off is assigned in the one canonical place (src/utils.js).
function OutlineBuilder({ question, points, onChange }) {
  const list = Array.isArray(points) ? points : [];
  const apply = (next) => onChange?.(next);
  const editText = (id, text) => apply(list.map((p) => (p.id === id ? { ...p, text } : p)));
  const removePoint = (id) => apply(list.filter((p) => p.id !== id));
  const movePoint = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const next = list.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    apply(next);
  };
  const addPoint = () => apply([...list, createOutlinePoint("")]);

  return (
    <div className="sws-prompt-block">
      <div className="sws-prompt">{question.prompt}</div>
      {list.length > 0 && (
        <div className="sws-outline-list">
          {list.map((pt, idx) => (
            <article key={pt.id} className="sws-outline-point">
              <div className="sws-outline-point-num">{idx + 1}</div>
              <div className="sws-outline-point-body">
                <AutoGrowTextarea
                  value={pt.text ?? ""}
                  onChange={(v) => editText(pt.id, v)}
                  ariaLabel={`Outline point ${idx + 1}`}
                  placeholder="What does this movement of the text say to us?"
                />
                <div className="sws-outline-point-actions">
                  <button type="button" className="sws-na-toggle" onClick={() => movePoint(idx, -1)} disabled={idx === 0} aria-label="Move point up">↑ up</button>
                  <button type="button" className="sws-na-toggle" onClick={() => movePoint(idx, 1)} disabled={idx === list.length - 1} aria-label="Move point down">↓ down</button>
                  <button type="button" className="sws-na-toggle" onClick={() => removePoint(pt.id)} aria-label="Remove point">remove</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <button type="button" className="sws-unmet-door sws-outline-add" onClick={addPoint}>
        + Add point
      </button>
    </div>
  );
}

// Assembly/Equip — iterates the outline points (built in Outline) and renders
// the four functional elements under each, written to the native
// `functional_elements` column keyed by point id. Mirrors the
// CumulativeSynthesisTable's "upstream not built yet" door.
function FunctionalElementsEditor({ question, points, functionalElements, onChange, onPositionChange }) {
  const list = Array.isArray(points) ? points : [];
  const elements = question.elements || [];

  if (list.length === 0) {
    return (
      <div className="sws-prompt-block">
        <div className="sws-prompt">{question.prompt}</div>
        <div className="sws-unmet">
          <p className="sws-unmet-message">
            Each section here is one of your outline points — but you haven't built
            the outline yet. Start there, and the points will be ready to equip when
            you come back.
          </p>
          <button
            type="button"
            className="sws-unmet-door"
            onClick={() => onPositionChange?.(OUTLINE_POSITION)}
          >
            Build the outline →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sws-prompt-block">
      <div className="sws-prompt">{question.prompt}</div>
      <div className="sws-equip-list">
        {list.map((pt, idx) => (
          <article key={pt.id} className="sws-equip-point">
            <div className="sws-equip-point-head">
              <span className="sws-equip-point-num">Point {idx + 1}</span>
              <span className="sws-equip-point-text">{pt.text?.trim() || "(untitled point)"}</span>
            </div>
            {elements.map((el) => (
              <div key={el.key} className="sws-equip-element">
                <div className="sws-unit-label is-active">{el.label}</div>
                {el.hint && <div className="sws-equip-hint">{el.hint}</div>}
                <AutoGrowTextarea
                  value={functionalElements?.[pt.id]?.[el.key] ?? ""}
                  onChange={(v) => onChange?.(pt.id, el.key, v)}
                  ariaLabel={`Point ${idx + 1} ${el.label}`}
                />
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}

// Manuscript/transitions — one bridge into each outline point, plus the bridge
// into the conclusion, written to manuscript.transitions keyed by point id.
function ManuscriptTransitions({ question, points, manuscript, onChange, onPositionChange }) {
  const list = Array.isArray(points) ? points : [];
  const trans = manuscript?.transitions || {};

  if (list.length === 0) {
    return (
      <div className="sws-prompt-block">
        <div className="sws-prompt">{question.prompt}</div>
        <div className="sws-unmet">
          <p className="sws-unmet-message">
            Transitions bridge your outline points — but there's no outline yet.
            Build it first, then come back to write the bridges between movements.
          </p>
          <button
            type="button"
            className="sws-unmet-door"
            onClick={() => onPositionChange?.(OUTLINE_POSITION)}
          >
            Build the outline →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sws-prompt-block">
      <div className="sws-prompt">{question.prompt}</div>
      <div className="sws-transitions-list">
        {list.map((pt, idx) => (
          <div key={pt.id} className="sws-transition-row">
            <div className="sws-unit-label">
              Into Point {idx + 1}{pt.text?.trim() ? ` — ${pt.text.trim()}` : ""}
            </div>
            <AutoGrowTextarea
              value={trans[pt.id] ?? ""}
              onChange={(v) => onChange?.("transitions", pt.id, v)}
              ariaLabel={`Transition into point ${idx + 1}`}
            />
          </div>
        ))}
        <div className="sws-transition-row">
          <div className="sws-unit-label">Into the Conclusion</div>
          <AutoGrowTextarea
            value={trans.conclusion ?? ""}
            onChange={(v) => onChange?.("transitions", "conclusion", v)}
            ariaLabel="Transition into the conclusion"
          />
        </div>
      </div>
    </div>
  );
}

export default function SermonWritingSurface({
  stage,
  subPhase,
  fieldKey,
  fieldAnswers,
  thoughtUnits,
  outlinePoints,
  functionalElements,
  manuscript,
  onAnswerChange,
  onUnitColumnChange,
  onCanvasChange,
  onOutlineChange,
  onFunctionalElementChange,
  onManuscriptChange,
  onPositionChange,
  beforePositionChange,
  onOpenMap,
  onOpenNotebook,
  onOpenFinish,
}) {
  const field = findField(stage, subPhase, fieldKey);

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
            if (q.kind === "outline-builder") {
              return (
                <OutlineBuilder
                  key={q.key}
                  question={q}
                  points={outlinePoints}
                  onChange={onOutlineChange}
                />
              );
            }
            if (q.kind === "functional-elements") {
              return (
                <FunctionalElementsEditor
                  key={q.key}
                  question={q}
                  points={outlinePoints}
                  functionalElements={functionalElements}
                  onChange={onFunctionalElementChange}
                  onPositionChange={handleInternalPositionChange}
                />
              );
            }
            if (q.kind === "manuscript-transitions") {
              return (
                <ManuscriptTransitions
                  key={q.key}
                  question={q}
                  points={outlinePoints}
                  manuscript={manuscript}
                  onChange={onManuscriptChange}
                  onPositionChange={handleInternalPositionChange}
                />
              );
            }
            if (q.kind === "manuscript-prose") {
              const v = manuscript?.[q.section]?.[q.key] ?? "";
              return (
                <div key={q.key} className="sws-prompt-block">
                  <div className="sws-prompt">{q.prompt}</div>
                  <AutoGrowTextarea
                    value={v}
                    onChange={(val) => onManuscriptChange?.(q.section, q.key, val)}
                    ariaLabel={q.prompt}
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

      {/* End of the walk: the forward control becomes the door to the
          completion threshold instead of silently greying out (the audit's
          worst dead end). SermonFinish is re-openable, never one-shot. */}
      {hasNext ? (
        <button
          type="button"
          className="sws-forward"
          onClick={advance}
          aria-label="Next field"
        >
          Next →
        </button>
      ) : (
        <button
          type="button"
          className="sws-forward is-finish"
          onClick={onOpenFinish}
          aria-label="Finish sermon"
        >
          Finish sermon →
        </button>
      )}

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
