// Tests `electron/dbMigration.js` against CORE.md "The userData path is
// permanent." The resolver must:
//
//   - Find the most-content-rich recoverable legacy DB when the active path
//     is empty (or row-empty — see `initDatabase` Phase 2).
//   - Pick by row count first, mtime as tiebreaker. The 2026-05-02 incident
//     (1-sermon dev DB beating a 10-sermon real DB on mtime) is the
//     regression for this rule.
//   - Skip 0-row schema-only DBs entirely.
//   - Surface nothing recoverable as { source: null }.
//   - Distinguish a TRANSIENTLY-locked candidate (antivirus / OneDrive) from a
//     corrupt one: a lock must be deferred, NOT skipped, so the caller withholds
//     its one-shot "checked" marker and the next boot retries. Skipping-then-
//     marking a locked real library orphans it forever (correctness audit,
//     finding 5). The resolver is async because production wires the retrying
//     loader (`loadWithRetry`).

import { describe, it, expect, vi } from "vitest";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { migrateLegacyDb, LEGACY_DB_MIN_BYTES } = require("../../electron/dbMigration.js");

// Build a fake fs that responds to existsSync / statSync / copyFileSync from
// an in-memory map. Each entry is keyed by absolute path.
function makeFakeFs(entries: Record<string, { size: number; mtimeMs: number }>) {
  const copies: Array<{ from: string; to: string }> = [];
  return {
    fs: {
      existsSync: (p: string) => p in entries,
      statSync: (p: string) => {
        if (!(p in entries)) {
          const err = new Error(`ENOENT: ${p}`) as Error & { code?: string };
          err.code = "ENOENT";
          throw err;
        }
        return entries[p];
      },
      copyFileSync: (from: string, to: string) => {
        copies.push({ from, to });
        entries[to] = { ...entries[from] };
      },
    },
    copies,
  };
}

// A minimal fake DB: carries a `rows` count plus a `closed` flag so tests can
// assert non-winning DBs were closed. tryLoad returns instances of this type.
type FakeDb = { rows: number; closed: boolean; close: () => void };
const makeFakeDb = (rows: number): FakeDb => ({
  rows,
  closed: false,
  close() { this.closed = true; },
});

// A tagged transient (lock) error, matching what the real `tryLoad`/`loadWithRetry`
// throw after retries when a file is healthy but held by another process.
function transientError(msg = "SQLITE_BUSY"): Error {
  const e = new Error(msg) as Error & { _sfClass?: string; code?: string };
  e._sfClass = "transient";
  e.code = "SQLITE_BUSY";
  return e;
}

const ACTIVE = "/userData/data/sermonforge.db";
const LEGACY_OLD = "/userData/sermonforge.db";
const LEGACY_FIXED = "C:/SermonForge/data/sermonforge.db";
const LEGACY_DEV = "/userData/data-dev/sermonforge.db";

