import { useState } from "react";
import { getOutline, getFunctionalElements, tryParse, autoResize, assembleManuscriptText } from "../utils";
import { summarizeExegesis } from "../utils/contextBuilder";
import { sendAIMessage } from "../utils/ai";
import { parseAIJson, validateCMC } from "../utils/aiSchema";
import { exportPmb } from "../db/database";
import { updateSermon } from "../core/spine";
import { SERMON_STATUS, STAGE } from "../core/contracts";
import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";
import ProposalPanel from "./ProposalPanel";

// ── Panel constants ───────────────────────────────────────────────────────────

const PANELS = ["manuscript", "preaching-outline", "without-notes"];
const PANEL_LABELS = { "manuscript": "Manuscript", "preaching-outline": "Outline", "without-notes": "Without Notes" };

// ── Manuscript delivery ───────────────────────────────────────────────────────

const MANUSCRIPT_DELIVERY_SYSTEM = `You are a sermon delivery editor. Your only jurisdiction is visual presentation — content is completely frozen.

PHASE 1 — RHETORICAL ANALYSIS (internal — do not output this phase)
Read the full manuscript alongside the provided outline. Understand what each section is doing to the listener at each moment — pacing, emotional register, logical flow, momentum. This understanding informs where lines break, where bullets land, and which statements earn non-bulleted treatment.

PHASE 2 — DELIVERY FORMATTING
Apply these rules exactly:

CONTENT (non-negotiable): Do not change any wording, meaning, or sentence structure. Keep all abbreviations exactly as written. No additions. No removals. No paraphrasing.

BULLETS: Bullets are the default formatting unit. Use them for most content — narrative sequences, explanations, enumerated lists, parallel structures, application moves.

NON-BULLETED LINES: Reserve for rhetorical weight only — pivots, landings, the statements that must stand alone. These should be rare. Their sparseness is what gives them force.

LINE BREAKS: Each line is one spoken phrase or clause. Break at natural spoken pauses.

SECTION LABELS: Use the exact outline point titles provided. Format as: **[ POINT TITLE ]**
Label functional elements where present: **[ Explanation ]** **[ Illustration ]** **[ Application ]**

SCRIPTURE: Italic stacked lines, mixed case. Reference on its own line at the end: — Book Chapter:Verse

BOLD: Key phrases only. Sparse.

DIVIDERS: ——— between major sections.

OUTPUT: Return the fully formatted manuscript only. Use markdown conventions: ** for bold, * for italic, - for bullet items. No commentary, no preamble.`;

function buildManuscriptDeliveryContext(sermon) {
  const outline = getOutline(sermon);
  const fe = getFunctionalElements(sermon);

  const parts = [
    `TITLE: ${sermon.title || "Untitled"}`,
    `PASSAGE: ${sermon.passage || "(not set)"}`,
    `MPS: ${sermon.mps || "(not set)"}`,
  ];

  if (outline.length > 0) {
    const outlineText = outline.map((p, i) => {
      const elements = fe[p.id] || {};
      let text = `${i + 1}. ${p.text}`;
      if (elements.explanation) text += "\n   - Explanation";
      if (elements.illustration) text += "\n   - Illustration";
      if (elements.application) text += "\n   - Application";
      return text;
    }).join("\n");
    parts.push(`\nOUTLINE:\n${outlineText}`);
  }

  parts.push(`\nMANUSCRIPT:\n\n${assembleManuscriptText(sermon) || "(empty)"}`);

  return parts.join("\n");
}

