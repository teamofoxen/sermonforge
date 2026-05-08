// electron/telemetry/bus.js — telemetry event bus + local NDJSON buffer.
//
// Pattern mirrors electron/logger.js: append-only file, fire-and-forget,
// never throws. Emits land locally first; periodic flush ships batches to
// the BTI Worker (transport/worker.js).
//
// File layout under paths.telemetry:
//   <session-id>.ndjson           — active queue (this session)
//   <session-id>.ndjson.pending   — rotated queue, in flight to the Worker
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
  INGEST_TOKEN,
  FLUSH_INTERVAL_MS,
  FLUSH_TIMEOUT_MS,
  MAX_BATCH_SIZE,
} = require("./config");

let _sessionId = null;
let _ndjsonFile = null;
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
    _testerId = loadOrAssignTesterId();
    _flushTimer = setInterval(() => {
      flush().catch(() => {});
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
  if (!INGEST_TOKEN || !WORKER_URL) return; // local-only mode

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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INGEST_TOKEN}`,
      },
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

module.exports = { init, emit, setEnabled, getTesterId, flush, flushAndExit };
