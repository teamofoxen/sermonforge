"""
load.py

Load chunked paragraphs into data/theology.db.

Idempotent: deletes any existing rows with this manifest's work_id before
inserting, so re-running the pipeline replaces a work cleanly without leaving
half-state.

Usage:
    python scripts/theology/ingest/load.py <manifest.yaml>

Input:
    corpus/chunked/<manifest.id>/chunks.jsonl

The load populates both the legacy columns (author, work, section, text)
and the new metadata columns added by migrate_schema.py. The legacy
`section` column is populated with the human-readable locator so existing
FTS-on-section queries continue to work.

After this script runs you still need to rebuild the FTS and vector
indexes — they are not maintained incrementally:

    python scripts/theology/build_theology_fts.py
    npx electron scripts/theology/build_theology_vectors.js

Note: the FTS builder currently targets the project-root theology.db.
It will need a one-line fix to target data/theology.db before re-running.
"""

import argparse
import datetime as dt
import json
import os
import sqlite3
import sys
from pathlib import Path

try:
    import yaml
except ImportError as e:
    sys.exit(f"Missing dependency: {e.name}. Install with: pip install pyyaml")


REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DB_PATH = REPO_ROOT / "data" / "theology.db"


INSERT_SQL = """
INSERT INTO theology (
    id, author, work, section, text,
    work_id, book, chapter, section_start, section_end,
    ccel_page_start, ccel_page_end, locator, word_count, content_hash,
    chunk_index, corpus_version, ingested_at
) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?
)
"""


def load(manifest_path):
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = yaml.safe_load(f)

    work_id = manifest["id"]
    author = manifest["author"]
    work_title = manifest["work"]
    corpus_version = manifest.get("corpus_version", "unknown")
    ingested_at = dt.datetime.now().isoformat(timespec="seconds")

    chunks_path = REPO_ROOT / "corpus" / "chunked" / work_id / "chunks.jsonl"
    if not chunks_path.exists():
        sys.exit(f"Chunks not found at {chunks_path}. Run chunk.py first.")

    if not DB_PATH.exists():
        sys.exit(f"theology.db not found at {DB_PATH}")

    chunks = []
    with open(chunks_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))
    print(f"[load] Read {len(chunks)} chunks from {chunks_path}")

    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    # Idempotent delete: remove any existing rows with this work_id.
    cur.execute("SELECT COUNT(*) FROM theology WHERE work_id = ?", (work_id,))
    existing = cur.fetchone()[0]
    if existing:
        print(f"[load] Deleting {existing} existing rows with work_id='{work_id}'")
        cur.execute("DELETE FROM theology WHERE work_id = ?", (work_id,))

    # Insert all chunks.
    rows = []
    for c in chunks:
        row_id = f"{work_id}:{c['chunk_index']:05d}"
        rows.append((
            row_id,
            author,
            work_title,
            c["locator"],          # legacy `section` column gets the locator string
            c["text"],
            work_id,
            c.get("book"),
            c.get("chapter"),
            c.get("section_start"),
            c.get("section_end"),
            c.get("ccel_page_start"),
            c.get("ccel_page_end"),
            c["locator"],
            c.get("word_count"),
            c["content_hash"],
            c["chunk_index"],
            corpus_version,
            ingested_at,
        ))

    cur.executemany(INSERT_SQL, rows)
    conn.commit()

    # Verify.
    cur.execute(
        "SELECT COUNT(*), MIN(ccel_page_start), MAX(ccel_page_end) "
        "FROM theology WHERE work_id = ?",
        (work_id,),
    )
    count, min_page, max_page = cur.fetchone()

    cur.execute(
        "SELECT corpus_version, COUNT(*) FROM theology GROUP BY corpus_version"
    )
    by_version = cur.fetchall()

    conn.close()

    print(f"[load] Inserted {count} rows for work_id='{work_id}'")
    print(f"[load] Page range in loaded rows: {min_page}–{max_page}")
    print(f"[load] Corpus version counts across whole table: {by_version}")
    print("[load] Done. Next: rebuild FTS and vector indexes.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("manifest", help="Path to corpus/manifest/<work>.yaml")
    args = ap.parse_args()
    if not os.path.exists(args.manifest):
        sys.exit(f"Manifest not found: {args.manifest}")
    load(args.manifest)


if __name__ == "__main__":
    main()
