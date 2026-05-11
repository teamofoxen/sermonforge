// electron/config.js — single source of truth for dev/prod environment.
//
// All code that needs to know "am I running on Ross's machine or someone else's"
// reads from here. Never scatter app.isPackaged or ELECTRON_DEV checks elsewhere.
//
// IMPORTANT: require() this file AFTER electron app is ready (or at module load
// time in main.js — app.getPath() is safe to call after require("electron")).

const { app } = require("electron");
const path = require("path");

const isDev = process.env.ELECTRON_DEV === "1";
const isPackaged = app.isPackaged;

// ── Paths ─────────────────────────────────────────────────────────────────────
// All paths that differ between dev and packaged builds live here.
// Callers import the path they need; they do not recompute it.

const paths = {
  // .env file location
  env: isPackaged
    ? path.join(process.resourcesPath, ".env")
    : path.join(__dirname, "../.env"),

  // sql.js WASM — passed as locateFile() callback to initSqlJs()
  sqlWasm: (file) => isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "sql.js", "dist", file)
    : path.join(__dirname, "../node_modules/sql.js/dist/", file),

  // Embedding models for @xenova/transformers
  models: isPackaged
    ? path.join(process.resourcesPath, "models")
    : path.join(__dirname, "../resources/models"),

  // Writable user data directory.
  // Dev uses a separate subdirectory so dev work doesn't collide with packaged
  // installs on the same machine (Windows is case-insensitive, so "sermonforge"
  // and "SermonForge" userData paths would otherwise share a folder).
  userData: path.join(app.getPath("userData"), isPackaged ? "data" : "data-dev"),

  // Crash + error log (Phase 2 — written here, attached to feedback reports)
  logs: path.join(app.getPath("userData"), isPackaged ? "logs" : "logs-dev"),

  // BTI telemetry NDJSON queue (electron/telemetry/bus.js).
  // Per-session NDJSON files accumulate here; periodic flush ships to the
  // Cloudflare Worker (see transport/worker.js).
  telemetry: path.join(app.getPath("userData"), isPackaged ? "telemetry" : "telemetry-dev"),
};

// ── Legacy DB locations ───────────────────────────────────────────────────────
// Every place `sermonforge.db` has lived across releases. The DB resolver in
// `electron/main.js` consults this list when the active `paths.userData/sermonforge.db`
// doesn't exist — finding the most recent legacy file with real data and
// migrating it forward.
//
// **This list is append-only.** When `paths.userData` changes (in this file or
// anywhere else), the previous active path MUST be added here in the same
// commit. CORE.md "The userData path is permanent" clause binds this.
//
// Order is informational only — the resolver picks by mtime/size, not order.
const legacyDbPaths = [
  // Pre-Apr-13 2026 — bare userData root, before the OneDrive removal commit
  // (5c54664) introduced a fixed Windows location.
  path.join(app.getPath("userData"), "sermonforge.db"),
  // Apr 13 – Apr 27 2026 — fixed `C:\SermonForge\data` location used between
  // commit 5c54664 (OneDrive removal) and 7ff2c25 (unify DB path).
  // Windows-only by construction; non-existent on other platforms is a no-op.
  path.join("C:", "SermonForge", "data", "sermonforge.db"),
  // Apr 27 – Apr 28 2026 — unified `userData/data` location used between
  // commit 7ff2c25 and 64d83ee (dev/prod split). After the split this path
  // is the active packaged-install location; the resolver filters it out
  // automatically when it matches `paths.userData`.
  path.join(app.getPath("userData"), "data", "sermonforge.db"),
  // Apr 28+ 2026 — split dev location. After the split this path is the
  // active dev location; the resolver filters it out automatically when it
  // matches `paths.userData`.
  path.join(app.getPath("userData"), "data-dev", "sermonforge.db"),
];

// ── Dev server ────────────────────────────────────────────────────────────────
// Worktree experiment: this trail-experiment worktree uses the
// `sermonforge-trail` Vite preview on port 5181 so it doesn't fight the
// main repo's dev session on 5173. Restore to 5173 before merging back.
const devServerUrl = "http://localhost:5181";

module.exports = { isDev, isPackaged, paths, legacyDbPaths, devServerUrl };
