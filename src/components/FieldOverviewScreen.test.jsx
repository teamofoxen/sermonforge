// @vitest-environment jsdom
//
// FieldOverviewScreen component tests (SPRD A2.5).
//
// Covers title / subtitle / body rendering, Begin button + onBegin callback,
// optional props (no title, no subtitle, custom beginLabel), aria-label
// fallback, custom className composition, and Begin button autofocus on
// mount so the pastor can proceed via Enter after reading.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FieldOverviewScreen from "./FieldOverviewScreen";

function renderField4Overview(overrides = {}) {
  const onBegin = vi.fn();
  const utils = render(
    <FieldOverviewScreen
      title="Divisions / Thought Units"
      subtitle="Field 4 of 9 · Observe"
      onBegin={overrides.onBegin ?? onBegin}
      {...overrides}
    >
      <p>The point of the sermon is the point of the text.</p>
      <p>You're laying the foundation any outline will rest on.</p>
      <ol>
        <li>Lay the passage out so the structure shows.</li>
        <li>Rewrite each main sentence in your own words.</li>
        <li>Find the thought units that anchor the passage.</li>
      </ol>
    </FieldOverviewScreen>,
  );
  return { onBegin, ...utils };
}

describe("FieldOverviewScreen — rendering", () => {
  it("renders the title in an h1", () => {
    renderField4Overview();
    const heading = screen.getByText("Divisions / Thought Units");
    expect(heading.tagName).toBe("H1");
    expect(heading.classList.contains("field-overview-screen-title")).toBe(true);
  });

  it("renders the subtitle when provided", () => {
    renderField4Overview();
    const subtitle = screen.getByText("Field 4 of 9 · Observe");
    expect(subtitle.classList.contains("field-overview-screen-subtitle")).toBe(true);
  });

  it("renders body content (paragraphs + lists) inside the body wrapper", () => {
    renderField4Overview();
    const body = document.querySelector(".field-overview-screen-body");
    expect(body).toBeTruthy();
    expect(body.textContent).toContain("The point of the sermon is the point of the text.");
    expect(body.textContent).toContain("Lay the passage out so the structure shows.");
    expect(body.textContent).toContain("Find the thought units that anchor the passage.");
  });

  it("renders a Begin button with default label", () => {
    renderField4Overview();
    const btn = screen.getByText("Begin");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.classList.contains("field-overview-screen-begin")).toBe(true);
  });

  it("renders a custom beginLabel when provided", () => {
    renderField4Overview({ beginLabel: "Start Field 4" });
    expect(screen.getByText("Start Field 4")).toBeTruthy();
  });

  it("uses the title as the section's aria-label", () => {
    renderField4Overview();
    const section = screen.getByTestId("field-overview-screen");
    expect(section.getAttribute("aria-label")).toBe("Divisions / Thought Units");
  });

  it("falls back to a generic aria-label when no title is provided", () => {
    const onBegin = vi.fn();
    render(
      <FieldOverviewScreen onBegin={onBegin}>
        <p>Body without title.</p>
      </FieldOverviewScreen>,
    );
    const section = screen.getByTestId("field-overview-screen");
    expect(section.getAttribute("aria-label")).toBe("Field overview");
    expect(document.querySelector(".field-overview-screen-title")).toBeNull();
    expect(document.querySelector(".field-overview-screen-subtitle")).toBeNull();
  });

  it("composes a custom className alongside the base class", () => {
    renderField4Overview({ className: "custom-overview-class" });
    const section = screen.getByTestId("field-overview-screen");
    expect(section.classList.contains("field-overview-screen")).toBe(true);
    expect(section.classList.contains("custom-overview-class")).toBe(true);
  });
});

describe("FieldOverviewScreen — Begin button behavior", () => {
  it("invokes onBegin when the Begin button is clicked", () => {
    const { onBegin } = renderField4Overview();
    fireEvent.click(screen.getByText("Begin"));
    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it("autofocuses the Begin button on mount", () => {
    renderField4Overview();
    const btn = screen.getByText("Begin");
    expect(document.activeElement).toBe(btn);
  });
});
