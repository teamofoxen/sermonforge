// ContextPreview.jsx — Shows the assembled context payload for the current sermon + step.
// Used in the AI panel during demo mode. Calls buildContext() client-side (no API call).

import { useMemo } from "react";
import { buildContext } from "../utils/contextBuilder";
import { useDemo } from "../contexts/DemoContext";

// Map section headers to tier info
const SECTION_TIERS = {
  "[PASSAGE & MPT]":       { tier: 1, color: "var(--gold)",       label: "Tier 1 — Passage & MPT/MPS" },
  "[THIS SERMON]":         { tier: 7, color: "#7b5ea7",            label: "Tier 7 — Pastoral Intelligence" },
  "[INTERPRETATION]":      { tier: 2, color: "var(--sage)",        label: "Tier 2 — Exegesis" },
  "[STRUCTURE]":           { tier: 3, color: "var(--slate)",       label: "Tier 3 — Outline & Functional Elements" },
  "[SERIES CONTEXT]":      { tier: 4, color: "var(--crimson)",     label: "Tier 4 — Series Context" },
  "[SUPPORTING MATERIAL]": { tier: 5, color: "var(--ink-soft)",    label: "Tier 5 — Library & Theology" },
  "[PASTOR CONTEXT]":      { tier: 6, color: "var(--ink-ghost)",   label: "Tier 6 — Pastor Memory" },
};

function parseContextSections(contextStr) {
  if (!contextStr?.trim()) return [];

  const sectionPattern = /(\[(?:PASSAGE & MPT|THIS SERMON|INTERPRETATION|STRUCTURE|SERIES CONTEXT|SUPPORTING MATERIAL|PASTOR CONTEXT)\])/g;
  const parts = contextStr.split(sectionPattern);

  const sections = [];
  let i = 0;
  while (i < parts.length) {
    const chunk = parts[i];
    if (chunk && SECTION_TIERS[chunk]) {
      const body = parts[i + 1] || "";
      sections.push({ header: chunk, body: body.trim(), ...SECTION_TIERS[chunk] });
      i += 2;
    } else {
      i++;
    }
  }
  return sections;
}

export default function ContextPreview({ sermon, step }) {
  const { demoMode } = useDemo();

  const contextStr = useMemo(() => {
    if (!sermon) return "";
    try {
      return buildContext({ sermon, step: step || "study" }) || "";
    } catch (e) {
      console.error("[ContextPreview] buildContext failed:", e);
      return "";
    }
  }, [sermon, step]);

  const sections = useMemo(() => parseContextSections(contextStr), [contextStr]);

  if (!demoMode) return null;

  const totalChars = contextStr.length;

  return (
    <div style={{
      borderTop: "1px solid var(--parchment-deep)",
      background: "var(--parchment)",
      overflow: "auto",
      maxHeight: "480px",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px 8px",
        borderBottom: "1px solid var(--parchment-deep)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "12px", fontWeight: "700", color: "var(--ink)", letterSpacing: "0.04em" }}>
            Context Preview
          </div>
          <div style={{ fontSize: "11px", color: "var(--ink-ghost)", marginTop: "1px", fontFamily: "'Crimson Pro', serif" }}>
            This is exactly what was assembled for the AI — step: <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>{step || "study"}</code>
          </div>
        </div>
        <div style={{ fontSize: "11px", color: "var(--ink-ghost)", fontFamily: "'JetBrains Mono', monospace" }}>
          {totalChars.toLocaleString()} chars
        </div>
      </div>

      {sections.length === 0 ? (
        <div style={{ padding: "20px 16px", fontSize: "13px", color: "var(--ink-ghost)", fontStyle: "italic", fontFamily: "'Crimson Pro', serif" }}>
          No context assembled — fill in some fields first.
        </div>
      ) : (
        <div style={{ padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {sections.map((sec) => (
            <div key={sec.header} style={{
              background: "var(--white)",
              border: `1px solid var(--parchment-deep)`,
              borderLeft: `3px solid ${sec.color}`,
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}>
              <div style={{
                padding: "5px 10px",
                background: "var(--parchment-warm)",
                borderBottom: "1px solid var(--parchment-deep)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: "10px", fontFamily: "'Crimson Pro', serif", fontWeight: "700", color: sec.color, letterSpacing: "0.04em" }}>
                  {sec.label}
                </span>
                <span style={{ fontSize: "10px", color: "var(--ink-ghost)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {sec.body.length.toLocaleString()} chars
                </span>
              </div>
              <pre style={{
                margin: 0, padding: "10px 12px",
                fontFamily: "'Crimson Pro', serif",
                fontSize: "12px", lineHeight: "1.6",
                color: "var(--ink-mid)",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                maxHeight: "200px", overflow: "auto",
              }}>
                {sec.body || <span style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>empty</span>}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
