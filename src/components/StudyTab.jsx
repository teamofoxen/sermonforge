import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useTour } from "../contexts/TourContext";
import { getOutline, serializeOutline, getFunctionalElements, serializeFunctionalElements, autoResize } from "../utils";
import { STEPS, PHASES, PHASE_SEQUENCE, STEP_SEQUENCE } from "../constants/steps";
import { sendAIMessage } from "../utils/ai";
import { buildContext } from "../utils/contextBuilder";
import {
  OBSERVE_FIELDS, INTERPRET_FIELDS,
  REDEMPTIVE_FIELDS,
  IMPLICATIONS_FIELDS,
  parseStructuredField, serializeStructuredField,
  getPrimaryAnswer, setPrimaryAnswer, setQuestionAnswer, hasAnyAnswer,
  isQuestionNA, setQuestionNA, DEFAULT_QUESTION_KEY,
  flattenToText,
  fieldQuestions, getQuestionAnswer, flattenAnswerValue,
} from "../utils/studyFields";
import SpotlightWorksheet from "./SpotlightWorksheet";
import AdvanceGateChecklist from "./AdvanceGateChecklist";
import ThroughlineRail from "./ThroughlineRail";
import ScripturePanel from "./ScripturePanel";
import OutlineBuilder from "./OutlineBuilder";
import InlineAIResponse from "./InlineAIResponse";
import ProposalPanel from "./ProposalPanel";
import { OUTLINE_SYSTEM, outlineHasNumberedList, extractOutlineWithExplanations } from "../utils/outlineChat";
import { parseAIJson, validateScriptureMap } from "../utils/aiSchema";
import { buildSystemPrompt, appendTaskDirective } from "../prompts/sermon";
import {
  FE_CHAT_SYSTEM,
  OBSERVE_REVIEW_TASK, INTERPRET_REVIEW_TASK, REDEMPTIVE_REVIEW_TASK, IMPLICATIONS_REVIEW_TASK,
  MPT_DRAFT_TASK, MPS_Q1_TRANSLATE_TASK,
  POPULATE_SCRIPTURE_TASK,
  OUTLINE_REVIEW_TASK,
  BRIEF_OBSERVE_TO_INTERPRET_TASK, BRIEF_INTERPRET_TO_REDEMPTIVE_TASK, BRIEF_REDEMPTIVE_TO_IMPLICATIONS_TASK,
  BRIEF_EXEGESIS_TO_MPT_MPS_TASK, BRIEF_MPT_MPS_TO_OUTLINE_TASK, BRIEF_OUTLINE_TO_FE_TASK,
} from "../prompts/study";
import { MAIN_POINT_PAIR_FIELDS } from "../utils/sadiAnchorFields";
import { fetchPassage } from "../db/database";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import IconButton from "./primitives/IconButton";
import { STAGE, STEP, ContractViolation } from "../core/contracts";
import { transitionState } from "../core/spine";
import {
  canonicalSubPhase, canonicalStep,
  buildSubPhaseEvidence, buildStepEvidence,
  evaluateAdvance, formatAdvanceRejection,
} from "../utils/studyAdvancement";

const STEP_LABELS = ["Exegesis", "MPT / MPS", "Outline", "Functional Elements"];
const PHASE_LABELS = ["Observe", "Interpret", "Redemptive Thread", "Implications"];

// SPRD Q1 spine-routing helpers and Q3 sufficiency evaluator live in
// `src/utils/studyAdvancement.js`. SFDI's per-boundary thresholds extend
// `evaluateAdvance` there; UI consumers in this file don't change.

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

function SummaryBlock({ summaryKey, summaries, summaryLoading }) {
  const text = summaries[summaryKey];
  const loading = summaryLoading === summaryKey;
  if (!text && !loading) return null;
  return (
    <div className="summary-block">
      {loading ? (
        <span className="summary-loading">Synthesizing previous work…</span>
      ) : (
        <>
          <div className="summary-label">From your previous work</div>
          <div className="summary-content">{text}</div>
        </>
      )}
    </div>
  );
}

