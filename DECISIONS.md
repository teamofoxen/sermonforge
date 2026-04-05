# SermonForge Architectural Decisions

This file records every significant architectural decision, the options considered, and the reason for the choice made. Any change that would contradict a decision here must be explicitly flagged and approved before proceeding.

---

## ADR-001 — sql.js over better-sqlite3

**Decision:** Use `sql.js` (WebAssembly SQLite) instead of `better-sqlite3` (native Node addon).

**Context:** The original spec called for `better-sqlite3`. On this machine:
- Node version is 24.14.1 — no prebuilt binaries exist for `better-sqlite3` at this version
- VS BuildTools installed is VS2026 (version 18) — the `node-gyp` version bundled in `@electron/rebuild` has a hardcoded version year parser that does not recognize version 18, failing with "invalid versionYear: undefined"
- Compilation attempt also failed due to `better-sqlite3` setting `/std:c++17` which Node 24's `v8config.h` rejects (requires C++20)

**Options considered:**
1. `better-sqlite3` — blocked by environment (chosen in spec)
2. `sql.js` — pure WebAssembly, zero native compilation, works with any Node/Electron version
3. `sqlite3` (lowercase, older package) — still requires native compilation
4. `@napi-rs/sqlite` — also native

**Choice:** `sql.js`. No compilation required. SQLite engine is identical (same C source, compiled to WASM). The entire DB fits in memory for a sermon prep app with hundreds of records. Persistence is handled explicitly: load file into memory on startup, `saveDb()` writes the serialized buffer to disk on every write operation.

**Trade-offs accepted:**
- Entire DB lives in memory (acceptable — sermon data is small)
- Async init (wrapped in `app.whenReady()`)
- Different API from `better-sqlite3` (no synchronous `db.prepare().run()` — uses `stmt.bind/step/getAsObject`)

**Revisit if:** The app grows to very large datasets (thousands of sermons, large manuscript blobs) where memory pressure becomes a concern, or if a future Node/VS version allows `better-sqlite3` to compile cleanly.

---

## ADR-002 — Electron + React + Vite stack (updated 2026-03-30)

**Decision:** Electron 31 for the desktop shell, React 18 for UI, Vite 5 as the bundler.

**Context:** Specified in the original brief.

**Rationale:**
- Electron gives full desktop capabilities: file system access, shell integration (`shell.openExternal` for Logos), system tray, native menus, local SQLite DB
- React is the most widely supported UI library with the richest ecosystem
- Vite provides fast builds, HMR in dev mode, and `base: "./"` support for Electron's `file://` loading

**Key Vite config:** `base: "./"` in `vite.config.mjs` is required so that asset paths in the built `dist/index.html` are relative rather than absolute — Electron loads from `file://` not `http://`, so absolute paths break.

**Config file format:** `vite.config.js` was renamed to `vite.config.mjs` (2026-03-30) to use Vite's ESM Node API and eliminate the CJS deprecation warning. `__dirname` was replaced with the ESM equivalent (`path.dirname(fileURLToPath(import.meta.url))`). Electron's `main.js` remains CommonJS and is unaffected.

---

## ADR-003 — IPC-only API key handling

**Decision:** The Anthropic API key never crosses into the renderer process. All AI calls are made in the main process via `ipcMain.handle("ai-message", ...)`.

**Context:** Electron's renderer process is essentially a browser context. Anything exposed to the renderer can be read via DevTools or injected scripts.

