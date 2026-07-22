// persistence.cjs — SermonForge's production persistence seam.
//
// Extracted VERBATIM from electron/main.js (Session-2 remediation,
// 2026-07-13) so the production mutation dispatcher, query helpers, search
// projection, and migration ladder are directly executable against a
// supplied better-sqlite3 database — no Electron boot required. main.js
// remains the lifecycle + IPC wiring owner and DELEGATES here; there is no
// second implementation.
//
// createPersistence({ getDb, logError, logInfo, isDev }) — explicit
// dependencies, no module-level connection state:
//   getDb    — () => the CURRENT better-sqlite3 handle. A function, not a
//              handle, because main.js reassigns `db` across boot recovery /
//              legacy resolution / quit; tests pass () => their temp db.
//   logError / logInfo — the electron/logger.js pair in production; console
//              (or capture arrays) in tests.
//   isDev    — drives buildUpdate's dev-throw on unknown fields.
//
// Tests: tests/persistence/production-persistence.test.ts runs THIS module
// against real SQLite files via the Node-ABI twin package
// `better-sqlite3-node` (same better-sqlite3 version; the copy in
// node_modules/better-sqlite3 is Electron-ABI-rebuilt and cannot load under
// plain Node). What is NOT exercised there: the IPC surface and Electron
// lifecycle in main.js — wiring stays tripwire-scanned, not executed.
const { randomUUID } = require("crypto");
const {
  STAGE,
  SUB_PHASE,
  SERMON_STATUS, SERIES_STATUS,
  MUTATION_KIND,
  SERMON_COLUMNS, SERIES_COLUMNS, SECTION_COLUMNS,
  STRUCTURED_FIELDS,
} = require("./contracts.cjs");

