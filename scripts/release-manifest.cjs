#!/usr/bin/env node
// scripts/release-manifest.cjs — the release completeness contract.
//
// Why this exists: until 2026-07-20 nothing anywhere proved a published
// release actually carried its artifacts. A green workflow certified an
// incomplete public release twice — v1.2.0 sat live for ~27 hours with zero
// macOS assets while CI showed all green, because electron-builder's GitHub
// publisher refuses to touch a release published more than two hours ago,
// logs "skipped publishing", and exits SUCCESS.
//
// The fix is not a hardcoded asset count. A count is the same bug in a new
// place: it was an ASSUMED six-asset manifest that let the missing macOS ZIP
// updater payload go unnoticed for four releases. This module DERIVES the
// expected artifact set from the packaging contract in package.json, so
// adding or removing a build target automatically moves the expectation and
// the check can never silently describe a stale release shape.
//
// Split deliberately into a pure core (deriveManifest / verifyManifest —
// exercised by tests/contracts/release-manifest.test.ts against fixtures)
// and a thin CLI that talks to GitHub. The logic that decides whether a
// release ships is testable without a release.
//
// Usage:
//   node scripts/release-manifest.cjs --tag v1.2.2                (verify a release)
//   node scripts/release-manifest.cjs --tag v1.2.2 --skip-hashes  (metadata only)
//   node scripts/release-manifest.cjs --print                     (show derived manifest)

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const yaml = require("js-yaml");

const TAG = "[release-manifest]";

// Only a plain vX.Y.Z tag may become a stable, latest release. Release
// candidates really do get pushed to this repo (v1.0.0-mac.rc.1 through
// rc.13), and the workflow's `v*` trigger plus releaseType:"release" would
// hand any one of them the `releases/latest` alias and auto-ship it to
// every Windows install.
const STABLE_TAG_RE = /^v(\d+)\.(\d+)\.(\d+)$/;

// electron-builder target name → the ${ext} it expands artifactName with.
// (Verified against app-builder-lib: dmg.js passes "dmg"; ArchiveTarget
// passes the format, i.e. "zip"; the NSIS target produces .exe.)
const EXT_BY_TARGET = { nsis: "exe", dmg: "dmg", zip: "zip" };

// Targets that additionally publish a sidecar .blockmap for differential
// updates. exe/dmg blockmaps are observed in every shipped release;
// the mac zip blockmap comes from ArchiveTarget's createBlockmap() call,
// which writes `${artifact}.blockmap` as its own published artifact.
const BLOCKMAP_TARGETS = new Set(["nsis", "dmg", "zip"]);

// Files that must NEVER be published. The v1.0.0 installer shipped a
// plaintext .env containing developer credentials to every user; these
// names are the shapes that leak.
const FORBIDDEN_ASSET_RE = /(^|[.\-/])(\.env|env\.local|.*\.p12|.*\.p8|.*\.pem|.*\.key|id_rsa|secrets?\.(json|ya?ml|txt))$/i;

function expandArtifactName(pattern, ext) {
  return String(pattern).replace(/\$\{ext\}/g, ext);
}

function targetsOf(platformConfig) {
  const raw = platformConfig?.target;
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw]).map((t) => (typeof t === "string" ? { target: t } : t));
}

// ── Pure core ──────────────────────────────────────────────────────────────

// Derives every artifact the packaging contract says a release must carry.
// Roles are meaningful, not decorative: "installer" is what a human
// downloads from the website, "updater-payload" is what electron-updater
// consumes. Conflating those two is exactly what broke macOS auto-update.
function deriveManifest(pkg) {
  const build = pkg?.build ?? {};
  const artifacts = [];

  const platforms = [
    { key: "win", config: build.win, feed: "latest.yml", updaterExt: "exe" },
    { key: "mac", config: build.mac, feed: "latest-mac.yml", updaterExt: "zip" },
  ];

  for (const platform of platforms) {
    const targets = targetsOf(platform.config);
    if (targets.length === 0) continue;

    for (const target of targets) {
      const ext = EXT_BY_TARGET[target.target];
      if (!ext) {
        throw new Error(`${TAG} unknown build target "${target.target}" for ${platform.key} — teach this module its extension before shipping it`);
      }
      const name = expandArtifactName(platform.config.artifactName, ext);
      artifacts.push({
        name,
        platform: platform.key,
        // On macOS the DMG is the human installer and the ZIP is the
        // updater's payload. On Windows the one NSIS exe is both.
        role: ext === platform.updaterExt
          ? (platform.key === "mac" ? "updater-payload" : "installer+updater-payload")
          : "installer",
        ext,
      });
      if (BLOCKMAP_TARGETS.has(target.target)) {
        artifacts.push({ name: `${name}.blockmap`, platform: platform.key, role: "blockmap", ext: "blockmap" });
      }
    }

    artifacts.push({ name: platform.feed, platform: platform.key, role: "feed", ext: "yml" });
  }

  const named = (platformKey, role) =>
    artifacts.find((a) => a.platform === platformKey && a.role.includes(role))?.name ?? null;

  return {
    artifacts,
    feeds: artifacts.filter((a) => a.role === "feed").map((a) => a.name),
    // The website hardcodes these two filenames in releases/latest/download
    // URLs. A rename ships fully green while every download button 404s.
    websiteInstallers: {
      win: artifacts.find((a) => a.platform === "win" && a.role.includes("installer"))?.name ?? null,
      mac: artifacts.find((a) => a.platform === "mac" && a.role === "installer")?.name ?? null,
    },
    updaterPayloads: {
      win: named("win", "updater-payload"),
      mac: named("mac", "updater-payload"),
    },
  };
}

