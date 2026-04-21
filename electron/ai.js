// electron/ai.js — Anthropic client and AI IPC handler
//
// .env is loaded by main.js before this module is required,
// so process.env.ANTHROPIC_API_KEY is available at module load time.

const { default: Anthropic } = require("@anthropic-ai/sdk");
const { app } = require("electron");
const fs = require("fs");
const path = require("path");

let anthropicClient = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} else {
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
    if (!anthropicClient) {
      console.error("[AI] Request received but ANTHROPIC_API_KEY is not set.");
      return "AI is unavailable — API key not configured.";
    }

    const system = systemPrompt || "You are a helpful assistant for sermon preparation.";
    const model = "claude-sonnet-4-6";
    const started = Date.now();

    let response;
    try {
      response = await anthropicClient.messages.create({
        model,
        max_tokens: 4096,
        temperature: 0.2,
        system,
        messages: messages,
      });
    } catch (e) {
      console.error("[ai-message]", e);
      throw e;
    }

    const text = response.content?.[0]?.text;
    if (text == null) {
      console.error("[ai-message] Unexpected response shape:", JSON.stringify(response.content));
      return "AI returned an unexpected response format.";
    }

    appendAuditLog({
      ts: new Date().toISOString(),
      step: step ?? null,
      sermonId: sermonId ?? null,
      system,
      messages,
      response: text,
      model,
      latency: Date.now() - started,
    });

    return text;
  });
}

module.exports = { registerAIHandlers };
