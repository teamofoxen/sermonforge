import { useState } from "react";
import { useEsvPassage } from "../utils/useEsvPassage";
import { usePassageRecovery } from "./EsvRecovery";
import { TextButton } from "./primitives/TextButton";
import IconButton from "./primitives/IconButton";
import { bodyHasSubstance } from "../utils";
import { REGION_NAMED_OUTCOME } from "../utils/walkOrder";
import "./referencePane.css";

// ReferencePane — "a Bible open beside the notepad."
//
// A collapsible panel beside the writing surface. It DEFAULTS to the ESV
// passage in every region (2026-06-10 saturation ruling: the Bible stays in
// front of the pastor unless he minimizes it — it never flips away on its
// own). A "Your work" tab is always one flip away, showing what the current
// work builds against per region:
//
//   Anchor / MPT   → the four Study named outcomes
//                    (Implications Synthesis expanded, rest collapsed)
//   Anchor / MPS   → MPT + Christ-Connection Statement
//                    (the gospel-check's comparison pair)
//   Outline        → MPT + MPS
//   Body           → MPT + MPS + outline + Pastoral Context + CCS
//                    (OEM rulings 1–2: the Application prompt sends the
//                    pastor to "the room you named" and invokes the CCS as
//                    the moralism guard — both must be on screen)
//   Doors (Intro, Transitions, Conclusion)
//                  → MPT + MPS + the assembled body + Pastoral Context + CCS
//                    (the pastor's ruling: the body work exports into the
//                    doors screen as context for all three fields)
//
// The header switch ("Passage / Your work") starts on Passage everywhere and
// resets to Passage on region change; the pastor can flip to his work any
// time. Collapse state persists in localStorage and defaults to OPEN — there
// is no screen-width auto-collapse. When minimized, the writing surface grows
// to reclaim the width and a single legible "Open Bible" tab remains. The
// passage view shares the popup's recovery states + Crossway line — one voice.
//
// This is the architecture the invisible-system spec described ("the
// passage on one side, the question and a place to write on the other");
// it restores the SADI side-by-side pedagogy the deleted SpotlightWorksheet
// used to carry, inside the one-field-at-a-time surface.

const COLLAPSE_KEY = "sf-refpane-collapsed";

function readInitialCollapsed() {
  try {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored != null) return stored === "1";
  } catch { /* default below */ }
  // Default open — the Bible stays visible unless the preacher minimizes it
  // (2026-06-10 ruling). No screen-width auto-collapse.
  return false;
}

// Shared collapsible shell for a "Your work" reference item: a labelled
// section that toggles open/closed and, when it has no content yet, shows the
// "not yet written / go write it" fallback. The three ref items below differ
// only in the body they render when open + populated — they pass it as children.
function RefSection({ label, defaultOpen = true, jump, onJump, hasContent, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="refpane-item">
      <TextButton
        size="sm"
        className="refpane-item-label"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label} {open ? "▾" : "▸"}
      </TextButton>
      {open && (
        hasContent ? children : (
          <div className="refpane-item-empty">
            <span>not yet written</span>
            {jump && onJump && (
              <TextButton size="sm" onClick={() => onJump(jump)}>
                go write it
              </TextButton>
            )}
          </div>
        )
      )}
    </section>
  );
}

// One reference item: a named artifact, its text (or the shared empty state).
function RefItem({ label, text, jump, onJump, defaultOpen = true }) {
  const has = !!(text && String(text).trim());
  return (
    <RefSection label={label} defaultOpen={defaultOpen} jump={jump} onJump={onJump} hasContent={has}>
      <p className="refpane-item-text">{String(text).trim()}</p>
    </RefSection>
  );
}

// The assembled body — every outline point with the prose written under it
// in Body, reading the way the Word export reads (scripture, then the three
// prose cells run together). The doors write against this (OEM ruling: the
// pastor asked for the body as context for intro/transitions/conclusion).
function BodyRefItem({ points, functionalElements, onJump, defaultOpen = true }) {
  const list = (Array.isArray(points) ? points : []).filter(
    (p) => p && String(p.text ?? "").trim()
  );
  const fes = functionalElements || {};
  const jump = { stage: "Manuscript", subPhase: "Body", fieldKey: "equip" };
  return (
    <RefSection
      label={REGION_NAMED_OUTCOME.Body}
      defaultOpen={defaultOpen}
      jump={jump}
      onJump={onJump}
      hasContent={bodyHasSubstance(list, fes)}
    >
      <div className="refpane-body-prose">
        {list.map((p, i) => {
          const fe = fes[p.id] || {};
          const scripture = String(fe.scripture ?? "").trim();
          const prose = ["explanation", "application", "illustration"]
            .map((k) => String(fe[k] ?? "").trim())
            .filter(Boolean);
          return (
            <div key={p.id ?? i} className="refpane-body-point">
              <p className="refpane-item-text"><strong>{`${i + 1}. ${String(p.text).trim()}`}</strong></p>
              {scripture && <p className="refpane-item-text"><em>{scripture}</em></p>}
              {prose.map((t, j) => (
                <p key={j} className="refpane-item-text">{t}</p>
              ))}
            </div>
          );
        })}
      </div>
    </RefSection>
  );
}

