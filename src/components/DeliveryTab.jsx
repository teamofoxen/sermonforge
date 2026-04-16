import { useState } from "react";
import { getOutline, tryParse, autoResize } from "../utils";
import { summarizeExegesis } from "../utils/contextBuilder";
import { sendAIMessage } from "../utils/ai";

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
    parts.push(`\nOUTLINE:\n${outline.map((p, i) => `${i + 1}. ${p.text}`).join("\n")}`);
  }

  if (exegesis) {
    parts.push(`\nEXEGESIS:\n${exegesis}`);
  }

  parts.push(`\nMANUSCRIPT:\n\n${sermon.manuscript || "(empty)"}`);

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

      {block.danger_zones?.length > 0 && (
        <div className="pmb-field">
          <label className="pmb-label pmb-label--danger">Danger Zones</label>
          <textarea
            className="field-textarea pmb-danger-textarea"
            rows={2}
            value={block.danger_zones.join("\n")}
            onChange={(e) => set("danger_zones", e.target.value.split("\n").filter(Boolean))}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
          />
        </div>
      )}
    </div>
  );
}

export default function DeliveryTab({ sermon, onUpdate }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const data = tryParse(sermon.preaching_blocks, null);
  const blocks = data?.blocks || [];
  const spine = data?.spine || "";

  async function generate() {
    if (!sermon.manuscript?.trim()) {
      setError("A completed manuscript is required to generate preaching blocks.");
      return;
    }
    setGenerating(true);
    setError(null);

    try {
      const context = buildCMCContext(sermon);
      const response = await sendAIMessage(
        [{ role: "user", content: `${context}\n\nGenerate the PMBs.` }],
        CMC_SYSTEM
      );

      const cleaned = response
        .replace(/^```(?:json)?\n?/m, "")
        .replace(/\n?```$/m, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      parsed.generated = new Date().toISOString();

      onUpdate({ preaching_blocks: JSON.stringify(parsed) });
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

  return (
    <>
      <div className="pmb-header">
        <div>
          <h2 className="pmb-title">Preaching Without Notes</h2>
          <p className="pmb-subtitle">Steel frame. Same shape. Just lighter.</p>
        </div>
        <button className="btn-primary" onClick={generate} disabled={generating}>
          {generating ? "Generating…" : blocks.length > 0 ? "Regenerate" : "Generate Preaching Blocks"}
        </button>
      </div>

      {error && <div className="pmb-error">{error}</div>}

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
