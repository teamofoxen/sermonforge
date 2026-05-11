// AssemblyTrail — trail rendering for the entire Assembly stage.
//
// One continuous switchback across all four Assembly sub-phases:
//
//   Row 1 (Anchor   →)  MPT field  · MPS field  · Main Point Pair pause
//   Row 2 (Outline  ←)  Outline workshop        · Sermon Outline pause
//   Row 3 (Equip    →)  Equip workshop          · Sermon Body pause
//   Row 4 (Frame    ←)  Intro field · Conclusion field · Sermon Frame pause
//
// Anchor and Frame walk field-by-field with multi-Q clearings (parallel to
// the Exegesis trail). Outline and Equip render as workshop clearings —
// one stop that hosts the existing OutlineBuilder / FE editors inline
// (DW3 / DW4 resolved to workshop-clearing mode). The pause at the end
// of each row displays the sub-phase's named outcome.
//
// Navigation contract with the parent (AssemblyTab):
//   - `advanceSubPhase` is called on the last-Q-of-last-field of Anchor/Frame
//     and on the workshop "I'm done" button of Outline/Equip. It runs the
//     composite gate and sets pausePoint with `nextKey = activeSubPhase+1`
//     for sub-phases 1–3, or `nextKey: "manuscript"` for sub-phase 4.
//   - `jumpToSubPhase(n)` is the spine-routed look-back when the pastor
//     walks back across a sub-phase boundary.
//   - `jumpToStudy()` is the cross-stage look-back from Anchor MPT Q1.

import { memo, useEffect, useMemo, useState } from "react";
import {
  fieldQuestions,
  getQuestionAnswer,
  getQuestionString,
  isQuestionNA,
  parseStructuredField,
} from "../utils/studyFields";
import { MAIN_POINT_PAIR_FIELDS } from "../utils/sadiAnchorFields";
import { SERMON_FRAME_FIELDS } from "../utils/sermonFrameFields";
import { autoResize } from "../utils";
import { SUB_PHASE } from "../core/contracts";
import AdvanceGateChecklist from "./AdvanceGateChecklist";
import PassagePopup from "./PassagePopup";
import ScripturePanel from "./ScripturePanel";
import OutlineBuilder from "./OutlineBuilder";
import {
  SCRIPTURE_COL_WIDTH, padNum,
  firstIncompleteFieldKey, fieldHasAnyAnswer,
  useViewportSize, useSyncActiveQuestion, useTrailKeyboard,
  TrailTopBar, TrailDefs, Station, StageBoundaryPause,
  StageOverview, useStageOverviewSeen,
  NotebookDrawer, useNotebookToggle, useTrailMapToggle,
  TrailLiveRegion,
} from "./studyTrailShared";
import WorkspaceTrailMap from "./WorkspaceTrailMap";
import "./studyTrail.css";

// Stop kinds.
const FIELD = "field";
const WORKSHOP = "workshop";
const PAUSE = "pause";

// Sub-phase metadata. Index = activeSubPhase - 1.
const SUB_PHASES = [
  { idx: 1, key: SUB_PHASE.Anchor,  label: "Anchor",  outcome: "Main Point Pair", fields: MAIN_POINT_PAIR_FIELDS, dir: 1 },
  { idx: 2, key: SUB_PHASE.Outline, label: "Outline", outcome: "Sermon Outline",  workshop: true,                 dir: -1 },
  { idx: 3, key: SUB_PHASE.Equip,   label: "Equip",   outcome: "Sermon Body",     workshop: true,                 dir: 1 },
  { idx: 4, key: SUB_PHASE.Frame,   label: "Frame",   outcome: "Sermon Frame",    fields: SERMON_FRAME_FIELDS,    dir: -1 },
];

function buildStops() {
  const out = [];
  SUB_PHASES.forEach((sp, si) => {
    if (sp.workshop) {
      out.push({ kind: WORKSHOP, subPhase: si });
    } else {
      sp.fields.forEach((f) => {
        out.push({ kind: FIELD, subPhase: si, fieldKey: f.key });
      });
    }
    out.push({ kind: PAUSE, subPhase: si });
  });
  return out;
}

const STOPS = buildStops();

// Switchback geometry — same row gap + bend radius as Exegesis so the
// visual cadence carries across the Study → Assembly boundary.
const ROW_GAP = 360;
const ROW_SPAN = 1700;
const ROW_LEFT = 200;
const BEND_RADIUS = 110;
const ROW_Y0 = 200;

const GEO = (() => {
  const points = STOPS.map(() => ({ x: 0, y: 0 }));
  SUB_PHASES.forEach((sp, si) => {
    const inRow = STOPS.map((s, i) => ({ s, i })).filter(({ s }) => s.subPhase === si);
    const work = inRow.filter(({ s }) => s.kind !== PAUSE);
    const y = ROW_Y0 + si * ROW_GAP;
    const usable = ROW_SPAN - BEND_RADIUS * 1.2;

    work.forEach(({ i }, k) => {
      const t = work.length === 1 ? 0.3 : k / (work.length - 1) * 0.62;
      const xLocal = t * usable;
      const x = sp.dir === 1 ? ROW_LEFT + xLocal : ROW_LEFT + ROW_SPAN - xLocal;
      points[i] = { x, y };
    });

    const pauseEntry = inRow.find(({ s }) => s.kind === PAUSE);
    if (pauseEntry) {
      const lastWork = work[work.length - 1];
      const lastP = points[lastWork.i];
      const farX = sp.dir === 1 ? ROW_LEFT + ROW_SPAN : ROW_LEFT;
      points[pauseEntry.i] = {
        x: lastP.x + (farX - lastP.x) * 0.78,
        y: y + (si < SUB_PHASES.length - 1 ? ROW_GAP * 0.42 : 0),
      };
    }
  });
  return { points };
})();

