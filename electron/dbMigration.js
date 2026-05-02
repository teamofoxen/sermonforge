// electron/dbMigration.js — path-aware DB resolver.
//
// Walks `legacyDbPaths` (from electron/config.js), evaluates every candidate
// by loading it and counting content rows (sermons + series), picks the
// candidate with the most rows (mtime breaks ties), copies it into the
// active path, and returns the loaded SQL.Database + the legacy source path.
// 0-row candidates (schema-only DBs from prior empty initialization) are
// skipped — they have nothing useful to restore. The legacy file is preserved
// (copy, not move) as a backup.
//
// Why row-count, not mtime: a stale dev/test DB ("touch one sermon to verify
// the build runs") will out-mtime a real long-form library every time. The
// 2026-05-02 incident — 1-sermon dev DB at Apr 30 winning over 10-sermon
// real DB at Apr 15 — is the regression test for this rule.
//
// CORE.md "The userData path is permanent" binds this layer. Removing or
// reordering entries in `legacyDbPaths` orphans user data on every machine
// that still has a DB at the removed location.

"use strict";

// Minimum file size (bytes) below which a legacy DB is treated as empty/seed
// and not worth opening. SQLite's empty-DB header is ~24KB; SermonForge's
// fresh-init schema lands around 53KB. 32KB is comfortably below "real
// content" and well above "just headers" — used as a cheap pre-filter so
// `tryLoad` only runs against plausibly-real files.
const LEGACY_DB_MIN_BYTES = 32 * 1024;

/**
 * Find and migrate the most-content-rich recoverable legacy DB into
 * `activePath`. Returns `{ db, source }` on success, `null` when nothing
 * recoverable was found.
 *
 * Dependencies are injected so callers can swap them in tests without mocking
 * global modules. In production, callers wire `fs`, the project logger, the
 * closure-bound `tryLoad` from `initDatabase`, and a `countRows(db)` that
 * returns the sermons+series row count.
 *
 * @param {object}   options
 * @param {string}   options.activePath       — current `paths.userData/sermonforge.db`
 * @param {string[]} options.candidatePaths   — `legacyDbPaths` from config
 * @param {(p:string) => any} options.tryLoad — loads a DB from disk, throws on corruption
 * @param {(db:any) => number} options.countRows — returns content-row count (sermons+series)
 * @param {object}   [options.fsImpl]         — { existsSync, statSync, copyFileSync }
 * @param {object}   [options.logger]         — { info, error }
 */
function migrateLegacyDb({ activePath, candidatePaths, tryLoad, countRows, fsImpl = require("fs"), logger = console }) {
  if (typeof countRows !== "function") {
    throw new Error("migrateLegacyDb requires a countRows(db) callback");
  }

  // Phase 1 — stat every candidate, drop the obviously-empty (size-based) and
  // anything not on disk. ENOENT is silent; other fs errors are logged so we
  // don't lose signal on permission / IO problems.
  const stated = (candidatePaths || [])
    .filter((p) => p && p !== activePath)
    .map((p) => {
      try {
        return { path: p, stat: fsImpl.statSync(p) };
      } catch (err) {
        if (err && err.code !== "ENOENT") {
          logger.error?.(`[DB] could not stat legacy candidate ${p}`, err);
        }
        return null;
      }
    })
    .filter((c) => c && c.stat && c.stat.size >= LEGACY_DB_MIN_BYTES);

  // Phase 2 — load each survivor, count content rows, drop 0-row schema-only
  // DBs and anything that fails to load. We close non-winning DBs at the end
  // to avoid holding multiple open SQLite buffers in memory.
  const evaluated = [];
  for (const c of stated) {
    let candidateDb = null;
    try {
      candidateDb = tryLoad(c.path);
      const rows = Number(countRows(candidateDb)) || 0;
      if (rows === 0) {
        closeQuietly(candidateDb);
        continue;
      }
      evaluated.push({ ...c, db: candidateDb, rows });
    } catch (err) {
      logger.error?.(`[DB] legacy DB at ${c.path} unreadable; skipping`, err);
      closeQuietly(candidateDb);
    }
  }

  if (evaluated.length === 0) return null;

  // Phase 3 — pick the winner. Most rows wins; mtime breaks ties (more recent
  // among equal-content-volume candidates).
  evaluated.sort((a, b) => b.rows - a.rows || b.stat.mtimeMs - a.stat.mtimeMs);
  const winner = evaluated[0];

  // Close losers before we copy — keeps memory bounded if the legacy list
  // grows large in the future.
  for (let i = 1; i < evaluated.length; i++) {
    closeQuietly(evaluated[i].db);
  }

  try {
    fsImpl.copyFileSync(winner.path, activePath);
  } catch (copyErr) {
    logger.error?.(`[DB] failed to copy ${winner.path} → ${activePath}`, copyErr);
    closeQuietly(winner.db);
    return null;
  }

  logger.info?.(`[DB] migrated user data from legacy path ${winner.path} (${winner.rows} content rows, ${winner.stat.size} bytes, mtime ${new Date(winner.stat.mtimeMs).toISOString()}) → ${activePath}; legacy file preserved as backup`);
  return { db: winner.db, source: winner.path };
}

function closeQuietly(db) {
  if (db && typeof db.close === "function") {
    try { db.close(); } catch { /* ignore */ }
  }
}

module.exports = { migrateLegacyDb, LEGACY_DB_MIN_BYTES };
