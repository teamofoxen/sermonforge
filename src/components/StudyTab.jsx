// StudyTab — the Study (Exegesis) stage of the sermon workspace.
//
// Renders the four Exegesis sub-phases (Observe / Interpret / Redemptive
// Thread / Implications) via the switchback trail (StudyTrailExegesis).
// Sub-phase transitions route through the spine; advancing past
// Implications performs the stage transition into Assembly. The legacy
// three-column shell retired with the WTC sequel arc (2026-05-11).

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTour } from "../contexts/TourContext";
import {
  OBSERVE_FIELDS, INTERPRET_FIELDS,
  REDEMPTIVE_FIELDS,
  IMPLICATIONS_FIELDS,
  parseStructuredField, serializeStructuredField,
  setQuestionAnswer,
  isQuestionNA, setQuestionNA, DEFAULT_QUESTION_KEY,
  setDivisionsCanvas,
} from "../utils/studyFields";
import StudyTrailExegesis from "./StudyTrailExegesis";
import { STAGE, SUB_PHASE, ContractViolation } from "../core/contracts";
import { transitionState } from "../core/spine";
import {
  canonicalSubPhase,
  buildSubPhaseEvidence, buildStageEvidence,
  evaluateAdvance, formatAdvanceRejection,
} from "../utils/studyAdvancement";

export default function StudyTab({ sermon, onUpdate, onTabChange, onMovement, onClose }) {
  const { active: tourActive, desiredUi } = useTour();
  const [activeSubPhase, setActiveSubPhase] = useState(() => {
    const saved = localStorage.getItem(`sermonforge_study_subphase_${sermon.id}`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [advanceError, setAdvanceError] = useState(null);
  const [currentActiveFieldKey, setCurrentActiveFieldKey] = useState(null);

  useEffect(() => {
    localStorage.setItem(`sermonforge_study_subphase_${sermon.id}`, activeSubPhase);
  }, [activeSubPhase, sermon.id]);

  useEffect(() => {
    if (!tourActive || !desiredUi) return;
    if (typeof desiredUi.studySubPhase === "number" && desiredUi.studySubPhase !== activeSubPhase) {
      setActiveSubPhase(desiredUi.studySubPhase);
    }
  }, [tourActive, desiredUi, activeSubPhase]);

  // Pause-point state. Set by `advanceSubPhase` after a successful spine
  // transition; cleared by `PausePointScreen.onContinue` or by manual jumps.
  // Shape: { priorSubPhase: 1|2|3|4, nextKey: 2|3|4|"assembly", priorSummaryKey: ... }
  const [pausePoint, setPausePointRaw] = useState(null);

  // Dismissing the Study → Assembly pause ("Walk on" from the Implications
  // clearing) is what flips the workspace tab forward — the tab change is
  // the *next* act, not the inciting one.
  const setPausePoint = useCallback((val) => {
    if (val === null && pausePoint && pausePoint.nextKey === "assembly") {
      onTabChange?.(STAGE.Assembly);
    }
    setPausePointRaw(val);
  }, [pausePoint, onTabChange]);

  // Structured field data for each Exegesis sub-phase.
  const obsData = useMemo(() => parseStructuredField(sermon.observations), [sermon.observations]);
  const intData = useMemo(() => parseStructuredField(sermon.interpretation), [sermon.interpretation]);
  const redData = useMemo(() => parseStructuredField(sermon.redemptive_thread), [sermon.redemptive_thread]);
  const impData = useMemo(() => parseStructuredField(sermon.implications), [sermon.implications]);

  const updateStructured = useCallback((column, currentData, fieldKey, value, qKey = DEFAULT_QUESTION_KEY) => {
    let next;
    if (column === "observations" && fieldKey === "divisions" && qKey === "canvas") {
      next = setDivisionsCanvas(currentData, Array.isArray(value) ? value : []);
    } else {
      next = setQuestionAnswer(currentData, fieldKey, qKey, value);
    }
    onUpdate({ [column]: serializeStructuredField(next) });
  }, [onUpdate]);

  const toggleStructuredNA = useCallback((column, currentData, fieldKey, qKey = DEFAULT_QUESTION_KEY) => {
    const wasNA = isQuestionNA(currentData, fieldKey, qKey);
    const next = setQuestionNA(currentData, fieldKey, qKey, !wasNA);
    onUpdate({ [column]: serializeStructuredField(next) });
  }, [onUpdate]);

  // Spine-routed transitions. Sub-phase 4 (Implications) advance is the
  // Study → Assembly stage transition; sub-phases 1–3 are within-Study.
  async function advanceSubPhase() {
    setAdvanceError(null);
    const next = activeSubPhase + 1;

    if (next > 4) {
      // Stage transition — Study → Assembly. Evidence is the whole Study
      // stage's content; the spine validates Process #2 (empty evidence)
      // and Process #1 (monotonicity).
      const evidence = buildStageEvidence(sermon, STAGE.Study);
      try {
        await transitionState({
          sermonId: sermon.id,
          to: STAGE.Assembly,
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
      onMovement?.({ from: STAGE.Study, to: STAGE.Assembly, kind: "stage" });
      // Set the Implications-synthesis pause-clearing as Study's outbound
      // breath. The trail catches this via its mount condition and renders
      // the pause. Tab change is DEFERRED to the pause-dismiss path so the
      // pastor walks across the bend deliberately rather than getting
      // teleported into Assembly the instant they click Continue.
      setPausePoint({ priorSubPhase: 4, nextKey: "assembly", priorSummaryKey: null });
      return;
    }

    const fromSubPhase = canonicalSubPhase(activeSubPhase, STAGE.Study);
    const toSubPhase = canonicalSubPhase(next, STAGE.Study);
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

    if (next === 2) setPausePoint({ priorSubPhase: 1, nextKey: 2, priorSummaryKey: null });
    else if (next === 3) setPausePoint({ priorSubPhase: 2, nextKey: 3, priorSummaryKey: null });
    else if (next === 4) setPausePoint({ priorSubPhase: 3, nextKey: 4, priorSummaryKey: null });
  }

  async function jumpToSubPhase(phase) {
    setAdvanceError(null);
    if (phase === activeSubPhase) return;

    const fromSubPhase = canonicalSubPhase(activeSubPhase, STAGE.Study);
    const toSubPhase = canonicalSubPhase(phase, STAGE.Study);
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

  // Active sub-phase sufficiency. Empty-evidence baseline today; SFDI
  // thresholds layer on top per sub-phase.
  const subPhaseSufficiency = evaluateAdvance(sermon, "sub_phase", activeSubPhase, STAGE.Study);

  return (
    <StudyTrailExegesis
      sermon={sermon}
      activeSubPhase={activeSubPhase}
      currentActiveFieldKey={currentActiveFieldKey}
      setCurrentActiveFieldKey={setCurrentActiveFieldKey}
      pausePoint={pausePoint}
      setPausePoint={setPausePoint}
      obsData={obsData}
      intData={intData}
      redData={redData}
      impData={impData}
      updateStructured={updateStructured}
      toggleStructuredNA={toggleStructuredNA}
      advanceSubPhase={advanceSubPhase}
      jumpToSubPhase={jumpToSubPhase}
      subPhaseSufficiency={subPhaseSufficiency}
      onUpdate={onUpdate}
      onExit={onClose}
    />
  );
}
