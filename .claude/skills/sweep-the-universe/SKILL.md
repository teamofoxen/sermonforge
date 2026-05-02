---
name: sweep-the-universe
description: Deep structured architectural audit of SermonForge, one area at a time, in a fixed sequence: Context Pipeline → AI Flow → Database Layer → IPC Boundary → Search System → Ingestion Pipeline → UI Layer. Each run audits exactly one area. Use when the user types /sweep-the-universe or asks for a deep architectural audit.
trigger: /sweep-the-universe
---

# sweep-the-universe

Deep architectural audit of SermonForge. One area per run. Fixed sequence.

## FIXED AUDIT SEQUENCE

Always follow this order. Never skip, never combine:

1. CONTEXT PIPELINE
2. AI FLOW
3. DATABASE LAYER
4. IPC BOUNDARY
5. SEARCH SYSTEM
6. INGESTION PIPELINE
7. UI LAYER

At the start of each run, ask the user which area to audit — or default to the next one in sequence if they don't specify.

## AREA DEFINITIONS AND FILES TO INSPECT

| Area | Files / Scope |
|------|--------------|
| CONTEXT PIPELINE | `src/utils/contextBuilder.js`, tier system (1–7), `flattenExegesis()` |
| AI FLOW | `src/utils/ai.js` (`sendAIMessage`), IPC `"ai-message"`, `electron/ai.js` |
| DATABASE LAYER | `electron/main.js` (DB handlers), `sermonforge.db` (sql.js), `theology.db` (better-sqlite3 + sqlite-vec) |
| IPC BOUNDARY | `electron/preload.js`, `window.electronAPI`, named IPC channels |
| SEARCH SYSTEM | `library_fts` (FTS4), `theology_fts`, `theology_vec` (vector search) |
| INGESTION PIPELINE | Ingestion scripts, chunking (~600 words), embedding generation |
| UI LAYER | `src/components/AIPanel.jsx`, `src/components/SermonWorkspace.jsx`, React components only |

## INSTRUCTIONS

1. Identify the area to audit this run.
2. Read only the files listed for that area. Do not open anything else.
3. Apply the audit rules below for that area.
4. Report findings. State the next area in sequence.

## CONTRACT MAP (`docs/CORE.md` → "The Framework")

Each area must satisfy specific contract clauses. Test the area against these clauses every run; weakening any listed clause is a HIGH-severity finding and a `FAIL`.

| Area | Contract clauses to enforce |
|------|------------------------------|
| CONTEXT PIPELINE | State #2 (canonical position drives tier mapping); Process #5 (AI augments, never substitutes — context tiers feed AI but don't bypass evidence) |
| AI FLOW | Mutation #1 (user typing wins), #2 (AI proposals separate slot), #5 (errors one voice); Process #5 |
| DATABASE LAYER | State #1 (sermon as atom), #3 (no anonymous atoms), #5 (one name per concept); Mutation #3 (saves are events) |
| IPC BOUNDARY | Mutation #1, #2, #3 (writes go through guarded boundaries); State #3 enforced at IPC layer |
| SEARCH SYSTEM | Process #5 (search results augment, never substitute) |
| INGESTION PIPELINE | Process #5 |
| UI LAYER | All Surface clauses (#1 vocabulary, #2 CTA, #3 empty/loading, #4 you-are-here, #5 re-entry); Mutation #5 (errors one voice) |

## AUDIT RULES BY AREA

### CONTEXT PIPELINE
- Tier ordering must remain 1–7
- Tier 5 must remain bounded (library + theology chunks only)
- No duplication across tiers
- `flattenExegesis()` must handle both structured JSON and legacy plain text
- **Contract check:** State #2, Process #5

### AI FLOW
- All AI calls must follow: renderer → `sendAIMessage()` → IPC `"ai-message"` → `electron/ai.js`
- No direct Anthropic SDK usage outside the main process
- **Contract check:** Mutation #1, #2, #5; Process #5

### DATABASE LAYER
- No raw SQL in renderer
- All writes go through main process handlers
- `saveDb()` 500ms debounce must not be reduced or bypassed
- Schema changes must be reflected in `SERMON_COLUMNS` allowlist
- **Contract check:** State #1, #3, #5; Mutation #3

### IPC BOUNDARY
- All cross-boundary calls use named IPC channels only
- No renderer access to `ANTHROPIC_API_KEY`
- No preload bypass patterns
- **Contract check:** Mutation #1, #2, #3; State #3 enforced at IPC layer

### SEARCH SYSTEM
- FTS and vector logic must remain separate
- No repeated embedding model reloads
- No unbounded chunk injection into tier 5
- **Contract check:** Process #5

### INGESTION PIPELINE
- Chunking must remain ~600 words
- No uncontrolled ingestion loops
- **Contract check:** Process #5

### UI LAYER
- Components must not contain business logic
- Components must not access DB or AI directly
- **Contract check:** all Surface clauses; Mutation #5

## RED FLAGS (HIGH SEVERITY)

- Modifying `contextBuilder.js` tier logic without safeguards
- Touching `saveDb()` or debounce timing
- Adding sermon fields without updating `SERMON_COLUMNS`
- Breaking `createOutlinePoint()` as the sole outline point constructor
- Introducing any AI call path that bypasses IPC
- Weakening any contract clause listed for the audited area

## OUTPUT FORMAT

AREA: <area name>

STATUS: PASS | WARN | FAIL

SUMMARY: 1–2 sentences

CONTRACTS:
- <clause> — <strengthens | weakens | neutral> — <one-line why>
(list every clause from the area's CONTRACT MAP row; mark "neutral" when not affected)

FINDINGS:
- [Severity: LOW | MEDIUM | HIGH] issue — file — why it matters — fix (short, no rewrites)

NEXT: <next area in sequence>

## HARD RULES

- Max 400 words
- One area per run — stop after reporting
- Do NOT scan the full repo
- Do NOT rewrite code
- Do NOT speculate beyond what the files show
- Senior architect tone: precise, minimal
- Any contract weakening forces `FAIL` regardless of other findings
