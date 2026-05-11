// StudyTrailForge — switchback-trail rendering of Step 2 (MPT / MPS Forge).
//
// Phase B of the Workspace Trail Charter. Parallel sibling to
// StudyTrailExegesis. Shares studyTrail.css so the visual language stays
// continuous when the pastor walks past the Implications → Step 2 pause and
// the Exegesis trail unmounts in favor of this one. Per the tour-homunculus
// principle — engine is shared (CSS, navigation pattern, station math),
// everything else parallel + namespaced.
//
// Geometry per DW1 (charter, 2026-05-10): single horizontal row, left-to-
// right. Three stops — MPT field clearing, MPS field clearing, Main Point
// Pair pause clearing — distributed along a single trail line. Switchback
// compresses to a straightened bend because two fields don't need an
// alternating row geometry.
//
// Pause shape per DW2: stacked two-row card showing mpt.tighten + mps.tighten
// as the named outcome (Main Point Pair). Each row is editable so the pastor
// can refine without leaving the pause.

import { useEffect, useMemo, useState } from "react";
import {
  fieldQuestions,
  getQuestionAnswer,
  isQuestionNA,
  flattenAnswerValue,
  DEFAULT_QUESTION_KEY,
} from "../utils/studyFields";
import { MAIN_POINT_PAIR_FIELDS } from "../utils/sadiAnchorFields";
import { autoResize } from "../utils";
import AdvanceGateChecklist from "./AdvanceGateChecklist";
import PassagePopup from "./PassagePopup";
import ScripturePanel from "./ScripturePanel";
import "./studyTrail.css";

// Width of the pinned scripture column. Camera math centers in
// (viewport.w - this) so the active station + clearing don't sit under
// the panel. Must stay synced with `.tw-scripture { width }` in
// studyTrail.css.
const SCRIPTURE_COL_WIDTH = 400;

// Three stops on the Step 2 trail: MPT, MPS, Main Point Pair pause.
// Order matters — STOPS index is what stopIdx derives navigation from.
const STOPS = [
  { kind: "field", fieldKey: "mpt" },
  { kind: "field", fieldKey: "mps" },
  { kind: "pause" },
];

// ── Horizontal-row geometry (DW1) ─────────────────────────────────────────
//
// Single row at y = ROW_Y. Field stops occupy the left 62% of the row span
// (so they read as "the work" before the pause); the pause stop sits at
// 88% along the row, just past MPS but with breathing room. Coordinates
// are in SVG-world space — the camera translates the world so the active
// stop lands at viewport (50%, 58%).
const ROW_Y = 360;
const ROW_LEFT = 200;
const ROW_SPAN = 1700;
const ROW_FIELD_USABLE = ROW_SPAN * 0.62;
const ROW_PAUSE_OFFSET = ROW_SPAN * 0.88;

function buildPoints() {
  const fieldStops = STOPS.filter((s) => s.kind === "field");
  const fieldCount = fieldStops.length;
  return STOPS.map((s) => {
    if (s.kind === "field") {
      const k = fieldStops.findIndex((x) => x.fieldKey === s.fieldKey);
      const t = fieldCount === 1 ? 0.5 : k / (fieldCount - 1);
      return { x: ROW_LEFT + t * ROW_FIELD_USABLE, y: ROW_Y };
    }
    return { x: ROW_LEFT + ROW_PAUSE_OFFSET, y: ROW_Y };
  });
}
const POINTS = buildPoints();

function buildPathToIndex(uptoIdx) {
  if (uptoIdx < 0) return "";
  const pts = POINTS.slice(0, uptoIdx + 1);
  if (pts.length === 0) return "";
  // Single row → straight lines all the way. No Bézier (no row change).
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  }
  return d;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const padNum = (n) => String(n).padStart(2, "0");

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

// ── Component ──────────────────────────────────────────────────────────────

