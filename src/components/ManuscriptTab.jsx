import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { getOutline, getFunctionalElements, serializeOutline, serializeFunctionalElements, autoResize, parseManuscript, assembleManuscriptText } from "../utils";
import { buildContext } from "../utils/contextBuilder";
import { exportManuscript } from "../db/database";
import PrimaryButton from "./primitives/PrimaryButton";
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

// ── System prompts ─────────────────────────────────────────────────────────────

const FLOW_COACH_SYSTEM = `You are a sermon flow coach working through a fixed worklist. One step at a time.

RULES:
- Work only through the worklist provided in the prompt. Do not reorder, skip, or add steps.
- One step per response. State which step you are on (e.g. "Step 2 of 5").
- Be brief. 2–4 bullet points. No paragraphs.
- Describe what the movement needs to accomplish for the listener — pacing, emotional register, logical flow, momentum. Be specific to this sermon.
- Do NOT write any content. No sentences, no transitions, no wording suggestions. Direction only.
- End every response with: "Ready for the next step?"
- When the pastor signals readiness (any affirmative), move to the next step on the worklist.
- If the pastor asks to go back to an earlier step, return to it and re-coach it. Then continue forward from there.
- When all steps are done, say so briefly.
- If the pastor asks a question mid-session, answer it briefly and return to the current step. Do not abandon the worklist.
- Do not add steps, reframe the sequence, or summarize past steps unprompted.`;

const EAR_CHECK_SYSTEM = `You are a sermon delivery analyst working through a self-generated worklist. One step at a time.

FIRST RESPONSE — SCAN AND ANNOUNCE:
Read the manuscript. Identify all issues across two categories:
- Structural orphans: passages disconnected from structural logic (drifted sections, unanchored explanatory blocks)
- Speakability flags: passages that will lose the room when heard aloud (sentence nesting, abstract noun density, verbal signposting) — cap at 5

Produce a brief numbered worklist of every issue you found (one line each, location + issue type). Then immediately begin Step 1.

RULES FOR ALL SUBSEQUENT STEPS:
- One step per response. State which step you are on (e.g. "Step 1 of 6").
- Be brief. 2–4 bullet points. No paragraphs.
- For each issue: locate it, name what makes it a problem, give one direction for fixing it. No rewrites, no replacement language.
- Theological precision is not a problem. Unintelligibility is.
- End every response with: "Ready for the next step?"
- When the pastor signals readiness, move to the next step.
- If the pastor asks to go back to an earlier step, return to it. Then continue forward.
- If the pastor asks a question mid-session, answer briefly and return to the current step.
- When all steps are done, say so briefly.
- Do not add steps or summarize past steps unprompted.`;

const TUNE_UP_SYSTEM = `You are a sermon editor. Evaluate this sermon manuscript using the Sermon Tune-Up Engine. Constraints: preserve the author's voice; prefer minimal high-leverage edits; keep length change within ±10%; do not add new illustrations unless asked; do not add new theology unless gospel repair is required.

PHASE 1 — SERMON SNAPSHOT (describe, do not fix):
- State Title, Passage, MPT (explicit/inferred/missing), MPS (explicit/inferred/missing)
- Give actual outline (3-6 bullets) of how the sermon moves
- Tag major sections as E (Explanation), A (Application), I (Illustration)
- Map redemptive logic: where Christ appears and his function (necessary/assistive/add-on)
- Describe what the conclusion is doing

PHASE 2 — ALIGNMENT MAP:
For each category, mark ALIGNED/MISALIGNED/MISSING/OVERWEIGHTED with severity Minor/Moderate/Major and brief evidence:
1. Text→Claim Chain: text governance (Governed/Launched/Drifted), MPT accuracy, MPS integrity, chain integrity
2. Structural Alignment: does each point derive from text and serve MPS? Progression: Progressive/Flat/Fragmented
3. Functional Balance: Explanation (Sufficient/Thin/Assumed), Application (gospel-rooted or behavior-driven), Illustration (clarifies or distracts)
4. Redemptive Necessity: Is Christ structurally necessary or decorative? Could sermon work without Jesus?
5. Conclusion Coherence: Summation (Explicit/Implied/Missing), Response grounded in Christ's work?
Name 1-2 root causes. List Top 5 Fixes.

PHASE 3 — PATCH PLAN:
Bullet list of exact edits (what/where/why). Mark inline as [ADD: ...], [CUT: ...], [REPLACE: old → new], [MOVE: ... to ...].`;

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

