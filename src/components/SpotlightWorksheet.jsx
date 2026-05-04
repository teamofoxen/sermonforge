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
import ParaphraseBlocks from "./ParaphraseBlocks";
import SynthesisTable from "./SynthesisTable";
import PeripheralReferencePanel from "./PeripheralReferencePanel";
import {
  fieldQuestions,
  getQuestionAnswer,
  isQuestionNA,
  flattenAnswerValue,
} from "../utils/studyFields";

// Find the canvas-kind question's value within a field's data sub-tree.
// Structured-exercise sub-shapes that depend on the canvas (paraphrase blocks,
// synthesis table) read it here rather than coupling to a hard-coded sibling
// key — the question with `kind: "canvas"` is the source of truth.
function findCanvasValue(questions, fieldData, fieldKey) {
  const canvasQ = questions.find((q) => q.kind === "canvas");
  if (!canvasQ) return [];
  const v = getQuestionAnswer(fieldData, fieldKey, canvasQ.key);
  return Array.isArray(v) ? v : [];
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

function isQuestionComplete(data, fieldKey, questionKey) {
  if (isQuestionNA(data, fieldKey, questionKey)) return true;
  return !!flattenAnswerValue(getQuestionAnswer(data, fieldKey, questionKey));
}

// First incomplete question for a field, mirroring A1.1's first-incomplete-
// field selection. Returns the first question's key when all are answered
// or N/A — caller decides whether to render that as "active by default".
export function firstIncompleteQuestionKey(questions, data, fieldKey) {
  for (const q of questions) {
    if (!isQuestionComplete(data, fieldKey, q.key)) return q.key;
  }
  return questions[0]?.key ?? null;
}

// ── Single-question active rendering (A1.1 back-compat path) ──────────────

function SingleQuestionActive({
  field,
  question,
  value,
  isNA,
  onChange,
  onToggleNA,
  onNext,
  isLast,
}) {
  const taRef = useRef(null);
  useEffect(() => {
    if (taRef.current) {
      taRef.current.focus();
      const len = taRef.current.value.length;
      taRef.current.setSelectionRange(len, len);
    }
  }, []);

  const canAdvance = isNA || !!String(value || "").trim();
  return (
    <div className={`worksheet-field worksheet-field-active${isNA ? " worksheet-field-na" : ""}`}>
      <label className="worksheet-field-label">{field.label}</label>
      <textarea
        className="field-textarea"
        rows={3}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onInput={(e) => autoResize(e.target)}
        ref={(el) => { taRef.current = el; autoResize(el); }}
        placeholder={question.prompt || field.hint || ""}
        disabled={isNA}
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
}) {
  const kind = question.kind || "textarea";

  if (kind === "canvas") {
    return (
      <IndentedSentenceCanvas
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        disabled={isNA}
      />
    );
  }
  if (kind === "paraphrase") {
    const canvas = findCanvasValue(fieldQuestionsArr, fieldData, field.key);
    return (
      <ParaphraseBlocks
        canvas={canvas}
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        disabled={isNA}
      />
    );
  }
  if (kind === "synthesis-table") {
    const canvas = findCanvasValue(fieldQuestionsArr, fieldData, field.key);
    return (
      <SynthesisTable
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        canvas={canvas}
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
}) {
  const initialActiveQ = useMemo(
    () => firstIncompleteQuestionKey(questions, data, field.key),
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
  }, [activeQKey]);

  // Defensive: if activeQKey somehow falls out of the questions list, snap
  // back to the first question.
  const safeActiveIdx = (() => {
    const i = questions.findIndex((q) => q.key === activeQKey);
    return i >= 0 ? i : 0;
  })();
  const activeQ = questions[safeActiveIdx];
  const activeValue = getQuestionAnswer(data, field.key, activeQ.key);
  const activeIsNA = isQuestionNA(data, field.key, activeQ.key);
  const canAdvance = activeIsNA || !!flattenAnswerValue(activeValue);
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
    >
      <label className="worksheet-field-label">{field.label}</label>
      <ol className="worksheet-questions">
        {questions.map((q, idx) => {
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
                />
                <div className="spotlight-controls">
                  <button
                    type="button"
                    className="spotlight-na-toggle"
                    onClick={handleToggleNA}
                  >
                    {activeIsNA ? "Mark applicable" : "Mark not applicable"}
                  </button>
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
          const qValue = getQuestionAnswer(data, field.key, q.key);
          const qIsNA = isQuestionNA(data, field.key, q.key);
          const qFlat = flattenAnswerValue(qValue);
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

function CollapsedField({ field, questions, data, onActivate }) {
  const isMulti = questions.length > 1;
  const fieldFullyComplete = questions.every((q) => isQuestionComplete(data, field.key, q.key));

  const collapsedClass = [
    "worksheet-field",
    "worksheet-field-collapsed",
    isMulti ? "worksheet-field-collapsed-multi" : "",
    !fieldFullyComplete ? "worksheet-field-collapsed-incomplete" : "",
  ].filter(Boolean).join(" ");

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
    >
      <div className="worksheet-field-label">{field.label}</div>
      {isMulti ? (
        <ul className="worksheet-field-multi-summary">
          {questions.map((q) => {
            const v = getQuestionAnswer(data, field.key, q.key);
            const isNA = isQuestionNA(data, field.key, q.key);
            const flat = flattenAnswerValue(v);
            let line;
            if (isNA) line = <span className="worksheet-field-summary-na">Not applicable</span>;
            else if (flat) line = flat;
            else line = <span className="worksheet-field-summary-empty">Not yet answered</span>;
            return (
              <li key={q.key} className="worksheet-field-multi-summary-line">
                {line}
              </li>
            );
          })}
        </ul>
      ) : (() => {
        const q = questions[0];
        const v = getQuestionAnswer(data, field.key, q.key);
        const isNA = isQuestionNA(data, field.key, q.key);
        const flat = flattenAnswerValue(v);
        let summary;
        if (isNA) summary = <span className="worksheet-field-summary-na">Not applicable</span>;
        else if (flat) summary = flat;
        else summary = <span className="worksheet-field-summary-empty">Not yet answered</span>;
        return <div className="worksheet-field-summary">{summary}</div>;
      })()}
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
}) {
  const questions = fieldQuestions(field);

  if (!isActive) {
    return (
      <CollapsedField
        field={field}
        questions={questions}
        data={data}
        onActivate={onActivate}
      />
    );
  }

  if (showOverview && field.heavyLifting && field.overview) {
    return (
      <FieldOverviewScreen
        title={field.overview.title || field.label}
        subtitle={field.overview.subtitle}
        onBegin={onDismissOverview}
      >
        {renderOverviewBody(field.overview)}
      </FieldOverviewScreen>
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
}) {
  const initialActive = useMemo(() => {
    const firstIncomplete = fields.find((f) => {
      const qs = fieldQuestions(f);
      return qs.some((q) => !isQuestionComplete(data, f.key, q.key));
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
        />
      ))}
    </div>
  );
}
