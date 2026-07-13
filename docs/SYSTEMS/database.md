# SermonForge — Database System

> For full table definitions, see `docs/REFERENCE/schema.md`.
> For the IPC channels used by database operations, see `docs/REFERENCE/ipc-channels.md`.

---

## Runtime

Both databases run on **better-sqlite3** (native SQLite). The 2026-06-10 driver
swap retired sql.js for `sermonforge.db` — its whole-DB-serialize-per-write
model was the root cause of the 500ms crash window, the flush-queue machinery,
and most of the hand-rolled durability code that previously lived in
`electron/main.js`.

- **`sermonforge.db` → better-sqlite3, WAL journal mode.** Every spine write is
  a durable SQLite commit the moment its IPC handler returns. A hard kill
  mid-session loses nothing committed — the WAL replays on the next open
  (verified live with SIGKILL on 2026-06-10). `flushDb()` survives as an
  internal main-process WAL checkpoint (`wal_checkpoint(TRUNCATE)`) used by
  the quit path and the boot-time backup. (The `db-flush` IPC channel and the
  renderer's disk-write banner plumbing were removed 2026-07-01 — main never
  emitted the banner's events post-swap; a failed write throws at its own
  handler and surfaces to the caller.) The main DB never loads extensions.
- **`theology.db` → better-sqlite3 + sqlite-vec.** The theology corpus loads
  the `sqlite-vec` extension for vector semantic search. Native modules must be
  rebuilt for Electron's ABI after install:
  `npx @electron/rebuild -m node_modules/better-sqlite3`. Both native packages
  are listed in `asarUnpack` in `package.json`.

The two connections stay isolated — separate handles, separate query helpers,
no shared statements.

### Boot sequence (initDatabase)

1. Open the primary at the active path; `PRAGMA quick_check` probes for
   page-level corruption. Lock/IO errors are classified **transient** (boot
   aborts, every file untouched); quick_check failures are **corrupt**.
2. On corruption: quarantine the primary (`<dbPath>.corrupt-<ts>`), copy
   `.bak` → primary, reopen. If `.bak` is also bad, start fresh — the
   quarantined original is never deleted.
3. Legacy resolver (Phase 2) runs once per active path when the library is
   row-empty: the active connection is **closed** before the resolver copies a
   winner over the active path, then reopened (file-backed connections are
   path-bound; `migrateLegacyDb` closes every candidate handle and returns
   `{ source }` only).
4. Boot-time backup: `wal_checkpoint(TRUNCATE)` then copy primary → `.bak` —
   one good copy per launch, taken BEFORE bootstrap/migrations write anything,
   so `.bak` is also the pre-migration recovery point.
5. `runMigrations()` executes inside **one transaction** — a thrown migration
   rolls back completely and the on-disk DB stays pristine for a fixed build.

---

## Schema Version

Current schema version: **32** (the full migration ledger lives in
[`docs/REFERENCE/schema.md`](../REFERENCE/schema.md)).

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
  schema. On mismatch it logs an ERROR via `electron/logger.js`, visible only in
  the local `app.log` — nothing attaches log content to feedback submissions
  (that legacy path was removed in the public-launch hardening pass). It does
  not throw, and it does not retry: the v14 reconciliation block below only
  runs when `schema_version < 14`, so a live contract violation past v14
  requires a new migration, not a next-launch retry.
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

## Theology Search (vector + FTS hybrid)

`theology.db` uses hybrid retrieval:

- **Vector search via `sqlite-vec`** against a `theology_vec` vec0 virtual table
  (384-dim). Query embeddings are generated locally using `@xenova/transformers`
  with the `Xenova/all-MiniLM-L6-v2` model (quantized).
- **FTS4 (`theology_fts`)** runs alongside vector search. Exact phrase matches
  from FTS are ranked first; semantic results fill remaining slots.
- **Automatic fallback to FTS-only** when the vector table has no embeddings or
  when the embedding model fails to load.

No external embedding API is used — embeddings are computed on-device.

### Embedding pipeline location

The Xenova pipeline runs in a `worker_threads` worker
(`electron/embedder/worker.js`), driven from main via
`electron/embedder/host.js`. This keeps ONNX runtime CPU work off the
main process so renderer IPC, `flushDb`, and dialog handling do not
stall during model load (1–3 s cold) or per-query embedding.

Worker idle TTL: 10 min — terminates the worker to release ~85 MB of
model memory; the next call respawns. Worker crash: pending requests
reject with a tagged error and the next call respawns.

---

