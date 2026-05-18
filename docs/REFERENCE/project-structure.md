# SermonForge — Project Structure Reference

> Last verified: 2026-05-18 (post-sweep audit Chunk 5, end-to-end rewrite
> against a fresh filesystem `ls` of every directory referenced. Drift
> introduced between 2026-05-11 and 2026-05-18 by the trail deletion sweep
> + post-sweep audit Chunks 1-4 reconciled here.)
>
> Removed-files note (ARI Phase 8 / Phase 9, 2026-05-09): the AI subsystem
> was deleted. Paths shown unwrapped (not in backticks) so the drift-check
> doesn't flag them as broken references — they are historical, not
> current. Names retained for searchability when reading old git history:
> electron/ai.js, src/utils/ai.js, src/prompts/, AIPanel.jsx,
> ProposalPanel.jsx, InlineAIResponse.jsx, SeriesPlanner.jsx, Planning.jsx,
> NewSeriesModal.jsx, DeliveryTab.jsx, memory.js (localStorage layer),
> contextBuilder.js, contextSchema.js. None of them exist in the current
> tree.
>
> Removed-files note (trail deletion sweep + post-sweep audit, 2026-05-17 →
> 2026-05-18): era 3 trail UI + workspace tab files + tour engine +
> advancement-wall layer + orphan components deleted across phases A
> through G of the sweep plus Chunks 1-3 of the post-sweep audit. Same
> drift-check convention: names retained unwrapped for searchability.
> Components: StudyTab.jsx, AssemblyTab.jsx, ManuscriptTab.jsx,
> ManuscriptTrail.jsx, StudyTrailExegesis.jsx, AssemblyTrail.jsx,
> studyTrailShared.jsx, studyTrail.css, WorkspaceTrailMap.jsx,
> AdvanceGateChecklist.jsx (all Phase E); TourContext.jsx, TourOverlay.jsx
> (tour cleanup); OutlineBuilder.jsx, FieldOverviewScreen.jsx (+ .test.jsx),
> ScripturePanel.jsx (+ scripturePanel.css), PeripheralReferencePanel.jsx
> (+ .test.jsx), ManuscriptReview.jsx, FeedbackModal.jsx,
> primitives/Collapsible.jsx (post-sweep audit Chunk 3). Utility/data:
> electron/tourData.js (renamed to sampleData.js in tour cleanup),
> src/tour/workspaceTourStops.js (tour cleanup), src/constants/steps.js
> (post-sweep audit Chunk 3). Wall layer in src/utils/studyAdvancement.js:
> evaluateAdvance, formatAdvanceRejection, formatTabRejection, the 7
> check\*Threshold wrappers, buildSubPhaseEvidence, buildStageEvidence,
> canonicalSubPhase, subPhaseToIndex (Phase F); src/utils/studyFields.js:
> answeredQuestions, flattenToText, flattenExegesis, hasMinimumSubstrate,
> hasAnyAnswer (Phases A + F). Schema: legacy_evidence_cutoff meta-row
> machinery (Phase G — orphaned meta row remains in deployed DBs). None of
> them exist in the current tree.

---

## Environment

```
.env file:          project root (never commit)
  ESV_API_KEY=...           (Crossway ESV API — optional; passage view activates when set)

OneDrive path:      C:\Users\rossa\OneDrive
Project root:       C:\Projects\SermonForge
Database file:      %APPDATA%\sermonforge\data\sermonforge.db
Build output:       C:\Projects\SermonForgeBuilds\
Study guides:       %USERPROFILE%\OneDrive\SermonForge\StudyGuides\
Manuscript exports: %USERPROFILE%\Documents\SermonForge\exports\Manuscripts\
Feedback files:     %USERPROFILE%\OneDrive\SermonForge\Feedback\
```

The userData path is resolved by `electron/config.js`. ARI removed
`ANTHROPIC_API_KEY`; the only remaining env-driven secret is `ESV_API_KEY`
(optional, used by `passage-fetch`). For BTI testers, `GITHUB_FEEDBACK_TOKEN`
is wired into the build via CI.

---

## Tech Stack

| Technology | Version | Role |
|-----------|---------|------|
| Electron | 31 | Desktop shell |
| React | 18 | UI framework |
| Vite | 5 | Dev server and bundler (config: `vite.config.mjs`, ESM) |
| sql.js | — | SQLite compiled to WASM (sermonforge.db; not better-sqlite3 — see `docs/SYSTEMS/database.md`) |
| better-sqlite3 + sqlite-vec | — | Native sqlite for theology.db (FTS4 + vec0) |
| @xenova/transformers | — | Local MiniLM-L6-v2 embedder for theology semantic search |
| docx | — | Word document generation (.docx export) |
| electron-updater | — | Auto-update from GitHub Releases |
| dotenv | — | Environment variable loading |
| Node | 24 | Runtime |

