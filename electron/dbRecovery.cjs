// dbRecovery.cjs — boot-time primary-DB recovery (Session-4 seam extraction).
//
// The Phase-1 recovery logic moved VERBATIM out of electron/main.js's
// initDatabase so the actual production corruption-fallback / backup-restore /
// sidecar-hygiene code is directly executable against real SQLite files
// (tests/persistence/migration-recovery.test.ts). main.js remains the
// orchestration owner: it calls openPrimaryWithRecovery, then runs the
// legacy resolver (electron/dbMigration.js), boot backup, bootstrap, and the
// migration ladder in the same order as before.
//
// createDbRecovery({ BetterSqlite3, fsImpl, pathImpl, logger, supportEmail,
// sleep }) — explicit dependencies: tests inject the Node-ABI better-sqlite3
// twin and a zero-delay sleep; production injects the real driver, fs, the
// electron/logger.js pair, and SUPPORT_EMAIL.
//
// RECOVERY-POINT OBJECTIVE (ruled in Session 4, 2026-07-13): the `.bak`
// backup is written ONCE PER LAUNCH (boot-time copy, before migrations).
// A `.bak` restore therefore recovers the library as it stood WHEN THE APP
// LAST STARTED — everything done during the damaged session may be missing.
// The pastor-facing recovery warnings below say exactly that; the previous
// "one or two edits may be missing" wording promised a recovery point this
// architecture has never had. Cadence deliberately unchanged (no
// per-keystroke backups); see docs/SYSTEMS/database.md "Backup + recovery".

"use strict";

