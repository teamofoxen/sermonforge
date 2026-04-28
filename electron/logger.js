// electron/logger.js — crash and error logging for the main process.
//
// Writes to userData/logs/app.log. Safe to require before app is ready —
// writes are silently dropped until the path can be resolved.
// Log is rotated when it exceeds 1MB (keeps last 200 lines).

const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const { isDev } = require("./config");

const MAX_BYTES = 1 * 1024 * 1024;

let _logFile = null;

function logFile() {
  if (_logFile) return _logFile;
  try {
    const dir = path.join(app.getPath("userData"), "logs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _logFile = path.join(dir, "app.log");
    return _logFile;
  } catch (_) {
    return null; // app not ready yet — caller skips write
  }
}

function write(level, message, extra) {
  const ts = new Date().toISOString();
  const line = extra
    ? `[${ts}] [${level}] ${message}\n${extra}\n`
    : `[${ts}] [${level}] ${message}\n`;

  if (isDev) {
    level === "ERROR" ? console.error(line.trim()) : console.log(line.trim());
  }

  try {
    const f = logFile();
    if (!f) return;
    fs.appendFileSync(f, line);
    if (fs.statSync(f).size > MAX_BYTES) rotate(f);
  } catch (_) {
    // Never throw from logger
  }
}

function rotate(f) {
  try {
    const lines = fs.readFileSync(f, "utf8").split("\n");
    fs.writeFileSync(f, lines.slice(-200).join("\n"));
  } catch (_) {}
}

function logInfo(message) {
  write("INFO", message);
}

function logError(message, err) {
  write("ERROR", message, err?.stack || (err ? String(err) : undefined));
}

function readRecent(n = 50) {
  try {
    const f = logFile();
    if (!f || !fs.existsSync(f)) return "";
    const lines = fs.readFileSync(f, "utf8").split("\n").filter(Boolean);
    return lines.slice(-n).join("\n");
  } catch (_) {
    return "";
  }
}

module.exports = { logInfo, logError, readRecent };
