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
const { MUTATION_KIND, STAGE, SUB_PHASE, SERMON_COLUMNS } = requireCjs("../../electron/contracts.cjs");

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

    // And the live schema satisfies the SERMON_COLUMNS contract —
    // assertSchemaContract logs nothing (its ERROR path stays silent).
    const before = loggedErrors.length;
    p.assertSchemaContract();
    expect(loggedErrors.length).toBe(before);
    for (const col of SERMON_COLUMNS) {
      expect(cols.has(col), `sermons.${col} missing after full ladder`).toBe(true);
    }
  });
});
