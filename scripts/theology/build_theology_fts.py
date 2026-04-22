"""
build_theology_fts.py
Adds an FTS4 index to theology.db. Run once from the project root.
Safe to re-run — drops and rebuilds if the index already exists.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "theology.db")

def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: theology.db not found at {DB_PATH}")
        return

    print(f"Opening {DB_PATH} ...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check row count so we can show progress
    cursor.execute("SELECT COUNT(*) FROM theology")
    row_count = cursor.fetchone()[0]
    print(f"Found {row_count:,} rows in theology table.")

    # Drop existing FTS table if present
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='theology_fts'")
    if cursor.fetchone():
        print("Existing theology_fts found — dropping it...")
        cursor.execute("DROP TABLE IF EXISTS theology_fts")
        conn.commit()

    # Create FTS4 virtual table as a content table (references theology, no data duplication)
    print("Creating FTS4 virtual table...")
    cursor.execute("""
        CREATE VIRTUAL TABLE theology_fts
        USING fts4(content="theology", author, work, section, text)
    """)
    conn.commit()

    # Populate the FTS index from the main table
    print("Building index — this will take a few minutes...")
    cursor.execute("""
        INSERT INTO theology_fts(rowid, author, work, section, text)
        SELECT rowid, author, work, section, text FROM theology
    """)
    conn.commit()
    print("Index populated.")

    # Optimize: merges index segments for faster queries
    print("Optimizing index...")
    cursor.execute("INSERT INTO theology_fts(theology_fts) VALUES('optimize')")
    conn.commit()

    conn.close()
    print("Done. theology.db is ready.")

if __name__ == "__main__":
    main()
