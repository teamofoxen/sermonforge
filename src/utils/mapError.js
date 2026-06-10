// mapError.js — one voice for failure (CORE Mutation Contract #5).
//
// Raw engine strings (fs codes, HTTP statuses, Electron IPC wrappers, SQLite
// errors) never reach a pastor. Surfaces that CATCH an error pass it through
// mapError() and render the returned sentence; the raw message belongs in the
// console/log, not on screen. Strings that arrive via a structured
// `result.error` are authored in electron/main.js and render as-is — do NOT
// route those through here (over-matching would flatten an already-plain
// sentence into the generic fallback).
//
// The optional context tag picks surface-appropriate wording for the same
// failure class (an EBUSY during export names the Word document, not "saving").

const IPC_WRAPPER = /^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/;

// Strip Electron's invoke-wrapper prefix so classification sees the real text.
export function rawMessage(err) {
  const m = typeof err === "string" ? err : err?.message;
  return String(m ?? "").replace(IPC_WRAPPER, "").trim();
}

const FALLBACK = {
  create: "Could not create the sermon just now. Try again — and if this keeps happening, close SermonForge and reopen it.",
  save: "Could not save just now. Your work is still on screen — try again in a moment.",
  export: "Could not save the Word document. Try again.",
  key: "Could not save the key. Try again.",
  general: "Something went wrong. Try again — and if this keeps happening, close SermonForge and reopen it.",
};

export default function mapError(err, context = "general") {
  const raw = rawMessage(err);

  // A file is locked or blocked by another program (antivirus, OneDrive, the
  // exported document still open in Word).
  if (/\b(EBUSY|EPERM|EACCES|ETXTBSY|SQLITE_BUSY|SQLITE_LOCKED)\b/.test(raw) || /\bfile is locked\b/i.test(raw)) {
    if (context === "export") {
      return "That Word document is open in another program. Close it there and export again.";
    }
    return "Another program on this computer — often antivirus or OneDrive — is briefly blocking SermonForge. Your work is still on screen. Try again in a moment.";
  }

  // Disk full.
  if (/\b(ENOSPC|SQLITE_FULL)\b/.test(raw)) {
    return "This computer's disk is full, so nothing can be saved. Free up some space and try again.";
  }

  // No internet / DNS / timeouts.
  if (/\b(ENOTFOUND|ETIMEDOUT|ECONNREFUSED|ECONNRESET|EAI_AGAIN|ERR_INTERNET_DISCONNECTED)\b/.test(raw) || /\bfetch failed\b/i.test(raw) || /\bnet::/.test(raw)) {
    return "SermonForge couldn't reach the internet. Check the connection and try again.";
  }

  // ESV passage service.
  if (/ESV API HTTP (401|403)/.test(raw)) {
    return "The ESV key saved on this computer wasn't accepted. Check it under “Update ESV key…” and try again.";
  }
  if (/ESV API HTTP 429/.test(raw)) {
    return "The ESV site is busy right now. Wait a moment and try again.";
  }
  if (/ESV API HTTP 5\d\d/.test(raw)) {
    return "The ESV site isn't answering right now. The passage will load once it's back.";
  }

  return FALLBACK[context] ?? FALLBACK.general;
}
