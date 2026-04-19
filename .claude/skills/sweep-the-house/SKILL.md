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

## LOWER PRIORITY

- UI layout or component structure
- Naming or stylistic patterns

## OUTPUT FORMAT

STATUS: PASS | WARN | FAIL

SUMMARY: 1-2 sentences

FINDINGS:
- [Severity: LOW | MEDIUM | HIGH] issue - file - why it matters - fix (short, no rewrites)

## HARD RULES

- Max 250 words
- No full-repo scanning
- No embeddings or broad search
- No large refactors
- No speculation
- Stay grounded in the diff
