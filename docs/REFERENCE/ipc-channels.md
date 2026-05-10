# SermonForge — IPC Channel Reference

All channels are handled in `electron/main.js` unless noted otherwise.
See `docs/SYSTEMS/ipc.md` for architecture and boundary rules.

---

## Database Operations

All sermon and series state routes through the `"spine"` channel. Named per-operation `db-get*` channels for sermons/series (`db-getRecentSermons`, `db-getRecentSeries`, `db-loadTourSermon`, `db-removeTourSermon`) no longer exist — they are spine ops now. Settings, calendar notes, memory, and schema queries remain as named channels. No raw SQL is accepted from the renderer.

### `"spine"`
```
receives: op string, payload (op-specific)
returns:  { ok: true, ...data } | { ok: false, code, clause, message }
```
Single channel for all sermon, series, and section state. Operations dispatch to either `spineRead` (read-only) or `validateAndCommit` (writes, contract-gated). See `docs/SYSTEMS/ipc.md` and `src/core/spine.ts` for the full API.

**Read ops** (no contract enforcement, return data directly):

| Op | Payload | Returns |
|---|---|---|
| `get-sermon` | sermonId string | shaped sermon row |
| `get-series` | seriesId string | shaped series row |
| `get-all-sermons` | — | all non-tour sermons, date DESC |
| `get-all-series` | — | all non-tour series |
| `get-recent-sermons` | `{ limit? }` (default 3) | recent non-complete sermons |
| `get-recent-series` | `{ limit? }` (default 3) | recent series |
| `get-in-progress-sermons` | — | in-progress sermons (State #6) |
| `get-sermons-by-series` | seriesId string | sermons in series, date ASC |
| `get-sections-by-series` | seriesId string | sections in series, sort_order ASC |

**Write ops** (all go through `validateAndCommit`; contract violations return `{ ok: false, code, clause, message }`):

| Op | Payload | Notes |
|---|---|---|
| `create-sermon` | `{ name, series_id?, section_id?, is_one_off?, passage?, date?, preacher? }` | State #3: name required |
| `create-series` | `{ name, color?, description?, year?, ... }` | State #3: name required |
| `update-sermon` | `{ id, ...fields }` | Fields go through `buildUpdate()` allowlist |
| `update-series` | `{ id, ...fields }` | — |
| `delete-sermon` | sermonId string | — |
| `delete-series` | seriesId string | — |
| `create-section` | `{ series_id, title, sort_order? }` | — |
| `update-section` | `{ id, ...fields }` | — |
| `delete-section` | sectionId string | — |
| `transition-state` | `{ sermonId, targetStage?, targetStep?, targetSubPhase? }` | Process #1 + #2 enforcement |
| `apply-mutation` | `{ sermonId, field, value, proposalId? }` | Mutation #1 + #2 enforcement |
| `load-tour-sermon` | — | Seeds or reuses tour record |
| `remove-tour-sermon` | — | Deletes tour record; idempotent |

---

### `"db-getCalendarNotes"`
```
receives: nothing
returns:  array of { id, date, type, label, notes }
```
Returns all calendar notes ordered by date ASC.

### `"db-createCalendarNote"`
```
receives: { date: string, type?: string, label?: string, notes?: string }
returns:  id string (UUID)
```
Inserts a calendar note. `type` defaults to `"special"`. Triggers `saveDb()`.

### `"db-deleteCalendarNote"`
```
receives: id string
returns:  undefined
```
Deletes a calendar note by id. Triggers `saveDb()`.

### `"db-getSchemaVersion"`
```
receives: nothing
returns:  { version: string }
```
Reads `schema_version` from the `meta` table.

### `"db-flush"`
```
receives: nothing
returns:  { ok: true } | { ok: false, error: string } | { ok: true, skipped: true }
```
Manual flush of `sermonforge.db` to disk. Wired to the `db-write-error`
banner's "Retry" button; calling directly is also safe. Atomic via
`<dbPath>.tmp` + rename; rotates the prior good blob to `<dbPath>.bak`.

### `"db-getSetting"`
```
receives: key string
returns:  string | null
```
Reads a value from the `settings` table.

### `"db-setSetting"`
```
receives: { key: string, value: string }
returns:  true
```
Upserts a value in the `settings` table. Triggers a debounced `saveDb()`.

### `"db-backupMemory"`
```
receives: json string (serialized pastor memory object)
returns:  { ok: true } | { ok: false, error: string }
```
Write-through copy of the renderer's `localStorage.sermonforge_memory` to
`%APPDATA%\sermonforge\data\memory-backup.json`. Survives Electron major
upgrades, manual cache clears, and migrate-to-new-machine. Called fire-and-forget
from `saveMemory()` in `src/utils/memory.js`. Memory remains primary in
localStorage — this is a durability backup, not a source of truth. Per
`docs/CORE.md`, full memory does not move to the main process because the IPC
round-trip per AI call is too expensive.

### `"db-restoreMemory"`
```
receives: nothing
returns:  { ok: true, json: string|null } | { ok: false, error: string }
```
Reads the memory backup file. Called from `App.jsx` mount via
`restoreMemoryFromBackup()` when localStorage is empty. Returns `json: null`
when no backup file exists (first launch, or backup never written).

---

## Scripture

### `"passage-fetch"`
```
receives: passage string (e.g. "Galatians 1:1-10")
returns:  { esv, esvPending, esvError }
```
Fetches passage text in ESV:
- ESV via Crossway ESV API (`ESV_API_KEY`); `esvPending=true` when key not set

Results are cached in-memory per session. OSIS passage ID parser handles single verse,
range, cross-chapter range, and whole chapter formats.

---

## Theology

### `"theology-status"`
```
receives: nothing
returns:  { available: bool }
```
Whether `theology.db` is present and loaded.

### `"theology-search"`
```
receives: { query: string, limit: number }
returns:  array of {
            id, author, work, work_id,
            locator, ccel_page_start, ccel_page_end,
            text_chunk
          }
```
**Hybrid FTS4 + sqlite-vec semantic search**, not LIKE. Lazy-loads `theology.db`
on first call. Pipeline:

1. **Author detection.** A small keyword map (`THEOLOGY_AUTHORS` in
   `electron/main.js`) recognises author names in the query (`augustine`,
   `calvin`, `chrysostom`, etc.); detected names are stripped from the
   semantic/FTS query string and used to filter results.
2. **Phrase detection.** Quoted segments and content-word pairs separated by
   up to three stop words are promoted to FTS phrase terms (e.g.
   `fear of the lord` → `"fear of the lord"`).
3. **Semantic path** (when `theologyVecAvailable`): runs `Xenova/all-MiniLM-L6-v2`
   over the query, KNN against `theology_vec` (vec0), JOINs to `theology`. **In
   parallel**, runs FTS4 over the same query. FTS phrase matches rank first;
   semantic results fill remaining slots up to `limit`. If author was detected,
   semantic results are post-filtered to that author.
4. **FTS-only fallback.** Used when vectors are unavailable, when the embedder
   fails to load, or when the semantic path throws. Reranks candidates by
   `scoreTheologyChunk` (term-frequency scoring across `author`, `work`, `text`).

Returns `[]` if `theology.db` is unavailable. Per-call latency is dominated by
embedder load on first call (~2-3 s cold) and KNN scan on large corpora.

**Note:** `theology-status` returns `{ available, semantic }`. The renderer
currently surfaces only `available`; an FTS-only fallback is therefore
indistinguishable from a working semantic search at the UI level today
(deferred to a later UI phase).

### `"theology-get-chunks"`
```
receives: { ids: string[], maxChars: number }
returns:  array of { id, author, work, text_chunk }
```
Fetches specific theology chunks by id. `maxChars` clamped to 100–2000.
Returns `[]` if `theology.db` is unavailable.

---

## Series

### `"series-export-study-guide"`
```
receives: series id string
returns:  { success: true, filepath: string }
        | { success: false, error: string }
```
Assembles a 5-part `.docx` study guide from all series fields, sections, and sermon slots.
Saves to `~/OneDrive/SermonForge/StudyGuides/[title] — Study Guide.docx`.
Creates the `StudyGuides` directory if absent. Empty parts are omitted entirely.
(Series Planner is currently gated behind a "Coming soon" placeholder — ARI Phase 0,
2026-05-09 — so this handler is reachable only via the legacy Planning route, which now
renders the placeholder. Handler retained for future Series Planner re-enablement.)

### `"sermon-export-manuscript"`
```
receives: { title, passage, date, mpt, mps,
            introduction:{opener,scripture_reading,expectation},
            transitions, conclusion:{response},
            outline:[{id,text}], functionalElements }
returns:  { success: true, filepath: string }
        | { success: false, error: string }
```
Builds a `.docx` of the manuscript prose: title block (title, passage, date, MPT, MPS) → divider → Introduction → per-point sections (transition, point heading, scripture, explanation, application, illustration) → conclusion transition → Conclusion.
Saves to `Documents/SermonForge/exports/Manuscripts/[title] — Manuscript.docx`, then opens it via `shell.openPath`.

---

## Feedback

### `"feedback-submit"`
```
receives: { category, currentView, schemaVersion, appVersion, submittedAt, ...category fields }
returns:  { success: true, filepath: string }
        | { success: false, error: string }
```
Writes a markdown feedback file to `~/OneDrive/SermonForge/Feedback/YYYY-MM-DD-HH-MM-category.md`.
Creates the `Feedback` directory if absent.

---

## App

### `"app-get-version"`
```
receives: nothing
returns:  { version: string }
```
Reads from `app.getVersion()`.

### `"app-get-key-status"`
```
receives: nothing
returns:  { configured: bool }
```
Whether `loadKey()` (in `electron/keystore.js`) returns a non-empty
Anthropic API key. The key value itself never crosses the IPC boundary.

### `"app-save-api-key"`
```
receives: { anthropic: string, esv?: string }
returns:  { success: true } | { success: false, error: string }
```
Validates and stores user-provided keys via Electron `safeStorage` (packaged
builds) or `process.env` (dev). Validates Anthropic key starts with `sk-ant-`
and is ≥ 20 chars. On success, calls `resetClient()` so the cached SDK client
is rebuilt with the new key on the next AI call.

### `"app-get-startup-warning"`
```
receives: nothing
returns:  null | { kind: "onedrive" | "onedrive-first-run", path: string }
```
Pull-pattern delivery of one-shot startup warnings. Renderer
(`OneDriveWarning.jsx`) calls once on mount; main returns the pending
warning and clears the slot so subsequent calls in the same process see
`null`. The warning is populated in `app.whenReady` after `initDatabase`
when `paths.userData` matches `/OneDrive/i`. `kind === "onedrive-first-run"`
when no `sermonforge.db` existed at init entry (drives a blocking modal);
`kind === "onedrive"` otherwise (drives a localStorage-sticky banner).

### `"app-open-data-folder"`
```
receives: nothing
returns:  Promise<string> (empty string on success, error message on failure — passes shell.openPath result through)
```
Opens `paths.userData` in the OS file manager. Wired to the OneDrive
warning surfaces so the user can locate the folder before relocating
OneDrive sync away from it.

---

## Events (one-way, main → renderer)

Subscribed to via `onDbWriteError` and `onDbWriteOk` (see `electron/preload.js`).
Each subscriber returns an unsubscribe function.

### `"db-write-error"`
Payload: `string` (error message). Emitted by `flushDb` only on the **second
consecutive** failure — a single transient OneDrive/AV lock that self-recovers
on the next debounced write does not pop a banner. App.jsx renders a persistent
top-of-window banner with a "Retry" button (calls `db-flush`) on receipt.

### `"db-write-ok"`
Payload: none. Emitted by `flushDb` after a successful write that follows at
least one failure. Renderer dismisses the banner on receipt.
