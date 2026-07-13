#!/usr/bin/env node
// SermonForge — Spine Integrity Gate
//
// Walks the codebase. Fails (exit 1) if anything bypasses the spine for
// sermon or series state. Wired into .husky/pre-commit and CI.
//
// What it enforces (cited to docs/CORE.md "The Framework"):
//
//   1. `db.run` / `db.prepare` / `db.exec` (driver calls on the main sermon
//      database) appear only in `electron/main.js` and
//      `electron/persistence.cjs` (the production persistence seam the
//      Session-2 extraction moved the mutation gate into — main.js delegates
//      to it). Anywhere else and the spine's mutation gate is bypassable.
//      → Undermines: Mutation Contract #1 (user typing wins; ai_apply
//        requires a referenced proposal); State Contract #1, #2.
//
//   2. Raw INSERT / UPDATE / DELETE SQL targeting `sermons`, `series`, or
//      `series_sections` tables appears only in those same two files.
//      → Undermines: same as 1.
//
//   3. `window.electronAPI.spine(...)` is called only from `src/core/spine.ts`.
//      → Undermines: applying mutations without going through the renderer-
//        side validation + ContractViolation path.
//
//   4. Imports of any sermon/series operation name from `src/db/database.js`
//      from any file outside `src/core/`. The spine is the only renderer-side
//      surface for that state. (database.js no longer exports those names —
//      this is a future-proof guard.)
//      → Undermines: State Contract #1 (atomic creation API).
//
// Failures print one finding per offending line, citing the violated clauses
// so the operator knows what to fix and why.
//
// Usage: `node scripts/spine-integrity.js`. Exit 0 = OK, 1 = violations found.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── File walking ─────────────────────────────────────────────────────────────

const SCAN_DIRS = ['src', 'electron'];
const SCAN_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.cjs', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'build', 'resources']);

function* walk(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return;
  const stack = [abs];
  while (stack.length) {
    const cur = stack.pop();
    const stat = fs.statSync(cur);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(cur)) {
        if (SKIP_DIRS.has(entry)) continue;
        stack.push(path.join(cur, entry));
      }
    } else if (stat.isFile() && SCAN_EXTS.has(path.extname(cur))) {
      yield cur;
    }
  }
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

// ── Allowlists ───────────────────────────────────────────────────────────────

const ALLOW_DB_WRAPPERS = new Set([
  'electron/main.js',          // lifecycle + IPC wiring (residual driver calls: WAL checkpoint, boot probes)
  'electron/persistence.cjs',  // the production persistence seam — validateAndCommit lives here (Session-2 extraction)
]);

const ALLOW_RAW_SERMON_SQL = new Set([
  'electron/main.js',
  'electron/persistence.cjs',
]);

const ALLOW_SPINE_BRIDGE = new Set([
  'src/core/spine.ts',
  'electron/preload.js', // exposes the bridge
]);

const ALLOW_DATABASE_JS_IMPORT = (p) => p.startsWith('src/core/') || p === 'src/App.jsx'; // App.jsx imports non-sermon helpers

// Sermon/series operation names that belong on the spine, not on database.js.
// If any of these are imported from `../db/database` or `./db/database`, the
// gate fails. (After Phase 1 cleanup these names are no longer exported by
// database.js — this list is a guard against future re-introduction.)
const SPINE_ONLY_NAMES = [
  'getAllSermons', 'getSermonById', 'getSermon',
  'createSermon', 'updateSermon', 'deleteSermon',
  'getRecentSermons', 'getInProgressSermons',
  'getAllSeries', 'getRecentSeries', 'getSeriesById', 'getSeries',
  'createSeries', 'updateSeries', 'deleteSeries',
  'getSermonsBySeries',
  'getSectionsBySeries', 'createSection', 'updateSection', 'deleteSection',
  'loadSampleSermon',
  'applyMutation', 'persistMutation',
];

// ── Detectors ────────────────────────────────────────────────────────────────

const findings = [];

function record(file, line, lineNo, kind, clauses) {
  findings.push({ file, line: line.trim(), lineNo, kind, clauses });
}

