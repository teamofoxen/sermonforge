import { useState } from "react";
import { getOutline, getFunctionalElements, serializeOutline, serializeFunctionalElements, autoResize, parseManuscript } from "../utils";
import { exportManuscript } from "../db/database";
// NotebookPanel removed 2026-05-11 — the writing-room (ManuscriptTrail)
// wires the canonical bottom-slide NotebookDrawer for the manuscript
// notebook. Keeping an inline panel here too created two surfaces over
// the same `notebook_manuscript` column.
import ManuscriptReview from "./ManuscriptReview";
import FeedbackFlag from "./FeedbackFlag";
import SecondaryButton from "./primitives/SecondaryButton";
import { STAGE } from "../core/contracts";

function countWords(sermon) {
  const ms = parseManuscript(sermon.manuscript);
  const outline = getOutline(sermon);
  const fes = getFunctionalElements(sermon);
  const texts = [
    sermon.title, sermon.mpt, sermon.mps,
    ms.introduction?.opener, ms.introduction?.scripture_reading, ms.introduction?.expectation,
    ...Object.values(ms.transitions || {}),
    ms.conclusion?.response,
    ...outline.flatMap(pt => {
      const fe = fes[pt.id] || {};
      return [pt.text, fe.scripture, fe.explanation, fe.application, fe.illustration];
    }),
  ];
  return texts.filter(Boolean).join(" ").trim().split(/\s+/).filter(Boolean).length;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionField({ label, value, onChange, hint, rows = 2 }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div className="field-label" style={{ marginBottom: "4px", display: "flex", alignItems: "baseline", gap: "8px" }}>
        {label}
        {hint && <span style={{ fontSize: "11px", color: "var(--ink-ghost)", fontWeight: "normal" }}>{hint}</span>}
      </div>
      <textarea
        className="field-textarea"
        rows={rows}
        value={value}
        onChange={onChange}
        onInput={e => autoResize(e.target)}
        ref={el => autoResize(el)}
        style={{ resize: "none" }}
      />
    </div>
  );
}

