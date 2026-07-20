import { describe, it, expect } from "vitest";
import { describeFeedbackOutcome } from "../../src/utils/feedbackOutcome";
import { SUPPORT_EMAIL } from "../../src/constants/support";

// H5 — the feedback surfaces reported "Sent." for notes the bus destroyed.
//
// The bus has always returned an honest verdict; both renderers threw it
// away. For an opted-out pastor that meant deliberate bug reports vanished
// while the app thanked him for them — and there is no in-app way to turn
// telemetry back on, so it would have kept happening forever.
//
// The rule these tests exist to hold: the word "sent" may only appear when
// the note actually reached the developer.

const SENT = { ok: true };
const OFFLINE = { ok: false, queued: true, reason: "offline" };
const NO_TRANSPORT = { ok: false, queued: true, reason: "no-transport" };
const DISABLED = { ok: false, queued: false, reason: "disabled" };
const BAD_KIND = { ok: false, queued: false, reason: "bad-kind" };
const THREW = { ok: false, queued: false, reason: "failed" };

describe("describeFeedbackOutcome", () => {
  it("says sent ONLY when the note actually went through", () => {
    expect(describeFeedbackOutcome(SENT).tone).toBe("sent");
    for (const result of [OFFLINE, NO_TRANSPORT, DISABLED, BAD_KIND, THREW, undefined, null]) {
      const outcome = describeFeedbackOutcome(result as never);
      expect(outcome.tone, `${JSON.stringify(result)} must not read as sent`).not.toBe("sent");
      // Affirmative claims only — "couldn't be sent" is exactly what we
      // WANT here, so this matches the success phrasings rather than the
      // bare word.
      const text = `${outcome.message} ${outcome.detail ?? ""}`.toLowerCase();
      expect(text, `${JSON.stringify(result)} must not claim it was sent`).not.toMatch(
        /^sent\b|\bflag sent\b|\bwas sent\b|\bhas been sent\b|thank you — every note/
      );
    }
  });

  it("tells a pastor his queued note is safe, without claiming it arrived", () => {
    for (const result of [OFFLINE, NO_TRANSPORT]) {
      const outcome = describeFeedbackOutcome(result);
      expect(outcome.tone).toBe("queued");
      expect(outcome.message).toMatch(/Saved/);
      expect(outcome.detail).toMatch(/stored on this computer/);
    }
  });

  it("tells the truth when feedback is off: nothing was kept, and here is another route", () => {
    // The exact case that was silently destroying notes.
    const outcome = describeFeedbackOutcome(DISABLED);
    expect(outcome.tone).toBe("off");
    expect(outcome.message).toMatch(/wasn't sent/);
    expect(outcome.detail).toMatch(/wasn't saved anywhere/);
    expect(outcome.detail).toContain(SUPPORT_EMAIL);
  });

  it("offers a route the pastor can act on whenever the note was lost", () => {
    for (const result of [DISABLED, BAD_KIND, THREW]) {
      expect(describeFeedbackOutcome(result).detail).toContain(SUPPORT_EMAIL);
    }
  });

  it("never leaves a lost note without saying so", () => {
    for (const result of [DISABLED, BAD_KIND, THREW]) {
      const outcome = describeFeedbackOutcome(result);
      expect(outcome.detail).toMatch(/wasn't saved/);
    }
  });
});

describe("both feedback surfaces consume the verdict", () => {
  it("neither renderer throws the IPC result away", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = path.resolve(__dirname, "..", "..");
    for (const rel of ["src/components/FeedbackForm.jsx", "src/components/FeedbackFlag.jsx"]) {
      const src = fs.readFileSync(path.resolve(root, rel), "utf8");
      expect(src, `${rel} must use the shared outcome helper`).toMatch(/describeFeedbackOutcome/);
      // The old shape: await the call, discard the return, confirm success.
      expect(src, `${rel} must not discard the bus result`).not.toMatch(/^\s*await window\.electronAPI\?\.btiSubmit/m);
    }
  });
});
