// electron/ai.js — AI IPC handler.
//
// .env is loaded by main.js before this module is required,
// so process.env.ANTHROPIC_API_KEY is available when provider.js loads.

const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const { generate, isAvailable } = require("./ai/provider");

if (!isAvailable()) {
  console.error("[AI] ANTHROPIC_API_KEY is not set — AI features will be unavailable.");
}

const AI_LOG_PATH = path.join(app.getPath("userData"), "ai-log.jsonl");

function appendAuditLog(entry) {
  fs.promises.appendFile(AI_LOG_PATH, JSON.stringify(entry) + "\n").catch(e => {
    console.error("[ai-message] Failed to append audit log:", e);
  });
}

function registerAIHandlers(ipcMain) {
  ipcMain.handle("ai-message", async (event, payload) => {
    const { messages, systemPrompt, step, sermonId } = payload || {};

    const system = systemPrompt || "You are a helpful assistant for sermon preparation.";
    const started = Date.now();

    let result;
    try {
      result = await generate({ system, messages });
    } catch (e) {
      console.error("[ai-message]", e);
      throw e;
    }

    if (result.error) {
      console.error("[AI] Request failed:", result.message);
      return `AI is unavailable — ${result.message}.`;
    }

    const text = result.text;
    if (text == null) {
      console.error("[ai-message] Unexpected response shape:", JSON.stringify(result.raw?.content));
      return "AI returned an unexpected response format.";
    }

    appendAuditLog({
      ts: new Date().toISOString(),
      step: step ?? null,
      sermonId: sermonId ?? null,
      system,
      messages,
      response: text,
      model: result.model,
      latency: Date.now() - started,
    });

    return text;
  });
}

module.exports = { registerAIHandlers };
