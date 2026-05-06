// SpotlightWorksheet — spotlight pattern across a sub-phase's fields, with
// multi-question support per the SFDI Field Pattern (SPRD A1.1 + B1.1).
//
// One field is active (spotlighted) at a time; siblings render collapsed
// showing a summary. Within an active field that has multiple questions,
// an internal active-question state tracks which question's textarea is
// open; siblings within the field render as click-to-edit collapsed rows.
//
// Per-field-def contract: a `questions: [{key, prompt, kind?}, ...]` array
// declares the SFDI-walked sequence. Fields without one default to a
// single primary-question entry whose prompt comes from the field's
// `hint` (back-compat with the B1.0 single-question shape).
//
// onChange contract: `(fieldKey, qKey, value) => void`.
// onToggleNA contract: `(fieldKey, qKey) => void`.
// Both are emitted with explicit qKey so the parent's structured-field
// helpers (`setQuestionAnswer`, `setQuestionNA`) can write to the right
// envelope.

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { autoResize } from "../utils";
import PrimaryButton from "./primitives/PrimaryButton";
import FieldOverviewScreen from "./FieldOverviewScreen";
import IndentedSentenceCanvas from "./IndentedSentenceCanvas";
import SynthesisTable from "./SynthesisTable";
import PeripheralReferencePanel from "./PeripheralReferencePanel";
import {
  fieldQuestions,
  getQuestionAnswer,
  isQuestionNA,
  flattenAnswerValue,
  fieldKeyToTourId,
} from "../utils/studyFields";

// Resolve the effective value for a question. For cross-phase questions
// (cumulative-synthesis-table at Phase 2 / 3 / 4 reading the canonical
// thought-unit array from `observations.divisions.thought_units`), the value
// lives outside the active phase's data column — read it via crossPhaseRead.
// Otherwise read from the local field data via getQuestionAnswer.
function getEffectiveQuestionValue(question, data, fieldKey, crossPhaseRead) {
  const src = question?.crossPhaseSource;
  if (src && typeof crossPhaseRead === "function") {
    const upstream = crossPhaseRead(src.column);
    return upstream?.[src.fieldKey]?.[src.questionKey]?.value;
  }
  return getQuestionAnswer(data, fieldKey, question.key);
}

// Has the pastor put real content into this question? For text-prompt and
// the three structured-exercise sub-shapes (canvas, paraphrase, synthesis-
// table), `flattenAnswerValue` produces non-empty text whenever the value
// has any answered content. The cumulative-synthesis-table is the exception:
// its value is the full upstream + writable-column array, so flattenAnswerValue
// would return non-empty as soon as any upstream row exists. Completeness
// for cumulative-synthesis-table means "the writable column has ≥ 1 filled
// row," not just "the array is non-empty."
function questionHasContent(question, value) {
  if (question?.kind === "cumulative-synthesis-table") {
    if (!Array.isArray(value)) return false;
    const writable = Array.isArray(question.columns)
      ? question.columns.find((c) => !c.readOnly)
      : null;
    if (!writable) return false;
    return value.some(
      (row) =>
        row && typeof row[writable.key] === "string" && row[writable.key].trim()
    );
  }
  return !!flattenAnswerValue(value);
}