function OutlineRefItem({ points, onJump, defaultOpen = true }) {
  const list = (Array.isArray(points) ? points : []).filter(
    (p) => p && String(p.text ?? "").trim()
  );
  // eslint-disable-next-line sermonforge/canonical-stage-name -- canonical sub-phase + column key, not a stage status
  const jump = { stage: "Assembly", subPhase: "Outline", fieldKey: "outline" };
  return (
    <RefSection
      label={REGION_NAMED_OUTCOME.Outline}
      defaultOpen={defaultOpen}
      jump={jump}
      onJump={onJump}
      hasContent={list.length > 0}
    >
      <ol className="refpane-outline">
        {list.map((p, i) => (
          <li key={p.id ?? i}>{String(p.text).trim()}</li>
        ))}
      </ol>
    </RefSection>
  );
}

function PassageView({ passage }) {
  const { data, loading, refresh } = useEsvPassage(passage || "");
  // Shared with the passage-lookup popup and the Study→Anchor handoff — see
  // EsvRecovery.jsx. A hook, so it runs unconditionally, before the
  // !passage early return below.
  const { esvState, fetchErrorNode, recoveryNode, keyModalNode } = usePassageRecovery(data, refresh);

  if (!passage) {
    return (
      <p className="refpane-note">
        This sermon doesn&apos;t have a passage set.
      </p>
    );
  }

  return (
    <>
      {/* The sermon's preaching passage, labeled above its text. */}
      <div className="refpane-passage-ref">{passage}</div>
      {loading && <p className="refpane-note">Fetching ESV…</p>}
      {!loading && data?.fetchError && fetchErrorNode}
      {!loading && !data?.fetchError && (
        esvState === "ok" ? (
          data?.esv ? (
            <>
              <p className="refpane-passage-text">{data.esv}</p>
              <p className="refpane-copyright">
                ESV® Bible © 2001 by Crossway, a publishing ministry of Good
                News Publishers. Used by permission.
              </p>
            </>
          ) : (
            <p className="refpane-note">
              The ESV didn't return anything for this reference — check the
              book name and verse numbers.
            </p>
          )
        ) : recoveryNode
      )}
      {keyModalNode}
    </>
  );
}

