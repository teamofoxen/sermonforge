// AssemblyTab — the Assembly stage of the sermon workspace.
//
// Workspace Restructure (2026-05-10) — collapses former Study Steps 2/3/4
// (MPT/MPS, Outline, FE) and the former STAGE.Frame into one stage with
// four sub-phases:
//
//   1. Anchor  — MPT (draft, tighten) + MPS (translate, gospel-check, tighten)
//   2. Outline — body outline (N points serving the MPS)
//   3. Equip   — FE per outline point (Scripture, Explanation, Application, Illustration)
//   4. Frame   — Intro (4Q) + Conclusion (4Q)
//
// Each sub-phase ends in a pause-clearing producing a named outcome:
//   Anchor → Main Point Pair
//   Outline → Sermon Outline
//   Equip  → Sermon Body
//   Frame  → Sermon Frame
//
// The pastor lands in Manuscript with all four named outcomes assembled.
//
// This implementation renders the legacy worksheets / builders inside
// each sub-phase body. The trail integration (Assembly trail across all
// four sub-phases) lands in Phase 5 of the restructure.

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTour } from "../contexts/TourContext";
import {
  parseStructuredField, serializeStructuredField,
  setQuestionAnswer, setQuestionNA, isQuestionNA, DEFAULT_QUESTION_KEY,
  getQuestionAnswer,
} from "../utils/studyFields";
import { MAIN_POINT_PAIR_FIELDS } from "../utils/sadiAnchorFields";
import { SERMON_FRAME_FIELDS } from "../utils/sermonFrameFields";
import { getOutline, serializeOutline, getFunctionalElements, serializeFunctionalElements, autoResize } from "../utils";
import SpotlightWorksheet from "./SpotlightWorksheet";
import OutlineBuilder from "./OutlineBuilder";
import AdvanceGateChecklist from "./AdvanceGateChecklist";
import NotebookPanel from "./NotebookPanel";
import FeedbackFlag from "./FeedbackFlag";
import StudyTrailForge from "./StudyTrailForge";
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

