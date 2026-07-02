// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import * as React from "react";
import {
  installTestSpine,
  resetTestSpine,
  insertSermonRow,
  STAGE,
  SUB_PHASE,
} from "./_helpers/test-spine";

// Track B (B5) — load-failure vs sermon-not-found regression guard.
//
// The W4 fix distinguishes two states that must never collapse into one:
//   • a genuinely absent id → the honest "Sermon not found." screen
//   • a thrown load (DB read failed) → a RETRYABLE "loading problem, not a
//     lost sermon" screen (the pastor's work is safe on disk)
//
// If a future change makes getSermon swallow errors to null, a real load
// failure would masquerade as a lost sermon. This pins the distinction.
//
// Note: React.createElement (rolldown SSR transform doesn't parse JSX in .tsx
// test files) — matches process-3-movement-visible.test.tsx.

async function mountWorkspace(sermonId: string) {
  const Mod = await import("../../src/components/SermonWorkspace");
  const SermonWorkspace = (Mod as any).default || (Mod as any).SermonWorkspace;
  return (await act(async () =>
    render(React.createElement(SermonWorkspace, { sermonId, onClose: () => {} })),
  )) as unknown as { container: HTMLElement };
}

describe("B5 — load failure and sermon-not-found stay distinct", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("a genuinely absent sermon renders the honest 'Sermon not found.' state", async () => {
    // No insertSermonRow → get-sermon returns null (not a throw).
    await mountWorkspace("does-not-exist");
    await waitFor(() => {
      expect(screen.getByText("Sermon not found.")).toBeTruthy();
    });
    // NOT the loading-failure copy.
    expect(screen.queryByText(/loading problem/i)).toBeNull();
  });

  it("a thrown load renders the retryable 'loading problem, not a lost sermon' state with Retry", async () => {
    const sermonId = insertSermonRow({
      title: "Real sermon on disk",
      current_stage: STAGE.Study,
      current_sub_phase: SUB_PHASE.Observe,
    });
    // Make the get-sermon read THROW (a DB/read failure), delegating every
    // other op to the real fixture. getSermon propagates the rejection, so the
    // workspace load effect's catch sets loadError.
    const api = (globalThis as any).electronAPI;
    const originalSpine = api.spine;
    api.spine = async (op: string, payload: any) => {
      if (op === "get-sermon") throw new Error("simulated disk read failure");
      return originalSpine(op, payload);
    };

    await mountWorkspace(sermonId);

    await waitFor(() => {
      expect(screen.getByText(/loading problem, not a lost sermon/i)).toBeTruthy();
    });
    // Retryable, and NOT the not-found copy.
    expect(screen.getByText("Retry")).toBeTruthy();
    expect(screen.queryByText("Sermon not found.")).toBeNull();
  });
});
