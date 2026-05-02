---
name: sweep-the-multiverse
description: Monthly comprehensive architectural audit of SermonForge across ALL major system areas in a fixed sequence. High-signal, structured inspection driven by git diff. Returns PASS/WARN/FAIL per area with top risks and recommended actions. Use when the user types /sweep-the-multiverse or asks for a full monthly architectural audit.
trigger: /sweep-the-multiverse
---

# sweep-the-multiverse

Monthly, comprehensive architectural audit of SermonForge across ALL major system areas.

This is NOT a full-repo brute force scan. It is a structured, high-signal inspection executed in a fixed sequence, driven primarily by `git diff`.

## FIXED AUDIT SEQUENCE (DO NOT CHANGE)

1. CONTEXT PIPELINE
2. AI FLOW
3. MEMORY SYSTEM
4. DATABASE LAYER
5. SCHEMA MIGRATION
6. IPC BOUNDARY
7. SEARCH SYSTEM
8. INGESTION PIPELINE
9. EXPORT / FILE I/O
10. UI LAYER

## AREA DEFINITIONS

| Area | Scope |
|------|-------|
| CONTEXT PIPELINE | `src/utils/contextBuilder.js`, tier system (1–7), `flattenExegesis()` |
| AI FLOW | `sendAIMessage()`, IPC `"ai-message"`, `electron/ai.js` |
| MEMORY SYSTEM | `src/utils/memory.js`, localStorage `sermonforge_memory`, `phrasePatterns` vs `aiPhrasePatterns` separation |
| DATABASE LAYER | `sermonforge.db` (sql.js), `theology.db` (better-sqlite3 + sqlite-vec) |
| SCHEMA MIGRATION | `runMigrations()`, schema versioning, `SERMON_COLUMNS` allowlist |
| IPC BOUNDARY | `preload.js`, `window.electronAPI`, named IPC channels |
| SEARCH SYSTEM | `library_fts` (FTS4), `theology_fts`, `theology_vec` |
| INGESTION PIPELINE | Chunking (~600 words), ingestion scripts, embedding generation |
| EXPORT / FILE I/O | docx/txt exports, disk writes, `path.join`, OneDrive/Windows compat |
| UI LAYER | React components, `AIPanel.jsx`, `SermonWorkspace.jsx` |

## BEHAVIOR

1. Use `git diff` as the primary signal.
2. Use minimal additional context only when required.
3. Evaluate ALL areas in sequence in one run.
4. Stay scoped — do NOT explore unrelated parts of the repo.

## CONTRACT MAP (`docs/CORE.md` → "The Framework")

The Framework is binding system law. Each area must satisfy specific contract clauses; weakening any listed clause is a HIGH-severity finding and forces the area's status to `FAIL`.

