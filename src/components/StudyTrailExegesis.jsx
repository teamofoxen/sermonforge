// StudyTrailExegesis — switchback-trail rendering of Step 1 (Exegesis).
//
// Replaces the three-column rail+worksheet+scripture layout with a single
// immersive surface where the four sub-phases (Observe / Interpret /
// Redemptive Thread / Implications) are walked one field at a time.
// Completed fields recede behind as faded trail markers; future fields stay
// hidden in mist. Pause-points sit on the bend between phases as first-class
// stops. The clearing card hosts the existing SpotlightField so the multi-
// question walk + structured editors (unified canvas, synthesis tables)
// keep working unchanged.
//
// This is a worktree experiment driven by the design at
// tmp/switchback/Workspace - Switchback Trail.html. It assumes activeStep===1
// and does not coexist with the legacy three-col layout.
//
// Geometry, camera math, and recede ramp follow the prototype's numbers; the
// stops array is computed from the actual OBSERVE_FIELDS / INTERPRET_FIELDS /
// REDEMPTIVE_FIELDS / IMPLICATIONS_FIELDS so any future schema change adapts
// automatically.

import { useEffect, useMemo, useState } from "react";
import {
  OBSERVE_FIELDS,
  INTERPRET_FIELDS,
  REDEMPTIVE_FIELDS,
  IMPLICATIONS_FIELDS,
  fieldQuestions,
  getQuestionAnswer,
  isQuestionNA,
  flattenAnswerValue,
  DEFAULT_QUESTION_KEY,
} from "../utils/studyFields";
import IndentedSentenceCanvas from "./IndentedSentenceCanvas";
import SynthesisTable from "./SynthesisTable";
import AdvanceGateChecklist from "./AdvanceGateChecklist";
import PassagePopup from "./PassagePopup";
import ScripturePanel from "./ScripturePanel";
import { autoResize } from "../utils";
import "./studyTrail.css";

// Width reserved on the right edge of the trail for the live scripture
// column. The clearing's camera math centers in (viewport.w - this) so the
// trail and clearing sit visually in the left column rather than under the
// scripture panel. Keep in sync with `.tw-scripture { width }` in CSS.
const SCRIPTURE_COL_WIDTH = 400;

const PHASES = [
  {
    id: "observe",
    label: "Observe",
    question: "What does the text say?",
    outcome: "Observation Set",
    column: "observations",
    fields: OBSERVE_FIELDS,
    dir: 1,
  },
  {
    id: "interpret",
    label: "Interpret",
    question: "What does the text mean?",
    outcome: "Interpretation Set",
    column: "interpretation",
    fields: INTERPRET_FIELDS,
    dir: -1,
  },
  {
    id: "redemptive",
    label: "Redemptive Thread",
    question: "Where is Christ in this text?",
    outcome: "Christ-Connection Statement",
    column: "redemptive_thread",
    fields: REDEMPTIVE_FIELDS,
    dir: 1,
  },
  {
    id: "implications",
    label: "Implications",
    question: "How does this text land on these people?",
    outcome: "Implications Synthesis",
    column: "implications",
    fields: IMPLICATIONS_FIELDS,
    dir: -1,
  },
];

const PAUSE_PROMPTS = [
  "In one sentence, what does the text say?",
  "In one sentence, what does the text mean?",
  "In one sentence, where is Christ in this text?",
  "In one sentence, how does this text land on your people?",
];

// ── Stops: interleave fields and pauses into one ordered journey ──────────

function buildStops() {
  const out = [];
  PHASES.forEach((p, pi) => {
    p.fields.forEach((f) => {
      out.push({ kind: "field", phase: pi, fieldKey: f.key });
    });
    out.push({ kind: "pause", phase: pi, pauseIdx: pi });
  });
  return out;
}

const STOPS = buildStops();

// ── Switchback geometry ───────────────────────────────────────────────────

const ROW_GAP = 360;
const ROW_SPAN = 1700;
const ROW_LEFT = 200;
const BEND_RADIUS = 110;
const ROW_Y0 = 200;

