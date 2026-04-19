---
name: interrogate
description: Deep, surgical analysis of a single target — file, function, or system flow. Covers execution trace, state/data flow, assumption check, edge cases, failure modes, performance, and SermonForge architecture compliance. Use when the user types /interrogate or asks for a deep analysis of a specific function or file.
trigger: /interrogate
---

# interrogate

Perform a deep, surgical analysis of a single target (file, function, or system flow).

This is a focused reasoning tool, not a broad audit.

## INPUT

User must specify a target:

- file (e.g. `contextBuilder.js`)
- function (e.g. `sendAIMessage`)
- flow (e.g. "AI request lifecycle")

If the target is unclear, ask for clarification BEFORE proceeding.

## BEHAVIOR

1. Identify the exact scope of the target
2. Load ONLY relevant files and dependencies
3. Do NOT scan the entire repository
4. Stay tightly scoped

## ANALYSIS STEPS (MANDATORY)

### 1. EXECUTION TRACE
- Step-by-step flow of execution
- What calls what
- Data shape at each step

### 2. STATE & DATA FLOW
- Where state is created, mutated, and consumed
- Identify shared or derived state
- Detect stale or inconsistent data risks

### 3. ASSUMPTION CHECK
Explicitly validate:
- "this is always defined"
- "this only runs once"
- "this cannot fail"

Flag any unproven assumptions.

### 4. EDGE CASE ANALYSIS
Check:
- null / undefined inputs
- empty values
- large inputs
- timing or ordering issues

### 5. FAILURE MODES
Identify:
- silent failures
- missing error handling
- partial state updates
- inconsistent outputs

### 6. PERFORMANCE CHECK
- repeated DB calls
- unnecessary recomputation
- blocking operations
- inefficient loops

### 7. ARCHITECTURE COMPLIANCE (SERMONFORGE)

Validate:
- no renderer access to DB or AI
- AI calls go through IPC `"ai-message"`
- `saveDb()` debounce preserved
- no business logic in UI layer

## OUTPUT FORMAT

TARGET: <what is being analyzed>

---

EXECUTION TRACE:
- step-by-step breakdown

---

KEY FINDINGS:

- [Severity: LOW | MEDIUM | HIGH] issue — location — why it matters

---

EDGE CASE RISKS:
- ...

---

FAILURE SCENARIOS:
- ...

---

PERFORMANCE NOTES:
- ...

---

VERDICT: SAFE | NEEDS ATTENTION | HIGH RISK

---

## HARD RULES

- Max 700 words
- Must follow all analysis steps
- No generic advice
- No code rewrites unless critical
- No full-repo scanning
- No speculation without evidence

## TONE

Senior engineer in a code review. Direct. Analytical. No fluff.
