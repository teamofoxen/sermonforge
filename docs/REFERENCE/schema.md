# SermonForge — Database Schema Reference

Current schema version: **32**

| Version | Bumped for |
|---------|-----------|
| v14 | Schema-contract reconciliation (idempotent re-apply of v2–v12 ALTERs) |
| v15 | Reserved version slot (library table content_hash; library feature later removed) |
| v16 | Lifecycle collapse — sermon stage + series status to two-state (in-progress / complete) |
| v17 | Spine prerequisites — `current_stage`, `current_step` (retired Phase B2), `current_sub_phase` + legacy evidence cutoff |
| v18 | SPRD C3 — `sermon_frame` JSON column for Intro + Conclusion (SADI Step 5) |
| v19 | SADI Step 2 — `main_point_pair` JSON column for MPT + MPS questions |
| v20 | ARI Phase 3 — `notebook_study`, `notebook_blueprint`, `notebook_manuscript` |
| v21 | Per-stage sub-phase memory — `last_study_subphase`, `last_assembly_subphase` |
| v22 | Sermon full-content search — `sermon_search` table (flattened text per indexed column for LIKE-based search) |
| v23 | Trail deletion sweep (Phase D1) — `last_touched_position` (session re-entry routing) + `thresholds_seen` (dismissed-thresholds JSON array, one mechanism for all threshold-orientation "seen" flags) |
| v24 | UX overhaul migration session — `deleted_at` soft-delete tombstone on `sermons`; `sermon_search` rebuilt with `functional_elements` in and `delivery_notes` / `timing_notes` out (Delivery stage struck from the vocabulary) |
| v25 | Canonical-books build — `book_id` (nullable) on `series`; `canon_category` enum switched from legacy 4-value (`ot`/`nt`/`wisdom`/`prophetic`) to Dever's 7 genre keys, migrating `wisdom`→`ot_writings`, `prophetic`→`ot_prophets`, `ot`/`nt`→NULL |
| v26 | Series Planner re-leveling — `melodic_evidence` (nullable JSON) on `series` for the "Hear the line" evidence worksheet; one-time fold of `book_structure` into `structural_outline` (run-once, version-gated). `book_structure` retained as a backup column, not dropped. |
| v27 | Series Planner content-model rebuild — `big_idea` + `overview` (sermon-level unit) and `study_guide_extras` (nullable JSON: guide-local `{ additions, notesLines }`) on `sermons`; run-once version-gated fold of `study_guide_note` → `overview` where overview is empty. `study_guide_note` retired from the writable set but retained as a backup column. The book-study prompts (`redemptive_context`, `book_background`, `book_argument`), the folded `book_structure`, and the melodic-line worksheet fields (`series_motivation`, `emerging_big_idea`, `melodic_evidence`) were dropped from the writable allowlist (`SERIES_COLUMNS`); their columns are retained as backup. No columns dropped. |
| v28 | Series Planner — no "in a series but in no section" limbo. **Data-only** (no DDL): section-less in-series sermons placed into the series' first section (auto-creating a `series_sections` "Section 1" where a series had none); sermons whose `series_id` points at a missing/deleted series set to standalone (`series_id` NULL). Run-once, version-gated. Column allowlists / `assertSchemaContract` untouched. |
| v29 | Series Planner — re-heal the no-"section-less limbo" invariant. **Data-only** (no DDL), idempotent re-run of the v28 normalize: catches in-series sermons left section-less by the pre-fix `create-sermon` path (the New Sermon modal set `series_id` but never `section_id`), placing each into the series' first section (auto-creating "Section 1" where needed) or setting standalone where the series is missing. The `create-sermon` handler now enforces the invariant on write, so no new limbo is created. Column allowlists / `assertSchemaContract` untouched. |
| v30 | Topical Series mode — `kind` (`book \| topical`, DEFAULT `book`) on `series`, the explicit theme-led-vs-book-led planner-mode discriminator (NOT inferred from `book_id` being NULL); `sort_order` (nullable INTEGER) on `sermons`, the pastor-authored per-sermon order for a topical series' flat sermon list. Both additive (no backfill, no columns dropped); both ride create-then-update — added to `SERIES_COLUMNS` / `SERMON_COLUMNS`, never the create INSERT. |
| v31 | Coverage Initiative (Phase 1) — `book_id` (nullable TEXT) on `sermons`, the structured per-sermon canonical book (mirrors `series.book_id`, keys into `src/data/canonicalBooks.js`). A topical sermon picks its own book per-sermon (composed with a chapter:verse ref into the `passage` string so the two can't disagree); a book-series sermon stays NULL and inherits `series.book_id` via the effective-book helper (`sermon.book_id ?? series.book_id`). Additive (no backfill, no columns dropped); rides create-then-update — added to `SERMON_COLUMNS`, never the create INSERT. Makes topical series visible to the sermon-grained Series Arc (Phase 2). |
| v32 | Coverage Initiative (Phase 3) — `tags` (`TEXT NOT NULL DEFAULT '[]'`) on `sermons`, a JSON array of free-form, sermon-level topic strings tagged at prep in the workspace (mirrors the `thresholds_seen` JSON-array pattern; fail-soft parse). Sermon-level (not series) so the Topics lens reaches into book series; optional + partial. Powers the workspace own-tag autocomplete and the future Topics lens (both aggregate by scanning this column — no tags table at one-pastor scale). Additive (default `'[]'`, no backfill, no columns dropped); rides the workspace autosave — added to `SERMON_COLUMNS`, never the create INSERT. AI-free (the pastor's own words). |

---

## Table: series

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PRIMARY KEY | |
| `title` | TEXT | |
| `color` | TEXT | `gold \| crimson \| sage \| slate` |
| `description` | TEXT | |
| `year` | INTEGER | |
| `big_idea` | TEXT | The book's one-line big idea (Outline → book node). The top of the three-level unit (Title · Big idea · Overview). |
| `overview` | TEXT | The book's overview paragraph (Outline → book node). Becomes the study guide's Introduction. |
| `passage_range` | TEXT | e.g. "Luke 1:1–24:53". Editable in Outline → Book details; auto-filled on book pick. Clamps the coverage readout. |
| `start_date` | TEXT | Series start; the basis for Suggest Sundays (Schedule). |
| `end_date` | TEXT | Mirrors the last dated sermon (derived on Schedule). |
| `structural_outline` | TEXT | The book's literary/commentary outline — pastor-typed or pasted. Lives once here, shown as **Reference** (Outline → book node, collapsed) and as the study guide's Reference part. `book_structure` was folded into this column (v26). AI-free since ARI. |
| `status` | TEXT | `in_progress \| complete` — two-state lifecycle (v16 collapse). `SERIES_STATUS` in `src/core/contracts.ts`; `create-series` writes `in_progress`. (CREATE TABLE default is a vestigial `'planning'`, always overwritten on insert.) Edited in Outline → Book details. |
| `canon_category` | TEXT | Dever 7-genre key: `ot_law \| ot_history \| ot_writings \| ot_prophets \| nt_gospels \| nt_pauline \| nt_general`. NULL or `''` = unclassified. Auto-filled from the chosen book, pastor-overridable in Outline → Book details. (v25 switch from legacy `ot \| nt \| wisdom \| prophetic`.) |
| `book_id` | TEXT | Stable key of the chosen canonical book (e.g. `luke`) from `src/data/canonicalBooks.js`; NULL until a book is picked (Outline → Book details). Only the key is stored — genre, testament, and span are looked up from that bundled module at render. Persisted via `updateSeries`, never the create INSERT. (v25) |
| `kind` | TEXT | Planner mode discriminator: `book` (default) \| `topical`. A topical series is theme-led (Big Idea ▸ Sermon, passages drawn from many books) rather than book-led; the mode is **explicit**, NOT inferred from `book_id` being NULL (a book series also has a null `book_id` mid-create). DEFAULT `'book'` (no backfill). Persisted via `updateSeries`, never the create INSERT. (v30) |
| `redemptive_context` | TEXT | **Retired from the writable set (v27).** Was a book-study prompt on the old Understand movement; no longer rendered or written. Retained as a backup column — never dropped or nulled. |
| `book_background` | TEXT | **Retired from the writable set (v27).** Was a book-study prompt; no longer rendered or written. Backup column. |
| `book_argument` | TEXT | **Retired from the writable set (v27).** Was a book-study prompt; no longer rendered or written. Backup column. |
| `book_structure` | TEXT | **Retired live field (v26).** Was "How the Book Is Built"; folded into `structural_outline` and no longer rendered or exported. Backup column. |
| `series_motivation` | TEXT | **Retired from the writable set (v27).** Was the Design "hinge" field; no longer rendered or written. Backup column. |
| `emerging_big_idea` | TEXT | **Retired from the writable set (v27).** Was "the melodic line"; the concept was removed in the content-model rebuild. Backup column. |
| `melodic_evidence` | TEXT (JSON) | **Retired from the writable set (v27).** Was the "Hear the line" evidence worksheet; the concept was removed in the content-model rebuild. Backup column. (Added v26.) |

---

## Table: series_sections

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PRIMARY KEY | |
| `series_id` | TEXT | FK to series |
| `title` | TEXT | |
| `passage_range` | TEXT | |
| `big_idea` | TEXT | |
| `overview` | TEXT | |
| `sort_order` | INTEGER | |
| `created_at` | TEXT | |

---

## Table: sermons

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PRIMARY KEY | |
| `series_id` | TEXT | FK to series (NULL for one-off sermons) |
| `section_id` | TEXT | FK to series_sections (optional) |
| `sort_order` | INTEGER | Pastor-authored per-sermon order for a **topical** series' flat sermon list (a theme has no book reading order). Nullable — NULL sorts last via `COALESCE` in `seriesSermonOrderBy`; book-series sermons stay NULL and order by their section. Persisted via `updateSermon`, never the create INSERT. The ordering READ is live — every series-sermon fetch (`get-sermons-by-series`, the Schedule, the study-guide export) routes through `seriesSermonOrderBy`. (v30) |
| `is_one_off` | INTEGER | 1 if standalone sermon, 0 if series sermon |
| `title` | TEXT | |
| `passage` | TEXT | Free-text display reference (e.g. `Genesis 12:1-3`). For a **topical** sermon it is composed from `book_id` + a chapter:verse ref entered in the Outline, so the two can't disagree (no dual source of truth). |
| `book_id` | TEXT | Structured per-sermon canonical book key (e.g. `genesis`), mirroring `series.book_id` and keying into `src/data/canonicalBooks.js`. Nullable — only **topical** sermons carry their own (picked per-sermon in the Outline); book-series sermons stay NULL and inherit `series.book_id` via the effective-book helper (`sermon.book_id ?? series.book_id`, `src/utils/arc.js`). Persisted via `updateSermon`, never the create INSERT. (v31) |
| `date` | TEXT | |
| `preacher` | TEXT | |
| `stage` | TEXT | `in_progress \| complete` — two-state lifecycle since the v16 collapse (NOT the old 6-state process position). `SERMON_STATUS` in `src/core/contracts.ts`; `create-sermon` writes `in_progress`; `complete` renders as "Preached". The real process position lives in `current_stage` / `current_sub_phase`. (CREATE TABLE default is a vestigial `'planning'`, always overwritten on insert.) |
| `big_idea` | TEXT | Sermon-level big idea — the one-line idea of this passage (Outline → sermon). Re-added v27 with this fresh meaning (it had been dropped in v11). Distinct from the sermon's MPT/MPS. Persisted via `updateSermon` (create-then-update); the create INSERT is never widened. |
| `overview` | TEXT | Sermon-level overview paragraph (Outline → sermon) — becomes the study guide's per-sermon commentary body. Migrated from the retired `study_guide_note` where present (v27). Persisted via `updateSermon`. |
| `study_guide_extras` | TEXT (JSON) | Guide-local study-guide layer for this sermon's booklet page: `{ additions: [{id,type,text}], notesLines: int }` (type ∈ `question \| cross-reference \| quote`). Nullable; fail-soft parse. "Import from outline" never writes it, so re-import preserves additions/notes. Persisted via `updateSermon`, never the create INSERT. (v27) |
| `mpt` | TEXT | Main Point of the Text (past tense) |
| `mps` | TEXT | Main Point of the Sermon (present tense) |
| `observations` | TEXT | Study sub-phase 1 — Observe (JSON: structured per-question fields, or legacy plain text) |
| `interpretation` | TEXT | Study sub-phase 2 — Interpret (JSON: structured per-question fields, or legacy plain text) |
| `redemptive_thread` | TEXT | Study sub-phase 3 — Redemptive Thread (JSON: structured per-question fields + summary, or legacy plain text) |
| `implications` | TEXT | Study sub-phase 4 — Implications (JSON: structured per-question fields + compiled, or legacy plain text) |
| `outline` | TEXT | JSON array of point strings |
| `manuscript` | TEXT | |
| `delivery_notes` | TEXT | Dead column — Delivery stage struck in v24; removed from the writable allowlist, retained in the DB |
| `timing_notes` | TEXT | Dead column — same as `delivery_notes` |
| `post_sermon` | TEXT | |
| `functional_elements` | TEXT | JSON object `{0:{explanation,application,illustration},...}` — keyed by outline point UUID |
| `checklist` | TEXT | JSON object keyed by item label `{label:bool,...}` |
| `topic_theme` | — | **REMOVED** in the trail deletion sweep (Phase B1): not in `CREATE TABLE`, not in the v14 backfill, not in `SERMON_COLUMNS`. Old DBs may keep it as an orphan column; new DBs never get it, and nothing reads/writes it. PC's substance moved to Phase 4 Field 3 (`implications.pastoral_context`). |
| `audience_assumptions` | — | **REMOVED** in the trail deletion sweep (Phase B1): not in `CREATE TABLE`, not in the v14 backfill, not in `SERMON_COLUMNS`. Old DBs may keep it as an orphan column; new DBs never get it. |
| `background_noise` | — | **REMOVED** in the trail deletion sweep (Phase B1): not in `CREATE TABLE`, not in the v14 backfill, not in `SERMON_COLUMNS`. Old DBs may keep it as an orphan column; new DBs never get it. |
| `study_guide_note` | TEXT | **Retired from the writable set (v27).** Was a short congregation-orienting note; its content was folded into the sermon `overview` (run-once, where overview was empty). Retained as a backup column — never dropped or nulled. |
| `preaching_blocks` | TEXT | CMC (Contour-Mapped Compression) without-notes output; added v8 migration |
| `manuscript_delivery` | TEXT | AI-formatted delivery manuscript; added v9 migration |
| `last_tune_up` | TEXT | JSON `{content, ts}` snapshot of the most recent Final Tune-Up response; added v12 migration |
| `current_stage` | TEXT | Canonical process position — stage; spine layer; added v17 migration |
| `current_sub_phase` | TEXT | Canonical process position — sub-phase; spine layer. Spans Study sub-phases (Observe / Interpret / RedemptiveThread / Implications) AND Assembly sub-phases (Anchor / Outline / Equip / Frame) post-workspace-restructure 2026-05-10. Added v17 migration. |
| `sermon_frame` | TEXT | JSON envelope for Intro / Conclusion per SADI ratification; same per-question shape as the four Exegesis sub-phase columns; added v18 migration (originally SPRD C3 — STAGE.Frame elevation; post-workspace-restructure 2026-05-10 the data feeds Assembly's Frame sub-phase). |
| `main_point_pair` | TEXT | JSON envelope for MPT (2 questions: `draft`, `tighten`) and MPS (3 questions: `translate`, `gospel_check`, `tighten`); SADI Step 2 plumbing; added v19 migration. The flat `mpt` / `mps` columns are kept defensively and auto-synced from the `tighten` answers on write. |
| `notebook_study` | TEXT | Per-stage free-form pastor notebook surfaced via the trail's bottom-slide `NotebookDrawer` in Study (WTC DW8); added v20 migration (ARI Phase 3). |
| `notebook_blueprint` | TEXT | Per-stage free-form pastor notebook surfaced in Assembly (column name preserved from pre-restructure schema). Added v20 migration. |
| `notebook_manuscript` | TEXT | Per-stage free-form pastor notebook surfaced in the Manuscript writing room. Added v20 migration. |
| `last_study_subphase` | TEXT | Pastor's last position within Study (one of `Observe \| Interpret \| RedemptiveThread \| Implications`). Restored on re-entry to Study so tabbing across stages preserves the within-stage cursor. Added v21 migration; replaces the per-sermon `sermonforge_*_subphase_*` localStorage scatter that was fragile across resets and seed-replacement flows. |
| `last_assembly_subphase` | TEXT | Pastor's last position within Assembly (one of `Anchor \| Outline \| Equip \| Frame`). Same purpose as `last_study_subphase` for the Assembly stage. Added v21 migration. |
| `last_touched_position` | TEXT | Pastor's last-touched field-level position, stored as canonical slash-composite `"<stage>/<subPhase>/<fieldKey>"`. NULL = first session (sermon-start landing fires); non-NULL = land on that field on re-open. Written by the writing surface on every arrival at a question. Added v23 migration (trail deletion sweep, Phase D1). Distinct from `current_step` (retired Phase B2) — same conceptual role, different field, different fate. |
| `thresholds_seen` | TEXT | JSON array of dismissed threshold ids. One mechanism for "has this threshold been dismissed" across sermon-start, Study→Anchor handoff, and any future threshold — so the codebase doesn't accumulate one boolean per threshold. Defaults to `'[]'`. Added v23 migration (trail deletion sweep, Phase D1). |
| `tags` | TEXT (JSON) | JSON array of free-form, sermon-level topic strings (e.g. `["money","prayer"]`), tagged at prep in the workspace Topics field. Mirrors the `thresholds_seen` pattern (`NOT NULL DEFAULT '[]'`, fail-soft parse via `src/utils/tags.js`). Sermon-level so the Topics lens reaches into book series; optional + partial. Read distinct + sorted via IPC `get-all-tags` for the own-tag autocomplete + the Topics lens (no tags table at one-pastor scale). Persisted via `updateSermon` (workspace autosave), never the create INSERT. AI-free. (v32) |
| `deleted_at` | TEXT | Soft-delete tombstone — NULL = live, ISO timestamp = deleted. Written only by main's `delete-sermon` / `restore-sermon` ops (deliberately NOT in `SERMON_COLUMNS`); every list read and search excludes tombstoned rows. Added v24 migration. |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

---

## Table: sermon_search

System-managed full-content search index for sermons. The renderer never
writes to it directly; `validateAndCommit` in `electron/main.js` calls the
indexer on every sermon create / update / delete so this table stays in
sync. Search runs as LIKE-based matching against the flattened text columns.

| Column | Type | Notes |
|--------|------|-------|
| `sermon_id` | TEXT PRIMARY KEY | FK to `sermons.id` |
| `title` | TEXT | Sermon title, plain text |
| `passage` | TEXT | Passage reference, plain text |
| `series_title` | TEXT | Joined from `series.title` at index time; re-indexed when the parent series is renamed |
| `observations` | TEXT | Flattened text of the Study Observe JSON envelope |
| `interpretation` | TEXT | Flattened text of the Study Interpret JSON envelope |
| `redemptive_thread` | TEXT | Flattened text of the Study Redemptive Thread JSON envelope |
| `implications` | TEXT | Flattened text of the Study Implications JSON envelope |
| `main_point_pair` | TEXT | Flattened text of the Assembly Anchor Main Point Pair envelope |
| `outline` | TEXT | Flattened text of the outline JSON array (point titles concatenated) |
| `manuscript` | TEXT | Flattened text of the manuscript JSON envelope |
| `sermon_frame` | TEXT | Flattened text of the Assembly Frame envelope (Intro + Conclusion) |
| `notebook_study` | TEXT | Plain notebook text |
| `notebook_blueprint` | TEXT | Plain notebook text (column name preserved from pre-restructure schema; feeds Assembly's notebook) |
| `notebook_manuscript` | TEXT | Plain notebook text |
| `functional_elements` | TEXT | Flattened text of the sermon body (per-point explanation / illustration / application). Added in the v24 rebuild, which also dropped `delivery_notes` / `timing_notes` (their stage UI is gone) |

Added v22 migration; rebuilt (drop + recreate + full reindex) in v24. The
table is created FROM `SERMON_SEARCH_COLUMNS` in `electron/main.js` so the
schema and the indexer can't drift.

> **Why not FTS5:** the table predates the better-sqlite3 driver swap (`sql.js` lacked FTS5). It remains a regular SQLite table with one row per sermon and per-column flattened text; LIKE-based matching is fast enough at typical pastor library sizes (<500 sermons). better-sqlite3 has FTS5 available if libraries grow significantly.

---

## Table: calendar_notes

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PRIMARY KEY | |
| `date` | TEXT | `"YYYY-MM-DD"` |
| `type` | TEXT | `holiday \| guest \| break \| special` |
| `label` | TEXT | |
| `notes` | TEXT | |
| `created_at` | TEXT | |

---

## Table: meta

| Column | Type | Notes |
|--------|------|-------|
| `key` | TEXT PRIMARY KEY | |
| `value` | TEXT | |

Stores `schema_version`. Read via IPC `"db-getSchemaVersion"`.

---

## Table: settings

User preferences as key/value strings. Distinct from `meta` (which is for system-managed schema state).

| Column | Type | Notes |
|--------|------|-------|
| `key` | TEXT PRIMARY KEY | |
| `value` | TEXT | |

Read/write via IPC `"db-getSetting"` / `"db-setSetting"`.
