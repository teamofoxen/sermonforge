// electron/dbMigration.js — path-aware DB resolver.
//
// Walks `legacyDbPaths` (from electron/config.js), finds the most recent
// candidate with real content that loads cleanly, copies it into the active
// path, and returns the loaded SQL.Database + the legacy source path. The
// legacy file is preserved (copied, not moved) as a backup.
//
// CORE.md "The userData path is permanent" binds this layer. Removing or
// reordering entries in `legacyDbPaths` orphans user data on every machine
// that still has a DB at the removed location.

"use strict";

// Minimum file size (bytes) below which a legacy DB is treated as empty/seed
// and not worth migrating. SQLite's empty-DB header is ~24KB; SermonForge's
// fresh-init schema lands around 53KB. 32KB is comfortably below "real
// content" and well above "just headers".
const LEGACY_DB_MIN_BYTES = 32 * 1024;

/**
 * Find and migrate the most recent recoverable legacy DB into `activePath`.
 *
 * Dependencies are injected so callers can swap them in tests without mocking
 * the global fs module. In production, callers wire `fs` and the project's
 * logger and the closure-bound `tryLoad` from initDatabase.
 *
 * Returns `{ db, source }` on a successful migration, `null` when nothing
 * recoverable was found.
 *
 * @param {object}   options
 * @param {string}   options.activePath       — current `paths.userData/sermonforge.db`
 * @param {string[]} options.candidatePaths   — `legacyDbPaths` from config
 * @param {(p:string) => any} options.tryLoad — loads a DB from disk and throws on corruption
 * @param {object}   [options.fsImpl]         — { existsSync, statSync, copyFileSync }
 * @param {object}   [options.logger]         — { info, error }
 */
function migrateLegacyDb({ activePath, candidatePaths, tryLoad, fsImpl = require("fs"), logger = console }) {
  const candidates = (candidatePaths || [])
    .filter((p) => p && p !== activePath)
    .map((p) => {
      // Single statSync — ENOENT (file not there) is silent; any other fs
      // error is logged so we don't lose signal on permission / IO problems.
      try {
        return { path: p, stat: fsImpl.statSync(p) };
      } catch (err) {
        if (err && err.code !== "ENOENT") {
          logger.error?.(`[DB] could not stat legacy candidate ${p}`, err);
        }
        return null;
      }
    })
    .filter((c) => c && c.stat && c.stat.size >= LEGACY_DB_MIN_BYTES)
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  for (const c of candidates) {
    try {
      const candidate = tryLoad(c.path);
      fsImpl.copyFileSync(c.path, activePath);
      logger.info?.(`[DB] migrated user data from legacy path ${c.path} (${c.stat.size} bytes, mtime ${new Date(c.stat.mtimeMs).toISOString()}) → ${activePath}; legacy file preserved as backup`);
      return { db: candidate, source: c.path };
    } catch (err) {
      logger.error?.(`[DB] legacy DB at ${c.path} unreadable; trying next candidate`, err);
    }
  }
  return null;
}

module.exports = { migrateLegacyDb, LEGACY_DB_MIN_BYTES };
