import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Session-4 remediation — the migration + recovery matrix, executed for real.
//
// Every proof here runs the ACTUAL production code against real SQLite files:
// the full migration ladder + transaction wrapper (electron/persistence.cjs
// `migrate()`), the boot recovery (electron/dbRecovery.cjs
// `openPrimaryWithRecovery` — the verbatim Phase-1 extraction main.js now
// consumes), and the legacy candidate resolver (electron/dbMigration.js).
// Rollback is OBSERVED on disk, not inferred from source. The old
// source-scan guards in tests/unit/migration-safety.test.js remain as cheap
// tripwires; this file is the behavioral coverage they always disclaimed.
//
// FIXTURES are built programmatically; each states the historical contract it
// represents. The base recipe mirrors production exactly: initDatabase always
// runs bootstrapSchema() (CREATE TABLE IF NOT EXISTS — the current bootstrap
// floor) before the ladder, so "a vN library opened by today's build" =
// bootstrap + rows + meta.schema_version = N.
//
// HONEST SCOPE: main.js's initDatabase ORCHESTRATION (phase ordering, boot
// backup, whenReady abort) is not executed here — it stays source-scanned;
// the pieces it composes are what this file executes.

const requireCjs = createRequire(import.meta.url);
const BetterSqlite3 = requireCjs("better-sqlite3-node");
const { createPersistence } = requireCjs("../../electron/persistence.cjs");
const { createDbRecovery } = requireCjs("../../electron/dbRecovery.cjs");
const { migrateLegacyDb } = requireCjs("../../electron/dbMigration.js");

let tmpDir: string;
// Every handle a test opens registers here; afterEach closes them all so an
// assertion throw mid-test can never leak a handle into the rmSync (Windows
// EPERMs on directories holding open SQLite files).
let openDbs: any[] = [];
const track = <T extends { close: () => void }>(db: T): T => { openDbs.push(db); return db; };

beforeEach(() => {
  openDbs = [];
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sf-matrix-"));
});
afterEach(() => {
  for (const db of openDbs) { try { db.close(); } catch { /* already closed */ } }
  // Windows can hold just-closed SQLite handles for a beat — retry the sweep.
  fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
});

function open(file: string) {
  const db = track(new BetterSqlite3(file));
  db.pragma("journal_mode = WAL");
  const p = createPersistence({ getDb: () => db, logError: () => {}, logInfo: () => {}, isDev: true });
  return { db, p };
}

// A REAL vN≥21 library passed v17/v21 historically, so it carries the position
// columns the v33 rewrite touches. The bootstrap floor deliberately doesn't
// include them (they're ladder-owned) — add them with the shipped ALTER text,
// exactly as the historical ladder did.
function addPositionColumns(p: any) {
  p.dbRun("ALTER TABLE sermons ADD COLUMN current_stage TEXT NOT NULL DEFAULT 'Study'");
  p.dbRun("ALTER TABLE sermons ADD COLUMN current_sub_phase TEXT");
  p.dbRun("ALTER TABLE sermons ADD COLUMN last_study_subphase TEXT");
  p.dbRun("ALTER TABLE sermons ADD COLUMN last_assembly_subphase TEXT");
}

function setVersion(p: any, n: number) {
  p.dbRun("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  p.dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)", [String(n)]);
}
const version = (p: any) => Number(p.queryOne("SELECT value FROM meta WHERE key = 'schema_version'", [])?.value);
const columns = (p: any, table: string) =>
  new Set(p.queryAll(`PRAGMA table_info(${table})`, []).map((r: any) => r.name));

// FIXTURE: "a v21 library opened by today's build" — the PRE-SEARCH contract
// (sermon_search does not exist yet; v22 creates + backfills it). Bootstrap
// floor + era rows + version 21, exactly what production sees.
function fixturePreSearch(file: string, rows: Array<Record<string, string>>) {
  const { db, p } = open(file);
  p.bootstrapSchema();
  addPositionColumns(p); // a real v21 library carries the v17/v21 columns
  for (const r of rows) {
    p.dbRun(
      "INSERT INTO sermons (id, title, passage, observations, outline) VALUES (?, ?, ?, ?, ?)",
      [r.id, r.title, r.passage ?? "", r.observations ?? "", r.outline ?? "[]"],
    );
  }
  p.dbRun("INSERT INTO series (id, title) VALUES ('ser-1', 'Old Series')");
  setVersion(p, 21);
  return { db, p };
}

