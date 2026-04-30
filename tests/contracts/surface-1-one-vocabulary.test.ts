import { describe, it, expect } from "vitest";
import { scanForDeprecatedAliases } from "./_helpers/scan-aliases";

// Surface Contract #1 (docs/CORE.md):
//   "One vocabulary. The canonical names from State Contract clause 5 are
//   the only names allowed in copy, labels, tabs, dropdowns, modals, and
//   tooltips."
//
// Tested at the same level State #5 is — file-scan over src/components/.
// Surface #1 derives its vocabulary from State #5 ("Stage values, tab
// names, step names, and dropdown options must be the canonical names —
// never aliases or drifts"), so the same allow-list applies. Sharing
// the scan helper keeps the lint and test layers coherent.

describe("Surface Contract #1: one vocabulary", () => {
  it("no deprecated stage/status aliases appear in component copy or labels", () => {
    const findings = scanForDeprecatedAliases();
    if (findings.length > 0) {
      const lines = findings
        .slice(0, 20)
        .map((f) => `  ${f.file}:${f.lineNo} → '${f.alias}'`)
        .join("\n");
      throw new Error(
        `Surface Contract #1 violation: ${findings.length} occurrence(s) of pre-Pilot-B vocabulary in components:\n${lines}\n\n` +
          `Surface #1 derives its allow-list from State #5; replace with the canonical SERMON_STATUS / SERIES_STATUS values from src/core/contracts.ts.`,
      );
    }
    expect(findings).toEqual([]);
  });
});