Platform: Windows 11 + macOS (signed + notarized builds since v1.0.0).

---

## File Tree

```
SermonForge/
├── CLAUDE.md              — session navigation guide (pointer document)
├── CHANGELOG.md           — full history of all changes
├── CHANGELOG-archive.md   — pre-cutoff CHANGELOG history (split for size)
├── README.md              — setup and launch instructions
├── package.json           — dependencies and npm scripts
├── vite.config.mjs        — Vite configuration (ESM; base: "./" required for Electron)
├── tsconfig.json          — TypeScript compilation rules (used by .ts/.tsx files in src/)
├── index.html             — Electron renderer entry point
├── .env                   — ESV_API_KEY, GITHUB_FEEDBACK_TOKEN (never commit)
├── docs/
│   ├── CORE.md            — authority, identity, invariants, architectural boundaries
│   ├── RULES.md           — development rules, guardrails, design system, git workflow
│   ├── ANCHORS.md         — list of anchor documents
│   ├── ENFORCEMENT_STATUS.md — per-clause enforcement table
│   ├── SYSTEMS/
│   │   ├── sermon-workspace.md  — writing surface + map + threshold overlays + notebook drawer + save flow + completeness contract
│   │   ├── database.md          — sql.js, migrations, debounces, SERMON_COLUMNS
│   │   └── ipc.md               — IPC architecture, boundaries, channel naming
│   ├── REFERENCE/
│   │   ├── schema.md            — full database table definitions
│   │   ├── ipc-channels.md      — all IPC channel specifications
│   │   ├── privacy.md           — what the app sends, what it doesn't
│   │   └── project-structure.md — this file
│   ├── PROPOSALS/         — active charters, design briefs, in-flight initiatives
│   └── ARCHIVE/           — closed initiatives (ACC, study-phase-implementation, etc.)
├── electron/
│   ├── main.js            — Electron main process, all IPC handlers, DB init, migrations
│   ├── preload.js         — contextBridge API exposed to renderer (window.electronAPI)
│   ├── config.js          — dev/prod gatekeeper (paths, ELECTRON_DEV detection)
│   ├── keystore.js        — safeStorage wrapper for the ESV API key
│   ├── logger.js          — app.log writer; captures uncaughtException
│   ├── loading.html       — splash/loading view shown during main-process boot
│   ├── updater.js         — electron-updater wiring (auto-update from GitHub Releases)
│   ├── sampleData.js      — sample-sermon seed for the Dashboard "Open a sample sermon" button (renamed from tourData.js in the tour-cleanup phase, 2026-05-17)
│   ├── contracts.cjs      — main-process mirror of src/core/contracts.ts (SERMON_COLUMNS etc.)
│   ├── dbMigration.js     — runMigrations() helpers
│   ├── embedder/          — local MiniLM-L6-v2 embedder worker (theology semantic search)
│   │   ├── host.js        — embedder worker host (renderer/main bridge)
│   │   └── worker.js      — the worker entry point
│   └── telemetry/
│       ├── bus.js         — in-process event bus + NDJSON buffer
│       ├── config.js      — Cloudflare worker URL + ingest-token env wiring (replaces the prior `transport.js`; the bus reads config from process.env and runs local-only when unset)
│       └── events.js      — registered event vocabulary
└── src/
    ├── main.jsx           — React entry point
    ├── App.jsx            — top-level routing and state
    ├── utils.js           — shared utilities: tryParse, formatDate, autoResize,
    │                        createOutlinePoint (the only place outline points are created),
    │                        getOutline / getFunctionalElements / parseManuscript readers
    ├── styles/
    │   ├── global.css     — full design system, all CSS variables
    │   └── typography.css — Google Fonts loaders for IBM Plex Serif/Mono/Sans + JetBrains Mono
    ├── core/
    │   ├── contracts.ts   — STAGE/SUB_PHASE/VIEW enums, SERMON_COLUMNS, MutationKind (STEP enum retired with src/constants/steps.js in post-sweep audit Chunk 3, 2026-05-18)
    │   └── spine.ts       — single sermon/series state surface (the only path)
    ├── db/
    │   └── database.js    — IPC-backed wrapper functions for non-spine channels
    ├── constants/
    │   └── sermonColumns.js — re-export of SERMON_COLUMNS from core/contracts.ts
    ├── contexts/          — React context providers (empty post-sweep — TourContext was the sole occupant; deleted in tour-cleanup phase 2026-05-17. Directory kept for when the next context provider lands)
    ├── data/              — static data (currently `downstream-browsers.json.md` only)
    ├── datasets/          — bundled study + dashboard rotation datasets (churchHistory, preacherQuotes, preachingVerses)
    ├── utils/
    │   ├── churchCalendar.js   — liturgical season engine (ESM; cannot be imported from main.js)
    │   ├── studyFields.js      — Study field defs (OBSERVE_FIELDS, INTERPRET_FIELDS, REDEMPTIVE_FIELDS, IMPLICATIONS_FIELDS)
    │   ├── sadiAnchorFields.js — SADI Step 2 MAIN_POINT_PAIR_FIELDS
    │   ├── sermonFrameFields.js — SADI Step 5 SERMON_FRAME_FIELDS
    │   ├── studyAdvancement.js — 8 composite gate functions (completeness contract); hasContent helper. Post-Phase-F (2026-05-17): wall layer deleted (evaluateAdvance + check*Threshold wrappers + evidence builders + formatters).
    │   ├── walkOrder.js        — D2c: canonical WALK_ORDER + QUESTION_WALK_ORDER + nextField traversal; single sequence the writing surface and the map both consume
    │   ├── sermonState.js      — D2a: derivation helpers (deriveCurrentPositionFromSermon, deriveQuestionStatesFromSermon, deriveStudyOutcomesFromSermon, deriveStudyUnfinishedFromSermon, THRESHOLD_ID, hasSeenThreshold, nextThresholdsSeen, STAGE_SUBPHASE_TO_COLUMN, serializePosition)
    │   ├── useEsvPassage.js    — D2b: canonical ESV fetch + cache hook; consumed by PassagePopup and the writing-surface passage column
    │   ├── searchHints.js      — hint copy for the cross-references search surfaces
    │   └── hooks.js            — shared React hooks (useDebounce)
    └── components/
        ├── Sidebar.jsx
        ├── Dashboard.jsx
        ├── DashboardVerseCarousel.jsx
        ├── DashboardPreacherQuote.jsx
        ├── SermonList.jsx
        ├── Calendar.jsx
        ├── CompletedSermons.jsx
        ├── Archive.jsx              — legacy Archive surface; CompletedSermons is the canonical re-entry
        ├── SermonWorkspace.jsx      — workspace mount: loads sermon, derives position + threshold-flag state, composes writing surface + map + overlays + notebook + passage popup. Post-D2c rewrite (2026-05-17)
        ├── SermonWorkspaceFixture.jsx — D2c: three workspace scenarios (empty / populated / at-handoff) for preview verification
        ├── SermonWritingSurface.jsx — D2c: the writing surface (one field at a time + passage column + chevron-next + map summon + notebook summon + beforePositionChange flush chain)
        ├── SermonWritingSurfaceFixture.jsx — D2c: writing-surface scenarios (field / reentry / handoff / units=0 / start=1)
        ├── SermonMap.jsx            — D2c: the summoned map; vertical question list with answered / partial / unanswered weighting via deriveQuestionStatesFromSermon
        ├── SermonStartLanding.jsx   — D2c: sermon-start threshold (.ssl-overlay); fires on NULL last_touched_position
        ├── StudyAnchorHandoff.jsx   — D2c: Study → Anchor stage-boundary threshold (.sah-overlay); reads the four Study named outcomes; actively surfaces missing required outcomes with "go write it" doors
        ├── WorkspaceNotebookDrawer.jsx — D2d: workspace-level notebook overlay; column-by-stage dispatch (notebook_study / notebook_blueprint / notebook_manuscript)
        ├── IndentedSentenceCanvas.jsx — Phase 1 Field 3 unified-canvas
        ├── SynthesisTable.jsx       — Cumulative thought-unit table (Phases 2/3/4)
        ├── PassageCanvas.jsx        — Writing-surface passage column primitive (consumes useEsvPassage)
        ├── PassagePopup.jsx         — Floating ESV scripture viewer (portal to document.body)
        ├── EsvKeyModal.jsx          — First-run ESV API key entry modal
        ├── NewSermonModal.jsx
        ├── SetupScreen.jsx          — First-run setup (ESV key + telemetry preference)
        ├── OneDriveWarning.jsx
        ├── SearchResultSnippet.jsx
        ├── DeleteButton.jsx         — Two-step confirm (re-exported from primitives/)
        ├── InlineError.jsx
        ├── Logo.jsx
        ├── FeedbackFlag.jsx         — BTI Tier 1 in-app flag affordance. Dormant post-sweep (all pre-sweep mount surfaces deleted); re-mount is BTI Phase 2+ work
        ├── FeedbackForm.jsx         — BTI Tier 2 form (sidebar entry → self-contained modal)
        └── primitives/
            ├── PrimaryButton.tsx
            ├── SecondaryButton.tsx
            ├── IconButton.tsx
            ├── TextButton.tsx
            ├── BackButton.tsx
            ├── EmptyState.tsx
            ├── LoadingState.tsx
            └── DeleteButton.jsx

    Each component above has a co-located `componentName.css` (or `.module.css`
    for Logo). CSS files omitted from this tree for brevity.
```
