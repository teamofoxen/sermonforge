import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";
import { QUESTION_WALK_ORDER, questionId } from "./walkOrder";
import { deriveQuestionStatesFromSermon } from "./sermonState";

// Track B (B2) — kind-parity guard.
//
// A question's `kind` decides BOTH how the writing surface renders it AND how
// the map/completion derivation reads its stored state. Those two dispatch
// sites must handle the same set of kinds. If a new kind renders fine but the
// state derivation has no branch for it, it falls through to the default
// text-prompt path, reads the wrong (nominal) column, finds nothing, and shows
// "unanswered forever" — the exact silent-fallthrough failure this guards.
//
// Approach: inventory the kinds actually declared in QUESTION_WALK_ORDER, hold
// them against a canonical set (so a NEW kind forces a conscious update here),
// and statically assert each is dispatched in both source files.

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, "..");
const RENDERER_SRC = fs.readFileSync(
  path.join(srcRoot, "components", "SermonWritingSurface.jsx"), "utf8"
);
const STATE_SRC = fs.readFileSync(
  path.join(srcRoot, "utils", "sermonState.js"), "utf8"
);

// The canonical NON-DEFAULT question kinds (text-prompt is the unmarked
// default — no `kind` — and is the fallthrough branch in both dispatch sites).
// Mirrors WORKSPACE-CANON §1 "eight question kinds". A new kind must be added
// here consciously, which is the point.
const CANONICAL_KINDS = new Set([
  "indented-canvas",
  "cumulative-synthesis-table",
  "outline-builder",
  "functional-elements",
  "manuscript-prose",
  "manuscript-transitions",
  "sermon-title",
]);

const declaredKinds = [...new Set(QUESTION_WALK_ORDER.map((q) => q.kind).filter(Boolean))];

function dispatches(src, kind) {
  const escaped = kind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`kind\\s*===\\s*["']${escaped}["']`).test(src);
}

describe("B2 — question-kind parity between field defs, renderer, and state derivation", () => {
  it("the walk declares EXACTLY the canonical kinds — a kind added OR silently dropped fails until registered here", () => {
    // Two-way equality (not merely ⊆): if a refactor drops `kind` off the walk
    // entries, declaredKinds empties and a ⊆ check would pass vacuously — the
    // exact silent-green outcome this guard exists to prevent. Equality catches
    // both a new unregistered kind and a canonical kind that vanished.
    expect(new Set(declaredKinds)).toEqual(CANONICAL_KINDS);
  });

  it("every declared kind is dispatched by BOTH the writing surface renderer and the state derivation", () => {
    const missingInRenderer = declaredKinds.filter((k) => !dispatches(RENDERER_SRC, k));
    const missingInState = declaredKinds.filter((k) => !dispatches(STATE_SRC, k));
    expect({ missingInRenderer, missingInState }).toEqual({ missingInRenderer: [], missingInState: [] });
  });

  it("both dispatch sites carry a default (text-prompt) branch so an unmarked-kind question is still handled", () => {
    // The renderer's final `return (<PromptBlock .../>)` and the state
    // derivation's trailing "Default: text-prompt" path are the fallthroughs.
    expect(STATE_SRC).toMatch(/Default: text-prompt/);
    expect(RENDERER_SRC).toContain("<PromptBlock");
  });

  it("the state derivation returns a valid state for EVERY walk question (no kind yields undefined) — empty and complete", () => {
    const valid = new Set(["answered", "partial", "unanswered"]);
    for (const sermon of [{}, fullSermon()]) {
      const states = deriveQuestionStatesFromSermon(sermon);
      for (const entry of QUESTION_WALK_ORDER) {
        const st = states[questionId(entry)];
        expect(st, `missing state for ${questionId(entry)}`).toBeTruthy();
        expect(valid.has(st.state), `invalid state '${st?.state}' for ${questionId(entry)}`).toBe(true);
      }
    }
  });
});

// Minimal multi-kind sermon: enough to exercise the canvas, cumulative table,
// outline, functional-elements, manuscript prose, and title kinds so the
// state derivation walks their branches (not asserting completeness here).
function fullSermon() {
  return {
    title: "Kind-coverage sermon",
    observations: JSON.stringify({
      divisions: {
        canvas: { value: [{ text: "Main", depth: 0 }], na: false },
        thought_units: { value: [{ text: "u1", meaning: "m", christ_connection: "c", implication: "i" }], na: false },
      },
      obvious_point: { primary: { value: "pt", na: false } },
    }),
    outline: JSON.stringify([{ id: "p1", text: "Point one" }]),
    functional_elements: JSON.stringify({ p1: { scripture: "s", explanation: "e", application: "a" } }),
    manuscript: JSON.stringify({
      introduction: { opener: "Once..." },
      transitions: { p1: "bridge", conclusion: "into the end" },
      conclusion: { response: "Come." },
    }),
  };
}
