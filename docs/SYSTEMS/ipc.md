# SermonForge — IPC System

> For the full channel-by-channel specification, see `docs/REFERENCE/ipc-channels.md`.

---

## Architecture

All communication between the renderer process and the main process goes through IPC.
This is the security boundary that keeps the API key out of the renderer.

```
Renderer (React)
  → src/db/database.js         (wrapper functions)
  → src/utils/ai.js            (sendAIMessage)
      ↓ window.electronAPI.*   (contextBridge methods, defined in electron/preload.js)
Main Process
  → electron/main.js           (all IPC handlers, DB operations)
  → electron/ai.js             (Anthropic SDK client, ai-message handler)
```

**`electron/preload.js`** exposes the `contextBridge` API to the renderer under `window.electronAPI`.
Components must never call `window.electronAPI` directly — they must use the wrapper functions in
`src/db/database.js` or `src/utils/ai.js`.

---

## Boundary Rules

- The `ANTHROPIC_API_KEY` is loaded in `electron/main.js` and used only in `electron/ai.js`.
  It is never forwarded to the renderer via IPC response or any other path.
- No raw SQL is accepted from the renderer. IPC handlers in `electron/main.js` perform all DB
  operations; the renderer only passes parameters (IDs, field values).
- `buildUpdate()` validates all `db-updateSermon` field names against the `SERMON_COLUMNS`
  allowlist before executing SQL.

---

## Channel Naming Conventions

| Prefix | Purpose |
|--------|---------|
| `"ai-message"` | Single channel for all AI calls |
| `"db-*"` | Database operations (e.g. `db-getSermonById`, `db-updateSermon`) |
| `"library-*"` | Sermon library operations |
| `"theology-*"` | Theology DB operations |
| `"passage-fetch"` | Scripture text fetching |
| `"feedback-submit"` | Feedback file writing |
| `"series-export-study-guide"` | Study guide Word export |
| `"app-get-version"` | App version lookup |

All handlers are implemented in `electron/main.js` except `"ai-message"` which is in `electron/ai.js`.

---

## AI Call Path

Every AI call follows this exact path — no exceptions:

1. Component calls `sendAIMessage(messages, systemPrompt)` from `src/utils/ai.js`
2. `sendAIMessage` invokes `window.electronAPI.sendAIMessage(...)` (via contextBridge)
3. `electron/main.js` forwards to `electron/ai.js` `"ai-message"` handler
4. `electron/ai.js` calls Anthropic SDK with the API key
5. Response string returned back up the chain to the component

No component may call the Anthropic SDK or any AI API directly. No component may pass API
keys via IPC.