export default function StudyTrailForge({
  sermon,
  mppData,
  updateMPP,
  toggleMPPNa,
  pausePoint,
  setPausePoint,
  step2Sufficiency,
  advanceStep,
  jumpToStep,
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

  // Footprints don't retract when you look back — visible trail tracks
  // furthest stop reached.
  const [maxVisitedStop, setMaxVisitedStop] = useState(0);

  // Active field on mount = first-incomplete in MAIN_POINT_PAIR_FIELDS.
  // (Most fresh sessions start at MPT; re-entry on a half-finished pair
  // lands on the right field automatically.)
  const [activeFieldKey, setActiveFieldKey] = useState(
    () => firstIncompleteFieldKey(MAIN_POINT_PAIR_FIELDS, mppData),
  );

  // Active question within the current field. Null = derive from first-
  // incomplete. Local — re-entry derives from saved envelope each time.
  const [activeQKey, setActiveQKey] = useState(null);

  // Heavy-lifting overview dismissal — MPS carries an overview block
  // (the Christ-Connection / moralism-guard framing) that fires once on
  // first arrival when MPS has no answers. Session-scoped — re-entry to
  // MPS within the same session doesn't re-fire the screen.
  const [dismissedOverviews, setDismissedOverviews] = useState(() => new Set());
  const dismissOverview = (fieldKey) => {
    setDismissedOverviews((prev) => {
      if (prev.has(fieldKey)) return prev;
      const next = new Set(prev);
      next.add(fieldKey);
      return next;
    });
  };

  // Passage popup state — passage chip in the topbar opens the existing
  // PassagePopup as a modal overlay above the trail.
  const [passageOpen, setPassageOpen] = useState(false);

  // Derive the current stop index. Pause stop wins when pausePoint flags
  // the Step 2 → Step 3 boundary; otherwise the current field's stop.
  const stopIdx = useMemo(() => {
    if (pausePoint && pausePoint.nextKey === "step_3") {
      const idx = STOPS.findIndex((s) => s.kind === "pause");
      if (idx >= 0) return idx;
    }
    const idx = STOPS.findIndex(
      (s) => s.kind === "field" && s.fieldKey === activeFieldKey,
    );
    return idx >= 0 ? idx : 0;
  }, [pausePoint, activeFieldKey]);

  const stop = STOPS[stopIdx];
  const active = POINTS[stopIdx];

  // Camera centers in the trail area (viewport minus the right scripture
  // column) so the clearing and station don't sit under the panel.
  const trailAreaW = Math.max(viewport.w - SCRIPTURE_COL_WIDTH, 720);
  const tx = trailAreaW / 2 - active.x;
  const ty = viewport.h * 0.58 - active.y;

  // Sync activeQKey to the field's first-incomplete Q whenever the field
  // changes or the saved key isn't valid. Same shape as Exegesis — explicit
  // overrides in `advance` / `lookBack` survive because the new key is
  // valid for the new field on next render.
  useEffect(() => {
    if (stop.kind !== "field") return;
    const field = MAIN_POINT_PAIR_FIELDS.find((f) => f.key === stop.fieldKey);
    if (!field) return;
    const qs = fieldQuestions(field);
    if (!activeQKey || !qs.find((q) => q.key === activeQKey)) {
      setActiveQKey(firstIncompleteQuestionKey(field, mppData));
    }
  }, [stop, activeQKey, mppData]);

  useEffect(() => {
    if (stopIdx > maxVisitedStop) setMaxVisitedStop(stopIdx);
  }, [stopIdx, maxVisitedStop]);

  // ── Navigation ─────────────────────────────────────────────────────────
  //
  // Continue/look-back walk within-Q first, then cross-field, then cross-step.
  // The trail station for a field stays active across all its Qs — within-Q
  // advance swaps the prompt + textarea in place; camera doesn't move.

  const advance = () => {
    if (stop.kind === "pause") {
      // Dismiss the Main Point Pair pause — activeStep is already 3 from the
      // prior advanceStep, so the trail unmounts and Outline (Step 3) renders.
      setPausePoint(null);
      return;
    }
    const field = MAIN_POINT_PAIR_FIELDS.find((f) => f.key === stop.fieldKey);
    const qs = fieldQuestions(field);
    const qIdx = qs.findIndex((q) => q.key === activeQKey);
    if (qIdx >= 0 && qIdx < qs.length - 1) {
      setActiveQKey(qs[qIdx + 1].key);
      return;
    }
    const fIdx = MAIN_POINT_PAIR_FIELDS.findIndex((f) => f.key === stop.fieldKey);
    if (fIdx < MAIN_POINT_PAIR_FIELDS.length - 1) {
      setActiveFieldKey(MAIN_POINT_PAIR_FIELDS[fIdx + 1].key);
      setActiveQKey(null);
      return;
    }
    // Last Q of last field → spine transition Step 2 → Step 3. StudyTab's
    // advanceStep awaits transitionState, flips activeStep, and (when the
    // trail is mounted) sets a pausePoint that brings us to the pause stop.
    advanceStep();
  };

  const lookBack = async () => {
    if (stop.kind === "pause") {
      // Pause look-back drops back to MPS last Q. Because advanceStep already
      // bumped activeStep to 3 before this pause-clearing was reached, we
      // must route through the spine to put it back at 2 — otherwise
      // clearing pausePoint here would un-mount the Forge trail (mount
      // condition: activeStep === 2 OR pp.nextKey === "step_3"). Same async-
      // await pattern as Exegesis cross-sub-phase look-back: jumpToStep
      // awaits transitionState (IPC), so a synchronous set of pausePoint /
      // activeFieldKey / activeQKey before the await would land in a
      // transient render where activeStep is still 3 and the field-key
      // sync effect would reset our explicit pick.
      if (jumpToStep) {
        await jumpToStep(2);
      }
      setPausePoint(null);
      const mps = MAIN_POINT_PAIR_FIELDS.find((f) => f.key === "mps");
      setActiveFieldKey("mps");
      if (mps) {
        const qs = fieldQuestions(mps);
        setActiveQKey(qs[qs.length - 1].key);
      }
      return;
    }
    const field = MAIN_POINT_PAIR_FIELDS.find((f) => f.key === stop.fieldKey);
    const qs = fieldQuestions(field);
    const qIdx = qs.findIndex((q) => q.key === activeQKey);
    if (qIdx > 0) {
      setActiveQKey(qs[qIdx - 1].key);
      return;
    }
    const fIdx = MAIN_POINT_PAIR_FIELDS.findIndex((f) => f.key === stop.fieldKey);
    if (fIdx > 0) {
      const priorField = MAIN_POINT_PAIR_FIELDS[fIdx - 1];
      setActiveFieldKey(priorField.key);
      const priorQs = fieldQuestions(priorField);
      setActiveQKey(priorQs[priorQs.length - 1].key);
      return;
    }
    // MPT Q1 — cross the step boundary back into Study Step 1. jumpToStep
    // routes through the spine; the Exegesis trail re-mounts and lands on
    // its last position (Implications Synthesis or the prior field walk).
    if (jumpToStep) {
      await jumpToStep(1);
    }
  };

  const isLastFieldStop =
    stop.kind === "field" &&
    MAIN_POINT_PAIR_FIELDS[MAIN_POINT_PAIR_FIELDS.length - 1].key === stop.fieldKey;
  const isLastQuestionInField = (() => {
    if (stop.kind !== "field") return false;
    const field = MAIN_POINT_PAIR_FIELDS.find((f) => f.key === stop.fieldKey);
    if (!field) return false;
    const qs = fieldQuestions(field);
    return qs[qs.length - 1].key === activeQKey;
  })();
  // Step 2 composite gate (MPT + MPS) fires only at the last Q of the last
  // field. Within-field advance never triggers the gate.
  const advanceDisabled =
    isLastFieldStop && isLastQuestionInField && !step2Sufficiency.ok;

  // Keyboard navigation — same bindings as Exegesis so the pastor's muscle
  // memory survives the step transition.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const inEditor = t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT");
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        if (!advanceDisabled) advance();
        return;
      }
      if (mod && e.key === "ArrowLeft") {
        e.preventDefault();
        lookBack();
        return;
      }
      if (e.key === "Escape" && !inEditor) {
        if (passageOpen) return;
        if (onExit) {
          e.preventDefault();
          onExit();
        }
        return;
      }
      // Cmd/Ctrl + . — toggle N/A. Only MPS Q2 (gospel_check) is N/A-able
      // in Step 2; the toggleMPPNa contract is the gatekeeper (other Qs
      // simply ignore the toggle, but the keyboard shortcut shouldn't
      // pretend to act on them).
      if (mod && e.key === ".") {
        e.preventDefault();
        if (
          stop.kind === "field" &&
          stop.fieldKey === "mps" &&
          activeQKey === "gospel_check"
        ) {
          toggleMPPNa?.(stop.fieldKey, activeQKey);
        }
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, lookBack, advanceDisabled, stop, activeQKey, toggleMPPNa, onExit, passageOpen]);

  // Pre-overview gate — MPS shows its heavy-lifting overview on first
  // arrival when no answers exist yet. Dismissal is session-scoped per
  // field key.
  const showOverview = (() => {
    if (stop.kind !== "field") return false;
    const field = MAIN_POINT_PAIR_FIELDS.find((f) => f.key === stop.fieldKey);
    if (!field?.overview) return false;
    if (dismissedOverviews.has(field.key)) return false;
    return !fieldHasAnyAnswer(field, mppData);
  })();

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
      <StepRibbon stop={stop} activeQKey={activeQKey} />
      {showOverview ? (
        <OverviewClearing
          field={MAIN_POINT_PAIR_FIELDS.find((f) => f.key === stop.fieldKey)}
          onContinue={() => dismissOverview(stop.fieldKey)}
          onLookBack={lookBack}
        />
      ) : stop.kind === "field" ? (
        <FieldClearing
          stop={stop}
          mppData={mppData}
          updateMPP={updateMPP}
          toggleMPPNa={toggleMPPNa}
          advance={advance}
          lookBack={lookBack}
          advanceDisabled={advanceDisabled}
          step2Sufficiency={step2Sufficiency}
          sermon={sermon}
          activeQKey={activeQKey}
        />
      ) : (
        <MainPointPairPause
          mppData={mppData}
          updateMPP={updateMPP}
          advance={advance}
          lookBack={lookBack}
        />
      )}
      <SaveStatus />
    </div>
  );
}

