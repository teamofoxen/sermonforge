-- SermonForge BTI feedback schema (D1 / SQLite)
--
-- Three tables, keyed by tester_id (opaque UUID assigned at first-run on the
-- pastor's machine, stored in user prefs). Server_timestamp is set by the
-- Worker on insert; client_timestamp is what the app reports.

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tester_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  client_timestamp TEXT NOT NULL,
  server_timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_tester ON events(tester_id, server_timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type, server_timestamp);

CREATE TABLE IF NOT EXISTS flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tester_id TEXT NOT NULL,
  surface TEXT NOT NULL,
  sermon_id TEXT,
  step TEXT,
  last_ai_call_json TEXT,
  note TEXT,
  client_timestamp TEXT NOT NULL,
  server_timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_flags_tester ON flags(tester_id, server_timestamp);
CREATE INDEX IF NOT EXISTS idx_flags_surface ON flags(surface, server_timestamp);

CREATE TABLE IF NOT EXISTS forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tester_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  text TEXT NOT NULL,
  sermon_id TEXT,
  step TEXT,
  client_timestamp TEXT NOT NULL,
  server_timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_forms_tester ON forms(tester_id, server_timestamp);
CREATE INDEX IF NOT EXISTS idx_forms_dimension ON forms(dimension, server_timestamp);
