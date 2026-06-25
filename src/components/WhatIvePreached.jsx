import { useState } from "react";
import Arc from "./Arc";
import TopicsView from "./TopicsView";
import { buttonKeydown } from "../utils/buttonKeydown";

// WhatIvePreached — the two-lens "look back" home (Coverage Initiative, Phase 4;
// name pastor-decided 2026-06-25). It owns the page header + the lens tabs and
// renders one of two read/reflection surfaces:
//   • By book  — the sermon-grained Series Arc (genre/testament balance across
//                the canon over time), embedded so it drops its own header.
//   • By topic — the tag-driven TopicsView (what themes you've preached on).
// Macro/architect headspace, AI-free; it shows what the pastor has done and
// never directs him (the Topics lens in particular is browse-not-score).

const LENSES = [
  { id: "book", label: "By book" },
  { id: "topic", label: "By topic" },
];

export default function WhatIvePreached({ onOpenPlanner, onOpenSermon, _fixture }) {
  const [lens, setLens] = useState(_fixture?.lens ?? "book");

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">What I've Preached</h1>
        <p className="page-subtitle">A look back at what you've taught — across the canon and by topic</p>
      </div>

      {/* Lens tabs — the app's .stage-tabs idiom (white bar, gold active underline). */}
      <div className="stage-tabs">
        {LENSES.map((l) => (
          <div
            key={l.id}
            role="button"
            tabIndex={0}
            onClick={() => setLens(l.id)}
            onKeyDown={buttonKeydown(() => setLens(l.id))}
            aria-current={lens === l.id ? "page" : undefined}
            className={`stage-tab${lens === l.id ? " active" : ""}`}
          >
            {l.label}
          </div>
        ))}
      </div>

      {/* Lens body — a bounded flex column so each lens's .page-body (flex:1;
          overflow-y:auto) becomes the scroll region, matching the planner. */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--parchment)" }}>
        {lens === "book" ? (
          <Arc embedded onOpenPlanner={onOpenPlanner} _fixture={_fixture?.arc} />
        ) : (
          <TopicsView onOpenSermon={onOpenSermon} _fixture={_fixture?.topics} />
        )}
      </div>
    </>
  );
}
