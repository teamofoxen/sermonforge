// scripts/recover-db.cjs — one-shot recovery for SermonForge databases that
// were silently orphaned by past userData path moves.
//
// Picks the candidate with the MOST sermon+series rows, breaking ties by
// mtime. Earlier versions used mtime-only and picked stale dev/test DBs over
// real-content DBs — the row-count signal is the right primary key.
//
// Run with: node scripts/recover-db.cjs
//
// Reports a "BEFORE" inventory, takes a defensive backup of any existing
// active-path DB (renamed to .precovery-{ts}.db), then copies the chosen
// legacy DB forward. Never deletes or moves a legacy file — only copies.

"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");

const userData = path.join(os.homedir(), "AppData", "Roaming", "sermonforge");
const activePath = path.join(userData, "data", "sermonforge.db");
const legacyPaths = [
  path.join(userData, "sermonforge.db"),
  path.join("C:", "SermonForge", "data", "sermonforge.db"),
  path.join(userData, "data-dev", "sermonforge.db"),
];

async function main() {
  const BetterSqlite3 = require("better-sqlite3");

  function inspect(p) {
    if (!fs.existsSync(p)) return { path: p, exists: false };
    const stat = fs.statSync(p);
    let summary = { path: p, exists: true, size: stat.size, mtime: stat.mtime, sermons: 0, series: 0, error: null };
    try {
      // readonly: an inspection pass must never create WAL sidecars or touch
      // the candidate file in any way.
      const db = new BetterSqlite3(p, { readonly: true, fileMustExist: true });
      try {
        summary.sermons = Number(db.prepare("SELECT COUNT(*) FROM sermons").pluck().get() ?? 0);
      } catch { summary.sermons = 0; }
      try {
        summary.series = Number(db.prepare("SELECT COUNT(*) FROM series").pluck().get() ?? 0);
      } catch { summary.series = 0; }
      db.close();
    } catch (e) {
      summary.error = e.message;
    }
    return summary;
  }

  console.log("=== BEFORE inventory ===");
  const allPaths = [activePath, ...legacyPaths];
  const inventories = allPaths.map(inspect);
  for (const inv of inventories) {
    if (!inv.exists) {
      console.log(`  [missing] ${inv.path}`);
      continue;
    }
    if (inv.error) {
      console.log(`  [error  ] ${inv.path} — ${inv.error}`);
      continue;
    }
    console.log(`  [${String(inv.size).padStart(8)} B] ${inv.path}`);
    console.log(`              mtime: ${inv.mtime.toISOString()}, sermons: ${inv.sermons}, series: ${inv.series}`);
  }

  // Pick the winner: most rows wins, with mtime as the tiebreaker. Active
  // path excluded — we're trying to replace it. Candidates with 0+0 rows
  // are excluded (empty schema files).
  const rowCount = (i) => Number(i.sermons || 0) + Number(i.series || 0);
  const candidates = inventories
    .filter(i => i.path !== activePath)
    .filter(i => i.exists && !i.error)
    .filter(i => rowCount(i) > 0)
    .sort((a, b) => rowCount(b) - rowCount(a) || b.mtime - a.mtime);

  if (candidates.length === 0) {
    console.log("\nNo recoverable legacy DB found. Active path will be left as-is.");
    return;
  }
  const winner = candidates[0];
  console.log(`\n=== CHOSEN WINNER: ${winner.path} (${winner.sermons} sermons, ${winner.series} series, mtime ${winner.mtime.toISOString()}) ===`);

  // Defensive backup of whatever the active path currently holds — this
  // includes data from prior runs of this script if any.
  if (fs.existsSync(activePath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${activePath}.precovery-${stamp}`;
    fs.copyFileSync(activePath, backupPath);
    console.log(`Backed up current active DB to ${backupPath}`);
    fs.unlinkSync(activePath);
  }
  const activeBak = activePath + ".bak";
  if (fs.existsSync(activeBak)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupBak = `${activeBak}.precovery-${stamp}`;
    fs.copyFileSync(activeBak, backupBak);
    console.log(`Backed up current active .bak to ${backupBak}`);
    fs.unlinkSync(activeBak);
  }

  fs.copyFileSync(winner.path, activePath);
  console.log(`Copied ${winner.path} → ${activePath}`);
  console.log(`Legacy file preserved at ${winner.path}`);

  console.log("\n=== AFTER inventory ===");
  const after = inspect(activePath);
  if (after.exists) {
    console.log(`  Active path now: ${after.size} B, ${after.sermons} sermons, ${after.series} series`);
  } else {
    console.log("  Active path still missing — recovery failed?");
  }
}

main().catch(err => {
  console.error("Recovery failed:", err);
  process.exit(1);
});