function TransitionField({ label, value, onChange }) {
  return (
    <div style={{ padding: "6px 4px", margin: "4px 0" }}>
      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-ghost)", marginBottom: "5px" }}>{label}</div>
      <textarea
        className="field-textarea"
        rows={2}
        value={value}
        onChange={onChange}
        onInput={e => autoResize(e.target)}
        ref={el => autoResize(el)}
        placeholder="Bridge from the previous section…"
        style={{ resize: "none", background: "var(--parchment-warm)", fontSize: "14px" }}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ManuscriptTab({ sermon, onUpdate }) {
  const ms = parseManuscript(sermon.manuscript);
  const outline = getOutline(sermon);
  const fes = getFunctionalElements(sermon);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const result = await exportManuscript({
        title:    sermon.title    || "",
        passage:  sermon.passage   || "",
        date:     sermon.date      || "",
        mpt:      sermon.mpt       || "",
        mps:      sermon.mps       || "",
        introduction: ms.introduction || {},
        transitions:  ms.transitions  || {},
        conclusion:   ms.conclusion   || {},
        outline,
        functionalElements: fes,
      });
      if (!result?.success) setExportError(result?.error || "Export failed.");
    } catch (e) {
      setExportError(e.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  function updateMs(section, field, value) {
    const current = parseManuscript(sermon.manuscript);
    let updated;
    if (section === "transitions") {
      updated = { ...current, transitions: { ...current.transitions, [field]: value } };
    } else {
      updated = { ...current, [section]: { ...current[section], [field]: value } };
    }
    onUpdate({ manuscript: JSON.stringify(updated) });
  }

  function updateFE(pointId, field, value) {
    const updated = { ...fes, [pointId]: { ...(fes[pointId] || {}), [field]: value } };
    onUpdate({ functional_elements: serializeFunctionalElements(updated) });
  }

  function updatePointText(pointId, text) {
    const updated = outline.map(p => p.id === pointId ? { ...p, text } : p);
    onUpdate({ outline: serializeOutline(updated) });
  }

  const [openReview, setOpenReview] = useState(null);

  const words = countWords(sermon);
  const minutes = Math.round(words / 130);
  const hasContent = words > 0;

  const sectionCard = {
    background: "var(--white)",
    border: "1px solid var(--parchment-deep)",
    borderRadius: "var(--radius-lg)",
    padding: "20px 24px",
    marginBottom: "4px",
  };

  const sectionHeading = {
    fontFamily: "var(--font-serif)",
    fontSize: "15px",
    fontWeight: "700",
    color: "var(--ink)",
    marginBottom: "20px",
    paddingBottom: "10px",
    borderBottom: "1px solid var(--parchment-deep)",
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: "0", right: "0" }}>
        <FeedbackFlag surface="manuscript-tab" sermonId={sermon?.id ?? null} step={STAGE.Manuscript} />
      </div>
      <div style={{ marginBottom: "20px", fontSize: "13px", color: "var(--ink-ghost)", fontStyle: "italic", paddingRight: "32px" }}>
        Expand the outline into full prose.
      </div>
      {/* Toolbar */}
      <div className="manuscript-toolbar">
        <div className="word-count">{words.toLocaleString()} words · ~{minutes} min</div>
        <SecondaryButton
          size="sm"
          className="has-tooltip"
          data-tooltip="Export the manuscript as a Word document. Saves to Documents/SermonForge/exports/Manuscripts/ and opens it."
          onClick={handleExport}
          disabled={exporting || !hasContent}
        >
          {exporting ? "Saving…" : "Export to Word"}
        </SecondaryButton>
      </div>
      {exportError && (
        <div style={{ fontSize: "12px", color: "#a04d4d", marginBottom: "12px", padding: "0 4px" }}>
          Export failed: {exportError}
        </div>
      )}

      {/* Introduction */}
      <div id="ms-section-intro" style={sectionCard}>
        <div style={sectionHeading}>Introduction</div>
        <SectionField
          label="Opener"
          value={ms.introduction?.opener || ""}
          onChange={e => updateMs("introduction", "opener", e.target.value)}
        />
        <SectionField
          label="Main Point of the Text"
          value={sermon.mpt || ""}
          onChange={e => onUpdate({ mpt: e.target.value })}
          rows={1}
        />
        <SectionField
          label="Scripture Reading"
          value={ms.introduction?.scripture_reading || ""}
          onChange={e => updateMs("introduction", "scripture_reading", e.target.value)}
          hint={sermon.passage ? sermon.passage : ""}
        />
        <SectionField
          label="Main Point of the Sermon"
          value={sermon.mps || ""}
          onChange={e => onUpdate({ mps: e.target.value })}
          rows={1}
        />
        <SectionField
          label="Expectation"
          value={ms.introduction?.expectation || ""}
          onChange={e => updateMs("introduction", "expectation", e.target.value)}
        />
        <SectionField
          label="Title"
          value={sermon.title || ""}
          onChange={e => onUpdate({ title: e.target.value })}
          rows={1}
        />
      </div>

      {/* Points with transitions */}
      {outline.map((pt, i) => (
        <div key={pt.id}>
          <TransitionField
            label={`Transition → Point ${i + 1}`}
            value={(ms.transitions || {})[pt.id] || ""}
            onChange={e => updateMs("transitions", pt.id, e.target.value)}
          />
          <div id={`ms-section-${pt.id}`} style={sectionCard}>
            <div style={sectionHeading}>Point {i + 1}</div>
            <SectionField
              label="Point"
              value={pt.text}
              onChange={e => updatePointText(pt.id, e.target.value)}
              rows={1}
            />
            <SectionField
              label="Scripture"
              value={fes[pt.id]?.scripture || ""}
              onChange={e => updateFE(pt.id, "scripture", e.target.value)}
              rows={1}
            />
            <SectionField
              label="Explanation"
              value={fes[pt.id]?.explanation || ""}
              onChange={e => updateFE(pt.id, "explanation", e.target.value)}
            />
            <SectionField
              label="Application"
              value={fes[pt.id]?.application || ""}
              onChange={e => updateFE(pt.id, "application", e.target.value)}
            />
            <SectionField
              label="Illustration"
              value={fes[pt.id]?.illustration || ""}
              onChange={e => updateFE(pt.id, "illustration", e.target.value)}
            />
          </div>
        </div>
      ))}

      {/* Transition to Conclusion */}
      <TransitionField
        label="Transition → Conclusion"
        value={(ms.transitions || {}).conclusion || ""}
        onChange={e => updateMs("transitions", "conclusion", e.target.value)}
      />

      {/* Conclusion */}
      <div id="ms-section-conclusion" style={sectionCard}>
        <div style={sectionHeading}>Conclusion</div>
        <SectionField
          label="Response"
          value={ms.conclusion?.response || ""}
          onChange={e => updateMs("conclusion", "response", e.target.value)}
        />
      </div>

      <ManuscriptReview
        sermon={sermon}
        openReview={openReview}
        onToggle={setOpenReview}
      />

    </div>
  );
}