// ── Topbar (parallel to StudyTrailExegesis) ───────────────────────────────

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

// ── Step ribbon — Step 2 equivalent of Exegesis's phase ribbon ────────────
//
// Where Exegesis cycles "PHASE I/II/III/IV · LABEL", Step 2 lives at a
// single step so the eyebrow is constant. The position label still walks:
// `FIELD 01 OF 02 · Q 01 OF 02` for MPT Q1, etc.

function StepRibbon({ stop, activeQKey }) {
  let positionLabel;
  if (stop.kind === "field") {
    const fieldIdx = MAIN_POINT_PAIR_FIELDS.findIndex((f) => f.key === stop.fieldKey);
    const field = MAIN_POINT_PAIR_FIELDS[fieldIdx];
    const qs = field ? fieldQuestions(field) : [];
    const qIdx = qs.findIndex((q) => q.key === activeQKey);
    const fieldsCount = MAIN_POINT_PAIR_FIELDS.length;
    positionLabel =
      qs.length > 1 && qIdx >= 0
        ? `FIELD ${padNum(fieldIdx + 1)} OF ${padNum(fieldsCount)} · Q ${padNum(qIdx + 1)} OF ${padNum(qs.length)}`
        : `FIELD ${padNum(fieldIdx + 1)} OF ${padNum(fieldsCount)}`;
  } else {
    positionLabel = "PAUSE POINT";
  }
  return (
    <div className="tw-ribbon">
      <span className="tw-mono tw-ribbon-phase">ASSEMBLY · ANCHOR</span>
      <span className="tw-ribbon-question">
        Anchor what the text said — then turn it toward your people.
      </span>
      <span className="tw-mono tw-ribbon-pos">{positionLabel}</span>
    </div>
  );
}

