# SermonForge — Database System

> For full table definitions, see `docs/REFERENCE/schema.md`.
> For the IPC channels used by database operations, see `docs/REFERENCE/ipc-channels.md`.

---

## Runtime

SermonForge uses a **dual-driver** architecture:

- **`sermonforge.db` → sql.js (WASM).** The main application database (sermons,
  series, sections, calendar notes, illustrations, library, FTS) runs on sql.js.
  Historical reason: native module compilation was blocked by the Node 24 + VS2026
  environment when this driver was chosen. sql.js serializes the entire database
  to disk on each write, which is why the `saveDb()` debounce is 500ms and must
  not be reduced. See `docs/CORE.md`.
- **`theology.db` → better-sqlite3 + sqlite-vec.** The theology corpus runs on
  the native driver because it depends on the `sqlite-vec` extension for vector
  semantic search. Native modules must be rebuilt for Electron's ABI after
  install: `npx @electron/rebuild -m node_modules/better-sqlite3`. Both native
  packages are listed in `asarUnpack` in `package.json`.

The two drivers are intentionally isolated — sermonforge.db is never touched by
better-sqlite3, and theology.db is never touched by sql.js.

---

## Schema Version

Current schema version: **14**

The version is stored in the `meta` table under key `schema_version`.
Read via IPC `"db-getSchemaVersion"`.

---

## Migration Rules

- **Never alter `CREATE TABLE` statements directly.** The schema is defined once at creation time.
- All schema changes must go through `runMigrations()` in `electron/main.js` with a version
  increment. Each migration is a conditional block keyed to the version number.
- Never add a column, table, or index without a corresponding migration.
- Schema version must be incremented atomically with the migration that requires it.
- All `ALTER TABLE … ADD COLUMN` statements go through `safeAlter()`. It treats
  "duplicate column name" as benign (re-running an idempotent migration) and
  rethrows every other SQLite error so the version bump at the end of the block
  is **not** reached on real failures (locked DB, disk full, etc.). The previous
  swallowing pattern (`try { … } catch (_) {}`) let `schema_version` advance
  while the column was permanently missing — `safeAlter` makes that impossible.
- A per-launch `assertSchemaContract()` runs after `runMigrations()` and verifies
  every column in `SERMON_COLUMNS` / `SERIES_COLUMNS` is present in the live
  schema. On mismatch it logs an ERROR via `electron/logger.js` (visible in
  `app.log` and attached to feedback submissions) and the next launch retries
  the schema-contract migration (see v14 below).
- **v14 — schema-contract reconciliation.** Re-applies every additive ALTER
  from v2 / v4 / v6 / v7 / v8 / v9 / v12 idempotently. The backstop for any
  install where a prior swallowed-catch caused a column to go missing while
  the version was bumped past it.

---

## SERMON_COLUMNS Allowlist

`buildUpdate()` in `electron/main.js` validates all fields passed to `db-updateSermon` against
a `SERMON_COLUMNS` allowlist before any SQL UPDATE runs. This is a security boundary — no
renderer-supplied field name outside the allowlist reaches the database.

When adding new fields to the `sermons` table, they must also be added to `SERMON_COLUMNS`.

---

## Full-Text Search

`library_fts` (on sermonforge.db) is an FTS4 virtual table (not FTS5).
**Why FTS4:** FTS5 was attempted first but encountered compatibility issues. FTS4 is stable.

The main sermon library remains FTS-only (keyword search over title, passage, and
manuscript text). This is appropriate for the pastor's own prior manuscripts, where
exact-phrase and book-name lookups are the primary retrieval need.

## Theology Search (vector + FTS hybrid)

`theology.db` uses hybrid retrieval:

- **Vector search via `sqlite-vec`** against a `theology_vec` vec0 virtual table
  (384-dim). Query embeddings are generated locally using `@xenova/transformers`
  with the `Xenova/all-MiniLM-L6-v2` model (quantized). The model is lazy-loaded
  on first semantic search; subsequent queries reuse the loaded pipeline.
- **FTS4 (`theology_fts`)** runs alongside vector search. Exact phrase matches
  from FTS are ranked first; semantic results fill remaining slots.
- **Automatic fallback to FTS-only** when the vector table has no embeddings or
  when the embedding model fails to load.

No external embedding API is used — embeddings are computed on-device.

---

## Save Debounces

| Debounce | Duration | Location | Reason |
|----------|----------|----------|--------|
| Field save (`debouncedSave`) | 800ms | `SermonWorkspace.jsx` | Avoids IPC call on every keystroke |
| DB disk write (`saveDb`) | 500ms | `electron/main.js` | sql.js full-file serialization cost |

Both debounces are deliberate trade-offs, not bugs. Do not reduce them.

---

## Storage Path

Resolved by `electron/config.js` via `app.getPath("userData")` plus a `data` /
`data-dev` subdirectory. **Single source of truth — never recompute elsewhere.**

- Packaged: `%APPDATA%\sermonforge\data\sermonforge.db` (typically
  `C:\Users\<user>\AppData\Roaming\sermonforge\data\sermonforge.db`)
- Dev (`ELECTRON_DEV=1`): `%APPDATA%\sermonforge\data-dev\sermonforge.db`
- `theology.db` and `library.db` live alongside `sermonforge.db` in the same dir.
- Atomic flush writes via `<dbPath>.tmp` and rotates the prior good blob to
  `<dbPath>.bak`. On startup, a corrupt primary falls back to `.bak`; if both
  fail the corrupt original is renamed to `<dbPath>.corrupt-<ts>` and a fresh
  DB is created — pastor data is never silently overwritten.
- `ai-log.jsonl` (audit log), `app.log` (crash log), and `sf-anthropic.enc` /
  `sf-esv.enc` (safeStorage keys) live at the **userData root**, not under
  `data/`, so they persist across the dev/prod data-folder split.

Exports are written to `Documents\SermonForge\exports\` and (Study Guides,
Feedback) to `~/OneDrive/SermonForge/...` when OneDrive is present.

OneDrive is **not** used for the application databases. OneDrive is used only
for the pastor's external sermon file library (`LIBRARY_PATH` default —
`~/OneDrive/Ministry/Preaching/Sermon Library`, overridable via
`library-set-folder` IPC) and for the user's own backup choices for exported
files. The app runs correctly without OneDrive.

**OneDrive risk note.** `app.getPath("userData")` resolves to `%APPDATA%\Roaming`,
which is normally not synced. Enterprise GPOs or roaming-profile setups can
redirect Roaming AppData into a sync agent — when that happens, better-sqlite3
file locks on `theology.db` / `library.db` collide with the sync agent and the
DBs fail to open. If the user reports DB-open errors and `paths.userData` shows
a OneDrive-like path, the recovery is to opt the install out of roaming or
relocate the data directory.

---

## Cross-System Dependencies

**If adding columns to the `sermons` table:** also update the `SERMON_COLUMNS` allowlist in
`electron/main.js`. `buildUpdate()` already guards this: in dev it **throws** if an unknown
field is submitted; in production it **logs a warning** and drops the field. You will catch
the miss immediately in development — but only if you actually exercise the save path in testing.

---

## Key Design Notes

- **Pastor memory** is stored in `localStorage` (not the database). This is intentional: the
  IPC round-trip cost of reading memory on every AI call would be significant if it were in
  the DB. Tradeoff: memory does not survive Electron major version upgrades.
- **Sermon slots** are real `sermons` records with `stage='planning'`. There is no separate
  planning-slots table.
- **Illustrations, calendar notes, library, and metadata** are in separate tables.
  See `docs/REFERENCE/schema.md` for all table definitions.
