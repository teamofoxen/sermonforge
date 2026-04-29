// electron/embedder/worker.js — runs the @xenova/transformers feature-extraction
// pipeline in a worker_thread so embedding work does not block the Electron
// main process (renderer IPC, DB flushes, file dialogs all run on main).
//
// Lazy: the pipeline loads on the first `embed-texts` message rather than at
// worker spawn, so the spawn cost itself is fast and a worker that is
// pre-warmed but never asked to embed only pays the require() cost.
//
// Protocol (JSON-cloned over postMessage):
//   host → worker: { requestId, kind: "embed-texts", texts: string[] }
//   worker → host: { requestId, vectors: number[][] }
//                 | { requestId, error: { message, stack? } }

const { parentPort, workerData } = require("worker_threads");

const MODELS_DIR = workerData?.modelsDir;
const EMBED_DIM = workerData?.embedDim ?? 384;

let pipelinePromise = null;

function loadPipeline() {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    const { pipeline, env } = await import("@xenova/transformers");
    if (MODELS_DIR) env.cacheDir = MODELS_DIR;
    env.allowRemoteModels = false;
    return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { quantized: true });
  })();
  return pipelinePromise;
}

async function embedTexts(texts) {
  const embedder = await loadPipeline();
  const vectors = new Array(texts.length).fill(null);
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (typeof text !== "string" || text.length === 0) continue;
    try {
      // Single-text invocation matches the historical main-thread path; batching
      // multi-text inputs through the pipeline is a separate optimization that
      // depends on the Xenova return shape and is intentionally deferred.
      const output = await embedder([text], { pooling: "mean", normalize: true });
      const arr = Array.from(output[0].data);
      if (arr.length === EMBED_DIM) vectors[i] = arr;
    } catch (_) {
      // leave null — caller treats missing vectors as FTS-only fallback
    }
  }
  return vectors;
}

parentPort.on("message", async (msg) => {
  if (!msg || typeof msg !== "object") return;
  const { requestId, kind, texts } = msg;
  try {
    if (kind === "embed-texts") {
      const vectors = await embedTexts(Array.isArray(texts) ? texts : []);
      parentPort.postMessage({ requestId, vectors });
      return;
    }
    parentPort.postMessage({ requestId, error: { message: `unknown kind: ${kind}` } });
  } catch (e) {
    parentPort.postMessage({
      requestId,
      error: { message: e?.message || String(e), stack: e?.stack },
    });
  }
});
