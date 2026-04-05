import { useState } from "react";
import { getOutline, serializeOutline, getFunctionalElements, serializeFunctionalElements } from "../utils";
import { STEPS, PHASES, PHASE_SEQUENCE, STEP_SEQUENCE } from "../constants/steps";
import { sendAIMessage } from "../utils/ai";
import OutlineBuilder from "./OutlineBuilder";

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

function SubPhase({ hint, value, onChange, onReview, loading }) {
  return (
    <div className="sub-phase-body">
      <p className="sub-phase-hint">{hint}</p>
      <textarea
        className="field-textarea large"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your notes…"
      />
      <div style={{ marginTop: "8px" }}>
        <button className="btn-ghost btn-sm" onClick={onReview} disabled={loading}>
          {loading ? "Reviewing…" : "Review →"}
        </button>
      </div>
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
              placeholder="What does the audience need to understand about this portion of the text?"
            />
          </div>
          <div>
            <div className="func-field-label">Application <span style={{ color: "var(--crimson-soft)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>(A)</span></div>
            <textarea
              className="field-textarea"
              style={{ minHeight: "80px" }}
              value={data.application}
              onChange={(e) => update("application", e.target.value)}
              placeholder="What response does this point press — and is it gospel-rooted?"
            />
          </div>
          <div>
            <div className="func-field-label">Illustration <span style={{ color: "var(--sage)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>(I)</span></div>
            <textarea
              className="field-textarea"
              style={{ minHeight: "60px" }}
              value={data.illustration}
              onChange={(e) => update("illustration", e.target.value)}
              placeholder="What clarifies or moves affections? (Leave blank if none needed)"
            />
          </div>
        </div>
      )}
    </div>
  );
}


export default function StudyTab({ sermon, onUpdate, onAI, aiLoading, onStepChange, onTabChange }) {
  const [activeStep, setActiveStep] = useState(1);
  const [activeSubPhase, setActiveSubPhase] = useState(1);
  const [summaries, setSummaries] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(null);
  const [funcData, setFuncData] = useState(() => getFunctionalElements(sermon));

  const outline = getOutline(sermon);

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
      // Leave Step 1, enter Step 2
      setActiveStep(2);
      setActiveSubPhase(1);
      onStepChange?.(STEPS.MPT_MPS);
      generateSummary(
        "s2",
        `Passage: ${sermon.passage || "unknown"}.\n\nPhase 1 – Observations:\n${sermon.observations || "(none)"}\n\nPhase 2 – Interpretation:\n${sermon.interpretation || "(none)"}\n\nPhase 3 – Redemptive Thread:\n${sermon.redemptive_thread || "(none)"}\n\nPhase 4 – Implications:\n${sermon.implications || "(none)"}`,
        `You are synthesizing a preacher's complete exegetical work on ${sermon.passage || "a passage"} before they forge the main point. Provide 4–6 concise bullet points covering: key textual observations, interpretive conclusions, the Christ-connection established, and theological and practical implications surfaced. This will directly inform their MPT and MPS. Be specific to the text, not generic.`
      );
      return;
    }

    setActiveSubPhase(next);
    onStepChange?.(PHASE_SEQUENCE[next - 1]);

    if (next === 2) {
      generateSummary(
        "p2",
        `Passage: ${sermon.passage || "unknown"}.\n\nObservations:\n${sermon.observations || "(none)"}`,
        `Summarize the key observations a preacher noted about ${sermon.passage || "a biblical passage"} in 3–5 concise bullet points. These will orient their interpretation work. Synthesis only — no quality commentary.`
      );
    } else if (next === 3) {
      generateSummary(
        "p3",
        `Passage: ${sermon.passage || "unknown"}.\n\nInterpretation notes:\n${sermon.interpretation || "(none)"}`,
        `Summarize the key interpretive conclusions reached about ${sermon.passage || "a biblical passage"} in 3–5 bullet points. These will orient work on the redemptive thread. Synthesis only.`
      );
    } else if (next === 4) {
      generateSummary(
        "p4",
        `Passage: ${sermon.passage || "unknown"}.\n\nRedemptive thread:\n${sermon.redemptive_thread || "(none)"}`,
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
        `MPT: ${sermon.mpt || "(none)"}\nMPS: ${sermon.mps || "(none)"}`,
        `Brief a preacher before they build their sermon outline. In 2–3 sentences summarize their MPT and MPS, capturing the theological core their outline must carry.`
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

  function sendReview(systemMsg, content) {
    onAI(`Passage: ${sermon.passage || "this passage"}\n\n${content}`, systemMsg);
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
            <SubPhase
              hint="Read and reread. Note main features: context, divisions, commands, statements, characters, big ideas."
              value={sermon.observations || ""}
              onChange={(v) => onUpdate({ observations: v })}
              loading={aiLoading}
              onReview={() => sendReview(
                `Review these observations as a careful biblical scholar would. Evaluate for completeness and accuracy. What key textual features have been noticed? What is missing? Be specific and constructive.`,
                `My observations on ${sermon.passage || "this passage"}:\n\n${sermon.observations || "(none yet)"}`
              )}
            />
          )}
          {activeSubPhase === 2 && (
            <SubPhase
              hint="Move from observation to meaning. Context, contrasts, key words, cross-references, commentaries."
              value={sermon.interpretation || ""}
              onChange={(v) => onUpdate({ interpretation: v })}
              loading={aiLoading}
              onReview={() => sendReview(
                `Review this interpretive work as a biblical scholar would. Evaluate for hermeneutical soundness. Does it move correctly from observation to meaning? Are the contextual and lexical insights valid? Be direct.`,
                `My interpretation of ${sermon.passage || "this passage"}:\n\n${sermon.interpretation || "(none yet)"}`
              )}
            />
          )}
          {activeSubPhase === 3 && (
            <SubPhase
              hint="How does this passage point to or depend on Christ? Where does it stand in redemptive history?"
              value={sermon.redemptive_thread || ""}
              onChange={(v) => onUpdate({ redemptive_thread: v })}
              loading={aiLoading}
              onReview={() => sendReview(
                `Evaluate this redemptive-historical work as a Reformed biblical theologian would. Is Christ's connection to this passage structurally necessary or decorative? Is the passage placed correctly in redemptive history? Offer specific, textually grounded feedback.`,
                `Redemptive thread for ${sermon.passage || "this passage"}:\n\n${sermon.redemptive_thread || "(none yet)"}`
              )}
            />
          )}
          {activeSubPhase === 4 && (
            <SubPhase
              hint="Theological: what does this teach about God, humanity, Christ? Personal: examples, commands, promises, convictions."
              value={sermon.implications || ""}
              onChange={(v) => onUpdate({ implications: v })}
              loading={aiLoading}
              onReview={() => sendReview(
                `Review these implications as a homiletics mentor would. Are the theological claims well-grounded? Are the applications gospel-rooted rather than behavior-driven? Are any obvious implications missing?`,
                `Implications from ${sermon.passage || "this passage"}:\n\n${sermon.implications || "(none yet)"}`
              )}
            />
          )}

          <div className="step-advance">
            <button className="btn-primary btn-sm" onClick={advanceSubPhase}>
              {activeSubPhase < 4
                ? `Continue to ${PHASE_LABELS[activeSubPhase]} →`
                : "Continue to MPT / MPS →"}
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
              <label className="field-label">Main Point of the Text (MPT)</label>
              <textarea
                className="field-textarea"
                style={{ minHeight: "120px" }}
                value={sermon.mpt || ""}
                onChange={(e) => onUpdate({ mpt: e.target.value })}
                placeholder="Past tense — what the text meant to its original audience"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Main Point of the Sermon (MPS)</label>
              <textarea
                className="field-textarea"
                style={{ minHeight: "120px" }}
                value={sermon.mps || ""}
                onChange={(e) => onUpdate({ mps: e.target.value })}
                placeholder="Present/future tense — the one idea your congregation takes home"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              className="btn-ghost btn-sm"
              disabled={aiLoading}
              onClick={() => onAI(
                `Passage: ${sermon.passage || "unknown"}. MPT: "${sermon.mpt || "(not written)"}"`,
                `Push back on this MPT as a careful biblical scholar would. Evaluate: Does this accurately reflect the author's original intent? Is it past tense and historically grounded? Does it avoid reading back NT theology into OT texts inappropriately? Is anything missing from the text's main thrust? Be direct and specific. Quote the text where relevant. This is not encouragement — it is a scholarly challenge.`
              )}
            >
              Challenge My MPT
            </button>
            <button
              className="btn-ghost btn-sm"
              disabled={aiLoading}
              onClick={() => onAI(
                `MPT: "${sermon.mpt || "(not written)"}". MPS: "${sermon.mps || "(not written)"}"`,
                `Evaluate whether this MPS grows organically from this MPT. MPT: "${sermon.mpt || "(not written)"}". MPS: "${sermon.mps || "(not written)"}". Does the MPS follow from the MPT or is it imposed? Is the chain clean, weak, or broken? Be specific.`
              )}
            >
              Check MPT→MPS Chain
            </button>
          </div>

          <div className="step-advance">
            <button className="btn-primary btn-sm" onClick={advanceStep}>
              Continue to Outline →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Outline Builder ── */}
      {activeStep === 3 && (
        <div className="study-step-active">
          <SummaryBlock summaryKey="s3" {...summaryProps} />

          <OutlineBuilder
            outline={outline}
            onUpdate={(newOutline) => onUpdate({ outline: serializeOutline(newOutline) })}
            onRemove={handleOutlineRemove}
          />

          <div style={{ marginTop: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="btn-ghost btn-sm"
              disabled={aiLoading}
              onClick={() => {
                const pts = outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n");
                onAI(
                  `Passage: ${sermon.passage || "unknown"}.\nMPT: ${sermon.mpt || "(none)"}.\nMPS: ${sermon.mps || "(none)"}.\n\nOutline:\n${pts || "(no points yet)"}`,
                  `Review this sermon outline. Evaluate: Do the points derive from the text? Do they ladder up to the MPS? Is the progression clear? Does tension resolve in the gospel? Suggest the minimum changes needed.`
                );
              }}
            >
              Review Outline
            </button>
          </div>

          {outline.length > 0 && (
            <div className="step-advance">
              <button className="btn-primary btn-sm" onClick={advanceStep}>
                Continue to Functional Elements →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Functional Elements ── */}
      {activeStep === 4 && (
        <div className="study-step-active">
          <SummaryBlock summaryKey="s4" {...summaryProps} />

          {outline.map((pt, i) => (
            <FuncElem key={pt.id} pointText={pt.text} pointId={pt.id} displayIndex={i} funcData={funcData} onUpdate={updateFuncData} />
          ))}

          <div style={{ marginTop: "12px" }}>
            <button
              className="btn-ghost btn-sm"
              disabled={aiLoading}
              onClick={() => {
                const allEAI = outline.map((pt, i) => {
                  const d = funcData[pt.id] || {};
                  return `Point ${i + 1}: ${pt.text}\n  E: ${d.explanation || "(none)"}\n  A: ${d.application || "(none)"}\n  I: ${d.illustration || "(none)"}`;
                }).join("\n\n");
                onAI(
                  `Passage: ${sermon.passage || "unknown"}.\n\nFunctional elements:\n${allEAI}`,
                  `Evaluate the Explanation/Application/Illustration balance across all outline points for ${sermon.passage || "this passage"}. Is explanation too thin or too heavy? Is application gospel-rooted or behavior-driven? Are the illustrations doing real work? Give a point-by-point assessment.`
                );
              }}
            >
              Review E/A/I Balance
            </button>
          </div>

          <div className="step-advance">
            <button className="btn-primary btn-sm" onClick={() => onTabChange?.("outline")}>
              Continue to Outline Tab →
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
