// electron/telemetry/config.js — single source for transport + tuning.
//
// The Worker URL is a PUBLIC HTTPS endpoint, not a credential, so it lives in
// source. It is NOT read from a bundled .env: shipping a .env into the installer
// leaked the developer's secrets to every user (the entire point of removing it
// in the public-launch hardening pass). A dev/test override is still honored via
// CLOUDFLARE_WORKER_URL when present (dev runs load .env locally, never shipped).
//
// The /ingest endpoint is intentionally token-free (see transport/worker.js):
// any client-shipped bearer token is readable by every install and provides no
// real security, so the Worker validates payload shape + caps size instead, and
// rate-limiting is applied at the Cloudflare edge. With no token to ship, there
// is nothing here to leak.
//
// If WORKER_URL is somehow empty, the bus runs local-only — events buffer to
// NDJSON but no POSTs go out. Telemetry never blocks startup or surfaces network
// errors when the endpoint is unreachable.

const WORKER_URL =
  process.env.CLOUDFLARE_WORKER_URL ||
  "https://sermonforge-bti.ross-appleton.workers.dev";

const FLUSH_INTERVAL_MS = 30 * 1000; // periodic flush cadence
const FLUSH_TIMEOUT_MS = 5 * 1000;   // per-attempt fetch timeout
const MAX_BATCH_SIZE = 500;          // events per POST; remainder ships next flush

module.exports = {
  WORKER_URL,
  FLUSH_INTERVAL_MS,
  FLUSH_TIMEOUT_MS,
  MAX_BATCH_SIZE,
};
