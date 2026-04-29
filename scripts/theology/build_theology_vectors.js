/**
 * build_theology_vectors.js
 *
 * One-time script to generate vector embeddings for all theology chunks
 * and store them in a vec0 virtual table inside theology.db.
 *
 * Prerequisites:
 *   npm install (better-sqlite3, sqlite-vec, @xenova/transformers already in package.json)
 *
 * Usage:
 *   npx electron build_theology_vectors.js
 *
 * Must run via Electron (not plain Node) because better-sqlite3 is
 * rebuilt for Electron's ABI. Safe to re-run — skips already-embedded chunks.
 * Estimated time: 30–60 minutes for ~160k chunks on CPU.
 */

const { app } = require("electron");

app.whenReady().then(async () => {
  try {
    await main();
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
  app.quit();
});

// Prevent default window creation
app.on("window-all-closed", () => {});

// ── Configuration ───────────────────────────────────────────────────────────
const Database = require("better-sqlite3");
const sqliteVec = require("sqlite-vec");
const path = require("path");

const THEOLOGY_DB_PATH = path.join(__dirname, "..", "..", "data", "theology.db");
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIM = 384;
const BATCH_SIZE = 64;
const PROGRESS_INTERVAL = 500; // log every N chunks

async function main() {
  // ── Load model ──────────────────────────────────────────────────────────
  console.log(`Loading model: ${MODEL_NAME} ...`);
  const { pipeline } = await import("@xenova/transformers");
  const embedder = await pipeline("feature-extraction", MODEL_NAME, {
    quantized: true, // smaller, faster, minimal quality loss
  });
  console.log("Model loaded.");

  // ── Open database ───────────────────────────────────────────────────────
  const db = new Database(THEOLOGY_DB_PATH);
  sqliteVec.load(db);

  // Create vec0 table if it doesn't exist
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS theology_vec
    USING vec0(embedding float[${EMBEDDING_DIM}])
  `);

  // ── Purge orphan vec rows ─────────────────────────────────────────────
  // load.py deletes theology rows by work_id when re-ingesting; it does NOT
  // delete corresponding theology_vec rows (no FK + vec0 doesn't cascade).
  // Without this purge, KNN returns rowids that no longer exist in theology;
  // the JOIN in theology-search drops them silently and the result set is
  // smaller than it should be. Idempotent: zero-impact when no orphans.
  const orphans = db.prepare(`
    DELETE FROM theology_vec WHERE rowid NOT IN (SELECT rowid FROM theology)
  `).run().changes;
  if (orphans > 0) console.log(`Purged ${orphans} orphan vec rows.`);

  // ── Determine which chunks need embedding ─────────────────────────────
  const totalChunks = db.prepare("SELECT COUNT(*) as cnt FROM theology").get().cnt;
  const existingVecs = db.prepare("SELECT COUNT(*) as cnt FROM theology_vec").get().cnt;
  console.log(`Total chunks: ${totalChunks}, already embedded: ${existingVecs}`);

  if (existingVecs >= totalChunks) {
    console.log("All chunks already have embeddings. Nothing to do.");
    db.close();
    return;
  }

  // Get rowids that are NOT yet in theology_vec
  const pendingRows = db.prepare(`
    SELECT t.rowid, substr(t.text, 1, 512) as text
    FROM theology t
    WHERE t.rowid NOT IN (SELECT rowid FROM theology_vec)
    ORDER BY t.rowid
  `).all();

  console.log(`Chunks to embed: ${pendingRows.length}`);

  // ── Batch embedding + insertion ───────────────────────────────────────
  // rowid is string-interpolated rather than parameterized because vec0 virtual
  // tables do not support parameterized rowid values with better-sqlite3.
  // This is safe: rowids are SQLite-assigned integers sourced directly from the
  // theology table — they are never user-supplied input and carry no injection risk.
  const insertBatch = db.transaction((rows, embeddings) => {
    for (let i = 0; i < rows.length; i++) {
      const vecJson = JSON.stringify(embeddings[i]);
      db.prepare(
        `INSERT INTO theology_vec(rowid, embedding) VALUES (${rows[i].rowid}, ?)`
      ).run(vecJson);
    }
  });

  let processed = 0;
  const startTime = Date.now();

  for (let i = 0; i < pendingRows.length; i += BATCH_SIZE) {
    const batch = pendingRows.slice(i, i + BATCH_SIZE);
    const texts = batch.map(r => r.text || "");

    // Generate embeddings for the batch
    const output = await embedder(texts, {
      pooling: "mean",
      normalize: true,
    });

    // Extract embedding arrays from the tensor
    const embeddings = [];
    for (let j = 0; j < batch.length; j++) {
      embeddings.push(Array.from(output[j].data));
    }

    insertBatch(batch, embeddings);
    processed += batch.length;

    if (processed % PROGRESS_INTERVAL < BATCH_SIZE || i + BATCH_SIZE >= pendingRows.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (processed / elapsed).toFixed(0);
      const pct = ((processed / pendingRows.length) * 100).toFixed(1);
      console.log(
        `  ${processed}/${pendingRows.length} (${pct}%) — ${rate} chunks/sec — ${elapsed}s elapsed`
      );
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone. ${processed} embeddings generated in ${totalTime}s.`);
  console.log(`Verification: ${db.prepare("SELECT COUNT(*) as cnt FROM theology_vec").get().cnt} vectors in theology_vec.`);

  db.close();
}
