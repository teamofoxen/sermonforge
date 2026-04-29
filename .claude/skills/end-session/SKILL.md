---
name: end-session
description: Finalize a SermonForge work session — update CHANGELOG, commit, push. This is the only sanctioned path for committing changes. Use when the user types /end-session or asks to wrap up/finalize/commit and push the session.
trigger: /end-session
---

# end-session

Wrap up a SermonForge work session: update CHANGELOG, commit, push.

## STEP 1 — PRECHECK

Run `git status`. If there are no tracked modifications, return `No changes to commit.` and STOP.

## STEP 2 — UPDATE CHANGELOG

Prepend ONE new section to the top of `CHANGELOG.md`, immediately after the first `---`.

Format:

```
## YYYY-MM-DD — <commit subject>

- bullet
- bullet
```

Rules: max 5 bullets, one sentence each, today's date, current session only, under 120 words. Do NOT restate prior entries or explain rationale.

## STEP 3 — COMMIT

Stage only the files this session touched. Do **NOT** use `git add .` — pre-existing untracked files in the working tree may be unrelated to this session.

Commit message: title = the subject used in the CHANGELOG entry. Body = max 5 bullets matching the CHANGELOG content.

## STEP 4 — PUSH

`git push origin main`.

## STEP 5 — CONFIRM

Return only:
- Commit hash
- `Pushed`

## HARD RULES

- Do NOT stage unrelated untracked files.
- Do NOT push if commit fails.
- Do NOT generate a pre-commit summary report — the in-session sweep output (if any) is sufficient context.
- Do NOT skip the CHANGELOG update.