const RE_DB_WRAPPER = /\bdb\.(run|prepare|exec)\s*\(/;
const RE_RAW_SQL = /\b(INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM)\s+\b(sermons|series|series_sections)\b/i;
const RE_SPINE_BRIDGE = /electronAPI\??\.\s*spine\s*\(/;

function detect(file, source) {
  const r = rel(file);
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // 1. db.run / db.prepare / db.exec outside electron/main.js
    if (RE_DB_WRAPPER.test(line) && !ALLOW_DB_WRAPPERS.has(r)) {
      record(r, line, lineNo, 'db_wrapper',
        ['Mutation Contract #1', 'State Contract #1, #2']);
    }

    // 2. Raw sermon/series SQL
    if (RE_RAW_SQL.test(line) && !ALLOW_RAW_SERMON_SQL.has(r)) {
      record(r, line, lineNo, 'raw_sermon_sql',
        ['Mutation Contract #1', 'State Contract #1']);
    }

    // 3. window.electronAPI.spine(...) bridge call
    if (RE_SPINE_BRIDGE.test(line) && !ALLOW_SPINE_BRIDGE.has(r)) {
      record(r, line, lineNo, 'spine_bridge_bypass',
        ['Mutation Contract #1', 'Mutation Contract #2', 'State Contract #1']);
    }
  }

  // 4. Imports of spine-only names from database.js (full-file scan: imports
  //    can span multiple lines). Accept both `../db/database` and the
  //    explicit-suffix `../db/database.js` form.
  const importBlocks = source.matchAll(
    /import\s*(?:[\w*]+\s*,?\s*)?\{([^}]+)\}\s*from\s*["']\.\.?\/(?:[\w./]*\/)?db\/database(?:\.js)?["']/g,
  );
  for (const m of importBlocks) {
    const names = m[1].split(',').map((s) => s.split(/\s+as\s+/)[0].trim()).filter(Boolean);
    for (const n of names) {
      if (SPINE_ONLY_NAMES.includes(n) && !ALLOW_DATABASE_JS_IMPORT(r)) {
        // Find the line number of the first occurrence.
        const lineNo = source.slice(0, m.index).split(/\r?\n/).length;
        record(r, m[0].split(/\r?\n/)[0], lineNo, `database_js_import:${n}`,
          ['State Contract #1 (atomic creation API)']);
      }
    }
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────

let scanned = 0;
for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    scanned++;
    let source;
    try { source = fs.readFileSync(file, 'utf8'); }
    catch (e) { continue; }
    detect(file, source);
  }
}

if (findings.length === 0) {
  console.log(`[spine-integrity] OK — scanned ${scanned} files, no violations.`);
  process.exit(0);
}

console.error('Spine Integrity FAILURE');
console.error('━'.repeat(60));
for (const f of findings) {
  console.error(`  ${f.file}:${f.lineNo}`);
  console.error(`    ${describe(f.kind)}`);
  console.error(`    Source: ${f.line.slice(0, 120)}`);
  console.error(`    Undermines: ${f.clauses.join('; ')}.`);
  console.error('');
}
console.error(`${findings.length} violation(s). Spine integrity invalid. Fix before committing.`);
process.exit(1);

function describe(kind) {
  if (kind === 'db_wrapper') return 'Direct database call (db.run / db.prepare / db.exec) outside electron/main.js. Mutations must route through validateAndCommit.';
  if (kind === 'raw_sermon_sql') return 'Raw SQL on sermons / series / series_sections outside electron/main.js. The spine is the only mutation gate.';
  if (kind === 'spine_bridge_bypass') return 'Direct call to window.electronAPI.spine(...) outside src/core/spine.ts. The spine wraps the bridge and unwraps IpcResult — no caller should bypass it.';
  if (kind.startsWith('database_js_import:')) {
    const name = kind.slice('database_js_import:'.length);
    return `Import of '${name}' from src/db/database.js. This is sermon/series state — import from src/core/spine instead.`;
  }
  return kind;
}
