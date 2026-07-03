import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// Track E (E1 → E4) — the transition-state position subsystem stays retired.
//
// `transitionState` was the vestigial legacy position-writer (audit finding D):
// a renderer wrapper (src/core/spine.ts) that dispatched the `transition-state`
// IPC op to an electron handler which wrote current_stage / current_sub_phase /
// last_*_subphase. The workspace never used it — position is stored EXCLUSIVELY
// via `last_touched_position` (through `update-sermon`). E1 (2026-07-03) locked
// the renderer against a live caller while the definition still stood; E4 then
// REMOVED the whole path — the spine wrapper + its helpers, the electron
// `case "transition-state"` handler, and the test-spine fixture mirror.
//
// This tripwire now guards REINTRODUCTION of the subsystem, not merely a caller:
//   • src/ carries no `transition-state` IPC op literal — the DURABLE guard,
//     since the revival vector is a `call("transition-state", …)` dispatch that
//     a differently-named wrapper would still use.
//   • src/ carries no `transitionState` identifier (continuity with E1's shape).
//   • electron/main.js carries no `transition-state` handler (defense-in-depth
//     for the deleted position-writer on the far side of the spine boundary).
// Comments are stripped before scanning, so a tombstone mention never trips it
// (the removal tombstone in src/core/spine.ts names both tokens deliberately).

const ROOT = path.resolve(__dirname, "..", "..");
const SRC = path.join(ROOT, "src");
const ELECTRON = path.join(ROOT, "electron");
const MAIN = path.join(ELECTRON, "main.js");

const OP_LITERAL = /transition-state/; // the kebab IPC op — the revival vector
const IDENTIFIER = /transitionState/; // the camelCase renderer wrapper

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

// Blank out comments so a tombstone mention of the subsystem is never read as
// live code, while PRESERVING line numbers (block comments become spaces + kept
// newlines; line comments are trimmed in place).
function stripComments(src: string): string {
  // Normalize CRLF/CR → LF first: in JS regex `.` does not match `\r`, so a
  // line-comment regex anchored with `$` fails to strip `// … transitionState\r`
  // on Windows-checked-out files, leaking tombstone comments through as hits.
  const normalized = src.replace(/\r\n?/g, "\n");
  const noBlock = normalized.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  return noBlock
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");
}

function hits(files: string[], re: RegExp, base: string): string[] {
  const out: string[] = [];
  for (const file of files) {
    const code = stripComments(fs.readFileSync(file, "utf8"));
    code.split("\n").forEach((line, i) => {
      if (re.test(line)) {
        const rel = path.relative(base, file).replace(/\\/g, "/");
        out.push(`${rel}:${i + 1}: ${line.trim()}`);
      }
    });
  }
  return out;
}

describe("Track E — the transition-state position subsystem stays retired", () => {
  it("src/ has no `transition-state` op literal and no `transitionState` identifier", () => {
    const files = walk(SRC);
    // The durable guard: the IPC op that actually revives the subsystem.
    expect(hits(files, OP_LITERAL, SRC)).toEqual([]);
    // Continuity: the renderer wrapper by its original name.
    expect(hits(files, IDENTIFIER, SRC)).toEqual([]);
  });

  it("electron/main.js has no `transition-state` handler", () => {
    expect(hits([MAIN], OP_LITERAL, ELECTRON)).toEqual([]);
  });
});
