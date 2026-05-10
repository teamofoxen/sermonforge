// electron/keystore.js — secure storage for user-provided API keys.
//
// In unpackaged runs (dev, git clones): reads from .env as always.
// In packaged installs: uses Electron safeStorage (OS keychain / DPAPI).
//
// Keys never leave the main process. Renderer sends them once during setup
// and receives only boolean status — never the values themselves.

const { safeStorage, app } = require("electron");
const path = require("path");
const fs = require("fs");
const { isPackaged } = require("./config");

// ── Generic named-key storage ─────────────────────────────────────────────────

function keyFile(name) {
  return path.join(app.getPath("userData"), `sf-${name}.enc`);
}

function saveNamedKey(name, value) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS encryption is not available on this machine.");
  }
  fs.writeFileSync(keyFile(name), safeStorage.encryptString(value));
}

function loadNamedKey(name, envVar) {
  if (!isPackaged) return process.env[envVar] || null;
  const f = keyFile(name);
  if (fs.existsSync(f)) {
    try {
      if (!safeStorage.isEncryptionAvailable()) return null;
      return safeStorage.decryptString(fs.readFileSync(f));
    } catch (e) {
      console.error(`[keystore] Decrypt failed for ${name}:`, e.message);
      return null;
    }
  }
  return null;
}

// ── Named-key convenience exports (used by main.js) ───────────────────────────

function loadEsvKey() { return loadNamedKey("esv", "ESV_API_KEY"); }

// Save the ESV key submitted from the setup screen. Empty = skip.
function saveKeys({ esv }) {
  if (esv && esv.trim()) saveNamedKey("esv", esv.trim());
}

module.exports = { saveKeys, loadEsvKey };
