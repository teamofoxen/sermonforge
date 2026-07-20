# SermonForge

A local-first sermon preparation workspace for pastors. Built with Electron, React,
Vite, and SQLite (better-sqlite3). **No AI** — the system asks structured questions
and the pastor authors every word; all AI surfaces were removed 2026-05-09 and may
not return (`docs/CORE.md`, Process Contract #5).

## Setup (development)

Node **>= 24** is required (`package.json` `engines`; every CI job pins
**Node 24**). This is not a preference — `package-lock.json` is written by
**npm 11**, which ships with Node 24, and npm 10 (the npm bundled with Node 20
and 22) cannot install it: `npm ci` fails outright with a missing-from-lock
error. The shipped app runs on Electron's own bundled Node either way, so this
constraint is about the build, not the product.

`tests/contracts/release-pipeline.test.ts` asserts that this line, the
`engines.node` field, and every workflow's `node-version` pin agree — so this
paragraph cannot drift away from what CI actually does.

1. Install dependencies:

   ```
   npm ci
   ```

   `npm ci` is the supported install — it installs the lockfile exactly and
   FAILS on package.json/package-lock drift instead of silently rewriting the
   lock the way `npm install` would (CI does the same). Native modules must be
   rebuilt for Electron's ABI after install if the app complains on boot:
   `npx @electron/rebuild -m node_modules/better-sqlite3` (the
   `better-sqlite3-node` devDependency is a same-version alias the test suite
   uses so that rebuild can never break `npm test`).

2. Optional — create `.env` in the project root for the dev passage view:

   ```
   ESV_API_KEY=your-key-here
   ```

   This is the only secret the app consumes, and it is optional (from
   [api.esv.org](https://api.esv.org); without it the passage view stays empty).
   Packaged builds never read `.env` — end users enter their own ESV key, skippable,
   on the first-run setup screen (`SetupScreen.jsx`), stored via the OS keystore
   (`electron/keystore.js`).

3. Launch:

   ```
   npm start          # Electron app (dev)
   npm run dev        # Vite-only browser preview — UI renders; DB/IPC calls are stubbed
   npm test           # vitest suite
   npm run build      # Windows installer → C:\Projects\SermonForgeBuilds\
   ```

## What's in the app

- **Dashboard** — a re-entry point, not a stats page: build a sermon, pick up where
  you left off, or open the worked sample sermon (Romans 5:1–5).
- **Sermon Workspace** — the prep walk: **Study** (Observe → Interpret → Redemptive
  Thread → Implications) → **Assembly** (Anchor: the MPT/MPS Main Point Pair ·
  Outline) → **Manuscript** (Body, then Intro/Transitions/Conclusion). One writing
  surface with a summonable map, the ESV passage alongside in the reference pane,
  per-stage notebooks, autosave with close-flush, and a re-openable Finish screen
  carrying **Export to Word** and **Mark as preached**.
- **All Sermons / Preached Sermons** — the library: search, soft delete with Undo,
  re-open and per-sermon Word export for preached sermons.
- **Series Planning** — the macro planner. A series is **Book**-led (Book ▸ Section ▸
  Sermon) or **Topical** (theme-led, flat pastor-ordered sermon list), across three
  screens: Outline · Schedule (Sundays, church seasons, pacing) · Study guide (an
  editable congregational booklet with its own Word export).
- **What I've Preached** — coverage in two lenses: By book (the Series Arc) and
  By topic (sermon tags).
- **Calendar** — the preaching schedule; clicking a day starts a new sermon with that
  date pre-filled.
- Light/dark theme (sidebar toggle), in-app feedback to the developer, and automatic
  updates from GitHub Releases.

## Database

Local-first SQLite via **better-sqlite3** (WAL mode; writes commit durably at the IPC
handler). Everything lives under Electron's `userData` path — no cloud, no server:

- Packaged: `<userData>\data\sermonforge.db`
- Dev: `<userData>\data-dev\sermonforge.db` (kept separate from real data)

`theology.db` (better-sqlite3 + sqlite-vec) exists on disk as dormant corpus
infrastructure — retained per the AI-removal charter, no live consumer.

Privacy: sermon content never leaves the machine. The only outbound calls are the ESV
passage fetch, the auto-updater's version check, and opt-out interaction metadata —
see `docs/REFERENCE/privacy.md`.

## Distribution

GitHub Actions builds both installers (Windows NSIS `.exe`, signed + notarized macOS
`.dmg`) on every `v*` tag and publishes them to GitHub Releases; installed apps
auto-update. See `docs/PROPOSALS/distribution.md` (Section 14 is the live pipeline
reference) and `docs/REFERENCE/release-smoke.md`.

## Documentation

`CLAUDE.md` is the navigation guide. `docs/CORE.md` is the law (identity, contracts,
non-negotiables); `docs/RULES.md` governs development; `docs/WORKSPACE-CANON.md` holds
the sermon walk's what & why; `docs/SYSTEMS/` holds current mechanics.
