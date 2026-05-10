import { useState, useEffect, useMemo, useCallback } from "react";
import { useTour } from "../contexts/TourContext";
import { getOutline, serializeOutline, getFunctionalElements, serializeFunctionalElements, autoResize } from "../utils";
import { STEPS, PHASE_SEQUENCE, STEP_SEQUENCE } from "../constants/steps";
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
import OutlineBuilder from "./OutlineBuilder";
import NotebookPanel from "./NotebookPanel";
import FeedbackFlag from "./FeedbackFlag";
import { MAIN_POINT_PAIR_FIELDS } from "../utils/sadiAnchorFields";
import PrimaryButton from "./primitives/PrimaryButton";
import { STAGE, STEP, ContractViolation } from "../core/contracts";
import { transitionState } from "../core/spine";
import {
  canonicalSubPhase, canonicalStep,
  buildSubPhaseEvidence, buildStepEvidence,
  evaluateAdvance, formatAdvanceRejection,
} from "../utils/studyAdvancement";

const STEP_LABELS = ["Exegesis", "MPT / MPS", "Outline", "Functional Elements"];
const PHASE_LABELS = ["Observe", "Interpret", "Redemptive Thread", "Implications"];

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


// SpotlightField + SpotlightWorksheet were extracted to ./SpotlightWorksheet
// in B1.1 (2026-05-04) and gained multi-question rendering support. The new
// onChange / onToggleNA contracts thread qKey explicitly so multi-question
// fields can write to the right envelope.

// ── ThroughlineRail data derivation (SPRD C2, 2026-05-04) ──────────────────
// Builds the subPhases prop for ThroughlineRail from the four phase columns.
// Field state: empty (no questions answered) → in-progress (some) → complete
// (all answered or NA) → active (currently spotlighted, approximated as the
// first incomplete field). Named-outcome "done" uses evaluateAdvance — the
// same per-boundary gate that unblocks Continue.

const SUB_PHASE_IDS = ["observe", "interpret", "redemptive", "implications"];

// Study step navigation strip — sits below stage tabs in the workspace top
// chrome (Option A). Pulled out of the rail so the throughline is the rail's
// only job and travels parallel with field advancement.
const STUDY_STEPS = [
  { id: 1, label: "Exegesis" },
  { id: 2, label: "MPT / MPS" },
  { id: 3, label: "Outline" },
  { id: 4, label: "Functional Elements" },
];

function StudyStepStrip({ activeStep, onStepChange }) {
  return (
    <div className="study-step-strip" role="tablist" aria-label="Study step">
      {STUDY_STEPS.map((s) => (
        // eslint-disable-next-line sermonforge/no-raw-button
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={activeStep === s.id}
          className={`study-step ${activeStep === s.id ? "active" : ""}`}
          onClick={() => onStepChange(s.id)}
        >
          <span className="study-step-num">{s.id}</span>
          <span className="study-step-label">{s.label}</span>
        </button>
      ))}
    </div>
  );
}

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

