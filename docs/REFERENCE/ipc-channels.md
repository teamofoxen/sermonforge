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
returns:  { total, imported, errors, skipped }
pushes:   "library-import-progress" events: { done, total, complete }
```
Scans the resolved library folder (see `library-get-folder`) for `.docx` files. Each new import is copied into `userData/library/`, parsed via `mammoth`, persisted to `sermonforge.db.library` + FTS, then chunked and embedded into `library.db` (chunks + vec0 vectors).

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
returns:  array of { id, author, work, text_chunk, score }
```
LIKE-based search across `author`, `work`, and `text` columns; scored by field weight.
Returns `[]` if `theology.db` is unavailable.

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
