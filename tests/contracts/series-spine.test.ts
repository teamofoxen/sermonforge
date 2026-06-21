import { describe, it, expect, beforeEach } from "vitest";
import { installTestSpine, resetTestSpine } from "./_helpers/test-spine";

// Series spine behaviour the revived Series Planner depends on, exercised
// against the in-memory fixture via the spine bridge (the same convention the
// other contract round-trip tests use: globalThis.electronAPI.spine — the
// renderer spine falls back to a preview mock under the node test env).
// Added in the Series Planner revival audit remediation (audit M12): the
// planner shipped with zero behavioural coverage of these paths.

function spine() {
  return (globalThis as any).electronAPI.spine as (op: string, payload?: any) => Promise<any>;
}
async function mkSeries(name: string): Promise<string> {
  const r = await spine()("create-series", { name });
  return r.value.id;
}
async function mkSermon(fields: any): Promise<string> {
  const r = await spine()("create-sermon", fields);
  return r.value.id;
}

describe("Series spine: create / cascade / counts / ordering", () => {
  beforeEach(() => {
    installTestSpine();
    resetTestSpine();
  });

  it("create-series then get-series returns the row", async () => {
    const id = await mkSeries("Romans");
    const row = await spine()("get-series", id);
    expect(row?.title).toBe("Romans");
    expect(row?.status).toBe("in_progress");
  });

  it("delete-series orphans child sermons (series_id nulled) but does NOT delete them, and removes sections", async () => {
    const seriesId = await mkSeries("Luke");
    await spine()("create-section", { series_id: seriesId, sort_order: 0 });
    await mkSermon({ name: "Sermon A", series_id: seriesId });
    await mkSermon({ name: "Sermon B", series_id: seriesId });

    expect((await spine()("get-sermons-by-series", seriesId)).length).toBe(2);
    expect((await spine()("get-sections-by-series", seriesId)).length).toBe(1);

    await spine()("delete-series", seriesId);

    // Sections gone; no sermon is attached to the (now-deleted) series.
    expect((await spine()("get-sections-by-series", seriesId)).length).toBe(0);
    expect((await spine()("get-sermons-by-series", seriesId)).length).toBe(0);

    // The sermons themselves survive as stand-alone (series_id nulled).
    const all: any[] = await spine()("get-all-sermons");
    const survivors = all.filter((s) => s.name === "Sermon A" || s.name === "Sermon B");
    expect(survivors.length).toBe(2);
    expect(survivors.every((s) => !s.series_id)).toBe(true);
  });

  it("get-series-sermon-counts counts undeleted sermons per series and excludes tombstoned ones", async () => {
    const a = await mkSeries("A");
    const b = await mkSeries("B");
    await mkSermon({ name: "A1", series_id: a });
    const a2 = await mkSermon({ name: "A2", series_id: a });
    await mkSermon({ name: "B1", series_id: b });

    let counts = await spine()("get-series-sermon-counts");
    expect(counts[a]).toBe(2);
    expect(counts[b]).toBe(1);

    await spine()("delete-sermon", a2); // soft delete
    counts = await spine()("get-series-sermon-counts");
    expect(counts[a]).toBe(1);
    expect(counts[b]).toBe(1);
  });

  it("get-sermons-by-series excludes soft-deleted slots (so they can't resurface, e.g. in the study guide)", async () => {
    const seriesId = await mkSeries("Acts");
    const s1 = await mkSermon({ name: "Keep", series_id: seriesId });
    const s2 = await mkSermon({ name: "Drop", series_id: seriesId });
    await spine()("delete-sermon", s2);
    const rows: any[] = await spine()("get-sermons-by-series", seriesId);
    expect(rows.map((r) => r.id)).toEqual([s1]);
  });

  it("get-sermons-by-series sorts undated slots AFTER dated ones (audit M4)", async () => {
    const seriesId = await mkSeries("Order");
    const undated = await mkSermon({ name: "Undated", series_id: seriesId, date: "" });
    const later = await mkSermon({ name: "Later", series_id: seriesId, date: "2026-01-11" });
    const earlier = await mkSermon({ name: "Earlier", series_id: seriesId, date: "2026-01-04" });
    const rows: any[] = await spine()("get-sermons-by-series", seriesId);
    // Dated first (ascending), undated last — not empty-string-first.
    expect(rows.map((r) => r.id)).toEqual([earlier, later, undated]);
  });

  it("create-sermon refuses an empty name (State #3) — the draft/commit slot pattern relies on this", async () => {
    const r = await spine()("create-sermon", { name: "" });
    expect(r.ok).toBe(false);
    expect(r.clause).toBe("State #3");
  });
});
