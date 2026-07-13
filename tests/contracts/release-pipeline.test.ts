import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

// Session-5 Parts A + B — reproducible install and release gates, pinned at
// the source level (the workflows only execute on GitHub; what a local test
// CAN prove is that the committed pipeline has the required shape, that the
// release inputs are tracked, and that no secrets ride in the repo).
//
// HONEST SCOPE: this scans the workflow files; it does not run Actions. The
// gates themselves (npm ci / tests / smoke) are executed locally as part of
// the Session-5 verification commands and on the next tagged release.

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.resolve(ROOT, rel), "utf8");

describe("reproducible install (Part A)", () => {
  it("package.json declares the Node support policy (engines >=20)", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.engines?.node).toBe(">=20");
  });

  it("both workflows install IMMUTABLY (npm ci) — no silent lock healing via npm install", () => {
    for (const wf of [".github/workflows/test.yml", ".github/workflows/build.yml"]) {
      const src = read(wf);
      expect(src, `${wf} must use npm ci`).toMatch(/run:\s*npm ci/);
      expect(src, `${wf} must not use npm install`).not.toMatch(/run:\s*npm install\b/);
    }
  });

  it("the release inputs are git-TRACKED, not ambient: build/icon.ico + build/entitlements.mac.plist", () => {
    const tracked = execSync("git ls-files build/", { cwd: ROOT }).toString();
    expect(tracked).toMatch(/build\/icon\.ico/);
    expect(tracked).toMatch(/build\/entitlements\.mac\.plist/);
    // (macOS icon.icns is deterministically GENERATED in the workflow from the
    // tracked brand/icons/sermonforge.iconset — asserted below.)
    expect(read(".github/workflows/build.yml")).toContain("iconutil -c icns brand/icons/sermonforge.iconset");
    expect(fs.existsSync(path.resolve(ROOT, "brand/icons/sermonforge.iconset"))).toBe(true);
  });

  it("no .dev.vars secret file is tracked anywhere, and transport ignores it", () => {
    const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
    expect(tracked).not.toMatch(/\.dev\.vars/);
    expect(read("transport/.gitignore")).toMatch(/\.dev\.vars/);
  });

  it("no real worker tokens live in the repo (test fixtures use obvious placeholder values)", () => {
    // The admin token itself lives only in Worker secrets; the repo may name
    // the VARIABLE but never carry a real-looking assignment of it.
    const workerSrc = read("transport/worker.js");
    expect(workerSrc).not.toMatch(/ADMIN_TOKEN\s*=\s*["'][A-Za-z0-9+/]{16,}/);
    expect(workerSrc).not.toMatch(/INGEST_TOKEN\s*=\s*["']/);
  });
});

describe("release gates (Part B)", () => {
  const buildWf = read(".github/workflows/build.yml");

  it("a gates job runs tests, the persistence/migration suites, lint, spine integrity, and the Vite build on the tagged commit", () => {
    expect(buildWf).toMatch(/^\s{2}gates:/m);
    expect(buildWf).toMatch(/run:\s*npm test/);
    expect(buildWf).toMatch(/npx vitest run tests\/persistence\//);
    expect(buildWf).toMatch(/run:\s*npm run lint/);
    expect(buildWf).toMatch(/run:\s*npm run spine-integrity/);
    expect(buildWf).toMatch(/npx vite build/);
  });

  it("BOTH platform builds depend on the gates job — publishing cannot happen without it", () => {
    const needs = [...buildWf.matchAll(/needs:\s*gates/g)];
    expect(needs.length).toBe(2); // build-windows + build-macos
  });

  it("the Windows job packages with --publish never, runs the packaged smoke, and only then publishes", () => {
    const neverAt = buildWf.indexOf("--publish never");
    const smokeAt = buildWf.indexOf("node scripts/packaged-smoke.cjs");
    const alwaysAt = buildWf.indexOf("--publish always");
    expect(neverAt).toBeGreaterThan(-1);
    expect(smokeAt).toBeGreaterThan(neverAt);
    expect(alwaysAt).toBeGreaterThan(smokeAt);
  });

  it("the SF_SMOKE hook exists in main.js and the smoke script asserts its result line", () => {
    const mainSrc = read("electron/main.js");
    expect(mainSrc).toContain('process.env.SF_SMOKE === "1"');
    expect(mainSrc).toContain("SF_SMOKE_RESULT");
    const smoke = read("scripts/packaged-smoke.cjs");
    expect(smoke).toContain("SF_SMOKE_RESULT");
    expect(smoke).toMatch(/ok=true/);
  });
});