// Render a structured reference-panel section (the data shape lives in
// studyFields.js so the field defs stay React-free per B1.3 pattern).
function RefPanelSection({ section }) {
  if (!section || typeof section !== "object") return null;
  if (section.type === "rules") {
    return (
      <div className="ref-panel-section ref-panel-rules">
        <ol>
          {section.items.map((item, i) => (
            <li key={i}>
              <strong>{item.lead}</strong> — {item.body}
            </li>
          ))}
        </ol>
        {section.footnote && (
          <p className="ref-panel-footnote"><em>Clarifier:</em> {section.footnote}</p>
        )}
      </div>
    );
  }
  if (section.type === "heading" || section.type === "genre") {
    return (
      <div className={`ref-panel-section ref-panel-${section.type}`}>
        {section.heading && <h4>{section.heading}</h4>}
        {Array.isArray(section.paragraphs) &&
          section.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        {Array.isArray(section.items) && (
          <ol>
            {section.items.map((item, i) => <li key={i}>{item}</li>)}
          </ol>
        )}
      </div>
    );
  }
  return null;
}

function FieldReferencePanel({ panel }) {
  if (!panel) return null;
  return (
    <PeripheralReferencePanel title={panel.title}>
      {Array.isArray(panel.sections) &&
        panel.sections.map((s, i) => <RefPanelSection key={i} section={s} />)}
    </PeripheralReferencePanel>
  );
}

// localStorage key prefix for per-sermon "have I shown this field's overview
// yet?" tracking. SFDI Field Pattern: shown only on first entry to the field
// for a given sermon; skipped on re-entry.
const OVERVIEW_SEEN_KEY_PREFIX = "sermonforge_field_overview_seen_";

function overviewSeenKey(sermonId, fieldKey) {
  return `${OVERVIEW_SEEN_KEY_PREFIX}${sermonId}_${fieldKey}`;
}

// Render a field def's overview body from its structured shape (paragraphs,
// optional intro + ordered list). Lives next to FieldOverviewScreen because
// only this surface knows the data shape; the primitive itself is shape-
// agnostic and accepts any ReactNode children.
function renderOverviewBody(overview) {
  if (!overview) return null;
  return (
    <>
      {Array.isArray(overview.paragraphs) &&
        overview.paragraphs.map((p, i) => <p key={`p-${i}`}>{p}</p>)}
      {overview.list && Array.isArray(overview.list.items) && (
        <>
          {overview.list.intro && <p>{overview.list.intro}</p>}
          <ol>
            {overview.list.items.map((item, i) => (
              <li key={`li-${i}`}>{item}</li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

// ── Question completeness helpers ──────────────────────────────────────────

// Question-aware completeness check. Cross-phase questions
// (cumulative-synthesis-table) read their value via crossPhaseRead; everything
// else reads from local field data. Cross-phase NA handling follows the
// upstream column's NA flag — a Phase-1-marked-NA thought_units satisfies
// Phase 2's Q1 because there's nothing to extend. Local NA still applies to
// non-cross-phase questions per the existing pattern.
function isQuestionCompleteFor(question, data, fieldKey, crossPhaseRead) {
  const src = question?.crossPhaseSource;
  if (src && typeof crossPhaseRead === "function") {
    const upstream = crossPhaseRead(src.column);
    if (upstream?.[src.fieldKey]?.[src.questionKey]?.na) return true;
    const value = upstream?.[src.fieldKey]?.[src.questionKey]?.value;
    return questionHasContent(question, value);
  }
  if (isQuestionNA(data, fieldKey, question.key)) return true;
  const value = getQuestionAnswer(data, fieldKey, question.key);
  return questionHasContent(question, value);
}

// Legacy back-compat shim used by older tests / callers — preserves the
// `(data, fieldKey, questionKey)` signature for fields that don't have a
// question-def in scope.
function isQuestionComplete(data, fieldKey, questionKey) {
  if (isQuestionNA(data, fieldKey, questionKey)) return true;
  return !!flattenAnswerValue(getQuestionAnswer(data, fieldKey, questionKey));
}

// First incomplete question for a field, mirroring A1.1's first-incomplete-
// field selection. Returns the first question's key when all are answered
// or N/A — caller decides whether to render that as "active by default".
//
// Optional crossPhaseRead: when present, cross-phase questions
// (cumulative-synthesis-table) consult the canonical upstream column for
// completeness instead of the active phase's data.
export function firstIncompleteQuestionKey(questions, data, fieldKey, crossPhaseRead) {
  for (const q of questions) {
    if (!isQuestionCompleteFor(q, data, fieldKey, crossPhaseRead)) return q.key;
  }
  return questions[0]?.key ?? null;
}

// ── Single-question active rendering (A1.1 back-compat path) ──────────────
//
// Single-question fields share the kind dispatch with multi-question fields
// via ActiveQuestionInput — so structured kinds (unified-canvas today; other
// future kinds) work in either form without duplicating dispatch logic.

function SingleQuestionActive({
  field,
  question,
  value,
  isNA,
  onChange,
  onToggleNA,
  onNext,
  isLast,
  fieldData,
  fieldQuestionsArr,
}) {
  const taRef = useRef(null);
  useEffect(() => {
    if (taRef.current) {
      taRef.current.focus();
      const len = (taRef.current.value || "").length;
      try { taRef.current.setSelectionRange(len, len); } catch { /* non-textarea */ }
    }
  }, []);

  const canAdvance = isNA || questionHasContent(question, value);
  return (
    <div
      className={`worksheet-field worksheet-field-active${isNA ? " worksheet-field-na" : ""}`}
      data-field-key={field.key}
      data-tour-id={fieldKeyToTourId(field.key)}
    >
      <label className="worksheet-field-label">{field.label}</label>
      <ActiveQuestionInput
        field={field}
        question={question}
        value={value}
        isNA={isNA}
        onChange={onChange}
        fieldQuestionsArr={fieldQuestionsArr || [question]}
        fieldData={fieldData}
        taRefSetter={(el) => { taRef.current = el; }}
      />
      <div className="spotlight-controls">
        <button
          type="button"
          className="spotlight-na-toggle"
          onClick={onToggleNA}
        >
          {isNA ? "Mark applicable" : "Mark not applicable"}
        </button>
        {!isLast && (
          <PrimaryButton
            size="sm"
            disabled={!canAdvance}
            title={canAdvance ? "" : "Answer the question or mark it not applicable to continue"}
            onClick={onNext}
          >
            Next question →
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

// ── Multi-question active rendering ────────────────────────────────────────

// Render the input primitive for the active question, dispatched on kind.
// Textarea is the back-compat default for text-prompt questions; the three
// structured-exercise sub-shapes mount their A2.x primitives.
function ActiveQuestionInput({
  field,
  question,
  value,
  isNA,
  onChange,
  fieldQuestionsArr,
  fieldData,
  taRefSetter,
  crossPhaseRead,
  crossPhaseWrite,
}) {
  const kind = question.kind || "textarea";

  if (kind === "unified-canvas") {
    // Phase 4 Sprint 2 — Field 3's three legacy questions collapsed into a
    // single canvas where each row carries text + depth + inline paraphrase
    // + optional thought_unit_end. The materialized thought_units array
    // (kept in sync via setDivisionsCanvas at the StudyTab write site)
    // continues to feed Phase 2/3/4 cross-phase reads.
    return (
      <IndentedSentenceCanvas
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        disabled={isNA}
      />
    );
  }
  if (kind === "cumulative-synthesis-table") {
    // Phase 2/3/4 extend Phase 1's synthesis-table sub-shape with a writable
    // column. The canonical thought-unit array lives in the upstream column
    // declared by `question.crossPhaseSource`. Reads/writes go cross-phase
    // via the crossPhaseRead / crossPhaseWrite props that StudyTab plumbs.
    const src = question.crossPhaseSource;
    const upstream = typeof crossPhaseRead === "function" ? crossPhaseRead(src?.column) : null;
    const upstreamRows = upstream?.[src?.fieldKey]?.[src?.questionKey]?.value;
    const cumulativeValue = Array.isArray(upstreamRows) ? upstreamRows : [];
    const writeBack = (next) => {
      if (typeof crossPhaseWrite === "function" && src) {
        crossPhaseWrite(src.column, src.fieldKey, src.questionKey, next);
      }
    };
    return (
      <SynthesisTable
        value={cumulativeValue}
        onChange={writeBack}
        columns={Array.isArray(question.columns) ? question.columns : undefined}
        disabled={isNA}
      />
    );
  }

  return (
    <textarea
      className="field-textarea"
      rows={3}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      onInput={(e) => autoResize(e.target)}
      ref={taRefSetter}
      placeholder={question.prompt || field.hint || ""}
      disabled={isNA}
      data-testid={`question-input-${field.key}-${question.key}`}
    />
  );
}

function MultiQuestionActive({
  field,
  questions,
  data,
  onChangeQuestion,
  onToggleQuestionNA,
  onNextField,
  isLastField,
  crossPhaseRead,
  crossPhaseWrite,
  hideFutureQuestions = false,
}) {
  const initialActiveQ = useMemo(
    () => firstIncompleteQuestionKey(questions, data, field.key, crossPhaseRead),
    // Compute once on mount; user actions own active-question state thereafter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [activeQKey, setActiveQKey] = useState(initialActiveQ);

  const taRef = useRef(null);
  useEffect(() => {
    if (taRef.current) {
      taRef.current.focus();
      autoResize(taRef.current);
      const len = taRef.current.value.length;
      taRef.current.setSelectionRange(len, len);
    }
    // Keep the active question centered in the workspace scroll area as
    // siblings collapse above and below it. Without this the just-answered
    // question retains the visual center and the new active box drifts down,
    // forcing the pastor to scroll on every advance.
    const fieldEl = typeof document !== "undefined"
      ? document.querySelector(`[data-field-key="${field.key}"]`)
      : null;
    const activeQEl = fieldEl
      ? fieldEl.querySelector(`[data-question-key="${activeQKey}"]`)
      : null;
    if (activeQEl && typeof activeQEl.scrollIntoView === "function") {
      activeQEl.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeQKey, field.key]);

  // Defensive: if activeQKey somehow falls out of the questions list, snap
  // back to the first question.
  const safeActiveIdx = (() => {
    const i = questions.findIndex((q) => q.key === activeQKey);
    return i >= 0 ? i : 0;
  })();
  const activeQ = questions[safeActiveIdx];
  const activeIsCrossPhase = !!activeQ.crossPhaseSource;
  const activeValue = getEffectiveQuestionValue(activeQ, data, field.key, crossPhaseRead);
  // NA on cross-phase questions follows the upstream column's flag (Phase 2's
  // view doesn't separately mark Phase 1's data as N/A). Local NA still
  // applies elsewhere.
  const activeIsNA = (() => {
    if (activeIsCrossPhase) {
      const src = activeQ.crossPhaseSource;
      const upstream = typeof crossPhaseRead === "function" ? crossPhaseRead(src.column) : null;
      return !!upstream?.[src.fieldKey]?.[src.questionKey]?.na;
    }
    return isQuestionNA(data, field.key, activeQ.key);
  })();
  const canAdvance = activeIsNA || questionHasContent(activeQ, activeValue);
  const isLastQ = safeActiveIdx === questions.length - 1;
  const showNextButton = !(isLastQ && isLastField);

  const advance = useCallback(() => {
    if (isLastQ) {
      if (!isLastField) onNextField();
    } else {
      setActiveQKey(questions[safeActiveIdx + 1].key);
    }
  }, [isLastQ, isLastField, onNextField, questions, safeActiveIdx]);

  const handleToggleNA = useCallback(() => {
    const wasNA = activeIsNA;
    onToggleQuestionNA(activeQ.key);
    if (!wasNA) advance();
  }, [activeIsNA, activeQ.key, advance, onToggleQuestionNA]);

  return (
    <div
      className={`worksheet-field worksheet-field-active worksheet-field-multi${activeIsNA ? " worksheet-field-na" : ""}`}
      data-field-key={field.key}
      data-tour-id={fieldKeyToTourId(field.key)}
    >
      <label className="worksheet-field-label">{field.label}</label>
      <ol className="worksheet-questions">
        {questions.map((q, idx) => {
          // Tunnel-mode: hide future questions inside a field. Past +
          // active stay visible (the existing collapsed/spotlit logic
          // below renders them); future are not rendered at all.
          if (hideFutureQuestions && idx > safeActiveIdx) return null;

          if (idx === safeActiveIdx) {
            const hasRefPanel = !!q.referencePanel;
            const activeContent = (
              <div className="worksheet-question-content">
                <div className="worksheet-question-indicator">
                  Question {idx + 1} of {questions.length}
                </div>
                {q.prompt && <div className="worksheet-question-prompt">{q.prompt}</div>}
                <ActiveQuestionInput
                  field={field}
                  question={q}
                  value={activeValue}
                  isNA={activeIsNA}
                  onChange={(next) => onChangeQuestion(q.key, next)}
                  fieldQuestionsArr={questions}
                  fieldData={data}
                  taRefSetter={(el) => { taRef.current = el; }}
                  crossPhaseRead={crossPhaseRead}
                  crossPhaseWrite={crossPhaseWrite}
                />
                <div className="spotlight-controls">
                  {!activeIsCrossPhase && (
                    <button
                      type="button"
                      className="spotlight-na-toggle"
                      onClick={handleToggleNA}
                    >
                      {activeIsNA ? "Mark applicable" : "Mark not applicable"}
                    </button>
                  )}
                  {showNextButton && (
                    <PrimaryButton
                      size="sm"
                      disabled={!canAdvance}
                      title={canAdvance ? "" : "Answer the question or mark it not applicable to continue"}
                      onClick={advance}
                    >
                      Next question →
                    </PrimaryButton>
                  )}
                </div>
              </div>
            );
            return (
              <li
                key={q.key}
                className={`worksheet-question worksheet-question-active${hasRefPanel ? " worksheet-question-with-panel" : ""}`}
                data-question-key={q.key}
              >
                {activeContent}
                {hasRefPanel && <FieldReferencePanel panel={q.referencePanel} />}
              </li>
            );
          }

          // Non-active question — collapsed row showing answer / N/A / pending.
          const qIsCrossPhase = !!q.crossPhaseSource;
          const qValue = getEffectiveQuestionValue(q, data, field.key, crossPhaseRead);
          const qIsNA = (() => {
            if (qIsCrossPhase) {
              const src = q.crossPhaseSource;
              const upstream = typeof crossPhaseRead === "function" ? crossPhaseRead(src.column) : null;
              return !!upstream?.[src.fieldKey]?.[src.questionKey]?.na;
            }
            return isQuestionNA(data, field.key, q.key);
          })();
          // For cumulative-synthesis-table, summary surfaces "X of Y units have
          // meaning" rather than the flattened table text — the latter would
          // dominate the collapsed row visually.
          const qFlat = (() => {
            if (q.kind === "cumulative-synthesis-table") {
              if (!Array.isArray(qValue)) return "";
              const writable = Array.isArray(q.columns)
                ? q.columns.find((c) => !c.readOnly)
                : null;
              if (!writable) return "";
              const total = qValue.length;
              const filled = qValue.filter(
                (r) => r && typeof r[writable.key] === "string" && r[writable.key].trim()
              ).length;
              return total === 0 ? "" : `${filled} of ${total} units have ${writable.label.toLowerCase()}`;
            }
            return flattenAnswerValue(qValue);
          })();
          const isPending = !qIsNA && !qFlat;

          let summary;
          if (qIsNA) {
            summary = <span className="worksheet-field-summary-na">Not applicable</span>;
          } else if (qFlat) {
            summary = qFlat;
          } else {
            summary = <span className="worksheet-field-summary-empty">Not yet answered</span>;
          }

          const cls = [
            "worksheet-question",
            "worksheet-question-collapsed",
            qIsNA ? "worksheet-question-na" : "",
            isPending ? "worksheet-question-pending" : "",
          ].filter(Boolean).join(" ");

          return (
            <li
              key={q.key}
              className={cls}
              data-question-key={q.key}
              role="button"
              tabIndex={0}
              onClick={() => setActiveQKey(q.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveQKey(q.key);
                }
              }}
              aria-label={`Edit question ${idx + 1} of ${questions.length}`}
            >
              <div className="worksheet-question-collapsed-indicator">
                Question {idx + 1} of {questions.length}
              </div>
              <div className="worksheet-field-summary">{summary}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Collapsed field rendering ──────────────────────────────────────────────

function CollapsedField({ field, questions, data, onActivate, crossPhaseRead }) {
  const isMulti = questions.length > 1;
  const fieldFullyComplete = questions.every((q) =>
    isQuestionCompleteFor(q, data, field.key, crossPhaseRead)
  );

  const collapsedClass = [
    "worksheet-field",
    "worksheet-field-collapsed",
    isMulti ? "worksheet-field-collapsed-multi" : "",
    !fieldFullyComplete ? "worksheet-field-collapsed-incomplete" : "",
  ].filter(Boolean).join(" ");

  // Render a per-question line for the multi-question collapsed summary.
  // Cross-phase questions read their value via crossPhaseRead and surface a
  // count-style line for cumulative-synthesis-table.
  const renderQuestionLine = (q) => {
    const isCrossPhase = !!q.crossPhaseSource;
    const v = getEffectiveQuestionValue(q, data, field.key, crossPhaseRead);
    const isNA = (() => {
      if (isCrossPhase) {
        const src = q.crossPhaseSource;
        const upstream = typeof crossPhaseRead === "function" ? crossPhaseRead(src.column) : null;
        return !!upstream?.[src.fieldKey]?.[src.questionKey]?.na;
      }
      return isQuestionNA(data, field.key, q.key);
    })();
    let flat;
    if (q.kind === "cumulative-synthesis-table") {
      if (!Array.isArray(v)) {
        flat = "";
      } else {
        const writable = Array.isArray(q.columns)
          ? q.columns.find((c) => !c.readOnly)
          : null;
        if (!writable || v.length === 0) {
          flat = "";
        } else {
          const filled = v.filter(
            (r) => r && typeof r[writable.key] === "string" && r[writable.key].trim()
          ).length;
          flat = `${filled} of ${v.length} units have ${writable.label.toLowerCase()}`;
        }
      }
    } else {
      flat = flattenAnswerValue(v);
    }
    if (isNA) return <span className="worksheet-field-summary-na">Not applicable</span>;
    if (flat) return flat;
    return <span className="worksheet-field-summary-empty">Not yet answered</span>;
  };

  return (
    <div
      className={collapsedClass}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${field.label}`}
      data-field-key={field.key}
      data-tour-id={fieldKeyToTourId(field.key)}
    >
      <div className="worksheet-field-label">{field.label}</div>
      {isMulti ? (
        <ul className="worksheet-field-multi-summary">
          {questions.map((q) => (
            <li key={q.key} className="worksheet-field-multi-summary-line">
              {renderQuestionLine(q)}
            </li>
          ))}
        </ul>
      ) : (
        <div className="worksheet-field-summary">{renderQuestionLine(questions[0])}</div>
      )}
    </div>
  );
}

// ── SpotlightField (dispatch) ──────────────────────────────────────────────

export function SpotlightField({
  field,
  isActive,
  isLast,
  data,
  onChangeQuestion,
  onToggleQuestionNA,
  onActivate,
  onNextField,
  showOverview,
  onDismissOverview,
  crossPhaseRead,
  crossPhaseWrite,
  hideFutureQuestions = false,
}) {
  const questions = fieldQuestions(field);

  if (!isActive) {
    return (
      <CollapsedField
        field={field}
        questions={questions}
        data={data}
        onActivate={onActivate}
        crossPhaseRead={crossPhaseRead}
      />
    );
  }

  if (showOverview && field.heavyLifting && field.overview) {
    // Wrap so SpotlightWorksheet's scroll-into-view lookup (by data-field-key)
    // can find the active overview screen and center it on first entry.
    return (
      <div data-field-key={field.key}>
        <FieldOverviewScreen
          title={field.overview.title || field.label}
          subtitle={field.overview.subtitle}
          onBegin={onDismissOverview}
        >
          {renderOverviewBody(field.overview)}
        </FieldOverviewScreen>
      </div>
    );
  }

  if (questions.length > 1) {
    return (
      <MultiQuestionActive
        field={field}
        questions={questions}
        data={data}
        onChangeQuestion={onChangeQuestion}
        onToggleQuestionNA={onToggleQuestionNA}
        onNextField={onNextField}
        isLastField={isLast}
        crossPhaseRead={crossPhaseRead}
        crossPhaseWrite={crossPhaseWrite}
        hideFutureQuestions={hideFutureQuestions}
      />
    );
  }

  const q = questions[0];
  return (
    <SingleQuestionActive
      field={field}
      question={q}
      value={getQuestionAnswer(data, field.key, q.key)}
      isNA={isQuestionNA(data, field.key, q.key)}
      onChange={(v) => onChangeQuestion(q.key, v)}
      onToggleNA={() => onToggleQuestionNA(q.key)}
      onNext={onNextField}
      isLast={isLast}
      fieldData={data}
      fieldQuestionsArr={questions}
    />
  );
}

// ── SpotlightWorksheet (top-level) ─────────────────────────────────────────

export default function SpotlightWorksheet({
  fields,
  data,
  onChange,
  onToggleNA,
  legacyNotes,
  sermonId,
  crossPhaseRead,
  crossPhaseWrite,
  hideFutureQuestions = false,
  // External request to spotlight a specific field (e.g., from a click on the
  // ThroughlineRail). The token re-fires the sync effect even when the same
  // key is requested twice in a row; key alone wouldn't change between
  // identical clicks. Both default to null when no rail request is in flight.
  requestedActiveFieldKey = null,
  requestActiveToken = null,
  // Reports the currently-spotlighted field upward so the parent can drive
  // the throughline rail's "current" highlight off the actual active field
  // (instead of a first-incomplete heuristic).
  onActiveFieldKeyChange,
}) {
  const initialActive = useMemo(() => {
    const firstIncomplete = fields.find((f) => {
      const qs = fieldQuestions(f);
      return qs.some((q) => !isQuestionCompleteFor(q, data, f.key, crossPhaseRead));
    });
    return firstIncomplete?.key ?? fields[0]?.key ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [activeKey, setActiveKey] = useState(initialActive);

  // Per-sermon "have I shown this field's overview yet?" tracking. Heavy-
  // lifting fields with an overview render the FieldOverviewScreen on first
  // entry; clicking Begin marks it seen for this sermon. Skipped entirely
  // when sermonId is missing (legacy callers; equivalent to "always seen").
  const [overviewSeen, setOverviewSeen] = useState(() => {
    const seen = new Set();
    if (!sermonId) {
      // No tracking → treat all overviews as already seen.
      for (const f of fields) {
        if (f.heavyLifting && f.overview) seen.add(f.key);
      }
      return seen;
    }
    for (const f of fields) {
      if (!f.heavyLifting || !f.overview) continue;
      try {
        if (typeof localStorage !== "undefined" &&
            localStorage.getItem(overviewSeenKey(sermonId, f.key)) === "1") {
          seen.add(f.key);
        }
      } catch {
        // localStorage unavailable — leave unseen so the overview renders.
      }
    }
    return seen;
  });

  const markOverviewSeen = useCallback((fieldKey) => {
    setOverviewSeen((prev) => {
      if (prev.has(fieldKey)) return prev;
      const next = new Set(prev);
      next.add(fieldKey);
      return next;
    });
    if (sermonId) {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(overviewSeenKey(sermonId, fieldKey), "1");
        }
      } catch {
        // localStorage write failure is non-fatal — in-memory Set still
        // suppresses the overview for the rest of this session.
      }
    }
  }, [sermonId]);

  const advanceToNextField = useCallback((currentKey) => {
    const idx = fields.findIndex((f) => f.key === currentKey);
    if (idx < 0 || idx >= fields.length - 1) return;
    setActiveKey(fields[idx + 1].key);
  }, [fields]);

  // Sync internal active field to an external request (rail click). Depends on
  // requestActiveToken so identical-key clicks re-fire; key alone wouldn't
  // change. The activeKey-change effect below handles the scroll-into-view.
  useEffect(() => {
    if (!requestedActiveFieldKey) return;
    if (!fields.some((f) => f.key === requestedActiveFieldKey)) return;
    setActiveKey(requestedActiveFieldKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestActiveToken]);

  // Report the spotlighted field upward (mount + every change) so the rail
  // can mark it "current". Stable callback identity isn't required — React
  // is happy to re-run when the parent passes the same setter reference.
  useEffect(() => {
    if (typeof onActiveFieldKeyChange === "function") {
      onActiveFieldKeyChange(activeKey);
    }
  }, [activeKey, onActiveFieldKeyChange]);

  // When the active field changes (cross-field advance, single-question Next,
  // collapsed-row click), scroll the new active field into the center of the
  // workspace scroll area. Within-field question advances are handled by
  // MultiQuestionActive's own effect, which targets the active question more
  // precisely; this top-level effect is the safety net for fields that don't
  // mount MultiQuestionActive (single-question fields, FieldOverviewScreen).
  useEffect(() => {
    if (!activeKey || typeof document === "undefined") return;
    const el = document.querySelector(`[data-field-key="${activeKey}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeKey]);

  const handleToggleNA = useCallback((fieldKey, qKey) => {
    const wasNA = isQuestionNA(data, fieldKey, qKey);
    onToggleNA(fieldKey, qKey);
    // For single-question fields, marking N/A advances to the next field
    // (preserves A1.3's complete-the-field gesture). For multi-question
    // fields, the in-field handler manages its own advance-on-NA logic at
    // the question level.
    const field = fields.find((f) => f.key === fieldKey);
    const questions = fieldQuestions(field);
    if (questions.length === 1 && !wasNA) {
      advanceToNextField(fieldKey);
    }
  }, [data, fields, onToggleNA, advanceToNextField]);

  return (
    <div className="structured-worksheet">
      {legacyNotes && (
        <div className="worksheet-legacy">
          <div className="worksheet-legacy-label">Previous notes (before structured fields)</div>
          <div className="worksheet-legacy-content">{legacyNotes}</div>
        </div>
      )}
      {fields.map((f, idx) => (
        <SpotlightField
          key={f.key}
          field={f}
          isActive={f.key === activeKey}
          isLast={idx === fields.length - 1}
          data={data}
          onChangeQuestion={(qKey, value) => onChange(f.key, qKey, value)}
          onToggleQuestionNA={(qKey) => handleToggleNA(f.key, qKey)}
          onActivate={() => setActiveKey(f.key)}
          onNextField={() => advanceToNextField(f.key)}
          showOverview={f.heavyLifting && !!f.overview && !overviewSeen.has(f.key)}
          onDismissOverview={() => markOverviewSeen(f.key)}
          crossPhaseRead={crossPhaseRead}
          crossPhaseWrite={crossPhaseWrite}
          hideFutureQuestions={hideFutureQuestions}
        />
      ))}
    </div>
  );
}
