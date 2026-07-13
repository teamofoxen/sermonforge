// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import * as React from "react";
import { ErrorBoundary } from "../../src/App";

// Session-1 remediation — trust wording. The global React error boundary has
// no way to know whether the current edits' debounced save landed before the
// crash, so its fallback must not promise "nothing is lost" (the
// persistence-transition contract: uncertainty is never dressed up as
// success). What it CAN honestly promise: work already saved is safe — every
// write commits durably at the IPC handler.
describe("error boundary — honest persistence wording", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function Boom(): never {
    throw new Error("render boom");
  }

  it("does not promise that all current edits are certainly saved; distinguishes saved work from in-flight edits", () => {
    // React logs the caught error loudly — keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    // The fallback rendered.
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    const copy = document.body.textContent || "";

    // The over-promise is gone…
    expect(copy).not.toMatch(/nothing is lost/i);
    // …replaced by the honest two-part statement: saved work is safe,
    // the very last edits may not be.
    expect(copy).toMatch(/Everything you saved is safe/i);
    expect(copy).toMatch(/may not have finished saving/i);
    // Recovery stays present and calm.
    expect(screen.getByText("Reload App")).toBeTruthy();
  });
});
