// electron/ai.js — AI IPC handler.
//
// .env is loaded by main.js before this module is required,
// so process.env.ANTHROPIC_API_KEY is available when provider.js loads.

const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const { generate, isAvailable } = require("./ai/provider");
const { logError } = require("./logger");

if (!isAvailable()) {
  console.error("[AI] ANTHROPIC_API_KEY is not set — AI features will be unavailable.");
}

const AI_LOG_PATH = path.join(app.getPath("userData"), "ai-log.jsonl");
const MAX_AUDIT_BYTES = 5 * 1024 * 1024; // ~500 entries at typical entry size
const KEEP_ENTRIES = 500;

function rotateAuditLog() {
  try {
    const lines = fs.readFileSync(AI_LOG_PATH, "utf8").split("\n").filter(Boolean);
    if (lines.length <= KEEP_ENTRIES) return;
    fs.writeFileSync(AI_LOG_PATH, lines.slice(-KEEP_ENTRIES).join("\n") + "\n");
  } catch (_) {
    // Never throw from audit log
  }
}

function appendAuditLog(entry) {
  fs.promises.appendFile(AI_LOG_PATH, JSON.stringify(entry) + "\n")
    .then(() => {
      try {
        if (fs.statSync(AI_LOG_PATH).size > MAX_AUDIT_BYTES) rotateAuditLog();
      } catch (_) {}
    })
    .catch(e => {
      logError("[ai-message] Failed to append audit log", e);
    });
}

function registerAIHandlers(ipcMain) {
  // The handler always RESOLVES with an envelope. It never rejects on classified
  // failures — rejected IPC promises drop custom error properties, which would
  // strip the kind. Renderer-side wrapper at src/utils/ai.js reads the envelope.
  //   { ok: true, text }
  // | { ok: false, kind: "auth"|"rate_limit"|"network"|"server"|"timeout"|"format"|"empty"|"unknown", message }
  ipcMain.handle("ai-message", async (event, payload) => {
    const { messages, systemPrompt, step, sermonId } = payload || {};

    const system = systemPrompt || "You are a helpful assistant for sermon preparation.";
    const started = Date.now();
    const baseEntry = () => ({
      ts: new Date().toISOString(),
      step: step ?? null,
      sermonId: sermonId ?? null,
      system,
      messages,
      latency: Date.now() - started,
    });

    let result;
    try {
      result = await generate({ system, messages });
    } catch (e) {
      // Unexpected throw from generate — generate() now returns an envelope for
      // every classified failure, so this only fires for truly unexpected errors.
      const message = String(e?.message || e);
      const failure = { kind: "unknown", message: `AI request failed: ${message}` };
      appendAuditLog({ ...baseEntry(), error: failure });
      console.error("[ai-message]", e);
      return { ok: false, ...failure };
    }

    if (!result.ok) {
      appendAuditLog({ ...baseEntry(), error: { kind: result.kind, message: result.message } });
      console.error("[AI] Request failed:", result.kind, result.message);
      return { ok: false, kind: result.kind, message: result.message };
    }

    const text = result.text;
    if (text == null) {
      // Anthropic returned a successful HTTP response but the first content
      // block is non-text or missing.
      const failure = { kind: "format", message: "AI returned an unexpected response format." };
      appendAuditLog({ ...baseEntry(), error: failure });
      console.error("[ai-message] Unexpected response shape:", JSON.stringify(result.raw?.content));
      return { ok: false, ...failure };
    }
    if (text.trim() === "") {
      const failure = { kind: "empty", message: "AI returned an empty response." };
      appendAuditLog({ ...baseEntry(), error: failure });
      console.error("[ai-message] Empty response text");
      return { ok: false, ...failure };
    }

    appendAuditLog({
      ...baseEntry(),
      response: text,
      model: result.model,
    });

    return { ok: true, text };
  });
}

module.exports = { registerAIHandlers };
