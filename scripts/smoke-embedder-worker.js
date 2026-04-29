// Phase 6 smoke test — verifies @xenova/transformers loads and runs inside a
// worker_thread so the kill-switch decision rests on real evidence rather than
// "it should work". Run with: node scripts/smoke-embedder-worker.js
//
// This exercises the worker in isolation (no Electron). Electron's worker_threads
// share the same native-ABI runtime as plain Node here, so a pass here is a strong
// signal the Electron path will work too.

const path = require("path");
const { Worker } = require("worker_threads");

const MODELS_DIR = path.join(__dirname, "..", "resources", "models");

console.log(`[smoke] spawning worker with modelsDir=${MODELS_DIR}`);
const w = new Worker(path.join(__dirname, "..", "electron", "embedder", "worker.js"), {
  workerData: { modelsDir: MODELS_DIR, embedDim: 384 },
});

const t0 = Date.now();
const TIMEOUT_MS = 60_000;
const timer = setTimeout(() => {
  console.error(`[smoke] FAIL — timeout after ${TIMEOUT_MS}ms`);
  w.terminate().finally(() => process.exit(2));
}, TIMEOUT_MS);

w.on("message", (msg) => {
  clearTimeout(timer);
  const ms = Date.now() - t0;
  if (msg.error) {
    console.error(`[smoke] FAIL — worker reported error after ${ms}ms:`, msg.error.message);
    if (msg.error.stack) console.error(msg.error.stack);
    w.terminate().finally(() => process.exit(1));
    return;
  }
  const v = msg.vectors?.[0];
  if (!v || v.length !== 384) {
    console.error(`[smoke] FAIL — bad vector shape:`, v?.length);
    w.terminate().finally(() => process.exit(1));
    return;
  }
  console.log(`[smoke] PASS — got 384-dim vector in ${ms}ms (norm sample=${v.slice(0, 4).map(x => x.toFixed(3)).join(", ")})`);
  w.terminate().finally(() => process.exit(0));
});

w.on("error", (e) => {
  clearTimeout(timer);
  console.error("[smoke] FAIL — worker error event:", e);
  process.exit(1);
});

w.on("exit", (code) => {
  if (code !== 0) console.error(`[smoke] worker exited with code=${code}`);
});

w.postMessage({ requestId: 1, kind: "embed-texts", texts: ["The kingdom of God is at hand."] });