| Area | Contract clauses to enforce |
|------|------------------------------|
| CONTEXT PIPELINE | State #2 (canonical position drives tier mapping); Process #5 (AI augments, never substitutes) |
| AI FLOW | Mutation #1 (user typing wins), #2 (AI proposals separate slot), #5 (errors one voice); Process #5 |
| MEMORY SYSTEM | Mutation #5 (errors one voice — memory failures shouldn't be silent); Process #5 (memory feeds AI but doesn't bypass user evidence) |
| DATABASE LAYER | State #1 (sermon as atom), #3 (no anonymous atoms), #5 (one name per concept); Mutation #3 (saves are events) |
| SCHEMA MIGRATION | State #5 (one name per concept — schema names canonical) |
| IPC BOUNDARY | Mutation #1, #2, #3 (writes go through guarded boundaries); State #3 enforced at IPC layer |
| SEARCH SYSTEM | Process #5 |
| INGESTION PIPELINE | Process #5 |
| EXPORT / FILE I/O | Mutation #3 (visible saves), #5 (visible errors) |
| UI LAYER | All Surface clauses (#1 vocabulary, #2 CTA, #3 empty/loading, #4 you-are-here, #5 re-entry); Mutation #5 |

## PROJECT-SPECIFIC AUDIT RULES

### CONTEXT PIPELINE (CRITICAL)
- Tier ordering must remain 1–7
- Tier 5 must remain bounded (library + theology chunks)
- No duplication across tiers
- `flattenExegesis()` must support structured + legacy formats
- **Contract check:** State #2, Process #5

### AI FLOW
- ALL AI calls: renderer → `sendAIMessage` → IPC `"ai-message"` → `electron/ai.js`
- No direct SDK usage outside main process
- **Contract check:** Mutation #1, #2, #5; Process #5

### MEMORY SYSTEM
- `phrasePatterns` and `aiPhrasePatterns` must remain separate
- Runtime assertion must not be removed
- No uncontrolled growth in localStorage
- Memory only for adaptive hints, not core logic
- **Contract check:** Mutation #5; Process #5

### DATABASE SAFETY
- NO raw SQL in renderer
- ALL writes through main process
- `saveDb()` 500ms debounce must not be reduced or bypassed
- Schema changes must align with `SERMON_COLUMNS`
- **Contract check:** State #1, #3, #5; Mutation #3

### SCHEMA MIGRATION
- All schema changes go through `runMigrations()`
- Schema version must increment correctly
- No direct `CREATE TABLE` edits outside migration system
- **Contract check:** State #5

### IPC INTEGRITY
- All cross-boundary calls via named IPC channels
- No renderer access to `ANTHROPIC_API_KEY`
- No preload bypass hacks
- **Contract check:** Mutation #1, #2, #3; State #3 enforced at IPC layer

### PERFORMANCE
- No synchronous writes in main process
- No repeated DB reads in loops
- No uncontrolled context growth (especially tier 5)

### SEARCH SYSTEM
- FTS and vector logic must remain distinct
- No repeated embedding model reloads
- No unbounded chunk injection
- **Contract check:** Process #5

### INGESTION
- Chunking must remain ~600 words
- No uncontrolled ingestion loops
- **Contract check:** Process #5

### EXPORT / FILE I/O
- All paths use `path.join()`
- No hardcoded separators
- Safe file writes (no UI blocking)
- Windows + OneDrive compatibility
- **Contract check:** Mutation #3, #5

### UI LAYER
- Must not contain business logic
- Must not access DB or AI directly
- **Contract check:** all Surface clauses; Mutation #5

## RED FLAGS (HIGH SEVERITY)

- Modifying `contextBuilder.js` without safeguards
- Touching `saveDb()` or debounce timing
- Adding sermon fields without updating allowlist
- Breaking outline point construction rules
- Introducing new AI call paths outside IPC
- Weakening any contract clause listed in the CONTRACT MAP for any area
- Any Principle violation (system substituting for user's clarity work)

## OUTPUT FORMAT

STATUS: PASS | WARN | FAIL

SUMMARY: 2–3 sentences (overall system health)

---

CONTRACT POSTURE (across all areas):

- **State Contract:** [posture summary across clauses #1-#6]
- **Process Contract:** [posture summary across clauses #1-#5]
- **Mutation Contract:** [posture summary across clauses #1-#5]
- **Surface Contract:** [posture summary across clauses #1-#5]
- **Principle (Clarity through Constraint):** preserved | pressured | violated

---

AREA REPORTS:

### CONTEXT PIPELINE
STATUS:
CONTRACTS: <strengthens | weakens | neutral per mapped clause>
- findings...

### AI FLOW
STATUS:
CONTRACTS:
- findings...

### MEMORY SYSTEM
STATUS:
CONTRACTS:
- findings...

### DATABASE LAYER
STATUS:
CONTRACTS:
- findings...

### SCHEMA MIGRATION
STATUS:
CONTRACTS:
- findings...

### IPC BOUNDARY
STATUS:
CONTRACTS:
- findings...

### SEARCH SYSTEM
STATUS:
CONTRACTS:
- findings...

### INGESTION PIPELINE
STATUS:
CONTRACTS:
- findings...

### EXPORT / FILE I/O
STATUS:
CONTRACTS:
- findings...

### UI LAYER
STATUS:
CONTRACTS:
- findings...

---

TOP RISKS:
- highest impact issues across system, with any contract weakenings called out first

RECOMMENDED ACTIONS:
- max 5 items
- high leverage only

## HARD RULES

- Max 1000 words total
- No full-repo brute force scanning
- No embeddings or broad search
- No code rewrites
- No large refactors
- No speculation
- High-signal findings only
- Any contract weakening or Principle violation forces overall `FAIL` regardless of other findings

## TONE

Senior architect performing a monthly system review. Direct. Prioritized. No fluff.
