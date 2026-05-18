# SermonForge — Project Structure Reference

> Last verified: 2026-05-11 (post-WTC audit fixes).
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
├── CLAUDE_original.md     — original monolithic project bible (historical reference)
├── CHANGELOG.md           — full history of all changes
├── README.md              — setup and launch instructions
├── package.json           — dependencies and npm scripts
├── vite.config.mjs        — Vite configuration (ESM; base: "./" required for Electron)
├── index.html             — Electron renderer entry point
├── .env                   — ESV_API_KEY, GITHUB_FEEDBACK_TOKEN (never commit)
├── docs/
│   ├── CORE.md            — authority, identity, invariants, architectural boundaries
│   ├── RULES.md           — development rules, guardrails, design system, git workflow
│   ├── ANCHORS.md         — list of anchor documents
│   ├── ENFORCEMENT_STATUS.md — per-clause enforcement table
│   ├── SYSTEMS/
│   │   ├── sermon-workspace.md  — Study/Blueprint/Manuscript tabs, Pastoral Context, save flow
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
│   ├── updater.js         — electron-updater wiring (auto-update from GitHub Releases)
│   ├── sampleData.js      — sample-sermon seed for the Dashboard "Open a sample sermon" button (renamed from tourData.js in the tour-cleanup phase, 2026-05-17)
│   ├── contracts.cjs      — main-process mirror of src/core/contracts.ts (SERMON_COLUMNS etc.)
│   ├── dbMigration.js     — runMigrations() helpers
│   ├── embedder/          — local MiniLM-L6-v2 embedder worker (theology semantic search)
│   └── telemetry/
│       ├── bus.js         — in-process event bus + NDJSON buffer
│       ├── transport.js   — Cloudflare Worker batch transport
│       └── events.js      — registered event vocabulary
└── src/
    ├── main.jsx           — React entry point
    ├── App.jsx            — top-level routing and state
    ├── utils.js           — shared utilities: tryParse, formatDate, autoResize,
    │                        createOutlinePoint (the only place outline points are created)
    ├── styles/
    │   ├── global.css     — full design system, all CSS variables
    │   └── typography.css — Google Fonts loaders for IBM Plex Serif/Mono/Sans + JetBrains Mono
    ├── core/
    │   ├── contracts.ts   — STAGE/STEP/SUB_PHASE/VIEW enums, SERMON_COLUMNS, MutationKind
    │   └── spine.ts       — single sermon/series state surface (the only path)
    ├── db/
    │   └── database.js    — IPC-backed wrapper functions for non-spine channels
    ├── constants/
    │   ├── steps.js       — STEPS, PHASES, STEP_SEQUENCE, PHASE_SEQUENCE
    │   └── sermonColumns.js — re-export of SERMON_COLUMNS from core/contracts.ts
    ├── contexts/          — React context providers
    ├── data/              — static data (verse rotations, preacher quotes)
    ├── datasets/          — bundled study datasets
    ├── tour/              — workspace tour data + step definitions
    ├── utils/
    │   ├── churchCalendar.js — liturgical season engine (ESM; cannot be imported from main.js)
    │   ├── studyFields.js    — Study field defs (OBSERVE_FIELDS, INTERPRET_FIELDS, REDEMPTIVE_FIELDS, IMPLICATIONS_FIELDS)
    │   ├── sadiAnchorFields.js — SADI Step 2 MAIN_POINT_PAIR_FIELDS
    │   ├── sermonFrameFields.js — SADI Step 5 SERMON_FRAME_FIELDS
    │   ├── studyAdvancement.js — 8 composite gate functions (completeness contract); hasContent helper. Post-Phase-F (2026-05-17): wall layer deleted (evaluateAdvance + check*Threshold wrappers + evidence builders + formatters).
    │   └── hooks.js          — shared React hooks (useDebounce)
    └── components/
        ├── Sidebar.jsx
        ├── Dashboard.jsx
        ├── DashboardVerseCarousel.jsx
        ├── DashboardPreacherQuote.jsx
        ├── SermonList.jsx
        ├── Calendar.jsx
        ├── CompletedSermons.jsx
        ├── Archive.jsx              — legacy Archive surface; CompletedSermons is the canonical re-entry
        ├── SermonWorkspace.jsx
        ├── StudyTab.jsx             — Study tab (Exegesis only — 4 sub-phases: Observe / Interpret / Redemptive Thread / Implications)
        ├── AssemblyTab.jsx          — Assembly tab (4 sub-phases: Anchor / Outline / Equip / Frame). Hosts MPT/MPS, Outline, FE, Intro/Conclusion. Post-workspace-restructure 2026-05-10.
        ├── ManuscriptTab.jsx        — Manuscript editor body (terminal sermon-prep stage post-ARI). Mounts inside `ManuscriptTrail` writing-room shell.
        ├── ManuscriptTrail.jsx      — Writing-room shell wrapping ManuscriptTab (WTC DW5).
        ├── ManuscriptReview.jsx     — Flow Check / Ear Check / Final Tune-Up structured prompts (read-only)
        ├── StudyTrailExegesis.jsx   — Switchback-trail rendering for Study (4 sub-phases × 25 fields + 4 pauses)
        ├── AssemblyTrail.jsx        — Switchback-trail rendering for Assembly (4 sub-phases — Anchor / Outline / Equip / Frame)
        ├── studyTrailShared.jsx     — Shared trail primitives: TrailTopBar, NotebookDrawer, StageBoundaryPause, useTrailKeyboard, useViewportSize, TrailLiveRegion, etc.
        ├── studyTrail.css           — Scoped CSS for the trail (.tw-shell namespace)
        ├── WorkspaceTrailMap.jsx    — Three-row switchback overview modal (WTC DW11)
        ├── IndentedSentenceCanvas.jsx — Phase 1 Field 3 unified-canvas
        ├── SynthesisTable.jsx       — Cumulative thought-unit table (Phases 2/3/4)
        ├── PeripheralReferencePanel.jsx — Cross-field reference cards
        ├── ScripturePanel.jsx       — In-workspace passage display
        ├── PassagePopup.jsx         — Floating ESV scripture viewer (portal to document.body)
        ├── OutlineBuilder.jsx
        ├── NewSermonModal.jsx
        ├── SetupScreen.jsx          — First-run setup (ESV key + telemetry preference)
        ├── OneDriveWarning.jsx
        ├── DeleteButton.jsx         — Two-step confirm (re-exported from primitives/)
        ├── InlineError.jsx
        ├── Logo.jsx
        ├── FeedbackFlag.jsx         — BTI Tier 1 flag button (Study/Assembly/Manuscript)
        ├── FeedbackForm.jsx         — BTI Tier 2 form (sidebar entry → modal)
        ├── FeedbackModal.jsx        — Legacy feedback modal
        └── primitives/
            ├── PrimaryButton.tsx
            ├── SecondaryButton.tsx
            ├── IconButton.tsx
            ├── TextButton.tsx
            ├── BackButton.tsx
            ├── EmptyState.tsx
            ├── LoadingState.tsx
            ├── Collapsible.jsx
            └── DeleteButton.jsx
```