function createDbRecovery({
  BetterSqlite3,
  fsImpl = require("fs"),
  pathImpl = require("path"),
  logger = console,
  supportEmail = "support",
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  const logInfo = (...args) => logger?.info?.(...args);
  const logError = (...args) => logger?.error?.(...args);

  // Classify an open/probe failure. Lock / permission / IO errors are TRANSIENT —
  // the file is healthy, something else is holding it (antivirus scan, OneDrive
  // sync, backup tool). These must NEVER be treated as corruption: quarantining
  // or starting fresh on a transient lock is exactly how a healthy library gets
  // destroyed. A quick_check failure, by contrast, is real corruption.
  function classifyReadError(err) {
    const transient = new Set([
      // fs-level lock/IO codes
      "EBUSY", "EPERM", "EACCES", "EMFILE", "ENFILE", "EIO", "EAGAIN", "ETXTBSY",
      // SQLite-level lock codes (better-sqlite3 sets err.code to the constant name)
      "SQLITE_BUSY", "SQLITE_LOCKED", "SQLITE_PROTOCOL",
    ]);
    return transient.has(err?.code) ? "transient" : "corrupt";
  }

  function tryLoad(p) {
    let candidate;
    try {
      candidate = new BetterSqlite3(p, { fileMustExist: true });
    } catch (openErr) {
      openErr._sfClass = classifyReadError(openErr);
      throw openErr; // tagged so the caller can tell a lock from corruption
    }
    // PRAGMA quick_check forces a structural scan: it catches page-level damage
    // that a plain open accepts and that a shallow `sqlite_master` read would
    // pass — exactly the torn-write / sync-conflict shape. Cheap on
    // pastor-sized DBs (well under ~500 sermons).
    let verdict;
    try {
      const rows = candidate.pragma("quick_check");
      verdict = rows?.[0]?.quick_check;
    } catch (probeErr) {
      try { candidate.close(); } catch { /* ignore */ }
      probeErr._sfClass = classifyReadError(probeErr);
      throw probeErr;
    }
    if (verdict !== "ok") {
      try { candidate.close(); } catch { /* ignore */ }
      const e = new Error(`quick_check failed: ${verdict}`);
      e._sfClass = "corrupt";
      throw e;
    }
    return candidate;
  }

  // Pragmas for the ACTIVE connection only. tryLoad stays pure (read-probe) so
  // legacy candidates are never converted; the active DB gets WAL journaling
  // (crash safety: a hard kill mid-write replays cleanly on next open) and
  // NORMAL synchronous (the safe WAL pairing).
  function applyConnectionPragmas(conn) {
    conn.pragma("journal_mode = WAL");
    conn.pragma("synchronous = NORMAL");
  }

  // Retry a load only for transient (lock) errors — give a scanner / sync agent
  // a moment to release the file. Corruption is never retried (it won't change).
  async function loadWithRetry(p, attempts = 3, delayMs = 300) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        return tryLoad(p);
      } catch (e) {
        lastErr = e;
        if (e._sfClass !== "transient" || i === attempts - 1) throw e;
        await sleep(delayMs);
      }
    }
    throw lastErr;
  }

  // Remove stale WAL/SHM sidecars at path `p`. Called where the main DB at `p`
  // is about to be replaced by a checkpointed restore (a .bak copy). A leftover
  // sidecar belongs to the previous (damaged/gone) generation; opening the
  // restored file in WAL mode with a stale sidecar present lets SQLite replay
  // mismatched-generation frames onto it — silent corruption of the very copy
  // recovery just restored.
  function clearStaleSidecars(p) {
    for (const suffix of ["-wal", "-shm"]) {
      try {
        if (fsImpl.existsSync(p + suffix)) fsImpl.unlinkSync(p + suffix);
      } catch (e) {
        logError(`[DB] failed to remove stale sidecar ${p + suffix}`, e);
      }
    }
  }

  function quarantineCorrupt(p) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const q = `${p}.corrupt-${stamp}`;
    try {
      fsImpl.renameSync(p, q);
      logError(`[DB] quarantined unreadable DB to ${q}`);
      // Move the WAL/SHM sidecars alongside the quarantined main file. They
      // belong to the damaged generation: leaving them at the active path would
      // let SQLite replay a stale WAL onto the freshly restored .bak
      // (mixed-generation corruption). Moving — not just deleting — keeps them
      // paired with their DB for manual recovery. If a sidecar can't be moved
      // (locked), delete it: a leftover replayable sidecar is worse than a lost one.
      for (const suffix of ["-wal", "-shm"]) {
        if (!fsImpl.existsSync(p + suffix)) continue;
        try {
          fsImpl.renameSync(p + suffix, q + suffix);
        } catch {
          try { fsImpl.unlinkSync(p + suffix); } catch { /* ignore */ }
        }
      }
      return q;
    } catch (e) {
      logError(`[DB] failed to quarantine unreadable DB at ${p}`, e);
      return null;
    }
  }

  // Counts content rows (sermons + series). Drives the legacy-migration
  // trigger: a row-less DB at the active path means the user's real library
  // is sitting at a prior install location. Fail-soft when tables don't
  // exist (older schemas, unrecognized SQLite files) — treats those as 0.
  function countContentRows(handle) {
    if (!handle) return 0;
    let total = 0;
    const countOf = (sql) => {
      try {
        return Number(handle.prepare(sql).pluck().get() ?? 0);
      } catch { return 0; } // table missing — treat as 0
    };
    // Sample-sermon rows (id LIKE 'sample-%') are NOT real content: every
    // user-facing query excludes them, so the user sees an empty library.
    // Counting them here would (a) suppress legacy recovery after a single
    // "Open a sample sermon" click and (b) let a sample-only legacy DB outrank a
    // real one-sermon DB in the resolver's row-count ranking.
    total += countOf("SELECT COUNT(*) FROM sermons WHERE id NOT LIKE 'sample-%'");
    total += countOf("SELECT COUNT(*) FROM series WHERE id NOT LIKE 'sample-%'");
    // Calendar planning is real user content too — a pastor who planned a
    // preaching calendar before drafting any sermon must not read as "empty"
    // (which would let a legacy DB overwrite their plan, or strand it as a
    // skipped candidate).
    total += countOf("SELECT COUNT(*) FROM calendar_notes");
    return total;
  }

  const LOCK_MESSAGE =
    "SermonForge couldn't open your library because another program is using the " +
    "file — usually antivirus, a backup tool, or OneDrive syncing. Close those or " +
    "wait a moment, then reopen SermonForge. Your sermons are safe and untouched.";

  // The honest recovery-point sentence (see the RPO ruling in the header):
  // the .bak is a boot-time copy, so a restore recovers the library as of the
  // LAST APP START — not "one or two edits" ago.
  const RESTORE_SCOPE_SENTENCE =
    "Anything you added or changed since the last time SermonForge started may be missing.";

  // ── Phase 1 — establish a working `db` handle ─────────────────────────────
  // Moved verbatim from initDatabase: decides whether we have a primary, fall
  // back to `.bak`, quarantine a corrupt file, or start fresh. No migration
  // logic here — the caller runs the legacy resolver and the ladder against
  // whatever emerges. Returns { db, recoveredFromBak,
  // startedFreshAfterCorruption, initError, warnings }; on initError the
  // caller aborts boot with every file untouched.
  async function openPrimaryWithRecovery({ dbPath, bakPath, firstLaunch = false }) {
    const warnings = [];
    let db = null;
    let recoveredFromBak = false;
    // True when recovery failed and we started a fresh EMPTY db at the active
    // path. Gates the caller's boot-time .bak backup: overwriting the existing
    // .bak (the damaged library's last surviving backup) with an empty DB would
    // destroy the final recovery artifact.
    let startedFreshAfterCorruption = false;

    if (fsImpl.existsSync(dbPath)) {
      try {
        db = await loadWithRetry(dbPath);
      } catch (primaryErr) {
        if (primaryErr._sfClass === "transient") {
          // Healthy-but-locked. Do NOT quarantine or start fresh — that destroys a
          // good library. Abort the boot; whenReady shows the message and quits,
          // leaving every file untouched so a relaunch (once the lock clears) works.
          logError(`[DB] primary DB temporarily unreadable (locked) at ${dbPath}; aborting boot to protect data`, primaryErr);
          return { db: null, recoveredFromBak, startedFreshAfterCorruption, warnings, initError: { kind: "db_locked", message: LOCK_MESSAGE } };
        }
        // Genuine corruption. Quarantine the primary FIRST — the connection is
        // file-backed, so a .bak restore is a file copy INTO dbPath and the
        // damaged original must be out of the way before the copy lands.
        logError(`[DB] primary DB corrupt at ${dbPath}; quarantining and trying .bak`, primaryErr);
        const q = quarantineCorrupt(dbPath);
        if (!q && fsImpl.existsSync(dbPath)) {
          // Rename refused (typically a lock). Don't copy over the original —
          // abort and protect every file, same as the transient path.
          logError(`[DB] could not quarantine corrupt primary (likely locked); aborting boot to protect data`);
          return { db: null, recoveredFromBak, startedFreshAfterCorruption, warnings, initError: { kind: "db_locked", message: LOCK_MESSAGE } };
        }
        if (fsImpl.existsSync(bakPath)) {
          try {
            fsImpl.copyFileSync(bakPath, dbPath); // .bak itself stays in place as the second copy
            db = await loadWithRetry(dbPath);
            recoveredFromBak = true;
            logInfo(`[DB] restored backup from ${bakPath} after primary corruption`);
          } catch (bakErr) {
            if (bakErr._sfClass === "transient") {
              logError(`[DB] .bak temporarily unreadable (locked); aborting boot to protect data`, bakErr);
              return { db: null, recoveredFromBak, startedFreshAfterCorruption, warnings, initError: { kind: "db_locked", message: LOCK_MESSAGE } };
            }
            logError(`[DB] .bak also corrupt; starting fresh`, bakErr);
            // Remove the bad restore copy (the original .bak is preserved on disk).
            try { fsImpl.unlinkSync(dbPath); } catch { /* ignore */ }
            db = null;
          }
        }
        if (recoveredFromBak) {
          warnings.push({
            kind: "db_recovered_backup",
            message: `SermonForge restored your library from its automatic backup after the main file was damaged. The backup is from the last time the app started, so anything you added or changed after that may be missing. The damaged file was kept aside for recovery — email ${supportEmail} if you need it.`,
          });
        } else if (!db) {
          // Both primary and .bak are corrupt. The primary is quarantined (kept
          // on disk for manual recovery); start fresh at the active path.
          db = new BetterSqlite3(dbPath);
          startedFreshAfterCorruption = true;
          warnings.push({
            kind: "db_corrupt_quarantined",
            message:
              "SermonForge couldn't read your library or its backup, so it started a fresh one. Your original file was NOT deleted — it was kept aside" +
              (q ? ` as ${pathImpl.basename(q)}` : "") +
              ` in your data folder. Please email ${supportEmail} before doing more work so we can try to recover it.`,
            path: q,
          });
        }
      }
    } else if (fsImpl.existsSync(bakPath)) {
      // Primary missing but backup present (a crash between steps, or the
      // primary deleted by AV / disk cleanup). Restore by copy, then open.
      // Clear any orphaned -wal/-shm first: the primary is gone but its sidecars
      // may remain, and a stale WAL replayed onto the restored .bak would corrupt it.
      clearStaleSidecars(dbPath);
      try {
        fsImpl.copyFileSync(bakPath, dbPath);
        db = await loadWithRetry(dbPath);
        recoveredFromBak = true;
        logInfo(`[DB] restored backup; primary missing`);
        warnings.push({
          kind: "db_recovered_backup",
          message: `SermonForge restored your library from its automatic backup after the main file went missing. ${RESTORE_SCOPE_SENTENCE}`,
        });
      } catch (e) {
        if (e._sfClass === "transient" || classifyReadError(e) === "transient") {
          logError(`[DB] .bak temporarily unreadable (locked); aborting boot to protect data`, e);
          return { db: null, recoveredFromBak: false, startedFreshAfterCorruption, warnings, initError: { kind: "db_locked", message: LOCK_MESSAGE } };
        }
        logError(`[DB] backup unreadable, starting fresh`, e);
        try { fsImpl.unlinkSync(dbPath); } catch { /* ignore */ }
        db = new BetterSqlite3(dbPath);
        startedFreshAfterCorruption = true;
        warnings.push({
          kind: "db_corrupt_quarantined",
          message: `SermonForge couldn't read your library backup, so it started a fresh one. If you had sermons before, email ${supportEmail} before doing more work so we can try to recover them.`,
        });
      }
    } else {
      db = new BetterSqlite3(dbPath); // genuine fresh install — creates the file
      // (firstLaunch is the caller's flag for the same condition; accepted here
      // for signature clarity but the branch is driven by the filesystem.)
      void firstLaunch;
    }
    applyConnectionPragmas(db);

    return { db, recoveredFromBak, startedFreshAfterCorruption, warnings, initError: null };
  }

  return {
    classifyReadError,
    tryLoad,
    applyConnectionPragmas,
    loadWithRetry,
    clearStaleSidecars,
    quarantineCorrupt,
    countContentRows,
    openPrimaryWithRecovery,
    LOCK_MESSAGE,
    RESTORE_SCOPE_SENTENCE,
  };
}

module.exports = { createDbRecovery };
