# SermonForge — Database System

> For full table definitions, see `docs/REFERENCE/schema.md`.
> For the IPC channels used by database operations, see `docs/REFERENCE/ipc-channels.md`.

---

## Runtime

**sql.js** (SQLite compiled to WASM) is used instead of better-sqlite3.
**Why:** Native module compilation is blocked by the Node 24 + VS2026 environment.
This is an environment constraint, not a permanent architectural preference. If the
environment changes, revisiting better-sqlite3 is reasonable.

The DB is serialized to disk after writes. This is a whole-file operation — every write
serializes the entire database. This is why the `saveDb()` debounce is 500ms and must not
be reduced. See `docs/CORE.md`.

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

`library_fts` is an FTS4 virtual table (not FTS5).
**Why FTS4:** FTS5 was attempted first but encountered compatibility issues. FTS4 is stable.
**Why keyword search instead of vector embeddings:** The Anthropic API provides no embedding
endpoint, and adding an external embedding model would introduce a dependency and cost.
Revisit if theme-based search (vs. keyword search) becomes a requirement.

---

## Save Debounces

| Debounce | Duration | Location | Reason |
|----------|----------|----------|--------|
| Field save (`debouncedSave`) | 800ms | `SermonWorkspace.jsx` | Avoids IPC call on every keystroke |
| DB disk write (`saveDb`) | 500ms | `electron/main.js` | sql.js full-file serialization cost |

Both debounces are deliberate trade-offs, not bugs. Do not reduce them.

---

## Storage Path

Database file: `C:\Users\rossa\OneDrive\SermonForge\sermonforge.db`
Backed up automatically via OneDrive sync.

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