**Implementation:**
- `.env` loaded in `electron/main.js` only
- `preload.js` exposes `window.electronAPI.sendAIMessage(messages, systemPrompt)` which invokes the IPC channel — the renderer sends message content, not credentials
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` in `BrowserWindow.webPreferences`

**Do not change:** Never move the Anthropic SDK import or `process.env.ANTHROPIC_API_KEY` reference into a renderer-side file. Never expose the key via `contextBridge`.

---

## ADR-004 — OneDrive storage path for the database

**Decision:** Database file stored at `~/OneDrive/SermonForge/sermonforge.db`, with fallback to `app.getPath("userData")`.

**Context:** The project root is already at `C:\Users\rossa\OneDrive\SermonForge`. Storing the DB in the same OneDrive folder means sermon data is automatically synced across devices.

**Implementation:** `electron/main.js` `initDatabase()` checks `os.homedir()/OneDrive/SermonForge` first; falls back to Electron's userData directory if OneDrive path does not exist.

**Trade-off accepted:** OneDrive sync can cause EPERM/lock errors if two devices try to write the DB simultaneously. Acceptable for single-user desktop use. sql.js writes the entire DB as a single atomic `fs.writeFileSync` call, which reduces (but does not eliminate) conflict risk.

---

## ADR-005 — logos4:// URL scheme for Logos Bible Software integration

**Decision:** Logos integration is handled entirely via URI scheme (`logos4://bible/esv/[Book].[ch].[v]`), opened with Electron's `shell.openExternal()`.

**Context:** Logos Bible Software registers the `logos4://` URI scheme on Windows during installation. Calling `shell.openExternal("logos4://...")` hands off to the OS, which launches Logos and navigates to the passage.

**No Logos SDK or API is used.** This approach requires no authentication, no dependency on a Logos library, and no network call — it simply opens a URL.

**URL format:** `logos4://bible/esv/[Abbrev].[chapter].[verse]-[Abbrev].[chapter].[verse]`

Examples:
- Single verse: `logos4://bible/esv/Gal.1.1`
- Single-chapter range: `logos4://bible/esv/Gal.1.1-Gal.1.10`
- Cross-chapter range: `logos4://bible/esv/Mat.5.1-Mat.7.12`
- No match: `logos4://bible/[url-encoded passage]` (fallback)

**Known abbreviation uncertainties** (verify against your Logos installation):
- Song of Solomon → `Sol` (Logos may expect `Song` or `SSo`)
- Obadiah → `Oba` (some versions use `Ob`)
- Philemon → `Phm` (also seen as `Phlm`)
- Philippians → `Php` (also seen as `Phi`)

**Bug fixed 2026-03-29:** Cross-chapter range destructuring had `verseEnd` and `endChapter` swapped. See CHANGELOG.md.

---

## ADR-006 — Book abbreviation mapping table

**Decision:** Maintain a static `BOOK_ABBREVS` object in `electron/main.js` mapping full English book names to Logos 3-character abbreviations.

**Rationale:** Logos requires specific abbreviations that differ from standard SBL abbreviations. A static map is the simplest, most auditable approach. The map covers all 66 canonical books. The renderer passes raw passage strings (e.g. "Galatians 1:1-10") and the main process normalizes them.

**Limitation:** The map only matches exact full English names as typed into the passage field (e.g. "Galatians", "1 Corinthians"). Abbreviations typed by the user (e.g. "Gal", "1 Cor") will fall through to the `logos4://bible/[encoded]` fallback. This is acceptable — encourage full book names in passage fields.

---

## ADR-008 — Schema migration system

**Decision:** Use a `meta` table with a `schema_version` integer and a `runMigrations()` function in `initDatabase()` to manage schema changes.

**Context:** The initial schema was missing two columns (`functional_elements`, `checklist`) required for Step 4 and delivery checklist persistence. Once real data exists in `sermonforge.db`, a bare `CREATE TABLE IF NOT EXISTS` cannot add columns to existing tables. A migration system is needed so existing installs upgrade cleanly.

