# SermonForge — AI Model Migration Playbook

How to bump the Claude model used by SermonForge.

---

## Where the model is set

One place: `DEFAULT_MODEL` in `electron/ai/provider.js`.

```js
const DEFAULT_MODEL = "claude-sonnet-4-6";
```

All AI calls resolve `model ?? DEFAULT_MODEL`, so changing this constant changes the model for every call in the app. No other files reference the model ID.

---

## Steps to bump the model

1. **Verify the new model ID** at [console.anthropic.com](https://console.anthropic.com) or the [Anthropic model docs](https://docs.anthropic.com/en/docs/about-claude/models). Confirm the model is Generally Available and not in limited beta.

2. **Check prompt-caching compatibility.** The static system prompt block is marked `cache_control: { type: "ephemeral" }` in `src/prompts/sermon.js`. Verify the new model supports prompt caching — not all models do. If it does not, remove the `cache_control` marker from `buildSystemPrompt` (or it will be silently ignored, which is safe but wasteful to leave in).

3. **Update `DEFAULT_MODEL`** in `electron/ai/provider.js`:
   ```js
   const DEFAULT_MODEL = "claude-sonnet-4-7";  // example
   ```

4. **Check `DEFAULT_MAX_TOKENS`.** New models often raise or lower their output token ceiling. The current value is `4096`. Verify it is within the new model's `max_tokens` limit. Increase if the new model supports a larger window and longer responses are desirable.

5. **Smoke-test** with at least one full sermon pass: open a sermon with Pastoral Context filled, run one study Review chip, send a free-form AI Panel message, and run the Tune-Up Engine on a manuscript. Confirm responses are coherent and no format errors surface.

6. **Update this document** — replace the model ID in the "Current model" table below and note the date.

---

## Current model

| Field | Value |
|---|---|
| Model ID | `claude-sonnet-4-6` |
| Set since | 2026-05-01 |
| Prompt caching | Yes — static system-prompt block cached via `cache_control: { type: "ephemeral" }` |
| Max tokens | 4096 (`DEFAULT_MAX_TOKENS` in `provider.js`) |

---

## What does NOT need to change

- IPC channel names — the `"ai-message"` channel is model-agnostic.
- System prompt content — prompts are model-agnostic; they do not reference the model ID.
- Audit log format — `model` is written from `result.model` (the resolved model ID returned by the SDK), so the log automatically reflects the new model.
- Tests — no test asserts on the model ID.

---

## Retired models

| Model ID | Retired | Replaced by |
|---|---|---|
| `claude-sonnet-4-5` | 2026-05-01 | `claude-sonnet-4-6` |
