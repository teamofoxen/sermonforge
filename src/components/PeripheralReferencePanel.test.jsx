// @vitest-environment jsdom
//
// PeripheralReferencePanel component tests (SPRD A2.4).
//
// Covers the layout primitive's contract: <aside role="complementary">,
// title rendering, children render inside the body, aria-label fallback,
// custom className composition, and the structural absence of any
// interactive affordances (no buttons / inputs / AI surface) inside the
// panel itself.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PeripheralReferencePanel from "./PeripheralReferencePanel";

describe("PeripheralReferencePanel — rendering", () => {
  it("renders an <aside> with role=complementary", () => {
    render(
      <PeripheralReferencePanel>
        <p>Body content.</p>
      </PeripheralReferencePanel>,
    );
    const panel = screen.getByTestId("peripheral-reference-panel");
    expect(panel.tagName).toBe("ASIDE");
    expect(panel.getAttribute("role")).toBe("complementary");
  });

  it("renders the title as a heading when provided", () => {
    render(
      <PeripheralReferencePanel title="The three rules">
        <p>Rules go here.</p>
      </PeripheralReferencePanel>,
    );
    const heading = screen.getByText("The three rules");
    expect(heading.tagName).toBe("H3");
    expect(heading.classList.contains("peripheral-reference-panel-title")).toBe(true);
  });

  it("uses the title as aria-label when provided", () => {
    render(
      <PeripheralReferencePanel title="The three rules">
        <p>Body.</p>
      </PeripheralReferencePanel>,
    );
    const panel = screen.getByTestId("peripheral-reference-panel");
    expect(panel.getAttribute("aria-label")).toBe("The three rules");
  });

  it("falls back to a generic aria-label when no title is provided", () => {
    render(
      <PeripheralReferencePanel>
        <p>Body.</p>
      </PeripheralReferencePanel>,
    );
    const panel = screen.getByTestId("peripheral-reference-panel");
    expect(panel.getAttribute("aria-label")).toBe("Reference panel");
  });

  it("renders children inside the panel body", () => {
    render(
      <PeripheralReferencePanel title="Quick outline tips">
        <h4>For epistles</h4>
        <p>Long sentences with cascading modifiers.</p>
        <h4>For narrative</h4>
        <ol>
          <li>Each main action → left margin.</li>
        </ol>
      </PeripheralReferencePanel>,
    );
    const body = document.querySelector(".peripheral-reference-panel-body");
    expect(body).toBeTruthy();
    expect(body.textContent).toContain("For epistles");
    expect(body.textContent).toContain("For narrative");
    expect(body.textContent).toContain("Long sentences with cascading modifiers.");
    expect(body.textContent).toContain("Each main action → left margin.");
  });

  it("composes a custom className alongside the base class", () => {
    render(
      <PeripheralReferencePanel className="custom-test-class">
        <p>Body.</p>
      </PeripheralReferencePanel>,
    );
    const panel = screen.getByTestId("peripheral-reference-panel");
    expect(panel.classList.contains("peripheral-reference-panel")).toBe(true);
    expect(panel.classList.contains("custom-test-class")).toBe(true);
  });

  it("does not render a title heading when no title prop is given", () => {
    render(
      <PeripheralReferencePanel>
        <p>Body without title.</p>
      </PeripheralReferencePanel>,
    );
    expect(document.querySelector(".peripheral-reference-panel-title")).toBeNull();
  });
});

describe("PeripheralReferencePanel — structural contract (no interactive affordances)", () => {
  // The reference panel is content-only. Its contract is that nothing
  // inside its own structure adds buttons / inputs / AI surface; the
  // children are pure guidance content. This test guards the primitive
  // — children passed in are the caller's responsibility.

  it("renders no buttons or inputs from the panel structure itself", () => {
    render(
      <PeripheralReferencePanel title="Three rules">
        <ol>
          <li>Subject + main verb → left margin.</li>
          <li>Modifiers indented under what they modify.</li>
          <li>Coordinate clauses re-aligned to the column of their coordinate.</li>
        </ol>
      </PeripheralReferencePanel>,
    );
    expect(document.querySelectorAll("button")).toHaveLength(0);
    expect(document.querySelectorAll("input")).toHaveLength(0);
    expect(document.querySelectorAll("textarea")).toHaveLength(0);
  });
});
