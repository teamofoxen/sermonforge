import { useState, useEffect, useMemo, useCallback } from "react";
import { useDemo } from "../contexts/DemoContext";
import TierBadge from "./TierBadge";
import { getOutline, serializeOutline, getFunctionalElements, serializeFunctionalElements, autoResize, createOutlinePoint } from "../utils";
import { STEPS, PHASES, PHASE_SEQUENCE, STEP_SEQUENCE } from "../constants/steps";
import { sendAIMessage } from "../utils/ai";
import {
  OBSERVE_FIELDS, INTERPRET_FIELDS,
  REDEMPTIVE_FIELDS, REDEMPTIVE_SUMMARY_KEY,
  IMPLICATIONS_THEOLOGICAL, IMPLICATIONS_PERSONAL,
  IMPLICATIONS_UNBELIEVER_KEY, IMPLICATIONS_COMPILED_KEY,
  parseStructuredField, serializeStructuredField,
} from "../utils/studyFields";
import OutlineBuilder from "./OutlineBuilder";
import InlineAIResponse from "./InlineAIResponse";
import PassagePopup from "./PassagePopup";

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

function FuncElem({ pointText, pointId, displayIndex, funcData, onUpdate }) {
  const [open, setOpen] = useState(false);
  const data = funcData[pointId] || { explanation: "", application: "", illustration: "" };

  function update(field, val) {
    onUpdate(pointId, { ...data, [field]: val });
  }

  return (
    <div className="func-elem">
      <div className="func-elem-header" onClick={() => setOpen((v) => !v)}>
        <span className="func-elem-title">
          <span style={{ color: "var(--gold)", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", marginRight: "8px" }}>{displayIndex + 1}.</span>
          {pointText || `Point ${displayIndex + 1}`}
        </span>
        <CollapseArrow open={open} />
      </div>
      {open && (
        <div className="func-elem-body">
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


/**
 * StructuredWorksheet — renders a list of field definitions as labeled textareas.
 * Each field gets its own row with the question as the label and the hint as placeholder.
 */
function StructuredWorksheet({ fields, data, onChange, legacyNotes }) {
  return (
    <div className="structured-worksheet">
      {legacyNotes && (
        <div className="worksheet-legacy">
          <div className="worksheet-legacy-label">Previous notes (before structured fields)</div>
          <div className="worksheet-legacy-content">{legacyNotes}</div>
        </div>
      )}
      {fields.map((f) => (
        <div key={f.key} className="worksheet-field">
          <label className="worksheet-field-label">{f.label}</label>
          <textarea
            className="field-textarea"
            rows={2}
            value={data[f.key] || ""}
            onChange={(e) => onChange(f.key, e.target.value)}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
            placeholder={f.hint || ""}
          />
        </div>
      ))}
    </div>
  );
}

export default function StudyTab({ sermon, onUpdate, onAI, aiLoading, onStepChange, onTabChange }) {
  const { demoMode } = useDemo();
  const [activeStep, setActiveStep] = useState(() => {
    const saved = localStorage.getItem(`sermonforge_study_step_${sermon.id}`);
    return saved ? parseInt(saved, 10) : 1;
  });
  const [activeSubPhase, setActiveSubPhase] = useState(() => {
    const saved = localStorage.getItem(`sermonforge_study_subphase_${sermon.id}`);
    return saved ? parseInt(saved, 10) : 1;
  });

  useEffect(() => {
    localStorage.setItem(`sermonforge_study_step_${sermon.id}`, activeStep);
    localStorage.setItem(`sermonforge_study_subphase_${sermon.id}`, activeSubPhase);
  }, [activeStep, activeSubPhase, sermon.id]);
  const [summaries, setSummaries] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(null);
  const [funcData, setFuncData] = useState(() => getFunctionalElements(sermon));

  // Inline AI response state — keyed by section name
  const [inlineResponses, setInlineResponses] = useState({});
  const [inlineLoading, setInlineLoading] = useState(null); // key of section currently loading

  // Draft-generation loading flags
  const [draftLoading, setDraftLoading] = useState(null); // "mpt" | "mps" | "big_idea"

  // Passage popup anchor — DOM element of the triggering button, or null when closed
  const [passageAnchor, setPassageAnchor] = useState(null);

  const outline = getOutline(sermon);

  // ── Structured field data for each phase ──
  const obsData = useMemo(() => parseStructuredField(sermon.observations), [sermon.observations]);
  const intData = useMemo(() => parseStructuredField(sermon.interpretation), [sermon.interpretation]);
  const redData = useMemo(() => parseStructuredField(sermon.redemptive_thread), [sermon.redemptive_thread]);
  const impData = useMemo(() => parseStructuredField(sermon.implications), [sermon.implications]);

  const updateStructured = useCallback((column, currentData, key, value) => {
    const next = { ...currentData, [key]: value };
    onUpdate({ [column]: serializeStructuredField(next) });
  }, [onUpdate]);

  async function fetchInline(key, prompt, system) {
    setInlineLoading(key);
    try {
      const response = await sendAIMessage([{ role: "user", content: prompt }], system);
      setInlineResponses(prev => ({ ...prev, [key]: response }));
    } catch (e) {
      setInlineResponses(prev => ({ ...prev, [key]: `Error: ${e.message}` }));
    } finally {
      setInlineLoading(null);
    }
  }

  function dismissInline(key) {
    setInlineResponses(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  /** Format structured field data (or legacy text) into readable text for AI summaries. */
  function formatPhaseText(data, fieldDefs) {
    if (!data || typeof data !== "object") return "(none)";
    const parts = [];
    if (data.legacy_notes?.trim()) parts.push(data.legacy_notes.trim());
    for (const f of fieldDefs) {
      if (data[f.key]?.trim()) parts.push(`${f.label}: ${data[f.key].trim()}`);
    }
    return parts.length > 0 ? parts.join("\n\n") : "(none)";
  }

  async function generateMPT() {
    if (draftLoading) return;
    setDraftLoading("mpt");
    try {
      const resp = await sendAIMessage(
        [{ role: "user", content: `Passage: ${sermon.passage || "unknown"}\n\nObservations:\n${formatPhaseText(obsData, OBSERVE_FIELDS)}\n\nInterpretation:\n${formatPhaseText(intData, INTERPRET_FIELDS)}\n\nDraft a Main Point of the Text (MPT) for this passage. The MPT is a single sentence in past tense summarizing what the author was saying to the original audience. Return only the sentence.` }],
        "You are a biblical scholar helping a pastor formulate the main point of a text. The MPT must be historically grounded, past tense, and accurately reflect the author's original intent."
      );
      if (resp?.trim()) onUpdate({ mpt: resp.trim() });
    } catch (e) {
      console.error("[generateMPT]", e);
    } finally {
      setDraftLoading(null);
    }
  }

  async function generateMPS() {
    if (draftLoading || !sermon.mpt?.trim()) return;
    setDraftLoading("mps");
    try {
      const redThread = formatPhaseText(redData, REDEMPTIVE_FIELDS);
      const implications = formatPhaseText(impData, [...IMPLICATIONS_THEOLOGICAL, ...IMPLICATIONS_PERSONAL]);
      const resp = await sendAIMessage(
        [{ role: "user", content: `Passage: ${sermon.passage || "unknown"}\n\nMPT: ${sermon.mpt}\n\nRedemptive Thread:\n${redThread || "(none)"}\n\nImplications:\n${implications || "(none)"}\n\nDraft a Main Point of the Sermon (MPS) that flows organically from this MPT and is informed by the redemptive thread and implications above. The MPS is a single sentence in present tense stating what this text says to this congregation today. Return only the sentence.` }],
        "You are a homiletics consultant helping a pastor bridge the MPT to a present-tense sermon claim. The MPS must grow directly from the MPT — not be imposed from outside — and should reflect the theological and applicational weight the pastor has already surfaced."
      );
      if (resp?.trim()) onUpdate({ mps: resp.trim() });
    } catch (e) {
      console.error("[generateMPS]", e);
    } finally {
      setDraftLoading(null);
    }
  }

  async function suggestOutline() {
    if (draftLoading) return;
    setDraftLoading("outline");
    try {
      const exegesisContext = [
        `Passage: ${sermon.passage || "unknown"}`,
        `MPT: ${sermon.mpt || "(none)"}`,
        `MPS: ${sermon.mps || "(none)"}`,
        `\nObservations:\n${formatPhaseText(obsData, OBSERVE_FIELDS)}`,
        `\nInterpretation:\n${formatPhaseText(intData, INTERPRET_FIELDS)}`,
        `\nRedemptive Thread:\n${formatPhaseText(redData, REDEMPTIVE_FIELDS)}`,
        `\nImplications:\n${formatPhaseText(impData, [...IMPLICATIONS_THEOLOGICAL, ...IMPLICATIONS_PERSONAL])}`,
      ].join("\n");
      const resp = await sendAIMessage(
        [{ role: "user", content: `${exegesisContext}\n\nPropose a sermon outline. Return only a numbered list of 3–4 points. Each point must be a single declarative sentence that derives from the text's own logic and ladders up to the MPS.` }],
        "You are a homiletics consultant helping a pastor structure a sermon. The outline must emerge from the text's argument — not be imposed on it. Each point is a standalone claim the congregation can grasp and remember."
      );
      if (!resp?.trim()) return;
      const lines = resp.trim().split("\n").filter(l => /^\d+[\.\)]/.test(l.trim()));
      if (lines.length === 0) return;
      const newPoints = lines.map(l => createOutlinePoint(l.replace(/^\d+[\.\)]\s*/, "").trim()));
      onUpdate({ outline: serializeOutline([...outline, ...newPoints]) });
    } catch (e) {
      console.error("[suggestOutline]", e);
    } finally {
      setDraftLoading(null);
    }
  }

  async function generateBigIdea() {
    if (draftLoading) return;
    setDraftLoading("big_idea");
    try {
      const resp = await sendAIMessage(
        [{ role: "user", content: `Passage: ${sermon.passage || "unknown"}\n\nMPT: ${sermon.mpt || "(none)"}\nMPS: ${sermon.mps || "(none)"}\n\nDraft a one-sentence sermon big idea that captures the central truth of this sermon. Make it sharp and memorable. Return only the sentence.` }],
        "You are a sermon preparation consultant helping a pastor crystallize a sermon big idea."
      );
      if (resp?.trim()) onUpdate({ big_idea: resp.trim() });
    } catch (e) {
      console.error("[generateBigIdea]", e);
    } finally {
      setDraftLoading(null);
    }
  }

  async function generateSummary(key, userPrompt, systemPrompt) {
    setSummaryLoading(key);
    try {
      const response = await sendAIMessage(
        [{ role: "user", content: userPrompt }],
        systemPrompt
      );
      setSummaries(prev => ({ ...prev, [key]: response }));
    } catch (e) {
      console.error("Summary generation failed:", e);
    } finally {
      setSummaryLoading(prev => (prev === key ? null : prev));
    }
  }

  function advanceSubPhase() {
    const next = activeSubPhase + 1;

    if (next > 4) {
      setActiveStep(2);
      setActiveSubPhase(1);
      onStepChange?.(STEPS.MPT_MPS);
      generateSummary(
        "s2",
        `Passage: ${sermon.passage || "unknown"}.\n\nPhase 1 – Observations:\n${formatPhaseText(obsData, OBSERVE_FIELDS)}\n\nPhase 2 – Interpretation:\n${formatPhaseText(intData, INTERPRET_FIELDS)}\n\nPhase 3 – Redemptive Thread:\n${formatPhaseText(redData, REDEMPTIVE_FIELDS)}\n\nPhase 4 – Implications:\n${formatPhaseText(impData, [...IMPLICATIONS_THEOLOGICAL, ...IMPLICATIONS_PERSONAL])}`,
        `You are synthesizing a preacher's complete exegetical work on ${sermon.passage || "a passage"} before they forge the main point. Provide 4–6 concise bullet points covering: key textual observations, interpretive conclusions, the Christ-connection established, and theological and practical implications surfaced. This will directly inform their MPT and MPS. Be specific to the text, not generic.`
      );
      return;
    }

    setActiveSubPhase(next);
    onStepChange?.(PHASE_SEQUENCE[next - 1]);

    if (next === 2) {
      generateSummary(
        "p2",
        `Passage: ${sermon.passage || "unknown"}.\n\nObservations:\n${formatPhaseText(obsData, OBSERVE_FIELDS)}`,
        `Summarize the key observations a preacher noted about ${sermon.passage || "a biblical passage"} in 3–5 concise bullet points. These will orient their interpretation work. Synthesis only — no quality commentary.`
      );
    } else if (next === 3) {
      generateSummary(
        "p3",
        `Passage: ${sermon.passage || "unknown"}.\n\nInterpretation notes:\n${formatPhaseText(intData, INTERPRET_FIELDS)}`,
        `Summarize the key interpretive conclusions reached about ${sermon.passage || "a biblical passage"} in 3–5 bullet points. These will orient work on the redemptive thread. Synthesis only.`
      );
    } else if (next === 4) {
      generateSummary(
        "p4",
        `Passage: ${sermon.passage || "unknown"}.\n\nRedemptive thread:\n${formatPhaseText(redData, REDEMPTIVE_FIELDS)}`,
        `Summarize in 2–3 sentences the Christ-connection a preacher has established for ${sermon.passage || "a biblical passage"}. This will orient their work on theological and practical implications.`
      );
    }
  }

  function advanceStep() {
    const next = activeStep + 1;
    if (next > 4) return;
    setActiveStep(next);
    setActiveSubPhase(1);
    onStepChange?.(STEP_SEQUENCE[next - 1]);

    if (next === 3) {
      generateSummary(
        "s3",
        `Passage: ${sermon.passage || "unknown"}\nMPT: ${sermon.mpt || "(none)"}\nMPS: ${sermon.mps || "(none)"}\n\nObservations:\n${formatPhaseText(obsData, OBSERVE_FIELDS)}\n\nInterpretation:\n${formatPhaseText(intData, INTERPRET_FIELDS)}\n\nRedemptive Thread:\n${formatPhaseText(redData, REDEMPTIVE_FIELDS)}\n\nImplications:\n${formatPhaseText(impData, [...IMPLICATIONS_THEOLOGICAL, ...IMPLICATIONS_PERSONAL])}`,
        `Brief a preacher before they build their sermon outline. In 3–5 bullet points, surface: the textual logic their outline must follow, the theological moves the exegesis demands, the Christ-connection to land, and any application pressures that must be accounted for. Be specific to their work — not generic homiletics advice.`
      );
    } else if (next === 4) {
      const pts = getOutline(sermon).map((p, i) => `${i + 1}. ${p.text}`).join("\n");
      generateSummary(
        "s4",
        `MPS: ${sermon.mps || "(none)"}\nOutline:\n${pts || "(none)"}`,
        `Brief a preacher before they develop functional elements for each outline point. In 2–3 sentences summarize how the outline points carry the MPS, so they can develop each point's explanation, application, and illustration with the full arc in mind.`
      );
    }
  }

  function jumpToStep(step) {
    setActiveStep(step);
    setActiveSubPhase(1);
    onStepChange?.(STEP_SEQUENCE[step - 1]);
  }

  function jumpToSubPhase(phase) {
    setActiveSubPhase(phase);
    onStepChange?.(PHASE_SEQUENCE[phase - 1]);
  }

  function updateFuncData(pointId, data) {
    const next = { ...funcData, [pointId]: data };
    setFuncData(next);
    onUpdate({ functional_elements: serializeFunctionalElements(next) });
  }

  function handleOutlineRemove(pointId) {
    const cleaned = { ...funcData };
    delete cleaned[pointId];
    setFuncData(cleaned);
    onUpdate({ functional_elements: serializeFunctionalElements(cleaned) });
  }

  const summaryProps = { summaries, summaryLoading };

  return (
    <div className="study-stage-container">

      {/* ── Step indicator ── */}
      <div className="step-indicator">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const status = step < activeStep ? "done" : step === activeStep ? "active" : "future";
          return (
            <button key={step} className={`step-pill step-pill-${status}`} onClick={() => jumpToStep(step)}>
              <span className="step-pill-num">{step}</span>
              <span className="step-pill-label">{label}</span>
            </button>
          );
        })}
      </div>

      <SermonShapePreview sermon={sermon} outline={outline} funcData={funcData} />

      {/* Demo pipeline map — shows which step feeds which tier */}
      {demoMode && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", padding: "6px 20px 0", fontSize: "11px", fontFamily: "'Crimson Pro', serif", color: "var(--ink-ghost)" }}>
          <span>Pipeline:</span>
          <TierBadge tier={1} />  <span style={{ color: "var(--ink-ghost)" }}>passage · MPT · MPS</span>
          <span style={{ color: "var(--parchment-deep)" }}>·</span>
          <TierBadge tier={2} />  <span style={{ color: "var(--ink-ghost)" }}>all 4 exegesis phases</span>
          <span style={{ color: "var(--parchment-deep)" }}>·</span>
          <TierBadge tier={3} />  <span style={{ color: "var(--ink-ghost)" }}>outline · functional elements</span>
        </div>
      )}

      {/* ── Step 1: Exegesis ── */}
      {activeStep === 1 && (
        <div className="study-step-active">
          <div className="subphase-indicator">
            {PHASE_LABELS.map((label, i) => {
              const phase = i + 1;
              const status = phase < activeSubPhase ? "done" : phase === activeSubPhase ? "active" : "future";
              return (
                <button key={phase} className={`subphase-pill subphase-pill-${status}`} onClick={() => jumpToSubPhase(phase)}>
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
            <div className="sub-phase-body">
              <p className="sub-phase-hint">Observe the text — what it says before what it means. Read and reread prayerfully.</p>
              <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "flex-end", background: "var(--parchment)", paddingBottom: "6px", marginBottom: "4px" }}>
                <button className="show-text-btn" onMouseEnter={(e) => setPassageAnchor(e.currentTarget)}>Show Text</button>
              </div>
              <StructuredWorksheet
                fields={OBSERVE_FIELDS}
                data={obsData}
                onChange={(key, value) => updateStructured("observations", obsData, key, value)}
                legacyNotes={obsData.legacy_notes}
              />
              <div style={{ marginTop: "8px" }}>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    const filled = OBSERVE_FIELDS
                      .filter(f => obsData[f.key]?.trim())
                      .map(f => `${f.label}: ${obsData[f.key].trim()}`)
                      .join("\n\n");
                    fetchInline(
                      "observe",
                      `Passage: ${sermon.passage || "this passage"}\n\nMy observations on ${sermon.passage || "this passage"}:\n\n${filled || "(none yet)"}`,
                      `Review these observations as a careful biblical scholar would. Evaluate for completeness and accuracy. What key textual features have been noticed? What is missing? Be specific and constructive.`
                    );
                  }}
                  disabled={inlineLoading !== null}
                >
                  {inlineLoading === "observe" ? "Reviewing…" : "Review →"}
                </button>
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
            <div className="sub-phase-body">
              <p className="sub-phase-hint">Find the meaning of the text. Move from observation to interpretation.</p>
              <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "flex-end", background: "var(--parchment)", paddingBottom: "6px", marginBottom: "4px" }}>
                <button className="show-text-btn" onMouseEnter={(e) => setPassageAnchor(e.currentTarget)}>Show Text</button>
              </div>
              <StructuredWorksheet
                fields={INTERPRET_FIELDS}
                data={intData}
                onChange={(key, value) => updateStructured("interpretation", intData, key, value)}
                legacyNotes={intData.legacy_notes}
              />
              <div style={{ marginTop: "8px" }}>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    const filled = INTERPRET_FIELDS
                      .filter(f => intData[f.key]?.trim())
                      .map(f => `${f.label}: ${intData[f.key].trim()}`)
                      .join("\n\n");
                    fetchInline(
                      "interpret",
                      `Passage: ${sermon.passage || "this passage"}\n\nMy interpretation of ${sermon.passage || "this passage"}:\n\n${filled || "(none yet)"}`,
                      `Review this interpretive work as a biblical scholar would. Evaluate for hermeneutical soundness. Does it move correctly from observation to meaning? Are the contextual and lexical insights valid? Be direct.`
                    );
                  }}
                  disabled={inlineLoading !== null}
                >
                  {inlineLoading === "interpret" ? "Reviewing…" : "Review →"}
                </button>
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
            <div className="sub-phase-body">
              <p className="sub-phase-hint">Find the redemptive features. How does this text point to or depend on Christ?</p>
              <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "flex-end", background: "var(--parchment)", paddingBottom: "6px", marginBottom: "4px" }}>
                <button className="show-text-btn" onMouseEnter={(e) => setPassageAnchor(e.currentTarget)}>Show Text</button>
              </div>
              <StructuredWorksheet
                fields={REDEMPTIVE_FIELDS}
                data={redData}
                onChange={(key, value) => updateStructured("redemptive_thread", redData, key, value)}
                legacyNotes={redData.legacy_notes}
              />

              {/* Summary field — auto-synthesized or hand-written */}
              <div className="worksheet-summary-block">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="worksheet-field-label" style={{ marginBottom: 0 }}>Summary of Redemptive Features</label>
                  <button
                    className="btn-ghost btn-sm"
                    disabled={draftLoading !== null}
                    onClick={async () => {
                      setDraftLoading("red_summary");
                      try {
                        const filled = REDEMPTIVE_FIELDS
                          .filter(f => redData[f.key]?.trim())
                          .map(f => `${f.label}: ${redData[f.key].trim()}`)
                          .join("\n\n");
                        const resp = await sendAIMessage(
                          [{ role: "user", content: `Passage: ${sermon.passage || "unknown"}\n\nRedemptive feature answers:\n\n${filled || "(none yet)"}\n\nSynthesize these answers into a cohesive summary of how this passage participates in redemptive history and points to Christ. Write 3–5 sentences. Be specific to the text.` }],
                          "You are a Reformed biblical theologian helping a pastor synthesize redemptive-historical observations into a clear summary. Ground every claim in the text."
                        );
                        if (resp?.trim()) {
                          const next = { ...redData, [REDEMPTIVE_SUMMARY_KEY]: resp.trim() };
                          onUpdate({ redemptive_thread: serializeStructuredField(next) });
                        }
                      } catch (e) {
                        console.error("[redemptive synthesize]", e);
                      } finally { setDraftLoading(null); }
                    }}
                    style={{ fontSize: "12px" }}
                  >
                    {draftLoading === "red_summary" ? "Synthesizing…" : "Synthesize →"}
                  </button>
                </div>
                <textarea
                  className="field-textarea"
                  rows={3}
                  value={redData[REDEMPTIVE_SUMMARY_KEY] || ""}
                  onChange={(e) => updateStructured("redemptive_thread", redData, REDEMPTIVE_SUMMARY_KEY, e.target.value)}
                  onInput={(e) => autoResize(e.target)}
                  ref={(el) => autoResize(el)}
                  placeholder="A cohesive summary of how this passage participates in redemptive history and points to Christ."
                />
              </div>

              <div style={{ marginTop: "8px" }}>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    const filled = REDEMPTIVE_FIELDS
                      .filter(f => redData[f.key]?.trim())
                      .map(f => `${f.label}: ${redData[f.key].trim()}`)
                      .join("\n\n");
                    const summary = redData[REDEMPTIVE_SUMMARY_KEY]?.trim() || "";
                    fetchInline(
                      "redemptive",
                      `Passage: ${sermon.passage || "this passage"}\n\nRedemptive thread for ${sermon.passage || "this passage"}:\n\n${filled}\n\n${summary ? `Summary: ${summary}` : ""}`,
                      `Evaluate this redemptive-historical work as a Reformed biblical theologian would. Is Christ's connection to this passage structurally necessary or decorative? Is the passage placed correctly in redemptive history? Offer specific, textually grounded feedback.`
                    );
                  }}
                  disabled={inlineLoading !== null}
                >
                  {inlineLoading === "redemptive" ? "Reviewing…" : "Review →"}
                </button>
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
            <div className="sub-phase-body">
              <p className="sub-phase-hint">Concluding implications — how does this passage apply to us today?</p>
              <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "flex-end", background: "var(--parchment)", paddingBottom: "6px", marginBottom: "4px" }}>
                <button className="show-text-btn" onMouseEnter={(e) => setPassageAnchor(e.currentTarget)}>Show Text</button>
              </div>

              <div className="worksheet-group-header">Theological Significance</div>
              <StructuredWorksheet
                fields={IMPLICATIONS_THEOLOGICAL}
                data={impData}
                onChange={(key, value) => updateStructured("implications", impData, key, value)}
                legacyNotes={impData.legacy_notes}
              />

              <div className="worksheet-group-header">Personal Application</div>
              <StructuredWorksheet
                fields={IMPLICATIONS_PERSONAL}
                data={impData}
                onChange={(key, value) => updateStructured("implications", impData, key, value)}
              />

              <div className="worksheet-group-header">Implications for Unbelievers</div>
              <div className="worksheet-field">
                <textarea
                  className="field-textarea"
                  rows={2}
                  value={impData[IMPLICATIONS_UNBELIEVER_KEY] || ""}
                  onChange={(e) => updateStructured("implications", impData, IMPLICATIONS_UNBELIEVER_KEY, e.target.value)}
                  onInput={(e) => autoResize(e.target)}
                  ref={(el) => autoResize(el)}
                  placeholder="What are some possible implications for unbelievers?"
                />
              </div>

              {/* Compiled implications list — auto-generated or hand-written */}
              <div className="worksheet-summary-block">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="worksheet-field-label" style={{ marginBottom: 0 }}>Compiled Implications</label>
                  <button
                    className="btn-ghost btn-sm"
                    disabled={draftLoading !== null}
                    onClick={async () => {
                      setDraftLoading("imp_compile");
                      try {
                        const theo = IMPLICATIONS_THEOLOGICAL
                          .filter(f => impData[f.key]?.trim())
                          .map(f => `${f.label} ${impData[f.key].trim()}`)
                          .join("\n");
                        const pers = IMPLICATIONS_PERSONAL
                          .filter(f => impData[f.key]?.trim())
                          .map(f => `${f.label} ${impData[f.key].trim()}`)
                          .join("\n");
                        const unb = impData[IMPLICATIONS_UNBELIEVER_KEY]?.trim() || "";
                        const resp = await sendAIMessage(
                          [{ role: "user", content: `Passage: ${sermon.passage || "unknown"}\n\nTheological significance:\n${theo || "(none)"}\n\nPersonal application:\n${pers || "(none)"}\n\nImplications for unbelievers:\n${unb || "(none)"}\n\nCompile all of these into a single consolidated list of implications. Each item should be one clear, actionable sentence. Group naturally but don't repeat. Include both theological and practical implications.` }],
                          "You are a homiletics consultant helping a pastor compile a master list of sermon implications. Every item must be grounded in the text, gospel-rooted, and congregation-facing."
                        );
                        if (resp?.trim()) {
                          const next = { ...impData, [IMPLICATIONS_COMPILED_KEY]: resp.trim() };
                          onUpdate({ implications: serializeStructuredField(next) });
                        }
                      } catch (e) {
                        console.error("[implications compile]", e);
                      } finally { setDraftLoading(null); }
                    }}
                    style={{ fontSize: "12px" }}
                  >
                    {draftLoading === "imp_compile" ? "Compiling…" : "Compile →"}
                  </button>
                </div>
                <textarea
                  className="field-textarea"
                  rows={4}
                  value={impData[IMPLICATIONS_COMPILED_KEY] || ""}
                  onChange={(e) => updateStructured("implications", impData, IMPLICATIONS_COMPILED_KEY, e.target.value)}
                  onInput={(e) => autoResize(e.target)}
                  ref={(el) => autoResize(el)}
                  placeholder="A consolidated list of all implications from your study — theological, personal, and for unbelievers."
                />
              </div>

              <div style={{ marginTop: "8px" }}>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    const allFields = [...IMPLICATIONS_THEOLOGICAL, ...IMPLICATIONS_PERSONAL]
                      .filter(f => impData[f.key]?.trim())
                      .map(f => `${f.label} ${impData[f.key].trim()}`)
                      .join("\n\n");
                    const compiled = impData[IMPLICATIONS_COMPILED_KEY]?.trim() || "";
                    fetchInline(
                      "implications",
                      `Passage: ${sermon.passage || "this passage"}\n\nImplications from ${sermon.passage || "this passage"}:\n\n${allFields}\n\n${compiled ? `Compiled list: ${compiled}` : ""}`,
                      `Review these implications as a homiletics mentor would. Are the theological claims well-grounded? Are the applications gospel-rooted rather than behavior-driven? Are any obvious implications missing?`
                    );
                  }}
                  disabled={inlineLoading !== null}
                >
                  {inlineLoading === "implications" ? "Reviewing…" : "Review →"}
                </button>
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
            <button className="btn-primary btn-sm" onClick={advanceSubPhase}>
              {activeSubPhase < 4
                ? `Continue to ${PHASE_LABELS[activeSubPhase]} →`
                : `Continue to ${STEP_LABELS[1]} →`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: MPT → MPS Forge ── */}
      {activeStep === 2 && (
        <div className="study-step-active">
          <SummaryBlock summaryKey="s2" {...summaryProps} />

          <div className="mpt-mps-grid">
            <div className="field-group">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Main Point of the Text (MPT)  <TierBadge tier={1} /></label>
                {(sermon.passage || Object.keys(obsData).some(k => k !== "legacy_notes" && obsData[k]?.trim())) && (
                  <button
                    className="btn-ghost btn-sm"
                    onClick={generateMPT}
                    disabled={draftLoading !== null}
                    style={{ fontSize: "12px" }}
                  >
                    {draftLoading === "mpt" ? "Drafting…" : "Draft →"}
                  </button>
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
            </div>
            <div className="field-group">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Main Point of the Sermon (MPS)  <TierBadge tier={1} /></label>
                {sermon.mpt?.trim() && (
                  <button
                    className="btn-ghost btn-sm"
                    onClick={generateMPS}
                    disabled={draftLoading !== null}
                    style={{ fontSize: "12px" }}
                  >
                    {draftLoading === "mps" ? "Drafting…" : "Draft →"}
                  </button>
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
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              className="btn-ghost btn-sm"
              disabled={inlineLoading !== null}
              onClick={() => fetchInline(
                "mpt-challenge",
                `Passage: ${sermon.passage || "unknown"}. MPT: "${sermon.mpt || "(not written)"}"`,
                `Push back on this MPT as a careful biblical scholar would. Evaluate: Does this accurately reflect the author's original intent? Is it past tense and historically grounded? Does it avoid reading back NT theology into OT texts inappropriately? Is anything missing from the text's main thrust? Be direct and specific. Quote the text where relevant. This is not encouragement — it is a scholarly challenge.`
              )}
            >
              Challenge My MPT
            </button>
            <button
              className="btn-ghost btn-sm"
              disabled={inlineLoading !== null}
              onClick={() => fetchInline(
                "mpt-mps-chain",
                `MPT: "${sermon.mpt || "(not written)"}". MPS: "${sermon.mps || "(not written)"}"`,
                `Evaluate whether this MPS grows organically from this MPT. MPT: "${sermon.mpt || "(not written)"}". MPS: "${sermon.mps || "(not written)"}". Does the MPS follow from the MPT or is it imposed? Is the chain clean, weak, or broken? Be specific.`
              )}
            >
              Check MPT→MPS Chain
            </button>
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

          {/* Sermon Big Idea draft — only when MPT or MPS exist */}
          {(sermon.mpt?.trim() || sermon.mps?.trim()) && (
            <div style={{ marginTop: "16px", padding: "14px 16px", background: "var(--parchment-warm)", border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Sermon Big Idea</label>
                <button
                  className="btn-ghost btn-sm"
                  onClick={generateBigIdea}
                  disabled={draftLoading !== null}
                  style={{ fontSize: "12px" }}
                >
                  {draftLoading === "big_idea" ? "Drafting…" : "Draft →"}
                </button>
              </div>
              <input
                style={{ width: "100%", border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)", padding: "8px 10px", fontSize: "14px", fontFamily: "'Crimson Pro', serif", background: "var(--white)", color: "var(--ink)", outline: "none" }}
                value={sermon.big_idea || ""}
                onChange={(e) => onUpdate({ big_idea: e.target.value })}
                placeholder="The controlling idea of this sermon in one sentence."
              />
            </div>
          )}

          <div className="step-advance">
            <button className="btn-primary btn-sm" onClick={advanceStep}>
              {`Continue to ${STEP_LABELS[2]} →`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Outline Builder ── */}
      {activeStep === 3 && (
        <div className="study-step-active">
          <SummaryBlock summaryKey="s3" {...summaryProps} />

          {sermon.big_idea?.trim() && (
            <div style={{ padding: "10px 14px", marginBottom: "14px", background: "var(--ink)", borderRadius: "var(--radius)", display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gold)", flexShrink: 0 }}>Big Idea</span>
              <span style={{ fontSize: "14px", fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "var(--parchment-warm)" }}>{sermon.big_idea}</span>
            </div>
          )}

          <OutlineBuilder
            outline={outline}
            onUpdate={(newOutline) => onUpdate({ outline: serializeOutline(newOutline) })}
            onRemove={handleOutlineRemove}
          />

          <div style={{ marginTop: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="btn-ghost btn-sm"
              disabled={draftLoading !== null || inlineLoading !== null}
              onClick={suggestOutline}
            >
              {draftLoading === "outline" ? "Generating…" : "Suggest Outline"}
            </button>
            <button
              className="btn-ghost btn-sm"
              disabled={inlineLoading !== null || draftLoading !== null}
              onClick={() => {
                const pts = outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n");
                const exegesisContext = [
                  `Observations:\n${formatPhaseText(obsData, OBSERVE_FIELDS)}`,
                  `Interpretation:\n${formatPhaseText(intData, INTERPRET_FIELDS)}`,
                  `Redemptive Thread:\n${formatPhaseText(redData, REDEMPTIVE_FIELDS)}`,
                  `Implications:\n${formatPhaseText(impData, [...IMPLICATIONS_THEOLOGICAL, ...IMPLICATIONS_PERSONAL])}`,
                ].join("\n\n");
                fetchInline(
                  "outline-review",
                  `Passage: ${sermon.passage || "unknown"}.\nMPT: ${sermon.mpt || "(none)"}.\nMPS: ${sermon.mps || "(none)"}.\n\n${exegesisContext}\n\nOutline:\n${pts || "(no points yet)"}`,
                  `Review this sermon outline against the exegetical work above. Evaluate: Do the points derive from the text's own argument? Do they ladder to the MPS? Is the progression clear and complete? Does tension resolve in the gospel? Suggest the minimum changes needed.`
                );
              }}
            >
              {inlineLoading === "outline-review" ? "Reviewing…" : "Review Outline"}
            </button>
          </div>

          <InlineAIResponse
            fieldName="Outline Review"
            response={inlineResponses["outline-review"]}
            loading={inlineLoading === "outline-review"}
            onDismiss={() => dismissInline("outline-review")}
          />

          {outline.length > 0 && (
            <div className="step-advance">
              <button className="btn-primary btn-sm" onClick={advanceStep}>
              {`Continue to ${STEP_LABELS[3]} →`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Functional Elements ── */}
      {activeStep === 4 && (
        <div className="study-step-active">
          <SummaryBlock summaryKey="s4" {...summaryProps} />

          {sermon.big_idea?.trim() && (
            <div style={{ padding: "10px 14px", marginBottom: "14px", background: "var(--ink)", borderRadius: "var(--radius)", display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gold)", flexShrink: 0 }}>Big Idea</span>
              <span style={{ fontSize: "14px", fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "var(--parchment-warm)" }}>{sermon.big_idea}</span>
            </div>
          )}

          {outline.map((pt, i) => (
            <FuncElem key={pt.id} pointText={pt.text} pointId={pt.id} displayIndex={i} funcData={funcData} onUpdate={updateFuncData} />
          ))}

          <div style={{ marginTop: "12px" }}>
            <button
              className="btn-ghost btn-sm"
              disabled={inlineLoading !== null}
              onClick={() => {
                const allEAI = outline.map((pt, i) => {
                  const d = funcData[pt.id] || {};
                  return `Point ${i + 1}: ${pt.text}\n  E: ${d.explanation || "(none)"}\n  A: ${d.application || "(none)"}\n  I: ${d.illustration || "(none)"}`;
                }).join("\n\n");
                fetchInline(
                  "eai-review",
                  `Passage: ${sermon.passage || "unknown"}.\n\nFunctional elements:\n${allEAI}`,
                  `Evaluate the Explanation/Application/Illustration balance across all outline points for ${sermon.passage || "this passage"}. Is explanation too thin or too heavy? Is application gospel-rooted or behavior-driven? Are the illustrations doing real work? Give a point-by-point assessment.`
                );
              }}
            >
              {inlineLoading === "eai-review" ? "Reviewing…" : "Review E/A/I Balance"}
            </button>
          </div>

          <InlineAIResponse
            fieldName="E/A/I Balance"
            response={inlineResponses["eai-review"]}
            loading={inlineLoading === "eai-review"}
            onDismiss={() => dismissInline("eai-review")}
          />

          <div className="step-advance">
            <button className="btn-primary btn-sm" onClick={() => onTabChange?.("outline")}>
              Continue to Outline Tab →
            </button>
          </div>
        </div>
      )}

      {passageAnchor && (
        <PassagePopup
          passage={sermon.passage}
          anchorEl={passageAnchor}
          onClose={() => setPassageAnchor(null)}
        />
      )}

    </div>
  );
}
