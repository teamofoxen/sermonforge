import { useState } from "react";
import { getOutline, serializeOutline, getFunctionalElements, serializeFunctionalElements } from "../utils";
import OutlineBuilder from "./OutlineBuilder";
import NotebookPanel from "./NotebookPanel";
import Collapsible from "./primitives/Collapsible";
import PrimaryButton from "./primitives/PrimaryButton";
import BackButton from "./primitives/BackButton";
import FeedbackFlag from "./FeedbackFlag";
import { STAGE } from "../core/contracts";

const OUTLINE_QUESTIONS = [
  "What single move is your MPS asking listeners to make?",
  "What obstacles stand between where listeners are now and that move?",
  "What does the text give to address each obstacle? Name them — these are your outline points.",
  "Does the sequence move the listener toward the MPS, or are the points parallel observations?",
];

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
  const [showOutlineQuestions, setShowOutlineQuestions] = useState(false);

  function handleOutlineChange(newOutline) {
    onUpdate({ outline: serializeOutline(newOutline) });
  }

  function handleOutlineRemove(pointId) {
    const cleaned = { ...getFunctionalElements(sermon) };
    delete cleaned[pointId];
    onUpdate({ functional_elements: serializeFunctionalElements(cleaned) });
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: "0", right: "0" }}>
        <FeedbackFlag surface="outline-tab" sermonId={sermon?.id ?? null} step={STAGE.Blueprint} />
      </div>
      <div style={{ marginBottom: "20px", fontSize: "13px", color: "var(--ink-ghost)", fontStyle: "italic", paddingRight: "32px" }}>
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
                        <div style={{ fontSize: "14px", color: "var(--ink-mid)", lineHeight: "1.5", display: "flex", alignItems: "baseline", gap: "8px" }}>
                          <span style={{ color: "var(--ink-ghost)", marginRight: "6px" }}>{i + 1}.</span>
                          <span style={{ flex: 1 }}>{p.text}</span>
                          <span style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                            {[["E", fe[p.id]?.explanation], ["A", fe[p.id]?.application], ["I", fe[p.id]?.illustration]].map(([label, val]) => (
                              <span key={label} style={{ fontSize: "10px", fontStyle: "normal", fontWeight: "600", letterSpacing: "0.04em", color: val?.trim() ? "var(--gold)" : "var(--ink-ghost)", opacity: val?.trim() ? 1 : 0.4 }}>{label}</span>
                            ))}
                          </span>
                        </div>
                        {scripture && (
                          <div style={{ paddingLeft: "20px", marginTop: "4px", fontSize: "13px", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--ink-soft)", lineHeight: "1.6" }}>
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

      <div style={{ marginBottom: "16px" }}>
        <Collapsible
          label="Outline Questions"
          open={showOutlineQuestions}
          onToggle={() => setShowOutlineQuestions(o => !o)}
          bodyStyle={{ padding: "0 16px 16px" }}
        >
          <ol style={{ margin: 0, paddingLeft: "20px" }}>
            {OUTLINE_QUESTIONS.map((q, i) => (
              <li key={i} style={{ fontSize: "14px", color: "var(--ink-mid)", lineHeight: "1.65", marginBottom: i < OUTLINE_QUESTIONS.length - 1 ? "10px" : 0 }}>
                {q}
              </li>
            ))}
          </ol>
        </Collapsible>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Sermon Body Structure</h3>
        </div>
        {outline.length === 0 && (
          <div style={{ marginBottom: "12px" }}>
            <p style={{ color: "var(--ink-ghost)", fontStyle: "italic", fontSize: "14px", marginBottom: "8px" }}>
              No outline points yet. Build them in Study → Step 3, or add points directly below.
            </p>
            <BackButton size="sm" onClick={() => onTabChange?.(STAGE.Study)}>
              Return to Study
            </BackButton>
          </div>
        )}
        <OutlineBuilder outline={outline} onUpdate={handleOutlineChange} onRemove={handleOutlineRemove} />
      </div>

      <NotebookPanel
        value={sermon.notebook_blueprint}
        onChange={(value) => onUpdate({ notebook_blueprint: value })}
        label="Blueprint Notebook"
        placeholder="Free-form notes for your outline thinking — alternate orderings, points to test, things to revisit."
      />

      <div className="step-advance">
        <PrimaryButton
          size="sm"
          onClick={() => onTabChange?.(STAGE.Manuscript)}
          disabled={outline.length === 0}
          title={outline.length === 0 ? "Add at least one outline point before moving to Manuscript" : undefined}
        >
          Continue to Manuscript →
        </PrimaryButton>
      </div>
    </div>
  );
}