describe("migration matrix — the production ladder against real historical states", () => {
  it("pre-search (v21) library migrates to current: sermon_search created AND backfilled; reopens cleanly; re-run is a no-op (proofs 3, 7, 10-adjacent, 11)", () => {
    const file = path.join(tmpDir, "v21.db");
    const { db, p } = fixturePreSearch(file, [
      { id: "s-1", title: "Kept sermon", passage: "Rom 8" },
      { id: "s-2", title: "Second sermon", passage: "Gal 1" },
    ]);
    const ranFirst = p.migrate();
    expect(ranFirst).toBe(true); // blocks ran
    expect(version(p)).toBeGreaterThanOrEqual(33);
    // Canonical sermon/series state SURVIVED the whole ladder (proof 7).
    expect(p.queryOne("SELECT title FROM sermons WHERE id = 's-1'", []).title).toBe("Kept sermon");
    expect(p.queryOne("SELECT title FROM series WHERE id = 'ser-1'", []).title).toBe("Old Series");
    // The v22 backfill indexed the pre-existing rows.
    expect(p.queryOne("SELECT COUNT(*) AS c FROM sermon_search", []).c).toBe(2);
    // Idempotence where expected (proof 11): a second run changes nothing.
    const before = p.queryAll("SELECT id, title FROM sermons ORDER BY id", []);
    expect(p.migrate()).toBe(false); // no block ran
    expect(version(p)).toBeGreaterThanOrEqual(33);
    expect(p.queryAll("SELECT id, title FROM sermons ORDER BY id", [])).toEqual(before);
    // Successful migration reopens cleanly (proof 3).
    db.close();
    const re = open(file);
    expect(re.db.pragma("quick_check")[0].quick_check).toBe("ok");
    expect(re.p.queryOne("SELECT COUNT(*) AS c FROM sermons", []).c).toBe(2);
    re.db.close();
  });

  it("pre-soft-delete (v23) library gains deleted_at with every row live", () => {
    // FIXTURE: the PRE-SOFT-DELETE contract (v24 added the tombstone column).
    const file = path.join(tmpDir, "v23.db");
    const { db, p } = fixturePreSearch(file, [{ id: "s-1", title: "Alive" }]);
    setVersion(p, 23); // bootstrap floor + v23 contract
    p.migrate();
    expect(columns(p, "sermons").has("deleted_at")).toBe(true);
    expect(p.queryOne("SELECT deleted_at FROM sermons WHERE id = 's-1'", []).deleted_at).toBeNull();
    db.close();
  });

  it("pre-series-normalization (v27) library: the section-less in-series sermon is healed into Section 1; a dangling series_id goes standalone", () => {
    // FIXTURE: the PRE-SERIES-NORMALIZATION contract (v28/v29 heal the
    // no-"section-less limbo" invariant; v30+ add kind/sort_order/book_id).
    const file = path.join(tmpDir, "v27.db");
    const { db, p } = open(file);
    p.bootstrapSchema();
    addPositionColumns(p); // real v27 libraries carry the v17/v21 columns
    p.dbRun("INSERT INTO series (id, title) VALUES ('ser-A', 'Real Series')");
    p.dbRun("INSERT INTO sermons (id, title, series_id, section_id) VALUES ('s-limbo', 'Limbo', 'ser-A', NULL)");
    p.dbRun("INSERT INTO sermons (id, title, series_id, section_id) VALUES ('s-dangling', 'Dangling', 'ghost-series', NULL)");
    // deleted_at exists from v24 in a real v27 DB (the heal query filters on it).
    p.dbRun("ALTER TABLE sermons ADD COLUMN deleted_at TEXT DEFAULT NULL");
    setVersion(p, 27);
    p.migrate();
    const limbo = p.queryOne("SELECT section_id FROM sermons WHERE id = 's-limbo'", []);
    expect(limbo.section_id).not.toBeNull(); // healed into the auto-created Section 1
    expect(p.queryOne("SELECT title FROM series_sections WHERE id = ?", [limbo.section_id]).title).toBe("Section 1");
    expect(p.queryOne("SELECT series_id FROM sermons WHERE id = 's-dangling'", []).series_id).toBeNull();
    // v30-32 additive columns arrived too.
    const cols = columns(p, "sermons");
    expect(cols.has("sort_order")).toBe(true);
    expect(cols.has("book_id")).toBe(true);
    expect(cols.has("tags")).toBe(true);
    db.close();
  });

  it("schema 32 migrates forward: v33 Equip/Frame positions rewritten, per-stage memory seeded; ladder reaches head 34 (proof 10)", () => {
    // FIXTURE: the v32 contract — position columns present per the shipped
    // v17/v21 ALTERs (same DDL text), OEM-era in-flight positions on disk.
    const file = path.join(tmpDir, "v32.db");
    const { db, p } = open(file);
    p.bootstrapSchema();
    addPositionColumns(p);
    p.dbRun("ALTER TABLE sermons ADD COLUMN deleted_at TEXT DEFAULT NULL");
    p.dbRun(`INSERT INTO sermons (id, title, current_stage, current_sub_phase, last_assembly_subphase, last_touched_position)
             VALUES ('s-equip', 'Equip sermon', 'Assembly', 'Equip', 'Equip', 'Assembly/Equip/equip')`);
    p.dbRun(`INSERT INTO sermons (id, title, current_stage, current_sub_phase, last_assembly_subphase, last_touched_position)
             VALUES ('s-frame', 'Frame sermon', 'Assembly', 'Frame', 'Frame', 'Assembly/Frame/introduction')`);
    p.dbRun(`INSERT INTO sermons (id, title, current_stage, current_sub_phase, last_touched_position)
             VALUES ('s-legacy-ms', 'Old manuscript', 'Manuscript', 'Manuscript', 'Manuscript/Manuscript/manuscript')`);
    setVersion(p, 32);
    p.migrate();
    // migrate() runs the full ladder to head — v33 (this proof's substance) plus
    // v34 (Series Discovery's discovery columns). Head is 34 since 2026-07-22.
    expect(version(p)).toBe(34);
    expect(columns(p, "sermons").has("last_manuscript_subphase")).toBe(true);

    const equip = p.queryOne("SELECT * FROM sermons WHERE id = 's-equip'", []);
    expect(equip.current_stage).toBe("Manuscript");
    expect(equip.current_sub_phase).toBe("Body");
    expect(equip.last_manuscript_subphase).toBe("Body");
    expect(equip.last_assembly_subphase).toBe("Outline");
    expect(equip.last_touched_position).toBe("Manuscript/Body/equip");

    const frame = p.queryOne("SELECT * FROM sermons WHERE id = 's-frame'", []);
    expect(frame.current_stage).toBe("Manuscript");
    expect(frame.current_sub_phase).toBe("IntroTransitionsConclusion");
    expect(frame.last_touched_position).toBe("Manuscript/IntroTransitionsConclusion/introduction");

    const legacy = p.queryOne("SELECT * FROM sermons WHERE id = 's-legacy-ms'", []);
    expect(legacy.current_sub_phase).toBe("IntroTransitionsConclusion");
    expect(legacy.last_touched_position).toBe("Manuscript/IntroTransitionsConclusion/manuscript");
    db.close();
  });

  it("schema 33 becomes 34: the per-entity `discovery` column is added to series, series_sections, AND sermons; nullable, no backfill (proof 11)", () => {
    // FIXTURE: a v33 library — bootstrap floor + version 33. v34 (Series
    // Discovery) is the only block that runs.
    const file = path.join(tmpDir, "v33.db");
    const { db, p } = open(file);
    p.bootstrapSchema();
    addPositionColumns(p);
    p.dbRun("ALTER TABLE sermons ADD COLUMN deleted_at TEXT DEFAULT NULL");
    // A pre-existing row on each table, so we can prove the additive column
    // reads NULL with no backfill (existing plans are unaffected).
    p.dbRun("INSERT INTO series (id, title) VALUES ('ser-d', 'Pre-v34 series')");
    p.dbRun("INSERT INTO series_sections (id, series_id, title) VALUES ('sec-d', 'ser-d', 'Pre-v34 movement')");
    p.dbRun("INSERT INTO sermons (id, title) VALUES ('serm-d', 'Pre-v34 sermon')");
    setVersion(p, 33);

    // Before: discovery is on none of the three tables.
    expect(columns(p, "series").has("discovery")).toBe(false);
    expect(columns(p, "series_sections").has("discovery")).toBe(false);
    expect(columns(p, "sermons").has("discovery")).toBe(false);

    p.migrate();

    expect(version(p)).toBe(34);
    // After: discovery is on all three, additive and nullable (existing rows NULL).
    expect(columns(p, "series").has("discovery")).toBe(true);
    expect(columns(p, "series_sections").has("discovery")).toBe(true);
    expect(columns(p, "sermons").has("discovery")).toBe(true);
    expect(p.queryOne("SELECT discovery FROM series WHERE id = 'ser-d'", []).discovery).toBeNull();
    expect(p.queryOne("SELECT discovery FROM series_sections WHERE id = 'sec-d'", []).discovery).toBeNull();
    expect(p.queryOne("SELECT discovery FROM sermons WHERE id = 'serm-d'", []).discovery).toBeNull();
    // (assertSchemaContract's clean pass — now including SECTION_COLUMNS — is
    // proven against the FULL ladder in production-persistence.test.ts proof 9,
    // where every allowlist column exists; this partial v33 fixture deliberately
    // skips v2–v33's columns, so it is not the place for that check.)
    db.close();
  });

  it("malformed structured JSON fails SOFT: the ladder completes and search indexes the raw text (proof 6)", () => {
    // FIXTURE: a v21 library carrying a corrupted-but-openable row — broken
    // JSON in structured columns (the fail-soft contract: extractJsonText
    // indexes legacy/damaged values as raw text; nothing throws).
    const file = path.join(tmpDir, "malformed.db");
    const { db, p } = fixturePreSearch(file, [
      { id: "s-bad", title: "Damaged JSON", observations: "{{{not json", outline: "[broken" },
    ]);
    expect(() => p.migrate()).not.toThrow();
    expect(version(p)).toBeGreaterThanOrEqual(33);
    const row = p.queryOne("SELECT observations FROM sermon_search WHERE sermon_id = 's-bad'", []);
    expect(row.observations).toBe("{{{not json"); // indexed as raw text, not dropped
    db.close();
  });

  it("missing optional historical columns are re-added by the v14 reconciliation backstop", () => {
    // FIXTURE: the SWALLOWED-ALTER contract — a truly old library (hand DDL,
    // no bootstrap floor: CREATE IF NOT EXISTS then skips these tables, which
    // is exactly how production preserves the damage) whose prior install
    // bumped the version past v2/v4 while an ALTER silently failed, leaving
    // functional_elements/checklist missing at version 13.
    const file = path.join(tmpDir, "v13-degraded.db");
    const db = track(new BetterSqlite3(file));
    db.exec(`CREATE TABLE sermons (id TEXT PRIMARY KEY, series_id TEXT, title TEXT NOT NULL,
      passage TEXT DEFAULT '', date TEXT DEFAULT '', preacher TEXT DEFAULT '', stage TEXT DEFAULT 'planning',
      big_idea TEXT DEFAULT '', mpt TEXT DEFAULT '', mps TEXT DEFAULT '', observations TEXT DEFAULT '',
      interpretation TEXT DEFAULT '', redemptive_thread TEXT DEFAULT '', implications TEXT DEFAULT '',
      outline TEXT DEFAULT '[]', manuscript TEXT DEFAULT '', delivery_notes TEXT DEFAULT '',
      timing_notes TEXT DEFAULT '', post_sermon TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));`);
    db.exec(`CREATE TABLE series (id TEXT PRIMARY KEY, title TEXT NOT NULL, color TEXT DEFAULT 'gold',
      description TEXT DEFAULT '', year INTEGER DEFAULT 2024);`);
    db.exec("INSERT INTO sermons (id, title) VALUES ('s-old', 'Ancient sermon')");
    const p = createPersistence({ getDb: () => db, logError: () => {}, logInfo: () => {}, isDev: true });
    setVersion(p, 13);
    p.bootstrapSchema(); // production floor: CREATE IF NOT EXISTS — leaves the degraded tables as-is
    expect(columns(p, "sermons").has("functional_elements")).toBe(false); // the damage is real
    p.migrate();
    const cols = columns(p, "sermons");
    expect(cols.has("functional_elements")).toBe(true); // v14 reconciliation healed it
    expect(cols.has("checklist")).toBe(true);
    expect(p.queryOne("SELECT title FROM sermons WHERE id = 's-old'", []).title).toBe("Ancient sermon");
    db.close();
  });

  it("a migration that throws midway rolls the WHOLE transaction back — version, DDL, and rows untouched; the original stays recoverable (proofs 1, 2)", () => {
    // FIXTURE: v21 library + a sabotaged sermon_search (wrong schema, so the
    // v22 CREATE IF NOT EXISTS skips it and the backfill INSERT throws — a
    // genuine mid-ladder failure inside the production transaction).
    const file = path.join(tmpDir, "midway.db");
    const { db, p } = fixturePreSearch(file, [{ id: "s-1", title: "Survives rollback" }]);
    p.dbRun("CREATE TABLE sermon_search (bogus INTEGER)");
    expect(() => p.migrate()).toThrow(/no such column|has no column/i);
    // Rolled back COMPLETELY: version unchanged, later DDL absent, rows intact.
    expect(version(p)).toBe(21);
    expect(columns(p, "sermons").has("deleted_at")).toBe(false); // v24 never landed
    expect(p.queryOne("SELECT title FROM sermons WHERE id = 's-1'", []).title).toBe("Survives rollback");
    // The original database remains RECOVERABLE after the failure (proof 2):
    // close, reopen, quick_check clean — and once the obstacle is removed the
    // same production entry point completes.
    db.close();
    const re = open(file);
    expect(re.db.pragma("quick_check")[0].quick_check).toBe("ok");
    re.p.dbRun("DROP TABLE sermon_search");
    re.p.migrate();
    expect(version(re.p)).toBeGreaterThanOrEqual(33);
    expect(re.p.queryOne("SELECT COUNT(*) AS c FROM sermon_search", []).c).toBe(1);
    re.db.close();
  });
});

