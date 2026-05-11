// WorkspaceTrailMap — WTC DW11.
//
// A clean single-screen overview of the entire sermon trail: the three
// stages (Study, Assembly, Manuscript) drawn as a horizontal switchback
// with sub-phase stops and named-outcome labels. The pastor's current
// position is pinned. No data values, no progress bars, no per-field
// granularity — the map is an at-a-glance frame, not a status panel.
//
// DW11's "clean or doesn't ship" governs every decision here: if a
// detail doesn't add to the at-a-glance read, it stays out. Stops are
// pause-clearings (one per sub-phase outcome); fields are not drawn.
// The visited-vs-unvisited distinction is opacity only, no checkmarks
// or labels — the eye reads completion as warmth, not as a checklist.

import { STAGE, SUB_PHASE } from "../core/contracts";

// Geometry — single SVG canvas, three rows alternating direction so the
// metaphor matches the trail's switchback. Coordinates are arbitrary
// viewBox units; the SVG scales to fit the modal.
const W = 1100;
const H = 540;
const PAD_X = 100;
const ROW_Y = [170, 320, 470];
const BEND = 80;

const STAGES = [
  {
    key: STAGE.Study,
    label: "Study",
    subtitle: "Walk the text",
    dir: 1,
    rowY: ROW_Y[0],
    stops: [
      { key: "observe",     label: "Observe",            outcome: "Observation Set" },
      { key: "interpret",   label: "Interpret",          outcome: "Interpretation Set" },
      { key: "redemptive",  label: "Redemptive Thread",  outcome: "Christ-Connection Statement" },
      { key: "implications",label: "Implications",       outcome: "Implications Synthesis" },
    ],
  },
  {
    key: STAGE.Assembly,
    label: "Assembly",
    subtitle: "Build the sermon",
    dir: -1,
    rowY: ROW_Y[1],
    stops: [
      { key: SUB_PHASE.Anchor,  label: "Anchor",  outcome: "Main Point Pair" },
      { key: SUB_PHASE.Outline, label: "Outline", outcome: "Sermon Outline" },
      { key: SUB_PHASE.Equip,   label: "Equip",   outcome: "Sermon Body" },
      { key: SUB_PHASE.Frame,   label: "Frame",   outcome: "Sermon Frame" },
    ],
  },
  {
    key: STAGE.Manuscript,
    label: "Manuscript",
    subtitle: "Write it",
    dir: 1,
    rowY: ROW_Y[2],
    stops: [
      { key: "writing_room", label: "The Writing Room", outcome: "Ready to preach" },
    ],
  },
];

// Per-stage point layout — distribute the stops across the row width,
// preserving direction so the switchback alternates left-to-right ↔
// right-to-left across rows.
function pointsForStage(stage) {
  const usable = W - PAD_X * 2;
  const n = stage.stops.length;
  return stage.stops.map((s, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const tt = stage.dir === 1 ? t : 1 - t;
    return { ...s, x: PAD_X + tt * usable, y: stage.rowY };
  });
}

