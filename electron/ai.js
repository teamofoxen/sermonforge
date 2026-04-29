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
      // Network / SDK / abort failures. Audit-log the error then rethrow so the
      // renderer's existing IPC-rejection path returns "" and the unified
      // "Something went wrong" fallback bubble fires.
      appendAuditLog({ ...baseEntry(), error: { kind: "api", message: String(e?.message || e) } });
      console.error("[ai-message]", e);
      throw new Error(`AI request failed: ${e?.message || e}`);
    }

    if (result.error) {
      // Configuration error — typically API key not set. Throw rather than
      // returning a string the renderer would render as a normal AI reply.
      appendAuditLog({ ...baseEntry(), error: { kind: "configuration", message: result.message } });
      console.error("[AI] Request failed:", result.message);
      throw new Error(`AI unavailable: ${result.message}`);
    }

    const text = result.text;
    if (text == null) {
      // Anthropic returned a successful HTTP response but the first content
      // block is non-text or missing. Treat as a format error.
      appendAuditLog({ ...baseEntry(), error: { kind: "format", message: "null content block" } });
      console.error("[ai-message] Unexpected response shape:", JSON.stringify(result.raw?.content));
      throw new Error("AI returned an unexpected response format");
    }

    appendAuditLog({
      ...baseEntry(),
      response: text,
      model: result.model,
    });

    return text;
  });
}

module.exports = { registerAIHandlers };
