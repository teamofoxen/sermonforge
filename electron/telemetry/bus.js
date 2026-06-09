// electron/telemetry/bus.js — telemetry event bus + local NDJSON buffer.
//
// Pattern mirrors electron/logger.js: append-only file, fire-and-forget,
// never throws. Emits land locally first; periodic flush ships batches to
// the BTI Worker (transport/worker.js).
//
// File layout under paths.telemetry:
//   <session-id>.ndjson             — active batched-event queue (this session)
//   <session-id>.ndjson.pending     — rotated batched queue, in flight to the Worker
//   <session-id>.immediate.ndjson   — flag/form items that failed their immediate
//                                     POST and are waiting for a periodic retry
//
// Tester ID is persisted under paths.userData/tester-id.txt (opaque UUID,
// assigned at first run, survives reinstall only if userData survives).
//
// Disabled state: when setEnabled(false) is called from the Q9 toggle,
// emit() drops events on the floor and flush() short-circuits. Toggling
// back on resumes capture from that point forward; no replay of dropped
// events.

const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { paths } = require("../config");
const { logError } = require("../logger");
const {
  WORKER_URL,
  FLUSH_INTERVAL_MS,
  FLUSH_TIMEOUT_MS,
  MAX_BATCH_SIZE,
} = require("./config");

let _sessionId = null;
let _ndjsonFile = null;
let _immediateFile = null;
let _flushTimer = null;
let _testerId = null;
let _initialized = false;
let _enabled = true; // Chunk 6 wires this to the user-prefs toggle

function init() {
  if (_initialized) return;

  try {
    if (!fs.existsSync(paths.telemetry)) {
      fs.mkdirSync(paths.telemetry, { recursive: true });
    }
    _sessionId = randomUUID();
    _ndjsonFile = path.join(paths.telemetry, `${_sessionId}.ndjson`);
    _immediateFile = path.join(paths.telemetry, `${_sessionId}.immediate.ndjson`);
    _testerId = loadOrAssignTesterId();
    _flushTimer = setInterval(() => {
      flush().catch(() => {});
      drainImmediateQueue().catch(() => {});
    }, FLUSH_INTERVAL_MS);
    _initialized = true;
  } catch (err) {
    logError("[telemetry] init failed", err);
  }
}

function emit(eventType, payload = {}) {
  if (!_initialized || !_enabled || !_ndjsonFile) return;
  if (!eventType || typeof eventType !== "string") return;

  const event = {
    eventType,
    payload: payload && typeof payload === "object" ? payload : {},
    timestamp: new Date().toISOString(),
  };

  try {
    fs.appendFileSync(_ndjsonFile, JSON.stringify(event) + "\n");
  } catch (_) {
    // Never throw from telemetry
  }
}

function setEnabled(enabled) {
  _enabled = !!enabled;
}

function getTesterId() {
  return _testerId;
}

async function flush() {
  if (!_initialized || !_enabled) return;
  if (!WORKER_URL) return; // local-only mode

  const pendingFile = _ndjsonFile + ".pending";

  // Resume any in-flight pending from a previous failed attempt.
  if (fs.existsSync(pendingFile)) {
    await ship(pendingFile);
    return;
  }

  if (!fs.existsSync(_ndjsonFile)) return;
  let stat;
  try {
    stat = fs.statSync(_ndjsonFile);
  } catch (_) {
    return;
  }
  if (stat.size === 0) return;

  try {
    fs.renameSync(_ndjsonFile, pendingFile);
  } catch (err) {
    logError("[telemetry] rename failed", err);
    return;
  }

  await ship(pendingFile);
}

