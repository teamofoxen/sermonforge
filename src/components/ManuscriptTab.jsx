import { useEffect, useRef } from "react";
import { getOutline } from "../utils";

function buildTemplate(sermon) {
  const outline = getOutline(sermon);
  const bodyPoints = outline.length
    ? outline.map((pt, i) =>
        `Point ${i + 1}: ${pt.text}\nExplanation:\nApplication:\nIllustration:`
      ).join("\n\n")
    : null;

  return [
    "Introduction",
    `Opener:`,
    `Main Point of the Text: ${sermon.mpt || ""}`,
    `Scripture Reading: ${sermon.passage || ""}`,
    `Main Point of the Sermon: ${sermon.mps || ""}`,
    `Expectation:`,
    `Title:`,
    "",
    ...(bodyPoints ? ["Body", "", bodyPoints, ""] : []),
    "Conclusion",
    "Recap:",
    "Response:",
  ].join("\n");
}

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

function wordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function ManuscriptTab({ sermon, onUpdate, onAI, aiLoading, onOpenDrawer }) {
  const templateInjectedRef = useRef(false);

  useEffect(() => {
    if (!templateInjectedRef.current && !sermon.manuscript?.trim()) {
      templateInjectedRef.current = true;
      onUpdate({ manuscript: buildTemplate(sermon) });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const words = wordCount(sermon.manuscript);
  const minutes = Math.round(words / 130); // ~130 wpm

  function runTuneUp() {
    const outline = getOutline(sermon);
    const prompt = `Title: ${sermon.title || "Untitled"}\nPassage: ${sermon.passage || "unknown"}\nMPT: ${sermon.mpt || "(not set)"}\nMPS: ${sermon.mps || "(not set)"}\n\nOutline:\n${outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n") || "(none)"}\n\nManuscript:\n\n${sermon.manuscript || "(empty)"}`;
    onOpenDrawer?.();
    onAI(prompt, TUNE_UP_SYSTEM);
  }

  return (
    <div>
      <div className="manuscript-toolbar">
        <div className="word-count">
          {words.toLocaleString()} words · ~{minutes} min
        </div>
        <button
          className="btn-ghost btn-sm"
          onClick={() => {
            if (sermon.manuscript?.trim() && !confirm("Replace the current manuscript with a generated framework? This cannot be undone.")) return;
            onUpdate({ manuscript: buildTemplate(sermon) });
          }}
        >
          Build Manuscript Framework
        </button>
        <button
          className="btn-primary btn-sm"
          onClick={runTuneUp}
          disabled={aiLoading || !sermon.manuscript}
        >
          {aiLoading ? "Running…" : "Run Tune-Up Engine"}
        </button>
      </div>

      <textarea
        className="field-textarea"
        style={{
          minHeight: "calc(100vh - 280px)",
          fontFamily: "'Crimson Pro', serif",
          fontSize: "17px",
          lineHeight: "1.8",
          padding: "20px",
          border: "1px solid var(--parchment-deep)",
          borderRadius: "var(--radius-lg)",
          resize: "vertical",
        }}
        value={sermon.manuscript || ""}
        onChange={(e) => onUpdate({ manuscript: e.target.value })}
        placeholder="Begin your manuscript here…"
      />
    </div>
  );
}
