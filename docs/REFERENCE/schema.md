# SermonForge — Database Schema Reference

Current schema version: **22**

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

---

## Table: series

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PRIMARY KEY | |
| `title` | TEXT | |
| `color` | TEXT | `gold \| crimson \| sage \| slate` |
| `description` | TEXT | |
| `year` | INTEGER | |
| `big_idea` | TEXT | Series-level big idea |
| `overview` | TEXT | Extended theological narrative |
| `passage_range` | TEXT | e.g. "Luke 1:1–24:53" |
| `start_date` | TEXT | |
| `end_date` | TEXT | |
| `structural_outline` | TEXT | Detailed book outline (paste or AI-generated) |
| `status` | TEXT | `planning \| active \| complete` |
| `canon_category` | TEXT | `ot \| nt \| wisdom \| prophetic` |
| `redemptive_context` | TEXT | Where this book sits in the arc from creation to new creation (Book Study; feeds tier 4) |
| `book_background` | TEXT | Author, audience, occasion, historical setting, genre (Book Study; excluded from per-sermon context) |
| `book_argument` | TEXT | The book's controlling argument or central purpose (Book Study; excluded from per-sermon context) |
| `book_structure` | TEXT | Major movements, structural markers, turning points (Book Study; excluded from per-sermon context) |
| `series_motivation` | TEXT | Why this congregation needs this book now (Book Study; feeds tier 4) |
| `emerging_big_idea` | TEXT | Working draft of the series big idea, developed in Book Study (excluded from per-sermon context) |

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
| `is_one_off` | INTEGER | 1 if standalone sermon, 0 if series sermon |
| `title` | TEXT | |
| `passage` | TEXT | |
| `date` | TEXT | |
| `preacher` | TEXT | |
| `stage` | TEXT | `planning \| study \| outline \| writing \| ready \| archived` |
| `big_idea` | TEXT | (legacy — never written via IPC; sermon big idea is always read through the series JOIN) |
| `mpt` | TEXT | Main Point of the Text (past tense) |
| `mps` | TEXT | Main Point of the Sermon (present tense) |
| `observations` | TEXT | Study sub-phase 1 — Observe (JSON: structured per-question fields, or legacy plain text) |
| `interpretation` | TEXT | Study sub-phase 2 — Interpret (JSON: structured per-question fields, or legacy plain text) |
| `redemptive_thread` | TEXT | Study sub-phase 3 — Redemptive Thread (JSON: structured per-question fields + summary, or legacy plain text) |
| `implications` | TEXT | Study sub-phase 4 — Implications (JSON: structured per-question fields + compiled, or legacy plain text) |
| `outline` | TEXT | JSON array of point strings |
| `manuscript` | TEXT | |
| `delivery_notes` | TEXT | |
| `timing_notes` | TEXT | |
| `post_sermon` | TEXT | |
| `functional_elements` | TEXT | JSON object `{0:{explanation,application,illustration},...}` — keyed by outline point UUID |
| `checklist` | TEXT | JSON object keyed by item label `{label:bool,...}` |
| `topic_theme` | TEXT | Legacy PC column (v6); retained defensively, no longer rendered or read by the AI context tier. PC's substance moved to Phase 4 Field 3 (`implications.pastoral_context.cost_and_gift`) in SPRD B4.2. |
| `audience_assumptions` | TEXT | Legacy PC column (v6); retained defensively, no longer rendered or read by the AI context tier. PC's substance moved to Phase 4 Field 3 (`implications.pastoral_context.room_specifics`) in SPRD B4.2. |
| `background_noise` | TEXT | Legacy PC column (v6); retained defensively, no longer rendered or read by the AI context tier. PC's substance is folded into Phase 4 Field 3 in SPRD B4.2. |
| `study_guide_note` | TEXT | Short note orienting congregation readers to how this sermon fits the series arc |
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
| `delivery_notes` | TEXT | Plain text |
| `timing_notes` | TEXT | Plain text |

Added v22 migration. Backfill on first launch indexes every existing sermon.

> **Why not FTS5:** `sql.js` (the sermon DB's engine) doesn't compile the FTS5 extension by default. Rather than swap the WASM build, the search table is a regular SQLite table with one row per sermon and per-column flattened text. LIKE-based matching is fast enough at typical pastor library sizes (<500 sermons). If libraries grow significantly, swapping to FTS5 (or building a sql.js variant with FTS5 enabled) is the future-state path.

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
