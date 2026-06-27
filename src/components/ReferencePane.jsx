import { useState } from "react";
import { BOOKS } from "../data/canonicalBooks";
import { useEsvPassage } from "../utils/useEsvPassage";
import { RECOVERY, PassageRecovery } from "./PassagePopup";
import EsvKeyModal from "./EsvKeyModal";
import { TextButton } from "./primitives/TextButton";
import IconButton from "./primitives/IconButton";
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
//   Equip          → MPT + MPS + outline points
//   Frame          → MPT + MPS
//   Manuscript     → MPT + MPS + outline (NOT the Study outcomes —
//                    they're already baked into Assembly's outputs)
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

// The "surrounding chapters" window: the full chapter BEFORE the passage's
// first chapter through the full chapter AFTER its last — because a literary
// unit often straddles a chapter line (e.g. Ecclesiastes 5:8-6:12 is one unit),
// so opening only its own chapters wouldn't show the seams on either side.
//   "Ecclesiastes 5:8-6:12" → "Ecclesiastes 4-7"
//   "John 3:16-21"          → "John 2-4"
//   "Psalm 23"              → "Psalm 22-24"
// Top end is clamped to the book's last chapter when the book name is
// recognized; an unrecognized / abbreviated name skips the clamp and lets the
// ESV API resolve an over-range top chapter to whatever exists. Returns null
// when the reference can't be parsed.
function surroundingRef(passage) {
  if (!passage) return null;
  const norm = passage.trim().replace(/[–—−]/g, "-");
  const m = norm.match(/^(.+?)\s+(\d.*)$/);
  if (!m) return null;
  const book = m[1].trim();
  const [startPart, endPart] = m[2].split("-").map((s) => s.trim());
  const startChap = parseInt(startPart, 10);
  if (!Number.isInteger(startChap)) return null;
  let endChap = startChap;
  if (endPart) {
    if (endPart.includes(":")) {
      endChap = parseInt(endPart, 10);          // "6:12" → end chapter 6
    } else if (startPart.includes(":")) {
      endChap = startChap;                        // "3:16-21" → after-dash is a verse
    } else {
      endChap = parseInt(endPart, 10);          // "5-6" → end chapter 6
    }
  }
  if (!Number.isInteger(endChap)) endChap = startChap;

  const rec = BOOKS.find((b) => b.name.toLowerCase() === book.toLowerCase());
  const lastChapter = rec ? rec.chapters : Infinity;
  const from = Math.max(1, Math.min(startChap - 1, lastChapter));
  const to = Math.min(endChap + 1, lastChapter);
  if (to <= from) return `${book} ${from}`;
  return `${book} ${from}-${to}`;
}

function PassageView({ passage }) {
  const [showChapter, setShowChapter] = useState(false);
  const windowRef = surroundingRef(passage);
  const surrounding = showChapter && !!windowRef;
  const effectiveRef = surrounding ? windowRef : (passage || "");
  const { data, loading, refresh } = useEsvPassage(effectiveRef, { headings: surrounding });
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
      {windowRef && (
        <TextButton
          size="sm"
          className="refpane-chapter-toggle"
          onClick={() => setShowChapter((v) => !v)}
        >
          {showChapter ? `My passage (${passage})` : "Show surrounding context"}
        </TextButton>
      )}
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
