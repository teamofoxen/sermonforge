import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

// M8 — feedback and telemetry queued for retry were stranded forever.
//
// Queue files are named per session, and the bus's drain only ever touched
// the CURRENT session's file: init() did no directory scan, and a repo-wide
// search for readdir across electron/ returned nothing. So anything queued
// when the app exited — including notes the UI had already reported as
// "Sent." — sat on disk unread while the dead files accumulated.
//
// The sweep lives in its own module precisely so it can be tested: the rest
// of the bus cannot load outside Electron, which is why this behaviour went
// unverified in the first place. Real files, real fs, injected transport.

const require_ = createRequire(import.meta.url);
const { sweepOrphanedQueues } = require_(
  path.resolve(__dirname, "..", "..", "electron", "telemetry", "queueSweep.js")
);

let dir: string;
let posted: unknown[];
let enabled: boolean;

const queueFile = (id = randomUUID()) => path.join(dir, `${id}.immediate.ndjson`);

function write(file: string, items: unknown[]) {
  fs.writeFileSync(file, items.map((i) => (typeof i === "string" ? i : JSON.stringify(i))).join("\n") + "\n");
}

const sweep = (over: Record<string, unknown> = {}) =>
  sweepOrphanedQueues({
    dir,
    currentFile: path.join(dir, `${randomUUID()}.immediate.ndjson`),
    isEnabled: () => enabled,
    post: async (item: unknown) => {
      posted.push(item);
      return true;
    },
    ...over,
  });

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "sf-queue-"));
  posted = [];
  enabled = true;
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("cross-session queue recovery", () => {
  it("drains a queue left behind by a PREVIOUS session and removes it", async () => {
    const orphan = queueFile();
    write(orphan, [{ kind: "form", payload: { text: "a note from a session that has ended" } }]);

    await sweep();

    expect(posted).toHaveLength(1);
    expect(fs.existsSync(orphan)).toBe(false);
  });

  it("drains queues across MULTIPLE prior sessions", async () => {
    const files = [queueFile(), queueFile(), queueFile()];
    files.forEach((f, i) => write(f, [{ kind: "flag", payload: { note: `session ${i}` } }]));

    await sweep();

    expect(posted).toHaveLength(3);
    for (const f of files) expect(fs.existsSync(f)).toBe(false);
  });

  it("never touches the CURRENT session's queue — the ordinary drain owns that", async () => {
    const current = queueFile();
    write(current, [{ kind: "form", payload: { text: "still in flight" } }]);

    await sweep({ currentFile: current });

    expect(posted).toHaveLength(0);
    expect(fs.existsSync(current)).toBe(true);
  });

  it("sends NOTHING when the pastor has opted out", async () => {
    // Consent is re-checked at drain time, not inherited from when the note
    // was queued. A revoked opt-in must not be worked around by a sweep.
    const orphan = queueFile();
    write(orphan, [{ kind: "form", payload: { text: "queued before opting out" } }]);
    enabled = false;

    await sweep();

    expect(posted).toHaveLength(0);
    expect(fs.existsSync(orphan)).toBe(true); // kept, not destroyed
  });

  it("stops mid-sweep if consent is revoked while it runs", async () => {
    const orphan = queueFile();
    write(orphan, [
      { kind: "form", payload: { text: "one" } },
      { kind: "form", payload: { text: "two" } },
      { kind: "form", payload: { text: "three" } },
    ]);

    await sweep({
      post: async (item: { payload: { text: string } }) => {
        posted.push(item);
        enabled = false; // revoked after the first send
        return true;
      },
    });

    expect(posted).toHaveLength(1);
    expect(fs.readFileSync(orphan, "utf8")).toMatch(/two/);
  });

  it("does not send anything twice", async () => {
    const orphan = queueFile();
    write(orphan, [{ kind: "form", payload: { text: "once" } }]);

    await sweep();
    await sweep();

    expect(posted).toHaveLength(1);
  });

  it("quarantines malformed records instead of silently dropping them", async () => {
    const orphan = queueFile();
    write(orphan, ["{not json at all", JSON.stringify({ kind: "form", payload: { text: "good" } }), "{}"]);

    await sweep();

    expect(posted).toHaveLength(1);
    expect(fs.existsSync(`${orphan}.malformed`)).toBe(true);
    const quarantined = fs.readFileSync(`${orphan}.malformed`, "utf8");
    expect(quarantined).toMatch(/not json at all/);
    expect(quarantined).toMatch(/\{\}/); // a record with no kind is malformed too
  });

  it("gives up on a queue nobody could deliver in a month", async () => {
    // Bounded retry: without this, an undeliverable file is retried on
    // every launch forever.
    const orphan = queueFile();
    write(orphan, [{ kind: "form", payload: { text: "ancient" } }]);
    const old = Date.now() - 40 * 24 * 60 * 60 * 1000;
    fs.utimesSync(orphan, new Date(old), new Date(old));

    await sweep();

    expect(posted).toHaveLength(0);
    expect(fs.existsSync(orphan)).toBe(false);
  });

  it("keeps records that fail to send, for the next attempt", async () => {
    const orphan = queueFile();
    write(orphan, [{ kind: "form", payload: { text: "retry me" } }]);

    await sweep({ post: async () => false });

    expect(fs.existsSync(orphan)).toBe(true);
    expect(fs.readFileSync(orphan, "utf8")).toMatch(/retry me/);
  });

  it("touches only its own queue files, never unrelated files in the directory", async () => {
    const unrelated = path.join(dir, "notes.txt");
    const wrongShape = path.join(dir, "not-a-uuid.immediate.ndjson");
    const otherQueue = path.join(dir, `${randomUUID()}.ndjson`);
    fs.writeFileSync(unrelated, "private");
    fs.writeFileSync(wrongShape, JSON.stringify({ kind: "form", payload: {} }) + "\n");
    fs.writeFileSync(otherQueue, JSON.stringify({ eventType: "app-open" }) + "\n");

    await sweep();

    expect(posted).toHaveLength(0);
    expect(fs.existsSync(unrelated)).toBe(true);
    expect(fs.existsSync(wrongShape)).toBe(true);
    expect(fs.existsSync(otherQueue)).toBe(true);
  });

  it("survives a directory that does not exist", async () => {
    const result = await sweep({ dir: path.join(dir, "nope") });
    expect(result.drained).toBe(0);
  });
});
