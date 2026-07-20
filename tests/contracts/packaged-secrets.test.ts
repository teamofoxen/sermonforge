import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// scripts/check-packaged-secrets.cjs — the guard that would have stopped
// v1.0.0 from shipping the developer's plaintext credentials to every user.
//
// The packaging CONFIG is asserted elsewhere (release-pipeline.test.ts proves
// .env can never re-enter extraResources). This covers the other half: what
// actually ended up inside the built app.

const require_ = createRequire(import.meta.url);
const { scan } = require_(path.resolve(__dirname, "..", "..", "scripts", "check-packaged-secrets.cjs"));

let tmp: string;

function build(files: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(tmp, "pkg-"));
  for (const [rel, contents] of Object.entries(files)) {
    const p = path.join(root, ...rel.split("/"));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, contents);
  }
  return root;
}

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sf-pkgsecrets-"));
});
afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("packaged credential guard", () => {
  it("passes a clean packaged app", () => {
    const root = build({
      "resources/app.asar": "binary",
      "resources/models/model.onnx": "weights",
      "SermonForge.exe": "binary",
    });
    expect(scan(root)).toEqual([]);
  });

  it("catches the exact v1.0.0 leak: resources/.env", () => {
    const root = build({ "resources/.env": "GITHUB_FEEDBACK_TOKEN=redacted", "SermonForge.exe": "x" });
    expect(scan(root)).toContain("resources/.env");
  });

  it("catches signing and key material", () => {
    for (const rel of ["resources/cert.p12", "resources/AuthKey.p8", "resources/server.pem", "resources/id_rsa", "resources/secrets.json", "resources/.dev.vars"]) {
      const root = build({ [rel]: "material", "SermonForge.exe": "x" });
      expect(scan(root), `${rel} must be caught`).toContain(rel.split("/").slice(-2).join("/"));
    }
  });

  it("does NOT flag .env.example — names without values are legitimate to ship", () => {
    const root = build({ "resources/.env.example": "ESV_API_KEY=", "SermonForge.exe": "x" });
    expect(scan(root)).toEqual([]);
  });

  it("does NOT walk node_modules — third-party fixtures would train the operator to ignore this check", () => {
    const root = build({
      "resources/app.asar.unpacked/node_modules/some-lib/test/fixtures/key.pem": "fixture",
      "resources/app.asar.unpacked/node_modules/other/.env": "EXAMPLE=1",
      "SermonForge.exe": "x",
    });
    expect(scan(root)).toEqual([]);
  });

  it("a dev run cannot overwrite the packaged install's stored key", () => {
    // keystore.js does NOT use the data/data-dev split, and on Windows the
    // dev and packaged userData folders differ only by case — the same
    // folder. A dev SetupScreen save therefore wrote straight over the
    // packaged install's sf-esv.enc, invisibly, because an unpackaged run
    // reads .env and never reads the file back (2026-07-20 audit, lead 4).
    const src = fs.readFileSync(path.resolve(__dirname, "..", "..", "electron", "keystore.js"), "utf8");
    const keyFileFn = src.slice(src.indexOf("function keyFile"), src.indexOf("function saveNamedKey"));
    expect(keyFileFn, "the key filename must be namespaced by packaged state").toMatch(/isPackaged/);
    // The packaged filename must stay exactly sf-<name>.enc, or every
    // existing install silently loses its key.
    expect(keyFileFn).toMatch(/isPackaged \? "" :/);
  });

  it("reports a path, and nothing that could be a value", () => {
    const secret = "github_pat_THIS_MUST_NEVER_APPEAR";
    const root = build({ "resources/.env": `TOKEN=${secret}`, "SermonForge.exe": "x" });
    const findings = scan(root);
    expect(findings).toEqual(["resources/.env"]);
    expect(JSON.stringify(findings)).not.toContain("github_pat");
  });
});
