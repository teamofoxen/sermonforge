# SermonForge — AI Panel

> The AI panel is the pastor's thinking partner at every step of sermon preparation.
> It is reactive, not proactive — the pastor initiates. It is calibrated to the method,
> not a replacement for it.
> See also: `docs/SYSTEMS/context-pipeline.md` for how the context payload is assembled.

---

## Behavior Model

- **Reactive by default** — user asks or clicks a chip; AI answers.
- **Context-aware** — knows the current step, passage, MPT, MPS, and current field content.
- **Step-specific system prompts** — the AI's role, tone, and depth shift per preparation step.
- **All API calls** go through IPC `"ai-message"` channel via `sendAIMessage()`.

---

## Flow: User Sends a Message

### Step 1 — Input
Pastor types a message or clicks an action chip in `AIPanel.jsx`.
`handleSendInput()` or chip `onClick` fires.

### Step 2 — System Prompt Assembly
`buildSystemPrompt(step, sermonId)` assembles the system prompt from four parts (in order):
1. **Base role + behavioral instructions** — static
2. **TOOL CONTEXT** — static, always present
3. **MESSAGE CONTEXT RULES** — static, always present
4. **`stepDesc`** — dynamic, keyed to the active step/tab; defines the AI's task and posture
   for this specific preparation stage
5. **ADAPTIVE GUIDANCE** — dynamic, from `buildAdaptiveHints(memory, step, sermonId)`;
   surfaces pastor-specific rhetorical patterns from `localStorage` memory

### Step 3 — Context Assembly
`buildContext({ sermon, step, libraryChunks, theologyChunks })` assembles the context payload.
See `docs/SYSTEMS/context-pipeline.md` for the full pipeline.

### Step 4 — Message Formatting
User message formatted as:
```
CONTEXT:
{context}

USER REQUEST:
{userInput}
```
If the chip has a `system` string, appended as:
```
The following task takes priority over all adaptive guidance above.

TASK:
{system}
```

### Step 5 — Dispatch
`sendAIMessage(messages, systemPrompt)` in `src/utils/ai.js` forwards via IPC `"ai-message"`.
`electron/ai.js` receives the call, sends to Anthropic SDK, returns response string.
Response is added to message history in AIPanel state.

### Step 6 — Pattern Capture
`captureResponsePatterns(response, step)` extracts patterns from the AI response.
These are written to `aiPhrasePatterns` **only** — never to `phrasePatterns`.
This is enforced by a runtime assertion in `updateMemory()`. See `docs/CORE.md`.

---

## Step-Specific AI Posture

| Step | Posture |
|------|---------|
| Step 1 Exegesis (all phases) | Collaborative analyst; evaluates observations and interpretation |
| Step 2 MPT→MPS Forge | **Challenger, not encourager** — pushes back on MPT accuracy; checks whether MPS grows from MPT |
| Step 3 Outline | Structural reviewer |
| Step 4 Functional Elements | Evaluates E/A/I balance per point |
| Tune-Up Engine (Manuscript) | Auditor — structured 3-phase review |

---

## Action Chips

Each preparation step has chips that trigger structured AI evaluations:

| Step | Chip | Behaviour |
|------|------|-----------|
| Observe | "Review" | Assembles all filled fields for AI evaluation |
| Interpret | "Review" | Assembles all filled fields for AI evaluation |
| Redemptive Thread | "Synthesize →" | AI compiles 7 answers into a cohesive redemptive summary |
| Redemptive Thread | "Review" | Sends all fields + summary for evaluation |
| Implications | "Compile →" | AI consolidates all answers into a master list |
| Implications | "Review" | Sends all fields + compiled list for evaluation |
| MPT→MPS | "Challenge My MPT" | AI challenges MPT accuracy |
| MPT→MPS | "Check MPT→MPS Chain" | AI evaluates whether MPS grows from MPT |
| Outline | "Review Outline" | Sends outline to AI |
| Functional Elements | "Review E/A/I Balance" | Evaluates balance per outline point |

---

## Tune-Up Engine

Lives on the **Manuscript tab**. Sends manuscript + MPT + MPS + outline to Claude with a
structured 3-phase audit:
1. **Snapshot** — high-level assessment
2. **Alignment Map** — how well the manuscript serves the MPT/MPS
3. **Patch Plan** — specific, actionable improvements

Constraints baked into the system prompt:
- Preserve the pastor's voice
- Minimal edits only
- ±10% length tolerance
- No new theology unless gospel repair is required
- No new illustrations unless explicitly requested

---

## Theology Research Mode

Activated when the pastor checks "Search Theology Library" and theology embeddings are available. When a message is sent in this mode:

