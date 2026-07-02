import { useCallback, useEffect, useRef } from "react";
import { findField, nextField, prevField, regionFrameFor, REGION_DISPLAY } from "../utils/walkOrder";
import { createOutlinePoint } from "../utils";
import { verseLabelsForRange } from "../utils/passageRef";
import { canvasRowIdsWithCumulativeWork } from "../utils/studyFields";
import PassageCanvas from "./PassageCanvas";
import ReferencePane from "./ReferencePane";
import FieldTeaching from "./FieldTeaching";
import IconButton from "./primitives/IconButton";
import DeleteButton from "./primitives/DeleteButton";
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

// N/A semantics (SADI, ratified): the toggle renders only on questions that
// declare `naAllowed: true` — exactly intro.redemptive_note and
// mps.gospel_check, where "not applicable" means "satisfied another way
// upstream," never "skip." When a question IS marked N/A, the pastor's
// words stay visible (dimmed, struck through) — blanking the textarea read
// as data loss even though the envelope kept the text. The `na && !naAllowed`
// branch keeps the undo reachable for any legacy flag on a now-suppressed
// question.
//
// naLabel (L5, UX audit 2026-07-02): mps.gospel_check and the door
// redemptive_note carry a RULED, STRICTER N/A meaning ("satisfied another
// way upstream") than the Study-question grants' self-explanatory meaning
// ("the text genuinely doesn't carry this"). The bare "not applicable" label
// reads as a generic skip under deadline pressure. When a question's field
// def sets `naLabel`, it overrides the toggle's off-state copy; every other
// naAllowed question keeps the default generic label. Copy-only — no change
// to N/A semantics, storage, or the grant list.
function PromptBlock({ prompt, answer, naAllowed, naLabel, onValueChange, onToggleNA }) {
  const value = answer?.value ?? "";
  const na = answer?.na === true;
  return (
    <div className="sws-prompt-block">
      <div className="sws-prompt">{prompt}</div>
      <AutoGrowTextarea
        value={value}
        onChange={onValueChange}
        disabled={na}
        ariaLabel={prompt}
      />
      {(naAllowed || na) && (
        <IconButton
          type="button"
          className={"sws-na-toggle" + (na ? " is-on" : "")}
          onClick={onToggleNA}
          aria-label="not applicable"
        >
          {na
            ? value.trim()
              ? "not applicable · undo — your words are kept"
              : "not applicable · undo"
            : naLabel || "not applicable"}
        </IconButton>
      )}
    </div>
  );
}

