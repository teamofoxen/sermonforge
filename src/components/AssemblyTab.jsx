// AssemblyTab — the Assembly stage of the sermon workspace.
//
// Four sub-phases producing four named outcomes:
//
//   1. Anchor  — MPT (draft, tighten) + MPS (translate, gospel-check, tighten)
//                → Main Point Pair
//   2. Outline — body outline (N points serving the MPS)        → Sermon Outline
//   3. Equip   — FE per outline point (Scripture / E / A / I)   → Sermon Body
//   4. Frame   — Intro (4Q) + Conclusion (4Q)                   → Sermon Frame
//
// The pastor lands in Manuscript with all four named outcomes assembled.

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTour } from "../contexts/TourContext";
import {
  parseStructuredField, serializeStructuredField,
  setQuestionAnswer, setQuestionNA, isQuestionNA, DEFAULT_QUESTION_KEY,
  getQuestionString,
} from "../utils/studyFields";
import { MAIN_POINT_PAIR_FIELDS } from "../utils/sadiAnchorFields";
import { SERMON_FRAME_FIELDS } from "../utils/sermonFrameFields";
import { getOutline, serializeOutline, getFunctionalElements, serializeFunctionalElements, autoResize } from "../utils";
import SpotlightWorksheet from "./SpotlightWorksheet";
import OutlineBuilder from "./OutlineBuilder";
import AdvanceGateChecklist from "./AdvanceGateChecklist";
import NotebookPanel from "./NotebookPanel";
import FeedbackFlag from "./FeedbackFlag";
import AssemblyTrail from "./AssemblyTrail";
import PrimaryButton from "./primitives/PrimaryButton";
import { STAGE, SUB_PHASE, ContractViolation } from "../core/contracts";
import { transitionState } from "../core/spine";
import {
  canonicalSubPhase,
  buildSubPhaseEvidence, buildStageEvidence,
  evaluateAdvance, formatAdvanceRejection,
} from "../utils/studyAdvancement";

const SUB_PHASE_LABELS = ["Anchor", "Outline", "Equip", "Frame"];
const SUB_PHASE_NAMED_OUTCOMES = ["Main Point Pair", "Sermon Outline", "Sermon Body", "Sermon Frame"];

