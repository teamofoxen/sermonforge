import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import yaml from "js-yaml";

// Session-5 Parts A + B — reproducible install and release gates, pinned at
// the source level (the workflows only execute on GitHub; what a local test
// CAN prove is that the committed pipeline has the required shape, that the
// release inputs are tracked, and that no secrets ride in the repo).
//
// HONEST SCOPE: this scans the workflow files; it does not run Actions. The
// gates themselves (npm ci / tests / smoke) are executed locally as part of
// the Session-5 verification commands and on the next tagged release.
//
// 2026-07-20 rework. The previous version of this file asserted step ORDER
// with whole-file `indexOf`, which aliased across jobs: deleting the entire
// Windows publish step left the macOS job's `--publish always` satisfying
// the assertion, so every test passed while no Windows installer shipped.
// Everything below parses build.yml and asserts against a NAMED JOB's step
// list, so an assertion about the Windows job can only ever be satisfied by
// the Windows job.

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.resolve(ROOT, rel), "utf8");

type Step = { name?: string; uses?: string; run?: string; if?: string; with?: Record<string, unknown>; env?: Record<string, string> };
type Job = { needs?: string | string[]; if?: string; steps: Step[]; outputs?: Record<string, string>; "runs-on"?: string; strategy?: { matrix?: { include?: Array<Record<string, string>> } } };
type Workflow = { on: Record<string, unknown>; jobs: Record<string, Job> };

const buildWf = yaml.load(read(".github/workflows/build.yml")) as Workflow;
const testWf = yaml.load(read(".github/workflows/test.yml")) as Workflow;
const pkg = JSON.parse(read("package.json"));

const job = (name: string): Job => {
  const j = buildWf.jobs[name];
  if (!j) throw new Error(`build.yml has no job "${name}"`);
  return j;
};
const stepText = (s: Step) => `${s.name ?? ""}\n${s.uses ?? ""}\n${s.run ?? ""}`;
const indexOfStep = (j: Job, needle: string | RegExp) =>
  j.steps.findIndex((s) => (typeof needle === "string" ? stepText(s).includes(needle) : needle.test(stepText(s))));
const needsOf = (j: Job) => (Array.isArray(j.needs) ? j.needs : j.needs ? [j.needs] : []);

