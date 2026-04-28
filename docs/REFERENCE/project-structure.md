# SermonForge — Project Structure Reference

---

## Environment

```
.env file:          project root (never commit)
  ANTHROPIC_API_KEY=sk-ant-...
  ESV_API_KEY=...           (Crossway ESV API — optional; ESV column activates when set)

OneDrive path:      C:\Users\rossa\OneDrive
Project root:       C:\Users\rossa\OneDrive\SermonForge
Database file:      C:\Users\rossa\OneDrive\SermonForge\sermonforge.db
Build output:       C:\Users\rossa\OneDrive\SermonForgeBuilds\
Study guides:       C:\Users\rossa\OneDrive\SermonForge\StudyGuides\
Feedback files:     C:\Users\rossa\OneDrive\SermonForge\Feedback\
```

---

## Tech Stack

| Technology | Version | Role |
|-----------|---------|------|
| Electron | 31 | Desktop shell |
| React | 18 | UI framework |
| Vite | 5 | Dev server and bundler (config: `vite.config.mjs`, ESM) |
| sql.js | — | SQLite compiled to WASM (not better-sqlite3 — see `docs/SYSTEMS/database.md`) |
| @anthropic-ai/sdk | — | Claude API client |
| dotenv | — | Environment variable loading |
| docx | — | Word document generation (.docx export) |
| Node | 24 | Runtime |

Platform: Windows 11 · Storage: OneDrive

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
├── .env                   — API keys and paths (never commit)
├── docs/
│   ├── CORE.md            — authority, identity, invariants, architectural boundaries
│   ├── RULES.md           — development rules, guardrails, design system, git workflow
│   ├── SYSTEMS/
│   │   ├── context-pipeline.md  — 7-tier context assembly; buildContext, tiers, budgets
│   │   ├── ai-panel.md          — AI panel behavior, system prompt, Tune-Up Engine
│   │   ├── series-planner.md    — Series Planner tabs, Study Guide, calendar engine
│   │   ├── sermon-workspace.md  — Study tab structure, Pastoral Intelligence, save flow
│   │   ├── database.md          — sql.js, migrations, debounces, SERMON_COLUMNS
│   │   └── ipc.md               — IPC architecture, boundaries, channel naming
│   └── REFERENCE/
│       ├── schema.md            — full database table definitions
│       ├── ipc-channels.md      — all IPC channel specifications
│       └── project-structure.md — this file
├── electron/
│   ├── main.js            — Electron main process, all IPC handlers, DB init, migrations
│   ├── ai.js              — Anthropic client + "ai-message" IPC handler
│   └── preload.js         — contextBridge API exposed to renderer (window.electronAPI)
└── src/
    ├── main.jsx           — React entry point
    ├── App.jsx            — top-level routing and state
    ├── styles/
    │   └── global.css     — full design system, all CSS variables
    ├── db/
    │   └── database.js    — IPC-backed wrapper functions (components import from here)
    ├── utils.js           — shared utilities: tryParse, formatDate, autoResize,
    │                        createOutlinePoint (the only place outline points are created)
    ├── utils/
    │   ├── ai.js             — sendAIMessage(): single AI call choke point for all renderer-side AI calls
    │   ├── churchCalendar.js — liturgical season engine (ESM; cannot be imported from main.js)
    │   ├── contextBuilder.js — 7-tier context assembly pipeline: buildContext, buildAdaptiveHints,
    │   │                        buildMemoryContext, resolveIncludes, summarizeExegesis
    │   ├── studyFields.js    — structured worksheet field definitions (OBSERVE_FIELDS,
    │   │                        INTERPRET_FIELDS, REDEMPTIVE_FIELDS, IMPLICATIONS_*);
    │   │                        parse/serialize/flattenExegesis helpers
    │   ├── hooks.js          — shared React hooks (useDebounce)
    │   └── memory.js         — localStorage pastor memory layer; load/save/update/extract;
    │                            updateMemory() contains phrasePatterns guard (do not remove)
    ├── constants/
    │   ├── steps.js          — STEPS, PHASES, STEP_SEQUENCE, PHASE_SEQUENCE
    │   └── contextSchema.js  — CONTEXT_SECTIONS: shared section label constants
    └── components/
        ├── Sidebar.jsx
        ├── Dashboard.jsx
        ├── Planning.jsx           — Series list + biblical coverage view
        ├── SeriesPlanner.jsx      — Series planning workspace (5 tabs) + StudyGuideModal
        ├── SermonList.jsx
        ├── Calendar.jsx
        ├── Illustrations.jsx
        ├── Archive.jsx
        ├── Library.jsx            — Sermon library import + search
        ├── SermonWorkspace.jsx
        ├── StudyTab.jsx
        ├── OutlineTab.jsx
        ├── ManuscriptTab.jsx
        ├── DeliveryTab.jsx
        ├── AIPanel.jsx
        ├── PassagePopup.jsx       — floating 3-translation scripture viewer (portal to document.body)
        └── NewSermonModal.jsx
```
