# scripts/theology

One-shot builders for the theology search indexes. Run from the repo root.

## Files

- `build_theology_fts.py` — rebuilds the `theology_fts` FTS4 index inside `theology.db`. Drops and recreates on every run.
- `build_theology_vectors.js` — generates `Xenova/all-MiniLM-L6-v2` embeddings for every row in the `theology` table and stores them in the `theology_vec` vec0 table. Skips already-embedded rows, so it is safe to re-run.

## Invariants

- **Chunk size**: rows in the `theology` table are ingested as ~600-word chunks. These scripts assume chunking has already happened upstream — they do not re-chunk. Do not change the chunk size in the ingestion step without re-running both builders against a fresh `theology.db`.
- **Embedding dimension**: `EMBEDDING_DIM = 384`, tied to the MiniLM model. Changing either requires dropping `theology_vec` and re-running `build_theology_vectors.js` end to end (~30–60 min on CPU).
- **Separation**: FTS (`theology_fts`) and vector (`theology_vec`) tables must remain distinct — the main process query paths branch on them independently.

## Running

From the repo root:

```
python scripts/theology/build_theology_fts.py
npx electron scripts/theology/build_theology_vectors.js
```

`build_theology_vectors.js` must run under Electron (not plain Node) because `better-sqlite3` is rebuilt against Electron's ABI.