**Implementation:**
- `meta` table: `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
- `schema_version` stored in `meta` as a key/value pair
- `runMigrations()` called in `initDatabase()` after table creation, before `saveDb()`
- Each migration version is a guarded block: `if (version < N) { ... ALTER TABLE ... set version N }`
- `ALTER TABLE ADD COLUMN` errors are caught silently — on fresh installs the columns already exist from `CREATE TABLE`, so the error is expected and harmless
- Current version: **4**

**Migration history:**
- v0 → v2: Added `functional_elements TEXT DEFAULT '{}'` and `checklist TEXT DEFAULT '{}'` to `sermons`
- v2 → v3: Added `library` table and `library_fts` FTS4 virtual table for sermon library import and search
- v3 → v4: Added series planning fields (`big_idea`, `overview`, `passage_range`, `start_date`, `end_date`, `structural_outline`, `canon_category`) to `series`; added `series_sections` table; added `calendar_notes` table; added `section_id` and `is_one_off` columns to `sermons`
- v4 → v5: Data migration — converts `outline` from `string[]` to `{id, text}[]` and remaps `functional_elements` keys from numeric strings to UUIDs (ADR-009 resolution). No structural schema changes.

**Trade-offs accepted:**
- Migrations are one-directional (no rollback). Acceptable for a single-user app.
- Silent catch on duplicate column errors means migration failures that aren't duplicate-column errors could be swallowed. For this app's scale this is acceptable.

**Revisit if:** The schema changes frequently enough to warrant a proper migration library.

---

## ADR-009 — functional_elements JSON structure

**Status: RESOLVED** (2026-04-02)

**Original decision (now superseded):** Stored as `{ "0": {...}, "1": {...} }` keyed by numeric
string index. Reordering outline points misaligned E/A/I content — known limitation.

**Current decision:** Each outline point carries a stable UUID that travels with it through
reorders, deletes, and adds. `functional_elements` is keyed by that UUID.

**New outline shape** (stored in `sermons.outline`):
```json
[
  { "id": "uuid-v4", "text": "point text" },
  ...
]
```

**New functional_elements shape** (stored in `sermons.functional_elements`):
```json
{
  "uuid-v4": { "explanation": "...", "application": "...", "illustration": "..." }
}
```

**Migration:** Schema v5 (in `runMigrations()`) performs a data migration on every existing
sermon: converts string[] outline items to `{id, text}` objects using `crypto.randomUUID()`,
and remaps numeric `functional_elements` keys to the corresponding new UUIDs. Migration is
idempotent — records already in the new format are detected and skipped.

**New invariants:**
- `createOutlinePoint(text)` in `src/utils.js` is the single place new outline points are created.
- `point.id` is never displayed to the user.
- Deleting an outline point triggers `onRemove(point.id)` in `OutlineBuilder.jsx`, which removes
  the corresponding `functional_elements` entry immediately.
- The reorder-mismatch warning banner has been removed from `StudyTab.jsx` and `OutlineTab.jsx`.

**Accessors:**
- `getOutline(sermon)` always returns `{id, text}[]`. Legacy string[] items get a deterministic
  djb2-based fallback ID so functional_elements lookups remain stable across reads.
- `serializeOutline(outline)` validates the `{id, text}[]` shape before serializing.
- `getFunctionalElements(sermon)` warns (does not migrate) when numeric keys are detected.

**Reorder mismatch limitation:** Eliminated.

---

## ADR-010 — Sermon Library: FTS5 full-text search over vector embeddings

**Decision:** Use SQLite FTS5 (built into sql.js) for library search rather than a
vector embedding approach.

**Context:** The user has 374+ .docx sermon files on OneDrive. The library feature
needs to find relevant sermons for a given topic/query, then pass those manuscripts
to Claude for synthesis.

**Options considered:**
1. **FTS5 (chosen)** — SQLite's built-in full-text search with BM25 ranking
2. **Vector embeddings** — embed each sermon with an embedding model, store vectors,
   run cosine similarity at query time. Anthropic has no embedding API; would require
   OpenAI or a local model (additional dependency, cost, complexity)
3. **LIKE search only** — simple but no ranking; misses relevant results

**Choice:** FTS5. It is built into the sql.js WASM build (SQLite compiled with
`-DSQLITE_ENABLE_FTS5`). No external service, no cost, no native dependencies.
BM25 ranking provides good relevance ordering for keyword-based queries. A stop-word
filter and keyword extraction step in `buildFtsQuery()` improves query quality.

**Trade-offs accepted:**
- Keyword-based: searching "the cross" does not inherently find "atonement" or
  "propitiation" unless those words appear in the text. Mitigated by: (a) the user's
  actual sermon texts will naturally contain related vocabulary, (b) the user can
  enter multiple terms in their prompt, (c) Claude receives the top results and can
  reason about relevance.
- No semantic similarity: won't cluster thematically related sermons that share no
  vocabulary. Acceptable for sermon prep use — users typically search with Biblical
  vocabulary (passage references, theological terms) that will match.

**Fallback:** If FTS5 creation fails, a LIKE-based search on title and passage runs
instead. This is logged but not surfaced to the user.

**Revisit if:** The user wants to search by theme/concept across sermons where keyword
overlap is low (e.g. "sermons about anxiety" when the word "anxiety" never appears).
At that point, a pre-computed Claude-generated summary per sermon plus summary-level
search would be the next upgrade.

---

## ADR-011 — Series planning hierarchy: Series → Sections → Sermons

**Decision:** Sermon planning uses a three-level hierarchy: Series (top-level planning document),
Sections (optional major divisions within a series), and Sermons (individual Sunday slots).

**Context:** The user's planning workflow begins before individual sermon prep — mapping a book,
dividing it into preachable units, anchoring them to Sundays, and building a theological overview.
This needed a dedicated workspace separate from the sermon prep workspace.

**Key design choices:**
- Sections are optional — short books (Philippians, Galatians) skip sections; long books
  (Luke, Romans) use them. Sections can be preached as standalone mini-series.
- Sermon slots created in the Series Planner are real `sermons` records with `stage='planning'`.
  No separate "slots" table needed — simplifies the schema.
- `is_one_off INTEGER` flag on sermons distinguishes standalone sermons (funerals, topical,
  special events) from series sermons.
- `canon_category` on series (ot|nt|wisdom|prophetic) enables coverage tracking over time.
- `calendar_notes` table stores user-defined special dates (holidays, guest preachers, breaks)
  so the calendar scheduler can skip them automatically.
- Church calendar (liturgical seasons) is computed purely in JS — no stored data needed.
  Easter is derived via Gregorian computus; all seasons derive from Easter and Advent.

**Revisit if:** Section-level sermon prep (shared AI context across a section) becomes needed.

---

## ADR-012 — saveDb() 500ms debounce crash window

**Decision:** Accept a 500ms window where an in-flight mutation could be lost on unexpected process termination. Do not reduce the debounce or add synchronous writes.

**Context:** sql.js requires serializing the entire DB on every write (`db.export()` + `fs.writeFileSync`). A 0ms debounce (synchronous write on every keystroke) would make the UI sluggish. A 500ms debounce is invisible to the user and keeps writes off the hot path.

**Trade-offs accepted:**
- Any process kill, power loss, or crash within 500ms of the last mutation loses that mutation. The user would see the pre-mutation state on next launch.
- This is acceptable because: (a) sermon data is small and changes are incremental, (b) OneDrive provides file-level backup/version history, (c) the app is single-user with no concurrent writes.

**Implementation detail:**
- `_pendingWrite` boolean is set to `true` by `saveDb()` and cleared to `false` before `flushDb()` runs (inside the timeout callback, not inside `flushDb` itself).
- `flushDb()` warns in dev (`ELECTRON_DEV=1`) if `_pendingWrite` is still `true` when it is called — this indicates an external caller (e.g. a quit handler) flushed while the debounce was still pending.
- `flushDb()` also sets `_pendingWrite = false` after a successful write, as a safety net in case of direct calls.

**Revisit if:** Mutations become large enough that the debounced write causes perceptible lag, or if data integrity requirements increase (e.g. the app gains multi-device sync beyond OneDrive passive sync).

---

## ADR-007 — Production build: vite build then electron . (no dev server at runtime)

**Decision:** `npm start` compiles the React app to `dist/` first, then launches Electron loading `dist/index.html` directly. No Vite dev server runs at runtime.

**Context:** The original `concurrently` + `wait-on` approach kept a Vite dev server running as a dependency of the app window. Closing the terminal killed the app. This is inappropriate for a desktop tool.

**Implementation:**
- `npm start`: `vite build && electron .`
- `npm run dev`: `concurrently "vite" "wait-on ... && ELECTRON_DEV=1 electron ."` — kept for development with hot reload
- `npm run build`: `vite build && electron-builder --win` — produces NSIS installer in `release/`

**Env var:** `ELECTRON_DEV=1` is the only flag that causes Electron to load from the Vite dev server. Absent this flag, it always loads `dist/index.html`.

**electron-builder packaging notes:**
- `asarUnpack: ["node_modules/sql.js/dist/sql-wasm.wasm"]` — WASM binary must be outside the asar; path resolved via `process.resourcesPath/app.asar.unpacked/...`
- `extraResources: [{ from: ".env", to: ".env" }]` — `.env` copied to resources dir; path resolved via `process.resourcesPath/.env`
- NSIS config: `oneClick: false`, `allowToChangeInstallationDirectory: true`, `createDesktopShortcut: true`

---

## ADR-013 — Pastor memory stored in localStorage, not the sermon database

**Decision:** The pastoral memory layer (outline patterns, phrase patterns, recent MPTs, recent
passages) is stored in the Electron renderer's `localStorage` under the key `"sermonforge_memory"`,
not in `sermonforge.db`.

**Context:** Memory is built up incrementally during sermon prep sessions and is used only by the
renderer-side context pipeline (`contextBuilder.js`) and adaptive hint system. It requires no IPC
round-trip to read or write — all reads and writes happen synchronously in the renderer. Its loss
is recoverable: the memory object rebuilds naturally over subsequent sessions as the pastor works
through sermons.

**Trade-offs accepted:**
- `sermonforge.db` lives on OneDrive and syncs across machines. `localStorage` lives in Electron's
  Chromium profile directory (not `userData` — it is specific to the Chromium runtime embedded in
  each Electron version), which is local only, not synced, and not guaranteed to survive Electron
  major version updates. A major Electron upgrade can silently invalidate the profile directory,
  leaving `localStorage` empty even if no explicit data was cleared.
- If the user installs on a new machine, upgrades Electron across a major version, or Electron's
  profile directory is cleared, the sermon database restores from OneDrive but pastoral memory
  starts blank. Memory rebuilds over time as the pastor works through sermons.
- This asymmetry is accepted because: (a) memory loss has no permanent effect — it only delays
  adaptation, (b) keeping memory out of the DB avoids an IPC round-trip on every AI call, and
  (c) the single-machine use case makes cross-device sync a non-issue in practice.

**More intentional storage location identified:** A flat JSON file at
`~/AppData/Local/SermonForge/pastor_memory.json` has been identified as a better home for this
data — it is explicit, survives Electron updates reliably, and lives where the user would expect
to find app data. See FUTURE.md Entry 3 for the migration plan. The current implementation remains
`localStorage` until the trigger conditions in that entry are met.

**Revisit if:** Multi-machine use becomes a real workflow (e.g. study machine + home machine both
actively used), or the pastor reports memory loss after an Electron update. At that point, migrate
to the flat JSON file described above (FUTURE.md Entry 3), or if sync is required, add a `memory`
key to the `meta` table and write/read the JSON blob there instead.

---

## ADR-014 — Series Booklet Export: .docx via docx library, generated in main process

**Status: Planned — not yet implemented**

**Decision:** The series booklet export will generate a formatted .docx file using the docx npm library, assembled entirely in the main process and written to disk via IPC.

**Context:** The Series Planner produces a body of structured content — series big idea, overview narrative, structural outline, section breakdowns, sermon slots with dates and liturgical seasons — that a pastor would want as a printable or shareable document. A booklet export makes this planning work portable outside the app.

**Intended output structure:**
- Series title, passage range, canon category, dates
- Series big idea
- Series overview narrative
- Structural outline
- Per-section: title, passage range, big idea, overview
- Per-sermon slot: title, passage, date, liturgical season

**Implementation approach:**
- docx library handles .docx generation — pure JavaScript, no native compilation required, consistent with the project's ADR-001 constraint against native addons
- Assembly and file write happen in the main process — consistent with the IPC-only file system access pattern used throughout the app
- Renderer triggers export via a named IPC channel (e.g. series-export-booklet)
- Main process returns { success, filepath } so the renderer can confirm completion
- Export location: pastor-specified via a save dialog, or a default exports folder

**Revisit if:** The booklet needs richer formatting (embedded images, complex styles) that the docx library handles poorly, at which point a different generation approach should be evaluated.

---

## ADR-015 — Pastoral Intelligence tier: always-on context gated by content, not step

**Decision:** A new context tier `[THIS SERMON]` carries three pastor-supplied fields —
Topic/Theme, Audience Assumptions, Background Noise — into every AI prompt regardless
of step gating.

**Context:** These fields describe the situational intelligence the pastor brings to prep:
the thematic territory, the room, and the external moment. Unlike series big idea (which
can predetermine exegetical conclusions if present too early), pastoral intelligence fields
are situational rather than theological. Knowing the congregation is carrying anxiety about
job losses does not bias how a text is interpreted — it shapes how it will eventually be
applied. The fields are therefore safe to include from Observe onward.

**Implementation:**
- Three new columns on the sermons table: `topic_theme`, `audience_assumptions`,
  `background_noise` — all `TEXT DEFAULT ''`.
- Schema version incremented from 5 to 6 via a v6 migration block in `runMigrations()`.
- `normalizeSermon()` in `contextBuilder.js` extended to include the three fields
  (default `''` for null/undefined sermon input).
- `resolveIncludes()` returns `pastoralContext: true` at every step including
  `PHASES.OBSERVE` — unlike every other tier boolean.
- `buildTiers()` assembles tier7 from the three fields with an 800-char combined budget.
  Gate: at least one field must have content (`text?.trim().length > 0`). Single-word
  entries like "Lament" are included (not subject to the 20-char `isMeaningful` threshold
  used by other tiers).
- `assembleContext()` emits `[THIS SERMON]` after `[PASSAGE & MPT]` and before
  `[INTERPRETATION]`.
- A persistent orientation card in `SermonWorkspace.jsx` renders the three editable
  fields above the tab content at every step. Series sermons also display read-only
  series and section big ideas in the card. Fields save via the standard
  `handleUpdate → debouncedSave → updateSermon` IPC path.

**Tier 4 gating adjustment (co-located decision):** `STEPS.MPT_MPS`, `STEPS.OUTLINE`,
and `STEPS.FUNCTIONAL_ELEMENTS` added to the steps where tier 4 (series context) is
active. The exegesis phases (`PHASES.OBSERVE`, `PHASES.INTERPRET`,
`PHASES.REDEMPTIVE_THREAD`) remain tier4: false to protect text-driven method integrity —
series big idea should not shape what the text is understood to say before that
interpretation work is complete.

**Trade-offs accepted:**
- Pastoral intelligence is ungated because it describes the room, not the predetermined
  answer. Tier 4 (series context) remains gated for exegesis phases because a series
  big idea is a theological claim that can predetermine what the text appears to say.
- The three fields save via the standard debounced path — no real-time sync guarantee,
  but 800ms lag is imperceptible for orientation-level fields.

**Revisit if:** A pastor reports that audience or background context is shaping their
exegesis in ways that feel like contamination rather than orientation. If that happens,
add step-level gating to `pastoralContext` in `resolveIncludes()`.
