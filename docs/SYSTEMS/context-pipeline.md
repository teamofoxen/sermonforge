# SermonForge — Context Pipeline

> The context pipeline assembles everything the AI needs to know about the current sermon,
> series, and pastor before any AI call is made. It lives in `src/utils/contextBuilder.js`.
> See also: `docs/SYSTEMS/ai-panel.md` for how this plugs into the AI panel flow.

---

## Entry Point

`buildContext({ sermon, step, libraryChunks, theologyChunks })` is called on every AI request.
It returns a formatted string of labeled sections injected as the CONTEXT block in the user message.

---

## Pipeline Stages

### 1. normalizeSermon(sermon)
Cleans raw sermon data for pipeline consumption. Extracts:
- `topic_theme`, `audience_assumptions`, `background_noise` (Pastoral Intelligence fields)
- `series_motivation` and `redemptive_context` from `sermon.series` (series-level fields)

### 2. buildTiers(normalizedSermon, libraryChunks, theologyChunks)
Groups data into 7 priority tiers. Key tiers:

| Tier | Label | Budget | Content |
|------|-------|--------|---------|
| 1 | `[PASSAGE & MPT]` | — | passage, mpt, mps |
| 2 | `[INTERPRETATION]` | — | exegesis summary (structured or legacy) |
| 3 | `[STRUCTURE]` | — | outline, functional elements |
| 4 | `[SERIES CONTEXT]` | 1200 chars | big_idea, series_motivation, redemptive_context, section big_idea via `summarizeSeries()` |
| 5 | `[SUPPORTING MATERIAL]` | — | library chunks, theology chunks |
| 6 | `[PASTOR CONTEXT]` | — | memory/adaptive context |
| 7 | `[THIS SERMON]` | 800 chars | topic_theme, audience_assumptions, background_noise |

**Tier 4 exclusions:** `book_background`, `book_argument`, `book_structure`, `emerging_big_idea`
are deliberately excluded — they are too large for the per-sermon context budget and belong in
series planning only.

**Tier 7 (`[THIS SERMON]`) rules:**
- Always-on — never gated by step.
- Gated by content: the section is only emitted when at least one field has content
  (`text?.trim().length > 0`). Single-word entries like "Lament" are included.
- Budget: 800 chars across all three fields combined.

### 3. resolveIncludes(step)
Gates which tiers are active for the current step. Tier 7 / `pastoralContext` is always `true`
regardless of step (gated by content, not step). Other tiers are activated based on what is
relevant to the current preparation stage.

**Theology toggle override:** When `theologyChunks` are present (user explicitly enabled the
theology toggle), `buildTiers()` overrides `inc.theology = true` regardless of what
`resolveIncludes` returns. The toggle is the user's explicit intent signal and bypasses
step gating.

### 4. assembleContext(activeTiers)
Formats active tiers into labeled sections in this order:
```
[PASSAGE & MPT]
[THIS SERMON]
[INTERPRETATION]
[STRUCTURE]
[SERIES CONTEXT]
[SUPPORTING MATERIAL]
[PASTOR CONTEXT]
```
Section labels are defined as constants in `src/constants/contextSchema.js` (`CONTEXT_SECTIONS`).

### 5. dedupeText(assembled)
Removes duplicate text fragments from the assembled context string.

---

## Message Formatting

After `buildContext()` returns, the user message is formatted as:
```
CONTEXT:
{context}

USER REQUEST:
{userInput}
```

If the triggered chip has a `system` string (a priority task override), it is appended:
```
The following task takes priority over all adaptive guidance above.

TASK:
{system}
```

---

## Exegesis Context (Structured Worksheets)

`summarizeExegesis()` in `contextBuilder.js` handles the Study tab's structured JSON fields.
It detects whether a field contains structured JSON or legacy plain text:
- **Structured JSON:** calls `flattenExegesis()` from `src/utils/studyFields.js` to produce
  readable field-by-field text for the context tiers.
- **Legacy plain text:** preserved as-is under a `legacy_notes` key.

`flattenExegesis()` output is capped by `trimStr()` in `buildTiers()`.

---

## Cross-System Dependencies

**If modifying tier structure or series context (tier 4):** also check `docs/SYSTEMS/series-planner.md`
— specifically the Book Study tab table showing which fields are excluded from per-sermon context
and why. Silently adding an excluded field to tier 4 would overflow the context budget.

**If modifying the `[THIS SERMON]` tier (tier 7):** also check `docs/SYSTEMS/sermon-workspace.md`
— the Pastoral Intelligence card section describes the field semantics and the always-on / content-gated
rules that govern this tier.

---

## Adaptive Guidance

`buildAdaptiveHints(memory, step, sermonId)` in `contextBuilder.js` produces the
`ADAPTIVE GUIDANCE` section injected into the **system prompt** (not the context payload).
It reads from pastor memory in `localStorage` (`sermonforge_memory`) to surface patterns
specific to this pastor's preaching style. This is separate from the context pipeline above.

`buildMemoryContext()` provides the `[PASTOR CONTEXT]` tier (tier 6) from the same memory store.
