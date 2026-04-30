---
name: end-session
description: Finalize a SermonForge work session — update CHANGELOG, commit, push. This is the only sanctioned path for committing changes. Use when the user types /end-session or asks to wrap up/finalize/commit and push the session.
trigger: /end-session
---

# end-session

Wrap up a SermonForge work session: update CHANGELOG, commit, push.

## STEP 1 — PRECHECK

Run `git status`. If there are no tracked modifications, return `No changes to commit.` and STOP.

## STEP 2 — ENFORCEMENT STATUS CHECK

Check whether this session touched contract enforcement. The trigger paths are:

- `src/core/spine.ts`
- `src/core/contracts.ts`
- `electron/main.js` validation handlers
- `eslint-plugin-sermonforge/`
- `tests/contracts/`
- `scripts/spine-integrity.js`
- `docs/CORE.md`

If **none** of these were touched, skip this step and continue to STEP 3.

If **any** were touched, update `docs/ENFORCEMENT_STATUS.md` before continuing:

- If a deferred clause's owning pilot landed, move the clause out of the deferred section into its final layer (structural, test, or lint) and update the per-clause table.
- If a contract clause in `docs/CORE.md` was added, removed, or rewritten, update the per-clause table to match.
- If new validation logic was added to `validateAndCommit` or `spineRead` in `electron/main.js`, confirm the test fixture at `tests/contracts/_helpers/test-spine.ts` was updated in the same session and note any drift.
- Update the "Last verified" date at the top of the document.

## STEP 3 — UPDATE CHANGELOG

Prepend ONE new section to the top of `CHANGELOG.md`, immediately after the first `---`.

Format:

```
## YYYY-MM-DD — <commit subject>

- bullet
- bullet
```

Rules: max 5 bullets, one sentence each, today's date, current session only, under 120 words. Do NOT restate prior entries or explain rationale.

## STEP 4 — COMMIT

Stage only the files this session touched. Do **NOT** use `git add .` — pre-existing untracked files in the working tree may be unrelated to this session.

Commit message: title = the subject used in the CHANGELOG entry. Body = max 5 bullets matching the CHANGELOG content.

## STEP 5 — PUSH

`git push origin main`.

## STEP 6 — CONFIRM

Return only:
- Commit hash
- `Pushed`

## HARD RULES

- Do NOT stage unrelated untracked files.
- Do NOT push if commit fails.
- Do NOT generate a pre-commit summary report — the in-session sweep output (if any) is sufficient context.
- Do NOT skip the CHANGELOG update.
