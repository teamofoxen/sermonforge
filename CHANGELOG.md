# SermonForge Changelog

---

## 2026-04-14 — docs: bring documentation and logging into alignment with current system

Targeted fixes from the 2026-04-14 full system audit. Documentation and a single
silent-catch site were out of alignment with the actual runtime after the OneDrive
removal (2026-04-13) and theology vector-search rollout. No logic or architectural
changes; one logging line added.

**`docs/SYSTEMS/database.md`**
- Runtime section rewritten for the dual-driver architecture (`sermonforge.db → sql.js`,
  `theology.db → better-sqlite3 + sqlite-vec`), including the `@electron/rebuild`
  note and `asarUnpack` pointer.
- Removed the outdated "Why keyword search instead of vector embeddings" paragraph.
- Added a "Theology Search (vector + FTS hybrid)" section describing `sqlite-vec`,
  `Xenova/all-MiniLM-L6-v2` local embeddings, FTS-first ranking, and FTS-only fallback.
- Storage Path section updated: both DBs live under `C:\SermonForge\data\`; OneDrive
  is used only for `LIBRARY_PATH` and user-chosen export backups.

**`docs/CORE.md`**
- Project Identity paragraph updated: application databases are local; OneDrive is
  optional and only relevant to sermon library files.

**`electron/main.js`**
- `theology_vec` probe: bare `catch (_) {}` replaced with
  `catch (e) { console.warn("[VECTOR] theology_vec probe failed:", e.message); ... }`.
  Control flow unchanged — `theologyVecAvailable = false` still runs; integrity
  errors now surface in logs instead of vanishing.
- `saveDb()` comment: removed the stale "OneDrive provides backup safety net"
  phrasing; now says "local storage."

**`README.md`**
- Database section replaced with the correct `C:\SermonForge\data\` paths for both
  DBs; states local-first storage with no OneDrive dependency.

**`src/components/Library.jsx`**
- Subtitle text: "indexed from your OneDrive library" → "indexed from your library"
  (string literal only; no logic change).

---

## 2026-04-14 — chore: move build output to C:\Projects\SermonForgeBuilds

Changed `directories.output` in `package.json` from `C:/SermonForge/builds` to
`C:/Projects/SermonForgeBuilds` — sibling of the project folder, easy to find,
not in AppData or OneDrive. Updated `docs/RULES.md` to match.

---

## 2026-04-14 — fix: match theology search result rendering to AI panel

Dashboard theology results now use `ReactMarkdown` inside `className="ai-markdown"`
and the same "Sources consulted: Author — *Work* · ..." inline attribution style
with a border-top separator. Removed `whiteSpace: pre-wrap` and the pill badges.

---

## 2026-04-14 — feat: theology search on dashboard

Added a standalone theology search widget to the Dashboard.

### What changed

**`src/components/Dashboard.jsx`**
- Imports `getTheologyStatus` and `searchTheologyLibrary` from `src/db/database.js`.
- On mount, checks theology availability and conditionally renders the search section.
- `handleTheologySearch`: calls `searchTheologyLibrary(query, 8)`, formats chunks, then
  calls `sendAIMessage` with the same isolated system prompt used in AIPanel's theology
  path — no sermon workflow context, no stage rules, no context tiers. The dashboard has
  no current sermon so isolation is total and intentional.
- `handleTheologyClear`: resets query, result, and conversation history.
- UI: search input (Enter key supported), Search/Clear buttons, result card with source
  attribution badges. Only renders when `theologyAvailable` is true.

### Context isolation rationale

The full sermon system prompt's MESSAGE CONTEXT RULES are designed for sermon prep stages
(they expect MPT/MPS and misbehave when absent). On the dashboard there is no sermon, so
the theology search uses only the stripped-down research prompt — same as when hits are
found in AIPanel. No context builder is invoked, no stage is passed, and no sermon fields
are included in the user message.

---

## 2026-04-14 — fix: log inner FTS failure during semantic search; deploy theology.db

Two changes to complete the theology search system:

1. **Silent catch removed** (`electron/main.js:1163`): The inner FTS sub-query inside the
   semantic search block had a bare `catch (_) {}` with no logging. Replaced with
   `catch (err) { console.warn(...) }` so failures surface in the log rather than
   disappearing silently. Control flow and fallback behavior are unchanged — if this
   FTS sub-query fails, semantic results still proceed as before.

2. **theology.db deployed to runtime path**: Diagnostic confirmed that `C:\SermonForge\data\`
   had never been created since the OneDrive migration (2026-04-13). theology.db existed only
   at `C:\Projects\SermonForge\theology.db` (dev source). Copied to
   `C:\SermonForge\data\theology.db` (519,266,304 bytes). The app now finds theology.db on
   startup and both FTS and vector search initialize correctly.

- `electron/main.js` — silent catch → console.warn

---

## 2026-04-13 — chore: remove OneDrive dependencies from all runtime paths

Project moved from OneDrive to `C:\Projects\SermonForge`. Updated all runtime file paths
to use a local `C:\SermonForge\` root; OneDrive is no longer required to run the app.

- **Database**: `C:\SermonForge\data\sermonforge.db` (previously `OneDrive\SermonForge\sermonforge.db` with fallback to `userData`)
- **Study Guides export**: `C:\SermonForge\exports\StudyGuides\`
- **Feedback export**: `C:\SermonForge\exports\Feedback\`
- **Build output**: `C:\SermonForge\builds\`
- `LIBRARY_PATH` (sermon file library) left unchanged — still points to `OneDrive\Ministry\Preaching\Sermon Library`

All data directories are created on first use via `mkdirSync({ recursive: true })`.

- `electron/main.js` — DB path, StudyGuides path, Feedback path
- `package.json` — electron-builder output directory

---

## 2026-04-13 — fix: theology search — FTS crash, silent fallback failure, system prompt isolation

Three fixes that together make theology search actually work end-to-end:

1. **Root cause fix — `snippet()` quote bug**: The FTS fallback used `""` (double quotes) for
   the snippet start/end markers. SQLite interprets double quotes as column identifiers, not
   string literals — causing "no such column: ''" and crashing every search that reached the
   FTS path. Changed to `''` (single quotes). This bug has been present since FTS was added
   and silently returned 0 results on every query.

2. **Semantic path failure now falls through to FTS**: Previously, any error in the vector/
   embedding path was caught by the outer try/catch and returned `[]`, bypassing FTS entirely.
   The semantic block is now wrapped in its own try/catch so failures fall through to the FTS
   fallback rather than short-circuiting the whole handler.

3. **Theology system prompt isolation**: When search hits are found, the full sermon workflow
   system prompt is no longer used. A stripped-down research prompt replaces it, and the user
   message contains only the source chunks + passage (if any) + question. The workflow prompt's
   MESSAGE CONTEXT RULES were causing refusals and burying source chunks under unrelated sermon
   context tiers.

- `electron/main.js` — snippet quote fix; semantic path try/catch
- `src/components/AIPanel.jsx` — theology path system prompt and message format

---

## 2026-04-13 — fix: theology search — FTS results rank first, limit raised to 8

Fixed a bug in the hybrid merge: semantic results were filling all slots before FTS
results could enter. FTS exact-phrase matches now rank first; semantic fills remaining
slots. Retrieval limit raised from 5 to 8 to give more room for both.

- `electron/main.js` — merge order inverted
- `src/components/AIPanel.jsx` — limit 5 → 8

---

## 2026-04-13 — fix: theology search — larger context budgets

Raised all theology context limits so chunks aren't truncated before reaching the model:

- `TIER_LIMITS.tier5`: 3000 → 8000 chars (total budget for library + theology in context)
- `TIER5_CHUNK_CAP`: 1200 → 2000 chars (per-chunk cap)
- `substr(t.text, 1, ...)` in search handler: 1200 → 2000 chars (matches cap)

- `src/utils/contextBuilder.js` — tier5 limit and chunk cap
- `electron/main.js` — search handler substr

---

## 2026-04-13 — fix: theology search — hybrid semantic+FTS, phrase spanning, longer chunks

Three fixes to theology search quality:

1. **Hybrid search**: When vector embeddings are available, FTS4 now runs alongside semantic search instead of being bypassed. Results are merged (semantic first, then FTS additions). FTS catches exact phrase matches the MiniLM vector model misses.

2. **Phrase spanning**: The implicit phrase detector now bridges stop-word gaps of up to 3 words. "Fear of the Lord" stays intact as a phrase query (`"fear of the lord"`) instead of fragmenting into `"fear" OR "lord"` and matching every passage that mentions "Lord."

3. **Text truncation**: Semantic path now returns `substr(t.text, 1, 1200)` (was 600), matching the context builder's `TIER5_CHUNK_CAP`. Avoids cutting off the substantive part of a chunk.

- `electron/main.js` — `theology-search` handler rewritten

---

## 2026-04-13 — fix: reset theology globals on app close

`window-all-closed` handler now resets `theologyDb`, `theologyVecAvailable`, and `theologyEmbedder` to `null`/`false` after closing theology.db. No-op on current Windows builds (process exits immediately), but eliminates latent stale-state risk if macOS support or window-relaunch is ever added.

- `electron/main.js` — added three reset lines after `theologyDb.close()`

---

## 2026-04-13 — feat: theology semantic search — better-sqlite3 + sqlite-vec + transformers.js

Replaced sql.js with better-sqlite3 for theology.db to enable sqlite-vec vector search extension. Theology search now uses semantic (vector) search when embeddings are available, with automatic fallback to FTS4 when not. The main sermonforge.db remains on sql.js — zero risk to the core app.

**Architecture:**
- theology.db loaded via better-sqlite3 (native, read-only) with sqlite-vec extension
- Vector embeddings stored in a `theology_vec` vec0 virtual table (384-dim, all-MiniLM-L6-v2)
- Query-time embedding via @xenova/transformers, lazy-loaded on first semantic search
- Automatic fallback to FTS4 if theology_vec has no embeddings or model fails to load

**Changes:**
- `electron/main.js` — theology loader rewritten for better-sqlite3 + sqlite-vec; `queryTheology()` simplified to `.all()` API; `ensureTheologyEmbedder()` added for lazy model loading; `theology-search` handler now prefers semantic search when vec0 is available; `theology-status` reports `semantic: true/false`
- `package.json` — added better-sqlite3, sqlite-vec, @xenova/transformers; `asarUnpack` updated for native modules
- `docs/CORE.md` — updated sql.js constraint to reflect dual-driver architecture
- `build_theology_vectors.js` — one-time script (run via `npx electron build_theology_vectors.js`) to embed all 160k theology chunks into theology_vec

**Setup:**
1. `npm install`
2. `npx @electron/rebuild -m node_modules/better-sqlite3`
3. `npx electron build_theology_vectors.js` (30–60 min, one-time)

---

## 2026-04-13 — fix: theology search relevance — AND semantics, larger pool, full-text scoring

Three root causes identified for "fear of the Lord" returning Confessions noise instead of doctrinal material:
1. OR semantics made "lord" a flood term — every chunk with "O Lord" qualified, filling the 20-candidate pool entirely from Vol 01
2. Candidate pool (limit × 4 = 20) too small — 651 Augustine chunks match "fear"+"lord"; FTS4's ranking exhausted Vol 01 before any other volume got a slot
3. Scoring on FTS4 snippet (50 tokens) — snippet centered on whichever "lord" hit FTS4 chose, not the "fear of the Lord" phrase; exact-phrase chunks scored below "O Lord" chunks

Fix: AND semantics (FTS4 space = AND, not " OR "), candidate pool raised to limit × 30, `substr(t.text, 1, 2000)` fetched alongside snippet and used for scoring only (snippet still sent to Claude). `full_text` stripped from returned results before leaving the handler.

**Changes:**
- `electron/main.js` — `theology-search` handler: OR → AND join, `limit * 4` → `limit * 30`, added `full_text` to SELECT for scoring, stripped from return

---

## 2026-04-13 — fix: theology chunks now reach Claude context at every step

`resolveIncludes()` only allowed theology at `REDEMPTIVE_THREAD` and `manuscript` steps. When the user toggled theology on from any other step, chunks were fetched and scored correctly but discarded by `buildTiers()` before reaching Claude.

Fix: `buildTiers()` now overrides `inc.theology = true` whenever `theologyChunks.length > 0`. The presence of chunks means the user explicitly enabled the theology toggle — that intent signal bypasses step gating. Also removed 4 debug `console.log` statements from `electron/main.js` and `AIPanel.jsx`.

**Changes:**
- `src/utils/contextBuilder.js` — theology toggle override in `buildTiers()`: `if (theologyChunks.length > 0) inc.theology = true`
- `electron/main.js` — removed 3 debug logs from `theology-search` handler
- `src/components/AIPanel.jsx` — removed 1 debug log from theology response path

---

## 2026-04-13 — fix: theology search — expand stop words to remove noise terms

Common question verbs and prepositions ("say", "does", "about", "tell", "know", "like", etc.) were passing the stop word filter and matching editorial/introductory preamble text, causing all 5 returned chunks to be from Vol 01 rather than spanning theologically relevant content. Expanded `buildFtsQuery` stop words to strip these terms.

**Changes:**
- `electron/main.js` — `buildFtsQuery` stop words list expanded with ~25 additional terms

---

## 2026-04-13 — fix: theology search — author filtering via SQL WHERE instead of FTS column filter

FTS4 column filters (`author:term`) silently return 0 rows when combined with OR expressions. Plain author-name terms in FTS MATCH return footnote references across other works, not actual author chunks. Fix: use a regular SQL `WHERE t.author = ?` clause on the joined theology table for author filtering, and FTS MATCH only for content terms.

**Changes:**
- `electron/main.js` — theology-search handler rewritten to two paths:
  - Author detected: `WHERE theology_fts MATCH [content terms] AND t.author = [author name]`
  - No author: `WHERE theology_fts MATCH [content terms]`
  - `THEOLOGY_AUTHORS` map now used to resolve keyword → display name for the SQL WHERE

---

## 2026-04-13 — fix: theology search — FTS4 alias incompatibility

FTS4 virtual tables do not support table aliases — `WHERE fts MATCH` and `snippet(fts, ...)` both throw "no such column". All references must use the literal table name.

**Changes:**
- `electron/main.js` — removed alias from `theology_fts` query; all references now use `theology_fts` directly (`FROM theology_fts`, `JOIN theology t ON theology_fts.rowid`, `WHERE theology_fts MATCH`, `snippet(theology_fts, ...)`)

---

## 2026-04-13 — fix: theology search — snippet() alias bug; add quote instruction

**Changes:**
- `electron/main.js` — fixed `snippet(theology_fts, ...)` → `snippet(fts, ...)` (alias must match) and `WHERE theology_fts MATCH` → `WHERE fts MATCH`; the previous form threw silently, returning empty results and suppressing source attribution
- `src/components/AIPanel.jsx` — when theology chunks are present, appends a quote instruction to the system prompt asking Claude to include at least one direct quotation with source attribution

---

## 2026-04-13 — feat: theology search — phrase detection, fetch-more rerank, source attribution

Three further improvements to theology search quality and transparency.

**Changes:**
- `electron/main.js`:
  - Phrase detection: user-quoted substrings extracted as FTS4 phrase terms; adjacent content-word pairs in the query also promoted to phrases (e.g. "total depravity")
  - Fetch-more rerank: fetches 4× the requested limit from FTS4, scores each candidate by term frequency across author + work + text_chunk in JS, returns the top `limit` results
  - `scoreTheologyChunk()` helper added above the handler
- `src/components/AIPanel.jsx`:
  - Theology path now deduplicates hits by author+work and attaches them as `sources` on the assistant message object
  - Sources rendered below each theology-backed response: "Sources consulted: Author — *Work* · …"

---

## 2026-04-13 — feat: theology search — stop words, snippet(), author detection

Three search quality improvements on top of the FTS4 index.

**Changes:**
- `electron/main.js` — `theology-search` handler updated:
  - Stop words stripped via existing `buildFtsQuery()` (no duplication)
  - Known author names detected in query and converted to `author:"name"` FTS4 column constraints; author keywords removed from general content terms so they don't pollute matching
  - `substr(t.text, 1, 600)` replaced with FTS4 `snippet()` — returns the most relevant excerpt (50 tokens) rather than always the first 600 chars
  - `THEOLOGY_AUTHORS` map added above handler — maps lowercase keywords to author values in theology.db

---

## 2026-04-13 — feat: theology search — FTS4 index + min term length fix

Replaced full-table LIKE scan with FTS4 full-text search for significantly faster theology queries. Short theological terms ("sin", "joy", "law", "God") now return results correctly.

**Changes:**
- `build_theology_fts.py` (new) — one-time script to add FTS4 virtual table (`theology_fts`) to `theology.db`; run once on the machine, not part of the app
- `electron/main.js` — `theology-search` handler rewritten to use `theology_fts MATCH` query joined back to `theology` table; minimum term length lowered from 4 to 3 characters; max terms raised from 6 to 8

---

## 2026-04-12 — fix: dashboard — exclude demo sermons from "Pick up where you left off"

Demo sermons no longer appear in the recent-sermons section on the dashboard.

**Changes:**
- `electron/main.js` — added `AND (sr.id IS NULL OR sr.id NOT LIKE 'demo-%')` to the `db-getRecentSermons` query

---

## 2026-04-12 — fix: design system — replace hardcoded hex colors in demo components

Maintenance fix following Phase 2–4 audit. All hardcoded hex values in demo components now reference CSS variables.

**Changes:**
- `src/styles/global.css` — added `--tier7`, `--tier7-pale`, `--sage-pale`, `--slate-pale`, `--crimson-pale` to `:root`; dark-mode counterparts added to `[data-theme="dark"]`
- `src/components/TierBadge.jsx` — replaced 5 hardcoded hex values (`#e8f0e7`, `#e4e9ef`, `#f5e4e4`, `#7b5ea7`, `#efe8f5`) with the new CSS variables
- `src/components/ContextPreview.jsx` — replaced `#7b5ea7` with `var(--tier7)`

---

## 2026-04-12 — feat: demo mode — phases 2, 3, 4

Added a full demo mode suite layered on top of the Phase 1 demo series seed.

**Phase 2 — Context awareness**
- `TierBadge` component: colour-coded pills (gold T1, sage T2, slate T3, crimson T4, purple T7, ghost "Series Only") appear on every field when demo mode is on; hover to read a plain-English description of that tier's role and budget
- Demo toggle button in SermonWorkspace and SeriesPlanner topbars
- Context completeness bar in SermonWorkspace: 5 tier dots (T1–T4, T7) show which tiers have content at a glance
- Pipeline map row in StudyTab showing which steps feed which tiers
- Tier 4 badge on Series Big Idea (Overview tab) and on `redemptive_context` / `series_motivation` (Book Study tab)
- "Series Only" badge on `book_background`, `book_argument`, `book_structure`, `emerging_big_idea` — fields excluded from per-sermon context

**Phase 3 — Context transparency**
- `ContextPreview` component: calls `buildContext()` client-side and renders each assembled tier section with its label, colour, and character count
- "Preview Context" toggle button in the AI panel header (only visible in demo mode)

**Phase 4 — Guided experience**
- `DemoSplash` modal: appears on first "See Demo" click, walks through the 4-step tour (Series Planner → Sermon Workspace → AI Panel → Study Guide); dismissible, stored in localStorage
- `DemoContext`: React context wrapping the full app, persists demo mode and splash-seen state to localStorage

**Changes:**
- `src/contexts/DemoContext.jsx` — new; demo mode state
- `src/components/TierBadge.jsx` — new; tier pill with tooltip
- `src/components/DemoSplash.jsx` — new; first-time splash modal
- `src/components/ContextPreview.jsx` — new; assembled context viewer
- `src/App.jsx` — wrapped with DemoProvider and DemoSplash
- `src/components/Dashboard.jsx` — calls enableDemoMode on See Demo click
- `src/components/SermonWorkspace.jsx` — demo toggle, completeness bar, T7 badge on PI card
- `src/components/StudyTab.jsx` — pipeline map row, T1 badges on MPT/MPS labels
- `src/components/SeriesPlanner.jsx` — demo toggle, T4/excluded badges on book study and overview fields
- `src/components/AIPanel.jsx` — Preview Context button and ContextPreview panel

---

## 2026-04-12 — feat: demo series seed ("See Demo" button)

Added a "See Demo" button to the dashboard header that seeds the database with a complete Sermon on the Mount series (6 sermons at varied stages: writing, outline, study, planning) and navigates directly to it. Idempotent — clicking again opens the existing demo series rather than duplicating it.

**Changes:**
- `electron/demoData.js` — new file; full Sermon on the Mount dataset (series + 6 sermons) with all fields populated: exegesis phases (JSON), outline with functional elements, manuscript excerpt, Pastoral Intelligence fields, study guide notes
- `electron/main.js` — added `db-loadDemoSeries` IPC handler; inserts demo data in a transaction, returns series ID
- `electron/preload.js` — exposed `loadDemoSeries` via contextBridge
- `src/db/database.js` — added `loadDemoSeries` wrapper export
- `src/components/Dashboard.jsx` — added "See Demo" button in page header; calls `loadDemoSeries()` then navigates to series

**Why:** To support showing the app to someone else with realistic, fully-populated content — so the full workflow (series planning through study guide) can be demonstrated without manually entering data. Phase 1 of a larger demo suite (Phases 2–4 will add context pipeline annotations, completeness indicators, and a guided tour).

---

## 2026-04-12 — Fix: show planning-stage sermons on dashboard

`getRecentSermons` was filtering out `stage = 'planning'` — a holdover from the old dashboard where planning-stage meant "not really started." New home screen should show all non-archived sermons regardless of stage.

**Changes:**
- `electron/main.js` — removed `AND s.stage != 'planning'` from `db-getRecentSermons` query

---

## 2026-04-12 — Dashboard redesign: app home screen as re-entry point

Replaced the dashboard's status-monitoring layout (Series Pipeline, Biblical Coverage) with a focused re-entry experience oriented around active work.

**Changes:**
- `src/components/Dashboard.jsx` — full rewrite: two sections ("Continue Series Planning" and "Continue Sermon Prep"), each with Reorient Me AI summaries; stage badges removed from cards; Biblical Coverage and Series Pipeline cards removed; empty state added
- `src/components/SermonWorkspace.jsx` — last active tab now persisted to localStorage per sermon (`sermonforge_sermon_tab_<id>`); restored on mount so Open takes you back to where you were
- `src/components/StudyTab.jsx` — last active step and subphase persisted to localStorage per sermon; lazy useState init so state is correct from first render

**Why:** Dashboard had no clear purpose as a monitoring tool (stock-ticker problem). Re-framed as "the app home screen that already knows why you're here" — orients the pastor back into active work rather than displaying aggregate statistics.

**Open feedback items remaining:** New Sermon Modal (remove Preacher/Stage; editable title).

---

## 2026-04-12 — Dark mode

Added full dark mode support with a sidebar toggle and localStorage persistence.

**Changes:**
- `src/styles/global.css` — added `--sidebar-bg` variable (decouples sidebar background
  from `--ink` so the sidebar stays dark in both themes); added `[data-theme="dark"]` block
  overriding all surface/text variables to a warm dark palette while preserving gold accents
- `src/App.jsx` — theme state initialised from `localStorage`, applied as `data-theme`
  on `<html>`, persists across sessions
- `src/components/Sidebar.jsx` — toggle button (☾ / ☀) in sidebar footer

**Open feedback items remaining:** New Sermon Modal (remove Preacher/Stage; editable title);
Dashboard redesign (3 items).

---

## 2026-04-09 — Modular documentation refactor

Replaced the monolithic `CLAUDE.md` (790 lines, loaded in full every session) with a
modular structure to reduce per-task token cost while preserving all constraints.

**Structure:**
- `CLAUDE.md` rewritten as a navigation pointer only — lists which files to load per task
  with "Also check" annotations for non-obvious cross-file dependencies
- `CLAUDE_original.md` — original monolithic file retained for historical reference
- `docs/CORE.md` — authority, project identity, non-negotiable architectural boundaries,
  absolute invariants; always loaded; kept under 2k tokens
- `docs/RULES.md` — development rules, guardrails, design system, git workflow
- `docs/SYSTEMS/context-pipeline.md` — 7-tier context assembly pipeline
- `docs/SYSTEMS/ai-panel.md` — AI panel behavior, system prompt assembly, Tune-Up Engine
- `docs/SYSTEMS/series-planner.md` — Series Planner tabs, Study Guide export, calendar engine
- `docs/SYSTEMS/sermon-workspace.md` — Study tab structure, Pastoral Intelligence card, save flow
- `docs/SYSTEMS/database.md` — sql.js, migrations, debounces, SERMON_COLUMNS
- `docs/SYSTEMS/ipc.md` — IPC architecture, boundaries, channel naming
- `docs/REFERENCE/schema.md` — full database table definitions
- `docs/REFERENCE/ipc-channels.md` — all IPC channel specifications
- `docs/REFERENCE/project-structure.md` — file tree, tech stack, environment paths

**Cross-system dependency guards** added in CLAUDE.md pointer table and as "Cross-System
Dependencies" sections in `context-pipeline.md`, `database.md`, and `sermon-workspace.md`
to mitigate the risk of loading the right file but missing a constraint in another.

**Corrections made during refactor:**
- `database.md` and CLAUDE.md now correctly describe `buildUpdate()` as throwing in dev /
  warning in prod for unknown fields — the previous description ("silent failure") was wrong.
- `docs/` removed from `.gitignore` (was previously excluded as a scratch directory).

No code files changed.

---

## 2026-04-09 — Remove Logos integration; documentation consolidation

Two related cleanups: the Logos integration was removed from the entire project, and
the documentation set was consolidated from six markdown files down to three.

**Logos removal.** The `logos4://` URL approach never navigated to the correct passage
(root cause never determined), and the 2026-03-29 workaround was only copying the passage
to the clipboard — a feature the OS already provides. The integration had become more
noise than value. Removed:

- `electron/main.js` — `open-logos` IPC handler, `buildLogosUrl()`, `BOOK_ABBREVS`,
  unused `generateId()` helper, `shell` from the Electron import
- `electron/preload.js` — `openInLogos` contextBridge exposure
- `src/db/database.js` — `openInLogos` wrapper export
- `src/components/SermonWorkspace.jsx` — import, `logosCopied` state, `handleOpenLogos`
  handler, "Open in Logos" button, clickable-passage click handler
- `src/styles/global.css` — `.topbar-series .passage-ref` cursor/hover styles (passage
  reference is now static text, not a button)
- `README.md` — `LOGOS_DATA_DIR` env var, Logos Integration feature bullet
- `CLAUDE.md` — project overview bullet, `LOGOS_DATA_DIR` env var, "Logos URL builder"
  mention in project structure, `open-logos` IPC channel documentation, KNOWN ISSUES #1

CHANGELOG history mentioning Logos is retained (historical record).

**Documentation consolidation.** The project had six markdown files (CLAUDE, CHANGELOG,
DECISIONS, FUTURE, PRIORITIES, README) with overlapping and unclear roles. Several had
become ad-hoc dumping grounds — decisions with no condition for when they became stale,
deferred improvements with no trigger to surface them, a priorities list nobody read.

