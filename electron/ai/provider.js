// electron/ai/provider.js — Anthropic SDK wrapper.
// This is the ONLY module that should import @anthropic-ai/sdk.

const { app } = require("electron");
const { default: Anthropic } = require("@anthropic-ai/sdk");
const { loadKey } = require("../keystore");

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 60_000;        // hard ceiling per attempt
const RETRY_DELAY_MS = 2000;              // single retry after this delay
const CLIENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 h — picks up out-of-band key rotations

let client = null;
let clientCreatedAt = 0;

function resetClient() {
  client = null;
  clientCreatedAt = 0;
}

function isAvailable() {
  return Boolean(loadKey());
}

function getClient(apiKey) {
  // Expire the cached client periodically so a key change made directly to
  // sf-anthropic.enc (or .env) eventually picks up without a full app restart.
  // app-save-api-key already calls resetClient() for the in-app setup flow;
  // this covers the edge case where the key was rotated outside that flow.
  if (!apiKey) {
    // TTL fired but loadKey() now returns nothing — key deleted between calls.
    // Reset so the next valid-key call starts fresh rather than reusing a
    // cached client built with the old key.
    resetClient();
    return null;
  }
  if (client && Date.now() - clientCreatedAt < CLIENT_TTL_MS) return client;
  client = new Anthropic({ apiKey });
  clientCreatedAt = Date.now();
  return client;
}

// Recognise transient failures worth one retry. Network timeouts, 429 rate
// limits, and 529 overloaded all qualify; auth failures (401/403) and 4xx
// validation errors do not — retrying them is wasted latency.
function isRetryable(err) {
  const code = err?.status;
  if (code === 429 || code === 529) return true;
  if (err?.name === "AbortError") return true;
  if (typeof err?.message === "string" && /timeout|abort/i.test(err.message)) return true;
  return false;
}

// Map a thrown SDK/transport error to one of the A4 failure kinds. Renderer-side
// "aborted" (sermon switch) never originates here — that is set in
// src/utils/ai.js. Internal timeout aborts (REQUEST_TIMEOUT_MS) surface as
// kind="timeout", not "aborted".
function classifyError(err, { internalAbort } = {}) {
  const status = err?.status;
  if (status === 401 || status === 403) {
    return { kind: "auth", message: `Anthropic key was rejected. Open Setup to re-enter it. (SermonForge ${app.getVersion()})` };
  }
  if (status === 429) {
    return { kind: "rate_limit", message: "Anthropic is rate-limiting requests. Wait a moment and try again." };
  }
  if (status === 500 || status === 502 || status === 503 || status === 529) {
    return { kind: "server", message: "Anthropic is temporarily unavailable. Try again shortly." };
  }
  if (internalAbort || err?.name === "AbortError" || (typeof err?.message === "string" && /timeout|abort/i.test(err.message))) {
    return { kind: "timeout", message: "AI request timed out after 60 seconds. Try again." };
  }
  // SDK throws without a status when the underlying fetch fails (DNS,
  // ECONNREFUSED, no route to host). Absent status + no abort = network.
  if (!status) {
    return { kind: "network", message: "Cannot reach Anthropic. Check your internet connection." };
  }
  return { kind: "unknown", message: `AI request failed: ${err?.message || "unknown error"}` };
}

async function callOnce({ apiKey, system, messages, model, temperature, signal }) {
  const c = getClient(apiKey);
  if (!c) {
    const err = new Error("API key unavailable");
    err.status = 401;
    throw err;
  }
  return c.messages.create({
    model,
    max_tokens: DEFAULT_MAX_TOKENS,
    temperature,
    system,
    messages,
  }, { signal });
}

// Returns an envelope. Never throws for transport-classified failures —
// callers (electron/ai.js) treat the envelope uniformly.
//   { ok: true, text, model, raw }
// | { ok: false, kind, message }
async function generate({ system, messages, model, temperature }) {
  const apiKey = loadKey();
  if (!apiKey) {
    return { ok: false, kind: "auth", message: "Anthropic API key is not configured. Open Setup to enter your key." };
  }
  const resolvedModel = model ?? DEFAULT_MODEL;
  const resolvedTemperature = temperature ?? DEFAULT_TEMPERATURE;

  // Retries are safe: every generate() call is a stateless read. The Anthropic
  // API has no mutation side effects for message.create calls, and SermonForge
  // side effects (field writes, audit log entries) only trigger after the
  // response reaches the renderer or electron/ai.js — never inside this loop.
  let lastErr;
  let timedOut = false;
  for (const attempt of [1, 2]) {
    timedOut = false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, REQUEST_TIMEOUT_MS);
    try {
      const response = await callOnce({
        apiKey,
        system,
        messages,
        model: resolvedModel,
        temperature: resolvedTemperature,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      return {
        ok: true,
        text: response.content?.[0]?.text ?? null,
        stop_reason: response.stop_reason ?? null,
        model: resolvedModel,
        usage: response.usage ?? null,
        raw: response,
      };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt === 1 && isRetryable(e)) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      break;
    }
  }

  const cls = classifyError(lastErr ?? new Error("AI request failed without throwing"), { internalAbort: timedOut });
  return { ok: false, ...cls };
}

module.exports = { generate, isAvailable, resetClient, DEFAULT_MODEL, DEFAULT_TEMPERATURE };
