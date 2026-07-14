import { describe, it, expect } from "vitest";
import * as seedMod from "../../electron/sampleSeriesData.js";
import * as contractsMod from "../../electron/contracts.cjs";
import { GENRES, bookById } from "../../src/data/canonicalBooks.js";
import { parsePassageRef } from "../../src/utils/passageRef.js";
import { computeCoverage } from "../../src/utils/coverage.js";

// The sample SERIES seed (the planner's worked example — the Luke plan) is
// INSERTed directly by the load-sample-series op, bypassing the create flows'
// validation. These tests lock the seed to the invariants those flows would
// have enforced, plus the seed-specific ones the reseed depends on. If the
// planner's shape changes, the seed must be re-authored before this suite
// goes green again — the drift surfaces here, not in the pastor's app.
const seed = seedMod.default || seedMod;
const contracts = contractsMod.default || contractsMod;
const { series, sections, sermons } = seed;

// The two rows whose passages are deliberately not chapter:verse references:
// the big-picture intro ("Luke-Acts") and the open Joseph slot ("" — the
// pastor's plan marked its text tbd). Both surface Coverage's honest
// "unreadable" affordance; everything else must parse.
const KNOWN_UNREADABLE_TITLES = new Set([
  "Through the Eyes of Luke: Introduction",
  "Through the Eyes of Joseph",
]);

describe("sample series seed — canonical classification", () => {
  it("is a book series on a real canonical book with a valid genre", () => {
    expect(series.kind).toBe("book");
    expect(bookById(series.book_id)).not.toBeNull();
    expect(Object.keys(GENRES)).toContain(series.canon_category);
  });

  it("the book node is complete: title, big idea, overview, structural outline, range", () => {
    for (const field of ["title", "big_idea", "overview", "structural_outline", "passage_range"]) {
      expect(String(series[field] ?? "").trim(), `series.${field}`).toBeTruthy();
    }
  });
});

describe("sample series seed — the reseed's delete scope", () => {
  // load-sample-series deletes by the sample-luke- prefix. Any row whose id
  // escapes the prefix would leak forever (invisible in lists, never cleaned).
  it("every id carries the sample-luke- prefix", () => {
    expect(series.id).toMatch(/^sample-luke-/);
    for (const sec of sections) expect(sec.id, sec.title).toMatch(/^sample-luke-/);
    for (const s of sermons) expect(s.id, s.title).toMatch(/^sample-luke-/);
  });

  it("never collides with the sample sermon's prefix family (sample-romans-)", () => {
    const all = [series.id, ...sections.map((x) => x.id), ...sermons.map((x) => x.id)];
    for (const id of all) expect(id.startsWith("sample-romans-"), id).toBe(false);
  });
});

describe("sample series seed — three-level structure", () => {
  it("has the four movements, contiguously ordered, each a complete unit", () => {
    expect(sections).toHaveLength(4);
    sections.forEach((sec, i) => {
      expect(sec.sort_order, sec.title).toBe(i);
      expect(sec.series_id).toBe(series.id);
      for (const field of ["title", "passage_range", "big_idea", "overview"]) {
        expect(String(sec[field] ?? "").trim(), `${sec.title} — ${field}`).toBeTruthy();
      }
    });
  });

  it("every sermon is named (State #3), filed under a real section, and contiguously ordered within it", () => {
    const sectionIds = new Set(sections.map((x) => x.id));
    const perSection = new Map();
    for (const s of sermons) {
      expect(String(s.title ?? "").trim(), s.id).toBeTruthy();
      expect(sectionIds.has(s.section_id), `${s.title} — section_id`).toBe(true);
      const list = perSection.get(s.section_id) || [];
      list.push(s.sort_order);
      perSection.set(s.section_id, list);
    }
    for (const [secId, orders] of perSection) {
      expect(orders, secId).toEqual(orders.map((_, i) => i));
    }
  });

  it("is the finished plan: every sermon carries a big idea; Part 1 carries overviews too", () => {
    for (const s of sermons) {
      expect(String(s.big_idea ?? "").trim(), `${s.title} — big_idea`).toBeTruthy();
    }
    const part1 = sermons.filter((s) => s.section_id === sections[0].id);
    expect(part1.length).toBeGreaterThan(0);
    for (const s of part1) {
      expect(String(s.overview ?? "").trim(), `${s.title} — overview`).toBeTruthy();
    }
  });

  it("covers the whole Gospel at the pastor's real scale (~104 planned)", () => {
    expect(sermons.length).toBeGreaterThanOrEqual(100);
  });

  it("seeds planner-born prep state: in progress, at Study / Observe", () => {
    for (const s of sermons) {
      expect(s.stage).toBe(contracts.SERMON_STATUS.InProgress);
      expect(s.current_stage).toBe(contracts.STAGE.Study);
      expect(s.current_sub_phase).toBe(contracts.SUB_PHASE.Observe);
    }
  });
});

describe("sample series seed — the Schedule", () => {
  it("lays every sermon on a Sunday, ascending in outline order, with the series dates mirrored", () => {
    let prev = null;
    for (const s of sermons) {
      expect(s.date, s.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const d = new Date(`${s.date}T00:00:00Z`);
      expect(d.getUTCDay(), `${s.title} — ${s.date} is not a Sunday`).toBe(0);
      if (prev) expect(s.date > prev, `${s.title} — dates must ascend`).toBe(true);
      prev = s.date;
    }
    expect(series.start_date).toBe(sermons[0].date);
    expect(series.end_date).toBe(sermons[sermons.length - 1].date);
  });
});

describe("sample series seed — passages and Coverage", () => {
  it("every passage parses against Luke, except the two deliberate non-references", () => {
    for (const s of sermons) {
      const ref = parsePassageRef(s.passage, series.book_id);
      if (KNOWN_UNREADABLE_TITLES.has(s.title)) {
        expect(ref.error, `${s.title} should stay unreadable`).toBe(true);
      } else {
        expect(ref.error, `${s.title} — "${s.passage}" must parse`).not.toBe(true);
      }
    }
  });

  it("tiles the Gospel with no gaps — Coverage reads 100%", () => {
    const cov = computeCoverage(series.book_id, sermons, series.passage_range);
    expect(cov.mode).toBe("verse");
    expect(cov.gaps).toEqual([]);
    expect(cov.percent).toBe(100);
    expect(cov.unreadable).toHaveLength(KNOWN_UNREADABLE_TITLES.size);
  });

  it("carries exactly the one true overlap the pastor planned (two sermons on Luke 1:1-4)", () => {
    const cov = computeCoverage(series.book_id, sermons, series.passage_range);
    expect(cov.overlaps).toHaveLength(1);
    const { a, b } = cov.overlaps[0];
    // Coverage indexes slots 1-based in list order.
    const titles = [sermons[a - 1].title, sermons[b - 1].title].sort();
    expect(titles).toEqual(["Through the Eyes of Skeptics", "Through the Eyes of Theophilus"]);
  });
});
