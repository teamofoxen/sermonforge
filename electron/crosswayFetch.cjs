// crosswayFetch.cjs — the ONE bounded Crossway (ESV API) request helper
// (Session-5 remediation, 2026-07-13).
//
// Both ESV call sites in main.js — the passage-fetch handler and the
// app-save-api-key verification probe — route through fetchCrossway so no
// ESV request can pend indefinitely. Every call ends as exactly one of:
//   { kind: "success",  res }        — an HTTP response arrived (any status;
//                                      the caller keeps mapping 401/403/429/
//                                      !ok to its plain-language esvState)
//   { kind: "timeout" }              — no response inside timeoutMs; aborted
//   { kind: "cancelled" }            — the caller's own signal aborted first
//   { kind: "error",   error }       — network failure (DNS, offline, reset)
//
// The helper never throws. `fetchImpl` and `timeoutMs` are injectable so
// tests drive all four endings without touching the network
// (tests/unit/crosswayFetch.test.js). Pastor-facing wording stays with the
// callers — this module speaks only structured kinds.

"use strict";

const DEFAULT_TIMEOUT_MS = 10_000;

async function fetchCrossway(url, { key, timeoutMs = DEFAULT_TIMEOUT_MS, signal, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("crossway-timeout")), timeoutMs);
  let cancelledByCaller = false;
  const onCallerAbort = () => {
    cancelledByCaller = true;
    controller.abort(new Error("crossway-cancelled"));
  };
  if (signal) {
    if (signal.aborted) onCallerAbort();
    else signal.addEventListener("abort", onCallerAbort, { once: true });
  }
  try {
    const res = await fetchImpl(url, {
      headers: key ? { Authorization: `Token ${key}` } : {},
      signal: controller.signal,
    });
    return { kind: "success", res };
  } catch (err) {
    if (cancelledByCaller) return { kind: "cancelled" };
    if (controller.signal.aborted) return { kind: "timeout" };
    return { kind: "error", error: err };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onCallerAbort);
  }
}

module.exports = { fetchCrossway, DEFAULT_TIMEOUT_MS };