function SermonShapePreview({ sermon, outline, funcData }) {
  const hasMPT = !!sermon.mpt?.trim();
  const hasMPS = !!sermon.mps?.trim();
  const hasIntro = hasMPT || hasMPS;
  const hasBody = outline.length > 0;

  if (!hasIntro && !hasBody) return null;

  return (
    <div style={{ background: "var(--parchment-warm)", border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)", padding: "16px 20px", marginBottom: "20px", fontSize: "14px", color: "var(--ink-soft)" }}>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-ghost)", marginBottom: "12px" }}>Sermon Shape</div>

      {hasIntro && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontWeight: "600", color: "var(--ink-mid)", marginBottom: "4px" }}>Introduction</div>
          {hasMPT && <div style={{ paddingLeft: "12px", marginBottom: "2px" }}><span style={{ color: "var(--ink-ghost)", fontSize: "12px" }}>MPT  </span>{sermon.mpt}</div>}
          {hasMPS && <div style={{ paddingLeft: "12px" }}><span style={{ color: "var(--ink-ghost)", fontSize: "12px" }}>MPS  </span>{sermon.mps}</div>}
        </div>
      )}

      {hasBody && (
        <div>
          <div style={{ fontWeight: "600", color: "var(--ink-mid)", marginBottom: "6px" }}>Body</div>
          {outline.map((pt, i) => {
            const d = funcData[pt.id] || {};
            const tags = [d.explanation && "E", d.application && "A", d.illustration && "I"].filter(Boolean);
            return (
              <div key={pt.id} style={{ paddingLeft: "12px", marginBottom: "6px" }}>
                <div style={{ color: "var(--ink)" }}><span style={{ color: "var(--gold)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", marginRight: "6px" }}>{i + 1}.</span>{pt.text}</div>
                {tags.length > 0 && (
                  <div style={{ paddingLeft: "18px", fontSize: "12px", color: "var(--ink-ghost)" }}>{tags.join(" · ")}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
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

export default function StudyTab({ sermon, onUpdate, onAI, aiLoading, onStepChange, onTabChange, onSummaryGenerated, onMovement }) {
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

  const [summaries, setSummaries] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(null);
  const funcData = getFunctionalElements(sermon);

  // Inline AI response state — keyed by section name
  const [inlineResponses, setInlineResponses] = useState({});
  const [inlineLoading, setInlineLoading] = useState(null); // key of section currently loading

  // Draft-generation loading flags
  const [draftLoading, setDraftLoading] = useState(null); // "mpt" | "mps" | "big_idea"

  // AI draft proposals — Mutation Contract: AI proposals live in a separate
  // slot until the user explicitly accepts. The corresponding field is never
  // overwritten by AI without a click.
  const [mptProposal, setMptProposal] = useState(null);
  const [mpsProposal, setMpsProposal] = useState(null);
  // Populate Scripture proposal — holds the resolved fe-update + summary text
  // until the pastor accepts. Shape: { next, summary }.
  const [scriptureProposal, setScriptureProposal] = useState(null);
  const [confirmOutlineApplyIdx, setConfirmOutlineApplyIdx] = useState(null);
  const [populateScriptureMessage, setPopulateScriptureMessage] = useState(null);

  // Outline conversational refinement
  const [outlineChat, setOutlineChat] = useState([]);
  const [outlineChatInput, setOutlineChatInput] = useState("");
  const [outlineChatLoading, setOutlineChatLoading] = useState(false);

  // Functional elements conversational refinement
  const [feChat, setFeChat] = useState([]);
  const [feChatInput, setFeChatInput] = useState("");
  const [feChatLoading, setFeChatLoading] = useState(false);
  const [scripturePopulating, setScripturePopulating] = useState(false);

  const outline = getOutline(sermon);

  // ── Structured field data for each phase ──
  const obsData = useMemo(() => parseStructuredField(sermon.observations), [sermon.observations]);
  const intData = useMemo(() => parseStructuredField(sermon.interpretation), [sermon.interpretation]);
  const redData = useMemo(() => parseStructuredField(sermon.redemptive_thread), [sermon.redemptive_thread]);
  const impData = useMemo(() => parseStructuredField(sermon.implications), [sermon.implications]);
  // SADI Step 2 — Main Point Pair envelope (v19). Holds MPT (2Q) + MPS (3Q).
  const mppData = useMemo(() => parseStructuredField(sermon.main_point_pair), [sermon.main_point_pair]);

  // Read the tightened MPT/MPS values from the envelope. The flat
  // sermon.mpt / sermon.mps columns are auto-synced from these on write,
  // so downstream readers (AI prompts, context builder, exports) keep
  // working without rewrites.
  const mptTighten = useMemo(() => flattenAnswerValue(getQuestionAnswer(mppData, "mpt", "tighten")), [mppData]);
  const mpsTranslate = useMemo(() => flattenAnswerValue(getQuestionAnswer(mppData, "mps", "translate")), [mppData]);

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
    const next = setQuestionAnswer(currentData, fieldKey, qKey, value);
    onUpdate({ [column]: serializeStructuredField(next) });
  }, [onUpdate]);

  const toggleStructuredNA = useCallback((column, currentData, fieldKey, qKey = DEFAULT_QUESTION_KEY) => {
    const wasNA = isQuestionNA(currentData, fieldKey, qKey);
    const next = setQuestionNA(currentData, fieldKey, qKey, !wasNA);
    onUpdate({ [column]: serializeStructuredField(next) });
  }, [onUpdate]);

  // Layer a task directive on top of the canonical system prompt for this
  // sermon and step. Call sites pass only the task-shaped string; the role,
  // tool context, message-context rules, step description, and adaptive hints
  // come from buildSystemPrompt. Mirrors the pattern used in AIPanel.jsx.
  const layerTask = useCallback((taskDirective, step) =>
    appendTaskDirective(buildSystemPrompt(step, sermon.id), taskDirective),
  [sermon.id]);

  async function fetchInline(key, userRequest, taskDirective, step) {
    setInlineLoading(key);
    try {
      const context = buildContext({ sermon, step });
      const userContent = context
        ? `CONTEXT:\n${context}\n\nUSER REQUEST:\n${userRequest}`
        : userRequest;
      const result = await sendAIMessage([{ role: "user", content: userContent }], layerTask(taskDirective, step), step, sermon.id);
      if (result.ok) {
        setInlineResponses(prev => ({ ...prev, [key]: result.text }));
      } else if (result.kind !== "aborted") {
        setInlineResponses(prev => ({ ...prev, [key]: result.message }));
      }
    } catch (e) {
      setInlineResponses(prev => ({ ...prev, [key]: `Error: ${e.message}` }));
    } finally {
      setInlineLoading(null);
    }
  }

  function dismissInline(key) {
    setInlineResponses(prev => { const n = { ...prev }; delete n[key]; return n; });
  }


  async function generateMPT() {
    if (draftLoading) return;
    setDraftLoading("mpt");
    setMptProposal(null);
    try {
      const step = STEPS.MPT_MPS;
      const context = buildContext({ sermon, step });
      const userContent = context
        ? `CONTEXT:\n${context}\n\nUSER REQUEST:\nDraft a Main Point of the Text (MPT) for this passage.`
        : "Draft a Main Point of the Text (MPT) for this passage.";
      const result = await sendAIMessage(
        [{ role: "user", content: userContent }],
        layerTask(MPT_DRAFT_TASK, step),
        step,
        sermon.id,
      );
      if (result.ok && result.text.trim()) setMptProposal(result.text.trim());
    } catch (e) {
      console.error("[generateMPT]", e);
    } finally {
      setDraftLoading(null);
    }
  }

  async function generateMPS() {
    if (draftLoading || !sermon.mpt?.trim()) return;
    setDraftLoading("mps");
    setMpsProposal(null);
    try {
      const step = STEPS.MPT_MPS;
      const context = buildContext({ sermon, step });
      const userContent = context
        ? `CONTEXT:\n${context}\n\nUSER REQUEST:\nDraft a Main Point of the Sermon (MPS) grounded in the MPT.`
        : "Draft a Main Point of the Sermon (MPS) grounded in the MPT.";
      const result = await sendAIMessage(
        [{ role: "user", content: userContent }],
        layerTask(MPS_Q1_TRANSLATE_TASK, step),
        step,
        sermon.id,
      );
      if (result.ok && result.text.trim()) setMpsProposal(result.text.trim());
    } catch (e) {
      console.error("[generateMPS]", e);
    } finally {
      setDraftLoading(null);
    }
  }

  async function suggestOutline() {
    if (draftLoading || outlineChatLoading) return;
    setDraftLoading("outline-draft");
    setOutlineChat([]);
    try {
      const step = STEPS.OUTLINE;
      const context = buildContext({ sermon, step });
      const userContent = context
        ? `CONTEXT:\n${context}\n\nUSER REQUEST:\nPropose a sermon outline.`
        : "Propose a sermon outline.";
      const result = await sendAIMessage(
        [{ role: "user", content: userContent }],
        layerTask(OUTLINE_SYSTEM, step),
        step,
        sermon.id,
      );
      if (result.ok && result.text.trim()) setOutlineChat([{ role: "assistant", content: result.text.trim() }]);
    } catch (e) {
      console.error("[suggestOutline]", e);
    } finally {
      setDraftLoading(null);
    }
  }

  async function sendOutlineChat() {
    const input = outlineChatInput.trim();
    if (!input || outlineChatLoading) return;
    const newUserMsg = { role: "user", content: input };
    const history = [...outlineChat, newUserMsg];
    setOutlineChat(history);
    setOutlineChatInput("");
    setOutlineChatLoading(true);
    try {
      const step = STEPS.OUTLINE;
      const context = buildContext({ sermon, step });
      const contextPrefix = context ? `CONTEXT:\n${context}\n\nUSER REQUEST:\n` : "";
      const messages = history.map((m, i) =>
        i === history.length - 1 ? { ...m, content: contextPrefix + m.content } : m
      );
      const result = await sendAIMessage(messages, layerTask(OUTLINE_SYSTEM, step), step, sermon.id);
      if (result.ok && result.text.trim()) {
        setOutlineChat(prev => [...prev, { role: "assistant", content: result.text.trim() }]);
      } else if (!result.ok && result.kind !== "aborted") {
        setOutlineChat(prev => [...prev, { role: "assistant", content: result.message }]);
      }
    } catch (e) {
      setOutlineChat(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setOutlineChatLoading(false);
    }
  }

  async function generateSummary(key, briefRequest, taskDirective, step) {
    setSummaryLoading(key);
    try {
      const context = buildContext({ sermon, step });
      const userContent = context
        ? `CONTEXT:\n${context}\n\nUSER REQUEST:\n${briefRequest}`
        : briefRequest;
      const result = await sendAIMessage(
        [{ role: "user", content: userContent }],
        layerTask(taskDirective, step),
        step,
        sermon.id,
      );
      if (result.ok) {
        setSummaries(prev => ({ ...prev, [key]: result.text }));
        if (key === "s3" || key === "s4") onSummaryGenerated?.(key, result.text);
      }
    } catch (e) {
      console.error("Summary generation failed:", e);
    } finally {
      setSummaryLoading(prev => (prev === key ? null : prev));
    }
  }

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
      generateSummary(
        "s2",
        "Brief me on the complete exegetical work before I forge the main point.",
        BRIEF_EXEGESIS_TO_MPT_MPS_TASK,
        STEPS.MPT_MPS,
      );
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
      generateSummary(
        "p2",
        "Brief me on the observations before I move into interpretation.",
        BRIEF_OBSERVE_TO_INTERPRET_TASK,
        PHASES.INTERPRET,
      );
    } else if (next === 3) {
      generateSummary(
        "p3",
        "Brief me on the interpretive conclusions before I work the redemptive thread.",
        BRIEF_INTERPRET_TO_REDEMPTIVE_TASK,
        PHASES.REDEMPTIVE_THREAD,
      );
    } else if (next === 4) {
      generateSummary(
        "p4",
        "Brief me on the Christ-connection before I draw implications.",
        BRIEF_REDEMPTIVE_TO_IMPLICATIONS_TASK,
        PHASES.IMPLICATIONS,
      );
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

    if (next === 3) {
      generateSummary(
        "s3",
        "Brief me before I build the sermon outline.",
        BRIEF_MPT_MPS_TO_OUTLINE_TASK,
        STEPS.OUTLINE,
      );
    } else if (next === 4) {
      generateSummary(
        "s4",
        "Brief me before I develop functional elements per outline point.",
        BRIEF_OUTLINE_TO_FE_TASK,
        STEPS.FUNCTIONAL_ELEMENTS,
      );
    }
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

  async function populateScripture() {
    if (!sermon.passage || outline.length === 0 || scripturePopulating) return;
    setScripturePopulating(true);
    setPopulateScriptureMessage(null);
    setScriptureProposal(null);
    try {
      // Mutation Contract #1: user typing wins by default. Skip rows that already
      // have user-entered Scripture content; only fill empty rows.
      const eligible = outline.filter(pt => !(funcData[pt.id]?.scripture?.trim()));
      const skippedCount = outline.length - eligible.length;

      if (eligible.length === 0) {
        setPopulateScriptureMessage({
          tone: "info",
          text: `All ${outline.length} point${outline.length === 1 ? "" : "s"} already have Scripture filled — nothing to populate.`,
        });
        return;
      }

      const pts = eligible.map((p, i) => `${i + 1}. ${p.text}`).join("\n");
      const step = STEPS.FUNCTIONAL_ELEMENTS;
      const context = buildContext({ sermon, step });
      const userContent = context
        ? `CONTEXT:\n${context}\n\nUSER REQUEST:\nMap each outline point below to its most relevant verse range within the passage.\n\nOutline points to map:\n${pts}`
        : `Outline points to map:\n${pts}\n\nMap each to its most relevant verse range within the passage.`;
      const result = await sendAIMessage(
        [{ role: "user", content: userContent }],
        layerTask(POPULATE_SCRIPTURE_TASK, step),
        step,
        sermon.id,
      );
      if (!result.ok) {
        if (result.kind === "aborted") return;
        setPopulateScriptureMessage({ tone: "error", text: `Could not populate Scripture: ${result.message}` });
        return;
      }
      const resp = result.text;
      const parsed = parseAIJson(resp);
      if (!parsed.ok) {
        setPopulateScriptureMessage({ tone: "error", text: `Could not populate Scripture: ${parsed.reason}` });
        return;
      }
      const validated = validateScriptureMap(parsed.value);
      if (!validated.ok) {
        setPopulateScriptureMessage({ tone: "error", text: `Could not populate Scripture: ${validated.reason}` });
        return;
      }
      const map = validated.value;
      const next = { ...funcData };
      const previewLines = [];
      let populated = 0;
      await Promise.all(
        eligible.map(async (pt, i) => {
          const ref = map[String(i + 1)];
          if (!ref) return;
          const result = await fetchPassage(ref);
          if (result?.esv) {
            next[pt.id] = { ...(next[pt.id] || { explanation: "", application: "", illustration: "" }), scripture: result.esv };
            populated += 1;
            previewLines.push({ idx: outline.indexOf(pt) + 1, text: pt.text, ref, esv: result.esv });
          }
        })
      );
      if (populated === 0) {
        setPopulateScriptureMessage({ tone: "info", text: "Nothing to populate — no verse mappings returned." });
        return;
      }
      previewLines.sort((a, b) => a.idx - b.idx);
      const summary = [
        skippedCount > 0
          ? `Will populate ${populated} of ${eligible.length} empty point${eligible.length === 1 ? "" : "s"} (${skippedCount} already had Scripture, left untouched).`
          : `Will populate ${populated} of ${eligible.length} point${eligible.length === 1 ? "" : "s"}.`,
        "",
        ...previewLines.map(p => `Point ${p.idx} — ${p.ref}\n${p.esv}`),
      ].join("\n");
      setScriptureProposal({
        next,
        summary,
        message: skippedCount > 0
          ? `Populated ${populated} of ${eligible.length} empty point${eligible.length === 1 ? "" : "s"} (${skippedCount} already had Scripture, left untouched).`
          : `Populated ${populated} of ${eligible.length} point${eligible.length === 1 ? "" : "s"}.`,
      });
    } catch (e) {
      console.error("[populateScripture]", e);
      setPopulateScriptureMessage({ tone: "error", text: `Could not populate Scripture: ${e.message}` });
    } finally {
      setScripturePopulating(false);
    }
  }

  async function sendFeChat() {
    const input = feChatInput.trim();
    if (!input || feChatLoading) return;
    const newUserMsg = { role: "user", content: input };
    const history = [...feChat, newUserMsg];
    setFeChat(history);
    setFeChatInput("");
    setFeChatLoading(true);
    try {
      const step = STEPS.FUNCTIONAL_ELEMENTS;
      const context = buildContext({ sermon, step });
      const contextPrefix = context ? `CONTEXT:\n${context}\n\nUSER REQUEST:\n` : "";
      const messages = history.map((m, i) =>
        i === history.length - 1 ? { ...m, content: contextPrefix + m.content } : m
      );
      const result = await sendAIMessage(messages, layerTask(FE_CHAT_SYSTEM, step), step, sermon.id);
      if (result.ok && result.text.trim()) {
        setFeChat(prev => [...prev, { role: "assistant", content: result.text.trim() }]);
      } else if (!result.ok && result.kind !== "aborted") {
        setFeChat(prev => [...prev, { role: "assistant", content: result.message }]);
      }
    } catch (e) {
      setFeChat(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setFeChatLoading(false);
    }
  }

  const summaryProps = { summaries, summaryLoading };

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

  // Active field def (Phase 1 only — only Phase 1 Field 3 carries the
  // takeover flag today; expand the lookup if later phases opt in).
  const activeFieldDef = OBSERVE_FIELDS.find((f) => f.key === currentActiveFieldKey) || null;
  const wantsTakeover =
    !!activeFieldDef?.takeoverWhenActive &&
    activeStep === 1 &&
    activeSubPhase === 1 &&
    !tourActive &&
    !takeoverOverride;

  return (
    <div className="study-tab-shell">
      <StudyStepStrip activeStep={activeStep} onStepChange={jumpToStep} />
      <div className={`study-three-col${wantsTakeover ? " study-three-col-takeover" : ""}`}>
        <ThroughlineRail
          subPhases={railSubPhases}
          activeSubPhaseId={activeStep === 1 ? SUB_PHASE_IDS[activeSubPhase - 1] : null}
          onFieldClick={handleRailFieldClick}
        />
        <div className="study-write-col">
          {wantsTakeover && (
            <button
              type="button"
              className="field-takeover-restore"
              onClick={() => setTakeoverOverride(true)}
              title="Restore the throughline rail"
            >
              ↺ Restore rail
            </button>
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

      {/* ── Step 1: Exegesis ── */}
      {activeStep === 1 && (
        <div className="study-step-active">

          {activeSubPhase === 2 && <SummaryBlock summaryKey="p2" {...summaryProps} />}
          {activeSubPhase === 3 && <SummaryBlock summaryKey="p3" {...summaryProps} />}
          {activeSubPhase === 4 && <SummaryBlock summaryKey="p4" {...summaryProps} />}

          {activeSubPhase === 1 && (
            <div className="sub-phase-body" data-tour-id="phase-1-worksheet">
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
              <div style={{ marginTop: "8px" }}>
                <SecondaryButton
                  size="sm"
                  onClick={() => {
                    // Use flattenToText so multi-question fields surface
                    // (closes B1.0-era getPrimaryAnswer-only bug for Phase 1).
                    const filled = flattenToText(obsData, OBSERVE_FIELDS);
                    fetchInline(
                      "observe",
                      `My observations:\n\n${filled || "(none yet)"}`,
                      OBSERVE_REVIEW_TASK,
                      PHASES.OBSERVE,
                    );
                  }}
                  disabled={inlineLoading !== null}
                >
                  {inlineLoading === "observe" ? "Thinking…" : "Review →"}
                </SecondaryButton>
              </div>
              <InlineAIResponse
                fieldName="Observations"
                response={inlineResponses["observe"]}
                loading={inlineLoading === "observe"}
                onDismiss={() => dismissInline("observe")}
              />
            </div>
          )}

          {activeSubPhase === 2 && (
            <div className="sub-phase-body" data-tour-id="phase-2-worksheet">
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
              <div style={{ marginTop: "8px" }}>
                <SecondaryButton
                  size="sm"
                  onClick={() => {
                    // Use flattenToText so multi-question fields surface
                    // (closes B1.0-era getPrimaryAnswer-only bug for Phase 2).
                    const filled = flattenToText(intData, INTERPRET_FIELDS);
                    fetchInline(
                      "interpret",
                      `My interpretation:\n\n${filled || "(none yet)"}`,
                      INTERPRET_REVIEW_TASK,
                      PHASES.INTERPRET,
                    );
                  }}
                  disabled={inlineLoading !== null}
                >
                  {inlineLoading === "interpret" ? "Thinking…" : "Review →"}
                </SecondaryButton>
              </div>
              <InlineAIResponse
                fieldName="Interpretation"
                response={inlineResponses["interpret"]}
                loading={inlineLoading === "interpret"}
                onDismiss={() => dismissInline("interpret")}
              />
            </div>
          )}

          {activeSubPhase === 3 && (
            <div className="sub-phase-body" data-tour-id="phase-3-worksheet">
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

              <div style={{ marginTop: "8px" }}>
                <SecondaryButton
                  size="sm"
                  onClick={() => {
                    // Use flattenToText so multi-question fields surface
                    // (closes B1.0-era getPrimaryAnswer-only bug for Phase 3).
                    const filled = flattenToText(redData, REDEMPTIVE_FIELDS);
                    fetchInline(
                      "redemptive",
                      `Redemptive thread answers:\n\n${filled || "(none yet)"}`,
                      REDEMPTIVE_REVIEW_TASK,
                      PHASES.REDEMPTIVE_THREAD,
                    );
                  }}
                  disabled={inlineLoading !== null}
                >
                  {inlineLoading === "redemptive" ? "Thinking…" : "Review →"}
                </SecondaryButton>
              </div>
              <InlineAIResponse
                fieldName="Redemptive Thread"
                response={inlineResponses["redemptive"]}
                loading={inlineLoading === "redemptive"}
                onDismiss={() => dismissInline("redemptive")}
              />
            </div>
          )}

          {activeSubPhase === 4 && (
            <div className="sub-phase-body" data-tour-id="phase-4-worksheet">
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

              <div style={{ marginTop: "8px" }}>
                <SecondaryButton
                  size="sm"
                  onClick={() => {
                    // Build the review prompt's "filled" content using
                    // flattenToText so multi-question fields (Fields 1/2/3)
                    // surface — closes the B1.0-era `getPrimaryAnswer`-only
                    // bug for Phase 4's Review path.
                    const filled = flattenToText(impData, IMPLICATIONS_FIELDS);
                    fetchInline(
                      "implications",
                      `Implications:\n\n${filled || "(none yet)"}`,
                      IMPLICATIONS_REVIEW_TASK,
                      PHASES.IMPLICATIONS,
                    );
                  }}
                  disabled={inlineLoading !== null}
                >
                  {inlineLoading === "implications" ? "Thinking…" : "Review →"}
                </SecondaryButton>
              </div>
              <InlineAIResponse
                fieldName="Implications"
                response={inlineResponses["implications"]}
                loading={inlineLoading === "implications"}
                onDismiss={() => dismissInline("implications")}
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
      {activeStep === 2 && (
        <div className="study-step-active" data-tour-id="mpt-field">
          <SummaryBlock summaryKey="s2" {...summaryProps} />

          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <SecondaryButton
              size="sm"
              onClick={generateMPT}
              disabled={draftLoading !== null || (!sermon.passage && !hasAnyAnswer(obsData))}
              style={{ fontSize: "12px" }}
              title={!sermon.passage && !hasAnyAnswer(obsData) ? "Add a passage or Observe content first" : ""}
            >
              {draftLoading === "mpt" ? "Thinking…" : "Draft MPT (Q1) →"}
            </SecondaryButton>
            <SecondaryButton
              size="sm"
              onClick={generateMPS}
              disabled={draftLoading !== null || !mptTighten?.trim()}
              style={{ fontSize: "12px" }}
              title={!mptTighten?.trim() ? "Tighten MPT to a single sentence first (MPT Q2)" : ""}
            >
              {draftLoading === "mps" ? "Thinking…" : "Draft MPS (Q1) →"}
            </SecondaryButton>
          </div>

          <ProposalPanel
            loading={draftLoading === "mpt"}
            proposal={mptProposal}
            label="AI proposes MPT Draft (Q1)"
            acceptLabel={flattenAnswerValue(getQuestionAnswer(mppData, "mpt", "draft"))?.trim() ? "Replace MPT Draft" : "Use this"}
            onAccept={() => {
              updateMPP("mpt", "draft", mptProposal);
              setMptProposal(null);
            }}
            onDiscard={() => setMptProposal(null)}
          />
          <ProposalPanel
            loading={draftLoading === "mps"}
            proposal={mpsProposal}
            label="AI proposes MPS Translate (Q1)"
            acceptLabel={mpsTranslate?.trim() ? "Replace MPS Translate" : "Use this"}
            onAccept={() => {
              updateMPP("mps", "translate", mpsProposal);
              setMpsProposal(null);
            }}
            onDiscard={() => setMpsProposal(null)}
          />

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
      {activeStep === 3 && (
        <div className="study-step-active" data-tour-id="outline-builder">
          <SummaryBlock summaryKey="s3" {...summaryProps} />

<OutlineBuilder
            outline={outline}
            onUpdate={(newOutline) => onUpdate({ outline: serializeOutline(newOutline) })}
            onRemove={handleOutlineRemove}
          />

          <div style={{ marginTop: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
            <SecondaryButton
              size="sm"
              disabled={draftLoading !== null || outlineChatLoading || inlineLoading !== null}
              onClick={suggestOutline}
            >
              {draftLoading === "outline-draft" ? "Thinking…" : "Suggest Outline"}
            </SecondaryButton>
            <SecondaryButton
              size="sm"
              disabled={inlineLoading !== null || draftLoading !== null || outlineChatLoading}
              onClick={() => {
                // Exegesis + outline come from buildContext at step OUTLINE.
                const pts = outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n");
                fetchInline(
                  "outline-review",
                  `Outline to review:\n${pts || "(no points yet)"}`,
                  OUTLINE_REVIEW_TASK,
                  STEPS.OUTLINE,
                );
              }}
            >
              {inlineLoading === "outline-review" ? "Thinking…" : "Review Outline"}
            </SecondaryButton>
          </div>

          <InlineAIResponse
            fieldName="Outline Review"
            response={inlineResponses["outline-review"]}
            loading={inlineLoading === "outline-review"}
            onDismiss={() => dismissInline("outline-review")}
          />

          {(outlineChat.length > 0 || draftLoading === "outline-draft") && (
            <div className="mps-chat" style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span className="field-label" style={{ marginBottom: 0, color: "var(--ink-ghost)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Refine Outline with AI</span>
                {outlineChat.length > 0 && (
                  <IconButton aria-label="Clear outline chat" className="inline-ai-dismiss" onClick={() => setOutlineChat([])}>Clear</IconButton>
                )}
              </div>
              {outlineChat.map((msg, i) => {
                if (msg.role === "user") {
                  return (
                    <div key={i} style={{ textAlign: "right", marginBottom: "6px" }}>
                      <span style={{ background: "var(--surface-2)", borderRadius: "8px", padding: "6px 10px", fontSize: "13px", display: "inline-block", maxWidth: "85%", textAlign: "left" }}>{msg.content}</span>
                    </div>
                  );
                }
                const extracted = outlineHasNumberedList(msg.content) ? extractOutlineWithExplanations(msg.content) : null;
                return (
                  <div key={i} className="inline-ai-response" style={{ marginBottom: "8px" }}>
                    <div className="ai-markdown" style={{ marginBottom: extracted ? "8px" : "0" }}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {extracted && (() => {
                      // Mutation Contract #4: replacing existing user-typed outline
                      // points is destructive — require a two-step inline confirm.
                      // When outline is empty, single-click is fine (no user content
                      // to lose).
                      const isDestructive = outline.length > 0;
                      const inConfirm = confirmOutlineApplyIdx === i;
                      const commit = () => {
                        const existing = getFunctionalElements(sermon);
                        onUpdate({
                          outline: serializeOutline(extracted.points),
                          functional_elements: serializeFunctionalElements({ ...existing, ...extracted.explanations }),
                        });
                        setConfirmOutlineApplyIdx(null);
                      };
                      if (!isDestructive) {
                        return (
                          <SecondaryButton size="sm" style={{ fontSize: "12px" }} onClick={commit}>
                            → Apply to Outline
                          </SecondaryButton>
                        );
                      }
                      if (inConfirm) {
                        return (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <PrimaryButton size="sm" style={{ fontSize: "12px" }} onClick={commit}>
                              Replace {outline.length} existing point{outline.length === 1 ? "" : "s"}
                            </PrimaryButton>
                            <SecondaryButton size="sm" style={{ fontSize: "12px" }} onClick={() => setConfirmOutlineApplyIdx(null)}>
                              Cancel
                            </SecondaryButton>
                          </div>
                        );
                      }
                      return (
                        <SecondaryButton size="sm" style={{ fontSize: "12px" }} onClick={() => setConfirmOutlineApplyIdx(i)}>
                          → Apply to Outline
                        </SecondaryButton>
                      );
                    })()}
                  </div>
                );
              })}
              {outlineChatLoading && (
                <div className="inline-ai-response" style={{ marginBottom: "8px" }}>
                  <div className="ai-loading" style={{ padding: "6px 0" }}>
                    <div className="ai-loading-dot" /><div className="ai-loading-dot" /><div className="ai-loading-dot" />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <textarea
                  className="field-textarea"
                  rows={2}
                  style={{ flex: 1, minHeight: "unset", fontSize: "13px", resize: "none" }}
                  placeholder="Make these more diagnostic. Sharpen MP2…"
                  value={outlineChatInput}
                  onChange={e => setOutlineChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendOutlineChat(); } }}
                  disabled={outlineChatLoading}
                />
                <SecondaryButton
                  size="sm"
                  style={{ alignSelf: "flex-end", fontSize: "12px", whiteSpace: "nowrap" }}
                  onClick={sendOutlineChat}
                  disabled={outlineChatLoading || !outlineChatInput.trim()}
                >
                  Ask →
                </SecondaryButton>
              </div>
            </div>
          )}

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
      {activeStep === 4 && (
        <div className="study-step-active" data-tour-id="functional-elements">
          <SummaryBlock summaryKey="s4" {...summaryProps} />

          {outline.length > 0 && sermon.passage && (
            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <SecondaryButton
                size="sm"
                disabled={scripturePopulating}
                onClick={populateScripture}
                title="Fills empty Scripture rows only — rows with content are left untouched"
              >
                {scripturePopulating ? "Loading…" : "Populate Scripture (ESV)"}
              </SecondaryButton>
              {populateScriptureMessage && (
                <span style={{
                  fontSize: "12px",
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  color: populateScriptureMessage.tone === "error"
                    ? "#a04040"
                    : populateScriptureMessage.tone === "info"
                      ? "var(--ink-ghost)"
                      : "var(--ink-soft)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}>
                  {populateScriptureMessage.text}
                  <IconButton
                    aria-label="Dismiss message"
                    onClick={() => setPopulateScriptureMessage(null)}
                    style={{
                      background: "transparent", border: "none",
                      color: "var(--ink-ghost)", fontSize: "14px", lineHeight: 1, padding: 0,
                    }}
                    title="Dismiss"
                  >×</IconButton>
                </span>
              )}
            </div>
          )}

          <ProposalPanel
            loading={scripturePopulating}
            proposal={scriptureProposal?.summary || null}
            label="AI proposes Scripture mapping"
            acceptLabel="Use this"
            onAccept={() => {
              if (!scriptureProposal) return;
              onUpdate({ functional_elements: serializeFunctionalElements(scriptureProposal.next) });
              setPopulateScriptureMessage({ tone: "ok", text: scriptureProposal.message });
              setScriptureProposal(null);
            }}
            onDiscard={() => setScriptureProposal(null)}
          />

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

          <div style={{ marginTop: "12px" }}>
            <SecondaryButton
              size="sm"
              disabled={inlineLoading !== null}
              onClick={() => {
                const allEAI = outline.map((pt, i) => {
                  const d = funcData[pt.id] || {};
                  return `Point ${i + 1}: ${pt.text}\n  E: ${d.explanation || "(none)"}\n  A: ${d.application || "(none)"}\n  I: ${d.illustration || "(none)"}`;
                }).join("\n\n");
                fetchInline(
                  "eai-review",
                  `Functional elements to evaluate:\n${allEAI}`,
                  `Evaluate the Explanation/Application/Illustration balance across all outline points for ${sermon.passage || "this passage"}. Is explanation too thin or too heavy? Is application gospel-rooted or behavior-driven? Are the illustrations doing real work? Give a point-by-point assessment.`,
                  STEPS.FUNCTIONAL_ELEMENTS,
                );
              }}
            >
              {inlineLoading === "eai-review" ? "Thinking…" : "Review E/A/I Balance"}
            </SecondaryButton>
          </div>

          <InlineAIResponse
            fieldName="E/A/I Balance"
            response={inlineResponses["eai-review"]}
            loading={inlineLoading === "eai-review"}
            onDismiss={() => dismissInline("eai-review")}
          />

          {/* AI chat for developing functional elements */}
          <div className="mps-chat" style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span className="field-label" style={{ marginBottom: 0, color: "var(--ink-ghost)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Develop with AI</span>
              {feChat.length > 0 && (
                <IconButton aria-label="Clear functional elements chat" className="inline-ai-dismiss" onClick={() => setFeChat([])}>Clear</IconButton>
              )}
            </div>
            {feChat.map((msg, i) => {
              if (msg.role === "user") {
                return (
                  <div key={i} style={{ textAlign: "right", marginBottom: "6px" }}>
                    <span style={{ background: "var(--surface-2)", borderRadius: "8px", padding: "6px 10px", fontSize: "13px", display: "inline-block", maxWidth: "85%", textAlign: "left" }}>{msg.content}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="inline-ai-response" style={{ marginBottom: "8px" }}>
                  <div className="ai-markdown">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
            {feChatLoading && (
              <div className="inline-ai-response" style={{ marginBottom: "8px" }}>
                <div className="ai-loading" style={{ padding: "6px 0" }}>
                  <div className="ai-loading-dot" /><div className="ai-loading-dot" /><div className="ai-loading-dot" />
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <textarea
                className="field-textarea"
                rows={2}
                style={{ flex: 1, minHeight: "unset", fontSize: "13px", resize: "none" }}
                placeholder="Help me develop Point 2's application. Suggest an illustration for Point 1…"
                value={feChatInput}
                onChange={e => setFeChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFeChat(); } }}
                disabled={feChatLoading}
              />
              <SecondaryButton
                size="sm"
                style={{ alignSelf: "flex-end", fontSize: "12px", whiteSpace: "nowrap" }}
                onClick={sendFeChat}
                disabled={feChatLoading || !feChatInput.trim()}
              >
                Ask →
              </SecondaryButton>
            </div>
          </div>

          <div className="step-advance">
            <PrimaryButton size="sm" onClick={() => onTabChange?.(STAGE.Blueprint)}>
              Continue to Blueprint →
            </PrimaryButton>
          </div>
        </div>
      )}

          </div>
        </div>
        <ScripturePanel passage={sermon.passage} />
      </div>
    </div>
  );
}
