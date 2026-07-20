#!/usr/bin/env node
// scripts/mac-arch-gate.cjs — universal-Mac architecture gate (v1.2.1).
//
// Why this exists: every universal DMG through v1.2.0 shipped with an arm64
// better_sqlite3.node inside the *Intel* half (app-x64.asar.unpacked), so the
// app crashed at boot on every Intel Mac. Mechanism: electron-builder packages
// the x64 half by HARD-LINKING node_modules files into the app; the arm64
// pass then lets prebuild-install truncate-write the same inode
// (better_sqlite3.node keeps one filename across arches), silently rewriting
// the file inside the already-packaged x64 half. The build log looks clean —
// only the shipped bits are wrong. USE_HARD_LINKS=false (build.yml) removes
// the mechanism; this gate makes the class of defect unshippable.
//
// Wired as electron-builder's afterPack hook (package.json build.afterPack).
// afterPack fires for the per-arch temp packs and again for the assembled
// universal app, *before signing* (macPackager doPack, Arch.universal case);
// the gate asserts only on the assembled app — the invocation whose Resources
// contain BOTH app-x64.asar.unpacked and app-arm64.asar.unpacked — and no-ops
// everywhere else (win builds, per-arch temps).
//
// Asserts, per half:
//   • every Mach-O *.node / *.dylib matches the half's architecture
//     (fat/universal binaries pass; non-Mach-O files — linux/win binaries
//     inside multi-platform packages — are ignored; paths that name a
//     FOREIGN arch, e.g. onnxruntime's darwin/arm64 tree inside the x64
//     half, are runtime-selected multi-arch layouts and are skipped),
//   • better_sqlite3.node EXISTS and matches (the boot-critical module —
//     its absence must fail loud, never pass silent),
//   • Contents/MacOS/<app> is a fat binary carrying both architectures.
//
// Usage (CLI, for local verification of an extracted .app):
//   node scripts/mac-arch-gate.cjs <path-to-SermonForge.app | dir containing it>

"use strict";

const fs = require("fs");
const path = require("path");

const TAG = "[mac-arch-gate]";
const REQUIRED_NATIVE = "node_modules/better-sqlite3/build/Release/better_sqlite3.node";

const SLICES = [
  { dir: "app-x64.asar.unpacked", want: "x86_64", foreign: ["arm64"] },
  { dir: "app-arm64.asar.unpacked", want: "arm64", foreign: ["x64", "x86_64", "x86-64"] },
];

// Reads enough of a Mach-O header to classify the file.
// Returns "x86_64" | "arm64" | "universal" | "macho-other" | null (not Mach-O).
function machOArch(file) {
  const buf = Buffer.alloc(8);
  const fd = fs.openSync(file, "r");
  let n;
  try {
    n = fs.readSync(fd, buf, 0, 8, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (n < 8) return null;
  const be = buf.readUInt32BE(0);
  if (be === 0xcafebabe || be === 0xcafebabf) return "universal";
  const le = buf.readUInt32LE(0);
  if (le !== 0xfeedfacf && le !== 0xfeedface) return null;
  const cputype = buf.readUInt32LE(4);
  if (cputype === 0x01000007) return "x86_64";
  if (cputype === 0x0100000c) return "arm64";
  return "macho-other";
}

function* walkFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) yield* walkFiles(p);
    else if (entry.isFile()) yield p;
  }
}

// Core check. Returns { ran, failures } — ran=false means the app at appPath
// has no split asar halves (a per-arch temp pack, or not a universal build).
function checkApp(appPath) {
  const resources = path.join(appPath, "Contents", "Resources");
  if (!SLICES.every((s) => fs.existsSync(path.join(resources, s.dir)))) {
    return { ran: false, failures: [] };
  }

  const failures = [];

  for (const slice of SLICES) {
    const root = path.join(resources, slice.dir);
    let checked = 0;
    let skippedForeign = 0;

    for (const file of walkFiles(root)) {
      if (!/\.(node|dylib)$/i.test(file)) continue;
      const rel = path.relative(root, file).split(path.sep).join("/");
      if (slice.foreign.some((t) => rel.toLowerCase().includes(t))) {
        skippedForeign += 1;
        continue;
      }
      const arch = machOArch(file);
      if (arch === null) continue; // not Mach-O (linux/win binary in a multi-platform package)
      checked += 1;
      if (arch !== slice.want && arch !== "universal") {
        failures.push(`${slice.dir}: expected ${slice.want}, found ${arch} — ${rel}`);
      }
    }

    const required = path.join(root, ...REQUIRED_NATIVE.split("/"));
    if (!fs.existsSync(required)) {
      failures.push(`${slice.dir}: MISSING boot-critical module — ${REQUIRED_NATIVE}`);
    }

    console.log(`${TAG} ${slice.dir}: checked ${checked} Mach-O binaries (${skippedForeign} foreign-arch-labeled skipped)`);
  }

  const appName = path.basename(appPath, ".app");
  const mainBinary = path.join(appPath, "Contents", "MacOS", appName);
  if (!fs.existsSync(mainBinary)) {
    failures.push(`Contents/MacOS/${appName}: main executable missing`);
  } else if (machOArch(mainBinary) !== "universal") {
    failures.push(`Contents/MacOS/${appName}: expected a fat (universal) binary, found ${machOArch(mainBinary)}`);
  }

  return { ran: true, failures };
}

function report(appPath, { ran, failures }) {
  if (!ran) {
    console.log(`${TAG} skipping — no split asar halves at ${appPath} (not the assembled universal app)`);
    return true;
  }
  if (failures.length === 0) {
    console.log(`${TAG} PASS — both halves match their architecture; ${REQUIRED_NATIVE.split("/").pop()} present in both`);
    return true;
  }
  console.error(`${TAG} FAIL — ${failures.length} finding(s) in ${appPath}:`);
  for (const f of failures) console.error(`${TAG}   ${f}`);
  console.error(`${TAG} A wrong-arch Intel half crashes at boot on every Intel Mac (dlopen: incompatible architecture).`);
  return false;
}

function findApp(dir) {
  if (dir.endsWith(".app")) return dir;
  const apps = fs.readdirSync(dir).filter((n) => n.endsWith(".app"));
  return apps.length === 1 ? path.join(dir, apps[0]) : null;
}

// electron-builder afterPack hook.
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  const appPath = findApp(context.appOutDir);
  if (!appPath) return;
  if (!report(appPath, checkApp(appPath))) {
    throw new Error("mac-arch-gate: wrong-architecture native binaries in the universal app — see log above");
  }
};

// CLI: assert an already-built app (here a missing universal split is a failure,
// not a skip — the caller is explicitly claiming this app should be universal).
if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) {
    console.error(`${TAG} usage: node scripts/mac-arch-gate.cjs <path-to-.app | dir containing it>`);
    process.exit(2);
  }
  const appPath = findApp(path.resolve(arg));
  if (!appPath || !fs.existsSync(appPath)) {
    console.error(`${TAG} no .app bundle found at ${arg}`);
    process.exit(2);
  }
  const result = checkApp(appPath);
  if (!result.ran) {
    console.error(`${TAG} FAIL — ${appPath} has no app-x64/app-arm64 asar halves; expected an assembled universal app`);
    process.exit(1);
  }
  process.exit(report(appPath, result) ? 0 : 1);
}
