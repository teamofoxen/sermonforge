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

const CPU_X86_64 = 0x01000007;
const CPU_ARM64 = 0x0100000c;

function archName(cputype) {
  if (cputype === CPU_X86_64) return "x86_64";
  if (cputype === CPU_ARM64) return "arm64";
  return `macho-other(0x${cputype.toString(16)})`;
}

// Reads a Mach-O header and reports WHICH architectures the file actually
// contains. Returns null for non-Mach-O files.
//
//   { fat: false, arches: ["arm64"] }
//   { fat: true,  arches: ["x86_64", "arm64"] }
//
// Fat headers are parsed rather than trusted. The previous version treated
// any file starting with FAT magic as "universal" and passed it everywhere,
// so a fat binary carrying only ONE slice satisfied both halves and the
// universal main-executable check — the very thing this gate exists to
// disprove. Fat headers are big-endian; the 64-bit variant (0xcafebabf) has
// 32-byte entries with 64-bit offsets, the 32-bit variant 20-byte entries.
function machOInfo(file) {
  const head = Buffer.alloc(8);
  const fd = fs.openSync(file, "r");
  try {
    if (fs.readSync(fd, head, 0, 8, 0) < 8) return null;

    const magicBE = head.readUInt32BE(0);
    const isFat32 = magicBE === 0xcafebabe;
    const isFat64 = magicBE === 0xcafebabf;

    if (isFat32 || isFat64) {
      const count = head.readUInt32BE(4);
      // A plausibility bound: real universal binaries carry a handful of
      // slices. A wild count means this is not actually a fat Mach-O
      // (0xcafebabe is also Java class-file magic).
      if (count === 0 || count > 16) return null;
      const entrySize = isFat64 ? 32 : 20;
      const table = Buffer.alloc(count * entrySize);
      if (fs.readSync(fd, table, 0, table.length, 8) < table.length) return null;
      const arches = [];
      for (let i = 0; i < count; i += 1) {
        arches.push(archName(table.readUInt32BE(i * entrySize)));
      }
      return { fat: true, arches };
    }

    const magicLE = head.readUInt32LE(0);
    if (magicLE !== 0xfeedfacf && magicLE !== 0xfeedface) return null;
    return { fat: false, arches: [archName(head.readUInt32LE(4))] };
  } finally {
    fs.closeSync(fd);
  }
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
      const info = machOInfo(file);
      if (info === null) continue; // not Mach-O (linux/win binary in a multi-platform package)

      // Paths naming a FOREIGN arch (e.g. onnxruntime's darwin/arm64 tree
      // inside the x64 half) are runtime-selected multi-arch layouts, so
      // they are not required to match this half. They are no longer taken
      // purely on the word of the path, though: a binary whose bytes do not
      // match the architecture its own path advertises is mislabelled, and
      // a mislabelled binary is how a wrong-arch file hides from this gate.
      const foreignLabel = slice.foreign.find((t) => rel.toLowerCase().includes(t));
      if (foreignLabel) {
        skippedForeign += 1;
        const claims = foreignLabel === "arm64" ? "arm64" : "x86_64";
        if (!info.arches.includes(claims)) {
          failures.push(
            `${slice.dir}: path claims ${claims} but the binary contains [${info.arches.join(", ")}] — ${rel}`
          );
        }
        continue;
      }

      checked += 1;
      // A fat binary satisfies this half only if it actually CARRIES this
      // half's architecture — not merely because it is fat.
      if (!info.arches.includes(slice.want)) {
        failures.push(
          `${slice.dir}: expected ${slice.want}, found [${info.arches.join(", ")}]${info.fat ? " (fat)" : ""} — ${rel}`
        );
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
  } else {
    const info = machOInfo(mainBinary);
    if (!info) {
      failures.push(`Contents/MacOS/${appName}: not a Mach-O binary`);
    } else if (!info.fat) {
      failures.push(`Contents/MacOS/${appName}: expected a fat (universal) binary, found ${info.arches.join(", ")}`);
    } else {
      // "Fat" is not "universal". Both slices must actually be present, or
      // one architecture launches nothing.
      for (const want of ["x86_64", "arm64"]) {
        if (!info.arches.includes(want)) {
          failures.push(
            `Contents/MacOS/${appName}: fat binary is missing the ${want} slice — carries [${info.arches.join(", ")}]`
          );
        }
      }
    }
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
  // A darwin pack that produced no single .app bundle is not a "nothing to
  // check" case — it means the gate cannot see what is about to be signed.
  // This used to `return` with no log line at all, so the one condition
  // that blinds the gate completely was also its quietest.
  if (!appPath) {
    const found = fs.existsSync(context.appOutDir)
      ? fs.readdirSync(context.appOutDir).filter((n) => n.endsWith(".app"))
      : [];
    console.error(`${TAG} FAIL — expected exactly one .app in ${context.appOutDir}, found ${found.length}: ${found.join(", ") || "(none)"}`);
    throw new Error("mac-arch-gate: cannot locate the packaged app to verify — refusing to sign an unverified build");
  }
  if (!report(appPath, checkApp(appPath))) {
    throw new Error("mac-arch-gate: wrong-architecture native binaries in the universal app — see log above");
  }
};

// Internals exposed for tests/contracts/mac-arch-gate.test.ts, attached to
// the exported hook so electron-builder still receives a callable afterPack.
// The gate only runs on macOS CI, so fixture tests are the one way its
// failure paths get exercised at all before a release depends on them.
module.exports.checkApp = checkApp;
module.exports.machOInfo = machOInfo;

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