const GEO = (() => {
  const phaseStops = PHASES.map(() => []);
  STOPS.forEach((s, i) => phaseStops[s.phase].push({ ...s, idx: i }));

  const points = STOPS.map(() => ({ x: 0, y: 0 }));

  PHASES.forEach((p, pi) => {
    const inPhase = phaseStops[pi];
    const fieldsInPhase = inPhase.filter((s) => s.kind === "field");
    const y = ROW_Y0 + pi * ROW_GAP;
    const usable = ROW_SPAN - BEND_RADIUS * 1.2;

    fieldsInPhase.forEach((s, k) => {
      const t = fieldsInPhase.length === 1 ? 0.5 : k / (fieldsInPhase.length - 1);
      const xLocal = t * usable;
      const x = p.dir === 1 ? ROW_LEFT + xLocal : ROW_LEFT + ROW_SPAN - xLocal;
      points[s.idx] = { x, y };
    });

    const pauseStop = inPhase.find((s) => s.kind === "pause");
    if (pauseStop) {
      const lastField = fieldsInPhase[fieldsInPhase.length - 1];
      const lastP = points[lastField.idx];
      const farX = p.dir === 1 ? ROW_LEFT + ROW_SPAN : ROW_LEFT;
      points[pauseStop.idx] = {
        x: lastP.x + (farX - lastP.x) * 0.85 + (p.dir === 1 ? BEND_RADIUS * 0.1 : -BEND_RADIUS * 0.1),
        y: y + ROW_GAP * 0.42,
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
    const sameRow = Math.abs(a.y - b.y) < 1;
    if (sameRow) {
      d += ` L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    } else {
      const c1x = a.x + (b.x > a.x ? BEND_RADIUS : -BEND_RADIUS);
      const c1y = a.y;
      const c2x = b.x + (a.x > b.x ? BEND_RADIUS : -BEND_RADIUS);
      const c2y = b.y;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
  }
  return d;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const padNum = (n) => String(n).padStart(2, "0");
const toRoman = (n) => ["I", "II", "III", "IV"][n - 1] || String(n);

function firstIncompleteFieldKey(fields, data) {
  for (const def of fields) {
    const qs = fieldQuestions(def);
    const allDone = qs.every(
      (q) =>
        isQuestionNA(data, def.key, q.key) ||
        !!flattenAnswerValue(getQuestionAnswer(data, def.key, q.key)),
    );
    if (!allDone) return def.key;
  }
  return fields[0]?.key ?? null;
}

function firstIncompleteQuestionKey(field, data) {
  const qs = fieldQuestions(field);
  for (const q of qs) {
    if (isQuestionNA(data, field.key, q.key)) continue;
    if (!flattenAnswerValue(getQuestionAnswer(data, field.key, q.key))) {
      return q.key;
    }
  }
  return qs[0]?.key ?? DEFAULT_QUESTION_KEY;
}

function fieldHasAnyAnswer(field, data) {
  const qs = fieldQuestions(field);
  for (const q of qs) {
    if (isQuestionNA(data, field.key, q.key)) continue;
    if (flattenAnswerValue(getQuestionAnswer(data, field.key, q.key))) return true;
  }
  return false;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function StudyTrailExegesis({
  sermon,
  activeSubPhase,
  currentActiveFieldKey,
  setCurrentActiveFieldKey,
  pausePoint,
  setPausePoint,
  obsData,
  intData,
  redData,
  impData,
  updateStructured,
  toggleStructuredNA,
  advanceSubPhase,
  jumpToSubPhase,
  subPhaseSufficiency,
  onExit,
}) {
  const [viewport, setViewport] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Footprints don't disappear when you look back. The trail line + visible
  // stations track the furthest stop reached this session, not the current
  // stop. The camera still pivots on the active stop so the clearing stays
  // centered.
  const [maxVisitedStop, setMaxVisitedStop] = useState(0);

  // Active question within the current field. Null = "derive from this
  // field's first-incomplete Q." Single-Q fields collapse to the field's
  // primary question; multi-Q fields walk Q1 → Q2 → ... before crossing
  // to the next field. Local to the trail — re-entry derives from saved
  // data rather than threading state through StudyTab.
  const [activeQKey, setActiveQKey] = useState(null);

  // D19 — Heavy-lifting overview suppression. Heavy-lifting fields carry
  // an `overview` block that fires once per session on first arrival to a
  // field with no answers. Pastor dismisses with "Continue to begin"; the
  // field key gets added to this set so the overview doesn't re-fire on
  // look-back or revisit within the same session.
  const [dismissedOverviews, setDismissedOverviews] = useState(() => new Set());

  // D4 / D16 — passage popup. The trail's topbar passage chip opens the
  // existing PassagePopup as a modal overlay so the pastor can read the
  // text without leaving the clearing.
  const [passageOpen, setPassageOpen] = useState(false);
  const dismissOverview = (fieldKey) => {
    setDismissedOverviews((prev) => {
      if (prev.has(fieldKey)) return prev;
      const next = new Set(prev);
      next.add(fieldKey);
      return next;
    });
  };

  // Phase data lookup (phase index 0..3 → parsed envelope + column name).
  const phaseData = useMemo(
    () => [
      { data: obsData, column: "observations" },
      { data: intData, column: "interpretation" },
      { data: redData, column: "redemptive_thread" },
      { data: impData, column: "implications" },
    ],
    [obsData, intData, redData, impData],
  );

  // Stop pointer derived from the parent state. Pause-point wins; otherwise
  // (activeSubPhase, currentActiveFieldKey).
  const stopIdx = useMemo(() => {
    if (pausePoint && pausePoint.priorSubPhase >= 1 && pausePoint.priorSubPhase <= 4) {
      const phase = pausePoint.priorSubPhase - 1;
      const idx = STOPS.findIndex((s) => s.kind === "pause" && s.phase === phase);
      if (idx >= 0) return idx;
    }
    const phase = Math.max(0, Math.min(3, activeSubPhase - 1));
    const fields = PHASES[phase].fields;
    let key = currentActiveFieldKey;
    if (!key || !fields.find((f) => f.key === key)) {
      key = firstIncompleteFieldKey(fields, phaseData[phase].data);
    }
    const idx = STOPS.findIndex(
      (s) => s.kind === "field" && s.phase === phase && s.fieldKey === key,
    );
    return idx >= 0 ? idx : 0;
  }, [pausePoint, activeSubPhase, currentActiveFieldKey, phaseData]);

  const stop = STOPS[stopIdx];
  const phaseDef = PHASES[stop.phase];
  const active = GEO.points[stopIdx];
  // Camera centers in the trail area (viewport minus the right scripture
  // column) so the clearing and the active station don't sit under the
  // scripture panel.
  const trailAreaW = Math.max(viewport.w - SCRIPTURE_COL_WIDTH, 720);
  const tx = trailAreaW / 2 - active.x;
  const ty = viewport.h * 0.58 - active.y;

  // Sync currentActiveFieldKey upward so the parent's state stays consistent
  // with the trail's active stop. This makes look-back / spine transitions
  // pick up correctly when re-entering the trail.
  useEffect(() => {
    if (stop.kind === "field" && stop.fieldKey !== currentActiveFieldKey) {
      setCurrentActiveFieldKey(stop.fieldKey);
    }
  }, [stop, currentActiveFieldKey, setCurrentActiveFieldKey]);

  // Reset activeQKey to the field's first-incomplete Q whenever the field
  // changes or the saved activeQKey isn't valid for this field. Explicit
  // overrides set in advance / lookBack survive because the new key is
  // valid for the new field on the next render.
  useEffect(() => {
    if (stop.kind !== "field") return;
    const field = phaseDef.fields.find((f) => f.key === stop.fieldKey);
    if (!field) return;
    const qs = fieldQuestions(field);
    if (!activeQKey || !qs.find((q) => q.key === activeQKey)) {
      setActiveQKey(
        firstIncompleteQuestionKey(field, phaseData[stop.phase].data),
      );
    }
  }, [stop, activeQKey, phaseDef.fields, phaseData]);

  // Extend the visible trail whenever we land on a stop further along than
  // we've been. Looking back never retracts.
  useEffect(() => {
    if (stopIdx > maxVisitedStop) setMaxVisitedStop(stopIdx);
  }, [stopIdx, maxVisitedStop]);

  // Cross-phase read for synthesis fields. Phase 2/3/4's cumulative-synthesis-
  // table reads from observations.divisions.thought_units.
  const crossPhaseRead = (column) => {
    if (column === "observations") return obsData;
    return null;
  };
  const crossPhaseWrite = (column, fieldKey, qKey, value) => {
    if (column === "observations") {
      updateStructured("observations", obsData, fieldKey, value, qKey);
    }
  };

  // ── Navigation ──────────────────────────────────────────────────────────
  //
  // Continue / look-back walk question-by-question within a field, then
  // cross-field, then cross-sub-phase. The trail station for a field stays
  // active across all its Qs — within-Q advance swaps the prompt + textarea
  // in place; the camera holds and the bloom keyframe does not re-fire.

  const advance = () => {
    if (stop.kind === "pause") {
      setPausePoint(null);
      return;
    }
    const field = phaseDef.fields.find((f) => f.key === stop.fieldKey);
    const qs = fieldQuestions(field);
    const qIdx = qs.findIndex((q) => q.key === activeQKey);
    if (qIdx >= 0 && qIdx < qs.length - 1) {
      setActiveQKey(qs[qIdx + 1].key);
      return;
    }
    const fields = phaseDef.fields;
    const idx = fields.findIndex((f) => f.key === stop.fieldKey);
    if (idx < fields.length - 1) {
      setCurrentActiveFieldKey(fields[idx + 1].key);
      setActiveQKey(null);
      return;
    }
    advanceSubPhase();
  };

  const lookBack = async () => {
    if (stop.kind === "pause") {
      // Skip the pause clearing on the way back — drop into the prior phase's
      // last field, on its last question. activeSubPhase was already bumped
      // forward by advanceSubPhase before the pause was set; route through
      // the spine to put it back, then set the field+Q so the post-await
      // batched render lands coherent. Without the await, an interim render
      // sees stale activeSubPhase, the field-key sync effect resets the
      // field to first-incomplete-of-wrong-phase, and the explicit set
      // gets lost.
      setPausePoint(null);
      await jumpToSubPhase(stop.phase + 1);
      const fields = PHASES[stop.phase].fields;
      const lastField = fields[fields.length - 1];
      setCurrentActiveFieldKey(lastField.key);
      const lastQs = fieldQuestions(lastField);
      setActiveQKey(lastQs[lastQs.length - 1].key);
      return;
    }
    const field = phaseDef.fields.find((f) => f.key === stop.fieldKey);
    const qs = fieldQuestions(field);
    const qIdx = qs.findIndex((q) => q.key === activeQKey);
    if (qIdx > 0) {
      setActiveQKey(qs[qIdx - 1].key);
      return;
    }
    const fields = phaseDef.fields;
    const idx = fields.findIndex((f) => f.key === stop.fieldKey);
    if (idx > 0) {
      const priorField = fields[idx - 1];
      setCurrentActiveFieldKey(priorField.key);
      const priorQs = fieldQuestions(priorField);
      setActiveQKey(priorQs[priorQs.length - 1].key);
      return;
    }
    if (stop.phase > 0) {
      const priorFields = PHASES[stop.phase - 1].fields;
      const priorField = priorFields[priorFields.length - 1];
      // jumpToSubPhase routes through the spine for backward transitions; the
      // active-field + active-Q updates follow AFTER the await so the
      // batched render sees activeSubPhase aligned with the field key.
      await jumpToSubPhase(stop.phase);
      setCurrentActiveFieldKey(priorField.key);
      const priorQs = fieldQuestions(priorField);
      setActiveQKey(priorQs[priorQs.length - 1].key);
    }
  };

  const isLastFieldInPhase =
    stop.kind === "field" &&
    phaseDef.fields[phaseDef.fields.length - 1].key === stop.fieldKey;
  const isLastQuestionInField = (() => {
    if (stop.kind !== "field") return false;
    const field = phaseDef.fields.find((f) => f.key === stop.fieldKey);
    if (!field) return false;
    const qs = fieldQuestions(field);
    return qs[qs.length - 1].key === activeQKey;
  })();
  // The composite gate fires only at the sub-phase boundary — last Q of the
  // last field of the phase. Within a field, advance never fires the gate.
  const advanceDisabled =
    isLastFieldInPhase && isLastQuestionInField && !subPhaseSufficiency.ok;

  // D5 — Keyboard navigation. Listen at window level for the trail's quiet
  // shortcuts. Inside textareas/inputs, only the modifier-bearing shortcuts
  // fire; bare Enter / Esc inside an input is reserved for text editing.
  // Placed after `advance` / `lookBack` / `advanceDisabled` so the dep
  // array sees the live closures (TDZ-safe).
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const inEditor =
        t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT");
      const mod = e.metaKey || e.ctrlKey;
      // Cmd/Ctrl + Enter → advance
      if (mod && e.key === "Enter") {
        e.preventDefault();
        if (!advanceDisabled) advance();
        return;
      }
      // Cmd/Ctrl + ArrowLeft → look back
      if (mod && e.key === "ArrowLeft") {
        e.preventDefault();
        lookBack();
        return;
      }
      // Esc → exit trail (only outside editors so Esc can still blur etc.,
      // and only when the passage popup isn't open — popup owns its own
      // Esc-to-close so we'd otherwise both close popup AND exit trail).
      if (e.key === "Escape" && !inEditor) {
        if (passageOpen) return;
        if (onExit) {
          e.preventDefault();
          onExit();
        }
        return;
      }
      // Cmd/Ctrl + . → toggle N/A on active question (D2)
      if (mod && e.key === ".") {
        e.preventDefault();
        if (stop.kind === "field" && activeQKey) {
          const { column, data } = phaseData[stop.phase];
          toggleStructuredNA?.(column, data, stop.fieldKey, activeQKey);
        }
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, lookBack, onExit, advanceDisabled, stop, activeQKey, phaseData, toggleStructuredNA, passageOpen]);

  return (
    <div className="tw-shell">
      <TrailTopBar
        sermon={sermon}
        onExit={onExit}
        onPassageClick={() => setPassageOpen(true)}
      />
      <PassagePopup
        passage={sermon?.passage}
        isOpen={passageOpen}
        onClose={() => setPassageOpen(false)}
      />
      <aside className="tw-scripture">
        <ScripturePanel passage={sermon?.passage} />
      </aside>
      <TrailCanvas
        tx={tx}
        ty={ty}
        stopIdx={stopIdx}
        maxVisitedStop={maxVisitedStop}
        viewport={viewport}
      />
      <PhaseRibbon stop={stop} activeQKey={activeQKey} />
      {stop.kind === "field" && (() => {
        const field = phaseDef.fields.find((f) => f.key === stop.fieldKey);
        if (!field?.overview) return false;
        if (dismissedOverviews.has(field.key)) return false;
        return !fieldHasAnyAnswer(field, phaseData[stop.phase].data);
      })() ? (
        <OverviewClearing
          stop={stop}
          phaseDef={phaseDef}
          field={phaseDef.fields.find((f) => f.key === stop.fieldKey)}
          onContinue={() => dismissOverview(stop.fieldKey)}
          onLookBack={lookBack}
        />
      ) : stop.kind === "field" ? (
        <FieldClearing
          stop={stop}
          phaseDef={phaseDef}
          phaseData={phaseData[stop.phase]}
          updateStructured={updateStructured}
          toggleStructuredNA={toggleStructuredNA}
          crossPhaseRead={crossPhaseRead}
          crossPhaseWrite={crossPhaseWrite}
          advance={advance}
          lookBack={lookBack}
          advanceDisabled={advanceDisabled}
          isLastFieldInPhase={isLastFieldInPhase}
          subPhaseSufficiency={subPhaseSufficiency}
          sermon={sermon}
          activeQKey={activeQKey}
        />
      ) : (
        <PauseClearing
          stop={stop}
          phaseDef={phaseDef}
          nextPhase={PHASES[stop.phase + 1] || null}
          phaseData={phaseData[stop.phase]}
          updateStructured={updateStructured}
          advance={advance}
          lookBack={lookBack}
        />
      )}
      <SaveStatus />
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────

function TrailTopBar({ sermon, onExit, onPassageClick }) {
  return (
    <header className="tw-topbar">
      <div className="tw-topbar-left">
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button
          className="tw-mono tw-meta-passage"
          onClick={onPassageClick}
          title="Open the passage popup"
        >
          {(sermon?.passage || "").toUpperCase()}
        </button>
      </div>
      <h1 className="tw-topbar-title">{sermon?.title || "Untitled"}</h1>
      <div className="tw-topbar-right">
        {onExit && (
          /* eslint-disable-next-line sermonforge/no-raw-button */
          <button
            className="tw-exit"
            onClick={onExit}
            aria-label="Exit trail back to workspace"
            title="Exit trail (Esc)"
          >
            ×
          </button>
        )}
      </div>
    </header>
  );
}

// ── Phase ribbon ──────────────────────────────────────────────────────────

function PhaseRibbon({ stop, activeQKey }) {
  const phase = PHASES[stop.phase];
  const fieldsInPhase = phase.fields.length;
  let positionLabel;
  if (stop.kind === "field") {
    const idx = phase.fields.findIndex((f) => f.key === stop.fieldKey);
    const field = phase.fields[idx];
    const qs = field ? fieldQuestions(field) : [];
    const qIdx = qs.findIndex((q) => q.key === activeQKey);
    positionLabel =
      qs.length > 1 && qIdx >= 0
        ? `FIELD ${padNum(idx + 1)} OF ${padNum(fieldsInPhase)} · Q ${padNum(qIdx + 1)} OF ${padNum(qs.length)}`
        : `FIELD ${padNum(idx + 1)} OF ${padNum(fieldsInPhase)}`;
  } else {
    positionLabel = "PAUSE POINT";
  }
  return (
    <div className="tw-ribbon">
      <span className="tw-mono tw-ribbon-phase">
        PHASE {toRoman(stop.phase + 1)} · {phase.label.toUpperCase()}
      </span>
      <span className="tw-ribbon-question">{phase.question}</span>
      <span className="tw-mono tw-ribbon-pos">{positionLabel}</span>
    </div>
  );
}

// ── Trail SVG canvas ──────────────────────────────────────────────────────

function TrailCanvas({ tx, ty, stopIdx, maxVisitedStop, viewport }) {
  const horizon = Math.max(stopIdx, maxVisitedStop);
  const pathD = buildPathToIndex(horizon);
  return (
    <svg
      className="tw-trail"
      viewBox={`0 0 ${viewport.w} ${viewport.h}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Mist + paper-grain colors flow through CSS classes so dark mode
            re-tints them via the parchment tokens. Hardcoded light parchment
            stops here would burn through dark mode as a bright spotlight
            halo around the active clearing. */}
        <radialGradient id="clearingMist" cx="50%" cy="58%" r="36%">
          <stop offset="0%" className="tw-mist-stop" stopOpacity="1" />
          <stop offset="50%" className="tw-mist-stop" stopOpacity="0.92" />
          <stop offset="100%" className="tw-mist-stop" stopOpacity="0" />
        </radialGradient>
        <pattern
          id="paperGrain"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
          patternTransform="rotate(35)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            className="tw-grain-stroke"
            strokeWidth="0.4"
            opacity="0.35"
          />
        </pattern>
      </defs>
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
          const isPause = s.kind === "pause";
          const ordinal =
            s.kind === "field"
              ? PHASES[s.phase].fields.findIndex((f) => f.key === s.fieldKey) + 1
              : null;
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
}

function Station({ point, isActive, isPause, ordinal, distance }) {
  const recede = Math.min(distance, 8);
  const fade = Math.max(0.32, 1 - recede * 0.08);
  const r = isActive ? (isPause ? 26 : 22) : isPause ? 14 : 10 - Math.min(recede * 0.4, 4);
  return (
    <g transform={`translate(${point.x} ${point.y})`} opacity={isActive ? 1 : fade}>
      {isActive && (
        <>
          <circle r={r + 22} className="tw-station-glow" />
          <circle r={r + 12} className="tw-station-glow tw-station-glow-2" />
        </>
      )}
      {isPause ? (
        <g className={`tw-station tw-station-pause ${isActive ? "is-active" : ""}`}>
          <circle r={r} />
          <line x1={-r * 0.5} x2={r * 0.5} y1={0} y2={0} />
        </g>
      ) : (
        <g className={`tw-station ${isActive ? "is-active" : ""}`}>
          <circle r={r} />
          {distance < 6 && ordinal != null && (
            <text className="tw-mono tw-station-num" y={r + 16} textAnchor="middle">
              {padNum(ordinal)}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

// ── Field clearing (active card) ──────────────────────────────────────────

function FieldClearing({
  stop,
  phaseDef,
  phaseData,
  updateStructured,
  // D2 — toggleStructuredNA is now exposed via a quiet "Mark not applicable"
  // text link in the clearing-actions row. The trail still suppresses the
  // SpotlightWorksheet's button-style N/A toggle, but the affordance is
  // present in trail-native form (mono link, not a control).
  toggleStructuredNA,
  crossPhaseRead,
  crossPhaseWrite,
  advance,
  lookBack,
  advanceDisabled,
  isLastFieldInPhase,
  subPhaseSufficiency,
  sermon,
  activeQKey,
}) {
  const field = phaseDef.fields.find((f) => f.key === stop.fieldKey);
  if (!field) return null;
  const idx = phaseDef.fields.findIndex((f) => f.key === stop.fieldKey);
  const { data, column } = phaseData;
  const questions = fieldQuestions(field);
  const activeQuestion =
    questions.find((q) => q.key === activeQKey) || questions[0];
  const qIdx = questions.findIndex((q) => q.key === activeQuestion?.key);
  const isMultiQ = questions.length > 1;
  // Single-Q fields: fieldQuestions returns one entry whose prompt IS the
  // field hint (DEFAULT_QUESTION_KEY fallback). Multi-Q fields: each Q
  // carries its own prompt and the field hint is unused — the field label
  // as title + the Q prompt as sub-headline does the framing work.
  const promptText = activeQuestion?.prompt || field.hint || "";
  const activeQNA = activeQuestion
    ? isQuestionNA(data, field.key, activeQuestion.key)
    : false;
  const onToggleNA = () => {
    if (!activeQuestion || !toggleStructuredNA) return;
    toggleStructuredNA(column, data, field.key, activeQuestion.key);
  };

  return (
    <div className="tw-clearing" key={`${stop.phase}:${stop.fieldKey}`}>
      <div className="tw-clearing-eyebrow">
        <span className="tw-mono">
          PHASE {toRoman(stop.phase + 1)} · {phaseDef.label.toUpperCase()}
        </span>
        <span className="tw-clearing-eyebrow-sep">/</span>
        <span className="tw-mono">
          FIELD {padNum(idx + 1)} OF {padNum(phaseDef.fields.length)}
        </span>
        {isMultiQ && qIdx >= 0 && (
          <>
            <span className="tw-clearing-eyebrow-sep">·</span>
            <span className="tw-mono">
              Q {padNum(qIdx + 1)} OF {padNum(questions.length)}
            </span>
          </>
        )}
      </div>
      <h2 className="tw-clearing-title">{field.label}</h2>
      {promptText && <p className="tw-clearing-prompt">{promptText}</p>}

      <div className="tw-clearing-body">
        <TrailFieldInputs
          field={field}
          data={data}
          column={column}
          updateStructured={updateStructured}
          crossPhaseRead={crossPhaseRead}
          crossPhaseWrite={crossPhaseWrite}
          passage={sermon?.passage}
          activeQuestion={activeQuestion}
          activeQNA={activeQNA}
        />
      </div>

      <div className="tw-clearing-actions">
        <div className="tw-clearing-actions-left">
          {/* eslint-disable-next-line sermonforge/no-raw-button */}
          <button className="tw-link-back" onClick={lookBack}>
            ← look back
          </button>
          {toggleStructuredNA && activeQuestion && (
            /* eslint-disable-next-line sermonforge/no-raw-button */
            <button
              className="tw-link-na"
              onClick={onToggleNA}
              title={activeQNA ? "Restore this question (Cmd/Ctrl+.)" : "Mark this question not applicable for this passage (Cmd/Ctrl+.)"}
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

// ── Overview clearing (heavy-lifting field intro) ─────────────────────────
//
// D19 — When the pastor lands on a heavy-lifting field for the first time
// in this session AND the field has no content yet, the trail surfaces the
// field's `overview` block before the question walk begins. This restores
// the contemplative "you are entering a field that asks for sustained work"
// beat that lives in `FieldOverviewScreen` in the legacy SpotlightWorksheet
// layout, dressed for trail typography. Pastor dismisses with "Continue to
// begin"; the dismissal is session-scoped per field key (re-firing on
// re-entry would be noise).

function OverviewClearing({ stop, phaseDef, field, onContinue, onLookBack }) {
  const overview = field.overview || {};
  const idx = phaseDef.fields.findIndex((f) => f.key === field.key);
  return (
    <div
      className="tw-clearing tw-clearing-overview"
      key={`overview:${stop.phase}:${field.key}`}
    >
      <div className="tw-clearing-eyebrow">
        <span className="tw-mono">
          PHASE {toRoman(stop.phase + 1)} · {phaseDef.label.toUpperCase()}
        </span>
        <span className="tw-clearing-eyebrow-sep">/</span>
        <span className="tw-mono">
          FIELD {padNum(idx + 1)} OF {padNum(phaseDef.fields.length)}
        </span>
        <span className="tw-clearing-eyebrow-sep">·</span>
        <span className="tw-mono">OVERVIEW</span>
      </div>
      <h2 className="tw-clearing-title">{overview.title || field.label}</h2>
      <div className="tw-overview-body">
        {(overview.paragraphs || []).map((p, i) => (
          <p key={i} className="tw-overview-paragraph">
            {p}
          </p>
        ))}
      </div>
      <div className="tw-clearing-actions">
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button className="tw-link-back" onClick={onLookBack}>
          ← look back
        </button>
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button className="tw-advance" onClick={onContinue}>
          <span>Continue to begin</span>
          <span className="tw-advance-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

// ── Pause clearing (between phases) ───────────────────────────────────────

function PauseClearing({ stop, phaseDef, nextPhase, phaseData, updateStructured, advance, lookBack }) {
  const promptText = PAUSE_PROMPTS[stop.pauseIdx] || "";
  const { data, column } = phaseData;
  // The synthesis answer is stored on the same envelope under a `_synthesis`
  // pseudo-field-key — mirroring the existing PausePointScreen contract so
  // the value round-trips through the same column without schema churn.
  const synthValue = (() => {
    const v = getQuestionAnswer(data, "_synthesis");
    return typeof v === "string" ? v : "";
  })();

  return (
    <div className="tw-clearing tw-clearing-pause">
      <div className="tw-pause-eyebrow tw-mono">A BREATH BETWEEN PHASES</div>
      <h2 className="tw-pause-title">{promptText}</h2>
      <p className="tw-pause-sub">
        You have just completed the <em>{phaseDef.label}</em> sub-phase. Before you walk
        further, name what the text has given you in one sentence.
      </p>

      <div className="tw-pause-input">
        <input
          type="text"
          value={synthValue}
          onChange={(e) => updateStructured(column, data, "_synthesis", e.target.value)}
          placeholder="One sentence…"
          spellCheck={false}
        />
        <div className="tw-pause-handoff tw-mono">
          <span>BECOMES YOUR</span>
          <strong>{phaseDef.outcome.toUpperCase()}</strong>
        </div>
      </div>

      {nextPhase ? (
        <p className="tw-pause-next">
          <span className="tw-mono">NEXT</span>
          <span> The trail descends into </span>
          <em>{nextPhase.label}</em>
          <span> — </span>
          <span className="tw-pause-next-q">{nextPhase.question.toLowerCase()}</span>
        </p>
      ) : (
        <p className="tw-pause-next">
          <span className="tw-mono">NEXT</span>
          <span> Assembly — the </span>
          <em>Main Point Pair</em>
          <span> — waits beyond this last bend.</span>
        </p>
      )}

      <div className="tw-clearing-actions">
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button className="tw-link-back" onClick={lookBack}>
          ← look back
        </button>
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button className="tw-advance" onClick={advance}>
          <span>Walk on</span>
          <span className="tw-advance-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

// ── Trail-native field inputs (no spotlight chrome) ───────────────────────
//
// Renders the field's question(s) inside the clearing without the spotlight
// pattern (no "QUESTION 1 OF 4" indicator, no "Mark not applicable" toggle,
// no "Next question →" button). Each question is a prompt + input pair;
// for textarea kinds the input gets the meter row from the design (word
// count + passage reference). Structured-exercise kinds (unified-canvas,
// cumulative-synthesis-table) render their canonical editors directly so
// heavy-lifting fields like Divisions and the synthesis tables keep their
// existing UX inside the trail clearing.
//
// All field data round-trips through the existing column envelope via
// `updateStructured` — only the renderer changes.

function TrailFieldInputs({
  field,
  data,
  column,
  updateStructured,
  crossPhaseRead,
  crossPhaseWrite,
  passage,
  activeQuestion,
  activeQNA,
}) {
  // Trail renders one Q at a time. Multi-Q fields walk through their
  // questions via Continue within the same clearing — the eyebrow + prompt
  // swap, and the body input swaps to the active Q's renderer (textarea /
  // unified-canvas / cumulative-synthesis-table). The clearing card itself
  // doesn't re-mount, so within-field advance is a quiet swap rather than a
  // bloom.
  const q = activeQuestion || fieldQuestions(field)[0];
  if (!q) return null;

  // D2 — when the active Q is marked N/A, surface a quiet message in place
  // of the editor so the pastor sees the field is intentionally skipped
  // for this passage. The "↺ restore this question" link in the actions
  // row brings the editor back.
  if (activeQNA) {
    return (
      <div className="tw-inputs">
        <div className="tw-question tw-question-na">
          <p className="tw-question-na-message">
            Marked not applicable for this passage.
          </p>
          <p className="tw-question-na-sub">
            Some questions don't carry weight for every text. The trail
            advances past this one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-inputs">
      <TrailQuestionInput
        field={field}
        question={q}
        data={data}
        column={column}
        updateStructured={updateStructured}
        crossPhaseRead={crossPhaseRead}
        crossPhaseWrite={crossPhaseWrite}
        passage={passage}
        showPrompt={false}
        isFirst={true}
      />
    </div>
  );
}

function TrailQuestionInput({
  field,
  question,
  data,
  column,
  updateStructured,
  crossPhaseRead,
  crossPhaseWrite,
  passage,
  showPrompt,
  isFirst,
}) {
  const kind = question.kind || "textarea";

  if (kind === "unified-canvas") {
    const value = getQuestionAnswer(data, field.key, question.key);
    return (
      <div className={`tw-question${isFirst ? " tw-question-first" : ""}`}>
        {showPrompt && question.prompt && (
          <p className="tw-question-prompt">{question.prompt}</p>
        )}
        <IndentedSentenceCanvas
          value={Array.isArray(value) ? value : []}
          onChange={(next) => updateStructured(column, data, field.key, next, question.key)}
          disabled={isQuestionNA(data, field.key, question.key)}
        />
      </div>
    );
  }

  if (kind === "cumulative-synthesis-table") {
    const src = question.crossPhaseSource;
    const upstream =
      typeof crossPhaseRead === "function" ? crossPhaseRead(src?.column) : null;
    const upstreamRows = upstream?.[src?.fieldKey]?.[src?.questionKey]?.value;
    const cumulativeValue = Array.isArray(upstreamRows) ? upstreamRows : [];
    const writeBack = (next) => {
      if (typeof crossPhaseWrite === "function" && src) {
        crossPhaseWrite(src.column, src.fieldKey, src.questionKey, next);
      }
    };
    return (
      <div className={`tw-question${isFirst ? " tw-question-first" : ""}`}>
        {showPrompt && question.prompt && (
          <p className="tw-question-prompt">{question.prompt}</p>
        )}
        <SynthesisTable
          value={cumulativeValue}
          onChange={writeBack}
          columns={Array.isArray(question.columns) ? question.columns : undefined}
        />
      </div>
    );
  }

  // Default: textarea kind.
  const rawValue = getQuestionAnswer(data, field.key, question.key);
  const value = typeof rawValue === "string" ? rawValue : "";
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className={`tw-question${isFirst ? " tw-question-first" : ""}`}>
      {showPrompt && question.prompt && (
        <p className="tw-question-prompt">{question.prompt}</p>
      )}
      <textarea
        className="tw-question-textarea"
        value={value}
        onChange={(e) => updateStructured(column, data, field.key, e.target.value, question.key)}
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
          <span className="tw-mono tw-clearing-passage">
            {String(passage).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Save status ───────────────────────────────────────────────────────────

function SaveStatus() {
  return (
    <div className="tw-save tw-mono">
      <span className="tw-save-dot" />
      <span>SAVED</span>
    </div>
  );
}
