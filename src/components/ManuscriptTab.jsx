import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { getOutline, getFunctionalElements } from "../utils";
import { sendAIMessage } from "../utils/ai";

function buildTemplate(sermon) {
  const outline = getOutline(sermon);
  const fe = getFunctionalElements(sermon);

  const bodyPoints = outline.length
    ? outline.map((pt, i) => {
        const d = fe[pt.id] || {};
        const lines = [`Point ${i + 1}: ${pt.text}`];
        if (d.scripture) lines.push(`\n${d.scripture}`);
        lines.push(`\nExplanation:\n${d.explanation || ""}`);
        lines.push(`\nApplication:\n${d.application || ""}`);
        lines.push(`\nIllustration:\n${d.illustration || ""}`);
        return lines.join("\n");
      }).join("\n\n")
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

const MANUSCRIPT_CHAT_SYSTEM = `You are a sermon writing assistant, flow coach, and delivery analyst in the same conversation.

WHEN COACHING (the pastor asks what a section needs to accomplish, how it should move, what's missing):
Work through the sermon movements — intro, each point, transitions, conclusion. Name what each section needs to do to the listener: pacing, emotional register, logical flow, momentum. Be concrete. Speak like a coach.

WHEN WRITING (the pastor asks you to write, draft, or give them an intro, transition, section, illustration, or application):
Produce a full draft — not an outline, not suggestions, not bullet points. The pastor edits from a draft; they can't preach a plan.
Voice: spoken register, not generically "preachery". Ground everything in the passage and MPS. Theological weight without sounding academic.

WHEN DOING AN EAR CHECK (the pastor asks for an Ear Check or to diagnose listener-hostile phrasing):
PHASE 1 — STRUCTURAL ORPHANS: Identify passages disconnected from the sermon's structural logic — drifted sections, explanatory blocks with no anchor. List each with location and one-line diagnosis.
PHASE 2 — SPEAKABILITY FLAGS: The 5 worst offenders. For each: quote or locate it, diagnose what makes it listener-hostile (sentence nesting, abstract noun density, verbal signposting), give one direction for fixing it. Do not rewrite.

You do all three in the same thread. Follow the pastor wherever they go.`;

const EAR_CHECK_SYSTEM = `You are a sermon delivery analyst. Diagnose where this manuscript will lose listeners. Do not rewrite. Do not coach. Diagnose and direct.

GOAL: Identify listener-hostile phrasing while preserving theological density and the author's voice. Density is permitted. Unintelligibility is not.

PHASE 1 — STRUCTURAL ORPHANS:
Identify passages that are disconnected from the sermon's structural logic — sections that have drifted from their outline point, explanatory blocks with no anchor to the claim they serve, or passages that leave the listener without orientation. These are listener disorientation problems, not theological alignment problems. List each with its location and a one-line diagnosis.

PHASE 2 — SPEAKABILITY FLAGS:
Identify the worst offenders — passages that will lose the room in real-time hearing. Cap at 5. For each:
- Quote or clearly locate the passage
- Diagnosis: what makes it listener-hostile (sentence length/nesting, abstract noun density, verbal signposting, over-qualification, explanatory when it should assert)
- Direction: one instruction for how to approach fixing it — no rewrites, no replacement language

EVALUATION CRITERIA:
- Sentence length and nesting: subordinate clauses that collapse when spoken; sentences that make the listener carry too much before the main verb arrives
- Abstract noun density: stacked nominalizations where direct verbs would carry the meaning more cleanly; theological abstractions are permitted when precise, generic abstractions are not
- Verbal signposting: filler transitions that announce what you are about to do instead of doing it ("what I mean by this is", "in other words", "the point I am making here")

CONSTRAINTS:
- Theological precision is not a problem. An unintelligible sentence is.
- Do not rewrite. Do not suggest specific replacement language.
- Do not flag every imperfect sentence. Flag the ones that will actually lose the room.
- State the diagnosis. State the direction. Move on.`;

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
  const [msChat, setMsChat] = useState([]);
  const [msChatInput, setMsChatInput] = useState("");
  const [msChatLoading, setMsChatLoading] = useState(false);
  const [implementLoading, setImplementLoading] = useState(false);
  const msChatEndRef = useRef(null);

  useEffect(() => {
    if (msChatEndRef.current) msChatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [msChat, msChatLoading]);

  function buildMsContext() {
    const outline = getOutline(sermon);
    const fe = getFunctionalElements(sermon);
    const parts = [
      `Passage: ${sermon.passage || "(not set)"}`,
      `MPT: ${sermon.mpt || "(none)"}`,
      `MPS: ${sermon.mps || "(none)"}`,
    ];
    if (outline.length > 0) {
      const outlineText = outline.map((p, i) => {
        const d = fe[p.id] || {};
        const lines = [`${i + 1}. ${p.text}`];
        if (d.scripture) lines.push(`   Scripture: ${d.scripture}`);
        if (d.explanation) lines.push(`   Explanation: ${d.explanation}`);
        if (d.application) lines.push(`   Application: ${d.application}`);
        if (d.illustration) lines.push(`   Illustration: ${d.illustration}`);
        return lines.join("\n");
      }).join("\n\n");
      parts.push(`\nOutline & functional elements:\n${outlineText}`);
    }
    if (sermon.manuscript?.trim()) {
      const ms = sermon.manuscript.length > 3000
        ? sermon.manuscript.slice(0, 3000) + "\n\n[…manuscript continues…]"
        : sermon.manuscript;
      parts.push(`\nManuscript so far:\n${ms}`);
    }
    return parts.join("\n");
  }

  async function implementEarCheck(diagnosisText) {
    if (!sermon.manuscript?.trim() || implementLoading) return;
    setImplementLoading(true);
    try {
      const resp = await sendAIMessage(
        [{ role: "user", content: `Ear Check diagnosis:\n${diagnosisText}\n\nManuscript:\n${sermon.manuscript}\n\nApply only the edits described in the diagnosis. Return the full revised manuscript only — no commentary, no preamble, no code fences.` }],
        `You are a sermon manuscript editor. Apply the specific edits described in the Ear Check diagnosis to the manuscript. Make only those changes — do not rewrite sections that were not flagged. Preserve the author's voice and every sentence that was not diagnosed. Return the complete revised manuscript.`
      );
      if (resp?.trim()) onUpdate({ manuscript: resp.trim() });
    } catch (e) {
      console.error("[implementEarCheck]", e);
    } finally {
      setImplementLoading(false);
    }
  }

  async function sendMsChat(overrideText = null, responseMeta = {}) {
    const input = (overrideText ?? msChatInput).trim();
    if (!input || msChatLoading) return;
    const contextPrefix = buildMsContext() + "\n\n---\n\n";
    const newUserMsg = { role: "user", content: input };
    const history = [...msChat, newUserMsg];
    setMsChat(history);
    if (!overrideText) setMsChatInput("");
    setMsChatLoading(true);
    try {
      const messages = history.map((m, i) =>
        i === history.length - 1 ? { ...m, content: contextPrefix + m.content } : m
      );
      const resp = await sendAIMessage(messages, MANUSCRIPT_CHAT_SYSTEM);
      if (resp?.trim()) setMsChat(prev => [...prev, { role: "assistant", content: resp.trim(), ...responseMeta }]);
    } catch (e) {
      setMsChat(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setMsChatLoading(false);
    }
  }

  useEffect(() => {
    if (!templateInjectedRef.current && !sermon.manuscript?.trim()) {
      templateInjectedRef.current = true;
      onUpdate({ manuscript: buildTemplate(sermon) });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const words = wordCount(sermon.manuscript);
  const minutes = Math.round(words / 130); // ~130 wpm

  function runFlowCoach() {
    const outline = getOutline(sermon);
    const prompt = `Walk me through the flow of this sermon. Start with what the Introduction needs to accomplish, then cover each point and transition, then the Conclusion. After you've coached the shape, I may ask you to write specific sections.`;
    sendMsChat(prompt);
  }

  function runEarCheck() {
    sendMsChat("Run an Ear Check on this manuscript. Diagnose where it will lose listeners — structural orphans and speakability problems. Flag the worst offenders with a diagnosis and direction for each.", { isEarCheck: true });
  }

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
          className="btn-ghost btn-sm has-tooltip"
          data-tooltip="Generates a structured writing template from your outline, passage, MPT, and MPS. Use it to scaffold a blank manuscript or reset the structure before you begin writing. Any existing content will be replaced."
          onClick={() => {
            if (sermon.manuscript?.trim() && !confirm("Replace the current manuscript with a generated framework? This cannot be undone.")) return;
            onUpdate({ manuscript: buildTemplate(sermon) });
          }}
        >
          Build Manuscript Framework
        </button>
        <button
          className="btn-ghost btn-sm has-tooltip"
          data-tooltip="A step-by-step coaching session that walks through what each movement in your sermon needs to accomplish — intro, transitions, and conclusion. Doesn't write anything; coaches direction only and works at your pace."
          onClick={runFlowCoach}
          disabled={aiLoading || !sermon.manuscript}
        >
          Flow Coach
        </button>
        <button
          className="btn-ghost btn-sm has-tooltip"
          data-tooltip="Scans your manuscript for passages that will lose listeners when heard aloud. Flags structural orphans and speakability problems with a diagnosis and a direction — no rewrites."
          onClick={runEarCheck}
          disabled={aiLoading || !sermon.manuscript}
        >
          Ear Check
        </button>
        <button
          className="btn-primary btn-sm has-tooltip"
          data-tooltip="A full editorial evaluation covering structure, text alignment, functional balance, and redemptive logic. Produces a Sermon Snapshot, Alignment Map, and Patch Plan with specific, located edit instructions."
          onClick={runTuneUp}
          disabled={aiLoading || !sermon.manuscript}
        >
          {aiLoading ? "Running…" : "Final Tune-Up"}
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

      {/* Inline manuscript chat */}
      <div style={{ marginTop: "20px", border: "1px solid var(--parchment-deep)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", background: "var(--parchment)", borderBottom: "1px solid var(--parchment-deep)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-ghost)" }}>Write with AI</span>
          {msChat.length > 0 && (
            <button className="inline-ai-dismiss" onClick={() => setMsChat([])}>Clear</button>
          )}
        </div>

        {msChat.length > 0 && (
          <div style={{ padding: "12px 16px", maxHeight: "480px", overflowY: "auto", background: "var(--white)" }}>
            {msChat.map((msg, i) => {
              if (msg.role === "user") {
                return (
                  <div key={i} style={{ textAlign: "right", marginBottom: "10px" }}>
                    <span style={{ background: "var(--surface-2)", borderRadius: "8px", padding: "7px 12px", fontSize: "13px", display: "inline-block", maxWidth: "80%", textAlign: "left" }}>
                      {msg.content}
                    </span>
                  </div>
                );
              }
              return (
                <div key={i} style={{ marginBottom: "14px" }}>
                  <div className="ai-markdown" style={{ fontSize: "15px", fontFamily: "'Crimson Pro', serif", lineHeight: "1.7" }}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                    {msg.isEarCheck ? (
                      <button
                        className="btn-ghost btn-sm"
                        style={{ fontSize: "12px" }}
                        disabled={implementLoading || !sermon.manuscript?.trim()}
                        onClick={() => implementEarCheck(msg.content)}
                      >
                        {implementLoading ? "Applying…" : "Implement Suggestions"}
                      </button>
                    ) : (
                      <button
                        className="btn-ghost btn-sm"
                        style={{ fontSize: "12px" }}
                        onClick={() => {
                          const current = sermon.manuscript || "";
                          onUpdate({ manuscript: current.trimEnd() ? current.trimEnd() + "\n\n" + msg.content : msg.content });
                        }}
                      >
                        ↓ Apply to manuscript
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {msChatLoading && (
              <div className="ai-loading" style={{ padding: "6px 0" }}>
                <div className="ai-loading-dot" /><div className="ai-loading-dot" /><div className="ai-loading-dot" />
              </div>
            )}
            <div ref={msChatEndRef} />
          </div>
        )}

        <div style={{ padding: "10px 12px", background: "var(--white)", borderTop: msChat.length > 0 ? "1px solid var(--parchment-deep)" : "none", display: "flex", gap: "8px" }}>
          <textarea
            className="field-textarea"
            rows={2}
            style={{ flex: 1, minHeight: "unset", fontSize: "13px", resize: "none", border: "none", background: "transparent", padding: "4px 0" }}
            placeholder="Write me an introduction. Draft a transition after Point 2. Suggest an illustration…"
            value={msChatInput}
            onChange={e => setMsChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsChat(); } }}
            disabled={msChatLoading}
          />
          <button
            className="btn-ghost btn-sm"
            style={{ alignSelf: "flex-end", fontSize: "12px", whiteSpace: "nowrap" }}
            onClick={sendMsChat}
            disabled={msChatLoading || !msChatInput.trim()}
          >
            Ask →
          </button>
        </div>
      </div>
    </div>
  );
}
