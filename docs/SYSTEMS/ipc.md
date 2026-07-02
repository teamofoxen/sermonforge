# SermonForge — IPC System

> For the full channel-by-channel specification, see `docs/REFERENCE/ipc-channels.md`.

---

## Architecture

All communication between the renderer process and the main process goes through IPC.
The renderer never touches the filesystem, the SQLite database, or external APIs directly.

```
Renderer (React)
  → src/core/spine.ts          (single sermon/series state surface)
  → src/db/database.js          (wrapper functions for non-spine channels)
      ↓ window.electronAPI.*    (contextBridge methods, defined in electron/preload.js)
Main Process
  → electron/main.js            (all IPC handlers, DB operations, ESV passage fetch)
```

**`electron/preload.js`** exposes the `contextBridge` API to the renderer under
`window.electronAPI`. Components must never call `window.electronAPI` directly —
they must use `src/core/spine.ts` for sermon/series state and `src/db/database.js`
for everything else (settings, calendar notes, theology, exports, etc.).

ARI (2026-05-09) removed the AI subsystem. There is no Anthropic SDK, no AI IPC
channel, no system prompts, and no context pipeline. Four outbound network
destinations exist: ESV passage fetching (`api.esv.org`) is the only one that
carries sermon-derived input; the BTI Cloudflare Worker (telemetry,
consent-gated) and GitHub Releases (the auto-updater's version check)
originate in the main process and carry no sermon content; and the renderer's
CSS loads the app's typefaces from Google Fonts on start (a standard font
request — no app data). See `docs/CORE.md` Non-Negotiable Boundaries and
`docs/REFERENCE/privacy.md`.

---

## Boundary Rules

- No raw SQL is accepted from the renderer. IPC handlers in `electron/main.js`
  perform all DB operations; the renderer only passes parameters (IDs, field values).
- All sermon, series, and section state routes through the single `"spine"`
  channel. `scripts/spine-integrity.js` (a pre-commit gate) blocks bypasses:
  any `db.run` / `db.prepare` / `db.exec` outside `electron/main.js`, raw
  SQL on `sermons`/`series`/`series_sections` outside `electron/main.js`,
  direct `window.electronAPI.spine(...)` calls outside `src/core/spine.ts`,
  and imports of spine-only function names from `src/db/database.js`
  outside `src/core/`.
- `buildUpdate()` validates all sermon-update field names against the
  `SERMON_COLUMNS` allowlist before executing SQL.
- The ESV API key is sent once over IPC in plaintext, in the save direction —
  when the pastor enters it in `SetupScreen`/`EsvKeyModal` and `app-save-api-key`
  verifies it against the ESV API. After that it is stored via Electron
  `safeStorage` (managed by `electron/keystore.js`), is never returned to the
  renderer, and is read in-process when `passage-fetch` is invoked.

---

## Channel Naming Conventions

| Prefix / channel | Purpose |
|------------------|---------|
| `"spine"` | All sermon, series, and section state (read + write, contract-gated) |
| `"db-*"` | Non-spine database operations (settings, calendar notes, schema version, sermon search) |
| `"theology-*"` | Theology DB operations (status, search, get-chunks) |
| `"passage-fetch"` | ESV scripture text fetching |
| `"series-export-study-guide"` / `"sermon-export-manuscript"` | `.docx` export |
| `"telemetry-*"` / `"bti-feedback-submit"` | BTI telemetry + flag/form transport |
| `"app-*"` | App metadata (version, key status, sermon columns, startup warnings, data folder) |

All handlers are implemented in `electron/main.js`.

---

## Spine Call Path

Every sermon/series state operation follows this exact path — no exceptions:

1. Component calls a function in `src/core/spine.ts` (e.g. `spine.getSermon(id)`,
   `spine.createSermon({...})`, `spine.transitionState({...})`).
2. `src/core/spine.ts` invokes `window.electronAPI.spine(op, payload)` (via contextBridge).
3. `electron/main.js` `"spine"` handler dispatches to `spineRead` (read-only) or
   `validateAndCommit` (writes; contract-gated). Contract violations return
   `{ ok: false, code, clause, message }`.
4. Validated writes commit against better-sqlite3 (WAL mode) — a durable, journaled
   SQLite commit the instant the handler returns. There is no `saveDb()` and no
   main-process debounce.

No component may touch the database (better-sqlite3) or any DB function directly.
No component may bypass `src/core/spine.ts` for sermon/series state.
