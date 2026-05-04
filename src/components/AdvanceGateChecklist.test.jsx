// @vitest-environment jsdom
//
// AdvanceGateChecklist component tests (SPRD A1.2 / B1.6).
//
// The component renders one of three states based on the sufficiency it's
// handed: nothing when ok=true and gates aren't surfaced, the legacy
// single-line `advance-hint` when gates is missing or has ≤1 entry, or the
// structured checklist when gates has multiple entries.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AdvanceGateChecklist from "./AdvanceGateChecklist";

describe("AdvanceGateChecklist", () => {
  it("renders nothing when sufficiency.ok is true", () => {
    const { container } = render(
      <AdvanceGateChecklist sufficiency={{ ok: true }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when sufficiency is null/undefined", () => {
    const { container, rerender } = render(
      <AdvanceGateChecklist sufficiency={null} />,
    );
    expect(container.firstChild).toBeNull();
    rerender(<AdvanceGateChecklist sufficiency={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders legacy single-line advance-hint when gates is missing (back-compat with empty-evidence baseline)", () => {
    render(
      <AdvanceGateChecklist
        sufficiency={{ ok: false, reason: "Add some content before advancing." }}
      />,
    );
    const hint = screen.getByTestId("advance-hint");
    expect(hint).toBeTruthy();
    expect(hint.textContent).toBe("Add some content before advancing.");
    expect(screen.queryByTestId("advance-gate-checklist")).toBeNull();
  });

  it("renders single-line advance-hint when gates has only one entry", () => {
    render(
      <AdvanceGateChecklist
        sufficiency={{
          ok: false,
          reason: "Lay out the passage before advancing.",
          gates: [
            { key: "field_4_divisions", label: "Divisions / Thought Units", met: false, reason: "Lay out the passage before advancing." },
          ],
        }}
      />,
    );
    expect(screen.getByTestId("advance-hint")).toBeTruthy();
    expect(screen.queryByTestId("advance-gate-checklist")).toBeNull();
  });

  it("renders the structured checklist when gates has multiple entries", () => {
    render(
      <AdvanceGateChecklist
        sufficiency={{
          ok: false,
          reason: "State the Obvious Point before advancing.",
          gates: [
            { key: "field_4_divisions",            label: "Divisions / Thought Units", met: true },
            { key: "field_8_obvious_point",        label: "Obvious Point",             met: false, reason: "State the Obvious Point before advancing." },
            { key: "field_9_possible_implications", label: "Possible Implications",    met: true },
          ],
        }}
      />,
    );
    const checklist = screen.getByTestId("advance-gate-checklist");
    expect(checklist).toBeTruthy();
    // Three entries
    const items = checklist.querySelectorAll(".advance-gate-item");
    expect(items.length).toBe(3);
    // Met / unmet markers
    const f4 = checklist.querySelector('[data-gate-key="field_4_divisions"]');
    const f8 = checklist.querySelector('[data-gate-key="field_8_obvious_point"]');
    expect(f4.getAttribute("data-gate-met")).toBe("true");
    expect(f8.getAttribute("data-gate-met")).toBe("false");
    expect(f4.textContent).toContain("✓");
    expect(f8.textContent).toContain("✗");
    // Unmet gate's sub-reason rendered alongside its label
    expect(f8.textContent).toContain("Obvious Point");
    expect(f8.textContent).toContain("State the Obvious Point before advancing.");
    // Met gate does NOT show a reason (even if one is present)
    expect(f4.textContent).not.toContain("—");
  });

  it("checklist exposes both label and reason text per unmet gate so the pastor can see what's missing at a glance", () => {
    render(
      <AdvanceGateChecklist
        sufficiency={{
          ok: false,
          reason: "Lay out the passage before advancing.",
          gates: [
            { key: "field_4_divisions",            label: "Divisions / Thought Units", met: false, reason: "Lay out the passage before advancing — at least one main sentence with an indented modifier under it." },
            { key: "field_8_obvious_point",        label: "Obvious Point",             met: false, reason: "State the Obvious Point before advancing." },
            { key: "field_9_possible_implications", label: "Possible Implications",    met: false, reason: "Answer the Possible Implications questions before advancing." },
          ],
        }}
      />,
    );
    const checklist = screen.getByTestId("advance-gate-checklist");
    expect(checklist.textContent).toContain("Divisions / Thought Units");
    expect(checklist.textContent).toContain("at least one main sentence with an indented modifier");
    expect(checklist.textContent).toContain("Obvious Point");
    expect(checklist.textContent).toContain("Possible Implications");
  });
});
