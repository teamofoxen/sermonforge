import { useState } from "react";
import { getOutline, serializeOutline, getFunctionalElements, serializeFunctionalElements, createOutlinePoint } from "../utils";
import { sendAIMessage } from "../utils/ai";
import {
  parseStructuredField, flattenToText,
  OBSERVE_FIELDS, INTERPRET_FIELDS, REDEMPTIVE_FIELDS,
  IMPLICATIONS_THEOLOGICAL, IMPLICATIONS_PERSONAL,
} from "../utils/studyFields";
import OutlineBuilder from "./OutlineBuilder";
import InlineAIResponse from "./InlineAIResponse";

export default function OutlineTab({ sermon, onUpdate, onTabChange }) {
  const outline = getOutline(sermon);
  const [reviewResponse, setReviewResponse] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  function handleOutlineChange(newOutline) {
    onUpdate({ outline: serializeOutline(newOutline) });
  }

  function handleOutlineRemove(pointId) {
    const cleaned = { ...getFunctionalElements(sermon) };
    delete cleaned[pointId];
    onUpdate({ functional_elements: serializeFunctionalElements(cleaned) });
  }

  async function handleSuggestOutline() {
    if (suggestLoading || reviewLoading) return;
    setSuggestLoading(true);
    try {
      const obsData  = parseStructuredField(sermon.observations);
      const intData  = parseStructuredField(sermon.interpretation);
      const redData  = parseStructuredField(sermon.redemptive_thread);
      const impData  = parseStructuredField(sermon.implications);
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
        [{ role: "user", content: `${exegesisContext}\n\nPropose a sermon outline. Return only a numbered list of 3–4 points. Each point must be a single declarative sentence that derives from the text's own logic and ladders up to the MPS.` }],
        "You are a homiletics consultant helping a pastor structure a sermon. The outline must emerge from the text's argument — not be imposed on it. Each point is a standalone claim the congregation can grasp and remember."
      );
      if (!resp?.trim()) return;
      const lines = resp.trim().split("\n").filter(l => /^\d+[\.\)]/.test(l.trim()));
      if (lines.length === 0) return;
      const newPoints = lines.map(l => createOutlinePoint(l.replace(/^\d+[\.\)]\s*/, "").trim()));
      onUpdate({ outline: serializeOutline([...outline, ...newPoints]) });
    } catch (e) {
      console.error("[OutlineTab suggestOutline]", e);
    } finally {
      setSuggestLoading(false);
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
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Sermon Body Structure</h3>
        </div>
        {outline.length === 0 && (
          <p style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontSize: "14px", marginBottom: "12px" }}>
            No outline points yet. Add points here or in the Study tab.
          </p>
        )}
        <OutlineBuilder outline={outline} onUpdate={handleOutlineChange} onRemove={handleOutlineRemove} />
        <div style={{ marginTop: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className="btn-ghost btn-sm"
            disabled={suggestLoading || reviewLoading}
            onClick={handleSuggestOutline}
          >
            {suggestLoading ? "Generating…" : "Suggest Outline"}
          </button>
          {outline.length > 0 && (
            <button
              className="btn-ghost btn-sm"
              disabled={reviewLoading || suggestLoading}
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

      {outline.length > 0 && (
        <div className="step-advance">
          <button className="btn-primary btn-sm" onClick={() => onTabChange?.("manuscript")}>
            Continue to Manuscript →
          </button>
        </div>
      )}
    </div>
  );
}