// Verifies a real release against the derived contract. Pure: callers hand
// in the asset list and the already-read feed text, so this is fixture
// testable without a network or a release.
//
//   assets — [{ name, size }] as GitHub reports them
//   feedContents — { "latest.yml": "<yaml text>", ... }
//   hashes — optional { "<asset name>": "<base64 sha512>" } from real bytes
function verifyManifest({ pkg, tag, assets, feedContents = {}, hashes = null }) {
  const failures = [];
  const fail = (msg) => failures.push(msg);

  const manifest = deriveManifest(pkg);
  const byName = new Map();
  for (const asset of assets) {
    if (byName.has(asset.name)) fail(`duplicate asset published: ${asset.name}`);
    byName.set(asset.name, asset);
  }

  // 1. The tag must be a stable release tag.
  const tagMatch = STABLE_TAG_RE.exec(tag ?? "");
  if (!tagMatch) {
    fail(`tag "${tag}" is not a stable release tag (expected vX.Y.Z) — it must not become the latest release`);
  }
  const version = tagMatch ? tag.slice(1) : null;

  // 2. Nothing secret-bearing may ever be published.
  for (const asset of assets) {
    if (FORBIDDEN_ASSET_RE.test(asset.name)) {
      fail(`FORBIDDEN asset published (may carry credentials): ${asset.name}`);
    }
  }

  // 3. Every derived artifact must exist and be plausibly non-empty.
  for (const expected of manifest.artifacts) {
    const asset = byName.get(expected.name);
    if (!asset) {
      fail(`missing ${expected.role} for ${expected.platform}: ${expected.name}`);
      continue;
    }
    if (!(asset.size > 0)) {
      fail(`${expected.name} published with size ${asset.size} — a zero-byte asset is a failed upload`);
    }
  }

  // 4. Feeds must parse, name this tag's version, and agree with the bytes.
  for (const feedName of manifest.feeds) {
    const text = feedContents[feedName];
    if (text == null) {
      fail(`feed ${feedName} could not be read from the release`);
      continue;
    }
    let feed;
    try {
      feed = yaml.load(text);
    } catch (err) {
      fail(`feed ${feedName} is not valid YAML: ${err.message}`);
      continue;
    }
    if (version && feed?.version !== version) {
      fail(`feed ${feedName} advertises version ${feed?.version} but the tag is ${tag} — clients would be offered the wrong release`);
    }

    const files = Array.isArray(feed?.files) ? feed.files : [];
    if (files.length === 0) fail(`feed ${feedName} lists no files`);

    for (const entry of files) {
      const asset = byName.get(entry?.url);
      if (!asset) {
        fail(`feed ${feedName} points at ${entry?.url}, which is not published — the updater would 404`);
        continue;
      }
      if (entry.size != null && Number(entry.size) !== Number(asset.size)) {
        fail(`feed ${feedName}: ${entry.url} declares size ${entry.size} but the published asset is ${asset.size} — the feed is stale`);
      }
      if (!entry.sha512) {
        fail(`feed ${feedName}: ${entry.url} has no sha512 — integrity cannot be checked`);
      } else if (hashes && hashes[entry.url] && hashes[entry.url] !== entry.sha512) {
        fail(`feed ${feedName}: ${entry.url} sha512 does NOT match the published bytes — the feed describes a different artifact`);
      }
    }

    // The top-level `path` is what a client resolves first.
    if (feed?.path && !byName.has(feed.path)) {
      fail(`feed ${feedName} path "${feed.path}" is not a published asset`);
    }
  }

  // 5. The macOS updater payload contract. electron-updater's MacUpdater
  //    calls findFile(files, "zip", ["pkg","dmg"]) and throws
  //    ERR_UPDATER_ZIP_FILE_NOT_FOUND when no .zip is listed. Every feed
  //    published before 2026-07-20 was dmg-only, so no Mac could ever
  //    apply an update. This assertion is the regression guard.
  const macFeedText = feedContents["latest-mac.yml"];
  if (manifest.updaterPayloads.mac && macFeedText != null) {
    let macFeed = null;
    try {
      macFeed = yaml.load(macFeedText);
    } catch {
      /* already reported above */
    }
    const macFiles = Array.isArray(macFeed?.files) ? macFeed.files : [];
    const hasZip = macFiles.some((f) => String(f?.url ?? "").toLowerCase().endsWith(".zip"));
    if (!hasZip) {
      fail("latest-mac.yml lists no .zip — electron-updater cannot apply a macOS update (ERR_UPDATER_ZIP_FILE_NOT_FOUND)");
    }
  }

  // 6. The cross-repository website contract: the filenames the live
  //    download buttons hardcode must be the filenames we published.
  for (const [platformKey, installer] of Object.entries(manifest.websiteInstallers)) {
    if (installer && !byName.has(installer)) {
      fail(`website ${platformKey} download target ${installer} is not published — the live download button would 404`);
    }
  }

  return { ok: failures.length === 0, failures, manifest, version };
}

