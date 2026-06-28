import { useCallback, useEffect, useMemo, useState } from "react";
import SermonWritingSurface from "./SermonWritingSurface";
import SermonMap from "./SermonMap";
import SermonStartLanding from "./SermonStartLanding";
import StudyAnchorHandoff from "./StudyAnchorHandoff";
import { FIRST_FIELD, QUESTION_WALK_ORDER, questionId } from "../utils/walkOrder";
import { deriveThoughtUnitsFromCanvas } from "../utils/studyFields";
import {
  STAGE_SUBPHASE_TO_COLUMN,
  deriveStudyOutcomesFromSermon,
  deriveStudyUnfinishedFromSermon,
} from "../utils/sermonState";

// Adapter: convert the fixture's flat {answers, thoughtUnits} into the
// sermon-record shape the production derivation helpers read. Production
// stores each region's field data as a JSON-string column on the sermon
// row; the fixture stores it as a flat in-memory object. Building a
// sermon-shaped object here lets the fixture call the same helpers
// SermonWorkspace uses — no mirror logic, no drift.
function buildSermonShapeFromFixture(answers, thoughtUnits) {
  const cols = {};
  for (const q of QUESTION_WALK_ORDER) {
    const col = STAGE_SUBPHASE_TO_COLUMN[`${q.stage}/${q.subPhase}`];
    if (!col) continue;
    if (!cols[col]) cols[col] = {};
    if (answers[q.fieldKey] && !cols[col][q.fieldKey]) {
      cols[col][q.fieldKey] = answers[q.fieldKey];
    }
  }
  // The thought-unit array lives at observations.divisions.thought_units —
  // the canonical cross-phase path. Inject the fixture's thoughtUnits there
  // so the production helpers find it without a second source.
  if (!cols.observations) cols.observations = {};
  cols.observations.divisions = {
    ...(cols.observations.divisions || {}),
    thought_units: { value: thoughtUnits, na: false },
  };
  const sermon = {};
  for (const [k, v] of Object.entries(cols)) {
    sermon[k] = JSON.stringify(v);
  }
  return sermon;
}

// Canvas seed — Romans 8:1–4 laid out with depth-marked indentation. Each
// depth-0 row's id matches a seed thought-unit's _canvas_row_id, so editing
// other rows in the canvas preserves the cumulative columns below.
const ROMANS_8_CANVAS = [
  { id: "tu-1", depth: 0, text: "There is therefore now no condemnation" },
  { id: "tu-1-mod", depth: 1, text: "for those who are in Christ Jesus." },
  { id: "tu-2", depth: 0, text: "For the law of the Spirit of life has set you free in Christ Jesus" },
  { id: "tu-2-mod", depth: 1, text: "from the law of sin and death." },
  { id: "tu-3", depth: 0, text: "For God has done what the law, weakened by the flesh, could not do." },
  { id: "tu-3-mod-a", depth: 1, text: "By sending his own Son in the likeness of sinful flesh and for sin," },
  { id: "tu-3-mod-b", depth: 1, text: "he condemned sin in the flesh," },
  { id: "tu-4", depth: 0, text: "in order that the righteous requirement of the law might be fulfilled in us," },
  { id: "tu-4-mod-a", depth: 1, text: "who walk not according to the flesh" },
  { id: "tu-4-mod-b", depth: 1, text: "but according to the Spirit." },
];

const ROMANS_8_THOUGHT_UNITS = [
  {
    _canvas_row_id: "tu-1",
    thought_unit_text: "There is therefore now no condemnation",
    meaning:
      "Paul declares the verdict for those in Christ — no condemnation, in present tense, addressed to those who have been justified. The 'therefore' binds it directly to the despair at the end of Romans 7.",
    christ_connection:
      "Christ is the one in whom there is no condemnation. The verdict isn't earned by walking right; it's announced because of who he is and what he has done.",
  },
  {
    _canvas_row_id: "tu-2",
    thought_unit_text: "For the law of the Spirit of life has set you free in Christ Jesus",
    meaning:
      "Two competing laws are named — the Spirit's law of life and the law of sin and death. The Spirit's law has prevailed in Christ Jesus, setting believers free.",
    christ_connection:
      "The Spirit's law of life is given through Christ. The freedom is located 'in Christ Jesus' — not in a moral effort that finally succeeds.",
  },
  {
    _canvas_row_id: "tu-3",
    thought_unit_text: "For God has done what the law, weakened by the flesh, could not do.",
    meaning:
      "The law could not deliver — the flesh weakened it. God did what the law could not: he condemned sin itself by sending Christ in flesh like ours, for sin.",
    // no christ_connection yet — keeps the per-unit table at partial
  },
  {
    _canvas_row_id: "tu-4",
    thought_unit_text: "in order that the righteous requirement of the law might be fulfilled in us,",
    meaning:
      "The purpose of God's act: the law's righteous requirement is fulfilled IN us (not by us), as we walk according to the Spirit instead of the flesh.",
    // no christ_connection yet
  },
];

