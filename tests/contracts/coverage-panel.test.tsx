// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import CoveragePanel from "../../src/components/CoveragePanel";

// The shared coverage readout (extracted for Schedule + the Discover walk). The
// gap/overlap/unreadable DERIVATIONS are `computeCoverage`'s, tested in
// tests/unit/coverage.test.js; this pins that CoveragePanel RENDERS each objective
// condition the pastor needs to see — the deterministic pressure Discovery Steps 5
// and 8 apply (it exposes his own work; it never gates or completes it).

const luke = { book_id: "luke", passage_range: "", kind: "book" };

describe("CoveragePanel — surfaces objective coverage conditions", () => {
  it("renders an OVERLAP when two sermons claim the same verses", () => {
    const sermons = [{ passage: "Luke 1:1-10" }, { passage: "Luke 1:5-15" }];
    render(<CoveragePanel series={luke} sermons={sermons} />);
    expect(screen.getByText("Overlap")).toBeTruthy();
    expect(screen.getByText(/sermons 1 & 2/)).toBeTruthy();
  });

  it("renders an UNCOVERED gap when the sermons leave verses untouched", () => {
    const sermons = [{ passage: "Luke 1:1-4" }]; // the rest of Luke is a gap
    render(<CoveragePanel series={luke} sermons={sermons} />);
    expect(screen.getByText("Uncovered")).toBeTruthy();
  });

  it("flags an unreadable reference rather than miscounting it", () => {
    const sermons = [{ passage: "Luke 1:1-4" }, { passage: "not a reference" }];
    render(<CoveragePanel series={luke} sermons={sermons} />);
    expect(screen.getByText("Couldn't read")).toBeTruthy();
  });

  it("shows the pick-a-book empty state when the series has no canonical book", () => {
    render(<CoveragePanel series={{ book_id: null, kind: "book" }} sermons={[]} />);
    expect(screen.getByText(/Pick a canonical book/)).toBeTruthy();
  });
});
