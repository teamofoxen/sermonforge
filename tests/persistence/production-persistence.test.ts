import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Session-2 remediation — the PRODUCTION persistence seam against REAL SQLite.
//
// What this suite executes is the actual production code: the mutation
// dispatcher (validateAndCommit), read router (spineRead), query helpers,
// search projection, bootstrap DDL, and the FULL migration ladder from
// electron/persistence.cjs — the exact module electron/main.js delegates to.
// No in-memory Map fixture, no mirror.
//
// HONEST SCOPE: the database binary is `better-sqlite3-node`, an npm alias of
// the same better-sqlite3 version installed so plain-Node vitest can always
// load it regardless of what ABI `node_modules/better-sqlite3` carries after
// an @electron/rebuild. Same JS library, same SQLite; not the same physical
// binary Electron ships. The IPC surface and Electron lifecycle in main.js
// are NOT executed here (wiring is tripwire-scanned elsewhere).

const requireCjs = createRequire(import.meta.url);
const BetterSqlite3 = requireCjs("better-sqlite3-node");
const { createPersistence } = requireCjs("../../electron/persistence.cjs");
const { MUTATION_KIND, STAGE, SUB_PHASE, SERMON_COLUMNS, SERIES_COLUMNS, SECTION_COLUMNS } = requireCjs("../../electron/contracts.cjs");

type Persistence = ReturnType<typeof createPersistence>;

let tmpDir: string;
let dbFile: string;
let db: any;
let p: Persistence;
let loggedErrors: unknown[][];

function openAt(file: string): { db: any; p: Persistence } {
  const handle = new BetterSqlite3(file);
  handle.pragma("journal_mode = WAL");
  handle.pragma("synchronous = NORMAL");
  const inst = createPersistence({
    getDb: () => handle,
    logError: (...args: unknown[]) => loggedErrors.push(args),
    logInfo: () => {},
    isDev: true, // dev-throw on unknown update fields — accidents fail loudly here
  });
  return { db: handle, p: inst };
}

// Production boot order for a fresh library: bootstrap DDL, then the ladder
// inside one transaction (initDatabase does exactly this via bootstrapSchema()
// + migrate()).
function bootAt(file: string): { db: any; p: Persistence } {
  const o = openAt(file);
  o.p.bootstrapSchema();
  o.p.migrate();
  return o;
}

beforeEach(() => {
  loggedErrors = [];
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sf-persistence-"));
  dbFile = path.join(tmpDir, "sermonforge.db");
  ({ db, p } = bootAt(dbFile));
});