export default function ReferencePane({
  stage,
  subPhase,
  fieldKey,
  passage,
  outcomes,
  mpt,
  mps,
  outlinePoints,
  functionalElements,
  pastoralContext,
  onJump,
}) {
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);
  // The Bible is the default companion in every region (2026-06-10 saturation
  // ruling); "Your work" is always one flip away on the header tab. Previously
  // this flipped to "work" the instant the pastor left Study, which is what
  // made the passage feel like it "disappeared" at the forge.
  const defaultMode = "passage";
  const [mode, setMode] = useState(defaultMode);
  const regionKey = `${stage}/${subPhase}`;

  // Auto-follow: the mode resets to the region's default when the pastor
  // crosses a region boundary; a manual flip holds within the region.
  // Adjust-during-render (not an effect): React re-renders before paint,
  // so the old region's mode never flashes for a frame.
  const [prevRegion, setPrevRegion] = useState(regionKey);
  if (prevRegion !== regionKey) {
    setPrevRegion(regionKey);
    setMode(defaultMode);
  }

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* non-fatal */ }
  };

  if (collapsed) {
    return (
      <aside className="sws-refpane is-collapsed">
        <TextButton
          className="refpane-reopen"
          aria-label="Open the Bible panel"
          title="Open the Bible panel"
          onClick={toggleCollapsed}
        >
          <span className="refpane-reopen-label">Open Bible</span>
        </TextButton>
      </aside>
    );
  }

  // Items are keyed by the CURRENT field's context, not just the artifact
  // name — otherwise React reuses a RefItem's open/closed state across
  // regions (a CCS collapsed in one region's list would arrive
  // pre-collapsed in the next, defeating the per-region defaultOpen).
  const ctx = `${regionKey}/${fieldKey}`;
  // Outcomes resolve by stable fieldKey (labels are display copy and may be
  // reworded); the rendered label always comes from the outcome itself.
  const outcomeFor = (outcomeKey) => outcomes?.find((o) => o.fieldKey === outcomeKey) ?? null;
  const itemFromOutcome = (outcomeKey, defaultOpen) => {
    const o = outcomeFor(outcomeKey);
    return o ? (
      <RefItem
        key={`${ctx}:${outcomeKey}`}
        label={o.label}
        text={o.text}
        jump={{ stage: o.stage, subPhase: o.subPhase, fieldKey: o.fieldKey }}
        onJump={onJump}
        defaultOpen={defaultOpen}
      />
    ) : null;
  };
  // The four Study named outcomes — Implications Synthesis open (it's the
  // freshest substrate the MPT forges against), the rest collapsed.
  const studyOutcomeItems = () => [
    itemFromOutcome("obvious_point", false),
    itemFromOutcome("interpretation_synthesis", false),
    itemFromOutcome("christ_connection_statement", false),
    itemFromOutcome("implications_synthesis", true),
  ];
  const mptItem = (
    <RefItem
      key={`${ctx}:mpt`}
      label="MPT — Main Point of the Text"
      text={mpt}
      jump={{ stage: "Assembly", subPhase: "Anchor", fieldKey: "mpt" }}
      onJump={onJump}
    />
  );
  const mpsItem = (
    <RefItem
      key={`${ctx}:mps`}
      label="MPS — Main Point of the Sermon"
      text={mps}
      jump={{ stage: "Assembly", subPhase: "Anchor", fieldKey: "mps" }}
      onJump={onJump}
    />
  );
  const outlineItem = <OutlineRefItem key={`${ctx}:outline-item`} points={outlinePoints} onJump={onJump} />;

  // Pastoral Context — the named room (prodigal AND older brother) + the
  // cost and the gift. Rides in Body + doors per the OEM item-2 ruling.
  const pcItem = (
    <RefItem
      key={`${ctx}:pastoral-context`}
      label="Pastoral Context — your room"
      text={pastoralContext}
      jump={{ stage: "Study", subPhase: "Implications", fieldKey: "pastoral_context" }}
      onJump={onJump}
      defaultOpen={false}
    />
  );
  // The CCS as the standing moralism guard (collapsed — one flip away).
  const ccsGuardItem = itemFromOutcome("christ_connection_statement", false);

  // Per-region work-mode contents — the ratified table.
  let workItems;
  if (stage === "Study") {
    // Study defaults to the passage; this is the manual flip.
    workItems = studyOutcomeItems();
  } else if (subPhase === "Anchor") {
    workItems =
      fieldKey === "mps"
        ? [mptItem, itemFromOutcome("christ_connection_statement", true)]
        : studyOutcomeItems();
  } else if (subPhase === "Body") {
    workItems = [mptItem, mpsItem, outlineItem, pcItem, ccsGuardItem];
  } else if (stage === "Manuscript") {
    // The doors: the assembled body replaces the bare outline (its point
    // titles are the body's headings), the room + guard ride along.
    workItems = [
      mptItem,
      mpsItem,
      <BodyRefItem
        key={`${ctx}:body-item`}
        points={outlinePoints}
        functionalElements={functionalElements}
        onJump={onJump}
      />,
      pcItem,
      ccsGuardItem,
    ];
  } else {
    // Outline.
    workItems = [mptItem, mpsItem];
  }

  return (
    <aside className="sws-refpane" aria-label="Reference pane">
      <div className="refpane-head">
        <div className="refpane-tabs">
          <TextButton
            size="sm"
            className={"refpane-tab" + (mode === "passage" ? " is-active" : "")}
            aria-pressed={mode === "passage"}
            onClick={() => setMode("passage")}
          >
            Passage
          </TextButton>
          <TextButton
            size="sm"
            className={"refpane-tab" + (mode === "work" ? " is-active" : "")}
            aria-pressed={mode === "work"}
            onClick={() => setMode("work")}
          >
            Your work
          </TextButton>
        </div>
        <IconButton
          className="refpane-toggle"
          aria-label="Collapse reference pane"
          title="Collapse reference pane"
          onClick={toggleCollapsed}
        >
          ◂
        </IconButton>
      </div>
      <div className="refpane-body">
        {mode === "passage" ? <PassageView passage={passage} /> : workItems}
      </div>
    </aside>
  );
}
