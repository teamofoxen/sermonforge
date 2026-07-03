import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// Track E (E1) — transitionState no-caller tripwire.
//
// `transitionState` (src/core/spine.ts) is the vestigial legacy position-writer:
// it classifies a target Stage/SubPhase and dispatches the `transition-state`
// IPC op. Post-Track-D the workspace writes position EXCLUSIVELY via
// `last_touched_position` (through `update-sermon`); nothing calls
// `transitionState`. This tripwire locks that dead state so a future edit cannot
// silently revive the old position subsystem while Track E proceeds (audit
// finding D — the vestigial position subsystem).
//
// Scope + allowed references:
//   • Scanned: `src/` (the renderer) only.
//   • Allowed: the function DEFINITION in `src/core/spine.ts`
//     (`export function transitionState(`), plus any comment/history references
//     (comments are stripped before scanning, so a tombstone mention never
//     counts as a call).
//   • Out of scope (cannot be a live renderer caller, so not scanned here):
//     the electron main handler (`case "transition-state"` in electron/main.js)
//     and its `test-spine` fixture mirror are the gravestone on the far side of
//     the spine boundary; the spine-method allowlists in `scripts/` and
//     `eslint-plugin-sermonforge/` list the name only as a string literal.
//
// A "live caller" is any `transitionState(` invocation in src/ that is not the
// definition itself. Adding one (see the red-test in the Track-E log) turns this
// test red.

const SRC = path.resolve(__dirname, "..", "..", "src");
const CALL = /transitionState\s*\(/; // an invocation OR the definition line
const DEFINITION = /export\s+(?:async\s+)?function\s+transitionState\s*\(/;

function walkSrc(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkSrc(p));
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

// Blank out comments so a tombstone mention of transitionState(...) is never
// read as a live call, while PRESERVING line numbers (block comments become
// spaces + kept newlines; line comments are trimmed in place).
function stripComments(src: string): string {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  return noBlock
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");
}

function rel(file: string): string {
  return path.relative(SRC, file).replace(/\\/g, "/");
}

describe("Track E (E1) — transitionState has no live caller in src/", () => {
  const files = walkSrc(SRC);

  it("the only transitionState( in src/ is its own definition in src/core/spine.ts", () => {
    const callers: string[] = [];
    const definitions: string[] = [];

    for (const file of files) {
      const code = stripComments(fs.readFileSync(file, "utf8"));
      code.split("\n").forEach((line, i) => {
        if (!CALL.test(line)) return;
        if (DEFINITION.test(line)) definitions.push(`${rel(file)}:${i + 1}`);
        else callers.push(`${rel(file)}:${i + 1}: ${line.trim()}`);
      });
    }

    // No live invocation anywhere in the renderer.
    expect(callers).toEqual([]);
    // Exactly one definition, and it lives in src/core/spine.ts.
    expect(definitions.length).toBe(1);
    expect(definitions[0]).toMatch(/^core\/spine\.ts:/);
  });
});