// Map from boundary-gate keys (used in evaluateAdvance for load-bearing fields)
// to the actual OBSERVE/INTERPRET/REDEMPTIVE/IMPLICATIONS field keys those
// gates check. Lets the rail honor the gate's strict composite verdict instead
// of the lenient "any-content-per-question" count, which previously rendered
// Divisions / Thought Units as "complete" while the boundary still failed (Q2
// requires every main-sentence-id to carry a non-empty paraphrase, etc.).
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
    // "current" rather than "active" because the canonical-stage-name lint
    // forbids raw "active" strings (it's a pre-Pilot-B sermon-status alias).
    // Throughline node states: empty | in-progress | current | complete | na.
    // For load-bearing fields, the boundary gate's strict composite verdict
    // overrides the lenient per-question count — otherwise the rail showed
    // a field as "complete" while Continue stayed disabled because the
    // composite check (e.g., paraphrase per main sentence) wasn't satisfied.
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
    // Prefer the worksheet's actually-spotlighted field. Fall back to the
    // first-incomplete heuristic only when the worksheet hasn't reported
    // yet (e.g., during the first render after a sub-phase change). Validate
    // the reported key against this phase's fields so a stale key from a
    // previously-active phase doesn't bleed across.
    const reportedKeyValid =
      isActive &&
      currentActiveFieldKey &&
      p.defs.some((d) => d.key === currentActiveFieldKey);
    const activeFieldKey = isActive
      ? (reportedKeyValid ? currentActiveFieldKey : firstIncompleteFieldKey(p.defs, p.data))
      : null;
    // Pull the boundary gate verdict per load-bearing field so the rail
    // matches the Continue button's strict composite checks.
    let advance = null;
    let done = false;
    try {
      advance = evaluateAdvance(sermon, "sub_phase", p.idx);
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

export default function StudyTab({ sermon, onUpdate, onStepChange, onTabChange, onMovement }) {
  const { active: tourActive, desiredUi } = useTour();
  const [activeStep, setActiveStep] = useState(() => {
    const saved = localStorage.getItem(`sermonforge_study_step_${sermon.id}`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [activeSubPhase, setActiveSubPhase] = useState(() => {
    const saved = localStorage.getItem(`sermonforge_study_subphase_${sermon.id}`);
    return saved ? parseInt(saved, 10) : 1;
  });
  // Q1 spine routing — when transitionState rejects (e.g., Process #2 empty
  // evidence on a non-legacy sermon), this state surfaces a small banner near
  // the Continue button. Q3 will replace this with proper hard-gate UX.
  const [advanceError, setAdvanceError] = useState(null);

  // Throughline-rail click target. When the pastor clicks a field label or
  // node in the rail, we jump the worksheet's spotlight to that field. The
  // token lets the SpotlightWorksheet's effect re-fire even when the same
  // field is clicked twice in a row (key alone wouldn't change).
  const [railRequest, setRailRequest] = useState(null);

  // Reported back from the active SpotlightWorksheet. Drives the rail's
  // "current" highlight so it tracks the actually-spotlighted field instead
  // of always pointing at the first-incomplete heuristic.
  const [currentActiveFieldKey, setCurrentActiveFieldKey] = useState(null);

  // Takeover state — heavy-lifting fields with `takeoverWhenActive: true`
  // collapse the throughline rail and tighten write-column padding when
  // they're spotlit, so the canvas + paraphrase + table get the room. The
  // pastor can restore the rail mid-field via the small button rendered
  // top-right; the override resets when they leave the field.
  // Suppressed during the workspace tour (tour stops anchor on the rail).
  const [takeoverOverride, setTakeoverOverride] = useState(false);
  useEffect(() => { setTakeoverOverride(false); }, [currentActiveFieldKey]);

  useEffect(() => {
    localStorage.setItem(`sermonforge_study_step_${sermon.id}`, activeStep);
    localStorage.setItem(`sermonforge_study_subphase_${sermon.id}`, activeSubPhase);
  }, [activeStep, activeSubPhase, sermon.id]);

  // Tour-driven step/subphase alignment. Only writes when there's a real change,
  // so the user's own navigation isn't fought when the tour isn't active.
  useEffect(() => {
    if (!tourActive || !desiredUi) return;
    if (typeof desiredUi.studyStep === "number" && desiredUi.studyStep !== activeStep) {
      setActiveStep(desiredUi.studyStep);
    }
    if (typeof desiredUi.studySubPhase === "number" && desiredUi.studySubPhase !== activeSubPhase) {
      setActiveSubPhase(desiredUi.studySubPhase);
    }
  }, [tourActive, desiredUi, activeStep, activeSubPhase]);

  // Pause-point state. Set by `advanceSubPhase` after a successful spine
  // transition; cleared by `PausePointScreen.onContinue` or by manual
  // navigation (jumpToStep / jumpToSubPhase). Shape:
  //   { priorSubPhase: 1|2|3|4, nextKey: 2|3|4|"step_2", priorSummaryKey: "p2"|"p3"|"p4"|"s2" }
  // Pause-point is purely visual — by the time it renders, transitionState
  // has already accepted the move, so dismissing it never affects spine.
  const [pausePoint, setPausePoint] = useState(null);

  const funcData = getFunctionalElements(sermon);

  const outline = getOutline(sermon);

  // ── Structured field data for each phase ──
  const obsData = useMemo(() => parseStructuredField(sermon.observations), [sermon.observations]);
  const intData = useMemo(() => parseStructuredField(sermon.interpretation), [sermon.interpretation]);
  const redData = useMemo(() => parseStructuredField(sermon.redemptive_thread), [sermon.redemptive_thread]);
  const impData = useMemo(() => parseStructuredField(sermon.implications), [sermon.implications]);
  // SADI Step 2 — Main Point Pair envelope (v19). Holds MPT (2Q) + MPS (3Q).
  const mppData = useMemo(() => parseStructuredField(sermon.main_point_pair), [sermon.main_point_pair]);

  // Write to the main_point_pair envelope. When the pastor writes the
  // tighten answer for either field, mirror that value into the legacy
  // flat column so downstream consumers stay current.
  const updateMPP = useCallback((fieldKey, qKey, value) => {
    const next = setQuestionAnswer(mppData, fieldKey, qKey || DEFAULT_QUESTION_KEY, value);
    const updates = { main_point_pair: serializeStructuredField(next) };
    if (fieldKey === "mpt" && qKey === "tighten") {
      updates.mpt = typeof value === "string" ? value : "";
    } else if (fieldKey === "mps" && qKey === "tighten") {
      updates.mps = typeof value === "string" ? value : "";
    }
    onUpdate(updates);
  }, [mppData, onUpdate]);

  const toggleMPPNa = useCallback((fieldKey, qKey) => {
    const wasNA = isQuestionNA(mppData, fieldKey, qKey || DEFAULT_QUESTION_KEY);
    const next = setQuestionNA(mppData, fieldKey, qKey || DEFAULT_QUESTION_KEY, !wasNA);
    onUpdate({ main_point_pair: serializeStructuredField(next) });
  }, [mppData, onUpdate]);

  // Write a question's answer (qKey defaults to primary for back-compat with
  // non-spotlight callers like the Phase 3 / Phase 4 textareas that target
  // legacy single-question fields by key).
  const updateStructured = useCallback((column, currentData, fieldKey, value, qKey = DEFAULT_QUESTION_KEY) => {
    // Phase 4 Sprint 2 — Field 3's unified canvas is the only question on
    // `divisions` whose write also materializes the canonical
    // `thought_units` array (consumed by Phase 2/3/4 cross-phase reads).
    // setDivisionsCanvas keeps both paths in lockstep; every other field
    // uses the generic per-question writer.
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

  // Q1 spine routing — every renderer-side movement calls transitionState
  // before updating local state. Process #1 (monotonic) and Process #2 (evidence)
  // fire main-side; rejections surface via `advanceError`. Tour-driven state
  // changes (in the useEffect above) intentionally bypass — they are not real
  // pastoral work and don't move the canonical position.

  async function advanceSubPhase() {
    setAdvanceError(null);
    const next = activeSubPhase + 1;

    if (next > 4) {
      // This is a step transition out of Exegesis into MPT/MPS, not a sub-phase
      // advance. Route as kind=step.
      const evidence = buildStepEvidence(sermon, STEP.Exegesis);
      try {
        await transitionState({
          sermonId: sermon.id,
          to: STEP.MPT_MPS,
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
      onMovement?.({ from: STEP.Exegesis, to: STEP.MPT_MPS, kind: "step" });
      setActiveStep(2);
      setActiveSubPhase(1);
      onStepChange?.(STEPS.MPT_MPS);
      setPausePoint({ priorSubPhase: 4, nextKey: "step_2", priorSummaryKey: null });
      return;
    }

    const fromSubPhase = canonicalSubPhase(activeSubPhase);
    const toSubPhase = canonicalSubPhase(next);
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
    onStepChange?.(PHASE_SEQUENCE[next - 1]);

    if (next === 2) {
      setPausePoint({ priorSubPhase: 1, nextKey: 2, priorSummaryKey: null });
    } else if (next === 3) {
      setPausePoint({ priorSubPhase: 2, nextKey: 3, priorSummaryKey: null });
    } else if (next === 4) {
      setPausePoint({ priorSubPhase: 3, nextKey: 4, priorSummaryKey: null });
    }
  }

  async function advanceStep() {
    setAdvanceError(null);
    const next = activeStep + 1;
    if (next > 4) return;

    const fromStep = canonicalStep(activeStep);
    const toStep = canonicalStep(next);
    const evidence = buildStepEvidence(sermon, fromStep);
    try {
      await transitionState({
        sermonId: sermon.id,
        to: toStep,
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
    onMovement?.({ from: fromStep, to: toStep, kind: "step" });
    setActiveStep(next);
    setActiveSubPhase(1);
    onStepChange?.(STEP_SEQUENCE[next - 1]);
  }

  async function jumpToStep(step) {
    setAdvanceError(null);
    if (step === activeStep) return;

    const fromStep = canonicalStep(activeStep);
    const toStep = canonicalStep(step);
    const direction = step > activeStep ? "forward" : "backward";
    const evidence = buildStepEvidence(sermon, fromStep);
    try {
      await transitionState({
        sermonId: sermon.id,
        to: toStep,
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
    onMovement?.({ from: fromStep, to: toStep, kind: "step" });
    setActiveStep(step);
    setActiveSubPhase(1);
    setPausePoint(null); // manual jump clears any pending pause-point
    onStepChange?.(STEP_SEQUENCE[step - 1]);
  }

  // Rail click → jump the worksheet to the clicked field (and the clicked
  // sub-phase, if different). jumpToSubPhase handles the transition gating;
  // if it rejects, railRequest is still set but only consumed by the
  // worksheet whose phase matches, so it's a harmless no-op for the
  // unchanged-active phase.
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

    const fromSubPhase = canonicalSubPhase(activeSubPhase);
    const toSubPhase = canonicalSubPhase(phase);
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
    setPausePoint(null); // manual jump clears any pending pause-point
    onStepChange?.(PHASE_SEQUENCE[phase - 1]);
  }

  function updateFuncData(pointId, data) {
    onUpdate({ functional_elements: serializeFunctionalElements({ ...funcData, [pointId]: data }) });
  }

  function handleOutlineRemove(pointId) {
    const cleaned = { ...funcData };
    delete cleaned[pointId];
    onUpdate({ functional_elements: serializeFunctionalElements(cleaned) });
  }

  // SPRD Q3 — sufficiency per Continue button. The disabled-Continue UX consumes
  // these. SFDI's per-boundary thresholds extend `evaluateAdvance` later; the
  // call sites here don't change. Empty-evidence baseline today.
  const subPhaseSufficiency = evaluateAdvance(sermon, "sub_phase", activeSubPhase);
  // Narrowed dep — step 2 → step 3 gate reads only main_point_pair, so
  // unrelated edits (Observe, Interpret, RT, Implications) shouldn't re-run it.
  // Mirrors the FrameTab.jsx pattern for the Frame → Manuscript gate.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const step2Sufficiency = useMemo(() => evaluateAdvance(sermon, "step", 2), [sermon.main_point_pair]);
  const step3Sufficiency = evaluateAdvance(sermon, "step", 3);

  // SPRD C2 — vertical throughline rail data. Computed every render off the
  // four parsed phase columns. Cheap (just iteration over the field defs).
  const railSubPhases = buildRailSubPhases(sermon, obsData, intData, redData, impData, activeSubPhase, currentActiveFieldKey);

  // Active field def — looked up across all four sub-phases. Fields opt into
  // the takeover layout via `takeoverWhenActive: true` in their def. As of
  // Session 3 the opted-in set is: Phase 1 Field 3 (Divisions), Phase 2
  // Field 8 (Interpretation Synthesis), Phase 3 Field 5 (Christ-Connection
  // Statement), Phase 4 Field 4 (Implications Synthesis). The flag itself
  // is the source of truth — no per-sub-phase guard.
  const activeFieldDef =
    OBSERVE_FIELDS.find((f) => f.key === currentActiveFieldKey) ||
    INTERPRET_FIELDS.find((f) => f.key === currentActiveFieldKey) ||
    REDEMPTIVE_FIELDS.find((f) => f.key === currentActiveFieldKey) ||
    IMPLICATIONS_FIELDS.find((f) => f.key === currentActiveFieldKey) ||
    null;
  const wantsTakeover =
    !!activeFieldDef?.takeoverWhenActive &&
    activeStep === 1 &&
    !tourActive &&
    !takeoverOverride;

  return (
    <div className="study-tab-shell">
      <div style={{ position: "relative" }}>
        <StudyStepStrip activeStep={activeStep} onStepChange={jumpToStep} />
        <div style={{ position: "absolute", top: "8px", right: "10px" }}>
          <FeedbackFlag surface="study-tab" sermonId={sermon?.id ?? null} step={activeStep ?? null} />
        </div>
      </div>
      <div className={`study-three-col${wantsTakeover ? " study-three-col-takeover" : ""}`}>
        <ThroughlineRail
          subPhases={railSubPhases}
          activeSubPhaseId={activeStep === 1 ? SUB_PHASE_IDS[activeSubPhase - 1] : null}
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
            {/*
              Throughline canvas — pause-point coordination:
                - Normal: shows activeSubPhase (catches up immediately on advance).
                - During a sub-phase pause-point: shows the prior sub-phase view
                  (pausePoint.priorSubPhase). When pastor clicks Begin and clears
                  the pause-point, displayedSubPhase jumps to activeSubPhase and
                  CSS animates the prior pane shrinking to a strip + new pane
                  fading in.
                - During the Implications → MPT/MPS step transition pause-point:
                  canvas keeps rendering the Implications view (priorSubPhase=4)
                  even though activeStep has flipped to 2; on dismiss, the canvas
                  unmounts (since activeStep !== 1).
            */}
            {(() => {
              const inExegesis = activeStep === 1;
              const stepTransitionPausePoint =
                pausePoint && pausePoint.nextKey === "step_2";
              const shouldRender =
                !wantsTakeover && (inExegesis || stepTransitionPausePoint);
              if (!shouldRender) return null;
              const displayed = pausePoint
                ? pausePoint.priorSubPhase
                : activeSubPhase;
              return (
                <ThroughlineCanvas
                  sermon={sermon}
                  activeSubPhase={displayed}
                />
              );
            })()}
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

      {/* ── Pause-point — discrete sub-phase boundary screen. ── */}
      {pausePoint && (() => {
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

      {/* ── Step 1: Exegesis ── */}
      {!pausePoint && activeStep === 1 && (
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
                crossPhaseRead={(column) => {
                  // SPRD B2.2 — Phase 2 Field 8 Q1 (cumulative-synthesis-table)
                  // reads the canonical thought-unit array from
                  // observations.divisions.thought_units. Phase 3 + 4 will
                  // extend this map as their cross-phase questions land.
                  if (column === "observations") return obsData;
                  return null;
                }}
                crossPhaseWrite={(column, fieldKey, qKey, value) => {
                  if (column === "observations") {
                    updateStructured("observations", obsData, fieldKey, value, qKey);
                  }
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
                crossPhaseRead={(column) => {
                  // SPRD B3.2 — Phase 3 Field 5 Q1 (cumulative-synthesis-table)
                  // reads the canonical thought-unit array from
                  // observations.divisions.thought_units (Phase 3 adds the
                  // `christ_connection` writable column on top of Phase 1's
                  // upstream columns + Phase 2's `meaning` column, all rendered
                  // read-only). Phase 4 will extend the same map to add the
                  // `implication` writable column.
                  if (column === "observations") return obsData;
                  return null;
                }}
                crossPhaseWrite={(column, fieldKey, qKey, value) => {
                  if (column === "observations") {
                    updateStructured("observations", obsData, fieldKey, value, qKey);
                  }
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
                crossPhaseRead={(column) => {
                  // SPRD B4.2 — Phase 4 Field 4 Q1 (cumulative-synthesis-table)
                  // reads the canonical thought-unit array from
                  // observations.divisions.thought_units (Phase 4 adds the
                  // final writable column `implication` on top of Phase 1's
                  // upstream columns + Phase 2's `meaning` + Phase 3's
                  // `christ_connection`, all rendered read-only).
                  if (column === "observations") return obsData;
                  return null;
                }}
                crossPhaseWrite={(column, fieldKey, qKey, value) => {
                  if (column === "observations") {
                    updateStructured("observations", obsData, fieldKey, value, qKey);
                  }
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
                : `Continue to ${STEP_LABELS[1]} →`}
            </PrimaryButton>
            <AdvanceGateChecklist sufficiency={subPhaseSufficiency} />
          </div>
        </div>
      )}

      {/* ── Step 2: MPT/MPS Forge — SADI Step 2 plumbing (v19, 2026-05-05) ── */}
      {!pausePoint && activeStep === 2 && (
        <div className="study-step-active" data-tour-id="mpt-field">
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
              onClick={advanceStep}
              disabled={!step2Sufficiency.ok}
              title={step2Sufficiency.reason || ""}
            >
              {`Continue to ${STEP_LABELS[2]} →`}
            </PrimaryButton>
            <AdvanceGateChecklist sufficiency={step2Sufficiency} />
          </div>
        </div>
      )}

      {/* ── Step 3: Outline Builder ── */}
      {!pausePoint && activeStep === 3 && (
        <div className="study-step-active" data-tour-id="outline-builder">
          <OutlineBuilder
            outline={outline}
            onUpdate={(newOutline) => onUpdate({ outline: serializeOutline(newOutline) })}
            onRemove={handleOutlineRemove}
          />

          {outline.length > 0 && (
            <div className="step-advance">
              <PrimaryButton
                size="sm"
                onClick={advanceStep}
                disabled={!step3Sufficiency.ok}
                title={step3Sufficiency.reason || ""}
              >
                {`Continue to ${STEP_LABELS[3]} →`}
              </PrimaryButton>
              <AdvanceGateChecklist sufficiency={step3Sufficiency} />
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Functional Elements ── */}
      {!pausePoint && activeStep === 4 && (
        <div className="study-step-active" data-tour-id="functional-elements">
          {outline.map((pt, i) => (
            <FuncElem
              key={pt.id}
              pointText={pt.text}
              pointId={pt.id}
              displayIndex={i}
              funcData={funcData}
              onUpdate={updateFuncData}
              onUpdateText={(id, text) => {
                const updated = outline.map(p => p.id === id ? { ...p, text } : p);
                onUpdate({ outline: serializeOutline(updated) });
              }}
            />
          ))}

          <div className="step-advance">
            <PrimaryButton size="sm" onClick={() => onTabChange?.(STAGE.Blueprint)}>
              Continue to Blueprint →
            </PrimaryButton>
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
