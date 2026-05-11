// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import * as React from "react";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Trail-layer integration tests (added 2026-05-11 post-WTC audit).
//
// Audit finding: spine contracts (Process #1 monotonic, #2 evidence-gated,
// Mutation #1 user-typing-wins) are unit-tested in isolation against
// validateAndCommit. The trail UI on top of the spine has thinner
// coverage — no test trace asserts that the trail components actually
// route through transitionState rather than bypassing it. If a refactor
// silently dropped transitionState from `advanceSubPhase` or
// `handleTabChange`, the spine tests would still pass while the pastor's
// experience silently breaks (advance without evidence-gate; movement
// without monotonicity check).
//
// This file fills that gap. Two flavors:
//   • Live integration tests mount the trail components against the test-
//     spine fixture and confirm the canonical trail shell renders at each
//     stage. These prove the wiring is live end-to-end without driving
//     deep navigation through field-by-field clicks (too brittle per the
//     decision recorded in process-2-evidence-gated-ux.test.tsx).
//   • Source-level structural checks read the trail components and
//     enforce that the spine functions (`transitionState`, `onTabChange`)
//     are referenced in the advance / look-back paths. These catch the
//     regression class above — accidental bypass — at parse time.
//
// Note: uses React.createElement instead of JSX (rolldown SSR transform).

const SRC_COMPONENTS = path.resolve(__dirname, "..", "..", "src", "components");

function readSource(rel: string): string {
  return fs.readFileSync(path.join(SRC_COMPONENTS, rel), "utf8");
}

describe("Trail-layer integration: trail shells mount at every stage", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("StudyTrailExegesis mounts the trail shell at Study / Observe", async () => {
    const sermonId = insertSermonRow({
      title: "Trail mount — Study",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
      observations: '{"context":"seed"}',
    });

    const SermonWorkspaceMod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace =
      (SermonWorkspaceMod as any).default || (SermonWorkspaceMod as any).SermonWorkspace;

    const { container } = (await act(async () =>
      render(
        React.createElement(SermonWorkspace, { sermonId, onClose: () => {} }),
      ),
    )) as unknown as { container: HTMLElement };

    // Trail shell is the canonical signal that the trail surface is the
    // active rendering — not the retired three-column shell.
    expect(container.querySelector(".tw-shell")).toBeTruthy();
  });

  it("AssemblyTrail mounts the trail shell at Assembly / Anchor", async () => {
    const sermonId = insertSermonRow({
      title: "Trail mount — Assembly",
      current_stage: STAGE.Assembly,
      current_sub_phase: SUB_PHASE.Anchor,
      // Seed Study evidence so the (legacy) gate doesn't reject re-mount.
      observations: '{"context":"seed"}',
      interpretation: '{"deeper_context":"seed"}',
      redemptive_thread: '{"this_passage_and_christ":"seed"}',
      implications: '{"theological_significance":"seed"}',
    });

    const SermonWorkspaceMod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace =
      (SermonWorkspaceMod as any).default || (SermonWorkspaceMod as any).SermonWorkspace;

    const { container } = (await act(async () =>
      render(
        React.createElement(SermonWorkspace, { sermonId, onClose: () => {} }),
      ),
    )) as unknown as { container: HTMLElement };

    expect(container.querySelector(".tw-shell")).toBeTruthy();
  });

  it("ManuscriptTrail mounts the writing-room shell at Manuscript", async () => {
    const sermonId = insertSermonRow({
      title: "Trail mount — Manuscript",
      current_stage: STAGE.Manuscript,
      observations: '{"context":"seed"}',
      interpretation: '{"deeper_context":"seed"}',
      redemptive_thread: '{"this_passage_and_christ":"seed"}',
      implications: '{"theological_significance":"seed"}',
      mpt: "seed",
      mps: "seed",
      outline: '[{"id":"p1","text":"Point 1"}]',
    });

    const SermonWorkspaceMod = await import("../../src/components/SermonWorkspace");
    const SermonWorkspace =
      (SermonWorkspaceMod as any).default || (SermonWorkspaceMod as any).SermonWorkspace;

    const { container } = (await act(async () =>
      render(
        React.createElement(SermonWorkspace, { sermonId, onClose: () => {} }),
      ),
    )) as unknown as { container: HTMLElement };

    // Manuscript renders the writing-room variant of the trail shell.
    // The stage-overview clearing fires once per session on first arrival
    // and mounts inside the plain `.tw-shell`; either is acceptable as a
    // mount signal because both prove the trail surface is the active
    // rendering (WTC DW5 vs DW12).
    const writingRoom = container.querySelector(".tw-shell-writing-room");
    const baseShell = container.querySelector(".tw-shell");
    expect(writingRoom || baseShell).toBeTruthy();
  });
});

