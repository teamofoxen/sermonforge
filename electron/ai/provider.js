// electron/ai/provider.js — Anthropic SDK wrapper.
// This is the ONLY module that should import @anthropic-ai/sdk.

const { default: Anthropic } = require("@anthropic-ai/sdk");

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 4096;

let client = null;

function isAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function generate({ system, messages, model, temperature }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: true, message: "API key not configured" };
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  const resolvedModel = model ?? DEFAULT_MODEL;
  const resolvedTemperature = temperature ?? DEFAULT_TEMPERATURE;

  const response = await client.messages.create({
    model: resolvedModel,
    max_tokens: DEFAULT_MAX_TOKENS,
    temperature: resolvedTemperature,
    system,
    messages,
  });

  return {
    text: response.content?.[0]?.text ?? null,
    model: resolvedModel,
    raw: response,
  };
}

module.exports = { generate, isAvailable, DEFAULT_MODEL, DEFAULT_TEMPERATURE };
