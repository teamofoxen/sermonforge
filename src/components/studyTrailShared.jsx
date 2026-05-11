// Shared primitives for the switchback-trail rendering. Used by every
// trail component (Exegesis, Assembly's sub-phase trails) so the visual
// language and pastor-facing behavior stay continuous across the walk.
//
// What lives here:
//   - `SCRIPTURE_COL_WIDTH` — the camera-math constant. Must stay synced
//     with `.tw-scripture { width }` in studyTrail.css.
//   - `padNum` — zero-padded ordinal helper.
//   - `firstIncompleteFieldKey` / `firstIncompleteQuestionKey` /
//     `fieldHasAnyAnswer` — re-entry heuristics. A trail mounting on a
//     half-finished sermon lands on the right field + question without
//     blowing past saved work.
//   - `useViewportSize` — viewport tracking for camera math.
//   - `TrailTopBar` — the 62px ink topbar (passage chip / title / × exit).
//   - `TrailDefs` — the shared `<defs>` block (mist gradient + paper
//     grain pattern) every trail SVG paints into.
//   - `Station` — the SVG dot drawn at every stop. Field stations render
//     a circle + ordinal; pause stations render a circle with a tick.

import { useEffect, useState } from "react";
import {
  fieldQuestions,
  getQuestionAnswer,
  isQuestionNA,
  flattenAnswerValue,
  DEFAULT_QUESTION_KEY,
} from "../utils/studyFields";

export const SCRIPTURE_COL_WIDTH = 400;

export const padNum = (n) => String(n).padStart(2, "0");

export function firstIncompleteFieldKey(fields, data) {
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

export function firstIncompleteQuestionKey(field, data) {
  const qs = fieldQuestions(field);
  for (const q of qs) {
    if (isQuestionNA(data, field.key, q.key)) continue;
    if (!flattenAnswerValue(getQuestionAnswer(data, field.key, q.key))) {
      return q.key;
    }
  }
  return qs[0]?.key ?? DEFAULT_QUESTION_KEY;
}

export function fieldHasAnyAnswer(field, data) {
  const qs = fieldQuestions(field);
  for (const q of qs) {
    if (isQuestionNA(data, field.key, q.key)) continue;
    if (flattenAnswerValue(getQuestionAnswer(data, field.key, q.key))) return true;
  }
  return false;
}

export function useViewportSize() {
  const [viewport, setViewport] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  });
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return viewport;
}

// Re-seed `activeQKey` to the field's first-incomplete Q whenever the
// field changes or the saved key isn't valid for the new field. Explicit
// overrides in advance / lookBack survive because the new key is valid
// for the new field on the next render.
export function useSyncActiveQuestion(stop, activeQKey, setActiveQKey, fieldDefForStop, dataForStop) {
  useEffect(() => {
    const field = fieldDefForStop();
    if (!field) return;
    const data = dataForStop();
    const qs = fieldQuestions(field);
    if (!activeQKey || !qs.find((q) => q.key === activeQKey)) {
      setActiveQKey(firstIncompleteQuestionKey(field, data));
    }
    // fieldDefForStop / dataForStop are stable closures captured at call
    // site; the effect re-fires when `stop` or `activeQKey` change. Data
    // is read fresh each fire — no stale closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop, activeQKey]);
}

// Shared keyboard bindings for the trail clearings:
//   Cmd/Ctrl + Enter      → advance (unless gate blocked)
//   Cmd/Ctrl + ArrowLeft  → look back
//   Escape                → exit (when not in editor + no modal open)
//   Cmd/Ctrl + .          → onTogglePass (caller decides scope)
export function useTrailKeyboard({
  advance, lookBack, advanceDisabled, onExit, onTogglePass, modalOpen,
}) {
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
        if (modalOpen) return;
        if (onExit) {
          e.preventDefault();
          onExit();
        }
        return;
      }
      if (mod && e.key === ".") {
        e.preventDefault();
        onTogglePass?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, lookBack, advanceDisabled, onExit, onTogglePass, modalOpen]);
}

