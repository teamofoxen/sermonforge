# SermonForge — Rules

> **Prerequisites:** Always load `docs/CORE.md` before this file. Core constraints (invariants,
> architectural boundaries) are not repeated here — they are authoritative in CORE.md.

---

## Session Protocol

- Load `docs/CORE.md` at the start of every session.
- Load this file (`RULES.md`) before any code change.
- Load only the relevant `docs/SYSTEMS/*` file for the area of work.
- Load `docs/REFERENCE/*` files only when you need specific schema, channel, or structure details.
- Load `CHANGELOG.md` only when the task touches a system with recent relevant history — e.g.,
  debugging a regression, understanding why something was built a particular way, or checking
  what changed in the last build. **Do not load CHANGELOG.md by default on every session.**

---

## Development Rules

1. Never change the design system without explicit user approval.
2. Never change the database schema without approval and a migration plan. All schema changes
   must go through `runMigrations()` with a version increment — never alter `CREATE TABLE`
   without also adding a migration.
3. Never expose `ANTHROPIC_API_KEY` to the renderer process.
4. All Claude API calls must go through IPC `"ai-message"` channel via `sendAIMessage()`.
5. Always verify `npm start` works after changes.
6. Never mark an issue as fixed without verifying it actually works.
7. This is a Windows app on OneDrive — always use `path.join()`, never hardcode path separators.
8. After completing any set of changes, run `npm run build` to produce an updated installer.
   Output goes to `C:\Projects\SermonForgeBuilds\`. Do not wait to be asked —
   build is part of finishing a task.
   - `base: "./"` in `vite.config.mjs` is required (Electron loads from `file://`, not `http://`).
   - electron-builder: `sql-wasm.wasm` must be in `asarUnpack`; `.env` must be in `extraResources`.
9. Update `CHANGELOG.md` after every change — what changed and why.

---

## Guardrails

### Boundaries
- No direct use of `window.electronAPI` outside wrapper modules.
- No raw SQL outside the database layer (`electron/main.js` handlers).
- All AI calls must go through `sendAIMessage` (`src/utils/ai.js`).

### No Silent Failures
- Do not swallow errors with empty catch blocks.
- JSON parsing must validate or log failures.
- No silent fallback behavior that hides real errors.

### No Duplication
- Reuse existing helpers; do not duplicate shared logic or constants.
- Check for an existing utility before writing a new one.
- `createOutlinePoint(text)` is the only place outline points are created — see `docs/CORE.md`.

### Memory / AI Feedback Loop
- `phrasePatterns` and `aiPhrasePatterns` must never be merged — see `docs/CORE.md`.
- If the runtime guard in `updateMemory()` fires, fix the call site; do not remove the guard.

### Change Discipline
- Make minimal, surgical changes.
- Do not introduce new patterns unnecessarily.
- Do not add features, error handling, or abstractions beyond what the task requires.
- The 500ms debounce on `saveDb()` is deliberate — see `docs/CORE.md`.
- Pastor memory in `localStorage` is intentional but fragile: it does not survive Electron major
  version upgrades. Do not move it to the DB without considering the IPC round-trip cost on
  every AI call.

### Pre-Completion Check
Before finishing any change verify:
- No boundary violations
- No silent failure patterns introduced
- No unnecessary duplication

---

## Design System

Never deviate without explicit user approval. All values live in `src/styles/global.css` as CSS
variables. Never hardcode these values anywhere else.

**Colors:**
```
--ink: #1a1410          --ink-mid: #3d3229        --ink-soft: #6b5c4e      --ink-ghost: #a8998a
--parchment: #f7f3ec    --parchment-warm: #efe9de  --parchment-deep: #e4dace
--gold: #b8860b         --gold-bright: #d4a017     --gold-pale: #f0e4b8
--crimson: #8b1a1a      --crimson-soft: #c0392b
--sage: #4a6741         --sage-soft: #6b9c60       --slate: #2c3e50         --white: #ffffff
```

**Typography:**
- Playfair Display — headings, sermon titles, italic accents, delivery view
- Crimson Pro — body text, labels, nav items, all prose
- JetBrains Mono — passage references only
- Loaded from Google Fonts.

**Layout:**
- Sidebar: 260px, `var(--ink)` background, gold gradient right border
- Content area: `var(--parchment)` background
- AI Panel: 320px right sidebar, white background
- Topbar: white background, soft shadow

**Component rules:**
- `btn-primary`: `var(--gold)` background, white text
- `btn-ghost`: transparent, `parchment-deep` border
- Cards: white background, `parchment-deep` border, `shadow-soft`
- Stage badges: planning=sage, study=orange, outline=slate, writing=crimson, ready=green, archived=ghost
- Big Idea box: ink background, gold quote watermark, Playfair italic

---

## Git Workflow

### Before starting work
- Branch for tasks touching more than 1–2 files or spanning multiple sessions:
  `git checkout -b feature/desc` or `fix/desc` or `refactor/desc`
- Low-risk, single-file changes may be made directly on main.

### Branch naming
- `feature/` — new functionality (e.g. `feature/booklet-export`)
- `fix/` — bug fixes (e.g. `fix/calendar-feedback`)
- `refactor/` — structural changes with no new behavior (e.g. `refactor/ipc-consolidation`)

### During work
- Commit at logical checkpoints with descriptive messages (what changed and why, not just "updates").

### Finishing a branch
1. `git checkout main && git merge feature/description`
2. `git push`
3. `git branch -d feature/description`

### Never
- Force push to main.
- Commit `.env`, `.db` files, or `node_modules`.
