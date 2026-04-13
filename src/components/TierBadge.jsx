// TierBadge.jsx — Shows which context pipeline tier a field belongs to.
// Only renders when demo mode is active. Hover to see full description.

import { useState } from "react";
import { useDemo } from "../contexts/DemoContext";

// Tier definitions — colour, short label, tooltip
const TIER_CONFIG = {
  1: {
    color: "var(--gold)",
    bg: "var(--gold-pale)",
    label: "Tier 1",
    desc: "Always sent to the AI — first priority. Passage, MPT, and MPS form the core of every AI call.",
  },
  2: {
    color: "var(--sage)",
    bg: "var(--sage-pale)",
    label: "Tier 2",
    desc: "Exegesis — sent when you are in the Study tab. The deeper this is filled, the richer the AI's engagement with the text.",
  },
  3: {
    color: "var(--slate)",
    bg: "var(--slate-pale)",
    label: "Tier 3",
    desc: "Sermon structure — sent when you have outline and functional elements. The AI can see how you have shaped the material.",
  },
  4: {
    color: "var(--crimson)",
    bg: "var(--crimson-pale)",
    label: "Tier 4",
    desc: "Series context — big idea, series motivation, and redemptive arc. Capped at 1,200 characters across these fields combined.",
  },
  7: {
    color: "var(--tier7)",
    bg: "var(--tier7-pale)",
    label: "Tier 7",
    desc: "Pastoral Intelligence — always sent when any field has content. Tells the AI about the congregation, the doctrine at stake, and the background noise. Budget: 800 characters total.",
  },
  excluded: {
    color: "var(--ink-ghost)",
    bg: "var(--parchment-deep)",
    label: "Series Only",
    desc: "This field stays in the Series Planner — it is too large for the per-sermon context budget and is used for planning, not AI generation.",
  },
};

export default function TierBadge({ tier, style }) {
  const { demoMode } = useDemo();
  const [tipVisible, setTipVisible] = useState(false);

  if (!demoMode) return null;

  const cfg = TIER_CONFIG[tier];
  if (!cfg) return null;

  return (
    <span
      style={{ position: "relative", display: "inline-block", ...style }}
      onMouseEnter={() => setTipVisible(true)}
      onMouseLeave={() => setTipVisible(false)}
    >
      <span style={{
        display: "inline-block",
        fontSize: "10px",
        fontFamily: "'Crimson Pro', serif",
        fontWeight: "600",
        letterSpacing: "0.04em",
        padding: "1px 7px",
        borderRadius: "8px",
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}`,
        cursor: "default",
        verticalAlign: "middle",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}>
        {cfg.label}
      </span>

      {tipVisible && (
        <span style={{
          position: "absolute",
          bottom: "calc(100% + 6px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          background: "var(--ink)",
          color: "var(--white)",
          fontSize: "12px",
          fontFamily: "'Crimson Pro', serif",
          lineHeight: "1.5",
          padding: "8px 12px",
          borderRadius: "var(--radius)",
          width: "240px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          pointerEvents: "none",
          whiteSpace: "normal",
        }}>
          <span style={{ fontWeight: "700", color: cfg.color }}>{cfg.label}</span>
          {" — "}{cfg.desc}
        </span>
      )}
    </span>
  );
}
