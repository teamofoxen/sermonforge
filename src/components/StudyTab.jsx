// StudyTab — the Study (Exegesis) stage of the sermon workspace.
//
// Renders the four Exegesis sub-phases (Observe / Interpret / Redemptive
// Thread / Implications) via either SpotlightWorksheet (the three-column
// shell) or the switchback trail (StudyTrailExegesis). Sub-phase
// transitions route through the spine; advancing past Implications
// performs the stage transition into Assembly.

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTour } from "../contexts/TourContext";
import {
  OBSERVE_FIELDS, INTERPRET_FIELDS,
  REDEMPTIVE_FIELDS,
  IMPLICATIONS_FIELDS,
  parseStructuredField, serializeStructuredField,
  setQuestionAnswer,
  isQuestionNA, setQuestionNA, DEFAULT_QUESTION_KEY,
  fieldQuestions, getQuestionAnswer, flattenAnswerValue,
  setDivisionsCanvas,
} from "../utils/studyFields";
import SpotlightWorksheet from "./SpotlightWorksheet";
import AdvanceGateChecklist from "./AdvanceGateChecklist";
import PausePointScreen from "./PausePointScreen";
import ThroughlineCanvas from "./ThroughlineCanvas";
import ThroughlineRail from "./ThroughlineRail";
import ScripturePanel from "./ScripturePanel";
import NotebookPanel from "./NotebookPanel";
import FeedbackFlag from "./FeedbackFlag";
import StudyTrailExegesis from "./StudyTrailExegesis";
import PrimaryButton from "./primitives/PrimaryButton";
import { STAGE, SUB_PHASE, ContractViolation } from "../core/contracts";
import { transitionState } from "../core/spine";
import {
  canonicalSubPhase,
  buildSubPhaseEvidence, buildStageEvidence,
  evaluateAdvance, formatAdvanceRejection,
} from "../utils/studyAdvancement";

const PHASE_LABELS = ["Observe", "Interpret", "Redemptive Thread", "Implications"];

// SPRD C2 — ThroughlineRail data derivation. Builds the subPhases prop from
// the four phase columns. Field state: empty | in-progress | complete | na.
// "current" rather than "active" because the canonical-stage-name lint rule
// forbids raw "active" strings.

const SUB_PHASE_IDS = ["observe", "interpret", "redemptive", "implications"];

function firstIncompleteFieldKey(defs, data) {
  for (const def of defs) {
    const qs = fieldQuestions(def);
    const allDone = qs.every((q) =>
      isQuestionNA(data, def.key, q.key) ||
      !!flattenAnswerValue(getQuestionAnswer(data, def.key, q.key))
    );
    if (!allDone) return def.key;
  }
  return defs[0]?.key ?? null;
}

const GATE_KEY_TO_FIELD_KEY = {
  field_3_divisions: "divisions",
  field_7_obvious_point: "obvious_point",
  field_8_possible_implications: "applications",
  field_8_interpretation_synthesis: "interpretation_synthesis",
  field_5_christ_connection_statement: "christ_connection_statement",
  field_4_implications_synthesis: "implications_synthesis",
};

function deriveFieldNodes(defs, data, activeFieldKey, gateByFieldKey) {
  return defs.map((def) => {
    const qs = fieldQuestions(def);
    const total = qs.length;
    const answered = qs.filter((q) =>
      isQuestionNA(data, def.key, q.key) ||
      !!flattenAnswerValue(getQuestionAnswer(data, def.key, q.key))
    ).length;

    let state;
    const gateMet = gateByFieldKey ? gateByFieldKey[def.key] : undefined;
    if (def.key === activeFieldKey) state = "current";
    else if (gateMet === false) state = answered === 0 ? "empty" : "in-progress";
    else if (gateMet === true) state = "complete";
    else if (answered === 0) state = "empty";
    else if (answered === total) state = "complete";
    else state = "in-progress";

    let preview = "";
    if (state === "in-progress") {
      preview = `${answered} of ${total} questions answered.`;
    } else if (state === "complete" || state === "current") {
      for (const q of qs) {
        const v = getQuestionAnswer(data, def.key, q.key);
        const flat = flattenAnswerValue(v);
        if (flat) {
          preview = flat.length > 80 ? `${flat.slice(0, 80)}…` : flat;
          break;
        }
      }
    }

    return { key: def.key, label: def.label, state, preview };
  });
}

