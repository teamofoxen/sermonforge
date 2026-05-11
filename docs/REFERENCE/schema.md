# SermonForge — Database Schema Reference

Current schema version: **13**

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
| `current_step` | TEXT | **Legacy-tolerated post-workspace-restructure 2026-05-10.** Pre-restructure: canonical process position — Study step; spine layer; added v17 migration. Post-restructure: column retained on disk for legacy data; parsed but ignored on read. Position is now (stage, sub-phase) only. |
| `current_sub_phase` | TEXT | Canonical process position — sub-phase; spine layer. Spans Study sub-phases (Observe / Interpret / RedemptiveThread / Implications) AND Assembly sub-phases (Anchor / Outline / Equip / Frame) post-workspace-restructure 2026-05-10. Added v17 migration. |
| `sermon_frame` | TEXT | JSON envelope for Intro / Conclusion per SADI ratification; same per-question shape as the four Exegesis sub-phase columns; added v18 migration (originally SPRD C3 — STAGE.Frame elevation; post-workspace-restructure 2026-05-10 the data feeds Assembly's Frame sub-phase). |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

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
