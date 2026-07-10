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

- file (e.g. `SermonWorkspace.jsx`, `electron/main.js`)
- function (e.g. `deriveSermonCompleteness`, `buildUpdate`)
- flow (e.g. "the autosave → flush → IPC commit lifecycle", "the study-guide export chain")

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
- no AI path exists or is reintroduced — no AI calls, prompts, SDK imports, or AI-shaped
  IPC anywhere (ARI, 2026-05-09; the `sermonforge/no-direct-ai` lint tripwire is
  no-exception)
- renderer database access goes only through the current wrappers — `src/core/spine.ts`
  (sermon/series spine) and `src/db/database.js` (non-spine channels); never
  `window.electronAPI` directly, never raw SQL
- durable writes commit at the IPC handler (better-sqlite3, WAL) — no main-process save
  debounce or queue may sit in front of them
- the renderer's 800ms autosave debounce flushes where the current system requires it:
  window close / quit / reload (`src/utils/closeFlush.js`), position moves
  (`beforePositionChange`), and before export
- no business/domain logic in UI components — derivations belong in `src/utils/`
  (e.g. `sermonState.js`, `studyAdvancement.js`, `walkOrder.js`)
- contract and vocabulary ownership respected — renderer-writable columns ride the
  `SERMON_COLUMNS` / `SERIES_COLUMNS` / `SECTION_COLUMNS` allowlists (kept in sync across
  `src/core/contracts.ts`, `electron/contracts.cjs`, and the test-spine mirror), and only
  canonical stage/sub-phase names appear (CORE State #5)

If the target is itself a visible UI flow — a screen or interaction the pastor works
through — also consult `docs/PRODUCT-LENS.md` and examine the human task: can a
first-time pastor find it, read it cold, and recover when it fails? One lens within
this step, not a UX audit.

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