function buildPathToIndex(uptoIdx) {
  if (uptoIdx < 0) return "";
  const pts = GEO.points.slice(0, uptoIdx + 1);
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (Math.abs(a.y - b.y) < 1) {
      d += ` L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    } else {
      const c1x = a.x + (b.x > a.x ? BEND_RADIUS : -BEND_RADIUS);
      const c2x = b.x + (a.x > b.x ? BEND_RADIUS : -BEND_RADIUS);
      d += ` C ${c1x.toFixed(1)} ${a.y.toFixed(1)}, ${c2x.toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
  }
  return d;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AssemblyTrail({
  sermon,
  activeSubPhase,
  mppData,
  updateMPP,
  toggleMPPNa,
  frameData,
  updateFrame,
  toggleFrameNA,
  outline,
  funcData,
  onOutlineChange,
  onOutlineRemove,
  onOutlineTextChange,
  onFuncDataChange,
  pausePoint,
  setPausePoint,
  subPhaseSufficiency,
  advanceSubPhase,
  jumpToSubPhase,
  jumpToStudy,
  onUpdate,
  onExit,
  initialNotebookOpen,
  bypassStageOverview,
  seriesTitle, seriesPosition, seriesTotal, onOpenPrev, onOpenNext,
}) {
  const viewport = useViewportSize();
  const [maxVisitedStop, setMaxVisitedStop] = useState(0);
  const [passageOpen, setPassageOpen] = useState(false);
  const [dismissedOverviews, setDismissedOverviews] = useState(() => new Set());
  const [stageOverviewSeen, markStageOverviewSeen] = useStageOverviewSeen("assembly");
  const notebook = useNotebookToggle({ initialOpen: !!initialNotebookOpen });
  const map = useTrailMapToggle();

  // Active field within the current sub-phase. For Anchor + Frame, this is
  // the MPT/MPS or Intro/Conclusion key. Workshop sub-phases don't use it.
  const [activeFieldKey, setActiveFieldKey] = useState(() => {
    const sp = SUB_PHASES[activeSubPhase - 1];
    if (!sp || sp.workshop) return null;
    const dataForSP = sp.key === SUB_PHASE.Anchor ? mppData : frameData;
    return firstIncompleteFieldKey(sp.fields, dataForSP);
  });
  const [activeQKey, setActiveQKey] = useState(null);

  // Reset activeFieldKey when sub-phase changes.
  useEffect(() => {
    const sp = SUB_PHASES[activeSubPhase - 1];
    if (!sp || sp.workshop) {
      setActiveFieldKey(null);
      setActiveQKey(null);
      return;
    }
    const dataForSP = sp.key === SUB_PHASE.Anchor ? mppData : frameData;
    setActiveFieldKey(firstIncompleteFieldKey(sp.fields, dataForSP));
    setActiveQKey(null);
    // mpp/frame data deliberately omitted — we only want to re-seed on
    // sub-phase change, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubPhase]);

  // Stop index — pause stop when pausePoint flags this sub-phase's
  // boundary; otherwise the current work stop within the active sub-phase.
  // Frame's sub-phase pause doubles as the Assembly → Manuscript
  // step-boundary pause: AssemblyTab sets nextKey="manuscript" there, but
  // the same Sermon Frame card renders and dismiss routes through the
  // setPausePoint wrapper to flip the tab.
  const stopIdx = useMemo(() => {
    const spIdx = activeSubPhase - 1;
    if (pausePoint && pausePoint.priorSubPhase === activeSubPhase) {
      const idx = STOPS.findIndex((s) => s.subPhase === spIdx && s.kind === PAUSE);
      if (idx >= 0) return idx;
    }
    const sp = SUB_PHASES[spIdx];
    if (sp.workshop) {
      return STOPS.findIndex((s) => s.subPhase === spIdx && s.kind === WORKSHOP);
    }
    const fieldStopIdx = STOPS.findIndex(
      (s) => s.subPhase === spIdx && s.kind === FIELD && s.fieldKey === activeFieldKey,
    );
    if (fieldStopIdx >= 0) return fieldStopIdx;
    return STOPS.findIndex((s) => s.subPhase === spIdx);
  }, [activeSubPhase, activeFieldKey, pausePoint]);

  const stop = STOPS[stopIdx];
  const subPhaseMeta = SUB_PHASES[stop.subPhase];
  const active = GEO.points[stopIdx];

  const trailAreaW = Math.max(viewport.w - SCRIPTURE_COL_WIDTH, 720);
  const tx = trailAreaW / 2 - active.x;
  const ty = viewport.h * 0.58 - active.y;

  useSyncActiveQuestion(
    stop,
    activeQKey,
    setActiveQKey,
    () => {
      if (stop.kind !== FIELD) return null;
      const sp = SUB_PHASES[stop.subPhase];
      return sp.fields.find((f) => f.key === stop.fieldKey) || null;
    },
    () => {
      const sp = SUB_PHASES[stop.subPhase];
      return sp.key === SUB_PHASE.Anchor ? mppData : frameData;
    },
  );

  useEffect(() => {
    if (stopIdx > maxVisitedStop) setMaxVisitedStop(stopIdx);
  }, [stopIdx, maxVisitedStop]);

  const dismissOverview = (fieldKey) =>
    setDismissedOverviews((prev) => {
      if (prev.has(fieldKey)) return prev;
      const next = new Set(prev);
      next.add(fieldKey);
      return next;
    });

  // ── Navigation ─────────────────────────────────────────────────────────

  const advance = () => {
    if (stop.kind === PAUSE) {
      // Dismissing the pause: clear locally. AssemblyTab has already
      // bumped activeSubPhase forward, so the trail re-derives its
      // active row from the next sub-phase.
      setPausePoint(null);
      return;
    }
    if (stop.kind === WORKSHOP) {
      // "I'm done" — run the sub-phase composite gate via the parent.
      advanceSubPhase();
      return;
    }
    // Field clearing: within-Q → cross-field → cross-sub-phase.
    const sp = SUB_PHASES[stop.subPhase];
    const dataForSP = sp.key === SUB_PHASE.Anchor ? mppData : frameData;
    const field = sp.fields.find((f) => f.key === stop.fieldKey);
    const qs = fieldQuestions(field);
    const qIdx = qs.findIndex((q) => q.key === activeQKey);
    if (qIdx >= 0 && qIdx < qs.length - 1) {
      setActiveQKey(qs[qIdx + 1].key);
      return;
    }
    const fIdx = sp.fields.findIndex((f) => f.key === stop.fieldKey);
    if (fIdx < sp.fields.length - 1) {
      setActiveFieldKey(sp.fields[fIdx + 1].key);
      setActiveQKey(null);
      return;
    }
    advanceSubPhase();
  };

  const lookBack = async () => {
    if (stop.kind === PAUSE) {
      // Pause look-back: route through the spine back to the prior
      // sub-phase, clear pause, restore the last field's last Q.
      await jumpToSubPhase(stop.subPhase + 1);
      setPausePoint(null);
      const sp = SUB_PHASES[stop.subPhase];
      if (sp.workshop) return;
      const last = sp.fields[sp.fields.length - 1];
      setActiveFieldKey(last.key);
      const qs = fieldQuestions(last);
      setActiveQKey(qs[qs.length - 1].key);
      return;
    }
    if (stop.kind === WORKSHOP) {
      // Workshop look-back: route to prior sub-phase. AssemblyTab handles
      // restoring its trail position.
      if (stop.subPhase === 0) {
        await jumpToStudy?.();
        return;
      }
      await jumpToSubPhase(stop.subPhase);
      return;
    }
    // Field clearing: within-Q → cross-field → cross-sub-phase or cross-stage.
    const sp = SUB_PHASES[stop.subPhase];
    const field = sp.fields.find((f) => f.key === stop.fieldKey);
    const qs = fieldQuestions(field);
    const qIdx = qs.findIndex((q) => q.key === activeQKey);
    if (qIdx > 0) {
      setActiveQKey(qs[qIdx - 1].key);
      return;
    }
    const fIdx = sp.fields.findIndex((f) => f.key === stop.fieldKey);
    if (fIdx > 0) {
      const prior = sp.fields[fIdx - 1];
      setActiveFieldKey(prior.key);
      const priorQs = fieldQuestions(prior);
      setActiveQKey(priorQs[priorQs.length - 1].key);
      return;
    }
    // First Q of first field of this sub-phase.
    if (stop.subPhase === 0) {
      await jumpToStudy?.();
      return;
    }
    await jumpToSubPhase(stop.subPhase);
  };

  // Advance-disabled gate. Fires the sub-phase composite at the last-Q of
  // last-field (Anchor / Frame) or at the workshop "I'm done" button
  // (Outline / Equip).
  const subPhaseGateFires = (() => {
    if (stop.kind === WORKSHOP) return true;
    if (stop.kind !== FIELD) return false;
    const sp = SUB_PHASES[stop.subPhase];
    if (sp.fields[sp.fields.length - 1].key !== stop.fieldKey) return false;
    const field = sp.fields.find((f) => f.key === stop.fieldKey);
    const qs = fieldQuestions(field);
    return qs[qs.length - 1].key === activeQKey;
  })();
  const advanceDisabled = subPhaseGateFires && !subPhaseSufficiency.ok;

  // Cmd/Ctrl+. → N/A toggle, allowlisted to MPS gospel_check (Anchor) and
  // Intro redemptive_note (Frame). Every other field/Q ignores the chord.
  const onTogglePass = () => {
    if (stop.kind !== FIELD) return;
    const sp = SUB_PHASES[stop.subPhase];
    if (sp.key === SUB_PHASE.Anchor && stop.fieldKey === "mps" && activeQKey === "gospel_check") {
      toggleMPPNa?.(stop.fieldKey, activeQKey);
    } else if (sp.key === SUB_PHASE.Frame && stop.fieldKey === "intro" && activeQKey === "redemptive_note") {
      toggleFrameNA?.(stop.fieldKey, activeQKey);
    }
  };
  // modalOpen gates the trail's Esc handler so a stray Esc can't exit the
  // trail while a drawer or modal is open. Any of: passage popup,
  // notebook drawer, or trail map count as "modal open."
  useTrailKeyboard({
    advance, lookBack, advanceDisabled, onExit, onTogglePass,
    modalOpen: passageOpen || notebook.open || map.open,
  });

  // First-arrival overview for heavy-lifting Anchor/Frame fields.
  const showOverview = (() => {
    if (stop.kind !== FIELD) return false;
    const sp = SUB_PHASES[stop.subPhase];
    const dataForSP = sp.key === SUB_PHASE.Anchor ? mppData : frameData;
    const field = sp.fields.find((f) => f.key === stop.fieldKey);
    if (!field?.overview) return false;
    if (dismissedOverviews.has(field.key)) return false;
    return !fieldHasAnyAnswer(field, dataForSP);
  })();

  const clearing = (() => {
    if (showOverview) {
      return (
        <OverviewClearing
          subPhaseMeta={subPhaseMeta}
          field={subPhaseMeta.fields.find((f) => f.key === stop.fieldKey)}
          onContinue={() => dismissOverview(stop.fieldKey)}
          onLookBack={lookBack}
        />
      );
    }
    if (stop.kind === FIELD) {
      return (
        <FieldClearing
          stop={stop}
          subPhaseMeta={subPhaseMeta}
          mppData={mppData} updateMPP={updateMPP} toggleMPPNa={toggleMPPNa}
          frameData={frameData} updateFrame={updateFrame} toggleFrameNA={toggleFrameNA}
          advance={advance} lookBack={lookBack}
          advanceDisabled={advanceDisabled}
          subPhaseSufficiency={subPhaseSufficiency}
          sermon={sermon} activeQKey={activeQKey}
        />
      );
    }
    if (stop.kind === WORKSHOP) {
      return (
        <WorkshopClearing
          subPhaseMeta={subPhaseMeta} sermon={sermon}
          outline={outline} funcData={funcData}
          onOutlineChange={onOutlineChange}
          onOutlineRemove={onOutlineRemove}
          onOutlineTextChange={onOutlineTextChange}
          onFuncDataChange={onFuncDataChange}
          advance={advance} lookBack={lookBack}
          advanceDisabled={advanceDisabled}
          subPhaseSufficiency={subPhaseSufficiency}
        />
      );
    }
    return (
      <PauseClearing
        subPhaseMeta={subPhaseMeta}
        mppData={mppData} updateMPP={updateMPP}
        frameData={frameData} updateFrame={updateFrame}
        outline={outline} funcData={funcData}
        advance={advance} lookBack={lookBack}
      />
    );
  })();

  // Stage overview (DW12) — short-circuit the trail body on the first
  // mount of Assembly in a session so the pastor reads the framing before
  // walking the trail. `useStageOverviewSeen` persists in sessionStorage,
  // so reloads stay quiet but a fresh app boot re-fires the framing.
  // Exception: when the pastor arrived via a search-result click,
  // skip the overview — they came for the specific match.
  if (!stageOverviewSeen && !bypassStageOverview) {
    const readSynth = (col) => {
      try {
        const data = parseStructuredField(sermon?.[col]);
        const v = getQuestionAnswer(data, "_synthesis");
        return typeof v === "string" ? v : "";
      } catch { return ""; }
    };
    const carriedForward = [
      { label: "OBSERVATION SET",            text: readSynth("observations")     || "(not yet written)" },
      { label: "INTERPRETATION SET",         text: readSynth("interpretation")   || "(not yet written)" },
      { label: "CHRIST-CONNECTION STATEMENT",text: readSynth("redemptive_thread")|| "(not yet written)" },
      { label: "IMPLICATIONS SYNTHESIS",     text: readSynth("implications")     || "(not yet written)" },
    ];
    return (
      <div className="tw-shell">
        <TrailTopBar
          sermon={sermon}
          onExit={onExit}
          onPassageClick={() => setPassageOpen(true)}
          seriesTitle={seriesTitle}
          seriesPosition={seriesPosition}
          seriesTotal={seriesTotal}
          onOpenPrev={onOpenPrev}
          onOpenNext={onOpenNext}
        />
        <PassagePopup passage={sermon?.passage} isOpen={passageOpen} onClose={() => setPassageOpen(false)} />
        <aside className="tw-scripture">
          <ScripturePanel passage={sermon?.passage} />
        </aside>
        <StageOverview
          eyebrow="ENTERING ASSEMBLY"
          title="Assembly — where the sermon takes shape."
          body="Four sub-phases. The Anchor forges the Main Point Pair from the four syntheses you've already produced; the Outline lays the body; Equip fills each point with Scripture, explanation, application, and illustration; the Frame writes the Intro and Conclusion. Walk one bend at a time."
          outcomes={[
            { label: "MAIN POINT PAIR", text: "Past-tense MPT + present-tense MPS — the spine the body hangs on." },
            { label: "SERMON OUTLINE",  text: "The points that move the listener toward the MPS." },
            { label: "SERMON BODY",     text: "Each point equipped with Scripture / Explanation / Application / Illustration." },
            { label: "SERMON FRAME",    text: "The Intro that opens, the Conclusion that lands." },
          ]}
          carriedForward={carriedForward}
          continueLabel="Walk into Assembly"
          onContinue={markStageOverviewSeen}
        />
      </div>
    );
  }

  // Live-region announcement of the pastor's position. Computed from
  // current stop, sub-phase, field, and question so screen readers can
  // hear "Assembly · Anchor, MPT, question 1 of 2" as the trail advances.
  const liveText = (() => {
    const base = `Assembly · ${subPhaseMeta.label}`;
    if (stop.kind === PAUSE) return `${base} · pause point — ${subPhaseMeta.outcome}`;
    if (stop.kind === WORKSHOP) return `${base} · workshop — ${subPhaseMeta.outcome}`;
    if (stop.kind === FIELD) {
      const fIdx = subPhaseMeta.fields.findIndex((f) => f.key === stop.fieldKey);
      const fLabel = subPhaseMeta.fields[fIdx]?.label || "";
      const field = subPhaseMeta.fields[fIdx];
      const qs = field ? fieldQuestions(field) : [];
      const qIdx = qs.findIndex((q) => q.key === activeQKey);
      const qPart = qs.length > 1 && qIdx >= 0 ? `, question ${qIdx + 1} of ${qs.length}` : "";
      return `${base} · ${fLabel} (field ${fIdx + 1} of ${subPhaseMeta.fields.length})${qPart}`;
    }
    return base;
  })();

  return (
    <div className="tw-shell">
      <TrailLiveRegion text={liveText} />
      <TrailTopBar
        sermon={sermon}
        onExit={onExit}
        onPassageClick={() => setPassageOpen(true)}
        onToggleNotebook={onUpdate ? notebook.toggle : undefined}
        notebookOpen={notebook.open}
        onOpenMap={map.openMap}
        seriesTitle={seriesTitle}
        seriesPosition={seriesPosition}
        seriesTotal={seriesTotal}
        onOpenPrev={onOpenPrev}
        onOpenNext={onOpenNext}
      />
      <PassagePopup passage={sermon?.passage} isOpen={passageOpen} onClose={() => setPassageOpen(false)} />
      <aside className="tw-scripture">
        <ScripturePanel passage={sermon?.passage} />
      </aside>
      <TrailCanvas tx={tx} ty={ty} stopIdx={stopIdx} maxVisitedStop={maxVisitedStop} viewport={viewport} />
      <SubPhaseRibbon stop={stop} subPhaseMeta={subPhaseMeta} activeQKey={activeQKey} />
      <div data-tour-id={
        subPhaseMeta.key === SUB_PHASE.Anchor  ? "mpt-field" :
        subPhaseMeta.key === SUB_PHASE.Outline ? "outline-builder" :
        subPhaseMeta.key === SUB_PHASE.Equip   ? "functional-elements" :
        subPhaseMeta.key === SUB_PHASE.Frame   ? "frame-worksheet" :
        undefined
      }>
        {clearing}
      </div>
      {onUpdate && (
        <NotebookDrawer
          open={notebook.open}
          onClose={notebook.close}
          label="Assembly Notebook"
          value={sermon?.notebook_blueprint || ""}
          onChange={(value) => onUpdate({ notebook_blueprint: value })}
          placeholder="Free-form notes for your assembly thinking — alternate orderings, points to test, things to revisit."
        />
      )}
      {map.open && <WorkspaceTrailMap sermon={sermon} onClose={map.close} />}
    </div>
  );
}

// ── Ribbon ────────────────────────────────────────────────────────────────

function SubPhaseRibbon({ stop, subPhaseMeta, activeQKey }) {
  let positionLabel;
  if (stop.kind === FIELD) {
    const fIdx = subPhaseMeta.fields.findIndex((f) => f.key === stop.fieldKey);
    const field = subPhaseMeta.fields[fIdx];
    const qs = field ? fieldQuestions(field) : [];
    const qIdx = qs.findIndex((q) => q.key === activeQKey);
    positionLabel =
      qs.length > 1 && qIdx >= 0
        ? `FIELD ${padNum(fIdx + 1)} OF ${padNum(subPhaseMeta.fields.length)} · Q ${padNum(qIdx + 1)} OF ${padNum(qs.length)}`
        : `FIELD ${padNum(fIdx + 1)} OF ${padNum(subPhaseMeta.fields.length)}`;
  } else if (stop.kind === WORKSHOP) {
    positionLabel = "WORKSHOP";
  } else {
    positionLabel = "PAUSE POINT";
  }
  return (
    <div className="tw-ribbon">
      <span className="tw-mono tw-ribbon-phase">
        ASSEMBLY · {subPhaseMeta.label.toUpperCase()}
      </span>
      <span className="tw-ribbon-question">{RIBBON_PROMPTS[subPhaseMeta.key]}</span>
      <span className="tw-mono tw-ribbon-pos">{positionLabel}</span>
    </div>
  );
}

const RIBBON_PROMPTS = {
  [SUB_PHASE.Anchor]:  "Anchor what the text said — then turn it toward your people.",
  [SUB_PHASE.Outline]: "Lay the body of the sermon — the points that carry the MPS.",
  [SUB_PHASE.Equip]:   "Equip each point with what makes it land — Scripture, explanation, application, illustration.",
  [SUB_PHASE.Frame]:   "Frame the listener's entry and exit — Intro and Conclusion.",
};

// ── Trail SVG ─────────────────────────────────────────────────────────────

// Memo'd because the canvas only changes on stopIdx / maxVisitedStop /
// viewport / camera-tx-ty. Parent re-renders driven by typing keystrokes
// (autosave) shouldn't rebuild the SVG every time.
const TrailCanvas = memo(function TrailCanvas({ tx, ty, stopIdx, maxVisitedStop, viewport }) {
  const horizon = Math.max(stopIdx, maxVisitedStop);
  const pathD = buildPathToIndex(horizon);
  return (
    <svg
      className="tw-trail"
      viewBox={`0 0 ${viewport.w} ${viewport.h}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <TrailDefs />
      <rect x="0" y="0" width={viewport.w} height={viewport.h} fill="url(#paperGrain)" />
      <g className="tw-camera" style={{ transform: `translate(${tx}px, ${ty}px)` }}>
        {pathD && (
          <>
            <path d={pathD} className="tw-trail-line tw-trail-line-shadow" />
            <path d={pathD} className="tw-trail-line" />
          </>
        )}
        {STOPS.map((s, i) => {
          if (i > horizon) return null;
          const p = GEO.points[i];
          const isActive = i === stopIdx;
          const isPause = s.kind === PAUSE;
          const sp = SUB_PHASES[s.subPhase];
          let ordinal = null;
          if (s.kind === FIELD) {
            ordinal = sp.fields.findIndex((f) => f.key === s.fieldKey) + 1;
          }
          return (
            <Station
              key={i}
              point={p}
              isActive={isActive}
              isPause={isPause}
              ordinal={ordinal}
              distance={Math.abs(stopIdx - i)}
            />
          );
        })}
      </g>
      <rect
        x="0"
        y="0"
        width={viewport.w}
        height={viewport.h}
        fill="url(#clearingMist)"
        pointerEvents="none"
      />
    </svg>
  );
});

// ── Field clearing (Anchor MPT/MPS, Frame Intro/Conclusion) ──────────────

function FieldClearing({
  stop,
  subPhaseMeta,
  mppData, updateMPP, toggleMPPNa,
  frameData, updateFrame, toggleFrameNA,
  advance, lookBack, advanceDisabled, subPhaseSufficiency,
  sermon, activeQKey,
}) {
  const isAnchor = subPhaseMeta.key === SUB_PHASE.Anchor;
  const data = isAnchor ? mppData : frameData;
  const updater = isAnchor ? updateMPP : updateFrame;
  const naToggler = isAnchor ? toggleMPPNa : toggleFrameNA;

  const field = subPhaseMeta.fields.find((f) => f.key === stop.fieldKey);
  if (!field) return null;
  const fieldIdx = subPhaseMeta.fields.findIndex((f) => f.key === stop.fieldKey);
  const questions = fieldQuestions(field);
  const activeQuestion = questions.find((q) => q.key === activeQKey) || questions[0];
  const qIdx = questions.findIndex((q) => q.key === activeQuestion?.key);
  const isMultiQ = questions.length > 1;
  const promptText = activeQuestion?.prompt || field.hint || "";
  const activeQNA = activeQuestion
    ? isQuestionNA(data, field.key, activeQuestion.key)
    : false;

  // N/A allowlist: MPS gospel_check (Anchor) and Intro redemptive_note (Frame).
  const showNALink =
    (isAnchor && field.key === "mps" && activeQuestion?.key === "gospel_check") ||
    (!isAnchor && field.key === "intro" && activeQuestion?.key === "redemptive_note");

  return (
    <div className="tw-clearing" key={`assembly:${subPhaseMeta.key}:${field.key}`}>
      <div className="tw-clearing-eyebrow">
        <span className="tw-mono">ASSEMBLY · {subPhaseMeta.label.toUpperCase()}</span>
        <span className="tw-clearing-eyebrow-sep">/</span>
        <span className="tw-mono">
          FIELD {padNum(fieldIdx + 1)} OF {padNum(subPhaseMeta.fields.length)}
        </span>
        {isMultiQ && qIdx >= 0 && (
          <>
            <span className="tw-clearing-eyebrow-sep">·</span>
            <span className="tw-mono">Q {padNum(qIdx + 1)} OF {padNum(questions.length)}</span>
          </>
        )}
      </div>
      <h2 className="tw-clearing-title">{field.label}</h2>
      {promptText && <p className="tw-clearing-prompt">{promptText}</p>}

      <div className="tw-clearing-body">
        {activeQNA ? (
          <div className="tw-inputs">
            <div className="tw-question tw-question-na">
              <p className="tw-question-na-message">Marked not applicable for this passage.</p>
              <p className="tw-question-na-sub">
                The trail walks past this one — the gospel anchor is satisfied another way.
              </p>
            </div>
          </div>
        ) : (
          <div className="tw-inputs">
            <TrailQuestionInput
              field={field}
              question={activeQuestion}
              data={data}
              updater={updater}
              passage={sermon?.passage}
            />
          </div>
        )}
      </div>

      <div className="tw-clearing-actions">
        <div className="tw-clearing-actions-left">
          {/* eslint-disable-next-line sermonforge/no-raw-button */}
          <button className="tw-link-back" onClick={lookBack}>← look back</button>
          {showNALink && naToggler && (
            /* eslint-disable-next-line sermonforge/no-raw-button */
            <button
              className="tw-link-na"
              onClick={() => naToggler(field.key, activeQuestion.key)}
              title={activeQNA ? "Restore this question (Cmd/Ctrl+.)" : "Mark not applicable (Cmd/Ctrl+.)"}
            >
              {activeQNA ? "↺ restore this question" : "mark not applicable"}
            </button>
          )}
        </div>
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button
          className="tw-advance"
          onClick={advance}
          disabled={advanceDisabled}
          title={advanceDisabled ? subPhaseSufficiency?.reason || "" : ""}
        >
          <span>Continue</span>
          <span className="tw-advance-arrow">→</span>
        </button>
      </div>
      {advanceDisabled && (
        <div className="tw-clearing-gate">
          <AdvanceGateChecklist sufficiency={subPhaseSufficiency} />
        </div>
      )}
    </div>
  );
}

function TrailQuestionInput({ field, question, data, updater, passage }) {
  const rawValue = getQuestionAnswer(data, field.key, question.key);
  const value = typeof rawValue === "string" ? rawValue : "";
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="tw-question tw-question-first">
      <textarea
        className="tw-question-textarea"
        value={value}
        onChange={(e) => updater(field.key, question.key, e.target.value)}
        onInput={(e) => autoResize(e.target)}
        ref={(el) => autoResize(el)}
        placeholder="Begin where the text begins…"
        spellCheck={false}
      />
      <div className="tw-clearing-meter">
        <span className="tw-mono">
          {wordCount > 0
            ? `${wordCount} ${wordCount === 1 ? "word" : "words"}`
            : "awaiting your hand"}
        </span>
        {passage && (
          <span className="tw-mono tw-clearing-passage">{String(passage).toUpperCase()}</span>
        )}
      </div>
    </div>
  );
}

// ── Workshop clearing (Outline + Equip) ───────────────────────────────────

function WorkshopClearing({
  subPhaseMeta,
  sermon,
  outline,
  funcData,
  onOutlineChange,
  onOutlineRemove,
  onOutlineTextChange,
  onFuncDataChange,
  advance,
  lookBack,
  advanceDisabled,
  subPhaseSufficiency,
}) {
  const isOutline = subPhaseMeta.key === SUB_PHASE.Outline;
  const advanceLabel = isOutline ? "Continue to Equip" : "Continue to Frame";
  return (
    <div className="tw-clearing tw-clearing-workshop" key={`workshop:${subPhaseMeta.key}`}>
      <div className="tw-clearing-eyebrow">
        <span className="tw-mono">ASSEMBLY · {subPhaseMeta.label.toUpperCase()}</span>
        <span className="tw-clearing-eyebrow-sep">·</span>
        <span className="tw-mono">WORKSHOP</span>
      </div>
      <h2 className="tw-clearing-title">{subPhaseMeta.outcome}</h2>
      <p className="tw-clearing-prompt">
        {isOutline
          ? "Build the body of the sermon. Each point should serve the MPS — the line the body draws toward the call."
          : "Equip each outline point. Scripture grounds it; explanation walks the listener through it; application makes it concrete; illustration helps it land."}
      </p>

      {(sermon.passage || sermon.mpt || sermon.mps) && (
        <div className="tw-workshop-reference">
          {sermon.passage && <div className="tw-workshop-passage tw-mono">{String(sermon.passage).toUpperCase()}</div>}
          {sermon.mpt && (
            <div className="tw-workshop-line">
              <span className="tw-workshop-line-label tw-mono">MPT</span>
              <span>{sermon.mpt}</span>
            </div>
          )}
          {sermon.mps && (
            <div className="tw-workshop-line">
              <span className="tw-workshop-line-label tw-mono">MPS</span>
              <em>{sermon.mps}</em>
            </div>
          )}
        </div>
      )}

      <div className="tw-workshop-body">
        {isOutline ? (
          <OutlineBuilder
            outline={outline}
            onUpdate={onOutlineChange}
            onRemove={onOutlineRemove}
          />
        ) : (
          <EquipBody
            outline={outline}
            funcData={funcData}
            onOutlineTextChange={onOutlineTextChange}
            onFuncDataChange={onFuncDataChange}
          />
        )}
      </div>

      <div className="tw-clearing-actions">
        <div className="tw-clearing-actions-left">
          {/* eslint-disable-next-line sermonforge/no-raw-button */}
          <button className="tw-link-back" onClick={lookBack}>← look back</button>
        </div>
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button
          className="tw-advance"
          onClick={advance}
          disabled={advanceDisabled}
          title={advanceDisabled ? subPhaseSufficiency?.reason || "" : ""}
        >
          <span>{advanceLabel}</span>
          <span className="tw-advance-arrow">→</span>
        </button>
      </div>
      {advanceDisabled && (
        <div className="tw-clearing-gate">
          <AdvanceGateChecklist sufficiency={subPhaseSufficiency} />
        </div>
      )}
    </div>
  );
}

function EquipBody({ outline, funcData, onOutlineTextChange, onFuncDataChange }) {
  if (outline.length === 0) {
    return (
      <div className="tw-workshop-empty">
        No outline points yet. Walk back to Outline and add them first.
      </div>
    );
  }
  return (
    <div className="tw-equip-stack">
      {outline.map((pt, i) => (
        <EquipPoint
          key={pt.id}
          pointId={pt.id}
          pointText={pt.text}
          displayIndex={i}
          fe={funcData[pt.id] || { explanation: "", application: "", illustration: "", scripture: "" }}
          onTextChange={onOutlineTextChange}
          onFEChange={onFuncDataChange}
        />
      ))}
    </div>
  );
}

function EquipPoint({ pointId, pointText, displayIndex, fe, onTextChange, onFEChange }) {
  const [open, setOpen] = useState(() => !!(fe.explanation || fe.application || fe.illustration || fe.scripture));
  const update = (k, v) => onFEChange(pointId, { ...fe, [k]: v });
  const bodyId = `tw-equip-body-${pointId}`;
  return (
    <div className="tw-equip-point">
      <div className="tw-equip-point-header">
        <span className="tw-equip-point-num tw-mono">{displayIndex + 1}</span>
        <input
          className="tw-equip-point-title"
          value={pointText || ""}
          onChange={(e) => onTextChange?.(pointId, e.target.value)}
          placeholder={`Point ${displayIndex + 1}`}
        />
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button
          type="button"
          className={`tw-equip-point-toggle ${open ? "is-open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? `Collapse point ${displayIndex + 1}` : `Expand point ${displayIndex + 1}`}
          title={open ? "Collapse" : "Expand"}
        >
          <span className="tw-equip-point-chevron">›</span>
        </button>
      </div>
      {!open && fe.explanation && (
        <div className="tw-equip-point-preview">
          {fe.explanation.length > 110 ? fe.explanation.slice(0, 110) + "…" : fe.explanation}
        </div>
      )}
      {open && (
        <div className="tw-equip-point-body" id={bodyId}>
          <EquipField label="Scripture" badge="ESV" badgeClass="badge-scripture"
            value={fe.scripture}
            onChange={(v) => update("scripture", v)}
            placeholder="Paste the passage text for this point (ESV)."
            italic
          />
          <EquipField label="Explanation" badge="E" badgeClass="badge-explanation"
            value={fe.explanation}
            onChange={(v) => update("explanation", v)}
            placeholder="How does this point emerge from the text? Ground it exegetically."
          />
          <EquipField label="Application" badge="A" badgeClass="badge-application"
            value={fe.application}
            onChange={(v) => update("application", v)}
            placeholder="What does this point ask of the congregation? Make it specific."
          />
          <EquipField label="Illustration" badge="I" badgeClass="badge-illustration"
            value={fe.illustration}
            onChange={(v) => update("illustration", v)}
            placeholder="What story, image, or example makes this point land?"
          />
        </div>
      )}
    </div>
  );
}

function EquipField({ label, badge, badgeClass, value, onChange, placeholder, italic }) {
  return (
    <div className="tw-equip-field">
      <div className="tw-equip-field-label">
        <span>{label}</span>
        <span className={`tw-equip-field-badge tw-mono ${badgeClass}`}>{badge}</span>
      </div>
      <textarea
        className="tw-equip-field-input"
        style={italic ? { fontStyle: "italic", fontFamily: "var(--font-serif)", fontSize: "15px" } : undefined}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onInput={(e) => autoResize(e.target)}
        ref={(el) => autoResize(el)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── Overview clearing (heavy-lifting field first-arrival) ────────────────

function OverviewClearing({ subPhaseMeta, field, onContinue, onLookBack }) {
  const overview = field.overview || {};
  const fieldIdx = subPhaseMeta.fields.findIndex((f) => f.key === field.key);
  return (
    <div className="tw-clearing tw-clearing-overview" key={`overview:${subPhaseMeta.key}:${field.key}`}>
      <div className="tw-clearing-eyebrow">
        <span className="tw-mono">ASSEMBLY · {subPhaseMeta.label.toUpperCase()}</span>
        <span className="tw-clearing-eyebrow-sep">/</span>
        <span className="tw-mono">FIELD {padNum(fieldIdx + 1)} OF {padNum(subPhaseMeta.fields.length)}</span>
        <span className="tw-clearing-eyebrow-sep">·</span>
        <span className="tw-mono">OVERVIEW</span>
      </div>
      <h2 className="tw-clearing-title">{overview.title || field.label}</h2>
      <div className="tw-overview-body">
        {(overview.paragraphs || []).map((p, i) => (
          <p key={i} className="tw-overview-paragraph">{p}</p>
        ))}
      </div>
      <div className="tw-clearing-actions">
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button className="tw-link-back" onClick={onLookBack}>← look back</button>
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button className="tw-advance" onClick={onContinue}>
          <span>Continue to begin</span>
          <span className="tw-advance-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

// ── Pause clearings (one per sub-phase boundary, plus stage-boundary) ────

function PauseClearing({
  subPhaseMeta,
  mppData, updateMPP,
  frameData, updateFrame,
  outline, funcData,
  advance, lookBack,
}) {
  if (subPhaseMeta.key === SUB_PHASE.Anchor) {
    return (
      <PairPauseClearing
        eyebrow="A BREATH BETWEEN PHASES"
        title="The Main Point Pair"
        body="Read your pair. The text said this — now the text says this to your people. Edit if a phrase still rings off; otherwise walk on into the outline."
        outcomeLabel="MAIN POINT PAIR"
        nextLabel={<><span>The </span><em>Outline</em><span> sub-phase — laying the body — waits beyond this bend.</span></>}
        advanceLabel="Walk on"
        data={mppData} updater={updateMPP} rows={MAIN_POINT_PAIR_ROWS}
        advance={advance} lookBack={lookBack}
      />
    );
  }
  if (subPhaseMeta.key === SUB_PHASE.Outline) {
    return (
      <NamedOutcomePause
        eyebrow="A BREATH BETWEEN PHASES"
        title="The Sermon Outline"
        body="Read your outline. Does the sequence move the listener toward the MPS? If a point still rings off, walk back and re-shape it; otherwise walk on to equip the body."
        outcomeLabel="BECOMES YOUR SERMON OUTLINE"
        nextLabel="The Equip sub-phase — filling each point with Scripture, explanation, application, illustration — waits beyond this bend."
        advance={advance} lookBack={lookBack}
      >
        {outline.length === 0 ? (
          <em style={{ color: "var(--ink-ghost)" }}>No outline points yet</em>
        ) : (
          <ol className="tw-pause-outline-list">
            {outline.map((p) => (
              <li key={p.id}>{p.text || <em style={{ color: "var(--ink-ghost)" }}>(untitled)</em>}</li>
            ))}
          </ol>
        )}
      </NamedOutcomePause>
    );
  }
  if (subPhaseMeta.key === SUB_PHASE.Equip) {
    return (
      <NamedOutcomePause
        eyebrow="A BREATH BETWEEN PHASES"
        title="The Sermon Body"
        body="Read the equipped body — each point with its Scripture, explanation, application, illustration. Does the body land? Where does it still need work?"
        outcomeLabel="BECOMES YOUR SERMON BODY"
        nextLabel="The Frame sub-phase — Intro and Conclusion — waits beyond this bend."
        advance={advance} lookBack={lookBack}
      >
        {outline.length === 0 ? (
          <em style={{ color: "var(--ink-ghost)" }}>No points equipped yet</em>
        ) : (
          <div className="tw-pause-equip-summary">
            {outline.map((p) => {
              const fe = funcData[p.id] || {};
              const filled = ["scripture", "explanation", "application", "illustration"]
                .filter((k) => fe[k] && fe[k].trim()).length;
              return (
                <div key={p.id} className="tw-pause-equip-row">
                  <span className="tw-pause-equip-text">{p.text}</span>
                  <span className={`tw-pause-equip-count tw-mono ${filled === 4 ? "is-full" : ""}`}>
                    {filled}/4 equipped
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </NamedOutcomePause>
    );
  }
  // Frame sub-phase pause doubles as the Assembly → Manuscript stage-
  // boundary — dismiss flips the tab via AssemblyTab's setPausePoint
  // wrapper. Heavier register: read-back of all four Assembly named
  // outcomes (Main Point Pair / Sermon Outline / Sermon Body / Sermon
  // Frame) with the Frame pair still editable inline so the pastor can
  // refine the last piece before crossing into the writing room.
  const mptStr = getQuestionString(mppData, "mpt", "tighten");
  const mpsStr = getQuestionString(mppData, "mps", "tighten");
  const introStr = getQuestionString(frameData, "intro", "hook");
  const conclusionStr = getQuestionString(frameData, "conclusion", "land_call");
  const empty = (text) => <em className="tw-stage-empty">{text}</em>;
  const rows = [
    {
      label: "MAIN POINT PAIR",
      content: (
        <>
          <div className="tw-stage-outcome-mpt">
            {mptStr || empty("MPT not yet tightened")}
          </div>
          <div className="tw-stage-outcome-mps">
            {mpsStr || empty("MPS not yet tightened")}
          </div>
        </>
      ),
    },
    {
      label: "SERMON OUTLINE",
      content: outline.length === 0 ? (
        empty("No outline points yet")
      ) : (
        <ol className="tw-stage-outcome-list">
          {outline.map((p) => (
            <li key={p.id}>{p.text || empty("(untitled)")}</li>
          ))}
        </ol>
      ),
    },
    {
      label: "SERMON BODY",
      content: outline.length === 0 ? (
        empty("No points equipped yet")
      ) : (
        <div>
          {outline.map((p) => {
            const fe = funcData[p.id] || {};
            const filled = ["scripture", "explanation", "application", "illustration"]
              .filter((k) => fe[k] && fe[k].trim()).length;
            return (
              <div key={p.id} className="tw-stage-outcome-equip-row">
                <span>{p.text || empty("(untitled)")}</span>
                <span className={`tw-stage-outcome-equip-count tw-mono ${filled === 4 ? "is-full" : ""}`}>
                  {filled}/4 EQUIPPED
                </span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      label: "SERMON FRAME",
      content: (
        <div className="tw-stage-outcome-pair">
          <div>
            <div className="tw-stage-outcome-sublabel tw-mono">INTRO — HOW THEY ENTER</div>
            <textarea
              className="tw-pair-input"
              value={introStr}
              onChange={(e) => updateFrame("intro", "hook", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="The hook that opens the sermon…"
              spellCheck={false}
            />
          </div>
          <div>
            <div className="tw-stage-outcome-sublabel tw-mono">CONCLUSION — HOW THEY EXIT</div>
            <textarea
              className="tw-pair-input"
              value={conclusionStr}
              onChange={(e) => updateFrame("conclusion", "land_call", e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder="The call the conclusion lands…"
              spellCheck={false}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <StageBoundaryPause
      eyebrow="A THRESHOLD — ASSEMBLY IS BUILT"
      title="The sermon stands."
      body="Read the four pieces you've assembled. If anything still rings off, walk back and refine. Otherwise refine the Sermon Frame here and cross into the writing room."
      rows={rows}
      nextLabel={<><em>Manuscript</em><span> — the writing room — waits beyond this last bend.</span></>}
      advanceLabel="Walk into the writing room"
      advance={advance}
      lookBack={lookBack}
    />
  );
}

// Pair-pause clearing — two stacked editable rows + handoff strip. Used
// by both Anchor (Main Point Pair) and Frame (Sermon Frame) sub-phases.
//
// `rows` shape: [{ label, fieldKey, qKey, placeholder }, ...]
function PairPauseClearing({
  eyebrow, title, body, outcomeLabel, nextLabel, advanceLabel,
  data, updater, rows,
  advance, lookBack,
}) {
  return (
    <div className="tw-clearing tw-clearing-pause tw-clearing-pause-pair">
      <div className="tw-pause-eyebrow tw-mono">{eyebrow}</div>
      <h2 className="tw-pause-title">{title}</h2>
      <p className="tw-pause-sub">{body}</p>
      <div className="tw-pair-card">
        {rows.map((row) => (
          <div className="tw-pair-row" key={`${row.fieldKey}:${row.qKey}`}>
            <div className="tw-pair-row-label tw-mono">{row.label}</div>
            <textarea
              className="tw-pair-input"
              value={getQuestionString(data, row.fieldKey, row.qKey)}
              onChange={(e) => updater(row.fieldKey, row.qKey, e.target.value)}
              onInput={(e) => autoResize(e.target)}
              ref={(el) => autoResize(el)}
              placeholder={row.placeholder}
              spellCheck={false}
            />
          </div>
        ))}
        <div className="tw-pause-handoff tw-mono">
          <span>BECOMES YOUR</span>
          <strong>{outcomeLabel}</strong>
        </div>
      </div>
      <p className="tw-pause-next">
        <span className="tw-mono">NEXT</span>
        <span> {nextLabel}</span>
      </p>
      <div className="tw-clearing-actions">
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button className="tw-link-back" onClick={lookBack}>← look back</button>
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button className="tw-advance" onClick={advance}>
          <span>{advanceLabel}</span>
          <span className="tw-advance-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

const MAIN_POINT_PAIR_ROWS = [
  { label: "MPT — WHAT THE TEXT SAID",       fieldKey: "mpt", qKey: "tighten", placeholder: "One past-tense sentence…" },
  { label: "MPS — WHAT THE TEXT SAYS TO US", fieldKey: "mps", qKey: "tighten", placeholder: "One present/future-tense sentence…" },
];

function NamedOutcomePause({
  eyebrow, title, body, outcomeLabel, nextLabel,
  advance, lookBack, children,
}) {
  return (
    <div className="tw-clearing tw-clearing-pause">
      <div className="tw-pause-eyebrow tw-mono">{eyebrow}</div>
      <h2 className="tw-pause-title">{title}</h2>
      <p className="tw-pause-sub">{body}</p>
      <div className="tw-pause-outcome">{children}</div>
      <div className="tw-pause-handoff tw-mono"><span>{outcomeLabel}</span></div>
      <p className="tw-pause-next">
        <span className="tw-mono">NEXT</span>
        <span> {nextLabel}</span>
      </p>
      <div className="tw-clearing-actions">
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button className="tw-link-back" onClick={lookBack}>← look back</button>
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button className="tw-advance" onClick={advance}>
          <span>Walk on</span>
          <span className="tw-advance-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
