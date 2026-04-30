// Shared file-scan helper used by both:
//   • tests/contracts/state-5-one-name-per-concept.test.ts
//   • tests/contracts/surface-1-one-vocabulary.test.ts
//
// Mirrors the allowed-file list of the canonical-stage-name lint rule so the
// lint and test layers stay coherent. Returns one finding per offending
// occurrence; an empty array means no violations.

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..", "..");

// Pre-Pilot-B aliases that are exclusively stage/status vocabulary — they
// have no other legitimate use in the codebase. The names "planning",
// "study", "outline", and "active" also appear as legitimate URL-safe view
// keys / tab keys / column names / CSS class names; the lint rule mirrors
// this narrowing. Audit-triage Pilot B.2/E will revisit "study" and
// "outline" once the workspace tab keys migrate to canonical PascalCase.
const FORBIDDEN_STAGE_ALIASES = [
  "writing", "ready", "archived",
];

export interface AliasFinding {
  file: string;
  lineNo: number;
  alias: string;
  line: string;
}

function isAllowedFile(rel: string): boolean {
  // Mirrors canonical-stage-name lint rule allow-list.
  if (rel === "electron/main.js") return true;
  if (rel.startsWith("tests/")) return true;
  if (rel.startsWith("src/core/contracts")) return true;
  return false;
}

function* walkComponents(): IterableIterator<string> {
  const dir = path.join(ROOT, "src", "components");
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    if (!fs.existsSync(cur)) continue;
    const stat = fs.statSync(cur);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(cur)) stack.push(path.join(cur, entry));
    } else if (stat.isFile() && /\.(jsx?|tsx?)$/.test(cur)) {
      yield cur;
    }
  }
}

export function scanForDeprecatedAliases(): AliasFinding[] {
  const findings: AliasFinding[] = [];
  for (const file of walkComponents()) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (isAllowedFile(rel)) continue;
    const source = fs.readFileSync(file, "utf8");
    const lines = source.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match the alias as a quoted string literal (single or double).
      for (const alias of FORBIDDEN_STAGE_ALIASES) {
        const re = new RegExp(`["']${alias}["']`);
        if (re.test(line)) {
          findings.push({ file: rel, lineNo: i + 1, alias, line: line.trim() });
        }
      }
    }
  }
  return findings;
}
