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

export default function AssemblyTab({ sermon, onUpdate, onTabChange, onMovement, onClose }) {
  const { active: tourActive, desiredUi } = useTour();
  const [activeSubPhase, setActiveSubPhase] = useState(() => {
    const saved = localStorage.getItem(`sermonforge_assembly_subphase_${sermon.id}`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [advanceError, setAdvanceError] = useState(null);
  // WTC sequel Item 8: user-facing trail-suppress toggle is retired —
  // × Exit / Esc return the pastor to the Dashboard (`onClose`). The
  // `sermonforge_trail_disabled` localStorage flag below still gates the
  // legacy sub-phase tab strip on for contract tests that assert on
  // its markup; that's the only remaining consumer of the fallback path.

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

  // Assembly renders the trail across all four sub-phases (Anchor /
  // Outline / Equip / Frame). The legacy tab-strip fallback retired with
  // the WTC sequel arc (2026-05-11).
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
      onUpdate={onUpdate}
      onExit={onClose}
    />
  );
}
