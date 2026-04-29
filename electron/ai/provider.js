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

async function callOnce({ apiKey, system, messages, model, temperature, signal }) {
  const c = getClient(apiKey);
  return c.messages.create({
    model,
    max_tokens: DEFAULT_MAX_TOKENS,
    temperature,
    system,
    messages,
  }, { signal });
}

async function generate({ system, messages, model, temperature }) {
  const apiKey = loadKey();
  if (!apiKey) {
    return { error: true, message: "API key not configured" };
  }
  const resolvedModel = model ?? DEFAULT_MODEL;
  const resolvedTemperature = temperature ?? DEFAULT_TEMPERATURE;

  // Per-attempt AbortSignal. 60 s is well above Anthropic's 95th-percentile
  // non-streaming latency for messages.create. If we ever switch to streaming
  // this number revisits.
  let response;
  let lastErr;
  for (const attempt of [1, 2]) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      response = await callOnce({
        apiKey,
        system,
        messages,
        model: resolvedModel,
        temperature: resolvedTemperature,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      break;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt === 1 && isRetryable(e)) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      // Stamp auth failures with the app version so user-reported errors carry it.
      if (e?.status === 401 || e?.status === 403) {
        const stamped = new Error(`${e.message} (SermonForge ${app.getVersion()})`);
        stamped.status = e.status;
        throw stamped;
      }
      throw e;
    }
  }

  if (!response) throw lastErr ?? new Error("AI request failed without throwing");

  return {
    text: response.content?.[0]?.text ?? null,
    model: resolvedModel,
    raw: response,
  };
}

module.exports = { generate, isAvailable, resetClient, DEFAULT_MODEL, DEFAULT_TEMPERATURE };
