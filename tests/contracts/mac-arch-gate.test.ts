import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// scripts/mac-arch-gate.cjs — the control that makes the Intel boot-crash
// class unshippable.
//
// The gate only ever executes on a macOS runner, so before this file nothing
// exercised it at all: its failure paths were unproven, and the audit found
// it could pass silently on inputs it was supposed to reject. These fixtures
// are hand-built Mach-O headers, so the checks run on any platform.

const require_ = createRequire(import.meta.url);
const gate = require_(path.resolve(__dirname, "..", "..", "scripts", "mac-arch-gate.cjs"));

const CPU_X86_64 = 0x01000007;
const CPU_ARM64 = 0x0100000c;

// A thin 64-bit Mach-O: little-endian magic, then cputype.
function thinMachO(cputype: number): Buffer {
  const buf = Buffer.alloc(32);
  buf.writeUInt32LE(0xfeedfacf, 0);
  buf.writeUInt32LE(cputype, 4);
  return buf;
}

// A fat/universal binary: big-endian magic, slice count, then 20-byte
// fat_arch entries each starting with cputype.
function fatMachO(cputypes: number[]): Buffer {
  const buf = Buffer.alloc(8 + cputypes.length * 20);
  buf.writeUInt32BE(0xcafebabe, 0);
  buf.writeUInt32BE(cputypes.length, 4);
  cputypes.forEach((cpu, i) => buf.writeUInt32BE(cpu, 8 + i * 20));
  return buf;
}

const REQUIRED = "node_modules/better-sqlite3/build/Release/better_sqlite3.node";

let tmp: string;

function makeApp(opts: {
  x64Native?: Buffer | null;
  arm64Native?: Buffer | null;
  mainBinary?: Buffer | null;
  extra?: Array<{ half: "x64" | "arm64"; rel: string; bytes: Buffer }>;
  split?: boolean;
}) {
  const {
    x64Native = thinMachO(CPU_X86_64),
    arm64Native = thinMachO(CPU_ARM64),
    mainBinary = fatMachO([CPU_X86_64, CPU_ARM64]),
    extra = [],
    split = true,
  } = opts;

  const appPath = fs.mkdtempSync(path.join(tmp, "app-")) + path.sep + "SermonForge.app";
  const resources = path.join(appPath, "Contents", "Resources");
  fs.mkdirSync(path.join(appPath, "Contents", "MacOS"), { recursive: true });
  if (mainBinary) fs.writeFileSync(path.join(appPath, "Contents", "MacOS", "SermonForge"), mainBinary);

  if (split) {
    for (const [half, native] of [
      ["x64", x64Native],
      ["arm64", arm64Native],
    ] as const) {
      const root = path.join(resources, `app-${half}.asar.unpacked`);
      if (native) {
        const target = path.join(root, ...REQUIRED.split("/"));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, native);
      } else {
        fs.mkdirSync(root, { recursive: true });
      }
    }
  } else {
    fs.mkdirSync(resources, { recursive: true });
  }

  for (const e of extra) {
    const target = path.join(resources, `app-${e.half}.asar.unpacked`, ...e.rel.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, e.bytes);
  }
  return appPath;
}

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sf-archgate-"));
});
afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("machOInfo — architectures are read, not assumed", () => {
  it("reads thin binaries", () => {
    const f = path.join(tmp, "thin");
    fs.writeFileSync(f, thinMachO(CPU_ARM64));
    expect(gate.machOInfo(f)).toEqual({ fat: false, arches: ["arm64"] });
  });

  it("enumerates every slice of a fat binary rather than calling it 'universal'", () => {
    const f = path.join(tmp, "fat");
    fs.writeFileSync(f, fatMachO([CPU_X86_64, CPU_ARM64]));
    expect(gate.machOInfo(f)).toEqual({ fat: true, arches: ["x86_64", "arm64"] });
  });

  it("does not mistake a Java class file for a universal binary", () => {
    // 0xcafebabe is also Java class-file magic. The old 8-byte check would
    // have reported any such file as "universal" and passed it.
    const f = path.join(tmp, "Fake.class");
    const buf = Buffer.alloc(64);
    buf.writeUInt32BE(0xcafebabe, 0);
    buf.writeUInt32BE(0x00000034, 4); // Java major version, not a slice count
    fs.writeFileSync(f, buf);
    expect(gate.machOInfo(f)).toBeNull();
  });

  it("returns null for files that are not Mach-O at all", () => {
    const f = path.join(tmp, "readme.txt");
    fs.writeFileSync(f, "not a binary");
    expect(gate.machOInfo(f)).toBeNull();
  });
});