// Path string for the whole switchback — straight lines within each row,
// rounded bends crossing to the next.
function buildSwitchbackPath(stagePoints) {
  let d = "";
  stagePoints.forEach((pts, si) => {
    if (pts.length === 0) return;
    if (si === 0) {
      d += `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    } else {
      const prev = stagePoints[si - 1];
      const last = prev[prev.length - 1];
      const first = pts[0];
      const c1x = last.x + (first.x > last.x ? BEND : -BEND);
      const c1y = last.y;
      const c2x = first.x + (last.x > first.x ? BEND : -BEND);
      const c2y = first.y;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
    }
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
  });
  return d;
}

// Best-effort "where am I" read from the sermon. Returns a stable
// `{stageKey, stopKey}` pointer used to highlight the active stop and
// fade the unvisited tail.
function locate(sermon) {
  const stage = sermon?.current_stage || STAGE.Study;
  if (stage === STAGE.Manuscript) {
    return { stageKey: STAGE.Manuscript, stopKey: "writing_room" };
  }
  if (stage === STAGE.Assembly) {
    return { stageKey: STAGE.Assembly, stopKey: sermon?.current_sub_phase || SUB_PHASE.Anchor };
  }
  const sp = sermon?.current_sub_phase;
  const studyMap = {
    [SUB_PHASE.Observe]: "observe",
    [SUB_PHASE.Interpret]: "interpret",
    [SUB_PHASE.RedemptiveThread]: "redemptive",
    [SUB_PHASE.Implications]: "implications",
  };
  return { stageKey: STAGE.Study, stopKey: studyMap[sp] || "observe" };
}

export default function WorkspaceTrailMap({ sermon, onClose }) {
  const stagePoints = STAGES.map(pointsForStage);
  const path = buildSwitchbackPath(stagePoints);
  const here = locate(sermon);

  // Flat ordered list of all stops with their stage so we can compute
  // "before / at / after current" for the visited-fade.
  const flat = STAGES.flatMap((stage, si) =>
    stagePoints[si].map((p) => ({ ...p, stageKey: stage.key, stageIdx: si })),
  );
  const hereIdx = flat.findIndex((p) => p.stageKey === here.stageKey && p.key === here.stopKey);

  return (
    <div className="tw-map-backdrop" role="dialog" aria-modal="true" aria-label="Sermon trail map">
      <div className="tw-map-modal">
        <header className="tw-map-header">
          <div>
            <div className="tw-map-eyebrow tw-mono">THE SERMON TRAIL</div>
            <h2 className="tw-map-title">From text to manuscript.</h2>
          </div>
          {/* eslint-disable-next-line sermonforge/no-raw-button */}
          <button className="tw-map-close" onClick={onClose} aria-label="Close trail map">×</button>
        </header>
        <svg
          className="tw-map-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="tw-map-path-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"  stopColor="var(--gold)"        stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--gold-bright)" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Stage band labels along the left edge. */}
          {STAGES.map((stage, si) => (
            <g key={`band-${stage.key}`}>
              <text
                x={36}
                y={stage.rowY - 6}
                className="tw-map-stage-label tw-mono"
              >
                {stage.label.toUpperCase()}
              </text>
              <text
                x={36}
                y={stage.rowY + 14}
                className="tw-map-stage-sub"
              >
                {stage.subtitle}
              </text>
              {si < STAGES.length - 1 && (
                <line
                  x1={28}
                  x2={W - 28}
                  y1={(stage.rowY + STAGES[si + 1].rowY) / 2 - 16}
                  y2={(stage.rowY + STAGES[si + 1].rowY) / 2 - 16}
                  className="tw-map-band-divider"
                />
              )}
            </g>
          ))}

          {/* The switchback path. */}
          <path d={path} className="tw-map-path" />

          {/* Stops. */}
          {flat.map((p, i) => {
            const isHere = i === hereIdx;
            const isVisited = hereIdx >= 0 && i < hereIdx;
            return (
              <g key={`${p.stageKey}-${p.key}`} transform={`translate(${p.x} ${p.y})`}>
                {isHere && (
                  <>
                    <circle r="22" className="tw-map-stop-glow" />
                    <circle r="14" className="tw-map-stop-glow tw-map-stop-glow-2" />
                  </>
                )}
                <circle
                  r={isHere ? 10 : 6}
                  className={`tw-map-stop ${isHere ? "is-here" : isVisited ? "is-visited" : ""}`}
                />
                <text
                  x={0}
                  y={-22}
                  textAnchor="middle"
                  className={`tw-map-stop-label tw-mono ${isHere ? "is-here" : ""}`}
                >
                  {p.label.toUpperCase()}
                </text>
                <text
                  x={0}
                  y={36}
                  textAnchor="middle"
                  className={`tw-map-stop-outcome ${isHere ? "is-here" : ""}`}
                >
                  {p.outcome}
                </text>
              </g>
            );
          })}
        </svg>
        <footer className="tw-map-footer">
          <span className="tw-mono">YOU ARE HERE</span>
          <span className="tw-map-here-label">
            {hereIdx >= 0 ? flat[hereIdx].label : "Not yet started"}
            {hereIdx >= 0 && (
              <>
                {" — "}
                <em>{STAGES.find((s) => s.key === flat[hereIdx].stageKey)?.label}</em>
              </>
            )}
          </span>
        </footer>
      </div>
    </div>
  );
}