function createPersistence({ getDb, logError = console.error, logInfo = () => {}, isDev = false }) {
  // ── Query helpers ────────────────────────────────────────────────────────────
  // better-sqlite3 rejects undefined/boolean bind values that sql.js coerced —
  // normalize so existing call sites keep working byte-for-byte.
  function bindable(params) {
    return params.map((p) =>
      p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p
    );
  }

  function queryAll(sql, params = []) {
    return getDb().prepare(sql).all(...bindable(params));
  }

  function queryOne(sql, params = []) {
    return getDb().prepare(sql).get(...bindable(params)) ?? null;
  }

  function runSql(sql, params = []) {
    getDb().prepare(sql).run(...bindable(params));
  }

  // Drop-in replacement for sql.js's `db.run(sql, params?)`: with params it is a
  // single prepared statement; without, it executes a (possibly multi-statement)
  // script — exactly the two shapes the old call sites used.
  function dbRun(sql, params = []) {
    if (params.length) getDb().prepare(sql).run(...bindable(params));
    else getDb().exec(sql);
  }


  // Bootstrap schema — moved verbatim from initDatabase (Session 2 seam
  // extraction). Bootstrap-only: all subsequent schema changes MUST go
  // through runMigrations(); do not add or alter tables here.
  function bootstrapSchema() {
    // Bootstrap-only schema. All subsequent schema changes MUST go through
    // runMigrations() below — do not add or alter tables in this block.
    dbRun(`
      CREATE TABLE IF NOT EXISTS series (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        color TEXT DEFAULT 'gold',
        description TEXT DEFAULT '',
        year INTEGER DEFAULT 2024,
        big_idea TEXT DEFAULT '',
        overview TEXT DEFAULT '',
        passage_range TEXT DEFAULT '',
        start_date TEXT DEFAULT '',
        end_date TEXT DEFAULT '',
        structural_outline TEXT DEFAULT '',
        status TEXT DEFAULT 'planning',
        canon_category TEXT DEFAULT '',
        redemptive_context TEXT DEFAULT '',
        book_background TEXT DEFAULT '',
        book_argument TEXT DEFAULT '',
        book_structure TEXT DEFAULT '',
        series_motivation TEXT DEFAULT '',
        emerging_big_idea TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS sermons (
        id TEXT PRIMARY KEY,
        series_id TEXT,
        title TEXT NOT NULL,
        passage TEXT DEFAULT '',
        date TEXT DEFAULT '',
        preacher TEXT DEFAULT '',
        stage TEXT DEFAULT 'planning',
        big_idea TEXT DEFAULT '',
        mpt TEXT DEFAULT '',
        mps TEXT DEFAULT '',
        observations TEXT DEFAULT '',
        interpretation TEXT DEFAULT '',
        redemptive_thread TEXT DEFAULT '',
        implications TEXT DEFAULT '',
        outline TEXT DEFAULT '[]',
        manuscript TEXT DEFAULT '',
        delivery_notes TEXT DEFAULT '',
        timing_notes TEXT DEFAULT '',
        post_sermon TEXT DEFAULT '',
        functional_elements TEXT DEFAULT '{}',
        checklist TEXT DEFAULT '{}',
        section_id TEXT DEFAULT NULL,
        is_one_off INTEGER DEFAULT 0,
        -- topic_theme / audience_assumptions / background_noise removed in
        -- the trail deletion sweep (Phase B1). Legacy PC columns, retired.
        study_guide_note TEXT DEFAULT '',
        -- v23 (Phase D1): session re-entry routing.
        last_touched_position TEXT DEFAULT NULL,
        thresholds_seen TEXT NOT NULL DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS series_sections (
        id TEXT PRIMARY KEY,
        series_id TEXT NOT NULL,
        title TEXT DEFAULT '',
        passage_range TEXT DEFAULT '',
        big_idea TEXT DEFAULT '',
        overview TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS calendar_notes (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT DEFAULT 'special',
        label TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );

    `);

  }

  function safeAlter(sql) {
    try {
      dbRun(sql);
      return true;
    } catch (e) {
      const msg = String(e?.message || e).toLowerCase();
      if (msg.includes("duplicate column name")) return false; // column exists, skip
      throw e;
    }
  }

  // No "in a series but in no section" limbo: resolve the section a new (or
  // being-healed) in-series sermon should live under. Returns the series' first
  // section by outline order, auto-creating "Section 1" when the series has none
  // yet. Shared by the create-sermon handler and the v29 heal migration; mirrors
  // the inline v28 normalize + delete-section's first-remaining-section logic.
  // (Declared above runMigrations so both the migration and validateAndCommit can
  // call it; queryOne/dbRun/randomUUID are module-scoped.)
  function firstSectionIdForSeries(seriesId) {
    const sec = queryOne(
      "SELECT id FROM series_sections WHERE series_id = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1",
      [seriesId],
    );
    if (sec) return sec.id;
    const sectionId = randomUUID();
    dbRun(
      "INSERT INTO series_sections (id, series_id, title, passage_range, big_idea, overview, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [sectionId, seriesId, "Section 1", "", "", "", 0],
    );
    return sectionId;
  }


  function runMigrations() {
    dbRun(`CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);

    const row = queryOne("SELECT value FROM meta WHERE key = 'schema_version'");
    let version = row ? parseInt(row.value, 10) : 0;
    // Guard against a non-numeric schema_version (corruption of just this value, or
    // hand-tampering). Resetting to 0 and re-running is NOT safe: the ladder is not
    // fully idempotent. Data-shaping migrations — the v19 main_point_pair envelope
    // wrap, the v25 canon_category remap, the v26 book_structure fold — would
    // double-apply against a DB that is actually already fully migrated, corrupting
    // content. Refuse to guess. Throw so the wrapping transaction rolls back (the
    // on-disk DB is left pristine) and the boot surfaces the migration_failed screen
    // ("your sermons are safe and were not changed"). A genuinely non-numeric value
    // needs meta repaired by support, not a blind 33-migration replay over
    // unknown-state data.
    if (!Number.isInteger(version)) {
      const e = new Error(
        `meta.schema_version is non-numeric ("${row?.value}") — refusing to reset to 0 and re-run migrations against an unknown-state DB`,
      );
      e._sfClass = "corrupt";
      logError(`[DB] ${e.message}`);
      throw e;
    }
    const initialVersion = version;

    // IMPORTANT: each block updates `version` after running so subsequent blocks
    // see the correct current version, not the original value. Blocks must stay
    // in ascending version order.

    if (version < 2) {
      // v2: add functional_elements and checklist to sermons (no-op on fresh installs)
      safeAlter("ALTER TABLE sermons ADD COLUMN functional_elements TEXT DEFAULT '{}'");
      safeAlter("ALTER TABLE sermons ADD COLUMN checklist TEXT DEFAULT '{}'");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2')");
      version = 2;
    }

    if (version < 3) {
      // v3: previously created the sermon library table + FTS index. The library
      // feature has been removed; the migration body is empty but the version
      // bump is preserved so the migration sequence stays intact.
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '3')");
      version = 3;
    }

    if (version < 4) {
      // v4: series planning fields, sections table, calendar notes, sermon section/one-off
      safeAlter("ALTER TABLE series ADD COLUMN big_idea TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN overview TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN passage_range TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN start_date TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN end_date TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN structural_outline TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN status TEXT DEFAULT 'planning'");
      safeAlter("ALTER TABLE series ADD COLUMN canon_category TEXT DEFAULT ''");
      safeAlter("ALTER TABLE sermons ADD COLUMN section_id TEXT DEFAULT NULL");
      safeAlter("ALTER TABLE sermons ADD COLUMN is_one_off INTEGER DEFAULT 0");
      dbRun(`CREATE TABLE IF NOT EXISTS series_sections (
        id TEXT PRIMARY KEY,
        series_id TEXT NOT NULL,
        title TEXT DEFAULT '',
        passage_range TEXT DEFAULT '',
        big_idea TEXT DEFAULT '',
        overview TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      dbRun(`CREATE TABLE IF NOT EXISTS calendar_notes (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT DEFAULT 'special',
        label TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '4')");
      version = 4;
    }

    if (version < 5) {
      // v5: migrate outline from string[] to {id,text}[] and functional_elements
      // from numeric-string keys to UUID keys. Idempotent: skips already-migrated records.
      const sermons = queryAll("SELECT id, outline, functional_elements FROM sermons");
      for (const sermon of sermons) {
        // ── Parse outline ──────────────────────────────────────────────────────
        let outlineRaw = null;
        try { outlineRaw = sermon.outline ? JSON.parse(sermon.outline) : null; } catch (_) {}

        if (!Array.isArray(outlineRaw) || outlineRaw.length === 0) continue;

        // Already migrated if first element is an object with an id field.
        if (typeof outlineRaw[0] === "object" && outlineRaw[0] !== null && outlineRaw[0].id) continue;

        // All items must be strings for this to be an old-format outline.
        if (!outlineRaw.every(item => typeof item === "string")) continue;

        // ── Parse functional_elements ──────────────────────────────────────────
        let feRaw = null;
        try { feRaw = sermon.functional_elements ? JSON.parse(sermon.functional_elements) : null; } catch (_) {}
        if (typeof feRaw !== "object" || feRaw === null || Array.isArray(feRaw)) feRaw = {};

        // ── Build new outline (string → {id, text}) ────────────────────────────
        const newOutline = outlineRaw.map(text => ({ id: randomUUID(), text }));

        // ── Build new functional_elements (numeric key → UUID key) ────────────
        const newFE = {};
        for (const [key, val] of Object.entries(feRaw)) {
          const idx = parseInt(key, 10);
          if (isNaN(idx)) continue; // skip non-numeric keys
          if (idx < 0 || idx >= newOutline.length) {
            console.warn(`[migration v5] sermon ${sermon.id}: functional_elements key "${key}" has no matching outline point — discarding orphan.`);
            continue;
          }
          const uuid = newOutline[idx].id;
          newFE[uuid] = {
            explanation:  typeof val?.explanation  === "string" ? val.explanation  : "",
            application:  typeof val?.application  === "string" ? val.application  : "",
            illustration: typeof val?.illustration === "string" ? val.illustration : "",
          };
        }

        dbRun(
          "UPDATE sermons SET outline = ?, functional_elements = ? WHERE id = ?",
          [JSON.stringify(newOutline), JSON.stringify(newFE), sermon.id]
        );
      }

      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '5')");
      version = 5;
    }

    if (version < 6) {
      // v6 was the legacy PC columns (topic_theme, audience_assumptions,
      // background_noise) — retired in the trail deletion sweep (Phase B1).
      // The columns may still exist in older databases; SERMON_COLUMNS no
      // longer admits writes to them, and they're not read anywhere. Version
      // bump preserved so the migration loop progresses past v6 cleanly.
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '6')");
      version = 6;
    }

    if (version < 7) {
      // v7: series study fields + sermon study guide note
      safeAlter("ALTER TABLE series ADD COLUMN redemptive_context TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN book_background TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN book_argument TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN book_structure TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN series_motivation TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN emerging_big_idea TEXT DEFAULT ''");
      safeAlter("ALTER TABLE sermons ADD COLUMN study_guide_note TEXT DEFAULT ''");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '7')");
      version = 7;
    }

    if (version < 8) {
      // v8: preaching_blocks — CMC (Contour-Mapped Compression) without-notes output
      safeAlter("ALTER TABLE sermons ADD COLUMN preaching_blocks TEXT DEFAULT 'null'");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '8')");
      version = 8;
    }

    if (version < 9) {
      // v9: manuscript_delivery — AI-formatted delivery manuscript
      safeAlter("ALTER TABLE sermons ADD COLUMN manuscript_delivery TEXT DEFAULT 'null'");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '9')");
      version = 9;
    }

    if (version < 10) {
      // v10: clean up rows seeded by the removed "See Demo" feature.
      dbRun("DELETE FROM sermons WHERE id LIKE 'demo-%'");
      dbRun("DELETE FROM series  WHERE id LIKE 'demo-%'");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '10')");
      version = 10;
    }

    if (version < 11) {
      // v11: drop sermons.big_idea — superseded by mpt/mps, never populated.
      try { dbRun("ALTER TABLE sermons DROP COLUMN big_idea"); } catch (_) {}
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '11')");
      version = 11;
    }

    if (version < 12) {
      // v12: last_tune_up — JSON wrapper {content, ts} for the most recent Tune-Up response.
      // Persisted only after a successful Final Tune-Up run on the Manuscript tab.
      safeAlter("ALTER TABLE sermons ADD COLUMN last_tune_up TEXT DEFAULT NULL");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '12')");
      version = 12;
    }

    if (version < 13) {
      // v13: settings table — user preferences as key/value strings.
      // Distinct from `meta` (which is for system-managed schema state).
      dbRun(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`);
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '13')");
      version = 13;
    }

    if (version < 14) {
      // v14: schema-contract reconciliation. Re-applies every additive ALTER
      // from v2/v4/v6/v7/v8/v9/v12 idempotently. Catches installs where a prior
      // swallowed-catch in any of those migrations skipped a column while the
      // version was bumped past it. safeAlter no-ops where the column already
      // exists; throws on any genuine error so the version bump below is
      // skipped and the migration retries on next launch.
      safeAlter("ALTER TABLE sermons ADD COLUMN functional_elements TEXT DEFAULT '{}'");
      safeAlter("ALTER TABLE sermons ADD COLUMN checklist TEXT DEFAULT '{}'");
      safeAlter("ALTER TABLE sermons ADD COLUMN section_id TEXT DEFAULT NULL");
      safeAlter("ALTER TABLE sermons ADD COLUMN is_one_off INTEGER DEFAULT 0");
      // topic_theme / audience_assumptions / background_noise removed from the
      // defensive backfill in the trail deletion sweep (Phase B1). Old
      // databases with these columns keep them as orphans; new databases never
      // get them.
      safeAlter("ALTER TABLE sermons ADD COLUMN study_guide_note TEXT DEFAULT ''");
      safeAlter("ALTER TABLE sermons ADD COLUMN preaching_blocks TEXT DEFAULT 'null'");
      safeAlter("ALTER TABLE sermons ADD COLUMN manuscript_delivery TEXT DEFAULT 'null'");
      safeAlter("ALTER TABLE sermons ADD COLUMN last_tune_up TEXT DEFAULT NULL");
      // v23 columns folded into the defensive backfill — the same swallowed-
      // catch pattern as the columns above. safeAlter is a no-op when present.
      safeAlter("ALTER TABLE sermons ADD COLUMN last_touched_position TEXT DEFAULT NULL");
      safeAlter("ALTER TABLE sermons ADD COLUMN thresholds_seen TEXT NOT NULL DEFAULT '[]'");
      safeAlter("ALTER TABLE series ADD COLUMN big_idea TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN overview TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN passage_range TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN start_date TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN end_date TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN structural_outline TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN status TEXT DEFAULT 'planning'");
      safeAlter("ALTER TABLE series ADD COLUMN canon_category TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN redemptive_context TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN book_background TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN book_argument TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN book_structure TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN series_motivation TEXT DEFAULT ''");
      safeAlter("ALTER TABLE series ADD COLUMN emerging_big_idea TEXT DEFAULT ''");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '14')");
      version = 14;
    }

    if (version < 15) {
      // v15: previously added content_hash to the library table. The library
      // feature has been removed; the migration body is empty but the version
      // bump is preserved so the migration sequence stays intact.
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '15')");
      version = 15;
    }

    if (version < 16) {
      // v16: collapse sermon stage + series status to a two-state lifecycle.
      // The 5 intermediate sermon stages (planning/study/outline/writing/ready)
      // and 2 intermediate series statuses (planning/active) duplicated the
      // workspace tab's in-progress position; "archived" was the only true
      // lifecycle terminus. See docs/CORE.md State Contract clauses 5 + 6.
      dbRun(
        `UPDATE sermons SET stage = '${SERMON_STATUS.InProgress}'
           WHERE stage IN ('planning','study','outline','writing','ready')`
      );
      dbRun(`UPDATE sermons SET stage = '${SERMON_STATUS.Complete}' WHERE stage = 'archived'`);
      dbRun(
        `UPDATE series SET status = '${SERIES_STATUS.InProgress}'
           WHERE status IN ('planning','active')`
      );
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '16')");
      version = 16;
    }

    if (version < 17) {
      // v17: spine prerequisites — canonical process-position columns. State
      // Contract #2 ("every sermon has a canonical position in the process …
      // queryable from any surface that touches the sermon") cannot be
      // enforced while position lives only in component state and localStorage.
      // These columns become the canonical position store; in the v17 era the
      // spine wrote them via `transitionState` and read them via `getSermon`.
      // (Superseded: `transitionState` was removed in Track E4; the live walk
      // stores position in `last_touched_position`, and these columns now have no
      // live updater (they retain their create-INSERT or DEFAULT value).)
      //
      // Phase G (2026-05-18) gravestone: this migration also used to insert
      // a `legacy_evidence_cutoff` meta row to carve out sermons created
      // before the Process Contract #2 enforcement pass. The empty-evidence
      // gate was deleted in Phase G; the cutoff insertion no longer runs.
      // Deployed databases that ran the original v17 retain the meta row as
      // orphaned residue — no runtime code reads it anymore. A fresh v17
      // does not write the row.
      const sermonInfo = queryAll("PRAGMA table_info(sermons)");
      const have = new Set(sermonInfo.map(r => r.name));
      if (!have.has("current_stage")) {
        dbRun(`ALTER TABLE sermons ADD COLUMN current_stage TEXT NOT NULL DEFAULT '${STAGE.Study}'`);
      }
      // current_step column add removed in the trail deletion sweep (Phase B2).
      // Position is now (stage, sub_phase) only; old databases that still
      // carry the column keep it as an orphan — SERMON_COLUMNS no longer
      // admits writes.
      if (!have.has("current_sub_phase")) {
        dbRun("ALTER TABLE sermons ADD COLUMN current_sub_phase TEXT");
      }
      // Backfill: any sermon in_progress at Study stage (the schema default)
      // gets a starting SubPhase so getSermon's ProcessPosition is fully
      // populated for new sermons too. Canonical position is (stage,
      // sub_phase) — current_step was retired in Phase B2.
      dbRun(
        `UPDATE sermons
           SET current_sub_phase = ?
         WHERE current_stage = ? AND current_sub_phase IS NULL`,
        [SUB_PHASE.Observe, STAGE.Study]
      );
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '17')");
      version = 17;
    }

    if (version < 18) {
      // v18: SPRD C3 — Sermon Frame elevation (SADI Step 5).
      // Adds a JSON column for the elevated Step 5 field-data (Intro +
      // Conclusion). Same envelope shape as the four Exegesis sub-phase
      // columns (`{[fieldKey]: {[questionKey]: {value, na}}}`); renderer
      // helpers (parseStructuredField / setQuestionAnswer / serialize)
      // manage the shape. NULL is acceptable as the empty state — sermons
      // created before this migration retain NULL until the pastor opens
      // the new Frame tab and writes content.
      const sermonInfo = queryAll("PRAGMA table_info(sermons)");
      const have = new Set(sermonInfo.map(r => r.name));
      if (!have.has("sermon_frame")) {
        dbRun("ALTER TABLE sermons ADD COLUMN sermon_frame TEXT DEFAULT NULL");
      }
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '18')");
      version = 18;
    }

    if (version < 19) {
      // v19: SADI Step 2 plumbing — MPT/MPS as proper fields.
      // Adds a JSON column for the per-question envelope holding MPT (2Q:
      // draft, tighten) and MPS (3Q: translate, gospel_check, tighten),
      // mirroring v18's sermon_frame shape. The legacy flat `mpt` and `mps`
      // columns stay defensively per migration policy. (They were auto-synced
      // from the tighten answers and read downstream in the v19 era; superseded —
      // the Word export now derives MPT/MPS from this envelope (E2) and the
      // auto-sync mirror write was retired in Track E3. The columns remain,
      // written only by direct apply-mutation.)
      // NULL is acceptable as the empty state.
      const sermonInfo = queryAll("PRAGMA table_info(sermons)");
      const have = new Set(sermonInfo.map(r => r.name));
      if (!have.has("main_point_pair")) {
        dbRun("ALTER TABLE sermons ADD COLUMN main_point_pair TEXT DEFAULT NULL");
      }
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '19')");
      version = 19;
    }

    if (version < 20) {
      // v20: ARI Phase 3 per-tab notebooks. Free-form pastor-typed notes,
      // sermon-scoped, one column per workspace tab where AI used to live.
      // Plain text. NULL is the empty state.
      const sermonInfo = queryAll("PRAGMA table_info(sermons)");
      const have = new Set(sermonInfo.map(r => r.name));
      if (!have.has("notebook_study")) {
        dbRun("ALTER TABLE sermons ADD COLUMN notebook_study TEXT DEFAULT NULL");
      }
      if (!have.has("notebook_blueprint")) {
        dbRun("ALTER TABLE sermons ADD COLUMN notebook_blueprint TEXT DEFAULT NULL");
      }
      if (!have.has("notebook_manuscript")) {
        dbRun("ALTER TABLE sermons ADD COLUMN notebook_manuscript TEXT DEFAULT NULL");
      }
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '20')");
      version = 20;
    }

    if (version < 21) {
      // v21: Per-stage sub-phase memory. `current_sub_phase` records the one
      // active position (State Contract #2). `last_*_subphase` records the
      // pastor's last position within each stage so tabbing across stages
      // restores where they were within each one. Replaces the per-sermon
      // `sermonforge_*_subphase_*` localStorage scatter that broke for tour
      // sermons (DELETE+INSERT reseeds the row but leaves localStorage stale).
      const sermonInfo = queryAll("PRAGMA table_info(sermons)");
      const have = new Set(sermonInfo.map(r => r.name));
      if (!have.has("last_study_subphase")) {
        dbRun("ALTER TABLE sermons ADD COLUMN last_study_subphase TEXT");
      }
      if (!have.has("last_assembly_subphase")) {
        dbRun("ALTER TABLE sermons ADD COLUMN last_assembly_subphase TEXT");
      }
      // Backfill from current_sub_phase where it belongs to the matching stage.
      dbRun(
        `UPDATE sermons SET last_study_subphase = current_sub_phase
           WHERE last_study_subphase IS NULL
             AND current_sub_phase IN ('Observe', 'Interpret', 'RedemptiveThread', 'Implications')`
      );
      dbRun(
        `UPDATE sermons SET last_assembly_subphase = current_sub_phase
           WHERE last_assembly_subphase IS NULL
             AND current_sub_phase IN ('Anchor', 'Outline', 'Equip', 'Frame')`
      );
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '21')");
      version = 21;
    }

    if (version < 22) {
      // v22: Full-content sermon search across every text-bearing column.
      // Previously search filtered client-side on title / passage /
      // series_title only — the notebooks, structured envelopes (observations
      // / interpretation / redemptive_thread / implications / main_point_pair
      // / sermon_frame), outline, and manuscript were invisible to search.
      // With ~40+ sermons accumulating per year, the pastor's notes need to
      // be findable across the whole library.
      //
      // Implementation: a regular SQLite table holding flattened plain text
      // for each searchable column on each sermon, with LIKE-based matching
      // (built when the main DB ran on sql.js, which lacked FTS5; better-
      // sqlite3 has FTS5 if search is ever rebuilt). Library sizes stay in the
      // low hundreds; LIKE is plenty fast at that scale. The indexer keeps
      // this table in sync via validateAndCommit hooks; the first-launch
      // backfill below handles existing sermons.
      // Built from SERMON_SEARCH_COLUMNS — the single source of truth the indexer
      // (indexSermonFtsFromRow) writes against — so the table schema and the
      // indexer can't drift. A hardcoded column list here that omitted a live
      // indexer column (functional_elements) made the backfill INSERT below throw
      // ("no column named functional_elements"), which rolled back the whole
      // migration transaction and BOOT-LOCKED any pre-v22 library that actually
      // had sermon rows (a fresh install has 0 rows, so the loop never ran and the
      // mismatch stayed invisible). v24 already builds the table this way; v22 now
      // matches. The exact historical column set is irrelevant — v24 drops and
      // recreates this table — only that the v22 backfill can write into it.
      dbRun(`CREATE TABLE IF NOT EXISTS sermon_search (
        sermon_id TEXT PRIMARY KEY,
        ${SERMON_SEARCH_COLUMNS.map((c) => `${c.key} TEXT NOT NULL DEFAULT ''`).join(",\n      ")}
      )`);
      // Backfill: index every existing sermon. Cheap for typical libraries
      // (~40-100 sermons); a no-op on a fresh install with zero rows.
      const rows = queryAll(
        `SELECT s.*, sr.title AS series_title
           FROM sermons s
           LEFT JOIN series sr ON sr.id = s.series_id`
      );
      for (const row of rows) {
        indexSermonFtsFromRow(row);
      }
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '22')");
      version = 22;
    }

    if (version < 23) {
      // v23: trail deletion sweep (Phase D1). Two columns drive the new
      // workspace surfaces' session re-entry and threshold-orientation logic:
      //   - last_touched_position: TEXT, NULL = first session (sermon-start
      //     landing fires); non-NULL = land on that field on re-open. Stored
      //     as the canonical slash-composite "<stage>/<subPhase>/<fieldKey>"
      //     so it parses cleanly without a JSON round-trip.
      //   - thresholds_seen: TEXT (JSON array of dismissed threshold ids).
      //     One mechanism for "has this threshold been dismissed" across
      //     sermon-start, Study→Anchor handoff, and any future threshold —
      //     so we don't end up with one boolean per threshold over time.
      safeAlter("ALTER TABLE sermons ADD COLUMN last_touched_position TEXT DEFAULT NULL");
      safeAlter("ALTER TABLE sermons ADD COLUMN thresholds_seen TEXT NOT NULL DEFAULT '[]'");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '23')");
      version = 23;
    }

    if (version < 24) {
      // v24 (UX overhaul, 2026-06-10), two coordinated changes:
      //
      // (a) Soft delete — deleted_at NULL = live, ISO timestamp = deleted.
      //     Deleting becomes recoverable (undo affordances on the list
      //     surfaces; no Trash UI yet). deleted_at is deliberately NOT in
      //     SERMON_COLUMNS: only main's delete-sermon / restore-sermon ops
      //     write it, never the renderer's update path.
      safeAlter("ALTER TABLE sermons ADD COLUMN deleted_at TEXT DEFAULT NULL");
      //
      // (b) sermon_search rebuild — functional_elements (the sermon body,
      //     previously invisible to search) in; delivery_notes/timing_notes
      //     out (their stage UI is gone — dead weight in the index). The
      //     table is recreated FROM SERMON_SEARCH_COLUMNS so the schema and
      //     the indexer can't drift.
      dbRun("DROP TABLE IF EXISTS sermon_search");
      dbRun(`CREATE TABLE sermon_search (
        sermon_id TEXT PRIMARY KEY,
        ${SERMON_SEARCH_COLUMNS.map((c) => `${c.key} TEXT NOT NULL DEFAULT ''`).join(",\n      ")}
      )`);
      const v24rows = queryAll(
        `SELECT s.*, sr.title AS series_title
           FROM sermons s
           LEFT JOIN series sr ON sr.id = s.series_id`
      );
      for (const row of v24rows) {
        indexSermonFtsFromRow(row);
      }
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '24')");
      version = 24;
    }

    if (version < 25) {
      // v25 (canonical-books build, Prompt 2) — two coordinated changes.
      //
      // (a) book_id: the stable key of a canonical book (e.g. "luke") from the
      //     bundled src/data/canonicalBooks.js reference module. Nullable — a
      //     series with no chosen book stays NULL. It rides the normal create-
      //     then-update path: book_id is in SERIES_COLUMNS, so the debounced
      //     update-series write gates through buildUpdate. The create-series
      //     INSERT is deliberately NOT widened (charter ruling).
      safeAlter("ALTER TABLE series ADD COLUMN book_id TEXT DEFAULT NULL");
      //
      // (b) canon_category enum switch — legacy 4-value scheme
      //     (ot|nt|wisdom|prophetic) -> Dever's 7 genre keys. Migrate the two
      //     unambiguous values; the two testament-only values are too coarse to
      //     place, so they become NULL (rendered "unclassified", fixable by
      //     picking the book). '' (never-set) is left as-is, also "unclassified".
      //       wisdom    -> ot_writings
      //       prophetic -> ot_prophets
      //       ot | nt   -> NULL
      dbRun("UPDATE series SET canon_category = 'ot_writings' WHERE canon_category = 'wisdom'");
      dbRun("UPDATE series SET canon_category = 'ot_prophets' WHERE canon_category = 'prophetic'");
      dbRun("UPDATE series SET canon_category = NULL WHERE canon_category IN ('ot', 'nt')");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '25')");
      version = 25;
    }

    if (version < 26) {
      // v26 (Series Planner re-leveling, Step 2) — two coordinated changes.
      //
      // (a) melodic_evidence: a nullable JSON column for the forthcoming
      //     "Hear the line" worksheet (labeled evidence slots the pastor fills).
      //     Unused for now — the schema is prepped here so the next step is pure
      //     UI. It rides the create-then-update path: melodic_evidence is in
      //     SERIES_COLUMNS, so the debounced update-series write gates through
      //     buildUpdate. The create-series INSERT is deliberately NOT widened
      //     (charter ruling), exactly like book_id (v25).
      safeAlter("ALTER TABLE series ADD COLUMN melodic_evidence TEXT DEFAULT NULL");
      //
      // (b) Field collapse — book_structure ("How the Book Is Built") and
      //     structural_outline are the same thing (the book's literary shape) in
      //     two forms. Fold book_structure INTO structural_outline so structure
      //     lives in ONE place across the UI and the export. This is a run-ONCE
      //     backfill gated by the version mechanism (NOT a content check), so a
      //     restart never appends a second time. book_structure is left INTACT in
      //     the DB as a backup — we only stop reading/rendering it after this.
      const v26rows = queryAll(
        "SELECT id, structural_outline, book_structure FROM series WHERE book_structure IS NOT NULL AND TRIM(book_structure) != ''"
      );
      for (const row of v26rows) {
        const merged = (row.structural_outline || "").trim()
          ? `${row.structural_outline}\n\n${row.book_structure}`
          : row.book_structure;
        dbRun("UPDATE series SET structural_outline = ? WHERE id = ?", [merged, row.id]);
      }
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '26')");
      version = 26;
    }

    if (version < 27) {
      // v27 (Series Planner content-model rebuild) — the planner becomes the
      // pastor's real three-level series document (Book ▸ Section ▸ Sermon),
      // every level the same unit: Title + range · Big idea · Overview.
      //
      // (a) Sermon-level big idea + overview on the sermon row. `big_idea` was
      //     dropped from sermons back in v11 (superseded then by mpt/mps); it
      //     returns here with fresh semantics — the one-line big idea of a
      //     sermon, distinct from the sermon's MPT/MPS. `overview` is the
      //     sermon's paragraph (its study-guide commentary body). Both ride the
      //     create-then-update path: they are in SERMON_COLUMNS so debounced
      //     update-sermon writes gate through buildUpdate; the create-sermon
      //     INSERT is deliberately NOT widened (slot draft/commit ruling).
      safeAlter("ALTER TABLE sermons ADD COLUMN big_idea TEXT DEFAULT ''");
      safeAlter("ALTER TABLE sermons ADD COLUMN overview TEXT DEFAULT ''");
      //
      // (b) study_guide_extras: a nullable JSON column for the guide-local layer
      //     of each sermon's study-guide page — { additions: [{id,type,text}],
      //     notesLines: int }. The booklet's imported content is a live projection
      //     of the Outline; only these pastor-authored additions + blank-notes
      //     sizing are stored, so re-importing never wipes them (they live here,
      //     and Import never writes this column). Rides create-then-update.
      safeAlter("ALTER TABLE sermons ADD COLUMN study_guide_extras TEXT DEFAULT NULL");
      //
      // (c) Fold the retired per-sermon study_guide_note INTO the new overview
      //     where the pastor wrote a note and overview is still empty (the pastor
      //     asked to kill the double-entry). Run-ONCE, version-gated (NOT a content
      //     check), so a restart never folds twice. study_guide_note is left INTACT
      //     in the DB as a backup — it is simply retired from the writable set.
      const v27rows = queryAll(
        "SELECT id, study_guide_note, overview FROM sermons WHERE study_guide_note IS NOT NULL AND TRIM(study_guide_note) != ''"
      );
      for (const row of v27rows) {
        if (!(row.overview || "").trim()) {
          dbRun("UPDATE sermons SET overview = ? WHERE id = ?", [row.study_guide_note, row.id]);
        }
      }
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '27')");
      version = 27;
    }

    if (version < 28) {
      // v28 (Series Planner) — no "in a series but in no section" limbo. Every
      // sermon is either under a section of a series, or standalone (no series).
      // Normalize existing data, run-once / version-gated:
      //   • a section-less sermon whose series still exists → placed into that
      //     series' first section (auto-create "Section 1" if it has none);
      //   • a sermon whose series_id points at a series that no longer exists
      //     (a dangling reference) → standalone (series_id NULL).
      // Data-only (no DDL), so the column allowlists / assertSchemaContract are
      // untouched.
      // NOTE: the resolve-or-create-"Section 1" logic below predates the shared
      // `firstSectionIdForSeries` helper (added with v29) and is left inline on
      // purpose — this is shipped, version-gated migration code and must not be
      // functionally rewritten. The duplication is deliberate, but the
      // `series_sections` INSERT column list here MUST stay in sync with the
      // helper's if that table's shape ever changes.
      const v28limbo = queryAll(
        "SELECT id, series_id FROM sermons WHERE series_id IS NOT NULL AND section_id IS NULL AND deleted_at IS NULL"
      );
      const firstSectionBySeries = {};
      for (const row of v28limbo) {
        const seriesExists = queryOne("SELECT id FROM series WHERE id = ?", [row.series_id]);
        if (!seriesExists) {
          dbRun("UPDATE sermons SET series_id = NULL WHERE id = ?", [row.id]);
          continue;
        }
        let sectionId = firstSectionBySeries[row.series_id];
        if (sectionId === undefined) {
          const sec = queryOne(
            "SELECT id FROM series_sections WHERE series_id = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1",
            [row.series_id]
          );
          if (sec) {
            sectionId = sec.id;
          } else {
            sectionId = randomUUID();
            dbRun(
              "INSERT INTO series_sections (id, series_id, title, passage_range, big_idea, overview, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [sectionId, row.series_id, "Section 1", "", "", "", 0]
            );
          }
          firstSectionBySeries[row.series_id] = sectionId;
        }
        dbRun("UPDATE sermons SET section_id = ? WHERE id = ?", [sectionId, row.id]);
      }
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '28')");
      version = 28;
    }

    if (version < 29) {
      // v29 (Series Planner) — re-heal the no-"section-less limbo" invariant.
      // v28 normalized once and is version-gated, but the create-sermon path did
      // NOT enforce the invariant until this build: a sermon created under a
      // series via the New Sermon modal (which auto-selects the lone in-progress
      // series) got series_id but no section_id, so it was invisible in the
      // Outline though it surfaced in the Schedule + study guide. This is an
      // idempotent re-run of the v28 normalize to catch any such rows already on
      // disk; the create-sermon handler now prevents new ones. Data-only (no DDL),
      // column allowlists / assertSchemaContract untouched.
      const v29limbo = queryAll(
        "SELECT id, series_id FROM sermons WHERE series_id IS NOT NULL AND section_id IS NULL AND deleted_at IS NULL"
      );
      for (const row of v29limbo) {
        const seriesExists = queryOne("SELECT id FROM series WHERE id = ?", [row.series_id]);
        if (!seriesExists) {
          dbRun("UPDATE sermons SET series_id = NULL WHERE id = ?", [row.id]);
          continue;
        }
        dbRun("UPDATE sermons SET section_id = ? WHERE id = ?", [firstSectionIdForSeries(row.series_id), row.id]);
      }
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '29')");
      version = 29;
    }

    if (version < 30) {
      // v30 (Topical Series mode) — two additive columns for the theme-led
      // planner mode (charter: docs/PROPOSALS/series-planner-revival-charter.md,
      // "2026-06-25 — Topical Series mode").
      //
      // (a) series.kind: the explicit mode discriminator, 'book' | 'topical'.
      //     DEFAULT 'book' so every existing series AND every future book series
      //     reads correctly with NO backfill. It is deliberately NOT inferred
      //     from book_id being NULL — a book series also has a null book_id
      //     mid-create (create-then-update writes the name first, the book
      //     second), so "no book yet" and "topical theme" would be
      //     indistinguishable. In SERIES_COLUMNS, so it persists via updateSeries;
      //     the create-series INSERT is NOT widened (do-not-widen-INSERT ruling) —
      //     a failed follow-up leaves the 'book' default, the recoverable state.
      safeAlter("ALTER TABLE series ADD COLUMN kind TEXT DEFAULT 'book'");
      // (b) sermons.sort_order: pastor-authored per-sermon order for a topical
      //     series' flat sermon list (a theme has no book reading order to lean
      //     on). Nullable — NULL sorts last via COALESCE in seriesSermonOrderBy,
      //     the same way the section tiebreak already handles section-less rows,
      //     so book-series sermons keep NULL and still order by their section. In
      //     SERMON_COLUMNS, so the reorder control persists via updateSermon; the
      //     create-sermon INSERT is NOT widened (slot draft/commit ruling).
      //     (The ordering READ is live in the same release — the COALESCE(sort_order)
      //     term in seriesSermonOrderBy, consumed by every series-sermon fetch.)
      safeAlter("ALTER TABLE sermons ADD COLUMN sort_order INTEGER DEFAULT NULL");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '30')");
      version = 30;
    }

    if (version < 31) {
      // v31 (Coverage Initiative, Phase 1) — structured per-sermon book for the
      // topical Series Planner. A topical sermon's book previously lived ONLY in
      // its free-text `passage` string, so topical series were invisible to the
      // Series Arc (which counts one book PER SERIES). book_id makes a topical
      // sermon's book structured + queryable; the Arc reworks to sermon-grain in
      // Phase 2 (charter: docs/PROPOSALS/coverage-initiative.md).
      //
      //   sermons.book_id: the stable canonical-book key (mirrors series.book_id,
      //   keys into src/data/canonicalBooks.js). Nullable — book-series sermons
      //   stay NULL and inherit series.book_id via the effective-book helper
      //   (sermon.book_id ?? series.book_id); only topical sermons carry their
      //   own. In SERMON_COLUMNS, so the Book picker persists via updateSermon;
      //   the create-sermon INSERT is NOT widened (slot draft/commit ruling) —
      //   book_id rides the create-then-update follow-up.
      safeAlter("ALTER TABLE sermons ADD COLUMN book_id TEXT DEFAULT NULL");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '31')");
      version = 31;
    }

    if (version < 32) {
      // v32 (Coverage Initiative, Phase 3) — sermon-level topic tags. A free-form,
      // reusable JSON array of topic strings tagged at the moment of prep in the
      // sermon workspace; powers the Topics lens ("show what I've covered", never a
      // scorecard) and the own-tag autocomplete (charter: docs/PROPOSALS/coverage-initiative.md).
      //
      //   sermons.tags: JSON array of topic strings, mirroring the thresholds_seen
      //   column pattern (TEXT NOT NULL DEFAULT '[]', fail-soft parse). Sermon-level
      //   (not series) so the Topics lens reaches INTO book series. In SERMON_COLUMNS,
      //   so it persists via updateSermon; the create-sermon INSERT is NOT widened —
      //   tags ride the workspace autosave. No new table at one-pastor scale: the
      //   autocomplete + Topics view aggregate by scanning this column.
      safeAlter("ALTER TABLE sermons ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '32')");
      version = 32;
    }

    if (version < 33) {
      // v33 (OEM restructure, 2026-07-02) — the decide/write boundary. Equip
      // moved from Assembly into Manuscript as the Body sub-phase; the Frame
      // sub-phase collapsed into the Manuscript door fields. This migration
      // (a) gives Manuscript its per-stage memory column, and (b) rewrites
      // every legacy position value so in-flight sermons land at the ruled
      // shape's equivalent spot — a one-time rewrite, not a permanent read
      // coercion (rulings of record: docs/handoff/oem-walk-rulings-2026-07-01.md).
      //
      // Position mapping: Assembly/Equip → Manuscript/Body (same field);
      // Assembly/Frame → Manuscript doors (intro → introduction; conclusion
      // keeps its key). Old "Manuscript/Manuscript/<field>" composites (the
      // stage had no sub-phase) → "Manuscript/IntroTransitionsConclusion/".
      // last_assembly_subphase Equip/Frame values fall back to Outline (the
      // last sub-phase still in Assembly). thresholds_seen field-overview ids
      // are deliberately NOT rewritten — a stale id just re-opens that field's
      // teaching once, and the reworded teaching deserves the re-show.
      safeAlter("ALTER TABLE sermons ADD COLUMN last_manuscript_subphase TEXT");
      // These two reads MUST run before the current_sub_phase rewrites below
      // (those destroy the Equip/Frame values matched here). The column is freshly
      // added and unwritten, and the two predicates are mutually exclusive, so no
      // IS NULL guard is needed to keep them from colliding.
      dbRun(`UPDATE sermons SET last_manuscript_subphase = 'Body'
               WHERE current_sub_phase = 'Equip'`);
      dbRun(`UPDATE sermons SET last_manuscript_subphase = 'IntroTransitionsConclusion'
               WHERE current_sub_phase = 'Frame' OR current_stage = 'Manuscript'`);
      dbRun(`UPDATE sermons SET current_stage = 'Manuscript', current_sub_phase = 'Body'
               WHERE current_sub_phase = 'Equip'`);
      dbRun(`UPDATE sermons SET current_stage = 'Manuscript', current_sub_phase = 'IntroTransitionsConclusion'
               WHERE current_sub_phase = 'Frame'`);
      dbRun(`UPDATE sermons SET current_sub_phase = 'IntroTransitionsConclusion'
               WHERE current_stage = 'Manuscript'
                 AND (current_sub_phase IS NULL OR current_sub_phase = 'Manuscript')`);
      dbRun(`UPDATE sermons SET last_assembly_subphase = 'Outline'
               WHERE last_assembly_subphase IN ('Equip', 'Frame')`);
      dbRun(`UPDATE sermons SET last_touched_position = REPLACE(last_touched_position, 'Assembly/Equip/', 'Manuscript/Body/')
               WHERE last_touched_position LIKE 'Assembly/Equip/%'`);
      dbRun(`UPDATE sermons SET last_touched_position = 'Manuscript/IntroTransitionsConclusion/introduction'
               WHERE last_touched_position LIKE 'Assembly/Frame/intro%'`);
      dbRun(`UPDATE sermons SET last_touched_position = 'Manuscript/IntroTransitionsConclusion/conclusion'
               WHERE last_touched_position LIKE 'Assembly/Frame/conclusion%'`);
      dbRun(`UPDATE sermons SET last_touched_position = REPLACE(last_touched_position, 'Manuscript/Manuscript/', 'Manuscript/IntroTransitionsConclusion/')
               WHERE last_touched_position LIKE 'Manuscript/Manuscript/%'`);
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '33')");
      version = 33;
    }

    if (version < 34) {
      // v34 (Series Discovery, feature/series-discovery) — the exegetical front
      // screen of the Series Planner. Discovery and Outline are two views of ONE
      // pastor-authored series: a "major movement" IS a real series_sections row,
      // a "preaching text" IS a real sermons row, and their canonical fields
      // (title/passage/big_idea/overview) are shared, not duplicated. Only the
      // Discovery-only *reasoning* — the pastor's own words that cannot truthfully
      // live in a clean planner field — is new state (charter:
      // docs/PROPOSALS/series-discovery.md).
      //
      // One nullable JSON envelope column named `discovery` per entity, mirroring
      // the house idiom (study_guide_extras, sermon_frame, the Study sub-phase
      // columns): fail-soft parsed, explicit keys, never an opaque blob. Per-entity
      // so it rides the existing update* create-then-update paths AND shares each
      // row's lifecycle — a deleted section/sermon takes its Discovery reasoning
      // with it (no ghost, no orphan cleanup).
      //
      // Each envelope is a FLAT object of well-known keys (fail-soft parse +
      // shallow merge in src/utils/discovery.js — a spread can't drop a sibling):
      //   series.discovery          — readNotes; understand{WhyWritten,Situation,
      //                               Problem,Response,WantsReaderTo}; decisions[]
      //                               (≤3); bigIdea{Burden,Recurring,Response,
      //                               Unifier,CandidateA,CandidateB}. The FINAL
      //                               canonical Series Big Idea stays
      //                               series.big_idea; the Overview stays
      //                               series.overview.
      //   series_sections.discovery — { whyBegin, whyEnd } (movement boundaries).
      //   sermons.discovery         — { whyBegin, whyEnd, subject, complement,
      //                               authorialFunction, authorialFunctionOther }
      //                               (preaching-text boundaries + subject/
      //                               complement/authorial function).
      //
      // All three additive + nullable (no backfill, no columns dropped) and in the
      // *_COLUMNS writable sets, so they persist via updateSeries/Section/Sermon —
      // the create INSERTs are NEVER widened (do-not-widen-INSERT ruling). `discovery`
      // is deliberately NOT added to sermon_search: it is reasoning, not manuscript
      // content.
      safeAlter("ALTER TABLE series ADD COLUMN discovery TEXT DEFAULT NULL");
      safeAlter("ALTER TABLE series_sections ADD COLUMN discovery TEXT DEFAULT NULL");
      safeAlter("ALTER TABLE sermons ADD COLUMN discovery TEXT DEFAULT NULL");
      dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '34')");
      version = 34;
    }

    // True when at least one block actually ran. Lets initDatabase skip the
    // boot-time flush on a clean boot of an up-to-date DB — so a healthy library
    // is never re-serialized and rotated over its own backup for no reason.
    return version !== initialVersion;
  }

  // Verify the live schema matches the SERMON_COLUMNS / SERIES_COLUMNS allowlists
  // used by buildUpdate(). A missing column means a prior migration silently
  // skipped its ALTER and bumped the version regardless. v14 should heal this on
  // the launch it fires; assertSchemaContract is the canary that confirms it did.
  // Logs only — does not throw — so a degraded-but-functional install keeps booting.

  function assertSchemaContract() {
    const missing = [];
    const sermonInfo = queryAll("PRAGMA table_info(sermons)");
    const actualSermons = new Set(sermonInfo.map(r => r.name));
    for (const col of SERMON_COLUMNS) {
      if (!actualSermons.has(col)) missing.push(`sermons.${col}`);
    }
    const seriesInfo = queryAll("PRAGMA table_info(series)");
    const actualSeries = new Set(seriesInfo.map(r => r.name));
    for (const col of SERIES_COLUMNS) {
      if (!actualSeries.has(col)) missing.push(`series.${col}`);
    }
    // series_sections joined the canary in v34 (Series Discovery), when the
    // section allowlist gained its first column beyond the CREATE TABLE set
    // (`discovery`). A missing writable section column rejects the whole
    // updateSection in production exactly as a missing sermon/series column
    // does, so it deserves the same boot-time canary.
    const sectionInfo = queryAll("PRAGMA table_info(series_sections)");
    const actualSections = new Set(sectionInfo.map(r => r.name));
    for (const col of SECTION_COLUMNS) {
      if (!actualSections.has(col)) missing.push(`series_sections.${col}`);
    }
    if (missing.length > 0) {
      logError(
        `[DB] schema contract violation: missing columns [${missing.join(", ")}]`,
        new Error("schema mismatch — buildUpdate writes to these columns will silently drop in production")
      );
    }
  }


  // buildUpdate — the allowlist gate for every field-update mutation. An
  // unknown supplied field REJECTS THE ENTIRE MUTATION, identically in
  // development and production (Session-3 Part C). The old shape — dev-throw
  // but packaged warn-and-DROP — saved the recognized sibling fields and
  // reported success, so a renderer↔main allowlist drift silently shed the
  // unknown field's data while the pastor saw "Saved". Now nothing is
  // written and the rejection names the refused fields. (isDev remains a
  // factory input; this gate deliberately no longer branches on it.)
  function buildUpdate(fields, allowedColumns) {
    const rejected = Object.keys(fields).filter((k) => !allowedColumns.has(k));
    if (rejected.length > 0) {
      logError(`[buildUpdate] rejecting whole update — unknown field(s): [${rejected.join(", ")}]`);
      return rejection(
        "STATE_5_UNKNOWN_FIELD",
        "State #5",
        `Unknown field(s): [${rejected.join(", ")}]. The whole update was refused — no fields were saved.`,
      );
    }

    const entries = Object.entries(fields);
    if (!entries.length) return null;
    return {
      setClauses: entries.map(([k]) => `${k} = ?`).join(", "),
      values: entries.map(([, v]) => v),
    };
  }

  // Shared ORDER BY for sermons within a series: undated slots ('' / NULL) sort
  // AFTER dated ones, then by date. One definition so the planner list, the
  // workspace "Sermon N of M" breadcrumb, and the study-guide export stay in
  // lockstep and can't drift (audit M4). `prefix` is a table alias like "s." when
  // the query joins. `sectionOrderCol` (e.g. "ss.sort_order") puts undated units
  // in OUTLINE READING ORDER — section, then creation — so the Schedule's undated
  // pool and the breadcrumb walk the book top to bottom instead of by raw
  // created_at; dated units still order by date (the section term only breaks
  // date ties). Callers that join sections pass it; the term is a no-op for dated
  // rows, so adding the join never changes dated-only output.
  //
  // Topical Series mode (v30): a per-sermon `sort_order` term sits between the
  // section term and created_at. A topical series has no book reading order, so
  // its undated sermons line up by the pastor's own arrangement (sort_order). The
  // term is COALESCE(..., 1000000) so book-series sermons (sort_order always NULL)
  // are unaffected — they still walk section-then-creation. The sermons table
  // always carries sort_order, so every "s."-prefixed caller can read it.
  function seriesSermonOrderBy(prefix = "", sectionOrderCol = null) {
    const d = `${prefix}date`;
    const c = `${prefix}created_at`;
    const sec = sectionOrderCol ? `COALESCE(${sectionOrderCol}, 1000000) ASC, ` : "";
    const ord = `COALESCE(${prefix}sort_order, 1000000) ASC, `;
    return `ORDER BY CASE WHEN ${d} IS NULL OR ${d} = '' THEN 1 ELSE 0 END, ${d} ASC, ${sec}${ord}${c} ASC`;
  }

  // ── Sermon search indexer (v22) ───────────────────────────────────────────────
  //
  // Maintains the `sermon_search` table in sync with `sermons`. Every
  // create / update / delete in `validateAndCommit` calls `indexSermonFts(id)`
  // so the search row reflects current state. JSON-envelope columns
  // (observations / interpretation / redemptive_thread / implications /
  // main_point_pair / sermon_frame / outline / manuscript) are flattened to
  // concatenated text so search hits read as natural prose instead of
  // tokenizing on `{`, `}`, and `"`.
  //
  // Why not FTS5: the search table predates the better-sqlite3 driver swap —
  // sql.js didn't compile FTS5, so the search table is a regular SQLite table
  // with the flattened text stored column-by-column;
  // search runs as LIKE matching across the indexed columns + JS-side
  // snippet generation. Fast enough at typical pastor library sizes
  // (under ~500 sermons).

  // Walk a parsed JSON value, concatenating every string leaf with a space.
  // Returns "" for null / undefined / non-string-non-collection scalars.
  function flattenJsonToText(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return "";
    if (Array.isArray(value)) {
      return value.map(flattenJsonToText).filter(Boolean).join(" ");
    }
    if (typeof value === "object") {
      return Object.values(value).map(flattenJsonToText).filter(Boolean).join(" ");
    }
    return "";
  }

  // Parse a JSON string column (defensive — returns "" if invalid).
  function extractJsonText(raw) {
    if (!raw || typeof raw !== "string") return "";
    try {
      return flattenJsonToText(JSON.parse(raw));
    } catch {
      // Legacy plain-text values get indexed as-is.
      return raw;
    }
  }

  // The set of columns the search row carries, paired with which sermon
  // column to source from. Used by both the indexer and the snippet pass.
  // Order is intentional — earlier entries take precedence in the snippet
  // "which column matched" report.
  const SERMON_SEARCH_COLUMNS = [
    { key: "title",               source: "title",               json: false },
    { key: "passage",             source: "passage",             json: false },
    { key: "series_title",        source: "series_title",        json: false },
    { key: "manuscript",          source: "manuscript",          json: true  },
    { key: "notebook_study",      source: "notebook_study",      json: false },
    { key: "notebook_blueprint",  source: "notebook_blueprint",  json: false },
    { key: "notebook_manuscript", source: "notebook_manuscript", json: false },
    { key: "main_point_pair",     source: "main_point_pair",     json: true  },
    { key: "sermon_frame",        source: "sermon_frame",        json: true  },
    { key: "observations",        source: "observations",        json: true  },
    { key: "interpretation",      source: "interpretation",      json: true  },
    { key: "redemptive_thread",   source: "redemptive_thread",   json: true  },
    { key: "implications",        source: "implications",        json: true  },
    { key: "outline",             source: "outline",             json: true  },
    // v24: functional_elements (the sermon body — explanation/illustration/
    // application prose under each outline point) replaced delivery_notes +
    // timing_notes, which indexed columns whose stage UI no longer exists.
    { key: "functional_elements", source: "functional_elements", json: true  },
  ];

  // Index a sermon row (with joined series_title) into sermon_search.
  // Caller passes a row object that already has the JOIN result populated.
  function indexSermonFtsFromRow(row) {
    if (!row || !row.id) return;
    dbRun("DELETE FROM sermon_search WHERE sermon_id = ?", [row.id]);
    const values = [row.id];
    for (const col of SERMON_SEARCH_COLUMNS) {
      const raw = row[col.source];
      values.push(col.json ? extractJsonText(raw) : (raw || ""));
    }
    const colNames = SERMON_SEARCH_COLUMNS.map((c) => c.key).join(", ");
    const placeholders = SERMON_SEARCH_COLUMNS.map(() => "?").join(", ");
    dbRun(
      `INSERT INTO sermon_search (sermon_id, ${colNames}) VALUES (?, ${placeholders})`,
      values,
    );
  }

  // Look up the sermon (+ joined series title) and re-index. Used by
  // validateAndCommit after every sermon write.
  function indexSermonFts(sermonId) {
    if (!sermonId) return;
    const row = queryOne(
      `SELECT s.*, sr.title AS series_title
         FROM sermons s
         LEFT JOIN series sr ON sr.id = s.series_id
        WHERE s.id = ?`,
      [sermonId],
    );
    if (row) indexSermonFtsFromRow(row);
  }

  // Drop the sermon's search row. Used by delete-sermon.
  function dropSermonFts(sermonId) {
    if (!sermonId) return;
    dbRun("DELETE FROM sermon_search WHERE sermon_id = ?", [sermonId]);
  }


  // ── Spine — the only sermon/series state surface ─────────────────────────────
  //
  // All renderer-side reads, creates, updates, and deletes of sermon, series,
  // or series_section state route through `ipcMain.handle("spine", ...)`. The
  // renderer-side companion is `src/core/spine.ts`; the integrity gate
  // (`scripts/spine-integrity.js`) blocks any code path that would let a
  // caller bypass this routing.
  //
  // validateAndCommit — single mutation gate
  // ────────────────────────────────────────
  // Mutations cross the boundary as discriminated envelopes; this function is
  // the only place that writes sermon/series state. It cites the violated
  // contract clause on every rejection so the renderer-side ContractViolation
  // carries the same citation. Reads are routed through the same channel for
  // uniformity but bypass the validation switch.

  // _legacyEvidenceCutoffCache + getLegacyEvidenceCutoff + isLegacySermon
  // deleted in the trail deletion sweep (Phase G, 2026-05-18). These existed
  // only to feed the Process #2 empty-evidence rejection in the then-live
  // `transitionState` wall layer — when that rejection went, every consumer of
  // the cutoff machinery went with it (shapeSermon's `legacy:` field deleted;
  // Sermon interface's `legacy: boolean` field deleted from src/core/contracts.ts).
  // (`transitionState` itself was later removed entirely in Track E4.)
  // The v17 `legacy_evidence_cutoff` meta-table row remains in deployed
  // databases as orphaned residue — the migration step that inserted it has
  // been gravestoned at its insertion site (~line 745). No runtime code
  // reads the row anymore; it is harmless data.

  function rejection(code, clause, message) {
    return { ok: false, code, clause, message };
  }
  function success(value) {
    return { ok: true, value: value === undefined ? null : value };
  }

  // ── Row → canonical-shape helpers ────────────────────────────────────────────

  function shapeSermon(row, parentContext) {
    if (!row) return null;
    // Legacy Blueprint / Frame coercion removed in the trail deletion sweep
    // (Phase B3) — no production data carries those values.
    const stage = row.current_stage;
    const out = {
      // Canonical shape (per src/core/contracts.ts `Sermon`).
      id: row.id,
      name: row.title || "",
      status: row.stage || SERMON_STATUS.InProgress,
      position: {
        stage,
        subPhase: row.current_sub_phase || undefined,
      },
      parentContext: parentContext || null,
      passage: row.passage || "",
      date: row.date || "",
      preacher: row.preacher || "",
      // `legacy: isLegacySermon(row)` deleted in Phase G (2026-05-18) — the
      // field had no readers in src/; it existed only to mirror the wall-side
      // Process #2 carve-out, which itself died with G.
      // Backward-compat raw row fields. Existing components read these directly;
      // migration to the canonical shape (Sermon.name, Sermon.position) is gradual.
      ...row,
      current_stage: stage,
    };
    return out;
  }

  function shapeSeries(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.title || "",
      status: row.status || SERIES_STATUS.InProgress,
      year: row.year || new Date().getFullYear(),
      color: row.color || "gold",
      ...row,
    };
  }

  function fetchSermonRow(id) {
    const rows = queryAll(
      `SELECT s.*, sr.title as series_title, sr.color as series_color
       FROM sermons s
       LEFT JOIN series sr ON s.series_id = sr.id
       WHERE s.id = ?`,
      [id],
    );
    return rows[0] || null;
  }

  function computeParentContext(row) {
    if (!row || !row.series_id) return null;
    // Soft-deleted siblings must not inflate the position-in-series count
    // (Mutation #4 / audit L6). Undated slots sort AFTER dated ones so partial
    // scheduling doesn't scramble "Sermon N of M" (audit M4) — empty-string
    // dates would otherwise sort first under BINARY collation.
    const siblings = queryAll(
      `SELECT s.id FROM sermons s
        LEFT JOIN series_sections ss ON s.section_id = ss.id
        WHERE s.series_id = ? AND s.deleted_at IS NULL
        ${seriesSermonOrderBy("s.", "ss.sort_order")}`,
      [row.series_id],
    );
    const idx = siblings.findIndex((s) => s.id === row.id);
    if (idx === -1) return null;
    return {
      seriesId: row.series_id,
      seriesName: row.series_title || "",
      positionInSeries: idx + 1,
      totalInSeries: siblings.length,
    };
  }

  // ── Read router — no validation, returns enriched shapes ─────────────────────

  function spineRead(op, payload) {
    switch (op) {
      case "get-sermon": {
        const row = fetchSermonRow(payload);
        return shapeSermon(row, computeParentContext(row));
      }
      case "get-series": {
        const rows = queryAll("SELECT * FROM series WHERE id = ?", [payload]);
        return shapeSeries(rows[0]);
      }
      case "get-all-sermons":
        return queryAll(
          `SELECT s.*, sr.title as series_title, sr.color as series_color
           FROM sermons s LEFT JOIN series sr ON s.series_id = sr.id
           WHERE s.id NOT LIKE 'sample-%'
             AND s.deleted_at IS NULL
           ORDER BY s.date DESC, s.created_at DESC`,
        ).map((r) => shapeSermon(r, computeParentContext(r)));
      case "get-all-series":
        return queryAll(
          "SELECT * FROM series WHERE id NOT LIKE 'sample-%' ORDER BY year DESC, title ASC",
        ).map(shapeSeries);
      case "get-recent-sermons":
        return queryAll(
          `SELECT s.*, sr.title as series_title, sr.color as series_color
           FROM sermons s LEFT JOIN series sr ON s.series_id = sr.id
           WHERE s.stage != ?
             AND s.id NOT LIKE 'sample-%'
             AND s.deleted_at IS NULL
           ORDER BY s.updated_at DESC, s.created_at DESC
           LIMIT ?`,
          [SERMON_STATUS.Complete, payload?.limit ?? 3],
        ).map((r) => shapeSermon(r, computeParentContext(r)));
      case "get-recent-series":
        // The series table has no created_at / updated_at columns, so the old
        // COALESCE(updated_at, created_at) ORDER BY threw whenever this op ran
        // (audit L7). Order by the columns that exist, matching get-all-series.
        return queryAll(
          `SELECT * FROM series
           WHERE id NOT LIKE 'sample-%'
           ORDER BY year DESC, title ASC
           LIMIT ?`,
          [payload?.limit ?? 3],
        ).map(shapeSeries);
      case "get-in-progress-sermons":
        // State Contract #6: in-progress work is queryable from the front door.
        return queryAll(
          `SELECT s.*, sr.title as series_title, sr.color as series_color
           FROM sermons s LEFT JOIN series sr ON s.series_id = sr.id
           WHERE s.stage = ?
             AND s.id NOT LIKE 'sample-%'
             AND s.deleted_at IS NULL
           ORDER BY s.updated_at DESC, s.created_at DESC`,
          [SERMON_STATUS.InProgress],
        ).map((r) => shapeSermon(r, computeParentContext(r)));
      case "get-sermons-by-series":
        // Undated slots sort AFTER dated ones (audit M4): empty-string dates
        // sort first under BINARY collation, which scrambles the planner order
        // and the workspace "Sermon N of M" breadcrumb once only some slots are
        // dated. Keep this ORDER BY in lockstep with computeParentContext and
        // the study-guide export query.
        return queryAll(
          `SELECT s.* FROM sermons s
           LEFT JOIN series_sections ss ON s.section_id = ss.id
           WHERE s.series_id = ? AND s.deleted_at IS NULL
           ${seriesSermonOrderBy("s.", "ss.sort_order")}`,
          [payload],
        );
      case "get-series-sermon-counts": {
        // One grouped read for the Planning list's per-series counts, replacing
        // an N+1 fan-out of get-sermons-by-series (audit perf). Returns a plain
        // { [seriesId]: count } map of undeleted sermons.
        const rows = queryAll(
          `SELECT series_id, COUNT(*) AS count FROM sermons
            WHERE series_id IS NOT NULL AND deleted_at IS NULL
            GROUP BY series_id`,
        );
        const counts = {};
        for (const r of rows) counts[r.series_id] = r.count;
        return counts;
      }
      case "get-all-tags": {
        // Distinct sorted topic tags across all live sermons (Coverage Initiative,
        // Phase 3). Feeds the workspace's own-tag autocomplete and the future
        // Topics lens — both aggregate by scanning the tags column (no tags table
        // at one-pastor scale). Fail-soft per row so one bad JSON value can't
        // sink the whole list. Case-insensitive de-dupe keeps the first-seen
        // casing of each tag.
        const rows = queryAll(
          `SELECT tags FROM sermons WHERE deleted_at IS NULL AND id NOT LIKE 'sample-%'`,
        );
        const byLower = new Map();
        for (const r of rows) {
          let arr;
          try { arr = JSON.parse(r.tags || "[]"); } catch { arr = []; }
          if (!Array.isArray(arr)) continue;
          for (const t of arr) {
            if (typeof t !== "string") continue;
            const trimmed = t.trim();
            if (trimmed && !byLower.has(trimmed.toLowerCase())) byLower.set(trimmed.toLowerCase(), trimmed);
          }
        }
        return [...byLower.values()].sort((a, b) => a.localeCompare(b));
      }
      case "get-sections-by-series":
        return queryAll(
          "SELECT * FROM series_sections WHERE series_id = ? ORDER BY sort_order ASC, created_at ASC",
          [payload],
        );
      default:
        return null;
    }
  }

  // ── Mutation router — every write goes through validateAndCommit ─────────────

  function applyStructuredUpdate(row, field, update) {
    const raw = row[field];
    let current;
    try {
      current = raw ? JSON.parse(raw) : (field === "outline" ? [] : {});
    } catch {
      current = field === "outline" ? [] : {};
    }

    if (field === "outline") {
      if (!Array.isArray(current)) current = [];
      if (update.op === "add") {
        current.push({ id: randomUUID(), text: String(update.text || "") });
      } else if (update.op === "edit") {
        const i = current.findIndex((p) => p.id === update.id);
        if (i >= 0) current[i] = { id: update.id, text: String(update.text || "") };
      } else if (update.op === "remove") {
        current = current.filter((p) => p.id !== update.id);
      } else if (update.op === "reorder") {
        const byId = new Map(current.map((p) => [p.id, p]));
        const ordered = (update.orderedIds || []).map((id) => byId.get(id)).filter(Boolean);
        current = ordered;
      } else {
        return rejection("STATE_5_BAD_OP", "State #5", `Unknown outline op: ${update.op}`);
      }
      return JSON.stringify(current);
    }

    if (field === "functional_elements") {
      if (typeof current !== "object" || current === null || Array.isArray(current)) current = {};
      if (update.op === "set") {
        const entry = current[update.outlinePointId] || {};
        entry[update.field] = String(update.value || "");
        current[update.outlinePointId] = entry;
        return JSON.stringify(current);
      }
      return rejection("STATE_5_BAD_OP", "State #5", `Unknown functional_elements op: ${update.op}`);
    }

    // observations / interpretation / redemptive_thread / implications: keyed JSON
    if (typeof current !== "object" || current === null || Array.isArray(current)) current = {};
    if (update.op === "set") {
      current[update.questionKey] = String(update.value || "");
      return JSON.stringify(current);
    }
    if (update.op === "set_summary") {
      current.summary = String(update.value || "");
      return JSON.stringify(current);
    }
    return rejection("STATE_5_BAD_OP", "State #5", `Unknown structured op: ${update.op}`);
  }

  // ── Session-3 atomicity helpers ──────────────────────────────────────────
  // withTransaction — ONE SQLite transaction per mutation. Every operation
  // that changes searchable sermon state runs its source writes AND its
  // sermon_search projection writes inside this wrapper, so a failure in
  // either rolls back both — source and search can never disagree, and a
  // failed create leaves no row for a retry to duplicate. better-sqlite3
  // nests inner transaction() calls as savepoints, so shared helpers that
  // write (firstSectionIdForSeries) compose safely.
  function withTransaction(fn) {
    return getDb().transaction(fn)();
  }

  // Full search-projection rebuild — the EXPLICIT REPAIR mechanism (support /
  // recovery use; the v22/v24 migration blocks carry their own inline
  // equivalents). Deliberately not called from any normal write path: per-row
  // projection rides inside each mutation's transaction instead.
  function rebuildSearchIndex() {
    return withTransaction(() => {
      dbRun("DELETE FROM sermon_search");
      const rows = queryAll(
        `SELECT s.*, sr.title AS series_title
           FROM sermons s LEFT JOIN series sr ON sr.id = s.series_id
          WHERE s.deleted_at IS NULL`,
      );
      for (const r of rows) indexSermonFtsFromRow(r);
      return rows.length;
    });
  }

  function validateAndCommit(op, payload) {
    switch (op) {
      case "create-sermon": {
        const name = (payload?.name || "").trim();
        if (!name) {
          return rejection(
            "STATE_3_NAMELESS_SERMON",
            "State #3",
            "State Contract #3 violation: no anonymous atoms — a sermon must have a name.",
          );
        }
        const id = randomUUID();
        const seriesId = payload.series_id || null;
        let sectionId = payload.section_id || null;
        // Relational validation (Session-3 Part C): a supplied parent must
        // exist, and a supplied series/section combination must cohere — a
        // stale series_id used to create a dangling-parent sermon silently.
        const seriesRow = seriesId ? queryOne("SELECT id, kind FROM series WHERE id = ?", [seriesId]) : null;
        if (seriesId && !seriesRow) {
          return rejection("NOT_FOUND", "State #1", `Series ${seriesId} not found — a sermon cannot be created under a series that doesn't exist.`);
        }
        if (sectionId && !seriesId) {
          return rejection("STATE_1_INCOHERENT_PARENT", "State #1", "A section_id without a series_id is incoherent — sections only exist inside a series.");
        }
        if (sectionId) {
          const secRow = queryOne("SELECT id, series_id FROM series_sections WHERE id = ?", [sectionId]);
          if (!secRow) {
            return rejection("NOT_FOUND", "State #1", `Section ${sectionId} not found.`);
          }
          if (secRow.series_id !== seriesId) {
            return rejection("STATE_1_SECTION_SERIES_MISMATCH", "State #1", `Section ${sectionId} belongs to a different series than ${seriesId}.`);
          }
        }
        // Canonical position is (current_stage, current_sub_phase). current_step
        // was retired in the trail deletion sweep (Phase B2).
        //
        // ONE transaction covers the row INSERT, the Section-1 auto-file, and
        // the search projection (Session-3 Part A): an index failure used to
        // land AFTER the commit, so the sermon row survived while the handler
        // reported failure — and the renderer's retry created a duplicate.
        withTransaction(() => {
          // No "in a series but in no section" limbo: a sermon created under a
          // series must land in a section, or it is invisible in the Outline
          // (which only buckets sermons that have one). The New Sermon modal sets
          // series_id (auto-selecting the lone in-progress series) but never
          // section_id, so without this it manufactured exactly that limbo from
          // the Calendar / Dashboard / library / sidebar. File it under the
          // series' first section, auto-creating "Section 1" where the series has
          // none — mirrors the v28/v29 normalize + delete-section's reattach. The
          // planner's own draft/commit already passes section_id, so this only
          // fires for the section-less create paths. Topical series
          // (kind='topical', v30) are section-OPTIONAL: their sermons live flat
          // under the Big Idea and must NOT be auto-filed into a section.
          if (seriesId && !sectionId && seriesRow.kind !== "topical") {
            sectionId = firstSectionIdForSeries(seriesId);
          }
          dbRun(
            `INSERT INTO sermons
               (id, series_id, section_id, is_one_off, title, passage, date, preacher,
                stage, mpt, mps, observations, outline, manuscript,
                current_stage, current_sub_phase)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '[]', '', ?, ?)`,
            [
              id,
              seriesId,
              sectionId,
              payload.is_one_off ? 1 : 0,
              name,
              payload.passage || "",
              payload.date || "",
              payload.preacher || "",
              SERMON_STATUS.InProgress,
              STAGE.Study,
              SUB_PHASE.Observe,
            ],
          );
          indexSermonFts(id);
        });
        return success({ id });
      }

      case "create-series": {
        const name = (payload?.name || "").trim();
        if (!name) {
          return rejection(
            "STATE_3_NAMELESS_SERIES",
            "State #3",
            "State Contract #3 violation: no anonymous atoms — a series must have a name.",
          );
        }
        const id = randomUUID();
        dbRun(
          `INSERT INTO series
             (id, title, color, description, year, big_idea, overview,
              passage_range, start_date, end_date, structural_outline, status, canon_category)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            name,
            payload.color || "gold",
            payload.description || "",
            payload.year || new Date().getFullYear(),
            payload.big_idea || "",
            payload.overview || "",
            payload.passage_range || "",
            payload.start_date || "",
            payload.end_date || "",
            payload.structural_outline || "",
            SERIES_STATUS.InProgress,
            payload.canon_category || "",
          ],
        );
        return success({ id });
      }

      case "update-sermon": {
        // Multi-field user_input mutation — every supplied field is treated as
        // user typing. Structured fields are accepted as pre-serialized JSON
        // strings; for typed structured updates callers should use
        // apply-mutation with kind "user_input". An unknown field rejects the
        // whole update (buildUpdate); a missing target rejects instead of the
        // old silent zero-row no-op; source + search commit in one transaction.
        const { id, fields } = payload || {};
        const update = buildUpdate(fields || {}, SERMON_COLUMNS);
        if (update && update.ok === false) return update;
        if (!update) {
          return rejection("UPDATE_NO_FIELDS", "State #5", "No valid fields to update.");
        }
        if (!queryOne("SELECT id FROM sermons WHERE id = ?", [id])) {
          return rejection("NOT_FOUND", "State #1", `Sermon ${id} not found — the update would affect zero rows.`);
        }
        withTransaction(() => {
          dbRun(
            `UPDATE sermons SET ${update.setClauses}, updated_at = datetime('now') WHERE id = ?`,
            [...update.values, id],
          );
          indexSermonFts(id);
        });
        return success();
      }

      case "update-series": {
        const { id, fields } = payload || {};
        if (Object.prototype.hasOwnProperty.call(fields || {}, "title")) {
          const t = (fields.title || "").trim();
          if (!t) {
            return rejection(
              "STATE_3_NAMELESS_SERIES",
              "State #3",
              "State Contract #3 violation: a series must have a name.",
            );
          }
        }
        const update = buildUpdate(fields || {}, SERIES_COLUMNS);
        if (update && update.ok === false) return update;
        if (!update) {
          return rejection("UPDATE_NO_FIELDS", "State #5", "No valid fields to update.");
        }
        if (!queryOne("SELECT id FROM series WHERE id = ?", [id])) {
          return rejection("NOT_FOUND", "State #1", `Series ${id} not found — the update would affect zero rows.`);
        }
        // Series title is part of every attached sermon's search row: the
        // UPDATE and the per-sermon re-index commit in ONE transaction, so a
        // failure mid-loop can't leave half the search rows on the old title.
        withTransaction(() => {
          dbRun(`UPDATE series SET ${update.setClauses} WHERE id = ?`, [...update.values, id]);
          if (Object.prototype.hasOwnProperty.call(fields || {}, "title")) {
            const sermonRows = queryAll("SELECT id FROM sermons WHERE series_id = ?", [id]);
            for (const r of sermonRows) indexSermonFts(r.id);
          }
        });
        return success();
      }

      case "delete-sermon":
        // Soft delete (v24) — the row stays, stops appearing everywhere, and
        // restore-sermon brings it back. Tombstone + search-row drop commit in
        // one transaction; a missing target rejects (was a silent no-op).
        if (!queryOne("SELECT id FROM sermons WHERE id = ?", [payload])) {
          return rejection("NOT_FOUND", "State #1", `Sermon ${payload} not found — nothing to delete.`);
        }
        withTransaction(() => {
          dbRun("UPDATE sermons SET deleted_at = ? WHERE id = ?", [
            new Date().toISOString(),
            payload,
          ]);
          dropSermonFts(payload);
        });
        return success();

      case "restore-sermon":
        // Undo for delete-sermon. Clears the tombstone and re-indexes — both
        // in one transaction; a missing target rejects (was a silent no-op).
        if (!queryOne("SELECT id FROM sermons WHERE id = ?", [payload])) {
          return rejection("NOT_FOUND", "State #1", `Sermon ${payload} not found — nothing to restore.`);
        }
        withTransaction(() => {
          dbRun("UPDATE sermons SET deleted_at = NULL WHERE id = ?", [payload]);
          indexSermonFts(payload);
        });
        return success();

      case "delete-series": {
        if (!queryOne("SELECT id FROM series WHERE id = ?", [payload])) {
          return rejection("NOT_FOUND", "State #1", `Series ${payload} not found — nothing to delete.`);
        }
        // Capture the sermon ids attached to this series BEFORE the cascade
        // nullifies their series_id, so we can re-index each one with its
        // series_title cleared from the FTS row. Cascade + re-index commit in
        // ONE transaction (the re-index used to run after COMMIT — a failure
        // there stranded stale series titles in half the search rows).
        const affectedSermonRows = queryAll(
          "SELECT id FROM sermons WHERE series_id = ?",
          [payload],
        );
        withTransaction(() => {
          dbRun("DELETE FROM series_sections WHERE series_id = ?", [payload]);
          dbRun("UPDATE sermons SET series_id = NULL, section_id = NULL WHERE series_id = ?", [payload]);
          dbRun("DELETE FROM series WHERE id = ?", [payload]);
          for (const r of affectedSermonRows) indexSermonFts(r.id);
        });
        return success();
      }

      case "create-section": {
        // A section only exists inside a series — reject a missing/stale parent.
        if (!payload?.series_id || !queryOne("SELECT id FROM series WHERE id = ?", [payload.series_id])) {
          return rejection("NOT_FOUND", "State #1", `Series ${payload?.series_id} not found — a section cannot be created without its series.`);
        }
        const id = randomUUID();
        dbRun(
          `INSERT INTO series_sections
             (id, series_id, title, passage_range, big_idea, overview, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            payload.series_id,
            payload.title || "",
            payload.passage_range || "",
            payload.big_idea || "",
            payload.overview || "",
            payload.sort_order ?? 0,
          ],
        );
        return success({ id });
      }

      case "update-section": {
        const { id, fields } = payload || {};
        const update = buildUpdate(fields || {}, SECTION_COLUMNS);
        if (update && update.ok === false) return update;
        if (!update) {
          return rejection("UPDATE_NO_FIELDS", "State #5", "No valid fields to update.");
        }
        if (!queryOne("SELECT id FROM series_sections WHERE id = ?", [id])) {
          return rejection("NOT_FOUND", "State #1", `Section ${id} not found — the update would affect zero rows.`);
        }
        dbRun(`UPDATE series_sections SET ${update.setClauses} WHERE id = ?`, [...update.values, id]);
        return success();
      }

      case "delete-section": {
        // No "in a series but in no section" limbo: the section's sermons move to
        // the first remaining section of the series; if this was the LAST section,
        // they become standalone (series_id NULL) — back to the library, the same
        // way deleting the series itself releases its sermons.
        const secRow = queryOne("SELECT series_id FROM series_sections WHERE id = ?", [payload]);
        if (!secRow) {
          return rejection("NOT_FOUND", "State #1", `Section ${payload} not found — nothing to delete.`);
        }
        const delSeriesId = secRow.series_id ?? null;
        const affectedSermonRows = queryAll("SELECT id FROM sermons WHERE section_id = ?", [payload]);
        // Moves, delete, and the conditional standalone re-index commit in ONE
        // transaction (the re-index used to run after COMMIT).
        withTransaction(() => {
          const remaining = delSeriesId
            ? queryOne(
                "SELECT id FROM series_sections WHERE series_id = ? AND id != ? ORDER BY sort_order ASC, created_at ASC LIMIT 1",
                [delSeriesId, payload]
              )
            : null;
          if (remaining) {
            dbRun("UPDATE sermons SET section_id = ? WHERE section_id = ?", [remaining.id, payload]);
          } else {
            dbRun("UPDATE sermons SET series_id = NULL, section_id = NULL WHERE section_id = ?", [payload]);
            // Sermons that left the series need their FTS series_title cleared.
            for (const r of affectedSermonRows) indexSermonFts(r.id);
          }
          dbRun("DELETE FROM series_sections WHERE id = ?", [payload]);
        });
        return success();
      }

      // `case "transition-state"` (the vestigial position-writer handler) was
      // removed in Track E4 (2026-07-03). It wrote current_stage / current_sub_phase /
      // last_*_subphase but had no sender — the renderer stores position via
      // `last_touched_position` (the update-sermon path). See the tombstone in
      // src/core/spine.ts and tests/contracts/transition-state-no-caller.test.ts.

      case "apply-mutation": {
        const { kind, sermonId, field } = payload || {};
        if (!sermonId || !field) {
          return rejection("BAD_PAYLOAD", "Spine", "applyMutation requires sermonId and field.");
        }
        const row = fetchSermonRow(sermonId);
        if (!row) {
          return rejection("NOT_FOUND", "State #1", `Sermon ${sermonId} not found.`);
        }
        if (!SERMON_COLUMNS.has(field)) {
          return rejection("STATE_5_UNKNOWN_FIELD", "State #5", `Unknown sermon field '${field}'.`);
        }
        const isStructured = STRUCTURED_FIELDS.has(field);

        if (kind === MUTATION_KIND.UserInput) {
          let serialized;
          if (isStructured) {
            const r = applyStructuredUpdate(row, field, payload.value);
            if (r && typeof r === "object" && r.ok === false) return r;
            serialized = r;
          } else {
            if (typeof payload.value !== "string") {
              return rejection(
                "STATE_5_SIMPLE_FIELD_STRUCTURED",
                "State #5",
                `'${field}' is a simple field; value must be a string.`,
              );
            }
            serialized = payload.value;
          }
          withTransaction(() => {
            dbRun(
              `UPDATE sermons SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`,
              [serialized, sermonId],
            );
            indexSermonFts(sermonId);
          });
          return success();
        }

        return rejection("BAD_KIND", "Mutation", `Unknown mutation kind: ${kind}`);
      }

      // ── Session-3 Part B — bounded planner-gesture ops ─────────────────────
      // Each VISIBLE HUMAN GESTURE below used to fan out as N independent
      // renderer writes (Promise.all) — a mid-flight failure left half the
      // rows moved/dated. Each op validates its parents and commits in one
      // transaction; renderer optimistic state reloads DB truth on failure.

      case "reorder-sections": {
        const { series_id, orderedIds } = payload || {};
        if (!series_id || !Array.isArray(orderedIds) || orderedIds.length === 0) {
          return rejection("BAD_PAYLOAD", "Spine", "reorder-sections requires series_id and a non-empty orderedIds array.");
        }
        if (!queryOne("SELECT id FROM series WHERE id = ?", [series_id])) {
          return rejection("NOT_FOUND", "State #1", `Series ${series_id} not found.`);
        }
        const live = queryAll("SELECT id FROM series_sections WHERE series_id = ?", [series_id]).map((r) => r.id);
        const liveSet = new Set(live);
        for (const id of orderedIds) {
          if (!liveSet.has(id)) {
            return rejection("STATE_1_SECTION_SERIES_MISMATCH", "State #1", `Section ${id} does not belong to series ${series_id}.`);
          }
        }
        if (new Set(orderedIds).size !== live.length) {
          return rejection("BAD_PAYLOAD", "Spine", `orderedIds must name each of the series' ${live.length} sections exactly once.`);
        }
        withTransaction(() => {
          orderedIds.forEach((id, i) => {
            dbRun("UPDATE series_sections SET sort_order = ? WHERE id = ?", [i, id]);
          });
        });
        return success();
      }

      case "reorder-series-sermons": {
        // Topical arrangement: sort_order = index over the pastor's order.
        const { series_id, orderedIds } = payload || {};
        if (!series_id || !Array.isArray(orderedIds) || orderedIds.length === 0) {
          return rejection("BAD_PAYLOAD", "Spine", "reorder-series-sermons requires series_id and a non-empty orderedIds array.");
        }
        if (!queryOne("SELECT id FROM series WHERE id = ?", [series_id])) {
          return rejection("NOT_FOUND", "State #1", `Series ${series_id} not found.`);
        }
        const live = queryAll("SELECT id FROM sermons WHERE series_id = ? AND deleted_at IS NULL", [series_id]).map((r) => r.id);
        const liveSet = new Set(live);
        for (const id of orderedIds) {
          if (!liveSet.has(id)) {
            return rejection("STATE_1_SECTION_SERIES_MISMATCH", "State #1", `Sermon ${id} is not a live sermon of series ${series_id}.`);
          }
        }
        if (new Set(orderedIds).size !== live.length) {
          return rejection("BAD_PAYLOAD", "Spine", `orderedIds must name each of the series' ${live.length} live sermons exactly once.`);
        }
        withTransaction(() => {
          orderedIds.forEach((id, i) => {
            dbRun("UPDATE sermons SET sort_order = ?, updated_at = datetime('now') WHERE id = ?", [i, id]);
          });
        });
        return success();
      }

      case "bulk-date-sermons": {
        // Date assignment (single date pick AND Suggest Sundays) plus the
        // series.end_date mirror — one gesture, one transaction. `date` is not
        // a searchable column, so no projection write rides along.
        const { series_id, dates } = payload || {};
        if (!series_id || !Array.isArray(dates) || dates.length === 0) {
          return rejection("BAD_PAYLOAD", "Spine", "bulk-date-sermons requires series_id and a non-empty dates array.");
        }
        for (const d of dates) {
          if (!d || typeof d.id !== "string" || typeof d.date !== "string") {
            return rejection("BAD_PAYLOAD", "Spine", "each dates entry must be { id: string, date: string }.");
          }
        }
        if (!queryOne("SELECT id FROM series WHERE id = ?", [series_id])) {
          return rejection("NOT_FOUND", "State #1", `Series ${series_id} not found.`);
        }
        const live = new Set(
          queryAll("SELECT id FROM sermons WHERE series_id = ? AND deleted_at IS NULL", [series_id]).map((r) => r.id),
        );
        for (const d of dates) {
          if (!live.has(d.id)) {
            return rejection("NOT_FOUND", "State #1", `Sermon ${d.id} is not a live sermon of series ${series_id}.`);
          }
        }
        let endDate = "";
        withTransaction(() => {
          for (const d of dates) {
            dbRun("UPDATE sermons SET date = ?, updated_at = datetime('now') WHERE id = ?", [d.date, d.id]);
          }
          // Mirror: series.end_date tracks the LAST dated live sermon; clearing
          // every date clears the mirror too (no phantom end date).
          const last = queryOne(
            "SELECT date FROM sermons WHERE series_id = ? AND deleted_at IS NULL AND date != '' ORDER BY date DESC LIMIT 1",
            [series_id],
          );
          endDate = last?.date || "";
          dbRun("UPDATE series SET end_date = ? WHERE id = ?", [endDate, series_id]);
        });
        // The renderer gets the mirrored value back so its optimistic series
        // state can settle on DB truth without a refetch.
        return success({ end_date: endDate });
      }

      case "load-sample-sermon": {
        const { SERMON_ID, series, sermon } = require("./sampleData");
        // Sandbox semantics: an existing sample is returned as-is, so the
        // pastor's poking-around survives re-entry. Passing { fresh: true }
        // (the dashboard's "Start the sample fresh") deletes and reseeds —
        // which is also how schema/content changes to the seed get picked up.
        const fresh = payload?.fresh === true;
        if (!fresh && queryOne("SELECT id FROM sermons WHERE id = ?", [SERMON_ID])) {
          return success({ sermonId: SERMON_ID, created: false });
        }
        // The whole reseed — source deletes, source inserts, stale search-row
        // cleanup, and the fresh index — is ONE transaction (the search half
        // used to run after COMMIT).
        withTransaction(() => {
          // Prefix-scoped to sample-romans-: the sample SERIES seed
          // (sample-luke-, load-sample-series below) coexists with this one,
          // and a broad 'sample-%' here would destroy it on every
          // "Start the sample fresh".
          dbRun("DELETE FROM sermons WHERE id LIKE 'sample-romans-%'");
          dbRun("DELETE FROM series  WHERE id LIKE 'sample-romans-%'");
          // Full-INSERT seed path (distinct from the create-series user flow, which
          // stays create-then-update). book_id is seeded directly here so the sample
          // exercises the canonical-book path the feature exists to showcase.
          dbRun(
            // The retired book-study / melodic-line series columns (redemptive_context,
            // book_background, book_argument, book_structure, series_motivation,
            // emerging_big_idea) are no longer seeded — they were retired from the
            // writable set in the v27 content-model rebuild and nothing reads them.
            `INSERT INTO series (
              id, title, color, description, year,
              big_idea, overview, passage_range, start_date, end_date,
              structural_outline, status, canon_category, book_id
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              series.id, series.title, series.color, series.description, series.year,
              series.big_idea, series.overview, series.passage_range, series.start_date, series.end_date,
              series.structural_outline, series.status, series.canon_category, series.book_id,
            ],
          );
          dbRun(
            // main_point_pair (the v19 envelope the Anchor fields render) and
            // tags (the workspace Topics field, v32) are part of the seed —
            // without main_point_pair in this INSERT the sample's MPT/MPS
            // fields rendered empty in the app even though sampleData.js
            // authored them (caught in the 2026-07-02 sample rebuild).
            `INSERT INTO sermons (
              id, series_id, is_one_off, title, passage, date, stage,
              mpt, mps, main_point_pair,
              observations, interpretation, redemptive_thread, implications,
              outline, functional_elements,
              manuscript, delivery_notes, timing_notes,
              study_guide_note, big_idea, overview, sermon_frame, tags,
              notebook_study, notebook_blueprint, notebook_manuscript,
              current_stage, current_sub_phase,
              last_study_subphase, last_assembly_subphase, last_manuscript_subphase,
              last_touched_position, thresholds_seen
            ) VALUES (?,?,0,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              sermon.id, sermon.series_id, sermon.title, sermon.passage, sermon.date, sermon.stage,
              sermon.mpt, sermon.mps, sermon.main_point_pair,
              sermon.observations, sermon.interpretation, sermon.redemptive_thread, sermon.implications,
              sermon.outline, sermon.functional_elements,
              sermon.manuscript, sermon.delivery_notes, sermon.timing_notes,
              sermon.study_guide_note, sermon.big_idea, sermon.overview, sermon.sermon_frame, sermon.tags,
              sermon.notebook_study, sermon.notebook_blueprint, sermon.notebook_manuscript,
              // current_step removed in the trail deletion sweep (Phase B2).
              STAGE.Study, SUB_PHASE.Observe,
              // Per-stage memory: sample sermon always resets to the first
              // sub-phase of each stage so re-opens land at the beginning,
              // regardless of where the pastor wandered last time.
              SUB_PHASE.Observe, SUB_PHASE.Anchor, SUB_PHASE.Body,
              // Landing state (first Manuscript field, thresholds pre-seen)
              // is seed content — authored in sampleData.js with the rest.
              sermon.last_touched_position, sermon.thresholds_seen,
            ],
          );
          // Search index: drop any stale sample rows + re-index the freshly-
          // inserted one. The DELETE above runs against `sermons`;
          // `sermon_search` is a separate table and needs its own cleanup.
          dbRun("DELETE FROM sermon_search WHERE sermon_id LIKE 'sample-romans-%'");
          indexSermonFts(SERMON_ID);
        });
        return success({ sermonId: SERMON_ID, created: true });
      }

      case "load-sample-series": {
        // The planner-side sibling of load-sample-sermon: seeds the complete
        // Luke sample series (electron/sampleSeriesData.js) — one series, four
        // sections, the full sermon plan — for the Series Planning screen's
        // "Open the sample series" door. Same sandbox semantics: an existing
        // sample is returned as-is (the pastor's poking-around survives
        // re-entry); { fresh: true } deletes and reseeds, which is also how
        // seed content changes get picked up.
        const sampleSeries = require("./sampleSeriesData");
        const fresh = payload?.fresh === true;
        if (!fresh && queryOne("SELECT id FROM series WHERE id = ?", [sampleSeries.SERIES_ID])) {
          return success({ seriesId: sampleSeries.SERIES_ID, created: false });
        }
        withTransaction(() => {
          // Prefix-scoped to sample-luke-: this reseed and the sample
          // sermon's (sample-romans-, above) must never clobber each other.
          // The sermons DELETE also catches rows a sandbox delete-series
          // released to standalone (series_id nulled, id prefix intact).
          dbRun("DELETE FROM sermons WHERE id LIKE 'sample-luke-%'");
          dbRun("DELETE FROM series_sections WHERE id LIKE 'sample-luke-%'");
          dbRun("DELETE FROM series WHERE id LIKE 'sample-luke-%'");
          dbRun("DELETE FROM sermon_search WHERE sermon_id LIKE 'sample-luke-%'");
          // Full-INSERT seed path, like the sample sermon's (distinct from the
          // create-then-update user flow — the create-series INSERT is never
          // widened; this is not that INSERT).
          dbRun(
            `INSERT INTO series (
              id, title, color, description, year, kind, book_id, canon_category,
              big_idea, overview, passage_range, structural_outline,
              start_date, end_date, status
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              sampleSeries.series.id, sampleSeries.series.title, sampleSeries.series.color,
              sampleSeries.series.description, sampleSeries.series.year, sampleSeries.series.kind,
              sampleSeries.series.book_id, sampleSeries.series.canon_category,
              sampleSeries.series.big_idea, sampleSeries.series.overview,
              sampleSeries.series.passage_range, sampleSeries.series.structural_outline,
              sampleSeries.series.start_date, sampleSeries.series.end_date, sampleSeries.series.status,
            ],
          );
          for (const sec of sampleSeries.sections) {
            dbRun(
              "INSERT INTO series_sections (id, series_id, title, passage_range, big_idea, overview, sort_order) VALUES (?,?,?,?,?,?,?)",
              [sec.id, sec.series_id, sec.title, sec.passage_range, sec.big_idea, sec.overview, sec.sort_order],
            );
          }
          for (const s of sampleSeries.sermons) {
            // Planner-born shape: the create-sermon defaults (Study/Observe,
            // empty prep columns) plus the planner's own fields
            // (big_idea / overview / sort_order). These are PLANNED sermons
            // awaiting "Build this sermon" — not worked ones.
            dbRun(
              `INSERT INTO sermons
                 (id, series_id, section_id, is_one_off, title, passage, date, preacher,
                  stage, mpt, mps, observations, outline, manuscript,
                  current_stage, current_sub_phase,
                  big_idea, overview, sort_order)
               VALUES (?, ?, ?, 0, ?, ?, ?, '', ?, '', '', '', '[]', '', ?, ?, ?, ?, ?)`,
              [
                s.id, s.series_id, s.section_id, s.title, s.passage, s.date,
                s.stage, s.current_stage, s.current_sub_phase,
                s.big_idea, s.overview, s.sort_order,
              ],
            );
            // Keep the search projection 1:1 with the sermons table (the
            // Session-3 invariant rebuildSearchIndex also enforces); sample
            // rows are excluded at query time, like every list surface.
            indexSermonFts(s.id);
          }
        });
        return success({ seriesId: sampleSeries.SERIES_ID, created: true });
      }

      default:
        return rejection("UNKNOWN_OP", "Spine", `Unknown spine mutation op: ${op}`);
    }
  }


  // The minimal transaction wrapper the migration ladder requires: the whole
  // pass runs inside ONE better-sqlite3 transaction — a thrown migration
  // rolls every statement back and the on-disk DB stays pristine (the same
  // guarantee initDatabase has always relied on; it now calls this).
  function migrate() {
    return getDb().transaction(runMigrations)();
  }

  return {
    // query helpers
    bindable, queryAll, queryOne, runSql, dbRun,
    // schema + migrations
    bootstrapSchema, safeAlter, runMigrations, migrate, assertSchemaContract,
    // search projection
    SERMON_SEARCH_COLUMNS, flattenJsonToText, extractJsonText,
    indexSermonFtsFromRow, indexSermonFts, dropSermonFts, rebuildSearchIndex,
    // atomicity
    withTransaction,
    // spine
    rejection, success, shapeSermon, shapeSeries, fetchSermonRow,
    computeParentContext, seriesSermonOrderBy, buildUpdate,
    firstSectionIdForSeries, applyStructuredUpdate, spineRead, validateAndCommit,
  };
}

module.exports = { createPersistence };
