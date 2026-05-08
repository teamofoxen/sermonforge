// electron/telemetry/config.js — single source for transport + tuning.
//
// Values are read from process.env. Production builds populate these from .env
// at app boot via dotenv (see electron/main.js). If CLOUDFLARE_INGEST_TOKEN is
// unset (e.g., dev install with no .env), the bus runs local-only — events
// buffer to NDJSON but no POSTs go out. This is intentional: telemetry should
// never block app startup or emit network errors when misconfigured.

const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || null;
const INGEST_TOKEN = process.env.CLOUDFLARE_INGEST_TOKEN || null;

const FLUSH_INTERVAL_MS = 30 * 1000; // periodic flush cadence
const FLUSH_TIMEOUT_MS = 5 * 1000;   // per-attempt fetch timeout
const MAX_BATCH_SIZE = 500;          // events per POST; remainder ships next flush

module.exports = {
  WORKER_URL,
  INGEST_TOKEN,
  FLUSH_INTERVAL_MS,
  FLUSH_TIMEOUT_MS,
  MAX_BATCH_SIZE,
};
