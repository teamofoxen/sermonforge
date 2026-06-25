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

  it("book_id is unset at create and persists via update-series (create-then-update, canonical-books P2)", async () => {
    const id = await mkSeries("Luke");
    // Create-then-update: book_id is never written by create-series.
    const before = await spine()("get-series", id);
    expect(before.book_id == null).toBe(true);

    // It rides the debounced update path, gated by SERIES_COLUMNS (buildUpdate).
    await spine()("update-series", { id, fields: { book_id: "luke" } });
    const after = await spine()("get-series", id);
    expect(after.book_id).toBe("luke");
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

  it("get-sermons-by-series orders undated units by outline reading order — section, then creation (working-title rebuild)", async () => {
    const seriesId = await mkSeries("Reading order");
    // Two sections created out of display order, to prove sort_order — not
    // creation time — drives the undated pool.
    const secondR = await spine()("create-section", { series_id: seriesId, sort_order: 1 });
    const firstR = await spine()("create-section", { series_id: seriesId, sort_order: 0 });
    const second = secondR.value.id;
    const first = firstR.value.id;
    // The unit in the LATER section is created FIRST.
    const inSecond = await mkSermon({ name: "In second section", series_id: seriesId, section_id: second, date: "" });
    const inFirst = await mkSermon({ name: "In first section", series_id: seriesId, section_id: first, date: "" });
    const rows: any[] = await spine()("get-sermons-by-series", seriesId);
    // Undated pool walks the outline (section sort_order), not creation order.
    expect(rows.map((r) => r.id)).toEqual([inFirst, inSecond]);
  });

  it("create-sermon refuses an empty name (State #3) — the draft/commit slot pattern relies on this", async () => {
    const r = await spine()("create-sermon", { name: "" });
    expect(r.ok).toBe(false);
    expect(r.clause).toBe("State #3");
  });

  // v27 — Series Planner content-model rebuild. A sermon is one scheduled passage; its
  // Title · Big idea · Overview unit persists via create-then-update (the
  // create INSERT is never widened — slot draft/commit ruling).
  it("sermon big_idea + overview are unset at create and persist via update-sermon (create-then-update)", async () => {
    const seriesId = await mkSeries("Luke");
    const id = await mkSermon({ name: "Through the eyes of Luke", series_id: seriesId });

    // create-sermon does NOT write big_idea / overview (create-then-update).
    const before = await spine()("get-sermon", id);
    expect(before.big_idea == null || before.big_idea === "").toBe(true);
    expect(before.overview == null || before.overview === "").toBe(true);

    // They ride the debounced update path, gated by SERMON_COLUMNS (buildUpdate).
    await spine()("update-sermon", {
      id,
      fields: {
        big_idea: "To be a Christian is to be on mission with Jesus at the centre.",
        overview: "The big picture of Luke-Acts shows Jesus as the central figure in God's plan.",
      },
    });
    const after = await spine()("get-sermon", id);
    expect(after.big_idea).toMatch(/on mission/);
    expect(after.overview).toMatch(/central figure/);
  });

  // v29 — no "in a series but in no section" limbo on the CREATE path. The New
  // Sermon modal sets series_id (auto-selecting the lone in-progress series) but
  // never section_id; without auto-filing, such a sermon is invisible in the
  // Outline (which only buckets sermons with a section_id) though it shows in the
  // Schedule + study guide. create-sermon now files it under a section.
  it("create-sermon auto-files a section-less in-series sermon under the series' first section", async () => {
    const seriesId = await mkSeries("Luke");
    const firstR = await spine()("create-section", { series_id: seriesId, sort_order: 0, title: "Part one" });
    await spine()("create-section", { series_id: seriesId, sort_order: 1, title: "Part two" });
    // No section_id passed — the modal's exact shape.
    const sermonId = await mkSermon({ name: "Through Luke's eyes", series_id: seriesId });
    const row = await spine()("get-sermon", sermonId);
    expect(row.section_id).toBe(firstR.value.id); // first by sort_order, not the second section
  });

  it("create-sermon auto-creates 'Section 1' when a section-less in-series sermon's series has no sections yet", async () => {
    const seriesId = await mkSeries("Jonah");
    expect((await spine()("get-sections-by-series", seriesId)).length).toBe(0);
    const sermonId = await mkSermon({ name: "Running from God", series_id: seriesId });
    const secs: any[] = await spine()("get-sections-by-series", seriesId);
    expect(secs.length).toBe(1);
    expect(secs[0].title).toBe("Section 1");
    const row = await spine()("get-sermon", sermonId);
    expect(row.section_id).toBe(secs[0].id);
  });

  it("create-sermon respects an explicit section_id (planner draft/commit path) and never auto-creates a section", async () => {
    const seriesId = await mkSeries("Acts");
    const secR = await spine()("create-section", { series_id: seriesId, sort_order: 0, title: "Only section" });
    const sermonId = await mkSermon({ name: "Pentecost", series_id: seriesId, section_id: secR.value.id });
    const row = await spine()("get-sermon", sermonId);
    expect(row.section_id).toBe(secR.value.id);
    expect((await spine()("get-sections-by-series", seriesId)).length).toBe(1); // no spurious second section
  });

  it("create-sermon leaves a standalone (no-series) sermon section-less and spawns no section", async () => {
    const decoy = await mkSeries("Decoy"); // a series exists but is not referenced
    const sermonId = await mkSermon({ name: "One-off", is_one_off: 1 }); // no series_id
    const row = await spine()("get-sermon", sermonId);
    expect(row.series_id == null).toBe(true);
    expect(row.section_id == null).toBe(true);
    expect((await spine()("get-sections-by-series", decoy)).length).toBe(0);
  });

  it("guide-local study_guide_extras persists on the sermon and is not written by create-sermon", async () => {
    const seriesId = await mkSeries("Luke");
    const id = await mkSermon({ name: "Through the eyes of Mary", series_id: seriesId });

    const before = await spine()("get-sermon", id);
    expect(before.study_guide_extras == null).toBe(true);

    const extras = JSON.stringify({
      additions: [{ id: "a1", type: "question", text: "Where do you see God's faithfulness?" }],
      notesLines: 8,
    });
    await spine()("update-sermon", { id, fields: { study_guide_extras: extras } });
    const after = await spine()("get-sermon", id);
    expect(JSON.parse(after.study_guide_extras).additions[0].type).toBe("question");
  });

  it("retired series columns are dropped from update-series (book_background no longer writable)", async () => {
    const id = await mkSeries("Luke");
    // Only-retired-fields → no valid fields → rejected (State #5), proving the
    // book-study prompts left the writable set.
    const bad = await spine()("update-series", { id, fields: { book_background: "x", series_motivation: "y" } });
    expect(bad.ok).toBe(false);
    expect(bad.clause).toBe("State #5");

    // The series unit's own fields still apply.
    await spine()("update-series", { id, fields: { big_idea: "Reintroducing Jesus", overview: "An orderly account." } });
    const row = await spine()("get-series", id);
    expect(row.big_idea).toBe("Reintroducing Jesus");
    expect(row.overview).toBe("An orderly account.");
    expect(row.book_background).toBeUndefined();
  });
});