function renderDeliveryMarkdown(text) {
  if (!text) return "";
  const lines = text.split("\n");
  const out = [];
  let inList = false;

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (trimmed === "———" || trimmed === "---") {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push('<hr class="msd-divider">');
      continue;
    }

    // Process inline markdown
    let line = raw
      .replace(/\*\*\[\s*([^\]]+)\s*\]\*\*/g, '<span class="msd-section-label">$1</span>')
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

    if (/^- /.test(raw)) {
      if (!inList) { out.push('<ul class="msd-bullets">'); inList = true; }
      out.push(`<li>${line.replace(/^- /, "")}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      if (trimmed === "") {
        out.push('<div class="msd-gap"></div>');
      } else {
        out.push(`<div class="msd-line">${line}</div>`);
      }
    }
  }

  if (inList) out.push("</ul>");
  return out.join("\n");
}

function ManuscriptPanel({ sermon, onUpdate, onPanelChange }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [proposal, setProposal] = useState(null);

  const stored = tryParse(sermon.manuscript_delivery, null);
  const content = typeof stored === "string" ? stored : null;

  async function generate() {
    if (!assembleManuscriptText(sermon).trim()) {
      setError("A completed manuscript is required.");
      return;
    }
    setGenerating(true);
    setError(null);
    setProposal(null);

    try {
      const context = buildManuscriptDeliveryContext(sermon);
      const result = await sendAIMessage(
        [{ role: "user", content: `${context}\n\nFormat the manuscript for delivery.` }],
        MANUSCRIPT_DELIVERY_SYSTEM,
        STAGE.Delivery,
        sermon.id,
      );
      if (!result.ok) {
        if (result.kind !== "aborted") setError(`Generation failed: ${result.message}`);
        return;
      }

      const cleaned = result.text
        .replace(/^```(?:markdown|text)?\n?/m, "")
        .replace(/\n?```$/m, "")
        .trim();

      if (cleaned) setProposal(cleaned);
    } catch (err) {
      console.error("[ManuscriptDelivery] generation failed:", err);
      setError("Generation failed. Check that the manuscript is complete and try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <div className="delivery-panel-header">
        <div>
          <h2 className="delivery-panel-title">Delivery Manuscript</h2>
          <p className="delivery-panel-subtitle">Formatted for reading aloud. Content unchanged.</p>
        </div>
        <PrimaryButton onClick={generate} disabled={generating}>
          {generating ? "Thinking…" : content ? "Regenerate" : "Format Manuscript"}
        </PrimaryButton>
      </div>

      {error && <div className="pmb-error">{error}</div>}

      <ProposalPanel
        loading={generating}
        proposal={proposal}
        label="AI proposes delivery formatting"
        acceptLabel={content ? "Replace formatted manuscript" : "Use this"}
        onAccept={() => {
          onUpdate({ manuscript_delivery: JSON.stringify(proposal) });
          setProposal(null);
        }}
        onDiscard={() => setProposal(null)}
      />

      {content && (
        <>
          <div
            className="msd-body"
            dangerouslySetInnerHTML={{ __html: renderDeliveryMarkdown(content) }}
          />
          <div className="step-advance">
            <SecondaryButton size="sm" onClick={() => onPanelChange?.("preaching-outline")}>
              Next: Preaching Outline →
            </SecondaryButton>
          </div>
        </>
      )}
    </>
  );
}

// ── Outline delivery ──────────────────────────────────────────────────────────

function OutlinePanel({ sermon }) {
  const outline = getOutline(sermon);
  const fe = getFunctionalElements(sermon);

  if (outline.length === 0) {
    return (
      <div className="delivery-panel-empty">
        No outline points yet. Build your outline first.
      </div>
    );
  }

  return (
    <>
      <div className="delivery-panel-header">
        <div>
          <h2 className="delivery-panel-title">Preaching Outline</h2>
          <p className="delivery-panel-subtitle">Points, structure, and supporting material.</p>
        </div>
      </div>

      <div className="outline-delivery">
        {sermon.passage && (
          <div className="outline-delivery-passage">{sermon.passage}</div>
        )}
        {sermon.title && (
          <h2 className="outline-delivery-title">{sermon.title}</h2>
        )}
        {sermon.mps && (
          <div className="outline-delivery-mps">{sermon.mps}</div>
        )}

        <div className="outline-delivery-points">
          {outline.map((point, i) => {
            const elements = fe[point.id] || {};
            const hasElements = elements.explanation || elements.illustration || elements.application;

            return (
              <div key={point.id} className="outline-delivery-point">
                <div className="outline-delivery-point-num">{i + 1}</div>
                <div className="outline-delivery-point-body">
                  <div className="outline-delivery-point-text">{point.text}</div>

                  {hasElements && (
                    <div className="outline-delivery-elements">
                      {elements.explanation && (
                        <div className="outline-delivery-element">
                          <span className="outline-delivery-element-label">Explanation</span>
                          <p className="outline-delivery-element-text">{elements.explanation}</p>
                        </div>
                      )}
                      {elements.illustration && (
                        <div className="outline-delivery-element">
                          <span className="outline-delivery-element-label">Illustration</span>
                          <p className="outline-delivery-element-text">{elements.illustration}</p>
                        </div>
                      )}
                      {elements.application && (
                        <div className="outline-delivery-element">
                          <span className="outline-delivery-element-label">Application</span>
                          <p className="outline-delivery-element-text">{elements.application}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Without Notes (CMC) ───────────────────────────────────────────────────────

const MOVEMENT_TYPES = [
  "Hook", "Set tension", "Expose", "Explain", "Illustrate",
  "Transition", "Gospel turn", "Application", "Landing",
];

const CMC_SYSTEM = `You are a Contour-Mapped Compression (CMC) engine for sermon preaching preparation.

Your task: take a completed sermon manuscript and compress it into Preaching Memory Blocks (PMBs). This is not a summary — it is the steel frame hidden inside the cathedral stone. Same shape, same load paths, just lighter. Every rhetorical movement in the manuscript must have a corresponding PMB. No exceptions.

PHILOSOPHY
The preacher will internalize this structure and preach entirely from memory — no manuscript, no notes. The PMBs are not a script. They are the architecture. The trigger phrase is the ignition key. The preacher memorizes trigger_phrase and transition_out verbatim. Everything else is internalized, not recited.

RUN THESE PHASES IN ORDER:

PHASE 1 — STRUCTURAL ANALYSIS
Read the full manuscript. Identify the structural logic. For each section: What is it claiming? What does it serve? If this section fails, what fails?

PHASE 2 — MOVEMENT MAPPING
Within the structure you identified, name the rhetorical movement of each section. Each section must answer: "What is this doing to the listener right now?" Segment by rhetorical movement — not by paragraphs, not by headings, not by word count.
Valid movement types: Hook | Set tension | Expose | Explain | Illustrate | Transition | Gospel turn | Application | Landing

PHASE 3 — DANGER ZONE IDENTIFICATION
Within each identified movement, flag what will betray delivery: where will the preacher over-explain or rabbit trail? Where will the congregation lose the thread? Where is a critical moment buried or under-resourced?

COMPRESSION — strict constraints, non-negotiable:
- outline_point: copy the exact outline point text from the OUTLINE provided above. Null for intro/conclusion blocks that don't belong to a point.
- scripture: copy the exact scripture reference or text from the OUTLINE provided above — verbatim, no changes, no additions. If no scripture is listed for the corresponding outline point, use null. Do not generate, infer, abbreviate, or rephrase any scripture.
- core_claim: 1 sentence maximum. If this section fails, what fails?
- trigger_phrase: 5 words maximum. Memorized verbatim. The ignition key.
- memory_hooks: exactly 2 short phrases. Conceptual handholds — not sentences.
- imagery: exactly 1 dominant image. The single image this block lives inside.
- movement: exactly 1 type from the valid list above.
- transition_out: 1 sentence. Memorized verbatim. The bridge to the next block.
- danger_zones: array of specific, actionable delivery warnings.

If a movement cannot compress to these limits, compress it anyway — the difficulty reveals the problem.

OUTPUT: Return ONLY valid JSON. No explanation, no markdown, no code fences.

{
  "spine": "<the MPS — one sentence the preacher returns to when lost>",
  "generated": "",
  "blocks": [
    {
      "id": "B1",
      "outline_point": "<exact outline point text, or null>",
      "scripture": "<key verse or passage, or null>",
      "movement": "<valid movement type>",
      "core_claim": "<1 sentence max>",
      "trigger_phrase": "<5 words max>",
      "memory_hooks": ["<short phrase>", "<short phrase>"],
      "imagery": "<one image>",
      "transition_out": "<1 sentence>",
      "danger_zones": ["<specific warning>"]
    }
  ]
}`;

function buildCMCContext(sermon) {
  const outline = getOutline(sermon);
  const exegesis = summarizeExegesis(sermon);

  const parts = [
    `PASSAGE: ${sermon.passage || "(not set)"}`,
    `MPT: ${sermon.mpt || "(not set)"}`,
    `MPS: ${sermon.mps || "(not set)"}`,
  ];

  if (outline.length > 0) {
    const fe = getFunctionalElements(sermon);
    const outlineText = outline.map((p, i) => {
      const d = fe[p.id] || {};
      let line = `${i + 1}. ${p.text}`;
      if (d.scripture) line += `\n   Scripture: ${d.scripture}`;
      return line;
    }).join("\n");
    parts.push(`\nOUTLINE:\n${outlineText}`);
  }

  if (exegesis) {
    parts.push(`\nEXEGESIS:\n${exegesis}`);
  }

  parts.push(`\nMANUSCRIPT:\n\n${assembleManuscriptText(sermon) || "(empty)"}`);

  return parts.join("\n");
}

function PmbCard({ block, index, onChange }) {
  function set(field, value) {
    onChange(index, field, value);
  }

  return (
    <div className="card pmb-card">
      <div className="pmb-card-header">
        <span className="pmb-id">{block.id}</span>
        <select
          className="pmb-movement-select"
          value={block.movement}
          onChange={(e) => set("movement", e.target.value)}
        >
          {MOVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {block.outline_point && (
        <div className="pmb-field">
          <label className="pmb-label">Outline Point</label>
          <div className="pmb-outline-point">{block.outline_point}</div>
        </div>
      )}

      {block.scripture && (
        <div className="pmb-field">
          <label className="pmb-label">Scripture</label>
          <div className="pmb-scripture">{block.scripture}</div>
        </div>
      )}

      <div className="pmb-trigger-row">
        <label className="pmb-label pmb-label--trigger">Trigger Phrase</label>
        <input
          className="pmb-trigger-input"
          value={block.trigger_phrase}
          onChange={(e) => set("trigger_phrase", e.target.value)}
          placeholder="Five words max — memorize verbatim"
        />
      </div>

      <div className="pmb-field">
        <label className="pmb-label">Core Claim</label>
        <textarea
          className="field-textarea"
          rows={2}
          value={block.core_claim}
          onChange={(e) => set("core_claim", e.target.value)}
          onInput={(e) => autoResize(e.target)}
          ref={(el) => autoResize(el)}
        />
      </div>

      <div className="pmb-two-col">
        <div className="pmb-field">
          <label className="pmb-label">Memory Hooks</label>
          <textarea
            className="field-textarea"
            rows={2}
            value={(block.memory_hooks || []).join("\n")}
            onChange={(e) => set("memory_hooks", e.target.value.split("\n").slice(0, 2))}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
            placeholder="One hook per line (max 2)"
          />
        </div>
        <div className="pmb-field">
          <label className="pmb-label">Imagery</label>
          <textarea
            className="field-textarea"
            rows={2}
            value={block.imagery}
            onChange={(e) => set("imagery", e.target.value)}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
            placeholder="One dominant image"
          />
        </div>
      </div>

      <div className="pmb-field">
        <label className="pmb-label">Transition Out</label>
        <textarea
          className="field-textarea"
          rows={2}
          value={block.transition_out}
          onChange={(e) => set("transition_out", e.target.value)}
          onInput={(e) => autoResize(e.target)}
          ref={(el) => autoResize(el)}
          placeholder="Memorize verbatim — the bridge to the next block"
        />
      </div>

    </div>
  );
}

function WithoutNotesPanel({ sermon, onUpdate }) {
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  // proposal shape: { parsed, summary } — `parsed` is the generated PMB object,
  // `summary` is a plaintext preview rendered in ProposalPanel.
  const [proposal, setProposal] = useState(null);

  const data = tryParse(sermon.preaching_blocks, null);
  const blocks = data?.blocks || [];
  const spine = data?.spine || "";

  async function generate() {
    if (!assembleManuscriptText(sermon).trim()) {
      setError("A completed manuscript is required to generate preaching blocks.");
      return;
    }
    setGenerating(true);
    setError(null);
    setProposal(null);

    try {
      const context = buildCMCContext(sermon);
      const result = await sendAIMessage(
        [{ role: "user", content: `${context}\n\nGenerate the PMBs.` }],
        CMC_SYSTEM,
        STAGE.Delivery,
        sermon.id,
      );
      if (!result.ok) {
        if (result.kind !== "aborted") setError(`Generation failed: ${result.message}`);
        return;
      }
      const response = result.text;

      const parsedRaw = parseAIJson(response);
      if (!parsedRaw.ok) {
        setError(`Generation failed: ${parsedRaw.reason}`);
        return;
      }
      const validated = validateCMC(parsedRaw.value);
      if (!validated.ok) {
        setError(`Generation failed: ${validated.reason}`);
        return;
      }
      const parsed = validated.value;

      const proposedBlocks = parsed?.blocks || [];
      const summary = [
        `Generated ${proposedBlocks.length} preaching block${proposedBlocks.length === 1 ? "" : "s"}.`,
        parsed?.spine ? `\nSpine: ${parsed.spine}` : "",
        ...proposedBlocks.map(b => `\n${b.id} (${b.movement}) — ${b.trigger_phrase}\n  ${b.core_claim}`),
      ].join("\n");

      setProposal({ parsed, summary });
    } catch (err) {
      console.error("[CMC] generation failed:", err);
      setError("Generation failed. Check that the manuscript is complete and try again.");
    } finally {
      setGenerating(false);
    }
  }

  function updateBlock(index, field, value) {
    const next = {
      ...data,
      blocks: data.blocks.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    };
    onUpdate({ preaching_blocks: JSON.stringify(next) });
  }

  function updateSpine(value) {
    onUpdate({ preaching_blocks: JSON.stringify({ ...data, spine: value }) });
  }

  async function handleExport() {
    if (!blocks.length || exporting) return;
    setExporting(true);
    setError(null);
    try {
      const result = await exportPmb({
        blocks,
        spine,
        title: sermon.title || "",
        passage: sermon.passage || "",
        mps: sermon.mps || "",
      });
      if (!result.success) setError(result.error || "Export failed.");
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="delivery-panel-header">
        <div>
          <h2 className="delivery-panel-title">Preaching Without Notes</h2>
          <p className="delivery-panel-subtitle">Steel frame. Same shape. Just lighter.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {blocks.length > 0 && (
            <SecondaryButton onClick={handleExport} disabled={exporting}>
              {exporting ? "Saving…" : "Export to Word"}
            </SecondaryButton>
          )}
          <PrimaryButton onClick={generate} disabled={generating}>
            {generating ? "Thinking…" : blocks.length > 0 ? "Regenerate" : "Generate Preaching Blocks"}
          </PrimaryButton>
        </div>
      </div>

      {error && <div className="pmb-error">{error}</div>}

      <ProposalPanel
        loading={generating}
        proposal={proposal?.summary || null}
        label="AI proposes preaching blocks"
        acceptLabel={blocks.length > 0 ? "Replace preaching blocks" : "Use this"}
        onAccept={() => {
          if (!proposal) return;
          const finalParsed = { ...proposal.parsed, generated: new Date().toISOString() };
          onUpdate({ preaching_blocks: JSON.stringify(finalParsed) });
          setProposal(null);
        }}
        onDiscard={() => setProposal(null)}
      />

      {blocks.length > 0 && (
        <>
          <div className="card pmb-spine-card">
            <label className="pmb-label pmb-label--spine">Spine — return here when lost</label>
            <input
              className="pmb-spine-input"
              value={spine}
              onChange={(e) => updateSpine(e.target.value)}
            />
          </div>

          <div className="pmb-blocks">
            {blocks.map((block, i) => (
              <PmbCard key={block.id} block={block} index={i} onChange={updateBlock} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function DeliveryTab({ sermon, onUpdate }) {
  const [activePanel, setActivePanel] = useState("manuscript");
  const [marking, setMarking] = useState(false);

  // Mark Complete is an explicit user action — Mutation Contract #4
  // ("destruction proportional to reversal") and the Principle ("system never
  // substitutes for user clarity") both require it. The auto-suggest banner
  // below proposes the action when conditions are met (delivery date past +
  // manuscript non-empty); clicking the button is the user's evidence of intent.
  const today = new Date().toISOString().slice(0, 10);
  const datePast = sermon?.date && sermon.date < today;
  const hasManuscript = !!assembleManuscriptText(sermon).trim();
  const isComplete = sermon?.stage === SERMON_STATUS.Complete;
  const suggestComplete = datePast && hasManuscript && !isComplete;

  async function handleMarkComplete() {
    if (marking || isComplete) return;
    setMarking(true);
    try {
      await updateSermon(sermon.id, { stage: SERMON_STATUS.Complete });
      onUpdate?.({ stage: SERMON_STATUS.Complete });
    } catch (e) {
      console.error("[DeliveryTab] Mark Complete failed:", e);
    } finally {
      setMarking(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: "20px", fontSize: "13px", color: "var(--ink-ghost)", fontStyle: "italic" }}>
        Three ways to stand at the pulpit. Format the manuscript for reading aloud, review the preaching outline, or compress everything into memory blocks for preaching without notes.
      </div>

      {/* Auto-suggest Mark Complete banner — appears only when delivery date
          has passed AND a manuscript exists AND the sermon isn't already
          complete. The button is the user's explicit evidence of intent. */}
      {suggestComplete && (
        <div
          role="status"
          style={{
            background: "var(--parchment-warm)",
            border: "1px solid var(--parchment-deep)",
            borderLeft: "3px solid var(--gold)",
            borderRadius: "var(--radius)",
            padding: "10px 14px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            fontFamily: "var(--font-serif)",
            fontSize: "13px",
            color: "var(--ink-mid)",
          }}
        >
          <span>Delivery date has passed. Mark this sermon complete?</span>
          <PrimaryButton size="sm" onClick={handleMarkComplete} disabled={marking}>
            {marking ? "Saving…" : "Mark Complete"}
          </PrimaryButton>
        </div>
      )}

      <div className="delivery-tabs">
        {PANELS.map((p) => (
          <button
            key={p}
            className={`delivery-tab-btn${activePanel === p ? " active" : ""}`}
            onClick={() => setActivePanel(p)}
          >
            {PANEL_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="delivery-panel-body">
        {activePanel === "manuscript" && (
          <ManuscriptPanel sermon={sermon} onUpdate={onUpdate} onPanelChange={setActivePanel} />
        )}
        {activePanel === "preaching-outline" && (
          <OutlinePanel sermon={sermon} />
        )}
        {activePanel === "without-notes" && (
          <WithoutNotesPanel sermon={sermon} onUpdate={onUpdate} />
        )}
      </div>

      {/* Explicit Mark Complete action — always available regardless of
          auto-suggest banner. Hidden once already complete. */}
      {!isComplete && (
        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--parchment-deep)", display: "flex", justifyContent: "flex-end" }}>
          <SecondaryButton size="sm" onClick={handleMarkComplete} disabled={marking}>
            {marking ? "Saving…" : "Mark sermon complete"}
          </SecondaryButton>
        </div>
      )}
    </>
  );
}
