# SermonForge doc/code drift report — 2026-07-01

**Method:** ultracode fan-out (146 agents, ~6.1M tokens). One finder per binding/live doc plus three
cross-cutting finders (link integrity, known-item checklist, historical-banner check) extracted every
checkable claim and verified it against the code at HEAD. Every candidate then went to an independent
adversarial verifier instructed to REFUTE it (historicized/past-tense lines and misreads were killed).
Only confirmed drift is below. **Read-only run — no doc or code was edited.**

**Numbers:** 152 unique candidate claims → 113 confirmed by adversarial verification → **98 unique
findings** after removing 15 near-duplicates (same drift reported by two finders). 2 candidates
refuted, 2 seeded targets found already fixed (see "Adjudicated clean" below).

**Severity:** 16 misleads-binding · 28 misleads-spec · 36 misleads-reference · 18 cosmetic

## Executive summary

The code is healthy; the paper is behind. Almost everything found is a current working guide describing
a PREVIOUS version of the app in the present tense. The five things most worth caring about:

1. **CORE.md misdescribes the legacy-DB resolver** (G1, finding 1). CORE says it picks the *most recent*
   candidate database; the code deliberately picks the *most content rows* — because "most recent" is
   exactly the bug that caused the 2026-05-02 near-data-loss. CORE outranks code in this project, so a
   future session "fixing code to match CORE" would reintroduce a data-loss regression. This is the
   single highest-risk line in the sweep.
2. **RULES.md still specs the pre-dark-look visual design** (G1, findings 4–5): "Topbar: white background,
   soft shadow." The topbar has been an always-dark bar for weeks. With a visual reskin currently under
   consideration, a designer or agent reading RULES as law would build the wrong baseline.
3. **The BTI/privacy documents would mislead the beta cohort** (G7): the tester letter promises a tour
   that was deleted, names a retired tab (Blueprint), and privacy.md both over-claims (crash-log
   attachment behavior) and misdescribes what telemetry captures. These are outward-facing promises —
   truth them up before anyone installs.
4. **ENFORCEMENT_STATUS.md — the audit dashboard — cites deleted tests and wrong counts** (G6), which
   quietly poisons every future audit that starts from it.
5. **The long-deferred infra-doc pass is now fully enumerated** (G2): every present-tense sql.js/saveDb/
   flush-pipeline remnant, with line numbers and the correct better-sqlite3 facts, ready to purge in one
   sitting.

## Adjudicated clean (do not re-flag)

- **package.json says 1.0.0 while v1.1.0 shipped** — REFUTED, by design: the release skill's hard rule is
  that CI stamps the version from the git tag (.github/workflows/build.yml); the sidebar footer reads the
  version dynamically via app-get-version. Nothing to fix.
- **docs/REFERENCE/schema.md PC columns "retained defensively"** — already fixed on disk; current wording
  is accurate (the board's worklist entry pointing at it is what's stale — see finding 81).
- **docs/SYSTEMS/database.md:54 v14-vs-current** — already fixed on disk.
- **Historical-banner integrity** — all 9 frozen initiative docs still carry their HISTORICAL RECORD
  banners; none is masquerading as a working guide.
- **MEMORY.md OEM index line** — stale (said "renders No field found"; the three OEM field-def modules are
  registered in src/utils/walkOrder.js at HEAD). Fixed directly in the memory index this session; not a
  repo finding.

## Findings by fix group

Numbering below is stable (F1–F113 in discovery order; 15 numbers are absent because they were
near-duplicates of a kept finding). Each fix group is scoped to be one self-contained session.

---

## G1 — Law layer — CORE.md, RULES.md, CLAUDE.md

These are the binding docs: when they and the code disagree, the project treats the CODE as wrong. Two of these findings could cause real damage if a future session "aligned code to doc" (the legacy-DB resolver rule and the visual-design spec).

### F1 · `docs/CORE.md:363-366` · MISLEADS-BINDING

- **Doc says:** "The DB resolver in `electron/main.js` (`migrateLegacyDb`) walks `legacyDbPaths` whenever the active path is empty, finds the most recent candidate with real content, and copies it forward."
- **Code truth (verified at HEAD):** The DB resolver `migrateLegacyDb` is defined in electron/dbMigration.js and invoked from electron/main.js during initDatabase when the active path is empty. It walks `legacyDbPaths`, pre-filters candidates under 32KB (LEGACY_DB_MIN_BYTES), loads each survivor and counts content rows (sermons + series), skips 0-row schema-only DBs, and picks the candidate with the MOST content rows — mtime breaks ties only among equal-row candidates (dbMigration.js:96). It copies (not moves) the winner to the active path, preserving the legacy file as backup, and closes every candidate handle before returning so the caller reopens at the active path. Row-count-over-recency is deliberate: the 2026-05-02 incident (1-sermon dev DB with newer mtime beating a 10-sermon real library) is the regression this rule prevents.
- **Evidence:** electron/dbMigration.js:1-21,52,94-96; electron/main.js:81,370-379

### F2 · `docs/CORE.md:28-34` · MISLEADS-BINDING

- **Doc says:** The Series Planner is described as shipping "with a Calendar that assigns sermons to Sundays and a congregational study-guide export"
- **Code truth (verified at HEAD):** The Series Planner at HEAD is three screens: Outline, Schedule, and Study guide (PLANNER_TABS, src/components/SeriesPlanner.jsx:41-45). The Schedule screen is the surface that assigns sermons to Sundays (SeriesPlanner.jsx:1241-1242); the congregational study-guide export exists (exportStudyGuide, SeriesPlanner.jsx:10). "Calendar" is the canonical name of a separate top-level app view (VIEW.Calendar in src/core/contracts.ts:203, sidebar label "Calendar" in src/components/Sidebar.jsx:37-38), not part of the planner. CORE.md's sentence should name the planner surface "Schedule" (e.g., "with a Schedule screen that assigns sermons to Sundays and a congregational study-guide export").
- **Evidence:** src/components/SeriesPlanner.jsx:41-45,1242; src/core/contracts.ts:200-209

### F4 · `docs/RULES.md:105` · MISLEADS-BINDING

