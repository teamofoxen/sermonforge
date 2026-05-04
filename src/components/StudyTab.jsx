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
} from "../utils/studyFields";
import SpotlightWorksheet from "./SpotlightWorksheet";
import AdvanceGateChecklist from "./AdvanceGateChecklist";
import OutlineBuilder from "./OutlineBuilder";
import InlineAIResponse from "./InlineAIResponse";
import ProposalPanel from "./ProposalPanel";
import { OUTLINE_SYSTEM, outlineHasNumberedList, extractOutlineWithExplanations } from "../utils/outlineChat";
import { parseAIJson, validateScriptureMap } from "../utils/aiSchema";
import { buildSystemPrompt, appendTaskDirective } from "../prompts/sermon";
import {
  FE_CHAT_SYSTEM,
  OBSERVE_REVIEW_TASK, INTERPRET_REVIEW_TASK, REDEMPTIVE_REVIEW_TASK, IMPLICATIONS_REVIEW_TASK,
  MPT_DRAFT_TASK, MPS_Q1_TRANSLATE_TASK, MPS_CHAT_TASK,
  POPULATE_SCRIPTURE_TASK,
  OUTLINE_REVIEW_TASK, CHALLENGE_MPT_TASK,
  BRIEF_OBSERVE_TO_INTERPRET_TASK, BRIEF_INTERPRET_TO_REDEMPTIVE_TASK, BRIEF_REDEMPTIVE_TO_IMPLICATIONS_TASK,
  BRIEF_EXEGESIS_TO_MPT_MPS_TASK, BRIEF_MPT_MPS_TO_OUTLINE_TASK, BRIEF_OUTLINE_TO_FE_TASK,
} from "../prompts/study";
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
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-ghost)", marginBottom: "12px" }}>Sermon Shape</div>

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
              style={{ minHeight: "60px", fontFamily: "'Crimson Pro', serif", fontSize: "15px", fontStyle: "italic" }}
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

  useEffect(() => {
    setMpsChat([]);
    setMpsChatInput("");
    setMpsChatLoading(false);
  }, [sermon.id]);
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

  // MPS conversational refinement
  const [mpsChat, setMpsChat] = useState([]); // [{role, content}]
  const [mpsChatInput, setMpsChatInput] = useState("");
  const [mpsChatLoading, setMpsChatLoading] = useState(false);

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

  async function sendMpsChat() {
    const input = mpsChatInput.trim();
    if (!input || mpsChatLoading) return;
    const newUserMsg = { role: "user", content: input };
    const history = [...mpsChat, newUserMsg];
    setMpsChat(history);
    setMpsChatInput("");
    setMpsChatLoading(true);
    try {
      const step = STEPS.MPT_MPS;
      const context = buildContext({ sermon, step });
      const contextPrefix = context ? `CONTEXT:\n${context}\n\nUSER REQUEST:\n` : "";
      const messages = history.map((m, i) =>
        i === history.length - 1 ? { ...m, content: contextPrefix + m.content } : m
      );
      const result = await sendAIMessage(messages, layerTask(MPS_CHAT_TASK, step), step, sermon.id);
      if (result.ok && result.text.trim()) {
        setMpsChat(prev => [...prev, { role: "assistant", content: result.text.trim() }]);
      } else if (!result.ok && result.kind !== "aborted") {
        setMpsChat(prev => [...prev, { role: "assistant", content: result.message }]);
      }
    } catch (e) {
      setMpsChat(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setMpsChatLoading(false);
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
  const step2Sufficiency = evaluateAdvance(sermon, "step", 2);
  const step3Sufficiency = evaluateAdvance(sermon, "step", 3);

  return (
    <div className="study-stage-container">

      {/* ── Step indicator ── */}
      <div className="step-indicator" data-tour-id="study-step-indicator">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const status = step < activeStep ? "done" : step === activeStep ? "current" : "future";
          return (
            <button
              key={step}
              data-tour-id={`study-step-pill-${step}`}
              className={`step-pill step-pill-${status}`}
              onClick={() => jumpToStep(step)}
            >
              <span className="step-pill-num">{step}</span>
              <span className="step-pill-label">{label}</span>
            </button>
          );
        })}
      </div>

      <SermonShapePreview sermon={sermon} outline={outline} funcData={funcData} />

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
          <div className="subphase-indicator" data-tour-id="study-subphase-indicator">
            {PHASE_LABELS.map((label, i) => {
              const phase = i + 1;
              const status = phase < activeSubPhase ? "done" : phase === activeSubPhase ? "current" : "future";
              return (
                <button
                  key={phase}
                  data-tour-id={`study-subphase-pill-${phase}`}
                  className={`subphase-pill subphase-pill-${status}`}
                  onClick={() => jumpToSubPhase(phase)}
                >
                  {phase < activeSubPhase && <span className="subphase-check">✓ </span>}
                  {label}
                </button>
              );
            })}
          </div>

          {activeSubPhase === 2 && <SummaryBlock summaryKey="p2" {...summaryProps} />}
          {activeSubPhase === 3 && <SummaryBlock summaryKey="p3" {...summaryProps} />}
          {activeSubPhase === 4 && <SummaryBlock summaryKey="p4" {...summaryProps} />}

          {activeSubPhase === 1 && (
            <div className="sub-phase-body" data-tour-id="phase-1-worksheet">
              <p className="sub-phase-hint">Observe the text — what it says before what it means. Read and reread prayerfully.</p>
              <SpotlightWorksheet
                fields={OBSERVE_FIELDS}
                data={obsData}
                onChange={(fieldKey, qKey, value) => updateStructured("observations", obsData, fieldKey, value, qKey)}
                onToggleNA={(fieldKey, qKey) => toggleStructuredNA("observations", obsData, fieldKey, qKey)}
                legacyNotes={obsData.legacy_notes}
                sermonId={sermon.id}
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
              <p className="sub-phase-hint">Find the meaning of the text. Move from observation to interpretation.</p>
              <SpotlightWorksheet
                fields={INTERPRET_FIELDS}
                data={intData}
                onChange={(fieldKey, qKey, value) => updateStructured("interpretation", intData, fieldKey, value, qKey)}
                onToggleNA={(fieldKey, qKey) => toggleStructuredNA("interpretation", intData, fieldKey, qKey)}
                legacyNotes={intData.legacy_notes}
                sermonId={sermon.id}
                crossPhaseRead={(column) => {
                  // SPRD B2.2 — Phase 2 Field 7 Q1 (cumulative-synthesis-table)
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
              <p className="sub-phase-hint">Find the redemptive features. How does this text point to or depend on Christ?</p>
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
              <p className="sub-phase-hint">Concluding implications — how does this passage apply to us today?</p>

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

      {/* ── Step 2: MPT → MPS Forge ── */}
      {activeStep === 2 && (
        <div className="study-step-active">
          <SummaryBlock summaryKey="s2" {...summaryProps} />

          <div className="mpt-mps-grid">
            <div className="field-group" data-tour-id="mpt-field">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Main Point of the Text (MPT)</label>
                {(sermon.passage || hasAnyAnswer(obsData)) && (
                  <SecondaryButton
                    size="sm"
                    onClick={generateMPT}
                    disabled={draftLoading !== null}
                    style={{ fontSize: "12px" }}
                  >
                    {draftLoading === "mpt" ? "Thinking…" : "Draft →"}
                  </SecondaryButton>
                )}
              </div>
              <textarea
                className="field-textarea"
                rows={3}
                style={{ minHeight: "80px" }}
                value={sermon.mpt || ""}
                onChange={(e) => onUpdate({ mpt: e.target.value })}
                onInput={(e) => autoResize(e.target)}
                ref={(el) => autoResize(el)}
                placeholder="The main point of the text in past tense — what the author was saying to the original audience."
              />
              <ProposalPanel
                loading={draftLoading === "mpt"}
                proposal={mptProposal}
                label="AI proposes MPT"
                acceptLabel={sermon.mpt?.trim() ? "Replace MPT" : "Use this"}
                onAccept={() => {
                  onUpdate({ mpt: mptProposal });
                  setMptProposal(null);
                }}
                onDiscard={() => setMptProposal(null)}
              />
            </div>
            <div className="field-group" data-tour-id="mps-field">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Main Point of the Sermon (MPS)</label>
                {sermon.mpt?.trim() && (
                  <SecondaryButton
                    size="sm"
                    onClick={generateMPS}
                    disabled={draftLoading !== null}
                    style={{ fontSize: "12px" }}
                  >
                    {draftLoading === "mps" ? "Thinking…" : "Draft →"}
                  </SecondaryButton>
                )}
              </div>
              <textarea
                className="field-textarea"
                rows={3}
                style={{ minHeight: "80px" }}
                value={sermon.mps || ""}
                onChange={(e) => onUpdate({ mps: e.target.value })}
                onInput={(e) => autoResize(e.target)}
                ref={(el) => autoResize(el)}
                placeholder="The main point of the sermon in present tense — what this text is saying to this congregation today."
              />
              <ProposalPanel
                loading={draftLoading === "mps"}
                proposal={mpsProposal}
                label="AI proposes MPS"
                acceptLabel={sermon.mps?.trim() ? "Replace MPS" : "Use this"}
                onAccept={() => {
                  onUpdate({ mps: mpsProposal });
                  setMpsProposal(null);
                }}
                onDiscard={() => setMpsProposal(null)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <SecondaryButton
              size="sm"
              disabled={inlineLoading !== null}
              onClick={() => fetchInline(
                "mpt-challenge",
                `MPT to challenge: "${sermon.mpt || "(not written)"}"`,
                CHALLENGE_MPT_TASK,
                STEPS.MPT_MPS,
              )}
            >
              Challenge My MPT
            </SecondaryButton>
            <SecondaryButton
              size="sm"
              disabled={inlineLoading !== null}
              onClick={() => fetchInline(
                "mpt-mps-chain",
                `Evaluate the MPT→MPS chain on this sermon.`,
                `Evaluate whether this MPS grows organically from this MPT. MPT: "${sermon.mpt || "(not written)"}". MPS: "${sermon.mps || "(not written)"}". Does the MPS follow from the MPT or is it imposed? Is the chain clean, weak, or broken? Be specific.`,
                STEPS.MPT_MPS,
              )}
            >
              Check MPT→MPS Chain
            </SecondaryButton>
          </div>

          <InlineAIResponse
            fieldName="MPT Challenge"
            response={inlineResponses["mpt-challenge"]}
            loading={inlineLoading === "mpt-challenge"}
            onDismiss={() => dismissInline("mpt-challenge")}
          />
          <InlineAIResponse
            fieldName="MPT→MPS Chain"
            response={inlineResponses["mpt-mps-chain"]}
            loading={inlineLoading === "mpt-mps-chain"}
            onDismiss={() => dismissInline("mpt-mps-chain")}
          />

          {sermon.mps?.trim() && (
            <div className="mps-chat" style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span className="field-label" style={{ marginBottom: 0, color: "var(--ink-ghost)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Refine MPS with AI</span>
                {mpsChat.length > 0 && (
                  <IconButton aria-label="Clear MPS chat" className="inline-ai-dismiss" onClick={() => setMpsChat([])}>Clear</IconButton>
                )}
              </div>
              {mpsChat.map((msg, i) => {
                if (msg.role === "user") {
                  return (
                    <div key={i} style={{ textAlign: "right", marginBottom: "6px" }}>
                      <span style={{ background: "var(--surface-2)", borderRadius: "8px", padding: "6px 10px", fontSize: "13px", display: "inline-block", maxWidth: "85%", textAlign: "left" }}>{msg.content}</span>
                    </div>
                  );
                }
                const revisedMatch = msg.content.match(/Revised MPS:\s*(.+?)(?:\n|$)/);
                return (
                  <div key={i} className="inline-ai-response" style={{ marginBottom: "8px" }}>
                    <div className="ai-markdown" style={{ marginBottom: revisedMatch ? "8px" : "0" }}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {revisedMatch && (
                      <SecondaryButton
                        size="sm"
                        style={{ fontSize: "12px" }}
                        onClick={() => onUpdate({ mps: revisedMatch[1].trim() })}
                      >
                        → Apply to MPS
                      </SecondaryButton>
                    )}
                  </div>
                );
              })}
              {mpsChatLoading && (
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
                  placeholder="Too abstract. Lean harder into the doubt angle…"
                  value={mpsChatInput}
                  onChange={e => setMpsChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMpsChat(); } }}
                  disabled={mpsChatLoading}
                />
                <SecondaryButton
                  size="sm"
                  style={{ alignSelf: "flex-end", fontSize: "12px", whiteSpace: "nowrap" }}
                  onClick={sendMpsChat}
                  disabled={mpsChatLoading || !mpsChatInput.trim()}
                >
                  Ask →
                </SecondaryButton>
              </div>
            </div>
          )}

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
                  fontFamily: "'Crimson Pro', serif",
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
  );
}
