# SermonForge

This file is a navigation guide. Do not load everything by default.

---

## Always load

- [`docs/CORE.md`](docs/CORE.md) — authority, project identity, non-negotiable constraints, absolute invariants

## Load for any code change

- [`docs/RULES.md`](docs/RULES.md) — development rules, guardrails, design system, git workflow

## Load for the specific area of work

| Task area | Load | Also check |
|-----------|------|------------|
| Sermon workspace — the walk's *what & why* (questions, named outcomes, completeness policy, Merida fidelity) | [`docs/WORKSPACE-CANON.md`](docs/WORKSPACE-CANON.md) | the law is `docs/CORE.md` |
| Sermon workspace — *how & where* (components, JSON columns, save flow, study tab, PassagePopup) | [`docs/SYSTEMS/sermon-workspace.md`](docs/SYSTEMS/sermon-workspace.md) | [`docs/WORKSPACE-CANON.md`](docs/WORKSPACE-CANON.md) for the what & why |
| Series Planner — macro/architect series planning (three-screen planner: Outline · Schedule · Study guide; create-then-update, study-guide export) | [`docs/SYSTEMS/series-planner.md`](docs/SYSTEMS/series-planner.md) | [`docs/PROPOSALS/series-planner-revival-charter.md`](docs/PROPOSALS/series-planner-revival-charter.md) for the what & why / decisions |
| Database, schema, migrations, FTS | [`docs/SYSTEMS/database.md`](docs/SYSTEMS/database.md) | adding columns to `sermons` requires updating `SERMON_COLUMNS` in `electron/main.js` — `buildUpdate()` throws in dev if you miss this, but only if you exercise the save path in testing |
| IPC channels, preload, main process boundaries | [`docs/SYSTEMS/ipc.md`](docs/SYSTEMS/ipc.md) | — |
| Distribution, installers, auto-updates, ESV API key setup, crash logging | [`docs/PROPOSALS/distribution.md`](docs/PROPOSALS/distribution.md) | `electron/config.js` (paths + dev/prod gatekeeper), `electron/keystore.js` (safeStorage for ESV key), `electron/logger.js` (`app.log`), `electron/updater.js` (electron-updater), `src/components/SetupScreen.jsx` (first-run setup) |
| Dashboard redesign / handoff to a designer | [`docs/PROPOSALS/dashboard-design-brief.md`](docs/PROPOSALS/dashboard-design-brief.md) | `src/components/Dashboard.jsx`, `DashboardVerseCarousel.jsx`, `DashboardPreacherQuote.jsx`, `src/styles/global.css` (lines 2407–2880) |

## Load only when you need specific lookup details

| Need | Load |
|------|------|
| Full table definitions | [`docs/REFERENCE/schema.md`](docs/REFERENCE/schema.md) |
| Full IPC channel specifications | [`docs/REFERENCE/ipc-channels.md`](docs/REFERENCE/ipc-channels.md) |
| File tree, tech stack, environment paths | [`docs/REFERENCE/project-structure.md`](docs/REFERENCE/project-structure.md) |
| Registry of anchor documents (load-bearing strategic docs governed by `/anchor-update`) | [`docs/ANCHORS.md`](docs/ANCHORS.md) |

## Load CHANGELOG.md only when

The task touches a system with recent relevant history — e.g., debugging a regression,
understanding why something was built a certain way, or checking what changed in a recent
build. **Do not load CHANGELOG.md by default on every session.**

## Memory snapshot

The `MEMORY.md` index is pre-loaded into context at session start, but the snapshot
can lag the disk if `MEMORY.md` was edited just before or during session boot. At the
start of each session, Read `C:\Users\rossa\.claude\projects\C--Projects-SermonForge\memory\MEMORY.md`
from disk before relying on the index. The file is small; this is cheap.

**Index hygiene (the failure mode that bit us):** every `MEMORY.md` entry is a
single one-line pointer (`- [Title](file.md) — hook`). When updating an active
project across sessions, put the new detail in its **topic file** — never append
it to the index line. That update-time appending is exactly what bloated the index
past its load limit (the entries that grow are always the active ones). If it ever
exceeds the limit again, trim the longest entries back to one line; their detail
already lives in the topic files. See [[feedback_memory_index_hygiene]].

---

## Authority

If code and these documents diverge, the code is considered incorrect unless an explicit
rationale exists.

CHANGELOG format and discipline are owned by [`.claude/skills/end-session/SKILL.md`](.claude/skills/end-session/SKILL.md). Do not duplicate those rules here.

---

## Commit gates

`scripts/preflight.sh` runs from the `/end-session` skill before every commit. It enforces:

- **Sweep required** when the staged diff touches contract-sensitive paths (see [`scripts/preflight.sh`](scripts/preflight.sh) for the exact list — kept in one place, not two).
- **Drift check** via [`scripts/drift-check.sh`](scripts/drift-check.sh) (broken refs, stale skill mentions, IPC/schema reference sanity).
- **Staging hygiene** — no `git add .`-shaped patterns reaching the index.

If preflight fails, the commit does not proceed. Do not bypass it; fix the finding.

When `/sweep-the-house` runs and emits FAIL or WARN, stop and resolve before continuing. PASS continues to `/end-session`.
