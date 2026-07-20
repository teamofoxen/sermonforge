// src/utils/feedbackOutcome.js — turn the feedback bus's verdict into
// something true to say to the pastor.
//
// Both feedback surfaces used to render "Sent. Thank you." unconditionally,
// discarding the IPC result. Three of the bus's outcomes keep the note and
// one throws it away, so an opted-out pastor wrote bug reports that were
// silently destroyed while the app thanked him for them (2026-07-20 audit,
// H5). One helper, so the two surfaces can never drift apart again.
//
// Shape in: { ok, queued, reason } from electron/telemetry/bus.js
// Shape out: { tone, message, detail }
//   tone "sent"   — it reached the developer
//   tone "queued" — it is safely on disk and will send later
//   tone "off"    — it was NOT kept; feedback is switched off
//   tone "failed" — it was NOT kept; something went wrong

import { SUPPORT_EMAIL } from "../constants/support";

export function describeFeedbackOutcome(result) {
  if (result?.ok) {
    return { tone: "sent", message: "Sent. Thank you — every note shapes the tool." };
  }

  if (result?.queued) {
    // The note is on disk and the bus retries it, including in a later
    // session. Saying "sent" here would still be a lie, but the pastor's
    // words are safe and he should be told exactly that.
    return {
      tone: "queued",
      message: "Saved. You're offline, so this will send itself later.",
      detail: "You can close the app — your note is stored on this computer until it goes through.",
    };
  }

  if (result?.reason === "disabled") {
    // The honest one. Nothing was kept, and there is no in-app way to turn
    // feedback back on, so the pastor is given a route that works today.
    return {
      tone: "off",
      message: "This wasn't sent — feedback is turned off on this computer.",
      detail: `Your note wasn't saved anywhere. To get it to the developer, email ${SUPPORT_EMAIL}.`,
    };
  }

  return {
    tone: "failed",
    message: "This couldn't be sent.",
    detail: `Your note wasn't saved. If it matters, email it to ${SUPPORT_EMAIL}.`,
  };
}
