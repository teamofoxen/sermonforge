---
name: sweep-the-room
description: Lightweight, strict, high-signal diff review for SermonForge. Flags only architecture boundary violations, debounce risks, context pipeline changes, and ai-message flow issues in the current git diff. Returns CLEAN if nothing high-signal found. Use when the user types /sweep-the-room or asks for a quick diff check.
trigger: /sweep-the-room
---

# sweep-the-room

Lightweight diff review for SermonForge. High-signal only.

## INSTRUCTIONS

1. Run `git diff` (staged + unstaged). If empty, output "Nothing to sweep." and stop.
2. Scan diff only — do NOT open files.
3. Report ONLY items that match the priority checks below.
4. If nothing matches: STATUS is CLEAN.

## PROJECT-AWARE PRIORITY CHECKS

Flag ONLY:
- IPC boundary violations (renderer directly accessing DB or AI without going through named IPC channels)
- Any change that could increase saveDb() call frequency or bypass the 500ms debounce
- Modifications to contextBuilder.js tier logic, tier ordering, or tier budgets
- Changes to the ai-message IPC flow or sendAIMessage()

## IGNORE

- UI styling, JSX structure, naming, formatting
- Low-impact refactors with no boundary effects

## SIGNAL RULE

Only report if it could: break architecture boundaries, increase token usage, or degrade performance. Otherwise: CLEAN.

## OUTPUT FORMAT

STATUS: CLEAN | MESSY

SUMMARY: one sentence

NOTES:
- max 5 bullets
- high-signal items only

## HARD RULES

- Max 120 words total
- Do NOT open files beyond the diff
- Do NOT explain, rewrite code, or suggest refactors
- Prefer silence over speculation
