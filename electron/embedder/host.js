// electron/embedder/host.js — main-process facade for the embedding pipeline.
//
// Two paths, selected at module load by config.embedWorker.enabled:
//
//   1. Worker path (default).
//      Spawns electron/embedder/worker.js on first request, keeps it warm,
//      terminates after IDLE_TIMEOUT_MS to release ~85 MB of model memory.
//      Survives a worker crash by rejecting all in-flight requests with a
//      tagged error and clearing the handle so the next call respawns.
//
//   2. Main-thread fallback.
//      The pre-Phase-6 code, preserved verbatim and gated by SF_EMBED_WORKER=0.
//      Lets us ship the worker dark and flip it off without a hotfix if
//      onnxruntime-node behaves differently in worker_threads on a user's box.
//
// Public API:
//   embedTexts(texts: string[]) → Promise<(number[]|null)[]>   — null per-slot for failures
//   embedText(text: string)     → Promise<number[]|null>
//   preWarm()                   → Promise<void>                — fire-and-forget; loads the model

const path = require("path");
const { Worker } = require("worker_threads");
const { paths, embedWorker } = require("../config");
const { logError, logInfo } = require("../logger");

const EMBED_DIM = 384;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 60 * 1000;

let worker = null;
let pendingSpawn = null;
const pending = new Map();           // requestId → { resolve, reject, timer }
let idleTimer = null;
let nextRequestId = 1;

function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function armIdleTimer() {
  clearIdleTimer();
  idleTimer = setTimeout(() => {
    if (pending.size > 0) {
      armIdleTimer();
      return;
    }
    if (worker) {
      logInfo("[embedder] idle TTL reached, terminating worker");
      const w = worker;
      worker = null;
      w.terminate().catch(() => {});
    }
  }, IDLE_TIMEOUT_MS);
}

function rejectAllPending(err) {
  for (const [, entry] of pending) {
    clearTimeout(entry.timer);
    entry.reject(err);
  }
  pending.clear();
}

function ensureWorker() {
  if (worker) return Promise.resolve(worker);
  if (pendingSpawn) return pendingSpawn;

  pendingSpawn = new Promise((resolve, reject) => {
    let w;
    try {
      w = new Worker(path.join(__dirname, "worker.js"), {
        workerData: { modelsDir: paths.models, embedDim: EMBED_DIM },
      });
    } catch (e) {
      pendingSpawn = null;
      logError("[embedder] failed to spawn worker", e);
      reject(e);
      return;
    }

    w.on("message", (msg) => {
      if (!msg || typeof msg !== "object") return;
      const entry = pending.get(msg.requestId);
      if (!entry) return;
      pending.delete(msg.requestId);
      clearTimeout(entry.timer);
      if (msg.error) {
        const err = new Error(msg.error.message || "embedder worker error");
        if (msg.error.stack) err.stack = msg.error.stack;
        entry.reject(err);
      } else {
        entry.resolve(msg.vectors);
      }
    });

    w.on("error", (err) => {
      logError("[embedder] worker error event", err);
      rejectAllPending(err);
    });

    w.on("exit", (code) => {
      const wasWorker = worker;
      worker = null;
      pendingSpawn = null;
      const err = new Error(`embedder worker exited (code=${code})`);
      if (code !== 0 && wasWorker) {
        logError("[embedder] worker exited unexpectedly", err);
      }
      rejectAllPending(err);
    });

    worker = w;
    pendingSpawn = null;
    resolve(w);
  });

  return pendingSpawn;
}

async function embedTextsViaWorker(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  // Clear the idle timer BEFORE awaiting ensureWorker(). The idle callback is a
  // macrotask; the await yields and gives that callback a chance to fire and
  // terminate the worker we are about to post to. Clearing first removes the
  // race window. The timer is re-armed after postMessage below.
  clearIdleTimer();
  let w = await ensureWorker();
  // Defense in depth: if anything else still terminated the worker during the
  // yield (a crash, a manual terminate from elsewhere), the reference we hold
  // is stale. Re-spawn before posting.
  if (w !== worker) w = await ensureWorker();
  const requestId = nextRequestId++;
  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error(`embedder worker timeout after ${REQUEST_TIMEOUT_MS}ms`));
    }, REQUEST_TIMEOUT_MS);
    pending.set(requestId, { resolve, reject, timer });
  });
  w.postMessage({ requestId, kind: "embed-texts", texts });
  armIdleTimer();
  return result;
}

// ── Main-thread fallback ────────────────────────────────────────────────────
// Preserves the pre-Phase-6 behavior verbatim. Activated by SF_EMBED_WORKER=0.

let mainThreadEmbedder = null;

async function ensureMainThreadEmbedder() {
  if (mainThreadEmbedder) return true;
  try {
    const { pipeline, env } = await import("@xenova/transformers");
    env.cacheDir = paths.models;
    env.allowRemoteModels = false;
    mainThreadEmbedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      quantized: true,
    });
    return true;
  } catch (e) {
    logError("[embedder] main-thread pipeline load failed", e);
    return false;
  }
}

async function embedTextsViaMainThread(texts) {
  const ok = await ensureMainThreadEmbedder();
  if (!ok) return texts.map(() => null);
  const out = new Array(texts.length).fill(null);
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (typeof text !== "string" || text.length === 0) continue;
    try {
      const output = await mainThreadEmbedder([text], { pooling: "mean", normalize: true });
      const arr = Array.from(output[0].data);
      if (arr.length === EMBED_DIM) out[i] = arr;
    } catch (_) {
      // leave null
    }
  }
  return out;
}

// ── Public API ──────────────────────────────────────────────────────────────

async function embedTexts(texts) {
  if (embedWorker.enabled) return embedTextsViaWorker(texts);
  return embedTextsViaMainThread(texts);
}

async function embedText(text) {
  const [v] = await embedTexts([text]);
  return v ?? null;
}

// Fire-and-forget warm-up. Called once after initDatabase so the first
// real query doesn't pay the 1–3 s cold-load latency.
function preWarm() {
  embedTexts(["warmup"]).catch((e) => {
    logError("[embedder] preWarm failed (non-fatal)", e);
  });
}

module.exports = { embedText, embedTexts, preWarm, EMBED_DIM };
