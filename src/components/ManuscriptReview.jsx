// ManuscriptReview — non-AI structured editorial guides.
//
// ARI Phase 4 reframe of the three Manuscript review tools (Flow Coach,
// Ear Check, Final Tune-Up). The original AI tools walked a worklist FOR
// the pastor. These reframes show the worklist TO the pastor, who walks
// it themselves. The forcing function is the visibility of the prompts;
// the writing surface is the Manuscript Notebook below.

import { getOutline } from "../utils";
import Collapsible from "./primitives/Collapsible";

const BODY_STYLE = {
  padding: "12px 14px 16px",
  borderTop: "1px solid var(--parchment-deep)",
  fontSize: "14px",
  color: "var(--ink-soft)",
};

function FlowCheckBody({ sermon }) {
  const outline = getOutline(sermon);
  return (
    <ol style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.7" }}>
      <li>
        <strong>Introduction</strong> — Does it land on the MPS or set up the first move? Does it earn the listener's attention without overpromising?
      </li>
      {outline.length > 0 && outline.slice(0, -1).map((pt, i) => (
        <li key={pt.id}>
          <strong>Transition: Point {i + 1} → Point {i + 2}</strong> — Does the listener carry the MPS forward across this seam? Is the move generative (point {i + 2} builds on point {i + 1}) or merely sequential?
        </li>
      ))}
      {outline.length === 0 && (
        <li style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>
          (Build the outline in Study → Step 3 to see per-point transitions here.)
        </li>
      )}
      <li>
        <strong>Conclusion</strong> — Does it return to the MPS with weight? Does the response it asks for ground in Christ's work, not just the listener's effort?
      </li>
    </ol>
  );
}

function EarCheckBody() {
  return (
    <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.7" }}>
      <li><strong>Long sentences.</strong> Anything past ~25 words usually loses listeners on the ear. Read aloud; if you run out of breath, cut.</li>
      <li><strong>Abstract nouns where concrete would land.</strong> "Reconciliation" hits harder as "the embrace your father refused you and Christ now gives."</li>
      <li><strong>Jargon the room won't catch.</strong> Theological precision is not the problem. Unintelligibility is.</li>
      <li><strong>Nested clauses.</strong> Subordinate clauses inside subordinate clauses get lost on the ear even when they read clean.</li>
      <li><strong>Words that don't mean to listeners what they mean to you.</strong> Words like "flesh," "world," "spiritual" carry technical meaning you load and the room hears as ordinary English.</li>
      <li><strong>Verbal signposts that overpromise.</strong> "This is the most important point" — is it?</li>
    </ul>
  );
}

function TuneUpBody() {
  const sectionStyle = { marginBottom: "16px" };
  const headingStyle = {
    fontFamily: "var(--font-serif)",
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--ink)",
    marginBottom: "6px",
  };
  const bodyStyle = { margin: 0, paddingLeft: "20px", lineHeight: "1.65", fontSize: "13px" };
  return (
    <div>
      <div style={sectionStyle}>
        <div style={headingStyle}>1. Text → Claim Chain</div>
        <ul style={bodyStyle}>
          <li>Is the MPT accurate to the text — or did it drift while you weren't looking?</li>
          <li>Does the MPS chain cleanly from the MPT, present-tense, aimed at your people?</li>
          <li>Is the text governing the sermon, or has the sermon left the text behind?</li>
        </ul>
      </div>
      <div style={sectionStyle}>
        <div style={headingStyle}>2. Structural Alignment</div>
        <ul style={bodyStyle}>
          <li>Does each outline point derive from the text — or just from your topic?</li>
          <li>Does each point serve the MPS, or is one (or more) doing its own work?</li>
          <li>Is the order generative (each builds on the last) or flat (each could stand alone)?</li>
        </ul>
      </div>
      <div style={sectionStyle}>
        <div style={headingStyle}>3. Functional Balance</div>
        <ul style={bodyStyle}>
          <li>Per point — is Explanation sufficient, or thin / assumed?</li>
          <li>Per point — is Application gospel-rooted, or behavior-driven?</li>
          <li>Per point — is Illustration clarifying, or just decoration?</li>
        </ul>
      </div>
      <div style={sectionStyle}>
        <div style={headingStyle}>4. Redemptive Necessity</div>
        <ul style={bodyStyle}>
          <li>Is Christ structurally necessary to this sermon — or could it work without him?</li>
          <li>Where Christ appears: is he doing the load-bearing work, or assisting an essentially moralistic frame?</li>
        </ul>
      </div>
      <div style={sectionStyle}>
        <div style={headingStyle}>5. Conclusion Coherence</div>
        <ul style={bodyStyle}>
          <li>Does the conclusion land on the response the MPS demands?</li>
          <li>Is the response grounded in Christ's work, or in the listener's effort?</li>
        </ul>
      </div>
    </div>
  );
}

const ITEMS = [
  { key: "flow", label: "Flow Check", Body: FlowCheckBody },
  { key: "ear",  label: "Ear Check",  Body: EarCheckBody  },
  { key: "tune", label: "Final Tune-Up", Body: TuneUpBody },
];

export default function ManuscriptReview({ sermon, openReview, onToggle }) {
  return (
    <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
      {ITEMS.map(({ key, label, Body }) => {
        const open = openReview === key;
        return (
          <Collapsible
            key={key}
            label={label}
            open={open}
            onToggle={() => onToggle(open ? null : key)}
            bodyStyle={BODY_STYLE}
          >
            <Body sermon={sermon} />
          </Collapsible>
        );
      })}
    </div>
  );
}
