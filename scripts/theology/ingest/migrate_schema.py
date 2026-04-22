"""
migrate_schema.py

Additive migration for data/theology.db.

Adds metadata columns needed by the curated-corpus ingestion pipeline:
work_id, book, chapter, section_start, section_end, ccel_page_start,
ccel_page_end, locator, word_count, content_hash, chunk_index,
corpus_version, ingested_at.

Idempotent — safe to re-run. Checks PRAGMA table_info before each ADD COLUMN.
Pre-existing rows (corpus_version IS NULL after the migration) are tagged
as corpus_version='legacy'.

Usage:
    python scripts/theology/ingest/migrate_schema.py

The script targets data/theology.db (the live DB read by the app). The
older copy at the project root is left alone.
"""

import sqlite3
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DB_PATH = REPO_ROOT / "data" / "theology.db"

# Order matters only for readability. All columns are nullable TEXT/INTEGER.
COLUMNS_TO_ADD = [
    ("work_id", "TEXT"),
    ("book", "INTEGER"),
    ("chapter", "INTEGER"),
    ("section_start", "INTEGER"),
    ("section_end", "INTEGER"),
    ("ccel_page_start", "INTEGER"),
    ("ccel_page_end", "INTEGER"),
    ("locator", "TEXT"),
    ("word_count", "INTEGER"),
    ("content_hash", "TEXT"),
    ("chunk_index", "INTEGER"),
    ("corpus_version", "TEXT"),
    ("ingested_at", "TEXT"),
]


def main():
    if not DB_PATH.exists():
        sys.exit(f"theology.db not found at {DB_PATH}")

    print(f"[migrate] Opening {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(theology)")
    existing = {row[1] for row in cur.fetchall()}
    print(f"[migrate] Existing columns on theology: {sorted(existing)}")

    added, skipped = [], []
    for col, typ in COLUMNS_TO_ADD:
        if col in existing:
            skipped.append(col)
        else:
            cur.execute(f"ALTER TABLE theology ADD COLUMN {col} {typ}")
            added.append(col)

    # Tag any rows that have no corpus_version yet as 'legacy'.
    cur.execute(
        "UPDATE theology SET corpus_version = 'legacy' WHERE corpus_version IS NULL"
    )
    legacy_tagged = cur.rowcount

    conn.commit()
    conn.close()

    print(f"[migrate] Added {len(added)} columns: {added}")
    print(f"[migrate] Skipped {len(skipped)} already-present: {skipped}")
    print(f"[migrate] Tagged {legacy_tagged} pre-existing rows as corpus_version='legacy'")
    print("[migrate] Done.")


if __name__ == "__main__":
    main()