describe("migrateLegacyDb — userData path permanence (CORE.md)", () => {
  it("returns { source: null } when no legacy candidates exist", async () => {
    const { fs, copies } = makeFakeFs({});
    const tryLoad = vi.fn();
    const result = await migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD, LEGACY_FIXED, LEGACY_DEV],
      tryLoad,
      countRows: () => 0,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ source: null, deferred: false });
    expect(tryLoad).not.toHaveBeenCalled();
    expect(copies).toEqual([]);
  });

  it("filters out candidates below the size pre-filter", async () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_OLD]: { size: LEGACY_DB_MIN_BYTES - 1, mtimeMs: 5_000 },
    });
    const tryLoad = vi.fn();
    const result = await migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD],
      tryLoad,
      countRows: () => 99, // would-be plenty if the size pre-filter let it through
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ source: null, deferred: false });
    expect(tryLoad).not.toHaveBeenCalled();
    expect(copies).toEqual([]);
  });

  it("skips 0-row candidates entirely (schema-only DBs)", async () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_OLD]: { size: 100_000, mtimeMs: 5_000 },
    });
    const fakeDb = makeFakeDb(0);
    const tryLoad = vi.fn().mockReturnValue(fakeDb);
    const result = await migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ source: null, deferred: false });
    expect(copies).toEqual([]);
    // The 0-row candidate was loaded for inspection then closed.
    expect(fakeDb.closed).toBe(true);
  });

  it("regression: row count beats mtime — picks 10-row candidate over 1-row newer one (2026-05-02 incident)", async () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_FIXED]: { size: 147_000, mtimeMs: 5_000 },  // 10 sermons + 2 series, older
      [LEGACY_DEV]:   { size: 122_000, mtimeMs: 9_000 },  // 1 sermon, newer
    });
    const fixedDb = makeFakeDb(12);  // 10 sermons + 2 series
    const devDb = makeFakeDb(1);     // 1 sermon
    const tryLoad = vi.fn().mockImplementation((p: string) => {
      if (p === LEGACY_FIXED) return fixedDb;
      if (p === LEGACY_DEV) return devDb;
      throw new Error(`unexpected path ${p}`);
    });
    const result = await migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_FIXED, LEGACY_DEV],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ source: LEGACY_FIXED, deferred: false });
    expect(copies).toEqual([{ from: LEGACY_FIXED, to: ACTIVE }]);
    // Loser db was closed.
    expect(devDb.closed).toBe(true);
    // Winner db is ALSO closed before the copy (file-backed connections are
    // path-bound — the caller reopens at the active path).
    expect(fixedDb.closed).toBe(true);
  });

  it("breaks ties by mtime when two candidates have the same row count", async () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_OLD]:   { size: 100_000, mtimeMs: 1_000 },
      [LEGACY_FIXED]: { size: 100_000, mtimeMs: 9_000 },
    });
    const oldDb = makeFakeDb(5);
    const fixedDb = makeFakeDb(5); // same row count, newer
    const tryLoad = vi.fn().mockImplementation((p: string) => {
      if (p === LEGACY_OLD) return oldDb;
      if (p === LEGACY_FIXED) return fixedDb;
      throw new Error("unexpected");
    });
    const result = await migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD, LEGACY_FIXED],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ source: LEGACY_FIXED, deferred: false });
    expect(copies).toEqual([{ from: LEGACY_FIXED, to: ACTIVE }]);
  });

  it("skips corrupt (untagged) candidates and tries the next", async () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_FIXED]: { size: 200_000, mtimeMs: 5_000 },
      [LEGACY_DEV]:   { size: 120_000, mtimeMs: 9_000 },  // newer but corrupt
    });
    const fixedDb = makeFakeDb(7);
    const tryLoad = vi.fn().mockImplementation((p: string) => {
      if (p === LEGACY_DEV) throw new Error("corrupt"); // untagged → treated as corrupt
      if (p === LEGACY_FIXED) return fixedDb;
      throw new Error("unexpected");
    });
    const result = await migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_FIXED, LEGACY_DEV],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    // Corrupt candidate is skipped but does NOT defer — nothing recoverable there.
    expect(result).toEqual({ source: LEGACY_FIXED, deferred: false });
    expect(copies).toEqual([{ from: LEGACY_FIXED, to: ACTIVE }]);
  });

  it("never copies the active path onto itself when it appears in the candidate list", async () => {
    const { fs, copies } = makeFakeFs({
      [ACTIVE]: { size: 100_000, mtimeMs: 9_000 },
    });
    const tryLoad = vi.fn();
    const result = await migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [ACTIVE, LEGACY_OLD],
      tryLoad,
      countRows: () => 5,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ source: null, deferred: false });
    expect(tryLoad).not.toHaveBeenCalled();
    expect(copies).toEqual([]);
  });

  it("preserves the legacy source file (copy, not move)", async () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_OLD]: { size: 100_000, mtimeMs: 5_000 },
    });
    const tryLoad = vi.fn().mockReturnValue(makeFakeDb(3));
    await migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(copies).toEqual([{ from: LEGACY_OLD, to: ACTIVE }]);
    expect(fs.existsSync(LEGACY_OLD)).toBe(true);
  });

  it("requires a countRows callback", async () => {
    const { fs } = makeFakeFs({});
    await expect(migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [],
      tryLoad: () => null,
      // countRows omitted on purpose
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    })).rejects.toThrow(/countRows/);
  });

  // ── Transient-lock defer (correctness audit, finding 5) ──────────────────

  it("defers a transiently-locked sole candidate instead of skipping it (marker must not be written)", async () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_FIXED]: { size: 200_000, mtimeMs: 5_000 }, // the user's real library, momentarily locked
    });
    const tryLoad = vi.fn().mockImplementation(() => { throw transientError(); });
    const result = await migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_FIXED],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    // Nothing adopted, but deferred=true → caller withholds the one-shot marker.
    expect(result).toEqual({ source: null, deferred: true });
    expect(copies).toEqual([]);
  });

  it("adopts a readable winner but still defers when another candidate was locked", async () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_FIXED]: { size: 200_000, mtimeMs: 5_000 }, // readable, 7 rows
      [LEGACY_DEV]:   { size: 120_000, mtimeMs: 9_000 }, // locked
    });
    const fixedDb = makeFakeDb(7);
    const tryLoad = vi.fn().mockImplementation((p: string) => {
      if (p === LEGACY_DEV) throw transientError();
      if (p === LEGACY_FIXED) return fixedDb;
      throw new Error("unexpected");
    });
    const result = await migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_FIXED, LEGACY_DEV],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ source: LEGACY_FIXED, deferred: true });
    expect(copies).toEqual([{ from: LEGACY_FIXED, to: ACTIVE }]);
  });

  it("awaits an async loader and adopts on eventual success (retry cleared the lock)", async () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_OLD]: { size: 100_000, mtimeMs: 5_000 },
    });
    // Models loadWithRetry: the transient lock cleared on retry, so the loader
    // ultimately resolves to a healthy handle. migrateLegacyDb must await it.
    const tryLoad = vi.fn().mockResolvedValue(makeFakeDb(4));
    const result = await migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ source: LEGACY_OLD, deferred: false });
    expect(copies).toEqual([{ from: LEGACY_OLD, to: ACTIVE }]);
  });
});