describe("checkApp — the assembled universal app", () => {
  it("PASSES a correctly built app", () => {
    const result = gate.checkApp(makeApp({}));
    expect(result.ran).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it("FAILS the exact defect that shipped: an arm64 binary in the Intel half", () => {
    // v1.0.0 through v1.2.0 shipped precisely this, and crashed at boot on
    // every Intel Mac.
    const result = gate.checkApp(makeApp({ x64Native: thinMachO(CPU_ARM64) }));
    expect(result.ran).toBe(true);
    expect(result.failures.join("\n")).toMatch(/app-x64\.asar\.unpacked: expected x86_64, found \[arm64\]/);
  });

  it("FAILS when the boot-critical module is missing from a half", () => {
    const result = gate.checkApp(makeApp({ arm64Native: null }));
    expect(result.failures.join("\n")).toMatch(/MISSING boot-critical module/);
  });

  it("FAILS a single-slice fat binary posing as universal", () => {
    // The lead the audit could not construct: FAT magic was previously
    // trusted without parsing slices, so a one-slice fat binary satisfied
    // both halves AND the universal main-executable check.
    const result = gate.checkApp(makeApp({ mainBinary: fatMachO([CPU_ARM64]) }));
    expect(result.failures.join("\n")).toMatch(/missing the x86_64 slice/);
  });

  it("FAILS a non-fat main executable", () => {
    const result = gate.checkApp(makeApp({ mainBinary: thinMachO(CPU_ARM64) }));
    expect(result.failures.join("\n")).toMatch(/expected a fat \(universal\) binary/);
  });

  it("FAILS a missing main executable", () => {
    const result = gate.checkApp(makeApp({ mainBinary: null }));
    expect(result.failures.join("\n")).toMatch(/main executable missing/);
  });

  it("accepts a fat native module that genuinely carries this half's architecture", () => {
    const result = gate.checkApp(makeApp({ x64Native: fatMachO([CPU_X86_64, CPU_ARM64]) }));
    expect(result.failures).toEqual([]);
  });

  it("REJECTS a fat native module that does not carry this half's architecture", () => {
    // Being fat is not enough — it must contain the arch this half runs.
    const result = gate.checkApp(makeApp({ x64Native: fatMachO([CPU_ARM64]) }));
    expect(result.failures.join("\n")).toMatch(/app-x64.*expected x86_64.*fat/s);
  });

  it("skips genuinely foreign-labelled multi-arch trees", () => {
    // onnxruntime ships darwin/arm64 alongside darwin/x64; the arm64 tree
    // inside the x64 half is runtime-selected, not a defect.
    const result = gate.checkApp(
      makeApp({ extra: [{ half: "x64", rel: "node_modules/onnxruntime-node/bin/napi-v3/darwin/arm64/lib.dylib", bytes: thinMachO(CPU_ARM64) }] })
    );
    expect(result.failures).toEqual([]);
  });

  it("REFUSES to take a foreign label on trust when the bytes disagree", () => {
    // The audit's open lead: the skip list trusted the path, so a
    // wrong-arch binary parked in an arch-named directory was never checked.
    const result = gate.checkApp(
      makeApp({ extra: [{ half: "x64", rel: "node_modules/onnxruntime-node/bin/napi-v3/darwin/arm64/lib.dylib", bytes: thinMachO(CPU_X86_64) }] })
    );
    expect(result.failures.join("\n")).toMatch(/path claims arm64 but the binary contains \[x86_64\]/);
  });

  it("reports ran=false for a per-arch temp pack — the legitimate skip", () => {
    // afterPack fires for the per-arch temps too. Making this fatal would
    // break every macOS build; CI proves the real check happened by
    // requiring the PASS marker instead.
    const result = gate.checkApp(makeApp({ split: false }));
    expect(result.ran).toBe(false);
    expect(result.failures).toEqual([]);
  });
});
