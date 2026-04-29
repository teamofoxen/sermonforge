# SermonForge — IPC Channel Reference

All channels are handled in `electron/main.js` unless noted otherwise.
See `docs/SYSTEMS/ipc.md` for architecture and boundary rules.

---

## AI

### `"ai-message"` — handled in `electron/ai.js`
```
receives: { messages: [{role, content}], systemPrompt: string }
returns:  string (Claude's response text)
```
The only channel through which the Anthropic API is called. API key never leaves the main process.

---

## Database Operations

Database operations use named per-operation IPC channels. All handlers in `electron/main.js`.
No raw SQL is accepted from the renderer.

### `"db-getSchemaVersion"`
```
receives: nothing
returns:  { version: string }
```
Reads `schema_version` from the `meta` table.

### `"db-getRecentSermons"`
```
receives: limit number (default 3)
returns:  array of sermon rows
```
Returns sermons where `stage != 'archived'` and `!= 'planning'`, ordered by `updated_at`.

### `"db-getRecentSeries"`
```
receives: limit number (default 3)
returns:  array of series rows
```
Returns series excluding tour sermons (`id NOT LIKE 'tour-%'`), ordered by `COALESCE(updated_at, created_at) DESC`. Used by the Sidebar's Series Planning dropdown.

### `"db-deleteLibraryItem"`
```
receives: id string
returns:  undefined (throws on DB error)
```
Deletes from both `library` and `library_fts` in a single transaction.
Best-effort cleanup of corresponding rows in `library.db` (chunks + vectors)
runs outside the transaction; failures there log only.

### `"db-flush"`
```
receives: nothing
returns:  { ok: true } | { ok: false, error: string } | { ok: true, skipped: true }
```
Manual flush of `sermonforge.db` to disk. Wired to the `db-write-error`
banner's "Retry" button; calling directly is also safe. Atomic via
`<dbPath>.tmp` + rename; rotates the prior good blob to `<dbPath>.bak`.

### `"db-loadTourSermon"`
```
receives: nothing
returns:  { sermonId: string }
```
Seeds (or reuses) the tour sermon record (`id LIKE 'tour-%'`) and returns its id.
Tour rows are excluded from `getAllSermons` / `getRecentSermons` filters.

### `"db-removeTourSermon"`
```
receives: nothing
returns:  undefined
```
Deletes the tour sermon record. Idempotent.

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

---

## Library

### `"library-status"`
```
receives: nothing
returns:  { count: number, lastImported: string|null }
```

### `"library-get-folder"`
```
receives: nothing
returns:  { path: string, isExplicit: boolean }
```
Returns the resolved sermon-library folder. `isExplicit` is true when the user has chosen a folder; false when falling back to the legacy default.

### `"library-set-folder"`
```
receives: nothing
returns:  { canceled: boolean, path: string|null }
opens:    native folder picker (dialog.showOpenDialog)
```
Persists the chosen folder to the `library_folder` setting.

### `"library-import"`
```
receives: nothing
returns:  { total, imported, moved, updated, skipped, errors }
pushes:   "library-import-progress" events: { done, total, complete }
```
Scans the resolved library folder (see `library-get-folder`) for `.docx` files.
Each file is parsed via `mammoth`, copied into `userData/library/`, and identity-resolved
by **content-hash first, then filepath**:
- **imported** — new file (no hash or path match) → INSERT + FTS + chunk + embed.
- **moved** — same content_hash but different filepath → UPDATE filepath only.
  No re-index; the chunks/vectors are already correct.
- **updated** — same filepath but different content_hash → file was edited;
  UPDATE manuscript + re-index FTS + re-index chunks/vectors.
- **skipped** — same hash, same path → no-op (already imported).
- **errors** — parse / IO / DB failure for a single file; counted, logged, loop continues.

Identity-by-hash fixes the prior duplication-on-folder-rename bug; identity-by-path
fixes the prior `INSERT OR IGNORE`-skips-edited-files bug.

