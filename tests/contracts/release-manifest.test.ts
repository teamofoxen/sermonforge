import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import * as path from "node:path";

// The release completeness contract (scripts/release-manifest.cjs).
//
// This is the check that decides whether a release becomes public, so its
// logic is tested against fixtures rather than only against a real release.
// The point of every case below is that the verifier must FAIL — a verifier
// that only ever passes is the green-workflow problem wearing a new hat.

const require_ = createRequire(import.meta.url);
const { deriveManifest, verifyManifest } = require_(
  path.resolve(__dirname, "..", "..", "scripts", "release-manifest.cjs")
);

// A packaging contract shaped like the real one.
const PKG = {
  build: {
    win: { target: [{ target: "nsis", arch: ["x64"] }], artifactName: "SermonForge-Setup.exe" },
    mac: {
      target: [
        { target: "dmg", arch: "universal" },
        { target: "zip", arch: "universal" },
      ],
      artifactName: "SermonForge-Setup.${ext}",
    },
  },
};

const SHA_EXE = "a".repeat(88);
const SHA_DMG = "b".repeat(88);
const SHA_ZIP = "c".repeat(88);

const SIZES: Record<string, number> = {
  "SermonForge-Setup.exe": 159_299_753,
  "SermonForge-Setup.exe.blockmap": 160_727,
  "SermonForge-Setup.dmg": 344_590_307,
  "SermonForge-Setup.dmg.blockmap": 360_288,
  "SermonForge-Setup.zip": 341_112_002,
  "SermonForge-Setup.zip.blockmap": 357_004,
  "latest.yml": 339,
  "latest-mac.yml": 512,
};

const goodAssets = () => Object.entries(SIZES).map(([name, size]) => ({ name, size }));

const winFeed = (version = "1.2.2") => `version: ${version}
files:
  - url: SermonForge-Setup.exe
    sha512: ${SHA_EXE}
    size: ${SIZES["SermonForge-Setup.exe"]}
path: SermonForge-Setup.exe
sha512: ${SHA_EXE}
releaseDate: '2026-07-21T10:00:00.000Z'
`;

const macFeed = (version = "1.2.2", { withZip = true } = {}) => `version: ${version}
files:
  - url: SermonForge-Setup.zip
    sha512: ${SHA_ZIP}
    size: ${SIZES["SermonForge-Setup.zip"]}
${withZip ? "" : "#"}  - url: SermonForge-Setup.dmg
    sha512: ${SHA_DMG}
    size: ${SIZES["SermonForge-Setup.dmg"]}
path: SermonForge-Setup.zip
sha512: ${SHA_ZIP}
releaseDate: '2026-07-21T10:02:00.000Z'
`;

// A macOS feed exactly as the pipeline published it for four releases:
// the DMG and nothing else.
const macFeedDmgOnly = (version = "1.2.2") => `version: ${version}
files:
  - url: SermonForge-Setup.dmg
    sha512: ${SHA_DMG}
    size: ${SIZES["SermonForge-Setup.dmg"]}
path: SermonForge-Setup.dmg
sha512: ${SHA_DMG}
releaseDate: '2026-07-21T10:02:00.000Z'
`;

const goodFeeds = () => ({ "latest.yml": winFeed(), "latest-mac.yml": macFeed() });
const goodHashes = () => ({
  "SermonForge-Setup.exe": SHA_EXE,
  "SermonForge-Setup.zip": SHA_ZIP,
  "SermonForge-Setup.dmg": SHA_DMG,
});

const verify = (over: Record<string, unknown> = {}) =>
  verifyManifest({
    pkg: PKG,
    tag: "v1.2.2",
    assets: goodAssets(),
    feedContents: goodFeeds(),
    hashes: goodHashes(),
    ...over,
  });

const failedOn = (result: { failures: string[] }, pattern: RegExp) =>
  result.failures.some((f) => pattern.test(f));

describe("deriveManifest — the expectation comes from the packaging contract", () => {
  it("derives every artifact, including both macOS outputs and both feeds", () => {
    const names = deriveManifest(PKG).artifacts.map((a: { name: string }) => a.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "SermonForge-Setup.exe",
        "SermonForge-Setup.exe.blockmap",
        "latest.yml",
        "SermonForge-Setup.dmg",
        "SermonForge-Setup.dmg.blockmap",
        "SermonForge-Setup.zip",
        "SermonForge-Setup.zip.blockmap",
        "latest-mac.yml",
      ])
    );
  });

  it("distinguishes the human installer from the updater payload", () => {
    // Conflating these is the whole of C1: the DMG is what a pastor
    // downloads, the ZIP is what electron-updater can actually apply.
    const m = deriveManifest(PKG);
    expect(m.websiteInstallers.mac).toBe("SermonForge-Setup.dmg");
    expect(m.updaterPayloads.mac).toBe("SermonForge-Setup.zip");
    expect(m.websiteInstallers.win).toBe("SermonForge-Setup.exe");
  });

  it("tracks the contract rather than a hardcoded count — dropping a target moves the expectation", () => {
    // This is the property that stops the manifest from going stale the way
    // the assumed six-asset list did.
    const noZip = { build: { ...PKG.build, mac: { ...PKG.build.mac, target: [{ target: "dmg", arch: "universal" }] } } };
    const names = deriveManifest(noZip).artifacts.map((a: { name: string }) => a.name);
    expect(names).not.toContain("SermonForge-Setup.zip");
    expect(deriveManifest(noZip).updaterPayloads.mac).toBeNull();
  });

  it("refuses to guess at a build target it has never been taught", () => {
    const weird = { build: { mac: { target: [{ target: "pkg" }], artifactName: "X.${ext}" } } };
    expect(() => deriveManifest(weird)).toThrow(/unknown build target/);
  });
});