describe("Trail-layer structural: advance paths route through the spine", () => {
  // Each trail's `advanceSubPhase` (Study sub-phases + Assembly sub-phases)
  // and the workspace's `handleTabChange` (stage transitions) MUST call
  // `transitionState` so Process #1 (monotonic) and Process #2 (evidence-
  // gated) hold. These tests guard against silent removal — a refactor
  // that drops the `await transitionState(...)` call would land green on
  // the spine's contract tests because nothing calls into them.

  it("SermonWorkspace.handleTabChange awaits transitionState", () => {
    const src = readSource("SermonWorkspace.jsx");
    expect(src).toMatch(/async function handleTabChange/);
    // Look for the transitionState call inside handleTabChange's body.
    // The function is short; a single regex against the whole file is
    // robust enough.
    expect(src).toMatch(/handleTabChange[\s\S]*?await transitionState\(/);
  });

  it("StudyTab.advanceSubPhase awaits transitionState", () => {
    const src = readSource("StudyTab.jsx");
    expect(src).toMatch(/async function advanceSubPhase/);
    expect(src).toMatch(/advanceSubPhase[\s\S]*?await transitionState\(/);
  });

  it("AssemblyTab.advanceSubPhase awaits transitionState", () => {
    const src = readSource("AssemblyTab.jsx");
    expect(src).toMatch(/async function advanceSubPhase/);
    expect(src).toMatch(/advanceSubPhase[\s\S]*?await transitionState\(/);
  });

  it("StudyTab.jumpToSubPhase awaits transitionState (look-back routes through the spine)", () => {
    const src = readSource("StudyTab.jsx");
    expect(src).toMatch(/async function jumpToSubPhase/);
    expect(src).toMatch(/jumpToSubPhase[\s\S]*?await transitionState\(/);
  });

  it("AssemblyTab.jumpToSubPhase + jumpToStudy await transitionState", () => {
    const src = readSource("AssemblyTab.jsx");
    expect(src).toMatch(/async function jumpToSubPhase/);
    expect(src).toMatch(/async function jumpToStudy/);
    // Both back-paths must hit the spine.
    const jumpSubBody = src.match(/async function jumpToSubPhase[\s\S]*?\n  \}/);
    const jumpStudyBody = src.match(/async function jumpToStudy[\s\S]*?\n  \}/);
    expect(jumpSubBody?.[0]).toMatch(/await transitionState\(/);
    expect(jumpStudyBody?.[0]).toMatch(/await transitionState\(/);
  });
});

describe("Trail-layer structural: cross-stage pause dismissal routes through onTabChange", () => {
  // Walking off the Implications-pause flips the tab from Study → Assembly,
  // and walking off the Frame-pause flips Assembly → Manuscript. Both
  // routes go through StudyTab / AssemblyTab's `setPausePoint` wrapper —
  // when the pause is dismissed (val === null) AND its nextKey points to
  // the next stage, the wrapper calls `onTabChange(NEXT_STAGE)`. From
  // there SermonWorkspace.handleTabChange runs the spine transition.
  //
  // These tests guard against the wrapper losing its cross-stage routing
  // — a regression class that would manifest as "Walk on" silently
  // failing to flip the tab.

  it("StudyTab.setPausePoint wrapper routes nextKey===\"assembly\" through onTabChange", () => {
    const src = readSource("StudyTab.jsx");
    // The wrapper conditional + onTabChange call. Match conservatively
    // on the contract text (the comparison value + the routing call).
    expect(src).toMatch(/pausePoint\.nextKey\s*===\s*["']assembly["']/);
    // And onTabChange is reachable from the same conditional region.
    const wrapperMatch = src.match(/setPausePoint[\s\S]{0,400}?onTabChange\?\.\(/);
    expect(wrapperMatch).toBeTruthy();
  });

  it("AssemblyTab.setPausePoint wrapper routes nextKey===\"manuscript\" through onTabChange", () => {
    const src = readSource("AssemblyTab.jsx");
    expect(src).toMatch(/pausePoint\.nextKey\s*===\s*["']manuscript["']/);
    const wrapperMatch = src.match(/setPausePoint[\s\S]{0,400}?onTabChange\?\.\(/);
    expect(wrapperMatch).toBeTruthy();
  });
});

describe("Trail-layer structural: meta-tests guard the structural checks above", () => {
  // Without these meta-tests, the structural checks pass vacuously if a
  // file rename or wholesale rewrite removes the function entirely.

  it("StudyTab.jsx exports a function and references transitionState", () => {
    const src = readSource("StudyTab.jsx");
    expect(src).toMatch(/export default function StudyTab/);
    expect(src).toMatch(/transitionState/);
  });

  it("AssemblyTab.jsx exports a function and references transitionState", () => {
    const src = readSource("AssemblyTab.jsx");
    expect(src).toMatch(/export default function AssemblyTab/);
    expect(src).toMatch(/transitionState/);
  });

  it("SermonWorkspace.jsx exports a function and references transitionState", () => {
    const src = readSource("SermonWorkspace.jsx");
    expect(src).toMatch(/export default function SermonWorkspace/);
    expect(src).toMatch(/transitionState/);
  });
});