// Loaded seed — ~30 text-prompt answers distributed across all six regions
// with varied lengths (short / medium / long) so the map can be verified
// under realistic density, not just on the easy 4-answered case.
const SEED_ANSWERS = {
  // ── OBSERVE ────────────────────────────────────────────────────────────
  divisions: {
    canvas: { value: ROMANS_8_CANVAS, na: false },
  },
  context: {
    before: {
      value:
        "Romans 7 ends with the cry 'Who will deliver me from this body of death?' — Paul has just walked through the war between the law of his mind and the law in his members. The 'therefore' at the head of chapter 8 lands directly on that despair: the answer to that cry is now no condemnation in Christ Jesus.",
      na: false,
    },
    after: {
      value:
        "Romans 8:5–11 develops the flesh/Spirit contrast in more detail, then 8:12–17 turns to adoption and sonship — these four verses are the doctrinal anchor the rest of the chapter unpacks.",
      na: false,
    },
    impact: {
      value:
        "The bind between Romans 7's despair and 8:1's verdict is the whole rhetorical force of the passage. Without the 'therefore' it reads as abstract doctrine; with it, it reads as gospel relief.",
      na: false,
    },
  },
  surface_questions: {
    where: {
      value: "No specific physical setting — Paul is writing doctrinally to the church in Rome.",
      na: false,
    },
    when: { value: "", na: true },
    how: {
      value:
        "Paul moves from declaration (v.1, no condemnation) → grounding (v.2, the Spirit's law has set you free) → mechanism (v.3, God did what the law could not) → purpose (v.4, that the law's requirement be fulfilled in us).",
      na: false,
    },
  },
  characters: {
    primary: {
      value:
        "Believers in Christ Jesus (those addressed); God (the actor in v.3); his Son (the one sent); the Spirit (the active agent of freedom); sin and the flesh (the personified opposition).",
      na: false,
    },
  },
  commands_declarations: {
    primary: {
      value:
        "Predominantly declarative. The whole passage is one extended announcement — no imperatives until later in the chapter. The pastoral move is announcement first, call later.",
      na: false,
    },
  },
  big_ideas: {
    primary: {
      value: "No condemnation. Two laws. The Son sent. Walking by Spirit, not flesh.",
      na: false,
    },
  },
  obvious_point: {
    primary: {
      value:
        "For those in Christ Jesus, the verdict is no condemnation — because God has done in Christ what the law could not do.",
      na: false,
    },
  },
  // ── INTERPRET ──────────────────────────────────────────────────────────
  deeper_context: {
    primary: {
      value:
        "Romans is Paul's most systematic letter — written to a church he hadn't yet visited, to lay out the gospel he preached. Chapters 5–8 form a unit on the implications of justification; chapter 8 is the pinnacle.",
      na: false,
    },
  },
  recurring_ideas: { primary: { value: "", na: false } },
  character_purpose: {
    primary: {
      value:
        "The Spirit is the active agent of the new covenant — not a vague presence but the one who fulfils the law's requirement IN believers as they walk in step.",
      na: false,
    },
  },
  contrasts: {
    primary: {
      value:
        "Law of the Spirit of life ↔ law of sin and death. Flesh ↔ Spirit. What the law could not do ↔ what God did in Christ.",
      na: false,
    },
  },
  cross_refs: { primary: { value: "", na: false } },
  commentary: { primary: { value: "", na: false } },
  interpretation_synthesis: {
    meaning_whole: {
      value:
        "The verdict for those in Christ Jesus is no condemnation — because God, by sending his own Son for sin, did what the law (weakened by the flesh) could not do, so that the law's righteous requirement is now being fulfilled in us through the Spirit.",
      na: false,
    },
  },

  // ── REDEMPTIVE THREAD ──────────────────────────────────────────────────
  this_passage_and_christ: {
    position: {
      value:
        "After Christ. Paul writes as a post-resurrection apostle interpreting what Christ's death and resurrection accomplished.",
      na: false,
    },
    direct_speech: {
      value:
        "Yes — 'in Christ Jesus' (vv. 1–2), and 'his own Son' sent 'in the likeness of sinful flesh and for sin' (v. 3). Christ is named as the location of the no-condemnation verdict and the means of God's act.",
      na: false,
    },
  },
  passage_points_to_christ: {
    biblical_theme: {
      value: "Justification by faith; the Spirit; sonship; the new covenant.",
      na: false,
    },
    promise: {
      value:
        "The new-covenant promise of the Spirit (Jer 31, Ezek 36) — the law written on the heart, the Spirit causing the people to walk in God's statutes.",
      na: false,
    },
    type: { value: "", na: true },
    predictive: { value: "", na: true },
  },
  gospel_makes_possible: { primary: { value: "", na: false } },
  need_and_character: {
    human_need: {
      value:
        "We need deliverance from condemnation we cannot escape under the law because of the weakness of our flesh.",
      na: false,
    },
    god_character: {
      value:
        "God is the just judge who has spoken the verdict — but also the merciful one who himself provides the means by which the verdict is no-condemnation. Romans 3:26: just and the justifier.",
      na: false,
    },
  },
  christ_connection_statement: {
    statement: {
      value:
        "The whole passage points to Christ because the verdict (no condemnation) is located IN him, the act of God (sending his Son) is FOR sin in him, and the fulfilment of the law's requirement is the Spirit's work in those who are joined to him. Christ is the hero — the one in whom God did what the law could not.",
      na: false,
    },
  },

  // ── IMPLICATIONS ───────────────────────────────────────────────────────
  theological_significance: {
    about_god: {
      value: "God is just and the justifier — he does not waive the law's requirement, he fulfils it in Christ.",
      na: false,
    },
    about_christ: {
      value: "Christ is the one who bore the condemnation of sin and in whom the no-condemnation verdict is announced.",
      na: false,
    },
    about_ourselves: { value: "", na: false },
    timeless: { value: "", na: false },
    doctrines: { value: "", na: false },
  },
  personal_implications: {
    follow: { value: "Walk by the Spirit, not by the flesh.", na: false },
    forsake: { value: "", na: false },
    receive: { value: "", na: false },
    settle: { value: "", na: false },
  },
  pastoral_context: {
    room: { value: "", na: false },
    cost_and_gift: { value: "", na: false },
  },
  implications_synthesis: {
    synthesis: { value: "", na: false },
  },

  // ── ASSEMBLY: ANCHOR (MPT/MPS) ─────────────────────────────────────────
  mpt: {
    draft: {
      value:
        "Paul declared to the believers in Rome that for those in Christ Jesus there is now no condemnation, because God himself has done in Christ what the law could not — condemning sin in the flesh of his own Son, so that the law's righteous requirement is fulfilled in those who walk by the Spirit.",
      na: false,
    },
    tighten: { value: "", na: false },
  },
  // mps, sermon_frame intro/conclusion — unseeded
};