function buildRailSubPhases(sermon, obsData, intData, redData, impData, activeIdx, currentActiveFieldKey) {
  const phases = [
    { id: "observe", label: "Observe",
      named_outcome: "Observation Set",
      prompt: "Observe the text — what it says before what it means.",
      defs: OBSERVE_FIELDS, data: obsData, idx: 1 },
    { id: "interpret", label: "Interpret",
      named_outcome: "Interpretation Set",
      prompt: "Find the meaning of the text. Move from observation to interpretation.",
      defs: INTERPRET_FIELDS, data: intData, idx: 2 },
    { id: "redemptive", label: "Redemptive Thread",
      named_outcome: "Christ-Connection Statement",
      prompt: "Find the redemptive features. How does this text point to or depend on Christ?",
      defs: REDEMPTIVE_FIELDS, data: redData, idx: 3 },
    { id: "implications", label: "Implications",
      named_outcome: "Implications Synthesis",
      prompt: "Concluding implications — how does this passage apply to us today?",
      defs: IMPLICATIONS_FIELDS, data: impData, idx: 4 },
  ];
  return phases.map((p) => {
    const isActive = p.idx === activeIdx;
    const reportedKeyValid =
      isActive &&
      currentActiveFieldKey &&
      p.defs.some((d) => d.key === currentActiveFieldKey);
    const activeFieldKey = isActive
      ? (reportedKeyValid ? currentActiveFieldKey : firstIncompleteFieldKey(p.defs, p.data))
      : null;
    let advance = null;
    let done = false;
    try {
      advance = evaluateAdvance(sermon, "sub_phase", p.idx, STAGE.Study);
      done = !!advance?.ok;
    } catch { /* defensive */ }
    const gateByFieldKey = {};
    if (advance && Array.isArray(advance.gates)) {
      for (const g of advance.gates) {
        const fk = GATE_KEY_TO_FIELD_KEY[g.key];
        if (fk) gateByFieldKey[fk] = !!g.met;
      }
    }
    const fields = deriveFieldNodes(p.defs, p.data, activeFieldKey, gateByFieldKey);
    return {
      id: p.id, label: p.label,
      named_outcome: p.named_outcome,
      prompt: p.prompt,
      fields, done,
    };
  });
}

