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

## Memory Interaction

The AI panel reads from pastor memory (`localStorage` `sermonforge_memory`) to build
adaptive guidance. It writes only to `aiPhrasePatterns` (never `phrasePatterns`).

- `phrasePatterns` — pastor's own rhetorical patterns; used to generate hints
- `aiPhrasePatterns` — AI response patterns; analysis only

See `docs/CORE.md` for the invariant. See `src/utils/memory.js` for the implementation.
