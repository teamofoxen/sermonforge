import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Session-3 remediation — atomicity + relational validation, proven with
// EXPLICIT FAILURE INJECTION on the production seam (electron/persistence.cjs)
// against real SQLite.
//
// Injection tool: real SQLite triggers that RAISE(ABORT) on the exact write
// under test (an INSERT/DELETE on sermon_search, an UPDATE mid-reorder, the
// series.end_date mirror). The trigger fires INSIDE the mutation's
// transaction, so these tests observe genuine rollback behavior — not
// Promise.all() choreography, and not source-reading.

const requireCjs = createRequire(import.meta.url);
const BetterSqlite3 = requireCjs("better-sqlite3-node");
const { createPersistence } = requireCjs("../../electron/persistence.cjs");
const { MUTATION_KIND } = requireCjs("../../electron/contracts.cjs");

let tmpDir: string;
let db: any;
let p: any;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sf-atomic-"));
  db = new BetterSqlite3(path.join(tmpDir, "sermonforge.db"));
  db.pragma("journal_mode = WAL");
  p = createPersistence({ getDb: () => db, logError: () => {}, logInfo: () => {}, isDev: true });
  p.bootstrapSchema();
  p.migrate();
});

afterEach(() => {
  try { db?.close(); } catch { /* ok */ }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Injection helpers (real SQLite triggers) ─────────────────────────────────

function failSearchInserts(when = "") {
  db.exec(`CREATE TRIGGER _inject_search_insert BEFORE INSERT ON sermon_search ${when}
    BEGIN SELECT RAISE(ABORT, 'injected search-insert failure'); END;`);
  return () => db.exec("DROP TRIGGER _inject_search_insert");
}
function failSearchDeletes() {
  db.exec(`CREATE TRIGGER _inject_search_delete BEFORE DELETE ON sermon_search
    BEGIN SELECT RAISE(ABORT, 'injected search-delete failure'); END;`);
  return () => db.exec("DROP TRIGGER _inject_search_delete");
}

const sermonCount = () => p.queryOne("SELECT COUNT(*) AS c FROM sermons", []).c;
const searchRow = (id: string) => p.queryOne("SELECT * FROM sermon_search WHERE sermon_id = ?", [id]);
const sermonRow = (id: string) => p.queryOne("SELECT * FROM sermons WHERE id = ?", [id]);

describe("Part A — source and search commit or roll back together", () => {
  it("1. an index failure during sermon creation leaves NO sermon row", () => {
    const undo = failSearchInserts();
    expect(() => p.validateAndCommit("create-sermon", { name: "Doomed" })).toThrow(/injected/);
    undo();
    expect(sermonCount()).toBe(0); // the source INSERT rolled back with the projection
  });

  it("2. retrying creation after the failure produces exactly ONE sermon", () => {
    const undo = failSearchInserts();
    expect(() => p.validateAndCommit("create-sermon", { name: "Retry me" })).toThrow(/injected/);
    undo();
    const retry = p.validateAndCommit("create-sermon", { name: "Retry me" });
    expect(retry.ok).toBe(true);
    expect(sermonCount()).toBe(1);
    expect(searchRow(retry.value.id)).not.toBeNull();
  });

  it("3. an index failure during update leaves the original sermon AND search row unchanged", () => {
    const { value: { id } } = p.validateAndCommit("create-sermon", { name: "Original title" });
    const undo = failSearchInserts();
    expect(() => p.validateAndCommit("update-sermon", { id, fields: { title: "New title" } })).toThrow(/injected/);
    undo();
    expect(sermonRow(id).title).toBe("Original title");
    // indexSermonFtsFromRow DELETEs the old row before the (failing) INSERT —
    // the rollback must restore it too.
    expect(searchRow(id)).not.toBeNull();
    expect(searchRow(id).title).toBe("Original title");
  });

  it("4. an index failure during soft delete leaves source and search unchanged", () => {
    const { value: { id } } = p.validateAndCommit("create-sermon", { name: "Undeletable today" });
    const undo = failSearchDeletes();
    expect(() => p.validateAndCommit("delete-sermon", id)).toThrow(/injected/);
    undo();
    expect(sermonRow(id).deleted_at).toBeNull(); // tombstone rolled back
    expect(searchRow(id)).not.toBeNull();        // search row still present
  });

  it("5. an index failure during restore leaves source and search unchanged", () => {
    const { value: { id } } = p.validateAndCommit("create-sermon", { name: "Tombstoned" });
    expect(p.validateAndCommit("delete-sermon", id).ok).toBe(true);
    const undo = failSearchInserts();
    expect(() => p.validateAndCommit("restore-sermon", id)).toThrow(/injected/);
    undo();
    expect(sermonRow(id).deleted_at).not.toBeNull(); // still tombstoned
    expect(searchRow(id)).toBeNull();                // still unindexed
  });

  it("6. a series-title change updates every attached search row atomically — a mid-loop failure reverts them ALL", () => {
    const { value: { id: seriesId } } = p.validateAndCommit("create-series", { name: "Old Series Name" });
    const { value: { id: s1 } } = p.validateAndCommit("create-sermon", { name: "One", series_id: seriesId });
    const { value: { id: s2 } } = p.validateAndCommit("create-sermon", { name: "Two", series_id: seriesId });

    // Fail only when the SECOND sermon re-indexes — a genuine mid-loop failure.
    const undo = failSearchInserts(`WHEN NEW.sermon_id = '${s2}'`);
    expect(() => p.validateAndCommit("update-series", { id: seriesId, fields: { title: "New Series Name" } }))
      .toThrow(/injected/);
    undo();
    // The series title AND both search rows are back on the old name — the
    // first sermon's already-applied re-index rolled back with the rest.
    expect(p.queryOne("SELECT title FROM series WHERE id = ?", [seriesId]).title).toBe("Old Series Name");
    expect(searchRow(s1).series_title).toBe("Old Series Name");
    expect(searchRow(s2).series_title).toBe("Old Series Name");

    // And the healthy path works: the change lands everywhere together.
    expect(p.validateAndCommit("update-series", { id: seriesId, fields: { title: "New Series Name" } }).ok).toBe(true);
    expect(searchRow(s1).series_title).toBe("New Series Name");
    expect(searchRow(s2).series_title).toBe("New Series Name");
  });
});

describe("Part B — one visible planner gesture, one transaction", () => {
  function makeBookSeries(sectionTitles: string[]) {
    const { value: { id: seriesId } } = p.validateAndCommit("create-series", { name: "Book" });
    const sectionIds = sectionTitles.map((title, i) => {
      const r = p.validateAndCommit("create-section", { series_id: seriesId, title, sort_order: i });
      expect(r.ok).toBe(true);
      return r.value.id as string;
    });
    return { seriesId, sectionIds };
  }

  it("7. a failure in the middle of a section reorder rolls back EVERY sort order", () => {
    const { seriesId, sectionIds: [a, b, c] } = makeBookSeries(["A", "B", "C"]);
    db.exec(`CREATE TRIGGER _inject_sec BEFORE UPDATE OF sort_order ON series_sections
      WHEN NEW.id = '${c}' BEGIN SELECT RAISE(ABORT, 'injected reorder failure'); END;`);
    expect(() => p.validateAndCommit("reorder-sections", { series_id: seriesId, orderedIds: [b, a, c] }))
      .toThrow(/injected/);
    db.exec("DROP TRIGGER _inject_sec");
    const orders = Object.fromEntries(
      p.queryAll("SELECT id, sort_order FROM series_sections", []).map((r: any) => [r.id, r.sort_order]),
    );
    // b's already-applied move to 0 rolled back — the original order holds everywhere.
    expect(orders).toEqual({ [a]: 0, [b]: 1, [c]: 2 });
  });

  it("8. a failure in the middle of a topical sermon reorder rolls back every sort order", () => {
    const { value: { id: seriesId } } = p.validateAndCommit("create-series", { name: "Theme" });
    p.validateAndCommit("update-series", { id: seriesId, fields: { kind: "topical" } });
    const ids = ["S1", "S2", "S3"].map((n) => p.validateAndCommit("create-sermon", { name: n, series_id: seriesId }).value.id);
    expect(p.validateAndCommit("reorder-series-sermons", { series_id: seriesId, orderedIds: ids }).ok).toBe(true); // baseline 0,1,2
    db.exec(`CREATE TRIGGER _inject_ser BEFORE UPDATE OF sort_order ON sermons
      WHEN NEW.id = '${ids[0]}' AND NEW.sort_order = 2 BEGIN SELECT RAISE(ABORT, 'injected reorder failure'); END;`);
    // Move S1 to the end: [S2, S3, S1] — S1's write (sort_order 2) fails LAST.
    expect(() => p.validateAndCommit("reorder-series-sermons", { series_id: seriesId, orderedIds: [ids[1], ids[2], ids[0]] }))
      .toThrow(/injected/);
    db.exec("DROP TRIGGER _inject_ser");
    const orders = ids.map((id) => sermonRow(id).sort_order);
    expect(orders).toEqual([0, 1, 2]); // S2/S3's applied moves rolled back too
  });

  it("9. a Suggest-Sundays failure rolls back the sermon dates AND the series end_date mirror", () => {
    const { value: { id: seriesId } } = p.validateAndCommit("create-series", { name: "Dated", start_date: "2026-01-04" });
    const ids = ["D1", "D2"].map((n) => p.validateAndCommit("create-sermon", { name: n, series_id: seriesId }).value.id);
    db.exec(`CREATE TRIGGER _inject_end BEFORE UPDATE OF end_date ON series
      BEGIN SELECT RAISE(ABORT, 'injected mirror failure'); END;`);
    expect(() => p.validateAndCommit("bulk-date-sermons", {
      series_id: seriesId,
      dates: [{ id: ids[0], date: "2026-01-04" }, { id: ids[1], date: "2026-01-11" }],
    })).toThrow(/injected/);
    db.exec("DROP TRIGGER _inject_end");
    expect(sermonRow(ids[0]).date).toBe(""); // both date writes rolled back
    expect(sermonRow(ids[1]).date).toBe("");
    expect(p.queryOne("SELECT end_date FROM series WHERE id = ?", [seriesId]).end_date).toBe("");
  });
});

describe("Part C — main-boundary relational validation", () => {
  it("10. nonexistent parent ids are rejected (series on create-sermon; series on create-section)", () => {
    const r1 = p.validateAndCommit("create-sermon", { name: "Orphan", series_id: "ghost-series" });
    expect(r1.ok).toBe(false);
    expect(r1.code).toBe("NOT_FOUND");
    expect(sermonCount()).toBe(0);

    const r2 = p.validateAndCommit("create-section", { series_id: "ghost-series", title: "S" });
    expect(r2.ok).toBe(false);
    expect(r2.code).toBe("NOT_FOUND");
  });

  it("11. a section belonging to another series is rejected (incoherent series/section combination)", () => {
    const { value: { id: seriesA } } = p.validateAndCommit("create-series", { name: "A" });
    const { value: { id: seriesB } } = p.validateAndCommit("create-series", { name: "B" });
    const { value: { id: sectionB } } = p.validateAndCommit("create-section", { series_id: seriesB, title: "B1" });

    const r = p.validateAndCommit("create-sermon", { name: "Confused", series_id: seriesA, section_id: sectionB });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("STATE_1_SECTION_SERIES_MISMATCH");
    // And a bare section_id with no series at all is incoherent:
    const r2 = p.validateAndCommit("create-sermon", { name: "Confused too", section_id: sectionB });
    expect(r2.ok).toBe(false);
    expect(r2.code).toBe("STATE_1_INCOHERENT_PARENT");
  });

  it("12. updating a nonexistent row is rejected for sermon, series, and section (zero-row updates can't report success)", () => {
    for (const [op, payload] of [
      ["update-sermon", { id: "ghost", fields: { title: "x" } }],
      ["update-series", { id: "ghost", fields: { title: "x" } }],
      ["update-section", { id: "ghost", fields: { title: "x" } }],
    ] as const) {
      const r = p.validateAndCommit(op, payload);
      expect(r.ok, `${op} should reject a missing target`).toBe(false);
      expect(r.code).toBe("NOT_FOUND");
    }
  });

  it("13. a payload with one valid and one unknown field saves NEITHER — identically outside dev mode", () => {
    for (const isDev of [true, false]) {
      const inst = createPersistence({ getDb: () => db, logError: () => {}, logInfo: () => {}, isDev });
      const { value: { id } } = inst.validateAndCommit("create-sermon", { name: `Mixed ${isDev}` });
      const r = inst.validateAndCommit("update-sermon", { id, fields: { title: "Should not land", bogus_column: "x" } });
      expect(r.ok).toBe(false);
      expect(r.code).toBe("STATE_5_UNKNOWN_FIELD");
      expect(sermonRow(id).title).toBe(`Mixed ${isDev}`); // the valid sibling did NOT save
    }
  });

  it("14. existing successful behavior is unchanged (create/update/reorder/date all land)", () => {
    const { value: { id: seriesId } } = p.validateAndCommit("create-series", { name: "Healthy" });
    // Sections BEFORE the sermon so the book-series auto-file lands in S1
    // instead of minting an extra "Section 1" (the reorder below must name
    // every section exactly once — the op's own exact-cover validation).
    const secs = ["S1", "S2"].map((t, i) => p.validateAndCommit("create-section", { series_id: seriesId, title: t, sort_order: i }).value.id);
    const { value: { id } } = p.validateAndCommit("create-sermon", { name: "Fine", series_id: seriesId });
    expect(sermonRow(id).section_id).toBe(secs[0]); // auto-filed into the first section
    expect(p.validateAndCommit("update-sermon", { id, fields: { title: "Still fine" } }).ok).toBe(true);
    expect(sermonRow(id).title).toBe("Still fine");
    expect(searchRow(id).title).toBe("Still fine");

    expect(p.validateAndCommit("reorder-sections", { series_id: seriesId, orderedIds: [secs[1], secs[0]] }).ok).toBe(true);
    expect(p.queryOne("SELECT sort_order FROM series_sections WHERE id = ?", [secs[1]]).sort_order).toBe(0);

    const dated = p.validateAndCommit("bulk-date-sermons", { series_id: seriesId, dates: [{ id, date: "2026-02-01" }] });
    expect(dated.ok).toBe(true);
    expect(dated.value.end_date).toBe("2026-02-01");
    expect(p.queryOne("SELECT end_date FROM series WHERE id = ?", [seriesId]).end_date).toBe("2026-02-01");

    // The explicit repair mechanism still rebuilds the whole projection.
    expect(p.rebuildSearchIndex()).toBeGreaterThanOrEqual(1);
    expect(searchRow(id).title).toBe("Still fine");
  });
});