describe("verifyManifest — a complete release passes", () => {
  it("accepts a release carrying every derived artifact with agreeing feeds", () => {
    const result = verify();
    expect(result.failures).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("verifyManifest — the failures that must never ship", () => {
  it("REJECTS the macOS-update defect: a dmg-only feed with no ZIP payload", () => {
    // The exact shape of every release from v1.0.0 through v1.2.1.
    const assets = goodAssets().filter((a) => !a.name.startsWith("SermonForge-Setup.zip"));
    const result = verify({
      assets,
      feedContents: { "latest.yml": winFeed(), "latest-mac.yml": macFeedDmgOnly() },
      hashes: { "SermonForge-Setup.exe": SHA_EXE, "SermonForge-Setup.dmg": SHA_DMG },
    });
    expect(result.ok).toBe(false);
    expect(failedOn(result, /missing updater-payload for mac/)).toBe(true);
    expect(failedOn(result, /ERR_UPDATER_ZIP_FILE_NOT_FOUND/)).toBe(true);
  });

  it("REJECTS a release missing a whole platform (the green-skip incident)", () => {
    // v1.2.0 sat live ~27 hours with zero macOS assets while CI was green.
    const winOnly = goodAssets().filter((a) => a.name.includes(".exe") || a.name === "latest.yml");
    const result = verify({ assets: winOnly, feedContents: { "latest.yml": winFeed() }, hashes: null });
    expect(result.ok).toBe(false);
    expect(failedOn(result, /SermonForge-Setup\.dmg/)).toBe(true);
    expect(failedOn(result, /latest-mac\.yml/)).toBe(true);
  });

  it("REJECTS a zero-byte asset (a failed upload that still created the asset)", () => {
    const assets = goodAssets().map((a) => (a.name === "SermonForge-Setup.dmg" ? { ...a, size: 0 } : a));
    const result = verify({ assets });
    expect(failedOn(result, /size 0 — a zero-byte asset is a failed upload/)).toBe(true);
  });

  it("REJECTS a feed advertising a different version than the tag", () => {
    const result = verify({ feedContents: { "latest.yml": winFeed("1.2.1"), "latest-mac.yml": macFeed() } });
    expect(failedOn(result, /advertises version 1\.2\.1 but the tag is v1\.2\.2/)).toBe(true);
  });

  it("REJECTS a stale feed whose declared size disagrees with the published asset", () => {
    const assets = goodAssets().map((a) => (a.name === "SermonForge-Setup.exe" ? { ...a, size: 12345 } : a));
    const result = verify({ assets });
    expect(failedOn(result, /declares size .* but the published asset is 12345 — the feed is stale/)).toBe(true);
  });

  it("REJECTS a feed whose sha512 does not match the real published bytes", () => {
    // Metadata self-consistency is not enough: this is the check that
    // catches a re-built or half-uploaded artifact.
    const result = verify({ hashes: { ...goodHashes(), "SermonForge-Setup.zip": "d".repeat(88) } });
    expect(failedOn(result, /sha512 does NOT match the published bytes/)).toBe(true);
  });

  it("REJECTS a feed pointing at a file that was never published", () => {
    const assets = goodAssets().filter((a) => a.name !== "SermonForge-Setup.zip");
    const result = verify({ assets, hashes: null });
    expect(failedOn(result, /points at SermonForge-Setup\.zip, which is not published/)).toBe(true);
  });

  it("REJECTS a non-stable tag becoming a release", () => {
    for (const tag of ["v1.2.2-rc.1", "v1.2", "1.2.2", "v1.2.2.1", "v1.0.0-mac.rc.13"]) {
      const result = verify({ tag });
      expect(failedOn(result, /is not a stable release tag/), `${tag} must be rejected`).toBe(true);
    }
  });

  it("REJECTS any credential-bearing file riding along in the release", () => {
    // v1.0.0's installer shipped a plaintext .env with a GitHub PAT.
    for (const name of [".env", "secrets.json", "AuthKey.p8", "cert.p12", "server.pem"]) {
      const result = verify({ assets: [...goodAssets(), { name, size: 116 }] });
      expect(failedOn(result, /FORBIDDEN asset published/), `${name} must be rejected`).toBe(true);
    }
  });

  it("REJECTS duplicate assets, which make it ambiguous what a user downloads", () => {
    const result = verify({ assets: [...goodAssets(), { name: "SermonForge-Setup.dmg", size: 1 }] });
    expect(failedOn(result, /duplicate asset published/)).toBe(true);
  });

  it("REJECTS a malformed feed instead of silently treating it as empty", () => {
    const result = verify({ feedContents: { "latest.yml": "version: [1.2.2\n  files: ::::", "latest-mac.yml": macFeed() } });
    expect(result.ok).toBe(false);
  });
});
