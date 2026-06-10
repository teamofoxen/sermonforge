import { useState } from "react";
import { useEsvPassage } from "../utils/useEsvPassage";
import { RECOVERY, PassageRecovery } from "./PassagePopup";
import EsvKeyModal from "./EsvKeyModal";
import { TextButton } from "./primitives/TextButton";
import IconButton from "./primitives/IconButton";
import "./referencePane.css";

// ReferencePane — "a Bible open beside the notepad."
//
// A collapsible panel beside the writing surface showing the thing the
// current work BUILDS AGAINST (per-region table ratified 2026-06-10):
//
//   Study (all regions)  → the ESV passage
//   Anchor / MPT         → the four Study named outcomes
//                          (Implications Synthesis expanded, rest collapsed)
//   Anchor / MPS         → MPT + Christ-Connection Statement
//                          (the gospel-check's comparison pair)
//   Outline              → MPT + MPS
//   Equip                → MPT + MPS + outline points
//   Frame                → MPT + MPS
//   Manuscript           → MPT + MPS + outline (NOT the Study outcomes —
//                          they're already baked into Assembly's outputs)
//
// The header switch ("Passage / Your work") auto-defaults per region and
// resets on region change; the pastor can flip it any time. Collapse state
// persists in localStorage; small screens start collapsed. The passage
// view shares the popup's recovery states + Crossway line — one voice.
//
// This is the architecture the invisible-system spec described ("the
// passage on one side, the question and a place to write on the other");
// it restores the SADI side-by-side pedagogy the deleted SpotlightWorksheet
// used to carry, inside the one-field-at-a-time surface.

const COLLAPSE_KEY = "sf-refpane-collapsed";
const NARROW_PX = 1280;

function readInitialCollapsed() {
  try {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored != null) return stored === "1";
  } catch { /* default below */ }
  return typeof window !== "undefined" && window.innerWidth < NARROW_PX;
}

// One reference item: a named artifact, its text (or "not yet written" +
// a go-write-it jump), optionally collapsed behind its label.
function RefItem({ label, text, jump, onJump, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const has = !!(text && String(text).trim());
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
        has ? (
          <p className="refpane-item-text">{String(text).trim()}</p>
        ) : (
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

function OutlineRefItem({ points, onJump, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const list = (Array.isArray(points) ? points : []).filter(
    (p) => p && String(p.text ?? "").trim()
  );
  // eslint-disable-next-line sermonforge/canonical-stage-name -- canonical sub-phase + column key, not a stage status
  const jump = { stage: "Assembly", subPhase: "Outline", fieldKey: "outline" };
  return (
    <section className="refpane-item">
      <TextButton
        size="sm"
        className="refpane-item-label"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Sermon Outline {open ? "▾" : "▸"}
      </TextButton>
      {open && (
        list.length > 0 ? (
          <ol className="refpane-outline">
            {list.map((p, i) => (
              <li key={p.id ?? i}>{String(p.text).trim()}</li>
            ))}
          </ol>
        ) : (
          <div className="refpane-item-empty">
            <span>not yet written</span>
            {onJump && (
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

function PassageView({ passage }) {
  const { data, loading, refresh } = useEsvPassage(passage || "");
  const [keyModalOpen, setKeyModalOpen] = useState(false);

  if (!passage) {
    return (
      <p className="refpane-note">
        Set a passage in the bar above and the ESV text appears here.
      </p>
    );
  }

  const rawState = data?.esvState
    ?? (data?.esvPending ? "no-key" : data?.esvError ? "error" : "ok");
  const esvState = rawState === "ok" || RECOVERY[rawState] ? rawState : "error";

  return (
    <>
      {loading && <p className="refpane-note">Fetching ESV…</p>}
      {!loading && data?.fetchError && (
        <PassageRecovery
          copy="Something went wrong loading the passage. Try again — if it keeps happening, close and reopen SermonForge."
          actionLabel="Try again"
          onAction={refresh}
        />
      )}
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
        ) : (
          <PassageRecovery
            copy={RECOVERY[esvState].copy}
            actionLabel={RECOVERY[esvState].action}
            onAction={
              RECOVERY[esvState].kind === "key"
                ? () => setKeyModalOpen(true)
                : refresh
            }
          />
        )
      )}
      {keyModalOpen && (
        <EsvKeyModal
          onClose={() => {
            setKeyModalOpen(false);
            refresh();
          }}
        />
      )}
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
  onJump,
}) {
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);
  const defaultMode = stage === "Study" ? "passage" : "work";
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
        <IconButton
          className="refpane-toggle"
          aria-label="Open reference pane"
          title="Open reference pane"
          onClick={toggleCollapsed}
        >
          ▸
        </IconButton>
        <span className="refpane-rail-label" aria-hidden="true">Reference</span>
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
  } else if (subPhase === "Equip" || stage === "Manuscript") {
    workItems = [mptItem, mpsItem, outlineItem];
  } else {
    // Outline + Frame.
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
