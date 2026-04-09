// electron/ai.js — Anthropic client and AI IPC handler
//
// .env is loaded by main.js before this module is required,
// so process.env.ANTHROPIC_API_KEY is available at module load time.

const { default: Anthropic } = require("@anthropic-ai/sdk");

let anthropicClient = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} else {
  console.error("[AI] ANTHROPIC_API_KEY is not set — AI features will be unavailable.");
}

function registerAIHandlers(ipcMain) {
  ipcMain.handle("ai-message", async (event, { messages, systemPrompt }) => {
    if (!anthropicClient) {
      console.error("[AI] Request received but ANTHROPIC_API_KEY is not set.");
      return "AI is unavailable — API key not configured.";
    }

    let response;
    try {
      response = await anthropicClient.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt || "You are a helpful assistant for sermon preparation.",
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
    return text;
  });
}

module.exports = { registerAIHandlers };
