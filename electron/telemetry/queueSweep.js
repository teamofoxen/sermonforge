// electron/telemetry/queueSweep.js — recover feedback and telemetry that a
// previous session left undelivered.
//
// Queue files are named per session (<session-id>.immediate.ndjson) and the
// bus's ordinary drain only ever touches the CURRENT session's file. Nothing
// scanned the directory, so anything queued when the app exited — including
// notes the UI had already reported as "Sent." — was stranded on disk
// forever while the dead files accumulated (2026-07-20 audit, M8).
//
// Deliberately free of electron and of the bus's module state: it takes its
// directory, its consent check, and its transport as arguments. That is what
// lets the recovery path be tested at all — the rest of the bus cannot load
// outside Electron, which is why this behaviour went unverified for so long.

"use strict";

const fs = require("fs");
const path = require("path");

// Strict: only this bus's own immediate-queue files. Never anything else
// that happens to be sitting in the telemetry directory.
const QUEUE_FILE_RE = /^[0-9a-f-]{36}\.immediate\.ndjson$/i;

// Bounded retry. A queue nobody could deliver in a month is not going to
// start delivering now, and it must not be retried on every launch forever.
const ORPHAN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const ORPHAN_MAX_FILES = 20;

// dir          — telemetry directory to sweep
// currentFile  — this session's queue, which the ordinary drain owns
// isEnabled    — consent check, called before EVERY send
// post         — async (item) => boolean
// onMalformed  — optional (file, count) => void, for logging
// now          — injectable clock
async function sweepOrphanedQueues({ dir, currentFile, isEnabled, post, onMalformed, now = Date.now }) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return { drained: 0, discarded: 0, quarantined: 0 };
  }

  const orphans = entries
    .filter((n) => QUEUE_FILE_RE.test(n))
    .map((n) => path.join(dir, n))
    .filter((p) => path.resolve(p) !== path.resolve(currentFile ?? ""))
    .slice(0, ORPHAN_MAX_FILES);

  let drained = 0;
  let discarded = 0;
  let quarantined = 0;

  for (const file of orphans) {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      continue;
    }

    if (now() - stat.mtimeMs > ORPHAN_MAX_AGE_MS) {
      try { fs.unlinkSync(file); discarded += 1; } catch { /* next run */ }
      continue;
    }

    let lines;
    try {
      lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    } catch {
      continue;
    }

    const remaining = [];
    const malformed = [];
    for (const line of lines) {
      let item;
      try {
        item = JSON.parse(line);
      } catch {
        malformed.push(line);
        continue;
      }
      if (!item || typeof item.kind !== "string") {
        malformed.push(line);
        continue;
      }
      // Consent is re-checked per item, not inherited from when the note was
      // queued: a pastor who has since opted out must not have his backlog
      // sent behind him, and a revoke mid-sweep stops the rest.
      if (!isEnabled()) {
        remaining.push(item);
        continue;
      }
      const ok = await post(item);
      if (ok) drained += 1;
      else remaining.push(item);
    }

    try {
      if (malformed.length > 0) {
        // Quarantined beside the queue, never silently dropped — an
        // unreadable record is evidence of a bug worth keeping.
        fs.appendFileSync(`${file}.malformed`, malformed.join("\n") + "\n");
        quarantined += malformed.length;
        onMalformed?.(file, malformed.length);
      }
      if (remaining.length === 0) fs.unlinkSync(file);
      else fs.writeFileSync(file, remaining.map((i) => JSON.stringify(i)).join("\n") + "\n");
    } catch { /* next run */ }
  }

  return { drained, discarded, quarantined };
}

module.exports = { sweepOrphanedQueues, QUEUE_FILE_RE, ORPHAN_MAX_AGE_MS, ORPHAN_MAX_FILES };
