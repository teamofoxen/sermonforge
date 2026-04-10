# SermonForge — Core

> **Authority:** This document, together with `docs/RULES.md` and the `docs/SYSTEMS/*` files, defines
> the system. All constraints here are binding. If code diverges from these rules, the code is wrong
> unless explicitly justified. `CLAUDE_original.md` is the original monolithic version — retained for
> historical reference only; do not use it as a working guide.

---

## Project Identity

SermonForge is a **local-first Electron desktop app** for a pastor who preaches ~42 weeks/year.
All data lives on the user's machine, backed up automatically via OneDrive. There is no backend,
no server, no web deployment. The user is not a developer; all tooling decisions must prioritize
simplicity.

**The series is the primary unit of pastoral work. The sermon is an instance within it.** The
Dashboard is a series planning room. The Sermon Workspace exists within the context of a series.
Every UX decision must reflect this hierarchy — the Calendar assigns sermons to Sundays, not just
displays a schedule; reference features (Illustrations, Library, Archive) are resources within
the workflow, not top-level destinations.

*One-sentence identity: SermonForge starts where sermon prep actually starts — with the series.
Plan the arc, divide the passage, then go deep on each sermon with AI assistance calibrated to
every stage.*

---

## Non-Negotiable Architectural Boundaries

- **No backend.** Local-first only. No web API, no server process, no remote storage.
- **API key never reaches the renderer.** `ANTHROPIC_API_KEY` is loaded in the main process
  only and is never passed to the renderer via IPC or any other path.
- **All AI calls go through IPC.** Every Claude API call — without exception — must go through
  the `"ai-message"` IPC channel via `sendAIMessage()` in `src/utils/ai.js`.
- **No raw SQL in the renderer.** All database operations go through named IPC channels handled
  in `electron/main.js`. No SQL is accepted from the renderer.
- **No direct `window.electronAPI` outside wrapper modules.** Components use `src/db/database.js`
  exports; they never call `window.electronAPI` directly.
- **sql.js, not better-sqlite3.** Native compilation is blocked (Node 24 + VS2026 environment).
  This is an environment constraint, not a permanent architectural preference.
- **ESM/CJS boundary.** `src/utils/churchCalendar.js` is ESM and cannot be imported from
  `electron/main.js` (CommonJS). Any main-process feature needing liturgical season logic
  must inline it.
- **Schema changes require migrations.** Never alter `CREATE TABLE` statements directly. All
  schema changes go through `runMigrations()` with a version increment.
  See `docs/SYSTEMS/database.md`.

---

## Absolute Invariants

- **`createOutlinePoint(text)` is the only place outline points are created.** Located in
  `src/utils.js`. It assigns the stable UUID that `functional_elements` keys depend on.
  Never construct `{id, text}` objects inline anywhere else.

- **`phrasePatterns` and `aiPhrasePatterns` must never be merged.**
  - `phrasePatterns` = pastor's own rhetorical patterns extracted from manuscript; used in
    adaptive hints to guide generation.
  - `aiPhrasePatterns` = patterns extracted from AI responses; for analysis only, never
    influence generation.
  - A runtime assertion in `src/utils/memory.js` `updateMemory()` throws in dev mode if
    an AI-sourced phrase is written to `phrasePatterns`. Do not remove this guard.
    If it fires, fix the call site routing AI content to the wrong key.

- **The 500ms debounce on `saveDb()`** is a deliberate trade-off. sql.js serializes the
  entire DB on every write; reducing this debounce would cause UI sluggishness on every
  keystroke. Do not reduce it or add synchronous writes.

- **The design system lives entirely in `src/styles/global.css`** as CSS variables. Never
  hardcode colors, font names, or layout dimensions outside that file. Never change the
  design system without explicit user approval.

---

## Tech Stack (summary)

Electron 31 · React 18 · Vite 5 (config: `vite.config.mjs`) · sql.js (WASM SQLite) ·
@anthropic-ai/sdk · dotenv · Node 24 · Windows 11 / OneDrive storage.

Full details: `docs/REFERENCE/project-structure.md`.
