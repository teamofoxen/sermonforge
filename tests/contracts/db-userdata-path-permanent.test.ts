// Tests `electron/dbMigration.js` against CORE.md "The userData path is
// permanent." The resolver must:
//
//   - Find the most-content-rich recoverable legacy DB when the active path
//     is empty (or row-empty — see `initDatabase` Phase 2).
//   - Pick by row count first, mtime as tiebreaker. The 2026-05-02 incident
//     (1-sermon dev DB beating a 10-sermon real DB on mtime) is the
//     regression for this rule.
//   - Skip 0-row schema-only DBs entirely.
//   - Surface nothing when no legacy is recoverable.

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

const ACTIVE = "/userData/data/sermonforge.db";
const LEGACY_OLD = "/userData/sermonforge.db";
const LEGACY_FIXED = "C:/SermonForge/data/sermonforge.db";
const LEGACY_DEV = "/userData/data-dev/sermonforge.db";

describe("migrateLegacyDb — userData path permanence (CORE.md)", () => {
  it("returns null when no legacy candidates exist", () => {
    const { fs, copies } = makeFakeFs({});
    const tryLoad = vi.fn();
    const result = migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD, LEGACY_FIXED, LEGACY_DEV],
      tryLoad,
      countRows: () => 0,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toBeNull();
    expect(tryLoad).not.toHaveBeenCalled();
    expect(copies).toEqual([]);
  });

  it("filters out candidates below the size pre-filter", () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_OLD]: { size: LEGACY_DB_MIN_BYTES - 1, mtimeMs: 5_000 },
    });
    const tryLoad = vi.fn();
    const result = migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD],
      tryLoad,
      countRows: () => 99, // would-be plenty if the size pre-filter let it through
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toBeNull();
    expect(tryLoad).not.toHaveBeenCalled();
    expect(copies).toEqual([]);
  });

  it("skips 0-row candidates entirely (schema-only DBs)", () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_OLD]: { size: 100_000, mtimeMs: 5_000 },
    });
    const fakeDb = makeFakeDb(0);
    const tryLoad = vi.fn().mockReturnValue(fakeDb);
    const result = migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toBeNull();
    expect(copies).toEqual([]);
    // The 0-row candidate was loaded for inspection then closed.
    expect(fakeDb.closed).toBe(true);
  });

  it("regression: row count beats mtime — picks 10-row candidate over 1-row newer one (2026-05-02 incident)", () => {
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
    const result = migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_FIXED, LEGACY_DEV],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ db: fixedDb, source: LEGACY_FIXED });
    expect(copies).toEqual([{ from: LEGACY_FIXED, to: ACTIVE }]);
    // Loser db was closed.
    expect(devDb.closed).toBe(true);
    // Winner db is returned open.
    expect(fixedDb.closed).toBe(false);
  });

  it("breaks ties by mtime when two candidates have the same row count", () => {
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
    const result = migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD, LEGACY_FIXED],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ db: fixedDb, source: LEGACY_FIXED });
    expect(copies).toEqual([{ from: LEGACY_FIXED, to: ACTIVE }]);
  });

  it("skips candidates that fail to load and tries the next", () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_FIXED]: { size: 200_000, mtimeMs: 5_000 },
      [LEGACY_DEV]:   { size: 120_000, mtimeMs: 9_000 },  // newer but corrupt
    });
    const fixedDb = makeFakeDb(7);
    const tryLoad = vi.fn().mockImplementation((p: string) => {
      if (p === LEGACY_DEV) throw new Error("corrupt");
      if (p === LEGACY_FIXED) return fixedDb;
      throw new Error("unexpected");
    });
    const result = migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_FIXED, LEGACY_DEV],
      tryLoad,
      countRows: (db: FakeDb) => db.rows,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ db: fixedDb, source: LEGACY_FIXED });
    expect(copies).toEqual([{ from: LEGACY_FIXED, to: ACTIVE }]);
  });

  it("never copies the active path onto itself when it appears in the candidate list", () => {
    const { fs, copies } = makeFakeFs({
      [ACTIVE]: { size: 100_000, mtimeMs: 9_000 },
    });
    const tryLoad = vi.fn();
    const result = migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [ACTIVE, LEGACY_OLD],
      tryLoad,
      countRows: () => 5,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toBeNull();
    expect(tryLoad).not.toHaveBeenCalled();
    expect(copies).toEqual([]);
  });

  it("preserves the legacy source file (copy, not move)", () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_OLD]: { size: 100_000, mtimeMs: 5_000 },
    });
    const tryLoad = vi.fn().mockReturnValue(makeFakeDb(3));
    migrateLegacyDb({
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

  it("requires a countRows callback", () => {
    const { fs } = makeFakeFs({});
    expect(() => migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [],
      tryLoad: () => null,
      // countRows omitted on purpose
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    })).toThrow(/countRows/);
  });
});
