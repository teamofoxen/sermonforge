"""
smoke_check.py

Quick sanity check that newly-loaded Calvin chunks are queryable and the
metadata columns are populated. Not part of the pipeline — throwaway
verification tool.

Usage:
    python scripts/theology/ingest/smoke_check.py
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "theology.db"

SQL = """
SELECT locator, ccel_page_start, ccel_page_end, substr(text, 1, 160) AS preview
FROM theology
WHERE work_id = 'calvin_institutes_beveridge_1845'
  AND text LIKE '%justification%'
LIMIT 3
"""

def main():
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    rows = cur.execute(SQL).fetchall()
    print(f"[smoke] Found {len(rows)} Calvin chunks containing 'justification':\n")
    for i, (locator, ps, pe, preview) in enumerate(rows, 1):
        print(f"[{i}] {locator}  (CCEL p. {ps}–{pe})")
        print(f"    {preview}...\n")
    conn.close()


if __name__ == "__main__":
    main()
