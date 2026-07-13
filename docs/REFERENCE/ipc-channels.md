# SermonForge — IPC Channel Reference

All channels are handled in `electron/main.js` unless noted otherwise.
See `docs/SYSTEMS/ipc.md` for architecture and boundary rules.

---

## Database Operations

All sermon and series state routes through the `"spine"` channel. Session 3
(2026-07-13) added three bounded planner-gesture mutation ops —
`reorder-sections`, `reorder-series-sermons`, and `bulk-date-sermons` (dates +
the `series.end_date` mirror; resolves `{ end_date }`) — each one visible
human gesture committed in one SQLite transaction with relational validation
(parents must exist and cohere; unknown update fields reject the whole
mutation in dev and production alike). Named per-operation `db-get*` channels for sermons/series (`db-getRecentSermons`, `db-getRecentSeries`, `db-loadSampleSermon`) no longer exist — they are spine ops now. (`db-loadTourSermon` was renamed to `db-loadSampleSermon` in the tour-cleanup phase, 2026-05-17; `db-removeTourSermon` retired in the same phase — the sample-sermon path is self-cleaning via delete-then-insert.) Settings, calendar notes, schema, and sermon full-text search remain as named channels. No raw SQL is accepted from the renderer.

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
| `get-all-sermons` | — | all sermons, date DESC (excludes sample-prefixed seed) |
| `get-all-series` | — | all series (excludes sample-prefixed seed) |
| `get-recent-sermons` | `{ limit? }` (default 3) | recent non-complete sermons |
| `get-recent-series` | `{ limit? }` (default 3) | recent series |
| `get-in-progress-sermons` | — | in-progress sermons (State #6) |
| `get-sermons-by-series` | seriesId string | sermons in series, ordered by the shared `seriesSermonOrderBy` (dated first, then section order, then per-sermon `sort_order`, then `created_at`) — same order as the Schedule + study-guide export |
| `get-sections-by-series` | seriesId string | sections in series, sort_order ASC |
| `get-all-tags` | — | distinct sorted topic tags across all live sermons (own-tag autocomplete + Topics lens; v32) |
| `get-series-sermon-counts` | — | `{ [seriesId]: count }` map of undeleted sermons grouped by `series_id` — one grouped read for the Planning list's per-series counts, replacing an N+1 fan-out of `get-sermons-by-series` |

**Write ops** (all go through `validateAndCommit`; contract violations return `{ ok: false, code, clause, message }`):

| Op | Payload | Notes |
|---|---|---|
| `create-sermon` | `{ name, series_id?, section_id?, is_one_off?, passage?, date?, preacher? }` | State #3: name required |
| `create-series` | `{ name, color?, description?, year?, ... }` | State #3: name required |
| `update-sermon` | `{ id, ...fields }` | Fields go through `buildUpdate()` allowlist |
| `update-series` | `{ id, ...fields }` | — |
| `delete-sermon` | sermonId string | v24 soft delete: sets `deleted_at`, drops the search row; list reads exclude tombstoned rows |
| `restore-sermon` | sermonId string | Undo for delete-sermon: clears `deleted_at`, re-indexes |
| `delete-series` | seriesId string | — |
| `create-section` | `{ series_id, title, sort_order? }` | — |
| `update-section` | `{ id, ...fields }` | — |
| `delete-section` | sectionId string | — |
| `apply-mutation` | `{ kind: "user_input", sermonId, field, value }` | `kind` must be `"user_input"` — the only kind since `MUTATION_KIND` was collapsed in ARI Phase 9. `value` is a string for simple fields or a typed `StructuredFieldUpdate` for structured fields (State #5 shape check). Mutation #1 enforcement. No `proposalId` — that token exists only in the AI-simulation test helper, not in the main-process handler. |
| `load-sample-sermon` | `{ fresh?: true }` (optional) | Default (no payload / `fresh` falsy): returns the existing sample sermon as-is if one exists — `{ sermonId, created: false }` — preserving the pastor's sandbox edits; seeds only when none exists. With `fresh: true` (Dashboard's "Start the sample fresh" action): delete-then-insert reseed of every `sample-%` sermon/series row. |

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
Inserts a calendar note. `type` defaults to `"special"`.

### `"db-deleteCalendarNote"`
```
receives: id string
returns:  undefined
```
Deletes a calendar note by id.

### `"db-getSchemaVersion"`
```
receives: nothing
returns:  { version: string }
```
Reads `schema_version` from the `meta` table.

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
Upserts a value in the `settings` table.

### `"db-searchSermons"`
```
receives: { query: string, limit?: number }
returns:  array of sermon search hits (up to `limit`, default 50)
```
Full-text search over `sermon_search` (LIKE-based, v22 — see
`docs/REFERENCE/schema.md`). Exposed to the renderer as
`electronAPI.searchSermons` (`electron/preload.js`).

---

All writes above (and every spine write) commit as a durable, journaled
better-sqlite3 transaction the instant the IPC handler returns — see
`docs/SYSTEMS/ipc.md` Spine Call Path. There is no `saveDb()` and no
main-process debounce.

---

## Scripture

### `"passage-fetch"`
```
receives: passage string (e.g. "Galatians 1:1-10"), opts? { headings?: boolean }
returns:  { esv, esvPending, esvState, esvError? }
```
Fetches passage text via the Crossway ESV API. `opts.headings` (default
false) includes Crossway's section headings — used by the Bible lookup window
(PassagePopup browser mode) so the literary/pericope seams show; cached
separately from the headings-off fetch. `esvState` is the
structured code the popup renders plain English from:
`"ok"` (text in `esv` — possibly empty for an unrecognized reference) ·
`"no-key"` (never saved) · `"key-unreadable"` (key file exists but
decrypt failed — re-entering fixes it) · `"bad-key"` (401/403) ·
`"rate-limited"` (429) · `"offline"` (fetch itself failed) · `"error"`
(other non-OK status). `esvPending` keeps its legacy meaning (true when
no usable key) and `esvError` keeps the raw message — both retained for
stale consumers; no surface renders `esvError` verbatim anymore.

Only successes are cached (in-memory, per session) so error states always
re-attempt. OSIS passage ID parser handles single verse, range,
cross-chapter range, and whole chapter formats.

---

## Theology

### `"theology-status"`
```
receives: nothing
returns:  { available: bool, semantic: bool }
```
`available` — whether `theology.db` is present and loaded. `semantic` —
whether `sqlite-vec` vector search is usable (see the Note below).

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
Assembles the `.docx` study-guide booklet from the series, its sections, and its
undeleted sermons: Introduction (book big idea + overview) → a part per section →
a page per sermon (big idea + overview-as-commentary + passage + date, the
pastor's `study_guide_extras` additions, and blank listener Notes lines) →
Remaining (unsectioned) → a Reference part (`structural_outline`).
Saves to `Documents/SermonForge/exports/StudyGuides/[title] — Study Guide.docx` (via `app.getPath("documents")`).
Creates the directory if absent. Empty parts are omitted entirely.
(Reachable from the Study guide tab in the Series Planner. Planner rebuilt around
the content model 2026-06-24; see `docs/SYSTEMS/series-planner.md`.)

### `"sermon-export-manuscript"`
```
receives: { title, passage, date, mpt, mps,
            introduction:{opener,scripture_reading,expectation},
            transitions, conclusion:{response},
            outline:[{id,text}], functionalElements }
returns:  { success: true, filepath: string, opened: bool }
        | { success: false, error: string }
```
Builds a `.docx` of the manuscript prose: title block (title, passage, date, MPT, MPS) → divider → Introduction → per-point sections (transition, point heading, scripture, explanation, application, illustration) → conclusion transition → Conclusion.
Saves to `Documents/SermonForge/exports/Manuscripts/[title] — Manuscript.docx`,
then attempts `shell.openPath`. If nothing handles `.docx` (openPath returns
a non-empty error string), `opened` is `false` and the handler falls back to
`shell.showItemInFolder` so the renderer can still show the file's location.

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
Whether the user has completed the one-time first-run setup screen.
ARI Phase 8 (2026-05-09) repurposed this channel: `configured` now reflects
the presence of the `bti_telemetry_enabled` setting (written on SetupScreen
submit). The legacy name is preserved so existing renderer code continues
to resolve. No API key value ever crosses the IPC boundary.

### `"app-save-api-key"`
```
receives: { esv?: string }
returns:  { success: true, unverified?: true } | { success: false, error: string }
```
Stores the user-provided ESV key via Electron `safeStorage` (packaged
builds) or `process.env` (dev). Channel name preserved for renderer-side
compatibility; ESV is the only key the app accepts (ARI Phase 8,
2026-05-09 — Anthropic key handling removed alongside the AI subsystem).
A leading `Token ` prefix is stripped before validation and save (pastors
paste it from the ESV site's examples). When the verification request
can't reach the ESV API (offline), the key is still saved and the result
carries `unverified: true` so the renderer can say so honestly. Keystore
failures return plain-English `error` copy; the raw message goes to the
log only.

### `"app-open-external"`
```
receives: url: string
returns:  { success: bool }
```
Opens a URL in the system browser via `shell.openExternal`. The main
process enforces a hard exact-match allowlist (currently only
`https://api.esv.org/`) — non-allowlisted URLs are refused and logged,
never opened. Extend the allowlist deliberately, one URL at a time.

### `"set-ui-theme"`
```
receives: "light" | "dark"
returns:  { ok: bool }
```
Fire-and-forget theme persistence from the renderer's toggle. Main writes
`ui-prefs.json` in userData and reads it SYNCHRONOUSLY in `createWindow`
to set the BrowserWindow `backgroundColor` and pass `?theme=` to the
splash — the dark-launch light-flash fix. localStorage can't serve here
(main has no access; the `file://` splash doesn't share the app origin).
Values outside the two known themes are ignored.

### `"app-email-support"`
```
receives: { subject?: string, body?: string }
returns:  { success: true }
```
Opens a `mailto:` to the support address with the given subject/body via
`shell.openExternal`. The address lives in `electron/support.js`
(mirrored at `src/constants/support.js`) — main-controlled, so the
renderer can never route "support" mail anywhere else.

### `"updater-get-status"`
```
receives: nothing
returns:  null | { state: "downloaded", version: string }
```
Last known updater status (`downloaded` = installs on next quit). Pulled
on renderer mount to cover the race where the download finished before
React subscribed to the push channel.

### `"updater-status"` (push, main → renderer)
```
payload: { state: "downloaded", version: string }
```
Sent on `update-downloaded`. The renderer (Sidebar) shows a quiet
dismissible line; no dialog ever steals focus.

### `"updater-restart"`
```
receives: nothing
returns:  { ok: boolean, restarted: boolean }
```
Renderer-initiated "Restart now". Main flushes the renderer's debounced
edits (`flushRendererEdits`) and runs the result through the shared exit
decision (`confirmExitOverSaveResult`, `electron/saveTransition.cjs`): a
"failed"/"unknown" flush asks the pastor ("Keep working" returns
`{ ok: false, restarted: false }` without restarting; "Restart anyway"
proceeds). On proceed, `quitAndInstall` routes through the before-quit
handler (second flush — the explicit choice is not re-asked — + WAL
checkpoint + db close) before the installer runs.

### `"app-get-startup-warning"`
```
receives: nothing
returns:  null
        | { kind: "onedrive" | "onedrive-first-run", path: string }
        | { kind: "db_corrupt_quarantined" | "db_recovered_backup" | "db_migrated",
            message: string, path?: string }
```
Pull-pattern delivery of one-shot startup warnings. Main holds a QUEUE
(`_pendingStartupWarnings`) populated by `initDatabase` (recovery kinds:
`db_corrupt_quarantined`, `db_recovered_backup`, `db_migrated`) and
`maybeWarnOneDrive` (`onedrive-first-run` / `onedrive`); each call pops
ONE warning in severity order (corrupt > recovered > migrated >
onedrive-first-run > onedrive), so the OneDrive nag can never overwrite
a corruption-recovery message. The renderer (`OneDriveWarning.jsx`)
re-fetches on dismiss, presenting warnings one at a time. Returns `null`
when the queue is empty — the per-call shape is unchanged from the old
single-slot design. When a recovery warning coexists with a OneDrive
path, the recovery message names OneDrive as the likely cause.

### `"app-open-data-folder"`
```
receives: nothing
returns:  Promise<string> (empty string on success, error message on failure — passes shell.openPath result through)
```
Opens `paths.userData` in the OS file manager. Wired to the OneDrive
warning surfaces so the user can locate the folder before relocating
OneDrive sync away from it.

### `"app-get-sermon-columns"`
```
receives: nothing
returns:  { columns: string[] }
```
Returns the main-process `SERMON_COLUMNS` allowlist wrapped in a `columns`
key. The renderer reads `res.columns` and asserts it against the
renderer-side mirror (`src/core/contracts.ts`, re-exported via
`src/constants/sermonColumns.js`) on App mount; a mismatch fails fast
rather than letting `buildUpdate()` silently drop unknown fields.

---

## BTI Telemetry + Feedback

### `"report-renderer-error"`
```
receives: { label: string, detail: string }
returns:  { ok: true }
```
Logs `"[renderer] {label}"` to `app.log` (`detail` capped at 2000 chars) and,
when telemetry is enabled, emits the `crash` telemetry event (error string
capped at 500 chars). Never throws. Exposed as
`electronAPI.reportRendererError(label, detail)`; called fire-and-forget by
the global window error hooks in `src/main.jsx` and the React ErrorBoundary
in `src/App.jsx`.

### `"telemetry-emit"`
```
receives: { eventType: string, payload: object }
returns:  { ok: bool }
```
Fire-and-forget event emission from renderer to the main-process bus
(`electron/telemetry/bus.js`). The bus appends to a local NDJSON buffer
and the transport batches uploads to the BTI Cloudflare Worker. No-op
when the user has the telemetry toggle off. Event vocabulary lives in
`electron/telemetry/events.js`.

### `"telemetry-set-enabled"`
```
receives: bool
returns:  { ok: true }
```
Flips the main-process bus's in-memory enabled flag (`telemetryBus.setEnabled`),
which short-circuits `emit()`/`flush()` when off, and emits the deferred
first-run `app-open` event when turned on. **This channel persists nothing** —
durable persistence of the `bti_telemetry_enabled` setting is a separate
renderer responsibility (`SetupScreen.jsx` writes it via `db-setSetting`
before calling this channel); a caller that toggles telemetry must do both,
or the preference is lost on restart.

### `"bti-feedback-submit"`
```
receives: { kind: "flag" | "form", payload: object }
returns:  { ok: true }
        | { ok: false, reason: "disabled" | "bad-kind" | "no-transport" | "threw" }
        | { ok: false }
```
Submits a Tier 1 flag or Tier 2 form to the BTI Cloudflare Worker. There is
no `error` field on any return shape. The bare `{ ok: false }` case is a
failed network POST — the item is persisted to the immediate retry queue
and resent on the next periodic flush. Payload shape per
`docs/PROPOSALS/bti-build-mvp.md`.

---

## Events (one-way, main → renderer)

Subscribers are exposed via `electron/preload.js`; each returns an
unsubscribe function.

> **Removed 2026-07-01:** the `db-write-error` / `db-write-ok` push events and
> the `db-flush` manual-checkpoint channel. Main never emitted the events after
> the better-sqlite3 driver swap — a failed write throws at its own IPC handler
> and surfaces to the caller — so the App.jsx disk-write banner they fed could
> never appear. The events, the banner, and the channel were deleted together;
> save failures surface via `persistMutation` → save state in the workspace.
> The main-process internal WAL checkpoint (`flushDb()`, quit path + boot-time
> backup) is unaffected.

### `"app-flush-edits"`
Payload: `string` (nonce). Sent by `flushRendererEdits` in `electron/main.js`
before window close / app quit / updater restart. The renderer runs every
registered flusher (`src/utils/closeFlush.js`) and acks on
`"app-flush-edits-done"` with the same nonce plus an `ok` flag. Subscribed via
`onFlushEdits` (returns an unsubscribe function).

### `"app-flush-edits-done"` (renderer → main, `ipcRenderer.send`)
Payload: `string` (the nonce from `"app-flush-edits"`), `boolean` (`ok` —
`false` when any registered flush write failed). main matches the nonce to the
pending request and maps the ack onto the persistence-transition tri-state
(`electron/saveTransition.cjs`): ack+ok → `"saved"`, ack+!ok → `"failed"`, and
a 2s hard timeout → `"unknown"`, so a missing ack can never block close — the
exit seams prompt on `"failed"`/`"unknown"` but always keep an explicit
"anyway" way out.
