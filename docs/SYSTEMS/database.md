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

Current schema version: **7**

The version is stored in the `meta` table under key `schema_version`.
Read via IPC `"db-getSchemaVersion"`.

---

## Migration Rules

- **Never alter `CREATE TABLE` statements directly.** The schema is defined once at creation time.
- All schema changes must go through `runMigrations()` in `electron/main.js` with a version
  increment. Each migration is a conditional block keyed to the version number.
- Never add a column, table, or index without a corresponding migration.
- Schema version must be incremented atomically with the migration that requires it.

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

Databases are stored locally under `C:\SermonForge\data\`:

- `C:\SermonForge\data\sermonforge.db` — main application database (sql.js)
- `C:\SermonForge\data\theology.db` — theology corpus (better-sqlite3 + sqlite-vec)

The data directory is created on first use via `mkdirSync({ recursive: true })`.

Exports are written to `C:\SermonForge\exports\` (Study Guides, Feedback).

OneDrive is **not** used for the application databases. OneDrive is used only for
the pastor's external sermon file library (`LIBRARY_PATH` —
`~/OneDrive/Ministry/Preaching/Sermon Library`) and for the user's own backup
choices for exported files. The app runs correctly without OneDrive.

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