1. `searchTheologyLibrary(text, 8)` runs a hybrid search (semantic + FTS) against the local theology corpus.
2. If hits are found, the **full sermon workflow system prompt is bypassed** — it is replaced by `THEOLOGY_RESEARCH_PROMPT`, a stripped-down research prompt. The normal step-specific MESSAGE CONTEXT RULES actively conflict with free-form research (they cause refusals when MPT/MPS are absent), so they are dropped entirely.
3. The user message is built as `SOURCES: … PASSAGE: … PASTORAL CONTEXT: … QUESTION: …`. Tier 7 (Pastoral Context) is preserved even in research mode — The Cultural Moment / The Room / The Sermon's Work shape how sources are read.
4. If no hits are found, the call falls back to the standard context-based path with the normal system prompt.
5. Source attribution is deduplicated by author + work via `dedupSources()` and displayed under the response.

The toggle label surfaces degradation: "Search Theology Library (keyword only)" when the embedder has not loaded or `theology_vec` is empty.

---

## Incorporate Flow

The "Incorporate →" button appears under any assistant message that carries a `reviewStep` tag (set by Review chips). Clicking it triggers `handleIncorporate(reviewContent, reviewStep)`:

1. `getStepFieldConfig(reviewStep)` returns the field schema for the step (column name, field definitions, type).
2. `buildIncorporatePrompt(config, current, reviewContent)` constructs a prompt that asks the AI to produce a revised version of the current field values incorporating the review feedback.
3. The call uses `INCORPORATE_REVISION_PROMPT` as the system prompt and expects a structured JSON response.
4. `parseAIJson` + `validateIncorporateMptMps` / `validateIncorporateStructuredField` validate the shape.
5. `setDiffData({ config, current, proposed })` surfaces a diff view. The pastor accepts or discards — no field is written until explicit accept (`handleAcceptDiff`).

This flow is subject to Mutation Contract #2: AI output always goes through the proposal slot before any write.

---

## externalMessage / persistColumn Pattern

`AIPanel` accepts an `externalMessage` prop from `SermonWorkspace`. This is the programmatic-send path used by Synthesize, Compile, Populate Scripture, and similar chips that originate outside the panel's own input.

The prop shape: `{ prompt, systemPrompt, step, persistColumn? }`.

- When `persistColumn` is absent: the response is added to the conversation history only. No write occurs.
- When `persistColumn` is present: after a successful response, the last assistant message is tagged with `persistColumn`. A "Save →" button appears under that message. Clicking it calls `onUpdate({ [persistColumn]: JSON.stringify({ content, ts }) })` — this is the **persistColumn-confirm variant** of Mutation Contract #2.
- Silent failures and aborts (`result.kind === "aborted"`) deliberately omit the `persistColumn` tag — a phantom save button cannot appear on a placeholder or error message.

The flash banner ("Saved to [field]") fires on confirm and auto-clears after 4 seconds.

---

## Prompt-Caching Contract

`buildSystemPrompt()` in `src/prompts/sermon.js` returns a two-block array:

| Block | Content | Cache behaviour |
|---|---|---|
| Static | Role instructions + TOOL CONTEXT + MESSAGE CONTEXT RULES | `cache_control: { type: "ephemeral" }` — cached by Anthropic for up to 5 min |
| Dynamic | Step description + adaptive hints | No cache control — varies per call |

The static block is identical across every turn in a session. The `cache_control` marker tells Anthropic to process it once and reuse the KV cache for subsequent calls within the 5-minute window, reducing input-token cost and latency on follow-up turns. The dynamic block follows the static block and is never marked for caching.

Chip and review calls that use their own `system` string (passed via `externalMessage.systemPrompt`) receive a freshly-built `buildSystemPrompt` call so the cache-eligible static block is still present.

---

## Audit Log

Every AI call writes a line to `ai-log.jsonl` in the app's user-data folder:

- **Windows:** `%APPDATA%\SermonForge\ai-log.jsonl`
- **macOS:** `~/Library/Application Support/SermonForge/ai-log.jsonl`

Each entry is a JSON object with:

| Field | Present on | Value |
|---|---|---|
| `ts` | all | ISO timestamp |
| `callIndex` | all | monotonic call counter for this process session |
| `step` | all | active step/tab at call time |
| `sermonId` | all | sermon ID or null |
| `system` | all | system prompt sent |
| `messages` | all | conversation history sent |
| `latency` | all | ms from handler entry to response |
| `response` | success | AI response text |
| `model` | success | model ID |
| `usage` | success | `{ input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }` |
| `error` | failure | `{ kind, message }` |

**Retention:** last 500 entries or 5 MB, whichever is reached first. Rotation is triggered when the file exceeds 5 MB; the file is rewritten to the most recent 500 entries.

**Privacy:** the log never leaves the machine. It is used only for local debugging. Pastors are informed of its existence on the Setup screen.

---

## Memory Interaction

The AI panel reads from pastor memory (`localStorage` `sermonforge_memory`) to build
adaptive guidance. It writes only to `aiPhrasePatterns` (never `phrasePatterns`).

- `phrasePatterns` — pastor's own rhetorical patterns; used to generate hints
- `aiPhrasePatterns` — AI response patterns; analysis only

See `docs/CORE.md` for the invariant. See `src/utils/memory.js` for the implementation.
