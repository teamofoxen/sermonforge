import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { getOutline, serializeOutline, getFunctionalElements, serializeFunctionalElements } from "../utils";
import { sendAIMessage } from "../utils/ai";
import {
  parseStructuredField, flattenToText,
  OBSERVE_FIELDS, INTERPRET_FIELDS, REDEMPTIVE_FIELDS,
  IMPLICATIONS_THEOLOGICAL, IMPLICATIONS_PERSONAL,
} from "../utils/studyFields";
import OutlineBuilder from "./OutlineBuilder";
import InlineAIResponse from "./InlineAIResponse";
import { OUTLINE_SYSTEM, outlineHasNumberedList, extractOutlineWithExplanations } from "../utils/outlineChat";

function mpsExtractStem(mps) {
  if (!mps) return null;
  const trimmed = mps.trim();
  if (!trimmed.endsWith(":")) return null;
  const colonIdx = trimmed.lastIndexOf(":");
  const candidate = trimmed.slice(0, colonIdx);
  const lastDot = candidate.lastIndexOf(". ");
  const lastDash = candidate.lastIndexOf("— ");
  const cut = Math.max(lastDot, lastDash);
  return cut >= 0 ? candidate.slice(cut + 2).trim() : candidate.trim();
}


export default function OutlineTab({ sermon, onUpdate, onTabChange }) {
  const outline = getOutline(sermon);
  const fe = getFunctionalElements(sermon);
  const mpsStem = mpsExtractStem(sermon.mps);
  const [reviewResponse, setReviewResponse] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [outlineChat, setOutlineChat] = useState([]);
  const [outlineChatInput, setOutlineChatInput] = useState("");
  const [outlineChatLoading, setOutlineChatLoading] = useState(false);

  function handleOutlineChange(newOutline) {
    onUpdate({ outline: serializeOutline(newOutline) });
  }

  function handleOutlineRemove(pointId) {
    const cleaned = { ...getFunctionalElements(sermon) };
    delete cleaned[pointId];
    onUpdate({ functional_elements: serializeFunctionalElements(cleaned) });
  }

  async function handleSuggestOutline() {
    if (suggestLoading || reviewLoading || outlineChatLoading) return;
    setSuggestLoading(true);
    setOutlineChat([]);
    try {
      const obsData = parseStructuredField(sermon.observations);
      const intData = parseStructuredField(sermon.interpretation);
      const redData = parseStructuredField(sermon.redemptive_thread);
      const impData = parseStructuredField(sermon.implications);
      const exegesisContext = [
        `Passage: ${sermon.passage || "unknown"}`,
        `MPT: ${sermon.mpt || "(none)"}`,
        `MPS: ${sermon.mps || "(none)"}`,
        `\nObservations:\n${flattenToText(obsData, OBSERVE_FIELDS) || "(none)"}`,
        `\nInterpretation:\n${flattenToText(intData, INTERPRET_FIELDS) || "(none)"}`,
        `\nRedemptive Thread:\n${flattenToText(redData, REDEMPTIVE_FIELDS) || "(none)"}`,
        `\nImplications:\n${flattenToText(impData, [...IMPLICATIONS_THEOLOGICAL, ...IMPLICATIONS_PERSONAL]) || "(none)"}`,
      ].join("\n");
      const resp = await sendAIMessage(
        [{ role: "user", content: `${exegesisContext}\n\nPropose a sermon outline.` }],
        OUTLINE_SYSTEM
      );
      if (resp?.trim()) setOutlineChat([{ role: "assistant", content: resp.trim() }]);
    } catch (e) {
      console.error("[OutlineTab suggestOutline]", e);
    } finally {
      setSuggestLoading(false);
    }
  }

  async function sendOutlineChat() {
    const input = outlineChatInput.trim();
    if (!input || outlineChatLoading) return;
    const contextPrefix = [
      `Passage: ${sermon.passage || "unknown"}`,
      `MPT: ${sermon.mpt || "(none)"}`,
      `MPS: ${sermon.mps || "(none)"}`,
      outline.length > 0
        ? `Current outline:\n${outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n")}`
        : null,
    ].filter(Boolean).join("\n") + "\n\n---\n\n";
    const newUserMsg = { role: "user", content: input };
    const history = [...outlineChat, newUserMsg];
    setOutlineChat(history);
    setOutlineChatInput("");
    setOutlineChatLoading(true);
    try {
      const messages = history.map((m, i) =>
        i === history.length - 1 ? { ...m, content: contextPrefix + m.content } : m
      );
      const resp = await sendAIMessage(messages, OUTLINE_SYSTEM);
      if (resp?.trim()) setOutlineChat(prev => [...prev, { role: "assistant", content: resp.trim() }]);
    } catch (e) {
      setOutlineChat(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setOutlineChatLoading(false);
    }
  }

  async function handleReviewOutline() {
    if (reviewLoading || outline.length === 0) return;
    setReviewLoading(true);
    setReviewResponse(null);
    try {
      const pts = outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n");
      const resp = await sendAIMessage(
        [{ role: "user", content: `Passage: ${sermon.passage || "unknown"}.\nMPT: ${sermon.mpt || "(none)"}.\nMPS: ${sermon.mps || "(none)"}.\n\nOutline:\n${pts}` }],
        `Review this sermon outline. Evaluate: Do the points derive from the text? Do they ladder up to the MPS? Is the progression clear and complete? Does tension resolve in the gospel? Suggest the minimum changes needed.`
      );
      setReviewResponse(resp);
    } catch (e) {
      setReviewResponse(`Error: ${e.message}`);
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "20px", fontSize: "13px", color: "var(--ink-ghost)", fontStyle: "italic" }}>
        The Blueprint holds your sermon's load-bearing structure — MPS and outline together. Confirm the shape is right, then move to Manuscript.
      </div>

      {/* Reference — passage, MPT, MPS */}
      {(sermon.passage || sermon.mpt || sermon.mps) && (
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
              {mpsStem && outline.length > 0 && (
                <div style={{ marginTop: "10px", paddingLeft: "16px", borderLeft: "2px solid var(--border)" }}>
                  {outline.map((p, i) => {
                    const scripture = fe[p.id]?.scripture;
                    return (
                      <div key={p.id} style={{ marginBottom: "10px" }}>
                        <div style={{ fontSize: "14px", color: "var(--ink-mid)", lineHeight: "1.5" }}>
                          <span style={{ color: "var(--ink-ghost)", marginRight: "6px" }}>{i + 1}.</span>
                          {p.text}
                        </div>
                        {scripture && (
                          <div style={{ paddingLeft: "20px", marginTop: "4px", fontSize: "13px", fontFamily: "'Crimson Pro', serif", fontStyle: "italic", color: "var(--ink-soft)", lineHeight: "1.6" }}>
                            {scripture}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Sermon Body Structure</h3>
        </div>
        {outline.length === 0 && (
          <div style={{ marginBottom: "12px" }}>
            <p style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontSize: "14px", marginBottom: "8px" }}>
              No outline points yet. Build them in Study → Step 3, or add points directly below.
            </p>
            <button className="btn-ghost btn-sm" onClick={() => onTabChange?.("study")}>
              ← Return to Study
            </button>
          </div>
        )}
        <OutlineBuilder outline={outline} onUpdate={handleOutlineChange} onRemove={handleOutlineRemove} />
        <div style={{ marginTop: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className="btn-ghost btn-sm"
            disabled={suggestLoading || reviewLoading || outlineChatLoading}
            onClick={handleSuggestOutline}
          >
            {suggestLoading ? "Generating…" : "Suggest Outline"}
          </button>
          {outline.length > 0 && (
            <button
              className="btn-ghost btn-sm"
              disabled={reviewLoading || suggestLoading || outlineChatLoading}
              onClick={handleReviewOutline}
            >
              {reviewLoading ? "Reviewing…" : "Review Outline"}
            </button>
          )}
        </div>
        <InlineAIResponse
          fieldName="Outline Review"
          response={reviewResponse}
          loading={reviewLoading}
          onDismiss={() => setReviewResponse(null)}
        />
      </div>

      {/* Outline chat */}
      {(outlineChat.length > 0 || suggestLoading) && (
        <div className="card" style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-ghost)" }}>Refine Outline with AI</span>
            {outlineChat.length > 0 && (
              <button className="inline-ai-dismiss" onClick={() => setOutlineChat([])}>Clear</button>
            )}
          </div>
          {outlineChat.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} style={{ textAlign: "right", marginBottom: "6px" }}>
                  <span style={{ background: "var(--surface-2)", borderRadius: "8px", padding: "6px 10px", fontSize: "13px", display: "inline-block", maxWidth: "85%", textAlign: "left" }}>
                    {msg.content}
                  </span>
                </div>
              );
            }
            const extracted = outlineHasNumberedList(msg.content) ? extractOutlineWithExplanations(msg.content) : null;
            return (
              <div key={i} className="inline-ai-response" style={{ marginBottom: "8px" }}>
                <div className="ai-markdown" style={{ marginBottom: extracted ? "8px" : "0" }}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {extracted && (
                  <button
                    className="btn-ghost btn-sm"
                    style={{ fontSize: "12px" }}
                    onClick={() => {
                      const existing = getFunctionalElements(sermon);
                      onUpdate({
                        outline: serializeOutline(extracted.points),
                        functional_elements: serializeFunctionalElements({ ...existing, ...extracted.explanations }),
                      });
                    }}
                  >
                    → Apply to Outline
                  </button>
                )}
              </div>
            );
          })}
          {(outlineChatLoading || suggestLoading) && (
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
            <button
              className="btn-ghost btn-sm"
              style={{ alignSelf: "flex-end", fontSize: "12px", whiteSpace: "nowrap" }}
              onClick={sendOutlineChat}
              disabled={outlineChatLoading || !outlineChatInput.trim()}
            >
              Ask →
            </button>
          </div>
        </div>
      )}

      <div className="step-advance">
        <button
          className="btn-primary btn-sm"
          onClick={() => onTabChange?.("manuscript")}
          disabled={outline.length === 0}
          title={outline.length === 0 ? "Add at least one outline point before moving to Manuscript" : undefined}
        >
          Continue to Manuscript →
        </button>
      </div>
    </div>
  );
}
