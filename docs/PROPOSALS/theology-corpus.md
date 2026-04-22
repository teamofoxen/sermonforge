# Proposal: Curated Theology Corpus

> **Status:** Draft — 2026-04-21
> **Owner:** Ross
> **Motivation:** The current theology search indexes whatever was ingested ad hoc.
> Retrieval quality, citation trust, and domain relevance are all bottlenecked by the
> corpus itself. Better embeddings, rerankers, and page citations are polish on noise
> until the corpus is curated, versioned, and provenance-tracked. See Commonplace.study
> for a reference UX built on a curated Reformed/Puritan corpus.

---

## 1. Goals

- A **curated, versioned** theology corpus with clean provenance per work.
- Per-chunk citation down to **author, work, edition, page** (or locator equivalent).
- Reproducible ingestion — any chunk in the DB traces back to a source artifact and a
  documented transform.
- No change to the existing runtime search path (FTS4 + vec0) until the corpus is
  trustworthy. Schema extensions are additive.

## 2. Non-Goals

- Switching embedding models, adding a reranker, or building a dedicated
  "ask the tradition" RAG flow. These are **downstream** of this proposal.
- Copyrighted / in-print works. Public domain only in phase 1.
- Latin-scholastic translation pipeline. Deferred to a later phase.

---

## 3. Current State

**Schema** (`theology.db`):

```
theology(rowid, author, work, section, text)        -- ~600-word chunks
theology_fts (FTS4, content="theology")              -- keyword
theology_vec (vec0, 384-dim MiniLM-L6-v2)            -- semantic
```

**Gaps:**

- No `edition`, no `page`, no `source_url`, no `license`, no `ingested_at`, no
  `content_hash`.
- `section` is a free-text string with no guarantee of structure across works.
- No record of *which* corpus version a given DB was built from — re-runs are not
  idempotent across source changes.
- Chunking happens "upstream" of these scripts with no checked-in ingest step.

---

## 4. Target State

### 4.1 Source policy — phase 1 (public domain pre-1928)

Tier A (seed, ~20 works) — canonical, widely cited, clean source scans available:

- Calvin, *Institutes of the Christian Religion* (Beveridge tr.)
- Calvin, *Commentaries* (selected books — start with Genesis, Romans, Gospel harmony)
- Owen, *Works* (Goold edition, 16 vols)
- Turretin, *Institutes of Elenctic Theology* (Giger tr., if PD status confirmed;
  otherwise defer)
- Augustine, *City of God* (Dods tr.)
- Spurgeon, *Treasury of David*; selected sermons
- Bavinck, *Reformed Dogmatics* (Dutch PD; English tr. is **not** PD — defer)
- Westminster Standards (Confession, Larger + Shorter Catechisms)
- Heidelberg Catechism, Belgic Confession, Canons of Dort

Tier B (expand after Tier A ingestion is green):

- Edwards, Bunyan, Flavel, Sibbes, Boston, Brakel (Dutch/English availability varies)
- Puritan sermon volumes from Banner of Truth reprints whose underlying text is PD

**Source repositories, in priority order:**

1. **CCEL** (ccel.org) — cleanest TEI/XML for many Reformed classics; permissive license
2. **PRDL** (prdl.org) — metadata + links to primary scans
3. **Internet Archive** — scans + OCR; quality varies, must be reviewed
4. **Project Gutenberg** — clean text for a narrower set

### 4.2 Provenance tracking

Every work gets a manifest entry before ingestion:

```yaml
# corpus/manifest/calvin_institutes_beveridge.yaml
id: calvin_institutes_beveridge_1845
author: "John Calvin"
work: "Institutes of the Christian Religion"
translator: "Henry Beveridge"
edition: "Edinburgh: Calvin Translation Society, 1845"
language: en
source_url: "https://archive.org/details/..."
source_type: "archive_org_djvu_txt"
license: "public-domain-pre-1928"
retrieved_at: "2026-04-21"
content_sha256: "…"      # hash of raw source file
page_map: "pdf"           # how page numbers are reconstructed (pdf | tei | none)
notes: |
  Beveridge translation, not Battles. Page numbers map to the 1845 Edinburgh
  printing preserved in the Archive.org scan.
```

Manifests live in `corpus/manifest/*.yaml` and are checked into the repo. Raw sources
live **outside** the repo (they are large and reconstructible from `source_url` +
`content_sha256`).

### 4.3 Schema changes — additive

New columns on `theology`:

```sql
ALTER TABLE theology ADD COLUMN work_id TEXT;        -- FK to works.id
ALTER TABLE theology ADD COLUMN edition TEXT;
ALTER TABLE theology ADD COLUMN page INTEGER;         -- nullable; some works have no pages
ALTER TABLE theology ADD COLUMN locator TEXT;         -- e.g. "Book 3, ch. 21, §5" fallback
ALTER TABLE theology ADD COLUMN source_url TEXT;
ALTER TABLE theology ADD COLUMN chunk_index INTEGER;  -- order within work
ALTER TABLE theology ADD COLUMN content_hash TEXT;    -- sha256 of chunk text
ALTER TABLE theology ADD COLUMN ingested_at TEXT;     -- ISO date
ALTER TABLE theology ADD COLUMN corpus_version TEXT;  -- e.g. "2026.04"
```

New `works` table (one row per source work, joined via `work_id`):

```sql
CREATE TABLE works (
  id TEXT PRIMARY KEY,                -- matches manifest id
  author TEXT NOT NULL,
  title TEXT NOT NULL,
  translator TEXT,
  edition TEXT,
  language TEXT NOT NULL,
  source_url TEXT NOT NULL,
  license TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  manifest_path TEXT NOT NULL
);
```

