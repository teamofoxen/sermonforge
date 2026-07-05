---
name: sweep-the-multiverse
description: Monthly comprehensive architectural audit of SermonForge across ALL major system areas in a fixed sequence. High-signal, structured inspection driven by git diff. Returns PASS/WARN/FAIL per area with top risks and recommended actions. Use when the user types /sweep-the-multiverse or asks for a full monthly architectural audit.
trigger: /sweep-the-multiverse
---

# sweep-the-multiverse

Monthly, comprehensive architectural audit of SermonForge across ALL major system areas.

This is NOT a full-repo brute force scan. It is a structured, high-signal inspection executed in a fixed sequence, driven primarily by `git diff` (baseline = the last sweep's commit; find it in the CHANGELOG).

> **Maintenance note (2026-07-04).** The 2026-07-04 monthly sweep found the
> original area map auditing a **ghost architecture**: Context Pipeline, AI Flow,
> and Memory System all reference subsystems ARI deleted 2026-05-09 (contextBuilder.js,
> memory.js, ai.js, AIPanel.jsx), and there was no Series Planner or Telemetry
> coverage — so the map steered the audit away from the highest-churn code. The
> sequence below is the corrected map. Keep this skill in sync when a subsystem is
> added or removed; a stale audit map is itself a finding.

## FIXED AUDIT SEQUENCE

Areas 1 and 6 are fast confirmations (a removal tripwire and dormant-by-design
infra). Spend the audit budget on the live areas (2–5, 7–10), weighted by where
`git diff` shows churn since the last sweep.

1. AI-REMOVAL TRIPWIRE  *(verify the deleted AI subsystems stay deleted)*
2. DATABASE LAYER
3. SCHEMA MIGRATION
4. IPC BOUNDARY
5. SEARCH SYSTEM
6. THEOLOGY / INGESTION  *(dormant per ARI D5 — verify still callerless)*
7. EXPORT / FILE I/O
8. TELEMETRY (BTI)
9. UI LAYER — sermon workspace
10. SERIES PLANNER + DASHBOARD

## AREA DEFINITIONS

| Area | Scope |
|------|-------|
| AI-REMOVAL TRIPWIRE | Confirm still-absent: contextBuilder.js, memory.js, ai.js, AIPanel.jsx, `sendAIMessage`, IPC `"ai-message"`, Anthropic SDK. `MUTATION_KIND` must be `user_input` only. The `no-direct-ai` ESLint tripwire must remain. |
| DATABASE LAYER | `sermonforge.db` (better-sqlite3, WAL) and `theology.db` (better-sqlite3 + sqlite-vec). Renderer→`src/db/database.js`/`src/core/spine.ts`→named IPC→`electron/main.js`. No raw SQL in renderer. |
| SCHEMA MIGRATION | `runMigrations()`, `PRAGMA user_version` / `meta.schema_version`, the `SERMON_COLUMNS` allowlist + its three mirrors (`src/core/contracts.ts`, `electron/contracts.cjs`, `tests/contracts/_helpers/test-spine.ts`) |
| IPC BOUNDARY | `electron/preload.js`, `contextBridge`, named channels, no API-key exposure. Sanctioned non-DB direct-callers (telemetry/setup/feedback) documented in `src/db/database.js` header. |
| SEARCH SYSTEM | `sermon_search` (LIKE table in `electron/main.js`) wired to `SermonList.jsx`/`CompletedSermons.jsx`; theology `theology_fts` (FTS4) + `theology_vec` (sqlite-vec) on a separate connection |
| THEOLOGY / INGESTION | `scripts/theology/` chunking (~600 words), embedding build; the theology IPC handlers. Dormant-by-design per ARI D5 — retained on disk, no live consumer. |
| EXPORT / FILE I/O | docx/txt exports in `electron/main.js`, disk writes, `path.join`, async writes, structured error voice, OneDrive/Windows compat |
| TELEMETRY (BTI) | `electron/telemetry/bus.js` + `config.js` + `events.js`. Never-throw, bounded buffer, non-blocking, and the **privacy law**: metadata only, no sermon content off-machine. |
| UI LAYER | React workspace: `SermonWorkspace.jsx`, `SermonWritingSurface.jsx`, `SermonMap.jsx`, `ReferencePane.jsx`, `PassageCanvas.jsx` |
| SERIES PLANNER + DASHBOARD | `src/components/SeriesPlanner.jsx` (Outline · Schedule · Study guide), `src/components/Dashboard.jsx` (the front door — State #7) |

## BEHAVIOR

1. Use `git diff` (since the last sweep's commit) as the primary signal.
2. Use minimal additional context only when required.
3. Evaluate ALL areas in sequence in one run.
4. Stay scoped — do NOT explore unrelated parts of the repo.
5. A grep-negative ("no callers", "no imports") is weak evidence — if a finding
   turns on one, adversarially verify it before it changes an area's status.

## CONTRACT MAP (`docs/CORE.md` → "The Framework")

The Framework is binding system law. Each area must satisfy specific contract clauses; weakening any listed clause is a HIGH-severity finding and forces the area's status to `FAIL`.

| Area | Contract clauses to enforce |
|------|------------------------------|
| AI-REMOVAL TRIPWIRE | Process #5 (no AI substitution); Mutation #1 (user typing is the only writer) |
| DATABASE LAYER | State #1 (sermon as atom), #3 (no anonymous atoms), #5 (one name), #6 (one source); Mutation #3 (saves are events) |
| SCHEMA MIGRATION | State #5 (schema names canonical), #6 (one source — allowlist mirrors named) |
| IPC BOUNDARY | Mutation #1, #3 (writes go through guarded boundaries); State #3 enforced at IPC layer |
| SEARCH SYSTEM | Surface #5 (a built search must render somewhere — no orphan) |
| THEOLOGY / INGESTION | Process #5; local-first boundary (no sermon content leaves) |
| EXPORT / FILE I/O | Mutation #3 (visible saves), #5 (visible errors, one voice) |
| TELEMETRY (BTI) | Mutation #5 (never a silent throw); local-first boundary (metadata only) |
| UI LAYER | All Surface clauses (#1 vocabulary, #2 CTA, #3 empty/loading, #4 you-are-here, #5 re-entry); Mutation #5 |
| SERIES PLANNER + DASHBOARD | State #4 (position-in-series first-class + visible), #7 (in-progress queryable from front door); all Surface clauses |

## PROJECT-SPECIFIC AUDIT RULES

### AI-REMOVAL TRIPWIRE (CRITICAL)
- No live import/reference of the deleted modules (contextBuilder, memory.js, AIPanel, `sendAIMessage`, `"ai-message"`)
- `MUTATION_KIND` is `user_input` only — no `ai_proposal` / `ai_apply`
- No Anthropic SDK anywhere; the `no-direct-ai` ESLint rule must not be weakened
- **Contract check:** Process #5, Mutation #1

### DATABASE SAFETY
- NO raw SQL in renderer; ALL writes through the main process via `spine`/`database.js`
- Durable commit-at-IPC-handler (WAL). The **renderer** 800ms autosave debounce
  (`SermonWorkspace`) is deliberate and must be flushed on close/quit/reload via
  `src/utils/closeFlush.js`. **No main-process save debounce exists — none may be reintroduced.**
- Schema changes must align with `SERMON_COLUMNS`; `buildUpdate()` gates unknown columns
- **Contract check:** State #1, #3, #5, #6; Mutation #3

### SCHEMA MIGRATION
- All schema changes go through `runMigrations()`; version increments correctly (currently 33), sequential, one wrapping transaction
- `SERMON_COLUMNS` byte-identical across all three mirrors
- No direct `CREATE TABLE` edits outside the migration system
- **Contract check:** State #5, #6

### IPC INTEGRITY
- All cross-boundary calls via named IPC channels through `contextBridge`
- No renderer access to any API key (ESV/other); no preload bypass hacks
- The only sanctioned direct `window.electronAPI` callers are non-DB channels
  (telemetry/setup/feedback), per the carve-out documented in `src/db/database.js`
- **Contract check:** Mutation #1, #3; State #3 at the IPC layer

### SEARCH SYSTEM
- Sermon FTS (`sermon_search` LIKE) and theology vector logic stay distinct, on separate connections; the main DB never loads sqlite-vec
- Sermon search must remain wired to a rendered surface (`SermonList`/`CompletedSermons`) — a built-but-unrendered search is a Surface #5 orphan
- No unbounded result injection
- **Contract check:** Surface #5

### THEOLOGY / INGESTION
- Chunking remains ~600 words; ingestion stays manual CLI (`scripts/theology/`), never auto-run by the app
- Theology IPC handlers stay callerless-by-design (ARI D5); flag if a live consumer appears without a decision
- No sermon content reaches theology.db or any embedding call
- **Contract check:** Process #5; local-first

### EXPORT / FILE I/O
- All paths use `path.join()`; no hardcoded separators
- Writes are async (`fs.promises.writeFile`), never blocking the main thread on a hot path
- Failures return a structured `{success:false, error}` in the one error voice — never a raw alert
- docx export derives MPT/MPS from the `main_point_pair` envelope and honors each door's `_na` sidecar
- **Contract check:** Mutation #3, #5

### TELEMETRY (BTI)
- Telemetry NEVER throws into the app (all writes wrapped; errors logged, not raised)
- Local NDJSON buffer growth is bounded (`MAX_BATCH_SIZE`, flush interval, remainder rotation)
- Emit is non-blocking on the render path
- **PRIVACY (hard):** only interaction *metadata* leaves the machine (version, platform, error string, ids, user-authored feedback) — **no sermon content**, ever
- **Contract check:** Mutation #5; local-first boundary

### UI LAYER
- Must not contain business logic; must not access DB or AI directly (wrappers only)
- Canonical vocabulary; "you are here" always answerable; save/error in one voice; `DeleteButton` is the only destructive-confirm
- **Contract check:** all Surface clauses; Mutation #5

### SERIES PLANNER + DASHBOARD
- Data only through `database.js`/`spine` wrappers; heavy domain logic delegated to utils (`pacing`, `coverage`, `churchCalendar`, `studyGuideModel`) — not inlined
- Three-screen shell keeps active-screen indication, one CTA system, canonical loading verbs, labeled Back
- Position-in-series ("Sermon N of M") is surfaced, not buried (State #4)
- Dashboard answers "what am I working on" from the front door (State #7)
- Planner-native vocabulary (Book ▸ Section ▸ Pericope; Outline/Schedule/Study guide) is sanctioned; retired stage aliases (Blueprint/Frame/Delivery/Equip) are not
- **Contract check:** State #4, #7; all Surface clauses

### PERFORMANCE
- No synchronous writes on a hot/main path (config/log/one-time writes are fine)
- No repeated DB reads in loops
- No unbounded growth — telemetry buffer, search results, export payloads all bounded

## RED FLAGS (HIGH SEVERITY)

- Reintroducing ANY AI call path — Anthropic SDK, `"ai-message"` channel, an `ai_*` mutation kind, or weakening the `no-direct-ai` rule
- Reintroducing a main-process save debounce, or weakening the renderer autosave / `closeFlush` flush
- Constructing `{id, text}` outline points outside `createOutlinePoint()` (`src/utils.js`)
- Adding a sermon field without updating `SERMON_COLUMNS` and all three mirrors
- Changing the active userData DB path without adding the previous path to `legacyDbPaths`
- Any sermon *content* leaving the machine (telemetry, export, or any outbound call) — a local-first breach
- Weakening any contract clause listed in the CONTRACT MAP for any area
- Any Principle violation (system substituting for the user's clarity work)

## OUTPUT FORMAT

STATUS: PASS | WARN | FAIL

SUMMARY: 2–3 sentences (overall **system** health — not tool health). If the audit
map itself is stale, that belongs in RECOMMENDED ACTIONS, not the verdict.

---

CONTRACT POSTURE (across all areas). State honestly what was verified vs not
re-audited this run — do not assert "preserved" from silence:

- **State Contract:** [posture across clauses #1-#7]
- **Process Contract:** [posture across clauses #1-#6]
- **Mutation Contract:** [posture across clauses #1-#5]
- **Surface Contract:** [posture across clauses #1-#5]
- **Principle (Clarity through Constraint):** preserved | pressured | violated

---

AREA REPORTS (one block each, in sequence):

### <AREA NAME>
STATUS: PASS | WARN | FAIL | DORMANT | N-A
CONTRACTS: <strengthens | weakens | neutral per mapped clause>
- findings (file:line evidence; high-signal only)

(Areas: AI-REMOVAL TRIPWIRE · DATABASE LAYER · SCHEMA MIGRATION · IPC BOUNDARY ·
SEARCH SYSTEM · THEOLOGY / INGESTION · EXPORT / FILE I/O · TELEMETRY · UI LAYER ·
SERIES PLANNER + DASHBOARD)

---

TOP RISKS:
- highest impact issues across system, with any contract weakenings called out first

RECOMMENDED ACTIONS:
- max 5 items
- high leverage only

## HARD RULES

- Max 1000 words total
- No full-repo brute force scanning
- No embeddings or broad search
- No code rewrites
- No large refactors
- No speculation
- High-signal findings only
- Any contract weakening or Principle violation forces overall `FAIL` regardless of other findings

## TONE

Senior architect performing a monthly system review. Direct. Prioritized. No fluff.
