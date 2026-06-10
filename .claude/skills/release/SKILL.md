---
name: release
description: Tag and push a SermonForge release — pre-flight checks, security review, smoke-test checklist, then tag + push. The only sanctioned path for cutting a release. Use when the user types /release or asks to cut/ship/tag a release.
trigger: /release
---

# release

Cut a SermonForge release: pre-flight → security review → smoke-test checklist → tag → push.

CI (`.github/workflows/build.yml`) triggers on any tag matching `v*`. Windows + Mac builds publish to GitHub Releases. `electron-updater` ships the build to every installed user automatically. **Treat every tag as a production deploy.**

## STEP 1 — PRE-FLIGHT (hard gates)

Run all checks. Any failure stops the skill — print the failed gate and exit.

- `git status` — working tree must be clean. Dirty → STOP, ask user to `/end-session` first.
- `git rev-parse --abbrev-ref HEAD` — must be `main`. If not → STOP.
- `git fetch origin` then `git rev-list HEAD..origin/main --count` — must be 0 (local up-to-date with remote). If not → STOP.
- `git rev-list origin/main..HEAD --count` — must be 0 (no unpushed local commits). If not → STOP, ask user to `/end-session` first.
- `npm test` — full suite must exit 0. If not → STOP.

## STEP 2 — VERSION PROPOSAL

- `git describe --tags --abbrev=0` — last release tag. If no tags exist, treat as `v0.0.0` (first release).
- `git log <last-tag>..HEAD --oneline` — commits since last release.
- Propose the next version using these heuristics:
  - Any commit subject contains `BREAKING` → bump MAJOR.
  - Otherwise, any commit subject starts with `feat:` → bump MINOR.
  - Otherwise (only `fix:` / `chore:` / `docs:` / `refactor:` / etc.) → bump PATCH.
- Print the proposal: `Last tag: vX.Y.Z. N commits since. Proposed: vX.Y.Z' (reason: ...).`
- Ask the user to confirm or override. **Wait for explicit confirmation** before continuing.

## STEP 3 — SECURITY REVIEW (mandatory)

Invoke `/security-review` via the Skill tool with explicit scope: **the diff between the last release tag and HEAD** (`git diff <last-tag>..HEAD`). For first release (no prior tag), scope is the full current state of `main`.

Parse the verdict:

- **HIGH severity finding** → STOP. Print findings. Refuse to tag. User must address and re-run `/release`.
- **MEDIUM severity finding** → STOP. Print findings. Ask user to acknowledge or address. Wait for explicit "proceed" before continuing.
- **LOW severity finding** → print findings, continue.
- **No findings** → continue silently.

Never bypass this step.

## STEP 4 — SMOKE-TEST CHECKLIST

The smoke test lives at `docs/REFERENCE/release-smoke.md` — that is the source of truth (moved 2026-06-10 from distribution.md §12, which described deleted surfaces). Read it fresh each run; if the doc adds or changes items, the skill picks them up automatically.

For each numbered item in the doc, ask the user a single yes/no question. Record answers.

- Any "no" or skipped item → STOP. Refuse to tag. User must complete the smoke test and re-run.
- All "yes" → continue.

Do not summarize or compress the items — read them verbatim from the doc.

## STEP 5 — FINAL CONFIRMATION

Print a summary:

- Proposed tag (e.g. `v1.0.1`)
- Commit count + files changed since last tag (`git diff --shortstat <last-tag>..HEAD`)
- Security review verdict
- Smoke-test results (e.g. `5/5 confirmed`)

Ask: **"Tag `vX.Y.Z` and push to origin? (yes / no)"** Wait for explicit "yes".

## STEP 6 — TAG + PUSH

- `git tag <version>` (lightweight tag — CI keys off the tag name only)
- `git push origin <version>`

If push fails → STOP, print the error. Do not retry automatically — push failures usually mean a tag-name conflict (already exists upstream) and need the user to decide.

## STEP 7 — REPORT

Return only:

- Tag created: `vX.Y.Z`
- Commit tagged: `<short-hash>`
- CI run: `https://github.com/teamofoxen/sermonforge/actions`
- Reminder: `Auto-update will ship to all users once Windows + Mac artifacts are published. Monitor the CI run and verify the GitHub Release before walking away.`

## HARD RULES

- Only `main` branch can be released. Never any other branch.
- Working tree must be clean. Never carry uncommitted work into a release.
- `npm test` must pass. Never tag with a failing test suite.
- `/security-review` is mandatory. HIGH finding is a hard stop. Never bypass.
- Smoke-test confirmations are user-driven. Never auto-confirm.
- Tag format is `vMAJOR.MINOR.PATCH`. CI matches `v*` exactly — any other format will not trigger a build.
- Do NOT bump `package.json` `version` manually — CI does it from the tag.
- Do NOT push commits during this skill. Only the tag.
- Do NOT delete or move tags upstream. If the wrong tag was pushed, ask the user — do not unilaterally fix.
