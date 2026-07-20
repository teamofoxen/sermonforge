#!/usr/bin/env node
// scripts/after-pack.cjs — everything that must be true of a packaged app
// BEFORE electron-builder signs, notarizes, or uploads it.
//
// electron-builder allows exactly one afterPack hook, and on macOS the whole
// pack → sign → notarize → publish sequence is a single invocation, so there
// is no workflow step to wedge a check into. This hook is the last honest
// place to refuse to ship something.
//
// Two independent guards, both fail-closed:
//   1. No credential-bearing file rides along in the packaged app
//      (v1.0.0 shipped a plaintext .env with a GitHub PAT to every user).
//   2. On macOS, both halves of the universal app carry native binaries of
//      their own architecture (v1.0.0–v1.2.0 shipped an arm64 database
//      module inside the Intel half and crashed at boot on every Intel Mac).

"use strict";

const macArchGate = require("./mac-arch-gate.cjs");
const { scan } = require("./check-packaged-secrets.cjs");

const TAG = "[after-pack]";

module.exports = async function afterPack(context) {
  // Runs on every platform — a leaked credential is not a macOS problem.
  const secrets = scan(context.appOutDir);
  if (secrets.length > 0) {
    console.error(`${TAG} FAIL — credential-bearing file(s) in the packaged app:`);
    // Paths only, never contents: a guard that echoes what it caught has
    // published it to the CI log.
    for (const f of secrets) console.error(`${TAG}   ${f}`);
    throw new Error("after-pack: refusing to package an app containing credential files — see log above");
  }
  console.log(`${TAG} no credential-bearing files in ${context.appOutDir}`);

  // Self-gating: returns immediately on non-darwin packs.
  await macArchGate(context);
};