describe("reproducible install (Part A)", () => {
  it("package.json declares the Node support policy the pipeline actually requires", () => {
    // >=24, not >=20: npm 10 (the npm that ships with Node 20/22) cannot
    // install this lockfile at all — `npm ci` fails with a missing-from-lock
    // error. A policy that claims Node 20 works is a policy that sends a new
    // contributor into an install failure.
    expect(pkg.engines?.node).toBe(">=24");
  });

  it("every CI Node pin matches the declared policy, and README tells the truth about it", () => {
    const pins: number[] = [];
    for (const wf of [buildWf, testWf]) {
      for (const j of Object.values(wf.jobs)) {
        for (const s of j.steps ?? []) {
          if (s.uses?.startsWith("actions/setup-node")) pins.push(Number(s.with?.["node-version"]));
        }
      }
    }
    expect(pins.length).toBeGreaterThan(0);
    for (const pin of pins) expect(pin).toBe(24);

    const readme = read("README.md");
    expect(readme, "README must state the Node 24 line CI actually pins").toMatch(/Node 24/);
    expect(readme, "README must not still claim the Node 20 LTS line").not.toMatch(/Node 20 LTS/);
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
  it("a gates job runs tests, the persistence/migration suites, lint, spine integrity, and the Vite build on the tagged commit", () => {
    const gates = job("gates");
    const all = gates.steps.map(stepText).join("\n");
    expect(all).toMatch(/npm test/);
    expect(all).toMatch(/npx vitest run tests\/persistence\//);
    expect(all).toMatch(/npm run lint/);
    expect(all).toMatch(/npm run spine-integrity/);
    expect(all).toMatch(/npx vite build/);
  });

  it("only a stable vX.Y.Z tag can produce a release", () => {
    // `on: push: tags: v*` matches release candidates too, and this repo has
    // really pushed them (v1.0.0-mac.rc.1 … rc.13). Without this gate any of
    // them would take the releases/latest alias and auto-ship to every install.
    const gates = job("gates");
    const guard = gates.steps.find((s) => /grep -Eq .\^v\[0-9\]/.test(s.run ?? ""));
    expect(guard, "the gates job must reject non-vX.Y.Z tags").toBeDefined();
    expect(guard!.run).toMatch(/exit 1/);
  });

  it("BOTH platform builds depend on the gates job", () => {
    expect(needsOf(job("build-windows"))).toContain("gates");
    expect(needsOf(job("build-macos"))).toContain("gates");
  });

  it("publishing is wired to a gates OUTPUT, so removing `needs: gates` breaks publishing rather than just an assertion", () => {
    // The old assertion counted `needs: gates` occurrences — but it ran
    // INSIDE the gates job, and test.yml never fires on tags, so nothing
    // outside the gate protected the gate. Consuming a gates output means a
    // missing `needs:` makes the expression unresolvable at publish time.
    expect(job("gates").outputs?.release_ok).toBeTruthy();
    for (const name of ["build-windows", "build-macos"]) {
      const publish = job(name).steps.find((s) => /--publish always/.test(s.run ?? ""));
      expect(publish, `${name} must have a publish step`).toBeDefined();
      expect(publish!.if, `${name} publish must depend on the gates output`).toMatch(/needs\.gates\.outputs\.release_ok/);
    }
  });

  it("the Windows job packages with --publish never, smokes THAT build, and publishes the smoked directory", () => {
    const win = job("build-windows");
    const packageAt = indexOfStep(win, "--publish never");
    const smokeAt = indexOfStep(win, "scripts/packaged-smoke.cjs");
    const publishAt = indexOfStep(win, "--publish always");
    expect(packageAt).toBeGreaterThan(-1);
    expect(smokeAt).toBeGreaterThan(packageAt);
    expect(publishAt).toBeGreaterThan(smokeAt);

    // Provenance: the published installer must be built from the exact
    // directory the smoke exercised, not repacked from scratch afterwards.
    const publishStep = win.steps[publishAt];
    expect(publishStep.run).toMatch(/--prepackaged\s+release\/win-unpacked/);
    expect(win.steps[smokeAt].run).toMatch(/release\/win-unpacked/);
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

describe("macOS architecture controls (the Intel boot-crash class)", () => {
  const mac = job("build-macos");

  it("the packaging steps disable hard links — the mechanism behind the corruption", () => {
    const packSteps = mac.steps.filter((s) => /electron-builder --mac/.test(s.run ?? ""));
    expect(packSteps.length).toBeGreaterThan(0);
    for (const s of packSteps) {
      expect(s.env?.USE_HARD_LINKS, `"${s.name}" must set USE_HARD_LINKS=false`).toBe("false");
    }
  });

  it("the arch gate is wired as afterPack and the universal split it depends on is preserved", () => {
    // afterPack is the composite pre-publish guard: credential scan on every
    // platform, then the architecture gate on macOS. electron-builder allows
    // only one hook, and on macOS pack→sign→notarize→publish is a single
    // invocation, so this is the last place a bad build can be refused.
    expect(pkg.build?.afterPack).toBe("./scripts/after-pack.cjs");
    const afterPack = read("scripts/after-pack.cjs");
    expect(afterPack).toMatch(/mac-arch-gate/);
    expect(afterPack).toMatch(/check-packaged-secrets/);
    expect(fs.existsSync(path.resolve(ROOT, "scripts/mac-arch-gate.cjs"))).toBe(true);
    expect(fs.existsSync(path.resolve(ROOT, "scripts/check-packaged-secrets.cjs"))).toBe(true);
    // mergeASARs:false is what produces the two app-*.asar.unpacked halves
    // the gate inspects; app-builder-lib defaults it to true. Flipping it, or
    // changing arch away from universal, turns the gate into a permanent
    // silent skip.
    expect(pkg.build?.mac?.mergeASARs).toBe(false);
    for (const t of pkg.build?.mac?.target ?? []) expect(t.arch).toBe("universal");
  });

  it("the packaged macOS app is LAUNCHED on both architectures, Intel included", () => {
    // The arch gate is a static header check; it cannot prove the app
    // starts. v1.0.0–v1.2.0 shipped signed, notarized DMGs that crashed at
    // launch on every Intel Mac, found by a field report 74 days later,
    // because nothing in the pipeline had ever run the macOS build.
    const smoke = job("smoke-macos");
    const runners = (smoke.strategy?.matrix?.include ?? []).map((e: { runner: string }) => e.runner);
    // macos-latest is arm64 per actions/runner-images; Intel needs its own
    // label. A matrix of one architecture would silently retest arm64 twice.
    expect(runners, "the Intel half is the one that shipped broken").toContain("macos-15-intel");
    expect(runners.length).toBeGreaterThan(1);
    expect(smoke.steps.some((s) => /packaged-smoke\.cjs/.test(s.run ?? ""))).toBe(true);
  });

  it("the macOS smoke does not override the target list, which would destroy the universal split", () => {
    // Passing a bare `--config.mac.target=<x>` REPLACES the package.json
    // target array and takes `arch: universal` with it, so only the host
    // architecture gets built. There would then be no app-x64/app-arm64 asar
    // split, the arch gate would correctly report "skipping" rather than
    // PASS, and the marker check would fail on EVERY run — blocking every
    // release, since finalize-release needs this job. Caught before it ever
    // ran; this keeps it from coming back.
    for (const s of job("smoke-macos").steps) {
      expect(s.run ?? "", `"${s.name}" must not override mac.target`).not.toMatch(/--config\.mac\.target/);
    }
  });

  it("the macOS runtime smoke cannot publish, and a failure keeps the release private", () => {
    const smoke = job("smoke-macos");
    for (const s of smoke.steps) {
      expect(s.run ?? "", "the runtime smoke must never publish").not.toMatch(/--publish always/);
    }
    // Draft-first makes this composable: if the app does not start, the
    // finalizer never runs and the release stays an unpublished draft.
    expect(needsOf(job("finalize-release"))).toContain("smoke-macos");
  });

  it("CI requires the gate to have actually reported PASS — silence is not evidence", () => {
    const check = mac.steps.find((s) => /mac-arch-gate\\?\] PASS/.test(s.run ?? ""));
    expect(check, "build-macos must assert the [mac-arch-gate] PASS marker appeared").toBeDefined();
    expect(check!.run).toMatch(/exit 1/);
    // The marker only means anything if the build output was captured.
    const packSteps = mac.steps.filter((s) => /electron-builder --mac/.test(s.run ?? ""));
    for (const s of packSteps) expect(s.run).toMatch(/tee mac-build\.log/);
  });
});

describe("the updater activation stamp (the double gate)", () => {
  it("both platform jobs stamp the stable release channel", () => {
    for (const name of ["build-windows", "build-macos"]) {
      const stamp = job(name).steps.find((s) => /npm pkg set sfReleaseChannel=stable/.test(s.run ?? ""));
      expect(stamp, `${name} must stamp sfReleaseChannel`).toBeDefined();
      // A validation run must NOT be stampable, or something unsigned and
      // unpublished could still auto-update. The guard may sit on the step
      // or on the whole job — build-macos is tag-only outright.
      const guarded = /refs\/tags\/v/.test(stamp!.if ?? "") || /refs\/tags\/v/.test(job(name).if ?? "");
      expect(guarded, `${name} must not stamp a non-tag run`).toBe(true);
    }
  });

  it("the TRACKED package.json carries no stamp — a committed one re-arms the local-build self-downgrade", () => {
    expect(pkg.sfReleaseChannel).toBeUndefined();
  });

  it("the updater refuses to run without both gates, and stays out of the smoke", () => {
    const updater = read("electron/updater.js");
    expect(updater).toMatch(/sfReleaseChannel === "stable"/);
    expect(updater).toMatch(/if \(!isPackaged\) return;/);
    // The release gate must not depend on GitHub being reachable.
    expect(updater).toMatch(/SF_SMOKE/);
  });
});

describe("release identity and the cross-repository filename contract", () => {
  it("the load-bearing identity constants are pinned", () => {
    // An owner/repo edit strands every installed base on a dead feed; an
    // appId edit forks install identity. Both ship green without this.
    expect(pkg.build?.appId).toBe("com.sermonforge.app");
    expect(pkg.build?.publish?.provider).toBe("github");
    expect(pkg.build?.publish?.owner).toBe("teamofoxen");
    expect(pkg.build?.publish?.repo).toBe("sermonforge");
  });

  it("releases are created as DRAFTS — nothing is public until the finalizer says so", () => {
    expect(pkg.build?.publish?.releaseType).toBe("draft");
  });

  it("the artifact names the website hardcodes are the names we build", () => {
    expect(pkg.build?.win?.artifactName).toBe("SermonForge-Setup.exe");
    // ${ext} keeps the DMG name byte-identical while giving the ZIP its own.
    expect(pkg.build?.mac?.artifactName).toBe("SermonForge-Setup.${ext}");
  });

  it("macOS builds BOTH the human installer and the updater payload", () => {
    // electron-updater's MacUpdater requires a .zip and explicitly excludes
    // dmg. Shipping dmg-only means macOS can never apply an update — which
    // is exactly what every release from v1.0.0 to v1.2.1 did.
    const targets = (pkg.build?.mac?.target ?? []).map((t: { target: string }) => t.target);
    expect(targets, "the DMG is the website installer").toContain("dmg");
    expect(targets, "the ZIP is the updater payload").toContain("zip");
  });

  it("no secret-bearing file can ride along in the packaged app", () => {
    // The v1.0.0 installer shipped a plaintext .env with developer
    // credentials to every user who downloaded it.
    const serialized = JSON.stringify(pkg.build);
    expect(serialized).not.toMatch(/"\.env"/);
    expect(serialized).not.toMatch(/\.p12|\.p8|\.pem/);
    for (const entry of pkg.build?.extraResources ?? []) {
      const from = typeof entry === "string" ? entry : entry.from;
      expect(from, "extraResources must never ship a dotfile/secret").not.toMatch(/^\.|\.env/);
    }
  });
});

describe("publication integrity — nothing goes public unverified", () => {
  it("a finalizer job depends on BOTH platform builds", () => {
    const fin = job("finalize-release");
    expect(needsOf(fin)).toEqual(expect.arrayContaining(["build-windows", "build-macos"]));
  });

  it("the finalizer verifies the derived manifest BEFORE it publishes", () => {
    const fin = job("finalize-release");
    const verifyAt = indexOfStep(fin, "scripts/release-manifest.cjs");
    const publishAt = indexOfStep(fin, "--draft=false");
    expect(verifyAt, "the finalizer must run the manifest verifier").toBeGreaterThan(-1);
    expect(publishAt, "the finalizer must flip the release public").toBeGreaterThan(-1);
    expect(publishAt).toBeGreaterThan(verifyAt);
  });

  it("flipping a release public happens in exactly ONE place in the whole pipeline", () => {
    const flips: string[] = [];
    for (const [jobName, j] of Object.entries(buildWf.jobs)) {
      for (const s of j.steps ?? []) {
        if (/--draft=false|--draft false/.test(s.run ?? "")) flips.push(jobName);
      }
    }
    expect(flips).toEqual(["finalize-release"]);
  });

  it("a validation (workflow_dispatch) run is STRUCTURALLY unable to publish", () => {
    // Not "we remembered to skip it" — every step that could create, upload
    // to, or expose a release is guarded on the ref being a version tag, and
    // the finalizer job itself is too.
    expect(buildWf.on).toHaveProperty("workflow_dispatch");
    expect(job("finalize-release").if).toMatch(/refs\/tags\/v/);

    for (const [jobName, j] of Object.entries(buildWf.jobs)) {
      for (const s of j.steps ?? []) {
        const text = s.run ?? "";
        const publishes = /--publish always|--draft=false|gh release (edit|create|upload)/.test(text);
        if (!publishes) continue;
        const guarded = /refs\/tags\/v/.test(s.if ?? "") || /refs\/tags\/v/.test(j.if ?? "");
        expect(guarded, `${jobName} → "${s.name}" can publish without a tag guard`).toBe(true);
      }
    }
  });

  it("the finalizer confirms the public download URLs actually resolve", () => {
    const fin = job("finalize-release");
    const check = fin.steps.find((s) => /releases\/latest\/download/.test(s.run ?? ""));
    expect(check, "the finalizer must verify the live download URLs").toBeDefined();
    expect(check!.run).toMatch(/SermonForge-Setup\.dmg/);
    expect(check!.run).toMatch(/SermonForge-Setup\.zip/);
  });
});