- **Deleted `DECISIONS.md`** (was 16 ADRs). Load-bearing constraints were folded inline
  into CLAUDE.md where they get read every session: sql.js environment constraint in
  TECH STACK, FTS rationale in DATABASE SCHEMA, 500ms debounce + localStorage fragility
  notes in GUARDRAILS, ESM/CJS boundary as DEVELOPMENT RULE #11, build automation as
  DEVELOPMENT RULE #10.
- **Deleted `FUTURE.md`** (was 8 deferred-improvement entries). Nothing surfaced these
  entries — they were bridges to cross if/when encountered. Deleting them removes the
  maintenance burden without losing anything actionable.
- **Deleted `PRIORITIES.md`** (created earlier in the same session by extracting NEXT
  PRIORITIES out of CLAUDE.md, then deleted when it became clear it had no purpose
  beyond duplicating what's already tracked in CLAUDE.md's own NEXT PRIORITIES section).
- **Updated CLAUDE.md header** to reference only CLAUDE.md + CHANGELOG.md as required
  session reading.

Remaining documentation: CLAUDE.md (project bible, source of truth), CHANGELOG.md
(historical record), README.md (setup + launch).

---

## 2026-04-09 — PassagePopup: draggable, resizable; subtitle no longer sticks

- Popup is now draggable by its header bar and resizable from the bottom-right corner
  (`resize: both` on the container; drag tracked via mousedown/mousemove on the header).
  This makes popup placement irrelevant — the pastor can move it wherever works.
- Phase hint subtitles ("Observe the text…" etc.) moved out of the sticky div into normal
  flow above it. The sticky div now contains only the Show Text button, aligned right.
- Popup initial position logic retained from prior fix (above when natural, below when sticky).

## 2026-04-09 — Fix PassagePopup regression: popup showing below instead of above

Root cause: the PI card auto-collapse (introduced in ba6b132) shortened the card's height,
which moved the Show Text button's natural (non-sticky) position up by ~140px. The original
`topAbove >= 16` threshold in PassagePopup required 420px of clear space above the button —
met with an expanded PI card (~360px natural Y) but not with a collapsed one (~200px natural Y).

Fix: replaced the fixed threshold with a sticky-detection heuristic. If `rect.top < 120`,
the button is in its sticky position (no room above) — show the popup below. Otherwise the
button is in natural position — show the popup above, using available space dynamically
(`maxH = min(wantedH, rect.top - 10)`). This restores above-the-button placement at natural
position regardless of PI card height, and gracefully falls back to below when sticky.

---

## 2026-04-08 — Cross-build integration audit (4 builds)

Audited the seams between four recent builds: exegesis worksheets, passage popup,
PI card collapse, and react-markdown rendering. Five audit areas checked.

**Results:**
1. **StudyTab state isolation (builds 1+2):** CLEAN — `passageAnchor` state is fully
   independent of worksheet `useMemo` data. Phase-advance summaries use separate state.
2. **Context pipeline (builds 1+3):** CLEAN — `flattenExegesis()` output capped by
   `trimStr()` in `buildTiers()`. PI collapse is display-only; tier 7 reads sermon data
   directly, unaffected by UI state.
3. **AIPanel dead code integrity (build 4):** CLEAN — all 4 dead code items from
   FUTURE.md Entry 7 intact and unmodified. No new dead code from react-markdown or
   scroll changes (`latestAssistantRef`, `prevCountRef`, `messagesEndRef` all active).
4. **CLAUDE.md documentation gaps:** 5 corrections applied (see below).
5. **Build verification:** `npx vite build` passes clean (224 modules, 0 warnings).

**Corrections made:**
- **Guardrail violation fixed:** `PassagePopup.jsx` called `window.electronAPI.fetchPassage()`
  directly. Added `fetchPassage` wrapper to `src/db/database.js` and updated the component
  to import from the wrapper.
- **CLAUDE.md IPC CHANNELS:** Added `passage-fetch` channel documentation.
- **CLAUDE.md PROJECT STRUCTURE:** Added `PassagePopup.jsx` and `contextSchema.js`.
- **CLAUDE.md PASTORAL INTELLIGENCE:** Updated to document collapsible card behavior
  (auto-collapses when fields have content, expand on click, UI-only).
- **CLAUDE.md STUDY TAB STRUCTURE:** Added "Show Text" button documentation.

**Files changed:** `src/db/database.js`, `src/components/PassagePopup.jsx`, `CLAUDE.md`.

---

## 2026-04-08 — Show Text: 3-translation passage viewer in Study tab

**What changed:**
- New "Show Text" button appears above the worksheet in each of the four exegesis phases
  (Observe, Interpret, Redemptive Thread, Implications). Hover to open; stays open until
  click-outside or ✕.
- Opens a floating 3-column popup (ESV | NIV | The Message) showing the sermon passage.
  Rendered via React portal so it escapes overflow constraints of the content area.
- New `passage-fetch` IPC channel in `electron/main.js` handles all API calls server-side
  (API keys never reach the renderer).
  - NIV and The Message fetched from API.Bible (`BIBLE_API_KEY`).
  - ESV fetched from Crossway ESV API (`ESV_API_KEY`) — shows a config note in the ESV
    column until the key is added.
  - OSIS passage ID parser handles all common sermon passage formats
    (single verse, range, cross-chapter range, whole chapter).
  - In-memory cache per session avoids redundant API calls.
- New `PassagePopup.jsx` component — positioned with `position: fixed`, auto-flips above
  the anchor if there's insufficient room below.
- New CSS in `global.css`: `.passage-popup`, `.passage-column`, `.show-text-btn`.

**Files changed:** `electron/main.js`, `electron/preload.js`,
`src/components/PassagePopup.jsx` (new), `src/components/StudyTab.jsx`,
`src/styles/global.css`.

**Config:** Requires `BIBLE_API_KEY` in `.env` (API.Bible). ESV column activates once
`ESV_API_KEY` is added (Crossway ESV API).

---

## 2026-04-08 — Auto-expanding textareas; consolidate autoResize utility

**What changed:**
- `autoResize` (grow textarea to fit content, capped at 60vh) extracted from per-file
  local definitions into a shared export in `src/utils.js`. Removes duplication across
  `StudyTab.jsx`, `DeliveryTab.jsx`, and `SeriesPlanner.jsx`.
- `autoResize` wired to three previously-fixed Pastoral Intelligence textareas in
  `SermonWorkspace.jsx` (topic_theme, audience_assumptions, background_noise). Reduced
  initial height from `rows={2}` to `rows={1}` — they now start compact and grow as
  content is added.
- `autoResize` wired to the AI chat input in `AIPanel.jsx` (`rows={2}` → `rows={1}`).
- `autoResize` wired to the chat input in `SeriesPlanner.jsx` `AIChatPanel`
  (`rows={3}` → `rows={2}`).

**Why:** Input boxes felt too constraining for real work (user feedback 2026-04-05).
Auto-resize lets each field start small and expand naturally without truncating content.

---

## 2026-04-08 — Audit: structured worksheet feature (3 fixes)

Audited the structured exegesis worksheet feature. Three corrections made:

1. **Unprotected JSON.parse in AIPanel.jsx** — The library search keyword
   extraction parsed `sermon.observations` with bare `JSON.parse()`. If
   the string started with `{` but was malformed, this would throw and crash
   the search flow. Wrapped in try/catch per guardrail rules.

2. **Unused `fieldDefs` parameter in `updateStructured`** — The callback
   accepted a `fieldDefs` argument that was never used. Removed the parameter
   and cleaned all 8 call sites. This also eliminated unnecessary array
   allocations (`[...IMPLICATIONS_THEOLOGICAL, ...IMPLICATIONS_PERSONAL]`)
   on every keystroke in Phase 4.

3. **Unrelated changes snuck into contextBuilder.js** — Three modifications
   that were not part of the worksheet feature were reverted:
   (a) `"delivery"` case was moved out of the default fallback and given
   tier2/tier3/tier4 — this broke the test expectation. Reverted to original
   position in the default/fallback group.
   (b) Tier7 pastoral budget trimming was changed to newline-aware truncation.
   Reverted to original `slice(0, PASTORAL_BUDGET)` behavior.
   (c) Fallback context section label was changed from `"[PASSAGE & MPT]"`
   to `CONTEXT_SECTIONS.PASSAGE`. Reverted to hardcoded string.

**Verified:** Schema version still 7 (no migration added). All 91 tests pass.
Build clean with no warnings. All AI calls go through `sendAIMessage`. No
`window.electronAPI` in StudyTab. No raw SQL in renderer. No new hex values
or font names in CSS — only existing CSS variables.

**Files changed:** `src/components/AIPanel.jsx` (try/catch fix),
`src/components/StudyTab.jsx` (remove unused param from 8 call sites),
`src/utils/contextBuilder.js` (revert 3 unrelated changes).

---

## 2026-04-08 — Structured exegesis worksheets: per-question fields for all 4 study phases

Replaced the single textarea per phase in the Study tab with structured worksheets
where each question from the sermon prep guide gets its own labeled field. The pastor
can now work through each question individually rather than dumping everything into
one text block.

**Phase 1 (Observe):** 9 fields — context, divisions, commands, statements, characters,
big ideas, obvious point, basic outline, possible applications.

**Phase 2 (Interpret):** 9 fields — context impact, recurring ideas, characters,
contrasts, diagram/relationships, cross-references, commentary notes, summarize parts,
summarize whole.

**Phase 3 (Redemptive Thread):** 7 question fields + AI "Synthesize" button that
compiles all answers into a cohesive redemptive features summary.

**Phase 4 (Implications):** 3 grouped sections (Theological Significance: 5 fields,
Personal Application: 8 fields, Unbeliever implications: 1 field) + AI "Compile"
button that produces a consolidated implications list.

**Storage:** Each phase stores structured data as JSON in the existing column
(observations, interpretation, redemptive_thread, implications). No schema migration
needed. Legacy plain-text content is preserved under a "legacy_notes" key and displayed
at the top of the phase when present.

**Context pipeline:** `summarizeExegesis()` in contextBuilder.js now detects structured
JSON and flattens it to readable text via `flattenExegesis()` from the new
`studyFields.js` utility module. The AI context pipeline receives clean text regardless
of storage format.

**AI integration:** All "Review" buttons, summary generation between phases, and
MPT/MPS drafting now assemble structured field content with labels for richer AI context.
Phase 3 "Synthesize" and Phase 4 "Compile" buttons use sendAIMessage to auto-generate
summary fields from the pastor's individual answers.

**Files changed:** `src/components/StudyTab.jsx` (restructured all 4 phases),
`src/utils/studyFields.js` (new — field definitions, parse/serialize/flatten helpers),
`src/utils/contextBuilder.js` (structured JSON detection in summarizeExegesis),
`src/components/AIPanel.jsx` (handle JSON observations in library search),
`src/components/Dashboard.jsx` (use flattenExegesis for reorientation summary),
`src/styles/global.css` (worksheet CSS classes).

---

## 2026-04-08 — Render AI responses as formatted markdown; fix scroll position; fix sidebar New Sermon flow