function CollapseArrow({ open }) {
  return (
    <svg
      width="14" height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function FuncElem({ pointText, pointId, displayIndex, funcData, onUpdate, onUpdateText }) {
  const data = funcData[pointId] || { explanation: "", application: "", illustration: "", scripture: "" };
  const [open, setOpen] = useState(() => !!(data.explanation || data.application || data.illustration || data.scripture));

  function update(field, val) {
    onUpdate(pointId, { ...data, [field]: val });
  }

  return (
    <div className="func-elem">
      <div className="func-elem-header" onClick={() => setOpen((v) => !v)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ color: "var(--gold)", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", marginRight: "8px", flexShrink: 0 }}>{displayIndex + 1}.</span>
            <input
              value={pointText || ""}
              onChange={(e) => onUpdateText?.(pointId, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                fontFamily: "inherit", fontSize: "14px", fontWeight: 600,
                color: "var(--ink-mid)", cursor: "text", padding: 0, minWidth: 0,
              }}
              placeholder={`Point ${displayIndex + 1}`}
            />
          </div>
          {!open && data.explanation && (
            <div style={{ fontSize: "12px", color: "var(--ink-ghost)", marginTop: "3px", paddingLeft: "22px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data.explanation.length > 90 ? data.explanation.slice(0, 90) + "…" : data.explanation}
            </div>
          )}
        </div>
        <CollapseArrow open={open} />
      </div>
      {open && (
        <div className="func-elem-body">
          <div>
            <div className="func-field-label">Scripture <span style={{ color: "var(--slate, #5a7a8a)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>(ESV)</span></div>
            <textarea
              className="field-textarea"
              style={{ minHeight: "60px", fontFamily: "var(--font-serif)", fontSize: "15px", fontStyle: "italic" }}
              value={data.scripture}
              onChange={(e) => update("scripture", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="Paste the passage text for this point (ESV)."
            />
          </div>
          <div>
            <div className="func-field-label">Explanation <span style={{ color: "var(--gold)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>(E)</span></div>
            <textarea
              className="field-textarea"
              style={{ minHeight: "80px" }}
              value={data.explanation}
              onChange={(e) => update("explanation", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="How does this point emerge from the text? Ground it exegetically."
            />
          </div>
          <div>
            <div className="func-field-label">Application <span style={{ color: "var(--crimson-soft)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>(A)</span></div>
            <textarea
              className="field-textarea"
              style={{ minHeight: "80px" }}
              value={data.application}
              onChange={(e) => update("application", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="What does this point ask of the congregation? Make it specific."
            />
          </div>
          <div>
            <div className="func-field-label">Illustration <span style={{ color: "var(--sage)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>(I)</span></div>
            <textarea
              className="field-textarea"
              style={{ minHeight: "60px" }}
              value={data.illustration}
              onChange={(e) => update("illustration", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="What story, image, or example makes this point land?"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssemblyTab({ sermon, onUpdate, onTabChange, onMovement }) {
  const { active: tourActive, desiredUi } = useTour();
  const [activeSubPhase, setActiveSubPhase] = useState(() => {
    const saved = localStorage.getItem(`sermonforge_assembly_subphase_${sermon.id}`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [advanceError, setAdvanceError] = useState(null);
  // Trail suppression — pastor exits the trail via × / Esc; the legacy
  // sub-phase tab strip renders until re-entry via "Trail mode →".
  const [trailSuppressed, setTrailSuppressed] = useState(false);

  useEffect(() => {
    localStorage.setItem(`sermonforge_assembly_subphase_${sermon.id}`, activeSubPhase);
  }, [activeSubPhase, sermon.id]);

  useEffect(() => {
    if (!tourActive || !desiredUi) return;
    if (typeof desiredUi.assemblySubPhase === "number" && desiredUi.assemblySubPhase !== activeSubPhase) {
      setActiveSubPhase(desiredUi.assemblySubPhase);
    }
  }, [tourActive, desiredUi, activeSubPhase]);

  // Pause-point state. Shape:
  //   { priorSubPhase: 1|2|3|4, nextKey: 2|3|4|"manuscript", priorSummaryKey: ... }
  // priorSubPhase is the Assembly sub-phase that just completed.
  const [pausePoint, setPausePointRaw] = useState(null);

  // Dismissing the Assembly → Manuscript pause is what flips the workspace
  // tab forward — clearing the pause IS the act of crossing the boundary.
  const setPausePoint = useCallback((val) => {
    if (val === null && pausePoint && pausePoint.nextKey === "manuscript") {
      onTabChange?.(STAGE.Manuscript);
    }
    setPausePointRaw(val);
  }, [pausePoint, onTabChange]);

  // Structured field data per sub-phase.
  const mppData = useMemo(() => parseStructuredField(sermon.main_point_pair), [sermon.main_point_pair]);
  const frameData = useMemo(() => parseStructuredField(sermon.sermon_frame), [sermon.sermon_frame]);
  const outline = useMemo(() => getOutline(sermon), [sermon.outline]);
  const funcData = useMemo(() => getFunctionalElements(sermon), [sermon.functional_elements]);

  // Anchor sub-phase writers (v19 main_point_pair envelope with flat-column mirrors).
  const updateMPP = useCallback((fieldKey, qKey, value) => {
    const next = setQuestionAnswer(mppData, fieldKey, qKey || DEFAULT_QUESTION_KEY, value);
    const updates = { main_point_pair: serializeStructuredField(next) };
    if (fieldKey === "mpt" && qKey === "tighten") updates.mpt = typeof value === "string" ? value : "";
    else if (fieldKey === "mps" && qKey === "tighten") updates.mps = typeof value === "string" ? value : "";
    onUpdate(updates);
  }, [mppData, onUpdate]);

  const toggleMPPNa = useCallback((fieldKey, qKey) => {
    const wasNA = isQuestionNA(mppData, fieldKey, qKey || DEFAULT_QUESTION_KEY);
    const next = setQuestionNA(mppData, fieldKey, qKey || DEFAULT_QUESTION_KEY, !wasNA);
    onUpdate({ main_point_pair: serializeStructuredField(next) });
  }, [mppData, onUpdate]);

  // Frame sub-phase writers (sermon_frame envelope).
  const updateFrame = useCallback((fieldKey, qKey, value) => {
    const next = setQuestionAnswer(frameData, fieldKey, qKey || DEFAULT_QUESTION_KEY, value);
    onUpdate({ sermon_frame: serializeStructuredField(next) });
  }, [frameData, onUpdate]);

  const toggleFrameNA = useCallback((fieldKey, qKey) => {
    const wasNA = isQuestionNA(frameData, fieldKey, qKey || DEFAULT_QUESTION_KEY);
    const next = setQuestionNA(frameData, fieldKey, qKey || DEFAULT_QUESTION_KEY, !wasNA);
    onUpdate({ sermon_frame: serializeStructuredField(next) });
  }, [frameData, onUpdate]);

  // Outline / FE writers.
  const handleOutlineChange = useCallback((newOutline) => {
    onUpdate({ outline: serializeOutline(newOutline) });
  }, [onUpdate]);

  const handleOutlineRemove = useCallback((pointId) => {
    const cleaned = { ...funcData };
    delete cleaned[pointId];
    onUpdate({ functional_elements: serializeFunctionalElements(cleaned) });
  }, [funcData, onUpdate]);

  const updateFuncData = useCallback((pointId, data) => {
    onUpdate({ functional_elements: serializeFunctionalElements({ ...funcData, [pointId]: data }) });
  }, [funcData, onUpdate]);

  const handleUpdateOutlineText = useCallback((id, text) => {
    const updated = outline.map(p => p.id === id ? { ...p, text } : p);
    onUpdate({ outline: serializeOutline(updated) });
  }, [outline, onUpdate]);

  // Spine-routed sub-phase transitions. Sub-phase 4 (Frame) advance is the
  // Assembly → Manuscript stage transition; sub-phases 1–3 are within-Assembly.
  async function advanceSubPhase() {
    setAdvanceError(null);
    const next = activeSubPhase + 1;

    if (next > 4) {
      const evidence = buildStageEvidence(sermon, STAGE.Assembly);
      try {
        await transitionState({
          sermonId: sermon.id,
          to: STAGE.Manuscript,
          evidence,
          direction: "forward",
        });
      } catch (e) {
        if (e instanceof ContractViolation) {
          setAdvanceError(formatAdvanceRejection(e));
          return;
        }
        throw e;
      }
      onMovement?.({ from: STAGE.Assembly, to: STAGE.Manuscript, kind: "stage" });
      // Show the four-named-outcome summary; tab change runs on dismiss.
      setPausePoint({ priorSubPhase: 4, nextKey: "manuscript", priorSummaryKey: null });
      return;
    }

    const fromSubPhase = canonicalSubPhase(activeSubPhase, STAGE.Assembly);
    const toSubPhase = canonicalSubPhase(next, STAGE.Assembly);
    const evidence = buildSubPhaseEvidence(sermon, fromSubPhase);
    try {
      await transitionState({
        sermonId: sermon.id,
        to: toSubPhase,
        evidence,
        direction: "forward",
      });
    } catch (e) {
      if (e instanceof ContractViolation) {
        setAdvanceError(formatAdvanceRejection(e));
        return;
      }
      throw e;
    }
    onMovement?.({ from: fromSubPhase, to: toSubPhase, kind: "sub_phase" });
    setActiveSubPhase(next);
    setPausePoint({ priorSubPhase: activeSubPhase, nextKey: next, priorSummaryKey: null });
  }

  async function jumpToSubPhase(phase) {
    setAdvanceError(null);
    if (phase === activeSubPhase) return;

    const fromSubPhase = canonicalSubPhase(activeSubPhase, STAGE.Assembly);
    const toSubPhase = canonicalSubPhase(phase, STAGE.Assembly);
    const direction = phase > activeSubPhase ? "forward" : "backward";
    const evidence = buildSubPhaseEvidence(sermon, fromSubPhase);
    try {
      await transitionState({
        sermonId: sermon.id,
        to: toSubPhase,
        evidence,
        direction,
      });
    } catch (e) {
      if (e instanceof ContractViolation) {
        setAdvanceError(formatAdvanceRejection(e));
        return;
      }
      throw e;
    }
    onMovement?.({ from: fromSubPhase, to: toSubPhase, kind: "sub_phase" });
    setActiveSubPhase(phase);
    setPausePoint(null);
  }

  // Cross-stage look-back — Assembly's first sub-phase (Anchor) looking
  // back goes to Study. The parent owns tab routing; we ask it to switch.
  async function jumpToStudy() {
    setAdvanceError(null);
    const evidence = buildStageEvidence(sermon, STAGE.Assembly);
    try {
      await transitionState({
        sermonId: sermon.id,
        to: STAGE.Study,
        evidence,
        direction: "backward",
      });
    } catch (e) {
      if (e instanceof ContractViolation) {
        setAdvanceError(formatAdvanceRejection(e));
        return;
      }
      throw e;
    }
    onMovement?.({ from: STAGE.Assembly, to: STAGE.Study, kind: "stage" });
    onTabChange?.(STAGE.Study);
  }

  const subPhaseSufficiency = evaluateAdvance(sermon, "sub_phase", activeSubPhase, STAGE.Assembly);

  // The Assembly trail spans all four sub-phases (Anchor / Outline / Equip
  // / Frame) as one switchback. trail-suppressed pastors and localStorage
  // `sermonforge_trail_disabled=1` fall through to the sub-phase tab strip.
  const trailDisabledByFlag =
    typeof window !== "undefined" &&
    window.localStorage &&
    window.localStorage.getItem("sermonforge_trail_disabled") === "1";
  const showAssemblyTrail = !trailSuppressed && !trailDisabledByFlag;

  if (showAssemblyTrail) {
    return (
      <AssemblyTrail
        sermon={sermon}
        activeSubPhase={activeSubPhase}
        mppData={mppData}
        updateMPP={updateMPP}
        toggleMPPNa={toggleMPPNa}
        frameData={frameData}
        updateFrame={updateFrame}
        toggleFrameNA={toggleFrameNA}
        outline={outline}
        funcData={funcData}
        onOutlineChange={handleOutlineChange}
        onOutlineRemove={handleOutlineRemove}
        onOutlineTextChange={handleUpdateOutlineText}
        onFuncDataChange={updateFuncData}
        pausePoint={pausePoint}
        setPausePoint={setPausePoint}
        subPhaseSufficiency={subPhaseSufficiency}
        advanceSubPhase={advanceSubPhase}
        jumpToSubPhase={jumpToSubPhase}
        jumpToStudy={jumpToStudy}
        onExit={() => setTrailSuppressed(true)}
      />
    );
  }

  // Legacy / pre-trail rendering for Outline / Equip / Frame sub-phases.
  return (
    <div className="study-tab-shell">
      <div style={{ position: "relative", padding: "12px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", gap: "8px" }} role="tablist" aria-label="Assembly sub-phase">
            {SUB_PHASE_LABELS.map((label, idx) => {
              const phaseNum = idx + 1;
              const isActive = activeSubPhase === phaseNum;
              return (
                /* eslint-disable-next-line sermonforge/no-raw-button */
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => jumpToSubPhase(phaseNum)}
                  style={{
                    background: isActive ? "var(--ink)" : "transparent",
                    color: isActive ? "var(--parchment)" : "var(--ink-mid)",
                    border: `1px solid ${isActive ? "var(--ink)" : "var(--parchment-deep)"}`,
                    padding: "6px 14px",
                    borderRadius: "2px",
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: "10px",
                    letterSpacing: "0.18em",
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  {phaseNum}. {label}
                </button>
              );
            })}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "12px", alignItems: "center" }}>
            {trailSuppressed && (
              /* eslint-disable-next-line sermonforge/no-raw-button */
              <button
                type="button"
                onClick={() => setTrailSuppressed(false)}
                title="Re-enter Assembly trail"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(212, 160, 23, 0.4)",
                  borderRadius: "2px",
                  padding: "6px 12px",
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: "10px",
                  letterSpacing: "0.18em",
                  color: "var(--gold)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                Trail mode →
              </button>
            )}
            <FeedbackFlag surface="assembly-tab" sermonId={sermon?.id ?? null} step={activeSubPhase ?? null} />
          </div>
        </div>
      </div>

      <div style={{ padding: "0 24px 24px" }}>
        {advanceError && (
          <div
            data-testid="advance-error"
            role="alert"
            aria-live="polite"
            onClick={() => setAdvanceError(null)}
            style={{
              background: "var(--parchment-warm)",
              borderLeft: "3px solid var(--gold)",
              padding: "8px 16px",
              margin: "8px 0",
              fontSize: "13px",
              color: "var(--ink-mid)",
              cursor: "pointer",
            }}
          >
            {advanceError}
          </div>
        )}

        {/* Step-boundary pause — summary of the four Assembly named outcomes
            before crossing into Manuscript. */}
        {pausePoint && pausePoint.nextKey === "manuscript" && (
          <AssemblyToManuscriptPause
            sermon={sermon}
            mppData={mppData}
            frameData={frameData}
            outline={outline}
            funcData={funcData}
            onDismiss={() => setPausePoint(null)}
          />
        )}

        {/* Anchor sub-phase — tab rendering when trail is suppressed. */}
        {!pausePoint && activeSubPhase === 1 && (
          <div data-tour-id="mpt-field">
            <SpotlightWorksheet
              fields={MAIN_POINT_PAIR_FIELDS}
              data={mppData}
              onChange={updateMPP}
              onToggleNA={toggleMPPNa}
              sermonId={sermon.id}
            />
            <div className="step-advance">
              <PrimaryButton
                size="sm"
                onClick={advanceSubPhase}
                disabled={!subPhaseSufficiency.ok}
                title={subPhaseSufficiency.reason || ""}
              >
                Continue to Outline →
              </PrimaryButton>
              <AdvanceGateChecklist sufficiency={subPhaseSufficiency} />
            </div>
          </div>
        )}

        {/* Outline sub-phase. */}
        {!pausePoint && activeSubPhase === 2 && (
          <div data-tour-id="outline-builder">
            <OutlineReference sermon={sermon} outline={outline} fe={funcData} />
            <OutlineBuilder
              outline={outline}
              onUpdate={handleOutlineChange}
              onRemove={handleOutlineRemove}
            />
            <div className="step-advance">
              <PrimaryButton
                size="sm"
                onClick={advanceSubPhase}
                disabled={!subPhaseSufficiency.ok}
                title={subPhaseSufficiency.reason || ""}
              >
                Continue to Equip →
              </PrimaryButton>
              <AdvanceGateChecklist sufficiency={subPhaseSufficiency} />
            </div>
          </div>
        )}

        {/* Equip sub-phase. */}
        {!pausePoint && activeSubPhase === 3 && (
          <div data-tour-id="functional-elements">
            <OutlineReference sermon={sermon} outline={outline} fe={funcData} />
            {outline.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--ink-ghost)", fontStyle: "italic" }}>
                No outline points yet. Add points in the Outline sub-phase first.
              </div>
            ) : (
              outline.map((pt, i) => (
                <FuncElem
                  key={pt.id}
                  pointText={pt.text}
                  pointId={pt.id}
                  displayIndex={i}
                  funcData={funcData}
                  onUpdate={updateFuncData}
                  onUpdateText={handleUpdateOutlineText}
                />
              ))
            )}
            <div className="step-advance">
              <PrimaryButton
                size="sm"
                onClick={advanceSubPhase}
                disabled={!subPhaseSufficiency.ok}
                title={subPhaseSufficiency.reason || ""}
              >
                Continue to Frame →
              </PrimaryButton>
              <AdvanceGateChecklist sufficiency={subPhaseSufficiency} />
            </div>
          </div>
        )}

        {/* Frame sub-phase. */}
        {!pausePoint && activeSubPhase === 4 && (
          <div data-tour-id="frame-worksheet">
            <SpotlightWorksheet
              fields={SERMON_FRAME_FIELDS}
              data={frameData}
              onChange={updateFrame}
              onToggleNA={toggleFrameNA}
              sermonId={sermon.id}
            />
            <div className="step-advance">
              <PrimaryButton
                size="sm"
                onClick={advanceSubPhase}
                disabled={!subPhaseSufficiency.ok}
                title={subPhaseSufficiency.reason || ""}
              >
                Continue to Manuscript →
              </PrimaryButton>
              <AdvanceGateChecklist sufficiency={subPhaseSufficiency} />
            </div>
          </div>
        )}

        <NotebookPanel
          value={sermon.notebook_blueprint}
          onChange={(value) => onUpdate({ notebook_blueprint: value })}
          label="Assembly Notebook"
          placeholder="Free-form notes for your assembly thinking — alternate orderings, points to test, things to revisit."
        />
      </div>
    </div>
  );
}

// Step-boundary pause: shows the four Assembly named outcomes as a final
// review (Main Point Pair, Sermon Outline, Sermon Body, Sermon Frame)
// before the pastor crosses into Manuscript.
function AssemblyToManuscriptPause({ sermon, mppData, frameData, outline, funcData, onDismiss }) {
  const mptTightened = getQuestionString(mppData, "mpt", "tighten") || sermon.mpt || "";
  const mpsTightened = getQuestionString(mppData, "mps", "tighten") || sermon.mps || "";
  const introHook = getQuestionString(frameData, "intro", "hook");
  const conclusionLand = getQuestionString(frameData, "conclusion", "land_call");

  return (
    <div style={{
      background: "var(--parchment-warm)",
      border: "1px solid var(--parchment-deep)",
      borderRadius: "2px",
      padding: "36px 44px",
      maxWidth: "820px",
      margin: "40px auto",
      boxShadow: "var(--shadow-soft)",
    }}>
      {/* Gold-bright hairline marker — matches the in-trail stage-boundary
          pause so the visual register stays continuous if the pastor exits
          the trail. */}
      <div style={{
        width: "88px",
        height: "2px",
        background: "var(--gold-bright)",
        opacity: 0.85,
        marginBottom: "20px",
      }} aria-hidden="true" />
      <div style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: "11px",
        letterSpacing: "0.4em",
        color: "var(--gold-bright)",
        marginBottom: "20px",
        textTransform: "uppercase",
      }}>
        A threshold — Assembly is built
      </div>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: "italic",
        fontWeight: 400,
        fontSize: "44px",
        lineHeight: 1.15,
        color: "var(--ink)",
        margin: "0 0 14px",
      }}>
        The sermon stands.
      </h2>
      <p style={{
        fontSize: "16px",
        lineHeight: 1.55,
        color: "var(--ink-soft)",
        margin: "0 0 28px",
        maxWidth: "620px",
      }}>
        Read the four pieces you've assembled. If anything still rings
        off, walk back and refine. Otherwise, cross into the writing room.
      </p>

      <OutcomeRow label="MAIN POINT PAIR">
        <div style={{ fontStyle: "italic", color: "var(--ink-mid)" }}>{mptTightened || <em>MPT not written</em>}</div>
        <div style={{ fontStyle: "italic", color: "var(--ink)" }}>{mpsTightened || <em>MPS not written</em>}</div>
      </OutcomeRow>

      <OutcomeRow label="SERMON OUTLINE">
        {outline.length === 0 ? (
          <em style={{ color: "var(--ink-ghost)" }}>No outline points yet</em>
        ) : (
          <ol style={{ margin: 0, paddingLeft: "18px", color: "var(--ink-mid)" }}>
            {outline.map((p) => (
              <li key={p.id} style={{ marginBottom: "4px" }}>{p.text}</li>
            ))}
          </ol>
        )}
      </OutcomeRow>

      <OutcomeRow label="SERMON BODY">
        {outline.length === 0 ? (
          <em style={{ color: "var(--ink-ghost)" }}>No points to equip yet</em>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {outline.map((p) => {
              const fe = funcData[p.id] || {};
              const filled = ["scripture", "explanation", "application", "illustration"]
                .filter((k) => fe[k] && fe[k].trim()).length;
              return (
                <div key={p.id} style={{ fontSize: "14px", color: "var(--ink-mid)" }}>
                  <span style={{ color: "var(--ink-ghost)", marginRight: "8px" }}>{p.text}</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: "10px",
                    color: filled === 4 ? "var(--gold)" : "var(--ink-ghost)",
                  }}>
                    {filled}/4 equipped
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </OutcomeRow>

      <OutcomeRow label="SERMON FRAME" last>
        <div style={{ color: "var(--ink-mid)", marginBottom: "4px" }}>
          <span style={{ fontSize: "11px", letterSpacing: "0.08em", color: "var(--ink-ghost)", marginRight: "8px" }}>INTRO</span>
          {introHook ? <em>{introHook}</em> : <em style={{ color: "var(--ink-ghost)" }}>not written</em>}
        </div>
        <div style={{ color: "var(--ink-mid)" }}>
          <span style={{ fontSize: "11px", letterSpacing: "0.08em", color: "var(--ink-ghost)", marginRight: "8px" }}>CONCLUSION</span>
          {conclusionLand ? <em>{conclusionLand}</em> : <em style={{ color: "var(--ink-ghost)" }}>not written</em>}
        </div>
      </OutcomeRow>

      <div style={{
        marginTop: "32px",
        display: "flex",
        justifyContent: "flex-end",
      }}>
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button
          onClick={onDismiss}
          style={{
            background: "var(--ink)",
            color: "var(--parchment)",
            border: 0,
            cursor: "pointer",
            padding: "14px 22px",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: "11px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          Walk into the writing room →
        </button>
      </div>
    </div>
  );
}

function OutcomeRow({ label, last, children }) {
  return (
    <div style={{
      paddingBottom: last ? 0 : "20px",
      marginBottom: last ? 0 : "20px",
      borderBottom: last ? "none" : "1px dotted var(--parchment-deep)",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: "10px",
        letterSpacing: "0.22em",
        color: "var(--gold)",
        marginBottom: "8px",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: "15px",
        lineHeight: 1.55,
      }}>
        {children}
      </div>
    </div>
  );
}

// Reference card — passage + MPT + MPS + outline-so-far. Pinned at the
// top of Outline and Equip so the pastor's anchor is always in view.
function OutlineReference({ sermon, outline, fe }) {
  if (!sermon.passage && !sermon.mpt && !sermon.mps) return null;
  return (
    <div className="card" style={{ marginBottom: "20px" }}>
      {sermon.passage && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "var(--gold)", marginBottom: "8px" }}>
          {sermon.passage}
        </div>
      )}
      {sermon.mpt && (
        <div style={{ marginBottom: "6px" }}>
          <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-ghost)", marginRight: "8px" }}>MPT</span>
          <span style={{ fontSize: "15px", color: "var(--ink-mid)" }}>{sermon.mpt}</span>
        </div>
      )}
      {sermon.mps && (
        <div>
          <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-ghost)", marginRight: "8px" }}>MPS</span>
          <span style={{ fontSize: "15px", fontStyle: "italic", color: "var(--ink)" }}>{sermon.mps}</span>
          {outline.length > 0 && (
            <div style={{ marginTop: "10px", paddingLeft: "16px", borderLeft: "2px solid var(--border)" }}>
              {outline.map((p, i) => (
                <div key={p.id} style={{ marginBottom: "6px", fontSize: "14px", color: "var(--ink-mid)", lineHeight: "1.5" }}>
                  <span style={{ color: "var(--ink-ghost)", marginRight: "6px" }}>{i + 1}.</span>
                  {p.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
