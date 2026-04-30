import { describe, it, expect } from "vitest";
import { scanForDeprecatedAliases } from "./_helpers/scan-aliases";

// State Contract #5 (docs/CORE.md):
//   "One name per concept. 'Outline' is one tab and one stage and one
//   dropdown value, with one spelling, everywhere it appears. Vocabulary is
//   part of state, not a UI decoration. Stage values, tab names, step names,
//   and dropdown options must be the canonical names — never aliases or drifts."
//
// This test is the runtime mirror of the canonical-stage-name lint rule.
// Lint catches violations at editor time; this test asserts the same allow-
// list at CI time so no PR can land a deprecated alias even if lint is
// skipped or misconfigured.

describe("State Contract #5: one name per concept", () => {
  it("no deprecated stage/status aliases appear in src/components/", () => {
    const findings = scanForDeprecatedAliases();
    if (findings.length > 0) {
      const lines = findings
        .slice(0, 20)
        .map((f) => `  ${f.file}:${f.lineNo} → '${f.alias}'  ${f.line.slice(0, 100)}`)
        .join("\n");
      throw new Error(
        `State Contract #5 violation: ${findings.length} occurrence(s) of pre-Pilot-B stage aliases:\n${lines}\n\n` +
          `Replace with SERMON_STATUS / SERIES_STATUS from src/core/contracts.ts.`,
      );
    }
    expect(findings).toEqual([]);
  });
});
