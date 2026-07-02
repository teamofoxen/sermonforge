import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { WALK_ORDER, nextField, prevField } from "../../src/utils/walkOrder";

// Track B (B7) — standing-prohibition guards. These are TRIPWIRES, not gates:
// they assert the workspace has NOT become stricter, AI-authoring, or noisy.
//
//   • Completeness informs, never blocks (CORE Process #1).
//   • No AI-generated sermon content (CORE Process #5 / No-AI boundary).
//   • Movement is narrated only at the three threshold screens (Process #3) —
//     the always-on-narration testid is guarded by
//     process-3-movement-visible.test.tsx; here we add the complementary
//     progress-announcement / toast tripwire.

const SRC = path.resolve(__dirname, "..", "..", "src");

function readAll(dir: string, re: RegExp): string[] {
  const hits: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    if (!fs.existsSync(cur)) continue;
    const stat = fs.statSync(cur);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(cur)) stack.push(path.join(cur, entry));
    } else if (/\.(js|jsx|ts|tsx)$/.test(cur) && !/\.test\.[jt]sx?$/.test(cur)) {
      const text = fs.readFileSync(cur, "utf8");
      if (re.test(text)) hits.push(path.relative(SRC, cur));
    }
  }
  return hits;
}

describe("B7 — completeness informs, never blocks (no gates)", () => {
  it("nextField advances from any position regardless of completeness (an empty sermon can move forward)", () => {
    const first = WALK_ORDER[0];
    const second = nextField({ stage: first.stage, subPhase: first.subPhase, fieldKey: first.key });
    // Navigation is pure index math over WALK_ORDER — it does not consult any
    // completeness signal, so movement is never refused for unmet work.
    expect(second).toBeTruthy();
    expect(second).toBe(WALK_ORDER[1]);
  });

  it("prevField moves backward freely (labeled Back beside Next — never a wall)", () => {
    const second = WALK_ORDER[1];
    const back = prevField({ stage: second.stage, subPhase: second.subPhase, fieldKey: second.key });
    expect(back).toBe(WALK_ORDER[0]);
  });

  it("the navigation module does not import any completeness derivation (nav is independent of 'is it done')", () => {
    const walkOrderSrc = fs.readFileSync(path.join(SRC, "utils", "walkOrder.js"), "utf8");
    expect(walkOrderSrc).not.toMatch(/from\s+["']\.\/sermonState["']/);
    expect(walkOrderSrc).not.toMatch(/from\s+["']\.\/studyAdvancement["']/);
  });
});

describe("B7 — no AI-generated sermon content in the workspace", () => {
  it("no source file imports an Anthropic SDK", () => {
    expect(readAll(SRC, /@anthropic-ai/)).toEqual([]);
  });

  it("no source file calls sendAIMessage (the removed AI channel)", () => {
    expect(readAll(SRC, /\.sendAIMessage\s*\(/)).toEqual([]);
  });
});

describe("B7 — no progress announcements / movement narration outside the three threshold screens", () => {
  // The always-on movement banner (data-testid="movement-event") is guarded by
  // tests/contracts/process-3-movement-visible.test.tsx. This is the
  // complementary guard: no toast / snackbar / notification affordance may
  // enter the components, which would announce progress during the walk.
  it("no component renders a toast / snackbar / notification affordance", () => {
    const components = path.join(SRC, "components");
    const hits = readAll(components, /\btoast\s*\(|\bsnackbar\b|showNotification\s*\(/i);
    expect(hits).toEqual([]);
  });
});
