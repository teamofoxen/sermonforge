import { describe, it, expect } from "vitest";
import { buildManuscriptExportPayload } from "../../src/utils";

// Correctness audit, finding 12 — two sermons that share a title used to export
// to the same "<title> — Manuscript.docx" and silently overwrite each other
// (writeFile is an unconditional overwrite). The export handler now
// disambiguates the filename by the preached date, falling back to a short id
// fragment when undated. The id is threaded through the export payload for that
// purpose; this pins the threading half (the filename construction itself lives
// in the un-require-able electron main handler, verified by reasoning + node --check).
describe("buildManuscriptExportPayload — carries the sermon id (finding 12)", () => {
  it("includes the sermon id in the payload", () => {
    const payload = buildManuscriptExportPayload({
      id: "abc-123", title: "Grace", date: "2026-01-04", manuscript: "{}",
    });
    expect(payload.id).toBe("abc-123");
  });

  it("defaults id to empty string when absent", () => {
    expect(buildManuscriptExportPayload({ title: "Grace" }).id).toBe("");
  });
});