AI panel responses were displaying raw markdown symbols (**, ##, -, etc.) as
plain text, making them visually noisy and hard to scan.

Added `react-markdown` dependency and wrapped assistant messages in a
`<ReactMarkdown>` component. User messages remain plain text (pre-wrap).

New `.ai-markdown` CSS rules in `global.css` style headings (Playfair Display),
body text (Crimson Pro), lists, blockquotes, inline code, and code blocks —
all scoped to the AI panel and consistent with the existing design system.

Fixed AI panel scroll behavior: previously, when a new response arrived the
panel scrolled to the very bottom, forcing the pastor to scroll back up to
start reading. Now, when an assistant message arrives the panel scrolls to the
*top* of that message. User messages and the loading indicator still scroll to
the bottom as before.

Fixed Sidebar "+ New Sermon" flow: previously it created an empty sermon record
immediately and opened the workspace, bypassing `NewSermonModal`. Now it opens
the same modal used by Dashboard and SermonList, so the pastor can enter passage,
date, and series before the record is created. Removed the unused `createSermon`
import from Sidebar.

**Files changed:** `src/components/AIPanel.jsx`, `src/styles/global.css`,
`src/components/Sidebar.jsx`, `package.json` (new dep: `react-markdown`).

### Post-change sanity check (verified, no corrections needed)

Audited all three changes against CLAUDE.md, DECISIONS.md, and the codebase:

1. **ReactMarkdown** — confirmed applied only to `msg.role === "assistant"` messages.
   User messages render as plain text with `whiteSpace: "pre-wrap"`. `CopyButton`
   receives `msg.content` (raw string), not rendered HTML — clipboard copies are clean.

2. **`.ai-markdown` CSS** — all values reference existing CSS variables (`--ink`,
   `--ink-ghost`, `--ink-soft`, `--gold-pale`, `--parchment-warm`, `--parchment-deep`,
   `--radius`) and approved fonts (`Crimson Pro`, `Playfair Display`, `JetBrains Mono`).
   No new hex values or font names introduced.

3. **Scroll logic** — `prevCountRef` tracks message count across renders. On send:
   user message appended → `messages.length > prevCount` but `lastMsg.role === "user"`
   → falls through to `messagesEndRef` (bottom scroll, shows loading dots). On response:
   assistant message appended → `messages.length > prevCount` and
   `lastMsg.role === "assistant"` → scrolls to `latestAssistantRef` (top of response).
   `clearHistory()` resets messages to `[]`, effect returns early, `prevCountRef` resets
   to 0. Fresh conversations start clean. The ref is stable: `isLastAssistant` is
   computed per render and always points to the correct DOM node.

4. **Sidebar modal** — `NewSermonModal` wiring (`onClose`, `onCreated`) is identical to
   Dashboard and SermonList. `createSermon` import fully removed from Sidebar — no
   dangling references. `handleNewSermon` closes the dropdown and opens the modal.

5. **Build** — `vite build` passes with no errors or warnings.

---

## 2026-04-07 — IPC layer and database boundary audit fixes

Five surgical fixes from a deep audit of the IPC layer and database boundary
(`electron/main.js`, `electron/ai.js`). No new features, no schema changes.

### Fix 1 — db-updateSection no longer silently succeeds on rejected fields

`electron/main.js`

`db-updateSection` returned `undefined` (indistinguishable from success) when
`buildUpdate` returned null because all fields were rejected. Added the same
log-and-return pattern used by `db-updateSermon` and `db-updateSeries`: logs the
error and returns `{ error, attempted }` so callers can distinguish failure from
a successful no-op write.

### Fix 2 — db-deleteLibraryItem wrapped in a transaction

`electron/main.js`

The handler performed two separate `db.run()` calls (DELETE from library, DELETE
from library_fts) with no transaction. If the second delete threw, the library
row would be gone but its FTS entry orphaned — causing phantom search hits. Now
wrapped in BEGIN/COMMIT/ROLLBACK, consistent with `db-deleteSeries` and
`db-deleteSection`.

### Fix 3 — ai.js response.content[0].text now guarded

`electron/ai.js`

Replaced bare `return response.content[0].text` with optional chaining. If the
Anthropic SDK ever returns an empty content array or a non-text block, the
handler now logs a diagnostic error and returns a user-readable string rather
than crashing with an unhelpful TypeError.

### Fix 4 — FTS rebuild loop now logs failed inserts

`electron/main.js`

The empty `catch (_) {}` in the FTS index rebuild loop (run on startup when the
index is missing) has been replaced with a `console.warn` that includes the
row id and error message. A library item that fails to index is now visible in
the log rather than silently invisible to search.

### Fix 5 — Library import saves every 50 files

`electron/main.js`

`library-import` previously called `saveDb()` once at the end of the loop. For
large imports (374+ files), a crash mid-loop would lose all progress. A periodic
`saveDb()` every 50 files limits the crash window to 50 files rather than the
entire import.

### Documentation — CLAUDE.md IPC CHANNELS section completed

`CLAUDE.md`

Added eight previously undocumented but fully-working IPC channels to the
IPC CHANNELS section: `db-deleteLibraryItem`, `db-getRecentSermons`,
`db-getSchemaVersion`, `app-get-version`, `feedback-submit`, `theology-status`,
`theology-search`, `theology-get-chunks`. All have matching handler/preload pairs.

---

## 2026-04-07 — Context pipeline audit fixes (two more findings)

Two further surgical fixes from the 2026-04-07 audit of the context pipeline.

### Fix 1 — Delivery tab now has full sermon context

`src/utils/contextBuilder.js`

`resolveIncludes` previously mapped `"delivery"` to the same tier1-only return as unknown
steps (it was a fall-through into the `default` branch). The delivery tab's AI had no
knowledge of the MPS, outline, series context, or pastoral intelligence — only passage and
MPT — making delivery coaching significantly less useful.

Added an explicit `"delivery"` case returning `{ tier2: true, tier3: true, tier4: true,
library: false, theology: false, memory: true, pastoralContext: true }`. The delivery tab
now receives the same structural context as the outline and manuscript tabs (minus library
and theology sources, which are not relevant at that stage). `"delivery"` removed from the
`STEPS.EXEGESIS` / `"study"` / `default` fall-through.

### Fix 2 — Pastoral intelligence tier truncates at field boundaries

`src/utils/contextBuilder.js`

The tier7 800-char shared budget was enforced as `joined.slice(0, 800).trimEnd()`, which
could cut mid-word or mid-sentence inside a field. When two or three fields together exceed
800 chars, the last field would appear truncated in the AI prompt.

Replaced with newline-boundary truncation: find the last `\n` before the 800-char cut
point and break there, so only complete fields are included. If no newline exists before
the cut point (single very long field), the hard slice is used as a fallback. This is the
same pattern used by `buildMemoryContext` for its 650-char cap.

---

## 2026-04-07 — Context pipeline audit fixes (three findings)

Three surgical fixes from the 2026-04-07 audit of the context pipeline.

### Fix 1 — Generate handlers no longer overwrite fields on API failure

`src/components/SeriesPlanner.jsx` and `src/components/StudyTab.jsx`

`sendAIMessage` returns `''` on all failure paths (network error, null response, IPC
failure). Seven "generate" and "draft" handlers previously called `onChange(field, resp.trim())`
unconditionally — if `resp` was `''`, the existing field content was silently overwritten
with empty string and the debounced save persisted the empty value to the database.

All seven sites now guard the write: `if (resp?.trim()) onChange(field, resp.trim())`.
Affected handlers: `SeriesPlanner.generateBigIdea`, `generateOverview`, `generateOutline`,
`handleDraftBigIdea`; `StudyTab.generateMPT`, `generateMPS`, `generateBigIdea`.

### Fix 2 — Library search falls back gracefully at all gated steps

`src/components/AIPanel.jsx`

`handleLibrarySearch` had an early-return guard for `PHASES.OBSERVE` and `PHASES.INTERPRET`
only. All other steps except `"manuscript"` also have `library: false` in `resolveIncludes`,
meaning the search would run (IPC round-trip + ranking) but the results would be silently
discarded by `buildContext`. The "Search My Library" button implied it used the library but
didn't.

The guard now covers all library-gated steps: `PHASES.REDEMPTIVE_THREAD`,
`PHASES.IMPLICATIONS`, `STEPS.MPT_MPS`, `STEPS.OUTLINE`, `STEPS.FUNCTIONAL_ELEMENTS`.
Each has a step-specific fallback `promptAction` in the guard. The redundant
`REDEMPTIVE_THREAD` and `IMPLICATIONS` overrides below the guard were removed.

### Fix 3 — Fallback path in buildContext uses CONTEXT_SECTIONS constant

`src/utils/contextBuilder.js`

The `buildContext` fallback (reached when assembled context is < 50 chars) used the string
literal `[PASSAGE & MPT]` rather than `CONTEXT_SECTIONS.PASSAGE`. This violated the
invariant from FUTURE.md Entry 2 (completed 2026-04-04): section labels must not appear as
string literals in either `contextBuilder.js` or `AIPanel.jsx`. Fixed.

FUTURE.md Entry 8 updated to document the data-loss dimension of the generate/draft handler
pattern and to record that Fix 1 resolves the sub-pattern.

---

## 2026-04-06 — UX restructuring: inline AI responses, AI drawer, auto-expand textareas, rich placeholders, draft buttons

Five-part UX overhaul across SeriesPlanner, SermonWorkspace, StudyTab, and all supporting tabs. Goal: move AI output closer to the field that triggered it, reduce panel overhead for inline analysis, and replace generic placeholder copy with instructional guidance.

### Part 1 — Inline AI responses (new component)

**`src/components/InlineAIResponse.jsx`** (new file). Shared component that renders directly below a field when AI analysis is triggered. Features: parchment-warm background, 3px gold left border, "AI · [field name]" label, Crimson Pro italic response text, Copy + Dismiss actions bottom-right, fade + upward-translate entry animation.

**`src/styles/global.css`** — appended styles: `@keyframes inlineAIFadeIn`, `.inline-ai-response`, `.inline-ai-label`, `.inline-ai-text`, `.inline-ai-actions`, `.inline-ai-copy`, `.inline-ai-dismiss`.

**`src/components/StudyTab.jsx`** — all Review/Challenge/Analyze buttons now produce inline responses below their respective fields via direct `sendAIMessage` calls. Removed all `onAI` calls from these buttons. New state: `inlineResponses` (keyed object), `inlineLoading` (string key or null). New function: `fetchInline(key, prompt, system)` handles the async call and state updates. `dismissInline(key)` clears a response.

**`src/components/SeriesPlanner.jsx`** — `BookStudyTab.handleAnalyze()` decoupled from `aiMessages` state; now writes only to `inlineResponses`. Each Book Study field renders `<InlineAIResponse>` beneath it. `SlotRow.handleAssist()` likewise calls `sendAIMessage` directly and sets local `assistResponse` state; `<InlineAIResponse>` rendered below the study_guide_note field.

### Part 2 — AI panel becomes on-demand chat drawer

**`src/components/SermonWorkspace.jsx`** — added `drawerOpen` state. "Chat with AI" `btn-ghost btn-sm` button added to topbar. AIPanel removed from `workspace-body` flex layout; now rendered as a fixed `ai-drawer` overlay at Fragment level. `handleAI(prompt, systemPrompt, options)` accepts `options.openDrawer` to programmatically open the drawer. `onOpenDrawer` prop passed to ManuscriptTab.

**`src/components/ManuscriptTab.jsx`** — added `onOpenDrawer` prop. `runTuneUp()` calls `onOpenDrawer?.()` before `onAI()` so the Tune-Up Engine output always opens the drawer.

**`src/components/SeriesPlanner.jsx`** — added `drawerOpen` state. "Chat with AI" button added to topbar. All five tab components (BookStudyTab, OverviewTab, StructureTab, SlotsTab, CalendarTab) receive `drawerOpen`, `onOpenDrawer`, `onCloseDrawer` props. Each tab renders the `AIChatPanel` as a conditional fixed `ai-drawer` overlay. Layout changed from CSS grid with `340px` right column to Fragment + full-width content div + overlay drawer.

**`src/styles/global.css`** — appended: `.ai-drawer`, `.ai-drawer.open` (slide-in transition), `.ai-drawer-close-bar`, `.ai-drawer-close-btn`, `.ai-drawer .ai-panel` (width override), `.ai-drawer .aichat-panel`.

### Part 3 — Auto-expanding textareas

Module-level `autoResize(el)` helper added to StudyTab.jsx, SeriesPlanner.jsx, and DeliveryTab.jsx. Sets `style.height = "auto"` then `style.height = Math.min(el.scrollHeight, window.innerHeight * 0.6) + "px"`. Applied via `rows={3}` + `onInput` handler + `ref` callback on all long-form textareas.

`max-height: 60vh` added to `.field-textarea` in global.css as a CSS-side companion constraint.

Fields updated: all six Book Study textareas, series overview, section overview, study_guide_note, all four Exegesis phase fields, timing_notes, post_sermon, delivery_notes.

Manuscript textarea excluded — uses its own `minHeight: calc(100vh - 280px)` / `resize: vertical` sizing appropriate for a large editor.

### Part 4 — Rich placeholder text

All generic "Enter…" or "Type…" placeholders replaced with specific instructional copy. Fields updated:

- Book Study: six fields — each placeholder describes what to put there and why
- Exegesis (Observe, Interpret, Redemptive Thread, Implications): specific methodological prompts
- MPT / MPS: format and purpose reminders
- Sermon Big Idea: relationship to MPT/MPS
- Series Overview / Big Idea: framing guidance
- Section overview: scope note
- Study Guide Note: congregational orientation prompt
- Outline points (OutlineBuilder): "state a single clear claim that flows from the text"
- Functional Elements (Explanation, Application, Illustration per point)
- Delivery: Timing Notes, Post-Sermon Reflection, Delivery Notes

### Part 5 — AI Draft buttons for structured output fields

**StudyTab.jsx** — three new draft-generation functions:
- `generateMPT()`: drafts MPT from passage + observations when either is present. "Draft →" button shown next to MPT label.
- `generateMPS()`: drafts MPS from MPT when MPT has content. "Draft →" button shown next to MPS label.
- `generateBigIdea()`: drafts sermon big idea from MPT + MPS. Sermon Big Idea card shown when either MPT or MPS has content.

**SeriesPlanner.jsx (BookStudyTab)** — `generateWorkingBigIdea()`: drafts emerging_big_idea from passage range, series title, and all other populated Book Study fields. "Draft →" button shown on the Working Big Idea field when series.passage_range or series.title is present.

Draft state managed via `draftLoading` string (field key or null) in each component. Drafts call `sendAIMessage` directly and write result to the field via `onUpdate`.

---

## 2026-04-06 — SeriesPlanner UX: default tab, scroll isolation, copy button, SVG update

### src/components/SeriesPlanner.jsx

**Default tab changed to Book Study.** `activeTab` initializes to `"book-study"` instead
of `"overview"`. On `seriesId` change, the saved tab is restored from localStorage keyed
by `sermonforge_planner_tab_${seriesId}`. On tab change, `handleTabChange()` persists the
selection to localStorage so each series remembers where the pastor left off.

**Scroll isolation.** The tab content wrapper changed from `overflow: "auto"` to
`overflow: "hidden"`. Each tab component already uses `height: "100%"` with its own
`overflowY: "auto"` left panel and AIChatPanel managing its own scroll independently.
This ensures neither panel's scroll bleeds into the other.

**Copy button on AI messages (AIChatPanel).** A `CopyButton` component added above
`AIChatPanel`. Assistant messages now render with `position: "relative"` and a
`class="aichat-msg-assistant"` so the CSS hover rule reveals the copy button. Shows
"Copy" by default, "✓ Copied" for 2 seconds after click via `navigator.clipboard`.

**"How this works" SVG updated.** Book Study added as the first column (before Overview).
ViewBox widened from `0 0 860 228` to `0 0 1080 228`. All original columns shifted right
by 220px. Book Study has 4 sub-items: Redemptive Context, Book Background, Argument &
Structure, Working Big Idea. Intro text updated: "four planning stages" → "five planning
stages".

### src/components/AIPanel.jsx

**Copy button on AI messages.** A `CopyButton` component added above
`captureResponsePatterns`. Assistant message divs now render with `position: "relative"`.
CopyButton appears on hover, uses `navigator.clipboard.writeText`, shows "✓ Copied" for
2 seconds then resets.

### src/styles/global.css

Added `.ai-copy-btn` rule: absolutely positioned bottom-right of the message bubble,
`opacity: 0`, transitions to `opacity: 1` on parent hover via two rules:
`.ai-message.assistant:hover .ai-copy-btn` (for AIPanel) and
`.aichat-msg-assistant:hover .ai-copy-btn` (for SeriesPlanner AIChatPanel).
`pointer-events` toggled in parallel so the hidden button is not clickable.

---

## 2026-04-05 — Feedback system: sidebar link, modal, and file writer

### src/components/FeedbackModal.jsx (new file)
Modal with a structured feedback form. Primary category dropdown controls which
secondary fields appear:
- **Bug** — "What were you doing?" + "What did you expect?"
- **UI/UX** — part-of-app dropdown + freeform "What felt wrong?"
- **AI Quality** — step dropdown + response-problem dropdown + optional notes
- **Missing Feature** — workflow location + feature description
- **Content/Copy** — "Where is the text?" + "What should it say?"

Auto-captures current view, schema version, and app version on mount via
`getSchemaVersion()` and `getAppVersion()` in parallel (falls back to "unknown"
on error). On submit, calls `submitFeedback(payload)` via IPC. Shows
"Feedback saved — thank you." in var(--sage) and closes after 1500ms on success.
Shows error in var(--crimson-soft) and re-enables the button on failure.

### src/components/Sidebar.jsx
Added `showFeedback` state. Added "Send feedback" text button in the sidebar
footer below "SermonForge v1.0" — Crimson Pro, var(--ink-ghost), 12px, subtle.
Renders `<FeedbackModal>` when `showFeedback` is true, passing `currentView` prop.
`currentView` was already passed to Sidebar from App.jsx — no App changes needed.

### electron/main.js
Three new IPC handlers:
- `db-getSchemaVersion` — reads `schema_version` from the meta table, returns
  `{ version: string }`
- `app-get-version` — returns `{ version: app.getVersion() }`
- `feedback-submit` — assembles a markdown file with YAML-style frontmatter
  (Date, Type, View, Schema, App) and labeled body sections; saves to
  `~/OneDrive/SermonForge/Feedback/YYYY-MM-DD-HH-MM-category.md`; creates the
  Feedback directory if absent; returns `{ success, filepath }` or
  `{ success: false, error }`

### electron/preload.js
Exposed `getSchemaVersion`, `getAppVersion`, and `submitFeedback` on
`window.electronAPI`.

### src/db/database.js
Added `getSchemaVersion`, `getAppVersion`, and `submitFeedback` wrapper exports.

---

## 2026-04-05 — BookStudyTab: editable title in identity header

### src/components/SeriesPlanner.jsx

The series title in the BookStudyTab identity header is now an editable input field
(Playfair Display, 18px) wired to `onChange("title", ...)` — the same save path as the
title field in Overview. Pastors can enter the book/series name from Book Study without
switching tabs. Blank state placeholder changed from "Untitled Series" to "Series Text".

## 2026-04-05 — BookStudyTab: identity header bar and prompt context prefix

### src/components/SeriesPlanner.jsx

**Read-only identity header bar** added at the top of the BookStudyTab left panel,
above the six fields. Displays:
- Series title in Playfair Display (18px, prominent)
- Passage range in JetBrains Mono / var(--ink-soft), shown only when present
- Canon category badge (parchment-deep background, ink-soft text, uppercase) shown
  only when present
Styled as a parchment-warm card matching the Pastoral Intelligence read-only context
block pattern in SermonWorkspace.jsx. Uses only existing CSS variables.

**Book identity prefix** prepended to every prompt sent from BookStudyTab:
`"We are studying [title] — [passage_range] ([canon_category])."` Passage range and
canon category are each omitted if not present; falls back to `"We are studying [title]."`
Applied to the user message in both `handleAnalyze()` (all six field-specific prompts)
and `handleChatSubmit()`. Does not affect the system prompt.

## 2026-04-05 — Housekeeping: build output path, git workflow docs, Dashboard analysis

### package.json
Changed electron-builder output directory from `C:/Users/rossa/AppData/Local/SermonForgeBuilds`
to `C:/Users/rossa/OneDrive/SermonForgeBuilds` so the installer is accessible via File Explorer
without navigating into the hidden AppData tree.

### CLAUDE.md
Added `## GIT WORKFLOW` section documenting branching conventions, commit discipline, branch
naming (feature/, fix/, refactor/), merge/push/delete sequence, and hard prohibitions
(no force-push to main, no .env/.db commits). Updated build output path to match package.json.

### Dashboard analysis (no code changes)
Audited Dashboard.jsx against the mental model in CLAUDE.md. Identified misalignment:
the current Dashboard is a sermon-centric status board (recent sermons, pipeline list,
biblical coverage counts) rather than a series arc planning room. Key tensions:
- "Continue Where You Left Off" surfaces individual sermons — series is the primary unit
- Series Pipeline groups by status, not by arc position or upcoming preaching schedule
- Biblical Coverage reads as a stats widget, not a planning orientation
- Complete series appear alongside active/planning ones
- "+ New Sermon" header button bypasses the Series → Sermon hierarchy
No changes made; redesign pending user direction.

---

## 2026-04-05 — Documentation: ADR-008 version tracking and FUTURE.md Entry 7 expanded

Updated ADR-008 in DECISIONS.md: "Current version" corrected from 4 to 7; migration history
extended with v5 (outline UUID migration), v6 (pastoral intelligence columns), and v7
(Book Study columns + study_guide_note).

Updated FUTURE.md Entry 7: three unreachable `"book-study"` entries in AIPanel.jsx
(`getSuggestions`, `HOW_CHIP_MESSAGES`, `buildSystemPrompt` stepDescriptions) added to the
dead code list alongside the existing `"series"` branch. Dead code count updated from 3 to 6.

---

## 2026-04-05 — FUTURE.md Entry 8: pre-v7 silent failure handlers and normalizeSermon test gap

Added FUTURE.md Entry 8 documenting two deferred items from the 2026-04-05 audit: the
pre-v7 `try/finally`-only AI handlers in SeriesPlanner.jsx, and the missing `normalizeSermon()`
test for pre-v7 series records.

---

## 2026-04-05 — Fix silent failures in three SeriesPlanner AI handlers

### src/components/SeriesPlanner.jsx

Added `catch` blocks to three handlers that previously used `try/finally` with no error
handling. On failure each handler now logs to console with a prefixed label and appends
an assistant message "Something went wrong. Please try again." to the relevant chat panel
— consistent with the pattern already used in `AIPanel.jsx`.

- `handleAnalyze()` (BookStudyTab) — `catch` logs `[handleAnalyze]` and adds error message
- `handleChatSubmit()` (BookStudyTab) — `catch` logs `[handleChatSubmit]` and adds error message
- `handleSlotAI()` (SlotsTab) — `catch` logs `[handleSlotAI]` and adds error message

No other changes. Pre-v7 handlers with the same pattern are out of scope for this fix.

---

## 2026-04-05 — Book Study phase, Study Guide export, schema v7

This entry covers the full feature set delivered across one session. All parts were tested
together with `npm start` and `npm run build` before this entry was written.

### What was built

**Book Study tab in Series Planner** — a foundational research workspace that sits before
Overview in the planning sequence. Six fields for accumulating discovery work before series
planning conclusions are committed. Designed for the paste-and-interact pattern: paste
commentary material, click Analyze, refine with AI.

**Study Guide export** — "Study Guide" toolbar button → StudyGuideModal (read-only 5-part
preview) → "Export to Word" writes a .docx to `~/OneDrive/SermonForge/StudyGuides/`.
The exported document assembles all series study content; empty parts are omitted.

**Context pipeline extension** — two Book Study fields now feed into the per-sermon AI
context (tier 4): `series_motivation` and `redemptive_context`. Four fields are
deliberately excluded (too long for context budget).

**Study Guide Note per sermon slot** — each slot in the Sermon Slots tab now has a
`study_guide_note` textarea with an "Assist" AI button. Notes appear in the exported
study guide.

---

### electron/main.js

**Schema version: 6 → 7**

**v7 migration block in `runMigrations()`** — six new columns on `series` (each try/catch-wrapped):
  `redemptive_context`, `book_background`, `book_argument`, `book_structure`,
  `series_motivation`, `emerging_big_idea` — all `TEXT DEFAULT ''`.
One new column on `sermons` (try/catch-wrapped): `study_guide_note TEXT DEFAULT ''`.
`schema_version` set to `'7'` in `meta` after migration runs.

**`CREATE TABLE IF NOT EXISTS series`** — all six new columns added to DDL for fresh installs.

**`CREATE TABLE IF NOT EXISTS sermons`** — `study_guide_note` added before `created_at`.

**`SERIES_COLUMNS` allowlist** — added the six new series columns.

**`SERMON_COLUMNS` allowlist** — added `study_guide_note`.

**`SERIES_COLOR_HEX`** — color map (gold/crimson/sage/slate → hex without `#`) for docx export.

**`getSeasonNameForExport(dateStr)`** — inline CommonJS liturgical season calculator. The
ESM `churchCalendar.js` cannot be required from the CommonJS main process, so the full
Gregorian Easter computus is inlined here. Returns a short name string or null.

**`buildStudyGuideDoc(series, sections, sermons)`** — assembles a docx v9 `Document` with
five parts. Each part is fully omitted if all its fields are empty. Series color used as
accent hex on part headings (HEADING_1) and section headings (HEADING_3). Sermon rows in
Part 4 include: number, passage, title, date + liturgical season (grey), and study_guide_note
indented below. Unsectioned sermons follow any sectioned groups.

**`ipcMain.handle("series-export-study-guide")`** — fetches series, sections (ordered by
sort_order ASC), and sermons (ordered by date ASC). Calls `buildStudyGuideDoc`, writes to
`~/OneDrive/SermonForge/StudyGuides/[title] — Study Guide.docx` (creates directory if absent).
Returns `{ success: true, filepath }` or `{ success: false, error }`.

---

### electron/preload.js

Added `exportStudyGuide: (seriesId) => ipcRenderer.invoke("series-export-study-guide", seriesId)`.

---

### src/db/database.js

Added `export const exportStudyGuide = (seriesId) => api.exportStudyGuide(seriesId)`.

---

### src/utils/contextBuilder.js

**`normalizeSermon()`** — added `series_motivation` and `redemptive_context` to the
normalized `series` object. Both extracted from `sermon?.series` with `?? ""` defaults.
The null-guard condition for the series object is unchanged.

**`summarizeSeries()`** — extended to include `series_motivation` (labeled `Motivation:`)
and `redemptive_context` (labeled `Redemptive context:`). Priority order in output string:
`big_idea` → `series_motivation` → `redemptive_context` → section big_idea. Determines
trim survival because tier 4 head-slices to 1200 chars. Four v7 fields deliberately
excluded: `book_background`, `book_argument`, `book_structure`, `emerging_big_idea`.

**`buildTiers()`** — updated comment on tier 4 gate condition to reflect that any of the
three series fields (not only big_idea) can now make tier 4 non-empty.

---

### src/utils/contextBuilder.test.js

Import extended to include `summarizeSeries`.

Three new describe blocks (20 new tests; total: 83 passing):
- `summarizeSeries() — v7: series_motivation and redemptive_context` — presence, priority
  order, exclusion of all four long-form fields, edge cases (null series, motivation-only)
- `tier 4 — v7: series_motivation and redemptive_context appear; excluded fields do not`
- `normalizeSermon() — v7: series_motivation and redemptive_context` — pass-through, defaults,
  null cases

---

### src/components/SeriesPlanner.jsx

**`BOOK_STUDY_FIELDS` constant** — module-level array of six field definitions
(`key`, `label`, `placeholder`, `soloPrompt`). Keys match the v7 series columns.

**`tabs` array** — Book Study inserted as first tab. Order: Book Study → Overview →
Structure → Sermon Slots → Calendar. Existing tab IDs unchanged.

**`BookStudyTab` component** — six textareas from `BOOK_STUDY_FIELDS`, each with
`minHeight: 120px`. All save through the existing `onChange → handleSeriesField →
debouncedPersist` path. Each has an **Analyze** button:
- Disabled when field is empty or any analyze is in-flight.
- Prompt logic: if only this field has content, uses `soloPrompt`; if multiple fields
  populated, sends current field + solo prompt + other populated fields as labeled context.
- Analyze response and free-chat responses share one `aiMessages` state → one continuous
  thread in the `AIChatPanel` sidebar.
- `loading` to `AIChatPanel` is `chatLoading || analyzeLoading !== null`.

**`OverviewTab`** — reads `emerging_big_idea` from series state; shows a read-only card above
the Series Big Idea field when both it and `big_idea` have content. Label: "Working hypothesis
from Book Study". Italic Crimson Pro on parchment-warm. Separator `borderTop` below it.
`emerging_big_idea` is only editable in Book Study — never in Overview.

**`SlotsTab`** — added `handleSlotAI(messageContent)`: appends user message, calls
`sendAIMessage` with a system prompt scoped to congregation-facing study guide writing,
appends response. Sets `chatLoading` for the duration. Three `SlotList` call sites extended
with `series`, `totalSlots`, `sectionBigIdea`, `onSlotAI`.

**`SlotList`** — signature extended; all four props threaded to `SlotRow`.

**`SlotRow`** — `assistLoading` state; `handleAssist(e)` (stops propagation, builds
prompt from slot position, series big idea, section big idea, series_motivation);
**Study Guide Note** field (last in expanded area, `gridColumn: "1 / -1"`, `minHeight: 60px`,
saves to `study_guide_note` via existing debounced path); Assist button shows "Assisting…"
during call.

**`showStudyGuide` state** — controls `StudyGuideModal` visibility.

**"Study Guide" toolbar button** — added after "How this works" in the SeriesPlanner topbar.

**`StudyGuideModal` component** — internal sub-components: `SgStatusDot`, `SgPartHeader`,
`SgPartDivider`, `SgSection`, `SgSlotRow`. Five-part read-only preview on parchment
background. Status dots: filled sage (>100 chars), hollow gold (≤100 chars non-empty), hollow
ink-ghost (empty). Source hints on empty fields. `emerging_big_idea` shown in Part 3 only
when it differs from `big_idea` (or `big_idea` is empty). `exporting` and `exportResult`
state; `handleExport()` calls `exportStudyGuide(series.id)`. On success shows saved filepath
in sage green; on failure shows error in crimson-soft.

---

### src/components/AIPanel.jsx

**`HOW_CHIP_MESSAGES`** — added `"book-study"` entry.

**`getSuggestions()`** — added `if (tab === "book-study")` case returning six chips:
"How does this step work?", "Summarize the book's argument", "Suggest sermon divisions",
"Where does this sit in redemptive history", "What does this book demand of this congregation",
"Help me find the big idea".

**`buildSystemPrompt()` stepDescriptions** — added `"book-study"` entry describing the
paste-and-interact pattern and AI's role as thinking partner, not content generator.

---

### package.json / dependencies

Added `docx@9.6.1` — pure JavaScript .docx generation, no native compilation.

---

## 2026-04-04 — Shared CONTEXT_SCHEMA constant; FUTURE.md Entry 2 closed

### src/constants/contextSchema.js (new file)

**Created CONTEXT_SECTIONS constant — single source of truth for context section labels**
- Exports `CONTEXT_SECTIONS` (frozen object) with all 7 section label strings:
  `PASSAGE` (`[PASSAGE & MPT]`), `THIS_SERMON` (`[THIS SERMON]`),
  `INTERPRETATION`, `STRUCTURE`, `SERIES` (`[SERIES CONTEXT]`),
  `SUPPORTING` (`[SUPPORTING MATERIAL]`), `PASTOR` (`[PASTOR CONTEXT]`).
- No logic, no side effects — constants only.

### src/utils/contextBuilder.js

**Replace 7 hardcoded section label strings with CONTEXT_SECTIONS constants**
- Added `import { CONTEXT_SECTIONS } from "../constants/contextSchema"`.
- In `assembleContext()`: replaced every `"[LABEL]"` string literal with the
  corresponding `CONTEXT_SECTIONS.*` reference. No other changes.
- Assembled context output is identical — same labels, same order, same content.

### src/components/AIPanel.jsx

**Replace 7 hardcoded section label strings with CONTEXT_SECTIONS constants**
- Added `import { CONTEXT_SECTIONS } from "../constants/contextSchema"`.
- In `buildSystemPrompt()` MESSAGE CONTEXT RULES block: replaced every `[LABEL]`
  string literal with a `${CONTEXT_SECTIONS.*}` template interpolation. No other
  changes to rule text or system prompt content.

### FUTURE.md

**Marked Entry 2 as completed**
- Entry 2 (Shared CONTEXT_SCHEMA constant) updated with completion date 2026-04-04
  and note that `src/constants/contextSchema.js` was created.

---

## 2026-04-04 — Created FUTURE.md; updated ADR-013 with Chromium profile risk

### FUTURE.md (new file)

**Created FUTURE.md at project root**
- Records architectural and design improvements that have been identified, reasoned about,
  and deliberately deferred. Not a bug list, not a feature backlog — a record of known
  improvements with trigger conditions for when to revisit them.
- Seven entries:
  1. Structural enforcement of the database.js boundary (social constraint → architectural constraint)
  2. Shared CONTEXT_SCHEMA constant for pipeline and system prompt (eliminate duplicate label literals)
  3. Pastor memory storage: localStorage → AppData flat JSON (survive Electron updates, avoid Chromium profile dependency)
  4. is_one_off as a type discriminator (boolean doing the work of a type discriminator across 3 subsystems)
  5. sql.js write queue with retry on launch (recoverable crash window vs. accepted data loss)
  6. Series Booklet Export (implementation notes for when building; references ADR-014)
  7. Unused dead code cleanup (buildLogosUrl, generateId, getSuggestions("series") branch)

### DECISIONS.md — ADR-013

**Updated ADR-013 (localStorage) with Chromium profile directory risk**
- Trade-offs section extended to note that localStorage lives in Electron's Chromium profile
  directory specifically, not just "userData" — this directory is not guaranteed to survive
  Electron major version updates.
- Added note identifying `~/AppData/Local/SermonForge/pastor_memory.json` as a more intentional
  storage location; references FUTURE.md Entry 3 for the migration plan.
- Decision unchanged: localStorage remains the current implementation.
- Revisit-if section updated to include Electron upgrade as an explicit trigger.

---

## 2026-04-04 — Five bug fixes: unmount timer cleanup, system prompt identity patterns, manuscript review truncation, section/slot debounce, planning-stage filter

### src/utils/hooks.js

**Fix useDebounce pending timer not cleared on unmount**
- Added `useEffect(() => () => clearTimeout(timer.current), [])` inside `useDebounce`.
- Previously, if a component using `useDebounce` (e.g. SermonWorkspace) unmounted while
  a debounced save was pending, the timer would fire after unmount and execute the IPC
  call against an already-gone component. The call succeeded in the main process but was
  unnecessary and operated on potentially stale state.
- Assessment confirmed: no `useEffect` cleanup was present.
- DB initialization guard (Assessment 2): not needed — `createWindow()` is called only
  after `await initDatabase()` completes, so the renderer cannot send IPC calls before
  the DB is ready. No fix applied.

### src/components/StudyTab.jsx

**Fix "You are a [role]..." system prompt patterns in sendReview calls and Challenge My MPT**
- Four SubPhase review system prompts replaced "You are a [role]..." opener with
  task-framing that doesn't re-assign identity:
  - Observe: "Review these observations as a careful biblical scholar would."
  - Interpret: "Review this interpretive work as a biblical scholar would."
  - Redemptive Thread: "Evaluate this redemptive-historical work as a Reformed biblical theologian would."
  - Implications: "Review these implications as a homiletics mentor would."
- "Challenge My MPT" button: removed "You are a careful biblical scholar." prefix;
  the challenge framing stands on its own.
- Matches the cleanup applied to AIPanel.jsx in a prior session (StudyTab was missed).

### src/components/AIPanel.jsx

**Fix manuscript review sending only first 1000 characters**
- `getReviewPrompt()` manuscript case was truncating to 1000 chars — roughly 6% of a
  typical 3000–5000-word manuscript. Structural feedback on unseen content was impossible.
- Now sends full manuscript text. If manuscript exceeds 8000 characters, truncates at
  8000 with appended note: "(manuscript truncated for review — full text in editor)".
- Prompt label changed from "Manuscript (first 1000 chars):" to "Manuscript:".

### src/components/SeriesPlanner.jsx

**Fix handleSectionField and handleSlotField firing IPC on every keystroke**
- Both functions were `async` and directly `await`ed an IPC call on each call — i.e.
  on every keystroke in any section or slot text field.
- `handleSeriesField` in the parent component correctly uses `debouncedPersist` (800ms).
  Sections and slots had no equivalent.
- Added `persistSection` + `debouncedSectionSave` (800ms) in `StructureTab`; replaced
  the direct `await updateSection()` call in `handleSectionField` with the debounced version.
- Added `persistSlot` + `debouncedSlotSave` (800ms) in `SlotsTab`; replaced the direct
  `await updateSermon()` call in `handleSlotField` with the debounced version.
- Both handlers changed from `async function` to plain `function` — they no longer await.

### electron/main.js

**Fix planning-stage sermon slots appearing in Dashboard "Continue Where You Left Off"**
- `db-getRecentSermons` filtered `stage != 'archived'` but not `stage != 'planning'`.
  Planning-stage slots created in the Series Planner appeared in the Dashboard's recent
  sermons list as blank entries with no useful content.
- Added `AND s.stage != 'planning'` to the WHERE clause. Matches the Sidebar dropdown
  filter behavior, which already excludes `stage === "planning"` in JS.

---

## 2026-04-04 — Four bug fixes: Review My Work step context, manuscript re-injection guard, calendar save feedback, persistSeries error handling

### src/components/AIPanel.jsx

**Fix "Review My Work" passing undefined as step to buildSystemPrompt**
- The button onClick called `sendMessage(prompt, system, undefined, sermon?.id)`, causing
  `buildSystemPrompt` to fall back to the generic step description regardless of which
  step the pastor was in. The review prompt content was correctly selected but all
  step-specific framing was lost.
- Changed third argument from `undefined` to `activeStep || activeTab` so the correct
  step context is carried into `buildSystemPrompt`.

### src/components/ManuscriptTab.jsx

**Fix auto-template re-injection on every Manuscript tab mount**
- The `useEffect` with `[]` deps fired on every mount. If `sermon.manuscript` was empty,
  the template was silently injected — including after the pastor deliberately cleared it
  and switched tabs. There was no guard against repeated injection within a session.
- Added `templateInjectedRef` (initialized `false`). The `useEffect` now only injects
  if the ref is `false`; sets it `true` after injecting. Re-mounting within the same
  workspace session no longer triggers re-injection.

### src/components/SeriesPlanner.jsx

**Fix Calendar tab save with no loading state, no success confirmation, no error handling**
- `applySchedule` had no error handling — if any `updateSermon` call failed, the error
  was silent and the pastor had no indication whether the save succeeded or failed.
- Added `calendarSaving` state: set `true` before the save loop, `false` in `finally`.
  Both Save Dates buttons show "Saving…" and are disabled while saving.
- Added `calendarSaveMsg` state (`""` | `"saved"` | `"error"`). On success: shows
  "Dates saved" in `var(--sage)` for 2 seconds then clears. On error: logs to console
  and shows "Save failed — check console" in `var(--crimson-soft)` until next attempt.
- Applied to both Save Dates buttons (the compact one in the controls bar and the primary
  button below the schedule list).

**Fix persistSeries silently swallowing errors**
- `persistSeries` had `try/finally` but no `catch`. If `updateSeries` threw, the error
  was swallowed, `saving` was reset, but the optimistic state update had already applied
  with no indication anything went wrong.
- Added `catch` block: logs `[persistSeries]` + error to console, sets `saveError` state
  to `true`. Added `saveError` display in the topbar (inline, beside the "Saving…"
  indicator) using `var(--crimson-soft)` — "Save failed". Cleared on each new attempt.

---

## 2026-04-04 — Fix DeliveryOverlay broken outline rendering (ADR-009 final consumer)

### src/components/DeliveryTab.jsx

**Fix `DeliveryOverlay` crash on sermons with outline points**
- `DeliveryOverlay` was using `tryParse(sermon?.outline, [])` which returns raw
  `{id, text}[]` objects post-ADR-009. Rendering `{pt}` directly caused React to
  throw "Objects are not valid as a React child", crashing the Delivery View to
  the ErrorBoundary for any sermon with outline points.
- Changed import to include `getOutline` from `"../utils"`.
- Replaced `tryParse(sermon?.outline, [])` with `getOutline(sermon)`.
- Changed `{pt}` render to `{pt.text}`.
- This was the only remaining broken outline consumer. All outline access across
  the codebase (StudyTab, OutlineTab, ManuscriptTab, AIPanel, Dashboard,
  contextBuilder) now goes through `getOutline()`. ADR-009 consumer migration
  is complete.

---

## 2026-04-04 — Add AUTHORITY section to CLAUDE.md

### CLAUDE.md

**Add AUTHORITY section at top of document**
- Inserted new `## AUTHORITY` section immediately before `## PROJECT OVERVIEW`.
- Establishes that CLAUDE.md is binding, all constraints and patterns here
  must be conformed to, and that divergence between code and this document
  means the code is incorrect unless justified in DECISIONS.md.
- No other changes.

---

## 2026-04-04 — Documentation and comment fixes: tier count, JSDoc, memory file

### CLAUDE.md

**Fix stale tier count in PROJECT STRUCTURE file tree comment**
- Changed `contextBuilder.js — 6-tier context assembly pipeline` to `7-tier`.
  Missed in the Pastoral Intelligence session.

### src/utils/contextBuilder.js

**Fix stale JSDoc on resolveIncludes()**
- Updated `@returns` type annotation to include `memory: bool` and
  `pastoralContext: bool`, which were absent despite both being present in
  the returned object.

### memory/project_context_pipeline.md

**Update stale pipeline memory file following Pastoral Intelligence session**
- Tier count updated from 6 to 7 in the pipeline stages description.
- Tier7 / pastoralContext added to the tier budgets list: 800 chars, Topic/Theme +
  Audience + Background, always-on, content-gated, emits `[THIS SERMON]` section.
- Step-gating table updated: added `pastoralContext` column (✓ at every step);
  corrected tier4 at MPT_MPS, OUTLINE, and FUNCTIONAL_ELEMENTS from — to ✓
  (these three steps gained tier4 in the Pastoral Intelligence session).
- Clarified dedupeText note: tier6 (`buildMemoryContext` output) is not wrapped
  with dedupeText; tier7 is wrapped with dedupeText in assembleContext() like all
  other sections.

---

## 2026-04-04 — Pastoral Intelligence feature (schema, pipeline, UI, docs)

### electron/main.js

**Schema migration v6 — three new columns on sermons**
- Added `topic_theme TEXT DEFAULT ''`, `audience_assumptions TEXT DEFAULT ''`,
  `background_noise TEXT DEFAULT ''` to the `CREATE TABLE IF NOT EXISTS sermons` DDL
  so fresh installs include the columns without hitting the migration path.
- Added `if (version < 6)` migration block in `runMigrations()` with three `ALTER TABLE`
  statements (each try/catch-wrapped per established pattern) to upgrade existing installs.
  Schema version incremented from 5 to 6.
- Added all three column names to the `SERMON_COLUMNS` allowlist Set. Without this the
  orientation card's save path would be silently rejected in production.

### src/utils/contextBuilder.js

**normalizeSermon() — three new fields**
- Extended return shape to include `topic_theme`, `audience_assumptions`,
  `background_noise`. All default to `''` for null/undefined sermon input, consistent
  with existing field handling.

**resolveIncludes() — pastoralContext and tier 4 gating**
- Added `pastoralContext: true` to every step in the switch table, including
  `PHASES.OBSERVE`. Unlike every other tier boolean, this is never false — pastoral
  intelligence is not step-gated.
- Added tier 4 (`tier4: true`) to `STEPS.MPT_MPS`, `STEPS.OUTLINE`, and
  `STEPS.FUNCTIONAL_ELEMENTS`. `PHASES.OBSERVE`, `PHASES.INTERPRET`, and
  `PHASES.REDEMPTIVE_THREAD` remain `tier4: false` to protect text-driven method
  integrity during exegesis phases.

**buildTiers() — tier7 (pastoral intelligence)**
- Added tier7 assembled from `normalized.topic_theme`, `normalized.audience_assumptions`,
  and `normalized.background_noise`. Budget: 800 chars shared. Gate: at least one field
  must have content (`text?.trim().length > 0` — single-word entries like "Lament"
  included). Each present field emitted on its own labeled line:
  `Topic/Theme: …`, `Audience: …`, `Background: …`. Empty fields omit their label.
  `pastoralContext` in `resolveIncludes()` controls whether the block is evaluated;
  content gate controls whether it emits.

**assembleContext() — [THIS SERMON] section**
- Added `[THIS SERMON]` section emitted from tier7 after `[PASSAGE & MPT]` and before
  `[INTERPRETATION]`. Only emitted when tier7 is non-null (content gate passed).

### src/utils/contextBuilder.test.js

**Tier 4 assertion updates (3 tests)**
- Updated test names and assertions at `STEPS.MPT_MPS`, `STEPS.OUTLINE`, and
  `STEPS.FUNCTIONAL_ELEMENTS` to reflect tier 4 now active at those steps:
  `toBeNull()` → `not.toBeNull()`. Test names updated to remove "no series" language.
- Added suppression tests at each of those three steps confirming tier 4 is still null
  when no series big_idea is present (following the existing IMPLICATIONS pattern).

**New fixture: NORM_WITH_PASTORAL**
- Added `NORM_WITH_PASTORAL` fixture with all three pastoral fields populated, used
  across new pastoral intelligence tests.

**activeTiers helper — tier7 added**
- Added `tier7: t.tier7 !== null` to the `activeTiers` helper object.

**New tests: tier7 pastoral intelligence (23 new assertions)**
- Always-on at every step when fields have content.
- Null when all three fields are empty strings.
- Null when fields are absent (undefined — as in existing NORM fixture).
- Partial fill: only non-empty fields appear, labels for empty fields omitted.
- Single-word topic ("Lament") not suppressed.
- Active at `PHASES.OBSERVE` while other tiers remain correctly gated there.
- All three field labels present when all three are populated.
- `[THIS SERMON]` label appears in `assembleContext()` output.
- Section order: `[THIS SERMON]` after `[PASSAGE & MPT]`, before `[INTERPRETATION]`.
- `[THIS SERMON]` absent from output when all fields are empty.
- `normalizeSermon()` returns `''` for each new field when sermon is null, undefined, or
  has no pastoral fields, or has null pastoral fields.
- `buildAdaptiveHints()` return count unaffected by pastoral fields; exegesis phases still
  return `[]`.

### src/components/AIPanel.jsx

**buildSystemPrompt() — [THIS SERMON] context rule**
- Added `[THIS SERMON]` handling rule to the MESSAGE CONTEXT RULES section, placed after
  `[PASSAGE & MPT]` and before `[INTERPRETATION]`. Documents the three fields and their
  purpose, instructs the AI to use Topic/Theme for theological framing, Audience for
  application tone and specificity, and Background to ground the sermon in the actual
  moment. Notes that the section is present at every step.

### src/components/SermonWorkspace.jsx

**Pastoral Intelligence orientation card**
- Added a persistent orientation card inside `workspace-main`, above the tab-conditional
  block, so it is visible regardless of which tab is active.
- For series sermons (`sermon.series_id` not null): displays read-only series context
  (series title, series big idea if present, section big idea if present) in a
  parchment-warm panel above the editable fields. Series and section objects are already
  attached to the sermon by the time the card renders (fetched in `load()` with
  `Promise.all`).
- Three editable textareas: Topic / Theme, Audience, Background. Each calls
  `handleUpdate({ field_name: value })` on onChange — no debouncing at the card level;
  SermonWorkspace's existing 800ms debounce handles it.
- No collapse toggle, no gate, no submit button. Styled with existing `.card`,
  `.field-label`, `.field-textarea` classes and existing CSS variables only.

### CLAUDE.md

- Added `## PASTORAL INTELLIGENCE` section after `## AI PANEL BEHAVIOR` documenting
  the three fields, the [THIS SERMON] context tier, always-on gating rationale, and the
  read-only series context display for series sermons.
- Updated schema version reference from 4 to 6.
- Added `topic_theme`, `audience_assumptions`, `background_noise` to the DATABASE SCHEMA
  sermons table listing.
- Updated Flow 1 in `## SYSTEM FLOWS` to note 7 tiers, list the `[THIS SERMON]` section
  label, and document that `pastoralContext` is always true (content-gated).

### DECISIONS.md

- Added ADR-015 documenting: the Pastoral Intelligence tier design, always-on rationale
  vs. tier 4 step-gating rationale, implementation details, and the co-located tier 4
  gating adjustment (MPT_MPS / OUTLINE / FUNCTIONAL_ELEMENTS added to active steps).

---

## 2026-04-04 — Documentation: system flows and booklet export ADR

### CLAUDE.md

**Added SYSTEM FLOWS section**
- Added a new ## SYSTEM FLOWS section placed after the TUNE-UP ENGINE SYSTEM PROMPT section.
- Documents four end-to-end flows in numbered steps:
  - Flow 1: User sends a message in the AI panel — covers buildSystemPrompt(), buildContext(),
    message formatting, chip TASK injection, IPC path, and aiPhrasePatterns capture.
  - Flow 2: Sermon field edit triggers a save and memory capture — covers optimistic update,
    debouncedSave(), SERMON_COLUMNS allowlist, saveDb() debounce, and captureMemory() behavior.
  - Flow 3: Pastor opens a sermon from the Series Planner — covers returnDestination/returnSeriesId
    state, series context attachment, breadcrumb rendering, and workspace close/return behavior.
  - Flow 4: Pastor builds out a series in the Series Planner — covers all four tabs (Overview,
    Structure, Sermon Slots, Calendar) plus the planned Series Booklet Export sub-flow.
- These flows exist to give a future Claude session (or any contributor) a complete picture of
  how the major data paths work end to end, without having to trace through multiple files.

### DECISIONS.md

**Added ADR-014 — Series Booklet Export**
- Documents the planned .docx booklet export: docx npm library, assembled in main process,
  triggered via IPC channel (e.g. series-export-booklet), returns { success, filepath }.
- Records rationale: pure JS (no native addons, consistent with ADR-001), main-process assembly
  (consistent with IPC-only file system access pattern), save-dialog or default exports folder.
- Status: Planned — not yet implemented.

---

## 2026-04-04 — AI system prompt structural cleanup (five changes)

### src/components/AIPanel.jsx

**Cleanup 1 — Remove "You are a..." role re-assignments from all TASK blocks**
- Removed the `You are a [role]` opener from every system string in `getReviewPrompt()` and
  all chip system strings in `getSuggestions()`. The base role ("You are a sermon preparation
  assistant") is the single identity assignment. TASK blocks now state what to do and from
  what perspective, without re-assigning the identity. Affected: all four exegesis phase
  reviews, MPT/MPS challenger review, OUTLINE reviews (2 sites), FUNCTIONAL_ELEMENTS review,
  full study fallback, manuscript review, delivery review, fallback review, series coherence
  check, and all seven chip system strings.

**Cleanup 2 — Move behavioral instruction out of TOOL CONTEXT into base role**
- Moved "When the pastor asks questions about the tool, the workflow, or why a stage exists,
  answer from this context accurately and in the spirit of the method." from the end of the
  TOOL CONTEXT block (which is otherwise purely descriptive) into the base role definition
  sentence where all behavioral instructions live.

**Cleanup 3 — Add header to context rules section**
- Added `MESSAGE CONTEXT RULES:` header immediately before the context rules paragraph.
  TOOL CONTEXT and ADAPTIVE GUIDANCE already had headers; this was the only unlabeled section.

**Cleanup 4 — Fix priority statement position**
- Removed "Step-specific guidance takes priority over adaptive guidance." from the preamble
  above the ADAPTIVE GUIDANCE block. When no TASK was present, this was a forward reference
  to nothing. When a TASK was present, it described content that appeared after it.
- Added "The following task takes priority over all adaptive guidance above." immediately
  before the TASK block in `sendMessage()`. The statement now applies forward, only when
  a TASK block is actually present.

**Cleanup 5 — Remove redundant repetition**
- Removed "and text-driven" from the base role line. TOOL CONTEXT opens with "SermonForge
  is built around a text-driven homiletical method" which carries the statement with context.
- Trimmed "though the text always has final priority" from the series sentence in TOOL CONTEXT.
  The MESSAGE CONTEXT RULES already instruct: "never force it or subordinate the text to it"
  for series context, making the TOOL CONTEXT clause redundant.

---

## 2026-04-04 — AI system prompt behavioral fixes (four surgical changes)

### src/components/AIPanel.jsx

**Fix 1 — Review My Work at Functional Elements (getReviewPrompt)**
- Added a `STEPS.FUNCTIONAL_ELEMENTS` case that was previously missing. When the pastor
  clicks Review My Work at step 4, the review prompt now evaluates each outline point's
  Explanation, Application, and Illustration individually: text-groundedness of explanation,
  whether application is gospel-shaped rather than behavioral, and whether each illustration
  serves its point. Builds content from `sermon.functional_elements` and the outline array
  the same way the OUTLINE review case does. Previously this step fell through to the full
  study review fallback, which covered observations/interpretation/MPT/MPS and said nothing
  about functional elements.

**Fix 2 — Series coherence check passes correct step context (handleSeriesCoherenceCheck)**
- Changed `undefined` to `activeStep || activeTab` in the `sendMessage` call. Previously
  the check always ran with `step: undefined`, producing the generic fallback stepDesc
  ("The pastor is working on sermon preparation.") and zero adaptive hints regardless of
  which tab the pastor was on when they clicked it. Now it carries the correct step context.

**Fix 3 — Challenger posture for MPT/MPS Review My Work (getReviewPrompt)**
- The MPT/MPS review system string now explicitly instructs the AI to act as a rigorous
  challenger: push back, probe weaknesses, do not offer encouragement unless the work
  holds up under scrutiny, and identify the weakest part of the formulation. The review
  prompt was also rewritten to match — it now asks the AI to probe whether the MPT is the
  text's actual main point or what the pastor wanted to find, and whether the MPT→MPS
  movement is legitimate. CLAUDE.md documents this posture as intentional ("challenger,
  not encourager"). Previously the review path used neutral mentor framing; the challenger
  posture only existed in the "Challenge My MPT" chip.

**Fix 4 — "Be concise" qualified to not compress review outputs (buildSystemPrompt)**
- Changed the global base role from "Be concise, theologically rigorous, and text-driven"
  to "Be theologically rigorous and text-driven. Be concise in conversational responses.
  Be thorough and structured when a review or evaluation is requested." The unqualified
  "Be concise" was actively suppressing depth in multi-part review outputs that are
  supposed to be comprehensive.

---

## 2026-04-04 — AI grounding: TOOL CONTEXT block and "How does this step work?" chips

### src/components/AIPanel.jsx

**Part 1 — TOOL CONTEXT block in buildSystemPrompt()**
- Added a static `TOOL CONTEXT` section to every system prompt generated by `buildSystemPrompt()`.
- The block explains what SermonForge is, why the workflow is structured as it is, and describes
  each prep stage in sequence (Observe through Delivery). It is inserted after the base role
  sentence and before the step-specific framing, so the AI has grounded awareness of the tool
  regardless of which step is active.

**Part 2 — "How does this step work?" chip on every step and tab**
- Added `HOW_CHIP_MESSAGES` map keyed by step/phase constants and tab strings — one specific
  message per step (Observe, Interpret, Redemptive Thread, Implications, MPT/MPS, Outline,
  Functional Elements, Manuscript, Delivery, Series Planner).
- Added `howChip(key)` helper that returns a `{ label, prompt }` chip object.
- "How does this step work?" is now the first chip in `getSuggestions()` for every tab and step.
  The chip sends a step-specific message asking the AI to explain that stage within the
  SermonForge workflow. All existing chips and their order are unchanged.

---

## 2026-04-04 — Consolidate handleNewSeries into App.jsx

### src/App.jsx
- Pass `onNewSeries={handleNewSeries}` into `<Planning>`. App.jsx was already the
  single source of truth for this function; Planning.jsx had a duplicate.

### src/components/Planning.jsx
- Removed local `handleNewSeries` function (was identical to App.jsx version).
- Removed `createSeries` from imports (no longer called directly).
- Added `onNewSeries` to prop signature; both `+ New Series` buttons now call the prop.

---

## 2026-04-04 — NewSermonModal: fix is_one_off and active-series default

### src/components/NewSermonModal.jsx
- **is_one_off now set on submit**: `createSermon` is called with `is_one_off: 1`
  when no series is selected, `is_one_off: 0` when a series is selected. Previously
  `is_one_off` was never passed, leaving standalone sermons in an undefined state
  (`series_id = null`, `is_one_off = 0`).
- **Active-series default**: On mount, if the series list contains exactly one series
  with `status === "active"`, the series dropdown defaults to that series. If there
  are zero or more than one active series, the dropdown defaults to "— No series —"
  as before. This is a soft default — the pastor can always change it before creating.

---

## 2026-04-04 — Series breadcrumb in workspace + open sermon from series planner

### src/components/SeriesPlanner.jsx
- Added `onOpenSermon` prop to the `SeriesPlanner` component.
- Threaded `onOpenSermon` and `seriesId` through `SlotsTab` → `SlotList` → `SlotRow`.
- Each `SlotRow` now renders an "Open" button that calls
  `onOpenSermon(slot.id, "series-planner", seriesId)`, completing the return-to-series
  routing wired in the previous session.

### src/components/SermonWorkspace.jsx
- Added `onOpenSeries` prop.
- When a sermon belongs to a series (`sermon.series_id` is non-null) and `onOpenSeries`
  is provided, the series title in the topbar is rendered as a clickable breadcrumb
  (gold text, pointer cursor) that calls `onOpenSeries(sermon.series_id)`.
- One-off sermons (no `series_id`) are unaffected — series title renders as plain text
  as before. No new CSS classes or hex values introduced.

### src/App.jsx
- Pass `onOpenSermon={openSermon}` into `<SeriesPlanner>`.
- Pass `onOpenSeries={openPlanner}` into `<SermonWorkspace>`.

---

## 2026-04-04 — Sermon Workspace close restores series context

### src/App.jsx
- Added `returnDestination` state (default `"dashboard"`) and `returnSeriesId` state
  (default `null`) to track where the workspace was opened from.
- `openSermon` now accepts `(id, origin = "dashboard", seriesId = null)`. Sets
  `returnDestination` and `returnSeriesId` at open time. All existing callers
  (Sidebar dropdown, Dashboard recent sermons) use defaults — no changes required
  at those call sites.
- `closeWorkspace` now routes using `returnDestination` and `returnSeriesId`:
  - If `origin === "series-planner"` and `seriesId` is non-null: restores
    `openSeriesId` and navigates to `"series-planner"`.
  - All other cases (default origin, or one-off sermon with null `seriesId`):
    navigates to `"dashboard"` as before.
- Infrastructure is in place for SeriesPlanner's Sermon Slots tab to call
  `openSermon(id, "series-planner", series_id)` when that wiring is added.

---

## 2026-04-04 — Remove "All Sermons" from sidebar nav

### src/components/Sidebar.jsx
- Removed the "All Sermons" entry from `NAV_ITEMS`. A flat sermon list is a reference
  view, not a primary destination per the MENTAL MODEL in CLAUDE.md.
- The `SermonList` component, its route (`currentView === "sermons"`), and all related
  state in App.jsx are untouched and remain reachable programmatically.

---

## 2026-04-04 — Dashboard: series-first mental model alignment

Three changes to Dashboard.jsx and App.jsx to make the Dashboard feel like a series
planning room rather than a task status board, per the MENTAL MODEL in CLAUDE.md.

### src/App.jsx
- Imported `createSeries` from `./db/database`.
- Added `handleNewSeries` callback: creates an "Untitled Series" record and opens the
  Series Planner. Same logic as `Planning.jsx:handleNewSeries` — no duplication, shared
  via the same db wrapper.
- Passed `onNewSeries={handleNewSeries}` to `<Dashboard>`.

### src/components/Dashboard.jsx — Change 1: Replace primary CTA
- Replaced the single `+ New Sermon` (btn-primary) header button with two buttons:
  `+ New Series` (btn-primary, calls `onNewSeries`) and `+ New Sermon` (btn-ghost,
  demoted secondary action, still opens NewSermonModal). The series-creation action
  is now the primary invitation on the dashboard.

### src/components/Dashboard.jsx — Change 2: Update subtitle
- Changed subtitle from "Your sermon preparation overview" to "Active and upcoming series."

### src/components/Dashboard.jsx — Change 3: Reorder page body
- Series Pipeline + Biblical Coverage grid now renders first.
- "Continue Where You Left Off" (recent individual sermons) renders below it.
- No changes to content, styling, or behavior of either section.

---

## 2026-04-04 — Documentation fixes: stale IPC docs, missing files, ADR-013

No code changes. Documentation only.

### CLAUDE.md — IPC CHANNELS section
- Removed the two stale generic channel entries (`db-query`, `db-run`) that were never
  implemented. Replaced with a note that database operations use named per-operation IPC
  channels, all implemented in `electron/main.js`, with no raw SQL accepted from the renderer.

### CLAUDE.md — PROJECT STRUCTURE section
- Added four active, architecturally significant files that were absent from the listing:
  `src/utils/ai.js`, `src/utils/contextBuilder.js`, `src/utils/memory.js`,
  and `src/constants/steps.js`, each with a brief description.

### DECISIONS.md — ADR-013
- Added ADR-013 documenting the decision to store pastoral memory in `localStorage` rather
  than `sermonforge.db`. Records the context, the OneDrive-sync asymmetry trade-off, and
  the revisit condition (multi-machine active use).

---

## 2026-04-04 — Seven bug fixes: guardrail violations, silent failures, ADR-009 regression

### src/utils/memory.js — Fix 1: extractOutlinePattern broken for ADR-009 outline format
- `extractOutlinePattern` called `String(p)` on each outline point. After ADR-009, points
  are `{id, text}` objects, so `String(p)` returned `[object Object]` and no patterns were
  ever extracted. Silent regression since ADR-009 migration.
- Fixed: extract `p.text` for object points, fall back to `String(p)` for legacy strings.
  Same guard used in contextBuilder.js `summarizeOutline` and `rankChunks`.

### electron/main.js — Fix 2: library-status silently swallowed errors
- `catch (_) {}` returned `{ count: 0 }` with no logging. Real errors were
  indistinguishable from an empty library.
- Fixed: changed catch variable to `e` and added `console.error('[library-status]', e)`.

### electron/ai.js — Fix 3: no error handling on Anthropic API call
- `anthropicClient.messages.create()` had no try/catch. API errors (rate limit, network
  failure, empty content array) propagated as unhandled rejections with no main-process log.
- Fixed: wrapped call in try/catch, logs with `console.error('[ai-message]', e)`, re-throws
  so the renderer's `sendAIMessage` catch receives the real error.

### src/components/AIPanel.jsx — Fix 4: failed AI calls showed blank message bubbles
- All three `sendAIMessage` call sites (sendMessage, theology path, handleLibrarySearch)
  added the response unconditionally. Because `sendAIMessage` swallows errors and returns
  `''`, any API failure produced a blank bubble with no user feedback.
- Fixed: at each call site, `response || "Something went wrong. Please try again."` used
  as the content. `captureResponsePatterns` now only called when response is non-empty.

### electron/main.js — Fix 5: buildUpdate null return was silent no-op in production
- When all update fields were off the allowlist, `buildUpdate` returned null and the handler
  did `if (!update) return` — caller received undefined, believed save succeeded.
- Fixed: `db-updateSermon` and `db-updateSeries` handlers now log and return
  `{ error: "No valid fields to update", attempted: Object.keys(fields) }` when
  `buildUpdate` returns null.

### src/db/database.js + src/components/SermonWorkspace.jsx — Fix 6: openInLogos boundary violation
- `SermonWorkspace.jsx` called `window.electronAPI.openInLogos()` directly, bypassing the
  database wrapper module boundary documented in CLAUDE.md guardrails.
- Fixed: added `export const openInLogos = (passage) => api.openInLogos(passage)` to
  `database.js`. Updated `SermonWorkspace.jsx` to import and use it from there.

### src/components/SeriesPlanner.jsx — Fix 7: trivial askAI wrapper removed
- Private `askAI` function was a one-line pass-through to `sendAIMessage` with no added
  behavior. Removed the function and replaced all 7 call sites with direct `sendAIMessage`
  calls. Import of `sendAIMessage` was already present.

---

## 2026-04-04 — Added MENTAL MODEL section to CLAUDE.md

Added a new MENTAL MODEL section to CLAUDE.md, placed between PROJECT OVERVIEW
and TECH STACK. No code changes. Documents the pastoral and UX philosophy of the
tool so future sessions start with the right understanding of what SermonForge is
trying to be — series-first, method-calibrated AI, nav as pastoral workflow map.

---

## 2026-04-04 — Sidebar nav reorder and simplification

Reordered nav to reflect the pastoral mental model (series → sermon), removed
three secondary views from top-level navigation, and renamed "Sermon Workspace"
to "Sermon Prep". Display-label changes only — no view IDs, routing, or
component files were touched.

### src/components/Sidebar.jsx
- Nav order is now: Dashboard → Series Planning → Sermon Prep → Calendar → All Sermons.
- "Sermon Workspace" nav label renamed to "Sermon Prep". View ID (`workspace`),
  state variables, dropdown behavior, and IPC handlers unchanged.
- Series Planning moved from the NAV_ITEMS loop to a hardcoded item before the
  Sermon Prep dropdown. Active state covers both `planning` and `series-planner`
  views so the item highlights correctly when a series is open.
- Illustrations, Sermon Library, and Archive removed from NAV_ITEMS. The
  corresponding views and routing in App.jsx are intact and still reachable
  programmatically; they just no longer appear in the sidebar.

---

## 2026-04-02 — ADR-009 resolution: stable UUID-keyed outline and functional elements

Resolves the long-standing reorder-mismatch limitation where reordering outline points
would misalign Explanation/Application/Illustration content. All 10 phases completed.

### electron/main.js — Phase 1: Schema v5 data migration
- Added `if (version < 5)` block in `runMigrations()`.
- For every sermon with a string[] outline: converts each string to `{ id: randomUUID(), text }`.
- Remaps `functional_elements` from numeric-string keys to the corresponding new UUID keys.
- Orphan `functional_elements` entries (more keys than outline points) are discarded with
  `console.warn` rather than silently retained.
- Migration is idempotent: records already in `{id, text}[]` shape are detected and skipped.
- Schema version bumped to **5**.

### src/utils.js — Phase 2: Updated JSON accessors + new createOutlinePoint
- `getOutline()` now returns `{id, text}[]` always. Handles both new shape and legacy string[]
  (legacy strings get a deterministic djb2-based fallback ID, never `Math.random()` or `Date.now()`).
- `serializeOutline()` now validates `{id, text}[]` shape per entry; logs error and returns `'[]'`
  on any malformed input.
- `getFunctionalElements()` now detects legacy numeric-string keys and logs `console.warn` rather
  than silently accepting them; returns the object as-is so the data is not lost.
- Added `createOutlinePoint(text)` export — the single place where new outline point objects are
  created, using `crypto.randomUUID()`.
- Added internal `djb2()` helper for stable fallback ID synthesis.

### src/components/OutlineBuilder.jsx — Phase 3
- Updated to work with `{id, text}[]` instead of `string[]`.
- `addPoint`: calls `createOutlinePoint("")`.
- `updatePoint`: updates `.text` only — never regenerates `.id` on text edit.
- `moveUp`/`moveDown`: swap full objects; IDs travel with their points.
- `removePoint`: calls `onRemove(point.id)` before removing, so the parent can clean up
  `functional_elements`. `onRemove` prop replaces the old `onReorder` prop.
- `key` attribute changed from numeric index to `pt.id`.

### src/components/StudyTab.jsx — Phase 4
- Removed `showOutlineReorderWarning` state, `outlineReorderPendingRef`, warning banner JSX,
  and `onReorder` wiring.
- `SermonShapePreview`: looks up `funcData[pt.id]`, renders `pt.text`.
- `FuncElem`: renamed `point`/`index` props to `pointText`/`pointId`/`displayIndex`; keys
  `funcData` by `pointId` (UUID) instead of numeric index.
- `updateFuncData(pointId, data)`: keys the state update by UUID.
- Added `handleOutlineRemove(pointId)`: deletes the UUID key from `funcData` and persists.
- Step 3 `OutlineBuilder`: wires `onRemove={handleOutlineRemove}`, drops `onReorder`.
- Step 3 "Review Outline": uses `p.text`.
- Step 4 FuncElem rendering: uses `pt.id` as key and `pointId` prop.
- Step 4 "Review E/A/I Balance": uses `pt.text` and `funcData[pt.id]`.
- Advance-to-Step-4 summary generation: uses `p.text`.

### src/components/OutlineTab.jsx — Phase 5
- Removed `showReorderWarning` state, `reorderPendingRef`, warning banner JSX, `onReorder` wiring.
- Wires `onRemove={handleOutlineRemove}` to `OutlineBuilder`.
- `handleOutlineRemove(pointId)`: reads current `functional_elements`, deletes the UUID key,
  persists via `onUpdate`.

### src/utils/contextBuilder.js — Phase 6
- `summarizeOutline()`: handles `{id, text}[]` via `point.text`; gracefully falls back to
  `String(point)` for legacy string items.
- `rankChunks()`: keyword extraction from outline points uses `point.text`.
- `formatFunctionalElements(fe, outline)`: signature now takes the outline array as second
  argument; iterates outline in order, looks up `fe[point.id]` for each point. Orphan fe
  entries (UUID in fe but not in outline) are silently skipped. Call site in `assembleContext`
  updated to pass `tiers.tier3.outlineArr`.
- `buildTiers()`: stores `outlineArr: normalized.outline` in `tier3` so `assembleContext`
  can pass it to `formatFunctionalElements`.

### src/components/ManuscriptTab.jsx — Phase 7
- `buildTemplate()`: uses `pt.text` when building body point lines.
- `runTuneUp()`: uses `p.text` in outline string for Tune-Up prompt.

### src/components/AIPanel.jsx — Phase 8
- Three `outline.map((p, i) => \`${i+1}. ${p}\`)` call sites updated to `p.text`.

### DECISIONS.md — Phase 10
- ADR-009 marked **RESOLVED**. New outline shape, functional_elements shape, migration
  guarantees, and accessor invariants documented.
- ADR-008 migration history updated to include v5.

### src/components/Dashboard.jsx — Phase 8 (also)
- Fixed stray `tryParse(sermon.outline, [])` call in the "Re-orient me" prompt builder;
  replaced with `getOutline(sermon)` and `p.text`. Removed unused `tryParse` import.

### KNOWN ISSUES removed
- Reorder mismatch limitation (functional_elements keyed by index) is eliminated.

---

## 2026-04-02 — System audit bug-fix session (17 issues)

### electron/main.js — L-1: Removed hardcoded Logos.exe path
- Removed `exec('"C:\\Users\\rossa\\AppData\\Local\\Logos\\System\\Logos.exe"')` fallback
  in `open-logos` handler. Path was machine-specific and would silently fail on any other
  install. Replaced with `console.error` + `return { success: false }`.

### electron/main.js — L-4 comment + L-5 + M-4: FTS orphan prevention
- Added comment on `INSERT OR IGNORE INTO library` explaining the filepath-uniqueness
  behaviour and the re-import duplicate risk.
- FTS insert is now guarded: only runs when `db.getRowsModified() > 0` (i.e. a new row
  was actually created, not a silent no-op). Prevents FTS orphan records.
- FTS insert wrapped in try/catch with `console.warn` so a failed FTS row does not abort
  a valid library import.

### electron/ai.js — M-2: Corrected model ID
- Changed model from `"claude-sonnet-4-20250514"` to `"claude-sonnet-4-6"` to match
  CLAUDE.md specification.

### src/db/database.js — H-3: Added missing library wrapper exports
- Added `getLibraryStatus`, `searchLibrary`, `importLibrary`, `getLibraryManuscripts`,
  and `onLibraryImportProgress` exports. Previously absent; components accessed
  `window.electronAPI` directly (boundary violation).

### src/components/Library.jsx — H-3: Replaced all direct window.electronAPI calls
- All 7 direct `window.electronAPI.*` calls replaced with imports from `database.js`.

### src/components/Library.jsx — M-5: Capped manuscript text in quick-outline call
- `handleQuickOutline` now calls `getLibraryManuscripts(topIds, true, 2000)` instead of
  `getLibraryManuscripts(topIds, false)`. Each manuscript is now capped at 2,000 chars
  before being assembled into the AI prompt, preventing oversized context payloads.

### src/components/AIPanel.jsx — H-3: Replaced direct window.electronAPI calls
- Replaced `window.electronAPI.searchLibrary` and `window.electronAPI.getLibraryManuscripts`
  with imports from `database.js`.

### src/components/AIPanel.jsx — M-6: Fixed empty catches in mount effect
- `getLibraryStatus` and `getTheologyStatus` failures in `useEffect` now log to
  `console.error` instead of being silently swallowed.

### src/components/AIPanel.jsx — H-2: externalMessage now forwards step
- The `externalMessage` effect now passes `externalMessage.step` instead of `undefined`
  to `sendMessage`, enabling adaptive hints for all review-button triggers.

### src/components/AIPanel.jsx — H-1: Fixed system prompt doubling in free-text input
- `handleSendInput` no longer pre-builds a systemPrompt string. Free-text messages
  now pass `null` as the systemPrompt arg to `sendMessage`, which builds the base prompt
  once internally. Previously, the externally-built prompt was appended via the TASK
  block, doubling the system context on every user message.
- Added empty-context guard: if context assembly returns nothing, the message is sent
  as plain text without a misleading "CONTEXT:" header.

### src/components/AIPanel.jsx — M-1: captureResponsePatterns read wrong dedup array
- `captureResponsePatterns` was reading `phrasePatterns` (the pastor's own rhetorical
  patterns) for duplicate suppression instead of `aiPhrasePatterns` (AI-sourced patterns).
  Fixed: `stored` now reads `memory?.patterns?.aiPhrasePatterns`.

### src/components/SermonWorkspace.jsx — C-1: Fixed debounce data-loss on rapid field switching
- `persistUpdate` no longer accepts a `fields` delta arg. It reads `sermonRef.current`
  (the always-current merged state) at fire time, so rapid field edits no longer lose
  earlier changes when the debounce replaces pending calls.
- `handleUpdate` now calls `debouncedSave()` with no args (snapshot is read at fire time).

### src/components/SermonWorkspace.jsx — H-2: handleAI now includes step in pendingMessage
- `setPendingMessage` now includes `step: activeStep || activeTab`, so AIPanel receives
  the correct step for adaptive hint injection on all review-button calls.

### src/components/SermonWorkspace.jsx — M-3: Series fetch failure no longer blocks sermon load
- `getSeriesById` and `getSectionsBySeries` calls in the load effect now have `.catch`
  handlers that log the error and return null/[] respectively. Previously, a series fetch
  failure would cause the entire `load()` try block to throw, leaving `sermon` as null
  and displaying "Sermon not found" even when the sermon itself loaded fine.

### src/utils/contextBuilder.js — L-2: buildMemoryContext truncation cuts at newline
- Truncation at 650 chars now finds the last `\n` before the cut point and breaks there,
  preventing mid-line truncation of structured context blocks.

### src/utils/contextBuilder.js — M-8: _lastHintsBySermon Map capped at 200 entries
- After each write to `_lastHintsBySermon`, entries exceeding 200 are evicted (oldest
  first, using insertion-order iteration). Prevents unbounded memory growth in long
  sessions touching many sermons.

### DECISIONS.md — M-7: Updated ADR-008 schema version
- Corrected "Current version: 2" to "Current version: 4".
- Added v3 migration history (library + FTS tables) and v4 migration history (series
  planning fields, sections table, calendar_notes, sermon section/one-off columns).

---

## 2026-04-02 — Fix Sidebar dropdown: "New Sermon" navigation and untitled list entries

### src/components/Sidebar.jsx — Bug 1: "+ New Sermon" led to "Sermon not found"
- Root cause: `electron/main.js` `db-createSermon` handler ignores any `id` passed in
  `data` and generates its own UUID via `randomUUID()`, returning that UUID. Sidebar was
  generating a local UUID via `crypto.randomUUID()`, passing it (where it was silently
  ignored), then navigating to the workspace using the local UUID — which was never
  inserted into the database. The workspace called `getSermonById` with the wrong ID,
  got null, and rendered "Sermon not found."
- Fix: Removed local `id` generation in `handleNewSermon`. The `await createSermon(...)`
  call now captures the UUID returned by main.js and passes that to `onOpenSermon`.

### src/components/Sidebar.jsx — Bug 2: Recent sermons dropdown showed "Untitled" entries
- Root cause: `getRecentSermons` is ordered by `updated_at DESC` with no filter on title
  or stage. A newly created blank sermon (`title: ""`, `stage: "planning"`) appears at
  the top of the query result, so every time the dropdown was reopened after creating a
  sermon, the blank entry appeared.
- Fix: Added `visibleRecents` derived from `recentSermons` filtered to exclude entries
  where `title` is empty/whitespace or `stage === "planning"`. The divider and list map
  both use `visibleRecents` so the separator only appears when there are items to show.

---

## 2026-04-02 — "How this works" process diagram modals in Sermon Workspace and Series Planner

### src/components/SermonWorkspace.jsx
- Added `showHowItWorks` local state and a subtle `How this works` text button in the
  topbar (after the Logos button). Clicking it opens `SermonHowItWorksModal`.
- `SermonHowItWorksModal`: fixed overlay, closes on outside click or ✕ button.
  Contains a hardcoded inline SVG (viewBox 860×336) showing the four-stage flow:
  Study → Outline → Manuscript → Delivery, with sub-items below each stage.
  Study expands to: Observe, Interpret, Redemptive Thread, Implications, MPT/MPS,
  Outline, Functional Elements. Outline: Outline Editor. Manuscript: Manuscript Editor,
  Tune-Up Engine. Delivery: Delivery Notes, Timing Notes, Post-Sermon, Checklist.
- Return wrapped in `<>…</>` fragment to render the modal as a fixed overlay outside
  the overflow:hidden workspace container.

### src/components/SeriesPlanner.jsx
- Added `showHowItWorks` local state and a subtle `How this works` text button in the
  topbar (after the status badge). Clicking it opens `SeriesHowItWorksModal`.
- `SeriesHowItWorksModal`: same modal pattern. Hardcoded inline SVG (viewBox 860×228)
  showing the four-tab flow: Overview → Structure → Sermon Slots → Calendar, with
  sub-items below each tab. Overview: Title & identity, Passage & dates, Series Big
  Idea, Series Overview. Structure: Structural Outline, Series Sections. Sermon Slots:
  Sermon Slots, Stage: planning, Promote to active. Calendar: Date assignment,
  Liturgical seasons, AI Advisor.
- Return wrapped in `<>…</>` fragment same as above.

### Approach note
Each modal is a module-level function in its own file (no shared component created —
duplication is two small presentational components). All colors use `var(--…)` CSS
variables. Font sizes: 14px stage box titles, 12px sub-item labels.

---

## 2026-04-02 — SeriesPlanner: rename Overview field label to Series Overview

### src/components/SeriesPlanner.jsx
- Changed the field label inside the Overview tab from `Overview` to `Series Overview`
  (line 354). Display label only — no variables, state keys, database fields, or IPC
  handlers changed.

---

## 2026-04-02 — Sidebar: Sermon Workspace nav item, rename Planning, reorder Archive

### src/components/Sidebar.jsx
- Added **Sermon Workspace** nav item below Dashboard. Clicking it toggles an inline
  dropdown showing "+ New Sermon" and the 3 most recently updated sermons (via
  `getRecentSermons(3)`). "+ New Sermon" creates a one-off planning-stage sermon
  (client-side `crypto.randomUUID()`, `createSermon`) then opens it in SermonWorkspace.
  Recent sermon entries open the clicked sermon directly. Dropdown closes on any other
  nav click.
- Renamed **Planning → Series Planning** (display label only; view id `"planning"` unchanged).
- Moved **Archive** to the bottom of the nav list, below Sermon Library.
- Sidebar is now stateful (`useState` for dropdown open/close and recent sermon list).
  Imports `getRecentSermons` and `createSermon` from `src/db/database.js`.

### src/App.jsx
- Passes `onOpenSermon={openSermon}` to `<Sidebar>` so the workspace dropdown can
  navigate to a sermon without duplicating the `openSermon` logic.

### Approach note
Option B (dropdown with recents) was implemented. No new CSS classes added; dropdown
uses inline styles with existing CSS variables only.

---

## 2026-04-02 — Hardening: commit untracked files, unit tests, crash window, reorder warning, memory guard

### electron/ai.js, src/utils/contextBuilder.js, src/utils/memory.js (committed)
Previously untracked — now in version control. Commit `de85165`.

### src/utils/contextBuilder.test.js (new) + src/utils/memory.test.js (new)
- Added Vitest (`^4.1.2` devDependency) and `"test": "vitest run"` script.
- Added `test` block to `vite.config.mjs` (`environment: "node"`, `globals: true`).
- `contextBuilder.test.js`: 41 tests covering `resolveIncludes` (via `buildTiers`) and
  `buildAdaptiveHints` for every step in STEP_SEQUENCE and PHASE_SEQUENCE. Tests
  verify tier gating, step caps, null guards, hint format, and category dedup.
- `memory.test.js`: 9 tests covering array isolation between `phrasePatterns` and
  `aiPhrasePatterns`, and the dev runtime assertion (throws when an AI phrase reaches
  `phrasePatterns`). Tests confirm the guard both throws on violation and does not
  modify state when it throws.

### electron/main.js — 500ms crash window acknowledgment
- Added `_pendingWrite` boolean: set `true` by `saveDb()`, cleared `false` inside the
  timeout callback before `flushDb()` runs.
- `flushDb()` warns in dev (`ELECTRON_DEV=1`) if `_pendingWrite` is still true,
  indicating it was called externally while a debounce was pending.
- Added one-line comment near `saveDb()` noting the 500ms crash window as an accepted risk.
- `DECISIONS.md`: added ADR-012 documenting the tradeoff, implementation detail, and
  conditions under which this should be revisited.

### src/components/OutlineBuilder.jsx — onReorder prop
- Added optional `onReorder` prop. Called from `moveUp`, `moveDown`, and `removePoint`
  (not from `addPoint` or `updatePoint`). Existing consumers with no `onReorder` prop
  are unaffected.

### src/components/OutlineTab.jsx — reorder misalignment warning
- Tracks `showReorderWarning` state and `reorderPendingRef`.
- Shows an inline gold-tinted banner after any reorder or removal: "Reordering outline
  points may misalign your Explanation/Application/Illustration content. Review Step 4."
- Dismisses on the next non-reorder outline change (text edit, add point) or via ×.

### src/components/StudyTab.jsx — same warning in Step 3
- Same inline warning added to the Step 3 Outline Builder section with identical
  dismiss-on-next-save and × behavior.

### src/utils/memory.js — dev runtime assertion
- `updateMemory`: added guard that throws in dev (`import.meta.env.DEV`) if any phrase
  in `partial.patterns.phrasePatterns` already exists in `current.patterns.aiPhrasePatterns`.
- Error message: `[memory] DEV ASSERTION FAILED: phrase "..." exists in aiPhrasePatterns
  and cannot be written to phrasePatterns.`
- The guard catches the AI feedback loop at the call site rather than silently corrupting
  the pastor's pattern data.
- `CLAUDE.md`: documented the guard and the phrasePatterns/aiPhrasePatterns invariant
  under GUARDRAILS.

---

## 2026-04-02 — Memory/context audit: bug fixes and integrity hardening

### Problem
Focused audit of contextBuilder.js, memory.js, AIPanel.jsx, and SermonWorkspace.jsx revealed seven issues: wasted library search work for gated steps, stale message history in one async path, AI response patterns contaminating pastor's phrase patterns (feedback loop), double-signaling from phrasePatterns appearing in both context data and adaptive hints, cross-sermon hint leakage via module-level state, phrase extraction running on every debounced save, and chip/review prompts bypassing the adaptive hint system entirely.

### src/utils/contextBuilder.js

**Step gating — memory tier:**
- `resolveIncludes`: `REDEMPTIVE_THREAD` and `IMPLICATIONS` both changed from `memory: true` to `memory: false`. Memory (tier6) now only fires for MPT_MPS, OUTLINE, FUNCTIONAL_ELEMENTS, and MANUSCRIPT. Zero stylistic contamination during exegesis.

**`buildMemoryContext`:**
- Removed `phrasePatterns` from `[PATTERN SIGNALS]` output. `[PATTERN SIGNALS]` now carries `outlinePatterns` only (structural signal). `phrasePatterns` are emitted exclusively as adaptive hints in the system prompt — never in both channels simultaneously.

**`buildAdaptiveHints` — per-sermon rotation:**
- `let _lastHints = []` (module-level, persisted across sermon switches) replaced with `const _lastHintsBySermon = new Map()`.
- Signature changed to `buildAdaptiveHints(memory, step, sermonId)`. Rotation state is keyed by `sermonId`; switching sermons never carries over suppressed hints from a prior session.
- Guard added: `if (!sermonId) return []` — no adaptive hints without a scoped sermon.

### src/utils/memory.js

**`aiPhrasePatterns` field added:**
- `patterns` shape is now `{ outlinePatterns[], phrasePatterns[], aiPhrasePatterns[] }`.
- `phrasePatterns` — pastor's own rhetorical patterns extracted from manuscript.
- `aiPhrasePatterns` — patterns extracted from AI responses. Comment: "AI patterns are for analysis only. Never influence generation." Never read by contextBuilder, adaptive hints, or system prompts.
- `updateMemory` merges all three arrays independently (same cap of 30 for phrase arrays).

**`extractPhrasePatterns` — threshold lowered:**
- Starter length reduced: 4 words → 3 words.
- Repetition threshold reduced: `>= 3` → `>= 2`.
- Makes the extractor fire on realistic AI response and manuscript lengths.

### src/components/SermonWorkspace.jsx

**`captureMemory` — phrase scan gating:**
- Signature changed to `captureMemory(s, { scanPhrases = false } = {})`.
- `extractPhrasePatterns` only runs when `scanPhrases: true` AND `manuscript.length >= 300`. Both conditions must be true.
- `handleTabChange` passes `{ scanPhrases: true }` — phrase scan runs on tab change only.
- `persistUpdate` passes nothing (default) — phrase scan never runs on debounced saves.

### src/components/AIPanel.jsx

**`captureResponsePatterns` — writes to `aiPhrasePatterns` only:**
- Changed `updateMemory({ patterns: { phrasePatterns: newPatterns } })` to `updateMemory({ patterns: { aiPhrasePatterns: newPatterns } })`. AI response patterns no longer mix with the pastor's own phrase patterns. Feedback loop permanently severed.

**`handleLibrarySearch` — early return for gated steps:**
- If `activeStep` is `PHASES.OBSERVE` or `PHASES.INTERPRET`, library search is skipped entirely. Falls back to a plain `sendMessage` call with appropriate context and phase-specific prompt. Prevents wasted IPC calls (search + manuscript fetch) whose results would be silently discarded by `resolveIncludes`.
- OBSERVE/INTERPRET branches removed from the `promptAction` block (now unreachable).

**`sendMessage` — adaptive system no longer bypassable:**
- Signature changed to `sendMessage(userText, systemPrompt, step, sermonId)`.
- Always calls `buildSystemPrompt(step, sermonId)` as the base. When an external `systemPrompt` is provided (chips, review buttons, coherence check), it is appended as `\n\nTASK:\n${systemPrompt}` rather than replacing the base. Adaptive hints are now active on every code path.
- Chip call site updated to pass `activeStep || activeTab` as `step` and `sermon?.id` as `sermonId`.
- All 7 `sendMessage` call sites updated to pass `sermon?.id`.

**`buildSystemPrompt` — threads sermonId:**
- Signature changed to `buildSystemPrompt(step, sermonId)`. Passes `sermonId` to `buildAdaptiveHints`.

**`handleLibrarySearch` — stale message history fixed:**
- `[...messages, userMsg]` replaced with `[...messagesRef.current, userMsg]`. Consistent with all other async paths.

---

## 2026-04-02 — Adaptive hint system (buildAdaptiveHints)

### src/utils/contextBuilder.js
- `buildAdaptiveHints(memory, step)` added and exported — derives up to 3 short hint strings from persistent memory for injection into the AI system prompt only. Never touches context data tiers.
- Step cap table gates how many hints are allowed per step: Observe/Interpret/Redemptive Thread/Implications → 0 (return []); MPT_MPS → 2; Outline/Functional Elements/Manuscript → 3. Unknown steps default to 0.
- Memory threshold gate (same rule as `buildMemoryContext`): requires ≥1 pattern AND ≥2 history items before any hints fire.
- Seven hint candidates across four categories — structure, phrasing, concision, style:
  - `outlinePatterns` present → "Consider movement-based progression where it strengthens clarity." (structure)
  - `phrasePatterns` present → "Prefer consistent rhetorical phrasing if it fits the passage." (phrasing)
  - `recentMPTs` concise (≥3 MPTs, avg length ≤60 chars, avg clause count ≤1.5) → "Prefer concise, declarative main points if it fits the passage." (concision). Clause count splits on commas/`and`/`or`.
  - `style.tone` → "Prefer a [tone] tone if it fits the passage." (style)
  - `style.structurePreference` → "Consider a [X] structure where it strengthens clarity." (structure)
  - `style.illustrationStyle` → "Consider [X] illustrations where it strengthens clarity." (style)
  - `style.applicationStyle` → "Prefer [X] application framing if it fits the passage." (style)
- All candidates shuffled (Fisher-Yates) before selection — no category has default priority.
- Category deduplication applied post-shuffle: max 1 hint per category; first occurrence after shuffle wins.
- Rotation via module-level `_lastHints`: hints used in the previous call are filtered out to avoid repeating the same guidance. Dead-cycle guard: if all candidates were filtered, allows reuse of the first post-shuffle candidate.
- All hint strings follow one of two exact formats: `"Prefer X if it fits the passage."` or `"Consider Y where it strengthens clarity."` — no other variation.

### src/components/AIPanel.jsx
- `buildAdaptiveHints` imported from `../utils/contextBuilder`.
- `buildSystemPrompt(step)` appends adaptive hints when `hints.length > 0` as a clearly separated `ADAPTIVE GUIDANCE:` section after all context rules. Never merged into the rules block.
- Rule added above hints: "Step-specific guidance takes priority over adaptive guidance."
- Rule added inside hints section: "Adaptive guidance reflects tendencies, not requirements. Do not force patterns where they do not fit the passage."

---

## 2026-04-02 — Persistent AI memory layer

### src/utils/memory.js (new file)
- Added `loadMemory()`, `saveMemory(memory)`, `getMemory()`, `updateMemory(partial)` — full localStorage-backed memory store under key `sermonforge_memory`.
- Memory shape: `{ style: { structurePreference, tone, illustrationStyle, applicationStyle }, patterns: { outlinePatterns[], phrasePatterns[] }, history: { recentMPTs[], recentPassages[] } }`.
- `updateMemory` deep-merges each section; arrays are deduplicated (string equality) and capped: outlinePatterns 20, phrasePatterns 30, recentMPTs 10, recentPassages 10.
- `dedupeAndCap(array, max)` exported helper — preserves first-seen order, slices from the tail so newest entries survive at capacity.
- `extractOutlinePattern(outline)` — converts a JSON outline array to an abstract movement pattern (`"movement: call → resist → restore"`). Strips stopwords via `OUTLINE_SKIP_WORDS`, normalizes verb suffixes (`-ing`, `-ed`, `-s`) via `normalizeVerb()`, reduces each point to 1 key concept word (2 max if first word < 4 chars). Returns null if fewer than 2 valid points.
- `extractPhrasePatterns(text)` — extracts sentence-starter phrases (first 4 words) that appear 3+ times in text. Only considers sentences of 8+ words. Ignores starters beginning with pronouns or conjunctions (`PHRASE_SKIP_FIRST_WORDS`). Returns array of matching phrases.
- `clearMemory()` — resets to empty shape, persists to localStorage, updates cache.
- `logMemory()` — logs grouped view of all three sections to console, returns the object.
- `window.memoryDebug = { getMemory, clearMemory, logMemory }` exposed for dev console access (guarded by `typeof window !== 'undefined'`).

### src/components/SermonWorkspace.jsx
- Added `lastCapturedHashRef` — tracks hash of `sermon.mpt + "|" + sermon.passage + "|" + sermon.outline` to prevent duplicate memory writes when content hasn't changed. Hash updated only when `updateMemory` is actually called.
- Added `captureMemory(sermon)` — extracts MPT → `history.recentMPTs`, passage → `history.recentPassages`, outline pattern → `patterns.outlinePatterns`, phrase patterns (up to 3) → `patterns.phrasePatterns`. Skips if partial is empty or hash unchanged. Called on debounce completion (inside `persistUpdate`) and on tab change (top of `handleTabChange`).
- Imports: `updateMemory`, `extractOutlinePattern`, `extractPhrasePatterns` from `../utils/memory`.

### src/utils/contextBuilder.js
- `buildMemoryContext(memory, step)` added — formats memory into a compact context string capped at 650 chars. Priority order (high to low, trimmed from bottom): `[PATTERN SIGNALS]` (outline movements + recurring phrases), `[RECENT THEMES]` (MPTs before passages), `[PASTORAL PATTERNS]` (style fields). Sections suppressed when empty. Signal gate: requires at least 1 pattern (outline or phrase) AND at least 2 history items; returns `""` otherwise.
- `buildTiers` extended with tier6 — `buildMemoryContext(getMemory(), step)`, gated by step via `resolveIncludes`. Returns null when step excludes memory.
- `resolveIncludes` extended with `memory` flag per step. Memory allowed: Redemptive Thread, MPT/MPS, Outline, Functional Elements, Manuscript. Memory blocked: Observe, Interpret, Implications, study, delivery, default.
- `assembleContext` emits `[PASTOR CONTEXT]` as the final section when `tier6` passes `isMeaningful`. Placed last so it shapes tone without biasing exegetical interpretation.
- `buildSystemPrompt` rule added: `[PASTOR CONTEXT]: Reflects established patterns and preferences. Use it to align tone, structure, and style. Do not let it override the passage.`
- Imports `getMemory` from `./memory`.

### src/components/AIPanel.jsx
- `captureResponsePatterns(response, step)` added — extracts up to 2 phrase patterns from AI responses; only runs for manuscript and outline steps (`CAPTURE_PATTERN_STEPS`). Filters out any phrase already in stored memory or in the last 3 stored phrases before calling `updateMemory`. Called at all three `sendAIMessage` sites with step passed through.
- `sendMessage` useCallback now accepts optional `step` third argument, passes it to `captureResponsePatterns`.
- Imports: `getMemory`, `updateMemory`, `extractPhrasePatterns` from `../utils/memory`.

---

## 2026-04-02 — Add fallback context in buildContext() when assembled result is sparse

### src/utils/contextBuilder.js
- `buildContext` now checks the assembled result before returning. If it is empty or shorter than 50 characters (trimmed), it falls back to a minimal `[PASSAGE & MPT]` block built directly from `normalized.passage` and `normalized.mpt`. This bypasses the tier/isMeaningful pipeline so the core anchor is always present. Returns `""` only if both fields are also empty.

---

## 2026-04-02 — Move dedupeText to per-section scope in assembleContext

### src/utils/contextBuilder.js
- `assembleContext` now calls `dedupeText(sectionStr)` on each section individually before pushing to the sections array. Each call gets a fresh `seenLines` Set, so deduplication is scoped to the section — no cross-section content is merged or removed.
- `buildContext` no longer wraps `assembleContext(tiers)` in `dedupeText`; cleanup happens inside assembly.
- Added `if (key === "---") return true` guard to `dedupeText` line-dedup pass. The `---` chunk delimiters in `[SUPPORTING MATERIAL]` are structural, not content, and must never be collapsed.
- `dedupeText` updated in JSDoc to note the `---` exemption alongside the existing `[`-header exemption.

---

## 2026-04-02 — Explicit step gating in resolveIncludes(); remove default catch-all

### src/utils/contextBuilder.js
- Every step is now mapped explicitly in `resolveIncludes`: OBSERVE, INTERPRET, REDEMPTIVE_THREAD, IMPLICATIONS, MPT_MPS, OUTLINE, FUNCTIONAL_ELEMENTS, MANUSCRIPT, plus EXEGESIS / "study" / "delivery" as conservative known cases.
- IMPLICATIONS: tier1 + tier2 + tier4 (series context, optional) only — no structure, no externals.
- FUNCTIONAL_ELEMENTS: tier1 + tier2 + tier3 — same as OUTLINE (structure needed, no externals).
- Default branch (true unknown steps) now returns tier1-only instead of all-tiers. Unknown step = safest fallback, not a license to dump everything.
- EXEGESIS ("step-1"), "study", and "delivery" are mapped explicitly to tier1-only; EXEGESIS is a parent container step that should resolve to a phase before reaching this function.

---

## 2026-04-02 — Add per-chunk cap to tier5 assembly for source diversity

### src/utils/contextBuilder.js
- Added `TIER5_CHUNK_CAP = 1200` constant. Each chunk is trimmed to this cap before being counted against the 3000-char total budget. A single large chunk can now contribute at most 1200 chars, guaranteeing room for at least 2–3 sources within the combined budget.
- `pickTier5Chunks` now calls `trimStr(chunk, TIER5_CHUNK_CAP)` before the budget check. The budget check is applied after capping, so the skip condition (`capped.length <= remaining`) still works correctly.

---

## 2026-04-02 — Fix tier1 budget split to guarantee both passage and MPT survive

### src/utils/contextBuilder.js
- Tier 1 budget is now split 60/40 (passage: 900 chars, MPT: 600 chars at the 1500-char limit) instead of passage-first with MPT getting the remainder. Previously a long passage could consume the entire budget and silently drop the MPT. Both fields are now guaranteed to be present regardless of individual length.

---

## 2026-04-02 — Improve rankChunks() keyword matching precision

### src/utils/contextBuilder.js
- Expanded `STOP_WORDS` from 28 to ~55 entries, adding prepositions (into, upon, onto, over, under, about, through, between, among, against, within, without, along), pronouns (me, us, him, them, whom, you, your), auxiliaries (were, being, does), and determiners (these, those, whom, also, then, when, how, any, both, each, more, most, own, same, than).
- Rewrote `countMatches(chunkKeywords, targetKeywords)` to take two pre-extracted keyword Sets and count their intersection. Token-exact matching: "man" no longer matches "manifold", "command", or "roman".
- Updated `rankChunks` to call `extractKeywords(chunk)` once per chunk and pass the resulting Set to all four `countMatches` calls. Book name check retains phrase-level `includes` since multi-word book names (e.g. "1 Corinthians") require phrase matching, not token matching.

---

## 2026-04-02 — Gate assembleContext sections on isMeaningful()

### src/utils/contextBuilder.js
- Added `isMeaningful(text)` — returns true only when text is non-null, non-whitespace, and longer than 20 characters after trimming. The threshold filters labels, empty fields, and stub content that add noise without signal.
- Applied `isMeaningful` to every field and chunk before inclusion: passage, MPT, MPS, exegesis summary, outline, functional elements text, series summary, and each individual library/theology chunk.
- "Library:" and "Theology:" sub-labels in `[SUPPORTING MATERIAL]` are now guarded by boolean flags — emitted only when at least one meaningful chunk of that type is present.
- Entire sections (`[PASSAGE & MPT]`, `[INTERPRETATION]`, etc.) are still suppressed when no lines pass the check, as before.

---

## 2026-04-02 — Expand buildSystemPrompt() with tier-specific rules

### src/components/AIPanel.jsx
- `buildSystemPrompt(step)` now includes explicit per-tier rules keyed to the section labels in `assembleContext` output: PASSAGE & MPT = authoritative; INTERPRETATION = primary interpretive lens; STRUCTURE = working guide (respect unless under review); SERIES CONTEXT = optional alignment only; SUPPORTING MATERIAL = support only, never overrides text.
- Step descriptions changed from "Currently..." to "The pastor is..." to match the model's third-person perspective.
- No sermon data added — rules reference section labels only.

---

## 2026-04-02 — Add dedupeText() to contextBuilder; apply to final context output

### src/utils/contextBuilder.js
- Added `dedupeText(text)` — cleans assembled context in three passes: (1) removes exact duplicate non-header lines, keeping first occurrence; (2) deduplicates sentences within long prose lines (>60 chars) by splitting on `.!?` boundaries, ignoring fragments <20 chars; (3) collapses runs of 3+ consecutive blank lines to a single blank line. Trailing whitespace is trimmed per line and globally.
- Section headers (lines starting with `[`) are always kept and never compared for deduplication, preserving structural skeleton.
- `buildContext` now calls `dedupeText(assembleContext(tiers))` as the final pipeline step.

---

## 2026-04-02 — Complete contextBuilder migration in AIPanel; remove all old context assembly

### src/components/AIPanel.jsx
- Updated `handleLibrarySearch` to use `buildSystemPrompt(step)` + `buildContext({ sermon, step, libraryChunks })`. Library manuscript excerpts are now passed as `libraryChunks` through the ranking and tiering pipeline instead of being appended raw to the user message.
- Removed the last inline system prompt string from `handleLibrarySearch` ("You are a sermon preparation assistant with access to the preacher's past sermons...").
- All three `sendAIMessage` call sites in AIPanel now use `buildSystemPrompt(step)` for the system prompt and `buildContext` for the context payload.
- `getReviewPrompt`, `getSuggestions`, and `handleSeriesCoherenceCheck` unchanged — these produce specialized task prompts with data embedded in the user message, which is the correct pattern and not "context assembly."

---

## 2026-04-02 — Wire context pipeline into AIPanel; separate system prompt from context payload

### src/utils/contextBuilder.js
- `buildContext()` now runs the full pipeline: `normalizeSermon → summarizeExegesis/Outline/Series → buildTiers → assembleContext`. Returns a structured data string, not a system prompt.
- Removed the old monolithic prompt-building logic that duplicated `buildContextSystemPrompt`.

### src/components/AIPanel.jsx
- Imported `buildContext` from `../utils/contextBuilder`.
- Renamed `buildContextSystemPrompt` → `buildSystemPrompt(step)`. Now contains role, rules, and step framing only — no sermon data.
- Added "The pastor's sermon context is provided at the start of each message." to orient the model.
- Updated `handleSendInput` (both regular and theology paths): system prompt comes from `buildSystemPrompt(step)`, user message is formatted as `CONTEXT:\n{context}\n\nUSER REQUEST:\n{input}`.
- Theology path now passes chunks through `buildContext({ sermon, step, theologyChunks })` instead of appending raw excerpts to the user message. Chunks are ranked and limited by the pipeline before inclusion.
- All other `sendMessage` callers (review prompts, suggestions, series coherence, external messages) continue to supply their own explicit system prompts — unchanged.

---

## 2026-04-02 — Add assembleContext() to contextBuilder.js

### src/utils/contextBuilder.js
- Added `assembleContext(tiers)` — formats the tier object into a structured, labelled context string. Sections: `[PASSAGE & MPT]`, `[INTERPRETATION]`, `[STRUCTURE]`, `[SERIES CONTEXT]`, `[SUPPORTING MATERIAL]`. Each section only emitted when it has content.
- Added private `formatFunctionalElements(fe)` — renders each functional element entry as `Point N — Explanation: ... | Application: ... | Illustration: ...`, sorted by numeric key, skipping empty fields and empty entries.
- Supporting material chunks are wrapped in `---` delimiters, grouped under `Library:` and `Theology:` sub-labels.
- Data only — no instructions in the output.

---

## 2026-04-02 — Step-conditional tier inclusion in buildTiers()

### src/utils/contextBuilder.js
- Added `resolveIncludes(step)` — maps each step/tab to a set of boolean flags controlling which tiers and chunk sources are active. Tier 1 is always included. Unlisted steps default to all tiers.
- Step rules: Observe → tier1 only. Interpret → tier1+2. Redemptive Thread → tier1+2+theology. MPT/MPS → tier1+2. Outline → tier1+2+3. Manuscript → all. Default → all.
- Updated `buildTiers` to return `null` for excluded tiers rather than empty objects, giving callers a clean signal. Tier 4 is additionally suppressed when `compressed.series` is empty (no series big_idea present), regardless of step.
- For Redemptive Thread, `rankChunks` is only called for theology; library array is skipped entirely.
- **First intentional behavior change** — tiers are now filtered by step.

---

## 2026-04-02 — Enforce per-tier size limits in buildTiers()

### src/utils/contextBuilder.js
- Added `TIER_LIMITS` constant: tier1=1500, tier2=2500, tier3=2500, tier4=1200, tier5=3000 chars.
- Added `trimStr(str, max)` — truncates a string to `max` characters; safe on null/undefined.
- Added `trimFunctionalElements(obj, budget)` — if the JSON-serialized object exceeds budget, proportionally scales down all string values across all entries. Returns original object unchanged if it fits.
- Added `pickTier5Chunks(library, theology, limit)` — greedily picks from pre-ranked library chunks first, then theology chunks, skipping any chunk that would exceed the remaining budget. Does not truncate individual chunks.
- Updated `buildTiers` to apply limits: within each tier, higher-priority fields consume budget first and lower-priority fields get the remainder. Tier5 now calls `pickTier5Chunks` after ranking.

---

## 2026-04-02 — Add rankChunks() and wire into buildTiers()

### src/utils/contextBuilder.js
- Added `rankChunks(chunks, normalized)` — scores each chunk using passage book name (+5), MPT keyword matches (+4 each), MPS keyword matches (+3 each), outline keyword matches (+2 each), and general keyword overlap (+1 each). Returns a new array sorted by score DESC; equal-score chunks retain original order. Does not mutate input.
- Added private helpers: `extractKeywords(text)` (splits on non-word chars, filters stop-words and tokens < 3 chars), `extractBookName(passage)` (strips chapter:verse suffix to isolate book name), `countMatches(chunk, keywords)` (counts keyword occurrences in a chunk).
- Updated `buildTiers` to rank `libraryChunks` and `theologyChunks` via `rankChunks` before placing them in tier5. Count is not yet limited.

---

## 2026-04-02 — Add buildTiers() to contextBuilder.js

### src/utils/contextBuilder.js
- Added `buildTiers({ normalized, compressed, libraryChunks, theologyChunks, step })` — groups pre-computed context data into five priority tiers without filtering, truncating, or ranking.
- Tier 1: passage + mpt (highest priority). Tier 2: mps + compressed exegesis. Tier 3: compressed outline + functional elements. Tier 4: series/section summary. Tier 5: library and theology chunks (lowest priority).
- `step` is accepted but unused — reserved for future step-aware tier filtering.
- Not yet called anywhere. Internal pipeline scaffold only.

---

## 2026-04-02 — Add compression helpers to contextBuilder.js

### src/utils/contextBuilder.js
- Added `summarizeExegesis(sermon)` — joins non-empty observations, interpretation, redemptive_thread, and implications into a single `"|"`-separated paragraph. Returns `""` if all fields are empty.
- Added `summarizeOutline(outline)` — reduces each point to one numbered line, stripping any existing leading numbering. Returns `""` for empty outlines.
- Added `summarizeSeries(series, section)` — combines series and section big ideas into a single `";"`-separated sentence. Returns `""` if neither is present.
- All three functions are pure with no side effects, not yet called anywhere.

---

## 2026-04-02 — Add normalizeSermon() to contextBuilder.js

### src/utils/contextBuilder.js
- Added `normalizeSermon(sermon)` — converts a raw sermon record into a clean object with guaranteed shapes: `passage`, `mpt`, `mps`, `outline` (via `getOutline`), `functionalElements` (via `getFunctionalElements`), `series: { title, big_idea } | null`, `section: { big_idea } | null`.
- `series` is null when both title and big_idea are absent; `section` is null when big_idea is absent. Avoids null-check proliferation in downstream pipeline stages.
- Safe to call with null/undefined sermon — all fields default to empty string/array/object.
- No existing behavior changed. Internal prep only.

---

## 2026-04-02 — Add contextBuilder.js scaffold for multi-stage context pipeline

### src/utils/contextBuilder.js (new file)
- Added `buildContext({ sermon, step, libraryChunks, theologyChunks })` — exported function that replicates the existing `buildContextSystemPrompt` logic from AIPanel.jsx verbatim.
- Accepts a unified `step` parameter (replaces the separate `activeTab`/`activeStep` pair) that maps identically to the existing step context table.
- `libraryChunks` and `theologyChunks` params are accepted but unused — reserved as the injection points for future retrieval pipeline stages.
- No existing code modified. This is a clean insertion point only.

---

## 2026-04-02 — Series-aware sermon loading and AI context; Series Coherence Check action

### src/components/SermonWorkspace.jsx
- Load effect refactored from `.then()` chain to `async function load()` to support parallel follow-up fetches.
- After fetching the sermon, `getSeriesById` and `getSectionsBySeries` are called in parallel (via `Promise.all`) using the sermon's `series_id` and `section_id`.
- Section is resolved by filtering the sections array by `section_id` — avoids adding a new IPC handler.
- Fetches are gated: series fetch only if `series_id` present; sections fetch only if both `series_id` and `section_id` present. One-off sermons incur zero extra IPC calls.
- Result attached directly to the sermon object before `setSermon`: `sermon.series` (object or null), `sermon.section` (object or null). No second state update.
- Error label updated to `"SermonWorkspace load error:"` for consistency.
- Added `getSeriesById` and `getSectionsBySeries` to the database import.

### src/components/AIPanel.jsx
- `buildContextSystemPrompt`: appended lightweight series block after MPT/MPS. Reads `sermon.series.title`, `sermon.series.big_idea`, `sermon.section.big_idea` via optional chaining. Each field included only if non-empty. Instruction appended once at end of block: "Use series context only when it meaningfully strengthens the response. Do not force alignment." Entire block omitted when no series data is present.
- Added `handleSeriesCoherenceCheck()`: builds a prompt from MPT, outline points, series big idea, and section big idea (each gated on presence). Sends three-question evaluation to AI: (1) where alignment is strong, (2) where divergence exists, (3) whether divergence is textually warranted or distracting. System prompt names the evaluative role and explicitly permits divergence when the text requires it.
- Added "Check Series Alignment" button in the panel footer, between "Review My Work" and the theology toggle. Rendered conditionally on `sermon?.series?.big_idea` — invisible for one-off sermons or series without a big idea. Uses `btn-ghost` to distinguish from the primary "Review My Work" action.

---

## 2026-04-02 — Manuscript template preload, framework builder, sermon shape preview, label clarity

### src/components/ManuscriptTab.jsx
- Added `buildTemplate(sermon)` — assembles a structured manuscript template from existing fields (MPT, MPS, passage, outline). Body section omitted if outline is empty.
- Added `useEffect` on mount: if manuscript is empty or whitespace-only, preloads the template automatically. Never overwrites existing content.
- Added "Build Manuscript Framework" button in the manuscript toolbar. If manuscript is empty, replaces immediately; if content exists, prompts with `confirm()` before overwriting. Reuses `buildTemplate` — no duplication.

### src/components/StudyTab.jsx
- Added `SermonShapePreview` component (read-only): renders sermon structure (Introduction with MPT/MPS, Body with outline points and E/A/I tags) from existing data. Renders only sections that have data; returns null if both intro and body are empty. Inserted between the step indicator and the active step content — visible across all steps.
- `FuncElem` field labels changed from `E Explanation` / `A Application` / `I Illustration` to `Explanation (E)` / `Application (A)` / `Illustration (I)` for improved readability.

### src/components/OutlineTab.jsx
- Renamed outline section card title from "Sermon Outline" to "Sermon Body Structure" for template alignment.

---

## 2026-03-31 — Theology library: lazy load + scored search

### electron/main.js
- `SQL` promoted to module-level variable (stored during `initDatabase`) so the lazy loader can use it outside that scope.
- Removed eager theology.db load from `initDatabase()`.
- Added `ensureTheologyDbLoaded()`: async, no-op if already loaded; reads theology.db from disk and constructs a sql.js instance on first call. theology.db now loads only when a theology IPC handler is first invoked.
- `theology-status`, `theology-search`, `theology-get-chunks` handlers converted to async; each calls `ensureTheologyDbLoaded()` before proceeding.
- `theology-search` now scores results: for each keyword term, `author` match = +5, `work` match = +3, `text` match = +1; results ordered by total score DESC before LIMIT, so higher-relevance chunks surface first. Keyword extraction also strips punctuation before matching.

---

## 2026-03-31 — Theology library integration

### electron/main.js
- Added `theologyDb` variable; loaded at startup from `theology.db` (same directory as `sermonforge.db`) as a second read-only sql.js instance.
- Added `queryTheology()` helper (mirrors `queryAll` but targets `theologyDb`).
- Added `theology-status` IPC handler — returns `{ available: bool }`.
- Added `theology-search` IPC handler — keyword LIKE search across `author`, `work`, `text` columns; returns up to N chunks truncated to 600 chars.
- Added `theology-get-chunks` IPC handler — fetch by IDs with configurable maxChars truncation.
- Note: theology.db is 173MB / 160K rows; merging into main DB would make every startup load ~180MB into WASM memory, so it is kept as a companion file.

### electron/preload.js
- Exposed `getTheologyStatus`, `searchTheologyLibrary`, `getTheologyChunks` on `window.electronAPI`.

### src/db/database.js
- Added `getTheologyStatus`, `searchTheologyLibrary`, `getTheologyChunks` exports.

### src/components/AIPanel.jsx
- Added `theologyAvailable` state (checked on mount via `getTheologyStatus`).
- Added `theologyEnabled` toggle state.
- Modified `handleSendInput`: when the toggle is on, runs theology search on the user's query, injects top ≤5 chunks (≤600 chars each) as labeled excerpts (`[Author — Work]`) before sending to AI.
- Added "Search Theology Library" checkbox in panel footer, shown only when `theologyAvailable` is true.

---

## 2026-03-31 — Harden AI wrapper, fix listener leak, transaction safety, debounced saves, AI module extraction, guardrails

### src/utils/ai.js
- Added input validation: rejects non-array `messages` or non-string `systemPrompt` with a logged error and empty-string return.
- Added `try/catch` around IPC call; logs structured context (message count, first role) on failure.
- Added null/undefined guard on response.
- Added dev-only timing logs (gated on `import.meta.env.DEV`): logs request start, message count, and duration in ms.

### electron/preload.js
- `onLibraryImportProgress` now captures the handler in a local variable and returns an unsubscribe function (`() => ipcRenderer.removeListener(...)`).

### src/components/Library.jsx
- `useEffect` now captures the returned unsubscribe function and returns it as the cleanup, so the progress listener is removed on unmount.
- Fixes listener accumulation on hot reload or repeated navigation.

### electron/main.js — transaction safety
- `db-deleteSeries` handler: three separate `db.run()` calls wrapped in `BEGIN`/`COMMIT`/`ROLLBACK`. `saveDb()` only called after `COMMIT`.
- `db-deleteSection` handler: same fix applied (two-statement race with identical pattern).

### electron/main.js — debounced saves
- `saveDb()` converted to a debounced scheduler (500ms). Rapid sequential writes coalesce into one disk write.
- New `flushDb()` performs the actual synchronous write and cancels any pending timer.
- `window-all-closed` handler updated to call `flushDb()` directly, ensuring pending writes are never dropped on quit.

### electron/ai.js (new)
- Extracted Anthropic client initialization and `ai-message` IPC handler from `main.js` into a dedicated module.
- Exports `registerAIHandlers(ipcMain)`.
- Startup validation: logs a clear error at launch if `ANTHROPIC_API_KEY` is missing; client stays `null`.
- Handler guards against null client and returns a human-readable string rather than throwing.

### electron/main.js — AI extraction wiring
- Removed inline Anthropic client block and `ai-message` handler (~20 lines).
- Added `require("./ai")` and `registerAIHandlers(ipcMain)` call.

### CLAUDE.md
- Added `## GUARDRAILS` section: boundaries (no raw `window.electronAPI`, no raw SQL outside DB layer, all AI through `sendAIMessage`), no-silent-failures rule, no-duplication rule, change discipline, pre-completion checklist.
- Updated `electron/` structure entry to include `ai.js`.

---

## 2026-03-30 — Centralize all AI calls through a single wrapper module

### src/utils/ai.js (new)
- Exports `sendAIMessage(messages, systemPrompt)` — the single choke point for
  all Claude API calls in the renderer.
- `window.electronAPI.sendAIMessage` now appears in exactly one place in `src/`.
- No backend changes; the IPC channel and call signature are unchanged.

### src/components/AIPanel.jsx
- Imports `sendAIMessage` from `../utils/ai`.
- Replaced 2 direct `window.electronAPI.sendAIMessage` calls:
  one in `sendMessage` (conversational chat), one in `handleLibrarySearch`.

### src/components/StudyTab.jsx
- Imports `sendAIMessage` from `../utils/ai`.
- Replaced 1 direct call in `generateSummary`.

### src/components/Library.jsx
- Imports `sendAIMessage` from `../utils/ai`.
- Replaced 1 direct call in the quick-outline generation function.

### src/components/Dashboard.jsx
- Imports `sendAIMessage` from `../utils/ai`.
- Replaced 1 direct call in the sermon reorientation summary function.

### src/components/SeriesPlanner.jsx
- Imports `sendAIMessage` from `../utils/ai`.
- Redirected the existing local `askAI` wrapper to call `sendAIMessage` instead
  of `window.electronAPI.sendAIMessage` directly. The 7 `askAI` call sites inside
  the component are unchanged.

---

## 2026-03-30 — Centralize step/phase name strings in shared constants file

### src/constants/steps.js (new)
- `STEPS` object: `EXEGESIS`, `MPT_MPS`, `OUTLINE`, `FUNCTIONAL_ELEMENTS` ("step-1"–"step-4")
- `PHASES` object: `OBSERVE`, `INTERPRET`, `REDEMPTIVE_THREAD`, `IMPLICATIONS` ("phase-1"–"phase-4")
- `PHASE_SEQUENCE` and `STEP_SEQUENCE` frozen arrays for numeric-indexed access in StudyTab
  (`PHASE_SEQUENCE[n - 1]` replaces template literal `` `phase-${n}` ``)
- All objects frozen with `Object.freeze` to prevent accidental mutation

### src/components/StudyTab.jsx
- Added import of `STEPS`, `PHASES`, `PHASE_SEQUENCE`, `STEP_SEQUENCE`
- Replaced 6 hardcoded step-name call sites:
  - `onStepChange?.("step-2")` → `onStepChange?.(STEPS.MPT_MPS)`
  - `` onStepChange?.(`phase-${next}`) `` → `onStepChange?.(PHASE_SEQUENCE[next - 1])`
  - `` onStepChange?.(`step-${next}`) `` → `onStepChange?.(STEP_SEQUENCE[next - 1])`
  - `` onStepChange?.(`step-${step}`) `` → `onStepChange?.(STEP_SEQUENCE[step - 1])`
  - `` onStepChange?.(`phase-${phase}`) `` → `onStepChange?.(PHASE_SEQUENCE[phase - 1])`

### src/components/AIPanel.jsx
- Added import of `STEPS`, `PHASES`
- Replaced all hardcoded step/phase strings with constants:
  - `handleLibrarySearch`: 4 `activeStep === "phase-X"` comparisons
  - `buildContextSystemPrompt`: all 8 step/phase keys in `stepContext` object
  - `getSuggestions`: 1 `activeStep === "phase-3"` comparison
  - `getReviewPrompt`: 4 keys in `phasePrompts` object, 2 step comparisons
- Removed legacy normalization block (`"observe"` → `"phase-1"` etc.) — these names
  are not emitted by any current code path; confirmed by grep across entire src/
- `if (normalizedStep && phasePrompts[normalizedStep])` simplified to
  `if (activeStep && phasePrompts[activeStep])` — equivalent with no dead mapping

**Why:** Step name strings were duplicated in StudyTab (emit) and AIPanel (consume) with
no shared contract. A rename in one file would silently break the other — the mismatch
would only surface at runtime when a specific UI path was exercised. The constants file
makes the contract explicit and colocated.

---

## 2026-03-30 — Unify AI loading state: AIPanel becomes controlled component

### src/components/AIPanel.jsx
- Removed `const [loading, setLoading] = useState(false)` — AIPanel no longer owns loading state
- Added `loading` to props: AIPanel reads the value from SermonWorkspace via prop
- Removed all four `setLoading(true/false)` calls (two in `sendMessage`, two in `handleLibrarySearch`)
- `onLoadingChange?.(true/false)` calls remain as the write channel: AIPanel drives the value
  it no longer stores

### src/components/SermonWorkspace.jsx
- Added `loading={aiLoading}` to AIPanel's JSX — closes the controlled-component contract

**Loading call sites — exactly two true/false pairs, both in finally blocks:**
- `sendMessage`: `onLoadingChange?.(true)` before await → `onLoadingChange?.(false)` in finally
- `handleLibrarySearch`: `onLoadingChange?.(true)` before await → `onLoadingChange?.(false)` in finally

**Before:** Two `useState` tracked the same boolean. AIPanel's `setLoading` and
SermonWorkspace's `aiLoading` were both set in every AI call path. Forgetting either
`setLoading` or `onLoadingChange` in a future code path would silently desync them.

**After:** One `useState` in SermonWorkspace (`aiLoading`). AIPanel reads it as a prop,
writes it via `onLoadingChange`. Adding a new AI path only requires the two `onLoadingChange`
calls — no parallel local state to keep in sync.

---

## 2026-03-30 — Replace triggerRef with explicit prop contract between SermonWorkspace and AIPanel

### src/components/SermonWorkspace.jsx
- Removed `aiTriggerRef = useRef(null)` and the `async handleAI` function that awaited it
- Added `pendingMessage` state and `pendingIdRef` counter ref
- `handleAI(prompt, systemPrompt)` is now a synchronous function that sets `pendingMessage`
  with an incrementing `id` field — ensures repeated identical prompts each produce a new
  object reference and always trigger AIPanel's effect
- `aiLoading` state retained; now driven exclusively by AIPanel's `onLoadingChange` callback
  rather than tracked independently via `await`
- AIPanel receives `externalMessage={pendingMessage}` and `onLoadingChange={setAiLoading}`
  in place of `triggerRef={aiTriggerRef}`

### src/components/AIPanel.jsx
- Removed `triggerRef` prop and the `useEffect(() => { triggerRef.current = sendMessage; })`
  block (no dependency array — ran on every render)
- Added `externalMessage` and `onLoadingChange` props with explicit purpose
- Added `messagesRef` (updated every render) so `sendMessage` always reads current
  conversation history regardless of when it is called from an effect
- `sendMessage` converted to `useCallback` with `[onLoadingChange]` dependency, making its
  contract explicit and stable
- `sendMessage` calls `onLoadingChange?.(true/false)` around the API call so SermonWorkspace's
  `aiLoading` state is driven by one source of truth
- `handleLibrarySearch` now also calls `onLoadingChange?.(true/false)` — previously the
  library search set AIPanel's loading state but never propagated to SermonWorkspace, leaving
  the Study/Manuscript Review buttons enabled during a library search

**Why:** The ref pattern created a hidden function-pointer dependency: AIPanel wrote its
internal `sendMessage` into a ref owned by SermonWorkspace on every render, and SermonWorkspace
called it as if it were a stable interface. Two independent loading states (SermonWorkspace's
`aiLoading` and AIPanel's `loading`) tracked the same async operation through separate code
paths. The new pattern uses explicit props with named contracts — no function pointers, one
source of loading truth, and a clear data flow direction.

---

## 2026-03-30 — buildUpdate: surface unknown fields instead of silently dropping them

### electron/main.js
- `buildUpdate()` now detects field names not present in the allowlist before filtering
- Dev (not packaged): throws `Error` with the rejected field names and the full allowed
  list — surfaced immediately as an IPC rejection in the renderer console
- Production (`app.isPackaged`): `console.warn` with the same detail — update proceeds
  with valid fields only, no crash
- Uses `app.isPackaged` as the gate (set by Electron, not by an env var) so the behavior
  is reliable regardless of how the app is launched

**Why:** Previously, passing a typo'd or renamed field (e.g. `{ sermon_mpt: "..." }`) to
`updateSermon` silently produced a no-op update with no indication anything went wrong.
The caller received success, the field was not saved, and the bug was invisible.

---

## 2026-03-30 — Move all SQL to main process; close raw IPC SQL channels

### electron/main.js
- Removed `db-query` and `db-run` IPC handlers (raw SQL pass-through channels)
- Added column allowlists: `SERMON_COLUMNS`, `SERIES_COLUMNS`, `SECTION_COLUMNS` (Set<string>)
- Added `buildUpdate(fields, allowedColumns)` helper — strips unknown column names before
  building SET clauses, preventing unrecognized fields from reaching the DB
- Added 23 named IPC handlers covering all database operations previously in database.js:
  db-getAllSermons, db-getSermonById, db-createSermon, db-updateSermon, db-deleteSermon,
  db-getAllSeries, db-getSeriesById, db-createSeries, db-updateSeries, db-deleteSeries,
  db-getSermonsBySeries, db-getSectionsBySeries, db-createSection, db-updateSection,
  db-deleteSection, db-getCalendarNotes, db-createCalendarNote, db-deleteCalendarNote,
  db-getAllIllustrations, db-createIllustration, db-deleteIllustration,
  db-deleteLibraryItem, db-getRecentSermons
- Multi-step operations (deleteSeries, deleteSection, deleteLibraryItem) now call db.run()
  directly and issue one saveDb() at the end instead of saving after every statement

### electron/preload.js
- Removed `dbQuery(sql, params)` and `dbRun(sql, params)` — raw SQL is no longer a
  first-class API function on window.electronAPI
- Added named wrappers for all 23 database operations (matching main.js handlers exactly)
- No other changes; library/AI/Logos API surface is unchanged

### src/db/database.js
- Removed `export const db` (the raw query/run object) — no renderer code can now
  bypass named functions to send arbitrary SQL
- Removed all SQL strings; file is now 40 lines of named forwarding functions
- All exported function signatures are unchanged — no component imports needed updating
- ID generation moved to main.js (uses Node crypto.randomUUID); browser crypto.randomUUID
  fallback removed as unnecessary

**Why:** The `db-query` and `db-run` IPC channels accepted arbitrary SQL strings from the
renderer, making the entire database schema an implicit contract in the renderer process.
Any future column rename or table change required hunting SQL strings across UI files.
The named handler approach means schema knowledge lives only in main.js alongside the
CREATE TABLE statements and migrations that define it.

---

## 2026-03-30 — JSON column safety: typed accessors for `outline` and `functional_elements`

### src/utils.js
- Added four typed JSON column accessors: `getOutline(sermon)`, `serializeOutline(outline)`,
  `getFunctionalElements(sermon)`, `serializeFunctionalElements(data)`
- Each accessor validates shape (array vs plain object) and logs a `console.warn` with the
  sermon ID and raw value when data is malformed, rather than silently returning a fallback
- Serializers validate input type before calling `JSON.stringify` and log `console.error`
  if passed the wrong type, returning a safe empty value instead of storing garbage
- `tryParse` retained as the low-level primitive for other uses in the codebase

### src/components/StudyTab.jsx
- All `tryParse` calls replaced with typed accessors:
  - `funcData` initializer: `tryParse(sermon.functional_elements, {})` → `getFunctionalElements(sermon)`
  - `outline` at render: `tryParse(sermon.outline, [])` → `getOutline(sermon)`
  - `outline` inside `advanceStep()`: same replacement
  - `OutlineBuilder` `onUpdate`: `JSON.stringify(newOutline)` → `serializeOutline(newOutline)`
  - `updateFuncData`: `JSON.stringify(next)` → `serializeFunctionalElements(next)`

### src/components/OutlineTab.jsx
- `tryParse(sermon.outline, [])` → `getOutline(sermon)`
- `JSON.stringify(newOutline)` → `serializeOutline(newOutline)`

### src/components/ManuscriptTab.jsx
- `tryParse(sermon.outline, [])` → `getOutline(sermon)` in `runTuneUp()`

### src/components/AIPanel.jsx
- Both `tryParse(sermon?.outline, [])` calls in `getReviewPrompt()` → `getOutline(sermon)`

**Why:** Ten call sites were parsing/serializing JSON fields independently with no shape
validation. Malformed data (corrupted write, shape mismatch) silently returned empty
fallbacks and could be overwritten with clean-but-empty state on the next save, causing
permanent data loss with no indication. The typed accessors surface these problems in the
Electron DevTools console (tagged with field name and sermon ID) while keeping identical
runtime behavior for all well-formed existing data.

---

## 2026-03-30 — Audit fixes (medium severity): code cleanup, outline consolidation, stage control, CSS purge

### src/components/AIPanel.jsx
- Removed dead `phaseContent` object from `getReviewPrompt()` — was built but never read
- Replaced local `tryParseOutline()` with `tryParse` imported from `../utils` (same logic, single source)
- Added `import { tryParse } from "../utils"`

### src/db/database.js
- Removed dead exports `getDashboardStats` and `getUpcomingSermons` — neither was imported or called anywhere

### src/utils.js
- Fixed `formatDate()` to strip time component before parsing: now handles both
  `"2026-03-20 14:23:00"` (SQLite format) and `"2026-03-20T14:23:00"` (ISO format)
  correctly. Previously appended `T00:00:00` to a string that may already have a time.

### src/components/SeriesPlanner.jsx
- Fixed CalendarTab `useEffect` dependency: changed `[sermons.length]` → `[sermons]`
  so schedule re-syncs when sermon dates are updated in place (not just when count changes)
- Added `description` field to OverviewTab — short tagline/subtitle for the series,
  below the title, saves to `series.description`
- Added `year` field to the color/canon/status row — numeric input, defaults to current year,
  saves to `series.year`

### src/components/Planning.jsx
- Replaced inline `gridTemplateColumns: "repeat(3, 1fr)"` with `className="series-grid"`
  — uses the responsive `auto-fill minmax(260px, 1fr)` layout already defined in CSS

### src/components/OutlineBuilder.jsx (new shared component)
- Extracted outline add/remove/reorder logic into a single shared component
- Used by both StudyTab (Step 3) and OutlineTab — previously each had independent copies

### src/components/StudyTab.jsx
- Removed inline `OutlineBuilder` function — now imports shared component
- Added `onTabChange` prop; Step 4 now has a "Continue to Outline Tab →" button
  that calls `onTabChange("outline")` to navigate to the Outline tab

### src/components/OutlineTab.jsx
- Replaced inline outline manipulation functions with shared `OutlineBuilder` component
- Removed duplicate add/remove/moveUp/moveDown/updatePoint logic

### src/components/SermonWorkspace.jsx
- Passes `onTabChange={handleTabChange}` to StudyTab so Step 4 can navigate out

### src/components/SermonList.jsx
- Stage badge replaced with interactive `<select>` dropdown on each sermon card
- Selecting "Archived" removes the card from the list immediately (archived sermons
  are filtered out of this view)
- Selecting any other stage updates the DB and re-renders the badge in place
- Click propagation stopped so stage changes don't open the sermon workspace
- `updateSermon` added to imports; `STAGES` renamed to `FILTER_STAGES` and
  `SERMON_STAGES` (includes "archived") added

### src/styles/global.css
- Removed dead CSS blocks (CSS bundle reduced ~3kB):
  `.btn-logos`, `.btn-logos:hover`
  `.stats-row`, `.stat-card`, `.stat-value`, `.stat-label`, `.stat-icon`
  `.big-idea-box`, `.big-idea-box::before`, `.big-idea-label`, `.big-idea-input`, `.big-idea-input::placeholder`
  `.section-divider`, `.section-header`, `.section-title`
  `.series-card-title`, `.series-card-desc`, `.series-card-meta`
  `.upcoming-list`, `.upcoming-item`, `.upcoming-item:last-child`, `.upcoming-item:hover`
  `.upcoming-date`, `.upcoming-info`, `.upcoming-title`, `.upcoming-passage`
  `.collapse-arrow`, `.collapse-arrow.open`
  `.two-col`, `.scroll-y`, `.scroll-y` scrollbar rules

### Verified
`npm start` — 53 modules (new OutlineBuilder.jsx), clean build, no errors or warnings.
CSS bundle: 23.30kB (was 26.28kB). Electron launched.

---

## 2026-03-30 — Audit fixes: migration order, illustration type, dead prop, calendar save

### electron/main.js
- Fixed schema migration order bug: v3 and v4 blocks were reversed — v4 ran before v3,
  then v3 stamped schema_version back to 3, causing v4 to re-run on every startup.
  Any install upgrading from v2 could also skip the library table creation entirely.
  Fixed by: (1) reordering blocks to v2 → v3 → v4, (2) using a mutable `version`
  variable that updates after each block so subsequent checks see the current version.
- Fixed illustrations table default: `type TEXT DEFAULT 'story'` → `DEFAULT 'personal'`.
  `"story"` is not a valid illustration type — illustrations created with the default
  were invisible under every filter tab.

### src/db/database.js
- Fixed `createIllustration` fallback: `data.type || "story"` → `data.type || "personal"`

### src/components/SermonWorkspace.jsx
- Removed dead `onTrigger={handleAI}` prop from AIPanel — AIPanel only uses `triggerRef`,
  never `onTrigger`. The prop was wired but ignored.

### src/components/AIPanel.jsx
- Removed `onTrigger` from component signature (was dead, never referenced)

### src/components/SeriesPlanner.jsx (CalendarTab)
- Fixed manual date entry being silently lost: `schedule` state now always initialises
  from existing sermon dates on mount (not only when hasDates was true). Previously,
  `handleDateChange` would map over an empty array and discard changes.
- Removed `generated` state and its two conditional guards on the Save buttons.
  "Save Dates" and "Save All Dates" now always show when sermons exist — no longer
  gated on "Suggest Sundays" having been clicked first.

### Verified
`npm start` — 52 modules, clean build, no errors or warnings. Electron launched.

---

## 2026-03-30 — Remove seed data

### electron/main.js
- Removed `seedDatabase()` function entirely — example series, sermons, and illustrations
  were re-inserted on every launch when the series table was empty, causing deleted records
  to reappear. No seed data is appropriate now that real data is in place.
- Removed the `if (seriesCount.c === 0) seedDatabase()` call from `initDatabase()`

### Verified
`npm start` — 52 modules, clean build, no errors or warnings. Electron launched.

---

## 2026-03-30 — AI Panel: free-form chat input, library search fix, step mapping fix

### src/components/AIPanel.jsx
- Added free-form chat input at the bottom of the panel — textarea with inline Send button.
  Enter sends, Shift+Enter adds a new line. Messages use a context-aware system prompt
  built from the current sermon (passage, MPT, MPS) and active tab/step.
- Added `buildContextSystemPrompt()` — constructs a step-aware system prompt so AI knows
  whether you're observing, interpreting, tracing the redemptive thread, forging the MPS,
  outlining, writing, etc.
- Fixed library search query: now extracts the book name from the passage reference
  (e.g. "Galatians" from "Galatians 1:1-5") as a reliable FTS anchor, combined with
  MPS/MPT and early observation keywords. Previously a passage like "Galatians 1:1" would
  produce a nearly empty query and return unranked alphabetical results. Also added an
  early warning if no passage/MPS/MPT is set.
- Fixed step name mapping in `getReviewPrompt()` — updated to match new phase/step names
  from the rewritten StudyTab ("phase-1" through "phase-4", "step-2" through "step-4").
  Legacy names ("observe", "interpret", etc.) retained as fallback aliases.
- Suggestion buttons changed from vertical column to horizontal wrapping chips (more compact).
  Added a redemptive-thread-specific suggestion that appears only in phase-3.
- Extracted Clear button to `.ai-clear-btn` class for cleaner styling.

### src/styles/global.css
- `.ai-suggestions`: changed to `flex-direction: row; flex-wrap: wrap`
- `.ai-suggestion-btn`: reduced padding, changed to pill border-radius
- Added: `.ai-clear-btn`, `.ai-input-row`, `.ai-input`, `.ai-send-btn`
- `.ai-panel-footer`: now uses flex column with consistent gap

### Verified
`npm start` — 52 modules, clean build, no errors or warnings. Electron launched.

---

## 2026-03-30 — Sermon workspace: staged Study tab with AI handoff summaries

### src/components/SermonWorkspace.jsx
- Removed stage dropdown (planning/study/outline/writing/ready/archived) — was unclear
  and not useful during active prep; stage field retained in DB for list-level badges
- Removed Central Proposition (big_idea) block from workspace topbar — field retained in DB

### src/components/StudyTab.jsx
- Fully rewritten from collapsible accordion to a staged, guided progression
- **Step indicator** across the top: four clickable pills (Exegesis / MPT/MPS / Outline /
  Functional Elements). Active step highlighted; clicking any step is the escape hatch
  to jump directly — no forced linear lock
- **Sub-phase indicator** within Step 1: tab-style row (Observe / Interpret / Redemptive
  Thread / Implications). Completed phases show a ✓ checkmark; clicking any phase jumps
  back to it
- **Staged flow**: only the active step/sub-phase is shown. "Continue to [next] →" button
  advances to the next phase or step
- **AI handoff summaries**: when "Continue →" is clicked, an AI call fires asynchronously
  via `window.electronAPI.sendAIMessage` (separate from the AI panel). When the response
  arrives, a summary block appears at the top of the new step. Summaries:
  - p2: key observations → orients Interpretation
  - p3: interpretive conclusions → orients Redemptive Thread
  - p4: Christ-connection summary → orients Implications
  - s2: full exegesis synthesis (all 4 phases) → orients MPT/MPS Forge
  - s3: MPT + MPS brief → orients Outline Builder
  - s4: outline + MPS brief → orients Functional Elements
- Summary generation is non-blocking: step advances immediately, summary fades in when ready
- Summaries stored in component state for the session; regenerated if sermon is reopened
- SubPhase component simplified (no self-collapsing header — parent controls visibility)
- All existing AI review buttons ("Review →", "Challenge My MPT", "Check MPT→MPS Chain",
  "Review Outline", "Review E/A/I Balance") retained unchanged

### src/styles/global.css
- Removed old .study-step, .study-step-header, .study-step-body, .sub-phase,
  .sub-phase-header, .sub-phase-title CSS (no longer used)
- Added: .study-stage-container, .step-indicator, .step-pill / .step-pill-active /
  .step-pill-done / .step-pill-future, .step-pill-num, .step-pill-label,
  .subphase-indicator, .subphase-pill / -active / -done / -future, .subphase-check,
  .study-step-active, .summary-block, .summary-label, .summary-content,
  .summary-loading, .step-advance

### Verified
`npm start` — 52 modules, clean build, no errors or warnings. Electron launched.
UI confirmed working.

---

## 2026-03-30 — Delete everywhere: inline confirmation replaces confirm() dialogs

### src/components/DeleteButton.jsx (new)
- Shared inline confirm component: normal state shows "Delete" text button,
  click reveals "Delete? Yes / Cancel" inline — no native dialog popup
- Always calls stopPropagation so it works safely inside clickable cards
- Accepts `small` prop for tighter contexts (card footers, inline rows)

### src/db/database.js
- Added `deleteLibraryItem(id)` — deletes from both `library` and `library_fts`

### SermonList.jsx, Archive.jsx
- Added DeleteButton to card footer; delete removes card from local state instantly

### Library.jsx
- Added DeleteButton to grid card footers and inside manuscript modal header
- Deleting from the modal also closes it and removes from search results

### Planning.jsx
- Replaced × button + confirm() with DeleteButton on series cards

### SermonWorkspace.jsx
- Replaced "Delete" button + confirm() with DeleteButton in topbar

### Illustrations.jsx
- Replaced × button + confirm() with DeleteButton on illustration cards

### SeriesPlanner.jsx
- Replaced × buttons + confirm() with DeleteButton on section headers and slot rows
- All deletes are DB-only — no files on disk are touched

---

## 2026-03-30 — Library: sermon cards now open full manuscript on click

### src/components/Library.jsx
- Cards were not clickable (`cursor: default`, no onClick) — fixed
- Clicking a card fetches the full manuscript via `getLibraryManuscripts` IPC
  and displays it in an overlay modal with title, passage, series, word count,
  and full text in Crimson Pro at reading size
- Modal closes on × button or clicking the backdrop

---

## 2026-03-30 — Dashboard redesign: Series Pipeline + Biblical Coverage

### src/components/Dashboard.jsx
- Removed "Upcoming Sermons" and "Active Series" panels
- Added **Series Pipeline** panel (left, wider): series grouped by status
  (Preaching Now / In Planning / Complete), compact cards with color accent bar,
  passage range, canon category badge, sermon count; click opens SeriesPlanner
- Added **Biblical Coverage** panel (right): series and sermon counts for OT,
  NT, Wisdom Literature, and Prophetic Books — neutral data display, no recommendations
- Removed `getUpcomingSermons` import and `upcoming` state (no longer used)
- Added `onOpenSeries` prop wired through to pipeline card clicks

### src/App.jsx
- Pass `onOpenSeries={openPlanner}` to Dashboard so pipeline cards open SeriesPlanner

---

## 2026-03-30 — Build system fixes + app icon

### package.json
- Added `author: "SermonForge"` (electron-builder warning)
- Moved build output from `release/` (inside OneDrive) to
  `C:/Users/rossa/AppData/Local/SermonForgeBuilds` — fixes rcedit
  "Unable to commit changes" error caused by OneDrive locking the .exe
  immediately after write
- Added `win.icon: "build/icon.ico"`

### build/icon.ico (new)
Generated via PowerShell + System.Drawing. Dark ink (#1a1410) background,
gold (#b8860b) border and "SF" lettering. 6 sizes: 16, 32, 48, 64, 128, 256px.
BMP-based ICO format (not PNG-embedded) for NSIS compatibility.

### appOutDir set to desktop SermonForge folder
`appOutDir` in package.json set to `C:/Users/rossa/OneDrive/Desktop/SermonForge`.
Every `npm run build` now updates the app the user actually runs directly.
Shortcut at `Desktop\SermonForge.lnk` requires no changes — already targets that folder.

### Verified
`npm run build` — clean, no errors or warnings.
Desktop app updated. Shortcut confirmed working.

---

## 2026-03-30 — Series Planning system (Phase 1)

### Architecture
Implemented the full series planning layer: Series → Sections → Sermon Slots hierarchy,
church calendar engine, and a dedicated Series Planner workspace.

### DB migration v4 (main.js `runMigrations()`)
- `series` table: added `big_idea`, `overview`, `passage_range`, `start_date`, `end_date`,
  `structural_outline`, `status` (planning|active|complete), `canon_category` (ot|nt|wisdom|prophetic)
- New table `series_sections`: id, series_id, title, passage_range, big_idea, overview, sort_order
- New table `calendar_notes`: id, date, type, label, notes — user-defined special dates
- `sermons` table: added `section_id` (FK to series_sections), `is_one_off` (integer flag)
- Fresh install CREATE TABLE statements updated to include all new fields
- Schema version bumped 3 → 4

### src/utils/churchCalendar.js (new)
Pure JS liturgical calendar utility. No external dependencies.
- `getEaster(year)` — Gregorian computus algorithm
- `getSeasonForDate(dateStr)` — returns season name, shortName, color for any date
  Seasons: Christmastide, Epiphany, Lent, Holy Week, Easter Season, Ordinary Time, Advent
- `getUpcomingSundays(startDateStr, count, excludeDates)` — generates N Sundays from a
  start date, skipping specified excluded dates
- `formatLiturgicalDate(dateStr)` / `formatShortDate(dateStr)` — display helpers

### src/db/database.js — new helpers
Series: `getSeriesById`, `createSeries`, `updateSeries`, `deleteSeries` (cascades to sections,
unlinks sermons). `getSermonsBySeries` updated to join section title.
Sections: `getSectionsBySeries`, `createSection`, `updateSection`, `deleteSection`.
Calendar notes: `getCalendarNotes`, `createCalendarNote`, `deleteCalendarNote`.
`createSermon` updated to accept `section_id` and `is_one_off`.

### src/components/Planning.jsx (new)
Series list view accessible from sidebar "Planning" nav item.
- Biblical Coverage panel: 4 buckets (OT/NT/Wisdom/Prophetic) showing series count per category
- Series grid: cards with color accent bar, title, status badge, passage range, big idea,
  series count, canon category
- "New Series" creates a blank series record and opens the Series Planner
- Delete button per card (cascades cleanly)

### src/components/SeriesPlanner.jsx (new)
Full planning workspace for a series. Four tabs:

**Overview tab** — title, color, canon category, status, passage range, start/end dates,
big idea (with AI generate), overview (with AI generate). AI chat sidebar for free-form
discussion about the passage or series theme.

**Structure tab** — structural outline textarea (paste from commentary or AI-generate).
Section builder: add/remove/reorder sections, each with title, passage range, big idea,
overview. "Ask AI about this section" sends context to the AI chat panel.

**Sermon Slots tab** — manage sermon records (stage=planning) within the series. Organized
by section if sections exist, flat list otherwise. Each slot: passage, working title, big
idea. Slots are real sermon records created immediately in the DB. AI chat for passage
division advice ("divide Galatians into 8 units", "how many weeks for Luke 9-19?").

**Calendar tab** — set start date → "Suggest Sundays" auto-assigns the next N Sundays
(skipping calendar_notes dates) to sermon slots. Each row shows: slot title/passage, date
picker, liturgical season badge, +1wk skip button. Conflict warning if a slot lands on a
calendar_notes date. AI chat for scheduling advice. "Save All Dates" writes dates to sermon
records and updates series end_date.

### Sidebar + routing
- "Planning" nav item added (layers icon, between Dashboard and All Sermons)
- App.jsx: `openSeriesId` state, `openPlanner`/`closePlanner` callbacks
- Routes: `currentView === "planning"` → Planning, `currentView === "series-planner"` → SeriesPlanner
- `vite.config.mjs` — renamed from vite.config.js (ESM, eliminates CJS deprecation warning)

---

## 2026-03-30 — Dashboard UI overhaul (in progress)

### Stats row removed
Removed the four-card stats row (Active Sermons, In Progress, Ready to Preach, Illustrations)
from Dashboard.jsx. Not useful in practice. Cleaned up dead state (`stats`, `getDashboardStats`
import) and the now-unused `Promise.all` slot.

### "Continue Where You Left Off" section added
New section above the Upcoming/Series grid showing the 3 most recently updated non-archived
sermons.

- Added `getRecentSermons(limit)` to `database.js` — queries by `updated_at DESC`, excludes
  `archived` stage
- Each card shows: title, stage badge, passage (mono), series + last updated date
- **Open** button navigates directly into the sermon workspace
- **Reorient me** button fires an AI call (`ai-message` IPC) with all filled sermon fields
  (big idea, MPT, MPS, observations, interpretation, redemptive thread, implications, outline,
  manuscript opening). System prompt instructs Claude to write a focused 3–5 sentence summary:
  where they are in prep, key theological work done, natural next step. Under 100 words,
  second person, specific — no generic encouragement.
- Summary renders inline below the buttons with a gold left-border accent
- Per-sermon loading state ("Thinking…") while AI call is in flight
- Section only renders when at least one recent sermon exists

---

## 2026-03-30 — Post-build audit: code quality fixes

### Audit findings addressed

**getSectionsBySeries() duplicate removed (SeriesPlanner.jsx)**
Inline redefinition inside StructureTab was calling `window.electronAPI.dbQuery`
directly, bypassing the database helper layer. Removed. The imported function
from database.js is used throughout.

**toDateStr() local redefinition removed (SeriesPlanner.jsx / CalendarTab)**
Local `toDateStr()` duplicated the logic of `toDateString()` from churchCalendar.js.
Removed. `toDateString` is now imported and used directly.

**useDebounce extracted to shared hook (src/utils/hooks.js)**
`useDebounce` was defined identically in both SeriesPlanner.jsx and
SermonWorkspace.jsx. Extracted to `src/utils/hooks.js`. Both components now
import from the shared module. `useCallback` import removed from SermonWorkspace
(no longer needed there).

**Date formatting unified — single source of truth**
`formatShortDate` in churchCalendar.js duplicated the output of `formatDate`
in utils.js. `formatLiturgicalDate` was imported in SeriesPlanner but never
called. Both removed from churchCalendar.js. SeriesPlanner updated to import
`formatDate` from utils.js. Every component in the app now uses the same
`formatDate` function.

**CLAUDE.md fully updated**
- Complete schema for all 7 tables (series, series_sections, sermons,
  illustrations, calendar_notes, library, meta)
- All 8 IPC channels documented (was missing 4 library channels)
- Project structure updated with all new files
- Series Planning System section added
- Next priorities updated to reflect Phase 1 complete

### Verified
`npm start` — 51 modules, clean build, Electron launched.

---

## 2026-03-30 — System audit: bug fix + utility cleanup

### Bug fix — Illustrations.jsx
`handleAdd()` was resetting form state to `{ type: "story", ... }` after saving.
`"story"` is not a canonical illustration type (valid: personal/historical/biblical/hypothetical).
Fixed to reset to `{ type: "personal", ... }` — matching the initial state and the type selector.

### Utility deduplication
Removed inline duplicate functions and replaced with imports from `src/utils.js`:
- `ManuscriptTab.jsx` — removed local `tryParse`, now imports from `../utils`
- `Dashboard.jsx` — removed local `formatDate`, now imports from `../utils`
- `Illustrations.jsx` — removed local `tryParse`, now imports from `../utils`

No functional changes — identical logic, single source of truth.

---

## 2026-03-30 — Library: FTS4 search, browse/AI mode split, search UX fixes

### FTS4 full-text index

sql.js 1.14.1 does not include FTS5 but does include FTS4. Updated all FTS table
creation to try FTS5 first, fall back to FTS4. The startup block in `initDatabase()`
now runs every launch: if `library_fts` is missing (e.g. first install, or FTS creation
previously failed), it creates the table and rebuilds the index from all existing
`library` rows. Confirmed working: `FTS4 index created` + `FTS index rebuilt from 396
existing sermons` on first clean launch.

- Migration v3 (`runMigrations()`): updated to try fts5, catch and try fts4, catch and log
- Startup block: only creates + rebuilds when table is absent; no-op on subsequent starts
- Search handler: removed `ORDER BY rank` (FTS5-only); query works identically for FTS4

### Search mode split (main.js `library-search`)

Added `mode` parameter (`"browse"` default | `"ai"`):

- **browse** — searches `title`, `passage`, `series_name` only. Used by the Library search
  bar. Precise: typing "Acts" returns Acts sermons, not every sermon that mentions Acts.
- **ai** — also searches `manuscript_text`. Used by Quick Outline and AIPanel contextual
  search. Broader topical matching for AI synthesis.

Callers updated: `handleSearch` in Library.jsx uses browse (implicit default);
`handleQuickOutline` and `handleLibrarySearch` in AIPanel.jsx pass `"ai"` explicitly.
Preload updated to thread `mode` through to the IPC handler.

### Library search UX (Library.jsx)

- Added `searching` boolean state; shows "Searching…" in the search bar during IPC call
- Result count displayed below search bar after results load: "X sermons found" or
  "No sermons match your search."
- Added × button inside search bar to clear query without scrolling
- Placeholder updated: "Search by title, passage, series, or topic…"

### Clear results button (Library.jsx)

"Clear results" button added to the Quick Outline box button row, next to "Generate
Outlines". Appears only when a response is present. Clears response, found count, and
prompt. Removed the previous Clear button that was buried at the bottom of the response
card.

---

## 2026-03-30 — Sermon Library: import, search, Quick Outline, and contextual AI search

### Overview

Added a full Sermon Library feature that indexes the user's existing sermon archive
(`C:\Users\rossa\OneDrive\Ministry\Preaching\Sermon Library`) into SermonForge,
enabling AI-powered synthesis and contextual search throughout the sermon prep workflow.

### New dependency

`mammoth ^1.7.0` — pure-JavaScript library for extracting raw text from .docx files.
**Run `npm install` before `npm start` to install this dependency.**

### Database: schema migration v3

Added two new tables in `runMigrations()` (main.js):

- `library` — stores indexed sermons: `id, filepath (UNIQUE), filename, title, passage,
  folder, series_name, manuscript_text, word_count, imported_at`
- `library_fts` — FTS5 virtual table for full-text search: `id UNINDEXED, title, passage,
  manuscript_text`. Uses SQLite's built-in BM25 ranking. Falls back to LIKE search if
  FTS5 creation fails.

Schema version bumped from 2 → 3.

### New IPC channels (main.js)

- `library-status` — returns `{ count, lastImported }` so the UI knows if the library
  has been imported
- `library-import` — scans `LIBRARY_PATH` recursively for .docx files, skips already-
  imported files (by filepath), uses mammoth to extract text, inserts into `library` +
  `library_fts`, saves DB. Sends `library-import-progress` push events every 10 files.
  Returns `{ total, imported, errors, skipped }`.
- `library-search` — takes `{ query, limit }`, runs FTS5 MATCH query (OR semantics across
  extracted keywords), falls back to LIKE. Returns ranked results with 250-char excerpts.
- `library-get-manuscripts` — takes `{ ids, truncate, maxChars }`, returns full or
  truncated manuscript_text for AI prompts.

### New helper functions (main.js)

- `getAllDocxFiles(dir)` — recursive .docx scanner, skips `~$` temp files
- `parseLibraryFile(filePath)` — extracts title/passage from `[Passage] - [Title].docx`
  filename convention; determines folder and series_name from path structure
- `buildFtsQuery(userQuery)` — strips stop words, extracts content terms, builds
  `"term1" OR "term2"` FTS5 query string

### New preload exposures (preload.js)

`getLibraryStatus`, `importLibrary`, `searchLibrary`, `getLibraryManuscripts`,
`onLibraryImportProgress` — all bridge to the new IPC channels above.

### New component: Library.jsx

New top-level view accessible from the sidebar ("Sermon Library"):

- **Import state**: empty state with import button; progress bar during import showing
  `X of Y sermons processed`; result summary after completion
- **Quick Outline Generator**: dark (ink background) box with a textarea prompt input.
  User describes what they need; app searches the library, fetches top 6 full manuscripts,
  sends to Claude with a synthesis-focused system prompt requesting 3 different outlines
  drawn from past material. Response appears in a white card below with source attribution.
  Ctrl+Enter shortcut to generate.
- **Search + browse**: search bar with live FTS5 search; sermon grid using existing
  `sermon-card` styles showing title, passage, folder/series, excerpt, and word count.

### Sidebar.jsx

Added "Sermon Library" nav item with book icon between Archive and the footer.

### App.jsx

Added `Library` import and `currentView === "library"` routing.

### AIPanel.jsx

- Added `libraryCount` state, loaded via `getLibraryStatus` on mount
- Added `handleLibrarySearch()` async function: builds a context-aware search query
  from current sermon's passage + MPT + MPS, fetches top 6 truncated manuscripts (500
  chars each), constructs a context-aware user message based on the active tab and step
  (observe, interpret, redemptive_thread, implications, or manuscript), sends to Claude
- Added "Search My Library" button to the study and manuscript tab suggestion lists,
  conditionally rendered only when `libraryCount > 0` (library has been imported)
- The button triggers `handleLibrarySearch()` rather than a static prompt

### Library path

Derived at runtime: `path.join(os.homedir(), "OneDrive", "Ministry", "Preaching", "Sermon Library")`
Consistent with the DB path pattern (uses `os.homedir()`, no hardcoded username).

### Import behavior

- First run: imports all .docx files found recursively
- Subsequent runs ("Import New Sermons"): skips already-imported filepaths, only
  processes new files. This makes re-runs fast even with a large library.
- Series subfolders under `_Series/` are parsed as `series_name`; top-level folders
  (`New Testament`, `Old Testament`, `_Topical`) stored as `folder`

### Verified

`npm install` required before first run to install mammoth.

---

## 2026-03-30 — Windows system configuration for running the installed app

**Smart App Control disabled** (Windows Security → App & browser control →
Smart App Control → Off). SAC blocked an unsigned component of the installed
app at launch because the build has no code signing certificate. Disabling SAC
is permanent on this machine (cannot be re-enabled without reinstalling
Windows). Acceptable for a personal machine where all installed software is
controlled by the user.

Note: future builds of SermonForge will continue to be unsigned. If SAC is
ever re-enabled on a future machine, the same block will occur. The fix is
either to disable SAC again or to obtain a code signing certificate.

---

## 2026-03-30 — Packaged as installable .exe (Priority #2 complete)

`npm run build` now produces a working NSIS installer at
`release\SermonForge Setup 1.0.0.exe`.

**Blocker encountered and resolved:** electron-builder always downloads the
`winCodeSign` toolset for Windows NSIS builds. The toolset archive contains
macOS symlinks (`libcrypto.dylib`, `libssl.dylib`) that require symlink
creation privileges. Windows does not grant these by default — 7-Zip failed
with "Cannot create symbolic link: A required privilege is not held by the
client." Fixed by enabling Windows Developer Mode (Settings → System → For
developers → Developer Mode), which grants the `SeCreateSymbolicLinkPrivilege`
to the process.

**Also added** `CSC_IDENTITY_AUTO_DISCOVERY=false` to the build script via
`cross-env` to suppress code signing (no certificate — not needed for personal
use). Build script in `package.json`:
  `vite build && cross-env CSC_IDENTITY_AUTO_DISCOVERY=false electron-builder --win`

**Installer details:**
- File: `release\SermonForge Setup 1.0.0.exe`
- Target: NSIS x64, oneClick false, allowToChangeInstallationDirectory true
- Desktop shortcut: created on install
- Shortcut name: SermonForge
- Uninstaller: included (deleteAppDataOnUninstall false)
- `.env` bundled into resources dir for packaged API key loading
- `sql-wasm.wasm` unpacked outside asar for correct WASM path resolution

---

## 2026-03-29 — Fix: AI panel "could not resolve authentication" error

**Root cause:** `ANTHROPIC_API_KEY` was set to an empty string in the Windows
system environment. dotenv's default behavior does not override existing env
vars, so the real key from `.env` was never loaded into `process.env`.

**Fix (`electron/main.js`):** Added `override: true` to the `dotenv.config()`
call. dotenv now always uses the value from the `.env` file regardless of what
the system environment contains. Applies to both dev and packaged paths.

---

## 2026-03-29 — Logos navigation: clipboard fallback approach

The logos4:// URL-based navigation opened Logos but never navigated to the
passage. Root cause unresolved. Replaced with a clipboard fallback approach
so the passage is always immediately available.

### What changed

**electron/main.js** — `ipcMain.handle("open-logos")`:
- Old: built a logos4://bible/esv/[Book].[ch].[v] URL, called shell.openExternal
- New: writes the raw passage string to the system clipboard, then calls
  shell.openExternal("logos4:") to open/focus Logos, with exec fallback to
  launch Logos.exe directly if the URI call throws
- Returns { success: true } so renderer can react to completion

**src/components/SermonWorkspace.jsx**:
- Added `logosCopied` state (boolean, default false)
- `handleOpenLogos` converted from sync function to async arrow function;
  awaits the IPC call; sets logosCopied true for 4 seconds on success
- "Open in Logos" button: replaced btn-logos (SVG icon button) with
  btn-ghost btn-sm; label toggles to "✓ Copied — paste in Logos" for 4s
  after click; title updated to reflect new behavior

**electron/preload.js** — no change.
**buildLogosUrl() and BOOK_ABBREVS** — retained in main.js (not removed);
  may be useful if the URL approach is revisited.

### User workflow after this change
1. Click "Open in Logos" — passage text is copied to clipboard, Logos opens
2. In Logos, use its passage search or Ctrl+V to navigate to the passage
3. Button label confirms "✓ Copied — paste in Logos" for 4 seconds

### CLAUDE.md known issues
The Logos navigation issue remains listed as unresolved — the new approach
works around the problem rather than solving deep Logos URI navigation.
Do not remove the known issue entry unless Logos navigates automatically.

---

## 2026-03-29 — Critical fixes, schema migration, and v1.0 stabilisation

### 1. DB Migration System (ADR-008)

Added a `meta` table and `runMigrations()` function in `electron/main.js` to manage schema changes safely for existing installs.

- `meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)` created in `initDatabase()` before `saveDb()`
- `runMigrations()` checks `schema_version` from `meta`, runs ALTER TABLE statements to reach current version, updates version
- Current schema version: **2**
- Errors from `ALTER TABLE ADD COLUMN` are caught silently — on fresh installs the columns exist from `CREATE TABLE`, so the error is expected and harmless
- `runMigrations()` called after `CREATE TABLE IF NOT EXISTS` and before `saveDb()`

### 2. Schema: functional_elements and checklist columns (migration v2)

- `sermons.functional_elements TEXT DEFAULT '{}'` — stores Step 4 E/A/I data per outline point
- `sermons.checklist TEXT DEFAULT '{}'` — stores delivery checklist checked state
- Added to `CREATE TABLE IF NOT EXISTS sermons` for fresh installs
- Added via `ALTER TABLE` in migration v2 for existing installs
- See ADR-009 for `functional_elements` JSON structure

### 3. Step 4 Functional Elements now persisted

Previously: `funcData` was `useState({})` — data lost on every reload.

**Fix in `StudyTab.jsx`:**
- `funcData` initialised with `useState(() => tryParse(sermon.functional_elements, {}))`
- `updateFuncData()` now calls `onUpdate({ functional_elements: JSON.stringify(next) })` on every change
- Goes through SermonWorkspace's 800ms debounced save like all other sermon fields

### 4. Delivery checklist now persisted

Previously: `checked` was `useState({})` — state lost on every reload.

**Fix in `DeliveryTab.jsx`:**
- `checked` initialised with `useState(() => tryParse(sermon.checklist, {}))`
- `toggleCheck()` now calls `onUpdate({ checklist: JSON.stringify(next) })` immediately (no debounce — checkbox state)

### 5. activeStep wired into AIPanel

Previously: `activeStep` prop was received by AIPanel but never used. "Review My Work" gave generic whole-tab feedback regardless of which Step 1 phase was open.

**Fix:**
- `SubPhase` component gains `onFocus` prop, called when a phase is opened
- `StudyTab` gains `onStepChange` prop; passes phase key (`"observe"`, `"interpret"`, `"redemptive_thread"`, `"implications"`) via `onFocus` to each SubPhase
- `SermonWorkspace` adds `activeStep` state, passes `onStepChange={setActiveStep}` to StudyTab and `activeStep={activeStep}` to AIPanel
- Switching tabs resets `activeStep` to null via `handleTabChange()`
- `getReviewPrompt()` in AIPanel gains a third argument `activeStep`; when set, returns the phase-specific review prompt per user spec:
  - observe, interpret, redemptive_thread, implications — each with distinct targeted prompt and content from the relevant sermon field
- When `activeStep` is null (Steps 2–4 or tab switch), falls through to the existing broad study review

### 6. Calendar: archived sermons filtered out

`Calendar.jsx`: changed `for (const s of sermons)` to `for (const s of sermons.filter((s) => s.stage !== "archived"))` so archived sermons no longer appear as calendar chips.

### 7. getDashboardStats rewritten to use SQL GROUP BY

`database.js`: replaced full table scan + JS counting with:
```sql
SELECT stage, COUNT(*) as count FROM sermons GROUP BY stage
```
Counts are now computed in SQLite. Result is the same; query is O(1) in memory regardless of sermon count.

### 8. Illustration type taxonomy fixed

Three conflicting taxonomies unified to the canonical schema values: `personal | historical | biblical | hypothetical`

- `Illustrations.jsx` TYPES array updated; default new illustration type changed from `"story"` to `"personal"`; add-form select options updated
- `CLAUDE.md` schema section already correct (had canonical types)
- Seed data in `electron/main.js` updated:
  - Augustine description → `historical`
  - Luther quote → `historical`
  - Roman salt illustration → `historical`
  - Sea of Galilee storm → `biblical`
  - J.I. Packer quote → `historical`

### 9. Anthropic SDK instantiation fixed

`electron/main.js` IPC handler: changed from
```js
const Anthropic = require("@anthropic-ai/sdk");
new Anthropic.default({...})
```
to
```js
const { default: Anthropic } = require("@anthropic-ai/sdk");
new Anthropic({...})
```
Functionally identical in the current SDK but the new form is the documented pattern and will not break if the CJS interop changes.

### 10. Delete sermon

`SermonWorkspace.jsx`:
- Imports `deleteSermon` from `database.js`
- `handleDelete()` calls `confirm()`, then `deleteSermon(sermonId)`, then `onClose()`
- "Delete" button added to the workspace topbar-right, styled in `var(--crimson-soft)`

### 11. Error boundary

`App.jsx`:
- `ErrorBoundary` class component wraps the entire app shell
- On render error: shows a clean screen with the error message and a "Reload App" button
- Errors logged to console via `componentDidCatch`

### 12. Minor fixes

**Sidebar width:** `global.css` `.sidebar` changed from 220px to 260px (spec). Gradient updated: `219px → 259px`.

**Stage color CSS variables:** Added `--stage-study: #d67a00` and `--stage-ready: #228b22` to `:root` in `global.css`. Updated:
- `Calendar.jsx` STAGE_COLORS: replaced hardcoded hex strings with `var(--stage-study)` and `var(--stage-ready)`
- `Dashboard.jsx` SVG stroke: replaced `"#228b22"` with `"var(--stage-ready)"`

**Shared utils:** Created `src/utils.js` with `tryParse` and `formatDate`. Updated all components that had local copies:
- `SermonList.jsx`, `Archive.jsx` — removed local `formatDate`, import from utils
- `OutlineTab.jsx`, `StudyTab.jsx`, `DeliveryTab.jsx` — removed local `tryParse`, import from utils

**uuid removed:** Removed `"uuid": "^9.0.1"` from `package.json` dependencies. Was never used — `database.js` uses `crypto.randomUUID()`.

**generateId uses crypto.randomUUID:** `electron/main.js` `generateId()` changed from `Date.now().toString(36) + Math.random()` to `randomUUID()` (from Node's built-in `crypto` module). Added `const { randomUUID } = require("crypto")` at top of file.

**strictPort: false:** `vite.config.js` changed from `strictPort: true` to `strictPort: false`. Dev server now picks an available port instead of failing if 5173 is occupied.

### 13. Documentation

- `DECISIONS.md` — Added ADR-008 (migration system) and ADR-009 (functional_elements JSON structure)
- `CLAUDE.md` — Updated: schema section adds `functional_elements` and `checklist` fields; illustration type section; known issues removes resolved DEV SERVER DEPENDENCY entry; development rule 4 expanded with migration requirement; next priorities updated
- `src/utils.js` — new shared utility module

### Verified

`npm start` ran: Vite built 46 modules with no errors in 560ms. Electron launched successfully.

---

## 2026-03-29 — Initial build

### What was built

#### Project scaffold
- `package.json` — dependencies, scripts, electron-builder config
- `vite.config.js` — Vite 5 + React plugin, `base: "./"` for Electron file loading, port 5173
- `index.html` — Vite entry point mounting `#root`
- `README.md` — setup steps

#### Electron shell
- `electron/main.js` — main process: DB init, IPC handlers, Logos URL builder, window creation
- `electron/preload.js` — contextBridge exposing `window.electronAPI`: `sendAIMessage`, `dbQuery`, `dbRun`, `openInLogos`

#### Database (`src/db/database.js`)
SQL query helpers that call IPC. No SQLite code in the renderer — all queries go through `window.electronAPI.dbQuery` / `dbRun`.

Schema (three tables):
- `series` — id, title, color, description, year
- `sermons` — id, series_id, title, passage, date, preacher, stage, big_idea, mpt, mps, observations, interpretation, redemptive_thread, implications, outline (JSON), manuscript, delivery_notes, timing_notes, post_sermon, created_at, updated_at
- `illustrations` — id, type, text, tags (JSON), used_in (JSON), created_at

Seed data loaded on first launch (empty DB check):
- 3 series: "The Sermon on the Mount" (gold), "Faithful in the Storm" (crimson), "Galatians: Free Indeed" (sage)
- 4 sermons across stages: writing, study, planning, archived
- 5 illustrations: story, quote, illustration types

#### Styles (`src/styles/global.css`)
Full design system matching the prototype:
- CSS variables: `--ink`, `--ink-mid`, `--ink-soft`, `--ink-ghost`, `--parchment`, `--parchment-warm`, `--parchment-deep`, `--gold`, `--gold-bright`, `--gold-pale`, `--crimson`, `--crimson-soft`, `--sage`, `--sage-soft`, `--slate`, `--white`
- Fonts: Playfair Display (headings/italic), Crimson Pro (body), JetBrains Mono (passage refs) — loaded from Google Fonts
- Components styled: sidebar, topbar, buttons, cards, sermon-grid, sermon-card, stage-tabs, fields, big-idea-box, outline, manuscript, delivery-mode, ai-panel, calendar, illustrations, modals, search, stats-row

#### React app
- `src/main.jsx` — ReactDOM entry
- `src/App.jsx` — view router: dashboard / sermons / calendar / illustrations / archive / workspace

#### Components
- `Sidebar.jsx` — ink background, gold logo, nav items with gold left-border on active state. Views: Dashboard, All Sermons, Calendar, Illustrations, Archive
- `Dashboard.jsx` — stats row (Active, In Progress, Ready, Illustrations), upcoming sermons list, active series cards, New Sermon button
- `SermonList.jsx` — sermon grid with search and stage filter tabs, New Sermon button
- `Calendar.jsx` — month grid, sermons rendered as colored event chips per day, prev/next month navigation
- `Illustrations.jsx` — searchable/filterable illustration library, add/delete illustrations
- `Archive.jsx` — grid of archived sermons with search
- `NewSermonModal.jsx` — modal form: title, passage, date, stage, preacher, series selector
- `SermonWorkspace.jsx` — full workspace shell: topbar with passage/series/stage/Logos/Deliver, big idea box, tab bar, workspace body + AI panel
- `StudyTab.jsx` — four-phase exegesis (Observe, Interpret, Redemptive Thread, Implications), MPT→MPS Forge with Challenge/Chain buttons, Outline Builder (add/remove/reorder), Functional Elements E/A/I accordion per point
- `OutlineTab.jsx` — clean outline view synced with Step 3, editable with add/remove/reorder
- `ManuscriptTab.jsx` — full textarea editor, word count + estimated minutes, Tune-Up Engine button
- `DeliveryTab.jsx` — pre-sermon checklist, timing notes, post-sermon reflection, delivery notes, full-screen delivery overlay
- `AIPanel.jsx` — right sidebar (320px), ink header, message history, loading dots animation, context-aware suggestion buttons per tab, "Review My Work" button, Clear history

#### IPC channels (main process only — API key never in renderer)
- `ai-message` — `{messages, systemPrompt}` → calls Anthropic SDK → returns string. Model: `claude-sonnet-4-20250514`, max 4096 tokens
- `db-query` — `{sql, params}` → `queryAll()` → returns array of row objects
- `db-run` — `{sql, params}` → `runSql()` → writes + saves DB to disk → returns `{changes: 1}`
- `open-logos` — `passage` string → builds `logos4://` URL → `shell.openExternal()`

#### Logos integration
- "Open in Logos" button in workspace topbar and passage references in Study tab
- `buildLogosUrl()` in `main.js` maps full book names to Logos abbreviations and constructs `logos4://bible/esv/[Book].[ch].[v]` URLs
- Book abbreviation table covers all 66 canonical books

---

## 2026-03-29 — sql.js substitution (build fix)

**Problem:** `better-sqlite3` requires native compilation. Two blockers on this machine:
1. VS2026 BuildTools (version 18) not recognized by the `node-gyp` version bundled in `@electron/rebuild` — version detection fails with "invalid versionYear: undefined"
2. No prebuilt binaries for Node 24.14.1

**Decision:** Switched to `sql.js` (pure WebAssembly SQLite). See DECISIONS.md.

**Changes:**
- `package.json` — replaced `better-sqlite3` + `@electron/rebuild` with `sql.js ^1.12.0`, removed `postinstall` electron-rebuild script
- `electron/main.js` — rewrote DB layer using `sql.js` async init, in-memory DB, file-based persistence (load on startup, save to disk on every write via `saveDb()`), `queryAll()` helper using `stmt.prepare/bind/step/getAsObject`, `runSql()` helper

---

## 2026-03-29 — Logos cross-chapter range bug fix

**Bug:** In `buildLogosUrl()`, destructuring of regex capture groups had `verseEnd` and `endChapter` swapped. The regex `ch:v-start - group4:group5` captures `endChapter` as group 4 and `verseEnd` as group 5, but the variables were named in reverse order.

**Effect:** A passage like `Matthew 5:1-7:12` would produce `Mat.5.1-Mat.12.7` instead of `Mat.5.1-Mat.7.12`.

**Fix (`electron/main.js:388`):**
- Renamed destructured variables: `verseEnd, endChapter` → `endChapter, verseEnd`
- Flipped conditional logic: check `endChapter` (group 4, present for any range) first; check `verseEnd` (group 5, cross-chapter only) to choose single-chapter vs. cross-chapter branch

---

## 2026-03-29 — Production build setup

**Problem:** `npm start` used `concurrently` + Vite dev server + `wait-on`, requiring the terminal to stay open. Closing the terminal killed the app. Not appropriate for a desktop tool.

**Changes:**
- `package.json` `start` script: changed from `concurrently "vite" "wait-on ... && electron ."` to `vite build && electron .`
- `package.json` `dev` script: kept old concurrently setup with `ELECTRON_DEV=1` env var for hot-reload development
- `package.json` `build` script: `vite build && electron-builder --win` for producing the installer
- Added `cross-env ^7.0.3` to devDependencies (for `dev` script cross-platform env var)
- electron-builder config expanded:
  - `asarUnpack: ["node_modules/sql.js/dist/sql-wasm.wasm"]` — WASM binary must be outside the asar so `process.resourcesPath` path resolves correctly at runtime
  - `extraResources: [{ from: ".env", to: ".env" }]` — copies `.env` into resources dir for packaged builds
  - `win.target`: NSIS x64
  - `nsis`: `oneClick: false`, `allowToChangeInstallationDirectory: true`, `createDesktopShortcut: true`, `shortcutName: "SermonForge"`
- `electron/main.js` — three changes for packaged compatibility:
  - `dotenv` path: `app.isPackaged ? process.resourcesPath/.env : __dirname/../.env`
  - `sql.js` locateFile: `app.isPackaged ? app.asar.unpacked/... : __dirname/../node_modules/...`
  - Window loading: `ELECTRON_DEV=1` → `loadURL("http://localhost:5173")`; otherwise → `loadFile("dist/index.html")`

---

## 2026-03-29 — Documentation and session protocol

**Context:** User requested full documentation of everything built, all architectural decisions, and a persistent behavioral protocol for future sessions.

**Files created:**
- `CHANGELOG.md` (this file) — dated entries covering all build events, bug fixes, and decisions made during initial development
- `DECISIONS.md` — 7 ADRs documenting architectural decisions with context, options considered, rationale, trade-offs, and change constraints:
  - ADR-001: sql.js over better-sqlite3
  - ADR-002: Electron + React + Vite stack
  - ADR-003: IPC-only API key handling
  - ADR-004: OneDrive DB storage path
  - ADR-005: logos4:// URI scheme for Logos integration
  - ADR-006: Book abbreviation mapping table
  - ADR-007: Production build flow (vite build && electron .)
- Memory file saved to Claude project memory — enforces session protocol: read CHANGELOG + DECISIONS at session start, update CHANGELOG after every change, flag ADR conflicts before implementing

**Session protocol rule (effective immediately):**
Every response in this project begins with confirmation that CHANGELOG.md and DECISIONS.md have been read. Every change ends with a CHANGELOG.md update. No architectural decision contradicting DECISIONS.md is implemented without flagging the conflict and receiving explicit approval.

---

## 2026-03-29 — CLAUDE.md created (project bible)

**File created:** `CLAUDE.md` — authoritative project reference for all future sessions.

**Contents:**
- Project overview and purpose (42-week preaching calendar, local-first, no backend)
- Full tech stack and environment (paths, .env location, DB file location)
- Complete project structure map
- Database schema (all three tables with field-level annotations)
- IPC channel contracts
- Full design system (colors, typography, layout rules, component rules)
- Study tab structure (Steps 1–4 with field mappings)
- AI panel behavior and Tune-Up Engine prompt description
- Known issues (Logos navigation unresolved; dev server dependency resolved)
- Development rules (9 rules including schema change protocol, path safety, API key rule)
- Next priorities (Logos fix, functionality audit, .exe packaging)

**Two edits made vs. user-provided draft:**
1. Known Issue #2 ("DEV SERVER DEPENDENCY") — marked RESOLVED. Production build
   setup was completed in this session and verified working. Rule 8 prohibits
   marking issues fixed without verification.
2. Next Priorities — removed "Complete production build setup" (already done).
   Remaining priorities renumbered 1–3.
