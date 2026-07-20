# SermonForge

This file is a navigation guide. Do not load everything by default.

---

## Always load

- [`docs/CORE.md`](docs/CORE.md) — authority, project identity, non-negotiable constraints, absolute invariants

## Load for any code change

- [`docs/RULES.md`](docs/RULES.md) — development rules, guardrails, design system, git workflow

## Visible work is a human task

Any change a pastor will see — UI, user-facing copy, navigation, a journey — is judged
as a human task, not only as an implementation. A passing test or a successful render
proves the code ran; it does not prove a pastor can find the feature, read the screen
cold without a remembered modal, know his natural first move, see that his work saved,
or recover when something fails. Preserve cold legibility, an obvious first action,
visible feedback, recovery, and predictable re-entry. For pastor-facing UI, copy,
navigation, journey, product-planning, or UX-audit work, load
[`docs/PRODUCT-LENS.md`](docs/PRODUCT-LENS.md).

## Load for the specific area of work

| Task area | Load | Also check |
|-----------|------|------------|
| Sermon workspace — the walk's *what & why* (questions, named outcomes, completeness policy, Merida fidelity) | [`docs/WORKSPACE-CANON.md`](docs/WORKSPACE-CANON.md) | the law is `docs/CORE.md` |
| Sermon workspace — *how & where* (components, JSON columns, save flow, study tab, PassagePopup) | [`docs/SYSTEMS/sermon-workspace.md`](docs/SYSTEMS/sermon-workspace.md) | [`docs/WORKSPACE-CANON.md`](docs/WORKSPACE-CANON.md) for the what & why |
| Workspace work that touches **what the pastor reads or feels** — user-facing copy, error/save messages, empty states, the three threshold screens, N/A affordances, naming an outcome or control, any new affordance in the walk, or **adding/removing a question in the walk** | [`docs/PASTORS-CHARTER.md`](docs/PASTORS-CHARTER.md) | explanatory lens only — creates no requirements, never cite it as authorization; the law is `docs/CORE.md` |
| **Pastor-facing product work, app-wide** — UI, user-facing copy, navigation, journeys, product planning, UX audits (any surface, not just the workspace walk) | [`docs/PRODUCT-LENS.md`](docs/PRODUCT-LENS.md) | standing orientation only — subordinate to CORE / RULES / WORKSPACE-CANON / SYSTEMS; creates no requirements; the workspace-copy row above still applies for walk copy |
| Series Planner — macro/architect series planning (three-screen planner: Outline · Schedule · Study guide; create-then-update, study-guide export) | [`docs/SYSTEMS/series-planner.md`](docs/SYSTEMS/series-planner.md) | [`docs/PROPOSALS/series-planner-revival-charter.md`](docs/PROPOSALS/series-planner-revival-charter.md) (historical record) for the original what & why / decisions |
| Database, schema, migrations, FTS | [`docs/SYSTEMS/database.md`](docs/SYSTEMS/database.md) | adding columns to `sermons` requires updating the `SERMON_COLUMNS` allowlist in `src/core/contracts.ts` and its mirrors (`electron/contracts.cjs`, `tests/contracts/_helpers/test-spine.ts` — sync is test-asserted) — `buildUpdate()` in `electron/persistence.cjs` rejects the whole mutation on an unknown field (dev and production alike, Session 3 2026-07-13), but you only see it if you exercise the save path in testing |
| IPC channels, preload, main process boundaries | [`docs/SYSTEMS/ipc.md`](docs/SYSTEMS/ipc.md) | — |
| Architecture-normalization planning — source-of-truth consolidation, domain grammar, completion/position/vocabulary derivation, stale ownership paths, or structural drift with no immediate UI break | [`docs/CORE.md`](docs/CORE.md), [`docs/RULES.md`](docs/RULES.md), and the relevant `docs/SYSTEMS/*` file for the seam | Planning-only first. Identify evidence, pastor-facing trust risk, smallest seam, tests needed before movement, and explicit non-goals. Do not implement without approval. |
| Distribution, installers, auto-updates, ESV API key setup, crash logging | [`docs/PROPOSALS/distribution.md`](docs/PROPOSALS/distribution.md) | `electron/config.js` (paths + dev/prod gatekeeper), `electron/keystore.js` (safeStorage for ESV key), `electron/logger.js` (`app.log`), `electron/updater.js` (electron-updater), `src/components/SetupScreen.jsx` (first-run setup) |
| Dashboard redesign / handoff to a designer | [`docs/PROPOSALS/dashboard-design-brief.md`](docs/PROPOSALS/dashboard-design-brief.md) | `src/components/Dashboard.jsx`, `DashboardVerseCarousel.jsx`, `DashboardPreacherQuote.jsx`, `src/styles/global.css` (dashboard blocks ~1819–2514, plus dark-mode dashboard overrides at end of file) |

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

## Architecture-normalization posture

Do not propose rewrites or broad refactors. Also do not dismiss evidenced
architectural drift merely because today's pastor-facing UI still works.
When a canonical truth requires duplicated derivations, stale docs, scattered
vocabulary, manual synchronization, or defensive tripwires, produce a
planning-only normalization proposal: evidence, affected CORE contracts,
pastor-facing trust risk, smallest seam, tests-before-move, non-goals, and
stop condition.

---

## Commit gates

`scripts/preflight.sh` runs from the `/end-session` skill before every commit. Two of
its checks are **enforced** (exit 1, the commit stops) and two are **advisory** (printed,
exit 0 — they rely on you reading them). Know which is which:

**Enforced — preflight exits 1:**
- **Nothing to commit** — a clean working tree.
- **Drift check** via [`scripts/drift-check.sh`](scripts/drift-check.sh) (broken refs, stale skill mentions, IPC/schema reference sanity).

**Advisory — printed as `ADVISORY:`, preflight still exits 0:**
- **Sweep required** when the staged diff touches contract-sensitive paths (see [`scripts/preflight.sh`](scripts/preflight.sh) for the exact list — kept in one place, not two).
- **Staging hygiene** — no `git add .`-shaped patterns reaching the index.

If preflight exits 1 the commit does not proceed; do not bypass it, fix the finding. If
it prints `PASS WITH ADVISORIES`, nothing has stopped you — read them and act. (This
section previously described all four as enforced, which was wrong in the two cases
where it mattered most.)

When `/sweep-the-house` runs and emits FAIL or WARN, stop and resolve before continuing. PASS continues to `/end-session`.