// Fixture query params (preview only):
//   ?surface=writing                           → first-session simulation —
//                                                null last-touched, sermon-
//                                                start fires
//   ?surface=writing&reentry=ccs               → re-entry simulation — last-
//                                                touched preset to CCS, lands
//                                                there, no sermon-start, no
//                                                map auto-open
//   ?surface=writing&field=ccs                 → direct route to CCS,
//                                                bypasses re-entry logic
//                                                (visual testing)
//   ?surface=writing&field=divisions           → direct route to Divisions
//   ?surface=writing&field=interpret-first     → direct route to Interpret
//                                                first field (region-frame
//                                                test)
//   ?surface=writing&start=1                   → force sermon-start regardless
//                                                of last-touched
//   ?surface=writing&handoff=1                 → force Study→Anchor handoff
//   ?surface=writing&field=ccs&units=0         → CCS with no thought units
//                                                (Option A unmet-state)
const FIRST_FIELD_POSITION = {
  stage: FIRST_FIELD.stage,
  subPhase: FIRST_FIELD.subPhase,
  fieldKey: FIRST_FIELD.key,
};

const NAMED_POSITIONS = {
  ccs: { stage: "Study", subPhase: "RedemptiveThread", fieldKey: "christ_connection_statement" },
  divisions: { stage: "Study", subPhase: "Observe", fieldKey: "divisions" },
  "interpret-first": { stage: "Study", subPhase: "Interpret", fieldKey: "deeper_context" },
  "anchor-first": { stage: "Assembly", subPhase: "Anchor", fieldKey: "mpt" },
};