## Save Debounces

| Debounce | Duration | Location | Reason |
|----------|----------|----------|--------|
| Field save (`debouncedSave`) | 800ms | `SermonWorkspace.jsx` | Avoids IPC call on every keystroke |

The renderer debounce is a deliberate trade-off, and it is **flushed on window
close, app quit, and reload** via `src/utils/closeFlush.js` + the
`app-flush-edits` ask/ack (see `docs/REFERENCE/ipc-channels.md`). Since
2026-07-13 every deliberate exit resolves that flush to the
persistence-transition tri-state — `"saved"` / `"failed"` / `"unknown"`
(`src/utils/saveTransition.js`, mirrored in `electron/saveTransition.cjs`) —
and a non-`"saved"` result is put to the pastor ("Keep working" / "… anyway")
instead of being ignored; the exit-seam detail lives in
`docs/SYSTEMS/sermon-workspace.md` (save flow). The former
500ms main-process `saveDb()` debounce was retired with the sql.js driver
(2026-06-10): writes now commit at the IPC handler, and no main-process save
debounce may be reintroduced (see `docs/CORE.md`).

---

## Storage Path

Resolved by `electron/config.js` via `app.getPath("userData")` plus a `data` /
`data-dev` subdirectory. **Single source of truth — never recompute elsewhere.**

- Packaged: `%APPDATA%\sermonforge\data\sermonforge.db` (typically
  `C:\Users\<user>\AppData\Roaming\sermonforge\data\sermonforge.db`)
- Dev (`ELECTRON_DEV=1`): `%APPDATA%\sermonforge\data-dev\sermonforge.db`
- `theology.db` lives alongside `sermonforge.db` in the same dir.
- WAL mode means `sermonforge.db-wal` / `-shm` sidecars exist while the app
  runs; a clean close checkpoints and removes them. `.bak` is written once per
  launch (post-quick_check, pre-migration). On startup, a corrupt primary
  falls back to `.bak`; if both fail the corrupt original is renamed to
  `<dbPath>.corrupt-<ts>` and a fresh DB is created — pastor data is never
  silently overwritten.
- `sf-esv.enc` (the ESV safeStorage key — the only key SermonForge stores;
  Anthropic-key handling was removed with ARI, so `sf-anthropic.enc` and
  `ai-log.jsonl` do not exist), `ui-prefs.json`, and `tester-id.txt` live at
  the **userData root**, not under `data/`, so they persist across the
  dev/prod data-folder split. `app.log` does **not** live at the userData
  root — it lives under `logs/` (`logs-dev/` in dev; `electron/config.js`
  `paths.logs`), so it is dev/prod-split too.

Exports are written to `Documents\SermonForge\exports\` — study guides to the
`StudyGuides\` subfolder, manuscripts to `Manuscripts\`. There is no OneDrive
export path. Feedback is not a file export at all: FeedbackForm/FeedbackFlag
route through the `bti-feedback-submit` IPC channel to the BTI Cloudflare
Worker (see `docs/SYSTEMS/ipc.md`); a failed submission persists only to a
local telemetry retry queue.

OneDrive is **not** used for the application databases, and no export path
writes to OneDrive. OneDrive appears only (a) as a legacy DB-migration source
location, and (b) as an active startup warning when the user's data folder
sits inside a synced OneDrive root (`maybeWarnOneDrive`,
`src/components/OneDriveWarning.jsx`). The app runs correctly without OneDrive.

**OneDrive risk note.** `app.getPath("userData")` resolves to `%APPDATA%\Roaming`,
which is normally not synced. Enterprise GPOs or roaming-profile setups can
redirect Roaming AppData into a sync agent — when that happens, better-sqlite3
file locks on `theology.db` collide with the sync agent and the DB fails to open.
If the user reports DB-open errors and `paths.userData` shows a OneDrive-like
path, the recovery is to opt the install out of roaming or relocate the data
directory.

---

## Cross-System Dependencies

**If adding columns to the `sermons` table:** also update the `SERMON_COLUMNS` allowlist in
`electron/main.js`. `buildUpdate()` already guards this: in dev it **throws** if an unknown
field is submitted; in production it **logs a warning** and drops the field. You will catch
the miss immediately in development — but only if you actually exercise the save path in testing.

---

## Key Design Notes

- **Sermon slots** are real `sermons` records with `stage='in_progress'`. There is no separate
  planning-slots table.
- **Calendar notes and metadata** are in separate tables.
  See `docs/REFERENCE/schema.md` for all table definitions.
