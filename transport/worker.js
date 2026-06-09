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

// CORS headers — only used on /inbox so the developer can open
// transport/inbox.html locally (file://) and fetch this Worker.
// /ingest deliberately omits CORS: SermonForge clients are same-origin
// from a Node fetch, and there is no browser-fetch use case.
const INBOX_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
      return handleInbox(url, env);
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
      await env.DB.prepare(
        `INSERT INTO flags (tester_id, surface, sermon_id, step, last_ai_call_json, note, client_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          tester,
          body.surface || 'unknown',
          body.sermonId ?? null,
          body.step ?? null,
          body.lastAiCall ? JSON.stringify(body.lastAiCall) : null,
          body.note ?? null,
          body.timestamp || new Date().toISOString()
        )
        .run();
      return new Response(JSON.stringify({ ok: true, kind: 'flag' }), { headers: JSON_HEADERS });
    }

    if (body.kind === 'form') {
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
      const stmt = env.DB.prepare(
        `INSERT INTO events (tester_id, event_type, payload_json, client_timestamp) VALUES (?, ?, ?, ?)`
      );
      const batch = items.map((e) =>
        stmt.bind(
          tester,
          e.eventType || 'unknown',
          JSON.stringify(e.payload ?? {}),
          e.timestamp || new Date().toISOString()
        )
      );
      await env.DB.batch(batch);
      return new Response(
        JSON.stringify({ ok: true, kind: 'events', count: items.length }),
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

async function handleInbox(url, env) {
  const token = url.searchParams.get('token');
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
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