- **Doc says:** Topbar: white background, soft shadow
- **Code truth (verified at HEAD):** Topbar: always-dark bar — background #1a1410 (var(--ink); #120f0d in dark theme), border-bottom 1px solid #000, gold-gradient 1px bottom seam via .topbar::after, light parchment-tinted foreground via --topbar-fg tokens. No white background and no shadow. Source: src/styles/global.css:288-331.
- **Evidence:** src/styles/global.css:288-324 (background #1a1410 at line 293; 'always-dark bar' comment at line 304; gold seam at 310-324)

### F5 · `docs/RULES.md:103` · MISLEADS-BINDING

- **Doc says:** Sidebar: 260px, `var(--ink)` background, gold gradient right border
- **Code truth (verified at HEAD):** Sidebar: 260px, background var(--sidebar-bg) (defined in src/styles/global.css — #1a1410 light at line 32, #120f0d dark at line 72; applied at line 106), gold gradient right border via .sidebar::after. var(--ink) is a foreground/text token that becomes light (#d8cfc5) in dark mode and must not be used as the sidebar background.
- **Evidence:** src/styles/global.css:103-156 (background: var(--sidebar-bg) at 106; --sidebar-bg at 32 and 72; dark --ink #d8cfc5 at 44)

### F6 · `docs/RULES.md:28` · MISLEADS-BINDING

- **Doc says:** This is a Windows app on OneDrive — always use `path.join()`, never hardcode path separators.
- **Code truth (verified at HEAD):** SermonForge ships cross-platform at HEAD: package.json's electron-builder config has both a "win" nsis target (lines 89-101) and a "mac" section with a notarized universal dmg target (lines 110-130), and the main process handles darwin explicitly (electron/main.js:3950, electron/menu.js:49). The app also no longer runs "on OneDrive": databases live under C:\SermonForge\data\ and OneDrive is used only for optional exports when present (docs/SYSTEMS/database.md:160-166). The path.join()/no-hardcoded-separators rule remains valid — strengthened, in fact, by cross-platform support — but its stated premise should be "cross-platform Windows + macOS app", not "Windows app on OneDrive".
- **Evidence:** package.json:110-130 ("mac" build section and "dmg" target)

### F97 · `CLAUDE.md:22` · MISLEADS-BINDING

- **Doc says:** adding columns to `sermons` requires updating `SERMON_COLUMNS` in `electron/main.js`
- **Code truth (verified at HEAD):** Adding renderer-writable columns to `sermons` requires updating the SERMON_COLUMNS allowlist in its mirrored definitions — src/core/contracts.ts:319 (single source of truth), electron/contracts.cjs:93 (main-process mirror), and tests/contracts/_helpers/test-spine.ts:57 (test mirror; sync asserted by tests/contracts/contracts-allowlist-sync.test.ts) — not in electron/main.js, which merely imports SERMON_COLUMNS from ./contracts.cjs (main.js:15-18). buildUpdate() in electron/main.js:1685 validates against the imported allowlist and throws in dev / warns in prod.
- **Evidence:** electron/main.js:15 (import), electron/main.js:1680-1693 (comment + buildUpdate), electron/contracts.cjs:93 (definition), src/core/contracts.ts:319 (source of truth)

### F110 · `docs/CORE.md:112-115` · MISLEADS-BINDING

- **Doc says:** Canonical Vocabulary, Throughline entry: "…strong enough to support the Main Preaching Thought (MPT) and Main Preaching Statement (MPS)"
- **Code truth (verified at HEAD):** MPT = Main Point of the Text; MPS = Main Point of the Sermon. That is the sole expansion at HEAD across all code (sadiAnchorFields.js, sermonState.js, utils.js, ReferencePane.jsx, studyFields.js, studyAdvancement.js) and the rest of CORE.md ("Main Point Pair (MPT + MPS)", lines 107/166-167). "Main Preaching Thought/Statement" appears nowhere in src/. CORE.md:115 should read "...strong enough to support the Main Point of the Text (MPT) and Main Point of the Sermon (MPS)."
- **Evidence:** src/utils/sadiAnchorFields.js:40,58; src/utils/sermonState.js:335-336; docs/PROPOSALS/refoundation-initiative.md:172

### F98 · `CLAUDE.md:25` · MISLEADS-REFERENCE

- **Doc says:** `src/styles/global.css` (lines 2407–2880) as the dashboard-styles pointer for the dashboard redesign / designer handoff row
- **Code truth (verified at HEAD):** Dashboard styles in src/styles/global.css at HEAD: main block lines 1819–2514 (section banner 1819–1821; Illuminated header band 1828; Body grid container 2087; 2×2 dashboard grid 2098; Shared row pill 2325; This Day in Church History 2435–2514), plus responsive dashboard rules 3039–3043 and dark-mode dashboard overrides 3045–3074 (end of file; 3074 lines total). Lines 2516–3038 between those blocks are non-dashboard (Disk-write error banner 2516, Synthesis table SPRD A2.3 at 2563, Peripheral reference panel SPRD A2.4 at 2800, Field overview screen SPRD A2.5 at 2858). CLAUDE.md:25 should cite approximately 'lines 1819–2514 (+ dark-mode overrides 3045–3074)' instead of 'lines 2407–2880'.
- **Evidence:** src/styles/global.css:1819-1821, 2098, 2435, 2563, 2800, 2858, 3045 (section divider comments)

### F3 · `docs/CORE.md:6-7` · COSMETIC

- **Doc says:** "`CLAUDE_original.md` is the original monolithic version — retained for historical reference only; do not use it as a working guide."
- **Code truth (verified at HEAD):** CLAUDE_original.md does not exist anywhere in the repo at HEAD — not at the root, not in docs/ARCHIVE/. It was deleted in commit 498e511 (2026-04-14). The CORE.md banner sentence should either be dropped or rephrased to past tense (e.g., "the original monolithic CLAUDE_original.md was retired and deleted in April 2026; see git history at 498e511 if the pre-split text is ever needed").
- **Evidence:** git log 498e511 (2026-04-14 deletion); git ls-files at HEAD (no match); docs/ARCHIVE/ listing


---

## G2 — Retired-tech purge — sql.js / saveDb / flush / AI-era artifacts + version stamps

The long-deferred "infra-doc pass" from the re-foundation board, now fully enumerated. Present-tense descriptions of the retired sql.js driver, its debounced saveDb()/flush pipeline, AI-era files, and stale schema-version stamps.

### F20 · `docs/SYSTEMS/ipc.md:78-81` · MISLEADS-SPEC · **KNOWN-DEFERRED**

- **Doc says:** "Validated writes hit sql.js; saveDb() schedules the debounced disk write." (and line 80: "No component may call sql.js or any DB function directly.")
- **Code truth (verified at HEAD):** Step 4 of the Spine Call Path at HEAD: validated writes execute against better-sqlite3 (file-backed, WAL mode); each write is a real journaled SQLite commit that is durable the moment the "spine" IPC handler (validateAndCommit in electron/main.js) returns. There is no saveDb() and no main-process debounced disk write. Line 80 should say no component may touch the database (better-sqlite3) or any DB function directly — sql.js no longer exists in the codebase except in past-tense code comments.
- **Evidence:** electron/main.js:43, 84-86, 530, 2727-2732; grep 'saveDb' in electron/ = 0 matches

### F27 · `docs/SYSTEMS/database.md:155` · MISLEADS-SPEC

- **Doc says:** "`ai-log.jsonl` (audit log) ... live at the userData root"
- **Code truth (verified at HEAD):** No AI audit log exists at HEAD; ai-log.jsonl is never created or read anywhere in the code (only mention in the repo is this doc line). Files actually at the userData root: sf-esv.enc (electron/keystore.js:17 — the only key ever saved; sf-anthropic.enc is also never written since keystore.js only exports loadEsvKey/saveKeys({esv})), ui-prefs.json (electron/main.js:1524), and tester-id.txt (electron/telemetry/bus.js:275). Additionally, app.log does NOT live at the userData root — it lives at userData/logs/app.log (userData/logs-dev in dev) per electron/config.js:40 and electron/logger.js:19. Line 155 should drop ai-log.jsonl and sf-anthropic.enc entirely and correct app.log's location.
- **Evidence:** grep -r 'ai-log' across repo (excluding node_modules): only hit is docs/SYSTEMS/database.md:155; electron/ has no 'anthropic' or 'jsonl' references except telemetry NDJSON

### F28 · `docs/SYSTEMS/database.md:155-156` · MISLEADS-SPEC

- **Doc says:** "`sf-anthropic.enc` / `sf-esv.enc` (safeStorage keys) live at the userData root"
- **Code truth (verified at HEAD):** At HEAD the app maintains exactly one safeStorage key file: sf-esv.enc, written/read by electron/keystore.js via the sf-${name}.enc template (line 17) with "esv" as the only named key (loadEsvKey line 47; saveKeys({esv}) lines 50-52). sf-anthropic.enc is never written, read, or referenced anywhere in code — Anthropic key handling was removed with ARI. The doc line should list only sf-esv.enc among the userData-root files.
- **Evidence:** electron/keystore.js:16-52; grep -i 'anthropic' in electron/: no matches

### F39 · `docs/REFERENCE/schema.md:108-110` · MISLEADS-REFERENCE

- **Doc says:** `preaching_blocks` = "CMC (Contour-Mapped Compression) without-notes output"; `manuscript_delivery` = "AI-formatted delivery manuscript"; `last_tune_up` = "JSON {content, ts} snapshot of the most recent Final Tune-Up response" — described as if these AI features exist, with no dead/retired marker
- **Code truth (verified at HEAD):** All three columns are orphaned AI-era columns retained defensively after ARI removed all AI. preaching_blocks (v8), manuscript_delivery (v9), and last_tune_up (v12) exist in the DB and in the SERMON_COLUMNS allowlist, but the features that wrote them (CMC without-notes generation, AI delivery-manuscript formatting, Final Tune-Up) no longer exist; nothing at HEAD reads or writes them except the migration ALTERs, the allowlist, and the sample seed setting them to "". The doc rows should carry a dead/orphaned marker matching the delivery_notes / timing_notes convention, e.g. "Dead column — wrote by the retired AI CMC/Tune-Up features, removed in ARI; retained in the DB and allowlist defensively."
- **Evidence:** Grep for preaching_blocks|manuscript_delivery|last_tune_up across the repo: electron/main.js:794, :801, :824, :856-858 (migration ALTERs only), electron/contracts.cjs:106 + src/core/contracts.ts:334 (allowlist), src/core/spine.ts:113-115 (seed to "") — no UI or export reads/writes them; no AI code exists (ARI)

### F40 · `docs/REFERENCE/ipc-channels.md:66, 73, 103` · MISLEADS-REFERENCE · **KNOWN-DEFERRED**

- **Doc says:** db-createCalendarNote / db-deleteCalendarNote "Triggers saveDb()"; db-setSetting "Triggers a debounced saveDb()"
- **Code truth (verified at HEAD):** db-createCalendarNote (electron/main.js:2747) and db-deleteCalendarNote (main.js:2756) run their INSERT/DELETE via dbRun and return; db-setSetting (main.js:2764) upserts via setSetting and returns true. There is no saveDb() function and no main-process debounce — better-sqlite3 in WAL mode commits each write durably at the IPC handler (see main.js:530-534). The only surviving flush machinery is flushDb() (main.js:535), a WAL checkpoint behind the "db-flush" channel.
- **Evidence:** electron/main.js:2747-2767, electron/main.js:530-544

### F41 · `docs/REFERENCE/ipc-channels.md:87-89` · MISLEADS-REFERENCE · **KNOWN-DEFERRED**

- **Doc says:** db-flush is a "Manual flush of sermonforge.db to disk ... Atomic via <dbPath>.tmp + rename; rotates the prior good blob to <dbPath>.bak"
- **Code truth (verified at HEAD):** db-flush → flushDb() (electron/main.js:535-544) performs a WAL checkpoint only: db.pragma("wal_checkpoint(TRUNCATE)"), folding the WAL into the main sermonforge.db file. Returns { ok: true } on success, { ok: false, error } on checkpoint failure, { ok: true, skipped: true } when db/dbPath is not initialized (return shape as documented). It is wired to the db-write-error banner's Retry button via the "db-flush" IPC handler (main.js:3520). There is no .tmp write, no rename, and no .bak rotation — that was the retired sql.js serialize-and-rotate pipeline; .bak handling at HEAD exists only in boot-time corruption-recovery/backup code.
- **Evidence:** electron/main.js:535-544

### F42 · `docs/REFERENCE/ipc-channels.md:389-397` · MISLEADS-REFERENCE

- **Doc says:** "db-write-error" is "Emitted by flushDb only on the second consecutive failure" and "db-write-ok" is "Emitted by flushDb after a successful write that follows at least one failure"
- **Code truth (verified at HEAD):** At HEAD, neither "db-write-error" nor "db-write-ok" is emitted anywhere in the main process. flushDb (electron/main.js:535-544) survives only as a WAL checkpoint (wal_checkpoint(TRUNCATE)) that returns { ok: true } or { ok: false, error } to its caller — the "db-flush" IPC handler (main.js:3520) — with no consecutive-failure counter and no webContents.send. The renderer subscriptions (electron/preload.js:86-95 onDbWriteError/onDbWriteOk; src/App.jsx:232-238) are live but never receive events; the banner can only clear via the Retry button's flushDb return value, never appear via push. The stale comments at preload.js:84-85 and App.jsx:226-228 repeat the same retired behavior.
- **Evidence:** electron/main.js:535-544 (and a repo-wide grep for db-write-error: only subscribers exist — electron/preload.js:86-95, src/App.jsx:235-236)

### F43 · `docs/REFERENCE/ipc-channels.md:49` · MISLEADS-REFERENCE

- **Doc says:** apply-mutation payload is `{ sermonId, field, value, proposalId? }` with "Mutation #1 + #2 enforcement"
- **Code truth (verified at HEAD):** The apply-mutation spine op payload at HEAD is `{ kind: "user_input", sermonId, field, value }` — `kind` is required and must be "user_input" (MUTATION_KIND was collapsed to UserInput only in ARI Phase 9; any other/missing kind returns BAD_KIND). `value` is a string for simple fields or a typed StructuredFieldUpdate for structured fields (State #5 shape check in both src/core/spine.ts checkShape and the main.js handler). There is no `proposalId` — that token exists only in the AI-simulation test helper (tests/contracts/_helpers/test-spine.ts), not in electron/main.js. Renderer contract: UserInputMutation, src/core/spine.ts:344-351; handler: electron/main.js:2575-2613.
- **Evidence:** electron/main.js:2575-2613, src/core/spine.ts:344-375

### F55 · `docs/REFERENCE/project-structure.md:74` · MISLEADS-REFERENCE · **KNOWN-DEFERRED**

- **Doc says:** Tech-stack table row: "sql.js — SQLite compiled to WASM (sermonforge.db; not better-sqlite3 — see docs/SYSTEMS/database.md)"
- **Code truth (verified at HEAD):** Both sermonforge.db and theology.db run on better-sqlite3 (native SQLite, ^12.9.0 per package.json:20); sermonforge.db uses WAL mode with writes durable at the IPC handler. sql.js was retired 2026-06-10 (electron/config.js:25-26) and is absent from package.json. The Tech Stack table should drop the sql.js row and describe better-sqlite3 (+ sqlite-vec for theology.db only) as the driver for both databases, consistent with docs/SYSTEMS/database.md:10-29.
- **Evidence:** package.json:18-29; electron/config.js:25; electron/main.js:86; docs/SYSTEMS/database.md:10-21

### F57 · `docs/REFERENCE/project-structure.md:106` · MISLEADS-REFERENCE · **KNOWN-DEFERRED**

- **Doc says:** File-tree annotation: "database.md — sql.js, migrations, debounces, SERMON_COLUMNS"
- **Code truth (verified at HEAD):** docs/SYSTEMS/database.md at HEAD covers: better-sqlite3 runtime (WAL mode) for both sermonforge.db and theology.db, the boot/backup/corruption-recovery sequence, migrations (current schema version 32), the debounce policy (renderer-side 800ms field save only; the 500ms main-process saveDb() debounce is documented as retired with sql.js), and SERMON_COLUMNS/SERIES_COLUMNS schema-contract rules. A corrected annotation for line 106 would be: "database.md — better-sqlite3 (WAL), boot/backup, migrations (v32), save-debounce policy, SERMON_COLUMNS".
- **Evidence:** docs/SYSTEMS/database.md:8-26; electron/main.js:86

### F74 · `docs/REFERENCE/release-smoke.md:52-53` · MISLEADS-REFERENCE · **KNOWN-DEFERRED**

- **Doc says:** Migration check: "schema version reads 24 (or current)"
- **Code truth (verified at HEAD):** Latest schema version at HEAD is 32 — electron/main.js migrations end with `version = 32;` at line 1370 (preceded by 30 at 1333 and 31 at 1353). The smoke item should read "schema version reads 32 (or current)".
- **Evidence:** electron/main.js:1370 (`version = 32`; also 1333 `version = 30`, 1353 `version = 31` as the preceding steps)

### F81 · `docs/PROPOSALS/refoundation-initiative.md:222` · COSMETIC · **KNOWN-DEFERRED**

- **Doc says:** Worklist B: "a schema-version disagreement at `SYSTEMS/database.md:54` (says v14; code + `schema.md` say v24)"
- **Code truth (verified at HEAD):** At HEAD there is no schema-version disagreement: docs/SYSTEMS/database.md:52-55 reads "Current schema version: **32**", docs/REFERENCE/schema.md:3 reads "Current schema version: **32**", and electron/main.js runs migrations up to `version = 32` (line 1370). The worklist clause should be struck or marked DONE like the adjacent sermon-workspace.md clause; the v24 parenthetical is two versions stale.
- **Evidence:** electron/main.js:1370; docs/SYSTEMS/database.md ~line 53; docs/REFERENCE/schema.md:3


---

## G3 — IPC reference refresh — ipc-channels.md + ipc.md

The channel reference misstates return shapes, payloads, and the channel list itself. Anyone wiring renderer code against this doc gets wrong contracts.

### F21 · `docs/SYSTEMS/ipc.md:27-28` · MISLEADS-SPEC

- **Doc says:** "ESV passage fetching is the only outbound network call from the app."
- **Code truth (verified at HEAD):** At HEAD the app has three outbound network destinations, not one: (1) api.esv.org — passage fetching via the "passage-fetch" handler (electron/main.js:3794) and the ESV key-verification fetch in "app-save-api-key" (electron/main.js:3613); (2) the BTI Cloudflare Worker (default https://sermonforge-bti.ross-appleton.workers.dev/ingest, electron/telemetry/config.js:19-21) — telemetry batch flushes and immediate flag/form POSTs from electron/telemetry/bus.js:153,218, consent-gated (telemetryBus.setEnabled, first-run defaults off until SetupScreen consent, main.js:3870-3872); (3) GitHub Releases via electron-updater — automatic check + silent download 3 s after launch in packaged builds and a manual Help-menu check (electron/updater.js:63,98,131-135; wired at main.js:3877). All outbound calls originate in the main process; the renderer still makes no network calls of its own.
- **Evidence:** electron/telemetry/bus.js:153,218; electron/telemetry/config.js:19-21; electron/updater.js:63,98; electron/main.js:3613

### F22 · `docs/SYSTEMS/ipc.md:59` · MISLEADS-SPEC

- **Doc says:** Channel table lists `"feedback-submit"` as a current channel with purpose "Local markdown feedback file writing"
- **Code truth (verified at HEAD):** The "feedback-submit" IPC channel does not exist at HEAD; the only feedback transport channel is "bti-feedback-submit" (handled at electron/main.js:1671, exposed via preload.js:121 btiSubmit), which routes FeedbackForm/FeedbackFlag payloads through the Cloudflare Worker and is already listed on ipc.md line 61. Line 59's row should be deleted (or moved to a clearly historical note).
- **Evidence:** electron/main.js:1671, 3664-3671; electron/preload.js:121; grep 'feedback-submit' in *.js — only the bti- variant is handled

### F44 · `docs/REFERENCE/ipc-channels.md:48` · MISLEADS-REFERENCE

- **Doc says:** transition-state: "legacy `to: \"Blueprint\" | \"Frame\"` coerced to `Assembly` server-side"
- **Code truth (verified at HEAD):** The legacy Blueprint/Frame → Assembly stage coercion was removed in the trail deletion sweep (Phase B3). At HEAD, transition-state is a plain position writer: for kind:"stage" it writes `to` exactly as given (electron/main.js:2507-2532; removal comment at 2505), pre-restructure "Blueprint"/"Frame" values are no longer admitted or coerced anywhere in main.js (coerceLegacyStage deleted, see comment at electron/main.js:21-24; read-side coercion also removed from shapeSermon at 1991-1993), and no production data carries those values. Line 48 should drop (or past-tense/mark as later-removed) the "coerced to Assembly server-side" clause.
- **Evidence:** electron/main.js:2499-2532 (comment at 2505)

### F45 · `docs/REFERENCE/ipc-channels.md:19-32` · MISLEADS-REFERENCE

- **Doc says:** The spine read-ops table lists 10 ops (get-sermon ... get-all-tags) as the read set
- **Code truth (verified at HEAD):** SPINE_READ_OPS at electron/main.js:2699-2711 contains 11 read ops. The doc table is missing one row: `get-series-sermon-counts` | payload: — | returns: `{ [seriesId]: count }` map of undeleted sermons grouped by series_id (one grouped read for the Planning list's per-series counts, replacing an N+1 fan-out of get-sermons-by-series). Handler at electron/main.js:2134-2146.
- **Evidence:** electron/main.js:2699-2711, electron/main.js:2134-2146

### F46 · `docs/REFERENCE/ipc-channels.md:10` · MISLEADS-REFERENCE

- **Doc says:** "Settings, calendar notes, memory, and schema queries remain as named channels" — and the doc documents no search channel anywhere
- **Code truth (verified at HEAD):** At HEAD the named (non-spine) DB channels are: settings (db-getSetting, db-setSetting), calendar notes (db-getCalendarNotes, db-createCalendarNote, db-deleteCalendarNote), schema (db-getSchemaVersion), and sermon full-text search (db-searchSermons — electron/main.js:2716, FTS5 v22, preload alias searchSermons at electron/preload.js:25, returns up to `limit` hits, default 50). There is no memory-named IPC channel anywhere in electron/. Line 10 should drop "memory" and add search, and the reference should document db-searchSermons as its own channel entry.
- **Evidence:** electron/main.js:2713-2725, electron/preload.js:25 (and the full ipcMain.handle grep of electron/ showing no memory channel)

### F47 · `docs/REFERENCE/ipc-channels.md:352-381` · MISLEADS-REFERENCE

- **Doc says:** The App / BTI sections enumerate the app-level channels, omitting renderer crash reporting entirely
- **Code truth (verified at HEAD):** The doc should document "report-renderer-error" (fits naturally next to the BTI Telemetry section, since it feeds the `crash` telemetry event): receives { label: string, detail: string }, returns { ok: true }. Handled at electron/main.js:1660-1666 — logs "[renderer] {label}" to app.log (detail capped at 2000 chars) and, when telemetry is enabled, emits the `crash` event (error string capped at 500 chars); never throws. Exposed via preload.js:71 as electronAPI.reportRendererError(label, detail); called fire-and-forget by the global window error hooks in src/main.jsx and the React ErrorBoundary in src/App.jsx.
- **Evidence:** electron/main.js:1657-1666, electron/preload.js:67-71

### F48 · `docs/REFERENCE/ipc-channels.md:365-371` · MISLEADS-REFERENCE

- **Doc says:** telemetry-set-enabled "Persists to the `bti_telemetry_enabled` setting and short-circuits the bus + transport when off"
- **Code truth (verified at HEAD):** telemetry-set-enabled persists nothing. It flips the main-process bus's in-memory enabled flag (telemetryBus.setEnabled, bus.js:79-81), which short-circuits emit() and flush() when off, and emits the deferred first-run app-open event when turned on (electron/main.js:1649-1655). Durable persistence of the bti_telemetry_enabled setting is a separate renderer responsibility: SetupScreen.jsx:50 writes it via setSetting() over the db-setSetting channel before invoking telemetrySetEnabled. Callers toggling telemetry must do both, or the preference is lost on restart.
- **Evidence:** electron/main.js:1649-1655, electron/telemetry/bus.js:79-81, src/components/SetupScreen.jsx:48-54

### F49 · `docs/REFERENCE/ipc-channels.md:50` · MISLEADS-REFERENCE

- **Doc says:** load-sample-sermon "receives: —" and "Seeds or refreshes the sample-sermon record (delete-then-insert ...)"
- **Code truth (verified at HEAD):** `load-sample-sermon` receives an optional payload `{ fresh?: true }`. Default (no payload / fresh falsy): if the sample sermon already exists it is returned as-is — `{ sermonId, created: false }` — preserving the pastor's sandbox edits; seeding happens only when no sample exists. With `{ fresh: true }` (the Dashboard's "Start the sample fresh" action): deletes all 'sample-%' sermons/series rows and reseeds via full INSERT (delete-then-insert), which is also how seed schema/content changes get picked up. Consumed by Dashboard via src/core/spine.ts loadSampleSermon(opts?: { fresh?: boolean }).
- **Evidence:** electron/main.js:2616-2629

### F50 · `docs/REFERENCE/ipc-channels.md:340-344` · MISLEADS-REFERENCE

- **Doc says:** app-get-sermon-columns `returns: string[]`
- **Code truth (verified at HEAD):** "app-get-sermon-columns" returns Promise<{ columns: string[] }> — the main-process SERMON_COLUMNS allowlist wrapped in a `columns` key (electron/main.js:3531-3533). The renderer reads `res.columns` (src/App.jsx:128-134) and compares it against the renderer mirror, which is canonically src/core/contracts.ts:319 re-exported through the src/constants/sermonColumns.js shim.
- **Evidence:** electron/main.js:3526-3533, src/App.jsx:119-137, src/core/contracts.ts:319

### F23 · `docs/SYSTEMS/ipc.md:45-47` · COSMETIC

- **Doc says:** "The ESV API key never crosses the IPC boundary in plaintext."
- **Code truth (verified at HEAD):** The ESV key crosses the IPC boundary in plaintext exactly once, in the save direction: the renderer sends it via "app-save-api-key" (preload.js:36) when the pastor enters it in SetupScreen/EsvKeyModal; main.js verifies it against the ESV API and encrypts it with safeStorage (electron/keystore.js). After that it never leaves the main process — the renderer receives only boolean status, and passage-fetch reads the key in-process. Correct doc wording: "The ESV API key is sent once over IPC during setup; it is stored via Electron safeStorage (electron/keystore.js), is never returned to the renderer, and is read in-process when passage-fetch is invoked."
- **Evidence:** electron/preload.js:36; src/components/SetupScreen.jsx:61; src/components/EsvKeyModal.jsx:34; electron/main.js:3604-3633; electron/keystore.js:21-24

### F51 · `docs/REFERENCE/ipc-channels.md:135-139` · COSMETIC

- **Doc says:** theology-status `returns: { available: bool }`
- **Code truth (verified at HEAD):** theology-status (electron/main.js:2769-2772) returns { available: bool, semantic: bool } — available = theologyDb !== null after ensureTheologyDbLoaded(), semantic = theologyVecAvailable (whether sqlite-vec vector search is usable). The doc's own Note at ipc-channels.md:173-176 already states this correctly; only the signature block at line 138 is stale.
- **Evidence:** electron/main.js:2769-2772

### F52 · `docs/REFERENCE/ipc-channels.md:373-377` · COSMETIC

- **Doc says:** bti-feedback-submit returns `{ ok: true } | { ok: false, error: string }`
- **Code truth (verified at HEAD):** "bti-feedback-submit" returns `{ ok: true }` on success. On failure it returns `{ ok: false, reason: "disabled" | "bad-kind" | "no-transport" | "threw" }`, or a bare `{ ok: false }` (no reason/error field) when the network POST fails and the item is persisted to the immediate queue for retry on the next periodic flush. There is no `error` field in any return shape. (electron/main.js:1671-1678; electron/telemetry/bus.js:198-212)
- **Evidence:** electron/main.js:1671-1678, electron/telemetry/bus.js:198-212

### F53 · `docs/REFERENCE/ipc-channels.md:314-317` · COSMETIC

- **Doc says:** app-get-startup-warning `returns: null | { kind: "onedrive" | "onedrive-first-run", path: string }`
- **Code truth (verified at HEAD):** app-get-startup-warning returns: null | { kind: "onedrive" | "onedrive-first-run", path: string } | { kind: "db_corrupt_quarantined" | "db_recovered_backup" | "db_migrated", message: string, path?: string } — recovery kinds carry a user-facing message (path only sometimes present, on db_corrupt_quarantined when a quarantine file exists); OneDrive kinds carry path and no message.
- **Evidence:** electron/main.js:273-288, electron/main.js:1621-1634, electron/main.js:3548-3556

### F54 · `docs/REFERENCE/ipc-channels.md:206-216` · COSMETIC

- **Doc says:** sermon-export-manuscript returns `{ success: true, filepath: string }` and "opens it via shell.openPath"
- **Code truth (verified at HEAD):** docs/REFERENCE/ipc-channels.md lines 212-216 should read: returns `{ success: true, filepath: string, opened: bool } | { success: false, error: string }`. After writing the .docx, the handler attempts shell.openPath(filepath); if openPath returns a non-empty error string (nothing handles .docx), it sets opened:false, logs the failure, and falls back to shell.showItemInFolder(filepath) so the renderer can show the file location (electron/main.js:3486-3499).
- **Evidence:** electron/main.js:3486-3499


---

## G4 — Structure & data references — project-structure.md, database.md, schema.md

File trees, storage paths, and schema rows that no longer match disk. The OneDrive export-path claims and the stale file trees are the bulk.

### F24 · `docs/SYSTEMS/database.md:186-187` · MISLEADS-SPEC

- **Doc says:** "**Sermon slots** are real `sermons` records with `stage='planning'`."
- **Code truth (verified at HEAD):** Sermon slots are real `sermons` records with `stage='in_progress'` (SERMON_STATUS.InProgress in electron/contracts.cjs; the old 'planning' stage was collapsed by migration v16). There is no separate planning-slots table — that part of the note remains true.
- **Evidence:** electron/main.js:889-906, electron/contracts.cjs:64-67, electron/main.js:2272-2290

### F25 · `docs/SYSTEMS/database.md:159-164` · MISLEADS-SPEC

- **Doc says:** "Exports are written to Documents\SermonForge\exports\ and (Study Guides, Feedback) to ~/OneDrive/SermonForge/... when OneDrive is present" plus "OneDrive is used only for the user's own backup choices for exported files."
- **Code truth (verified at HEAD):** All file exports are written under Documents\SermonForge\exports\: study guides to the StudyGuides subfolder (electron/main.js:3311) and manuscripts to the Manuscripts subfolder (electron/main.js:3477). Feedback is not a file export — it is a network POST via the bti-feedback-submit IPC handler (electron/main.js:1671-1678) through telemetryBus.sendImmediate to the Cloudflare Worker /ingest endpoint (electron/telemetry/bus.js:198-218). No code path writes to OneDrive; OneDrive appears only as a legacy DB-migration source location (electron/config.js:60-71, removed in commit 5c54664) and as an active startup warning when the user's data folder sits inside a OneDrive root (maybeWarnOneDrive, electron/main.js:1621-1631; src/components/OneDriveWarning.jsx).
- **Evidence:** electron/main.js:3311, electron/main.js:3477, electron/main.js:1671-1678, electron/config.js:60-65

### F26 · `docs/SYSTEMS/database.md:155-157` · MISLEADS-SPEC

- **Doc says:** "`app.log` (crash log) ... live at the **userData root**, not under `data/`, so they persist across the dev/prod data-folder split."
- **Code truth (verified at HEAD):** At HEAD: app.log lives at userData/logs/app.log in packaged builds and userData/logs-dev/app.log in dev (electron/config.js:40 paths.logs; electron/logger.js:19), i.e., in a dev/prod-split subdirectory, not the userData root. ai-log.jsonl and sf-anthropic.enc no longer exist anywhere in the codebase (removed with ARI — zero readers/writers in electron/). Only sf-esv.enc lives at the raw userData root, unsplit (electron/keystore.js:17); in dev the ESV key is read from .env, not the .enc file (keystore.js:32).
- **Evidence:** electron/config.js:40, electron/logger.js:3,19, electron/keystore.js:17

### F29 · `docs/SYSTEMS/database.md:75-79` · MISLEADS-SPEC

- **Doc says:** "On mismatch it [assertSchemaContract] logs an ERROR ... and the next launch retries the schema-contract migration (see v14 below)."
- **Code truth (verified at HEAD):** assertSchemaContract() (electron/main.js:1384-1402) runs once per launch after runMigrations() (main.js:526) and, on mismatch, logs an ERROR via electron/logger.js and does nothing else — no throw, no schema_version reset, no retry flag. The v14 reconciliation block only executes when schema_version < 14 (main.js:840); since every install reaching the assert has already committed version 32, the v14 block never re-runs and the mismatch error simply re-logs on every subsequent boot. Healing a post-v14 contract violation requires a new migration, not a next-launch retry.
- **Evidence:** electron/main.js:1384-1402, electron/main.js:840-879, electron/main.js:524-526

### F30 · `docs/SYSTEMS/database.md:77-78` · MISLEADS-SPEC

- **Doc says:** assertSchemaContract's ERROR is "visible in `app.log` and attached to feedback submissions"
- **Code truth (verified at HEAD):** On mismatch, assertSchemaContract() logs an ERROR via electron/logger.js that is visible only in the local app.log (userData/logs/app.log). Nothing attaches app.log content to feedback submissions: the live feedback path (bti-feedback-submit -> telemetryBus.sendImmediate) sends only the flag/form payload plus testerId to the Cloudflare Worker, and the legacy feedback-submit handler that posted a redacted app.log tail was removed in the public-launch hardening pass (electron/main.js:3664-3671).
- **Evidence:** electron/main.js:3664-3671, electron/main.js:1671-1678, electron/telemetry/bus.js:191-212

### F37 · `docs/REFERENCE/schema.md:102` · MISLEADS-REFERENCE

- **Doc says:** `functional_elements` is a "JSON object `{0:{explanation,application,illustration},...}` — keyed by outline point UUID"
- **Code truth (verified at HEAD):** sermons.functional_elements is a JSON object keyed by outline-point UUID: `{ <outlinePointId>: { scripture, explanation, application, illustration } }`. All four elements are written by Assembly/Equip (SERMON_EQUIP_FIELDS) and read by getFunctionalElements and the Word export. Numeric keys (`{0:...}`) are the legacy pre-v5-migration shape only; the v5 migration converted them to UUID keys, and getFunctionalElements merely warns on numeric-keyed records as "pre-migration". The sermon_search.functional_elements flattened text (schema.md line 153) likewise includes scripture alongside explanation/application/illustration, since flattenJsonToText flattens every object value.
- **Evidence:** src/utils/sermonEquipFields.js:8-14 (on-disk shape comment listing scripture) and :42-47 (scripture element def); src/utils.js:94, :116-121 (numeric keys = legacy pre-migration), :129-134 (coerces scripture alongside the other three)

### F38 · `docs/REFERENCE/schema.md:115` · MISLEADS-REFERENCE

- **Doc says:** `notebook_study` is "surfaced via the trail's bottom-slide `NotebookDrawer` in Study (WTC DW8)"
- **Code truth (verified at HEAD):** `notebook_study` is surfaced via the bottom-slide `WorkspaceNotebookDrawer` overlay (src/components/WorkspaceNotebookDrawer.jsx), rendered directly by `SermonWorkspace` (src/components/SermonWorkspace.jsx:49, :847) with a per-stage `stage` prop covering Study. The trail UI that originally hosted it (WTC DW8's `NotebookDrawer`) was deleted in the Invisible System rebuild; no Trail component exists at HEAD.
- **Evidence:** src/components/WorkspaceNotebookDrawer.jsx:23 (component name + bottom-slide overlay comment at :6); src/components/SermonWorkspace.jsx:49, :847 (imports and renders it); Grep for "Trail" across src/components returns only Arc.jsx:189 "Trailing window"

### F56 · `docs/REFERENCE/project-structure.md:75` · MISLEADS-REFERENCE · **KNOWN-DEFERRED**

- **Doc says:** Tech-stack table row: "better-sqlite3 + sqlite-vec — Native sqlite for theology.db (FTS4 + vec0)" (scoping better-sqlite3 to theology.db only)
- **Code truth (verified at HEAD):** better-sqlite3 is the native driver for BOTH databases at HEAD: sermonforge.db (file-backed, WAL mode, writes durable at each IPC handler — electron/main.js:43-46, 84-86) and theology.db (electron/main.js:48, 546-548). sqlite-vec loads only for theology.db, whose FTS4 + vec0 search paths remain accurate (electron/main.js:2796, 2863, 2959). sql.js is retired and no longer a dependency (package.json:20,28 list only better-sqlite3 and sqlite-vec). The table should drop the sql.js row (line 74) and re-scope line 75 to: better-sqlite3 — native SQLite for both sermonforge.db (WAL) and theology.db; sqlite-vec — vec0 vector extension for theology.db.
- **Evidence:** package.json:20; docs/SYSTEMS/database.md:10-26; electron/main.js:86, 2796, 2863

### F58 · `docs/REFERENCE/project-structure.md:55` · MISLEADS-REFERENCE

- **Doc says:** Environment block: "Study guides: %USERPROFILE%\OneDrive\SermonForge\StudyGuides\"
- **Code truth (verified at HEAD):** Study-guide exports are written by the series-export-study-guide handler (electron/main.js:3284) to %USERPROFILE%\Documents\SermonForge\exports\StudyGuides\ (electron/main.js:3311), a sibling of Manuscript exports at %USERPROFILE%\Documents\SermonForge\exports\Manuscripts\ (electron/main.js:3477). Line 55 should read: Study guide exports: %USERPROFILE%\Documents\SermonForge\exports\StudyGuides\
- **Evidence:** electron/main.js:3311, 3477

### F59 · `docs/REFERENCE/project-structure.md:57` · MISLEADS-REFERENCE

- **Doc says:** Environment block: "Feedback files: %USERPROFILE%\OneDrive\SermonForge\Feedback\"
- **Code truth (verified at HEAD):** No feedback files are written to disk at HEAD. Feedback (FeedbackForm Tier-2 + FeedbackFlag Tier-1) routes through the "bti-feedback-submit" IPC handler (electron/main.js:1671) → telemetryBus.sendImmediate → Cloudflare Worker. Failed submissions persist locally only to the telemetry NDJSON retry queue at %APPDATA%\sermonforge\telemetry\<session>.immediate.ndjson (electron/telemetry/bus.js:49-50; path defined in electron/config.js:45) — not to any OneDrive Feedback directory. The "Feedback files" line should be deleted (or replaced with the telemetry queue path).
- **Evidence:** electron/main.js:1671, 3664-3671; grep of electron/ for Feedback (only comments match)

### F60 · `docs/REFERENCE/project-structure.md:62-63 (also 98)` · MISLEADS-REFERENCE

- **Doc says:** "For BTI testers, GITHUB_FEEDBACK_TOKEN is wired into the build via CI" and the .env tree annotation listing GITHUB_FEEDBACK_TOKEN as a live .env secret
- **Code truth (verified at HEAD):** GITHUB_FEEDBACK_TOKEN is dead at HEAD: nothing in the app reads it. Its only consumer, the legacy "feedback-submit" IPC handler that posted issues to GitHub with a shipped PAT, was removed in the public-launch hardening pass (removal comment at electron/main.js:3664-3671). Live feedback (FeedbackForm/FeedbackFlag) goes through the Cloudflare Worker via the "bti-feedback-submit" handler (electron/main.js:1671, telemetryBus.sendImmediate). CI still writes GITHUB_FEEDBACK_TOKEN into a build-time .env (.github/workflows/build.yml:35,72) as leftover plumbing, but the only env-driven secret the app actually consumes is ESV_API_KEY. The doc should drop the "For BTI testers..." sentence (or mark the token as vestigial/removable) and remove GITHUB_FEEDBACK_TOKEN from the line-98 .env annotation.
- **Evidence:** electron/main.js:3664-3671, 1671; .github/workflows/build.yml:35,72

### F61 · `docs/REFERENCE/project-structure.md:195` · MISLEADS-REFERENCE

- **Doc says:** "FeedbackFlag.jsx — BTI Tier 1 in-app flag affordance. Dormant post-sweep (all pre-sweep mount surfaces deleted); re-mount is BTI Phase 2+ work"
- **Code truth (verified at HEAD):** FeedbackFlag.jsx (BTI Tier 1 in-app flag affordance) is live-mounted at HEAD on two surfaces: SermonWorkspace.jsx (~lines 788-796, surface `writing-surface-<stage>`, rendered only when not in fixture mode so fixture interactions don't pollute BTI telemetry) and SeriesPlanner.jsx topbar (line 387, surface "series-planner"). No re-mount work is pending.
- **Evidence:** src/components/SermonWorkspace.jsx:784-790; src/components/SeriesPlanner.jsx:32,387; electron/main.js:3668

### F62 · `docs/REFERENCE/project-structure.md:150` · MISLEADS-REFERENCE

- **Doc says:** "src/data/ — static data (currently `downstream-browsers.json.md` only)"
- **Code truth (verified at HEAD):** src/data/ contains two files at HEAD: downstream-browsers.json.md (static reference data) and canonicalBooks.js — the 66-book canonical Bible dataset consumed by the Series Planner book picker, pacing, coverage, Arc, and passage-reference utilities (11 importing files across src/components and src/utils).
- **Evidence:** ls src/data → canonicalBooks.js, downstream-browsers.json.md

### F63 · `docs/REFERENCE/project-structure.md:163-205 (and 147-148)` · MISLEADS-REFERENCE

- **Doc says:** The src/components tree (enumerated file-by-file, implying completeness) and the primitives/ and src/constants listings
- **Code truth (verified at HEAD):** src/components at HEAD contains 47 JS/JSX files including all 33 the doc lists PLUS: Arc.jsx, ArcFixture.jsx, BookSelect.jsx, DeletedSermonStub.jsx, FieldTeaching.jsx, PassageLookup.jsx, ReferencePane.jsx, SermonFinish.jsx, TagInput.jsx, TopicsView.jsx, WhatIvePreached.jsx, WhatIvePreachedFixture.jsx (the What I've Preached / Arc coverage surface, the SermonWorkspace passage-lookup reader, ReferencePane/FieldTeaching writing-surface panes, TagInput topics field, SermonFinish, BookSelect, DeletedSermonStub soft-delete stub). src/components/primitives contains 9 files — the doc's 8 plus KeyInput.jsx (used by EsvKeyModal and SetupScreen). src/constants contains sermonColumns.js AND support.js (SUPPORT_EMAIL, mirrors electron/support.js; consumed by OneDriveWarning.jsx).
- **Evidence:** ls src/components, src/components/primitives, src/constants (vs doc lines 163-205, 147-148)

### F64 · `docs/REFERENCE/project-structure.md:152-162` · MISLEADS-REFERENCE

- **Doc says:** The src/utils/ tree (enumerated file-by-file with annotations, implying completeness)
- **Code truth (verified at HEAD):** src/utils/ at HEAD contains 24 modules plus 3 test files: the 10 listed in the doc (churchCalendar.js, studyFields.js, sadiAnchorFields.js, sermonFrameFields.js, studyAdvancement.js, walkOrder.js, sermonState.js, useEsvPassage.js, searchHints.js, hooks.js) PLUS arc.js, buttonKeydown.js, closeFlush.js, coverage.js, mapError.js, pacing.js, passageRef.js, sermonEquipFields.js, sermonManuscriptFields.js, sermonOutlineFields.js, studyGuideModel.js, tags.js, topicalPassage.js, useModalA11y.js (test files: mapError.test.js, sermonCompleteness.test.js, studyFields.test.js). All 14 unlisted modules are live imports — notably walkOrder.js imports the three walk-region field-def modules, and SeriesPlanner.jsx consumes the planner engine modules (pacing, coverage, studyGuideModel, topicalPassage, passageRef).
- **Evidence:** ls src/utils (vs doc lines 152-162)

### F65 · `docs/REFERENCE/project-structure.md:115-132` · MISLEADS-REFERENCE

- **Doc says:** The electron/ tree (enumerated file-by-file with annotations, implying completeness)
- **Code truth (verified at HEAD):** electron/ at HEAD contains 14 files + 2 subdirectories. In addition to the doc's listed entries, it includes: electron/menu.js (pastor-shaped application menu; buildApplicationMenu required at electron/main.js:40), electron/support.js (SUPPORT_EMAIL constant, main-controlled so the renderer cannot reroute support mail; required at main.js:41 and consumed by the app-email-support handler at main.js:3572-3580), and electron/studyGuideModel.cjs (buildStudyGuideModel, main-process mirror for the study-guide .docx export; required at main.js:19). All entries currently in the doc's tree exist on disk.
- **Evidence:** ls electron/ (vs doc lines 115-132); electron/main.js:3572-3580

### F66 · `docs/REFERENCE/project-structure.md:99-114` · MISLEADS-REFERENCE

- **Doc says:** The docs/ tree listing CORE.md, RULES.md, ANCHORS.md, ENFORCEMENT_STATUS.md, three SYSTEMS docs, four REFERENCE docs, PROPOSALS/ and ARCHIVE/
- **Code truth (verified at HEAD):** At HEAD, docs/ contains: ANCHORS.md, CORE.md, CORE-CHANGELOG.md, ENFORCEMENT_STATUS.md, RULES.md, WORKSPACE-CANON.md, SYSTEMS/ (database.md, ipc.md, series-planner.md, sermon-workspace.md — four docs), REFERENCE/ (ipc-channels.md, privacy.md, project-structure.md, release-smoke.md, schema.md — five docs), PROPOSALS/, ARCHIVE/, and handoff/. The tree listing should add WORKSPACE-CANON.md, CORE-CHANGELOG.md, SYSTEMS/series-planner.md, REFERENCE/release-smoke.md, and handoff/.
- **Evidence:** ls docs, docs/SYSTEMS, docs/REFERENCE (vs doc lines 99-114)

### F67 · `docs/REFERENCE/project-structure.md:207-208` · MISLEADS-REFERENCE

- **Doc says:** "Each component above has a co-located `componentName.css` (or `.module.css` for Logo). CSS files omitted from this tree for brevity."
- **Code truth (verified at HEAD):** Only a minority of components have co-located CSS. At HEAD, src/components/ contains exactly 11 lowercase .css files (feedbackFlag, feedbackForm, passageCanvas, passageLookup, referencePane, sermonFinish, sermonMap, sermonStartLanding, sermonWritingSurface, studyAnchorHandoff, workspaceNotebookDrawer) plus Logo.module.css. Three of those (passageLookup, referencePane, sermonFinish) belong to components the doc's tree doesn't even list. All other components — Sidebar, Dashboard, SermonList, Calendar, SeriesPlanner, Planning, PassagePopup, EsvKeyModal, SetupScreen, etc. — have no component CSS file; their styles live in src/styles/global.css. The line should say something like: "A handful of components have co-located componentName.css files (11 at present, plus Logo.module.css); all other component styles live in src/styles/global.css."
- **Evidence:** ls src/components (11 .css files + Logo.module.css vs ~45 components)

### F68 · `docs/REFERENCE/project-structure.md:141` · COSMETIC

- **Doc says:** "typography.css — Google Fonts loaders for IBM Plex Serif/Mono/Sans + JetBrains Mono"
- **Code truth (verified at HEAD):** src/styles/typography.css loads three Google Fonts families via its single @import (line 23): IBM Plex Serif, IBM Plex Sans, and JetBrains Mono. IBM Plex Mono is not loaded; the doc line should read something like "typography.css — Google Fonts loader for IBM Plex Serif/Sans + JetBrains Mono".
- **Evidence:** src/styles/typography.css:15, 23


---

## G5 — Workspace & planner specs — sermon-workspace.md, WORKSPACE-CANON §7, series-planner docs

The mechanics specs for the two core surfaces. Includes the FeedbackFlag "dormant, no current mount" claim (it IS mounted) and the planner charter still describing the pre-rebuild five-tab shape.

### F7 · `docs/WORKSPACE-CANON.md:407-409` · MISLEADS-BINDING

- **Doc says:** §7 Open seams, item 4: "The Merida flags ... Phase-2 surgery input. Lowest-cost-first order is set in the working board's Phase 2 section; the headline is MPS → fallen-condition-focus (the biggest drift)." — presented inside the list of what is "not yet frozen" / what Phase 2 settles.
- **Code truth (verified at HEAD):** The MPS → fallen-condition-focus surgery shipped 2026-06-15 (Re-Foundation Phase 2). At HEAD, src/utils/sadiAnchorFields.js:71-73 opens the MPS `translate` prompt from the FCF, and the file header (lines 31-35) records the surgery; WORKSPACE-CANON.md §3.1 (line 250) already tags it "FCF restored 2026-06-15 (Phase 2)". §7 item 4 should no longer name MPS→FCF as the pending headline — remaining Merida flags (e.g., §3.3 Equip's [⚠] application-battery gap) may still be open Phase-2 input, but the "biggest drift" item is complete.
- **Evidence:** src/utils/sadiAnchorFields.js:31-35 (header comment) and :71-73 (translate prompt); docs/WORKSPACE-CANON.md:250 (§3.1 tag already historicized)

### F31 · `docs/SYSTEMS/sermon-workspace.md:558-563` · MISLEADS-SPEC

- **Doc says:** Section '## PassagePopup (Show Text)': "The wider passage popout (vs the writing-surface's inline passage column). Triggered by Show Text from the writing-surface chrome."
- **Code truth (verified at HEAD):** PassagePopup is opened by the PassageLookup component (src/components/PassageLookup.jsx), an ESV.org-style Bible reference picker (Testament tab > book > chapter > verse/range dropdown) mounted in the SermonWorkspace top bar (src/components/SermonWorkspace.jsx:735). It is a standalone lookup decoupled from the sermon's preaching passage; picking a reference opens the draggable/resizable reading window with ESV text, section headings, and Previous/Next chapter navigation (PassagePopup.jsx props: headings, prevRef, nextRef, onNavigate). There is no "Show Text" affordance in the writing-surface chrome. The section's other mechanics remain accurate: React portal to document.body, canonical useEsvPassage hook, "passage-fetch" IPC (ESV key stays in main), drag-by-header/resize-from-corner, in-memory per-session cache.
- **Evidence:** src/components/PassageLookup.jsx:7-13,208; src/components/SermonWorkspace.jsx:735; src/components/PassagePopup.jsx:32,182-199; grep 'Show Text' across src = no matches

### F32 · `docs/SYSTEMS/sermon-workspace.md:627-633` · MISLEADS-SPEC

- **Doc says:** "FeedbackFlag is dormant post-sweep… leaving the component with no current mount. Re-wiring is BTI Phase 2+ work."
- **Code truth (verified at HEAD):** FeedbackFlag is live at HEAD with two mounts: (1) src/components/SermonWorkspace.jsx:788-796 — rendered inside .sws-feedback-flag-wrap whenever not in fixture mode (!_fixtureSermon guard exists solely to keep fixture interactions out of BTI telemetry), with surface tag `writing-surface-${position.stage.toLowerCase()}` and step `${position.stage}/${position.subPhase}/${position.fieldKey}`; (2) src/components/SeriesPlanner.jsx:387 — `<FeedbackFlag surface="series-planner" sermonId={null} step={null} />`. The dormancy note dates from before the 2026-05-18 hygiene scan's FeedbackFlag wiring fix and was never updated.
- **Evidence:** src/components/SermonWorkspace.jsx:788-793; src/components/SeriesPlanner.jsx:387

### F33 · `docs/SYSTEMS/sermon-workspace.md:379-381` · MISLEADS-SPEC

- **Doc says:** "Its left gutter prepopulates the passage's verse numbers for single-chapter ranges (`versesForSingleChapterRange` in passageRef.js)"
- **Code truth (verified at HEAD):** The gutter seed comes from `verseLabelsForRange(raw, bookId)` in src/utils/passageRef.js:153 (called from src/components/SermonWritingSurface.jsx:474). It returns string labels for single-chapter ranges (bare verse numbers, e.g. ["8","9","10"]) AND cross-chapter ranges (chapter-prefixed at each chapter seam, e.g. Eccl 5:8-6:12 → ["5:8","9",…,"20","6:1",…,"12"], resolved via per-chapter verse counts), falling back to [] — a blank canvas — when the reference or book data is unresolvable. The gutter cell is also pastor-editable at HEAD (PassageCanvas.jsx:44-59), prefilled but correctable. The doc's remaining claims stay true: only verse numbers are prepopulated (text is typed by hand), a number marks only where a verse begins, and continuation/indented rows carry none.
- **Evidence:** src/utils/passageRef.js:140-179; src/components/PassageCanvas.jsx:17-29,46-58,153-161; commits 3334079, 4fcc112

### F34 · `docs/SYSTEMS/sermon-workspace.md:587-588` · MISLEADS-SPEC

- **Doc says:** Save flow step 7: "`updateSermon(id, fields)` IPC → `electron/main.js` `apply-mutation` handler."
- **Code truth (verified at HEAD):** Step 7 should read: `updateSermon(id, fields)` dispatches the `update-sermon` spine op → `electron/main.js` `case "update-sermon"` handler (main.js:2334), which runs buildUpdate against the SERMON_COLUMNS allowlist. `apply-mutation` is a separate spine op (single-field typed user_input mutation, main.js:2575, dispatched only by applyMutation in src/core/spine.ts:372-375); the multi-field workspace save path never touches it.
- **Evidence:** src/core/spine.ts:254-256; src/components/SermonWorkspace.jsx:211-225; electron/main.js:2334-2351,2575,2727

### F36 · `docs/SYSTEMS/series-planner.md:60-62` · MISLEADS-SPEC

- **Doc says:** Files: `src/components/Planning.jsx`, `SeriesPlanner.jsx` (the three-screen workbench), `NewSeriesModal.jsx`, `BookSelect.jsx`, `CoveragePanel.jsx`, `SeriesPlannerFixture.jsx` — listing CoveragePanel.jsx as one of the planner's component files
- **Code truth (verified at HEAD):** No CoveragePanel.jsx file exists in the repo. CoveragePanel is a local (non-exported, in-file) component function inside src/components/SeriesPlanner.jsx — defined at line 500 and rendered at line 1527 — and the coverage computation it uses lives in src/utils/coverage.js. The Files: list at docs/SYSTEMS/series-planner.md:60-62 should drop `CoveragePanel.jsx` (optionally noting CoveragePanel as an internal component of SeriesPlanner.jsx, plus src/utils/coverage.js); the other five listed files (Planning.jsx, SeriesPlanner.jsx, NewSeriesModal.jsx, BookSelect.jsx, SeriesPlannerFixture.jsx) all exist and are correct.
- **Evidence:** src/components/SeriesPlanner.jsx:500 and glob for **/CoveragePanel.jsx (no match)

### F93 · `docs/PROPOSALS/series-planner-revival-charter.md:3` · MISLEADS-SPEC

- **Doc says:** Status: SHIPPED then UNDER REBUILD ... TOPICAL SERIES mode authorized 2026-06-25 ... Current shape (until the rebuild lands): docs/SYSTEMS/series-planner.md
- **Code truth (verified at HEAD):** At HEAD both builds are SHIPPED, not pending: the content-model rebuild (three-screen Outline/Schedule/Study-guide SeriesPlanner.jsx, schema v27-v29) landed 2026-06-24, and Topical Series mode (series.kind + sermons.sort_order v30, plus the Coverage Initiative's sermons.book_id v31 and tags v32) shipped 2026-06-25; electron/main.js migrates to version = 32, and docs/SYSTEMS/series-planner.md describes the shipped shape. The Status line should read as shipped (e.g. "SHIPPED — rebuilt around the pastor's content model 2026-06-24; Topical Series mode shipped 2026-06-25 (schema v30-v32); current shape: docs/SYSTEMS/series-planner.md"), and line 44's "No code written yet — this ruling authorizes the build" needs a shipped/superseded note.
- **Evidence:** electron/main.js:1189-1371; docs/SYSTEMS/series-planner.md:1-11; src/components/SeriesPlanner.jsx:92

### F94 · `docs/PROPOSALS/series-planner-revival-charter.md:44` · MISLEADS-SPEC

- **Doc says:** "**Build (later).** Schema (`series.kind` + `sermons.sort_order`, v30 ...) ... **No code written yet — this ruling authorizes the build.**"
- **Code truth (verified at HEAD):** The Topical Series build described by the 2026-06-25 ruling is fully shipped at HEAD (memory records commit a6a95f0): the v30 migration adds series.kind + sermons.sort_order (electron/main.js:1307-1334), "kind" is in the SERIES_COLUMNS writable set (electron/contracts.cjs:168), the New Series modal has the Book/Topical choice with the kind+big_idea follow-up updateSeries (src/components/NewSeriesModal.jsx:26-138, write at :57), SeriesPlanner.jsx renders the topical flat pastor-ordered sermon list with move controls (series.kind === "topical" branch at :820; SermonNode topical/onMove at :1247, :1334-1337), and the pastor-order term is live in seriesSermonOrderBy (electron/main.js:1715-1725). The v31 Coverage Initiative (sermons.book_id, main.js:1336+) was even built on top of it. Line 44 should carry a dated shipped/superseded note (matching the ruling-#6 banner pattern) instead of "No code written yet — this ruling authorizes the build."
- **Evidence:** electron/main.js:1307-1334; src/components/NewSeriesModal.jsx:39-68; electron/contracts.cjs:162-169

### F95 · `docs/PROPOSALS/series-planner-revival-charter.md:107-110 (and 104-105)` · MISLEADS-SPEC

- **Doc says:** "Update 2026-06-22: ... the AI-era pipeline and return-to-planner remain out of scope" (restating the 'Out of scope (v1)' item 'return-to-planner after opening a slot')
- **Code truth (verified at HEAD):** Return-to-planner is shipped and live at HEAD (commit 4244fa8, audit M5). src/App.jsx:192-195: openSermonFromPlanner(id) records workspaceReturn = { view: VIEW.SeriesPlanner, seriesId: plannerSeriesId } before opening the sermon; it is the planner's actual onOpenSermon prop at src/App.jsx:413. src/App.jsx:197-209: closeWorkspace returns to VIEW.SeriesPlanner with the remembered seriesId instead of the Dashboard; navigate() (src/App.jsx:211-224) drops the pending return target on any other navigation. The charter's out-of-scope claim (lines 104-105) and the 2026-06-22 update's "return-to-planner remain out of scope" (lines 107-110) need a supersession annotation in the doc's established style (cf. the ⚠ SUPERSEDED note on topical ruling 6, line 41).
- **Evidence:** src/App.jsx:189-209

### F96 · `docs/PROPOSALS/series-planner-revival-charter.md:97-98` · MISLEADS-SPEC

- **Doc says:** Key ruling: "`onOpenSermon`: drop the 3rd (seriesId) arg for v1 — the planner stands alone; return is via the sidebar / Planning list. Revisit only if return-to-this-series is asked for."
- **Code truth (verified at HEAD):** Return-to-this-series was asked for and built (audit M5, commit a04fce5, 2026-06-21): opening a sermon from the planner (src/App.jsx:413 onOpenSermon={openSermonFromPlanner}) records { view: VIEW.SeriesPlanner, seriesId } in App state (App.jsx:192-195), and workspace Back returns directly to that planner (App.jsx:201-206) — return is no longer via the sidebar / Planning list. The mechanical half of the ruling still holds: SeriesPlanner.jsx:1266 calls onOpenSermon(id) with no 3rd seriesId argument; the series id rides App state, not an argument. The charter's related out-of-scope claims (lines 105 and 110, 'return-to-planner ... out of scope') are stale for the same reason.
- **Evidence:** src/App.jsx:192-195, 201-205, 409-413

### F104 · `docs/SYSTEMS/sermon-workspace.md:375-377` · MISLEADS-SPEC

- **Doc says:** The Divisions gutter "prepopulates the passage's verse numbers for single-chapter ranges (versesForSingleChapterRange in passageRef.js)"
- **Code truth (verified at HEAD):** The Divisions gutter is pre-seeded by verseLabelsForRange in src/utils/passageRef.js (the module's only exports are parsePassageRef and verseLabelsForRange), called from src/components/SermonWritingSurface.jsx:474. It handles both single-chapter ranges (bare verse numbers, e.g. ["8","9","10"]) and cross-chapter ranges (chapter shown on the first row and at each chapter change, e.g. Eccl 5:8-6:12 → ["5:8","9",…,"20","6:1",…,"12"]); unresolvable references return [] and the canvas falls back to blank. versesForSingleChapterRange was replaced by verseLabelsForRange (commits 15d4356 → 3334079 → 4fcc112; recorded in CHANGELOG.md:17).
- **Evidence:** src/utils/passageRef.js:33,153 (only exports); repo grep for versesForSingleChapterRange → no matches

### F105 · `docs/SYSTEMS/sermon-workspace.md:139-141` · MISLEADS-SPEC

- **Doc says:** Writing-surface chrome: "every question in the current field rendered stacked; each carries an N/A toggle per the per-question N/A flag in the envelope shape"
- **Code truth (verified at HEAD):** The N/A toggle renders only on questions whose field def declares naAllowed: true — exactly intro.redemptive_note (src/utils/sermonFrameFields.js:74) and mps.gospel_check (src/utils/sadiAnchorFields.js:82). PromptBlock (src/components/SermonWritingSurface.jsx:60) shows the toggle when naAllowed || na; the na-only branch exists solely so a legacy na flag on a non-allowlisted question can be undone. Enforcement is three-deep: field-def flag (UI allowlist), composite gate, and write-path guard (SermonWorkspace.jsx:385 drops na for non-allowlisted questions). The gating flag lives in the field defs, not the envelope shape — the envelope carries only the per-answer na state. The wider Study-question and per-thought-unit-cell N/A is a ruled target (WORKSPACE-CANON §5 rule 3) tracked separately and not yet built.
- **Evidence:** src/components/SermonWritingSurface.jsx:40-48; docs/WORKSPACE-CANON.md:349-353

### F35 · `docs/SYSTEMS/sermon-workspace.md:618` · COSMETIC

- **Doc says:** "the two allowlists mirror each other (34 entries each as of v24; delivery_notes / timing_notes were struck from the writable set in the v24 migration)"
- **Code truth (verified at HEAD):** Both SERMON_COLUMNS allowlists (electron/contracts.cjs:93-142 and src/core/contracts.ts:319-384) mirror each other with 39 entries each as of schema v32 (electron/main.js:1370). Since v24 the writable set gained big_idea, overview, study_guide_extras (v27, which also retired study_guide_note), sort_order (v30), book_id (v31), and tags (v32). delivery_notes / timing_notes remain struck (v24) — that clause in the doc is still accurate.
- **Evidence:** electron/contracts.cjs:93-142; src/core/contracts.ts:319-...; node count of both sets = 39; electron/main.js:1370 (version = 32)


---

## G6 — Status boards & registries — ENFORCEMENT_STATUS.md, ANCHORS.md, refoundation board, release-smoke

The project’s own dashboards of what is true/enforced. Stale rows here quietly mislead every future audit that starts from them (deleted test paths, wrong counts, "pending" work that already shipped).

### F8 · `docs/ANCHORS.md:8` · MISLEADS-BINDING

- **Doc says:** docs/PROPOSALS/refoundation-initiative.md — "the ACTIVE initiative (Phase 1 complete 2026-06-15; Phase 2 Merida question surgery pending)"
- **Code truth (verified at HEAD):** The Phase 2 Merida question surgery is complete, not pending: it shipped to main 2026-06-15/16 in three commits (ab5c87c batch 1, 2029747 the cuts/item 4, c07139e remove the four [+] additions/item 5), amending src/utils/studyFields.js and src/utils/sadiAnchorFields.js and propagating to docs/WORKSPACE-CANON.md and docs/CORE.md (Process #4 carries the "Amended 2026-06-15, Re-Foundation Phase 2" note; the Study now has 23 fields per CORE.md:237). The initiative is still ACTIVE — remaining Phase 2 work is the OEM walk and the per-cell N/A build — so line 8 should say something like "Phase 1 complete 2026-06-15; Phase 2 Merida question surgery shipped 2026-06-15/16; OEM walk + per-cell N/A build pending."
- **Evidence:** git log (ab5c87c/2029747/c07139e on main, dated 2026-06-15/16); docs/CORE.md:214-217 (Phase 2 amendment); docs/CORE.md:237 (23 fields)

### F9 · `docs/ANCHORS.md:11` · MISLEADS-BINDING

- **Doc says:** docs/PROPOSALS/series-planner-revival-charter.md — "(shipped 2026-06-21 as five tabs; re-leveled 2026-06-22 to four movements — Understand · Design · Schedule · Overview)" presented as the planner's latest shipped shape
- **Code truth (verified at HEAD):** At HEAD the Series Planner is three screens — Outline · Schedule · Study guide (PLANNER_TABS, src/components/SeriesPlanner.jsx:41-45; the finder cited "TABS at 42-44," the constant is PLANNER_TABS spanning 41-45). The five-tab (2026-06-21) and four-movement (2026-06-22) shapes were superseded by the 2026-06-24 content-model rebuild (Book ▸ Section ▸ Sermon, every level Title + range · Big idea · Overview), then extended 2026-06-25 with the Topical Series mode (schema v30-v32). The ANCHORS.md entry should describe the charter's current status the way the charter's own line 3 does — four-movement workbench and melodic-line model superseded by the 2026-06-24 content-model rebuild; three screens; Topical mode added 2026-06-25.
- **Evidence:** src/components/SeriesPlanner.jsx:42-44 and 602-607; docs/SYSTEMS/series-planner.md:3-4; docs/PROPOSALS/series-planner-revival-charter.md:3

### F10 · `docs/ENFORCEMENT_STATUS.md:50` · MISLEADS-BINDING

- **Doc says:** Surface #2 per-clause row: "The new baseline is 23 raw-button hits across the post-D2c writing-surface stack ... plus pre-existing hits in FieldOverviewScreen.jsx, IndentedSentenceCanvas.jsx, ScripturePanel.jsx ... Surface #2 lint catch-up is now scheduled work" with verification command "npm run lint (23 no-raw-button hits; see Lint baseline table below)"
- **Code truth (verified at HEAD):** sermonforge/no-raw-button is at zero at HEAD: the D2c/D2d catch-up pass landed 2026-06-21 (the remaining writing-surface hits migrated to <IconButton>, as the doc's own lines 12, 78, and 143 already record). Raw <button> elements exist only in the six exempt primitives files (src/components/primitives/{IconButton,DeleteButton,TextButton,BackButton,PrimaryButton,SecondaryButton}); a full `npm run lint` exits clean. IndentedSentenceCanvas.jsx no longer exists (deleted in commit 15d4356). The line-50 row's baseline claim, "scheduled work" status, file list, and verification command ("23 no-raw-button hits") should all be updated to reflect zero — e.g., "npm run lint (zero no-raw-button hits)".
- **Evidence:** grep '<button' across src → only src/components/primitives/{IconButton,DeleteButton,TextButton,BackButton,PrimaryButton,SecondaryButton}; `npm run lint` run at HEAD exits 0; Glob src/components/IndentedSentenceCanvas.jsx → no file

### F11 · `docs/ENFORCEMENT_STATUS.md:43` · MISLEADS-BINDING

- **Doc says:** Process #6 row: the two validator scripts are the live mechanical evidence, with verification command "python scripts/sfdi-internal-consistency.py && python scripts/sfdi-cross-doc-consistency.py" (reasserted at lines 97 and 157: "enforcement is structural via the two live validator scripts")
- **Code truth (verified at HEAD):** At HEAD the Process #6 verification command exits non-zero: scripts/sfdi-cross-doc-consistency.py FAILS C3 ("Per-phase field counts (8, 8, 5, 4) consistent", 2 failures) because its regexes expect the pre-surgery 8-field Phase 1/2 shape in docs/SYSTEMS/sermon-workspace.md, while the live Study shape is 7+7+5+4 = 23 fields per src/utils/studyFields.js (OBSERVE_FIELDS=7, INTERPRET_FIELDS=7, REDEMPTIVE_FIELDS=5, IMPLICATIONS_FIELDS=4). scripts/sfdi-internal-consistency.py passes 7/7. Either the script's C3 patterns must be updated to the post-Merida 7+7+5+4 shape (matching the current wording of sermon-workspace.md) or the doc's claim that the two scripts are the live, runnable mechanical evidence for Process #6 must be revised — as written, the doc's stated verification cannot be run green.
- **Evidence:** python scripts/sfdi-cross-doc-consistency.py run at HEAD → '[FAIL] C3 — Per-phase field counts (8, 8, 5, 4) consistent, Failures: 2'; src/utils/studyFields.js:70-505 field arrays count 7+7+5+4

### F12 · `docs/ENFORCEMENT_STATUS.md:37` · MISLEADS-BINDING

- **Doc says:** State #6 row: "Mark Complete on the Delivery tab + Mark Series Complete in the SeriesPlanner topbar provide the lifecycle close-out"
- **Code truth (verified at HEAD):** Sermon lifecycle close-out at HEAD is "Mark as preached": SecondaryButton on the Finish screen (src/components/SermonFinish.jsx:88-90), plus inline "Mark preached" buttons on the Dashboard return-day reminder (src/components/Dashboard.jsx:345, described by the comment at :202-207) and in src/components/SermonList.jsx:179. There is no Delivery tab or stage (src/core/contracts.ts:52-57 — Stage = "Study" | "Assembly" | "Manuscript"; Delivery struck in v24, 2026-06-10) and no "Mark Complete" control for sermons. "Mark Series Complete" in the SeriesPlanner topbar remains real (src/components/SeriesPlanner.jsx:383) with an auto-suggest banner (:391-402), so that half of the doc sentence is accurate.
- **Evidence:** src/core/contracts.ts:57-67 (STAGE has no Delivery); src/components/SermonFinish.jsx:89; src/components/Dashboard.jsx:202-207; src/components/SeriesPlanner.jsx:383

### F13 · `docs/ENFORCEMENT_STATUS.md:33` · MISLEADS-BINDING

- **Doc says:** State #2 row verification command: "npm test -- tests/contracts/process-1-monotonic.test.ts"
- **Code truth (verified at HEAD):** tests/contracts/process-1-monotonic.test.ts was deleted in the trail-deletion sweep (Phase G, 2026-05-18) and no test at HEAD covers State #2's position columns. State #2's enforcement is structural (v17/v21/v23 sermon position columns + spine.getSermon() deriving ProcessPosition + SPINE_ONLY_COLUMNS protection), so the row's Verification command should be re-pointed to the structural gate — `node scripts/spine-integrity.js` — matching the convention already used by the State #1 and State #4 rows, or annotated "(no dedicated test post-G)" like the Process #1 row.
- **Evidence:** Glob tests/contracts/*.{ts,tsx} → 13 files, no process-1-monotonic.test.ts; docs/ENFORCEMENT_STATUS.md:38 records its deletion

### F14 · `docs/ENFORCEMENT_STATUS.md:18-24` · MISLEADS-BINDING

- **Doc says:** Summary table: "Structural | 17 clauses" (with Test 2 + Lint 3, totaling 22) and "Fully unenforced | 0 clauses | Every active clause in docs/CORE.md has a real primary enforcement mechanism"
- **Code truth (verified at HEAD):** docs/ENFORCEMENT_STATUS.md line 20 should read "Structural | 16 clauses". At HEAD, docs/CORE.md carries 21 active clauses; primary enforcement per the doc's own per-clause table is Structural 16 + Test 2 + Lint 3 = 21. The retired Mutation #2 (CORE.md:272, ENFORCEMENT_STATUS.md:45, layer n/a) must not be counted. The adjacent "Fully unenforced | 0 clauses" row is correct as written.
- **Evidence:** docs/CORE.md:123-307 (clause enumeration; :272 'The proposal slot was retired (ARI Phase 9)'); per-clause layer column at docs/ENFORCEMENT_STATUS.md:32-53

### F15 · `docs/ENFORCEMENT_STATUS.md:51` · MISLEADS-BINDING

- **Doc says:** Surface #3 row: "LoadingState's verb prop is typed against the LoadingVerb union in src/core/contracts.ts (\"Loading…\" / \"Saving…\" / \"Thinking…\")" — a three-verb canonical vocabulary
- **Code truth (verified at HEAD):** The LoadingVerb union in src/core/contracts.ts (line 212) has four members at HEAD: "Loading…" | "Saving…" | "Thinking…" | "Exporting…". The LOADING_VERB const (lines 214–220) mirrors all four; "Exporting…" was added for Word export in flight ("generating a document, not saving app state"). Line 51 of docs/ENFORCEMENT_STATUS.md should enumerate all four verbs.
- **Evidence:** src/core/contracts.ts:212-220 (LoadingVerb type + LOADING_VERB const including Exporting)

### F76 · `docs/PROPOSALS/refoundation-initiative.md:3, 16-17` · MISLEADS-SPEC

- **Doc says:** "Status: PHASE 1 COMPLETE — ... Phase 2 (the Merida question surgery) is the remaining work" and "Phase 1 is complete; the next action is Phase 2 — the Merida question surgery against the live canon."
- **Code truth (verified at HEAD):** Phase 2 (the Merida question surgery) is no longer "the remaining work" as a whole — it is partially shipped on main: batch 1 (ab5c87c, 2026-06-15), the cuts / item 4 (2029747, 2026-06-15), and removal of the four [+] additions / item 5 (c07139e, 2026-06-16), reducing Study from 25 to 23 fields and amending CORE Process #4. Remaining Phase-2 work at HEAD is the tail of the Phase-2 list: the OEM-walk items and the per-cell N/A code build (plus the infra-doc pass). The board's status banner should read roughly: "Phase 1 complete; Phase 2 items 1-5 shipped (2026-06-15/16, commits ab5c87c / 2029747 / c07139e); remaining: OEM walk + per-cell N/A build + infra-doc pass."
- **Evidence:** git log (ab5c87c, 2029747, c07139e); src/utils/studyFields.js:59,131-133; docs/SYSTEMS/sermon-workspace.md:60-62

### F77 · `docs/PROPOSALS/refoundation-initiative.md:149-150, 181` · MISLEADS-SPEC

- **Doc says:** "Stable, CORE-canonical counts that do not move: 3 stages · 8 sub-phases · 8 named outcomes · 8 composite gates · 25 Study fields" and "Study field set — 25 fields (8/8/5/4), exact match to CORE."
- **Code truth (verified at HEAD):** Study is 23 fields (7/7/5/4) at HEAD: src/utils/studyFields.js OBSERVE_FIELDS = 7 (Context, Surface Questions, Divisions, Main Characters, Commands and Declarations, Big Ideas, Obvious Point — Possible Implications removed 2026-06-15 Phase 2), INTERPRET_FIELDS = 7 (Genre removed 2026-06-15 Phase 2), REDEMPTIVE_FIELDS = 5, IMPLICATIONS_FIELDS = 4. docs/CORE.md:237 states "23 fields" in present tense. The finder's evidence checks out exactly; the only addition is that the doc's stale top banner (refoundation-initiative.md:3,16-17, "Phase 2 ... is the remaining work") is what strips the dated net-truth map of any historicizing protection — Phase 2 shipped in commits ab5c87c, 2029747, c07139e.
- **Evidence:** src/utils/studyFields.js:70-127,161-214,257-350,402-491; docs/CORE.md:237

### F75 · `docs/REFERENCE/release-smoke.md:23-24` · MISLEADS-REFERENCE

- **Doc says:** New sermon + walk: "create a sermon (empty-title click answers instead of a dead button)"
- **Code truth (verified at HEAD):** At HEAD, NewSermonModal (src/components/NewSermonModal.jsx) asks for no title — a standalone sermon is anchored on the passage (Book picker + chapter:verse compose the passage, which names the sermon; the title comes later in prep). The "click answers instead of a dead button" smoke check is now: click "Forge Sermon" with no Book picked → the inline error "Pick the book you're preaching — the passage names the sermon until you title it in prep." appears (handleForge, lines 98-103). The checklist item should read something like: create a sermon (no-book click answers with an inline error instead of a dead button; pick a Book + chapter:verse, Forge).
- **Evidence:** src/components/NewSermonModal.jsx:19-22,37 (no title field by design) and :98-103 (book-missing validation is the only empty-state answer)

### F16 · `docs/ENFORCEMENT_STATUS.md:47` · COSMETIC

- **Doc says:** Mutation #4 row: "src/components/DeleteButton.jsx is the canonical two-step inline confirm"
- **Code truth (verified at HEAD):** The finder's evidence is wrong on one point: a file DOES exist at src/components/DeleteButton.jsx (tracked in git). It is a 5-line re-export shim ("export { default } from \"./primitives/DeleteButton\";") whose comment states the canonical DeleteButton now lives in src/components/primitives/DeleteButton.jsx and that the shim is preserved only so existing imports keep compiling; new code should import from ./primitives/DeleteButton directly. Four components (CompletedSermons, SermonList, SermonWorkspace, SeriesPlanner) still import via the shim; Dashboard and SynthesisTable import from primitives/ directly. So the reference at line 47 is not broken — it names a real file — but it names the compatibility shim as "the canonical" component when the canonical primitive is src/components/primitives/DeleteButton.jsx.
- **Evidence:** Glob src/components/primitives/* → src/components/primitives/DeleteButton.jsx; docs/ENFORCEMENT_STATUS.md:76 records the move

### F17 · `docs/ENFORCEMENT_STATUS.md:116` · COSMETIC

- **Doc says:** SPRD section: "The 8 composite gate functions in studyAdvancement.js (checkField3Composite exported; 7 internal) are the foundation"
- **Code truth (verified at HEAD):** All 8 composite gate functions in src/utils/studyAdvancement.js are exported (checkField3Composite, checkField8Composite, checkPhase4Field4Composite, checkField5Composite, checkIntroComposite, checkConclusionComposite, checkMPTComposite, checkMPSComposite — export function at lines 109, 126, 153, 181, 207, 227, 246, 265); src/utils/sermonState.js imports and consumes all 8 in deriveSermonCompleteness. The parenthetical should read something like "(all 8 exported; consumed by deriveSermonCompleteness in sermonState.js)".
- **Evidence:** src/utils/studyAdvancement.js:109,126,153,181,207,227,246,265 (all `export function check*Composite`)

### F18 · `docs/ENFORCEMENT_STATUS.md:97` · COSMETIC

- **Doc says:** "The CORE.md text edit consummating this extension ('Study throughline' → 'workspace throughline' + canonical-articulation pointer to SADI alongside SFDI) lands as a small downstream code-edit pass" (repeated at line 157)
- **Code truth (verified at HEAD):** The CORE.md Process #6 text edit already shipped. At HEAD, docs/CORE.md line 220 reads "6. **The workspace throughline is structural.**" (the 'Study throughline' → 'workspace throughline' rewording), and lines 228-236 give the canonical articulation as docs/WORKSPACE-CANON.md with both the SFDI and SADI initiative docs (docs/PROPOSALS/study-field-definition-initiative.md, docs/PROPOSALS/sermon-anchor-definition-initiative.md) named as frozen development records — i.e., the canonical-articulation pointer to SADI alongside SFDI exists. ENFORCEMENT_STATUS.md line 106 already records this as SHIPPED; the trailing sentences at lines 97 and 157 should be rewritten to past tense (e.g., "landed — see line 106 / CORE.md Process #6") or deleted.
- **Evidence:** docs/CORE.md:220 ('6. **The workspace throughline is structural.**'); docs/ENFORCEMENT_STATUS.md:106 (SHIPPED)

### F19 · `docs/ENFORCEMENT_STATUS.md:125` · COSMETIC

- **Doc says:** Test-environment mitigation: "the fixture's clause citations (clause: \"State #3\", etc.) and error codes (code: PROCESS_2_EMPTY_EVIDENCE, etc.) mirror the main process literally"
- **Code truth (verified at HEAD):** At HEAD, the error codes that the test fixture mirrors from the main process are STATE_3_NAMELESS_SERMON and STATE_3_NAMELESS_SERIES (tests/contracts/_helpers/test-spine.ts lines 300/331/359 mirroring electron/main.js lines 2240/2304/2359). PROCESS_2_EMPTY_EVIDENCE was deleted in trail-deletion Phase G (2026-05-18) and appears nowhere in code; line 125's example should cite a live code such as STATE_3_NAMELESS_SERMON instead.
- **Evidence:** grep PROCESS_2_EMPTY_EVIDENCE repo-wide → only docs/ENFORCEMENT_STATUS.md; tests/contracts/_helpers/test-spine.ts:300,331,359 (STATE_3_NAMELESS_* are the live codes)


---

## G7 — BTI & privacy truth-up — beta-testing-initiative.md, bti-tester-summary.md, privacy.md

Pastor-facing and privacy-claim documents for the beta cohort. The tester letter promises a tour that no longer exists and names tabs (Blueprint) that were retired; privacy.md over- and under-states what telemetry actually sends. Worth truthing up BEFORE any cohort reads them.

### F82 · `docs/PROPOSALS/beta-testing-initiative.md:153 (also 173, 299)` · MISLEADS-SPEC

- **Doc says:** "SPRD's 8+8+5+4 phase shape is structurally locked" / "the prewritten question sequences in Study (SPRD's 8+8+5+4)" / "the 8+8+5+4 phase shape is locked"
- **Code truth (verified at HEAD):** Study at HEAD is 7+7+5+4 = 23 fields (src/utils/studyFields.js: OBSERVE_FIELDS 7, INTERPRET_FIELDS 7, REDEMPTIVE_FIELDS 5, IMPLICATIONS_FIELDS 4). The 2026-06-15 Phase-2 Merida surgery cut Possible Implications from Observe and Genre from Interpret. Minor addendum: the code's own Observe header comment at studyFields.js:53 still says "8 fields" while the array holds 7 (the in-app copy at :78 correctly says "next seven fields") — a small stale code comment, but the finder's array counts are exact.
- **Evidence:** src/utils/studyFields.js:70-127 (7 Observe fields; removal noted at :59), :161-256 (7 Interpret fields; comment at :131-133 says 'Genre... removed 2026-06-15'), :257 (5 Redemptive), :402 (4 Implications)

### F83 · `docs/PROPOSALS/beta-testing-initiative.md:108 (also 281)` · MISLEADS-SPEC

- **Doc says:** "A small, persistent flag affordance at every workspace tab where the pastor authors structured content — Study, Blueprint, and Manuscript" / Q1 settled: "Flag button mounts at all three workspace authorship tabs — Study, Blueprint, and Manuscript"
- **Code truth (verified at HEAD):** At HEAD the stage vocabulary is Study | Assembly | Manuscript (src/core/contracts.ts:57); "Blueprint" is a retired legacy value coerced to Assembly on read (contracts.ts:51-52, spine.ts:311). The workspace has no per-stage tabs — it is a unified writing surface, and the Tier 1 flag is one mount in src/components/SermonWorkspace.jsx:788-796 with surface=`writing-surface-${position.stage.toLowerCase()}` (present in all three stages via that single mount), plus a second mount at src/components/SeriesPlanner.jsx:387 with surface="series-planner". Doc lines 108/281 should say the flag mounts on the unified writing surface across the three stages Study, Assembly, and Manuscript.
- **Evidence:** src/core/contracts.ts:51-63 (Stage type + legacy-Blueprint coercion note), src/core/spine.ts:311, src/components/SermonWorkspace.jsx:788-796 (the one FeedbackFlag mount)

### F84 · `docs/PROPOSALS/beta-testing-initiative.md:144` · MISLEADS-SPEC

- **Doc says:** "The `ai-press` and `ai-proposal` event constants are still defined in `electron/telemetry/events.js` but nothing emits them; cleanup of the event registry is a small follow-up item."
- **Code truth (verified at HEAD):** The registry defines exactly six events (app-open, panel-time, field-time, sermon-create, sermon-finish, crash); ai-press and ai-proposal are gone. The cleanup already shipped — the charter's own Phase 1.5 record (line 313, closed 2026-05-09) says so, contradicting this body text. A future session would be sent to do cleanup that is already done.
- **Evidence:** electron/telemetry/events.js:6-13

### F85 · `docs/PROPOSALS/beta-testing-initiative.md:198` · MISLEADS-SPEC

- **Doc says:** "The `FeedbackForm.jsx` dimensions list still uses the pre-ARI labels; updating it to match this section is a small follow-up code item."
- **Code truth (verified at HEAD):** src/components/FeedbackForm.jsx (lines 18-29) already carries the post-ARI dimensions list: ten entries whose stored values are exactly the charter section's dimension ids (structural-overreach, workflow-fit, question-quality, trust, friction-and-surprise, onboarding-and-first-run, reliability-and-weirdness, performance-and-feel, voice-and-frame, what-surprised-you), with pastor-facing labels rather than the analysis-team vocabulary. The update shipped in BTI Phase 1.5, closed 2026-05-09, as recorded at line 313 of the same charter. The follow-up item described at line 198 no longer exists; the note should be rewritten to past tense (e.g., "...Both have been recast, and FeedbackForm.jsx was updated to match in Phase 1.5").
- **Evidence:** src/components/FeedbackForm.jsx:13-29

### F86 · `docs/PROPOSALS/beta-testing-initiative.md:283` · MISLEADS-SPEC

- **Doc says:** Q3: "the seven events under Layer 0 above are captured. `ai-press` and `ai-proposal` are defined but unused — cleanup pending."
- **Code truth (verified at HEAD):** At HEAD, electron/telemetry/events.js defines exactly six event types (APP_OPEN, PANEL_TIME, FIELD_TIME, SERMON_CREATE, SERMON_FINISH, CRASH). The ai-press/ai-proposal constants were removed in BTI Phase 1.5 (closed 2026-05-09, per the charter's own line 313); no cleanup is pending. Q3 should read six events and drop the "defined but unused — cleanup pending" sentence. Related: line 144 of the same doc repeats the same stale "still defined ... cleanup is a small follow-up item" claim and should be fixed in the same pass.
- **Evidence:** electron/telemetry/events.js:6-13

### F69 · `docs/REFERENCE/privacy.md:9-15` · MISLEADS-REFERENCE

- **Doc says:** "Three things talk to the network, and only these three" — Crossway ESV API, GitHub Releases, BTI telemetry; "This document covers all three."
- **Code truth (verified at HEAD):** Four things talk to the network at HEAD, not three: (1) Crossway ESV API, (2) GitHub Releases update check, (3) BTI telemetry, and (4) Google Fonts — the renderer's CSS bundle contains @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif...') from src/styles/typography.css:23 (preserved in the built dist/assets/index-*.css that electron/main.js:1608 loads), which fetches the stylesheet from fonts.googleapis.com and font files from fonts.gstatic.com on app start. No CSP or request interception exists anywhere in the repo to block it, and it is not controlled by the telemetry toggle. Fix options: disclose it in privacy.md, or (better for a local-first privacy posture) self-host the three font families and delete the remote @import.
- **Evidence:** src/styles/typography.css:23; src/main.jsx:4; repo-wide grep for Content-Security-Policy/connect-src/style-src = no matches

### F70 · `docs/REFERENCE/privacy.md:24` · MISLEADS-REFERENCE

- **Doc says:** Crash log "never leaves your machine on its own — only the last 50 lines are attached when the telemetry channel reports a crash event (see below)."
- **Code truth (verified at HEAD):** The crash telemetry event carries only a short error string — { error: "<label>: <detail>" } with detail capped at 500 characters (electron/main.js:1663; payload shape documented at electron/telemetry/events.js:12). No app.log lines are ever attached to any telemetry event; logger.readRecent (electron/logger.js:61) has no callers anywhere in the codebase. app.log is written and rotated locally (electron/logger.js) and never transmitted, exactly as privacy.md line 58 already states.
- **Evidence:** electron/main.js:1660-1666; electron/logger.js:61-72; repo-wide grep for readRecent = definition + export only

### F71 · `docs/REFERENCE/privacy.md:56-57` · MISLEADS-REFERENCE

- **Doc says:** "What is captured ... panel-time / field-time — how long a panel or field has focus ... sermon-create / sermon-finish — sermon-level lifecycle markers, with the sermon's database ID." (presented as events the app currently sends)
- **Code truth (verified at HEAD):** At HEAD, only two telemetry event types are actually emitted: "app-open" (electron/main.js:75, on launch with version + platform) and "crash" (electron/main.js:1663, with a truncated error string). panel-time, field-time, sermon-create, and sermon-finish are defined only in the event registry (electron/telemetry/events.js:8-11) and have no emitters anywhere: the renderer-side bridge electronAPI.telemetryEmit (electron/preload.js:114 → "telemetry-emit" handler at electron/main.js:1640-1642) has zero callers in src/. Minor correction to the finder: there are three telemetryBus.emit call sites, not two — main.js:75, main.js:1642 (the IPC relay), and main.js:1663 — but the relay at 1642 is unreachable in practice since nothing in the renderer invokes telemetryEmit, so the conclusion stands: only app-open and crash flow.
- **Evidence:** electron/main.js:75 and :1663 (only telemetryBus.emit call sites); electron/preload.js:114; grep of src/ for telemetryEmit|panel-time|field-time|sermon-create|sermon-finish = no matches; electron/telemetry/events.js:6-13

### F72 · `docs/REFERENCE/privacy.md:85` · MISLEADS-REFERENCE

- **Doc says:** "If you uninstall and reinstall, you get a new ID."
- **Code truth (verified at HEAD):** The tester ID persists across uninstall/reinstall. It is stored at paths.userData/tester-id.txt and reloaded if present (electron/telemetry/bus.js:274-288); the Windows NSIS uninstaller does not delete appData ("deleteAppDataOnUninstall": false, package.json:108), and macOS DMG installs have no uninstaller that removes Application Support. A new ID is generated only if the user manually deletes the app-data folder (or tester-id.txt).
- **Evidence:** electron/telemetry/bus.js:274-288 and :13-14; package.json:102-108

### F90 · `docs/PROPOSALS/bti-tester-summary.md:114` · MISLEADS-REFERENCE

- **Doc says:** "Install the app, set it up, take a look around. There'll be a short tour."
- **Code truth (verified at HEAD):** The guided tour was deleted in commit e7eccf6 (invisible-system rebuild, 2026-05-17): TourOverlay.jsx (-275), TourContext.jsx (-115), App.jsx TourProvider, and Dashboard's "Take the guided tour" row all removed. What survives is the decoupled "Open a sample sermon" Dashboard row (tour-* IDs renamed sample-*), which is opt-in and not a tour. Minor finder correction: SeriesPlanner.jsx:136 is not the sole surviving 'tour' mention — comment-only references also remain in src/components/primitives/TextButton.tsx, src/core/contracts.ts, and src/styles/global.css — but all are comments about the deleted engine; no live tour code exists. The doc should either drop the tour sentence or point testers at the sample sermon instead.
- **Evidence:** src/components/SeriesPlanner.jsx:136 (sole surviving 'tour' mention, a comment about the deleted engine); commit e7eccf6 diff (TourOverlay.jsx -275 lines, TourContext.jsx -115 lines, Dashboard.jsx guided-tour row removed)

### F91 · `docs/PROPOSALS/bti-tester-summary.md:51` · MISLEADS-REFERENCE

- **Doc says:** "on each tab where you're authoring something — Study, Blueprint, Manuscript — there's a small flag button"
- **Code truth (verified at HEAD):** The three authoring stages at HEAD are Study, Assembly, and Manuscript (src/core/contracts.ts:57-63, UI labels in STAGE_LABELS at 69-73). "Blueprint" no longer exists as a stage — it is a legacy value from a prior 4-stage shape, coerced to "Assembly" on read (contracts.ts:51-52, spine.ts:311). Line 51 should read "Study, Assembly, Manuscript". The flag button does exist on each stage's writing surface (src/components/SermonWorkspace.jsx:788-796).
- **Evidence:** src/core/contracts.ts:57-63; src/core/spine.ts:309-313; src/components/SermonWorkspace.jsx:788-796

### F73 · `docs/REFERENCE/privacy.md:62-64` · COSMETIC

- **Doc says:** "Flag clicks. When you click the small flag button at a workspace tab ... The surface (Study, Assembly, Manuscript), the active sub-phase, the sermon ID."
- **Code truth (verified at HEAD):** The flag button appears in two places at HEAD: (1) each workspace writing surface — payload surface = "writing-surface-study" / "writing-surface-assembly" / "writing-surface-manuscript", step = "Stage/SubPhase/fieldKey" (includes the field key, not just the sub-phase), sermonId = the sermon's DB id (SermonWorkspace.jsx:788-796); and (2) the Series Planner topbar — payload surface = "series-planner", sermonId = null, step = null (SeriesPlanner.jsx:387). In all cases the data classes sent are unchanged from the doc: surface, step, sermonId, optional one-line note, timestamp (FeedbackFlag.jsx:50-57).
- **Evidence:** src/components/SeriesPlanner.jsx:387; src/components/SermonWorkspace.jsx:788-795; src/components/FeedbackFlag.jsx:50-57

### F87 · `docs/PROPOSALS/beta-testing-initiative.md:298` · COSMETIC

- **Doc says:** "MPT/MPS plumbed as `SpotlightWorksheet` fields... and a composite gate at the Step 2 → Step 3 boundary. BTI tests whether... the gate's 'satisfied another way' semantic on MPS Q2 reads as a real escape valve"
- **Code truth (verified at HEAD):** At HEAD, MPT/MPS render via MAIN_POINT_PAIR_FIELDS in src/utils/sadiAnchorFields.js, consumed by src/utils/walkOrder.js:76 under the Assembly/Anchor sub-phase of the unified writing surface — SpotlightWorksheet and the Step layer are deleted (src/core/contracts.ts:37-43). No gate blocks movement anywhere: checkMPTComposite/checkMPSComposite (src/utils/studyAdvancement.js:244-283) survive as completeness checks feeding deriveSermonCompleteness and the SermonFinish screen (the code still calls these "composite gates," but they "stop blocking movement"). The "satisfied another way" N/A semantic on MPS Q2 (gospel_check) survives intact — naAllowed: true at src/utils/sadiAnchorFields.js:82 with the strict "N/A is not skip" rule, enforced by checkMPSComposite:279 — so BTI's escape-valve question remains testable, but as a per-question N/A affordance plus a SermonFinish completeness reason, not as a gate testers encounter at any boundary.
- **Evidence:** src/components/ReferencePane.jsx:36 ('the deleted SpotlightWorksheet'), src/core/contracts.ts:37-43 (Step layer retired), src/utils/studyAdvancement.js:3-28 (walls deleted; gates stop blocking), src/utils/sadiAnchorFields.js:5,79

### F88 · `docs/PROPOSALS/beta-testing-initiative.md:190` · COSMETIC

- **Doc says:** Feedback dimension 6: "Onboarding and first-run — the tour, the setup screen, the first sermon."
- **Code truth (verified at HEAD):** At HEAD there is no tour. First-run onboarding is src/components/SetupScreen.jsx (first-run setup, ESV key entry) plus the seeded sample sermon (surfaced via src/components/Dashboard.jsx). Dimension 6 should read something like "the setup screen, the sample sermon, the first sermon" — the tour reference should be removed or historicized like the doc's lines 137-139 amendment.
- **Evidence:** grep of src for TourOverlay|tourEngine|sf_tour|startTour|TOUR_ → only a comment at src/components/SeriesPlanner.jsx:136; no tour component files exist

### F89 · `docs/PROPOSALS/beta-testing-initiative.md:296` · COSMETIC

- **Doc says:** "ACC's residue worth testing in BTI is what it normalized about the rest of the system — the audit log, the keystore, the structured save flow."
- **Code truth (verified at HEAD):** No audit log exists anywhere in the code at HEAD — the AI-call audit log was removed with ARI (2026-05-09). electron/keystore.js and the structured save flow (durable writes at the IPC handlers in electron/main.js) do exist. The residue list should drop "the audit log" and read: "the keystore, the structured save flow" (or explicitly note the audit log was removed with ARI).
- **Evidence:** repo-wide grep auditLog|audit_log|audit-log (code globs): no matches; electron/keystore.js exists

### F92 · `docs/PROPOSALS/bti-tester-summary.md:61` · COSMETIC

- **Doc says:** "I'm planning to capture some technical signals ... where the tour drops you off"
- **Code truth (verified at HEAD):** Finder's ground truth is accurate. Minor refinements: the privacy.md behavioral-event list spans lines 55-58 (crash on 58), not 55-57; and the drift extends to line 114 of the same letter ("There'll be a short tour"), which shares the false tour presupposition. Fix should mirror the dated amendment style already applied to beta-testing-initiative.md and bti-build-mvp.md in T14 (45fb32e): drop the "where the tour drops you off" clause from the signal list at line 61 and remove/reword the line-114 tour promise, since the tour engine and TOUR_STEP telemetry were deleted in e7eccf6 (2026-05-17 tour cleanup).
- **Evidence:** electron/telemetry/events.js:6-13; docs/REFERENCE/privacy.md:55-57; commit e7eccf6 (electron/telemetry/events.js -1 line, TOUR_STEP removed)

---

## Findings per doc

| Doc | Findings |
|---|---|
| docs/REFERENCE/ipc-channels.md | 15 |
| docs/REFERENCE/project-structure.md | 14 |
| docs/ENFORCEMENT_STATUS.md | 10 |
| docs/PROPOSALS/beta-testing-initiative.md | 8 |
| docs/SYSTEMS/database.md | 7 |
| docs/SYSTEMS/sermon-workspace.md | 7 |
| docs/REFERENCE/privacy.md | 5 |
| docs/CORE.md | 4 |
| docs/SYSTEMS/ipc.md | 4 |
| docs/PROPOSALS/series-planner-revival-charter.md | 4 |
| docs/RULES.md | 3 |
| docs/REFERENCE/schema.md | 3 |
| docs/PROPOSALS/refoundation-initiative.md | 3 |
| docs/PROPOSALS/bti-tester-summary.md | 3 |
| CLAUDE.md | 2 |
| docs/REFERENCE/release-smoke.md | 2 |
| docs/ANCHORS.md | 2 |
| docs/WORKSPACE-CANON.md | 1 |
| docs/SYSTEMS/series-planner.md | 1 |

*Generated from the ultracode sweep run wf_886fa69a-234 (raw structured findings:*
*`C:/Users/rossa/AppData/Local/Temp/claude/C--Projects-SermonForge/0e3b42e8-db58-42c5-b19c-d56195f76259/scratchpad/confirmed-findings.json`). Line numbers were verified during the sweep but re-verify before editing — docs move.*