export default function StudyTab({ sermon, onUpdate, onTabChange, onMovement, onClose }) {
  const { active: tourActive, desiredUi } = useTour();
  const [activeSubPhase, setActiveSubPhase] = useState(() => {
    const saved = localStorage.getItem(`sermonforge_study_subphase_${sermon.id}`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [advanceError, setAdvanceError] = useState(null);
  const [railRequest, setRailRequest] = useState(null);
  const [currentActiveFieldKey, setCurrentActiveFieldKey] = useState(null);
  const [takeoverOverride, setTakeoverOverride] = useState(false);
  useEffect(() => { setTakeoverOverride(false); }, [currentActiveFieldKey]);

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

  // WTC sequel Item 8: the user-facing trail-suppress toggle is retired.
  // × Exit / Esc return the pastor to the Dashboard (`onClose`) rather
  // than dropping into the legacy three-column shell. The localStorage
  // `sermonforge_trail_disabled` flag below still gates the trail off
  // for the two contract tests (process-2 / process-3) that assert on
  // SpotlightWorksheet markup. Those tests' legacy-shell expectations
  // are the only remaining consumer of the suppressed branch.

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

  async function handleRailFieldClick(subPhaseId, fieldKey) {
    const target = SUB_PHASE_IDS.indexOf(subPhaseId) + 1;
    if (target < 1 || target > 4) return;
    if (target !== activeSubPhase) {
      await jumpToSubPhase(target);
    }
    setRailRequest({ phase: target, key: fieldKey, token: Date.now() });
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

  const railSubPhases = buildRailSubPhases(sermon, obsData, intData, redData, impData, activeSubPhase, currentActiveFieldKey);

  const activeFieldDef =
    OBSERVE_FIELDS.find((f) => f.key === currentActiveFieldKey) ||
    INTERPRET_FIELDS.find((f) => f.key === currentActiveFieldKey) ||
    REDEMPTIVE_FIELDS.find((f) => f.key === currentActiveFieldKey) ||
    IMPLICATIONS_FIELDS.find((f) => f.key === currentActiveFieldKey) ||
    null;
  const wantsTakeover =
    !!activeFieldDef?.takeoverWhenActive &&
    !tourActive &&
    !takeoverOverride;

  // Trail mount — Study + the Study → Assembly pause beat live in the trail.
  // The Implications synthesis pause is hosted here so the "walk on" beat
  // lands in the same surface that produced it.
  //
  // Test opt-out: localStorage `sermonforge_trail_disabled = "1"` forces
  // the three-column shell. Contract tests that assert on PrimaryButton /
  // SpotlightWorksheet markup set this flag in their setup.
  const trailDisabledByFlag =
    typeof window !== "undefined" &&
    window.localStorage &&
    window.localStorage.getItem("sermonforge_trail_disabled") === "1";
  const showTrail = !trailDisabledByFlag;

  if (showTrail) {
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

  // Test-only legacy three-column shell — reached only when the
  // `sermonforge_trail_disabled` localStorage flag is set in contract-
  // test setup. The user-facing trail-suppress toggle retired in WTC
  // sequel Item 8 (no "Trail mode →" re-entry; × Exit returns to
  // Dashboard via `onClose`).
  return (
    <div className="study-tab-shell">
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: "8px", right: "10px", display: "flex", gap: "12px", alignItems: "center" }}>
          <FeedbackFlag surface="study-tab" sermonId={sermon?.id ?? null} step={1} />
        </div>
      </div>
      <div className={`study-three-col${wantsTakeover ? " study-three-col-takeover" : ""}`}>
        <ThroughlineRail
          subPhases={railSubPhases}
          activeSubPhaseId={SUB_PHASE_IDS[activeSubPhase - 1]}
          onFieldClick={handleRailFieldClick}
        />
        <div className="study-write-col">
          {wantsTakeover && (
            // eslint-disable-next-line sermonforge/no-raw-button
            <button
              type="button"
              className="field-takeover-restore"
              onClick={() => setTakeoverOverride(true)}
              title="Back to main view"
            >
              ↺ Back to main
            </button>
          )}
          <div className="study-write-col-body">
            {!wantsTakeover && (
              <ThroughlineCanvas
                sermon={sermon}
                activeSubPhase={pausePoint ? pausePoint.priorSubPhase : activeSubPhase}
              />
            )}
            <div className="study-write-inner">

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

      {/* Sub-phase pause-point screen. Step-boundary pauses (priorStep /
          nextKey "assembly") are trail-only — guard here. */}
      {pausePoint && pausePoint.priorSubPhase && pausePoint.nextKey !== "assembly" && (() => {
        const synthMeta =
          pausePoint.priorSubPhase === 1 ? { col: "observations", data: obsData }
          : pausePoint.priorSubPhase === 2 ? { col: "interpretation", data: intData }
          : pausePoint.priorSubPhase === 3 ? { col: "redemptive_thread", data: redData }
          : pausePoint.priorSubPhase === 4 ? { col: "implications", data: impData }
          : null;
        const synthValue = synthMeta ? (getQuestionAnswer(synthMeta.data, "_synthesis") ?? "") : "";
        return (
          <PausePointScreen
            priorSubPhase={pausePoint.priorSubPhase}
            nextKey={pausePoint.nextKey}
            synthesisValue={synthValue}
            onSynthesisChange={(val) => {
              if (synthMeta) updateStructured(synthMeta.col, synthMeta.data, "_synthesis", val);
            }}
            onContinue={() => setPausePoint(null)}
          />
        );
      })()}

      {!pausePoint && (
        <div className="study-step-active">

          {activeSubPhase === 1 && (
            <div className="sub-phase-body">
              <SpotlightWorksheet
                fields={OBSERVE_FIELDS}
                data={obsData}
                onChange={(fieldKey, qKey, value) => updateStructured("observations", obsData, fieldKey, value, qKey)}
                onToggleNA={(fieldKey, qKey) => toggleStructuredNA("observations", obsData, fieldKey, qKey)}
                legacyNotes={obsData.legacy_notes}
                sermonId={sermon.id}
                requestedActiveFieldKey={railRequest?.phase === 1 ? railRequest.key : null}
                requestActiveToken={railRequest?.phase === 1 ? railRequest.token : null}
                onActiveFieldKeyChange={setCurrentActiveFieldKey}
              />
            </div>
          )}

          {activeSubPhase === 2 && (
            <div className="sub-phase-body">
              <SpotlightWorksheet
                fields={INTERPRET_FIELDS}
                data={intData}
                onChange={(fieldKey, qKey, value) => updateStructured("interpretation", intData, fieldKey, value, qKey)}
                onToggleNA={(fieldKey, qKey) => toggleStructuredNA("interpretation", intData, fieldKey, qKey)}
                legacyNotes={intData.legacy_notes}
                sermonId={sermon.id}
                crossPhaseRead={(column) => column === "observations" ? obsData : null}
                crossPhaseWrite={(column, fieldKey, qKey, value) => {
                  if (column === "observations") updateStructured("observations", obsData, fieldKey, value, qKey);
                }}
                requestedActiveFieldKey={railRequest?.phase === 2 ? railRequest.key : null}
                requestActiveToken={railRequest?.phase === 2 ? railRequest.token : null}
                onActiveFieldKeyChange={setCurrentActiveFieldKey}
              />
            </div>
          )}

          {activeSubPhase === 3 && (
            <div className="sub-phase-body">
              <SpotlightWorksheet
                fields={REDEMPTIVE_FIELDS}
                data={redData}
                onChange={(fieldKey, qKey, value) => updateStructured("redemptive_thread", redData, fieldKey, value, qKey)}
                onToggleNA={(fieldKey, qKey) => toggleStructuredNA("redemptive_thread", redData, fieldKey, qKey)}
                legacyNotes={redData.legacy_notes}
                sermonId={sermon.id}
                crossPhaseRead={(column) => column === "observations" ? obsData : null}
                crossPhaseWrite={(column, fieldKey, qKey, value) => {
                  if (column === "observations") updateStructured("observations", obsData, fieldKey, value, qKey);
                }}
                requestedActiveFieldKey={railRequest?.phase === 3 ? railRequest.key : null}
                requestActiveToken={railRequest?.phase === 3 ? railRequest.token : null}
                onActiveFieldKeyChange={setCurrentActiveFieldKey}
              />
            </div>
          )}

          {activeSubPhase === 4 && (
            <div className="sub-phase-body">
              <SpotlightWorksheet
                fields={IMPLICATIONS_FIELDS}
                data={impData}
                onChange={(fieldKey, qKey, value) => updateStructured("implications", impData, fieldKey, value, qKey)}
                onToggleNA={(fieldKey, qKey) => toggleStructuredNA("implications", impData, fieldKey, qKey)}
                legacyNotes={impData.legacy_notes}
                sermonId={sermon.id}
                crossPhaseRead={(column) => column === "observations" ? obsData : null}
                crossPhaseWrite={(column, fieldKey, qKey, value) => {
                  if (column === "observations") updateStructured("observations", obsData, fieldKey, value, qKey);
                }}
                requestedActiveFieldKey={railRequest?.phase === 4 ? railRequest.key : null}
                requestActiveToken={railRequest?.phase === 4 ? railRequest.token : null}
                onActiveFieldKeyChange={setCurrentActiveFieldKey}
              />
            </div>
          )}

          <div className="step-advance">
            <PrimaryButton
              size="sm"
              onClick={advanceSubPhase}
              disabled={!subPhaseSufficiency.ok}
              title={subPhaseSufficiency.reason || ""}
            >
              {activeSubPhase < 4
                ? `Continue to ${PHASE_LABELS[activeSubPhase]} →`
                : `Continue to Assembly →`}
            </PrimaryButton>
            <AdvanceGateChecklist sufficiency={subPhaseSufficiency} />
          </div>
        </div>
      )}

          <NotebookPanel
            value={sermon.notebook_study}
            onChange={(value) => onUpdate({ notebook_study: value })}
            label="Study Notebook"
            placeholder="Free-form notes for your study work — observations, questions, things to revisit."
          />

          </div>
          </div>
        </div>
        <ScripturePanel passage={sermon.passage} />
      </div>
    </div>
  );
}