async function ship(file) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch (_) {
    return;
  }

  const lines = content.split("\n").filter(Boolean);
  if (lines.length === 0) {
    try {
      fs.unlinkSync(file);
    } catch (_) {}
    return;
  }

  let items;
  try {
    items = lines.map((l) => JSON.parse(l));
  } catch (err) {
    // Malformed queue — drop rather than retry forever.
    logError("[telemetry] malformed queue, dropping", err);
    try {
      fs.unlinkSync(file);
    } catch (_) {}
    return;
  }

  const batch = items.slice(0, MAX_BATCH_SIZE);
  const remainder = items.slice(MAX_BATCH_SIZE);

  let ok = false;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FLUSH_TIMEOUT_MS);
    const res = await fetch(`${WORKER_URL}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "events", testerId: _testerId, items: batch }),
      signal: controller.signal,
    });
    clearTimeout(t);
    ok = res.ok;
  } catch (_) {
    ok = false;
  }

  if (ok) {
    if (remainder.length > 0) {
      try {
        fs.writeFileSync(
          file,
          remainder.map((e) => JSON.stringify(e)).join("\n") + "\n"
        );
      } catch (_) {}
    } else {
      try {
        fs.unlinkSync(file);
      } catch (_) {}
    }
  }
  // On failure: leave pending file as-is for next flush attempt.
}

async function flushAndExit() {
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
  await flush().catch(() => {});
  await drainImmediateQueue().catch(() => {});
}

// sendImmediate — single-item POST for flag/form payloads. Tries the network
// first; on failure, appends to <session-id>.immediate.ndjson where the
// periodic flush loop retries it on the next tick. Never throws.
//
// `kind` is "flag" | "form". `payload` is the per-kind shape from the BTI
// build proposal (lines 138-149 for flag, 174-181 for form). The function
// adds testerId at send time, so callers don't need to know the tester ID.
async function sendImmediate(kind, payload) {
  if (!_initialized || !_enabled) return { ok: false, reason: "disabled" };
  if (!kind || typeof kind !== "string") return { ok: false, reason: "bad-kind" };
  const item = { kind, payload: payload && typeof payload === "object" ? payload : {} };

  if (!WORKER_URL) {
    // local-only mode — persist for later (in case transport is configured later)
    queueImmediate(item);
    return { ok: false, reason: "no-transport" };
  }

  const ok = await postOne(item);
  if (!ok) queueImmediate(item);
  return { ok };
}

async function postOne({ kind, payload }) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FLUSH_TIMEOUT_MS);
    const res = await fetch(`${WORKER_URL}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, testerId: _testerId, ...payload }),
      signal: controller.signal,
    });
    clearTimeout(t);
    return res.ok;
  } catch (_) {
    return false;
  }
}

function queueImmediate(item) {
  if (!_immediateFile) return;
  try {
    fs.appendFileSync(_immediateFile, JSON.stringify(item) + "\n");
  } catch (err) {
    logError("[telemetry] immediate queue write failed", err);
  }
}

async function drainImmediateQueue() {
  if (!_initialized || !_enabled) return;
  if (!WORKER_URL) return;
  if (!_immediateFile || !fs.existsSync(_immediateFile)) return;

  let content;
  try {
    content = fs.readFileSync(_immediateFile, "utf8");
  } catch (_) {
    return;
  }
  const lines = content.split("\n").filter(Boolean);
  if (lines.length === 0) {
    try { fs.unlinkSync(_immediateFile); } catch (_) {}
    return;
  }

  const remaining = [];
  for (const line of lines) {
    let item;
    try { item = JSON.parse(line); } catch (_) { continue; }
    const ok = await postOne(item);
    if (!ok) remaining.push(item);
  }

  try {
    if (remaining.length === 0) {
      fs.unlinkSync(_immediateFile);
    } else {
      fs.writeFileSync(_immediateFile, remaining.map((i) => JSON.stringify(i)).join("\n") + "\n");
    }
  } catch (_) {}
}

function loadOrAssignTesterId() {
  const file = path.join(paths.userData, "tester-id.txt");
  try {
    if (fs.existsSync(file)) {
      const id = fs.readFileSync(file, "utf8").trim();
      if (id) return id;
    }
  } catch (_) {}

  const id = randomUUID();
  try {
    fs.writeFileSync(file, id);
  } catch (_) {}
  return id;
}

module.exports = { init, emit, setEnabled, getTesterId, flush, flushAndExit, sendImmediate };
