// SermonForge BTI feedback ingest Worker
//
// POST /ingest  — flag / form / events-batch payloads, discriminated by `kind`
// GET  /inbox   — token-gated JSON of recent rows for the inbox UI
// GET  /health  — liveness probe

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

// /ingest is intentionally token-free. A bearer token shipped inside every
// desktop client is readable by every user, so it never provided real security.
// Instead we validate payload shape, cap body size, and cap batch size; abuse
// volume is handled by Cloudflare edge rate-limiting on the route. Nothing
// secret ships in the app. (/inbox keeps its ADMIN_TOKEN — that secret lives
// only in the Worker, never in the client.)
const MAX_BODY_BYTES = 256 * 1024; // generous for a telemetry batch; rejects abuse
const MAX_EVENTS_PER_BATCH = 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Telemetry event schemas (Session 5) ─────────────────────────────────────
// Hand-mirrored from electron/telemetry/events.js — the Worker deploys
// separately, so the table is duplicated here on purpose and pinned in sync
// by tests/transport/worker-boundary.test.ts. An event outside this table —
// unknown name, unknown key, missing key, wrong type, over-cap string — is
// never persisted to D1. Every string is short-capped and there is no
// free-text field except the crash error line (bounded, documented in
// events.js), so a payload shaped like sermon content cannot fit.
const MAX_SHORT_STRING = 64;
const MAX_CRASH_ERROR = 500;
const EVENT_SCHEMAS = {
  'app-open': { version: { type: 'string', max: MAX_SHORT_STRING }, platform: { type: 'string', max: MAX_SHORT_STRING } },
  'crash': { error: { type: 'string', max: MAX_CRASH_ERROR } },
};

function validateEvent(eventType, payload) {
  if (!Object.prototype.hasOwnProperty.call(EVENT_SCHEMAS, eventType)) return false;
  const schema = EVENT_SCHEMAS[eventType];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  for (const key of Object.keys(payload)) {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) return false;
  }
  for (const [key, rule] of Object.entries(schema)) {
    const value = payload[key];
    if (rule.type === 'string') {
      if (typeof value !== 'string' || (rule.max && value.length > rule.max)) return false;
    } else if (rule.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) return false;
    }
  }
  return true;
}

// Field caps for the two pastor-typed feedback shapes. `note` / `text` are
// deliberate, consent-gated feedback (docs/REFERENCE/privacy.md) — not
// telemetry — but they are still capped, and every OTHER field is a short
// identifier. Unknown fields are rejected whole. (`lastAiCall` retired in
// Session 5: the AI subsystem was removed 2026-05-09 and no client sends it;
// the D1 column stays as historical data, never written again.)
const FLAG_FIELDS = {
  surface: { type: 'string', max: 64, fallback: 'unknown' },
  sermonId: { type: 'string', max: 64, nullable: true },
  step: { type: 'string', max: 128, nullable: true },
  note: { type: 'string', max: 4000, nullable: true },
  timestamp: { type: 'string', max: 64, nullable: true },
};
const FORM_FIELDS = {
  dimension: { type: 'string', max: 64, fallback: 'unspecified' },
  text: { type: 'string', max: 8000, fallback: '' },
  sermonId: { type: 'string', max: 64, nullable: true },
  step: { type: 'string', max: 128, nullable: true },
  timestamp: { type: 'string', max: 64, nullable: true },
};

// Validate a flag/form body against its field table. `kind` and `testerId`
// ride alongside the fields; anything else is unknown and rejects the whole
// submission (the same whole-rejection rule the app's update mutations use).
function validateShape(body, fields) {
  for (const key of Object.keys(body)) {
    if (key === 'kind' || key === 'testerId') continue;
    if (!Object.prototype.hasOwnProperty.call(fields, key)) return { ok: false, reason: `unknown_field:${key.slice(0, 32)}` };
  }
  for (const [key, rule] of Object.entries(fields)) {
    const value = body[key];
    if (value === undefined || value === null) {
      if (rule.nullable || rule.fallback !== undefined) continue;
      return { ok: false, reason: `missing_field:${key}` };
    }
    if (typeof value !== rule.type) return { ok: false, reason: `bad_type:${key}` };
    if (rule.max && value.length > rule.max) return { ok: false, reason: `too_long:${key}` };
  }
  return { ok: true };
}

// CORS headers — only used on /inbox so the developer can open
// transport/inbox.html locally (file://) and fetch this Worker.
// /ingest deliberately omits CORS: SermonForge clients are same-origin
// from a Node fetch, and there is no browser-fetch use case.
const INBOX_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/ingest') {
      return handleIngest(request, env);
    }
    if (request.method === 'OPTIONS' && url.pathname === '/inbox') {
      return new Response(null, { status: 204, headers: INBOX_CORS });
    }
    if (request.method === 'GET' && url.pathname === '/inbox') {
      return handleInbox(url, env, request);
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
    }
    return new Response('Not found', { status: 404 });
  },
};