describe("recovery matrix — production dbRecovery + legacy resolver against real files", () => {
  function recoveryDeps() {
    const logs: unknown[][] = [];
    return {
      logs,
      recovery: createDbRecovery({
        BetterSqlite3,
        logger: { info: (...a: unknown[]) => logs.push(a), error: (...a: unknown[]) => logs.push(a) },
        supportEmail: "support@test",
        sleep: async () => {}, // zero-delay retries in tests
      }),
    };
  }

  // Build a healthy library file with n real sermons (closed on return).
  function makeLibrary(file: string, n: number, idPrefix = "s") {
    const { db, p } = open(file);
    p.bootstrapSchema();
    p.migrate();
    for (let i = 0; i < n; i++) {
      p.validateAndCommit("create-sermon", { name: `${idPrefix}-${i}` });
    }
    db.pragma("wal_checkpoint(TRUNCATE)");
    db.close();
  }
  // A library whose ONLY rows are sample-prefixed (excluded from content count).
  function makeSampleOnlyLibrary(file: string, n: number) {
    const { db, p } = open(file);
    p.bootstrapSchema();
    p.migrate();
    for (let i = 0; i < n; i++) {
      p.dbRun("INSERT INTO sermons (id, title) VALUES (?, ?)", [`sample-${i}`, `Sample ${i}`]);
    }
    db.pragma("wal_checkpoint(TRUNCATE)");
    db.close();
  }

  it("corrupt primary restores from the valid backup; the damaged file and its stale sidecars are quarantined together, never replayed (proofs 8, 9)", async () => {
    const dbPath = path.join(tmpDir, "sermonforge.db");
    const bakPath = dbPath + ".bak";
    makeLibrary(bakPath, 2, "kept");                    // valid backup
    fs.writeFileSync(dbPath, "THIS IS NOT A SQLITE FILE — torn write garbage");
    fs.writeFileSync(dbPath + "-wal", "stale wal frames from the damaged generation");

    const { recovery } = recoveryDeps();
    const res = await recovery.openPrimaryWithRecovery({ dbPath, bakPath, firstLaunch: false });
    if (res.db) track(res.db);
    expect(res.initError).toBeNull();
    expect(res.recoveredFromBak).toBe(true);
    expect(res.db.pragma("quick_check")[0].quick_check).toBe("ok");
    const count = res.db.prepare("SELECT COUNT(*) AS c FROM sermons").get().c;
    expect(count).toBe(2); // the backup's library, intact

    // Proof 9 — the stale WAL can never replay onto the restored copy. Two
    // mechanisms satisfy it and BOTH are legitimate: quarantineCorrupt renames
    // the sidecar alongside the damaged main file, and/or SQLite's own probe of
    // the invalid database truncates the unusable WAL before that. The
    // invariant is the same either way: no stale-generation frames remain at
    // the live path.
    const entries = fs.readdirSync(tmpDir);
    expect(entries.some((f) => /sermonforge\.db\.corrupt-/.test(f) && !f.endsWith("-wal") && !f.endsWith("-shm"))).toBe(true);
    const liveWalPath = dbPath + "-wal";
    const liveWal = fs.existsSync(liveWalPath) ? fs.readFileSync(liveWalPath).toString("latin1") : "";
    expect(liveWal.includes("stale wal frames")).toBe(false); // damaged generation gone from the live path
    expect(fs.existsSync(bakPath)).toBe(true); // .bak preserved as the second copy

    // The warning speaks the RULED recovery point (since the last app start),
    // not the old "one or two edits" over-promise.
    expect(res.warnings).toHaveLength(1);
    expect(res.warnings[0].kind).toBe("db_recovered_backup");
    expect(res.warnings[0].message).toMatch(/last time the app started|since the last time SermonForge started/i);
    expect(res.warnings[0].message).not.toMatch(/one or two edits/i);
    res.db.close();
  });

  it("missing primary + orphaned stale sidecars: sidecars are cleared BEFORE the .bak restore so no cross-generation replay (proof 9)", async () => {
    const dbPath = path.join(tmpDir, "sermonforge.db");
    const bakPath = dbPath + ".bak";
    makeLibrary(bakPath, 1, "kept");
    fs.writeFileSync(dbPath + "-wal", "orphaned wal from the vanished primary");
    fs.writeFileSync(dbPath + "-shm", "orphaned shm");

    const { recovery } = recoveryDeps();
    const res = await recovery.openPrimaryWithRecovery({ dbPath, bakPath, firstLaunch: false });
    if (res.db) track(res.db);
    expect(res.initError).toBeNull();
    expect(res.recoveredFromBak).toBe(true);
    expect(res.db.pragma("quick_check")[0].quick_check).toBe("ok");
    expect(res.db.prepare("SELECT COUNT(*) AS c FROM sermons").get().c).toBe(1);
    expect(res.warnings[0].message).not.toMatch(/one or two edits/i);
    res.db.close();
  });

  it("legacy candidate selection: MOST CONTENT ROWS wins; mtime breaks ties only; sample-only libraries never win (proofs 4, 5)", async () => {
    const active = path.join(tmpDir, "active", "sermonforge.db");
    fs.mkdirSync(path.dirname(active), { recursive: true });
    const candA = path.join(tmpDir, "legacy-a.db"); // 3 real sermons, OLD mtime
    const candB = path.join(tmpDir, "legacy-b.db"); // 1 real sermon, NEWEST mtime
    const candC = path.join(tmpDir, "legacy-c.db"); // 5 sample-only rows, newest mtime
    makeLibrary(candA, 3, "a");
    makeLibrary(candB, 1, "b");
    makeSampleOnlyLibrary(candC, 5);
    const old = new Date("2026-01-01");
    const now = new Date();
    fs.utimesSync(candA, old, old);
    fs.utimesSync(candB, now, now);
    fs.utimesSync(candC, now, now);

    const { recovery } = recoveryDeps();
    const result = await migrateLegacyDb({
      activePath: active,
      candidatePaths: [candB, candC, candA],
      tryLoad: (p2: string) => recovery.loadWithRetry(p2),
      countRows: recovery.countContentRows,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result.deferred).toBe(false);
    expect(result.source).toBe(candA); // 3 rows beat newer-but-thinner B and sample-stuffed C

    const adopted = open(active);
    expect(adopted.p.queryOne("SELECT COUNT(*) AS c FROM sermons WHERE id NOT LIKE 'sample-%'", []).c).toBe(3);
    adopted.db.close();
    expect(fs.existsSync(candA)).toBe(true); // copy, never move — legacy file preserved

    // Tie-break case: equal rows → newer mtime wins (the ONLY place recency matters).
    const active2 = path.join(tmpDir, "active2", "sermonforge.db");
    fs.mkdirSync(path.dirname(active2), { recursive: true });
    const tieOld = path.join(tmpDir, "tie-old.db");
    const tieNew = path.join(tmpDir, "tie-new.db");
    makeLibrary(tieOld, 2, "to");
    makeLibrary(tieNew, 2, "tn");
    fs.utimesSync(tieOld, old, old);
    fs.utimesSync(tieNew, now, now);
    const tie = await migrateLegacyDb({
      activePath: active2,
      candidatePaths: [tieOld, tieNew],
      tryLoad: (p2: string) => recovery.loadWithRetry(p2),
      countRows: recovery.countContentRows,
      logger: { info: () => {}, error: () => {} },
    });
    expect(tie.source).toBe(tieNew);
  });
});
