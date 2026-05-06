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

## STEP 2.5 — DOC-DRIFT CHECKPOINT

Scan the staged diff (and any newly modified files this session) for paths with known doc obligations. For each trigger hit, surface the candidate doc to the pastor before continuing to STEP 3.

| If the diff touches… | Surface for update to… |
|---|---|
| `electron/main.js` migration block (`ALTER TABLE`, new column) | `docs/REFERENCE/schema.md` |
| `SERMON_COLUMNS` allowlist (any of the three mirrors) | `docs/REFERENCE/schema.md` |
| `src/utils/studyFields.js` field definitions (add/remove/rename a field or question) | `docs/PROPOSALS/study-field-definition-initiative.md` (the 25 Study fields) |
| `src/utils/sadiAnchorFields.js` field definitions | `docs/PROPOSALS/sermon-anchor-definition-initiative.md` (Step 2 fields) |
| `src/utils/sermonFrameFields.js` field definitions | `docs/PROPOSALS/sermon-anchor-definition-initiative.md` (Step 5 fields) |
| New STAGE / STEP / SUB_PHASE value in `src/core/contracts.ts` | `docs/CORE.md` Canonical Vocabulary + `docs/ENFORCEMENT_STATUS.md` |
| New IPC channel in `electron/preload.js` or `electron/main.js` IPC handlers | `docs/REFERENCE/ipc-channels.md` |
| `src/components/SpotlightWorksheet.jsx` Field Pattern changes (new question kind, new sub-shape) | SFDI working doc § The Field Pattern |
| `docs/CORE.md` clause edit | `docs/ENFORCEMENT_STATUS.md` (Last verified date + clause table row) |
| Workspace tour stops in `src/tour/workspaceTourStops.js` | `docs/PROPOSALS/sermon-workspace-tour.md` |
| AI prompt changes in `src/prompts/study.js` or `src/prompts/sermon.js` | `docs/PROPOSALS/study-phase-redesign.md` (only if structural commitment changes) — typically just `CHANGELOG.md` |
| `src/utils/studyAdvancement.js` new boundary gate | the boundary's owning working doc (SFDI for sub-phase boundaries; SADI for step boundaries) |

**How to surface:** for each trigger hit, ask the pastor in plain language: "This commit touches X. Should Y be updated to match?" Possible replies:

- **"Yes"** → pause, update Y in the same staged diff, then continue.
- **"Already updated"** → continue (the doc is in the staged diff already; verify before moving on).
- **"Defer because Z"** → continue, but append a line `Doc deferred: <doc> — <reason>` to the commit body so the deferral is recorded in git history.

If **no triggers hit**, skip to STEP 3 silently.

This checkpoint is a **nudge, not a hard gate**. The pastor decides whether to update inline, defer (with reason in commit), or skip. The goal is to catch drift candidates before the diff is sealed; the goal is NOT to block the commit.

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
