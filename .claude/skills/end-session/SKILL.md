---
name: end-session
description: Finalize a SermonForge work session — update CHANGELOG, commit, push. The sanctioned commit path for SermonForge. Use when the user types /end-session or asks to wrap up/finalize/commit and push the session.
trigger: /end-session
---

# end-session

Wrap up a SermonForge work session: preflight, CHANGELOG, commit, push.

## STEP 1 — PREFLIGHT

Run `bash scripts/preflight.sh`. If it exits non-zero, stop and address the output.

Preflight covers: clean-tree check, drift-check (broken refs / stale skill mentions / IPC + schema sanity), sweep-trigger advisory, staging hygiene advisory. The sweep-trigger path list lives in `scripts/preflight.sh` — do not duplicate it here.

If preflight emits a sweep-trigger advisory and `/sweep-the-house` has not been run this session, run it. STATUS = FAIL stops; WARN asks; PASS continues.

## STEP 2 — UPDATE ENFORCEMENT_STATUS (only if contracts changed)

If the session edited any of:

- `src/core/spine.ts`, `src/core/contracts.ts`, `electron/main.js` validation handlers
- `eslint-plugin-sermonforge/`, `tests/contracts/`, `scripts/spine-integrity.js`
- `docs/CORE.md` clauses

then update `docs/ENFORCEMENT_STATUS.md`: bump the "Last verified" line and update the per-clause table row(s) for the change. Otherwise skip.

Keep the "Last verified" line to one or two sentences. Historical narrative belongs in `git log` and `CHANGELOG.md`, not in this header.

## STEP 3 — UPDATE MEMORY (only if lasting state changed)

If the session produced any of:

- An initiative closed, opened, or changed phase (e.g., "ACCI closed", "BTI Phase 1 starting")
- A user feedback rule established or invalidated ("stop doing X", "yes that pattern is right")
- A project state fact that will outlive this session (deadlines, decisions, stakeholder asks)
- A new external reference (Linear project, dashboard URL, MCP server, dataset)
- An existing memory entry contradicted by today's work

then update the relevant memory file at `C:\Users\rossa\.claude\projects\C--Projects-SermonForge\memory\` AND its pointer line in `MEMORY.md`. Otherwise skip.

Memory updates are part of the same commit as code/docs from this session — do not split.

## STEP 4 — UPDATE CHANGELOG

Prepend ONE new section to `CHANGELOG.md`, immediately after the first `---`:

```
## YYYY-MM-DD — <commit subject>

- bullet
- bullet
```

Rules: max 5 bullets, one sentence each, today's date, current session only, under 120 words. Do NOT restate prior entries or explain rationale.

## STEP 5 — COMMIT

Stage only the files this session touched, by explicit path. Do NOT use `git add .` — pre-existing untracked files may be unrelated.

Commit title = the CHANGELOG subject. Body = the same bullets.

## STEP 6 — PUSH

`git push origin main`.

## STEP 7 — CONFIRM

Print the commit hash and confirm the push landed. Keep it brief.

## HARD RULES

- Do NOT stage unrelated untracked files.
- Do NOT push if commit fails.
- Do NOT skip the CHANGELOG update.
- Do NOT amend a published commit. On hook failure, fix and create a new commit.
- Do NOT bypass preflight. If it fails, fix the underlying issue.
