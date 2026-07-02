# Prompt for the follow-up session (run on Sonnet)

Copy-paste the following as the first message of a new session:

---

Open `docs/AUDITS/workspace-audit-remediation.md` and read it in full before touching
anything. Part 1 lists work that already shipped in the prior session (uncommitted, in the
working tree) — verify it's present, do not redo or revert it. Your job is Part 2, items
S1–S8, in order, exactly as specified — they are mechanical fixes with no new design
decisions. Respect Part 2's S9 exclusions and the authority rules: `docs/CORE.md` is the
sole normative authority; no gates, no AI content, no toasts or step narration. For S7
(the Pastor's Charter line), propose the wording and wait for my explicit OK before
editing. When S1–S8 are done, run Part 3: lint, tests, `/sweep-the-house`, then
`/end-session` with a CHANGELOG entry covering both sessions' work.

---
