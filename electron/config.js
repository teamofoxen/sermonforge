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

  // Writable user data directory (same path in dev and prod — Electron's userData)
  userData: path.join(app.getPath("userData"), "data"),

  // Crash + error log (Phase 2 — written here, attached to feedback reports)
  logs: path.join(app.getPath("userData"), "logs"),
};

// ── Dev server ────────────────────────────────────────────────────────────────
const devServerUrl = "http://localhost:5173";

module.exports = { isDev, isPackaged, paths, devServerUrl };
