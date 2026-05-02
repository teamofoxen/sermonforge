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
| AI responses, context assembly, system prompts | [`docs/SYSTEMS/context-pipeline.md`](docs/SYSTEMS/context-pipeline.md) and [`docs/SYSTEMS/ai-panel.md`](docs/SYSTEMS/ai-panel.md) | `series-planner.md` (which Book Study fields are excluded from tier 4 and why); `sermon-workspace.md` (Pastoral Context tier rules) |
| Series planning, planner tabs, Study Guide export | [`docs/SYSTEMS/series-planner.md`](docs/SYSTEMS/series-planner.md) | `context-pipeline.md` if changes affect which series fields feed the context tiers |
| Sermon workspace, study tab, save flow, PassagePopup | [`docs/SYSTEMS/sermon-workspace.md`](docs/SYSTEMS/sermon-workspace.md) | `context-pipeline.md` if touching Pastoral Context fields or structured exegesis JSON |
| Database, schema, migrations, FTS | [`docs/SYSTEMS/database.md`](docs/SYSTEMS/database.md) | adding columns to `sermons` requires updating `SERMON_COLUMNS` in `electron/main.js` — `buildUpdate()` throws in dev if you miss this, but only if you exercise the save path in testing |
| IPC channels, preload, main process boundaries | [`docs/SYSTEMS/ipc.md`](docs/SYSTEMS/ipc.md) | — |
| Distribution, installers, auto-updates, API key setup, crash logging | [`docs/PROPOSALS/distribution.md`](docs/PROPOSALS/distribution.md) | `electron/config.js` (paths + dev/prod gatekeeper), `electron/keystore.js` (safeStorage), `electron/logger.js` (`app.log`), `electron/updater.js` (electron-updater), `electron/ai/provider.js` (Anthropic SDK wrapper), `src/components/SetupScreen.jsx` (first-run key entry) |

## Load only when you need specific lookup details

| Need | Load |
|------|------|
| Full table definitions | [`docs/REFERENCE/schema.md`](docs/REFERENCE/schema.md) |
| Full IPC channel specifications | [`docs/REFERENCE/ipc-channels.md`](docs/REFERENCE/ipc-channels.md) |
| File tree, tech stack, environment paths | [`docs/REFERENCE/project-structure.md`](docs/REFERENCE/project-structure.md) |

## Load CHANGELOG.md only when

The task touches a system with recent relevant history — e.g., debugging a regression,
understanding why something was built a certain way, or checking what changed in a recent
build. **Do not load CHANGELOG.md by default on every session.**

---

## CHANGELOG Rules

When updating CHANGELOG.md:

- MAX 5 bullet points
- Each bullet must be one sentence
- Only include changes from the current session
- Do NOT restate or summarize previous entries
- Do NOT explain rationale or intent
- Do NOT mention unchanged files
- Total output must remain under 120 words

Required format:

## [Unreleased]
- change
- change
- change

Enforcement:

- If these constraints are violated, the output is incorrect
- Prioritize brevity over completeness
- Do not expand scope beyond explicitly requested changes

---

## Authority

If code and these documents diverge, the code is considered incorrect unless an explicit
rationale exists.

---

## Execution Gates

Run `/sweep-the-house` before commit **only** if the diff touches:

- `electron/main.js` or `electron/preload.js` (IPC, schema, save path)
- `src/utils/contextBuilder.js` (context tier logic, tier budgets)
- `src/utils/ai.js` or any file in `src/prompts/` (AI flow + system prompts)
- `src/db/database.js` exported wrapper functions (IPC boundary)
- Migration files or any change that adds/modifies a `sermons` column

For everything else (UI, styling, copy, component refactors, docs, skills, memory, CLAUDE.md itself), skip the sweep and go straight to `/end-session`.

### When the sweep runs

- STATUS = FAIL → STOP, fix the finding, re-run.
- STATUS = WARN → STOP and ask before continuing.
- STATUS = PASS → continue or run `/end-session`.

### Hard Rules

- The trigger is the path, not the size — a one-line edit to `electron/main.js` still requires the sweep.
- Never commit or push while in a failing sweep state.
- `/sweep-the-room` has been retired; its checks are a strict subset of `/sweep-the-house`.