// ── Trail SVG (mirror of Exegesis's TrailCanvas) ──────────────────────────

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
          const p = POINTS[i];
          const isActive = i === stopIdx;
          const isPause = s.kind === "pause";
          const ordinal =
            s.kind === "field"
              ? MAIN_POINT_PAIR_FIELDS.findIndex((f) => f.key === s.fieldKey) + 1
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

// ── Field clearing (active MPT or MPS Q) ──────────────────────────────────

function FieldClearing({
  stop,
  mppData,
  updateMPP,
  toggleMPPNa,
  advance,
  lookBack,
  advanceDisabled,
  step2Sufficiency,
  sermon,
  activeQKey,
}) {
  const field = MAIN_POINT_PAIR_FIELDS.find((f) => f.key === stop.fieldKey);
  if (!field) return null;
  const fieldIdx = MAIN_POINT_PAIR_FIELDS.findIndex((f) => f.key === stop.fieldKey);
  const fieldsCount = MAIN_POINT_PAIR_FIELDS.length;
  const questions = fieldQuestions(field);
  const activeQuestion = questions.find((q) => q.key === activeQKey) || questions[0];
  const qIdx = questions.findIndex((q) => q.key === activeQuestion?.key);
  const isMultiQ = questions.length > 1;
  const promptText = activeQuestion?.prompt || field.hint || "";
  const activeQNA = activeQuestion
    ? isQuestionNA(mppData, field.key, activeQuestion.key)
    : false;

  // Only MPS Q2 (gospel_check) is N/A-able in Step 2 per SADI. Surface the
  // link only there — offering "mark not applicable" on MPT draft would be
  // misleading.
  const showNALink =
    field.key === "mps" && activeQuestion?.key === "gospel_check";

  const onToggleNA = () => {
    if (!activeQuestion || !toggleMPPNa) return;
    toggleMPPNa(field.key, activeQuestion.key);
  };

  return (
    <div className="tw-clearing" key={`forge:${field.key}`}>
      <div className="tw-clearing-eyebrow">
        <span className="tw-mono">ASSEMBLY · ANCHOR</span>
        <span className="tw-clearing-eyebrow-sep">/</span>
        <span className="tw-mono">
          FIELD {padNum(fieldIdx + 1)} OF {padNum(fieldsCount)}
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
        {activeQNA ? (
          <div className="tw-inputs">
            <div className="tw-question tw-question-na">
              <p className="tw-question-na-message">
                Marked not applicable for this passage.
              </p>
              <p className="tw-question-na-sub">
                The moralism check is satisfied another way (typically a
                Christ-Connection Statement that already guards against
                drift). The trail walks past this one.
              </p>
            </div>
          </div>
        ) : (
          <div className="tw-inputs">
            <TrailQuestionInput
              field={field}
              question={activeQuestion}
              mppData={mppData}
              updateMPP={updateMPP}
              passage={sermon?.passage}
            />
          </div>
        )}
      </div>

      <div className="tw-clearing-actions">
        <div className="tw-clearing-actions-left">
          {/* eslint-disable-next-line sermonforge/no-raw-button */}
          <button className="tw-link-back" onClick={lookBack}>
            ← look back
          </button>
          {showNALink && toggleMPPNa && (
            /* eslint-disable-next-line sermonforge/no-raw-button */
            <button
              className="tw-link-na"
              onClick={onToggleNA}
              title={
                activeQNA
                  ? "Restore this question (Cmd/Ctrl+.)"
                  : "Mark not applicable — moralism check satisfied another way (Cmd/Ctrl+.)"
              }
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
          title={advanceDisabled ? step2Sufficiency?.reason || "" : ""}
        >
          <span>Continue</span>
          <span className="tw-advance-arrow">→</span>
        </button>
      </div>
      {advanceDisabled && (
        <div className="tw-clearing-gate">
          <AdvanceGateChecklist sufficiency={step2Sufficiency} />
        </div>
      )}
    </div>
  );
}

function TrailQuestionInput({ field, question, mppData, updateMPP, passage }) {
  const rawValue = getQuestionAnswer(mppData, field.key, question.key);
  const value = typeof rawValue === "string" ? rawValue : "";
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="tw-question tw-question-first">
      <textarea
        className="tw-question-textarea"
        value={value}
        onChange={(e) => updateMPP(field.key, question.key, e.target.value)}
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

// ── Overview clearing (MPS heavy-lifting first-arrival) ────────────────────

function OverviewClearing({ field, onContinue, onLookBack }) {
  const overview = field.overview || {};
  const fieldIdx = MAIN_POINT_PAIR_FIELDS.findIndex((f) => f.key === field.key);
  return (
    <div className="tw-clearing tw-clearing-overview" key={`overview:${field.key}`}>
      <div className="tw-clearing-eyebrow">
        <span className="tw-mono">ASSEMBLY · ANCHOR</span>
        <span className="tw-clearing-eyebrow-sep">/</span>
        <span className="tw-mono">
          FIELD {padNum(fieldIdx + 1)} OF {padNum(MAIN_POINT_PAIR_FIELDS.length)}
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

// ── Main Point Pair pause clearing (DW2) ──────────────────────────────────
//
// The named outcome of Step 2 is the pair (MPT + MPS), not a single
// synthesis sentence. The pause shows both tightened fields stacked,
// editable in-place so the pastor can refine before walking on to
// Outline. Edits route through `updateMPP` and write to the v19 envelope
// (mpt.tighten / mps.tighten); the flat-column mirror in StudyTab keeps
// downstream consumers current.

function MainPointPairPause({ mppData, updateMPP, advance, lookBack }) {
  const mptValue = (() => {
    const v = getQuestionAnswer(mppData, "mpt", "tighten");
    return typeof v === "string" ? v : "";
  })();
  const mpsValue = (() => {
    const v = getQuestionAnswer(mppData, "mps", "tighten");
    return typeof v === "string" ? v : "";
  })();

  return (
    <div className="tw-clearing tw-clearing-pause tw-clearing-pause-pair">
      <div className="tw-pause-eyebrow tw-mono">A BREATH BETWEEN STEPS</div>
      <h2 className="tw-pause-title">The Main Point Pair</h2>
      <p className="tw-pause-sub">
        Read your pair. The text said this — now the text says this to
        your people. Edit if a phrase still rings off; otherwise walk on
        into the outline.
      </p>

      <div className="tw-pair-card">
        <div className="tw-pair-row">
          <div className="tw-pair-row-label tw-mono">MPT — WHAT THE TEXT SAID</div>
          <textarea
            className="tw-pair-input"
            value={mptValue}
            onChange={(e) => updateMPP("mpt", "tighten", e.target.value)}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
            placeholder="One past-tense sentence…"
            spellCheck={false}
          />
        </div>
        <div className="tw-pair-row">
          <div className="tw-pair-row-label tw-mono">MPS — WHAT THE TEXT SAYS TO US</div>
          <textarea
            className="tw-pair-input"
            value={mpsValue}
            onChange={(e) => updateMPP("mps", "tighten", e.target.value)}
            onInput={(e) => autoResize(e.target)}
            ref={(el) => autoResize(el)}
            placeholder="One present/future-tense sentence…"
            spellCheck={false}
          />
        </div>
        <div className="tw-pause-handoff tw-mono">
          <span>BECOMES YOUR</span>
          <strong>MAIN POINT PAIR</strong>
        </div>
      </div>

      <p className="tw-pause-next">
        <span className="tw-mono">NEXT</span>
        <span> The </span>
        <em>Outline</em>
        <span> sub-phase — assembling the body — waits beyond this last bend.</span>
      </p>

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

// ── Save status ───────────────────────────────────────────────────────────

function SaveStatus() {
  return (
    <div className="tw-save tw-mono">
      <span className="tw-save-dot" />
      <span>SAVED</span>
    </div>
  );
}