### `"library-build-embeddings"`
```
receives: nothing
returns:  { total, embedded, errors }
pushes:   "library-embed-progress" events: { done, total, complete }
```
Backfills embeddings for any rows in `sermonforge.db.library` that don't yet have chunks indexed in `library.db`. Idempotent. Surfaced in the Library UI as a "Build index" banner.

### `"library-create-sermon-from-outline"`
```
receives: {
  title: string,
  passage: string,
  outline: [{ text, support?, source? }, ...],
  piAnswers: { background_noise, audience_assumptions, topic_theme },
  mode: "full" | "quick",
  seriesId?: string,
  sectionId?: string,
}
returns:  { sermonId: string, outlinePoints: [{ id, text }, ...] }
```
Inserts a new `sermons` row with the outline JSON-encoded into `outline` and PI answers persisted to their matching columns. `mode: "full"` writes `stage = "planning"`; `mode: "quick"` writes `stage = "quick"`. Used by Quick Outline Builder's Build-full / Build-quick buttons.

### `"sermon-export-quick-template"`
```
receives: { title, passage, outline: [{ id, text }, ...], piAnswers }
returns:  { success: true, filepath } | { success: false, error }
opens:    saved .docx via `shell.openPath`
```
Generates a placeholder Word doc (`Documents/SermonForge/exports/Manuscripts/<title> — Quick Sermon.docx`) with the outline points filled in and italic grey placeholders for every other category (intro, explanation, application, illustration per point, conclusion). Pastoral Intelligence answers render at the top when present.

### `"library-search"`
```
receives: { query: string, limit: number, mode: "browse"|"ai"|"hybrid" }
returns:  array of { id, title, passage, folder, series_name, word_count, excerpt }
```

Modes:
- `"browse"` — title/passage/series only (search bar filtering)
- `"ai"` — includes manuscript_text via FTS, with LIKE fallback
- `"hybrid"` — Reciprocal Rank Fusion across FTS rank (manuscript-level) and vector cosine (chunk-level, aggregated to manuscript via best-chunk distance). Falls back to `"ai"`-style FTS+LIKE when `library.db` / sqlite-vec is unavailable.

### `"library-get-manuscripts"`
```
receives: { ids: string[], truncate: bool, maxChars: number }
returns:  array of { id, title, passage, series_name, manuscript_text }
```

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
See `docs/SYSTEMS/series-planner.md` for the 5-part structure.

### `"sermon-export-pmb"`
```
receives: { blocks, spine, title, passage, mps }
returns:  { success: true, filepath: string }
        | { success: false, error: string }
```
Builds the Preaching Without Notes `.docx` from `sermon.preaching_blocks` (DeliveryTab CMC output).
Saves to `Documents/SermonForge/exports/PreachingBlocks/[title] — Preaching Blocks.docx`, then opens it via `shell.openPath`.

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

---

## Events (one-way, main → renderer)

Subscribed to via `onLibraryImportProgress`, `onLibraryEmbedProgress`,
`onDbWriteError`, and `onDbWriteOk` (see `electron/preload.js`). Each subscriber
returns an unsubscribe function.

### `"library-import-progress"`
Payload: `{ done: number, total: number, complete: bool }`. Emitted every 10
files during a `library-import` run, plus a final `complete: true`.

### `"library-embed-progress"`
Payload: `{ done: number, total: number, complete: bool }`. Emitted every 5
manuscripts during a `library-build-embeddings` run, plus a final `complete: true`.

### `"db-write-error"`
Payload: `string` (error message). Emitted by `flushDb` only on the **second
consecutive** failure — a single transient OneDrive/AV lock that self-recovers
on the next debounced write does not pop a banner. App.jsx renders a persistent
top-of-window banner with a "Retry" button (calls `db-flush`) on receipt.

### `"db-write-ok"`
Payload: none. Emitted by `flushDb` after a successful write that follows at
least one failure. Renderer dismisses the banner on receipt.
