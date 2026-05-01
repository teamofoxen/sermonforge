---
name: sweep-the-house
description: Deeper controlled audit of the current git diff against SermonForge architectural rules. Checks context pipeline integrity, database safety, IPC boundaries, performance, and search system. Returns PASS / WARN / FAIL with severity-tagged findings. Use when the user types /sweep-the-house or asks for a thorough diff audit.
trigger: /sweep-the-house
---

# sweep-the-house

Deeper diff audit for SermonForge. Controlled scope.

## INSTRUCTIONS

1. Run `git diff` (staged + unstaged). If empty, output "Nothing to audit." and stop.
2. Primary scope: the diff. Open related files only when a finding needs one-line verification.
3. Do NOT scan the full repo.

## PROJECT-SPECIFIC AUDIT PRIORITIES

### 1. CONTEXT PIPELINE
- Tier ordering preserved (1-7) in contextBuilder.js
- No uncontrolled growth in tier 5 (library + theology chunks)
- flattenExegesis() compatibility maintained for structured JSON fields

### 2. DATABASE SAFETY
- No raw SQL in renderer
- No new write paths outside electron/main.js
- saveDb() 500ms debounce untouched
- New sermons table columns reflected in SERMON_COLUMNS allowlist in electron/main.js

### 3. IPC INTEGRITY
- All AI calls route through "ai-message" via sendAIMessage()
- No renderer access to ANTHROPIC_API_KEY
- No unguarded or newly exposed IPC channels

### 4. PERFORMANCE
- No synchronous writes added
- No repeated DB reads inside loops
- No unnecessary context expansion

### 5. SEARCH SYSTEM
- FTS and vector logic remain separate
- No unbounded chunk injection into tier 5

## RED FLAGS (HIGH SEVERITY)

- Modifying contextBuilder.js tier logic without safeguards
- Touching saveDb() or debounce timing
- Adding sermon fields without updating SERMON_COLUMNS
- Breaking createOutlinePoint() as the sole outline point constructor
- Routing AI-sourced patterns to phrasePatterns instead of aiPhrasePatterns
- Weakening any clause in The Framework (`docs/CORE.md` → "The Framework")

## CONTRACT TEST (binding — `docs/CORE.md` → "The Framework")

Every diff must pass The Test. Run these four questions against the diff:

1. **Which contracts does it touch?** Name them by clause number (e.g. State #3, Mutation #1, Surface #4).
2. **Does it strengthen or weaken each one?** A change that weakens a contract clause to ship a feature is a HIGH-severity finding and a `FAIL`.
3. **Does it preserve the Principle (Clarity through Constraint)?** Any change that lets the system substitute for the user's clarity work is a Principle violation — HIGH severity, `FAIL`.
4. **If it conflicts with an existing clause, which is wrong?** Surface the conflict in findings; do not silently resolve in code.

Add a `CONTRACTS:` block to the output enumerating touched clauses with verdict (strengthens / weakens / neutral). Empty block when the diff doesn't touch contract surfaces.

## LOWER PRIORITY

- UI layout or component structure
- Naming or stylistic patterns

## OUTPUT FORMAT

### Part 1 — Sweep Report

STATUS: PASS | WARN | FAIL

SUMMARY: 1-2 sentences

CONTRACTS:
- <clause> — <strengthens | weakens | neutral> — <one-line why>
(or "none touched" when the diff doesn't reach contract surfaces)

FINDINGS:
- [Severity: LOW | MEDIUM | HIGH] issue - file - why it matters - fix (short, no rewrites)

### Part 2 — Simplify Pass

After emitting Part 1, invoke `/simplify` on the same diff via the Skill tool with explicit scope: **REPORT FINDINGS ONLY. Do NOT apply fixes.**

Append its output below Part 1 under the heading `SIMPLIFY PASS`. If `/simplify` returns no findings, emit `SIMPLIFY PASS: nothing to simplify.` and stop.

The user decides whether to act on simplify findings — never edit code in this skill.

## HARD RULES

- Sweep portion (Part 1) max 300 words; Simplify portion (Part 2) governed by /simplify's own limits
- No full-repo scanning
- No embeddings or broad search
- No large refactors
- No speculation
- Stay grounded in the diff
- Any contract weakening or Principle violation forces `FAIL` regardless of other findings
- Simplify Pass is REPORT-ONLY. No fixes applied without explicit user approval (per Audit Workflow rule).
