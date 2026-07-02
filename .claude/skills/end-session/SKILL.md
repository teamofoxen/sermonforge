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

## STEP 1.5 — STAMP SHIPPED CHARTERS (when the C8 advisory fires)

Drift-check's C8 lists `docs/PROPOSALS/` docs whose status head reads SHIPPED with
no remaining-work marker and no `⛔ HISTORICAL RECORD` stamp. A shipped charter
still dressed as a live plan is drift waiting to happen (the 2026-07-01 sweep found
98 stale claims in live-dressed docs; the banner-stamped ones had zero). For each
doc C8 names:

1. Insert the house stamp as the first blockquote after the title:
   `> **⛔ HISTORICAL RECORD — build fully shipped <ship date>; stamped <today> (C8 charter-stamping check).** The live authority is <mechanics doc and/or code at HEAD>. This document is the frozen development record of the what & why; it is **not a working guide and no longer binds.** Where it and the live docs differ, the live docs win.`
   Banner-only — do not rewrite the body (pastor-ruled pattern from Re-Foundation step 5).
2. If the doc is listed under **Live anchors** in `docs/ANCHORS.md`, move its entry
   to **Historical record** (noting the live authority it hands off to).
3. Include the stamp + ANCHORS move in this session's commit.

If the initiative genuinely has remaining work, do NOT stamp — instead fix its
status head to say so (e.g. "SHIPPED phases 1–3; remaining: X"); a remaining-work
marker is what suppresses C8. Never suppress by deleting the word SHIPPED.

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