export function TrailTopBar({ sermon, onExit, onPassageClick }) {
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

// SVG <defs> shared across every trail canvas. Mist + paper-grain colors
// flow through CSS classes so dark mode re-tints them via the parchment
// tokens — hardcoded light stops here would burn through dark mode as a
// bright spotlight halo around the active clearing.
export function TrailDefs() {
  return (
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
  );
}

// Stage overview — fires once per session when a trail mounts following
// a cross-stage handoff (DW12). Frames the stage the pastor is entering:
// names the work, the shape, and the named outcomes that travel forward.
// Same shell (topbar + scripture column) as the active clearing; the
// overview replaces the body area until the pastor dismisses it.
//
// `stageKey` is the sessionStorage namespace — distinct per stage so
// Assembly and Manuscript fire independently. The hook returns a tuple of
// `[seen, markSeen]`; consumers render the overview when `!seen` and call
// `markSeen()` from the continue affordance. SessionStorage persists for
// the active app session and resets on browser/Electron close — matching
// the charter's "once per session" wording.
export function useStageOverviewSeen(stageKey) {
  const storageKey = `sf_stage_overview_${stageKey}_seen`;
  const [seen, setSeen] = useState(() => {
    try {
      return typeof window !== "undefined" && window.sessionStorage?.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const markSeen = () => {
    setSeen(true);
    try { window.sessionStorage?.setItem(storageKey, "1"); } catch { /* private mode etc. */ }
  };
  return [seen, markSeen];
}

export function StageOverview({
  eyebrow,           // "ENTERING ASSEMBLY" / "ENTERING THE WRITING ROOM"
  title,             // "Assembly — where the sermon takes shape."
  body,              // descriptive paragraph
  outcomes,          // [{ label, text }, ...] — the named outcomes this stage will produce
  carriedForward,    // optional [{ label, text }, ...] — outcomes already produced in prior stages
  continueLabel,     // "Walk into Assembly" / "Walk into the writing room"
  onContinue,
}) {
  return (
    <div className="tw-clearing tw-clearing-stage-overview">
      <div className="tw-stage-marker" aria-hidden="true" />
      <div className="tw-pause-eyebrow tw-stage-eyebrow tw-mono">{eyebrow}</div>
      <h2 className="tw-pause-title tw-stage-title">{title}</h2>
      <p className="tw-pause-sub tw-stage-sub">{body}</p>
      {outcomes && outcomes.length > 0 && (
        <div className="tw-stage-overview-section">
          <div className="tw-stage-overview-section-label tw-mono">YOU WILL PRODUCE</div>
          <ul className="tw-stage-overview-list">
            {outcomes.map((o) => (
              <li key={o.label}>
                <span className="tw-stage-overview-outcome-label tw-mono">{o.label}</span>
                <span className="tw-stage-overview-outcome-text">{o.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {carriedForward && carriedForward.length > 0 && (
        <div className="tw-stage-overview-section">
          <div className="tw-stage-overview-section-label tw-mono">YOU ALREADY HAVE</div>
          <ul className="tw-stage-overview-list">
            {carriedForward.map((o) => (
              <li key={o.label}>
                <span className="tw-stage-overview-outcome-label tw-mono">{o.label}</span>
                <span className="tw-stage-overview-outcome-text">{o.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="tw-clearing-actions">
        {/* eslint-disable-next-line sermonforge/no-raw-button */}
        <button className="tw-advance" onClick={onContinue}>
          <span>{continueLabel}</span>
          <span className="tw-advance-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

// Stage-boundary pause — the heavier visual register used at Study →
// Assembly and Assembly → Manuscript. Distinguished from the sub-phase
// `PauseClearing` (lightweight "A BREATH BETWEEN PHASES") by a wider
// card, a gold hairline marker, the "A THRESHOLD" eyebrow, and a
// multi-outcome read-back instead of a single synthesis input. The
// stage's terminal named outcome (Implications Synthesis / Sermon Frame)
// stays editable inline so the pastor can refine the last piece before
// crossing the bend.
//
// Each row passes its own `content` node so the caller controls whether
// it renders read-back text, an editable input, or a paired sub-shape
// (Frame's Intro + Conclusion). Keeping content opaque to this component
// avoids growing a prop-flag surface for every read-back variation.
export function StageBoundaryPause({
  eyebrow = "A THRESHOLD",
  title,
  body,
  rows,
  nextLabel,
  advanceLabel,
  advance,
  lookBack,
}) {
  return (
    <div className="tw-clearing tw-clearing-stage-pause">
      <div className="tw-stage-marker" aria-hidden="true" />
      <div className="tw-pause-eyebrow tw-stage-eyebrow tw-mono">{eyebrow}</div>
      <h2 className="tw-pause-title tw-stage-title">{title}</h2>
      <p className="tw-pause-sub tw-stage-sub">{body}</p>
      <div className="tw-stage-outcomes">
        {rows.map((row, i) => (
          <div className="tw-stage-outcome" key={row.label || i}>
            <div className="tw-stage-outcome-label tw-mono">{row.label}</div>
            <div className="tw-stage-outcome-body">{row.content}</div>
          </div>
        ))}
      </div>
      <p className="tw-pause-next tw-stage-next">
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

export function Station({ point, isActive, isPause, ordinal, distance }) {
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