afterEach(() => {
  try { db?.close(); } catch { /* already closed by a test */ }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("production persistence seam — real SQLite", () => {
  it("1. creates and reads back a sermon (canonical shape + position)", () => {
    const res = p.validateAndCommit("create-sermon", { name: "Romans 8:1–4", passage: "Romans 8:1-4" });
    expect(res.ok).toBe(true);
    const id = res.value.id;
    const sermon = p.spineRead("get-sermon", id);
    expect(sermon.name).toBe("Romans 8:1–4");
    expect(sermon.position).toEqual({ stage: STAGE.Study, subPhase: SUB_PHASE.Observe });
    // And it is a real row on disk, not an in-memory shape.
    expect(p.queryOne("SELECT title FROM sermons WHERE id = ?", [id]).title).toBe("Romans 8:1–4");
  });

  it("2. updates a structured sermon field through apply-mutation (user_input)", () => {
    const { value: { id } } = p.validateAndCommit("create-sermon", { name: "Structured" });
    const res = p.validateAndCommit("apply-mutation", {
      kind: MUTATION_KIND.UserInput,
      sermonId: id,
      field: "observations",
      value: { op: "set", questionKey: "context", value: "Paul writes from prison." },
    });
    expect(res.ok).toBe(true);
    const stored = JSON.parse(p.queryOne("SELECT observations FROM sermons WHERE id = ?", [id]).observations);
    expect(stored.context).toBe("Paul writes from prison.");
  });

  it("3. creates a series and attaches a sermon — parent context + the no-section-less-limbo auto-file", () => {
    const s = p.validateAndCommit("create-series", { name: "Romans" });
    expect(s.ok).toBe(true);
    const seriesId = s.value.id;
    const c = p.validateAndCommit("create-sermon", { name: "The Gospel's Power", series_id: seriesId });
    expect(c.ok).toBe(true);
    const sermon = p.spineRead("get-sermon", c.value.id);
    expect(sermon.parentContext).toMatchObject({
      seriesId,
      seriesName: "Romans",
      positionInSeries: 1,
      totalInSeries: 1,
    });
    // A book series auto-files the section-less create into "Section 1".
    const sections = p.spineRead("get-sections-by-series", seriesId);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("Section 1");
    expect(sermon.section_id).toBe(sections[0].id);
  });

  it("3b. Series Discovery reasoning (v34) round-trips on all three entities via create-then-update; the create INSERTs leave it NULL", () => {
    // The Discover walk creates real sections/sermons (shared with Outline) and
    // writes only its reasoning to the per-entity `discovery` JSON. Prove the
    // column is writable through the real spine ops and reads straight back.
    const seriesId = p.validateAndCommit("create-series", { name: "Luke" }).value.id;
    const sectionId = p.validateAndCommit("create-section", { series_id: seriesId, title: "Major Section 1", sort_order: 0 }).value.id;
    const sermonId = p.validateAndCommit("create-sermon", { name: "Zechariah", series_id: seriesId, section_id: sectionId, passage: "Luke 1:5-25" }).value.id;

    // create-then-update ruling: the create INSERTs never widen to `discovery`.
    expect(p.queryOne("SELECT discovery FROM series WHERE id = ?", [seriesId]).discovery).toBeNull();
    expect(p.queryOne("SELECT discovery FROM series_sections WHERE id = ?", [sectionId]).discovery).toBeNull();
    expect(p.queryOne("SELECT discovery FROM sermons WHERE id = ?", [sermonId]).discovery).toBeNull();

    // Write each entity's reasoning envelope through the SAME update ops the
    // canonical fields use (buildUpdate must accept `discovery` in every allowlist).
    const seriesDisc = JSON.stringify({ readNotes: "reversal everywhere", bigIdeaCandidateA: "Reintroducing Jesus." });
    const sectionDisc = JSON.stringify({ whyBegin: "the prologue opens the work", whyEnd: "the temptation closes preparation" });
    const sermonDisc = JSON.stringify({ whyBegin: "scene-shift to the temple", subject: "a faithful priest", complement: "God answers in His time", authorialFunction: "Encouraging" });
    expect(p.validateAndCommit("update-series", { id: seriesId, fields: { discovery: seriesDisc } }).ok).toBe(true);
    expect(p.validateAndCommit("update-section", { id: sectionId, fields: { discovery: sectionDisc } }).ok).toBe(true);
    expect(p.validateAndCommit("update-sermon", { id: sermonId, fields: { discovery: sermonDisc } }).ok).toBe(true);

    // Reads (SELECT *) carry `discovery` straight through.
    expect(p.spineRead("get-series", seriesId).discovery).toBe(seriesDisc);
    const section = p.spineRead("get-sections-by-series", seriesId).find((s: any) => s.id === sectionId);
    expect(section.discovery).toBe(sectionDisc);
    const serm = p.spineRead("get-sermons-by-series", seriesId).find((s: any) => s.id === sermonId);
    expect(JSON.parse(serm.discovery).authorialFunction).toBe("Encouraging");

    // And a canonical edit does NOT disturb the reasoning envelope (they are
    // independent columns — two views of one row, not one blob).
    expect(p.validateAndCommit("update-sermon", { id: sermonId, fields: { big_idea: "God uses the faithful" } }).ok).toBe(true);
    const after = p.spineRead("get-sermons-by-series", seriesId).find((s: any) => s.id === sermonId);
    expect(after.big_idea).toBe("God uses the faithful");
    expect(after.discovery).toBe(sermonDisc);

    // `discovery` is NOT indexed into sermon_search (reasoning, not manuscript content).
    const searchCols = new Set(p.queryAll("PRAGMA table_info(sermon_search)", []).map((r: any) => r.name));
    expect(searchCols.has("discovery")).toBe(false);
  });

  it("4. soft-deletes and restores a sermon (tombstone + search row lifecycle)", () => {
    const { value: { id } } = p.validateAndCommit("create-sermon", { name: "Tombstone" });
    expect(p.queryOne("SELECT sermon_id FROM sermon_search WHERE sermon_id = ?", [id])).not.toBeNull();

    expect(p.validateAndCommit("delete-sermon", id).ok).toBe(true);
    // Row remains (soft delete), lists exclude it, search row is gone.
    expect(p.queryOne("SELECT deleted_at FROM sermons WHERE id = ?", [id]).deleted_at).not.toBeNull();
    expect(p.spineRead("get-all-sermons", null)).toHaveLength(0);
    expect(p.queryOne("SELECT sermon_id FROM sermon_search WHERE sermon_id = ?", [id])).toBeNull();

    expect(p.validateAndCommit("restore-sermon", id).ok).toBe(true);
    expect(p.queryOne("SELECT deleted_at FROM sermons WHERE id = ?", [id]).deleted_at).toBeNull();
    expect(p.spineRead("get-all-sermons", null)).toHaveLength(1);
    expect(p.queryOne("SELECT sermon_id FROM sermon_search WHERE sermon_id = ?", [id])).not.toBeNull();
  });

  it("5. an update refreshes the search projection row", () => {
    const { value: { id } } = p.validateAndCommit("create-sermon", { name: "Before title" });
    const res = p.validateAndCommit("update-sermon", { id, fields: { title: "Galatians grace" } });
    expect(res.ok).toBe(true);
    expect(p.queryOne("SELECT title FROM sermon_search WHERE sermon_id = ?", [id]).title)
      .toBe("Galatians grace");
  });

  it("6. rejects a nameless sermon (State #3) and writes nothing", () => {
    const res = p.validateAndCommit("create-sermon", { name: "   " });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("STATE_3_NAMELESS_SERMON");
    expect(p.queryOne("SELECT COUNT(*) AS c FROM sermons", []).c).toBe(0);
  });

  it("7. rejects a nameless series (State #3) and writes nothing", () => {
    const res = p.validateAndCommit("create-series", { name: "" });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("STATE_3_NAMELESS_SERIES");
    expect(p.queryOne("SELECT COUNT(*) AS c FROM series", []).c).toBe(0);
  });

  it("8. state survives close and reopen of the temporary database file", () => {
    const { value: { id } } = p.validateAndCommit("create-sermon", { name: "Durable" });
    db.close();

    const reopened = bootAt(dbFile); // production reopen re-runs the (idempotent-at-version) ladder
    db = reopened.db;
    p = reopened.p;
    const sermon = p.spineRead("get-sermon", id);
    expect(sermon).not.toBeNull();
    expect(sermon.name).toBe("Durable");
  });

  it("9. the production migration entry point runs the full ladder on a fresh DB and is a stable no-op on a current one", () => {
    // beforeEach already ran bootstrapSchema() + migrate() — the production
    // fresh-install path. The ladder must have reached the current version…
    const v1 = Number(p.queryOne("SELECT value FROM meta WHERE key = 'schema_version'", []).value);
    expect(Number.isInteger(v1)).toBe(true);
    expect(v1).toBeGreaterThanOrEqual(33);
    // …and produced the v33 artifact (Manuscript's per-stage sub-phase memory).
    const cols = new Set(p.queryAll("PRAGMA table_info(sermons)", []).map((r: any) => r.name));
    expect(cols.has("last_manuscript_subphase")).toBe(true);

    // Running the SAME production entry point again on the now-current DB must
    // change nothing (every block is version-gated).
    p.migrate();
    const v2 = Number(p.queryOne("SELECT value FROM meta WHERE key = 'schema_version'", []).value);
    expect(v2).toBe(v1);

    // And the live schema satisfies the SERMON / SERIES / SECTION column
    // contracts — assertSchemaContract logs nothing (its ERROR path stays
    // silent). v34 extended the canary to series_sections; the full ladder must
    // satisfy all three allowlists, including each table's `discovery` column.
    const before = loggedErrors.length;
    p.assertSchemaContract();
    expect(loggedErrors.length).toBe(before);
    for (const col of SERMON_COLUMNS) {
      expect(cols.has(col), `sermons.${col} missing after full ladder`).toBe(true);
    }
    const seriesCols = new Set(p.queryAll("PRAGMA table_info(series)", []).map((r: any) => r.name));
    for (const col of SERIES_COLUMNS) {
      expect(seriesCols.has(col), `series.${col} missing after full ladder`).toBe(true);
    }
    const sectionCols = new Set(p.queryAll("PRAGMA table_info(series_sections)", []).map((r: any) => r.name));
    for (const col of SECTION_COLUMNS) {
      expect(sectionCols.has(col), `series_sections.${col} missing after full ladder`).toBe(true);
    }
    // The v34 additions specifically — Series Discovery's per-entity reasoning columns.
    expect(cols.has("discovery"), "sermons.discovery (v34) missing").toBe(true);
    expect(seriesCols.has("discovery"), "series.discovery (v34) missing").toBe(true);
    expect(sectionCols.has("discovery"), "series_sections.discovery (v34) missing").toBe(true);
  });
});