// Per-depth indent for a thought unit's block lines. Shallower than the
// canvas's 32px (PassageCanvas INDENT_PX) — the unit cell is a narrow
// clearing; the indent only has to make the structure legible, not editable.
const BLOCK_INDENT_PX = 18;

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
          <IconButton
            type="button"
            className="sws-unmet-door"
            onClick={() =>
              onPositionChange?.({
                stage: "Study",
                subPhase: "Observe",
                fieldKey: "divisions",
              })
            }
            aria-label="Lay out the passage's structure"
          >
            Lay out the passage's structure →
          </IconButton>
        </div>
      ) : (
        <div className="sws-per-unit">
          {units.map((unit, idx) => {
            // Per-cell N/A (canon §5 2c): the pastor may mark a single thought
            // unit's cell "nothing here" — an active gesture that counts as
            // done. The flag rides beside the value as `<column>_na`; the text
            // is kept (dimmed) so unmarking recovers it. Mirrors PromptBlock's
            // voice — one N/A vocabulary across the app.
            const cellText = String(unit[editableColumn.key] ?? "");
            const na = unit[`${editableColumn.key}_na`] === true;
            return (
              <article key={unit.id ?? idx} className="sws-unit-row">
                {priorColumns.map((col) => {
                  // The thought-unit cell renders the BLOCK — the margin
                  // statement plus its indented lines, labeled with the
                  // verses it spans (ruled 2026-07-02). The margin line
                  // marks where a unit begins; it is not the unit.
                  if (col.key === "thought_unit_text" && Array.isArray(unit.block) && unit.block.length > 0) {
                    return (
                      <div key={col.key} className="sws-unit-prior">
                        <div className="sws-unit-label">
                          {col.label}
                          {unit.verse_span ? ` · ${unit.verse_span}` : ""}
                        </div>
                        <div className="sws-unit-block">
                          {unit.block.map((line, li) => (
                            <div
                              key={li}
                              className="sws-unit-block-line"
                              style={line.depth > 0 ? { paddingLeft: line.depth * BLOCK_INDENT_PX } : undefined}
                            >
                              {line.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  const v = unit[col.key];
                  const isEmpty = v == null || v === "";
                  // Per-cell N/A (canon §5 2c) applies to prior/read-only
                  // columns too — a cell the pastor marked "not applicable"
                  // upstream must render that way here, not as a bare dash
                  // (looks untouched) or as his kept-but-disowned words
                  // (looks like a settled answer). Matches sermonState.js's
                  // cellDisplay "(not applicable)" copy — one N/A vocabulary
                  // across the app.
                  const colNA = unit[`${col.key}_na`] === true;
                  return (
                    <div key={col.key} className="sws-unit-prior">
                      <div className="sws-unit-label">{col.label}</div>
                      <div className={"sws-unit-value" + (isEmpty && !colNA ? " is-empty" : "")}>
                        {colNA ? "(not applicable)" : isEmpty ? "—" : v}
                      </div>
                    </div>
                  );
                })}
                <div className="sws-unit-editable">
                  <div className="sws-unit-label is-active">{editableColumn.label}</div>
                  <AutoGrowTextarea
                    value={cellText}
                    onChange={(v) =>
                      onUnitColumnChange?.(question.key, idx, editableColumn.key, v)
                    }
                    disabled={na}
                    ariaLabel={`Row ${idx + 1} ${editableColumn.label}`}
                    placeholder={editableColumn.placeholder}
                  />
                  <IconButton
                    type="button"
                    className={"sws-na-toggle" + (na ? " is-on" : "")}
                    onClick={() =>
                      onUnitColumnChange?.(question.key, idx, `${editableColumn.key}_na`, !na)
                    }
                    aria-label="not applicable"
                  >
                    {na
                      ? cellText.trim()
                        ? "not applicable · undo — your words are kept"
                        : "not applicable · undo"
                      : "not applicable"}
                  </IconButton>
                </div>
              </article>
            );
          })}
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
                  <IconButton type="button" className="sws-na-toggle" onClick={() => movePoint(idx, -1)} disabled={idx === 0} aria-label="Move point up">↑ up</IconButton>
                  <IconButton type="button" className="sws-na-toggle" onClick={() => movePoint(idx, 1)} disabled={idx === list.length - 1} aria-label="Move point down">↓ down</IconButton>
                  <DeleteButton
                    small
                    label="remove"
                    ariaLabel={`Remove point ${idx + 1}`}
                    confirmLabel="Remove this point — and any Scripture, Explanation, Application, or Illustration written for it?"
                    onDelete={() => removePoint(pt.id)}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <IconButton type="button" className="sws-unmet-door sws-outline-add" onClick={addPoint} aria-label="Add point">
        + Add point
      </IconButton>
    </div>
  );
}

// Manuscript/Body — iterates the outline points (built in Assembly/Outline)
// and renders the four functional elements under each, written to the native
// `functional_elements` column keyed by point id. The cells ARE the
// manuscript body (OEM ruling). Mirrors the CumulativeSynthesisTable's
// "upstream not built yet" door.
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
          <IconButton
            type="button"
            className="sws-unmet-door"
            onClick={() => onPositionChange?.(OUTLINE_POSITION)}
            aria-label="Build the outline"
          >
            Build the outline →
          </IconButton>
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
          <IconButton
            type="button"
            className="sws-unmet-door"
            onClick={() => onPositionChange?.(OUTLINE_POSITION)}
            aria-label="Build the outline"
          >
            Build the outline →
          </IconButton>
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
  onDoorJump,
  returnTo,
  onReturn,
  beforePositionChange,
  onOpenMap,
  onOpenNotebook,
  onOpenFinish,
  highlightQuestion,
  onHighlightDone,
  reference,
  teachingAutoOpen,
  onTeachingSeen,
}) {
  const field = findField(stage, subPhase, fieldKey);
  const questionRefs = useRef({});

  // Map jump → land on the exact question: scroll it to center and flash it
  // once. The class comes off on a timer (and the parent clears the prop via
  // onHighlightDone) so a later jump to the same question flashes again.
  useEffect(() => {
    if (!highlightQuestion) return undefined;
    const el = questionRefs.current[highlightQuestion];
    if (!el) {
      onHighlightDone?.();
      return undefined;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.add("is-flash");
    const t = setTimeout(() => {
      el.classList.remove("is-flash");
      onHighlightDone?.();
    }, 1400);
    return () => clearTimeout(t);
  }, [highlightQuestion, onHighlightDone]);

  // Wrap onPositionChange so every ordinary position-change site (chevron,
  // reference-pane jump) awaits beforePositionChange first. Production wires
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

  // Door jump (the "upstream not built yet" buttons — "Lay out the passage's
  // structure", "Build the outline"). Unlike a chevron step, a door flings the
  // pastor to a far field they'll want to come BACK from, so it carries the
  // current position as the origin. The workspace stashes it and renders the
  // return banner; ordinary navigation clears it. Honors the "come back" the
  // door copy promises (the gap the pastor reported: doors were one-way).
  const handleDoorJump = useCallback(
    async (next) => {
      if (beforePositionChange) await beforePositionChange();
      onDoorJump?.(next, { stage, subPhase, fieldKey });
    },
    [beforePositionChange, onDoorJump, stage, subPhase, fieldKey]
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

  const goBack = useCallback(async () => {
    const prev = prevField({ stage, subPhase, fieldKey });
    if (!prev) return;
    await handleInternalPositionChange({
      stage: prev.stage,
      subPhase: prev.subPhase,
      fieldKey: prev.key,
    });
  }, [stage, subPhase, fieldKey, handleInternalPositionChange]);

  if (!field) {
    // Defensive fallback for a state the current code paths cannot produce —
    // every region has field defs since the OEM build (2026-06-09) and the
    // v33 migration rewrites legacy Equip/Frame positions. If a position
    // ever lands here (corrupted last_touched_position, future bug), give the
    // pastor a humane explanation + the workspace-level Back button as the
    // escape — within-surface nav chrome is deliberately not rendered (no
    // current field to navigate from). Post-sweep audit L2, 2026-05-18.
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
  const hasPrev = !!prevField({ stage, subPhase, fieldKey });

  // Static statement of place above the field name — stage and region only,
  // never movement ("Study · Interpret", not "moving into Interpret"; CORE
  // Process #3 allows static place, bans narration). Manuscript has no
  // sub-phase (the stage doubles as the sub-phase slot), so it collapses
  // to the stage name alone.
  const placeLine =
    stage === subPhase ? stage : `${stage} · ${REGION_DISPLAY[subPhase] ?? subPhase}`;

  // Label for the return banner — the name of the field the pastor jumped FROM
  // via a door. findField resolves every WALK_ORDER field (all door origins);
  // the fallback covers any unexpected position so the banner never goes blank.
  const returnField = returnTo ? findField(returnTo.stage, returnTo.subPhase, returnTo.fieldKey) : null;
  const returnLabel = returnField?.label || "where you were";

  const renderQuestion = (q) => {
    if (q.kind === "cumulative-synthesis-table") {
      return (
        <CumulativeSynthesisTable
          question={q}
          thoughtUnits={thoughtUnits}
          onUnitColumnChange={onUnitColumnChange}
          onPositionChange={handleDoorJump}
        />
      );
    }
    if (q.kind === "indented-canvas") {
      const rows = answers[q.key]?.value;
      // Prepopulate the gutter with the passage's verse numbers (single-chapter
      // bare, cross-chapter labeled at the seam; unparseable yields [] → blank
      // canvas). Deterministic lookup off the reference — no ESV fetch, no AI.
      const seedVerses = verseLabelsForRange(reference?.passage, null);
      return (
        <div className="sws-prompt-block">
          <div className="sws-prompt">{q.prompt}</div>
          <PassageCanvas
            rows={Array.isArray(rows) ? rows : []}
            seedVerses={seedVerses}
            onChange={(next) => onCanvasChange?.(field.key, q.key, next)}
            rowIdsWithWork={canvasRowIdsWithCumulativeWork(thoughtUnits)}
          />
        </div>
      );
    }
    if (q.kind === "outline-builder") {
      return (
        <OutlineBuilder
          question={q}
          points={outlinePoints}
          onChange={onOutlineChange}
        />
      );
    }
    if (q.kind === "functional-elements") {
      return (
        <FunctionalElementsEditor
          question={q}
          points={outlinePoints}
          functionalElements={functionalElements}
          onChange={onFunctionalElementChange}
          onPositionChange={handleDoorJump}
        />
      );
    }
    if (q.kind === "manuscript-transitions") {
      return (
        <ManuscriptTransitions
          question={q}
          points={outlinePoints}
          manuscript={manuscript}
          onChange={onManuscriptChange}
          onPositionChange={handleDoorJump}
        />
      );
    }
    if (q.kind === "manuscript-prose") {
      // Native-column prose: the manuscript column stores plain strings, so the
      // N/A flag lives beside the value as a "<key>_na" sidecar (only the
      // transplanted introduction.redemptive_note declares naAllowed). Synthesize
      // the {value, na} envelope PromptBlock expects; the toggle writes the
      // sidecar. Reusing PromptBlock keeps the N/A voice in one place.
      const v = manuscript?.[q.section]?.[q.key] ?? "";
      const na = manuscript?.[q.section]?.[`${q.key}_na`] === true;
      return (
        <PromptBlock
          prompt={q.prompt}
          answer={{ value: v, na }}
          naAllowed={q.naAllowed === true}
          naLabel={q.naLabel}
          onValueChange={(val) => onManuscriptChange?.(q.section, q.key, val)}
          onToggleNA={() => onManuscriptChange?.(q.section, `${q.key}_na`, !na)}
        />
      );
    }
    return (
      <PromptBlock
        prompt={q.prompt}
        naLabel={q.naLabel}
        naAllowed={q.naAllowed === true}
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
  };

  return (
    <div className="sws-shell">
      {reference && (
        <ReferencePane
          stage={stage}
          subPhase={subPhase}
          fieldKey={fieldKey}
          passage={reference.passage}
          outcomes={reference.outcomes}
          mpt={reference.mpt}
          mps={reference.mps}
          outlinePoints={outlinePoints}
          functionalElements={functionalElements}
          pastoralContext={reference.pastoralContext}
          onJump={handleInternalPositionChange}
        />
      )}
      <main className="sws-writing">
        <div className="sws-field">
          {returnTo && (
            <IconButton
              type="button"
              className="sws-return"
              onClick={onReturn}
              aria-label={`Return to ${returnLabel}`}
            >
              ↩ Return to {returnLabel}
            </IconButton>
          )}
          <div className="sws-place">{placeLine}</div>
          {(() => {
            const frame = regionFrameFor(stage, subPhase, fieldKey);
            return frame ? <div className="sws-region-frame">{frame}</div> : null;
          })()}
          {field.label && <div className="sws-field-name">{field.label}</div>}
          {field.overview && (
            <FieldTeaching
              key={`teach:${stage}/${subPhase}/${fieldKey}`}
              overview={field.overview}
              autoOpen={teachingAutoOpen}
              onAutoOpenEnd={onTeachingSeen}
            />
          )}
          {field.hint && <div className="sws-field-hint">{field.hint}</div>}
          {field.questions.map((q) => (
            <div
              key={q.key}
              className="sws-qblock"
              ref={(el) => {
                if (el) questionRefs.current[q.key] = el;
                else delete questionRefs.current[q.key];
              }}
            >
              {renderQuestion(q)}
            </div>
          ))}
        </div>
      </main>

      {onOpenNotebook && (
        <IconButton
          type="button"
          className="sws-notebook-summon"
          onClick={onOpenNotebook}
          aria-label="Open notebook"
        >
          Notebook
        </IconButton>
      )}

      {/* Walk navigation. Back mirrors the chevron in reverse (free
          navigation both ways — the walk is an ordering, not a ratchet).
          At the end of the walk the forward control becomes the door to the
          completion threshold instead of silently greying out (the audit's
          worst dead end). SermonFinish is re-openable, never one-shot. */}
      <div className="sws-nav">
        {hasPrev && (
          <IconButton
            type="button"
            className="sws-back"
            onClick={goBack}
            aria-label="Previous field"
          >
            ← Back
          </IconButton>
        )}
        {hasNext ? (
          <IconButton
            type="button"
            className="sws-forward"
            onClick={advance}
            aria-label="Next field"
          >
            Next →
          </IconButton>
        ) : (
          <IconButton
            type="button"
            className="sws-forward is-finish"
            onClick={onOpenFinish}
            aria-label="Finish sermon"
          >
            Finish sermon →
          </IconButton>
        )}
      </div>

      <IconButton
        type="button"
        className="sws-map-summon"
        onClick={onOpenMap}
        aria-label="Open map"
        title="Open map"
      >
        <span className="sws-map-summon-icon" aria-hidden="true">☰</span>
        Map
      </IconButton>
    </div>
  );
}