async function handleIngest(request, env) {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'payload_too_large' }), {
      status: 413,
      headers: JSON_HEADERS,
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // testerId must be a real client UUID — cheap shape gate against junk writes
  // now that the endpoint is unauthenticated.
  const tester = body.testerId;
  if (!tester || typeof tester !== 'string' || !UUID_RE.test(tester)) {
    return new Response(JSON.stringify({ error: 'missing_tester_id' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  try {
    if (body.kind === 'flag') {
      const shape = validateShape(body, FLAG_FIELDS);
      if (!shape.ok) {
        return new Response(JSON.stringify({ error: 'invalid_shape', reason: shape.reason }), {
          status: 400,
          headers: JSON_HEADERS,
        });
      }
      await env.DB.prepare(
        `INSERT INTO flags (tester_id, surface, sermon_id, step, note, client_timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          tester,
          body.surface || 'unknown',
          body.sermonId ?? null,
          body.step ?? null,
          body.note ?? null,
          body.timestamp || new Date().toISOString()
        )
        .run();
      return new Response(JSON.stringify({ ok: true, kind: 'flag' }), { headers: JSON_HEADERS });
    }

    if (body.kind === 'form') {
      const shape = validateShape(body, FORM_FIELDS);
      if (!shape.ok) {
        return new Response(JSON.stringify({ error: 'invalid_shape', reason: shape.reason }), {
          status: 400,
          headers: JSON_HEADERS,
        });
      }
      await env.DB.prepare(
        `INSERT INTO forms (tester_id, dimension, text, sermon_id, step, client_timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          tester,
          body.dimension || 'unspecified',
          body.text || '',
          body.sermonId ?? null,
          body.step ?? null,
          body.timestamp || new Date().toISOString()
        )
        .run();
      return new Response(JSON.stringify({ ok: true, kind: 'form' }), { headers: JSON_HEADERS });
    }

    if (body.kind === 'events') {
      const items = Array.isArray(body.items)
        ? body.items.slice(0, MAX_EVENTS_PER_BATCH)
        : [];
      if (items.length === 0) {
        return new Response(JSON.stringify({ ok: true, kind: 'events', count: 0 }), {
          headers: JSON_HEADERS,
        });
      }
      // Schema gate before D1 (Session 5): every item must match the frozen
      // registry exactly — unknown names/keys/types never persist. Invalid
      // items are counted and dropped (not 400ing the whole batch, which
      // would wedge a well-behaved client's retry queue behind one junk item
      // from elsewhere); the app-side emit gate means OUR client never sends
      // one in the first place.
      const valid = [];
      let rejected = 0;
      for (const e of items) {
        if (e && typeof e.eventType === 'string' && validateEvent(e.eventType, e.payload ?? {})) {
          valid.push(e);
        } else {
          rejected += 1;
        }
      }
      if (valid.length > 0) {
        const stmt = env.DB.prepare(
          `INSERT INTO events (tester_id, event_type, payload_json, client_timestamp) VALUES (?, ?, ?, ?)`
        );
        const batch = valid.map((e) =>
          stmt.bind(
            tester,
            e.eventType,
            JSON.stringify(e.payload ?? {}),
            e.timestamp || new Date().toISOString()
          )
        );
        await env.DB.batch(batch);
      }
      return new Response(
        JSON.stringify({ ok: true, kind: 'events', count: valid.length, rejected }),
        { headers: JSON_HEADERS }
      );
    }

    return new Response(JSON.stringify({ error: 'unknown_kind' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'db_error', message: err.message }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

async function handleInbox(url, env, request) {
  // Session 5: admin auth moved to the Authorization header. A token in the
  // query string lands in logs, browser history, and proxies — it is
  // REJECTED outright (not merely ignored) so a leaked-style URL fails loud
  // and the habit dies. The ADMIN_TOKEN itself lives only in the Worker's
  // secrets (wrangler secret / .dev.vars — gitignored), never in this repo.
  if (url.searchParams.has('token')) {
    return new Response(JSON.stringify({ error: 'token_in_query_rejected', hint: 'use Authorization: Bearer <token>' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }
  const auth = request?.headers?.get('Authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : null;
  if (!env.ADMIN_TOKEN || !bearer || bearer !== env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 500);

  const [flags, forms, events] = await Promise.all([
    env.DB.prepare(`SELECT * FROM flags ORDER BY server_timestamp DESC LIMIT ?`).bind(limit).all(),
    env.DB.prepare(`SELECT * FROM forms ORDER BY server_timestamp DESC LIMIT ?`).bind(limit).all(),
    env.DB.prepare(`SELECT * FROM events ORDER BY server_timestamp DESC LIMIT ?`).bind(limit).all(),
  ]);

  return new Response(
    JSON.stringify({
      flags: flags.results,
      forms: forms.results,
      events: events.results,
    }),
    { headers: { ...JSON_HEADERS, ...INBOX_CORS } }
  );
}