function readInitialPosition() {
  if (typeof window === "undefined") return FIRST_FIELD_POSITION;
  const params = new URLSearchParams(window.location.search);
  const field = params.get("field");
  if (field && NAMED_POSITIONS[field]) return NAMED_POSITIONS[field];
  if (params.get("handoff") === "1") return NAMED_POSITIONS["anchor-first"];
  const reentry = params.get("reentry");
  if (reentry && NAMED_POSITIONS[reentry]) return NAMED_POSITIONS[reentry];
  return FIRST_FIELD_POSITION;
}

// last_touched_position — the new named field that drives re-entry routing.
// Reading null means "first session, never visited"; routing falls through
// to the sermon-start landing. Reading a non-null value means "returning
// preacher"; route to that position without firing sermon-start.
//
// last_touched_position is the v23 D1-added field that drives session re-entry routing. `current_step` was deleted in trail deletion sweep Phase B2 (2026-05-17); position is now (current_stage, current_sub_phase) at the column level + last_touched_position at the field level.
function readInitialLastTouched() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const reentry = params.get("reentry");
  if (reentry && NAMED_POSITIONS[reentry]) return NAMED_POSITIONS[reentry];
  // Direct ?field=X / ?handoff=1 / ?start=1 routes set last-touched too —
  // they're explicit "preacher is here" simulations.
  const field = params.get("field");
  if (field && NAMED_POSITIONS[field]) return NAMED_POSITIONS[field];
  if (params.get("handoff") === "1") return NAMED_POSITIONS["anchor-first"];
  // Default and ?start=1: null last-touched → sermon-start fires.
  return null;
}

// Sermon-start fires when there is no last-touched value (first session) or
// when explicitly forced via ?start=1.
function readShowStartLanding() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("start") === "1") return true;
  return readInitialLastTouched() === null;
}

function readInitialThoughtUnits() {
  if (typeof window === "undefined") return ROMANS_8_THOUGHT_UNITS;
  const units = new URLSearchParams(window.location.search).get("units");
  if (units === "0") return [];
  return ROMANS_8_THOUGHT_UNITS;
}

// When the fixture is asked to start in the "no thought units yet" state we
// also clear the canvas so the unmet narrative ("you haven't laid out the
// passage yet") matches what the preacher would actually be looking at on
// landing.
function readInitialAnswers() {
  const base = SEED_ANSWERS;
  if (typeof window === "undefined") return base;
  const units = new URLSearchParams(window.location.search).get("units");
  if (units !== "0") return base;
  const { divisions: _drop, ...rest } = base;
  return rest;
}

// Per-question state for the map. Dispatch by question.kind per the principle
// logged in walkOrder.js: text-prompt reads the nominal column; cumulative-
// synthesis-table reads the cross-phase source (the thought-unit array).
function deriveQuestionStates(answers, thoughtUnits) {
  const out = {};
  for (const entry of QUESTION_WALK_ORDER) {
    const id = questionId(entry);
    if (entry.kind === "cumulative-synthesis-table") {
      const editableKey = entry.columns?.find((c) => !c.readOnly)?.key;
      const units = Array.isArray(thoughtUnits) ? thoughtUnits : [];
      if (units.length === 0 || !editableKey) {
        out[id] = { state: "unanswered" };
        continue;
      }
      const filled = units.filter((u) => {
        const v = u?.[editableKey];
        return v != null && String(v).trim() !== "";
      });
      if (filled.length === 0) {
        out[id] = { state: "unanswered" };
      } else if (filled.length === units.length) {
        const sample = String(filled[0][editableKey]);
        const full = units.map((u) => String(u[editableKey] ?? "")).join("\n\n");
        out[id] = { state: "answered", preview: sample, fullValue: full };
      } else {
        const sample = String(filled[0][editableKey]);
        const full = units
          .map((u, i) => `Unit ${i + 1}: ${u[editableKey] ?? "—"}`)
          .join("\n\n");
        out[id] = { state: "partial", preview: sample, fullValue: full };
      }
    } else {
      const a = answers?.[entry.fieldKey]?.[entry.questionKey];
      if (a?.na) {
        out[id] = { state: "answered", preview: "(not applicable)" };
        continue;
      }
      const v = a?.value;
      if (v == null || String(v).trim() === "") {
        out[id] = { state: "unanswered" };
      } else {
        const str = String(v);
        out[id] = { state: "answered", preview: str, fullValue: str };
      }
    }
  }
  return out;
}

