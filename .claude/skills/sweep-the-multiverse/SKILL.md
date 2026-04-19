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

## PROJECT-SPECIFIC AUDIT RULES

### CONTEXT PIPELINE (CRITICAL)
- Tier ordering must remain 1–7
- Tier 5 must remain bounded (library + theology chunks)
- No duplication across tiers
- `flattenExegesis()` must support structured + legacy formats

### AI FLOW
- ALL AI calls: renderer → `sendAIMessage` → IPC `"ai-message"` → `electron/ai.js`
- No direct SDK usage outside main process

### MEMORY SYSTEM
- `phrasePatterns` and `aiPhrasePatterns` must remain separate
- Runtime assertion must not be removed
- No uncontrolled growth in localStorage
- Memory only for adaptive hints, not core logic

### DATABASE SAFETY
- NO raw SQL in renderer
- ALL writes through main process
- `saveDb()` 500ms debounce must not be reduced or bypassed
- Schema changes must align with `SERMON_COLUMNS`

### SCHEMA MIGRATION
- All schema changes go through `runMigrations()`
- Schema version must increment correctly
- No direct `CREATE TABLE` edits outside migration system

### IPC INTEGRITY
- All cross-boundary calls via named IPC channels
- No renderer access to `ANTHROPIC_API_KEY`
- No preload bypass hacks

### PERFORMANCE
- No synchronous writes in main process
- No repeated DB reads in loops
- No uncontrolled context growth (especially tier 5)

### SEARCH SYSTEM
- FTS and vector logic must remain distinct
- No repeated embedding model reloads
- No unbounded chunk injection

### INGESTION
- Chunking must remain ~600 words
- No uncontrolled ingestion loops

### EXPORT / FILE I/O
- All paths use `path.join()`
- No hardcoded separators
- Safe file writes (no UI blocking)
- Windows + OneDrive compatibility

### UI LAYER
- Must not contain business logic
- Must not access DB or AI directly

## RED FLAGS (HIGH SEVERITY)

- Modifying `contextBuilder.js` without safeguards
- Touching `saveDb()` or debounce timing
- Adding sermon fields without updating allowlist
- Breaking outline point construction rules
- Introducing new AI call paths outside IPC

## OUTPUT FORMAT

STATUS: PASS | WARN | FAIL

SUMMARY: 2–3 sentences (overall system health)

---

AREA REPORTS:

### CONTEXT PIPELINE
STATUS:
- findings...

### AI FLOW
STATUS:
- findings...

### MEMORY SYSTEM
STATUS:
- findings...

### DATABASE LAYER
STATUS:
- findings...

### SCHEMA MIGRATION
STATUS:
- findings...

### IPC BOUNDARY
STATUS:
- findings...

### SEARCH SYSTEM
STATUS:
- findings...

### INGESTION PIPELINE
STATUS:
- findings...

### EXPORT / FILE I/O
STATUS:
- findings...

### UI LAYER
STATUS:
- findings...

---

TOP RISKS:
- highest impact issues across system

RECOMMENDED ACTIONS:
- max 5 items
- high leverage only

## HARD RULES

- Max 800 words total
- No full-repo brute force scanning
- No embeddings or broad search
- No code rewrites
- No large refactors
- No speculation
- High-signal findings only

## TONE

Senior architect performing a monthly system review. Direct. Prioritized. No fluff.
