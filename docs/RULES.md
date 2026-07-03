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
3. Always verify `npm start` works after changes.
4. Never mark an issue as fixed without verifying it actually works.
5. This app ships cross-platform — Windows NSIS installer + notarized macOS DMG (since
   v1.1.0) — always use `path.join()`, never hardcode path separators.
6. Installers are built by `/release` (rewritten 2026-06-10 — the old rule
   demanded `npm run build` after every change set, a pre-distribution-era
   habit). A local `npm run build` is required only when the change touches
   packaging surface (electron-builder config, `asarUnpack`,
   `extraResources`, preload wiring) — then verify the packaged app boots
   before commit. Output goes to `C:\Projects\SermonForgeBuilds\`.
   - `base: "./"` in `vite.config.mjs` is required (Electron loads from `file://`, not `http://`).
   - (The `sql-wasm.wasm` asarUnpack requirement died with the sql.js
     driver, removed in the better-sqlite3 swap 2026-06-10.)
   - **`.env` must NEVER be in `extraResources`.** Bundling it ships the developer's
     secrets (Anthropic key, GitHub PAT, telemetry/ESV/Bible keys) in plaintext to
     every user — the public-launch hardening pass (2026-06-09) removed it after the
     audit found exactly this leak. The app needs no bundled secrets at runtime: the
     ESV key comes from the per-user OS keystore (`electron/keystore.js`), and the
     telemetry endpoint is a public URL hardcoded in `electron/telemetry/config.js`
     hitting a token-free `/ingest`. Any value the app needs in production must come
     from the keystore or source — never a shipped `.env`.
7. Update `CHANGELOG.md` after every change — what changed and why.

---

## Guardrails

### Boundaries
- No direct use of `window.electronAPI` outside wrapper modules.
- No raw SQL outside the database layer (`electron/main.js` handlers).
- No AI surfaces, no AI calls. SermonForge contains no AI (ARI, 2026-05-09).

### No Silent Failures
- Do not swallow errors with empty catch blocks.
- JSON parsing must validate or log failures.
- No silent fallback behavior that hides real errors.

### No Duplication
- Reuse existing helpers; do not duplicate shared logic or constants.
- Check for an existing utility before writing a new one.
- `createOutlinePoint(text)` is the only place outline points are created — see `docs/CORE.md`.

### Change Discipline
- Make minimal, surgical changes.
- Do not introduce new patterns unnecessarily.
- Do not add features, error handling, or abstractions beyond what the task requires.
- Database writes commit at the IPC handler (better-sqlite3) — never add a main-process
  save debounce or queue in front of them. See `docs/CORE.md`.

### Normalization Discipline

Evidence-based architecture normalization is allowed only when the evidence is
named before implementation. Valid evidence includes duplicated derivations of
the same canonical truth, code/docs/schema disagreement, repeated defensive
tests around one concept, stale ownership paths, or manual repo-wide coordination
that predictably threatens a CORE contract.

Rules:
- Plan first; do not implement normalization in the same step unless explicitly approved.
- Normalize one seam at a time.
- Preserve current pastor-facing behavior unless a behavior change is separately approved.
- Add or identify tests that prove current behavior before moving logic.
- Prefer deletion, consolidation, pure derivation, or adapter boundaries before new abstraction.
- Do not introduce a global state system, mega-hook, mega-domain object, or schema migration by default.
- Stop when the evidenced drift is removed.

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
- IBM Plex Serif — headings, body copy, italic quotes, sermon manuscripts, all prose (the reading voice)
- JetBrains Mono — wordmark, eyebrows, scripture refs, attributions, dates, all meta/labels (the structural voice)
- IBM Plex Sans — reserve, available for any future dense-UI surface
- Self-hosted (bundled woff2 at `src/styles/fonts/`, loaded by `src/styles/fonts.css` via `typography.css` — no network font call since 2026-07-01). Tokens: `--font-serif`, `--font-mono`, `--font-sans`.

**Layout:**
- Sidebar: 260px, `var(--sidebar-bg)` background (dark in both themes; `--ink` is a
  foreground token that flips light in dark mode — never use it as the sidebar background),
  gold gradient right border via `.sidebar::after`
- Content area: `var(--parchment)` background
- Topbar: always-dark bar (`#1a1410`, deeper in dark theme), 1px black bottom border with a
  gold-gradient seam via `.topbar::after` — no shadow

**Component rules:**
- `btn-primary`: `var(--gold)` background, white text
- `btn-ghost`: transparent, `parchment-deep` border
- Cards: white background, `parchment-deep` border, `shadow-soft`
- Status pills: `stage-in_progress` (sage) and `stage-complete` (gold) — the
  only two lifecycle values (user-facing word for complete is "Preached").
  (Fossil six-value badge list — planning/study/outline/writing/ready/
  archived — and the "Big Idea box" deleted 2026-06-10; neither concept
  exists in the contracts. MPT/MPS is the canonical vocabulary, not
  "Big Idea".)

---

## Git Workflow

### Before starting work
- Branch for tasks touching more than 1–2 files or spanning multiple sessions:
  `git checkout -b feature/desc` or `fix/desc` or `refactor/desc`
- Low-risk, single-file changes may be made directly on main.

### Pushing
- Push to `origin/main`. No PR gate — this is a solo-developer project and review is live as work is done.
- `/end-session` runs preflight + drift-check + CHANGELOG + commit + push as one flow. Manual `git push origin main` is fine when the work doesn't need that ceremony.

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