function formatRelativeTime(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function LastTuneUpPanel({ saved }) {
  const [open, setOpen] = useState(false);
  let parsed;
  try { parsed = JSON.parse(saved); } catch { parsed = null; }
  if (!parsed?.content) return null;

  const ts = parsed.ts ? new Date(parsed.ts) : null;
  const ago = ts ? formatRelativeTime(ts) : "";

  return (
    <div style={{ background: "var(--parchment-warm)", border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius)", marginBottom: "12px" }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-ghost)" }}>
            Last Tune-Up
          </span>
          {ago && <span style={{ fontSize: "11px", color: "var(--ink-ghost)" }}>{ago}</span>}
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", color: "var(--ink-ghost)" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div style={{ padding: "12px 14px 14px", borderTop: "1px solid var(--parchment-deep)", fontSize: "13px", lineHeight: "1.6", color: "var(--ink-soft)" }}>
          <div className="ai-markdown">
            <ReactMarkdown>{parsed.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ManuscriptTab({ sermon, onUpdate, onAI, aiLoading, onOpenDrawer, onTabChange }) {
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

  function runFlowCoach() {
    const steps = ["Introduction"];
    for (let i = 0; i < outline.length - 1; i++) {
      steps.push(`Gap: "${outline[i].text}" → "${outline[i + 1].text}"`);
    }
    steps.push("Conclusion");
    const worklist = steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const manuscript = assembleManuscriptText(sermon);
    const context = buildContext({ sermon, step: "manuscript" });
    const body = `Title: ${sermon.title || "Untitled"}\nPassage: ${sermon.passage || "unknown"}\nMPT: ${sermon.mpt || "(not set)"}\nMPS: ${sermon.mps || "(not set)"}\n\nManuscript:\n\n${manuscript}\n\nWorklist (${steps.length} steps):\n${worklist}\n\nBegin with Step 1.`;
    const prompt = context ? `CONTEXT:\n${context}\n\n${body}` : body;
    onOpenDrawer?.();
    onAI(prompt, FLOW_COACH_SYSTEM);
  }

  function runEarCheck() {
    const manuscript = assembleManuscriptText(sermon);
    const context = buildContext({ sermon, step: "manuscript" });
    const body = `Title: ${sermon.title || "Untitled"}\nPassage: ${sermon.passage || "unknown"}\nMPT: ${sermon.mpt || "(not set)"}\nMPS: ${sermon.mps || "(not set)"}\n\nManuscript:\n\n${manuscript}`;
    const prompt = context ? `CONTEXT:\n${context}\n\n${body}` : body;
    onOpenDrawer?.();
    onAI(prompt, EAR_CHECK_SYSTEM);
  }

  function runTuneUp() {
    const manuscript = assembleManuscriptText(sermon);
    const context = buildContext({ sermon, step: "manuscript" });
    const body = `Title: ${sermon.title || "Untitled"}\nPassage: ${sermon.passage || "unknown"}\nMPT: ${sermon.mpt || "(not set)"}\nMPS: ${sermon.mps || "(not set)"}\n\nManuscript:\n\n${manuscript}`;
    const prompt = context ? `CONTEXT:\n${context}\n\n${body}` : body;
    onOpenDrawer?.();
    onAI(prompt, TUNE_UP_SYSTEM, { persistColumn: "last_tune_up" });
  }

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
    fontFamily: "'Playfair Display', serif",
    fontSize: "15px",
    fontWeight: "700",
    color: "var(--ink)",
    marginBottom: "20px",
    paddingBottom: "10px",
    borderBottom: "1px solid var(--parchment-deep)",
  };

  return (
    <div>
      <div style={{ marginBottom: "20px", fontSize: "13px", color: "var(--ink-ghost)", fontStyle: "italic" }}>
        Expand the outline into full prose. Use the AI tools above to check flow and speakability, then run the Final Tune-Up before moving to Delivery.
      </div>
      {/* Toolbar */}
      <div className="manuscript-toolbar">
        <div className="word-count">{words.toLocaleString()} words · ~{minutes} min</div>
        <SecondaryButton
          size="sm"
          data-tour-id="flow-coach-button"
          className="has-tooltip"
          data-tooltip="A step-by-step coaching session that walks through what each movement needs to accomplish — intro, transitions, conclusion. Coaches direction only, one step at a time."
          onClick={runFlowCoach}
          disabled={aiLoading}
        >
          Flow Coach
        </SecondaryButton>
        <SecondaryButton
          size="sm"
          data-tour-id="ear-check-button"
          className="has-tooltip"
          data-tooltip="Scans your manuscript for passages that will lose listeners when heard aloud. Steps through each issue one at a time with a diagnosis and direction."
          onClick={runEarCheck}
          disabled={aiLoading || !hasContent}
        >
          Ear Check
        </SecondaryButton>
        <PrimaryButton
          size="sm"
          data-tour-id="tune-up-button"
          className="has-tooltip"
          data-tooltip="A full editorial evaluation covering structure, text alignment, functional balance, and redemptive logic. Produces a Sermon Snapshot, Alignment Map, and Patch Plan."
          onClick={runTuneUp}
          disabled={aiLoading || !hasContent}
        >
          {aiLoading ? "Thinking…" : "Final Tune-Up"}
        </PrimaryButton>
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

      {sermon.last_tune_up && <LastTuneUpPanel saved={sermon.last_tune_up} />}

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

      <div className="step-advance">
        <PrimaryButton size="sm" onClick={() => onTabChange?.(STAGE.Delivery)}>
          Continue to Delivery →
        </PrimaryButton>
      </div>

    </div>
  );
}
