# SermonForge — Database Schema Reference

Current schema version: **7**

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
| `big_idea` | TEXT | |
| `mpt` | TEXT | Main Point of the Text (past tense) |
| `mps` | TEXT | Main Point of the Sermon (present tense) |
| `observations` | TEXT | Step 1 Phase 1 (JSON: structured per-question fields, or legacy plain text) |
| `interpretation` | TEXT | Step 1 Phase 2 (JSON: structured per-question fields, or legacy plain text) |
| `redemptive_thread` | TEXT | Step 1 Phase 3 (JSON: structured per-question fields + summary, or legacy plain text) |
| `implications` | TEXT | Step 1 Phase 4 (JSON: structured per-question fields + compiled, or legacy plain text) |
| `outline` | TEXT | JSON array of point strings |
| `manuscript` | TEXT | |
| `delivery_notes` | TEXT | |
| `timing_notes` | TEXT | |
| `post_sermon` | TEXT | |
| `functional_elements` | TEXT | JSON object `{0:{explanation,application,illustration},...}` — keyed by outline point UUID |
| `checklist` | TEXT | JSON object keyed by item label `{label:bool,...}` |
| `topic_theme` | TEXT | Pastoral Intelligence: the doctrine, situation, or felt need |
| `audience_assumptions` | TEXT | Pastoral Intelligence: who is in the room and what they carry |
| `background_noise` | TEXT | Pastoral Intelligence: external context (news, events, moment) |
| `study_guide_note` | TEXT | Short note orienting congregation readers to how this sermon fits the series arc |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

---

## Table: illustrations

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PRIMARY KEY | |
| `type` | TEXT | `personal \| historical \| biblical \| hypothetical` |
| `text` | TEXT | |
| `tags` | TEXT | JSON array |
| `used_in` | TEXT | JSON array of sermon ids |
| `created_at` | TEXT | |

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

## Table: library

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PRIMARY KEY | |
| `filepath` | TEXT UNIQUE | |
| `filename` | TEXT | |
| `title` | TEXT | |
| `passage` | TEXT | |
| `folder` | TEXT | |
| `series_name` | TEXT | |
| `manuscript_text` | TEXT | |
| `word_count` | INTEGER | |
| `imported_at` | TEXT | |

---

## Table: library_fts

FTS4 virtual table (FTS5 attempted first; see `docs/SYSTEMS/database.md` for rationale).

Columns: `id`, `title`, `passage`, `manuscript_text`

Used for keyword search across the sermon library.

---

## Table: meta

| Column | Type | Notes |
|--------|------|-------|
| `key` | TEXT PRIMARY KEY | |
| `value` | TEXT | |

Stores `schema_version`. Read via IPC `"db-getSchemaVersion"`.
