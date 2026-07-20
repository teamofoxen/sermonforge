#!/usr/bin/env node
// scripts/check-packaged-secrets.cjs — refuse to publish an installer that
// carries credentials.
//
// Why this exists: the v1.0.0 installer shipped `resources/.env` containing
// the developer's plaintext credentials — a GitHub PAT among them — to every
// person who downloaded it, and that artifact is still publicly downloadable.
// The cause was one line of packaging config (`extraResources` included
// `.env`) plus a workflow step that wrote secrets into `.env` before
// packaging. Both are gone, and a contract test now asserts the config never
// regains them — but a config test cannot see what actually ended up inside
// the built app. This inspects the real packaged output.
//
// Reports PATHS and FILENAMES only. It never opens, prints, or logs the
// contents of anything it finds: a guard that echoes the secret it caught
// has published it to the CI log.
//
// Scope: deliberately skips node_modules. The leak vector this guards is OUR
// packaging config (extraResources / files), which lands outside
// node_modules; third-party packages routinely ship .env.example files and
// .pem test fixtures, and flagging those would train the operator to ignore
// this check — which is worse than not having it.
//
// Usage:
//   node scripts/check-packaged-secrets.cjs release/win-unpacked
//   node scripts/check-packaged-secrets.cjs "release/mac-universal/SermonForge.app"

"use strict";

const fs = require("fs");
const path = require("path");

const TAG = "[packaged-secrets]";

// Exact filenames that must never ship, and patterns for credential
// material. `.env.example` is deliberately NOT matched — it carries names,
// not values, and is a legitimate thing to ship.
const FORBIDDEN_EXACT = new Set([".env", ".env.local", ".env.production", ".dev.vars", "id_rsa", ".npmrc"]);
const FORBIDDEN_PATTERN = /\.(p12|p8|pem|key|keystore|pfx)$/i;
const SECRETS_FILE = /^secrets?\.(json|ya?ml|txt)$/i;

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      yield* walk(p);
    } else if (entry.isFile()) {
      yield p;
    }
  }
}

function scan(root) {
  const findings = [];
  for (const file of walk(root)) {
    const name = path.basename(file);
    if (FORBIDDEN_EXACT.has(name) || FORBIDDEN_PATTERN.test(name) || SECRETS_FILE.test(name)) {
      findings.push(path.relative(root, file).split(path.sep).join("/"));
    }
  }
  return findings;
}

module.exports = { scan, FORBIDDEN_EXACT, FORBIDDEN_PATTERN, SECRETS_FILE };

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error(`${TAG} usage: node scripts/check-packaged-secrets.cjs <packaged-app-dir>`);
    process.exit(2);
  }
  const root = path.resolve(target);
  if (!fs.existsSync(root)) {
    console.error(`${TAG} FAIL — nothing to inspect at ${root}`);
    process.exit(2);
  }

  const findings = scan(root);
  if (findings.length === 0) {
    console.log(`${TAG} PASS — no credential-bearing files in ${target}`);
    process.exit(0);
  }
  console.error(`${TAG} FAIL — ${findings.length} credential-bearing file(s) in the packaged app:`);
  // Names only. Never contents.
  for (const f of findings) console.error(`${TAG}   ${f}`);
  console.error(`${TAG} This is how v1.0.0 shipped a plaintext GitHub token to every user. Refusing to publish.`);
  process.exit(1);
}
