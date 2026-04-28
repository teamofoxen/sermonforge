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
| AI responses, context assembly, system prompts | [`docs/SYSTEMS/context-pipeline.md`](docs/SYSTEMS/context-pipeline.md) and [`docs/SYSTEMS/ai-panel.md`](docs/SYSTEMS/ai-panel.md) | `series-planner.md` (which Book Study fields are excluded from tier 4 and why); `sermon-workspace.md` (Pastoral Intelligence tier rules) |
| Series planning, planner tabs, Study Guide export | [`docs/SYSTEMS/series-planner.md`](docs/SYSTEMS/series-planner.md) | `context-pipeline.md` if changes affect which series fields feed the context tiers |
| Sermon workspace, study tab, save flow, PassagePopup | [`docs/SYSTEMS/sermon-workspace.md`](docs/SYSTEMS/sermon-workspace.md) | `context-pipeline.md` if touching Pastoral Intelligence fields or structured exegesis JSON |
| Database, schema, migrations, FTS | [`docs/SYSTEMS/database.md`](docs/SYSTEMS/database.md) | adding columns to `sermons` requires updating `SERMON_COLUMNS` in `electron/main.js` — `buildUpdate()` throws in dev if you miss this, but only if you exercise the save path in testing |
| IPC channels, preload, main process boundaries | [`docs/SYSTEMS/ipc.md`](docs/SYSTEMS/ipc.md) | — |
| Distribution, installers, auto-updates, API key setup, crash logging | [`docs/PROPOSALS/distribution.md`](docs/PROPOSALS/distribution.md) | `electron/config.js` (dev/prod gatekeeper) once built |

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
rationale exists. `CLAUDE_original.md` is the original monolithic version — retained for
historical reference; do not use it as a working guide.

---

## Execution Gates

All code changes must pass mandatory sweep checks before proceeding.

### Required Sequence After ANY Code Change

1. Run /sweep-the-room
   - If STATUS = MESSY → STOP
   - Fix issues before continuing

2. Run /sweep-the-house
   - If STATUS = FAIL → STOP
   - If STATUS = WARN → STOP and ask
   - Fix issues before continuing

3. Only after both pass:
   - Continue work OR
   - Run /end-session

### Hard Rules

- No skipping sweep steps
- No continuing work while in a failing state
- No commits or pushes before passing both sweeps
- No explanations or further changes until current state is CLEAN

### Enforcement

If a sweep fails:
- Immediately stop
- Do not proceed
- Do not suggest next steps
- Fix only the failing issues