export default function SermonWritingSurfaceFixture() {
  const [position, setPosition] = useState(readInitialPosition);
  const [answers, setAnswers] = useState(readInitialAnswers);
  const [thoughtUnits, setThoughtUnits] = useState(readInitialThoughtUnits);
  const [mapOpen, setMapOpen] = useState(false);
  // Mirrors production: a door jump stashes its origin for the return banner.
  const [returnTo, setReturnTo] = useState(null);
  const [startLandingOpen, setStartLandingOpen] = useState(readShowStartLanding);
  const [handoffOpen, setHandoffOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("handoff") === "1";
  });
  // last_touched_position — populated on arrival at any field. In production
  // this writes to the new named column on the sermon record; the fixture
  // tracks it locally so the boot routing (null → sermon-start, non-null →
  // land on the position) can be verified.
  const [lastTouchedPosition, setLastTouchedPosition] = useState(
    readInitialLastTouched
  );
  useEffect(() => {
    setLastTouchedPosition(position);
  }, [position.stage, position.subPhase, position.fieldKey]);

  const handleAnswerChange = useCallback(
    (fieldKey, questionKey, envelope) => {
      setAnswers((prev) => ({
        ...prev,
        [fieldKey]: {
          ...(prev[fieldKey] || {}),
          [questionKey]: envelope,
        },
      }));
    },
    []
  );

  const handleUnitColumnChange = useCallback(
    (_questionKey, unitIdx, columnKey, value) => {
      setThoughtUnits((prev) => {
        const next = prev.slice();
        next[unitIdx] = { ...next[unitIdx], [columnKey]: value };
        return next;
      });
    },
    []
  );

  // The canvas is stored under the field's question answer like any other
  // value. The thought-unit array is derived from it via the canonical
  // helper — same shape as setDivisionsCanvas uses; one derivation, not two.
  const handleCanvasChange = useCallback(
    (fieldKey, questionKey, rows) => {
      setAnswers((prev) => ({
        ...prev,
        [fieldKey]: {
          ...(prev[fieldKey] || {}),
          [questionKey]: { value: rows, na: false },
        },
      }));
      setThoughtUnits((prev) => deriveThoughtUnitsFromCanvas(rows, prev));
    },
    []
  );

  const fieldAnswers = useMemo(
    () => answers[position.fieldKey] ?? {},
    [answers, position.fieldKey]
  );

  const questionStates = useMemo(
    () => deriveQuestionStates(answers, thoughtUnits),
    [answers, thoughtUnits]
  );

  const handleJump = useCallback((next) => {
    setReturnTo(null);
    setPosition(next);
    setMapOpen(false);
    setHandoffOpen(false);
  }, []);

  // Ordinary navigation (chevron / reference pane) clears any pending return.
  const handlePositionChange = useCallback((next) => {
    setReturnTo(null);
    setPosition(next);
  }, []);

  // A door jump stashes where it came from; the return banner brings it back.
  const handleDoorJump = useCallback((next, origin) => {
    setReturnTo(origin);
    setPosition(next);
  }, []);

  const handleReturn = useCallback(() => {
    setReturnTo((origin) => {
      if (origin) setPosition(origin);
      return null;
    });
  }, []);

  const sermonShape = useMemo(
    () => buildSermonShapeFromFixture(answers, thoughtUnits),
    [answers, thoughtUnits]
  );
  const studyOutcomes = useMemo(
    () => deriveStudyOutcomesFromSermon(sermonShape),
    [sermonShape]
  );
  const studyUnfinished = useMemo(
    () => deriveStudyUnfinishedFromSermon(sermonShape),
    [sermonShape]
  );

  return (
    <>
      <SermonWritingSurface
        stage={position.stage}
        subPhase={position.subPhase}
        fieldKey={position.fieldKey}
        reference={{ passage: "Romans 8:1-4", outcomes: studyOutcomes, mpt: "", mps: "" }}
        fieldAnswers={fieldAnswers}
        thoughtUnits={thoughtUnits}
        onAnswerChange={handleAnswerChange}
        onUnitColumnChange={handleUnitColumnChange}
        onCanvasChange={handleCanvasChange}
        onPositionChange={handlePositionChange}
        onDoorJump={handleDoorJump}
        returnTo={returnTo}
        onReturn={handleReturn}
        onOpenMap={() => setMapOpen(true)}
      />
      {mapOpen && (
        <SermonMap
          questionStates={questionStates}
          currentPosition={position}
          onJump={handleJump}
          onClose={() => setMapOpen(false)}
        />
      )}
      {startLandingOpen && (
        <SermonStartLanding onBegin={() => setStartLandingOpen(false)} />
      )}
      {handoffOpen && (
        <StudyAnchorHandoff
          passage="Romans 8:1–4"
          outcomes={studyOutcomes}
          unfinished={studyUnfinished}
          onJump={handleJump}
          onClose={() => setHandoffOpen(false)}
        />
      )}
    </>
  );
}
