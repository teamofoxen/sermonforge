---
name: end-session
description: Finalize a SermonForge work session safely — log changes, enforce invariants, gate risks, commit, and push. This is the ONLY allowed path for repository changes. Use when the user types /end-session or asks to wrap up/finalize/commit and push the session.
trigger: /end-session
---

# end-session

Finalize a SermonForge work session safely: log changes, enforce invariants, gate risks, commit, and push. This is the ONLY allowed path for repository changes.

---

## STEP 0 — PRECHECK (MANDATORY)

Run:
```
git status
```

If no changes:
- Return exactly: `No changes to commit.`
- STOP.

---

## STEP 1 — LOG CHANGES

Run:
```
git diff --name-only
```

Generate this report:

```
## Summary
- 1–2 sentences

## Files Modified
- list only

## Key Changes
- bullets only (high-signal)

## Invariant Check
- createOutlinePoint() only: Pass/Fail
- no sermon big_idea writes: Pass/Fail
- imports valid: Pass/Fail

## Risks
- None OR brief bullets
```

---

## STEP 2 — GATE

- If ANY invariant = Fail: STOP and report the failure.
- If risks are non-trivial: STOP and ask for explicit confirmation.
- Do NOT proceed past this step if blocked.

---

## STEP 3 — COMMIT

Run:
```
git add .
```

Create ONE commit unless changes are clearly unrelated.

Commit message format:
- Title: one line
- Body: max 5 bullets

Run:
```
git commit -m "<message>"
```

---

## STEP 4 — PUSH

Run:
```
git push origin main
```

---

## STEP 5 — CONFIRM

Return ONLY:
- Commit hash
- `Pushed`

---

## OUTPUT RULES

- Max 150 words
- No suggestions
- No explanations
- No extra commentary
- Stop after confirmation

---

## HARD RULES

- Do NOT skip invariant check
- Do NOT commit if gate fails
- Do NOT push if commit fails
- Do NOT perform partial actions
- Do NOT suggest improvements