// Local FE editor — same shape as the legacy FuncElem in the pre-restructure
// StudyTab. Renders the per-outline-point E/A/I/Scripture fields.
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
        </div>
      </div>
      {open && (
        <div className="func-elem-body">
          <div>
            <div className="func-field-label">Scripture</div>
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
            <div className="func-field-label">Explanation</div>
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
            <div className="func-field-label">Application</div>
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
            <div className="func-field-label">Illustration</div>
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
  // Trail suppression — same shape as StudyTab's flag. Pastor exits the
  // trail via × / Esc; legacy three-column shell renders until re-entry.
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

  // Pause-dismiss wrapper for the Assembly → Manuscript outbound boundary.
  // Same shape as StudyTab's wrapper for Study → Assembly: clearing the
  // "manuscript" pause flips the workspace tab forward as the pause's
  // dismiss act.
  const setPausePoint = useCallback((val) => {
    if (val === null && pausePoint && pausePoint.nextKey === "manuscript") {
      onTabChange?.(STAGE.Manuscript);
    }
    setPausePointRaw(val);
  }, [pausePoint, onTabChange]);

  // Structured field data per sub-phase.
  const mppData = useMemo(() => parseStructuredField(sermon.main_point_pair), [sermon.main_point_pair]);
  const frameData = useMemo(() => parseStructuredField(sermon.sermon_frame), [sermon.sermon_frame]);
  const outline = getOutline(sermon);
  const funcData = getFunctionalElements(sermon);

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
      // Assembly → Manuscript pause-clearing. The named outcome summary
      // (Main Point Pair, Sermon Outline, Sermon Body, Sermon Frame)
      // renders here per RW5; tab change is deferred to the dismiss
      // wrapper above.
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

  // Trail mount conditions. Phase B's StudyTrailForge currently handles
  // the Anchor sub-phase only. Phase 5 of the restructure will replace
  // this with a unified AssemblyTrail spanning all four sub-phases.
  // Until then: Anchor renders via the existing trail; Outline / Equip /
  // Frame fall through to the legacy renderings below.
  //
  // Test opt-out: localStorage `sermonforge_trail_disabled = "1"` forces
  // the legacy legacy renderings. Matches StudyTab's flag.
  const trailDisabledByFlag =
    typeof window !== "undefined" &&
    window.localStorage &&
    window.localStorage.getItem("sermonforge_trail_disabled") === "1";
  const showForgeTrail =
    activeSubPhase === 1 &&
    !trailSuppressed &&
    !trailDisabledByFlag;

  if (showForgeTrail) {
    // StudyTrailForge was built pre-restructure for the standalone Step 2
    // (MPT/MPS Forge) stage. Inside Assembly it renders the Anchor sub-phase.
    // The trail's two cross-position look-back call sites — jumpToStep(1)
    // for cross-step back, jumpToStep(2) for restoring the prior position
    // after pause look-back — both route here. Phase 5 will replace this
    // adapter with a sub-phase-aware AssemblyTrail.
    return (
      <StudyTrailForge
        sermon={sermon}
        mppData={mppData}
        updateMPP={updateMPP}
        toggleMPPNa={toggleMPPNa}
        pausePoint={pausePoint}
        setPausePoint={setPausePoint}
        step2Sufficiency={subPhaseSufficiency}
        advanceStep={advanceSubPhase}
        jumpToStep={async (n) => {
          // 1 — Anchor's first field, look back → cross-stage to Study.
          if (n === 1) await jumpToStudy();
          // 2 — pause look-back → restore Anchor sub-phase (sub-phase 1
          //     within Assembly).
          else if (n === 2) await jumpToSubPhase(1);
        }}
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
            {trailSuppressed && activeSubPhase === 1 && (
              /* eslint-disable-next-line sermonforge/no-raw-button */
              <button
                type="button"
                onClick={() => setTrailSuppressed(false)}
                title="Re-enter Anchor trail (worktree experiment)"
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

        {/* RW5 — Assembly → Manuscript step-boundary pause. Renders the four
            named outcomes (Main Point Pair, Sermon Outline, Sermon Body,
            Sermon Frame) as a summary review before the pastor crosses
            into Manuscript. */}
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

        {/* Anchor sub-phase — legacy fallback for when trail is suppressed. */}
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

// RW5 — Assembly → Manuscript step-boundary pause clearing. Renders the
// four named outcomes of Assembly as a summary review: Main Point Pair
// (mpt.tighten + mps.tighten), Sermon Outline (the outline points),
// Sermon Body (FE per point), Sermon Frame (Intro + Conclusion summary).
// Click "Walk into the writing room" to dismiss + advance to Manuscript.
function AssemblyToManuscriptPause({ sermon, mppData, frameData, outline, funcData, onDismiss }) {
  // Read the tightened MPT / MPS from the v19 envelope.
  const mptTightened = (() => {
    const v = getQuestionAnswer(mppData, "mpt", "tighten");
    return typeof v === "string" ? v : (sermon.mpt || "");
  })();
  const mpsTightened = (() => {
    const v = getQuestionAnswer(mppData, "mps", "tighten");
    return typeof v === "string" ? v : (sermon.mps || "");
  })();

  // Frame Intro + Conclusion summaries — just collapse the SADI walks.
  const introHook = getFrameValue(frameData, "intro", "hook");
  const conclusionLand = getFrameValue(frameData, "conclusion", "land_call");

  return (
    <div style={{
      background: "var(--parchment-warm)",
      border: "1px solid var(--parchment-deep)",
      borderRadius: "2px",
      padding: "32px 40px",
      maxWidth: "740px",
      margin: "40px auto",
      boxShadow: "var(--shadow-soft)",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: "10px",
        letterSpacing: "0.32em",
        color: "var(--gold)",
        marginBottom: "16px",
        textTransform: "uppercase",
      }}>
        A breath between steps
      </div>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: "italic",
        fontWeight: 400,
        fontSize: "36px",
        lineHeight: 1.2,
        color: "var(--ink)",
        margin: "0 0 12px",
      }}>
        Assembly is built.
      </h2>
      <p style={{
        fontSize: "16px",
        lineHeight: 1.55,
        color: "var(--ink-soft)",
        margin: "0 0 24px",
        maxWidth: "560px",
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

function getFrameValue(frameData, fieldKey, qKey) {
  const v = getQuestionAnswer(frameData, fieldKey, qKey);
  return typeof v === "string" ? v : "";
}

// Reference card — shows passage / MPT / MPS plus the equipped outline
// when present. Same shape as the legacy OutlineTab's reference card so
// the pastor's at-a-glance context is preserved inside the Outline and
// Equip sub-phases.
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
