// Tests `electron/dbMigration.js` against CORE.md "The userData path is
// permanent." The resolver must find the most recent recoverable legacy DB
// when the active path is empty, and surface nothing when no legacy is
// recoverable.

import { describe, it, expect, vi } from "vitest";

// CommonJS require lives behind createRequire so the .js implementation
// (no TS types) loads cleanly in the test runner.
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
        if (!(p in entries)) throw new Error(`ENOENT: ${p}`);
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
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toBeNull();
    expect(tryLoad).not.toHaveBeenCalled();
    expect(copies).toEqual([]);
  });

  it("filters out candidates below the empty-DB threshold", () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_OLD]: { size: LEGACY_DB_MIN_BYTES - 1, mtimeMs: 5_000 },
    });
    const tryLoad = vi.fn();
    const result = migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD],
      tryLoad,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toBeNull();
    expect(tryLoad).not.toHaveBeenCalled();
    expect(copies).toEqual([]);
  });

  it("picks the most recently-modified candidate when several have content", () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_OLD]:   { size: 100_000, mtimeMs: 1_000 },  // oldest
      [LEGACY_FIXED]: { size: 200_000, mtimeMs: 5_000 },  // bigger but older than dev
      [LEGACY_DEV]:   { size: 120_000, mtimeMs: 9_000 },  // most recent → expected winner
    });
    const fakeDb = { __id: "loaded-db" };
    const tryLoad = vi.fn().mockReturnValue(fakeDb);
    const result = migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD, LEGACY_FIXED, LEGACY_DEV],
      tryLoad,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ db: fakeDb, source: LEGACY_DEV });
    expect(tryLoad).toHaveBeenCalledTimes(1);
    expect(tryLoad).toHaveBeenCalledWith(LEGACY_DEV);
    expect(copies).toEqual([{ from: LEGACY_DEV, to: ACTIVE }]);
  });

  it("falls through to the next candidate when the most recent is corrupt", () => {
    const { fs, copies } = makeFakeFs({
      [LEGACY_FIXED]: { size: 200_000, mtimeMs: 5_000 },
      [LEGACY_DEV]:   { size: 120_000, mtimeMs: 9_000 },  // newer but corrupt
    });
    const fakeDb = { __id: "fixed-db" };
    const tryLoad = vi.fn()
      .mockImplementationOnce((p: string) => {
        if (p === LEGACY_DEV) throw new Error("corrupt");
        return null;
      })
      .mockImplementationOnce(() => fakeDb);
    const result = migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_FIXED, LEGACY_DEV],
      tryLoad,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    expect(result).toEqual({ db: fakeDb, source: LEGACY_FIXED });
    expect(tryLoad).toHaveBeenCalledTimes(2);
    expect(copies).toEqual([{ from: LEGACY_FIXED, to: ACTIVE }]);
  });

  it("never copies the active path onto itself when it appears in the candidate list", () => {
    // The candidate list intentionally contains the active path (e.g. when
    // active is `…/data/sermonforge.db` and `legacyDbPaths` also includes
    // `…/data/sermonforge.db` for the prod-after-split installs). The
    // resolver must filter it out before scanning.
    const { fs, copies } = makeFakeFs({
      [ACTIVE]: { size: 100_000, mtimeMs: 9_000 },
    });
    const tryLoad = vi.fn();
    const result = migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [ACTIVE, LEGACY_OLD],
      tryLoad,
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
    const tryLoad = vi.fn().mockReturnValue({});
    migrateLegacyDb({
      activePath: ACTIVE,
      candidatePaths: [LEGACY_OLD],
      tryLoad,
      fsImpl: fs,
      logger: { info: () => {}, error: () => {} },
    });
    // copyFileSync was used — not renameSync — and source still exists.
    expect(copies).toEqual([{ from: LEGACY_OLD, to: ACTIVE }]);
    expect(fs.existsSync(LEGACY_OLD)).toBe(true);
  });
});
