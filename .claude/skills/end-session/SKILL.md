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

## STEP 3 — UPDATE CHANGELOG

Prepend ONE new section to `CHANGELOG.md`, immediately after the first `---`:

```
## YYYY-MM-DD — <commit subject>

- bullet
- bullet
```

Rules: max 5 bullets, one sentence each, today's date, current session only, under 120 words. Do NOT restate prior entries or explain rationale.

## STEP 4 — COMMIT

Stage only the files this session touched, by explicit path. Do NOT use `git add .` — pre-existing untracked files may be unrelated.

Commit title = the CHANGELOG subject. Body = the same bullets.

## STEP 5 — PUSH

`git push origin main`.

## STEP 6 — CONFIRM

Print the commit hash and confirm the push landed. Keep it brief.

## HARD RULES

- Do NOT stage unrelated untracked files.
- Do NOT push if commit fails.
- Do NOT skip the CHANGELOG update.
- Do NOT amend a published commit. On hook failure, fix and create a new commit.
- Do NOT bypass preflight. If it fails, fix the underlying issue.
