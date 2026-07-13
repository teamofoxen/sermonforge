#!/usr/bin/env node
// scripts/packaged-smoke.cjs — bounded PACKAGED-app smoke (Session 5).
//
// Launches the built (unpacked) SermonForge executable with SF_SMOKE=1 —
// main.js then proves, from inside the real packaged runtime, that:
//   • the application launches,
//   • the schema initializes or migrates (meta.schema_version readable),
//   • the preload loads (window.electronAPI exposed to the real renderer),
//   • the primary window renders,
//   • and the process exits cleanly (through the ordinary quit path).
// It prints `SF_SMOKE_RESULT ok=true …`; this script asserts that line AND
// exit code 0, inside a hard timeout so CI can never hang on a dead window.
//
// The smoke runs against an ISOLATED userData dir (--user-data-dir) so it
// never touches a real library and never trips the single-instance lock of a
// running install.
//
// Usage:
//   node scripts/packaged-smoke.cjs [path-to-unpacked-dir]
// Default dir: C:\Projects\SermonForgeBuilds\win-unpacked (the local
// `npm run build` output); CI passes its own release/win-unpacked.

"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const TIMEOUT_MS = 120_000;

const unpackedDir =
  process.argv[2] ||
  (process.platform === "win32"
    ? "C:\\Projects\\SermonForgeBuilds\\win-unpacked"
    : path.join(process.cwd(), "release", "win-unpacked"));

const exe = process.platform === "win32"
  ? path.join(unpackedDir, "SermonForge.exe")
  : path.join(unpackedDir, "SermonForge");

if (!fs.existsSync(exe)) {
  console.error(`[packaged-smoke] executable not found: ${exe}`);
  console.error("[packaged-smoke] build first (npm run build), or pass the unpacked dir as argv[2].");
  process.exit(2);
}

const smokeUserData = fs.mkdtempSync(path.join(os.tmpdir(), "sf-smoke-"));
console.log(`[packaged-smoke] launching ${exe}`);
console.log(`[packaged-smoke] isolated userData: ${smokeUserData}`);

const child = spawn(exe, [], {
  env: { ...process.env, SF_SMOKE: "1", SF_SMOKE_USERDATA: smokeUserData },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (d) => { output += d.toString(); process.stdout.write(d); });
child.stderr.on("data", (d) => { output += d.toString(); });

const killer = setTimeout(() => {
  console.error(`[packaged-smoke] TIMEOUT after ${TIMEOUT_MS}ms — killing`);
  child.kill("SIGKILL");
}, TIMEOUT_MS);

child.on("exit", (code) => {
  clearTimeout(killer);
  try { fs.rmSync(smokeUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* best effort */ }
  const line = output.split(/\r?\n/).find((l) => l.startsWith("SF_SMOKE_RESULT"));
  const ok = Boolean(line && /\bok=true\b/.test(line)) && code === 0;
  console.log(`[packaged-smoke] result line: ${line || "(none)"}`);
  console.log(`[packaged-smoke] exit code: ${code}`);
  console.log(ok ? "[packaged-smoke] PASS" : "[packaged-smoke] FAIL");
  process.exit(ok ? 0 : 1);
});
