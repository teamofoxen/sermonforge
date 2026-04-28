// electron/keystore.js — secure storage for the user's Anthropic API key.
//
// In dev: always reads from .env so Ross's workflow is unchanged.
// In prod: uses Electron safeStorage (OS keychain / DPAPI) written to userData.
//
// The key never leaves the main process. Renderer only sends it during setup
// and receives a boolean status — never the key itself.

const { safeStorage, app } = require("electron");
const path = require("path");
const fs = require("fs");
const { isPackaged } = require("./config");

const KEY_FILE = path.join(app.getPath("userData"), "sf-key.enc");

function saveKey(plaintext) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS encryption is not available on this machine.");
  }
  const encrypted = safeStorage.encryptString(plaintext);
  fs.writeFileSync(KEY_FILE, encrypted);
}

function loadKey() {
  // Any unpackaged run (dev machine, friend's git clone) reads from .env as always.
  // Only a real packaged install uses safeStorage.
  if (!isPackaged) return process.env.ANTHROPIC_API_KEY || null;

  if (fs.existsSync(KEY_FILE)) {
    try {
      if (!safeStorage.isEncryptionAvailable()) return null;
      const buf = fs.readFileSync(KEY_FILE);
      return safeStorage.decryptString(buf);
    } catch (e) {
      console.error("[keystore] Decrypt failed:", e.message);
      return null;
    }
  }

  return null;
}

function isConfigured() {
  return Boolean(loadKey());
}

module.exports = { saveKey, loadKey, isConfigured };