FTS4 and vec0 tables are **rebuilt** from the extended `theology` table — no schema
change to them beyond adding `work_id`/`page`/`locator` to the FTS column list.

### 4.4 Ingestion pipeline

One script per stage, under `scripts/theology/ingest/`:

1. **`00_fetch.py`** — reads a manifest, downloads the source, verifies
   `content_sha256`, writes to `corpus/raw/<id>/`.
2. **`10_normalize.py`** — source-type-specific cleanup (CCEL TEI → text, Archive.org
   DjVu → text, Gutenberg header/footer strip). Emits normalized text + a
   page/locator map.
3. **`20_chunk.py`** — ~600-word chunks, respecting section boundaries where the
   locator map provides them. Emits a JSONL with `{work_id, chunk_index, page,
   locator, section, text, content_hash}`.
4. **`30_load.py`** — upserts into `works` + `theology`, tagging `corpus_version`.
   Idempotent on `(work_id, chunk_index, content_hash)`.
5. **`40_build_indexes`** — existing `build_theology_fts.py` + `build_theology_vectors.js`,
   re-run against the extended table.

Runtime query path ([electron/main.js:1189](electron/main.js:1189)) is unchanged in
phase 1 except results now include `page` / `locator` / `source_url`, which the
AI panel can surface as footnote-style citations.

---

## 5. Quality Gates

A work is **not** merged into `theology.db` until:

- Manifest exists with a confirmed public-domain license string.
- `content_sha256` of the raw source matches the manifest.
- A human has spot-checked 5 random chunks against the source scan for OCR /
  normalization errors.
- Page numbers (or locators) round-trip: picking a chunk and opening `source_url` at
  the recorded page actually shows that text.

---

## 6. Phasing

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| 0 | Schema migration (additive), `works` table, corpus version tagging | Existing corpus re-tagged as `corpus_version="legacy"`; no runtime regression |
| 1 | Ingestion pipeline scripts + 3 seed works (Institutes, Westminster, Augustine *City of God*) | 3 works ingested end-to-end with page citations surfacing in AI panel |
| 2 | Expand to full Tier A (~20 works) | All Tier A manifests green through quality gates |
| 3 | Tier B expansion | Reassess after phase 2 — may defer indefinitely |

Phases 0 and 1 are the only committed scope. Later phases revisit after phase 1 ships.

---

## 7. Open Questions

- **Where does raw source storage live?** Outside the repo is required (size), but we
  need a canonical location — user's machine only, or a shared bucket? Affects whether
  other contributors can reproduce an ingestion.
- **License review burden.** Pre-1928 US public domain is clean for scans of original
  editions, but translations muddy the waters (Giger's Turretin, Battles' Calvin). A
  per-work license check is unavoidable and slow.
- **Page-number fidelity for non-paginated sources** (TEI without `<pb>`, plaintext
  Gutenberg). Fallback is `locator` (book/chapter/section). Decide whether that is
  acceptable for citation UX or whether those works are deferred until a paginated
  source is found.
- **Corpus version and the vector index.** If `corpus_version` changes, do we keep old
  embeddings or rebuild? Leaning rebuild — it is a one-time 30–60 min cost and
  avoids drift between FTS and vec tables.

---

## 8. Deferred (paperclipped 2026-04-21)

Captured mid-Phase-1 for later pickup:

- **`scripts/theology/ingest/run.py`** — one-command wrapper that runs fetch → parse → chunk → load → FTS → vectors against a manifest. Every stage is already idempotent/manifest-driven; this is pure orchestration.
- **`scripts/theology/ingest/scaffold_manifest.py`** — inspects a ThML XML file and emits a draft manifest (author/work/translator from `<generalInfo>` + `<printSourceInfo>`, structure block inferred from the div tree, sha256 computed). Human still picks scope when a file bundles multiple works (e.g., NPNF vols) and confirms locator conventions. Paired with `run.py`, new-work ingest becomes: drop XML → scaffold → eyeball 2–3 fields → run.py.
- **Westminster Standards** — the 3rd Phase 1 seed work. Deferred until the two wrappers above exist; doing it by hand would duplicate Calvin+Augustine effort.
- **Legacy `work_id=NULL` rows** — 160,785 pre-manifest chunks still in `theology.db` tagged `corpus_version="legacy"`. Will need re-manifesting or deprecation before Phase 2.
- **Legacy-row inventory pass** — read-only investigation: distribution of authors/works, chunk size histogram, duplicate detection, share of chunks over MiniLM-L6's ~256-token truncation point, parseability of the free-text `section` field. Output a prioritized cleanup plan. Cleanup (dedupe / dejunk / resize) affects retrieval precision directly (embeddings for oversized chunks truncate, duplicates crowd top-K, junk matches broad queries); metadata backfill does not. Do inventory first, pick targets second.
- **CCEL deep-link URL pattern for NPNF** — Calvin's retrieval UI uses `ccel.org/ccel/calvin/institutes/Page_N.html`. NPNF pattern is unconfirmed; need one working CoG page URL from ccel.org to wire up the "View on CCEL" link for Augustine chunks.

## 9. What This Does Not Unlock On Its Own

This proposal produces a trustworthy corpus with citation metadata. It does **not**:

- Improve retrieval precision (still MiniLM-L6 + FTS).
- Add a reranker.
- Build a dedicated "ask the tradition" flow distinct from sermon-context injection.
- Handle Latin scholastics.

Those remain downstream proposals that become worth doing *because* the corpus is
trustworthy — not before.