// ── CLI ────────────────────────────────────────────────────────────────────

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function sha512Base64(file) {
  const hash = crypto.createHash("sha512");
  hash.update(fs.readFileSync(file));
  return hash.digest("base64");
}

function main(argv) {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8"));

  if (argv.includes("--print")) {
    const manifest = deriveManifest(pkg);
    console.log(`${TAG} derived from the packaging contract — ${manifest.artifacts.length} artifacts expected:`);
    for (const a of manifest.artifacts) console.log(`${TAG}   ${a.name}  [${a.platform} ${a.role}]`);
    return 0;
  }

  const tagIndex = argv.indexOf("--tag");
  const tag = tagIndex >= 0 ? argv[tagIndex + 1] : process.env.GITHUB_REF_NAME;
  if (!tag) {
    console.error(`${TAG} usage: node scripts/release-manifest.cjs --tag vX.Y.Z [--skip-hashes]`);
    return 2;
  }
  const skipHashes = argv.includes("--skip-hashes");

  console.log(`${TAG} verifying release ${tag}`);
  const release = JSON.parse(gh(["release", "view", tag, "--json", "assets,isDraft,tagName"]));
  const assets = (release.assets ?? []).map((a) => ({ name: a.name, size: a.size }));
  console.log(`${TAG} release reports ${assets.length} asset(s); draft=${release.isDraft}`);

  const work = fs.mkdtempSync(path.join(os.tmpdir(), "sf-release-verify-"));
  const manifest = deriveManifest(pkg);

  // Feeds are tiny — always fetch and parse them.
  const feedContents = {};
  for (const feed of manifest.feeds) {
    if (!assets.some((a) => a.name === feed)) continue;
    try {
      gh(["release", "download", tag, "--pattern", feed, "--dir", work, "--clobber"]);
      feedContents[feed] = fs.readFileSync(path.join(work, feed), "utf8");
    } catch (err) {
      console.error(`${TAG} could not download feed ${feed}: ${err.message}`);
    }
  }

  // Hash the real bytes. Metadata agreement only proves the feed is
  // self-consistent; hashing proves the published artifact IS the artifact
  // the feed promises. This is the check that would have caught a
  // half-uploaded or re-built installer.
  let hashes = null;
  if (!skipHashes) {
    hashes = {};
    const payloads = new Set();
    for (const feedText of Object.values(feedContents)) {
      try {
        const feed = yaml.load(feedText);
        for (const entry of feed?.files ?? []) if (entry?.url) payloads.add(entry.url);
      } catch { /* reported by verifyManifest */ }
    }
    for (const name of payloads) {
      if (!assets.some((a) => a.name === name)) continue;
      console.log(`${TAG} downloading ${name} to verify its sha512…`);
      gh(["release", "download", tag, "--pattern", name, "--dir", work, "--clobber"]);
      hashes[name] = sha512Base64(path.join(work, name));
    }
  }

  const result = verifyManifest({ pkg, tag, assets, feedContents, hashes });

  fs.rmSync(work, { recursive: true, force: true });

  if (result.ok) {
    console.log(`${TAG} PASS — all ${result.manifest.artifacts.length} expected artifacts present, feeds agree with the published bytes${skipHashes ? " (hashes skipped)" : ""}`);
    return 0;
  }
  console.error(`${TAG} FAIL — ${result.failures.length} problem(s) with release ${tag}:`);
  for (const f of result.failures) console.error(`${TAG}   ${f}`);
  console.error(`${TAG} This release is NOT complete and must not be published.`);
  return 1;
}

module.exports = { deriveManifest, verifyManifest, STABLE_TAG_RE, FORBIDDEN_ASSET_RE };

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
