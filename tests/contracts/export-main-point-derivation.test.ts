import { describe, it, expect } from "vitest";
import { buildManuscriptExportPayload } from "../../src/utils.js";

// Track E (E2) — the Word manuscript export derives MPT/MPS from the canonical
// `main_point_pair` envelope, NOT the flat `mpt` / `mps` mirror columns.
//
// The v19 envelope (`main_point_pair`) is the source of truth the writing
// surface renders and completeness reads; the tightened single sentence is the
// named outcome. The flat `mpt` / `mps` columns are a legacy write-mirror kept
// in lockstep by useWorkspaceMutations.handleAnswerChange
// (mpt = <envelope>.mpt.tighten, mps = <envelope>.mps.tighten). Those two
// stores diverged once already — in the window between StudyTab.updateMPP's
// deletion (trail-deletion Phase E) and the mirror's wiring (`d3da7e8`) the
// envelope went fresh while the flat columns went stale — so the export must
// read the same tightened value the pastor actually sees, not a stale mirror.
//
// This pin fixes the export source of truth: the tightened envelope value wins
// even when the flat column disagrees. It exercises BOTH divergence directions
// in one fixture — a stale non-empty flat `mpt` (the export must not print the
// old value) and an empty flat `mps` (the export must not blank a real envelope
// value). It is red against the pre-flip flat read and green once the export
// reads the envelope.

describe("Track E (E2) — manuscript export derives MPT/MPS from main_point_pair", () => {
  it("MPT/MPS come from the envelope tighten value, not the divergent flat columns", () => {
    const sermon = {
      main_point_pair: JSON.stringify({
        mpt: { tighten: { value: "ENVELOPE-MPT", na: false } },
        mps: { tighten: { value: "ENVELOPE-MPS", na: false } },
      }),
      // Flat mirror deliberately divergent from the envelope: `mpt` carries a
      // stale non-empty value, `mps` is empty — the two ways the legacy column
      // can disagree with the canonical envelope.
      mpt: "STALE-FLAT-MPT",
      mps: "",
    };

    const payload = buildManuscriptExportPayload(sermon);

    // The tightened envelope value is authoritative in both directions.
    expect(payload.mpt).toBe("ENVELOPE-MPT");
    expect(payload.mps).toBe("ENVELOPE-MPS");
  });
});
